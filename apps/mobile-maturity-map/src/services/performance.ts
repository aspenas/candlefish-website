import { InteractionManager, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { ImageResult } from 'expo-image-manipulator';

export interface PerformanceMetrics {
  memoryUsage: number;
  renderTime: number;
  bundleSize: number;
  networkLatency: number;
}

export class PerformanceService {
  private static performanceMarks: Map<string, number> = new Map();
  private static backgroundTasks: Set<() => Promise<void>> = new Set();
  private static isProcessingQueue = false;

  /**
   * Start a performance measurement
   */
  static startMeasurement(name: string): void {
    this.performanceMarks.set(name, Date.now());
  }

  /**
   * End a performance measurement and return duration
   */
  static endMeasurement(name: string): number {
    const startTime = this.performanceMarks.get(name);
    if (!startTime) {
      console.warn(`No start time found for measurement: ${name}`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.performanceMarks.delete(name);
    
    if (__DEV__) {
      console.log(`Performance: ${name} took ${duration}ms`);
    }

    return duration;
  }

  /**
   * Schedule a task to run when the main thread is idle
   */
  static scheduleIdleTask(task: () => Promise<void>): void {
    this.backgroundTasks.add(task);
    this.processBackgroundQueue();
  }

  /**
   * Process background tasks queue
   */
  private static async processBackgroundQueue(): Promise<void> {
    if (this.isProcessingQueue || this.backgroundTasks.size === 0) {
      return;
    }

    this.isProcessingQueue = true;

    // Wait for interactions to complete
    InteractionManager.runAfterInteractions(async () => {
      try {
        for (const task of this.backgroundTasks) {
          await task();
          this.backgroundTasks.delete(task);
        }
      } catch (error) {
        console.error('Background task error:', error);
      } finally {
        this.isProcessingQueue = false;
      }
    });
  }

  /**
   * Optimize image for mobile display
   */
  static async optimizeImage(
    uri: string,
    maxDimension: number = 1024,
    quality: number = 0.8
  ): Promise<string> {
    try {
      const { manipulateAsync, SaveFormat } = await import('expo-image-manipulator');
      
      this.startMeasurement('image_optimization');
      
      const result = await manipulateAsync(
        uri,
        [
          {
            resize: {
              width: maxDimension,
              height: maxDimension,
            },
          },
        ],
        {
          compress: quality,
          format: SaveFormat.JPEG,
        }
      );

      this.endMeasurement('image_optimization');
      return result.uri;
    } catch (error) {
      console.error('Image optimization error:', error);
      return uri; // Return original if optimization fails
    }
  }

  /**
   * Batch process multiple images
   */
  static async batchOptimizeImages(
    uris: string[],
    maxDimension: number = 1024,
    quality: number = 0.8
  ): Promise<string[]> {
    const BATCH_SIZE = 3; // Process 3 images at a time
    const results: string[] = [];

    for (let i = 0; i < uris.length; i += BATCH_SIZE) {
      const batch = uris.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(uri => this.optimizeImage(uri, maxDimension, quality))
      );
      results.push(...batchResults);

      // Add small delay between batches to prevent blocking
      if (i + BATCH_SIZE < uris.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  /**
   * Lazy load data with pagination
   */
  static createLazyLoader<T>(
    fetchFunction: (page: number, pageSize: number) => Promise<T[]>,
    pageSize: number = 20
  ) {
    let currentPage = 0;
    let isLoading = false;
    let hasMore = true;
    let allData: T[] = [];

    return {
      async loadMore(): Promise<{ data: T[]; hasMore: boolean }> {
        if (isLoading || !hasMore) {
          return { data: allData, hasMore };
        }

        isLoading = true;
        try {
          const newData = await fetchFunction(currentPage, pageSize);
          
          if (newData.length < pageSize) {
            hasMore = false;
          }

          allData = [...allData, ...newData];
          currentPage++;

          return { data: allData, hasMore };
        } catch (error) {
          console.error('Lazy load error:', error);
          throw error;
        } finally {
          isLoading = false;
        }
      },

      reset() {
        currentPage = 0;
        isLoading = false;
        hasMore = true;
        allData = [];
      },

      get data() {
        return allData;
      },

      get loading() {
        return isLoading;
      },
    };
  }

  /**
   * Debounce function calls
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;

    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }

  /**
   * Throttle function calls
   */
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let lastCall = 0;

    return (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func(...args);
      }
    };
  }

  /**
   * Create a memoized version of a function
   */
  static memoize<T extends (...args: any[]) => any>(
    func: T,
    keyGenerator?: (...args: Parameters<T>) => string
  ): T {
    const cache = new Map<string, ReturnType<T>>();

    return ((...args: Parameters<T>): ReturnType<T> => {
      const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
      
      if (cache.has(key)) {
        return cache.get(key)!;
      }

      const result = func(...args);
      cache.set(key, result);
      return result;
    }) as T;
  }

  /**
   * Monitor memory usage (development only)
   */
  static monitorMemoryUsage(): void {
    if (!__DEV__) return;

    const checkMemory = () => {
      if (Platform.OS === 'android' && global.performance?.memory) {
        const memory = global.performance.memory;
        console.log('Memory usage:', {
          used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
          total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
          limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`,
        });
      }
    };

    // Check memory every 30 seconds in development
    setInterval(checkMemory, 30000);
  }

  /**
   * Clean up temporary files and caches
   */
  static async cleanupCaches(): Promise<void> {
    try {
      // Clean up temporary files older than 7 days
      const tempDir = FileSystem.cacheDirectory;
      if (!tempDir) return;

      const files = await FileSystem.readDirectoryAsync(tempDir);
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

      for (const file of files) {
        const fileUri = `${tempDir}${file}`;
        const fileInfo = await FileSystem.getInfoAsync(fileUri);

        if (
          fileInfo.exists &&
          fileInfo.modificationTime &&
          fileInfo.modificationTime * 1000 < oneWeekAgo
        ) {
          await FileSystem.deleteAsync(fileUri);
        }
      }

      console.log('Cache cleanup completed');
    } catch (error) {
      console.error('Cache cleanup error:', error);
    }
  }

  /**
   * Preload critical resources
   */
  static async preloadResources(resources: string[]): Promise<void> {
    this.scheduleIdleTask(async () => {
      try {
        // Preload images and other resources
        const preloadPromises = resources.map(async (resource) => {
          // This would typically preload images or other assets
          console.log(`Preloading resource: ${resource}`);
        });

        await Promise.all(preloadPromises);
        console.log('Resource preloading completed');
      } catch (error) {
        console.error('Resource preloading error:', error);
      }
    });
  }

  /**
   * Get current performance metrics
   */
  static async getPerformanceMetrics(): Promise<Partial<PerformanceMetrics>> {
    const metrics: Partial<PerformanceMetrics> = {};

    try {
      // Memory usage (if available)
      if (Platform.OS === 'android' && global.performance?.memory) {
        metrics.memoryUsage = global.performance.memory.usedJSHeapSize;
      }

      // Bundle size (approximate)
      const bundleInfo = await FileSystem.getInfoAsync(FileSystem.bundleDirectory || '');
      if (bundleInfo.exists && bundleInfo.size) {
        metrics.bundleSize = bundleInfo.size;
      }

      return metrics;
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      return {};
    }
  }

  /**
   * Report performance issues
   */
  static reportPerformanceIssue(issue: string, context?: any): void {
    if (__DEV__) {
      console.warn('Performance Issue:', issue, context);
    }
    
    // In production, this could send telemetry data
    // to your analytics service
  }

  /**
   * Initialize performance monitoring
   */
  static initialize(): void {
    if (__DEV__) {
      this.monitorMemoryUsage();
    }

    // Clean up caches on app start
    this.scheduleIdleTask(this.cleanupCaches);

    console.log('Performance monitoring initialized');
  }
}