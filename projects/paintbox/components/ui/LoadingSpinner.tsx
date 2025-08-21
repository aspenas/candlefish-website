/**
 * Loading Spinner Component
 *
 * Reusable loading spinner with different sizes and optional message
 * Updated with Tyler-Setup design patterns and CSS variables
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  message?: string;
  className?: string;
  variant?: 'default' | 'primary' | 'secondary';
}

export function LoadingSpinner({
  size = 'md',
  message,
  className,
  variant = 'primary'
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
    xl: 'w-12 h-12 border-4',
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg',
  };

  const variantClasses = {
    default: 'border-paintbox-border border-t-paintbox-text',
    primary: 'border-paintbox-border border-t-paintbox-brand',
    secondary: 'border-paintbox-border border-t-paintbox-accent',
  };

  return (
    <div className={cn(
      'flex flex-col items-center justify-center space-y-2',
      className
    )}>
      <div
        className={cn(
          'animate-spin rounded-full',
          sizeClasses[size],
          variantClasses[variant]
        )}
        role="status"
        aria-label="Loading"
      >
        <span className="sr-only">Loading...</span>
      </div>
      {message && (
        <p className={cn(
          'text-paintbox-text-muted font-medium',
          textSizeClasses[size]
        )}>
          {message}
        </p>
      )}
    </div>
  );
}

export default LoadingSpinner;
