import { NextRequest, NextResponse } from 'next/server'
import { Anthropic } from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

const MODEL = 'claude-opus-4-1-20250805'

// Industry benchmark data (in production, this would come from a database)
const INDUSTRY_BENCHMARKS: Record<string, any> = {
  healthcare: {
    process: { p25: 2.0, p50: 3.0, p75: 4.0, best: 4.5 },
    technology: { p25: 2.5, p50: 3.5, p75: 4.2, best: 4.8 },
    people: { p25: 2.2, p50: 3.2, p75: 4.0, best: 4.6 },
    data: { p25: 1.8, p50: 2.8, p75: 3.8, best: 4.5 },
    customer: { p25: 2.5, p50: 3.5, p75: 4.3, best: 4.9 }
  },
  manufacturing: {
    process: { p25: 2.3, p50: 3.3, p75: 4.1, best: 4.7 },
    technology: { p25: 2.0, p50: 3.0, p75: 4.0, best: 4.6 },
    people: { p25: 2.1, p50: 3.1, p75: 3.9, best: 4.5 },
    data: { p25: 2.0, p50: 3.0, p75: 4.0, best: 4.7 },
    customer: { p25: 2.4, p50: 3.4, p75: 4.2, best: 4.8 }
  },
  retail: {
    process: { p25: 2.2, p50: 3.2, p75: 4.0, best: 4.6 },
    technology: { p25: 2.6, p50: 3.6, p75: 4.3, best: 4.9 },
    people: { p25: 2.0, p50: 3.0, p75: 3.8, best: 4.4 },
    data: { p25: 2.3, p50: 3.3, p75: 4.1, best: 4.8 },
    customer: { p25: 2.8, p50: 3.8, p75: 4.4, best: 5.0 }
  },
  technology: {
    process: { p25: 2.5, p50: 3.5, p75: 4.3, best: 4.9 },
    technology: { p25: 3.0, p50: 4.0, p75: 4.5, best: 5.0 },
    people: { p25: 2.6, p50: 3.6, p75: 4.2, best: 4.8 },
    data: { p25: 2.8, p50: 3.8, p75: 4.4, best: 5.0 },
    customer: { p25: 2.7, p50: 3.7, p75: 4.3, best: 4.9 }
  },
  energy: {
    process: { p25: 2.1, p50: 3.1, p75: 3.9, best: 4.5 },
    technology: { p25: 2.2, p50: 3.2, p75: 4.0, best: 4.6 },
    people: { p25: 2.0, p50: 3.0, p75: 3.8, best: 4.4 },
    data: { p25: 1.9, p50: 2.9, p75: 3.9, best: 4.6 },
    customer: { p25: 2.3, p50: 3.3, p75: 4.1, best: 4.7 }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { industry, currentState } = await request.json()

    // Get industry benchmarks
    const benchmarks = INDUSTRY_BENCHMARKS[industry.toLowerCase()] || INDUSTRY_BENCHMARKS['technology']

    const systemPrompt = `
    You are a benchmarking expert specializing in ${industry} operational maturity assessment.
    
    Your role is to:
    1. Compare current state against industry benchmarks
    2. Identify gaps and improvement opportunities
    3. Calculate percentile rankings
    4. Provide peer comparisons
    5. Quantify the value of closing gaps
    6. Prioritize improvement areas
    
    Use data-driven analysis and provide specific, actionable insights.
    Focus on the financial impact of maturity gaps.
    `

    const userPrompt = `
    Compare this ${industry} organization's maturity against industry benchmarks:

    CURRENT MATURITY SCORES:
    ${JSON.stringify(currentState, null, 2)}

    INDUSTRY BENCHMARKS:
    ${JSON.stringify(benchmarks, null, 2)}

    ANALYSIS REQUIREMENTS:
    1. Calculate percentile ranking for each dimension
    2. Identify biggest gaps to industry median (p50)
    3. Quantify value of reaching p75 performance
    4. Provide specific examples of what p75 organizations do differently
    5. Calculate overall maturity percentile
    6. Identify quick wins to improve rankings
    7. Estimate financial impact of maturity improvements

    OUTPUT FORMAT:
    {
      "maturityScores": {
        "overall": X.X,
        "dimensions": [
          {
            "name": "Process Excellence",
            "score": X.X,
            "benchmark": X.X,
            "percentile": XX,
            "gap": X.X,
            "opportunities": [
              {
                "description": "Specific improvement",
                "impact": "$XXXk annually",
                "effort": "Low|Medium|High"
              }
            ]
          }
        ]
      },
      "percentile": XX,
      "gaps": [
        {
          "dimension": "Name",
          "currentScore": X.X,
          "targetScore": X.X,
          "gap": X.X,
          "valueOfClosingGap": "$XXXk",
          "actionsRequired": ["Action 1", "Action 2"]
        }
      ],
      "peerComparison": {
        "bottomQuartile": "Description of p25 organizations",
        "median": "Description of p50 organizations",
        "topQuartile": "Description of p75 organizations",
        "bestInClass": "Description of best performers"
      }
    }
    `

    const completion = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 20000,
      temperature: 0.3,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    })

    const responseText = completion.content[0].type === 'text' 
      ? completion.content[0].text 
      : '{}'

    // Parse the response
    let benchmarkAnalysis
    try {
      benchmarkAnalysis = JSON.parse(responseText)
    } catch (parseError) {
      benchmarkAnalysis = generateFallbackBenchmarks(currentState, benchmarks)
    }

    return NextResponse.json({
      success: true,
      percentile: benchmarkAnalysis.percentile || calculatePercentile(currentState, benchmarks),
      maturityScores: benchmarkAnalysis.maturityScores || {},
      gaps: benchmarkAnalysis.gaps || [],
      peerComparison: benchmarkAnalysis.peerComparison || {},
      tokensUsed: completion.usage?.input_tokens || 0,
      outputTokens: completion.usage?.output_tokens || 0
    })

  } catch (error) {
    console.error('Benchmark comparison error:', error)
    return NextResponse.json(
      { error: 'Failed to compare benchmarks', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

function calculatePercentile(currentState: any, benchmarks: any): number {
  // Simple percentile calculation based on overall score
  const overallScore = currentState.overall || 2.5
  
  // Rough percentile calculation
  if (overallScore < 2.0) return 10
  if (overallScore < 2.5) return 25
  if (overallScore < 3.0) return 40
  if (overallScore < 3.5) return 60
  if (overallScore < 4.0) return 75
  if (overallScore < 4.5) return 90
  return 95
}

function generateFallbackBenchmarks(currentState: any, benchmarks: any): any {
  const dimensions = ['process', 'technology', 'people', 'data', 'customer']
  
  const maturityDimensions = dimensions.map(dim => {
    const score = currentState[dim] || 2.5
    const benchmark = benchmarks[dim]?.p50 || 3.0
    const gap = benchmark - score
    
    return {
      name: dim.charAt(0).toUpperCase() + dim.slice(1),
      score,
      benchmark,
      percentile: calculatePercentile({ overall: score }, {}),
      gap,
      opportunities: [
        {
          description: `Improve ${dim} maturity to industry median`,
          impact: `$${Math.round(gap * 200)}k annually`,
          effort: gap > 1 ? 'High' : gap > 0.5 ? 'Medium' : 'Low'
        }
      ]
    }
  })

  return {
    maturityScores: {
      overall: currentState.overall || 2.5,
      dimensions: maturityDimensions
    },
    percentile: calculatePercentile(currentState, benchmarks),
    gaps: maturityDimensions.filter(d => d.gap > 0).map(d => ({
      dimension: d.name,
      currentScore: d.score,
      targetScore: d.benchmark,
      gap: d.gap,
      valueOfClosingGap: `$${Math.round(d.gap * 200)}k`,
      actionsRequired: ['Assess current state', 'Develop improvement plan', 'Implement changes']
    })),
    peerComparison: {
      bottomQuartile: 'Organizations with basic operational capabilities',
      median: 'Organizations with standardized processes and moderate automation',
      topQuartile: 'Organizations with advanced capabilities and data-driven operations',
      bestInClass: 'Industry leaders with optimized, AI-driven operations'
    }
  }
}