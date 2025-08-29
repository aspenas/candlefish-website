'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { ModelConfig, ModelProvider } from '@/lib/prompt-engineering/types';
import { useModelStatus } from '@/hooks/useModelStatus';

interface ModelSelectorProps {
  value: ModelConfig;
  onChange: (config: ModelConfig) => void;
  className?: string;
}

interface ModelOption {
  provider: ModelProvider;
  model: string;
  displayName: string;
  description: string;
  maxTokens: number;
  costPer1KTokens: number;
  speedRating: 1 | 2 | 3 | 4 | 5; // 1 = slowest, 5 = fastest
  qualityRating: 1 | 2 | 3 | 4 | 5; // 1 = lowest, 5 = highest
  recommended?: boolean;
  features: string[];
}

const MODEL_OPTIONS: ModelOption[] = [
  {
    provider: 'anthropic',
    model: 'claude-opus-4-1-20250805',
    displayName: 'Claude Opus 4.1',
    description: 'Most capable model for complex reasoning and analysis',
    maxTokens: 200000,
    costPer1KTokens: 0.015,
    speedRating: 3,
    qualityRating: 5,
    recommended: true,
    features: ['Long context', 'Code analysis', 'Complex reasoning', 'Multimodal'],
  },
  {
    provider: 'anthropic',
    model: 'claude-sonnet-3-5-20241022',
    displayName: 'Claude Sonnet 3.5',
    description: 'Balanced performance and efficiency',
    maxTokens: 200000,
    costPer1KTokens: 0.003,
    speedRating: 4,
    qualityRating: 4,
    features: ['Fast response', 'Code generation', 'Analysis'],
  },
  {
    provider: 'openai',
    model: 'gpt-4o',
    displayName: 'GPT-4o',
    description: 'Latest GPT model with multimodal capabilities',
    maxTokens: 128000,
    costPer1KTokens: 0.005,
    speedRating: 4,
    qualityRating: 4,
    features: ['Multimodal', 'Fast', 'Code generation'],
  },
  {
    provider: 'openai',
    model: 'gpt-4-turbo',
    displayName: 'GPT-4 Turbo',
    description: 'High-performance model for complex tasks',
    maxTokens: 128000,
    costPer1KTokens: 0.010,
    speedRating: 3,
    qualityRating: 4,
    features: ['Long context', 'Code analysis', 'Complex reasoning'],
  },
  {
    provider: 'together',
    model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
    displayName: 'Llama 3.1 70B',
    description: 'Open source model with strong performance',
    maxTokens: 32000,
    costPer1KTokens: 0.0009,
    speedRating: 5,
    qualityRating: 3,
    features: ['Fast', 'Cost-effective', 'Open source'],
  },
  {
    provider: 'together',
    model: 'mistralai/Mistral-7B-Instruct-v0.1',
    displayName: 'Mistral 7B',
    description: 'Lightweight model for simple tasks',
    maxTokens: 32000,
    costPer1KTokens: 0.0002,
    speedRating: 5,
    qualityRating: 2,
    features: ['Very fast', 'Very low cost', 'Simple tasks'],
  }
];

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  value,
  onChange,
  className = '',
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { modelStatus } = useModelStatus();

  const currentModel = MODEL_OPTIONS.find(
    m => m.provider === value.provider && m.model === value.model
  );

  const handleModelSelect = (option: ModelOption) => {
    const newConfig: ModelConfig = {
      ...value,
      provider: option.provider,
      model: option.model,
      maxTokens: Math.min(option.maxTokens, value.maxTokens || 4000),
    };
    onChange(newConfig);
  };

  const handleParameterChange = (parameter: keyof ModelConfig, newValue: any) => {
    onChange({
      ...value,
      [parameter]: newValue,
    });
  };

  const renderRatingStars = (rating: number, maxRating: number = 5) => {
    return (
      <div className="flex items-center space-x-1">
        {Array.from({ length: maxRating }).map((_, i) => (
          <svg
            key={i}
            className={`w-3 h-3 ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  };

  return (
    <Card className={className}>
      <div className="p-4 border-b border-atelier-structure">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-ink-primary">Model Configuration</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            Advanced
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Current Model Display */}
        {currentModel && (
          <div className="bg-atelier-structure/10 rounded p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-medium text-ink-primary flex items-center space-x-2">
                  <span>{currentModel.displayName}</span>
                  {currentModel.recommended && (
                    <Badge variant="success" size="xs">Recommended</Badge>
                  )}
                </h4>
                <p className="text-sm text-ink-secondary mt-1">
                  {currentModel.description}
                </p>
              </div>
              <Badge 
                variant={modelStatus.available ? 'success' : 'error'}
                size="sm"
              >
                {modelStatus.available ? 'Online' : 'Offline'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm mt-3">
              <div>
                <span className="text-ink-secondary">Speed:</span>
                <div className="flex items-center space-x-1 mt-1">
                  {renderRatingStars(currentModel.speedRating)}
                </div>
              </div>
              <div>
                <span className="text-ink-secondary">Quality:</span>
                <div className="flex items-center space-x-1 mt-1">
                  {renderRatingStars(currentModel.qualityRating)}
                </div>
              </div>
              <div>
                <span className="text-ink-secondary">Max Tokens:</span>
                <div className="font-mono text-ink-primary">
                  {currentModel.maxTokens.toLocaleString()}
                </div>
              </div>
              <div>
                <span className="text-ink-secondary">Cost per 1K:</span>
                <div className="font-mono text-ink-primary">
                  ${currentModel.costPer1KTokens.toFixed(4)}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-1 mt-3">
              {currentModel.features.map((feature) => (
                <Badge key={feature} variant="outline" size="xs">
                  {feature}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Model Selection Grid */}
        <div>
          <h4 className="font-medium text-ink-primary mb-3">Available Models</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {MODEL_OPTIONS.map((option) => {
              const isSelected = option.provider === value.provider && option.model === value.model;
              
              return (
                <button
                  key={`${option.provider}-${option.model}`}
                  onClick={() => handleModelSelect(option)}
                  className={`w-full text-left p-3 rounded border transition-colors ${
                    isSelected
                      ? 'border-operation-active bg-operation-active/10'
                      : 'border-atelier-structure hover:border-operation-active/50 hover:bg-atelier-structure/10'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-ink-primary">
                          {option.displayName}
                        </span>
                        {option.recommended && (
                          <Badge variant="success" size="xs">Recommended</Badge>
                        )}
                        <Badge variant="outline" size="xs" className="capitalize">
                          {option.provider}
                        </Badge>
                      </div>
                      <p className="text-xs text-ink-secondary mb-2">
                        {option.description}
                      </p>
                      <div className="flex items-center space-x-4 text-xs">
                        <div className="flex items-center space-x-1">
                          <span className="text-ink-secondary">Speed:</span>
                          {renderRatingStars(option.speedRating)}
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-ink-secondary">Quality:</span>
                          {renderRatingStars(option.qualityRating)}
                        </div>
                        <span className="text-ink-secondary">
                          ${option.costPer1KTokens.toFixed(4)}/1K
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Advanced Parameters */}
        {showAdvanced && (
          <div className="space-y-4 pt-4 border-t border-atelier-structure">
            <h4 className="font-medium text-ink-primary">Parameters</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Max Tokens */}
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-2">
                  Max Tokens
                </label>
                <Input
                  type="number"
                  value={value.maxTokens || 4000}
                  onChange={(e) => handleParameterChange('maxTokens', parseInt(e.target.value))}
                  min={1}
                  max={currentModel?.maxTokens || 200000}
                  className="font-mono"
                />
                <p className="text-xs text-ink-secondary mt-1">
                  Maximum tokens in response
                </p>
              </div>

              {/* Temperature */}
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-2">
                  Temperature
                </label>
                <Input
                  type="number"
                  value={value.temperature || 0.3}
                  onChange={(e) => handleParameterChange('temperature', parseFloat(e.target.value))}
                  min={0}
                  max={2}
                  step={0.1}
                  className="font-mono"
                />
                <p className="text-xs text-ink-secondary mt-1">
                  Randomness in responses (0-2)
                </p>
              </div>

              {/* Top P */}
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-2">
                  Top P
                </label>
                <Input
                  type="number"
                  value={value.topP || 1}
                  onChange={(e) => handleParameterChange('topP', parseFloat(e.target.value))}
                  min={0}
                  max={1}
                  step={0.05}
                  className="font-mono"
                />
                <p className="text-xs text-ink-secondary mt-1">
                  Nucleus sampling (0-1)
                </p>
              </div>

              {/* Frequency Penalty */}
              <div>
                <label className="block text-sm font-medium text-ink-secondary mb-2">
                  Frequency Penalty
                </label>
                <Input
                  type="number"
                  value={value.frequencyPenalty || 0}
                  onChange={(e) => handleParameterChange('frequencyPenalty', parseFloat(e.target.value))}
                  min={-2}
                  max={2}
                  step={0.1}
                  className="font-mono"
                />
                <p className="text-xs text-ink-secondary mt-1">
                  Reduce repetition (-2 to 2)
                </p>
              </div>
            </div>

            {/* Timeout */}
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-2">
                Timeout (seconds)
              </label>
              <Input
                type="number"
                value={value.timeout || 30}
                onChange={(e) => handleParameterChange('timeout', parseInt(e.target.value))}
                min={5}
                max={300}
                className="font-mono"
              />
              <p className="text-xs text-ink-secondary mt-1">
                Request timeout in seconds
              </p>
            </div>
          </div>
        )}

        {/* Cost Estimation */}
        <div className="bg-atelier-structure/5 rounded p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-secondary">Estimated cost per request:</span>
            <span className="font-mono text-ink-primary">
              ${currentModel ? ((value.maxTokens || 4000) * currentModel.costPer1KTokens / 1000).toFixed(4) : '—'}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};