import { useState, useEffect, useCallback } from 'react';
import { ModelProvider } from '@/lib/prompt-engineering/types';

interface ModelStatus {
  provider: ModelProvider;
  model: string;
  available: boolean;
  latency: number | null;
  rateLimitRemaining: number | null;
  rateLimitReset: Date | null;
  lastChecked: Date;
  error: string | null;
}

interface ProviderStatus {
  provider: ModelProvider;
  available: boolean;
  models: ModelStatus[];
  totalRequests: number;
  totalErrors: number;
  avgLatency: number;
}

interface UseModelStatusReturn {
  modelStatus: ModelStatus;
  providerStatuses: ProviderStatus[];
  allModelsStatus: ModelStatus[];
  isLoading: boolean;
  error: Error | null;
  checkStatus: (provider?: ModelProvider, model?: string) => Promise<void>;
  getModelHealth: (provider: ModelProvider, model: string) => 'healthy' | 'degraded' | 'unavailable';
}

const MODEL_CONFIGS = [
  { provider: 'anthropic' as ModelProvider, model: 'claude-opus-4-1-20250805' },
  { provider: 'anthropic' as ModelProvider, model: 'claude-sonnet-3-5-20241022' },
  { provider: 'openai' as ModelProvider, model: 'gpt-4o' },
  { provider: 'openai' as ModelProvider, model: 'gpt-4-turbo' },
  { provider: 'together' as ModelProvider, model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo' },
  { provider: 'together' as ModelProvider, model: 'mistralai/Mistral-7B-Instruct-v0.1' },
];

const generateMockModelStatus = (provider: ModelProvider, model: string): ModelStatus => {
  const isAvailable = Math.random() > 0.1; // 90% uptime
  const baseLatency = provider === 'anthropic' ? 2000 : 
                     provider === 'openai' ? 1500 : 800;
  
  return {
    provider,
    model,
    available: isAvailable,
    latency: isAvailable ? baseLatency + Math.random() * 1000 : null,
    rateLimitRemaining: isAvailable ? Math.floor(Math.random() * 1000) + 100 : null,
    rateLimitReset: isAvailable ? new Date(Date.now() + Math.random() * 3600000) : null,
    lastChecked: new Date(),
    error: isAvailable ? null : 'Service temporarily unavailable',
  };
};

const generateProviderStatus = (provider: ModelProvider, models: ModelStatus[]): ProviderStatus => {
  const availableModels = models.filter(m => m.available);
  const totalLatency = models.reduce((sum, m) => sum + (m.latency || 0), 0);
  
  return {
    provider,
    available: availableModels.length > 0,
    models,
    totalRequests: Math.floor(Math.random() * 10000) + 1000,
    totalErrors: Math.floor(Math.random() * 100),
    avgLatency: models.length > 0 ? totalLatency / models.length : 0,
  };
};

export const useModelStatus = (
  initialProvider: ModelProvider = 'anthropic',
  initialModel: string = 'claude-opus-4-1-20250805'
): UseModelStatusReturn => {
  const [allModelsStatus, setAllModelsStatus] = useState<ModelStatus[]>([]);
  const [providerStatuses, setProviderStatuses] = useState<ProviderStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const currentModelStatus = allModelsStatus.find(
    status => status.provider === initialProvider && status.model === initialModel
  ) || {
    provider: initialProvider,
    model: initialModel,
    available: true,
    latency: 2000,
    rateLimitRemaining: 1000,
    rateLimitReset: new Date(Date.now() + 3600000),
    lastChecked: new Date(),
    error: null,
  };

  const checkStatus = useCallback(async (provider?: ModelProvider, model?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Simulate API calls to check model status
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));

      const modelsToCheck = provider && model ? 
        [{ provider, model }] : 
        MODEL_CONFIGS;

      const statusResults = modelsToCheck.map(config => 
        generateMockModelStatus(config.provider, config.model)
      );

      if (provider && model) {
        // Update specific model
        setAllModelsStatus(prev => 
          prev.map(status => 
            status.provider === provider && status.model === model ?
            statusResults[0] : status
          )
        );
      } else {
        // Update all models
        setAllModelsStatus(statusResults);
      }

      // Group by provider
      const providerGroups = statusResults.reduce((acc, status) => {
        if (!acc[status.provider]) {
          acc[status.provider] = [];
        }
        acc[status.provider].push(status);
        return acc;
      }, {} as Record<ModelProvider, ModelStatus[]>);

      const providerStatusList = Object.entries(providerGroups).map(
        ([provider, models]) => generateProviderStatus(provider as ModelProvider, models)
      );

      setProviderStatuses(providerStatusList);

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to check model status');
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getModelHealth = useCallback((provider: ModelProvider, model: string): 'healthy' | 'degraded' | 'unavailable' => {
    const status = allModelsStatus.find(s => s.provider === provider && s.model === model);
    
    if (!status || !status.available) {
      return 'unavailable';
    }

    if (status.latency && status.latency > 5000) {
      return 'degraded';
    }

    if (status.rateLimitRemaining && status.rateLimitRemaining < 100) {
      return 'degraded';
    }

    return 'healthy';
  }, [allModelsStatus]);

  // Initial status check
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Periodic status updates
  useEffect(() => {
    const interval = setInterval(() => {
      checkStatus();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [checkStatus]);

  // Real-time status simulation (random status changes)
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() < 0.1) { // 10% chance of status change
        const randomModel = MODEL_CONFIGS[Math.floor(Math.random() * MODEL_CONFIGS.length)];
        checkStatus(randomModel.provider, randomModel.model);
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [checkStatus]);

  return {
    modelStatus: currentModelStatus,
    providerStatuses,
    allModelsStatus,
    isLoading,
    error,
    checkStatus,
    getModelHealth,
  };
};