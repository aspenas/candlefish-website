/**
 * Canvas Rendering System for Bioluminescent Fish
 * Advanced visual effects including glow, bloom, wake trails, and adaptive quality
 * Supports both regular and OffscreenCanvas rendering
 */

'use strict';

import type { Vec2, Bounds, QualityTier } from './types.js';
import { Vec2Math, MathUtils, BRAND_COLORS } from './types.js';
import type { Fish } from './fish.js';
import { getGlobalTelemetry } from './telemetry.js';

/**
 * Rendering configuration
 */
interface RenderConfig {
  readonly canvas: HTMLCanvasElement | OffscreenCanvas;
  readonly bounds: Bounds;
  readonly pixelRatio: number;
  readonly enableBloom: boolean;
  readonly glowRadius: number;
  readonly trailFadeSpeed: number;
  readonly backgroundColor: string;
}

/**
 * Render quality settings based on performance tier
 */
interface RenderQuality {
  readonly glowSamples: number;
  readonly bloomPasses: number;
  readonly trailSegments: number;
  readonly shadowBlur: number;
  readonly useAntialiasing: boolean;
}

/**
 * Particle system for environmental effects
 */
interface Particle {
  position: Vec2;
  velocity: Vec2;
  age: number;
  maxAge: number;
  size: number;
  brightness: number;
}

/**
 * Quality tier render settings
 */
const QUALITY_SETTINGS: Record<QualityTier, RenderQuality> = {
  T1: {
    glowSamples: 32,
    bloomPasses: 3,
    trailSegments: 20,
    shadowBlur: 15,
    useAntialiasing: true
  },
  T2: {
    glowSamples: 16,
    bloomPasses: 2,
    trailSegments: 15,
    shadowBlur: 10,
    useAntialiasing: true
  },
  T3: {
    glowSamples: 8,
    bloomPasses: 1,
    trailSegments: 10,
    shadowBlur: 5,
    useAntialiasing: false
  },
  T4: {
    glowSamples: 4,
    bloomPasses: 0,
    trailSegments: 5,
    shadowBlur: 0,
    useAntialiasing: false
  }
} as const;

/**
 * Advanced canvas renderer for bioluminescent fish
 */
export class FishRenderer {
  private readonly config: RenderConfig;
  private readonly ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  private readonly offscreenCanvas?: OffscreenCanvas;
  private readonly bloomCanvas?: HTMLCanvasElement | OffscreenCanvas;
  private readonly bloomCtx?: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  
  private currentQuality: RenderQuality;
  private particles: Particle[] = [];
  private gradientCache: Map<string, CanvasGradient> = new Map();
  private pathCache: Map<string, Path2D> = new Map();
  
  // Animation state
  private animationTime: number = 0;
  private lastRenderTime: number = 0;

  /**
   * Create new fish renderer
   */
  constructor(config: RenderConfig) {
    this.config = config;
    
    // Get rendering context
    const context = this.config.canvas.getContext('2d', {
      alpha: true,
      desynchronized: true,
      willReadFrequently: false
    });
    
    if (!context) {
      throw new Error('Unable to get 2D rendering context');
    }
    
    this.ctx = context;
    
    // Initialize bloom canvas for advanced effects
    if (this.config.enableBloom) {
      this.initializeBloomCanvas();
    }

    // Initialize quality settings
    this.currentQuality = QUALITY_SETTINGS.T1;
    
    // Setup initial canvas properties
    this.setupCanvas();
    
    // Initialize environmental particles
    this.initializeParticles();

    // Listen for quality tier changes
    const telemetry = getGlobalTelemetry();
    telemetry.onQualityTierChange((tier, settings) => {
      this.currentQuality = QUALITY_SETTINGS[tier];
      this.clearCaches();
    });
  }

  /**
   * Initialize bloom effect canvas
   */
  private initializeBloomCanvas(): void {
    if (typeof OffscreenCanvas !== 'undefined') {
      (this as any).bloomCanvas = new OffscreenCanvas(
        this.config.canvas.width, 
        this.config.canvas.height
      );
    } else {
      (this as any).bloomCanvas = document.createElement('canvas');
      this.bloomCanvas!.width = this.config.canvas.width;
      this.bloomCanvas!.height = this.config.canvas.height;
    }

    const ctx = this.bloomCanvas!.getContext('2d');
    if (ctx) {
      (this as any).bloomCtx = ctx;
    }
  }

  /**
   * Setup canvas properties
   */
  private setupCanvas(): void {
    const canvas = this.config.canvas;
    const ctx = this.ctx;

    // Set pixel ratio for high DPI displays
    const rect = this.config.bounds;
    canvas.width = rect.width * this.config.pixelRatio;
    canvas.height = rect.height * this.config.pixelRatio;
    
    if ('style' in canvas) {
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    }

    ctx.scale(this.config.pixelRatio, this.config.pixelRatio);

    // Set default rendering properties
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.imageSmoothingEnabled = this.currentQuality.useAntialiasing;
  }

  /**
   * Initialize environmental particles
   */
  private initializeParticles(): void {
    const particleCount = 20;
    const bounds = this.config.bounds;
    
    for (let i = 0; i < particleCount; i++) {
      this.particles.push({
        position: Vec2Math.create(
          MathUtils.random(bounds.x, bounds.x + bounds.width),
          MathUtils.random(bounds.y, bounds.y + bounds.height)
        ),
        velocity: Vec2Math.create(
          MathUtils.random(-0.5, 0.5),
          MathUtils.random(-0.5, 0.5)
        ),
        age: 0,
        maxAge: MathUtils.random(10, 30),
        size: MathUtils.random(0.5, 2),
        brightness: MathUtils.random(0.1, 0.3)
      });
    }
  }

  /**
   * Main render function
   */
  public render(fish: Fish, deltaTime: number): void {
    const startTime = performance.now();
    
    this.animationTime += deltaTime;
    this.updateParticles(deltaTime);
    
    // Clear canvas
    this.clearCanvas();
    
    // Render background
    this.renderBackground();
    
    // Render environmental particles
    this.renderParticles();
    
    // Render fish trail
    this.renderFishTrail(fish);
    
    // Render main fish
    this.renderFish(fish);
    
    // Apply post-processing effects
    if (this.config.enableBloom && this.currentQuality.bloomPasses > 0) {
      this.applyBloomEffect();
    }

    // Record frame time for telemetry
    const frameTime = performance.now() - startTime;
    const telemetry = getGlobalTelemetry();
    telemetry.recordFrame(frameTime);
  }

  /**
   * Clear canvas with background
   */
  private clearCanvas(): void {
    const ctx = this.ctx;
    const bounds = this.config.bounds;
    
    ctx.clearRect(bounds.x, bounds.y, bounds.width, bounds.height);
    
    // Apply background
    ctx.fillStyle = this.config.backgroundColor;
    ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
  }

  /**
   * Render atmospheric background
   */
  private renderBackground(): void {
    const ctx = this.ctx;
    const bounds = this.config.bounds;
    const time = this.animationTime;

    // Create subtle depth gradient
    const gradient = this.getOrCreateGradient('background', () => {
      const grad = ctx.createRadialGradient(
        bounds.width * 0.3, bounds.height * 0.2, 0,
        bounds.width * 0.5, bounds.height * 0.5, Math.max(bounds.width, bounds.height) * 0.8
      );
      grad.addColorStop(0, `${BRAND_COLORS.deepIndigo}08`);
      grad.addColorStop(0.6, `${BRAND_COLORS.deepIndigo}04`);
      grad.addColorStop(1, `${BRAND_COLORS.deepIndigo}01`);
      return grad;
    });

    ctx.fillStyle = gradient;
    ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);

