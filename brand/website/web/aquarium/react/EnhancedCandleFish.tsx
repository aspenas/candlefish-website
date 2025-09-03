'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { CandlefishEngine } from '../candlefish'
import { AnimationErrorBoundary } from '../../../components/errors/AnimationErrorBoundary'
import { PerformanceMonitor } from '../../../components/performance/PerformanceMonitor'
import { FPSCounter } from '../../../components/performance/FPSCounter'
import { ABTestWrapper, useABTest } from '../../../components/testing/ABTestWrapper'
import { useAnimationConfig } from '../../../hooks/useAnimationConfig'
import { useAnimationAnalytics } from '../../../hooks/useAnimationAnalytics'
import { useFeatureFlags } from '../../../hooks/useFeatureFlags'
import { AnimationConfig } from '../../../types/animation'

interface EnhancedCandleFishProps {
  animationId: string
  height?: number
  className?: string
  disabled?: boolean
  static?: boolean
  'aria-label'?: string
  userId?: string
  // Performance monitoring
  showPerformanceMonitor?: boolean
  showFPSCounter?: boolean
  // A/B testing
  enableABTesting?: boolean
  abTestId?: string
  // Development/debug features
  showDebugInfo?: boolean
  enableConfigSync?: boolean
}

// Core animation component
const CandleFishCore: React.FC<EnhancedCandleFishProps> = ({
  animationId,
  height = 220,
  className = '',
  disabled = false,
  static: isStatic = false,
  'aria-label': ariaLabel = 'Animated bioluminescent candlefish swimming',
  userId,
  showPerformanceMonitor = false,
  showFPSCounter = false,
  showDebugInfo = false,
  enableConfigSync = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<CandlefishEngine | null>(null)
  const [showFallback, setShowFallback] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [viewStartTime, setViewStartTime] = useState<number | null>(null)

  // Hooks
  const { config, loading: configLoading } = useAnimationConfig(animationId)
  const { trackView, trackInteraction, trackError } = useAnimationAnalytics(animationId, userId)
  const { isEnabled } = useFeatureFlags({ userId })
  const { activeVariant } = useABTest()

  // Apply configuration to engine
  const applyConfigToEngine = useCallback((engine: CandlefishEngine, animationConfig: AnimationConfig) => {
    if (!engine || !animationConfig) return

    try {
      // Update engine with new configuration
      // Note: This would require extending CandlefishEngine to support runtime config updates
      // For now, we'll recreate the engine if config changes significantly
      
      // Apply performance settings
      if (animationConfig.performance.qualityLevel === 'low') {
        // Reduce quality for better performance
      } else if (animationConfig.performance.qualityLevel === 'high') {
        // Increase quality
      }

      console.log('Applied configuration to engine:', animationConfig)
    } catch (error) {
      console.error('Failed to apply configuration:', error)
      trackError(error instanceof Error ? error : new Error('Config apply failed'))
    }
  }, [trackError])

  // Initialize engine with error handling
  const initializeEngine = useCallback(async () => {
    if (!canvasRef.current || showFallback) return

    try {
      // Check feature flags
      const animationEnabled = isEnabled(`animation_${animationId}`, true)
      if (!animationEnabled) {
        setShowFallback(true)
        return
      }

      // Check for reduced motion preference
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (disabled || isStatic || prefersReducedMotion) {
        setShowFallback(true)
        return
      }

      // Create engine
      engineRef.current = new CandlefishEngine(canvasRef.current)
      
      // Apply configuration if available
      if (config && enableConfigSync) {
        applyConfigToEngine(engineRef.current, config)
      }

      // Set up intersection observer
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const wasVisible = isVisible
            const nowVisible = entry.isIntersecting
            
            setIsVisible(nowVisible)
            
            if (nowVisible && !wasVisible) {
              setViewStartTime(Date.now())
            } else if (!nowVisible && wasVisible && viewStartTime) {
              const duration = Date.now() - viewStartTime
              trackView(duration, activeVariant || undefined)
              setViewStartTime(null)
            }
          })
        },
        { threshold: 0.1 }
      )

      if (canvasRef.current) {
        canvasRef.current.setAttribute('data-animation-id', animationId)
        observer.observe(canvasRef.current)
      }

      return () => {
        observer.disconnect()
        if (engineRef.current) {
          engineRef.current.destroy()
          engineRef.current = null
        }
      }
    } catch (error) {
      console.error('Failed to initialize candlefish:', error)
      trackError(error instanceof Error ? error : new Error('Engine initialization failed'))
      setShowFallback(true)
    }
  }, [
    animationId, 
    disabled, 
    isStatic, 
    showFallback, 
    isEnabled, 
    config, 
    enableConfigSync, 
    applyConfigToEngine, 
    isVisible, 
    viewStartTime, 
    trackView, 
    trackError, 
    activeVariant
  ])

  // Handle canvas interactions
  const handleCanvasInteraction = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const position = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    }

    trackInteraction(
      position,
      event.type === 'click' ? position : undefined,
      activeVariant || undefined
    )
  }, [trackInteraction, activeVariant])

  // Engine lifecycle
  useEffect(() => {
    const cleanup = initializeEngine()
    return () => {
      if (cleanup instanceof Function) cleanup()
    }
  }, [initializeEngine])

  useEffect(() => {
    if (!engineRef.current) return

    if (isVisible) {
      engineRef.current.start()
    } else {
      engineRef.current.stop()
    }
  }, [isVisible])

  // Visibility change handling
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!engineRef.current) return

      if (document.hidden) {
        engineRef.current.stop()
        if (viewStartTime) {
          const duration = Date.now() - viewStartTime
          trackView(duration, activeVariant || undefined)
          setViewStartTime(null)
        }
      } else if (isVisible) {
        engineRef.current.start()
        setViewStartTime(Date.now())
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isVisible, viewStartTime, trackView, activeVariant])

  // Configuration sync
  useEffect(() => {
    if (engineRef.current && config && enableConfigSync) {
      applyConfigToEngine(engineRef.current, config)
    }
  }, [config, enableConfigSync, applyConfigToEngine])

  const getHeight = () => {
    if (config?.responsive) {
      const isMobile = window.innerWidth < 768
      return isMobile ? config.responsive.mobileHeight : config.responsive.desktopHeight
    }
    return Math.min(170, height) // Mobile fallback
  }

  const effectiveHeight = getHeight()

  if (configLoading) {
    return (
      <div
        className={`candlefish-container ${className}`}
        style={{
          width: '100%',
          height: `${effectiveHeight}px`,
          background: '#3A3A60',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}
      >
        <div className="animate-pulse text-[#FFB347] text-sm">Loading animation...</div>
      </div>
    )
  }

  if (showFallback || (config && !config.enabled)) {
    return (
      <div
        className={`candlefish-container ${className}`}
        style={{
          width: '100%',
          height: `${effectiveHeight}px`,
          background: config?.colors?.background || '#3A3A60',
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
            filter: `drop-shadow(0 0 20px ${config?.colors?.primary || '#FFB347'})`
          }}
        />
      </div>
    )
  }

  return (
    <div
      className={`candlefish-container relative ${className}`}
      style={{
        width: '100%',
        height: `${effectiveHeight}px`,
        background: config?.colors?.background || '#3A3A60',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <canvas
        ref={canvasRef}
        aria-label={ariaLabel}
        onClick={handleCanvasInteraction}
        onMouseMove={handleCanvasInteraction}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          cursor: 'crosshair'
        }}
      />
      
      {/* Performance monitoring */}
      {showPerformanceMonitor && (
        <PerformanceMonitor
          animationId={animationId}
          showVisualIndicators={showDebugInfo}
          onAlert={(alert) => {
            console.warn('Performance alert:', alert)
            if (alert.severity === 'high') {
              trackError(new Error(`Performance: ${alert.message}`))
            }
          }}
        />
      )}
      
      {/* FPS counter */}
      {showFPSCounter && (
        <div className="absolute top-2 left-2">
          <FPSCounter showDetailed={showDebugInfo} />
        </div>
      )}
      
      {/* Debug info */}
      {showDebugInfo && (
        <div className="absolute top-2 right-2 bg-black/80 p-2 rounded text-xs text-white font-mono max-w-xs">
          <div>Animation ID: {animationId}</div>
          <div>Variant: {activeVariant || 'control'}</div>
          <div>Config: {config ? 'loaded' : 'loading'}</div>
          <div>Visible: {isVisible ? 'yes' : 'no'}</div>
          {config && (
            <>
              <div>Speed: {config.speed}</div>
              <div>Quality: {config.performance.qualityLevel}</div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// Main enhanced component with A/B testing wrapper
export const EnhancedCandleFish: React.FC<EnhancedCandleFishProps> = (props) => {
  const {
    enableABTesting = false,
    abTestId = `candlefish_${props.animationId}`,
    ...coreProps
  } = props

  const fallbackComponent = (
    <div
      className={`candlefish-container ${props.className || ''}`}
      style={{
        width: '100%',
        height: `${props.height || 220}px`,
        background: '#3A3A60',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div className="text-[#415A77] text-sm">Animation unavailable</div>
    </div>
  )

  const CoreComponent = (
    <AnimationErrorBoundary
      fallback={fallbackComponent}
      onError={(error, errorInfo) => {
        console.error('Candlefish animation error:', error, errorInfo)
        // Could send to error tracking service here
      }}
    >
      <CandleFishCore {...coreProps} />
    </AnimationErrorBoundary>
  )

  if (enableABTesting) {
    return (
      <ABTestWrapper
        testId={abTestId}
        userId={props.userId}
        fallback={fallbackComponent}
        onVariantAssigned={(variant) => {
          console.log(`A/B test variant assigned: ${variant}`)
        }}
      >
        {CoreComponent}
      </ABTestWrapper>
    )
  }

  return CoreComponent
}

export default EnhancedCandleFish