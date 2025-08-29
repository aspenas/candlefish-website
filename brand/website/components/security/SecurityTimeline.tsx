'use client'

import React, { useState, useMemo } from 'react'
import { Card } from '@/components/ui/Card'

interface SecurityEvent {
  id: string
  timestamp: number
  type: 'threat' | 'incident' | 'alert' | 'remediation'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  source: string
  affectedSystems: string[]
}

interface SecurityTimelineProps {
  events?: SecurityEvent[]
  className?: string
  maxEvents?: number
}

const EVENT_COLORS = {
  threat: 'bg-red-500',
  incident: 'bg-orange-500', 
  alert: 'bg-yellow-500',
  remediation: 'bg-green-500'
}

const SEVERITY_BADGES = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
}

const SecurityTimeline: React.FC<SecurityTimelineProps> = ({ 
  events = [],
  className = '',
  maxEvents = 20
}) => {
  const [filter, setFilter] = useState<string>('all')
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null)

  // Mock data for demonstration
  const mockEvents = useMemo(() => [
    {
      id: '1',
      timestamp: Date.now() - 300000,
      type: 'threat' as const,
      severity: 'critical' as const,
      title: 'DDoS Attack Detected',
      description: 'Large-scale distributed denial of service attack targeting main API endpoints',
      source: 'WAF Monitor',
      affectedSystems: ['API Gateway', 'Load Balancer']
    },
    {
      id: '2',
      timestamp: Date.now() - 600000,
      type: 'incident' as const,
      severity: 'high' as const,
      title: 'Suspicious Login Activity',
      description: 'Multiple failed login attempts from unusual geographic locations',
      source: 'Auth Service',
      affectedSystems: ['User Authentication']
    },
    {
      id: '3',
      timestamp: Date.now() - 900000,
      type: 'alert' as const,
      severity: 'medium' as const,
      title: 'Unusual Network Traffic',
      description: 'Elevated network traffic patterns detected from internal subnet',
      source: 'Network Monitor',
      affectedSystems: ['Internal Network']
    },
    {
      id: '4',
      timestamp: Date.now() - 1200000,
      type: 'remediation' as const,
      severity: 'low' as const,
      title: 'Security Patch Applied',
      description: 'Critical security patches applied to all production servers',
      source: 'Patch Management',
      affectedSystems: ['Web Servers', 'Database Servers']
    },
    {
      id: '5',
      timestamp: Date.now() - 1500000,
      type: 'threat' as const,
      severity: 'high' as const,
      title: 'Malware Detection',
      description: 'Malicious file detected in email attachment, automatically quarantined',
      source: 'Email Security',
      affectedSystems: ['Email Server']
    }
  ], [])

  const activeEvents = events.length > 0 ? events : mockEvents

  const filteredEvents = useMemo(() => {
    const filtered = filter === 'all' 
      ? activeEvents 
      : activeEvents.filter(event => event.type === filter)
    
    return filtered
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, maxEvents)
  }, [activeEvents, filter, maxEvents])

  const formatTime = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    return `${minutes}m ago`
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Security Event Timeline
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Chronological view of recent security events and responses
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex gap-2">
          {['all', 'threat', 'incident', 'alert', 'remediation'].map((filterType) => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                filter === filterType
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
              aria-label={`Filter by ${filterType} events`}
            >
              {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-600" aria-hidden="true" />

        <div className="space-y-6">
          {filteredEvents.map((event, index) => (
            <div key={event.id} className="relative flex items-start">
              {/* Timeline dot */}
              <div 
                className={`relative z-10 w-8 h-8 rounded-full ${EVENT_COLORS[event.type]} flex items-center justify-center flex-shrink-0`}
                aria-hidden="true"
              >
                <div className="w-3 h-3 bg-white rounded-full" />
              </div>

              {/* Event content */}
              <div className="ml-4 flex-1 min-w-0">
                <div 
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => setSelectedEvent(selectedEvent?.id === event.id ? null : event)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelectedEvent(selectedEvent?.id === event.id ? null : event)
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-expanded={selectedEvent?.id === event.id}
                  aria-label={`Security event: ${event.title}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {event.title}
                    </h4>
                    <div className="flex items-center gap-2 ml-4">
                      <span 
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${SEVERITY_BADGES[event.severity]}`}
                      >
                        {event.severity}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTime(event.timestamp)}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                    {event.description}
                  </p>

                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Source: {event.source}</span>
                    <span>{event.affectedSystems.length} system{event.affectedSystems.length !== 1 ? 's' : ''} affected</span>
                  </div>

                  {/* Expanded details */}
                  {selectedEvent?.id === event.id && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div>
                          <dt className="font-medium text-gray-900 dark:text-white">Timestamp:</dt>
                          <dd className="text-gray-600 dark:text-gray-300">{formatTimestamp(event.timestamp)}</dd>
                        </div>
                        <div>
                          <dt className="font-medium text-gray-900 dark:text-white">Event Type:</dt>
                          <dd className="text-gray-600 dark:text-gray-300 capitalize">{event.type}</dd>
                        </div>
                        <div className="sm:col-span-2">
                          <dt className="font-medium text-gray-900 dark:text-white">Affected Systems:</dt>
                          <dd className="text-gray-600 dark:text-gray-300">
                            {event.affectedSystems.join(', ')}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredEvents.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No events found for the selected filter.
          </div>
        )}
      </div>
    </Card>
  )
}

export default SecurityTimeline