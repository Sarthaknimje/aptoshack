import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X, CheckCircle, Coins } from 'lucide-react'

interface PatRewardNotificationProps {
  show: boolean
  amount: number
  eventType: 'token_created' | 'token_purchase' | 'token_sell' | 'post_created'
  onClose: () => void
}

const PatRewardNotification: React.FC<PatRewardNotificationProps> = ({
  show,
  amount,
  eventType,
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(show)

  useEffect(() => {
    setIsVisible(show)
    if (show) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(onClose, 500)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [show, onClose])

  const eventLabels = {
    token_created: 'Token Created',
    token_purchase: 'Token Purchased',
    token_sell: 'Token Sold',
    post_created: 'Post Created'
  }

  const eventIcons = {
    token_created: Sparkles,
    token_purchase: Coins,
    token_sell: Coins,
    post_created: Sparkles
  }

  const Icon = eventIcons[eventType]

  if (!show) return null

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -100, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: -100, x: '-50%' }}
          className="fixed top-6 left-1/2 z-[100] pointer-events-none"
        >
          <motion.div
            className="bg-gradient-to-r from-purple-600 via-violet-600 to-amber-500 rounded-2xl p-6 shadow-2xl border border-white/20 backdrop-blur-xl min-w-[320px] pointer-events-auto"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-start gap-4">
              <motion.div
                animate={{ 
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  duration: 0.5,
                  repeat: Infinity,
                  repeatDelay: 2
                }}
                className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0"
              >
                <Icon className="w-8 h-8 text-white" />
              </motion.div>
              
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-bold text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-300" />
                    PAT Token Rewarded!
                  </h3>
                  <button
                    onClick={() => {
                      setIsVisible(false)
                      setTimeout(onClose, 500)
                    }}
                    className="text-white/80 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <p className="text-white/90 text-sm mb-3">
                  {eventLabels[eventType]} • +{amount} PAT tokens
                </p>
                
                <div className="flex items-center gap-2 text-xs text-white/80 bg-white/10 rounded-lg px-3 py-2">
                  <CheckCircle className="w-4 h-4 text-green-300" />
                  <span>Reward credited to your Photon wallet</span>
                </div>
              </div>
            </div>
            
            {/* Animated gradient overlay */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-violet-500/20 to-amber-500/20 rounded-2xl pointer-events-none"
              animate={{
                backgroundPosition: ['0% 0%', '100% 100%'],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                repeatType: 'reverse',
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default PatRewardNotification

