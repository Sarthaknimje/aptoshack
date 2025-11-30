import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Post, engageWithPost } from '../services/postService'
import PremiumContentGate from './PremiumContentGate'
import { useWallet } from '../contexts/WalletContext'
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Eye, 
  TrendingUp,
  Lock,
  Coins,
  ArrowUpRight
} from 'lucide-react'

interface PostCardProps {
  post: Post
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const navigate = useNavigate()
  const { address, isConnected } = useWallet()
  const [liked, setLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(post.likesCount)
  const [sharesCount, setSharesCount] = useState(post.sharesCount)

  // Track view on mount
  useEffect(() => {
    if (isConnected && address) {
      engageWithPost(post.postId, address, 'view').catch(() => {})
    }
  }, [post.postId, isConnected, address])

  const handleLike = async () => {
    if (!isConnected || !address) {
      navigate('/')
      return
    }

    const result = await engageWithPost(post.postId, address, 'like')
    if (result.success) {
      setLiked(!liked)
      setLikesCount(prev => prev + (result.increment || 0))
    }
  }

  const handleShare = async () => {
    if (!isConnected || !address) {
      navigate('/')
      return
    }

    const result = await engageWithPost(post.postId, address, 'share')
    if (result.success) {
      setSharesCount(prev => prev + (result.increment || 0))
    }
  }

  const handleInvest = () => {
    navigate(`/trade/${post.tokenSymbol}`)
  }

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 hover:border-purple-500/30 transition-all"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-r from-purple-600 via-violet-600 to-amber-500 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-lg">
              {post.tokenName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-white font-bold text-lg">{post.tokenName}</h3>
              {post.isPremium && (
                <Lock className="w-4 h-4 text-amber-400" />
              )}
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-cyan-400 font-semibold">
                ${post.tokenPrice.toFixed(6)}
              </span>
              <span className="text-gray-400">
                {post.tokenSymbol}
              </span>
              {post.tokenPrice > 0 && (
                <span className="text-green-400 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {((post.marketCap / 1000) / post.tokenPrice).toFixed(0)} holders
                </span>
              )}
            </div>
          </div>
        </div>
        <motion.button
          onClick={handleInvest}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-lg font-semibold flex items-center gap-2 hover:shadow-lg hover:shadow-purple-500/25 transition-all"
        >
          <Coins className="w-4 h-4" />
          Invest
          <ArrowUpRight className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Content */}
      {post.title && (
        <h4 className="text-xl font-bold text-white mb-2">{post.title}</h4>
      )}
      {post.description && (
        <p className="text-gray-300 mb-4">{post.description}</p>
      )}

      {/* Premium Content Gate */}
      {post.isPremium && post.shelbyBlobUrl ? (
        <div className="mb-4">
          <PremiumContentGate
            tokenData={{
              creator: post.creator,
              token_id: post.tokenId,
              token_symbol: post.tokenSymbol,
              token_name: post.tokenName
            }}
            premiumContentUrl={post.shelbyBlobUrl}
            premiumContentType={
              post.contentType === 'video' || post.contentType === 'reel' 
                ? 'video' 
                : post.contentType === 'image' 
                ? 'image' 
                : 'document'
            }
            minimumBalance={post.minimumBalance}
          />
        </div>
      ) : post.shelbyBlobUrl ? (
        <div className="mb-4 rounded-lg overflow-hidden">
          {post.contentType === 'image' && (
            <img 
              src={post.shelbyBlobUrl} 
              alt={post.title || 'Post content'} 
              className="w-full rounded-lg"
            />
          )}
          {post.contentType === 'video' && (
            <video 
              src={post.shelbyBlobUrl} 
              controls 
              className="w-full rounded-lg"
            >
              Your browser does not support the video tag.
            </video>
          )}
          {post.contentType === 'reel' && (
            <video 
              src={post.shelbyBlobUrl} 
              controls 
              className="w-full rounded-lg"
            >
              Your browser does not support the video tag.
            </video>
          )}
        </div>
      ) : null}

      {/* Engagement */}
      <div className="flex items-center gap-6 pt-4 border-t border-white/10">
        <motion.button
          onClick={handleLike}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className={`flex items-center gap-2 transition-colors ${
            liked ? 'text-red-400' : 'text-gray-400 hover:text-red-400'
          }`}
        >
          <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
          <span className="font-semibold">{likesCount}</span>
        </motion.button>
        
        <button className="flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-colors">
          <MessageCircle className="w-5 h-5" />
          <span className="font-semibold">{post.commentsCount}</span>
        </button>
        
        <motion.button
          onClick={handleShare}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="flex items-center gap-2 text-gray-400 hover:text-green-400 transition-colors"
        >
          <Share2 className="w-5 h-5" />
          <span className="font-semibold">{sharesCount}</span>
        </motion.button>
        
        <div className="ml-auto flex items-center gap-2 text-gray-400 text-sm">
          <Eye className="w-4 h-4" />
          <span>{post.viewsCount} views</span>
        </div>
      </div>
    </motion.div>
  )
}

export default PostCard

