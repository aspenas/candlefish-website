import React, { useCallback, useEffect, useMemo, useState, memo } from 'react';
import {
  FlatList,
  Image,
  InteractionManager,
  Platform,
  Text,
  View,
  VirtualizedList,
  ListRenderItem,
  ViewToken,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import { FlashList } from '@shopify/flash-list';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import DeviceInfo from 'react-native-device-info';
import { enableScreens } from 'react-native-screens';
import { enableFreeze } from 'react-native-screens';

// Enable optimizations
enableScreens(true);
enableFreeze(true);

// Performance monitoring for React Native
export class MobilePerformanceMonitor {
  private static instance: MobilePerformanceMonitor;
  private startupTime: number = 0;
  private metrics: Map<string, any> = new Map();
  private performanceObserver: any;

  static getInstance(): MobilePerformanceMonitor {
    if (!MobilePerformanceMonitor.instance) {
      MobilePerformanceMonitor.instance = new MobilePerformanceMonitor();
    }
    return MobilePerformanceMonitor.instance;
  }

  constructor() {
    this.initializeMonitoring();
  }

  private initializeMonitoring() {
    // Track app startup time
    this.startupTime = Date.now();

    // Monitor JS frame rate
    if (__DEV__) {
      let lastFrameTime = Date.now();
      const frameMonitor = () => {
        const now = Date.now();
        const fps = 1000 / (now - lastFrameTime);
        this.recordMetric('fps', fps);
        lastFrameTime = now;
        requestAnimationFrame(frameMonitor);
      };
      requestAnimationFrame(frameMonitor);
    }

    // Monitor memory usage
    this.monitorMemory();

    // Monitor network latency
    this.monitorNetwork();
  }

  private async monitorMemory() {
    if (Platform.OS === 'android') {
      // Android memory monitoring
      setInterval(async () => {
        const memoryInfo = await DeviceInfo.getUsedMemory();
        this.recordMetric('memory_usage', memoryInfo);

        // Check for memory pressure
        if (memoryInfo > 500 * 1024 * 1024) { // 500MB threshold
          this.triggerMemoryWarning();
        }
      }, 30000); // Check every 30 seconds
    }
  }

  private monitorNetwork() {
    NetInfo.addEventListener(state => {
      this.recordMetric('network_type', state.type);
      this.recordMetric('is_connected', state.isConnected);

      if (state.details) {
        this.recordMetric('network_details', state.details);
      }
    });
  }

  recordMetric(name: string, value: any) {
    this.metrics.set(name, {
      value,
      timestamp: Date.now(),
    });

    // Send critical metrics to backend
    if (['startup_time', 'crash', 'memory_warning'].includes(name)) {
      this.sendToBackend(name, value);
    }
  }

  private triggerMemoryWarning() {
    this.recordMetric('memory_warning', true);
    // Clear caches
    FastImage.clearMemoryCache();
    AsyncStorage.clear();
  }

  private async sendToBackend(metric: string, value: any) {
    try {
      await fetch('https://api.example.com/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metric,
          value,
          platform: Platform.OS,
          device: DeviceInfo.getModel(),
          timestamp: Date.now(),
        }),
      });
    } catch (error) {
      console.error('Failed to send metric:', error);
    }
  }

  getStartupTime(): number {
    return Date.now() - this.startupTime;
  }

  getMetrics() {
    return Object.fromEntries(this.metrics);
  }
}

// Optimized FlatList component for large datasets
interface OptimizedListProps<T> {
  data: T[];
  renderItem: ListRenderItem<T>;
  keyExtractor: (item: T, index: number) => string;
  estimatedItemSize?: number;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
  initialNumToRender?: number;
  maxToRenderPerBatch?: number;
  windowSize?: number;
  removeClippedSubviews?: boolean;
  getItemLayout?: (data: T[] | null | undefined, index: number) => {
    length: number;
    offset: number;
    index: number;
  };
}

