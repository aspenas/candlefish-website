import React, { HTMLAttributes } from 'react';
import { cva, VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-sea-glow focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-mist/10 text-mist',
        primary: 'border-transparent bg-sea-glow text-white',
        secondary: 'border-transparent bg-slate text-foam',
        success: 'border-transparent bg-green-100 text-green-800',
        warning: 'border-transparent bg-yellow-100 text-yellow-800',
        error: 'border-transparent bg-red-100 text-red-800',
        outline: 'border-mist text-mist',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

const Badge: React.FC<BadgeProps> = ({ className, variant, size, ...props }) => {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  );
};

export { Badge, badgeVariants };