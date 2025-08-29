'use client'

import React from 'react'
import { Card } from '@/components/ui/Card'

interface Metric {
  label: string
  value: number
  change: number
  trend: 'up' | 'down' | 'stable'
  color: 'green' | 'yellow' | 'red' | 'blue'
}

interface IncidentMetricsProps {
  metrics?: Metric[]
  className?: string
}

const IncidentMetrics: React.FC<IncidentMetricsProps> = ({ 
  metrics = [],
  className = ''
}) => {
  const defaultMetrics: Metric[] = [
    {
      label: 'Total Incidents',
      value: 142,
      change: 8,
      trend: 'up',
      color: 'blue'
    },
    {
      label: 'Open Incidents',
      value: 23,
      change: -5,
      trend: 'down',
      color: 'red'
    },
    {
      label: 'Investigating',
      value: 15,
      change: 3,
      trend: 'up',
      color: 'yellow'
    },
    {
      label: 'Resolved Today',
      value: 18,
      change: 12,
      trend: 'up',
      color: 'green'
    }
  ]

  const activeMetrics = metrics.length > 0 ? metrics : defaultMetrics

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'green':
        return 'text-green-600 dark:text-green-400'
      case 'yellow':
        return 'text-yellow-600 dark:text-yellow-400'
      case 'red':
        return 'text-red-600 dark:text-red-400'
      case 'blue':
        return 'text-blue-600 dark:text-blue-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        )
      case 'down':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
          </svg>
        )
      case 'stable':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        )
    }
  }

  const getTrendColor = (trend: 'up' | 'down' | 'stable', change: number) => {
    if (trend === 'stable') return 'text-gray-500 dark:text-gray-400'
    
    // For incidents, generally down trends are good (fewer incidents)
    // But this depends on the specific metric
    if (trend === 'up') return 'text-red-500'
    return 'text-green-500'
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
      {activeMetrics.map((metric) => (
        <Card key={metric.label} className="p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {metric.label}
            </h3>
            <div className={`flex items-center gap-1 text-sm ${getTrendColor(metric.trend, metric.change)}`}>
              {getTrendIcon(metric.trend)}
              <span>{Math.abs(metric.change)}</span>
            </div>
          </div>
          
          <div className="flex items-end gap-2">
            <span className={`text-3xl font-bold ${getColorClasses(metric.color)}`}>
              {metric.value}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              vs last period
            </span>
          </div>
          
          <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
            <div 
              className={`h-1 rounded-full transition-all duration-300 ${
                metric.color === 'green' ? 'bg-green-500' :
                metric.color === 'yellow' ? 'bg-yellow-500' :
                metric.color === 'red' ? 'bg-red-500' :
                'bg-blue-500'
              }`}
              style={{ width: `${Math.min(metric.value / 50 * 100, 100)}%` }}
            />
          </div>
        </Card>
      ))}
    </div>
  )
}

export default IncidentMetrics