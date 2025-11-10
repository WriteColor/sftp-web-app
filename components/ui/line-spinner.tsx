'use client'

import { useEffect, useState } from 'react'

interface LineSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | string
  stroke?: string
  speed?: string
  color?: string
  className?: string
}

// Mapeo de tamaños predefinidos a valores numéricos
const sizeMap: Record<string, number> = {
  sm: 20,
  md: 32,
  lg: 48,
}

// Mapeo de colores comunes a valores CSS
const colorMap: Record<string, string> = {
  primary: 'oklch(0.6 0.15 250)', // Color primary del tema
  white: '#ffffff',
  black: '#000000',
  currentColor: 'currentColor',
}

export function LineSpinner({ 
  size = 'md', 
  stroke = '3', 
  speed = '1', 
  color = 'currentColor',
  className = ''
}: LineSpinnerProps) {
  const [isClient, setIsClient] = useState(false)

  // Convertir size a número
  const numericSize = typeof size === 'string' && size in sizeMap 
    ? sizeMap[size] 
    : typeof size === 'string' && !isNaN(Number(size))
    ? Number(size)
    : sizeMap.md

  // Convertir color a valor CSS válido
  const cssColor = color in colorMap ? colorMap[color] : color

  useEffect(() => {
    setIsClient(true)
    
    // Importar y registrar dinámicamente solo en el cliente
    import('ldrs').then((module) => {
      module.lineSpinner.register()
    }).catch((error) => {
    })
  }, [])

  if (!isClient) {
    // Fallback durante SSR
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        <svg
          width={numericSize}
          height={numericSize}
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          fill={cssColor}
          className="animate-spin"
        >
          <circle cx="12" cy="12" r="10" stroke={cssColor} strokeWidth="2" fill="none" opacity="0.25" />
          <path
            d="M12 2a10 10 0 0 1 10 10"
            stroke={cssColor}
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
      <l-line-spinner size={numericSize.toString()} stroke={stroke} speed={speed} color={cssColor}></l-line-spinner>
    </span>
  )
}
