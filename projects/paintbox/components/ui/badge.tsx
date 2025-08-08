import React, { forwardRef } from 'react'
import { cn } from '@/lib/utils/cn'

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'
}

export const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: cn(
        'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]',
        'hover:bg-[hsl(var(--primary))]/80'
      ),
      secondary: cn(
        'bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]',
        'hover:bg-[hsl(var(--secondary))]/80'
      ),
      destructive: cn(
        'bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))]',
        'hover:bg-[hsl(var(--destructive))]/80'
      ),
      outline: cn(
        'text-[hsl(var(--foreground))] border border-[hsl(var(--border))]',
        'hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--accent-foreground))]'
      ),
      success: cn(
        'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]',
        'hover:bg-[hsl(var(--success))]/80'
      ),
      warning: cn(
        'bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]',
        'hover:bg-[hsl(var(--warning))]/80'
      )
    }

    return (
      <div
        ref={ref}
        className={cn(
          // Base styles with Tyler-Setup patterns
          'inline-flex items-center rounded-full',
          'px-2.5 py-0.5 text-xs font-semibold',
          'transition-colors duration-200',
          // Variant styles
          variants[variant],
          className
        )}
        {...props}
      />
    )
  }
)

Badge.displayName = 'Badge'
