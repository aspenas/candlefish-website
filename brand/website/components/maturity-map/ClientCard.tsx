'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { 
  BuildingOfficeIcon,
  EnvelopeIcon,
  PhoneIcon,
  ChartBarIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { Client } from '@/lib/graphql/types'

interface ClientCardProps {
  client: Client
  onClick?: () => void
}

export function ClientCard({ client, onClick }: ClientCardProps) {
  const getIndustryIcon = () => {
    switch (client.industry) {
      case 'MANUFACTURING':
        return '🏭'
      case 'HEALTHCARE':
        return '🏥'
      case 'RETAIL':
        return '🏪'
      case 'TECHNOLOGY':
        return '💻'
      case 'CONSTRUCTION':
        return '🏗️'
      case 'AUTOMOTIVE':
        return '🚗'
      case 'ENERGY':
        return '⚡'
      case 'AGRICULTURE':
        return '🌾'
      case 'LOGISTICS':
        return '🚛'
      case 'HOSPITALITY':
        return '🏨'
      case 'EDUCATION':
        return '📚'
      case 'GOVERNMENT':
        return '🏛️'
      case 'CONSULTING':
        return '💼'
      default:
        return '🏢'
    }
  }

  const getAverageMaturityScore = () => {
    const completedAssessments = client.assessments?.filter(a => a.maturityScore) || []
    if (completedAssessments.length === 0) return null
    
    const total = completedAssessments.reduce((sum, a) => sum + a.maturityScore, 0)
    return total / completedAssessments.length
  }

  const getLatestMaturityLevel = () => {
    const sortedAssessments = client.assessments
      ?.filter(a => a.maturityLevel)
      ?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) || []
    
    return sortedAssessments[0]?.maturityLevel
  }

  const averageScore = getAverageMaturityScore()
  const latestLevel = getLatestMaturityLevel()

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <Card 
        className="p-6 cursor-pointer transition-all hover:border-blue-500/50"
        onClick={onClick}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">
              {getIndustryIcon()}
            </div>
            <div>
              <h3 className="text-white font-medium text-lg">
                {client.name}
              </h3>
              <p className="text-sm text-gray-400">
                {client.industry.replace('_', ' ').toLowerCase()
                  .replace(/\b\w/g, l => l.toUpperCase())}
              </p>
            </div>
          </div>
          {latestLevel && (
            <Badge 
              variant="secondary"
              className="text-xs"
            >
              {latestLevel.toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
            </Badge>
          )}
        </div>

        {/* Contact Information */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <EnvelopeIcon className="w-4 h-4" />
            <span>{client.contactInfo.email}</span>
          </div>
          {client.contactInfo.phone && (
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <PhoneIcon className="w-4 h-4" />
              <span>{client.contactInfo.phone}</span>
            </div>
          )}
          {client.contactInfo.address && (
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <BuildingOfficeIcon className="w-4 h-4" />
              <span className="truncate">{client.contactInfo.address}</span>
            </div>
          )}
        </div>

        {/* Assessment Statistics */}
        <div className="mb-4 p-3 bg-gray-800/30 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center space-x-1 mb-1">
                <DocumentTextIcon className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-400">Assessments</span>
              </div>
              <p className="text-lg font-medium text-white">
                {client.assessments?.length || 0}
              </p>
            </div>
            {averageScore && (
              <div>
                <div className="flex items-center space-x-1 mb-1">
                  <ChartBarIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-400">Avg Score</span>
                </div>
                <p className="text-lg font-medium text-white">
                  {averageScore.toFixed(1)}%
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Assessment Activity */}
        {client.assessments && client.assessments.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-white mb-2">
              Recent Assessments
            </h4>
            <div className="space-y-1">
              {client.assessments.slice(0, 3).map((assessment) => (
                <div key={assessment.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      assessment.status === 'COMPLETED' 
                        ? 'bg-green-400' 
                        : assessment.status === 'PROCESSING'
                        ? 'bg-yellow-400'
                        : 'bg-gray-400'
                    }`} />
                    <span className="text-gray-400">
                      {assessment.maturityScore 
                        ? `${assessment.maturityScore.toFixed(1)}% score`
                        : assessment.status.toLowerCase()
                      }
                    </span>
                  </div>
                  <span className="text-gray-500">
                    {new Date(assessment.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <div className="text-xs text-gray-400">
            Client since {new Date(client.createdAt).toLocaleDateString()}
          </div>
          <div className="flex space-x-2">
            <Button size="sm" variant="outline" className="text-xs">
              View Details
            </Button>
            <Button size="sm" className="text-xs">
              New Assessment
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}