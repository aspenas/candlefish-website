'use client'

import { useEffect, useRef, useState } from 'react'

export default function HeroFishAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasFailed, setHasFailed] = useState(false)
  const fishRef = useRef<any>(null)

  useEffect(() => {
    let mounted = true
    
    async function loadAndInitFish() {
      try {
        // Dynamically import the fish system
        const { createHeroFish } = await import('../src/heroFish')
        
        if (!mounted || !canvasRef.current || !hostRef.current) return
        
        const canvas = canvasRef.current
        const host = hostRef.current
        const rect = host.getBoundingClientRect()
        
        // Set up canvas
        const width = Math.max(rect.width, 400)
        const height = Math.max(rect.height, 200)
        canvas.width = width
        canvas.height = height
        
        // Create fish animation
        const fish = await createHeroFish(canvas, {
          bounds: { x: 0, y: 0, width, height },
          enableBloom: true,
          respectReducedMotion: true,
          targetFPS: 60
        })
        
        if (!mounted) {
          fish.dispose()
          return
        }
        
        fishRef.current = fish
        setIsLoaded(true)
        
        // Start the animation
        fish.start()
        host.classList.add('visible')
        
        console.log('Fish animation loaded and started')
      } catch (error) {
        console.error('Failed to load fish animation:', error)
        setHasFailed(true)
      }
    }
    
    // Wait a bit for DOM to be ready
    const timer = setTimeout(loadAndInitFish, 100)
    
    return () => {
      mounted = false
      clearTimeout(timer)
      if (fishRef.current) {
        fishRef.current.dispose()
        fishRef.current = null
      }
    }
  }, [])

  return (
    <div 
      ref={hostRef}
      data-cf-fish-host 
      className={`hero-fish-host ${!isLoaded && !hasFailed ? 'loading' : ''} ${hasFailed ? 'fallback' : ''} ${isLoaded ? 'visible' : ''}`}
      style={{
        position: 'relative',
        width: '100%',
        height: 'clamp(180px, 25vh, 320px)',
        pointerEvents: 'none',
        overflow: 'hidden'
      }}
    >
      {hasFailed ? (
        <div 
          style={{
            width: '100%',
            height: '100%',
            backgroundImage: 'url("/img/cf-fish-fallback.svg")',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: 'contain',
            opacity: 0.3
          }}
          aria-label="Decorative fish illustration"
        />
      ) : (
        <canvas
          ref={canvasRef}
          id="hero-fish-canvas"
          aria-label="Animated candlefish swimming"
          role="img"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            display: 'block'
          }}
        />
      )}
    </div>
  )
}