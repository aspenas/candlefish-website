import { NextRequest, NextResponse } from 'next/server'
import { AssessmentScoringEngine } from '@/lib/assessment/scoring-engine'
import { trackAssessmentComplete } from '@/lib/assessment/analytics'

export async function POST(request: NextRequest) {
  try {
    const { responses, sessionId } = await request.json()
    
    if (!responses || !Array.isArray(responses) || responses.length !== 14) {
      return NextResponse.json(
        { error: 'Invalid assessment data' },
        { status: 400 }
      )
    }
    
    // Calculate scores using the scoring engine
    const engine = new AssessmentScoringEngine()
    const score = engine.calculateScore(responses)
    
    // Generate operational portrait
    const portrait = engine.generatePortrait(responses, score)
    
    // Store assessment data (in production, this would go to a database)
    // For now, we'll just log it
    console.log('Assessment completed:', {
      sessionId,
      level: score.level,
      percentage: score.percentage,
      qualified: score.candlefishFit.qualified,
      timestamp: new Date().toISOString()
    })
    
    // Track completion
    const duration = Date.now() - (responses[0]?.timestamp || Date.now())
    trackAssessmentComplete(sessionId, score, duration)
    
    return NextResponse.json({
      score,
      portrait,
      reportUrl: `/api/assessment/report/${sessionId}`
    })
  } catch (error) {
    console.error('Assessment processing error:', error)
    return NextResponse.json(
      { error: 'Failed to process assessment' },
      { status: 500 }
    )
  }
}