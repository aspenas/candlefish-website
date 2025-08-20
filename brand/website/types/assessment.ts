export interface AssessmentResponse {
  dimension: string
  value: number
  followUp: string
  timestamp: number
}

export interface DimensionScore {
  id: string
  name: string
  rawScore: number
  weightedScore: number
  maxScore: number
  percentile: number
}

export interface Strength {
  dimension: string
  score: number
  insight: string
}

export interface Intervention {
  dimension: string
  score: number
  action: string
  impact: 'high' | 'medium' | 'low'
}

export interface RecommendedIntervention {
  id: string
  title: string
  description: string
  timeline: string
  impact: 'high' | 'medium' | 'low'
  effort: 'high' | 'medium' | 'low'
  dependencies: string[]
}

export interface CandlefishFit {
  qualified: boolean
  reason: string
  prerequisites: string[]
}

export interface AssessmentScore {
  level: string
  percentage: number
  percentile: number
  dimensions: DimensionScore[]
  strengths: Strength[]
  interventions: Intervention[]
  recommendedInterventions: RecommendedIntervention[]
  suggestedTimeline: string
  candlefishFit: CandlefishFit
  industryComparison: number[]
  readiness: number
  sessionId: string
  timestamp: number
}

export interface OperationalPortrait {
  id: string
  dimensions: {
    id: string
    score: number
    label: string
  }[]
  signature: string
  pattern: 'fragmented' | 'emerging' | 'systematic' | 'optimized' | 'autonomous'
  color: string
}