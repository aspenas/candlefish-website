import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { PerformanceMonitor } from './performanceOptimizations';

// Performance thresholds and targets
export const PERFORMANCE_TARGETS = {
  API_RESPONSE_TIME: {
    SIMPLE_QUERY: 200, // <200ms for simple queries
    COMPLEX_QUERY: 500, // <500ms for complex federated queries
    MUTATION: 300, // <300ms for mutations
    SUBSCRIPTION: 100, // <100ms for subscription updates
  },
  MOBILE_PERFORMANCE: {
    APP_LAUNCH: 2000, // <2 seconds app launch
    SCREEN_TRANSITION: 300, // <300ms screen transitions
    LIST_SCROLL_FPS: 55, // >55 FPS for smooth scrolling
    MEMORY_USAGE_MB: 150, // <150MB memory usage
  },
  NETWORK: {
    CACHE_HIT_RATE: 0.7, // >70% cache hit rate
    OFFLINE_SYNC_TIME: 5000, // <5 seconds to sync when online
    PHOTO_UPLOAD_RATE: 2048, // >2MB/s photo upload rate
  },
  USER_EXPERIENCE: {
    ESTIMATE_CREATION_TIME: 3600000, // <60 minutes total workflow
    PHOTO_CAPTURE_TO_SYNC: 30000, // <30 seconds photo capture to sync
    SEARCH_RESPONSE_TIME: 150, // <150ms search response
  },
};

// Performance monitoring service
class PerformanceMonitoringService {
  private performanceMonitor: PerformanceMonitor;
  private benchmarkResults: Map<string, BenchmarkResult[]> = new Map();
  private alertCallbacks: ((alert: PerformanceAlert) => void)[] = [];
  private isMonitoring = false;

  constructor() {
    this.performanceMonitor = PerformanceMonitor.getInstance();
  }

  // Start comprehensive performance monitoring
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    console.log('Starting performance monitoring...');

    // Monitor app lifecycle performance
    await this.monitorAppLifecycle();

    // Monitor network performance
    await this.monitorNetworkPerformance();

    // Monitor memory usage
    await this.monitorMemoryUsage();

    // Monitor user interaction performance
    await this.monitorUserInteractions();

