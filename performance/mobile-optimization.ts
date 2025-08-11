/**
 * Mobile App Performance Optimization
 * React Native Performance and Memory Management
 */

import {
  InteractionManager,
  Platform,
  Dimensions,
  PixelRatio,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { FlashList } from '@shopify/flash-list';

// ===========================
// 1. React Native Bundle Optimization
// ===========================

/**
 * Metro bundler configuration for optimal bundle size
 */
export const metroConfig = {
  transformer: {
    minifierConfig: {
      keep_fnames: false,
      mangle: {
        keep_fnames: false,
      },
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug', 'console.info'],
      },
      output: {
        ascii_only: true,
        quote_style: 3,
        wrap_iife: true,
      },
      sourceMap: {
        includeSources: false,
      },
    },
  },
  resolver: {
    // Exclude unnecessary files from bundle
    blacklistRE: /(__tests__|\.test\.|\.spec\.|\.e2e\.|\.stories\.).*$/,
  },
};

/**
 * Hermes configuration for Android optimization
 */
export const hermesConfig = {
  android: {
    enableHermes: true,
    // Enable bytecode optimization
    hermesCommand: './node_modules/hermes-engine/%OS-BIN%/hermesc',
    hermesFlags: ['-O', '-output-source-map'],
  },
};

/**
 * ProGuard rules for Android app size reduction
 */
export const proguardRules = `
# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }

# Keep custom modules
-keep class com.candlefish.** { *; }

# Remove debugging information
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
}
`;

// ===========================
// 2. Memory Usage Optimization
// ===========================

export class MemoryManager {
  private static instance: MemoryManager;
  private imageCache = new Map<string, any>();
  private dataCacheLimit = 50 * 1024 * 1024; // 50MB limit
  private currentCacheSize = 0;

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  /**
   * Optimized image caching with size limits
   */
  async cacheImage(url: string, priority: 'low' | 'normal' | 'high' = 'normal') {
    // Check if already cached
    if (this.imageCache.has(url)) {
      return this.imageCache.get(url);
    }

    // Preload image with appropriate priority
    const prefetchTask = FastImage.preload([
      {
        uri: url,
        priority: FastImage.priority[priority],
        cache: FastImage.cacheControl.immutable,
      },
    ]);

    // Store in memory cache with size limit
    if (this.imageCache.size > 100) {
      // Remove oldest entries
      const firstKey = this.imageCache.keys().next().value;
      this.imageCache.delete(firstKey);
    }

    this.imageCache.set(url, prefetchTask);
    return prefetchTask;
  }

  /**
   * Clear memory caches when app goes to background
   */
  clearMemoryCaches() {
    this.imageCache.clear();
    FastImage.clearMemoryCache();

    // Trigger garbage collection (if available)
    if (global.gc) {
      global.gc();
    }
  }

  /**
   * Monitor memory usage and clean up if needed
   */
  monitorMemoryUsage() {
    setInterval(() => {
      const memoryInfo = this.getMemoryInfo();

      if (memoryInfo.usageRatio > 0.8) {
        console.warn('High memory usage detected:', memoryInfo);
        this.performMemoryCleanup();
      }
    }, 30000); // Check every 30 seconds
  }

  private getMemoryInfo() {
    // Platform-specific memory info
    if (Platform.OS === 'ios') {
      // iOS memory info would be retrieved via native module
      return { used: 0, total: 0, usageRatio: 0 };
    } else {
      // Android memory info
      const runtime = (global as any).nativeRuntime;
      if (runtime) {
        return {
          used: runtime.totalMemory() - runtime.freeMemory(),
          total: runtime.maxMemory(),
          usageRatio: (runtime.totalMemory() - runtime.freeMemory()) / runtime.maxMemory(),
        };
      }
    }
    return { used: 0, total: 0, usageRatio: 0 };
  }

  private performMemoryCleanup() {
    // Clear image caches
    this.clearMemoryCaches();

    // Clear AsyncStorage old entries
    this.cleanupAsyncStorage();

    // Clear navigation stack if too deep
    this.cleanupNavigationStack();
  }

  private async cleanupAsyncStorage() {
    const keys = await AsyncStorage.getAllKeys();
    const now = Date.now();

    for (const key of keys) {
      if (key.startsWith('cache_')) {
        const item = await AsyncStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          if (parsed.expiry && parsed.expiry < now) {
            await AsyncStorage.removeItem(key);
          }
        }
      }
    }
  }

  private cleanupNavigationStack() {
    // Implementation would clean up deep navigation stacks
  }
}

// ===========================
// 3. Offline Data Sync Optimization
// ===========================

export class OfflineSyncManager {
  private syncQueue: SyncTask[] = [];
  private isSyncing = false;
  private networkState: any = null;

  constructor() {
    this.initNetworkListener();
    this.loadPendingSync();
  }

  /**
   * Initialize network state listener
   */
  private initNetworkListener() {
    NetInfo.addEventListener(state => {
      this.networkState = state;

      if (state.isConnected && !this.isSyncing) {
        this.processSyncQueue();
      }
    });
  }

