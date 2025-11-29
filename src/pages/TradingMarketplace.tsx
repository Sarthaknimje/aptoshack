import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  DollarSign, 
  Users,
  Activity,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  RefreshCw,
  ArrowLeft,
  LineChart,
  Zap,
  Flame,
  Star,
  Eye,
  Heart,
  Share2,
  Wallet,
  Sparkles
} from 'lucide-react'
import { 
  LineChart as RechartsLine, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts'
import { useWallet } from '../contexts/WalletContext'
import { PetraWalletIcon, YouTubeIcon, InstagramIcon, TwitterIcon, LinkedInIcon } from '../assets/icons'
import { TradingService, TradeEstimate } from '../services/tradingService'
import { createASAWithPetra, buyTokensWithContract, sellTokensWithContract, transferTokensWithContract, getTokenBalance, getCurrentSupply, getTotalSupply } from '../services/petraWalletService'
import TradeSuccessModal from '../components/TradeSuccessModal'
import ConfettiAnimation from '../components/ConfettiAnimation'
import BondingCurveChart from '../components/BondingCurveChart'
import SVGBackground from '../components/SVGBackground'
import PremiumBackground from '../components/PremiumBackground'

interface TradeData {
  type: 'buy' | 'sell'
  price: number
  amount: number
  total: number
  timestamp: number
}

interface ChartDataPoint {
  time: string
  price: number
  timestamp: number
}

interface OrderBookEntry {
  price: number
  amount: number
  total: number
}

interface CreatorToken {
  symbol: string
  name: string
  description: string
  currentPrice: number
  priceChange24h: number
  high24h: number
  low24h: number
  volume24h: number
  marketCap: number
  holders: number
}

const TradingMarketplace: React.FC = () => {
  const { symbol } = useParams<{ symbol: string }>()
  const navigate = useNavigate()
  const { isConnected, address, balance, connectWallet, petraWallet, isLoading } = useWallet()
  
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy')
  
  // Refresh balance when switching to sell tab (defined after fetchUserTokenBalance)
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market')
  const [amount, setAmount] = useState('')
  const [price, setPrice] = useState('')
  const [currentPrice, setCurrentPrice] = useState(0.025)
  const [priceChange24h, setPriceChange24h] = useState(12.5)
  const [trades, setTrades] = useState<TradeData[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [chartTimeframe, setChartTimeframe] = useState<'1H' | '24H' | '7D' | '30D'>('24H')
  const [buyOrders, setBuyOrders] = useState<OrderBookEntry[]>([])
  const [sellOrders, setSellOrders] = useState<OrderBookEntry[]>([])
  const [hoveredPrice, setHoveredPrice] = useState<number | null>(null)
  const [tokenData, setTokenData] = useState<any>(null)
  const [loadingToken, setLoadingToken] = useState(true)
  const [userTokenBalance, setUserTokenBalance] = useState(0) // User's token balance
  const [userAlgoBalance, setUserAlgoBalance] = useState(0) // User's APTOS balance
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [successTradeData, setSuccessTradeData] = useState<{
    tradeType: 'buy' | 'sell'
    amount: number
    price: number
    totalAlgo: number
    transactionId: string
  } | null>(null)
  const [tradeError, setTradeError] = useState<string | null>(null)
  
  // Fetch real token data from backend
  useEffect(() => {
    const fetchTokenData = async () => {
      try {
        setLoadingToken(true)
        const response = await fetch('http://localhost:5001/tokens')
        const result = await response.json()
        
        if (result.success) {
          // Find token by symbol
          const token = result.tokens.find((t: any) => t.token_symbol?.trim().toUpperCase() === symbol?.toUpperCase())
          if (token && token.asa_id) {
            // Fetch detailed token info including bonding curve
            const tokenDetails = await TradingService.getTokenDetails(token.asa_id)
            // Calculate real market cap: current_price * total_supply (always real-time, never use stored value)
            const realMarketCap = (token.current_price || 0) * (token.total_supply || 0)
            
            // Parse bonding curve state properly
            let parsedBondingCurveState = null
            if (tokenDetails?.bonding_curve_state) {
              try {
                // If it's a string, parse it; if it's already an object, use it
                if (typeof tokenDetails.bonding_curve_state === 'string') {
                  parsedBondingCurveState = JSON.parse(tokenDetails.bonding_curve_state)
                } else {
                  parsedBondingCurveState = tokenDetails.bonding_curve_state
                }
              } catch (e) {
                console.error('Error parsing bonding curve state:', e)
                parsedBondingCurveState = { token_supply: 0, algo_reserve: 0 } as any
              }
            }
            
            // Parse bonding curve config
            let parsedBondingCurveConfig = null
            if (tokenDetails?.bonding_curve_config) {
              try {
                if (typeof tokenDetails.bonding_curve_config === 'string') {
                  parsedBondingCurveConfig = JSON.parse(tokenDetails.bonding_curve_config)
                } else {
                  parsedBondingCurveConfig = tokenDetails.bonding_curve_config
                }
              } catch (e) {
                console.error('Error parsing bonding curve config:', e)
                parsedBondingCurveConfig = null
              }
            }
            
            const enhancedToken = {
              ...token,
              ...tokenDetails,
              high24h: token.current_price * 1.05,
              low24h: token.current_price * 0.95,
              volume24h: token.volume_24h || 0,
              marketCap: realMarketCap, // Always calculate real-time from current_price * total_supply
              // Parse bonding curve if available
              bonding_curve_config: parsedBondingCurveConfig,
              bonding_curve_state: parsedBondingCurveState || { token_supply: 0, algo_reserve: 0 }
            }
            setTokenData(enhancedToken)
            setCurrentPrice(token.current_price)
            setPriceChange24h(token.price_change_24h || 0)
            
            // Fetch user's token balance when token data is loaded
            if (isConnected && address && enhancedToken.asa_id) {
              fetchUserTokenBalance(enhancedToken.asa_id)
            }
            
            // Fetch real trade history for chart
            // Use token_id (Aptos metadata address) if available, otherwise fallback to asa_id
            const tradeHistoryId = token.token_id || token.asa_id
            if (tradeHistoryId) {
              fetchTradeHistory(tradeHistoryId)
            }
          } else {
            console.error('Token not found:', symbol)
          }
        } else {
          console.error('Failed to fetch tokens:', result.error)
        }
      } catch (error) {
        console.error('Error fetching token data:', error)
      } finally {
        setLoadingToken(false)
      }
    }

    if (symbol) {
      fetchTokenData()
    }
  }, [symbol])

  // Fetch real trade history for charts
  const fetchTradeHistory = async (tokenId: number | string) => {
    try {
      // For Aptos tokens, use token_id (string) instead of asa_id (number)
      // Convert to string if it's a number to avoid scientific notation
      const id = typeof tokenId === 'string' ? tokenId : tokenId.toString()
      const trades = await TradingService.getTradeHistory(id, '24h', 200)
      
      // Convert trades to chart data
      const chartDataPoints: ChartDataPoint[] = trades.map((trade: any) => {
        const date = new Date(trade.timestamp)
        return {
          time: `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`,
          price: trade.price,
          timestamp: new Date(trade.timestamp).getTime()
        }
      })
      
      // Sort by timestamp
      chartDataPoints.sort((a, b) => a.timestamp - b.timestamp)
      
      // If no trades, create initial point from current price
      if (chartDataPoints.length === 0 && tokenData) {
        chartDataPoints.push({
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          price: tokenData.current_price,
          timestamp: Date.now()
        })
      }
      
      setChartData(chartDataPoints)
      
      // Update recent trades list
      const recentTrades: TradeData[] = trades.slice(0, 20).map((trade: any) => ({
        type: trade.type as 'buy' | 'sell',
        price: trade.price,
        amount: trade.amount,
        total: trade.price * trade.amount,
        timestamp: new Date(trade.timestamp).getTime()
      }))
      setTrades(recentTrades)
    } catch (error) {
      console.error('Error fetching trade history:', error)
    }
  }

  // Fetch user's token balance from blockchain
  const fetchUserTokenBalance = async (asaId: number) => {
    if (!address || !isConnected || !asaId) {
      setUserTokenBalance(0)
      return
    }

    try {
      // Get creator address from token data
      if (!tokenData?.creator) {
        // Try to get from backend
        const response = await fetch(`http://localhost:5001/tokens`)
        const result = await response.json()
        if (result.success) {
          const token = result.tokens.find((t: any) => t.asa_id === asaId || t.token_id === asaId)
          if (token?.creator) {
            const balance = await getTokenBalance(token.creator, address)
            setUserTokenBalance(balance)
            return
          }
        }
        setUserTokenBalance(0)
        return
      }
      
      // Fetch balance from contract
      const balance = await getTokenBalance(tokenData.creator, address)
      setUserTokenBalance(balance)
    } catch (error) {
      console.error('Error fetching token balance:', error)
      setUserTokenBalance(0)
    }
  }

  // Initialize user balances when wallet connects
  useEffect(() => {
    if (isConnected && balance) {
      setUserAlgoBalance(balance)
      // Fetch token balance when token data is available
      if (tokenData?.asa_id) {
        fetchUserTokenBalance(tokenData.asa_id)
      }
    }
  }, [isConnected, balance, tokenData?.asa_id])
  
  // Refresh balance when switching to sell tab
  useEffect(() => {
    if (activeTab === 'sell' && isConnected && address && tokenData?.asa_id) {
      fetchUserTokenBalance(tokenData.asa_id)
    }
  }, [activeTab, isConnected, address, tokenData?.asa_id])

  // Refresh data periodically
  useEffect(() => {
    if (!tokenData?.asa_id) return
    
    const interval = setInterval(() => {
      // Refresh token data
      fetchTokenData()
      // Refresh trade history
      const tradeHistoryId = tokenData.token_id || tokenData.asa_id
      if (tradeHistoryId) {
        fetchTradeHistory(tradeHistoryId)
      }
    }, 10000) // Every 10 seconds

    return () => clearInterval(interval)
  }, [tokenData?.asa_id])
  
  const fetchTokenData = async () => {
    if (!symbol) return
    try {
      const response = await fetch('http://localhost:5001/tokens')
      const result = await response.json()
      if (result.success) {
        const token = result.tokens.find((t: any) => t.token_symbol?.trim().toUpperCase() === symbol?.toUpperCase())
        if (token) {
          setCurrentPrice(token.current_price)
          setPriceChange24h(token.price_change_24h || 0)
          if (tokenData) {
            setTokenData({ ...tokenData, ...token })
          }
        }
      }
    } catch (error) {
      console.error('Error refreshing token data:', error)
    }
  }
  
  // Initialize order book
  useEffect(() => {
    const generateOrders = (isBuy: boolean): OrderBookEntry[] => {
      const orders: OrderBookEntry[] = []
      const basePrice = currentPrice
      
      for (let i = 0; i < 15; i++) {
        const priceOffset = (i + 1) * 0.0001 * (isBuy ? -1 : 1)
        const orderPrice = basePrice + priceOffset
        const amount = Math.random() * 1000 + 100
        
        orders.push({
          price: orderPrice,
          amount: amount,
          total: orderPrice * amount
        })
      }
      
      return orders
    }
    
    setBuyOrders(generateOrders(true))
    setSellOrders(generateOrders(false))
    
    const interval = setInterval(() => {
      setBuyOrders(generateOrders(true))
      setSellOrders(generateOrders(false))
    }, 5000)
    
    return () => clearInterval(interval)
  }, [currentPrice])

  // Initialize with some recent trades
  useEffect(() => {
    const recentTrades: TradeData[] = []
    for (let i = 0; i < 20; i++) {
      recentTrades.push({
        type: Math.random() > 0.5 ? 'buy' : 'sell',
        price: currentPrice + (Math.random() - 0.5) * 0.002,
        amount: Math.random() * 1000 + 100,
        total: 0,
        timestamp: Date.now() - i * 60000
      })
    }
    recentTrades.forEach(trade => {
      trade.total = trade.price * trade.amount
    })
    setTrades(recentTrades)
  }, [])

  const [tradeEstimate, setTradeEstimate] = useState<TradeEstimate | null>(null)
  const [estimating, setEstimating] = useState(false)

  // Estimate trade when amount changes
  useEffect(() => {
    if (!tokenData?.asa_id || !amount || parseFloat(amount) <= 0) {
      setTradeEstimate(null)
      return
    }

    const estimateTrade = async () => {
      setEstimating(true)
      try {
        const tokenAmount = parseFloat(amount)
        
        // For buy: amount is in tokens, estimate APT cost
        // For sell: amount is in tokens, estimate APT received
        const estimate = activeTab === 'buy'
          ? await TradingService.estimateBuy(tokenData.asa_id, tokenAmount)
          : await TradingService.estimateSell(tokenData.asa_id, tokenAmount)
        
        setTradeEstimate(estimate)
      } catch (error) {
        console.error('Error estimating trade:', error)
        setTradeEstimate(null)
      } finally {
        setEstimating(false)
      }
    }

    const timeoutId = setTimeout(estimateTrade, 500) // Debounce
    return () => clearTimeout(timeoutId)
  }, [amount, activeTab, tokenData?.asa_id])

  const handleTrade = async () => {
    if (!isConnected) {
      connectWallet()
      return
    }

    if (!amount || parseFloat(amount) <= 0) {
      setTradeError('Please enter a valid amount')
      return
    }

    if (!tokenData?.asa_id) {
      setTradeError('Token data not loaded')
      return
    }

    if (!petraWallet) {
      setTradeError('Petra Wallet not connected. Please connect your wallet first.')
      return
    }

    const tradeAmount = parseFloat(amount)
    
    // Validate trade amount
    if (isNaN(tradeAmount) || tradeAmount <= 0) {
      setTradeError('Please enter a valid amount greater than 0')
      setIsProcessing(false)
      return
    }
    
    const estimate = activeTab === 'buy'
      ? await TradingService.estimateBuy(tokenData.asa_id, tradeAmount)
      : await TradingService.estimateSell(tokenData.asa_id, tradeAmount)

    // Validate estimate
    if (!estimate) {
      setTradeError('Failed to get trade estimate. Please try again.')
      setIsProcessing(false)
      return
    }

    // Check balances (including minimum balance requirement)
    if (activeTab === 'buy') {
      if (!estimate.algo_cost || estimate.algo_cost <= 0) {
        setTradeError(`Invalid trade estimate. Cost: ${estimate.algo_cost || 'N/A'} APTOS. Please try again.`)
        setIsProcessing(false)
        return
      }
      
      // Check available supply from contract
      if (tokenData?.creator) {
        try {
          const currentSupply = await getCurrentSupply(tokenData.creator)
          const totalSupply = await getTotalSupply(tokenData.creator)
          const availableSupply = totalSupply - currentSupply
          
          if (tradeAmount > availableSupply) {
            setTradeError(
              `Insufficient token supply! Available: ${availableSupply.toFixed(2)} tokens, ` +
              `but you're trying to buy ${tradeAmount.toFixed(2)} tokens. ` +
              `Current supply: ${currentSupply.toFixed(2)} / ${totalSupply.toFixed(2)}`
            )
            setIsProcessing(false)
            return
          }
        } catch (error) {
          console.error('Error checking token supply:', error)
          // Continue with trade if supply check fails
        }
      }
      
      // Aptos requires minimum balance for transactions
      // Estimate: assume user has ~18 assets, so need ~1.8 APTOS minimum + transaction fee
      const estimatedMinBalance = 1.9 // Conservative estimate
      const totalNeeded = estimate.algo_cost + estimatedMinBalance
      
      if (totalNeeded > userAlgoBalance) {
        setTradeError(
          `Insufficient APTOS balance! You need ${estimate.algo_cost.toFixed(4)} APTOS for the trade ` +
          `plus ~${estimatedMinBalance.toFixed(2)} APTOS for minimum balance requirements. ` +
          `Total needed: ${totalNeeded.toFixed(4)} APTOS, but you only have ${userAlgoBalance.toFixed(4)} APTOS.`
        )
        setIsProcessing(false)
        return
      }
    } else {
      if (tradeAmount > userTokenBalance) {
        setTradeError(`Insufficient token balance! You want to sell ${tradeAmount} ${tokenData.token_symbol} but only have ${userTokenBalance.toFixed(2)}`)
        setIsProcessing(false)
        return
      }
      
      if (!estimate.algo_received || estimate.algo_received <= 0) {
        setTradeError(`Invalid sell estimate. You would receive: ${estimate.algo_received || 'N/A'} APTOS. Please try again.`)
        setIsProcessing(false)
        return
      }
    }

    setIsProcessing(true)
    setTradeError(null)

    try {
      const assetId = tokenData.asa_id
      let txId: string
      let finalPrice = estimate.new_price

      if (activeTab === 'buy') {
        // Send APTOS payment first
        const algoAmount = estimate.algo_cost
        if (!algoAmount || algoAmount <= 0) {
          setTradeError(`Invalid trade amount. Estimated cost: ${algoAmount || 'N/A'} APTOS. Please try again.`)
          setIsProcessing(false)
          return
        }
        
        // Use contract-based buy function (atomic: pays APT and receives tokens)
        const maxAptPayment = algoAmount * 1.1 // 10% slippage tolerance
        
        const buyResult = await buyTokensWithContract({
          buyer: address!,
          petraWallet: petraWallet,
          creatorAddress: tokenData.creator || address!,
          tokenAmount: Math.floor(tradeAmount),
          maxAptPayment: maxAptPayment
        })
        
        txId = buyResult.txId
        finalPrice = estimate.new_price
        
        // Note: Token transfer is handled by the backend's bonding_curve_buy endpoint
        // The backend transfers tokens from creator to buyer automatically
        // No need for additional transfer here
      } else {
        // Sell tokens using contract
        // Note: sell_tokens requires creator signer, so we'll use backend service for now
        // TODO: Update contract to support seller-initiated sells with liquidity pool
        const minAptReceived = (estimate.algo_received || 0) * 0.9 // 10% slippage tolerance
        
        // Use backend service until contract supports seller-initiated sells
        const result = await TradingService.executeSell(
          assetId,
          tradeAmount,
          address!,
          ''
        )
        
        if (!result.success) {
          throw new Error(result.error || 'Sell failed. Note: Selling requires creator approval in current contract design.')
        }
        
        txId = result.transaction_id || 'pending'
        finalPrice = result.new_price || estimate.new_price
        
        // Receive APTOS (in production, this would be automatic)
        if (result.algo_received) {
          // APTOS would be sent automatically in a real DEX
          console.log(`Would receive ${result.algo_received} APTOS`)
        }
      }

      // Update current price
      setCurrentPrice(finalPrice)

      // Refresh token data and trade history
      await fetchTokenData()
      await fetchTradeHistory(assetId)
      
      // Wait a moment for blockchain to update, then refresh user token balance
      setTimeout(async () => {
        await fetchUserTokenBalance(assetId)
      }, 2000) // Wait 2 seconds for blockchain confirmation
      
      // Also refresh immediately (in case it's already updated)
      await fetchUserTokenBalance(assetId)

      // Show success modal with confetti
      setSuccessTradeData({
        tradeType: activeTab,
        amount: Math.floor(tradeAmount),
        price: finalPrice,
        totalAlgo: activeTab === 'buy' ? (estimate.algo_cost || 0) : (estimate.algo_received || 0),
        transactionId: txId
      })
      setShowSuccessModal(true)
      setAmount('')
      setPrice('')
    } catch (error: any) {
      console.error('Trade error:', error)
      
      // Handle network mismatch error specifically
      if (error?.name === 'NetworkMismatchError' || error?.message?.includes('Network mismatch') || error?.message?.includes('different networks')) {
        setTradeError('⚠️ Network Mismatch!\n\nPlease ensure your Petra Wallet is set to TESTNET.\n\nTo fix:\n1. Open Petra Wallet app\n2. Go to Settings\n3. Switch to Testnet\n4. Try again')
      } else {
        setTradeError(error.message || 'Failed to execute trade. Please try again.')
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const calculateTotal = () => {
    const amountNum = parseFloat(amount) || 0
    const priceNum = orderType === 'market' ? currentPrice : (parseFloat(price) || 0)
    return amountNum * priceNum
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M'
    } else if (num >= 1000) {
      return (num / 1000).toFixed(2) + 'K'
    }
    return num.toFixed(2)
  }

  const formatTime = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return new Date(timestamp).toLocaleDateString()
  }

  // Custom tooltip for chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gray-900/95 backdrop-blur-sm border border-primary-500/50 rounded-lg p-3 shadow-xl"
        >
          <p className="text-white font-semibold">${payload[0].value.toFixed(4)}</p>
          <p className="text-gray-400 text-xs">{payload[0].payload.time}</p>
        </motion.div>
      )
    }
    return null
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] relative">
        <PremiumBackground variant="blue" />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center p-8"
          >
            <motion.div 
              className="w-24 h-24 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-3xl flex items-center justify-center mx-auto mb-8"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <BarChart3 className="w-12 h-12 text-white" />
            </motion.div>
            <h2 className="text-4xl font-bold text-white mb-4">Connect Your Wallet</h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto text-lg">
              Connect your Petra wallet to start trading creator tokens and access live market data.
            </p>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={connectWallet}
              disabled={isLoading}
              className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-2xl text-white font-bold text-lg disabled:opacity-50 flex items-center space-x-3 mx-auto"
            >
              <PetraWalletIcon className="w-6 h-6" />
              <span>{isLoading ? 'Connecting...' : 'Connect Wallet'}</span>
            </motion.button>
          </motion.div>
        </div>
      </div>
    )
  }

  const isPositive = priceChange24h >= 0

  if (loadingToken) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] relative">
        <PremiumBackground variant="blue" />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white text-lg">Loading token data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!tokenData) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] relative">
        <PremiumBackground variant="blue" />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl">!</span>
            </div>
            <p className="text-white text-lg mb-2">Token not found</p>
            <p className="text-gray-400">Token symbol "{symbol}" does not exist</p>
            <motion.button 
              onClick={() => navigate('/marketplace')} 
              className="mt-4 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl text-white font-semibold"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Back to Marketplace
            </motion.button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] py-6 relative overflow-hidden">
      <PremiumBackground variant="blue" />

      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4"
        >
          <div className="flex items-center space-x-4">
            <Link 
              to="/marketplace"
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors group"
            >
              <motion.div whileHover={{ x: -3 }}>
                <ArrowLeft className="w-5 h-5" />
              </motion.div>
              <span>Back to Marketplace</span>
            </Link>
            <div className="h-6 w-px bg-white/20"></div>
            <div className="flex items-center space-x-3">
              <div className="flex flex-col">
                <motion.h1 
                  className="text-4xl md:text-5xl font-black text-white mb-2"
                  animate={{ 
                    backgroundPosition: ['0%', '100%', '0%']
                  }}
                  transition={{ 
                    duration: 5,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                  style={{
                    backgroundImage: 'linear-gradient(90deg, #fff, #818cf8, #ec4899, #fff)',
                    backgroundSize: '200% auto',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    color: 'transparent'
                  }}
                >
                  <span className="truncate block" title={tokenData.token_name || tokenData.name || 'Token'}>{tokenData.token_name || tokenData.name || 'Token'}</span>
                </motion.h1>
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center space-x-2"
                >
                  <span className="px-4 py-2 bg-gradient-to-r from-blue-500/30 to-purple-500/30 border-2 border-blue-500/50 text-blue-300 rounded-full text-lg font-bold">
                    ${tokenData.token_symbol || tokenData.symbol}
                  </span>
                  {tokenData.platform && (
                    <span className="px-3 py-1 bg-white/10 border border-white/20 text-white rounded-full text-xs font-medium capitalize">
                      {tokenData.platform}
                    </span>
                  )}
                </motion.div>
              </div>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Flame className="w-5 h-5 text-violet-400" />
              </motion.div>
            </div>
          </div>
          
          {/* Wallet Info */}
          <div className="flex items-center space-x-4">
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="px-4 py-2 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border border-green-500/20"
            >
              <div className="text-xs text-gray-400">Balance</div>
              <div className="text-lg font-semibold text-white">{userAlgoBalance.toFixed(2)} APTOS</div>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className="px-4 py-2 bg-white/5 rounded-lg border border-white/10"
            >
              <div className="text-xs text-gray-400">Address</div>
              <div className="text-sm font-mono text-white">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Price Stats Bar */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card mb-6 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 border-white/10"
        >
          <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
            <motion.div whileHover={{ scale: 1.05 }} className="cursor-pointer">
              <div className="text-gray-400 text-xs mb-1 flex items-center space-x-1">
                <Activity className="w-3 h-3" />
                <span>Current Price</span>
              </div>
              <div className="text-2xl md:text-3xl font-bold text-white">
                ${currentPrice.toFixed(4)}
              </div>
              <motion.div 
                className={`flex items-center space-x-1 text-sm mt-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}
                animate={{ opacity: [1, 0.7, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {isPositive ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownRight className="w-4 h-4" />
                )}
                <span>{isPositive ? '+' : ''}{priceChange24h.toFixed(2)}%</span>
              </motion.div>
            </motion.div>
            
            <motion.div whileHover={{ scale: 1.05 }} className="cursor-pointer">
              <div className="text-gray-400 text-xs mb-1">24h High</div>
              <div className="text-lg font-semibold text-green-400">
                ${tokenData.high24h.toFixed(4)}
              </div>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05 }} className="cursor-pointer">
              <div className="text-gray-400 text-xs mb-1">24h Low</div>
              <div className="text-lg font-semibold text-red-400">
                ${tokenData.low24h.toFixed(4)}
              </div>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05 }} className="cursor-pointer">
              <div className="text-gray-400 text-xs mb-1">24h Volume</div>
              <div className="text-lg font-semibold text-white">
                ${formatNumber(tokenData.volume24h)}
              </div>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05 }} className="cursor-pointer">
              <div className="text-gray-400 text-xs mb-1">Market Cap</div>
              <div className="text-lg font-semibold text-white">
                ${formatNumber(tokenData.marketCap)}
              </div>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05 }} className="cursor-pointer">
              <div className="text-gray-400 text-xs mb-1">Holders</div>
              <div className="text-lg font-semibold text-white flex items-center space-x-2">
                <Users className="w-4 h-4 text-purple-400" />
                <span>{formatNumber(tokenData.holders)}</span>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Main Trading Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left: Chart + Order Book */}
          <div className="lg:col-span-3 space-y-6">
            {/* Price Chart */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="card"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  >
                    <LineChart className="w-6 h-6 text-blue-400" />
                  </motion.div>
                  <span>Live Price Chart - Real Trade Data</span>
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Zap className="w-5 h-5 text-violet-400" />
                  </motion.div>
                </h3>
                <div className="flex space-x-2">
                  {(['1H', '24H', '7D', '30D'] as const).map((tf) => (
                    <motion.button
                      key={tf}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setChartTimeframe(tf)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        chartTimeframe === tf
                          ? 'bg-gradient-to-r from-primary-500 to-purple-500 text-white shadow-lg shadow-primary-500/50'
                          : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {tf}
                    </motion.button>
                  ))}
                </div>
              </div>
              
              <div className="h-96 bg-gradient-to-b from-black/20 to-black/40 rounded-xl p-4 border border-white/5">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart 
                    data={chartData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    onMouseMove={(e: any) => {
                      if (e && e.activePayload) {
                        setHoveredPrice(e.activePayload[0]?.value)
                      }
                    }}
                    onMouseLeave={() => setHoveredPrice(null)}
                  >
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis 
                      dataKey="time" 
                      stroke="#9ca3af"
                      style={{ fontSize: '12px' }}
                      tick={{ fill: '#9ca3af' }}
                    />
                    <YAxis 
                      stroke="#9ca3af"
                      style={{ fontSize: '12px' }}
                      tick={{ fill: '#9ca3af' }}
                      domain={['dataMin - 0.001', 'dataMax + 0.001']}
                      tickFormatter={(value) => `$${value.toFixed(4)}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="price" 
                      stroke={isPositive ? "#10b981" : "#ef4444"} 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorPrice)"
                      animationDuration={1000}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-6 grid grid-cols-3 gap-4">
                <motion.div 
                  whileHover={{ scale: 1.02, y: -2 }}
                  className="text-center p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl border border-blue-500/20"
                >
                  <div className="text-xs text-gray-400 mb-1">Open</div>
                  <div className="text-lg font-semibold text-white">${(currentPrice * 0.98).toFixed(4)}</div>
                </motion.div>
                <motion.div 
                  whileHover={{ scale: 1.02, y: -2 }}
                  className="text-center p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20"
                >
                  <div className="text-xs text-gray-400 mb-1">Close</div>
                  <div className="text-lg font-semibold text-white">${currentPrice.toFixed(4)}</div>
                </motion.div>
                <motion.div 
                  whileHover={{ scale: 1.02, y: -2 }}
                  className={`text-center p-4 rounded-xl border ${
                    isPositive 
                      ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20'
                      : 'bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/20'
                  }`}
                >
                  <div className="text-xs text-gray-400 mb-1">Change</div>
                  <div className={`text-lg font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                    {isPositive ? '+' : ''}{priceChange24h.toFixed(2)}%
                  </div>
                </motion.div>
              </div>
              
              {/* Bonding Curve Chart */}
              {tokenData?.bonding_curve_config && tokenData?.bonding_curve_state && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="mt-6"
                >
                  <BondingCurveChart
                    config={tokenData.bonding_curve_config}
                    currentSupply={
                      (() => {
                        const supply = tokenData.bonding_curve_state?.token_supply
                        const numSupply = typeof supply === 'number' ? supply : (typeof supply === 'string' ? parseFloat(supply) : 0)
                        return isNaN(numSupply) ? 0 : numSupply
                      })()
                    }
                    currentPrice={
                      (() => {
                        const price = Number(tokenData.current_price || currentPrice)
                        return isNaN(price) || price <= 0 ? (tokenData.bonding_curve_config?.initial_price || 0.001) : price
                      })()
                    }
                    marketCap={
                      (() => {
                        const price = Number(tokenData.current_price || 0)
                        const supply = Number(tokenData.total_supply || 0)
                        const cap = price * supply
                        return isNaN(cap) ? 0 : cap
                      })()
                    }
                  />
                </motion.div>
              )}
            </motion.div>

            {/* Order Book & Recent Trades */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Order Book */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="card"
              >
                <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5 text-purple-400" />
                  <span>Order Book</span>
                </h3>

                <div className="space-y-4">
                  {/* Sell Orders */}
                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-2 px-2">
                      <span>Price (APTOS)</span>
                      <span>Amount</span>
                    </div>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {sellOrders.slice(0, 8).reverse().map((order, index) => (
                        <motion.div 
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={{ scale: 1.02, x: 5 }}
                          className="flex items-center justify-between text-sm p-2 bg-red-500/5 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer border border-transparent hover:border-red-500/30"
                        >
                          <span className="text-red-400 font-mono font-semibold">{order.price.toFixed(4)}</span>
                          <span className="text-gray-300">{order.amount.toFixed(2)}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Current Price */}
                  <motion.div 
                    animate={{ 
                      scale: [1, 1.02, 1],
                      boxShadow: [
                        '0 0 0px rgba(99, 102, 241, 0)',
                        '0 0 20px rgba(99, 102, 241, 0.3)',
                        '0 0 0px rgba(99, 102, 241, 0)'
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="flex items-center justify-center py-4 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-xl border border-primary-500/30"
                  >
                    <div className="text-center">
                      <div className="text-3xl font-bold text-white">${currentPrice.toFixed(4)}</div>
                      <div className="text-xs text-gray-400 mt-1">Current Price</div>
                    </div>
                  </motion.div>

                  {/* Buy Orders */}
                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-2 px-2">
                      <span>Price (APTOS)</span>
                      <span>Amount</span>
                    </div>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {buyOrders.slice(0, 8).map((order, index) => (
                        <motion.div 
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={{ scale: 1.02, x: 5 }}
                          className="flex items-center justify-between text-sm p-2 bg-green-500/5 hover:bg-green-500/10 rounded-lg transition-all cursor-pointer border border-transparent hover:border-green-500/30"
                        >
                          <span className="text-green-400 font-mono font-semibold">{order.price.toFixed(4)}</span>
                          <span className="text-gray-300">{order.amount.toFixed(2)}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Recent Trades */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="card"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-blue-400" />
                    <span>Recent Trades</span>
                  </h3>
                  <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Activity className="w-5 h-5 text-green-400" />
                  </motion.div>
                </div>
                
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                  <AnimatePresence>
                    {trades.slice(0, 15).map((trade, index) => (
                      <motion.div
                        key={`${trade.timestamp}-${index}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.03 }}
                        whileHover={{ scale: 1.02, x: 5 }}
                        className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all cursor-pointer border border-transparent hover:border-primary-500/30"
                      >
                        <div className="flex items-center space-x-3">
                          <motion.div 
                            className={`w-2 h-2 rounded-full ${
                              trade.type === 'buy' ? 'bg-green-400' : 'bg-red-400'
                            }`}
                            animate={{ scale: [1, 1.5, 1] }}
                            transition={{ duration: 2, repeat: Infinity, delay: index * 0.1 }}
                          />
                          <div>
                            <div className={`font-semibold font-mono ${
                              trade.type === 'buy' ? 'text-green-400' : 'text-red-400'
                            }`}>
                              ${trade.price.toFixed(4)}
                            </div>
                            <div className="text-xs text-gray-500">{formatTime(trade.timestamp)}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-white text-sm font-medium">{trade.amount.toFixed(2)}</div>
                          <div className="text-xs text-gray-500">${trade.total.toFixed(2)}</div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Right: Trading Panel */}
          <div className="lg:col-span-1">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="card sticky top-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex space-x-2 w-full">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveTab('buy')}
                    className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all ${
                      activeTab === 'buy'
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/50'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    Buy
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveTab('sell')}
                    className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all ${
                      activeTab === 'sell'
                        ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/50'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    Sell
                  </motion.button>
                </div>
              </div>

              <div className="flex space-x-2 mb-6">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setOrderType('market')}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    orderType === 'market'
                      ? 'bg-gradient-to-r from-primary-500 to-purple-500 text-white shadow-lg'
                      : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Market
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setOrderType('limit')}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    orderType === 'limit'
                      ? 'bg-gradient-to-r from-primary-500 to-purple-500 text-white shadow-lg'
                      : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Limit
                </motion.button>
              </div>

              {/* Order Form */}
              <div className="space-y-4">
                {orderType === 'limit' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <label className="block text-white font-medium mb-2">Price (APTOS)</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.0001"
                        placeholder={currentPrice.toFixed(4)}
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full px-4 py-3 bg-white/5 border-2 border-white/20 rounded-xl text-white focus:outline-none focus:border-primary-500 transition-all"
                      />
                      <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 font-semibold">
                        APTOS
                      </span>
                    </div>
                  </motion.div>
                )}

                <div>
                  <label className="block text-white font-medium mb-2">
                    Amount {activeTab === 'buy' ? '(Tokens)' : '(Tokens)'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      placeholder={activeTab === 'buy' ? "0.00 tokens" : "0.00 tokens"}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border-2 border-white/20 rounded-xl text-white focus:outline-none focus:border-primary-500 transition-all"
                    />
                    <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 font-semibold">
                      {tokenData?.token_symbol || tokenData?.symbol || 'tokens'}
                    </span>
                    <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 font-semibold">
                      ${tokenData.symbol}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    {activeTab === 'buy' ? (
                      <>
                        <span className="text-gray-400 text-sm">Available: {userAlgoBalance.toFixed(2)} APTOS</span>
                        <span className="text-gray-400 text-sm">Tokens: {userTokenBalance.toFixed(2)} {tokenData?.token_symbol || tokenData?.symbol || ''}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-gray-400 text-sm">Available: {userTokenBalance.toFixed(2)} {tokenData?.token_symbol || tokenData?.symbol || 'tokens'}</span>
                        <span className="text-gray-400 text-sm">APTOS: {userAlgoBalance.toFixed(2)}</span>
                      </>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {[25, 50, 75, 100].map((percent) => (
                      <motion.button
                        key={percent}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          if (activeTab === 'buy') {
                            setAmount((userAlgoBalance * (percent / 100) / currentPrice).toFixed(2))
                          } else {
                            setAmount((userTokenBalance * (percent / 100)).toFixed(2))
                          }
                        }}
                        className="px-2 py-2 bg-gradient-to-r from-primary-500/20 to-purple-500/20 hover:from-primary-500/30 hover:to-purple-500/30 rounded-lg text-sm text-white font-semibold transition-all border border-primary-500/30"
                      >
                        {percent}%
                      </motion.button>
                    ))}
                  </div>
                </div>

                <motion.div 
                  whileHover={{ scale: 1.01 }}
                  className="p-4 bg-gradient-to-r from-white/5 to-white/10 rounded-xl border border-white/20"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400">Total</span>
                    <span className="text-white font-bold text-xl">
                      {activeTab === 'buy' 
                        ? (tradeEstimate?.algo_cost || (parseFloat(amount) * currentPrice || 0)).toFixed(4) + ' APTOS'
                        : (tradeEstimate?.algo_received || (parseFloat(amount) * currentPrice || 0)).toFixed(4) + ' APTOS'
                      }
                    </span>
                  </div>
                  
                  {/* Show trade estimate details */}
                  {tradeEstimate && amount && parseFloat(amount) > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                      {activeTab === 'buy' ? (
                        <>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">You will receive:</span>
                            <span className="text-green-400 font-semibold">
                              {parseFloat(amount).toFixed(2)} {tokenData?.token_symbol || tokenData?.symbol || 'tokens'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Cost:</span>
                            <span className="text-white font-medium">
                              {tradeEstimate.algo_cost?.toFixed(4) || '0.0000'} APTOS
                            </span>
                          </div>
                          {tradeEstimate.new_price && (
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>New price:</span>
                              <span>${tradeEstimate.new_price.toFixed(6)}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">You will receive:</span>
                            <span className="text-green-400 font-semibold">
                              {tradeEstimate.algo_received?.toFixed(4) || '0.0000'} APTOS
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Selling:</span>
                            <span className="text-white font-medium">
                              {parseFloat(amount).toFixed(2)} {tokenData?.token_symbol || tokenData?.symbol || 'tokens'}
                            </span>
                          </div>
                          {tradeEstimate.new_price && (
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>New price:</span>
                              <span>${tradeEstimate.new_price.toFixed(6)}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                  
                  {orderType === 'market' && (
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span className="text-gray-400">Current Price</span>
                      <span className="text-gray-300">${currentPrice.toFixed(4)}</span>
                    </div>
                  )}
                </motion.div>

                {tradeError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4"
                  >
                    <p className="text-red-400 text-sm">{tradeError}</p>
                  </motion.div>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleTrade}
                  disabled={isProcessing || !amount}
                  className={`w-full py-4 rounded-xl font-bold text-lg transition-all shadow-2xl ${
                    activeTab === 'buy'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-green-500/50'
                      : 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white shadow-red-500/50'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center space-x-2">
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Processing...</span>
                    </span>
                  ) : (
                    <span className="flex items-center justify-center space-x-2">
                      <DollarSign className="w-5 h-5" />
                      <span>{activeTab === 'buy' ? 'Buy' : 'Sell'} {tokenData.symbol}</span>
                    </span>
                  )}
                </motion.button>

                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-start space-x-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg"
                >
                  <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-300">
                    {activeTab === 'buy' 
                      ? `You're buying ${tokenData.symbol} tokens. Market orders execute instantly at current price.`
                      : `You're selling ${tokenData.symbol} tokens. Limit orders execute when price reaches your target.`
                    }
                  </p>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Trade Success Modal */}
      {successTradeData && tokenData && (
        <TradeSuccessModal
          isOpen={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false)
            setSuccessTradeData(null)
          }}
          tradeType={successTradeData.tradeType}
          amount={successTradeData.amount}
          tokenSymbol={tokenData.symbol}
          price={successTradeData.price}
          totalAlgo={successTradeData.totalAlgo}
          transactionId={successTradeData.transactionId}
          assetId={tokenData.asa_id}
        />
      )}
    </div>
  )
}

export default TradingMarketplace
