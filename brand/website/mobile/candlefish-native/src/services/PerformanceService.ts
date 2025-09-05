/**
 * Performance Monitoring and Adaptive Quality Service
 * Monitors device performance and adapts animation quality accordingly
 */

import { Platform, Dimensions } from 'react-native'
import DeviceInfo from 'react-native-device-info'

export interface PerformanceMetrics {
  fps: number
  frameDrops: number
  memoryUsage: number
  cpuUsage: number
  batteryLevel: number
  thermalState: 'nominal' | 'fair' | 'serious' | 'critical'
  timestamp: number
}

export interface DeviceProfile {
  model: string
  platform: 'ios' | 'android' | 'web'
  osVersion: string
  screenDensity: number
  screenSize: { width: number; height: number }
  totalMemory: number
  isLowEndDevice: boolean
  supportedFeatures: {
    webgl: boolean
    metal: boolean
    vulkan: boolean
    highRefreshRate: boolean
  }
}

export interface QualityConfig {
  tier: 'low' | 'medium' | 'high'
  targetFPS: number
  particleCount: number
  trailLength: number
  enableBloom: boolean
  enableComplexShaders: boolean
  textureQuality: number // 0.5 - 1.0
  shadowQuality: 'none' | 'low' | 'medium' | 'high'
}

export interface PerformanceConfig {
  qualityTier: 'low' | 'medium' | 'high'
  targetFPS: number
  particleCount: number
  trailLength: number
  enableBloom: boolean
  enableComplexShaders: boolean
}

export type PerformanceCallback = (metrics: PerformanceMetrics) => void
export type QualityChangeCallback = (config: QualityConfig) => void

export class PerformanceService {
  private deviceProfile: DeviceProfile | null = null
  private currentMetrics: PerformanceMetrics
  private qualityConfig: QualityConfig
  private callbacks: Set<PerformanceCallback> = new Set()
  private qualityCallbacks: Set<QualityChangeCallback> = new Set()
  
  // Performance tracking
  private frameStartTime: number = 0
  private frameCount: number = 0
  private frameDropCount: number = 0
  private performanceHistory: number[] = []
  private readonly HISTORY_SIZE = 60 // Track last 60 measurements
  
  // Adaptive thresholds
  private readonly QUALITY_DOWN_THRESHOLD = 30 // FPS below this triggers quality reduction
  private readonly QUALITY_UP_THRESHOLD = 55   // FPS above this allows quality increase
  private readonly THERMAL_THROTTLE_THRESHOLD = 'fair'
  private readonly BATTERY_SAVE_THRESHOLD = 0.20 // Below 20% battery
  
  // Timers
  private metricsUpdateInterval: NodeJS.Timeout | null = null
  private performanceCheckInterval: NodeJS.Timeout | null = null
  
  constructor() {
    this.currentMetrics = {
      fps: 60,
      frameDrops: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      batteryLevel: 1,
      thermalState: 'nominal',
      timestamp: Date.now()
    }
    
    this.qualityConfig = {
      tier: 'high',
      targetFPS: 60,
      particleCount: 50,
      trailLength: 40,
      enableBloom: true,
      enableComplexShaders: true,
      textureQuality: 1.0,
      shadowQuality: 'high'
    }
  }
  
  /**
   * Initialize performance monitoring
   */
  async initialize(): Promise<void> {
    try {
      await this.detectDeviceProfile()
      this.adaptToDevice()
      this.startPerformanceTracking()
      
      console.log('Performance service initialized:', {
        device: this.deviceProfile?.model,
        initialQuality: this.qualityConfig.tier
      })
    } catch (error) {
      console.warn('Failed to initialize performance service:', error)
    }
  }
  
