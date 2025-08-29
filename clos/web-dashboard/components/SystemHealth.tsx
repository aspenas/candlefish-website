'use client'

import { useQuery } from '@tanstack/react-query'
import { healthApi, queryKeys } from '@/lib/api'

export function SystemHealth() {
  const { data: systemHealth, isLoading, error } = useQuery({
    queryKey: queryKeys.systemHealth,
    queryFn: healthApi.getSystemHealth,
    refetchInterval: 30000, // Refetch every 30 seconds
  })

  const getStatusColor = (status: string) => {
    return status === 'healthy' 
      ? 'text-green-600 dark:text-green-400'
      : 'text-red-600 dark:text-red-400'
  }

  const formatUptime = (uptime: number) => {
    // Convert seconds to human-readable format
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">
          System Health
        </h3>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex justify-between items-center">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-20"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">
          System Health
        </h3>
        <div className="text-sm text-red-600 dark:text-red-400">
          Failed to load system health
        </div>
      </div>
    )
  }

  const metrics = [
    { 
      label: 'Docker', 
      status: systemHealth?.docker?.status || 'unknown', 
      value: systemHealth?.docker?.status === 'healthy' ? 'Running' : 'Unavailable' 
    },
    { 
      label: 'Network', 
      status: systemHealth?.network?.status || 'unknown', 
      value: systemHealth?.network?.status === 'healthy' ? 'Connected' : 'Disconnected' 
    },
    { 
      label: 'Services', 
      status: (systemHealth?.running_services && systemHealth.running_services > 0) ? 'healthy' : 'unhealthy', 
      value: systemHealth ? `${systemHealth.running_services || 0}/${systemHealth.total_services || 0} running` : '0/0 running'
    },
    { 
      label: 'Uptime', 
      status: 'healthy', 
      value: systemHealth?.uptime ? formatUptime(systemHealth.uptime) : 'unknown'
    },
  ]

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">
        System Health
      </h3>
      <div className="space-y-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="flex justify-between items-center">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {metric.label}
            </span>
            <span className={`text-sm font-medium ${getStatusColor(metric.status)}`}>
              {metric.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}