import { Context } from '@temporalio/activity';
import { LLMRouter } from '../../llm-router/llm-router';
import { SecretsManager } from '../../secrets/secrets-manager';
import { VectorStore } from '../../vector-store/vector-store';
import { MetricsCollector } from '../../monitoring/metrics';
import type {
  AgentRequest,
  Classification,
  ContextData,
  LLMResponse,
  ActionResult,
  ProcessedResponse
} from '../types';

const llmRouter = new LLMRouter();
const secretsManager = new SecretsManager();
const vectorStore = new VectorStore();
const metrics = new MetricsCollector();

// Parse and validate agent request
export async function parseAgentRequest(request: AgentRequest): Promise<AgentRequest> {
  const startTime = Date.now();

  try {
    // Validate required fields
    if (!request.prompt || typeof request.prompt !== 'string') {
      throw new Error('Invalid request: prompt is required');
    }

    // Sanitize input
    const sanitized = {
      ...request,
      prompt: request.prompt.trim().substring(0, 10000), // Limit prompt length
      metadata: request.metadata || {},
    };

    // Log activity
    Context.current().log.info('Parsed agent request', {
      promptLength: sanitized.prompt.length,
      hasMetadata: !!sanitized.metadata,
    });

    metrics.recordActivity('parse_request', Date.now() - startTime);
    return sanitized;
  } catch (error) {
    metrics.recordError('parse_request', error);
    throw error;
  }
}

// Classify intent and determine routing
export async function classifyIntent(request: AgentRequest): Promise<Classification> {
  const startTime = Date.now();

  try {
    // Use a lightweight model for classification
    const classificationPrompt = `
Classify the following user request and determine the appropriate handling:

Request: "${request.prompt}"

Provide a JSON response with:
1. intent: The primary intent (e.g., "code_generation", "question_answering", "data_analysis", "task_automation")
2. complexity: Low, Medium, or High
3. recommendedModel: "anthropic", "openai", or "together"
4. requiredActions: Array of actions needed (if any)
5. systemPrompt: Appropriate system prompt for this intent
6. temperature: Recommended temperature (0.0-1.0)
7. maxTokens: Recommended max tokens
8. validationRules: Any validation rules for the response

Response:`;

    const response = await llmRouter.route({
      prompt: classificationPrompt,
      model: 'together', // Use cheap model for classification
      temperature: 0.3,
      maxTokens: 500,
    });

    let classification: Classification;
    try {
      classification = JSON.parse(response.content);
    } catch {
      // Fallback classification
      classification = {
        intent: 'general',
        complexity: 'medium',
        recommendedModel: 'anthropic',
        requiredActions: [],
        systemPrompt: 'You are a helpful AI assistant.',
        temperature: 0.7,
        maxTokens: 2000,
        validationRules: [],
      };
    }

    Context.current().log.info('Classified intent', classification);
    metrics.recordActivity('classify_intent', Date.now() - startTime);

    return classification;
  } catch (error) {
    metrics.recordError('classify_intent', error);
    throw error;
  }
}

// Retrieve relevant context from vector store and other sources
export async function retrieveContext(params: {
  userId: string;
  sessionId: string;
  intent: string;
  request: AgentRequest;
}): Promise<ContextData> {
  const startTime = Date.now();

  try {
    const { userId, sessionId, intent, request } = params;

    // Retrieve user context
    const userContext = await getUserContext(userId);

    // Retrieve session history
    const sessionHistory = await getSessionHistory(sessionId);

    // Perform vector search for relevant documents
    const relevantDocs = await vectorStore.search({
      query: request.prompt,
      limit: 5,
      filter: { userId, intent },
    });

    // Retrieve project-specific context if needed
    const projectContext = request.metadata?.projectId
      ? await getProjectContext(request.metadata.projectId)
      : null;

    const context: ContextData = {
      user: userContext,
      session: sessionHistory,
      documents: relevantDocs,
      project: projectContext,
      metadata: {
        retrievalTime: Date.now() - startTime,
        documentCount: relevantDocs.length,
      },
    };

    Context.current().log.info('Retrieved context', {
      documentsFound: relevantDocs.length,
      hasUserContext: !!userContext,
      hasProjectContext: !!projectContext,
    });

    metrics.recordActivity('retrieve_context', Date.now() - startTime);
    return context;
  } catch (error) {
    metrics.recordError('retrieve_context', error);
    throw error;
  }
}

