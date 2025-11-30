import { Routes, Route } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ErrorBoundary from './components/ErrorBoundary'
import Layout from './components/Layout'
import PhotonStatus from './components/PhotonStatus'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import TokenDetails from './pages/TokenDetails'
import CreatorMarketplace from './pages/CreatorMarketplace'
import CreatorProfile from './pages/CreatorProfile'
import TradingMarketplace from './pages/TradingMarketplace'
import YouTubeCallback from './pages/YouTubeCallback'
import MultiPlatformTokenization from './pages/MultiPlatformTokenization'
import YouTubeVideos from './pages/YouTubeVideos'
import PredictionMarket from './pages/PredictionMarket'
import CopyTradingDashboard from './pages/CopyTradingDashboard'
import BotStrategies from './pages/BotStrategies'
import Referrals from './pages/Referrals'
import SocialFeed from './pages/SocialFeed'
import CreatePost from './pages/CreatePost'
import CreatorProfilePage from './pages/CreatorProfilePage'

function App() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="copy-trading" element={<CopyTradingDashboard />} />
              <Route path="bot-strategies" element={<BotStrategies />} />
              <Route path="tokenize" element={<MultiPlatformTokenization />} />
              <Route path="profile" element={<Profile />} />
              <Route path="token/:id" element={<TokenDetails />} />
              <Route path="marketplace" element={<CreatorMarketplace />} />
              <Route path="creator/:id" element={<CreatorProfile />} />
              <Route path="trade/:symbol" element={<TradingMarketplace />} />
              <Route path="youtube/videos" element={<YouTubeVideos />} />
              <Route path="predictions" element={<PredictionMarket />} />
              <Route path="referrals" element={<Referrals />} />
              <Route path="feed" element={<SocialFeed />} />
              <Route path="create-post" element={<CreatePost />} />
              <Route path="creator/:address" element={<CreatorProfilePage />} />
              <Route path="auth/youtube/callback" element={<YouTubeCallback />} />
            </Route>
          </Routes>
        </AnimatePresence>
        {/* Photon Status Monitor */}
        <PhotonStatus />
      </div>
    </ErrorBoundary>
  )
}

export default App