  /**
   * Detect device capabilities and profile
   */
  private async detectDeviceProfile(): Promise<void> {
    try {
      const screen = Dimensions.get('screen')
      const model = await DeviceInfo.getModel()
      const systemVersion = await DeviceInfo.getSystemVersion()
      const totalMemory = await DeviceInfo.getTotalMemory()
      const isLowRamDevice = await DeviceInfo.isLowRamDevice()
      
      this.deviceProfile = {
        model,
        platform: Platform.OS as 'ios' | 'android' | 'web',
        osVersion: systemVersion,
        screenDensity: screen.scale,
        screenSize: { width: screen.width, height: screen.height },
        totalMemory: totalMemory / (1024 * 1024 * 1024), // Convert to GB
        isLowEndDevice: isLowRamDevice || totalMemory < 2 * 1024 * 1024 * 1024, // Less than 2GB
        supportedFeatures: {
          webgl: Platform.OS !== 'web' || 'WebGLRenderingContext' in window,
          metal: Platform.OS === 'ios',
          vulkan: Platform.OS === 'android' && parseInt(systemVersion) >= 7,
          highRefreshRate: screen.scale > 2 && !isLowRamDevice
        }
      }
    } catch (error) {
      console.warn('Failed to detect device profile:', error)
      
      // Fallback profile
      const screen = Dimensions.get('screen')
      this.deviceProfile = {
        model: 'Unknown',
        platform: Platform.OS as 'ios' | 'android' | 'web',
        osVersion: 'Unknown',
        screenDensity: screen.scale,
        screenSize: { width: screen.width, height: screen.height },
        totalMemory: 4, // Assume 4GB
        isLowEndDevice: false,
        supportedFeatures: {
          webgl: true,
          metal: Platform.OS === 'ios',
          vulkan: Platform.OS === 'android',
          highRefreshRate: true
        }
      }
    }
  }
  
  /**
   * Adapt quality settings to device capabilities
   */
  private adaptToDevice(): void {
    if (!this.deviceProfile) return
    
    let targetTier: 'low' | 'medium' | 'high' = 'high'
    
    // Device-based quality selection
    if (this.deviceProfile.isLowEndDevice) {
      targetTier = 'low'
    } else if (this.deviceProfile.totalMemory < 4) {
      targetTier = 'medium'
    }
    
    // Platform-specific adjustments
    if (this.deviceProfile.platform === 'web') {
      targetTier = targetTier === 'high' ? 'medium' : targetTier
    }
    
    // Screen resolution adjustments
    const pixelCount = this.deviceProfile.screenSize.width * this.deviceProfile.screenSize.height * this.deviceProfile.screenDensity
    if (pixelCount > 4000000) { // > ~4M pixels (high res)
      targetTier = targetTier === 'high' ? 'medium' : 'low'
    }
    
    this.setQualityTier(targetTier)
    console.log(`Adapted to device: ${this.deviceProfile.model} -> ${targetTier} quality`)
  }
  
  /**
   * Start performance monitoring
   */
  private startPerformanceTracking(): void {
    // Update metrics every second
    this.metricsUpdateInterval = setInterval(() => {
      this.updateMetrics()
    }, 1000)
    
    // Check for quality adjustments every 5 seconds
    this.performanceCheckInterval = setInterval(() => {
      this.checkPerformanceAndAdapt()
    }, 5000)
  }
  
  /**
   * Update current performance metrics
   */
  private async updateMetrics(): Promise<void> {
    try {
      // Battery level
      const batteryLevel = await DeviceInfo.getBatteryLevel()
      
      // Calculate FPS from frame tracking
      const fps = this.calculateFPS()
      
      // Memory usage (approximation)
      const memoryUsage = await this.estimateMemoryUsage()
      
      // Thermal state (iOS only, approximated for Android)
      const thermalState = await this.getThermalState()
      
      this.currentMetrics = {
        fps,
        frameDrops: this.frameDropCount,
        memoryUsage,
        cpuUsage: 0, // Not directly available, would need native module
        batteryLevel: batteryLevel || 1,
        thermalState,
        timestamp: Date.now()
      }
      
      // Add to performance history
      this.performanceHistory.push(fps)
      if (this.performanceHistory.length > this.HISTORY_SIZE) {
        this.performanceHistory.shift()
      }
      
      // Notify callbacks
      this.callbacks.forEach(callback => {
        try {
          callback(this.currentMetrics)
        } catch (error) {
          console.warn('Performance callback error:', error)
        }
      })
      
    } catch (error) {
      console.warn('Failed to update performance metrics:', error)
    }
  }
  
