'use client'

import React from 'react'
import IncidentMetrics from './IncidentMetrics'

// Reuse IncidentMetrics with alert-specific data
const AlertsMetrics: React.FC<{ className?: string }> = ({ className }) => {
  const alertMetrics = [
    {
      label: 'Total Alerts',
      value: 387,
      change: 23,
      trend: 'up' as const,
      color: 'blue' as const
    },
    {
      label: 'Unread Alerts',
      value: 45,
      change: -8,
      trend: 'down' as const,
      color: 'red' as const
    },
    {
      label: 'High Priority',
      value: 12,
      change: 4,
      trend: 'up' as const,
      color: 'yellow' as const
    },
    {
      label: 'Resolved Today',
      value: 28,
      change: 15,
      trend: 'up' as const,
      color: 'green' as const
    }
  ]

  return <IncidentMetrics metrics={alertMetrics} className={className} />
}

export default AlertsMetrics