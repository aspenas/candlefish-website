'use client'

/**
 * Enhanced HeroFish Animation Component - Mobile Optimized
 * 
 * Integrates all mobile enhancement features:
 * - Touch interaction with fish following/darting
 * - Device orientation response
 * - Haptic feedback on dart states
 * - PWA offline support
 * - Battery-aware performance scaling
 * - Cross-platform compatibility
 * - Accessibility enhancements
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { createHeroFish, type HeroFish } from '../src/heroFish'
import { MobileEnhancementManager, FishTouchController, isMobileDevice } from '../src/heroFish/mobile'
import { PWAManager } from '../src/heroFish/pwa'
import { CrossPlatformManager } from '../src/heroFish/crossPlatform'
import { AccessibilityManager, getAccessibilityPreferences } from '../src/heroFish/accessibility'
import type { Vec2 } from '../src/heroFish/types'

interface EnhancedHeroFishProps {
  // Basic configuration
  width?: number
  height?: number
  className?: string
  
  // Mobile features
  enableTouchInteraction?: boolean
  enableDeviceOrientation?: boolean
  enableHapticFeedback?: boolean
  enablePWAFeatures?: boolean
  
  // Accessibility
  enableAccessibility?: boolean
  announceStateChanges?: boolean
  
  // Performance
  adaptiveQuality?: boolean
  respectBatteryLevel?: boolean
  
  // Callbacks
  onFishStateChange?: (state: 'idle' | 'dart' | 'recover') => void
  onTouchInteraction?: (position: Vec2, type: 'follow' | 'dart') => void
  onPerformanceChange?: (level: number) => void
  
  // Development
  showDebugInfo?: boolean
}

interface MobileCapabilities {
  touch: boolean
  orientation: boolean
  haptics: boolean
  battery: boolean
  pwa: boolean
  accessibility: boolean
}

interface PerformanceMetrics {
  fps: number
  qualityTier: string
  batteryLevel: number
  networkType: string
}

export default function EnhancedHeroFish({
  width,
  height,
  className = '',
  enableTouchInteraction = true,
  enableDeviceOrientation = true,
  enableHapticFeedback = true,
  enablePWAFeatures = true,
  enableAccessibility = true,
  announceStateChanges = true,
  adaptiveQuality = true,
  respectBatteryLevel = true,
  onFishStateChange,
  onTouchInteraction,
  onPerformanceChange,
  showDebugInfo = false
}: EnhancedHeroFishProps) {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fishRef = useRef<HeroFish | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)
  
  // Enhancement managers
  const mobileManagerRef = useRef<MobileEnhancementManager | null>(null)
  const touchControllerRef = useRef<FishTouchController | null>(null)
  const pwaManagerRef = useRef<PWAManager | null>(null)
  const platformManagerRef = useRef<CrossPlatformManager | null>(null)
  const accessibilityManagerRef = useRef<AccessibilityManager | null>(null)
  
  // State
  const [isLoading, setIsLoading] = useState(true)
  const [hasFailed, setHasFailed] = useState(false)
  const [capabilities, setCapabilities] = useState<MobileCapabilities>({
    touch: false,
    orientation: false,
    haptics: false,
    battery: false,
    pwa: false,
    accessibility: false
  })
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    qualityTier: 'T1',
    batteryLevel: 1,
    networkType: 'unknown'
  })
  const [fishState, setFishState] = useState<'idle' | 'dart' | 'recover'>('idle')
  const [isPWAInstalled, setIsPWAInstalled] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>({})

  /**
   * Initialize all mobile enhancement systems
   */
  const initializeEnhancements = useCallback(async () => {
    if (!containerRef.current || !canvasRef.current) return

    try {
      const container = containerRef.current
      const canvas = canvasRef.current
      const rect = container.getBoundingClientRect()
      const bounds = { x: 0, y: 0, width: rect.width, height: rect.height }

      // Initialize cross-platform manager first
      platformManagerRef.current = new CrossPlatformManager({
        adaptToSafeArea: true,
        optimizeForWebView: true,
        enablePlatformSpecificOptimizations: true
      })

      // Get platform-optimized configuration
      const platformInfo = platformManagerRef.current.getPlatformInfo()
      const optimizations = platformManagerRef.current.getOptimizations()
      
      // Initialize mobile enhancement manager
      if (enableTouchInteraction || enableDeviceOrientation) {
        mobileManagerRef.current = new MobileEnhancementManager(bounds, {
          enableTouchFollow: enableTouchInteraction,
          enableTouchDart: enableTouchInteraction,
          touchRadius: 60,
          followStrength: 0.3
        })

        // Set up mobile callbacks
        mobileManagerRef.current.onPerformance((level) => {
          if (onPerformanceChange) {
            onPerformanceChange(level)
          }
          setPerformanceMetrics(prev => ({ ...prev, batteryLevel: level }))
        })
      }

      // Initialize PWA manager
      if (enablePWAFeatures) {
        pwaManagerRef.current = new PWAManager({
          enableOfflineMode: true,
          persistFishState: true,
          offlineQualityTier: 'T3'
        })

        // Check PWA installation status
        const installState = pwaManagerRef.current.getInstallState()
        setIsPWAInstalled(installState.isInstalled)

        // Set up PWA callbacks
        pwaManagerRef.current.onNetworkStatusChange((status) => {
          setPerformanceMetrics(prev => ({ 
            ...prev, 
            networkType: status.effectiveType 
          }))
        })
      }

      // Initialize accessibility manager
      if (enableAccessibility) {
        accessibilityManagerRef.current = new AccessibilityManager(container, canvas, {
          enableScreenReader: true,
          enableSoundEffects: !getAccessibilityPreferences().reducedMotion,
          enableHapticFeedback: enableHapticFeedback,
          respectReducedMotion: true,
          announceStateChanges: announceStateChanges,
          minTouchTargetSize: 48
        })

        // Register main canvas as touch target
        accessibilityManagerRef.current.registerTouchTarget(
          'fish-canvas',
          canvas,
          'Interactive bioluminescent fish animation',
          'img',
          true
        )
      }

      // Create fish with platform optimizations
      const fishConfig = {
        bounds: platformManagerRef.current.getSafeBounds(),
        enableBloom: optimizations.enableBloom,
        targetFPS: optimizations.frameRateTarget,
        qualityTier: adaptiveQuality ? optimizations.qualityTier : 'T1',
        particleCount: optimizations.particleCount,
        fishConfig: {
          idleSpeed: optimizations.frameRateTarget > 30 ? 30 : 20,
          dartSpeed: optimizations.frameRateTarget > 30 ? 200 : 150
        }
      }

      fishRef.current = await createHeroFish(canvas, fishConfig)

      // Apply platform optimizations
      platformManagerRef.current.applyPlatformOptimizations(fishRef.current)

      // Initialize touch controller if mobile features enabled
      if (mobileManagerRef.current && fishRef.current) {
        touchControllerRef.current = new FishTouchController(
          fishRef.current,
          bounds,
          {
            enableTouchFollow: enableTouchInteraction,
            enableTouchDart: enableTouchInteraction
          }
        )

        // Start mobile interactions
        touchControllerRef.current.start(container)

        // Set up touch callback
        mobileManagerRef.current.onTouch((position, type) => {
          if (onTouchInteraction) {
            onTouchInteraction(position, type)
          }

          // Announce to screen reader
          if (accessibilityManagerRef.current) {
            const message = type === 'dart' 
              ? 'Fish darting to new location' 
              : 'Fish following your touch'
            accessibilityManagerRef.current.announceToScreenReader(message, 'polite')
          }
        })
      }

      // Update capabilities state
      setCapabilities({
        touch: platformInfo.isMobile && 'ontouchstart' in window,
        orientation: 'DeviceOrientationEvent' in window,
        haptics: 'vibrate' in navigator,
        battery: 'getBattery' in navigator,
        pwa: 'serviceWorker' in navigator,
        accessibility: enableAccessibility
      })

      console.log('Enhanced HeroFish initialized with capabilities:', capabilities)

    } catch (error) {
      console.error('Enhanced HeroFish initialization failed:', error)
      setHasFailed(true)
    }
  }, [
    enableTouchInteraction,
    enableDeviceOrientation, 
    enableHapticFeedback,
    enablePWAFeatures,
    enableAccessibility,
    announceStateChanges,
    adaptiveQuality,
    onPerformanceChange,
    onTouchInteraction
  ])

  /**
   * Update fish state and performance metrics
   */
  const updateMetrics = useCallback(() => {
    if (!fishRef.current) return

    try {
      const status = fishRef.current.getStatus()
      const newState = status.fishState

      // Update fish state
      if (newState !== fishState) {
        setFishState(newState)
        if (onFishStateChange) {
          onFishStateChange(newState)
        }

        // Update accessibility
        if (accessibilityManagerRef.current) {
          accessibilityManagerRef.current.updateFishState(fishRef.current)
        }
      }

      // Update performance metrics
      setPerformanceMetrics(prev => ({
        ...prev,
        fps: Math.round(status.performance.fps),
        qualityTier: status.qualityTier
      }))

      // Update debug info
      if (showDebugInfo) {
        setDebugInfo({
          platform: platformManagerRef.current?.getPlatformInfo(),
          optimizations: platformManagerRef.current?.getOptimizations(),
          mobileCapabilities: mobileManagerRef.current?.getCapabilities(),
          performanceLevel: mobileManagerRef.current?.getPerformanceLevel(),
          accessibilityState: accessibilityManagerRef.current?.getAccessibilityState(),
          networkStatus: pwaManagerRef.current?.getNetworkStatus()
        })
      }

      // Update touch controller
      if (touchControllerRef.current) {
        touchControllerRef.current.update(1/60) // Assume 60 FPS for updates
      }

    } catch (error) {
      console.warn('Metrics update failed:', error)
    }
  }, [fishState, onFishStateChange, showDebugInfo])

  // Main initialization effect
  useEffect(() => {
    let mounted = true

    const initFish = async () => {
      if (!containerRef.current || !canvasRef.current || fishRef.current) return

      try {
        setIsLoading(true)
        
        await initializeEnhancements()
        
        if (!mounted) {
          // Clean up if component unmounted during initialization
          fishRef.current?.dispose()
          return
        }

        // Set up intersection observer for visibility
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach(entry => {
              const ratio = entry.intersectionRatio
              if (ratio >= 0.5) {
                fishRef.current?.start()
                containerRef.current?.classList.add('visible')
              } else if (ratio < 0.3) {
                fishRef.current?.stop()
                containerRef.current?.classList.remove('visible')
              }
            })
          },
          { threshold: [0, 0.3, 0.5, 1.0] }
        )

        if (containerRef.current) {
          observer.observe(containerRef.current)
          observerRef.current = observer
        }

        // Set up performance monitoring
        const metricsInterval = setInterval(updateMetrics, 1000)

        // Store cleanup function
        const cleanup = () => {
          clearInterval(metricsInterval)
          observer.disconnect()
        }

        // Attach cleanup to ref for access in cleanup effect
        ;(containerRef.current as any).__cleanup = cleanup

        setIsLoading(false)
      } catch (error) {
        console.error('Fish initialization failed:', error)
        setHasFailed(true)
        setIsLoading(false)
      }
    }

    initFish()

    return () => {
      mounted = false
    }
  }, [initializeEnhancements, updateMetrics])

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

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Clean up all managers
      touchControllerRef.current?.dispose()
      mobileManagerRef.current?.dispose()
      pwaManagerRef.current?.dispose()
      platformManagerRef.current?.dispose()
      accessibilityManagerRef.current?.dispose()
      
      // Clean up fish and observer
      observerRef.current?.disconnect()
      fishRef.current?.dispose()
      
      // Run container cleanup if available
      const container = containerRef.current as any
      if (container?.__cleanup) {
        container.__cleanup()
      }
    }
  }, [])

  // Get container classes
  const containerClasses = [
    'enhanced-hero-fish-host',
    'fish-container', // For safe area CSS
    className,
    isLoading ? 'loading' : '',
    hasFailed ? 'fallback' : '',
    capabilities.touch ? 'touch-enabled' : '',
    isPWAInstalled ? 'pwa-installed' : ''
  ].filter(Boolean).join(' ')

  return (
    <div 
      ref={containerRef}
      className={containerClasses}
      style={{
        position: 'relative',
        width: width ? `${width}px` : '100%',
        height: height ? `${height}px` : 'clamp(180px, 25vh, 320px)',
        overflow: 'hidden',
        contain: 'paint layout',
        touchAction: capabilities.touch ? 'none' : 'auto',
        userSelect: 'none'
      }}
      role="img"
      aria-label="Interactive bioluminescent fish animation"
      tabIndex={0}
    >
      {/* Loading state */}
      {isLoading && (
        <div className="loading-indicator" style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#666',
          fontSize: '14px'
        }}>
          Loading fish animation...
        </div>
      )}

      {/* Error fallback */}
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
          role="img"
          aria-label="Static fish illustration (animation unavailable)"
        />
      ) : (
        <>
          {/* Main canvas */}
          <canvas
            ref={canvasRef}
            id="enhanced-hero-fish-canvas"
            aria-label={`Bioluminescent fish animation - currently ${fishState}`}
            role="img"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              zIndex: 0
            }}
          />

          {/* Mobile capabilities indicator */}
          {capabilities.touch && (
            <div 
              className="touch-indicator"
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                opacity: 0.3,
                fontSize: '12px',
                pointerEvents: 'none'
              }}
            >
              Touch enabled
            </div>
          )}

          {/* PWA install prompt */}
          {enablePWAFeatures && !isPWAInstalled && capabilities.pwa && (
            <button
              onClick={async () => {
                if (pwaManagerRef.current) {
                  const success = await pwaManagerRef.current.promptInstall()
                  if (success) {
                    setIsPWAInstalled(true)
                  }
                }
              }}
              style={{
                position: 'absolute',
                bottom: '8px',
                right: '8px',
                background: 'rgba(0,0,0,0.7)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '6px 12px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
              aria-label="Install fish animation app"
            >
              Install App
            </button>
          )}

          {/* Performance metrics (debug mode) */}
          {showDebugInfo && (
            <div
              className="debug-info"
              style={{
                position: 'absolute',
                top: '8px',
                left: '8px',
                background: 'rgba(0,0,0,0.8)',
                color: 'white',
                padding: '8px',
                fontSize: '10px',
                fontFamily: 'monospace',
                borderRadius: '4px',
                maxWidth: '200px',
                pointerEvents: 'none'
              }}
            >
              <div>FPS: {performanceMetrics.fps}</div>
              <div>Quality: {performanceMetrics.qualityTier}</div>
              <div>State: {fishState}</div>
              <div>Battery: {Math.round(performanceMetrics.batteryLevel * 100)}%</div>
              <div>Network: {performanceMetrics.networkType}</div>
              <div>Platform: {debugInfo.platform?.platform || 'web'}</div>
              <div>Touch: {capabilities.touch ? 'Yes' : 'No'}</div>
              <div>Haptics: {capabilities.haptics ? 'Yes' : 'No'}</div>
            </div>
          )}
        </>
      )}

      {/* Accessibility styles */}
      <style jsx>{`
        .enhanced-hero-fish-host {
          --fish-focus-color: #4A90E2;
          --fish-error-color: #E74C3C;
        }
        
        .enhanced-hero-fish-host:focus {
          outline: 2px solid var(--fish-focus-color);
          outline-offset: 2px;
        }
        
        .enhanced-hero-fish-host.loading {
          background: linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%);
          background-size: 200% 100%;
          animation: loading-shimmer 2s infinite;
        }
        
        @keyframes loading-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        
        .enhanced-hero-fish-host.fallback {
          border: 1px solid var(--fish-error-color);
          background-color: rgba(231, 76, 60, 0.1);
        }
        
        @media (prefers-reduced-motion: reduce) {
          .enhanced-hero-fish-host.loading {
            animation: none;
            background: rgba(255,255,255,0.1);
          }
        }
        
        @media (prefers-contrast: high) {
          .enhanced-hero-fish-host:focus {
            outline: 3px solid #000000;
            outline-offset: 3px;
          }
        }
        
        @media (max-width: 768px) {
          .enhanced-hero-fish-host {
            min-height: 200px;
          }
        }
      `}</style>
    </div>
  )
}