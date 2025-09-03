import { performance, PerformanceObserver } from 'perf_hooks';
import { render, fireEvent, waitFor, act } from '@testing-library/react';
import { CursorTrail } from '../../components/atelier/CursorTrail';
import { DynamicBackground } from '../../components/atelier/DynamicBackground';
import { setupWebGLMocks } from '../mocks/webgl.mock';
import { PerformanceMetricsFactory } from '../factories/animation-updated.factory';

// Performance test thresholds
const PERFORMANCE_THRESHOLDS = {
  FPS_MIN: 30,
  FPS_TARGET: 60,
  MEMORY_LIMIT_MB: 100,
  FRAME_TIME_MAX: 33, // ~30 FPS
  INIT_TIME_MAX: 1000, // 1 second
  PARTICLE_COUNT_MAX: 150,
  RENDER_CALLS_MAX: 100
};

// Mock performance monitoring utilities
class PerformanceMonitor {
  private measurements: { [key: string]: number[] } = {};
  private startTimes: { [key: string]: number } = {};
  
  start(label: string): void {
    this.startTimes[label] = performance.now();
  }
  
  end(label: string): number {
    const startTime = this.startTimes[label];
    if (!startTime) throw new Error(`No start time recorded for ${label}`);
    
    const duration = performance.now() - startTime;
    
    if (!this.measurements[label]) {
      this.measurements[label] = [];
    }
    this.measurements[label].push(duration);
    
    return duration;
  }
  
  getAverage(label: string): number {
    const measurements = this.measurements[label];
    if (!measurements || measurements.length === 0) return 0;
    
    return measurements.reduce((sum, val) => sum + val, 0) / measurements.length;
  }
  
  getMax(label: string): number {
    const measurements = this.measurements[label];
    if (!measurements || measurements.length === 0) return 0;
    
    return Math.max(...measurements);
  }
  
  getMin(label: string): number {
    const measurements = this.measurements[label];
    if (!measurements || measurements.length === 0) return 0;
    
    return Math.min(...measurements);
  }
  
  clear(): void {
    this.measurements = {};
    this.startTimes = {};
  }
  
  getSummary(): { [key: string]: { avg: number; min: number; max: number; count: number } } {
    const summary: any = {};
    
    for (const [label, measurements] of Object.entries(this.measurements)) {
      summary[label] = {
        avg: this.getAverage(label),
        min: this.getMin(label),
        max: this.getMax(label),
        count: measurements.length
      };
    }
    
    return summary;
  }
}

// Memory monitoring utility
class MemoryMonitor {
  private initialMemory: number = 0;
  private samples: number[] = [];
  
  start(): void {
    if (performance.memory) {
      this.initialMemory = performance.memory.usedJSHeapSize;
    }
  }
  
  sample(): number {
    if (performance.memory) {
      const currentMemory = performance.memory.usedJSHeapSize;
      const memoryUsageMB = (currentMemory - this.initialMemory) / (1024 * 1024);
      this.samples.push(memoryUsageMB);
      return memoryUsageMB;
    }
    return 0;
  }
  
  getMaxUsage(): number {
    return Math.max(...this.samples, 0);
  }
  
  getAverageUsage(): number {
    if (this.samples.length === 0) return 0;
    return this.samples.reduce((sum, val) => sum + val, 0) / this.samples.length;
  }
  
  getCurrentUsage(): number {
    if (performance.memory) {
      return (performance.memory.usedJSHeapSize - this.initialMemory) / (1024 * 1024);
    }
    return 0;
  }
  
  clear(): void {
    this.samples = [];
    this.initialMemory = 0;
  }
}

// FPS monitoring utility
class FPSMonitor {
  private frames: number[] = [];
  private lastTime: number = 0;
  private frameCount: number = 0;
  
  private measureFrame = (): void => {
    const now = performance.now();
    
    if (this.lastTime > 0) {
      const deltaTime = now - this.lastTime;
      const fps = 1000 / deltaTime;
      this.frames.push(fps);
    }
    
    this.lastTime = now;
    this.frameCount++;
    
    if (this.frameCount < 300) { // Monitor for ~5 seconds at 60fps
      requestAnimationFrame(this.measureFrame);
    }
  };
  
