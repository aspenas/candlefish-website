/**
 * Bioluminescent Fish Animation System - Public API
 * 
 * A comprehensive TypeScript implementation for realistic fish animation with:
 * - Noise-driven motion using simplex noise
 * - State machine (Idle/Dart/Recover) with Poisson-timed behaviors
 * - Predictive boundary steering
 * - Dynamic quality tiers (T1-T4) based on performance
 * - Advanced canvas rendering with glow, bloom, and wake trails
 * - OffscreenCanvas support for better performance
 * - Accessibility support (reduced motion)
 * - Memory-safe resource management
 * 
 * Zero external dependencies, bundle size ≤ 12KB gzipped
 */

'use strict';

import type { Vec2, FishConfig, Bounds, PerformanceMetrics, QualityTier } from './types';
import { Vec2Math, BoundsUtils, BRAND_COLORS } from './types';
import { Fish } from './fish';
import { FishRenderer } from './draw';
import { PerformanceTelemetry, getGlobalTelemetry } from './telemetry';
import { setGlobalNoise } from './noise';

/**
 * Configuration for the fish animation system
 */
export interface HeroFishConfig {
  // Canvas configuration
  readonly canvas?: HTMLCanvasElement;
  readonly bounds?: Bounds;
  readonly pixelRatio?: number;
  
  // Fish behavior
  readonly fishConfig?: Partial<FishConfig>;
  
  // Rendering options  
  readonly enableBloom?: boolean;
  readonly backgroundColor?: string;
  readonly glowRadius?: number;
  
  // Performance settings
  readonly targetFPS?: number;
  readonly enableAdaptiveQuality?: boolean;
  readonly respectReducedMotion?: boolean;
  
  // Advanced options
  readonly noiseSeed?: number;
  readonly useOffscreenCanvas?: boolean;
  readonly enableTelemetry?: boolean;
}

/**
 * Animation status information
 */
export interface AnimationStatus {
  readonly isRunning: boolean;
  readonly fishState: 'idle' | 'dart' | 'recover';
  readonly position: Vec2;
  readonly velocity: Vec2;
  readonly performance: PerformanceMetrics;
  readonly qualityTier: QualityTier;
}

/**
 * Event callback types
 */
export type StateChangeCallback = (oldState: string, newState: string) => void;
export type PerformanceCallback = (metrics: PerformanceMetrics) => void;
export type QualityChangeCallback = (tier: QualityTier) => void;

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<Omit<HeroFishConfig, 'canvas' | 'fishConfig'>> = {
  bounds: { x: 0, y: 0, width: 800, height: 600 },
  pixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
  enableBloom: true,
  backgroundColor: BRAND_COLORS.deepIndigo,
  glowRadius: 25,
  targetFPS: 60,
  enableAdaptiveQuality: true,
  respectReducedMotion: true,
  noiseSeed: Math.random() * 65536,
  useOffscreenCanvas: typeof OffscreenCanvas !== 'undefined',
  enableTelemetry: true,
  fishConfig: {}
} as const;

/**
 * Main HeroFish animation system
 * 
 * @example
 * ```typescript
 * const heroFish = new HeroFish({
 *   canvas: document.getElementById('fish-canvas') as HTMLCanvasElement,
 *   bounds: { x: 0, y: 0, width: 1200, height: 800 },
 *   enableBloom: true,
 *   respectReducedMotion: true
 * });
 * 
 * await heroFish.init();
 * heroFish.start();
 * 
 * // Later...
 * heroFish.stop();
 * heroFish.dispose();
 * ```
 */
export class HeroFish {
  private readonly config: Required<Omit<HeroFishConfig, 'canvas' | 'fishConfig'>> & { fishConfig: Partial<FishConfig> };
  private canvas: HTMLCanvasElement | OffscreenCanvas | null = null;
  private fish: Fish | null = null;
  private renderer: FishRenderer | null = null;
  private telemetry: PerformanceTelemetry | null = null;
  
  // Animation state
  private animationId: number = 0;
  private lastTime: number = 0;
  private isInitialized: boolean = false;
  private isRunning: boolean = false;
  
  // Event callbacks
  private callbacks: {
    stateChange?: StateChangeCallback;
    performance?: PerformanceCallback;
    qualityChange?: QualityChangeCallback;
  } = {};

  /**
   * Create new HeroFish animation system
   */
  constructor(config: HeroFishConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Set canvas from config
    if (config.canvas) {
      this.canvas = config.canvas;
    }
    
    // Validate configuration
    this.validateConfig();
  }

  /**
   * Validate configuration parameters
   */
  private validateConfig(): void {
    const { bounds, pixelRatio, targetFPS } = this.config;
    
    if (bounds.width <= 0 || bounds.height <= 0) {
      throw new Error('Invalid bounds: width and height must be positive');
    }
    
    if (pixelRatio <= 0) {
      throw new Error('Invalid pixelRatio: must be positive');
    }
    
    if (targetFPS <= 0 || targetFPS > 240) {
      throw new Error('Invalid targetFPS: must be between 1 and 240');
    }
  }

