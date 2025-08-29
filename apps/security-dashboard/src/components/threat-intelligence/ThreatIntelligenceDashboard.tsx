import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useSubscription } from '@apollo/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  TrendingUp,
  Users,
  Target,
  AlertTriangle,
  Globe,
  Activity,
  Clock,
  Filter,
  RefreshCw,
  Download,
  Settings,
  Eye,
  Search
} from 'lucide-react';

// GraphQL Operations
import {
  GET_THREAT_INTELLIGENCE_DASHBOARD,
  THREAT_INTELLIGENCE_UPDATES,
  IOC_MATCHES,
  NEW_IOCS
} from '../../graphql/threat-intelligence-operations';

// Components
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';

// Sub-components (to be created)
import { ThreatMetricsOverview } from './ThreatMetricsOverview';
import { ThreatActorNetwork } from './ThreatActorNetwork';
import { ThreatTimeline } from './ThreatTimeline';
import { IOCManagementPanel } from './IOCManagementPanel';
import { ThreatFeedStatus } from './ThreatFeedStatus';
import { GeographicThreatMap } from './GeographicThreatMap';
import { IndustryTargetingAnalysis } from './IndustryTargetingAnalysis';
import { CorrelationEnginePanel } from './CorrelationEnginePanel';
import { RecentThreatsList } from './RecentThreatsList';

// Hooks
import { useConnectionStatus } from '../../hooks/useConnectionStatus';

// Types
interface ThreatIntelligenceDashboardProps {
  organizationId: string;
  className?: string;
}

interface DashboardTab {
  id: string;
  name: string;
  icon: React.ElementType;
  component: React.ComponentType<any>;
  badge?: number;
}

interface TimeRange {
  start: string;
  end: string;
  label: string;
}

const TIME_RANGES: TimeRange[] = [
  { start: '1h', end: 'now', label: 'Last Hour' },
  { start: '24h', end: 'now', label: 'Last 24 Hours' },
  { start: '7d', end: 'now', label: 'Last 7 Days' },
  { start: '30d', end: 'now', label: 'Last 30 Days' },
  { start: '90d', end: 'now', label: 'Last 90 Days' }
];

