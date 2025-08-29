import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { motion } from 'framer-motion';
import * as d3 from 'd3';
import { 
  BarChart3, 
  TrendingUp, 
  Network, 
  Target, 
  Filter, 
  Download, 
  Maximize2,
  Calendar,
  Activity,
  Shield,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { format, subDays, subHours } from 'date-fns';

// Recharts components
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

// Components
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Select } from '../ui/Select';
import { AttackPathGraph } from './AttackPathGraph';
import { ThreatIntelligenceViewer } from './ThreatIntelligenceViewer';
import { RiskMatrices } from './RiskMatrices';
import { ComplianceDashboards } from './ComplianceDashboards';

// GraphQL
import { GET_SECURITY_METRICS } from '../../graphql/queries/threat-detection.graphql';

// Types
import { SecurityEvent, Severity } from '../../types/security';

interface SecurityAnalyticsDashboardProps {
  events: SecurityEvent[];
  className?: string;
  timeRange?: string;
}

interface AnalyticsData {
  eventTrends: Array<{
    timestamp: string;
    events: number;
    threats: number;
    alerts: number;
    incidents: number;
  }>;
  severityDistribution: Array<{
    severity: Severity;
    count: number;
    percentage: number;
  }>;
  sourceAnalysis: Array<{
    source: string;
    eventCount: number;
    threatLevel: number;
    geography: string;
    riskScore: number;
  }>;
  attackVectors: Array<{
    vector: string;
    count: number;
    trend: number;
    mitreMapping: string[];
  }>;
  temporalPatterns: Array<{
    hour: number;
    eventCount: number;
    severity: Severity;
  }>;
  correlationMatrix: Array<{
    source: string;
    target: string;
    strength: number;
    type: string;
  }>;
}

const SEVERITY_COLORS = {
  CRITICAL: '#DC2626',
  HIGH: '#EA580C',
  MEDIUM: '#D97706',
  LOW: '#2563EB'
};

const TIME_RANGES = [
  { value: '1h', label: 'Last Hour' },
  { value: '6h', label: 'Last 6 Hours' },
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' }
];

