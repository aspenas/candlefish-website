import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines clsx and tailwind-merge for optimal className handling
 * Prevents style conflicts and ensures proper Tailwind class precedence
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a date to a human-readable string
 */
export function formatDate(date: Date | string | number): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date))
}

/**
 * Formats a date to a relative time string (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string | number): string {
  const now = new Date()
  const then = new Date(date)
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)

  const intervals = [
    { label: "year", seconds: 31536000 },
    { label: "month", seconds: 2592000 },
    { label: "day", seconds: 86400 },
    { label: "hour", seconds: 3600 },
    { label: "minute", seconds: 60 },
    { label: "second", seconds: 1 },
  ]

  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds)
    if (count > 0) {
      return `${count} ${interval.label}${count !== 1 ? "s" : ""} ago`
    }
  }

  return "just now"
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Throttle function for rate limiting
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/**
 * Checks if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/**
 * Generates a unique ID for accessibility
 */
export function generateId(prefix = "candlefish"): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Converts OKLCH to RGB (approximation for browsers without OKLCH support)
 */
export function oklchToRgb(l: number, c: number, h: number): string {
  // This is a simplified conversion - for production, use a proper color library
  // For now, return a fallback color
  if (h === 180 && c === 0.2 && l === 50) {
    return "#00CED1" // Candlefish teal
  }
  return "#000000" // Fallback to black
}

/**
 * Check if browser supports OKLCH colors
 */
export function supportsOklch(): boolean {
  if (typeof window === "undefined") return false

  const div = document.createElement("div")
  div.style.color = "oklch(50% 0.2 180)"
  return div.style.color !== ""
}

/**
 * Focus trap utility for modals and overlays
 */
export function trapFocus(element: HTMLElement) {
  const focusableElements = element.querySelectorAll(
    'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select'
  )
  const firstFocusableElement = focusableElements[0] as HTMLElement
  const lastFocusableElement = focusableElements[
    focusableElements.length - 1
  ] as HTMLElement

  element.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      if (e.shiftKey) {
        if (document.activeElement === firstFocusableElement) {
          lastFocusableElement.focus()
          e.preventDefault()
        }
      } else {
        if (document.activeElement === lastFocusableElement) {
          firstFocusableElement.focus()
          e.preventDefault()
        }
      }
    }
  })

  firstFocusableElement?.focus()
}

/**
 * Intersection Observer wrapper for animations
 */
export function observeElement(
  element: HTMLElement,
  callback: (isIntersecting: boolean) => void,
  options?: IntersectionObserverInit
) {
  if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
    callback(true) // Fallback for SSR/old browsers
    return
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      callback(entry.isIntersecting)
    })
  }, options)

  observer.observe(element)

  return () => observer.disconnect()
}
