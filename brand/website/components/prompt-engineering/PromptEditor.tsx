'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PromptTemplate, ModelConfig, PromptVariable } from '@/lib/prompt-engineering/types';
import { usePromptOptimization } from '@/hooks/usePromptOptimization';

interface PromptEditorProps {
  template: PromptTemplate | null;
  onTemplateChange: (template: PromptTemplate) => void;
  modelConfig: ModelConfig;
  className?: string;
}

interface EditorState {
  content: string;
  variables: Record<string, any>;
  selectedTemplate: string;
  isOptimizing: boolean;
  showVariables: boolean;
  showPreview: boolean;
  wordCount: number;
  tokenCount: number;
}

export const PromptEditor: React.FC<PromptEditorProps> = ({
  template,
  onTemplateChange,
  modelConfig,
  className = '',
}) => {
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const { optimize, isOptimizing, optimization } = usePromptOptimization();

  const [state, setState] = useState<EditorState>({
    content: template?.template || '',
    variables: template?.variables.reduce((acc, variable) => {
      acc[variable.name] = variable.default || '';
      return acc;
    }, {} as Record<string, any>) || {},
    selectedTemplate: template?.id || '',
    isOptimizing: false,
    showVariables: true,
    showPreview: false,
    wordCount: 0,
    tokenCount: 0,
  });

  // Update state when template changes
  useEffect(() => {
    if (template) {
      setState(prev => ({
        ...prev,
        content: template.template,
        variables: template.variables.reduce((acc, variable) => {
          acc[variable.name] = variable.default || '';
          return acc;
        }, {} as Record<string, any>),
        selectedTemplate: template.id,
      }));
    }
  }, [template]);

  // Update word and token count
  useEffect(() => {
    const words = state.content.trim().split(/\s+/).filter(word => word.length > 0);
    const wordCount = words.length;
    // Rough token estimation: ~1.3 tokens per word
    const tokenCount = Math.ceil(wordCount * 1.3);
    
    setState(prev => ({ ...prev, wordCount, tokenCount }));
  }, [state.content]);

  const handleContentChange = (content: string) => {
    setState(prev => ({ ...prev, content }));
    
    if (template) {
      const updatedTemplate = { ...template, template: content };
      onTemplateChange(updatedTemplate);
    }
  };

  const handleVariableChange = (name: string, value: any) => {
    setState(prev => ({
      ...prev,
      variables: { ...prev.variables, [name]: value }
    }));
  };

  const handleOptimize = async () => {
    if (!template) return;
    
    setState(prev => ({ ...prev, isOptimizing: true }));
    try {
      await optimize(template);
    } finally {
      setState(prev => ({ ...prev, isOptimizing: false }));
    }
  };

  const renderPromptPreview = () => {
    let preview = state.content;
    
    // Replace variables in template
    Object.entries(state.variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      preview = preview.replace(regex, String(value || `[${key}]`));
    });

    return preview;
  };

  const renderVariableInput = (variable: PromptVariable) => {
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
            min={variable.validation?.min}
            max={variable.validation?.max}
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
          <Input
            value={value}
            onChange={(e) => handleVariableChange(variable.name, e.target.value)}
            placeholder={variable.description}
          />
        );
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Editor Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-medium text-ink-primary">
            {template?.name || 'Prompt Editor'}
          </h3>
          {template && (
            <Badge variant="outline" size="sm">
              v{template.version}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setState(prev => ({ ...prev, showVariables: !prev.showVariables }))}
          >
            Variables
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setState(prev => ({ ...prev, showPreview: !prev.showPreview }))}
          >
            Preview
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleOptimize}
            disabled={!template || state.isOptimizing}
          >
            {state.isOptimizing ? <LoadingSpinner size="xs" /> : 'Optimize'}
          </Button>
        </div>
      </div>

      {/* Main Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Template Editor */}
        <div className="lg:col-span-2">
          <Card className="h-[600px]">
            <div className="p-4 border-b border-atelier-structure flex items-center justify-between">
              <h4 className="font-medium text-ink-primary">Template Content</h4>
              <div className="flex items-center space-x-4 text-sm text-ink-secondary">
                <span>{state.wordCount} words</span>
                <span>~{state.tokenCount} tokens</span>
              </div>
            </div>
            
            <div className="p-4 h-[calc(100%-73px)]">
              <Textarea
                ref={editorRef}
                value={state.content}
                onChange={(e) => handleContentChange(e.target.value)}
                className="w-full h-full font-mono text-sm resize-none border-0 focus:ring-0"
                placeholder="Enter your prompt template here..."
                style={{
                  fontFamily: 'var(--font-mono, monospace)',
                  lineHeight: 1.5,
                }}
              />
            </div>
          </Card>
        </div>

        {/* Variables Panel */}
        <div className="space-y-4">
          {state.showVariables && template?.variables && template.variables.length > 0 && (
            <Card>
              <div className="p-4 border-b border-atelier-structure">
                <h4 className="font-medium text-ink-primary">Variables</h4>
              </div>
              
              <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
                {template.variables.map((variable) => (
                  <div key={variable.name} className="space-y-2">
                    <label className="block">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-ink-primary">
                          {variable.name}
                        </span>
                        {variable.required && (
                          <Badge variant="warning" size="xs">Required</Badge>
                        )}
                      </div>
                      {renderVariableInput(variable)}
                    </label>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Preview Panel */}
          {state.showPreview && (
            <Card>
              <div className="p-4 border-b border-atelier-structure">
                <h4 className="font-medium text-ink-primary">Preview</h4>
              </div>
              
              <div className="p-4 max-h-96 overflow-y-auto">
                <div className="whitespace-pre-wrap text-sm text-ink-secondary font-mono bg-atelier-structure/10 p-3 rounded">
                  {renderPromptPreview()}
                </div>
              </div>
            </Card>
          )}

          {/* Optimization Results */}
          {optimization && (
            <Card>
              <div className="p-4 border-b border-atelier-structure">
                <h4 className="font-medium text-ink-primary">Optimization</h4>
              </div>
              
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-secondary">Token Reduction</span>
                  <Badge variant="success" size="sm">
                    -{optimization.estimatedSavings.tokenReduction}%
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-secondary">Cost Savings</span>
                  <span className="text-operation-complete font-mono">
                    ${optimization.estimatedSavings.costReduction.toFixed(4)}
                  </span>
                </div>
                
                <div className="pt-3 border-t border-atelier-structure">
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full"
                    onClick={() => handleContentChange(optimization.optimized.template)}
                  >
                    Apply Optimization
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Template Info */}
      {template && (
        <Card className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-ink-secondary">Category</span>
              <div className="font-medium capitalize text-ink-primary">
                {template.category.replace('-', ' ')}
              </div>
            </div>
            <div>
              <span className="text-ink-secondary">Model Compatibility</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {template.modelCompatibility.map(model => (
                  <Badge key={model} variant="outline" size="xs" className="capitalize">
                    {model}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <span className="text-ink-secondary">Usage Count</span>
              <div className="font-mono text-ink-primary">
                {template.metadata.usageCount || 0}
              </div>
            </div>
            <div>
              <span className="text-ink-secondary">Success Rate</span>
              <div className="font-mono text-operation-complete">
                {template.metadata.successRate ? `${Math.round(template.metadata.successRate * 100)}%` : '—'}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};