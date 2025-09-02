import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { PerformanceMetrics } from '../types';

class PerformanceService {
  private static instance: PerformanceService;
  private metrics: PerformanceMetrics[] = [];
  private maxMetrics = 500;
  private isMonitoring = false;
  private startTimes: Map<string, number> = new Map();

  private constructor() {}

  static getInstance(): PerformanceService {
    if (!PerformanceService.instance) {
      PerformanceService.instance = new PerformanceService();
    }
    return PerformanceService.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Load stored metrics
      const storedMetrics = await AsyncStorage.getItem('@performance_metrics');
      if (storedMetrics) {
        this.metrics = JSON.parse(storedMetrics);
      }

      this.isMonitoring = true;
      console.log('Performance service initialized');
    } catch (error) {
      console.error('Failed to initialize performance service:', error);
    }
  }

  startTimer(key: string): void {
    this.startTimes.set(key, Date.now());
  }

  endTimer(key: string): number {
    const startTime = this.startTimes.get(key);
    if (!startTime) {
      console.warn(`No start time found for timer: ${key}`);
      return 0;
    }

    const duration = Date.now() - startTime;
    this.startTimes.delete(key);
    return duration;
  }

  async recordScreenMetrics(metrics: Omit<PerformanceMetrics, 'id'>): Promise<void> {
    if (!this.isMonitoring) return;

    const performanceMetric: PerformanceMetrics = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      ...metrics,
    };

    this.metrics.push(performanceMetric);

    // Maintain metrics limit
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Save to storage periodically (every 10 metrics)
    if (this.metrics.length % 10 === 0) {
      await this.saveMetrics();
    }

    // Log slow screens
    if (metrics.loadTime > 3000) {
      console.warn(`Slow screen load: ${metrics.screen} took ${metrics.loadTime}ms`);
    }
  }

  async recordNetworkMetrics(
    endpoint: string,
    method: string,
    responseTime: number,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    if (!this.isMonitoring) return;

    const networkMetric = {
      endpoint,
      method,
      responseTime,
      success,
      errorMessage,
      timestamp: new Date(),
    };

    // Store network metrics separately or integrate with screen metrics
    console.log(`Network: ${method} ${endpoint} - ${responseTime}ms ${success ? 'SUCCESS' : 'FAILED'}`);

    // Log slow network requests
    if (responseTime > 5000) {
      console.warn(`Slow network request: ${method} ${endpoint} took ${responseTime}ms`);
    }
  }

  async getMetrics(screen?: string): Promise<PerformanceMetrics[]> {
    if (screen) {
      return this.metrics.filter(metric => metric.screen === screen);
    }
    return [...this.metrics];
  }

  async getPerformanceReport(): Promise<{
    totalMetrics: number;
    screenMetrics: Record<string, {
      count: number;
      averageLoadTime: number;
      averageRenderTime: number;
      slowestLoad: number;
      fastestLoad: number;
    }>;
    overallAverages: {
      loadTime: number;
      renderTime: number;
      memoryUsage: number;
    };
    slowScreens: Array<{
      screen: string;
      loadTime: number;
      timestamp: Date;
    }>;
  }> {
    const screenMetrics: Record<string, any> = {};
    let totalLoadTime = 0;
    let totalRenderTime = 0;
    let totalMemoryUsage = 0;
    const slowScreens: Array<{ screen: string; loadTime: number; timestamp: Date }> = [];

    for (const metric of this.metrics) {
      const screen = metric.screen;
      
      if (!screenMetrics[screen]) {
        screenMetrics[screen] = {
          count: 0,
          totalLoadTime: 0,
          totalRenderTime: 0,
          slowestLoad: 0,
          fastestLoad: Infinity,
        };
      }

      screenMetrics[screen].count++;
      screenMetrics[screen].totalLoadTime += metric.loadTime;
      screenMetrics[screen].totalRenderTime += metric.renderTime;
      screenMetrics[screen].slowestLoad = Math.max(screenMetrics[screen].slowestLoad, metric.loadTime);
      screenMetrics[screen].fastestLoad = Math.min(screenMetrics[screen].fastestLoad, metric.loadTime);

      totalLoadTime += metric.loadTime;
      totalRenderTime += metric.renderTime;
      totalMemoryUsage += metric.memoryUsage;

      // Collect slow screens (>2 seconds)
      if (metric.loadTime > 2000) {
        slowScreens.push({
          screen: metric.screen,
          loadTime: metric.loadTime,
          timestamp: metric.timestamp,
        });
      }
    }

    // Calculate averages for each screen
    const processedScreenMetrics: Record<string, any> = {};
    for (const [screen, data] of Object.entries(screenMetrics)) {
      processedScreenMetrics[screen] = {
        count: data.count,
        averageLoadTime: Math.round(data.totalLoadTime / data.count),
        averageRenderTime: Math.round(data.totalRenderTime / data.count),
        slowestLoad: data.slowestLoad,
        fastestLoad: data.fastestLoad === Infinity ? 0 : data.fastestLoad,
      };
    }

    const metricsCount = this.metrics.length;
    const report = {
      totalMetrics: metricsCount,
      screenMetrics: processedScreenMetrics,
      overallAverages: {
        loadTime: metricsCount > 0 ? Math.round(totalLoadTime / metricsCount) : 0,
        renderTime: metricsCount > 0 ? Math.round(totalRenderTime / metricsCount) : 0,
        memoryUsage: metricsCount > 0 ? Math.round(totalMemoryUsage / metricsCount) : 0,
      },
      slowScreens: slowScreens.sort((a, b) => b.loadTime - a.loadTime).slice(0, 10), // Top 10 slowest
    };

    console.log('Performance report generated:', report);
    return report;
  }

  async optimizePerformance(): Promise<{
    recommendations: string[];
    actions: string[];
  }> {
    const report = await this.getPerformanceReport();
    const recommendations: string[] = [];
    const actions: string[] = [];

    // Analyze performance and provide recommendations
    if (report.overallAverages.loadTime > 2000) {
      recommendations.push('Overall app performance is slow. Consider optimizing heavy operations.');
      actions.push('profile_heavy_operations');
    }

    // Check for consistently slow screens
    const slowScreens = Object.entries(report.screenMetrics)
      .filter(([_, metrics]) => metrics.averageLoadTime > 2000)
      .map(([screen, _]) => screen);

    if (slowScreens.length > 0) {
      recommendations.push(`Slow screens detected: ${slowScreens.join(', ')}. Consider lazy loading and performance optimization.`);
      actions.push('optimize_slow_screens');
    }

    // Memory usage recommendations
    if (report.overallAverages.memoryUsage > 100) { // Arbitrary threshold
      recommendations.push('High memory usage detected. Consider implementing memory management strategies.');
      actions.push('optimize_memory_usage');
    }

    // Check for too many slow screen instances
    if (report.slowScreens.length > 20) {
      recommendations.push('Multiple slow screen loads detected. Review app architecture and data loading patterns.');
      actions.push('review_architecture');
    }

    return { recommendations, actions };
  }

  async clearMetrics(): Promise<void> {
    this.metrics = [];
    await AsyncStorage.removeItem('@performance_metrics');
    console.log('Performance metrics cleared');
  }

  setMonitoring(enabled: boolean): void {
    this.isMonitoring = enabled;
    console.log(`Performance monitoring ${enabled ? 'enabled' : 'disabled'}`);
  }

  isMonitoringEnabled(): boolean {
    return this.isMonitoring;
  }

  private async saveMetrics(): Promise<void> {
    try {
      await AsyncStorage.setItem('@performance_metrics', JSON.stringify(this.metrics));
    } catch (error) {
      console.error('Failed to save performance metrics:', error);
    }
  }

  // Helper methods for common performance patterns
  async measureAsyncOperation<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      
      console.log(`Operation ${operationName} completed in ${duration}ms`);
      
      if (duration > 1000) {
        console.warn(`Slow operation detected: ${operationName} took ${duration}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`Operation ${operationName} failed after ${duration}ms:`, error);
      throw error;
    }
  }

  // Static methods for convenience
  static async initialize(): Promise<void> {
    return PerformanceService.getInstance().initialize();
  }

  static async recordScreenMetrics(metrics: Omit<PerformanceMetrics, 'id'>): Promise<void> {
    return PerformanceService.getInstance().recordScreenMetrics(metrics);
  }

  static startTimer(key: string): void {
    return PerformanceService.getInstance().startTimer(key);
  }

  static endTimer(key: string): number {
    return PerformanceService.getInstance().endTimer(key);
  }

  static async measureAsyncOperation<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    return PerformanceService.getInstance().measureAsyncOperation(operationName, operation);
  }
}

// Export singleton instance
export { PerformanceService };