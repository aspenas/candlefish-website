'use client'

import React from 'react'
import { Card } from '@/components/ui/Card'

interface ComplianceFramework {
  name: string
  status: 'compliant' | 'partial' | 'non-compliant' | 'pending'
  score: number
  requirements: {
    total: number
    met: number
    pending: number
    failed: number
  }
  lastAudit: number
  nextAudit: number
  description: string
}

interface ComplianceCardsProps {
  frameworks?: ComplianceFramework[]
  className?: string
}

const STATUS_CONFIG = {
  compliant: {
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    icon: '✓',
    description: 'Fully compliant'
  },
  partial: {
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    icon: '⚠',
    description: 'Partially compliant'
  },
  'non-compliant': {
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    icon: '✗',
    description: 'Non-compliant'
  },
  pending: {
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    icon: '⏳',
    description: 'Assessment pending'
  }
}

const ComplianceCards: React.FC<ComplianceCardsProps> = ({ 
  frameworks = [],
  className = ''
}) => {
  // Mock data for demonstration
  const mockFrameworks: ComplianceFramework[] = [
    {
      name: 'SOC 2 Type II',
      status: 'compliant',
      score: 95,
      requirements: {
        total: 64,
        met: 61,
        pending: 2,
        failed: 1
      },
      lastAudit: Date.now() - 86400000 * 30, // 30 days ago
      nextAudit: Date.now() + 86400000 * 335, // 335 days from now
      description: 'Service Organization Control 2 audit for security controls'
    },
    {
      name: 'GDPR',
      status: 'partial',
      score: 78,
      requirements: {
        total: 42,
        met: 33,
        pending: 6,
        failed: 3
      },
      lastAudit: Date.now() - 86400000 * 90, // 90 days ago
      nextAudit: Date.now() + 86400000 * 180, // 180 days from now
      description: 'General Data Protection Regulation compliance'
    },
    {
      name: 'ISO 27001',
      status: 'compliant',
      score: 92,
      requirements: {
        total: 114,
        met: 105,
        pending: 7,
        failed: 2
      },
      lastAudit: Date.now() - 86400000 * 60, // 60 days ago
      nextAudit: Date.now() + 86400000 * 305, // 305 days from now
      description: 'Information Security Management System standard'
    },
    {
      name: 'PCI DSS',
      status: 'pending',
      score: 0,
      requirements: {
        total: 78,
        met: 0,
        pending: 78,
        failed: 0
      },
      lastAudit: 0,
      nextAudit: Date.now() + 86400000 * 14, // 14 days from now
      description: 'Payment Card Industry Data Security Standard'
    }
  ]

  const activeFrameworks = frameworks.length > 0 ? frameworks : mockFrameworks

  const formatDate = (timestamp: number) => {
    if (timestamp === 0) return 'N/A'
    return new Date(timestamp).toLocaleDateString()
  }

  const getTimeUntil = (timestamp: number) => {
    const now = Date.now()
    const diff = timestamp - now
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    
    if (days < 0) return 'Overdue'
    if (days === 0) return 'Today'
    if (days === 1) return 'Tomorrow'
    return `${days} days`
  }

  return (
    <div className={className}>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Compliance Status
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Regulatory and framework compliance overview
        </p>
      </div>

      <div className="space-y-4">
        {activeFrameworks.map((framework) => {
          const statusConfig = STATUS_CONFIG[framework.status]
          const completionPercentage = framework.requirements.total > 0 
            ? Math.round((framework.requirements.met / framework.requirements.total) * 100)
            : 0

          return (
            <Card key={framework.name} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {framework.name}
                    </h4>
                    <span 
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}
                    >
                      <span className="mr-1" aria-hidden="true">{statusConfig.icon}</span>
                      {statusConfig.description}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {framework.description}
                  </p>
                </div>
                
                {framework.score > 0 && (
                  <div className="text-right ml-4">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {framework.score}%
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Compliance Score
                    </div>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                  <span>Requirements Progress</span>
                  <span>{framework.requirements.met}/{framework.requirements.total}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${completionPercentage}%` }}
                    role="progressbar"
                    aria-valuenow={completionPercentage}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${framework.name} compliance progress`}
                  />
                </div>
              </div>

              {/* Requirements Breakdown */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                    {framework.requirements.met}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Met
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-yellow-600 dark:text-yellow-400">
                    {framework.requirements.pending}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Pending
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-red-600 dark:text-red-400">
                    {framework.requirements.failed}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Failed
                  </div>
                </div>
              </div>

              {/* Audit Information */}
              <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                <div className="flex justify-between text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Last Audit:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {formatDate(framework.lastAudit)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Next Audit:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {getTimeUntil(framework.nextAudit)}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Summary Card */}
      <Card className="mt-6 p-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
              Overall Compliance Health
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              {activeFrameworks.filter(f => f.status === 'compliant').length} of {activeFrameworks.length} frameworks fully compliant
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              {Math.round(
                activeFrameworks
                  .filter(f => f.score > 0)
                  .reduce((sum, f) => sum + f.score, 0) / 
                activeFrameworks.filter(f => f.score > 0).length
              ) || 0}%
            </div>
            <div className="text-sm text-blue-600 dark:text-blue-400">
              Average Score
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default ComplianceCards