import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useParams, Link } from 'react-router-dom'
import { 
  FileText, 
  Download, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Shield, 
  Zap,
  Globe,
  Target,
  Award,
  BarChart3,
  CheckCircle,
  ArrowRight,
  Star,
  Heart,
  Lightbulb,
  Calendar,
  Play,
  Image as ImageIcon,
  Clock,
  TrendingDown,
  Activity,
  ExternalLink
} from 'lucide-react'
import { YouTubeIcon, InstagramIcon, TwitterIcon } from '../assets/icons'
import { Gift } from 'lucide-react'

const CreatorProfile: React.FC = () => {
  const { id } = useParams()
  const [activeTab, setActiveTab] = useState('overview')
  const [tokenData, setTokenData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch real token data from backend
  useEffect(() => {
    const fetchTokenData = async () => {
      try {
        setLoading(true)
        const response = await fetch('http://localhost:5001/tokens')
        const result = await response.json()
        
        if (result.success) {
          // Find token by ASA ID
          const token = result.tokens.find((t: any) => t.asa_id.toString() === id)
          if (token) {
            setTokenData(token)
          } else {
            setError('Token not found')
          }
        } else {
          setError('Failed to fetch token data')
        }
      } catch (err) {
        setError('Error connecting to backend')
        console.error('Error fetching token:', err)
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchTokenData()
    }
  }, [id])

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading creator profile...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (error || !tokenData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">!</span>
          </div>
          <p className="text-white text-lg mb-2">Something went wrong</p>
          <p className="text-gray-400">{error || 'Token not found'}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-6 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-white"
          >
            Refresh Page
          </button>
        </div>
      </div>
    )
  }

  // Create creator object from real token data
  const creator = {
    id: tokenData.asa_id.toString(),
    name: tokenData.youtube_channel_title || 'Unknown Creator',
    symbol: tokenData.token_symbol,
    tagline: `${tokenData.youtube_channel_title} - Content Creator`,
    description: `Creator of ${tokenData.token_name}. Building engaging content and connecting with ${tokenData.youtube_subscribers} subscribers.`,
    profileImage: '/api/placeholder/200/200',
    coverImage: '/api/placeholder/1200/400',
    socialLinks: {
      youtube: 'https://youtube.com',
      instagram: 'https://instagram.com',
      twitter: 'https://twitter.com'
    },
    tokenMetrics: {
      currentPrice: tokenData.current_price,
      priceChange24h: tokenData.price_change_24h,
      marketCap: tokenData.market_cap,
      volume24h: tokenData.volume_24h,
      holders: tokenData.holders,
      totalSupply: tokenData.total_supply,
      circulatingSupply: tokenData.total_supply // Use real total supply
    },
    contentStats: {
      totalContent: 156,
      premiumContent: 45,
      totalViews: 15000000,
      averageViews: 96000
    },
    achievements: [
      {
        title: '1 Million Subscribers',
        description: 'Reached 1M subscribers on YouTube',
        date: '2024-01-15',
        icon: 'trophy'
      },
      {
        title: 'Top Tech Educator 2024',
        description: 'Awarded Top Tech Educator by Tech Academy',
        date: '2024-03-20',
        icon: 'award'
      },
      {
        title: '500+ Videos Published',
        description: 'Created over 500 educational videos',
        date: '2024-05-10',
        icon: 'video'
      }
    ],
    roadmap: [
      {
        quarter: 'Q4 2024',
        title: 'AI Course Series Launch',
        description: 'Comprehensive AI and Machine Learning course series',
        status: 'in-progress',
        items: [
          'Machine Learning Fundamentals',
          'Deep Learning with TensorFlow',
          'AI Project Portfolio Building'
        ]
      },
      {
        quarter: 'Q1 2025',
        title: 'Community Platform',
        description: 'Build exclusive community platform for token holders',
        status: 'planned',
        items: [
          'Private Discord Server',
          'Weekly Live Coding Sessions',
          'Code Review Service'
        ]
      },
      {
        quarter: 'Q2 2025',
        title: 'Tech Summit Event',
        description: 'Host tech summit with industry leaders',
        status: 'planned',
        items: [
          'Speaker Lineup Announcement',
          'Virtual & In-Person Options',
          'Free Access for Token Holders'
        ]
      }
    ],
    plans: [
      {
        title: 'Content Expansion',
        description: 'Expanding into mobile app development and cloud computing tutorials',
        timeline: 'Next 3 months'
      },
      {
        title: 'Mentorship Program',
        description: 'One-on-one mentorship for top token holders',
        timeline: 'Next 6 months'
      },
      {
        title: 'Book Publication',
        description: 'Publishing "Modern Software Development" book',
        timeline: 'Next 12 months'
      }
    ],
    holderBenefits: [
      {
        tier: 'Bronze',
        requirement: '100+ tokens',
        benefits: [
          'Access to premium video library',
          'Early video access (24h before public)',
          'Monthly newsletter with exclusive tips'
        ]
      },
      {
        tier: 'Silver',
        requirement: '500+ tokens',
        benefits: [
          'All Bronze benefits',
          'Private Discord channel access',
          'Quarterly Q&A sessions',
          'Source code for all projects'
        ]
      },
      {
        tier: 'Gold',
        requirement: '1000+ tokens',
        benefits: [
          'All Silver benefits',
          'Monthly 1-on-1 mentorship call',
          'Early access to courses (1 week before launch)',
          'Personalized career guidance'
        ]
      }
    ],
    recentContent: [
      {
        id: '1',
        type: 'youtube',
        title: 'Building a Full Stack App with React & Node.js',
        thumbnail: '/api/placeholder/320/180',
        isPremium: false,
        views: 125000,
        likes: 8500,
        publishedAt: '2024-10-20'
      },
      {
        id: '2',
        type: 'instagram',
        title: 'Quick Tip: JavaScript Array Methods',
        thumbnail: '/api/placeholder/320/320',
        isPremium: false,
        views: 45000,
        likes: 3200,
        publishedAt: '2024-10-22'
      },
      {
        id: '3',
        type: 'youtube',
        title: 'Advanced TypeScript Patterns - Premium',
        thumbnail: '/api/placeholder/320/180',
        isPremium: true,
        views: 15000,
        likes: 1200,
        publishedAt: '2024-10-25'
      }
    ]
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M'
    } else if (num >= 1000) {
      return (num / 1000).toFixed(2) + 'K'
    }
    return num.toFixed(2)
  }

  const tabs = [
    { id: 'whitepaper', label: 'Whitepaper', icon: FileText },
    { id: 'overview', label: 'Overview', icon: Star },
    { id: 'roadmap', label: 'Roadmap', icon: Target },
    { id: 'achievements', label: 'Achievements', icon: Award },
    { id: 'content', label: 'Content', icon: Play },
    { id: 'holder-benefits', label: 'Holder Benefits', icon: Gift }
  ]

  return (
    <div className="min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cover Image */}
        <div className="relative h-64 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl mb-8 overflow-hidden">
          <div className="absolute inset-0 bg-black/20"></div>
        </div>

        {/* Profile Header */}
        <div className="relative -mt-32 mb-8">
          <div className="card">
            <div className="flex flex-col md:flex-row items-center md:items-end space-y-4 md:space-y-0 md:space-x-6">
              {/* Profile Image */}
              <div className="relative -mt-16">
                <div className="w-32 h-32 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center ring-4 ring-gray-900">
                  <Star className="w-16 h-16 text-white" />
                </div>
              </div>

              {/* Creator Info */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl font-bold text-white mb-2">{creator.name}</h1>
                <p className="text-gray-400 mb-4">{creator.tagline}</p>
                
                {/* Social Links */}
                <div className="flex items-center justify-center md:justify-start space-x-4">
                  <a 
                    href={tokenData.video_id ? `https://www.youtube.com/watch?v=${tokenData.video_id}` : creator.socialLinks.youtube} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="hover:scale-110 transition-transform"
                  >
                    <YouTubeIcon className="w-6 h-6" />
                  </a>
                  <a href={creator.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform">
                    <InstagramIcon className="w-6 h-6" />
                  </a>
                  <a href={creator.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform">
                    <TwitterIcon className="w-6 h-6" />
                  </a>
                </div>
              </div>

              {/* Token Info */}
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-1">${creator.tokenMetrics.currentPrice.toFixed(4)}</div>
                <div className={`text-sm ${creator.tokenMetrics.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {creator.tokenMetrics.priceChange24h >= 0 ? '+' : ''}{creator.tokenMetrics.priceChange24h.toFixed(2)}% 24h
                </div>
                <div className="flex space-x-3 mt-4 justify-center">
                  <Link to={`/trade/${creator.symbol}`} className="btn-primary inline-flex items-center">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Trade ${creator.symbol}
                  </Link>
                  <button 
                    onClick={() => window.open(`https://testnet.explorer.petrawallet.app/asset/${creator.id}`, '_blank')}
                    className="btn-secondary inline-flex items-center"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View on Explorer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Token Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card text-center">
            <BarChart3 className="w-8 h-8 text-blue-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">${formatNumber(creator.tokenMetrics.marketCap)}</div>
            <div className="text-gray-400 text-sm">Market Cap</div>
          </div>
          <div className="card text-center">
            <Activity className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">${formatNumber(creator.tokenMetrics.volume24h)}</div>
            <div className="text-gray-400 text-sm">24h Volume</div>
          </div>
          <div className="card text-center">
            <Users className="w-8 h-8 text-purple-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{formatNumber(creator.tokenMetrics.holders)}</div>
            <div className="text-gray-400 text-sm">Holders</div>
          </div>
          <div className="card text-center">
            <Play className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{creator.contentStats.totalContent}</div>
            <div className="text-gray-400 text-sm">Total Content</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-8 bg-white/5 p-1 rounded-xl overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-3 px-4 rounded-lg transition-all duration-300 whitespace-nowrap ${
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
          {/* Whitepaper Tab */}
          {activeTab === 'whitepaper' && (
            <div className="space-y-8">
              {/* Executive Summary */}
              <div className="card">
                <h2 className="text-3xl font-bold text-white mb-6">Creator Whitepaper</h2>
                <div className="prose prose-invert max-w-none">
                  <p className="text-lg text-gray-300 leading-relaxed mb-6">
                    Welcome to my creator whitepaper. This document outlines my vision, roadmap, achievements, 
                    and what holders of my token can expect. Think of this as my commitment to you - my community.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="text-center p-6 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl border border-blue-500/20">
                      <div className="text-4xl font-bold text-blue-400 mb-2">${creator.tokenMetrics.currentPrice.toFixed(4)}</div>
                      <div className="text-gray-400">Current Token Price</div>
                    </div>
                    <div className="text-center p-6 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/20">
                      <div className="text-4xl font-bold text-green-400 mb-2">{formatNumber(creator.tokenMetrics.holders)}</div>
                      <div className="text-gray-400">Token Holders</div>
                    </div>
                    <div className="text-center p-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20">
                      <div className="text-4xl font-bold text-purple-400 mb-2">{creator.contentStats.totalContent}</div>
                      <div className="text-gray-400">Total Content Pieces</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Vision & Mission */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card">
                  <Target className="w-12 h-12 text-blue-400 mb-4" />
                  <h3 className="text-2xl font-semibold text-white mb-4">Vision</h3>
                  <p className="text-gray-300 leading-relaxed">
                    To democratize tech education and make quality programming content accessible to everyone worldwide. 
                    Building a community where knowledge flows freely and developers support each other.
                  </p>
                </div>
                <div className="card">
                  <Heart className="w-12 h-12 text-purple-400 mb-4" />
                  <h3 className="text-2xl font-semibold text-white mb-4">Mission</h3>
                  <p className="text-gray-300 leading-relaxed">
                    Create comprehensive, high-quality educational content that helps developers at all skill levels. 
                    Foster a supportive community where learning is rewarding both intellectually and financially.
                  </p>
                </div>
              </div>

              {/* Token Economics */}
              <div className="card">
                <h3 className="text-2xl font-semibold text-white mb-6">Token Economics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-medium text-white mb-4">Token Distribution</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Total Supply</span>
                        <span className="text-white font-semibold">{formatNumber(creator.tokenMetrics.totalSupply)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Circulating Supply</span>
                        <span className="text-white font-semibold">{formatNumber(creator.tokenMetrics.circulatingSupply)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Market Cap</span>
                        <span className="text-white font-semibold">${formatNumber(creator.tokenMetrics.marketCap)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">24h Volume</span>
                        <span className="text-white font-semibold">${formatNumber(creator.tokenMetrics.volume24h)}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-white mb-4">Holder Benefits</h4>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-gray-300">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <span>Premium content access</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-300">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <span>Early video releases</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-300">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <span>Community access</span>
                      </div>
                      <div className="flex items-center space-x-2 text-gray-300">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <span>Mentorship opportunities</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Roadmap Summary */}
              <div className="card">
                <h3 className="text-2xl font-semibold text-white mb-6">Roadmap Highlights</h3>
                <div className="space-y-4">
                  {creator.roadmap.map((item, index) => (
                    <div key={index} className="flex items-start space-x-4 p-4 bg-white/5 rounded-lg">
                      <div className="w-20 flex-shrink-0">
                        <div className="text-primary-400 font-semibold">{item.quarter}</div>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-white font-semibold mb-1">{item.title}</h4>
                        <p className="text-gray-400 text-sm">{item.description}</p>
                      </div>
                      <div>
                        <span className={`px-3 py-1 rounded-full text-xs ${
                          item.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                          item.status === 'in-progress' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {item.status === 'completed' ? '✓ Done' :
                           item.status === 'in-progress' ? '⏳ Active' : '📋 Planned'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Why Invest */}
              <div className="card bg-gradient-to-r from-primary-500/10 to-secondary-500/10 border border-primary-500/20">
                <h3 className="text-2xl font-semibold text-white mb-6">Why Invest in My Token?</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start space-x-3">
                    <Star className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="text-white font-medium mb-1">Proven Track Record</h4>
                      <p className="text-gray-300 text-sm">1M+ subscribers and consistent content delivery</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <TrendingUp className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="text-white font-medium mb-1">Growing Community</h4>
                      <p className="text-gray-300 text-sm">Active, engaged audience that values quality</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Shield className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="text-white font-medium mb-1">Transparent Operations</h4>
                      <p className="text-gray-300 text-sm">Regular updates and community involvement</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Zap className="w-6 h-6 text-purple-400 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="text-white font-medium mb-1">Exclusive Benefits</h4>
                      <p className="text-gray-300 text-sm">Premium content and mentorship for holders</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div className="card">
                <h2 className="text-2xl font-bold text-white mb-4">About</h2>
                <p className="text-gray-300 leading-relaxed">{creator.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card">
                  <h3 className="text-lg font-semibold text-white mb-4">Vision</h3>
                  <p className="text-gray-400">Democratize tech education and make quality programming content accessible to everyone worldwide.</p>
                </div>
                <div className="card">
                  <h3 className="text-lg font-semibold text-white mb-4">Mission</h3>
                  <p className="text-gray-400">Create comprehensive, high-quality educational content that helps developers at all skill levels.</p>
                </div>
                <div className="card">
                  <h3 className="text-lg font-semibold text-white mb-4">Values</h3>
                  <p className="text-gray-400">Quality, Accessibility, Community, Innovation, and Continuous Learning.</p>
                </div>
              </div>
            </div>
          )}

          {/* Roadmap Tab */}
          {activeTab === 'roadmap' && (
            <div className="space-y-6">
              {creator.roadmap.map((item, index) => (
                <div key={index} className="card">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="text-primary-400 font-semibold mb-2">{item.quarter}</div>
                      <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                      <p className="text-gray-400">{item.description}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      item.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                      item.status === 'in-progress' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {item.status === 'completed' ? 'Completed' :
                       item.status === 'in-progress' ? 'In Progress' : 'Planned'}
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {item.items.map((subItem, idx) => (
                      <li key={idx} className="flex items-center space-x-2 text-gray-300">
                        <CheckCircle className="w-4 h-4 text-primary-400" />
                        <span>{subItem}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {/* Achievements Tab */}
          {activeTab === 'achievements' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {creator.achievements.map((achievement, index) => (
                <div key={index} className="card">
                  <Award className="w-12 h-12 text-yellow-400 mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">{achievement.title}</h3>
                  <p className="text-gray-400 text-sm mb-3">{achievement.description}</p>
                  <div className="flex items-center space-x-2 text-gray-500 text-xs">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(achievement.date).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Content Tab */}
          {activeTab === 'content' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {creator.recentContent.map((content) => (
                <div key={content.id} className="card">
                  <div className="relative mb-4">
                    <div className="aspect-video bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg"></div>
                    {content.isPremium && (
                      <span className="absolute top-2 right-2 px-2 py-1 bg-yellow-500 text-gray-900 text-xs font-semibold rounded">
                        PREMIUM
                      </span>
                    )}
                  </div>
                  <h3 className="text-white font-semibold mb-2 line-clamp-2">{content.title}</h3>
                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <div className="flex items-center space-x-4">
                      <span>{formatNumber(content.views)} views</span>
                      <span>{formatNumber(content.likes)} likes</span>
                    </div>
                    <span>{content.type === 'youtube' ? <YouTubeIcon className="w-4 h-4" /> : <InstagramIcon className="w-4 h-4" />}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Holder Benefits Tab */}
          {activeTab === 'holder-benefits' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {creator.holderBenefits.map((tier, index) => (
                <div key={index} className="card border-2 border-primary-500/20">
                  <h3 className="text-xl font-bold text-white mb-2">{tier.tier}</h3>
                  <p className="text-gray-400 mb-4">{tier.requirement}</p>
                  <ul className="space-y-3">
                    {tier.benefits.map((benefit, idx) => (
                      <li key={idx} className="flex items-start space-x-2 text-gray-300">
                        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default CreatorProfile
