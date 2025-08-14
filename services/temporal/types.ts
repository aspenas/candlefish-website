// Temporal Workflow Types for Candlefish Agent Platform

export interface AgentRequest {
  prompt: string;
  metadata?: {
    projectId?: string;
    contextIds?: string[];
    preferences?: Record<string, any>;
  };
  options?: {
    stream?: boolean;
    format?: 'text' | 'json' | 'markdown';
    language?: string;
  };
}

export interface AgentResponse {
  success: boolean;
  content: string;
  metadata?: {
    workflowId: string;
    model: string;
    intent: string;
    processingTime: number;
    tokensUsed: number;
  };
  error?: string;
}

export interface AgentState {
  status: 'initializing' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  currentStep: string;
  startTime: number;
  steps: WorkflowStep[];
  error?: string;
}

export interface WorkflowStep {
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  duration?: number;
  metadata?: Record<string, any>;
}

export interface Classification {
  intent: string;
  complexity: 'low' | 'medium' | 'high';
  recommendedModel: 'anthropic' | 'openai' | 'together';
  requiredActions?: Array<{
    type: string;
    parameters: any;
  }>;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  validationRules: Array<{
    type: string;
    [key: string]: any;
  }>;
}

export interface ContextData {
  user?: any;
  session?: string[];
  documents?: Array<{
    id: string;
    content: string;
    metadata?: any;
  }>;
  project?: any;
  metadata?: Record<string, any>;
}

export interface LLMResponse {
  content: string;
  model: string;
  tokensUsed: number;
  latency: number;
  metadata?: Record<string, any>;
}

export interface ActionResult {
  type: string;
  success: boolean;
  result: any;
  duration: number;
  error?: string;
}

export interface ProcessedResponse {
  content: string;
  valid: boolean;
  issues: string[];
  processingTime: number;
}