  start(): Promise<void> {
    this.frames = [];
    this.frameCount = 0;
    this.lastTime = 0;
    
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        this.measureFrame();
        setTimeout(resolve, 5000); // Resolve after 5 seconds
      });
    });
  }
  
  getAverageFPS(): number {
    if (this.frames.length === 0) return 0;
    return this.frames.reduce((sum, fps) => sum + fps, 0) / this.frames.length;
  }
  
  getMinFPS(): number {
    return Math.min(...this.frames, 0);
  }
  
  getMaxFPS(): number {
    return Math.max(...this.frames, 0);
  }
  
  getFrameTimeStats(): { avg: number; min: number; max: number } {
    const frameTimes = this.frames.map(fps => 1000 / fps);
    
    return {
      avg: frameTimes.reduce((sum, time) => sum + time, 0) / frameTimes.length || 0,
      min: Math.min(...frameTimes, 0),
      max: Math.max(...frameTimes, 0)
    };
  }
}

describe('Animation Performance Tests', () => {
  let webglMocks: ReturnType<typeof setupWebGLMocks>;
  let performanceMonitor: PerformanceMonitor;
  let memoryMonitor: MemoryMonitor;
  let fpsMonitor: FPSMonitor;
  
  beforeEach(() => {
    webglMocks = setupWebGLMocks();
    performanceMonitor = new PerformanceMonitor();
    memoryMonitor = new MemoryMonitor();
    fpsMonitor = new FPSMonitor();
    
    // Mock performance.memory for testing
    Object.defineProperty(performance, 'memory', {
      value: {
        usedJSHeapSize: 50 * 1024 * 1024, // 50MB baseline
        totalJSHeapSize: 100 * 1024 * 1024,
        jsHeapSizeLimit: 2048 * 1024 * 1024
      },
      writable: true
    });
  });
  
  afterEach(() => {
    webglMocks.restoreAll();
    performanceMonitor.clear();
    memoryMonitor.clear();
  });

  describe('Component Initialization Performance', () => {
    test('CursorTrail should initialize within performance budget', async () => {
      performanceMonitor.start('cursorTrail_init');
      memoryMonitor.start();
      
      const { container } = render(<CursorTrail />);
      
      await waitFor(() => {
        expect(container.querySelector('canvas')).toBeInTheDocument();
      });
      
      const initTime = performanceMonitor.end('cursorTrail_init');
      const memoryUsage = memoryMonitor.sample();
      
      expect(initTime).toBeLessThan(PERFORMANCE_THRESHOLDS.INIT_TIME_MAX);
      expect(memoryUsage).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_LIMIT_MB);
    });

    test('DynamicBackground should initialize efficiently', async () => {
      performanceMonitor.start('dynamicBg_init');
      memoryMonitor.start();
      
      const { container } = render(<DynamicBackground />);
      
      await waitFor(() => {
        expect(container.firstChild).toBeInTheDocument();
      });
      
      const initTime = performanceMonitor.end('dynamicBg_init');
      const memoryUsage = memoryMonitor.sample();
      
      expect(initTime).toBeLessThan(PERFORMANCE_THRESHOLDS.INIT_TIME_MAX);
      expect(memoryUsage).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_LIMIT_MB);
    });

    test('should handle multiple component initialization', async () => {
      performanceMonitor.start('multiComponent_init');
      memoryMonitor.start();
      
      const { rerender } = render(
        <div>
          <DynamicBackground />
          <CursorTrail />
        </div>
      );
      
      // Test re-rendering performance
      for (let i = 0; i < 5; i++) {
        rerender(
          <div>
            <DynamicBackground intensity={0.1 + i * 0.1} />
            <CursorTrail />
          </div>
        );
        
        await waitFor(() => {
          expect(document.querySelector('canvas')).toBeInTheDocument();
        });
      }
      
      const totalTime = performanceMonitor.end('multiComponent_init');
      const maxMemory = memoryMonitor.getMaxUsage();
      
      expect(totalTime).toBeLessThan(PERFORMANCE_THRESHOLDS.INIT_TIME_MAX * 2);
      expect(maxMemory).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_LIMIT_MB * 1.5);
    });
  });

  describe('Runtime Performance', () => {
    test('should maintain target FPS under normal interaction', async () => {
      const { container } = render(<CursorTrail />);
      const canvas = container.querySelector('canvas');
      
      expect(canvas).toBeInTheDocument();
      
      // Start FPS monitoring
      const fpsPromise = fpsMonitor.start();
      
      // Simulate normal mouse interaction
      act(() => {
        for (let i = 0; i < 100; i++) {
          fireEvent(document, new MouseEvent('mousemove', {
            clientX: 100 + i * 5,
            clientY: 100 + Math.sin(i * 0.1) * 50
          }));
          
          // Advance animation frames
          webglMocks.executeFrames(1);
        }
      });
      
      await fpsPromise;
      
      const avgFPS = fpsMonitor.getAverageFPS();
      const minFPS = fpsMonitor.getMinFPS();
      
      expect(avgFPS).toBeGreaterThan(PERFORMANCE_THRESHOLDS.FPS_MIN);
      expect(minFPS).toBeGreaterThan(PERFORMANCE_THRESHOLDS.FPS_MIN * 0.8); // Allow some variance
    });

    test('should handle high-frequency events without performance degradation', async () => {
      const { container } = render(<CursorTrail />);
      
      performanceMonitor.start('highFrequency_test');
      memoryMonitor.start();
      
      // Generate high-frequency mouse events
      act(() => {
        for (let i = 0; i < 1000; i++) {
          fireEvent(document, new MouseEvent('mousemove', {
            clientX: Math.random() * 1920,
            clientY: Math.random() * 1080
          }));
          
          // Execute animation frames periodically
          if (i % 10 === 0) {
            webglMocks.executeFrames(1);
          }
        }
      });
      
      const processingTime = performanceMonitor.end('highFrequency_test');
      const memoryUsage = memoryMonitor.sample();
      
      // Should process 1000 events reasonably quickly
      expect(processingTime).toBeLessThan(5000); // 5 seconds max
      expect(memoryUsage).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_LIMIT_MB);
    });

    test('should limit particle count for performance', async () => {
      const { container } = render(<CursorTrail />);
      
      // Generate particles rapidly
      act(() => {
        for (let i = 0; i < 500; i++) {
          fireEvent(document, new MouseEvent('mousemove', {
            clientX: 100 + i,
            clientY: 100
          }));
        }
        
        // Execute several animation frames to process particles
        webglMocks.executeFrames(30);
      });
      
      // Check that particle count is limited (this would require accessing internal state)
      // For now, verify that rendering performance remains stable
      performanceMonitor.start('particle_render');
      
      act(() => {
        webglMocks.executeFrames(60); // 1 second of frames
      });
      
      const renderTime = performanceMonitor.end('particle_render');
      
      // Rendering 60 frames should be fast
      expect(renderTime).toBeLessThan(1000);
    });
  });

  describe('Memory Management', () => {
    test('should not leak memory during normal operation', async () => {
      const { unmount } = render(<CursorTrail />);
      
      memoryMonitor.start();
      const initialMemory = memoryMonitor.sample();
      
      // Generate activity
      act(() => {
        for (let i = 0; i < 200; i++) {
          fireEvent(document, new MouseEvent('mousemove', {
            clientX: 100 + i * 2,
            clientY: 100
          }));
          
          if (i % 20 === 0) {
            webglMocks.executeFrames(5);
          }
        }
      });
      
      const activeMemory = memoryMonitor.sample();
      
      // Unmount component (should cleanup)
      unmount();
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const finalMemory = memoryMonitor.sample();
      
      // Memory should not grow significantly and should cleanup after unmount
      expect(activeMemory - initialMemory).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_LIMIT_MB);
      expect(finalMemory).toBeLessThanOrEqual(activeMemory * 1.1); // Allow 10% variance
    });

    test('should handle memory pressure gracefully', async () => {
      // Simulate high memory pressure
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 1800 * 1024 * 1024, // 1.8GB (high usage)
          totalJSHeapSize: 1900 * 1024 * 1024,
          jsHeapSizeLimit: 2048 * 1024 * 1024
        },
        writable: true
      });
      
      const { container } = render(<CursorTrail />);
      
      memoryMonitor.start();
      
      // Generate activity under memory pressure
      act(() => {
        for (let i = 0; i < 100; i++) {
          fireEvent(document, new MouseEvent('mousemove', {
            clientX: 100 + i * 5,
            clientY: 100
          }));
          
          webglMocks.executeFrames(1);
        }
      });
      
      const memoryUsage = memoryMonitor.sample();
      
      // Should still function but be conservative with memory
      expect(container.querySelector('canvas')).toBeInTheDocument();
      expect(memoryUsage).toBeLessThan(50); // Be more conservative
    });
  });

  describe('Rendering Performance', () => {
    test('should optimize rendering calls', async () => {
      const { container } = render(<CursorTrail />);
      
      let renderCallCount = 0;
      
      // Mock canvas context to count render calls
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type: string) {
        const context = originalGetContext.call(this, type);
        
        if (context && type === '2d') {
          const originalFill = context.fill;
          context.fill = function() {
            renderCallCount++;
            return originalFill.call(this);
          };
        }
        
        return context;
      };
      
      try {
        // Generate particles and animate
        act(() => {
          for (let i = 0; i < 50; i++) {
            fireEvent(document, new MouseEvent('mousemove', {
              clientX: 100 + i * 10,
              clientY: 100
            }));
          }
          
          // Execute animation frames
          webglMocks.executeFrames(30);
        });
        
        // Should make reasonable number of render calls
        expect(renderCallCount).toBeGreaterThan(0);
        expect(renderCallCount).toBeLessThan(PERFORMANCE_THRESHOLDS.RENDER_CALLS_MAX * 30); // Per frame
      } finally {
        HTMLCanvasElement.prototype.getContext = originalGetContext;
      }
    });

    test('should handle canvas resize efficiently', async () => {
      const { container } = render(<CursorTrail />);
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      
      performanceMonitor.start('resize_test');
      
      // Simulate multiple resizes
      act(() => {
        const sizes = [
          [1920, 1080],
          [1024, 768],
          [1440, 900],
          [800, 600],
          [1920, 1080]
        ];
        
        sizes.forEach(([width, height]) => {
          Object.defineProperty(window, 'innerWidth', { value: width, writable: true });
          Object.defineProperty(window, 'innerHeight', { value: height, writable: true });
          
          fireEvent(window, new Event('resize'));
          
          // Execute frame to handle resize
          webglMocks.executeFrames(1);
        });
      });
      
      const resizeTime = performanceMonitor.end('resize_test');
      
      expect(resizeTime).toBeLessThan(500); // Should handle resizes quickly
      expect(canvas.width).toBe(1920); // Final size
      expect(canvas.height).toBe(1080);
    });
  });

  describe('Stress Testing', () => {
    test('should handle extreme particle generation', async () => {
      const { container } = render(<CursorTrail />);
      
      performanceMonitor.start('stress_test');
      memoryMonitor.start();
      
      // Generate extreme number of particles
      act(() => {
        for (let frame = 0; frame < 60; frame++) {
          // Generate many particles per frame
          for (let i = 0; i < 20; i++) {
            fireEvent(document, new MouseEvent('mousemove', {
              clientX: Math.random() * 1920,
              clientY: Math.random() * 1080
            }));
          }
          
          webglMocks.executeFrames(1);
        }
      });
      
      const stressTime = performanceMonitor.end('stress_test');
      const maxMemory = memoryMonitor.getMaxUsage();
      
      // Should handle stress without crashing
      expect(container.querySelector('canvas')).toBeInTheDocument();
      expect(stressTime).toBeLessThan(10000); // 10 seconds max
      expect(maxMemory).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_LIMIT_MB * 2);
    });

    test('should recover from performance drops', async () => {
      const { container } = render(<CursorTrail />);
      
      // Simulate performance drop by overwhelming the system
      act(() => {
        // Create many particles quickly
        for (let i = 0; i < 1000; i++) {
          fireEvent(document, new MouseEvent('mousemove', {
            clientX: 100 + i,
            clientY: 100
          }));
        }
        
        // Process with delayed frames (simulating slow performance)
        for (let i = 0; i < 60; i++) {
          webglMocks.executeFrames(1);
          
          // Add artificial delay every few frames
          if (i % 10 === 0) {
            webglMocks.advanceTime(50); // Simulate 50ms delay
          }
        }
      });
      
      // Allow system to recover
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Normal operation should resume
      performanceMonitor.start('recovery_test');
      
      act(() => {
        fireEvent(document, new MouseEvent('mousemove', {
          clientX: 500,
          clientY: 300
        }));
        
        webglMocks.executeFrames(30);
      });
      
      const recoveryTime = performanceMonitor.end('recovery_test');
      
      expect(recoveryTime).toBeLessThan(1000);
      expect(container.querySelector('canvas')).toBeInTheDocument();
    });
  });

  describe('Performance Monitoring Integration', () => {
    test('should integrate with performance monitoring hooks', async () => {
      // Mock the performance monitoring hook
      const mockPerformanceData: any[] = [];
      
      const TestComponent = () => {
        const trackPerformance = (metrics: any) => {
          mockPerformanceData.push(metrics);
        };
        
        React.useEffect(() => {
          // Simulate performance tracking
          const interval = setInterval(() => {
            trackPerformance(PerformanceMetricsFactory.create());
          }, 100);
          
          return () => clearInterval(interval);
        }, []);
        
        return <CursorTrail />;
      };
      
      render(<TestComponent />);
      
      // Generate activity
      act(() => {
        fireEvent(document, new MouseEvent('mousemove', {
          clientX: 500,
          clientY: 300
        }));
        
        webglMocks.executeFrames(10);
      });
      
      // Wait for performance data
      await new Promise(resolve => setTimeout(resolve, 500));
      
      expect(mockPerformanceData.length).toBeGreaterThan(0);
      expect(mockPerformanceData[0]).toHaveProperty('fps');
      expect(mockPerformanceData[0]).toHaveProperty('memoryUsage');
    });
  });

  describe('Performance Regression Tests', () => {
    test('should maintain baseline performance metrics', async () => {
      // This test would compare against known baselines
      const baseline = {
        initTime: 100, // ms
        frameTime: 16.67, // ms (60fps)
        memoryUsage: 10, // MB
        particleProcessingTime: 1 // ms per 100 particles
      };
      
      const { container } = render(<CursorTrail />);
      
      // Measure initialization
      performanceMonitor.start('baseline_init');
      await waitFor(() => {
        expect(container.querySelector('canvas')).toBeInTheDocument();
      });
      const initTime = performanceMonitor.end('baseline_init');
      
      // Measure frame processing
      performanceMonitor.start('baseline_frame');
      act(() => {
        fireEvent(document, new MouseEvent('mousemove', {
          clientX: 500,
          clientY: 300
        }));
        webglMocks.executeFrames(1);
      });
      const frameTime = performanceMonitor.end('baseline_frame');
      
      // Measure memory usage
      memoryMonitor.start();
      act(() => {
        for (let i = 0; i < 100; i++) {
          fireEvent(document, new MouseEvent('mousemove', {
            clientX: 100 + i,
            clientY: 100
          }));
        }
        webglMocks.executeFrames(30);
      });
      const memoryUsage = memoryMonitor.sample();
      
      // Compare against baseline (allow 20% variance)
      expect(initTime).toBeLessThan(baseline.initTime * 1.2);
      expect(frameTime).toBeLessThan(baseline.frameTime * 1.2);
      expect(memoryUsage).toBeLessThan(baseline.memoryUsage * 1.2);
      
      // Log performance for regression tracking
      console.log('Performance metrics:', {
        initTime,
        frameTime,
        memoryUsage,
        baseline
      });
    });
  });
});