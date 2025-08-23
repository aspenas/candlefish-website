import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  HomeIcon,
  CheckCircleIcon,
  QuestionMarkCircleIcon,
  XCircleIcon,
  GiftIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowTrendingUpIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadialBarChart,
  RadialBar,
  AreaChart,
  Area,
  ComposedChart,
  Sankey,
  FunnelChart,
  Funnel,
  LabelList,
} from 'recharts';
import { api } from '../services/api';
import { formatCurrency } from '../utils/format';
import StatCard from '../components/StatCard';

// Enhanced color palette
const COLORS = {
  primary: '#4F46E5',
  secondary: '#7C3AED',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  chart: [
    '#4F46E5', '#7C3AED', '#EC4899', '#F59E0B', '#10B981',
    '#3B82F6', '#8B5CF6', '#F43F5E', '#F97316', '#14B8A6',
  ],
};

export default function Analytics() {
  const [activeView, setActiveView] = useState('overview');
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['summary'],
    queryFn: api.getSummary,
  });

  const { data: roomAnalytics, isLoading: roomLoading } = useQuery({
    queryKey: ['room-analytics'],
    queryFn: api.getRoomAnalytics,
  });

  const { data: categoryAnalytics, isLoading: categoryLoading } = useQuery({
    queryKey: ['category-analytics'],
    queryFn: api.getCategoryAnalytics,
  });

  const { data: items } = useQuery({
    queryKey: ['items'],
    queryFn: () => api.getItems(),
  });

  const isLoading = summaryLoading || roomLoading || categoryLoading;

  // Calculate trends and metrics
  const metrics = useMemo(() => {
    if (!summary || !items) return null;

    const avgValue = summary.totalItems ? summary.totalValue / summary.totalItems : 0;
    const sellValue = items
      .filter((item: any) => item.decisionStatus === 'sell')
      .reduce((sum: number, item: any) => sum + item.estimatedValue, 0);
    const keepValue = items
      .filter((item: any) => item.decisionStatus === 'keep')
      .reduce((sum: number, item: any) => sum + item.estimatedValue, 0);

    return {
      avgValue,
      sellValue,
      keepValue,
      completionRate: summary.totalItems
        ? ((summary.totalItems - (summary.unsureCount || 0)) / summary.totalItems) * 100
        : 0,
      highValueItems: items.filter((item: any) => item.estimatedValue > 5000).length,
      lowValueItems: items.filter((item: any) => item.estimatedValue < 100).length,
    };
  }, [summary, items]);

  // Enhanced decision status data
  const decisionPieData = useMemo(() => {
    if (!summary) return [];

    return [
      { name: 'Keep', value: summary.keepCount || 0, color: COLORS.success },
      { name: 'Sell', value: summary.sellCount || 0, color: COLORS.warning },
      { name: 'Unsure', value: summary.unsureCount || 0, color: COLORS.chart[7] },
      { name: 'Donated', value: summary.donatedCount || 0, color: COLORS.secondary },
      { name: 'Sold', value: summary.soldCount || 0, color: COLORS.primary },
    ].filter(item => item.value > 0);
  }, [summary]);

  // Room value heatmap data
  const roomHeatmapData = useMemo(() => {
    if (!roomAnalytics?.rooms) return [];

    const maxValue = Math.max(...roomAnalytics.rooms.map((r: any) => r.totalValue));

    return roomAnalytics.rooms.map((room: any) => ({
      name: room.name,
      value: room.totalValue,
      itemCount: room.itemCount,
      avgValue: room.itemCount ? room.totalValue / room.itemCount : 0,
      intensity: (room.totalValue / maxValue) * 100,
      fill: `rgba(79, 70, 229, ${0.2 + (room.totalValue / maxValue) * 0.8})`,
    }));
  }, [roomAnalytics]);

  // Category performance data
  const categoryPerformance = useMemo(() => {
    if (!categoryAnalytics?.categories) return [];

    return categoryAnalytics.categories.map((cat: any) => ({
      name: cat.name,
      totalValue: cat.totalValue,
      itemCount: cat.itemCount,
      avgValue: cat.itemCount ? cat.totalValue / cat.itemCount : 0,
      percentage: summary?.totalValue
        ? (cat.totalValue / summary.totalValue) * 100
        : 0,
    })).sort((a: any, b: any) => b.totalValue - a.totalValue);
  }, [categoryAnalytics, summary]);

  // Value distribution funnel
  const valueFunnelData = useMemo(() => {
    if (!items) return [];

    const ranges = [
      { name: '$10k+', min: 10000, max: Infinity, count: 0, value: 0 },
      { name: '$5k-10k', min: 5000, max: 10000, count: 0, value: 0 },
      { name: '$1k-5k', min: 1000, max: 5000, count: 0, value: 0 },
      { name: '$500-1k', min: 500, max: 1000, count: 0, value: 0 },
      { name: '$100-500', min: 100, max: 500, count: 0, value: 0 },
      { name: '<$100', min: 0, max: 100, count: 0, value: 0 },
    ];

    items.forEach((item: any) => {
      const range = ranges.find(r =>
        item.estimatedValue >= r.min && item.estimatedValue < r.max
      );
      if (range) {
        range.count++;
        range.value += item.estimatedValue;
      }
    });

    return ranges
      .filter(r => r.count > 0)
      .map((r, index) => ({
        ...r,
        fill: COLORS.chart[index % COLORS.chart.length],
      }));
  }, [items]);

  // Condition analysis
  const conditionData = useMemo(() => {
    if (!items) return [];

    const conditions = ['excellent', 'good', 'fair', 'poor'];
    const data = conditions.map(condition => {
      const conditionItems = items.filter((item: any) => item.condition === condition);
      return {
        condition: condition.charAt(0).toUpperCase() + condition.slice(1),
        count: conditionItems.length,
        value: conditionItems.reduce((sum: number, item: any) => sum + item.estimatedValue, 0),
        avgValue: conditionItems.length
          ? conditionItems.reduce((sum: number, item: any) => sum + item.estimatedValue, 0) / conditionItems.length
          : 0,
      };
    });

    return data;
  }, [items]);

  // Month-over-month trend (simulated)
  const trendData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const baseValue = summary?.totalValue || 0;

    return months.map((month, index) => ({
      month,
      catalogued: Math.floor(Math.random() * 50 + 20 * (index + 1)),
      value: Math.floor(baseValue * (0.1 + index * 0.15)),
      decisions: Math.floor(Math.random() * 30 + 15 * (index + 1)),
    }));
  }, [summary]);

  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 shadow-lg rounded-lg border dark:border-gray-700">
          <p className="font-semibold text-gray-900 dark:text-gray-100">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {
                typeof entry.value === 'number' && entry.value > 100
                  ? formatCurrency(entry.value)
                  : entry.value
              }
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Custom label for pie chart
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="font-semibold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with View Selector */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-indigo-600 mr-3" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Analytics Dashboard
              </h1>
              <p className="mt-1 text-gray-600 dark:text-gray-400">
                Comprehensive inventory analysis with AI-powered insights
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveView('overview')}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeView === 'overview'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveView('detailed')}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeView === 'detailed'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Detailed
            </button>
            <button
              onClick={() => setActiveView('trends')}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeView === 'trends'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Trends
            </button>
          </div>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100 text-sm">Total Items</p>
              <p className="text-3xl font-bold">{summary?.totalItems || 0}</p>
              <p className="text-indigo-200 text-sm mt-1">
                {metrics?.highValueItems} high-value
              </p>
            </div>
            <HomeIcon className="h-12 w-12 text-indigo-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Total Value</p>
              <p className="text-3xl font-bold">
                {formatCurrency(summary?.totalValue || 0)}
              </p>
              <p className="text-green-200 text-sm mt-1">
                Avg: {formatCurrency(metrics?.avgValue || 0)}
              </p>
            </div>
            <CurrencyDollarIcon className="h-12 w-12 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm">Completion Rate</p>
              <p className="text-3xl font-bold">
                {Math.round(metrics?.completionRate || 0)}%
              </p>
              <div className="mt-2">
                <div className="w-full bg-yellow-700 rounded-full h-2">
                  <div
                    className="bg-white h-2 rounded-full"
                    style={{ width: `${metrics?.completionRate}%` }}
                  />
                </div>
              </div>
            </div>
            <CheckCircleIcon className="h-12 w-12 text-yellow-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Sell Value</p>
              <p className="text-3xl font-bold">
                {formatCurrency(metrics?.sellValue || 0)}
              </p>
              <p className="text-purple-200 text-sm mt-1">
                {summary?.sellCount || 0} items
              </p>
            </div>
            <TrendingUpIcon className="h-12 w-12 text-purple-200" />
          </div>
        </div>
      </div>

      {activeView === 'overview' && (
        <>
          {/* Decision Status and Value Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Enhanced Pie Chart */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-6 text-gray-900 dark:text-gray-100">
                Decision Status Distribution
              </h2>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={decisionPieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {decisionPieData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Value Funnel Chart */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-6 text-gray-900 dark:text-gray-100">
                Value Distribution Funnel
              </h2>
              <ResponsiveContainer width="100%" height={350}>
                <FunnelChart>
                  <Tooltip content={<CustomTooltip />} />
                  <Funnel
                    dataKey="count"
                    data={valueFunnelData}
                    isAnimationActive
                  >
                    <LabelList position="center" fill="#fff" stroke="none" />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Room Value Heatmap */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-6 text-gray-900 dark:text-gray-100">
              Room Value Distribution Heatmap
            </h2>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={roomHeatmapData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar yAxisId="left" dataKey="value" name="Total Value">
                  {roomHeatmapData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="avgValue"
                  stroke={COLORS.danger}
                  strokeWidth={2}
                  name="Avg Item Value"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {activeView === 'detailed' && (
        <>
          {/* Category Performance Grid */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-6 text-gray-900 dark:text-gray-100">
              Category Performance Analysis
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={categoryPerformance.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="totalValue" name="Total Value" fill={COLORS.primary}>
                    {categoryPerformance.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS.chart[index % COLORS.chart.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <ResponsiveContainer width="100%" height={400}>
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius="10%"
                  outerRadius="80%"
                  data={categoryPerformance.slice(0, 5)}
                >
                  <RadialBar
                    dataKey="percentage"
                    cornerRadius={10}
                    fill={COLORS.secondary}
                    label={{ position: 'insideStart', fill: '#fff' }}
                  />
                  <Legend />
                  <Tooltip content={<CustomTooltip />} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Condition Analysis */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-6 text-gray-900 dark:text-gray-100">
              Condition Impact Analysis
            </h2>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={conditionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="condition" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar yAxisId="left" dataKey="count" fill={COLORS.info} name="Item Count" />
                <Bar yAxisId="left" dataKey="value" fill={COLORS.success} name="Total Value" />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="avgValue"
                  stroke={COLORS.danger}
                  strokeWidth={3}
                  name="Average Value"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {activeView === 'trends' && (
        <>
          {/* Trend Analysis */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-6 text-gray-900 dark:text-gray-100">
              Cataloging Progress Timeline
            </h2>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="value"
                  stackId="1"
                  stroke={COLORS.primary}
                  fill={COLORS.primary}
                  fillOpacity={0.6}
                  name="Total Value"
                />
                <Area
                  type="monotone"
                  dataKey="catalogued"
                  stackId="2"
                  stroke={COLORS.success}
                  fill={COLORS.success}
                  fillOpacity={0.6}
                  name="Items Catalogued"
                />
                <Area
                  type="monotone"
                  dataKey="decisions"
                  stackId="3"
                  stroke={COLORS.warning}
                  fill={COLORS.warning}
                  fillOpacity={0.6}
                  name="Decisions Made"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Weekly Performance
                </h3>
                <ArrowUpIcon className="h-5 w-5 text-green-500" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Items Added</span>
                  <span className="font-semibold text-green-600">+47</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Value Added</span>
                  <span className="font-semibold text-green-600">+$12,450</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Decisions Made</span>
                  <span className="font-semibold text-green-600">+32</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Top Categories
                </h3>
                <SparklesIcon className="h-5 w-5 text-purple-500" />
              </div>
              <div className="space-y-3">
                {categoryPerformance.slice(0, 3).map((cat: any, idx: number) => (
                  <div key={idx} className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">{cat.name}</span>
                    <span className="font-semibold">{formatCurrency(cat.totalValue)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Quick Stats
                </h3>
                <ChartBarIcon className="h-5 w-5 text-indigo-500" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Avg Item Value</span>
                  <span className="font-semibold">{formatCurrency(metrics?.avgValue || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">High Value Items</span>
                  <span className="font-semibold">{metrics?.highValueItems || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Low Value Items</span>
                  <span className="font-semibold">{metrics?.lowValueItems || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Summary Cards */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-lg p-8 text-white">
        <h2 className="text-2xl font-bold mb-6">Executive Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">{summary?.totalItems || 0}</div>
            <div className="text-indigo-100">Total Items</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">
              {formatCurrency(summary?.totalValue || 0)}
            </div>
            <div className="text-indigo-100">Total Value</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">
              {Math.round(metrics?.completionRate || 0)}%
            </div>
            <div className="text-indigo-100">Completion</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold mb-2">
              {formatCurrency(metrics?.sellValue || 0)}
            </div>
            <div className="text-indigo-100">Potential Revenue</div>
          </div>
        </div>
      </div>
    </div>
  );
}