    // Start periodic reporting
    this.startPeriodicReporting();
  }

  // Monitor app lifecycle events
  private async monitorAppLifecycle(): Promise<void> {
    const startTime = Date.now();
    
    // Monitor app launch time
    const launchTime = Date.now() - startTime;
    await this.recordMetric('app_launch_time', launchTime);
    
    if (launchTime > PERFORMANCE_TARGETS.MOBILE_PERFORMANCE.APP_LAUNCH) {
      this.triggerAlert({
        type: 'performance_degradation',
        metric: 'app_launch_time',
        value: launchTime,
        threshold: PERFORMANCE_TARGETS.MOBILE_PERFORMANCE.APP_LAUNCH,
        severity: 'warning',
      });
    }
  }

  // Monitor network performance
  private async monitorNetworkPerformance(): Promise<void> {
    NetInfo.addEventListener(async (state) => {
      const networkLatency = await this.measureNetworkLatency();
      await this.recordMetric('network_latency', networkLatency);

      // Monitor connection quality
      const connectionQuality = this.assessConnectionQuality(state);
      await this.recordMetric('connection_quality', connectionQuality);

      // Monitor cache performance
      const cacheHitRate = this.performanceMonitor.getCacheHitRate();
      await this.recordMetric('cache_hit_rate', cacheHitRate);

      if (cacheHitRate < PERFORMANCE_TARGETS.NETWORK.CACHE_HIT_RATE) {
        this.triggerAlert({
          type: 'low_cache_performance',
          metric: 'cache_hit_rate',
          value: cacheHitRate,
          threshold: PERFORMANCE_TARGETS.NETWORK.CACHE_HIT_RATE,
          severity: 'warning',
        });
      }
    });
  }

  // Monitor memory usage
  private async monitorMemoryUsage(): Promise<void> {
    setInterval(async () => {
      const memoryUsage = await this.measureMemoryUsage();
      await this.recordMetric('memory_usage_mb', memoryUsage);

      if (memoryUsage > PERFORMANCE_TARGETS.MOBILE_PERFORMANCE.MEMORY_USAGE_MB) {
        this.triggerAlert({
          type: 'high_memory_usage',
          metric: 'memory_usage_mb',
          value: memoryUsage,
          threshold: PERFORMANCE_TARGETS.MOBILE_PERFORMANCE.MEMORY_USAGE_MB,
          severity: 'critical',
        });
      }
    }, 30000); // Every 30 seconds
  }

  // Monitor user interactions
  private async monitorUserInteractions(): Promise<void> {
    // This would integrate with React Navigation and component lifecycle
    // For now, provide interface for manual tracking
    console.log('User interaction monitoring initialized');
  }

  // Record performance metrics
  async recordMetric(metricName: string, value: number, context?: any): Promise<void> {
    this.performanceMonitor.trackApiCall(metricName, value);
    
    // Store detailed metrics
    const metric: PerformanceMetric = {
      name: metricName,
      value,
      timestamp: Date.now(),
      context,
    };

    const key = `@paintbox/metrics/${metricName}`;
    const existingMetrics = await this.getStoredMetrics(key);
    existingMetrics.push(metric);
    
    // Keep only last 1000 metrics per type
    if (existingMetrics.length > 1000) {
      existingMetrics.splice(0, existingMetrics.length - 1000);
    }

    await AsyncStorage.setItem(key, JSON.stringify(existingMetrics));
  }

  // Run performance benchmarks
  async runBenchmarks(): Promise<BenchmarkSuite> {
    console.log('Running performance benchmarks...');
    
    const results: BenchmarkSuite = {
      api_performance: await this.benchmarkAPIPerformance(),
      mobile_performance: await this.benchmarkMobilePerformance(),
      network_performance: await this.benchmarkNetworkPerformance(),
      database_performance: await this.benchmarkDatabasePerformance(),
    };

    // Store benchmark results
    const timestamp = Date.now();
    await AsyncStorage.setItem(
      `@paintbox/benchmarks/${timestamp}`,
      JSON.stringify(results)
    );

    // Compare with previous benchmarks
    await this.compareBenchmarks(results);

    return results;
  }

  // Benchmark API performance
  private async benchmarkAPIPerformance(): Promise<BenchmarkResult[]> {
    const benchmarks: BenchmarkResult[] = [];

    // Test simple query performance
    const simpleQueryResult = await this.measureAPICall(
      'simple_query',
      () => this.simulateSimpleQuery()
    );
    benchmarks.push(simpleQueryResult);

    // Test complex federated query performance
    const complexQueryResult = await this.measureAPICall(
      'complex_query',
      () => this.simulateComplexQuery()
    );
    benchmarks.push(complexQueryResult);

    // Test mutation performance
    const mutationResult = await this.measureAPICall(
      'mutation',
      () => this.simulateMutation()
    );
    benchmarks.push(mutationResult);

    return benchmarks;
  }

  // Benchmark mobile performance
  private async benchmarkMobilePerformance(): Promise<BenchmarkResult[]> {
    const benchmarks: BenchmarkResult[] = [];

    // Test screen transition performance
    const transitionResult = await this.measureOperation(
      'screen_transition',
      () => this.simulateScreenTransition()
    );
    benchmarks.push(transitionResult);

    // Test list scrolling performance
    const scrollResult = await this.measureOperation(
      'list_scroll',
      () => this.simulateListScroll()
    );
    benchmarks.push(scrollResult);

    // Test image loading performance
    const imageLoadResult = await this.measureOperation(
      'image_load',
      () => this.simulateImageLoad()
    );
    benchmarks.push(imageLoadResult);

    return benchmarks;
  }

  // Benchmark network performance
  private async benchmarkNetworkPerformance(): Promise<BenchmarkResult[]> {
    const benchmarks: BenchmarkResult[] = [];

    // Test cache performance
    const cacheResult = await this.measureOperation(
      'cache_performance',
      () => this.testCachePerformance()
    );
    benchmarks.push(cacheResult);

    // Test offline sync performance
    const syncResult = await this.measureOperation(
      'offline_sync',
      () => this.simulateOfflineSync()
    );
    benchmarks.push(syncResult);

    return benchmarks;
  }

  // Benchmark database performance (would connect to GraphQL endpoint)
  private async benchmarkDatabasePerformance(): Promise<BenchmarkResult[]> {
    const benchmarks: BenchmarkResult[] = [];

    // Test pagination performance
    const paginationResult = await this.measureOperation(
      'pagination',
      () => this.simulatePagination()
    );
    benchmarks.push(paginationResult);

    // Test search performance
    const searchResult = await this.measureOperation(
      'search',
      () => this.simulateSearch()
    );
    benchmarks.push(searchResult);

    return benchmarks;
  }

  // Utility methods for measurements
  private async measureAPICall(
    name: string,
    operation: () => Promise<any>
  ): Promise<BenchmarkResult> {
    const startTime = Date.now();
    const startMemory = await this.measureMemoryUsage();
    
    try {
      await operation();
      const duration = Date.now() - startTime;
      const endMemory = await this.measureMemoryUsage();
      
      return {
        name,
        duration,
        success: true,
        memoryDelta: endMemory - startMemory,
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        name,
        duration: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      };
    }
  }

  private async measureOperation(
    name: string,
    operation: () => Promise<any>
  ): Promise<BenchmarkResult> {
    return this.measureAPICall(name, operation);
  }

  // Simulation methods for testing
  private async simulateSimpleQuery(): Promise<void> {
    // Simulate a simple GraphQL query
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
  }

  private async simulateComplexQuery(): Promise<void> {
    // Simulate a complex federated query
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
  }

  private async simulateMutation(): Promise<void> {
    // Simulate a GraphQL mutation
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
  }

  private async simulateScreenTransition(): Promise<void> {
    // Simulate screen transition
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
  }

  private async simulateListScroll(): Promise<void> {
    // Simulate list scrolling
    await new Promise(resolve => setTimeout(resolve, 16)); // 60fps target
  }

  private async simulateImageLoad(): Promise<void> {
    // Simulate image loading
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));
  }

  private async testCachePerformance(): Promise<void> {
    // Test cache hit/miss performance
    const { SmartCache } = await import('./performanceOptimizations');
    const testCache = new SmartCache(100, 10);
    
    // Populate cache
    for (let i = 0; i < 50; i++) {
      testCache.set(`key_${i}`, `value_${i}`);
    }
    
    // Test cache retrieval
    for (let i = 0; i < 50; i++) {
      testCache.get(`key_${i}`);
    }
  }

  private async simulateOfflineSync(): Promise<void> {
    // Simulate offline sync operation
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 4000));
  }

  private async simulatePagination(): Promise<void> {
    // Simulate paginated query
    await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 200));
  }

  private async simulateSearch(): Promise<void> {
    // Simulate search query
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 100));
  }

  // Utility functions
  private async measureNetworkLatency(): Promise<number> {
    const start = Date.now();
    try {
      const state = await NetInfo.fetch();
      return Date.now() - start;
    } catch {
      return -1;
    }
  }

  private assessConnectionQuality(state: any): number {
    if (!state.isConnected) return 0;
    
    // Rough quality assessment based on connection type
    switch (state.type) {
      case 'wifi': return 0.9;
      case 'cellular':
        switch (state.details?.cellularGeneration) {
          case '5g': return 0.9;
          case '4g': return 0.7;
          case '3g': return 0.4;
          default: return 0.2;
        }
      default: return 0.5;
    }
  }

  private async measureMemoryUsage(): Promise<number> {
    // Platform-specific memory measurement would go here
    // For now, return estimated usage
    return 80 + Math.random() * 40; // 80-120MB estimate
  }

  // Alert system
  private triggerAlert(alert: PerformanceAlert): void {
    console.warn('Performance Alert:', alert);
    this.alertCallbacks.forEach(callback => callback(alert));
  }

  onPerformanceAlert(callback: (alert: PerformanceAlert) => void): void {
    this.alertCallbacks.push(callback);
  }

  // Reporting
  private startPeriodicReporting(): void {
    // Generate performance reports every 5 minutes
    setInterval(async () => {
      const report = await this.generatePerformanceReport();
      console.log('Performance Report:', report);
    }, 300000);
  }

  async generatePerformanceReport(): Promise<PerformanceReport> {
    const report = await this.performanceMonitor.getPerformanceReport();
    
    // Get recent metrics
    const recentMetrics = await this.getRecentMetrics(300000); // Last 5 minutes
    
    return {
      timestamp: Date.now(),
      apiPerformance: {
        averageResponseTime: report.apiResponseTime,
        cacheHitRate: report.cacheHitRate,
        errorRate: report.errorRate,
        totalRequests: report.syncOperations,
      },
      mobilePerformance: {
        memoryUsage: report.memoryUsage,
        renderTime: report.renderTime,
        bundleSize: report.bundleSize,
      },
      networkPerformance: {
        networkLatency: report.networkLatency,
        offlineQueueSize: await this.getOfflineQueueSize(),
      },
      recentMetrics,
      alerts: await this.getRecentAlerts(),
    };
  }

  // Data retrieval methods
  private async getStoredMetrics(key: string): Promise<PerformanceMetric[]> {
    try {
      const stored = await AsyncStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private async getRecentMetrics(timeWindowMs: number): Promise<PerformanceMetric[]> {
    const cutoff = Date.now() - timeWindowMs;
    const keys = await AsyncStorage.getAllKeys();
    const metricKeys = keys.filter(key => key.startsWith('@paintbox/metrics/'));
    
    const allMetrics: PerformanceMetric[] = [];
    
    for (const key of metricKeys) {
      const metrics = await this.getStoredMetrics(key);
      const recentMetrics = metrics.filter(m => m.timestamp > cutoff);
      allMetrics.push(...recentMetrics);
    }
    
    return allMetrics.sort((a, b) => b.timestamp - a.timestamp);
  }

  private async getOfflineQueueSize(): Promise<number> {
    // Would get from offline sync service
    return 0;
  }

  private async getRecentAlerts(): Promise<PerformanceAlert[]> {
    // Would get recent alerts from storage
    return [];
  }

  private async compareBenchmarks(current: BenchmarkSuite): Promise<void> {
    // Compare with previous benchmarks and detect regressions
    const keys = await AsyncStorage.getAllKeys();
    const benchmarkKeys = keys.filter(key => key.startsWith('@paintbox/benchmarks/'));
    
    if (benchmarkKeys.length > 1) {
      // Get most recent previous benchmark
      const sortedKeys = benchmarkKeys.sort().reverse();
      const previousKey = sortedKeys[1]; // Second most recent
      
      try {
        const previousData = await AsyncStorage.getItem(previousKey);
        if (previousData) {
          const previous = JSON.parse(previousData) as BenchmarkSuite;
          this.detectPerformanceRegressions(previous, current);
        }
      } catch (error) {
        console.error('Error comparing benchmarks:', error);
      }
    }
  }

  private detectPerformanceRegressions(
    previous: BenchmarkSuite,
    current: BenchmarkSuite
  ): void {
    // Compare benchmark results and detect significant regressions
    const threshold = 1.2; // 20% slower is considered a regression
    
    for (const [category, currentResults] of Object.entries(current)) {
      const previousResults = previous[category as keyof BenchmarkSuite];
      if (!previousResults) continue;
      
      currentResults.forEach(currentResult => {
        const previousResult = previousResults.find(p => p.name === currentResult.name);
        if (!previousResult || !currentResult.success || !previousResult.success) return;
        
        if (currentResult.duration > previousResult.duration * threshold) {
          this.triggerAlert({
            type: 'performance_regression',
            metric: currentResult.name,
            value: currentResult.duration,
            threshold: previousResult.duration * threshold,
            severity: 'warning',
            context: {
              previousDuration: previousResult.duration,
              regressionPercentage: ((currentResult.duration - previousResult.duration) / previousResult.duration) * 100
            }
          });
        }
      });
    }
  }

  // Public interface
  stopMonitoring(): void {
    this.isMonitoring = false;
    console.log('Performance monitoring stopped');
  }

  async getPerformanceStats(): Promise<any> {
    return this.performanceMonitor.getPerformanceReport();
  }
}

// Type definitions
interface BenchmarkResult {
  name: string;
  duration: number;
  success: boolean;
  memoryDelta?: number;
  error?: string;
  timestamp: number;
}

interface BenchmarkSuite {
  api_performance: BenchmarkResult[];
  mobile_performance: BenchmarkResult[];
  network_performance: BenchmarkResult[];
  database_performance: BenchmarkResult[];
}

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  context?: any;
}

