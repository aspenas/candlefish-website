'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { 
  CheckCircleIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Textarea } from '@/components/ui/Textarea'

interface WizardState {
  industry?: string
  clientId?: string
  questionResponses: any[]
  documentIds: string[]
  notes?: string
}

interface AssessmentSummaryProps {
  wizardState: WizardState
  industries: any[]
  onNotesChange: (notes: string) => void
  isSubmitting: boolean
}

export function AssessmentSummary({
  wizardState,
  industries,
  onNotesChange,
  isSubmitting
}: AssessmentSummaryProps) {
  const selectedIndustry = industries.find(i => i.value === wizardState.industry)

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center space-x-2">
          <ClipboardDocumentCheckIcon className="w-5 h-5 text-blue-400" />
          <span>Assessment Summary</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Industry */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-400">Industry</div>
            <div className="flex items-center space-x-2">
              <div className="text-2xl">
                {wizardState.industry === 'TECHNOLOGY' && '💻'}
                {wizardState.industry === 'MANUFACTURING' && '🏭'}
                {wizardState.industry === 'HEALTHCARE' && '🏥'}
                {wizardState.industry === 'RETAIL' && '🏪'}
              </div>
              <div>
                <div className="text-white font-medium">
                  {selectedIndustry?.label || 'Selected Industry'}
                </div>
                <div className="text-xs text-gray-400">
                  Assessment tailored for this sector
                </div>
              </div>
            </div>
          </div>

          {/* Client */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-400">Client</div>
            <div className="flex items-center space-x-2">
              <UserGroupIcon className="w-5 h-5 text-gray-400" />
              <div>
                <div className="text-white font-medium">
                  {wizardState.clientId ? 'Client Selected' : 'New Client'}
                </div>
                <div className="text-xs text-gray-400">
                  Assessment will be associated with client
                </div>
              </div>
            </div>
          </div>

          {/* Responses */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-400">Assessment Responses</div>
            <div className="flex items-center space-x-2">
              <CheckCircleIcon className="w-5 h-5 text-green-400" />
              <div>
                <div className="text-white font-medium">
                  {wizardState.questionResponses.length} Questions Answered
                </div>
                <div className="text-xs text-gray-400">
                  Comprehensive operational assessment
                </div>
              </div>
            </div>
          </div>

          {/* Documents */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-400">Supporting Documents</div>
            <div className="flex items-center space-x-2">
              <DocumentTextIcon className="w-5 h-5 text-blue-400" />
              <div>
                <div className="text-white font-medium">
                  {wizardState.documentIds.length} {wizardState.documentIds.length === 1 ? 'Document' : 'Documents'} Uploaded
                </div>
                <div className="text-xs text-gray-400">
                  {wizardState.documentIds.length > 0 
                    ? 'Additional analysis will be performed'
                    : 'Assessment based on responses only'
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Assessment Overview */}
      <Card className="p-6">
        <h4 className="text-lg font-semibold text-white mb-4">
          What Happens Next?
        </h4>
        
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-start space-x-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg"
          >
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white text-sm flex items-center justify-center font-medium">
              1
            </div>
            <div>
              <div className="text-white font-medium text-sm">Analysis & Scoring</div>
              <div className="text-gray-400 text-xs">
                Your responses will be analyzed against industry benchmarks to calculate maturity scores
              </div>
            </div>
          </motion.div>

          {wizardState.documentIds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-start space-x-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg"
            >
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500 text-white text-sm flex items-center justify-center font-medium">
                2
              </div>
              <div>
                <div className="text-white font-medium text-sm">Document Analysis</div>
                <div className="text-gray-400 text-xs">
                  Uploaded documents will be analyzed for additional insights and validation
                </div>
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: wizardState.documentIds.length > 0 ? 0.3 : 0.2 }}
            className="flex items-start space-x-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg"
          >
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 text-white text-sm flex items-center justify-center font-medium">
              {wizardState.documentIds.length > 0 ? '3' : '2'}
            </div>
            <div>
              <div className="text-white font-medium text-sm">Insights & Recommendations</div>
              <div className="text-gray-400 text-xs">
                Generate actionable recommendations and improvement roadmap
              </div>
            </div>
          </motion.div>
        </div>
      </Card>

      {/* Additional Notes */}
      <Card className="p-6">
        <h4 className="text-lg font-semibold text-white mb-4">
          Additional Notes (Optional)
        </h4>
        <Textarea
          value={wizardState.notes || ''}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Add any specific context or areas of focus for this assessment..."
          rows={4}
          disabled={isSubmitting}
        />
      </Card>

      {/* Submission Status */}
      {isSubmitting && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-6 bg-blue-500/10 border-blue-500/30">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
              <div>
                <div className="text-white font-medium">Submitting Assessment</div>
                <div className="text-blue-200 text-sm">
                  Creating your assessment and preparing for analysis...
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  )
}