  /**
   * Initialize the animation system
   * Must be called before start()
   */
  public async init(canvas?: HTMLCanvasElement): Promise<void> {
    if (this.isInitialized) {
      throw new Error('HeroFish is already initialized');
    }

    // Set canvas
    if (canvas) {
      this.canvas = canvas;
    }

    if (!this.canvas) {
      throw new Error('No canvas provided for HeroFish initialization');
    }

    try {
      // Initialize noise with seed
      setGlobalNoise(this.config.noiseSeed);

      // Initialize telemetry if enabled
      if (this.config.enableTelemetry) {
        this.initializeTelemetry();
      }

      // Initialize fish
      this.initializeFish();

      // Initialize renderer
      await this.initializeRenderer();

      // Setup event listeners
      this.setupEventListeners();

      this.isInitialized = true;
      
      console.log('HeroFish initialized successfully', {
        bounds: this.config.bounds,
        qualityTier: this.telemetry?.getCurrentQualityTier() ?? 'T1',
        canvas: this.canvas.constructor.name
      });

    } catch (error) {
      this.cleanup();
      throw new Error(`Failed to initialize HeroFish: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Initialize performance telemetry
   */
  private initializeTelemetry(): void {
    this.telemetry = getGlobalTelemetry();
    
    // Setup quality change callback
    this.telemetry.onQualityTierChange((tier, settings) => {
      if (this.callbacks.qualityChange) {
        this.callbacks.qualityChange(tier);
      }
      
      console.log(`Quality tier changed to ${tier}`, settings);
    });

    // Setup performance alert callback
    this.telemetry.onPerformanceAlert((metrics) => {
      if (this.callbacks.performance) {
        this.callbacks.performance(metrics);
      }
      
      console.warn('Performance alert:', metrics);
    });
  }

  /**
   * Initialize fish animation
   */
  private initializeFish(): void {
    const fishConfig: Partial<FishConfig> = {
      bounds: this.config.bounds,
      ...this.config.fishConfig
    };

    this.fish = new Fish(fishConfig);
  }

  /**
   * Initialize renderer
   */
  private async initializeRenderer(): Promise<void> {
    if (!this.canvas) {
      throw new Error('Canvas not available for renderer initialization');
    }

    const renderConfig = {
      canvas: this.canvas,
      bounds: this.config.bounds,
      pixelRatio: this.config.pixelRatio,
      enableBloom: this.config.enableBloom,
      glowRadius: this.config.glowRadius,
      trailFadeSpeed: 2.0,
      backgroundColor: this.config.backgroundColor
    };

    this.renderer = new FishRenderer(renderConfig);
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Handle reduced motion preference changes
    if (this.config.respectReducedMotion && typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      
      const handleReducedMotionChange = () => {
        if (mediaQuery.matches && this.isRunning) {
          console.log('Reduced motion detected, pausing animation');
          this.stop();
        }
      };

      mediaQuery.addEventListener('change', handleReducedMotionChange);
      
      // Check initial state
      handleReducedMotionChange();
    }

    // Handle visibility changes
    if (typeof document !== 'undefined') {
      const handleVisibilityChange = () => {
        if (document.hidden && this.isRunning) {
          this.pause();
        } else if (!document.hidden && !this.isRunning && this.isInitialized) {
          this.resume();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
  }

  /**
   * Start the animation
   */
  public start(): void {
    if (!this.isInitialized) {
      throw new Error('HeroFish must be initialized before starting');
    }

    if (this.isRunning) {
      console.warn('HeroFish is already running');
      return;
    }

    // Check for reduced motion preference
    if (this.config.respectReducedMotion && this.telemetry?.isReducedMotionPreferred()) {
      console.log('Respecting reduced motion preference, not starting animation');
      return;
    }

    this.isRunning = true;
    this.lastTime = performance.now();
    
    // Start fish animation
    this.fish?.start();
    
    // Start render loop
    this.animate();

    console.log('HeroFish animation started');
  }

  /**
   * Stop the animation
   */
  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    // Stop animation frame
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = 0;
    }

    // Stop fish animation
    this.fish?.stop();

    console.log('HeroFish animation stopped');
  }

  /**
   * Pause animation (can be resumed)
   */
  public pause(): void {
    if (this.isRunning) {
      this.stop();
    }
  }

  /**
   * Resume paused animation
   */
  public resume(): void {
    if (!this.isRunning && this.isInitialized) {
      this.start();
    }
  }

  /**
   * Main animation loop
   */
  private animate = (): void => {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 1/30); // Cap at 30 FPS minimum
    this.lastTime = currentTime;

    // Render frame
    if (this.fish && this.renderer) {
      this.renderer.render(this.fish, deltaTime);
    }

    // Continue animation
    this.animationId = requestAnimationFrame(this.animate);
  };

  /**
   * Get current animation status
   */
  public getStatus(): AnimationStatus {
    if (!this.fish || !this.telemetry) {
      throw new Error('HeroFish not initialized');
    }

    return {
      isRunning: this.isRunning,
      fishState: this.fish.getState(),
      position: this.fish.getPosition(),
      velocity: this.fish.getVelocity(),
      performance: this.telemetry.getMetrics(),
      qualityTier: this.telemetry.getCurrentQualityTier()
    };
  }

  /**
   * Update configuration at runtime
   */
  public updateConfig(newConfig: Partial<HeroFishConfig>): void {
    Object.assign(this.config, newConfig);

    // Update fish configuration
    if (newConfig.fishConfig && this.fish) {
      this.fish.updateConfig(newConfig.fishConfig);
    }

    // Update bounds if changed
    if (newConfig.bounds && this.renderer) {
      this.renderer.resize(newConfig.bounds);
    }
  }

  /**
   * Resize animation to new bounds
   */
  public resize(bounds: Bounds): void {
    this.config.bounds = bounds;
    
    if (this.fish) {
      this.fish.updateConfig({ bounds });
    }
    
    if (this.renderer) {
      this.renderer.resize(bounds);
    }
  }

  /**
   * Force specific quality tier (for testing)
   */
  public setQualityTier(tier: QualityTier): void {
    if (this.telemetry) {
      this.telemetry.forceQualityTier(tier);
    }
  }

  /**
   * Reset animation to initial state
   */
  public reset(): void {
    const wasRunning = this.isRunning;
    
    if (wasRunning) {
      this.stop();
    }

    // Reset fish
    this.fish?.reset();
    
    // Reset telemetry
    this.telemetry?.reset();

    if (wasRunning) {
      this.start();
    }
  }

  /**
   * Get performance metrics
   */
  public getMetrics(): PerformanceMetrics | null {
    return this.telemetry?.getMetrics() ?? null;
  }

  /**
   * Get rendering statistics
   */
  public getRenderStats(): Record<string, number> {
    return this.renderer?.getStats() ?? {};
  }

  /**
   * Event listener registration
   */
  public onStateChange(callback: StateChangeCallback): void {
    this.callbacks.stateChange = callback;
  }

  public onPerformanceAlert(callback: PerformanceCallback): void {
    this.callbacks.performance = callback;
  }

  public onQualityChange(callback: QualityChangeCallback): void {
    this.callbacks.qualityChange = callback;
  }

  /**
   * Check if animation is running
   */
  public get running(): boolean {
    return this.isRunning;
  }

  /**
   * Check if system is initialized
   */
  public get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Get current canvas
   */
  public get canvasElement(): HTMLCanvasElement | OffscreenCanvas | null {
    return this.canvas;
  }

  /**
   * Clean up internal resources
   */
  private cleanup(): void {
    this.stop();
    
    this.fish?.dispose();
    this.fish = null;
    
    this.renderer?.dispose();
    this.renderer = null;
    
    this.telemetry?.dispose();
    this.telemetry = null;
    
    this.canvas = null;
    this.isInitialized = false;
  }

  /**
   * Dispose of all resources
   * Call this when the animation is no longer needed
   */
  public dispose(): void {
    this.cleanup();
    
    // Clear callbacks
    this.callbacks = {};
    
    console.log('HeroFish disposed');
  }
}

// Re-export types and utilities for convenience
export type { 
  Vec2, 
  FishConfig, 
  Bounds, 
  PerformanceMetrics, 
  QualityTier,
  FishState
} from './types';

export { 
  Vec2Math, 
  MathUtils, 
  BoundsUtils, 
  BRAND_COLORS 
} from './types';

export { 
  SimplexNoise2D,
  getGlobalNoise,
  setGlobalNoise,
  noise,
  fractalNoise,
  vectorField,
  curlNoise
} from './noise';

export {
  PerformanceTelemetry,
  getGlobalTelemetry,
  setGlobalTelemetry,
  recordFrame,
  getMetrics,
  getCurrentQualityTier,
  isReducedMotion
} from './telemetry';

/**
 * Convenience function to create and initialize HeroFish
 * @param canvas Canvas element to render to
 * @param config Optional configuration
 * @returns Initialized HeroFish instance
 */
export async function createHeroFish(
  canvas: HTMLCanvasElement, 
  config: Omit<HeroFishConfig, 'canvas'> = {}
): Promise<HeroFish> {
  const heroFish = new HeroFish({ ...config, canvas });
  await heroFish.init();
  return heroFish;
}

/**
 * Version information
 */
export const VERSION = '1.0.0';

// Set up module as default export for convenience
export default HeroFish;