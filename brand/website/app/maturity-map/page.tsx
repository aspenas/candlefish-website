'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AssessmentEngine } from '@/lib/assessment/engine'
import { AssessmentView } from '@/components/assessment/assessment-interface'
import { IntroductionView } from '@/components/assessment/introduction-view'
import { ProcessingView } from '@/components/assessment/processing-view'
import { ResultsView } from '@/components/assessment/results-view'
import { ConsultationView } from '@/components/assessment/consultation-view'
import { AssessmentProgress } from '@/components/assessment/assessment-progress'
import { generateSessionId } from '@/lib/assessment/utils'
import { trackAssessmentStart } from '@/lib/assessment/analytics'
import type { AssessmentResponse, AssessmentScore, OperationalPortrait } from '@/types/assessment'

export default function OperationalMaturityAssessment() {
  const [stage, setStage] = useState<
    'introduction' | 'assessment' | 'processing' | 'results' | 'consultation'
  >('introduction')
  
  const [responses, setResponses] = useState<AssessmentResponse[]>([])
  const [currentDimension, setCurrentDimension] = useState(0)
  const [score, setScore] = useState<AssessmentScore | null>(null)
  const [portrait, setPortrait] = useState<OperationalPortrait | null>(null)
  const [sessionId, setSessionId] = useState<string>('')

  // Initialize session
  useEffect(() => {
    const id = generateSessionId()
    setSessionId(id)
    trackAssessmentStart(id)
  }, [])

  const handleResponse = (response: AssessmentResponse) => {
    const newResponses = [...responses, response]
    setResponses(newResponses)
    
    if (currentDimension < 13) {
      setCurrentDimension(currentDimension + 1)
    } else {
      setStage('processing')
    }
  }

  const handleBack = () => {
    if (currentDimension > 0) {
      setCurrentDimension(currentDimension - 1)
      setResponses(responses.slice(0, -1))
    }
  }

  const handleProcessingComplete = (results: { score: AssessmentScore; portrait: OperationalPortrait }) => {
    setScore(results.score)
    setPortrait(results.portrait)
    setStage('results')
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0D1B2A] via-[#1B263B] to-[#1C1C1C]">
      {/* Progress Indicator */}
      {stage === 'assessment' && (
        <AssessmentProgress 
          stage={stage}
          dimension={currentDimension}
          total={14}
        />
      )}

      <AnimatePresence mode="wait">
        {stage === 'introduction' && (
          <IntroductionView 
            key="introduction"
            onBegin={() => setStage('assessment')} 
          />
        )}

        {stage === 'assessment' && (
          <AssessmentView
            key="assessment"
            dimension={currentDimension}
            onResponse={handleResponse}
            onBack={handleBack}
          />
        )}

        {stage === 'processing' && (
          <ProcessingView 
            key="processing"
            responses={responses}
            sessionId={sessionId}
            onComplete={handleProcessingComplete}
          />
        )}

        {stage === 'results' && score && portrait && (
          <ResultsView
            key="results"
            score={score}
            portrait={portrait}
            responses={responses}
            sessionId={sessionId}
            onRequestConsultation={() => setStage('consultation')}
          />
        )}

        {stage === 'consultation' && score && (
          <ConsultationView 
            key="consultation"
            score={score}
            sessionId={sessionId}
          />
        )}
      </AnimatePresence>
    </main>
  )
}