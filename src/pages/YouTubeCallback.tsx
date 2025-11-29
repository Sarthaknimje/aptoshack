import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, AlertCircle, Loader } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'

const BACKEND_URL = 'http://localhost:5001'

const YouTubeCallback: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [channelInfo, setChannelInfo] = useState<{title: string, id: string} | null>(null)

  useEffect(() => {
    // If we're on port 5175, redirect to 5180 with same query params
    if (window.location.port === '5175' || window.location.href.includes(':5175')) {
      const currentUrl = new URL(window.location.href)
      currentUrl.port = '5180'
      // Preserve all query parameters
      window.location.replace(currentUrl.toString())
      return
    }
    
    handleCallback()
  }, [])

  const handleCallback = async () => {
    try {
      const code = searchParams.get('code')
      const error = searchParams.get('error')

      if (error) {
        setStatus('error')
        setMessage(`OAuth error: ${error}`)
        return
      }

      if (!code) {
        setStatus('error')
        setMessage('No authorization code received')
        return
      }

      // Send the code to backend - always use port 5180 for redirect URI
      // Even if we're on a different port, tell backend we want 5180
      const redirectOrigin = window.location.port === '5175' 
        ? 'http://localhost:5180' 
        : window.location.origin.replace(':5175', ':5180')
      
      const response = await fetch(`${BACKEND_URL}/auth/youtube/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies in the request
        body: JSON.stringify({ 
          code,
          redirect_uri: `${redirectOrigin}/auth/youtube/callback`
        })
      })

      const result = await response.json()

      if (result.success) {
        setStatus('success')
        setMessage('YouTube channel connected successfully!')
        setChannelInfo({
          title: result.channel_title,
          id: result.channel_id
        })
        
        // Clear URL params and redirect to profile after 2 seconds
        setTimeout(() => {
          window.history.replaceState({}, document.title, '/profile')
          navigate('/profile', { replace: true })
          // Force page reload to refresh YouTube data
          window.location.reload()
        }, 2000)
      } else {
        setStatus('error')
        setMessage(result.error || 'Failed to connect YouTube channel')
      }
    } catch (error: any) {
      setStatus('error')
      setMessage(`Error: ${error.message}`)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-md mx-auto px-6"
      >
        {status === 'loading' && (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <Loader className="w-10 h-10 text-white" />
            </motion.div>
            <h2 className="text-3xl font-bold text-white mb-4">Connecting YouTube...</h2>
            <p className="text-gray-300">Please wait while we verify your YouTube channel</p>
          </>
        )}

        {status === 'success' && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.8, bounce: 0.6 }}
              className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle className="w-10 h-10 text-white" />
            </motion.div>
            <h2 className="text-3xl font-bold text-white mb-4">Success!</h2>
            <p className="text-gray-300 mb-4">{message}</p>
            {channelInfo && (
              <div className="bg-white/10 rounded-xl p-4 mb-6">
                <p className="text-white font-semibold">{channelInfo.title}</p>
                <p className="text-gray-400 text-sm">Channel ID: {channelInfo.id}</p>
              </div>
            )}
            <p className="text-gray-400 text-sm">Redirecting to launchpad...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 bg-gradient-to-r from-red-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Connection Failed</h2>
            <p className="text-gray-300 mb-6">{message}</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/launchpad')}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl text-white font-bold"
            >
              Back to Launchpad
            </motion.button>
          </>
        )}
      </motion.div>
    </div>
  )
}

export default YouTubeCallback