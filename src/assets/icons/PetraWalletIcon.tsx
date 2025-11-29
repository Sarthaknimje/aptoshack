import React from 'react'

interface PetraWalletIconProps {
  className?: string
  size?: number
}

export const PetraWalletIcon: React.FC<PetraWalletIconProps> = ({ 
  className = "w-6 h-6", 
  size = 24 
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="petra-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00D4AA" />
          <stop offset="100%" stopColor="#00A8CC" />
        </linearGradient>
      </defs>
      <rect
        x="2"
        y="4"
        width="20"
        height="16"
        rx="3"
        fill="url(#petra-gradient)"
      />
      <path
        d="M6 8h8v2H6V8zm0 4h6v2H6v-2z"
        fill="white"
      />
      <circle
        cx="18"
        cy="10"
        r="2"
        fill="white"
      />
    </svg>
  )
}
