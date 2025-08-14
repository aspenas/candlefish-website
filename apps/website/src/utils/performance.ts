// Performance Monitoring Utility
// Tracks Core Web Vitals and performance metrics

export function initPerformanceMonitoring() {
  if (typeof window === 'undefined') return

  // Core Web Vitals monitoring
  if ('PerformanceObserver' in window) {
    try {
      // Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries()
        const lastEntry = entries[entries.length - 1]
        console.log('LCP:', lastEntry.startTime)
      })
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })

      // First Input Delay (FID)
      const fidObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries()
        entries.forEach((entry) => {
          const eventEntry = entry as PerformanceEventTiming
          const delay = eventEntry.processingStart - eventEntry.startTime
          console.log('FID:', delay)
        })
      })
      fidObserver.observe({ entryTypes: ['first-input'] })

      // Cumulative Layout Shift (CLS)
      let clsValue = 0
      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          // @ts-ignore - LayoutShift type not fully supported
          if (!entry.hadRecentInput) {
            // @ts-ignore
            clsValue += entry.value
            console.log('CLS:', clsValue)
          }
        }
      })
      clsObserver.observe({ entryTypes: ['layout-shift'] })

    } catch (e) {
      console.log('Performance monitoring not available')
    }
  }

  // Navigation timing
  if ('performance' in window && 'getEntriesByType' in performance) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        if (navigationTiming) {
          const metrics = {
            dns: navigationTiming.domainLookupEnd - navigationTiming.domainLookupStart,
            tcp: navigationTiming.connectEnd - navigationTiming.connectStart,
            ttfb: navigationTiming.responseStart - navigationTiming.requestStart,
            download: navigationTiming.responseEnd - navigationTiming.responseStart,
            domInteractive: navigationTiming.domInteractive - navigationTiming.responseEnd,
            domComplete: navigationTiming.domComplete - navigationTiming.responseEnd,
            loadComplete: navigationTiming.loadEventEnd - navigationTiming.loadEventStart,
            totalTime: navigationTiming.loadEventEnd - navigationTiming.fetchStart
          }

          console.log('Performance Metrics:', metrics)
        }
      }, 0)
    })
  }

  // Memory usage (Chrome only)
  if ('memory' in performance) {
    setInterval(() => {
      // @ts-ignore
      const memory = performance.memory
      if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.9) {
        console.warn('High memory usage detected:', {
          used: Math.round(memory.usedJSHeapSize / 1048576) + 'MB',
          limit: Math.round(memory.jsHeapSizeLimit / 1048576) + 'MB'
        })
      }
    }, 30000) // Check every 30 seconds
  }

  // Long tasks detection
  if ('PerformanceObserver' in window) {
    try {
      const longTaskObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          console.warn('Long Task detected:', {
            duration: entry.duration,
            startTime: entry.startTime,
            name: entry.name
          })
        }
      })
      longTaskObserver.observe({ entryTypes: ['longtask'] })
    } catch (e) {
      // Long task API not supported
    }
  }

  // Report to analytics (placeholder)
  const reportMetrics = (metrics: Record<string, any>) => {
    // In production, send to analytics service
    if (process.env.NODE_ENV === 'production') {
      // Example: window.gtag('event', 'web_vitals', metrics)
    }
  }
}
