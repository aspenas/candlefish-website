import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@temporalio/client';
import { AgentOrchestrationWorkflow } from '../../../../../services/temporal/workflows/agent-orchestrator';
import { SecretsManager } from '../../../../../services/secrets/secrets-manager';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// Request validation schema
const AgentRequestSchema = z.object({
  prompt: z.string().min(1).max(10000),
  metadata: z.object({
    projectId: z.string().optional(),
    contextIds: z.array(z.string()).optional(),
    preferences: z.record(z.any()).optional(),
  }).optional(),
  options: z.object({
    stream: z.boolean().optional(),
    format: z.enum(['text', 'json', 'markdown']).optional(),
    language: z.string().optional(),
  }).optional(),
  config: z.object({
    maxRetries: z.number().optional(),
    timeout: z.string().optional(),
    modelPreference: z.enum(['anthropic', 'openai', 'together']).optional(),
  }).optional(),
});

let temporalClient: Client | null = null;

async function getTemporalClient(): Promise<Client> {
  if (temporalClient) return temporalClient;

  const secretsManager = new SecretsManager();
  const temporalConfig = await secretsManager.getSecret('temporal/cloud/credentials');

  let config;
  try {
    config = JSON.parse(temporalConfig);
  } catch {
    // Fallback to local Temporal
    config = {
      address: 'localhost:7233',
      namespace: 'default',
    };
  }

  temporalClient = new Client({
    connection: {
      address: config.address,
    },
    namespace: config.namespace,
  });

  return temporalClient;
}

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = AgentRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request',
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const agentRequest = validation.data;

    // Get user context from headers/session
    const userId = request.headers.get('x-user-id') || 'anonymous';
    const sessionId = request.headers.get('x-session-id') || uuidv4();

    // Rate limiting check
    const rateLimitResult = await checkRateLimit(userId);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter,
        },
        { status: 429 }
      );
    }

    // Get Temporal client
    const client = await getTemporalClient();

    // Start workflow
    const workflowId = `agent-${sessionId}-${Date.now()}`;
    const handle = await client.workflow.start(AgentOrchestrationWorkflow, {
      taskQueue: 'candlefish-agent-queue',
      workflowId,
      args: [{
        request: agentRequest,
        userId,
        sessionId,
        config: agentRequest.config,
      }],
    });

    // Handle streaming if requested
    if (agentRequest.options?.stream) {
      // Return streaming response
      return new NextResponse(
        createStreamingResponse(handle, workflowId),
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        }
      );
    }

    // Wait for workflow completion (with timeout)
    const timeoutMs = parseTimeout(agentRequest.config?.timeout || '30s');
    const result = await Promise.race([
      handle.result(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Workflow timeout')), timeoutMs)
      ),
    ]);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Agent API error:', error);

    if (error instanceof Error && error.message === 'Workflow timeout') {
      return NextResponse.json(
        {
          success: false,
          error: 'Request timeout',
          message: 'The request took too long to process. Please try again.',
        },
        { status: 504 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const workflowId = searchParams.get('workflowId');
    const action = searchParams.get('action');

    if (!workflowId) {
      return NextResponse.json(
        { error: 'workflowId is required' },
        { status: 400 }
      );
    }

    const client = await getTemporalClient();
    const handle = client.workflow.getHandle(workflowId);

    switch (action) {
      case 'status':
        const state = await handle.query('getState');
        return NextResponse.json({ workflowId, state });

      case 'progress':
        const progress = await handle.query('getProgress');
        return NextResponse.json({ workflowId, progress });

      case 'cancel':
        await handle.signal('cancel');
        return NextResponse.json({ workflowId, cancelled: true });

      default:
        const description = await handle.describe();
        return NextResponse.json({ workflowId, description });
    }

  } catch (error) {
    console.error('Agent status API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get workflow status',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Helper functions

async function checkRateLimit(userId: string): Promise<{ allowed: boolean; retryAfter?: number }> {
  // Implement rate limiting logic
  // For now, return allowed
  return { allowed: true };
}

function parseTimeout(timeout: string): number {
  const match = timeout.match(/^(\d+)(s|m|h)?$/);
  if (!match) return 30000; // Default 30 seconds

  const value = parseInt(match[1]);
  const unit = match[2] || 's';

  switch (unit) {
    case 'h': return value * 60 * 60 * 1000;
    case 'm': return value * 60 * 1000;
    case 's':
    default: return value * 1000;
  }
}

function createStreamingResponse(handle: any, workflowId: string): ReadableStream {
  return new ReadableStream({
    async start(controller) {
      try {
        // Send initial event
        controller.enqueue(
          `data: ${JSON.stringify({
            type: 'start',
            workflowId,
            timestamp: new Date().toISOString(),
          })}\n\n`
        );

        // Poll for progress updates
        const pollInterval = setInterval(async () => {
          try {
            const progress = await handle.query('getProgress');
            const state = await handle.query('getState');

            controller.enqueue(
              `data: ${JSON.stringify({
                type: 'progress',
                progress,
                state: state.currentStep,
                timestamp: new Date().toISOString(),
              })}\n\n`
            );

            // Check if workflow is complete
            if (state.status === 'completed' || state.status === 'failed') {
              clearInterval(pollInterval);

              // Get final result
              const result = await handle.result();

              controller.enqueue(
                `data: ${JSON.stringify({
                  type: 'complete',
                  result,
                  timestamp: new Date().toISOString(),
                })}\n\n`
              );

              controller.close();
            }
          } catch (error) {
            console.error('Streaming error:', error);
            clearInterval(pollInterval);

            controller.enqueue(
              `data: ${JSON.stringify({
                type: 'error',
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
              })}\n\n`
            );

            controller.close();
          }
        }, 1000); // Poll every second

      } catch (error) {
        controller.error(error);
      }
    },
  });
}
