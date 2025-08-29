import { useState, useEffect, useCallback } from 'react';
import { 
  SystemMetrics, 
  TemplateMetrics, 
  ModelMetrics, 
  TimeRange,
  HourlyMetrics 
} from '@/lib/prompt-engineering/types';

interface UsePromptMetricsReturn {
  metrics: SystemMetrics | null;
  templateMetrics: Record<string, TemplateMetrics>;
  modelMetrics: Record<string, ModelMetrics>;
  hourlyMetrics: HourlyMetrics[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  sessionCost: number;
  avgResponseTime: number;
  successRate: number;
}

// Mock data for demonstration
const generateMockMetrics = (timeRange: TimeRange): SystemMetrics => {
  const hours = Math.abs(timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60);
  const baseRequests = Math.floor(hours * (50 + Math.random() * 100));

  return {
    totalRequests: baseRequests,
    totalTokens: Math.floor(baseRequests * (800 + Math.random() * 400)),
    totalCost: baseRequests * (0.003 + Math.random() * 0.007),
    averageLatency: Math.floor(1800 + Math.random() * 1200),
    errorRate: 0.02 + Math.random() * 0.03,
    cacheHitRate: 0.35 + Math.random() * 0.30,
    topTemplates: [
      {
        templateId: 'code-review-automated',
        name: 'Code Review',
        count: Math.floor(baseRequests * 0.4),
        percentage: 40 + Math.random() * 10,
      },
      {
        templateId: 'test-generation-unit',
        name: 'Unit Test Generation',
        count: Math.floor(baseRequests * 0.3),
        percentage: 30 + Math.random() * 10,
      },
      {
        templateId: 'documentation-auto-generator',
        name: 'Documentation Generator',
        count: Math.floor(baseRequests * 0.2),
        percentage: 20 + Math.random() * 10,
      },
    ],
    topModels: [
      {
        model: 'claude-opus-4-1-20250805',
        count: Math.floor(baseRequests * 0.6),
        percentage: 60 + Math.random() * 10,
      },
      {
        model: 'gpt-4o',
        count: Math.floor(baseRequests * 0.25),
        percentage: 25 + Math.random() * 5,
      },
      {
        model: 'claude-sonnet-3-5-20241022',
        count: Math.floor(baseRequests * 0.15),
        percentage: 15 + Math.random() * 5,
      },
    ],
    hourlyTrends: generateHourlyTrends(timeRange),
  };
};

const generateHourlyTrends = (timeRange: TimeRange): HourlyMetrics[] => {
  const trends: HourlyMetrics[] = [];
  const startTime = new Date(timeRange.start);
  const endTime = new Date(timeRange.end);
  
  const interval = timeRange.granularity === 'minute' ? 60000 : 
                   timeRange.granularity === 'hour' ? 3600000 : 86400000;
  
  for (let time = startTime.getTime(); time <= endTime.getTime(); time += interval) {
    const baseRequests = 20 + Math.random() * 60;
    trends.push({
      hour: new Date(time),
      requests: Math.floor(baseRequests),
      tokens: Math.floor(baseRequests * (600 + Math.random() * 400)),
      cost: baseRequests * (0.002 + Math.random() * 0.006),
      errors: Math.floor(baseRequests * (0.01 + Math.random() * 0.04)),
      avgLatency: Math.floor(1500 + Math.random() * 1000),
    });
  }
  
  return trends;
};

const generateTemplateMetrics = (templateId: string): TemplateMetrics => ({
  templateId,
  usageCount: Math.floor(100 + Math.random() * 500),
  successRate: 0.85 + Math.random() * 0.10,
  averageLatency: Math.floor(1800 + Math.random() * 1200),
  averageCost: 0.003 + Math.random() * 0.007,
  averageQuality: 0.80 + Math.random() * 0.15,
  errorTypes: {
    'TIMEOUT': Math.floor(Math.random() * 5),
    'RATE_LIMIT': Math.floor(Math.random() * 3),
    'VALIDATION_ERROR': Math.floor(Math.random() * 7),
    'API_ERROR': Math.floor(Math.random() * 2),
  },
  userSatisfaction: 0.75 + Math.random() * 0.20,
});

const generateModelMetrics = (model: string, provider: string): ModelMetrics => ({
  model,
  provider: provider as any,
  requestCount: Math.floor(200 + Math.random() * 800),
  tokenCount: Math.floor(150000 + Math.random() * 500000),
  totalCost: 1.5 + Math.random() * 8.5,
  averageLatency: Math.floor(1600 + Math.random() * 1400),
  errorRate: 0.01 + Math.random() * 0.04,
  rateLimitHits: Math.floor(Math.random() * 10),
});

export const usePromptMetrics = (timeRange?: TimeRange): UsePromptMetricsReturn => {
  const defaultTimeRange: TimeRange = {
    start: new Date(Date.now() - 24 * 60 * 60 * 1000),
    end: new Date(),
    granularity: 'hour',
  };

  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [templateMetrics, setTemplateMetrics] = useState<Record<string, TemplateMetrics>>({});
  const [modelMetrics, setModelMetrics] = useState<Record<string, ModelMetrics>>({});
  const [hourlyMetrics, setHourlyMetrics] = useState<HourlyMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [sessionCost, setSessionCost] = useState(0);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

      const range = timeRange || defaultTimeRange;
      const systemMetrics = generateMockMetrics(range);
      
      setMetrics(systemMetrics);
      setHourlyMetrics(systemMetrics.hourlyTrends || []);

      // Generate template metrics
      const templateMetricsData: Record<string, TemplateMetrics> = {};
      systemMetrics.topTemplates.forEach(template => {
        templateMetricsData[template.templateId] = generateTemplateMetrics(template.templateId);
      });
      setTemplateMetrics(templateMetricsData);

      // Generate model metrics
      const modelMetricsData: Record<string, ModelMetrics> = {};
      systemMetrics.topModels.forEach(model => {
        const provider = model.model.includes('claude') ? 'anthropic' : 
                        model.model.includes('gpt') ? 'openai' : 'together';
        modelMetricsData[model.model] = generateModelMetrics(model.model, provider);
      });
      setModelMetrics(modelMetricsData);

      // Update session cost
      setSessionCost(prev => prev + (Math.random() * 0.005));

    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch metrics'));
    } finally {
      setIsLoading(false);
    }
  }, [timeRange, defaultTimeRange]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  const avgResponseTime = metrics?.averageLatency || 0;
  const successRate = metrics ? 1 - metrics.errorRate : 0;

  return {
    metrics,
    templateMetrics,
    modelMetrics,
    hourlyMetrics,
    isLoading,
    error,
    refresh,
    sessionCost,
    avgResponseTime,
    successRate,
  };
};