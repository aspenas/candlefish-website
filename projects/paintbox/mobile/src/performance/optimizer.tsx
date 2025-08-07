/**
 * React Native Performance Optimizer
 * Comprehensive performance optimizations for mobile app
 */

import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import {
  InteractionManager,
  LayoutAnimation,
  Platform,
  UIManager,
  findNodeHandle,
  NativeModules,
} from 'react-native';
import {
  runOnJS,
  runOnUI,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  cancelAnimation,
  measure,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Performance monitoring hook
 */
export function usePerformanceMonitor(componentName: string) {
  const renderCount = useRef(0);
  const mountTime = useRef(Date.now());
  const frameDrops = useRef(0);
  
  useEffect(() => {
    renderCount.current += 1;
    
    // Log performance metrics in development
    if (__DEV__) {
      const renderTime = Date.now() - mountTime.current;
      console.log(`[Performance] ${componentName}:`, {
        renders: renderCount.current,
        lifetime: renderTime,
        avgRenderTime: renderTime / renderCount.current,
      });
    }
    
    return () => {
      // Cleanup on unmount
      if (__DEV__) {
        console.log(`[Performance] ${componentName} unmounted after ${renderCount.current} renders`);
      }
    };
  });
  
  // Track frame drops
  const trackFrameDrops = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      // Check if main thread is blocked
      const start = Date.now();
      setTimeout(() => {
        const elapsed = Date.now() - start;
        if (elapsed > 16) { // More than 16ms means frame drop
          frameDrops.current += 1;
          if (__DEV__) {
            console.warn(`[Performance] Frame drop detected in ${componentName}: ${elapsed}ms`);
          }
        }
      }, 0);
    });
  }, [componentName]);
  
  return {
    trackFrameDrops,
    getRenderCount: () => renderCount.current,
    getFrameDrops: () => frameDrops.current,
  };
}

/**
 * Optimized FlatList with performance enhancements
 */
export const OptimizedFlatList = React.memo(({
  data,
  renderItem,
  keyExtractor,
  ...props
}: any) => {
  const [isReady, setIsReady] = React.useState(false);
  
  // Defer heavy list rendering
  useEffect(() => {
    InteractionManager.runAfterInteractions(() => {
      setIsReady(true);
    });
  }, []);
  
  // Memoized render function
  const memoizedRenderItem = useCallback(
    ({ item, index }: any) => {
      return renderItem({ item, index });
    },
    [renderItem]
  );
  
  // Optimized key extractor
  const memoizedKeyExtractor = useCallback(
    (item: any, index: number) => {
      return keyExtractor ? keyExtractor(item, index) : `item-${index}`;
    },
    [keyExtractor]
  );
  
  if (!isReady) {
    return null; // Or loading placeholder
  }
  
  return (
    <FlatList
      data={data}
      renderItem={memoizedRenderItem}
      keyExtractor={memoizedKeyExtractor}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      initialNumToRender={10}
      windowSize={10}
      getItemLayout={props.getItemLayout}
      {...props}
    />
  );
});

/**
 * Image caching component
 */
