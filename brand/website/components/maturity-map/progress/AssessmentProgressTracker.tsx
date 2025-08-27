'use client'

import React, { useEffect, useState } from 'react'
import { useSubscription, useQuery } from '@apollo/client'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ClockIcon,
  DocumentTextIcon,
  ChartBarIcon,
  CogIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  BoltIcon
} from '@heroicons/react/24/outline'
import { Card } from '@/components/ui/Card'
import { Progress } from '@/components/ui/Progress'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { 
  ASSESSMENT_PROGRESS_SUBSCRIPTION,
  DOCUMENT_PROCESSING_SUBSCRIPTION,
  GET_ASSESSMENT 
} from '@/lib/graphql/queries'
import type { ProcessingStage, ProcessingProgress } from '@/lib/graphql/types'

interface AssessmentProgressTrackerProps {
  assessmentId: string
  onComplete?: () => void
}

interface ProcessingStep {
  stage: ProcessingStage
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  estimatedDuration: string
}

const PROCESSING_STEPS: ProcessingStep[] = [
  {
    stage: 'UPLOADING',
    title: 'Uploading Files',
    description: 'Securely uploading and validating your documents',
    icon: DocumentTextIcon,
    estimatedDuration: '1-2 minutes'
  },
  {
    stage: 'ANALYZING_DOCUMENTS',
    title: 'Analyzing Documents',
    description: 'Extracting insights and patterns from your documents',
    icon: ChartBarIcon,
    estimatedDuration: '3-5 minutes'
  },
  {
    stage: 'PROCESSING_RESPONSES',
    title: 'Processing Responses',
    description: 'Analyzing your assessment responses and calculating scores',
    icon: CogIcon,
    estimatedDuration: '2-3 minutes'
  },
  {
    stage: 'GENERATING_INSIGHTS',
    title: 'Generating Insights',
    description: 'Creating personalized insights and recommendations',
    icon: BoltIcon,
    estimatedDuration: '3-4 minutes'
  },
  {
    stage: 'CREATING_RECOMMENDATIONS',
    title: 'Building Recommendations',
    description: 'Crafting actionable improvement recommendations',
    icon: ChartBarIcon,
    estimatedDuration: '2-3 minutes'
  },
  {
    stage: 'FINALIZING',
    title: 'Finalizing Report',
    description: 'Completing your maturity assessment report',
    icon: CheckCircleIcon,
    estimatedDuration: '1 minute'
  }
]

