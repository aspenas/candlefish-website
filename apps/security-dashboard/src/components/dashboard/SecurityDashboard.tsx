import React, { useEffect, useState } from 'react';
import { 
  ShieldExclamationIcon, 
  ExclamationTriangleIcon, 
  CheckCircleIcon,
  ClockIcon,
  UsersIcon,
  ServerIcon
} from '@heroicons/react/24/outline';
import { useDashboardMetrics, useRealTimeUpdates } from '../../hooks/useApi';
import { useDashboardStore } from '../../store/dashboardStore';
import { useNotificationStore } from '../../store/notificationStore';
import { Severity, DashboardMetrics } from '../../types/security';
import MetricCard from './MetricCard';
import ThreatActivityChart from './ThreatActivityChart';
import RecentActivityFeed from './RecentActivityFeed';
import SystemHealthIndicator from './SystemHealthIndicator';
import LoadingSpinner from '../ui/LoadingSpinner';
import ErrorMessage from '../ui/ErrorMessage';

const SecurityDashboard: React.FC = () => {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const { connectionStatus, setConnectionStatus } = useDashboardStore();
  const { addNotification } = useNotificationStore();
  
  // Real-time WebSocket connection
  const { startListening, stopListening, getConnectionStatus } = useRealTimeUpdates();
  
  // Dashboard metrics query
  const {
    data: metricsResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useDashboardMetrics({
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Handle WebSocket connection
  useEffect(() => {
    startListening();
    
    // Monitor connection status
    const statusInterval = setInterval(() => {
      const status = getConnectionStatus();
      setConnectionStatus(status);
    }, 1000);

    return () => {
      stopListening();
      clearInterval(statusInterval);
    };
  }, [startListening, stopListening, getConnectionStatus, setConnectionStatus]);

  // Handle real-time updates
  useEffect(() => {
    if (connectionStatus.connected) {
      setLastUpdate(new Date());
    }
  }, [connectionStatus.connected]);

  const metrics = metricsResponse?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorMessage
        title="Failed to load dashboard metrics"
        message={error?.message || 'Unknown error occurred'}
        onRetry={() => refetch()}
      />
    );
  }

  if (!metrics) {
    return (
      <ErrorMessage
        title="No data available"
        message="Dashboard metrics are currently unavailable"
        onRetry={() => refetch()}
      />
    );
  }

  const getSeverityColor = (severity: Severity) => {
    switch (severity) {
      case Severity.CRITICAL:
        return 'text-critical-400';
      case Severity.HIGH:
        return 'text-warning-400';
      case Severity.MEDIUM:
        return 'text-warning-300';
      case Severity.LOW:
        return 'text-info-400';
      default:
        return 'text-success-400';
    }
  };

  const getHealthStatusColor = (health: number) => {
    if (health >= 90) return 'text-success-400';
    if (health >= 70) return 'text-warning-400';
    return 'text-critical-400';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Security Dashboard</h1>
          <p className="text-soc-muted mt-1">
            Real-time security monitoring and threat detection
          </p>
        </div>
        
        {/* Connection Status */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus.connected ? 'bg-success-500 animate-pulse' : 'bg-critical-500'
            }`} />
            <span className="text-sm text-soc-muted">
              {connectionStatus.connected ? 'Live' : 'Disconnected'}
            </span>
          </div>
          <span className="text-xs text-soc-muted">
            Last update: {lastUpdate.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="metrics-grid">
        <MetricCard
          title="Active Threats"
          value={metrics.threatsDetected}
          icon={ShieldExclamationIcon}
          trend={metrics.threatsDetected > 0 ? 'up' : 'stable'}
          severity={metrics.threatsDetected > 10 ? 'critical' : metrics.threatsDetected > 5 ? 'warning' : 'info'}
          description={`${metrics.threatsDetected} active threats detected`}
        />
        
        <MetricCard
          title="Active Incidents"
          value={metrics.incidentsActive}
          icon={ExclamationTriangleIcon}
          trend={metrics.incidentsActive > 0 ? 'up' : 'stable'}
          severity={metrics.incidentsActive > 5 ? 'critical' : metrics.incidentsActive > 2 ? 'warning' : 'info'}
          description={`${metrics.incidentsActive} incidents requiring attention`}
        />
        
        <MetricCard
          title="System Health"
          value={`${metrics.systemHealth.overall}%`}
          icon={ServerIcon}
          trend={metrics.systemHealth.overall >= 90 ? 'up' : metrics.systemHealth.overall >= 70 ? 'stable' : 'down'}
          severity={metrics.systemHealth.overall >= 90 ? 'success' : metrics.systemHealth.overall >= 70 ? 'warning' : 'critical'}
          description={`${metrics.systemHealth.components.length} components monitored`}
        />
        
        <MetricCard
          title="Events (24h)"
          value={metrics.eventsPerHour.reduce((sum, point) => sum + point.value, 0)}
          icon={ClockIcon}
          trend="stable"
          severity="info"
          description="Security events in last 24 hours"
        />
      </div>

      {/* Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Threat Activity Chart */}
        <div className="lg:col-span-2">
          <div className="soc-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Threat Activity</h3>
              <div className="flex items-center space-x-2 text-sm text-soc-muted">
                <div className="w-3 h-3 bg-critical-500 rounded-full"></div>
                <span>Critical</span>
                <div className="w-3 h-3 bg-warning-500 rounded-full"></div>
                <span>High</span>
                <div className="w-3 h-3 bg-info-500 rounded-full"></div>
                <span>Medium/Low</span>
              </div>
            </div>
            <ThreatActivityChart data={metrics.eventsPerHour} />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-1">
          <div className="soc-card p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Recent Activity</h3>
            <RecentActivityFeed activities={metrics.recentActivity} />
          </div>
        </div>
      </div>

      {/* System Health & Top Threats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Health Components */}
        <div className="soc-card p-6">
          <h3 className="text-lg font-semibold text-white mb-6">System Health</h3>
          <div className="space-y-4">
            {metrics.systemHealth.components.map((component, index) => (
              <SystemHealthIndicator
                key={index}
                name={component.name}
                status={component.status}
                lastCheck={component.lastCheck}
              />
            ))}
          </div>
        </div>

        {/* Top Threats */}
        <div className="soc-card p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Top Threat Types</h3>
          <div className="space-y-4">
            {metrics.topThreats.map((threat, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-soc-elevated rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${getSeverityColor(threat.severity)}`}></div>
                  <span className="text-white font-medium">{threat.type.replace('_', ' ')}</span>
                </div>
                <div className="text-right">
                  <div className="text-white font-semibold">{threat.count}</div>
                  <div className={`text-xs ${getSeverityColor(threat.severity)}`}>
                    {threat.severity}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Metrics Footer */}
      <div className="soc-card p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-success-400">
              {metrics.systemHealth.overall}%
            </div>
            <div className="text-sm text-soc-muted">Overall Health</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {metrics.eventsPerHour.length}
            </div>
            <div className="text-sm text-soc-muted">Data Points</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-info-400">
              {connectionStatus.connected ? '< 100ms' : 'N/A'}
            </div>
            <div className="text-sm text-soc-muted">Response Time</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-warning-400">
              {metrics.recentActivity.length}
            </div>
            <div className="text-sm text-soc-muted">Recent Events</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityDashboard;