import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Activity, AlertTriangle, Target, TrendingUp, Heart, Eye, MessageCircle, Plus, Save, X, Play, TrendingDown, DollarSign } from 'lucide-react'
import PremiumBackground from '../components/PremiumBackground'
import { useWallet } from '../contexts/WalletContext'
import { API_BASE_URL } from '../services/config'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface Token {
  asa_id: number
  token_name: string
  token_symbol: string
  current_price: number
  platform: string
  content_url?: string
}

interface BotStrategy {
  id?: number
  owner_address: string
  label: string
  asa_id?: number
  token_symbol?: string
  metric_type: 'likes' | 'views' | 'comments' | 'price_change' | 'pnl'
  condition: string
  action: string
  status: string
  created_at: string
}

const PREBUILT_STRATEGIES: Array<{
  label: string
  metric_type: BotStrategy['metric_type']
  condition: string
  actionTemplate: string
  description: string
}> = [
  {
    label: 'YouTube Viral Likes Accumulator',
    metric_type: 'likes',
    condition: 'likes_1h_change > 20',
    actionTemplate: 'buy {amount} APTOS of {symbol} when likes_1h_change > 20',
    description: 'Accumulate when your YouTube video gets a sudden spike in likes within 1 hour.'
  },
  {
    label: 'Instagram Reel Hype Buyer',
    metric_type: 'views',
    condition: 'views_1h_change > 30',
    actionTemplate: 'buy {amount} APTOS of {symbol} when views_1h_change > 30',
    description: 'Targets reels going viral by monitoring short-term view growth.'
  },
  {
    label: 'Twitter/X Engagement Booster',
    metric_type: 'comments',
    condition: 'comments_1h > 50',
    actionTemplate: 'buy {amount} APTOS of {symbol} when comments_1h > 50',
    description: 'Buys when your tweet gets heavy replies (discussion/hype).'
  },
  {
    label: 'Price Momentum Take-Profit',
    metric_type: 'price_change',
    condition: 'price_24h_change > 25',
    actionTemplate: 'sell 25% of {symbol} when price_24h_change > 25',
    description: 'Locks in profit automatically when the token pumps strongly in 24h.'
  }
]

