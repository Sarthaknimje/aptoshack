import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Share2, 
  Heart,
  MessageCircle,
  ExternalLink,
  Copy,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  BarChart3
} from 'lucide-react'
import { useWallet } from '../contexts/WalletContext'
import { TokenIcon } from '../assets/icons'
import { TradingService } from '../services/tradingService'
import TradeSuccessModal from '../components/TradeSuccessModal'

const TokenDetails: React.FC = () => {
  const { id } = useParams()
  const { isConnected, address, petraWallet } = useWallet()
  const [activeTab, setActiveTab] = useState('overview')
  const [amount, setAmount] = useState('')
  const [isBuying, setIsBuying] = useState(false)
  const [isSelling, setIsSelling] = useState(false)
  const [tradeError, setTradeError] = useState<string | null>(null)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successTradeData, setSuccessTradeData] = useState<{
    tradeType: 'buy' | 'sell'
    amount: number
    price: number
    totalAlgo: number
    transactionId: string
  } | null>(null)

  // Mock token data - in real app, this would come from API
  const token = {
    id: id || '1',
    name: 'CreatorCoin',
    symbol: 'CREATOR',
    description: 'The official token of a leading tech content creator. Hold CREATOR to support the creator and participate in exclusive community events.',
    price: 0.045,
    marketCap: 45000,
    volume24h: 2500,
    change24h: 12.5,
    change7d: -5.2,
    holders: 1250,
    totalSupply: 1000000,
    creator: {
      name: 'Tech Creator',
      avatar: '',
      subscribers: 125000,
      verified: true
    },
    chart: [
      { time: '00:00', price: 0.042 },
      { time: '04:00', price: 0.043 },
      { time: '08:00', price: 0.041 },
      { time: '12:00', price: 0.044 },
      { time: '16:00', price: 0.045 },
      { time: '20:00', price: 0.045 }
    ],
    recentTrades: [
      { type: 'buy', amount: 1000, price: 0.045, time: '2 min ago' },
      { type: 'sell', amount: 500, price: 0.044, time: '5 min ago' },
      { type: 'buy', amount: 2000, price: 0.045, time: '8 min ago' },
      { type: 'buy', amount: 750, price: 0.044, time: '12 min ago' }
    ]
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'trading', label: 'Trading', icon: TrendingUp },
    { id: 'activity', label: 'Activity', icon: Activity }
  ]

  const handleBuy = async () => {
    if (!isConnected || !address || !petraWallet || !amount) {
      setTradeError('Please connect your Petra Wallet first')
      return
    }

    setIsBuying(true)
    setTradeError(null)
    setShowSuccessModal(false)
    setSuccessTradeData(null)

    try {
      const assetId = parseInt(id || '0')
      const tokenAmount = Math.round(parseFloat(amount))
      
      if (isNaN(assetId) || assetId === 0) {
        throw new Error('Invalid token ID')
      }

      if (isNaN(tokenAmount) || tokenAmount <= 0) {
        throw new Error('Please enter a valid amount')
      }

      // Get token details from backend
      const tokenData = await TradingService.getTokenDetails(assetId)
      const pricePerToken = tokenData?.current_price || 0.01

      // Buy tokens using backend trading service
      const estimate = await TradingService.estimateBuy(assetId, tokenAmount)
      const txId = await TradingService.buyToken({
        traderAddress: address,
        tokenId: assetId,
        amount: tokenAmount,
        price: pricePerToken
      })

      // Calculate total APTOS spent
      const totalAlgo = tokenAmount * pricePerToken

      // Show success modal with confetti
      setSuccessTradeData({
        tradeType: 'buy',
        amount: tokenAmount,
        price: pricePerToken,
        totalAlgo: totalAlgo,
        transactionId: txId
      })
      setShowSuccessModal(true)
      setAmount('')
    } catch (error: any) {
      console.error('Buy failed:', error)
      setTradeError(error.message || 'Failed to buy tokens. Please try again.')
    } finally {
      setIsBuying(false)
    }
  }

  const handleSell = async () => {
    if (!isConnected || !address || !petraWallet || !amount) {
      setTradeError('Please connect your Petra Wallet first')
      return
    }

    setIsSelling(true)
    setTradeError(null)
    setShowSuccessModal(false)
    setSuccessTradeData(null)

    try {
      const assetId = parseInt(id || '0')
      const tokenAmount = Math.round(parseFloat(amount))
      
      if (isNaN(assetId) || assetId === 0) {
        throw new Error('Invalid token ID')
      }

      if (isNaN(tokenAmount) || tokenAmount <= 0) {
        throw new Error('Please enter a valid amount')
      }

      // Get token details from backend
      const tokenData = await TradingService.getTokenDetails(assetId)
      const pricePerToken = tokenData?.current_price || 0.01

      // Sell tokens using backend trading service
      const estimate = await TradingService.estimateSell(assetId, tokenAmount)
      const txId = await TradingService.sellToken({
        traderAddress: address,
        tokenId: assetId,
        amount: tokenAmount,
        price: pricePerToken
      })

      // Calculate total APTOS received
      const totalAlgo = tokenAmount * pricePerToken

      // Show success modal with confetti
      setSuccessTradeData({
        tradeType: 'sell',
        amount: tokenAmount,
        price: pricePerToken,
        totalAlgo: totalAlgo,
        transactionId: txId
      })
      setShowSuccessModal(true)
      setAmount('')
    } catch (error: any) {
      console.error('Sell failed:', error)
      setTradeError(error.message || 'Failed to sell tokens. Please try again.')
    } finally {
      setIsSelling(false)
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Token Info */}
      <div className="card">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-2xl flex items-center justify-center">
              <TokenIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{token.name}</h2>
              <p className="text-gray-400">${token.symbol}</p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-3xl font-bold text-white">${token.price.toFixed(4)}</div>
            <div className={`flex items-center ${token.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {token.change24h >= 0 ? (
                <ArrowUpRight className="w-4 h-4 mr-1" />
              ) : (
                <ArrowDownRight className="w-4 h-4 mr-1" />
              )}
              {token.change24h >= 0 ? '+' : ''}{token.change24h.toFixed(2)}%
            </div>
          </div>
        </div>
        
        <p className="text-gray-300 leading-relaxed mb-6">{token.description}</p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-gray-400 text-sm">Market Cap</div>
            <div className="text-white font-semibold">${formatNumber(token.marketCap)}</div>
          </div>
          <div>
            <div className="text-gray-400 text-sm">24h Volume</div>
            <div className="text-white font-semibold">${formatNumber(token.volume24h)}</div>
          </div>
          <div>
            <div className="text-gray-400 text-sm">Holders</div>
            <div className="text-white font-semibold">{formatNumber(token.holders)}</div>
          </div>
          <div>
            <div className="text-gray-400 text-sm">Total Supply</div>
            <div className="text-white font-semibold">{formatNumber(token.totalSupply)}</div>
          </div>
        </div>
      </div>

      {/* Creator Info */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Creator</h3>
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full flex items-center justify-center">
            <span className="text-white font-bold">{token.creator.name[0]}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h4 className="text-white font-semibold">{token.creator.name}</h4>
              {token.creator.verified && (
                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
            </div>
            <p className="text-gray-400 text-sm">{formatNumber(token.creator.subscribers)} subscribers</p>
          </div>
          <button className="btn-secondary">
            <ExternalLink className="w-4 h-4 mr-2" />
            View Channel
          </button>
        </div>
      </div>

      {/* Price Chart */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Price Chart (24h)</h3>
        <div className="h-64 bg-white/5 rounded-xl p-4 flex items-end justify-between">
          {token.chart.map((point, index) => (
            <div key={index} className="flex flex-col items-center">
              <div 
                className="w-2 bg-gradient-to-t from-primary-500 to-secondary-500 rounded-t"
                style={{ height: `${(point.price / 0.05) * 200}px` }}
              ></div>
              <span className="text-gray-400 text-xs mt-2">{point.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderTrading = () => (
    <div className="space-y-6">
      {/* Trading Interface */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-6">Trade {token.symbol}</h3>
        
        {!isConnected ? (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-4">Connect your wallet to start trading</p>
            <button className="btn-primary">Connect Wallet</button>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <label className="block text-white font-medium mb-2">Amount (APTOS)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-primary-500"
              />
            </div>
            
            {tradeError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <p className="text-red-400 text-sm">{tradeError}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleBuy}
                disabled={isBuying || isSelling || !amount}
                className="btn-primary flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isBuying ? (
                  <div className="loading-dots w-4 h-4">
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                  </div>
                ) : (
                  <>
                    <TrendingUp className="w-5 h-5" />
                    <span>Buy</span>
                  </>
                )}
              </button>
              
              <button
                onClick={handleSell}
                disabled={isBuying || isSelling || !amount}
                className="btn-secondary flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isSelling ? (
                  <div className="loading-dots w-4 h-4">
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                  </div>
                ) : (
                  <>
                    <TrendingDown className="w-5 h-5" />
                    <span>Sell</span>
                  </>
                )}
              </button>
            </div>
            
            {amount && (
              <div className="bg-white/5 rounded-xl p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">You will receive:</span>
                  <span className="text-white">{(parseFloat(amount) / token.price).toFixed(2)} {token.symbol}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-400">Price per token:</span>
                  <span className="text-white">${token.price.toFixed(4)}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent Trades */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Trades</h3>
        <div className="space-y-3">
          {token.recentTrades.map((trade, index) => (
            <div key={index} className="flex items-center justify-between py-2">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  trade.type === 'buy' ? 'bg-green-500/20' : 'bg-red-500/20'
                }`}>
                  {trade.type === 'buy' ? (
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-400" />
                  )}
                </div>
                <div>
                  <div className="text-white font-medium">
                    {trade.type === 'buy' ? 'Buy' : 'Sell'} {trade.amount} {token.symbol}
                  </div>
                  <div className="text-gray-400 text-sm">{trade.time}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-white font-medium">${trade.price.toFixed(4)}</div>
                <div className="text-gray-400 text-sm">per token</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const renderActivity = () => (
    <div className="space-y-6">
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Token Activity</h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-4 p-4 bg-white/5 rounded-xl">
            <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-green-400" />
            </div>
            <div className="flex-1">
              <div className="text-white font-medium">New holder joined</div>
              <div className="text-gray-400 text-sm">2 hours ago</div>
            </div>
            <div className="text-green-400 font-semibold">+1</div>
          </div>
          
          <div className="flex items-center space-x-4 p-4 bg-white/5 rounded-xl">
            <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <div className="text-white font-medium">Large buy order executed</div>
              <div className="text-gray-400 text-sm">5 hours ago</div>
            </div>
            <div className="text-blue-400 font-semibold">+2,500 {token.symbol}</div>
          </div>
          
          <div className="flex items-center space-x-4 p-4 bg-white/5 rounded-xl">
            <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
              <Share2 className="w-5 h-5 text-purple-400" />
            </div>
            <div className="flex-1">
              <div className="text-white font-medium">Token shared on social media</div>
              <div className="text-gray-400 text-sm">1 day ago</div>
            </div>
            <div className="text-purple-400 font-semibold">+15 shares</div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center">
              <TokenIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold text-white">{token.name}</h1>
              <p className="text-gray-400">${token.symbol} • Created by {token.creator.name}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button className="btn-secondary">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </button>
            <button className="btn-secondary">
              <Heart className="w-4 h-4 mr-2" />
              Watchlist
            </button>
            <button className="btn-secondary">
              <Copy className="w-4 h-4 mr-2" />
              Copy Address
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-8 bg-white/5 p-1 rounded-xl">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'trading' && renderTrading()}
          {activeTab === 'activity' && renderActivity()}
        </motion.div>
      </div>

      {/* Trade Success Modal */}
      {successTradeData && (
        <TradeSuccessModal
          isOpen={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false)
            setSuccessTradeData(null)
          }}
          tradeType={successTradeData.tradeType}
          amount={successTradeData.amount}
          tokenSymbol={token.symbol}
          price={successTradeData.price}
          totalAlgo={successTradeData.totalAlgo}
          transactionId={successTradeData.transactionId}
          assetId={parseInt(id || '0') || undefined}
        />
      )}
    </div>
  )
}

export default TokenDetails
