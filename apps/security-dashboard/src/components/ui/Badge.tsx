import React from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  size?: 'default' | 'sm' | 'lg';
}

const badgeVariants = {
  default: 'border-transparent bg-blue-600 text-white hover:bg-blue-600/80',
  secondary: 'border-transparent bg-gray-600 text-gray-100 hover:bg-gray-600/80',
  destructive: 'border-transparent bg-red-600 text-white hover:bg-red-600/80',
  outline: 'text-gray-300 border-gray-600 hover:bg-gray-700'
};

const badgeSizes = {
  default: 'px-2.5 py-0.5 text-xs',
  sm: 'px-2 py-0.5 text-xs',
  lg: 'px-3 py-1 text-sm'
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          badgeVariants[variant],
          badgeSizes[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';