  /**
   * Calculate FPS from frame timing
   */
  private calculateFPS(): number {
    if (this.frameCount === 0) return 60
    
    const elapsed = Date.now() - this.frameStartTime
    if (elapsed < 1000) return this.currentMetrics.fps // Not enough time elapsed
    
    const fps = Math.round((this.frameCount * 1000) / elapsed)
    
    // Reset counters
    this.frameCount = 0
    this.frameStartTime = Date.now()
    
    return Math.max(1, Math.min(120, fps)) // Clamp between 1-120 FPS
  }
  
  /**
   * Estimate memory usage
   */
  private async estimateMemoryUsage(): Promise<number> {
    try {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        // This would require a native module to get actual memory usage
        // For now, return an estimate based on quality settings
        const baseUsage = 100 // MB
        const qualityMultiplier = this.qualityConfig.tier === 'high' ? 2 : 
                                 this.qualityConfig.tier === 'medium' ? 1.5 : 1
        return baseUsage * qualityMultiplier
      }
      
      // Web estimation using performance API
      if ('memory' in performance) {
        const mem = (performance as any).memory
        return mem.usedJSHeapSize / (1024 * 1024) // Convert to MB
      }
      
      return 0
    } catch (error) {
      return 0
    }
  }
  
  /**
   * Get thermal state
   */
  private async getThermalState(): Promise<PerformanceMetrics['thermalState']> {
    try {
      // This would require a native module for accurate thermal state
      // For now, estimate based on performance degradation
      const avgFPS = this.performanceHistory.length > 0 ? 
        this.performanceHistory.reduce((sum, fps) => sum + fps, 0) / this.performanceHistory.length : 60
      
      if (avgFPS < 20) return 'critical'
      if (avgFPS < 30) return 'serious'
      if (avgFPS < 45) return 'fair'
      return 'nominal'
    } catch (error) {
      return 'nominal'
    }
  }
  
  /**
   * Check performance and adapt quality if needed
   */
  private checkPerformanceAndAdapt(): void {
    if (this.performanceHistory.length < 10) return // Need some history
    
    const avgFPS = this.performanceHistory.reduce((sum, fps) => sum + fps, 0) / this.performanceHistory.length
    const currentTier = this.qualityConfig.tier
    
    // Check if we should reduce quality
    if (avgFPS < this.QUALITY_DOWN_THRESHOLD || 
        this.currentMetrics.thermalState === 'serious' || 
        this.currentMetrics.thermalState === 'critical' ||
        this.currentMetrics.batteryLevel < this.BATTERY_SAVE_THRESHOLD) {
      
      if (currentTier === 'high') {
        this.setQualityTier('medium')
        console.log(`Quality reduced to medium (FPS: ${avgFPS.toFixed(1)})`)
      } else if (currentTier === 'medium') {
        this.setQualityTier('low')
        console.log(`Quality reduced to low (FPS: ${avgFPS.toFixed(1)})`)
      }
    }
    
    // Check if we can increase quality
    else if (avgFPS > this.QUALITY_UP_THRESHOLD && 
             this.currentMetrics.thermalState === 'nominal' &&
             this.currentMetrics.batteryLevel > this.BATTERY_SAVE_THRESHOLD + 0.1) {
      
      if (currentTier === 'low') {
        this.setQualityTier('medium')
        console.log(`Quality increased to medium (FPS: ${avgFPS.toFixed(1)})`)
      } else if (currentTier === 'medium' && !this.deviceProfile?.isLowEndDevice) {
        this.setQualityTier('high')
        console.log(`Quality increased to high (FPS: ${avgFPS.toFixed(1)})`)
      }
    }
  }
  
  /**
   * Set quality tier and update config
   */
  private setQualityTier(tier: 'low' | 'medium' | 'high'): void {
    const configs = {
      low: {
        tier: 'low' as const,
        targetFPS: 30,
        particleCount: 15,
        trailLength: 10,
        enableBloom: false,
        enableComplexShaders: false,
        textureQuality: 0.5,
        shadowQuality: 'none' as const
      },
      medium: {
        tier: 'medium' as const,
        targetFPS: 45,
        particleCount: 30,
        trailLength: 25,
        enableBloom: false,
        enableComplexShaders: true,
        textureQuality: 0.75,
        shadowQuality: 'low' as const
      },
      high: {
        tier: 'high' as const,
        targetFPS: 60,
        particleCount: 50,
        trailLength: 40,
        enableBloom: true,
        enableComplexShaders: true,
        textureQuality: 1.0,
        shadowQuality: 'high' as const
      }
    }
    
    this.qualityConfig = configs[tier]
    
    // Notify quality change callbacks
    this.qualityCallbacks.forEach(callback => {
      try {
        callback(this.qualityConfig)
      } catch (error) {
        console.warn('Quality change callback error:', error)
      }
    })
  }
  
  /**
   * Record frame timing (called by animation loop)
   */
  recordFrame(frameStartTime: number): void {
    const frameEndTime = Date.now()
    const frameDuration = frameEndTime - frameStartTime
    
    if (this.frameStartTime === 0) {
      this.frameStartTime = frameStartTime
    }
    
    this.frameCount++
    
    // Detect dropped frames (assuming 60 FPS target)
    const expectedFrameTime = 1000 / 60
    if (frameDuration > expectedFrameTime * 1.5) {
      this.frameDropCount++
    }
  }
  
  /**
   * Get optimal configuration based on current device and performance
   */
  async getOptimalConfig(): Promise<PerformanceConfig> {
    if (!this.deviceProfile) {
      await this.detectDeviceProfile()
      this.adaptToDevice()
    }
    
    return {
      qualityTier: this.qualityConfig.tier,
      targetFPS: this.qualityConfig.targetFPS,
      particleCount: this.qualityConfig.particleCount,
      trailLength: this.qualityConfig.trailLength,
      enableBloom: this.qualityConfig.enableBloom,
      enableComplexShaders: this.qualityConfig.enableComplexShaders
    }
  }
  
  /**
   * Force quality tier (for user preferences)
   */
  forceQualityTier(tier: 'low' | 'medium' | 'high'): void {
    this.setQualityTier(tier)
  }
  
  /**
   * Subscribe to performance updates
   */
  onPerformanceUpdate(callback: PerformanceCallback): () => void {
    this.callbacks.add(callback)
    
    return () => {
      this.callbacks.delete(callback)
    }
  }
  
  /**
   * Subscribe to quality changes
   */
  onQualityChange(callback: QualityChangeCallback): () => void {
    this.qualityCallbacks.add(callback)
    
    return () => {
      this.qualityCallbacks.delete(callback)
    }
  }
  
  /**
   * Get current performance metrics
   */
  getCurrentMetrics(): PerformanceMetrics {
    return { ...this.currentMetrics }
  }
  
  /**
   * Get current quality configuration
   */
  getCurrentQuality(): QualityConfig {
    return { ...this.qualityConfig }
  }
  
  /**
   * Get device profile
   */
  getDeviceProfile(): DeviceProfile | null {
    return this.deviceProfile ? { ...this.deviceProfile } : null
  }
  
  /**
   * Public method for external performance adaptation
   */
  adaptToPerformance(currentFPS: number, callback?: (newTier: string) => void): void {
    this.performanceHistory.push(currentFPS)
    if (this.performanceHistory.length > this.HISTORY_SIZE) {
      this.performanceHistory.shift()
    }
    
    const oldTier = this.qualityConfig.tier
    this.checkPerformanceAndAdapt()
    
    if (callback && oldTier !== this.qualityConfig.tier) {
      callback(this.qualityConfig.tier)
    }
  }
  
  /**
   * Enable/disable automatic quality adaptation
   */
  setAutoAdaptation(enabled: boolean): void {
    if (enabled && !this.performanceCheckInterval) {
      this.performanceCheckInterval = setInterval(() => {
        this.checkPerformanceAndAdapt()
      }, 5000)
    } else if (!enabled && this.performanceCheckInterval) {
      clearInterval(this.performanceCheckInterval)
      this.performanceCheckInterval = null
    }
  }
  
  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.metricsUpdateInterval) {
      clearInterval(this.metricsUpdateInterval)
      this.metricsUpdateInterval = null
    }
    
    if (this.performanceCheckInterval) {
      clearInterval(this.performanceCheckInterval)
      this.performanceCheckInterval = null
    }
    
    this.callbacks.clear()
    this.qualityCallbacks.clear()
    
    console.log('Performance service disposed')
  }
}

export default PerformanceService