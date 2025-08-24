import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, startOfDay, endOfDay, subDays } from 'date-fns'
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XMarkIcon,
  UserIcon,
  CalendarIcon,
  GlobeAltIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'
import { useQuery } from '@apollo/client'
import { gql } from '@apollo/client'
import { AuditLogEntry, EnvironmentType, AuditLogFilters } from '../../types/deployment.types'
import { EnvironmentBadge } from './EnvironmentSelector'

interface AuditLogViewerProps {
  environment: EnvironmentType
}

const GET_AUDIT_LOGS = gql`
  query GetAuditLogs(
    $first: Int
    $after: String
    $filters: AuditLogFilters
  ) {
    auditLogs(first: $first, after: $after, filters: $filters) {
      edges {
        node {
          id
          timestamp
          user
          action
          resource
          resourceId
          environment
          details
          ipAddress
          userAgent
          outcome
          severity
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      totalCount
    }
  }
`

const severityConfig = {
  low: {
    icon: InformationCircleIcon,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    label: 'Low'
  },
  medium: {
    icon: ExclamationTriangleIcon,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    label: 'Medium'
  },
  high: {
    icon: ExclamationTriangleIcon,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    label: 'High'
  },
  critical: {
    icon: ShieldExclamationIcon,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    label: 'Critical'
  }
}

const outcomeConfig = {
  success: {
    icon: CheckCircleIcon,
    color: 'text-green-400',
    label: 'Success'
  },
  failure: {
    icon: XMarkIcon,
    color: 'text-red-400',
    label: 'Failure'
  },
  partial: {
    icon: ExclamationTriangleIcon,
    color: 'text-yellow-400',
    label: 'Partial'
  }
}

