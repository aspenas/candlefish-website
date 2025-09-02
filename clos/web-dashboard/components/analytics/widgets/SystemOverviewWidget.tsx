'use client';

import React from 'react';
import { useAnalyticsStore } from '../../../stores/analyticsStore';
import { 
  Activity,
  Server,
  Bot,
  Shield,
  Cpu,
  HardDrive,
  Wifi
} from 'lucide-react';
import { formatPercentage, formatBytes } from '../../../lib/utils';

const SystemOverviewWidget: React.FC = () => {
  const { systemOverview, agentPerformance, serviceHealth } = useAnalyticsStore();

  if (!systemOverview) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-gray-500">Loading system overview...</div>
      </div>
    );
  }

  const metrics = [
    {
      id: 'agents',
      label: 'Active Agents',
      value: systemOverview.activeAgents,
      total: systemOverview.totalAgents,
      icon: Bot,
      color: 'text-blue-600 bg-blue-100',
      trend: agentPerformance.length > 0 ? '+2.3%' : null,
    },
    {
      id: 'services',
      label: 'Healthy Services',
      value: systemOverview.healthyServices,
      total: systemOverview.totalServices,
      icon: Server,
      color: 'text-green-600 bg-green-100',
      trend: serviceHealth.filter(s => s.status === 'healthy').length > serviceHealth.length * 0.8 ? '+1.2%' : '-0.5%',
    },
    {
      id: 'cpu',
      label: 'System Load',
      value: formatPercentage(systemOverview.systemLoad),
      icon: Cpu,
      color: systemOverview.systemLoad > 0.8 ? 'text-red-600 bg-red-100' : 
             systemOverview.systemLoad > 0.6 ? 'text-yellow-600 bg-yellow-100' : 
             'text-green-600 bg-green-100',
      trend: systemOverview.systemLoad > 0.7 ? '+5.2%' : '-1.8%',
    },
    {
      id: 'memory',
      label: 'Memory Usage',
      value: formatPercentage(systemOverview.memoryUsage),
      icon: Activity,
      color: systemOverview.memoryUsage > 0.8 ? 'text-red-600 bg-red-100' : 
             systemOverview.memoryUsage > 0.6 ? 'text-yellow-600 bg-yellow-100' : 
             'text-green-600 bg-green-100',
      trend: systemOverview.memoryUsage > 0.6 ? '+3.1%' : '-2.4%',
    },
    {
      id: 'disk',
      label: 'Disk Usage',
      value: formatPercentage(systemOverview.diskUsage),
      icon: HardDrive,
      color: systemOverview.diskUsage > 0.8 ? 'text-red-600 bg-red-100' : 
             systemOverview.diskUsage > 0.6 ? 'text-yellow-600 bg-yellow-100' : 
             'text-green-600 bg-green-100',
      trend: '+0.8%',
    },
    {
      id: 'network',
      label: 'Network Activity',
      value: formatBytes(systemOverview.networkActivity),
      icon: Wifi,
      color: 'text-purple-600 bg-purple-100',
      trend: '+12.5%',
    },
  ];

  return (
    <div className="space-y-4">
      {/* System Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Shield className="h-5 w-5 text-green-600 mr-2" />
          <span className="text-lg font-semibold text-gray-900">System Status</span>
        </div>
        <div className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const isPercentage = typeof metric.value === 'string' && metric.value.includes('%');
          const isCount = typeof metric.value === 'number';
          
          return (
            <div
              key={metric.id}
              className="bg-gray-50 rounded-lg p-4 border border-gray-100"
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-md ${metric.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                {metric.trend && (
                  <span 
                    className={`text-xs font-medium ${
                      metric.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {metric.trend}
                  </span>
                )}
              </div>
              
              <div className="space-y-1">
                <div className="flex items-baseline">
                  <span className="text-xl font-bold text-gray-900">
                    {isCount ? metric.value : metric.value}
                  </span>
                  {metric.total && (
                    <span className="text-sm text-gray-500 ml-1">
                      / {metric.total}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">{metric.label}</p>
              </div>

              {/* Progress bar for percentage metrics */}
              {isPercentage && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        metric.color.includes('red') ? 'bg-red-500' :
                        metric.color.includes('yellow') ? 'bg-yellow-500' :
                        metric.color.includes('green') ? 'bg-green-500' :
                        'bg-blue-500'
                      }`}
                      style={{ 
                        width: metric.value
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Progress bar for count metrics */}
              {isCount && metric.total && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        metric.color.includes('red') ? 'bg-red-500' :
                        metric.color.includes('yellow') ? 'bg-yellow-500' :
                        metric.color.includes('green') ? 'bg-green-500' :
                        'bg-blue-500'
                      }`}
                      style={{ 
                        width: `${(metric.value / metric.total) * 100}%`
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* System Health Summary */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center">
          <Activity className="h-4 w-4 text-blue-600 mr-2" />
          <span className="text-sm font-medium text-blue-900">
            System Health: {
              systemOverview.systemLoad < 0.6 && systemOverview.memoryUsage < 0.7
                ? 'Excellent'
                : systemOverview.systemLoad < 0.8 && systemOverview.memoryUsage < 0.8
                ? 'Good'
                : 'Needs Attention'
            }
          </span>
        </div>
        {systemOverview.systemLoad > 0.8 && (
          <p className="text-xs text-blue-700 mt-1">
            High system load detected. Consider scaling resources.
          </p>
        )}
      </div>
    </div>
  );
};

export default SystemOverviewWidget;