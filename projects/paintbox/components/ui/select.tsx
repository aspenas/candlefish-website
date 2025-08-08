'use client'

import React, { forwardRef } from 'react'
import { cn } from '@/lib/utils/cn'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean
  options?: { value: string; label: string }[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, options, children, ...props }, ref) => {
    return (
      <select
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
          // Focus styles
          "focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]",
          "focus:border-[hsl(var(--primary))]",
          // Disabled styles
          "disabled:cursor-not-allowed disabled:opacity-50",
          // Error state
          error && "border-[hsl(var(--destructive))] focus:ring-[hsl(var(--destructive))]",
          // Custom arrow
          "appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2714%27%20height%3D%278%27%20viewBox%3D%270%200%2014%208%27%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%3E%3Cpath%20d%3D%27M1%201l6%206%206-6%27%20stroke%3D%27%236B7280%27%20stroke-width%3D%272%27%20fill%3D%27none%27%20fill-rule%3D%27evenodd%27%2F%3E%3C%2Fsvg%3E')] bg-[position:right_0.7rem_center] bg-[size:16px] bg-no-repeat pr-10",
          className
        )}
        ref={ref}
        {...props}
      >
        {options
          ? options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))
          : children}
      </select>
    )
  }
)

Select.displayName = 'Select'

export interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export const SelectTrigger = forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-[var(--radius)]",
          "border border-[hsl(var(--border))] bg-[hsl(var(--background))]",
          "px-3 py-2 text-sm",
          "placeholder:text-[hsl(var(--muted-foreground))]",
          "focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "min-h-[var(--touch-target)] touch-manipulation",
          className
        )}
        {...props}
      >
        {children}
        <svg
          width="15"
          height="15"
          viewBox="0 0 15 15"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 opacity-50"
        >
          <path
            d="M4.93179 5.43179C4.75605 5.60753 4.75605 5.89245 4.93179 6.06819C5.10753 6.24392 5.39245 6.24392 5.56819 6.06819L7.49999 4.13638L9.43179 6.06819C9.60753 6.24392 9.89245 6.24392 10.0682 6.06819C10.2439 5.89245 10.2439 5.60753 10.0682 5.43179L7.81819 3.18179C7.73379 3.0974 7.61933 3.04999 7.49999 3.04999C7.38064 3.04999 7.26618 3.0974 7.18179 3.18179L4.93179 5.43179ZM10.0682 9.56819C10.2439 9.39245 10.2439 9.10753 10.0682 8.93179C9.89245 8.75606 9.60753 8.75606 9.43179 8.93179L7.49999 10.8636L5.56819 8.93179C5.39245 8.75606 5.10753 8.75606 4.93179 8.93179C4.75605 9.10753 4.75605 9.39245 4.93179 9.56819L7.18179 11.8182C7.26618 11.9026 7.38064 11.95 7.49999 11.95C7.61933 11.95 7.73379 11.9026 7.81819 11.8182L10.0682 9.56819Z"
            fill="currentColor"
            fillRule="evenodd"
            clipRule="evenodd"
          />
        </svg>
      </button>
    )
  }
)

SelectTrigger.displayName = 'SelectTrigger'

export const SelectContent = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "relative z-50 min-w-[8rem] overflow-hidden rounded-[var(--radius)]",
        "border border-[hsl(var(--border))] bg-[hsl(var(--popover))] text-[hsl(var(--popover-foreground))]",
        "shadow-md",
        className
      )}
      {...props}
    >
      <div className="p-1">{children}</div>
    </div>
  )
})

SelectContent.displayName = 'SelectContent'

export const SelectItem = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm",
        "py-1.5 pl-8 pr-2 text-sm outline-none",
        "focus:bg-[hsl(var(--accent))] focus:text-[hsl(var(--accent-foreground))]",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})

SelectItem.displayName = 'SelectItem'
