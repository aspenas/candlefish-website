/**
 * Performance Monitoring Service
 * Tracks app performance, memory usage, and provides optimization insights
 */

import { Platform, InteractionManager, AppState } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { MMKV } from 'react-native-mmkv';
import Config from '@/constants/config';

interface PerformanceMetric {
  timestamp: number;
  metric: string;
  value: number;
  context?: any;
}

interface MemoryWarning {
  timestamp: number;
  totalMemory: number;
  usedMemory: number;
  availableMemory: number;
  memoryPressure: 'low' | 'moderate' | 'critical';
}

interface PerformanceBenchmark {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: any;
}

interface NetworkMetric {
  timestamp: number;
  endpoint: string;
  method: string;
  duration: number;
  success: boolean;
  responseSize?: number;
  error?: string;
}

interface RenderMetric {
  component: string;
  renderTime: number;
  reRenders: number;
  timestamp: number;
  props?: any;
}

class PerformanceService {
  private storage = new MMKV({ id: 'performance_metrics' });
  private metrics: PerformanceMetric[] = [];
  private benchmarks: Map<string, PerformanceBenchmark> = new Map();
  private renderMetrics: RenderMetric[] = [];
  private networkMetrics: NetworkMetric[] = [];
  private memoryWarnings: MemoryWarning[] = [];
  
  private isEnabled: boolean;
  private maxMetricsCount = 1000;
  private deviceInfo: any = {};
  
  constructor() {
    this.isEnabled = __DEV__ || Config.FEATURES.PERFORMANCE_MONITORING;
    this.initializeDeviceInfo();
    this.startPerformanceMonitoring();
  }

  /**
   * Initialize device information
   */
  private async initializeDeviceInfo(): Promise<void> {
    try {
      this.deviceInfo = {
        brand: DeviceInfo.getBrand(),
        model: await DeviceInfo.getModel(),
        systemName: DeviceInfo.getSystemName(),
        systemVersion: DeviceInfo.getSystemVersion(),
        totalMemory: await DeviceInfo.getTotalMemory(),
        maxMemory: await DeviceInfo.getMaxMemory(),
        deviceId: await DeviceInfo.getUniqueId(),
        buildNumber: DeviceInfo.getBuildNumber(),
        version: DeviceInfo.getVersion(),
        bundleId: DeviceInfo.getBundleId(),
        isEmulator: await DeviceInfo.isEmulator(),
      };
    } catch (error) {
      console.error('Failed to get device info:', error);
    }
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    if (!this.isEnabled) return;

    // Monitor app state changes
    AppState.addEventListener('change', this.handleAppStateChange.bind(this));

    // Monitor memory usage periodically
    this.startMemoryMonitoring();

    // Monitor interaction responsiveness
    this.monitorInteractions();
  }

  /**
   * Handle app state changes
   */
  private handleAppStateChange(nextAppState: string): void {
    this.recordMetric('app_state_change', 1, { state: nextAppState });
    
    if (nextAppState === 'active') {
      this.recordMetric('app_foreground', performance.now());
    } else if (nextAppState === 'background') {
      this.recordMetric('app_background', performance.now());
    }
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    const monitorMemory = async () => {
      try {
        const usedMemory = await DeviceInfo.getUsedMemory();
        const totalMemory = await DeviceInfo.getTotalMemory();
        const availableMemory = totalMemory - usedMemory;
        const memoryUsagePercent = (usedMemory / totalMemory) * 100;

        this.recordMetric('memory_usage', memoryUsagePercent, {
          usedMemory,
          totalMemory,
          availableMemory,
        });

        // Check for memory pressure
        let memoryPressure: 'low' | 'moderate' | 'critical';
        if (memoryUsagePercent > 90) {
          memoryPressure = 'critical';
        } else if (memoryUsagePercent > 75) {
          memoryPressure = 'moderate';
        } else {
          memoryPressure = 'low';
        }

        if (memoryPressure !== 'low') {
          this.recordMemoryWarning({
            timestamp: Date.now(),
            totalMemory,
            usedMemory,
            availableMemory,
            memoryPressure,
          });
        }
      } catch (error) {
        console.error('Memory monitoring error:', error);
      }
    };

    // Check memory every 30 seconds
    setInterval(monitorMemory, 30000);
  }

  /**
   * Monitor interaction responsiveness
   */
  private monitorInteractions(): void {
    const originalCreateInteraction = InteractionManager.createInteractionHandle;
    const originalClearInteraction = InteractionManager.clearInteractionHandle;
    
    InteractionManager.createInteractionHandle = () => {
      const handle = originalCreateInteraction();
      this.recordMetric('interaction_start', performance.now(), { handle });
      return handle;
    };

    InteractionManager.clearInteractionHandle = (handle) => {
      this.recordMetric('interaction_end', performance.now(), { handle });
      originalClearInteraction(handle);
    };
  }

