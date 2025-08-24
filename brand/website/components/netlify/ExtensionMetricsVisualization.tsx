'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Extension, PerformanceMetrics, NetlifySite } from '../../types/netlify';
import { netlifyApi, handleApiError } from '../../lib/netlify-api';
import { cn } from '../../utils/cn';

interface MetricsDataPoint {
  timestamp: Date;
  extensionId: string;
  extensionName: string;
  metrics: {
    usage: number;
    errors: number;
    averageResponseTime: number;
    memoryUsage: number;
    cpuUsage: number;
    bundleSize: number;
    cacheHitRate: number;
  };
  performance: {
    lcp: number;
    fid: number;
    cls: number;
    fcp: number;
    ttfb: number;
  };
  scores: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
}

interface ChartConfig {
  type: 'line' | 'bar' | 'area';
  metric: keyof MetricsDataPoint['metrics'] | keyof MetricsDataPoint['performance'] | keyof MetricsDataPoint['scores'];
  label: string;
  color: string;
  unit: string;
  format: (value: number) => string;
}

interface ExtensionMetricsVisualizationProps {
  selectedSite: NetlifySite | null;
  extensions: Extension[];
  timeRange: '1h' | '24h' | '7d' | '30d';
  onTimeRangeChange: (range: string) => void;
  className?: string;
}

const chartConfigs: Record<string, ChartConfig> = {
  usage: {
    type: 'line',
    metric: 'usage',
    label: 'Usage Count',
    color: 'rgb(var(--operation-active))',
    unit: 'requests',
    format: (value) => value.toLocaleString()
  },
  errors: {
    type: 'bar',
    metric: 'errors',
    label: 'Error Rate',
    color: 'rgb(var(--operation-alert))',
    unit: 'errors',
    format: (value) => value.toLocaleString()
  },
  responseTime: {
    type: 'area',
    metric: 'averageResponseTime',
    label: 'Response Time',
    color: 'rgb(var(--operation-processing))',
    unit: 'ms',
    format: (value) => `${value.toFixed(0)}ms`
  },
  lcp: {
    type: 'line',
    metric: 'lcp',
    label: 'Largest Contentful Paint',
    color: 'rgb(var(--interface-focus))',
    unit: 'ms',
    format: (value) => `${(value / 1000).toFixed(1)}s`
  },
  performanceScore: {
    type: 'line',
    metric: 'performance',
    label: 'Performance Score',
    color: 'rgb(var(--operation-complete))',
    unit: 'score',
    format: (value) => `${value}/100`
  },
  bundleSize: {
    type: 'bar',
    metric: 'bundleSize',
    label: 'Bundle Size',
    color: 'rgb(var(--color-copper))',
    unit: 'KB',
    format: (value) => `${(value / 1024).toFixed(1)} KB`
  }
};

// Simple SVG Chart Component
interface SimpleChartProps {
  data: MetricsDataPoint[];
  config: ChartConfig;
  width?: number;
  height?: number;
  selectedExtensions: Set<string>;
  className?: string;
}

const SimpleChart: React.FC<SimpleChartProps> = ({
  data,
  config,
  width = 400,
  height = 200,
  selectedExtensions,
  className
}) => {
  const chartData = useMemo(() => {
    const filteredData = data.filter(d => selectedExtensions.size === 0 || selectedExtensions.has(d.extensionId));

    if (filteredData.length === 0) return { points: [], maxValue: 0, minValue: 0 };

    const values = filteredData.map(d => {
      if (config.metric in d.metrics) {
        return (d.metrics as any)[config.metric];
      } else if (config.metric in d.performance) {
        return (d.performance as any)[config.metric];
      } else if (config.metric in d.scores) {
        return (d.scores as any)[config.metric];
      }
      return 0;
    });

    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    const range = maxValue - minValue || 1;

    const groupedByExtension = filteredData.reduce((acc, point) => {
      if (!acc[point.extensionId]) {
        acc[point.extensionId] = {
          name: point.extensionName,
          points: []
        };
      }

      const value = config.metric in point.metrics
        ? (point.metrics as any)[config.metric]
        : config.metric in point.performance
        ? (point.performance as any)[config.metric]
        : (point.scores as any)[config.metric];

      acc[point.extensionId].points.push({
        x: point.timestamp.getTime(),
        y: value,
        normalizedY: ((value - minValue) / range) * (height - 40) + 20
      });
      return acc;
    }, {} as Record<string, { name: string; points: Array<{ x: number; y: number; normalizedY: number }> }>);

    return {
      groupedByExtension,
      maxValue,
      minValue,
      range,
      timeRange: {
        start: Math.min(...filteredData.map(d => d.timestamp.getTime())),
        end: Math.max(...filteredData.map(d => d.timestamp.getTime()))
      }
    };
  }, [data, config.metric, selectedExtensions, height]);

  if (!chartData.groupedByExtension || Object.keys(chartData.groupedByExtension).length === 0) {
    return (
      <div className={cn('flex items-center justify-center', className)} style={{ width, height }}>
        <div className="text-center">
          <div className="text-4xl opacity-20 mb-2">📊</div>
          <p className="text-sm text-light-secondary">No data available</p>
        </div>
      </div>
    );
  }

  const colors = [
    'rgb(var(--operation-active))',
    'rgb(var(--operation-processing))',
    'rgb(var(--interface-focus))',
    'rgb(var(--color-copper))',
    'rgb(var(--operation-complete))',
    'rgb(var(--operation-alert))'
  ];

  return (
    <div className={cn('relative', className)}>
      <svg width={width} height={height} className="bg-depth-ocean/5 rounded border border-interface-border/20">
        {/* Grid lines */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgb(var(--interface-border))" strokeWidth="0.5" opacity="0.3"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Y-axis labels */}
        <g>
          {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
            const y = height - 20 - ratio * (height - 40);
            const value = chartData.minValue + ratio * chartData.range;
            return (
              <g key={ratio}>
                <line x1="30" y1={y} x2={width - 20} y2={y} stroke="rgb(var(--interface-border))" strokeWidth="0.5" opacity="0.5" />
                <text x="25" y={y + 4} fontSize="10" fill="rgb(var(--light-secondary))" textAnchor="end">
                  {config.format(value)}
                </text>
              </g>
            );
          })}
        </g>

        {/* Chart lines/areas/bars */}
        {Object.entries(chartData.groupedByExtension).map(([extensionId, extensionData], index) => {
          const color = colors[index % colors.length];
          const points = extensionData.points;

          if (points.length === 0) return null;

          if (config.type === 'line') {
            const pathData = points
              .map((point, i) => {
                const x = 40 + ((point.x - chartData.timeRange.start) / (chartData.timeRange.end - chartData.timeRange.start)) * (width - 60);
                const y = height - point.normalizedY;
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
              })
              .join(' ');

            return (
              <g key={extensionId}>
                <path
                  d={pathData}
                  stroke={color}
                  strokeWidth="2"
                  fill="none"
                  opacity="0.8"
                />
                {/* Data points */}
                {points.map((point, i) => {
                  const x = 40 + ((point.x - chartData.timeRange.start) / (chartData.timeRange.end - chartData.timeRange.start)) * (width - 60);
                  const y = height - point.normalizedY;
                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r="3"
                      fill={color}
                      opacity="0.8"
                    />
                  );
                })}
              </g>
            );
          } else if (config.type === 'bar') {
            return (
              <g key={extensionId}>
                {points.map((point, i) => {
                  const x = 40 + ((point.x - chartData.timeRange.start) / (chartData.timeRange.end - chartData.timeRange.start)) * (width - 60);
                  const y = height - point.normalizedY;
                  const barHeight = point.normalizedY - 20;
                  const barWidth = Math.max(2, (width - 60) / points.length - 2);

                  return (
                    <rect
                      key={i}
                      x={x - barWidth / 2}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      fill={color}
                      opacity="0.7"
                    />
                  );
                })}
              </g>
            );
          } else if (config.type === 'area') {
            const pathData = points
              .map((point, i) => {
                const x = 40 + ((point.x - chartData.timeRange.start) / (chartData.timeRange.end - chartData.timeRange.start)) * (width - 60);
                const y = height - point.normalizedY;
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
              })
              .join(' ');

            const areaPath = `${pathData} L ${40 + (width - 60)} ${height - 20} L 40 ${height - 20} Z`;

            return (
              <g key={extensionId}>
                <path
                  d={areaPath}
                  fill={color}
                  opacity="0.2"
                />
                <path
                  d={pathData}
                  stroke={color}
                  strokeWidth="2"
                  fill="none"
                  opacity="0.8"
                />
              </g>
            );
          }

          return null;
        })}
      </svg>
    </div>
  );
};

