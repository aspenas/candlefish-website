import React from 'react'
import { CustomerStatus, ProjectStatus, HealthStatus, SyncStatus } from '@/types'

interface StatusBadgeProps {
  status: CustomerStatus | ProjectStatus | HealthStatus | SyncStatus
  className?: string
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className = ''
}) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      // Customer statuses
      case CustomerStatus.ACTIVE:
        return { color: 'bg-green-100 text-green-800', label: 'Active' }
      case CustomerStatus.INACTIVE:
        return { color: 'bg-gray-100 text-gray-800', label: 'Inactive' }
      case CustomerStatus.PROSPECT:
        return { color: 'bg-blue-100 text-blue-800', label: 'Prospect' }
      case CustomerStatus.ARCHIVED:
        return { color: 'bg-red-100 text-red-800', label: 'Archived' }

      // Project statuses
      case ProjectStatus.PLANNING:
        return { color: 'bg-yellow-100 text-yellow-800', label: 'Planning' }
      case ProjectStatus.IN_PROGRESS:
        return { color: 'bg-blue-100 text-blue-800', label: 'In Progress' }
      case ProjectStatus.REVIEW:
        return { color: 'bg-purple-100 text-purple-800', label: 'Review' }
      case ProjectStatus.COMPLETED:
        return { color: 'bg-green-100 text-green-800', label: 'Completed' }
      case ProjectStatus.ON_HOLD:
        return { color: 'bg-orange-100 text-orange-800', label: 'On Hold' }
      case ProjectStatus.CANCELLED:
        return { color: 'bg-red-100 text-red-800', label: 'Cancelled' }

      // Health statuses
      case HealthStatus.HEALTHY:
        return { color: 'bg-green-100 text-green-800', label: 'Healthy' }
      case HealthStatus.WARNING:
        return { color: 'bg-yellow-100 text-yellow-800', label: 'Warning' }
      case HealthStatus.ERROR:
        return { color: 'bg-red-100 text-red-800', label: 'Error' }
      case HealthStatus.UNKNOWN:
        return { color: 'bg-gray-100 text-gray-800', label: 'Unknown' }

      // Sync statuses
      case SyncStatus.PENDING:
        return { color: 'bg-gray-100 text-gray-800', label: 'Pending' }
      case SyncStatus.IN_PROGRESS:
        return { color: 'bg-blue-100 text-blue-800', label: 'In Progress' }
      case SyncStatus.COMPLETED:
        return { color: 'bg-green-100 text-green-800', label: 'Completed' }
      case SyncStatus.FAILED:
        return { color: 'bg-red-100 text-red-800', label: 'Failed' }
      case SyncStatus.CANCELLED:
        return { color: 'bg-orange-100 text-orange-800', label: 'Cancelled' }

      default:
        return { color: 'bg-gray-100 text-gray-800', label: status }
    }
  }

  const config = getStatusConfig(status)

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color} ${className}`}>
      {config.label}
    </span>
  )
}
