'use client'

import React, { forwardRef, ElementRef, ComponentPropsWithoutRef } from 'react'
import { cn } from '@/lib/utils/cn'

interface CheckboxProps extends Omit<ComponentPropsWithoutRef<'input'>, 'type'> {
  onCheckedChange?: (checked: boolean) => void
}

export const Checkbox = forwardRef<ElementRef<'input'>, CheckboxProps>(
  ({ className, onCheckedChange, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e)
      onCheckedChange?.(e.target.checked)
    }

    return (
      <div className="relative inline-flex items-center">
        <input
          type="checkbox"
          ref={ref}
          onChange={handleChange}
          className={cn(
            // Base styles
            "peer h-5 w-5 shrink-0 rounded-sm",
            "border border-[hsl(var(--border))]",
            "bg-[hsl(var(--background))]",
            // Touch optimization for iPad
            "touch-manipulation cursor-pointer",
            "min-h-[var(--touch-target)] min-w-[var(--touch-target)]",
            // Focus styles
            "focus-visible:outline-none focus-visible:ring-2",
            "focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2",
            "focus-visible:ring-offset-[hsl(var(--background))]",
            // Checked styles
            "checked:bg-[hsl(var(--primary))] checked:border-[hsl(var(--primary))]",
            "checked:text-[hsl(var(--primary-foreground))]",
            // Disabled styles
            "disabled:cursor-not-allowed disabled:opacity-50",
            // Custom checkmark
            "appearance-none",
            // Position for larger touch target
            "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
            className
          )}
          {...props}
        />
        {/* Checkmark icon */}
        <svg
          className={cn(
            "pointer-events-none absolute left-1/2 top-1/2",
            "-translate-x-1/2 -translate-y-1/2",
            "h-3 w-3 text-[hsl(var(--primary-foreground))]",
            "opacity-0 peer-checked:opacity-100",
            "transition-opacity duration-200"
          )}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        {/* Larger touch target */}
        <div className="h-11 w-11" aria-hidden="true" />
      </div>
    )
  }
)

Checkbox.displayName = 'Checkbox'