'use client'

import { useEffect, useRef, useState, useCallback, useMemo, memo } from 'react'
import { createHeroFish, type HeroFish } from '../src/heroFish'
import { WebFishController } from '../src/heroFish/webEnhanced'
import type { Vec2, Bounds } from '../src/heroFish/types'

/**
 * Enhanced HeroFish component with advanced web platform features:
 * - Mouse interaction (hover, click, drag)
 * - Keyboard controls (arrow keys, spacebar)
 * - Scroll-based animations  
 * - WebGL shader effects
 * - Full screen support
 * - Performance optimization
 * - Browser compatibility
 */

interface WebEnhancedHeroFishProps {
  className?: string
  enableMouse?: boolean
  enableKeyboard?: boolean
  enableScroll?: boolean
  enableWebGL?: boolean
  enableFullscreen?: boolean
  bounds?: Bounds
  onInteraction?: (type: string, data: any) => void
  onPerformanceChange?: (metrics: any) => void
}

const WebEnhancedHeroFish = memo<WebEnhancedHeroFishProps>(function WebEnhancedHeroFish({
  className = '',
  enableMouse = true,
  enableKeyboard = true,
  enableScroll = true,
  enableWebGL = true,
  enableFullscreen = true,
  bounds,
  onInteraction,
  onPerformanceChange
}: WebEnhancedHeroFishProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fishRef = useRef<HeroFish | null>(null)
  const webControllerRef = useRef<WebFishController | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const rafRef = useRef<number>(0)
  
  const [isLoading, setIsLoading] = useState(true)
  const [hasFailed, setHasFailed] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [webGLSupported, setWebGLSupported] = useState(false)
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null)
  const [webState, setWebState] = useState<any>(null)

  // Detect reduced motion preference - memoized for performance
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, [])

  // Handle resize events
  const handleResize = useCallback(() => {
    if (!containerRef.current || !fishRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const newBounds = {
      x: 0,
      y: 0,
      width: rect.width,
      height: rect.height
    }
    
    fishRef.current.resize(newBounds)
  }, [])

  // Handle visibility changes for performance
  const handleVisibilityChange = useCallback(() => {
    if (!fishRef.current) return
    
    if (document.hidden) {
      fishRef.current.pause()
    } else if (isVisible) {
      fishRef.current.resume()
    }
  }, [isVisible])

  // Memoize fish configuration for performance
  const fishConfig = useMemo(() => ({
    enableBloom: enableWebGL && !prefersReducedMotion,
    respectReducedMotion: true,
    targetFPS: prefersReducedMotion ? 30 : 60,
    enableAdaptiveQuality: true,
    useOffscreenCanvas: true,
    enableTelemetry: process.env.NODE_ENV === 'development',
    pixelRatio: Math.min((typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1, 2),
    backgroundColor: '#0D1B2A'
  }), [enableWebGL, prefersReducedMotion]);

  // Memoize controller configurations for performance
  const mouseConfig = useMemo(() => ({
    enableMouseFollow: enableMouse,
    enableMouseDart: enableMouse,
    mouseRadius: 100,
    followStrength: 0.4,
    cursorHideTimeout: 2000
  }), [enableMouse]);

  const keyboardConfig = useMemo(() => ({
    enableArrowKeys: enableKeyboard,
    enableSpaceDart: enableKeyboard,
    enableFullscreenKey: enableFullscreen,
    keyForceStrength: 60
  }), [enableKeyboard, enableFullscreen]);

  const scrollConfig = useMemo(() => ({
    enableScrollAnimation: enableScroll,
    scrollInfluenceStrength: 0.3,
    enableParallax: true
  }), [enableScroll]);

  const webglConfig = useMemo(() => ({
    enableWebGL,
    shaderQuality: 'high' as const,
    enableBloom: true,
    enableGlow: true,
    bloomIntensity: 1.3,
    glowRadius: 35
  }), [enableWebGL]);

  // Initialize fish animation
  const initializeFish = useCallback(async () => {
    if (!canvasRef.current || !containerRef.current || fishRef.current) return

    try {
      setIsLoading(true)
      const rect = containerRef.current.getBoundingClientRect()
      
      // Determine bounds
      const fishBounds = bounds || {
        x: 0,
        y: 0,
        width: rect.width,
        height: rect.height
      }

      // Create fish with web-optimized settings
      const fish = await createHeroFish(canvasRef.current, {
        bounds: fishBounds,
        ...fishConfig
      })

      fishRef.current = fish

      // Create web controller for enhanced interactions
      const webController = new WebFishController(
        fish as any, // Type assertion for Fish interface
        fishBounds,
        mouseConfig,
        keyboardConfig,
        scrollConfig,
        webglConfig
      )

      webControllerRef.current = webController

      // Initialize WebGL if supported and enabled
      if (enableWebGL && canvasRef.current) {
        const glContext = webController.initializeWebGL(canvasRef.current)
        setWebGLSupported(!!glContext)
      }

      // Start web interactions
      webController.start(containerRef.current)

      // Setup intersection observer for performance
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            const visible = entry.intersectionRatio >= 0.3
            setIsVisible(visible)
            
            if (visible) {
              fish.start()
              containerRef.current?.classList.add('fish-visible')
            } else {
              fish.pause()
              containerRef.current?.classList.remove('fish-visible')
            }
          })
        },
        {
          threshold: [0, 0.1, 0.3, 0.5, 0.7, 1.0],
          rootMargin: '50px'
        }
      )

      observer.observe(containerRef.current)
      observerRef.current = observer

      // Setup performance monitoring
      if (process.env.NODE_ENV === 'development') {
        const updateMetrics = () => {
          if (fish && webController) {
            const metrics = {
              fish: fish.getMetrics(),
              web: webController.getWebState(),
              timestamp: Date.now()
            }
            
            setPerformanceMetrics(metrics)
            setWebState(metrics.web)
            
            if (onPerformanceChange) {
              onPerformanceChange(metrics)
            }
          }
        }

        const metricsInterval = setInterval(updateMetrics, 2000)
        updateMetrics() // Initial call
        
        // Store for cleanup
        ;(containerRef.current as any).__metricsInterval = metricsInterval
      }

      setIsLoading(false)
      setHasFailed(false)
      
      // Trigger interaction callback
      if (onInteraction) {
        onInteraction('initialized', {
          webGLSupported,
          capabilities: webController.getWebManager().getCapabilities()
        })
      }
      
    } catch (error) {
      console.error('Enhanced fish initialization failed:', error)
      setHasFailed(true)
      setIsLoading(false)
      
      if (onInteraction) {
        onInteraction('error', { error: error.message })
      }
    }
  }, [bounds, fishConfig, mouseConfig, keyboardConfig, scrollConfig, webglConfig, onInteraction, onPerformanceChange])

  // Cleanup function
  const cleanup = useCallback(() => {
    // Cancel animation frame
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
    }
    
    // Dispose web controller
    if (webControllerRef.current) {
      webControllerRef.current.dispose()
      webControllerRef.current = null
    }
    
    // Dispose fish
    if (fishRef.current) {
      fishRef.current.dispose()
      fishRef.current = null
    }
    
    // Disconnect observer
    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
    }
    
    // Clear intervals
    if (containerRef.current && (containerRef.current as any).__metricsInterval) {
      clearInterval((containerRef.current as any).__metricsInterval)
    }
  }, [])

  // Initialize on mount
  useEffect(() => {
    let mounted = true
    
    const init = async () => {
      if (mounted) {
        await initializeFish()
      }
    }
    
    init()
    
    return () => {
      mounted = false
      cleanup()
    }
  }, [])

  // Handle resize
  useEffect(() => {
    window.addEventListener('resize', handleResize, { passive: true })
    return () => window.removeEventListener('resize', handleResize)
  }, [handleResize])

  // Handle visibility changes
  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [handleVisibilityChange])

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFS = !!(document.fullscreenElement || 
                     (document as any).webkitFullscreenElement || 
                     (document as any).mozFullScreenElement)
      setIsFullscreen(isFS)
      
      if (onInteraction) {
        onInteraction('fullscreen', { isFullscreen: isFS })
      }
    }

    if (enableFullscreen) {
      document.addEventListener('fullscreenchange', handleFullscreenChange)
      document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.addEventListener('mozfullscreenchange', handleFullscreenChange)
      
      return () => {
        document.removeEventListener('fullscreenchange', handleFullscreenChange)
        document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
        document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
      }
    }
  }, [enableFullscreen, onInteraction])

  // Animation loop for web controller updates
  useEffect(() => {
    if (!webControllerRef.current) return
    
    let lastTime = 0
    
    const animate = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000
      lastTime = currentTime
      
      if (webControllerRef.current && isVisible) {
        webControllerRef.current.update(deltaTime)
      }
      
      rafRef.current = requestAnimationFrame(animate)
    }
    
    rafRef.current = requestAnimationFrame(animate)
    
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = 0
      }
    }
  }, [isVisible])

  // Render fallback for failed state
  if (hasFailed) {
    return (
      <div 
        className={`hero-fish-fallback ${className}`}
        style={{
          position: 'relative',
          width: '100%',
          height: 'clamp(180px, 25vh, 320px)',
          backgroundImage: 'linear-gradient(135deg, #0D1B2A 0%, #1B263B 50%, #415A77 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.6
        }}
      >
        <div style={{ 
          color: '#415A77', 
          fontSize: '0.8rem', 
          fontFamily: 'monospace',
          textAlign: 'center'
        }}>
          CANDLEFISH ANIMATION UNAVAILABLE<br />
          <small style={{ opacity: 0.7 }}>WebGL or Canvas not supported</small>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef}
      className={`web-enhanced-hero-fish ${className} ${
        isLoading ? 'loading' : ''
      } ${
        isVisible ? 'visible' : ''
      } ${
        isFullscreen ? 'fullscreen' : ''
      }`}
      style={{
        position: 'relative',
        width: '100%',
        height: isFullscreen ? '100vh' : 'clamp(180px, 25vh, 320px)',
        overflow: 'hidden',
        cursor: enableMouse ? (webState?.mouse?.cursorVisible !== false ? 'none' : 'default') : 'default',
        contain: 'layout style paint',
        willChange: 'transform, opacity',
        background: isFullscreen ? '#0D1B2A' : 'transparent'
      }}
      tabIndex={enableKeyboard ? 0 : -1}
      role="img"
      aria-label="Interactive bioluminescent fish animation. Use arrow keys to guide, spacebar to dart."
      aria-live="polite"
      data-web-enhanced
      data-webgl={webGLSupported}
      data-visible={isVisible}
      data-fullscreen={isFullscreen}
    >
      {/* Loading state */}
      {isLoading && (
        <div 
          className="fish-loading-overlay"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0D1B2A80 0%, #1B263B40 100%)',
            backdropFilter: 'blur(4px)',
            zIndex: 10
          }}
        >
          <div style={{
            color: '#3FD3C6',
            fontSize: '0.75rem',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontWeight: 300,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            animation: 'pulse 2s ease-in-out infinite'
          }}>
            Initializing Fish Animation...
          </div>
        </div>
      )}

      {/* Main canvas */}
      <canvas
        ref={canvasRef}
        className="fish-canvas"
        role="img"
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 1,
          pointerEvents: enableMouse ? 'auto' : 'none'
        }}
      />

      {/* Fullscreen toggle button */}
      {enableFullscreen && !isLoading && (
        <button
          onClick={() => {
            if (isFullscreen) {
              document.exitFullscreen?.()
            } else {
              containerRef.current?.requestFullscreen?.()
            }
          }}
          className="fullscreen-toggle"
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'rgba(63, 211, 198, 0.1)',
            border: '1px solid rgba(63, 211, 198, 0.3)',
            color: '#3FD3C6',
            padding: '8px 12px',
            fontSize: '0.7rem',
            fontFamily: 'monospace',
            cursor: 'pointer',
            zIndex: 20,
            backdropFilter: 'blur(8px)',
            borderRadius: '2px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            opacity: isVisible ? 0.7 : 0,
            transition: 'opacity 0.3s ease',
            ':hover': {
              opacity: 1,
              background: 'rgba(63, 211, 198, 0.15)'
            }
          }}
          title="Toggle fullscreen (F11 or Ctrl+F)"
        >
          {isFullscreen ? '⤓ Exit' : '⤢ Full'}
        </button>
      )}

      {/* Performance overlay for development */}
      {process.env.NODE_ENV === 'development' && performanceMetrics && (
        <div 
          className="fish-debug-overlay"
          style={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            background: 'rgba(0, 0, 0, 0.7)',
            color: '#3FD3C6',
            padding: '6px 8px',
            fontSize: '0.6rem',
            fontFamily: 'monospace',
            borderRadius: '2px',
            zIndex: 15,
            lineHeight: 1.3,
            minWidth: '200px'
          }}
        >
          <div>FPS: {performanceMetrics.fish?.fps?.toFixed(1) || 'N/A'}</div>
          <div>WebGL: {webGLSupported ? 'ON' : 'OFF'}</div>
          <div>Mouse: {webState?.mouse?.isInBounds ? 'IN' : 'OUT'}</div>
          <div>Keys: {webState?.keyboard?.pressedKeys?.size || 0}</div>
          <div>Scroll: {webState?.scroll?.isScrolling ? 'YES' : 'NO'}</div>
          <div>Tier: {performanceMetrics.fish?.qualityTier || 'T1'}</div>
        </div>
      )}

      {/* Keyboard instructions */}
      {enableKeyboard && isVisible && !isLoading && (
        <div 
          className="fish-controls-hint"
          style={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            color: 'rgba(63, 211, 198, 0.6)',
            fontSize: '0.65rem',
            fontFamily: 'system-ui, sans-serif',
            textAlign: 'right',
            lineHeight: 1.4,
            zIndex: 10,
            pointerEvents: 'none',
            opacity: webState?.keyboard?.pressedKeys?.size > 0 ? 1 : 0.5,
            transition: 'opacity 0.3s ease'
          }}
        >
          <div>↑↓←→ Guide fish</div>
          <div>SPACE Dart</div>
          {enableFullscreen && <div>F11 Fullscreen</div>}
        </div>
      )}
      
      {/* CSS for animations */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        
        .web-enhanced-hero-fish {
          transition: all 0.3s ease;
        }
        
        .web-enhanced-hero-fish.loading {
          opacity: 0.8;
        }
        
        .web-enhanced-hero-fish.visible .fish-canvas {
          opacity: 1;
        }
        
        .web-enhanced-hero-fish.fullscreen {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw !important;
          height: 100vh !important;
          z-index: 9999;
          background: #0D1B2A;
        }
        
        .fish-canvas {
          opacity: 0;
          transition: opacity 0.5s ease;
        }
        
        .fullscreen-toggle:hover {
          opacity: 1 !important;
          background: rgba(63, 211, 198, 0.15) !important;
        }
      `}</style>
    </div>
  )
});

export default WebEnhancedHeroFish;