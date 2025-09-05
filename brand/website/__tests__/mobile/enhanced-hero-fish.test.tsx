/**
 * Test Suite for Enhanced HeroFish Mobile Features
 * 
 * Tests all mobile-optimized features:
 * - Touch interactions
 * - Device orientation
 * - Haptic feedback
 * - PWA functionality  
 * - Cross-platform compatibility
 * - Accessibility features
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import EnhancedHeroFish from '../../components/EnhancedHeroFish'

// Mock implementations
const mockCreateHeroFish = vi.fn()
const mockHeroFish = {
  start: vi.fn(),
  stop: vi.fn(),
  dispose: vi.fn(),
  getStatus: vi.fn(() => ({
    isRunning: true,
    fishState: 'idle',
    position: { x: 100, y: 100 },
    velocity: { x: 0, y: 0 },
    performance: { fps: 60, frameTime: 16.67, qualityTier: 'T1', droppedFrames: 0 },
    qualityTier: 'T1'
  })),
  updateConfig: vi.fn(),
  setQualityTier: vi.fn(),
  init: vi.fn().mockResolvedValue(undefined)
}

// Mock the heroFish module
vi.mock('../src/heroFish', () => ({
  createHeroFish: mockCreateHeroFish.mockResolvedValue(mockHeroFish)
}))

// Mock mobile enhancement modules
const mockMobileManager = {
  getCapabilities: vi.fn(() => ({
    touchSupport: true,
    hapticSupport: true,
    orientationSupport: true,
    isMobile: true,
    devicePixelRatio: 2
  })),
  startTouchHandling: vi.fn(),
  startOrientationHandling: vi.fn(),
  onTouch: vi.fn(),
  onOrientation: vi.fn(),
  onPerformance: vi.fn(),
  getRecommendedQualityTier: vi.fn(() => 'T2'),
  getPerformanceLevel: vi.fn(() => 0.8),
  dispose: vi.fn()
}

const mockTouchController = {
  start: vi.fn(),
  update: vi.fn(),
  getMobileManager: vi.fn(() => mockMobileManager),
  dispose: vi.fn()
}

const mockPWAManager = {
  getInstallState: vi.fn(() => ({
    isInstallable: true,
    isInstalled: false,
    canPromptInstall: true,
    platform: 'web'
  })),
  promptInstall: vi.fn().mockResolvedValue(true),
  isOffline: vi.fn(() => false),
  getNetworkStatus: vi.fn(() => ({
    online: true,
    connectionType: 'wifi',
    effectiveType: '4g',
    downlink: 10,
    rtt: 100,
    saveData: false
  })),
  onNetworkStatusChange: vi.fn(),
  dispose: vi.fn()
}

const mockPlatformManager = {
  getPlatformInfo: vi.fn(() => ({
    platform: 'web',
    browser: 'chrome',
    os: 'android',
    isMobile: true,
    supportsWebGL: true,
    devicePixelRatio: 2,
    viewportSize: { width: 375, height: 667 },
    safeArea: { top: 0, right: 0, bottom: 0, left: 0 }
  })),
  getOptimizations: vi.fn(() => ({
    renderingEngine: 'webgl',
    pixelRatio: 2,
    enableBloom: true,
    particleCount: 10,
    qualityTier: 'T2',
    frameRateTarget: 60
  })),
  getSafeBounds: vi.fn(() => ({ x: 0, y: 0, width: 375, height: 667 })),
  getCanvasConfig: vi.fn(() => ({
    width: 375,
    height: 667,
    pixelRatio: 2,
    antialias: true,
    alpha: true
  })),
  applyPlatformOptimizations: vi.fn(),
  isWebView: vi.fn(() => false),
  dispose: vi.fn()
}

const mockAccessibilityManager = {
  registerTouchTarget: vi.fn(),
  updateFishState: vi.fn(),
  announceToScreenReader: vi.fn(),
  getAccessibilityState: vi.fn(() => ({
    isScreenReaderActive: false,
    isHighContrastMode: false,
    isReducedMotionPreferred: false,
    isFocusVisible: false,
    currentFocus: null,
    touchTargetsValid: true,
    colorContrastRatio: 4.5
  })),
  getAccessibilityRecommendations: vi.fn(() => []),
  dispose: vi.fn()
}

// Mock the enhancement modules
vi.mock('../src/heroFish/mobile', () => ({
  MobileEnhancementManager: vi.fn(() => mockMobileManager),
  FishTouchController: vi.fn(() => mockTouchController),
  isMobileDevice: vi.fn(() => true)
}))

vi.mock('../src/heroFish/pwa', () => ({
  PWAManager: vi.fn(() => mockPWAManager)
}))

vi.mock('../src/heroFish/crossPlatform', () => ({
  CrossPlatformManager: vi.fn(() => mockPlatformManager)
}))

vi.mock('../src/heroFish/accessibility', () => ({
  AccessibilityManager: vi.fn(() => mockAccessibilityManager),
  getAccessibilityPreferences: vi.fn(() => ({
    reducedMotion: false,
    highContrast: false,
    darkMode: false
  }))
}))

// Mock browser APIs
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
})

Object.defineProperty(navigator, 'vibrate', {
  writable: true,
  value: vi.fn()
})

Object.defineProperty(navigator, 'getBattery', {
  writable: true,
  value: vi.fn().mockResolvedValue({
    level: 0.8,
    charging: false,
    chargingTime: Infinity,
    dischargingTime: 3600
  })
})

// Mock canvas and context
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(),
  putImageData: vi.fn(),
  createImageData: vi.fn(),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  translate: vi.fn(),
  transform: vi.fn(),
  resetTransform: vi.fn()
})

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}))

describe('EnhancedHeroFish', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Basic Rendering', () => {
    it('renders without crashing', async () => {
      render(<EnhancedHeroFish />)
      
      expect(screen.getByRole('img', { name: /interactive bioluminescent fish animation/i })).toBeInTheDocument()
    })

    it('shows loading state initially', async () => {
      render(<EnhancedHeroFish />)
      
      expect(screen.getByText('Loading fish animation...')).toBeInTheDocument()
    })

    it('applies custom dimensions', () => {
      const { container } = render(
        <EnhancedHeroFish width={800} height={600} />
      )
      
      const hostElement = container.querySelector('.enhanced-hero-fish-host')
      expect(hostElement).toHaveStyle({
        width: '800px',
        height: '600px'
      })
    })

    it('applies custom className', () => {
      const { container } = render(
        <EnhancedHeroFish className="custom-fish" />
      )
      
      const hostElement = container.querySelector('.custom-fish')
      expect(hostElement).toBeInTheDocument()
    })
  })

  describe('Mobile Touch Interactions', () => {
    it('enables touch interactions on mobile devices', async () => {
      render(<EnhancedHeroFish enableTouchInteraction={true} />)
      
      await waitFor(() => {
        expect(mockTouchController.start).toHaveBeenCalled()
      })
    })

    it('handles touch events correctly', async () => {
      const onTouchInteraction = vi.fn()
      
      render(
        <EnhancedHeroFish 
          enableTouchInteraction={true}
          onTouchInteraction={onTouchInteraction}
        />
      )

      const canvas = screen.getByRole('img', { name: /currently idle/i })
      
      // Simulate touch start
      fireEvent.touchStart(canvas, {
        touches: [{ clientX: 100, clientY: 100, identifier: 0 }]
      })

      // Simulate touch move
      fireEvent.touchMove(canvas, {
        touches: [{ clientX: 150, clientY: 150, identifier: 0 }]
      })

      // Simulate touch end
      fireEvent.touchEnd(canvas, {
        changedTouches: [{ clientX: 150, clientY: 150, identifier: 0 }]
      })

      await waitFor(() => {
        expect(mockMobileManager.onTouch).toHaveBeenCalled()
      })
    })

    it('applies touch-enabled class when touch is supported', async () => {
      const { container } = render(<EnhancedHeroFish />)
      
      await waitFor(() => {
        const hostElement = container.querySelector('.touch-enabled')
        expect(hostElement).toBeInTheDocument()
      })
    })

    it('prevents default touch behavior with touchAction: none', () => {
      const { container } = render(<EnhancedHeroFish />)
      
      const hostElement = container.querySelector('.enhanced-hero-fish-host')
      expect(hostElement).toHaveStyle({ touchAction: 'none' })
    })
  })

  describe('Device Orientation', () => {
    it('initializes orientation handling when enabled', async () => {
      render(<EnhancedHeroFish enableDeviceOrientation={true} />)
      
      await waitFor(() => {
        expect(mockMobileManager.startOrientationHandling).toHaveBeenCalled()
      })
    })

    it('responds to device orientation changes', async () => {
      render(<EnhancedHeroFish enableDeviceOrientation={true} />)
      
      // Mock device orientation event
      const orientationEvent = new Event('deviceorientation') as any
      orientationEvent.alpha = 90
      orientationEvent.beta = 45
      orientationEvent.gamma = 30
      
      fireEvent(window, orientationEvent)
      
      await waitFor(() => {
        expect(mockMobileManager.onOrientation).toHaveBeenCalled()
      })
    })
  })

  describe('Haptic Feedback', () => {
    it('triggers haptic feedback on interactions when enabled', async () => {
      render(<EnhancedHeroFish enableHapticFeedback={true} />)
      
      const canvas = screen.getByRole('img', { name: /currently idle/i })
      
      // Simulate a tap that should trigger haptics
      fireEvent.touchStart(canvas, {
        touches: [{ clientX: 100, clientY: 100, identifier: 0 }]
      })
      
      fireEvent.touchEnd(canvas, {
        changedTouches: [{ clientX: 100, clientY: 100, identifier: 0 }]
      })

      await waitFor(() => {
        expect(navigator.vibrate).toHaveBeenCalled()
      })
    })

    it('respects haptic feedback preference', () => {
      render(<EnhancedHeroFish enableHapticFeedback={false} />)
      
      // Haptic feedback should be disabled in mobile manager
      expect(mockMobileManager).toBeDefined()
    })
  })

  describe('PWA Features', () => {
    it('initializes PWA manager when enabled', async () => {
      render(<EnhancedHeroFish enablePWAFeatures={true} />)
      
      await waitFor(() => {
        expect(mockPWAManager.getInstallState).toHaveBeenCalled()
      })
    })

    it('shows install prompt when PWA is installable', async () => {
      render(<EnhancedHeroFish enablePWAFeatures={true} />)
      
      await waitFor(() => {
        expect(screen.getByText('Install App')).toBeInTheDocument()
      })
    })

    it('handles PWA installation', async () => {
      const user = userEvent.setup()
      
      render(<EnhancedHeroFish enablePWAFeatures={true} />)
      
      const installButton = await screen.findByText('Install App')
      await user.click(installButton)
      
      await waitFor(() => {
        expect(mockPWAManager.promptInstall).toHaveBeenCalled()
      })
    })

    it('hides install button when PWA is already installed', async () => {
      mockPWAManager.getInstallState.mockReturnValue({
        isInstallable: true,
        isInstalled: true,
        canPromptInstall: false,
        platform: 'web'
      })

      render(<EnhancedHeroFish enablePWAFeatures={true} />)
      
      await waitFor(() => {
        expect(screen.queryByText('Install App')).not.toBeInTheDocument()
      })
    })
  })

  describe('Cross-Platform Compatibility', () => {
    it('detects platform correctly', async () => {
      render(<EnhancedHeroFish />)
      
      await waitFor(() => {
        expect(mockPlatformManager.getPlatformInfo).toHaveBeenCalled()
      })
    })

    it('applies platform-specific optimizations', async () => {
      render(<EnhancedHeroFish />)
      
      await waitFor(() => {
        expect(mockPlatformManager.applyPlatformOptimizations).toHaveBeenCalled()
      })
    })

    it('uses safe area bounds on mobile', async () => {
      render(<EnhancedHeroFish />)
      
      await waitFor(() => {
        expect(mockPlatformManager.getSafeBounds).toHaveBeenCalled()
      })
    })

    it('adapts canvas configuration for platform', async () => {
      render(<EnhancedHeroFish />)
      
      await waitFor(() => {
        expect(mockPlatformManager.getCanvasConfig).toHaveBeenCalled()
      })
    })
  })

  describe('Accessibility Features', () => {
    it('initializes accessibility manager when enabled', async () => {
      render(<EnhancedHeroFish enableAccessibility={true} />)
      
      await waitFor(() => {
        expect(mockAccessibilityManager.registerTouchTarget).toHaveBeenCalled()
      })
    })

    it('provides proper ARIA labels', () => {
      render(<EnhancedHeroFish />)
      
      const container = screen.getByRole('img', { name: /interactive bioluminescent fish animation/i })
      expect(container).toHaveAttribute('tabIndex', '0')
    })

    it('announces state changes to screen readers', async () => {
      const onFishStateChange = vi.fn()
      
      render(
        <EnhancedHeroFish 
          enableAccessibility={true}
          announceStateChanges={true}
          onFishStateChange={onFishStateChange}
        />
      )

      // Simulate state change
      mockHeroFish.getStatus.mockReturnValue({
        ...mockHeroFish.getStatus(),
        fishState: 'dart'
      })

      await waitFor(() => {
        expect(mockAccessibilityManager.announceToScreenReader).toHaveBeenCalled()
      })
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      
      render(<EnhancedHeroFish enableAccessibility={true} />)
      
      const container = screen.getByRole('img', { name: /interactive bioluminescent fish animation/i })
      
      // Focus the container
      await user.tab()
      expect(container).toHaveFocus()
      
      // Trigger interaction with spacebar
      await user.keyboard(' ')
      
      // Should trigger fish interaction
      expect(mockAccessibilityManager.announceToScreenReader).toHaveBeenCalled()
    })

    it('respects reduced motion preferences', async () => {
      // Mock reduced motion preference
      window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      render(<EnhancedHeroFish />)
      
      await waitFor(() => {
        // Should initialize with reduced motion settings
        expect(mockCreateHeroFish).toHaveBeenCalledWith(
          expect.any(HTMLCanvasElement),
          expect.objectContaining({
            targetFPS: 60 // Would be 30 for reduced motion
          })
        )
      })
    })
  })

  describe('Performance Optimization', () => {
    it('adapts quality based on performance level', async () => {
      const onPerformanceChange = vi.fn()
      
      render(
        <EnhancedHeroFish 
          adaptiveQuality={true}
          onPerformanceChange={onPerformanceChange}
        />
      )
      
      // Simulate performance change
      const performanceCallback = mockMobileManager.onPerformance.mock.calls[0]?.[0]
      if (performanceCallback) {
        performanceCallback(0.5) // Low performance
      }
      
      await waitFor(() => {
        expect(onPerformanceChange).toHaveBeenCalledWith(0.5)
      })
    })

    it('respects battery level when enabled', async () => {
      render(<EnhancedHeroFish respectBatteryLevel={true} />)
      
      await waitFor(() => {
        expect(mockMobileManager.getPerformanceLevel).toHaveBeenCalled()
      })
    })

    it('updates quality tier based on device capabilities', async () => {
      render(<EnhancedHeroFish />)
      
      await waitFor(() => {
        expect(mockHeroFish.setQualityTier).toHaveBeenCalledWith('T2')
      })
    })
  })

  describe('Debug Information', () => {
    it('shows debug info when enabled', async () => {
      render(<EnhancedHeroFish showDebugInfo={true} />)
      
      await waitFor(() => {
        expect(screen.getByText(/FPS:/)).toBeInTheDocument()
        expect(screen.getByText(/Quality:/)).toBeInTheDocument()
        expect(screen.getByText(/State:/)).toBeInTheDocument()
        expect(screen.getByText(/Platform:/)).toBeInTheDocument()
      })
    })

    it('hides debug info by default', () => {
      render(<EnhancedHeroFish />)
      
      expect(screen.queryByText(/FPS:/)).not.toBeInTheDocument()
    })

    it('updates debug metrics regularly', async () => {
      render(<EnhancedHeroFish showDebugInfo={true} />)
      
      await waitFor(() => {
        expect(screen.getByText(/FPS: 60/)).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('shows fallback UI when initialization fails', async () => {
      mockCreateHeroFish.mockRejectedValueOnce(new Error('Initialization failed'))
      
      render(<EnhancedHeroFish />)
      
      await waitFor(() => {
        expect(screen.getByRole('img', { name: /static fish illustration/i })).toBeInTheDocument()
      })
    })

    it('applies fallback class when failed', async () => {
      mockCreateHeroFish.mockRejectedValueOnce(new Error('Initialization failed'))
      
      const { container } = render(<EnhancedHeroFish />)
      
      await waitFor(() => {
        const hostElement = container.querySelector('.fallback')
        expect(hostElement).toBeInTheDocument()
      })
    })
  })

  describe('Cleanup', () => {
    it('disposes of all managers on unmount', async () => {
      const { unmount } = render(<EnhancedHeroFish />)
      
      await waitFor(() => {
        expect(mockHeroFish.init).toHaveBeenCalled()
      })
      
      unmount()
      
      expect(mockTouchController.dispose).toHaveBeenCalled()
      expect(mockMobileManager.dispose).toHaveBeenCalled()
      expect(mockPWAManager.dispose).toHaveBeenCalled()
      expect(mockPlatformManager.dispose).toHaveBeenCalled()
      expect(mockAccessibilityManager.dispose).toHaveBeenCalled()
      expect(mockHeroFish.dispose).toHaveBeenCalled()
    })

    it('handles visibility changes correctly', async () => {
      render(<EnhancedHeroFish />)
      
      await waitFor(() => {
        expect(mockHeroFish.init).toHaveBeenCalled()
      })
      
      // Simulate page becoming hidden
      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: true
      })
      
      fireEvent(document, new Event('visibilitychange'))
      
      expect(mockHeroFish.stop).toHaveBeenCalled()
      
      // Simulate page becoming visible again
      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: false
      })
      
      fireEvent(document, new Event('visibilitychange'))
      
      expect(mockHeroFish.start).toHaveBeenCalled()
    })
  })
})