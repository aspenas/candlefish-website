'use client';

import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AssessmentView } from './assessment-interface';
import { ResultsViewEnhanced } from './results-view-enhanced';
import { calculateScore, generatePortrait } from '@/lib/assessment/scoring';
import { assessmentDimensions } from '@/lib/assessment/questions';
import { trackAssessmentComplete } from '@/lib/assessment/analytics';
import type { AssessmentResponse, AssessmentScore, OperationalPortrait } from '@/types/assessment';

export const AssessmentOrchestrator = () => {
  const [currentDimension, setCurrentDimension] = useState(0);
  const [responses, setResponses] = useState<AssessmentResponse[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [score, setScore] = useState<AssessmentScore | null>(null);
  const [portrait, setPortrait] = useState<OperationalPortrait | null>(null);
  const [sessionId] = useState(() => 
    `assess-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  );

  const handleResponse = (response: AssessmentResponse) => {
    const updatedResponses = [...responses, response];
    setResponses(updatedResponses);

    // Move to next question or complete
    if (currentDimension < assessmentDimensions.length - 1) {
      setCurrentDimension(currentDimension + 1);
    } else {
      // Calculate results
      const finalScore = calculateScore(updatedResponses);
      const finalPortrait = generatePortrait(updatedResponses, finalScore);
      
      setScore(finalScore);
      setPortrait(finalPortrait);
      setIsComplete(true);
      
      // Track completion
      trackAssessmentComplete(sessionId, finalScore);
    }
  };

  const handleBack = () => {
    if (currentDimension > 0) {
      setCurrentDimension(currentDimension - 1);
      // Remove last response if going back
      setResponses(responses.slice(0, -1));
    }
  };

  const handleConsultationRequest = () => {
    // Navigate to consultation page
    window.location.href = '/consideration';
  };

  if (isComplete && score && portrait) {
    return (
      <ResultsViewEnhanced
        score={score}
        portrait={portrait}
        responses={responses}
        sessionId={sessionId}
        onRequestConsultation={handleConsultationRequest}
      />
    );
  }

  return (
    <AnimatePresence mode="wait">
      <AssessmentView
        key={currentDimension}
        dimension={currentDimension}
        onResponse={handleResponse}
        onBack={handleBack}
      />
    </AnimatePresence>
  );
};