function AuditLogEntry({
  entry,
  onExpand,
  expanded
}: {
  entry: AuditLogEntry
  onExpand: () => void
  expanded: boolean
}) {
  const severityConf = severityConfig[entry.severity]
  const outcomeConf = outcomeConfig[entry.outcome]

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        glass-card hover:border-primary/30 transition-all duration-200 cursor-pointer
        ${entry.severity === 'critical' ? 'ring-1 ring-red-500/30' : ''}
        ${entry.severity === 'high' ? 'ring-1 ring-orange-500/30' : ''}
      `}
      onClick={onExpand}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`p-2 ${severityConf.bgColor} rounded-lg flex-shrink-0`}>
            <severityConf.icon className={`w-4 h-4 ${severityConf.color}`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground truncate">
                {entry.action}
              </h3>
              <EnvironmentBadge environment={entry.environment} showStatus={false} />
              <div className="flex items-center gap-1">
                <outcomeConf.icon className={`w-3 h-3 ${outcomeConf.color}`} />
                <span className={`text-xs font-medium ${outcomeConf.color}`}>
                  {outcomeConf.label}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <UserIcon className="w-3 h-3" />
                <span className="truncate max-w-[120px]">{entry.user}</span>
              </div>
              <div className="flex items-center gap-1">
                <GlobeAltIcon className="w-3 h-3" />
                <span className="truncate max-w-[100px]">{entry.resource}</span>
              </div>
              <div className="flex items-center gap-1">
                <CalendarIcon className="w-3 h-3" />
                <span>{format(new Date(entry.timestamp), 'MMM d, HH:mm')}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${severityConf.bgColor} ${severityConf.color}`}>
            {severityConf.label}
          </span>
          {expanded ? (
            <ChevronDownIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          ) : (
            <ChevronRightIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          )}
        </div>
      </div>

      {/* Resource Info */}
      <div className="mb-3 p-2 bg-muted/20 rounded text-sm">
        <span className="text-muted-foreground">Resource: </span>
        <span className="text-foreground font-mono">{entry.resource}</span>
        {entry.resourceId && (
          <>
            <span className="text-muted-foreground"> • ID: </span>
            <span className="text-foreground font-mono">{entry.resourceId}</span>
          </>
        )}
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-border"
          >
            <div className="space-y-4">
              {/* Timestamp and User Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Timestamp:</span>
                  <div className="text-foreground font-mono">
                    {format(new Date(entry.timestamp), 'PPpp')}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">User:</span>
                  <div className="text-foreground">{entry.user}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">IP Address:</span>
                  <div className="text-foreground font-mono">{entry.ipAddress}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Outcome:</span>
                  <div className={`font-medium ${outcomeConf.color}`}>
                    {outcomeConf.label}
                  </div>
                </div>
              </div>

              {/* User Agent */}
              <div className="text-sm">
                <span className="text-muted-foreground">User Agent:</span>
                <div className="text-foreground font-mono text-xs mt-1 p-2 bg-muted/20 rounded break-all">
                  {entry.userAgent}
                </div>
              </div>

              {/* Details */}
              {entry.details && Object.keys(entry.details).length > 0 && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Details:</span>
                  <div className="mt-2 p-3 bg-muted/20 rounded">
                    <pre className="text-xs text-foreground font-mono whitespace-pre-wrap overflow-x-auto">
                      {JSON.stringify(entry.details, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function FilterPanel({
  filters,
  onFiltersChange,
  onClose
}: {
  filters: AuditLogFilters
  onFiltersChange: (filters: AuditLogFilters) => void
  onClose: () => void
}) {
  const [localFilters, setLocalFilters] = useState<AuditLogFilters>(filters)

  const applyFilters = () => {
    onFiltersChange(localFilters)
    onClose()
  }

  const clearFilters = () => {
    const emptyFilters: AuditLogFilters = {}
    setLocalFilters(emptyFilters)
    onFiltersChange(emptyFilters)
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="glass-card max-w-sm w-full"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Filters</h3>
        <button
          onClick={onClose}
          className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
        >
          <XMarkIcon className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="space-y-6">
        {/* Date Range */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Date Range</label>
          <div className="space-y-3">
            <input
              type="date"
              value={localFilters.dateRange?.start ? format(new Date(localFilters.dateRange.start), 'yyyy-MM-dd') : ''}
              onChange={(e) => setLocalFilters({
                ...localFilters,
                dateRange: {
                  ...localFilters.dateRange,
                  start: e.target.value ? startOfDay(new Date(e.target.value)).toISOString() : '',
                  end: localFilters.dateRange?.end || ''
                }
              })}
              className="w-full px-3 py-2 bg-muted/50 border border-border rounded text-foreground
                       focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
            />
            <input
              type="date"
              value={localFilters.dateRange?.end ? format(new Date(localFilters.dateRange.end), 'yyyy-MM-dd') : ''}
              onChange={(e) => setLocalFilters({
                ...localFilters,
                dateRange: {
                  start: localFilters.dateRange?.start || '',
                  end: e.target.value ? endOfDay(new Date(e.target.value)).toISOString() : ''
                }
              })}
              className="w-full px-3 py-2 bg-muted/50 border border-border rounded text-foreground
                       focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
            />
          </div>
        </div>

        {/* Severity */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Severity</label>
          <div className="space-y-2">
            {Object.entries(severityConfig).map(([severity, config]) => (
              <label key={severity} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={localFilters.severity?.includes(severity as any) || false}
                  onChange={(e) => {
                    const currentSeverity = localFilters.severity || []
                    if (e.target.checked) {
                      setLocalFilters({
                        ...localFilters,
                        severity: [...currentSeverity, severity as any]
                      })
                    } else {
                      setLocalFilters({
                        ...localFilters,
                        severity: currentSeverity.filter(s => s !== severity)
                      })
                    }
                  }}
                  className="rounded border-border text-primary focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                />
                <span className={`text-sm ${config.color}`}>{config.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Outcome */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Outcome</label>
          <div className="space-y-2">
            {Object.entries(outcomeConfig).map(([outcome, config]) => (
              <label key={outcome} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={localFilters.outcome?.includes(outcome as any) || false}
                  onChange={(e) => {
                    const currentOutcome = localFilters.outcome || []
                    if (e.target.checked) {
                      setLocalFilters({
                        ...localFilters,
                        outcome: [...currentOutcome, outcome as any]
                      })
                    } else {
                      setLocalFilters({
                        ...localFilters,
                        outcome: currentOutcome.filter(o => o !== outcome)
                      })
                    }
                  }}
                  className="rounded border-border text-primary focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                />
                <span className={`text-sm ${config.color}`}>{config.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* User */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">User</label>
          <input
            type="text"
            placeholder="Filter by user..."
            value={localFilters.user?.join(', ') || ''}
            onChange={(e) => setLocalFilters({
              ...localFilters,
              user: e.target.value ? e.target.value.split(',').map(u => u.trim()) : undefined
            })}
            className="w-full px-3 py-2 bg-muted/50 border border-border rounded text-foreground placeholder-muted-foreground
                     focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
          />
        </div>

        {/* Action */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Action</label>
          <input
            type="text"
            placeholder="Filter by action..."
            value={localFilters.action?.join(', ') || ''}
            onChange={(e) => setLocalFilters({
              ...localFilters,
              action: e.target.value ? e.target.value.split(',').map(a => a.trim()) : undefined
            })}
            className="w-full px-3 py-2 bg-muted/50 border border-border rounded text-foreground placeholder-muted-foreground
                     focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 mt-8">
        <button
          onClick={applyFilters}
          className="flex-1 px-4 py-2 bg-primary hover:bg-primary/80 text-primary-foreground
                   font-medium rounded-lg transition-colors"
        >
          Apply Filters
        </button>
        <button
          onClick={clearFilters}
          className="px-4 py-2 border border-border hover:bg-muted/50 text-muted-foreground
                   hover:text-foreground rounded-lg transition-colors"
        >
          Clear
        </button>
      </div>
    </motion.div>
  )
}

export function AuditLogViewer({ environment }: AuditLogViewerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<AuditLogFilters>({ environment: [environment] })
  const [showFilters, setShowFilters] = useState(false)
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set())

  const { data, loading, refetch, fetchMore } = useQuery(GET_AUDIT_LOGS, {
    variables: {
      first: 20,
      filters: {
        ...filters,
        environment: [environment] // Always filter by current environment
      }
    }
  })

  useEffect(() => {
    setFilters(prev => ({ ...prev, environment: [environment] }))
  }, [environment])

  const auditLogs = data?.auditLogs?.edges?.map((edge: any) => edge.node) || []
  const hasNextPage = data?.auditLogs?.pageInfo?.hasNextPage
  const totalCount = data?.auditLogs?.totalCount || 0

  const toggleExpanded = (entryId: string) => {
    setExpandedEntries(prev => {
      const newSet = new Set(prev)
      if (newSet.has(entryId)) {
        newSet.delete(entryId)
      } else {
        newSet.add(entryId)
      }
      return newSet
    })
  }

  const loadMore = async () => {
    if (hasNextPage) {
      await fetchMore({
        variables: {
          after: data?.auditLogs?.pageInfo?.endCursor
        }
      })
    }
  }

  // Quick filter presets
  const quickFilters = [
    {
      label: 'Last 24 Hours',
      onClick: () => setFilters({
        ...filters,
        dateRange: {
          start: subDays(new Date(), 1).toISOString(),
          end: new Date().toISOString()
        }
      })
    },
    {
      label: 'Critical Only',
      onClick: () => setFilters({
        ...filters,
        severity: ['critical']
      })
    },
    {
      label: 'Failures',
      onClick: () => setFilters({
        ...filters,
        outcome: ['failure']
      })
    },
    {
      label: 'Deployments',
      onClick: () => setFilters({
        ...filters,
        action: ['deploy', 'rollback', 'cancel_deployment']
      })
    }
  ]

  // Filter logs by search term
  const filteredLogs = auditLogs.filter((log: AuditLogEntry) => {
    if (!searchTerm) return true

    const searchLower = searchTerm.toLowerCase()
    return (
      log.action.toLowerCase().includes(searchLower) ||
      log.user.toLowerCase().includes(searchLower) ||
      log.resource.toLowerCase().includes(searchLower) ||
      (log.resourceId && log.resourceId.toLowerCase().includes(searchLower))
    )
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Audit Logs</h2>
          <p className="text-sm text-muted-foreground">
            Security and activity logs for the {environment} environment
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="p-2 hover:bg-muted/50 rounded-lg transition-colors"
            aria-label="Refresh logs"
          >
            <ArrowPathIcon className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-border rounded-lg
                     text-foreground placeholder-muted-foreground
                     focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 bg-muted/50 hover:bg-muted/70
                   border border-border rounded-lg text-muted-foreground hover:text-foreground
                   transition-colors"
        >
          <FunnelIcon className="w-4 h-4" />
          Filters
        </button>
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        {quickFilters.map((filter) => (
          <button
            key={filter.label}
            onClick={filter.onClick}
            className="px-3 py-1.5 text-sm bg-muted/50 hover:bg-muted/70 text-muted-foreground
                     hover:text-foreground rounded-lg transition-colors"
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Logs List */}
        <div className="flex-1 space-y-4">
          {/* Stats */}
          <div className="text-sm text-muted-foreground">
            Showing {filteredLogs.length} of {totalCount} logs
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="glass-card text-center py-12">
              <DocumentTextIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Logs Found</h3>
              <p className="text-muted-foreground">
                No audit logs match your search criteria.
              </p>
            </div>
          ) : (
            <>
              {filteredLogs.map((entry: AuditLogEntry) => (
                <AuditLogEntry
                  key={entry.id}
                  entry={entry}
                  expanded={expandedEntries.has(entry.id)}
                  onExpand={() => toggleExpanded(entry.id)}
                />
              ))}

              {hasNextPage && (
                <div className="text-center">
                  <button
                    onClick={loadMore}
                    className="px-6 py-2 bg-primary hover:bg-primary/80 text-primary-foreground
                             font-medium rounded-lg transition-colors"
                  >
                    Load More
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <FilterPanel
              filters={filters}
              onFiltersChange={setFilters}
              onClose={() => setShowFilters(false)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
