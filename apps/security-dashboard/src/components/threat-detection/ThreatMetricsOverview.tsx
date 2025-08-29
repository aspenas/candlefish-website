import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  AlertTriangle, 
  Activity, 
  Clock, 
  Target, 
  TrendingUp, 
  TrendingDown,
  Zap,
  Eye
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format } from 'date-fns';

// Components
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

// Types
import { SecurityMetrics, Severity } from '../../types/security';

interface ThreatMetricsOverviewProps {
  metrics?: SecurityMetrics;
  loading?: boolean;
  eventStats: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  className?: string;
}

interface MetricCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  color?: 'blue' | 'red' | 'orange' | 'green' | 'purple';
  loading?: boolean;
}

const SEVERITY_COLORS = {
  CRITICAL: '#EF4444',
  HIGH: '#F97316',
  MEDIUM: '#EAB308',
  LOW: '#3B82F6'
};

const MetricCard: React.FC<MetricCardProps> = ({ 
  icon: Icon, 
  title, 
  value, 
  change, 
  changeLabel, 
  color = 'blue',
  loading = false 
}) => {
  const colorClasses = {
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
    orange: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    green: 'text-green-400 bg-green-500/10 border-green-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20'
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`p-6 border ${colorClasses[color]}`}>
        <div className="flex items-center justify-between mb-4">
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
          {change !== undefined && (
            <div className={`flex items-center space-x-1 text-sm ${
              change > 0 ? 'text-red-400' : change < 0 ? 'text-green-400' : 'text-gray-400'
            }`}>
              {change > 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : change < 0 ? (
                <TrendingDown className="w-4 h-4" />
              ) : null}
              <span>{Math.abs(change)}%</span>
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-300">{title}</h3>
          <div className="flex items-baseline space-x-2">
            {loading ? (
              <div className="h-8 w-16 bg-gray-700 animate-pulse rounded" />
            ) : (
              <span className="text-2xl font-bold text-white">{value}</span>
            )}
          </div>
          {changeLabel && (
            <p className="text-xs text-gray-400">{changeLabel}</p>
          )}
        </div>
      </Card>
    </motion.div>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg">
        <p className="text-gray-300 text-sm">{format(new Date(label), 'MMM dd, HH:mm')}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const ThreatMetricsOverview: React.FC<ThreatMetricsOverviewProps> = ({
  metrics,
  loading = false,
  eventStats,
  className = ''
}) => {
  const processedTimeSeries = useMemo(() => {
    if (!metrics?.timeSeries) return [];
    
    return metrics.timeSeries.map(item => ({
      timestamp: item.timestamp,
      events: item.eventsCount,
      threats: item.threatsCount,
      alerts: item.alertsTriggered,
      incidents: item.incidentsCreated,
      resolved: item.incidentsResolved,
      riskScore: item.riskScore
    }));
  }, [metrics?.timeSeries]);

  const severityData = useMemo(() => [
    { name: 'Critical', value: eventStats.critical, color: SEVERITY_COLORS.CRITICAL },
    { name: 'High', value: eventStats.high, color: SEVERITY_COLORS.HIGH },
    { name: 'Medium', value: eventStats.medium, color: SEVERITY_COLORS.MEDIUM },
    { name: 'Low', value: eventStats.low, color: SEVERITY_COLORS.LOW }
  ].filter(item => item.value > 0), [eventStats]);

  const totalEvents = eventStats.critical + eventStats.high + eventStats.medium + eventStats.low;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <MetricCard
          icon={Activity}
          title="Total Events"
          value={loading ? 0 : (metrics?.overview?.totalEvents || totalEvents)}
          change={12}
          changeLabel="vs last hour"
          color="blue"
          loading={loading}
        />
        
        <MetricCard
          icon={AlertTriangle}
          title="Critical Events"
          value={loading ? 0 : (metrics?.overview?.criticalEvents || eventStats.critical)}
          change={-5}
          changeLabel="vs last hour"
          color="red"
          loading={loading}
        />
        
        <MetricCard
          icon={Target}
          title="Threats Detected"
          value={loading ? 0 : (metrics?.overview?.threatsDetected || 0)}
          change={8}
          changeLabel="vs last hour"
          color="orange"
          loading={loading}
        />
        
        <MetricCard
          icon={Shield}
          title="Active Incidents"
          value={loading ? 0 : (metrics?.overview?.incidentsActive || 0)}
          change={-3}
          changeLabel="vs last hour"
          color="purple"
          loading={loading}
        />
        
        <MetricCard
          icon={Clock}
          title="MTTD"
          value={loading ? "--" : (metrics?.overview?.meanTimeToDetection || '2.3m')}
          change={-15}
          changeLabel="faster detection"
          color="green"
          loading={loading}
        />
        
        <MetricCard
          icon={Zap}
          title="False Positive Rate"
          value={loading ? "--" : `${(metrics?.overview?.falsePositiveRate || 5.2)}%`}
          change={-2.1}
          changeLabel="improvement"
          color="blue"
          loading={loading}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real-time Activity Chart */}
        <Card className="col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Real-time Security Activity
            </h3>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full" />
                <span className="text-gray-300">Events</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <span className="text-gray-300">Threats</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full" />
                <span className="text-gray-300">Alerts</span>
              </div>
            </div>
          </div>
          
          <div className="h-64">
            {loading ? (
              <div className="h-full bg-gray-800 animate-pulse rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={processedTimeSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="timestamp" 
                    stroke="#9CA3AF"
                    fontSize={12}
                    tickFormatter={(value) => format(new Date(value), 'HH:mm')}
                  />
                  <YAxis stroke="#9CA3AF" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="events"
                    stackId="1"
                    stroke="#3B82F6"
                    fill="#3B82F6"
                    fillOpacity={0.3}
                    name="Events"
                  />
                  <Area
                    type="monotone"
                    dataKey="threats"
                    stackId="2"
                    stroke="#EF4444"
                    fill="#EF4444"
                    fillOpacity={0.3}
                    name="Threats"
                  />
                  <Area
                    type="monotone"
                    dataKey="alerts"
                    stackId="3"
                    stroke="#F97316"
                    fill="#F97316"
                    fillOpacity={0.3}
                    name="Alerts"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Severity Distribution */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center">
            <Eye className="w-5 h-5 mr-2" />
            Event Severity Distribution
          </h3>
          
          <div className="h-64">
            {loading ? (
              <div className="h-full bg-gray-800 animate-pulse rounded-lg" />
            ) : severityData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={({ payload }) => {
                      if (payload && payload[0]) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg">
                            <p className="text-white font-medium">{data.name}</p>
                            <p className="text-gray-300">{data.value} events</p>
                            <p className="text-gray-400 text-sm">
                              {((data.value / totalEvents) * 100).toFixed(1)}%
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No events to display</p>
                </div>
              </div>
            )}
          </div>

          {/* Severity Legend */}
          {severityData.length > 0 && (
            <div className="mt-4 space-y-2">
              {severityData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-gray-300">{item.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-white font-medium">{item.value}</span>
                    <span className="text-gray-400">
                      ({((item.value / totalEvents) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Top Threats */}
      {metrics?.topThreats && metrics.topThreats.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Target className="w-5 h-5 mr-2" />
            Top Threats
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.topThreats.slice(0, 6).map((threat, index) => (
              <motion.div
                key={threat.type}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 bg-gray-800/50 rounded-lg border border-gray-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge 
                    className={
                      threat.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                      threat.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                      threat.severity === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                      'bg-blue-500/20 text-blue-400 border-blue-500/30'
                    }
                    variant="outline"
                  >
                    {threat.severity}
                  </Badge>
                  <span className="text-sm font-mono text-gray-400">{threat.count}</span>
                </div>
                
                <h4 className="font-medium text-white mb-1">{threat.type.replace(/_/g, ' ')}</h4>
                <p className="text-sm text-gray-400">
                  Affected Assets: {threat.affectedAssets || 'N/A'}
                </p>
                
                {threat.trend && (
                  <div className={`mt-2 text-xs flex items-center ${
                    threat.trend > 0 ? 'text-red-400' : threat.trend < 0 ? 'text-green-400' : 'text-gray-400'
                  }`}>
                    {threat.trend > 0 ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : threat.trend < 0 ? (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    ) : null}
                    <span>{Math.abs(threat.trend)}% trend</span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default ThreatMetricsOverview;