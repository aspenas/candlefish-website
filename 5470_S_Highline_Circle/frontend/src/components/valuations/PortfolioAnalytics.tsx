import React, { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart,
} from 'recharts';
import clsx from 'clsx';
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import type { PortfolioMetrics, ValuationType, Category } from '../../types';

interface PortfolioAnalyticsProps {
  metrics: PortfolioMetrics;
  className?: string;
}

const VALUATION_TYPE_COLORS = {
  ai_estimated: '#3B82F6',
  market_analysis: '#10B981',
  professional_appraisal: '#8B5CF6',
  user_override: '#F59E0B',
};

const CATEGORY_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280',
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('en-US').format(value);
};

const getValueationTypeLabel = (type: ValuationType) => {
  const labels = {
    ai_estimated: 'AI Estimated',
    market_analysis: 'Market Analysis',
    professional_appraisal: 'Professional',
    user_override: 'Manual Override',
  };
  return labels[type] || type;
};

const getTrendIcon = (direction: 'up' | 'down' | 'stable') => {
  switch (direction) {
    case 'up':
      return <ArrowTrendingUpIcon className="h-5 w-5 text-green-500" />;
    case 'down':
      return <ArrowTrendingDownIcon className="h-5 w-5 text-red-500" />;
    default:
      return <div className="h-5 w-5 rounded-full bg-gray-400" />;
  }
};

export const PortfolioAnalytics: React.FC<PortfolioAnalyticsProps> = ({
  metrics,
  className,
}) => {
  // Prepare chart data
  const valuationTypeData = useMemo(() => {
    return Object.entries(metrics.items_by_valuation_type).map(([type, count]) => ({
      name: getValueationTypeLabel(type as ValuationType),
      value: count,
      color: VALUATION_TYPE_COLORS[type as ValuationType],
    }));
  }, [metrics.items_by_valuation_type]);

  const categoryData = useMemo(() => {
    return metrics.top_categories_by_value.map((category, index) => ({
      name: category.category,
      value: category.total_value,
      items: category.item_count,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    }));
  }, [metrics.top_categories_by_value]);

  const trendData = useMemo(() => {
    return metrics.market_trends.map(trend => ({
      category: trend.category,
      change: trend.percentage_change,
      direction: trend.trend_direction,
    }));
  }, [metrics.market_trends]);

  const riskData = useMemo(() => {
    const { risk_assessment } = metrics;
    return [
      { name: 'High Confidence', value: risk_assessment.high_confidence_items, color: '#10B981' },
      { name: 'Medium Confidence', value: risk_assessment.medium_confidence_items, color: '#F59E0B' },
      { name: 'Low Confidence', value: risk_assessment.low_confidence_items, color: '#EF4444' },
      { name: 'Outdated', value: risk_assessment.outdated_valuations, color: '#6B7280' },
    ];
  }, [metrics.risk_assessment]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">
            Value: {formatCurrency(data.value)}
          </p>
          {data.items && (
            <p className="text-sm text-gray-600">
              Items: {data.items}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={clsx('space-y-6', className)}>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-indigo-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {formatNumber(metrics.total_items)}
              </div>
              <div className="text-sm text-gray-500">Total Items</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(metrics.total_estimated_value)}
              </div>
              <div className="text-sm text-gray-500">Total Value</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            {metrics.appreciation_percentage >= 0 ? (
              <ArrowTrendingUpIcon className="h-8 w-8 text-green-600" />
            ) : (
              <ArrowTrendingDownIcon className="h-8 w-8 text-red-600" />
            )}
            <div className="ml-4">
              <div className={clsx(
                'text-2xl font-bold',
                metrics.appreciation_percentage >= 0 ? 'text-green-600' : 'text-red-600'
              )}>
                {metrics.appreciation_percentage >= 0 ? '+' : ''}
                {metrics.appreciation_percentage.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">Total Return</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <ShieldCheckIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {Math.round(
                  (metrics.risk_assessment.high_confidence_items / metrics.total_items) * 100
                )}%
              </div>
              <div className="text-sm text-gray-500">High Confidence</div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Valuation Types */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Valuation Methods</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={valuationTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {valuationTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${value} items`, 'Count']}
                  labelStyle={{ color: '#374151' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {valuationTypeData.map((entry, index) => (
              <div key={index} className="flex items-center text-sm">
                <div
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-gray-600 truncate">{entry.name}</span>
                <span className="ml-auto font-medium">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Assessment */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Assessment</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {riskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${value} items`, 'Count']}
                  labelStyle={{ color: '#374151' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {riskData.map((entry, index) => (
              <div key={index} className="flex items-center text-sm">
                <div
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-gray-600 truncate">{entry.name}</span>
                <span className="ml-auto font-medium">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Categories by Value */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Categories by Value</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                />
                <YAxis 
                  type="category"
                  dataKey="name"
                  width={100}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Market Trends */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Market Trends</h3>
          <div className="space-y-4">
            {trendData.map((trend, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center">
                  {getTrendIcon(trend.direction)}
                  <span className="ml-3 text-sm font-medium text-gray-900">
                    {trend.category}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className={clsx(
                    'text-sm font-medium',
                    trend.change >= 0 ? 'text-green-600' : 'text-red-600'
                  )}>
                    {trend.change >= 0 ? '+' : ''}{trend.change.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
            {trendData.length === 0 && (
              <div className="text-center py-8">
                <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">
                  Market trend data will appear as more valuations are collected
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Items */}
      {(metrics.risk_assessment.low_confidence_items > 0 || metrics.risk_assessment.outdated_valuations > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <div className="flex">
            <ExclamationTriangleIcon className="h-6 w-6 text-amber-600 mr-3 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-amber-800 mb-3">
                Recommended Actions
              </h3>
              <div className="space-y-2 text-sm text-amber-700">
                {metrics.risk_assessment.low_confidence_items > 0 && (
                  <div>
                    • Consider requesting professional appraisals for {metrics.risk_assessment.low_confidence_items} low-confidence items
                  </div>
                )}
                {metrics.risk_assessment.outdated_valuations > 0 && (
                  <div>
                    • Update {metrics.risk_assessment.outdated_valuations} outdated valuations to maintain portfolio accuracy
                  </div>
                )}
                {metrics.appreciation_percentage < -10 && (
                  <div>
                    • Review items with significant depreciation for potential disposal or re-evaluation
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioAnalytics;