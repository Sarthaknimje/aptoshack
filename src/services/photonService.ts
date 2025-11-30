/**
 * Photon SDK Service
 * Unified identity, embedded wallet, engagement, and rewards layer on Aptos
 * https://stage-api.getstan.app/identity-service/api/v1
 */

const PHOTON_API_BASE = 'https://stage-api.getstan.app/identity-service/api/v1'
const PHOTON_API_KEY = process.env.REACT_APP_PHOTON_API_KEY || '' // Set in .env

export interface PhotonUser {
  id: string
  name: string
  avatar: string
}

export interface PhotonWallet {
  photonUserId: string
  walletAddress: string
}

export interface PhotonTokens {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
  scope: string
}

export interface PhotonRegisterResponse {
  success: boolean
  data: {
    user: {
      user: PhotonUser
      user_identities: Array<{
        id: string
        user_id: string
        provider: string
        provider_id: string
      }>
    }
    tokens: PhotonTokens
    wallet: PhotonWallet
  }
}

export interface CampaignEventRequest {
  event_id: string
  event_type: string
  client_user_id: string
  campaign_id: string
  metadata?: Record<string, any>
  timestamp?: string
}

export interface CampaignEventResponse {
  success: boolean
  data: {
    success: boolean
    event_id: string
    token_amount: number
    token_symbol: string
    campaign_id: string
  }
}

/**
 * Register a user with Photon using Custom JWT
 * Creates embedded wallet and Photon profile
 */
export async function registerPhotonUser(
  jwtToken: string,
  clientUserId: string
): Promise<PhotonRegisterResponse> {
  try {
    const response = await fetch(`${PHOTON_API_BASE}/identity/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': PHOTON_API_KEY
      },
      body: JSON.stringify({
        provider: 'jwt',
        data: {
          token: jwtToken,
          client_user_id: clientUserId
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Photon registration failed: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    console.log('✅ Photon user registered:', data)
    return data
  } catch (error) {
    console.error('❌ Error registering Photon user:', error)
    throw error
  }
}

/**
 * Trigger a rewarded campaign event
 * Photon will mint and deposit PAT tokens to user's wallet
 */
export async function triggerRewardedEvent(
  eventId: string,
  eventType: string,
  clientUserId: string,
  campaignId: string,
  metadata?: Record<string, any>
): Promise<CampaignEventResponse> {
  try {
    const response = await fetch(`${PHOTON_API_BASE}/attribution/events/campaign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': PHOTON_API_KEY
      },
      body: JSON.stringify({
        event_id: eventId,
        event_type: eventType,
        client_user_id: clientUserId,
        campaign_id: campaignId,
        metadata: metadata || {},
        timestamp: new Date().toISOString()
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Rewarded event failed: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    console.log(`✅ Rewarded event triggered: ${eventType} - ${data.data.token_amount} PAT tokens`)
    return data
  } catch (error) {
    console.error('❌ Error triggering rewarded event:', error)
    throw error
  }
}

/**
 * Trigger an unrewarded campaign event
 * Updates user profile but issues 0 PAT tokens
 */
export async function triggerUnrewardedEvent(
  eventId: string,
  eventType: string,
  clientUserId: string,
  campaignId: string,
  metadata?: Record<string, any>
): Promise<CampaignEventResponse> {
  try {
    const response = await fetch(`${PHOTON_API_BASE}/attribution/events/campaign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': PHOTON_API_KEY
      },
      body: JSON.stringify({
        event_id: eventId,
        event_type: eventType,
        client_user_id: clientUserId,
        campaign_id: campaignId,
        metadata: metadata || {},
        timestamp: new Date().toISOString()
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Unrewarded event failed: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    console.log(`✅ Unrewarded event tracked: ${eventType}`)
    return data
  } catch (error) {
    console.error('❌ Error triggering unrewarded event:', error)
    throw error
  }
}

/**
 * Generate a JWT token for Photon registration
 * For production, this should be done on your backend
 * For testing, you can use jwtbuilder.jamiekurtz.com
 * 
 * This function calls the backend to generate a proper JWT
 */
export async function generatePhotonJWT(
  userId: string,
  email: string,
  name: string
): Promise<string> {
  try {
    // Call backend to generate JWT (secure, server-side)
    const response = await fetch('http://localhost:5001/api/photon/generate-jwt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        email: email,
        name: name
      })
    })

    if (response.ok) {
      const data = await response.json()
      return data.jwt_token
    } else {
      throw new Error('Failed to generate JWT from backend')
    }
  } catch (error) {
    console.warn('⚠️ Backend JWT generation failed, using fallback:', error)
    // Fallback: Generate a simple token for testing
    // In production, this should always use the backend
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    }

    const payload = {
      user_id: userId,
      email: email,
      name: name,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour
    }

    // Base64 encode (simplified - use proper JWT library in production)
    const encodedHeader = btoa(JSON.stringify(header))
    const encodedPayload = btoa(JSON.stringify(payload))
    
    // In production, properly sign with HMAC SHA256
    // For demo, we'll return a simple token
    return `${encodedHeader}.${encodedPayload}.signature`
  }
}

/**
 * Campaign IDs for Creator Coin platform
 */
export const PHOTON_CAMPAIGNS = {
  // Rewarded events
  TOKEN_PURCHASE: 'token_purchase_campaign', // Reward for buying creator tokens
  TOKEN_SELL: 'token_sell_campaign', // Reward for selling tokens
  FIRST_TRADE: 'first_trade_campaign', // Reward for first trade
  DAILY_TRADE: 'daily_trade_campaign', // Reward for daily trading
  REFERRAL: 'referral_campaign', // Reward for referrals
  
  // Unrewarded events
  LOGIN: 'login_campaign', // Track login
  VIEW_CONTENT: 'view_content_campaign', // Track content views
  SHARE_TOKEN: 'share_token_campaign', // Track token sharing
  CREATE_TOKEN: 'create_token_campaign', // Track token creation
} as const

/**
 * Event types for tracking
 */
export const PHOTON_EVENT_TYPES = {
  // Rewarded
  TOKEN_PURCHASE: 'token_purchase',
  TOKEN_SELL: 'token_sell',
  FIRST_TRADE: 'first_trade',
  DAILY_TRADE: 'daily_trade',
  REFERRAL: 'referral',
  
  // Unrewarded
  LOGIN: 'login',
  VIEW_CONTENT: 'view_content',
  SHARE_TOKEN: 'share_token',
  CREATE_TOKEN: 'create_token',
} as const

