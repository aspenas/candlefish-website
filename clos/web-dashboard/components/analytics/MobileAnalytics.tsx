'use client';

import React, { useState } from 'react';
import { useAnalyticsStore } from '../../stores/analyticsStore';
import { 
  Activity,
  Server,
  AlertTriangle,
  TrendingUp,
  Menu,
  X,
  RefreshCw
} from 'lucide-react';
import { cn } from '../../lib/utils';
import SystemOverviewWidget from './widgets/SystemOverviewWidget';
import AgentPerformanceChart from './widgets/AgentPerformanceChart';
import ServiceHealthGrid from './widgets/ServiceHealthGrid';
import AlertsWidget from './widgets/AlertsWidget';

interface MobileAnalyticsProps {
  className?: string;
}

const MobileAnalytics: React.FC<MobileAnalyticsProps> = ({ className }) => {
  const {
    systemOverview,
    agentPerformance,
    serviceHealth,
    alerts,
    isLoading,
    isConnected,
    fetchAnalyticsData,
  } = useAnalyticsStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'agents' | 'services' | 'alerts'>('overview');
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'agents', label: 'Agents', icon: TrendingUp },
    { id: 'services', label: 'Services', icon: Server },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
  ];

  // Get alert counts for badge
  const alertCounts = {
    total: alerts.length,
    unacknowledged: alerts.filter(a => !a.acknowledged).length,
    critical: alerts.filter(a => a.type === 'critical').length,
  };

  const handleRefresh = () => {
    fetchAnalyticsData();
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-4">
            <SystemOverviewWidget />
            
            {/* Quick Stats Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Agents</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {systemOverview?.activeAgents || 0}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-600 opacity-20" />
                </div>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Healthy Services</p>
                    <p className="text-2xl font-bold text-green-600">
                      {systemOverview?.healthyServices || 0}
                    </p>
                  </div>
                  <Server className="h-8 w-8 text-green-600 opacity-20" />
                </div>
              </div>
            </div>

            {/* Recent Performance Summary */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Performance Summary</h3>
              <AgentPerformanceChart 
                config={{ 
                  chartType: 'line', 
                  metrics: ['responseTime'], 
                  showComparison: false 
                }} 
              />
            </div>
          </div>
        );

      case 'agents':
        return (
          <div className="space-y-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Agent Performance</h3>
              <AgentPerformanceChart 
                config={{ 
                  chartType: 'area', 
                  metrics: ['responseTime', 'successRate'], 
                  showComparison: true 
                }} 
              />
            </div>

            {/* Agent Summary Cards */}
            <div className="space-y-2">
              {Array.from(new Set(agentPerformance.map(a => a.agentName))).slice(0, 5).map(agentName => {
                const latestMetric = agentPerformance
                  .filter(a => a.agentName === agentName)
                  .slice(-1)[0];
                
                if (!latestMetric) return null;

                return (
                  <div key={agentName} className="bg-white rounded-lg border border-gray-200 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{agentName}</h4>
                        <p className="text-sm text-gray-600">
                          Response: {latestMetric.responseTime.toFixed(0)}ms
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-medium ${
                          latestMetric.successRate > 0.95 ? 'text-green-600' : 
                          latestMetric.successRate > 0.9 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {(latestMetric.successRate * 100).toFixed(1)}%
                        </div>
                        <p className="text-xs text-gray-500">Success Rate</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'services':
        return (
          <div className="space-y-4">
            <ServiceHealthGrid />
          </div>
        );

      case 'alerts':
        return (
          <div className="space-y-4">
            <AlertsWidget 
              config={{ 
                limit: 20, 
                showFilters: true, 
                compactView: true 
              }} 
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={cn('flex flex-col h-full bg-gray-50', className)}>
      {/* Mobile Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-1 rounded-md hover:bg-gray-100 lg:hidden"
            >
              {showMobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Analytics</h1>
              <div className="flex items-center text-xs text-gray-600">
                <div 
                  className={cn(
                    'w-2 h-2 rounded-full mr-1',
                    isConnected ? 'bg-green-500' : 'bg-red-500'
                  )}
                />
                {isConnected ? 'Connected' : 'Disconnected'}
              </div>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className={cn(
              'p-2 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors',
              isLoading && 'opacity-50 cursor-not-allowed'
            )}
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </button>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="flex space-x-1 mt-3 bg-gray-100 p-1 rounded-lg">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const hasNotification = tab.id === 'alerts' && alertCounts.unacknowledged > 0;
            
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setShowMobileMenu(false);
                }}
                className={cn(
                  'flex-1 flex items-center justify-center space-x-1 px-2 py-2 rounded-md text-sm font-medium transition-colors relative',
                  isActive
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                
                {hasNotification && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">
                    {alertCounts.unacknowledged > 99 ? '99+' : alertCounts.unacknowledged}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden">
          <div className="bg-white w-64 h-full shadow-lg">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Navigation</h2>
            </div>
            <div className="p-2 space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const hasNotification = tab.id === 'alerts' && alertCounts.unacknowledged > 0;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as any);
                      setShowMobileMenu(false);
                    }}
                    className={cn(
                      'w-full flex items-center space-x-3 px-3 py-2 rounded-md text-left transition-colors',
                      isActive
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{tab.label}</span>
                    {hasNotification && (
                      <div className="ml-auto w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">
                        {alertCounts.unacknowledged}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading && !systemOverview ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mb-2 mx-auto" />
              <p className="text-gray-600">Loading analytics...</p>
            </div>
          </div>
        ) : (
          renderTabContent()
        )}
      </div>
    </div>
  );
};

export default MobileAnalytics;