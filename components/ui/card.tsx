import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const cardVariants = cva(
  "rounded-lg transition-all duration-300",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground shadow border border-border",
        glass: "bg-background/10 backdrop-blur-md border border-white/10",
        glow: "bg-card shadow-lg shadow-primary/10 border border-primary/20 hover:shadow-xl hover:shadow-primary/20",
        ghost: "bg-transparent",
        elevated: "bg-card shadow-xl hover:shadow-2xl",
      },
      padding: {
        none: "",
        sm: "p-4",
        default: "p-6",
        lg: "p-8",
        xl: "p-10",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "default",
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  hoverable?: boolean
  clickable?: boolean
  gradient?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({
    className,
    variant,
    padding,
    hoverable = false,
    clickable = false,
    gradient = false,
    ...props
  }, ref) => (
    <div
      ref={ref}
      className={cn(
        cardVariants({ variant, padding }),
        hoverable && "hover:scale-[1.02] hover:border-primary/30",
        clickable && "cursor-pointer",
        gradient && "relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-br before:from-primary/5 before:to-transparent before:pointer-events-none",
        className
      )}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

/**
 * Feature Card - Specialized card for feature showcases
 */
export interface FeatureCardProps extends CardProps {
  icon?: React.ReactNode
  badge?: string
}

const FeatureCard = React.forwardRef<HTMLDivElement, FeatureCardProps>(
  ({ icon, badge, children, className, ...props }, ref) => (
    <Card
      ref={ref}
      className={cn("relative group", className)}
      hoverable
      {...props}
    >
      {badge && (
        <div className="absolute -top-3 -right-3 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
          {badge}
        </div>
      )}
      {icon && (
        <div className="mb-4 inline-flex p-3 bg-primary/10 rounded-lg text-primary group-hover:bg-primary/20 transition-colors">
          {icon}
        </div>
      )}
      {children}
    </Card>
  )
)
FeatureCard.displayName = "FeatureCard"

/**
 * Metric Card - For displaying metrics and statistics
 */
export interface MetricCardProps extends CardProps {
  label: string
  value: string | number
  change?: {
    value: number
    trend: "up" | "down" | "neutral"
  }
  icon?: React.ReactNode
}

const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  ({ label, value, change, icon, className, ...props }, ref) => (
    <Card ref={ref} className={cn("relative", className)} {...props}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {change && (
              <div className="flex items-center mt-2">
                <span
                  className={cn(
                    "text-sm font-medium",
                    change.trend === "up" && "text-green-500",
                    change.trend === "down" && "text-red-500",
                    change.trend === "neutral" && "text-muted-foreground"
                  )}
                >
                  {change.trend === "up" && "↑"}
                  {change.trend === "down" && "↓"}
                  {change.value > 0 ? "+" : ""}{change.value}%
                </span>
              </div>
            )}
          </div>
          {icon && (
            <div className="text-muted-foreground opacity-20 scale-150">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
)
MetricCard.displayName = "MetricCard"

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  FeatureCard,
  MetricCard,
  cardVariants,
}
