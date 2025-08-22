import React, { useState, useMemo } from 'react';
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
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar
} from 'recharts';
import { motion } from 'framer-motion';
import {
  Activity,
  Cpu,
  MemoryStick,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import {
  RealtimeMetrics,
  AgentMetrics,
  ChartConfig,
  MetricType,
  TimeRange
} from '../../types/rtpm.types';

interface RealtimeChartsProps {
  data: RealtimeMetrics[];
  agentMetrics: Map<string, AgentMetrics[]>;
  timeRange: TimeRange;
  config?: Partial<ChartConfig>;
  className?: string;
}

interface MetricChartProps {
  title: string;
  data: any[];
  dataKey: string;
  color: string;
  icon: React.ReactNode;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  height?: number;
  type?: 'line' | 'area' | 'bar';
  showGrid?: boolean;
  animate?: boolean;
}

const MetricChart: React.FC<MetricChartProps> = ({
  title,
  data,
  dataKey,
  color,
  icon,
  unit = '',
  trend = 'stable',
  height = 200,
  type = 'line',
  showGrid = true,
  animate = true
}) => {
  const formatValue = (value: number) => {
    if (unit === '%') return `${value.toFixed(1)}%`;
    if (unit === 'ms') return `${Math.round(value)}ms`;
    if (unit === '/s') return `${Math.round(value)}/s`;
    return Math.round(value).toLocaleString();
  };

  const formatTimestamp = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-gray-400';

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-800/95 backdrop-blur-sm border border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-gray-300 text-sm mb-1">{formatTimestamp(label)}</p>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-white font-medium">
              {formatValue(payload[0].value)}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    const commonProps = {
      data,
      width: '100%',
      height
    };

    switch (type) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />}
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatTimestamp}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
            />
            <YAxis
              tickFormatter={formatValue}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              fill={color}
              fillOpacity={0.2}
              isAnimationActive={animate}
              animationDuration={1000}
            />
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />}
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatTimestamp}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
            />
            <YAxis
              tickFormatter={formatValue}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey={dataKey}
              fill={color}
              radius={[2, 2, 0, 0]}
              isAnimationActive={animate}
              animationDuration={1000}
            />
          </BarChart>
        );

      default:
        return (
          <LineChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />}
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatTimestamp}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
            />
            <YAxis
              tickFormatter={formatValue}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              dot={{ fill: color, strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, stroke: color, strokeWidth: 2, fill: '#1F2937' }}
              isAnimationActive={animate}
              animationDuration={1000}
            />
          </LineChart>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gray-700/50" style={{ color }}>
            {icon}
          </div>
          <div>
            <h3 className="text-white font-semibold">{title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <TrendIcon className={`w-4 h-4 ${trendColor}`} />
              <span className="text-sm text-gray-400">Real-time</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">
            {data.length > 0 ? formatValue(data[data.length - 1][dataKey]) : '—'}
          </div>
          <div className="text-sm text-gray-400">{unit && `Current ${unit.replace('/', ' per ')}`}</div>
        </div>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

const SystemHealthRadial: React.FC<{ data: RealtimeMetrics }> = ({ data }) => {
  const healthData = [
    {
      name: 'CPU',
      value: data.system.avgCpu,
      fill: data.system.avgCpu > 80 ? '#EF4444' : data.system.avgCpu > 60 ? '#F59E0B' : '#10B981'
    },
    {
      name: 'Memory',
      value: data.system.avgMemory,
      fill: data.system.avgMemory > 80 ? '#EF4444' : data.system.avgMemory > 60 ? '#F59E0B' : '#10B981'
    },
    {
      name: 'Response',
      value: Math.min((1000 - data.system.avgResponseTime) / 10, 100),
      fill: data.system.avgResponseTime > 500 ? '#EF4444' : data.system.avgResponseTime > 200 ? '#F59E0B' : '#10B981'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6"
    >
      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5 text-blue-400" />
        System Health
      </h3>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="20%"
            outerRadius="80%"
            data={healthData}
            startAngle={90}
            endAngle={450}
          >
            <RadialBar
              dataKey="value"
              cornerRadius={10}
              isAnimationActive={true}
              animationDuration={1500}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-gray-800/95 backdrop-blur-sm border border-gray-700 rounded-lg p-3 shadow-lg">
                      <p className="text-white font-medium">{payload[0].payload.name}</p>
                      <p className="text-gray-300">{payload[0].value.toFixed(1)}%</p>
                    </div>
                  );
                }
                return null;
              }}
            />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-4">
        {healthData.map((item, index) => (
          <div key={index} className="text-center">
            <div className="text-sm text-gray-400">{item.name}</div>
            <div className="text-lg font-bold text-white">{item.value.toFixed(1)}%</div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

const AgentStatusPie: React.FC<{ data: RealtimeMetrics }> = ({ data }) => {
  const statusData = [
    { name: 'Online', value: data.agents.online, fill: '#10B981' },
    { name: 'Offline', value: data.agents.offline, fill: '#6B7280' },
    { name: 'Warning', value: data.agents.warning, fill: '#F59E0B' },
    { name: 'Error', value: data.agents.error, fill: '#EF4444' }
  ].filter(item => item.value > 0);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6"
    >
      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5 text-green-400" />
        Agent Status Distribution
      </h3>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={statusData}
              cx="50%"
              cy="50%"
              outerRadius={80}
              dataKey="value"
              isAnimationActive={true}
              animationDuration={1000}
            >
              {statusData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-gray-800/95 backdrop-blur-sm border border-gray-700 rounded-lg p-3 shadow-lg">
                      <p className="text-white font-medium">{payload[0].name}</p>
                      <p className="text-gray-300">{payload[0].value} agents</p>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4">
        {statusData.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
            <span className="text-sm text-gray-300">{item.name}: {item.value}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export const RealtimeCharts: React.FC<RealtimeChartsProps> = ({
  data,
  agentMetrics,
  timeRange,
  config = {},
  className = ''
}) => {
  const chartData = useMemo(() => {
    return data.map(metric => ({
      timestamp: metric.timestamp,
      cpu: metric.system.avgCpu,
      memory: metric.system.avgMemory,
      responseTime: metric.system.avgResponseTime,
      requestRate: metric.system.requestRate,
      errorRate: metric.system.errorRate,
      throughput: metric.system.throughput,
      activeConnections: metric.system.activeConnections,
      networkLatency: metric.network.latency
    }));
  }, [data]);

  const currentMetrics = data.length > 0 ? data[data.length - 1] : null;

  if (!currentMetrics) {
    return (
      <div className={`flex items-center justify-center h-64 text-gray-400 ${className}`}>
        <div className="text-center">
          <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Waiting for real-time data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SystemHealthRadial data={currentMetrics} />
        <AgentStatusPie data={currentMetrics} />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6"
        >
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            Key Metrics
          </h3>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Active Agents</span>
              <span className="text-2xl font-bold text-white">{currentMetrics.agents.online}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-400">Avg Response</span>
              <span className="text-2xl font-bold text-white">
                {Math.round(currentMetrics.system.avgResponseTime)}ms
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-400">Request Rate</span>
              <span className="text-2xl font-bold text-white">
                {Math.round(currentMetrics.system.requestRate)}/s
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-400">Error Rate</span>
              <span className={`text-2xl font-bold ${
                currentMetrics.system.errorRate > 5 ? 'text-red-400' :
                currentMetrics.system.errorRate > 2 ? 'text-yellow-400' : 'text-green-400'
              }`}>
                {currentMetrics.system.errorRate.toFixed(1)}%
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Real-time Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MetricChart
          title="CPU Usage"
          data={chartData}
          dataKey="cpu"
          color="#3B82F6"
          icon={<Cpu className="w-5 h-5" />}
          unit="%"
          type="area"
          trend="stable"
        />

        <MetricChart
          title="Memory Usage"
          data={chartData}
          dataKey="memory"
          color="#10B981"
          icon={<MemoryStick className="w-5 h-5" />}
          unit="%"
          type="area"
          trend="stable"
        />

        <MetricChart
          title="Response Time"
          data={chartData}
          dataKey="responseTime"
          color="#F59E0B"
          icon={<Clock className="w-5 h-5" />}
          unit="ms"
          type="line"
          trend="down"
        />

        <MetricChart
          title="Request Rate"
          data={chartData}
          dataKey="requestRate"
          color="#8B5CF6"
          icon={<Activity className="w-5 h-5" />}
          unit="/s"
          type="bar"
          trend="up"
        />

        <MetricChart
          title="Error Rate"
          data={chartData}
          dataKey="errorRate"
          color="#EF4444"
          icon={<AlertTriangle className="w-5 h-5" />}
          unit="%"
          type="line"
          trend="down"
        />

        <MetricChart
          title="Throughput"
          data={chartData}
          dataKey="throughput"
          color="#06B6D4"
          icon={<TrendingUp className="w-5 h-5" />}
          unit="/s"
          type="area"
          trend="up"
        />
      </div>
    </div>
  );
};

export default RealtimeCharts;
