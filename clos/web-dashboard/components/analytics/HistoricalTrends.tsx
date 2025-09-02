'use client';

import React, { useMemo, useState } from 'react';
import { useAnalyticsStore } from '../../stores/analyticsStore';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Area,
  AreaChart,
} from 'recharts';
import { format, subHours, subDays, startOfHour, startOfDay } from 'date-fns';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  BarChart3,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';

interface HistoricalTrendsProps {
  className?: string;
}

const HistoricalTrends: React.FC<HistoricalTrendsProps> = ({ className }) => {
  const { 
    agentPerformance, 
    serviceHealth, 
    timeRange,
    setTimeRange,
    isLoading 
  } = useAnalyticsStore();

  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['responseTime', 'successRate']);
  const [comparisonPeriod, setComparisonPeriod] = useState<'previous-period' | 'previous-week' | 'previous-month'>('previous-period');
  const [viewType, setViewType] = useState<'trend' | 'comparison' | 'distribution'>('trend');

  const metricOptions = [
    { value: 'responseTime', label: 'Response Time', unit: 'ms', color: '#3B82F6' },
    { value: 'successRate', label: 'Success Rate', unit: '%', color: '#10B981' },
    { value: 'memoryUsage', label: 'Memory Usage', unit: '%', color: '#F59E0B' },
    { value: 'cpuUsage', label: 'CPU Usage', unit: '%', color: '#EF4444' },
    { value: 'requestCount', label: 'Request Count', unit: '', color: '#8B5CF6' },
    { value: 'errorCount', label: 'Error Count', unit: '', color: '#F97316' },
  ];

  // Process data for trends
  const trendData = useMemo(() => {
    if (!agentPerformance.length) return [];

    // Group data by time intervals
    const getTimeKey = (timestamp: string) => {
      const date = new Date(timestamp);
      return timeRange === '1h' || timeRange === '4h' 
        ? startOfHour(date).getTime()
        : startOfDay(date).getTime();
    };

    const grouped = agentPerformance.reduce((acc, metric) => {
      const timeKey = getTimeKey(metric.timestamp);
      
      if (!acc[timeKey]) {
        acc[timeKey] = {
          timestamp: timeKey,
          time: format(new Date(timeKey), timeRange === '1h' || timeRange === '4h' ? 'HH:mm' : 'MM/dd'),
          fullTime: format(new Date(timeKey), 'MMM dd, HH:mm'),
          data: [],
        };
      }
      
      acc[timeKey].data.push(metric);
      return acc;
    }, {} as Record<number, any>);

    // Calculate averages for each time period
    return Object.values(grouped)
      .map((group: any) => {
        const metrics = group.data;
        const result: any = {
          timestamp: group.timestamp,
          time: group.time,
          fullTime: group.fullTime,
        };

        selectedMetrics.forEach(metricName => {
          const values = metrics.map((m: any) => {
            let value = m[metricName];
            if (metricName === 'successRate' || metricName === 'memoryUsage' || metricName === 'cpuUsage') {
              value *= 100;
            }
            return value;
          });
          
          result[metricName] = values.reduce((sum: number, val: number) => sum + val, 0) / values.length;
        });

        return result;
      })
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [agentPerformance, selectedMetrics, timeRange]);

  // Calculate comparison data
  const comparisonData = useMemo(() => {
    if (!trendData.length) return null;

    const currentPeriod = trendData;
    const periodLength = currentPeriod.length;
    
    // Get comparison period data
    let comparisonStart: Date;
    switch (comparisonPeriod) {
      case 'previous-week':
        comparisonStart = subDays(new Date(), 7);
        break;
      case 'previous-month':
        comparisonStart = subDays(new Date(), 30);
        break;
      default:
        comparisonStart = subHours(new Date(), parseInt(timeRange.replace(/[^\d]/g, '')) * 2);
    }

    const comparisonMetrics = agentPerformance.filter(metric => 
      new Date(metric.timestamp) >= comparisonStart &&
      new Date(metric.timestamp) < new Date(currentPeriod[0]?.timestamp || Date.now())
    );

    if (!comparisonMetrics.length) return null;

    // Calculate averages for comparison
    const comparison: any = {};
    selectedMetrics.forEach(metricName => {
      const values = comparisonMetrics.map(m => {
        let value = m[metricName as keyof typeof m] as number;
        if (metricName === 'successRate' || metricName === 'memoryUsage' || metricName === 'cpuUsage') {
          value *= 100;
        }
        return value;
      });
      
      const currentAvg = currentPeriod.reduce((sum, point) => sum + point[metricName], 0) / currentPeriod.length;
      const comparisonAvg = values.reduce((sum, val) => sum + val, 0) / values.length;
      
      comparison[metricName] = {
        current: currentAvg,
        previous: comparisonAvg,
        change: ((currentAvg - comparisonAvg) / comparisonAvg) * 100,
      };
    });

    return comparison;
  }, [trendData, comparisonPeriod, selectedMetrics, agentPerformance, timeRange]);

  const formatValue = (value: number, metric: string) => {
    const option = metricOptions.find(m => m.value === metric);
    if (option?.unit === '%') {
      return `${value.toFixed(1)}%`;
    } else if (option?.unit === 'ms') {
      return `${value.toFixed(0)}ms`;
    } else {
      return value.toFixed(0);
    }
  };

  const getTrendIcon = (change: number) => {
    if (change > 5) return <ArrowUpRight className="h-4 w-4 text-green-600" />;
    if (change < -5) return <ArrowDownRight className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-600" />;
  };

  const renderTrendChart = () => (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
          tickFormatter={(value) => {
            // Use the first selected metric for Y-axis formatting
            return formatValue(value, selectedMetrics[0]);
          }}
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
            formatValue(value, name),
            metricOptions.find(m => m.value === name)?.label || name
          ]}
          labelFormatter={(label, payload) => 
            payload?.[0]?.payload?.fullTime || label
          }
        />
        <Legend />
        
        {selectedMetrics.map((metric) => {
          const option = metricOptions.find(m => m.value === metric);
          return (
            <Line
              key={metric}
              type="monotone"
              dataKey={metric}
              name={option?.label || metric}
              stroke={option?.color}
              strokeWidth={2}
              dot={{ r: 3, fill: option?.color }}
              activeDot={{ r: 5, fill: option?.color }}
            />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );

  const renderComparisonView = () => (
    <div className="space-y-6">
      {/* Comparison Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {comparisonData && selectedMetrics.map((metric) => {
          const data = comparisonData[metric];
          const option = metricOptions.find(m => m.value === metric);
          
          return (
            <div key={metric} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-900">
                  {option?.label || metric}
                </h4>
                {getTrendIcon(data.change)}
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Current:</span>
                  <span className="font-semibold">{formatValue(data.current, metric)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Previous:</span>
                  <span>{formatValue(data.previous, metric)}</span>
                </div>
                <div className={`flex justify-between text-sm font-medium ${
                  data.change > 0 ? 'text-green-600' : data.change < 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  <span>Change:</span>
                  <span>{data.change > 0 ? '+' : ''}{data.change.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Trend Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Trend Analysis</h4>
        {renderTrendChart()}
      </div>
    </div>
  );

  const renderDistributionView = () => (
    <ResponsiveContainer width="100%" height={400}>
      <AreaChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
          tickFormatter={(value) => formatValue(value, selectedMetrics[0])}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: '#1F2937',
            border: 'none',
            borderRadius: '8px',
            color: '#F9FAFB',
          }}
          formatter={(value: number, name: string) => [
            formatValue(value, name),
            metricOptions.find(m => m.value === name)?.label || name
          ]}
        />
        <Legend />
        
        {selectedMetrics.map((metric, index) => {
          const option = metricOptions.find(m => m.value === metric);
          return (
            <Area
              key={metric}
              type="monotone"
              dataKey={metric}
              name={option?.label || metric}
              stackId="1"
              stroke={option?.color}
              fill={option?.color}
              fillOpacity={0.6}
            />
          );
        })}
      </AreaChart>
    </ResponsiveContainer>
  );

  if (isLoading && !trendData.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading historical data...</div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900">Historical Trends</h2>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                Analyzing {timeRange} of data
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* View Type */}
            <div className="flex items-center space-x-1 bg-gray-100 rounded-md p-1">
              <button
                onClick={() => setViewType('trend')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  viewType === 'trend' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Trend
              </button>
              <button
                onClick={() => setViewType('comparison')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  viewType === 'comparison' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Compare
              </button>
              <button
                onClick={() => setViewType('distribution')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  viewType === 'distribution' ? 'bg-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Distribution
              </button>
            </div>

            {/* Time Range */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1h">Last Hour</option>
              <option value="4h">Last 4 Hours</option>
              <option value="12h">Last 12 Hours</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
            </select>
          </div>
        </div>

        {/* Metric Selection */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center space-x-2 mb-2">
            <BarChart3 className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Metrics to analyze:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {metricOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  const isSelected = selectedMetrics.includes(option.value);
                  if (isSelected) {
                    setSelectedMetrics(prev => prev.filter(m => m !== option.value));
                  } else {
                    setSelectedMetrics(prev => [...prev, option.value]);
                  }
                }}
                className={`flex items-center px-3 py-1 text-sm rounded-md transition-colors ${
                  selectedMetrics.includes(option.value)
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                }`}
              >
                <div 
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: option.color }}
                />
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Comparison Period (for comparison view) */}
        {viewType === 'comparison' && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Compare with:</span>
              <select
                value={comparisonPeriod}
                onChange={(e) => setComparisonPeriod(e.target.value as any)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="previous-period">Previous Period</option>
                <option value="previous-week">Previous Week</option>
                <option value="previous-month">Previous Month</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        {!trendData.length ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Activity className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No historical data available</p>
              <p className="text-sm text-gray-400">Data will appear as metrics are collected over time</p>
            </div>
          </div>
        ) : (
          <>
            {viewType === 'trend' && renderTrendChart()}
            {viewType === 'comparison' && renderComparisonView()}
            {viewType === 'distribution' && renderDistributionView()}
          </>
        )}
      </div>
    </div>
  );
};

export default HistoricalTrends;