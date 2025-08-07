'use client'

import React, { forwardRef, createContext, useContext } from 'react'
import { cn } from '@/lib/utils/cn'

interface RadioGroupContextValue {
  value?: string
  onValueChange?: (value: string) => void
  name?: string
}

const RadioGroupContext = createContext<RadioGroupContextValue>({})

interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  name?: string
}

export const RadioGroup = forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, value, defaultValue, onValueChange, name, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue)
    const currentValue = value ?? internalValue

    const handleValueChange = (newValue: string) => {
      if (!value) {
        setInternalValue(newValue)
      }
      onValueChange?.(newValue)
    }

    return (
      <RadioGroupContext.Provider
        value={{
          value: currentValue,
          onValueChange: handleValueChange,
          name: name || `radio-group-${React.useId()}`
        }}
      >
        <div
          ref={ref}
          role="radiogroup"
          className={cn("grid gap-2", className)}
          {...props}
        />
      </RadioGroupContext.Provider>
    )
  }
)

RadioGroup.displayName = 'RadioGroup'

interface RadioGroupItemProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value'> {
  value: string
}

export const RadioGroupItem = forwardRef<HTMLInputElement, RadioGroupItemProps>(
  ({ className, value, onChange, ...props }, ref) => {
    const context = useContext(RadioGroupContext)
    const isChecked = context.value === value

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e)
      if (e.target.checked) {
        context.onValueChange?.(value)
      }
    }

    return (
      <div className="relative inline-flex items-center">
        <input
          ref={ref}
          type="radio"
          value={value}
          name={context.name}
          checked={isChecked}
          onChange={handleChange}
          className={cn(
            // Base styles
            "peer h-5 w-5 shrink-0 rounded-full",
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
            "checked:border-[hsl(var(--primary))]",
            // Disabled styles
            "disabled:cursor-not-allowed disabled:opacity-50",
            // Custom radio button
            "appearance-none",
            // Position for larger touch target
            "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
            className
          )}
          {...props}
        />
        {/* Radio dot */}
        <div
          className={cn(
            "pointer-events-none absolute left-1/2 top-1/2",
            "-translate-x-1/2 -translate-y-1/2",
            "h-2.5 w-2.5 rounded-full",
            "bg-[hsl(var(--primary))]",
            "opacity-0 peer-checked:opacity-100",
            "transition-opacity duration-200"
          )}
        />
        {/* Larger touch target */}
        <div className="h-11 w-11" aria-hidden="true" />
      </div>
    )
  }
)

RadioGroupItem.displayName = 'RadioGroupItem'