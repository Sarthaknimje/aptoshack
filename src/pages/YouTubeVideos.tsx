import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Youtube, 
  CheckCircle, 
  XCircle, 
  ExternalLink,
  Coins,
  RefreshCw,
  Loader,
  Play,
  Eye,
  Calendar,
  Sparkles
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../contexts/WalletContext'
import PremiumBackground from '../components/PremiumBackground'

interface YouTubeVideo {
  id: string
  title: string
  description: string
  thumbnail: string
  publishedAt: string
  url: string
  isTokenized: boolean
  tokenInfo?: {
    asa_id: number
    token_name: string
    token_symbol: string
  }
}

const YouTubeVideos: React.FC = () => {
  const navigate = useNavigate()
  const { isConnected, address } = useWallet()
  const [videos, setVideos] = useState<YouTubeVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [channel, setChannel] = useState<any>(null)
  const [filter, setFilter] = useState<'all' | 'tokenized' | 'not-tokenized'>('all')

  useEffect(() => {
    fetchVideos()
  }, [])

  const fetchVideos = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('http://localhost:5001/api/youtube/videos')
      const data = await response.json()
      
      if (data.success) {
        setVideos(data.videos || [])
        setChannel(data.channel)
      } else {
        // Check if it's a quota error
        if (data.quotaExceeded || data.error?.includes('quota')) {
          setError('YouTube API quota exceeded. Using cached data. Please try again later.')
        } else {
          setError(data.error || 'Failed to fetch videos')
        }
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to fetch videos'
      if (errorMsg.includes('quota') || errorMsg.includes('403')) {
        setError('YouTube API quota exceeded. Please try again later or refresh the page.')
      } else {
        setError(errorMsg)
      }
    } finally {
      setLoading(false)
    }
  }

  const filteredVideos = videos.filter(video => {
    if (filter === 'tokenized') return video.isTokenized
    if (filter === 'not-tokenized') return !video.isTokenized
    return true
  })

  const handleTokenize = (video: YouTubeVideo) => {
    navigate(`/tokenize?platform=youtube&url=${encodeURIComponent(video.url)}`)
  }

  const handleViewToken = (video: YouTubeVideo) => {
    if (video.tokenInfo) {
      navigate(`/trade/${video.tokenInfo.token_symbol}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] relative">
        <PremiumBackground variant="default" />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4"
            >
              <Loader className="w-8 h-8 text-white" />
            </motion.div>
            <p className="text-gray-400 text-lg">Loading your YouTube videos...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] relative">
        <PremiumBackground variant="default" />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Error Loading Videos</h2>
            <p className="text-gray-400 mb-6">{error}</p>
            <motion.button
              onClick={fetchVideos}
              className="px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl text-white font-semibold flex items-center mx-auto"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </motion.button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6 relative">
      <PremiumBackground variant="default" />
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-6">
            <Sparkles className="w-4 h-4 text-red-400" />
            <span className="text-sm text-gray-300">YouTube Content</span>
          </div>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center space-x-4">
              <motion.div 
                className="bg-gradient-to-r from-red-500 to-orange-500 p-3 rounded-2xl"
                whileHover={{ scale: 1.05 }}
              >
                <Youtube className="w-8 h-8 text-white" />
              </motion.div>
              <div>
                <h1 className="text-3xl font-bold text-white">Your YouTube <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">Videos</span></h1>
                {channel && (
                  <p className="text-gray-400">{channel.title} • {channel.subscriberCount.toLocaleString()} subscribers</p>
                )}
              </div>
            </div>
            <motion.button
              onClick={fetchVideos}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition-colors flex items-center"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </motion.button>
          </div>

          {/* Filters */}
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-primary-500 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              All ({videos.length})
            </button>
            <button
              onClick={() => setFilter('tokenized')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'tokenized'
                  ? 'bg-primary-500 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              Tokenized ({videos.filter(v => v.isTokenized).length})
            </button>
            <button
              onClick={() => setFilter('not-tokenized')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'not-tokenized'
                  ? 'bg-primary-500 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              Not Tokenized ({videos.filter(v => !v.isTokenized).length})
            </button>
          </div>
        </motion.div>

        {/* Videos Grid */}
        {filteredVideos.length === 0 ? (
          <div className="text-center py-12">
            <Youtube className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No videos found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredVideos.map((video, index) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/5 backdrop-blur-lg rounded-xl overflow-hidden border border-white/10 hover:border-primary-500/50 transition-all group"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-gray-800">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <a
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white/20 backdrop-blur-sm p-3 rounded-full hover:bg-white/30 transition-colors"
                    >
                      <Play className="w-6 h-6 text-white" />
                    </a>
                  </div>
                  {video.isTokenized && (
                    <div className="absolute top-2 right-2 bg-green-500/90 backdrop-blur-sm px-2 py-1 rounded-full flex items-center space-x-1">
                      <CheckCircle className="w-4 h-4 text-white" />
                      <span className="text-xs font-medium text-white">Tokenized</span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="text-white font-semibold mb-2 line-clamp-2 group-hover:text-primary-400 transition-colors">
                    {video.title}
                  </h3>
                  
                  <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(video.publishedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Token Info */}
                  {video.isTokenized && video.tokenInfo && (
                    <div className="mb-4 p-3 bg-primary-500/10 border border-primary-500/30 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-violet-400 font-medium text-sm">{video.tokenInfo.token_symbol}</p>
                          <p className="text-gray-400 text-xs truncate" title={video.tokenInfo.token_name}>{video.tokenInfo.token_name}</p>
                        </div>
                        <button
                          onClick={() => handleViewToken(video)}
                          className="btn-primary text-xs px-3 py-1"
                        >
                          <Coins className="w-3 h-3 mr-1" />
                          Trade
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex space-x-2">
                    {!video.isTokenized ? (
                      <button
                        onClick={() => handleTokenize(video)}
                        className="btn-primary flex-1 text-sm"
                      >
                        <Coins className="w-4 h-4 mr-2" />
                        Tokenize
                      </button>
                    ) : (
                      <button
                        onClick={() => handleViewToken(video)}
                        className="btn-primary flex-1 text-sm"
                      >
                        <Coins className="w-4 h-4 mr-2" />
                        View Token
                      </button>
                    )}
                    <a
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary px-3"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default YouTubeVideos

