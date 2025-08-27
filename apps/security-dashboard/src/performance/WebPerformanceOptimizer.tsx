import React, { lazy, Suspense, useEffect, useState, useCallback, memo } from 'react';
import { IntersectionOptions, useInView } from 'react-intersection-observer';
import { ErrorBoundary } from 'react-error-boundary';

// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceEntry[]> = new Map();
  private observers: PerformanceObserver[] = [];

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  constructor() {
    this.initializeObservers();
  }

  private initializeObservers() {
    // Observe Core Web Vitals
    if ('PerformanceObserver' in window) {
      // LCP (Largest Contentful Paint)
      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.recordMetric('LCP', lastEntry.startTime);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);

      // FID (First Input Delay)
      const fidObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        entries.forEach((entry: any) => {
          if (entry.processingStart && entry.startTime) {
            const fid = entry.processingStart - entry.startTime;
            this.recordMetric('FID', fid);
          }
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);

      // CLS (Cumulative Layout Shift)
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
            this.recordMetric('CLS', clsValue);
          }
        }
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);
    }
  }

  recordMetric(name: string, value: number) {
    const entry = {
      name,
      value,
      timestamp: Date.now(),
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)?.push(entry as any);

    // Send to analytics if threshold exceeded
    this.checkThresholds(name, value);
  }

  private checkThresholds(metric: string, value: number) {
    const thresholds = {
      LCP: 2500, // 2.5s
      FID: 100,  // 100ms
      CLS: 0.1,  // 0.1
      TTFB: 800, // 800ms
    };

    if (thresholds[metric as keyof typeof thresholds] &&
        value > thresholds[metric as keyof typeof thresholds]) {
      console.warn(`Performance threshold exceeded for ${metric}: ${value}`);
      // Send to monitoring service
      this.sendToMonitoring(metric, value);
    }
  }

  private sendToMonitoring(metric: string, value: number) {
    // Send to backend monitoring service
    fetch('/api/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metric, value, timestamp: Date.now() }),
    }).catch(console.error);
  }

  getMetrics() {
    return Object.fromEntries(this.metrics);
  }

  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Virtual scrolling component for large lists
interface VirtualListProps<T> {
  items: T[];
  height: number;
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
}

export function VirtualList<T>({
  items,
  height,
  itemHeight,
  renderItem,
  overscan = 3
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + height) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setScrollTop(target.scrollTop);
    setIsScrolling(true);
  }, []);

  useEffect(() => {
    if (isScrolling) {
      const timeout = setTimeout(() => setIsScrolling(false), 150);
      return () => clearTimeout(timeout);
    }
  }, [isScrolling]);

  return (
    <div
      style={{ height, overflow: 'auto' }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, index) => (
            <div key={startIndex + index} style={{ height: itemHeight }}>
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Lazy loading wrapper with intersection observer
interface LazyLoadProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  rootMargin?: string;
  threshold?: number;
}

export const LazyLoad: React.FC<LazyLoadProps> = memo(({
  children,
  fallback = <div>Loading...</div>,
  rootMargin = '100px',
  threshold = 0.1,
}) => {
  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin,
    threshold,
  });

  return (
    <div ref={ref}>
      {inView ? children : fallback}
    </div>
  );
});

// Image optimization component
interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  loading?: 'lazy' | 'eager';
  sizes?: string;
  srcSet?: string;
  onLoad?: () => void;
  onError?: () => void;
  className?: string;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = memo(({
  src,
  alt,
  width,
  height,
  loading = 'lazy',
  sizes,
  srcSet,
  onLoad,
  onError,
  className,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
    onError?.();
  }, [onError]);

  // Generate srcSet for responsive images
  const generateSrcSet = useCallback(() => {
    if (srcSet) return srcSet;

    const baseUrl = src.split('.').slice(0, -1).join('.');
    const extension = src.split('.').pop();

    return `
      ${baseUrl}-320w.${extension} 320w,
      ${baseUrl}-640w.${extension} 640w,
      ${baseUrl}-1280w.${extension} 1280w,
      ${baseUrl}-1920w.${extension} 1920w
    `.trim();
  }, [src, srcSet]);

  if (hasError) {
    return <div className="image-error">Failed to load image</div>;
  }

  return (
    <picture>
      <source
        type="image/webp"
        srcSet={generateSrcSet().replace(/\.(jpg|png)/g, '.webp')}
      />
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        sizes={sizes || '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'}
        srcSet={generateSrcSet()}
        onLoad={handleLoad}
        onError={handleError}
        className={`${className} ${isLoaded ? 'loaded' : 'loading'}`}
        style={{
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out',
        }}
      />
    </picture>
  );
});

