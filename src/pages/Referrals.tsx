import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import { Users, Share2, Copy, CheckCircle, TrendingUp, DollarSign, Activity, ExternalLink, Gift, MessageCircle, Send } from 'lucide-react'
import PremiumBackground from '../components/PremiumBackground'
import { useWallet } from '../contexts/WalletContext'

const BACKEND_URL = 'http://localhost:5001'

interface ReferralEarnings {
  referral_code: string | null
  total_earnings: number
  total_trades: number
  total_volume: number
  total_referrals: number
  earnings_history: Array<{
    referred_address: string
    earnings: number
    trade_value: number
    created_at: string
    token_symbol: string
    trade_type: string
  }>
  referrals: Array<{
    referred_address: string
    total_earnings: number
    total_trades: number
    total_volume: number
    joined_at: string
  }>
}

const Referrals: React.FC = () => {
  const { address, isConnected } = useWallet()
  const [searchParams] = useSearchParams()
  const [referralCode, setReferralCode] = useState<string>('')
  const [inputCode, setInputCode] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [earnings, setEarnings] = useState<ReferralEarnings | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)

  useEffect(() => {
    if (address && isConnected) {
      fetchEarnings()
      fetchReferralCode()
      
      // Check for pending referral code from URL
      const pendingCode = localStorage.getItem('pending_referral_code')
      if (pendingCode && searchParams.get('register') === 'true') {
        setInputCode(pendingCode)
        localStorage.removeItem('pending_referral_code')
        // Auto-register after a short delay
        setTimeout(() => {
          handleRegisterCode()
        }, 500)
      }
    }
  }, [address, isConnected, searchParams])

  const fetchReferralCode = async () => {
    if (!address) return
    
    try {
      const response = await fetch(`${BACKEND_URL}/api/referrals/earnings/${address}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.referral_code) {
          setReferralCode(data.referral_code)
        }
      }
    } catch (error) {
      console.error('Error fetching referral code:', error)
    }
  }

  const generateReferralCode = async () => {
    if (!address) return
    
    setIsGenerating(true)
    try {
      const response = await fetch(`${BACKEND_URL}/api/referrals/generate-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referrer_address: address })
      })
      
      const data = await response.json()
      if (data.success) {
        setReferralCode(data.referral_code)
        // Register self with this code
        await registerReferral(data.referral_code, address)
      }
    } catch (error) {
      console.error('Error generating referral code:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const registerReferral = async (code: string, referredAddr: string) => {
    setIsRegistering(true)
    try {
      const response = await fetch(`${BACKEND_URL}/api/referrals/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referral_code: code,
          referred_address: referredAddr
        })
      })
      
      const data = await response.json()
      if (data.success) {
        fetchEarnings()
      }
    } catch (error) {
      console.error('Error registering referral:', error)
    } finally {
      setIsRegistering(false)
    }
  }

  const handleRegisterCode = async () => {
    const codeToRegister = inputCode || localStorage.getItem('pending_referral_code')
    if (!codeToRegister || !address) return
    await registerReferral(codeToRegister, address)
    setInputCode('')
    localStorage.removeItem('pending_referral_code')
  }

  const fetchEarnings = async () => {
    if (!address) return
    
    setIsLoading(true)
    try {
      const response = await fetch(`${BACKEND_URL}/api/referrals/earnings/${address}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setEarnings({
            referral_code: data.referral_code || null,
            total_earnings: data.total_earnings || 0,
            total_trades: data.total_trades || 0,
            total_volume: data.total_volume || 0,
            total_referrals: data.total_referrals || 0,
            earnings_history: data.earnings_history || [],
            referrals: data.referrals || []
          })
          if (data.referral_code) {
            setReferralCode(data.referral_code)
          }
        } else {
          // Set empty earnings if no data
          setEarnings({
            referral_code: null,
            total_earnings: 0,
            total_trades: 0,
            total_volume: 0,
            total_referrals: 0,
            earnings_history: [],
            referrals: []
          })
        }
      } else {
        // Handle error response
        const errorData = await response.json().catch(() => ({}))
        console.error('Error fetching earnings:', errorData)
        setEarnings({
          referral_code: null,
          total_earnings: 0,
          total_trades: 0,
          total_volume: 0,
          total_referrals: 0,
          earnings_history: [],
          referrals: []
        })
      }
    } catch (error) {
      console.error('Error fetching earnings:', error)
      // Set empty earnings on error
      setEarnings({
        referral_code: null,
        total_earnings: 0,
        total_trades: 0,
        total_volume: 0,
        total_referrals: 0,
        earnings_history: [],
        referrals: []
      })
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getReferralLink = () => {
    if (!referralCode) return ''
    return `${window.location.origin}?ref=${referralCode}`
  }

  const shareToWhatsApp = () => {
    const message = encodeURIComponent(
      `🚀 Join CreatorVault and start trading creator tokens!\n\n` +
      `Use my referral code: ${referralCode}\n` +
      `Get started: ${getReferralLink()}\n\n` +
      `I'll earn 0.01% from all your trades forever! 💰`
    )
    window.open(`https://wa.me/?text=${message}`, '_blank')
  }

  const shareToTelegram = () => {
    const message = encodeURIComponent(
      `🚀 Join CreatorVault and start trading creator tokens!\n\n` +
      `Use my referral code: ${referralCode}\n` +
      `Get started: ${getReferralLink()}\n\n` +
      `I'll earn 0.01% from all your trades forever! 💰`
    )
    window.open(`https://t.me/share/url?url=${encodeURIComponent(getReferralLink())}&text=${message}`, '_blank')
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const formatAlgo = (amount: number) => {
    if (amount < 0.0001) return amount.toFixed(6)
    if (amount < 1) return amount.toFixed(4)
    return amount.toFixed(2)
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[#05030b] relative">
        <PremiumBackground variant="purple" />
        <main className="relative z-10 max-w-7xl mx-auto px-4 py-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-white text-xl"
          >
            Please connect your wallet to access referrals
          </motion.div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#05030b] relative">
      <PremiumBackground variant="purple" />
      
      <main className="relative z-10 max-w-7xl mx-auto px-4 py-10 space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/30 mb-4">
            <Gift className="w-5 h-5 text-violet-400" />
            <span className="text-sm font-semibold text-violet-300">Referral Program</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
            Earn 0.01% of All Referral Trades
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Refer friends and earn lifetime rewards from every trade they make on CreatorVault
          </p>
        </motion.div>

        {/* Stats Overview - Prominent Display */}
        {earnings && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          >
            <motion.div 
              className="rounded-2xl bg-gradient-to-br from-violet-500/20 via-violet-500/10 to-transparent border border-violet-500/30 p-6 relative overflow-hidden"
              whileHover={{ scale: 1.02, y: -2 }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-violet-500/20">
                    <DollarSign className="w-6 h-6 text-violet-400" />
                  </div>
                  <span className="text-sm text-gray-400 font-medium">Total Earned</span>
                </div>
                <p className="text-4xl font-bold text-white mb-1">{formatAlgo(earnings.total_earnings)}</p>
                <p className="text-xs text-violet-300 font-medium">APTOS</p>
              </div>
            </motion.div>
            
            <motion.div 
              className="rounded-2xl bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-transparent border border-emerald-500/30 p-6 relative overflow-hidden"
              whileHover={{ scale: 1.02, y: -2 }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-emerald-500/20">
                    <Users className="w-6 h-6 text-emerald-400" />
                  </div>
                  <span className="text-sm text-gray-400 font-medium">Referrals</span>
                </div>
                <p className="text-4xl font-bold text-white mb-1">{earnings.total_referrals}</p>
                <p className="text-xs text-emerald-300 font-medium">Active Users</p>
              </div>
            </motion.div>
            
            <motion.div 
              className="rounded-2xl bg-gradient-to-br from-cyan-500/20 via-cyan-500/10 to-transparent border border-cyan-500/30 p-6 relative overflow-hidden"
              whileHover={{ scale: 1.02, y: -2 }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-cyan-500/20">
                    <Activity className="w-6 h-6 text-cyan-400" />
                  </div>
                  <span className="text-sm text-gray-400 font-medium">Total Trades</span>
                </div>
                <p className="text-4xl font-bold text-white mb-1">{earnings.total_trades}</p>
                <p className="text-xs text-cyan-300 font-medium">By Referrals</p>
              </div>
            </motion.div>
            
            <motion.div 
              className="rounded-2xl bg-gradient-to-br from-fuchsia-500/20 via-fuchsia-500/10 to-transparent border border-fuchsia-500/30 p-6 relative overflow-hidden"
              whileHover={{ scale: 1.02, y: -2 }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/10 rounded-full blur-3xl"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-fuchsia-500/20">
                    <TrendingUp className="w-6 h-6 text-fuchsia-400" />
                  </div>
                  <span className="text-sm text-gray-400 font-medium">Total Volume</span>
                </div>
                <p className="text-4xl font-bold text-white mb-1">{formatAlgo(earnings.total_volume)}</p>
                <p className="text-xs text-fuchsia-300 font-medium">APTOS Traded</p>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Referral Code Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/50 via-slate-950/50 to-slate-900/50 backdrop-blur-xl p-8 shadow-2xl"
        >
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                <Gift className="w-6 h-6 text-violet-400" />
                Your Referral Code
              </h2>
              <p className="text-gray-400 text-sm mb-6">
                Share this code with friends. You'll earn 0.01% of all their trades forever!
              </p>
              {referralCode ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 px-6 py-4 rounded-xl bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/30 font-mono text-2xl font-bold text-white text-center">
                      {referralCode}
                    </div>
                    <motion.button
                      onClick={() => copyToClipboard(referralCode)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-6 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold hover:shadow-lg hover:shadow-violet-500/50 transition-all flex items-center gap-2"
                    >
                      {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                      <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                    </motion.button>
                  </div>
                </div>
              ) : (
                <motion.button
                  onClick={generateReferralCode}
                  disabled={isGenerating}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold disabled:opacity-50 hover:shadow-lg hover:shadow-violet-500/50 transition-all"
                >
                  {isGenerating ? 'Generating...' : 'Generate Referral Code'}
                </motion.button>
              )}
            </div>
            
            {referralCode && (
              <div className="pt-6 border-t border-white/10">
                <h3 className="text-lg font-bold text-white mb-4">Share Referral Link</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300 font-mono break-all">
                      {getReferralLink()}
                    </div>
                    <motion.button
                      onClick={() => copyToClipboard(getReferralLink())}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-3 rounded-xl bg-violet-500/20 border border-violet-500/40 text-violet-300 hover:bg-violet-500/30 transition-colors"
                      title="Copy Link"
                    >
                      {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    </motion.button>
                  </div>
                  
                  {/* Social Share Buttons */}
                  <div className="flex items-center gap-3">
                    <motion.button
                      onClick={shareToWhatsApp}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30 transition-all flex items-center justify-center gap-2 font-semibold"
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span>Share on WhatsApp</span>
                    </motion.button>
                    <motion.button
                      onClick={shareToTelegram}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-500/20 to-cyan-600/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 transition-all flex items-center justify-center gap-2 font-semibold"
                    >
                      <Send className="w-5 h-5" />
                      <span>Share on Telegram</span>
                    </motion.button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Register Referral Code */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/50 via-slate-950/50 to-slate-900/50 backdrop-blur-xl p-8 shadow-2xl"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-cyan-500/20">
              <Gift className="w-5 h-5 text-cyan-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Have a Referral Code?</h2>
          </div>
          <p className="text-gray-400 text-sm mb-6">
            Enter a referral code to support another creator and help them earn rewards
          </p>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="Enter 8-character referral code"
              className="flex-1 px-6 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 font-mono text-lg text-center"
              maxLength={8}
            />
            <motion.button
              onClick={handleRegisterCode}
              disabled={!inputCode || isRegistering}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold disabled:opacity-50 hover:shadow-lg hover:shadow-violet-500/50 transition-all"
            >
              {isRegistering ? 'Registering...' : 'Register Code'}
            </motion.button>
          </div>
        </motion.div>


        {/* Referrals List */}
        {earnings && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/50 via-slate-950/50 to-slate-900/50 backdrop-blur-xl p-8 shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <Users className="w-6 h-6 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Your Referrals</h2>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-sm font-semibold">
                {earnings.referrals?.length || 0}
              </span>
            </div>
            {earnings.referrals && earnings.referrals.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-white/5 text-gray-300">
                    <tr>
                      <th className="px-4 py-3 text-left">Address</th>
                      <th className="px-4 py-3 text-right">Total Trades</th>
                      <th className="px-4 py-3 text-right">Volume</th>
                      <th className="px-4 py-3 text-right">Your Earnings</th>
                      <th className="px-4 py-3 text-left">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {earnings.referrals.map((ref, idx) => (
                      <tr key={idx} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 text-white font-mono text-xs">{formatAddress(ref.referred_address)}</td>
                        <td className="px-4 py-3 text-right text-gray-300 font-semibold">{ref.total_trades || 0}</td>
                        <td className="px-4 py-3 text-right text-gray-300">{formatAlgo(ref.total_volume || 0)} APTOS</td>
                        <td className="px-4 py-3 text-right text-emerald-400 font-semibold">{formatAlgo(ref.total_earnings || 0)} APTOS</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{ref.joined_at ? new Date(ref.joined_at).toLocaleDateString() : 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg mb-2">No Referrals Yet</p>
                <p className="text-gray-500 text-sm">Share your referral code to start earning!</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Earnings History */}
        {earnings && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/50 via-slate-950/50 to-slate-900/50 backdrop-blur-xl p-8 shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-violet-500/20">
                <DollarSign className="w-6 h-6 text-violet-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Recent Earnings</h2>
              <span className="px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 text-sm font-semibold">
                {earnings.earnings_history?.length || 0}
              </span>
            </div>
            {earnings.earnings_history && earnings.earnings_history.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-white/5 text-gray-300">
                    <tr>
                      <th className="px-4 py-3 text-left">From</th>
                      <th className="px-4 py-3 text-left">Token</th>
                      <th className="px-4 py-3 text-left">Type</th>
                      <th className="px-4 py-3 text-right">Trade Value</th>
                      <th className="px-4 py-3 text-right">Your Earnings</th>
                      <th className="px-4 py-3 text-left">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {earnings.earnings_history.map((earning, idx) => (
                      <tr key={idx} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 text-white font-mono text-xs">{formatAddress(earning.referred_address)}</td>
                        <td className="px-4 py-3 text-gray-300 font-semibold">{earning.token_symbol || 'N/A'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            earning.trade_type === 'buy' 
                              ? 'bg-emerald-500/20 text-emerald-300' 
                              : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {earning.trade_type?.toUpperCase() || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-300">{formatAlgo(earning.trade_value || 0)} APTOS</td>
                        <td className="px-4 py-3 text-right text-emerald-400 font-semibold">{formatAlgo(earning.earnings || 0)} APTOS</td>
                        <td className="px-4 py-3 text-gray-400 text-xs">{earning.created_at ? new Date(earning.created_at).toLocaleString() : 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <DollarSign className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg mb-2">No Earnings Yet</p>
                <p className="text-gray-500 text-sm">Earnings will appear here when your referrals make trades</p>
              </div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  )
}

export default Referrals

