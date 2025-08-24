import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  Activity,
  Grid3X3,
  Bell,
  Download,
  Settings,
  Menu,
  X,
  Maximize2,
  Minimize2,
  RefreshCw,
  Wifi,
  WifiOff,
  Filter,
  Search,
  Users,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';

// Import all our components
import { RealtimeCharts } from './RealtimeCharts';
import { HistoricalCharts } from './HistoricalCharts';
import { VirtualizedAgentGrid } from './VirtualizedAgentGrid';
import { AlertConfiguration } from './AlertConfiguration';
import { ExportManager } from './ExportManager';
import { ThemeProvider, ThemeToggle, useResponsive, ResponsiveContainer, ResponsiveGrid } from './ThemeProvider';
import { WebSocketService, MockWebSocketService, useWebSocket } from '../../services/websocket.service';

// Import types
import {
  Agent,
  AgentMetrics,
  RealtimeMetrics,
  Alert,
  AlertHistory,
  TimeRange,
  WebSocketMessage,
  HistoricalDataPoint
} from '../../types/rtpm.types';

interface RTMPDashboardProps {
  className?: string;
}

type DashboardView = 'overview' | 'realtime' | 'historical' | 'agents' | 'alerts';

interface DashboardState {
  agents: Agent[];
  agentMetrics: Map<string, AgentMetrics>;
  realtimeMetrics: RealtimeMetrics[];
  historicalData: HistoricalDataPoint[];
  alerts: Alert[];
  alertHistory: AlertHistory[];
  selectedAgents: string[];
  timeRange: TimeRange;
  isLoading: boolean;
  lastUpdated: Date;
}

const NavigationButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
  collapsed?: boolean;
}> = ({ icon, label, active, onClick, badge, collapsed = false }) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={`
      w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 relative
      ${active
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
        : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
      }
    `}
    title={collapsed ? label : undefined}
  >
    <div className="flex-shrink-0">
      {icon}
    </div>
    {!collapsed && (
      <>
        <span className="font-medium">{label}</span>
        {badge && badge > 0 && (
          <span className="ml-auto px-2 py-1 bg-red-500 text-white text-xs rounded-full min-w-[20px] text-center">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </>
    )}
    {collapsed && badge && badge > 0 && (
      <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full min-w-[20px] text-center">
        {badge > 9 ? '9+' : badge}
      </span>
    )}
  </motion.button>
);

const StatusCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: string; positive: boolean };
  color?: string;
}> = ({ title, value, icon, trend, color = 'text-blue-400' }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-gray-600 transition-colors"
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-gray-400 text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold text-white mt-1">{value}</p>
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-sm ${
            trend.positive ? 'text-green-400' : 'text-red-400'
          }`}>
            <TrendingUp className={`w-4 h-4 ${!trend.positive ? 'rotate-180' : ''}`} />
            <span>{trend.value}</span>
          </div>
        )}
      </div>
      <div className={`p-3 rounded-lg bg-gray-700/50 ${color}`}>
        {icon}
      </div>
    </div>
  </motion.div>
);

const Sidebar: React.FC<{
  activeView: DashboardView;
  onViewChange: (view: DashboardView) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  alertCount: number;
  connectionState: string;
}> = ({ activeView, onViewChange, collapsed, onToggleCollapse, alertCount, connectionState }) => {
  const navigation = [
    { id: 'overview' as DashboardView, label: 'Overview', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'realtime' as DashboardView, label: 'Real-time', icon: <Activity className="w-5 h-5" /> },
    { id: 'historical' as DashboardView, label: 'Historical', icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'agents' as DashboardView, label: 'Agents', icon: <Grid3X3 className="w-5 h-5" /> },
    { id: 'alerts' as DashboardView, label: 'Alerts', icon: <Bell className="w-5 h-5" />, badge: alertCount }
  ];

  return (
    <motion.aside
      animate={{ width: collapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="bg-gray-900/50 backdrop-blur-sm border-r border-gray-700 flex flex-col h-full"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div>
              <h1 className="text-white font-bold text-lg">RTPM Dashboard</h1>
              <p className="text-gray-400 text-sm">Real-time Performance Monitoring</p>
            </div>
          )}
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white"
          >
            {collapsed ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map(item => (
          <NavigationButton
            key={item.id}
            icon={item.icon}
            label={item.label}
            active={activeView === item.id}
            onClick={() => onViewChange(item.id)}
            badge={item.badge}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* Connection Status */}
      <div className="p-4 border-t border-gray-700">
        <div className={`flex items-center gap-2 ${collapsed ? 'justify-center' : ''}`}>
          {connectionState === 'connected' ? (
            <Wifi className="w-4 h-4 text-green-400" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-400" />
          )}
          {!collapsed && (
            <span className={`text-sm ${
              connectionState === 'connected' ? 'text-green-400' : 'text-red-400'
            }`}>
              {connectionState === 'connected' ? 'Connected' : 'Disconnected'}
            </span>
          )}
        </div>
      </div>
    </motion.aside>
  );
};

const TopBar: React.FC<{
  onRefresh: () => void;
  onExport: () => void;
  onMobileMenuToggle: () => void;
  isLoading: boolean;
  lastUpdated: Date;
  isMobile: boolean;
}> = ({ onRefresh, onExport, onMobileMenuToggle, isLoading, lastUpdated, isMobile }) => (
  <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 px-4 py-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        {isMobile && (
          <button
            onClick={onMobileMenuToggle}
            className="p-2 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div>
          <h2 className="text-white font-semibold">Agent Performance Monitor</h2>
          <p className="text-gray-400 text-sm">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-2 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white disabled:opacity-50"
          title="Refresh data"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>

        <button
          onClick={onExport}
          className="p-2 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white"
          title="Export data"
        >
          <Download className="w-5 h-5" />
        </button>

        <ThemeToggle />
      </div>
    </div>
  </header>
);

const OverviewView: React.FC<{
  agents: Agent[];
  agentMetrics: Map<string, AgentMetrics>;
  realtimeMetrics: RealtimeMetrics[];
  alertHistory: AlertHistory[];
}> = ({ agents, agentMetrics, realtimeMetrics, alertHistory }) => {
  const stats = useMemo(() => {
    const onlineAgents = agents.filter(a => a.status === 'online').length;
    const totalAgents = agents.length;
    const latestMetrics = realtimeMetrics[realtimeMetrics.length - 1];
    const recentAlerts = alertHistory.filter(a =>
      Date.now() - a.triggeredAt.getTime() < 24 * 60 * 60 * 1000
    ).length;

    return {
      totalAgents,
      onlineAgents,
      avgResponseTime: latestMetrics?.system.avgResponseTime || 0,
      recentAlerts
    };
  }, [agents, realtimeMetrics, alertHistory]);

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <ResponsiveGrid cols={{ mobile: 1, tablet: 2, desktop: 4 }}>
        <StatusCard
          title="Total Agents"
          value={stats.totalAgents}
          icon={<Users className="w-6 h-6" />}
          color="text-blue-400"
        />
        <StatusCard
          title="Online Agents"
          value={stats.onlineAgents}
          icon={<Activity className="w-6 h-6" />}
          trend={{ value: `${Math.round((stats.onlineAgents / stats.totalAgents) * 100)}%`, positive: true }}
          color="text-green-400"
        />
        <StatusCard
          title="Avg Response Time"
          value={`${Math.round(stats.avgResponseTime)}ms`}
          icon={<TrendingUp className="w-6 h-6" />}
          trend={{ value: '12% faster', positive: true }}
          color="text-yellow-400"
        />
        <StatusCard
          title="Recent Alerts"
          value={stats.recentAlerts}
          icon={<AlertTriangle className="w-6 h-6" />}
          trend={{ value: '5 resolved', positive: true }}
          color="text-red-400"
        />
      </ResponsiveGrid>

      {/* Charts Overview */}
      {realtimeMetrics.length > 0 && (
        <ResponsiveContainer>
          <RealtimeCharts
            data={realtimeMetrics}
            agentMetrics={new Map()}
            timeRange="1h"
          />
        </ResponsiveContainer>
      )}
    </div>
  );
};

const MobileNavigation: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  activeView: DashboardView;
  onViewChange: (view: DashboardView) => void;
  alertCount: number;
}> = ({ isOpen, onClose, activeView, onViewChange, alertCount }) => {
  const navigation = [
    { id: 'overview' as DashboardView, label: 'Overview', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'realtime' as DashboardView, label: 'Real-time', icon: <Activity className="w-5 h-5" /> },
    { id: 'historical' as DashboardView, label: 'Historical', icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'agents' as DashboardView, label: 'Agents', icon: <Grid3X3 className="w-5 h-5" /> },
    { id: 'alerts' as DashboardView, label: 'Alerts', icon: <Bell className="w-5 h-5" />, badge: alertCount }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />
          <motion.nav
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed left-0 top-0 h-full w-80 bg-gray-900/95 backdrop-blur-md border-r border-gray-700 z-50 overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-white font-bold text-lg">RTPM Dashboard</h1>
                  <p className="text-gray-400 text-sm">Real-time Performance Monitoring</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2">
                {navigation.map(item => (
                  <NavigationButton
                    key={item.id}
                    icon={item.icon}
                    label={item.label}
                    active={activeView === item.id}
                    onClick={() => {
                      onViewChange(item.id);
                      onClose();
                    }}
                    badge={item.badge}
                  />
                ))}
              </div>
            </div>
          </motion.nav>
        </>
      )}
    </AnimatePresence>
  );
};

const RTMPDashboardContent: React.FC<RTMPDashboardProps> = ({ className = '' }) => {
  const [activeView, setActiveView] = useState<DashboardView>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showExportManager, setShowExportManager] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');

  const { isMobile, isTablet } = useResponsive();

  // Dashboard state
  const [dashboardState, setDashboardState] = useState<DashboardState>({
    agents: [],
    agentMetrics: new Map(),
    realtimeMetrics: [],
    historicalData: [],
    alerts: [],
    alertHistory: [],
    selectedAgents: [],
    timeRange: '24h',
    isLoading: true,
    lastUpdated: new Date()
  });

  // WebSocket connection
  const { connectionState, service } = useWebSocket(
    {
      url: process.env.NODE_ENV === 'development'
        ? 'ws://localhost:8000/ws/metrics/stream'
        : 'wss://api.candlefish.ai/ws/metrics/stream',
      subscriptions: ['metrics', 'alerts', 'agent_status']
    },
    {
      onMetrics: (metrics: RealtimeMetrics) => {
        setDashboardState(prev => ({
          ...prev,
          realtimeMetrics: [...prev.realtimeMetrics.slice(-23), metrics],
          lastUpdated: new Date()
        }));
      },
      onAgentMetrics: (agentId: string, metrics: AgentMetrics) => {
        setDashboardState(prev => {
          const newAgentMetrics = new Map(prev.agentMetrics);
          const existingMetrics = newAgentMetrics.get(agentId) || [];
          newAgentMetrics.set(agentId, [...existingMetrics.slice(-99), metrics]);

          return {
            ...prev,
            agentMetrics: newAgentMetrics,
            lastUpdated: new Date()
          };
        });
      },
      onAlert: (alert: AlertHistory) => {
        setDashboardState(prev => ({
          ...prev,
          alertHistory: [alert, ...prev.alertHistory.slice(0, 99)],
          lastUpdated: new Date()
        }));
      },
      onAgentStatus: (agentId: string, status: Agent['status']) => {
        setDashboardState(prev => ({
          ...prev,
          agents: prev.agents.map(agent =>
            agent.id === agentId ? { ...agent, status, lastSeen: new Date() } : agent
          ),
          lastUpdated: new Date()
        }));
      }
    }
  );

  // Initialize with mock data
  useEffect(() => {
    // Generate mock agents
    const mockAgents: Agent[] = Array.from({ length: 50 }, (_, i) => ({
      id: `agent-${i + 1}`,
      name: `Agent-${String(i + 1).padStart(3, '0')}`,
      status: ['online', 'offline', 'warning', 'error'][Math.floor(Math.random() * 4)] as Agent['status'],
      version: `v${Math.floor(Math.random() * 3) + 1}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`,
      capabilities: ['monitoring', 'analysis', 'reporting'].slice(0, Math.floor(Math.random() * 3) + 1),
      lastSeen: new Date(Date.now() - Math.random() * 3600000),
      region: ['us-east-1', 'us-west-2', 'eu-west-1'][Math.floor(Math.random() * 3)],
      platform: ['OpenAI', 'Anthropic', 'Google'][Math.floor(Math.random() * 3)]
    }));

    // Generate mock alerts
    const mockAlerts: Alert[] = Array.from({ length: 10 }, (_, i) => ({
      id: `alert-${i + 1}`,
      name: `Alert ${i + 1}`,
      description: `Mock alert ${i + 1}`,
      metric: ['cpu', 'memory', 'responseTime'][Math.floor(Math.random() * 3)] as any,
      operator: 'gt' as any,
      threshold: 80,
      actions: [],
      enabled: Math.random() > 0.3,
      severity: ['warning', 'error', 'critical'][Math.floor(Math.random() * 3)] as any,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    setDashboardState(prev => ({
      ...prev,
      agents: mockAgents,
      alerts: mockAlerts,
      isLoading: false
    }));
  }, []);

  const handleRefresh = () => {
    setDashboardState(prev => ({ ...prev, isLoading: true }));
    // Simulate refresh
    setTimeout(() => {
      setDashboardState(prev => ({
        ...prev,
        isLoading: false,
        lastUpdated: new Date()
      }));
    }, 1000);
  };

  const handleAgentSelect = (agent: Agent) => {
    console.log('Selected agent:', agent);
  };

  const alertCount = dashboardState.alertHistory.filter(a =>
    !a.acknowledged && Date.now() - a.triggeredAt.getTime() < 24 * 60 * 60 * 1000
  ).length;

  const renderContent = () => {
    switch (activeView) {
      case 'overview':
        return (
          <OverviewView
            agents={dashboardState.agents}
            agentMetrics={dashboardState.agentMetrics}
            realtimeMetrics={dashboardState.realtimeMetrics}
            alertHistory={dashboardState.alertHistory}
          />
        );

      case 'realtime':
        return (
          <RealtimeCharts
            data={dashboardState.realtimeMetrics}
            agentMetrics={dashboardState.agentMetrics}
            timeRange={timeRange}
          />
        );

      case 'historical':
        return (
          <HistoricalCharts
            data={dashboardState.historicalData}
            agents={dashboardState.agents}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
            isLoading={dashboardState.isLoading}
          />
        );

      case 'agents':
        return (
          <VirtualizedAgentGrid
            agents={dashboardState.agents}
            agentMetrics={dashboardState.agentMetrics}
            onAgentSelect={handleAgentSelect}
            selectedAgents={dashboardState.selectedAgents}
          />
        );

      case 'alerts':
        return (
          <AlertConfiguration
            alerts={dashboardState.alerts}
            agents={dashboardState.agents}
            onCreateAlert={(alert) => console.log('Create alert:', alert)}
            onUpdateAlert={(id, alert) => console.log('Update alert:', id, alert)}
            onDeleteAlert={(id) => console.log('Delete alert:', id)}
            onTestAlert={(alert) => console.log('Test alert:', alert)}
          />
        );

      default:
        return null;
    }
  };

  return (
    <ThemeProvider>
      <div className={`flex h-screen bg-background text-foreground ${className}`}>
        {/* Desktop Sidebar */}
        {!isMobile && (
          <Sidebar
            activeView={activeView}
            onViewChange={setActiveView}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            alertCount={alertCount}
            connectionState={connectionState}
          />
        )}

        {/* Mobile Navigation */}
        {isMobile && (
          <MobileNavigation
            isOpen={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
            activeView={activeView}
            onViewChange={setActiveView}
            alertCount={alertCount}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar
            onRefresh={handleRefresh}
            onExport={() => setShowExportManager(true)}
            onMobileMenuToggle={() => setMobileMenuOpen(true)}
            isLoading={dashboardState.isLoading}
            lastUpdated={dashboardState.lastUpdated}
            isMobile={isMobile}
          />

          <main className="flex-1 overflow-auto p-6">
            {renderContent()}
          </main>
        </div>

        {/* Export Manager Modal */}
        <ExportManager
          isOpen={showExportManager}
          onClose={() => setShowExportManager(false)}
          agents={dashboardState.agents}
          agentMetrics={dashboardState.agentMetrics}
          alerts={dashboardState.alertHistory}
        />
      </div>
    </ThemeProvider>
  );
};

export const RTMPDashboard: React.FC<RTMPDashboardProps> = (props) => {
  return <RTMPDashboardContent {...props} />;
};

export default RTMPDashboard;
