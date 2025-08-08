import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const logoVariants = cva(
  "inline-flex items-center select-none",
  {
    variants: {
      size: {
        xs: "text-sm",
        sm: "text-base",
        default: "text-xl",
        lg: "text-2xl",
        xl: "text-3xl",
        "2xl": "text-4xl",
      },
      variant: {
        default: "text-foreground",
        primary: "text-primary",
        inverted: "text-background",
        gradient: "bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent",
      },
      layout: {
        horizontal: "flex-row gap-3",
        vertical: "flex-col gap-2 text-center",
        icon: "",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
      layout: "horizontal",
    },
  }
)

const logoIconVariants = cva(
  "flex items-center justify-center font-bold rounded-lg transition-all duration-300",
  {
    variants: {
      size: {
        xs: "w-6 h-6 text-xs",
        sm: "w-8 h-8 text-sm",
        default: "w-10 h-10 text-base",
        lg: "w-12 h-12 text-lg",
        xl: "w-14 h-14 text-xl",
        "2xl": "w-16 h-16 text-2xl",
      },
      variant: {
        default: "bg-primary text-primary-foreground",
        inverted: "bg-foreground text-background",
        glass: "bg-white/10 backdrop-blur-md border border-white/20 text-foreground",
        glow: "bg-primary text-primary-foreground shadow-lg shadow-primary/50",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  }
)

export interface LogoProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof logoVariants> {
  showIcon?: boolean
  showText?: boolean
  iconVariant?: VariantProps<typeof logoIconVariants>["variant"]
  animated?: boolean
  href?: string
}

const Logo = React.forwardRef<HTMLDivElement, LogoProps>(
  ({
    className,
    size,
    variant,
    layout,
    showIcon = true,
    showText = true,
    iconVariant = "default",
    animated = false,
    href,
    ...props
  }, ref) => {
    const content = (
      <>
        {showIcon && layout !== "icon" && (
          <div
            className={cn(
              logoIconVariants({ size, variant: iconVariant }),
              animated && "hover:scale-110 hover:rotate-3",
              animated && iconVariant === "glow" && "animate-glow-pulse"
            )}
          >
            C
          </div>
        )}
        {showText && layout !== "icon" && (
          <span
            className={cn(
              "font-light tracking-[0.05em]",
              size === "xs" && "text-sm",
              size === "sm" && "text-base",
              size === "default" && "text-xl",
              size === "lg" && "text-2xl",
              size === "xl" && "text-3xl",
              size === "2xl" && "text-4xl"
            )}
          >
            CANDLEFISH
          </span>
        )}
        {layout === "icon" && (
          <div
            className={cn(
              logoIconVariants({ size, variant: iconVariant }),
              animated && "hover:scale-110 hover:rotate-3",
              animated && iconVariant === "glow" && "animate-glow-pulse"
            )}
          >
            C
          </div>
        )}
      </>
    )

    if (href) {
      const { onClick, onMouseEnter, onMouseLeave, ...anchorProps } = props as any
      return (
        <a
          href={href}
          className={cn(logoVariants({ size, variant, layout }), className)}
          onClick={onClick}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        >
          {content}
        </a>
      )
    }

    return (
      <div
        ref={ref}
        className={cn(logoVariants({ size, variant, layout }), className)}
        {...props}
      >
        {content}
      </div>
    )
  }
)
Logo.displayName = "Logo"

/**
 * Logo with Tagline Component
 */
export interface LogoWithTaglineProps extends LogoProps {
  tagline?: string
}

const LogoWithTagline = React.forwardRef<HTMLDivElement, LogoWithTaglineProps>(
  ({ tagline = "Illuminating Intelligence", className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("flex flex-col items-center gap-2", className)}>
        <Logo layout="horizontal" {...props} />
        <p className="text-sm text-muted-foreground tracking-wide">
          {tagline}
        </p>
      </div>
    )
  }
)
LogoWithTagline.displayName = "LogoWithTagline"

/**
 * Animated Logo Component with bioluminescent effect
 */
const AnimatedLogo = React.forwardRef<HTMLDivElement, LogoProps>(
  ({ className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("relative", className)}>
        <div className="absolute inset-0 blur-2xl opacity-50">
          <Logo {...props} iconVariant="glow" className="animate-pulse" />
        </div>
        <Logo {...props} iconVariant="glow" animated className="relative z-10" />
      </div>
    )
  }
)
AnimatedLogo.displayName = "AnimatedLogo"

export { Logo, LogoWithTagline, AnimatedLogo, logoVariants, logoIconVariants }
