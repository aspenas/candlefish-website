'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { 
  DocumentTextIcon,
  CloudArrowUpIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { Progress } from '@/components/ui/Progress'
import type { UsageQuota } from '@/lib/graphql/types'

interface UsageQuotaWidgetProps {
  usageQuota: UsageQuota
}

export function UsageQuotaWidget({ usageQuota }: UsageQuotaWidgetProps) {
  const assessmentUsagePercent = (usageQuota.assessmentsUsed / usageQuota.assessmentsPerMonth) * 100
  const storageUsagePercent = (usageQuota.storageUsed / usageQuota.totalStorage) * 100
  
  const resetDate = new Date(usageQuota.resetDate)
  const daysUntilReset = Math.ceil((resetDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

  const getUsageColor = (percent: number) => {
    if (percent >= 90) return 'text-red-400 bg-red-500/20'
    if (percent >= 75) return 'text-yellow-400 bg-yellow-500/20'
    return 'text-green-400 bg-green-500/20'
  }

  const formatStorage = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024)
    return gb >= 1 ? `${gb.toFixed(1)}GB` : `${(bytes / (1024 * 1024)).toFixed(0)}MB`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <div className="text-gray-200 text-sm font-medium">Usage & Quotas</div>
        {(assessmentUsagePercent >= 90 || storageUsagePercent >= 90) && (
          <ExclamationTriangleIcon className="w-4 h-4 text-red-400" />
        )}
      </div>

      {/* Assessment Usage */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <DocumentTextIcon className="w-4 h-4 text-gray-400" />
            <span className="text-gray-300">Assessments</span>
          </div>
          <span className={`text-xs px-2 py-1 rounded ${getUsageColor(assessmentUsagePercent)}`}>
            {usageQuota.assessmentsUsed} / {usageQuota.assessmentsPerMonth}
          </span>
        </div>
        <Progress 
          value={assessmentUsagePercent} 
          className={`h-2 ${assessmentUsagePercent >= 90 ? 'bg-red-500/30' : 'bg-gray-700'}`}
        />
      </div>

      {/* Storage Usage */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <CloudArrowUpIcon className="w-4 h-4 text-gray-400" />
            <span className="text-gray-300">Storage</span>
          </div>
          <span className={`text-xs px-2 py-1 rounded ${getUsageColor(storageUsagePercent)}`}>
            {formatStorage(usageQuota.storageUsed)} / {formatStorage(usageQuota.totalStorage)}
          </span>
        </div>
        <Progress 
          value={storageUsagePercent} 
          className={`h-2 ${storageUsagePercent >= 90 ? 'bg-red-500/30' : 'bg-gray-700'}`}
        />
      </div>

      {/* Reset Information */}
      <div className="pt-2 border-t border-white/10">
        <div className="flex items-center space-x-2 text-xs text-gray-400">
          <ClockIcon className="w-3 h-3" />
          <span>
            Resets in {daysUntilReset} day{daysUntilReset !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Usage Warnings */}
      {assessmentUsagePercent >= 90 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
        >
          <div className="text-xs text-red-400">
            Assessment quota nearly exhausted. Consider upgrading your plan.
          </div>
        </motion.div>
      )}

      {storageUsagePercent >= 90 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg"
        >
          <div className="text-xs text-red-400">
            Storage quota nearly full. Remove old documents or upgrade.
          </div>
        </motion.div>
      )}
    </div>
  )
}