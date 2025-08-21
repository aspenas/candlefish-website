import { assessmentDimensions } from './questions'
import { generateSessionId } from './utils'
import type {
  AssessmentResponse,
  AssessmentScore,
  DimensionScore,
  Strength,
  Intervention,
  RecommendedIntervention,
  CandlefishFit,
  OperationalPortrait
} from '@/types/assessment'

export class AssessmentScoringEngine {
  calculateScore(responses: AssessmentResponse[]): AssessmentScore {
    // Calculate weighted scores
    const dimensions: DimensionScore[] = responses.map((r, idx) => {
      const question = assessmentDimensions[idx]
      const rawScore = r.value
      const weightedScore = rawScore * question.weight

      return {
        id: question.id,
        name: question.dimension,
        rawScore,
        weightedScore,
        maxScore: 4 * question.weight,
        percentile: this.calculatePercentile(rawScore, question.id)
      }
    })

    // Overall maturity level (0-4)
    const totalWeightedScore = dimensions.reduce((sum, d) => sum + d.weightedScore, 0)
    const maxPossibleScore = dimensions.reduce((sum, d) => sum + d.maxScore, 0)
    const overallPercentage = (totalWeightedScore / maxPossibleScore) * 100

    const level = this.determineLevel(overallPercentage)
    const percentile = this.calculateOverallPercentile(overallPercentage)

    // Identify strengths and interventions
    const sortedDimensions = [...dimensions].sort((a, b) => b.rawScore - a.rawScore)
    const strengths = sortedDimensions.slice(0, 3).map(d => ({
      dimension: d.name,
      score: d.rawScore,
      insight: this.generateStrengthInsight(d)
    }))

    const interventions = sortedDimensions.slice(-3).reverse().map(d => ({
      dimension: d.name,
      score: d.rawScore,
      action: this.generateInterventionAction(d),
      impact: this.estimateImpact(d) as 'high' | 'medium' | 'low'
    }))

    // Generate recommendations
    const recommendedInterventions = this.generateInterventionSequence(dimensions, responses)
    const suggestedTimeline = this.generateTimeline(recommendedInterventions)

    // Assess Candlefish fit
    const candlefishFit = this.assessCandlefishFit(overallPercentage, dimensions)

    // Industry comparison
    const industryComparison = this.getIndustryBenchmarks(responses)

    return {
      level,
      percentage: Math.round(overallPercentage),
      percentile,
      dimensions,
      strengths,
      interventions,
      recommendedInterventions,
      suggestedTimeline,
      candlefishFit,
      industryComparison,
      readiness: this.calculateReadiness(dimensions),
      sessionId: generateSessionId(),
      timestamp: Date.now()
    }
  }

  private determineLevel(percentage: number): string {
    if (percentage < 20) return 'Level 0: Ad-hoc'
    if (percentage < 40) return 'Level 1: Scripted'
    if (percentage < 60) return 'Level 2: Assisted'
    if (percentage < 80) return 'Level 3: Orchestrated'
    return 'Level 4: Autonomous'
  }

  private calculatePercentile(score: number, dimensionId: string): number {
    // Simulate industry data - in production, this would query real benchmarks
    const benchmarks: Record<string, number[]> = {
      'data-state': [0.8, 1.5, 2.2, 2.8, 3.5],
      'decision-velocity': [0.7, 1.4, 2.0, 2.7, 3.4],
      'process-archaeology': [0.9, 1.6, 2.3, 2.9, 3.6],
      'exception-handling': [0.6, 1.3, 1.9, 2.6, 3.3],
      'knowledge-distribution': [0.7, 1.4, 2.1, 2.8, 3.5],
      'tool-sprawl': [1.0, 1.7, 2.4, 3.0, 3.7],
      'automation-depth': [0.5, 1.2, 1.8, 2.5, 3.2],
      'feedback-loops': [0.6, 1.3, 2.0, 2.7, 3.4],
      'operational-debt': [0.8, 1.5, 2.2, 2.9, 3.6],
      'change-capacity': [0.7, 1.4, 2.1, 2.8, 3.5],
      'metric-clarity': [0.6, 1.3, 2.0, 2.7, 3.4],
      'integration-maturity': [0.5, 1.2, 1.9, 2.6, 3.3],
      'human-system-balance': [0.7, 1.4, 2.1, 2.8, 3.5],
      'recovery-capability': [0.6, 1.3, 2.0, 2.7, 3.4]
    }

    const benchmark = benchmarks[dimensionId] || [0.7, 1.4, 2.1, 2.8, 3.5]
    let percentile = 0

    for (let i = 0; i < benchmark.length; i++) {
      if (score >= benchmark[i]) {
        percentile = (i + 1) * 20
      }
    }

    return Math.min(percentile, 99)
  }

