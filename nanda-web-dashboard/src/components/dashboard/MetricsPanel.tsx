'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Users,
  Server,
  Cpu,
  Memory,
  Network,
  HardDrive,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react'

export interface MetricData {
  id: string
  title: string
  value: string
  previousValue?: string
  change: number
  changeLabel: string
  status: 'good' | 'warning' | 'critical'
  icon: React.ReactNode
  sparklineData: number[]
  unit?: string
  target?: number
}

export interface MetricsPanelProps {
  metrics: MetricData[]
  title?: string
  refreshInterval?: number
  onRefresh?: () => void
  showSparklines?: boolean
  compact?: boolean
  className?: string
}

// Sparkline component for trend visualization
const Sparkline = ({
  data,
  color = 'rgb(139, 92, 246)',
  width = 100,
  height = 30,
  showDots = false
}: {
  data: number[]
  color?: string
  width?: number
  height?: number
  showDots?: boolean
}) => {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width
    const y = height - ((value - min) / range) * height
    return { x, y, value }
  })

  const pathData = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')

  return (
    <div className="relative">
      <svg width={width} height={height} className="overflow-visible">
        {/* Gradient definition */}
        <defs>
          <linearGradient id={`sparkline-gradient-${data.length}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Fill area */}
        <path
          d={`${pathData} L ${width} ${height} L 0 ${height} Z`}
          fill={`url(#sparkline-gradient-${data.length})`}
        />

        {/* Line */}
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dots */}
        {showDots && points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="2"
            fill={color}
            className="opacity-60 hover:opacity-100 transition-opacity"
          />
        ))}
      </svg>
    </div>
  )
}

