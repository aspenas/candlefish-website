'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { 
  DocumentTextIcon,
  UserPlusIcon,
  ChartBarIcon,
  CogIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

interface ActivityItem {
  id: string
  type: string
  description: string
  timestamp: string
  assessmentId?: string
}

interface RecentActivityFeedProps {
  activities: ActivityItem[]
  operatorId: string
}

export function RecentActivityFeed({ activities, operatorId }: RecentActivityFeedProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'ASSESSMENT_CREATED':
        return <DocumentTextIcon className="w-4 h-4 text-blue-400" />
      case 'ASSESSMENT_COMPLETED':
        return <CheckCircleIcon className="w-4 h-4 text-green-400" />
      case 'ASSESSMENT_FAILED':
        return <ExclamationTriangleIcon className="w-4 h-4 text-red-400" />
      case 'CLIENT_ADDED':
        return <UserPlusIcon className="w-4 h-4 text-purple-400" />
      case 'REPORT_GENERATED':
        return <ChartBarIcon className="w-4 h-4 text-orange-400" />
      case 'SETTINGS_UPDATED':
        return <CogIcon className="w-4 h-4 text-gray-400" />
      default:
        return <ClockIcon className="w-4 h-4 text-gray-400" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'ASSESSMENT_COMPLETED':
        return 'border-green-500/30 bg-green-500/5'
      case 'ASSESSMENT_FAILED':
        return 'border-red-500/30 bg-red-500/5'
      case 'ASSESSMENT_CREATED':
        return 'border-blue-500/30 bg-blue-500/5'
      case 'CLIENT_ADDED':
        return 'border-purple-500/30 bg-purple-500/5'
      case 'REPORT_GENERATED':
        return 'border-orange-500/30 bg-orange-500/5'
      default:
        return 'border-gray-500/30 bg-gray-500/5'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`
    
    return date.toLocaleDateString()
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-8">
        <ClockIcon className="w-8 h-8 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">No recent activity</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      {activities.slice(0, 10).map((activity, index) => (
        <motion.div
          key={activity.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className={`p-3 rounded-lg border transition-all hover:scale-[1.02] cursor-pointer ${getActivityColor(activity.type)}`}
        >
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-0.5">
              {getActivityIcon(activity.type)}
            </div>
            <div className="flex-grow min-w-0">
              <p className="text-sm text-white leading-relaxed">
                {activity.description}
              </p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-400">
                  {formatTimestamp(activity.timestamp)}
                </p>
                {activity.assessmentId && (
                  <button className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                    View Assessment
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      ))}
      
      {activities.length > 10 && (
        <div className="text-center pt-3">
          <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
            View All Activity
          </button>
        </div>
      )}
    </div>
  )
}