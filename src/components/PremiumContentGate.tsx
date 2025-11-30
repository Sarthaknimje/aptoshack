/**
 * Premium Content Gate Component
 * Shows premium content only to token holders
 * Automatically checks token balance and shows/hides content accordingly
 */

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Unlock, Coins, AlertCircle, Loader, Play, Image as ImageIcon, FileText, Video, Eye } from 'lucide-react'
import { useWallet } from '../contexts/WalletContext'
import { usePhoton } from '../contexts/PhotonContext'
import { checkPremiumAccess, downloadPremiumContent, getPremiumContentUrl, getPremiumAccessToken } from '../services/shelbyService'
import { useNavigate } from 'react-router-dom'
import ShelbyStorageInfo from './ShelbyStorageInfo'

interface PremiumContentGateProps {
  tokenData: {
    creator: string
    token_id?: string
    content_id?: string
    token_symbol?: string
    token_name?: string
  }
  premiumContentUrl?: string
  premiumContentType?: 'video' | 'image' | 'document' | 'audio'
  minimumBalance?: number
  children?: React.ReactNode
  className?: string
}

const PremiumContentGate: React.FC<PremiumContentGateProps> = ({
  tokenData,
  premiumContentUrl,
  premiumContentType = 'video',
  minimumBalance = 1,
  children,
  className = ''
}) => {
  const { isConnected, address } = useWallet()
  const { trackContentView } = usePhoton()
  const navigate = useNavigate()
  const [hasAccess, setHasAccess] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [lastContentViewTime, setLastContentViewTime] = useState<number>(0)
  const [contentBlob, setContentBlob] = useState<Blob | null>(null)
  const [contentUrl, setContentUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [tokenExpiresAt, setTokenExpiresAt] = useState<Date | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<{ balance?: number; tokenId?: string; status?: string } | null>(null)

  useEffect(() => {
    // Set preview URL for blurred preview (direct Shelby URL)
    if (premiumContentUrl) {
      setPreviewUrl(getPremiumContentUrl(premiumContentUrl))
    }
    
    checkAccess()
    
    // Set up interval to check access periodically (in case user buys/sells tokens)
    const interval = setInterval(() => {
      // Check if token is expired or about to expire (within 1 minute)
      if (tokenExpiresAt && new Date() > new Date(tokenExpiresAt.getTime() - 60000)) {
        console.log('🔄 Access token expired or expiring soon, refreshing...')
        checkAccess()
      } else {
        // Still check access periodically in case balance changes
        checkAccess()
      }
    }, 10000) // Check every 10 seconds
    
    // Listen for token balance updates (after buy/sell) - IMMEDIATE check
    const handleTokenBalanceUpdate = () => {
      console.log('🔄 Token balance updated, IMMEDIATELY checking premium access...')
      // Immediately clear access and content if balance drops
      setHasAccess(false)
      setAccessToken(null)
      setTokenExpiresAt(null)
      setContentUrl(null)
      setContentBlob(null)
      // Then check access (will restore if still valid)
      checkAccess()
    }
    window.addEventListener('tokenBalanceUpdated', handleTokenBalanceUpdate)

    return () => {
      clearInterval(interval)
      window.removeEventListener('tokenBalanceUpdated', handleTokenBalanceUpdate)
    }
  }, [isConnected, address, tokenData, premiumContentUrl, tokenExpiresAt])

  const checkAccess = async () => {
    if (!isConnected || !address || !premiumContentUrl) {
      setHasAccess(false)
      setIsChecking(false)
      return
    }

    // Add timeout protection for the entire check
    const checkTimeout = setTimeout(() => {
      console.warn('[PremiumContentGate] Access check timeout - forcing completion')
      setIsChecking(false)
      setError('Access check timed out. Please try refreshing.')
    }, 20000) // 20 second max timeout

    try {
      setIsChecking(true)
      setError(null) // Clear previous errors
      
      // MUST use content_id for contract calls, not token_id (which is metadata address)
      const tokenId = tokenData.content_id || tokenData.token_id
      if (!tokenId) {
        setError('Token ID not found')
        setIsChecking(false)
        clearTimeout(checkTimeout)
        return
      }
      
      console.log(`[PremiumContentGate] Checking access with tokenId: ${String(tokenId)} (content_id: ${tokenData.content_id}, token_id: ${tokenData.token_id}, creator: ${tokenData.creator})`)

      // Call access check with timeout protection (already handled in checkPremiumAccess)
      setDebugInfo({ tokenId: String(tokenId), status: 'checking...' })
      
      const access = await Promise.race([
        (async () => {
          try {
            const result = await checkPremiumAccess(
              address,
              tokenData.creator,
              String(tokenId), // Ensure tokenId is string
              minimumBalance
            )
            // Also fetch balance for debug display
            try {
              const { getTokenBalance } = await import('../services/petraWalletService')
              const balance = await getTokenBalance(tokenData.creator, String(tokenId), address)
              setDebugInfo({ balance, tokenId: String(tokenId), status: result ? 'access granted' : 'access denied' })
            } catch (e) {
              setDebugInfo({ tokenId: String(tokenId), status: result ? 'access granted' : 'access denied' })
            }
            return result
          } catch (e) {
            setDebugInfo({ tokenId: String(tokenId), status: `error: ${e instanceof Error ? e.message : 'unknown'}` })
            throw e
          }
        })(),
        new Promise<boolean>((resolve) => {
          setTimeout(() => {
            console.warn('[PremiumContentGate] Access check taking too long, using fallback')
            setDebugInfo({ tokenId: String(tokenId), status: 'timeout - checking balance...' })
            // Try frontend check as fallback
            import('../services/petraWalletService').then(({ getTokenBalance }) => {
              getTokenBalance(tokenData.creator, String(tokenId), address).then(balance => {
                const hasAccess = balance >= minimumBalance
                setDebugInfo({ balance, tokenId: String(tokenId), status: hasAccess ? 'access granted (fallback)' : 'access denied (fallback)' })
                resolve(hasAccess)
              }).catch(() => resolve(false))
            }).catch(() => resolve(false))
          }, 15000) // 15 second timeout
        })
      ])

      clearTimeout(checkTimeout)

      console.log(`[PremiumContentGate] Access check result: ${access} (minimum balance: ${minimumBalance}, debug: ${JSON.stringify(debugInfo)})`)

      // STRICT: Immediately revoke access if balance is insufficient
      if (!access) {
        setHasAccess(false)
        setAccessToken(null)
        setTokenExpiresAt(null)
        setContentUrl(null)
        setContentBlob(null)
        setIsChecking(false)
        return
      }
      
      setHasAccess(access)

      // If user has access, get secure access token and load premium content
      if (access && premiumContentUrl) {
        // Track content view with Photon (unrewarded event) - debounced to avoid rate limits
        const now = Date.now()
        const timeSinceLastView = now - lastContentViewTime
        
        // Only track if at least 15 seconds have passed since last view (avoid rate limits)
        if (timeSinceLastView > 15000) {
          try {
            const contentId = tokenData.content_id || tokenData.token_id || 'unknown'
            setLastContentViewTime(now)
            trackContentView(contentId).catch(err => {
              // Silently fail - rate limits are expected
              if (!err.message?.includes('429')) {
                console.warn('⚠️ Photon content view tracking failed (non-critical):', err)
              }
            })
          } catch (photonError) {
            // Non-critical, continue
          }
        }
        try {
          // Get secure access token from backend (time-limited, verified)
          console.log(`[PremiumContentGate] Requesting access token for premium content...`)
          const tokenResponse = await Promise.race([
            getPremiumAccessToken(
              address,
              tokenData.creator,
              String(tokenId),
              premiumContentUrl,
              minimumBalance
            ),
            new Promise<{ accessToken: string; expiresAt: string } | null>((resolve) => {
              setTimeout(() => {
                console.warn('[PremiumContentGate] Access token request timeout')
                resolve(null)
              }, 15000) // 15 second timeout
            })
          ])
          
          if (tokenResponse) {
            setAccessToken(tokenResponse.accessToken)
            setTokenExpiresAt(new Date(tokenResponse.expiresAt))
            
            // For video/image content, use secure backend proxy URL
            if (premiumContentType === 'video' || premiumContentType === 'image') {
              setContentUrl(getPremiumContentUrl(premiumContentUrl, tokenResponse.accessToken))
            } else {
              // For documents, use secure backend proxy
              setContentUrl(getPremiumContentUrl(premiumContentUrl, tokenResponse.accessToken))
            }
            console.log(`[PremiumContentGate] ✅ Premium content URL set with access token`)
          } else {
            // Fallback to direct URL if token generation fails
            console.warn('[PremiumContentGate] Failed to get access token, using direct URL (less secure)')
            if (premiumContentType === 'video' || premiumContentType === 'image') {
              setContentUrl(getPremiumContentUrl(premiumContentUrl))
            } else {
              const blob = await downloadPremiumContent(premiumContentUrl)
              setContentBlob(blob)
              setContentUrl(URL.createObjectURL(blob))
            }
          }
        } catch (downloadError) {
          console.error('[PremiumContentGate] Failed to load premium content:', downloadError)
          setError(`Failed to load premium content: ${downloadError instanceof Error ? downloadError.message : 'Unknown error'}`)
        }
      } else {
        // Clear access token if access is revoked
        setAccessToken(null)
        setTokenExpiresAt(null)
        setContentUrl(null)
        setContentBlob(null)
      }
    } catch (err) {
      console.error('Error checking premium access:', err)
      setError('Failed to check access')
    } finally {
      setIsChecking(false)
    }
  }

  const handleBuyTokens = () => {
    const tokenSymbol = tokenData.token_symbol || tokenData.token_name
    if (tokenSymbol) {
      navigate(`/trade/${tokenSymbol}`)
    }
  }

  if (isChecking) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-cyan-500 mx-auto mb-4" />
          <p className="text-gray-400">Checking premium access...</p>
        </div>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <Lock className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Connect Wallet Required</h3>
          <p className="text-gray-400 mb-6">
            Please connect your wallet to access premium content
          </p>
        </motion.div>
      </div>
    )
  }

  if (!hasAccess) {
    // Show blurred preview with overlay
    return (
      <div className={`relative ${className}`}>
        {/* Blurred Preview Content */}
        {previewUrl && (
          <div className="relative overflow-hidden rounded-lg">
            {/* Blurred Content */}
            <div className="filter blur-md scale-110">
              {premiumContentType === 'video' && previewUrl && (
                <video
                  src={previewUrl}
                  className="w-full"
                  muted
                  loop
                  playsInline
                >
                  Your browser does not support the video tag.
                </video>
              )}
              {premiumContentType === 'image' && previewUrl && (
                <img
                  src={previewUrl}
                  alt="Premium content preview"
                  className="w-full"
                />
              )}
              {premiumContentType === 'document' && previewUrl && (
                <div className="w-full h-96 bg-gray-800 flex items-center justify-center">
                  <FileText className="w-24 h-24 text-gray-600" />
                </div>
              )}
              {premiumContentType === 'audio' && previewUrl && (
                <div className="w-full h-32 bg-gray-800 flex items-center justify-center">
                  <Video className="w-16 h-16 text-gray-600" />
                </div>
              )}
            </div>
            
            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            
            {/* Lock Overlay Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 z-10">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center max-w-2xl"
              >
                <div className="relative mb-6">
                  <Lock className="w-20 h-20 text-cyan-400 mx-auto mb-4 drop-shadow-lg" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Coins className="w-10 h-10 text-yellow-400 animate-pulse" />
                  </div>
                </div>
                
                <h3 className="text-3xl font-bold text-white mb-3 drop-shadow-lg">
                  Invest to See
                </h3>
                
                <p className="text-gray-200 mb-2 text-lg">
                  This content is token-gated
                </p>
                <p className="text-gray-300 mb-4 text-sm">
                  Hold at least <span className="text-cyan-400 font-semibold">{minimumBalance} {tokenData.token_symbol || 'Creator Coin'}</span> to unlock this premium content
                </p>
                
                {/* Debug Info */}
                {debugInfo && (
                  <div className="mb-4 p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                    <div className="text-xs text-gray-400 space-y-1">
                      <div>Token ID: {debugInfo.tokenId ? `${String(debugInfo.tokenId).slice(0, 20)}...` : 'N/A'}</div>
                      {debugInfo.balance !== undefined && (
                        <div className={debugInfo.balance >= minimumBalance ? 'text-green-400' : 'text-red-400'}>
                          Your Balance: {debugInfo.balance.toFixed(2)} {tokenData.token_symbol || 'tokens'}
                          {debugInfo.balance < minimumBalance && (
                            <span className="text-yellow-400 ml-2">(Need {minimumBalance})</span>
                          )}
                        </div>
                      )}
                      <div className="text-blue-400">Status: {debugInfo.status || 'unknown'}</div>
                    </div>
                  </div>
                )}
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
                  <motion.button
                    onClick={handleBuyTokens}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-8 py-4 bg-gradient-to-r from-purple-600 via-violet-600 to-amber-500 rounded-xl text-white font-bold text-lg flex items-center justify-center gap-2 shadow-2xl hover:shadow-purple-500/50 transition-all"
                  >
                    <Coins className="w-6 h-6" />
                    Invest to See
                  </motion.button>
                  <motion.button
                    onClick={checkAccess}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-6 py-3 bg-white/10 backdrop-blur-sm rounded-xl text-white font-semibold border border-white/20 hover:bg-white/20 transition-colors"
                  >
                    <Eye className="w-5 h-5 inline mr-2" />
                    Refresh
                  </motion.button>
                </div>
                
                <p className="text-xs text-gray-400 text-center">
                  Go to marketplace to buy {tokenData.token_symbol || 'Creator Coin'} and unlock this content
                </p>
                
                {/* Preview Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-black/40 backdrop-blur-sm rounded-full border border-white/20">
                  <Eye className="w-4 h-4 text-gray-300" />
                  <span className="text-sm text-gray-300">Preview Mode</span>
                </div>
              </motion.div>
            </div>
          </div>
        )}
        
        {/* Shelby Storage Info */}
        {premiumContentUrl && (
          <div className="mt-4">
            <ShelbyStorageInfo
              blobUrl={premiumContentUrl}
              contentType={premiumContentType}
            />
          </div>
        )}
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Error Loading Content</h3>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    )
  }

  // User has access - show premium content
  return (
    <div className={className}>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="relative"
        >
          {/* Access badge */}
          <div className="absolute top-4 right-4 z-10">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="bg-green-500/90 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2 text-white text-sm font-semibold"
            >
              <Unlock className="w-4 h-4" />
              Premium Access
            </motion.div>
          </div>

          {/* Render content based on type */}
          {premiumContentType === 'video' && contentUrl && (
            <video
              src={contentUrl}
              controls
              className="w-full rounded-lg"
              autoPlay={false}
            >
              Your browser does not support the video tag.
            </video>
          )}

          {premiumContentType === 'image' && contentUrl && (
            <img
              src={contentUrl}
              alt="Premium content"
              className="w-full rounded-lg"
            />
          )}

          {premiumContentType === 'document' && contentUrl && (
            <iframe
              src={contentUrl}
              className="w-full h-96 rounded-lg"
              title="Premium document"
            />
          )}

          {premiumContentType === 'audio' && contentUrl && (
            <audio
              src={contentUrl}
              controls
              className="w-full"
            >
              Your browser does not support the audio tag.
            </audio>
          )}

          {/* Custom children content */}
          {children && <div className="mt-4">{children}</div>}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default PremiumContentGate

