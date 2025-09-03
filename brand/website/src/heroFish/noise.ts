/**
 * Lightweight 2D Simplex Noise Implementation
 * Based on Stefan Gustavson's implementation with performance optimizations
 * Zero dependencies, memory-efficient with pre-computed gradients
 */

'use strict';

import type { Vec2 } from './types.js';
import { Vec2Math } from './types.js';

/**
 * Simplex noise gradient vectors (pre-computed for performance)
 */
const GRADIENTS: ReadonlyArray<Vec2> = [
  Vec2Math.create(1, 1),
  Vec2Math.create(-1, 1),
  Vec2Math.create(1, -1),
  Vec2Math.create(-1, -1),
  Vec2Math.create(1, 0),
  Vec2Math.create(-1, 0),
  Vec2Math.create(0, 1),
  Vec2Math.create(0, -1)
] as const;

/**
 * Permutation table for deterministic randomness
 * Based on Ken Perlin's improved noise reference implementation
 */
const PERMUTATION = [
  151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225,
  140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148,
  247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32,
  57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175,
  74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122,
  60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54,
  65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169,
  200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64,
  52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212,
  207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213,
  119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
  129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104,
  218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241,
  81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157,
  184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93,
  222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180
] as const;

/**
 * Extended permutation table (duplicated for overflow safety)
 */
const PERM: number[] = new Array(512);
for (let i = 0; i < 256; i++) {
  PERM[i] = PERM[i + 256] = PERMUTATION[i];
}

/**
 * Skewing and unskewing factors for 2D simplex grid
 */
const F2 = 0.5 * (Math.sqrt(3.0) - 1.0); // Skew factor
const G2 = (3.0 - Math.sqrt(3.0)) / 6.0; // Unskew factor

/**
 * 2D Simplex Noise Generator
 * Generates coherent noise with value range approximately [-1, 1]
 */
export class SimplexNoise2D {
  private readonly seed: number;

  /**
   * Create new simplex noise generator
   * @param seed Optional seed for deterministic output (default: random)
   */
  constructor(seed?: number) {
    this.seed = seed ?? Math.random() * 65536;
    
    // Shuffle permutation table based on seed
    if (seed !== undefined) {
      this.initializePermutationTable(seed);
    }
  }

  /**
   * Initialize permutation table with seed
   */
  private initializePermutationTable(seed: number): void {
    const rng = this.createSeededRNG(seed);
    
    // Fisher-Yates shuffle of permutation table
    const temp = [...PERMUTATION];
    for (let i = temp.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [temp[i], temp[j]] = [temp[j], temp[i]];
    }
    
    // Update global permutation arrays
    for (let i = 0; i < 256; i++) {
      PERM[i] = PERM[i + 256] = temp[i];
    }
  }

  /**
   * Create seeded random number generator
   */
  private createSeededRNG(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  }

  /**
   * Calculate contribution from a simplex corner
   */
  private calculateContribution(x: number, y: number, gradIndex: number): number {
    const t = 0.5 - x * x - y * y;
    if (t < 0) return 0;
    
    const t2 = t * t;
    const t4 = t2 * t2;
    const grad = GRADIENTS[gradIndex & 7];
    
    return t4 * Vec2Math.dot(grad, Vec2Math.create(x, y));
  }

  /**
   * Generate 2D simplex noise at given coordinates
   * @param x X coordinate
   * @param y Y coordinate
   * @returns Noise value approximately in range [-1, 1]
   */
  public noise(x: number, y: number): number {
    // Skew input coordinates to determine simplex cell
    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);

    // Unskew to find distances from cell origin
    const t = (i + j) * G2;
    const x0 = x - (i - t);
    const y0 = y - (j - t);

    // Determine which simplex we're in (upper or lower triangle)
    const i1 = x0 > y0 ? 1 : 0;
    const j1 = x0 > y0 ? 0 : 1;

    // Calculate distances to other corners
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;

    // Work out hashed gradient indices for the three corners
    const ii = i & 255;
    const jj = j & 255;
    const gi0 = PERM[ii + PERM[jj]];
    const gi1 = PERM[ii + i1 + PERM[jj + j1]];
    const gi2 = PERM[ii + 1 + PERM[jj + 1]];

    // Calculate contributions from each corner
    const n0 = this.calculateContribution(x0, y0, gi0);
    const n1 = this.calculateContribution(x1, y1, gi1);
    const n2 = this.calculateContribution(x2, y2, gi2);

