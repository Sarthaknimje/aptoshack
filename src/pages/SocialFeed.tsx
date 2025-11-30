import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../contexts/WalletContext'
import { getFeed, Post } from '../services/postService'
import PostCard from '../components/PostCard'
import PremiumBackground from '../components/PremiumBackground'
import { 
  Home,
  Search,
  Plus,
  Heart,
  User,
  Sparkles,
  Filter,
  Grid3x3,
  List,
  Clock,
  Flame,
  TrendingUp,
  ArrowUp
} from 'lucide-react'

const SocialFeed: React.FC = () => {
  const navigate = useNavigate()
  const { address, isConnected } = useWallet()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [contentType, setContentType] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'latest' | 'trending' | 'popular'>('latest')
  const [viewMode, setViewMode] = useState<'feed' | 'grid'>('feed')
  const [showScrollTop, setShowScrollTop] = useState(false)

  useEffect(() => {
    loadFeed()
  }, [contentType, sortBy])

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const loadFeed = async () => {
    setLoading(true)
    const result = await getFeed(1, 50, contentType === 'all' ? undefined : contentType, sortBy)
    if (result.success && result.posts) {
      setPosts(result.posts)
    }
    setLoading(false)
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
      <PremiumBackground variant="purple" />
      
      {/* Animated gradient overlays */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
      
      <main className="relative z-10">
        {/* Sticky Header - Premium */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-30 bg-[#0a0a0f]/80 backdrop-blur-2xl border-b border-white/10 mb-8"
        >
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.5 }}
                  className="w-14 h-14 bg-gradient-to-r from-purple-600 via-violet-600 to-amber-500 rounded-2xl flex items-center justify-center shadow-2xl"
                >
                  <Sparkles className="w-7 h-7 text-white" />
                </motion.div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-white">
                    Social <span className="bg-gradient-to-r from-purple-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">Feed</span>
                  </h1>
                  <p className="text-gray-400 text-sm mt-1">Discover creators and invest in their success</p>
                </div>
              </div>
              {isConnected && (
                <motion.button
                  onClick={() => navigate('/create-post')}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 via-violet-600 to-amber-500 text-white rounded-xl font-semibold flex items-center gap-2 shadow-2xl hover:shadow-purple-500/50 transition-all"
                >
                  <Plus className="w-5 h-5" />
                  Create
                </motion.button>
              )}
            </div>

            {/* Advanced Filters - Premium */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Content Type Filter */}
                <div className="flex-1">
                  <label className="text-xs font-semibold text-gray-400 mb-3 block uppercase tracking-wider">Content Type</label>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { value: 'all', label: 'All', icon: Sparkles, color: 'from-purple-500 to-violet-500' },
                      { value: 'text', label: 'Text', icon: Home, color: 'from-blue-500 to-cyan-500' },
                      { value: 'image', label: 'Images', icon: Heart, color: 'from-green-500 to-emerald-500' },
                      { value: 'video', label: 'Videos', icon: User, color: 'from-red-500 to-pink-500' },
                      { value: 'reel', label: 'Reels', icon: Sparkles, color: 'from-amber-500 to-orange-500' },
                      { value: 'audio', label: 'Audio', icon: Heart, color: 'from-purple-500 to-pink-500' }
                    ].map(({ value, label, icon: Icon, color }) => (
                      <motion.button
                        key={value}
                        onClick={() => setContentType(value)}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                          contentType === value
                            ? `bg-gradient-to-r ${color} text-white shadow-lg`
                            : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-transparent'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{label}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Sort & View Mode */}
                <div className="flex gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 mb-3 block uppercase tracking-wider">Sort By</label>
                    <div className="flex gap-2">
                      {[
                        { value: 'latest', label: 'Latest', icon: Clock },
                        { value: 'trending', label: 'Trending', icon: Flame },
                        { value: 'popular', label: 'Popular', icon: TrendingUp }
                      ].map(({ value, label, icon: Icon }) => (
                        <motion.button
                          key={value}
                          onClick={() => setSortBy(value as any)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                            sortBy === value
                              ? 'bg-gradient-to-r from-purple-500 to-violet-500 text-white shadow-lg'
                              : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{label}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-xs font-semibold text-gray-400 mb-3 block uppercase tracking-wider">View</label>
                    <div className="flex gap-2">
                      <motion.button
                        onClick={() => setViewMode('feed')}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`p-2.5 rounded-xl transition-all ${
                          viewMode === 'feed'
                            ? 'bg-gradient-to-r from-purple-500 to-violet-500 text-white'
                            : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <List className="w-4 h-4" />
                      </motion.button>
                      <motion.button
                        onClick={() => setViewMode('grid')}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`p-2.5 rounded-xl transition-all ${
                          viewMode === 'grid'
                            ? 'bg-gradient-to-r from-purple-500 to-violet-500 text-white'
                            : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <Grid3x3 className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Feed Content */}
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          {loading ? (
            <div className="text-center py-32">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-6"
              />
              <p className="text-gray-400 text-lg">Loading amazing content...</p>
            </div>
          ) : posts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-32"
            >
              <div className="w-32 h-32 bg-gradient-to-r from-purple-500/20 to-violet-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-16 h-16 text-gray-600" />
              </div>
              <h3 className="text-3xl font-bold text-white mb-3">No posts yet</h3>
              <p className="text-gray-400 mb-8 text-lg">Be the first to create a post and start building your community!</p>
              {isConnected && (
                <motion.button
                  onClick={() => navigate('/create-post')}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-gradient-to-r from-purple-600 via-violet-600 to-amber-500 text-white rounded-xl font-semibold text-lg shadow-2xl hover:shadow-purple-500/50 transition-all"
                >
                  <Plus className="w-6 h-6 inline mr-2" />
                  Create First Post
                </motion.button>
              )}
            </motion.div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post, index) => (
                <motion.div
                  key={post.postId}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -5 }}
                >
                  <PostCard post={post} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="space-y-8">
              {posts.map((post, index) => (
                <motion.div
                  key={post.postId}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03, type: "spring", stiffness: 100 }}
                >
                  <PostCard post={post} />
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Scroll to Top Button */}
        <AnimatePresence>
          {showScrollTop && (
            <motion.button
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              onClick={scrollToTop}
              whileHover={{ scale: 1.1, y: -5 }}
              whileTap={{ scale: 0.9 }}
              className="fixed bottom-8 right-8 z-50 w-14 h-14 bg-gradient-to-r from-purple-600 to-violet-600 rounded-full flex items-center justify-center text-white shadow-2xl hover:shadow-purple-500/50 transition-all"
            >
              <ArrowUp className="w-6 h-6" />
            </motion.button>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

export default SocialFeed
