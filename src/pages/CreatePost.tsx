import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '../contexts/WalletContext'
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
  Coins
} from 'lucide-react'

const CreatePost: React.FC = () => {
  const navigate = useNavigate()
  const { address, isConnected } = useWallet()
  const [contentType, setContentType] = useState<'text' | 'image' | 'video' | 'reel' | 'audio'>('text')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)
  const [isPremium, setIsPremium] = useState(false)
  const [minimumBalance, setMinimumBalance] = useState(1)
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

    // Fetch user's tokens
    fetch(`http://localhost:5001/api/user-tokens/${address}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.tokens) {
          setUserTokens(data.tokens)
        } else if (data.tokens) {
          // Handle different response format
          setUserTokens(Array.isArray(data.tokens) ? data.tokens : [])
        }
      })
      .catch(err => console.error('Error fetching tokens:', err))
  }, [address, isConnected, navigate])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      
      // Create preview
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

    // Use first token (each creator has one coin)
    const token = userTokens[0]

    try {
      setCreating(true)

      let shelbyBlobId: string | undefined
      let shelbyBlobUrl: string | undefined

      // Upload file to Shelby if provided
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

      // Create post
      // Use token_id or content_id (they should be the same)
      const tokenId = token.token_id || token.content_id || token.id
      
      if (!tokenId) {
        setError('Token ID not found. Please create a token first.')
        setCreating(false)
        return
      }

      console.log('Creating post with:', {
        creatorAddress: address,
        tokenId,
        contentType,
        title,
        description,
        isPremium,
        minimumBalance,
        shelbyBlobId,
        shelbyBlobUrl
      })

      const result = await createPost({
        creatorAddress: address,
        tokenId: String(tokenId), // Ensure it's a string
        contentType,
        shelbyBlobId,
        shelbyBlobUrl,
        title,
        description,
        isPremium,
        minimumBalance
      })

      if (result.success) {
        setSuccess(true)
        // Don't auto-navigate, show success with Shelby links
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

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative">
      <PremiumBackground variant="purple" />
      
      <main className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Create <span className="bg-gradient-to-r from-purple-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">Post</span>
          </h1>
          <p className="text-gray-400">Share content with your community</p>
        </motion.div>

        {userTokens.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-8 text-center">
            <Coins className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Token Found</h3>
            <p className="text-gray-400 mb-6">
              You need to create a creator token first before posting.
            </p>
            <motion.button
              onClick={() => navigate('/tokenize')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-lg font-semibold"
            >
              Create Token
            </motion.button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Content Type */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
              <label className="text-sm font-semibold text-gray-300 mb-4 block">Content Type</label>
              <div className="grid grid-cols-5 gap-3">
                {[
                  { value: 'text', label: 'Text', icon: FileText },
                  { value: 'image', label: 'Image', icon: ImageIcon },
                  { value: 'video', label: 'Video', icon: Video },
                  { value: 'reel', label: 'Reel', icon: Zap },
                  { value: 'audio', label: 'Audio', icon: Music }
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setContentType(value as any)
                      if (value === 'text') {
                        setFile(null)
                        setFilePreview(null)
                      }
                    }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg transition-all ${
                      contentType === value
                        ? 'bg-purple-500/20 text-amber-400 border border-purple-500/30'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-xs font-semibold">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
              <label className="text-sm font-semibold text-gray-300 mb-2 block">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter post title..."
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50"
                required
              />
            </div>

            {/* Description */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
              <label className="text-sm font-semibold text-gray-300 mb-2 block">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's on your mind?"
                rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 resize-none"
                required
              />
            </div>

            {/* File Upload */}
            {contentType !== 'text' && (
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
                <label className="text-sm font-semibold text-gray-300 mb-4 block">
                  Upload {contentType === 'image' ? 'Image' : contentType === 'video' ? 'Video' : contentType === 'reel' ? 'Reel' : 'Audio'}
                </label>
                <div className="border-2 border-dashed border-white/10 rounded-lg p-8 text-center hover:border-purple-500/30 transition-colors">
                  {filePreview ? (
                    <div className="relative">
                      {contentType === 'image' ? (
                        <img src={filePreview} alt="Preview" className="max-w-full max-h-64 mx-auto rounded-lg" />
                      ) : (
                        <video src={filePreview} controls className="max-w-full max-h-64 mx-auto rounded-lg" />
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setFile(null)
                          setFilePreview(null)
                        }}
                        className="absolute top-2 right-2 p-2 bg-red-500/80 rounded-full hover:bg-red-500"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-12 h-12 text-gray-500 mx-auto mb-4" />
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
              </div>
            )}

            {/* Premium Settings */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
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
                    className="w-5 h-5 rounded border-white/10 bg-white/5 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-gray-300">Require token ownership to view</span>
                </label>
                {isPremium && (
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">Minimum Balance Required</label>
                    <input
                      type="number"
                      value={minimumBalance}
                      onChange={(e) => setMinimumBalance(parseFloat(e.target.value) || 1)}
                      min={1}
                      step={0.1}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500/50"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Users need at least {minimumBalance} {userTokens[0]?.token_symbol || 'tokens'} to view this content
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Error/Success */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 text-red-400">
                {error}
              </div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-500/20 border border-green-500/30 rounded-lg p-6 text-green-400"
              >
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-semibold">Post created successfully!</span>
                </div>
                
                {shelbyBlobId && (
                  <div className="space-y-3 text-sm">
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="text-gray-300 mb-2">Shelby Storage Details:</div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Blob ID:</span>
                          <code className="text-green-300 text-xs">{shelbyBlobId}</code>
                        </div>
                        {shelbyExplorerUrl && (
                          <a
                            href={shelbyExplorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-green-400 hover:text-green-300 transition-colors"
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
                            className="flex items-center gap-2 text-green-400 hover:text-green-300 transition-colors"
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
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
                      >
                        Go to Feed
                      </button>
                      <button
                        onClick={() => {
                          setSuccess(false)
                          setShelbyExplorerUrl(null)
                          setShelbyAptosExplorerUrl(null)
                          setShelbyBlobId(null)
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

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={creating || uploading}
              whileHover={{ scale: creating || uploading ? 1 : 1.05 }}
              whileTap={{ scale: creating || uploading ? 1 : 0.95 }}
              className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

