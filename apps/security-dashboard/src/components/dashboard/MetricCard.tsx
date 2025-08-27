import React from 'react';
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down' | 'stable';
  severity?: 'critical' | 'warning' | 'info' | 'success';
  description?: string;
  onClick?: () => void;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon: Icon,
  trend = 'stable',
  severity = 'info',
  description,
  onClick,
}) => {
  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          border: 'border-critical-800 hover:border-critical-700',
          bg: 'bg-critical-950/20 hover:bg-critical-950/30',
          glow: 'hover:shadow-critical-glow',
          icon: 'text-critical-400',
        };
      case 'warning':
        return {
          border: 'border-warning-800 hover:border-warning-700',
          bg: 'bg-warning-950/20 hover:bg-warning-950/30',
          glow: 'hover:shadow-warning-glow',
          icon: 'text-warning-400',
        };
      case 'success':
        return {
          border: 'border-success-800 hover:border-success-700',
          bg: 'bg-success-950/20 hover:bg-success-950/30',
          glow: 'hover:shadow-success-glow',
          icon: 'text-success-400',
        };
      default:
        return {
          border: 'border-info-800 hover:border-info-700',
          bg: 'bg-info-950/20 hover:bg-info-950/30',
          glow: 'hover:shadow-glow-md',
          icon: 'text-info-400',
        };
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <ArrowUpIcon className="w-4 h-4 text-critical-400" />;
      case 'down':
        return <ArrowDownIcon className="w-4 h-4 text-success-400" />;
      default:
        return <MinusIcon className="w-4 h-4 text-soc-muted" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return severity === 'success' ? 'text-success-400' : 'text-critical-400';
      case 'down':
        return severity === 'critical' || severity === 'warning' ? 'text-success-400' : 'text-critical-400';
      default:
        return 'text-soc-muted';
    }
  };

  const styles = getSeverityStyles(severity);

  return (
    <div
      className={clsx(
        'soc-card p-6 transition-all duration-200 cursor-pointer',
        styles.border,
        styles.bg,
        styles.glow,
        onClick && 'hover:scale-105'
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className={clsx('p-2 rounded-lg bg-soc-elevated', styles.icon)}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex items-center space-x-1">
          {getTrendIcon()}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-soc-muted uppercase tracking-wide">
          {title}
        </h3>
        
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-bold text-white">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </span>
          {trend !== 'stable' && (
            <span className={clsx('text-sm font-medium', getTrendColor())}>
              {trend === 'up' ? '↗' : '↘'}
            </span>
          )}
        </div>

        {description && (
          <p className="text-sm text-soc-muted mt-2 line-clamp-2">
            {description}
          </p>
        )}
      </div>

      {/* Severity Indicator */}
      <div className="mt-4 flex items-center justify-between">
        <div className={clsx('text-xs uppercase tracking-wider font-medium', styles.icon)}>
          {severity}
        </div>
        
        <div className="flex space-x-1">
          {[1, 2, 3, 4, 5].map((level) => (
            <div
              key={level}
              className={clsx(
                'w-2 h-1 rounded-full',
                level <= (severity === 'critical' ? 5 : severity === 'warning' ? 3 : severity === 'success' ? 2 : 1)
                  ? styles.icon
                  : 'bg-soc-border'
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default MetricCard;