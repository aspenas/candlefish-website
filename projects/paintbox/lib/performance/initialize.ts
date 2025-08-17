/**
 * Performance Optimization Initialization
 * Ties together all performance optimizations
 */

import { getCache } from '@/lib/cache/three-tier-cache';
import { getExcelLoader } from '@/lib/excel-engine/progressive-loader';
import { getPerformanceMonitor } from '@/lib/monitoring/performance-monitor';
import { preloadComponents } from '@/lib/utils/dynamic-imports';

// Performance configuration
const PERFORMANCE_CONFIG = {
  enableWebWorkers: true,
  enableProgressiveLoading: true,
  enableCaching: true,
  enableMonitoring: true,
  preloadCriticalComponents: true,
  lazyLoadThreshold: 1000, // ms before lazy loading starts
};

/**
 * Initialize all performance optimizations
 */
export async function initializePerformance(
  config: Partial<typeof PERFORMANCE_CONFIG> = {}
): Promise<void> {
  const settings = { ...PERFORMANCE_CONFIG, ...config };

  // Initialize cache warming
  if (settings.enableCaching) {
    await initializeCache();
  }

  // Initialize progressive Excel loading
  if (settings.enableProgressiveLoading) {
    initializeExcelLoader();
  }

  // Initialize performance monitoring
  if (settings.enableMonitoring) {
    initializeMonitoring();
  }

  // Preload critical components after initial render
  if (settings.preloadCriticalComponents) {
    setTimeout(() => {
      preloadComponents();
    }, settings.lazyLoadThreshold);
  }

  // Initialize Web Workers
  if (settings.enableWebWorkers) {
    initializeWebWorkers();
  }

  // Set up performance optimizations
  setupOptimizations();
}

/**
 * Initialize cache with common data
 */
async function initializeCache(): Promise<void> {
  const cache = getCache();

  // Warm up cache with common calculations
  const commonCalculations = [
    'base_price',
    'labor_cost',
    'material_cost',
    'total_price',
  ];

  // Pre-cache common formulas
  for (const calc of commonCalculations) {
    await cache.getOrSet(
      `calc:${calc}`,
      async () => {
        // Simulate fetching/calculating
        return { value: 0, formula: '', timestamp: Date.now() };
      },
      300 // 5 minutes TTL
    );
  }

  console.log('Cache initialized and warmed up');
}

/**
 * Initialize Excel loader
 */
function initializeExcelLoader(): void {
  const loader = getExcelLoader({
    chunkSize: 100,
    parallelLoads: 3,
    priorityThreshold: 10,
    cacheEnabled: true,
  });

  // Set up progress tracking
  loader.onProgressUpdate((loaded, total) => {
    const percentage = (loaded / total) * 100;
    console.log(`Excel data loading: ${percentage.toFixed(1)}%`);

    // Update UI progress indicator
    if (typeof window !== 'undefined') {
      window.postMessage({
        type: 'excel-loading-progress',
        loaded,
        total,
        percentage,
      }, '*');
    }
  });

  console.log('Excel loader initialized');
}

/**
 * Initialize performance monitoring
 */
function initializeMonitoring(): void {
  const monitor = getPerformanceMonitor();

  // Set up performance thresholds
  const thresholds = {
    bundleSize: 1.2, // 1.2MB
    chunkSize: 150, // 150KB
    apiResponseTime: 150, // 150ms
    cacheHitRate: 95, // 95%
    calculationTime: 100, // 100ms
    renderTime: 16, // 16ms for 60fps
  };

  // Report performance metrics every minute
  setInterval(() => {
    const report = monitor.generateReport();
    const score = monitor.getPerformanceScore();

    console.log(`Performance Score: ${score}/100`);

    // Send critical violations to error tracking
    if (report.violations.length > 0) {
      report.violations.forEach((violation: any) => {
        if (violation.severity === 'high') {
          console.error('Performance violation:', violation);
        }
      });
    }
  }, 60000);

  console.log('Performance monitoring initialized');
}

/**
 * Initialize Web Workers
 */
