'use client'

import { useEffect, useState } from 'react'

/**
 * Comprehensive iOS compatibility component for iPhone Safari
 * Handles viewport issues, touch interactions, and performance optimizations
 */
export function iOSCompatibility() {
  const [isIOS, setIsIOS] = useState(false)
  const [deviceInfo, setDeviceInfo] = useState<{
    model: string
    version: string
    isStandalone: boolean
    hasNotch: boolean
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

      // Detect notch devices (iPhone X and newer)
      const hasNotch = window.screen.height >= 812 && window.screen.width >= 375

      setDeviceInfo({
        model: userAgent.includes('iPhone') ? 'iPhone' : userAgent.includes('iPad') ? 'iPad' : 'iPod',
        version,
        isStandalone,
        hasNotch
      })

      // Apply iOS-specific fixes
      applyiOSFixes(hasNotch, isStandalone)
    }
  }, [])

  const applyiOSFixes = (hasNotch: boolean, isStandalone: boolean) => {
    // 1. Fix viewport height issues
    const setIOSViewport = () => {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)
      document.documentElement.style.setProperty('--ios-vh', window.innerHeight + 'px')
      
      // Set safe area variables
      if (hasNotch) {
        document.documentElement.style.setProperty('--safe-area-inset-top', '44px')
        document.documentElement.style.setProperty('--safe-area-inset-bottom', '34px')
      }
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
        
        /* Reduce backdrop-filter complexity */
        .workshop-card {
          -webkit-backdrop-filter: blur(4px) !important;
          backdrop-filter: blur(4px) !important;
        }
        
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
        
        /* Performance optimizations for iOS */
        .workshop-background {
          background-attachment: scroll !important;
          will-change: auto;
        }
        
        /* Memory management */
        .workshop-animation {
          will-change: auto;
        }
        
        .workshop-animation:hover,
        .workshop-animation:focus {
          will-change: transform, opacity;
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

    // Event listeners
    window.addEventListener('orientationchange', handleOrientationChange, { passive: true })
    window.addEventListener('resize', setIOSViewport, { passive: true })

    // Cleanup function
    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange)
      window.removeEventListener('resize', setIOSViewport)
      document.getElementById('ios-touch-optimizations')?.remove()
    }
  }

  return null
}

/**
 * Hook to get iOS device information
 */
export function useIOSDevice() {
  const [deviceInfo, setDeviceInfo] = useState<{
    isIOS: boolean
    model: string | null
    version: string | null
    isStandalone: boolean
    hasNotch: boolean
  }>({
    isIOS: false,
    model: null,
    version: null,
    isStandalone: false,
    hasNotch: false
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

      setDeviceInfo({
        isIOS: true,
        model: userAgent.includes('iPhone') ? 'iPhone' : userAgent.includes('iPad') ? 'iPad' : 'iPod',
        version,
        isStandalone,
        hasNotch
      })
    }
  }, [])

  return deviceInfo
}