  /**
   * Record performance metric
   */
  public recordMetric(metric: string, value: number, context?: any): void {
    if (!this.isEnabled) return;

    const performanceMetric: PerformanceMetric = {
      timestamp: Date.now(),
      metric,
      value,
      context,
    };

    this.metrics.push(performanceMetric);

    // Keep metrics array within limits
    if (this.metrics.length > this.maxMetricsCount) {
      this.metrics = this.metrics.slice(-this.maxMetricsCount / 2);
    }

    // Store critical metrics for persistence
    if (this.isCriticalMetric(metric)) {
      this.persistMetric(performanceMetric);
    }
  }

  /**
   * Start performance benchmark
   */
  public startBenchmark(name: string, metadata?: any): void {
    if (!this.isEnabled) return;

    const benchmark: PerformanceBenchmark = {
      name,
      startTime: performance.now(),
      metadata,
    };

    this.benchmarks.set(name, benchmark);
  }

  /**
   * End performance benchmark
   */
  public endBenchmark(name: string): number | null {
    if (!this.isEnabled) return null;

    const benchmark = this.benchmarks.get(name);
    if (!benchmark) return null;

    benchmark.endTime = performance.now();
    benchmark.duration = benchmark.endTime - benchmark.startTime;

    this.recordMetric(`benchmark_${name}`, benchmark.duration, {
      metadata: benchmark.metadata,
    });

    this.benchmarks.delete(name);
    return benchmark.duration;
  }

  /**
   * Record render metric
   */
  public recordRenderMetric(
    component: string,
    renderTime: number,
    reRenders: number = 1,
    props?: any
  ): void {
    if (!this.isEnabled) return;

    const renderMetric: RenderMetric = {
      component,
      renderTime,
      reRenders,
      timestamp: Date.now(),
      props: __DEV__ ? props : undefined, // Only store props in development
    };

    this.renderMetrics.push(renderMetric);

    // Keep render metrics within limits
    if (this.renderMetrics.length > this.maxMetricsCount) {
      this.renderMetrics = this.renderMetrics.slice(-this.maxMetricsCount / 2);
    }

    // Record as general metric as well
    this.recordMetric('component_render', renderTime, {
      component,
      reRenders,
    });
  }

  /**
   * Record network metric
   */
  public recordNetworkMetric(
    endpoint: string,
    method: string,
    duration: number,
    success: boolean,
    responseSize?: number,
    error?: string
  ): void {
    if (!this.isEnabled) return;

    const networkMetric: NetworkMetric = {
      timestamp: Date.now(),
      endpoint,
      method,
      duration,
      success,
      responseSize,
      error,
    };

    this.networkMetrics.push(networkMetric);

    // Keep network metrics within limits
    if (this.networkMetrics.length > this.maxMetricsCount) {
      this.networkMetrics = this.networkMetrics.slice(-this.maxMetricsCount / 2);
    }

    this.recordMetric('network_request', duration, {
      endpoint,
      method,
      success,
      responseSize,
      error,
    });
  }

  /**
   * Record memory warning
   */
  private recordMemoryWarning(warning: MemoryWarning): void {
    this.memoryWarnings.push(warning);

    // Keep only recent warnings
    if (this.memoryWarnings.length > 100) {
      this.memoryWarnings = this.memoryWarnings.slice(-50);
    }

    console.warn('Memory warning:', warning);
  }

  /**
   * Get performance summary
   */
  public getPerformanceSummary(): {
    appStartTime: number;
    totalMetrics: number;
    memoryWarnings: number;
    averageRenderTime: number;
    networkErrors: number;
    deviceInfo: any;
  } {
    const appStartTime = this.metrics.find(m => m.metric === 'app_start')?.value || 0;
    const renderTimes = this.renderMetrics.map(m => m.renderTime);
    const averageRenderTime = renderTimes.length > 0 
      ? renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length 
      : 0;
    
    const networkErrors = this.networkMetrics.filter(m => !m.success).length;

    return {
      appStartTime,
      totalMetrics: this.metrics.length,
      memoryWarnings: this.memoryWarnings.length,
      averageRenderTime,
      networkErrors,
      deviceInfo: this.deviceInfo,
    };
  }

  /**
   * Get slow renders
   */
  public getSlowRenders(threshold: number = 16): RenderMetric[] {
    return this.renderMetrics.filter(metric => metric.renderTime > threshold);
  }

  /**
   * Get memory usage trends
   */
  public getMemoryUsageTrends(): PerformanceMetric[] {
    return this.metrics.filter(metric => metric.metric === 'memory_usage');
  }

  /**
   * Get network performance
   */
  public getNetworkPerformance(): {
    averageResponseTime: number;
    successRate: number;
    slowRequests: NetworkMetric[];
    failedRequests: NetworkMetric[];
  } {
    const responseTimes = this.networkMetrics.map(m => m.duration);
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0;
    
    const successfulRequests = this.networkMetrics.filter(m => m.success);
    const successRate = this.networkMetrics.length > 0 
      ? (successfulRequests.length / this.networkMetrics.length) * 100 
      : 100;
    
    const slowRequests = this.networkMetrics.filter(m => m.duration > 3000); // > 3 seconds
    const failedRequests = this.networkMetrics.filter(m => !m.success);

    return {
      averageResponseTime,
      successRate,
      slowRequests,
      failedRequests,
    };
  }

