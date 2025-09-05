/**
 * Browser Optimization and Performance Monitoring for Bioluminescent Fish Animation
 * 
 * Provides browser-specific optimizations and performance monitoring:
 * - Browser engine detection and optimization
 * - GPU acceleration hints
 * - Memory management
 * - Frame rate optimization
 * - Resource loading strategies
 * - Compatibility shims
 */

'use strict';

import type { PerformanceMetrics, QualityTier } from './types';

/**
 * Browser engine types
 */
export type BrowserEngine = 'webkit' | 'gecko' | 'blink' | 'edge' | 'unknown';

/**
 * Browser optimization settings
 */
export interface BrowserOptimization {
  readonly engine: BrowserEngine;
  readonly version: string;
  readonly enableGPUAcceleration: boolean;
  readonly preferredCanvasType: 'canvas' | 'offscreen';
  readonly enableWorkers: boolean;
  readonly memoryManagement: 'aggressive' | 'balanced' | 'conservative';
  readonly requestAnimationFrameStrategy: 'standard' | 'throttled' | 'custom';
  readonly enableImageBitmap: boolean;
  readonly supportsWebGL2: boolean;
  readonly maxTextureSize: number;
}

/**
 * Performance monitoring data
 */
export interface BrowserPerformanceMetrics extends PerformanceMetrics {
  readonly browserEngine: BrowserEngine;
  readonly gpuTier: 'high' | 'medium' | 'low';
  readonly memoryPressure: 'low' | 'medium' | 'high';
  readonly batteryLevel?: number;
  readonly thermalState?: 'nominal' | 'fair' | 'serious' | 'critical';
  readonly networkType?: string;
  readonly hardwareConcurrency: number;
  readonly deviceMemory?: number;
  readonly isLowEndDevice: boolean;
}

/**
 * Browser-specific rendering hints
 */
export interface RenderingHints {
  readonly willChange: string[];
  readonly transform3d: boolean;
  readonly backfaceVisibility: boolean;
  readonly perspective: boolean;
  readonly gpuRasterization: boolean;
  readonly compositorWorkaround: boolean;
}

/**
 * Memory monitoring state
 */
interface MemoryState {
  heapUsed: number;
  heapTotal: number;
  heapLimit: number;
  lastGC: number;
  gcCount: number;
  pressureLevel: 'low' | 'medium' | 'high';
}

/**
 * Browser Optimization Manager
 */
export class BrowserOptimizationManager {
  private readonly optimization: BrowserOptimization;
  private readonly renderingHints: RenderingHints;
  private memoryState: MemoryState;
  private performanceObserver: PerformanceObserver | null = null;
  private gcObserver: any = null; // PerformanceObserver for GC events
  private lastFrameTime: number = 0;
  private frameTimeHistory: number[] = [];
  private memoryPressureCallbacks: Set<(pressure: 'low' | 'medium' | 'high') => void> = new Set();
  
  // Browser-specific optimizations
  private safariWorkarounds: boolean = false;
  private chromeOptimizations: boolean = false;
  private firefoxCompatibility: boolean = false;

  constructor() {
    this.optimization = this.detectBrowserOptimization();
    this.renderingHints = this.generateRenderingHints();
    this.memoryState = this.initializeMemoryState();
    
    this.setupBrowserSpecificOptimizations();
    this.initializePerformanceMonitoring();
  }

  /**
   * Detect browser engine and capabilities
   */
  private detectBrowserOptimization(): BrowserOptimization {
    const userAgent = navigator.userAgent.toLowerCase();
    const vendor = navigator.vendor?.toLowerCase() || '';
    
    let engine: BrowserEngine = 'unknown';
    let version = 'unknown';
    
    // Detect browser engine
    if (userAgent.includes('firefox')) {
      engine = 'gecko';
      const match = userAgent.match(/firefox\/(\d+)/);
      version = match ? match[1] : 'unknown';
    } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
      engine = 'webkit';
      const match = userAgent.match(/version\/(\d+)/);
      version = match ? match[1] : 'unknown';
    } else if (userAgent.includes('edge')) {
      engine = 'edge';
      const match = userAgent.match(/edg\/(\d+)/);
      version = match ? match[1] : 'unknown';
    } else if (userAgent.includes('chrome') || vendor.includes('google')) {
      engine = 'blink';
      const match = userAgent.match(/chrome\/(\d+)/);
      version = match ? match[1] : 'unknown';
    }
    