// Process events into analytics data
const processEventsForAnalytics = (events: SecurityEvent[], timeRange: string): AnalyticsData => {
  const now = Date.now();
  const cutoffTime = new Date(now - getTimeRangeMs(timeRange));
  
  const filteredEvents = events.filter(event => 
    new Date(event.timestamp) > cutoffTime
  );

  // Event trends over time
  const eventTrends = generateTimeSeries(filteredEvents, timeRange);
  
  // Severity distribution
  const severityCounts = filteredEvents.reduce((acc, event) => {
    acc[event.severity] = (acc[event.severity] || 0) + 1;
    return acc;
  }, {} as Record<Severity, number>);

  const totalEvents = filteredEvents.length;
  const severityDistribution = Object.entries(severityCounts).map(([severity, count]) => ({
    severity: severity as Severity,
    count,
    percentage: (count / totalEvents) * 100
  }));

  // Source analysis
  const sourceStats = filteredEvents.reduce((acc, event) => {
    if (!acc[event.source]) {
      acc[event.source] = {
        eventCount: 0,
        threatLevels: [],
        geographies: new Set(),
        riskScores: []
      };
    }
    
    acc[event.source].eventCount++;
    if (event.threatLevel) acc[event.source].threatLevels.push(event.threatLevel);
    if (event.geoLocation?.country) acc[event.source].geographies.add(event.geoLocation.country);
    if (event.riskScore) acc[event.source].riskScores.push(event.riskScore);
    
    return acc;
  }, {} as Record<string, any>);

  const sourceAnalysis = Object.entries(sourceStats).map(([source, stats]) => ({
    source,
    eventCount: stats.eventCount,
    threatLevel: calculateAverageThreatLevel(stats.threatLevels),
    geography: Array.from(stats.geographies).join(', '),
    riskScore: stats.riskScores.reduce((sum: number, score: number) => sum + score, 0) / stats.riskScores.length || 0
  }));

  // Attack vectors
  const vectorStats = filteredEvents.reduce((acc, event) => {
    const vector = event.type.replace(/_/g, ' ');
    if (!acc[vector]) {
      acc[vector] = {
        count: 0,
        mitreMapping: new Set(),
        timestamps: []
      };
    }
    
    acc[vector].count++;
    acc[vector].timestamps.push(new Date(event.timestamp).getTime());
    
    if (event.mitreAttackTactics) {
      event.mitreAttackTactics.forEach(tactic => {
        acc[vector].mitreMapping.add(tactic.tacticId);
      });
    }
    
    return acc;
  }, {} as Record<string, any>);

  const attackVectors = Object.entries(vectorStats).map(([vector, stats]) => ({
    vector,
    count: stats.count,
    trend: calculateTrend(stats.timestamps),
    mitreMapping: Array.from(stats.mitreMapping)
  }));

  // Temporal patterns
  const hourlyStats = Array.from({ length: 24 }, (_, hour) => {
    const eventsInHour = filteredEvents.filter(event => {
      const eventHour = new Date(event.timestamp).getHours();
      return eventHour === hour;
    });
    
    const criticalEvents = eventsInHour.filter(e => e.severity === 'CRITICAL').length;
    const highEvents = eventsInHour.filter(e => e.severity === 'HIGH').length;
    
    const dominantSeverity = 
      criticalEvents > 0 ? 'CRITICAL' :
      highEvents > 0 ? 'HIGH' :
      eventsInHour.length > 0 ? 'MEDIUM' : 'LOW';

    return {
      hour,
      eventCount: eventsInHour.length,
      severity: dominantSeverity as Severity
    };
  });

  // Correlation matrix (simplified)
  const correlationMatrix = generateCorrelationMatrix(filteredEvents);

  return {
    eventTrends,
    severityDistribution,
    sourceAnalysis,
    attackVectors,
    temporalPatterns: hourlyStats,
    correlationMatrix
  };
};

const getTimeRangeMs = (range: string): number => {
  switch (range) {
    case '1h': return 60 * 60 * 1000;
    case '6h': return 6 * 60 * 60 * 1000;
    case '24h': return 24 * 60 * 60 * 1000;
    case '7d': return 7 * 24 * 60 * 60 * 1000;
    case '30d': return 30 * 24 * 60 * 60 * 1000;
    case '90d': return 90 * 24 * 60 * 60 * 1000;
    default: return 24 * 60 * 60 * 1000;
  }
};

const generateTimeSeries = (events: SecurityEvent[], timeRange: string) => {
  const intervals = getTimeIntervals(timeRange);
  const series = intervals.map(interval => ({
    timestamp: interval.toISOString(),
    events: 0,
    threats: 0,
    alerts: 0,
    incidents: 0
  }));

  events.forEach(event => {
    const eventTime = new Date(event.timestamp);
    const intervalIndex = intervals.findIndex(interval => 
      eventTime >= interval && eventTime < new Date(interval.getTime() + getIntervalMs(timeRange))
    );
    
    if (intervalIndex >= 0) {
      series[intervalIndex].events++;
      if (event.threatLevel && ['HIGH', 'CRITICAL'].includes(event.threatLevel)) {
        series[intervalIndex].threats++;
      }
      // Additional categorization logic here
    }
  });

  return series;
};

const getTimeIntervals = (timeRange: string): Date[] => {
  const now = new Date();
  const intervals: Date[] = [];
  const totalMs = getTimeRangeMs(timeRange);
  const intervalMs = getIntervalMs(timeRange);
  
  for (let i = totalMs; i >= 0; i -= intervalMs) {
    intervals.push(new Date(now.getTime() - i));
  }
  
  return intervals;
};

