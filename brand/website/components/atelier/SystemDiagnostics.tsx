'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    temperature: number;
  };
  memory: {
    used: number;
    total: number;
    available: number;
  };
  network: {
    inbound: number;
    outbound: number;
    latency: number;
  };
  security: {
    status: 'secure' | 'monitoring' | 'alert';
    threats: number;
    lastScan: Date;
  };
  processes: Array<{
    id: string;
    name: string;
    cpu: number;
    memory: number;
    status: 'running' | 'idle' | 'suspended';
  }>;
}

interface DiagnosticsProps {
  isVisible: boolean;
  onToggle: () => void;
}

export function SystemDiagnostics({ isVisible, onToggle }: DiagnosticsProps) {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    cpu: { usage: 23.5, cores: 8, temperature: 45 },
    memory: { used: 8.2, total: 16, available: 7.8 },
    network: { inbound: 1.2, outbound: 0.8, latency: 12 },
    security: { status: 'secure', threats: 0, lastScan: new Date() },
    processes: [
      { id: 'proc-001', name: 'Neural Engine', cpu: 15.2, memory: 2.1, status: 'running' },
      { id: 'proc-002', name: 'Pattern Analyzer', cpu: 8.7, memory: 1.8, status: 'running' },
      { id: 'proc-003', name: 'Automation Core', cpu: 12.3, memory: 3.2, status: 'running' },
      { id: 'proc-004', name: 'Security Monitor', cpu: 2.1, memory: 0.9, status: 'running' },
      { id: 'proc-005', name: 'Data Synthesizer', cpu: 0.8, memory: 0.5, status: 'idle' },
    ],
  });

  const [history, setHistory] = useState<number[][]>([]);

  // Simulate real-time metrics updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => {
        const newMetrics = {
          ...prev,
          cpu: {
            ...prev.cpu,
            usage: Math.max(5, Math.min(95, prev.cpu.usage + (Math.random() - 0.5) * 8)),
            temperature: Math.max(35, Math.min(75, prev.cpu.temperature + (Math.random() - 0.5) * 4)),
          },
          memory: {
            ...prev.memory,
            used: Math.max(4, Math.min(14, prev.memory.used + (Math.random() - 0.5) * 1.5)),
            available: Math.max(2, Math.min(12, prev.memory.available + (Math.random() - 0.5) * 1.2)),
          },
          network: {
            ...prev.network,
            inbound: Math.max(0, Math.min(10, prev.network.inbound + (Math.random() - 0.5) * 2)),
            outbound: Math.max(0, Math.min(8, prev.network.outbound + (Math.random() - 0.5) * 1.5)),
            latency: Math.max(8, Math.min(50, prev.network.latency + (Math.random() - 0.5) * 6)),
          },
          processes: prev.processes.map(proc => ({
            ...proc,
            cpu: Math.max(0, Math.min(25, proc.cpu + (Math.random() - 0.5) * 3)),
            memory: Math.max(0.1, Math.min(5, proc.memory + (Math.random() - 0.5) * 0.5)),
          })),
        };

        // Update security status based on system load
        if (newMetrics.cpu.usage > 80 || newMetrics.memory.used > 12) {
          newMetrics.security.status = 'monitoring';
        } else if (newMetrics.cpu.usage > 90 || newMetrics.memory.used > 14) {
          newMetrics.security.status = 'alert';
          newMetrics.security.threats = Math.floor(Math.random() * 3);
        } else {
          newMetrics.security.status = 'secure';
          newMetrics.security.threats = 0;
        }

        return newMetrics;
      });

      // Update history for sparkline charts
      setHistory(prev => {
        const newHistory = [...prev];
        if (newHistory.length >= 30) newHistory.shift();
        newHistory.push([metrics.cpu.usage, metrics.memory.used, metrics.network.inbound]);
        return newHistory;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [metrics.cpu.usage, metrics.memory.used, metrics.network.inbound]);

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        onToggle();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onToggle]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'secure': return 'text-living-cyan';
      case 'monitoring': return 'text-copper';
      case 'alert': return 'text-red-400';
      default: return 'text-pearl/70';
    }
  };

  const getUsageColor = (percentage: number) => {
    if (percentage > 80) return 'text-red-400';
    if (percentage > 60) return 'text-copper';
    return 'text-living-cyan';
  };

  const SparklineChart = ({ data, color = 'living-cyan' }: { data: number[], color?: string }) => (
    <div className="w-20 h-8 relative">
      <svg width="100%" height="100%" className="absolute inset-0">
        {data.length > 1 && (
          <polyline
            fill="none"
            stroke={`var(--${color})`}
            strokeWidth="1"
            points={data.map((value, index) =>
              `${(index / (data.length - 1)) * 80},${32 - (value / 100) * 28}`
            ).join(' ')}
            className="opacity-60"
          />
        )}
      </svg>
    </div>
  );

  return (
    <>
      {/* Keyboard shortcut indicator */}
      {!isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed top-4 right-4 z-40"
        >
          <div className="bg-graphite/90 border border-copper/30 backdrop-blur-sm px-3 py-1 rounded text-xs font-mono text-copper/70">
            ⌘+D for diagnostics
          </div>
        </motion.div>
      )}

      {/* Diagnostics Overlay */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-96 bg-graphite/95 border-l border-copper/30 backdrop-blur-md z-50 overflow-y-auto"
          >
            {/* Header */}
            <div className="p-4 border-b border-copper/20">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-mono text-pearl">System Diagnostics</h2>
                <button
                  onClick={onToggle}
                  className="text-copper/60 hover:text-copper transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="text-xs font-mono text-pearl/50 mt-1">
                Live monitoring • {new Date().toLocaleTimeString()}
              </div>
            </div>

            {/* CPU Metrics */}
            <div className="p-4 border-b border-copper/10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-mono text-living-cyan">CPU</h3>
                <div className="text-xs font-mono text-pearl/50">
                  {metrics.cpu.cores} cores
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-pearl/70">Usage</span>
                  <div className="flex items-center gap-2">
                    {history.length > 0 && <SparklineChart data={history.map(h => h[0])} />}
                    <span className={`text-sm font-mono ${getUsageColor(metrics.cpu.usage)}`}>
                      {metrics.cpu.usage.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-pearl/70">Temperature</span>
                  <span className={`text-sm font-mono ${getUsageColor(metrics.cpu.temperature)}`}>
                    {metrics.cpu.temperature}°C
                  </span>
                </div>
              </div>
            </div>

            {/* Memory Metrics */}
            <div className="p-4 border-b border-copper/10">
              <h3 className="text-sm font-mono text-living-cyan mb-2">Memory</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-pearl/70">Used</span>
                  <div className="flex items-center gap-2">
                    {history.length > 0 && <SparklineChart data={history.map(h => h[1])} />}
                    <span className={`text-sm font-mono ${getUsageColor((metrics.memory.used / metrics.memory.total) * 100)}`}>
                      {metrics.memory.used.toFixed(1)} GB
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-pearl/70">Available</span>
                  <span className="text-sm font-mono text-living-cyan">
                    {metrics.memory.available.toFixed(1)} GB
                  </span>
                </div>
              </div>
            </div>

            {/* Network Metrics */}
            <div className="p-4 border-b border-copper/10">
              <h3 className="text-sm font-mono text-living-cyan mb-2">Network</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-pearl/70">Inbound</span>
                  <div className="flex items-center gap-2">
                    {history.length > 0 && <SparklineChart data={history.map(h => h[2])} color="copper" />}
                    <span className="text-sm font-mono text-copper">
                      {metrics.network.inbound.toFixed(1)} MB/s
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-pearl/70">Outbound</span>
                  <span className="text-sm font-mono text-copper">
                    {metrics.network.outbound.toFixed(1)} MB/s
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-pearl/70">Latency</span>
                  <span className="text-sm font-mono text-pearl/70">
                    {metrics.network.latency}ms
                  </span>
                </div>
              </div>
            </div>

            {/* Security Status */}
            <div className="p-4 border-b border-copper/10">
              <h3 className="text-sm font-mono text-living-cyan mb-2">Security</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-pearl/70">Status</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      metrics.security.status === 'secure' ? 'bg-living-cyan animate-pulse' :
                      metrics.security.status === 'monitoring' ? 'bg-copper animate-pulse' :
                      'bg-red-400 animate-pulse'
                    }`} />
                    <span className={`text-sm font-mono capitalize ${getStatusColor(metrics.security.status)}`}>
                      {metrics.security.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-pearl/70">Threats</span>
                  <span className={`text-sm font-mono ${metrics.security.threats > 0 ? 'text-red-400' : 'text-living-cyan'}`}>
                    {metrics.security.threats}
                  </span>
                </div>
              </div>
            </div>

            {/* Active Processes */}
            <div className="p-4">
              <h3 className="text-sm font-mono text-living-cyan mb-2">Active Processes</h3>
              <div className="space-y-2">
                {metrics.processes.slice(0, 5).map((process) => (
                  <div key={process.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        process.status === 'running' ? 'bg-living-cyan' :
                        process.status === 'idle' ? 'bg-copper/50' :
                        'bg-pearl/30'
                      }`} />
                      <span className="text-pearl/70 truncate">{process.name}</span>
                    </div>
                    <div className="flex gap-3 font-mono text-pearl/50">
                      <span>{process.cpu.toFixed(1)}%</span>
                      <span>{process.memory.toFixed(1)}GB</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-copper/20 text-center">
              <div className="text-xs font-mono text-pearl/50">
                Laboratory Operational Status: OPTIMAL
              </div>
              <div className="text-xs font-mono text-copper/50 mt-1">
                Press ⌘+D to close
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
