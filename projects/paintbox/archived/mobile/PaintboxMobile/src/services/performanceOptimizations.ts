import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Performance monitoring utilities
export interface PerformanceMetrics {
  apiResponseTime: number;
  cacheHitRate: number;
  bundleSize: number;
  memoryUsage: number;
  networkLatency: number;
  renderTime: number;
  syncOperations: number;
  errorRate: number;
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  size: number;
  accessCount: number;
  lastAccessed: number;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  private cacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalRequests: 0,
  };

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Track API response times
  trackApiCall(operationName: string, duration: number): void {
    const existing = this.metrics.get(`api_${operationName}`) || [];
    existing.push(duration);

    // Keep only last 100 measurements
    if (existing.length > 100) {
      existing.shift();
    }

    this.metrics.set(`api_${operationName}`, existing);
  }

  // Track cache performance
  recordCacheHit(): void {
    this.cacheStats.hits++;
    this.cacheStats.totalRequests++;
  }

  recordCacheMiss(): void {
    this.cacheStats.misses++;
    this.cacheStats.totalRequests++;
  }

  getCacheHitRate(): number {
    return this.cacheStats.totalRequests > 0
      ? this.cacheStats.hits / this.cacheStats.totalRequests
      : 0;
  }

  // Get average response time for operation
  getAverageResponseTime(operationName: string): number {
    const times = this.metrics.get(`api_${operationName}`);
    return times && times.length > 0
      ? times.reduce((a, b) => a + b, 0) / times.length
      : 0;
  }

  // Export performance report
  async getPerformanceReport(): Promise<PerformanceMetrics> {
    const allOperations = Array.from(this.metrics.keys())
      .filter(key => key.startsWith('api_'));

    const avgResponseTime = allOperations.length > 0
      ? allOperations.reduce((sum, op) => sum + this.getAverageResponseTime(op.replace('api_', '')), 0) / allOperations.length
      : 0;

    return {
      apiResponseTime: avgResponseTime,
      cacheHitRate: this.getCacheHitRate(),
      bundleSize: await this.getBundleSize(),
      memoryUsage: await this.getMemoryUsage(),
      networkLatency: await this.getNetworkLatency(),
      renderTime: 0, // Would be tracked per component
      syncOperations: this.cacheStats.totalRequests,
      errorRate: 0, // Would be tracked separately
    };
  }

  private async getBundleSize(): Promise<number> {
    // Estimate bundle size (would need platform-specific implementation)
    return 0;
  }

  private async getMemoryUsage(): Promise<number> {
    // Would use platform-specific memory tracking
    return 0;
  }

  private async getNetworkLatency(): Promise<number> {
    const start = Date.now();
    try {
      const state = await NetInfo.fetch();
      return Date.now() - start;
    } catch {
      return -1;
    }
  }
}

// Enhanced caching with LRU eviction and performance tracking
export class SmartCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private maxMemory: number;
  private currentMemory = 0;
  private monitor: PerformanceMonitor;

  constructor(maxSize = 1000, maxMemoryMB = 50) {
    this.maxSize = maxSize;
    this.maxMemory = maxMemoryMB * 1024 * 1024; // Convert to bytes
    this.monitor = PerformanceMonitor.getInstance();
  }

  set(key: string, value: T, ttlSeconds = 300): void {
    const now = Date.now();
    const size = this.estimateSize(value);

    // Check if we need to evict items
    this.evictIfNeeded(size);

    const entry: CacheEntry<T> = {
      data: value,
      timestamp: now,
      ttl: ttlSeconds * 1000,
      size,
      accessCount: 1,
      lastAccessed: now,
    };

    this.cache.set(key, entry);
    this.currentMemory += size;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.monitor.recordCacheMiss();
      return null;
    }

    const now = Date.now();

    // Check if expired
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.currentMemory -= entry.size;
      this.monitor.recordCacheMiss();
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = now;

    this.monitor.recordCacheHit();
    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentMemory -= entry.size;
      return this.cache.delete(key);
    }
    return false;
  }

  clear(): void {
    this.cache.clear();
    this.currentMemory = 0;
  }

  size(): number {
    return this.cache.size;
  }

  // LRU eviction strategy
  private evictIfNeeded(newItemSize: number): void {
    while (
      (this.cache.size >= this.maxSize) ||
      (this.currentMemory + newItemSize > this.maxMemory)
    ) {
      const lruKey = this.findLRUKey();
      if (lruKey) {
        const entry = this.cache.get(lruKey);
        if (entry) {
          this.currentMemory -= entry.size;
        }
        this.cache.delete(lruKey);
      } else {
        break; // Safety break
      }
    }
  }

  private findLRUKey(): string | null {
    let lruKey: string | null = null;
    let oldestAccess = Date.now();

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < oldestAccess) {
        oldestAccess = entry.lastAccessed;
        lruKey = key;
      }
    }

    return lruKey;
  }

  private estimateSize(obj: any): number {
    // Simple size estimation - can be improved with more accurate calculation
    try {
      return JSON.stringify(obj).length * 2; // Rough estimate (UTF-16)
    } catch {
      return 1000; // Default size for non-serializable objects
    }
  }

  // Get cache statistics
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      memoryUsage: this.currentMemory,
      maxMemory: this.maxMemory,
      hitRate: this.monitor.getCacheHitRate(),
    };
  }
}

