'use client'

import { useEffect, useRef } from 'react'

interface PerformanceMetrics {
  componentName: string
  renderTime: number
  memoryUsage?: number
  timestamp: number
}

interface UsePerformanceMonitorOptions {
  componentName: string
  enableMemoryTracking?: boolean
  logThreshold?: number // Only log if render time exceeds this (ms)
  onMetrics?: (metrics: PerformanceMetrics) => void
}

export const usePerformanceMonitor = (options: UsePerformanceMonitorOptions) => {
  const {
    componentName,
    enableMemoryTracking = false,
    logThreshold = 16, // 60fps = ~16.67ms per frame
    onMetrics
  } = options

  const renderStartRef = useRef<number>()
  const mountTimeRef = useRef<number>()

  // Track component mount time
  useEffect(() => {
    mountTimeRef.current = performance.now()
    
    return () => {
      // Component unmount cleanup
      if (process.env.NODE_ENV === 'development') {
        const mountTime = mountTimeRef.current
        const unmountTime = performance.now()
        const lifecycleTime = mountTime ? unmountTime - mountTime : 0
        
        console.log(`🔄 ${componentName} lifecycle: ${lifecycleTime.toFixed(2)}ms`)
      }
    }
  }, [componentName])

  // Track render performance
  useEffect(() => {
    if (renderStartRef.current) {
      const renderEnd = performance.now()
      const renderTime = renderEnd - renderStartRef.current
      
      const metrics: PerformanceMetrics = {
        componentName,
        renderTime,
        timestamp: Date.now()
      }

      // Add memory tracking if enabled and supported
      if (enableMemoryTracking && 'memory' in performance) {
        const memoryInfo = (performance as any).memory
        metrics.memoryUsage = memoryInfo.usedJSHeapSize / 1048576 // Convert to MB
      }

      // Call callback if provided
      if (onMetrics) {
        onMetrics(metrics)
      }

      // Log slow renders in development
      if (process.env.NODE_ENV === 'development' && renderTime > logThreshold) {
        console.warn(
          `🐌 Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms`,
          metrics
        )
      }
    }
  })

  // Mark render start
  renderStartRef.current = performance.now()

  return {
    startTiming: () => {
      renderStartRef.current = performance.now()
    },
    endTiming: () => {
      if (renderStartRef.current) {
        const renderTime = performance.now() - renderStartRef.current
        return renderTime
      }
      return 0
    }
  }
}

// Performance monitoring context for dashboard-wide metrics
export class DashboardPerformanceMonitor {
  private metrics: PerformanceMetrics[] = []
  private maxMetrics = 100

  addMetric(metric: PerformanceMetrics) {
    this.metrics.push(metric)
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }
  }

  getMetrics(componentName?: string): PerformanceMetrics[] {
    if (componentName) {
      return this.metrics.filter(m => m.componentName === componentName)
    }
    return [...this.metrics]
  }

  getAverageRenderTime(componentName?: string): number {
    const metrics = this.getMetrics(componentName)
    if (metrics.length === 0) return 0
    
    const total = metrics.reduce((sum, m) => sum + m.renderTime, 0)
    return total / metrics.length
  }

  getSlowRenders(threshold = 16): PerformanceMetrics[] {
    return this.metrics.filter(m => m.renderTime > threshold)
  }

  exportMetrics(): string {
    return JSON.stringify({
      metrics: this.metrics,
      summary: {
        totalComponents: new Set(this.metrics.map(m => m.componentName)).size,
        averageRenderTime: this.getAverageRenderTime(),
        slowRenders: this.getSlowRenders().length,
        timestamp: Date.now()
      }
    }, null, 2)
  }

  clear() {
    this.metrics = []
  }
}

// Global instance for dashboard
export const dashboardPerformanceMonitor = new DashboardPerformanceMonitor()

// Bundle size monitoring
export const trackBundleSize = () => {
  if (typeof window !== 'undefined' && 'performance' in window) {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    
    const bundleMetrics = {
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      firstPaint: 0,
      firstContentfulPaint: 0
    }

    // Get paint timings if available
    const paintEntries = performance.getEntriesByType('paint')
    paintEntries.forEach((entry) => {
      if (entry.name === 'first-paint') {
        bundleMetrics.firstPaint = entry.startTime
      } else if (entry.name === 'first-contentful-paint') {
        bundleMetrics.firstContentfulPaint = entry.startTime
      }
    })

    console.log('📦 Bundle Performance Metrics:', bundleMetrics)
    return bundleMetrics
  }

  return null
}

// Memory usage monitoring
export const useMemoryMonitor = (interval = 10000) => {
  useEffect(() => {
    if (typeof window === 'undefined' || !('memory' in performance)) {
      return
    }

    const checkMemory = () => {
      const memoryInfo = (performance as any).memory
      const memoryUsageMB = memoryInfo.usedJSHeapSize / 1048576
      const memoryLimitMB = memoryInfo.jsHeapSizeLimit / 1048576
      const usagePercentage = (memoryUsageMB / memoryLimitMB) * 100

      // Warn if memory usage is high
      if (usagePercentage > 80) {
        console.warn(`🧠 High memory usage: ${memoryUsageMB.toFixed(2)}MB (${usagePercentage.toFixed(1)}%)`)
      }

      return { memoryUsageMB, memoryLimitMB, usagePercentage }
    }

    // Initial check
    checkMemory()

    // Set up interval
    const intervalId = setInterval(checkMemory, interval)

    return () => {
      clearInterval(intervalId)
    }
  }, [interval])
}

// Web Vitals monitoring
export const useWebVitals = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Dynamic import to reduce initial bundle size
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(console.log)
      getFID(console.log)
      getFCP(console.log)
      getLCP(console.log)
      getTTFB(console.log)
    }).catch(() => {
      // web-vitals not available, continue silently
    })
  }, [])
}

export default usePerformanceMonitor