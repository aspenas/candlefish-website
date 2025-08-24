'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { RecommendationEngineProps, ExtensionRecommendation } from '../../types/netlify';
import { cn } from '../../utils/cn';

const RecommendationEngine: React.FC<RecommendationEngineProps> = ({
  recommendations,
  onApplyRecommendation,
  loading = false,
}) => {
  const [appliedRecommendations, setAppliedRecommendations] = useState<Set<string>>(new Set());
  const [applyingRecommendation, setApplyingRecommendation] = useState<string | null>(null);
  const [expandedRecommendation, setExpandedRecommendation] = useState<string | null>(null);

  const handleApplyRecommendation = async (recommendation: ExtensionRecommendation) => {
    setApplyingRecommendation(recommendation.extension.id);
    try {
      await onApplyRecommendation(recommendation);
      setAppliedRecommendations(prev => new Set([...prev, recommendation.extension.id]));
    } finally {
      setApplyingRecommendation(null);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-operation-complete bg-operation-complete/10 border-operation-complete/30';
    if (confidence >= 0.6) return 'text-operation-pending bg-operation-pending/10 border-operation-pending/30';
    return 'text-operation-alert bg-operation-alert/10 border-operation-alert/30';
  };

  const getImpactColor = (impact: number) => {
    if (impact > 20) return 'text-operation-complete';
    if (impact > 0) return 'text-operation-pending';
    if (impact < -10) return 'text-operation-alert';
    return 'text-light-secondary';
  };

  const getImpactIcon = (impact: number) => {
    if (impact > 20) return '🚀';
    if (impact > 0) return '📈';
    if (impact < -10) return '⚠️';
    return '→';
  };

  const formatSetupTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const getCategoryIcon = (category: string) => {
    const iconMap = {
      performance: '⚡',
      security: '🛡️',
      seo: '📊',
      analytics: '📈',
      forms: '📝',
      edge: '🌐'
    };
    return iconMap[category as keyof typeof iconMap] || '🔧';
  };

  if (loading) {
    return (
      <Card className="card-operational">
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-operation-active border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-light-secondary uppercase tracking-wide text-sm">
              Analyzing Site Performance...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card className="card-operational">
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="text-4xl opacity-20 mb-4">🎯</div>
            <h3 className="type-title text-light-primary mb-2">
              No Recommendations Available
            </h3>
            <p className="text-light-secondary">
              Your site is already optimized with the best extensions for your current setup.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort recommendations by confidence and potential impact
  const sortedRecommendations = [...recommendations].sort((a, b) => {
    const aScore = a.confidence * 0.6 + (Math.max(...Object.values(a.potentialImpact)) / 100) * 0.4;
    const bScore = b.confidence * 0.6 + (Math.max(...Object.values(b.potentialImpact)) / 100) * 0.4;
    return bScore - aScore;
  });

  const highConfidenceCount = recommendations.filter(r => r.confidence >= 0.8).length;
  const mediumConfidenceCount = recommendations.filter(r => r.confidence >= 0.6 && r.confidence < 0.8).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="type-display text-light-primary mb-1">
            AI Recommendations
          </h2>
          <div className="flex items-center gap-4 text-sm text-light-secondary">
            <span className="status-active">
              {highConfidenceCount} High Confidence
            </span>
            <span className="text-operation-pending">
              {mediumConfidenceCount} Medium Confidence
            </span>
            <span className="text-light-tertiary">
              {recommendations.length} Total
            </span>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <Card className="card-operational border-operation-active/30">
        <CardHeader>
          <CardTitle className="text-light-primary text-lg flex items-center gap-2">
            <span>🎯</span>
            Optimization Opportunities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['performance', 'security', 'seo', 'userExperience'].map((category) => {
              const avgImpact = recommendations.reduce((acc, rec) => 
                acc + rec.potentialImpact[category as keyof typeof rec.potentialImpact], 0
              ) / recommendations.length;
              
              return (
                <div key={category} className="text-center">
                  <div className={cn(
                    'text-2xl font-mono mb-1',
                    getImpactColor(avgImpact)
                  )}>
                    {avgImpact > 0 ? '+' : ''}{avgImpact.toFixed(0)}%
                  </div>
                  <div className="text-xs text-light-tertiary uppercase tracking-wide">
                    {category === 'userExperience' ? 'UX' : category}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations List */}
      <div className="space-y-4">
        {sortedRecommendations.map((recommendation, index) => {
          const isApplied = appliedRecommendations.has(recommendation.extension.id);
          const isApplying = applyingRecommendation === recommendation.extension.id;
          const isExpanded = expandedRecommendation === recommendation.extension.id;
          const maxImpact = Math.max(...Object.values(recommendation.potentialImpact));

          return (
            <Card
              key={recommendation.extension.id}
              className={cn(
                'card-operational transition-all',
                isApplied && 'border-operation-complete/50 bg-operation-complete/5',
                index === 0 && 'border-operation-active/50' // Highlight top recommendation
              )}
            >
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="text-2xl opacity-60">
                        {recommendation.extension.icon || getCategoryIcon(recommendation.extension.category)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-light-primary font-medium">
                            {recommendation.extension.name}
                          </h3>
                          {index === 0 && (
                            <Badge className="text-xs bg-operation-active/20 text-operation-active border-operation-active/30">
                              TOP PICK
                            </Badge>
                          )}
                          <Badge 
                            className={cn('text-xs border', getConfidenceColor(recommendation.confidence))}
                          >
                            {(recommendation.confidence * 100).toFixed(0)}% CONFIDENCE
                          </Badge>
                        </div>
                        <p className="text-sm text-light-secondary mb-2">
                          {recommendation.extension.description}
                        </p>
                        <div className="text-xs text-light-tertiary uppercase tracking-wide">
                          {recommendation.extension.category} • v{recommendation.extension.version}
                        </div>
                      </div>
                    </div>

                    <div className="text-right ml-4">
                      <div className={cn(
                        'text-lg font-mono mb-1',
                        getImpactColor(maxImpact)
                      )}>
                        {getImpactIcon(maxImpact)} {maxImpact > 0 ? '+' : ''}{maxImpact}%
                      </div>
                      <div className="text-xs text-light-tertiary">
                        Max Impact
                      </div>
                    </div>
                  </div>

                  {/* Reasoning */}
                  <div className="p-3 rounded bg-depth-steel/20 border-l-2 border-operation-active/30">
                    <div className="text-sm text-light-secondary">
                      <strong className="text-light-primary">Why this matters:</strong>{' '}
                      {recommendation.reasoning}
                    </div>
                  </div>

                  {/* Impact Breakdown */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(recommendation.potentialImpact).map(([key, value]) => (
                      <div key={key} className="text-center">
                        <div className={cn(
                          'text-sm font-mono mb-1',
                          getImpactColor(value)
                        )}>
                          {value > 0 ? '+' : ''}{value}%
                        </div>
                        <div className="text-xs text-light-tertiary uppercase tracking-wide">
                          {key === 'userExperience' ? 'UX' : key}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="pt-4 border-t border-interface-border/20 space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-light-tertiary uppercase tracking-wide text-xs mb-1">
                            Setup Time
                          </div>
                          <div className="text-light-primary">
                            {formatSetupTime(recommendation.estimatedSetupTime)}
                          </div>
                        </div>
                        <div>
                          <div className="text-light-tertiary uppercase tracking-wide text-xs mb-1">
                            Performance Impact
                          </div>
                          <div className={cn(
                            'text-sm',
                            recommendation.extension.performance.impact === 'low' ? 'text-operation-complete' :
                            recommendation.extension.performance.impact === 'medium' ? 'text-operation-pending' : 'text-operation-alert'
                          )}>
                            {recommendation.extension.performance.impact.toUpperCase()}
                          </div>
                        </div>
                      </div>

                      {recommendation.extension.documentation && (
                        <div className="flex gap-3 text-xs">
                          {recommendation.extension.documentation.setupUrl && (
                            <a
                              href={recommendation.extension.documentation.setupUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-operation-active hover:text-interface-hover transition-colors uppercase tracking-wide"
                            >
                              Setup Guide
                            </a>
                          )}
                          {recommendation.extension.documentation.apiUrl && (
                            <a
                              href={recommendation.extension.documentation.apiUrl}
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
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-3">
                      {!isApplied ? (
                        <Button
                          onClick={() => handleApplyRecommendation(recommendation)}
                          loading={isApplying}
                          disabled={isApplying}
                          className="bg-operation-active text-depth-void hover:bg-interface-hover"
                        >
                          {isApplying ? 'Installing...' : 'Install Extension'}
                        </Button>
                      ) : (
                        <Badge className="bg-operation-complete/20 text-operation-complete border-operation-complete/30">
                          ✓ INSTALLED
                        </Badge>
                      )}
                      
                      <button
                        onClick={() => setExpandedRecommendation(
                          isExpanded ? null : recommendation.extension.id
                        )}
                        className="text-xs text-light-tertiary hover:text-operation-active transition-colors uppercase tracking-wide"
                      >
                        {isExpanded ? 'Less Details' : 'More Details'}
                      </button>
                    </div>

                    <div className="text-xs text-light-tertiary">
                      by {recommendation.extension.provider}
                    </div>
                  </div>
                </div>
              </CardContent>

              {/* Loading Overlay */}
              {isApplying && (
                <div className="absolute inset-0 bg-depth-void/50 backdrop-blur-sm flex items-center justify-center rounded">
                  <div className="flex items-center gap-3 text-sm text-light-primary">
                    <div className="w-4 h-4 border-2 border-operation-active border-t-transparent rounded-full animate-spin" />
                    <span className="uppercase tracking-wide">
                      Installing Extension...
                    </span>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-light-tertiary">
        Recommendations powered by ML analysis of your site's performance, traffic patterns, and current stack.
      </div>
    </div>
  );
};

export default RecommendationEngine;