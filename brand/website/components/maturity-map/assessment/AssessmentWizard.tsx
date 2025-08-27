'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation, useQuery } from '@apollo/client'
import { 
  ArrowLeftIcon, 
  ArrowRightIcon,
  DocumentPlusIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Progress } from '@/components/ui/Progress'
import { IndustrySelector } from './IndustrySelector'
import { ClientSelector } from './ClientSelector'
import { QuestionFlow } from './QuestionFlow'
import { DocumentUploader } from './DocumentUploader'
import { AssessmentSummary } from './AssessmentSummary'
import { CREATE_ASSESSMENT, GET_INDUSTRIES } from '@/lib/graphql/queries'
import type { 
  CreateAssessmentInput, 
  QuestionResponse,
  Industry 
} from '@/lib/graphql/types'

interface AssessmentWizardProps {
  operatorId: string
  onComplete: (assessmentId: string) => void
  onCancel: () => void
}

type WizardStep = 
  | 'industry'
  | 'client' 
  | 'questions'
  | 'documents'
  | 'summary'
  | 'processing'

interface WizardState {
  industry?: Industry
  clientId?: string
  questionResponses: QuestionResponse[]
  documentIds: string[]
  notes?: string
}

const STEPS: { id: WizardStep; title: string; description: string }[] = [
  {
    id: 'industry',
    title: 'Select Industry',
    description: 'Choose the industry sector for this assessment'
  },
  {
    id: 'client',
    title: 'Select Client',
    description: 'Choose existing client or create a new one'
  },
  {
    id: 'questions',
    title: 'Assessment Questions',
    description: 'Answer questions about operational maturity'
  },
  {
    id: 'documents',
    title: 'Upload Documents',
    description: 'Upload relevant documents for analysis (optional)'
  },
  {
    id: 'summary',
    title: 'Review & Submit',
    description: 'Review your responses and submit the assessment'
  }
]

export function AssessmentWizard({
  operatorId,
  onComplete,
  onCancel
}: AssessmentWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('industry')
  const [wizardState, setWizardState] = useState<WizardState>({
    questionResponses: [],
    documentIds: []
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: industriesData } = useQuery(GET_INDUSTRIES)
  
  const [createAssessment] = useMutation(CREATE_ASSESSMENT, {
    onCompleted: (data) => {
      onComplete(data.createAssessment.id)
    },
    onError: (error) => {
      console.error('Failed to create assessment:', error)
      setIsSubmitting(false)
    }
  })

  const getCurrentStepIndex = () => {
    return STEPS.findIndex(step => step.id === currentStep)
  }

  const progress = ((getCurrentStepIndex() + 1) / STEPS.length) * 100

  const canProceed = () => {
    switch (currentStep) {
      case 'industry':
        return !!wizardState.industry
      case 'client':
        return !!wizardState.clientId
      case 'questions':
        return wizardState.questionResponses.length > 0
      case 'documents':
        return true // Documents are optional
      case 'summary':
        return !isSubmitting
      default:
        return false
    }
  }

  const handleNext = () => {
    const currentIndex = getCurrentStepIndex()
    if (currentIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentIndex + 1].id)
    }
  }

  const handleBack = () => {
    const currentIndex = getCurrentStepIndex()
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1].id)
    }
  }

  const handleSubmit = async () => {
    if (!canProceed()) return

    setIsSubmitting(true)

    try {
      const input: CreateAssessmentInput = {
        operatorId,
        clientId: wizardState.clientId,
        industry: wizardState.industry!,
        questionResponses: wizardState.questionResponses,
        documentIds: wizardState.documentIds.length > 0 ? wizardState.documentIds : undefined
      }

      await createAssessment({ variables: { input } })
    } catch (error) {
      console.error('Assessment submission failed:', error)
      setIsSubmitting(false)
    }
  }

  const updateWizardState = useCallback((updates: Partial<WizardState>) => {
    setWizardState(prev => ({ ...prev, ...updates }))
  }, [])

  const renderStep = () => {
    switch (currentStep) {
      case 'industry':
        return (
          <IndustrySelector
            industries={industriesData?.industries || []}
            selectedIndustry={wizardState.industry}
            onSelect={(industry) => updateWizardState({ industry })}
          />
        )
      
      case 'client':
        return (
          <ClientSelector
            operatorId={operatorId}
            selectedClientId={wizardState.clientId}
            onSelect={(clientId) => updateWizardState({ clientId })}
          />
        )
      
      case 'questions':
        return (
          <QuestionFlow
            industry={wizardState.industry!}
            responses={wizardState.questionResponses}
            onResponsesChange={(responses) => 
              updateWizardState({ questionResponses: responses })
            }
          />
        )
      
      case 'documents':
        return (
          <DocumentUploader
            operatorId={operatorId}
            documentIds={wizardState.documentIds}
            onDocumentsChange={(documentIds) => 
              updateWizardState({ documentIds })
            }
          />
        )
      
      case 'summary':
        return (
          <AssessmentSummary
            wizardState={wizardState}
            industries={industriesData?.industries || []}
            onNotesChange={(notes) => updateWizardState({ notes })}
            isSubmitting={isSubmitting}
          />
        )
      
      default:
        return null
    }
  }

  const currentStepData = STEPS.find(step => step.id === currentStep)

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0D1B2A] via-[#1B263B] to-[#1C1C1C] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-white">
              New Assessment
            </h1>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onCancel}
            >
              Cancel
            </Button>
          </div>
          
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-400">
              <span>Step {getCurrentStepIndex() + 1} of {STEPS.length}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>

        {/* Step Header */}
        <Card className="p-6 mb-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-white mb-2">
              {currentStepData?.title}
            </h2>
            <p className="text-gray-400">
              {currentStepData?.description}
            </p>
          </div>
        </Card>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="mb-8"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={getCurrentStepIndex() === 0}
              className="flex items-center space-x-2"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              <span>Back</span>
            </Button>

            <div className="flex items-center space-x-2 text-sm text-gray-400">
              {STEPS.map((step, index) => (
                <div
                  key={step.id}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index <= getCurrentStepIndex()
                      ? 'bg-blue-400'
                      : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>

            {currentStep === 'summary' ? (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed() || isSubmitting}
                className="flex items-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-4 h-4" />
                    <span>Submit Assessment</span>
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="flex items-center space-x-2"
              >
                <span>
                  {currentStep === 'documents' ? 'Review' : 'Next'}
                </span>
                <ArrowRightIcon className="w-4 h-4" />
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}