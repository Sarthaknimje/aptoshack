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
import { createASAWithPetra, buyTokensWithContract, sellTokensWithContract, transferTokensWithContract, getTokenBalance, getCurrentSupply, getTotalSupply, getAptReserve } from '../services/petraWalletService'
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
  const [contractSupply, setContractSupply] = useState<number | null>(null) // Real contract supply
  const [contractReserve, setContractReserve] = useState<number | null>(null) // Real contract APT reserve
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
          if (token && (token.asa_id || token.token_id)) {
            // Fetch detailed token info including bonding curve
            // Use token_id (Aptos) if available, otherwise fallback to asa_id (Algorand)
            const tokenIdentifier = token.token_id || token.asa_id
            const tokenDetails = await TradingService.getTokenDetails(tokenIdentifier)
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
              // Preserve content_id and token_id from original token (important for Aptos tokens)
              content_id: token.content_id || tokenDetails?.content_id,
              token_id: token.token_id || tokenDetails?.token_id,
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
            // Use token_id (Aptos) if available, otherwise fallback to asa_id (Algorand)
            const balanceIdentifier = enhancedToken.token_id || enhancedToken.asa_id
            if (isConnected && address && balanceIdentifier) {
              // For Aptos tokens, we need creator address and token_id (content_id)
              if (enhancedToken.token_id && enhancedToken.creator) {
                fetchUserTokenBalance(enhancedToken.token_id)
                // Also fetch contract state for bonding curve
                fetchContractState()
              } else if (enhancedToken.asa_id) {
              fetchUserTokenBalance(enhancedToken.asa_id)
              }
            } else if (enhancedToken.token_id && enhancedToken.creator) {
              // Fetch contract state even if wallet not connected (for chart display)
              fetchContractState(enhancedToken)
            }
            
            // Fetch real trade history for chart
            // Use token_id (Aptos metadata address) if available, otherwise fallback to asa_id
            // Ensure token_id is a string to avoid scientific notation
            const tradeHistoryId = token.token_id 
              ? String(token.token_id)  // Convert to string to avoid scientific notation
              : (token.asa_id ? String(token.asa_id) : null)
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
  const fetchTradeHistory = async (tokenId: number | string | null) => {
    try {
      if (tokenId === null || tokenId === undefined) {
        console.warn('No tokenId provided to fetchTradeHistory')
        setTrades([])
        return
      }
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

  // Fetch contract state (supply and reserve) for Aptos tokens
  const fetchContractState = async (tokenDataOverride?: any) => {
    const data = tokenDataOverride || tokenData
    if (!data?.creator || (!data?.content_id && !data?.token_id)) {
      return
    }
    
    try {
      const tokenId = data.content_id || data.token_id
      if (!tokenId) return
      
      const creatorAddress = data.creator
      const [supply, reserve] = await Promise.all([
        getCurrentSupply(creatorAddress, tokenId),
        getAptReserve(creatorAddress, tokenId)
      ])
      
      setContractSupply(supply)
      setContractReserve(reserve)
      
      // Update tokenData with contract values for bonding curve
      setTokenData((prev: any) => {
        if (!prev) return prev
        return {
          ...prev,
          bonding_curve_state: {
            ...prev.bonding_curve_state,
            token_supply: supply,
            algo_reserve: reserve
          },
          current_price: supply > 0 ? reserve / supply : (prev.current_price || 0.00001)
        }
      })
    } catch (error) {
      console.error('Error fetching contract state:', error)
    }
  }

  // Fetch user's token balance from blockchain
  const fetchUserTokenBalance = async (asaId: number) => {
    if (!address || !isConnected || !asaId) {
      setUserTokenBalance(0)
      return
    }

    try {
      // For Aptos tokens, we need creator address and token_id (content_id)
      // Get tokenId (content_id) from tokenData - this is what the contract expects
      if (!tokenData) {
        console.warn('tokenData is null, cannot fetch token balance')
        setUserTokenBalance(0)
        return
      }
      const tokenId = tokenData.content_id || tokenData.token_id
      if (!tokenId) {
        console.warn('Missing tokenId (content_id) in tokenData')
        setUserTokenBalance(0)
        return
      }
      
      // Fetch balance from Aptos contract
      // Use MODULE_ADDRESS instead of tokenData.creator since contract is deployed there
      const creatorAddress = tokenData.creator || '0x033349213be67033ffd596fa85b69ab5c3ff82a508bb446002c8419d549d12c6'
      const balance = await getTokenBalance(creatorAddress, tokenId, address)
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
      // Use token_id (Aptos) if available, otherwise fallback to asa_id (Algorand)
      const balanceIdentifier = tokenData?.token_id || tokenData?.asa_id
      if (balanceIdentifier) {
        fetchUserTokenBalance(balanceIdentifier)
      }
    }
  }, [isConnected, balance, tokenData?.token_id, tokenData?.asa_id])
  
  // Refresh balance when switching to sell tab
  useEffect(() => {
    // Use token_id (Aptos) if available, otherwise fallback to asa_id (Algorand)
    const balanceIdentifier = tokenData?.token_id || tokenData?.asa_id
    if (activeTab === 'sell' && isConnected && address && balanceIdentifier) {
      fetchUserTokenBalance(balanceIdentifier)
    }
  }, [activeTab, isConnected, address, tokenData?.token_id, tokenData?.asa_id])

  // Refresh data periodically
  useEffect(() => {
    if (!tokenData?.asa_id) return
    
    const interval = setInterval(() => {
      // Refresh token data
      fetchTokenData()
      // Refresh trade history
      // Ensure token_id is a string to avoid scientific notation
      const tradeHistoryId = tokenData.token_id 
        ? String(tokenData.token_id)
        : (tokenData.asa_id ? String(tokenData.asa_id) : null)
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
    // Support both token_id (Aptos) and asa_id (Algorand)
    // Priority: content_id > token_id > metadata_address > asa_id
    const tokenIdentifier = tokenData?.content_id || tokenData?.token_id || tokenData?.metadata_address || tokenData?.asa_id
    if (!tokenIdentifier || !amount || parseFloat(amount) <= 0) {
      setTradeEstimate(null)
      return
    }

    const estimateTrade = async () => {
      setEstimating(true)
      try {
        const tokenAmount = parseFloat(amount)
        
        // For buy: amount is in tokens, estimate APT cost
        // For sell: amount is in tokens, estimate APT received
        // Use token_id (Aptos) if available, otherwise fallback to asa_id (Algorand)
        const estimate = activeTab === 'buy'
          ? await TradingService.estimateBuy(tokenIdentifier, tokenAmount)
          : await TradingService.estimateSell(tokenIdentifier, tokenAmount)
        
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
  }, [amount, activeTab, tokenData?.token_id, tokenData?.asa_id])

  const handleTrade = async () => {
    if (!isConnected) {
      connectWallet()
      return
    }

    if (!amount || parseFloat(amount) <= 0) {
      setTradeError('Please enter a valid amount')
      return
    }

    // Support both asa_id (Algorand) and token_id (Aptos)
    if (!tokenData?.asa_id && !tokenData?.token_id) {
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
    
    // Use content_id (token_id) for Aptos tokens, or asa_id for legacy Algorand tokens
    // Priority: content_id > token_id > metadata_address > asa_id
    // Note: content_id is what the contract uses, so it's the most reliable identifier
    const tokenIdentifier = tokenData.content_id || tokenData.token_id || tokenData.metadata_address || tokenData.asa_id
    if (!tokenIdentifier) {
      console.error('❌ Token identifier not found in tokenData:', tokenData)
      setTradeError('Token identifier not found')
      setIsProcessing(false)
      return
    }
    
    console.log(`[handleTrade] Using token identifier: ${tokenIdentifier} (content_id: ${tokenData.content_id}, token_id: ${tokenData.token_id}, asa_id: ${tokenData.asa_id})`)
    
    const estimate = activeTab === 'buy'
      ? await TradingService.estimateBuy(tokenIdentifier, tradeAmount)
      : await TradingService.estimateSell(tokenIdentifier, tradeAmount)

    // Validate estimate
    if (!estimate) {
      setTradeError('Failed to get trade estimate. Please try again.')
      setIsProcessing(false)
      return
    }

    // Minimum APT amount validation (1000 octas = 0.00001 APT is the contract's base price per token)
    const MIN_APT_AMOUNT = 0.00001 // Minimum meaningful APT amount (1000 octas)
    
    if (activeTab === 'buy') {
      // Validate buy estimate
      if (!estimate.algo_cost || estimate.algo_cost <= 0) {
        // If price is $0, use contract's base price (0.00001 APT per token)
        if (currentPrice === 0 || !currentPrice) {
          const basePricePerToken = 0.00001 // Contract base price for first buy
          estimate.algo_cost = tradeAmount * basePricePerToken
          estimate.new_price = basePricePerToken
        } else {
          setTradeError(`Invalid trade estimate. Cost: ${estimate.algo_cost || 'N/A'} APTOS. Please try again.`)
          setIsProcessing(false)
          return
        }
      }
      
      // Check if estimate is invalid (zero, negative, or NaN)
      const algoCost = Number(estimate.algo_cost)
      if (!algoCost || algoCost <= 0 || !isFinite(algoCost)) {
        setTradeError(
          `Invalid trade estimate! ` +
          `The backend returned a cost of ${estimate.algo_cost || 0} APTOS, which is invalid. ` +
          `This may indicate an issue with the token's bonding curve configuration. ` +
          `Please refresh the page and try again. If the problem persists, contact support.`
        )
        setIsProcessing(false)
        return
      }
      
      // Validate that the cost per token makes sense (sanity check)
      const costPerToken = algoCost / tradeAmount
      if (!isFinite(costPerToken) || costPerToken < 0.00000001) { 
        // Less than 0.00000001 APT per token seems wrong, or NaN/Infinity
        // This usually means the backend estimate is using incorrect reserve/supply values
        setTradeError(
          `Invalid trade estimate from backend! ` +
          `The estimated cost per token (${isFinite(costPerToken) ? costPerToken.toFixed(12) : 'invalid'} APT) is too low. ` +
          `This indicates the backend's bonding curve calculation is using incorrect contract state. ` +
          `The frontend is correctly preventing this invalid transaction. ` +
          `Please refresh the page. If the problem persists, the backend needs to fetch the actual contract state.`
        )
        setIsProcessing(false)
        return
      }
      
      // Check if APT cost is too small to be meaningful (but estimate is valid)
      if (algoCost < MIN_APT_AMOUNT) {
        // Calculate minimum tokens needed based on current cost per token
        const minTokens = Math.ceil(MIN_APT_AMOUNT / costPerToken)
        
        // If the calculation results in an unreasonably large number or invalid, the estimate is likely wrong
        if (!isFinite(minTokens) || minTokens > 1000000) {
          setTradeError(
            `Invalid trade estimate! ` +
            `The estimated cost (${algoCost.toFixed(10)} APT) is too low to be valid. ` +
            `This suggests the bonding curve calculation may be incorrect. ` +
            `Please refresh the page and try again. If the problem persists, contact support.`
          )
        } else {
          setTradeError(
            `Trade amount is too small! ` +
            `Minimum APT payment is ${MIN_APT_AMOUNT} APT (1000 octas). ` +
            `Your trade would cost only ${algoCost.toFixed(10)} APT. ` +
            `Please buy at least ${minTokens.toLocaleString()} tokens to meet the minimum.`
          )
        }
        setIsProcessing(false)
        return
      }
      
      // Check if trade amount is unreasonably large (prevent potential overflow issues)
      const MAX_TRADE_AMOUNT = 10000000 // 10 million tokens max per trade
      if (tradeAmount > MAX_TRADE_AMOUNT) {
        setTradeError(
          `Trade amount is too large! ` +
          `Maximum trade size is ${MAX_TRADE_AMOUNT.toLocaleString()} tokens per transaction. ` +
          `Please split your trade into smaller amounts.`
        )
        setIsProcessing(false)
        return
      }
    } else {
      // Validate sell estimate
      if (!estimate.algo_received || estimate.algo_received <= 0) {
        setTradeError(`Invalid sell estimate. You would receive: ${estimate.algo_received || 'N/A'} APTOS. Please try again.`)
        setIsProcessing(false)
        return
      }
      
      // Check if APT received is too small to be meaningful
      if (estimate.algo_received < MIN_APT_AMOUNT) {
        const minTokens = Math.ceil(MIN_APT_AMOUNT / (estimate.algo_received / tradeAmount))
        setTradeError(
          `Trade amount is too small! ` +
          `Minimum APT received is ${MIN_APT_AMOUNT} APT (1000 octas). ` +
          `Your trade would receive only ${estimate.algo_received.toFixed(10)} APT. ` +
          `Please sell at least ${minTokens} tokens to meet the minimum.`
        )
        setIsProcessing(false)
        return
      }
    }

    // Cache for supply values to avoid duplicate API calls (rate limit protection)
    let cachedSupply: { current: number; total: number; reserve: number } | null = null

    // Check balances (including minimum balance requirement)
    if (activeTab === 'buy') {
      
      // Check available supply from contract and adjust APT payment if needed
      // THIS CHECK IS CRITICAL - must block transaction if supply is insufficient
      if (tokenData?.creator) {
        try {
          // Get tokenId (content_id) from tokenData
          const tokenId = tokenData.content_id || tokenData.token_id || String(tokenData.asa_id || '')
          if (!tokenId) {
            throw new Error('No tokenId found in tokenData')
          }
          
          // Use MODULE_ADDRESS for contract queries (contract is deployed there)
          // The service functions will automatically try new contract first, then fallback to old contract
          const creatorAddress = tokenData.creator || '0x033349213be67033ffd596fa85b69ab5c3ff82a508bb446002c8419d549d12c6'
          const currentSupply = await getCurrentSupply(creatorAddress, tokenId)
          const totalSupply = await getTotalSupply(creatorAddress, tokenId)
          
          // Try to get APT reserve, but if it fails (e.g., 400 error), default to 0
          // This is fine for first buy when reserve is 0 anyway
          let aptReserve = 0
          try {
            aptReserve = await getAptReserve(creatorAddress, tokenId)
          } catch (reserveError) {
            console.warn('⚠️ Could not fetch APT reserve (this is OK for first buy):', reserveError)
            // Default to 0 for first buy - this is expected when no tokens have been bought yet
            aptReserve = 0
          }
          
          // Cache values for later use to avoid duplicate API calls
          cachedSupply = { current: currentSupply, total: totalSupply, reserve: aptReserve }
          
          console.log(`[Supply Check] Current: ${currentSupply}, Total: ${totalSupply}, Reserve: ${aptReserve}`)
          
          // CRITICAL: Verify the contract state matches our expectations
          if (totalSupply === 0) {
            setTradeError(
              `Token not properly initialized! ` +
              `Total supply is 0. The token may not have been created correctly. ` +
              `Please contact support or try creating a new token.`
            )
            setIsProcessing(false)
            return
          }
          
          if (currentSupply > totalSupply) {
            setTradeError(
              `Invalid contract state! ` +
              `Current supply (${currentSupply}) exceeds total supply (${totalSupply}). ` +
              `This should not happen. Please contact support.`
            )
            setIsProcessing(false)
            return
          }
          
          if (currentSupply >= totalSupply) {
            setTradeError(
              `All tokens have been minted! ` +
              `Current supply: ${currentSupply.toFixed(2)} / ${totalSupply.toFixed(2)}. ` +
              `You can only sell existing tokens, not buy new ones.`
            )
            setIsProcessing(false)
            return
          }
          
          const availableSupply = totalSupply - currentSupply
          
          // Get APT payment from estimate (in APT, will convert to octas for contract)
          const aptPayment = estimate.algo_cost
          
          if (!aptPayment || aptPayment <= 0) {
            setTradeError('Invalid APT payment amount. Please try again.')
            setIsProcessing(false)
            return
          }
          
          // Convert APT to octas for calculation (matching contract)
          const aptPaymentOctas = aptPayment * 100000000
          
          // Calculate how many tokens the contract will mint from the APT payment
          // Contract formula (in creator_token.move):
          // - If old_supply == 0: tokens_received = apt_payment / base_price (base_price = 1000 octas)
          // - If old_supply > 0: tokens_received = apt_payment / (old_reserve / old_supply)
          const basePriceOctas = 1000 // 0.00001 APT per token (1000 octas)
          let estimatedTokensFromContract: number
          
          if (currentSupply === 0) {
            // First buy: use base price (contract uses integer division)
            estimatedTokensFromContract = Math.floor(aptPaymentOctas / basePriceOctas)
          } else {
            // Subsequent buys: price = reserve / supply
            // Use cached reserve value to avoid duplicate API call
            const aptReserveOctas = Math.round(aptReserve * 100000000)
            if (aptReserveOctas === 0 || currentSupply === 0) {
              // Fallback to base price if reserve is 0
              estimatedTokensFromContract = Math.floor(aptPaymentOctas / basePriceOctas)
            } else {
              // Contract uses integer division: tokens = apt_payment / (old_reserve / old_supply)
              const currentPriceOctas = Math.floor(aptReserveOctas / currentSupply)
              if (currentPriceOctas === 0) {
                // Prevent division by zero
                estimatedTokensFromContract = Math.floor(aptPaymentOctas / basePriceOctas)
              } else {
                estimatedTokensFromContract = Math.floor(aptPaymentOctas / currentPriceOctas)
              }
            }
          }
          
          console.log(`[Supply Check] APT Payment: ${aptPayment} (${aptPaymentOctas} octas)`)
          console.log(`[Supply Check] Estimated tokens: ${estimatedTokensFromContract}`)
          console.log(`[Supply Check] Available supply: ${availableSupply}`)
          
          // Check if contract will try to mint more than available
          if (estimatedTokensFromContract > availableSupply) {
            // Calculate maximum APT payment for available supply
            let maxAptForAvailableTokens: number
            if (currentSupply === 0) {
              maxAptForAvailableTokens = (availableSupply * basePriceOctas) / 100000000
            } else {
              // Use cached reserve value to avoid duplicate API call
              const aptReserveOctas = Math.round(aptReserve * 100000000)
              const currentPriceOctas = aptReserveOctas > 0 && currentSupply > 0 
                ? Math.floor(aptReserveOctas / currentSupply) 
                : basePriceOctas
              maxAptForAvailableTokens = (availableSupply * currentPriceOctas) / 100000000
            }
            
            setTradeError(
              `Insufficient token supply! ` +
              `Available: ${availableSupply.toFixed(0)} tokens, ` +
              `but your payment of ${aptPayment.toFixed(6)} APT would mint ~${estimatedTokensFromContract.toFixed(0)} tokens. ` +
              `Maximum you can buy: ${maxAptForAvailableTokens.toFixed(6)} APT (${availableSupply.toFixed(0)} tokens). ` +
              `Current supply: ${currentSupply.toFixed(0)} / ${totalSupply.toFixed(0)}. ` +
              `Please reduce your amount to ${availableSupply.toFixed(0)} tokens or less.`
            )
            setIsProcessing(false)
            return
          }
          
          // Additional safety check: ensure new supply won't exceed total
          // Add safety margin to account for rounding differences between frontend and contract
          const safetyMargin = 1 // 1 token buffer
          const newSupplyAfterTrade = currentSupply + estimatedTokensFromContract
          const maxAllowedSupply = totalSupply - safetyMargin
          
          if (newSupplyAfterTrade > maxAllowedSupply) {
            const maxTokensCanBuy = availableSupply - safetyMargin
            setTradeError(
              `Transaction would exceed total supply! ` +
              `Current: ${currentSupply.toFixed(0)}, ` +
              `Would mint: ${estimatedTokensFromContract.toFixed(0)}, ` +
              `Total: ${totalSupply.toFixed(0)}. ` +
              `Maximum you can buy: ${maxTokensCanBuy.toFixed(0)} tokens. ` +
              `Please reduce your amount.`
            )
            setIsProcessing(false)
            return
          }
          
          console.log(`[Supply Check] ✅ Passed - Will mint ${estimatedTokensFromContract} tokens, new supply: ${newSupplyAfterTrade}`)
        } catch (error) {
          console.error('❌ Error checking token supply:', error)
          // DO NOT proceed if supply check fails - this is critical
          setTradeError(
            `Failed to verify token supply from contract. ` +
            `Please refresh and try again. Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
          setIsProcessing(false)
          return
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
        
        // FINAL SUPPLY CHECK - Use cached values if available to avoid rate limits
        // Only query contract if we don't have cached values (e.g., early check failed due to rate limit)
        if (tokenData?.creator) {
          try {
            let currentSupply: number
            let totalSupply: number
            let aptReserve: number
            
            // Define creatorAddress before the conditional so it's available in both branches
            const creatorAddress = tokenData.creator || '0x033349213be67033ffd596fa85b69ab5c3ff82a508bb446002c8419d549d12c6'
            
            // Use cached values if available, otherwise query contract
            if (cachedSupply) {
              console.log(`[Final Supply Check] Using cached supply values to avoid rate limits`)
              currentSupply = cachedSupply.current
              totalSupply = cachedSupply.total
              aptReserve = cachedSupply.reserve
            } else {
              console.log(`[Final Supply Check] Querying contract (no cached values)`)
              // Get tokenId (content_id) from tokenData
              const tokenId = tokenData.content_id || tokenData.token_id || String(tokenData.asa_id || '')
              if (!tokenId) {
                throw new Error('No tokenId found in tokenData')
              }
              
              // Use MODULE_ADDRESS for contract queries
              // The service functions will automatically try new contract first, then fallback to old contract
              currentSupply = await getCurrentSupply(creatorAddress, tokenId)
              totalSupply = await getTotalSupply(creatorAddress, tokenId)
              aptReserve = await getAptReserve(creatorAddress, tokenId)
            }
            
            const availableSupply = totalSupply - currentSupply
            
            console.log(`[Final Supply Check] ========================================`)
            console.log(`[Final Supply Check] Creator: ${creatorAddress}`)
            console.log(`[Final Supply Check] Current Supply: ${currentSupply}`)
            console.log(`[Final Supply Check] Total Supply: ${totalSupply}`)
            console.log(`[Final Supply Check] Available Supply: ${availableSupply}`)
            console.log(`[Final Supply Check] APT Payment: ${algoAmount} APT`)
            
            // Check if token was even initialized
            if (totalSupply === 0) {
              setTradeError(
                `Token not properly initialized! ` +
                `Total supply is 0. Please contact support or recreate the token.`
              )
              setIsProcessing(false)
              return
            }
            
            if (availableSupply <= 0) {
              setTradeError(
                `All tokens have been minted! ` +
                `Current supply: ${currentSupply.toFixed(0)} / ${totalSupply.toFixed(0)}. ` +
                `You can only sell existing tokens, not buy new ones.`
              )
              setIsProcessing(false)
              return
            }
            
            // Convert APT to octas for calculation (matching contract)
            const aptPaymentOctas = Math.round(algoAmount * 100000000)
            const basePriceOctas = 1000 // 0.00001 APT per token
            
            // Calculate tokens using EXACT contract formula
            let estimatedTokensFromContract: number
            if (currentSupply === 0) {
              // First buy: tokens = apt_payment / base_price (integer division)
              estimatedTokensFromContract = Math.floor(aptPaymentOctas / basePriceOctas)
            } else {
              // Subsequent buys: tokens = apt_payment / (old_reserve / old_supply)
              const aptReserveOctas = Math.round(aptReserve * 100000000)
              if (aptReserveOctas === 0 || currentSupply === 0) {
                estimatedTokensFromContract = Math.floor(aptPaymentOctas / basePriceOctas)
              } else {
                const currentPriceOctas = Math.floor(aptReserveOctas / currentSupply)
                if (currentPriceOctas === 0) {
                  estimatedTokensFromContract = Math.floor(aptPaymentOctas / basePriceOctas)
                } else {
                  estimatedTokensFromContract = Math.floor(aptPaymentOctas / currentPriceOctas)
                }
              }
            }
            
            console.log(`[Final Supply Check] APT Payment: ${algoAmount} (${aptPaymentOctas} octas)`)
            console.log(`[Final Supply Check] Estimated tokens: ${estimatedTokensFromContract}`)
            
            // Check if this would exceed total supply
            // Add safety margin: ensure we have at least 1 token buffer to account for rounding differences
            const newSupplyAfterTrade = currentSupply + estimatedTokensFromContract
            const safetyMargin = 1 // 1 token buffer for rounding differences
            const maxAllowedSupply = totalSupply - safetyMargin
            
            console.log(`[Final Supply Check] Estimated tokens to mint: ${estimatedTokensFromContract}`)
            console.log(`[Final Supply Check] New supply after trade: ${newSupplyAfterTrade}`)
            console.log(`[Final Supply Check] Total supply limit: ${totalSupply}`)
            console.log(`[Final Supply Check] Max allowed supply (with safety margin): ${maxAllowedSupply}`)
            
            if (newSupplyAfterTrade > maxAllowedSupply) {
              const maxTokensCanBuy = availableSupply - safetyMargin
              const maxAptCanSpend = currentSupply === 0 
                ? (maxTokensCanBuy * 0.00001)
                : (maxTokensCanBuy * (aptReserve / currentSupply))
              
              console.error(`[Final Supply Check] ❌ BLOCKED - Would exceed supply!`)
              console.error(`[Final Supply Check] Max tokens you can buy: ${maxTokensCanBuy}`)
              console.error(`[Final Supply Check] Max APT you can spend: ${maxAptCanSpend.toFixed(6)}`)
              
              setTradeError(
                `Transaction would exceed total supply! ` +
                `Current supply: ${currentSupply.toFixed(0)}, ` +
                `Would mint: ${estimatedTokensFromContract.toFixed(0)}, ` +
                `Total supply: ${totalSupply.toFixed(0)}. ` +
                `Available: ${availableSupply.toFixed(0)} tokens. ` +
                `Maximum you can buy: ${maxTokensCanBuy.toFixed(0)} tokens (${maxAptCanSpend.toFixed(6)} APT). ` +
                `Please reduce your amount.`
              )
              setIsProcessing(false)
              return
            }
            
            // Calculate min tokens for slippage protection (90% of estimated)
            // But ensure it doesn't exceed available supply
            // Also reduce estimated tokens by safety margin to be extra conservative
            const safeEstimatedTokens = Math.max(1, estimatedTokensFromContract - safetyMargin)
            const maxMinTokens = Math.min(safeEstimatedTokens, availableSupply - safetyMargin)
            const minTokensReceived = Math.floor(maxMinTokens * 0.9)
            
            // Reduce APT payment slightly to account for rounding differences
            // This ensures the contract won't calculate more tokens than we expect
            const safetyReductionFactor = 0.999 // Reduce by 0.1% to be extra safe
            const safeAptPayment = algoAmount * safetyReductionFactor
            
            console.log(`[Final Supply Check] Estimated tokens (before safety): ${estimatedTokensFromContract}`)
            console.log(`[Final Supply Check] Safe estimated tokens (after safety margin): ${safeEstimatedTokens}`)
            console.log(`[Final Supply Check] Original APT payment: ${algoAmount}`)
            console.log(`[Final Supply Check] Safe APT payment (reduced by 0.1%): ${safeAptPayment}`)
            console.log(`[Final Supply Check] ✅ Proceeding - Min tokens: ${minTokensReceived}, Max available: ${availableSupply}`)
            
            // Double-check: ensure we're not trying to buy more than available
            if (safeEstimatedTokens > availableSupply) {
              const maxTokensCanBuy = availableSupply - safetyMargin
              const maxAptCanSpend = currentSupply === 0 
                ? (maxTokensCanBuy * 0.00001)
                : (maxTokensCanBuy * (aptReserve / currentSupply))
              
              setTradeError(
                `Transaction would exceed available supply! ` +
                `Available: ${availableSupply.toFixed(0)} tokens, ` +
                `Would mint: ${safeEstimatedTokens.toFixed(0)} tokens. ` +
                `Maximum you can buy: ${maxTokensCanBuy.toFixed(0)} tokens (${maxAptCanSpend.toFixed(6)} APT). ` +
                `Please reduce your amount.`
              )
              setIsProcessing(false)
              return
            }
            
            // Get tokenId (content_id) from tokenData
            const tokenId = tokenData.content_id || tokenData.token_id || String(tokenData.asa_id || '')
            if (!tokenId) {
              throw new Error('No tokenId found in tokenData')
            }
            
            // Use MODULE_ADDRESS for contract calls (reuse creatorAddress from above)
            const buyResult = await buyTokensWithContract({
              buyer: address!,
              petraWallet: petraWallet,
              creatorAddress: creatorAddress,
              tokenId: tokenId, // content_id
              aptPayment: safeAptPayment, // Use reduced APT payment for extra safety
              minTokensReceived: minTokensReceived // Minimum tokens expected
            })
            
            txId = buyResult.txId
            finalPrice = estimate.new_price
            
            // Sync contract trade to backend database
            try {
              // Get updated contract state after buy
              const updatedSupply = await getCurrentSupply(creatorAddress, tokenId)
              const updatedReserve = await getAptReserve(creatorAddress, tokenId)
              
              await TradingService.syncContractTrade(
                tokenId,
                'buy',
                txId,
                address!,
                tradeAmount,
                safeAptPayment,
                updatedSupply,
                updatedReserve / 100000000 // Convert octas to APT
              )
              console.log('✅ Synced buy trade to backend')
            } catch (syncError) {
              console.warn('⚠️ Failed to sync buy trade to backend (non-critical):', syncError)
              // Don't fail the transaction if sync fails
            }
        
        // Note: Token transfer is handled by the backend's bonding_curve_buy endpoint
        // The backend transfers tokens from creator to buyer automatically
        // No need for additional transfer here
          } catch (error) {
            // This catch block is for supply check errors, not transaction errors
            // Transaction errors should be caught in the outer try-catch
            console.error('❌ Supply check or transaction failed:', error)
            
            // Check if it's a transaction error (from buyTokensWithContract)
            if (error && typeof error === 'object' && 'message' in error) {
              const errorMessage = (error as any).message || String(error)
              if (errorMessage.includes('PetraApiError') || errorMessage.includes('transaction') || errorMessage.includes('rejected')) {
                // This is a transaction error, not a supply check error
                throw error // Re-throw to be caught by outer catch
              }
            }
            
            setTradeError(
              `Failed to verify token supply before transaction. ` +
              `Please refresh and try again. Error: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
            setIsProcessing(false)
            return
          }
      } else {
          // Fallback if creator address is missing
          setTradeError('Token creator address not found. Please refresh and try again.')
          setIsProcessing(false)
          return
        }
      } else {
        // Sell tokens using contract
        const minAptReceived = (estimate.algo_received || 0) * 0.9 // 10% slippage tolerance
        
        // Get tokenId (content_id) from tokenData
        const tokenId = tokenData.content_id || tokenData.token_id || String(tokenData.asa_id || '')
        if (!tokenId) {
          throw new Error('No tokenId found in tokenData')
        }
        
        // Use MODULE_ADDRESS for contract calls (contract is deployed there)
        const creatorAddress = tokenData.creator || '0x033349213be67033ffd596fa85b69ab5c3ff82a508bb446002c8419d549d12c6'
        
        // Try to use contract to sell tokens, fallback to backend service
        try {
          const sellResult = await sellTokensWithContract({
            seller: address!,
            petraWallet: petraWallet,
            creatorAddress: creatorAddress,
            tokenId: tokenId, // content_id
            tokenAmount: tradeAmount,
            minAptReceived: minAptReceived
          })
          
          txId = sellResult.txId
          finalPrice = estimate.new_price
          
          // Sync contract trade to backend database
          try {
            // Get updated contract state after sell
            const updatedSupply = await getCurrentSupply(creatorAddress, tokenId)
            const updatedReserve = await getAptReserve(creatorAddress, tokenId)
            
            await TradingService.syncContractTrade(
              tokenId,
              'sell',
              txId,
              address!,
              tradeAmount,
              estimate.algo_received || 0,
              updatedSupply,
              updatedReserve / 100000000 // Convert octas to APT
            )
            console.log('✅ Synced sell trade to backend')
          } catch (syncError) {
            console.warn('⚠️ Failed to sync sell trade to backend (non-critical):', syncError)
            // Don't fail the transaction if sync fails
          }
        } catch (contractError: any) {
          // Fallback to backend service if contract call fails
          console.warn('Contract sell failed, using backend service:', contractError)
          
          const result = await TradingService.executeSell(
            assetId,
            tradeAmount,
            address!,
            ''
          )
          
          if (!result.success) {
            throw new Error(result.error || 'Sell failed')
          }
          
          txId = result.transaction_id || 'pending'
          finalPrice = result.new_price || estimate.new_price
        }
      }

      // Update current price
      setCurrentPrice(finalPrice)

      // Refresh token data and trade history
      await fetchTokenData()
      await fetchTradeHistory(assetId)
      
      // Wait a moment for blockchain to update, then refresh user token balance and contract state
      setTimeout(async () => {
        await fetchUserTokenBalance(assetId)
        await fetchContractState() // Refresh contract state for bonding curve
      }, 2000) // Wait 2 seconds for blockchain confirmation
      
      // Also refresh immediately (in case it's already updated)
      await fetchUserTokenBalance(assetId)
      await fetchContractState() // Refresh contract state for bonding curve

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
      
      // Extract detailed error message
      let errorMessage = error?.message || 'Failed to execute trade. Please try again.'
      
      // Handle specific error types
      if (error?.name === 'NetworkMismatchError' || errorMessage.includes('Network mismatch') || errorMessage.includes('different networks')) {
        setTradeError('⚠️ Network Mismatch!\n\nPlease ensure your Petra Wallet is set to TESTNET.\n\nTo fix:\n1. Open Petra Wallet app\n2. Go to Settings\n3. Switch to Testnet\n4. Try again')
      } else if (errorMessage.includes('E_INSUFFICIENT_BALANCE') || errorMessage.includes('0x10002') || errorMessage.includes('Insufficient token supply')) {
        setTradeError(
          `Transaction failed: Insufficient token supply.\n\n` +
          `The transaction would exceed the total supply limit. ` +
          `Please reduce the amount and try again.`
        )
      } else if (errorMessage.includes('E_INSUFFICIENT_PAYMENT') || errorMessage.includes('0x10003') || errorMessage.includes('Slippage')) {
        setTradeError(
          `Transaction failed: Slippage protection triggered.\n\n` +
          `You would receive fewer tokens than expected. ` +
          `Please try again with a smaller amount or wait for the price to stabilize.`
        )
      } else if (errorMessage.includes('INSUFFICIENT_BALANCE_FOR_TRANSACTION_FEE')) {
        setTradeError(
          `Insufficient APT balance for transaction fees.\n\n` +
          `Please add more APT to your wallet and try again.`
        )
      } else if (errorMessage.includes('rejected') || errorMessage.includes('User rejected')) {
        setTradeError('Transaction was rejected. Please approve the transaction in your wallet.')
      } else if (errorMessage.includes('4001') || error?.code === 4001) {
        setTradeError(
          `Transaction failed (Error 4001).\n\n` +
          `This usually means:\n` +
          `• The transaction amount is invalid or too large\n` +
          `• The estimate may be incorrect - please try a smaller amount\n` +
          `• The token contract may need to be reinitialized\n\n` +
          `Please try again with a smaller trade amount.`
        )
      } else {
        setTradeError(`Failed to execute trade: ${errorMessage}`)
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
                        // Use contract supply if available (most accurate), otherwise fallback to database state
                        if (contractSupply !== null) {
                          return contractSupply
                        }
                        const supply = tokenData.bonding_curve_state?.token_supply
                        const numSupply = typeof supply === 'number' ? supply : (typeof supply === 'string' ? parseFloat(supply) : 0)
                        return isNaN(numSupply) ? 0 : numSupply
                      })()
                    }
                    currentPrice={
                      (() => {
                        // Calculate price from contract state if available
                        if (contractSupply !== null && contractReserve !== null && contractSupply > 0) {
                          return contractReserve / contractSupply
                        }
                        const price = Number(tokenData.current_price || currentPrice)
                        return isNaN(price) || price <= 0 ? (tokenData.bonding_curve_config?.initial_price || 0.001) : price
                      })()
                    }
                    marketCap={
                      (() => {
                        // Use contract values for accurate market cap
                        if (contractSupply !== null && contractReserve !== null && contractSupply > 0) {
                          const contractPrice = contractReserve / contractSupply
                          const totalSupply = Number(tokenData.total_supply || 0)
                          return contractPrice * totalSupply
                        }
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
                              {tradeEstimate.algo_cost?.toFixed(6) || '0.000000'} APTOS
                            </span>
                          </div>
                          {tradeEstimate.algo_cost && parseFloat(amount) > 0 && (
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>Price per token:</span>
                              <span>{(tradeEstimate.algo_cost / parseFloat(amount)).toFixed(8)} APTOS</span>
                            </div>
                          )}
                          {tradeEstimate.new_price && (
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>New price after trade:</span>
                              <span>${tradeEstimate.new_price.toFixed(6)}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">You will receive:</span>
                            <span className="text-green-400 font-semibold">
                              {tradeEstimate.algo_received?.toFixed(6) || '0.000000'} APTOS
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Selling:</span>
                            <span className="text-white font-medium">
                              {parseFloat(amount).toFixed(2)} {tokenData?.token_symbol || tokenData?.symbol || 'tokens'}
                            </span>
                          </div>
                          {tradeEstimate.algo_received && parseFloat(amount) > 0 && (
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>Price per token:</span>
                              <span>{(tradeEstimate.algo_received / parseFloat(amount)).toFixed(8)} APTOS</span>
                            </div>
                          )}
                          {tradeEstimate.new_price && (
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>New price after trade:</span>
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