const getIntervalMs = (timeRange: string): number => {
  switch (timeRange) {
    case '1h': return 5 * 60 * 1000; // 5 minutes
    case '6h': return 30 * 60 * 1000; // 30 minutes
    case '24h': return 60 * 60 * 1000; // 1 hour
    case '7d': return 6 * 60 * 60 * 1000; // 6 hours
    case '30d': return 24 * 60 * 60 * 1000; // 1 day
    case '90d': return 24 * 60 * 60 * 1000; // 1 day
    default: return 60 * 60 * 1000;
  }
};

const calculateAverageThreatLevel = (levels: string[]): number => {
  if (!levels.length) return 0;
  
  const scores = levels.map(level => {
    switch (level) {
      case 'CRITICAL': return 4;
      case 'HIGH': return 3;
      case 'MEDIUM': return 2;
      case 'LOW': return 1;
      default: return 0;
    }
  });
  
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
};

const calculateTrend = (timestamps: number[]): number => {
  if (timestamps.length < 2) return 0;
  
  const sorted = timestamps.sort();
  const midpoint = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, midpoint).length;
  const secondHalf = sorted.slice(midpoint).length;
  
  return ((secondHalf - firstHalf) / timestamps.length) * 100;
};

const generateCorrelationMatrix = (events: SecurityEvent[]) => {
  const sources = [...new Set(events.map(e => e.source))];
  const matrix: Array<{ source: string; target: string; strength: number; type: string }> = [];
  
  sources.forEach(source1 => {
    sources.forEach(source2 => {
      if (source1 !== source2) {
        const events1 = events.filter(e => e.source === source1);
        const events2 = events.filter(e => e.source === source2);
        
        // Simple temporal correlation
        const correlation = calculateTemporalCorrelation(events1, events2);
        
        if (correlation > 0.3) {
          matrix.push({
            source: source1,
            target: source2,
            strength: correlation,
            type: 'temporal'
          });
        }
      }
    });
  });
  
  return matrix;
};