    // Detect WebGL2 support
    const supportsWebGL2 = this.detectWebGL2Support();
    
    // Detect max texture size
    const maxTextureSize = this.detectMaxTextureSize();
    
    // Determine optimization settings based on engine
    const enableGPUAcceleration = this.shouldEnableGPUAcceleration(engine);
    const preferredCanvasType = this.getPreferredCanvasType(engine);
    const memoryManagement = this.getMemoryManagementStrategy(engine);
    
    return {
      engine,
      version,
      enableGPUAcceleration,
      preferredCanvasType,
      enableWorkers: typeof Worker !== 'undefined' && engine !== 'unknown',
      memoryManagement,
      requestAnimationFrameStrategy: this.getRAFStrategy(engine),
      enableImageBitmap: typeof ImageBitmap !== 'undefined' && engine !== 'gecko', // Firefox has issues
      supportsWebGL2,
      maxTextureSize
    };
  }

  /**
   * Detect WebGL2 support
   */
  private detectWebGL2Support(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2');
      return !!gl;
    } catch (e) {
      return false;
    }
  }

  /**
   * Detect maximum texture size
   */
  private detectMaxTextureSize(): number {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return 2048; // Safe fallback
      
      return gl.getParameter(gl.MAX_TEXTURE_SIZE);
    } catch (e) {
      return 2048;
    }
  }

  /**
   * Determine if GPU acceleration should be enabled
   */
  private shouldEnableGPUAcceleration(engine: BrowserEngine): boolean {
    // Enable for modern browsers, but be cautious with older versions
    switch (engine) {
      case 'blink':
      case 'webkit':
      case 'edge':
        return true;
      case 'gecko':
        return true; // Modern Firefox handles GPU acceleration well
      default:
        return false;
    }
  }

  /**
   * Get preferred canvas type
   */
  private getPreferredCanvasType(engine: BrowserEngine): 'canvas' | 'offscreen' {
    // OffscreenCanvas support varies by browser
    if (typeof OffscreenCanvas === 'undefined') {
      return 'canvas';
    }
    
    switch (engine) {
      case 'blink': // Chrome has good OffscreenCanvas support
        return 'offscreen';
      case 'webkit': // Safari has limited support
      case 'gecko': // Firefox has some issues
      case 'edge':
      default:
        return 'canvas';
    }
  }

  /**
   * Get memory management strategy
   */
  private getMemoryManagementStrategy(engine: BrowserEngine): 'aggressive' | 'balanced' | 'conservative' {
    const deviceMemory = (navigator as any).deviceMemory || 4; // GB, fallback to 4GB
    
    if (deviceMemory >= 8) {
      return 'balanced';
    } else if (deviceMemory >= 4) {
      return engine === 'webkit' ? 'conservative' : 'balanced'; // Safari more aggressive with memory
    } else {
      return 'aggressive';
    }
  }

  /**
   * Get RequestAnimationFrame strategy
   */
  private getRAFStrategy(engine: BrowserEngine): 'standard' | 'throttled' | 'custom' {
    switch (engine) {
      case 'webkit':
        return 'custom'; // Safari benefits from custom RAF handling
      case 'gecko':
        return 'throttled'; // Firefox can benefit from throttling on some devices
      case 'blink':
      case 'edge':
      default:
        return 'standard';
    }
  }

  /**
   * Generate rendering hints for CSS
   */
  private generateRenderingHints(): RenderingHints {
    const { engine, enableGPUAcceleration } = this.optimization;
    
    const hints: RenderingHints = {
      willChange: ['transform', 'opacity'],
      transform3d: enableGPUAcceleration,
      backfaceVisibility: true,
      perspective: enableGPUAcceleration,
      gpuRasterization: enableGPUAcceleration,
      compositorWorkaround: engine === 'webkit' // Safari compositor issues
    };
    
    // Engine-specific adjustments
    if (engine === 'gecko') {
      hints.willChange.push('contents'); // Firefox optimization
    }
    
    if (engine === 'webkit') {
      hints.willChange.push('transform-style'); // Safari 3D context
    }
    
    return hints;
  }

  /**
   * Initialize memory state monitoring
   */
  private initializeMemoryState(): MemoryState {
    const performance = window.performance as any;
    const memory = performance.memory;
    
    if (memory) {
      return {
        heapUsed: memory.usedJSHeapSize || 0,
        heapTotal: memory.totalJSHeapSize || 0,
        heapLimit: memory.jsHeapSizeLimit || 0,
        lastGC: performance.now(),
        gcCount: 0,
        pressureLevel: 'low'
      };
    }
    
    return {
      heapUsed: 0,
      heapTotal: 0,
      heapLimit: 0,
      lastGC: 0,
      gcCount: 0,
      pressureLevel: 'low'
    };
  }

  /**
   * Setup browser-specific optimizations
   */
  private setupBrowserSpecificOptimizations(): void {
    const { engine } = this.optimization;
    
    switch (engine) {
      case 'webkit':
        this.setupSafariOptimizations();
        break;
      case 'blink':
        this.setupChromeOptimizations();
        break;
      case 'gecko':
        this.setupFirefoxOptimizations();
        break;
    }
  }

  /**
   * Setup Safari-specific optimizations
   */
  private setupSafariOptimizations(): void {
    this.safariWorkarounds = true;
    
    // Safari GPU memory management
    if (typeof window !== 'undefined') {
      // Force GPU warm-up for better initial performance
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0.01)';
        ctx.fillRect(0, 0, 1, 1);
      }
    }
  }

  /**
   * Setup Chrome-specific optimizations
   */
  private setupChromeOptimizations(): void {
    this.chromeOptimizations = true;
    
    // Chrome memory management hints
    if (typeof window !== 'undefined') {
      // Enable high performance mode
      (window as any).__CHROME_HIGH_PERF__ = true;
    }
  }

  /**
   * Setup Firefox-specific optimizations
   */
  private setupFirefoxOptimizations(): void {
    this.firefoxCompatibility = true;
    
    // Firefox-specific canvas optimizations
    if (typeof window !== 'undefined') {
      // Disable image smoothing for better performance in some cases
      (window as any).__FIREFOX_CANVAS_OPTS__ = {
        willReadFrequently: true
      };
    }
  }

  /**
   * Initialize performance monitoring
   */
  private initializePerformanceMonitoring(): void {
    // Setup Performance Observer for paint timing
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        this.performanceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.entryType === 'paint') {
              console.debug(`Paint timing: ${entry.name} at ${entry.startTime}ms`);
            }
          });
        });
        
        this.performanceObserver.observe({ entryTypes: ['paint', 'measure'] });
      } catch (e) {
        console.debug('PerformanceObserver not available or failed to initialize');
      }
    }
    
    // Setup GC monitoring if available
    if (typeof PerformanceObserver !== 'undefined') {
      try {
        this.gcObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.name === 'gc') {
              this.memoryState.gcCount++;
              this.memoryState.lastGC = entry.startTime;
              this.updateMemoryPressure();
            }
          });
        });
        
        // Try to observe GC events (Chrome-specific)
        if (this.optimization.engine === 'blink') {
          this.gcObserver.observe({ entryTypes: ['measure'] });
        }
      } catch (e) {
        console.debug('GC monitoring not available');
      }
    }
  }

  /**
   * Update memory pressure assessment
   */
  private updateMemoryPressure(): void {
    const performance = window.performance as any;
    const memory = performance.memory;
    
    if (memory) {
      this.memoryState.heapUsed = memory.usedJSHeapSize;
      this.memoryState.heapTotal = memory.totalJSHeapSize;
      
      const usageRatio = this.memoryState.heapUsed / this.memoryState.heapLimit;
      
      let newPressure: 'low' | 'medium' | 'high';
      if (usageRatio > 0.85) {
        newPressure = 'high';
      } else if (usageRatio > 0.65) {
        newPressure = 'medium';
      } else {
        newPressure = 'low';
      }
      
      if (newPressure !== this.memoryState.pressureLevel) {
        this.memoryState.pressureLevel = newPressure;
        this.memoryPressureCallbacks.forEach(callback => {
          try {
            callback(newPressure);
          } catch (e) {
            console.error('Memory pressure callback error:', e);
          }
        });
      }
    }
  }

  /**
   * Get optimized RequestAnimationFrame function
   */
  public getOptimizedRAF(): (callback: FrameRequestCallback) => number {
    const { requestAnimationFrameStrategy } = this.optimization;
    
    switch (requestAnimationFrameStrategy) {
      case 'throttled':
        return this.createThrottledRAF();
      case 'custom':
        return this.createCustomRAF();
      default:
        return requestAnimationFrame.bind(window);
    }
  }

  /**
   * Create throttled RAF for performance
   */
  private createThrottledRAF(): (callback: FrameRequestCallback) => number {
    let lastTime = 0;
    const targetFPS = 45; // Slightly below 60 for headroom
    const frameInterval = 1000 / targetFPS;
    
    return (callback: FrameRequestCallback): number => {
      return requestAnimationFrame((currentTime) => {
        if (currentTime - lastTime >= frameInterval) {
          lastTime = currentTime - (currentTime % frameInterval);
          callback(currentTime);
        }
      });
    };
  }

  /**
   * Create custom RAF with Safari optimizations
   */
  private createCustomRAF(): (callback: FrameRequestCallback) => number {
    let isScheduled = false;
    let callbacks: FrameRequestCallback[] = [];
    let id = 0;
    const callbackMap = new Map<number, FrameRequestCallback>();
    
    const flush = (currentTime: number) => {
      isScheduled = false;
      const toRun = [...callbacks];
      callbacks.length = 0;
      
      toRun.forEach(callback => {
        try {
          callback(currentTime);
        } catch (e) {
          console.error('RAF callback error:', e);
        }
      });
    };
    
    return (callback: FrameRequestCallback): number => {
      const currentId = ++id;
      callbackMap.set(currentId, callback);
      callbacks.push(callback);
      
      if (!isScheduled) {
        isScheduled = true;
        requestAnimationFrame(flush);
      }
      
      return currentId;
    };
  }

  /**
   * Apply CSS optimizations to an element
   */
  public applyCSSOptimizations(element: HTMLElement): void {
    const { renderingHints } = this;
    const style = element.style;
    
    // Apply will-change hints
    style.willChange = renderingHints.willChange.join(', ');
    
    // Apply GPU acceleration
    if (renderingHints.transform3d) {
      style.transform = style.transform ? 
        `${style.transform} translateZ(0)` : 
        'translateZ(0)';
    }
    
    // Apply backface visibility
    if (renderingHints.backfaceVisibility) {
      style.backfaceVisibility = 'hidden';
    }
    
    // Browser-specific optimizations
    if (this.safariWorkarounds) {
      style.webkitBackfaceVisibility = 'hidden';
      style.webkitPerspective = '1000px';
    }
    
    if (this.chromeOptimizations) {
      (style as any).imageRendering = 'pixelated';
    }
    
    if (this.firefoxCompatibility) {
      (style as any).imageRendering = 'crisp-edges';
    }
  }

  /**
   * Get browser-optimized canvas context
   */
  public getOptimizedCanvasContext(
    canvas: HTMLCanvasElement,
    type: '2d' | 'webgl' | 'webgl2'
  ): RenderingContext | null {
    const options: any = {};
    
    // Browser-specific context options
    switch (this.optimization.engine) {
      case 'webkit':
        if (type === '2d') {
          options.alpha = false; // Better performance on Safari
          options.willReadFrequently = false;
        } else {
          options.powerPreference = 'high-performance';
          options.antialias = false; // Safari GPU memory conservation
        }
        break;
        
      case 'blink':
        if (type === '2d') {
          options.alpha = true;
          options.willReadFrequently = false;
        } else {
          options.powerPreference = 'high-performance';
          options.antialias = true;
          options.preserveDrawingBuffer = false;
        }
        break;
        
      case 'gecko':
        if (type === '2d') {
          options.willReadFrequently = true; // Firefox optimization
        } else {
          options.powerPreference = 'default'; // Firefox can be sensitive
          options.antialias = true;
        }
        break;
    }
    
    try {
      return canvas.getContext(type, options);
    } catch (e) {
      console.warn(`Failed to get ${type} context with optimizations:`, e);
      return canvas.getContext(type);
    }
  }

  /**
   * Get current performance metrics
   */
  public getPerformanceMetrics(): BrowserPerformanceMetrics {
    const performance = window.performance as any;
    const memory = performance.memory;
    const timing = performance.timing;
    
    // Calculate FPS from frame time history
    const avgFrameTime = this.frameTimeHistory.length > 0 ?
      this.frameTimeHistory.reduce((a, b) => a + b) / this.frameTimeHistory.length :
      16.67; // 60fps fallback
      
    const fps = Math.min(60, Math.round(1000 / avgFrameTime));
    
    return {
      fps,
      frameTime: avgFrameTime,
      qualityTier: this.getRecommendedQualityTier(),
      droppedFrames: 0, // Would be calculated from actual frame drops
      memoryUsage: memory ? memory.usedJSHeapSize : undefined,
      browserEngine: this.optimization.engine,
      gpuTier: this.getGPUTier(),
      memoryPressure: this.memoryState.pressureLevel,
      batteryLevel: this.getBatteryLevel(),
      thermalState: this.getThermalState(),
      networkType: this.getNetworkType(),
      hardwareConcurrency: navigator.hardwareConcurrency || 4,
      deviceMemory: (navigator as any).deviceMemory,
      isLowEndDevice: this.isLowEndDevice()
    };
  }

  /**
   * Get recommended quality tier based on performance
   */
  private getRecommendedQualityTier(): QualityTier {
    const avgFrameTime = this.frameTimeHistory.length > 0 ?
      this.frameTimeHistory.reduce((a, b) => a + b) / this.frameTimeHistory.length :
      16.67;
      
    const fps = 1000 / avgFrameTime;
    const memoryPressure = this.memoryState.pressureLevel;
    const isLowEnd = this.isLowEndDevice();
    
    if (fps >= 55 && memoryPressure === 'low' && !isLowEnd) {
      return 'T1'; // High quality
    } else if (fps >= 40 && memoryPressure !== 'high') {
      return 'T2'; // Medium quality
    } else if (fps >= 25) {
      return 'T3'; // Low quality
    } else {
      return 'T4'; // Minimal quality
    }
  }

  /**
   * Estimate GPU tier
   */
  private getGPUTier(): 'high' | 'medium' | 'low' {
    // This is a simplified estimation
    if (this.optimization.supportsWebGL2 && this.optimization.maxTextureSize >= 8192) {
      return 'high';
    } else if (this.optimization.maxTextureSize >= 4096) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Get battery level if available
   */
  private getBatteryLevel(): number | undefined {
    // Battery API is deprecated/restricted in many browsers
    return undefined;
  }

  /**
   * Get thermal state if available
   */
  private getThermalState(): 'nominal' | 'fair' | 'serious' | 'critical' | undefined {
    // Not widely available
    return undefined;
  }

  /**
   * Get network type if available
   */
  private getNetworkType(): string | undefined {
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;
    return connection?.effectiveType;
  }

  /**
   * Determine if device is low-end
   */
  private isLowEndDevice(): boolean {
    const deviceMemory = (navigator as any).deviceMemory;
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;
    
    // Heuristics for low-end device detection
    if (deviceMemory && deviceMemory < 4) return true;
    if (hardwareConcurrency < 4) return true;
    if (this.optimization.maxTextureSize < 4096) return true;
    
    return false;
  }

  /**
   * Record frame timing for performance analysis
   */
  public recordFrameTime(frameTime: number): void {
    this.frameTimeHistory.push(frameTime);
    
    // Keep only recent samples
    if (this.frameTimeHistory.length > 60) {
      this.frameTimeHistory.shift();
    }
    
    // Update memory pressure periodically
    if (this.frameTimeHistory.length % 10 === 0) {
      this.updateMemoryPressure();
    }
  }

  /**
   * Force garbage collection if available (development/testing)
   */
  public forceGC(): boolean {
    if (typeof (window as any).gc === 'function') {
      (window as any).gc();
      return true;
    }
    return false;
  }

  /**
   * Subscribe to memory pressure changes
   */
  public onMemoryPressure(callback: (pressure: 'low' | 'medium' | 'high') => void): void {
    this.memoryPressureCallbacks.add(callback);
  }

  /**
   * Unsubscribe from memory pressure changes
   */
  public offMemoryPressure(callback: (pressure: 'low' | 'medium' | 'high') => void): void {
    this.memoryPressureCallbacks.delete(callback);
  }

  /**
   * Get browser optimization settings
   */
  public getOptimization(): BrowserOptimization {
    return this.optimization;
  }

  /**
   * Get rendering hints
   */
  public getRenderingHints(): RenderingHints {
    return this.renderingHints;
  }

  /**
   * Dispose of monitoring
   */
  public dispose(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }
    
    if (this.gcObserver) {
      this.gcObserver.disconnect();
      this.gcObserver = null;
    }
    
    this.memoryPressureCallbacks.clear();
    this.frameTimeHistory.length = 0;
  }
}

