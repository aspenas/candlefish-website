import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  QuestionMarkCircleIcon,
  ArrowPathIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ClockIcon,
  CpuChipIcon,
  CircleStackIcon,
  GlobeAltIcon,
  CloudIcon
} from '@heroicons/react/24/outline'
import { HealthCheck } from '../../types/deployment.types'
import { LoadingScreen } from '../common/LoadingSpinner'

interface HealthStatusGridProps {
  healthChecks: HealthCheck[]
  loading?: boolean
  expanded?: boolean
  onRefresh?: () => void
  autoRefresh?: boolean
}

const statusConfig = {
  healthy: {
    icon: CheckCircleIcon,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    label: 'Healthy',
    description: 'Service is operating normally'
  },
  warning: {
    icon: ExclamationTriangleIcon,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    label: 'Warning',
    description: 'Service has non-critical issues'
  },
  critical: {
    icon: XCircleIcon,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    label: 'Critical',
    description: 'Service is experiencing critical issues'
  },
  unknown: {
    icon: QuestionMarkCircleIcon,
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
    label: 'Unknown',
    description: 'Service status could not be determined'
  }
}

const serviceIcons = {
  'api': CpuChipIcon,
  'database': CircleStackIcon,
  'frontend': GlobeAltIcon,
  'cache': CloudIcon,
  'queue': CircleStackIcon,
  'auth': CheckCircleIcon,
  'storage': CircleStackIcon,
  'monitoring': ChartIcon,
  'default': CpuChipIcon
} as const

// Chart icon placeholder (would normally import from a chart library)
function ChartIcon({ className }: { className: string }) {
  return <div className={`${className} bg-current rounded`} />
}

function getServiceIcon(serviceName: string) {
  const normalizedName = serviceName.toLowerCase()
  for (const [key, IconComponent] of Object.entries(serviceIcons)) {
    if (normalizedName.includes(key)) {
      return IconComponent
    }
  }
  return serviceIcons.default
}

