import React, { forwardRef } from 'react'
import { cn } from '@/lib/utils/cn'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base styles with Tyler-Setup patterns
          "flex w-full rounded-[var(--radius)]",
          "border border-[hsl(var(--border))]",
          "bg-[hsl(var(--background))] text-[hsl(var(--foreground))]",
          "px-3 py-2 text-sm",
          // Touch optimization for iPad
          "min-h-[var(--touch-target)] touch-manipulation",
          // Transitions
          "transition-colors duration-200",
          // Placeholder styles
          "placeholder:text-[hsl(var(--muted-foreground))]",
          // Focus styles
          "focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]",
          "focus:border-[hsl(var(--primary))]",
          // Disabled styles
          "disabled:cursor-not-allowed disabled:opacity-50",
          // Error state
          error && "border-[hsl(var(--destructive))] focus:ring-[hsl(var(--destructive))]",
          // File input specific styles
          "file:border-0 file:bg-transparent",
          "file:text-sm file:font-medium",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'
