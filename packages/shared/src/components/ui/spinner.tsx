import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const spinnerVariants = cva(
  'animate-spin rounded-full border-2 border-solid border-current border-r-transparent',
  {
    variants: {
      size: {
        sm: 'h-4 w-4 border-[1.5px]',
        default: 'h-6 w-6',
        lg: 'h-8 w-8 border-[3px]',
        xl: 'h-12 w-12 border-4',
      },
      variant: {
        default: 'text-[#14b8a6]',
        secondary: 'text-[#22d3ee]',
        muted: 'text-[#a3b3bf]',
        white: 'text-white',
      },
    },
    defaultVariants: {
      size: 'default',
      variant: 'default',
    },
  }
)

export interface SpinnerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'>,
    VariantProps<typeof spinnerVariants> {}

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size, variant, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(spinnerVariants({ size, variant }), className)}
        {...props}
        role="status"
        aria-label="Loading"
      />
    )
  }
)
Spinner.displayName = 'Spinner'

export { Spinner, spinnerVariants }
