// Re-export types from the main prompt engineering system
export * from '@candlefish/prompt-engineering/types';

// Mobile-specific types
export interface MobilePromptRequest {
  templateId: string;
  variables: Record<string, any>;
  modelConfig?: Partial<MobileModelConfig>;
  context?: MobilePromptContext;
  options?: MobilePromptOptions;
  traceId?: string;
  userId?: string;
  sessionId?: string;
  source: 'mobile' | 'voice' | 'camera' | 'clipboard';
}

export interface MobileModelConfig {
  provider: 'anthropic' | 'openai' | 'together' | 'fireworks' | 'local' | 'custom';
  model: string;
  apiKey?: string;
  endpoint?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
}

export interface MobilePromptContext {
  workflowId?: string;
  location?: GeolocationData;
  deviceInfo?: DeviceInfo;
  networkStatus?: NetworkStatus;
  batteryLevel?: number;
  cameraData?: CameraData;
  voiceData?: VoiceData;
  clipboardData?: string;
  previousPrompts?: string[];
  customContext?: Record<string, any>;
}

export interface MobilePromptOptions {
  stream?: boolean;
  cache?: boolean;
  cacheKey?: string;
  cacheTTL?: number;
  timeout?: number;
  offline?: boolean;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  hapticFeedback?: boolean;
  voiceResponse?: boolean;
  backgroundExecution?: boolean;
}

export interface GeolocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
}

export interface DeviceInfo {
  platform: 'ios' | 'android';
  version: string;
  model: string;
  brand: string;
  screenDimensions: {
    width: number;
    height: number;
  };
  orientation: 'portrait' | 'landscape';
}

export interface NetworkStatus {
  isConnected: boolean;
  type: 'wifi' | 'cellular' | 'none';
  isInternetReachable: boolean;
  strength?: number;
}

export interface CameraData {
  uri: string;
  base64?: string;
  ocrText?: string;
  metadata?: {
    width: number;
    height: number;
    type: string;
    size: number;
  };
}

export interface VoiceData {
  uri: string;
  duration: number;
  transcription?: string;
  confidence?: number;
}

export interface MobilePromptResponse {
  id: string;
  templateId: string;
  model: string;
  provider: string;
  prompt: string;
  response: string;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  latency: number;
  cost: number;
  quality?: {
    accuracy?: number;
    relevance?: number;
    coherence?: number;
    completeness?: number;
    overall?: number;
  };
  metadata?: Record<string, any>;
  error?: {
    code: string;
    message: string;
    details?: any;
    retryable?: boolean;
  };
  cached?: boolean;
  offline?: boolean;
  timestamp: Date;
  traceId?: string;
  source: 'mobile' | 'voice' | 'camera' | 'clipboard';
}

export interface OfflinePrompt {
  id: string;
  request: MobilePromptRequest;
  timestamp: Date;
  retryCount: number;
  priority: 'low' | 'normal' | 'high' | 'critical';
}

export interface MobileSettings {
  auth: {
    biometricEnabled: boolean;
    autoLockTimeout: number;
  };
  models: {
    defaultProvider: string;
    defaultModel: string;
    preferredModels: string[];
  };
  ui: {
    theme: 'light' | 'dark' | 'auto';
    hapticFeedback: boolean;
    soundEnabled: boolean;
    fontSize: 'small' | 'medium' | 'large';
  };
  sync: {
    autoSync: boolean;
    syncOnWifiOnly: boolean;
    syncInterval: number;
  };
  privacy: {
    cacheEnabled: boolean;
    analyticsEnabled: boolean;
    crashReportingEnabled: boolean;
  };
  notifications: {
    enabled: boolean;
    executionComplete: boolean;
    errorAlerts: boolean;
    dailyDigest: boolean;
  };
}

export interface SwipeAction {
  id: string;
  title: string;
  icon: string;
  color: string;
  backgroundColor: string;
  action: () => void;
}

export interface QuickAction {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  color: string;
  templateId?: string;
  action: () => void;
}

export interface VoiceCommand {
  trigger: string;
  templateId: string;
  description: string;
  variables?: Record<string, any>;
}

export interface WidgetData {
  recentTemplates: Array<{
    id: string;
    name: string;
    category: string;
    lastUsed: Date;
  }>;
  metrics: {
    todayExecutions: number;
    thisWeekCost: number;
    averageLatency: number;
  };
}

// Navigation types
export type RootStackParamList = {
  Home: undefined;
  PromptList: {
    category?: string;
    search?: string;
  };
  PromptEditor: {
    templateId?: string;
    mode?: 'create' | 'edit' | 'duplicate';
  };
  PromptTest: {
    templateId: string;
  };
  Metrics: {
    templateId?: string;
    timeRange?: 'day' | 'week' | 'month' | 'year';
  };
  Settings: undefined;
  Login: undefined;
  TemplateDetail: {
    templateId: string;
  };
  ExecutionDetail: {
    executionId: string;
  };
  VoicePrompt: {
    templateId?: string;
  };
  CameraPrompt: {
    mode: 'ocr' | 'context';
  };
};

export type BottomTabParamList = {
  HomeTab: undefined;
  PromptsTab: undefined;
  TestingTab: undefined;
  MetricsTab: undefined;
  SettingsTab: undefined;
};