// Individual metric card component
const MetricCard = ({
  metric,
  showSparkline = true,
  compact = false
}: {
  metric: MetricData
  showSparkline?: boolean
  compact?: boolean
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-400 border-green-400/30'
      case 'warning': return 'text-yellow-400 border-yellow-400/30'
      case 'critical': return 'text-red-400 border-red-400/30'
      default: return 'text-gray-400 border-gray-400/30'
    }
  }

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'good': return 'bg-green-500/10'
      case 'warning': return 'bg-yellow-500/10'
      case 'critical': return 'bg-red-500/10'
      default: return 'bg-gray-500/10'
    }
  }

  const getSparklineColor = (status: string) => {
    switch (status) {
      case 'good': return 'rgb(34, 197, 94)'
      case 'warning': return 'rgb(245, 158, 11)'
      case 'critical': return 'rgb(239, 68, 68)'
      default: return 'rgb(139, 92, 246)'
    }
  }

  const formatChange = (change: number) => {
    if (change > 0) return {
      icon: <TrendingUp className="w-4 h-4 text-green-400" />,
      color: 'text-green-400',
      prefix: '+'
    }
    if (change < 0) return {
      icon: <TrendingDown className="w-4 h-4 text-red-400" />,
      color: 'text-red-400',
      prefix: ''
    }
    return { icon: null, color: 'text-gray-400', prefix: '' }
  }

  const changeFormat = formatChange(metric.change)

  return (
    <motion.div
      className={`bg-slate-800/50 backdrop-blur-sm rounded-lg border-2 transition-all hover:scale-105 cursor-pointer
        ${getStatusColor(metric.status)} ${getStatusBg(metric.status)}
        ${compact ? 'p-4' : 'p-6'}`}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      layout
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-gray-400 flex items-center gap-2">
          {metric.icon}
          {!compact && (
            <span className="text-xs uppercase tracking-wide font-medium">
              {metric.title}
            </span>
          )}
        </div>

        {metric.change !== 0 && (
          <div className="flex items-center gap-1">
            {changeFormat.icon}
            <span className={`text-sm font-medium ${changeFormat.color}`}>
              {changeFormat.prefix}{Math.abs(metric.change).toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {/* Value */}
      <div className="mb-3">
        <div className={`font-bold ${compact ? 'text-xl' : 'text-2xl'} text-white mb-1`}>
          {metric.value}
          {metric.unit && <span className="text-sm text-gray-400 ml-1">{metric.unit}</span>}
        </div>
        {!compact && (
          <div className="text-sm text-gray-400">{metric.title}</div>
        )}
      </div>

      {/* Sparkline */}
      {showSparkline && metric.sparklineData.length > 0 && (
        <div className="mb-2">
          <Sparkline
            data={metric.sparklineData}
            color={getSparklineColor(metric.status)}
            width={compact ? 80 : 120}
            height={compact ? 20 : 30}
          />
        </div>
      )}

      {/* Change label */}
      {!compact && (
        <div className="text-xs text-gray-500">
          {metric.changeLabel}
        </div>
      )}

      {/* Target indicator */}
      {metric.target && (
        <div className="mt-2 pt-2 border-t border-slate-700">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Target</span>
            <span>{metric.target}{metric.unit || ''}</span>
          </div>
        </div>
      )}
    </motion.div>
  )
}

// Main MetricsPanel component
export const MetricsPanel = ({
  metrics,
  title = "System Metrics",
  refreshInterval = 30000, // 30 seconds
  onRefresh,
  showSparklines = true,
  compact = false,
  className = ""
}: MetricsPanelProps) => {
  const [isVisible, setIsVisible] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout>()

  // Auto-refresh functionality
  useEffect(() => {
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        setLastUpdate(new Date())
        onRefresh?.()
      }, refreshInterval)

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    }
  }, [refreshInterval, onRefresh])

  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    setLastUpdate(new Date())
    await onRefresh?.()
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  const toggleVisibility = () => {
    setIsVisible(!isVisible)
  }

  // Summary stats
  const totalMetrics = metrics.length
  const goodMetrics = metrics.filter(m => m.status === 'good').length
  const warningMetrics = metrics.filter(m => m.status === 'warning').length
  const criticalMetrics = metrics.filter(m => m.status === 'critical').length

  return (
    <div className={`${className}`}>
      {/* Header */}
      <motion.div
        className="flex items-center justify-between mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-white">{title}</h2>

          {/* Status summary */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-green-400">{goodMetrics}</span>
            <span className="text-gray-400">/</span>
            <span className="text-yellow-400">{warningMetrics}</span>
            <span className="text-gray-400">/</span>
            <span className="text-red-400">{criticalMetrics}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Last update time */}
          <div className="text-sm text-gray-400">
            Updated: {lastUpdate.toLocaleTimeString()}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
              title="Refresh metrics"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={toggleVisibility}
              className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              title={isVisible ? 'Hide metrics' : 'Show metrics'}
            >
              {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Metrics Grid */}
      <motion.div
        className={`grid gap-4 ${
          compact
            ? 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6'
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        }`}
        initial={false}
        animate={{ opacity: isVisible ? 1 : 0, height: isVisible ? 'auto' : 0 }}
        transition={{ duration: 0.3 }}
      >
        {isVisible && metrics.map((metric, index) => (
          <motion.div
            key={metric.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            layout
          >
            <MetricCard
              metric={metric}
              showSparkline={showSparklines}
              compact={compact}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Empty state */}
      {metrics.length === 0 && (
        <motion.div
          className="text-center py-12 text-gray-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No metrics available</p>
        </motion.div>
      )}
    </div>
  )
}

// Preset configurations for common use cases
export const createSystemMetrics = (): MetricData[] => [
  {
    id: 'response-time',
    title: 'Response Time',
    value: '124ms',
    change: -8.2,
    changeLabel: '8.2ms faster than last hour',
    status: 'good',
    icon: <Zap className="w-5 h-5" />,
    sparklineData: [145, 142, 138, 135, 132, 128, 124],
    unit: 'ms',
    target: 100
  },
  {
    id: 'active-agents',
    title: 'Active Agents',
    value: '5',
    change: 0,
    changeLabel: 'No change',
    status: 'warning',
    icon: <Users className="w-5 h-5" />,
    sparklineData: [6, 6, 5, 5, 5, 5, 5],
    target: 6
  },
  {
    id: 'cpu-usage',
    title: 'CPU Usage',
    value: '67',
    change: 5.2,
    changeLabel: '5.2% increase',
    status: 'good',
    icon: <Cpu className="w-5 h-5" />,
    sparklineData: [62, 64, 65, 66, 67, 68, 67],
    unit: '%',
    target: 80
  },
  {
    id: 'memory-usage',
    title: 'Memory Usage',
    value: '8.2',
    change: 2.1,
    changeLabel: '2.1% increase',
    status: 'good',
    icon: <Memory className="w-5 h-5" />,
    sparklineData: [7.8, 7.9, 8.0, 8.1, 8.1, 8.2, 8.2],
    unit: 'GB',
    target: 12
  }
]