  /**
   * Add data to sync queue with priority
   */
  async addToSyncQueue(task: SyncTask) {
    // Add to queue with priority sorting
    this.syncQueue.push(task);
    this.syncQueue.sort((a, b) => b.priority - a.priority);

    // Persist queue to storage
    await this.persistSyncQueue();

    // Try to sync immediately if online
    if (this.networkState?.isConnected) {
      this.processSyncQueue();
    }
  }

  /**
   * Process sync queue with batching
   */
  private async processSyncQueue() {
    if (this.isSyncing || this.syncQueue.length === 0) return;

    this.isSyncing = true;
    const batchSize = 10;

    try {
      while (this.syncQueue.length > 0) {
        // Check network before each batch
        const netInfo = await NetInfo.fetch();
        if (!netInfo.isConnected) break;

        // Get batch of tasks
        const batch = this.syncQueue.splice(0, batchSize);

        // Process batch in parallel
        const results = await Promise.allSettled(
          batch.map(task => this.executeSyncTask(task))
        );

        // Handle failed tasks
        const failedTasks = batch.filter((task, index) =>
          results[index].status === 'rejected'
        );

        if (failedTasks.length > 0) {
          // Increment retry count and re-add to queue
          failedTasks.forEach(task => {
            task.retryCount = (task.retryCount || 0) + 1;
            if (task.retryCount < 3) {
              this.syncQueue.push(task);
            }
          });
        }

        // Update persistent storage
        await this.persistSyncQueue();
      }
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Execute individual sync task with timeout
   */
  private async executeSyncTask(task: SyncTask): Promise<void> {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Sync timeout')), 30000)
    );

    const syncPromise = this.performSync(task);

    return Promise.race([syncPromise, timeout]) as Promise<void>;
  }

  private async performSync(task: SyncTask): Promise<void> {
    // Implementation would perform actual sync based on task type
    switch (task.type) {
      case 'dashboard':
        await this.syncDashboard(task.data);
        break;
      case 'widget':
        await this.syncWidget(task.data);
        break;
      case 'settings':
        await this.syncSettings(task.data);
        break;
    }
  }

  private async syncDashboard(data: any): Promise<void> {
    // Implementation
  }

  private async syncWidget(data: any): Promise<void> {
    // Implementation
  }

  private async syncSettings(data: any): Promise<void> {
    // Implementation
  }

  private async persistSyncQueue() {
    await AsyncStorage.setItem(
      'sync_queue',
      JSON.stringify(this.syncQueue)
    );
  }

  private async loadPendingSync() {
    const stored = await AsyncStorage.getItem('sync_queue');
    if (stored) {
      this.syncQueue = JSON.parse(stored);
    }
  }
}

// ===========================
// 4. Image Optimization
// ===========================

export class ImageOptimizer {
  /**
   * Get optimal image dimensions based on device
   */
  static getOptimalDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth?: number
  ): { width: number; height: number; uri: string } {
    const { width: screenWidth } = Dimensions.get('window');
    const pixelRatio = PixelRatio.get();

    // Calculate optimal width
    const targetWidth = Math.min(
      maxWidth || screenWidth,
      originalWidth
    );

    // Calculate dimensions for device pixel ratio
    const optimalWidth = Math.round(targetWidth * pixelRatio);
    const aspectRatio = originalHeight / originalWidth;
    const optimalHeight = Math.round(optimalWidth * aspectRatio);

    return {
      width: optimalWidth,
      height: optimalHeight,
      uri: this.getResizedImageUrl(originalWidth, optimalWidth),
    };
  }

  /**
   * Generate CDN URL with size parameters
   */
  private static getResizedImageUrl(originalUrl: string, width: number): string {
    // Example CDN resize URL pattern
    return `${originalUrl}?w=${width}&q=75&fm=webp`;
  }

  /**
   * Progressive image loading component
   */
  static createProgressiveImage(source: string, placeholder?: string) {
    return {
      source: {
        uri: source,
        priority: FastImage.priority.normal,
        cache: FastImage.cacheControl.immutable,
      },
      placeholder: placeholder || this.generateBlurHash(source),
      resizeMode: FastImage.resizeMode.contain,
    };
  }

  private static generateBlurHash(source: string): string {
    // Implementation would generate blur hash
    return 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';
  }
}

// ===========================
// 5. Background Task Optimization
// ===========================

export class BackgroundTaskManager {
  private taskQueue: BackgroundTask[] = [];
  private isProcessing = false;

  /**
   * Schedule background task with priority
   */
  scheduleTask(task: BackgroundTask) {
    this.taskQueue.push(task);
    this.taskQueue.sort((a, b) => b.priority - a.priority);

    if (!this.isProcessing) {
      this.processNextTask();
    }
  }

