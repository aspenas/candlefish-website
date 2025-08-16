/**
 * Health Monitoring Dashboard
 * Real-time health status display with WebSocket updates
 */

'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
  Globe,
  HardDrive,
  MemoryStick,
  RefreshCw,
  Settings,
  TrendingUp,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

import {
  useHealthStore,
  useHealthStatus,
  useHealthChecks,
  useHealthMetrics,
} from '@/stores/useInfrastructureStore';
import { useHealthWebSocket, useWebSocketStatus } from '@/hooks/useInfrastructureWebSocket';
import { HealthCheckResult } from '@/lib/types/infrastructure';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// ===== TYPES =====

interface ServiceCardProps {
  service: HealthCheckResult;
  icon: React.ReactNode;
  color: string;
}

interface MetricsChartProps {
  data: {
    responseTime: number[];
    timestamp: string[];
    status: string[];
  };
}

// ===== SERVICE ICONS =====

const getServiceIcon = (serviceName: string) => {
  const icons: Record<string, React.ReactNode> = {
    database: <Database className="h-5 w-5" />,
    redis: <MemoryStick className="h-5 w-5" />,
    secrets: <Settings className="h-5 w-5" />,
    salesforce: <Globe className="h-5 w-5" />,
    companycam: <Globe className="h-5 w-5" />,
    disk_space: <HardDrive className="h-5 w-5" />,
    memory: <Activity className="h-5 w-5" />,
  };
  return icons[serviceName] || <Activity className="h-5 w-5" />;
};

const getServiceColor = (status: string) => {
  const colors = {
    healthy: 'text-green-600 bg-green-50 border-green-200',
    degraded: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    unhealthy: 'text-red-600 bg-red-50 border-red-200',
  };
  return colors[status as keyof typeof colors] || colors.unhealthy;
};

// ===== COMPONENTS =====

const ServiceCard: React.FC<ServiceCardProps> = ({ service, icon, color }) => {
  const formatResponseTime = (time: number) => {
    if (time < 1000) return `${time}ms`;
    return `${(time / 1000).toFixed(2)}s`;
  };

  const formatDetails = (details: any) => {
    if (!details) return null;

    const items = Object.entries(details).map(([key, value]) => {
      if (typeof value === 'boolean') {
        return `${key}: ${value ? '✓' : '✗'}`;
      }
      if (typeof value === 'number') {
        if (key.includes('percentage')) {
          return `${key}: ${value}%`;
        }
        if (key.includes('mb') || key.includes('gb')) {
          return `${key}: ${value}`;
        }
      }
      return `${key}: ${value}`;
    });

    return items.slice(0, 3); // Show max 3 details
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn('p-4 border-l-4', color)}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-white border">
              {icon}
            </div>
            <div>
              <h3 className="font-semibold text-sm capitalize">
                {service.name.replace('_', ' ')}
              </h3>
              <p className="text-xs text-gray-500">
                {formatResponseTime(service.responseTime)}
              </p>
            </div>
          </div>
          <Badge
            className={cn(
              'text-xs',
              service.status === 'healthy' && 'bg-green-100 text-green-800',
              service.status === 'degraded' && 'bg-yellow-100 text-yellow-800',
              service.status === 'unhealthy' && 'bg-red-100 text-red-800'
            )}
          >
            {service.status}
          </Badge>
        </div>

        {service.error && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            {service.error}
          </div>
        )}

        {service.details && (
          <div className="space-y-1">
            {formatDetails(service.details)?.map((detail, index) => (
              <div key={index} className="text-xs text-gray-600 font-mono">
                {detail}
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center text-xs text-gray-500">
          <Clock className="h-3 w-3 mr-1" />
          {service.lastChecked ? 
            new Date(service.lastChecked).toLocaleTimeString() : 
            'Just now'
          }
        </div>
      </Card>
    </motion.div>
  );
};

const MetricsChart: React.FC<MetricsChartProps> = ({ data }) => {
  const chartData = useMemo(() => {
    const labels = data.timestamp.map(ts => 
      new Date(ts).toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    );

    return {
      labels,
      datasets: [
        {
          label: 'Response Time (ms)',
          data: data.responseTime,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 4,
        },
      ],
    };
  }, [data]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
        ticks: {
          maxTicksLimit: 6,
        },
      },
      y: {
        display: true,
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          callback: (value: any) => `${value}ms`,
        },
      },
    },
    elements: {
      point: {
        hoverBackgroundColor: 'rgb(59, 130, 246)',
      },
    },
  };

  return (
    <div className="h-48">
      <Line data={chartData} options={options} />
    </div>
  );
};

