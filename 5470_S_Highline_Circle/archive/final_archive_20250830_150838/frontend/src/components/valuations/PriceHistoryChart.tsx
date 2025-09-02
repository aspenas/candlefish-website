import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Legend,
  ReferenceLine,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import clsx from 'clsx';
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import type { PriceHistory, ValuationType } from '../../types';

interface PriceHistoryChartProps {
  priceHistory: PriceHistory[];
  currentPrice?: number;
  purchasePrice?: number;
  className?: string;
  height?: number;
  showConfidence?: boolean;
  showTrend?: boolean;
  timeRange?: '1M' | '3M' | '6M' | '1Y' | 'ALL';
  onTimeRangeChange?: (range: '1M' | '3M' | '6M' | '1Y' | 'ALL') => void;
}

const getValuationTypeColor = (type: ValuationType) => {
  switch (type) {
    case 'ai_estimated':
      return '#3B82F6'; // blue
    case 'market_analysis':
      return '#10B981'; // green
    case 'professional_appraisal':
      return '#8B5CF6'; // purple
    case 'user_override':
      return '#F59E0B'; // yellow
    default:
      return '#6B7280'; // gray
  }
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatTooltipLabel = (label: string) => {
  return format(parseISO(label), 'MMM d, yyyy');
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[200px]">
        <p className="font-medium text-gray-900 mb-2">
          {formatTooltipLabel(label)}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-600" style={{ color: entry.color }}>
              {entry.name}:
            </span>
            <span className="font-medium text-sm" style={{ color: entry.color }}>
              {formatCurrency(entry.value)}
            </span>
          </div>
        ))}
        {data.confidence_score && (
          <div className="flex items-center justify-between border-t pt-2 mt-2">
            <span className="text-xs text-gray-500">Confidence:</span>
            <span className="text-xs font-medium text-gray-700">
              {Math.round(data.confidence_score * 100)}%
            </span>
          </div>
        )}
        {data.notes && (
          <div className="border-t pt-2 mt-2">
            <p className="text-xs text-gray-600">{data.notes}</p>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export const PriceHistoryChart: React.FC<PriceHistoryChartProps> = ({
  priceHistory,
  currentPrice,
  purchasePrice,
  className,
  height = 400,
  showConfidence = true,
  showTrend = true,
  timeRange = 'ALL',
  onTimeRangeChange,
}) => {
  // Prepare chart data
  const chartData = useMemo(() => {
    const sortedHistory = [...priceHistory].sort(
      (a, b) => new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime()
    );

    return sortedHistory.map((entry) => ({
      date: entry.effective_date,
      price: entry.price,
      confidence_score: entry.confidence_score,
      valuation_type: entry.valuation_type,
      notes: entry.notes,
      market_conditions: entry.market_conditions,
    }));
  }, [priceHistory]);

  // Calculate trend
  const trend = useMemo(() => {
    if (chartData.length < 2) return null;
    
    const firstPrice = chartData[0].price;
    const lastPrice = chartData[chartData.length - 1].price;
    const change = lastPrice - firstPrice;
    const changePercent = (change / firstPrice) * 100;
    
    return {
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
      amount: Math.abs(change),
      percent: Math.abs(changePercent),
    };
  }, [chartData]);

  // Get unique valuation types for legend
  const valuationTypes = useMemo(() => {
    return Array.from(new Set(priceHistory.map(p => p.valuation_type)));
  }, [priceHistory]);

  if (chartData.length === 0) {
    return (
      <div className={clsx('bg-white rounded-lg border border-gray-200 p-8', className)}>
        <div className="text-center">
          <InformationCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No price history</h3>
          <p className="mt-1 text-sm text-gray-500">
            Price history will appear here as valuations are added.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('bg-white rounded-lg border border-gray-200', className)}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Price History</h3>
            {showTrend && trend && (
              <div className="flex items-center mt-1">
                {trend.direction === 'up' && (
                  <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
                )}
                {trend.direction === 'down' && (
                  <ArrowTrendingDownIcon className="h-4 w-4 text-red-500 mr-1" />
                )}
                {trend.direction === 'stable' && (
                  <MinusIcon className="h-4 w-4 text-gray-500 mr-1" />
                )}
                <span className={clsx(
                  'text-sm font-medium',
                  trend.direction === 'up' ? 'text-green-600' : 
                  trend.direction === 'down' ? 'text-red-600' : 'text-gray-600'
                )}>
                  {trend.direction === 'up' ? '+' : trend.direction === 'down' ? '-' : ''}
                  {formatCurrency(trend.amount)} ({trend.percent.toFixed(1)}%)
                </span>
              </div>
            )}
          </div>
          
          {/* Time Range Selector */}
          {onTimeRangeChange && (
            <div className="flex rounded-md shadow-sm">
              {['1M', '3M', '6M', '1Y', 'ALL'].map((range) => (
                <button
                  key={range}
                  onClick={() => onTimeRangeChange(range as any)}
                  className={clsx(
                    'px-3 py-1 text-xs font-medium border',
                    range === timeRange
                      ? 'bg-indigo-100 border-indigo-500 text-indigo-700 z-10'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50',
                    range === '1M' && 'rounded-l-md',
                    range === 'ALL' && 'rounded-r-md',
                    range !== '1M' && '-ml-px'
                  )}
                >
                  {range}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="p-6">
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => format(parseISO(value), 'MMM d')}
              stroke="#6b7280"
              fontSize={12}
            />
            <YAxis
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
              stroke="#6b7280"
              fontSize={12}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Reference lines */}
            {purchasePrice && (
              <ReferenceLine
                y={purchasePrice}
                stroke="#ef4444"
                strokeDasharray="5 5"
                label={{ value: "Purchase Price", position: "topLeft" }}
              />
            )}
            {currentPrice && (
              <ReferenceLine
                y={currentPrice}
                stroke="#10b981"
                strokeDasharray="5 5"
                label={{ value: "Current Value", position: "topRight" }}
              />
            )}
            
            {/* Main price line */}
            <Line
              type="monotone"
              dataKey="price"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
              name="Estimated Value"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend & Stats */}
      <div className="px-6 pb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Current Value */}
          <div className="text-center">
            <div className="text-sm text-gray-500">Current Value</div>
            <div className="text-lg font-semibold text-gray-900">
              {chartData.length > 0 ? formatCurrency(chartData[chartData.length - 1].price) : 'N/A'}
            </div>
          </div>

          {/* Highest Value */}
          <div className="text-center">
            <div className="text-sm text-gray-500">Highest Value</div>
            <div className="text-lg font-semibold text-gray-900">
              {formatCurrency(Math.max(...chartData.map(d => d.price)))}
            </div>
          </div>

          {/* Average Confidence */}
          <div className="text-center">
            <div className="text-sm text-gray-500">Avg. Confidence</div>
            <div className="text-lg font-semibold text-gray-900">
              {Math.round(
                chartData
                  .filter(d => d.confidence_score)
                  .reduce((acc, d) => acc + (d.confidence_score || 0), 0) /
                chartData.filter(d => d.confidence_score).length * 100
              ) || 0}%
            </div>
          </div>
        </div>

        {/* Valuation Types Legend */}
        {valuationTypes.length > 1 && (
          <div className="flex items-center justify-center space-x-6 mt-4 pt-4 border-t border-gray-200">
            {valuationTypes.map(type => (
              <div key={type} className="flex items-center">
                <div
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: getValuationTypeColor(type) }}
                />
                <span className="text-xs text-gray-600 capitalize">
                  {type.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceHistoryChart;