import React, { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Info } from 'lucide-react'
import { BondingCurveService, BondingCurveConfig } from '../services/bondingCurveService'

interface BondingCurveChartProps {
  config: BondingCurveConfig
  currentSupply: number
  currentPrice: number
  marketCap: number
  height?: number
}

const BondingCurveChart: React.FC<BondingCurveChartProps> = ({
  config,
  currentSupply,
  currentPrice,
  marketCap,
  height = 300
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Validate and format values (before useEffect)
  const safeCurrentPrice = (() => {
    const price = Number(currentPrice)
    return (isNaN(price) || price <= 0) ? (config?.initial_price || 0.001) : price
  })()

  const safeCurrentSupply = (() => {
    const supply = Number(currentSupply)
    return (isNaN(supply) || supply < 0) ? 0 : supply
  })()

  const safeMarketCap = (() => {
    const cap = Number(marketCap)
    return (isNaN(cap) || cap < 0) ? 0 : cap
  })()

  useEffect(() => {
    if (!canvasRef.current || !config) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const drawChart = () => {
      // Set canvas size based on container
      const container = canvas.parentElement?.parentElement
      if (container) {
        const containerWidth = Math.max(container.clientWidth - 32, 600) // Account for padding
        canvas.width = containerWidth
        canvas.height = height
        canvas.style.width = '100%'
        canvas.style.height = `${height}px`
      } else {
        // Fallback to default size
        canvas.width = 800
        canvas.height = height
      }

    // Use validated values
    const validSupply = safeCurrentSupply
    const validPrice = safeCurrentPrice
    const validMarketCap = safeMarketCap

    const width = canvas.width
    const chartHeight = height - 60
    const padding = 60

    // Set background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.5)'
    ctx.fillRect(0, 0, width, height)

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Generate curve data
    const maxSupply = config.virtualTokenReserve || 1000000
    const curveData = BondingCurveService.generatePriceCurve(config, maxSupply, 200)

    // Find min/max for scaling (filter out invalid values)
    const validPrices = curveData.map(d => d.price).filter(p => !isNaN(p) && p > 0)
    if (validPrices.length === 0) {
      // Draw placeholder message
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
      ctx.font = '16px Inter'
      ctx.textAlign = 'center'
      ctx.fillText('No curve data available', width / 2, height / 2)
      return
    }
    
    const maxPrice = Math.max(...validPrices)
    const minPrice = Math.min(...validPrices)
    const priceRange = maxPrice - minPrice || 1

    // Draw background grid area
    ctx.fillStyle = 'rgba(30, 41, 59, 0.3)'
    ctx.fillRect(padding, padding, width - padding * 2, chartHeight)

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()
    }

    // Draw bonding curve with gradient
    const curveGradient = ctx.createLinearGradient(0, padding, 0, padding + chartHeight)
    curveGradient.addColorStop(0, '#8b5cf6') // violet
    curveGradient.addColorStop(0.5, '#3b82f6') // blue
    curveGradient.addColorStop(1, '#06b6d4') // cyan
    
    ctx.strokeStyle = curveGradient
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()

    let firstPoint = true
    curveData.forEach((point, index) => {
      if (isNaN(point.price) || point.price <= 0) return
      
      const x = padding + ((width - padding * 2) / (curveData.length - 1)) * index
      const y = padding + chartHeight - ((point.price - minPrice) / priceRange) * chartHeight

      if (firstPoint) {
        ctx.moveTo(x, y)
        firstPoint = false
      } else {
        ctx.lineTo(x, y)
      }
    })
    ctx.stroke()

    // Fill area under curve with gradient
    const fillGradient = ctx.createLinearGradient(0, padding, 0, padding + chartHeight)
    fillGradient.addColorStop(0, 'rgba(139, 92, 246, 0.4)') // violet
    fillGradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.3)') // blue
    fillGradient.addColorStop(1, 'rgba(6, 182, 212, 0.1)') // cyan
    
    ctx.fillStyle = fillGradient
    ctx.beginPath()
    
    let firstFillPoint = true
    curveData.forEach((point, index) => {
      if (isNaN(point.price) || point.price <= 0) return
      
      const x = padding + ((width - padding * 2) / (curveData.length - 1)) * index
      const y = padding + chartHeight - ((point.price - minPrice) / priceRange) * chartHeight

      if (firstFillPoint) {
        ctx.moveTo(x, padding + chartHeight)
        ctx.lineTo(x, y)
        firstFillPoint = false
      } else {
        ctx.lineTo(x, y)
      }
    })
    ctx.lineTo(width - padding, padding + chartHeight)
    ctx.closePath()
    ctx.fill()

    // Draw current position marker (only if we have valid data)
    const currentX = padding + ((width - padding * 2) / maxSupply) * validSupply
    const currentY = padding + chartHeight - ((validPrice - minPrice) / priceRange) * chartHeight

    // Only draw marker if supply is valid and within bounds
    if (!isNaN(currentX) && !isNaN(currentY) && validSupply >= 0 && validSupply <= maxSupply) {
      // Draw vertical line at current position
      ctx.strokeStyle = '#10b981'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.beginPath()
      ctx.moveTo(currentX, padding)
      ctx.lineTo(currentX, padding + chartHeight)
      ctx.stroke()
      ctx.setLineDash([])

      // Draw current position dot
      ctx.fillStyle = '#10b981'
      ctx.beginPath()
      ctx.arc(currentX, currentY, 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.stroke()

      // Current position label
      ctx.fillStyle = '#10b981'
      ctx.font = 'bold 12px Inter'
      ctx.textAlign = 'center'
      ctx.fillText('Current', currentX, currentY - 15)
    }

    // Draw axis lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
    ctx.lineWidth = 1
    // Y-axis
    ctx.beginPath()
    ctx.moveTo(padding, padding)
    ctx.lineTo(padding, padding + chartHeight)
    ctx.stroke()
    // X-axis
    ctx.beginPath()
    ctx.moveTo(padding, padding + chartHeight)
    ctx.lineTo(width - padding, padding + chartHeight)
    ctx.stroke()

    // Draw labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
    ctx.font = 'bold 11px Inter'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'

    // Y-axis labels (prices)
    for (let i = 0; i <= 5; i++) {
      const price = minPrice + (priceRange / 5) * (5 - i)
      const y = padding + (chartHeight / 5) * i
      const priceText = price < 0.01 
        ? price.toFixed(6) 
        : price < 1 
          ? price.toFixed(4) 
          : price.toFixed(2)
      ctx.fillText(`${priceText}`, padding - 15, y)
    }

    // X-axis labels (supply)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    for (let i = 0; i <= 5; i++) {
      const supply = (maxSupply / 5) * i
      const x = padding + ((width - padding * 2) / 5) * i
      const supplyText = supply >= 1000000 
        ? `${(supply / 1000000).toFixed(1)}M`
        : supply >= 1000 
          ? `${(supply / 1000).toFixed(0)}K`
          : Math.round(supply).toString()
      ctx.fillText(supplyText, x, padding + chartHeight + 10)
    }

    // Draw axis titles
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.font = '10px Inter'
    ctx.textAlign = 'center'
    ctx.save()
    ctx.translate(20, padding + chartHeight / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText('Price (APTOS)', 0, 0)
    ctx.restore()
    
    ctx.textAlign = 'center'
    ctx.fillText('Supply (Tokens)', width / 2, height - 5)
    }

    // Initial draw
    drawChart()

    // Handle resize
    const handleResize = () => {
      drawChart()
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [config, safeCurrentSupply, safeCurrentPrice, safeMarketCap, height])

  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/50 via-slate-950/50 to-slate-900/50 backdrop-blur-xl p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-violet-400" />
            Bonding Curve
          </h3>
          <p className="text-gray-400 text-sm">Price increases automatically as tokens are purchased</p>
        </div>
        <div className="flex items-center space-x-2 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/40">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
          <span className="font-semibold text-emerald-300 text-sm">Active</span>
        </div>
      </div>

      {/* Stats Table - Better Format */}
      <div className="mb-6 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-950/80 to-slate-900/80 backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Metric</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Value</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <tr className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-violet-500"></div>
                    <span className="text-sm font-medium text-gray-300">Current Price</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="text-lg font-bold text-white">
                    {(() => {
                      const price = Number(currentPrice)
                      if (isNaN(price) || price <= 0) return '0.000000'
                      return price.toFixed(6)
                    })()} APTOS
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs text-gray-500">
                    {(() => {
                      const price = Number(currentPrice)
                      if (isNaN(price) || price <= 0) return 'No trades yet'
                      const usdPrice = price * 0.15 // Approximate APTOS/USD rate
                      return `≈ $${usdPrice.toFixed(4)} USD`
                    })()}
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-sm font-medium text-gray-300">Circulating Supply</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="text-lg font-bold text-white">
                    {(() => {
                      const supply = Number(currentSupply)
                      if (isNaN(supply) || supply === null || supply === undefined || supply <= 0) return '0'
                      if (supply >= 1000000) return `${(supply / 1000000).toFixed(2)}M`
                      if (supply >= 1000) return `${(supply / 1000).toFixed(1)}K`
                      return Math.round(supply).toLocaleString()
                    })()}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs text-gray-500">
                    {(() => {
                      const supply = Number(currentSupply)
                      const totalSupply = config?.virtualTokenReserve || 1000000
                      if (isNaN(supply) || supply <= 0) return '0% of total'
                      const percentage = ((supply / totalSupply) * 100).toFixed(2)
                      return `${percentage}% of total supply`
                    })()}
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-sm font-medium text-gray-300">Market Cap</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="text-lg font-bold text-white">
                    {(() => {
                      const cap = Number(marketCap)
                      if (isNaN(cap) || cap <= 0) return '$0.00'
                      if (cap >= 1000000) return `$${(cap / 1000000).toFixed(2)}M`
                      if (cap >= 1000) return `$${(cap / 1000).toFixed(1)}K`
                      return `$${cap.toFixed(2)}`
                    })()}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs text-gray-500">
                    {(() => {
                      const cap = Number(marketCap)
                      const price = Number(currentPrice)
                      if (isNaN(cap) || cap <= 0 || isNaN(price) || price <= 0) return 'Calculated from price × supply'
                      return 'Real-time calculation'
                    })()}
                  </span>
                </td>
              </tr>
              {config && (
                <tr className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                      <span className="text-sm font-medium text-gray-300">Initial Price</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-lg font-bold text-white">
                      {(() => {
                        const initPrice = Number(config.initial_price)
                        if (isNaN(initPrice) || initPrice <= 0) return '0.000000'
                        return initPrice.toFixed(6)
                      })()} APTOS
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-gray-500">Starting price at launch</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-gradient-to-br from-slate-950/50 to-slate-900/50 p-4 overflow-hidden">
        <div className="relative w-full" style={{ height: `${height}px` }}>
          <canvas
            ref={canvasRef}
            width={800}
            height={height}
            className="w-full h-full rounded-lg"
            style={{ display: 'block' }}
          />
        </div>
      </div>

      <div className="mt-6 flex items-start space-x-3 p-4 bg-gradient-to-r from-violet-500/10 via-blue-500/10 to-purple-500/10 rounded-xl border border-violet-500/20 backdrop-blur-sm">
        <div className="p-2 rounded-lg bg-violet-500/20 flex-shrink-0">
          <Info className="w-5 h-5 text-violet-300" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-violet-300 mb-2 text-sm">How Bonding Curves Work</p>
          <p className="text-sm text-gray-300 leading-relaxed">
            As more tokens are purchased, the price increases automatically following a mathematical curve. 
            When tokens are sold, the price decreases proportionally. This creates a fair, automated market 
            without needing traditional order books or market makers.
          </p>
        </div>
      </div>
    </div>
  )
}

export default BondingCurveChart