export function AssessmentProgressTracker({ 
  assessmentId, 
  onComplete 
}: AssessmentProgressTrackerProps) {
  const [progress, setProgress] = useState<ProcessingProgress | null>(null)
  const [documentProgress, setDocumentProgress] = useState<any[]>([])
  const [startTime] = useState(Date.now())
  const [estimatedCompletion, setEstimatedCompletion] = useState<Date | null>(null)

  // Subscription for assessment progress
  const { data: progressData } = useSubscription(ASSESSMENT_PROGRESS_SUBSCRIPTION, {
    variables: { assessmentId }
  })

  // Subscription for document processing
  const { data: docProgressData } = useSubscription(DOCUMENT_PROCESSING_SUBSCRIPTION, {
    variables: { assessmentId }
  })

  // Query for initial assessment state
  const { data: assessmentData, refetch } = useQuery(GET_ASSESSMENT, {
    variables: { id: assessmentId },
    pollInterval: 5000 // Fallback polling every 5 seconds
  })

  // Update progress from subscription
  useEffect(() => {
    if (progressData?.assessmentProgress) {
      setProgress(progressData.assessmentProgress)
      
      if (progressData.assessmentProgress.estimatedCompletion) {
        setEstimatedCompletion(new Date(progressData.assessmentProgress.estimatedCompletion))
      }
      
      // Trigger completion callback if finished
      if (progressData.assessmentProgress.stage === 'FINALIZING' && 
          progressData.assessmentProgress.percentage === 100) {
        setTimeout(() => {
          onComplete?.()
        }, 2000) // Small delay for UX
      }
    }
  }, [progressData, onComplete])

  // Update document progress
  useEffect(() => {
    if (docProgressData?.documentProcessing) {
      setDocumentProgress(prev => {
        const updated = [...prev]
        const existingIndex = updated.findIndex(
          doc => doc.documentId === docProgressData.documentProcessing.documentId
        )
        
        if (existingIndex >= 0) {
          updated[existingIndex] = docProgressData.documentProcessing
        } else {
          updated.push(docProgressData.documentProcessing)
        }
        
        return updated
      })
    }
  }, [docProgressData])

  // Initialize progress from query data
  useEffect(() => {
    if (assessmentData?.assessment?.processingProgress && !progress) {
      setProgress(assessmentData.assessment.processingProgress)
    }
  }, [assessmentData, progress])

  const getCurrentStepIndex = () => {
    if (!progress) return 0
    return PROCESSING_STEPS.findIndex(step => step.stage === progress.stage)
  }

  const getElapsedTime = () => {
    const elapsed = Date.now() - startTime
    const minutes = Math.floor(elapsed / 60000)
    const seconds = Math.floor((elapsed % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const getRemainingTime = () => {
    if (!estimatedCompletion) return 'Calculating...'
    
    const remaining = estimatedCompletion.getTime() - Date.now()
    if (remaining <= 0) return 'Almost done...'
    
    const minutes = Math.floor(remaining / 60000)
    const seconds = Math.floor((remaining % 60000) / 1000)
    
    if (minutes === 0) return `${seconds}s remaining`
    return `${minutes}:${seconds.toString().padStart(2, '0')} remaining`
  }

  if (!progress) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">
          Processing Your Assessment
        </h2>
        <p className="text-gray-400">
          Analyzing your responses and generating personalized insights
        </p>
      </div>

      {/* Overall Progress */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">
              Overall Progress
            </h3>
            <p className="text-gray-400">
              {progress.currentTask || 'Processing...'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">
              {progress.percentage}%
            </div>
            <div className="text-sm text-gray-400">
              {getElapsedTime()} elapsed
            </div>
          </div>
        </div>
        
        <Progress value={progress.percentage} className="h-3 mb-4" />
        
        <div className="flex justify-between text-sm text-gray-400">
          <span>Started at {new Date(startTime).toLocaleTimeString()}</span>
          <span>{getRemainingTime()}</span>
        </div>
      </Card>

      {/* Processing Steps */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-6">
          Processing Steps
        </h3>
        
        <div className="space-y-4">
          {PROCESSING_STEPS.map((step, index) => {
            const currentIndex = getCurrentStepIndex()
            const isActive = index === currentIndex
            const isCompleted = index < currentIndex
            const isFuture = index > currentIndex
            
            return (
              <motion.div
                key={step.stage}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center space-x-4 p-4 rounded-lg transition-all ${
                  isActive 
                    ? 'bg-blue-500/10 border border-blue-500/30' 
                    : isCompleted 
                    ? 'bg-green-500/10 border border-green-500/30'
                    : 'bg-gray-800/30'
                }`}
              >
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  isActive 
                    ? 'bg-blue-500 text-white' 
                    : isCompleted 
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-600 text-gray-400'
                }`}>
                  {isCompleted ? (
                    <CheckCircleIcon className="w-5 h-5" />
                  ) : isActive ? (
                    <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>
                
                <div className="flex-grow">
                  <div className="flex items-center space-x-2">
                    <h4 className={`font-medium ${
                      isActive ? 'text-blue-400' : isCompleted ? 'text-green-400' : 'text-gray-400'
                    }`}>
                      {step.title}
                    </h4>
                    {isActive && (
                      <Badge className="bg-blue-500/20 text-blue-400 text-xs">
                        In Progress
                      </Badge>
                    )}
                    {isCompleted && (
                      <Badge className="bg-green-500/20 text-green-400 text-xs">
                        Complete
                      </Badge>
                    )}
                  </div>
                  <p className={`text-sm ${
                    isActive ? 'text-white' : 'text-gray-500'
                  }`}>
                    {step.description}
                  </p>
                  {!isCompleted && (
                    <p className="text-xs text-gray-500 mt-1">
                      Estimated: {step.estimatedDuration}
                    </p>
                  )}
                </div>

                {isActive && progress.percentage > 0 && (
                  <div className="flex-shrink-0 w-16">
                    <div className="text-right text-sm text-blue-400 mb-1">
                      {progress.percentage}%
                    </div>
                    <Progress value={progress.percentage} className="h-1" />
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      </Card>

      {/* Document Processing Status */}
      {documentProgress.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Document Analysis Progress
          </h3>
          
          <div className="space-y-3">
            {documentProgress.map((doc, index) => (
              <motion.div
                key={doc.documentId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center space-x-3 p-3 bg-gray-800/30 rounded-lg"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  doc.processingStatus === 'COMPLETED' ? 'bg-green-500' :
                  doc.processingStatus === 'FAILED' ? 'bg-red-500' :
                  'bg-yellow-500'
                }`}>
                  {doc.processingStatus === 'COMPLETED' ? (
                    <CheckCircleIcon className="w-4 h-4 text-white" />
                  ) : doc.processingStatus === 'FAILED' ? (
                    <ExclamationTriangleIcon className="w-4 h-4 text-white" />
                  ) : (
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  )}
                </div>
                
                <div className="flex-grow">
                  <div className="text-white text-sm">
                    Document {index + 1}
                  </div>
                  <div className="text-gray-400 text-xs">
                    {doc.processingStatus.toLowerCase()}
                  </div>
                </div>
                
                {doc.analysisResults && (
                  <div className="text-xs text-green-400">
                    {doc.analysisResults.keyInsights?.length || 0} insights found
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </Card>
      )}

      {/* Errors */}
      {progress.errors && progress.errors.length > 0 && (
        <Card className="p-6 bg-red-500/10 border-red-500/30">
          <div className="flex items-center space-x-2 mb-4">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
            <h3 className="text-lg font-semibold text-red-400">
              Processing Issues
            </h3>
          </div>
          
          <ul className="space-y-2">
            {progress.errors.map((error, index) => (
              <li key={index} className="text-red-300 text-sm">
                • {error}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-center space-x-4">
        <Button variant="outline" size="sm">
          <ClockIcon className="w-4 h-4 mr-2" />
          View in Background
        </Button>
        {progress.errors && progress.errors.length > 0 && (
          <Button variant="outline" size="sm" className="text-red-400 border-red-400">
            Contact Support
          </Button>
        )}
      </div>
    </div>
  )
}