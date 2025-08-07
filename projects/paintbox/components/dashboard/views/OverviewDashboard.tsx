/**
 * Overview Dashboard View
 * 
 * Main dashboard view showing system-wide metrics and status
 */

'use client';

import React from 'react';
import { useDashboard } from '@/lib/context/DashboardContext';
import { ServiceStatus, AlertSeverity } from '@/lib/types/dashboard';
import { 
  ServerIcon, 
  ExclamationTriangleIcon,
  ChartBarIcon,
  ClockIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  MinusIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

// Components
import { DashboardCard } from '../components/DashboardCard';
import { MetricChart } from '../components/MetricChart';
import { ServiceGrid } from '../components/ServiceGrid';
import { AlertList } from '../components/AlertList';
import { SystemHealthScore } from '../components/SystemHealthScore';
import { RecommendationsList } from '../components/RecommendationsList';

export function OverviewDashboard() {
  const { state } = useDashboard();
  const { services, alerts, systemAnalysis, loading } = state;

  // Calculate service statistics
  const serviceStats = {
    total: services.length,
    healthy: services.filter(s => s.status === ServiceStatus.HEALTHY).length,
    degraded: services.filter(s => s.status === ServiceStatus.DEGRADED).length,
    unhealthy: services.filter(s => s.status === ServiceStatus.UNHEALTHY).length,
    unknown: services.filter(s => s.status === ServiceStatus.UNKNOWN).length,
  };

  // Calculate alert statistics
  const alertStats = {
    total: alerts.length,
    critical: alerts.filter(a => a.severity === AlertSeverity.CRITICAL).length,
    high: alerts.filter(a => a.severity === AlertSeverity.HIGH).length,
    medium: alerts.filter(a => a.severity === AlertSeverity.MEDIUM).length,
    low: alerts.filter(a => a.severity === AlertSeverity.LOW).length,
  };

  // Get trend icon
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'INCREASING':
        return TrendingUpIcon;
      case 'DECREASING':
        return TrendingDownIcon;
      default:
        return MinusIcon;
    }
  };

  // Dashboard cards data
  const dashboardCards = [
    {
      id: 'services',
      title: 'Total Services',
      value: serviceStats.total,
      change: serviceStats.healthy / serviceStats.total * 100,
      changeType: serviceStats.unhealthy > 0 ? 'decrease' as const : 'increase' as const,
      icon: ServerIcon,
      color: serviceStats.unhealthy > 0 ? 'red' as const : serviceStats.degraded > 0 ? 'yellow' as const : 'green' as const,
      subtitle: `${serviceStats.healthy} healthy, ${serviceStats.unhealthy} unhealthy`,
    },
    {
      id: 'alerts',
      title: 'Active Alerts',
      value: alertStats.total,
      change: alertStats.critical > 0 ? -10 : 5,
      changeType: alertStats.critical > 0 ? 'decrease' as const : 'increase' as const,
      icon: ExclamationTriangleIcon,
      color: alertStats.critical > 0 ? 'red' as const : alertStats.total > 0 ? 'yellow' as const : 'green' as const,
      subtitle: `${alertStats.critical} critical, ${alertStats.high} high priority`,
    },
    {
      id: 'health-score',
      title: 'Health Score',
      value: systemAnalysis ? `${Math.round(systemAnalysis.healthScore)}%` : '-',
      change: systemAnalysis?.trendAnalysis?.serviceHealthTrend === 'INCREASING' ? 5 : -2,
      changeType: systemAnalysis?.trendAnalysis?.serviceHealthTrend === 'INCREASING' ? 'increase' as const : 'decrease' as const,
      icon: ChartBarIcon,
      color: systemAnalysis && systemAnalysis.healthScore >= 90 ? 'green' as const : 
             systemAnalysis && systemAnalysis.healthScore >= 70 ? 'yellow' as const : 'red' as const,
      subtitle: systemAnalysis?.overallHealth.toLowerCase() || 'unknown',
    },
    {
      id: 'uptime',
      title: 'Avg Uptime',
      value: '99.8%',
      change: 0.2,
      changeType: 'increase' as const,
      icon: ClockIcon,
      color: 'green' as const,
      subtitle: 'Last 30 days',
    },
  ];

  if (loading.services || loading.alerts || loading.analysis) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-full overflow-x-hidden">
      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {dashboardCards.map((card) => (
          <DashboardCard key={card.id} {...card} />
        ))}
      </div>

      {/* System Health Score */}
      {systemAnalysis && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <SystemHealthScore analysis={systemAnalysis} />
          </div>
          <div>
            <RecommendationsList 
              recommendations={systemAnalysis.recommendations}
              maxItems={5}
            />
          </div>
        </div>
      )}

      {/* Resource Utilization Charts */}
      {systemAnalysis && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
          <MetricChart
            title="CPU Utilization"
            value={systemAnalysis.resourceUtilization.cpu.current}
            unit="%"
            trend={systemAnalysis.resourceUtilization.cpu.trend}
            data={[
              { x: '6h ago', y: systemAnalysis.resourceUtilization.cpu.average - 10 },
              { x: '5h ago', y: systemAnalysis.resourceUtilization.cpu.average - 5 },
              { x: '4h ago', y: systemAnalysis.resourceUtilization.cpu.average },
              { x: '3h ago', y: systemAnalysis.resourceUtilization.cpu.average + 3 },
              { x: '2h ago', y: systemAnalysis.resourceUtilization.cpu.average + 1 },
              { x: '1h ago', y: systemAnalysis.resourceUtilization.cpu.current - 2 },
              { x: 'now', y: systemAnalysis.resourceUtilization.cpu.current },
            ]}
            color="blue"
          />
          
          <MetricChart
            title="Memory Usage"
            value={systemAnalysis.resourceUtilization.memory.current}
            unit="%"
            trend={systemAnalysis.resourceUtilization.memory.trend}
            data={[
              { x: '6h ago', y: systemAnalysis.resourceUtilization.memory.average - 8 },
              { x: '5h ago', y: systemAnalysis.resourceUtilization.memory.average - 4 },
              { x: '4h ago', y: systemAnalysis.resourceUtilization.memory.average },
              { x: '3h ago', y: systemAnalysis.resourceUtilization.memory.average + 2 },
              { x: '2h ago', y: systemAnalysis.resourceUtilization.memory.average + 4 },
              { x: '1h ago', y: systemAnalysis.resourceUtilization.memory.current - 1 },
              { x: 'now', y: systemAnalysis.resourceUtilization.memory.current },
            ]}
            color="green"
          />
          
          <MetricChart
            title="Disk Usage"
            value={systemAnalysis.resourceUtilization.disk.current}
            unit="%"
            trend={systemAnalysis.resourceUtilization.disk.trend}
            data={[
              { x: '6h ago', y: systemAnalysis.resourceUtilization.disk.average - 2 },
              { x: '5h ago', y: systemAnalysis.resourceUtilization.disk.average - 1 },
              { x: '4h ago', y: systemAnalysis.resourceUtilization.disk.average },
              { x: '3h ago', y: systemAnalysis.resourceUtilization.disk.average + 1 },
              { x: '2h ago', y: systemAnalysis.resourceUtilization.disk.average + 1 },
              { x: '1h ago', y: systemAnalysis.resourceUtilization.disk.current },
              { x: 'now', y: systemAnalysis.resourceUtilization.disk.current },
            ]}
            color="purple"
          />
          
          <MetricChart
            title="Network I/O"
            value={systemAnalysis.resourceUtilization.network.current}
            unit="MB/s"
            trend={systemAnalysis.resourceUtilization.network.trend}
            data={[
              { x: '6h ago', y: systemAnalysis.resourceUtilization.network.average - 5 },
              { x: '5h ago', y: systemAnalysis.resourceUtilization.network.average - 2 },
              { x: '4h ago', y: systemAnalysis.resourceUtilization.network.average },
              { x: '3h ago', y: systemAnalysis.resourceUtilization.network.average + 3 },
              { x: '2h ago', y: systemAnalysis.resourceUtilization.network.average + 1 },
              { x: '1h ago', y: systemAnalysis.resourceUtilization.network.current - 1 },
              { x: 'now', y: systemAnalysis.resourceUtilization.network.current },
            ]}
            color="orange"
          />
        </div>
      )}

      {/* Services and Alerts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Services Overview
          </h2>
          <ServiceGrid 
            services={services.slice(0, 8)} 
            showAll={false}
            onViewAll={() => {/* TODO: Navigate to services view */}}
          />
        </div>
        
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Recent Alerts
          </h2>
          <AlertList 
            alerts={alerts.slice(0, 8)}
            showAll={false}
            onViewAll={() => {/* TODO: Navigate to alerts view */}}
          />
        </div>
      </div>

      {/* Performance Insights */}
      {systemAnalysis && systemAnalysis.performanceInsights.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Performance Insights
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {systemAnalysis.performanceInsights.slice(0, 6).map((insight, index) => (
              <div
                key={index}
                className={cn(
                  'p-4 rounded-lg border-l-4',
                  insight.severity === AlertSeverity.CRITICAL && 'border-red-500 bg-red-50 dark:bg-red-900/20',
                  insight.severity === AlertSeverity.HIGH && 'border-orange-500 bg-orange-50 dark:bg-orange-900/20',
                  insight.severity === AlertSeverity.MEDIUM && 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
                  insight.severity === AlertSeverity.LOW && 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                )}
              >
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  {insight.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {insight.description}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {insight.recommendation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default OverviewDashboard;