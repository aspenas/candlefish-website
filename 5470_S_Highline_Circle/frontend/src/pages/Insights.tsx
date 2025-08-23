import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LightBulbIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  FireIcon,
  GiftIcon,
  ClockIcon,
  ScaleIcon,
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Treemap,
  Area,
  AreaChart,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';
import { api } from '../services/api';
import { formatCurrency } from '../utils/format';

// Color palettes
const COLORS = {
  primary: ['#4F46E5', '#6366F1', '#818CF8', '#A5B4FC', '#C7D2FE'],
  success: ['#059669', '#10B981', '#34D399', '#6EE7B7', '#A7F3D0'],
  warning: ['#D97706', '#F59E0B', '#FBBF24', '#FCD34D', '#FDE68A'],
  danger: ['#DC2626', '#EF4444', '#F87171', '#FCA5A5', '#FECACA'],
  neutral: ['#1F2937', '#4B5563', '#6B7280', '#9CA3AF', '#D1D5DB'],
};

interface InsightCard {
  id: string;
  type: 'recommendation' | 'warning' | 'opportunity' | 'trend';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  action: string;
  value?: number;
  items?: any[];
}

export default function Insights() {
  const [selectedInsight, setSelectedInsight] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('30d');

  // Fetch data
  const { data: items } = useQuery({
    queryKey: ['items'],
    queryFn: () => api.getItems(),
  });

  const { data: summary } = useQuery({
    queryKey: ['summary'],
    queryFn: api.getSummary,
  });

  const { data: roomAnalytics } = useQuery({
    queryKey: ['room-analytics'],
    queryFn: api.getRoomAnalytics,
  });

  const { data: categoryAnalytics } = useQuery({
    queryKey: ['category-analytics'],
    queryFn: api.getCategoryAnalytics,
  });

  // Generate AI insights based on data
  const insights = useMemo<InsightCard[]>(() => {
    if (!items || !summary) return [];

    const insights: InsightCard[] = [];

    // High-value items needing attention
    const highValueUnsure = items.filter((item: any) =>
      item.estimatedValue > 5000 && item.decisionStatus === 'unsure'
    );

    if (highValueUnsure.length > 0) {
      insights.push({
        id: 'high-value-unsure',
        type: 'warning',
        priority: 'high',
        title: 'High-Value Items Need Decisions',
        description: `${highValueUnsure.length} items worth over $5,000 each are awaiting decisions`,
        impact: `Total value at risk: ${formatCurrency(
          highValueUnsure.reduce((sum: number, item: any) => sum + item.estimatedValue, 0)
        )}`,
        action: 'Review and make decisions on these valuable items immediately',
        value: highValueUnsure.reduce((sum: number, item: any) => sum + item.estimatedValue, 0),
        items: highValueUnsure,
      });
    }

    // Quick wins - low value items to sell
    const quickWins = items.filter((item: any) =>
      item.estimatedValue < 100 &&
      item.estimatedValue > 10 &&
      item.condition !== 'poor' &&
      item.decisionStatus !== 'keep'
    );

    if (quickWins.length > 10) {
      insights.push({
        id: 'quick-wins',
        type: 'opportunity',
        priority: 'medium',
        title: 'Quick Sale Opportunities',
        description: `${quickWins.length} low-value items could be sold quickly in bulk`,
        impact: `Potential quick revenue: ${formatCurrency(
          quickWins.reduce((sum: number, item: any) => sum + item.estimatedValue, 0)
        )}`,
        action: 'Bundle these items for a garage sale or online marketplace',
        value: quickWins.reduce((sum: number, item: any) => sum + item.estimatedValue, 0),
        items: quickWins,
      });
    }

    // Hidden gems - potentially undervalued
    const potentialGems = items.filter((item: any) => {
      const isArt = item.category === 'Art' || item.category === 'Antiques';
      const hasLowValue = item.estimatedValue < 500;
      const goodCondition = item.condition === 'excellent' || item.condition === 'good';
      return isArt && hasLowValue && goodCondition;
    });

    if (potentialGems.length > 0) {
      insights.push({
        id: 'hidden-gems',
        type: 'opportunity',
        priority: 'high',
        title: 'Potentially Undervalued Items',
        description: `${potentialGems.length} art/antique items may be undervalued and need professional appraisal`,
        impact: 'These items could be worth significantly more than estimated',
        action: 'Get professional appraisals for these items',
        items: potentialGems,
      });
    }

    // Bundling recommendations
    const electronics = items.filter((item: any) =>
      item.category === 'Electronics' && item.decisionStatus === 'sell'
    );

    if (electronics.length > 5) {
      insights.push({
        id: 'bundle-electronics',
        type: 'recommendation',
        priority: 'medium',
        title: 'Electronics Bundle Opportunity',
        description: `Bundle ${electronics.length} electronics for better sale value`,
        impact: `Combined value: ${formatCurrency(
          electronics.reduce((sum: number, item: any) => sum + item.estimatedValue, 0)
        )}`,
        action: 'Create an electronics bundle listing for higher appeal',
        value: electronics.reduce((sum: number, item: any) => sum + item.estimatedValue, 0),
        items: electronics,
      });
    }

    // Room optimization
    if (roomAnalytics?.rooms) {
      const avgValuePerRoom = summary.totalValue / roomAnalytics.rooms.length;
      const lowValueRooms = roomAnalytics.rooms.filter((room: any) =>
        room.totalValue < avgValuePerRoom * 0.5
      );

      if (lowValueRooms.length > 0) {
        insights.push({
          id: 'room-optimization',
          type: 'trend',
          priority: 'low',
          title: 'Room Value Imbalance',
          description: `${lowValueRooms.length} rooms have below-average value concentration`,
          impact: 'Consider redistributing valuable items for better organization',
          action: 'Review item placement and storage strategy',
        });
      }
    }

    // Seasonal recommendations
    const furniture = items.filter((item: any) => item.category === 'Furniture');
    const outdoorItems = furniture.filter((item: any) =>
      item.name.toLowerCase().includes('outdoor') ||
      item.name.toLowerCase().includes('patio')
    );

    if (outdoorItems.length > 0) {
      insights.push({
        id: 'seasonal-opportunity',
        type: 'opportunity',
        priority: 'medium',
        title: 'Seasonal Sale Opportunity',
        description: `${outdoorItems.length} outdoor items could sell well in spring/summer`,
        impact: `Seasonal value: ${formatCurrency(
          outdoorItems.reduce((sum: number, item: any) => sum + item.estimatedValue, 0)
        )}`,
        action: 'Plan seasonal marketing for outdoor furniture',
        value: outdoorItems.reduce((sum: number, item: any) => sum + item.estimatedValue, 0),
        items: outdoorItems,
      });
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return insights.sort((a, b) =>
      priorityOrder[a.priority] - priorityOrder[b.priority]
    );
  }, [items, summary, roomAnalytics]);

  // Prepare chart data
  const priceDistribution = useMemo(() => {
    if (!items) return [];

    const ranges = [
      { range: '$0-100', min: 0, max: 100, count: 0, value: 0 },
      { range: '$100-500', min: 100, max: 500, count: 0, value: 0 },
      { range: '$500-1k', min: 500, max: 1000, count: 0, value: 0 },
      { range: '$1k-5k', min: 1000, max: 5000, count: 0, value: 0 },
      { range: '$5k-10k', min: 5000, max: 10000, count: 0, value: 0 },
      { range: '$10k+', min: 10000, max: Infinity, count: 0, value: 0 },
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

    return ranges;
  }, [items]);

  const categoryRadarData = useMemo(() => {
    if (!categoryAnalytics?.categories) return [];

    return categoryAnalytics.categories.map((cat: any) => ({
      category: cat.name,
      value: cat.totalValue,
      items: cat.itemCount,
      avgValue: cat.totalValue / cat.itemCount,
    }));
  }, [categoryAnalytics]);

  const decisionTreemap = useMemo(() => {
    if (!items) return [];

    const grouped = items.reduce((acc: any, item: any) => {
      const key = `${item.decisionStatus}-${item.category}`;
      if (!acc[key]) {
        acc[key] = {
          name: `${item.decisionStatus} - ${item.category}`,
          value: 0,
          decision: item.decisionStatus,
          category: item.category,
        };
      }
      acc[key].value += item.estimatedValue;
      return acc;
    }, {});

    return Object.values(grouped);
  }, [items]);

  const conditionValueScatter = useMemo(() => {
    if (!items) return [];

    const conditions = ['poor', 'fair', 'good', 'excellent'];
    return items.map((item: any) => ({
      x: conditions.indexOf(item.condition),
      y: item.estimatedValue,
      z: 1,
      name: item.name,
      category: item.category,
    }));
  }, [items]);

  const valueTimeline = useMemo(() => {
    if (!items) return [];

    // Simulate timeline data (in real app, this would come from historical data)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map((month, index) => ({
      month,
      catalogued: Math.floor(items.length * (index + 1) / 6),
      value: Math.floor(summary?.totalValue * (index + 1) / 6),
      decisions: Math.floor((summary?.totalItems - summary?.unsureCount) * (index + 1) / 6),
    }));
  }, [items, summary]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'recommendation': return <LightBulbIcon className="h-5 w-5" />;
      case 'warning': return <ExclamationTriangleIcon className="h-5 w-5" />;
      case 'opportunity': return <SparklesIcon className="h-5 w-5" />;
      case 'trend': return <TrendingUpIcon className="h-5 w-5" />;
      default: return <ChartBarIcon className="h-5 w-5" />;
    }
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 shadow-lg rounded-lg border">
          <p className="font-semibold">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {typeof entry.value === 'number' && entry.value > 100
                ? formatCurrency(entry.value)
                : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg rounded-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center">
              <SparklesIcon className="h-10 w-10 mr-4" />
              <div>
                <h1 className="text-4xl font-bold">AI-Powered Insights</h1>
                <p className="mt-2 text-indigo-100">
                  Smart recommendations and predictive analytics for your inventory
                </p>
              </div>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setTimeRange('7d')}
              className={`px-4 py-2 rounded-lg ${
                timeRange === '7d' ? 'bg-white text-indigo-600' : 'bg-indigo-500 text-white'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setTimeRange('30d')}
              className={`px-4 py-2 rounded-lg ${
                timeRange === '30d' ? 'bg-white text-indigo-600' : 'bg-indigo-500 text-white'
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => setTimeRange('90d')}
              className={`px-4 py-2 rounded-lg ${
                timeRange === '90d' ? 'bg-white text-indigo-600' : 'bg-indigo-500 text-white'
              }`}
            >
              90 Days
            </button>
          </div>
        </div>
      </div>

      {/* AI Insights Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {insights.map((insight) => (
          <div
            key={insight.id}
            className={`bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer ${
              selectedInsight === insight.id ? 'ring-2 ring-indigo-500' : ''
            }`}
            onClick={() => setSelectedInsight(insight.id === selectedInsight ? null : insight.id)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className={`p-2 rounded-lg ${
                  insight.type === 'warning' ? 'bg-red-100 text-red-600' :
                  insight.type === 'opportunity' ? 'bg-green-100 text-green-600' :
                  insight.type === 'recommendation' ? 'bg-blue-100 text-blue-600' :
                  'bg-purple-100 text-purple-600'
                }`}>
                  {getTypeIcon(insight.type)}
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">{insight.title}</h3>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    getPriorityColor(insight.priority)
                  }`}>
                    {insight.priority} priority
                  </span>
                </div>
              </div>
              {insight.value && (
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(insight.value)}
                  </p>
                  <p className="text-sm text-gray-500">potential value</p>
                </div>
              )}
            </div>

            <p className="text-gray-600 mb-3">{insight.description}</p>

            <div className="border-t pt-3">
              <div className="flex items-center text-sm text-gray-500 mb-2">
                <FireIcon className="h-4 w-4 mr-1" />
                <span className="font-medium">Impact:</span>
                <span className="ml-2">{insight.impact}</span>
              </div>
              <div className="flex items-center text-sm text-indigo-600">
                <CheckCircleIcon className="h-4 w-4 mr-1" />
                <span className="font-medium">Action:</span>
                <span className="ml-2">{insight.action}</span>
              </div>
            </div>

            {selectedInsight === insight.id && insight.items && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Related Items ({insight.items.length}):
                </p>
                <div className="max-h-32 overflow-y-auto">
                  {insight.items.slice(0, 5).map((item: any, idx: number) => (
                    <div key={idx} className="text-sm text-gray-600 py-1">
                      • {item.name} - {formatCurrency(item.estimatedValue)}
                    </div>
                  ))}
                  {insight.items.length > 5 && (
                    <p className="text-sm text-gray-400 italic">
                      and {insight.items.length - 5} more...
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Advanced Analytics Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Price Distribution Histogram */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <ScaleIcon className="h-5 w-5 mr-2 text-indigo-600" />
            Price Distribution Analysis
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={priceDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill={COLORS.primary[0]} name="Item Count">
                {priceDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS.primary[index % COLORS.primary.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category Radar Chart */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <ChartBarIcon className="h-5 w-5 mr-2 text-purple-600" />
            Category Value Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={categoryRadarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="category" />
              <PolarRadiusAxis />
              <Radar
                name="Total Value"
                dataKey="value"
                stroke={COLORS.primary[0]}
                fill={COLORS.primary[0]}
                fillOpacity={0.6}
              />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Value Timeline */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <ClockIcon className="h-5 w-5 mr-2 text-green-600" />
            Cataloging Progress Timeline
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={valueTimeline}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stackId="1"
                stroke={COLORS.success[1]}
                fill={COLORS.success[2]}
                name="Total Value"
              />
              <Area
                type="monotone"
                dataKey="catalogued"
                stackId="2"
                stroke={COLORS.primary[1]}
                fill={COLORS.primary[2]}
                name="Items Catalogued"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Condition vs Value Scatter */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <ArrowTrendingUpIcon className="h-5 w-5 mr-2 text-yellow-600" />
            Condition-Value Correlation
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="x"
                name="Condition"
                domain={[-0.5, 3.5]}
                ticks={[0, 1, 2, 3]}
                tickFormatter={(value) => ['Poor', 'Fair', 'Good', 'Excellent'][value]}
              />
              <YAxis type="number" dataKey="y" name="Value" />
              <ZAxis type="number" dataKey="z" range={[50, 200]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
              <Scatter
                name="Items"
                data={conditionValueScatter}
                fill={COLORS.primary[0]}
                fillOpacity={0.6}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Decision Treemap */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <CurrencyDollarIcon className="h-5 w-5 mr-2 text-green-600" />
          Decision & Category Value Treemap
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <Treemap
            data={decisionTreemap}
            dataKey="value"
            aspectRatio={4 / 3}
            stroke="#fff"
            fill={COLORS.primary[0]}
            content={({ x, y, width, height, name, value }: any) => {
              const decision = name?.split(' - ')[0];
              const colors: any = {
                keep: COLORS.success[1],
                sell: COLORS.warning[1],
                unsure: COLORS.neutral[2],
                donated: COLORS.primary[2],
                sold: COLORS.primary[0],
              };

              return (
                <g>
                  <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    style={{
                      fill: colors[decision] || COLORS.neutral[1],
                      stroke: '#fff',
                      strokeWidth: 2,
                    }}
                  />
                  {width > 60 && height > 40 && (
                    <>
                      <text
                        x={x + width / 2}
                        y={y + height / 2 - 10}
                        textAnchor="middle"
                        fill="#fff"
                        fontSize={12}
                        fontWeight="bold"
                      >
                        {name}
                      </text>
                      <text
                        x={x + width / 2}
                        y={y + height / 2 + 10}
                        textAnchor="middle"
                        fill="#fff"
                        fontSize={10}
                      >
                        {formatCurrency(value)}
                      </text>
                    </>
                  )}
                </g>
              );
            }}
          />
        </ResponsiveContainer>
      </div>

      {/* Key Metrics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100">Total Potential</p>
              <p className="text-3xl font-bold">
                {formatCurrency(summary?.totalValue || 0)}
              </p>
            </div>
            <CurrencyDollarIcon className="h-12 w-12 text-blue-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100">Quick Wins</p>
              <p className="text-3xl font-bold">
                {insights.filter(i => i.type === 'opportunity').length}
              </p>
            </div>
            <SparklesIcon className="h-12 w-12 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100">Needs Attention</p>
              <p className="text-3xl font-bold">
                {insights.filter(i => i.priority === 'high').length}
              </p>
            </div>
            <ExclamationTriangleIcon className="h-12 w-12 text-yellow-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100">AI Confidence</p>
              <p className="text-3xl font-bold">94%</p>
            </div>
            <LightBulbIcon className="h-12 w-12 text-purple-200" />
          </div>
        </div>
      </div>
    </div>
  );
}
