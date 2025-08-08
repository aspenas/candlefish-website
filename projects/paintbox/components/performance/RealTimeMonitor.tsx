/**
 * Real-time Performance Monitor Component
 * Displays WebSocket connections, cache metrics, and calculation performance
 */

'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Activity,
  Users,
  Zap,
  Database,
  Wifi,
  WifiOff,
  TrendingUp,
  TrendingDown,
  Clock,
  MemoryStick,
  Server,
  AlertCircle
} from 'lucide-react';

interface PerformanceMetrics {
  websocket: {
    connected: boolean;
    latency: number;
    pendingCalculations: number;
    cacheSize: number;
    users: number;
  };
  cache: {
    hitRate: number;
    memoryUsage: number;
    redisConnections: number;
    entries: number;
  };
  calculations: {
    avgExecutionTime: number;
    queueLength: number;
    completedToday: number;
    failedToday: number;
  };
  system: {
    cpuUsage: number;
    memoryUsage: number;
    uptime: number;
  };
}

export function RealTimeMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    websocket: {
      connected: false,
      latency: 0,
      pendingCalculations: 0,
      cacheSize: 0,
      users: 0,
    },
    cache: {
      hitRate: 0,
      memoryUsage: 0,
      redisConnections: 0,
      entries: 0,
    },
    calculations: {
      avgExecutionTime: 0,
      queueLength: 0,
      completedToday: 0,
      failedToday: 0,
    },
    system: {
      cpuUsage: 0,
      memoryUsage: 0,
      uptime: 0,
    },
  });

  const [alerts, setAlerts] = useState<string[]>([]);
  const metricsHistory = useRef<PerformanceMetrics[]>([]);
  const updateInterval = useRef<NodeJS.Timeout | null>(null);

  const {
    isConnected,
    connectionState,
    currentUsers,
    stats,
  } = useWebSocket({
    autoConnect: true,
    onError: (error) => {
      addAlert(`WebSocket error: ${error.message || 'Unknown error'}`);
    },
  });

  // Update WebSocket metrics
  useEffect(() => {
    setMetrics(prev => ({
      ...prev,
      websocket: {
        connected: isConnected,
        latency: stats.latency,
        pendingCalculations: stats.calculationsPending,
        cacheSize: stats.cacheSize,
        users: currentUsers.length,
      },
    }));
  }, [isConnected, stats, currentUsers]);

  // Fetch performance metrics periodically
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/v1/metrics');
        if (response.ok) {
          const data = await response.json();

          setMetrics(prev => ({
            ...prev,
            cache: data.cache || prev.cache,
            calculations: data.calculations || prev.calculations,
            system: data.system || prev.system,
          }));

          // Store history for trending
          metricsHistory.current.push(metrics);
          if (metricsHistory.current.length > 60) {
            metricsHistory.current.shift();
          }

          // Check for alerts
          checkAlerts(data);
        }
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      }
    };

    // Initial fetch
    fetchMetrics();

    // Set up interval
    updateInterval.current = setInterval(fetchMetrics, 5000); // Every 5 seconds

    return () => {
      if (updateInterval.current) {
        clearInterval(updateInterval.current);
      }
    };
  }, []);

  const checkAlerts = (data: any) => {
    const newAlerts: string[] = [];

    // Check cache hit rate
    if (data.cache?.hitRate < 0.5) {
      newAlerts.push('Low cache hit rate detected');
    }

    // Check calculation queue
    if (data.calculations?.queueLength > 100) {
      newAlerts.push('High calculation queue length');
    }

    // Check memory usage
    if (data.system?.memoryUsage > 90) {
      newAlerts.push('High memory usage detected');
    }

    // Check failed calculations
    if (data.calculations?.failedToday > 10) {
      newAlerts.push('Multiple calculation failures detected');
    }

    setAlerts(newAlerts);
  };

  const addAlert = (message: string) => {
    setAlerts(prev => [...prev, message].slice(-5)); // Keep last 5 alerts
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getConnectionColor = (state: string): string => {
    switch (state) {
      case 'connected': return 'text-green-500';
      case 'connecting': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getTrend = (current: number, history: number[]): 'up' | 'down' | 'stable' => {
    if (history.length < 2) return 'stable';
    const prev = history[history.length - 2];
    if (current > prev * 1.1) return 'up';
    if (current < prev * 0.9) return 'down';
    return 'stable';
  };

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Real-time Performance Monitor</h2>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Badge variant="outline" className="gap-1">
              <Wifi className="w-3 h-3" />
              Connected
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1">
              <WifiOff className="w-3 h-3" />
              Disconnected
            </Badge>
          )}
          <Badge variant="secondary">
            <Users className="w-3 h-3 mr-1" />
            {metrics.websocket.users} Users
          </Badge>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card className="p-4 bg-yellow-50 border-yellow-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="space-y-1">
              {alerts.map((alert, index) => (
                <p key={index} className="text-sm text-yellow-800">
                  {alert}
                </p>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* WebSocket Status */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">WebSocket</h3>
            <Activity className={`w-4 h-4 ${getConnectionColor(connectionState)}`} />
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-2xl font-bold">{metrics.websocket.latency}ms</p>
              <p className="text-xs text-gray-500">Latency</p>
            </div>
            <div className="flex justify-between text-sm">
              <span>Pending: {metrics.websocket.pendingCalculations}</span>
              <span>Cache: {metrics.websocket.cacheSize}</span>
            </div>
          </div>
        </Card>

        {/* Cache Performance */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Cache</h3>
            <Database className="w-4 h-4 text-blue-500" />
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-2xl font-bold">
                {(metrics.cache.hitRate * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">Hit Rate</p>
            </div>
            <Progress value={metrics.cache.hitRate * 100} className="h-2" />
            <div className="flex justify-between text-sm">
              <span>Entries: {metrics.cache.entries}</span>
              <span>Redis: {metrics.cache.redisConnections}</span>
            </div>
          </div>
        </Card>

        {/* Calculations */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Calculations</h3>
            <Zap className="w-4 h-4 text-yellow-500" />
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-2xl font-bold">
                {metrics.calculations.avgExecutionTime.toFixed(0)}ms
              </p>
              <p className="text-xs text-gray-500">Avg Execution</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="font-medium text-green-600">
                  {metrics.calculations.completedToday}
                </p>
                <p className="text-xs text-gray-500">Completed</p>
              </div>
              <div>
                <p className="font-medium text-red-600">
                  {metrics.calculations.failedToday}
                </p>
                <p className="text-xs text-gray-500">Failed</p>
              </div>
            </div>
            {metrics.calculations.queueLength > 0 && (
              <Badge variant="secondary" className="w-full justify-center">
                Queue: {metrics.calculations.queueLength}
              </Badge>
            )}
          </div>
        </Card>

        {/* System Resources */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">System</h3>
            <Server className="w-4 h-4 text-purple-500" />
          </div>
          <div className="space-y-2">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-500">CPU</span>
                <span className="text-sm font-medium">
                  {metrics.system.cpuUsage.toFixed(1)}%
                </span>
              </div>
              <Progress value={metrics.system.cpuUsage} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-500">Memory</span>
                <span className="text-sm font-medium">
                  {metrics.system.memoryUsage.toFixed(1)}%
                </span>
              </div>
              <Progress value={metrics.system.memoryUsage} className="h-2" />
            </div>
            <div className="flex items-center justify-between text-sm">
              <Clock className="w-3 h-3 text-gray-400" />
              <span className="text-xs">
                Uptime: {formatUptime(metrics.system.uptime)}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Active Users */}
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-3">Active Users</h3>
          <div className="space-y-2">
            {currentUsers.length > 0 ? (
              currentUsers.map((user, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-sm">{user.name}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {user.role}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No active users</p>
            )}
          </div>
        </Card>

        {/* Cache Memory Distribution */}
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-600 mb-3">Cache Memory</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs">Formula Cache</span>
                <span className="text-xs font-medium">
                  {((metrics.cache.memoryUsage * 0.6) / 1024).toFixed(1)} MB
                </span>
              </div>
              <Progress value={60} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs">API Cache</span>
                <span className="text-xs font-medium">
                  {((metrics.cache.memoryUsage * 0.3) / 1024).toFixed(1)} MB
                </span>
              </div>
              <Progress value={30} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs">Other</span>
                <span className="text-xs font-medium">
                  {((metrics.cache.memoryUsage * 0.1) / 1024).toFixed(1)} MB
                </span>
              </div>
              <Progress value={10} className="h-2" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default RealTimeMonitor;