// Generate response using selected LLM
export async function generateLLMResponse(params: {
  model: string;
  prompt: string;
  context: ContextData;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
}): Promise<LLMResponse> {
  const startTime = Date.now();

  try {
    const { model, prompt, context, systemPrompt, temperature, maxTokens } = params;

    // Build enhanced prompt with context
    const enhancedPrompt = buildEnhancedPrompt(prompt, context);

    // Route to appropriate LLM
    const response = await llmRouter.route({
      model,
      systemPrompt,
      prompt: enhancedPrompt,
      temperature,
      maxTokens,
      stream: false,
    });

    const llmResponse: LLMResponse = {
      content: response.content,
      model: response.model,
      tokensUsed: response.usage?.totalTokens || 0,
      latency: Date.now() - startTime,
      metadata: response.metadata,
    };

    Context.current().log.info('Generated LLM response', {
      model,
      tokensUsed: llmResponse.tokensUsed,
      latency: llmResponse.latency,
    });

    metrics.recordActivity('generate_response', llmResponse.latency);
    metrics.recordTokenUsage(model, llmResponse.tokensUsed);

    return llmResponse;
  } catch (error) {
    metrics.recordError('generate_response', error);
    throw error;
  }
}

// Execute required actions
export async function executeAction(params: {
  type: string;
  parameters: any;
  context: { userId: string; sessionId: string };
}): Promise<ActionResult> {
  const startTime = Date.now();

  try {
    const { type, parameters, context } = params;

    let result: any;

    switch (type) {
      case 'database_query':
        result = await executeDatabaseQuery(parameters);
        break;

      case 'api_call':
        result = await executeAPICall(parameters);
        break;

      case 'file_operation':
        result = await executeFileOperation(parameters);
        break;

      case 'notification':
        result = await sendNotification(parameters, context.userId);
        break;

      case 'workflow_trigger':
        result = await triggerWorkflow(parameters);
        break;

      default:
        throw new Error(`Unknown action type: ${type}`);
    }

    const actionResult: ActionResult = {
      type,
      success: true,
      result,
      duration: Date.now() - startTime,
    };

    Context.current().log.info('Executed action', actionResult);
    metrics.recordActivity(`action_${type}`, actionResult.duration);

    return actionResult;
  } catch (error) {
    metrics.recordError('execute_action', error);
    throw error;
  }
}

// Post-process and validate response
export async function postProcessResponse(params: {
  response: string;
  intent: string;
  validationRules: any[];
}): Promise<ProcessedResponse> {
  const startTime = Date.now();

  try {
    const { response, intent, validationRules } = params;

    let processed = response;
    const issues: string[] = [];

    // Apply validation rules
    for (const rule of validationRules) {
      const validation = validateResponse(processed, rule);
      if (!validation.valid) {
        issues.push(validation.message);
      }
    }

    // Apply intent-specific processing
    processed = await applyIntentProcessing(processed, intent);

    // Sanitize output
    processed = sanitizeOutput(processed);

    const result: ProcessedResponse = {
      content: processed,
      valid: issues.length === 0,
      issues,
      processingTime: Date.now() - startTime,
    };

    Context.current().log.info('Post-processed response', {
      valid: result.valid,
      issueCount: issues.length,
    });

    metrics.recordActivity('post_process', result.processingTime);
    return result;
  } catch (error) {
    metrics.recordError('post_process', error);
    throw error;
  }
}

// Store results for audit and analytics
export async function storeResults(params: {
  userId: string;
  sessionId: string;
  request: AgentRequest;
  response: ProcessedResponse;
  metadata: any;
}): Promise<void> {
  const startTime = Date.now();

  try {
    const { userId, sessionId, request, response, metadata } = params;

    // Store in database
    await storeToDatabase({
      userId,
      sessionId,
      request: request.prompt,
      response: response.content,
      metadata,
      timestamp: new Date(),
    });

    // Update vector store if needed
    if (response.valid && metadata.intent !== 'ephemeral') {
      await vectorStore.upsert({
        id: `${sessionId}_${Date.now()}`,
        content: response.content,
        metadata: {
          userId,
          sessionId,
          intent: metadata.intent,
          model: metadata.model,
        },
      });
    }

    // Update user metrics
    await updateUserMetrics(userId, {
      tokensUsed: metadata.tokensUsed,
      requestCount: 1,
    });

    Context.current().log.info('Stored results', {
      userId,
      sessionId,
      storedToVector: response.valid,
    });

    metrics.recordActivity('store_results', Date.now() - startTime);
  } catch (error) {
    metrics.recordError('store_results', error);
    // Don't throw - storing results should not fail the workflow
    Context.current().log.error('Failed to store results', { error });
  }
}

// Log errors for monitoring
export async function logError(params: {
  userId: string;
  sessionId: string;
  error: string;
  state: any;
}): Promise<void> {
  try {
    const { userId, sessionId, error, state } = params;

    await metrics.recordWorkflowError({
      userId,
      sessionId,
      error,
      state,
      timestamp: new Date(),
    });

    Context.current().log.error('Workflow error logged', {
      userId,
      sessionId,
      error,
    });
  } catch (err) {
    Context.current().log.error('Failed to log error', { err });
  }
}

