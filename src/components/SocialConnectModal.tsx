import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Youtube, Instagram, Twitter, Linkedin, Loader, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react'
import { YouTubeIcon, InstagramIcon, TwitterIcon, LinkedInIcon } from '../assets/icons'
import { 
  getYouTubeChannelStats, 
  getInstagramStats, 
  getTwitterStats, 
  getLinkedInStats,
  YouTubeStats,
  SocialStats
} from '../services/socialMediaService'

interface SocialConnectModalProps {
  isOpen: boolean
  onClose: () => void
  onConnect: (data: {
    youtube?: { url: string; stats: YouTubeStats }
    instagram?: { username: string; stats: SocialStats }
    twitter?: { username: string; stats: SocialStats }
    linkedin?: { url: string; stats: SocialStats }
  }) => void
}

const SocialConnectModal: React.FC<SocialConnectModalProps> = ({ isOpen, onClose, onConnect }) => {
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [instagramUsername, setInstagramUsername] = useState('')
  const [twitterUsername, setTwitterUsername] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [success, setSuccess] = useState<{ [key: string]: boolean }>({})

  const handleConnect = async () => {
    setLoading(true)
    setErrors({})
    setSuccess({})

    const results: any = {}

    try {
      // Fetch YouTube stats
      if (youtubeUrl) {
        try {
          const stats = await getYouTubeChannelStats(youtubeUrl)
          if (stats) {
            results.youtube = { url: youtubeUrl, stats }
            setSuccess(prev => ({ ...prev, youtube: true }))
          } else {
            setErrors(prev => ({ ...prev, youtube: 'Could not fetch YouTube data. Check your URL.' }))
          }
        } catch (error) {
          setErrors(prev => ({ ...prev, youtube: 'YouTube API error. Please try again.' }))
        }
      }

      // Fetch Instagram stats
      if (instagramUsername) {
        try {
          const username = instagramUsername.replace('@', '').trim()
          const stats = await getInstagramStats(username)
          if (stats) {
            results.instagram = { username, stats }
            setSuccess(prev => ({ ...prev, instagram: true }))
          } else {
            setErrors(prev => ({ ...prev, instagram: 'Could not fetch Instagram data.' }))
          }
        } catch (error) {
          setErrors(prev => ({ ...prev, instagram: 'Instagram fetch error.' }))
        }
      }

      // Fetch Twitter stats
      if (twitterUsername) {
        try {
          const username = twitterUsername.replace('@', '').trim()
          const stats = await getTwitterStats(username)
          if (stats) {
            results.twitter = { username, stats }
            setSuccess(prev => ({ ...prev, twitter: true }))
          } else {
            setErrors(prev => ({ ...prev, twitter: 'Could not fetch Twitter data.' }))
          }
        } catch (error) {
          setErrors(prev => ({ ...prev, twitter: 'Twitter fetch error.' }))
        }
      }

      // Fetch LinkedIn stats
      if (linkedinUrl) {
        try {
          const stats = await getLinkedInStats(linkedinUrl)
          if (stats) {
            results.linkedin = { url: linkedinUrl, stats }
            setSuccess(prev => ({ ...prev, linkedin: true }))
          } else {
            setErrors(prev => ({ ...prev, linkedin: 'Could not fetch LinkedIn data.' }))
          }
        } catch (error) {
          setErrors(prev => ({ ...prev, linkedin: 'LinkedIn fetch error.' }))
        }
      }

      // If we have at least one successful connection
      if (Object.keys(results).length > 0) {
        onConnect(results)
        setTimeout(() => {
          onClose()
        }, 1500)
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-2xl bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-white/20 shadow-2xl max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-b border-white/10 p-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Connect Your Social Media</h2>
              <p className="text-gray-400 text-sm">We'll fetch your stats automatically using APIs</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* YouTube */}
            <div>
              <label className="flex items-center space-x-2 text-white font-medium mb-3">
                <YouTubeIcon className="w-6 h-6" />
                <span>YouTube Channel</span>
                {success.youtube && <CheckCircle className="w-5 h-5 text-green-400" />}
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="https://youtube.com/@yourchannel or channel URL"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors"
                />
                <ExternalLink className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              </div>
              {errors.youtube && (
                <p className="text-red-400 text-sm mt-2 flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.youtube}</span>
                </p>
              )}
              <p className="text-gray-500 text-xs mt-2">
                We'll fetch your subscriber count, views, and videos using YouTube Data API v3
              </p>
            </div>

            {/* Instagram */}
            <div>
              <label className="flex items-center space-x-2 text-white font-medium mb-3">
                <InstagramIcon className="w-6 h-6" />
                <span>Instagram Username</span>
                {success.instagram && <CheckCircle className="w-5 h-5 text-green-400" />}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">@</span>
                <input
                  type="text"
                  placeholder="username (e.g., rashmika_mandanna)"
                  value={instagramUsername}
                  onChange={(e) => setInstagramUsername(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 transition-colors"
                />
              </div>
              {errors.instagram && (
                <p className="text-red-400 text-sm mt-2 flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.instagram}</span>
                </p>
              )}
              <p className="text-gray-500 text-xs mt-2">
                We'll scrape your public profile to get followers, posts, and following count
              </p>
            </div>

            {/* Twitter/X */}
            <div>
              <label className="flex items-center space-x-2 text-white font-medium mb-3">
                <TwitterIcon className="w-6 h-6" />
                <span>Twitter/X Username</span>
                {success.twitter && <CheckCircle className="w-5 h-5 text-green-400" />}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">@</span>
                <input
                  type="text"
                  placeholder="username (e.g., SarthakNimje)"
                  value={twitterUsername}
                  onChange={(e) => setTwitterUsername(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              {errors.twitter && (
                <p className="text-red-400 text-sm mt-2 flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.twitter}</span>
                </p>
              )}
              <p className="text-gray-500 text-xs mt-2">
                We'll fetch your followers, following, and post count from X/Twitter
              </p>
            </div>

            {/* LinkedIn */}
            <div>
              <label className="flex items-center space-x-2 text-white font-medium mb-3">
                <LinkedInIcon className="w-6 h-6" />
                <span>LinkedIn Profile</span>
                {success.linkedin && <CheckCircle className="w-5 h-5 text-green-400" />}
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="https://linkedin.com/in/yourprofile"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-600 transition-colors"
                />
                <ExternalLink className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              </div>
              {errors.linkedin && (
                <p className="text-red-400 text-sm mt-2 flex items-center space-x-1">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errors.linkedin}</span>
                </p>
              )}
              <p className="text-gray-500 text-xs mt-2">
                We'll fetch your follower count and connection data from LinkedIn
              </p>
            </div>

            {/* Info Box */}
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
              <p className="text-sm text-gray-300">
                <strong className="text-blue-400">Note:</strong> We use official APIs where available (YouTube) and public data scraping for others. 
                Your credentials are never stored. We only fetch public statistics.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-900/95 backdrop-blur-sm border-t border-white/10 p-6 flex items-center justify-between">
            <p className="text-sm text-gray-400">
              At least one social account required
            </p>
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white font-medium transition-colors"
              >
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleConnect}
                disabled={loading || (!youtubeUrl && !instagramUsername && !twitterUsername && !linkedinUrl)}
                className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-xl text-white font-semibold transition-all shadow-lg shadow-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Fetching Data...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Connect & Fetch Stats</span>
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default SocialConnectModal

