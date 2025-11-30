import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../contexts/WalletContext'
import { usePhoton } from '../contexts/PhotonContext'
import { uploadPremiumContent } from '../services/shelbyService'
import { createPost } from '../services/postService'
import PremiumBackground from '../components/PremiumBackground'
import { 
  Upload, 
  Image as ImageIcon, 
  Video, 
  FileText, 
  Music, 
  Zap,
  X,
  Loader,
  CheckCircle,
  Lock,
  Coins,
  ExternalLink,
  Sparkles
} from 'lucide-react'

const CreatePost: React.FC = () => {
  const navigate = useNavigate()
  const { address, isConnected } = useWallet()
  const { trackRewardedEvent, PHOTON_CAMPAIGNS } = usePhoton()
  const [contentType, setContentType] = useState<'text' | 'image' | 'video' | 'reel' | 'audio'>('text')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [isPremium, setIsPremium] = useState(false)
  const [minimumBalance, setMinimumBalance] = useState(1)
  const [isTokenized, setIsTokenized] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [shelbyExplorerUrl, setShelbyExplorerUrl] = useState<string | null>(null)
  const [shelbyAptosExplorerUrl, setShelbyAptosExplorerUrl] = useState<string | null>(null)
  const [shelbyBlobId, setShelbyBlobId] = useState<string | null>(null)
  const [userTokens, setUserTokens] = useState<any[]>([])

  useEffect(() => {
    if (!isConnected || !address) {
      navigate('/')
      return
    }

    fetch(`http://localhost:5001/api/user-tokens/${address}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.tokens) {
          setUserTokens(data.tokens)
        } else if (data.tokens) {
          setUserTokens(Array.isArray(data.tokens) ? data.tokens : [])
        }
      })
      .catch(err => console.error('Error fetching tokens:', err))
  }, [address, isConnected, navigate])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          setFilePreview(e.target?.result as string)
        }
        reader.readAsDataURL(selectedFile)
      } else if (selectedFile.type.startsWith('video/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          setFilePreview(e.target?.result as string)
        }
        reader.readAsDataURL(selectedFile)
      } else {
        setFilePreview(null)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!address) {
      setError('Wallet not connected')
      return
    }

    if (userTokens.length === 0) {
      setError('You need to create a token first. Go to Tokenize page to create your creator token.')
      return
    }

    const token = userTokens[0]

    try {
      setCreating(true)

      let shelbyBlobId: string | undefined
      let shelbyBlobUrl: string | undefined

      if (file && contentType !== 'text') {
        setUploading(true)
        const blobName = `post_${token.token_symbol}_${Date.now()}`
        const uploadResult = await uploadPremiumContent(file, blobName, 365)
        shelbyBlobId = uploadResult.blobId
        shelbyBlobUrl = uploadResult.blobUrl
        setShelbyExplorerUrl(uploadResult.explorerUrl || `https://explorer.shelbynet.shelby.xyz/blob/${uploadResult.blobId}`)
        setShelbyAptosExplorerUrl(uploadResult.aptosExplorerUrl)
        setShelbyBlobId(uploadResult.blobId)
        setUploading(false)
      }

      const tokenId = token.token_id || token.content_id || token.id
      
      if (!tokenId) {
        setError('Token ID not found. Please create a token first.')
        setCreating(false)
        return
      }

      const result = await createPost({
        creatorAddress: address,
        tokenId: String(tokenId),
        contentType,
        shelbyBlobId,
        shelbyBlobUrl,
        title,
        description,
        isPremium: isPremium || isTokenized,
        minimumBalance: isTokenized ? 1 : minimumBalance
      })

      if (result.success) {
        setSuccess(true)
        try {
          await trackRewardedEvent(
            'post_created',
            PHOTON_CAMPAIGNS.CREATE_TOKEN || 'ea3bcaca-9ce4-4b54-b803-8b9be1f142ba',
            { post_id: result.postId, content_type: contentType, is_tokenized: isTokenized }
          )
        } catch (err) {
          console.error('Failed to reward PAT token for post creation:', err)
        }
      } else {
        setError(result.error || 'Failed to create post')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setCreating(false)
      setUploading(false)
    }
  }

  if (!isConnected || !address) {
    return null
  }

  const contentTypes = [
    { 
      value: 'text', 
      label: 'Text', 
      icon: FileText,
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-500/20 to-cyan-500/20'
    },
    { 
      value: 'image', 
      label: 'Image', 
      icon: ImageIcon,
      gradient: 'from-green-500 to-emerald-500',
      bgGradient: 'from-green-500/20 to-emerald-500/20'
    },
    { 
      value: 'video', 
      label: 'Video', 
      icon: Video,
      gradient: 'from-red-500 to-pink-500',
      bgGradient: 'from-red-500/20 to-pink-500/20'
    },
    { 
      value: 'reel', 
      label: 'Reel', 
      icon: Zap,
      gradient: 'from-amber-500 to-orange-500',
      bgGradient: 'from-amber-500/20 to-orange-500/20'
    },
    { 
      value: 'audio', 
      label: 'Audio', 
      icon: Music,
      gradient: 'from-purple-500 to-pink-500',
      bgGradient: 'from-purple-500/20 to-pink-500/20'
    }
  ]

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
      <PremiumBackground variant="purple" />
      
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-transparent to-transparent pointer-events-none" />
      
      <main className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 bg-gradient-to-r from-purple-600 via-violet-600 to-amber-500 rounded-xl flex items-center justify-center shadow-lg"
            >
              <Sparkles className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">
                Create <span className="bg-gradient-to-r from-purple-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">Post</span>
              </h1>
              <p className="text-gray-400">Share content with your community</p>
            </div>
          </div>
        </motion.div>

        {userTokens.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center shadow-2xl"
          >
            <Coins className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Token Found</h3>
            <p className="text-gray-400 mb-6">
              You need to create a creator token first before posting.
            </p>
            <motion.button
              onClick={() => navigate('/tokenize')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 via-violet-600 to-amber-500 text-white rounded-lg font-semibold shadow-lg hover:shadow-purple-500/50 transition-all"
            >
              Create Token
            </motion.button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Content Type - Beautiful Animated Selection */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl"
            >
              <label className="text-sm font-semibold text-gray-300 mb-4 block flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Content Type
              </label>
              <div className="grid grid-cols-5 gap-3">
                <AnimatePresence mode="wait">
                  {contentTypes.map(({ value, label, icon: Icon, gradient, bgGradient }) => {
                    const isSelected = contentType === value
                    return (
                      <motion.button
                        key={value}
                        type="button"
                        onClick={() => {
                          setContentType(value as any)
                          if (value === 'text') {
                            setFile(null)
                            setFilePreview(null)
                          }
                        }}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`relative flex flex-col items-center gap-2 p-4 rounded-xl transition-all border overflow-hidden group ${
                          isSelected
                            ? `bg-gradient-to-br ${bgGradient} border-purple-500/50 text-white shadow-lg shadow-purple-500/30`
                            : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/20'
                        }`}
                      >
                        {/* Animated gradient background for selected */}
                        {isSelected && (
                          <motion.div
                            className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-20`}
                            animate={{
                              backgroundPosition: ['0% 0%', '100% 100%'],
                            }}
                            transition={{
                              duration: 3,
                              repeat: Infinity,
                              repeatType: 'reverse',
                            }}
                          />
                        )}
                        
                        {/* SVG decoration */}
                        {isSelected && (
                          <motion.svg
                            className="absolute inset-0 w-full h-full"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            <defs>
                              <linearGradient id={`gradient-${value}`} x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
                                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                              </linearGradient>
                            </defs>
                            <motion.rect
                              width="100%"
                              height="100%"
                              fill={`url(#gradient-${value})`}
                              animate={{
                                opacity: [0.3, 0.6, 0.3],
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut",
                              }}
                            />
                          </motion.svg>
                        )}
                        
                        <motion.div
                          className={`relative z-10 ${isSelected ? 'text-white' : ''}`}
                          animate={isSelected ? {
                            scale: [1, 1.1, 1],
                          } : {}}
                          transition={{
                            duration: 2,
                            repeat: isSelected ? Infinity : 0,
                            ease: "easeInOut",
                          }}
                        >
                          <Icon className="w-6 h-6" />
                        </motion.div>
                        <span className={`text-xs font-semibold relative z-10 ${isSelected ? 'text-white' : ''}`}>
                          {label}
                        </span>
                        
                        {/* Glow effect for selected */}
                        {isSelected && (
                          <motion.div
                            className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-30 blur-xl -z-10`}
                            animate={{
                              scale: [1, 1.2, 1],
                              opacity: [0.3, 0.5, 0.3],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }}
                          />
                        )}
                      </motion.button>
                    )
                  })}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl"
            >
              <label className="text-sm font-semibold text-gray-300 mb-2 block">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter post title..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                required
              />
            </motion.div>

            {/* Description */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl"
            >
              <label className="text-sm font-semibold text-gray-300 mb-2 block">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's on your mind?"
                rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 resize-none transition-all"
                required
              />
            </motion.div>

            {/* File Upload */}
            {contentType !== 'text' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl"
              >
                <label className="text-sm font-semibold text-gray-300 mb-4 block">
                  Upload {contentType === 'image' ? 'Image' : contentType === 'video' ? 'Video' : contentType === 'reel' ? 'Reel' : 'Audio'}
                </label>
                <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-purple-500/50 transition-all bg-white/5 backdrop-blur-sm">
                  {filePreview ? (
                    <div className="relative">
                      {contentType === 'image' ? (
                        <motion.img
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          src={filePreview}
                          alt="Preview"
                          className="max-w-full max-h-64 mx-auto rounded-xl shadow-lg"
                        />
                      ) : (
                        <motion.video
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          src={filePreview}
                          controls
                          className="max-w-full max-h-64 mx-auto rounded-xl shadow-lg"
                        />
                      )}
                      <motion.button
                        type="button"
                        onClick={() => {
                          setFile(null)
                          setFilePreview(null)
                        }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="absolute top-2 right-2 p-2 bg-red-500 rounded-full hover:bg-red-600 text-white shadow-lg"
                      >
                        <X className="w-4 h-4" />
                      </motion.button>
                    </div>
                  ) : (
                    <div>
                      <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      </motion.div>
                      <label className="cursor-pointer">
                        <span className="text-purple-400 hover:text-purple-300 font-semibold">Click to upload</span>
                        <input
                          type="file"
                          onChange={handleFileChange}
                          accept={
                            contentType === 'image' ? 'image/*' :
                            contentType === 'video' || contentType === 'reel' ? 'video/*' :
                            contentType === 'audio' ? 'audio/*' : '*'
                          }
                          className="hidden"
                          required
                        />
                      </label>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Tokenization Option */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <Coins className="w-5 h-5 text-purple-400" />
                <label className="text-sm font-semibold text-gray-300">Post Tokenization</label>
              </div>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isTokenized}
                    onChange={(e) => setIsTokenized(e.target.checked)}
                    className="w-5 h-5 rounded border-white/10 bg-white/5 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-gray-300">Tokenize this post (users need to purchase post tokens to view)</span>
                </label>
                {isTokenized && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4"
                  >
                    <p className="text-sm text-purple-300">
                      When enabled, users must purchase tokens for this post to view it. This creates a separate token for the post.
                    </p>
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* Premium Settings */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <Lock className="w-5 h-5 text-amber-400" />
                <label className="text-sm font-semibold text-gray-300">Premium Content</label>
              </div>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPremium}
                    onChange={(e) => setIsPremium(e.target.checked)}
                    disabled={isTokenized}
                    className="w-5 h-5 rounded border-white/10 bg-white/5 text-purple-600 focus:ring-purple-500 disabled:opacity-50"
                  />
                  <span className="text-gray-300">Require token ownership to view</span>
                </label>
                {isPremium && !isTokenized && (
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Minimum Balance Required</label>
                    <input
                      type="number"
                      value={minimumBalance}
                      onChange={(e) => setMinimumBalance(parseFloat(e.target.value) || 1)}
                      min={1}
                      step={0.1}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Users need at least {minimumBalance} {userTokens[0]?.token_symbol || 'tokens'} to view this content
                    </p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Error/Success */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 text-red-400"
                >
                  {error}
                </motion.div>
              )}

              {success && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-green-500/20 border border-green-500/30 rounded-lg p-6 text-green-400"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-semibold">Post created successfully! +1 PAT token rewarded</span>
                  </div>
                  
                  {shelbyBlobId && (
                    <div className="space-y-3 text-sm">
                      <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                        <div className="text-gray-300 mb-2 font-semibold">Shelby Storage Details:</div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Blob ID:</span>
                            <code className="text-green-300 text-xs bg-green-500/20 px-2 py-1 rounded">{shelbyBlobId}</code>
                          </div>
                          {shelbyExplorerUrl && (
                            <a
                              href={shelbyExplorerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
                            >
                              <ExternalLink className="w-4 h-4" />
                              <span>View on Shelby Explorer</span>
                            </a>
                          )}
                          {shelbyAptosExplorerUrl && (
                            <a
                              href={shelbyAptosExplorerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
                            >
                              <ExternalLink className="w-4 h-4" />
                              <span>View on Aptos Explorer</span>
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => navigate('/feed')}
                          className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 via-violet-600 to-amber-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all"
                        >
                          Go to Feed
                        </button>
                        <button
                          onClick={() => {
                            setSuccess(false)
                            setShelbyExplorerUrl(null)
                            setShelbyAptosExplorerUrl(null)
                            setShelbyBlobId(null)
                            setTitle('')
                            setDescription('')
                            setFile(null)
                            setFilePreview(null)
                          }}
                          className="px-4 py-2 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition-colors"
                        >
                          Create Another
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={creating || uploading}
              whileHover={{ scale: creating || uploading ? 1 : 1.02 }}
              whileTap={{ scale: creating || uploading ? 1 : 0.98 }}
              className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 via-violet-600 to-amber-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-2xl hover:shadow-purple-500/50 transition-all"
            >
              {uploading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Uploading to Shelby...
                </>
              ) : creating ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Creating Post...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Create Post
                </>
              )}
            </motion.button>
          </form>
        )}
      </main>
    </div>
  )
}

export default CreatePost
