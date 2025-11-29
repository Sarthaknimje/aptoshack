import React, { useEffect, useRef } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { motion, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion'
import { 
  Rocket, 
  DollarSign, 
  Users, 
  TrendingUp, 
  Shield, 
  ArrowRight,
  CheckCircle,
  BarChart3,
  Sparkles,
  Wallet,
  Coins,
  ChevronDown,
  Target,
  Award,
  TrendingDown,
  Lock,
  type LucideIcon
} from 'lucide-react'
import { YouTubeIcon, InstagramIcon, TwitterIcon, LinkedInIcon, TokenIcon } from '../assets/icons'
import PremiumBackground from '../components/PremiumBackground'

const Home: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { scrollYProgress } = useScroll()
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '50%'])
  const opacity = useTransform(scrollYProgress, [0, 0.3], [1, 0])
  
  const cardRef = useRef<HTMLDivElement>(null)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [7.5, -7.5]))
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-7.5, 7.5]))
  
  // Handle referral code from URL
  useEffect(() => {
    const refCode = searchParams.get('ref')
    if (refCode) {
      // Store referral code in localStorage
      localStorage.setItem('pending_referral_code', refCode)
      // Redirect to referrals page to register
      navigate('/referrals?register=true')
    }
  }, [searchParams, navigate])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2
        mouseX.set((e.clientX - centerX) / rect.width)
        mouseY.set((e.clientY - centerY) / rect.height)
      }
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [mouseX, mouseY])

  const features = [
    {
      icon: Rocket,
      title: 'Content Tokenization',
      description: 'Transform your YouTube videos, Instagram reels, Twitter tweets, and LinkedIn posts into tradeable digital assets on Aptos blockchain.',
      color: 'from-purple-500 to-amber-500',
      glow: 'shadow-purple-500/30',
      gradient: 'from-purple-600/20 to-amber-600/20'
    },
    {
      icon: DollarSign,
      title: 'Creator Earnings',
      description: 'Earn 5% from every trade. Watch your revenue grow as your content gains traction. No platform commissions, you keep 95% of value.',
      color: 'from-blue-500 to-cyan-500',
      glow: 'shadow-blue-500/30',
      gradient: 'from-emerald-600/20 to-teal-600/20'
    },
    {
      icon: Target,
      title: 'Prediction Markets',
      description: 'Create prediction markets on your content performance. Bet on views, likes, comments. Win 2x-3x returns with automatic payouts.',
      color: 'from-purple-500 to-amber-500',
      glow: 'shadow-purple-500/30',
      gradient: 'from-purple-600/20 to-amber-600/20'
    },
    {
      icon: BarChart3,
      title: 'Bonding Curves',
      description: 'Automatic liquidity pools with pump.fun style pricing. Real-time price discovery based on supply and demand dynamics.',
      color: 'from-teal-500 to-purple-500',
      glow: 'shadow-teal-500/30',
      gradient: 'from-teal-600/20 to-purple-600/20'
    },
    {
      icon: Shield,
      title: 'Verified Ownership',
      description: 'Only content owners can tokenize their work. Secure OAuth authentication ensures your content stays yours.',
      color: 'from-violet-500 to-amber-500',
      glow: 'shadow-violet-500/30',
      gradient: 'from-violet-600/20 to-amber-600/20'
    },
    {
      icon: Users,
      title: 'Community Building',
      description: 'Token holders get exclusive premium content, early access, and special perks. Build a loyal community of investors.',
      color: 'from-pink-500 to-rose-500',
      glow: 'shadow-pink-500/30',
      gradient: 'from-pink-600/20 to-rose-600/20'
    }
  ]

  const steps = [
    {
      number: '01',
      title: 'Connect Your Platform',
      description: 'Connect your YouTube, Instagram, Twitter, or LinkedIn account. Verify ownership through secure OAuth authentication.',
      icon: Shield,
      color: 'from-cyan-400 via-sky-400 to-blue-500',
      platforms: ['YouTube', 'Instagram', 'Twitter', 'LinkedIn'],
      platformIcons: [YouTubeIcon, InstagramIcon, TwitterIcon, LinkedInIcon]
    },
    {
      number: '02',
      title: 'Tokenize Your Content',
      description: 'Turn your videos and posts into tradeable tokens. Set supply, launch on Aptos blockchain with bonding curve pricing.',
      icon: Coins,
      color: 'from-blue-400 via-cyan-400 to-teal-500',
      platforms: [],
      platformIcons: []
    },
    {
      number: '03',
      title: 'Earn & Grow',
      description: 'Earn 5% from every trade. Create prediction markets. Watch your creator economy grow with real value and engagement.',
      icon: TrendingUp,
      color: 'from-blue-400 via-cyan-400 to-teal-500',
      platforms: [],
      platformIcons: []
    }
  ]


  const platforms = [
    { icon: YouTubeIcon, name: 'YouTube', status: 'Live', color: 'text-red-500', bg: 'bg-red-500/10' },
    { icon: InstagramIcon, name: 'Instagram', status: 'Live', color: 'text-pink-500', bg: 'bg-pink-500/10' },
    { icon: TwitterIcon, name: 'Twitter/X', status: 'Live', color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { icon: LinkedInIcon, name: 'LinkedIn', status: 'Live', color: 'text-blue-600', bg: 'bg-blue-600/10' }
  ]

  const benefits = [
    {
      title: 'For Creators',
      items: [
        'Earn 5% from every trade',
        'Token value grows with engagement',
        'Create prediction markets',
        'No platform commissions',
        'Direct monetization',
        'Own your audience'
      ],
      color: 'from-blue-500 to-cyan-500'
    },
    {
      title: 'For Followers',
      items: [
        'Invest in favorite creators',
        'Early access to content',
        'Premium perks & rewards',
        'Trade tokens for profit',
        'Bet on predictions (2x-3x)',
        'Exclusive community access'
      ],
      color: 'from-cyan-500 to-blue-500'
    }
  ]

  return (
    <div className="min-h-screen bg-[#0a0a0f] overflow-hidden relative">
      <PremiumBackground variant="purple" />
      
      {/* 3D Floating Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Large 3D Orbs */}
          <motion.div 
          className="absolute top-20 left-10 w-96 h-96 rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)',
          }}
            animate={{ 
            x: [0, 100, 0],
            y: [0, 50, 0],
              scale: [1, 1.2, 1],
              rotate: [0, 180, 360]
            }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
          className="absolute bottom-20 right-10 w-96 h-96 rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(245, 158, 11, 0.3) 0%, transparent 70%)',
          }}
            animate={{ 
            x: [0, -100, 0],
            y: [0, -50, 0],
              scale: [1.2, 1, 1.2],
              rotate: [360, 180, 0]
            }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 py-20 z-10">
        <motion.div style={{ y, opacity }} className="absolute inset-0 pointer-events-none">
          {/* Additional gradient orbs */}
          <motion.div 
            className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-gradient-to-r from-purple-600/20 to-amber-600/10 rounded-full blur-[100px]"
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 180, 360]
            }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          />
          <motion.div 
            className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-gradient-to-r from-cyan-600/20 to-blue-600/10 rounded-full blur-[100px]"
            animate={{ 
              scale: [1.2, 1, 1.2],
              rotate: [360, 180, 0]
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          />
        </motion.div>

        <div className="relative max-w-7xl mx-auto text-center z-10">
          {/* ContentVault Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotate: -180 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, type: "spring" }}
            className="mb-8 flex justify-center"
          >
            <div className="relative">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-purple-600 via-violet-600 to-amber-500 flex items-center justify-center shadow-2xl shadow-purple-500/50">
                <span className="text-2xl md:text-3xl font-bold text-white">CC</span>
              </div>
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-purple-400 via-amber-400 to-teal-400 rounded-full blur-xl opacity-50"
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.7, 0.5] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
            </div>
          </motion.div>

          {/* Badge */}
            <motion.div
            initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-8"
          >
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-gray-300">Powered by Aptos Blockchain</span>
            <span className="px-2 py-0.5 text-xs font-bold bg-gradient-to-r from-purple-500 to-amber-500 text-white rounded-full animate-pulse">LIVE</span>
          </motion.div>

          {/* Main Headline with 3D Effect */}
              <motion.h1 
            className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            style={{
              textShadow: '0 0 40px rgba(139, 92, 246, 0.5), 0 0 80px rgba(217, 70, 239, 0.3)'
            }}
          >
            <span className="text-white">Own Your</span>
            <br />
                <motion.span 
              className="bg-gradient-to-r from-purple-400 via-amber-400 to-teal-400 bg-clip-text text-transparent inline-block"
            animate={{ 
                backgroundPosition: ['0%', '100%', '0%'],
              }}
              transition={{ duration: 5, repeat: Infinity }}
              style={{
                backgroundSize: '200% auto'
              }}
                >
                  Content Empire
                </motion.span>
              </motion.h1>
              
          {/* Subheadline */}
              <motion.p 
            className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-12 leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            Transform your content into tradeable tokens on Aptos blockchain.
            <br />
            <span className="text-white font-medium">Tokenize YouTube, Instagram, Twitter, LinkedIn.</span>
            <br />
            <span className="text-cyan-400">Earn 5% on every trade. Create prediction markets. Build your creator economy.</span>
              </motion.p>

          {/* Hero Illustration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="flex justify-center mb-16"
          >
            <div className="w-full max-w-2xl h-64 md:h-80 relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="grid grid-cols-2 gap-8 w-full max-w-md">
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="flex justify-center"
                  >
                    <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-purple-600 via-violet-600 to-amber-500 flex flex-col items-center justify-center shadow-2xl shadow-purple-500/50">
                      <BarChart3 className="w-8 h-8 text-white mb-1" />
                      <span className="text-xs text-white/80">Creator Tokens</span>
                    </div>
                  </motion.div>
                  <motion.div
                    animate={{ y: [0, 10, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                    className="flex justify-center"
                  >
                    <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-teal-500 via-cyan-500 to-purple-500 flex flex-col items-center justify-center shadow-2xl shadow-teal-500/50">
                      <TrendingUp className="w-8 h-8 text-white mb-1" />
                      <span className="text-xs text-white/80">Prediction Markets</span>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* CTA Buttons */}
            <motion.div
            initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
          >
            <Link to="/tokenize">
              <motion.button
                className="group relative px-8 py-4 bg-gradient-to-r from-purple-600 via-violet-600 to-amber-500 rounded-2xl text-white font-bold text-lg overflow-hidden shadow-2xl shadow-purple-500/50"
                whileHover={{ scale: 1.05, boxShadow: '0 20px 60px rgba(168, 85, 247, 0.6)' }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Rocket className="w-5 h-5" />
                  Start Tokenizing
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-fuchsia-600 to-violet-600"
                  initial={{ x: '100%' }}
                  whileHover={{ x: 0 }}
                  transition={{ duration: 0.3 }}
                />
              </motion.button>
            </Link>
            
            <Link to="/marketplace">
              <motion.button
                className="px-8 py-4 border-2 border-white/20 rounded-2xl text-white font-bold text-lg hover:bg-white/5 transition-colors flex items-center gap-2 backdrop-blur-sm"
                whileHover={{ scale: 1.05, borderColor: 'rgba(255,255,255,0.4)' }}
                whileTap={{ scale: 0.95 }}
              >
                <BarChart3 className="w-5 h-5" />
                Explore Marketplace
              </motion.button>
                </Link>

            <Link to="/predictions">
              <motion.button
                className="px-8 py-4 border-2 border-cyan-500/30 rounded-2xl text-cyan-400 font-bold text-lg hover:bg-cyan-500/10 transition-colors flex items-center gap-2 backdrop-blur-sm"
                whileHover={{ scale: 1.05, borderColor: 'rgba(6, 182, 212, 0.6)' }}
                whileTap={{ scale: 0.95 }}
              >
                <Target className="w-5 h-5" />
                Prediction Markets
              </motion.button>
                </Link>
            </motion.div>

          {/* Platform Icons - 3D Cards */}
            <motion.div
            initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex justify-center items-center gap-6 mb-16 flex-wrap"
          >
            {platforms.map((platform, index) => (
            <motion.div
                key={platform.name}
                className="group relative"
                initial={{ opacity: 0, scale: 0.8, rotateY: -90 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                transition={{ delay: 1 + index * 0.1, type: "spring", stiffness: 200 }}
                whileHover={{ y: -10, z: 50 }}
                style={{ perspective: 1000 }}
              >
                <motion.div
                  className={`p-4 rounded-2xl ${platform.bg} border border-white/10 group-hover:border-white/30 transition-all backdrop-blur-sm`}
                  whileHover={{ rotateY: 5, rotateX: 5 }}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <platform.icon className={`w-10 h-10 ${platform.color}`} />
                </motion.div>
                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                  <span className="text-xs text-gray-500">{platform.name}</span>
                  <div className="flex items-center gap-1 justify-center mt-1">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                    <span className="text-xs text-cyan-400">{platform.status}</span>
                  </div>
              </div>
              </motion.div>
            ))}
            </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
            className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex flex-col items-center gap-2 text-gray-500 cursor-pointer"
            >
              <span className="text-sm">Scroll to explore</span>
              <ChevronDown className="w-5 h-5" />
            </motion.div>
            </motion.div>
        </div>
      </section>

      {/* Problem/Solution Section */}
      <section className="relative py-32 px-4 z-10">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <div className="flex justify-center mb-6">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-br from-purple-600 via-violet-600 to-amber-500 flex items-center justify-center shadow-2xl shadow-purple-500/50">
                <Users className="w-10 h-10 text-white" />
              </div>
            </div>
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
              The Creator Economy is <span className="text-red-500">Broken</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Platforms profit billions while creators struggle. We're fixing that with blockchain technology.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Problems */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30">
                  <TrendingDown className="w-6 h-6 text-red-500" />
              </div>
                <h3 className="text-2xl font-bold text-red-400">The Problems</h3>
                  </div>

              {[
                { title: 'Platforms Take 30-50%', desc: 'YouTube takes 45% commission. LinkedIn pays $0. Creators get pennies.', icon: DollarSign },
                { title: 'Fans Can\'t Invest', desc: 'Supporters get nothing in return. Just likes and comments, no real value.', icon: Users },
                { title: 'No True Ownership', desc: 'Platform algorithms control your audience and income. You\'re just a user.', icon: Lock },
                { title: 'Meme Coins Dominate', desc: 'Random tokens with no value. Speculation without real backing or utility.', icon: Coins }
              ].map((problem, i) => {
                const Icon = problem.icon as LucideIcon
                return (
              <motion.div 
                    key={i}
                    className="group p-6 rounded-2xl bg-red-500/5 border border-red-500/20 hover:border-red-500/40 transition-all relative overflow-hidden"
                    whileHover={{ x: 10, scale: 1.02 }}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-start gap-4 relative z-10">
                      <Icon className="w-6 h-6 text-red-400 mt-1 flex-shrink-0" />
                  <div>
                        <h4 className="text-lg font-semibold text-white mb-2">{problem.title}</h4>
                        <p className="text-gray-400">{problem.desc}</p>
                  </div>
                </div>
              </motion.div>
                )
              })}
            </motion.div>

            {/* Solutions */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 rounded-xl bg-violet-500/20 border border-violet-500/30">
                  <CheckCircle className="w-6 h-6 text-violet-500" />
              </div>
                <h3 className="text-2xl font-bold text-cyan-400">Our Solution</h3>
                  </div>

              {[
                { title: 'Earn 5% on Every Trade', desc: 'Your fans buy & sell your tokens. You earn from every transaction. Keep 95% of value.', icon: DollarSign },
                { title: 'Fans Become Investors', desc: 'Token holders unlock premium content. Real value for real support. Early access perks.', icon: Users },
                { title: 'Verified Ownership', desc: 'Only YOU can tokenize YOUR content. OAuth authentication ensures security.', icon: Shield },
                { title: 'Content-Backed Tokens', desc: 'Real engagement metrics drive value. Not speculation. Your content = real asset.', icon: Award }
              ].map((solution, i) => {
                const Icon = solution.icon as LucideIcon
                return (
              <motion.div 
                    key={i}
                    className="group p-6 rounded-2xl bg-violet-500/5 border border-violet-500/20 hover:border-violet-500/40 transition-all relative overflow-hidden"
                    whileHover={{ x: 10, scale: 1.02 }}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-start gap-4 relative z-10">
                      <Icon className="w-6 h-6 text-cyan-400 mt-1 flex-shrink-0" />
                  <div>
                        <h4 className="text-lg font-semibold text-white mb-2">{solution.title}</h4>
                        <p className="text-gray-400">{solution.desc}</p>
                  </div>
                </div>
              </motion.div>
                )
              })}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Grid - 3D Cards */}
      <section className="relative py-32 px-4 z-10">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <div className="flex justify-center mb-6">
              <div className="w-48 h-32 md:w-64 md:h-40 rounded-3xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 flex items-center justify-center shadow-2xl">
                <BarChart3 className="w-10 h-10 text-white" />
              </div>
            </div>
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Built for <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">Creators</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Everything you need to launch your creator economy on Aptos blockchain.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30, rotateX: -15 }}
                  whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, type: "spring", stiffness: 100 }}
                  className={`group relative p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-white/30 transition-all duration-500 hover:shadow-2xl ${feature.glow} overflow-hidden`}
                  whileHover={{ 
                    y: -15, 
                    z: 50,
                    rotateY: 5,
                    rotateX: 5
                  }}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {/* 3D Background Effect */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  
                  <motion.div 
                    className={`relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-6 shadow-lg`}
                    whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Icon className="w-8 h-8 text-white" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-white mb-3 relative z-10 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-violet-400 group-hover:to-cyan-400 group-hover:bg-clip-text transition-all">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400 leading-relaxed relative z-10">
                    {feature.description}
                  </p>
                  
                  {/* Shine effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
                    style={{ transform: 'skewX(-20deg)' }}
                  />
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* How It Works - 3D Steps */}
      <section className="relative py-32 px-4 bg-gradient-to-b from-transparent via-violet-950/20 to-transparent z-10 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
              How It <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">Works</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Launch your creator economy in three simple steps. Built on Aptos for speed and low fees.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8 relative">
            {/* Connection arrows - positioned correctly */}
            <div className="hidden md:block absolute top-[140px] left-[calc(16.666%+80px)] right-[calc(16.666%+80px)] h-0.5 bg-gradient-to-r from-cyan-500 via-violet-500 to-teal-500 opacity-40 rounded-full z-0" />
            {[0, 1].map((i) => (
              <motion.div
                key={i}
                className="hidden md:block absolute top-[135px]"
                style={{ left: `calc(${33.333 * (i + 1)}% - 12px)` }}
                animate={{ 
                  x: [0, 8, 0],
                  opacity: [0.6, 1, 0.6]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  delay: i * 1,
                  ease: "easeInOut"
                }}
              >
                <ArrowRight className="w-6 h-6 text-violet-400" />
              </motion.div>
            ))}
            
            {steps.map((step, index) => {
              const Icon = step.icon
              const gradientClass = step.color
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ delay: index * 0.15, type: "spring", stiffness: 120 }}
                  className="relative z-10"
                >
                  <motion.div 
                    className="h-full p-6 md:p-8 rounded-3xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 hover:border-white/30 transition-all text-center group relative overflow-hidden backdrop-blur-sm"
                  whileHover={{ 
                      y: -8,
                    scale: 1.02,
                      borderColor: 'rgba(139, 92, 246, 0.4)'
                  }}
                >
                    {/* Gradient glow on hover */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${gradientClass}/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl blur-xl`} />
                    
                    {/* Step number badge */}
                    <motion.div 
                      className="relative mb-6 flex justify-center"
                      whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className={`relative w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-r ${step.color} flex items-center justify-center text-white font-bold text-lg md:text-xl shadow-lg shadow-violet-500/30`}>
                        <span className="relative z-10">{step.number}</span>
                        <motion.div
                          className={`absolute inset-0 rounded-full bg-gradient-to-r ${step.color}`}
                          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        />
                      </div>
                    </motion.div>
                    
                    {/* Icon container */}
                    <motion.div 
                      className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-r ${step.color} bg-opacity-20 flex items-center justify-center mx-auto mb-5 relative z-10 group-hover:bg-opacity-30 transition-all`}
                      whileHover={{ rotate: [0, 5, -5, 0], scale: 1.1 }}
                      transition={{ duration: 0.5 }}
                    >
                      <Icon className="w-8 h-8 md:w-10 md:h-10 text-white" />
                    </motion.div>
                    
                    {/* Title */}
                    <h3 className="text-lg md:text-xl lg:text-2xl font-bold text-white mb-3 relative z-10 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-violet-400 group-hover:to-cyan-400 group-hover:bg-clip-text transition-all">
                      {step.title}
                    </h3>
                    
                    {/* Description */}
                    <p className="text-gray-400 leading-relaxed text-sm md:text-base relative z-10 mb-5 min-h-[60px]">
                      {step.description}
                    </p>
                    
                    {/* Platform badges with icons */}
                    {step.platforms.length > 0 && (
                      <div className="flex flex-wrap gap-2 justify-center mt-4 relative z-10">
                        {step.platforms.map((platform, pIndex) => {
                          const PlatformIcon = step.platformIcons?.[pIndex]
                          return (
                            <motion.div
                              key={platform}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-gray-300 hover:text-white hover:border-white/30 transition-all cursor-pointer group/badge"
                              whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
                            >
                              {PlatformIcon && (
                                <PlatformIcon className="w-3.5 h-3.5 group-hover/badge:scale-110 transition-transform" />
                              )}
                              <span className="text-xs font-medium">{platform}</span>
                </motion.div>
              )
            })}
          </div>
                    )}
                    
                    {/* Decorative elements */}
                    {index === 1 && (
                      <motion.div 
                        className="mt-4 flex justify-center relative z-10"
                        animate={{ 
                          scale: [1, 1.05, 1],
                          rotate: [0, 5, -5, 0]
                        }}
                        transition={{ duration: 4, repeat: Infinity }}
                      >
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center opacity-70">
                          <Coins className="w-8 h-8 text-white" />
                        </div>
                      </motion.div>
                    )}
        
                    {index === 2 && (
          <motion.div
                        className="mt-4 flex justify-center gap-1 relative z-10"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <DollarSign className="w-5 h-5 text-emerald-400" />
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                        <Target className="w-5 h-5 text-emerald-400" />
                      </motion.div>
                    )}
                    
                    {/* Bottom accent line */}
                    <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${gradientClass} opacity-0 group-hover:opacity-100 transition-opacity rounded-b-3xl`} />
                  </motion.div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative py-32 px-4 z-10">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Why <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">ContentVault</span>?
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Built on Aptos blockchain for creators and their communities.
            </p>
            </motion.div>
            
          <div className="grid md:grid-cols-2 gap-8">
            {benefits.map((benefit, index) => (
          <motion.div 
                key={benefit.title}
                initial={{ opacity: 0, y: 30, rotateX: -15 }}
                whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
              viewport={{ once: true }}
                transition={{ delay: index * 0.2, type: "spring" }}
                className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-white/30 transition-all relative overflow-hidden group"
                whileHover={{ 
                  y: -10,
                  z: 50,
                  rotateY: 5
                }}
                style={{ transformStyle: 'preserve-3d' }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${benefit.color}/10 opacity-0 group-hover:opacity-100 transition-opacity`} />
                <h3 className={`text-2xl font-bold mb-6 relative z-10 bg-gradient-to-r ${benefit.color} bg-clip-text text-transparent`}>
                  {benefit.title}
                </h3>
                <ul className="space-y-4 relative z-10">
                  {benefit.items.map((item, i) => (
                    <motion.li
                      key={i}
                      className="flex items-start gap-3 text-gray-300"
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
                      transition={{ delay: index * 0.2 + i * 0.1 }}
                    >
                      <CheckCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 bg-gradient-to-r ${benefit.color} bg-clip-text text-transparent`} />
                      <span>{item}</span>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA - 3D Card */}
      <section className="relative py-32 px-4 z-10">
        <div className="max-w-5xl mx-auto text-center">
          {/* Glow effect */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <motion.div 
              className="w-[600px] h-[600px] bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 rounded-full blur-[120px]"
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 8, repeat: Infinity }}
            />
        </div>
        
          <motion.div
            initial={{ opacity: 0, y: 50, rotateX: -15 }}
            whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
              viewport={{ once: true }}
            className="relative z-10 p-12 rounded-[40px] bg-gradient-to-r from-white/5 to-white/10 border border-white/20 backdrop-blur-xl group"
            whileHover={{ 
              y: -10,
              z: 50,
              rotateY: 2
            }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* 3D Icon */}
            <motion.div 
              className="w-32 h-32 mx-auto mb-8 rounded-3xl bg-gradient-to-r from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-2xl relative"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              whileHover={{ rotateY: 360, scale: 1.1 }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              <div style={{ transform: 'translateZ(30px)' }} className="w-20 h-20 rounded-2xl bg-black/20 flex items-center justify-center">
                <TokenIcon className="w-10 h-10 text-white" />
              </div>
            </motion.div>
              
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Ready to Own Your <br />
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
                Content Empire?
              </span>
            </h2>
            
            <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
              Join the creator revolution. Tokenize your content, earn from every trade, 
              create prediction markets, and give your fans real value on Aptos blockchain.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/tokenize">
                <motion.button
                  className="group px-10 py-5 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-2xl text-white font-bold text-lg shadow-2xl shadow-violet-500/50 relative overflow-hidden"
                  whileHover={{ scale: 1.05, boxShadow: '0 20px 60px rgba(139, 92, 246, 0.6)' }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="relative z-10 flex items-center gap-3">
                    <Wallet className="w-6 h-6" />
                    Connect & Start
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </span>
              <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-fuchsia-600 to-violet-600"
                    initial={{ x: '100%' }}
                    whileHover={{ x: 0 }}
                    transition={{ duration: 0.3 }}
                  />
                </motion.button>
                </Link>
              
              <Link to="/dashboard">
                <motion.button
                  className="px-10 py-5 border-2 border-white/20 rounded-2xl text-white font-bold text-lg hover:bg-white/5 transition-colors backdrop-blur-sm"
                  whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                >
                  <span className="flex items-center gap-3">
                    <BarChart3 className="w-6 h-6" />
                    View Dashboard
                  </span>
                </motion.button>
                </Link>

              <Link to="/predictions">
                <motion.button
                  className="px-10 py-5 border-2 border-cyan-500/30 rounded-2xl text-cyan-400 font-bold text-lg hover:bg-cyan-500/10 transition-colors backdrop-blur-sm"
                  whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                >
                  <span className="flex items-center gap-3">
                    <Target className="w-6 h-6" />
                    Predictions
                  </span>
                </motion.button>
                </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer spacer */}
      <div className="h-20" />
    </div>
  )
}

export default Home
