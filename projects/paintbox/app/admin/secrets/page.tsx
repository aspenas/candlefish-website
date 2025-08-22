'use client';

import React, { useState } from 'react';
import {
  SecretsManagementDashboard,
  ServiceStatusMonitor,
  AuditLogViewer,
  SecurityConfigurationPanel
} from '@/components/secrets';
import { Button } from '@/components/ui/Button';

type ActiveTab = 'dashboard' | 'monitor' | 'audit' | 'security';

export default function SecretsManagementPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  const tabs = [
    { id: 'dashboard' as ActiveTab, name: 'Dashboard', icon: '📊' },
    { id: 'monitor' as ActiveTab, name: 'Service Monitor', icon: '🔍' },
    { id: 'audit' as ActiveTab, name: 'Audit Logs', icon: '📋' },
    { id: 'security' as ActiveTab, name: 'Security Config', icon: '🔒' }
  ];

  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <SecretsManagementDashboard />;
      case 'monitor':
        return <ServiceStatusMonitor />;
      case 'audit':
        return <AuditLogViewer />;
      case 'security':
        return <SecurityConfigurationPanel />;
      default:
        return <SecretsManagementDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Secrets Management</h1>
              <p className="text-gray-600 mt-1">
                Secure configuration and monitoring for Eggshell integrations
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>System Healthy</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderActiveComponent()}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <div>
              <p>Eggshell Secrets Management System</p>
              <p className="mt-1">Environment: Production • Region: us-east-1</p>
            </div>
            <div className="text-right">
              <p>Last Security Scan: {new Date().toLocaleDateString()}</p>
              <p className="mt-1">Next Rotation: {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
