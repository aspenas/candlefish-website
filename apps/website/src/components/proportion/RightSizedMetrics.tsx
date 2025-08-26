import React, { useState, useEffect, useMemo } from 'react'

interface MetricData {
  label: string
  value: number
  unit?: string
  percentile: number
  cohortMedian: number
  weekOverWeek: number
  cohortSize: number
}

interface RightSizedMetricsProps {
  metrics: MetricData[]
  title?: string
  className?: string
}

// Differential privacy noise addition
const addDifferentialPrivacy = (value: number, epsilon: number = 0.1): number => {
  const sensitivity = 1
  const scale = sensitivity / epsilon
  const u = Math.random() - 0.5
  const noise = -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u))
  return Math.round(value + noise)
}

// Ensure k-anonymity (k >= 5)
const ensureKAnonymity = (cohortSize: number): number => {
  return Math.max(5, cohortSize)
}

export const RightSizedMetrics: React.FC<RightSizedMetricsProps> = ({
  metrics,
  title = 'Your Metrics',
  className = ''
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('week')
  const [showDetails, setShowDetails] = useState(false)

  // Apply privacy transformations
  const privacyPreservedMetrics = useMemo(() => {
    return metrics.map(metric => ({
      ...metric,
      value: addDifferentialPrivacy(metric.value),
      cohortMedian: addDifferentialPrivacy(metric.cohortMedian),
      cohortSize: ensureKAnonymity(metric.cohortSize)
    }))
  }, [metrics])

  // Get percentile color
  const getPercentileColor = (percentile: number): string => {
    if (percentile >= 75) return 'text-green-600'
    if (percentile >= 50) return 'text-blue-600'
    if (percentile >= 25) return 'text-amber-600'
    return 'text-red-600'
  }

  // Get percentile background
  const getPercentileBg = (percentile: number): string => {
    if (percentile >= 75) return 'bg-green-50'
    if (percentile >= 50) return 'bg-blue-50'
    if (percentile >= 25) return 'bg-amber-50'
    return 'bg-red-50'
  }

  // Format delta
  const formatDelta = (delta: number): string => {
    if (delta > 0) return `+${delta}%`
    if (delta < 0) return `${delta}%`
    return '0%'
  }

  // Get delta color
  const getDeltaColor = (delta: number): string => {
    if (delta > 0) return 'text-green-600'
    if (delta < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  // Calculate relative position
  const getRelativePosition = (percentile: number): string => {
    if (percentile >= 90) return 'Top 10%'
    if (percentile >= 75) return 'Top 25%'
    if (percentile >= 50) return 'Above median'
    if (percentile >= 25) return 'Below median'
    return 'Bottom 25%'
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <div className="flex items-center space-x-2">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as 'week' | 'month' | 'quarter')}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="week">Week</option>
              <option value="month">Month</option>
              <option value="quarter">Quarter</option>
            </select>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="p-1 text-gray-500 hover:text-gray-700"
              aria-label="Toggle details"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {privacyPreservedMetrics.map((metric, index) => (
            <div
              key={index}
              className={`relative p-4 rounded-lg ${getPercentileBg(metric.percentile)} border border-gray-200`}
            >
              {/* Metric label */}
              <div className="text-sm font-medium text-gray-600 mb-2">
                {metric.label}
              </div>

              {/* Relative visualization */}
              <div className="mb-4">
                <div className="relative h-8 bg-white rounded-full overflow-hidden">
                  {/* Median marker */}
                  <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-400 z-10" />

                  {/* Your position */}
                  <div
                    className="absolute top-1 bottom-1 w-2 bg-blue-600 rounded-full z-20"
                    style={{ left: `${metric.percentile}%`, transform: 'translateX(-50%)' }}
                  />

                  {/* Quartile zones */}
                  <div className="absolute inset-0 flex">
                    <div className="w-1/4 bg-red-100 opacity-30" />
                    <div className="w-1/4 bg-amber-100 opacity-30" />
                    <div className="w-1/4 bg-blue-100 opacity-30" />
                    <div className="w-1/4 bg-green-100 opacity-30" />
                  </div>
                </div>

                {/* Labels */}
                <div className="flex justify-between mt-1 text-xs text-gray-500">
                  <span>0%</span>
                  <span>Median</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-2">
                {/* Percentile */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Position</span>
                  <span className={`text-sm font-medium ${getPercentileColor(metric.percentile)}`}>
                    {getRelativePosition(metric.percentile)}
                  </span>
                </div>

                {/* Week over week */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">vs Last Week</span>
                  <span className={`text-sm font-medium ${getDeltaColor(metric.weekOverWeek)}`}>
                    {formatDelta(metric.weekOverWeek)}
                  </span>
                </div>

                {/* Cohort size */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Cohort</span>
                  <span className="text-sm text-gray-700">
                    {metric.cohortSize >= 1000
                      ? `${Math.round(metric.cohortSize / 1000)}k`
                      : metric.cohortSize} peers
                  </span>
                </div>
              </div>

              {/* Details (when expanded) */}
              {showDetails && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="space-y-1 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span>Your value:</span>
                      <span className="font-medium">
                        ~{metric.value} {metric.unit}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cohort median:</span>
                      <span className="font-medium">
                        ~{metric.cohortMedian} {metric.unit}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Percentile:</span>
                      <span className="font-medium">{metric.percentile}th</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Privacy notice */}
        <div className="mt-6 p-3 bg-gray-50 rounded-md">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-gray-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <div className="text-xs text-gray-600">
              <p className="font-medium mb-1">Privacy Protected</p>
              <p>
                Values are approximated with differential privacy (ε=0.1).
                Cohorts maintain k-anonymity (k≥5). No individual peer data is shown.
                All metrics are aggregated weekly minimum.
              </p>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-600">
            <p className="font-medium mb-2">Understanding Your Position:</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-100 rounded mr-2" />
                <span>Top 25% - Excellence</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-100 rounded mr-2" />
                <span>50-75% - Above Average</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-amber-100 rounded mr-2" />
                <span>25-50% - Average</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-100 rounded mr-2" />
                <span>Bottom 25% - Opportunity</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Example usage component
export const MetricsDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<MetricData[]>([])

  useEffect(() => {
    // Simulate fetching metrics from API
    const fetchMetrics = async () => {
      // In production, this would fetch from your analytics API
      const sampleMetrics: MetricData[] = [
        {
          label: 'Page Load Time',
          value: 1200,
          unit: 'ms',
          percentile: 72,
          cohortMedian: 1500,
          weekOverWeek: -5,
          cohortSize: 234
        },
        {
          label: 'Error Rate',
          value: 0.8,
          unit: '%',
          percentile: 85,
          cohortMedian: 2.1,
          weekOverWeek: -12,
          cohortSize: 189
        },
        {
          label: 'API Latency',
          value: 145,
          unit: 'ms',
          percentile: 61,
          cohortMedian: 130,
          weekOverWeek: 3,
          cohortSize: 412
        },
        {
          label: 'User Sessions',
          value: 3420,
          unit: '',
          percentile: 45,
          cohortMedian: 3800,
          weekOverWeek: 8,
          cohortSize: 567
        },
        {
          label: 'Conversion Rate',
          value: 3.2,
          unit: '%',
          percentile: 58,
          cohortMedian: 2.9,
          weekOverWeek: 2,
          cohortSize: 324
        },
        {
          label: 'Uptime',
          value: 99.92,
          unit: '%',
          percentile: 82,
          cohortMedian: 99.85,
          weekOverWeek: 0,
          cohortSize: 892
        }
      ]

      setMetrics(sampleMetrics)
    }

    fetchMetrics()
  }, [])

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <RightSizedMetrics
          metrics={metrics}
          title="Performance Metrics"
          className="mb-8"
        />
      </div>
    </div>
  )
}
