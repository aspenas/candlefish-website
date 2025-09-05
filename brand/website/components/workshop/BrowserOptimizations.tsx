'use client'

import { useEffect } from 'react'

/**
 * Browser-specific optimizations for workshop notes
 * Handles rendering issues across Chrome, Safari, Firefox, and mobile browsers
 */
export function BrowserOptimizations() {
  useEffect(() => {
    // Detect browser for specific optimizations
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)
    const isSafari = /Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor)
    const isFirefox = /Firefox/.test(navigator.userAgent)
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)

    // Add browser-specific classes to document
    const classList = document.documentElement.classList
    
    if (isChrome) classList.add('browser-chrome')
    if (isSafari) classList.add('browser-safari')
    if (isFirefox) classList.add('browser-firefox')
    if (isMobile) classList.add('browser-mobile')
    if (isIOS) classList.add('browser-ios')

    // Chrome-specific optimizations
    if (isChrome) {
      // Enable GPU acceleration for smoother animations
      const style = document.createElement('style')
      style.textContent = `
        .workshop-card {
          transform: translateZ(0);
          backface-visibility: hidden;
        }
        .workshop-animation {
          will-change: transform, opacity;
        }
      `
      document.head.appendChild(style)
    }

    // Safari-specific optimizations
    if (isSafari) {
      // Fix backdrop-filter rendering issues
      const style = document.createElement('style')
      style.textContent = `
        .workshop-card {
          -webkit-backdrop-filter: blur(8px);
          backdrop-filter: blur(8px);
          transform: translate3d(0, 0, 0);
        }
        .workshop-text-optimize {
          -webkit-font-smoothing: antialiased;
          -webkit-transform: translateZ(0);
        }
      `
      document.head.appendChild(style)
    }

    // Firefox-specific optimizations
    if (isFirefox) {
      const style = document.createElement('style')
      style.textContent = `
        .workshop-card {
          /* Firefox handles opacity transitions better than transform */
          transition: opacity 0.3s ease, border-color 0.3s ease !important;
        }
        .workshop-text-optimize {
          text-rendering: optimizeLegibility;
        }
      `
      document.head.appendChild(style)
    }

    // Mobile-specific optimizations
    if (isMobile) {
      const style = document.createElement('style')
      style.textContent = `
        .workshop-card {
          /* Reduce complexity on mobile for better performance */
          backdrop-filter: ${isIOS ? 'blur(4px)' : 'none'} !important;
          -webkit-backdrop-filter: ${isIOS ? 'blur(4px)' : 'none'} !important;
          background: rgba(27, 38, 59, ${isIOS ? '0.85' : '0.9'}) !important;
          /* Optimize rendering */
          will-change: auto;
        }
        .workshop-background {
          /* Fixed backgrounds cause issues on mobile */
          background-attachment: scroll !important;
        }
        .workshop-animation {
          /* Reduce animations on mobile */
          transition-duration: 0.2s !important;
        }
        .workshop-nav {
          /* Optimize nav for mobile */
          backdrop-filter: blur(${isIOS ? '6px' : '8px'}) !important;
          -webkit-backdrop-filter: blur(${isIOS ? '6px' : '8px'}) !important;
          /* Ensure proper stacking */
          z-index: 1000;
        }
        .workshop-nav-content {
          /* Ensure proper mobile navigation alignment */
          align-items: center !important;
          justify-content: space-between !important;
          min-height: var(--workshop-nav-height) !important;
        }
        /* Touch optimization */
        .workshop-card, .workshop-button, button, a {
          touch-action: manipulation;
          -webkit-tap-highlight-color: rgba(63, 211, 198, 0.2);
          /* Minimum touch target size */
          min-height: 44px;
          min-width: 44px;
        }
        /* Prevent text selection on touch */
        .workshop-nav, .workshop-status, .workshop-metric {
          -webkit-user-select: none;
          user-select: none;
        }
      `
      document.head.appendChild(style)
    }

    // iOS-specific fixes
    if (isIOS) {
      const style = document.createElement('style')
      style.textContent = `
        .workshop-container {
          /* Fix iOS viewport issues */
          min-height: 100vh;
          min-height: -webkit-fill-available;
          /* Prevent iOS bounce scrolling */
          -webkit-overflow-scrolling: touch;
          overflow-scrolling: touch;
        }
        .workshop-card {
          /* iOS Safari transform fix */
          -webkit-transform: translateZ(0);
          transform: translateZ(0);
          /* Reduce backdrop-filter complexity on iOS */
          -webkit-backdrop-filter: blur(4px) !important;
          backdrop-filter: blur(4px) !important;
        }
        input, textarea, select {
          /* Fix iOS zoom on input focus */
          font-size: 16px !important;
          /* Prevent iOS styling issues */
          -webkit-appearance: none;
          -webkit-border-radius: 0;
          border-radius: 8px;
        }
        body.ios-optimized {
          /* Prevent iOS scroll bounce */
          position: fixed;
          overflow: hidden;
          width: 100%;
          height: 100%;
        }
        .workshop-nav {
          /* Ensure navigation stays fixed on iOS */
          -webkit-transform: translateZ(0);
          transform: translateZ(0);
          position: -webkit-sticky;
          position: sticky;
        }
        .workshop-background {
          /* iOS performance fix for fixed backgrounds */
          background-attachment: scroll !important;
        }
        /* iOS safe area support */
        @supports (padding: max(0px)) {
          .workshop-nav {
            padding-left: max(16px, env(safe-area-inset-left));
            padding-right: max(16px, env(safe-area-inset-right));
          }
          .workshop-grid {
            padding-left: max(24px, env(safe-area-inset-left) + 24px);
            padding-right: max(24px, env(safe-area-inset-right) + 24px);
            padding-bottom: max(32px, env(safe-area-inset-bottom) + 32px);
          }
        }
      `
      document.head.appendChild(style)

      // Fix iOS 100vh issue with enhanced detection
      const setVH = () => {
        const vh = window.innerHeight * 0.01
        document.documentElement.style.setProperty('--vh', `${vh}px`)
        // Also set iOS-specific height
        document.documentElement.style.setProperty('--ios-vh', window.innerHeight + 'px')
      }
      
      setVH()
      // Use more robust event handling for iOS
      window.addEventListener('resize', setVH, { passive: true })
      window.addEventListener('orientationchange', () => {
        setTimeout(setVH, 100) // Delay for iOS orientation change
      }, { passive: true })
      
      // Enable iOS scroll
      setTimeout(() => {
        document.body.classList.remove('ios-optimized')
        document.body.style.position = ''
        document.body.style.overflow = ''
        document.body.style.width = ''
        document.body.style.height = ''
      }, 100)
      
      return () => {
        window.removeEventListener('resize', setVH)
        window.removeEventListener('orientationchange', setVH)
      }
    }

    // Performance monitoring and optimization
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry) => {
          // Log performance issues for debugging
          if (entry.entryType === 'paint' && entry.startTime > (isMobile ? 5000 : 3000)) {
            console.warn(`Slow paint detected: ${entry.name} took ${entry.startTime}ms`)
          }
          
          if (entry.entryType === 'layout-shift' && entry.value > (isMobile ? 0.15 : 0.1)) {
            console.warn(`Layout shift detected: ${entry.value}`)
          }
        })
      })
      
      try {
        observer.observe({ entryTypes: ['paint', 'layout-shift'] })
      } catch (e) {
        // Fallback for browsers that don't support these entry types
        console.log('Performance monitoring not fully supported')
      }
    }

    // iPhone-specific memory management
    if (isIOS) {
      let memoryCheckInterval: NodeJS.Timeout
      
      // Monitor memory usage on iOS
      if ('memory' in performance) {
        memoryCheckInterval = setInterval(() => {
          const memory = (performance as any).memory
          if (memory && memory.usedJSHeapSize > 50 * 1024 * 1024) { // 50MB threshold
            // Trigger garbage collection hints
            if ('gc' in window && typeof (window as any).gc === 'function') {
              (window as any).gc()
            }
            console.warn('High memory usage detected on iOS')
          }
        }, 10000)
      }
      
      return () => {
        if (memoryCheckInterval) clearInterval(memoryCheckInterval)
      }
    }

    // Intersection Observer polyfill check and iOS optimization
    if (!('IntersectionObserver' in window)) {
      console.warn('IntersectionObserver not supported, lazy loading disabled')
      // Remove lazy loading classes
      document.querySelectorAll('.workshop-lazy-content').forEach(el => {
        el.classList.add('workshop-in-view')
      })
    } else if (isIOS) {
      // Optimize Intersection Observer for iOS
      const originalObserve = IntersectionObserver.prototype.observe
      IntersectionObserver.prototype.observe = function(target) {
        // Throttle observations on iOS for better performance
        setTimeout(() => {
          originalObserve.call(this, target)
        }, 50)
      }
    }

    // Cleanup function
    return () => {
      // Remove added styles on unmount
      const addedStyles = document.querySelectorAll('style[data-browser-optimization]')
      addedStyles.forEach(style => style.remove())
    }
  }, [])

  return null
}

