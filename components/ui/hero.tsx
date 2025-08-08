import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Button } from "./button"
import { Badge, ValidationBadge } from "./badge"

const heroVariants = cva(
  "relative w-full flex items-center justify-center overflow-hidden",
  {
    variants: {
      size: {
        sm: "min-h-[400px] py-16",
        default: "min-h-[600px] py-24",
        lg: "min-h-[700px] py-32",
        xl: "min-h-[800px] py-40",
        full: "min-h-screen py-20",
      },
      align: {
        left: "text-left",
        center: "text-center",
        right: "text-right",
      },
    },
    defaultVariants: {
      size: "default",
      align: "center",
    },
  }
)

export interface HeroProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'title'>,
    VariantProps<typeof heroVariants> {
  badge?: React.ReactNode
  title?: React.ReactNode
  titleAccent?: string
  subtitle?: React.ReactNode
  actions?: React.ReactNode
  background?: React.ReactNode
  overlay?: boolean
}

const Hero = React.forwardRef<HTMLElement, HeroProps>(
  ({
    className,
    size,
    align,
    badge,
    title,
    titleAccent,
    subtitle,
    actions,
    background,
    overlay = true,
    children,
    ...props
  }, ref) => {
    return (
      <section
        ref={ref}
        className={cn(heroVariants({ size, align }), className)}
        {...props}
      >
        {/* Background */}
        {background && (
          <div className="absolute inset-0 z-0">
            {background}
          </div>
        )}

        {/* Overlay */}
        {overlay && (
          <div className="absolute inset-0 bg-gradient-to-b from-background/50 to-background z-[1]" />
        )}

        {/* Content */}
        <div className="container relative z-10 mx-auto px-6">
          <div className={cn(
            "max-w-4xl",
            align === "center" && "mx-auto",
            align === "right" && "ml-auto"
          )}>
            {/* Badge */}
            {badge && (
              <div className="mb-8">
                {badge}
              </div>
            )}

            {/* Title */}
            {title && (
              <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-light leading-tight tracking-tight mb-6">
                {typeof title === "string" && titleAccent ? (
                  <>
                    {title.split(titleAccent)[0]}
                    <span className="text-primary">{titleAccent}</span>
                    {title.split(titleAccent)[1]}
                  </>
                ) : (
                  title
                )}
              </h1>
            )}

            {/* Subtitle */}
            {subtitle && (
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                {subtitle}
              </p>
            )}

            {/* Actions */}
            {actions && (
              <div className={cn(
                "flex gap-4",
                align === "center" && "justify-center",
                align === "right" && "justify-end"
              )}>
                {actions}
              </div>
            )}

            {/* Children */}
            {children}
          </div>
        </div>
      </section>
    )
  }
)
Hero.displayName = "Hero"

/**
 * Candlefish Hero - Pre-configured hero matching current site
 */
export interface CandlefishHeroProps extends Omit<HeroProps, "badge" | "background"> {
  showParticles?: boolean
}

const CandlefishHero = React.forwardRef<HTMLElement, CandlefishHeroProps>(
  ({ showParticles = true, className, ...props }, ref) => {
    return (
      <Hero
        ref={ref}
        size="full"
        align="center"
        badge={<ValidationBadge />}
        background={
          showParticles ? (
            <div className="neural-grid absolute inset-0">
              {/* Animated particles */}
              <div className="absolute inset-0">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="particle absolute w-1 h-1 bg-primary rounded-full"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      animationDelay: `${i * 0.5}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          ) : undefined
        }
        className={cn("bg-background", className)}
        {...props}
      />
    )
  }
)
CandlefishHero.displayName = "CandlefishHero"

/**
 * Split Hero - Content on one side, visual on the other
 */
export interface SplitHeroProps extends HeroProps {
  visual?: React.ReactNode
  visualPosition?: "left" | "right"
}

const SplitHero = React.forwardRef<HTMLElement, SplitHeroProps>(
  ({
    visual,
    visualPosition = "right",
    children,
    className,
    ...props
  }, ref) => {
    return (
      <Hero
        ref={ref}
        align="left"
        className={cn("items-stretch", className)}
        {...props}
      >
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className={cn(
              "order-2 lg:order-1",
              visualPosition === "right" && "lg:order-1",
              visualPosition === "left" && "lg:order-2"
            )}>
              {children}
            </div>
            {visual && (
              <div className={cn(
                "order-1 lg:order-2",
                visualPosition === "right" && "lg:order-2",
                visualPosition === "left" && "lg:order-1"
              )}>
                {visual}
              </div>
            )}
          </div>
        </div>
      </Hero>
    )
  }
)
SplitHero.displayName = "SplitHero"

export { Hero, CandlefishHero, SplitHero, heroVariants }
