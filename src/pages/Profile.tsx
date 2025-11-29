import React, { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  User, 
  Settings, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Plus,
  Copy,
  CheckCircle,
  ExternalLink,
  Play,
  Sparkles,
  Wallet,
  Eye
} from 'lucide-react'
import { useWallet } from '../contexts/WalletContext'
import { YouTubeIcon, TokenIcon, PetraWalletIcon } from '../assets/icons'
import PremiumBackground from '../components/PremiumBackground'

const BACKEND_URL = 'http://localhost:5001'

interface Token {
  asa_id: number
  token_name: string
  token_symbol: string
  total_supply: number
  current_price: number
  market_cap: number
  volume_24h: number
  holders: number
  price_change_24h: number
  created_at: string
  platform?: string
  content_url?: string
  content_thumbnail?: string
  youtube_channel_title?: string
  }

interface YouTubeChannel {
    id: string
  title: string
  description: string
  thumbnail: string
  subscriberCount: number
  viewCount: number
  videoCount: number
}

const Profile: React.FC = () => {
  const { isConnected, address, balance, connectWallet, isLoading } = useWallet()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [tokens, setTokens] = useState<Token[]>([])
  const [isLoadingTokens, setIsLoadingTokens] = useState(false)
  const [youtubeChannel, setYoutubeChannel] = useState<YouTubeChannel | null>(null)
  const [, setIsLoadingYouTube] = useState(false) // Used to track loading state
  const [isConnectingYouTube, setIsConnectingYouTube] = useState(false)
  const [copiedAddress, setCopiedAddress] = useState(false)
  const [linkedinFollowers, setLinkedinFollowers] = useState<number>(0)

  // Fetch user's tokens
  const fetchUserTokens = useCallback(async () => {
    if (!address) return

    setIsLoadingTokens(true)
    try {
      const response = await fetch(`${BACKEND_URL}/api/user-tokens/${address}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setTokens(data.tokens || [])
        }
      }
    } catch (error) {
      console.error('Error fetching user tokens:', error)
    } finally {
      setIsLoadingTokens(false)
    }
  }, [address])

  // Fetch YouTube channel info
  const fetchYouTubeChannel = useCallback(async () => {
    setIsLoadingYouTube(true)
    try {
      const response = await fetch(`${BACKEND_URL}/auth/youtube/channel`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const data = await response.json()
      if (data.success && data.channel) {
        setYoutubeChannel({
          id: data.channel.id,
          title: data.channel.title,
          description: data.channel.description || '',
          thumbnail: data.channel.thumbnail || '',
          subscriberCount: data.channel.subscriberCount || 0,
          viewCount: data.channel.viewCount || 0,
          videoCount: data.channel.videoCount || 0
        })
      } else {
        // Not authenticated or no channel - this is fine, YouTube is optional
        setYoutubeChannel(null)
      }
    } catch (error) {
      // Silently fail - YouTube connection is optional
      setYoutubeChannel(null)
    } finally {
      setIsLoadingYouTube(false)
    }
  }, [])

  useEffect(() => {
    if (address) {
      fetchUserTokens()
      fetchYouTubeChannel()
    }
  }, [address, fetchUserTokens, fetchYouTubeChannel])

  // Refresh YouTube channel after returning from OAuth callback
  useEffect(() => {
    const checkYouTubeConnection = () => {
      // Check if we just returned from YouTube OAuth (URL might have params)
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('code') || urlParams.get('state')) {
        // We're on the callback page, let YouTubeCallback handle it
        return
      }
      // Otherwise, refresh YouTube channel data
      if (address) {
        fetchYouTubeChannel()
      }
    }
    
    checkYouTubeConnection()
  }, [address, fetchYouTubeChannel])

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      setCopiedAddress(true)
      setTimeout(() => setCopiedAddress(false), 2000)
    }
  }

  const handleLaunchToken = () => {
    navigate('/tokenize')
  }

  const handleConnectYouTube = async () => {
    setIsConnectingYouTube(true)
    try {
      const response = await fetch(`${BACKEND_URL}/auth/youtube`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Origin': window.location.origin,
          'Referer': window.location.origin
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      if (data.success && data.auth_url) {
        // Redirect to Google OAuth - this will open Google login
        window.location.href = data.auth_url
        // Don't set loading to false here since we're redirecting
        return
      } else {
        console.error('Failed to get YouTube auth URL:', data.error)
        alert('Failed to initiate YouTube connection. Please try again.')
      }
    } catch (error) {
      console.error('Error connecting YouTube:', error)
      alert('Error connecting to YouTube. Please try again.')
    } finally {
      setIsConnectingYouTube(false)
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toLocaleString()
  }

  const formatPrice = (price: number) => {
    if (price < 0.01) return price.toFixed(6)
    if (price < 1) return price.toFixed(4)
    return price.toFixed(2)
  }

  const [earnings, setEarnings] = useState({
    totalEarned: 0,
    monthlyEarned: 0,
    tradingFees: 0,
    platformFees: 0,
    breakdown: [] as Array<{asa_id: number, token_name: string, token_symbol: string, creator_fee: number, trade_count: number}>
  })
  const [isLoadingEarnings, setIsLoadingEarnings] = useState(false)

  // Fetch real earnings from backend
  const fetchEarnings = useCallback(async () => {
    if (!address) return

    setIsLoadingEarnings(true)
    try {
      const response = await fetch(`${BACKEND_URL}/api/creator-earnings/${address}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setEarnings({
            totalEarned: data.total_earnings || 0,
            monthlyEarned: data.monthly_earnings || 0,
            tradingFees: data.trading_fees || 0,
            platformFees: data.platform_fees || 0,
            breakdown: data.breakdown || []
          })
        }
      }
    } catch (error) {
      console.error('Error fetching earnings:', error)
    } finally {
      setIsLoadingEarnings(false)
    }
  }, [address])

  useEffect(() => {
    if (address) {
      fetchUserTokens()
      fetchYouTubeChannel()
      fetchEarnings()
    }
  }, [address, fetchUserTokens, fetchYouTubeChannel, fetchEarnings])

  const activeTokens = tokens.length
  const totalSubscribers = youtubeChannel?.subscriberCount || 0
  const totalViews = youtubeChannel?.viewCount || 0
  
  // Fetch LinkedIn followers (if user has LinkedIn tokens)
  useEffect(() => {
    const fetchLinkedInFollowers = async () => {
      // Check if user has any LinkedIn tokens to get profile URL
      const linkedinToken = tokens.find(t => t.platform === 'linkedin' && t.content_url)
      if (linkedinToken?.content_url) {
        try {
          // Extract LinkedIn profile URL from post URL
          const profileMatch = linkedinToken.content_url.match(/linkedin\.com\/in\/([^/?]+)/)
          if (profileMatch) {
            const profileUrl = `https://www.linkedin.com/in/${profileMatch[1]}/`
            const response = await fetch(`${BACKEND_URL}/api/linkedin/profile`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ profile_url: profileUrl })
            })
            if (response.ok) {
              const data = await response.json()
              if (data.success && data.profile?.followers) {
                setLinkedinFollowers(data.profile.followers)
              }
            }
          }
        } catch (error) {
          console.error('Error fetching LinkedIn followers:', error)
        }
      }
    }
    
    if (tokens.length > 0) {
      fetchLinkedInFollowers()
    }
  }, [tokens])

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'tokens', label: 'My Tokens', icon: TokenIcon },
    { id: 'earnings', label: 'Earnings', icon: DollarSign },
    { id: 'settings', label: 'Settings', icon: Settings }
  ]

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Profile Header */}
      <motion.div 
        className="p-6 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
          <motion.div 
            className="relative"
            whileHover={{ scale: 1.05 }}
          >
            {youtubeChannel?.thumbnail ? (
              <img
                src={youtubeChannel.thumbnail}
                alt={youtubeChannel.title}
                className="w-24 h-24 rounded-2xl object-cover ring-2 ring-violet-500/50"
              />
            ) : (
              <div className="w-24 h-24 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-2xl flex items-center justify-center">
                <User className="w-12 h-12 text-white" />
              </div>
            )}
          </motion.div>
          
          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {youtubeChannel?.title || 'Creator Profile'}
                </h2>
                <p className="text-gray-400 mb-4 max-w-md">
                  {youtubeChannel?.description || 'Connect your YouTube channel to see your real data.'}
                </p>
                
                {/* YouTube Connection */}
                <div className="flex items-center space-x-4">
                  {youtubeChannel ? (
                    <>
                      <a 
                        href={`https://youtube.com/channel/${youtubeChannel.id}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:text-red-300 transition-colors"
                      >
                      <YouTubeIcon className="w-5 h-5" />
                      <span className="text-sm">YouTube Connected</span>
                        <CheckCircle className="w-4 h-4" />
                      </a>
                      <Link
                        to="/youtube/videos"
                        className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/30 text-violet-400 hover:text-violet-300 transition-colors"
                      >
                        <Play className="w-5 h-5" />
                        <span className="text-sm">View All Videos</span>
                      </Link>
                    </>
                  ) : (
                    <motion.button
                        onClick={handleConnectYouTube} 
                      disabled={isConnectingYouTube}
                      className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <YouTubeIcon className="w-5 h-5" />
                      <span className="text-sm">{isConnectingYouTube ? 'Connecting...' : 'Connect YouTube'}</span>
                    </motion.button>
                  )}
                </div>
              </div>
              
              <div className="mt-4 md:mt-0">
                <motion.button 
                  onClick={handleLaunchToken} 
                  className="px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl text-white font-semibold flex items-center"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Launch New Token
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid - Only show if YouTube connected */}
      {youtubeChannel ? (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Users, value: formatNumber(totalSubscribers), label: 'YouTube Subscribers', color: 'from-red-500 to-red-600' },
            { icon: Eye, value: totalViews > 0 ? formatNumber(totalViews) : '--', label: 'YouTube Views', color: 'from-blue-500 to-blue-600' },
            { icon: TrendingUp, value: activeTokens, label: 'Active Tokens', color: 'from-emerald-500 to-green-500' },
            { icon: DollarSign, value: `${formatNumber(earnings.totalEarned)} APTOS`, label: 'Total Earned', color: 'from-violet-500 to-fuchsia-500' }
          ].map((stat, index) => (
            <motion.div 
              key={stat.label}
              className="p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all text-center group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ scale: 1.02, y: -5 }}
            >
              <div className={`w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-r ${stat.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-6 h-6 text-white" />
        </div>
              <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-gray-400 text-sm">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.div 
          className="p-8 rounded-2xl bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <YouTubeIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Connect YouTube to Get Started</h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Connect your YouTube channel to view your real stats, tokenize your videos, and start earning from your content.
          </p>
          <motion.button
            onClick={handleConnectYouTube}
            disabled={isConnectingYouTube}
            className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 rounded-xl text-white font-semibold inline-flex items-center space-x-2 disabled:opacity-50"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <YouTubeIcon className="w-5 h-5" />
            <span>{isConnectingYouTube ? 'Connecting...' : 'Connect YouTube Channel'}</span>
          </motion.button>
        </motion.div>
      )}

      {/* Wallet Info */}
      <motion.div 
        className="p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Wallet className="w-5 h-5 mr-2 text-violet-400" />
          Wallet Information
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
            <span className="text-gray-400">Wallet Address</span>
            <div className="flex items-center space-x-2">
              <span className="text-white font-mono text-sm bg-white/10 px-3 py-1 rounded-lg">
                {address ? `${address.slice(0, 8)}...${address.slice(-6)}` : 'Not connected'}
              </span>
              {address && (
                <motion.button 
                  onClick={handleCopyAddress} 
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  title="Copy address"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {copiedAddress ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                <Copy className="w-4 h-4 text-gray-400" />
                  )}
                </motion.button>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
            <span className="text-gray-400">APTOS Balance</span>
            <span className="text-white font-semibold text-lg">{balance.toFixed(2)} <span className="text-violet-400">APTOS</span></span>
          </div>
        </div>
      </motion.div>
    </div>
  )

  const renderTokens = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-white">My Tokens</h3>
        {youtubeChannel && (
          <button onClick={handleLaunchToken} className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Launch New Token
        </button>
        )}
      </div>

      {!youtubeChannel ? (
        <motion.div 
          className="p-8 rounded-2xl bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <YouTubeIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Connect YouTube First</h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Connect your YouTube channel to tokenize your videos and create creator tokens.
          </p>
          <motion.button
            onClick={handleConnectYouTube}
            disabled={isConnectingYouTube}
            className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 rounded-xl text-white font-semibold inline-flex items-center space-x-2 disabled:opacity-50"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <YouTubeIcon className="w-5 h-5" />
            <span>{isConnectingYouTube ? 'Connecting...' : 'Connect YouTube'}</span>
          </motion.button>
        </motion.div>
      ) : isLoadingTokens ? (
        <div className="card text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading your tokens...</p>
        </div>
      ) : tokens.length === 0 ? (
        <div className="card text-center py-12">
          <TokenIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400 text-lg mb-4">No tokens created yet</p>
          <button onClick={handleLaunchToken} className="btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Launch Your First Token
          </button>
        </div>
      ) : (
      <div className="grid gap-4">
          {tokens.map((token) => (
            <div key={token.asa_id} className="card">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                  {token.content_thumbnail ? (
                    <img
                      src={token.content_thumbnail}
                      alt={token.token_name}
                      className="w-12 h-12 rounded-xl object-cover"
                    />
                  ) : (
                <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center">
                  <TokenIcon className="w-6 h-6 text-white" />
                </div>
                  )}
                <div className="min-w-0 flex-1">
                    <h4 className="text-lg font-semibold text-white truncate max-w-[200px]" title={token.token_name}>{token.token_name}</h4>
                    <p className="text-gray-400">${token.token_symbol}</p>
                </div>
              </div>
              
              <div className="text-right">
                  <div className="text-lg font-semibold text-white">
                    ${formatPrice(token.current_price)}
                  </div>
                  <div className={`text-sm ${token.price_change_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {token.price_change_24h >= 0 ? '+' : ''}{token.price_change_24h.toFixed(2)}%
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/10">
              <div className="text-center">
                <div className="text-gray-400 text-sm">Market Cap</div>
                  <div className="text-white font-semibold">${formatNumber(token.market_cap)}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400 text-sm">24h Volume</div>
                  <div className="text-white font-semibold">${formatNumber(token.volume_24h)}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400 text-sm">Holders</div>
                <div className="text-white font-semibold">{formatNumber(token.holders)}</div>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-4">
                <button 
                  onClick={() => navigate(`/trade/${token.token_symbol}`)}
                  className="btn-secondary flex-1"
                >
                <TrendingUp className="w-4 h-4 mr-2" />
                View Trading
              </button>
                {token.content_url && (
                  <a
                    href={token.content_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary flex-1 flex items-center justify-center"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Content
                  </a>
                )}
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  )

  const renderEarnings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
      <h3 className="text-2xl font-bold text-white">Earnings Overview</h3>
        {isLoadingEarnings && (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-violet-500"></div>
        )}
      </div>

      {!youtubeChannel ? (
        <motion.div 
          className="p-8 rounded-2xl bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <DollarSign className="w-16 h-16 text-violet-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Connect YouTube to Track Earnings</h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Connect your YouTube channel and create tokens to start earning from your content.
          </p>
          <motion.button
            onClick={handleConnectYouTube}
            disabled={isConnectingYouTube}
            className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 rounded-xl text-white font-semibold inline-flex items-center space-x-2 disabled:opacity-50"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <YouTubeIcon className="w-5 h-5" />
            <span>{isConnectingYouTube ? 'Connecting...' : 'Connect YouTube'}</span>
          </motion.button>
        </motion.div>
      ) : (
      <>
      {/* How It Works Info Card */}
      <div className="card bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20">
        <h4 className="text-lg font-semibold text-white mb-3">💰 How Earnings Work</h4>
        <div className="space-y-2 text-sm text-gray-300">
          <p>• <strong>Bonding Curve:</strong> When you create a token, it uses a bonding curve (like pump.fun)</p>
          <p>• <strong>Automatic Liquidity:</strong> No need to add liquidity manually - the bonding curve provides it</p>
          <p>• <strong>Trading Fees:</strong> You earn <strong className="text-green-400">5%</strong> of every buy/sell transaction</p>
          <p>• <strong>Platform Fee:</strong> <strong className="text-yellow-400">2%</strong> goes to the platform</p>
          <p>• <strong>Real Money:</strong> Earnings come from actual APTOS paid by traders when they buy your tokens</p>
        </div>
      </div>
      
      {/* Earnings Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card text-center">
          <DollarSign className="w-8 h-8 text-green-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">{formatNumber(earnings.totalEarned)} APTOS</div>
          <div className="text-gray-400 text-sm">Total Earned</div>
        </div>
        
        <div className="card text-center">
          <TrendingUp className="w-8 h-8 text-blue-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">{formatNumber(earnings.monthlyEarned)} APTOS</div>
          <div className="text-gray-400 text-sm">This Month</div>
        </div>
        
        <div className="card text-center">
          <Users className="w-8 h-8 text-purple-400 mx-auto mb-2" />
          <div className="text-2xl font-bold text-white">5%</div>
          <div className="text-gray-400 text-sm">Creator Fee</div>
        </div>
      </div>

      {/* Earnings Breakdown */}
      <div className="card">
        <h4 className="text-lg font-semibold text-white mb-4">Earnings Breakdown by Token</h4>
        <div className="space-y-4">
          {earnings.breakdown.length === 0 && !isLoadingEarnings && (
            <p className="text-gray-400 text-center py-4">No earnings yet. Launch tokens and get people trading to start earning!</p>
          )}
          {earnings.breakdown.map((item) => (
            <div key={item.asa_id} className="flex items-center justify-between py-2 border-b border-white/10 last:border-0">
              <div className="min-w-0 flex-1 mr-4">
                <span className="text-white font-medium truncate block max-w-[250px]" title={item.token_name}>{item.token_name}</span>
                <span className="text-gray-400 text-sm">({item.token_symbol}) • {item.trade_count} trades</span>
          </div>
              <span className="text-green-400 font-semibold">
                {formatNumber(item.creator_fee)} APTOS
              </span>
          </div>
          ))}
          {earnings.breakdown.length > 0 && (
          <div className="border-t border-white/10 pt-4">
            <div className="flex items-center justify-between">
                <span className="text-white font-semibold">Total Earnings</span>
                <span className="text-white font-bold text-lg">{formatNumber(earnings.totalEarned)} APTOS</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payout Information */}
      <div className="card">
        <h4 className="text-lg font-semibold text-white mb-4">Payout Information</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Next Payout</span>
            <span className="text-white">Monthly (1st of each month)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Minimum Payout</span>
            <span className="text-white">10 APTOS</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Payout Method</span>
            <span className="text-white">Direct to Wallet</span>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  )

  const renderSettings = () => (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-white">Settings</h3>
      
      {/* Wallet Settings */}
      <div className="card">
        <h4 className="text-lg font-semibold text-white mb-4">Wallet Settings</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
          <div>
              <div className="text-white font-medium">Petra Wallet</div>
              <div className="text-gray-400 text-sm">
                {address ? `${address.slice(0, 8)}...${address.slice(-6)}` : 'Not connected'}
              </div>
          </div>
            {isConnected ? (
              <button onClick={() => window.location.reload()} className="btn-secondary">
                Disconnect
              </button>
            ) : (
              <button onClick={connectWallet} className="btn-primary">
                <PetraWalletIcon className="w-4 h-4 mr-2" />
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Social Connections */}
      <div className="card">
        <h4 className="text-lg font-semibold text-white mb-4">Social Connections</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <YouTubeIcon className="w-6 h-6 text-red-500" />
              <div>
                <span className="text-white font-medium">YouTube</span>
                {youtubeChannel && (
                  <p className="text-gray-400 text-sm">{youtubeChannel.title}</p>
                )}
          </div>
            </div>
            {youtubeChannel ? (
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-green-400 text-sm">Connected</span>
          </div>
            ) : (
              <button 
                onClick={handleConnectYouTube}
                disabled={isConnectingYouTube}
                className="btn-secondary disabled:opacity-50"
              >
                {isConnectingYouTube ? 'Connecting...' : 'Connect'}
            </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] relative">
        <PremiumBackground variant="purple" />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <motion.div 
            className="text-center p-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.div 
              className="w-24 h-24 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-3xl flex items-center justify-center mx-auto mb-8"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <Wallet className="w-12 h-12 text-white" />
            </motion.div>
            <h2 className="text-4xl font-bold text-white mb-4">Connect Your Wallet</h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto text-lg">
            Connect your Petra wallet to access your creator profile and manage your tokens.
          </p>
            <motion.button 
            onClick={connectWallet}
            disabled={isLoading}
              className="px-8 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-2xl text-white font-bold text-lg disabled:opacity-50 flex items-center space-x-3 mx-auto"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
          >
              <PetraWalletIcon className="w-6 h-6" />
            <span>{isLoading ? 'Connecting...' : 'Connect Wallet'}</span>
            </motion.button>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative">
      <PremiumBackground variant="purple" />
      <div className="relative z-10 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-4">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span className="text-sm text-gray-300">Creator Dashboard</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
              Creator <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Profile</span>
          </h1>
            <p className="text-gray-400 text-lg">Manage your tokens, earnings, and social connections</p>
          </motion.div>

        {/* Tabs */}
          <motion.div 
            className="flex space-x-1 mb-8 bg-white/5 backdrop-blur-sm border border-white/10 p-1 rounded-2xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
                <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl transition-all duration-300 ${
                  activeTab === tab.id
                      ? 'bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 text-white border border-violet-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
                </motion.button>
            )
          })}
          </motion.div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'tokens' && renderTokens()}
          {activeTab === 'earnings' && renderEarnings()}
          {activeTab === 'settings' && renderSettings()}
        </motion.div>
        </div>
      </div>
    </div>
  )
}

export default Profile

