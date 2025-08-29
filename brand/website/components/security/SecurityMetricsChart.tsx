'use client'

import React, { useMemo } from 'react'
import { Card } from '@/components/ui/Card'

interface MetricDataPoint {
  timestamp: number
  threats: number
  incidents: number
  alerts: number
  vulnerabilities: number
}

interface SecurityMetricsChartProps {
  data?: MetricDataPoint[]
  className?: string
  timeRange?: '24h' | '7d' | '30d' | '90d'
}

const SecurityMetricsChart: React.FC<SecurityMetricsChartProps> = ({ 
  data = [],
  className = '',
  timeRange = '24h'
}) => {
  // Generate mock data based on time range
  const mockData = useMemo(() => {
    const points: MetricDataPoint[] = []
    const now = Date.now()
    
    let intervals: number
    let intervalMs: number
    
    switch (timeRange) {
      case '24h':
        intervals = 24
        intervalMs = 60 * 60 * 1000 // 1 hour
        break
      case '7d':
        intervals = 7
        intervalMs = 24 * 60 * 60 * 1000 // 1 day
        break
      case '30d':
        intervals = 30
        intervalMs = 24 * 60 * 60 * 1000 // 1 day
        break
      case '90d':
        intervals = 90
        intervalMs = 24 * 60 * 60 * 1000 // 1 day
        break
      default:
        intervals = 24
        intervalMs = 60 * 60 * 1000
    }

    for (let i = intervals - 1; i >= 0; i--) {
      const timestamp = now - (i * intervalMs)
      
      // Simulate realistic security data with some correlation
      const baseThreats = 5 + Math.floor(Math.random() * 15)
      const baseIncidents = Math.floor(baseThreats * 0.3 + Math.random() * 5)
      const baseAlerts = Math.floor(baseThreats * 2 + Math.random() * 10)
      const baseVulns = 2 + Math.floor(Math.random() * 8)
      
      points.push({
        timestamp,
        threats: baseThreats,
        incidents: baseIncidents,
        alerts: baseAlerts,
        vulnerabilities: baseVulns
      })
    }
    
    return points
  }, [timeRange])

  const chartData = data.length > 0 ? data : mockData

  // Calculate chart dimensions
  const chartWidth = 800
  const chartHeight = 300
  const padding = 40

  // Find max values for scaling
  const maxValues = useMemo(() => {
    return {
      threats: Math.max(...chartData.map(d => d.threats)),
      incidents: Math.max(...chartData.map(d => d.incidents)),
      alerts: Math.max(...chartData.map(d => d.alerts)),
      vulnerabilities: Math.max(...chartData.map(d => d.vulnerabilities))
    }
  }, [chartData])

  const maxValue = Math.max(...Object.values(maxValues))

  // Create path data for each metric
  const createPath = (data: number[], color: string) => {
    const points = data.map((value, index) => {
      const x = padding + (index * (chartWidth - 2 * padding)) / (data.length - 1)
      const y = chartHeight - padding - ((value / maxValue) * (chartHeight - 2 * padding))
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
    }).join(' ')
    
    return points
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    switch (timeRange) {
      case '24h':
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      case '7d':
        return date.toLocaleDateString('en-US', { weekday: 'short' })
      case '30d':
      case '90d':
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      default:
        return date.toLocaleDateString()
    }
  }

  const metrics = [
    { key: 'threats', label: 'Threats', color: '#ef4444', data: chartData.map(d => d.threats) },
    { key: 'incidents', label: 'Incidents', color: '#f97316', data: chartData.map(d => d.incidents) },
    { key: 'alerts', label: 'Alerts', color: '#f59e0b', data: chartData.map(d => d.alerts) },
    { key: 'vulnerabilities', label: 'Vulnerabilities', color: '#8b5cf6', data: chartData.map(d => d.vulnerabilities) }
  ]

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Security Metrics Trend
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Historical view of security events over time
          </p>
        </div>
        
        {/* Time Range Selector */}
        <select className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      {/* Chart */}
      <div className="relative bg-gray-50 dark:bg-gray-800 rounded-lg p-4 overflow-x-auto">
        <svg width={chartWidth} height={chartHeight} className="w-full h-auto max-w-full">
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="40" height="30" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 30" fill="none" stroke="#e5e7eb" strokeWidth="1" opacity="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Y-axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = chartHeight - padding - (ratio * (chartHeight - 2 * padding))
            const value = Math.round(maxValue * ratio)
            return (
              <g key={ratio}>
                <line 
                  x1={padding - 5} 
                  y1={y} 
                  x2={padding} 
                  y2={y} 
                  stroke="#6b7280" 
                  strokeWidth="1"
                />
                <text 
                  x={padding - 10} 
                  y={y + 4} 
                  textAnchor="end" 
                  className="text-xs fill-gray-500 dark:fill-gray-400"
                >
                  {value}
                </text>
              </g>
            )
          })}

          {/* X-axis labels */}
          {chartData.map((point, index) => {
            if (index % Math.ceil(chartData.length / 6) === 0) {
              const x = padding + (index * (chartWidth - 2 * padding)) / (chartData.length - 1)
              return (
                <g key={index}>
                  <line 
                    x1={x} 
                    y1={chartHeight - padding} 
                    x2={x} 
                    y2={chartHeight - padding + 5} 
                    stroke="#6b7280" 
                    strokeWidth="1"
                  />
                  <text 
                    x={x} 
                    y={chartHeight - padding + 20} 
                    textAnchor="middle" 
                    className="text-xs fill-gray-500 dark:fill-gray-400"
                  >
                    {formatTime(point.timestamp)}
                  </text>
                </g>
              )
            }
            return null
          })}

          {/* Chart lines */}
          {metrics.map((metric) => (
            <g key={metric.key}>
              <path
                d={createPath(metric.data, metric.color)}
                fill="none"
                stroke={metric.color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              
              {/* Data points */}
              {metric.data.map((value, index) => {
                const x = padding + (index * (chartWidth - 2 * padding)) / (metric.data.length - 1)
                const y = chartHeight - padding - ((value / maxValue) * (chartHeight - 2 * padding))
                return (
                  <circle
                    key={index}
                    cx={x}
                    cy={y}
                    r="3"
                    fill={metric.color}
                    className="hover:r-5 transition-all cursor-pointer"
                  >
                    <title>{`${metric.label}: ${value} at ${formatTime(chartData[index].timestamp)}`}</title>
                  </circle>
                )
              })}
            </g>
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-6 mt-4">
        {metrics.map((metric) => (
          <div key={metric.key} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: metric.color }}
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {metric.label}
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {metric.data[metric.data.length - 1]}
            </span>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
        {metrics.map((metric) => {
          const total = metric.data.reduce((sum, val) => sum + val, 0)
          const average = Math.round(total / metric.data.length)
          const trend = metric.data[metric.data.length - 1] - metric.data[metric.data.length - 2]
          
          return (
            <div key={metric.key} className="text-center">
              <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {metric.label}
              </div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                {average}
              </div>
              <div className={`text-xs mt-1 ${
                trend > 0 ? 'text-red-500' : trend < 0 ? 'text-green-500' : 'text-gray-500'
              }`}>
                {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend)}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

export default SecurityMetricsChart