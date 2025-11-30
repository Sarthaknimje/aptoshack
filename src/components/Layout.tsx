import React, { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Wallet, User, Rocket, Home, BarChart3, Play, TrendingUp, Sparkles } from 'lucide-react'
import { useWallet } from '../contexts/WalletContext'
import { PetraWalletIcon } from '../assets/icons'

const Layout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const location = useLocation()
  const { isConnected, address, balance, connectWallet, disconnectWallet, isLoading } = useWallet()

  const navigation = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Feed', href: '/feed', icon: Sparkles },
    { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
    { name: 'Tokenize', href: '/tokenize', icon: Rocket },
    { name: 'Marketplace', href: '/marketplace', icon: BarChart3 },
    { name: 'Predictions', href: '/predictions', icon: TrendingUp },
    { name: 'YouTube Videos', href: '/youtube/videos', icon: Play },
    { name: 'Profile', href: '/profile', icon: User },
  ]

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Navigation */}
      <nav className="bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center h-14">
            {/* Enhanced Logo */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link to="/" className="flex items-center space-x-3 group">
                <motion.div 
                  className="w-10 h-10 bg-gradient-to-r from-purple-600 via-violet-600 to-amber-500 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-purple-500/25 transition-all duration-300"
                  whileHover={{ rotate: 5 }}
                >
                  <span className="text-white font-bold text-xl">CC</span>
                </motion.div>
                <motion.span 
                  className="text-white font-display font-bold text-2xl gradient-text group-hover:text-cyan-400 transition-colors duration-300"
                  animate={{ 
                    backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
                  }}
                  transition={{ 
                    duration: 3, 
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  style={{ 
                    backgroundSize: "200% 200%"
                  }}
                >
                  Creator Coin
                </motion.span>
              </Link>
            </motion.div>

            {/* Enhanced Desktop Navigation - Compact for many items */}
            <div className="hidden lg:flex items-center space-x-0.5 overflow-x-auto scrollbar-hide flex-1 justify-center mx-2">
              {navigation.map((item, index) => {
                const Icon = item.icon
                const isActive = location.pathname === item.href
                return (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                  >
                    <Link
                      to={item.href}
                      className={`flex items-center space-x-1 px-2 py-1.5 rounded-lg transition-all duration-300 group ${
                        isActive
                          ? 'bg-purple-500/20 text-amber-400 border border-purple-500/30'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                      title={item.name}
                    >
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-gray-500 group-hover:text-white'}`} />
                      </motion.div>
                      <span className="font-semibold text-sm whitespace-nowrap">{item.name}</span>
                    </Link>
                  </motion.div>
                )
              })}
            </div>
            
            {/* Medium screens - show more items with icons only */}
            <div className="hidden md:flex lg:hidden items-center space-x-1 overflow-x-auto scrollbar-hide">
              {navigation.map((item, index) => {
                const Icon = item.icon
                const isActive = location.pathname === item.href
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`p-2 rounded-lg transition-all duration-300 flex-shrink-0 ${
                      isActive
                        ? 'bg-purple-500/20 text-amber-400'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                    title={item.name}
                  >
                    <Icon className="w-4 h-4" />
                  </Link>
                )
              })}
            </div>

            {/* Enhanced Wallet Connection */}
            <div className="flex items-center space-x-4">
              {isConnected ? (
                <motion.div 
                  className="flex items-center space-x-3"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <motion.div 
                    className="hidden sm:block text-right"
                    whileHover={{ scale: 1.05 }}
                  >
                    <div className="text-white text-sm font-semibold">
                      {formatAddress(address!)}
                    </div>
                    <div className="text-cyan-400 text-xs font-medium">
                      {balance.toFixed(2)} APTOS
                    </div>
                  </motion.div>
                  <motion.button
                    onClick={disconnectWallet}
                    className="btn-secondary text-sm px-4 py-2 hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400 transition-all duration-300"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Disconnect
                  </motion.button>
                </motion.div>
              ) : (
                <motion.button
                  onClick={connectWallet}
                  disabled={isLoading}
                  className="btn-primary flex items-center space-x-2 disabled:opacity-50 hover:shadow-lg hover:shadow-primary-500/25 transition-all duration-300"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <motion.div
                    animate={isLoading ? { rotate: 360 } : { rotate: 0 }}
                    transition={{ duration: 1, repeat: isLoading ? Infinity : 0 }}
                  >
                    <PetraWalletIcon className="w-5 h-5" />
                  </motion.div>
                  <span className="font-semibold">{isLoading ? 'Connecting...' : 'Connect Wallet'}</span>
                </motion.button>
              )}

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/5"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-white/10"
            >
              <div className="px-4 py-4 space-y-2">
                {navigation.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-300 ${
                        isActive
                          ? 'bg-white/10 text-white'
                          : 'text-gray-300 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-semibold text-base">{item.name}</span>
                    </Link>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="glass-effect border-t border-white/10 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-600 via-violet-600 to-amber-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">CC</span>
                </div>
                <span className="text-white font-display font-bold text-xl gradient-text">
                  Creator Coin
                </span>
              </div>
              <p className="text-gray-400 mb-4">
                Tokenize your content. Build your empire. Reward your holders with premium access.
              </p>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Platform</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
                <li><Link to="/tokenize" className="hover:text-white transition-colors">Tokenize Content</Link></li>
                <li><Link to="/marketplace" className="hover:text-white transition-colors">Marketplace</Link></li>
                <li><Link to="/profile" className="hover:text-white transition-colors">My Profile</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Community</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/10 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Creator Coin. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Layout
