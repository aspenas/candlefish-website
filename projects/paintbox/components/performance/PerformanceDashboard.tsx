/**
 * Real-time Performance Monitoring Dashboard
 * Comprehensive performance metrics visualization
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { performanceOptimizer, BundleAnalyzer } from '@/lib/performance/optimizer';

// Dynamically import heavy chart library
const Chart = dynamic(() => import('react-chartjs-2').then(mod => mod.Line), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded-lg" />,
});

interface PerformanceMetric {
  label: string;
  value: number | string;
  unit?: string;
  status: 'good' | 'warning' | 'critical';
  trend?: 'up' | 'down' | 'stable';
}

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    tension: number;
  }[];
}

export const PerformanceDashboard: React.FC<{
  show?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  minimal?: boolean;
}> = ({ show = false, position = 'top-right', minimal = false }) => {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [chartData, setChartData] = useState<ChartData>({
    labels: [],
    datasets: [],
  });
  const [fps, setFps] = useState(60);
  const [memory, setMemory] = useState(0);
  const [networkLatency, setNetworkLatency] = useState(0);
  const [cacheHitRate, setCacheHitRate] = useState(0);
  const [activeConnections, setActiveConnections] = useState(0);
  const [bundleStats, setBundleStats] = useState<any>(null);

  // FPS monitoring
  useEffect(() => {
    if (!show) return;

    let frameCount = 0;
    let lastTime = performance.now();
    let animationId: number;

    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();

      if (currentTime - lastTime >= 1000) {
        setFps(frameCount);
        frameCount = 0;
        lastTime = currentTime;
      }

      animationId = requestAnimationFrame(measureFPS);
    };

    animationId = requestAnimationFrame(measureFPS);

    return () => cancelAnimationFrame(animationId);
  }, [show]);

  // Memory monitoring
  useEffect(() => {
    if (!show) return;

    const interval = setInterval(() => {
      if ('memory' in performance) {
        const memInfo = (performance as any).memory;
        const usedMB = Math.round(memInfo.usedJSHeapSize / 1048576);
        setMemory(usedMB);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [show]);

  // Network monitoring
  useEffect(() => {
    if (!show || typeof window === 'undefined') return;

    const measureNetworkLatency = async () => {
      const start = performance.now();
      try {
        await fetch('/api/health', { method: 'HEAD' });
        const latency = performance.now() - start;
        setNetworkLatency(Math.round(latency));
      } catch (error) {
        setNetworkLatency(-1);
      }
    };

    const interval = setInterval(measureNetworkLatency, 5000);
    measureNetworkLatency(); // Initial measurement

    return () => clearInterval(interval);
  }, [show]);

  // WebSocket connections monitoring
  useEffect(() => {
    if (!show) return;

    // Monitor WebSocket connections
    const originalWebSocket = window.WebSocket;
    let connections = 0;

    window.WebSocket = new Proxy(originalWebSocket, {
      construct(target, args) {
        const ws = new target(...args);
        connections++;
        setActiveConnections(connections);

        ws.addEventListener('close', () => {
          connections--;
          setActiveConnections(connections);
        });

        return ws;
      },
    });

    return () => {
      window.WebSocket = originalWebSocket;
    };
  }, [show]);

  // Get performance report
  const updateMetrics = useCallback(() => {
    const report = performanceOptimizer.getReport();
    
    // Update cache hit rate
    const cacheRate = report.cache.hits + report.cache.misses > 0
      ? (report.cache.hits / (report.cache.hits + report.cache.misses)) * 100
      : 0;
    setCacheHitRate(cacheRate);

    // Build metrics array
    const newMetrics: PerformanceMetric[] = [
      {
        label: 'FPS',
        value: fps,
        status: fps >= 55 ? 'good' : fps >= 30 ? 'warning' : 'critical',
        trend: 'stable',
      },
      {
        label: 'Memory',
        value: memory,
        unit: 'MB',
        status: memory < 100 ? 'good' : memory < 200 ? 'warning' : 'critical',
        trend: 'up',
      },
      {
        label: 'Network Latency',
        value: networkLatency === -1 ? 'Error' : networkLatency,
        unit: networkLatency === -1 ? '' : 'ms',
        status: networkLatency < 100 ? 'good' : networkLatency < 300 ? 'warning' : 'critical',
        trend: 'stable',
      },
      {
        label: 'Cache Hit Rate',
        value: cacheRate.toFixed(1),
        unit: '%',
        status: cacheRate > 80 ? 'good' : cacheRate > 50 ? 'warning' : 'critical',
        trend: 'up',
      },
      {
        label: 'API Requests',
        value: report.api.totalRequests,
        status: 'good',
        trend: 'up',
      },
      {
        label: 'DB Queries',
        value: report.database.totalQueries,
        status: 'good',
        trend: 'stable',
      },
      {
        label: 'WebSockets',
        value: activeConnections,
        status: activeConnections < 10 ? 'good' : activeConnections < 50 ? 'warning' : 'critical',
        trend: 'stable',
      },
    ];

    setMetrics(newMetrics);

    // Update chart data
    setChartData(prev => {
      const newLabels = [...prev.labels, new Date().toLocaleTimeString()].slice(-20);
      
      const fpsData = prev.datasets.find(d => d.label === 'FPS')?.data || [];
      const memoryData = prev.datasets.find(d => d.label === 'Memory')?.data || [];
      const latencyData = prev.datasets.find(d => d.label === 'Latency')?.data || [];

      return {
        labels: newLabels,
        datasets: [
          {
            label: 'FPS',
            data: [...fpsData, fps].slice(-20),
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)',
            tension: 0.1,
          },
          {
            label: 'Memory',
            data: [...memoryData, memory / 10].slice(-20), // Scale for visibility
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            tension: 0.1,
          },
          {
            label: 'Latency',
            data: [...latencyData, networkLatency / 10].slice(-20), // Scale for visibility
            borderColor: 'rgb(255, 206, 86)',
            backgroundColor: 'rgba(255, 206, 86, 0.2)',
            tension: 0.1,
          },
        ],
      };
    });
  }, [fps, memory, networkLatency, activeConnections]);

  // Update metrics periodically
  useEffect(() => {
    if (!show) return;

    const interval = setInterval(updateMetrics, 1000);
    updateMetrics(); // Initial update

    return () => clearInterval(interval);
  }, [show, updateMetrics]);

  // Analyze bundle on mount
  useEffect(() => {
    if (show && typeof window !== 'undefined') {
      const stats = BundleAnalyzer.analyze();
      setBundleStats(stats);
    }
  }, [show]);

  // Position classes
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  if (!show) return null;

  // Minimal view
  if (minimal) {
    return (
      <div
        className={`fixed ${positionClasses[position]} bg-black bg-opacity-90 text-white p-3 rounded-lg shadow-lg z-50`}
      >
        <div className="flex gap-4 text-sm">
          <div>
            FPS: <span className={fps >= 55 ? 'text-green-400' : fps >= 30 ? 'text-yellow-400' : 'text-red-400'}>
              {fps}
            </span>
          </div>
          <div>
            Mem: <span className={memory < 100 ? 'text-green-400' : memory < 200 ? 'text-yellow-400' : 'text-red-400'}>
              {memory}MB
            </span>
          </div>
          <div>
            Net: <span className={networkLatency < 100 ? 'text-green-400' : networkLatency < 300 ? 'text-yellow-400' : 'text-red-400'}>
              {networkLatency}ms
            </span>
          </div>
          <div>
            Cache: <span className={cacheHitRate > 80 ? 'text-green-400' : cacheHitRate > 50 ? 'text-yellow-400' : 'text-red-400'}>
              {cacheHitRate.toFixed(0)}%
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Full dashboard view
  return (
    <div
      className={`fixed ${positionClasses[position]} bg-white dark:bg-gray-900 rounded-lg shadow-2xl z-50 w-96 max-h-[90vh] overflow-y-auto`}
    >
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          Performance Monitor
        </h2>
      </div>

      {/* Metrics Grid */}
      <div className="p-4 grid grid-cols-2 gap-3">
        {metrics.map((metric, index) => (
          <div
            key={index}
            className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3"
          >
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {metric.label}
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span
                className={`text-lg font-bold ${
                  metric.status === 'good'
                    ? 'text-green-600 dark:text-green-400'
                    : metric.status === 'warning'
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {metric.value}
              </span>
              {metric.unit && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {metric.unit}
                </span>
              )}
              {metric.trend && (
                <span className="text-xs">
                  {metric.trend === 'up' ? '↑' : metric.trend === 'down' ? '↓' : '→'}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Performance Chart */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
          Performance Trends
        </h3>
        <div className="h-48">
          <Chart
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: true,
                  position: 'bottom' as const,
                },
                tooltip: {
                  mode: 'index' as const,
                  intersect: false,
                },
              },
              scales: {
                x: {
                  display: false,
                },
                y: {
                  beginAtZero: true,
                  max: 100,
                },
              },
            }}
          />
        </div>
      </div>

      {/* Bundle Stats */}
      {bundleStats && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Bundle Analysis
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">JavaScript</span>
              <span className="text-gray-900 dark:text-white">
                {(bundleStats.javascript.totalSize / 1024).toFixed(1)}KB ({bundleStats.javascript.count} files)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">CSS</span>
              <span className="text-gray-900 dark:text-white">
                {(bundleStats.css.totalSize / 1024).toFixed(1)}KB ({bundleStats.css.count} files)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Images</span>
              <span className="text-gray-900 dark:text-white">
                {(bundleStats.images.totalSize / 1024).toFixed(1)}KB ({bundleStats.images.count} files)
              </span>
            </div>
            <div className="flex justify-between font-medium pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="text-gray-700 dark:text-gray-300">Total Load Time</span>
              <span className="text-gray-900 dark:text-white">
                {bundleStats.total.loadTime.toFixed(0)}ms
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
        <button
          onClick={() => performanceOptimizer.reset()}
          className="flex-1 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Reset Metrics
        </button>
        <button
          onClick={() => {
            const report = performanceOptimizer.getReport();
            console.log('Performance Report:', report);
            navigator.clipboard.writeText(JSON.stringify(report, null, 2));
          }}
          className="flex-1 px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Copy Report
        </button>
      </div>
    </div>
  );
};

export default PerformanceDashboard;