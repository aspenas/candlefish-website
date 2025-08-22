import React, { useState, useMemo, useCallback } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
  ComposedChart
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  Cpu,
  MemoryStick,
  AlertTriangle,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react';
import {
  AggregatedMetrics,
  TimeRange,
  MetricType,
  HistoricalDataPoint,
  Agent
} from '../../types/rtpm.types';

interface HistoricalChartsProps {
  data: HistoricalDataPoint[];
  agents: Agent[];
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  selectedAgents?: string[];
  onAgentSelect?: (agentIds: string[]) => void;
  isLoading?: boolean;
  className?: string;
}

interface TimeRangeButtonProps {
  range: TimeRange;
  active: boolean;
  onClick: () => void;
  label: string;
}

interface ChartControlsProps {
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  selectedMetrics: MetricType[];
  onMetricsChange: (metrics: MetricType[]) => void;
  selectedAgents: string[];
  onAgentsChange: (agents: string[]) => void;
  agents: Agent[];
  onRefresh: () => void;
  onExport: () => void;
  isLoading: boolean;
}

const TimeRangeButton: React.FC<TimeRangeButtonProps> = ({ range, active, onClick, label }) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={`
      px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
      ${active
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
        : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:text-white'
      }
    `}
  >
    {label}
  </motion.button>
);

