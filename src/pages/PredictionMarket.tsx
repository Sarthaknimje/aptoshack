import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  TrendingUp, 
  TrendingDown,
  Clock,
  Target,
  DollarSign,
  Users,
  BarChart3,
  Plus,
  CheckCircle,
  XCircle,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Sparkles,
  Zap,
  Trophy,
  AlertCircle,
  Loader,
  ExternalLink,
  RefreshCw,
  Play,
  Calendar,
  Activity,
  Globe,
  Coins,
  ArrowRight
} from 'lucide-react'
import { useWallet } from '../contexts/WalletContext'
// Note: sendAlgoPaymentWithPetra removed - use contract-based functions instead
// import { buyTokensWithContract } from '../services/petraWalletService'
import PremiumBackground from '../components/PremiumBackground'
import { YouTubeIcon, InstagramIcon, TwitterIcon, LinkedInIcon } from '../assets/icons'

interface Prediction {
  prediction_id: string
  creator_address: string
  content_url: string
  platform: string
  metric_type: string
  target_value: number
  timeframe_hours: number
  end_time: string
  yes_pool: number
  no_pool: number
  status: string
  outcome?: string
  initial_value: number
  final_value?: number
  created_at: string
  current_value?: number
  yes_odds?: number
  no_odds?: number
  time_remaining_hours?: number
  thumbnail?: string
}

const BACKEND_URL = 'http://localhost:5001'

