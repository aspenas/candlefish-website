import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authMiddleware } from '@/lib/middleware/auth';
import { withCors, getCorsConfig } from '@/lib/middleware/cors';

// Request validation schema
const AgentRequestSchema = z.object({
  action: z.enum(['calculate', 'analyze', 'optimize', 'suggest']),
  data: z.record(z.string(), z.any()),
  context: z.object({
    estimateId: z.string().optional(),
    userId: z.string().optional(),
    projectId: z.string().optional(),
  }).optional(),
});

// Internal agent API handler
async function handlePost(request: NextRequest) {
  try {
    // Authenticate request
    const authResult = await authMiddleware(request, {
      allowedRoles: ['admin', 'user', 'estimator'],
    });

    if ('status' in authResult) {
      return authResult; // Return error response
    }

    const { user } = authResult;

    const body = await request.json();
    const validation = AgentRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { action, data, context } = validation.data;

    // Route to main agent platform API (internal only)
    if (!process.env.AGENT_PLATFORM_URL) {
      throw new Error('AGENT_PLATFORM_URL environment variable is required');
    }

    const agentResponse = await fetch(`${process.env.AGENT_PLATFORM_URL}/api/agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Request': 'true',
        'X-Service': 'paintbox',
      },
      body: JSON.stringify({
        prompt: buildPromptFromAction(action, data),
        metadata: {
          service: 'paintbox',
          action,
          userId: user.sub,
          userEmail: user.email,
          userRole: user.role,
          ...context,
        },
        config: {
          modelPreference: getModelForAction(action),
          maxRetries: 2,
          timeout: '30s',
        },
      }),
    });

    if (!agentResponse.ok) {
      throw new Error(`Agent platform error: ${agentResponse.statusText}`);
    }

    const result = await agentResponse.json();

    // Process and return Paintbox-specific response
    return NextResponse.json({
      success: true,
      action,
      result: processAgentResponse(action, result),
      metadata: {
        processingTime: result.metadata?.processingTime,
        model: result.metadata?.model,
      },
    });

  } catch (error) {
    console.error('Paintbox agent API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

function buildPromptFromAction(action: string, data: any): string {
  switch (action) {
    case 'calculate':
      return `Calculate painting estimates based on the following data:
        ${JSON.stringify(data, null, 2)}
        Provide accurate calculations considering:
        - Surface area and room dimensions
        - Paint coverage rates
        - Number of coats required
        - Labor hours
        - Material costs
        Return a detailed breakdown.`;

    case 'analyze':
      return `Analyze the painting project data:
        ${JSON.stringify(data, null, 2)}
        Identify:
        - Cost optimization opportunities
        - Potential issues or challenges
        - Recommended paint types and brands
        - Timeline considerations
        Provide actionable insights.`;

    case 'optimize':
      return `Optimize the painting estimate:
        ${JSON.stringify(data, null, 2)}
        Focus on:
        - Cost reduction without quality compromise
        - Efficient material usage
        - Labor optimization
        - Schedule compression opportunities
        Return specific recommendations with potential savings.`;

    case 'suggest':
      return `Provide suggestions for the painting project:
        ${JSON.stringify(data, null, 2)}
        Include:
        - Color recommendations based on room type
        - Finish suggestions (matte, satin, gloss)
        - Preparation requirements
        - Special considerations
        Return practical, actionable suggestions.`;

    default:
      return `Process this painting-related request: ${JSON.stringify(data)}`;
  }
}

function getModelForAction(action: string): 'anthropic' | 'openai' | 'together' {
  switch (action) {
    case 'calculate':
      return 'together'; // Simple calculations can use cheaper model
    case 'analyze':
    case 'optimize':
      return 'anthropic'; // Complex analysis needs better model
    case 'suggest':
      return 'openai'; // Creative suggestions
    default:
      return 'anthropic';
  }
}

function processAgentResponse(action: string, response: any): any {
  // Extract and structure the response based on action type
  const content = response.content || response.result || '';

  switch (action) {
    case 'calculate':
      // Parse calculation results
      return parseCalculationResponse(content);

    case 'analyze':
      // Structure analysis insights
      return parseAnalysisResponse(content);

    case 'optimize':
      // Extract optimization recommendations
      return parseOptimizationResponse(content);

    case 'suggest':
      // Format suggestions
      return parseSuggestionResponse(content);

    default:
      return { content };
  }
}

function parseCalculationResponse(content: string): any {
  // Parse AI response into structured calculation data
  try {
    // Attempt to extract JSON if present
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    // Fallback to text parsing
  }

  return {
    summary: content,
    details: extractDetailsFromText(content),
  };
}

function parseAnalysisResponse(content: string): any {
  return {
    insights: extractBulletPoints(content),
    recommendations: extractRecommendations(content),
    risks: extractRisks(content),
  };
}

function parseOptimizationResponse(content: string): any {
  return {
    optimizations: extractBulletPoints(content),
    savings: extractSavings(content),
    timeline: extractTimeline(content),
  };
}

function parseSuggestionResponse(content: string): any {
  return {
    suggestions: extractBulletPoints(content),
    rationale: extractRationale(content),
  };
}

// Helper functions for text parsing
function extractDetailsFromText(text: string): any[] {
  const lines = text.split('\n');
  const details: any[] = [];

  for (const line of lines) {
    if (line.includes(':') && !line.startsWith('#')) {
      const [key, value] = line.split(':').map(s => s.trim());
      if (key && value) {
        details.push({ key, value });
      }
    }
  }

  return details;
}

function extractBulletPoints(text: string): string[] {
  const lines = text.split('\n');
  return lines
    .filter(line => line.trim().match(/^[-•*]\s+/))
    .map(line => line.replace(/^[-•*]\s+/, '').trim());
}

function extractRecommendations(text: string): string[] {
  const recSection = text.match(/recommend[\s\S]*?(?=\n\n|\n#|$)/i);
  if (recSection) {
    return extractBulletPoints(recSection[0]);
  }
  return [];
}

function extractRisks(text: string): string[] {
  const riskSection = text.match(/risk[\s\S]*?(?=\n\n|\n#|$)/i);
  if (riskSection) {
    return extractBulletPoints(riskSection[0]);
  }
  return [];
}

function extractSavings(text: string): string {
  const savingsMatch = text.match(/\$[\d,]+(?:\.\d{2})?|[\d,]+%\s+savings?/i);
  return savingsMatch ? savingsMatch[0] : 'Not specified';
}

function extractTimeline(text: string): string {
  const timelineMatch = text.match(/\d+\s+(?:hours?|days?|weeks?)/i);
  return timelineMatch ? timelineMatch[0] : 'Not specified';
}

function extractRationale(text: string): string {
  const rationaleSection = text.match(/because[\s\S]*?(?=\n\n|\n#|$)/i);
  if (rationaleSection) {
    return rationaleSection[0].replace(/^because\s+/i, '').trim();
  }
  return text.split('\n')[0]; // Use first line as fallback
}

// Export wrapped with CORS
export const POST = withCors(handlePost, getCorsConfig());

// Handle OPTIONS requests for CORS preflight
export const OPTIONS = withCors(async () => new NextResponse(null, { status: 204 }), getCorsConfig());
