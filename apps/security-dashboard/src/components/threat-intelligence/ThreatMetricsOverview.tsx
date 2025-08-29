import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  Activity,
  AlertTriangle,
  Eye,
  Database,
  Globe,
  Zap,
  Clock
} from 'lucide-react';

// Components
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

// Charts (using recharts)
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

// Types
interface ThreatMetricsOverviewProps {
  data?: any;
  organizationId: string;
  timeRange: any;
  onRefresh: () => void;
  realtimeUpdates: number;
  isConnected: boolean;
  className?: string;
}

const SEVERITY_COLORS = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316', 
  MEDIUM: '#eab308',
  LOW: '#22c55e'
};

const CONFIDENCE_COLORS = {
  CONFIRMED: '#10b981',
  HIGH: '#3b82f6',
  MEDIUM: '#eab308',
  LOW: '#6b7280'
};

export const ThreatMetricsOverview: React.FC<ThreatMetricsOverviewProps> = ({
  data,
  organizationId,
  timeRange,
  onRefresh,
  realtimeUpdates,
  isConnected,
  className = ''
}) => {
  // Process dashboard data
  const overview = data?.overview || {};
  const timeSeriesData = data?.timeSeriesData || [];
  const geographicDistribution = data?.geographicDistribution || [];
  const industryTargeting = data?.industryTargeting || [];
  const iocMetrics = data?.iocMetrics || {};
  const feedStatus = data?.feedStatus || {};
  const correlationMetrics = data?.correlationMetrics || {};

  // Calculate trends
  const threatTrend = useMemo(() => {
    if (timeSeriesData.length < 2) return 0;
    const recent = timeSeriesData.slice(-7).reduce((sum: number, item: any) => sum + (item.threatCount || 0), 0);
    const previous = timeSeriesData.slice(-14, -7).reduce((sum: number, item: any) => sum + (item.threatCount || 0), 0);
    return previous > 0 ? ((recent - previous) / previous) * 100 : 0;
  }, [timeSeriesData]);

  const iocTrend = useMemo(() => {
    if (timeSeriesData.length < 2) return 0;
    const recent = timeSeriesData.slice(-7).reduce((sum: number, item: any) => sum + (item.iocCount || 0), 0);
    const previous = timeSeriesData.slice(-14, -7).reduce((sum: number, item: any) => sum + (item.iocCount || 0), 0);
    return previous > 0 ? ((recent - previous) / previous) * 100 : 0;
  }, [timeSeriesData]);

  // Prepare chart data
  const threatTimelineData = timeSeriesData.map((item: any) => ({
    timestamp: new Date(item.timestamp).toLocaleDateString(),
    threats: item.threatCount || 0,
    iocs: item.iocCount || 0,
    actors: item.actorActivity || 0,
    campaigns: item.campaignActivity || 0,
    correlations: item.correlationMatches || 0
  }));

  const severityDistributionData = iocMetrics.typeDistribution?.map((item: any) => ({
    name: item.type.replace('_', ' '),
    value: item.count,
    percentage: item.percentage
  })) || [];

  const confidenceDistributionData = iocMetrics.confidenceDistribution?.map((item: any) => ({
    name: item.confidence,
    value: item.count,
    percentage: item.percentage
  })) || [];

  const topCountriesData = geographicDistribution
    ?.sort((a: any, b: any) => b.threatCount - a.threatCount)
    ?.slice(0, 10)
    ?.map((item: any) => ({
      country: item.country,
      threats: item.threatCount,
      actors: item.actorCount,
      campaigns: item.campaignCount
    })) || [];

  const industryRiskData = industryTargeting
    ?.sort((a: any, b: any) => b.threatCount - a.threatCount)
    ?.slice(0, 8)
    ?.map((item: any) => ({
      sector: item.sector,
      threats: item.threatCount,
      risk: item.riskLevel || 'MEDIUM'
    })) || [];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {[
          {
            title: 'Total Threats',
            value: overview.totalThreats?.toLocaleString() || '0',
            trend: threatTrend,
            icon: Shield,
            color: 'text-blue-400',
            bgColor: 'bg-blue-500/10',
            borderColor: 'border-blue-500/20'
          },
          {
            title: 'Active Campaigns',
            value: overview.activeCampaigns?.toLocaleString() || '0',
            icon: Target,
            color: 'text-orange-400',
            bgColor: 'bg-orange-500/10',
            borderColor: 'border-orange-500/20'
          },
          {
            title: 'Tracked Actors',
            value: overview.trackedActors?.toLocaleString() || '0',
            icon: Users,
            color: 'text-green-400',
            bgColor: 'bg-green-500/10',
            borderColor: 'border-green-500/20'
          },
          {
            title: 'New IOCs',
            value: overview.newIOCs?.toLocaleString() || '0',
            trend: iocTrend,
            icon: Database,
            color: 'text-purple-400',
            bgColor: 'bg-purple-500/10',
            borderColor: 'border-purple-500/20'
          },
          {
            title: 'High Confidence',
            value: overview.highConfidenceThreats?.toLocaleString() || '0',
            icon: Eye,
            color: 'text-yellow-400',
            bgColor: 'bg-yellow-500/10',
            borderColor: 'border-yellow-500/20'
          },
          {
            title: 'Critical Threats',
            value: overview.criticalSeverityCount?.toLocaleString() || '0',
            icon: AlertTriangle,
            color: 'text-red-400',
            bgColor: 'bg-red-500/10',
            borderColor: 'border-red-500/20'
          }
        ].map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card className={`p-4 ${metric.bgColor} border ${metric.borderColor}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <metric.icon className={`w-5 h-5 ${metric.color}`} />
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {metric.value}
                    </div>
                    <div className="text-xs text-gray-400">
                      {metric.title}
                    </div>
                  </div>
                </div>
                {metric.trend !== undefined && (
                  <div className="flex items-center space-x-1">
                    {metric.trend > 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-400" />
                    ) : metric.trend < 0 ? (
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    ) : null}
                    <span className={`text-xs ${
                      metric.trend > 0 ? 'text-green-400' : 
                      metric.trend < 0 ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {Math.abs(metric.trend).toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Threat Timeline */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Threat Activity Timeline
            </h3>
            <Badge variant="outline" className="text-xs">
              {timeRange.start} to {timeRange.end}
            </Badge>
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={threatTimelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="timestamp" 
                stroke="#9ca3af"
                tick={{ fontSize: 12 }}
              />
              <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '6px'
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="threats"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                name="Threats"
              />
              <Line
                type="monotone"
                dataKey="iocs"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                name="IOCs"
              />
              <Line
                type="monotone"
                dataKey="actors"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                name="Actor Activity"
              />
              <Line
                type="monotone"
                dataKey="correlations"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                name="Correlations"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* IOC Type Distribution */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <Database className="w-5 h-5 mr-2" />
              IOC Type Distribution
            </h3>
            <Badge variant="outline" className="text-xs">
              {iocMetrics.totalIOCs || 0} total
            </Badge>
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={severityDistributionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {severityDistributionData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={Object.values(SEVERITY_COLORS)[index % Object.values(SEVERITY_COLORS).length]} 
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '6px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Top Threat Countries */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <Globe className="w-5 h-5 mr-2" />
              Top Threat Countries
            </h3>
            <Badge variant="outline" className="text-xs">
              {geographicDistribution.length} countries
            </Badge>
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topCountriesData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" stroke="#9ca3af" tick={{ fontSize: 12 }} />
              <YAxis 
                type="category" 
                dataKey="country" 
                stroke="#9ca3af"
                tick={{ fontSize: 12 }}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '6px'
                }}
              />
              <Bar dataKey="threats" fill="#3b82f6" name="Threats" />
              <Bar dataKey="actors" fill="#10b981" name="Actors" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Industry Risk Assessment */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <Target className="w-5 h-5 mr-2" />
              Industry Risk Assessment
            </h3>
            <Badge variant="outline" className="text-xs">
              {industryTargeting.length} sectors
            </Badge>
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={industryRiskData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="sector" 
                stroke="#9ca3af"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '6px'
                }}
              />
              <Bar 
                dataKey="threats" 
                fill="#f59e0b"
                name="Threat Count"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Feed Status */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Threat Feeds
            </h3>
            <Badge 
              variant="outline" 
              className={`text-xs ${
                feedStatus.activeFeeds === feedStatus.totalFeeds 
                  ? 'text-green-400 bg-green-500/10 border-green-500/20'
                  : 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
              }`}
            >
              {feedStatus.activeFeeds || 0} / {feedStatus.totalFeeds || 0} active
            </Badge>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">Total Feeds</span>
              <span className="text-sm font-semibold text-white">
                {feedStatus.totalFeeds || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">Active Feeds</span>
              <span className="text-sm font-semibold text-green-400">
                {feedStatus.activeFeeds || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">Error Feeds</span>
              <span className="text-sm font-semibold text-red-400">
                {feedStatus.errorFeeds || 0}
              </span>
            </div>
            {feedStatus.lastSyncTime && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Last Sync</span>
                <span className="text-sm font-semibold text-white">
                  {new Date(feedStatus.lastSyncTime).toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* IOC Metrics */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <Database className="w-5 h-5 mr-2" />
              IOC Metrics
            </h3>
            <Badge variant="outline" className="text-xs">
              {iocMetrics.totalIOCs?.toLocaleString() || 0} total
            </Badge>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">New IOCs</span>
              <span className="text-sm font-semibold text-green-400">
                +{iocMetrics.newIOCs || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">Expired IOCs</span>
              <span className="text-sm font-semibold text-red-400">
                -{iocMetrics.expiredIOCs || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">High Confidence</span>
              <span className="text-sm font-semibold text-blue-400">
                {iocMetrics.highConfidenceIOCs || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">Whitelisted</span>
              <span className="text-sm font-semibold text-yellow-400">
                {iocMetrics.whitelistedIOCs || 0}
              </span>
            </div>
          </div>
        </Card>

        {/* Correlation Engine */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <Zap className="w-5 h-5 mr-2" />
              Correlation Engine
            </h3>
            <Badge 
              variant="outline" 
              className="text-xs text-green-400 bg-green-500/10 border-green-500/20"
            >
              Running
            </Badge>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">Total Correlations</span>
              <span className="text-sm font-semibold text-white">
                {correlationMetrics.totalCorrelations || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">Active Rules</span>
              <span className="text-sm font-semibold text-green-400">
                {correlationMetrics.activeCorrelations || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">Recent Matches</span>
              <span className="text-sm font-semibold text-blue-400">
                {correlationMetrics.recentMatches || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">Effectiveness</span>
              <span className="text-sm font-semibold text-yellow-400">
                {correlationMetrics.effectivenessScore?.toFixed(1) || 0}%
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Real-time Activity Indicator */}
      {realtimeUpdates > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed bottom-6 right-6 z-50"
        >
          <Card className="p-3 bg-blue-500/20 border-blue-500/30">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              <span className="text-sm text-blue-400 font-medium">
                {realtimeUpdates} real-time updates
              </span>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default ThreatMetricsOverview;