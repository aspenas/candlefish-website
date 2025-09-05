/**
 * Mobile performance optimization utilities
 * Specifically designed for iPhone Safari memory and performance constraints
 */

interface PerformanceConfig {
  maxMemoryUsage: number // in MB
  targetFPS: number
  enableGPUOptimizations: boolean
  enableMemoryMonitoring: boolean
  adaptiveQuality: boolean
}

interface DeviceCapabilities {
  isIOS: boolean
  isOldDevice: boolean
  availableMemory: number
  gpuTier: 'low' | 'medium' | 'high'
  connectionSpeed: 'slow' | 'medium' | 'fast'
  batteryLevel: number
  isLowPowerMode: boolean
}

export class MobilePerformanceOptimizer {
  private config: PerformanceConfig
  private deviceCapabilities: DeviceCapabilities
  private memoryMonitorInterval?: NodeJS.Timeout
  private performanceObserver?: PerformanceObserver
  private qualityLevel: 'minimal' | 'low' | 'medium' | 'high' = 'medium'

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = {
      maxMemoryUsage: 50, // 50MB for iOS
      targetFPS: 60,
      enableGPUOptimizations: true,
      enableMemoryMonitoring: true,
      adaptiveQuality: true,
      ...config
    }

    this.deviceCapabilities = this.detectDeviceCapabilities()
    this.initializeOptimizations()
  }

  private detectDeviceCapabilities(): DeviceCapabilities {
    const userAgent = navigator.userAgent
    const isIOS = /iPad|iPhone|iPod/.test(userAgent)
    
    // Detect older iOS devices that need more aggressive optimization
    const isOldDevice = isIOS && (
      userAgent.includes('iPhone6') ||
      userAgent.includes('iPhone7') ||
      userAgent.includes('iPhone8') ||
      userAgent.includes('iPad5') ||
      userAgent.includes('iPad6')
    )

    // Estimate available memory (iOS Safari doesn't expose this directly)
    let availableMemory = 1024 // Default assumption
    if (isIOS) {
      if (userAgent.includes('iPhone')) {
        availableMemory = isOldDevice ? 512 : 1024
      } else if (userAgent.includes('iPad')) {
        availableMemory = 2048
      }
    }

    // GPU tier estimation
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    let gpuTier: 'low' | 'medium' | 'high' = 'medium'
    
    if (gl) {
      const renderer = gl.getParameter(gl.RENDERER) || ''
      if (renderer.includes('PowerVR') || renderer.includes('Adreno 4')) {
        gpuTier = 'low'
      } else if (renderer.includes('Mali') || renderer.includes('Adreno 5')) {
        gpuTier = 'medium'
      } else {
        gpuTier = 'high'
      }
    } else {
      gpuTier = 'low'
    }

    // Connection speed estimation
    const connection = (navigator as any).connection
    let connectionSpeed: 'slow' | 'medium' | 'fast' = 'medium'
    if (connection) {
      if (connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g') {
        connectionSpeed = 'slow'
      } else if (connection.effectiveType === '3g') {
        connectionSpeed = 'medium'
      } else {
        connectionSpeed = 'fast'
      }
    }

    // Battery level (if available)
    let batteryLevel = 1
    let isLowPowerMode = false
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        batteryLevel = battery.level
        isLowPowerMode = battery.level < 0.2
      })
    }

    return {
      isIOS,
      isOldDevice,
      availableMemory,
      gpuTier,
      connectionSpeed,
      batteryLevel,
      isLowPowerMode
    }
  }

  private initializeOptimizations() {
    // Set initial quality level based on device capabilities
    this.qualityLevel = this.determineOptimalQuality()
    
    // Apply CSS optimizations
    this.applyCSSOptimizations()
    
    // Start memory monitoring if enabled
    if (this.config.enableMemoryMonitoring) {
      this.startMemoryMonitoring()
    }
    
    // Initialize performance observer
    this.initializePerformanceObserver()
    
    // Apply GPU optimizations
    if (this.config.enableGPUOptimizations) {
      this.applyGPUOptimizations()
    }
  }

  private determineOptimalQuality(): 'minimal' | 'low' | 'medium' | 'high' {
    const { isOldDevice, gpuTier, batteryLevel, isLowPowerMode } = this.deviceCapabilities
    
    if (isOldDevice || isLowPowerMode || gpuTier === 'low') {
      return 'minimal'
    } else if (batteryLevel < 0.3 || gpuTier === 'medium') {
      return 'low'
    } else if (gpuTier === 'high' && batteryLevel > 0.5) {
      return 'high'
    } else {
      return 'medium'
    }
  }

  private applyCSSOptimizations() {
    const style = document.createElement('style')
    style.id = 'mobile-performance-optimizations'
    
    const qualityStyles = {
      minimal: `
        .workshop-card {
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          background: rgba(27, 38, 59, 0.95) !important;
        }
        .workshop-animation {
          animation: none !important;
          transition: none !important;
        }
        .workshop-background {
          background: #0D1B2A !important;
          background-image: none !important;
        }
      `,
      low: `
        .workshop-card {
          backdrop-filter: blur(2px) !important;
          -webkit-backdrop-filter: blur(2px) !important;
        }
        .workshop-animation {
          animation-duration: 0.1s !important;
          transition-duration: 0.1s !important;
        }
      `,
      medium: `
        .workshop-card {
          backdrop-filter: blur(4px) !important;
          -webkit-backdrop-filter: blur(4px) !important;
        }
      `,
      high: `
        .workshop-card {
          backdrop-filter: blur(8px) !important;
          -webkit-backdrop-filter: blur(8px) !important;
        }
      `
    }

    style.textContent = `
      /* Mobile performance optimizations - Quality: ${this.qualityLevel} */
      ${qualityStyles[this.qualityLevel]}
      
      /* Memory optimization */
      * {
        will-change: auto !important;
      }
      
      .workshop-animation:hover,
      .workshop-animation:focus,
      .workshop-animation:active {
        will-change: transform, opacity;
      }
      
      /* GPU layer management */
      .workshop-card,
      .workshop-nav {
        transform: translateZ(0);
        backface-visibility: hidden;
      }
      
      /* iOS-specific memory optimizations */
      ${this.deviceCapabilities.isIOS ? `
        /* Reduce texture memory usage */
        .workshop-background {
          background-size: cover;
          background-repeat: no-repeat;
        }
        
        /* Optimize transforms for iOS */
        .workshop-card {
          -webkit-transform: translateZ(0);
        }
        
        /* Reduce complexity on older iOS devices */
        ${this.deviceCapabilities.isOldDevice ? `
          .workshop-card {
            box-shadow: none !important;
            border-radius: 4px !important;
          }
        ` : ''}
      ` : ''}
    `
    
    document.head.appendChild(style)
  }

  private startMemoryMonitoring() {
    if (!('memory' in performance)) return

    this.memoryMonitorInterval = setInterval(() => {
      const memory = (performance as any).memory
      if (!memory) return

      const usedMB = memory.usedJSHeapSize / 1024 / 1024
      const totalMB = memory.totalJSHeapSize / 1024 / 1024
      
      // If memory usage exceeds threshold, reduce quality
      if (usedMB > this.config.maxMemoryUsage) {
        this.reduceQuality()
        
        // Force garbage collection if available
        if ('gc' in window && typeof (window as any).gc === 'function') {
          (window as any).gc()
        }
        
        console.warn(`High memory usage detected: ${usedMB.toFixed(2)}MB`)
      }
      
      // Emit memory usage event
      this.emitPerformanceEvent('memory-usage', {
        used: usedMB,
        total: totalMB,
        percentage: (usedMB / totalMB) * 100
      })
    }, 5000) // Check every 5 seconds
  }

  private initializePerformanceObserver() {
    if (!('PerformanceObserver' in window)) return

    this.performanceObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        // Monitor frame rate
        if (entry.entryType === 'measure' && entry.name === 'frame') {
          const fps = 1000 / entry.duration
          if (fps < this.config.targetFPS * 0.8) {
            this.reduceQuality()
          }
        }
        
        // Monitor layout shifts (especially problematic on iOS)
        if (entry.entryType === 'layout-shift' && entry.value > 0.1) {
          console.warn(`Layout shift detected: ${entry.value}`)
        }
        
        // Monitor paint times
        if (entry.entryType === 'paint' && entry.startTime > 2000) {
          console.warn(`Slow paint detected: ${entry.name} took ${entry.startTime}ms`)
        }
      })
    })

    try {
      this.performanceObserver.observe({ entryTypes: ['paint', 'layout-shift', 'measure'] })
    } catch (e) {
      console.log('Some performance monitoring features not supported')
    }
  }

  private applyGPUOptimizations() {
    // Detect and optimize for specific GPU limitations
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl')
    
    if (!gl) {
      // Fallback to software rendering
      this.qualityLevel = 'minimal'
      return
    }
    
    // Check GPU capabilities
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE)
    const maxRenderbufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)
    
    // Reduce texture sizes for lower-end GPUs
    if (maxTextureSize < 4096 || this.deviceCapabilities.gpuTier === 'low') {
      const style = document.createElement('style')
      style.textContent = `
        /* GPU optimization for low-end devices */
        .workshop-background {
          background-size: 50% 50% !important;
        }
        
        canvas {
          max-width: 512px !important;
          max-height: 512px !important;
        }
      `
      document.head.appendChild(style)
    }
  }

  private reduceQuality() {
    const qualityLevels: Array<'minimal' | 'low' | 'medium' | 'high'> = ['high', 'medium', 'low', 'minimal']
    const currentIndex = qualityLevels.indexOf(this.qualityLevel)
    
    if (currentIndex < qualityLevels.length - 1) {
      this.qualityLevel = qualityLevels[currentIndex + 1]
      this.applyCSSOptimizations()
      
      this.emitPerformanceEvent('quality-reduced', {
        newQuality: this.qualityLevel,
        reason: 'performance'
      })
    }
  }

  private emitPerformanceEvent(type: string, data: any) {
    const event = new CustomEvent('mobile-performance', {
      detail: { type, data, timestamp: Date.now() }
    })
    window.dispatchEvent(event)
  }

  // Public API
  public getCurrentQuality() {
    return this.qualityLevel
  }

  public getDeviceCapabilities() {
    return { ...this.deviceCapabilities }
  }

  public forceQuality(quality: 'minimal' | 'low' | 'medium' | 'high') {
    this.qualityLevel = quality
    this.applyCSSOptimizations()
  }

  public cleanup() {
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval)
    }
    
    if (this.performanceObserver) {
      this.performanceObserver.disconnect()
    }
    
    document.getElementById('mobile-performance-optimizations')?.remove()
  }

  // Static helper methods
  public static isLowEndDevice(): boolean {
    const userAgent = navigator.userAgent
    const isIOS = /iPad|iPhone|iPod/.test(userAgent)
    
    if (isIOS) {
      // Detect older iOS devices
      return userAgent.includes('iPhone6') ||
             userAgent.includes('iPhone7') ||
             userAgent.includes('iPhone8') ||
             userAgent.includes('iPad5') ||
             userAgent.includes('iPad6')
    }
    
    // Android detection
    if (userAgent.includes('Android')) {
      const androidVersion = userAgent.match(/Android (\d+)/)?.[1]
      return androidVersion ? parseInt(androidVersion) < 9 : true
    }
    
    return false
  }

  public static getOptimalConfig(): PerformanceConfig {
    const isLowEnd = MobilePerformanceOptimizer.isLowEndDevice()
    
    return {
      maxMemoryUsage: isLowEnd ? 30 : 50,
      targetFPS: isLowEnd ? 30 : 60,
      enableGPUOptimizations: true,
      enableMemoryMonitoring: true,
      adaptiveQuality: true
    }
  }
}