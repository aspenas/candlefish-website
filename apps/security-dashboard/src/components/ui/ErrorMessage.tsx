import React from 'react';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface ErrorMessageProps {
  title: string;
  message: string;
  onRetry?: () => void;
  className?: string;
  variant?: 'error' | 'warning' | 'info';
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title,
  message,
  onRetry,
  className,
  variant = 'error',
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'warning':
        return {
          container: 'border-warning-800 bg-warning-950/20',
          icon: 'text-warning-400',
          title: 'text-warning-300',
        };
      case 'info':
        return {
          container: 'border-info-800 bg-info-950/20',
          icon: 'text-info-400',
          title: 'text-info-300',
        };
      default:
        return {
          container: 'border-critical-800 bg-critical-950/20',
          icon: 'text-critical-400',
          title: 'text-critical-300',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className={clsx(
      'soc-card p-6 border text-center',
      styles.container,
      className
    )}>
      <div className="flex flex-col items-center space-y-4">
        {/* Icon */}
        <div className={clsx('p-3 rounded-full bg-soc-elevated', styles.icon)}>
          <ExclamationTriangleIcon className="w-8 h-8" />
        </div>
        
        {/* Content */}
        <div className="space-y-2">
          <h3 className={clsx('text-lg font-semibold', styles.title)}>
            {title}
          </h3>
          <p className="text-soc-muted max-w-md">
            {message}
          </p>
        </div>
        
        {/* Actions */}
        {onRetry && (
          <button
            onClick={onRetry}
            className="soc-button-secondary inline-flex items-center space-x-2 px-4 py-2"
          >
            <ArrowPathIcon className="w-4 h-4" />
            <span>Try Again</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorMessage;