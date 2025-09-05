'use client'

import { useEffect, useState, useCallback } from 'react'
import { MobilePerformanceOptimizer } from '@/utils/mobilePerformance'

/**
 * Comprehensive iOS compatibility component for iPhone Safari
 * Enhanced with long-term mobile optimization strategies
 * Handles viewport issues, touch interactions, and performance optimizations
 */
export function iOSCompatibility() {
  const [isIOS, setIsIOS] = useState(false)
  const [performanceOptimizer, setPerformanceOptimizer] = useState<MobilePerformanceOptimizer | null>(null)
  const [deviceInfo, setDeviceInfo] = useState<{
    model: string
    version: string
    isStandalone: boolean
    hasNotch: boolean
    tier: 'low' | 'mid' | 'high'
  } | null>(null)

  useEffect(() => {
    // Detect iOS device
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    setIsIOS(iOS)

    if (iOS) {
      // Get detailed iOS information
      const userAgent = navigator.userAgent
      const match = userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/)
      const version = match ? `${match[1]}.${match[2]}${match[3] ? `.${match[3]}` : ''}` : 'unknown'
      
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                          (window.navigator as any).standalone === true

      // Enhanced device detection for proper optimization tier
      const hasNotch = window.screen.height >= 812 && window.screen.width >= 375
      
      // Determine device tier based on model and version
      let tier: 'low' | 'mid' | 'high' = 'mid'
      const versionNumber = parseInt(version.split('.')[0] || '0')
      
      if (userAgent.includes('iPhone')) {
        // iPhone SE 1st gen, 6, 6s, 7, 8, SE 2nd gen
        if (userAgent.match(/iPhone (6|7|8|SE)/)) {
          tier = 'low'
        } 
        // iPhone X, XS, 11, 12
        else if (userAgent.match(/iPhone (X|11|12)/) || (hasNotch && versionNumber < 15)) {
          tier = 'mid'
        }
        // iPhone 13, 14, 15 and newer
        else if (userAgent.match(/iPhone (13|14|15)/) || versionNumber >= 15) {
          tier = 'high'
        }
      }

      setDeviceInfo({
        model: userAgent.includes('iPhone') ? 'iPhone' : userAgent.includes('iPad') ? 'iPad' : 'iPod',
        version,
        isStandalone,
        hasNotch,
        tier
      })
      
      // Initialize performance optimizer
      const optimizer = new MobilePerformanceOptimizer({
        maxMemoryUsage: tier === 'low' ? 30 : tier === 'mid' ? 50 : 80,
        targetFPS: tier === 'low' ? 30 : 60,
        enableGPUOptimizations: true,
        enableMemoryMonitoring: true,
        adaptiveQuality: true
      })
      setPerformanceOptimizer(optimizer)

      // Apply iOS-specific fixes with tier-based optimizations
      applyiOSFixes(hasNotch, isStandalone, tier)
    }
  }, [])

  const applyiOSFixes = (hasNotch: boolean, isStandalone: boolean, tier: 'low' | 'mid' | 'high') => {
    // 1. Fix viewport height issues
    const setIOSViewport = () => {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)
      document.documentElement.style.setProperty('--ios-vh', window.innerHeight + 'px')
      
      // Enhanced safe area handling with tier-based adjustments
      if (hasNotch) {
        const safeAreaTop = getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-top)') || '44px'
        const safeAreaBottom = getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-bottom)') || '34px'
        document.documentElement.style.setProperty('--safe-area-inset-top', safeAreaTop)
        document.documentElement.style.setProperty('--safe-area-inset-bottom', safeAreaBottom)
      }
      
      // Set device tier for CSS optimizations
      document.documentElement.setAttribute('data-device-tier', tier)
    }

    setIOSViewport()

    // 2. Handle orientation changes
    const handleOrientationChange = () => {
      // iOS needs delay after orientation change
      setTimeout(() => {
        setIOSViewport()
        // Force layout recalculation
        document.body.style.height = window.innerHeight + 'px'
        setTimeout(() => {
          document.body.style.height = ''
        }, 50)
      }, 300)
    }

    // 3. Fix scroll behavior
    const fixScrollBehavior = () => {
      // Prevent elastic scroll on iOS
      document.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          const touch = e.touches[0]
          const element = e.target as HTMLElement
          
          // Allow scrolling on scrollable elements
          if (!element.closest('.workshop-container, main, .overflow-scroll, .overflow-y-scroll')) {
            return
          }
          
          const scrollTop = element.scrollTop
          const scrollHeight = element.scrollHeight
          const height = element.offsetHeight
          const startY = touch.clientY
          
          // Prevent overscroll
          element.addEventListener('touchmove', (moveEvent) => {
            const moveTouch = moveEvent.touches[0]
            const deltaY = moveTouch.clientY - startY
            
            if ((scrollTop === 0 && deltaY > 0) || 
                (scrollTop === scrollHeight - height && deltaY < 0)) {
              moveEvent.preventDefault()
            }
          }, { passive: false })
        }
      }, { passive: true })
    }

    // 4. Optimize touch interactions
    const optimizeTouchInteractions = () => {
      const style = document.createElement('style')
      style.id = 'ios-touch-optimizations'
      style.textContent = `
        /* iOS touch optimizations */
        * {
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
        }
        
        button, a, [role="button"], .workshop-card {
          -webkit-tap-highlight-color: rgba(63, 211, 198, 0.2);
          -webkit-user-select: none;
          user-select: none;
          /* Ensure minimum touch target */
          min-height: 44px;
          min-width: 44px;
        }
        
        /* Prevent iOS zoom on form inputs */
        input, textarea, select {
          font-size: 16px !important;
          -webkit-appearance: none;
          border-radius: 8px;
        }
        
        /* Optimize scrolling */
        .workshop-container, main {
          -webkit-overflow-scrolling: touch;
          overflow-scrolling: touch;
        }
        
        /* Fix position fixed issues */
        .workshop-nav {
          position: -webkit-sticky;
          position: sticky;
          -webkit-transform: translateZ(0);
          transform: translateZ(0);
        }
        
        /* Tier-based backdrop-filter optimization */
        ${tier === 'low' ? `
          .workshop-card {
            -webkit-backdrop-filter: none !important;
            backdrop-filter: none !important;
            background: rgba(27, 38, 59, 0.95) !important;
          }
        ` : tier === 'mid' ? `
          .workshop-card {
            -webkit-backdrop-filter: blur(4px) !important;
            backdrop-filter: blur(4px) !important;
          }
        ` : `
          .workshop-card {
            -webkit-backdrop-filter: blur(8px) !important;
            backdrop-filter: blur(8px) !important;
          }
        `}
        
        /* iOS safe area support */
        @supports (padding: max(0px)) {
          .workshop-nav {
            padding-top: max(8px, env(safe-area-inset-top));
            padding-left: max(16px, env(safe-area-inset-left));
            padding-right: max(16px, env(safe-area-inset-right));
          }
          
          .workshop-grid {
            padding-left: max(24px, env(safe-area-inset-left) + 24px);
            padding-right: max(24px, env(safe-area-inset-right) + 24px);
            padding-bottom: max(32px, env(safe-area-inset-bottom) + 32px);
          }
          
          ${isStandalone ? `
            .workshop-grid {
              padding-top: calc(var(--total-nav-height, 132px) + env(safe-area-inset-top) + 16px);
            }
          ` : ''}
        }
        
        /* Tier-based performance optimizations for iOS */
        ${tier === 'low' ? `
          /* Aggressive optimizations for low-tier devices */
          .workshop-background {
            background-attachment: scroll !important;
            background-image: none !important;
            will-change: auto !important;
          }
          .workshop-animation {
            animation: none !important;
            transition: opacity 0.2s ease !important;
          }
          .workshop-lazy-content {
            contain: layout style paint;
          }
        ` : tier === 'mid' ? `
          /* Balanced optimizations for mid-tier devices */
          .workshop-background {
            background-attachment: scroll !important;
            will-change: auto;
          }
          .workshop-animation {
            will-change: auto;
            animation-duration: 0.3s !important;
          }
          .workshop-animation:hover,
          .workshop-animation:focus {
            will-change: transform, opacity;
          }
        ` : `
          /* Light optimizations for high-tier devices */
          .workshop-background {
            background-attachment: scroll !important;
            will-change: auto;
          }
          .workshop-animation {
            will-change: auto;
          }
          .workshop-animation:hover,
          .workshop-animation:focus {
            will-change: transform, opacity;
          }
        `}
        
        /* Frame rate optimization */
        @media (prefers-reduced-motion: reduce) {
          .workshop-animation {
            animation: none !important;
            transition: opacity 0.2s ease !important;
          }
        }
      `
      
      document.head.appendChild(style)
    }

    // 5. Handle iOS keyboard
    const handleIOSKeyboard = () => {
      let initialViewport = window.innerHeight
      
      const handleViewportChange = () => {
        const currentViewport = window.innerHeight
        const difference = initialViewport - currentViewport
        
        // Keyboard likely opened if viewport reduced by more than 150px
        if (difference > 150) {
          document.body.classList.add('ios-keyboard-open')
          // Adjust layout for keyboard
          document.documentElement.style.setProperty('--keyboard-height', `${difference}px`)
        } else {
          document.body.classList.remove('ios-keyboard-open')
          document.documentElement.style.setProperty('--keyboard-height', '0px')
        }
      }
      
      window.addEventListener('resize', handleViewportChange, { passive: true })
      
      // Focus/blur handlers for inputs
      document.addEventListener('focusin', (e) => {
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          setTimeout(() => {
            if (document.activeElement === target) {
              target.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
          }, 300)
        }
      })
    }

    // Apply all fixes
    fixScrollBehavior()
    optimizeTouchInteractions()
    handleIOSKeyboard()
    
    // Monitor performance and adjust quality dynamically
    const performanceMonitor = () => {
      if (!performanceOptimizer) return
      
      // Listen for quality changes
      window.addEventListener('mobile-performance', (e: CustomEvent) => {
        if (e.detail.type === 'quality-reduced') {
          console.log('Performance quality adjusted:', e.detail.data.newQuality)
          document.documentElement.setAttribute('data-quality-level', e.detail.data.newQuality)
        }
      })
    }
    
    if (performanceOptimizer) {
      performanceMonitor()
    }

    // Event listeners
    window.addEventListener('orientationchange', handleOrientationChange, { passive: true })
    window.addEventListener('resize', setIOSViewport, { passive: true })

    // Cleanup function
    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange)
      window.removeEventListener('resize', setIOSViewport)
      document.getElementById('ios-touch-optimizations')?.remove()
      performanceOptimizer?.cleanup()
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      performanceOptimizer?.cleanup()
    }
  }, [performanceOptimizer])
  
  return null
}

