import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface PremiumBackgroundProps {
  variant?: 'default' | 'purple' | 'blue' | 'green' | 'orange'
  showParticles?: boolean
  showCursorGlow?: boolean
}

const PremiumBackground: React.FC<PremiumBackgroundProps> = ({ 
  variant = 'default',
  showParticles = true,
  showCursorGlow = true
}) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (!showCursorGlow) return
    
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [showCursorGlow])

  const gradients = {
    default: {
      primary: 'rgba(120, 0, 255, 0.15)',
      secondary: 'rgba(0, 200, 255, 0.1)',
      tertiary: 'rgba(255, 0, 128, 0.08)',
      cursor: 'rgba(120, 0, 255, 0.1)'
    },
    purple: {
      primary: 'rgba(147, 51, 234, 0.2)',
      secondary: 'rgba(192, 38, 211, 0.15)',
      tertiary: 'rgba(79, 70, 229, 0.1)',
      cursor: 'rgba(147, 51, 234, 0.1)'
    },
    blue: {
      primary: 'rgba(59, 130, 246, 0.2)',
      secondary: 'rgba(6, 182, 212, 0.15)',
      tertiary: 'rgba(99, 102, 241, 0.1)',
      cursor: 'rgba(59, 130, 246, 0.1)'
    },
    green: {
      primary: 'rgba(16, 185, 129, 0.2)',
      secondary: 'rgba(34, 197, 94, 0.15)',
      tertiary: 'rgba(20, 184, 166, 0.1)',
      cursor: 'rgba(16, 185, 129, 0.1)'
    },
    orange: {
      primary: 'rgba(249, 115, 22, 0.2)',
      secondary: 'rgba(245, 158, 11, 0.15)',
      tertiary: 'rgba(239, 68, 68, 0.1)',
      cursor: 'rgba(249, 115, 22, 0.1)'
    }
  }

  const colors = gradients[variant]

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {/* Gradient mesh */}
      <div 
        className="absolute inset-0 opacity-60"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 20% 40%, ${colors.primary}, transparent),
            radial-gradient(ellipse 60% 40% at 80% 60%, ${colors.secondary}, transparent),
            radial-gradient(ellipse 40% 60% at 50% 80%, ${colors.tertiary}, transparent)
          `
        }}
      />
      
      {/* Animated orbs */}
      <motion.div 
        className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[100px]"
        style={{ background: `radial-gradient(circle, ${colors.primary}, transparent 70%)` }}
        animate={{ 
          scale: [1, 1.2, 1],
          x: [0, 30, 0],
          y: [0, -20, 0]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full blur-[100px]"
        style={{ background: `radial-gradient(circle, ${colors.secondary}, transparent 70%)` }}
        animate={{ 
          scale: [1.2, 1, 1.2],
          x: [0, -20, 0],
          y: [0, 30, 0]
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
      />
      
      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px'
        }}
      />
      
      {/* Floating particles */}
      {showParticles && [...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-white/30 rounded-full"
          initial={{
            x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
            y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000),
          }}
          animate={{
            y: [null, Math.random() * -300 - 100],
            opacity: [0, 0.8, 0],
          }}
          transition={{
            duration: Math.random() * 15 + 10,
            repeat: Infinity,
            ease: 'linear',
            delay: Math.random() * 5,
          }}
        />
      ))}
      
      {/* Cursor glow effect */}
      {showCursorGlow && (
        <motion.div
          className="absolute w-80 h-80 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${colors.cursor} 0%, transparent 70%)`,
            left: mousePosition.x - 160,
            top: mousePosition.y - 160,
          }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </div>
  )
}

export default PremiumBackground

