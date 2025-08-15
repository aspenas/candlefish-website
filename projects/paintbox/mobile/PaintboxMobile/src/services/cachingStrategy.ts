import AsyncStorage from '@react-native-async-storage/async-storage';
import { SmartCache, PerformanceMonitor } from './performanceOptimizations';
import { mobileOptimizationService } from './mobileOptimizations';

// Cache layers definition
export enum CacheLayer {
  L1_MEMORY = 'L1_MEMORY',        // In-memory cache (fastest)
  L2_PERSISTENT = 'L2_PERSISTENT', // AsyncStorage cache
  L3_NETWORK = 'L3_NETWORK',       // Network with offline fallback
}

// Cache entry metadata
interface CacheMetadata {
  layer: CacheLayer;
  timestamp: number;
  ttl: number;
  size: number;
  accessCount: number;
  lastAccessed: number;
  priority: 'high' | 'normal' | 'low';
  tags: string[];
  invalidationRules: string[];
}

// Cache configuration
interface CacheConfig {
  defaultTTL: number;
  maxMemoryCache: number;
  maxPersistentCache: number;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  preloadStrategy: 'eager' | 'lazy' | 'smart';
}

// Multi-tier cache implementation
class MultiTierCache {
  private l1Cache: SmartCache<any>; // Memory cache
  private performanceMonitor: PerformanceMonitor;
  private config: CacheConfig;
  private cacheMetadata = new Map<string, CacheMetadata>();

  constructor(config: CacheConfig) {
    this.config = config;
    this.l1Cache = new SmartCache(1000, config.maxMemoryCache / (1024 * 1024)); // Convert to MB
    this.performanceMonitor = PerformanceMonitor.getInstance();
  }

  // Get data with multi-tier fallback
  async get<T = any>(key: string): Promise<T | null> {
    const startTime = Date.now();
    let result: T | null = null;
    let hitLayer: CacheLayer | null = null;

    try {
      // L1 - Memory cache (fastest)
      result = this.l1Cache.get(key);
      if (result !== null) {
        hitLayer = CacheLayer.L1_MEMORY;
        this.updateAccessMetadata(key, CacheLayer.L1_MEMORY);
        this.performanceMonitor.recordCacheHit();
        console.log(`L1 Cache hit for ${key}`);
        return result;
      }

      // L2 - Persistent cache
      result = await this.getFromPersistentCache<T>(key);
      if (result !== null) {
        hitLayer = CacheLayer.L2_PERSISTENT;
        
        // Promote to L1 for faster future access
        this.l1Cache.set(key, result, this.getTTLFromMetadata(key));
        this.updateAccessMetadata(key, CacheLayer.L2_PERSISTENT);
        this.performanceMonitor.recordCacheHit();
        console.log(`L2 Cache hit for ${key}, promoted to L1`);
        return result;
      }

      // Cache miss - would fetch from network in real implementation
      this.performanceMonitor.recordCacheMiss();
      console.log(`Cache miss for ${key}`);
      return null;

    } finally {
      const duration = Date.now() - startTime;
      this.performanceMonitor.trackApiCall(`cache_get_${hitLayer || 'miss'}`, duration);
    }
  }

  // Set data in appropriate cache tier
  async set<T = any>(
    key: string, 
    value: T, 
    ttl?: number, 
    priority: 'high' | 'normal' | 'low' = 'normal',
    tags: string[] = []
  ): Promise<void> {
    const actualTTL = ttl || this.config.defaultTTL;
    const size = this.estimateSize(value);
    const timestamp = Date.now();

    // Store metadata
    this.cacheMetadata.set(key, {
      layer: CacheLayer.L1_MEMORY,
      timestamp,
      ttl: actualTTL,
      size,
      accessCount: 1,
      lastAccessed: timestamp,
      priority,
      tags,
      invalidationRules: this.generateInvalidationRules(key, tags),
    });

    // Always store in L1 (memory) first
    this.l1Cache.set(key, value, actualTTL / 1000); // Convert to seconds

    // Store in L2 (persistent) based on priority and size
    if (priority === 'high' || size > 1024 * 100) { // > 100KB
      await this.setPersistentCache(key, value, actualTTL);
    }

    console.log(`Cached ${key} in L1${priority === 'high' ? ' and L2' : ''}`);
  }

  // Remove from all cache tiers
  async delete(key: string): Promise<void> {
    this.l1Cache.delete(key);
    await this.deletePersistentCache(key);
    this.cacheMetadata.delete(key);
    console.log(`Deleted ${key} from all cache tiers`);
  }

  // Invalidate cache entries by tags
  async invalidateByTags(tags: string[]): Promise<void> {
    const keysToInvalidate: string[] = [];
    
    for (const [key, metadata] of this.cacheMetadata) {
      if (metadata.tags.some(tag => tags.includes(tag))) {
        keysToInvalidate.push(key);
      }
    }

    await Promise.all(keysToInvalidate.map(key => this.delete(key)));
    console.log(`Invalidated ${keysToInvalidate.length} cache entries by tags:`, tags);
  }

