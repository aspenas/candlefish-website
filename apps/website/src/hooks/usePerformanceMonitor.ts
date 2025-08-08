import { useEffect, useCallback } from 'react'

interface PerformanceMetrics {
  lcp: number | null
  fid: number | null
  cls: number | null
  fcp: number | null
  ttfb: number | null
}

export const usePerformanceMonitor = () => {
  const reportMetric = useCallback((metric: any) => {
    // In production, send to analytics
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${metric.name}:`, metric.value)
    }
  }, [])

  useEffect(() => {
    // Observe Largest Contentful Paint
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1] as any
          reportMetric({ name: 'LCP', value: lastEntry.renderTime || lastEntry.loadTime })
        })
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })

        // Observe First Input Delay
        const fidObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const eventEntry = entry as any
            reportMetric({ name: 'FID', value: eventEntry.processingStart - eventEntry.startTime })
          }
        })
        fidObserver.observe({ entryTypes: ['first-input'] })

        // Observe Cumulative Layout Shift
        let clsValue = 0
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const layoutEntry = entry as any
            if (!layoutEntry.hadRecentInput) {
              clsValue += layoutEntry.value
            }
          }
          reportMetric({ name: 'CLS', value: clsValue })
        })
        clsObserver.observe({ entryTypes: ['layout-shift'] })

        return () => {
          lcpObserver.disconnect()
          fidObserver.disconnect()
          clsObserver.disconnect()
        }
      } catch (e) {
        // Observer API not supported
      }
    }
  }, [reportMetric])
}
