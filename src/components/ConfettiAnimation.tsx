import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ConfettiAnimationProps {
  isActive: boolean
  onComplete?: () => void
}

interface ConfettiPiece {
  id: number
  x: number
  y: number
  color: string
  size: number
  rotation: number
  velocity: {
    x: number
    y: number
    rotation: number
  }
}

const colors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
]

export const ConfettiAnimation: React.FC<ConfettiAnimationProps> = ({ 
  isActive, 
  onComplete 
}) => {
  const [confettiPieces, setConfettiPieces] = useState<ConfettiPiece[]>([])

  useEffect(() => {
    if (isActive) {
      // Create confetti pieces
      const pieces: ConfettiPiece[] = []
      for (let i = 0; i < 100; i++) {
        pieces.push({
          id: i,
          x: Math.random() * window.innerWidth,
          y: -10,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: Math.random() * 8 + 4,
          rotation: Math.random() * 360,
          velocity: {
            x: (Math.random() - 0.5) * 10,
            y: Math.random() * 3 + 2,
            rotation: (Math.random() - 0.5) * 20
          }
        })
      }
      setConfettiPieces(pieces)

      // Auto-complete after animation
      const timer = setTimeout(() => {
        if (onComplete) onComplete()
      }, 3000)

      return () => clearTimeout(timer)
    } else {
      setConfettiPieces([])
    }
  }, [isActive, onComplete])

  return (
    <AnimatePresence>
      {isActive && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {confettiPieces.map((piece) => (
            <motion.div
              key={piece.id}
              className="absolute rounded-full"
              style={{
                left: piece.x,
                top: piece.y,
                backgroundColor: piece.color,
                width: piece.size,
                height: piece.size,
              }}
              initial={{ 
                opacity: 1,
                scale: 1,
                rotate: 0
              }}
              animate={{
                y: window.innerHeight + 100,
                x: piece.x + piece.velocity.x * 100,
                rotate: piece.rotation + piece.velocity.rotation * 100,
                opacity: [1, 1, 0],
                scale: [1, 1.2, 0.8]
              }}
              transition={{
                duration: 3,
                ease: "easeOut"
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  )
}

export default ConfettiAnimation
