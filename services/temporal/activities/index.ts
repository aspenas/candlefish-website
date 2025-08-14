/**
 * Temporal Activities
 * Business logic implementations for the agent platform
 */

import { Anthropic } from '@anthropic-ai/sdk';
import { OpenAI } from 'openai';
import { SecretsManager } from '../../secrets/secrets-manager';
import { ConversationMemory } from '../../memory/conversation-store';
import { ToolRegistry } from '../../tool-registry/registry';
import { ExcelTransformationTool } from '../../excel-transformer';

const secretsManager = new SecretsManager();
const conversationMemory = new ConversationMemory();
const toolRegistry = new ToolRegistry();

// Initialize LLM clients
let anthropic: Anthropic;
let openai: OpenAI;

async function initializeLLMClients() {
  if (!anthropic) {
    const anthropicKey = await secretsManager.getSecret('anthropic/api-key');
    anthropic = new Anthropic({ apiKey: anthropicKey });
  }
  if (!openai) {
    const openaiKey = await secretsManager.getSecret('openai/api-key');
    openai = new OpenAI({ apiKey: openaiKey });
  }
}

/**
 * Parse user intent from natural language
 */
export async function parseUserIntent(params: {
  prompt: string;
  context?: Record<string, any>;
  model?: string;
}): Promise<any> {
  await initializeLLMClients();

  const systemPrompt = `You are an intent parser for the Candlefish Agent Platform.
Analyze the user's prompt and extract:
1. The primary intent (e.g., excel_transformation, data_query, deployment, etc.)
2. Any entities or parameters mentioned
3. The urgency level (low, medium, high)
4. Whether this requires multiple steps

Return your analysis as JSON.`;

  const response = await anthropic.messages.create({
    model: params.model || 'claude-3-opus-20240229',
    max_tokens: 1000,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: params.prompt },
    ],
  });

  const content = response.content[0];
  if (content.type === 'text') {
    try {
      const parsed = JSON.parse(content.text);
      return {
        ...parsed,
        cost: response.usage ?
          (response.usage.input_tokens * 0.015 + response.usage.output_tokens * 0.075) / 1000 : 0,
      };
    } catch (error) {
      return {
        type: 'unknown',
        parameters: {},
        rawResponse: content.text,
        cost: 0.01,
      };
    }
  }

  return { type: 'unknown', parameters: {} };
}

/**
 * Select the appropriate tool based on intent
 */
export async function selectTool(params: {
  intent: any;
  availableTools: string[];
  context?: Record<string, any>;
}): Promise<any> {
  // Simple tool selection logic - can be enhanced with ML
  const toolMap: Record<string, string> = {
    'excel_transformation': 'excel-transformer',
    'salesforce_query': 'salesforce-connector',
    'accounting_report': 'quickbooks-connector',
    'code_deployment': 'deployment-tool',
    'run_tests': 'testing-tool',
    'github_pr': 'github-api',
  };

  const selectedToolName = toolMap[params.intent.type];

  if (selectedToolName && params.availableTools.includes(selectedToolName)) {
    return {
      name: selectedToolName,
      confidence: 0.9,
      reason: `Intent type ${params.intent.type} maps to ${selectedToolName}`,
    };
  }

  // Fallback: Use LLM to select tool
  await initializeLLMClients();

  const prompt = `Given the user intent: ${JSON.stringify(params.intent)}
And available tools: ${params.availableTools.join(', ')}
Which tool should be used? Return just the tool name or null if none apply.`;

  const response = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307', // Use cheaper model for tool selection
    max_tokens: 100,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content[0];
  if (content.type === 'text') {
    const toolName = content.text.trim();
    if (params.availableTools.includes(toolName)) {
      return {
        name: toolName,
        confidence: 0.7,
        reason: 'LLM-based selection',
      };
    }
  }

  return null;
}

/**
 * Execute a selected tool
 */
