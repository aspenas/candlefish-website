import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14b8a6] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-[#14b8a6] text-white shadow-sm hover:bg-[#0f9488] hover:shadow-md active:bg-[#0d7c71]',
        destructive:
          'bg-[#ef4444] text-white shadow-sm hover:bg-[#dc2626] active:bg-[#b91c1c]',
        outline:
          'border border-[#14b8a6]/20 bg-transparent text-[#14b8a6] hover:bg-[#14b8a6]/10 active:bg-[#14b8a6]/20',
        secondary:
          'bg-[#22d3ee] text-[#0b0f13] shadow-sm hover:bg-[#06b6d4] active:bg-[#0891b2]',
        ghost: 'text-[#e6f9f6] hover:bg-[#0f172a]/20 hover:text-[#14b8a6]',
        link: 'text-[#14b8a6] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-12 rounded-lg px-6 text-base',
        xl: 'h-14 rounded-lg px-8 text-lg',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
