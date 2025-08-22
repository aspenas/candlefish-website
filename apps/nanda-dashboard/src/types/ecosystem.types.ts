// Additional types for the Living Agent Ecosystem

export interface EcosystemState {
  agents: number;
  consortiums: number;
  negotiations: number;
  messagesPerMinute: number;
  optimizations: number;
  networkHealth: number;
  avgResponseTime: number;
  successRate: number;
}

export interface ActivityIndicator {
  type: 'negotiation' | 'communication' | 'optimization';
  count: number;
  isActive: boolean;
  message: string;
}

export interface PerformanceMetrics {
  systemPerformance: {
    avgResponseTime: number;
    successRate: number;
    networkHealth: number;
  };
  agentEconomics: {
    totalCreditsTraded: number;
    activeBids: number;
    avgTrustScore: number;
  };
  ecosystemHealth: {
    agentUtilization: number;
    consortiumFormationRate: number;
    optimizationSuccess: number;
  };
}

export interface ViewConfig {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

export interface ComponentError {
  component: string;
  error: Error;
  timestamp: Date;
  retryCount: number;
}

export interface LoadingState {
  isLoading: boolean;
  loadingMessage?: string;
  progress?: number;
}

// Error handling types
export type AsyncResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: Error;
};

export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

// Animation configuration types
export interface AnimationConfig {
  duration: number;
  delay?: number;
  ease?: string;
  repeat?: number;
}

export interface TransitionConfig {
  initial: Record<string, any>;
  animate: Record<string, any>;
  exit?: Record<string, any>;
  transition?: AnimationConfig;
}

// Validation types
export interface ValidationRule<T> {
  validate: (value: T) => boolean;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export type Validator<T> = (value: T) => ValidationResult;
