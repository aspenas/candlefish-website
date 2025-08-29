'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { usePromptMetrics } from '@/hooks/usePromptMetrics';
import { TimeRange } from '@/lib/prompt-engineering/types';

interface MetricsState {
  timeRange: TimeRange;
  selectedMetric: 'overview' | 'templates' | 'models' | 'costs' | 'quality';
  refreshInterval: number;
}

export const PromptMetrics: React.FC<{ className?: string }> = ({ 
  className = '' 
}) => {
  const [state, setState] = useState<MetricsState>({
    timeRange: {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      end: new Date(),
      granularity: 'hour',
    },
    selectedMetric: 'overview',
    refreshInterval: 30000, // 30 seconds
  });

  const { metrics, templateMetrics, modelMetrics, isLoading, error, refresh } = usePromptMetrics(state.timeRange);

  // Auto-refresh metrics
  useEffect(() => {
    const interval = setInterval(refresh, state.refreshInterval);
    return () => clearInterval(interval);
  }, [refresh, state.refreshInterval]);

  const setTimeRange = (range: 'hour' | 'day' | 'week' | 'month') => {
    const end = new Date();
    let start: Date;
    let granularity: TimeRange['granularity'];

    switch (range) {
      case 'hour':
        start = new Date(end.getTime() - 60 * 60 * 1000);
        granularity = 'minute';
        break;
      case 'day':
        start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
        granularity = 'hour';
        break;
      case 'week':
        start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
        granularity = 'day';
        break;
      case 'month':
        start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
        granularity = 'day';
        break;
    }

    setState(prev => ({
      ...prev,
      timeRange: { start, end, granularity }
    }));
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toFixed(0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
    }).format(amount);
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 0.95) return 'text-green-600';
    if (rate >= 0.90) return 'text-yellow-600';
    return 'text-red-600';
  };

  const renderOverviewMetrics = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Requests */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-ink-secondary">Total Requests</h3>
          <svg className="w-4 h-4 text-ink-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
        </div>
        <div className="text-2xl font-mono font-bold text-ink-primary">
          {formatNumber(metrics?.totalRequests || 0)}
        </div>
        <div className="text-xs text-ink-secondary mt-1">
          +12% from last period
        </div>
      </Card>

      {/* Average Latency */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-ink-secondary">Avg Latency</h3>
          <svg className="w-4 h-4 text-ink-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="text-2xl font-mono font-bold text-ink-primary">
          {metrics?.averageLatency ? `${Math.round(metrics.averageLatency)}ms` : '—'}
        </div>
        <div className="text-xs text-ink-secondary mt-1">
          -8% from last period
        </div>
      </Card>

      {/* Total Cost */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-ink-secondary">Total Cost</h3>
          <svg className="w-4 h-4 text-ink-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        </div>
        <div className="text-2xl font-mono font-bold text-ink-primary">
          {formatCurrency(metrics?.totalCost || 0)}
        </div>
        <div className="text-xs text-ink-secondary mt-1">
          +5% from last period
        </div>
      </Card>

      {/* Success Rate */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-ink-secondary">Success Rate</h3>
          <svg className="w-4 h-4 text-ink-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className={`text-2xl font-mono font-bold ${getSuccessRateColor(1 - (metrics?.errorRate || 0))}`}>
          {metrics ? `${Math.round((1 - metrics.errorRate) * 100)}%` : '—'}
        </div>
        <div className="text-xs text-ink-secondary mt-1">
          +2% from last period
        </div>
      </Card>
    </div>
  );

  const renderTemplateMetrics = () => (
    <div className="space-y-6">
      <Card>
        <div className="p-4 border-b border-atelier-structure">
          <h3 className="text-lg font-medium text-ink-primary">Template Performance</h3>
        </div>
        <div className="p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-atelier-structure">
                  <th className="text-left py-2 text-ink-secondary font-medium">Template</th>
                  <th className="text-right py-2 text-ink-secondary font-medium">Usage</th>
                  <th className="text-right py-2 text-ink-secondary font-medium">Success Rate</th>
                  <th className="text-right py-2 text-ink-secondary font-medium">Avg Latency</th>
                  <th className="text-right py-2 text-ink-secondary font-medium">Avg Cost</th>
                  <th className="text-right py-2 text-ink-secondary font-medium">Quality</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-atelier-structure">
                {metrics?.topTemplates?.map((template, index) => (
                  <tr key={template.templateId} className="hover:bg-atelier-structure/10">
                    <td className="py-3">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-ink-primary">{template.name}</span>
                        <Badge variant="outline" size="xs">#{index + 1}</Badge>
                      </div>
                    </td>
                    <td className="text-right py-3 font-mono">{formatNumber(template.count)}</td>
                    <td className="text-right py-3">
                      <Badge variant="success" size="sm">
                        {template.percentage.toFixed(1)}%
                      </Badge>
                    </td>
                    <td className="text-right py-3 font-mono">—</td>
                    <td className="text-right py-3 font-mono">—</td>
                    <td className="text-right py-3 font-mono">—</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderModelMetrics = () => (
    <div className="space-y-6">
      <Card>
        <div className="p-4 border-b border-atelier-structure">
          <h3 className="text-lg font-medium text-ink-primary">Model Performance</h3>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics?.topModels?.map((model) => (
              <Card key={model.model} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-ink-primary">{model.model}</h4>
                  <Badge variant="outline" size="sm">
                    {model.percentage.toFixed(1)}%
                  </Badge>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-ink-secondary">Requests</span>
                    <span className="font-mono">{formatNumber(model.count)}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );

  const renderTrendChart = () => (
    <Card>
      <div className="p-4 border-b border-atelier-structure">
        <h3 className="text-lg font-medium text-ink-primary">Usage Trends</h3>
      </div>
      <div className="p-4">
        <div className="h-64 flex items-center justify-center text-ink-secondary">
          <div className="text-center">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p>Interactive charts coming soon</p>
            <p className="text-xs mt-1">Charts will be implemented with Chart.js or D3.js</p>
          </div>
        </div>
      </div>
    </Card>
  );

  if (error) {
    return (
      <div className={`${className}`}>
        <Card className="p-6 text-center">
          <div className="text-red-600 mb-2">
            <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h3 className="text-lg font-medium mb-2">Error Loading Metrics</h3>
            <p className="text-sm text-ink-secondary mb-4">{error.message}</p>
            <Button onClick={refresh} variant="primary" size="sm">
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-medium text-ink-primary">Metrics Dashboard</h2>
          {isLoading && <LoadingSpinner size="sm" />}
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Time Range Selector */}
          <div className="flex items-center space-x-1 bg-atelier-structure/10 rounded p-1">
            {['hour', 'day', 'week', 'month'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range as any)}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  state.timeRange.start.getTime() === new Date(Date.now() - (range === 'hour' ? 3600 : range === 'day' ? 86400 : range === 'week' ? 604800 : 2592000) * 1000).getTime()
                    ? 'bg-operation-active text-white'
                    : 'text-ink-secondary hover:text-ink-primary'
                }`}
              >
                {range === 'hour' ? '1H' : range === 'day' ? '1D' : range === 'week' ? '1W' : '1M'}
              </button>
            ))}
          </div>

          {/* Metric Selector */}
          <select
            value={state.selectedMetric}
            onChange={(e) => setState(prev => ({ ...prev, selectedMetric: e.target.value as any }))}
            className="px-3 py-2 text-sm border border-atelier-structure rounded bg-atelier-canvas"
          >
            <option value="overview">Overview</option>
            <option value="templates">Templates</option>
            <option value="models">Models</option>
            <option value="costs">Costs</option>
            <option value="quality">Quality</option>
          </select>

          <Button onClick={refresh} variant="ghost" size="sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </Button>
        </div>
      </div>

      {/* Metrics Content */}
      {state.selectedMetric === 'overview' && (
        <div className="space-y-6">
          {renderOverviewMetrics()}
          {renderTrendChart()}
        </div>
      )}
      
      {state.selectedMetric === 'templates' && renderTemplateMetrics()}
      {state.selectedMetric === 'models' && renderModelMetrics()}
      
      {/* Additional Views */}
      {(state.selectedMetric === 'costs' || state.selectedMetric === 'quality') && (
        <Card className="p-6 text-center">
          <div className="text-ink-secondary">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="capitalize">{state.selectedMetric} metrics coming soon</p>
          </div>
        </Card>
      )}
    </div>
  );
};