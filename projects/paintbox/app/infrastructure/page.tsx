/**
 * Infrastructure Management Dashboard
 * Main page showcasing all infrastructure components
 */

'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Workflow,
  MessageSquare,
  Target,
  Shield,
  Bell,
  Settings,
  BarChart3,
} from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import {
  HealthMonitoringDashboard,
  TemporalWorkflowManager,
  SlackIntegrationPanel,
  LoadTestingConsole,
  DisasterRecoveryControlCenter,
  useWebSocketStatus,
  useRealTimeData,
} from '@/components/infrastructure';

// ===== TYPES =====

type DashboardTab =
  | 'overview'
  | 'health'
  | 'workflows'
  | 'slack'
  | 'load-testing'
  | 'disaster-recovery';

interface TabConfig {
  id: DashboardTab;
  label: string;
  icon: React.ReactNode;
  component: React.ComponentType;
  description: string;
}

// ===== CONFIGURATION =====

const tabs: TabConfig[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: <BarChart3 className="h-4 w-4" />,
    component: () => <OverviewDashboard />,
    description: 'System overview and key metrics',
  },
  {
    id: 'health',
    label: 'Health Monitoring',
    icon: <Activity className="h-4 w-4" />,
    component: HealthMonitoringDashboard,
    description: 'Real-time system health and performance',
  },
  {
    id: 'workflows',
    label: 'Workflows',
    icon: <Workflow className="h-4 w-4" />,
    component: TemporalWorkflowManager,
    description: 'Temporal workflow execution and monitoring',
  },
  {
    id: 'slack',
    label: 'Slack Integration',
    icon: <MessageSquare className="h-4 w-4" />,
    component: SlackIntegrationPanel,
    description: 'Webhook configuration and notifications',
  },
  {
    id: 'load-testing',
    label: 'Load Testing',
    icon: <Target className="h-4 w-4" />,
    component: LoadTestingConsole,
    description: 'Performance testing and metrics',
  },
  {
    id: 'disaster-recovery',
    label: 'Disaster Recovery',
    icon: <Shield className="h-4 w-4" />,
    component: DisasterRecoveryControlCenter,
    description: 'Backup management and failover controls',
  },
];

// ===== COMPONENTS =====

const OverviewDashboard: React.FC = () => {
  const wsStatus = useWebSocketStatus();
  const realTimeData = useRealTimeData();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return 'text-green-600 bg-green-50';
      case 'degraded':
      case 'connecting':
        return 'text-yellow-600 bg-yellow-50';
      case 'unhealthy':
      case 'disconnected':
      case 'error':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Infrastructure Overview</h1>
        <p className="text-gray-600 mt-1">
          Real-time monitoring and management of all infrastructure components
        </p>
      </div>

      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className={cn(
              'p-2 rounded-lg',
              realTimeData.healthStatus === 'healthy'
                ? 'bg-green-100 text-green-600'
                : realTimeData.healthStatus === 'degraded'
                ? 'bg-yellow-100 text-yellow-600'
                : 'bg-red-100 text-red-600'
            )}>
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-600">System Health</p>
              <p className="text-lg font-semibold capitalize">
                {realTimeData.healthStatus || 'Unknown'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              <Workflow className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Workflows</p>
              <p className="text-lg font-semibold">{realTimeData.activeWorkflows}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className={cn(
              'p-2 rounded-lg',
              realTimeData.activeLoadTests
                ? 'bg-orange-100 text-orange-600'
                : 'bg-gray-100 text-gray-600'
            )}>
              <Target className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Load Tests</p>
              <p className="text-lg font-semibold">
                {realTimeData.activeLoadTests ? 'Running' : 'Idle'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className={cn(
              'p-2 rounded-lg',
              realTimeData.unreadAlerts > 0
                ? 'bg-red-100 text-red-600'
                : 'bg-green-100 text-green-600'
            )}>
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Alerts</p>
              <p className="text-lg font-semibold">{realTimeData.unreadAlerts}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Connection Status */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={cn(
              'p-2 rounded-lg',
              wsStatus === 'connected'
                ? 'bg-green-100 text-green-600'
                : wsStatus === 'connecting'
                ? 'bg-yellow-100 text-yellow-600'
                : 'bg-red-100 text-red-600'
            )}>
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-medium">Real-time Connection</h3>
              <p className="text-sm text-gray-600">
                WebSocket status for live updates
              </p>
            </div>
          </div>
          <Badge className={cn('text-sm', getStatusColor(wsStatus))}>
            {wsStatus}
          </Badge>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button variant="outline" className="justify-start h-auto p-4">
            <div className="flex items-center space-x-3">
              <Activity className="h-5 w-5 text-blue-600" />
              <div className="text-left">
                <div className="font-medium">Health Check</div>
                <div className="text-sm text-gray-600">Run system health check</div>
              </div>
            </div>
          </Button>

          <Button variant="outline" className="justify-start h-auto p-4">
            <div className="flex items-center space-x-3">
              <Shield className="h-5 w-5 text-green-600" />
              <div className="text-left">
                <div className="font-medium">Trigger Backup</div>
                <div className="text-sm text-gray-600">Start full system backup</div>
              </div>
            </div>
          </Button>

          <Button variant="outline" className="justify-start h-auto p-4">
            <div className="flex items-center space-x-3">
              <Target className="h-5 w-5 text-purple-600" />
              <div className="text-left">
                <div className="font-medium">Load Test</div>
                <div className="text-sm text-gray-600">Run performance test</div>
              </div>
            </div>
          </Button>
        </div>
      </Card>

      {/* System Components */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">System Components</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tabs.slice(1).map((tab) => (
            <div
              key={tab.id}
              className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 rounded-lg bg-gray-100 text-gray-600">
                  {tab.icon}
                </div>
                <h4 className="font-medium">{tab.label}</h4>
              </div>
              <p className="text-sm text-gray-600">{tab.description}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

const TabNavigation: React.FC<{
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
}> = ({ activeTab, onTabChange }) => {
  return (
    <div className="border-b border-gray-200">
      <nav className="flex space-x-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors',
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

// ===== MAIN COMPONENT =====

export default function InfrastructurePage() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  const activeTabConfig = tabs.find(tab => tab.id === activeTab);
  const ActiveComponent = activeTabConfig?.component || OverviewDashboard;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Infrastructure Management
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  Comprehensive monitoring and management dashboard for all system components
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-sm">
                  Real-time
                </Badge>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </div>
            </div>
          </div>

          <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          <ActiveComponent />
        </motion.div>
      </div>
    </div>
  );
}
