import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import { useWallet } from '../contexts/WalletContext'
import { getCreatorPosts, Post } from '../services/postService'
import PostCard from '../components/PostCard'
import PremiumBackground from '../components/PremiumBackground'
import { 
  User, 
  Coins, 
  TrendingUp, 
  TrendingDown,
  ArrowLeft,
  Sparkles,
  BarChart3,
  Heart,
  MessageCircle,
  Share2,
  Eye,
  Calendar,
  Globe,
  Verified,
  Zap,
  Flame,
  Crown,
  Trophy,
  Users,
  DollarSign,
  Activity
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'

const CreatorProfilePage: React.FC = () => {
  const { address } = useParams<{ address: string }>()
  const navigate = useNavigate()
  const { isConnected, address: userAddress } = useWallet()
  const [posts, setPosts] = useState<Post[]>([])
  const [creator, setCreator] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'posts' | 'about' | 'stats'>('posts')

  useEffect(() => {
    if (address) {
      loadCreatorData()
    }
  }, [address])

  const loadCreatorData = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getCreatorPosts(address!, 1, 50)
      if (result.success) {
        setPosts(result.posts || [])
        setCreator(result.creator)
      } else {
        setError(result.error || 'Failed to load creator profile')
      }
    } catch (err) {
      setError('Failed to load creator profile')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (!address) {
    return null
  }

  // Calculate stats
  const totalLikes = posts.reduce((sum, p) => sum + p.likesCount, 0)
  const totalComments = posts.reduce((sum, p) => sum + p.commentsCount, 0)
  const totalViews = posts.reduce((sum, p) => sum + p.viewsCount, 0)
  const totalShares = posts.reduce((sum, p) => sum + p.sharesCount, 0)
  const engagementRate = posts.length > 0 ? ((totalLikes + totalComments + totalShares) / totalViews * 100).toFixed(1) : '0'

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
      <PremiumBackground variant="purple" />
      
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-transparent to-transparent pointer-events-none" />
      
      <main className="relative z-10">
        {/* Back Button - Floating */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="fixed top-20 left-4 z-20"
        >
          <motion.button
            onClick={() => navigate(-1)}
            whileHover={{ scale: 1.1, x: 5 }}
            whileTap={{ scale: 0.9 }}
            className="p-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full text-white hover:bg-white/20 transition-all shadow-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
        </motion.div>

        {loading ? (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"
              />
              <p className="text-gray-400">Loading creator profile...</p>
            </div>
          </div>
        ) : error || !creator ? (
          <div className="flex items-center justify-center min-h-screen px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center max-w-md"
            >
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-10 h-10 text-red-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Creator Not Found</h3>
              <p className="text-gray-400 mb-6">
                {error || 'This creator doesn\'t have a token yet. They need to create one first.'}
              </p>
              <motion.button
                onClick={() => navigate('/feed')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-lg font-semibold"
              >
                Back to Feed
              </motion.button>
            </motion.div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Hero Section - Premium Profile Header */}
            <motion.div
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative mb-8"
            >
              {/* Cover Image Placeholder */}
              <div className="h-64 bg-gradient-to-r from-purple-600 via-violet-600 to-amber-500 rounded-2xl mb-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-24 h-24 text-white/30" />
                </div>
              </div>

              {/* Profile Card */}
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 -mt-20 relative z-10 shadow-2xl">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="flex items-center gap-6">
                    {/* Avatar */}
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      className="relative"
                    >
                      <div className="w-32 h-32 bg-gradient-to-r from-purple-600 via-violet-600 to-amber-500 rounded-full flex items-center justify-center shadow-2xl border-4 border-[#0a0a0f]">
                        <span className="text-white font-bold text-4xl">
                          {creator?.tokenName ? creator.tokenName.charAt(0).toUpperCase() : creator_address?.charAt(2).toUpperCase() || 'C'}
                        </span>
                      </div>
                      <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-green-500 rounded-full border-4 border-[#0a0a0f] flex items-center justify-center">
                        <Verified className="w-5 h-5 text-white" />
                      </div>
                    </motion.div>

                    {/* Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-4xl font-bold text-white">{creator?.tokenName || `Creator ${address?.slice(0, 6)}`}</h1>
                        <Crown className="w-6 h-6 text-amber-400" />
                      </div>
                      <p className="text-gray-400 mb-4 flex items-center gap-2">
                        <span className="font-semibold text-cyan-400">@{creator?.tokenSymbol || 'CREATOR'}</span>
                        <span className="text-gray-600">•</span>
                        <span className="text-sm">{address?.slice(0, 8)}...{address?.slice(-6)}</span>
                      </p>
                      
                      {/* Quick Stats */}
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                          <span className="text-white font-semibold">{posts.length}</span>
                          <span className="text-gray-400 text-sm">Posts</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-purple-400" />
                          <span className="text-white font-semibold">
                            {creator?.marketCap > 0 && creator?.tokenPrice > 0 ? Math.floor(creator.marketCap / creator.tokenPrice / 1000) : 0}
                          </span>
                          <span className="text-gray-400 text-sm">Holders</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-green-400" />
                          <span className="text-white font-semibold">{engagementRate}%</span>
                          <span className="text-gray-400 text-sm">Engagement</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    {creator?.tokenSymbol && creator.tokenSymbol !== 'CREATOR' && (
                      <motion.button
                        onClick={() => navigate(`/trade/${creator.tokenSymbol}`)}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl font-semibold flex items-center gap-2 shadow-lg hover:shadow-purple-500/50 transition-all"
                      >
                        <Coins className="w-5 h-5" />
                        Invest Now
                      </motion.button>
                    )}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-6 py-3 bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-xl font-semibold hover:bg-white/20 transition-all"
                    >
                      Follow
                    </motion.button>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mt-8 pt-8 border-t border-white/10">
                  {[
                    { id: 'posts', label: 'Posts', icon: Sparkles, count: posts.length },
                    { id: 'stats', label: 'Stats', icon: BarChart3 },
                    { id: 'about', label: 'About', icon: User }
                  ].map(({ id, label, icon: Icon, count }) => (
                    <motion.button
                      key={id}
                      onClick={() => setActiveTab(id as any)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                        activeTab === id
                          ? 'bg-purple-500/20 text-amber-400 border border-purple-500/30'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{label}</span>
                      {count !== undefined && (
                        <span className="px-2 py-0.5 bg-white/10 rounded-full text-xs">
                          {count}
                        </span>
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Content Tabs */}
            <AnimatePresence mode="wait">
              {activeTab === 'posts' && (
                <motion.div
                  key="posts"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  {posts.length === 0 ? (
                    <div className="text-center py-20 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
                      <Sparkles className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-white mb-2">No Posts Yet</h3>
                      <p className="text-gray-400">This creator hasn't posted anything yet.</p>
                    </div>
                  ) : (
                    posts.map((post, index) => (
                      <motion.div
                        key={post.postId}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <PostCard post={post} />
                      </motion.div>
                    ))
                  )}
                </motion.div>
              )}

              {activeTab === 'stats' && (
                <motion.div
                  key="stats"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
                >
                  {/* Stat Cards */}
                  <motion.div
                    whileHover={{ scale: 1.05, y: -5 }}
                    className="bg-gradient-to-br from-purple-500/20 to-violet-500/20 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <Heart className="w-8 h-8 text-red-400" />
                      <TrendingUp className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">{totalLikes.toLocaleString()}</div>
                    <div className="text-gray-400 text-sm">Total Likes</div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.05, y: -5 }}
                    className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <MessageCircle className="w-8 h-8 text-blue-400" />
                      <TrendingUp className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">{totalComments.toLocaleString()}</div>
                    <div className="text-gray-400 text-sm">Total Comments</div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.05, y: -5 }}
                    className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-xl border border-green-500/30 rounded-2xl p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <Share2 className="w-8 h-8 text-green-400" />
                      <TrendingUp className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">{totalShares.toLocaleString()}</div>
                    <div className="text-gray-400 text-sm">Total Shares</div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.05, y: -5 }}
                    className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <Eye className="w-8 h-8 text-amber-400" />
                      <TrendingUp className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">{totalViews.toLocaleString()}</div>
                    <div className="text-gray-400 text-sm">Total Views</div>
                  </motion.div>

                  {/* Token Stats */}
                  <motion.div
                    whileHover={{ scale: 1.05, y: -5 }}
                    className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-xl border border-purple-500/30 rounded-2xl p-6 md:col-span-2"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <Coins className="w-8 h-8 text-purple-400" />
                      <h3 className="text-xl font-bold text-white">Token Performance</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-gray-400 text-sm mb-1">Current Price</div>
                        <div className="text-2xl font-bold text-white">
                          ${creator?.tokenPrice ? creator.tokenPrice.toFixed(6) : '0.000000'}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-sm mb-1">Market Cap</div>
                        <div className="text-2xl font-bold text-cyan-400">
                          ${creator?.marketCap ? (creator.marketCap / 1000).toFixed(2) : '0.00'}K
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.05, y: -5 }}
                    className="bg-gradient-to-br from-violet-500/20 to-purple-500/20 backdrop-blur-xl border border-violet-500/30 rounded-2xl p-6 md:col-span-2"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <Activity className="w-8 h-8 text-violet-400" />
                      <h3 className="text-xl font-bold text-white">Engagement Metrics</h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Engagement Rate</span>
                        <span className="text-2xl font-bold text-green-400">{engagementRate}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Avg. Likes per Post</span>
                        <span className="text-xl font-bold text-white">
                          {posts.length > 0 ? Math.floor(totalLikes / posts.length) : 0}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Avg. Views per Post</span>
                        <span className="text-xl font-bold text-white">
                          {posts.length > 0 ? Math.floor(totalViews / posts.length) : 0}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {activeTab === 'about' && (
                <motion.div
                  key="about"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8"
                >
                  <h3 className="text-2xl font-bold text-white mb-6">About {creator?.tokenName || `Creator ${address?.slice(0, 6)}`}</h3>
                  <div className="space-y-6">
                    <div>
                      <div className="text-gray-400 text-sm mb-2">Token Symbol</div>
                      <div className="text-white font-semibold text-lg">{creator?.tokenSymbol || 'CREATOR'}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-sm mb-2">Creator Address</div>
                      <div className="text-white font-mono text-sm">{address}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-sm mb-2">Total Posts</div>
                      <div className="text-white font-semibold text-lg">{posts.length}</div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  )
}

export default CreatorProfilePage
