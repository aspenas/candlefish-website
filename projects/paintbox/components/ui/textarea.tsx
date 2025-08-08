import React, { forwardRef } from 'react'
import { cn } from '@/lib/utils/cn'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          // Base styles with Tyler-Setup patterns
          "flex w-full rounded-[var(--radius)]",
          "border border-[hsl(var(--border))]",
          "bg-[hsl(var(--background))] text-[hsl(var(--foreground))]",
          "px-3 py-2 text-sm",
          // Minimum height for touch targets
          "min-h-[80px] resize-vertical",
          // Touch optimization
          "touch-manipulation",
          // Transitions
          "transition-colors duration-200",
          // Placeholder styles
          "placeholder:text-[hsl(var(--muted-foreground))]",
          // Focus styles
          "focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]",
          "focus:border-[hsl(var(--primary))]",
          // Disabled styles
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:resize-none",
          // Error state
          error && "border-[hsl(var(--destructive))] focus:ring-[hsl(var(--destructive))]",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)

Textarea.displayName = 'Textarea'
