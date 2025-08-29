/**
 * Performance optimization utilities for Security Dashboard
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { debounce, throttle } from 'lodash';

/**
 * Custom hook for debounced value updates
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default 300ms)
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Custom hook for throttled callbacks
 * @param callback - Function to throttle
 * @param delay - Delay in milliseconds
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const throttledCallback = useMemo(
    () =>
      throttle((...args: Parameters<T>) => callbackRef.current(...args), delay, {
        leading: true,
        trailing: true,
      }),
    [delay]
  );

  return throttledCallback as T;
}

/**
 * Custom hook for intersection observer (lazy loading)
 */
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
): [React.RefObject<HTMLElement>, boolean] {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsIntersecting(entry.isIntersecting),
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      }
    );

    observer.observe(element);
    return () => observer.unobserve(element);
  }, [options.threshold, options.root, options.rootMargin]);

  return [ref, isIntersecting];
}

/**
 * Virtual scrolling hook for large lists
 */
export interface VirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  getScrollElement?: () => HTMLElement | null;
}

export interface VirtualScrollResult {
  visibleItems: number[];
  totalHeight: number;
  offsetY: number;
}

export function useVirtualScroll<T>(
  items: T[],
  options: VirtualScrollOptions
): VirtualScrollResult {
  const { itemHeight, containerHeight, overscan = 3, getScrollElement } = options;
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    const scrollElement = getScrollElement ? getScrollElement() : window;
    if (!scrollElement) return;

    const handleScroll = throttle(() => {
      const top = scrollElement === window 
        ? window.pageYOffset 
        : (scrollElement as HTMLElement).scrollTop;
      setScrollTop(top);
    }, 16); // ~60fps

    const element = scrollElement === window ? window : scrollElement;
    element.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      element.removeEventListener('scroll', handleScroll);
      handleScroll.cancel();
    };
  }, [getScrollElement]);

  const visibleItems = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    const indices: number[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      indices.push(i);
    }
    return indices;
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  return {
    visibleItems,
    totalHeight: items.length * itemHeight,
    offsetY: Math.max(0, Math.floor(scrollTop / itemHeight) - overscan) * itemHeight,
  };
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private static marks = new Map<string, number>();
  private static measures = new Map<string, number[]>();

  static mark(name: string): void {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(name);
      this.marks.set(name, performance.now());
    }
  }

  static measure(name: string, startMark: string, endMark?: string): number | null {
    if (typeof performance === 'undefined') return null;

    const startTime = this.marks.get(startMark);
    const endTime = endMark ? this.marks.get(endMark) : performance.now();

    if (startTime === undefined || endTime === undefined) return null;

    const duration = endTime - startTime;
    
    // Store measurement for analysis
    if (!this.measures.has(name)) {
      this.measures.set(name, []);
    }
    this.measures.get(name)?.push(duration);

    // Log if in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`⚡ Performance: ${name} took ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  static getAverageTime(measureName: string): number {
    const measurements = this.measures.get(measureName);
    if (!measurements || measurements.length === 0) return 0;
    
    const sum = measurements.reduce((acc, val) => acc + val, 0);
    return sum / measurements.length;
  }

  static getMetrics(): Record<string, { average: number; count: number; total: number }> {
    const metrics: Record<string, { average: number; count: number; total: number }> = {};
    
    this.measures.forEach((measurements, name) => {
      const total = measurements.reduce((acc, val) => acc + val, 0);
      metrics[name] = {
        average: total / measurements.length,
        count: measurements.length,
        total,
      };
    });

    return metrics;
  }

  static clearMetrics(): void {
    this.marks.clear();
    this.measures.clear();
  }
}

/**
 * Request animation frame hook
 */
