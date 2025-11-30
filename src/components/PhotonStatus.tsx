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
  RefreshCw,
  ExternalLink,
  Globe,
  BookOpen
} from 'lucide-react'
import { PHOTON_LINKS } from '../services/photonService'

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

    const handleLog = (message: string, ...args: any[]) => {
      if (typeof message === 'string') {
        // Detect Photon events
        const isPhotonEvent = message.includes('Photon') || 
                             message.includes('PAT tokens') || 
                             message.includes('event tracked') ||
                             message.includes('event triggered') ||
                             message.includes('Rewarded event') ||
                             message.includes('Unrewarded event') ||
                             message.includes('Photon Event Details')
        
        if (isPhotonEvent) {
          let isRewarded = message.includes('Rewarded event') || 
                            message.includes('PAT tokens') ||
                            message.includes('token_purchase') ||
                            message.includes('token_sell')
          const isError = message.includes('❌') || message.includes('Error')
          
          // Extract event type from various patterns
          let eventType = 'unknown'
          let tokenAmount: number | undefined = undefined
          
          // Try to extract from "eventType=eventType" pattern (new format)
          const eventTypeMatch = message.match(/eventType=(\w+)/i)
          if (eventTypeMatch) {
            const eventTypeValue = eventTypeMatch[1]
            const eventTypeMap: Record<string, string> = {
              'token_purchase': 'Token Purchase',
              'token_sell': 'Token Sell',
              'view_content': 'Content View',
              'create_token': 'Token Creation',
              'login': 'Login',
              'token_share': 'Token Share'
            }
            eventType = eventTypeMap[eventTypeValue] || eventTypeValue.charAt(0).toUpperCase() + eventTypeValue.slice(1).replace(/_/g, ' ')
          }
          
          // Try to extract from "event tracked: eventType" pattern
          if (eventType === 'unknown') {
            const trackedMatch = message.match(/event tracked:\s*eventType=(\w+)/i) || 
                                message.match(/event tracked:\s*(\w+)/i)
            if (trackedMatch) {
              const eventTypeValue = trackedMatch[1]
              const eventTypeMap: Record<string, string> = {
                'token_purchase': 'Token Purchase',
                'token_sell': 'Token Sell',
                'view_content': 'Content View',
                'create_token': 'Token Creation',
                'login': 'Login',
                'token_share': 'Token Share'
              }
              eventType = eventTypeMap[eventTypeValue] || eventTypeValue.charAt(0).toUpperCase() + eventTypeValue.slice(1).replace(/_/g, ' ')
            }
          }
          
          // Try to parse JSON from "Photon Event Details:" logs
          if (eventType === 'unknown' && message.includes('Photon Event Details:')) {
            try {
              // Find JSON object in the message
              const jsonMatch = message.match(/\{.*\}/s)
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0])
                if (parsed.eventType) {
                  const eventTypeMap: Record<string, string> = {
                    'token_purchase': 'Token Purchase',
                    'token_sell': 'Token Sell',
                    'view_content': 'Content View',
                    'create_token': 'Token Creation',
                    'login': 'Login',
                    'token_share': 'Token Share'
                  }
                  eventType = eventTypeMap[parsed.eventType] || parsed.eventType.charAt(0).toUpperCase() + parsed.eventType.slice(1).replace(/_/g, ' ')
                  if (parsed.tokenAmount !== undefined) {
                    tokenAmount = parsed.tokenAmount
                  }
                  // Update isRewarded based on parsed type
                  if (parsed.type === 'rewarded') {
                    isRewarded = true
                  }
                }
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
          
          // Try to extract from "eventType:" in object logs
          if (eventType === 'unknown') {
            const eventTypeMatch = message.match(/["']?eventType["']?\s*:\s*["']?(\w+)["']?/i)
            if (eventTypeMatch) {
              const eventTypeValue = eventTypeMatch[1]
              const eventTypeMap: Record<string, string> = {
                'token_purchase': 'Token Purchase',
                'token_sell': 'Token Sell',
                'create_token': 'Token Creation',
                'view_content': 'Content View',
                'login': 'Login',
                'token_share': 'Token Share',
                'share_token': 'Token Share'
              }
              eventType = eventTypeMap[eventTypeValue] || eventTypeValue.charAt(0).toUpperCase() + eventTypeValue.slice(1).replace(/_/g, ' ')
            }
          }
          
          // Fallback: try to find event type in the message
          if (eventType === 'unknown') {
            if (message.includes('token_purchase')) {
              eventType = 'Token Purchase'
              isRewarded = true
            }
            else if (message.includes('token_sell')) {
              eventType = 'Token Sell'
              isRewarded = true
            }
            else if (message.includes('create_token')) {
              eventType = 'Token Creation'
              isRewarded = true
            }
            else if (message.includes('view_content')) eventType = 'Content View'
            else if (message.includes('login')) eventType = 'Login'
            else if (message.includes('token_share') || message.includes('share_token')) eventType = 'Token Share'
          }
          
          // Extract token amount from various patterns
          const tokenMatch = message.match(/(\d+\.?\d*)\s*PAT tokens?/i) ||
                           message.match(/token_amount["']?\s*:\s*(\d+\.?\d*)/i)
          if (tokenMatch) {
            tokenAmount = parseFloat(tokenMatch[1])
          }
          
          // Also check args for object data
          args.forEach(arg => {
            if (typeof arg === 'object' && arg !== null) {
              try {
                const objStr = JSON.stringify(arg)
                if (objStr.includes('eventType')) {
                  const parsed = JSON.parse(objStr)
                  if (parsed.eventType) {
                    const eventTypeMap: Record<string, string> = {
                      'token_purchase': 'Token Purchase',
                      'token_sell': 'Token Sell',
                      'view_content': 'Content View',
                      'create_token': 'Token Creation',
                      'login': 'Login',
                      'token_share': 'Token Share'
                    }
                    eventType = eventTypeMap[parsed.eventType] || parsed.eventType.charAt(0).toUpperCase() + parsed.eventType.slice(1).replace(/_/g, ' ')
                  }
                  if (parsed.token_amount !== undefined) {
                    tokenAmount = parsed.token_amount
                  }
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          })
          
          // Only add if we have a valid event type
          if (eventType !== 'unknown') {
            setEventLogs(prev => [{
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              type: isRewarded ? 'rewarded' : 'unrewarded',
              eventType,
              timestamp: new Date(),
              tokenAmount,
              success: !isError
            }, ...prev].slice(0, 50)) // Keep last 50 events
          }
        }
      }
    }

    // Override console methods
    console.log = (...args) => {
      originalLog(...args)
      // Try to handle as string first, then pass all args
      args.forEach((arg, index) => {
        if (typeof arg === 'string') {
          handleLog(arg, ...args)
        } else {
          // For objects, stringify and check
          try {
            const str = JSON.stringify(arg)
            handleLog(str, ...args)
          } catch (e) {
            handleLog(String(arg), ...args)
          }
        }
      })
    }

    console.warn = (...args) => {
      originalWarn(...args)
      args.forEach((arg, index) => {
        if (typeof arg === 'string') {
          handleLog(arg, ...args)
        } else {
          try {
            const str = JSON.stringify(arg)
            handleLog(str, ...args)
          } catch (e) {
            handleLog(String(arg), ...args)
          }
        }
      })
    }

    console.error = (...args) => {
      originalError(...args)
      args.forEach((arg, index) => {
        if (typeof arg === 'string') {
          handleLog(arg, ...args)
        } else {
          try {
            const str = JSON.stringify(arg)
            handleLog(str, ...args)
          } catch (e) {
            handleLog(String(arg), ...args)
          }
        }
      })
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
                        <div>• Token Creation → PAT tokens</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-blue-400 font-medium mb-1">📊 Unrewarded (Tracking Only):</div>
                      <div className="text-gray-300 space-y-0.5 ml-2">
                        <div>• Content View → 0 tokens</div>
                        <div>• Login → 0 tokens</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* External Links */}
                <div className="bg-gray-800/50 rounded p-3 space-y-2">
                  <div className="text-xs font-semibold text-gray-300 mb-2 flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    External Links
                  </div>
                  <div className="space-y-1.5">
                    <a
                      href={PHOTON_LINKS.API_BASE}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        API Base URL
                      </span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <a
                      href={PHOTON_LINKS.DASHBOARD}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between text-xs text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        Photon Dashboard
                      </span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <a
                      href={PHOTON_LINKS.API_DOCS}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between text-xs text-green-400 hover:text-green-300 transition-colors"
                    >
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        API Documentation
                      </span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <a
                      href={PHOTON_LINKS.EXPLORER}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between text-xs text-yellow-400 hover:text-yellow-300 transition-colors"
                    >
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        Aptos Explorer
                      </span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-2 pt-2 border-t border-gray-700">
                    Note: Dashboard access requires Photon team approval
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

