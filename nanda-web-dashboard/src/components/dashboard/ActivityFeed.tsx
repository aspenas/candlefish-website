'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Zap,
  Clock,
  Filter,
  Pause,
  Play,
  Download,
  Search,
  RefreshCw,
  User,
  Server,
  Database,
  Network,
  Code,
  Settings
} from 'lucide-react'

export interface ActivityEvent {
  id: string
  timestamp: string
  type: 'success' | 'error' | 'warning' | 'info' | 'system'
  category: 'agent' | 'deployment' | 'system' | 'user' | 'api' | 'database'
  title: string
  message: string
  details?: Record<string, any>
  agentId?: string
  userId?: string
  duration?: number
  metadata?: {
    source?: string
    version?: string
    environment?: string
    [key: string]: any
  }
}

export interface ActivityFeedProps {
  events?: ActivityEvent[]
  maxEvents?: number
  autoRefresh?: boolean
  refreshInterval?: number
  onEventClick?: (event: ActivityEvent) => void
  onRefresh?: () => void
  showFilters?: boolean
  showSearch?: boolean
  className?: string
  height?: string | number
  realTime?: boolean
}

// Event type icons
const getEventIcon = (type: string, category: string) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="w-4 h-4 text-green-400" />
    case 'error':
      return <XCircle className="w-4 h-4 text-red-400" />
    case 'warning':
      return <AlertTriangle className="w-4 h-4 text-yellow-400" />
    case 'info':
      return <Info className="w-4 h-4 text-blue-400" />
    case 'system':
      switch (category) {
        case 'agent': return <Zap className="w-4 h-4 text-purple-400" />
        case 'deployment': return <Server className="w-4 h-4 text-green-400" />
        case 'database': return <Database className="w-4 h-4 text-orange-400" />
        case 'api': return <Network className="w-4 h-4 text-blue-400" />
        case 'user': return <User className="w-4 h-4 text-gray-400" />
        default: return <Settings className="w-4 h-4 text-gray-400" />
      }
    default:
      return <Activity className="w-4 h-4 text-gray-400" />
  }
}

// Event type colors
const getEventColor = (type: string) => {
  switch (type) {
    case 'success': return 'border-l-green-400 bg-green-400/5'
    case 'error': return 'border-l-red-400 bg-red-400/5'
    case 'warning': return 'border-l-yellow-400 bg-yellow-400/5'
    case 'info': return 'border-l-blue-400 bg-blue-400/5'
    case 'system': return 'border-l-purple-400 bg-purple-400/5'
    default: return 'border-l-gray-400 bg-gray-400/5'
  }
}

// Time formatting utilities
const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  return date.toLocaleDateString()
}

const formatDuration = (duration?: number) => {
  if (!duration) return null
  if (duration < 1000) return `${duration}ms`
  return `${(duration / 1000).toFixed(1)}s`
}

