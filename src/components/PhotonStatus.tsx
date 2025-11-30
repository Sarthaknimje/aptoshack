/**
 * Photon Status Component
 * Monitor Photon integration status, events, and rewards
 */

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePhoton } from '../contexts/PhotonContext'
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Gift, 
  Activity, 
  Wallet,
  User,
  Zap,
  Eye,
  TrendingUp,
  TrendingDown,
  RefreshCw
} from 'lucide-react'

interface EventLog {
  id: string
  type: 'rewarded' | 'unrewarded'
  eventType: string
  timestamp: Date
  tokenAmount?: number
  success: boolean
  error?: string
}

const PhotonStatus: React.FC = () => {
  const { 
    photonUser, 
    photonWallet, 
    photonTokens, 
    isPhotonRegistered, 
    isLoading 
  } = usePhoton()
  
  const [eventLogs, setEventLogs] = useState<EventLog[]>([])
  const [isExpanded, setIsExpanded] = useState(false)
  const [showLogs, setShowLogs] = useState(false)

  // Listen for Photon events in console
  useEffect(() => {
    const originalLog = console.log
    const originalWarn = console.warn
    const originalError = console.error

    const handleLog = (message: string) => {
      if (typeof message === 'string') {
        // Detect Photon events
        if (message.includes('Photon') || message.includes('PAT tokens') || message.includes('event triggered')) {
          const isRewarded = message.includes('Rewarded event') || message.includes('PAT tokens')
          const isError = message.includes('❌') || message.includes('Error')
          
          // Extract event type
          let eventType = 'unknown'
          if (message.includes('token_purchase')) eventType = 'Token Purchase'
          else if (message.includes('token_sell')) eventType = 'Token Sell'
          else if (message.includes('view_content')) eventType = 'Content View'
          else if (message.includes('create_token')) eventType = 'Token Creation'
          else if (message.includes('login')) eventType = 'Login'
          
          // Extract token amount
          const tokenMatch = message.match(/(\d+\.?\d*)\s*PAT tokens?/i)
          const tokenAmount = tokenMatch ? parseFloat(tokenMatch[1]) : undefined
          
          setEventLogs(prev => [{
            id: Date.now().toString(),
            type: isRewarded ? 'rewarded' : 'unrewarded',
            eventType,
            timestamp: new Date(),
            tokenAmount,
            success: !isError
          }, ...prev].slice(0, 20)) // Keep last 20 events
        }
      }
    }

    // Override console methods
    console.log = (...args) => {
      originalLog(...args)
      args.forEach(arg => handleLog(String(arg)))
    }

    console.warn = (...args) => {
      originalWarn(...args)
      args.forEach(arg => handleLog(String(arg)))
    }

    console.error = (...args) => {
      originalError(...args)
      args.forEach(arg => handleLog(String(arg)))
    }

    return () => {
      console.log = originalLog
      console.warn = originalWarn
      console.error = originalError
    }
  }, [])

  const totalRewards = eventLogs
    .filter(log => log.type === 'rewarded' && log.tokenAmount)
    .reduce((sum, log) => sum + (log.tokenAmount || 0), 0)

  const recentEvents = eventLogs.slice(0, 5)
  const successCount = eventLogs.filter(log => log.success).length
  const errorCount = eventLogs.filter(log => !log.success).length

  if (!isPhotonRegistered && !isLoading) {
    return null // Don't show if not registered
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div 
          className="px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : isPhotonRegistered ? (
                <CheckCircle2 className="w-4 h-4 text-green-300" />
              ) : (
                <XCircle className="w-4 h-4 text-red-300" />
              )}
              <span className="text-white font-semibold text-sm">
                Photon {isPhotonRegistered ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {totalRewards > 0 && (
                <span className="text-yellow-300 text-xs font-medium">
                  {totalRewards.toFixed(2)} PAT
                </span>
              )}
              <RefreshCw className={`w-3 h-3 text-white transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </div>

        {/* Expanded Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
                {/* Status Cards */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-800/50 rounded p-2">
                    <div className="text-xs text-gray-400">Status</div>
                    <div className="text-sm font-medium text-white">
                      {isPhotonRegistered ? 'Registered' : 'Not Registered'}
                    </div>
                  </div>
                  <div className="bg-gray-800/50 rounded p-2">
                    <div className="text-xs text-gray-400">Total Rewards</div>
                    <div className="text-sm font-medium text-yellow-400">
                      {totalRewards.toFixed(2)} PAT
                    </div>
                  </div>
                  <div className="bg-gray-800/50 rounded p-2">
                    <div className="text-xs text-gray-400">Events</div>
                    <div className="text-sm font-medium text-green-400">
                      {successCount} success
                    </div>
                  </div>
                  <div className="bg-gray-800/50 rounded p-2">
                    <div className="text-xs text-gray-400">Errors</div>
                    <div className="text-sm font-medium text-red-400">
                      {errorCount}
                    </div>
                  </div>
                </div>

                {/* User Info */}
                {photonUser && (
                  <div className="bg-gray-800/50 rounded p-3 space-y-1">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <User className="w-3 h-3" />
                      <span>Photon User</span>
                    </div>
                    <div className="text-sm font-mono text-white truncate">
                      {photonUser.id.slice(0, 8)}...
                    </div>
                  </div>
                )}

                {/* Wallet Info */}
                {photonWallet && (
                  <div className="bg-gray-800/50 rounded p-3 space-y-1">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Wallet className="w-3 h-3" />
                      <span>Embedded Wallet</span>
                    </div>
                    <div className="text-sm font-mono text-white truncate">
                      {photonWallet.walletAddress.slice(0, 10)}...
                    </div>
                  </div>
                )}

                {/* Event Logs Toggle */}
                <button
                  onClick={() => setShowLogs(!showLogs)}
                  className="w-full bg-gray-800/50 hover:bg-gray-800 rounded p-2 text-sm text-gray-300 flex items-center justify-between transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Event Logs ({eventLogs.length})
                  </span>
                  <Eye className="w-4 h-4" />
                </button>

                {/* Event Logs */}
                <AnimatePresence>
                  {showLogs && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-2"
                    >
                      {eventLogs.length === 0 ? (
                        <div className="text-center text-gray-500 text-xs py-4">
                          No events yet. Events will appear here as they occur.
                        </div>
                      ) : (
                        eventLogs.map((log) => (
                          <div
                            key={log.id}
                            className={`bg-gray-800/50 rounded p-2 text-xs ${
                              log.success ? 'border-l-2 border-green-500' : 'border-l-2 border-red-500'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1">
                                {log.type === 'rewarded' ? (
                                  <Gift className="w-3 h-3 text-yellow-400" />
                                ) : (
                                  <Activity className="w-3 h-3 text-blue-400" />
                                )}
                                <span className="font-medium text-white">{log.eventType}</span>
                                <span className={`text-[10px] px-1 py-0.5 rounded ${
                                  log.type === 'rewarded' 
                                    ? 'bg-yellow-900/50 text-yellow-300' 
                                    : 'bg-blue-900/50 text-blue-300'
                                }`}>
                                  {log.type === 'rewarded' ? 'Rewarded' : 'Tracked'}
                                </span>
                              </div>
                              {log.tokenAmount !== undefined && log.tokenAmount > 0 ? (
                                <span className="text-yellow-400 font-medium">
                                  +{log.tokenAmount} PAT
                                </span>
                              ) : log.type === 'rewarded' ? (
                                <span className="text-gray-500 text-[10px]">0 PAT</span>
                              ) : (
                                <span className="text-gray-500 text-[10px]">No reward</span>
                              )}
                            </div>
                            <div className="text-gray-400 text-[10px]">
                              {log.timestamp.toLocaleTimeString()} • {log.timestamp.toLocaleDateString()}
                            </div>
                            {log.error && (
                              <div className="text-red-400 mt-1 text-[10px]">{log.error}</div>
                            )}
                          </div>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Activity Types Info */}
                <div className="bg-blue-900/30 border border-blue-700/50 rounded p-3">
                  <div className="text-xs font-semibold text-blue-300 mb-2 flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    Tracked Activities
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <div className="text-yellow-400 font-medium mb-1">💰 Rewarded (Get PAT Tokens):</div>
                      <div className="text-gray-300 space-y-0.5 ml-2">
                        <div>• Token Purchase → PAT tokens</div>
                        <div>• Token Sell → PAT tokens</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-blue-400 font-medium mb-1">📊 Unrewarded (Tracking Only):</div>
                      <div className="text-gray-300 space-y-0.5 ml-2">
                        <div>• Content View → 0 tokens</div>
                        <div>• Token Creation → 0 tokens</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                {recentEvents.length > 0 && (
                  <div className="bg-gray-800/50 rounded p-3">
                    <div className="text-xs text-gray-400 mb-2">Recent Activity</div>
                    <div className="space-y-1">
                      {recentEvents.map((log) => (
                        <div key={log.id} className="flex items-center justify-between text-xs">
                          <span className="text-gray-300">{log.eventType}</span>
                          <div className="flex items-center gap-1">
                            {log.success ? (
                              <CheckCircle2 className="w-3 h-3 text-green-400" />
                            ) : (
                              <XCircle className="w-3 h-3 text-red-400" />
                            )}
                            {log.tokenAmount !== undefined && log.tokenAmount > 0 ? (
                              <span className="text-yellow-400 font-medium">+{log.tokenAmount} PAT</span>
                            ) : log.type === 'rewarded' ? (
                              <span className="text-gray-500 text-[10px]">0 PAT</span>
                            ) : (
                              <span className="text-gray-500 text-[10px]">Tracked</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

export default PhotonStatus

