'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { healthApi, queryKeys } from '@/lib/api';
import { useServiceUpdates } from '@/hooks/useWebSocket';
import { Activity, AlertTriangle, CheckCircle, XCircle, TrendingUp, TrendingDown } from 'lucide-react';

interface HealthMonitorProps {
  serviceId?: string;
  compact?: boolean;
}

export function HealthMonitor({ serviceId, compact = false }: HealthMonitorProps) {
  const [selectedTimeRange, setSelectedTimeRange] = useState(24);
  const { healthMetrics } = useServiceUpdates();

  // Fetch system health
  const { data: systemHealth, isLoading: systemLoading } = useQuery({
    queryKey: queryKeys.systemHealth,
    queryFn: healthApi.getSystemHealth,
    refetchInterval: 30000, // Refetch every 30 seconds
    enabled: !serviceId
  });

  // Fetch service-specific metrics if serviceId provided
  const { data: serviceMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: queryKeys.serviceMetrics(serviceId || '', selectedTimeRange),
    queryFn: () => healthApi.getServiceMetrics(serviceId!, selectedTimeRange),
    refetchInterval: 60000, // Refetch every minute
    enabled: !!serviceId
  });

  // Calculate health score
  const calculateHealthScore = () => {
    if (!systemHealth) return 0;
    
    let score = 0;
    if (systemHealth.docker?.status === 'healthy') score += 25;
    if (systemHealth.network?.status === 'healthy') score += 25;
    if (systemHealth.registry?.status === 'healthy') score += 25;
    
    const totalServices = systemHealth.total_services || 0;
    const runningServices = systemHealth.running_services || 0;
    if (totalServices > 0) {
      score += (runningServices / totalServices) * 25;
    }
    
    return Math.round(score);
  };

  const healthScore = calculateHealthScore();

  // Get health status color
  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  // Get health icon
  const getHealthIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="w-5 h-5" />;
    if (score >= 60) return <AlertTriangle className="w-5 h-5" />;
    return <XCircle className="w-5 h-5" />;
  };

  // Process real-time health updates
  const recentAlerts = healthMetrics
    .filter(metric => metric.health === 'unhealthy')
    .slice(0, 5);

  if (compact) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-900 dark:text-white">
              Health Score
            </span>
          </div>
          <div className={`flex items-center gap-2 ${getHealthColor(healthScore)}`}>
            {getHealthIcon(healthScore)}
            <span className="text-lg font-semibold">{healthScore}%</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          {serviceId ? 'Service Health' : 'System Health Monitor'}
        </h3>
        <div className="flex items-center gap-2">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(Number(e.target.value))}
            className="px-3 py-1 text-sm bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-300"
          >
            <option value={1}>Last Hour</option>
            <option value={6}>Last 6 Hours</option>
            <option value={24}>Last 24 Hours</option>
            <option value={168}>Last Week</option>
          </select>
        </div>
      </div>

      {/* Overall Health Score */}
      {!serviceId && (
        <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              Overall System Health
            </span>
            <div className={`flex items-center gap-2 ${getHealthColor(healthScore)}`}>
              {getHealthIcon(healthScore)}
              <span className="text-2xl font-bold">{healthScore}%</span>
            </div>
          </div>
          <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                healthScore >= 80 ? 'bg-green-500' :
                healthScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${healthScore}%` }}
            />
          </div>
        </div>
      )}

      {/* System Components */}
      {!serviceId && systemHealth && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-600 dark:text-slate-400">Docker</span>
              <span className={`text-xs font-medium ${
                systemHealth.docker?.status === 'healthy' ? 'text-green-600' : 'text-red-600'
              }`}>
                {systemHealth.docker?.status || 'unknown'}
              </span>
            </div>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-600 dark:text-slate-400">Network</span>
              <span className={`text-xs font-medium ${
                systemHealth.network?.status === 'healthy' ? 'text-green-600' : 'text-red-600'
              }`}>
                {systemHealth.network?.status || 'unknown'}
              </span>
            </div>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-600 dark:text-slate-400">Uptime</span>
              <span className="text-xs font-medium text-slate-900 dark:text-white">
                {systemHealth.uptime}
              </span>
            </div>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-600 dark:text-slate-400">Services</span>
              <span className="text-xs font-medium text-slate-900 dark:text-white">
                {systemHealth.running_services || 0} / {systemHealth.total_services || 0}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Service Metrics Chart */}
      {serviceId && serviceMetrics && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            Performance Metrics
          </h4>
          <div className="h-48 bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
            {/* Simple metrics visualization */}
            <div className="h-full flex items-end justify-between gap-1">
              {serviceMetrics.slice(-20).map((metric, index) => (
                <div
                  key={index}
                  className="flex-1 bg-blue-500 dark:bg-blue-600 rounded-t"
                  style={{
                    height: `${Math.min(100, metric.cpu || 0)}%`,
                    opacity: 0.5 + (index / 20) * 0.5
                  }}
                  title={`CPU: ${metric.cpu}%, Memory: ${metric.memory}%`}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-500">
            <span>{selectedTimeRange}h ago</span>
            <span>Now</span>
          </div>
        </div>
      )}

      {/* Recent Alerts */}
      {recentAlerts.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            Recent Alerts
          </h4>
          <div className="space-y-2">
            {recentAlerts.map((alert, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    Service {alert.service_id} unhealthy
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading States */}
      {(systemLoading || metricsLoading) && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
        </div>
      )}
    </div>
  );
}