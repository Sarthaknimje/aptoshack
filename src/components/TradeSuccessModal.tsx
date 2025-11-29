import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, ExternalLink, TrendingUp, TrendingDown } from 'lucide-react'
import ConfettiAnimation from './ConfettiAnimation'

interface TradeSuccessModalProps {
  isOpen: boolean
  onClose: () => void
  tradeType: 'buy' | 'sell'
  amount: number
  tokenSymbol: string
  price: number
  totalAlgo: number
  transactionId: string
  assetId?: number
}

export const TradeSuccessModal: React.FC<TradeSuccessModalProps> = ({
  isOpen,
  onClose,
  tradeType,
  amount,
  tokenSymbol,
  price,
  totalAlgo,
  transactionId,
  assetId
}) => {
  if (!isOpen) return null

  const explorerLink = `https://testnet.explorer.petrawallet.app/tx/${transactionId}`
  const assetExplorerLink = assetId ? `https://testnet.explorer.petrawallet.app/asset/${assetId}` : null

  return (
    <>
      <ConfettiAnimation isActive={isOpen} />
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          >
            <motion.div
              className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 rounded-3xl p-8 max-w-md w-full relative overflow-hidden shadow-2xl"
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-16 -translate-y-16"></div>
                <div className="absolute bottom-0 right-0 w-24 h-24 bg-yellow-400 rounded-full translate-x-12 translate-y-12"></div>
                <div className="absolute top-1/2 left-1/2 w-16 h-16 bg-pink-400 rounded-full -translate-x-8 -translate-y-8"></div>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors z-10"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Success Icon */}
              <motion.div
                className="flex justify-center mb-6"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                <div className={`w-20 h-20 bg-gradient-to-r ${
                  tradeType === 'buy' 
                    ? 'from-green-400 to-emerald-500' 
                    : 'from-orange-400 to-red-500'
                } rounded-full flex items-center justify-center shadow-lg`}>
                  {tradeType === 'buy' ? (
                    <TrendingUp className="w-10 h-10 text-white" />
                  ) : (
                    <TrendingDown className="w-10 h-10 text-white" />
                  )}
                </div>
              </motion.div>

              {/* Title */}
              <motion.h2
                className="text-3xl font-bold text-center text-white mb-2"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                🎉 {tradeType === 'buy' ? 'Purchase' : 'Sale'} Successful!
              </motion.h2>

              <motion.p
                className="text-center text-white/80 mb-8"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Your transaction has been confirmed on the Aptos blockchain
              </motion.p>

              {/* Trade Details */}
              <motion.div
                className="space-y-4"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {/* Main Trade Info */}
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-sm text-white/60 mb-1">
                        {tradeType === 'buy' ? 'Tokens Purchased' : 'Tokens Sold'}
                      </div>
                      <div className="text-white font-bold text-2xl">
                        {amount.toLocaleString()} {tokenSymbol}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-white/60 mb-1">Price per Token</div>
                      <div className="text-white font-semibold text-lg">
                        {price.toFixed(6)} APTOS
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t border-white/20 pt-4 mt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-white/80 font-medium">Total Amount</span>
                      <span className="text-white font-bold text-xl">
                        {totalAlgo.toFixed(6)} APTOS
                      </span>
                    </div>
                  </div>
                </div>

                {/* Transaction ID */}
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <div className="text-sm text-white/60 mb-2">Transaction ID</div>
                  <div className="text-white font-mono text-xs break-all mb-3">
                    {transactionId}
                  </div>
                  <a
                    href={explorerLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View on Explorer
                  </a>
                </div>

                {/* Asset Link (if available) */}
                {assetExplorerLink && (
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="text-sm text-white/60 mb-2">Asset ID</div>
                    <a
                      href={assetExplorerLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors text-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View Asset #{assetId}
                    </a>
                  </div>
                )}
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                className="flex gap-3 mt-8"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <button
                  onClick={() => window.open(explorerLink, '_blank')}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
                >
                  View Transaction
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 bg-white/20 text-white py-3 px-6 rounded-xl font-medium hover:bg-white/30 transition-all duration-200"
                >
                  Close
                </button>
              </motion.div>

              {/* Success Message */}
              <motion.div
                className="text-center mt-6 text-green-400 text-sm flex items-center justify-center gap-2"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                <CheckCircle className="w-5 h-5" />
                <span>Transaction confirmed on Aptos blockchain!</span>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default TradeSuccessModal

