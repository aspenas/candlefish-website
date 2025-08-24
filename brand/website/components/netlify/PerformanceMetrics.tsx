'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { PerformanceMetricsProps, PerformanceMetrics } from '../../types/netlify';
import { cn } from '../../utils/cn';

const PerformanceMetricsComponent: React.FC<PerformanceMetricsProps> = ({
  data,
  timeRange,
  onTimeRangeChange,
}) => {
  const [activeMetric, setActiveMetric] = useState<'vitals' | 'build' | 'traffic'>('vitals');

  // Get latest metrics for current display
  const latestMetrics = useMemo(() => {
    if (!data.length) return null;
    return data[data.length - 1];
  }, [data]);

  // Calculate trends
  const trends = useMemo(() => {
    if (data.length < 2) return {};
    
    const current = data[data.length - 1];
    const previous = data[data.length - 2];
    
    const calculateTrend = (currentVal: number, previousVal: number) => {
      const change = ((currentVal - previousVal) / previousVal) * 100;
      return {
        value: change,
        direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral' as const,
        isGood: false // Will be set based on metric type
      };
    };

    return {
      lcp: { ...calculateTrend(current.metrics.lcp, previous.metrics.lcp), isGood: current.metrics.lcp < previous.metrics.lcp },
      fid: { ...calculateTrend(current.metrics.fid, previous.metrics.fid), isGood: current.metrics.fid < previous.metrics.fid },
      cls: { ...calculateTrend(current.metrics.cls, previous.metrics.cls), isGood: current.metrics.cls < previous.metrics.cls },
      buildTime: { ...calculateTrend(current.metrics.buildTime, previous.metrics.buildTime), isGood: current.metrics.buildTime < previous.metrics.buildTime },
      bundleSize: { ...calculateTrend(current.metrics.bundleSize, previous.metrics.bundleSize), isGood: current.metrics.bundleSize < previous.metrics.bundleSize },
      uniqueVisitors: { ...calculateTrend(current.metrics.uniqueVisitors, previous.metrics.uniqueVisitors), isGood: current.metrics.uniqueVisitors > previous.metrics.uniqueVisitors },
    };
  }, [data]);

  const formatMetric = (value: number, unit: string = '', decimals: number = 0) => {
    if (value < 1000 || unit === '%') {
      return `${value.toFixed(decimals)}${unit}`;
    }
    if (value < 1000000) {
      return `${(value / 1000).toFixed(1)}k${unit}`;
    }
    return `${(value / 1000000).toFixed(1)}M${unit}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-operation-complete';
    if (score >= 70) return 'text-operation-pending';
    return 'text-operation-alert';
  };

  const getTrendIcon = (trend: { direction: 'up' | 'down' | 'neutral', isGood: boolean }) => {
    if (trend.direction === 'neutral') return '→';
    if (trend.direction === 'up') return trend.isGood ? '↗' : '↗';
    return trend.isGood ? '↘' : '↘';
  };

  const getTrendColor = (trend: { direction: 'up' | 'down' | 'neutral', isGood: boolean }) => {
    if (trend.direction === 'neutral') return 'text-light-tertiary';
    return trend.isGood ? 'text-operation-complete' : 'text-operation-alert';
  };

  if (!latestMetrics) {
    return (
      <Card className="card-operational">
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="text-4xl opacity-20 mb-4">📊</div>
            <p className="text-light-secondary">No performance data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="type-display text-light-primary mb-1">
            Performance Metrics
          </h2>
          <p className="text-sm text-light-secondary">
            Real-time performance monitoring and insights
          </p>
        </div>

        <div className="flex items-center gap-2">
          {['1h', '24h', '7d', '30d'].map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => onTimeRangeChange(range)}
              className={cn(
                'text-xs px-3 py-1',
                timeRange === range
                  ? 'bg-operation-active text-depth-void'
                  : 'border-interface-border/30 text-light-secondary hover:border-operation-active/50'
              )}
            >
              {range}
            </Button>
          ))}
        </div>
      </div>

      {/* Metric Category Tabs */}
      <div className="flex gap-2 p-1 bg-depth-ocean/20 rounded border border-interface-border/20">
        {[
          { key: 'vitals', label: 'Core Web Vitals', icon: '⚡' },
          { key: 'build', label: 'Build Performance', icon: '🔧' },
          { key: 'traffic', label: 'Traffic & Usage', icon: '📊' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveMetric(tab.key as typeof activeMetric)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded text-sm transition-all',
              activeMetric === tab.key
                ? 'bg-operation-active text-depth-void font-medium'
                : 'text-light-secondary hover:text-operation-active hover:bg-operation-active/10'
            )}
          >
            <span>{tab.icon}</span>
            <span className="uppercase tracking-wide">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Core Web Vitals */}
      {activeMetric === 'vitals' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Lighthouse Scores */}
          <Card className="card-operational col-span-full">
            <CardHeader>
              <CardTitle className="text-light-primary text-lg">Lighthouse Scores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-6">
                {[
                  { key: 'performance', label: 'Performance', value: latestMetrics.scores.performance },
                  { key: 'accessibility', label: 'Accessibility', value: latestMetrics.scores.accessibility },
                  { key: 'bestPractices', label: 'Best Practices', value: latestMetrics.scores.bestPractices },
                  { key: 'seo', label: 'SEO', value: latestMetrics.scores.seo }
                ].map((score) => (
                  <div key={score.key} className="text-center">
                    <div className={cn(
                      'text-3xl font-mono mb-2',
                      getScoreColor(score.value)
                    )}>
                      {score.value}
                    </div>
                    <div className="text-xs text-light-tertiary uppercase tracking-wide">
                      {score.label}
                    </div>
                    <div className="w-full bg-depth-steel/30 rounded-full h-1 mt-2">
                      <div 
                        className={cn(
                          'h-1 rounded-full transition-all duration-500',
                          score.value >= 90 ? 'bg-operation-complete' : 
                          score.value >= 70 ? 'bg-operation-pending' : 'bg-operation-alert'
                        )}
                        style={{ width: `${score.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Core Web Vitals Metrics */}
          {[
            { 
              key: 'lcp', 
              label: 'Largest Contentful Paint', 
              value: latestMetrics.metrics.lcp, 
              unit: 'ms',
              threshold: { good: 2500, poor: 4000 }
            },
            { 
              key: 'fid', 
              label: 'First Input Delay', 
              value: latestMetrics.metrics.fid, 
              unit: 'ms',
              threshold: { good: 100, poor: 300 }
            },
            { 
              key: 'cls', 
              label: 'Cumulative Layout Shift', 
              value: latestMetrics.metrics.cls, 
              unit: '',
              threshold: { good: 0.1, poor: 0.25 }
            },
            { 
              key: 'ttfb', 
              label: 'Time to First Byte', 
              value: latestMetrics.metrics.ttfb, 
              unit: 'ms',
              threshold: { good: 800, poor: 1800 }
            }
          ].map((metric) => {
            const trend = trends[metric.key as keyof typeof trends];
            const isGood = metric.value <= metric.threshold.good;
            const isPoor = metric.value >= metric.threshold.poor;
            
            return (
              <Card key={metric.key} className="card-operational">
                <CardContent className="p-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <div className={cn(
                        'text-2xl font-mono',
                        isGood ? 'text-operation-complete' : 
                        isPoor ? 'text-operation-alert' : 'text-operation-pending'
                      )}>
                        {formatMetric(metric.value, metric.unit, metric.unit === '' ? 3 : 0)}
                      </div>
                      {trend && (
                        <div className={cn('text-sm', getTrendColor(trend))}>
                          {getTrendIcon(trend)}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-light-tertiary uppercase tracking-wide mb-2">
                      {metric.label}
                    </div>
                    <Badge 
                      variant={isGood ? 'default' : isPoor ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {isGood ? 'GOOD' : isPoor ? 'POOR' : 'NEEDS IMPROVEMENT'}
                    </Badge>
                    {trend && (
                      <div className="text-xs text-light-tertiary mt-1">
                        {Math.abs(trend.value).toFixed(1)}% vs previous
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Build Performance */}
      {activeMetric === 'build' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              key: 'buildTime',
              label: 'Build Time',
              value: latestMetrics.metrics.buildTime,
              unit: 's',
              icon: '⏱️'
            },
            {
              key: 'bundleSize',
              label: 'Bundle Size',
              value: latestMetrics.metrics.bundleSize,
              unit: 'KB',
              icon: '📦'
            },
            {
              key: 'functionInvocations',
              label: 'Function Invocations',
              value: latestMetrics.metrics.functionInvocations,
              unit: '',
              icon: '⚡'
            },
            {
              key: 'functionErrors',
              label: 'Function Errors',
              value: latestMetrics.metrics.functionErrors,
              unit: '',
              icon: '🚨'
            },
            {
              key: 'functionDuration',
              label: 'Avg Function Duration',
              value: latestMetrics.metrics.functionDuration,
              unit: 'ms',
              icon: '⏲️'
            }
          ].map((metric) => {
            const trend = trends[metric.key as keyof typeof trends];
            
            return (
              <Card key={metric.key} className="card-operational">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl opacity-60">
                      {metric.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="text-lg font-mono text-light-primary">
                          {formatMetric(metric.value, metric.unit)}
                        </div>
                        {trend && (
                          <div className={cn('text-sm', getTrendColor(trend))}>
                            {getTrendIcon(trend)}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-light-tertiary uppercase tracking-wide">
                        {metric.label}
                      </div>
                      {trend && (
                        <div className="text-xs text-light-tertiary">
                          {Math.abs(trend.value).toFixed(1)}% vs previous
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Traffic & Usage */}
      {activeMetric === 'traffic' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              key: 'uniqueVisitors',
              label: 'Unique Visitors',
              value: latestMetrics.metrics.uniqueVisitors,
              unit: '',
              icon: '👥'
            },
            {
              key: 'pageViews',
              label: 'Page Views',
              value: latestMetrics.metrics.pageViews,
              unit: '',
              icon: '👁️'
            },
            {
              key: 'bounceRate',
              label: 'Bounce Rate',
              value: latestMetrics.metrics.bounceRate,
              unit: '%',
              icon: '📈'
            }
          ].map((metric) => {
            const trend = trends[metric.key as keyof typeof trends];
            
            return (
              <Card key={metric.key} className="card-operational">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl opacity-60">
                      {metric.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="text-lg font-mono text-light-primary">
                          {formatMetric(metric.value, metric.unit)}
                        </div>
                        {trend && (
                          <div className={cn('text-sm', getTrendColor(trend))}>
                            {getTrendIcon(trend)}
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-light-tertiary uppercase tracking-wide">
                        {metric.label}
                      </div>
                      {trend && (
                        <div className="text-xs text-light-tertiary">
                          {Math.abs(trend.value).toFixed(1)}% vs previous
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Last Updated */}
      <div className="text-center text-xs text-light-tertiary">
        Last updated: {new Date(latestMetrics.timestamp).toLocaleString()}
      </div>
    </div>
  );
};

export default PerformanceMetricsComponent;