export class CachedImage extends React.PureComponent<{
  source: { uri: string };
  style?: any;
  onLoad?: () => void;
  onError?: (error: any) => void;
}> {
  state = {
    cachedSource: null,
  };
  
  async componentDidMount() {
    const { source } = this.props;
    if (source?.uri) {
      const cachedUri = await this.getCachedImage(source.uri);
      this.setState({ cachedSource: { uri: cachedUri } });
    }
  }
  
  async getCachedImage(uri: string) {
    try {
      // Check AsyncStorage cache
      const cacheKey = `image_cache_${uri}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      
      if (cached) {
        return cached;
      }
      
      // Download and cache
      const response = await fetch(uri);
      const blob = await response.blob();
      const base64 = await this.blobToBase64(blob);
      
      // Store in cache (with size limit check)
      const cacheSize = await this.getCacheSize();
      if (cacheSize < 50 * 1024 * 1024) { // 50MB limit
        await AsyncStorage.setItem(cacheKey, base64);
      }
      
      return base64;
    } catch (error) {
      console.error('Image cache error:', error);
      return uri; // Fallback to original URI
    }
  }
  
  blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  
  async getCacheSize(): Promise<number> {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(k => k.startsWith('image_cache_'));
    let totalSize = 0;
    
    for (const key of cacheKeys) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        totalSize += value.length;
      }
    }
    
    return totalSize;
  }
  
  render() {
    const { source, style, onLoad, onError } = this.props;
    const { cachedSource } = this.state;
    
    return (
      <Image
        source={cachedSource || source}
        style={style}
        onLoad={onLoad}
        onError={onError}
        resizeMode="cover"
      />
    );
  }
}

/**
 * Memory-optimized component wrapper
 */
export function withMemoryOptimization<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    releaseOnUnmount?: boolean;
    maxCacheSize?: number;
  } = {}
) {
  return React.memo((props: P) => {
    const componentRef = useRef<any>(null);
    const memoryCache = useRef(new Map());
    
    // Clean up memory on unmount
    useEffect(() => {
      return () => {
        if (options.releaseOnUnmount) {
          memoryCache.current.clear();
          
          // Force garbage collection if available
          if (global.gc) {
            global.gc();
          }
        }
      };
    }, []);
    
    // Monitor cache size
    useEffect(() => {
      const interval = setInterval(() => {
        if (memoryCache.current.size > (options.maxCacheSize || 100)) {
          // Remove oldest entries
          const entries = Array.from(memoryCache.current.entries());
          const toRemove = entries.slice(0, entries.length - (options.maxCacheSize || 100));
          toRemove.forEach(([key]) => memoryCache.current.delete(key));
        }
      }, 30000); // Check every 30 seconds
      
      return () => clearInterval(interval);
    }, []);
    
    return <Component ref={componentRef} {...props} />;
  });
}

/**
 * Network-aware data fetching hook
 */
export function useNetworkOptimizedFetch(url: string, options: {
  cacheTime?: number;
  retryCount?: number;
  timeout?: number;
} = {}) {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const cache = useRef(new Map());
  
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Check network status
      const netInfo = await NetInfo.fetch();
      
      // Check cache first
      const cacheKey = `${url}_${JSON.stringify(options)}`;
      const cached = cache.current.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < (options.cacheTime || 60000)) {
        setData(cached.data);
        setLoading(false);
        return;
      }
      
      // Adjust timeout based on network type
      let timeout = options.timeout || 10000;
      if (netInfo.type === 'cellular') {
        timeout *= 1.5; // Increase timeout for cellular
      }
      
      // Fetch with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Cache the result
      cache.current.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });
      
      setData(result);
    } catch (err: any) {
      setError(err.message);
      
      // Retry logic
      if (options.retryCount && options.retryCount > 0) {
        setTimeout(() => {
          fetchData();
        }, 1000);
      }
    } finally {
      setLoading(false);
    }
  }, [url, options]);
  
  useEffect(() => {
    fetchData();
  }, [url]);
  
  return { data, loading, error, refetch: fetchData };
}

/**
 * Gesture performance optimizer
 */
export function useOptimizedGesture() {
  const translationX = useSharedValue(0);
  const translationY = useSharedValue(0);
  const scale = useSharedValue(1);
  
  const gestureHandler = useCallback((event: any) => {
    'worklet';
    
    // Run on UI thread for better performance
    translationX.value = withSpring(event.translationX);
    translationY.value = withSpring(event.translationY);
    
    // Throttle updates to JS thread
    if (Math.abs(event.translationX) > 10 || Math.abs(event.translationY) > 10) {
      runOnJS(() => {
        // Handle significant movements
      })();
    }
  }, []);
  
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translationX.value },
        { translateY: translationY.value },
        { scale: scale.value },
      ],
    };
  });
  
  return {
    gestureHandler,
    animatedStyle,
    reset: () => {
      'worklet';
      cancelAnimation(translationX);
      cancelAnimation(translationY);
      cancelAnimation(scale);
      translationX.value = withTiming(0);
      translationY.value = withTiming(0);
      scale.value = withTiming(1);
    },
  };
}

/**
 * Battery-aware performance mode
 */
export function useBatteryOptimization() {
  const [batteryLevel, setBatteryLevel] = React.useState(1);
  const [isLowPowerMode, setIsLowPowerMode] = React.useState(false);
  
  useEffect(() => {
    // Check battery level (iOS only for now)
    if (Platform.OS === 'ios' && NativeModules.DeviceInfo) {
      NativeModules.DeviceInfo.getBatteryLevel((level: number) => {
        setBatteryLevel(level);
        setIsLowPowerMode(level < 0.2); // Enable low power mode below 20%
      });
    }
  }, []);
  
  return {
    batteryLevel,
    isLowPowerMode,
    shouldReduceAnimations: isLowPowerMode,
    shouldReduceNetworkCalls: isLowPowerMode,
    shouldUseLowQualityImages: isLowPowerMode,
  };
}

/**
 * Performance metrics reporter
 */
export class PerformanceReporter {
  private static metrics: Map<string, any> = new Map();
  
  static startMeasure(name: string) {
    this.metrics.set(name, {
      start: Date.now(),
      name,
    });
  }
  
  static endMeasure(name: string) {
    const metric = this.metrics.get(name);
    if (metric) {
      metric.duration = Date.now() - metric.start;
      metric.end = Date.now();
      
      if (__DEV__) {
        console.log(`[Performance] ${name}: ${metric.duration}ms`);
      }
      
      // Send to analytics in production
      if (!__DEV__) {
        this.sendToAnalytics(metric);
      }
    }
  }
  
  static async sendToAnalytics(metric: any) {
    try {
      await fetch('https://api.candlefish.ai/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'performance',
          metric,
          platform: Platform.OS,
          version: Platform.Version,
          timestamp: Date.now(),
        }),
      });
    } catch (error) {
      // Silently fail analytics
    }
  }
  
  static getReport() {
    const report = Array.from(this.metrics.values()).map(m => ({
      name: m.name,
      duration: m.duration || 0,
      timestamp: m.end || m.start,
    }));
    
    return {
      metrics: report,
      summary: {
        totalMetrics: report.length,
        avgDuration: report.reduce((sum, m) => sum + m.duration, 0) / report.length || 0,
        maxDuration: Math.max(...report.map(m => m.duration)),
        minDuration: Math.min(...report.map(m => m.duration)),
      },
    };
  }
  
  static clear() {
    this.metrics.clear();
  }
}

export default {
  usePerformanceMonitor,
  OptimizedFlatList,
  CachedImage,
  withMemoryOptimization,
  useNetworkOptimizedFetch,
  useOptimizedGesture,
  useBatteryOptimization,
  PerformanceReporter,
};