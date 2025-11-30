import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import { useWallet } from '../contexts/WalletContext'
import { getCreatorPosts, Post } from '../services/postService'
import PostCard from '../components/PostCard'
import PremiumBackground from '../components/PremiumBackground'
import { 
  User, 
  Coins, 
  TrendingUp, 
  ArrowLeft,
  Sparkles,
  BarChart3
} from 'lucide-react'

const CreatorProfilePage: React.FC = () => {
  const { address } = useParams<{ address: string }>()
  const navigate = useNavigate()
  const { isConnected } = useWallet()
  const [posts, setPosts] = useState<Post[]>([])
  const [creator, setCreator] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (address) {
      loadCreatorData()
    }
  }, [address])

  const loadCreatorData = async () => {
    setLoading(true)
    const result = await getCreatorPosts(address!, 1, 50)
    if (result.success) {
      setPosts(result.posts || [])
      setCreator(result.creator)
    }
    setLoading(false)
  }

  if (!address) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative">
      <PremiumBackground variant="purple" />
      
      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <motion.button
          onClick={() => navigate(-1)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </motion.button>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
            <p className="text-gray-400 mt-4">Loading creator profile...</p>
          </div>
        ) : !creator ? (
          <div className="text-center py-20">
            <User className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Creator Not Found</h3>
            <p className="text-gray-400">This creator doesn't exist yet.</p>
          </div>
        ) : (
          <>
            {/* Creator Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-8 mb-8"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-gradient-to-r from-purple-600 via-violet-600 to-amber-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-2xl">
                      {creator.tokenName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-white mb-2">{creator.tokenName}</h1>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-400">{creator.tokenSymbol}</span>
                      <span className="text-cyan-400 font-semibold">
                        ${creator.tokenPrice.toFixed(6)}
                      </span>
                      <span className="text-gray-400">
                        {address.slice(0, 6)}...{address.slice(-4)}
                      </span>
                    </div>
                  </div>
                </div>
                <motion.button
                  onClick={() => navigate(`/trade/${creator.tokenSymbol}`)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-lg font-semibold flex items-center gap-2"
                >
                  <Coins className="w-5 h-5" />
                  Invest
                </motion.button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/10">
                <div>
                  <div className="text-gray-400 text-sm mb-1">Market Cap</div>
                  <div className="text-white font-bold text-lg">
                    ${(creator.marketCap / 1000).toFixed(2)}K
                  </div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm mb-1">Posts</div>
                  <div className="text-white font-bold text-lg">{posts.length}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm mb-1">Token Price</div>
                  <div className="text-green-400 font-bold text-lg flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    ${creator.tokenPrice.toFixed(6)}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Posts */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-purple-400" />
                Posts
              </h2>
              {posts.length === 0 ? (
                <div className="text-center py-20 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl">
                  <Sparkles className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">No Posts Yet</h3>
                  <p className="text-gray-400">This creator hasn't posted anything yet.</p>
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
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default CreatorProfilePage