const ChartControls: React.FC<ChartControlsProps> = ({
  timeRange,
  onTimeRangeChange,
  selectedMetrics,
  onMetricsChange,
  selectedAgents,
  onAgentsChange,
  agents,
  onRefresh,
  onExport,
  isLoading
}) => {
  const timeRanges: { range: TimeRange; label: string }[] = [
    { range: '1h', label: '1H' },
    { range: '6h', label: '6H' },
    { range: '24h', label: '24H' },
    { range: '7d', label: '7D' },
    { range: '30d', label: '30D' }
  ];

  const availableMetrics: { key: MetricType; label: string }[] = [
    { key: 'cpu', label: 'CPU' },
    { key: 'memory', label: 'Memory' },
    { key: 'responseTime', label: 'Response Time' },
    { key: 'requestRate', label: 'Request Rate' },
    { key: 'errorRate', label: 'Error Rate' },
    { key: 'throughput', label: 'Throughput' }
  ];

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Time Range Controls */}
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-400" />
          <span className="text-gray-300 text-sm font-medium mr-3">Time Range:</span>
          <div className="flex gap-1">
            {timeRanges.map(({ range, label }) => (
              <TimeRangeButton
                key={range}
                range={range}
                active={timeRange === range}
                onClick={() => onTimeRangeChange(range)}
                label={label}
              />
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 rounded-lg bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onExport}
            className="p-2 rounded-lg bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:text-white transition-colors"
          >
            <Download className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* Metric Selection */}
      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-700/50">
        <Filter className="w-4 h-4 text-gray-400" />
        <span className="text-gray-300 text-sm font-medium mr-3">Metrics:</span>
        <div className="flex flex-wrap gap-2">
          {availableMetrics.map(({ key, label }) => (
            <motion.button
              key={key}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                const newMetrics = selectedMetrics.includes(key)
                  ? selectedMetrics.filter(m => m !== key)
                  : [...selectedMetrics, key];
                onMetricsChange(newMetrics);
              }}
              className={`
                px-3 py-1 rounded-md text-xs font-medium transition-all duration-200
                ${selectedMetrics.includes(key)
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                  : 'bg-gray-700/30 text-gray-400 hover:bg-gray-600/30 hover:text-gray-300'
                }
              `}
            >
              {label}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};

const MetricTrendChart: React.FC<{
  data: any[];
  metrics: MetricType[];
  title: string;
  height?: number;
  showBrush?: boolean;
}> = ({ data, metrics, title, height = 300, showBrush = false }) => {
  const colors = {
    cpu: '#3B82F6',
    memory: '#10B981',
    responseTime: '#F59E0B',
    requestRate: '#8B5CF6',
    errorRate: '#EF4444',
    throughput: '#06B6D4'
  };

  const formatValue = (value: number, metric: MetricType) => {
    switch (metric) {
      case 'cpu':
      case 'memory':
      case 'errorRate':
        return `${value.toFixed(1)}%`;
      case 'responseTime':
        return `${Math.round(value)}ms`;
      case 'requestRate':
      case 'throughput':
        return `${Math.round(value)}/s`;
      default:
        return Math.round(value).toLocaleString();
    }
  };

  const formatTimestamp = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800/95 backdrop-blur-sm border border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-gray-300 text-sm mb-2">{formatTimestamp(label)}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-white font-medium capitalize">
                {entry.dataKey}: {formatValue(entry.value, entry.dataKey)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6"
    >
      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-blue-400" />
        {title}
      </h3>

      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatTimestamp}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />

            {metrics.map(metric => (
              <Line
                key={metric}
                type="monotone"
                dataKey={metric}
                stroke={colors[metric]}
                strokeWidth={2}
                dot={false}
                isAnimationActive={true}
                animationDuration={1000}
                name={metric.charAt(0).toUpperCase() + metric.slice(1)}
              />
            ))}

            {showBrush && (
              <Brush
                dataKey="timestamp"
                height={30}
                stroke="#6B7280"
                tickFormatter={formatTimestamp}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

const StatCard: React.FC<{
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'stable';
  icon: React.ReactNode;
}> = ({ title, value, change, trend, icon }) => {
  const trendColors = {
    up: 'text-green-400',
    down: 'text-red-400',
    stable: 'text-gray-400'
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Activity;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gray-700/50 text-blue-400">
            {icon}
          </div>
          <div>
            <p className="text-gray-400 text-sm">{title}</p>
            <p className="text-white text-xl font-bold">{value}</p>
          </div>
        </div>
        <div className={`flex items-center gap-1 ${trendColors[trend]}`}>
          <TrendIcon className="w-4 h-4" />
          <span className="text-sm font-medium">{change}</span>
        </div>
      </div>
    </motion.div>
  );
};

export const HistoricalCharts: React.FC<HistoricalChartsProps> = ({
  data,
  agents,
  timeRange,
  onTimeRangeChange,
  selectedAgents = [],
  onAgentSelect,
  isLoading = false,
  className = ''
}) => {
  const [selectedMetrics, setSelectedMetrics] = useState<MetricType[]>(['cpu', 'memory', 'responseTime']);

  // Process data for charts
  const chartData = useMemo(() => {
    return data.map(point => ({
      timestamp: point.timestamp,
      cpu: point.metrics.cpu || 0,
      memory: point.metrics.memory || 0,
      responseTime: point.metrics.responseTime || 0,
      requestRate: point.metrics.requestRate || 0,
      errorRate: point.metrics.errorRate || 0,
      throughput: point.metrics.throughput || 0
    }));
  }, [data]);

  // Calculate aggregated stats
  const stats = useMemo(() => {
    if (data.length === 0) return null;

    const latestData = data[data.length - 1];
    const previousData = data[Math.max(0, data.length - 10)]; // Compare with 10 points ago

    const calculateChange = (current: number, previous: number) => {
      const change = ((current - previous) / previous) * 100;
      return {
        value: Math.abs(change).toFixed(1) + '%',
        trend: change > 1 ? 'up' : change < -1 ? 'down' : 'stable' as const
      };
    };

    return {
      avgResponseTime: {
        value: Math.round(latestData.metrics.responseTime || 0) + 'ms',
        ...calculateChange(latestData.metrics.responseTime || 0, previousData.metrics.responseTime || 0)
      },
      avgCpu: {
        value: (latestData.metrics.cpu || 0).toFixed(1) + '%',
        ...calculateChange(latestData.metrics.cpu || 0, previousData.metrics.cpu || 0)
      },
      avgMemory: {
        value: (latestData.metrics.memory || 0).toFixed(1) + '%',
        ...calculateChange(latestData.metrics.memory || 0, previousData.metrics.memory || 0)
      },
      errorRate: {
        value: (latestData.metrics.errorRate || 0).toFixed(2) + '%',
        ...calculateChange(latestData.metrics.errorRate || 0, previousData.metrics.errorRate || 0)
      }
    };
  }, [data]);

  const handleRefresh = useCallback(() => {
    // Trigger data refresh
    console.log('Refreshing historical data...');
  }, []);

  const handleExport = useCallback(() => {
    // Export data as CSV
    const csv = [
      ['Timestamp', ...selectedMetrics].join(','),
      ...chartData.map(row =>
        [row.timestamp, ...selectedMetrics.map(metric => row[metric])].join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metrics-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [chartData, selectedMetrics, timeRange]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <RefreshCw className="w-12 h-12 mx-auto mb-4 text-blue-400 animate-spin" />
          <p className="text-gray-400">Loading historical data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <ChartControls
        timeRange={timeRange}
        onTimeRangeChange={onTimeRangeChange}
        selectedMetrics={selectedMetrics}
        onMetricsChange={setSelectedMetrics}
        selectedAgents={selectedAgents}
        onAgentsChange={onAgentSelect || (() => {})}
        agents={agents}
        onRefresh={handleRefresh}
        onExport={handleExport}
        isLoading={isLoading}
      />

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Avg Response Time"
            value={stats.avgResponseTime.value}
            change={stats.avgResponseTime.value}
            trend={stats.avgResponseTime.trend}
            icon={<Clock className="w-5 h-5" />}
          />
          <StatCard
            title="Avg CPU Usage"
            value={stats.avgCpu.value}
            change={stats.avgCpu.value}
            trend={stats.avgCpu.trend}
            icon={<Cpu className="w-5 h-5" />}
          />
          <StatCard
            title="Avg Memory Usage"
            value={stats.avgMemory.value}
            change={stats.avgMemory.value}
            trend={stats.avgMemory.trend}
            icon={<MemoryStick className="w-5 h-5" />}
          />
          <StatCard
            title="Error Rate"
            value={stats.errorRate.value}
            change={stats.errorRate.value}
            trend={stats.errorRate.trend}
            icon={<AlertTriangle className="w-5 h-5" />}
          />
        </div>
      )}

      {/* Historical Trend Charts */}
      <div className="space-y-6">
        <MetricTrendChart
          data={chartData}
          metrics={selectedMetrics}
          title="Performance Trends"
          height={400}
          showBrush={true}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MetricTrendChart
            data={chartData}
            metrics={['cpu', 'memory']}
            title="Resource Utilization"
            height={300}
          />

          <MetricTrendChart
            data={chartData}
            metrics={['responseTime', 'errorRate']}
            title="Performance & Reliability"
            height={300}
          />
        </div>
      </div>
    </div>
  );
};

export default HistoricalCharts;
