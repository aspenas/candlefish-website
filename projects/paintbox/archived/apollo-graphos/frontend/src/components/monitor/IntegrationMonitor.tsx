import React, { useState, useEffect } from 'react'
import { useQuery, useSubscription } from '@apollo/client'
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  QuestionMarkCircleIcon,
  ArrowPathIcon,
  ChartBarIcon,
  ClockIcon,
  WifiIcon,
  SignalIcon,
  ServerIcon
} from '@heroicons/react/24/outline'
import { GET_INTEGRATION_STATUS, GET_SYNC_PROGRESS } from '@/graphql/queries'
import { INTEGRATION_STATUS_UPDATED, SYNC_PROGRESS_UPDATED, WEBSOCKET_CONNECTION_STATUS } from '@/graphql/subscriptions'
import { IntegrationStatus, SyncProgress, HealthStatus, SyncStatus, WebSocketConnectionStatus } from '@/types'
import { formatRelativeTime } from '@/utils/formatters'

interface IntegrationMonitorProps {
  className?: string
}

export const IntegrationMonitor: React.FC<IntegrationMonitorProps> = ({
  className = ''
}) => {
  const [wsStatus, setWsStatus] = useState<WebSocketConnectionStatus>({
    connected: false,
    reconnecting: false,
    reconnectAttempts: 0
  })

  // GraphQL queries
  const {
    data: integrationsData,
    loading: integrationsLoading,
    error: integrationsError,
    refetch: refetchIntegrations
  } = useQuery(GET_INTEGRATION_STATUS, {
    errorPolicy: 'all',
    pollInterval: 30000 // Poll every 30 seconds
  })

  const {
    data: syncData,
    loading: syncLoading,
    refetch: refetchSync
  } = useQuery(GET_SYNC_PROGRESS, {
    errorPolicy: 'all',
    pollInterval: 5000 // Poll every 5 seconds for active syncs
  })

  // Subscriptions for real-time updates
  useSubscription(INTEGRATION_STATUS_UPDATED, {
    onData: ({ data }) => {
      if (data.data?.integrationStatusUpdated) {
        refetchIntegrations()
      }
    }
  })

  useSubscription(SYNC_PROGRESS_UPDATED, {
    onData: ({ data }) => {
      if (data.data?.syncProgressUpdated) {
        refetchSync()
      }
    }
  })

  useSubscription(WEBSOCKET_CONNECTION_STATUS, {
    onData: ({ data }) => {
      if (data.data?.connectionStatus) {
        setWsStatus(prev => ({
          ...prev,
          connected: data.data.connectionStatus.connected,
          lastConnectedAt: data.data.connectionStatus.connected ? new Date().toISOString() : prev.lastConnectedAt,
          lastDisconnectedAt: !data.data.connectionStatus.connected ? new Date().toISOString() : prev.lastDisconnectedAt
        }))
      }
    }
  })

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setWsStatus(prev => ({ ...prev, connected: true, reconnecting: false }))
    }

    const handleOffline = () => {
      setWsStatus(prev => ({
        ...prev,
        connected: false,
        reconnecting: false,
        lastDisconnectedAt: new Date().toISOString()
      }))
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const getHealthIcon = (status: HealthStatus) => {
    switch (status) {
      case HealthStatus.HEALTHY:
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />
      case HealthStatus.WARNING:
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
      case HealthStatus.ERROR:
        return <XCircleIcon className="h-5 w-5 text-red-600" />
      default:
        return <QuestionMarkCircleIcon className="h-5 w-5 text-gray-600" />
    }
  }

  const getHealthColor = (status: HealthStatus) => {
    switch (status) {
      case HealthStatus.HEALTHY:
        return 'bg-green-100 border-green-200 text-green-800'
      case HealthStatus.WARNING:
        return 'bg-yellow-100 border-yellow-200 text-yellow-800'
      case HealthStatus.ERROR:
        return 'bg-red-100 border-red-200 text-red-800'
      default:
        return 'bg-gray-100 border-gray-200 text-gray-800'
    }
  }

  const getSyncStatusColor = (status: SyncStatus) => {
    switch (status) {
      case SyncStatus.COMPLETED:
        return 'bg-green-100 text-green-800'
      case SyncStatus.IN_PROGRESS:
        return 'bg-blue-100 text-blue-800'
      case SyncStatus.FAILED:
        return 'bg-red-100 text-red-800'
      case SyncStatus.CANCELLED:
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  const integrations = integrationsData?.integrations || []
  const syncProgresses = syncData?.syncProgress || []
  const activeSyncs = syncProgresses.filter(sync => sync.status === SyncStatus.IN_PROGRESS)

  // Calculate overall system health
  const systemHealth = integrations.length > 0 ? (
    integrations.every(i => i.status === HealthStatus.HEALTHY) ? HealthStatus.HEALTHY :
    integrations.some(i => i.status === HealthStatus.ERROR) ? HealthStatus.ERROR :
    HealthStatus.WARNING
  ) : HealthStatus.UNKNOWN

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integration Monitor</h1>
          <p className="text-gray-600 mt-1">
            Monitor external API health and sync progress
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              refetchIntegrations()
              refetchSync()
            }}
            disabled={integrationsLoading || syncLoading}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-4 w-4 mr-2 ${(integrationsLoading || syncLoading) ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg ${getHealthColor(systemHealth)}`}>
              {getHealthIcon(systemHealth)}
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">System Health</p>
              <p className="text-lg font-bold text-gray-900">
                {systemHealth.charAt(0) + systemHealth.slice(1).toLowerCase()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ServerIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Integrations</p>
              <p className="text-lg font-bold text-gray-900">
                {integrations.filter(i => i.status === HealthStatus.HEALTHY).length}/{integrations.length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ArrowPathIcon className="w-5 h-5 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Syncs</p>
              <p className="text-lg font-bold text-gray-900">{activeSyncs.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg ${wsStatus.connected ? 'bg-green-100' : 'bg-red-100'}`}>
              <WifiIcon className={`w-5 h-5 ${wsStatus.connected ? 'text-green-600' : 'text-red-600'}`} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">WebSocket</p>
              <p className="text-lg font-bold text-gray-900">
                {wsStatus.connected ? 'Connected' : 'Disconnected'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Syncs */}
      {activeSyncs.length > 0 && (
        <div className="bg-white rounded-lg shadow border">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Active Syncs</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {activeSyncs.map((sync) => (
              <div key={sync.id} className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{sync.integration}</h4>
                    <p className="text-sm text-gray-600">
                      Started {formatRelativeTime(sync.startedAt)}
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSyncStatusColor(sync.status)}`}>
                    {sync.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${sync.progress}%` }}
                  ></div>
                </div>

                <div className="flex justify-between text-xs text-gray-600">
                  <span>{sync.progress.toFixed(1)}% complete</span>
                  {sync.total && (
                    <span>
                      {sync.recordsProcessed || 0} / {sync.total} records
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Integration Status */}
      <div className="bg-white rounded-lg shadow border">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Integration Status</h3>
        </div>

        {integrationsLoading && integrations.length === 0 ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading integrations...</p>
          </div>
        ) : integrations.length === 0 ? (
          <div className="p-12 text-center">
            <ServerIcon className="mx-auto h-16 w-16 text-gray-400" />
            <h4 className="text-lg font-medium text-gray-900 mt-4">No integrations found</h4>
            <p className="text-gray-600 mt-2">
              Configure integrations to monitor their health status
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {integrations.map((integration) => (
              <div key={integration.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg border ${getHealthColor(integration.status)}`}>
                      {getHealthIcon(integration.status)}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{integration.name}</h4>
                      <p className="text-sm text-gray-600">{integration.type}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getHealthColor(integration.status)}`}>
                      {integration.status.toLowerCase()}
                    </span>
                    <p className="text-xs text-gray-600 mt-1">
                      Last check: {formatRelativeTime(integration.lastCheckAt)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  {integration.responseTime && (
                    <div className="flex items-center text-gray-600">
                      <ClockIcon className="h-4 w-4 mr-2" />
                      <span>{integration.responseTime}ms</span>
                    </div>
                  )}

                  {integration.metadata?.endpoint && (
                    <div className="flex items-center text-gray-600">
                      <SignalIcon className="h-4 w-4 mr-2" />
                      <span className="truncate">{integration.metadata.endpoint}</span>
                    </div>
                  )}

                  {integration.metadata?.version && (
                    <div className="flex items-center text-gray-600">
                      <ChartBarIcon className="h-4 w-4 mr-2" />
                      <span>v{integration.metadata.version}</span>
                    </div>
                  )}
                </div>

                {integration.errorMessage && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                    <strong>Error:</strong> {integration.errorMessage}
                  </div>
                )}

                {integration.metadata?.rateLimitRemaining !== undefined && (
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
                    <span>Rate limit: {integration.metadata.rateLimitRemaining} remaining</span>
                    {integration.metadata.rateLimitResetAt && (
                      <span>Resets {formatRelativeTime(integration.metadata.rateLimitResetAt)}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* WebSocket Connection Details */}
      <div className="bg-white rounded-lg shadow border">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">WebSocket Connection</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Status:</span>
              <span className={`font-medium ${wsStatus.connected ? 'text-green-600' : 'text-red-600'}`}>
                {wsStatus.connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-600">Reconnecting:</span>
              <span className={`font-medium ${wsStatus.reconnecting ? 'text-yellow-600' : 'text-gray-900'}`}>
                {wsStatus.reconnecting ? 'Yes' : 'No'}
              </span>
            </div>

            {wsStatus.lastConnectedAt && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Last connected:</span>
                <span className="font-medium text-gray-900">
                  {formatRelativeTime(wsStatus.lastConnectedAt)}
                </span>
              </div>
            )}

            {wsStatus.lastDisconnectedAt && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Last disconnected:</span>
                <span className="font-medium text-gray-900">
                  {formatRelativeTime(wsStatus.lastDisconnectedAt)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-gray-600">Reconnect attempts:</span>
              <span className="font-medium text-gray-900">{wsStatus.reconnectAttempts}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
