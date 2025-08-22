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
          // Eggshell Design System - Base styles
          "flex w-full rounded-lg",
          "border border-border-primary",
          "bg-surface-primary text-text-primary",
          "px-4 py-3 text-sm",
          // Touch optimization for accessibility
          "min-h-[44px] touch-manipulation",
          // Eggshell transitions
          "transition-all duration-200",
          // Placeholder styles with Eggshell colors
          "placeholder:text-text-tertiary",
          // Focus styles with Eggshell brown
          "focus:outline-none focus:ring-3 focus:ring-brown-400/10",
          "focus:border-border-focus focus:bg-surface-primary",
          // Disabled styles
          "disabled:cursor-not-allowed disabled:bg-eggshell-50 disabled:text-text-tertiary",
          // Error state with warm red
          error && "border-red-400 focus:ring-red-400/10 focus:border-red-400",
          // File input specific styles
          "file:border-0 file:bg-transparent",
          "file:text-sm file:font-medium file:text-text-secondary",
          "file:mr-4",
          // Hover state
          "hover:border-border-focus",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'