    // Add contributions from each corner to get final noise value
    return 70 * (n0 + n1 + n2);
  }

  /**
   * Generate octave-based fractal noise (fBm - fractional Brownian motion)
   * @param x X coordinate
   * @param y Y coordinate
   * @param octaves Number of octaves (levels of detail)
   * @param persistence Amplitude reduction between octaves (0-1)
   * @param lacunarity Frequency multiplier between octaves (>1)
   * @returns Fractal noise value
   */
  public fractalNoise(
    x: number, 
    y: number, 
    octaves: number = 4, 
    persistence: number = 0.5, 
    lacunarity: number = 2.0
  ): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      value += this.noise(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return value / maxValue;
  }

  /**
   * Generate ridged noise (absolute value of fractal noise)
   * Good for terrain ridges or crystalline patterns
   */
  public ridgedNoise(
    x: number, 
    y: number, 
    octaves: number = 4, 
    persistence: number = 0.5, 
    lacunarity: number = 2.0
  ): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      const noise = Math.abs(this.noise(x * frequency, y * frequency));
      value += (1 - noise) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return value / maxValue;
  }

  /**
   * Generate turbulence (sum of absolute values of fractal noise)
   * Good for cloud-like or fluid motion patterns
   */
  public turbulence(
    x: number, 
    y: number, 
    octaves: number = 4, 
    persistence: number = 0.5, 
    lacunarity: number = 2.0
  ): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;

    for (let i = 0; i < octaves; i++) {
      value += Math.abs(this.noise(x * frequency, y * frequency)) * amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return value;
  }

  /**
   * Generate noise-based 2D vector field
   * Useful for fluid flow or particle direction fields
   */
  public vectorField(x: number, y: number, scale: number = 1): Vec2 {
    // Use offset sampling points to avoid correlations
    const offset = 1000;
    const noiseX = this.noise(x * scale, y * scale);
    const noiseY = this.noise((x + offset) * scale, (y + offset) * scale);
    
    return Vec2Math.create(noiseX, noiseY);
  }

  /**
   * Generate curl noise (divergence-free vector field)
   * Excellent for fluid-like motion without sources or sinks
   */
  public curlNoise(x: number, y: number, scale: number = 1, epsilon: number = 0.01): Vec2 {
    // Sample noise at offset positions
    const n1 = this.noise(x, y + epsilon);
    const n2 = this.noise(x, y - epsilon);
    const n3 = this.noise(x + epsilon, y);
    const n4 = this.noise(x - epsilon, y);
    
    // Calculate curl (rotation) of the noise field
    const dx = (n1 - n2) / (2 * epsilon);
    const dy = (n4 - n3) / (2 * epsilon);
    
    return Vec2Math.multiply(Vec2Math.create(dx, dy), scale);
  }

  /**
   * Get the seed used by this noise generator
   */
  public getSeed(): number {
    return this.seed;
  }

  /**
   * Create a new noise generator with the same seed
   */
  public clone(): SimplexNoise2D {
    return new SimplexNoise2D(this.seed);
  }
}

/**
 * Global singleton noise instance for convenience
 * Can be replaced with seeded instance if needed
 */
let globalNoise: SimplexNoise2D | null = null;

/**
 * Get or create the global noise instance
 */
export function getGlobalNoise(): SimplexNoise2D {
  if (!globalNoise) {
    globalNoise = new SimplexNoise2D();
  }
  return globalNoise;
}

/**
 * Set a new global noise instance with specific seed
 */
export function setGlobalNoise(seed?: number): SimplexNoise2D {
  globalNoise = new SimplexNoise2D(seed);
  return globalNoise;
}

/**
 * Convenience functions using global noise instance
 */
export const noise = (x: number, y: number): number => getGlobalNoise().noise(x, y);
export const fractalNoise = (x: number, y: number, octaves?: number, persistence?: number, lacunarity?: number): number => 
  getGlobalNoise().fractalNoise(x, y, octaves, persistence, lacunarity);
export const vectorField = (x: number, y: number, scale?: number): Vec2 => 
  getGlobalNoise().vectorField(x, y, scale);
export const curlNoise = (x: number, y: number, scale?: number, epsilon?: number): Vec2 => 
  getGlobalNoise().curlNoise(x, y, scale, epsilon);