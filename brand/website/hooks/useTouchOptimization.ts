'use client'

import { useEffect, useState } from 'react'

interface TouchOptimizationOptions {
  preventScrollBounce?: boolean
  optimizeForIOS?: boolean
  enableHapticFeedback?: boolean
  minimumTouchTarget?: number
}

/**
 * Hook for optimizing touch interactions on mobile devices, especially iPhone
 */
export function useTouchOptimization(options: TouchOptimizationOptions = {}) {
  const {
    preventScrollBounce = true,
    optimizeForIOS = true,
    enableHapticFeedback = false,
    minimumTouchTarget = 44
  } = options

  const [touchCapabilities, setTouchCapabilities] = useState({
    hasTouch: false,
    isIOS: false,
    hasHapticFeedback: false,
    maxTouchPoints: 0
  })

  useEffect(() => {
    // Detect touch capabilities
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const hasHapticFeedback = 'vibrate' in navigator
    const maxTouchPoints = navigator.maxTouchPoints || 0

    setTouchCapabilities({
      hasTouch,
      isIOS,
      hasHapticFeedback,
      maxTouchPoints
    })

    if (!hasTouch) return

    // Apply touch optimizations
    const styleSheet = document.createElement('style')
    styleSheet.id = 'touch-optimization-styles'
    styleSheet.textContent = `
      /* Touch target optimization */
      button, a, [role="button"], .touchable {
        min-height: ${minimumTouchTarget}px;
        min-width: ${minimumTouchTarget}px;
        touch-action: manipulation;
        -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
      }
      
      /* Prevent text selection on interactive elements */
      .no-select {
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
      }
      
      ${isIOS && optimizeForIOS ? `
        /* iOS-specific optimizations */
        * {
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
        }
        
        input, textarea, select {
          font-size: 16px !important; /* Prevent zoom */
        }
        
        /* Smooth scrolling for iOS */
        .smooth-scroll {
          -webkit-overflow-scrolling: touch;
          overflow-scrolling: touch;
        }
      ` : ''}
    `
    
    document.head.appendChild(styleSheet)

    // Handle scroll bounce prevention
    if (preventScrollBounce && isIOS) {
      const preventBounce = (e: TouchEvent) => {
        const target = e.target as HTMLElement
        const scrollContainer = target.closest('.workshop-container, main, [data-scroll]')
        
        if (!scrollContainer) {
          e.preventDefault()
          return
        }

        const scrollTop = scrollContainer.scrollTop
        const scrollHeight = scrollContainer.scrollHeight
        const height = scrollContainer.clientHeight
        const deltaY = e.touches[0].clientY - (e.touches[0] as any).startY

        // Prevent overscroll at top and bottom
        if ((scrollTop === 0 && deltaY > 0) || 
            (scrollTop + height >= scrollHeight && deltaY < 0)) {
          e.preventDefault()
        }
      }

      const handleTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 1) {
          (e.touches[0] as any).startY = e.touches[0].clientY
        }
      }

      document.addEventListener('touchstart', handleTouchStart, { passive: true })
      document.addEventListener('touchmove', preventBounce, { passive: false })

      return () => {
        document.removeEventListener('touchstart', handleTouchStart)
        document.removeEventListener('touchmove', preventBounce)
        document.getElementById('touch-optimization-styles')?.remove()
      }
    }

    return () => {
      document.getElementById('touch-optimization-styles')?.remove()
    }
  }, [preventScrollBounce, optimizeForIOS, enableHapticFeedback, minimumTouchTarget])

  // Haptic feedback helper
  const triggerHapticFeedback = (type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!touchCapabilities.hasHapticFeedback || !enableHapticFeedback) return

    const patterns = {
      light: [10],
      medium: [20],
      heavy: [50]
    }

    navigator.vibrate(patterns[type])
  }

  // Touch gesture helpers
  const createTouchHandler = (
    element: HTMLElement, 
    handlers: {
      onTap?: () => void
      onLongPress?: () => void
      onSwipeLeft?: () => void
      onSwipeRight?: () => void
      onSwipeUp?: () => void
      onSwipeDown?: () => void
    }
  ) => {
    let startX = 0
    let startY = 0
    let startTime = 0
    let longPressTimer: NodeJS.Timeout

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      startX = touch.clientX
      startY = touch.clientY
      startTime = Date.now()

      // Long press detection
      if (handlers.onLongPress) {
        longPressTimer = setTimeout(() => {
          triggerHapticFeedback('medium')
          handlers.onLongPress!()
        }, 500)
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      clearTimeout(longPressTimer)
      
      const touch = e.changedTouches[0]
      const endX = touch.clientX
      const endY = touch.clientY
      const endTime = Date.now()
      
      const deltaX = endX - startX
      const deltaY = endY - startY
      const deltaTime = endTime - startTime
      
      const absDeltaX = Math.abs(deltaX)
      const absDeltaY = Math.abs(deltaY)
      
      // Determine gesture type
      if (deltaTime < 300 && absDeltaX < 10 && absDeltaY < 10) {
        // Tap
        triggerHapticFeedback('light')
        handlers.onTap?.()
      } else if (absDeltaX > 50 || absDeltaY > 50) {
        // Swipe
        if (absDeltaX > absDeltaY) {
          // Horizontal swipe
          if (deltaX > 0) {
            handlers.onSwipeRight?.()
          } else {
            handlers.onSwipeLeft?.()
          }
        } else {
          // Vertical swipe
          if (deltaY > 0) {
            handlers.onSwipeDown?.()
          } else {
            handlers.onSwipeUp?.()
          }
        }
        triggerHapticFeedback('light')
      }
    }

    const handleTouchMove = () => {
      clearTimeout(longPressTimer)
    }

    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })
    element.addEventListener('touchmove', handleTouchMove, { passive: true })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchend', handleTouchEnd)
      element.removeEventListener('touchmove', handleTouchMove)
      clearTimeout(longPressTimer)
    }
  }

  return {
    touchCapabilities,
    triggerHapticFeedback,
    createTouchHandler
  }
}