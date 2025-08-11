import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const spinnerVariants = cva(
  'animate-spin rounded-full border-2 border-current border-t-transparent',
  {
    variants: {
      size: {
        sm: 'h-4 w-4',
        md: 'h-6 w-6',
        lg: 'h-8 w-8',
        xl: 'h-12 w-12',
      },
      variant: {
        default: 'text-primary',
        secondary: 'text-secondary-foreground',
        muted: 'text-muted-foreground',
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'default',
    },
  }
);

interface LoadingSpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  text?: string;
}

export function LoadingSpinner({
  className,
  size,
  variant,
  text,
  ...props
}: LoadingSpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center gap-2', className)} {...props}>
      <div className={cn(spinnerVariants({ size, variant }))} />
      {text && (
        <p className="text-sm text-muted-foreground animate-pulse">{text}</p>
      )}
    </div>
  );
}
