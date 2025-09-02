'use client'

import React, { useEffect, useRef, useState } from 'react'
import { CandlefishEngine } from '../candlefish'

interface CandleFishProps {
  height?: number
  className?: string
  disabled?: boolean
  static?: boolean
  'aria-label'?: string
}

export const CandleFish: React.FC<CandleFishProps> = ({
  height = 220,
  className = '',
  disabled = false,
  static: isStatic = false,
  'aria-label': ariaLabel = 'Animated bioluminescent candlefish swimming'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<CandlefishEngine | null>(null)
  const [showFallback, setShowFallback] = useState(true) // Start with fallback for SSR
  const [isVisible, setIsVisible] = useState(false)
  const [isClient, setIsClient] = useState(false)
  
  // Hydration effect - runs only on client
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  useEffect(() => {
    if (!isClient) return // Don't run during SSR
    
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const shouldShowStatic = disabled || isStatic || prefersReducedMotion
    
    if (shouldShowStatic) {
      setShowFallback(true)
      return
    }
    
    // Only try to initialize canvas on client side
    const timer = setTimeout(() => {
      if (!canvasRef.current) return
      
      try {
        engineRef.current = new CandlefishEngine(canvasRef.current)
        setShowFallback(false) // Switch to canvas after successful init
        
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              setIsVisible(entry.isIntersecting)
            })
          },
          { threshold: 0.1 }
        )
        
        observer.observe(canvasRef.current)
        
        return () => {
          observer.disconnect()
          if (engineRef.current) {
            engineRef.current.destroy()
            engineRef.current = null
          }
        }
      } catch (error) {
        console.error('Failed to initialize candlefish:', error)
        setShowFallback(true)
      }
    }, 100) // Small delay to ensure DOM is ready
    
    return () => clearTimeout(timer)
  }, [disabled, isStatic, isClient])
  
  useEffect(() => {
    if (!engineRef.current) return
    
    if (isVisible) {
      engineRef.current.start()
    } else {
      engineRef.current.stop()
    }
  }, [isVisible])
  
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!engineRef.current) return
      
      if (document.hidden) {
        engineRef.current.stop()
      } else if (isVisible) {
        engineRef.current.start()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isVisible])
  
  const mobileHeight = Math.min(170, height)
  
  if (showFallback) {
    return (
      <div
        className={`candlefish-container ${className}`}
        style={{
          width: '100%',
          height: `${height}px`,
          background: '#3A3A60',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <img
          src="/img/candlefish-static.svg"
          alt="Candlefish logo"
          style={{
            width: 'auto',
            height: '60%',
            maxWidth: '90%',
            opacity: 0.8,
            filter: 'drop-shadow(0 0 20px #FFB347)'
          }}
        />
      </div>
    )
  }
  
  return (
    <div
      className={`candlefish-container ${className}`}
      style={{
        width: '100%',
        height: `${height}px`,
        background: '#3A3A60',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <canvas
        ref={canvasRef}
        aria-label={ariaLabel}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          cursor: 'crosshair'
        }}
      />
      <style jsx>{`
        @media (max-width: 768px) {
          .candlefish-container {
            height: ${mobileHeight}px !important;
          }
        }
      `}</style>
    </div>
  )
}

export default CandleFish