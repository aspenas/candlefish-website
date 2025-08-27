'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { 
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/Progress'
import type { Assessment } from '@/lib/graphql/types'

interface AssessmentCardProps {
  assessment: Assessment
  showDetails?: boolean
  onClick?: () => void
}

export function AssessmentCard({ 
  assessment, 
  showDetails = false, 
  onClick 
}: AssessmentCardProps) {
  const getStatusIcon = () => {
    switch (assessment.status) {
      case 'COMPLETED':
        return <CheckCircleIcon className="w-5 h-5 text-green-400" />
      case 'PROCESSING':
        return <ClockIcon className="w-5 h-5 text-yellow-400 animate-spin" />
      case 'FAILED':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
      default:
        return <DocumentTextIcon className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusColor = () => {
    switch (assessment.status) {
      case 'COMPLETED':
        return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'PROCESSING':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'FAILED':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getMaturityLevelColor = () => {
    switch (assessment.maturityLevel) {
      case 'AUTONOMOUS':
        return 'text-green-400'
      case 'OPTIMIZED':
        return 'text-blue-400'
      case 'SYSTEMATIC':
        return 'text-purple-400'
      case 'EMERGING':
        return 'text-yellow-400'
      default:
        return 'text-red-400'
    }
  }

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <Card 
        className={`p-6 cursor-pointer transition-all hover:border-blue-500/50 ${
          assessment.status === 'PROCESSING' ? 'ring-1 ring-yellow-500/30' : ''
        }`}
        onClick={onClick}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <div>
              <h3 className="text-white font-medium">
                {assessment.client?.name || 'Assessment'}
              </h3>
              <p className="text-sm text-gray-400">
                {assessment.industry.replace('_', ' ').toLowerCase()
                  .replace(/\b\w/g, l => l.toUpperCase())}
              </p>
            </div>
          </div>
          <Badge 
            className={`text-xs px-2 py-1 ${getStatusColor()}`}
          >
            {assessment.status.toLowerCase()}
          </Badge>
        </div>

        {/* Progress for Processing Assessments */}
        {assessment.status === 'PROCESSING' && assessment.processingProgress && (
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">
                {assessment.processingProgress.currentTask}
              </span>
              <span className="text-gray-400">
                {assessment.processingProgress.percentage}%
              </span>
            </div>
            <Progress 
              value={assessment.processingProgress.percentage} 
              className="h-2"
            />
          </div>
        )}

        {/* Maturity Score for Completed Assessments */}
        {assessment.status === 'COMPLETED' && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Maturity Score</span>
              <div className="flex items-center space-x-2">
                <ChartBarIcon className="w-4 h-4 text-gray-400" />
                <span className="text-white font-medium">
                  {assessment.maturityScore.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Level</span>
              <span className={`text-sm font-medium ${getMaturityLevelColor()}`}>
                {assessment.maturityLevel.toLowerCase()
                  .replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            </div>
          </div>
        )}

        {/* Documents Count */}
        {assessment.documents && assessment.documents.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <DocumentTextIcon className="w-4 h-4" />
              <span>{assessment.documents.length} documents</span>
            </div>
          </div>
        )}

        {/* Key Insights Preview */}
        {showDetails && assessment.insights && assessment.insights.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-white mb-2">
              Key Insights
            </h4>
            <div className="space-y-1">
              {assessment.insights.slice(0, 2).map((insight, index) => (
                <div key={index} className="text-xs text-gray-400">
                  • {insight.title}
                </div>
              ))}
              {assessment.insights.length > 2 && (
                <div className="text-xs text-blue-400">
                  +{assessment.insights.length - 2} more insights
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <div className="text-xs text-gray-400">
            {assessment.completedAt 
              ? `Completed ${new Date(assessment.completedAt).toLocaleDateString()}`
              : `Created ${new Date(assessment.createdAt).toLocaleDateString()}`
            }
          </div>
          <div className="flex space-x-2">
            {assessment.status === 'COMPLETED' && (
              <>
                <Button size="sm" variant="outline" className="text-xs">
                  View Report
                </Button>
                <Button size="sm" className="text-xs">
                  Solutions
                </Button>
              </>
            )}
            {assessment.status === 'PROCESSING' && (
              <Button size="sm" variant="outline" className="text-xs">
                View Progress
              </Button>
            )}
            {assessment.status === 'DRAFT' && (
              <Button size="sm" className="text-xs">
                Continue
              </Button>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}