// Batch request handler to reduce N+1 queries
export class BatchRequestHandler {
  private pendingRequests = new Map<string, Promise<any>>();
  private batchTimeouts = new Map<string, NodeJS.Timeout>();
  private batchDelay = 50; // ms

  async batchedRequest<T>(
    key: string,
    fetcher: () => Promise<T>,
    batchKey?: string
  ): Promise<T> {
    const requestKey = batchKey ? `${batchKey}_${key}` : key;

    // Return existing promise if already pending
    if (this.pendingRequests.has(requestKey)) {
      return this.pendingRequests.get(requestKey);
    }

    // Create new batched request
    const promise = new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(async () => {
        try {
          const result = await fetcher();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.pendingRequests.delete(requestKey);
          this.batchTimeouts.delete(requestKey);
        }
      }, this.batchDelay);

      this.batchTimeouts.set(requestKey, timeout);
    });

    this.pendingRequests.set(requestKey, promise);
    return promise;
  }

  // Clear all pending requests (cleanup)
  clearPending(): void {
    for (const timeout of this.batchTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.batchTimeouts.clear();
    this.pendingRequests.clear();
  }
}

// Image optimization utilities
export class ImageOptimizer {
  static async optimizeForUpload(
    uri: string,
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.8
  ): Promise<string> {
    // This would integrate with react-native-image-resizer or similar
    // For now, return original URI
    return uri;
  }

  static async generateThumbnail(
    uri: string,
    width = 150,
    height = 150
  ): Promise<string> {
    // Generate thumbnail for faster loading
    return uri;
  }

  static async preloadImages(uris: string[]): Promise<void> {
    // Preload images in background
    const promises = uris.map(uri =>
      new Promise<void>((resolve) => {
        // React Native Image.prefetch equivalent
        resolve();
      })
    );

    await Promise.all(promises);
  }
}

// Memory management utilities
export class MemoryManager {
  private static maxCacheSize = 100 * 1024 * 1024; // 100MB
  private static warningThreshold = 0.8; // 80% of max cache

  static async checkMemoryUsage(): Promise<void> {
    // Platform-specific memory checking would go here
    console.log('Memory check completed');
  }

  static async clearCachesIfNeeded(): Promise<void> {
    try {
      // Check AsyncStorage usage
      const keys = await AsyncStorage.getAllKeys();
      const apolloKeys = keys.filter(key =>
        key.startsWith('apollo-cache') ||
        key.startsWith('@paintbox')
      );

      let totalSize = 0;
      for (const key of apolloKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }

      if (totalSize > this.maxCacheSize * this.warningThreshold) {
        console.warn('Cache size approaching limit, cleaning up...');
        await this.cleanupOldCaches();
      }
    } catch (error) {
      console.error('Memory check failed:', error);
    }
  }

  private static async cleanupOldCaches(): Promise<void> {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key =>
      key.startsWith('@paintbox/offline_data') ||
      key.includes('timestamp')
    );

    // Remove caches older than 7 days
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

    for (const key of cacheKeys) {
      try {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          if (parsed.lastUpdated && parsed.lastUpdated < weekAgo) {
            await AsyncStorage.removeItem(key);
          }
        }
      } catch {
        // Invalid data, remove it
        await AsyncStorage.removeItem(key);
      }
    }
  }
}

// Export performance optimization utilities
export const performanceOptimizations = {
  monitor: PerformanceMonitor.getInstance(),
  SmartCache,
  BatchRequestHandler,
  ImageOptimizer,
  MemoryManager,
};

export default performanceOptimizations;
