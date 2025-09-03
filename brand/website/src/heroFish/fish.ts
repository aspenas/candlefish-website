/**
 * Bioluminescent Fish Animation System
 * State machine with noise-driven motion, predictive boundary steering,
 * and Poisson-distributed dart behaviors
 */

'use strict';

import type { Vec2, FishState, FishConfig, Bounds } from './types.js';
import { Vec2Math, MathUtils, BoundsUtils } from './types.js';
import { SimplexNoise2D } from './noise.js';

/**
 * Configuration constants for fish behavior
 */
const DEFAULT_CONFIG: FishConfig = {
  bounds: { x: 0, y: 0, width: 800, height: 600 },
  idleSpeed: 30,
  dartSpeed: 200,
  dartDuration: 0.8,
  recoverDuration: 1.5,
  dartIntervalMin: 7,
  dartIntervalMax: 12,
  steeringForce: 50,
  noiseScale: 0.002,
  glowRadius: 25,
  trailLength: 20
} as const;

/**
 * Fish motion trail point for rendering wake effects
 */
interface TrailPoint {
  position: Vec2;
  age: number;
  intensity: number;
}

/**
 * Internal fish state for the animation system
 */
interface FishInternalState {
  position: Vec2;
  velocity: Vec2;
  acceleration: Vec2;
  heading: number;
  state: FishState;
  stateTime: number;
  nextDartTime: number;
  dartStartPosition: Vec2;
  dartTargetPosition: Vec2;
  trail: TrailPoint[];
  energy: number;
  glowIntensity: number;
}

/**
 * Bioluminescent Fish Animation Controller
 * Manages state transitions, motion physics, and visual effects
 */
export class Fish {
  private readonly config: FishConfig;
  private readonly noise: SimplexNoise2D;
  private readonly noiseOffsetX: number;
  private readonly noiseOffsetY: number;
  private state: FishInternalState;
  private animationId: number = 0;
  private lastTime: number = 0;
  private isActive: boolean = false;

  /**
   * Create new fish animation controller
   */
  constructor(config: Partial<FishConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.noise = new SimplexNoise2D();
    
    // Random noise offsets to avoid correlation with other fish instances
    this.noiseOffsetX = Math.random() * 1000;
    this.noiseOffsetY = Math.random() * 1000;

    // Initialize fish state
    const center = BoundsUtils.center(this.config.bounds);
    this.state = {
      position: center,
      velocity: Vec2Math.ZERO,
      acceleration: Vec2Math.ZERO,
      heading: Math.random() * Math.PI * 2,
      state: 'idle',
      stateTime: 0,
      nextDartTime: this.generateNextDartInterval(),
      dartStartPosition: center,
      dartTargetPosition: center,
      trail: [],
      energy: 1.0,
      glowIntensity: 0.6 + Math.random() * 0.4
    };
  }

  /**
   * Start the fish animation loop
   */
  public start(): void {
    if (this.isActive) return;
    
    this.isActive = true;
    this.lastTime = performance.now();
    this.animate();
  }

