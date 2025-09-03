'use client'

import { useEffect, useRef, useState } from 'react'
import { createHeroFish, type HeroFish } from '../src/heroFish'

export default function HeroFishAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fishRef = useRef<HeroFish | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasFailed, setHasFailed] = useState(false)

  useEffect(() => {
    let mounted = true

    const initFish = async () => {
      if (!canvasRef.current || !hostRef.current || fishRef.current) return

      try {
        const rect = hostRef.current.getBoundingClientRect()
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

        const fish = await createHeroFish(canvasRef.current, {
          bounds: {
            x: 0,
            y: 0,
            width: rect.width,
            height: rect.height
          },
          enableBloom: !prefersReducedMotion,
          respectReducedMotion: true,
          targetFPS: prefersReducedMotion ? 30 : 60,
          qualityTier: 1,
          particleCount: prefersReducedMotion ? 6 : 12
        })

        if (!mounted) {
          fish.dispose()
          return
        }

        fishRef.current = fish

        // Set up visibility observer
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach(entry => {
              const ratio = entry.intersectionRatio
              if (ratio >= 0.5) {
                fish.start()
                hostRef.current?.classList.add('visible')
              } else if (ratio < 0.3) {
                fish.stop()
                hostRef.current?.classList.remove('visible')
              }
            })
          },
          { threshold: [0, 0.3, 0.5, 1.0] }
        )

        observer.observe(hostRef.current)
        observerRef.current = observer

        // Set up telemetry in dev mode
        if (process.env.NODE_ENV !== 'production') {
          ;(window as any).__cfFish = fish
          
          const updateStats = () => {
            if (!fish) return
            const telemetry = fish.getTelemetry()
            const frames = telemetry.getFrameHistory()
            if (frames.length === 0) return

            const fpsSamples = frames.map(f => f.fps)
            ;(window as any).__cfFishStats = {
              fpsMin: Math.round(Math.min(...fpsSamples)),
              fpsMax: Math.round(Math.max(...fpsSamples)),
              fpsAvg: Math.round(fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length),
              droppedFrames: telemetry.getDroppedFrames(),
              qualityTier: fish.getQualityTier(),
              dpr: Math.min(2, window.devicePixelRatio || 1),
              offscreen: typeof OffscreenCanvas !== 'undefined'
            }
          }

          updateStats()
          const statsInterval = setInterval(updateStats, 5000)
          
          return () => clearInterval(statsInterval)
        }

        setIsLoading(false)
      } catch (error) {
        console.error('Hero fish initialization failed:', error)
        setHasFailed(true)
        setIsLoading(false)
      }
    }

    initFish()

    return () => {
      mounted = false
      observerRef.current?.disconnect()
      if (fishRef.current) {
        fishRef.current.dispose()
        fishRef.current = null
      }
      if (process.env.NODE_ENV !== 'production') {
        delete (window as any).__cfFish
        delete (window as any).__cfFishStats
      }
    }
  }, [])

  // Handle visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        fishRef.current?.stop()
      } else {
        fishRef.current?.start()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  return (
    <div 
      ref={hostRef}
      data-cf-fish-host 
      className={`hero-fish-host ${isLoading ? 'loading' : ''} ${hasFailed ? 'fallback' : ''}`}
      style={{
        position: 'relative',
        width: '100%',
        height: 'clamp(180px, 25vh, 320px)',
        pointerEvents: 'none',
        overflow: 'hidden',
        contain: 'paint layout'
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
            backgroundSize: 'contain'
          }}
        />
      ) : (
        <canvas
          ref={canvasRef}
          id="hero-fish-canvas"
          aria-label="Decorative animation: Candlefish glyph, idle swim."
          role="img"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            zIndex: 0
          }}
        />
      )}
    </div>
  )
}