const PredictionMarket: React.FC = () => {
  const { isConnected, address, connectWallet, petraWallet } = useWallet()
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [allPredictions, setAllPredictions] = useState<Prediction[]>([])
  const [loading, setLoading] = useState(true)
  const [platformFilter, setPlatformFilter] = useState<'all' | 'youtube' | 'instagram' | 'twitter' | 'linkedin'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'resolved'>('all')
  const [sortBy, setSortBy] = useState<'trending' | 'liquidity' | 'newest' | 'oldest'>('trending')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedPrediction, setSelectedPrediction] = useState<Prediction | null>(null)
  const [showTradeModal, setShowTradeModal] = useState(false)
  const [tradeSide, setTradeSide] = useState<'YES' | 'NO'>('YES')
  const [tradeAmount, setTradeAmount] = useState('')
  const [trading, setTrading] = useState(false)
  const [tradeSuccess, setTradeSuccess] = useState<{show: boolean, message: string, txId?: string} | null>(null)
  const [tradeError, setTradeError] = useState<string | null>(null)
  
  // Create prediction form
  const [createForm, setCreateForm] = useState({
    content_url: '',
    platform: 'youtube' as 'youtube' | 'instagram' | 'twitter' | 'linkedin',
    metric_type: 'likes' as 'likes' | 'comments' | 'views' | 'shares' | 'reposts',
    target_value: '',
    timeframe_hours: '24'
  })
  const [creating, setCreating] = useState(false)
  const [createSuccess, setCreateSuccess] = useState<{show: boolean, message: string} | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [userTokens, setUserTokens] = useState<any[]>([])
  const [showTokenSelectModal, setShowTokenSelectModal] = useState(false)
  const [createFromToken, setCreateFromToken] = useState(false)
  const [userWinnings, setUserWinnings] = useState<any[]>([])
  const [claiming, setClaiming] = useState<string | null>(null)

  useEffect(() => {
    fetchPredictions()
    if (isConnected && address) {
      fetchUserTokens()
      fetchUserWinnings()
    }
    // Refresh every 10 seconds for real-time updates
    const interval = setInterval(() => {
      fetchPredictions()
      if (isConnected && address) {
        fetchUserWinnings()
      }
    }, 10000)
    return () => clearInterval(interval)
  }, [isConnected, address])

  const fetchUserWinnings = async () => {
    if (!address) return
    try {
      const response = await fetch(`${BACKEND_URL}/api/predictions/winnings/${address}`)
      const data = await response.json()
      if (data.success) {
        setUserWinnings(data.winnings || [])
      }
    } catch (error) {
      console.error('Error fetching winnings:', error)
    }
  }

  const handleClaimWinnings = async (tradeId: string, payoutAmount: number) => {
    if (!address || !petraWallet) {
      setTradeError('Please connect your wallet first')
      return
    }

    setClaiming(tradeId)
    setTradeError(null)
    try {
      const response = await fetch(`${BACKEND_URL}/api/predictions/claim/${tradeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          winner_address: address
        })
      })

      const data = await response.json()
      if (data.success) {
        setTradeSuccess({
          show: true,
          message: `✅ Claimed ${payoutAmount.toFixed(4)} APTOS! Payment sent to your wallet.`,
          txId: data.txid
        })
        setTimeout(() => {
          setTradeSuccess(null)
          fetchUserWinnings()
        }, 3000)
      } else {
        setTradeError(data.error || 'Failed to claim winnings')
      }
    } catch (error: any) {
      setTradeError(`Claim failed: ${error.message}`)
    } finally {
      setClaiming(null)
    }
  }

  const fetchUserTokens = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/user-tokens/${address}`)
      const data = await response.json()
      if (data.success) {
        setUserTokens(data.tokens || [])
      }
    } catch (error) {
      console.error('Error fetching user tokens:', error)
    }
  }

  const fetchPredictions = async () => {
    try {
      // Fetch ALL predictions (active + resolved)
      const response = await fetch(`${BACKEND_URL}/api/predictions?status=all`)
      const data = await response.json()
      if (data.success) {
        // Fetch detailed data for each prediction with real-time metrics
        const detailed = await Promise.all(
          data.predictions.map(async (p: Prediction) => {
            try {
              const detailRes = await fetch(`${BACKEND_URL}/api/predictions/${p.prediction_id}`)
              const detailData = await detailRes.json()
              if (detailData.success) {
                const pred = detailData.prediction
                
                // Fetch thumbnail from content URL
                let thumbnail = ''
                try {
                  if (pred.platform === 'youtube') {
                    // Extract video ID from various YouTube URL formats
                    const url = pred.content_url
                    let videoId = ''
                    if (url.includes('v=')) {
                      videoId = url.split('v=')[1]?.split('&')[0] || ''
                    } else if (url.includes('youtu.be/')) {
                      videoId = url.split('youtu.be/')[1]?.split('?')[0] || ''
                    } else if (url.includes('youtube.com/embed/')) {
                      videoId = url.split('youtube.com/embed/')[1]?.split('?')[0] || ''
                    }
                    if (videoId) {
                      thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
                    }
                  } else {
                    // For other platforms, try to get from token if exists
                    const tokenRes = await fetch(`${BACKEND_URL}/tokens`)
                    const tokenData = await tokenRes.json()
                    if (tokenData.success) {
                      const matchingToken = tokenData.tokens?.find((t: any) => 
                        t.content_url === pred.content_url || 
                        t.content_id === pred.content_url.split('/').pop()
                      )
                      if (matchingToken?.content_thumbnail) {
                        thumbnail = matchingToken.content_thumbnail
                      }
                    }
                  }
                } catch (e) {
                  // Thumbnail fetch failed, continue without it
                }
                
                // Check if target is met - auto-resolve
                if (pred.current_value >= pred.target_value && (pred.status === 'active' || pred.status === 'resolving')) {
                  try {
                    const resolveRes = await fetch(`${BACKEND_URL}/api/predictions/${p.prediction_id}/resolve`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' }
                    })
                    const resolveData = await resolveRes.json()
                    if (resolveData.success) {
                      setTimeout(fetchPredictions, 2000)
                    }
                  } catch (e) {
                    console.error('Auto-resolve error:', e)
                  }
                }
                
                return { ...pred, thumbnail }
              }
              return p
            } catch {
              return p
            }
          })
        )
        setAllPredictions(detailed)
        filterAndSortPredictions(detailed)
      }
    } catch (error) {
      console.error('Error fetching predictions:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortPredictions = (preds: Prediction[]) => {
    let filtered = [...preds]

    // Filter by platform
    if (platformFilter !== 'all') {
      filtered = filtered.filter(p => p.platform === platformFilter)
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter)
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'trending':
          // Most trades/activity (pool size)
          const aLiquidity = (a.yes_pool || 0) + (a.no_pool || 0)
          const bLiquidity = (b.yes_pool || 0) + (b.no_pool || 0)
          return bLiquidity - aLiquidity
        case 'liquidity':
          // Highest total pool
          const aTotal = (a.yes_pool || 0) + (a.no_pool || 0)
          const bTotal = (b.yes_pool || 0) + (b.no_pool || 0)
          return bTotal - aTotal
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        default:
          return 0
      }
    })

    setPredictions(filtered)
  }

  useEffect(() => {
    filterAndSortPredictions(allPredictions)
  }, [platformFilter, statusFilter, sortBy, allPredictions])

  const handleCreatePrediction = async () => {
    if (!isConnected || !address) {
      setCreateError('Please connect your wallet first')
      return
    }

    if (!createForm.content_url || !createForm.target_value) {
      setCreateError('Please fill all required fields')
      return
    }

    setCreating(true)
    setCreateError(null)
    try {
      const response = await fetch(`${BACKEND_URL}/api/predictions/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creator_address: address,
          content_url: createForm.content_url,
          platform: createForm.platform,
          metric_type: createForm.metric_type,
          target_value: parseFloat(createForm.target_value),
          timeframe_hours: parseInt(createForm.timeframe_hours)
        })
      })

      const data = await response.json()
      if (data.success) {
        setCreateSuccess({
          show: true,
          message: `✅ Prediction market created! ID: ${data.prediction.prediction_id}`
        })
        setShowCreateModal(false)
        setCreateForm({
          content_url: '',
          platform: 'youtube',
          metric_type: 'likes',
          target_value: '',
          timeframe_hours: '24'
        })
        setTimeout(() => {
          setCreateSuccess(null)
          fetchPredictions()
        }, 3000)
      } else {
        setCreateError(data.error || 'Failed to create prediction')
      }
    } catch (error: any) {
      setCreateError(`Error: ${error.message}`)
    } finally {
      setCreating(false)
    }
  }

  const handleTrade = async () => {
    if (!isConnected || !address || !selectedPrediction || !petraWallet) {
      setTradeError('Please connect your wallet first')
      return
    }

    const amount = parseFloat(tradeAmount)
    if (isNaN(amount) || amount <= 0) {
      setTradeError('Please enter a valid amount greater than 0')
      return
    }

    setTrading(true)
    setTradeError(null)
    try {
      // First, create the trade record
      const response = await fetch(`${BACKEND_URL}/api/predictions/${selectedPrediction.prediction_id}/trade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trader_address: address,
          side: tradeSide,
          amount: amount
        })
      })

      const data = await response.json()
      if (data.success) {
        // Payment is handled by backend service
        // For predictions, we use backend service which handles the payment logic
        try {
          const txId = data.transaction_id || 'prediction_pending'

          setTradeSuccess({
            show: true,
            message: `✅ Trade placed! ${tradeSide} ${amount} APTOS at ${data.trade.odds}x odds`,
            txId: txId
          })
          setShowTradeModal(false)
          setTradeAmount('')
          setTimeout(() => {
            setTradeSuccess(null)
            fetchPredictions()
          }, 3000)
        } catch (walletError: any) {
          console.error('Wallet error:', walletError)
          
          // Handle network mismatch error specifically
          if (walletError?.name === 'NetworkMismatchError' || walletError?.message?.includes('Network mismatch') || walletError?.message?.includes('different networks')) {
            setTradeError('⚠️ Network Mismatch!\n\nPlease ensure your Petra Wallet is set to TESTNET.\n\nTo fix:\n1. Open Petra Wallet app\n2. Go to Settings\n3. Switch to Testnet\n4. Try again')
          } else {
            setTradeError(`Wallet error: ${walletError.message}`)
          }
        }
      } else {
        setTradeError(data.error || 'Failed to place trade')
      }
    } catch (error: any) {
      setTradeError(`Trade failed: ${error.message}`)
    } finally {
      setTrading(false)
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K'
    return num.toLocaleString()
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'youtube': return <YouTubeIcon className="w-5 h-5 text-red-500" />
      case 'instagram': return <InstagramIcon className="w-5 h-5 text-pink-500" />
      case 'twitter': return <TwitterIcon className="w-5 h-5 text-blue-400" />
      case 'linkedin': return <LinkedInIcon className="w-5 h-5 text-blue-600" />
      default: return <Globe className="w-5 h-5 text-gray-400" />
    }
  }

  const getMetricIcon = (metric: string) => {
    switch (metric) {
      case 'likes': return <Heart className="w-4 h-4" />
      case 'comments': return <MessageCircle className="w-4 h-4" />
      case 'views': return <Eye className="w-4 h-4" />
      case 'shares': case 'reposts': return <Share2 className="w-4 h-4" />
      default: return <Activity className="w-4 h-4" />
    }
  }

  if (loading) {
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
            <h2 className="text-2xl font-bold text-white mb-2">Loading Prediction Markets...</h2>
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
            <span className="text-sm text-gray-300">Prediction Markets</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Predict <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Social Metrics</span>
          </h1>
          <p className="text-gray-400 text-xl max-w-2xl mx-auto mb-6">
            Trade on whether content will reach target metrics. Real-time odds, automatic payouts.
          </p>
          {!isConnected && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={connectWallet}
              className="px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl text-white font-semibold"
            >
              Connect Wallet to Trade
            </motion.button>
          )}
        </motion.div>

        {/* Filters & Sort - At Top */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <div className="card p-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Platform Filter */}
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm">Platform:</span>
                <div className="flex gap-2">
                  {(['all', 'youtube', 'instagram', 'twitter', 'linkedin'] as const).map((platform) => (
                    <motion.button
                      key={platform}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setPlatformFilter(platform)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        platformFilter === platform
                          ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      {platform === 'all' ? 'All' : platform.charAt(0).toUpperCase() + platform.slice(1)}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm">Status:</span>
                <div className="flex gap-2">
                  {(['all', 'active', 'resolved'] as const).map((status) => (
                    <motion.button
                      key={status}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setStatusFilter(status)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        statusFilter === status
                          ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-gray-400 text-sm">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
                >
                  <option value="trending">🔥 Trending</option>
                  <option value="liquidity">💰 Most Liquid</option>
                  <option value="newest">🆕 Newest</option>
                  <option value="oldest">⏰ Oldest</option>
                </select>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Create Buttons */}
        {isConnected && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-6 flex flex-wrap justify-center gap-4"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setCreateFromToken(false)
                setShowCreateModal(true)
              }}
              className="px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl text-white font-semibold flex items-center gap-2 shadow-lg shadow-violet-500/25"
            >
              <Plus className="w-5 h-5" />
              <span>Create from URL</span>
            </motion.button>
            {userTokens.length > 0 && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowTokenSelectModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl text-white font-semibold flex items-center gap-2 shadow-lg shadow-blue-500/25"
              >
                <Coins className="w-5 h-5" />
                <span>Create from My Tokens ({userTokens.length})</span>
              </motion.button>
            )}
          </motion.div>
        )}

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
        >
          <div className="card text-center">
            <BarChart3 className="w-8 h-8 text-violet-400 mx-auto mb-3" />
            <div className="text-3xl font-bold text-white mb-1">{predictions.length}</div>
            <div className="text-gray-400 text-sm">Markets</div>
          </div>
          <div className="card text-center">
            <DollarSign className="w-8 h-8 text-green-400 mx-auto mb-3" />
            <div className="text-3xl font-bold text-white mb-1">
              {formatNumber(predictions.reduce((sum, p) => sum + (p.yes_pool || 0) + (p.no_pool || 0), 0))}
            </div>
            <div className="text-gray-400 text-sm">Total Pool (APTOS)</div>
          </div>
          <div className="card text-center">
            <Users className="w-8 h-8 text-blue-400 mx-auto mb-3" />
            <div className="text-3xl font-bold text-white mb-1">
              {predictions.filter(p => p.status === 'active').length}
            </div>
            <div className="text-gray-400 text-sm">Active</div>
          </div>
          <div className="card text-center">
            <Trophy className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
            <div className="text-3xl font-bold text-white mb-1">
              {predictions.filter(p => p.status === 'resolved').length}
            </div>
            <div className="text-gray-400 text-sm">Resolved</div>
          </div>
        </motion.div>

        {/* Predictions Grid - YouTube Style Compact */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {predictions.map((prediction, index) => (
            <motion.div
              key={prediction.prediction_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -2 }}
              className="bg-white/5 backdrop-blur-lg rounded-xl overflow-hidden border border-white/10 hover:border-violet-500/50 transition-all group"
            >
              {/* Thumbnail - YouTube style (16:9) */}
              <div className="relative aspect-video bg-gray-800">
                {prediction.thumbnail ? (
                  <img
                    src={prediction.thumbnail}
                    alt={prediction.platform}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {getPlatformIcon(prediction.platform)}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <a
                    href={prediction.content_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white/20 backdrop-blur-sm p-2 rounded-full hover:bg-white/30 transition-colors"
                  >
                    <Play className="w-5 h-5 text-white" />
                  </a>
                </div>
                <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-semibold backdrop-blur-sm ${
                  prediction.status === 'active' 
                    ? 'bg-green-500/90 text-white' 
                    : prediction.status === 'resolved'
                    ? 'bg-blue-500/90 text-white'
                    : 'bg-gray-500/90 text-white'
                }`}>
                  {prediction.status}
                </div>
              </div>

              {/* Content - Compact */}
              <div className="p-3">
                {/* Platform & Metric */}
                <div className="flex items-center gap-2 mb-2">
                  {getPlatformIcon(prediction.platform)}
                  <span className="text-gray-400 text-xs capitalize">{prediction.platform}</span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-400 text-xs capitalize">{prediction.metric_type}</span>
                </div>

                {/* Question */}
                <h3 className="text-white font-semibold mb-2 line-clamp-2 text-sm group-hover:text-violet-400 transition-colors">
                  Will reach {formatNumber(prediction.target_value)} {prediction.metric_type}?
                </h3>

                {/* Current Value */}
                <div className="flex items-center gap-2 mb-2">
                  {getMetricIcon(prediction.metric_type)}
                  <span className="text-white font-bold text-lg">
                    {formatNumber(
                      prediction.status === 'resolved' 
                        ? (prediction.final_value || prediction.current_value || prediction.initial_value)
                        : (prediction.current_value || prediction.initial_value)
                    )}
                  </span>
                  <span className="text-gray-400 text-xs">
                    / {formatNumber(prediction.target_value)}
                  </span>
                </div>

                {/* Progress Bar - Compact */}
                <div className="mb-3">
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ 
                        width: `${Math.min(100, ((() => {
                          const currentVal = prediction.status === 'resolved'
                            ? (prediction.final_value || prediction.current_value || prediction.initial_value)
                            : (prediction.current_value || prediction.initial_value)
                          return (currentVal / prediction.target_value) * 100
                        })()))}%` 
                      }}
                      transition={{ duration: 0.5 }}
                      className={`h-full rounded-full ${
                        (() => {
                          const currentVal = prediction.status === 'resolved'
                            ? (prediction.final_value || prediction.current_value || prediction.initial_value)
                            : (prediction.current_value || prediction.initial_value)
                          return currentVal >= prediction.target_value
                        })()
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                          : 'bg-gradient-to-r from-violet-500 to-fuchsia-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Pools - Compact */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="p-2 bg-green-500/10 rounded-lg border border-green-500/20">
                    <div className="text-xs text-green-400 font-semibold mb-1">YES</div>
                    <div className="text-sm font-bold text-white">{formatNumber(prediction.yes_pool || 0)}</div>
                    <div className="text-xs text-gray-400">{prediction.yes_odds?.toFixed(2)}x</div>
                  </div>
                  <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                    <div className="text-xs text-red-400 font-semibold mb-1">NO</div>
                    <div className="text-sm font-bold text-white">{formatNumber(prediction.no_pool || 0)}</div>
                    <div className="text-xs text-gray-400">{prediction.no_odds?.toFixed(2)}x</div>
                  </div>
                </div>

                {/* Outcome or Time */}
                {prediction.status === 'resolved' ? (
                  <div className={`mb-2 p-2 rounded-lg text-center text-xs font-semibold ${
                    prediction.outcome === 'YES' 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {prediction.outcome === 'YES' ? '✅ YES Won' : '❌ NO Won'} • Final: {formatNumber(prediction.final_value || 0)}
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>
                        {prediction.time_remaining_hours 
                          ? `${Math.floor(prediction.time_remaining_hours)}h left`
                          : 'Expired'}
                      </span>
                    </div>
                    <span className="text-violet-400">
                      +{formatNumber((() => {
                        const currentVal = prediction.current_value || prediction.initial_value
                        return currentVal - prediction.initial_value
                      })())}
                    </span>
                  </div>
                )}

                {/* Trade/Claim Button */}
                {prediction.status === 'active' && isConnected && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setSelectedPrediction(prediction)
                      setShowTradeModal(true)
                    }}
                    className="w-full py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-lg text-white font-semibold text-sm"
                  >
                    Trade Now
                  </motion.button>
                )}
                {prediction.status === 'resolved' && isConnected && (() => {
                  const winning = userWinnings.find(w => w.prediction_id === prediction.prediction_id)
                  if (winning && !winning.claimed) {
                    return (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleClaimWinnings(winning.trade_id, winning.payout_amount)}
                        disabled={claiming === winning.trade_id}
                        className="w-full py-2 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg text-white font-semibold text-sm disabled:opacity-50"
                      >
                        {claiming === winning.trade_id ? 'Claiming...' : `💰 Claim ${winning.payout_amount.toFixed(4)} APTOS`}
                      </motion.button>
                    )
                  }
                  return null
                })()}
              </div>
            </motion.div>
          ))}
        </div>

        {predictions.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-24 h-24 bg-gradient-to-r from-gray-500 to-gray-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <BarChart3 className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-4">
              {platformFilter !== 'all' || statusFilter !== 'all'
                ? 'No Predictions Match Your Filters'
                : 'No Predictions Yet'}
            </h3>
            <p className="text-gray-400 mb-6">
              {platformFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your filters to see more predictions.'
                : 'Be the first to create a prediction market!'}
            </p>
            {isConnected && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl text-white font-semibold"
              >
                Create Prediction Market
              </motion.button>
            )}
          </motion.div>
        )}
      </div>

      {/* Token Selection Modal */}
      <AnimatePresence>
        {showTokenSelectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowTokenSelectModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1a1a2e] rounded-2xl p-6 max-w-2xl w-full border border-white/10 max-h-[80vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-bold text-white mb-6">Select Token to Create Prediction</h2>
              
              {userTokens.length === 0 ? (
                <div className="text-center py-12">
                  <Coins className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">You haven't created any tokens yet.</p>
                  <p className="text-gray-500 text-sm mt-2">Tokenize content first to create predictions.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {userTokens.map((token) => (
                    <motion.button
                      key={token.asa_id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setCreateForm({
                          content_url: token.content_url || '',
                          platform: (token.platform || 'youtube') as any,
                          metric_type: 'likes' as any,
                          target_value: '',
                          timeframe_hours: '24'
                        })
                        setShowTokenSelectModal(false)
                        setShowCreateModal(true)
                        setCreateFromToken(true)
                      }}
                      className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-left transition-all"
                    >
                      <div className="flex items-center gap-4">
                        {token.content_thumbnail && (
                          <img 
                            src={token.content_thumbnail} 
                            alt={token.token_name}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="text-white font-semibold mb-1">{token.token_name}</h3>
                          <p className="text-gray-400 text-sm">${token.token_symbol}</p>
                          <p className="text-gray-500 text-xs mt-1 capitalize">{token.platform || 'youtube'}</p>
                        </div>
                        <div className="text-violet-400">
                          <ArrowRight className="w-5 h-5" />
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
              
              <div className="mt-6">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowTokenSelectModal(false)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white font-semibold"
                >
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowCreateModal(false)
              setCreateError(null)
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1a1a2e] rounded-2xl p-6 max-w-2xl w-full border border-white/10"
            >
              <h2 className="text-2xl font-bold text-white mb-6">Create Prediction Market</h2>
              
              {createError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <span className="text-red-400 text-sm">{createError}</span>
                  </div>
                </motion.div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="text-gray-300 text-sm mb-2 block">Content URL</label>
                  <input
                    type="text"
                    value={createForm.content_url}
                    onChange={(e) => setCreateForm({...createForm, content_url: e.target.value})}
                    placeholder="https://..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-violet-500"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Platform</label>
                    <select
                      value={createForm.platform}
                      onChange={(e) => setCreateForm({...createForm, platform: e.target.value as any})}
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:border-violet-500"
                    >
                      <option value="youtube">YouTube</option>
                      <option value="instagram">Instagram</option>
                      <option value="twitter">Twitter/X</option>
                      <option value="linkedin">LinkedIn</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Metric</label>
                    <select
                      value={createForm.metric_type}
                      onChange={(e) => setCreateForm({...createForm, metric_type: e.target.value as any})}
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:border-violet-500"
                    >
                      <option value="likes">Likes</option>
                      <option value="comments">Comments</option>
                      <option value="views">Views</option>
                      <option value="shares">Shares</option>
                      <option value="reposts">Reposts</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Target Value</label>
                    <input
                      type="number"
                      value={createForm.target_value}
                      onChange={(e) => setCreateForm({...createForm, target_value: e.target.value})}
                      placeholder="100"
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  
                  <div>
                    <label className="text-gray-300 text-sm mb-2 block">Timeframe (hours)</label>
                    <input
                      type="number"
                      value={createForm.timeframe_hours}
                      onChange={(e) => setCreateForm({...createForm, timeframe_hours: e.target.value})}
                      placeholder="24"
                      className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex gap-4 mt-6">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setShowCreateModal(false)
                    setCreateError(null)
                  }}
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white font-semibold"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCreatePrediction}
                  disabled={creating}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl text-white font-semibold disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Market'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trade Modal */}
      <AnimatePresence>
        {showTradeModal && selectedPrediction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => {
              setShowTradeModal(false)
              setTradeError(null)
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1a1a2e] rounded-2xl p-6 max-w-md w-full border border-white/10"
            >
              <h2 className="text-2xl font-bold text-white mb-6">Trade Prediction</h2>
              
              {tradeError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <span className="text-red-400 text-sm">{tradeError}</span>
                  </div>
                </motion.div>
              )}
              
              <div className="mb-4 p-4 bg-white/5 rounded-xl">
                <p className="text-white text-sm mb-2">
                  Will reach {formatNumber(selectedPrediction.target_value)} {selectedPrediction.metric_type}?
                </p>
                <p className="text-gray-400 text-xs">
                  Current: {formatNumber(selectedPrediction.current_value || selectedPrediction.initial_value)}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setTradeSide('YES')}
                  className={`p-4 rounded-xl border-2 font-semibold ${
                    tradeSide === 'YES'
                      ? 'bg-green-500/20 border-green-500 text-green-400'
                      : 'bg-white/5 border-white/10 text-gray-400'
                  }`}
                >
                  YES
                  <div className="text-xs mt-1">{selectedPrediction.yes_odds?.toFixed(2)}x</div>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setTradeSide('NO')}
                  className={`p-4 rounded-xl border-2 font-semibold ${
                    tradeSide === 'NO'
                      ? 'bg-red-500/20 border-red-500 text-red-400'
                      : 'bg-white/5 border-white/10 text-gray-400'
                  }`}
                >
                  NO
                  <div className="text-xs mt-1">{selectedPrediction.no_odds?.toFixed(2)}x</div>
                </motion.button>
              </div>
              
              <div className="mb-6">
                <label className="text-gray-300 text-sm mb-2 block">Amount (APTOS)</label>
                <input
                  type="number"
                  value={tradeAmount}
                  onChange={(e) => setTradeAmount(e.target.value)}
                  placeholder="1.0"
                  step="0.1"
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-violet-500"
                />
                {tradeAmount && !isNaN(parseFloat(tradeAmount)) && (
                  <p className="text-gray-400 text-xs mt-2">
                    Potential payout: {(parseFloat(tradeAmount) * (tradeSide === 'YES' ? selectedPrediction.yes_odds! : selectedPrediction.no_odds!)).toFixed(2)} APTOS
                  </p>
                )}
              </div>
              
              <div className="flex gap-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setShowTradeModal(false)
                    setTradeError(null)
                  }}
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white font-semibold"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleTrade}
                  disabled={trading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl text-white font-semibold disabled:opacity-50"
                >
                  {trading ? 'Trading...' : 'Place Trade'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Modal - Trade */}
      <AnimatePresence>
        {tradeSuccess?.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setTradeSuccess(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1a1a2e] rounded-2xl p-6 max-w-md w-full border border-green-500/50"
            >
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <CheckCircle className="w-8 h-8 text-white" />
                </motion.div>
                <h3 className="text-2xl font-bold text-white mb-2">Trade Successful!</h3>
                <p className="text-gray-300 mb-4">{tradeSuccess.message}</p>
                {tradeSuccess.txId && (
                  <a
                    href={`https://testnet.algoexplorer.io/tx/${tradeSuccess.txId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-400 hover:text-violet-300 text-sm flex items-center justify-center gap-1"
                  >
                    <span>View Transaction</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Modal - Create */}
      <AnimatePresence>
        {createSuccess?.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setCreateSuccess(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1a1a2e] rounded-2xl p-6 max-w-md w-full border border-green-500/50"
            >
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <CheckCircle className="w-8 h-8 text-white" />
                </motion.div>
                <h3 className="text-2xl font-bold text-white mb-2">Prediction Created!</h3>
                <p className="text-gray-300">{createSuccess.message}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default PredictionMarket

