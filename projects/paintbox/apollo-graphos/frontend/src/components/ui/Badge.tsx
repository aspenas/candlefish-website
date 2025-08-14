import React from 'react';
import { clsx } from 'clsx';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'md', dot = false, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center font-medium rounded-full';

    const variants = {
      default: 'bg-gray-100 text-gray-800',
      primary: 'bg-primary-100 text-primary-800',
      secondary: 'bg-secondary-100 text-secondary-800',
      success: 'bg-success-100 text-success-800',
      warning: 'bg-warning-100 text-warning-800',
      error: 'bg-error-100 text-error-800',
      outline: 'border border-gray-300 text-gray-700 bg-white',
    };

    const sizes = {
      sm: dot ? 'h-2 w-2' : 'px-2 py-0.5 text-xs',
      md: dot ? 'h-2.5 w-2.5' : 'px-2.5 py-1 text-sm',
      lg: dot ? 'h-3 w-3' : 'px-3 py-1.5 text-sm',
    };

    if (dot) {
      return (
        <span
          ref={ref}
          className={clsx(
            baseStyles,
            variants[variant],
            sizes[size],
            className
          )}
          {...props}
        />
      );
    }

    return (
      <span
        ref={ref}
        className={clsx(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;