  /**
   * Process tasks when app is idle
   */
  private processNextTask() {
    if (this.taskQueue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const task = this.taskQueue.shift()!;

    // Use InteractionManager to run after interactions
    InteractionManager.runAfterInteractions(async () => {
      try {
        await this.executeTask(task);
      } catch (error) {
        console.error('Background task failed:', error);

        // Retry logic
        if (task.retryCount < 3) {
          task.retryCount++;
          this.taskQueue.push(task);
        }
      } finally {
        // Process next task
        this.processNextTask();
      }
    });
  }

  private async executeTask(task: BackgroundTask): Promise<void> {
    const startTime = Date.now();

    try {
      await task.execute();

      // Log performance metrics
      const executionTime = Date.now() - startTime;
      console.log(`Task ${task.id} completed in ${executionTime}ms`);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Cancel all pending tasks
   */
  cancelAllTasks() {
    this.taskQueue = [];
    this.isProcessing = false;
  }

  /**
   * Get task queue status
   */
  getQueueStatus() {
    return {
      pending: this.taskQueue.length,
      isProcessing: this.isProcessing,
      tasks: this.taskQueue.map(t => ({ id: t.id, priority: t.priority })),
    };
  }
}

// ===========================
// 6. Performance Monitoring
// ===========================

export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private frameDropThreshold = 2; // frames

  /**
   * Start monitoring app performance
   */
  startMonitoring() {
    this.monitorFrameRate();
    this.monitorJSThread();
    this.monitorMemory();
    this.monitorNetwork();
  }

  /**
   * Monitor frame rate for jank detection
   */
  private monitorFrameRate() {
    let lastFrameTime = Date.now();
    let frameDrops = 0;

    const checkFrame = () => {
      const currentTime = Date.now();
      const frameDuration = currentTime - lastFrameTime;

      // Check if frame took more than 16.67ms (60fps)
      if (frameDuration > 16.67 * this.frameDropThreshold) {
        frameDrops++;
        console.warn(`Frame drop detected: ${frameDuration}ms`);

        this.recordMetric('frameDrops', {
          value: frameDrops,
          timestamp: currentTime,
        });
      }

      lastFrameTime = currentTime;
      requestAnimationFrame(checkFrame);
    };

    requestAnimationFrame(checkFrame);
  }

  /**
   * Monitor JS thread blocking
   */
  private monitorJSThread() {
    setInterval(() => {
      const start = Date.now();

      // Schedule check after 0ms (next tick)
      setTimeout(() => {
        const blockTime = Date.now() - start;

        if (blockTime > 100) {
          console.warn(`JS thread blocked for ${blockTime}ms`);

          this.recordMetric('jsThreadBlock', {
            value: blockTime,
            timestamp: Date.now(),
          });
        }
      }, 0);
    }, 1000);
  }

  /**
   * Monitor memory usage
   */
  private monitorMemory() {
    setInterval(() => {
      const memoryInfo = MemoryManager.getInstance().getMemoryInfo();

      this.recordMetric('memory', {
        value: memoryInfo.usageRatio,
        timestamp: Date.now(),
        details: memoryInfo,
      });

      // Alert if memory usage is high
      if (memoryInfo.usageRatio > 0.9) {
        console.error('Critical memory usage:', memoryInfo);
      }
    }, 10000);
  }

  /**
   * Monitor network requests
   */
  private monitorNetwork() {
    // Would intercept fetch/XMLHttpRequest to monitor
  }

  /**
   * Record performance metric
   */
  private recordMetric(name: string, data: PerformanceMetric) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, data);
    } else {
      // Update with rolling average
      const existing = this.metrics.get(name)!;
      existing.value = (existing.value + data.value) / 2;
      existing.timestamp = data.timestamp;
    }
  }

  /**
   * Get performance report
   */
  getPerformanceReport() {
    const report: any = {};

    this.metrics.forEach((value, key) => {
      report[key] = value;
    });

    return report;
  }
}

// ===========================
// 7. Optimized Components
// ===========================

/**
 * Optimized FlatList with FlashList
 */
export const OptimizedList = {
  /**
   * High-performance list configuration
   */
  getOptimizedListProps: (estimatedItemSize: number = 50) => ({
    estimatedItemSize,
    drawDistance: 200,
    recycleItemsCount: 10,
    removeClippedSubviews: true,
    maxToRenderPerBatch: 10,
    updateCellsBatchingPeriod: 100,
    initialNumToRender: 10,
    windowSize: 10,
    // Use getItemLayout for fixed size items
    getItemLayout: (data: any, index: number) => ({
      length: estimatedItemSize,
      offset: estimatedItemSize * index,
      index,
    }),
  }),

  /**
   * Optimize list item rendering
   */
  optimizeListItem: (Component: React.ComponentType<any>) => {
    return React.memo(Component, (prevProps, nextProps) => {
      // Custom comparison logic
      return JSON.stringify(prevProps) === JSON.stringify(nextProps);
    });
  },
};

// Type definitions
interface SyncTask {
  id: string;
  type: 'dashboard' | 'widget' | 'settings';
  data: any;
  priority: number;
  retryCount?: number;
  timestamp: number;
}

interface BackgroundTask {
  id: string;
  priority: number;
  retryCount: number;
  execute: () => Promise<void>;
}

interface PerformanceMetric {
  value: number;
  timestamp: number;
  details?: any;
}

export default {
  MemoryManager,
  OfflineSyncManager,
  ImageOptimizer,
  BackgroundTaskManager,
  PerformanceMonitor,
  OptimizedList,
};
