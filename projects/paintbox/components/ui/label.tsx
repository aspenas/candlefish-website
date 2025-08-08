import React, { forwardRef } from 'react'
import { cn } from '@/lib/utils/cn'

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
  error?: boolean
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, error, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          "text-sm font-medium leading-none",
          "peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
          error ? "text-[hsl(var(--destructive))]" : "text-[hsl(var(--foreground))]",
          className
        )}
        {...props}
      >
        {children}
        {required && (
          <span className="ml-1 text-[hsl(var(--destructive))]" aria-label="required">
            *
          </span>
        )}
      </label>
    )
  }
)

Label.displayName = 'Label'
