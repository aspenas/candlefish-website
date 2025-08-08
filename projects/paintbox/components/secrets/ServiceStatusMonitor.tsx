'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { ServiceStatus } from './types';

interface ServiceStatusMonitorProps {
  className?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface StatusAlert {
  id: string;
  service: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

export const ServiceStatusMonitor: React.FC<ServiceStatusMonitorProps> = ({
  className,
  autoRefresh = true,
  refreshInterval = 10000
}) => {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<StatusAlert[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousServicesRef = useRef<ServiceStatus[]>([]);

  const serviceConfig = {
    salesforce: {
      name: 'Salesforce CRM',
      description: 'Customer relationship management integration',
      icon: '⚡'
    },
    companycam: {
      name: 'CompanyCam',
      description: 'Photo management and documentation',
      icon: '📷'
    }
  };

  const fetchServiceStatuses = async () => {
    try {
      setError(null);
      const serviceNames = Object.keys(serviceConfig);
      const servicePromises = serviceNames.map(async (service) => {
        try {
          const response = await fetch(`/api/v1/services/${service}/status`);
          if (response.ok) {
            return await response.json();
          } else {
            return {
              service,
              status: 'error' as const,
              lastCheck: new Date().toISOString(),
              error: `HTTP ${response.status}`,
              latency: null
            };
          }
        } catch (err) {
          return {
            service,
            status: 'error' as const,
            lastCheck: new Date().toISOString(),
            error: 'Connection failed',
            latency: null
          };
        }
      });

      const newServices = await Promise.all(servicePromises);

      // Check for status changes and create alerts
      const previousServices = previousServicesRef.current;
      if (previousServices.length > 0) {
        newServices.forEach((newService) => {
          const prevService = previousServices.find(s => s.service === newService.service);
          if (prevService && prevService.status !== newService.status) {
            const alert: StatusAlert = {
              id: `${newService.service}-${Date.now()}`,
              service: newService.service,
              type: newService.status === 'healthy' ? 'info' :
                    newService.status === 'warning' ? 'warning' : 'error',
              message: `Status changed from ${prevService.status} to ${newService.status}`,
              timestamp: new Date(),
              acknowledged: false
            };
            setAlerts(prev => [alert, ...prev.slice(0, 9)]); // Keep last 10 alerts
          }
        });
      }

      setServices(newServices);
      previousServicesRef.current = newServices;
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch service statuses');
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert =>
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ));
  };

  const clearAllAlerts = () => {
    setAlerts([]);
  };

  useEffect(() => {
    fetchServiceStatuses();

    if (autoRefresh) {
      intervalRef.current = setInterval(fetchServiceStatuses, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval]);

  const getStatusColor = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getAlertColor = (type: StatusAlert['type']) => {
    switch (type) {
      case 'error':
        return 'text-red-800 bg-red-50 border-red-200';
      case 'warning':
        return 'text-yellow-800 bg-yellow-50 border-yellow-200';
      case 'info':
        return 'text-blue-800 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-800 bg-gray-50 border-gray-200';
    }
  };

  const formatDuration = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const unacknowledgedAlerts = alerts.filter(alert => !alert.acknowledged);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Service Status Monitor</h2>
          <p className="text-gray-600">
            Real-time monitoring of external service integrations
            {lastUpdate && (
              <span className="ml-4 text-sm">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={fetchServiceStatuses} disabled={loading}>
            {loading ? 'Checking...' : 'Check Now'}
          </Button>
          {unacknowledgedAlerts.length > 0 && (
            <Button onClick={clearAllAlerts} variant="outline">
              Clear Alerts ({unacknowledgedAlerts.length})
            </Button>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-center space-x-2">
            <span className="text-red-600">⚠</span>
            <span className="text-red-800 font-medium">Monitor Error</span>
          </div>
          <p className="text-red-700 mt-1">{error}</p>
        </Card>
      )}

      {/* Active Alerts */}
      {unacknowledgedAlerts.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center">
            <span className="animate-pulse text-red-500 mr-2">●</span>
            Active Alerts ({unacknowledgedAlerts.length})
          </h3>
          <div className="space-y-2">
            {unacknowledgedAlerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border ${getAlertColor(alert.type)}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium capitalize">{alert.service}</span>
                      <span className="text-sm opacity-75">
                        {alert.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{alert.message}</p>
                  </div>
                  <Button
                    onClick={() => acknowledgeAlert(alert.id)}
                    variant="ghost"
                    className="text-xs py-1 px-2"
                  >
                    Acknowledge
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Service Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {services.map((service) => {
          const config = serviceConfig[service.service as keyof typeof serviceConfig];
          return (
            <Card key={service.service} className={`p-6 border-2 ${getStatusColor(service.status)}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{config?.icon}</span>
                  <div>
                    <h3 className="font-semibold text-lg">{config?.name}</h3>
                    <p className="text-sm opacity-75">{config?.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(service.status)}`}>
                    {service.status.toUpperCase()}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Last Check:</span>
                    <p className="font-medium">{formatDuration(service.lastCheck)}</p>
                  </div>
                  {service.lastSuccess && (
                    <div>
                      <span className="text-gray-600">Last Success:</span>
                      <p className="font-medium">{formatDuration(service.lastSuccess)}</p>
                    </div>
                  )}
                </div>

                {service.latency && (
                  <div className="text-sm">
                    <span className="text-gray-600">Response Time:</span>
                    <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                      service.latency < 1000 ? 'text-green-700 bg-green-100' :
                      service.latency < 3000 ? 'text-yellow-700 bg-yellow-100' :
                      'text-red-700 bg-red-100'
                    }`}>
                      {service.latency}ms
                    </span>
                  </div>
                )}

                {service.error && (
                  <div className="text-sm">
                    <span className="text-gray-600">Error:</span>
                    <p className="text-red-600 font-medium mt-1">{service.error}</p>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Auto-refresh indicator */}
      {autoRefresh && (
        <div className="text-center text-sm text-gray-500">
          <span className="inline-flex items-center space-x-1">
            <span className="animate-pulse w-2 h-2 bg-green-500 rounded-full"></span>
            <span>Auto-refreshing every {refreshInterval / 1000}s</span>
          </span>
        </div>
      )}
    </div>
  );
};
