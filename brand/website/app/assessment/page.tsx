'use client';

import React from 'react';
import { AssessmentForm } from '../../components/forms/AssessmentForm';
import { AssessmentResult } from '../../types/api';

export default function AssessmentPage() {
  const handleAssessmentComplete = (result: AssessmentResult) => {
    // Track analytics event
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'assessment_complete', {
        event_category: 'engagement',
        event_label: 'maturity_assessment',
        custom_parameters: {
          overall_score: result.overall.score,
          maturity_level: result.overall.level
        }
      });
    }

    // Could also redirect to results page or trigger email
    console.log('Assessment completed:', result);
  };

  const handleAssessmentSubmit = (answers: any[]) => {
    // Track analytics event
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'assessment_submit', {
        event_category: 'engagement',
        event_label: 'maturity_assessment'
      });
    }

    // Submit to API
    console.log('Assessment submitted:', answers);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-foam/5 to-sea-glow/5 py-12">
      <AssessmentForm
        assessmentId="maturity-assessment"
        onComplete={handleAssessmentComplete}
        onSubmit={handleAssessmentSubmit}
      />
    </div>
  );
}