    // Add subtle animated caustics
    if (this.currentQuality.glowSamples > 8) {
      this.renderCaustics(time);
    }
  }

  /**
   * Render underwater caustics effect
   */
  private renderCaustics(time: number): void {
    const ctx = this.ctx;
    const bounds = this.config.bounds;
    
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.05;

    const numWaves = 3;
    for (let i = 0; i < numWaves; i++) {
      const phase = time * 0.5 + (i * Math.PI * 2) / numWaves;
      const x = bounds.width * 0.5 + Math.sin(phase) * bounds.width * 0.3;
      const y = bounds.height * 0.3 + Math.cos(phase * 1.3) * bounds.height * 0.2;
      
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, 100);
      gradient.addColorStop(0, BRAND_COLORS.warmWhite);
      gradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x - 100, y - 100, 200, 200);
    }

    ctx.restore();
  }

  /**
   * Render environmental particles
   */
  private renderParticles(): void {
    const ctx = this.ctx;
    
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    
    for (const particle of this.particles) {
      const alpha = (1 - particle.age / particle.maxAge) * particle.brightness;
      if (alpha <= 0) continue;

      ctx.globalAlpha = alpha;
      ctx.fillStyle = BRAND_COLORS.warmWhite;
      
      ctx.beginPath();
      ctx.arc(particle.position.x, particle.position.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }

  /**
   * Update particle system
   */
  private updateParticles(deltaTime: number): void {
    const bounds = this.config.bounds;
    
    for (const particle of this.particles) {
      // Update position
      particle.position = Vec2Math.add(
        particle.position,
        Vec2Math.multiply(particle.velocity, deltaTime * 10)
      );
      
      // Update age
      particle.age += deltaTime;
      
      // Reset if expired or out of bounds
      if (particle.age >= particle.maxAge || 
          particle.position.x < bounds.x || particle.position.x > bounds.x + bounds.width ||
          particle.position.y < bounds.y || particle.position.y > bounds.y + bounds.height) {
        
        particle.position = Vec2Math.create(
          MathUtils.random(bounds.x, bounds.x + bounds.width),
          MathUtils.random(bounds.y, bounds.y + bounds.height)
        );
        particle.velocity = Vec2Math.create(
          MathUtils.random(-0.5, 0.5),
          MathUtils.random(-0.5, 0.5)
        );
        particle.age = 0;
        particle.maxAge = MathUtils.random(10, 30);
      }
    }
  }

  /**
   * Render fish motion trail
   */
  private renderFishTrail(fish: Fish): void {
    const trail = fish.getTrail();
    if (trail.length < 2) return;

    const ctx = this.ctx;
    const maxSegments = Math.min(trail.length, this.currentQuality.trailSegments);
    
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.lineCap = 'round';

    for (let i = 0; i < maxSegments - 1; i++) {
      const current = trail[i];
      const next = trail[i + 1];
      
      if (!current || !next) continue;

      const progress = i / maxSegments;
      const alpha = (1 - progress) * current.intensity * 0.6;
      const width = (1 - progress) * 8 * current.intensity;
      
      if (alpha <= 0.01 || width <= 0.1) continue;

      // Create trail segment gradient
      const gradient = ctx.createLinearGradient(
        current.position.x, current.position.y,
        next.position.x, next.position.y
      );
      
      gradient.addColorStop(0, `${BRAND_COLORS.amberFlame}${Math.round(alpha * 255).toString(16).padStart(2, '0')}`);
      gradient.addColorStop(1, `${BRAND_COLORS.amberFlame}${Math.round(alpha * 0.5 * 255).toString(16).padStart(2, '0')}`);
      
      ctx.strokeStyle = gradient;
      ctx.lineWidth = width;
      
      ctx.beginPath();
      ctx.moveTo(current.position.x, current.position.y);
      ctx.lineTo(next.position.x, next.position.y);
      ctx.stroke();
    }
    
    ctx.restore();
  }

  /**
   * Render main fish with glow effects
   */
  private renderFish(fish: Fish): void {
    const position = fish.getPosition();
    const heading = fish.getHeading();
    const glowIntensity = fish.getGlowIntensity();
    const state = fish.getState();
    
    this.renderFishGlow(position, heading, glowIntensity, state);
    this.renderFishBody(position, heading, glowIntensity, state);
  }

  /**
   * Render fish glow effect
   */
  private renderFishGlow(position: Vec2, heading: number, intensity: number, state: string): void {
    if (intensity <= 0 || this.currentQuality.glowSamples === 0) return;

    const ctx = this.ctx;
    const glowRadius = this.config.glowRadius * intensity;
    const samples = this.currentQuality.glowSamples;
    
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // Multi-layered glow for depth
    const layers = Math.min(3, Math.ceil(samples / 8));
    
    for (let layer = 0; layer < layers; layer++) {
      const layerRadius = glowRadius * (1 - layer * 0.3);
      const layerAlpha = intensity * (0.4 - layer * 0.1);
      
      if (layerAlpha <= 0) continue;

      const gradient = ctx.createRadialGradient(
        position.x, position.y, 0,
        position.x, position.y, layerRadius
      );
      
      const color = state === 'dart' ? BRAND_COLORS.warmWhite : BRAND_COLORS.amberFlame;
      gradient.addColorStop(0, `${color}${Math.round(layerAlpha * 255).toString(16).padStart(2, '0')}`);
      gradient.addColorStop(0.7, `${color}${Math.round(layerAlpha * 0.3 * 255).toString(16).padStart(2, '0')}`);
      gradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(
        position.x - layerRadius,
        position.y - layerRadius,
        layerRadius * 2,
        layerRadius * 2
      );
    }

    ctx.restore();
  }

  /**
   * Render fish body
   */
  private renderFishBody(position: Vec2, heading: number, intensity: number, state: string): void {
    const ctx = this.ctx;
    const size = 12 + intensity * 6;
    
    ctx.save();
    ctx.translate(position.x, position.y);
    ctx.rotate(heading);

    // Fish body shadow
    if (this.currentQuality.shadowBlur > 0) {
      ctx.shadowColor = BRAND_COLORS.deepIndigo;
      ctx.shadowBlur = this.currentQuality.shadowBlur;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
    }

    // Fish body gradient
    const bodyGradient = ctx.createLinearGradient(-size, 0, size, 0);
    const bodyColor = state === 'dart' ? BRAND_COLORS.warmWhite : BRAND_COLORS.amberFlame;
    bodyGradient.addColorStop(0, `${bodyColor}80`);
    bodyGradient.addColorStop(0.5, bodyColor);
    bodyGradient.addColorStop(1, `${bodyColor}60`);
    
    ctx.fillStyle = bodyGradient;
    
    // Draw fish shape
    ctx.beginPath();
    ctx.ellipse(0, 0, size, size * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Fish tail
    ctx.fillStyle = `${bodyColor}B0`;
    ctx.beginPath();
    ctx.moveTo(-size * 0.8, 0);
    ctx.lineTo(-size * 1.5, -size * 0.4);
    ctx.lineTo(-size * 1.8, 0);
    ctx.lineTo(-size * 1.5, size * 0.4);
    ctx.closePath();
    ctx.fill();

    // Eye highlight
    ctx.fillStyle = BRAND_COLORS.warmWhite;
    ctx.beginPath();
    ctx.arc(size * 0.3, -size * 0.1, size * 0.15, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Apply bloom post-processing effect
   */
  private applyBloomEffect(): void {
    if (!this.bloomCtx || this.currentQuality.bloomPasses === 0) return;

    const ctx = this.ctx;
    const bloomCtx = this.bloomCtx;
    const canvas = this.config.canvas;
    const bloomCanvas = this.bloomCanvas!;

    // Copy current render to bloom canvas
    bloomCtx.clearRect(0, 0, bloomCanvas.width, bloomCanvas.height);
    bloomCtx.drawImage(canvas, 0, 0);

    // Apply gaussian blur passes
    for (let pass = 0; pass < this.currentQuality.bloomPasses; pass++) {
      const blurRadius = (pass + 1) * 2;
      bloomCtx.filter = `blur(${blurRadius}px)`;
      
      const tempCanvas = bloomCanvas;
      bloomCtx.globalCompositeOperation = 'source-over';
      bloomCtx.drawImage(tempCanvas, 0, 0);
    }

    // Composite bloom back onto main canvas
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.3;
    ctx.drawImage(bloomCanvas, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
  }

  /**
   * Get or create cached gradient
   */
  private getOrCreateGradient(key: string, factory: () => CanvasGradient): CanvasGradient {
    let gradient = this.gradientCache.get(key);
    if (!gradient) {
      gradient = factory();
      this.gradientCache.set(key, gradient);
    }
    return gradient;
  }

  /**
   * Clear rendering caches
   */
  private clearCaches(): void {
    this.gradientCache.clear();
    this.pathCache.clear();
  }

  /**
   * Resize renderer
   */
  public resize(bounds: Bounds): void {
    Object.assign(this.config, { bounds });
    this.setupCanvas();
    this.clearCaches();
    
    if (this.bloomCanvas) {
      this.bloomCanvas.width = bounds.width * this.config.pixelRatio;
      this.bloomCanvas.height = bounds.height * this.config.pixelRatio;
    }
  }

  /**
   * Get rendering statistics
   */
  public getStats(): Record<string, number> {
    return {
      particleCount: this.particles.length,
      gradientCacheSize: this.gradientCache.size,
      pathCacheSize: this.pathCache.size,
      qualitySamples: this.currentQuality.glowSamples,
      bloomPasses: this.currentQuality.bloomPasses
    };
  }

  /**
   * Dispose of renderer resources
   */
  public dispose(): void {
    this.clearCaches();
    this.particles.length = 0;
  }
}