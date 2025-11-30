import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../contexts/WalletContext'
import { getFeed, Post } from '../services/postService'
import PostCard from '../components/PostCard'
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
  TrendingUp
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
    <div className="min-h-screen bg-gray-50">
      {/* Instagram/Twitter Style Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                CreatorCoin
              </h1>
              <div className="hidden md:flex items-center gap-1 border-l border-gray-200 pl-6">
                <button
                  onClick={() => setSortBy('latest')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    sortBy === 'latest'
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Latest
                </button>
                <button
                  onClick={() => setSortBy('trending')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    sortBy === 'trending'
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Trending
                </button>
                <button
                  onClick={() => setSortBy('popular')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    sortBy === 'popular'
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Popular
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <Search className="w-5 h-5 text-gray-700" />
              </button>
              {isConnected && (
                <motion.button
                  onClick={() => navigate('/create-post')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold text-sm flex items-center gap-2 shadow-sm hover:shadow-md transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Create
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Feed - Instagram Style */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent"></div>
            <p className="text-gray-500 mt-4 text-sm">Loading feed...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No posts yet</h3>
            <p className="text-gray-500 mb-6">Be the first to create a post!</p>
            {isConnected && (
              <button
                onClick={() => navigate('/create-post')}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:shadow-md transition-all"
              >
                Create First Post
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-0">
            {posts.map((post, index) => (
              <motion.div
                key={post.postId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <PostCard post={post} />
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Scroll to Top */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            onClick={scrollToTop}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="fixed bottom-8 right-8 z-50 w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-xl transition-all"
          >
            <TrendingUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}

export default SocialFeed
