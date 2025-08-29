'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PromptTemplate, ModelConfig, PromptRequest, PromptResponse } from '@/lib/prompt-engineering/types';

interface PromptTesterProps {
  template: PromptTemplate | null;
  modelConfig: ModelConfig;
  onExecute: (request: PromptRequest) => Promise<void>;
  isExecuting: boolean;
  response?: PromptResponse | null;
  error?: Error | null;
  className?: string;
}

interface TestState {
  variables: Record<string, any>;
  customPrompt: string;
  useCustomPrompt: boolean;
  abTestVariant?: string;
  selectedExample: number;
  showResponse: boolean;
}

export const PromptTester: React.FC<PromptTesterProps> = ({
  template,
  modelConfig,
  onExecute,
  isExecuting,
  response,
  error,
  className = '',
}) => {
  const [state, setState] = useState<TestState>({
    variables: {},
    customPrompt: '',
    useCustomPrompt: false,
    selectedExample: 0,
    showResponse: true,
  });

  // Initialize variables when template changes
  useEffect(() => {
    if (template) {
      const variables = template.variables.reduce((acc, variable) => {
        acc[variable.name] = variable.default || '';
        return acc;
      }, {} as Record<string, any>);
      
      setState(prev => ({ 
        ...prev, 
        variables,
        customPrompt: template.template 
      }));
    }
  }, [template]);

  const handleVariableChange = (name: string, value: any) => {
    setState(prev => ({
      ...prev,
      variables: { ...prev.variables, [name]: value }
    }));
  };

  const handleExecute = async () => {
    if (!template) return;

    const request: PromptRequest = {
      templateId: template.id,
      variables: state.variables,
      modelConfig,
      options: {
        trackMetrics: true,
        evaluateQuality: true,
        abTest: Boolean(state.abTestVariant),
        abTestVariant: state.abTestVariant,
      },
    };

    await onExecute(request);
    setState(prev => ({ ...prev, showResponse: true }));
  };

  const handleLoadExample = (exampleIndex: number) => {
    if (!template?.examples?.[exampleIndex]) return;
    
    const example = template.examples[exampleIndex];
    setState(prev => ({
      ...prev,
      variables: example.input,
      selectedExample: exampleIndex,
    }));
  };

  const renderVariableInput = (variable: any) => {
    const value = state.variables[variable.name] || '';
    
    switch (variable.type) {
      case 'boolean':
        return (
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => handleVariableChange(variable.name, e.target.checked)}
              className="rounded border-atelier-structure"
            />
            <span className="text-sm">{variable.description}</span>
          </label>
        );
      
      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleVariableChange(variable.name, parseFloat(e.target.value) || 0)}
            placeholder={variable.description}
          />
        );
      
      case 'array':
        return (
          <Textarea
            value={Array.isArray(value) ? value.join('\n') : value}
            onChange={(e) => handleVariableChange(variable.name, e.target.value.split('\n').filter(Boolean))}
            placeholder="One item per line"
            rows={3}
          />
        );
      
      default:
        return (
          <Textarea
            value={value}
            onChange={(e) => handleVariableChange(variable.name, e.target.value)}
            placeholder={variable.description}
            rows={variable.name.includes('code') || variable.name.includes('text') ? 4 : 2}
            className={variable.name.includes('code') ? 'font-mono text-sm' : ''}
          />
        );
    }
  };

  const generatePromptPreview = () => {
    if (!template) return '';
    
    let preview = state.useCustomPrompt ? state.customPrompt : template.template;
    
    // Replace variables
    Object.entries(state.variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      preview = preview.replace(regex, String(value || `[${key}]`));
    });

    return preview;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-ink-primary">
          Prompt Tester
        </h3>
        
        <div className="flex items-center space-x-2">
          {template?.examples && template.examples.length > 0 && (
            <select
              value={state.selectedExample}
              onChange={(e) => handleLoadExample(parseInt(e.target.value))}
              className="px-3 py-1 text-sm border border-atelier-structure rounded bg-atelier-canvas"
            >
              <option value="">Load Example</option>
              {template.examples.map((example, index) => (
                <option key={index} value={index}>
                  Example {index + 1}
                </option>
              ))}
            </select>
          )}
          
          <Button
            variant="primary"
            onClick={handleExecute}
            disabled={!template || isExecuting}
            className="min-w-[100px]"
          >
            {isExecuting ? <LoadingSpinner size="xs" /> : 'Execute'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="space-y-4">
          {/* Variables Input */}
          {template?.variables && template.variables.length > 0 && (
            <Card>
              <div className="p-4 border-b border-atelier-structure">
                <h4 className="font-medium text-ink-primary">Input Variables</h4>
              </div>
              
              <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
                {template.variables.map((variable) => (
                  <div key={variable.name} className="space-y-2">
                    <label className="block">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-ink-primary">
                          {variable.name}
                        </span>
                        <div className="flex items-center space-x-2">
                          {variable.required && (
                            <Badge variant="warning" size="xs">Required</Badge>
                          )}
                          <span className="text-xs text-ink-secondary capitalize">
                            {variable.type}
                          </span>
                        </div>
                      </div>
                      {renderVariableInput(variable)}
                    </label>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Custom Prompt Toggle */}
          <Card className="p-4">
            <label className="flex items-center space-x-2 mb-4">
              <input
                type="checkbox"
                checked={state.useCustomPrompt}
                onChange={(e) => setState(prev => ({ ...prev, useCustomPrompt: e.target.checked }))}
                className="rounded border-atelier-structure"
              />
              <span className="text-sm font-medium">Use Custom Prompt</span>
            </label>
            
            {state.useCustomPrompt && (
              <Textarea
                value={state.customPrompt}
                onChange={(e) => setState(prev => ({ ...prev, customPrompt: e.target.value }))}
                placeholder="Enter custom prompt..."
                rows={6}
                className="font-mono text-sm"
              />
            )}
          </Card>

          {/* Prompt Preview */}
          <Card>
            <div className="p-4 border-b border-atelier-structure">
              <h4 className="font-medium text-ink-primary">Prompt Preview</h4>
            </div>
            
            <div className="p-4">
              <div className="whitespace-pre-wrap text-sm text-ink-secondary font-mono bg-atelier-structure/10 p-3 rounded max-h-64 overflow-y-auto">
                {generatePromptPreview()}
              </div>
            </div>
          </Card>
        </div>

        {/* Response Panel */}
        <div className="space-y-4">
          {/* Response Display */}
          {state.showResponse && (
            <Card className="h-full">
              <div className="p-4 border-b border-atelier-structure flex items-center justify-between">
                <h4 className="font-medium text-ink-primary">Response</h4>
                {response && (
                  <div className="flex items-center space-x-3 text-xs text-ink-secondary">
                    <span>{response.latency}ms</span>
                    <span>{response.tokensUsed.total} tokens</span>
                    <span>${response.cost.toFixed(4)}</span>
                  </div>
                )}
              </div>
              
              <div className="p-4 h-[calc(100%-73px)]">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded p-4 text-red-800">
                    <h5 className="font-medium mb-2">Error</h5>
                    <p className="text-sm">{error.message}</p>
                  </div>
                )}
                
                {response && (
                  <div className="space-y-4 h-full overflow-y-auto">
                    <div className="whitespace-pre-wrap text-sm text-ink-primary">
                      {response.response}
                    </div>
                    
                    {/* Quality Metrics */}
                    {response.quality && (
                      <div className="pt-4 border-t border-atelier-structure">
                        <h5 className="font-medium text-ink-primary mb-3">Quality Metrics</h5>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {Object.entries(response.quality).map(([key, value]) => 
                            typeof value === 'number' && (
                              <div key={key} className="flex justify-between">
                                <span className="text-ink-secondary capitalize">
                                  {key.replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                                <span className="font-mono text-ink-primary">
                                  {(value * 100).toFixed(1)}%
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {/* Response Metadata */}
                    <div className="pt-4 border-t border-atelier-structure">
                      <h5 className="font-medium text-ink-primary mb-3">Execution Details</h5>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-ink-secondary">Model</span>
                          <span className="font-mono text-ink-primary">{response.model}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-ink-secondary">Provider</span>
                          <span className="font-mono text-ink-primary capitalize">{response.provider}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-ink-secondary">Cached</span>
                          <Badge variant={response.cached ? 'success' : 'outline'} size="xs">
                            {response.cached ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-ink-secondary">Timestamp</span>
                          <span className="font-mono text-ink-primary text-xs">
                            {response.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {!response && !error && !isExecuting && (
                  <div className="flex items-center justify-center h-full text-ink-secondary">
                    <div className="text-center">
                      <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <p>Execute a prompt to see the response</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};