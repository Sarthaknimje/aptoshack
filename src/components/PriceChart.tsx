import React, { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface PriceChartProps {
  prices: number[]
  timeframes: string[]
  priceChange?: number
  height?: number
}

const PriceChart: React.FC<PriceChartProps> = ({
  prices,
  timeframes,
  priceChange = 0,
  height = 200
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current || prices.length === 0) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const chartHeight = height - 40
    const padding = 20

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Find min and max prices
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const priceRange = maxPrice - minPrice || 1

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

    // Draw price line
    const isPositive = priceChange >= 0
    ctx.strokeStyle = isPositive ? '#10b981' : '#ef4444'
    ctx.lineWidth = 2
    ctx.beginPath()

    prices.forEach((price, index) => {
      const x = padding + ((width - padding * 2) / (prices.length - 1)) * index
      const y = padding + chartHeight - ((price - minPrice) / priceRange) * chartHeight
      
      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    ctx.stroke()

    // Fill area under curve
    const gradient = ctx.createLinearGradient(0, padding, 0, padding + chartHeight)
    gradient.addColorStop(0, isPositive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)')
    gradient.addColorStop(1, isPositive ? 'rgba(16, 185, 129, 0)' : 'rgba(239, 68, 68, 0)')
    
    ctx.fillStyle = gradient
    ctx.beginPath()
    prices.forEach((price, index) => {
      const x = padding + ((width - padding * 2) / (prices.length - 1)) * index
      const y = padding + chartHeight - ((price - minPrice) / priceRange) * chartHeight
      
      if (index === 0) {
        ctx.moveTo(x, padding + chartHeight)
        ctx.lineTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    ctx.lineTo(width - padding, padding + chartHeight)
    ctx.closePath()
    ctx.fill()

    // Draw points
    prices.forEach((price, index) => {
      const x = padding + ((width - padding * 2) / (prices.length - 1)) * index
      const y = padding + chartHeight - ((price - minPrice) / priceRange) * chartHeight
      
      ctx.fillStyle = isPositive ? '#10b981' : '#ef4444'
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, Math.PI * 2)
      ctx.fill()
    })

    // Draw labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
    ctx.font = '10px Inter'
    ctx.textAlign = 'right'
    
    // Y-axis labels (prices)
    for (let i = 0; i <= 5; i++) {
      const price = minPrice + (priceRange / 5) * (5 - i)
      const y = padding + (chartHeight / 5) * i
      ctx.fillText(`$${price.toFixed(4)}`, padding - 10, y + 3)
    }

    // X-axis labels (time)
    ctx.textAlign = 'center'
    const labelCount = Math.min(5, timeframes.length)
    for (let i = 0; i < labelCount; i++) {
      const index = Math.floor((timeframes.length - 1) * (i / (labelCount - 1)))
      const x = padding + ((width - padding * 2) / (prices.length - 1)) * index
      ctx.fillText(timeframes[index] || '', x, height - 5)
    }
  }, [prices, timeframes, priceChange, height])

  // Generate mock price data if not provided
  const chartPrices = prices.length > 0 ? prices : Array.from({ length: 24 }, (_, i) => {
    const basePrice = 0.01
    const variation = Math.sin(i / 4) * 0.002
    return basePrice + variation
  })

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          {priceChange >= 0 ? (
            <TrendingUp className="w-5 h-5 text-green-400" />
          ) : (
            <TrendingDown className="w-5 h-5 text-red-400" />
          )}
          <span className={`text-lg font-bold ${
            priceChange >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
          </span>
        </div>
        <div className="text-gray-400 text-sm">24h</div>
      </div>
      <canvas
        ref={canvasRef}
        width={600}
        height={height}
        className="w-full"
      />
    </div>
  )
}

export default PriceChart