  // Preload critical data
  async preloadCriticalData(keys: string[], fetcher: (key: string) => Promise<any>): Promise<void> {
    const strategy = this.config.preloadStrategy;
    
    if (strategy === 'eager') {
      await Promise.all(keys.map(key => this.preloadItem(key, fetcher)));
    } else if (strategy === 'smart') {
      // Preload based on usage patterns
      const sortedKeys = keys.sort((a, b) => {
        const aMetadata = this.cacheMetadata.get(a);
        const bMetadata = this.cacheMetadata.get(b);
        return (bMetadata?.accessCount || 0) - (aMetadata?.accessCount || 0);
      });
      
      // Preload top 50% most accessed items
      const topKeys = sortedKeys.slice(0, Math.ceil(keys.length / 2));
      await Promise.all(topKeys.map(key => this.preloadItem(key, fetcher)));
    }
    // For 'lazy' strategy, items are loaded on-demand
  }

  // Preload individual item
  private async preloadItem(key: string, fetcher: (key: string) => Promise<any>): Promise<void> {
    try {
      const cached = await this.get(key);
      if (cached === null) {
        const data = await fetcher(key);
        await this.set(key, data, undefined, 'high', ['preloaded']);
      }
    } catch (error) {
      console.warn(`Failed to preload ${key}:`, error);
    }
  }

  // L2 Cache operations (AsyncStorage)
  private async getFromPersistentCache<T>(key: string): Promise<T | null> {
    try {
      const stored = await AsyncStorage.getItem(`@paintbox/cache/${key}`);
      if (!stored) return null;

      const parsed = JSON.parse(stored);
      
      // Check if expired
      if (Date.now() > parsed.expiresAt) {
        await this.deletePersistentCache(key);
        return null;
      }

      return this.config.compressionEnabled 
        ? this.decompress(parsed.data) 
        : parsed.data;
    } catch (error) {
      console.error(`Failed to get from persistent cache: ${key}`, error);
      return null;
    }
  }

  private async setPersistentCache<T>(key: string, value: T, ttl: number): Promise<void> {
    try {
      const data = this.config.compressionEnabled 
        ? this.compress(value) 
        : value;

      const entry = {
        data,
        expiresAt: Date.now() + ttl,
        createdAt: Date.now(),
      };

      await AsyncStorage.setItem(`@paintbox/cache/${key}`, JSON.stringify(entry));
    } catch (error) {
      console.error(`Failed to set persistent cache: ${key}`, error);
    }
  }

  private async deletePersistentCache(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`@paintbox/cache/${key}`);
    } catch (error) {
      console.error(`Failed to delete from persistent cache: ${key}`, error);
    }
  }

  // Cache maintenance
  async performMaintenance(): Promise<void> {
    console.log('Starting cache maintenance...');
    
    const now = Date.now();
    const expiredKeys: string[] = [];
    const lowPriorityKeys: string[] = [];

    // Find expired and low-priority items
    for (const [key, metadata] of this.cacheMetadata) {
      if (now > metadata.timestamp + metadata.ttl) {
        expiredKeys.push(key);
      } else if (metadata.priority === 'low' && metadata.accessCount < 2) {
        lowPriorityKeys.push(key);
      }
    }

    // Remove expired items
    await Promise.all(expiredKeys.map(key => this.delete(key)));
    
    // Remove least used low-priority items if cache is full
    const cacheSize = await this.getCacheSize();
    const maxSize = this.config.maxPersistentCache;
    
    if (cacheSize > maxSize * 0.8) { // 80% full
      const itemsToRemove = lowPriorityKeys.slice(0, Math.ceil(lowPriorityKeys.length / 4));
      await Promise.all(itemsToRemove.map(key => this.delete(key)));
    }

    console.log(`Cache maintenance completed. Removed ${expiredKeys.length} expired and ${lowPriorityKeys.length} low-priority items.`);
  }

  // Utility methods
  private updateAccessMetadata(key: string, layer: CacheLayer): void {
    const metadata = this.cacheMetadata.get(key);
    if (metadata) {
      metadata.accessCount++;
      metadata.lastAccessed = Date.now();
      metadata.layer = layer;
    }
  }

  private getTTLFromMetadata(key: string): number {
    const metadata = this.cacheMetadata.get(key);
    return metadata ? metadata.ttl / 1000 : this.config.defaultTTL / 1000;
  }

  private generateInvalidationRules(key: string, tags: string[]): string[] {
    // Generate rules for automatic cache invalidation
    const rules = [...tags];
    
    // Add common invalidation patterns
    if (key.includes('project')) rules.push('projects_updated');
    if (key.includes('estimate')) rules.push('estimates_updated');
    if (key.includes('photo')) rules.push('photos_updated');
    
    return rules;
  }

  private estimateSize(obj: any): number {
    try {
      return JSON.stringify(obj).length * 2; // Rough UTF-16 estimate
    } catch {
      return 1000; // Default size for non-serializable objects
    }
  }

  private compress(data: any): any {
    // Implement compression if needed (e.g., using LZ-string)
    return data;
  }

  private decompress(data: any): any {
    // Implement decompression if needed
    return data;
  }

  private async getCacheSize(): Promise<number> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('@paintbox/cache/'));
      
      let totalSize = 0;
      for (const key of cacheKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }
      
      return totalSize;
    } catch (error) {
      console.error('Failed to calculate cache size:', error);
      return 0;
    }
  }

  // Get cache statistics
  getStats() {
    return {
      l1Stats: this.l1Cache.getStats(),
      metadataEntries: this.cacheMetadata.size,
      totalKeys: this.cacheMetadata.size,
      layerDistribution: this.getLayerDistribution(),
      hitRate: this.performanceMonitor.getCacheHitRate(),
    };
  }

  private getLayerDistribution() {
    const distribution = { L1: 0, L2: 0, L3: 0 };
    
    for (const metadata of this.cacheMetadata.values()) {
      switch (metadata.layer) {
        case CacheLayer.L1_MEMORY:
          distribution.L1++;
          break;
        case CacheLayer.L2_PERSISTENT:
          distribution.L2++;
          break;
        case CacheLayer.L3_NETWORK:
          distribution.L3++;
          break;
      }
    }
    
    return distribution;
  }

  // Clear all caches
  async clearAll(): Promise<void> {
    this.l1Cache.clear();
    
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith('@paintbox/cache/'));
    await AsyncStorage.multiRemove(cacheKeys);
    
    this.cacheMetadata.clear();
    console.log('All caches cleared');
  }
}

