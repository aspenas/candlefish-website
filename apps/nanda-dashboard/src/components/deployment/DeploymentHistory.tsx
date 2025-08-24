import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow, format } from 'date-fns'
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
  XCircleIcon,
  RocketLaunchIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PlayIcon,
  StopIcon
} from '@heroicons/react/24/outline'
import {
  GitBranchIcon,
  GitCommitIcon,
  UserIcon,
  CalendarIcon,
  ClockIcon as ClockSolid
} from '@heroicons/react/24/solid'
import { Deployment, EnvironmentType, DeploymentStatus } from '../../types/deployment.types'
import { EnvironmentBadge } from './EnvironmentSelector'

interface DeploymentHistoryProps {
  deployments: Deployment[]
  environment: EnvironmentType
  onDeploymentSelect?: (deploymentId: string) => void
  showAll?: boolean
  maxItems?: number
}

const statusConfig = {
  pending: {
    icon: ClockIcon,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    label: 'Pending'
  },
  running: {
    icon: PlayIcon,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    label: 'Running'
  },
  deploying: {
    icon: RocketLaunchIcon,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    label: 'Deploying'
  },
  testing: {
    icon: ClockIcon,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    label: 'Testing'
  },
  completed: {
    icon: CheckCircleIcon,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    label: 'Completed'
  },
  failed: {
    icon: XCircleIcon,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    label: 'Failed'
  },
  rolled_back: {
    icon: ArrowPathIcon,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    label: 'Rolled Back'
  },
  cancelled: {
    icon: StopIcon,
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
    label: 'Cancelled'
  }
}

function DeploymentCard({
  deployment,
  onSelect,
  isExpanded,
  onToggleExpand
}: {
  deployment: Deployment
  onSelect?: (id: string) => void
  isExpanded: boolean
  onToggleExpand: () => void
}) {
  const config = statusConfig[deployment.status]
  const isActive = ['pending', 'running', 'deploying', 'testing'].includes(deployment.status)

  const formatDuration = (duration?: number) => {
    if (!duration) return 'N/A'
    const minutes = Math.floor(duration / 60000)
    const seconds = Math.floor((duration % 60000) / 1000)
    return `${minutes}m ${seconds}s`
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        glass-card hover:border-primary/30 transition-all duration-200 cursor-pointer
        ${isActive ? 'ring-1 ring-primary/30' : ''}
      `}
      onClick={() => onSelect?.(deployment.id)}
    >
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div className={`p-2 ${config.bgColor} rounded-lg`}>
          <config.icon className={`w-5 h-5 ${config.color}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-foreground truncate">
              {deployment.service} v{deployment.version}
            </h3>
            <EnvironmentBadge environment={deployment.environment.name} />
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.bgColor} ${config.color}`}>
              {config.label}
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <UserIcon className="w-4 h-4" />
              {deployment.triggeredBy}
            </div>
            <div className="flex items-center gap-1">
              <CalendarIcon className="w-4 h-4" />
              {formatDistanceToNow(new Date(deployment.triggeredAt), { addSuffix: true })}
            </div>
            {deployment.duration && (
              <div className="flex items-center gap-1">
                <ClockSolid className="w-4 h-4" />
                {formatDuration(deployment.duration)}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleExpand()
          }}
          className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
        >
          {isExpanded ? (
            <ChevronDownIcon className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRightIcon className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Commit Info */}
      <div className="flex items-center gap-2 mb-4 p-3 bg-muted/20 rounded-lg">
        <GitBranchIcon className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-mono text-muted-foreground">{deployment.branch}</span>
        <GitCommitIcon className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-mono text-muted-foreground">
          {deployment.commitSha.substring(0, 8)}
        </span>
        <span className="text-sm text-muted-foreground truncate flex-1">
          {deployment.commitMessage}
        </span>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-lg font-semibold text-foreground">
            {deployment.metrics.successRate.toFixed(1)}%
          </div>
          <div className="text-xs text-muted-foreground">Success Rate</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-foreground">
            {deployment.metrics.errorCount}
          </div>
          <div className="text-xs text-muted-foreground">Errors</div>
        </div>
        <div>
          <div className="text-lg font-semibold text-foreground">
            {deployment.healthChecks.filter(hc => hc.status === 'healthy').length}/{deployment.healthChecks.length}
          </div>
          <div className="text-xs text-muted-foreground">Health Checks</div>
        </div>
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6 pt-6 border-t border-border"
          >
            {/* Timeline */}
            <div className="space-y-4 mb-6">
              <h4 className="text-sm font-medium text-foreground">Timeline</h4>
              <div className="space-y-3">
                {deployment.startedAt && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-blue-400 rounded-full" />
                    <span className="text-muted-foreground">Started:</span>
                    <span className="text-foreground">{format(new Date(deployment.startedAt), 'PPp')}</span>
                  </div>
                )}
                {deployment.completedAt && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className={`w-2 h-2 rounded-full ${
                      deployment.status === 'completed' ? 'bg-green-400' : 'bg-red-400'
                    }`} />
                    <span className="text-muted-foreground">Completed:</span>
                    <span className="text-foreground">{format(new Date(deployment.completedAt), 'PPp')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Health Checks */}
            {deployment.healthChecks.length > 0 && (
              <div className="space-y-4 mb-6">
                <h4 className="text-sm font-medium text-foreground">Health Checks</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {deployment.healthChecks.slice(0, 4).map((check, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted/20 rounded-lg"
                    >
                      <span className="text-sm text-foreground">{check.service}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {check.responseTime}ms
                        </span>
                        <div className={`w-2 h-2 rounded-full ${
                          check.status === 'healthy' ? 'bg-green-400' :
                          check.status === 'warning' ? 'bg-yellow-400' : 'bg-red-400'
                        }`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Performance Metrics */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-foreground">Performance</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Build Time</span>
                    <span className="text-foreground">{formatDuration(deployment.metrics.performance.buildTime)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Test Time</span>
                    <span className="text-foreground">{formatDuration(deployment.metrics.performance.testTime)}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Deploy Time</span>
                    <span className="text-foreground">{formatDuration(deployment.metrics.performance.deployTime)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Health Check</span>
                    <span className="text-foreground">{formatDuration(deployment.metrics.performance.healthCheckTime)}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function DeploymentHistory({
  deployments,
  environment,
  onDeploymentSelect,
  showAll = false,
  maxItems = 5
}: DeploymentHistoryProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const displayedDeployments = showAll
    ? deployments
    : deployments.slice(0, maxItems)

  const toggleExpanded = (deploymentId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(deploymentId)) {
        newSet.delete(deploymentId)
      } else {
        newSet.add(deploymentId)
      }
      return newSet
    })
  }

  if (deployments.length === 0) {
    return (
      <div className="glass-card text-center py-12">
        <RocketLaunchIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No Deployments</h3>
        <p className="text-muted-foreground">
          No deployments found for the {environment} environment.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">
          {showAll ? 'All Deployments' : 'Recent Deployments'}
        </h2>
        <div className="text-sm text-muted-foreground">
          {deployments.length} deployment{deployments.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="space-y-4">
        {displayedDeployments.map((deployment) => (
          <DeploymentCard
            key={deployment.id}
            deployment={deployment}
            onSelect={onDeploymentSelect}
            isExpanded={expandedItems.has(deployment.id)}
            onToggleExpand={() => toggleExpanded(deployment.id)}
          />
        ))}
      </div>

      {!showAll && deployments.length > maxItems && (
        <div className="text-center">
          <button className="btn-secondary">
            View All {deployments.length} Deployments
          </button>
        </div>
      )}
    </div>
  )
}
