import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { NetworkService } from '@/services/network';

interface PerformanceConfig {
  enableLazyLoading?: boolean;
  enableImageCaching?: boolean;
  enableBackgroundRefresh?: boolean;
  maxConcurrentRequests?: number;
  cacheTimeout?: number;
}

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  networkLatency: number;
  cacheHitRate: number;
}

export const usePerformanceOptimization = (config: PerformanceConfig = {}) => {
  const {
    enableLazyLoading = true,
    enableImageCaching = true,
    enableBackgroundRefresh = true,
    maxConcurrentRequests = 3,
    cacheTimeout = 300000, // 5 minutes
  } = config;

  const { isOnline } = useSelector((state: RootState) => state.offline);
  const { animationsEnabled } = useSelector((state: RootState) => state.ui);

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    memoryUsage: 0,
    networkLatency: 0,
    cacheHitRate: 0,
  });

  const requestQueue = useRef<Array<() => Promise<any>>>([]);
  const activeRequests = useRef<number>(0);
  const renderStartTime = useRef<number>(0);
  const cacheStats = useRef({ hits: 0, misses: 0 });

  // Performance monitoring
  const startRenderTimer = useCallback(() => {
    renderStartTime.current = performance.now();
  }, []);

  const endRenderTimer = useCallback(() => {
    if (renderStartTime.current > 0) {
      const renderTime = performance.now() - renderStartTime.current;
      setMetrics(prev => ({ ...prev, renderTime }));
      renderStartTime.current = 0;
    }
  }, []);

  // Network request throttling
  const throttleRequest = useCallback(async <T>(
    requestFn: () => Promise<T>
  ): Promise<T> => {
    if (!isOnline) {
      throw new Error('Device is offline');
    }

    if (activeRequests.current >= maxConcurrentRequests) {
      // Queue the request
      return new Promise((resolve, reject) => {
        requestQueue.current.push(async () => {
          try {
            const result = await requestFn();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
      });
    }

    activeRequests.current++;

    try {
      const startTime = performance.now();
      const result = await requestFn();
      const networkLatency = performance.now() - startTime;

      setMetrics(prev => ({ ...prev, networkLatency }));
      return result;
    } finally {
      activeRequests.current--;
      processQueue();
    }
  }, [isOnline, maxConcurrentRequests]);

  const processQueue = useCallback(() => {
    if (requestQueue.current.length > 0 && activeRequests.current < maxConcurrentRequests) {
      const nextRequest = requestQueue.current.shift();
      if (nextRequest) {
        nextRequest();
      }
    }
  }, [maxConcurrentRequests]);

  // Lazy loading utilities
  const createIntersectionObserver = useCallback((
    callback: (entries: IntersectionObserverEntry[]) => void,
    options: IntersectionObserverInit = {}
  ) => {
    if (!enableLazyLoading) {
      return null;
    }

    const defaultOptions: IntersectionObserverInit = {
      root: null,
      rootMargin: '50px',
      threshold: 0.1,
      ...options,
    };

    return new IntersectionObserver(callback, defaultOptions);
  }, [enableLazyLoading]);

  // Image caching with performance tracking
  const cacheImage = useCallback(async (uri: string): Promise<string> => {
    if (!enableImageCaching) {
      cacheStats.current.misses++;
      return uri;
    }

    try {
      // Check if image is already cached
      const cached = await getCachedImage(uri);
      if (cached) {
        cacheStats.current.hits++;
        return cached;
      }

      // Cache miss - download and cache
      cacheStats.current.misses++;
      const cachedUri = await downloadAndCacheImage(uri);

      // Update cache hit rate
      const totalRequests = cacheStats.current.hits + cacheStats.current.misses;
      const cacheHitRate = (cacheStats.current.hits / totalRequests) * 100;
      setMetrics(prev => ({ ...prev, cacheHitRate }));

      return cachedUri;
    } catch (error) {
      console.error('Error caching image:', error);
      return uri; // Fallback to original URI
    }
  }, [enableImageCaching]);

  // Background refresh with network awareness
  const scheduleBackgroundRefresh = useCallback((
    refreshFn: () => Promise<void>,
    interval: number = 30000 // 30 seconds
  ) => {
    if (!enableBackgroundRefresh) {
      return () => {};
    }

    const intervalId = setInterval(async () => {
      if (isOnline && !NetworkService.isExpensiveConnection()) {
        try {
          await throttleRequest(refreshFn);
        } catch (error) {
          console.error('Background refresh failed:', error);
        }
      }
    }, interval);

    return () => clearInterval(intervalId);
  }, [enableBackgroundRefresh, isOnline, throttleRequest]);

  // Memory usage monitoring (simplified)
  const updateMemoryUsage = useCallback(() => {
    if ((global as any).performance?.memory) {
      const memory = (global as any).performance.memory;
      const memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
      setMetrics(prev => ({ ...prev, memoryUsage }));
    }
  }, []);

  // Cleanup function for performance optimization
  const cleanup = useCallback(() => {
    requestQueue.current = [];
    activeRequests.current = 0;
    cacheStats.current = { hits: 0, misses: 0 };
  }, []);

  // Performance-aware animation controls
  const shouldEnableAnimations = useCallback(() => {
    return animationsEnabled && metrics.renderTime < 16; // 60fps threshold
  }, [animationsEnabled, metrics.renderTime]);

  // Network-aware data loading
  const loadDataWithNetworkAwareness = useCallback(async <T>(
    loadFn: () => Promise<T>,
    fallbackFn?: () => Promise<T>
  ): Promise<T> => {
    const connectionInfo = await NetworkService.getNetworkInfo();

    if (!connectionInfo.isOnline) {
      if (fallbackFn) {
        return await fallbackFn();
      }
      throw new Error('No network connection');
    }

    if (connectionInfo.isExpensive) {
      // On expensive connections, implement data compression or reduced quality
      console.log('Using expensive connection - optimizing data transfer');
    }

    return await throttleRequest(loadFn);
  }, [throttleRequest]);

  useEffect(() => {
    const memoryInterval = setInterval(updateMemoryUsage, 5000);
    return () => {
      clearInterval(memoryInterval);
      cleanup();
    };
  }, [updateMemoryUsage, cleanup]);

  return {
    metrics,
    startRenderTimer,
    endRenderTimer,
    throttleRequest,
    createIntersectionObserver,
    cacheImage,
    scheduleBackgroundRefresh,
    shouldEnableAnimations,
    loadDataWithNetworkAwareness,
    cleanup,
  };
};

// Utility functions for image caching
const getCachedImage = async (uri: string): Promise<string | null> => {
  // Implementation would check AsyncStorage or device cache
  // This is a simplified version
  try {
    const cached = await import('@react-native-async-storage/async-storage')
      .then(AsyncStorage => AsyncStorage.default.getItem(`image_cache_${uri}`));
    return cached;
  } catch {
    return null;
  }
};

const downloadAndCacheImage = async (uri: string): Promise<string> => {
  // Implementation would download image and cache it
  // This is a simplified version
  try {
    const AsyncStorage = await import('@react-native-async-storage/async-storage')
      .then(mod => mod.default);

    // In a real implementation, you would:
    // 1. Download the image
    // 2. Save it to file system
    // 3. Store the local path in AsyncStorage

    await AsyncStorage.setItem(`image_cache_${uri}`, uri);
    return uri;
  } catch (error) {
    throw error;
  }
};

// Hook for lazy loading components
export const useLazyLoading = (threshold: number = 0.1) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const elementRef = useRef<any>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasLoaded) {
          setIsVisible(true);
          setHasLoaded(true);
        }
      },
      { threshold }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      if (elementRef.current) {
        observer.unobserve(elementRef.current);
      }
    };
  }, [threshold, hasLoaded]);

  return { elementRef, isVisible, hasLoaded };
};
