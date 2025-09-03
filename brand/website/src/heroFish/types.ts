/**
 * Core types and mathematical utilities for the bioluminescent fish animation system
 * Zero dependencies, production-ready TypeScript implementation
 */

'use strict';

/**
 * 2D vector interface with immutable operations
 */
export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

/**
 * Bounding rectangle for collision detection and spatial queries
 */
export interface Bounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Fish animation states for the state machine
 */
export type FishState = 'idle' | 'dart' | 'recover';

/**
 * Quality tier for adaptive rendering performance
 */
export type QualityTier = 'T1' | 'T2' | 'T3' | 'T4';

/**
 * Fish animation configuration
 */
export interface FishConfig {
  readonly bounds: Bounds;
  readonly idleSpeed: number;
  readonly dartSpeed: number;
  readonly dartDuration: number;
  readonly recoverDuration: number;
  readonly dartIntervalMin: number;
  readonly dartIntervalMax: number;
  readonly steeringForce: number;
  readonly noiseScale: number;
  readonly glowRadius: number;
  readonly trailLength: number;
}

/**
 * Performance metrics for telemetry
 */
export interface PerformanceMetrics {
  readonly fps: number;
  readonly frameTime: number;
  readonly qualityTier: QualityTier;
  readonly droppedFrames: number;
  readonly memoryUsage?: number;
}

/**
 * Animation frame callback signature
 */
export type AnimationCallback = (deltaTime: number) => void;

/**
 * Brand color tokens
 */
export const BRAND_COLORS = {
  deepIndigo: '#3A3A60',
  amberFlame: '#FFB347', 
  warmWhite: '#FAFAF8'
} as const;

/**
 * Vector math utilities - all operations return new vectors (immutable)
 */
export namespace Vec2Math {
  /**
   * Create a new Vec2
   */
  export const create = (x: number, y: number): Vec2 => ({ x, y });

  /**
   * Zero vector constant
   */
  export const ZERO: Vec2 = create(0, 0);

  /**
   * Unit vector constants
   */
  export const UNIT_X: Vec2 = create(1, 0);
  export const UNIT_Y: Vec2 = create(0, 1);

  /**
   * Add two vectors
   */
  export const add = (a: Vec2, b: Vec2): Vec2 => create(a.x + b.x, a.y + b.y);

  /**
   * Subtract two vectors
   */
  export const subtract = (a: Vec2, b: Vec2): Vec2 => create(a.x - b.x, a.y - b.y);

  /**
   * Multiply vector by scalar
   */
  export const multiply = (v: Vec2, scalar: number): Vec2 => create(v.x * scalar, v.y * scalar);

  /**
   * Divide vector by scalar (with zero check)
   */
  export const divide = (v: Vec2, scalar: number): Vec2 => {
    if (Math.abs(scalar) < Number.EPSILON) {
      return ZERO;
    }
    return create(v.x / scalar, v.y / scalar);
  };

  /**
   * Calculate dot product
   */
  export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;

  /**
   * Calculate vector magnitude
   */
  export const magnitude = (v: Vec2): number => Math.sqrt(v.x * v.x + v.y * v.y);

  /**
   * Calculate squared magnitude (faster for comparisons)
   */
  export const magnitudeSquared = (v: Vec2): number => v.x * v.x + v.y * v.y;

  /**
   * Calculate distance between two points
   */
  export const distance = (a: Vec2, b: Vec2): number => magnitude(subtract(a, b));

  /**
   * Calculate squared distance (faster for comparisons)
   */
  export const distanceSquared = (a: Vec2, b: Vec2): number => magnitudeSquared(subtract(a, b));

  /**
   * Normalize vector to unit length
   */
  export const normalize = (v: Vec2): Vec2 => {
    const mag = magnitude(v);
    return mag > Number.EPSILON ? divide(v, mag) : ZERO;
  };

  /**
   * Limit vector magnitude to maximum value
   */
  export const limit = (v: Vec2, maxMagnitude: number): Vec2 => {
    const magSq = magnitudeSquared(v);
    if (magSq > maxMagnitude * maxMagnitude) {
      return multiply(normalize(v), maxMagnitude);
    }
    return v;
  };

  /**
   * Linear interpolation between two vectors
   */
  export const lerp = (a: Vec2, b: Vec2, t: number): Vec2 => {
    const clampedT = Math.max(0, Math.min(1, t));
    return add(a, multiply(subtract(b, a), clampedT));
  };