const calculateTemporalCorrelation = (events1: SecurityEvent[], events2: SecurityEvent[]): number => {
  // Simplified correlation based on time proximity
  let correlatedPairs = 0;
  const timeWindow = 5 * 60 * 1000; // 5 minutes
  
  events1.forEach(e1 => {
    const e1Time = new Date(e1.timestamp).getTime();
    const hasCorrelation = events2.some(e2 => {
      const e2Time = new Date(e2.timestamp).getTime();
      return Math.abs(e1Time - e2Time) <= timeWindow;
    });
    
    if (hasCorrelation) correlatedPairs++;
  });
  
  return correlatedPairs / Math.max(events1.length, events2.length);
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg">
        <p className="text-gray-300 text-sm mb-2">
          {format(new Date(label), 'MMM dd, HH:mm')}
        </p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: <span className="font-bold">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export const SecurityAnalyticsDashboard: React.FC<SecurityAnalyticsDashboardProps> = ({
  events,
  className = '',
  timeRange: initialTimeRange = '24h'
}) => {
  const [timeRange, setTimeRange] = useState(initialTimeRange);
  const [activeView, setActiveView] = useState<'trends' | 'patterns' | 'correlations' | 'risk' | 'compliance'>('trends');

  // Process analytics data
  const analyticsData = useMemo(() => 
    processEventsForAnalytics(events, timeRange), 
    [events, timeRange]
  );

  // GraphQL query for additional metrics
  const { data: metricsData, loading: metricsLoading } = useQuery(GET_SECURITY_METRICS, {
    variables: {
      timeRange: {
        start: new Date(Date.now() - getTimeRangeMs(timeRange)).toISOString(),
        end: new Date().toISOString(),
        period: timeRange.includes('d') ? 'DAY' : 'HOUR'
      }
    },
    pollInterval: 30000
  });

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center">
            <BarChart3 className="w-6 h-6 mr-2" />
            Security Analytics
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Advanced threat analysis and pattern detection
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
            {TIME_RANGES.map(range => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </Select>
          
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
          
          <Button variant="outline" size="sm">
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-1 bg-gray-800 rounded-lg p-1">
        {[
          { key: 'trends', label: 'Event Trends', icon: TrendingUp },
          { key: 'patterns', label: 'Attack Patterns', icon: Target },
          { key: 'correlations', label: 'Correlations', icon: Network },
          { key: 'risk', label: 'Risk Analysis', icon: Shield },
          { key: 'compliance', label: 'Compliance', icon: AlertTriangle }
        ].map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant={activeView === key ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveView(key as any)}
            className="flex items-center space-x-2"
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </Button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeView === 'trends' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Event Trends Chart */}
            <Card className="p-6 lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Security Event Trends</h3>
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full" />
                    <span className="text-gray-300">Total Events</span>
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
              
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analyticsData.eventTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="timestamp" 
                      stroke="#9CA3AF"
                      fontSize={12}
                      tickFormatter={(value) => format(new Date(value), 'MMM dd HH:mm')}
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
              </div>
            </Card>

            {/* Severity Distribution */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-white mb-6">Severity Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analyticsData.severityDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="count"
                    >
                      {analyticsData.severityDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[entry.severity]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      content={({ payload }) => {
                        if (payload && payload[0]) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg">
                              <p className="text-white font-medium">{data.severity}</p>
                              <p className="text-gray-300">{data.count} events</p>
                              <p className="text-gray-400 text-sm">{data.percentage.toFixed(1)}%</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-4 space-y-2">
                {analyticsData.severityDistribution.map((item) => (
                  <div key={item.severity} className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: SEVERITY_COLORS[item.severity] }}
                      />
                      <span className="text-gray-300">{item.severity}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-white font-medium">{item.count}</span>
                      <span className="text-gray-400">({item.percentage.toFixed(1)}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Temporal Patterns */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-white mb-6">
                <Clock className="w-5 h-5 inline mr-2" />
                Temporal Activity Patterns
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analyticsData.temporalPatterns}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="hour" 
                      stroke="#9CA3AF"
                      fontSize={12}
                      tickFormatter={(value) => `${value}:00`}
                    />
                    <YAxis stroke="#9CA3AF" fontSize={12} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg">
                              <p className="text-gray-300 text-sm mb-1">
                                Hour: {label}:00
                              </p>
                              <p className="text-white">
                                Events: <span className="font-bold">{data.eventCount}</span>
                              </p>
                              <p className="text-gray-400 text-sm">
                                Dominant: {data.severity}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar 
                      dataKey="eventCount" 
                      fill={(entry: any) => SEVERITY_COLORS[entry.severity] || '#3B82F6'}
                      name="Event Count"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        )}

        {activeView === 'patterns' && (
          <AttackPathGraph events={events} />
        )}

        {activeView === 'correlations' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Event Source Analysis */}
            <Card className="p-6 lg:col-span-2">
              <h3 className="text-lg font-semibold text-white mb-6">Event Source Analysis</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart data={analyticsData.sourceAnalysis}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="eventCount" 
                      stroke="#9CA3AF"
                      fontSize={12}
                      name="Event Count"
                    />
                    <YAxis 
                      dataKey="riskScore" 
                      stroke="#9CA3AF"
                      fontSize={12}
                      name="Risk Score"
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-lg">
                              <p className="text-white font-medium mb-2">{data.source}</p>
                              <p className="text-gray-300 text-sm">Events: {data.eventCount}</p>
                              <p className="text-gray-300 text-sm">Risk Score: {data.riskScore.toFixed(1)}</p>
                              <p className="text-gray-300 text-sm">Geography: {data.geography}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Scatter dataKey="riskScore" fill="#3B82F6" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        )}

        {activeView === 'risk' && (
          <RiskMatrices events={events} timeRange={timeRange} />
        )}

        {activeView === 'compliance' && (
          <ComplianceDashboards events={events} />
        )}
      </div>

      {/* Threat Intelligence Feed */}
      <ThreatIntelligenceViewer events={events} />
    </div>
  );
};

export default SecurityAnalyticsDashboard;