'use client';

import React, { useMemo } from 'react';
import { useAnalyticsStore } from '../../../stores/analyticsStore';
import { 
  Server,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Cpu,
  Activity,
  Zap
} from 'lucide-react';
import { getStatusColor, formatUptime, formatPercentage } from '../../../lib/utils';

const ServiceHealthGrid: React.FC = () => {
  const { serviceHealth, selectedServices, isLoading } = useAnalyticsStore();

  const filteredServices = useMemo(() => {
    return serviceHealth.filter(service => 
      selectedServices.length === 0 || selectedServices.includes(service.serviceName)
    );
  }, [serviceHealth, selectedServices]);

  const statusStats = useMemo(() => {
    const stats = {
      healthy: 0,
      warning: 0,
      critical: 0,
      down: 0,
    };

    filteredServices.forEach(service => {
      stats[service.status]++;
    });

    return stats;
  }, [filteredServices]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'down':
        return <XCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <Server className="h-4 w-4 text-gray-400" />;
    }
  };

  const formatResponseTime = (time: number) => {
    if (time < 1000) return `${Math.round(time)}ms`;
    return `${(time / 1000).toFixed(2)}s`;
  };

  if (isLoading && !serviceHealth.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading service health data...</div>
      </div>
    );
  }

  if (!filteredServices.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Server className="h-12 w-12 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500">No services to display</p>
          <p className="text-sm text-gray-400">Services will appear here once they're discovered</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Summary */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
          <div className="flex items-center justify-between">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-xl font-bold text-green-900">
              {statusStats.healthy}
            </span>
          </div>
          <p className="text-sm text-green-700 mt-1">Healthy</p>
        </div>

        <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
          <div className="flex items-center justify-between">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <span className="text-xl font-bold text-yellow-900">
              {statusStats.warning}
            </span>
          </div>
          <p className="text-sm text-yellow-700 mt-1">Warning</p>
        </div>

        <div className="bg-red-50 rounded-lg p-3 border border-red-200">
          <div className="flex items-center justify-between">
            <XCircle className="h-5 w-5 text-red-600" />
            <span className="text-xl font-bold text-red-900">
              {statusStats.critical}
            </span>
          </div>
          <p className="text-sm text-red-700 mt-1">Critical</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <div className="flex items-center justify-between">
            <XCircle className="h-5 w-5 text-gray-600" />
            <span className="text-xl font-bold text-gray-900">
              {statusStats.down}
            </span>
          </div>
          <p className="text-sm text-gray-700 mt-1">Down</p>
        </div>
      </div>

      {/* Services Grid */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredServices
          .sort((a, b) => {
            // Sort by status priority, then by name
            const statusPriority = { down: 4, critical: 3, warning: 2, healthy: 1 };
            const aPriority = statusPriority[a.status] || 0;
            const bPriority = statusPriority[b.status] || 0;
            
            if (aPriority !== bPriority) {
              return bPriority - aPriority;
            }
            
            return a.serviceName.localeCompare(b.serviceName);
          })
          .map((service) => (
            <div
              key={service.serviceId}
              className={`bg-white border-l-4 rounded-lg p-4 shadow-sm transition-all duration-200 hover:shadow-md ${
                service.status === 'healthy' ? 'border-l-green-500' :
                service.status === 'warning' ? 'border-l-yellow-500' :
                service.status === 'critical' ? 'border-l-red-500' :
                'border-l-gray-500'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  {getStatusIcon(service.status)}
                  <h4 className="text-lg font-semibold text-gray-900 ml-2">
                    {service.serviceName}
                  </h4>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(service.status)}`}>
                  {service.status.toUpperCase()}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Uptime */}
                <div className="flex items-center">
                  <Clock className="h-4 w-4 text-gray-500 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatUptime(service.uptime)}
                    </p>
                    <p className="text-xs text-gray-600">Uptime</p>
                  </div>
                </div>

                {/* Response Time */}
                <div className="flex items-center">
                  <Zap className="h-4 w-4 text-gray-500 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatResponseTime(service.responseTime)}
                    </p>
                    <p className="text-xs text-gray-600">Response</p>
                  </div>
                </div>

                {/* Memory Usage */}
                <div className="flex items-center">
                  <Activity className="h-4 w-4 text-gray-500 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatPercentage(service.memoryUsage)}
                    </p>
                    <p className="text-xs text-gray-600">Memory</p>
                  </div>
                </div>

                {/* CPU Usage */}
                <div className="flex items-center">
                  <Cpu className="h-4 w-4 text-gray-500 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatPercentage(service.cpuUsage)}
                    </p>
                    <p className="text-xs text-gray-600">CPU</p>
                  </div>
                </div>
              </div>

              {/* Error Rate Bar */}
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Error Rate</span>
                  <span>{formatPercentage(service.errorRate)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      service.errorRate > 0.1 ? 'bg-red-500' :
                      service.errorRate > 0.05 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(service.errorRate * 1000, 100)}%` }}
                  />
                </div>
              </div>

              {/* Last Check */}
              <div className="mt-2 text-xs text-gray-500">
                Last check: {new Date(service.lastCheck).toLocaleTimeString()}
              </div>

              {/* Service-specific alerts or warnings */}
              {(service.status === 'warning' || service.status === 'critical') && (
                <div className={`mt-3 p-2 rounded-md ${
                  service.status === 'warning' ? 'bg-yellow-50 text-yellow-800' : 'bg-red-50 text-red-800'
                }`}>
                  <p className="text-xs">
                    {service.status === 'warning' && service.responseTime > 1000 && 'High response time detected'}
                    {service.status === 'warning' && service.errorRate > 0.05 && 'Elevated error rate'}
                    {service.status === 'critical' && service.errorRate > 0.1 && 'Critical error rate'}
                    {service.status === 'critical' && service.responseTime > 5000 && 'Extremely high response time'}
                  </p>
                </div>
              )}
            </div>
          ))
        }
      </div>

      {/* Overall Health Indicator */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            Overall Service Health
          </span>
          <div className="flex items-center">
            {statusStats.critical > 0 || statusStats.down > 0 ? (
              <>
                <XCircle className="h-4 w-4 text-red-600 mr-1" />
                <span className="text-sm font-medium text-red-600">Critical Issues</span>
              </>
            ) : statusStats.warning > 0 ? (
              <>
                <AlertTriangle className="h-4 w-4 text-yellow-600 mr-1" />
                <span className="text-sm font-medium text-yellow-600">Some Issues</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                <span className="text-sm font-medium text-green-600">All Healthy</span>
              </>
            )}
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-600">
          {filteredServices.length} service{filteredServices.length !== 1 ? 's' : ''} monitored
        </div>
      </div>
    </div>
  );
};

export default ServiceHealthGrid;