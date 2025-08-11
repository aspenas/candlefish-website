import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const logoVariants = cva(
  'flex items-center gap-3 transition-all duration-300 ease-out',
  {
    variants: {
      variant: {
        horizontal: 'flex-row',
        stacked: 'flex-col gap-2',
        icon: 'flex-row',
      },
      size: {
        sm: 'gap-2',
        md: 'gap-3',
        lg: 'gap-4',
        xl: 'gap-6',
      },
      animated: {
        true: 'hover:scale-105 active:scale-95',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'horizontal',
      size: 'md',
      animated: true,
    },
  }
)

const logoImageVariants = cva(
  'object-contain transition-all duration-300',
  {
    variants: {
      size: {
        sm: 'h-6 w-auto',
        md: 'h-8 w-auto',
        lg: 'h-12 w-auto',
        xl: 'h-20 w-auto',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
)

const logoTextVariants = cva(
  'font-display font-normal tracking-wider text-white transition-colors duration-300 whitespace-nowrap',
  {
    variants: {
      size: {
        sm: 'text-sm',
        md: 'text-lg',
        lg: 'text-xl',
        xl: 'text-2xl',
      },
      animated: {
        true: 'hover:text-teal-400',
        false: '',
      },
    },
    defaultVariants: {
      size: 'md',
      animated: true,
    },
  }
)

export interface LogoProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof logoVariants> {
  showText?: boolean
  imageSrc?: string
  imageAlt?: string
  text?: string
  href?: string
  loading?: 'eager' | 'lazy'
}

export const Logo = React.forwardRef<HTMLDivElement, LogoProps>(
  ({
    className,
    variant,
    size,
    animated,
    showText = true,
    imageSrc,
    imageAlt = 'Candlefish AI',
    text = 'CANDLEFISH',
    href,
    loading = 'eager',
    ...props
  }, ref) => {
    const resolvedImageSrc = imageSrc ?? (
      typeof window !== 'undefined'
        ? (getComputedStyle(document.documentElement)
            .getPropertyValue('--brand-logo-default-path')
            .trim() || '/logo/candlefish_original.png')
        : '/logo/candlefish_original.png'
    )
    const logoContent = (
      <div
        className={cn(logoVariants({ variant, size, animated, className }))}
        ref={ref}
        {...props}
      >
        <div className="relative rounded-lg overflow-hidden">
          <img
            src={resolvedImageSrc}
            alt={imageAlt}
            loading={loading}
            className={cn(logoImageVariants({ size }))}
            decoding="async"
          />
        </div>

        {showText && variant !== 'icon' && (
          <span className={cn(logoTextVariants({ size, animated }))}>
            {text}
          </span>
        )}
      </div>
    )

    if (href) {
      return (
        <a
          href={href}
          className="inline-block focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-black rounded-lg"
          aria-label={`${imageAlt} - Go to homepage`}
        >
          {logoContent}
        </a>
      )
    }

    return logoContent
  }
)

Logo.displayName = 'Logo'

// Brand-specific logo variants
export const CandlefishLogo = React.forwardRef<HTMLDivElement, Omit<LogoProps, 'imageSrc' | 'imageAlt' | 'text'>>(
  (props, ref) => (
    <Logo
      ref={ref}
      imageAlt="Candlefish AI"
      text="CANDLEFISH"
      {...props}
    />
  )
)

CandlefishLogo.displayName = 'CandlefishLogo'

export const PaintboxLogo = React.forwardRef<HTMLDivElement, Omit<LogoProps, 'imageSrc' | 'imageAlt' | 'text'>>(
  (props, ref) => (
    <Logo
      ref={ref}
      imageSrc="/logo/paintbox-logo.png"
      imageAlt="Paintbox"
      text="PAINTBOX"
      {...props}
    />
  )
)

PaintboxLogo.displayName = 'PaintboxLogo'
