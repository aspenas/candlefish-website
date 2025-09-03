'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { AnimationMetrics } from '../../types/animation'
import { useAnimationAnalytics } from '../../hooks/useAnimationAnalytics'

interface AnalyticsDashboardProps {
  animationId: string
  refreshInterval?: number
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  animationId,
  refreshInterval = 30000 // 30 seconds
}) => {
  const { metrics, loading, error, fetchMetrics } = useAnimationAnalytics(animationId)
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h')

  const getTimeRange = useCallback((range: typeof timeRange) => {
    const end = new Date().toISOString()
    const start = new Date()
    
    switch (range) {
      case '1h':
        start.setHours(start.getHours() - 1)
        break
      case '24h':
        start.setDate(start.getDate() - 1)
        break
      case '7d':
        start.setDate(start.getDate() - 7)
        break
      case '30d':
        start.setDate(start.getDate() - 30)
        break
    }

    return {
      start: start.toISOString(),
      end
    }
  }, [])

  useEffect(() => {
    const range = getTimeRange(timeRange)
    fetchMetrics(range)
  }, [timeRange, fetchMetrics, getTimeRange])

  // Auto-refresh
  useEffect(() => {
    if (refreshInterval <= 0) return

    const interval = setInterval(() => {
      const range = getTimeRange(timeRange)
      fetchMetrics(range)
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [refreshInterval, timeRange, fetchMetrics, getTimeRange])

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`
    const seconds = ms / 1000
    if (seconds < 60) return `${seconds.toFixed(1)}s`
    const minutes = seconds / 60
    return `${minutes.toFixed(1)}m`
  }

  if (loading) {
    return (
      <div className="animate-pulse bg-[#1B263B]/20 border border-[#415A77]/20 rounded-lg p-6">
        <div className="h-6 bg-[#415A77]/20 rounded mb-6"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-[#415A77]/10 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error || !metrics) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6">
        <h3 className="text-red-300 font-medium mb-2">Analytics Error</h3>
        <p className="text-red-200 text-sm">{error || 'No metrics available'}</p>
      </div>
    )
  }

  return (
    <div className="bg-[#1B263B]/20 border border-[#415A77]/20 rounded-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-light text-[#F8F8F2]">Analytics Dashboard</h2>
        <div className="flex gap-2">
          {(['1h', '24h', '7d', '30d'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                timeRange === range
                  ? 'bg-[#3FD3C6] text-[#0D1B2A]'
                  : 'text-[#415A77] hover:text-[#F8F8F2]'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#0D1B2A]/30 rounded-lg p-4">
          <div className="text-[#3FD3C6] text-2xl font-light mb-1">
            {formatNumber(metrics.views.total)}
          </div>
          <div className="text-[#415A77] text-sm">Total Views</div>
          <div className="text-[#E0E1DD] text-xs mt-1">
            {formatNumber(metrics.views.unique)} unique
          </div>
        </div>

        <div className="bg-[#0D1B2A]/30 rounded-lg p-4">
          <div className="text-[#3FD3C6] text-2xl font-light mb-1">
            {formatDuration(metrics.views.averageDuration)}
          </div>
          <div className="text-[#415A77] text-sm">Avg Duration</div>
        </div>

        <div className="bg-[#0D1B2A]/30 rounded-lg p-4">
          <div className="text-[#3FD3C6] text-2xl font-light mb-1">
            {formatNumber(metrics.interactions.clicks)}
          </div>
          <div className="text-[#415A77] text-sm">Interactions</div>
          <div className="text-[#E0E1DD] text-xs mt-1">
            {formatNumber(metrics.interactions.hovers)} hovers
          </div>
        </div>

        <div className="bg-[#0D1B2A]/30 rounded-lg p-4">
          <div className="text-[#3FD3C6] text-2xl font-light mb-1">
            {metrics.performance.averageFPS.toFixed(0)}
          </div>
          <div className="text-[#415A77] text-sm">Avg FPS</div>
          <div className="text-[#E0E1DD] text-xs mt-1">
            {(metrics.performance.errorRate * 100).toFixed(1)}% errors
          </div>
        </div>
      </div>

      {/* Performance Details */}
      <section className="space-y-4">
        <h3 className="text-lg font-light text-[#F8F8F2] border-b border-[#415A77]/20 pb-2">
          Performance
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#0D1B2A]/30 rounded-lg p-4">
            <div className="text-[#E0E1DD] text-sm mb-2">Memory Usage</div>
            <div className="text-[#3FD3C6] text-lg">
              {(metrics.performance.memoryUsage.average / 1024 / 1024).toFixed(1)}MB
            </div>
            <div className="text-[#415A77] text-xs">
              Peak: {(metrics.performance.memoryUsage.peak / 1024 / 1024).toFixed(1)}MB
            </div>
          </div>

          <div className="bg-[#0D1B2A]/30 rounded-lg p-4">
            <div className="text-[#E0E1DD] text-sm mb-2">Load Time</div>
            <div className="text-[#3FD3C6] text-lg">
              {formatDuration(metrics.performance.loadTime.average)}
            </div>
            <div className="text-[#415A77] text-xs">
              P95: {formatDuration(metrics.performance.loadTime.p95)}
            </div>
          </div>

          <div className="bg-[#0D1B2A]/30 rounded-lg p-4">
            <div className="text-[#E0E1DD] text-sm mb-2">Error Rate</div>
            <div className={`text-lg ${
              metrics.performance.errorRate > 0.05 ? 'text-red-400' : 'text-[#3FD3C6]'
            }`}>
              {(metrics.performance.errorRate * 100).toFixed(2)}%
            </div>
          </div>
        </div>
      </section>

      {/* A/B Test Variants */}
      {Object.keys(metrics.variants).length > 0 && (
        <section className="space-y-4">
          <h3 className="text-lg font-light text-[#F8F8F2] border-b border-[#415A77]/20 pb-2">
            A/B Test Variants
          </h3>
          <div className="space-y-3">
            {Object.entries(metrics.variants).map(([variantId, data]) => (
              <div key={variantId} className="bg-[#0D1B2A]/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[#E0E1DD] font-medium">{variantId}</span>
                  {data.conversionRate !== undefined && (
                    <span className="text-[#3FD3C6] text-sm">
                      {(data.conversionRate * 100).toFixed(1)}% conversion
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-[#415A77]">Views:</span>
                    <span className="text-[#E0E1DD] ml-2">{formatNumber(data.views)}</span>
                  </div>
                  <div>
                    <span className="text-[#415A77]">Interactions:</span>
                    <span className="text-[#E0E1DD] ml-2">{formatNumber(data.interactions)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Status Indicator */}
      <div className="flex items-center justify-between pt-4 border-t border-[#415A77]/20">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-[#3FD3C6] rounded-full animate-pulse"></div>
          <span className="text-[#415A77] text-xs">
            Last updated: {new Date().toLocaleTimeString()}
          </span>
        </div>
        <button
          onClick={() => {
            const range = getTimeRange(timeRange)
            fetchMetrics(range)
          }}
          className="text-[#3FD3C6] hover:text-[#3FD3C6]/80 text-xs"
        >
          Refresh
        </button>
      </div>
    </div>
  )
}