import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { 
  Search, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  BarChart3,
  Star, 
  Award,
  Eye,
  Heart,
  Share2,
  ExternalLink,
  Loader,
  AlertCircle,
  Sparkles,
  Wallet
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useWallet } from '../contexts/WalletContext'
import { PetraWalletIcon, YouTubeIcon, InstagramIcon, TwitterIcon, LinkedInIcon } from '../assets/icons'
import SVGBackground from '../components/SVGBackground'
import PremiumBackground from '../components/PremiumBackground'

interface CreatorToken {
  asa_id: number
  token_name: string
  token_symbol: string
  total_supply: number
  current_price: number
  market_cap: number
  holders: number
  volume_24h: number
  price_change_24h: number
  creator_address: string
  youtube_channel_title: string
  youtube_subscribers: number
  created_at: string
  platform?: string
  content_url?: string
  content_id?: string
  content_description?: string
  content_thumbnail?: string
}

const BACKEND_URL = 'http://localhost:5001'

const CreatorMarketplace: React.FC = () => {
  const { isConnected, address, connectWallet, isLoading } = useWallet()
  
  const [tokens, setTokens] = useState<CreatorToken[]>([])
  const [filteredTokens, setFilteredTokens] = useState<CreatorToken[]>([])
  const [isLoadingTokens, setIsLoadingTokens] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'market_cap' | 'price_change' | 'holders' | 'created_at'>('market_cap')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [platformFilter, setPlatformFilter] = useState<'all' | 'youtube' | 'instagram' | 'twitter' | 'linkedin'>('all')
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const fetchTokens = useCallback(async () => {
    try {
      setIsLoadingTokens(true)
      setError(null)
      
      const response = await fetch(`${BACKEND_URL}/tokens`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success) {
        setTokens(result.tokens || [])
        setError(null) // Clear error on success
        setRetryCount(0) // Reset retry count
        console.log('✅ Fetched tokens:', result.tokens?.length || 0)
      } else {
        throw new Error(result.error || 'Failed to fetch tokens')
      }
    } catch (error: any) {
      console.error('Error fetching tokens:', error)
      const errorMsg = error.message || 'Failed to connect to backend. Please ensure the server is running on http://localhost:5001'
      setError(errorMsg)
      
      // Show more helpful error message
      if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
        setError('Cannot connect to backend server. Please ensure the backend is running on http://localhost:5001')
      }
    } finally {
      setIsLoadingTokens(false)
    }
  }, [])

  useEffect(() => {
    fetchTokens()
  }, [fetchTokens])

  // Retry logic - separate effect to avoid dependency issues
  useEffect(() => {
    if (!error) return
    
    // Retry every 5 seconds if failed (max 3 retries)
    const interval = setInterval(() => {
      setRetryCount(prev => {
        if (prev < 3) {
          fetchTokens()
          return prev + 1
        }
        return prev
      })
    }, 5000)
    
    return () => clearInterval(interval)
  }, [error, fetchTokens])

  const filterAndSortTokens = useCallback(() => {
    let filtered = [...tokens]

    // Filter by platform
    if (platformFilter !== 'all') {
      filtered = filtered.filter(token => {
        const tokenPlatform = token.platform?.toLowerCase() || 'youtube'
        return tokenPlatform === platformFilter
      })
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(token => 
        token.token_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        token.token_symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        token.youtube_channel_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        token.content_description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Sort tokens
    filtered.sort((a, b) => {
      let aValue: number
      let bValue: number

    switch (sortBy) {
        case 'market_cap':
          aValue = a.market_cap
          bValue = b.market_cap
        break
        case 'price_change':
          aValue = a.price_change_24h
          bValue = b.price_change_24h
        break
        case 'holders':
          aValue = a.holders
          bValue = b.holders
        break
        case 'created_at':
          aValue = new Date(a.created_at).getTime()
          bValue = new Date(b.created_at).getTime()
        break
      default:
          aValue = a.market_cap
          bValue = b.market_cap
    }

    return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
  })

    setFilteredTokens(filtered)
  }, [tokens, searchQuery, sortBy, sortOrder, platformFilter])

  // Get platform counts
  const platformCounts = {
    all: tokens.length,
    youtube: tokens.filter(t => (t.platform?.toLowerCase() || 'youtube') === 'youtube').length,
    instagram: tokens.filter(t => t.platform?.toLowerCase() === 'instagram').length,
    twitter: tokens.filter(t => t.platform?.toLowerCase() === 'twitter').length,
    linkedin: tokens.filter(t => t.platform?.toLowerCase() === 'linkedin').length,
  }

  useEffect(() => {
    filterAndSortTokens()
  }, [filterAndSortTokens])

  // APTOS to USD conversion rate (approximate)
  const APTOS_TO_USD = 0.15

  const formatNumber = (num: number | null | undefined, isAlgo: boolean = false) => {
    // Handle invalid values
    if (num === null || num === undefined || isNaN(num) || num === 0) return '$0.00'
    
    // Ensure num is a valid number
    const validNum = Number(num)
    if (isNaN(validNum) || validNum === 0) return '$0.00'
    
    // Convert APTOS to USD if needed
    const usdValue = isAlgo ? validNum * APTOS_TO_USD : validNum
    
    // Ensure usdValue is valid
    if (isNaN(usdValue) || usdValue === 0) return '$0.00'
    
    // Format with appropriate suffix (only use B for values >= 1 billion)
    if (usdValue >= 1000000000) {
      return '$' + (usdValue / 1000000000).toFixed(2) + 'B'
    }
    if (usdValue >= 1000000) {
      return '$' + (usdValue / 1000000).toFixed(2) + 'M'
    }
    if (usdValue >= 1000) {
      return '$' + (usdValue / 1000).toFixed(2) + 'K'
    }
    // For values less than $1000, show 2 decimal places if less than $1, otherwise no decimals
    if (usdValue < 1) {
      return '$' + usdValue.toFixed(4)
    }
    return '$' + usdValue.toFixed(2)
  }

  const formatPrice = (price: number) => {
    if (price < 0.01) return price.toFixed(6)
    if (price < 1) return price.toFixed(4)
    return price.toFixed(2)
  }

  const getPriceChangeColor = (change: number) => {
    if (change > 0) return 'text-green-400'
    if (change < 0) return 'text-red-400'
    return 'text-gray-400'
  }

  const getPriceChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4" />
    if (change < 0) return <TrendingDown className="w-4 h-4" />
    return null
  }

  if (isLoadingTokens) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] relative">
        <PremiumBackground variant="purple" />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-2xl flex items-center justify-center mx-auto mb-6"
          >
            <Loader className="w-8 h-8 text-white" />
          </motion.div>
          <h2 className="text-2xl font-bold text-white mb-2">Loading Creator Tokens...</h2>
          <p className="text-gray-400">Fetching real tokens from the blockchain</p>
        </motion.div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] relative">
        <PremiumBackground variant="purple" />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md mx-auto px-4"
        >
            <div className="w-16 h-16 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Error Loading Tokens</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={fetchTokens}
              className="px-6 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-xl text-white font-bold"
          >
            Try Again
          </motion.button>
        </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] py-12 relative">
      <PremiumBackground variant="purple" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-6">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span className="text-sm text-gray-300">Multi-Platform Token Marketplace</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Creator <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Marketplace</span>
              </h1>
          <p className="text-gray-400 text-xl max-w-2xl mx-auto">
            Discover and trade tokens from YouTube, Instagram, Twitter/X, and LinkedIn creators. All tokens are backed by real verified content.
          </p>
        </motion.div>

        {/* Platform Filter Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex flex-wrap justify-center gap-3 mb-8"
        >
          {[
            { id: 'all', label: 'All Platforms', icon: <Sparkles className="w-4 h-4" />, color: 'violet' },
            { id: 'youtube', label: 'YouTube', icon: <YouTubeIcon className="w-4 h-4" />, color: 'red' },
            { id: 'instagram', label: 'Instagram', icon: <InstagramIcon className="w-4 h-4" />, color: 'pink' },
            { id: 'twitter', label: 'Twitter/X', icon: <TwitterIcon className="w-4 h-4" />, color: 'blue' },
            { id: 'linkedin', label: 'LinkedIn', icon: <LinkedInIcon className="w-4 h-4" />, color: 'sky' },
          ].map((platform) => (
            <motion.button
              key={platform.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setPlatformFilter(platform.id as any)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all ${
                platformFilter === platform.id
                  ? `bg-gradient-to-r from-${platform.color}-500 to-${platform.color}-600 text-white shadow-lg shadow-${platform.color}-500/25`
                  : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
              }`}
            >
              {platform.icon}
              <span>{platform.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                platformFilter === platform.id ? 'bg-white/20' : 'bg-white/10'
              }`}>
                {platformCounts[platform.id as keyof typeof platformCounts]}
              </span>
            </motion.button>
          ))}
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
        >
          <div className="card text-center">
            <BarChart3 className="w-8 h-8 text-blue-400 mx-auto mb-3" />
            <div className="text-3xl font-bold text-white mb-1">{tokens.length}</div>
            <div className="text-gray-400 text-sm">Active Tokens</div>
        </div>

          <div className="card text-center">
            <DollarSign className="w-8 h-8 text-green-400 mx-auto mb-3" />
            <div className="text-3xl font-bold text-white mb-1">
              {(() => {
                const totalMarketCapAlgo = tokens.reduce((sum, token) => {
                  // Calculate real-time market cap: current_price * total_supply (in APTOS)
                  const price = Number(token.current_price) || 0
                  const supply = Number(token.total_supply) || 0
                  const marketCapAlgo = price * supply
                  // Ensure we're not getting astronomical numbers
                  if (isNaN(marketCapAlgo) || marketCapAlgo < 0 || marketCapAlgo > 1000000000) {
                    return sum
                  }
                  return sum + marketCapAlgo
                }, 0)
                return formatNumber(totalMarketCapAlgo, true) // isAlgo = true, so convert to USD
              })()}
            </div>
            <div className="text-gray-400 text-sm">Total Market Cap</div>
          </div>
          
          <div className="card text-center">
            <Users className="w-8 h-8 text-purple-400 mx-auto mb-3" />
            <div className="text-3xl font-bold text-white mb-1">
              {tokens.reduce((sum, token) => sum + (token.holders || 0), 0).toLocaleString()}
            </div>
            <div className="text-gray-400 text-sm">Total Holders</div>
          </div>
          
          <div className="card text-center">
            <TrendingUp className="w-8 h-8 text-violet-400 mx-auto mb-3" />
            <div className="text-3xl font-bold text-white mb-1">
              {(() => {
                const totalVolume = tokens.reduce((sum, token) => {
                  const volume = Number(token.volume_24h) || 0
                  if (isNaN(volume) || volume < 0 || volume > 1000000000) {
                    return sum
                  }
                  return sum + volume
                }, 0)
                return formatNumber(totalVolume, true) // isAlgo = true, so convert to USD
              })()}
            </div>
            <div className="text-gray-400 text-sm">24h Volume</div>
          </div>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card mb-8"
        >
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search tokens, creators, or channels..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>

            {/* Sort */}
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:border-primary-500"
              >
                <option value="market_cap">Market Cap</option>
                <option value="price_change">Price Change</option>
                <option value="holders">Holders</option>
                <option value="created_at">Newest</option>
              </select>
              
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white hover:bg-white/10 transition-colors"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Tokens Grid */}
        {filteredTokens.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-24 h-24 bg-gradient-to-r from-gray-500 to-gray-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <BarChart3 className="w-12 h-12 text-white" />
        </div>
            <h3 className="text-2xl font-bold text-white mb-4">No Tokens Found</h3>
            <p className="text-gray-400 mb-6">
              {searchQuery 
                ? `No tokens match "${searchQuery}". Try a different search term.`
                : "No creator tokens have been launched yet. Be the first to create one!"
              }
            </p>
            {!searchQuery && (
              <Link
                to="/tokenize"
                className="btn-primary inline-flex items-center space-x-2"
              >
                <Star className="w-5 h-5" />
                <span>Tokenize Content</span>
              </Link>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTokens.map((token, index) => (
              <motion.div
                key={token.asa_id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="card hover:border-primary-500/50 transition-all cursor-pointer group"
                    >
                {/* Token Header - Name Prominently Displayed */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="w-14 h-14 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                      {token.token_symbol.substring(0, 2)}
                          </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <h3 className="text-xl font-black text-white mb-1 truncate" title={token.token_name}>{token.token_name}</h3>
                        <p className="text-violet-400 font-semibold text-sm">${token.token_symbol}</p>
                      </div>
        </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-white">${formatPrice(token.current_price)}</div>
                    <div className={`text-sm flex items-center justify-end space-x-1 ${getPriceChangeColor(token.price_change_24h)}`}>
                      {getPriceChangeIcon(token.price_change_24h)}
                      <span>{token.price_change_24h > 0 ? '+' : ''}{token.price_change_24h.toFixed(2)}%</span>
                    </div>
                  </div>
                </div>

                {/* Content Preview */}
                {token.content_thumbnail && (
                  <div className="mb-4 rounded-lg overflow-hidden">
                    <img 
                      src={token.content_thumbnail} 
                      alt={token.token_name}
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  </div>
                )}
                
                {/* Content Description */}
                {token.content_description && (
                  <div className="mb-4 p-3 bg-white/5 rounded-lg">
                    <p className="text-gray-300 text-sm line-clamp-2">{token.content_description}</p>
                  </div>
                )}

                {/* Creator Info */}
                <div className="flex items-center space-x-3 mb-4 p-3 bg-white/5 rounded-lg">
                  {token.platform === 'youtube' ? (
                    <YouTubeIcon className="w-5 h-5 text-red-500" />
                  ) : token.platform === 'instagram' ? (
                    <InstagramIcon className="w-5 h-5 text-pink-500" />
                  ) : token.platform === 'twitter' ? (
                    <TwitterIcon className="w-5 h-5 text-blue-400" />
                  ) : token.platform === 'linkedin' ? (
                    <LinkedInIcon className="w-5 h-5 text-blue-600" />
                  ) : (
                  <YouTubeIcon className="w-5 h-5 text-red-500" />
                  )}
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="text-white font-semibold text-sm truncate" title={token.youtube_channel_title || token.token_name}>
                      {token.youtube_channel_title || token.token_name}
                    </p>
                    {token.youtube_subscribers > 0 && (
                    <p className="text-gray-400 text-xs">{formatNumber(token.youtube_subscribers)} subscribers</p>
                    )}
                    {token.platform && token.platform !== 'youtube' && (
                      <p className="text-gray-400 text-xs capitalize">{token.platform} Content</p>
                    )}
                </div>
              </div>

              {/* Metrics */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 bg-white/5 rounded-lg">
                    <div className="text-lg font-bold text-white">
                      {(() => {
                        const price = Number(token.current_price) || 0
                        const supply = Number(token.total_supply) || 0
                        const marketCapAlgo = price * supply
                        if (isNaN(marketCapAlgo) || marketCapAlgo < 0 || marketCapAlgo > 1000000000) {
                          return '$0.00'
                        }
                        return formatNumber(marketCapAlgo, true) // isAlgo = true, convert to USD
                      })()}
                    </div>
                    <div className="text-gray-400 text-xs">Market Cap</div>
                  </div>
                  <div className="text-center p-3 bg-white/5 rounded-lg">
                    <div className="text-lg font-bold text-white">{(token.holders || 0).toLocaleString()}</div>
                    <div className="text-gray-400 text-xs">Holders</div>
                  </div>
                  </div>

                {/* Content Link */}
                {token.content_url && (
                  <div className="mb-4">
                    <a 
                      href={token.content_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-400 hover:text-primary-300 text-sm flex items-center space-x-1"
                    >
                      <span>View Original Content</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                )}

                {/* Actions */}
                <div className="flex space-x-2">
                  <Link 
                    to={`/creator/${token.asa_id}`} 
                    className="btn-secondary flex-1 text-sm text-center"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Link>
                  <Link 
                    to={`/trade/${token.token_symbol?.trim() || token.token_symbol}`} 
                    className="btn-primary flex-1 text-sm"
                  >
                    <BarChart3 className="w-4 h-4 mr-1" />
                    Trade {token.token_symbol}
                  </Link>
                  </div>

                {/* ASA ID */}
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Token ID: {token.token_id || token.asa_id}</span>
                    <a 
                      href={`https://explorer.aptoslabs.com/object/${String(token.asa_id || token.token_id || '')}?network=testnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-blue-400 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
              </div>
            </motion.div>
            ))}
          </div>
        )}

        {/* Launch Token CTA */}
        {tokens.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-center mt-12"
          >
            <div className="card bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border-violet-500/30">
              <h3 className="text-2xl font-bold text-white mb-4">Ready to Tokenize Your Content?</h3>
              <p className="text-gray-400 mb-6">
                Create tokens from your YouTube videos, Instagram Reels, Twitter posts, or LinkedIn content
              </p>
              <div className="flex flex-wrap justify-center gap-3 mb-6">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 rounded-lg">
                  <YouTubeIcon className="w-4 h-4 text-red-400" />
                  <span className="text-red-300 text-sm">YouTube</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-pink-500/20 rounded-lg">
                  <InstagramIcon className="w-4 h-4 text-pink-400" />
                  <span className="text-pink-300 text-sm">Instagram</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 rounded-lg">
                  <TwitterIcon className="w-4 h-4 text-blue-400" />
                  <span className="text-blue-300 text-sm">Twitter/X</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-sky-500/20 rounded-lg">
                  <LinkedInIcon className="w-4 h-4 text-sky-400" />
                  <span className="text-sky-300 text-sm">LinkedIn</span>
                </div>
              </div>
              <Link
                to="/tokenize"
                className="btn-primary inline-flex items-center space-x-2"
              >
                <Star className="w-5 h-5" />
                <span>Tokenize Your Content</span>
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

export default CreatorMarketplace
