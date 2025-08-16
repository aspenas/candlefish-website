import { getCache } from '@/lib/cache/three-tier-cache';

/**
 * Comprehensive Performance Monitoring System
 * Tracks metrics, identifies bottlenecks, and provides optimization insights
 */

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  category: 'bundle' | 'cache' | 'api' | 'calculation' | 'render';
}

interface PerformanceThresholds {
  bundleSize: number; // MB
  chunkSize: number; // KB
  apiResponseTime: number; // ms
  cacheHitRate: number; // percentage
  calculationTime: number; // ms
  renderTime: number; // ms
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  bundleSize: 1.2, // 1.2MB max bundle
  chunkSize: 150, // 150KB max chunk
  apiResponseTime: 150, // 150ms p95
  cacheHitRate: 95, // 95% cache hit rate
  calculationTime: 100, // 100ms max calculation
  renderTime: 16, // 16ms for 60fps
};

export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private thresholds: PerformanceThresholds;
  private observers: Map<string, PerformanceObserver> = new Map();
  private cache = getCache();
  private reportInterval: NodeJS.Timeout | null = null;
  private webVitals: Record<string, number> = {};

  constructor(thresholds: Partial<PerformanceThresholds> = {}) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
    this.initializeObservers();
    this.startReporting();
  }

  /**
   * Initialize performance observers
   */
  private initializeObservers(): void {
    if (typeof window === 'undefined') return;

    // Navigation timing
    this.observeNavigationTiming();

    // Resource timing
    this.observeResourceTiming();

    // Long tasks
    this.observeLongTasks();

    // Web Vitals
    this.observeWebVitals();

    // Custom metrics
    this.observeCustomMetrics();
  }

  /**
   * Observe navigation timing
   */
  private observeNavigationTiming(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const nav = entry as PerformanceNavigationTiming;
            
            this.recordMetric({
              name: 'page_load_time',
              value: nav.loadEventEnd - nav.fetchStart,
              unit: 'ms',
              timestamp: Date.now(),
              category: 'render',
            });

            this.recordMetric({
              name: 'dom_content_loaded',
              value: nav.domContentLoadedEventEnd - nav.fetchStart,
              unit: 'ms',
              timestamp: Date.now(),
              category: 'render',
            });
          }
        }
      });

      observer.observe({ entryTypes: ['navigation'] });
      this.observers.set('navigation', observer);
    } catch (error) {
      console.error('Failed to observe navigation timing:', error);
    }
  }

  /**
   * Observe resource timing
   */
  private observeResourceTiming(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries() as PerformanceResourceTiming[];
        
        // Group by resource type
        const resourceGroups: Record<string, number[]> = {};
        
        entries.forEach(entry => {
          const type = this.getResourceType(entry.name);
          if (!resourceGroups[type]) {
            resourceGroups[type] = [];
          }
          resourceGroups[type].push(entry.duration);
        });

        // Record aggregated metrics
        Object.entries(resourceGroups).forEach(([type, durations]) => {
          const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
          
          this.recordMetric({
            name: `resource_${type}_avg_load`,
            value: avg,
            unit: 'ms',
            timestamp: Date.now(),
            category: 'bundle',
          });
        });
      });

      observer.observe({ entryTypes: ['resource'] });
      this.observers.set('resource', observer);
    } catch (error) {
      console.error('Failed to observe resource timing:', error);
    }
  }

  /**
   * Observe long tasks
   */
  private observeLongTasks(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) { // Tasks longer than 50ms
            this.recordMetric({
              name: 'long_task',
              value: entry.duration,
              unit: 'ms',
              timestamp: Date.now(),
              category: 'render',
            });

            // Alert if too many long tasks
            const recentLongTasks = this.getRecentMetrics('long_task', 60000);
            if (recentLongTasks.length > 10) {
              console.warn('Performance: Too many long tasks detected');
            }
          }
        }
      });

      observer.observe({ entryTypes: ['longtask'] });
      this.observers.set('longtask', observer);
    } catch (error) {
      // Long task observer not supported
    }
  }

  /**
   * Observe Web Vitals
   */
  private observeWebVitals(): void {
    if (typeof window === 'undefined') return;

    // Largest Contentful Paint (LCP)
    this.observeLCP();

    // First Input Delay (FID)
    this.observeFID();

    // Cumulative Layout Shift (CLS)
    this.observeCLS();

    // Time to First Byte (TTFB)
    this.observeTTFB();

    // First Contentful Paint (FCP)
    this.observeFCP();
  }

  private observeLCP(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        
        this.webVitals.lcp = lastEntry.renderTime || lastEntry.loadTime;
        
        this.recordMetric({
          name: 'lcp',
          value: this.webVitals.lcp,
          unit: 'ms',
          timestamp: Date.now(),
          category: 'render',
        });
      });

      observer.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.set('lcp', observer);
    } catch (error) {
      // LCP observer not supported
    }
  }

  private observeFID(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'first-input') {
            const fid = (entry as any).processingStart - entry.startTime;
            this.webVitals.fid = fid;
            
            this.recordMetric({
              name: 'fid',
              value: fid,
              unit: 'ms',
              timestamp: Date.now(),
              category: 'render',
            });
          }
        }
      });

      observer.observe({ entryTypes: ['first-input'] });
      this.observers.set('fid', observer);
    } catch (error) {
      // FID observer not supported
    }
  }

  private observeCLS(): void {
    if (!('PerformanceObserver' in window)) return;

    let clsValue = 0;
    let clsEntries: any[] = [];

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsEntries.push(entry);
            clsValue += (entry as any).value;
          }
        }
        
        this.webVitals.cls = clsValue;
        
        this.recordMetric({
          name: 'cls',
          value: clsValue,
          unit: 'score',
          timestamp: Date.now(),
          category: 'render',
        });
      });

      observer.observe({ entryTypes: ['layout-shift'] });
      this.observers.set('cls', observer);
    } catch (error) {
      // CLS observer not supported
    }
  }

  private observeTTFB(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        const ttfb = navigation.responseStart - navigation.fetchStart;
        this.webVitals.ttfb = ttfb;
        
        this.recordMetric({
          name: 'ttfb',
          value: ttfb,
          unit: 'ms',
          timestamp: Date.now(),
          category: 'api',
        });
      }
    });
  }

  private observeFCP(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.webVitals.fcp = entry.startTime;
            
            this.recordMetric({
              name: 'fcp',
              value: entry.startTime,
              unit: 'ms',
              timestamp: Date.now(),
              category: 'render',
            });
          }
        }
      });

      observer.observe({ entryTypes: ['paint'] });
      this.observers.set('fcp', observer);
    } catch (error) {
      // FCP observer not supported
    }
  }

  /**
   * Observe custom metrics
   */
  private observeCustomMetrics(): void {
    // API response times
    this.interceptFetch();

    // Cache metrics
    this.monitorCache();

    // Calculation times
    this.monitorCalculations();
  }

  /**
   * Intercept fetch to measure API response times
   */
  private interceptFetch(): void {
    if (typeof window === 'undefined') return;

    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const startTime = performance.now();
      const url = args[0] instanceof Request ? args[0].url : args[0];
      
      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - startTime;
        
        this.recordMetric({
          name: 'api_response_time',
          value: duration,
          unit: 'ms',
          timestamp: Date.now(),
          category: 'api',
        });

        // Check against threshold
        if (duration > this.thresholds.apiResponseTime) {
          console.warn(`Slow API response: ${url} took ${duration.toFixed(2)}ms`);
        }

        return response;
      } catch (error) {
        const duration = performance.now() - startTime;
        
        this.recordMetric({
          name: 'api_error',
          value: 1,
          unit: 'count',
          timestamp: Date.now(),
          category: 'api',
        });

        throw error;
      }
    };
  }

  /**
   * Monitor cache performance
   */
  private monitorCache(): void {
    setInterval(() => {
      const metrics = this.cache.getMetrics();
      
      this.recordMetric({
        name: 'cache_hit_rate',
        value: parseFloat(metrics.overallHitRate),
        unit: '%',
        timestamp: Date.now(),
        category: 'cache',
      });

      // Check against threshold
      if (parseFloat(metrics.overallHitRate) < this.thresholds.cacheHitRate) {
        console.warn(`Low cache hit rate: ${metrics.overallHitRate}`);
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Monitor calculation performance
   */
  private monitorCalculations(): void {
    // This would be called from the calculation engine
    (window as any).reportCalculationTime = (duration: number) => {
      this.recordMetric({
        name: 'calculation_time',
        value: duration,
        unit: 'ms',
        timestamp: Date.now(),
        category: 'calculation',
      });

      if (duration > this.thresholds.calculationTime) {
        console.warn(`Slow calculation: ${duration.toFixed(2)}ms`);
      }
    };
  }

  /**
   * Record a metric
   */
  recordMetric(metric: PerformanceMetric): void {
    const key = `${metric.category}:${metric.name}`;
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    
    const metrics = this.metrics.get(key)!;
    metrics.push(metric);
    
    // Keep only last 1000 metrics per key
    if (metrics.length > 1000) {
      metrics.shift();
    }
  }

  /**
   * Get recent metrics
   */
  private getRecentMetrics(
    name: string,
    timeWindow: number = 60000
  ): PerformanceMetric[] {
    const now = Date.now();
    const metrics: PerformanceMetric[] = [];
    
    this.metrics.forEach((values, key) => {
      if (key.includes(name)) {
        metrics.push(
          ...values.filter(m => now - m.timestamp <= timeWindow)
        );
      }
    });
    
    return metrics;
  }

  /**
   * Get resource type from URL
   */
  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'javascript';
    if (url.includes('.css')) return 'stylesheet';
    if (url.includes('.jpg') || url.includes('.png') || url.includes('.webp')) return 'image';
    if (url.includes('.woff') || url.includes('.ttf')) return 'font';
    if (url.includes('/api/')) return 'api';
    return 'other';
  }

  /**
   * Start periodic reporting
   */
  private startReporting(): void {
    this.reportInterval = setInterval(() => {
      this.generateReport();
    }, 60000); // Every minute
  }

  /**
   * Generate performance report
   */
  generateReport(): Record<string, any> {
    const report: Record<string, any> = {
      timestamp: Date.now(),
      webVitals: this.webVitals,
      metrics: {},
      violations: [],
      recommendations: [],
    };

    // Aggregate metrics by category
    const categories = ['bundle', 'cache', 'api', 'calculation', 'render'];
    
    categories.forEach(category => {
      const categoryMetrics: Record<string, any> = {};
      
      this.metrics.forEach((values, key) => {
        if (key.startsWith(category)) {
          const recentValues = this.getRecentMetrics(key.split(':')[1], 60000);
          
          if (recentValues.length > 0) {
            const avg = recentValues.reduce((sum, m) => sum + m.value, 0) / recentValues.length;
            const max = Math.max(...recentValues.map(m => m.value));
            const min = Math.min(...recentValues.map(m => m.value));
            
            categoryMetrics[key.split(':')[1]] = {
              avg: avg.toFixed(2),
              max: max.toFixed(2),
              min: min.toFixed(2),
              count: recentValues.length,
            };
          }
        }
      });
      
      report.metrics[category] = categoryMetrics;
    });

    // Check for violations
    this.checkViolations(report);

    // Generate recommendations
    this.generateRecommendations(report);

    // Log report
    console.log('Performance Report:', report);

    // Send to monitoring service if configured
    this.sendToMonitoring(report);

    return report;
  }

  /**
   * Check for threshold violations
   */
  private checkViolations(report: Record<string, any>): void {
    // Check API response time
    if (report.metrics.api?.api_response_time?.avg > this.thresholds.apiResponseTime) {
      report.violations.push({
        type: 'api_response_time',
        current: report.metrics.api.api_response_time.avg,
        threshold: this.thresholds.apiResponseTime,
        severity: 'high',
      });
    }

    // Check cache hit rate
    if (report.metrics.cache?.cache_hit_rate?.avg < this.thresholds.cacheHitRate) {
      report.violations.push({
        type: 'cache_hit_rate',
        current: report.metrics.cache.cache_hit_rate.avg,
        threshold: this.thresholds.cacheHitRate,
        severity: 'medium',
      });
    }

    // Check calculation time
    if (report.metrics.calculation?.calculation_time?.avg > this.thresholds.calculationTime) {
      report.violations.push({
        type: 'calculation_time',
        current: report.metrics.calculation.calculation_time.avg,
        threshold: this.thresholds.calculationTime,
        severity: 'high',
      });
    }
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(report: Record<string, any>): void {
    report.violations.forEach((violation: any) => {
      switch (violation.type) {
        case 'api_response_time':
          report.recommendations.push({
            issue: 'Slow API responses',
            solution: 'Implement response caching and optimize database queries',
            impact: 'High',
          });
          break;
          
        case 'cache_hit_rate':
          report.recommendations.push({
            issue: 'Low cache hit rate',
            solution: 'Increase cache TTL and implement predictive prefetching',
            impact: 'Medium',
          });
          break;
          
        case 'calculation_time':
          report.recommendations.push({
            issue: 'Slow calculations',
            solution: 'Use Web Workers and implement calculation result caching',
            impact: 'High',
          });
          break;
      }
    });

    // Web Vitals recommendations
    if (report.webVitals.lcp > 2500) {
      report.recommendations.push({
        issue: 'Poor LCP (Largest Contentful Paint)',
        solution: 'Optimize images and implement lazy loading',
        impact: 'High',
      });
    }

    if (report.webVitals.cls > 0.1) {
      report.recommendations.push({
        issue: 'High CLS (Cumulative Layout Shift)',
        solution: 'Set explicit dimensions for images and ads',
        impact: 'Medium',
      });
    }
  }

  /**
   * Send report to monitoring service
   */
  private sendToMonitoring(report: Record<string, any>): void {
    // Send to monitoring service (Sentry, DataDog, etc.)
    if ((window as any).Sentry) {
      (window as any).Sentry.addBreadcrumb({
        category: 'performance',
        data: report,
        level: 'info',
      });
    }
  }

  /**
   * Get current performance score
   */
  getPerformanceScore(): number {
    const weights = {
      lcp: 0.25,
      fid: 0.25,
      cls: 0.25,
      ttfb: 0.15,
      cacheHitRate: 0.1,
    };

    let score = 100;

    // LCP scoring
    if (this.webVitals.lcp) {
      if (this.webVitals.lcp <= 2500) score += 0;
      else if (this.webVitals.lcp <= 4000) score -= 10 * weights.lcp;
      else score -= 25 * weights.lcp;
    }

    // FID scoring
    if (this.webVitals.fid) {
      if (this.webVitals.fid <= 100) score += 0;
      else if (this.webVitals.fid <= 300) score -= 10 * weights.fid;
      else score -= 25 * weights.fid;
    }

    // CLS scoring
    if (this.webVitals.cls) {
      if (this.webVitals.cls <= 0.1) score += 0;
      else if (this.webVitals.cls <= 0.25) score -= 10 * weights.cls;
      else score -= 25 * weights.cls;
    }

    // TTFB scoring
    if (this.webVitals.ttfb) {
      if (this.webVitals.ttfb <= 800) score += 0;
      else if (this.webVitals.ttfb <= 1800) score -= 10 * weights.ttfb;
      else score -= 25 * weights.ttfb;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Cleanup
   */
  destroy(): void {
    // Stop reporting
    if (this.reportInterval) {
      clearInterval(this.reportInterval);
    }

    // Disconnect observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();

    // Clear metrics
    this.metrics.clear();
  }
}

// Singleton instance
let monitorInstance: PerformanceMonitor | null = null;

export function getPerformanceMonitor(): PerformanceMonitor {
  if (!monitorInstance) {
    monitorInstance = new PerformanceMonitor();
  }
  return monitorInstance;
}

export default PerformanceMonitor;