import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Post, engageWithPost, getComments, createComment, Comment } from '../services/postService'
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
  ArrowUpRight,
  X,
  Send,
  MoreHorizontal,
  Bookmark,
  Flag,
  Zap,
  Play,
  Image as ImageIcon,
  Video as VideoIcon,
  Crown,
  Verified,
  Clock
} from 'lucide-react'

interface PostCardProps {
  post: Post
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const navigate = useNavigate()
  const { address, isConnected } = useWallet()
  const [liked, setLiked] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [likesCount, setLikesCount] = useState(post.likesCount)
  const [sharesCount, setSharesCount] = useState(post.sharesCount)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [loadingComments, setLoadingComments] = useState(false)
  const [postingComment, setPostingComment] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

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
      // Copy link to clipboard
      navigator.clipboard.writeText(`${window.location.origin}/post/${post.postId}`)
    }
  }

  const handleInvest = () => {
    navigate(`/trade/${post.tokenSymbol}`)
  }

  const handleShowComments = async () => {
    if (showComments) {
      setShowComments(false)
      return
    }

    setLoadingComments(true)
    const result = await getComments(post.postId)
    if (result.success && result.comments) {
      setComments(result.comments)
    }
    setShowComments(true)
    setLoadingComments(false)
  }

  const handlePostComment = async () => {
    if (!isConnected || !address || !commentText.trim()) {
      return
    }

    setPostingComment(true)
    const result = await createComment(post.postId, address, commentText)
    if (result.success) {
      setCommentText('')
      // Reload comments
      const commentsResult = await getComments(post.postId)
      if (commentsResult.success && commentsResult.comments) {
        setComments(commentsResult.comments)
      }
    }
    setPostingComment(false)
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.005 }}
      className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden hover:border-purple-500/30 transition-all shadow-lg hover:shadow-2xl"
    >
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 flex-1">
            <motion.button
              onClick={() => navigate(`/creator/${post.creatorAddress}`)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="relative"
            >
              <div className="w-14 h-14 bg-gradient-to-r from-purple-600 via-violet-600 to-amber-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white/20">
                <span className="text-white font-bold text-xl">
                  {post.tokenName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-[#0a0a0f]" />
            </motion.button>
            <div className="flex-1">
              <button
                onClick={() => navigate(`/creator/${post.creatorAddress}`)}
                className="flex items-center gap-2 hover:text-purple-400 transition-colors group"
              >
                <h3 className="text-white font-bold text-lg group-hover:text-purple-400">{post.tokenName}</h3>
                {post.isPremium && (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Crown className="w-5 h-5 text-amber-400" />
                  </motion.div>
                )}
              </button>
              <div className="flex items-center gap-3 text-sm mt-1">
                <span className="text-cyan-400 font-semibold">
                  ${post.tokenPrice.toFixed(6)}
                </span>
                <span className="text-gray-500">•</span>
                <span className="text-gray-400">{formatTimeAgo(post.createdAt)}</span>
                {post.isPremium && (
                  <>
                    <span className="text-gray-500">•</span>
                    <span className="text-amber-400 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Premium
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <motion.button
              onClick={() => setBookmarked(!bookmarked)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className={`p-2 rounded-lg transition-colors ${
                bookmarked ? 'text-amber-400' : 'text-gray-400 hover:text-amber-400 hover:bg-white/5'
              }`}
            >
              <Bookmark className={`w-5 h-5 ${bookmarked ? 'fill-current' : ''}`} />
            </motion.button>
            <div className="relative">
              <motion.button
                onClick={() => setShowMenu(!showMenu)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <MoreHorizontal className="w-5 h-5" />
              </motion.button>
              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -10 }}
                    className="absolute right-0 top-full mt-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg overflow-hidden shadow-xl z-10"
                  >
                    <button className="w-full px-4 py-2 text-left text-white hover:bg-white/10 flex items-center gap-2 text-sm">
                      <Flag className="w-4 h-4" />
                      Report
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Content */}
        {post.title && (
          <h4 className="text-2xl font-bold text-white mb-3 leading-tight">{post.title}</h4>
        )}
        {post.description && (
          <p className="text-gray-300 mb-4 leading-relaxed">{post.description}</p>
        )}

        {/* Premium Content Gate */}
        {post.isPremium && post.shelbyBlobUrl ? (
          <div className="mb-4 rounded-xl overflow-hidden">
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
          <div className="mb-4 rounded-xl overflow-hidden relative group">
            {post.contentType === 'image' && (
              <motion.img 
                src={post.shelbyBlobUrl} 
                alt={post.title || 'Post content'} 
                className="w-full rounded-xl"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              />
            )}
            {post.contentType === 'video' && (
              <div className="relative">
                <video 
                  src={post.shelbyBlobUrl} 
                  controls 
                  className="w-full rounded-xl"
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            )}
            {post.contentType === 'reel' && (
              <div className="relative aspect-[9/16] bg-black rounded-xl overflow-hidden">
                <video 
                  src={post.shelbyBlobUrl} 
                  controls 
                  className="w-full h-full object-cover"
                  playsInline
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            )}
            {post.contentType === 'audio' && (
              <div className="bg-gradient-to-r from-purple-500/20 to-violet-500/20 rounded-xl p-8">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-purple-600 rounded-xl flex items-center justify-center">
                    <Zap className="w-8 h-8 text-white" />
                  </div>
                  <audio src={post.shelbyBlobUrl} controls className="flex-1" />
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Investment CTA */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="mb-4 p-4 bg-gradient-to-r from-purple-500/10 to-violet-500/10 border border-purple-500/20 rounded-xl"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-semibold mb-1">Invest in {post.tokenName}</div>
              <div className="text-gray-400 text-sm">Current Price: ${post.tokenPrice.toFixed(6)}</div>
            </div>
            <motion.button
              onClick={handleInvest}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl font-semibold flex items-center gap-2 shadow-lg hover:shadow-purple-500/50 transition-all"
            >
              <Coins className="w-5 h-5" />
              Invest
              <ArrowUpRight className="w-4 h-4" />
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* Engagement Bar - Premium Style */}
      <div className="px-6 py-4 border-t border-white/10 bg-white/2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <motion.button
              onClick={handleLike}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              className={`flex items-center gap-2 transition-all ${
                liked ? 'text-red-400' : 'text-gray-400 hover:text-red-400'
              }`}
            >
              <motion.div
                animate={liked ? { scale: [1, 1.3, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                <Heart className={`w-6 h-6 ${liked ? 'fill-current' : ''}`} />
              </motion.div>
              <span className="font-bold text-lg">{likesCount.toLocaleString()}</span>
            </motion.button>
            
            <motion.button
              onClick={handleShowComments}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              className="flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-colors"
            >
              <MessageCircle className="w-6 h-6" />
              <span className="font-bold text-lg">{post.commentsCount.toLocaleString()}</span>
            </motion.button>
            
            <motion.button
              onClick={handleShare}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              className="flex items-center gap-2 text-gray-400 hover:text-green-400 transition-colors"
            >
              <Share2 className="w-6 h-6" />
              <span className="font-bold text-lg">{sharesCount.toLocaleString()}</span>
            </motion.button>
          </div>
          
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Eye className="w-4 h-4" />
            <span className="font-semibold">{post.viewsCount.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Comments Section - Enhanced */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-white/10 bg-white/2"
          >
            <div className="p-6">
              {loadingComments ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
                  <p className="text-gray-400 mt-2">Loading comments...</p>
                </div>
              ) : (
                <>
                  {/* Comment Input - Premium */}
                  {isConnected && address && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10"
                    >
                      <div className="flex gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-violet-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold text-sm">
                            {address.slice(2, 4).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 flex gap-2">
                          <input
                            type="text"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handlePostComment()}
                            placeholder="Write a comment..."
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
                          />
                          <motion.button
                            onClick={handlePostComment}
                            disabled={!commentText.trim() || postingComment}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                          >
                            {postingComment ? (
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                <Send className="w-5 h-5" />
                                Post
                              </>
                            )}
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Comments List - Premium */}
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {comments.length === 0 ? (
                      <div className="text-center py-12">
                        <MessageCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-400">No comments yet. Be the first to comment!</p>
                      </div>
                    ) : (
                      comments.map((comment, index) => (
                        <motion.div
                          key={comment.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-purple-500/30 transition-all"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-violet-600 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-white font-bold text-sm">
                                {comment.userAddress.slice(2, 4).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-white font-semibold text-sm">
                                  {comment.userAddress.slice(0, 6)}...{comment.userAddress.slice(-4)}
                                </span>
                                <span className="text-gray-500 text-xs">
                                  {formatTimeAgo(comment.createdAt)}
                                </span>
                              </div>
                              <p className="text-gray-300 text-sm leading-relaxed">{comment.commentText}</p>
                            </div>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default PostCard
