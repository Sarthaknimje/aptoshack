/**
 * Premium Content Gate Component
 * Shows premium content only to token holders
 * Automatically checks token balance and shows/hides content accordingly
 */

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Unlock, Coins, AlertCircle, Loader, Play, Image as ImageIcon, FileText, Video } from 'lucide-react'
import { useWallet } from '../contexts/WalletContext'
import { checkPremiumAccess, downloadPremiumContent, getPremiumContentUrl } from '../services/shelbyService'
import { useNavigate } from 'react-router-dom'

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
  const navigate = useNavigate()
  const [hasAccess, setHasAccess] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [contentBlob, setContentBlob] = useState<Blob | null>(null)
  const [contentUrl, setContentUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkAccess()
    
    // Set up interval to check access periodically (in case user buys/sells tokens)
    const interval = setInterval(() => {
      checkAccess()
    }, 10000) // Check every 10 seconds

    return () => clearInterval(interval)
  }, [isConnected, address, tokenData, premiumContentUrl])

  const checkAccess = async () => {
    if (!isConnected || !address || !premiumContentUrl) {
      setHasAccess(false)
      setIsChecking(false)
      return
    }

    try {
      setIsChecking(true)
      const tokenId = tokenData.content_id || tokenData.token_id
      if (!tokenId) {
        setError('Token ID not found')
        setIsChecking(false)
        return
      }

      const access = await checkPremiumAccess(
        address,
        tokenData.creator,
        tokenId,
        minimumBalance
      )

      setHasAccess(access)

      // If user has access, load the premium content
      if (access && premiumContentUrl) {
        try {
          // For video/image content, use direct URL
          if (premiumContentType === 'video' || premiumContentType === 'image') {
            setContentUrl(getPremiumContentUrl(premiumContentUrl))
          } else {
            // For documents, download as blob
            const blob = await downloadPremiumContent(premiumContentUrl)
            setContentBlob(blob)
            setContentUrl(URL.createObjectURL(blob))
          }
        } catch (downloadError) {
          console.error('Failed to load premium content:', downloadError)
          setError('Failed to load premium content')
        }
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
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="relative mb-6">
            <Lock className="w-20 h-20 text-cyan-500 mx-auto mb-4" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Coins className="w-10 h-10 text-yellow-500 animate-pulse" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Premium Content Locked</h3>
          <p className="text-gray-400 mb-6">
            You need to hold at least <span className="text-cyan-400 font-semibold">{minimumBalance} {tokenData.token_symbol || 'tokens'}</span> to access this premium content.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.button
              onClick={handleBuyTokens}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl text-white font-semibold flex items-center justify-center gap-2"
            >
              <Coins className="w-5 h-5" />
              Buy Tokens
            </motion.button>
            <motion.button
              onClick={checkAccess}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-3 bg-gray-700 rounded-xl text-white font-semibold"
            >
              Refresh Access
            </motion.button>
          </div>
        </motion.div>
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

