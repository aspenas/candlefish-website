'use client'

import React, { forwardRef, ElementRef, ComponentPropsWithoutRef } from 'react'
import { cn } from '@/lib/utils/cn'

interface SwitchProps extends ComponentPropsWithoutRef<'button'> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

export const Switch = forwardRef<ElementRef<'button'>, SwitchProps>(
  ({ className, checked = false, onCheckedChange, disabled, ...props }, ref) => {
    const handleClick = () => {
      if (!disabled && onCheckedChange) {
        onCheckedChange(!checked)
      }
    }

    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={handleClick}
        ref={ref}
        className={cn(
          // Base container styles
          "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center",
          "rounded-full border-2 border-transparent",
          "transition-colors duration-200",
          // Touch optimization for iPad
          "touch-manipulation p-0",
          "focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-[hsl(var(--ring))] focus-visible:ring-offset-2",
          "focus-visible:ring-offset-[hsl(var(--background))]",
          // State styles
          checked 
            ? "bg-[hsl(var(--primary))]" 
            : "bg-[hsl(var(--input))]",
          // Disabled styles
          "disabled:cursor-not-allowed disabled:opacity-50",
          // Ensure minimum touch target
          "min-h-[var(--touch-target)] min-w-[var(--touch-target)]",
          "flex items-center justify-center",
          className
        )}
        {...props}
      >
        <span
          className={cn(
            // Thumb styles
            "pointer-events-none block h-5 w-5 rounded-full",
            "bg-[hsl(var(--background))] shadow-lg ring-0",
            "transition-transform duration-200",
            // Position based on state
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    )
  }
)

Switch.displayName = 'Switch'