  /**
   * Generate performance report
   */
  public generatePerformanceReport(): {
    summary: any;
    recommendations: string[];
    criticalIssues: string[];
    deviceInfo: any;
  } {
    const summary = this.getPerformanceSummary();
    const slowRenders = this.getSlowRenders();
    const networkPerf = this.getNetworkPerformance();
    
    const recommendations: string[] = [];
    const criticalIssues: string[] = [];

    // Analyze render performance
    if (summary.averageRenderTime > 16) {
      recommendations.push('Consider optimizing component renders - average render time is above 16ms');
    }
    
    if (slowRenders.length > 10) {
      criticalIssues.push(`${slowRenders.length} components are rendering slowly`);
    }

    // Analyze memory usage
    if (summary.memoryWarnings > 5) {
      criticalIssues.push('Frequent memory warnings detected - consider memory optimization');
    }

    // Analyze network performance
    if (networkPerf.successRate < 95) {
      criticalIssues.push(`Network success rate is low: ${networkPerf.successRate.toFixed(1)}%`);
    }
    
    if (networkPerf.averageResponseTime > 2000) {
      recommendations.push('Network requests are slow - consider caching or optimization');
    }

    // Device-specific recommendations
    if (this.deviceInfo.totalMemory < 2000000000) { // < 2GB
      recommendations.push('Device has limited memory - enable aggressive memory management');
    }

    return {
      summary,
      recommendations,
      criticalIssues,
      deviceInfo: this.deviceInfo,
    };
  }

  /**
   * Export performance data
   */
  public exportPerformanceData(): {
    metrics: PerformanceMetric[];
    renderMetrics: RenderMetric[];
    networkMetrics: NetworkMetric[];
    memoryWarnings: MemoryWarning[];
    deviceInfo: any;
    exportTimestamp: number;
  } {
    return {
      metrics: this.metrics,
      renderMetrics: this.renderMetrics,
      networkMetrics: this.networkMetrics,
      memoryWarnings: this.memoryWarnings,
      deviceInfo: this.deviceInfo,
      exportTimestamp: Date.now(),
    };
  }

  /**
   * Clear performance data
   */
  public clearPerformanceData(): void {
    this.metrics = [];
    this.renderMetrics = [];
    this.networkMetrics = [];
    this.memoryWarnings = [];
    this.benchmarks.clear();
    
    // Clear persisted data
    this.storage.clearAll();
  }

  /**
   * Check if metric is critical
   */
  private isCriticalMetric(metric: string): boolean {
    return [
      'app_crash',
      'memory_usage',
      'app_start',
      'app_foreground',
      'network_request',
    ].includes(metric);
  }

  /**
   * Persist metric to storage
   */
  private persistMetric(metric: PerformanceMetric): void {
    try {
      const key = `metric_${metric.timestamp}_${metric.metric}`;
      this.storage.set(key, JSON.stringify(metric));
    } catch (error) {
      console.error('Failed to persist metric:', error);
    }
  }

  /**
   * Force garbage collection (if available)
   */
  public forceGarbageCollection(): void {
    if (global.gc && typeof global.gc === 'function') {
      global.gc();
      this.recordMetric('gc_forced', performance.now());
    }
  }

  /**
   * Optimize memory usage
   */
  public optimizeMemory(): void {
    // Clear old metrics
    if (this.metrics.length > this.maxMetricsCount / 2) {
      this.metrics = this.metrics.slice(-this.maxMetricsCount / 4);
    }
    
    if (this.renderMetrics.length > this.maxMetricsCount / 2) {
      this.renderMetrics = this.renderMetrics.slice(-this.maxMetricsCount / 4);
    }
    
    if (this.networkMetrics.length > this.maxMetricsCount / 2) {
      this.networkMetrics = this.networkMetrics.slice(-this.maxMetricsCount / 4);
    }

    // Force garbage collection
    this.forceGarbageCollection();
    
    this.recordMetric('memory_optimized', performance.now());
  }
}

// Export singleton instance
export const performanceService = new PerformanceService();
export default performanceService;

/**
 * React Hook for performance monitoring
 */
export const usePerformanceMonitor = () => {
  const startBenchmark = (name: string, metadata?: any) => {
    performanceService.startBenchmark(name, metadata);
  };

  const endBenchmark = (name: string) => {
    return performanceService.endBenchmark(name);
  };

  const recordMetric = (metric: string, value: number, context?: any) => {
    performanceService.recordMetric(metric, value, context);
  };

  const recordRender = (component: string, renderTime: number, reRenders?: number) => {
    performanceService.recordRenderMetric(component, renderTime, reRenders);
  };

  return {
    startBenchmark,
    endBenchmark,
    recordMetric,
    recordRender,
    getReport: () => performanceService.generatePerformanceReport(),
    clearData: () => performanceService.clearPerformanceData(),
  };
};