function initializeWebWorkers(): void {
  if (typeof window === 'undefined' || !window.Worker) {
    console.log('Web Workers not supported');
    return;
  }

  // Create a pool of workers for parallel processing
  const workerPool: Worker[] = [];
  const poolSize = navigator.hardwareConcurrency || 4;

  for (let i = 0; i < Math.min(poolSize, 4); i++) {
    try {
      const worker = new Worker(
        new URL('../workers/calculation.worker.ts', import.meta.url)
      );
      workerPool.push(worker);
    } catch (error) {
      console.error('Failed to create worker:', error);
    }
  }

  // Store worker pool globally
  (window as any).__workerPool = workerPool;

  console.log(`Initialized ${workerPool.length} Web Workers`);
}

/**
 * Set up various performance optimizations
 */
function setupOptimizations(): void {
  if (typeof window === 'undefined') return;

  // Optimize images with lazy loading
  optimizeImages();

  // Set up request idle callback for non-critical tasks
  setupIdleCallbacks();

  // Implement connection-aware loading
  setupConnectionAwareLoading();

  // Set up memory pressure handling
  setupMemoryPressureHandling();
}

/**
 * Optimize image loading
 */
function optimizeImages(): void {
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            imageObserver.unobserve(img);
          }
        }
      });
    });

    // Observe all images with data-src
    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
  }
}

/**
 * Set up idle callbacks for non-critical tasks
 */
function setupIdleCallbacks(): void {
  const tasks: Array<() => void> = [];

  // Process tasks when browser is idle
  function processTasks(deadline: IdleDeadline) {
    while (deadline.timeRemaining() > 0 && tasks.length > 0) {
      const task = tasks.shift();
      if (task) task();
    }

    if (tasks.length > 0) {
      requestIdleCallback(processTasks);
    }
  }

  // Add task to queue
  (window as any).queueIdleTask = (task: () => void) => {
    tasks.push(task);
    if (tasks.length === 1) {
      requestIdleCallback(processTasks);
    }
  };
}

/**
 * Set up connection-aware loading
 */
function setupConnectionAwareLoading(): void {
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;

    // Adjust loading strategy based on connection
    const updateStrategy = () => {
      const effectiveType = connection.effectiveType;

      if (effectiveType === 'slow-2g' || effectiveType === '2g') {
        // Reduce quality for slow connections
        console.log('Slow connection detected - reducing quality');
        document.body.classList.add('low-quality-mode');
      } else if (effectiveType === '4g') {
        // Enable high quality for fast connections
        document.body.classList.add('high-quality-mode');
      }

      // Adjust prefetch strategy
      if (connection.saveData) {
        console.log('Data saver mode - disabling prefetch');
        document.querySelectorAll('link[rel="prefetch"]').forEach(link => {
          link.remove();
        });
      }
    };

    connection.addEventListener('change', updateStrategy);
    updateStrategy();
  }
}

/**
 * Set up memory pressure handling
 */
function setupMemoryPressureHandling(): void {
  if ('memory' in performance) {
    setInterval(() => {
      const memory = (performance as any).memory;
      const usedMemory = memory.usedJSHeapSize;
      const totalMemory = memory.jsHeapSizeLimit;
      const memoryUsage = (usedMemory / totalMemory) * 100;

      if (memoryUsage > 90) {
        console.warn('High memory usage detected:', memoryUsage.toFixed(1) + '%');

        // Clear caches and trigger garbage collection
        const cache = getCache();
        cache.clear();

        // Clear Excel loader cache
        const loader = getExcelLoader();
        loader.clearLoadedChunks();

        console.log('Cleared caches due to memory pressure');
      }
    }, 30000); // Check every 30 seconds
  }
}

/**
 * Get performance metrics summary
 */
export function getPerformanceMetrics(): Record<string, any> {
  const monitor = getPerformanceMonitor();
  const cache = getCache();
  const loader = getExcelLoader();

  return {
    performanceScore: monitor.getPerformanceScore(),
    cacheMetrics: cache.getMetrics(),
    excelLoadProgress: loader.getProgress(),
    webVitals: (monitor as any).webVitals || {},
    timestamp: Date.now(),
  };
}

/**
 * Export initialization function as default
 */
export default initializePerformance;