interface PerformanceAlert {
  type: 'performance_degradation' | 'low_cache_performance' | 'high_memory_usage' | 'performance_regression';
  metric: string;
  value: number;
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
  context?: any;
}

interface PerformanceReport {
  timestamp: number;
  apiPerformance: {
    averageResponseTime: number;
    cacheHitRate: number;
    errorRate: number;
    totalRequests: number;
  };
  mobilePerformance: {
    memoryUsage: number;
    renderTime: number;
    bundleSize: number;
  };
  networkPerformance: {
    networkLatency: number;
    offlineQueueSize: number;
  };
  recentMetrics: PerformanceMetric[];
  alerts: PerformanceAlert[];
}

// Export singleton
export const performanceMonitoringService = new PerformanceMonitoringService();

// React hook for performance monitoring
export function usePerformanceMonitoring() {
  return {
    startMonitoring: () => performanceMonitoringService.startMonitoring(),
    stopMonitoring: () => performanceMonitoringService.stopMonitoring(),
    recordMetric: (name: string, value: number, context?: any) => 
      performanceMonitoringService.recordMetric(name, value, context),
    runBenchmarks: () => performanceMonitoringService.runBenchmarks(),
    getStats: () => performanceMonitoringService.getPerformanceStats(),
    onAlert: (callback: (alert: PerformanceAlert) => void) => 
      performanceMonitoringService.onPerformanceAlert(callback),
  };
}

export { PERFORMANCE_TARGETS };
export default performanceMonitoringService;