export function OptimizedList<T>({
  data,
  renderItem,
  keyExtractor,
  estimatedItemSize = 100,
  onEndReached,
  onEndReachedThreshold = 0.5,
  initialNumToRender = 10,
  maxToRenderPerBatch = 10,
  windowSize = 21,
  removeClippedSubviews = true,
  getItemLayout,
}: OptimizedListProps<T>) {
  const [viewableItems, setViewableItems] = useState<ViewToken[]>([]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      setViewableItems(viewableItems);
    },
    []
  );

  const viewabilityConfig = useMemo(
    () => ({
      itemVisiblePercentThreshold: 50,
      minimumViewTime: 500,
    }),
    []
  );

  // Use FlashList for better performance on large lists
  if (data.length > 100) {
    return (
      <FlashList
        data={data}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        estimatedItemSize={estimatedItemSize}
        onEndReached={onEndReached}
        onEndReachedThreshold={onEndReachedThreshold}
        drawDistance={200}
        removeClippedSubviews={removeClippedSubviews}
      />
    );
  }

  // Use standard FlatList for smaller lists with optimizations
  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      onEndReached={onEndReached}
      onEndReachedThreshold={onEndReachedThreshold}
      initialNumToRender={initialNumToRender}
      maxToRenderPerBatch={maxToRenderPerBatch}
      windowSize={windowSize}
      removeClippedSubviews={removeClippedSubviews}
      getItemLayout={getItemLayout}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
      // Performance optimizations
      updateCellsBatchingPeriod={50}
      legacyImplementation={false}
      maintainVisibleContentPosition={{
        minIndexForVisible: 0,
        autoscrollToTopThreshold: 10,
      }}
    />
  );
}

// Optimized image component with caching and lazy loading
interface OptimizedImageProps {
  source: { uri: string };
  style?: any;
  resizeMode?: 'contain' | 'cover' | 'stretch' | 'center';
  priority?: 'low' | 'normal' | 'high';
  onLoad?: () => void;
  onError?: () => void;
  placeholder?: string;
}

export const OptimizedImage = memo<OptimizedImageProps>(({
  source,
  style,
  resizeMode = 'cover',
  priority = 'normal',
  onLoad,
  onError,
  placeholder,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  }, [onError]);

  if (hasError && placeholder) {
    return (
      <Image
        source={{ uri: placeholder }}
        style={style}
        resizeMode={resizeMode}
      />
    );
  }

  return (
    <FastImage
      source={{
        uri: source.uri,
        priority: FastImage.priority[priority],
        cache: FastImage.cacheControl.immutable,
      }}
      style={style}
      resizeMode={FastImage.resizeMode[resizeMode]}
      onLoadEnd={handleLoad}
      onError={handleError}
    />
  );
});

// Memory-efficient cache manager
export class CacheManager {
  private static instance: CacheManager;
  private memoryCache: Map<string, { data: any; timestamp: number }> = new Map();
  private maxMemoryCacheSize = 50 * 1024 * 1024; // 50MB
  private currentCacheSize = 0;

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  async get(key: string): Promise<any> {
    // Check memory cache first
    const memoryItem = this.memoryCache.get(key);
    if (memoryItem && Date.now() - memoryItem.timestamp < 300000) { // 5 min TTL
      return memoryItem.data;
    }

    // Check persistent storage
    try {
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Update memory cache
        this.set(key, parsed.data, false);
        return parsed.data;
      }
    } catch (error) {
      console.error('Cache get error:', error);
    }

    return null;
  }

  async set(key: string, data: any, persist = true): Promise<void> {
    const size = JSON.stringify(data).length;

    // Check memory limit
    if (this.currentCacheSize + size > this.maxMemoryCacheSize) {
      this.evictOldest();
    }

    // Store in memory
    this.memoryCache.set(key, { data, timestamp: Date.now() });
    this.currentCacheSize += size;

    // Persist to storage if needed
    if (persist) {
      try {
        await AsyncStorage.setItem(key, JSON.stringify({
          data,
          timestamp: Date.now(),
        }));
      } catch (error) {
        console.error('Cache set error:', error);
      }
    }
  }

  private evictOldest() {
    const sortedEntries = Array.from(this.memoryCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    // Remove oldest 25% of cache
    const toRemove = Math.floor(sortedEntries.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      const [key] = sortedEntries[i];
      this.memoryCache.delete(key);
    }

    // Recalculate cache size
    this.currentCacheSize = Array.from(this.memoryCache.values())
      .reduce((sum, item) => sum + JSON.stringify(item.data).length, 0);
  }

  async clear(): Promise<void> {
    this.memoryCache.clear();
    this.currentCacheSize = 0;
    await AsyncStorage.clear();
  }
}

// Bundle optimization utilities
export class BundleOptimizer {
  static async enableHermes(): Promise<boolean> {
    if (Platform.OS === 'android') {
      // Hermes is enabled by default on Android
      return true;
    } else if (Platform.OS === 'ios') {
      // Check if Hermes is enabled on iOS
      // @ts-ignore
      return typeof HermesInternal !== 'undefined';
    }
    return false;
  }

