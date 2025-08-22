import { ButtonHTMLAttributes, ReactNode } from 'react'
import { motion } from 'framer-motion'

interface AccessibleButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onAnimationStart' | 'onDragStart' | 'onDragEnd' | 'onDrag'> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  children: ReactNode
  ariaLabel?: string
}

export function AccessibleButton({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  ariaLabel,
  className = '',
  disabled,
  ...props
}: AccessibleButtonProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'btn-primary'
      case 'secondary':
        return 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
      case 'ghost':
        return 'hover:bg-muted text-muted-foreground hover:text-foreground'
      default:
        return 'btn-primary'
    }
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-xs'
      case 'md':
        return 'px-4 py-2 text-sm'
      case 'lg':
        return 'px-6 py-3 text-base'
      default:
        return 'px-4 py-2 text-sm'
    }
  }

  return (
    <motion.button
      className={`
        inline-flex items-center justify-center gap-2 rounded-lg font-medium
        transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
        focus:ring-offset-background disabled:opacity-50 disabled:pointer-events-none
        ${getVariantClasses()} ${getSizeClasses()} ${className}
      `}
      disabled={disabled || isLoading}
      aria-label={ariaLabel}
      aria-disabled={disabled || isLoading}
      whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
      {...props}
    >
      {isLoading && (
        <div
          className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
          aria-hidden="true"
        />
      )}
      {children}
    </motion.button>
  )
}