const BotStrategies: React.FC = () => {
  const { address, isConnected } = useWallet()
  const queryClient = useQueryClient()

  const [form, setForm] = useState({
    label: '',
    token_symbol: '',
    metric_type: 'likes' as BotStrategy['metric_type'],
    condition: 'likes_1h_change > 15',
    action: 'buy 5 APTOS',
  })
  const [isTokenSelectOpen, setIsTokenSelectOpen] = useState(false)
  const [selectedStrategy, setSelectedStrategy] = useState<BotStrategy | null>(null)
  const [selectedToken, setSelectedToken] = useState<Token | null>(null)
  const [allocation, setAllocation] = useState(5)
  const [viewingStrategyId, setViewingStrategyId] = useState<number | null>(null)

  const { data: tokens } = useQuery({
    queryKey: ['marketplace-tokens'],
    queryFn: async (): Promise<Token[]> => {
      const res = await fetch(`${API_BASE_URL}/tokens`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to load tokens')
      return json.tokens || []
    }
  })

  const { data: strategies } = useQuery({
    queryKey: ['bot-strategies', address],
    enabled: isConnected && !!address,
    queryFn: async (): Promise<BotStrategy[]> => {
      const res = await fetch(`${API_BASE_URL}/api/bot-strategies?owner_address=${address}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to load bot strategies')
      return json.strategies || []
    }
  })

  const { data: strategyExecutions } = useQuery({
    queryKey: ['strategy-executions', viewingStrategyId],
    enabled: !!viewingStrategyId,
    queryFn: async () => {
      if (!viewingStrategyId) return null
      const res = await fetch(`${API_BASE_URL}/api/bot-strategies/${viewingStrategyId}/executions`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to load executions')
      return json
    }
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!address) throw new Error('Wallet not connected')
      const body = {
        owner_address: address,
        label: form.label,
        token_symbol: form.token_symbol || undefined,
        metric_type: form.metric_type,
        condition: form.condition,
        action: form.action
      }
      const res = await fetch(`${API_BASE_URL}/api/bot-strategies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to save strategy')
      return json
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bot-strategies', address] })
      setForm({
        label: '',
        token_symbol: '',
        metric_type: 'likes',
        condition: 'likes_1h_change > 15',
        action: 'buy 5 APTOS',
      })
    }
  })

  return (
    <div className="min-h-screen bg-[#05030b] relative">
      <PremiumBackground variant="purple" />

      <main className="relative z-10 max-w-7xl mx-auto px-4 py-10 space-y-10">
        <section className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-cyan-500/30 mb-4">
              <Bot className="w-4 h-4 text-cyan-300" />
              <span className="text-xs font-semibold text-cyan-200 tracking-wide">
                Engagement Bots · Experimental
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-3">
              Automated <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Trading Bots</span>
            </h1>
            <p className="text-gray-400 max-w-2xl text-sm md:text-base">
              Define rules that react to real engagement metrics (likes, views, comments) and price changes.
              All executions still require Petra Wallet confirmation for safety.
            </p>
          </div>
        </section>

        {!isConnected && (
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center">
            <p className="text-gray-300 text-sm">
              Connect your Petra Wallet to create and manage bot strategies.
            </p>
          </section>
        )}

        {isConnected && (
          <>
            {/* Create Strategy */}
            <section className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950 p-6 md:p-7">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-4 h-4 text-violet-300" />
                  <h2 className="text-sm font-semibold text-white">Create Bot Strategy</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-gray-400 mb-1">Strategy Name</label>
                    <input
                      value={form.label}
                      onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                      className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-gray-100 text-xs focus:outline-none focus:border-cyan-400"
                      placeholder="e.g. YouTube Like Spike Buyer"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1">Token Symbol (optional)</label>
                    <input
                      value={form.token_symbol}
                      onChange={(e) => setForm((f) => ({ ...f, token_symbol: e.target.value.toUpperCase() }))}
                      className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-gray-100 text-xs focus:outline-none focus:border-cyan-400"
                      placeholder="e.g. SARU"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1">Metric Type</label>
                    <select
                      value={form.metric_type}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, metric_type: e.target.value as BotStrategy['metric_type'] }))
                      }
                      className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-gray-100 text-xs focus:outline-none focus:border-cyan-400"
                    >
                      <option value="likes">Likes growth</option>
                      <option value="views">Views growth</option>
                      <option value="comments">Comments spike</option>
                      <option value="price_change">Token price change</option>
                      <option value="pnl">Trader P&amp;L</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1">Condition (expression)</label>
                    <input
                      value={form.condition}
                      onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))}
                      className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-gray-100 text-xs focus:outline-none focus:border-cyan-400"
                      placeholder="e.g. likes_1h_change > 15"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-gray-400 mb-1">Action (description)</label>
                    <input
                      value={form.action}
                      onChange={(e) => setForm((f) => ({ ...f, action: e.target.value }))}
                      className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-gray-100 text-xs focus:outline-none focus:border-cyan-400"
                      placeholder="e.g. buy 5 APTOS of token when condition is true"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4 text-[11px] text-gray-400">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    <span>
                      Bots will only propose trades. Final execution must still be confirmed in the UI via Petra Wallet.
                    </span>
                  </div>
                  <button
                    onClick={() => createMutation.mutate()}
                    disabled={createMutation.isPending || !form.label}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-semibold disabled:opacity-50"
                  >
                    {createMutation.isPending ? (
                      <Activity className="w-3 h-3 animate-spin" />
                    ) : (
                      <Save className="w-3 h-3" />
                    )}
                    <span>Save Strategy</span>
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950 p-6 md:p-7 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-violet-300" />
                    <h2 className="text-sm font-semibold text-white">Advanced Prebuilt Strategies</h2>
                  </div>
                  <span className="text-[10px] text-gray-400">Click “Use” to prefill the bot form</span>
                </div>
                <div className="space-y-2 text-xs text-gray-300">
                  {PREBUILT_STRATEGIES.map((tpl) => (
                    <div
                      key={tpl.label}
                      className="rounded-2xl bg-white/5 border border-white/10 px-3 py-2 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <p className="font-semibold text-white">{tpl.label}</p>
                        <p className="text-[11px] text-gray-400">{tpl.description}</p>
                        <p className="text-[11px] text-gray-400">
                          <span className="text-gray-300">If</span>{' '}
                          <code>{tpl.condition}</code>{' '}
                          <span className="text-gray-300">then</span>{' '}
                          <code>{tpl.actionTemplate.replace('{amount}', 'X').replace('{symbol}', 'TOKEN')}</code>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const strategy: BotStrategy = {
                            owner_address: address || '',
                            label: tpl.label,
                            metric_type: tpl.metric_type,
                            condition: tpl.condition,
                            action: tpl.actionTemplate.replace('{amount}', '5').replace('{symbol}', 'TOKEN'),
                            status: 'active'
                          }
                          setSelectedStrategy(strategy)
                          setIsTokenSelectOpen(true)
                        }}
                        className="flex-shrink-0 h-8 px-3 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 text-white text-[11px] font-semibold hover:from-cyan-400 hover:to-violet-400"
                      >
                        Use
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Existing Strategies */}
            <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950 p-6 md:p-7">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-cyan-300" />
                  <h2 className="text-sm font-semibold text-white">Your Bot Strategies</h2>
                </div>
              </div>
              {!strategies || strategies.length === 0 ? (
                <p className="text-xs text-gray-400">
                  No strategies yet. Create your first engagement-based trading bot above.
                </p>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                  <div className="max-h-72 overflow-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-900">
                    <table className="min-w-full text-[11px]">
                      <thead className="bg-white/5 text-gray-300 sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Name</th>
                          <th className="px-3 py-2 text-left font-medium">Token</th>
                          <th className="px-3 py-2 text-left font-medium">Metric</th>
                          <th className="px-3 py-2 text-left font-medium">Condition</th>
                          <th className="px-3 py-2 text-left font-medium">Action</th>
                          <th className="px-3 py-2 text-right font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {strategies.map((s) => (
                          <tr key={s.id} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                            <td className="px-3 py-2 text-gray-200">{s.label}</td>
                            <td className="px-3 py-2 text-gray-200">{s.token_symbol || 'Any'}</td>
                            <td className="px-3 py-2 text-gray-200 capitalize">{s.metric_type}</td>
                            <td className="px-3 py-2 text-gray-300">{s.condition}</td>
                            <td className="px-3 py-2 text-gray-300">{s.action}</td>
                            <td className="px-3 py-2 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded-full ${
                                    s.status === 'active'
                                      ? 'bg-emerald-500/10 text-emerald-300'
                                      : 'bg-slate-500/10 text-slate-300'
                                  }`}
                                >
                                  {s.status}
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setViewingStrategyId(s.id || null)
                                    }}
                                    className="px-2 py-1 rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-300 text-[10px] font-semibold hover:bg-violet-500/30 transition-colors"
                                  >
                                    View Trades
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedStrategy(s)
                                      setIsTokenSelectOpen(true)
                                    }}
                                    className="px-2 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[10px] font-semibold hover:bg-cyan-500/30 transition-colors"
                                  >
                                    Run
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          </>
        )}

        {/* Token Selection Modal */}
        {isTokenSelectOpen && selectedStrategy && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="w-full max-w-3xl max-h-[90vh] overflow-auto rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950 border border-cyan-500/40 p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Run Strategy: {selectedStrategy.label}</h2>
                  <p className="text-xs text-gray-400">
                    Select a token from the marketplace to run this strategy on
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsTokenSelectOpen(false)
                    setSelectedStrategy(null)
                    setSelectedToken(null)
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-white mb-2">Allocation (APTOS)</label>
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={allocation}
                  onChange={(e) => setAllocation(Number(e.target.value))}
                  className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-2 text-gray-100 focus:outline-none focus:border-cyan-400"
                  placeholder="Enter amount in APTOS"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Amount to allocate when the strategy condition is met
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-white mb-3">Select Token</label>
                {!tokens || tokens.length === 0 ? (
                  <p className="text-xs text-gray-400">No tokens available in marketplace</p>
                ) : (
                  <div className="max-h-96 overflow-auto space-y-2">
                    {tokens.map((token) => (
                      <button
                        key={token.asa_id}
                        type="button"
                        onClick={() => setSelectedToken(token)}
                        className={`w-full rounded-xl p-4 border transition-all ${
                          selectedToken?.asa_id === token.asa_id
                            ? 'border-cyan-400 bg-cyan-500/20'
                            : 'border-white/10 bg-white/5 hover:border-cyan-400/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-left">
                            <p className="text-sm font-semibold text-white">{token.token_name}</p>
                            <p className="text-xs text-gray-400 font-mono">{token.token_symbol}</p>
                            <p className="text-xs text-cyan-300 mt-1 capitalize">{token.platform}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-200">{token.current_price.toFixed(4)} APTOS</p>
                            {selectedToken?.asa_id === token.asa_id && (
                              <p className="text-xs text-cyan-300 mt-1">Selected</p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-400">
                  {selectedToken ? (
                    <span>
                      Strategy will run on <span className="text-cyan-300 font-semibold">{selectedToken.token_symbol}</span> with {allocation} APTOS allocation
                    </span>
                  ) : (
                    <span>Please select a token to continue</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (!selectedToken || !address) return
                    
                    // Create/update strategy with selected token
                    const strategyToSave = {
                      ...selectedStrategy,
                      owner_address: address,
                      asa_id: selectedToken.asa_id,
                      token_symbol: selectedToken.token_symbol,
                      action: selectedStrategy.action.replace('{amount}', allocation.toString()).replace('{symbol}', selectedToken.token_symbol)
                    }
                    
                    try {
                      const res = await fetch(`${API_BASE_URL}/api/bot-strategies`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(strategyToSave)
                      })
                      const json = await res.json()
                      if (!json.success) throw new Error(json.error || 'Failed to save strategy')
                      
                      await queryClient.invalidateQueries({ queryKey: ['bot-strategies', address] })
                      alert(`✅ Strategy "${selectedStrategy.label}" is now active for ${selectedToken.token_symbol} with ${allocation} APTOS allocation!`)
                      setIsTokenSelectOpen(false)
                      setSelectedStrategy(null)
                      setSelectedToken(null)
                    } catch (error: any) {
                      alert(`❌ Error: ${error.message}`)
                    }
                  }}
                  disabled={!selectedToken || allocation <= 0}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-semibold hover:from-cyan-400 hover:to-violet-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  <span>Run Strategy</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Strategy Trade History Modal */}
        <AnimatePresence>
          {viewingStrategyId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
              onClick={() => setViewingStrategyId(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950 rounded-3xl border border-white/10 p-6 max-w-4xl w-full max-h-[80vh] overflow-auto"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1">Strategy Trade History</h2>
                    <p className="text-sm text-gray-400">
                      {strategies?.find(s => s.id === viewingStrategyId)?.label}
                    </p>
                  </div>
                  <button
                    onClick={() => setViewingStrategyId(null)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {strategyExecutions ? (
                  <>
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <p className="text-xs text-gray-400 mb-1">Total Executions</p>
                        <p className="text-2xl font-bold text-white">{strategyExecutions.total_executions || 0}</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <p className="text-xs text-gray-400 mb-1">Total P&L</p>
                        <p className={`text-2xl font-bold ${(strategyExecutions.total_pnl || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {(strategyExecutions.total_pnl || 0) >= 0 ? '+' : ''}
                          {(strategyExecutions.total_pnl || 0).toFixed(4)} APTOS
                        </p>
                      </div>
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <p className="text-xs text-gray-400 mb-1">Status</p>
                        <p className="text-2xl font-bold text-cyan-400">Active</p>
                      </div>
                    </div>

                    {strategyExecutions.executions && strategyExecutions.executions.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-xs">
                          <thead className="bg-white/5 text-gray-300">
                            <tr>
                              <th className="px-4 py-3 text-left">Time</th>
                              <th className="px-4 py-3 text-left">Token</th>
                              <th className="px-4 py-3 text-left">Type</th>
                              <th className="px-4 py-3 text-right">Amount</th>
                              <th className="px-4 py-3 text-right">Price</th>
                              <th className="px-4 py-3 text-right">Total Value</th>
                              <th className="px-4 py-3 text-right">P&L</th>
                            </tr>
                          </thead>
                          <tbody>
                            {strategyExecutions.executions.map((exec: any) => (
                              <tr key={exec.id} className="border-t border-white/5 hover:bg-white/5">
                                <td className="px-4 py-3 text-gray-300">
                                  {new Date(exec.executed_at).toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-white font-semibold">{exec.token_symbol}</td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-1 rounded-full ${
                                    exec.trade_type === 'buy' 
                                      ? 'bg-emerald-500/20 text-emerald-300' 
                                      : 'bg-rose-500/20 text-rose-300'
                                  }`}>
                                    {exec.trade_type.toUpperCase()}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right text-gray-200">{exec.amount.toFixed(4)}</td>
                                <td className="px-4 py-3 text-right text-gray-200">{exec.price.toFixed(6)} APTOS</td>
                                <td className="px-4 py-3 text-right text-gray-200">{exec.total_value.toFixed(4)} APTOS</td>
                                <td className={`px-4 py-3 text-right font-semibold ${
                                  exec.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                }`}>
                                  {exec.pnl >= 0 ? '+' : ''}{exec.pnl.toFixed(4)} APTOS
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-400">
                        <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No trades executed yet by this strategy.</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <Activity className="w-8 h-8 mx-auto mb-4 text-gray-400 animate-spin" />
                    <p className="text-gray-400">Loading trade history...</p>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

export default BotStrategies


