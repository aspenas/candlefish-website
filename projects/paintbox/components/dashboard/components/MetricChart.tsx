/**
 * Metric Chart Component
 *
 * Small chart component for displaying metric trends using Chart.js
 */

'use client';

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon
} from '@heroicons/react/24/outline';
import { TrendDirection } from '@/lib/types/dashboard';
import { cn } from '@/lib/utils/cn';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

interface MetricChartProps {
  title: string;
  value: number;
  unit?: string;
  trend: TrendDirection;
  data: Array<{ x: string; y: number }>;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'yellow';
  height?: number;
}

export function MetricChart({
  title,
  value,
  unit = '',
  trend,
  data,
  color = 'blue',
  height = 100
}: MetricChartProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case TrendDirection.INCREASING:
        return ArrowTrendingUpIcon;
      case TrendDirection.DECREASING:
        return ArrowTrendingDownIcon;
      default:
        return MinusIcon;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case TrendDirection.INCREASING:
        return 'text-green-600 dark:text-green-400';
      case TrendDirection.DECREASING:
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getChartColors = () => {
    const colors = {
      blue: { primary: 'rgb(59, 130, 246)', secondary: 'rgba(59, 130, 246, 0.1)' },
      green: { primary: 'rgb(34, 197, 94)', secondary: 'rgba(34, 197, 94, 0.1)' },
      purple: { primary: 'rgb(147, 51, 234)', secondary: 'rgba(147, 51, 234, 0.1)' },
      orange: { primary: 'rgb(249, 115, 22)', secondary: 'rgba(249, 115, 22, 0.1)' },
      red: { primary: 'rgb(239, 68, 68)', secondary: 'rgba(239, 68, 68, 0.1)' },
      yellow: { primary: 'rgb(245, 158, 11)', secondary: 'rgba(245, 158, 11, 0.1)' },
    };
    return colors[color];
  };

  const TrendIcon = getTrendIcon();
  const chartColors = getChartColors();

  const chartData = {
    labels: data.map(point => point.x),
    datasets: [
      {
        label: title,
        data: data.map(point => point.y),
        borderColor: chartColors.primary,
        backgroundColor: chartColors.secondary,
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointBackgroundColor: chartColors.primary,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: chartColors.primary,
        borderWidth: 1,
        cornerRadius: 6,
        displayColors: false,
        callbacks: {
          title: (tooltipItems: any[]) => {
            return tooltipItems[0].label;
          },
          label: (context: any) => {
            return `${title}: ${context.parsed.y.toFixed(1)}${unit}`;
          },
        },
      },
    },
    scales: {
      x: {
        display: false,
        grid: {
          display: false,
        },
      },
      y: {
        display: false,
        grid: {
          display: false,
        },
        beginAtZero: false,
      },
    },
    elements: {
      point: {
        hoverRadius: 6,
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

  const formatValue = (val: number) => {
    if (val >= 1000) {
      return `${(val / 1000).toFixed(1)}k`;
    }
    return val.toFixed(1);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {title}
        </h3>
        <div className={cn('flex items-center', getTrendColor())}>
          <TrendIcon className="w-4 h-4" />
        </div>
      </div>

      {/* Value */}
      <div className="mb-3">
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {formatValue(value)}{unit}
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: `${height}px` }}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}

export default MetricChart;