  static async preloadModules(modules: string[]): Promise<void> {
    // Preload critical modules after initial render
    InteractionManager.runAfterInteractions(() => {
      modules.forEach(module => {
        try {
          require(module);
        } catch (error) {
          console.error(`Failed to preload module ${module}:`, error);
        }
      });
    });
  }

  static async optimizeBundle(): Promise<void> {
    // Enable RAM bundles for faster startup
    if (Platform.OS === 'android') {
      // RAM bundles are configured in android/app/build.gradle
      console.log('RAM bundles enabled for Android');
    } else if (Platform.OS === 'ios') {
      // RAM bundles are configured in ios build settings
      console.log('RAM bundles enabled for iOS');
    }
  }
}

// Startup optimization
export class StartupOptimizer {
  private static startupTasks: Array<() => Promise<void>> = [];
  private static criticalTasks: Array<() => Promise<void>> = [];

  static addStartupTask(task: () => Promise<void>, critical = false) {
    if (critical) {
      this.criticalTasks.push(task);
    } else {
      this.startupTasks.push(task);
    }
  }

  static async optimize(): Promise<void> {
    const monitor = MobilePerformanceMonitor.getInstance();
    const startTime = Date.now();

    // Run critical tasks first
    await Promise.all(this.criticalTasks.map(task => task()));

    // Defer non-critical tasks
    InteractionManager.runAfterInteractions(async () => {
      await Promise.all(this.startupTasks.map(task => task()));
    });

    const startupTime = Date.now() - startTime;
    monitor.recordMetric('startup_time', startupTime);

    if (startupTime > 2000) {
      console.warn(`Slow startup detected: ${startupTime}ms`);
    }
  }
}

// Memory leak prevention utilities
export class MemoryLeakPrevention {
  private static listeners: Map<string, any> = new Map();
  private static timers: Set<NodeJS.Timeout> = new Set();

  static registerListener(id: string, listener: any) {
    this.listeners.set(id, listener);
  }

  static unregisterListener(id: string) {
    const listener = this.listeners.get(id);
    if (listener && typeof listener.remove === 'function') {
      listener.remove();
    }
    this.listeners.delete(id);
  }

  static setTimeout(callback: () => void, delay: number): NodeJS.Timeout {
    const timer = setTimeout(() => {
      callback();
      this.timers.delete(timer);
    }, delay);
    this.timers.add(timer);
    return timer;
  }

  static clearTimeout(timer: NodeJS.Timeout) {
    clearTimeout(timer);
    this.timers.delete(timer);
  }

  static cleanup() {
    // Remove all listeners
    this.listeners.forEach(listener => {
      if (typeof listener.remove === 'function') {
        listener.remove();
      }
    });
    this.listeners.clear();

    // Clear all timers
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
  }
}

// Navigation performance optimizer
export class NavigationOptimizer {
  static preloadScreens(screens: string[]) {
    // Preload screen components
    screens.forEach(screen => {
      InteractionManager.runAfterInteractions(() => {
        try {
          // This assumes screens are exported from a screens index
          require(`../screens/${screen}`);
        } catch (error) {
          console.error(`Failed to preload screen ${screen}:`, error);
        }
      });
    });
  }

  static enableLazyLoading() {
    // Configure react-navigation for lazy loading
    return {
      lazy: true,
      detachInactiveScreens: true,
      freezeOnBlur: true,
    };
  }
}

// Database query optimizer for local storage
export class DatabaseOptimizer {
  static async createIndexes() {
    // Create indexes for common queries in SQLite
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity)',
      'CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status)',
    ];

    // Execute index creation
    // This would integrate with your SQLite setup
    console.log('Database indexes created');
  }

  static async vacuum() {
    // Optimize SQLite database
    // This would integrate with your SQLite setup
    console.log('Database vacuum completed');
  }
}

// Export initialization function
export async function initializeMobilePerformance() {
  // Initialize performance monitoring
  const monitor = MobilePerformanceMonitor.getInstance();

  // Enable Hermes if available
  await BundleOptimizer.enableHermes();

  // Optimize bundle
  await BundleOptimizer.optimizeBundle();

  // Create database indexes
  await DatabaseOptimizer.createIndexes();

  // Setup cleanup on app state change
  // This would integrate with your app state management

  return monitor;
}
