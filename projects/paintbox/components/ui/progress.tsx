'use client'

import React, { forwardRef } from 'react'
import { cn } from '@/lib/utils/cn'

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
  variant?: 'default' | 'success' | 'warning' | 'danger'
  showLabel?: boolean
}

export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, variant = 'default', showLabel = false, ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

    const variants = {
      default: 'bg-[hsl(var(--primary))]',
      success: 'bg-[hsl(var(--success))]',
      warning: 'bg-[hsl(var(--warning))]',
      danger: 'bg-[hsl(var(--destructive))]'
    }

    return (
      <div className="w-full space-y-1">
        {showLabel && (
          <div className="flex justify-between text-sm">
            <span className="text-[hsl(var(--muted-foreground))]">Progress</span>
            <span className="text-[hsl(var(--foreground))]">{Math.round(percentage)}%</span>
          </div>
        )}
        <div
          ref={ref}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={value}
          className={cn(
            // Base container styles
            'relative h-2 w-full overflow-hidden',
            'rounded-full bg-[hsl(var(--secondary))]/20',
            className
          )}
          {...props}
        >
          <div
            className={cn(
              // Progress bar styles
              'h-full transition-all duration-300 ease-in-out',
              'rounded-full',
              variants[variant]
            )}
            style={{
              width: `${percentage}%`
            }}
          />
        </div>
      </div>
    )
  }
)

Progress.displayName = 'Progress'