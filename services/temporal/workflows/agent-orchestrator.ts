import { proxyActivities, sleep, defineSignal, setHandler, defineQuery } from '@temporalio/workflow';
import type { AgentRequest, AgentResponse, AgentState } from '../types';

// Import activities
const activities = proxyActivities({
  startNodeId: 'agent-activities',
  taskQueue: 'candlefish-agent-queue',
  startToCloseTimeout: '5m',
  retry: {
    initialInterval: '1s',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

// Define signals for workflow control
export const cancelSignal = defineSignal('cancel');
export const updateConfigSignal = defineSignal<{ config: any }>('updateConfig');

// Define queries for workflow state
export const getStateQuery = defineQuery<AgentState>('getState');
export const getProgressQuery = defineQuery<number>('getProgress');

export interface AgentWorkflowParams {
  request: AgentRequest;
  userId: string;
  sessionId: string;
  config?: {
    maxRetries?: number;
    timeout?: string;
    modelPreference?: 'anthropic' | 'openai' | 'together';
  };
}

export async function AgentOrchestrationWorkflow(params: AgentWorkflowParams): Promise<AgentResponse> {
  const { request, userId, sessionId, config = {} } = params;

  // Initialize workflow state
  let state: AgentState = {
    status: 'initializing',
    progress: 0,
    currentStep: 'parsing',
    startTime: Date.now(),
    steps: [],
  };

  let cancelled = false;

  // Handle cancellation signal
  setHandler(cancelSignal, () => {
    cancelled = true;
    state.status = 'cancelled';
  });

  // Handle configuration updates
  setHandler(updateConfigSignal, ({ config: newConfig }) => {
    Object.assign(config, newConfig);
  });

  // Handle state queries
  setHandler(getStateQuery, () => state);
  setHandler(getProgressQuery, () => state.progress);

  try {
    // Step 1: Parse and validate request
    state.currentStep = 'parsing';
    state.progress = 10;

    const parsedRequest = await activities.parseAgentRequest(request);
    state.steps.push({
      name: 'parse_request',
      status: 'completed',
      duration: Date.now() - state.startTime,
    });

    if (cancelled) throw new Error('Workflow cancelled by user');

    // Step 2: Classify intent and select model
    state.currentStep = 'classification';
    state.progress = 20;

    const classification = await activities.classifyIntent(parsedRequest);
    const selectedModel = config.modelPreference || classification.recommendedModel;

    state.steps.push({
      name: 'classify_intent',
      status: 'completed',
      metadata: { intent: classification.intent, model: selectedModel },
    });

    if (cancelled) throw new Error('Workflow cancelled by user');

    // Step 3: Retrieve context and relevant data
    state.currentStep = 'context_retrieval';
    state.progress = 30;

    const context = await activities.retrieveContext({
      userId,
      sessionId,
      intent: classification.intent,
      request: parsedRequest,
    });

    state.steps.push({
      name: 'retrieve_context',
      status: 'completed',
      metadata: { documentsFound: context.documents?.length || 0 },
    });

    if (cancelled) throw new Error('Workflow cancelled by user');

    // Step 4: Generate response using selected LLM
    state.currentStep = 'generation';
    state.progress = 50;

    const llmResponse = await activities.generateLLMResponse({
      model: selectedModel,
      prompt: parsedRequest.prompt,
      context: context,
      systemPrompt: classification.systemPrompt,
      temperature: classification.temperature || 0.7,
      maxTokens: classification.maxTokens || 2000,
    });

    state.steps.push({
      name: 'generate_response',
      status: 'completed',
      metadata: {
        model: selectedModel,
        tokensUsed: llmResponse.tokensUsed,
        latency: llmResponse.latency,
      },
    });

    if (cancelled) throw new Error('Workflow cancelled by user');

    // Step 5: Execute any required actions
    if (classification.requiredActions?.length > 0) {
      state.currentStep = 'executing_actions';
      state.progress = 70;

      const actionResults = await Promise.all(
        classification.requiredActions.map(action =>
          activities.executeAction({
            type: action.type,
            parameters: action.parameters,
            context: { userId, sessionId },
          })
        )
      );

      state.steps.push({
        name: 'execute_actions',
        status: 'completed',
        metadata: {
          actionsExecuted: actionResults.length,
          results: actionResults,
        },
      });
    }

    if (cancelled) throw new Error('Workflow cancelled by user');

    // Step 6: Post-process and validate response
    state.currentStep = 'post_processing';
    state.progress = 85;

    const processedResponse = await activities.postProcessResponse({
      response: llmResponse.content,
      intent: classification.intent,
      validationRules: classification.validationRules,
    });

    state.steps.push({
      name: 'post_process',
      status: 'completed',
    });

    // Step 7: Store results and update metrics
    state.currentStep = 'storing_results';
    state.progress = 95;

    await activities.storeResults({
      userId,
      sessionId,
      request: parsedRequest,
      response: processedResponse,
      metadata: {
        model: selectedModel,
        intent: classification.intent,
        tokensUsed: llmResponse.tokensUsed,
        latency: Date.now() - state.startTime,
        steps: state.steps,
      },
    });

    // Complete workflow
    state.status = 'completed';
    state.progress = 100;
    state.currentStep = 'done';

    return {
      success: true,
      content: processedResponse.content,
      metadata: {
        workflowId: params.sessionId,
        model: selectedModel,
        intent: classification.intent,
        processingTime: Date.now() - state.startTime,
        tokensUsed: llmResponse.tokensUsed,
      },
    };

  } catch (error) {
    state.status = 'failed';
    state.error = error instanceof Error ? error.message : 'Unknown error';

    // Log error for monitoring
    await activities.logError({
      userId,
      sessionId,
      error: state.error,
      state,
    });

    throw error;
  }
}

// Child workflow for handling complex multi-step operations
export async function MultiStepAgentWorkflow(params: {
  steps: Array<{
    type: string;
    parameters: any;
    dependencies?: string[];
  }>;
  userId: string;
  sessionId: string;
}): Promise<any[]> {
  const results: any[] = [];
  const { steps, userId, sessionId } = params;

  for (const [index, step] of steps.entries()) {
    // Check dependencies
    if (step.dependencies?.length > 0) {
      // Wait for dependent steps to complete
      await sleep('1s');
    }

    // Execute step based on type
    switch (step.type) {
      case 'data_retrieval':
        results[index] = await activities.retrieveData(step.parameters);
        break;

      case 'computation':
        results[index] = await activities.performComputation({
          ...step.parameters,
          previousResults: results,
        });
        break;

      case 'external_api':
        results[index] = await activities.callExternalAPI(step.parameters);
        break;

      case 'llm_chain':
        results[index] = await activities.executeLLMChain({
          ...step.parameters,
          context: results,
        });
        break;

      default:
        results[index] = await activities.executeGenericStep(step);
    }
  }

  return results;
}

// Workflow for handling agent conversations
export async function ConversationWorkflow(params: {
  conversationId: string;
  userId: string;
  messages: Array<{ role: string; content: string }>;
  config?: any;
}): Promise<any> {
  const { conversationId, userId, messages, config = {} } = params;

  // Initialize conversation state
  const state = {
    turns: 0,
    context: [],
    memory: {},
  };

  // Process conversation
  for (const message of messages) {
    state.turns++;

    // Generate response for user message
    if (message.role === 'user') {
      const response = await activities.generateConversationResponse({
        conversationId,
        userId,
        message: message.content,
        context: state.context,
        memory: state.memory,
        config,
      });

      // Update state
      state.context.push({ role: 'user', content: message.content });
      state.context.push({ role: 'assistant', content: response.content });
      state.memory = response.updatedMemory || state.memory;
    }
  }

  return {
    conversationId,
    turns: state.turns,
    context: state.context,
    memory: state.memory,
  };
}
