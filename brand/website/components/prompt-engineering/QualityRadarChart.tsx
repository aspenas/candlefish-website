'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';

interface QualityMetrics {
  accuracy: number;
  relevance: number;
  coherence: number;
  completeness: number;
  toxicity: number;
  bias: number;
}

export const QualityRadarChart: React.FC<{ className?: string }> = ({ 
  className = '' 
}) => {
  const [metrics, setMetrics] = useState<QualityMetrics>({
    accuracy: 0.85,
    relevance: 0.92,
    coherence: 0.88,
    completeness: 0.79,
    toxicity: 0.05, // Lower is better
    bias: 0.08, // Lower is better
  });

  const [selectedMetric, setSelectedMetric] = useState<keyof QualityMetrics | null>(null);

  useEffect(() => {
    // Simulate real-time metric updates
    const interval = setInterval(() => {
      setMetrics(prev => ({
        accuracy: Math.max(0, Math.min(1, prev.accuracy + (Math.random() - 0.5) * 0.1)),
        relevance: Math.max(0, Math.min(1, prev.relevance + (Math.random() - 0.5) * 0.1)),
        coherence: Math.max(0, Math.min(1, prev.coherence + (Math.random() - 0.5) * 0.1)),
        completeness: Math.max(0, Math.min(1, prev.completeness + (Math.random() - 0.5) * 0.1)),
        toxicity: Math.max(0, Math.min(1, prev.toxicity + (Math.random() - 0.5) * 0.02)),
        bias: Math.max(0, Math.min(1, prev.bias + (Math.random() - 0.5) * 0.02)),
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const metricLabels = {
    accuracy: 'Accuracy',
    relevance: 'Relevance',
    coherence: 'Coherence',
    completeness: 'Completeness',
    toxicity: 'Toxicity',
    bias: 'Bias',
  };

  const metricDescriptions = {
    accuracy: 'How factually correct the responses are',
    relevance: 'How well responses address the prompt',
    coherence: 'How logically consistent responses are',
    completeness: 'How thoroughly questions are answered',
    toxicity: 'Level of harmful or offensive content (lower is better)',
    bias: 'Presence of unfair bias in responses (lower is better)',
  };

  // Convert metrics to radar chart coordinates
  const centerX = 120;
  const centerY = 120;
  const maxRadius = 100;
  const angleStep = (2 * Math.PI) / Object.keys(metrics).length;

  const getColor = (key: keyof QualityMetrics, value: number) => {
    if (key === 'toxicity' || key === 'bias') {
      // Lower is better for these metrics
      if (value <= 0.1) return '#10b981'; // green
      if (value <= 0.2) return '#f59e0b'; // yellow
      return '#ef4444'; // red
    } else {
      // Higher is better for these metrics
      if (value >= 0.8) return '#10b981'; // green
      if (value >= 0.6) return '#f59e0b'; // yellow
      return '#ef4444'; // red
    }
  };

  const generatePolygonPoints = () => {
    return Object.entries(metrics).map(([key, value], index) => {
      const angle = index * angleStep - Math.PI / 2; // Start from top
      const adjustedValue = (key === 'toxicity' || key === 'bias') ? 1 - value : value; // Invert for negative metrics
      const radius = maxRadius * adjustedValue;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      return { x, y, key: key as keyof QualityMetrics, value };
    });
  };

  const points = generatePolygonPoints();
  const polygonPoints = points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-ink-primary">Quality Metrics</h3>
        <div className="text-sm text-ink-secondary">
          Overall: {(Object.values(metrics).reduce((sum, val, idx) => {
            const adjustedVal = idx >= 4 ? 1 - val : val; // Invert toxicity and bias
            return sum + adjustedVal;
          }, 0) / Object.keys(metrics).length * 100).toFixed(0)}%
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-start space-y-4 lg:space-y-0 lg:space-x-4">
        {/* Radar Chart */}
        <div className="flex-shrink-0">
          <svg width="240" height="240" className="overflow-visible">
            {/* Grid circles */}
            {[0.2, 0.4, 0.6, 0.8, 1.0].map(scale => (
              <circle
                key={scale}
                cx={centerX}
                cy={centerY}
                r={maxRadius * scale}
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="1"
              />
            ))}

            {/* Grid lines */}
            {points.map((_, index) => {
              const angle = index * angleStep - Math.PI / 2;
              const endX = centerX + maxRadius * Math.cos(angle);
              const endY = centerY + maxRadius * Math.sin(angle);
              return (
                <line
                  key={index}
                  x1={centerX}
                  y1={centerY}
                  x2={endX}
                  y2={endY}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
              );
            })}

            {/* Data polygon */}
            <polygon
              points={polygonPoints}
              fill="rgba(59, 130, 246, 0.3)"
              stroke="#3b82f6"
              strokeWidth="2"
            />

            {/* Data points */}
            {points.map((point, index) => (
              <circle
                key={index}
                cx={point.x}
                cy={point.y}
                r="4"
                fill={getColor(point.key, point.value)}
                stroke="white"
                strokeWidth="2"
                className="cursor-pointer hover:r-6 transition-all"
                onMouseEnter={() => setSelectedMetric(point.key)}
                onMouseLeave={() => setSelectedMetric(null)}
              />
            ))}

            {/* Labels */}
            {points.map((point, index) => {
              const angle = index * angleStep - Math.PI / 2;
              const labelRadius = maxRadius + 20;
              const labelX = centerX + labelRadius * Math.cos(angle);
              const labelY = centerY + labelRadius * Math.sin(angle);
              
              return (
                <text
                  key={index}
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-xs fill-current text-ink-secondary"
                >
                  {metricLabels[point.key]}
                </text>
              );
            })}

            {/* Scale labels */}
            {[0.2, 0.4, 0.6, 0.8, 1.0].map(scale => (
              <text
                key={scale}
                x={centerX + maxRadius * scale + 5}
                y={centerY - 5}
                className="text-xs fill-current text-ink-secondary"
              >
                {(scale * 100).toFixed(0)}%
              </text>
            ))}
          </svg>
        </div>

        {/* Metrics List */}
        <div className="flex-1 space-y-2">
          {Object.entries(metrics).map(([key, value]) => {
            const metricKey = key as keyof QualityMetrics;
            const isSelected = selectedMetric === metricKey;
            const displayValue = (metricKey === 'toxicity' || metricKey === 'bias') ? 
              1 - value : value; // Invert display for negative metrics
            
            return (
              <div 
                key={key}
                className={`p-3 rounded border transition-colors cursor-pointer ${
                  isSelected 
                    ? 'border-operation-active bg-operation-active/5' 
                    : 'border-atelier-structure hover:border-operation-active/50'
                }`}
                onMouseEnter={() => setSelectedMetric(metricKey)}
                onMouseLeave={() => setSelectedMetric(null)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-ink-primary">
                    {metricLabels[metricKey]}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span 
                      className="text-sm font-mono"
                      style={{ color: getColor(metricKey, value) }}
                    >
                      {(displayValue * 100).toFixed(1)}%
                    </span>
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: getColor(metricKey, value) }}
                    />
                  </div>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                  <div 
                    className="h-1.5 rounded-full transition-all duration-swift"
                    style={{ 
                      width: `${displayValue * 100}%`,
                      backgroundColor: getColor(metricKey, value)
                    }}
                  />
                </div>
                
                {isSelected && (
                  <p className="text-xs text-ink-secondary">
                    {metricDescriptions[metricKey]}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center space-x-6 mt-4 pt-4 border-t border-atelier-structure text-xs">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-green-500 rounded-full" />
          <span className="text-ink-secondary">Excellent (80%+)</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-yellow-500 rounded-full" />
          <span className="text-ink-secondary">Good (60-80%)</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-red-500 rounded-full" />
          <span className="text-ink-secondary">Needs Improvement (&lt;60%)</span>
        </div>
      </div>
    </Card>
  );
};