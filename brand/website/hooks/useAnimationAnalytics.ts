'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  AnimationEvent, 
  AnimationMetrics, 
  AnimationAnalyticsState, 
  ApiResponse,
  PerformanceMetrics 
} from '../types/animation'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '/api'

export const useAnimationAnalytics = (animationId: string, userId?: string) => {
  const [state, setState] = useState<AnimationAnalyticsState>({
    metrics: null,
    loading: false,
    error: null
  })

  const sessionId = useRef<string>()
  const eventQueue = useRef<AnimationEvent[]>([])
  const batchTimer = useRef<NodeJS.Timeout>()

  // Generate session ID once
  useEffect(() => {
    sessionId.current = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }, [])

  // Batch event sending to reduce API calls
  const flushEvents = useCallback(async () => {
    if (eventQueue.current.length === 0) return

    const events = [...eventQueue.current]
    eventQueue.current = []

    try {
      await fetch(`${API_BASE}/animation/analytics/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify({ events }),
      })
    } catch (error) {
      console.warn('Failed to send analytics events:', error)
      // Re-queue events on failure (with limit to prevent memory leaks)
      if (eventQueue.current.length < 100) {
        eventQueue.current.unshift(...events)
      }
    }
  }, [API_BASE])

  // Track animation events
  const trackEvent = useCallback((
    eventType: AnimationEvent['eventType'],
    eventData: Partial<AnimationEvent['eventData']>,
    variant?: string
  ) => {
    if (!animationId || !sessionId.current) return

    const event: AnimationEvent = {
      eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      animationId,
      userId,
      sessionId: sessionId.current,
      eventType,
      eventData: {
        timestamp: Date.now(),
        ...eventData
      },
      metadata: {
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        devicePixelRatio: window.devicePixelRatio || 1,
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        variant
      },
      createdAt: new Date().toISOString()
    }

    eventQueue.current.push(event)

    // Clear existing timer and set new one
    if (batchTimer.current) {
      clearTimeout(batchTimer.current)
    }

    batchTimer.current = setTimeout(flushEvents, 1000) // Batch events for 1 second
  }, [animationId, userId, flushEvents])

  // Convenience methods for common events
  const trackView = useCallback((duration?: number, variant?: string) => {
    trackEvent('view', { duration }, variant)
  }, [trackEvent])

  const trackInteraction = useCallback((
    cursorPosition?: { x: number; y: number },
    clickPosition?: { x: number; y: number },
    variant?: string
  ) => {
    trackEvent('interaction', { cursorPosition, clickPosition }, variant)
  }, [trackEvent])

  const trackError = useCallback((error: Error, variant?: string) => {
    trackEvent('error', {
      errorMessage: error.message,
      errorStack: error.stack
    }, variant)
  }, [trackEvent])

  const trackPerformance = useCallback((metrics: PerformanceMetrics, variant?: string) => {
    trackEvent('performance', {
      fps: metrics.fps,
      memoryUsage: metrics.memoryUsage
    }, variant)
  }, [trackEvent])

  // Fetch metrics
  const fetchMetrics = useCallback(async (
    timeRange?: { start: string; end: string }
  ): Promise<AnimationMetrics | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      let url = `${API_BASE}/animation/analytics/metrics?animationId=${animationId}`
      
      if (timeRange) {
        url += `&start=${encodeURIComponent(timeRange.start)}&end=${encodeURIComponent(timeRange.end)}`
      }

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result: ApiResponse<AnimationMetrics> = await response.json()

      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to fetch analytics metrics')
      }

      setState({
        metrics: result.data || null,
        loading: false,
        error: null
      })

      return result.data || null
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setState({
        metrics: null,
        loading: false,
        error: errorMessage
      })
      return null
    }
  }, [animationId, API_BASE])

  // Flush events on unmount
  useEffect(() => {
    return () => {
      if (batchTimer.current) {
        clearTimeout(batchTimer.current)
      }
      flushEvents()
    }
  }, [flushEvents])

  // Auto-flush events periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (eventQueue.current.length > 0) {
        flushEvents()
      }
    }, 10000) // Flush every 10 seconds

    return () => clearInterval(interval)
  }, [flushEvents])

  return {
    ...state,
    trackView,
    trackInteraction,
    trackError,
    trackPerformance,
    trackEvent,
    fetchMetrics,
    flushEvents
  }
}