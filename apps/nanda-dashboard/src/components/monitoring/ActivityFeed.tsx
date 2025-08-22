import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import {
  CheckCircle,
  AlertCircle,
  XCircle,
  Info,
  Wrench,
  Search,
  Zap,
  Cloud
} from 'lucide-react'
import type { ActivityItem } from '../../hooks/useRealtimeData'

interface ActivityFeedProps {
  activities: ActivityItem[]
  maxItems?: number
  showFilters?: boolean
}

const ActivityIcon = ({ type, severity }: { type: ActivityItem['type'], severity: ActivityItem['severity'] }) => {
  const iconProps = {
    className: "w-4 h-4",
    strokeWidth: 2
  }

  const getIcon = () => {
    switch (type) {
      case 'agent_registered':
        return <CheckCircle {...iconProps} />
      case 'agent_online':
        return <Zap {...iconProps} />
      case 'agent_offline':
        return <Cloud {...iconProps} />
      case 'error':
        return <XCircle {...iconProps} />
      case 'maintenance':
        return <Wrench {...iconProps} />
      case 'discovery':
        return <Search {...iconProps} />
      default:
        return <Info {...iconProps} />
    }
  }

  const getColorClasses = () => {
    switch (severity) {
      case 'success':
        return 'text-green-400 bg-green-500/20 border-green-500/30'
      case 'warning':
        return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30'
      case 'error':
        return 'text-red-400 bg-red-500/20 border-red-500/30'
      case 'info':
      default:
        return 'text-blue-400 bg-blue-500/20 border-blue-500/30'
    }
  }

  return (
    <div className={`
      activity-icon border-2 ${getColorClasses()}
      shadow-lg shadow-current/20
    `}>
      {getIcon()}
    </div>
  )
}

const ActivityFilters = ({
  selectedTypes,
  selectedSeverities,
  onTypeToggle,
  onSeverityToggle
}: {
  selectedTypes: ActivityItem['type'][]
  selectedSeverities: ActivityItem['severity'][]
  onTypeToggle: (type: ActivityItem['type']) => void
  onSeverityToggle: (severity: ActivityItem['severity']) => void
}) => {
  const types: { value: ActivityItem['type'], label: string }[] = [
    { value: 'agent_registered', label: 'Registered' },
    { value: 'agent_online', label: 'Online' },
    { value: 'agent_offline', label: 'Offline' },
    { value: 'error', label: 'Errors' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'discovery', label: 'Discovery' }
  ]

  const severities: { value: ActivityItem['severity'], label: string, color: string }[] = [
    { value: 'success', label: 'Success', color: 'text-green-400 border-green-400/30' },
    { value: 'info', label: 'Info', color: 'text-blue-400 border-blue-400/30' },
    { value: 'warning', label: 'Warning', color: 'text-yellow-400 border-yellow-400/30' },
    { value: 'error', label: 'Error', color: 'text-red-400 border-red-400/30' }
  ]

  return (
    <div className="space-y-4 p-4 border-t border-border/50">
      <div>
        <h4 className="text-sm font-medium text-foreground mb-2">Filter by Type</h4>
        <div className="flex flex-wrap gap-2">
          {types.map(type => (
            <button
              key={type.value}
              onClick={() => onTypeToggle(type.value)}
              className={`
                px-3 py-1 text-xs rounded-full border transition-all
                ${selectedTypes.includes(type.value)
                  ? 'bg-primary/20 text-primary border-primary/30'
                  : 'bg-muted/50 text-muted-foreground border-border hover:border-primary/30'
                }
              `}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-foreground mb-2">Filter by Severity</h4>
        <div className="flex flex-wrap gap-2">
          {severities.map(severity => (
            <button
              key={severity.value}
              onClick={() => onSeverityToggle(severity.value)}
              className={`
                px-3 py-1 text-xs rounded-full border transition-all
                ${selectedSeverities.includes(severity.value)
                  ? `bg-current/20 border-current/30 ${severity.color}`
                  : 'bg-muted/50 text-muted-foreground border-border hover:border-current/30'
                }
              `}
            >
              {severity.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ActivityFeed({ activities, maxItems = 50, showFilters = true }: ActivityFeedProps) {
  const [selectedTypes, setSelectedTypes] = useState<ActivityItem['type'][]>([
    'agent_registered', 'agent_online', 'agent_offline', 'error', 'maintenance', 'discovery'
  ])
  const [selectedSeverities, setSelectedSeverities] = useState<ActivityItem['severity'][]>([
    'success', 'info', 'warning', 'error'
  ])
  const [showFilterPanel, setShowFilterPanel] = useState(false)

  const filteredActivities = activities
    .filter(activity => selectedTypes.includes(activity.type))
    .filter(activity => selectedSeverities.includes(activity.severity))
    .slice(0, maxItems)

  const handleTypeToggle = (type: ActivityItem['type']) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    )
  }

  const handleSeverityToggle = (severity: ActivityItem['severity']) => {
    setSelectedSeverities(prev =>
      prev.includes(severity)
        ? prev.filter(s => s !== severity)
        : [...prev, severity]
    )
  }

  const getRelativeTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  return (
    <div className="glass-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Activity Feed</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredActivities.length} recent events
          </p>
        </div>
        {showFilters && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>Live</span>
            </div>
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className="btn-primary text-xs px-3 py-1"
            >
              Filters
            </button>
          </div>
        )}
      </div>

      {showFilterPanel && showFilters && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden"
        >
          <ActivityFilters
            selectedTypes={selectedTypes}
            selectedSeverities={selectedSeverities}
            onTypeToggle={handleTypeToggle}
            onSeverityToggle={handleSeverityToggle}
          />
        </motion.div>
      )}

      <div className="activity-feed" role="log" aria-live="polite" aria-label="Live activity feed">
        <AnimatePresence>
          {filteredActivities.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="activity-item group relative"
            >
              <ActivityIcon type={activity.type} severity={activity.severity} />

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      {activity.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {activity.agentName && (
                        <span className="text-xs text-muted-foreground">
                          Agent: {activity.agentName}
                        </span>
                      )}
                      {activity.platform && (
                        <span className="text-xs px-2 py-0.5 bg-muted/50 text-muted-foreground rounded-full">
                          {activity.platform}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                    <time dateTime={activity.timestamp.toISOString()}>
                      {getRelativeTime(activity.timestamp)}
                    </time>
                    <time dateTime={activity.timestamp.toISOString()} className="opacity-60">
                      {format(activity.timestamp, 'HH:mm')}
                    </time>
                  </div>
                </div>
              </div>

              {/* Hover effect */}
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg pointer-events-none" />

              {/* New activity indicator */}
              {index < 3 && (
                <div className="absolute -top-1 -left-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredActivities.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <InformationCircleIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No activities match the selected filters.</p>
          </div>
        )}
      </div>

      {filteredActivities.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border/50 text-center">
          <button className="text-xs text-muted-foreground hover:text-primary transition-colors">
            View all activity →
          </button>
        </div>
      )}
    </div>
  )
}
