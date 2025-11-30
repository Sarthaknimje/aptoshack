import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useWallet } from '../contexts/WalletContext'
import { getFeed, Post } from '../services/postService'
import PostCard from '../components/PostCard'
import { 
  Sparkles, 
  Filter, 
  TrendingUp, 
  Clock, 
  Flame,
  Image as ImageIcon,
  Video,
  FileText,
  Music,
  Zap
} from 'lucide-react'
import PremiumBackground from '../components/PremiumBackground'

const SocialFeed: React.FC = () => {
  const { address, isConnected } = useWallet()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [contentType, setContentType] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'latest' | 'trending' | 'popular'>('latest')

  useEffect(() => {
    loadFeed()
  }, [contentType, sortBy])

  const loadFeed = async () => {
    setLoading(true)
    const result = await getFeed(1, 20, contentType === 'all' ? undefined : contentType, sortBy)
    if (result.success && result.posts) {
      setPosts(result.posts)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative">
      <PremiumBackground variant="purple" />
      
      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-600 via-violet-600 to-amber-500 rounded-xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white">
                Social <span className="bg-gradient-to-r from-purple-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">Feed</span>
              </h1>
              <p className="text-gray-400 text-sm mt-1">Discover creators and invest in their success</p>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 mb-6"
        >
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Content Type Filter */}
            <div className="flex-1">
              <label className="text-xs text-gray-400 mb-2 block">Content Type</label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { value: 'all', label: 'All', icon: Sparkles },
                  { value: 'text', label: 'Text', icon: FileText },
                  { value: 'image', label: 'Images', icon: ImageIcon },
                  { value: 'video', label: 'Videos', icon: Video },
                  { value: 'reel', label: 'Reels', icon: Zap },
                  { value: 'audio', label: 'Audio', icon: Music }
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setContentType(value)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                      contentType === value
                        ? 'bg-purple-500/20 text-amber-400 border border-purple-500/30'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-semibold">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sort Filter */}
            <div>
              <label className="text-xs text-gray-400 mb-2 block">Sort By</label>
              <div className="flex gap-2">
                {[
                  { value: 'latest', label: 'Latest', icon: Clock },
                  { value: 'trending', label: 'Trending', icon: Flame },
                  { value: 'popular', label: 'Popular', icon: TrendingUp }
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setSortBy(value as any)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                      sortBy === value
                        ? 'bg-purple-500/20 text-amber-400 border border-purple-500/30'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-semibold">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Feed */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
            <p className="text-gray-400 mt-4">Loading feed...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <Sparkles className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No posts yet</h3>
            <p className="text-gray-400">Be the first to create a post!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post, index) => (
              <motion.div
                key={post.postId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <PostCard post={post} />
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default SocialFeed

