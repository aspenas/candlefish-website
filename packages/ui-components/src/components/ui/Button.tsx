import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-candlefish-400 text-black hover:bg-candlefish-300 focus:ring-candlefish-400',
        primary: 'bg-candlefish-400 text-black hover:bg-candlefish-300 focus:ring-candlefish-400',
        secondary: 'border border-gray-400 text-white hover:bg-gray-800 focus:ring-gray-400',
        outline: 'border border-candlefish-400 text-candlefish-400 hover:bg-candlefish-400 hover:text-black focus:ring-candlefish-400',
        ghost: 'text-gray-400 hover:text-white hover:bg-gray-800 focus:ring-gray-400',
        link: 'text-candlefish-400 hover:text-candlefish-300 underline-offset-4 hover:underline',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-600',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4',
        lg: 'h-12 px-6 text-lg',
        xl: 'h-14 px-8 text-xl',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    variant,
    size,
    asChild = false,
    loading = false,
    leftIcon,
    rightIcon,
    children,
    disabled,
    ...props
  }, ref) => {
    const isDisabled = disabled || loading

    if (asChild) {
      // If asChild is true, render as a Slot component
      // This would require implementing a Slot component or using one from Radix
      throw new Error('asChild prop is not implemented yet')
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="m12 2 8.09 8.26L12 22l-8.09-11.74L12 2z"
            />
          </svg>
        )}
        {!loading && leftIcon}
        {children}
        {!loading && rightIcon}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button, buttonVariants }
