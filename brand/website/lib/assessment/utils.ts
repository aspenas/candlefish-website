export function generateSessionId(): string {
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 9)
  return `OMA-${timestamp}-${randomPart}`.toUpperCase()
}

export function trackAssessmentStart(sessionId: string): void {
  // In production, this would send to analytics
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem('assessment-session', sessionId)
    window.sessionStorage.setItem('assessment-start', Date.now().toString())

    // Track with any analytics service
    if ((window as any).gtag) {
      (window as any).gtag('event', 'assessment_started', {
        session_id: sessionId,
        timestamp: Date.now()
      })
    }
  }
}

export function trackAssessmentComplete(sessionId: string, score: any): void {
  if (typeof window !== 'undefined') {
    const startTime = window.sessionStorage.getItem('assessment-start')
    const duration = startTime ? Date.now() - parseInt(startTime) : 0

    if ((window as any).gtag) {
      (window as any).gtag('event', 'assessment_completed', {
        session_id: sessionId,
        level: score.level,
        percentage: score.percentage,
        duration: Math.round(duration / 1000),
        qualified: score.candlefishFit.qualified
      })
    }
  }
}

export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`
  }
  return `${seconds}s`
}

export function downloadJSON(data: any, filename: string): void {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
