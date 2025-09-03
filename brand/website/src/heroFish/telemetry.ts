/**
 * Performance Telemetry and Monitoring System
 * FPS sampling, quality tier management, and memory monitoring
 * for adaptive rendering performance
 */

'use strict';

import type { PerformanceMetrics, QualityTier } from './types.js';

/**
 * Performance monitoring configuration
 */
interface TelemetryConfig {
  readonly sampleSize: number;
  readonly targetFPS: number;
  readonly minFPS: number;
  readonly qualityAdjustmentThreshold: number;
  readonly memoryCheckInterval: number;
  readonly reducedMotionCheck: boolean;
}

/**
 * Quality tier thresholds and settings
 */
interface QualityTierSettings {
  readonly tier: QualityTier;
  readonly minFPS: number;
  readonly glowQuality: number;
  readonly trailLength: number;
  readonly bloomEnabled: boolean;
  readonly particleCount: number;
}

/**
 * Frame timing sample for FPS calculation
 */
interface FrameSample {
  readonly timestamp: number;
  readonly frameTime: number;
}

/**
 * Default telemetry configuration
 */
const DEFAULT_CONFIG: TelemetryConfig = {
  sampleSize: 60, // Sample 60 frames for FPS calculation
  targetFPS: 60,
  minFPS: 30,
  qualityAdjustmentThreshold: 5, // Seconds before adjusting quality
  memoryCheckInterval: 10000, // Check memory every 10 seconds
  reducedMotionCheck: true
} as const;

/**
 * Quality tier definitions from highest (T1) to lowest (T4)
 */
const QUALITY_TIERS: ReadonlyArray<QualityTierSettings> = [
  {
    tier: 'T1',
    minFPS: 55,
    glowQuality: 1.0,
    trailLength: 20,
    bloomEnabled: true,
    particleCount: 100
  },
  {
    tier: 'T2', 
    minFPS: 45,
    glowQuality: 0.8,
    trailLength: 15,
    bloomEnabled: true,
    particleCount: 60
  },
  {
    tier: 'T3',
    minFPS: 35,
    glowQuality: 0.6,
    trailLength: 10,
    bloomEnabled: false,
    particleCount: 30
  },
  {
    tier: 'T4',
    minFPS: 25,
    glowQuality: 0.4,
    trailLength: 5,
    bloomEnabled: false,
    particleCount: 10
  }
] as const;

/**
 * Performance telemetry and adaptive quality system
 */
export class PerformanceTelemetry {
  private readonly config: TelemetryConfig;
  private readonly frameSamples: FrameSample[] = [];
  private currentQualityTier: QualityTier = 'T1';
  private qualityStableTime: number = 0;
  private lastMemoryCheck: number = 0;
  private droppedFrameCount: number = 0;
  private lastFrameTime: number = 0;
  private isReducedMotion: boolean = false;
  private performanceObserver: PerformanceObserver | null = null;

  // Performance callbacks
  private onQualityChange: ((tier: QualityTier, settings: QualityTierSettings) => void) | null = null;
  private onPerformanceAlert: ((metrics: PerformanceMetrics) => void) | null = null;

  /**
   * Create new performance telemetry system
   */
  constructor(config: Partial<TelemetryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeReducedMotionCheck();
    this.initializePerformanceObserver();
  }

