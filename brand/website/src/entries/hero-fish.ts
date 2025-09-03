/**
 * Hero Fish Animation Entry Point
 * Auto-initializes when DOM is ready and element is visible
 */

import { createHeroFish, type HeroFish, type HeroFishConfig } from '../heroFish';

// Global debug handle for development
declare global {
  interface Window {
    __cfFish?: HeroFish;
    __cfFishStats?: {
      fpsMin: number;
      fpsMax: number;
      fpsAvg: number;
      droppedFrames: number;
      qualityTier: 1 | 2 | 3 | 4;
      dpr: number;
      offscreen: boolean;
    };
  }
}

class HeroFishManager {
  private fish: HeroFish | null = null;
  private observer: IntersectionObserver | null = null;
  private hostElement: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private isInitialized = false;
  private statsInterval: number | null = null;

  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Wait for DOM ready
      if (document.readyState === 'loading') {
        await new Promise(resolve => {
          document.addEventListener('DOMContentLoaded', resolve, { once: true });
        });
      }

      // Find host element
      this.hostElement = document.querySelector('[data-cf-fish-host]') as HTMLElement;
      if (!this.hostElement) {
        console.warn('Hero fish: Host element not found');
        return;
      }

      // Find or create canvas
      this.canvas = this.hostElement.querySelector('#hero-fish-canvas') as HTMLCanvasElement;
      if (!this.canvas) {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'hero-fish-canvas';
        this.canvas.setAttribute('aria-label', 'Decorative animation: Candlefish glyph, idle swim.');
        this.canvas.setAttribute('role', 'img');
        this.hostElement.appendChild(this.canvas);
      }

      // Get canvas bounds
      const rect = this.hostElement.getBoundingClientRect();
      const bounds = {
        x: 0,
        y: 0,
        width: rect.width,
        height: rect.height
      };

      // Check for reduced motion preference
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Configuration
      const config: HeroFishConfig = {
        bounds,
        enableBloom: !prefersReducedMotion,
        respectReducedMotion: true,
        targetFPS: prefersReducedMotion ? 30 : 60,
        qualityTier: 1,
        particleCount: prefersReducedMotion ? 6 : 12
      };

      // Create fish instance
      this.fish = await createHeroFish(this.canvas, config);

      // Set up visibility observer
      this.setupVisibilityObserver();

      // Set up telemetry
      this.setupTelemetry();

      // Expose debug handle in development
      if (process.env.NODE_ENV !== 'production') {
        window.__cfFish = this.fish;
        console.info('Hero fish initialized:', {
          dpr: Math.min(2, window.devicePixelRatio || 1),
          offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
          qualityTier: this.fish.getQualityTier(),
          reducedMotion: prefersReducedMotion
        });
      }

      this.isInitialized = true;
      this.hostElement.classList.remove('loading');

    } catch (error) {
      console.error('Hero fish initialization failed:', error);
      this.showFallback();
    }
  }

  private setupVisibilityObserver(): void {
    if (!this.fish || !this.hostElement) return;

    const options: IntersectionObserverInit = {
      threshold: [0, 0.3, 0.5, 1.0]
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const ratio = entry.intersectionRatio;
        
        if (ratio >= 0.5) {
          // Start animation when ≥50% visible
          this.fish?.start();
          this.hostElement?.classList.add('visible');
        } else if (ratio < 0.3) {
          // Stop animation when <30% visible
          this.fish?.stop();
          this.hostElement?.classList.remove('visible');
        }
      });
    }, options);

    this.observer.observe(this.hostElement);
  }

  private setupTelemetry(): void {
    if (!this.fish) return;

    // Update stats every 5 seconds
    const updateStats = () => {
      if (!this.fish) return;

      const telemetry = this.fish.getTelemetry();
      const frames = telemetry.getFrameHistory();
      
      if (frames.length === 0) return;

      const fpsSamples = frames.map(f => f.fps);
      const fpsMin = Math.min(...fpsSamples);
      const fpsMax = Math.max(...fpsSamples);
      const fpsAvg = fpsSamples.reduce((a, b) => a + b, 0) / fpsSamples.length;

      window.__cfFishStats = {
        fpsMin: Math.round(fpsMin),
        fpsMax: Math.round(fpsMax),
        fpsAvg: Math.round(fpsAvg),
        droppedFrames: telemetry.getDroppedFrames(),
        qualityTier: this.fish.getQualityTier(),
        dpr: Math.min(2, window.devicePixelRatio || 1),
        offscreen: typeof OffscreenCanvas !== 'undefined'
      };
    };

    // Initial update
    updateStats();
    
    // Schedule regular updates
    this.statsInterval = window.setInterval(updateStats, 5000);
  }

  private showFallback(): void {
    if (this.hostElement) {
      this.hostElement.classList.add('fallback');
      this.hostElement.classList.remove('loading');
    }
  }

  dispose(): void {
    // Clear stats interval
    if (this.statsInterval !== null) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }

    // Disconnect observer
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    // Dispose fish instance
    if (this.fish) {
      this.fish.dispose();
      this.fish = null;
    }

    // Clear debug handles
    if (process.env.NODE_ENV !== 'production') {
      delete window.__cfFish;
      delete window.__cfFishStats;
    }

    this.isInitialized = false;
  }
}

// Auto-initialize on module load
const manager = new HeroFishManager();

// Initialize when ready
if (typeof window !== 'undefined') {
  manager.init().catch(error => {
    console.error('Failed to initialize hero fish:', error);
  });

  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    manager.dispose();
  });

  // Handle visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      manager.dispose();
    } else {
      manager.init();
    }
  });
}

// Export for manual control if needed
export { manager as heroFishManager };
export type { HeroFish, HeroFishConfig } from '../heroFish';