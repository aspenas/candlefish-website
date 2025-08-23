import React, { useEffect, useState } from 'react';
import {
  BoltIcon,
  ChartBarIcon,
  ClockIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage: number;
  fps: number;
  networkLatency: number;
}

export default function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    loadTime: 0,
    renderTime: 0,
    memoryUsage: 0,
    fps: 60,
    networkLatency: 0,
  });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Measure page load time
    const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;

    // Measure render time
    const renderTime = performance.timing.domComplete - performance.timing.domLoading;

    // Monitor FPS
    let lastTime = performance.now();
    let frames = 0;
    let fps = 60;

    const measureFPS = () => {
      frames++;
      const currentTime = performance.now();

      if (currentTime >= lastTime + 1000) {
        fps = Math.round((frames * 1000) / (currentTime - lastTime));
        frames = 0;
        lastTime = currentTime;

        setMetrics(prev => ({ ...prev, fps }));
      }

      requestAnimationFrame(measureFPS);
    };

    measureFPS();

    // Monitor memory usage (if available)
    const updateMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const usedMemory = memory.usedJSHeapSize / 1048576; // Convert to MB
        setMetrics(prev => ({ ...prev, memoryUsage: Math.round(usedMemory) }));
      }
    };

    const memoryInterval = setInterval(updateMemory, 5000);

    // Monitor network latency
    const measureLatency = async () => {
      const start = performance.now();
      try {
        await fetch('/api/v1/health', { method: 'HEAD' });
        const latency = performance.now() - start;
        setMetrics(prev => ({ ...prev, networkLatency: Math.round(latency) }));
      } catch (error) {
        console.error('Latency measurement failed:', error);
      }
    };

    const latencyInterval = setInterval(measureLatency, 10000);

    // Set initial metrics
    setMetrics(prev => ({
      ...prev,
      loadTime: Math.round(loadTime),
      renderTime: Math.round(renderTime),
    }));

    // Cleanup
    return () => {
      clearInterval(memoryInterval);
      clearInterval(latencyInterval);
    };
  }, []);

  // Performance optimization recommendations
  const getPerformanceStatus = () => {
    const score = calculatePerformanceScore();
    if (score >= 90) return { status: 'Excellent', color: 'green' };
    if (score >= 70) return { status: 'Good', color: 'yellow' };
    if (score >= 50) return { status: 'Fair', color: 'orange' };
    return { status: 'Poor', color: 'red' };
  };

  const calculatePerformanceScore = () => {
    let score = 100;

    // Deduct points for slow load time
    if (metrics.loadTime > 3000) score -= 20;
    else if (metrics.loadTime > 2000) score -= 10;
    else if (metrics.loadTime > 1000) score -= 5;

    // Deduct points for slow render time
    if (metrics.renderTime > 2000) score -= 20;
    else if (metrics.renderTime > 1000) score -= 10;
    else if (metrics.renderTime > 500) score -= 5;

    // Deduct points for low FPS
    if (metrics.fps < 30) score -= 30;
    else if (metrics.fps < 45) score -= 15;
    else if (metrics.fps < 55) score -= 5;

    // Deduct points for high memory usage
    if (metrics.memoryUsage > 500) score -= 20;
    else if (metrics.memoryUsage > 300) score -= 10;
    else if (metrics.memoryUsage > 200) score -= 5;

    // Deduct points for high latency
    if (metrics.networkLatency > 500) score -= 15;
    else if (metrics.networkLatency > 200) score -= 7;
    else if (metrics.networkLatency > 100) score -= 3;

    return Math.max(0, score);
  };

  const performanceStatus = getPerformanceStatus();
  const score = calculatePerformanceScore();

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-indigo-600 text-white p-3 rounded-full shadow-lg hover:bg-indigo-700 transition-colors z-50"
        title="Show Performance Monitor"
      >
        <ChartBarIcon className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-4 w-80 z-50 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
          <CpuChipIcon className="h-5 w-5 mr-2 text-indigo-600" />
          Performance Monitor
        </h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          ×
        </button>
      </div>

      {/* Performance Score */}
      <div className={`mb-4 p-3 rounded-lg bg-${performanceStatus.color}-50 dark:bg-${performanceStatus.color}-900/20`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Performance Score
          </span>
          <div className="flex items-center">
            <span className={`text-2xl font-bold text-${performanceStatus.color}-600 dark:text-${performanceStatus.color}-400`}>
              {score}
            </span>
            <span className={`ml-2 text-sm text-${performanceStatus.color}-600 dark:text-${performanceStatus.color}-400`}>
              {performanceStatus.status}
            </span>
          </div>
        </div>
        <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full bg-${performanceStatus.color}-500`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* Metrics */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <ClockIcon className="h-4 w-4 mr-2" />
            Load Time
          </div>
          <span className={`text-sm font-medium ${
            metrics.loadTime > 2000 ? 'text-red-600' :
            metrics.loadTime > 1000 ? 'text-yellow-600' : 'text-green-600'
          }`}>
            {metrics.loadTime}ms
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <BoltIcon className="h-4 w-4 mr-2" />
            Render Time
          </div>
          <span className={`text-sm font-medium ${
            metrics.renderTime > 1000 ? 'text-red-600' :
            metrics.renderTime > 500 ? 'text-yellow-600' : 'text-green-600'
          }`}>
            {metrics.renderTime}ms
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <ChartBarIcon className="h-4 w-4 mr-2" />
            FPS
          </div>
          <span className={`text-sm font-medium ${
            metrics.fps < 30 ? 'text-red-600' :
            metrics.fps < 50 ? 'text-yellow-600' : 'text-green-600'
          }`}>
            {metrics.fps}
          </span>
        </div>

        {metrics.memoryUsage > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <CpuChipIcon className="h-4 w-4 mr-2" />
              Memory
            </div>
            <span className={`text-sm font-medium ${
              metrics.memoryUsage > 300 ? 'text-red-600' :
              metrics.memoryUsage > 200 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {metrics.memoryUsage} MB
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <BoltIcon className="h-4 w-4 mr-2" />
            Network Latency
          </div>
          <span className={`text-sm font-medium ${
            metrics.networkLatency > 200 ? 'text-red-600' :
            metrics.networkLatency > 100 ? 'text-yellow-600' : 'text-green-600'
          }`}>
            {metrics.networkLatency}ms
          </span>
        </div>
      </div>

      {/* Recommendations */}
      {score < 70 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
            Optimization Tips:
          </p>
          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            {metrics.loadTime > 2000 && (
              <li>• Optimize bundle size with code splitting</li>
            )}
            {metrics.fps < 50 && (
              <li>• Reduce re-renders with React.memo</li>
            )}
            {metrics.memoryUsage > 200 && (
              <li>• Check for memory leaks in useEffect</li>
            )}
            {metrics.networkLatency > 200 && (
              <li>• Consider caching API responses</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