/**
 * Enhanced hook to get iOS device information with performance tier
 */
export function useIOSDevice() {
  const [deviceInfo, setDeviceInfo] = useState<{
    isIOS: boolean
    model: string | null
    version: string | null
    isStandalone: boolean
    hasNotch: boolean
    tier: 'low' | 'mid' | 'high'
  }>({
    isIOS: false,
    model: null,
    version: null,
    isStandalone: false,
    hasNotch: false,
    tier: 'mid'
  })

  useEffect(() => {
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    
    if (iOS) {
      const userAgent = navigator.userAgent
      const match = userAgent.match(/OS (\d+)_(\d+)_?(\d+)?/)
      const version = match ? `${match[1]}.${match[2]}${match[3] ? `.${match[3]}` : ''}` : null
      
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                          (window.navigator as any).standalone === true
      
      const hasNotch = window.screen.height >= 812 && window.screen.width >= 375
      
      // Determine device tier
      let tier: 'low' | 'mid' | 'high' = 'mid'
      const versionNumber = parseInt(version?.split('.')[0] || '0')
      
      if (userAgent.includes('iPhone')) {
        if (userAgent.match(/iPhone (6|7|8|SE)/)) {
          tier = 'low'
        } else if (userAgent.match(/iPhone (X|11|12)/) || (hasNotch && versionNumber < 15)) {
          tier = 'mid'
        } else if (userAgent.match(/iPhone (13|14|15)/) || versionNumber >= 15) {
          tier = 'high'
        }
      }

      setDeviceInfo({
        isIOS: true,
        model: userAgent.includes('iPhone') ? 'iPhone' : userAgent.includes('iPad') ? 'iPad' : 'iPod',
        version,
        isStandalone,
        hasNotch,
        tier
      })
    }
  }, [])

  return deviceInfo
}