export function useAnimationFrame(callback: (deltaTime: number) => void): void {
  const requestRef = useRef<number>();
  const previousTimeRef = useRef<number>();
  const callbackRef = useRef(callback);
  
  callbackRef.current = callback;

  useEffect(() => {
    const animate = (time: number) => {
      if (previousTimeRef.current !== undefined) {
        const deltaTime = time - previousTimeRef.current;
        callbackRef.current(deltaTime);
      }
      previousTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);
}

/**
 * Memory-efficient data chunking
 */
export function* chunkArray<T>(array: T[], chunkSize: number): Generator<T[], void, unknown> {
  for (let i = 0; i < array.length; i += chunkSize) {
    yield array.slice(i, i + chunkSize);
  }
}

/**
 * Batch processor for heavy operations
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize = 10,
  delay = 0
): Promise<R[]> {
  const results: R[] = [];
  
  for (const batch of chunkArray(items, batchSize)) {
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
    
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return results;
}

/**
 * Web Worker pool for heavy computations
 */
export class WorkerPool {
  private workers: Worker[] = [];
  private queue: Array<{ 
    resolve: (value: any) => void; 
    reject: (error: any) => void;
    task: any;
  }> = [];
  private busyWorkers = new Set<Worker>();

  constructor(
    private workerScript: string,
    private poolSize = navigator.hardwareConcurrency || 4
  ) {
    this.initWorkers();
  }

  private initWorkers(): void {
    for (let i = 0; i < this.poolSize; i++) {
      const worker = new Worker(this.workerScript);
      worker.addEventListener('message', (e) => this.handleWorkerMessage(worker, e));
      worker.addEventListener('error', (e) => this.handleWorkerError(worker, e));
      this.workers.push(worker);
    }
  }

  private handleWorkerMessage(worker: Worker, event: MessageEvent): void {
    this.busyWorkers.delete(worker);
    
    const nextTask = this.queue.shift();
    if (nextTask) {
      this.executeTask(worker, nextTask);
    }
  }

  private handleWorkerError(worker: Worker, error: ErrorEvent): void {
    this.busyWorkers.delete(worker);
    console.error('Worker error:', error);
  }

  private executeTask(
    worker: Worker,
    task: { resolve: (value: any) => void; reject: (error: any) => void; task: any }
  ): void {
    this.busyWorkers.add(worker);
    
    const handler = (e: MessageEvent) => {
      worker.removeEventListener('message', handler);
      task.resolve(e.data);
      this.handleWorkerMessage(worker, e);
    };
    
    worker.addEventListener('message', handler);
    worker.postMessage(task.task);
  }

  execute<T>(task: any): Promise<T> {
    return new Promise((resolve, reject) => {
      const availableWorker = this.workers.find(w => !this.busyWorkers.has(w));
      
      if (availableWorker) {
        this.executeTask(availableWorker, { resolve, reject, task });
      } else {
        this.queue.push({ resolve, reject, task });
      }
    });
  }

  terminate(): void {
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.queue = [];
    this.busyWorkers.clear();
  }
}

/**
 * Lazy image loading component props
 */
export interface LazyImageProps {
  src: string;
  alt: string;
  placeholder?: string;
  className?: string;
  onLoad?: () => void;
}

/**
 * Performance budgets checker
 */
export interface PerformanceBudget {
  metric: string;
  budget: number;
  unit: 'ms' | 'kb' | 'mb';
}

export function checkPerformanceBudgets(budgets: PerformanceBudget[]): void {
  if (typeof performance === 'undefined' || !performance.getEntriesByType) return;

  const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  
  budgets.forEach(({ metric, budget, unit }) => {
    let value: number | undefined;
    
    switch (metric) {
      case 'FCP':
        const fcp = performance.getEntriesByName('first-contentful-paint')[0];
        value = fcp?.startTime;
        break;
      case 'LCP':
        // Get from PerformanceObserver
        break;
      case 'TTI':
        value = navigationTiming.loadEventEnd - navigationTiming.fetchStart;
        break;
      case 'bundleSize':
        // Check resource sizes
        const resources = performance.getEntriesByType('resource');
        value = resources.reduce((total, resource) => {
          return total + (resource as PerformanceResourceTiming).transferSize;
        }, 0);
        break;
    }
    
    if (value && value > budget) {
      console.warn(`⚠️ Performance budget exceeded for ${metric}: ${value}${unit} > ${budget}${unit}`);
    }
  });
}