import { NextRequest, NextResponse } from 'next/server'
import { Anthropic } from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

const MODEL = 'claude-opus-4-1-20250805'

export async function POST(request: NextRequest) {
  try {
    const { industry, documentInsights, questionResponses } = await request.json()

    const systemPrompt = `
    You are a pattern recognition expert specializing in ${industry} operations.
    Your role is to identify operational patterns, inefficiencies, and improvement opportunities
    by correlating document analysis with assessment responses.
    
    Focus on:
    1. Recurring issues across multiple data points
    2. Root cause identification
    3. Systemic vs isolated problems
    4. Hidden dependencies and bottlenecks
    5. Cultural and organizational patterns
    6. Technology and process gaps
    7. Financial impact correlations
    
    Quantify everything. Every pattern should have an associated cost or opportunity value.
    `

    const userPrompt = `
    Analyze these patterns from a ${industry} organization:

    DOCUMENT INSIGHTS:
    ${JSON.stringify(documentInsights, null, 2)}

    ASSESSMENT RESPONSES:
    ${JSON.stringify(questionResponses, null, 2)}

    PATTERN RECOGNITION TASKS:
    1. Identify TOP 10 operational patterns with financial impact
    2. Classify patterns by category (Process, People, Technology, Data, Customer)
    3. Determine pattern severity (Critical, High, Medium, Low)
    4. Calculate annual cost of each pattern
    5. Identify pattern interdependencies
    6. Recognize industry-specific anti-patterns
    7. Find positive patterns to leverage

    OUTPUT FORMAT:
    {
      "patterns": [
        {
          "id": "pattern_1",
          "title": "Pattern Name",
          "category": "Category",
          "severity": "Critical|High|Medium|Low",
          "description": "Detailed description",
          "evidence": ["Evidence 1", "Evidence 2"],
          "annualImpact": 500000,
          "affectedAreas": ["Area 1", "Area 2"],
          "rootCause": "Root cause analysis",
          "dependencies": ["pattern_2", "pattern_3"]
        }
      ],
      "maturityScores": {
        "overall": 2.5,
        "process": 2.0,
        "technology": 3.0,
        "people": 2.5,
        "data": 2.0,
        "customer": 3.5
      },
      "categories": {
        "Process": 4,
        "People": 3,
        "Technology": 2,
        "Data": 1,
        "Customer": 0
      }
    }
    `

    const completion = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 30000,
      temperature: 0.4,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    })

    const responseText = completion.content[0].type === 'text' 
      ? completion.content[0].text 
      : '{}'

    // Parse the JSON response
    let patterns
    try {
      patterns = JSON.parse(responseText)
    } catch (parseError) {
      // If not valid JSON, extract patterns from text
      patterns = extractPatternsFromText(responseText)
    }

    return NextResponse.json({
      success: true,
      count: patterns.patterns?.length || 0,
      categories: Object.keys(patterns.categories || {}).length,
      findings: patterns.patterns || [],
      maturityScores: patterns.maturityScores || {},
      tokensUsed: completion.usage?.input_tokens || 0,
      outputTokens: completion.usage?.output_tokens || 0
    })

  } catch (error) {
    console.error('Pattern recognition error:', error)
    return NextResponse.json(
      { error: 'Failed to recognize patterns', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

function extractPatternsFromText(text: string): any {
  // Fallback pattern extraction if JSON parsing fails
  const patterns = {
    patterns: [],
    maturityScores: {
      overall: 2.5,
      process: 2.0,
      technology: 3.0,
      people: 2.5,
      data: 2.0,
      customer: 3.0
    },
    categories: {}
  }

  // Look for dollar amounts as impact indicators
  const impactMatches = text.match(/\$[\d,]+[KM]?/g) || []
  
  // Look for pattern descriptions
  const patternMatches = text.match(/Pattern \d+:(.+?)(?=Pattern \d+:|$)/gs) || []
  
  patternMatches.forEach((match, index) => {
    const impact = impactMatches[index] || '$100K'
    const impactValue = parseImpactValue(impact)
    
    patterns.patterns.push({
      id: `pattern_${index + 1}`,
      title: `Operational Pattern ${index + 1}`,
      category: 'Process',
      severity: impactValue > 500000 ? 'Critical' : 'High',
      description: match.substring(0, 200),
      evidence: [],
      annualImpact: impactValue,
      affectedAreas: [],
      rootCause: 'Requires further analysis',
      dependencies: []
    })
  })

  return patterns
}

function parseImpactValue(impactStr: string): number {
  const cleanStr = impactStr.replace(/[$,]/g, '')
  let value = parseFloat(cleanStr)
  
  if (impactStr.includes('M')) {
    value *= 1000000
  } else if (impactStr.includes('K')) {
    value *= 1000
  }
  
  return value
}