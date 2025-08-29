import { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { useAppSelector } from './redux';

export interface PromptMetrics {
  todayExecutions: number;
  todayCost: number;
  averageLatency: number;
  successRate: number;
  popularTemplates: Array<{
    id: string;
    name: string;
    executions: number;
    successRate: number;
  }>;
  recentExecutions: Array<{
    id: string;
    templateId: string;
    templateName: string;
    timestamp: Date;
    status: 'success' | 'error' | 'pending';
    latency?: number;
    cost?: number;
  }>;
  modelUsage: Array<{
    model: string;
    provider: string;
    executions: number;
    cost: number;
    averageLatency: number;
  }>;
  hourlyTrends: Array<{
    hour: number;
    executions: number;
    cost: number;
    avgLatency: number;
  }>;
}

export const usePromptMetrics = () => {
  const { user } = useAppSelector((state) => state.auth);
  
  const { data: metrics, isLoading: loading, error, refetch } = useQuery(
    ['promptMetrics', user?.id],
    async () => {
      // Simulate API call to get metrics
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data
      return {
        todayExecutions: 42,
        todayCost: 3.47,
        averageLatency: 1850,
        successRate: 0.967,
        popularTemplates: [
          {
            id: '1',
            name: 'Code Review Assistant',
            executions: 156,
            successRate: 0.95
          },
          {
            id: '2',
            name: 'Test Generator',
            executions: 89,
            successRate: 0.92
          },
          {
            id: '3',
            name: 'Documentation Writer',
            executions: 67,
            successRate: 0.98
          }
        ],
        recentExecutions: [
          {
            id: 'exec-1',
            templateId: '1',
            templateName: 'Code Review Assistant',
            timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
            status: 'success' as const,
            latency: 1240,
            cost: 0.023
          },
          {
            id: 'exec-2',
            templateId: '2',
            templateName: 'Test Generator',
            timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
            status: 'success' as const,
            latency: 2100,
            cost: 0.034
          },
          {
            id: 'exec-3',
            templateId: '3',
            templateName: 'Documentation Writer',
            timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
            status: 'error' as const,
            latency: 0,
            cost: 0
          }
        ],
        modelUsage: [
          {
            model: 'claude-opus-4-1-20250805',
            provider: 'anthropic',
            executions: 28,
            cost: 2.14,
            averageLatency: 1650
          },
          {
            model: 'gpt-4o',
            provider: 'openai',
            executions: 14,
            cost: 1.33,
            averageLatency: 2100
          }
        ],
        hourlyTrends: Array.from({ length: 24 }, (_, i) => ({
          hour: i,
          executions: Math.floor(Math.random() * 10),
          cost: Math.random() * 0.5,
          avgLatency: 1500 + Math.random() * 1000
        }))
      } as PromptMetrics;
    },
    {
      enabled: !!user,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    }
  );

  return {
    metrics,
    loading,
    error,
    refetch
  };
};