function HealthStatusCard({
  healthCheck,
  expanded = false,
  onToggleExpand
}: {
  healthCheck: HealthCheck
  expanded?: boolean
  onToggleExpand?: () => void
}) {
  const config = statusConfig[healthCheck.status]
  const ServiceIcon = getServiceIcon(healthCheck.service)

  const getResponseTimeColor = (responseTime: number) => {
    if (responseTime < 200) return 'text-green-400'
    if (responseTime < 500) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getResponseTimeLabel = (responseTime: number) => {
    if (responseTime < 200) return 'Excellent'
    if (responseTime < 500) return 'Good'
    if (responseTime < 1000) return 'Fair'
    return 'Poor'
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        glass-card hover:border-primary/30 transition-all duration-200
        ${healthCheck.status === 'critical' ? 'ring-1 ring-red-500/30' : ''}
        ${healthCheck.status === 'warning' ? 'ring-1 ring-yellow-500/30' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-muted/30 rounded-lg">
            <ServiceIcon className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{healthCheck.service}</h3>
            <p className="text-sm text-muted-foreground truncate max-w-[200px]">
              {healthCheck.endpoint}
            </p>
          </div>
        </div>

        {onToggleExpand && (
          <button
            onClick={onToggleExpand}
            className="p-1 hover:bg-muted/50 rounded transition-colors"
          >
            {expanded ? (
              <ChevronDownIcon className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRightIcon className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        )}
      </div>

      {/* Status */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 ${config.bgColor} rounded-lg`}>
            <config.icon className={`w-4 h-4 ${config.color}`} />
          </div>
          <span className={`text-sm font-medium ${config.color}`}>
            {config.label}
          </span>
        </div>

        <div className="text-right">
          <div className={`text-sm font-mono ${getResponseTimeColor(healthCheck.responseTime)}`}>
            {healthCheck.responseTime}ms
          </div>
          <div className="text-xs text-muted-foreground">
            {getResponseTimeLabel(healthCheck.responseTime)}
          </div>
        </div>
      </div>

      {/* Message */}
      {healthCheck.message && (
        <div className="mb-4 p-3 bg-muted/20 rounded-lg">
          <p className="text-sm text-foreground">{healthCheck.message}</p>
        </div>
      )}

      {/* Last Checked */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <ClockIcon className="w-3 h-3" />
          Last checked
        </div>
        <span>
          {formatDistanceToNow(new Date(healthCheck.lastChecked), { addSuffix: true })}
        </span>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && healthCheck.details && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-border"
          >
            <h4 className="text-sm font-medium text-foreground mb-3">Details</h4>
            <div className="space-y-2">
              {Object.entries(healthCheck.details).map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-muted-foreground capitalize">
                    {key.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                  </span>
                  <span className="text-foreground font-mono">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function HealthStatusGrid({
  healthChecks,
  loading = false,
  expanded = false,
  onRefresh,
  autoRefresh = true
}: HealthStatusGridProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [lastRefresh, setLastRefresh] = useState(new Date())

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh || !onRefresh) return

    const interval = setInterval(() => {
      onRefresh()
      setLastRefresh(new Date())
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [autoRefresh, onRefresh])

  const toggleExpanded = (service: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(service)) {
        newSet.delete(service)
      } else {
        newSet.add(service)
      }
      return newSet
    })
  }

  // Calculate status summary
  const statusSummary = healthChecks.reduce((acc, check) => {
    acc[check.status] = (acc[check.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const averageResponseTime = healthChecks.length > 0
    ? healthChecks.reduce((sum, check) => sum + check.responseTime, 0) / healthChecks.length
    : 0

  if (loading) {
    return <LoadingScreen />
  }

  if (healthChecks.length === 0) {
    return (
      <div className="glass-card text-center py-12">
        <QuestionMarkCircleIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No Health Checks</h3>
        <p className="text-muted-foreground">
          No health check data available at this time.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">
          Health Status {expanded && '- Detailed View'}
        </h2>

        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">
            Last updated: {formatDistanceToNow(lastRefresh, { addSuffix: true })}
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
              aria-label="Refresh health status"
            >
              <ArrowPathIcon className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card text-center">
          <div className="text-2xl font-bold text-green-400 mb-1">
            {statusSummary.healthy || 0}
          </div>
          <div className="text-sm text-muted-foreground">Healthy</div>
        </div>

        <div className="glass-card text-center">
          <div className="text-2xl font-bold text-yellow-400 mb-1">
            {statusSummary.warning || 0}
          </div>
          <div className="text-sm text-muted-foreground">Warnings</div>
        </div>

        <div className="glass-card text-center">
          <div className="text-2xl font-bold text-red-400 mb-1">
            {statusSummary.critical || 0}
          </div>
          <div className="text-sm text-muted-foreground">Critical</div>
        </div>

        <div className="glass-card text-center">
          <div className="text-2xl font-bold text-foreground mb-1">
            {Math.round(averageResponseTime)}ms
          </div>
          <div className="text-sm text-muted-foreground">Avg Response</div>
        </div>
      </div>

      {/* Health Check Grid */}
      <div className={`
        grid gap-4
        ${expanded ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'}
      `}>
        {healthChecks
          .sort((a, b) => {
            // Sort by status priority: critical > warning > unknown > healthy
            const priorityOrder = { critical: 0, warning: 1, unknown: 2, healthy: 3 }
            return priorityOrder[a.status] - priorityOrder[b.status]
          })
          .map((healthCheck) => (
            <HealthStatusCard
              key={healthCheck.service}
              healthCheck={healthCheck}
              expanded={expanded || expandedItems.has(healthCheck.service)}
              onToggleExpand={expanded ? undefined : () => toggleExpanded(healthCheck.service)}
            />
          ))}
      </div>
    </div>
  )
}