  /**
   * Initialize reduced motion preference checking
   */
  private initializeReducedMotionCheck(): void {
    if (!this.config.reducedMotionCheck || typeof window === 'undefined') {
      return;
    }

    // Check initial reduced motion preference
    this.updateReducedMotionState();

    // Listen for changes to reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    mediaQuery.addEventListener('change', () => {
      this.updateReducedMotionState();
    });
  }

  /**
   * Update reduced motion state
   */
  private updateReducedMotionState(): void {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.isReducedMotion = mediaQuery.matches;

    // If reduced motion is preferred, force to lowest quality tier
    if (this.isReducedMotion) {
      this.setQualityTier('T4');
    }
  }

  /**
   * Initialize Performance Observer for more detailed metrics
   */
  private initializePerformanceObserver(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          if (entry.entryType === 'measure' && entry.name === 'frame-render') {
            this.recordFrameTime(entry.duration);
          }
        }
      });

      this.performanceObserver.observe({ 
        entryTypes: ['measure'] 
      });
    } catch (error) {
      console.warn('Performance Observer initialization failed:', error);
      this.performanceObserver = null;
    }
  }

  /**
   * Record frame timing data
   */
  public recordFrame(frameTime: number): void {
    const timestamp = performance.now();
    this.recordFrameTime(frameTime);

    // Add frame sample
    this.frameSamples.push({ timestamp, frameTime });

    // Keep only recent samples
    if (this.frameSamples.length > this.config.sampleSize) {
      this.frameSamples.shift();
    }

    // Check for dropped frames
    if (frameTime > (1000 / this.config.minFPS)) {
      this.droppedFrameCount++;
    }

    // Update quality tier if needed
    this.updateQualityTier(timestamp);

    // Check memory usage periodically
    this.checkMemoryUsage(timestamp);
  }

  /**
   * Record frame time with performance marking
   */
  private recordFrameTime(frameTime: number): void {
    this.lastFrameTime = frameTime;

    // Create performance mark if Performance API is available
    if (typeof performance !== 'undefined' && performance.mark) {
      try {
        performance.mark('frame-render-start');
        performance.mark('frame-render-end');
        performance.measure('frame-render', 'frame-render-start', 'frame-render-end');
      } catch (error) {
        // Ignore performance API errors
      }
    }
  }

  /**
   * Calculate current FPS from frame samples
   */
  private calculateFPS(): number {
    if (this.frameSamples.length < 2) {
      return this.config.targetFPS; // Assume target FPS initially
    }

    const recentSamples = this.frameSamples.slice(-Math.min(30, this.frameSamples.length));
    const totalTime = recentSamples[recentSamples.length - 1].timestamp - recentSamples[0].timestamp;
    
    if (totalTime === 0) return this.config.targetFPS;

    const frameCount = recentSamples.length - 1;
    return Math.round((frameCount * 1000) / totalTime);
  }

  /**
   * Calculate average frame time
   */
  private calculateAverageFrameTime(): number {
    if (this.frameSamples.length === 0) {
      return 1000 / this.config.targetFPS;
    }

    const recentSamples = this.frameSamples.slice(-Math.min(30, this.frameSamples.length));
    const totalFrameTime = recentSamples.reduce((sum, sample) => sum + sample.frameTime, 0);
    return totalFrameTime / recentSamples.length;
  }

  /**
   * Update quality tier based on performance
   */
  private updateQualityTier(timestamp: number): void {
    if (this.isReducedMotion) {
      return; // Don't adjust quality if reduced motion is preferred
    }

    const currentFPS = this.calculateFPS();
    const currentTierSettings = this.getQualityTierSettings(this.currentQualityTier);
    
    // Check if performance is consistently poor
    if (currentFPS < currentTierSettings.minFPS) {
      this.qualityStableTime = 0; // Reset stable time
      
      // Decrease quality if possible
      const nextTierIndex = QUALITY_TIERS.findIndex(t => t.tier === this.currentQualityTier) + 1;
      if (nextTierIndex < QUALITY_TIERS.length) {
        this.setQualityTier(QUALITY_TIERS[nextTierIndex].tier);
      }
    } else if (currentFPS > (currentTierSettings.minFPS + 10)) {
      // Performance is good, potentially increase quality
      this.qualityStableTime += this.lastFrameTime;
      
      if (this.qualityStableTime > this.config.qualityAdjustmentThreshold * 1000) {
        const prevTierIndex = QUALITY_TIERS.findIndex(t => t.tier === this.currentQualityTier) - 1;
        if (prevTierIndex >= 0) {
          this.setQualityTier(QUALITY_TIERS[prevTierIndex].tier);
        }
      }
    } else {
      // Performance is stable
      this.qualityStableTime += this.lastFrameTime;
    }
  }

  /**
   * Set specific quality tier
   */
  private setQualityTier(tier: QualityTier): void {
    if (tier === this.currentQualityTier) return;

    const oldTier = this.currentQualityTier;
    this.currentQualityTier = tier;
    this.qualityStableTime = 0;

    const settings = this.getQualityTierSettings(tier);
    
    // Notify callback of quality change
    if (this.onQualityChange) {
      this.onQualityChange(tier, settings);
    }

    console.log(`Quality tier changed: ${oldTier} → ${tier} (FPS: ${this.calculateFPS()})`);
  }

  /**
   * Check memory usage and alert if high
   */
  private checkMemoryUsage(timestamp: number): void {
    if (timestamp - this.lastMemoryCheck < this.config.memoryCheckInterval) {
      return;
    }

    this.lastMemoryCheck = timestamp;

    if (typeof performance === 'undefined' || !('memory' in performance)) {
      return;
    }

    try {
      const memory = (performance as any).memory;
      const memoryUsage = memory.usedJSHeapSize / memory.totalJSHeapSize;

      // Alert if memory usage is high
      if (memoryUsage > 0.8 && this.onPerformanceAlert) {
        const metrics = this.getMetrics();
        this.onPerformanceAlert({ ...metrics, memoryUsage });
      }
    } catch (error) {
      // Ignore memory API errors
    }
  }

  /**
   * Get current performance metrics
   */
  public getMetrics(): PerformanceMetrics {
    return {
      fps: this.calculateFPS(),
      frameTime: this.calculateAverageFrameTime(),
      qualityTier: this.currentQualityTier,
      droppedFrames: this.droppedFrameCount
    };
  }

  /**
   * Get quality tier settings
   */
  public getQualityTierSettings(tier?: QualityTier): QualityTierSettings {
    const targetTier = tier ?? this.currentQualityTier;
    return QUALITY_TIERS.find(t => t.tier === targetTier) ?? QUALITY_TIERS[QUALITY_TIERS.length - 1];
  }

  /**
   * Get current quality tier
   */
  public getCurrentQualityTier(): QualityTier {
    return this.currentQualityTier;
  }

  /**
   * Check if reduced motion is preferred
   */
  public isReducedMotionPreferred(): boolean {
    return this.isReducedMotion;
  }

  /**
   * Force specific quality tier (useful for testing)
   */
  public forceQualityTier(tier: QualityTier): void {
    this.setQualityTier(tier);
  }

  /**
   * Reset telemetry data
   */
  public reset(): void {
    this.frameSamples.length = 0;
    this.droppedFrameCount = 0;
    this.qualityStableTime = 0;
    this.lastMemoryCheck = 0;
    this.currentQualityTier = this.isReducedMotion ? 'T4' : 'T1';
  }

  /**
   * Set quality change callback
   */
  public onQualityTierChange(callback: (tier: QualityTier, settings: QualityTierSettings) => void): void {
    this.onQualityChange = callback;
  }

  /**
   * Set performance alert callback
   */
  public onPerformanceAlert(callback: (metrics: PerformanceMetrics) => void): void {
    this.onPerformanceAlert = callback;
  }

  /**
   * Get performance summary for debugging
   */
  public getPerformanceSummary(): string {
    const metrics = this.getMetrics();
    const settings = this.getQualityTierSettings();
    
    return [
      `Performance Summary:`,
      `  FPS: ${metrics.fps} (target: ${this.config.targetFPS})`,
      `  Frame Time: ${metrics.frameTime.toFixed(2)}ms`,
      `  Quality Tier: ${metrics.qualityTier}`,
      `  Dropped Frames: ${metrics.droppedFrames}`,
      `  Reduced Motion: ${this.isReducedMotion}`,
      `  Bloom: ${settings.bloomEnabled ? 'enabled' : 'disabled'}`,
      `  Trail Length: ${settings.trailLength}`,
      `  Glow Quality: ${(settings.glowQuality * 100).toFixed(0)}%`
    ].join('\n');
  }

  /**
   * Dispose of telemetry system
   */
  public dispose(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
      this.performanceObserver = null;
    }

    this.frameSamples.length = 0;
    this.onQualityChange = null;
    this.onPerformanceAlert = null;
  }
}

/**
 * Global telemetry instance for convenience
 */
let globalTelemetry: PerformanceTelemetry | null = null;

/**
 * Get or create global telemetry instance
 */
export function getGlobalTelemetry(): PerformanceTelemetry {
  if (!globalTelemetry) {
    globalTelemetry = new PerformanceTelemetry();
  }
  return globalTelemetry;
}

/**
 * Set new global telemetry instance
 */
export function setGlobalTelemetry(config?: Partial<TelemetryConfig>): PerformanceTelemetry {
  if (globalTelemetry) {
    globalTelemetry.dispose();
  }
  globalTelemetry = new PerformanceTelemetry(config);
  return globalTelemetry;
}

/**
 * Convenience functions using global telemetry
 */
export const recordFrame = (frameTime: number): void => getGlobalTelemetry().recordFrame(frameTime);
export const getMetrics = (): PerformanceMetrics => getGlobalTelemetry().getMetrics();
export const getCurrentQualityTier = (): QualityTier => getGlobalTelemetry().getCurrentQualityTier();
export const isReducedMotion = (): boolean => getGlobalTelemetry().isReducedMotionPreferred();