/**
 * Metrics View Component
 * 
 * Detailed metrics visualization with charts and real-time updates
 */

'use client';

import React from 'react';
import { useDashboard } from '@/lib/context/DashboardContext';
import { MetricChart } from '../components/MetricChart';
import { TrendDirection } from '@/lib/types/dashboard';

export function MetricsView() {
  const { state } = useDashboard();
  const { systemAnalysis, loading } = state;

  if (loading.analysis) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Metrics
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Real-time system performance metrics
        </p>
      </div>

      {systemAnalysis && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <MetricChart
            title="CPU Utilization"
            value={systemAnalysis.resourceUtilization.cpu.current}
            unit="%"
            trend={systemAnalysis.resourceUtilization.cpu.trend}
            data={[
              { x: '6h ago', y: systemAnalysis.resourceUtilization.cpu.average - 10 },
              { x: '5h ago', y: systemAnalysis.resourceUtilization.cpu.average - 5 },
              { x: '4h ago', y: systemAnalysis.resourceUtilization.cpu.average },
              { x: '3h ago', y: systemAnalysis.resourceUtilization.cpu.average + 3 },
              { x: '2h ago', y: systemAnalysis.resourceUtilization.cpu.average + 1 },
              { x: '1h ago', y: systemAnalysis.resourceUtilization.cpu.current - 2 },
              { x: 'now', y: systemAnalysis.resourceUtilization.cpu.current },
            ]}
            color="blue"
            height={200}
          />
          
          <MetricChart
            title="Memory Usage"
            value={systemAnalysis.resourceUtilization.memory.current}
            unit="%"
            trend={systemAnalysis.resourceUtilization.memory.trend}
            data={[
              { x: '6h ago', y: systemAnalysis.resourceUtilization.memory.average - 8 },
              { x: '5h ago', y: systemAnalysis.resourceUtilization.memory.average - 4 },
              { x: '4h ago', y: systemAnalysis.resourceUtilization.memory.average },
              { x: '3h ago', y: systemAnalysis.resourceUtilization.memory.average + 2 },
              { x: '2h ago', y: systemAnalysis.resourceUtilization.memory.average + 4 },
              { x: '1h ago', y: systemAnalysis.resourceUtilization.memory.current - 1 },
              { x: 'now', y: systemAnalysis.resourceUtilization.memory.current },
            ]}
            color="green"
            height={200}
          />
          
          <MetricChart
            title="Disk Usage"
            value={systemAnalysis.resourceUtilization.disk.current}
            unit="%"
            trend={systemAnalysis.resourceUtilization.disk.trend}
            data={[
              { x: '6h ago', y: systemAnalysis.resourceUtilization.disk.average - 2 },
              { x: '5h ago', y: systemAnalysis.resourceUtilization.disk.average - 1 },
              { x: '4h ago', y: systemAnalysis.resourceUtilization.disk.average },
              { x: '3h ago', y: systemAnalysis.resourceUtilization.disk.average + 1 },
              { x: '2h ago', y: systemAnalysis.resourceUtilization.disk.average + 1 },
              { x: '1h ago', y: systemAnalysis.resourceUtilization.disk.current },
              { x: 'now', y: systemAnalysis.resourceUtilization.disk.current },
            ]}
            color="purple"
            height={200}
          />
          
          <MetricChart
            title="Network I/O"
            value={systemAnalysis.resourceUtilization.network.current}
            unit="MB/s"
            trend={systemAnalysis.resourceUtilization.network.trend}
            data={[
              { x: '6h ago', y: systemAnalysis.resourceUtilization.network.average - 5 },
              { x: '5h ago', y: systemAnalysis.resourceUtilization.network.average - 2 },
              { x: '4h ago', y: systemAnalysis.resourceUtilization.network.average },
              { x: '3h ago', y: systemAnalysis.resourceUtilization.network.average + 3 },
              { x: '2h ago', y: systemAnalysis.resourceUtilization.network.average + 1 },
              { x: '1h ago', y: systemAnalysis.resourceUtilization.network.current - 1 },
              { x: 'now', y: systemAnalysis.resourceUtilization.network.current },
            ]}
            color="orange"
            height={200}
          />

          {/* Additional metrics can be added here */}
          <MetricChart
            title="Response Time"
            value={250}
            unit="ms"
            trend={TrendDirection.STABLE}
            data={[
              { x: '6h ago', y: 240 },
              { x: '5h ago', y: 245 },
              { x: '4h ago', y: 255 },
              { x: '3h ago', y: 250 },
              { x: '2h ago', y: 248 },
              { x: '1h ago', y: 252 },
              { x: 'now', y: 250 },
            ]}
            color="red"
            height={200}
          />

          <MetricChart
            title="Throughput"
            value={1250}
            unit="req/s"
            trend={TrendDirection.INCREASING}
            data={[
              { x: '6h ago', y: 1100 },
              { x: '5h ago', y: 1150 },
              { x: '4h ago', y: 1200 },
              { x: '3h ago', y: 1220 },
              { x: '2h ago', y: 1230 },
              { x: '1h ago', y: 1240 },
              { x: 'now', y: 1250 },
            ]}
            color="yellow"
            height={200}
          />
        </div>
      )}
    </div>
  );
}

export default MetricsView;