import React from 'react'

interface SVGBackgroundProps {
  className?: string
}

export const SVGBackground: React.FC<SVGBackgroundProps> = ({ className = '' }) => {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1200 800"
      >
        {/* Animated gradient orbs */}
        <defs>
          <radialGradient id="grad1" cx="50%" cy="50%">
            <stop offset="0%" stopColor="rgba(59, 130, 246, 0.3)" />
            <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
          </radialGradient>
          <radialGradient id="grad2" cx="50%" cy="50%">
            <stop offset="0%" stopColor="rgba(139, 92, 246, 0.3)" />
            <stop offset="100%" stopColor="rgba(139, 92, 246, 0)" />
          </radialGradient>
          <radialGradient id="grad3" cx="50%" cy="50%">
            <stop offset="0%" stopColor="rgba(236, 72, 153, 0.3)" />
            <stop offset="100%" stopColor="rgba(236, 72, 153, 0)" />
          </radialGradient>
        </defs>
        
        {/* Floating orbs */}
        <circle cx="200" cy="200" r="150" fill="url(#grad1)" opacity="0.6">
          <animate
            attributeName="cy"
            values="200;250;200"
            dur="8s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.6;0.8;0.6"
            dur="8s"
            repeatCount="indefinite"
          />
        </circle>
        
        <circle cx="1000" cy="600" r="200" fill="url(#grad2)" opacity="0.5">
          <animate
            attributeName="cy"
            values="600;550;600"
            dur="10s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.5;0.7;0.5"
            dur="10s"
            repeatCount="indefinite"
          />
        </circle>
        
        <circle cx="600" cy="100" r="120" fill="url(#grad3)" opacity="0.4">
          <animate
            attributeName="cx"
            values="600;650;600"
            dur="12s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.4;0.6;0.4"
            dur="12s"
            repeatCount="indefinite"
          />
        </circle>
        
        {/* Grid pattern */}
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path
              d="M 50 0 L 0 0 0 50"
              fill="none"
              stroke="rgba(255, 255, 255, 0.03)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>
  )
}

export default SVGBackground

