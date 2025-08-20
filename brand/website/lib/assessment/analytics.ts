export function trackAssessmentStart(sessionId: string): void {
  if (typeof window !== 'undefined') {
    // Store session data
    window.sessionStorage.setItem('assessment-session', sessionId)
    window.sessionStorage.setItem('assessment-start', Date.now().toString())
    
    // Track with analytics services
    if ((window as any).gtag) {
      (window as any).gtag('event', 'assessment_started', {
        event_category: 'engagement',
        event_label: 'maturity_assessment',
        session_id: sessionId,
        timestamp: Date.now()
      })
    }
    
    // Track with Plausible if available
    if ((window as any).plausible) {
      (window as any).plausible('Assessment Started', {
        props: { session_id: sessionId }
      })
    }
  }
}

export function trackQuestionAnswered(
  sessionId: string,
  dimension: string,
  questionNumber: number,
  value: number
): void {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'question_answered', {
      event_category: 'assessment',
      session_id: sessionId,
      dimension,
      question_number: questionNumber,
      score: value
    })
  }
}

export function trackAssessmentComplete(
  sessionId: string,
  score: any,
  duration: number
): void {
  if (typeof window !== 'undefined') {
    if ((window as any).gtag) {
      (window as any).gtag('event', 'assessment_completed', {
        event_category: 'engagement',
        event_label: 'maturity_assessment',
        session_id: sessionId,
        level: score.level,
        percentage: score.percentage,
        percentile: score.percentile,
        qualified: score.candlefishFit.qualified,
        duration_seconds: Math.round(duration / 1000)
      })
    }
    
    if ((window as any).plausible) {
      (window as any).plausible('Assessment Completed', {
        props: {
          session_id: sessionId,
          level: score.level,
          qualified: score.candlefishFit.qualified
        }
      })
    }
  }
}

export function trackConsultationRequest(
  sessionId: string,
  score: any
): void {
  if (typeof window !== 'undefined') {
    if ((window as any).gtag) {
      (window as any).gtag('event', 'consultation_requested', {
        event_category: 'conversion',
        event_label: 'maturity_assessment',
        session_id: sessionId,
        level: score.level,
        percentage: score.percentage,
        value: score.percentage // Use score as value for tracking
      })
    }
    
    if ((window as any).plausible) {
      (window as any).plausible('Consultation Requested', {
        props: {
          session_id: sessionId,
          level: score.level
        }
      })
    }
  }
}

export function trackReportDownload(
  sessionId: string,
  format: 'pdf' | 'json'
): void {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'report_downloaded', {
      event_category: 'engagement',
      session_id: sessionId,
      format
    })
  }
}