// Helper functions
function buildEnhancedPrompt(prompt: string, context: ContextData): string {
  let enhanced = prompt;

  if (context.documents && context.documents.length > 0) {
    enhanced = `Context:\n${context.documents.map(d => d.content).join('\n\n')}\n\nUser Query: ${prompt}`;
  }

  if (context.session && context.session.length > 0) {
    const recentHistory = context.session.slice(-3);
    enhanced = `Previous conversation:\n${recentHistory.join('\n')}\n\nCurrent: ${enhanced}`;
  }

  return enhanced;
}

function validateResponse(response: string, rule: any): { valid: boolean; message: string } {
  // Implement validation logic based on rule type
  switch (rule.type) {
    case 'length':
      return {
        valid: response.length >= rule.min && response.length <= rule.max,
        message: `Response length must be between ${rule.min} and ${rule.max}`,
      };

    case 'format':
      return {
        valid: new RegExp(rule.pattern).test(response),
        message: `Response must match format: ${rule.description}`,
      };

    case 'content':
      return {
        valid: !rule.forbidden.some((word: string) => response.includes(word)),
        message: 'Response contains forbidden content',
      };

    default:
      return { valid: true, message: '' };
  }
}

async function applyIntentProcessing(response: string, intent: string): Promise<string> {
  switch (intent) {
    case 'code_generation':
      // Format code blocks properly
      return response.replace(/```(\w+)?\n/g, '```$1\n');

    case 'data_analysis':
      // Ensure data is properly formatted
      return response;

    default:
      return response;
  }
}

function sanitizeOutput(response: string): string {
  // Remove any sensitive patterns
  return response
    .replace(/api[_-]?key[s]?\s*[:=]\s*["']?[\w-]+["']?/gi, 'API_KEY=***')
    .replace(/password[s]?\s*[:=]\s*["']?[\w-]+["']?/gi, 'PASSWORD=***')
    .replace(/secret[s]?\s*[:=]\s*["']?[\w-]+["']?/gi, 'SECRET=***');
}

// Stub implementations for helper functions
async function getUserContext(userId: string): Promise<any> {
  // Implement user context retrieval
  return {};
}

async function getSessionHistory(sessionId: string): Promise<string[]> {
  // Implement session history retrieval
  return [];
}

async function getProjectContext(projectId: string): Promise<any> {
  // Implement project context retrieval
  return {};
}

async function executeDatabaseQuery(params: any): Promise<any> {
  // Implement database query execution
  return {};
}

async function executeAPICall(params: any): Promise<any> {
  // Implement API call execution
  return {};
}

async function executeFileOperation(params: any): Promise<any> {
  // Implement file operation execution
  return {};
}

async function sendNotification(params: any, userId: string): Promise<any> {
  // Implement notification sending
  return { sent: true };
}

async function triggerWorkflow(params: any): Promise<any> {
  // Implement workflow triggering
  return { triggered: true };
}

async function storeToDatabase(data: any): Promise<void> {
  // Implement database storage
}

async function updateUserMetrics(userId: string, metrics: any): Promise<void> {
  // Implement user metrics update
}

// Conversation-specific activities
export async function generateConversationResponse(params: {
  conversationId: string;
  userId: string;
  message: string;
  context: any[];
  memory: any;
  config: any;
}): Promise<{ content: string; updatedMemory: any }> {
  const { message, context, memory, config } = params;

  // Build conversation prompt
  const prompt = `${context.map(c => `${c.role}: ${c.content}`).join('\n')}\nuser: ${message}\nassistant:`;

  // Generate response
  const response = await llmRouter.route({
    model: config.model || 'anthropic',
    prompt,
    temperature: config.temperature || 0.7,
    maxTokens: config.maxTokens || 1000,
  });

  return {
    content: response.content,
    updatedMemory: { ...memory, lastInteraction: Date.now() },
  };
}

// Data retrieval activity
export async function retrieveData(parameters: any): Promise<any> {
  // Implement data retrieval logic
  return { data: 'retrieved' };
}

// Computation activity
export async function performComputation(params: any): Promise<any> {
  // Implement computation logic
  return { result: 'computed' };
}

// External API activity
export async function callExternalAPI(parameters: any): Promise<any> {
  // Implement external API call
  return { response: 'api_response' };
}

// LLM chain activity
export async function executeLLMChain(params: any): Promise<any> {
  // Implement LLM chain execution
  return { result: 'chain_completed' };
}

// Generic step activity
export async function executeGenericStep(step: any): Promise<any> {
  // Implement generic step execution
  return { completed: true };
}
