import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Youtube, 
  Instagram, 
  Twitter, 
  Linkedin,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Sparkles,
  TrendingUp,
  Users,
  Eye,
  Heart,
  MessageCircle,
  Share2
} from 'lucide-react'
import { socialMediaService, PlatformAuth } from '../services/socialMediaService'

interface MultiPlatformSelectorProps {
  onPlatformSelect: (platform: string) => void
  onContentSelect?: (content: any) => void
}

const MultiPlatformSelector: React.FC<MultiPlatformSelectorProps> = ({
  onPlatformSelect,
  onContentSelect
}) => {
  const [platforms, setPlatforms] = useState<PlatformAuth[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)

  useEffect(() => {
    checkPlatformStatus()
  }, [])

  const checkPlatformStatus = async () => {
    setLoading(true)
    try {
      // Check YouTube only (other platforms use URL scraping, no OAuth needed)
      const youtubeAuth = await socialMediaService.checkYouTubeAuth()
      setPlatforms([
        {
          platform: 'youtube',
          isConnected: youtubeAuth.isConnected,
          userId: youtubeAuth.channelId,
          username: youtubeAuth.channelTitle
        },
        {
          platform: 'instagram',
          isConnected: false // No OAuth - uses URL scraping
        },
        {
          platform: 'twitter',
          isConnected: false // No OAuth - uses URL scraping
        },
        {
          platform: 'linkedin',
          isConnected: false // No OAuth - uses URL scraping
        }
      ])
    } catch (error) {
      console.error('Error checking platform status:', error)
      // Set default platforms
      setPlatforms([
        { platform: 'youtube', isConnected: false },
        { platform: 'instagram', isConnected: false },
        { platform: 'twitter', isConnected: false },
        { platform: 'linkedin', isConnected: false }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async (platform: 'instagram' | 'twitter' | 'linkedin') => {
    // For Instagram, Twitter, LinkedIn - redirect to tokenize page with URL input
    // No OAuth needed - just paste URL
    window.location.href = '/tokenize'
  }

  const platformConfig = {
    youtube: {
      name: 'YouTube',
      icon: Youtube,
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
      description: 'Tokenize your YouTube videos'
    },
    instagram: {
      name: 'Instagram',
      icon: Instagram,
      color: 'from-pink-500 to-purple-600',
      bgColor: 'bg-pink-500/10',
      borderColor: 'border-pink-500/30',
      description: 'Tokenize your Instagram Reels'
    },
    twitter: {
      name: 'Twitter/X',
      icon: Twitter,
      color: 'from-blue-400 to-blue-600',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      description: 'Tokenize your Twitter Tweets'
    },
    linkedin: {
      name: 'LinkedIn',
      icon: Linkedin,
      color: 'from-blue-600 to-blue-800',
      bgColor: 'bg-blue-600/10',
      borderColor: 'border-blue-600/30',
      description: 'Tokenize your LinkedIn Posts'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Connect Your Platforms</h2>
        <p className="text-gray-400">
          Link your social media accounts to tokenize your content
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {platforms.map((platform) => {
          const config = platformConfig[platform.platform]
          const Icon = config.icon
          const isConnected = platform.isConnected

          return (
            <motion.div
              key={platform.platform}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`relative overflow-hidden rounded-2xl border-2 ${
                isConnected 
                  ? `${config.bgColor} ${config.borderColor} border-green-500/50` 
                  : 'bg-white/5 border-white/10'
              } p-6 transition-all duration-300 hover:scale-105`}
            >
              {/* Background Gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${config.color} opacity-5`}></div>

              {/* Content */}
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className={`w-14 h-14 bg-gradient-to-br ${config.color} rounded-xl flex items-center justify-center shadow-lg`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{config.name}</h3>
                      <p className="text-sm text-gray-400">{config.description}</p>
                    </div>
                  </div>

                  {isConnected && (
                    <div className="flex items-center space-x-2 text-green-400">
                      <CheckCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">Connected</span>
                    </div>
                  )}
                </div>

                {isConnected && platform.username && (
                  <div className="mb-4 p-3 bg-white/5 rounded-lg">
                    <p className="text-sm text-gray-400">Connected as</p>
                    <p className="text-white font-semibold">@{platform.username}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  {platform.platform === 'youtube' ? (
                    isConnected ? (
                      <>
                        <button
                          onClick={() => onPlatformSelect(platform.platform)}
                          className="flex-1 px-4 py-2 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-lg font-medium hover:from-primary-600 hover:to-secondary-600 transition-all"
                        >
                          Select Content
                        </button>
                        <button
                          onClick={checkPlatformStatus}
                          className="px-4 py-2 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition-all"
                        >
                          Refresh
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleConnect(platform.platform as 'instagram' | 'twitter' | 'linkedin')}
                        disabled={connecting === platform.platform}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-lg font-medium hover:from-gray-600 hover:to-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                      >
                        {connecting === platform.platform ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Connecting...</span>
                          </>
                        ) : (
                          <>
                            <Icon className="w-4 h-4" />
                            <span>Connect {config.name}</span>
                          </>
                        )}
                      </button>
                    )
                  ) : (
                    // Instagram, Twitter, LinkedIn - No OAuth needed, just paste URL
                    <button
                      onClick={() => onPlatformSelect(platform.platform)}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-lg font-medium hover:from-primary-600 hover:to-secondary-600 transition-all flex items-center justify-center space-x-2"
                    >
                      <Icon className="w-4 h-4" />
                      <span>Paste URL (FREE)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Connected Badge */}
              {isConnected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-4 right-4 w-3 h-3 bg-green-500 rounded-full shadow-lg shadow-green-500/50"
                />
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4"
      >
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-blue-300 font-medium mb-1">Content Ownership Protection</p>
            <p className="text-blue-200/80 text-sm">
              Only you can tokenize your own content. YouTube uses OAuth authentication. Instagram, Twitter, and LinkedIn use FREE URL-based scraping - just paste your content URL!
            </p>
            <p className="text-yellow-300 text-xs mt-2">
              ⚠️ Note: Instagram requires login to view full content details. Basic info will be extracted from the URL.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default MultiPlatformSelector

