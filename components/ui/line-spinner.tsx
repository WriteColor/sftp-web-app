'use client'

import { useEffect, useState } from 'react'

interface LineSpinnerProps {
  size?: string
  stroke?: string
  speed?: string
  color?: string
  className?: string
}

export function LineSpinner({ 
  size = '20', 
  stroke = '3', 
  speed = '1', 
  color = 'currentColor',
  className = ''
}: LineSpinnerProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    
    // Importar y registrar dinámicamente solo en el cliente
    import('ldrs').then((module) => {
      module.lineSpinner.register()
    })
  }, [])

  if (!isClient) {
    // Fallback durante SSR
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          fill={color}
          className="animate-spin"
        >
          <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" fill="none" opacity="0.25" />
          <path
            d="M12 2a10 10 0 0 1 10 10"
            stroke={color}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </div>
    )
  }

  return (
    <span className={`inline-flex items-center justify-center ${className}`}>
      <l-line-spinner size={size} stroke={stroke} speed={speed} color={color}></l-line-spinner>
    </span>
  )
}
