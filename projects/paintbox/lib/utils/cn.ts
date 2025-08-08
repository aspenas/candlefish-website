import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Utility function to merge Tailwind CSS classes with proper precedence
 * Combines clsx for conditional classes and tailwind-merge for deduplication
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Debounce utility for touch interactions
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

/**
 * Throttle utility for scroll and resize events
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

/**
 * Check if device supports touch
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false

  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  )
}

/**
 * Check if device is iPad
 */
export function isIPad(): boolean {
  if (typeof window === 'undefined') return false

  const userAgent = navigator.userAgent.toLowerCase()
  const isIPadUA = /ipad/.test(userAgent)
  const isIPadPro = /macintosh/.test(userAgent) && isTouchDevice()

  return isIPadUA || isIPadPro
}

/**
 * Get viewport dimensions
 */
export function getViewport() {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0 }
  }

  return {
    width: Math.max(
      document.documentElement.clientWidth || 0,
      window.innerWidth || 0
    ),
    height: Math.max(
      document.documentElement.clientHeight || 0,
      window.innerHeight || 0
    )
  }
}

/**
 * Format class names for iPad optimization
 */
export function ipadClasses(
  base: string,
  desktop?: string,
  mobile?: string
): string {
  const classes = [base]

  if (desktop) {
    classes.push(`lg:${desktop}`)
  }

  if (mobile) {
    classes.push(`max-lg:${mobile}`)
  }

  // Always ensure touch targets are at least 44px
  classes.push('min-h-[44px]', 'min-w-[44px]')

  return classes.join(' ')
}

/**
 * Generate responsive padding classes
 */
export function responsivePadding(
  base: number = 4,
  md: number = 6,
  lg: number = 8
): string {
  return `p-${base} md:p-${md} lg:p-${lg}`
}

/**
 * Generate responsive text size classes
 */
export function responsiveText(
  base: 'sm' | 'base' | 'lg' | 'xl' | '2xl' = 'base',
  md?: 'sm' | 'base' | 'lg' | 'xl' | '2xl',
  lg?: 'sm' | 'base' | 'lg' | 'xl' | '2xl'
): string {
  const classes = [`text-${base}`]

  if (md) {
    classes.push(`md:text-${md}`)
  }

  if (lg) {
    classes.push(`lg:text-${lg}`)
  }

  return classes.join(' ')
}