// Memoized component wrapper for expensive renders
export function withMemo<P extends object>(
  Component: React.ComponentType<P>,
  propsAreEqual?: (prevProps: P, nextProps: P) => boolean
) {
  return memo(Component, propsAreEqual);
}

// Request idle callback wrapper for non-critical updates
export function useIdleCallback(callback: () => void, delay = 2000) {
  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(callback, { timeout: delay });
      return () => window.cancelIdleCallback(id);
    } else {
      const timeout = setTimeout(callback, delay);
      return () => clearTimeout(timeout);
    }
  }, [callback, delay]);
}

// Debounced value hook for expensive operations
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timeout);
  }, [value, delay]);

  return debouncedValue;
}

// Service Worker registration for offline caching
export async function registerServiceWorker() {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);

      // Check for updates periodically
      setInterval(() => {
        registration.update();
      }, 60000); // Check every minute

      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
}

// Bundle size analyzer component
export const BundleAnalyzer: React.FC = () => {
  const [bundleStats, setBundleStats] = useState<any>(null);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Load bundle stats in development
      fetch('/__bundle_stats__')
        .then(res => res.json())
        .then(setBundleStats)
        .catch(console.error);
    }
  }, []);

  if (!bundleStats) return null;

  return (
    <div className="bundle-analyzer">
      <h3>Bundle Size Analysis</h3>
      <pre>{JSON.stringify(bundleStats, null, 2)}</pre>
    </div>
  );
};

// Code splitting utility
export const lazyWithPreload = <T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
) => {
  const Component = lazy(importFn);
  (Component as any).preload = importFn;
  return Component;
};

// Preload critical components
export function preloadComponents(components: Array<{ preload: () => Promise<any> }>) {
  components.forEach(component => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        component.preload();
      });
    } else {
      setTimeout(() => {
        component.preload();
      }, 1);
    }
  });
}

// Performance budget enforcement
export class PerformanceBudget {
  private static budgets = {
    bundleSize: 200 * 1024, // 200KB
    initialLoad: 2500, // 2.5s
    lcp: 2500, // 2.5s
    fid: 100, // 100ms
    cls: 0.1, // 0.1
    ttfb: 800, // 800ms
  };

  static check() {
    const violations: string[] = [];

    // Check bundle size
    if (window.performance && window.performance.getEntriesByType) {
      const resources = window.performance.getEntriesByType('resource');
      const jsResources = resources.filter(r => r.name.endsWith('.js'));
      const totalSize = jsResources.reduce((sum, r: any) => sum + (r.transferSize || 0), 0);

      if (totalSize > this.budgets.bundleSize) {
        violations.push(`Bundle size exceeds budget: ${totalSize} > ${this.budgets.bundleSize}`);
      }
    }

    // Check timing metrics
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      const loadTime = timing.loadEventEnd - timing.navigationStart;

      if (loadTime > this.budgets.initialLoad) {
        violations.push(`Initial load exceeds budget: ${loadTime}ms > ${this.budgets.initialLoad}ms`);
      }
    }

    if (violations.length > 0) {
      console.warn('Performance budget violations:', violations);
      // Send to monitoring
      this.reportViolations(violations);
    }

    return violations;
  }

  private static reportViolations(violations: string[]) {
    fetch('/api/performance/violations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ violations, timestamp: Date.now() }),
    }).catch(console.error);
  }
}

// Initialize performance monitoring on app load
export function initializePerformanceMonitoring() {
  const monitor = PerformanceMonitor.getInstance();

  // Register service worker
  registerServiceWorker();

  // Check performance budget
  if (document.readyState === 'complete') {
    PerformanceBudget.check();
  } else {
    window.addEventListener('load', () => {
      PerformanceBudget.check();
    });
  }

  // Cleanup on unload
  window.addEventListener('beforeunload', () => {
    monitor.cleanup();
  });

  return monitor;
}
