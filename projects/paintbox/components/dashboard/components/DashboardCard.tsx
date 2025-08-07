/**
 * Dashboard Card Component
 * 
 * Reusable card component for displaying key metrics and statistics
 */

'use client';

import React from 'react';
import { 
  TrendingUpIcon, 
  TrendingDownIcon, 
  MinusIcon 
} from '@heroicons/react/24/outline';
import { DashboardCard as DashboardCardType } from '@/lib/types/dashboard';
import { cn } from '@/lib/utils';

interface DashboardCardProps extends DashboardCardType {
  onClick?: () => void;
}

export function DashboardCard({
  id,
  title,
  value,
  change,
  changeType,
  icon: Icon,
  color,
  subtitle,
  onClick,
}: DashboardCardProps) {
  const getColorClasses = () => {
    switch (color) {
      case 'green':
        return {
          bg: 'bg-green-50 dark:bg-green-900/20',
          border: 'border-green-200 dark:border-green-800',
          icon: 'text-green-600 dark:text-green-400',
          iconBg: 'bg-green-100 dark:bg-green-900/40',
        };
      case 'yellow':
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
          border: 'border-yellow-200 dark:border-yellow-800',
          icon: 'text-yellow-600 dark:text-yellow-400',
          iconBg: 'bg-yellow-100 dark:bg-yellow-900/40',
        };
      case 'red':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          icon: 'text-red-600 dark:text-red-400',
          iconBg: 'bg-red-100 dark:bg-red-900/40',
        };
      case 'blue':
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800',
          icon: 'text-blue-600 dark:text-blue-400',
          iconBg: 'bg-blue-100 dark:bg-blue-900/40',
        };
      default:
        return {
          bg: 'bg-gray-50 dark:bg-gray-800',
          border: 'border-gray-200 dark:border-gray-700',
          icon: 'text-gray-600 dark:text-gray-400',
          iconBg: 'bg-gray-100 dark:bg-gray-700',
        };
    }
  };

  const getTrendIcon = () => {
    switch (changeType) {
      case 'increase':
        return TrendingUpIcon;
      case 'decrease':
        return TrendingDownIcon;
      default:
        return MinusIcon;
    }
  };

  const getTrendColor = () => {
    switch (changeType) {
      case 'increase':
        return 'text-green-600 dark:text-green-400';
      case 'decrease':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const colorClasses = getColorClasses();
  const TrendIcon = getTrendIcon();

  return (
    <div
      className={cn(
        'relative p-6 rounded-lg border transition-all duration-200',
        colorClasses.bg,
        colorClasses.border,
        onClick && 'cursor-pointer hover:shadow-md hover:scale-105'
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className={cn(
          'p-2 rounded-lg',
          colorClasses.iconBg
        )}>
          <Icon className={cn('w-6 h-6', colorClasses.icon)} />
        </div>
        
        {change !== undefined && (
          <div className={cn(
            'flex items-center text-sm font-medium',
            getTrendColor()
          )}>
            <TrendIcon className="w-4 h-4 mr-1" />
            {Math.abs(change)}%
          </div>
        )}
      </div>

      {/* Content */}
      <div>
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
          {title}
        </h3>
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
          {typeof value === 'number' && value > 999 
            ? `${(value / 1000).toFixed(1)}k`
            : value
          }
        </div>
        {subtitle && (
          <p className="text-xs text-gray-500 dark:text-gray-500">
            {subtitle}
          </p>
        )}
      </div>

      {/* Hover effect overlay */}
      {onClick && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/5 dark:to-gray-800/10 rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-200" />
      )}
    </div>
  );
}

export default DashboardCard;