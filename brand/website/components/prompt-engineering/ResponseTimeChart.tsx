'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface DataPoint {
  timestamp: Date;
  responseTime: number;
  model: string;
  success: boolean;
}

export const ResponseTimeChart: React.FC<{ className?: string }> = ({ 
  className = '' 
}) => {
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h'>('1h');
  const [selectedModel, setSelectedModel] = useState<string>('all');

  const models = ['claude-opus-4-1-20250805', 'gpt-4o', 'claude-sonnet-3-5-20241022'];
  const modelColors = {
    'claude-opus-4-1-20250805': '#3b82f6',
    'gpt-4o': '#10b981',
    'claude-sonnet-3-5-20241022': '#f59e0b',
  };

  useEffect(() => {
    // Generate initial data points
    const now = new Date();
    const hoursBack = timeRange === '1h' ? 1 : timeRange === '6h' ? 6 : 24;
    const points: DataPoint[] = [];
    
    const intervalMinutes = timeRange === '1h' ? 2 : timeRange === '6h' ? 10 : 30;
    const totalPoints = (hoursBack * 60) / intervalMinutes;
    
    for (let i = totalPoints; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * intervalMinutes * 60 * 1000);
      const model = models[Math.floor(Math.random() * models.length)];
      const baseTime = model === 'claude-opus-4-1-20250805' ? 2500 : 
                       model === 'gpt-4o' ? 1800 : 1200;
      
      points.push({
        timestamp,
        responseTime: baseTime + Math.random() * 1500,
        model,
        success: Math.random() > 0.05, // 95% success rate
      });
    }
    
    setDataPoints(points);
  }, [timeRange]);

  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      const now = new Date();
      const model = models[Math.floor(Math.random() * models.length)];
      const baseTime = model === 'claude-opus-4-1-20250805' ? 2500 : 
                       model === 'gpt-4o' ? 1800 : 1200;
      
      const newPoint: DataPoint = {
        timestamp: now,
        responseTime: baseTime + Math.random() * 1500,
        model,
        success: Math.random() > 0.05,
      };

      setDataPoints(prev => {
        const updated = [...prev, newPoint];
        const hoursBack = timeRange === '1h' ? 1 : timeRange === '6h' ? 6 : 24;
        const cutoff = new Date(now.getTime() - hoursBack * 60 * 60 * 1000);
        return updated.filter(point => point.timestamp >= cutoff);
      });
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [timeRange]);

  const filteredData = selectedModel === 'all' ? 
    dataPoints : 
    dataPoints.filter(point => point.model === selectedModel);

  const stats = {
    avg: filteredData.length > 0 ? 
      filteredData.reduce((sum, p) => sum + p.responseTime, 0) / filteredData.length : 0,
    min: filteredData.length > 0 ? 
      Math.min(...filteredData.map(p => p.responseTime)) : 0,
    max: filteredData.length > 0 ? 
      Math.max(...filteredData.map(p => p.responseTime)) : 0,
    p95: filteredData.length > 0 ? 
      filteredData.sort((a, b) => a.responseTime - b.responseTime)[Math.floor(filteredData.length * 0.95)]?.responseTime || 0 : 0,
    successRate: filteredData.length > 0 ? 
      filteredData.filter(p => p.success).length / filteredData.length : 0,
  };

  // Chart dimensions
  const chartWidth = 300;
  const chartHeight = 150;
  const padding = 20;

  const getChartCoordinates = () => {
    if (filteredData.length === 0) return [];

    const timeExtent = [
      Math.min(...filteredData.map(d => d.timestamp.getTime())),
      Math.max(...filteredData.map(d => d.timestamp.getTime())),
    ];
    
    const responseTimeExtent = [0, Math.max(...filteredData.map(d => d.responseTime))];

    return filteredData.map(point => ({
      ...point,
      x: padding + ((point.timestamp.getTime() - timeExtent[0]) / (timeExtent[1] - timeExtent[0])) * (chartWidth - 2 * padding),
      y: chartHeight - padding - ((point.responseTime - responseTimeExtent[0]) / (responseTimeExtent[1] - responseTimeExtent[0])) * (chartHeight - 2 * padding),
    }));
  };

  const chartPoints = getChartCoordinates();

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-ink-primary">Response Times</h3>
        
        <div className="flex items-center space-x-2">
          {/* Time Range Selector */}
          <div className="flex space-x-1 bg-atelier-structure/10 rounded p-1">
            {(['1h', '6h', '24h'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  timeRange === range
                    ? 'bg-operation-active text-white'
                    : 'text-ink-secondary hover:text-ink-primary'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          {/* Model Selector */}
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="px-2 py-1 text-xs border border-atelier-structure rounded bg-atelier-canvas"
          >
            <option value="all">All Models</option>
            {models.map(model => (
              <option key={model} value={model}>
                {model.includes('claude') ? 'Claude' : model.includes('gpt') ? 'GPT' : 'Other'}
                {model.includes('opus') ? ' Opus' : model.includes('sonnet') ? ' Sonnet' : model.includes('4o') ? '-4o' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="text-center">
          <div className="text-xs text-ink-secondary">Average</div>
          <div className="text-sm font-mono text-ink-primary">
            {stats.avg.toFixed(0)}ms
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-ink-secondary">P95</div>
          <div className="text-sm font-mono text-ink-primary">
            {stats.p95.toFixed(0)}ms
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-ink-secondary">Min/Max</div>
          <div className="text-sm font-mono text-ink-primary">
            {stats.min.toFixed(0)}/{stats.max.toFixed(0)}ms
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-ink-secondary">Success Rate</div>
          <Badge variant="success" size="sm">
            {(stats.successRate * 100).toFixed(1)}%
          </Badge>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-atelier-structure/5 rounded p-4">
        {chartPoints.length > 0 ? (
          <svg width="100%" height={chartHeight} className="overflow-visible">
            {/* Grid lines */}
            {[0.25, 0.5, 0.75].map(fraction => (
              <line
                key={fraction}
                x1={padding}
                y1={chartHeight - padding - (chartHeight - 2 * padding) * fraction}
                x2={chartWidth - padding}
                y2={chartHeight - padding - (chartHeight - 2 * padding) * fraction}
                stroke="#e5e7eb"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
            ))}

            {/* Data points grouped by model */}
            {Object.entries(modelColors).map(([model, color]) => {
              const modelPoints = chartPoints.filter(p => p.model === model);
              if (selectedModel !== 'all' && selectedModel !== model) return null;
              
              return (
                <g key={model}>
                  {/* Line */}
                  {modelPoints.length > 1 && (
                    <path
                      d={`M ${modelPoints.map(p => `${p.x},${p.y}`).join(' L ')}`}
                      fill="none"
                      stroke={color}
                      strokeWidth="2"
                      opacity="0.7"
                    />
                  )}
                  
                  {/* Points */}
                  {modelPoints.map((point, index) => (
                    <circle
                      key={index}
                      cx={point.x}
                      cy={point.y}
                      r={point.success ? "3" : "4"}
                      fill={point.success ? color : "#ef4444"}
                      stroke="white"
                      strokeWidth="1"
                      className="hover:r-5 transition-all cursor-pointer"
                      title={`${point.model}: ${point.responseTime.toFixed(0)}ms at ${point.timestamp.toLocaleTimeString()}`}
                    />
                  ))}
                </g>
              );
            })}

            {/* Y-axis labels */}
            <text x="5" y={chartHeight - padding + 5} className="text-xs fill-current text-ink-secondary">0ms</text>
            <text x="5" y={padding + 5} className="text-xs fill-current text-ink-secondary">{stats.max.toFixed(0)}ms</text>
            
            {/* X-axis labels */}
            <text x={padding} y={chartHeight - 5} className="text-xs fill-current text-ink-secondary">
              {timeRange}
            </text>
            <text x={chartWidth - padding} y={chartHeight - 5} className="text-xs fill-current text-ink-secondary text-end">
              now
            </text>
          </svg>
        ) : (
          <div className="flex items-center justify-center h-32 text-ink-secondary">
            <div className="text-center">
              <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-xs">No data available</p>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      {selectedModel === 'all' && (
        <div className="flex items-center justify-center space-x-4 mt-3 text-xs">
          {Object.entries(modelColors).map(([model, color]) => (
            <div key={model} className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-ink-secondary">
                {model.includes('claude') ? 'Claude' : model.includes('gpt') ? 'GPT' : 'Other'}
                {model.includes('opus') ? ' Opus' : model.includes('sonnet') ? ' Sonnet' : model.includes('4o') ? '-4o' : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};