  private calculateOverallPercentile(percentage: number): number {
    // Industry distribution simulation
    if (percentage < 15) return 10
    if (percentage < 25) return 20
    if (percentage < 35) return 30
    if (percentage < 45) return 40
    if (percentage < 55) return 50
    if (percentage < 65) return 60
    if (percentage < 75) return 70
    if (percentage < 85) return 80
    if (percentage < 95) return 90
    return 95
  }

  private generateStrengthInsight(dimension: DimensionScore): string {
    const insights: Record<string, string[]> = {
      'data-state': [
        'Foundation for data-driven decisions',
        'Strong visibility into operations',
        'Ready for advanced analytics'
      ],
      'decision-velocity': [
        'Rapid response capability',
        'Competitive advantage in speed',
        'Agile decision infrastructure'
      ],
      'change-capacity': [
        'Evolutionary operations capability',
        'Low risk for transformation',
        'Innovation-ready infrastructure'
      ]
    }

    const dimensionInsights = insights[dimension.id] || ['Strong operational capability']
    return dimensionInsights[Math.min(Math.floor(dimension.rawScore / 2), dimensionInsights.length - 1)]
  }

  private generateInterventionAction(dimension: DimensionScore): string {
    const actions: Record<string, string[]> = {
      'data-state': [
        'Centralize operational data immediately',
        'Implement basic data collection',
        'Create unified data repository'
      ],
      'decision-velocity': [
        'Map decision bottlenecks',
        'Automate routine decisions',
        'Create decision support systems'
      ],
      'automation-depth': [
        'Identify top 3 processes for automation',
        'Implement workflow automation',
        'Deploy intelligent automation'
      ]
    }

    const dimensionActions = actions[dimension.id] || ['Focus improvement efforts here']
    return dimensionActions[Math.min(2 - Math.floor(dimension.rawScore), dimensionActions.length - 1)]
  }

  private estimateImpact(dimension: DimensionScore): 'high' | 'medium' | 'low' {
    const criticalDimensions = ['data-state', 'decision-velocity', 'change-capacity']
    if (criticalDimensions.includes(dimension.id) && dimension.rawScore < 2) {
      return 'high'
    }
    if (dimension.rawScore < 1.5) {
      return 'high'
    }
    if (dimension.rawScore < 2.5) {
      return 'medium'
    }
    return 'low'
  }

  private generateInterventionSequence(
    dimensions: DimensionScore[],
    responses: AssessmentResponse[]
  ): RecommendedIntervention[] {
    const interventions: RecommendedIntervention[] = []

    // Priority 1: Data foundation
    const dataState = dimensions.find(d => d.id === 'data-state')
    if (dataState && dataState.rawScore < 3) {
      interventions.push({
        id: 'data-foundation',
        title: 'Establish Data Foundation',
        description: 'Centralize operational data and create single source of truth',
        timeline: '4-6 weeks',
        impact: 'high',
        effort: 'medium',
        dependencies: []
      })
    }

    // Priority 2: Decision velocity
    const decisionVelocity = dimensions.find(d => d.id === 'decision-velocity')
    if (decisionVelocity && decisionVelocity.rawScore < 3) {
      interventions.push({
        id: 'decision-acceleration',
        title: 'Accelerate Decision Making',
        description: 'Remove bottlenecks and automate routine decisions',
        timeline: '6-8 weeks',
        impact: 'high',
        effort: 'medium',
        dependencies: ['data-foundation']
      })
    }

    // Priority 3: Automation
    const automation = dimensions.find(d => d.id === 'automation-depth')
    if (automation && automation.rawScore < 3) {
      interventions.push({
        id: 'process-automation',
        title: 'Automate Core Processes',
        description: 'Identify and automate top 5 manual processes',
        timeline: '8-12 weeks',
        impact: 'medium',
        effort: 'high',
        dependencies: ['data-foundation', 'decision-acceleration']
      })
    }

    return interventions.slice(0, 5)
  }

