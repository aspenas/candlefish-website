/**
 * System Health Score Component
 *
 * Displays the overall system health score with visual indicators and breakdown
 */

'use client';

import React from 'react';
import { SystemAnalysis, ServiceStatus, AlertSeverity } from '@/lib/types/dashboard';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  QuestionMarkCircleIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface SystemHealthScoreProps {
  analysis: SystemAnalysis;
}

export function SystemHealthScore({ analysis }: SystemHealthScoreProps) {
  const {
    healthScore,
    overallHealth,
    totalServices,
    healthyServices,
    degradedServices,
    unhealthyServices,
    activeAlerts,
    trendAnalysis,
  } = analysis;

  // Calculate percentages
  const healthyPercent = (healthyServices / totalServices) * 100;
  const degradedPercent = (degradedServices / totalServices) * 100;
  const unhealthyPercent = (unhealthyServices / totalServices) * 100;

  // Get health color
  const getHealthColor = () => {
    if (healthScore >= 90) return 'green';
    if (healthScore >= 70) return 'yellow';
    if (healthScore >= 50) return 'orange';
    return 'red';
  };

  // Get status icon
  const getStatusIcon = (status: ServiceStatus) => {
    switch (status) {
      case ServiceStatus.HEALTHY:
        return CheckCircleIcon;
      case ServiceStatus.DEGRADED:
        return ExclamationTriangleIcon;
      case ServiceStatus.UNHEALTHY:
        return XCircleIcon;
      case ServiceStatus.MAINTENANCE:
        return WrenchScrewdriverIcon;
      default:
        return QuestionMarkCircleIcon;
    }
  };

  const getStatusColor = (status: ServiceStatus) => {
    switch (status) {
      case ServiceStatus.HEALTHY:
        return 'text-green-600 dark:text-green-400';
      case ServiceStatus.DEGRADED:
        return 'text-yellow-600 dark:text-yellow-400';
      case ServiceStatus.UNHEALTHY:
        return 'text-red-600 dark:text-red-400';
      case ServiceStatus.MAINTENANCE:
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const healthColor = getHealthColor();
  const StatusIcon = getStatusIcon(overallHealth);

  // Health score circle
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (healthScore / 100) * circumference;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          System Health Score
        </h2>
        <div className={cn(
          'flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium',
          getStatusColor(overallHealth),
          overallHealth === ServiceStatus.HEALTHY && 'bg-green-100 dark:bg-green-900/20',
          overallHealth === ServiceStatus.DEGRADED && 'bg-yellow-100 dark:bg-yellow-900/20',
          overallHealth === ServiceStatus.UNHEALTHY && 'bg-red-100 dark:bg-red-900/20',
          overallHealth === ServiceStatus.MAINTENANCE && 'bg-blue-100 dark:bg-blue-900/20'
        )}>
          <StatusIcon className="w-4 h-4" />
          <span>{overallHealth.toLowerCase()}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Health Score Circle */}
        <div className="flex flex-col items-center">
          <div className="relative w-32 h-32">
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-gray-200 dark:text-gray-700"
              />
              {/* Progress circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className={cn(
                  'transition-all duration-1000 ease-out',
                  healthColor === 'green' && 'text-green-500',
                  healthColor === 'yellow' && 'text-yellow-500',
                  healthColor === 'orange' && 'text-orange-500',
                  healthColor === 'red' && 'text-red-500'
                )}
                style={{
                  animationDelay: '500ms',
                }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className={cn(
                  'text-3xl font-bold',
                  healthColor === 'green' && 'text-green-600 dark:text-green-400',
                  healthColor === 'yellow' && 'text-yellow-600 dark:text-yellow-400',
                  healthColor === 'orange' && 'text-orange-600 dark:text-orange-400',
                  healthColor === 'red' && 'text-red-600 dark:text-red-400'
                )}>
                  {Math.round(healthScore)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Score
                </div>
              </div>
            </div>
          </div>

          {/* Trend indicator */}
          <div className="mt-4 text-center">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Trend: {trendAnalysis.serviceHealthTrend.toLowerCase()}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              {Math.round(trendAnalysis.availabilityTrend)}% availability
            </div>
          </div>
        </div>

        {/* Service Breakdown */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Service Status
          </h3>

          <div className="space-y-3">
            {healthyServices > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Healthy
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {healthyServices}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-500">
                    ({healthyPercent.toFixed(0)}%)
                  </span>
                </div>
              </div>
            )}

            {degradedServices > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Degraded
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {degradedServices}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-500">
                    ({degradedPercent.toFixed(0)}%)
                  </span>
                </div>
              </div>
            )}

            {unhealthyServices > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Unhealthy
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {unhealthyServices}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-500">
                    ({unhealthyPercent.toFixed(0)}%)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Progress bars */}
          <div className="space-y-2">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div className="flex h-2 rounded-full overflow-hidden">
                {healthyServices > 0 && (
                  <div
                    className="bg-green-500 transition-all duration-1000"
                    style={{ width: `${healthyPercent}%` }}
                  />
                )}
                {degradedServices > 0 && (
                  <div
                    className="bg-yellow-500 transition-all duration-1000"
                    style={{ width: `${degradedPercent}%` }}
                  />
                )}
                {unhealthyServices > 0 && (
                  <div
                    className="bg-red-500 transition-all duration-1000"
                    style={{ width: `${unhealthyPercent}%` }}
                  />
                )}
              </div>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500 text-center">
              {totalServices} total services
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Key Metrics
          </h3>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Active Alerts
              </span>
              <span className={cn(
                'text-sm font-medium',
                activeAlerts > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'
              )}>
                {activeAlerts}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Availability
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {trendAnalysis.availabilityTrend.toFixed(1)}%
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Performance Trend
              </span>
              <span className={cn(
                'text-sm font-medium capitalize',
                trendAnalysis.performanceTrend === 'INCREASING' && 'text-green-600 dark:text-green-400',
                trendAnalysis.performanceTrend === 'DECREASING' && 'text-red-600 dark:text-red-400',
                trendAnalysis.performanceTrend === 'STABLE' && 'text-blue-600 dark:text-blue-400',
                trendAnalysis.performanceTrend === 'VOLATILE' && 'text-yellow-600 dark:text-yellow-400'
              )}>
                {trendAnalysis.performanceTrend.toLowerCase()}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Alert Frequency
              </span>
              <span className={cn(
                'text-sm font-medium capitalize',
                trendAnalysis.alertFrequencyTrend === 'INCREASING' && 'text-red-600 dark:text-red-400',
                trendAnalysis.alertFrequencyTrend === 'DECREASING' && 'text-green-600 dark:text-green-400',
                trendAnalysis.alertFrequencyTrend === 'STABLE' && 'text-blue-600 dark:text-blue-400',
                trendAnalysis.alertFrequencyTrend === 'VOLATILE' && 'text-yellow-600 dark:text-yellow-400'
              )}>
                {trendAnalysis.alertFrequencyTrend.toLowerCase()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SystemHealthScore;
