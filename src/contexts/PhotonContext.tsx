/**
 * Photon Context
 * Manages Photon user identity, embedded wallet, and rewards
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { 
  registerPhotonUser, 
  triggerRewardedEvent, 
  triggerUnrewardedEvent,
  generatePhotonJWT,
  PHOTON_CAMPAIGNS,
  PHOTON_EVENT_TYPES,
  PhotonUser,
  PhotonWallet,
  PhotonTokens
} from '../services/photonService'
import { useWallet } from './WalletContext'

interface PhotonContextType {
  photonUser: PhotonUser | null
  photonWallet: PhotonWallet | null
  photonTokens: PhotonTokens | null
  isPhotonRegistered: boolean
  isLoading: boolean
  registerWithPhoton: (email: string, name: string) => Promise<void>
  trackRewardedEvent: (eventType: string, campaignId: string, metadata?: Record<string, any>) => Promise<void>
  trackUnrewardedEvent: (eventType: string, campaignId: string, metadata?: Record<string, any>) => Promise<void>
  // Helper methods for common events
  rewardTokenPurchase: (tokenSymbol: string, amount: number, price: number) => Promise<void>
  rewardTokenSell: (tokenSymbol: string, amount: number, price: number) => Promise<void>
  trackLogin: () => Promise<void>
  trackContentView: (contentId: string) => Promise<void>
  trackTokenShare: (tokenSymbol: string) => Promise<void>
  trackTokenCreation: (tokenSymbol: string) => Promise<void>
}

const PhotonContext = createContext<PhotonContextType>({
  photonUser: null,
  photonWallet: null,
  photonTokens: null,
  isPhotonRegistered: false,
  isLoading: false,
  registerWithPhoton: async () => {},
  trackRewardedEvent: async () => {},
  trackUnrewardedEvent: async () => {},
  rewardTokenPurchase: async () => {},
  rewardTokenSell: async () => {},
  trackLogin: async () => {},
  trackContentView: async () => {},
  trackTokenShare: async () => {},
  trackTokenCreation: async () => {}
})

export const usePhoton = () => useContext(PhotonContext)

interface PhotonProviderProps {
  children: ReactNode
}

export const PhotonProvider: React.FC<PhotonProviderProps> = ({ children }) => {
  const { address, isConnected } = useWallet()
  const [photonUser, setPhotonUser] = useState<PhotonUser | null>(null)
  const [photonWallet, setPhotonWallet] = useState<PhotonWallet | null>(null)
  const [photonTokens, setPhotonTokens] = useState<PhotonTokens | null>(null)
  const [isPhotonRegistered, setIsPhotonRegistered] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Get or generate client user ID
  const getClientUserId = (): string => {
    if (address) {
      return address
    }
    // Generate a temporary ID if no wallet connected
    let userId = localStorage.getItem('photon_client_user_id')
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('photon_client_user_id', userId)
    }
    return userId
  }

  // Register user with Photon
  const registerWithPhoton = async (email: string, name: string) => {
    if (isPhotonRegistered) {
      console.log('✅ User already registered with Photon')
      return
    }

    setIsLoading(true)
    try {
      const clientUserId = getClientUserId()
      
      console.log('🔄 Starting Photon registration...', { clientUserId, email, name })
      
      // Generate JWT token (calls backend for secure generation)
      let jwtToken: string
      try {
        jwtToken = await generatePhotonJWT(clientUserId, email, name)
        console.log('✅ JWT token generated:', jwtToken.substring(0, 50) + '...')
      } catch (jwtError) {
        console.error('❌ Failed to generate JWT:', jwtError)
        throw new Error(`JWT generation failed: ${jwtError}`)
      }
      
      // Register with Photon
      console.log('🔄 Registering with Photon API...')
      const response = await registerPhotonUser(jwtToken)
      
      if (response.success && response.data) {
        setPhotonUser(response.data.user.user)
        // Map wallet response to our interface
        setPhotonWallet({
          photonUserId: response.data.user.user.id,
          walletAddress: response.data.wallet.walletAddress
        })
        setPhotonTokens(response.data.tokens)
        setIsPhotonRegistered(true)
        
        // Store in localStorage
        localStorage.setItem('photon_user', JSON.stringify(response.data.user.user))
        localStorage.setItem('photon_wallet', JSON.stringify({
          photonUserId: response.data.user.user.id,
          walletAddress: response.data.wallet.walletAddress
        }))
        localStorage.setItem('photon_tokens', JSON.stringify(response.data.tokens))
        
        console.log('✅ Photon registration successful:', response.data)
        console.log('✅ Photon User ID:', response.data.user.user.id)
        console.log('✅ Photon Wallet:', response.data.wallet.walletAddress)
        console.log('✅ Access Token:', response.data.tokens.access_token.substring(0, 20) + '...')
      } else {
        throw new Error('Registration response was not successful')
      }
    } catch (error: any) {
      console.error('❌ Error registering with Photon:', error)
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack
      })
      // Don't throw - allow app to continue without Photon
      // But log the error for debugging
    } finally {
      setIsLoading(false)
    }
  }

  // Track rewarded event
  const trackRewardedEvent = async (
    eventType: string,
    campaignId: string,
    metadata?: Record<string, any>
  ) => {
    // Check both state and localStorage (for immediate availability after registration)
    const storedUser = localStorage.getItem('photon_user')
    const storedTokens = localStorage.getItem('photon_tokens')
    
    const hasPhotonData = (isPhotonRegistered && photonUser && photonTokens) || 
                         (storedUser && storedTokens)
    
    if (!hasPhotonData) {
      console.warn('⚠️ Photon not registered or missing tokens, skipping rewarded event')
      return
    }

    try {
      // Use state if available, otherwise parse from localStorage
      let userId: string
      let accessToken: string
      
      if (photonUser && photonTokens) {
        userId = photonUser.id
        accessToken = photonTokens.access_token
      } else if (storedUser && storedTokens) {
        const user = JSON.parse(storedUser)
        const tokens = JSON.parse(storedTokens)
        userId = user.id
        accessToken = tokens.access_token
      } else {
        console.warn('⚠️ Could not get Photon user/token data')
        return
      }
      
      const eventId = `${eventType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Use Photon user_id and access_token from registration
      await triggerRewardedEvent(
        eventId, 
        eventType, 
        userId, // Photon user_id (not client_user_id)
        campaignId,
        accessToken, // Access token from registration
        metadata
      )
    } catch (error) {
      console.error('❌ Error tracking rewarded event:', error)
    }
  }

  // Track unrewarded event
  const trackUnrewardedEvent = async (
    eventType: string,
    campaignId: string,
    metadata?: Record<string, any>
  ) => {
    // Check both state and localStorage (for immediate availability after registration)
    const storedUser = localStorage.getItem('photon_user')
    const storedTokens = localStorage.getItem('photon_tokens')
    
    const hasPhotonData = (isPhotonRegistered && photonUser && photonTokens) || 
                         (storedUser && storedTokens)
    
    if (!hasPhotonData) {
      console.warn('⚠️ Photon not registered or missing tokens, skipping unrewarded event')
      return
    }

    try {
      // Use state if available, otherwise parse from localStorage
      let userId: string
      let accessToken: string
      
      if (photonUser && photonTokens) {
        userId = photonUser.id
        accessToken = photonTokens.access_token
      } else if (storedUser && storedTokens) {
        const user = JSON.parse(storedUser)
        const tokens = JSON.parse(storedTokens)
        userId = user.id
        accessToken = tokens.access_token
      } else {
        console.warn('⚠️ Could not get Photon user/token data')
        return
      }
      
      const eventId = `${eventType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Use Photon user_id and access_token from registration
      await triggerUnrewardedEvent(
        eventId, 
        eventType, 
        userId, // Photon user_id (not client_user_id)
        campaignId,
        accessToken, // Access token from registration
        metadata
      )
    } catch (error: any) {
      // Don't log rate limit errors (429) - they're handled gracefully
      if (!error?.message?.includes('429')) {
        console.error('❌ Error tracking unrewarded event:', error)
      }
    }
  }

  // Helper: Reward token purchase
  const rewardTokenPurchase = async (tokenSymbol: string, amount: number, price: number) => {
    await trackRewardedEvent(
      PHOTON_EVENT_TYPES.TOKEN_PURCHASE,
      PHOTON_CAMPAIGNS.TOKEN_PURCHASE,
      {
        token_symbol: tokenSymbol,
        amount: amount,
        price: price,
        total_value: amount * price
      }
    )
  }

  // Helper: Reward token sell
  const rewardTokenSell = async (tokenSymbol: string, amount: number, price: number) => {
    await trackRewardedEvent(
      PHOTON_EVENT_TYPES.TOKEN_SELL,
      PHOTON_CAMPAIGNS.TOKEN_SELL,
      {
        token_symbol: tokenSymbol,
        amount: amount,
        price: price,
        total_value: amount * price
      }
    )
  }

  // Helper: Track login
  const trackLogin = async () => {
    await trackUnrewardedEvent(
      PHOTON_EVENT_TYPES.LOGIN,
      PHOTON_CAMPAIGNS.LOGIN
    )
  }

  // Helper: Track content view
  const trackContentView = async (contentId: string) => {
    await trackUnrewardedEvent(
      PHOTON_EVENT_TYPES.VIEW_CONTENT,
      PHOTON_CAMPAIGNS.VIEW_CONTENT,
      { content_id: contentId }
    )
  }

  // Helper: Track token share
  const trackTokenShare = async (tokenSymbol: string) => {
    await trackUnrewardedEvent(
      PHOTON_EVENT_TYPES.SHARE_TOKEN,
      PHOTON_CAMPAIGNS.SHARE_TOKEN,
      { token_symbol: tokenSymbol }
    )
  }

  // Helper: Track token creation
  const trackTokenCreation = async (tokenSymbol: string) => {
    await trackUnrewardedEvent(
      PHOTON_EVENT_TYPES.CREATE_TOKEN,
      PHOTON_CAMPAIGNS.CREATE_TOKEN,
      { token_symbol: tokenSymbol }
    )
  }

  // Load Photon data from localStorage on mount
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('photon_user')
      const storedWallet = localStorage.getItem('photon_wallet')
      const storedTokens = localStorage.getItem('photon_tokens')
      
      if (storedUser && storedWallet && storedTokens) {
        setPhotonUser(JSON.parse(storedUser))
        setPhotonWallet(JSON.parse(storedWallet))
        setPhotonTokens(JSON.parse(storedTokens))
        setIsPhotonRegistered(true)
        console.log('✅ Loaded Photon data from localStorage')
      }
    } catch (error) {
      console.error('❌ Error loading Photon data:', error)
    }
  }, [])

  // Auto-register with Photon when wallet connects (if not already registered)
  useEffect(() => {
    if (isConnected && address && !isPhotonRegistered && !isLoading) {
      // Auto-register with wallet address as email
      const email = `${address.slice(0, 8)}@photon.creatorcoin.app`
      const name = `User ${address.slice(0, 8)}`
      
      registerWithPhoton(email, name).catch(err => {
        console.warn('⚠️ Auto-registration failed (non-critical):', err)
      })
    }
  }, [isConnected, address, isPhotonRegistered, isLoading])

  return (
    <PhotonContext.Provider
      value={{
        photonUser,
        photonWallet,
        photonTokens,
        isPhotonRegistered,
        isLoading,
        registerWithPhoton,
        trackRewardedEvent,
        trackUnrewardedEvent,
        rewardTokenPurchase,
        rewardTokenSell,
        trackLogin,
        trackContentView,
        trackTokenShare,
        trackTokenCreation
      }}
    >
      {children}
    </PhotonContext.Provider>
  )
}

