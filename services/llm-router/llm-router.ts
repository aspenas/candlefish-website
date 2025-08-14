import { SecretsManager } from '../secrets/secrets-manager';
import { MetricsCollector } from '../monitoring/metrics';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

export interface LLMRouterConfig {
  defaultModel?: 'anthropic' | 'openai' | 'together';
  maxRetries?: number;
  timeout?: number;
  costOptimization?: boolean;
}

export interface RouteRequest {
  prompt: string;
  model?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  metadata?: Record<string, any>;
}

export interface RouteResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata?: Record<string, any>;
  cost?: number;
}

export class LLMRouter {
  private anthropic?: Anthropic;
  private openai?: OpenAI;
  private secretsManager: SecretsManager;
  private metrics: MetricsCollector;
  private config: LLMRouterConfig;
  private modelCosts = {
    'claude-opus-4.1': { input: 0.015, output: 0.075 }, // per 1K tokens
    'claude-3-5-sonnet': { input: 0.003, output: 0.015 },
    'gpt-4o': { input: 0.005, output: 0.015 },
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'llama-3-70b': { input: 0.0009, output: 0.0009 },
  };

  constructor(config: LLMRouterConfig = {}) {
    this.config = {
      defaultModel: 'anthropic',
      maxRetries: 3,
      timeout: 30000,
      costOptimization: true,
      ...config,
    };
    this.secretsManager = new SecretsManager();
    this.metrics = new MetricsCollector();
  }

  private async initialize() {
    if (!this.anthropic) {
      const anthropicKey = await this.secretsManager.getSecret('anthropic/api-key');
      if (anthropicKey) {
        this.anthropic = new Anthropic({ apiKey: anthropicKey });
      }
    }

    if (!this.openai) {
      const openaiKey = await this.secretsManager.getSecret('openai/api-key');
      if (openaiKey) {
        this.openai = new OpenAI({ apiKey: openaiKey });
      }
    }
  }

  async route(request: RouteRequest): Promise<RouteResponse> {
    await this.initialize();

    const startTime = Date.now();
    const model = this.selectModel(request);

    try {
      let response: RouteResponse;

      switch (this.getProvider(model)) {
        case 'anthropic':
          response = await this.routeToAnthropic(request, model);
          break;

        case 'openai':
          response = await this.routeToOpenAI(request, model);
          break;

        case 'together':
          response = await this.routeToTogether(request, model);
          break;

        default:
          throw new Error(`Unknown model provider for: ${model}`);
      }

      // Calculate cost
      if (response.usage && this.config.costOptimization) {
        response.cost = this.calculateCost(model, response.usage);
      }

      // Record metrics
      this.metrics.recordLLMCall({
        model,
        latency: Date.now() - startTime,
        tokens: response.usage?.totalTokens || 0,
        cost: response.cost || 0,
      });

      return response;

    } catch (error) {
      // Try fallback model
      if (request.model !== 'together') {
        console.warn(`Failed with ${model}, trying fallback...`, error);
        return this.route({ ...request, model: 'together' });
      }
      throw error;
    }
  }

  private selectModel(request: RouteRequest): string {
    if (request.model) {
      return this.normalizeModelName(request.model);
    }

    // Cost optimization logic
    if (this.config.costOptimization) {
      const promptLength = request.prompt.length;

      // Use cheaper models for shorter/simpler requests
      if (promptLength < 500 && !request.systemPrompt?.includes('complex')) {
        return 'llama-3-70b';
      }

      // Use mid-tier for moderate complexity
      if (promptLength < 2000) {
        return 'claude-3-5-sonnet';
      }
    }

    // Default to most capable model
    return 'claude-opus-4.1';
  }

  private normalizeModelName(model: string): string {
    const modelMap: Record<string, string> = {
      'anthropic': 'claude-opus-4.1',
      'openai': 'gpt-4o',
      'together': 'llama-3-70b',
      'claude': 'claude-opus-4.1',
      'gpt4': 'gpt-4o',
      'llama': 'llama-3-70b',
    };

    return modelMap[model.toLowerCase()] || model;
  }

  private getProvider(model: string): string {
    if (model.includes('claude')) return 'anthropic';
    if (model.includes('gpt')) return 'openai';
    if (model.includes('llama')) return 'together';
    return 'anthropic';
  }

  private async routeToAnthropic(request: RouteRequest, model: string): Promise<RouteResponse> {
    if (!this.anthropic) {
      throw new Error('Anthropic client not initialized');
    }

    const response = await this.anthropic.messages.create({
      model: model === 'claude-opus-4.1' ? 'claude-opus-4-1-20250805' : model,
      max_tokens: request.maxTokens || 2000,
      temperature: request.temperature || 0.7,
      system: request.systemPrompt,
      messages: [{ role: 'user', content: request.prompt }],
    });

    return {
      content: response.content[0].type === 'text' ? response.content[0].text : '',
      model,
      usage: {
        promptTokens: response.usage?.input_tokens || 0,
        completionTokens: response.usage?.output_tokens || 0,
        totalTokens: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
      },
      metadata: request.metadata,
    };
  }

  private async routeToOpenAI(request: RouteRequest, model: string): Promise<RouteResponse> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const messages: any[] = [];
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    messages.push({ role: 'user', content: request.prompt });

    const response = await this.openai.chat.completions.create({
      model: model === 'gpt-4o' ? 'gpt-4o' : model,
      messages,
      temperature: request.temperature || 0.7,
      max_tokens: request.maxTokens || 2000,
      stream: false,
    });

    return {
      content: response.choices[0].message.content || '',
      model,
      usage: response.usage ? {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      } : undefined,
      metadata: request.metadata,
    };
  }

  private async routeToTogether(request: RouteRequest, model: string): Promise<RouteResponse> {
    // Together AI implementation
    const apiKey = await this.secretsManager.getSecret('together/api-key');
    if (!apiKey) {
      throw new Error('Together AI API key not found');
    }

    const response = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
        messages: [
          ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
          { role: 'user', content: request.prompt },
        ],
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`Together AI API error: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      content: data.choices[0].message.content,
      model: 'llama-3-70b',
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
      metadata: request.metadata,
    };
  }

  private calculateCost(model: string, usage: { promptTokens: number; completionTokens: number }): number {
    const costs = this.modelCosts[model as keyof typeof this.modelCosts];
    if (!costs) return 0;

    const inputCost = (usage.promptTokens / 1000) * costs.input;
    const outputCost = (usage.completionTokens / 1000) * costs.output;

    return Number((inputCost + outputCost).toFixed(6));
  }

  async getModelStatus(): Promise<Record<string, boolean>> {
    await this.initialize();

    return {
      anthropic: !!this.anthropic,
      openai: !!this.openai,
      together: !!(await this.secretsManager.getSecret('together/api-key')),
    };
  }

  async estimateCost(prompt: string, model?: string): Promise<number> {
    const selectedModel = model ? this.normalizeModelName(model) : this.selectModel({ prompt });
    const costs = this.modelCosts[selectedModel as keyof typeof this.modelCosts];

    if (!costs) return 0;

    // Rough token estimation (1 token ≈ 4 characters)
    const promptTokens = Math.ceil(prompt.length / 4);
    const estimatedCompletionTokens = 500; // Average response

    return this.calculateCost(selectedModel, {
      promptTokens,
      completionTokens: estimatedCompletionTokens,
    });
  }
}
