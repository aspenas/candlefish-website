'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ExtensionCardProps, Extension } from '../../types/netlify';
import { cn } from '../../utils/cn';

const ExtensionCard: React.FC<ExtensionCardProps> = ({
  extension,
  isEnabled,
  onToggle,
  onConfigure,
  showImpact = false,
  impact,
}) => {
  const [isToggling, setIsToggling] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = async () => {
    setIsToggling(true);
    try {
      await onToggle(extension.id, !isEnabled);
    } finally {
      setIsToggling(false);
    }
  };

  const getPerformanceImpactColor = (impact: Extension['performance']['impact']) => {
    switch (impact) {
      case 'low': return 'text-operation-complete';
      case 'medium': return 'text-operation-pending';
      case 'high': return 'text-operation-alert';
      default: return 'text-light-secondary';
    }
  };

  const getCategoryIcon = (category: Extension['category']) => {
    const iconMap = {
      performance: '⚡',
      security: '🛡️',
      seo: '📊',
      analytics: '📈',
      forms: '📝',
      edge: '🌐'
    };
    return iconMap[category] || '🔧';
  };

  const formatMetric = (value: number, suffix: string = '') => {
    if (value < 1000) return `${value}${suffix}`;
    if (value < 1000000) return `${(value / 1000).toFixed(1)}k${suffix}`;
    return `${(value / 1000000).toFixed(1)}M${suffix}`;
  };

  return (
    <Card 
      className={cn(
        'card-operational transition-all duration-300 relative overflow-hidden group',
        isEnabled && 'border-operation-active/50 bg-operation-active/5',
        'hover:border-operation-active/70'
      )}
    >
      {/* Status Indicator */}
      <div className={cn(
        'absolute top-0 left-0 w-1 h-full transition-all duration-300',
        isEnabled ? 'bg-operation-active' : 'bg-light-tertiary/30'
      )} />

      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="text-2xl opacity-60 group-hover:opacity-100 transition-opacity">
              {extension.icon || getCategoryIcon(extension.category)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="type-title text-light-primary font-medium truncate">
                  {extension.name}
                </h3>
                <Badge 
                  variant={isEnabled ? 'default' : 'secondary'}
                  className={cn(
                    'text-xs px-2 py-1',
                    isEnabled 
                      ? 'bg-operation-active/10 text-operation-active border-operation-active/30' 
                      : 'bg-light-tertiary/10 text-light-tertiary border-light-tertiary/30'
                  )}
                >
                  {isEnabled ? 'ACTIVE' : 'INACTIVE'}
                </Badge>
              </div>
              <p className="text-sm text-light-secondary mb-2 line-clamp-2">
                {extension.description}
              </p>
              <div className="flex items-center gap-3 text-xs text-light-tertiary">
                <span className="uppercase tracking-wide">
                  {extension.category}
                </span>
                <span>v{extension.version}</span>
                <span className={getPerformanceImpactColor(extension.performance.impact)}>
                  {extension.performance.impact.toUpperCase()} IMPACT
                </span>
              </div>
            </div>
          </div>

          {/* Toggle Switch */}
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={handleToggle}
              disabled={isToggling}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-operation-active focus:ring-offset-2',
                isEnabled 
                  ? 'bg-operation-active' 
                  : 'bg-light-tertiary/20 border border-light-tertiary/30'
              )}
              aria-label={`Toggle ${extension.name}`}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full transition-transform',
                  'bg-light-primary shadow-sm',
                  isEnabled ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Performance Metrics */}
        {(isEnabled || showImpact) && (
          <div className="grid grid-cols-3 gap-4 mb-4 p-3 rounded bg-depth-ocean/30 border border-interface-border/20">
            <div className="text-center">
              <div className="text-lg font-mono text-operation-active">
                {extension.performance.loadTime}ms
              </div>
              <div className="text-xs text-light-tertiary uppercase tracking-wide">
                Load Time
              </div>
            </div>
            {extension.performance.bundleSize && (
              <div className="text-center">
                <div className="text-lg font-mono text-operation-processing">
                  {formatMetric(extension.performance.bundleSize, 'KB')}
                </div>
                <div className="text-xs text-light-tertiary uppercase tracking-wide">
                  Bundle Size
                </div>
              </div>
            )}
            {extension.metrics && (
              <div className="text-center">
                <div className="text-lg font-mono text-operation-complete">
                  {extension.metrics.usage}
                </div>
                <div className="text-xs text-light-tertiary uppercase tracking-wide">
                  Usage
                </div>
              </div>
            )}
          </div>
        )}

        {/* Impact Visualization */}
        {showImpact && impact && (
          <div className="mb-4 p-3 rounded bg-depth-steel/20 border border-operation-active/20">
            <div className="text-sm text-light-primary mb-2 font-medium">
              Deployment Impact
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <div className={cn(
                  'font-mono',
                  impact.impact.performance > 0 ? 'text-operation-complete' : 'text-operation-alert'
                )}>
                  {impact.impact.performance > 0 ? '+' : ''}{impact.impact.performance}%
                </div>
                <div className="text-light-tertiary">Performance</div>
              </div>
              <div className="text-center">
                <div className={cn(
                  'font-mono',
                  impact.impact.buildTime < 0 ? 'text-operation-complete' : 'text-operation-alert'
                )}>
                  {impact.impact.buildTime > 0 ? '+' : ''}{impact.impact.buildTime}%
                </div>
                <div className="text-light-tertiary">Build Time</div>
              </div>
              <div className="text-center">
                <div className={cn(
                  'font-mono',
                  impact.impact.bundleSize < 0 ? 'text-operation-complete' : 'text-operation-alert'
                )}>
                  {impact.impact.bundleSize > 0 ? '+' : ''}{formatMetric(Math.abs(impact.impact.bundleSize), 'KB')}
                </div>
                <div className="text-light-tertiary">Bundle</div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isEnabled && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onConfigure(extension.id)}
                className="text-xs px-3 py-1 border-interface-border/30 text-light-secondary hover:border-operation-active/50 hover:text-operation-active"
              >
                Configure
              </Button>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-light-tertiary hover:text-operation-active transition-colors uppercase tracking-wide"
            >
              {isExpanded ? 'Less' : 'Details'}
            </button>
          </div>

          {/* Provider info */}
          <div className="text-xs text-light-tertiary">
            by {extension.provider}
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-interface-border/20">
            <div className="space-y-3">
              {extension.metrics && extension.metrics.lastUsed && (
                <div>
                  <span className="text-xs text-light-tertiary uppercase tracking-wide">
                    Last Used:
                  </span>
                  <span className="ml-2 text-sm text-light-secondary">
                    {new Date(extension.metrics.lastUsed).toLocaleDateString()}
                  </span>
                </div>
              )}
              
              {extension.metrics && extension.metrics.errors > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-light-tertiary uppercase tracking-wide">
                    Errors:
                  </span>
                  <Badge variant="destructive" className="text-xs">
                    {extension.metrics.errors}
                  </Badge>
                </div>
              )}

              {extension.documentation && (
                <div className="flex gap-3 text-xs">
                  {extension.documentation.setupUrl && (
                    <a
                      href={extension.documentation.setupUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-operation-active hover:text-interface-hover transition-colors uppercase tracking-wide"
                    >
                      Setup Guide
                    </a>
                  )}
                  {extension.documentation.apiUrl && (
                    <a
                      href={extension.documentation.apiUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-operation-active hover:text-interface-hover transition-colors uppercase tracking-wide"
                    >
                      API Docs
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>

      {/* Loading Overlay */}
      {isToggling && (
        <div className="absolute inset-0 bg-depth-void/50 backdrop-blur-sm flex items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-light-primary">
            <div className="w-4 h-4 border-2 border-operation-active border-t-transparent rounded-full animate-spin" />
            <span className="uppercase tracking-wide">
              {isEnabled ? 'Disabling' : 'Enabling'}
            </span>
          </div>
        </div>
      )}

      {/* Noise texture overlay for operational aesthetic */}
      <div className="noise-overlay absolute inset-0 pointer-events-none opacity-10" />
    </Card>
  );
};

export default ExtensionCard;