const ExtensionMetricsVisualization: React.FC<ExtensionMetricsVisualizationProps> = ({
  selectedSite,
  extensions,
  timeRange,
  onTimeRangeChange,
  className
}) => {
  const [metricsData, setMetricsData] = useState<MetricsDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string>('usage');
  const [selectedExtensions, setSelectedExtensions] = useState<Set<string>>(new Set());
  const [showComparison, setShowComparison] = useState(false);

  // Mock data generation
  const generateMockMetrics = useCallback(async (): Promise<MetricsDataPoint[]> => {
    if (!selectedSite || extensions.length === 0) return [];

    const now = new Date();
    const timeRangeMs = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    }[timeRange];

    const interval = timeRangeMs / 50; // 50 data points
    const dataPoints: MetricsDataPoint[] = [];

    for (let i = 0; i < 50; i++) {
      const timestamp = new Date(now.getTime() - timeRangeMs + (i * interval));

      for (const extension of extensions.slice(0, 5)) { // Limit to 5 extensions for clarity
        const baseUsage = 1000 + Math.random() * 500;
        const timeVariation = Math.sin((i / 50) * Math.PI * 2) * 100;
        const randomVariation = (Math.random() - 0.5) * 50;

        dataPoints.push({
          timestamp,
          extensionId: extension.id,
          extensionName: extension.name,
          metrics: {
            usage: Math.max(0, baseUsage + timeVariation + randomVariation),
            errors: Math.floor(Math.random() * 10),
            averageResponseTime: 200 + Math.random() * 300,
            memoryUsage: 50 + Math.random() * 100,
            cpuUsage: 10 + Math.random() * 40,
            bundleSize: extension.performance.bundleSize || (100 + Math.random() * 200),
            cacheHitRate: 0.8 + Math.random() * 0.2
          },
          performance: {
            lcp: 2000 + Math.random() * 2000,
            fid: 50 + Math.random() * 100,
            cls: Math.random() * 0.3,
            fcp: 1000 + Math.random() * 1000,
            ttfb: 100 + Math.random() * 400
          },
          scores: {
            performance: 70 + Math.random() * 30,
            accessibility: 80 + Math.random() * 20,
            bestPractices: 75 + Math.random() * 25,
            seo: 85 + Math.random() * 15
          }
        });
      }
    }

    return dataPoints;
  }, [selectedSite, extensions, timeRange]);

  // Load metrics data
  useEffect(() => {
    if (!selectedSite) return;

    const loadMetrics = async () => {
      setLoading(true);
      setError(null);

      try {
        // In a real implementation, this would call the actual API
        const data = await generateMockMetrics();
        setMetricsData(data);
      } catch (err) {
        setError(handleApiError(err));
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
  }, [selectedSite, timeRange, generateMockMetrics]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (metricsData.length === 0) return null;

    const recent = metricsData.slice(-10); // Last 10 data points
    const previous = metricsData.slice(-20, -10); // Previous 10 data points

    const calculateAvg = (data: MetricsDataPoint[], metric: string) => {
      const values = data.map(d => {
        if (metric in d.metrics) return (d.metrics as any)[metric];
        if (metric in d.performance) return (d.performance as any)[metric];
        if (metric in d.scores) return (d.scores as any)[metric];
        return 0;
      });
      return values.reduce((a, b) => a + b, 0) / values.length;
    };

    const currentAvg = calculateAvg(recent, selectedMetric);
    const previousAvg = calculateAvg(previous, selectedMetric);
    const change = previousAvg !== 0 ? ((currentAvg - previousAvg) / previousAvg) * 100 : 0;

    return {
      current: currentAvg,
      previous: previousAvg,
      change,
      trend: change > 5 ? 'up' : change < -5 ? 'down' : 'stable'
    };
  }, [metricsData, selectedMetric]);

  const handleExtensionToggle = (extensionId: string) => {
    setSelectedExtensions(prev => {
      const next = new Set(prev);
      if (next.has(extensionId)) {
        next.delete(extensionId);
      } else {
        next.add(extensionId);
      }
      return next;
    });
  };

  if (!selectedSite) {
    return (
      <Card className="card-operational">
        <CardContent className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="text-6xl opacity-20 mb-6">📊</div>
            <h3 className="type-title text-light-primary mb-4">Select a Site</h3>
            <p className="text-light-secondary">
              Choose a site from the site selector to view extension metrics and performance data.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="mb-8">
        <h2 className="type-title text-light-primary mb-2">Extension Metrics</h2>
        <p className="text-light-secondary">
          Performance metrics and analytics for extensions deployed on {selectedSite.name}.
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <Card className="card-operational border-operation-alert/50 bg-operation-alert/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-operation-alert text-xl">⚠️</div>
                <div>
                  <h3 className="text-operation-alert font-medium mb-1">Metrics Error</h3>
                  <p className="text-sm text-light-secondary">{error}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setError(null)}
                className="border-operation-alert/30 text-operation-alert hover:bg-operation-alert/10"
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Metric Selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-light-secondary">Metric:</label>
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="p-2 bg-depth-ocean/20 border border-interface-border/30 rounded text-light-primary focus:border-operation-active focus:outline-none"
          >
            <optgroup label="Usage">
              <option value="usage">Usage Count</option>
              <option value="errors">Error Rate</option>
              <option value="responseTime">Response Time</option>
            </optgroup>
            <optgroup label="Performance">
              <option value="lcp">Largest Contentful Paint</option>
              <option value="performanceScore">Performance Score</option>
              <option value="bundleSize">Bundle Size</option>
            </optgroup>
          </select>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-light-secondary">Time Range:</label>
          <div className="flex border border-interface-border/30 rounded">
            {(['1h', '24h', '7d', '30d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => onTimeRangeChange(range)}
                className={cn(
                  'px-3 py-1 text-sm transition-colors',
                  timeRange === range
                    ? 'bg-operation-active text-depth-void'
                    : 'text-light-secondary hover:text-operation-active hover:bg-operation-active/10'
                )}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Comparison Toggle */}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showComparison}
            onChange={(e) => setShowComparison(e.target.checked)}
            className="w-4 h-4 text-operation-active bg-depth-ocean/20 border-interface-border/30 rounded focus:ring-operation-active focus:ring-2"
          />
          <span className="text-sm text-light-secondary">Show Comparison</span>
        </label>
      </div>

      {/* Extension Filter */}
      <Card className="card-operational">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-light-secondary">Filter Extensions</h3>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedExtensions(new Set(extensions.map(e => e.id)))}
                className="border-interface-border/30 text-light-secondary hover:bg-interface-border/10"
              >
                Select All
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedExtensions(new Set())}
                className="border-interface-border/30 text-light-secondary hover:bg-interface-border/10"
              >
                Clear
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {extensions.map(extension => (
              <label key={extension.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedExtensions.has(extension.id)}
                  onChange={() => handleExtensionToggle(extension.id)}
                  className="w-4 h-4 text-operation-active bg-depth-ocean/20 border-interface-border/30 rounded focus:ring-operation-active focus:ring-2"
                />
                <Badge className="bg-depth-ocean/30 text-light-secondary border-interface-border/30">
                  {extension.name}
                </Badge>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {summaryStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="card-operational">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-medium text-operation-active">
                    {chartConfigs[selectedMetric]?.format(summaryStats.current) || summaryStats.current.toFixed(1)}
                  </div>
                  <div className="text-sm text-light-secondary">Current Average</div>
                </div>
                <div className="text-2xl">📊</div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-operational">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className={cn(
                    'text-2xl font-medium',
                    summaryStats.change > 0 ? 'text-operation-complete' :
                    summaryStats.change < 0 ? 'text-operation-alert' : 'text-light-primary'
                  )}>
                    {summaryStats.change >= 0 ? '+' : ''}{summaryStats.change.toFixed(1)}%
                  </div>
                  <div className="text-sm text-light-secondary">Change</div>
                </div>
                <div className="text-2xl">
                  {summaryStats.trend === 'up' ? '📈' : summaryStats.trend === 'down' ? '📉' : '📊'}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-operational">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-medium text-interface-focus">
                    {selectedExtensions.size || extensions.length}
                  </div>
                  <div className="text-sm text-light-secondary">Extensions Tracked</div>
                </div>
                <div className="text-2xl">🔧</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Chart */}
      <Card className="card-operational">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="type-subtitle text-light-primary">
              {chartConfigs[selectedMetric]?.label || 'Metrics'} Over Time
            </h3>
            {loading && <LoadingSpinner size="sm" />}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <LoadingSpinner size="lg" />
              <span className="ml-3 text-light-secondary">Loading metrics data...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <SimpleChart
                data={metricsData}
                config={chartConfigs[selectedMetric]}
                width={800}
                height={300}
                selectedExtensions={selectedExtensions}
                className="mx-auto"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparison Table */}
      {showComparison && metricsData.length > 0 && (
        <Card className="card-operational">
          <CardContent className="p-6">
            <h3 className="type-subtitle text-light-primary mb-4">Extension Comparison</h3>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-interface-border/30">
                    <th className="text-left py-2 text-light-secondary">Extension</th>
                    <th className="text-right py-2 text-light-secondary">Current</th>
                    <th className="text-right py-2 text-light-secondary">Average</th>
                    <th className="text-right py-2 text-light-secondary">Peak</th>
                    <th className="text-right py-2 text-light-secondary">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {extensions
                    .filter(ext => selectedExtensions.size === 0 || selectedExtensions.has(ext.id))
                    .map(extension => {
                      const extData = metricsData.filter(d => d.extensionId === extension.id);
                      if (extData.length === 0) return null;

                      const values = extData.map(d => {
                        if (selectedMetric in d.metrics) return (d.metrics as any)[selectedMetric];
                        if (selectedMetric in d.performance) return (d.performance as any)[selectedMetric];
                        if (selectedMetric in d.scores) return (d.scores as any)[selectedMetric];
                        return 0;
                      });

                      const current = values[values.length - 1];
                      const average = values.reduce((a, b) => a + b, 0) / values.length;
                      const peak = Math.max(...values);
                      const change = values.length > 1
                        ? ((current - values[values.length - 2]) / values[values.length - 2]) * 100
                        : 0;

                      return (
                        <tr key={extension.id} className="border-b border-interface-border/10">
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-light-primary">{extension.name}</span>
                              <Badge className="bg-depth-ocean/30 text-light-tertiary border-light-tertiary/30 text-xs">
                                {extension.category}
                              </Badge>
                            </div>
                          </td>
                          <td className="text-right py-3 text-light-primary font-medium">
                            {chartConfigs[selectedMetric]?.format(current)}
                          </td>
                          <td className="text-right py-3 text-light-secondary">
                            {chartConfigs[selectedMetric]?.format(average)}
                          </td>
                          <td className="text-right py-3 text-operation-processing">
                            {chartConfigs[selectedMetric]?.format(peak)}
                          </td>
                          <td className={cn(
                            'text-right py-3 font-medium',
                            change > 0 ? 'text-operation-complete' :
                            change < 0 ? 'text-operation-alert' : 'text-light-secondary'
                          )}>
                            {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ExtensionMetricsVisualization;