  /**
   * Stop the fish animation
   */
  public stop(): void {
    this.isActive = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = 0;
    }
  }

  /**
   * Main animation loop
   */
  private animate = (): void => {
    if (!this.isActive) return;

    const currentTime = performance.now();
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 1/30); // Cap at 30 FPS minimum
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.animationId = requestAnimationFrame(this.animate);
  };

  /**
   * Update fish physics and state
   */
  private update(deltaTime: number): void {
    this.updateState(deltaTime);
    this.updateMotion(deltaTime);
    this.updateTrail(deltaTime);
    this.updateVisualEffects(deltaTime);
  }

  /**
   * Update fish state machine
   */
  private updateState(deltaTime: number): void {
    this.state.stateTime += deltaTime;

    switch (this.state.state) {
      case 'idle':
        this.updateIdleState(deltaTime);
        break;
      case 'dart':
        this.updateDartState(deltaTime);
        break;
      case 'recover':
        this.updateRecoverState(deltaTime);
        break;
    }
  }

  /**
   * Update idle state behavior
   */
  private updateIdleState(deltaTime: number): void {
    // Check if it's time to dart
    if (this.state.stateTime >= this.state.nextDartTime) {
      this.transitionToDart();
      return;
    }

    // Gentle noise-driven movement
    this.applyIdleForces(deltaTime);
  }

  /**
   * Update dart state behavior
   */
  private updateDartState(deltaTime: number): void {
    if (this.state.stateTime >= this.config.dartDuration) {
      this.transitionToRecover();
      return;
    }

    // High-speed directed movement toward dart target
    this.applyDartForces(deltaTime);
  }

  /**
   * Update recovery state behavior
   */
  private updateRecoverState(deltaTime: number): void {
    if (this.state.stateTime >= this.config.recoverDuration) {
      this.transitionToIdle();
      return;
    }

    // Gradual slowdown and energy recovery
    this.applyRecoveryForces(deltaTime);
  }

  /**
   * Transition to dart state
   */
  private transitionToDart(): void {
    this.state.state = 'dart';
    this.state.stateTime = 0;
    this.state.dartStartPosition = this.state.position;
    this.state.dartTargetPosition = this.generateDartTarget();
    this.state.energy = 0.3; // Drain energy during dart
  }

  /**
   * Transition to recovery state
   */
  private transitionToRecover(): void {
    this.state.state = 'recover';
    this.state.stateTime = 0;
  }

  /**
   * Transition to idle state
   */
  private transitionToIdle(): void {
    this.state.state = 'idle';
    this.state.stateTime = 0;
    this.state.nextDartTime = this.generateNextDartInterval();
    this.state.energy = 1.0; // Full energy restored
  }

  /**
   * Generate next dart interval using Poisson distribution
   */
  private generateNextDartInterval(): number {
    const lambda = 1 / ((this.config.dartIntervalMin + this.config.dartIntervalMax) * 0.5);
    const uniform = Math.random();
    const poisson = -Math.log(1 - uniform) / lambda;
    
    return MathUtils.clamp(
      poisson, 
      this.config.dartIntervalMin, 
      this.config.dartIntervalMax
    );
  }

  /**
   * Generate dart target position within bounds
   */
  private generateDartTarget(): Vec2 {
    const margin = 50; // Keep away from edges
    const bounds = BoundsUtils.expand(this.config.bounds, -margin);
    
    return Vec2Math.create(
      MathUtils.random(bounds.x, bounds.x + bounds.width),
      MathUtils.random(bounds.y, bounds.y + bounds.height)
    );
  }

  /**
   * Apply idle motion forces using blended noise fields
   */
  private applyIdleForces(deltaTime: number): void {
    const time = performance.now() * 0.001;
    const pos = this.state.position;
    const scale = this.config.noiseScale;

    // Multi-scale noise for natural movement
    const primaryNoise = this.noise.curlNoise(
      (pos.x + this.noiseOffsetX) * scale,
      (pos.y + this.noiseOffsetY) * scale,
      1.0
    );

    const detailNoise = this.noise.curlNoise(
      (pos.x + this.noiseOffsetX) * scale * 3,
      (pos.y + this.noiseOffsetY) * scale * 3 + time * 0.5,
      0.3
    );

    // Blend noise fields
    const noiseForce = Vec2Math.add(
      Vec2Math.multiply(primaryNoise, 0.7),
      Vec2Math.multiply(detailNoise, 0.3)
    );

    // Add boundary steering
    const steeringForce = this.calculateBoundarySteeringForce();
    
    // Combine forces
    const totalForce = Vec2Math.add(
      Vec2Math.multiply(noiseForce, this.config.idleSpeed),
      steeringForce
    );

    this.state.acceleration = Vec2Math.add(this.state.acceleration, totalForce);
  }

  /**
   * Apply dart motion forces for burst movement
   */
  private applyDartForces(deltaTime: number): void {
    const progress = this.state.stateTime / this.config.dartDuration;
    const easeOut = 1 - Math.pow(1 - progress, 3); // Cubic ease-out
    
    // Direction toward dart target
    const toTarget = Vec2Math.subtract(this.state.dartTargetPosition, this.state.position);
    const targetForce = Vec2Math.multiply(
      Vec2Math.normalize(toTarget),
      this.config.dartSpeed * (1 - easeOut)
    );

    // Add some steering to avoid obstacles
    const steeringForce = Vec2Math.multiply(
      this.calculateBoundarySteeringForce(),
      0.5
    );

    this.state.acceleration = Vec2Math.add(targetForce, steeringForce);
  }

  /**
   * Apply recovery motion forces for gradual slowdown
   */
  private applyRecoveryForces(deltaTime: number): void {
    // Exponential velocity decay
    const decayRate = 2.0;
    this.state.velocity = Vec2Math.multiply(
      this.state.velocity,
      Math.exp(-decayRate * deltaTime)
    );

    // Gentle steering back to calm motion
    const steeringForce = Vec2Math.multiply(
      this.calculateBoundarySteeringForce(),
      0.3
    );

    this.state.acceleration = steeringForce;
  }

  /**
   * Calculate predictive boundary steering force
   */
  private calculateBoundarySteeringForce(): Vec2 {
    const lookAheadTime = 2.0; // Seconds to look ahead
    const futurePosition = Vec2Math.add(
      this.state.position,
      Vec2Math.multiply(this.state.velocity, lookAheadTime)
    );

    const steeringMargin = 80;
    const expandedBounds = BoundsUtils.expand(this.config.bounds, -steeringMargin);
    
    let steeringForce = Vec2Math.ZERO;

    // Calculate steering forces for each boundary
    if (futurePosition.x < expandedBounds.x) {
      const penetration = expandedBounds.x - futurePosition.x;
      steeringForce = Vec2Math.add(
        steeringForce,
        Vec2Math.create(penetration * this.config.steeringForce, 0)
      );
    }

    if (futurePosition.x > expandedBounds.x + expandedBounds.width) {
      const penetration = futurePosition.x - (expandedBounds.x + expandedBounds.width);
      steeringForce = Vec2Math.add(
        steeringForce,
        Vec2Math.create(-penetration * this.config.steeringForce, 0)
      );
    }

    if (futurePosition.y < expandedBounds.y) {
      const penetration = expandedBounds.y - futurePosition.y;
      steeringForce = Vec2Math.add(
        steeringForce,
        Vec2Math.create(0, penetration * this.config.steeringForce)
      );
    }

    if (futurePosition.y > expandedBounds.y + expandedBounds.height) {
      const penetration = futurePosition.y - (expandedBounds.y + expandedBounds.height);
      steeringForce = Vec2Math.add(
        steeringForce,
        Vec2Math.create(0, -penetration * this.config.steeringForce)
      );
    }

    return steeringForce;
  }

  /**
   * Update fish motion physics
   */
  private updateMotion(deltaTime: number): void {
    // Apply acceleration to velocity
    this.state.velocity = Vec2Math.add(
      this.state.velocity,
      Vec2Math.multiply(this.state.acceleration, deltaTime)
    );

    // Apply drag based on current state
    const dragCoefficient = this.getDragCoefficient();
    const drag = Vec2Math.multiply(
      this.state.velocity,
      -dragCoefficient * deltaTime
    );
    this.state.velocity = Vec2Math.add(this.state.velocity, drag);

    // Update position
    this.state.position = Vec2Math.add(
      this.state.position,
      Vec2Math.multiply(this.state.velocity, deltaTime)
    );

    // Update heading based on velocity
    const speed = Vec2Math.magnitude(this.state.velocity);
    if (speed > 1) {
      const targetHeading = Vec2Math.angle(this.state.velocity);
      this.state.heading = MathUtils.decay(
        this.state.heading,
        targetHeading,
        5.0,
        deltaTime
      );
    }

    // Reset acceleration for next frame
    this.state.acceleration = Vec2Math.ZERO;
  }

  /**
   * Get drag coefficient based on current state
   */
  private getDragCoefficient(): number {
    switch (this.state.state) {
      case 'idle': return 0.8;
      case 'dart': return 0.1; // Low drag during dart
      case 'recover': return 1.5; // High drag during recovery
      default: return 0.8;
    }
  }

  /**
   * Update motion trail for wake effects
   */
  private updateTrail(deltaTime: number): void {
    const speed = Vec2Math.magnitude(this.state.velocity);
    
    // Add new trail point if moving fast enough
    if (speed > 5) {
      const intensity = Math.min(speed / 100, 1.0);
      this.state.trail.unshift({
        position: this.state.position,
        age: 0,
        intensity
      });

      // Limit trail length
      if (this.state.trail.length > this.config.trailLength) {
        this.state.trail.length = this.config.trailLength;
      }
    }

    // Update existing trail points
    for (let i = this.state.trail.length - 1; i >= 0; i--) {
      const point = this.state.trail[i];
      point.age += deltaTime;
      point.intensity *= 0.95; // Fade over time

      // Remove old or faded points
      if (point.age > 2.0 || point.intensity < 0.01) {
        this.state.trail.splice(i, 1);
      }
    }
  }

  /**
   * Update visual effects (glow, bioluminescence)
   */
  private updateVisualEffects(deltaTime: number): void {
    const baseGlow = 0.6;
    const stateGlow = this.getStateGlowModifier();
    const speedGlow = Math.min(Vec2Math.magnitude(this.state.velocity) / 100, 0.4);
    const energyGlow = this.state.energy * 0.3;

    this.state.glowIntensity = MathUtils.decay(
      this.state.glowIntensity,
      baseGlow + stateGlow + speedGlow + energyGlow,
      3.0,
      deltaTime
    );
  }

  /**
   * Get glow modifier based on current state
   */
  private getStateGlowModifier(): number {
    switch (this.state.state) {
      case 'idle': return 0;
      case 'dart': return 0.8; // Bright glow during dart
      case 'recover': return 0.2;
      default: return 0;
    }
  }

  /**
   * Get current fish position
   */
  public getPosition(): Vec2 {
    return this.state.position;
  }

  /**
   * Get current fish velocity
   */
  public getVelocity(): Vec2 {
    return this.state.velocity;
  }

  /**
   * Get current fish heading in radians
   */
  public getHeading(): number {
    return this.state.heading;
  }

  /**
   * Get current fish state
   */
  public getState(): FishState {
    return this.state.state;
  }

  /**
   * Get current glow intensity
   */
  public getGlowIntensity(): number {
    return this.state.glowIntensity;
  }

  /**
   * Get current motion trail
   */
  public getTrail(): ReadonlyArray<TrailPoint> {
    return this.state.trail;
  }

  /**
   * Get current energy level
   */
  public getEnergy(): number {
    return this.state.energy;
  }

  /**
   * Check if fish is currently active
   */
  public isRunning(): boolean {
    return this.isActive;
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<FishConfig>): void {
    Object.assign(this.config, newConfig);
  }

  /**
   * Reset fish to initial state
   */
  public reset(): void {
    const center = BoundsUtils.center(this.config.bounds);
    this.state = {
      position: center,
      velocity: Vec2Math.ZERO,
      acceleration: Vec2Math.ZERO,
      heading: Math.random() * Math.PI * 2,
      state: 'idle',
      stateTime: 0,
      nextDartTime: this.generateNextDartInterval(),
      dartStartPosition: center,
      dartTargetPosition: center,
      trail: [],
      energy: 1.0,
      glowIntensity: 0.6 + Math.random() * 0.4
    };
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    this.stop();
    this.state.trail.length = 0;
  }
}