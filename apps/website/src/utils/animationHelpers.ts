// Animation Performance Optimization Utilities

/**
 * Request Animation Frame throttle for smooth 60fps animations
 */
export const rafThrottle = (callback: (...args: any[]) => void) => {
  let requestId: number | null = null
  let lastArgs: any[]

  const throttled = (...args: any[]) => {
    lastArgs = args

    if (requestId === null) {
      requestId = requestAnimationFrame(() => {
        callback(...lastArgs)
        requestId = null
      })
    }
  }

  throttled.cancel = () => {
    if (requestId !== null) {
      cancelAnimationFrame(requestId)
      requestId = null
    }
  }

  return throttled
}

/**
 * Debounce with RAF for animation-safe delays
 */
export const rafDebounce = (callback: (...args: any[]) => void, delay: number = 0) => {
  let timeoutId: NodeJS.Timeout | null = null
  let requestId: number | null = null

  const debounced = (...args: any[]) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }
    if (requestId !== null) {
      cancelAnimationFrame(requestId)
    }

    timeoutId = setTimeout(() => {
      requestId = requestAnimationFrame(() => {
        callback(...args)
        timeoutId = null
        requestId = null
      })
    }, delay)
  }

  debounced.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    if (requestId !== null) {
      cancelAnimationFrame(requestId)
      requestId = null
    }
  }

  return debounced
}

/**
 * Smooth value transition using RAF
 */
export class SmoothValue {
  private current: number
  private target: number
  private velocity: number = 0
  private animationId: number | null = null
  private onChange: (value: number) => void
  private damping: number
  private stiffness: number

  constructor(
    initialValue: number,
    onChange: (value: number) => void,
    options: { damping?: number; stiffness?: number } = {}
  ) {
    this.current = initialValue
    this.target = initialValue
    this.onChange = onChange
    this.damping = options.damping || 0.8
    this.stiffness = options.stiffness || 0.15
  }

  set(value: number) {
    this.target = value
    if (this.animationId === null) {
      this.animate()
    }
  }

  private animate = () => {
    const force = (this.target - this.current) * this.stiffness
    this.velocity = (this.velocity + force) * this.damping
    this.current += this.velocity

    const diff = Math.abs(this.target - this.current)
    const velocityAbs = Math.abs(this.velocity)

    if (diff < 0.001 && velocityAbs < 0.001) {
      this.current = this.target
      this.velocity = 0
      this.animationId = null
      this.onChange(this.current)
    } else {
      this.onChange(this.current)
      this.animationId = requestAnimationFrame(this.animate)
    }
  }

  destroy() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }
}

/**
 * Optimized scroll handler with passive listeners
 */
export const optimizedScrollHandler = (
  callback: (scrollY: number, scrollDirection: 'up' | 'down') => void,
  options: { threshold?: number } = {}
) => {
  let lastScrollY = 0
  let ticking = false
  const threshold = options.threshold || 0

  const handleScroll = () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const currentScrollY = window.scrollY
        const diff = currentScrollY - lastScrollY

        if (Math.abs(diff) > threshold) {
          const direction = diff > 0 ? 'down' : 'up'
          callback(currentScrollY, direction)
          lastScrollY = currentScrollY
        }

        ticking = false
      })
      ticking = true
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true })

  return () => {
    window.removeEventListener('scroll', handleScroll)
  }
}

/**
 * GPU-accelerated transform utility
 */
export const gpuTransform = {
  translate3d: (x: number, y: number, z: number = 0) =>
    `translate3d(${x}px, ${y}px, ${z}px)`,

  scale3d: (x: number, y: number = x, z: number = 1) =>
    `scale3d(${x}, ${y}, ${z})`,

  rotate3d: (x: number, y: number, z: number, angle: number) =>
    `rotate3d(${x}, ${y}, ${z}, ${angle}deg)`,

  matrix3d: (values: number[]) =>
    `matrix3d(${values.join(',')})`
}

