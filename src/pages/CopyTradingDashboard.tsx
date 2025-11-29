import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Copy,
  ArrowRight,
  DollarSign,
  BarChart3,
  TrendingUp,
  Users,
  Zap,
  Clock,
  Shield,
  Bot,
  Activity,
  Star,
  X,
  ExternalLink
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import PremiumBackground from '../components/PremiumBackground'
import { useWallet } from '../contexts/WalletContext'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { API_BASE_URL } from '../services/config'

interface TraderSummary {
  trader_address: string
  trade_count: number
  buy_volume: number
  sell_volume: number
  net_pnl: number
  roi_pct: number
  distinct_tokens: number
  first_trade_at: string
  last_trade_at: string
}

interface TraderPnlPoint {
  day: string
  pnl: number
}

interface TraderTrade {
  trade_type: 'buy' | 'sell'
  amount: number
  price: number
  total_value: number
  created_at: string
  transaction_id: string
  asa_id: number
  token_name?: string
  token_symbol?: string
}

const formatAlgo = (value: number) => value.toFixed(2)
const formatPct = (value: number) => `${value.toFixed(2)}%`

const CopyTradingDashboard: React.FC = () => {
  const { address, isConnected } = useWallet()
  const navigate = useNavigate()
  const [selectedTrader, setSelectedTrader] = useState<string | null>(null)
  const [selectedTraderForCopy, setSelectedTraderForCopy] = useState<string | null>(null)
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false)
  const [isTraderProfileOpen, setIsTraderProfileOpen] = useState(false)
  const [viewingTrader, setViewingTrader] = useState<TraderSummary | null>(null)
  const [copyAllocation, setCopyAllocation] = useState(10)
  const [copyMaxTrade, setCopyMaxTrade] = useState(5)
  const [copyType, setCopyType] = useState<'proportional' | 'fixed'>('proportional')
  const [copyRisk, setCopyRisk] = useState<'conservative' | 'balanced' | 'aggressive'>('balanced')

  const { data: leaderboardData, isLoading: isLeaderboardLoading } = useQuery({
    queryKey: ['copy-trading', 'leaderboard'],
    queryFn: async (): Promise<TraderSummary[]> => {
      const res = await fetch(`${API_BASE_URL}/api/copy-trading/leaderboard?timeframe=30d`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to load leaderboard')
      return json.traders || []
    }
  })

  const effectiveTrader = useMemo(() => {
    if (selectedTrader) return selectedTrader
    if (leaderboardData && leaderboardData.length > 0) return leaderboardData[0].trader_address
    return null
  }, [selectedTrader, leaderboardData])

  const { data: pnlData } = useQuery({
    queryKey: ['copy-trading', 'pnl', effectiveTrader],
    enabled: !!effectiveTrader,
    queryFn: async (): Promise<TraderPnlPoint[]> => {
      const res = await fetch(`${API_BASE_URL}/api/copy-trading/trader/${effectiveTrader}/pnl?timeframe=30d`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to load PnL')
      return json.points || []
    }
  })

  const { data: traderTrades } = useQuery({
    queryKey: ['copy-trading', 'trades', effectiveTrader],
    enabled: !!effectiveTrader,
    queryFn: async (): Promise<TraderTrade[]> => {
      const res = await fetch(`${API_BASE_URL}/api/copy-trading/trader/${effectiveTrader}/trades?limit=100`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to load trader trades')
      return json.trades || []
    }
  })

  const { data: viewingTraderTrades } = useQuery({
    queryKey: ['copy-trading', 'trades', viewingTrader?.trader_address],
    enabled: !!viewingTrader?.trader_address,
    queryFn: async (): Promise<TraderTrade[]> => {
      const res = await fetch(`${API_BASE_URL}/api/copy-trading/trader/${viewingTrader?.trader_address}/trades?limit=100`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to load trader trades')
      return json.trades || []
    }
  })

  const { data: viewingTraderPnl } = useQuery({
    queryKey: ['copy-trading', 'pnl', viewingTrader?.trader_address],
    enabled: !!viewingTrader?.trader_address,
    queryFn: async (): Promise<TraderPnlPoint[]> => {
      const res = await fetch(`${API_BASE_URL}/api/copy-trading/trader/${viewingTrader?.trader_address}/pnl?timeframe=30d`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to load PnL')
      return json.points || []
    }
  })

  const { data: traderAnalytics, isLoading: isAnalyticsLoading, error: analyticsError } = useQuery({
    queryKey: ['copy-trading', 'analytics', viewingTrader?.trader_address],
    enabled: !!viewingTrader?.trader_address,
    queryFn: async () => {
      if (!viewingTrader?.trader_address) return null
      const res = await fetch(`${API_BASE_URL}/api/copy-trading/trader/${viewingTrader.trader_address}/analytics`)
      if (!res.ok) {
        const errorText = await res.text()
        console.error('Analytics fetch error:', res.status, errorText)
        throw new Error(`HTTP ${res.status}: ${errorText}`)
      }
      const json = await res.json()
      if (!json.success) {
        console.error('Analytics response error:', json.error)
        throw new Error(json.error || 'Failed to load analytics')
      }
      console.log('✅ Analytics loaded:', json.analytics)
      return json.analytics || null
    },
    retry: 2,
    refetchOnWindowFocus: false
  })

  const [activeTab, setActiveTab] = useState<'overview' | 'trades' | 'holdings'>('overview')

  const selectedTraderSummary = useMemo(() => {
    if (!leaderboardData || !effectiveTrader) return null
    return leaderboardData.find(t => t.trader_address === effectiveTrader) || null
  }, [leaderboardData, effectiveTrader])

  const queryClient = useQueryClient()

  const { data: myProfiles } = useQuery({
    queryKey: ['copy-trading', 'profiles', address],
    enabled: isConnected && !!address,
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/copy-trading/profiles?follower_address=${address}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to load copy profiles')
      return json.profiles || []
    }
  })

  const activeProfilesForTrader = useMemo(() => {
    if (!myProfiles || !effectiveTrader) return []
    return myProfiles.filter((p: any) => p.leader_address === effectiveTrader && p.status === 'active')
  }, [myProfiles, effectiveTrader])

  const totalAllocated = useMemo(() => {
    if (!myProfiles) return 0
    return myProfiles.reduce((sum: number, p: any) => sum + (p.allocation_percent || 0), 0)
  }, [myProfiles])

  const createProfile = async () => {
    if (!address || !selectedTraderForCopy) return
    const body = {
      leader_address: selectedTraderForCopy,
      follower_address: address,
      allocation_percent: copyAllocation,
      max_single_trade_algo: copyMaxTrade,
      copy_type: copyType,
      risk_level: copyRisk
    }
    const res = await fetch(`${API_BASE_URL}/api/copy-trading/profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error || 'Failed to create copy profile')
    await queryClient.invalidateQueries({ queryKey: ['copy-trading', 'profiles', address] })
    setIsCopyModalOpen(false)
    setSelectedTraderForCopy(null)
  }
  
  const handleStartCopying = () => {
    if (!isConnected || !address) {
      alert('Please connect your wallet first')
      return
    }
    if (!leaderboardData || leaderboardData.length === 0) {
      alert('No traders available to copy')
      return
    }
    // If no trader selected, use the first one
    if (!selectedTraderForCopy && leaderboardData.length > 0) {
      setSelectedTraderForCopy(leaderboardData[0].trader_address)
    }
    setIsCopyModalOpen(true)
  }

  return (
    <div className="min-h-screen bg-[#05030b] relative">
      <PremiumBackground variant="purple" />

      <main className="relative z-10 max-w-7xl mx-auto px-4 py-10 space-y-10">
        {/* Header */}
        <section className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-violet-500/30 mb-4">
              <Copy className="w-4 h-4 text-violet-300" />
              <span className="text-xs font-semibold text-violet-200 tracking-wide">
                Smart Copy Trading · Experimental
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-3">
              Mirror Top <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">Creators</span> Automatically
            </h1>
            <p className="text-gray-400 max-w-2xl text-sm md:text-base">
              Follow on-chain creator wallets and automatically copy their trades on ContentVault tokens.
              Configure risk, allocation, and stop-loss. You stay in full control.
            </p>
          </div>

          <div className="w-full lg:w-80">
            <div className="rounded-3xl border border-violet-500/40 bg-gradient-to-br from-violet-900/40 via-slate-900/80 to-sky-900/40 px-5 py-4 shadow-lg shadow-violet-900/40">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-violet-300" />
                  <p className="text-xs uppercase tracking-wide text-violet-200/90 font-semibold">
                    Copy Trading Overview
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 text-[11px] font-medium border border-emerald-400/30">
                  Beta
                </span>
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Connected Wallet</span>
                  <span className="text-right text-gray-200 font-mono truncate max-w-[160px]">
                    {isConnected ? address : 'Not connected'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Active Copy Profiles</span>
                  <span className="text-violet-200 font-semibold">
                    {myProfiles ? myProfiles.length : 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Total Allocated</span>
                  <span className="text-violet-200 font-semibold">
                    {totalAllocated.toFixed(1)}% of portfolio
                  </span>
                </div>
              </div>
              <button
                type="button"
                disabled={!isConnected}
                onClick={handleStartCopying}
                className="mt-4 w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-semibold py-2.5 hover:from-violet-400 hover:to-fuchsia-400 transition-colors"
              >
                <Shield className="w-4 h-4" />
                Risk Settings
              </button>
            </div>
          </div>
        </section>

        {/* Main Grid */}
        <section className="grid lg:grid-cols-3 gap-8">
          {/* Left: P&L Chart */}
          <div className="lg:col-span-2 rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 via-slate-900/80 to-slate-950/90 p-6 md:p-8 shadow-xl shadow-black/40">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs uppercase text-gray-400 tracking-wide mb-1">Portfolio Performance</p>
                <h2 className="text-lg md:text-xl font-semibold text-white flex items-center gap-2">
                  Copy Trading P&amp;L
                  {selectedTraderSummary && (
                    <span className="text-emerald-400 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-400/30">
                      {formatPct(selectedTraderSummary.roi_pct)} (real)
                    </span>
                  )}
                </h2>
              </div>
              <div className="flex items-center gap-3 text-xs">
                {selectedTraderSummary && (
                  <div className="flex items-center gap-1 text-emerald-300">
                    <TrendingUp className="w-3 h-3" />
                    <span>{formatPct(selectedTraderSummary.roi_pct)} net</span>
                  </div>
                )}
                <div className="flex items-center gap-1 text-gray-400">
                  <Clock className="w-3 h-3" />
                  <span>Last 30 days</span>
                </div>
              </div>
            </div>

            <div className="h-60 md:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={pnlData || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="pnlLine" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a855f7" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="day" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(v) => `${v.toFixed(2)} APTOS`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#020617',
                      borderRadius: 12,
                      border: '1px solid rgba(148, 163, 184, 0.3)',
                      color: '#e5e7eb',
                      fontSize: 12
                    }}
                    formatter={(value: any) => [`${(value as number).toFixed(2)} APTOS`, 'P&L']}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="pnl"
                    stroke="url(#pnlLine)"
                    strokeWidth={2.5}
                    dot={{ r: 3, stroke: '#e5e7eb', strokeWidth: 1 }}
                    activeDot={{ r: 5 }}
                    name="Daily P&L"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {pnlData && pnlData.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-4 text-xs">
                <div className="rounded-2xl bg-white/5 border border-white/10 px-3 py-2">
                  <p className="text-gray-400 mb-1">Best Day</p>
                  <p className="text-white font-semibold">
                    {`${Math.max(...pnlData.map(p => p.pnl)).toFixed(2)} APTOS`}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 px-3 py-2">
                  <p className="text-gray-400 mb-1">Worst Day</p>
                  <p className="text-white font-semibold">
                    {`${Math.min(...pnlData.map(p => p.pnl)).toFixed(2)} APTOS`}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/5 border border-white/10 px-3 py-2">
                  <p className="text-gray-400 mb-1">Total P&L</p>
                  <p className="text-white font-semibold">
                    {`${pnlData.reduce((acc, p) => acc + p.pnl, 0).toFixed(2)} APTOS`}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right: Quick Settings */}
          <div className="space-y-5">
            <div className="rounded-3xl border border-violet-500/40 bg-gradient-to-b from-slate-900/90 via-violet-900/40 to-slate-950/90 p-5 shadow-lg shadow-violet-900/40">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-yellow-300" />
                <h3 className="text-sm font-semibold text-white">Start Copying</h3>
              </div>
              <p className="text-xs text-gray-400 mb-4">
                Pick a top creator wallet to follow. All their trades on ContentVault tokens will be mirrored in your wallet based on your allocation.
              </p>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Allocation</span>
                  <span className="text-violet-200 font-semibold">
                    {copyAllocation.toFixed(1)}% of portfolio
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Max Single Trade</span>
                  <span className="text-violet-200 font-semibold">
                    {copyMaxTrade.toFixed(2)} APTOS
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Copy Type</span>
                  <span className="text-violet-200 font-semibold">
                    {copyType === 'proportional' ? 'Proportional' : 'Fixed size'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                disabled={!isConnected || !effectiveTrader}
                onClick={handleStartCopying}
                className="mt-4 w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-semibold py-2.5 hover:from-violet-400 hover:to-fuchsia-400 transition-colors"
              >
                <Copy className="w-4 h-4" />
                Configure Copy Rules
              </button>
            </div>

            <div className="rounded-3xl border border-cyan-500/40 bg-gradient-to-b from-slate-900/90 via-cyan-900/40 to-slate-950/90 p-5 shadow-lg shadow-cyan-900/40">
              <div className="flex items-center gap-2 mb-3">
                <Bot className="w-4 h-4 text-cyan-300" />
                <h3 className="text-sm font-semibold text-white">Engagement Bot (Auto Buy/Sell)</h3>
              </div>
              <p className="text-xs text-gray-400 mb-4">
                Experimental bot that reacts to real-time likes, views, and comments. Automatically buys or sells creator tokens based on engagement spikes.
              </p>
              <ul className="text-xs text-gray-300 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Buy when likes increase &gt; 15% in 1 hour</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>Reduce position when views stagnate for 24h</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-rose-400" />
                  <span>Hard stop-loss at -20% from entry</span>
                </li>
              </ul>
              <button
                className="mt-4 w-full flex items-center justify-center gap-2 rounded-2xl border border-cyan-400/50 text-cyan-200 text-sm font-semibold py-2.5 hover:bg-cyan-500/10 transition-colors"
              >
                <Activity className="w-4 h-4" />
                Manage Bot Strategies
              </button>
            </div>
          </div>
        </section>

        {/* Copy settings modal */}
        {isCopyModalOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="w-full max-w-lg rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950 border border-violet-500/40 p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Start Copy Trading</h2>
                <button
                  type="button"
                  className="text-gray-400 hover:text-white text-sm"
                  onClick={() => setIsCopyModalOpen(false)}
                >
                  Close
                </button>
              </div>
              {!isConnected ? (
                <p className="text-xs text-gray-400">
                  Connect your wallet to start copy trading.
                </p>
              ) : !leaderboardData || leaderboardData.length === 0 ? (
                <p className="text-xs text-gray-400">
                  No traders available yet. Start trading to build the leaderboard.
                </p>
              ) : (
                <>
                  <div className="mb-4">
                    <label className="block text-gray-300 mb-2 text-xs font-semibold">Select Trader to Follow</label>
                    <select
                      value={selectedTraderForCopy || leaderboardData[0]?.trader_address || ''}
                      onChange={(e) => setSelectedTraderForCopy(e.target.value)}
                      className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-gray-100 text-xs focus:outline-none focus:border-violet-400"
                    >
                      {leaderboardData.map((trader) => (
                        <option key={trader.trader_address} value={trader.trader_address}>
                          {trader.trader_address.slice(0, 8)}...{trader.trader_address.slice(-6)} • {trader.trade_count} trades • {formatPct(trader.roi_pct)} ROI
                        </option>
                      ))}
                    </select>
                    {selectedTraderForCopy && (() => {
                      const trader = leaderboardData.find(t => t.trader_address === selectedTraderForCopy)
                      return trader ? (
                        <div className="mt-2 p-2 rounded-lg bg-violet-500/10 border border-violet-500/30 text-[11px]">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-gray-400">Net P&L:</span>
                            <span className={trader.net_pnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}>
                              {formatAlgo(trader.net_pnl)} APTOS
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400">Tokens Traded:</span>
                            <span className="text-violet-200">{trader.distinct_tokens}</span>
                          </div>
                        </div>
                      ) : null
                    })()}
                  </div>
                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="block text-gray-300 mb-1">Allocation (% of portfolio)</label>
                      <input
                        type="range"
                        min={1}
                        max={50}
                        value={copyAllocation}
                        onChange={(e) => setCopyAllocation(Number(e.target.value))}
                        className="w-full"
                      />
                      <p className="text-gray-400 mt-1">
                        {copyAllocation.toFixed(1)}% of your portfolio will be used for copy trades.
                      </p>
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-1">Max Single Trade (APTOS)</label>
                      <input
                        type="number"
                        min={0.1}
                        step={0.1}
                        value={copyMaxTrade}
                        onChange={(e) => setCopyMaxTrade(Number(e.target.value))}
                        className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-gray-100 text-xs focus:outline-none focus:border-violet-400"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-1">Copy Type</label>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setCopyType('proportional')}
                          className={`px-3 py-1.5 rounded-full border text-[11px] ${
                            copyType === 'proportional'
                              ? 'border-violet-400 bg-violet-500/10 text-violet-200'
                              : 'border-white/10 text-gray-300'
                          }`}
                        >
                          Proportional
                        </button>
                        <button
                          type="button"
                          onClick={() => setCopyType('fixed')}
                          className={`px-3 py-1.5 rounded-full border text-[11px] ${
                            copyType === 'fixed'
                              ? 'border-violet-400 bg-violet-500/10 text-violet-200'
                              : 'border-white/10 text-gray-300'
                          }`}
                        >
                          Fixed Size
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-1">Risk Level</label>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setCopyRisk('conservative')}
                          className={`px-3 py-1.5 rounded-full border text-[11px] ${
                            copyRisk === 'conservative'
                              ? 'border-emerald-400 bg-emerald-500/10 text-emerald-200'
                              : 'border-white/10 text-gray-300'
                          }`}
                        >
                          Conservative
                        </button>
                        <button
                          type="button"
                          onClick={() => setCopyRisk('balanced')}
                          className={`px-3 py-1.5 rounded-full border text-[11px] ${
                            copyRisk === 'balanced'
                              ? 'border-emerald-400 bg-emerald-500/10 text-emerald-200'
                              : 'border-white/10 text-gray-300'
                          }`}
                        >
                          Balanced
                        </button>
                        <button
                          type="button"
                          onClick={() => setCopyRisk('aggressive')}
                          className={`px-3 py-1.5 rounded-full border text-[11px] ${
                            copyRisk === 'aggressive'
                              ? 'border-rose-400 bg-rose-500/10 text-rose-200'
                              : 'border-white/10 text-gray-300'
                          }`}
                        >
                          Aggressive
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 flex items-center justify-between text-[11px] text-gray-400">
                    <span>
                      Copy profile will be stored on backend. Real trades are still executed only when you confirm via Petra Wallet.
                    </span>
                    <button
                      type="button"
                      onClick={createProfile}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Start Copying</span>
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}

        {/* Bottom: Top Traders & Strategies */}
        <section className="grid lg:grid-cols-3 gap-8">
          {/* Top Traders */}
          <div className="lg:col-span-2 rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950 p-6 md:p-7">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-violet-300" />
                <h3 className="text-sm font-semibold text-white">Top Copy Trading Profiles</h3>
              </div>
              <button className="text-xs text-violet-300 hover:text-violet-100 flex items-center gap-1">
                View all
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-3">
              {isLeaderboardLoading && (
                <p className="text-xs text-gray-400">Loading real trader stats...</p>
              )}
              {!isLeaderboardLoading && (!leaderboardData || leaderboardData.length === 0) && (
                <p className="text-xs text-gray-400">
                  No trades yet. Start trading creator tokens to build real copy trading profiles.
                </p>
              )}
              {!isLeaderboardLoading && leaderboardData && leaderboardData.map((trader, idx) => (
                <motion.button
                  key={trader.trader_address}
                  type="button"
                  onClick={() => setSelectedTrader(trader.trader_address)}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.05 }}
                  className={`w-full rounded-2xl px-4 py-3 flex items-center justify-between gap-4 border ${
                    effectiveTrader === trader.trader_address
                      ? 'bg-violet-500/20 border-violet-400/60'
                      : 'bg-white/5 border-white/10 hover:border-violet-400/40'
                  } transition-all`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-xs font-bold text-white shadow-md">
                      {idx + 1}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-white flex items-center gap-1.5">
                        Trader {idx + 1}
                        {idx === 0 && <Star className="w-3 h-3 text-yellow-300" />}
                      </p>
                      <p className="text-[11px] text-gray-400 font-mono truncate max-w-[180px]">
                        {trader.trader_address}
                      </p>
                      <p className="text-[11px] text-violet-300 mt-0.5">
                        {trader.distinct_tokens} tokens · {trader.trade_count} trades
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-right">
                      <p className="text-gray-400 mb-0.5">Net P&amp;L</p>
                      <p className={`${trader.net_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'} font-semibold`}>
                        {formatAlgo(trader.net_pnl)} APTOS
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400 mb-0.5">ROI</p>
                      <p className={`${trader.roi_pct >= 0 ? 'text-emerald-300' : 'text-rose-300'} font-semibold`}>
                        {formatPct(trader.roi_pct)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setViewingTrader(trader)
                        setIsTraderProfileOpen(true)
                      }}
                      className="px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-[11px] text-white font-semibold hover:from-violet-400 hover:to-fuchsia-400 transition-colors"
                    >
                      View
                    </button>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Strategy Summary + Detailed Trades */}
          <div className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-violet-900/30 to-slate-950 p-5">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4 text-violet-300" />
                <h3 className="text-sm font-semibold text-white">Strategy Summary</h3>
              </div>
              <ul className="text-xs text-gray-300 space-y-2">
                <li>• Copy-trade only verified ContentVault tokens.</li>
                <li>• Use proportional allocation based on your portfolio size.</li>
                <li>• Respect Aptos minimum balance requirements for all assets.</li>
                <li>• Trades are simulated in UI; execution must be explicitly confirmed via Petra Wallet.</li>
              </ul>
            </div>

            <div className="rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-slate-900 via-emerald-900/30 to-slate-950 p-5">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="w-4 h-4 text-emerald-300" />
                <h3 className="text-sm font-semibold text-white">Safety &amp; Control</h3>
              </div>
              <ul className="text-xs text-gray-300 space-y-2 mb-4">
                <li>• You can pause or stop copy trading at any time.</li>
                <li>• No private keys ever leave your device – Petra Wallet signs all transactions.</li>
                <li>• Bot and copy-trade strategies are transparent and configurable.</li>
              </ul>
              <button
                type="button"
                onClick={() => navigate('/bot-strategies')}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-white text-xs font-semibold py-2.5 hover:from-cyan-400 hover:to-violet-400 transition-colors"
              >
                <Bot className="w-4 h-4" />
                <span>Manage Bot Strategies</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Real trades table */}
            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-violet-300" />
                <h3 className="text-sm font-semibold text-white">Latest Trades (Selected Trader)</h3>
              </div>
              {!effectiveTrader && (
                <p className="text-xs text-gray-400">
                  Select a trader from the leaderboard to see their real trade history.
                </p>
              )}
              {effectiveTrader && (!traderTrades || traderTrades.length === 0) && (
                <p className="text-xs text-gray-400">
                  No trades found yet for this trader.
                </p>
              )}
              {effectiveTrader && traderTrades && traderTrades.length > 0 && (
                <div className="mt-2 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                  <div className="max-h-64 overflow-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-900">
                    <table className="min-w-full text-[11px]">
                      <thead className="bg-white/5 text-gray-300 sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Time</th>
                          <th className="px-3 py-2 text-left font-medium">Token</th>
                          <th className="px-3 py-2 text-right font-medium">Type</th>
                          <th className="px-3 py-2 text-right font-medium">Amount</th>
                          <th className="px-3 py-2 text-right font-medium">Price (APTOS)</th>
                          <th className="px-3 py-2 text-right font-medium">Total (APTOS)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {traderTrades.map((trade, idx) => (
                          <tr
                            key={`${trade.transaction_id}-${idx}`}
                            className="border-t border-white/5 hover:bg-white/5 transition-colors"
                          >
                            <td className="px-3 py-1.5 text-gray-400">
                              {new Date(trade.created_at).toLocaleString()}
                            </td>
                            <td className="px-3 py-1.5 text-gray-200">
                              {trade.token_symbol || trade.asa_id}
                            </td>
                            <td className="px-3 py-1.5 text-right">
                              <span
                                className={`px-2 py-0.5 rounded-full ${
                                  trade.trade_type === 'buy'
                                    ? 'bg-emerald-500/10 text-emerald-300'
                                    : 'bg-rose-500/10 text-rose-300'
                                }`}
                              >
                                {trade.trade_type.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-3 py-1.5 text-right text-gray-200">
                              {trade.amount.toFixed(2)}
                            </td>
                            <td className="px-3 py-1.5 text-right text-gray-200">
                              {trade.price.toFixed(4)}
                            </td>
                            <td className="px-3 py-1.5 text-right text-gray-200">
                              {trade.total_value.toFixed(4)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Trader Profile Modal - GMGN.AI Style */}
        {isTraderProfileOpen && viewingTrader && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="w-full max-w-7xl max-h-[95vh] overflow-auto rounded-3xl bg-gradient-to-br from-slate-900/95 via-violet-900/20 to-slate-950/95 border border-violet-500/30 shadow-2xl"
            >
              <div className="sticky top-0 z-20 bg-gradient-to-b from-slate-900/95 to-transparent backdrop-blur-sm border-b border-violet-500/20 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                      <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
                        {viewingTrader.trader_address.slice(0, 8)}...{viewingTrader.trader_address.slice(-6)}
                      </span>
                      <span className="px-2 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-semibold">
                        LIVE
                      </span>
                    </h2>
                    <p className="text-xs text-gray-400 font-mono">{viewingTrader.trader_address}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsTraderProfileOpen(false)}
                    className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 border-b border-white/10">
                  {(['overview', 'trades', 'holdings'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`px-4 py-2 text-sm font-semibold transition-colors capitalize ${
                        activeTab === tab
                          ? 'text-violet-300 border-b-2 border-violet-400'
                          : 'text-gray-400 hover:text-gray-300'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <>
                    {/* Key Metrics */}
                    {isAnalyticsLoading ? (
                      <div className="text-center py-8 text-gray-400">Loading analytics...</div>
                    ) : analyticsError ? (
                      <div className="text-center py-8 text-rose-400">
                        Error loading analytics: {analyticsError.message}
                      </div>
                    ) : traderAnalytics && Object.keys(traderAnalytics).length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="rounded-2xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border border-violet-500/30 p-4">
                          <p className="text-xs text-gray-400 mb-1">7D Realized P&L</p>
                          <p className={`text-2xl font-bold ${traderAnalytics.realized_pnl_7d >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {traderAnalytics.realized_pnl_7d >= 0 ? '+' : ''}{formatPct(traderAnalytics.realized_pnl_7d_pct)}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatAlgo(traderAnalytics.realized_pnl_7d)} APTOS
                          </p>
                        </div>
                        <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30 p-4">
                          <p className="text-xs text-gray-400 mb-1">Win Rate</p>
                          <p className="text-2xl font-bold text-emerald-300">
                            {traderAnalytics.win_rate.toFixed(2)}%
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {traderAnalytics.total_tokens_traded} tokens
                          </p>
                        </div>
                        <div className="rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 p-4">
                          <p className="text-xs text-gray-400 mb-1">Total P&L</p>
                          <p className={`text-2xl font-bold ${traderAnalytics.total_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {formatPct(traderAnalytics.total_pnl_pct)}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatAlgo(traderAnalytics.total_pnl)} APTOS
                          </p>
                        </div>
                        <div className="rounded-2xl bg-gradient-to-br from-slate-500/10 to-gray-500/10 border border-slate-500/30 p-4">
                          <p className="text-xs text-gray-400 mb-1">Unrealized Profits</p>
                          <p className={`text-2xl font-bold ${traderAnalytics.unrealized_profits >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                            {traderAnalytics.unrealized_profits >= 0 ? '+' : ''}{formatAlgo(traderAnalytics.unrealized_profits)} APTOS
                          </p>
                          <p className="text-xs text-gray-400 mt-1">Current holdings</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-400">No analytics data available</div>
                    )}

                    {/* P&L Chart */}
                    {viewingTraderPnl && viewingTraderPnl.length > 0 && (
                      <div className="rounded-2xl bg-black/40 border border-white/10 p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">7D Realized P&L</h3>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={viewingTraderPnl.slice(-7)}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                              <XAxis dataKey="day" stroke="#9CA3AF" fontSize={12} />
                              <YAxis stroke="#9CA3AF" fontSize={12} />
                              <Tooltip
                                contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                                labelStyle={{ color: '#E5E7EB' }}
                              />
                              <Line
                                type="monotone"
                                dataKey="pnl"
                                stroke="#8B5CF6"
                                strokeWidth={3}
                                dot={{ fill: '#8B5CF6', r: 4 }}
                                activeDot={{ r: 6 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    {/* Analysis Section */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="rounded-2xl bg-black/40 border border-white/10 p-6">
                        <h3 className="text-sm font-semibold text-white mb-4">Analysis</h3>
                        <div className="space-y-3 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-400">7D TXs:</span>
                            <span className="text-white font-semibold">
                              {traderAnalytics ? `${traderAnalytics.trades_7d} / ${traderAnalytics.tokens_traded_7d}` : '--'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">7D Avg Duration:</span>
                            <span className="text-white font-semibold">
                              {traderAnalytics ? `${Math.round(traderAnalytics.avg_duration_min)}m` : '--'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">7D Cost:</span>
                            <span className="text-white font-semibold">
                              {traderAnalytics ? `${formatAlgo(traderAnalytics.total_cost_7d)} APTOS` : '--'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">7D Avg Cost / Avg Sold:</span>
                            <span className="text-white font-semibold">
                              {traderAnalytics ? `${formatAlgo(traderAnalytics.avg_cost)} / ${formatAlgo(traderAnalytics.avg_sold)}` : '--'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">7D Avg Realized Profits:</span>
                            <span className="text-emerald-300 font-semibold">
                              {traderAnalytics ? `+${formatAlgo(traderAnalytics.avg_realized_profits)} APTOS` : '--'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">7D Fees:</span>
                            <span className="text-white font-semibold">
                              {traderAnalytics ? `${formatAlgo(traderAnalytics.fees_7d)} APTOS` : '--'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">7D Vol:</span>
                            <span className="text-white font-semibold">
                              {traderAnalytics ? `${formatAlgo(traderAnalytics.volume_7d)} APTOS` : '--'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Tracked / Renamed:</span>
                            <span className="text-white font-semibold">
                              {traderAnalytics ? `${traderAnalytics.total_tokens_traded} / 0` : '--'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Distribution */}
                      <div className="rounded-2xl bg-black/40 border border-white/10 p-6">
                        <h3 className="text-sm font-semibold text-white mb-4">Distribution (Token {traderAnalytics?.total_tokens_traded || 0})</h3>
                        {traderAnalytics?.pnl_distribution && (
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-400">&gt;500%:</span>
                              <span className="text-emerald-300 font-semibold">
                                {traderAnalytics.pnl_distribution.gt_500} ({traderAnalytics.total_tokens_traded > 0 ? ((traderAnalytics.pnl_distribution.gt_500 / traderAnalytics.total_tokens_traded) * 100).toFixed(2) : '0.00'}%)
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-400">200% ~ 500%:</span>
                              <span className="text-emerald-200 font-semibold">
                                {traderAnalytics.pnl_distribution['200_500']} ({traderAnalytics.total_tokens_traded > 0 ? ((traderAnalytics.pnl_distribution['200_500'] / traderAnalytics.total_tokens_traded) * 100).toFixed(2) : '0.00'}%)
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-400">0% ~ 200%:</span>
                              <span className="text-gray-300 font-semibold">
                                {traderAnalytics.pnl_distribution['0_200']} ({traderAnalytics.total_tokens_traded > 0 ? ((traderAnalytics.pnl_distribution['0_200'] / traderAnalytics.total_tokens_traded) * 100).toFixed(2) : '0.00'}%)
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-400">-50% ~ 0%:</span>
                              <span className="text-amber-300 font-semibold">
                                {traderAnalytics.pnl_distribution.neg_50_0} ({traderAnalytics.total_tokens_traded > 0 ? ((traderAnalytics.pnl_distribution.neg_50_0 / traderAnalytics.total_tokens_traded) * 100).toFixed(2) : '0.00'}%)
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-400">&lt;-50%:</span>
                              <span className="text-rose-300 font-semibold">
                                {traderAnalytics.pnl_distribution.lt_neg_50} ({traderAnalytics.total_tokens_traded > 0 ? ((traderAnalytics.pnl_distribution.lt_neg_50 / traderAnalytics.total_tokens_traded) * 100).toFixed(2) : '0.00'}%)
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Trades Tab */}
                {activeTab === 'trades' && (
                  <div className="rounded-2xl bg-black/40 border border-white/10 overflow-hidden">
                    <div className="p-4 border-b border-white/10">
                      <h3 className="text-lg font-semibold text-white">Recent PnL</h3>
                    </div>
                    <div className="max-h-96 overflow-auto">
                      <table className="min-w-full text-xs">
                        <thead className="bg-white/5 text-gray-300 sticky top-0 z-10">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium">Time</th>
                            <th className="px-4 py-3 text-left font-medium">Token</th>
                            <th className="px-4 py-3 text-right font-medium">Type</th>
                            <th className="px-4 py-3 text-right font-medium">Amount</th>
                            <th className="px-4 py-3 text-right font-medium">Price (APTOS)</th>
                            <th className="px-4 py-3 text-right font-medium">Total (APTOS)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {viewingTraderTrades && viewingTraderTrades.length > 0 ? (
                            viewingTraderTrades.map((trade, idx) => (
                              <tr key={`${trade.transaction_id}-${idx}`} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                                <td className="px-4 py-3 text-gray-400">
                                  {new Date(trade.created_at).toLocaleString('en-GB', { 
                                    day: '2-digit', 
                                    month: '2-digit', 
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </td>
                                <td className="px-4 py-3 text-gray-200 font-semibold">{trade.token_symbol || trade.asa_id}</td>
                                <td className="px-4 py-3 text-right">
                                  <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${
                                    trade.trade_type === 'buy' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                                  }`}>
                                    {trade.trade_type.toUpperCase()}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right text-gray-200">{trade.amount.toFixed(2)}</td>
                                <td className="px-4 py-3 text-right text-gray-200">{trade.price.toFixed(4)}</td>
                                <td className="px-4 py-3 text-right text-gray-200 font-semibold">{trade.total_value.toFixed(4)}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6} className="px-4 py-8 text-center text-gray-400">No trades found</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Holdings Tab */}
                {activeTab === 'holdings' && (
                  <div className="rounded-2xl bg-black/40 border border-white/10 overflow-hidden">
                    <div className="p-4 border-b border-white/10">
                      <h3 className="text-lg font-semibold text-white">Holdings</h3>
                    </div>
                    <div className="max-h-96 overflow-auto">
                      <table className="min-w-full text-xs">
                        <thead className="bg-white/5 text-gray-300 sticky top-0 z-10">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium">Type</th>
                            <th className="px-4 py-3 text-left font-medium">Token</th>
                            <th className="px-4 py-3 text-right font-medium">MC</th>
                            <th className="px-4 py-3 text-right font-medium">Amount</th>
                            <th className="px-4 py-3 text-right font-medium">Total USD</th>
                            <th className="px-4 py-3 text-right font-medium">Profit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {isAnalyticsLoading ? (
                            <tr>
                              <td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading holdings...</td>
                            </tr>
                          ) : analyticsError ? (
                            <tr>
                              <td colSpan={6} className="px-4 py-8 text-center text-rose-400">
                                Error: {analyticsError.message}
                              </td>
                            </tr>
                          ) : traderAnalytics?.holdings && Array.isArray(traderAnalytics.holdings) && traderAnalytics.holdings.length > 0 ? (
                            traderAnalytics.holdings.map((holding, idx) => (
                              <tr key={holding.asa_id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                                <td className="px-4 py-3">
                                  <span className="px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold">Buy</span>
                                </td>
                                <td className="px-4 py-3 text-gray-200 font-semibold">{holding.token_symbol}</td>
                                <td className="px-4 py-3 text-right text-gray-400">
                                  {holding.market_cap > 1000000 ? `$${(holding.market_cap / 1000000).toFixed(2)}M` : holding.market_cap > 1000 ? `$${(holding.market_cap / 1000).toFixed(2)}K` : holding.market_cap > 0 ? `$${holding.market_cap.toFixed(2)}` : '--'}
                                </td>
                                <td className="px-4 py-3 text-right text-gray-200">{holding.amount.toFixed(4)}</td>
                                <td className="px-4 py-3 text-right text-gray-200">{formatAlgo(holding.total_value)} APTOS</td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <span className={holding.unrealized_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                      {holding.unrealized_pnl >= 0 ? '+' : ''}{formatAlgo(holding.unrealized_pnl)} APTOS
                                    </span>
                                    {viewingTrader?.trader_address === address && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          // Navigate to marketplace to sell
                                          window.location.href = `/marketplace?token=${holding.asa_id}&action=sell`
                                        }}
                                        className="px-2 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[10px] font-semibold hover:bg-rose-500/30 transition-colors"
                                      >
                                        Sell
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6} className="px-4 py-8 text-center text-gray-400">No current holdings</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="sticky bottom-0 bg-gradient-to-t from-slate-900/95 to-transparent backdrop-blur-sm border-t border-violet-500/20 p-6 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTrader(viewingTrader.trader_address)
                    setIsTraderProfileOpen(false)
                  }}
                  className="px-6 py-3 rounded-xl bg-violet-500/20 border border-violet-500/40 text-violet-200 text-sm font-semibold hover:bg-violet-500/30 transition-colors flex items-center gap-2"
                >
                  <Activity className="w-4 h-4" />
                  Track This Trader
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTraderForCopy(viewingTrader.trader_address)
                    setIsTraderProfileOpen(false)
                    setIsCopyModalOpen(true)
                  }}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-semibold hover:from-violet-400 hover:to-fuchsia-400 transition-colors flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Start Copying
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  )
}

export default CopyTradingDashboard