  private generateTimeline(interventions: RecommendedIntervention[]): string {
    const totalWeeks = interventions.reduce((sum, i) => {
      const weeks = parseInt(i.timeline.split('-')[1])
      return sum + (weeks || 8)
    }, 0)

    const months = Math.ceil(totalWeeks / 4)
    return `${months}-${months + 1} months for primary interventions`
  }

  private assessCandlefishFit(percentage: number, dimensions: DimensionScore[]): CandlefishFit {
    const criticalDimensions = ['data-state', 'change-capacity', 'decision-velocity']
    const criticalScores = dimensions
      .filter(d => criticalDimensions.includes(d.id))
      .map(d => d.rawScore)

    const avgCritical = criticalScores.reduce((a, b) => a + b, 0) / criticalScores.length

    if (avgCritical < 1) {
      return {
        qualified: false,
        reason: 'Foundational operational structures need establishment before systematic transformation.',
        prerequisites: ['Basic data centralization', 'Process documentation', 'Clear ownership model']
      }
    }

    if (avgCritical >= 2 && percentage >= 30) {
      return {
        qualified: true,
        reason: 'Your operation has sufficient foundation for systematic improvement. High-impact interventions identified.',
        prerequisites: []
      }
    }

    return {
      qualified: false,
      reason: 'Focus on consolidating current systems before pursuing transformation.',
      prerequisites: ['Tool consolidation', 'Process standardization']
    }
  }

  private getIndustryBenchmarks(responses: AssessmentResponse[]): number[] {
    // Simulated industry averages
    return responses.map(() => 2.1 + Math.random() * 0.8)
  }

  private calculateReadiness(dimensions: DimensionScore[]): number {
    const readinessFactors = [
      'data-state',
      'change-capacity',
      'decision-velocity',
      'knowledge-distribution'
    ]

    const relevantDimensions = dimensions.filter(d => readinessFactors.includes(d.id))
    const avgScore = relevantDimensions.reduce((sum, d) => sum + d.rawScore, 0) / relevantDimensions.length

    return Math.round((avgScore / 4) * 100)
  }

  generatePortrait(responses: AssessmentResponse[], score: AssessmentScore): OperationalPortrait {
    const pattern = this.determinePattern(score.percentage)
    const color = this.determineColor(pattern)

    return {
      id: generateSessionId(),
      dimensions: score.dimensions.map(d => ({
        id: d.id,
        score: d.rawScore,
        label: d.name
      })),
      signature: this.generateSignature(responses),
      pattern,
      color
    }
  }

  private determinePattern(percentage: number): OperationalPortrait['pattern'] {
    if (percentage < 20) return 'fragmented'
    if (percentage < 40) return 'emerging'
    if (percentage < 60) return 'systematic'
    if (percentage < 80) return 'optimized'
    return 'autonomous'
  }

  private determineColor(pattern: OperationalPortrait['pattern']): string {
    const colors = {
      fragmented: '#E84855',
      emerging: '#F77F00',
      systematic: '#FCBF49',
      optimized: '#3FD3C6',
      autonomous: '#4FE3D6'
    }
    return colors[pattern]
  }

  private generateSignature(responses: AssessmentResponse[]): string {
    // Create unique signature based on response pattern
    return responses
      .map(r => r.value.toString())
      .join('')
      .match(/.{1,4}/g)
      ?.join('-') || ''
  }
}
