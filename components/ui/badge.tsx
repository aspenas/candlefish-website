import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center border font-mono text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline:
          "text-foreground border-current",
        ghost:
          "text-foreground hover:bg-accent hover:text-accent-foreground",
        success:
          "border-transparent bg-green-500 text-white shadow hover:bg-green-500/80",
        warning:
          "border-transparent bg-amber-500 text-white shadow hover:bg-amber-500/80",
        info:
          "border-transparent bg-blue-500 text-white shadow hover:bg-blue-500/80",
        glow:
          "border-primary text-primary shadow-[0_0_10px_oklch(50%_0.20_180_/_0.3)] hover:shadow-[0_0_20px_oklch(50%_0.20_180_/_0.5)]",
      },
      size: {
        default: "px-2.5 py-0.5",
        sm: "px-2 py-0.25 text-[0.625rem]",
        lg: "px-3 py-1 text-sm",
      },
      shape: {
        default: "rounded-md",
        pill: "rounded-full",
        square: "rounded-none",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      shape: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  pulse?: boolean
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, size, shape, pulse, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          badgeVariants({ variant, size, shape }),
          pulse && "animate-pulse",
          className
        )}
        {...props}
      />
    )
  }
)
Badge.displayName = "Badge"

/**
 * Status Badge - Specialized badge for status indicators
 */
export interface StatusBadgeProps extends BadgeProps {
  status: "active" | "inactive" | "pending" | "error" | "success"
}

const statusConfig = {
  active: { variant: "success" as const, text: "Active" },
  inactive: { variant: "secondary" as const, text: "Inactive" },
  pending: { variant: "warning" as const, text: "Pending" },
  error: { variant: "destructive" as const, text: "Error" },
  success: { variant: "success" as const, text: "Success" },
}

const StatusBadge = React.forwardRef<HTMLDivElement, StatusBadgeProps>(
  ({ status, children, ...props }, ref) => {
    const config = statusConfig[status]

    return (
      <Badge
        ref={ref}
        variant={config.variant}
        {...props}
      >
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
        {children || config.text}
      </Badge>
    )
  }
)
StatusBadge.displayName = "StatusBadge"

/**
 * Validation Phase Badge - The signature Candlefish badge
 */
export interface ValidationBadgeProps extends Omit<BadgeProps, "variant"> {
  phase?: string
}

const ValidationBadge = React.forwardRef<HTMLDivElement, ValidationBadgeProps>(
  ({ phase = "VALIDATION PHASE", className, ...props }, ref) => {
    return (
      <Badge
        ref={ref}
        variant="outline"
        className={cn(
          "border-candlefish-teal-500 text-candlefish-teal-500",
          "uppercase tracking-[0.1em]",
          "hover:bg-candlefish-teal-500/10",
          className
        )}
        {...props}
      >
        {phase}
      </Badge>
    )
  }
)
ValidationBadge.displayName = "ValidationBadge"

export { Badge, StatusBadge, ValidationBadge, badgeVariants }
