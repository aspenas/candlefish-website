'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface TokenUsageData {
  current: number;
  limit: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  resetTime: Date;
  cost: number;
}

export const TokenUsageWidget: React.FC<{ className?: string }> = ({ 
  className = '' 
}) => {
  const [tokenData, setTokenData] = useState<TokenUsageData>({
    current: 0,
    limit: 100000,
    percentage: 0,
    trend: 'stable',
    resetTime: new Date(Date.now() + 3600000), // 1 hour from now
    cost: 0,
  });

  useEffect(() => {
    // Simulate real-time token usage updates
    const interval = setInterval(() => {
      setTokenData(prev => {
        const increment = Math.floor(Math.random() * 50) + 10;
        const newCurrent = Math.min(prev.current + increment, prev.limit);
        const newPercentage = (newCurrent / prev.limit) * 100;
        
        return {
          ...prev,
          current: newCurrent,
          percentage: newPercentage,
          trend: increment > 30 ? 'up' : increment < 20 ? 'down' : 'stable',
          cost: prev.cost + (increment * 0.000015), // Rough cost calculation
        };
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toFixed(0);
  };

  const getUsageColor = (percentage: number): string => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const timeUntilReset = Math.max(0, tokenData.resetTime.getTime() - Date.now());
  const hoursUntilReset = Math.floor(timeUntilReset / (1000 * 60 * 60));
  const minutesUntilReset = Math.floor((timeUntilReset % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-ink-secondary">Token Usage</h3>
        <div className="flex items-center space-x-1">
          {tokenData.trend === 'up' && (
            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
            </svg>
          )}
          {tokenData.trend === 'down' && (
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-9.2 9.2M7 7v10h10" />
            </svg>
          )}
          {tokenData.trend === 'stable' && (
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h8" />
            </svg>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {/* Usage Numbers */}
        <div className="flex items-baseline justify-between">
          <div>
            <span className={`text-2xl font-mono font-bold ${getUsageColor(tokenData.percentage)}`}>
              {formatNumber(tokenData.current)}
            </span>
            <span className="text-sm text-ink-secondary ml-1">
              / {formatNumber(tokenData.limit)}
            </span>
          </div>
          <div className="text-right">
            <div className="text-lg font-mono font-bold text-ink-primary">
              {tokenData.percentage.toFixed(1)}%
            </div>
            <div className="text-xs text-ink-secondary">
              ${tokenData.cost.toFixed(4)}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-swift ${getProgressColor(tokenData.percentage)}`}
              style={{ width: `${Math.min(tokenData.percentage, 100)}%` }}
            />
          </div>
          
          {/* Usage Segments */}
          <div className="flex justify-between text-xs text-ink-secondary">
            <span>0</span>
            <span>25K</span>
            <span>50K</span>
            <span>75K</span>
            <span>100K</span>
          </div>
        </div>

        {/* Status and Reset Time */}
        <div className="flex items-center justify-between text-xs">
          <Badge 
            variant={tokenData.percentage >= 90 ? 'error' : tokenData.percentage >= 75 ? 'warning' : 'success'}
            size="xs"
          >
            {tokenData.percentage >= 90 ? 'Critical' : tokenData.percentage >= 75 ? 'High' : 'Normal'}
          </Badge>
          
          <span className="text-ink-secondary">
            Resets in {hoursUntilReset}h {minutesUntilReset}m
          </span>
        </div>

        {/* Warning for high usage */}
        {tokenData.percentage >= 85 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-xs">
            <div className="flex items-center space-x-1">
              <svg className="w-3 h-3 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-yellow-800">
                {tokenData.percentage >= 95 ? 'Rate limit approaching' : 'High token usage'}
              </span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};