// Individual activity event component
const ActivityEventItem = ({
  event,
  onClick
}: {
  event: ActivityEvent
  onClick?: (event: ActivityEvent) => void
}) => {
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      className={`border-l-4 p-4 rounded-r-lg transition-all cursor-pointer hover:bg-slate-800/30 ${getEventColor(event.type)}`}
      onClick={() => onClick?.(event)}
      onDoubleClick={() => setExpanded(!expanded)}
      whileHover={{ x: 4 }}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      layout
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="flex-shrink-0 mt-1">
            {getEventIcon(event.type, event.category)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-white text-sm truncate">
                {event.title}
              </h4>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="capitalize bg-slate-700 px-2 py-1 rounded">
                  {event.category}
                </span>
                {event.agentId && (
                  <span className="bg-slate-700 px-2 py-1 rounded">
                    {event.agentId}
                  </span>
                )}
                {event.duration && (
                  <span className="bg-slate-700 px-2 py-1 rounded">
                    {formatDuration(event.duration)}
                  </span>
                )}
              </div>
            </div>

            <p className="text-sm text-gray-300 mb-2">
              {event.message}
            </p>

            {event.metadata && (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                {event.metadata.source && (
                  <span>Source: {event.metadata.source}</span>
                )}
                {event.metadata.environment && (
                  <span>• {event.metadata.environment}</span>
                )}
                {event.metadata.version && (
                  <span>• v{event.metadata.version}</span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 text-xs text-gray-400">
          <span>{formatTimestamp(event.timestamp)}</span>
          <span className="text-gray-500">{new Date(event.timestamp).toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && event.details && (
          <motion.div
            className="mt-4 pt-4 border-t border-slate-700"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="grid grid-cols-1 gap-2 text-sm">
              {Object.entries(event.details).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-gray-400 capitalize">{key.replace(/_/g, ' ')}:</span>
                  <span className="text-white font-mono text-xs">
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

// Main ActivityFeed component
export const ActivityFeed = ({
  events = [],
  maxEvents = 50,
  autoRefresh = false,
  refreshInterval = 5000,
  onEventClick,
  onRefresh,
  showFilters = true,
  showSearch = true,
  className = "",
  height = "500px",
  realTime = false
}: ActivityFeedProps) => {
  const [filteredEvents, setFilteredEvents] = useState<ActivityEvent[]>(events)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [isPaused, setIsPaused] = useState<boolean>(!autoRefresh)
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
  const feedRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Mock events for demo
  const mockEvents: ActivityEvent[] = [
    {
      id: '1',
      timestamp: new Date(Date.now() - 30000).toISOString(),
      type: 'success',
      category: 'agent',
      title: 'Agent Deployed Successfully',
      message: 'Eggshell Monitor agent has been deployed to production',
      agentId: 'eggshell-monitor',
      duration: 2300,
      metadata: { source: 'deployment-service', environment: 'production', version: '2.1.0' }
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 120000).toISOString(),
      type: 'warning',
      category: 'system',
      title: 'High Memory Usage Detected',
      message: 'PKB Cognitive agent memory usage exceeded 85% threshold',
      agentId: 'pkb-cognitive',
      metadata: { source: 'monitoring', environment: 'staging' },
      details: { memoryUsage: '89%', threshold: '85%', recommendation: 'Scale up or restart' }
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 300000).toISOString(),
      type: 'info',
      category: 'api',
      title: 'API Rate Limit Updated',
      message: 'Updated rate limits for Eggshell recovery endpoints',
      metadata: { source: 'api-gateway', environment: 'production' },
      details: { oldLimit: 100, newLimit: 200, endpoint: '/api/recovery' }
    },
    {
      id: '4',
      timestamp: new Date(Date.now() - 600000).toISOString(),
      type: 'error',
      category: 'deployment',
      title: 'Deployment Failed',
      message: 'Failed to deploy Security Monitor: Docker build error',
      agentId: 'security-monitor',
      metadata: { source: 'ci-cd', environment: 'staging' },
      details: { error: 'Docker build failed', step: 'npm install', exitCode: 1 }
    },
    {
      id: '5',
      timestamp: new Date(Date.now() - 900000).toISOString(),
      type: 'system',
      category: 'database',
      title: 'Database Backup Completed',
      message: 'Scheduled backup of agent registry completed successfully',
      duration: 45000,
      metadata: { source: 'backup-service', environment: 'production' },
      details: { size: '2.3GB', duration: '45s', location: 's3://backups/agent-registry' }
    }
  ]

  const allEvents = events.length > 0 ? events : mockEvents

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh && !isPaused && refreshInterval > 0) {
      intervalRef.current = setInterval(() => {
        setIsRefreshing(true)
        onRefresh?.()
        setTimeout(() => setIsRefreshing(false), 1000)
      }, refreshInterval)

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    }
  }, [autoRefresh, isPaused, refreshInterval, onRefresh])

  // Filtering and search
  useEffect(() => {
    let filtered = allEvents

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(event => event.type === filterType)
    }

    // Filter by category
    if (filterCategory !== 'all') {
      filtered = filtered.filter(event => event.category === filterCategory)
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.agentId?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Limit to max events
    filtered = filtered.slice(0, maxEvents)

    setFilteredEvents(filtered)
  }, [allEvents, filterType, filterCategory, searchQuery, maxEvents])

  // Auto-scroll to bottom for new events
  useEffect(() => {
    if (feedRef.current && realTime && !isPaused) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight
    }
  }, [filteredEvents, realTime, isPaused])

  const handleManualRefresh = () => {
    setIsRefreshing(true)
    onRefresh?.()
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  const eventTypes = ['all', 'success', 'error', 'warning', 'info', 'system']
  const eventCategories = ['all', 'agent', 'deployment', 'system', 'user', 'api', 'database']

  return (
    <div className={`bg-slate-800/30 rounded-lg ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            <h3 className="text-xl font-semibold text-white">Activity Feed</h3>
            <span className="text-sm text-gray-400">
              ({filteredEvents.length} events)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {autoRefresh && (
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                title={isPaused ? 'Resume auto-refresh' : 'Pause auto-refresh'}
              >
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </button>
            )}

            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
              title="Refresh feed"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            <button
              className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              title="Export feed"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        {(showFilters || showSearch) && (
          <div className="flex flex-wrap gap-4">
            {showSearch && (
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>
            )}

            {showFilters && (
              <>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  {eventTypes.map(type => (
                    <option key={type} value={type}>
                      {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>

                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  {eventCategories.map(category => (
                    <option key={category} value={category}>
                      {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
        )}
      </div>

      {/* Events List */}
      <div
        ref={feedRef}
        className="overflow-y-auto p-2"
        style={{ height: typeof height === 'number' ? `${height}px` : height }}
      >
        <AnimatePresence mode="popLayout">
          {filteredEvents.length > 0 ? (
            <div className="space-y-2">
              {filteredEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <ActivityEventItem
                    event={event}
                    onClick={onEventClick}
                  />
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              className="flex items-center justify-center h-full text-gray-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="text-center">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No events to display</p>
                <p className="text-sm">Try adjusting your filters or search criteria</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Status Bar */}
      <div className="px-4 py-2 bg-slate-900/50 rounded-b-lg border-t border-slate-700">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-4">
            <span>
              Showing {filteredEvents.length} of {allEvents.length} events
            </span>
            {autoRefresh && (
              <span className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${isPaused ? 'bg-gray-400' : 'bg-green-400 animate-pulse'}`} />
                {isPaused ? 'Paused' : `Auto-refresh: ${refreshInterval / 1000}s`}
              </span>
            )}
          </div>

          <div className="text-gray-500">
            {realTime ? 'Real-time feed' : 'Static feed'}
          </div>
        </div>
      </div>
    </div>
  )
}
