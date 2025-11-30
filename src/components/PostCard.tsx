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
  Lock,
  Coins,
  MoreHorizontal,
  Bookmark,
  Flag,
  Play,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Send,
  Verified
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
  const [showTokenize, setShowTokenize] = useState(false)
  const [showPredict, setShowPredict] = useState(false)

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

    if (days > 0) return `${days}d`
    if (hours > 0) return `${hours}h`
    if (minutes > 0) return `${minutes}m`
    return 'now'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-4 shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Header - Instagram Style */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/creator/${post.creatorAddress}`)}
            className="relative"
          >
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
              <span className="text-white font-semibold text-sm">
                {post.tokenName.charAt(0).toUpperCase()}
              </span>
            </div>
          </button>
          <div>
            <button
              onClick={() => navigate(`/creator/${post.creatorAddress}`)}
              className="flex items-center gap-1.5 hover:opacity-70 transition-opacity"
            >
              <span className="font-semibold text-sm text-gray-900">{post.tokenName}</span>
              {post.isPremium && <Verified className="w-4 h-4 text-blue-500" />}
            </button>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>{formatTimeAgo(post.createdAt)}</span>
              {post.isPremium && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-amber-600">
                    <Lock className="w-3 h-3" />
                    Premium
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
          >
            <MoreHorizontal className="w-5 h-5 text-gray-700" />
          </button>
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[150px]"
              >
                <button className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                  <Flag className="w-4 h-4" />
                  Report
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Content - Proper Social Media Sizing */}
      {post.shelbyBlobUrl && (
        <div className="w-full bg-black">
          {post.contentType === 'image' && (
            <img 
              src={post.shelbyBlobUrl} 
              alt={post.title || 'Post content'} 
              className="w-full object-cover"
              style={{ maxHeight: '600px' }}
            />
          )}
          {post.contentType === 'video' && (
            <video 
              src={post.shelbyBlobUrl} 
              controls 
              className="w-full"
              style={{ maxHeight: '600px' }}
            >
              Your browser does not support the video tag.
            </video>
          )}
          {post.contentType === 'reel' && (
            <div className="relative bg-black flex items-center justify-center" style={{ maxHeight: '800px' }}>
              <video 
                src={post.shelbyBlobUrl} 
                controls 
                className="w-full h-auto max-h-[800px] object-contain"
                playsInline
              >
                Your browser does not support the video tag.
              </video>
            </div>
          )}
          {post.isPremium && post.shelbyBlobUrl && (
            <div className="relative">
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
          )}
        </div>
      )}

      {/* Actions Bar - Instagram Style */}
      <div className="px-4 py-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <motion.button
              onClick={handleLike}
              whileTap={{ scale: 0.9 }}
              className={`transition-colors ${
                liked ? 'text-red-500' : 'text-gray-900'
              }`}
            >
              <Heart className={`w-6 h-6 ${liked ? 'fill-current' : ''}`} />
            </motion.button>
            
            <motion.button
              onClick={handleShowComments}
              whileTap={{ scale: 0.9 }}
              className="text-gray-900 hover:text-gray-600 transition-colors"
            >
              <MessageCircle className="w-6 h-6" />
            </motion.button>
            
            <motion.button
              onClick={handleShare}
              whileTap={{ scale: 0.9 }}
              className="text-gray-900 hover:text-gray-600 transition-colors"
            >
              <Share2 className="w-6 h-6" />
            </motion.button>

            <motion.button
              onClick={() => setBookmarked(!bookmarked)}
              whileTap={{ scale: 0.9 }}
              className={`transition-colors ${
                bookmarked ? 'text-amber-500' : 'text-gray-900 hover:text-gray-600'
              }`}
            >
              <Bookmark className={`w-6 h-6 ${bookmarked ? 'fill-current' : ''}`} />
            </motion.button>
          </div>

          <div className="flex items-center gap-3">
            <motion.button
              onClick={() => setShowTokenize(!showTokenize)}
              whileTap={{ scale: 0.9 }}
              className="text-blue-600 hover:text-blue-700 transition-colors"
              title="Tokenize this post"
            >
              <Coins className="w-5 h-5" />
            </motion.button>
            <motion.button
              onClick={() => setShowPredict(!showPredict)}
              whileTap={{ scale: 0.9 }}
              className="text-purple-600 hover:text-purple-700 transition-colors"
              title="Predict on this post"
            >
              <BarChart3 className="w-5 h-5" />
            </motion.button>
          </div>
        </div>

        {/* Likes Count */}
        {likesCount > 0 && (
          <div className="mb-1">
            <span className="font-semibold text-sm text-gray-900">{likesCount.toLocaleString()} likes</span>
          </div>
        )}

        {/* Caption */}
        <div className="mb-1">
          <span className="font-semibold text-sm text-gray-900 mr-2">{post.tokenName}</span>
          {post.title && (
            <span className="text-sm text-gray-900">{post.title}</span>
          )}
          {post.description && (
            <span className="text-sm text-gray-900"> {post.description}</span>
          )}
        </div>

        {/* View Comments Link */}
        {post.commentsCount > 0 && (
          <button
            onClick={handleShowComments}
            className="text-gray-500 text-sm mb-2 hover:text-gray-700 transition-colors"
          >
            View all {post.commentsCount} comments
          </button>
        )}

        {/* Token Price & Invest */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-gray-600">${post.tokenPrice.toFixed(6)}</span>
            {post.tokenPrice > 0 && (
              <TrendingUp className="w-3 h-3 text-green-500" />
            )}
          </div>
          <button
            onClick={handleInvest}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          >
            Invest →
          </button>
        </div>
      </div>

      {/* Tokenize Post Modal */}
      <AnimatePresence>
        {showTokenize && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowTokenize(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">Tokenize This Post</h3>
              <p className="text-gray-600 mb-4">
                Create a tradeable token for this post. Users can invest in the post's success.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    navigate(`/tokenize?postId=${post.postId}`)
                    setShowTokenize(false)
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Create Token
                </button>
                <button
                  onClick={() => setShowTokenize(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Prediction Market Modal */}
      <AnimatePresence>
        {showPredict && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowPredict(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">Create Prediction</h3>
              <p className="text-gray-600 mb-4">
                Create a prediction market for this post. Users can bet on metrics like views, likes, or engagement.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    navigate(`/predictions?postId=${post.postId}`)
                    setShowPredict(false)
                  }}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                >
                  Create Prediction
                </button>
                <button
                  onClick={() => setShowPredict(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comments Section */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-gray-200 bg-gray-50"
          >
            <div className="px-4 py-3 max-h-96 overflow-y-auto">
              {loadingComments ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
                </div>
              ) : (
                <>
                  {isConnected && address && (
                    <div className="mb-4 pb-4 border-b border-gray-200">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-semibold text-xs">
                            {address.slice(2, 4).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 flex gap-2">
                          <input
                            type="text"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handlePostComment()}
                            placeholder="Add a comment..."
                            className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 placeholder-gray-400"
                          />
                          <button
                            onClick={handlePostComment}
                            disabled={!commentText.trim() || postingComment}
                            className="text-blue-600 font-semibold text-sm hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {postingComment ? 'Posting...' : 'Post'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {comments.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500 text-sm">No comments yet. Be the first!</p>
                      </div>
                    ) : (
                      comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white font-semibold text-xs">
                              {comment.userAddress.slice(2, 4).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-sm text-gray-900">
                                {comment.userAddress.slice(0, 6)}...{comment.userAddress.slice(-4)}
                              </span>
                              <span className="text-gray-500 text-xs">
                                {formatTimeAgo(comment.createdAt)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">{comment.commentText}</p>
                          </div>
                        </div>
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