// Global instance
let globalBrowserOptimization: BrowserOptimizationManager | null = null;

/**
 * Get global browser optimization manager
 */
export function getBrowserOptimization(): BrowserOptimizationManager {
  if (!globalBrowserOptimization) {
    globalBrowserOptimization = new BrowserOptimizationManager();
  }
  return globalBrowserOptimization;
}

/**
 * Initialize browser optimizations for an element
 */
export function optimizeElementForBrowser(element: HTMLElement): void {
  const browserOpt = getBrowserOptimization();
  browserOpt.applyCSSOptimizations(element);
}

/**
 * Get optimized canvas context with browser-specific settings
 */
export function getOptimizedCanvas(
  canvas: HTMLCanvasElement,
  type: '2d' | 'webgl' | 'webgl2'
): RenderingContext | null {
  const browserOpt = getBrowserOptimization();
  return browserOpt.getOptimizedCanvasContext(canvas, type);
}

/**
 * Check if current browser supports advanced features
 */
export function supportsAdvancedFeatures(): boolean {
  const browserOpt = getBrowserOptimization();
  const optimization = browserOpt.getOptimization();
  
  return optimization.enableGPUAcceleration && 
         optimization.enableWorkers && 
         optimization.supportsWebGL2;
}

/**
 * Get performance-optimized RequestAnimationFrame
 */
export function getPerformanceRAF(): (callback: FrameRequestCallback) => number {
  const browserOpt = getBrowserOptimization();
  return browserOpt.getOptimizedRAF();
}

/**
 * Get current browser performance metrics
 */
export function getCurrentPerformanceMetrics(): BrowserPerformanceMetrics {
  const browserOpt = getBrowserOptimization();
  return browserOpt.getPerformanceMetrics();
}