// Cache service manager
class CacheService {
  private multiTierCache: MultiTierCache | null = null;
  private maintenanceInterval: NodeJS.Timeout | null = null;

  async initialize(): Promise<void> {
    // Get device-specific configuration
    const deviceCapabilities = mobileOptimizationService.getDeviceCapabilities();
    const performanceConfig = mobileOptimizationService.getPerformanceConfig();

    const config: CacheConfig = {
      defaultTTL: 300000, // 5 minutes
      maxMemoryCache: performanceConfig?.cacheSize || 50 * 1024 * 1024, // 50MB default
      maxPersistentCache: 100 * 1024 * 1024, // 100MB
      compressionEnabled: deviceCapabilities?.isLowEndDevice || false,
      encryptionEnabled: false, // Enable if sensitive data
      preloadStrategy: deviceCapabilities?.isLowEndDevice ? 'lazy' : 'smart',
    };

    this.multiTierCache = new MultiTierCache(config);
    
    // Start maintenance routine
    this.startMaintenanceRoutine();
    
    console.log('Cache service initialized with config:', config);
  }

  // Public cache operations
  async get<T = any>(key: string): Promise<T | null> {
    if (!this.multiTierCache) {
      throw new Error('Cache service not initialized');
    }
    return this.multiTierCache.get<T>(key);
  }

  async set<T = any>(
    key: string, 
    value: T, 
    ttl?: number, 
    priority?: 'high' | 'normal' | 'low',
    tags?: string[]
  ): Promise<void> {
    if (!this.multiTierCache) {
      throw new Error('Cache service not initialized');
    }
    await this.multiTierCache.set(key, value, ttl, priority, tags);
  }

  async delete(key: string): Promise<void> {
    if (!this.multiTierCache) return;
    await this.multiTierCache.delete(key);
  }

  async invalidateByTags(tags: string[]): Promise<void> {
    if (!this.multiTierCache) return;
    await this.multiTierCache.invalidateByTags(tags);
  }

  async preloadCriticalData(keys: string[], fetcher: (key: string) => Promise<any>): Promise<void> {
    if (!this.multiTierCache) return;
    await this.multiTierCache.preloadCriticalData(keys, fetcher);
  }

  // Maintenance
  private startMaintenanceRoutine(): void {
    // Run maintenance every 15 minutes
    this.maintenanceInterval = setInterval(async () => {
      if (this.multiTierCache) {
        await this.multiTierCache.performMaintenance();
      }
    }, 15 * 60 * 1000);
  }

  async getStats() {
    return this.multiTierCache?.getStats() || null;
  }

  async clearAll(): Promise<void> {
    if (this.multiTierCache) {
      await this.multiTierCache.clearAll();
    }
  }

  destroy(): void {
    if (this.maintenanceInterval) {
      clearInterval(this.maintenanceInterval);
      this.maintenanceInterval = null;
    }
    console.log('Cache service destroyed');
  }
}

// Export singleton
export const cacheService = new CacheService();

// React hook for cache operations
export function useCache() {
  return {
    get: <T = any>(key: string) => cacheService.get<T>(key),
    set: <T = any>(
      key: string, 
      value: T, 
      ttl?: number, 
      priority?: 'high' | 'normal' | 'low',
      tags?: string[]
    ) => cacheService.set(key, value, ttl, priority, tags),
    delete: (key: string) => cacheService.delete(key),
    invalidateByTags: (tags: string[]) => cacheService.invalidateByTags(tags),
    clearAll: () => cacheService.clearAll(),
    getStats: () => cacheService.getStats(),
  };
}

export { CacheLayer, MultiTierCache };
export default cacheService;