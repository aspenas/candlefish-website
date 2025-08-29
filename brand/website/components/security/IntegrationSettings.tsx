'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/Card'

const IntegrationSettings: React.FC<{ className?: string }> = ({ className }) => {
  const [integrations, setIntegrations] = useState([
    {
      name: 'SIEM Integration',
      type: 'Splunk',
      status: 'connected',
      lastSync: Date.now() - 300000, // 5 minutes ago
      endpoint: 'https://splunk.company.com:8089'
    },
    {
      name: 'Email Gateway',
      type: 'Microsoft Exchange',
      status: 'connected',
      lastSync: Date.now() - 120000, // 2 minutes ago
      endpoint: 'exchange.company.com'
    },
    {
      name: 'Network Monitor',
      type: 'SolarWinds',
      status: 'error',
      lastSync: Date.now() - 3600000, // 1 hour ago
      endpoint: 'solarwinds.company.com'
    },
    {
      name: 'Cloud Security',
      type: 'AWS GuardDuty',
      status: 'disconnected',
      lastSync: 0,
      endpoint: 'Not configured'
    }
  ])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900'
      case 'error':
        return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900'
      case 'disconnected':
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900'
      default:
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900'
    }
  }

  const formatLastSync = (timestamp: number) => {
    if (timestamp === 0) return 'Never'
    const diff = Date.now() - timestamp
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
  }

  return (
    <Card className={`p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Integration Settings
      </h3>
      
      <div className="space-y-4">
        {integrations.map((integration) => (
          <div 
            key={integration.name}
            className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                  {integration.name}
                </h4>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(integration.status)}`}>
                  {integration.status}
                </span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <div>Type: {integration.type}</div>
                <div>Endpoint: {integration.endpoint}</div>
                <div>Last Sync: {formatLastSync(integration.lastSync)}</div>
              </div>
            </div>
            
            <div className="flex gap-2 ml-4">
              {integration.status === 'connected' && (
                <button className="px-3 py-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-300 rounded hover:bg-blue-50 dark:text-blue-400 dark:border-blue-600 dark:hover:bg-blue-900/20 transition-colors">
                  Test
                </button>
              )}
              <button 
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  integration.status === 'connected'
                    ? 'text-red-600 hover:text-red-800 border border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-600 dark:hover:bg-red-900/20'
                    : 'text-green-600 hover:text-green-800 border border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-600 dark:hover:bg-green-900/20'
                }`}
              >
                {integration.status === 'connected' ? 'Disconnect' : 'Configure'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500">
          Add New Integration
        </button>
      </div>
    </Card>
  )
}

export default IntegrationSettings