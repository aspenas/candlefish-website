import { NextRequest, NextResponse } from 'next/server'
import { Anthropic } from '@anthropic-ai/sdk'

// Initialize Anthropic client with Claude Opus 4.1
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

// Model selection - ALWAYS use Claude Opus 4.1 as per requirements
const MODEL = 'claude-opus-4-1-20250805'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const documents = formData.getAll('documents') as File[]
    const industry = formData.get('industry') as string
    const responses = JSON.parse(formData.get('responses') as string)

    // Process documents into text
    const documentTexts = await Promise.all(
      documents.map(async (doc) => {
        const text = await doc.text()
        return {
          name: doc.name,
          type: doc.type,
          size: doc.size,
          content: text
        }
      })
    )

    // Calculate total content size
    const totalContent = documentTexts.reduce((acc, doc) => acc + doc.content, '')
    const estimatedTokens = Math.ceil(totalContent.length / 4) // Rough token estimate

    // Load the appropriate prompts based on industry
    const systemPrompt = await loadIndustryPrompt(industry)
    
    // Prepare the document analysis prompt
    const userPrompt = `
    You are analyzing documents for a ${industry} organization. Process the following documents and extract operational insights, patterns, and improvement opportunities worth $500K-$2M.

    DOCUMENTS PROVIDED:
    ${documentTexts.map(doc => `
    === Document: ${doc.name} (${doc.type}) ===
    ${doc.content.substring(0, 50000)} // Limit per document for initial analysis
    `).join('\n\n')}

    ASSESSMENT RESPONSES:
    ${JSON.stringify(responses, null, 2)}

    ANALYSIS REQUIREMENTS:
    1. Extract key operational metrics and KPIs
    2. Identify process inefficiencies and bottlenecks
    3. Recognize patterns across documents
    4. Find contradictions or gaps in documentation
    5. Quantify improvement opportunities with financial impact
    6. Prioritize quick wins vs strategic initiatives
    7. Map current state maturity across all dimensions

    Provide structured analysis following the Candlefish Operational Maturity Framework.
    Focus on actionable insights that can drive immediate value.
    `

    // Call Claude Opus 4.1 for document analysis
    const completion = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 50000, // Use generous output tokens for comprehensive analysis
      temperature: 0.3, // Lower temperature for more focused analysis
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ]
    })

    // Parse the response
    const analysisText = completion.content[0].type === 'text' 
      ? completion.content[0].text 
      : ''

    // Extract structured insights
    const insights = extractStructuredInsights(analysisText)

    return NextResponse.json({
      success: true,
      insights,
      pageCount: documentTexts.length,
      tokensUsed: completion.usage?.input_tokens || estimatedTokens,
      outputTokens: completion.usage?.output_tokens || 0,
      analysis: analysisText
    })

  } catch (error) {
    console.error('Document analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze documents', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

async function loadIndustryPrompt(industry: string): Promise<string> {
  // In production, load from file system or database
  // For now, return a comprehensive prompt
  return `
  You are the Candlefish AI Assessment Engine specializing in ${industry} operational excellence.
  
  Your expertise includes:
  - Deep ${industry} domain knowledge and best practices
  - Ability to identify $500K-$2M improvement opportunities
  - Pattern recognition across thousands of similar assessments
  - Industry-specific KPIs and benchmarks
  - Proven transformation methodologies
  
  CRITICAL RESTRICTION: Never provide services to financial services organizations.
  
  Apply the Candlefish Operational Maturity Framework:
  1. Process Excellence (documentation, standardization, automation)
  2. Data & Analytics (quality, insights, decision-making)
  3. Technology Infrastructure (modern, integrated, scalable)
  4. Customer Experience (satisfaction, loyalty, value)
  5. Workforce Capability (skills, engagement, productivity)
  6. Supply Chain & Operations (efficiency, visibility, optimization)
  7. Quality & Compliance (standards, controls, governance)
  8. Innovation & R&D (pipeline, investment, outcomes)
  9. Risk Management (identification, mitigation, resilience)
  10. Sustainability & ESG (environmental, social, governance)
  
  For each dimension, assess maturity on a 1-5 scale:
  1 - Ad Hoc: Reactive, undocumented, inconsistent
  2 - Managed: Basic processes, some documentation
  3 - Systematic: Standardized, measured, controlled
  4 - Predictable: Optimized, data-driven, proactive
  5 - Optimizing: Continuous improvement, innovation, excellence
  
  Always quantify opportunities with clear ROI calculations and implementation roadmaps.
  `
}

function extractStructuredInsights(analysisText: string): any {
  // Parse the AI response to extract structured data
  // In production, this would use more sophisticated parsing
  
  const insights = {
    keyFindings: [],
    maturityScores: {},
    opportunities: [],
    quickWins: [],
    risks: [],
    metrics: {}
  }

  // Extract sections from the analysis text
  const sections = analysisText.split(/\n## /g)
  
  sections.forEach(section => {
    if (section.includes('Key Findings') || section.includes('Findings')) {
      // Parse findings
      const findings = section.match(/- (.+)/g) || []
      insights.keyFindings = findings.map(f => f.replace('- ', ''))
    }
    
    if (section.includes('Maturity') || section.includes('Scores')) {
      // Parse maturity scores
      const scores = section.match(/(\w+):\s*([\d.]+)/g) || []
      scores.forEach(score => {
        const [dimension, value] = score.split(':').map(s => s.trim())
        insights.maturityScores[dimension] = parseFloat(value)
      })
    }
    
    if (section.includes('Opportunities')) {
      // Parse opportunities
      const opps = section.match(/\$[\d,]+[KM]?/g) || []
      insights.opportunities = opps.map(opp => ({
        value: opp,
        description: 'Extracted opportunity'
      }))
    }
  })

  return insights
}