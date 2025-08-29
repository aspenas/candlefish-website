'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { useSecurityWebSocket } from '@/lib/websocket-client'

interface Alert {
  id: string
  title: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'unread' | 'acknowledged' | 'resolved'
  category: string
  timestamp: number
  description: string
  source: string
  affectedAssets: string[]
  isRealTime?: boolean
}

interface AlertsTableProps {
  alerts?: Alert[]
  className?: string
  showRealTime?: boolean
}

const AlertsTable: React.FC<AlertsTableProps> = ({ 
  alerts = [],
  className = '',
  showRealTime = true
}) => {
  const [localAlerts, setLocalAlerts] = useState<Alert[]>([])
  const [filter, setFilter] = useState<{
    severity?: string
    status?: string
    search?: string
  }>({})
  
  const ws = useSecurityWebSocket()

  // Mock initial alerts
  const mockAlerts = useMemo(() => {
    const alerts: Alert[] = []
    const titles = [
      'Suspicious Network Activity Detected',
      'Failed Login Attempts Threshold Exceeded',
      'Malware Signature Detected',
      'Unauthorized API Access Attempt',
      'Data Exfiltration Alert',
      'Privilege Escalation Detected',
      'Unusual User Behavior Pattern',
      'Security Policy Violation',
      'Intrusion Detection System Alert',
      'Certificate Expiration Warning'
    ]
    
    const categories = ['Network', 'Authentication', 'Malware', 'Data Loss', 'Access Control']
    const sources = ['SIEM', 'IDS', 'EDR', 'WAF', 'User Behavior Analytics']
    const assets = ['Web Server 1', 'Database Cluster', 'API Gateway', 'Load Balancer', 'VPN Server']

    for (let i = 1; i <= 50; i++) {
      alerts.push({
        id: `ALT-${i.toString().padStart(4, '0')}`,
        title: titles[Math.floor(Math.random() * titles.length)],
        severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)] as any,
        status: ['unread', 'acknowledged', 'resolved'][Math.floor(Math.random() * 3)] as any,
        category: categories[Math.floor(Math.random() * categories.length)],
        timestamp: Date.now() - Math.random() * 86400000 * 7, // Random time in last 7 days
        description: `Security alert requiring attention and potential action.`,
        source: sources[Math.floor(Math.random() * sources.length)],
        affectedAssets: assets.slice(0, Math.floor(Math.random() * 3) + 1),
        isRealTime: false
      })
    }
    
    return alerts.sort((a, b) => b.timestamp - a.timestamp)
  }, [])

  // Initialize alerts
  useEffect(() => {
    setLocalAlerts(alerts.length > 0 ? alerts : mockAlerts)
  }, [alerts, mockAlerts])

  // Set up real-time alerts
  useEffect(() => {
    if (!showRealTime) return

    const unsubscribeAlert = ws.on('security_event', (event) => {
      if (event.type === 'alert') {
        const newAlert: Alert = {
          id: `ALT-RT-${Date.now()}`,
          title: event.data.title || 'Real-time Security Alert',
          severity: event.severity || 'medium',
          status: 'unread',
          category: event.data.category || 'Real-time',
          timestamp: event.timestamp || Date.now(),
          description: event.data.description || 'Real-time security alert detected',
          source: event.data.source || 'Real-time Monitor',
          affectedAssets: event.data.affectedAssets || ['Unknown'],
          isRealTime: true
        }

        setLocalAlerts(prev => [newAlert, ...prev].slice(0, 100)) // Keep only last 100
      }
    })

    const unsubscribeStatus = ws.onStatusChange((status) => {
      if (status === 'connected') {
        ws.subscribeToSecurityEvents(['alert'])
      }
    })

    return () => {
      unsubscribeAlert()
      unsubscribeStatus()
    }
  }, [ws, showRealTime])

  // Filter alerts
  const filteredAlerts = useMemo(() => {
    return localAlerts.filter(alert => {
      if (filter.severity && alert.severity !== filter.severity) return false
      if (filter.status && alert.status !== filter.status) return false
      if (filter.search) {
        const searchTerm = filter.search.toLowerCase()
        return (
          alert.title.toLowerCase().includes(searchTerm) ||
          alert.description.toLowerCase().includes(searchTerm) ||
          alert.category.toLowerCase().includes(searchTerm)
        )
      }
      return true
    })
  }, [localAlerts, filter])

  const handleAcknowledge = (alertId: string) => {
    setLocalAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, status: 'acknowledged' as const }
          : alert
      )
    )
  }

  const handleResolve = (alertId: string) => {
    setLocalAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, status: 'resolved' as const }
          : alert
      )
    )
  }

  const formatTime = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes < 1) return 'Just now'
    return `${minutes}m ago`
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'unread': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'acknowledged': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'resolved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  return (
    <Card className={`p-0 overflow-hidden ${className}`}>
      {/* Header with Filters */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-600">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Security Alerts
              {showRealTime && (
                <span className="ml-2 inline-flex items-center">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                  <span className="ml-1 text-sm text-gray-600 dark:text-gray-400">Live</span>
                </span>
              )}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {filteredAlerts.length} alerts ({localAlerts.filter(a => a.status === 'unread').length} unread)
            </p>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              placeholder="Search alerts..."
              value={filter.search || ''}
              onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            <select
              value={filter.severity || ''}
              onChange={(e) => setFilter(prev => ({ ...prev, severity: e.target.value || undefined }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Severities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>

            <select
              value={filter.status || ''}
              onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value || undefined }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="unread">Unread</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="max-h-96 overflow-y-auto">
        {filteredAlerts.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-600">
            {filteredAlerts.map((alert) => (
              <div 
                key={alert.id} 
                className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                  alert.isRealTime ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {alert.title}
                      </h4>
                      {alert.isRealTime && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          Real-time
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {alert.description}
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>Source: {alert.source}</span>
                      <span>Category: {alert.category}</span>
                      <span>Assets: {alert.affectedAssets.join(', ')}</span>
                      <span>{formatTime(alert.timestamp)}</span>
                    </div>
                  </div>

                  <div className="ml-4 flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                        {alert.severity}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(alert.status)}`}>
                        {alert.status}
                      </span>
                    </div>

                    {alert.status === 'unread' && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleAcknowledge(alert.id)}
                          className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:hover:bg-yellow-800 transition-colors"
                        >
                          Acknowledge
                        </button>
                        <button
                          onClick={() => handleResolve(alert.id)}
                          className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800 transition-colors"
                        >
                          Resolve
                        </button>
                      </div>
                    )}

                    {alert.status === 'acknowledged' && (
                      <button
                        onClick={() => handleResolve(alert.id)}
                        className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800 transition-colors"
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No alerts found matching the current filters.
          </div>
        )}
      </div>
    </Card>
  )
}

export default AlertsTable