export async function executeTool(params: {
  tool: string;
  params: any;
  context?: Record<string, any>;
}): Promise<any> {
  try {
    // Get tool from registry
    const tool = toolRegistry.get(params.tool);

    if (!tool) {
      throw new Error(`Tool ${params.tool} not found in registry`);
    }

    // Execute tool with parameters
    const result = await tool.execute(params.params);

    return {
      success: true,
      toolName: params.tool,
      result,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Error executing tool ${params.tool}:`, error);
    return {
      success: false,
      toolName: params.tool,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Format the final response for the user
 */
export async function formatResponse(params: {
  intent: any;
  toolResult: any;
  context?: Record<string, any>;
  model?: string;
}): Promise<{ response: string; cost: number }> {
  await initializeLLMClients();

  const systemPrompt = `You are a helpful assistant for the Candlefish platform.
Format a clear, concise response based on the tool execution results.
Be professional but friendly. If there were errors, explain them clearly.
Include relevant details but avoid overwhelming the user.`;

  const userPrompt = `Intent: ${JSON.stringify(params.intent)}
Tool Result: ${JSON.stringify(params.toolResult)}
Context: ${JSON.stringify(params.context || {})}

Please format a response for the user.`;

  const response = await anthropic.messages.create({
    model: params.model || 'claude-3-opus-20240229',
    max_tokens: 2000,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
  });

  const content = response.content[0];
  const cost = response.usage ?
    (response.usage.input_tokens * 0.015 + response.usage.output_tokens * 0.075) / 1000 : 0;

  if (content.type === 'text') {
    return {
      response: content.text,
      cost,
    };
  }

  return {
    response: 'I processed your request successfully.',
    cost,
  };
}

/**
 * Save conversation to memory
 */
export async function saveToMemory(params: {
  conversationId: string;
  userId: string;
  message: any;
}): Promise<void> {
  await conversationMemory.saveMessage(params.conversationId, {
    userId: params.userId,
    content: params.message.content,
    role: params.message.role,
    metadata: params.message.metadata || {},
  });
}

/**
 * Get conversation context from memory
 */
export async function getConversationContext(params: {
  conversationId: string;
  limit?: number;
}): Promise<any[]> {
  return conversationMemory.getContext(params.conversationId, params.limit || 10);
}

/**
 * Perform Excel transformation
 */
export async function performExcelTransformation(params: {
  fileData: Buffer;
  targetFramework: string;
  features: string[];
}): Promise<{ response: string; duration: number }> {
  const startTime = Date.now();

  const transformer = new ExcelTransformationTool();
  const result = await transformer.execute({
    file: params.fileData,
    targetFramework: params.targetFramework as any,
    features: params.features,
  });

  const duration = Date.now() - startTime;

  return {
    response: `Successfully transformed your Excel file into a ${params.targetFramework} application in ${(duration / 1000).toFixed(2)} seconds.

Preview URL: ${result.preview}
Download: ${result.app.downloadUrl}

The application includes:
- ${result.app.components.length} components
- ${result.app.formulas.length} formulas translated
- ${result.app.features.join(', ')}

You can now deploy this application or make further customizations.`,
    duration,
  };
}

/**
 * Direct LLM call for general queries
 */
export async function callLLM(params: {
  prompt: string;
  model?: string;
  maxTokens?: number;
}): Promise<{ response: string; cost: number }> {
  await initializeLLMClients();

  const response = await anthropic.messages.create({
    model: params.model || 'claude-3-opus-20240229',
    max_tokens: params.maxTokens || 2000,
    messages: [{ role: 'user', content: params.prompt }],
  });

  const content = response.content[0];
  const cost = response.usage ?
    (response.usage.input_tokens * 0.015 + response.usage.output_tokens * 0.075) / 1000 : 0;

  if (content.type === 'text') {
    return {
      response: content.text,
      cost,
    };
  }

  return {
    response: 'Unable to process request.',
    cost,
  };
}
