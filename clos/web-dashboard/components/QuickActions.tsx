'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { serviceApi, healthApi, queryKeys } from '@/lib/api'

export function QuickActions() {
  const [lastAction, setLastAction] = useState<string | null>(null)
  const [actionResults, setActionResults] = useState<Record<string, { success: boolean; message: string; timestamp: Date }>>({})
  const queryClient = useQueryClient()

  // Get all services to perform bulk operations
  const { data: services = [] } = useQuery({
    queryKey: queryKeys.services,
    queryFn: serviceApi.getServices,
  })

  // Bulk start services mutation
  const startAllMutation = useMutation({
    mutationFn: async () => {
      const stoppedServices = services.filter(s => s.status === 'stopped')
      if (stoppedServices.length === 0) {
        return { total: 0, successful: 0, failed: 0 }
      }
      
      const result = await serviceApi.batchStartServices(stoppedServices.map(s => s.id))
      return result
    },
    onSuccess: (result) => {
      setActionResults(prev => ({
        ...prev,
        'start-all': {
          success: result.successful > 0,
          message: `Started ${result.successful}/${result.total} services${result.failed > 0 ? ` (${result.failed} failed)` : ''}`,
          timestamp: new Date()
        }
      }))
      queryClient.invalidateQueries({ queryKey: queryKeys.services })
    },
    onError: (error: any) => {
      setActionResults(prev => ({
        ...prev,
        'start-all': {
          success: false,
          message: error?.message || 'Failed to start services',
          timestamp: new Date()
        }
      }))
    }
  })

  // Bulk stop services mutation  
  const stopAllMutation = useMutation({
    mutationFn: async () => {
      const runningServices = services.filter(s => s.status === 'running')
      if (runningServices.length === 0) {
        return { total: 0, successful: 0, failed: 0 }
      }
      
      const result = await serviceApi.batchStopServices(runningServices.map(s => s.id))
      return result
    },
    onSuccess: (result) => {
      setActionResults(prev => ({
        ...prev,
        'stop-all': {
          success: result.successful > 0,
          message: `Stopped ${result.successful}/${result.total} services${result.failed > 0 ? ` (${result.failed} failed)` : ''}`,
          timestamp: new Date()
        }
      }))
      queryClient.invalidateQueries({ queryKey: queryKeys.services })
    },
    onError: (error: any) => {
      setActionResults(prev => ({
        ...prev,
        'stop-all': {
          success: false,
          message: error?.message || 'Failed to stop services',
          timestamp: new Date()
        }
      }))
    }
  })

  // Health check mutation
  const healthCheckMutation = useMutation({
    mutationFn: healthApi.getSystemHealth,
    onSuccess: (result) => {
      setActionResults(prev => ({
        ...prev,
        'health-check': {
          success: result.docker?.status === 'healthy' && result.network?.status === 'healthy',
          message: `Docker: ${result.docker?.status || 'unknown'}, Network: ${result.network?.status || 'unknown'}, Services: ${result.running_services || 0}/${result.total_services || 0} running`,
          timestamp: new Date()
        }
      }))
      queryClient.invalidateQueries({ queryKey: queryKeys.systemHealth })
    },
    onError: () => {
      setActionResults(prev => ({
        ...prev,
        'health-check': {
          success: false,
          message: 'Health check failed',
          timestamp: new Date()
        }
      }))
    }
  })

  const actions = [
    { 
      id: 'start-all',
      label: 'Start All Services', 
      icon: '▶️',
      action: () => startAllMutation.mutate(),
      loading: startAllMutation.isPending,
      disabled: services.filter(s => s.status === 'stopped').length === 0
    },
    { 
      id: 'stop-all',
      label: 'Stop All Services', 
      icon: '⏹️',
      action: () => stopAllMutation.mutate(),
      loading: stopAllMutation.isPending,
      disabled: services.filter(s => s.status === 'running').length === 0
    },
    { 
      id: 'health-check',
      label: 'Check Health', 
      icon: '❤️',
      action: () => healthCheckMutation.mutate(),
      loading: healthCheckMutation.isPending,
      disabled: false
    },
    { 
      id: 'view-logs',
      label: 'View All Logs', 
      icon: '📄',
      action: () => {
        // Open logs in a new tab or trigger log viewer
        setActionResults(prev => ({
          ...prev,
          'view-logs': {
            success: true,
            message: 'Log viewer feature coming soon',
            timestamp: new Date()
          }
        }))
      },
      loading: false,
      disabled: false
    },
    { 
      id: 'resolve-conflicts',
      label: 'Resolve Conflicts', 
      icon: '🔧',
      action: () => {
        // Port conflict resolution
        setActionResults(prev => ({
          ...prev,
          'resolve-conflicts': {
            success: true,
            message: 'Conflict resolution feature coming soon',
            timestamp: new Date()
          }
        }))
      },
      loading: false,
      disabled: false
    },
    { 
      id: 'refresh',
      label: 'Refresh Data', 
      icon: '🔄',
      action: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.services })
        queryClient.invalidateQueries({ queryKey: queryKeys.systemHealth })
        setActionResults(prev => ({
          ...prev,
          'refresh': {
            success: true,
            message: 'Data refreshed successfully',
            timestamp: new Date()
          }
        }))
      },
      loading: false,
      disabled: false
    },
  ]

  const handleAction = (actionItem: typeof actions[0]) => {
    setLastAction(actionItem.id)
    actionItem.action()
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          Quick Actions
        </h3>
        {lastAction && actionResults[lastAction] && (
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Last: {actionResults[lastAction].timestamp.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Action Results Banner */}
      {lastAction && actionResults[lastAction] && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          actionResults[lastAction].success
            ? 'bg-green-50 border border-green-200 text-green-800 dark:bg-green-900 dark:border-green-800 dark:text-green-200'
            : 'bg-red-50 border border-red-200 text-red-800 dark:bg-red-900 dark:border-red-800 dark:text-red-200'
        }`}>
          {actionResults[lastAction].message}
        </div>
      )}
      
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => handleAction(action)}
            disabled={action.disabled || action.loading}
            className={`flex flex-col items-center justify-center p-3 rounded-lg transition-colors relative ${
              action.disabled || action.loading
                ? 'bg-slate-50 dark:bg-slate-700 cursor-not-allowed opacity-50'
                : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-700 dark:hover:bg-slate-600'
            }`}
          >
            {action.loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-600 rounded-lg">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-300 border-t-blue-600"></div>
              </div>
            )}
            <span className="text-2xl mb-1">{action.icon}</span>
            <span className="text-xs text-slate-700 dark:text-slate-300 text-center">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}