  /**
   * Rotate vector by angle in radians
   */
  export const rotate = (v: Vec2, angle: number): Vec2 => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return create(v.x * cos - v.y * sin, v.x * sin + v.y * cos);
  };

  /**
   * Get angle of vector in radians
   */
  export const angle = (v: Vec2): number => Math.atan2(v.y, v.x);

  /**
   * Create vector from angle and magnitude
   */
  export const fromAngle = (angle: number, magnitude: number = 1): Vec2 => 
    create(Math.cos(angle) * magnitude, Math.sin(angle) * magnitude);

  /**
   * Get perpendicular vector (rotated 90 degrees counter-clockwise)
   */
  export const perpendicular = (v: Vec2): Vec2 => create(-v.y, v.x);

  /**
   * Reflect vector off a surface with given normal
   */
  export const reflect = (v: Vec2, normal: Vec2): Vec2 => {
    const n = normalize(normal);
    return subtract(v, multiply(n, 2 * dot(v, n)));
  };
}

/**
 * Mathematical utility functions
 */
export namespace MathUtils {
  /**
   * Clamp value between min and max
   */
  export const clamp = (value: number, min: number, max: number): number => 
    Math.max(min, Math.min(max, value));

  /**
   * Linear interpolation
   */
  export const lerp = (a: number, b: number, t: number): number => 
    a + (b - a) * clamp(t, 0, 1);

  /**
   * Map value from one range to another
   */
  export const map = (value: number, inMin: number, inMax: number, outMin: number, outMax: number): number => 
    outMin + (value - inMin) * (outMax - outMin) / (inMax - inMin);

  /**
   * Smooth step interpolation (S-curve)
   */
  export const smoothStep = (t: number): number => {
    const clamped = clamp(t, 0, 1);
    return clamped * clamped * (3 - 2 * clamped);
  };

  /**
   * Smoother step interpolation (S-curve with zero derivatives at endpoints)
   */
  export const smootherStep = (t: number): number => {
    const clamped = clamp(t, 0, 1);
    return clamped * clamped * clamped * (clamped * (clamped * 6 - 15) + 10);
  };

  /**
   * Generate random number between min and max
   */
  export const random = (min: number, max: number): number => 
    min + Math.random() * (max - min);

  /**
   * Generate random integer between min and max (inclusive)
   */
  export const randomInt = (min: number, max: number): number => 
    Math.floor(random(min, max + 1));

  /**
   * Convert degrees to radians
   */
  export const degToRad = (degrees: number): number => degrees * Math.PI / 180;

  /**
   * Convert radians to degrees
   */
  export const radToDeg = (radians: number): number => radians * 180 / Math.PI;

  /**
   * Wrap angle to [-PI, PI] range
   */
  export const wrapAngle = (angle: number): number => {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
  };

  /**
   * Calculate shortest angular difference between two angles
   */
  export const angleDifference = (a: number, b: number): number => {
    return wrapAngle(b - a);
  };

  /**
   * Exponential decay function
   */
  export const decay = (current: number, target: number, rate: number, deltaTime: number): number => {
    return target + (current - target) * Math.exp(-rate * deltaTime);
  };
}

/**
 * Bounds utilities for spatial calculations
 */
export namespace BoundsUtils {
  /**
   * Create bounds from position and size
   */
  export const create = (x: number, y: number, width: number, height: number): Bounds => 
    ({ x, y, width, height });

  /**
   * Check if point is inside bounds
   */
  export const containsPoint = (bounds: Bounds, point: Vec2): boolean => 
    point.x >= bounds.x && 
    point.x < bounds.x + bounds.width && 
    point.y >= bounds.y && 
    point.y < bounds.y + bounds.height;

  /**
   * Check if two bounds intersect
   */
  export const intersects = (a: Bounds, b: Bounds): boolean => 
    a.x < b.x + b.width && 
    a.x + a.width > b.x && 
    a.y < b.y + b.height && 
    a.y + a.height > b.y;

  /**
   * Get center point of bounds
   */
  export const center = (bounds: Bounds): Vec2 => 
    Vec2Math.create(bounds.x + bounds.width * 0.5, bounds.y + bounds.height * 0.5);

  /**
   * Get distance from point to bounds edge
   */
  export const distanceToEdge = (bounds: Bounds, point: Vec2): number => {
    const dx = Math.max(0, Math.max(bounds.x - point.x, point.x - (bounds.x + bounds.width)));
    const dy = Math.max(0, Math.max(bounds.y - point.y, point.y - (bounds.y + bounds.height)));
    return Math.sqrt(dx * dx + dy * dy);
  };

  /**
   * Expand bounds by margin
   */
  export const expand = (bounds: Bounds, margin: number): Bounds => 
    create(bounds.x - margin, bounds.y - margin, bounds.width + 2 * margin, bounds.height + 2 * margin);
}