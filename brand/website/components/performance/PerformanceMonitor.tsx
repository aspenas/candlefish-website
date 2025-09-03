'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { PerformanceMetrics, PerformanceAlert, PerformanceMonitorProps } from '../../types/animation'
import { useAnimationAnalytics } from '../../hooks/useAnimationAnalytics'

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  animationId,
  onAlert,
  showVisualIndicators = true
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    frameTime: 0,
    memoryUsage: 0,
    timestamp: Date.now()
  })
  
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([])
  const [isVisible, setIsVisible] = useState(false)
  const { trackPerformance } = useAnimationAnalytics(animationId)
  
  const metricsHistory = useRef<PerformanceMetrics[]>([])
  const frameCount = useRef(0)
  const lastFrameTime = useRef(performance.now())
  const animationFrameId = useRef<number>()
  
  const MAX_HISTORY = 60 // Keep last 60 measurements (1 minute at 1Hz)
  const ALERT_THRESHOLDS = {
    LOW_FPS: 30,
    HIGH_FRAME_TIME: 33.33, // > 30fps
    MEMORY_LEAK_THRESHOLD: 50 * 1024 * 1024 // 50MB increase
  }

  const measurePerformance = useCallback(() => {
    const now = performance.now()
    const frameTime = now - lastFrameTime.current
    lastFrameTime.current = now
    
    frameCount.current++
    
    // Calculate FPS based on frame time
    const fps = frameTime > 0 ? Math.min(1000 / frameTime, 120) : 0
    
    // Get memory usage (if available)
    const memoryUsage = (performance as any).memory?.usedJSHeapSize || 0
    
    const newMetrics: PerformanceMetrics = {
      fps: Math.round(fps),
      frameTime: Math.round(frameTime * 100) / 100,
      memoryUsage,
      timestamp: Date.now()
    }
    
    setMetrics(newMetrics)
    
    // Add to history
    metricsHistory.current.push(newMetrics)
    if (metricsHistory.current.length > MAX_HISTORY) {
      metricsHistory.current.shift()
    }
    
    // Check for alerts
    checkForAlerts(newMetrics)
    
    // Track performance analytics every 5 seconds
    if (frameCount.current % 300 === 0) { // ~5 seconds at 60fps
      trackPerformance(newMetrics)
    }
    
    animationFrameId.current = requestAnimationFrame(measurePerformance)
  }, [trackPerformance])

  const checkForAlerts = useCallback((currentMetrics: PerformanceMetrics) => {
    const newAlerts: PerformanceAlert[] = []
    
    // FPS drop alert
    if (currentMetrics.fps < ALERT_THRESHOLDS.LOW_FPS) {
      newAlerts.push({
        type: 'fps_drop',
        message: `Low FPS detected: ${currentMetrics.fps}fps`,
        severity: currentMetrics.fps < 15 ? 'high' : 'medium',
        timestamp: Date.now(),
        metrics: currentMetrics
      })
    }
    
    // Frame time alert
    if (currentMetrics.frameTime > ALERT_THRESHOLDS.HIGH_FRAME_TIME) {
      newAlerts.push({
        type: 'fps_drop',
        message: `High frame time: ${currentMetrics.frameTime}ms`,
        severity: currentMetrics.frameTime > 50 ? 'high' : 'medium',
        timestamp: Date.now(),
        metrics: currentMetrics
      })
    }
    
    // Memory leak detection
    if (metricsHistory.current.length >= 10) {
      const oldestMemory = metricsHistory.current[0].memoryUsage
      const memoryIncrease = currentMetrics.memoryUsage - oldestMemory
      
      if (memoryIncrease > ALERT_THRESHOLDS.MEMORY_LEAK_THRESHOLD) {
        newAlerts.push({
          type: 'memory_leak',
          message: `Potential memory leak: +${(memoryIncrease / 1024 / 1024).toFixed(1)}MB`,
          severity: 'high',
          timestamp: Date.now(),
          metrics: currentMetrics
        })
      }
    }
    
    if (newAlerts.length > 0) {
      setAlerts(prev => [...prev, ...newAlerts].slice(-10)) // Keep last 10 alerts
      newAlerts.forEach(alert => onAlert?.(alert))
    }
  }, [onAlert])

  const getPerformanceStatus = useCallback(() => {
    if (metrics.fps >= 55) return { status: 'excellent', color: '#22c55e' }
    if (metrics.fps >= 40) return { status: 'good', color: '#3FD3C6' }
    if (metrics.fps >= 25) return { status: 'fair', color: '#f59e0b' }
    return { status: 'poor', color: '#ef4444' }
  }, [metrics.fps])

  const getAverageMetrics = useCallback(() => {
    if (metricsHistory.current.length === 0) return null
    
    const history = metricsHistory.current.slice(-30) // Last 30 measurements
    const avgFps = history.reduce((sum, m) => sum + m.fps, 0) / history.length
    const avgFrameTime = history.reduce((sum, m) => sum + m.frameTime, 0) / history.length
    
    return {
      avgFps: Math.round(avgFps),
      avgFrameTime: Math.round(avgFrameTime * 100) / 100
    }
  }, [])

  const clearAlerts = useCallback(() => {
    setAlerts([])
  }, [])

  // Start/stop monitoring based on visibility
  useEffect(() => {
    if (isVisible) {
      lastFrameTime.current = performance.now()
      measurePerformance()
    } else {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current)
      }
    }
    
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current)
      }
    }
  }, [isVisible, measurePerformance])

  // Visibility observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          setIsVisible(entry.isIntersecting)
        })
      },
      { threshold: 0.1 }
    )

    const element = document.querySelector(`[data-animation-id="${animationId}"]`)
    if (element) {
      observer.observe(element)
    }

    return () => observer.disconnect()
  }, [animationId])

  if (!showVisualIndicators) {
    return null // Run in background only
  }

  const performanceStatus = getPerformanceStatus()
  const averages = getAverageMetrics()

  return (
    <>
      {/* Performance Indicator */}
      <div className="fixed bottom-4 right-4 z-50 bg-black/80 backdrop-blur-sm rounded-lg p-3 min-w-[200px] text-xs font-mono">
        <div className="flex items-center gap-2 mb-2">
          <div 
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: performanceStatus.color }}
          />
          <span className="text-white font-medium">Performance</span>
        </div>
        
        <div className="space-y-1 text-gray-300">
          <div className="flex justify-between">
            <span>FPS:</span>
            <span style={{ color: performanceStatus.color }}>
              {metrics.fps}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Frame:</span>
            <span>{metrics.frameTime}ms</span>
          </div>
          {metrics.memoryUsage > 0 && (
            <div className="flex justify-between">
              <span>Memory:</span>
              <span>{(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB</span>
            </div>
          )}
          {averages && (
            <div className="pt-1 border-t border-gray-600">
              <div className="flex justify-between">
                <span>Avg FPS:</span>
                <span>{averages.avgFps}</span>
              </div>
            </div>
          )}
        </div>
        
        {alerts.length > 0 && (
          <button
            onClick={clearAlerts}
            className="mt-2 w-full text-center bg-red-600/20 text-red-300 py-1 rounded text-xs hover:bg-red-600/30 transition-colors"
          >
            {alerts.length} Alert{alerts.length !== 1 ? 's' : ''} - Clear
          </button>
        )}
      </div>

      {/* Alert Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
        {alerts.slice(-3).map((alert, index) => (
          <div
            key={`${alert.timestamp}-${index}`}
            className={`
              bg-black/90 backdrop-blur-sm rounded-lg p-4 text-sm
              border-l-4 ${
                alert.severity === 'high' 
                  ? 'border-red-500 text-red-300' 
                  : alert.severity === 'medium'
                  ? 'border-yellow-500 text-yellow-300'
                  : 'border-blue-500 text-blue-300'
              }
              animate-slide-in-right
            `}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium mb-1 capitalize">
                  {alert.type.replace('_', ' ')}
                </div>
                <div className="text-xs text-gray-300">
                  {alert.message}
                </div>
              </div>
              <button
                onClick={() => setAlerts(prev => prev.filter((_, i) => i !== alerts.indexOf(alert)))}
                className="text-gray-400 hover:text-white text-lg leading-none"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </>
  )
}