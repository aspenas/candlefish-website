'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Activity, AlertTriangle, CheckCircle2, Clock, Globe, HardDrive, Server, XCircle } from 'lucide-react';

interface TelemetryData {
  environment: 'development' | 'staging' | 'production';
  buildTime: string;
  commitSha: string;
  lastE2ETest: string | null;
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  integrations: {
    salesforce: {
      status: 'connected' | 'disconnected' | 'unavailable';
      lastCheck: string | null;
      responseTime?: number;
    };
    companyCam: {
      status: 'connected' | 'disconnected' | 'unavailable';
      lastCheck: string | null;
      responseTime?: number;
    };
    redis: {
      status: 'connected' | 'disconnected' | 'unavailable';
      lastCheck: string | null;
      responseTime?: number;
    };
    websocket: {
      status: 'connected' | 'disconnected' | 'unavailable';
      lastCheck: string | null;
      connectedClients?: number;
    };
  };
  webVitals?: {
    fcp?: number; // First Contentful Paint
    lcp?: number; // Largest Contentful Paint
    fid?: number; // First Input Delay
    cls?: number; // Cumulative Layout Shift
    ttfb?: number; // Time to First Byte
    tti?: number; // Time to Interactive
  };
}

export function TelemetryWidget() {
  const [telemetryData, setTelemetryData] = useState<TelemetryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Fetch telemetry data
  const fetchTelemetryData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch health status
      const healthResponse = await fetch('/api/telemetry/status');
      if (!healthResponse.ok) {
        throw new Error(`Health check failed: ${healthResponse.status}`);
      }
      const healthData = await healthResponse.json();

      setTelemetryData(healthData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch telemetry data');
      console.error('Telemetry fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch telemetry data on mount and periodically
  useEffect(() => {
    fetchTelemetryData();
    const interval = setInterval(fetchTelemetryData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Measure and report web vitals
  useEffect(() => {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        // Report Web Vitals to telemetry
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'navigation') {
              const navEntry = entry as PerformanceNavigationTiming;
              setTelemetryData(prev => prev ? {
                ...prev,
                webVitals: {
                  ...prev.webVitals,
                  ttfb: navEntry.responseStart - navEntry.requestStart,
                  fcp: navEntry.responseEnd - navEntry.responseStart,
                }
              } : prev);
            }
          }
        });
        observer.observe({ entryTypes: ['navigation'] });
      } catch (err) {
        console.error('Failed to setup performance observer:', err);
      }
    }
  }, []);

  const getStatusIcon = (status: 'connected' | 'disconnected' | 'unavailable') => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'disconnected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'unavailable':
        return <AlertTriangle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getEnvironmentColor = (env: string) => {
    switch (env) {
      case 'production':
        return 'bg-green-500';
      case 'staging':
        return 'bg-yellow-500';
      case 'development':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 hover:bg-gray-800 transition-colors"
        >
          <Activity className="w-4 h-4" />
          <span className="text-xs">Telemetry</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-96 max-w-[calc(100vw-2rem)]">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white">System Telemetry</h3>
          {telemetryData && (
            <span className={`px-2 py-0.5 text-xs font-medium text-white rounded-full ${getEnvironmentColor(telemetryData.environment)}`}>
              {telemetryData.environment.toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            title={showDetails ? "Hide details" : "Show details"}
          >
            <svg className={`w-4 h-4 text-gray-500 transform transition-transform ${showDetails ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
            title="Minimize"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3">
        {isLoading && !telemetryData ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="text-red-500 text-sm">
            <AlertTriangle className="w-4 h-4 inline mr-1" />
            {error}
          </div>
        ) : telemetryData ? (
          <>
            {/* Build Info */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">Build:</span>
                <span className="font-mono text-gray-700 dark:text-gray-300">
                  {telemetryData.buildTime ? format(new Date(telemetryData.buildTime), 'MMM dd HH:mm') : 'Unknown'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">Commit:</span>
                <span className="font-mono text-gray-700 dark:text-gray-300">
                  {telemetryData.commitSha || 'Unknown'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400">Uptime:</span>
                <span className="text-gray-700 dark:text-gray-300">
                  {formatUptime(telemetryData.uptime)}
                </span>
              </div>
            </div>

            {/* System Resources */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <HardDrive className="w-3 h-3" />
                  Memory:
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-700 dark:text-gray-300">
                    {telemetryData.memory.used}MB / {telemetryData.memory.total}MB
                  </span>
                  <span className={`font-medium ${
                    telemetryData.memory.percentage > 90 ? 'text-red-500' :
                    telemetryData.memory.percentage > 70 ? 'text-yellow-500' :
                    'text-green-500'
                  }`}>
                    ({telemetryData.memory.percentage}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Integration Status */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300">Integrations</div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(telemetryData.integrations).map(([name, integration]) => (
                  <div key={name} className="flex items-center gap-2 text-xs">
                    {getStatusIcon(integration.status)}
                    <span className="text-gray-600 dark:text-gray-400 capitalize">
                      {name.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    {integration.status === 'connected' && integration.responseTime && (
                      <span className="text-gray-400 text-[10px]">
                        {integration.responseTime}ms
                      </span>
                    )}
                    {integration.status === 'unavailable' && (
                      <span className="text-gray-400 text-[10px]">
                        (disabled)
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Web Vitals (if available and details shown) */}
            {showDetails && telemetryData.webVitals && (
              <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="text-xs font-medium text-gray-700 dark:text-gray-300">Web Vitals</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {telemetryData.webVitals.tti && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">TTI:</span>
                      <span className={`font-medium ${
                        telemetryData.webVitals.tti < 2500 ? 'text-green-500' :
                        telemetryData.webVitals.tti < 4000 ? 'text-yellow-500' :
                        'text-red-500'
                      }`}>
                        {(telemetryData.webVitals.tti / 1000).toFixed(2)}s
                      </span>
                    </div>
                  )}
                  {telemetryData.webVitals.fcp && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">FCP:</span>
                      <span className="text-gray-700 dark:text-gray-300">
                        {(telemetryData.webVitals.fcp / 1000).toFixed(2)}s
                      </span>
                    </div>
                  )}
                  {telemetryData.webVitals.lcp && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">LCP:</span>
                      <span className="text-gray-700 dark:text-gray-300">
                        {(telemetryData.webVitals.lcp / 1000).toFixed(2)}s
                      </span>
                    </div>
                  )}
                  {telemetryData.webVitals.cls !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">CLS:</span>
                      <span className="text-gray-700 dark:text-gray-300">
                        {telemetryData.webVitals.cls.toFixed(3)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* E2E Test Status */}
            {telemetryData.lastE2ETest && (
              <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Last E2E Test:
                </span>
                <span className="text-gray-700 dark:text-gray-300">
                  {format(new Date(telemetryData.lastE2ETest), 'MMM dd HH:mm')}
                </span>
              </div>
            )}
          </>
        ) : null}

        {/* Refresh Button */}
        <div className="flex justify-end pt-2 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={fetchTelemetryData}
            disabled={isLoading}
            className="text-xs text-blue-500 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>
    </div>
  );
}
