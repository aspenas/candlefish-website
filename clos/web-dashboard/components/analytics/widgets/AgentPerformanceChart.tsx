'use client';

import React, { useMemo, useState } from 'react';
import { useAnalyticsStore } from '../../../stores/analyticsStore';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from 'recharts';
import { format, subHours } from 'date-fns';
import { TrendingUp, TrendingDown, Activity, Clock } from 'lucide-react';

interface AgentPerformanceChartProps {
  config?: {
    chartType?: 'line' | 'area' | 'bar';
    metrics?: string[];
    showComparison?: boolean;
  };
}

const AgentPerformanceChart: React.FC<AgentPerformanceChartProps> = ({
  config = {
    chartType: 'line',
    metrics: ['responseTime', 'successRate'],
    showComparison: false,
  },
}) => {
  const { 
    agentPerformance, 
    selectedAgents, 
    timeRange,
    isLoading 
  } = useAnalyticsStore();

  const [selectedMetric, setSelectedMetric] = useState<string>(config.metrics?.[0] || 'responseTime');
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>(config.chartType || 'line');

  const metricOptions = [
    { value: 'responseTime', label: 'Response Time (ms)', color: '#3B82F6' },
    { value: 'successRate', label: 'Success Rate (%)', color: '#10B981' },
    { value: 'memoryUsage', label: 'Memory Usage (%)', color: '#F59E0B' },
    { value: 'cpuUsage', label: 'CPU Usage (%)', color: '#EF4444' },
    { value: 'requestCount', label: 'Request Count', color: '#8B5CF6' },
    { value: 'errorCount', label: 'Error Count', color: '#F97316' },
  ];

  // Process data for the chart
  const chartData = useMemo(() => {
    if (!agentPerformance.length) return [];

    // Filter by selected agents if any
    const filteredData = agentPerformance.filter(metric => 
      selectedAgents.length === 0 || selectedAgents.includes(metric.agentName)
    );

    // Group by timestamp and agent
    const groupedData = filteredData.reduce((acc, metric) => {
      const timestamp = new Date(metric.timestamp).toISOString();
      
      if (!acc[timestamp]) {
        acc[timestamp] = {
          timestamp,
          time: format(new Date(metric.timestamp), 'HH:mm'),
          fullTime: format(new Date(metric.timestamp), 'MMM dd, HH:mm:ss'),
        };
      }

      // Add agent-specific metrics
      acc[timestamp][`${metric.agentName}_${selectedMetric}`] = 
        selectedMetric === 'successRate' ? metric.successRate * 100 :
        selectedMetric === 'memoryUsage' ? metric.memoryUsage * 100 :
        selectedMetric === 'cpuUsage' ? metric.cpuUsage * 100 :
        metric[selectedMetric as keyof typeof metric];

      return acc;
    }, {} as Record<string, any>);

    return Object.values(groupedData).sort((a: any, b: any) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [agentPerformance, selectedAgents, selectedMetric]);

  // Get unique agent names for the chart lines
  const agentNames = useMemo(() => {
    const names = Array.from(new Set(agentPerformance.map(metric => metric.agentName)));
    return selectedAgents.length === 0 ? names : names.filter(name => selectedAgents.includes(name));
  }, [agentPerformance, selectedAgents]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!agentPerformance.length) return null;

    const currentMetrics = agentPerformance
      .filter(metric => selectedAgents.length === 0 || selectedAgents.includes(metric.agentName))
      .slice(-agentNames.length); // Get latest metrics for each agent

    const values = currentMetrics.map(metric => {
      const value = selectedMetric === 'successRate' ? metric.successRate * 100 :
                   selectedMetric === 'memoryUsage' ? metric.memoryUsage * 100 :
                   selectedMetric === 'cpuUsage' ? metric.cpuUsage * 100 :
                   metric[selectedMetric as keyof typeof metric] as number;
      return value;
    });

    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Calculate trend (compare with previous hour)
    const previousMetrics = agentPerformance
      .filter(metric => selectedAgents.length === 0 || selectedAgents.includes(metric.agentName))
      .slice(-agentNames.length * 2, -agentNames.length);

    let trend = 0;
    if (previousMetrics.length === currentMetrics.length) {
      const prevValues = previousMetrics.map(metric => {
        const value = selectedMetric === 'successRate' ? metric.successRate * 100 :
                     selectedMetric === 'memoryUsage' ? metric.memoryUsage * 100 :
                     selectedMetric === 'cpuUsage' ? metric.cpuUsage * 100 :
                     metric[selectedMetric as keyof typeof metric] as number;
        return value;
      });
      const prevAvg = prevValues.reduce((sum, val) => sum + val, 0) / prevValues.length;
      trend = ((avg - prevAvg) / prevAvg) * 100;
    }

    return { avg, min, max, trend, count: values.length };
  }, [agentPerformance, selectedAgents, selectedMetric, agentNames]);

  const selectedMetricInfo = metricOptions.find(m => m.value === selectedMetric);
  
  const formatValue = (value: number) => {
    if (selectedMetric.includes('Rate') || selectedMetric.includes('Usage')) {
      return `${value.toFixed(1)}%`;
    } else if (selectedMetric === 'responseTime') {
      return `${value.toFixed(0)}ms`;
    } else {
      return value.toFixed(0);
    }
  };

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    };

    const ChartComponent = chartType === 'area' ? AreaChart : 
                          chartType === 'bar' ? BarChart : LineChart;

    return (
      <ResponsiveContainer width="100%" height={300}>
        <ChartComponent {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis 
            dataKey="time" 
            stroke="#6B7280"
            fontSize={12}
            tickLine={false}
          />
          <YAxis 
            stroke="#6B7280"
            fontSize={12}
            tickLine={false}
            tickFormatter={formatValue}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#1F2937',
              border: 'none',
              borderRadius: '8px',
              color: '#F9FAFB',
            }}
            labelStyle={{ color: '#D1D5DB' }}
            formatter={(value: number, name: string) => [
              formatValue(value),
              name.split('_')[0] // Agent name
            ]}
            labelFormatter={(label, payload) => 
              payload?.[0]?.payload?.fullTime || label
            }
          />
          <Legend />
          
          {agentNames.map((agentName, index) => {
            const dataKey = `${agentName}_${selectedMetric}`;
            const color = `hsl(${(index * 360) / agentNames.length}, 70%, 50%)`;
            
            if (chartType === 'area') {
              return (
                <Area
                  key={dataKey}
                  type="monotone"
                  dataKey={dataKey}
                  name={agentName}
                  stroke={color}
                  fill={color}
                  fillOpacity={0.3}
                  strokeWidth={2}
                  dot={{ r: 3, fill: color }}
                />
              );
            } else if (chartType === 'bar') {
              return (
                <Bar
                  key={dataKey}
                  dataKey={dataKey}
                  name={agentName}
                  fill={color}
                />
              );
            } else {
              return (
                <Line
                  key={dataKey}
                  type="monotone"
                  dataKey={dataKey}
                  name={agentName}
                  stroke={color}
                  strokeWidth={2}
                  dot={{ r: 3, fill: color }}
                  activeDot={{ r: 5, fill: color }}
                />
              );
            }
          })}
        </ChartComponent>
      </ResponsiveContainer>
    );
  };

  if (isLoading && !chartData.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading performance data...</div>
      </div>
    );
  }

  if (!chartData.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="h-12 w-12 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500">No performance data available</p>
          <p className="text-sm text-gray-400">Data will appear once agents start reporting metrics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Metric:</label>
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {metricOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setChartType('line')}
            className={`px-2 py-1 text-xs rounded-md transition-colors ${
              chartType === 'line' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Line
          </button>
          <button
            onClick={() => setChartType('area')}
            className={`px-2 py-1 text-xs rounded-md transition-colors ${
              chartType === 'area' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Area
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`px-2 py-1 text-xs rounded-md transition-colors ${
              chartType === 'bar' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Bar
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      {summaryStats && (
        <div className="grid grid-cols-4 gap-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {formatValue(summaryStats.avg)}
            </div>
            <div className="text-xs text-gray-600">Average</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">
              {formatValue(summaryStats.min)}
            </div>
            <div className="text-xs text-gray-600">Minimum</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-red-600">
              {formatValue(summaryStats.max)}
            </div>
            <div className="text-xs text-gray-600">Maximum</div>
          </div>
          <div className="text-center">
            <div className={`flex items-center justify-center text-lg font-semibold ${
              summaryStats.trend >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {summaryStats.trend >= 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
              {summaryStats.trend > 0 ? '+' : ''}{summaryStats.trend.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-600">Trend</div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="bg-white">
        {renderChart()}
      </div>

      {/* Agent Legend */}
      {agentNames.length > 1 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
          {agentNames.map((agentName, index) => {
            const color = `hsl(${(index * 360) / agentNames.length}, 70%, 50%)`;
            return (
              <div key={agentName} className="flex items-center text-xs">
                <div 
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: color }}
                />
                <span className="text-gray-700">{agentName}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AgentPerformanceChart;