import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Youtube, 
  CheckCircle, 
  ExternalLink, 
  Users, 
  Play, 
  Eye, 
  ThumbsUp,
  Calendar,
  Globe,
  Copy,
  RefreshCw,
  AlertCircle
} from 'lucide-react'

interface YouTubeChannel {
  id: string
  title: string
  description: string
  thumbnailUrl: string
  subscriberCount: string
  videoCount: string
  viewCount: string
  customUrl?: string
}

interface YouTubeConnectionProps {
  onChannelConnected?: (channel: YouTubeChannel) => void
  className?: string
}

const YouTubeConnection: React.FC<YouTubeConnectionProps> = ({ 
  onChannelConnected, 
  className = '' 
}) => {
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [channel, setChannel] = useState<YouTubeChannel | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    checkConnection()
  }, [])

  const checkConnection = async () => {
    try {
      setIsLoading(true)
      
      // First check backend session (persistent cookie)
      try {
        const statusResponse = await fetch('http://localhost:5001/auth/youtube/status', {
          method: 'GET',
          credentials: 'include' // Include cookies
        })
        
        if (statusResponse.ok) {
          const statusData = await statusResponse.json()
          if (statusData.success && statusData.authenticated) {
            // Fetch full channel data from YouTube API using backend
            const channelResponse = await fetch('http://localhost:5001/auth/youtube/channel', {
              method: 'GET',
              credentials: 'include'
            })
            
            if (channelResponse.ok) {
              const channelData = await channelResponse.json()
              if (channelData.success && channelData.channel) {
                const realChannel: YouTubeChannel = {
                  id: channelData.channel.id,
                  title: channelData.channel.title,
                  description: channelData.channel.description || '',
                  thumbnailUrl: channelData.channel.thumbnailUrl || '',
                  subscriberCount: channelData.channel.subscribers?.toString() || '0',
                  videoCount: channelData.channel.videoCount?.toString() || '0',
                  viewCount: channelData.channel.viewCount?.toString() || '0',
                  customUrl: channelData.channel.customUrl
                }
                setChannel(realChannel)
                setIsConnected(true)
                if (onChannelConnected) {
                  onChannelConnected(realChannel)
                }
                return // Successfully connected via backend
              }
            }
          }
        }
      } catch (backendError) {
        console.warn('Backend session check failed, trying localStorage:', backendError)
      }
      
      // Fallback to localStorage (for backward compatibility)
      const authState = localStorage.getItem('youtube_auth_state')
      if (authState) {
        const parsed = JSON.parse(authState)
        if (parsed.channelId && parsed.accessToken) {
          // Fetch real channel data from YouTube API
          try {
            const channelResponse = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true', {
              headers: {
                'Authorization': `Bearer ${parsed.accessToken}`,
              },
            })

            if (channelResponse.ok) {
              const channelData = await channelResponse.json()
              if (channelData.items && channelData.items.length > 0) {
                const channel = channelData.items[0]
                const realChannel: YouTubeChannel = {
                  id: channel.id,
                  title: channel.snippet.title,
                  description: channel.snippet.description,
                  thumbnailUrl: channel.snippet.thumbnails.high?.url || channel.snippet.thumbnails.default?.url,
                  subscriberCount: channel.statistics.subscriberCount || '0',
                  videoCount: channel.statistics.videoCount || '0',
                  viewCount: channel.statistics.viewCount || '0',
                  customUrl: channel.snippet.customUrl
                }
                setChannel(realChannel)
                setIsConnected(true)
                if (onChannelConnected) {
                  onChannelConnected(realChannel)
                }
              }
            }
          } catch (apiError) {
            console.error('Error fetching real channel data:', apiError)
            // Fallback to stored data
            const fallbackChannel: YouTubeChannel = {
              id: parsed.channelId,
              title: parsed.channelName || 'Your Channel',
              description: 'Your channel description',
              thumbnailUrl: parsed.channelThumbnail || '',
              subscriberCount: '0',
              videoCount: '0',
              viewCount: '0'
            }
            setChannel(fallbackChannel)
            setIsConnected(true)
            if (onChannelConnected) {
              onChannelConnected(fallbackChannel)
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking connection:', error)
      setError('Failed to check YouTube connection')
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnect = async () => {
    setIsConnecting(true)
    try {
      // Use backend OAuth flow - explicitly send current origin
      const currentOrigin = window.location.origin
      const response = await fetch('http://localhost:5001/auth/youtube', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Origin': currentOrigin,
          'Referer': currentOrigin
        }
      })
      
      const data = await response.json()
      
      if (data.success && data.auth_url) {
        // Redirect to the auth URL from backend
        window.location.href = data.auth_url
      } else {
        throw new Error(data.error || 'Failed to get auth URL')
      }
    } catch (err) {
      console.error('Connection failed:', err)
      setError('Failed to connect to YouTube. Please try again.')
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      // Clear backend session
      await fetch('http://localhost:5001/auth/youtube/disconnect', {
        method: 'POST',
        credentials: 'include'
      }).catch(() => {}) // Ignore errors
      
      // Clear localStorage (backward compatibility)
      localStorage.removeItem('youtube_auth_state')
      
      setIsConnected(false)
      setChannel(null)
      setError(null)
    } catch (err) {
      console.error('Disconnect failed:', err)
    }
  }

  const handleCopyChannelId = () => {
    if (channel?.id) {
      navigator.clipboard.writeText(channel.id)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const formatNumber = (num: string) => {
    const number = parseInt(num)
    if (number >= 1000000) {
      return (number / 1000000).toFixed(1) + 'M'
    } else if (number >= 1000) {
      return (number / 1000).toFixed(1) + 'K'
    }
    return number.toLocaleString()
  }

  const getChannelUrl = (channel: YouTubeChannel) => {
    if (channel.customUrl) {
      return `https://youtube.com/@${channel.customUrl}`
    }
    return `https://youtube.com/channel/${channel.id}`
  }

  if (isConnected && channel) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`glass-morphism rounded-2xl p-6 ${className}`}
      >
        {/* Connected Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center">
              <Youtube className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">YouTube Creator</h3>
              <p className="text-green-400 text-sm flex items-center">
                <CheckCircle className="w-4 h-4 mr-1" />
                Connected
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={checkConnection}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleDisconnect}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
            >
              Disconnect
            </button>
          </div>
        </div>

        {/* Channel Info */}
        <div className="space-y-6">
          {/* Channel Details */}
          <div className="flex items-start space-x-4">
            <img
              src={channel.thumbnailUrl}
              alt={channel.title}
              className="w-20 h-20 rounded-xl object-cover"
            />
            <div className="flex-1">
              <h4 className="text-lg font-semibold text-white mb-2">{channel.title}</h4>
              <p className="text-gray-400 text-sm mb-3 line-clamp-2">{channel.description}</p>
              
              <div className="flex items-center space-x-4 text-sm text-gray-400">
                <div className="flex items-center space-x-1">
                  <Users className="w-4 h-4" />
                  <span>{formatNumber(channel.subscriberCount)} subscribers</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Play className="w-4 h-4" />
                  <span>{formatNumber(channel.videoCount)} videos</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Eye className="w-4 h-4" />
                  <span>{formatNumber(channel.viewCount)} views</span>
                </div>
              </div>
            </div>
          </div>

          {/* Channel Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-800 rounded-xl">
              <div className="text-2xl font-bold text-white mb-1">
                {formatNumber(channel.subscriberCount)}
              </div>
              <div className="text-gray-400 text-sm">Subscribers</div>
            </div>
            <div className="text-center p-4 bg-gray-800 rounded-xl">
              <div className="text-2xl font-bold text-white mb-1">
                {formatNumber(channel.videoCount)}
              </div>
              <div className="text-gray-400 text-sm">Videos</div>
            </div>
            <div className="text-center p-4 bg-gray-800 rounded-xl">
              <div className="text-2xl font-bold text-white mb-1">
                {formatNumber(channel.viewCount)}
              </div>
              <div className="text-gray-400 text-sm">Total Views</div>
            </div>
          </div>

          {/* Channel Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-700">
            <div className="flex items-center space-x-2">
              <span className="text-gray-400 text-sm">Channel ID:</span>
              <code className="bg-gray-800 px-2 py-1 rounded text-white text-sm">
                {channel.id}
              </code>
              <button
                onClick={handleCopyChannelId}
                className="p-1 text-gray-400 hover:text-white transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            
            <a
              href={getChannelUrl(channel)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>View Channel</span>
            </a>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`glass-morphism rounded-2xl p-8 text-center ${className}`}
    >
      {/* YouTube Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2 }}
        className="w-20 h-20 bg-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6"
      >
        <Youtube className="w-10 h-10 text-white" />
      </motion.div>

      {/* Title */}
      <h3 className="text-2xl font-bold text-white mb-2">YouTube Creator</h3>
      <p className="text-gray-400 mb-8">
        Connect your YouTube channel to see your real data.
      </p>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center space-x-2 bg-red-500/20 text-red-400 p-4 rounded-xl mb-6"
        >
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">{error}</span>
        </motion.div>
      )}

      {/* Connect Button */}
      <motion.button
        onClick={handleConnect}
        disabled={isConnecting || isLoading}
        className="w-full py-4 px-6 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold text-lg rounded-xl transition-all duration-300 hover:scale-105 disabled:scale-100 flex items-center justify-center space-x-2"
        whileHover={{ scale: isConnecting || isLoading ? 1 : 1.05 }}
        whileTap={{ scale: isConnecting || isLoading ? 1 : 0.95 }}
      >
        {isConnecting || isLoading ? (
          <>
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <Youtube className="w-5 h-5" />
            <span>Connect YouTube Channel</span>
          </>
        )}
      </motion.button>

      {/* Features List */}
      <div className="mt-8 space-y-3 text-left">
        <div className="flex items-center space-x-3 text-gray-400">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <span className="text-sm">Access your channel statistics</span>
        </div>
        <div className="flex items-center space-x-3 text-gray-400">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <span className="text-sm">View your video performance data</span>
        </div>
        <div className="flex items-center space-x-3 text-gray-400">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <span className="text-sm">Tokenize your best performing videos</span>
        </div>
        <div className="flex items-center space-x-3 text-gray-400">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <span className="text-sm">Earn from trading fees (85% share)</span>
        </div>
      </div>

      {/* Privacy Note */}
      <div className="mt-6 p-4 bg-gray-800/50 rounded-xl">
        <p className="text-xs text-gray-400">
          We only access your public channel data. Your private information remains secure and is never shared.
        </p>
      </div>
    </motion.div>
  )
}

export default YouTubeConnection