export const ThreatIntelligenceDashboard: React.FC<ThreatIntelligenceDashboardProps> = ({
  organizationId,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState<TimeRange>(TIME_RANGES[1]); // Last 24 Hours
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [realtimeUpdates, setRealtimeUpdates] = useState(0);

  const { isConnected } = useConnectionStatus();

  // Main dashboard query
  const {
    data: dashboardData,
    loading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard
  } = useQuery(GET_THREAT_INTELLIGENCE_DASHBOARD, {
    variables: {
      organizationId,
      timeRange: {
        start: timeRange.start,
        end: timeRange.end
      }
    },
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
    pollInterval: autoRefresh ? refreshInterval : 0,
    notifyOnNetworkStatusChange: true
  });

  // Real-time subscriptions
  const { data: threatUpdates } = useSubscription(THREAT_INTELLIGENCE_UPDATES, {
    variables: { organizationId },
    onData: () => {
      setRealtimeUpdates(prev => prev + 1);
    },
    skip: !isConnected
  });

  const { data: iocMatches } = useSubscription(IOC_MATCHES, {
    variables: { organizationId },
    onData: () => {
      setRealtimeUpdates(prev => prev + 1);
    },
    skip: !isConnected
  });

  const { data: newIOCs } = useSubscription(NEW_IOCS, {
    variables: { organizationId },
    onData: () => {
      setRealtimeUpdates(prev => prev + 1);
    },
    skip: !isConnected
  });

  // Dashboard tabs configuration
  const dashboardTabs: DashboardTab[] = useMemo(() => {
    const overview = dashboardData?.threatIntelligenceDashboard?.overview;
    
    return [
      {
        id: 'overview',
        name: 'Overview',
        icon: Shield,
        component: ThreatMetricsOverview,
        badge: overview?.newThreats || 0
      },
      {
        id: 'actors',
        name: 'Threat Actors',
        icon: Users,
        component: ThreatActorNetwork,
        badge: overview?.trackedActors || 0
      },
      {
        id: 'campaigns',
        name: 'Campaigns',
        icon: Target,
        component: ThreatTimeline,
        badge: overview?.activeCampaigns || 0
      },
      {
        id: 'iocs',
        name: 'IOCs',
        icon: Search,
        component: IOCManagementPanel,
        badge: overview?.newIOCs || 0
      },
      {
        id: 'feeds',
        name: 'Threat Feeds',
        icon: Activity,
        component: ThreatFeedStatus
      },
      {
        id: 'geography',
        name: 'Geography',
        icon: Globe,
        component: GeographicThreatMap
      },
      {
        id: 'industries',
        name: 'Industries',
        icon: TrendingUp,
        component: IndustryTargetingAnalysis
      },
      {
        id: 'correlations',
        name: 'Correlations',
        icon: AlertTriangle,
        component: CorrelationEnginePanel
      }
    ];
  }, [dashboardData]);

  // Handle refresh
  const handleRefresh = () => {
    refetchDashboard();
    setRealtimeUpdates(prev => prev + 1);
  };

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(handleRefresh, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const CurrentTabComponent = dashboardTabs.find(tab => tab.id === activeTab)?.component || ThreatMetricsOverview;

  if (dashboardError && !dashboardData) {
    return (
      <Card className={`p-6 ${className}`}>
        <ErrorMessage
          title="Failed to Load Threat Intelligence Dashboard"
          message={dashboardError.message}
          onRetry={handleRefresh}
        />
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Dashboard Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Shield className="w-6 h-6 text-blue-400" />
              <h1 className="text-2xl font-bold text-white">
                Threat Intelligence Dashboard
              </h1>
            </div>
            
            {/* Connection Status */}
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="text-sm text-gray-400">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            {/* Realtime Update Counter */}
            {realtimeUpdates > 0 && (
              <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                <Activity className="w-3 h-3 mr-1" />
                {realtimeUpdates} live updates
              </Badge>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {/* Time Range Selector */}
            <select
              value={timeRange.label}
              onChange={(e) => {
                const selected = TIME_RANGES.find(tr => tr.label === e.target.value);
                if (selected) setTimeRange(selected);
              }}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
            >
              {TIME_RANGES.map(range => (
                <option key={range.label} value={range.label}>
                  {range.label}
                </option>
              ))}
            </select>

            {/* Auto Refresh Toggle */}
            <Button
              variant={autoRefresh ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="flex items-center space-x-1"
            >
              <Clock className="w-4 h-4" />
              <span>Auto</span>
            </Button>

            {/* Manual Refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={dashboardLoading}
              className="flex items-center space-x-1"
            >
              <RefreshCw className={`w-4 h-4 ${dashboardLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>

            {/* Export Data */}
            <Button
              variant="outline"
              size="sm"
              className="flex items-center space-x-1"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </Button>

            {/* Settings */}
            <Button
              variant="outline"
              size="sm"
              className="flex items-center space-x-1"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Quick Stats Bar */}
      {dashboardData?.threatIntelligenceDashboard?.overview && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"
        >
          {[
            {
              label: 'Total Threats',
              value: dashboardData.threatIntelligenceDashboard.overview.totalThreats,
              icon: Shield,
              color: 'text-blue-400'
            },
            {
              label: 'Active Campaigns',
              value: dashboardData.threatIntelligenceDashboard.overview.activeCampaigns,
              icon: Target,
              color: 'text-orange-400'
            },
            {
              label: 'Tracked Actors',
              value: dashboardData.threatIntelligenceDashboard.overview.trackedActors,
              icon: Users,
              color: 'text-green-400'
            },
            {
              label: 'New IOCs',
              value: dashboardData.threatIntelligenceDashboard.overview.newIOCs,
              icon: Search,
              color: 'text-purple-400'
            },
            {
              label: 'High Confidence',
              value: dashboardData.threatIntelligenceDashboard.overview.highConfidenceThreats,
              icon: Eye,
              color: 'text-yellow-400'
            },
            {
              label: 'Critical',
              value: dashboardData.threatIntelligenceDashboard.overview.criticalSeverityCount,
              icon: AlertTriangle,
              color: 'text-red-400'
            }
          ].map((stat, index) => (
            <Card key={stat.label} className="p-4">
              <div className="flex items-center space-x-3">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                <div>
                  <div className="text-2xl font-bold text-white">
                    {stat.value?.toLocaleString() || '0'}
                  </div>
                  <div className="text-xs text-gray-400">
                    {stat.label}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </motion.div>
      )}

      {/* Navigation Tabs */}
      <Card className="p-1">
        <nav className="flex space-x-1">
          {dashboardTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{tab.name}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <Badge variant="outline" className="text-xs ml-1">
                  {tab.badge}
                </Badge>
              )}
            </button>
          ))}
        </nav>
      </Card>

      {/* Main Content Area */}
      <div className="min-h-96">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {dashboardLoading && !dashboardData ? (
              <Card className="p-12">
                <div className="text-center">
                  <LoadingSpinner size="lg" />
                  <p className="text-gray-400 mt-4">
                    Loading threat intelligence data...
                  </p>
                </div>
              </Card>
            ) : (
              <CurrentTabComponent
                data={dashboardData?.threatIntelligenceDashboard}
                organizationId={organizationId}
                timeRange={timeRange}
                onRefresh={handleRefresh}
                realtimeUpdates={realtimeUpdates}
                isConnected={isConnected}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Recent Activity Feed - Always Visible */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <RecentThreatsList
          threats={dashboardData?.threatIntelligenceDashboard?.recentThreats || []}
          threatUpdates={threatUpdates}
          iocMatches={iocMatches}
          newIOCs={newIOCs}
          organizationId={organizationId}
          className="max-h-96"
        />
      </motion.div>
    </div>
  );
};

export default ThreatIntelligenceDashboard;