const ConnectionStatus: React.FC = () => {
  const status = useWebSocketStatus();
  const { requestHealthCheck } = useHealthWebSocket();

  const getStatusConfig = (status: string) => {
    const configs = {
      connected: {
        icon: <Wifi className="h-4 w-4" />,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        text: 'Connected',
      },
      connecting: {
        icon: <RefreshCw className="h-4 w-4 animate-spin" />,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        text: 'Connecting...',
      },
      disconnected: {
        icon: <WifiOff className="h-4 w-4" />,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        text: 'Disconnected',
      },
      error: {
        icon: <AlertCircle className="h-4 w-4" />,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        text: 'Connection Error',
      },
    };
    return configs[status as keyof typeof configs] || configs.disconnected;
  };

  const config = getStatusConfig(status);

  return (
    <div className={cn('flex items-center space-x-2 px-3 py-2 rounded-lg', config.bgColor)}>
      <div className={config.color}>
        {config.icon}
      </div>
      <span className={cn('text-sm font-medium', config.color)}>
        {config.text}
      </span>
      {status === 'connected' && (
        <Button
          variant="ghost"
          size="sm"
          onClick={requestHealthCheck}
          className="h-6 px-2 text-xs"
        >
          Refresh
        </Button>
      )}
    </div>
  );
};

// ===== MAIN COMPONENT =====

export const HealthMonitoringDashboard: React.FC = () => {
  const {
    currentHealth,
    healthHistory,
    isLoading,
    error,
    autoRefresh,
    refreshInterval,
    toggleAutoRefresh,
    setRefreshInterval,
  } = useHealthStore();

  const healthStatus = useHealthStatus();
  const healthChecks = useHealthChecks();
  const healthMetrics = useHealthMetrics();

  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Fetch health data
  const fetchHealth = async () => {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      useHealthStore.getState().updateHealth(data);
      setLastRefresh(new Date());
    } catch (err) {
      useHealthStore.getState().setError(err instanceof Error ? err.message : 'Failed to fetch health');
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(fetchHealth, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  // Initial fetch
  useEffect(() => {
    fetchHealth();
  }, []);

  const criticalServices = useMemo(() => {
    if (!healthChecks) return [];
    return Object.values(healthChecks).filter(check => 
      ['database', 'redis', 'secrets'].includes(check.name) && check.status === 'unhealthy'
    );
  }, [healthChecks]);

  const serviceList = useMemo(() => {
    if (!healthChecks) return [];
    return Object.values(healthChecks).sort((a, b) => {
      // Sort by status priority (unhealthy first)
      const statusPriority = { unhealthy: 0, degraded: 1, healthy: 2 };
      return statusPriority[a.status] - statusPriority[b.status];
    });
  }, [healthChecks]);

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-center space-x-3 text-red-600">
          <AlertCircle className="h-6 w-6" />
          <div>
            <h3 className="font-semibold">Health Check Error</h3>
            <p className="text-sm text-gray-600">{error}</p>
          </div>
        </div>
        <Button 
          onClick={fetchHealth} 
          className="mt-4" 
          variant="outline"
        >
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Health Monitoring</h1>
          <p className="text-gray-600 mt-1">
            Real-time system health and performance metrics
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <ConnectionStatus />
          <div className="flex items-center space-x-2">
            <Switch
              checked={autoRefresh}
              onCheckedChange={toggleAutoRefresh}
              id="auto-refresh"
            />
            <label htmlFor="auto-refresh" className="text-sm text-gray-600">
              Auto-refresh
            </label>
          </div>
        </div>
      </div>

      {/* Critical Alerts */}
      <AnimatePresence>
        {criticalServices.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="p-4 border-red-200 bg-red-50">
              <div className="flex items-center space-x-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <div>
                  <h3 className="font-semibold text-red-800">Critical Issues Detected</h3>
                  <p className="text-sm text-red-700">
                    {criticalServices.length} critical service(s) are unhealthy
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className={cn(
              'p-3 rounded-lg',
              healthStatus === 'healthy' && 'bg-green-100 text-green-600',
              healthStatus === 'degraded' && 'bg-yellow-100 text-yellow-600',
              healthStatus === 'unhealthy' && 'bg-red-100 text-red-600'
            )}>
              {healthStatus === 'healthy' ? (
                <CheckCircle className="h-6 w-6" />
              ) : (
                <AlertCircle className="h-6 w-6" />
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600">Overall Status</p>
              <p className="text-lg font-semibold capitalize">
                {healthStatus || 'Unknown'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Services</p>
              <p className="text-lg font-semibold">
                {currentHealth?.summary.healthy || 0}/{currentHealth?.summary.total || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-lg bg-purple-100 text-purple-600">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Uptime</p>
              <p className="text-lg font-semibold">
                {currentHealth ? 
                  Math.floor(currentHealth.uptime / (1000 * 60 * 60)) + 'h' : 
                  'N/A'
                }
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-lg bg-green-100 text-green-600">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Last Check</p>
              <p className="text-lg font-semibold">
                {lastRefresh.toLocaleTimeString()}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Metrics Chart */}
      {healthMetrics.responseTime.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Response Time Trends</h3>
            <Badge variant="outline" className="text-xs">
              Last {healthMetrics.responseTime.length} checks
            </Badge>
          </div>
          <MetricsChart data={healthMetrics} />
        </Card>
      )}

      {/* Service Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {serviceList.map((service) => (
          <ServiceCard
            key={service.name}
            service={service}
            icon={getServiceIcon(service.name)}
            color={getServiceColor(service.status)}
          />
        ))}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          <span>Loading health data...</span>
        </div>
      )}
    </div>
  );
};

export default HealthMonitoringDashboard;