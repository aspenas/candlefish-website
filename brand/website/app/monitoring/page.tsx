'use client';

import React, { useState, useEffect } from 'react';
import { getFeatureFlagClient } from '@/lib/feature-flags';

interface Metrics {
  experiments: Record<string, Record<string, number>>;
  performance: {
    avgResponseTime: number;
    cacheHitRate: number;
    errorRate: number;
    slowRequestRate: number;
  };
  users: {
    total: number;
    active: number;
    new: number;
  };
}

export default function MonitoringDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load feature flags
    const flagClient = getFeatureFlagClient();
    setFlags(flagClient.getAllFlags());

    // Simulate loading metrics (in production, fetch from API)
    const loadMetrics = () => {
      const mockMetrics: Metrics = {
        experiments: {
          heroAnimation: {
            control: 34,
            enhanced: 33,
            minimal: 33,
          },
          performance: {
            standard: 25,
            optimized: 50,
            adaptive: 25,
          },
          colorScheme: {
            light: 40,
            dark: 40,
            auto: 20,
          },
        },
        performance: {
          avgResponseTime: 89,
          cacheHitRate: 84,
          errorRate: 0.1,
          slowRequestRate: 2.3,
        },
        users: {
          total: 1247,
          active: 312,
          new: 47,
        },
      };

      // Get real data from window if available
      if (typeof window !== 'undefined') {
        const perf = (window as any).__CF_PERFORMANCE__;
        if (perf) {
          mockMetrics.performance.avgResponseTime = perf.responseTime || 89;
        }
      }

      setMetrics(mockMetrics);
      setLoading(false);
    };

    loadMetrics();
    
    // Refresh every 5 seconds
    const interval = setInterval(loadMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">Loading monitoring dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-thin mb-8">
          Operational Monitoring Dashboard
        </h1>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Avg Response Time"
            value={`${metrics?.performance.avgResponseTime}ms`}
            target="<100ms"
            status={metrics?.performance.avgResponseTime! < 100 ? 'good' : 'warning'}
          />
          <MetricCard
            title="Cache Hit Rate"
            value={`${metrics?.performance.cacheHitRate}%`}
            target=">80%"
            status={metrics?.performance.cacheHitRate! > 80 ? 'good' : 'warning'}
          />
          <MetricCard
            title="Error Rate"
            value={`${metrics?.performance.errorRate}%`}
            target="<1%"
            status={metrics?.performance.errorRate! < 1 ? 'good' : 'critical'}
          />
          <MetricCard
            title="Slow Requests"
            value={`${metrics?.performance.slowRequestRate}%`}
            target="<5%"
            status={metrics?.performance.slowRequestRate! < 5 ? 'good' : 'warning'}
          />
        </div>

        {/* A/B Test Results */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-thin mb-4">A/B Test Results</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(metrics?.experiments || {}).map(([experiment, variants]) => (
              <ExperimentCard
                key={experiment}
                name={experiment}
                variants={variants}
              />
            ))}
          </div>
        </div>

        {/* Feature Flags Status */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-thin mb-4">Feature Flags Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(flags).map(([flag, enabled]) => (
              <div
                key={flag}
                className={`p-3 rounded ${
                  enabled ? 'bg-green-900/50' : 'bg-gray-700/50'
                }`}
              >
                <div className="text-sm font-mono">{flag}</div>
                <div className={`text-xs ${enabled ? 'text-green-400' : 'text-gray-400'}`}>
                  {enabled ? 'ENABLED' : 'DISABLED'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User Metrics */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-2xl font-thin mb-4">User Metrics</h2>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="text-3xl font-mono">{metrics?.users.total}</div>
              <div className="text-sm text-gray-400">Total Users</div>
            </div>
            <div>
              <div className="text-3xl font-mono text-green-400">
                {metrics?.users.active}
              </div>
              <div className="text-sm text-gray-400">Active Now</div>
            </div>
            <div>
              <div className="text-3xl font-mono text-cyan-400">
                +{metrics?.users.new}
              </div>
              <div className="text-sm text-gray-400">New Today</div>
            </div>
          </div>
        </div>

        {/* Real-time Status */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <div className="inline-flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Real-time monitoring active • Refreshing every 5 seconds
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  target,
  status,
}: {
  title: string;
  value: string;
  target: string;
  status: 'good' | 'warning' | 'critical';
}) {
  const statusColors = {
    good: 'bg-green-900/50 text-green-400',
    warning: 'bg-yellow-900/50 text-yellow-400',
    critical: 'bg-red-900/50 text-red-400',
  };

  return (
    <div className={`rounded-lg p-6 ${statusColors[status]}`}>
      <div className="text-sm opacity-75 mb-2">{title}</div>
      <div className="text-3xl font-mono mb-2">{value}</div>
      <div className="text-xs opacity-50">Target: {target}</div>
    </div>
  );
}

function ExperimentCard({
  name,
  variants,
}: {
  name: string;
  variants: Record<string, number>;
}) {
  const total = Object.values(variants).reduce((a, b) => a + b, 0);
  
  return (
    <div className="bg-gray-700/50 rounded p-4">
      <div className="text-sm font-mono mb-3">{name}</div>
      {Object.entries(variants).map(([variant, percentage]) => (
        <div key={variant} className="mb-2">
          <div className="flex justify-between text-xs mb-1">
            <span>{variant}</span>
            <span>{percentage}%</span>
          </div>
          <div className="w-full bg-gray-600 rounded-full h-2">
            <div
              className="bg-cyan-500 h-2 rounded-full transition-all"
              style={{ width: `${(percentage / 100) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}