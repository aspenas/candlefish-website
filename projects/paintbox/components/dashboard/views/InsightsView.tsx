/**
 * Insights View Component
 *
 * System insights, recommendations, and performance analysis
 */

'use client';

import React from 'react';
import { useDashboard } from '@/lib/context/DashboardContext';
import { SystemHealthScore } from '../components/SystemHealthScore';
import { RecommendationsList } from '../components/RecommendationsList';
import { AlertSeverity } from '@/lib/types/dashboard';
import { cn } from '@/lib/utils';

export function InsightsView() {
  const { state } = useDashboard();
  const { systemAnalysis, loading } = state;

  if (loading.analysis) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!systemAnalysis) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            No Analysis Available
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            System analysis data is not available at this time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          System Insights
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          AI-powered analysis and recommendations for your system
        </p>
      </div>

      {/* Health Score and Recommendations */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <SystemHealthScore analysis={systemAnalysis} />
        <RecommendationsList
          recommendations={systemAnalysis.recommendations}
          showAll={true}
        />
      </div>

      {/* Performance Insights */}
      {systemAnalysis.performanceInsights.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Performance Insights
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {systemAnalysis.performanceInsights.map((insight, index) => (
              <div
                key={index}
                className={cn(
                  'p-6 rounded-lg border-l-4 bg-white dark:bg-gray-800',
                  insight.severity === AlertSeverity.CRITICAL && 'border-red-500 bg-red-50 dark:bg-red-900/10',
                  insight.severity === AlertSeverity.HIGH && 'border-orange-500 bg-orange-50 dark:bg-orange-900/10',
                  insight.severity === AlertSeverity.MEDIUM && 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10',
                  insight.severity === AlertSeverity.LOW && 'border-blue-500 bg-blue-50 dark:bg-blue-900/10'
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    {insight.title}
                  </h3>
                  <span className={cn(
                    'px-2 py-1 text-xs font-medium rounded-full',
                    insight.severity === AlertSeverity.CRITICAL && 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200',
                    insight.severity === AlertSeverity.HIGH && 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-200',
                    insight.severity === AlertSeverity.MEDIUM && 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200',
                    insight.severity === AlertSeverity.LOW && 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200'
                  )}>
                    {insight.severity.toLowerCase()}
                  </span>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {insight.description}
                </p>

                {insight.service && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 mb-2">
                    Service: {insight.service.displayName || insight.service.name}
                  </p>
                )}

                {insight.currentValue !== undefined && insight.expectedValue !== undefined && (
                  <div className="text-xs text-gray-500 dark:text-gray-500 mb-2">
                    Current: {insight.currentValue} / Expected: {insight.expectedValue}
                  </div>
                )}

                <div className="text-xs text-gray-500 dark:text-gray-500 mb-3">
                  <strong>Impact:</strong> {insight.impact}
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                  <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Recommendation:
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {insight.recommendation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trend Analysis Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Trend Analysis
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Service Health
            </h3>
            <div className={cn(
              'text-lg font-bold capitalize',
              systemAnalysis.trendAnalysis.serviceHealthTrend === 'INCREASING' && 'text-green-600 dark:text-green-400',
              systemAnalysis.trendAnalysis.serviceHealthTrend === 'DECREASING' && 'text-red-600 dark:text-red-400',
              systemAnalysis.trendAnalysis.serviceHealthTrend === 'STABLE' && 'text-blue-600 dark:text-blue-400',
              systemAnalysis.trendAnalysis.serviceHealthTrend === 'VOLATILE' && 'text-yellow-600 dark:text-yellow-400'
            )}>
              {systemAnalysis.trendAnalysis.serviceHealthTrend.toLowerCase()}
            </div>
          </div>

          <div className="text-center">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Performance
            </h3>
            <div className={cn(
              'text-lg font-bold capitalize',
              systemAnalysis.trendAnalysis.performanceTrend === 'INCREASING' && 'text-green-600 dark:text-green-400',
              systemAnalysis.trendAnalysis.performanceTrend === 'DECREASING' && 'text-red-600 dark:text-red-400',
              systemAnalysis.trendAnalysis.performanceTrend === 'STABLE' && 'text-blue-600 dark:text-blue-400',
              systemAnalysis.trendAnalysis.performanceTrend === 'VOLATILE' && 'text-yellow-600 dark:text-yellow-400'
            )}>
              {systemAnalysis.trendAnalysis.performanceTrend.toLowerCase()}
            </div>
          </div>

          <div className="text-center">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Alert Frequency
            </h3>
            <div className={cn(
              'text-lg font-bold capitalize',
              systemAnalysis.trendAnalysis.alertFrequencyTrend === 'INCREASING' && 'text-red-600 dark:text-red-400',
              systemAnalysis.trendAnalysis.alertFrequencyTrend === 'DECREASING' && 'text-green-600 dark:text-green-400',
              systemAnalysis.trendAnalysis.alertFrequencyTrend === 'STABLE' && 'text-blue-600 dark:text-blue-400',
              systemAnalysis.trendAnalysis.alertFrequencyTrend === 'VOLATILE' && 'text-yellow-600 dark:text-yellow-400'
            )}>
              {systemAnalysis.trendAnalysis.alertFrequencyTrend.toLowerCase()}
            </div>
          </div>

          <div className="text-center">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Availability
            </h3>
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {systemAnalysis.trendAnalysis.availabilityTrend.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InsightsView;