/**
 * Will-change optimization manager
 */
export class WillChangeManager {
  private elements = new Map<HTMLElement, Set<string>>()
  private timeouts = new Map<HTMLElement, NodeJS.Timeout>()

  add(element: HTMLElement, properties: string[], duration: number = 200) {
    if (!this.elements.has(element)) {
      this.elements.set(element, new Set())
    }

    const props = this.elements.get(element)!
    properties.forEach(prop => props.add(prop))

    element.style.willChange = Array.from(props).join(', ')

    // Clear existing timeout
    const existingTimeout = this.timeouts.get(element)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // Set new timeout to remove will-change
    const timeout = setTimeout(() => {
      this.remove(element, properties)
    }, duration)

    this.timeouts.set(element, timeout)
  }

  remove(element: HTMLElement, properties?: string[]) {
    const props = this.elements.get(element)

    if (!props) return

    if (properties) {
      properties.forEach(prop => props.delete(prop))
    } else {
      props.clear()
    }

    if (props.size === 0) {
      element.style.willChange = 'auto'
      this.elements.delete(element)

      const timeout = this.timeouts.get(element)
      if (timeout) {
        clearTimeout(timeout)
        this.timeouts.delete(element)
      }
    } else {
      element.style.willChange = Array.from(props).join(', ')
    }
  }

  clear() {
    this.timeouts.forEach(timeout => clearTimeout(timeout))
    this.elements.forEach((_, element) => {
      element.style.willChange = 'auto'
    })
    this.elements.clear()
    this.timeouts.clear()
  }
}

/**
 * FPS Monitor for development
 */
export class FPSMonitor {
  private frameCount = 0
  private lastTime = performance.now()
  private fps = 0
  private animationId: number | null = null
  private callback?: (fps: number) => void

  constructor(callback?: (fps: number) => void) {
    this.callback = callback
  }

  start() {
    if (this.animationId !== null) return

    const measure = () => {
      this.frameCount++
      const currentTime = performance.now()
      const delta = currentTime - this.lastTime

      if (delta >= 1000) {
        this.fps = Math.round((this.frameCount * 1000) / delta)
        this.frameCount = 0
        this.lastTime = currentTime

        if (this.callback) {
          this.callback(this.fps)
        }

        // Log warning if FPS drops below 30
        if (this.fps < 30) {
          console.warn(`[Performance] Low FPS detected: ${this.fps}`)
        }
      }

      this.animationId = requestAnimationFrame(measure)
    }

    measure()
  }

  stop() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }

  getFPS() {
    return this.fps
  }
}

/**
 * Batch DOM updates for better performance
 */
export class DOMBatcher {
  private reads: (() => void)[] = []
  private writes: (() => void)[] = []
  private scheduled = false

  read(fn: () => void) {
    this.reads.push(fn)
    this.schedule()
  }

  write(fn: () => void) {
    this.writes.push(fn)
    this.schedule()
  }

  private schedule() {
    if (this.scheduled) return

    this.scheduled = true
    requestAnimationFrame(() => {
      this.flush()
    })
  }

  private flush() {
    const reads = this.reads.slice()
    const writes = this.writes.slice()

    this.reads.length = 0
    this.writes.length = 0
    this.scheduled = false

    // Execute all reads first
    reads.forEach(fn => fn())

    // Then execute all writes
    writes.forEach(fn => fn())
  }
}

// Singleton instances
export const willChangeManager = new WillChangeManager()
export const domBatcher = new DOMBatcher()

// Export FPS monitor for development
export const fpsMonitor = process.env.NODE_ENV === 'development'
  ? new FPSMonitor((fps) => {
      // Could update a debug UI element here
      const debugElement = document.getElementById('fps-debug')
      if (debugElement) {
        debugElement.textContent = `FPS: ${fps}`
      }
    })
  : null
