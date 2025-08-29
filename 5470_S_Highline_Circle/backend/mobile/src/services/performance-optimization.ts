/**
 * React Native Performance Optimization Service
 * Implements various performance enhancements for mobile app
 */

import {
  InteractionManager,
  Platform,
  Dimensions,
  NativeModules,
  DeviceEventEmitter,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import FastImage from 'react-native-fast-image';
import { debounce, throttle, memoize } from 'lodash';
import LRU from 'lru-cache';

// Performance monitoring
interface PerformanceMetrics {
  jsFrameRate: number;
  uiFrameRate: number;
  memoryUsage: number;
  cpuUsage: number;
  networkLatency: number;
  cacheHitRate: number;
  renderTime: number;
}

// Memory cache configuration
const memoryCache = new LRU<string, any>({
  max: 500,
  ttl: 1000 * 60 * 5, // 5 minutes
  updateAgeOnGet: true,
  updateAgeOnHas: true,
});

// Image cache configuration
const imageCache = new LRU<string, any>({
  max: 100,
  ttl: 1000 * 60 * 60, // 1 hour
  sizeCalculation: (value) => {
    return value.size || 1;
  },
  maxSize: 50 * 1024 * 1024, // 50MB
});

/**
 * PerformanceOptimizer - Main performance optimization service
 */
export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private metrics: PerformanceMetrics;
  private renderQueue: Map<string, Function>;
  private batchUpdateQueue: any[];
  private networkQuality: 'slow' | 'medium' | 'fast';

  private constructor() {
    this.metrics = this.initializeMetrics();
    this.renderQueue = new Map();
    this.batchUpdateQueue = [];
    this.networkQuality = 'medium';
    this.startMonitoring();
  }

  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  private initializeMetrics(): PerformanceMetrics {
    return {
      jsFrameRate: 60,
      uiFrameRate: 60,
      memoryUsage: 0,
      cpuUsage: 0,
      networkLatency: 0,
      cacheHitRate: 0,
      renderTime: 0,
    };
  }

  private startMonitoring() {
    // Monitor network quality
    NetInfo.addEventListener((state) => {
      this.updateNetworkQuality(state);
    });

    // Monitor frame rates (if available)
    if (NativeModules.PerformanceMonitor) {
      setInterval(() => {
        NativeModules.PerformanceMonitor.getMetrics((metrics: any) => {
          this.metrics = { ...this.metrics, ...metrics };
        });
      }, 5000);
    }
  }

  private updateNetworkQuality(state: any) {
    const { type, effectiveType } = state;
    
    if (type === 'none' || type === 'unknown') {
      this.networkQuality = 'slow';
    } else if (effectiveType === '2g' || effectiveType === 'slow-2g') {
      this.networkQuality = 'slow';
    } else if (effectiveType === '3g') {
      this.networkQuality = 'medium';
    } else {
      this.networkQuality = 'fast';
    }
  }

  /**
   * Optimized list rendering with virtualization
   */
  createOptimizedList(data: any[], renderItem: Function, options: any = {}) {
    const {
      initialNumToRender = 10,
      maxToRenderPerBatch = 5,
      windowSize = 10,
      updateCellsBatchingPeriod = 50,
      removeClippedSubviews = true,
    } = options;

    return {
      data,
      renderItem: this.memoizeRenderItem(renderItem),
      keyExtractor: this.optimizedKeyExtractor,
      initialNumToRender,
      maxToRenderPerBatch,
      windowSize,
      updateCellsBatchingPeriod,
      removeClippedSubviews,
      getItemLayout: this.getOptimizedItemLayout(options.itemHeight),
      onEndReachedThreshold: 0.5,
      maintainVisibleContentPosition: {
        minIndexForVisible: 0,
      },
    };
  }

  /**
   * Memoize render items to prevent unnecessary re-renders
   */
  private memoizeRenderItem = memoize((renderItem: Function) => {
    return ({ item, index }: any) => {
      const key = `${item.id || index}`;
      
      if (memoryCache.has(key)) {
        const cached = memoryCache.get(key);
        if (this.isDataEqual(cached.data, item)) {
          return cached.element;
        }
      }

      const element = renderItem({ item, index });
      memoryCache.set(key, { data: item, element });
      
      return element;
    };
  });

  /**
   * Optimized key extractor
   */
  private optimizedKeyExtractor = (item: any, index: number) => {
    return item.id?.toString() || `item-${index}`;
  };

  /**
   * Get optimized item layout for fixed height items
   */
  private getOptimizedItemLayout(itemHeight?: number) {
    if (!itemHeight) return undefined;
    
    return (_: any, index: number) => ({
      length: itemHeight,
      offset: itemHeight * index,
      index,
    });
  }

  /**
   * Check if data is equal (shallow comparison)
   */
  private isDataEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (!a || !b) return false;
    
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    return keysA.every(key => a[key] === b[key]);
  }

  /**
   * Optimize image loading with caching and lazy loading
   */
  optimizeImage(uri: string, options: any = {}) {
    const {
      priority = FastImage.priority.normal,
      cache = FastImage.cacheControl.immutable,
      width,
      height,
      resizeMode = FastImage.resizeMode.cover,
    } = options;

    // Check memory cache first
    const cacheKey = `${uri}-${width}x${height}`;
    if (imageCache.has(cacheKey)) {
      return imageCache.get(cacheKey);
    }

    // Determine quality based on network
    const quality = this.getImageQualityForNetwork();

    const optimizedSource = {
      uri: this.getOptimizedImageUrl(uri, width, height, quality),
      priority,
      cache,
      headers: {
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
      },
    };

    const imageProps = {
      source: optimizedSource,
      style: { width, height },
      resizeMode,
      onLoad: () => this.trackImageLoad(cacheKey),
      onError: () => this.handleImageError(uri),
    };

    imageCache.set(cacheKey, imageProps);
    return imageProps;
  }

  /**
   * Get optimized image URL based on dimensions and quality
   */
  private getOptimizedImageUrl(uri: string, width?: number, height?: number, quality?: string): string {
    if (!width && !height) return uri;
    
    // Construct optimized URL with CDN parameters
    const params = new URLSearchParams();
    if (width) params.append('w', Math.round(width * 2).toString()); // 2x for retina
    if (height) params.append('h', Math.round(height * 2).toString());
    params.append('q', quality || '80');
    params.append('fm', 'webp'); // Use WebP format
    params.append('fit', 'cover');
    
    return `${uri}?${params.toString()}`;
  }

  /**
   * Get image quality based on network conditions
   */
  private getImageQualityForNetwork(): string {
    switch (this.networkQuality) {
      case 'slow':
        return '60';
      case 'medium':
        return '75';
      case 'fast':
      default:
        return '85';
    }
  }

  /**
   * Track image loading for metrics
   */
  private trackImageLoad(cacheKey: string) {
    // Update cache hit rate metric
    const hits = memoryCache.size;
    const total = hits + imageCache.size;
    this.metrics.cacheHitRate = hits / total;
  }

  /**
   * Handle image loading errors
   */
  private handleImageError(uri: string) {
    console.warn(`Failed to load image: ${uri}`);
    // Could implement fallback logic here
  }

  /**
   * Batch state updates for better performance
   */
  batchUpdate(updates: Function[]) {
    this.batchUpdateQueue.push(...updates);
    
    if (this.batchUpdateQueue.length === 1) {
      InteractionManager.runAfterInteractions(() => {
        requestAnimationFrame(() => {
          const batch = [...this.batchUpdateQueue];
          this.batchUpdateQueue = [];
          
          batch.forEach(update => update());
        });
      });
    }
  }

  /**
   * Defer expensive operations
   */
  defer(operation: Function, priority: 'high' | 'normal' | 'low' = 'normal') {
    const delay = priority === 'high' ? 0 : priority === 'normal' ? 100 : 500;
    
    return new Promise((resolve) => {
      InteractionManager.runAfterInteractions(() => {
        setTimeout(() => {
          const result = operation();
          resolve(result);
        }, delay);
      });
    });
  }

  /**
   * Throttled scroll handler
   */
  createScrollHandler(handler: Function, wait: number = 16) {
    return throttle(handler, wait, {
      leading: true,
      trailing: true,
    });
  }

  /**
   * Debounced search handler
   */
  createSearchHandler(handler: Function, wait: number = 300) {
    return debounce(handler, wait, {
      leading: false,
      trailing: true,
    });
  }

  /**
   * Preload critical data
   */
  async preloadCriticalData(dataLoaders: Function[]) {
    const results = await Promise.all(
      dataLoaders.map(loader => 
        this.loadWithCache(loader)
      )
    );
    
    return results;
  }

  /**
   * Load data with caching
   */
  private async loadWithCache(loader: Function) {
    const key = loader.toString();
    
    // Check memory cache
    if (memoryCache.has(key)) {
      return memoryCache.get(key);
    }
    
    // Check persistent cache
    const cached = await this.getPersistentCache(key);
    if (cached) {
      memoryCache.set(key, cached);
      return cached;
    }
    
    // Load fresh data
    const data = await loader();
    
    // Cache in memory and persistent storage
    memoryCache.set(key, data);
    await this.setPersistentCache(key, data);
    
    return data;
  }

  /**
   * Get data from persistent cache
   */
  private async getPersistentCache(key: string) {
    try {
      const cached = await AsyncStorage.getItem(`cache:${key}`);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        
        // Check if cache is still valid (24 hours)
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          return data;
        }
      }
    } catch (error) {
      console.error('Cache read error:', error);
    }
    
    return null;
  }

  /**
   * Set data in persistent cache
   */
  private async setPersistentCache(key: string, data: any) {
    try {
      await AsyncStorage.setItem(
        `cache:${key}`,
        JSON.stringify({
          data,
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }

  /**
   * Clear all caches
   */
  async clearCache() {
    memoryCache.clear();
    imageCache.clear();
    
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith('cache:'));
    await AsyncStorage.multiRemove(cacheKeys);
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Enable performance monitoring overlay
   */
  enableMonitoringOverlay() {
    if (__DEV__ && NativeModules.DevMenu) {
      NativeModules.DevMenu.show();
    }
  }

  /**
   * Optimize navigation transitions
   */
  optimizeNavigation() {
    return {
      animation: 'spring',
      config: {
        stiffness: 1000,
        damping: 500,
        mass: 3,
        overshootClamping: true,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 0.01,
      },
      transitionSpec: {
        open: {
          animation: 'timing',
          config: {
            duration: 200,
          },
        },
        close: {
          animation: 'timing',
          config: {
            duration: 150,
          },
        },
      },
    };
  }

  /**
   * Optimize animations for 60 FPS
   */
  createOptimizedAnimation(animation: any) {
    return {
      ...animation,
      useNativeDriver: true,
      isInteraction: false,
    };
  }

  /**
   * Memory cleanup utility
   */
  performMemoryCleanup() {
    // Clear old cache entries
    memoryCache.forEach((value, key) => {
      if (this.isCacheStale(value)) {
        memoryCache.delete(key);
      }
    });
    
    // Trim image cache
    if (imageCache.size > imageCache.max * 0.9) {
      const toRemove = Math.floor(imageCache.size * 0.2);
      for (let i = 0; i < toRemove; i++) {
        const oldestKey = imageCache.keys().next().value;
        if (oldestKey) {
          imageCache.delete(oldestKey);
        }
      }
    }
    
    // Request garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }

  /**
   * Check if cache entry is stale
   */
  private isCacheStale(value: any): boolean {
    if (!value || !value.timestamp) return true;
    
    const age = Date.now() - value.timestamp;
    return age > 60 * 60 * 1000; // 1 hour
  }
}

// Export singleton instance
export default PerformanceOptimizer.getInstance();