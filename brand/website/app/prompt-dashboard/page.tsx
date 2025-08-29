'use client';

import React, { useState, useEffect } from 'react';
import { PromptEditor } from '@/components/prompt-engineering/PromptEditor';
import { PromptTester } from '@/components/prompt-engineering/PromptTester';
import { PromptMetrics } from '@/components/prompt-engineering/PromptMetrics';
import { ModelSelector } from '@/components/prompt-engineering/ModelSelector';
import { PromptHistory } from '@/components/prompt-engineering/PromptHistory';
import { PromptChainBuilder } from '@/components/prompt-engineering/PromptChainBuilder';
import { TokenUsageWidget } from '@/components/prompt-engineering/TokenUsageWidget';
import { CostTracker } from '@/components/prompt-engineering/CostTracker';
import { QualityRadarChart } from '@/components/prompt-engineering/QualityRadarChart';
import { ResponseTimeChart } from '@/components/prompt-engineering/ResponseTimeChart';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { usePromptExecution } from '@/hooks/usePromptExecution';
import { usePromptMetrics } from '@/hooks/usePromptMetrics';
import { usePromptCache } from '@/hooks/usePromptCache';
import { useModelStatus } from '@/hooks/useModelStatus';
import { PromptTemplate, ModelConfig, PromptRequest } from '@/lib/prompt-engineering/types';

interface DashboardState {
  activeTemplate: PromptTemplate | null;
  modelConfig: ModelConfig;
  isExecuting: boolean;
  selectedView: 'editor' | 'tester' | 'metrics' | 'history' | 'chains';
  sidebarCollapsed: boolean;
}

export default function PromptDashboard() {
  const [state, setState] = useState<DashboardState>({
    activeTemplate: null,
    modelConfig: {
      provider: 'anthropic',
      model: 'claude-opus-4-1-20250805',
      maxTokens: 4000,
      temperature: 0.3,
    },
    isExecuting: false,
    selectedView: 'editor',
    sidebarCollapsed: false,
  });

  const { execute, isLoading, error, response } = usePromptExecution();
  const { metrics, isLoading: metricsLoading } = usePromptMetrics();
  const { cacheStats } = usePromptCache();
  const { modelStatus } = useModelStatus();

  const handleTemplateSelect = (template: PromptTemplate) => {
    setState(prev => ({ ...prev, activeTemplate: template }));
  };

  const handleModelChange = (modelConfig: ModelConfig) => {
    setState(prev => ({ ...prev, modelConfig }));
  };

  const handleExecute = async (request: PromptRequest) => {
    setState(prev => ({ ...prev, isExecuting: true }));
    try {
      await execute(request);
    } finally {
      setState(prev => ({ ...prev, isExecuting: false }));
    }
  };

  const toggleSidebar = () => {
    setState(prev => ({ ...prev, sidebarCollapsed: !prev.sidebarCollapsed }));
  };

  const setView = (view: DashboardState['selectedView']) => {
    setState(prev => ({ ...prev, selectedView: view }));
  };

  return (
    <div className="min-h-screen bg-atelier-canvas font-sans">
      {/* Header */}
      <header className="border-b border-atelier-structure bg-atelier-canvas/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleSidebar}
                className="p-2 rounded hover:bg-atelier-structure/20 transition-colors"
                aria-label="Toggle sidebar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-xl font-display tracking-tight text-ink-primary">
                Prompt Engineering Dashboard
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Model Status Indicator */}
              <Badge 
                variant={modelStatus.available ? 'success' : 'error'}
                size="sm"
              >
                {state.modelConfig.model} {modelStatus.available ? 'Online' : 'Offline'}
              </Badge>
              
              {/* Cache Stats */}
              <div className="text-sm text-ink-secondary">
                Cache Hit Rate: {Math.round((cacheStats?.hitRate || 0) * 100)}%
              </div>
              
              {/* Cost Indicator */}
              <div className="text-sm text-ink-secondary">
                Session Cost: ${metrics?.sessionCost?.toFixed(4) || '0.0000'}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-64px)]">
        {/* Sidebar */}
        <aside 
          className={`bg-atelier-canvas border-r border-atelier-structure transition-all duration-swift ${
            state.sidebarCollapsed ? 'w-16' : 'w-64'
          }`}
        >
          <div className="p-4 space-y-2">
            {/* Navigation */}
            <nav className="space-y-1">
              {[
                { id: 'editor', label: 'Editor', icon: 'edit' },
                { id: 'tester', label: 'Tester', icon: 'test' },
                { id: 'metrics', label: 'Metrics', icon: 'chart' },
                { id: 'history', label: 'History', icon: 'history' },
                { id: 'chains', label: 'Chains', icon: 'chain' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setView(item.id as DashboardState['selectedView'])}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded transition-colors ${
                    state.selectedView === item.id
                      ? 'bg-operation-active/10 text-operation-active'
                      : 'text-ink-secondary hover:text-ink-primary hover:bg-atelier-structure/20'
                  }`}
                  title={state.sidebarCollapsed ? item.label : undefined}
                >
                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {item.icon === 'edit' && (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    )}
                    {item.icon === 'test' && (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    )}
                    {item.icon === 'chart' && (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    )}
                    {item.icon === 'history' && (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    )}
                    {item.icon === 'chain' && (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    )}
                  </svg>
                  {!state.sidebarCollapsed && <span>{item.label}</span>}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          <div className="h-full p-6">
            {/* Metrics Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <TokenUsageWidget />
              <CostTracker />
              <Card className="p-4">
                <div className="text-sm font-medium text-ink-secondary mb-1">Response Time</div>
                <div className="text-2xl font-mono text-ink-primary">
                  {metrics?.avgResponseTime ? `${metrics.avgResponseTime}ms` : '—'}
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-sm font-medium text-ink-secondary mb-1">Success Rate</div>
                <div className="text-2xl font-mono text-operation-complete">
                  {metrics?.successRate ? `${Math.round(metrics.successRate * 100)}%` : '—'}
                </div>
              </Card>
            </div>

            {/* Main Content Area */}
            <div className="h-[calc(100%-120px)]">
              {state.selectedView === 'editor' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                  <div className="lg:col-span-2">
                    <PromptEditor
                      template={state.activeTemplate}
                      onTemplateChange={handleTemplateSelect}
                      modelConfig={state.modelConfig}
                    />
                  </div>
                  <div className="space-y-4">
                    <ModelSelector
                      value={state.modelConfig}
                      onChange={handleModelChange}
                    />
                    <QualityRadarChart />
                  </div>
                </div>
              )}

              {state.selectedView === 'tester' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                  <PromptTester
                    template={state.activeTemplate}
                    modelConfig={state.modelConfig}
                    onExecute={handleExecute}
                    isExecuting={state.isExecuting}
                    response={response}
                    error={error}
                  />
                  <div className="space-y-4">
                    <ResponseTimeChart />
                    <PromptHistory />
                  </div>
                </div>
              )}

              {state.selectedView === 'metrics' && (
                <PromptMetrics />
              )}

              {state.selectedView === 'history' && (
                <PromptHistory detailed />
              )}

              {state.selectedView === 'chains' && (
                <PromptChainBuilder />
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Global Loading Overlay */}
      {(isLoading || metricsLoading) && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-atelier-canvas rounded-lg p-6 flex items-center space-x-3 shadow-lg">
            <LoadingSpinner size="sm" />
            <span className="text-ink-primary">
              {isLoading ? 'Executing prompt...' : 'Loading metrics...'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}