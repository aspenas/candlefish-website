/**
 * Candlefish Agent Workflow
 * Main workflow for processing agent requests
 */

import {
  proxyActivities,
  sleep,
  defineSignal,
  setHandler,
  condition,
  uuid4,
  workflowInfo
} from '@temporalio/workflow';
import type * as activities from '../activities';

// Import activity types with proper timeout and retry configuration
const {
  parseUserIntent,
  selectTool,
  executeTool,
  formatResponse,
  saveToMemory,
  getConversationContext,
  performExcelTransformation,
  callLLM,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
  retry: {
    initialInterval: '1 second',
    maximumInterval: '30 seconds',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

// Define workflow input/output types
export interface AgentWorkflowInput {
  prompt: string;
  userId: string;
  conversationId?: string;
  context?: Record<string, any>;
  options?: {
    timeout?: number;
    maxCost?: number;
    preferredModel?: string;
  };
}

export interface AgentWorkflowOutput {
  response: string;
  metadata: {
    workflowId: string;
    duration: number;
    toolsUsed: string[];
    llmCost: number;
    success: boolean;
  };
}

// Define signals for workflow control
export const cancelSignal = defineSignal('cancel');
export const updateContextSignal = defineSignal<[Record<string, any>]>('updateContext');

/**
 * Main Agent Workflow
 * Orchestrates the entire agent processing pipeline
 */
export async function AgentWorkflow(input: AgentWorkflowInput): Promise<AgentWorkflowOutput> {
  const startTime = Date.now();
  const { workflowId, runId } = workflowInfo();

  // Initialize workflow state
  let isCancelled = false;
  let context = input.context || {};
  const toolsUsed: string[] = [];
  let totalCost = 0;

  // Set up signal handlers
  setHandler(cancelSignal, () => {
    isCancelled = true;
  });

  setHandler(updateContextSignal, (newContext) => {
    context = { ...context, ...newContext };
  });

  try {
    // Step 1: Get conversation context if continuing a conversation
    if (input.conversationId) {
      const conversationContext = await getConversationContext({
        conversationId: input.conversationId,
        limit: 10,
      });
      context = { ...context, conversationHistory: conversationContext };
    }

    // Check for cancellation
    if (isCancelled) {
      throw new Error('Workflow cancelled by user');
    }

    // Step 2: Parse user intent using LLM
    const intent = await parseUserIntent({
      prompt: input.prompt,
      context,
      model: input.options?.preferredModel,
    });
    totalCost += intent.cost || 0;

    // Step 3: Check if this is an Excel transformation request
    if (intent.type === 'excel_transformation') {
      toolsUsed.push('excel-transformer');

      const transformationResult = await performExcelTransformation({
        fileData: intent.fileData,
        targetFramework: intent.targetFramework || 'react',
        features: intent.features || [],
      });

      // Save to memory
      await saveToMemory({
        conversationId: input.conversationId || uuid4(),
        userId: input.userId,
        message: {
          role: 'assistant',
          content: transformationResult.response,
          metadata: {
            toolUsed: 'excel-transformer',
            duration: transformationResult.duration,
          },
        },
      });

      return {
        response: transformationResult.response,
        metadata: {
          workflowId,
          duration: Date.now() - startTime,
          toolsUsed,
          llmCost: totalCost,
          success: true,
        },
      };
    }

    // Step 4: Select appropriate tool based on intent
    const selectedTool = await selectTool({
      intent,
      availableTools: [
        'salesforce-connector',
        'quickbooks-connector',
        'github-api',
        'deployment-tool',
        'testing-tool',
      ],
      context,
    });

    if (selectedTool) {
      toolsUsed.push(selectedTool.name);
    }

    // Check for cancellation
    if (isCancelled) {
      throw new Error('Workflow cancelled by user');
    }

    // Step 5: Execute selected tool(s)
    let toolResult: any = null;
    if (selectedTool) {
      // Execute tool with timeout
      const toolTimeout = Math.min(
        input.options?.timeout || 300000, // Default 5 minutes
        300000 // Max 5 minutes
      );

      toolResult = await Promise.race([
        executeTool({
          tool: selectedTool.name,
          params: intent.parameters,
          context,
        }),
        sleep(toolTimeout).then(() => {
          throw new Error(`Tool execution timeout after ${toolTimeout}ms`);
        }),
      ]);
    }

    // Step 6: Format final response using LLM
    const formattedResponse = await formatResponse({
      intent,
      toolResult,
      context,
      model: input.options?.preferredModel,
    });
    totalCost += formattedResponse.cost || 0;

    // Step 7: Save to conversation memory
    await saveToMemory({
      conversationId: input.conversationId || uuid4(),
      userId: input.userId,
      message: {
        role: 'user',
        content: input.prompt,
      },
    });

    await saveToMemory({
      conversationId: input.conversationId || uuid4(),
      userId: input.userId,
      message: {
        role: 'assistant',
        content: formattedResponse.response,
        metadata: {
          toolsUsed,
          cost: totalCost,
        },
      },
    });

    // Return successful response
    return {
      response: formattedResponse.response,
      metadata: {
        workflowId,
        duration: Date.now() - startTime,
        toolsUsed,
        llmCost: totalCost,
        success: true,
      },
    };

  } catch (error) {
    // Handle errors gracefully
    console.error('Workflow error:', error);

    // Save error to memory
    await saveToMemory({
      conversationId: input.conversationId || uuid4(),
      userId: input.userId,
      message: {
        role: 'system',
        content: `Error: ${error.message}`,
        metadata: {
          error: true,
          workflowId,
        },
      },
    });

    return {
      response: `I encountered an error processing your request: ${error.message}. Please try again or contact support if the issue persists.`,
      metadata: {
        workflowId,
        duration: Date.now() - startTime,
        toolsUsed,
        llmCost: totalCost,
        success: false,
      },
    };
  }
}

/**
 * Child workflow for parallel tool execution
 */
export async function ParallelToolExecutionWorkflow(tools: string[]): Promise<any[]> {
  const promises = tools.map(tool =>
    executeTool({
      tool,
      params: {},
      context: {},
    })
  );

  return Promise.all(promises);
}