/**
 * Critical CSS loader for workshop notes
 * Preloads essential styles to prevent flash of unstyled content
 */
export function CriticalCSS() {
  useEffect(() => {
    // Preload critical workshop styles
    const criticalCSS = `
      .workshop-container { width: 100%; max-width: 100vw; overflow-x: hidden; }
      .workshop-background { background: linear-gradient(135deg, #0D1B2A 0%, #1B263B 50%, #1C1C1C 100%); min-height: 100vh; }
      .workshop-text-optimize { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; text-rendering: optimizeLegibility; }
      .workshop-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 50; background: rgba(13, 27, 42, 0.9); backdrop-filter: blur(12px); }
    `
    
    const style = document.createElement('style')
    style.textContent = criticalCSS
    style.setAttribute('data-critical-css', 'true')
    document.head.appendChild(style)
    
    return () => {
      const criticalStyles = document.querySelector('style[data-critical-css]')
      if (criticalStyles) criticalStyles.remove()
    }
  }, [])
  
  return null
}

/**
 * Accessibility enhancements for better cross-browser support
 */
export function AccessibilityEnhancements() {
  useEffect(() => {
    // Enhanced focus management
    const handleKeydown = (e: KeyboardEvent) => {
      // Tab navigation enhancements
      if (e.key === 'Tab') {
        document.body.classList.add('keyboard-navigation')
      }
    }

    const handleMousedown = () => {
      document.body.classList.remove('keyboard-navigation')
    }

    document.addEventListener('keydown', handleKeydown)
    document.addEventListener('mousedown', handleMousedown)

    // Prefers-reduced-motion enhancement
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleMotionChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        document.documentElement.style.setProperty('--workshop-duration-fast', '0.01s')
        document.documentElement.style.setProperty('--workshop-duration-normal', '0.01s')
        document.documentElement.style.setProperty('--workshop-duration-slow', '0.01s')
      }
    }
    
    mediaQuery.addEventListener('change', handleMotionChange)
    handleMotionChange(mediaQuery as any)

    return () => {
      document.removeEventListener('keydown', handleKeydown)
      document.removeEventListener('mousedown', handleMousedown)
      mediaQuery.removeEventListener('change', handleMotionChange)
    }
  }, [])

  return null
}