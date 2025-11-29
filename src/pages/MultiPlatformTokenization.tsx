import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Youtube, 
  Instagram, 
  Twitter, 
  Linkedin,
  CheckCircle,
  AlertCircle,
  Sparkles,
  TrendingUp,
  Users,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Search,
  Filter,
  Grid,
  List,
  Play,
  Image as ImageIcon,
  FileText,
  Shield,
  Coins,
  Rocket,
  Zap,
  ExternalLink,
  RefreshCw,
  Loader,
  Link as LinkIcon,
  Globe,
  Wallet,
  Bookmark,
  X
} from 'lucide-react'
import { useWallet } from '../contexts/WalletContext'
import { socialMediaService, SocialMediaContent } from '../services/socialMediaService'
import { createASAWithPetra } from '../services/petraWalletService'
import TradeSuccessModal from '../components/TradeSuccessModal'
import TokenSuccessModal from '../components/TokenSuccessModal'
import PremiumBackground from '../components/PremiumBackground'

type Platform = 'youtube' | 'instagram' | 'twitter' | 'linkedin'

const MultiPlatformTokenization: React.FC = () => {
  const [searchParams] = useSearchParams()
  const { isConnected, address, petraWallet, connectWallet } = useWallet()
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null)
  const [contentUrl, setContentUrl] = useState('')
  const [scrapedContent, setScrapedContent] = useState<SocialMediaContent | null>(null)
  const [verificationStatus, setVerificationStatus] = useState<{
    verified: boolean, 
    message: string,
    requires_bio_verification?: boolean,
    verification_code?: string
  } | null>(null)
  const [verificationCode, setVerificationCode] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [scraping, setScraping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showTokenizeModal, setShowTokenizeModal] = useState(false)
  const [tokenizing, setTokenizing] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successData, setSuccessData] = useState<any>(null)

  // Auto-fetch content when URL params are provided
  useEffect(() => {
    const platformParam = searchParams.get('platform') as Platform | null
    const urlParam = searchParams.get('url')
    
    if (platformParam && urlParam) {
      const decodedUrl = decodeURIComponent(urlParam)
      setSelectedPlatform(platformParam)
      setContentUrl(decodedUrl)
      
      // Auto-fetch if YouTube (since we have API access)
      if (platformParam === 'youtube') {
        handleAutoFetchYouTube(decodedUrl)
      }
    }
  }, [searchParams])

  const handleAutoFetchYouTube = async (url: string) => {
    setScraping(true)
    setError(null)
    setScrapedContent(null)
    setVerificationStatus(null)
    
    try {
      const result = await socialMediaService.scrapeContentFromUrl(url, 'youtube')
      if (result.success && result.content) {
        setScrapedContent(result.content)
        
        // Check ownership - only allow tokenizing your own videos
        const isOwned = result.content.isOwned !== false // Default to true if not specified
        const ownershipMsg = result.content.ownershipMessage || (isOwned ? 'You own this video and can tokenize it.' : 'This video belongs to another channel.')
        
        if (isOwned) {
          setVerificationStatus({ verified: true, message: `✅ ${ownershipMsg}` })
        } else {
          setVerificationStatus({ verified: false, message: `❌ ${ownershipMsg}` })
          setError('You can only tokenize videos from your connected YouTube channel. Please connect your channel or select one of your own videos.')
        }
      } else {
        setError(result.error || 'Failed to fetch video')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch video')
    } finally {
      setScraping(false)
    }
  }

  const platformIcons = {
    youtube: Youtube,
    instagram: Instagram,
    twitter: Twitter,
    linkedin: Linkedin
  }

  const platformColors = {
    youtube: 'from-red-500 to-red-600',
    instagram: 'from-pink-500 to-purple-600',
    twitter: 'from-blue-400 to-blue-600',
    linkedin: 'from-blue-600 to-blue-800'
  }

  const platformNames = {
    youtube: 'YouTube',
    instagram: 'Instagram',
    twitter: 'Twitter/X',
    linkedin: 'LinkedIn'
  }

  const handlePlatformSelect = (platform: Platform) => {
    setSelectedPlatform(platform)
    setContentUrl('')
    setScrapedContent(null)
    setVerificationStatus(null)
    setError(null)
  }

  const handleUrlChange = (url: string) => {
    setContentUrl(url)
    setError(null)
    
    // Auto-detect platform from URL
    const detected = socialMediaService.detectPlatformFromUrl(url)
    if (detected && detected !== 'youtube') {
      setSelectedPlatform(detected)
    }
  }

  const handleScrape = async () => {
    if (!contentUrl.trim()) {
      setError('Please enter a URL')
      return
    }

    // Auto-detect platform if not selected
    if (!selectedPlatform) {
      const detected = socialMediaService.detectPlatformFromUrl(contentUrl)
      if (detected) {
        setSelectedPlatform(detected)
      } else {
        setError('Please select a platform or enter a valid URL')
        return
      }
    }

    // Validate URL
    if (!socialMediaService.validateUrl(contentUrl, selectedPlatform)) {
      setError(`Invalid ${platformNames[selectedPlatform]} URL`)
      return
    }

    setScraping(true)
    setError(null)
    setScrapedContent(null)
    setVerificationStatus(null)

    try {
      // Scrape content (no username needed for any platform)
      const result = await socialMediaService.scrapeContentFromUrl(
        contentUrl,
        selectedPlatform
      )

      if (result.success && result.content) {
        setScrapedContent(result.content)
        
        // For YouTube, check ownership from content response
        if (selectedPlatform === 'youtube') {
          const isOwned = result.content.isOwned !== false
          const ownershipMsg = result.content.ownershipMessage || (isOwned ? 'You own this video and can tokenize it.' : 'This video belongs to another channel.')
          
          if (isOwned) {
            setVerificationStatus({ verified: true, message: `✅ ${ownershipMsg}` })
          } else {
            setVerificationStatus({ verified: false, message: `❌ ${ownershipMsg}` })
            setError('🚫 You can only tokenize videos from your connected YouTube channel. Connect your channel or select your own video.')
          }
        } else {
          // For Instagram, Twitter, LinkedIn - no verification required, allow tokenization
          setVerificationStatus({ verified: true, message: '✅ Content ready for tokenization' })
        }
      } else {
        setError(result.error || 'Failed to scrape content. Please check the URL and try again.')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while scraping content')
    } finally {
      setScraping(false)
    }
  }

  const handleTokenize = () => {
    if (!isConnected || !address || !petraWallet) {
      setError('Please connect your Petra Wallet first')
      return
    }

    if (!scrapedContent) {
      setError('Please scrape content first')
      return
    }

    // Only require verification for YouTube (other platforms don't need verification)
    if (scrapedContent?.platform === 'youtube' && (!verificationStatus || !verificationStatus.verified)) {
      setError('⚠️ You can only tokenize videos from your connected YouTube channel.')
      return
    }

    setShowTokenizeModal(true)
  }

  const executeTokenization = async (tokenName: string, tokenSymbol: string, totalSupply: number) => {
    if (!scrapedContent || !address || !petraWallet) return

    setTokenizing(true)
    setError(null)

    try {
      // Skip ownership verification for Instagram, Twitter, LinkedIn - allow tokenization
      // Only YouTube requires ownership verification (via API)

      // Create ASA using Petra Wallet
      // Use 1,000,000 tokens as default supply for bonding curve
      // With 0 decimals, this means 1,000,000 base units
      const actualSupply = totalSupply >= 1000000 ? totalSupply : 1000000
      
      const { txId, assetId } = await createASAWithPetra({
        sender: address,
        petraWallet: petraWallet,
        assetName: tokenName,
        unitName: tokenSymbol.toUpperCase(),
        totalSupply: actualSupply,
        decimals: 0, // No decimals for simplicity
        url: scrapedContent.url,
        manager: address,
        reserve: address, // Creator holds all tokens initially
        freeze: address,
        clawback: address
      })

      if (!assetId && assetId !== 0) {
        throw new Error('Failed to get asset ID from transaction. Please try again.')
      }

      // Convert BigInt to string/number for JSON serialization
      const assetIdStr = typeof assetId === 'bigint' ? assetId.toString() : String(assetId)
      const assetIdNum = typeof assetId === 'bigint' ? Number(assetId) : Number(assetId)

      console.log(`✅ Token created: ${tokenName} (${tokenSymbol}) - Asset ID: ${assetIdStr}, TX: ${txId}`)

      // Save to backend
      const response = await fetch('http://localhost:5001/create-creator-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creator_address: address,
          token_name: tokenName,
          token_symbol: tokenSymbol.toUpperCase(),
          total_supply: totalSupply,
          transaction_id: txId,
          asset_id: assetIdNum, // Convert to number for backend
          initial_price: 0.01,
          description: scrapedContent.description || `Tokenized ${scrapedContent.platform} content`,
          platform: scrapedContent.platform,
          content_id: scrapedContent.id,
          content_url: scrapedContent.url,
          content_thumbnail: scrapedContent.thumbnailUrl || ''
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `Failed to save token to backend: ${response.status}`)
      }

      const responseData = await response.json()
      
      console.log('✅ Token creation successful! Closing modal and showing success...')
      
      // Set success data first
      const successDataObj = {
        tokenName,
        tokenSymbol: tokenSymbol.toUpperCase(),
        totalSupply,
        transactionId: txId,
        assetId: assetIdStr, // Use string version for display
        content: scrapedContent,
        message: `Successfully created token ${tokenName} (${tokenSymbol.toUpperCase()})!`
      }
      
      setSuccessData(successDataObj)
      
      // Close tokenize modal
      setShowTokenizeModal(false)
      
      // Clear form data
      setScrapedContent(null)
      setContentUrl('')
      setVerificationStatus(null)
      setError(null)
      
      // Show success modal immediately
      setShowSuccessModal(true)
      
      console.log('✅ Success modal should now be visible')
    } catch (error: any) {
      console.error('Tokenization error:', error)
      
      // Handle network mismatch error specifically
      if (error?.name === 'NetworkMismatchError' || error?.message?.includes('Network mismatch') || error?.message?.includes('different networks')) {
        setError('⚠️ Network Mismatch!\n\nPlease ensure your Petra Wallet is set to TESTNET.\n\nTo fix:\n1. Open Petra Wallet app\n2. Go to Settings\n3. Switch to Testnet\n4. Try again')
      } else {
        setError(`Tokenization failed: ${error.message || 'Unknown error occurred'}`)
      }
      // Don't close modal on error - let user see the error and try again
    } finally {
      setTokenizing(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] py-8 relative">
      <PremiumBackground variant="purple" />
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Premium Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/30 mb-8">
            <Rocket className="w-5 h-5 text-violet-400" />
            <span className="text-sm font-semibold text-violet-300">Content Tokenization</span>
          </div>
          <motion.div 
            className="w-20 h-20 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-violet-500/25"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <Coins className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Transform Your Content Into
            <span className="block bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
              Digital Assets
            </span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-6 leading-relaxed">
            Monetize your social media content by creating tradeable tokens on the Aptos blockchain. 
            Your audience can invest in your success, and you earn from every trade.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-sm">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-300">Instant Tokenization</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/30">
              <TrendingUp className="w-4 h-4 text-violet-400" />
              <span className="text-violet-300">5% Creator Earnings</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/30">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span className="text-cyan-300">Secure & Verified</span>
            </div>
          </div>
        </motion.div>

        {/* Platform Selection - Premium Design */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Select Your Platform</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {(['instagram', 'twitter', 'linkedin', 'youtube'] as Platform[]).map((platform) => {
              const Icon = platformIcons[platform]
              const colorClass = platformColors[platform]
              const isSelected = selectedPlatform === platform

              return (
                <motion.button
                  key={platform}
                  onClick={() => handlePlatformSelect(platform)}
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  className={`relative p-8 rounded-3xl border-2 transition-all duration-300 overflow-hidden group ${
                    isSelected
                      ? `bg-gradient-to-br ${colorClass} border-transparent text-white shadow-2xl`
                      : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      className="absolute inset-0 bg-white/10"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                  <div className="relative z-10">
                    <Icon className={`w-12 h-12 mx-auto mb-3 ${isSelected ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                    <div className="font-bold text-lg mb-1">{platformNames[platform]}</div>
                    <div className={`text-xs ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                      {platform === 'youtube' ? 'Connect Channel' : 'Paste URL'}
                    </div>
                  </div>
                  {isSelected && (
                    <motion.div
                      className="absolute top-2 right-2"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                    >
                      <CheckCircle className="w-6 h-6 text-white" />
                    </motion.div>
                  )}
                </motion.button>
              )
            })}
          </div>
        </motion.div>

        {/* URL Input Section */}
        {selectedPlatform && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 mb-8"
          >
            <div className="flex items-center space-x-2 mb-4">
              <LinkIcon className="w-6 h-6 text-primary-400" />
              <h2 className="text-2xl font-bold text-white">
                Paste Your {platformNames[selectedPlatform]} Content URL
              </h2>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={contentUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder={
                    selectedPlatform === 'instagram'
                      ? 'https://www.instagram.com/username/reel/ABC123/'
                      : selectedPlatform === 'twitter'
                      ? 'https://twitter.com/username/status/1234567890'
                      : selectedPlatform === 'linkedin'
                      ? 'https://www.linkedin.com/posts/username_activity-1234567890'
                      : 'https://www.youtube.com/watch?v=...'
                  }
                  className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 text-lg"
                />
              </div>

              {/* Verification Status */}
              {verificationStatus && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`p-4 rounded-xl border-2 ${
                    verificationStatus.verified
                      ? 'bg-green-500/20 border-green-500/50 text-green-200'
                      : 'bg-red-500/20 border-red-500/50 text-red-200'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {verificationStatus.verified ? (
                      <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-400" />
                    ) : (
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" />
                    )}
                    <div>
                      <p className="font-semibold">
                        {verificationStatus.verified ? '✅ Ownership Verified' : '❌ Ownership Not Verified'}
                      </p>
                      <p className="text-sm mt-1">{verificationStatus.message}</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`p-4 rounded-xl flex items-start space-x-2 ${
                    error.includes('⚠️') 
                      ? 'bg-yellow-500/20 border border-yellow-500/50 text-yellow-200'
                      : 'bg-red-500/20 border border-red-500/50 text-red-200'
                  }`}
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{error}</span>
                </motion.div>
              )}

              <motion.button
                onClick={handleScrape}
                disabled={scraping || !contentUrl.trim()}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-bold text-lg hover:from-violet-700 hover:to-fuchsia-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg shadow-violet-500/25"
              >
                {scraping ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Fetching Content...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    <span>Fetch Content Details</span>
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Content Preview Display - Premium Design */}
        {scrapedContent && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-white/5 via-white/5 to-white/5 backdrop-blur-xl rounded-3xl overflow-hidden border border-white/10 mb-8 shadow-2xl"
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  {(() => {
                    const Icon = platformIcons[scrapedContent.platform as Platform]
                    const colorClass = platformColors[scrapedContent.platform as Platform]
                    return (
                      <div className={`bg-gradient-to-r ${colorClass} p-4 rounded-2xl shadow-lg`}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                    )
                  })()}
                  <div>
                    <h3 className="text-white font-bold text-2xl mb-1">{scrapedContent.title}</h3>
                    {scrapedContent.authorName && (
                      <p className="text-gray-400 text-sm flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        @{scrapedContent.authorName}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <span className="text-emerald-300 text-sm font-semibold">Ready to Tokenize</span>
                </div>
              </div>

              {/* Content Preview - Full screen for Instagram Reels, standard for others */}
              {scrapedContent.thumbnailUrl ? (
                <div className={`relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl overflow-hidden mb-4 ${
                  scrapedContent.platform === 'instagram' 
                    ? 'aspect-[9/16] max-w-sm mx-auto' // Phone-style vertical aspect ratio for Reels
                    : 'aspect-video w-full' // Standard 16:9 for YouTube/Twitter
                }`}>
                  <img
                    src={scrapedContent.thumbnailUrl}
                    alt={scrapedContent.title}
                    className="w-full h-full object-cover"
                  />
                  {/* Play button overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                    <a 
                      href={scrapedContent.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-all hover:scale-110"
                    >
                      <Play className="w-8 h-8 text-white ml-1" />
                    </a>
                  </div>
                  {/* Platform badge */}
                  <div className={`absolute top-3 left-3 px-3 py-1.5 rounded-full bg-gradient-to-r ${platformColors[scrapedContent.platform as Platform]} text-white text-xs font-bold flex items-center space-x-1`}>
                    {(() => {
                      const Icon = platformIcons[scrapedContent.platform as Platform]
                      return Icon ? <Icon className="w-3 h-3" /> : null
                    })()}
                    <span>{platformNames[scrapedContent.platform as Platform]}</span>
                  </div>
                </div>
              ) : scrapedContent.platform === 'instagram' ? (
                // Instagram placeholder when no thumbnail
                <div className="relative aspect-[9/16] max-w-sm mx-auto bg-gradient-to-br from-pink-900/30 to-purple-900/30 rounded-2xl overflow-hidden mb-4 border-2 border-dashed border-pink-500/30">
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                    <Instagram className="w-16 h-16 text-pink-400 mb-4" />
                    <h4 className="text-white font-bold text-lg mb-2">Instagram Reel</h4>
                    <p className="text-gray-400 text-sm mb-2">
                      {scrapedContent.authorName ? `@${scrapedContent.authorName}` : 'Reel content'}
                    </p>
                    <a 
                      href={scrapedContent.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg text-sm font-semibold hover:from-pink-600 hover:to-purple-700 transition-all flex items-center space-x-2"
                    >
                      <Play className="w-4 h-4" />
                      <span>Watch on Instagram</span>
                    </a>
                  </div>
                </div>
              ) : null}

              {scrapedContent.description && (
                <p className="text-gray-300 mb-4 line-clamp-3">{scrapedContent.description}</p>
              )}

              {/* Engagement Stats - Premium Cards */}
              {scrapedContent.engagement && (scrapedContent.engagement.likes > 0 || scrapedContent.engagement.comments > 0 || scrapedContent.engagement.shares > 0) && (
                <div className="mb-6">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Sparkles className="w-3 h-3 text-violet-400" />
                    Content Performance
                  </h4>
                  <div className={`grid gap-3 ${
                    scrapedContent.engagement.bookmarks > 0 ? 'grid-cols-5' :
                    (scrapedContent.engagement.views > 0 && scrapedContent.engagement.shares > 0) ? 'grid-cols-4' :
                    (scrapedContent.engagement.views > 0 || scrapedContent.engagement.shares > 0) ? 'grid-cols-3' : 'grid-cols-2'
                  }`}>
                    {/* Views Card - Only show if we have views (YouTube) */}
                    {scrapedContent.engagement.views > 0 && (
                      <motion.div 
                        className="p-4 bg-gradient-to-br from-violet-500/20 to-purple-600/10 rounded-2xl border border-violet-500/30 text-center"
                        whileHover={{ scale: 1.03, y: -2 }}
                      >
                        <div className="w-10 h-10 mx-auto mb-2 bg-violet-500/20 rounded-xl flex items-center justify-center">
                          <Eye className="w-5 h-5 text-violet-400" />
                        </div>
                        <div className="text-2xl font-black text-white mb-0.5">
                          {scrapedContent.engagement.views.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-violet-300 font-semibold uppercase tracking-widest">Views</div>
                      </motion.div>
                    )}
                    
                    {/* Likes Card */}
                    <motion.div 
                      className="p-4 bg-gradient-to-br from-pink-500/20 to-red-600/10 rounded-2xl border border-pink-500/30 text-center"
                      whileHover={{ scale: 1.03, y: -2 }}
                    >
                      <div className="w-10 h-10 mx-auto mb-2 bg-pink-500/20 rounded-xl flex items-center justify-center">
                        <Heart className="w-5 h-5 text-pink-400" />
                      </div>
                      <div className="text-2xl font-black text-white mb-0.5">
                        {scrapedContent.engagement.likes > 0 ? scrapedContent.engagement.likes.toLocaleString() : '—'}
                      </div>
                      <div className="text-[10px] text-pink-300 font-semibold uppercase tracking-widest">Likes</div>
                    </motion.div>
                    
                    {/* Comments Card */}
                    <motion.div 
                      className="p-4 bg-gradient-to-br from-cyan-500/20 to-blue-600/10 rounded-2xl border border-cyan-500/30 text-center"
                      whileHover={{ scale: 1.03, y: -2 }}
                    >
                      <div className="w-10 h-10 mx-auto mb-2 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                        <MessageCircle className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div className="text-2xl font-black text-white mb-0.5">
                        {scrapedContent.engagement.comments > 0 ? scrapedContent.engagement.comments.toLocaleString() : '—'}
                      </div>
                      <div className="text-[10px] text-cyan-300 font-semibold uppercase tracking-widest">
                        {scrapedContent.platform === 'twitter' ? 'Replies' : 'Comments'}
                      </div>
                    </motion.div>
                    
                    {/* Shares/Reposts Card - Only show for Twitter/LinkedIn */}
                    {scrapedContent.engagement.shares > 0 && (
                      <motion.div 
                        className="p-4 bg-gradient-to-br from-emerald-500/20 to-green-600/10 rounded-2xl border border-emerald-500/30 text-center"
                        whileHover={{ scale: 1.03, y: -2 }}
                      >
                        <div className="w-10 h-10 mx-auto mb-2 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                          <Share2 className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="text-2xl font-black text-white mb-0.5">
                          {scrapedContent.engagement.shares.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-emerald-300 font-semibold uppercase tracking-widest">
                          {scrapedContent.platform === 'twitter' ? 'Reposts' : 'Shares'}
                        </div>
                      </motion.div>
                    )}
                    
                    {/* Bookmarks Card - Only for Twitter */}
                    {scrapedContent.engagement.bookmarks > 0 && (
                      <motion.div 
                        className="p-4 bg-gradient-to-br from-amber-500/20 to-orange-600/10 rounded-2xl border border-amber-500/30 text-center"
                        whileHover={{ scale: 1.03, y: -2 }}
                      >
                        <div className="w-10 h-10 mx-auto mb-2 bg-amber-500/20 rounded-xl flex items-center justify-center">
                          <Bookmark className="w-5 h-5 text-amber-400" />
                        </div>
                        <div className="text-2xl font-black text-white mb-0.5">
                          {scrapedContent.engagement.bookmarks.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-amber-300 font-semibold uppercase tracking-widest">Bookmarks</div>
                      </motion.div>
                    )}
                  </div>
                </div>
              )}

              {/* Enter the World of Tokenization Banner */}
              <motion.div 
                className="mb-6 p-5 bg-gradient-to-r from-violet-600/20 via-fuchsia-600/15 to-pink-600/20 rounded-2xl border border-violet-500/30 relative overflow-hidden"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-fuchsia-500/20 to-transparent rounded-full blur-2xl" />
                <div className="relative flex items-center space-x-4">
                  <motion.div 
                    className="w-14 h-14 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/30"
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <Rocket className="w-7 h-7 text-white" />
                  </motion.div>
                  <div className="flex-1">
                    <h4 className="text-white font-bold text-lg flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-violet-400" />
                      Enter the World of Tokenization
                    </h4>
                    <p className="text-gray-300 text-sm mt-1">
                      Transform this content into a <span className="text-violet-300 font-semibold">tradeable digital asset</span>. 
                      Earn <span className="text-emerald-400 font-bold">5% creator fee</span> on every trade!
                    </p>
                  </div>
                </div>
              </motion.div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <a
                  href={scrapedContent.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-gray-300 hover:text-white transition-all"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>View Original</span>
                </a>
                <div className="flex-1" />
                <motion.button
                  onClick={handleTokenize}
                  disabled={!isConnected || tokenizing || !verificationStatus?.verified}
                  className="group px-8 py-4 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 text-white rounded-2xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-500/25"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="flex items-center space-x-3">
                    <Coins className="w-6 h-6" />
                    <span>
                      {!verificationStatus?.verified 
                        ? 'Verify Ownership First' 
                        : tokenizing 
                        ? 'Creating Token...' 
                        : '✨ Tokenize This Content'}
                    </span>
                    {!tokenizing && verificationStatus?.verified && (
                      <Rocket className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    )}
                  </span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tokenize Modal - Only show if not showing success modal */}
        {showTokenizeModal && scrapedContent && !showSuccessModal && (
          <TokenizeModal
            content={scrapedContent}
            onClose={() => {
              setShowTokenizeModal(false)
              setScrapedContent(null)
            }}
            onTokenize={executeTokenization}
            loading={tokenizing}
          />
        )}

        {/* Success Modal */}
        {successData && showSuccessModal && (
          <TokenSuccessModal
            isOpen={showSuccessModal}
            onClose={() => {
              setShowSuccessModal(false)
              setSuccessData(null)
            }}
            tokenName={successData.tokenName}
            tokenSymbol={successData.tokenSymbol}
            totalSupply={successData.totalSupply}
            transactionId={successData.transactionId}
            assetId={successData.assetId}
            message={successData.message}
          />
        )}
      </div>
    </div>
  )
}

// Tokenize Modal Component
interface TokenizeModalProps {
  content: SocialMediaContent
  onClose: () => void
  onTokenize: (name: string, symbol: string, supply: number) => void
  loading: boolean
}

const TokenizeModal: React.FC<TokenizeModalProps> = ({
  content,
  onClose,
  onTokenize,
  loading
}) => {
  const [tokenName, setTokenName] = useState(content.title.substring(0, 32))
  const [tokenSymbol, setTokenSymbol] = useState('')
  const [totalSupply, setTotalSupply] = useState('1000000')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onTokenize(tokenName, tokenSymbol, parseInt(totalSupply))
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 rounded-3xl p-8 max-w-md w-full"
      >
        <h2 className="text-2xl font-bold text-white mb-6">Tokenize Content</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white font-medium mb-2">Token Name</label>
            <input
              type="text"
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              maxLength={32}
              className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white"
              required
            />
          </div>

          <div>
            <label className="block text-white font-medium mb-2">Token Symbol</label>
            <input
              type="text"
              value={tokenSymbol}
              onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())}
              maxLength={10}
              className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white"
              required
            />
          </div>

          <div>
            <label className="block text-white font-medium mb-2">Total Supply</label>
            <input
              type="number"
              value={totalSupply}
              onChange={(e) => setTotalSupply(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white"
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-white/20 text-white rounded-xl font-medium hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-xl font-medium hover:from-primary-600 hover:to-secondary-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Creating Token...</span>
                </>
              ) : (
                <span>Create Token</span>
              )}
            </button>
          </div>
          
          {loading && (
            <div className="mt-4 p-3 bg-blue-500/20 border border-blue-500/50 rounded-xl">
              <p className="text-blue-200 text-sm text-center">
                ⏳ Please wait... Signing transaction with Petra Wallet and creating your token on Aptos blockchain.
              </p>
            </div>
          )}
        </form>
      </motion.div>
    </div>
  )
}

export default MultiPlatformTokenization
