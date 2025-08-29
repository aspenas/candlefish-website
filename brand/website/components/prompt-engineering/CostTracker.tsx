'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface CostData {
  current: number;
  budget: number;
  percentage: number;
  daily: number;
  weekly: number;
  monthly: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  breakdown: {
    model: string;
    cost: number;
    percentage: number;
  }[];
}

export const CostTracker: React.FC<{ className?: string }> = ({ 
  className = '' 
}) => {
  const [costData, setCostData] = useState<CostData>({
    current: 0,
    budget: 100,
    percentage: 0,
    daily: 0,
    weekly: 0,
    monthly: 0,
    trend: 'stable',
    breakdown: [
      { model: 'Claude Opus', cost: 0, percentage: 0 },
      { model: 'GPT-4o', cost: 0, percentage: 0 },
      { model: 'Claude Sonnet', cost: 0, percentage: 0 },
    ],
  });

  const [showBreakdown, setShowBreakdown] = useState(false);
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  useEffect(() => {
    // Simulate real-time cost updates
    const interval = setInterval(() => {
      setCostData(prev => {
        const increment = Math.random() * 0.05 + 0.001; // $0.001 to $0.051
        const newCurrent = prev.current + increment;
        const newPercentage = (newCurrent / prev.budget) * 100;
        
        // Update breakdown
        const newBreakdown = prev.breakdown.map(item => {
          const modelIncrement = increment * (Math.random() * 0.8 + 0.1); // Distribute cost among models
          return {
            ...item,
            cost: item.cost + modelIncrement,
          };
        });
        
        // Calculate percentages for breakdown
        const totalBreakdownCost = newBreakdown.reduce((sum, item) => sum + item.cost, 0);
        newBreakdown.forEach(item => {
          item.percentage = totalBreakdownCost > 0 ? (item.cost / totalBreakdownCost) * 100 : 0;
        });

        return {
          ...prev,
          current: newCurrent,
          percentage: newPercentage,
          [timeframe]: prev[timeframe] + increment,
          trend: increment > 0.03 ? 'increasing' : increment < 0.01 ? 'decreasing' : 'stable',
          breakdown: newBreakdown,
        };
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [timeframe]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: amount < 1 ? 4 : 2,
      maximumFractionDigits: amount < 1 ? 4 : 2,
    }).format(amount);
  };

  const getCostColor = (percentage: number): string => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getTrendIcon = () => {
    switch (costData.trend) {
      case 'increasing':
        return (
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        );
      case 'decreasing':
        return (
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h8" />
          </svg>
        );
    }
  };

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-ink-secondary">Cost Tracking</h3>
        <div className="flex items-center space-x-1">
          {getTrendIcon()}
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="text-xs"
          >
            Details
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {/* Cost Numbers */}
        <div className="flex items-baseline justify-between">
          <div>
            <span className={`text-2xl font-mono font-bold ${getCostColor(costData.percentage)}`}>
              {formatCurrency(costData.current)}
            </span>
            <span className="text-sm text-ink-secondary ml-1">
              / {formatCurrency(costData.budget)}
            </span>
          </div>
          <div className="text-right">
            <div className="text-lg font-mono font-bold text-ink-primary">
              {costData.percentage.toFixed(1)}%
            </div>
            <div className="text-xs text-ink-secondary capitalize">
              {timeframe} budget
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-swift ${getProgressColor(costData.percentage)}`}
            style={{ width: `${Math.min(costData.percentage, 100)}%` }}
          />
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex space-x-1 bg-atelier-structure/10 rounded p-1">
            {(['daily', 'weekly', 'monthly'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setTimeframe(period)}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  timeframe === period
                    ? 'bg-operation-active text-white'
                    : 'text-ink-secondary hover:text-ink-primary'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
          
          <Badge 
            variant={costData.percentage >= 90 ? 'error' : costData.percentage >= 75 ? 'warning' : 'success'}
            size="xs"
          >
            {costData.percentage >= 90 ? 'Over Budget' : costData.percentage >= 75 ? 'High Usage' : 'On Track'}
          </Badge>
        </div>

        {/* Cost Breakdown */}
        {showBreakdown && (
          <div className="space-y-2 pt-2 border-t border-atelier-structure">
            <h4 className="text-xs font-medium text-ink-primary mb-2">Cost by Model</h4>
            {costData.breakdown.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: `hsl(${index * 120}, 60%, 50%)` }}
                  />
                  <span className="text-ink-secondary">{item.model}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-ink-primary font-mono">
                    {formatCurrency(item.cost)}
                  </span>
                  <span className="text-ink-secondary w-8 text-right">
                    {item.percentage.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Period Summary */}
        <div className="grid grid-cols-3 gap-2 text-xs text-center pt-2 border-t border-atelier-structure">
          <div>
            <div className="text-ink-secondary">Daily</div>
            <div className="font-mono text-ink-primary">{formatCurrency(costData.daily)}</div>
          </div>
          <div>
            <div className="text-ink-secondary">Weekly</div>
            <div className="font-mono text-ink-primary">{formatCurrency(costData.weekly)}</div>
          </div>
          <div>
            <div className="text-ink-secondary">Monthly</div>
            <div className="font-mono text-ink-primary">{formatCurrency(costData.monthly)}</div>
          </div>
        </div>

        {/* Warning for high costs */}
        {costData.percentage >= 85 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-xs">
            <div className="flex items-center space-x-1">
              <svg className="w-3 h-3 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              <span className="text-yellow-800">
                {costData.percentage >= 100 ? 'Budget exceeded!' : 'Approaching budget limit'}
              </span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};