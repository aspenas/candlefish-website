/**
 * Real-Time Performance Monitoring Dashboard
 * Displays live metrics, cache performance, database stats, and API health
 * 
 * Features:
 * - Real-time metrics updates via WebSocket
 * - Interactive charts with Recharts
 * - Filterable and sortable data tables
 * - Performance alerts and notifications
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, ResponsiveContainer,
  CartesianGrid, XAxis, YAxis, Tooltip, Legend,
  RadialBarChart, RadialBar
} from 'recharts';
import { format, subMinutes } from 'date-fns';
import {
  Card, CardContent, CardHeader, CardTitle,
  Alert, AlertDescription,
  Badge, Button, Tabs, TabsContent, TabsList, TabsTrigger,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Progress, Skeleton, Switch, Slider
} from '@/components/ui';
import { 
  Activity, AlertTriangle, CheckCircle, 
  Clock, Database, HardDrive, 
  TrendingUp, TrendingDown, Users,
  Zap, RefreshCw, Download
} from 'lucide-react';

interface PerformanceMetrics {
  timestamp: number;
  requests: {
    total: number;
    rate: number;
    errors: number;
    errorRate: number;
  };
  responseTime: {
    p50: number;
    p95: number;
    p99: number;
    avg: number;
  };
  cache: {
    hitRate: number;
    hits: number;
    misses: number;
    evictions: number;
  };
  database: {
    poolSize: number;
    activeConnections: number;
    waitTime: number;
    slowQueries: number;
  };
  system: {
    cpuUsage: number;
    memoryUsage: number;
    diskIO: number;
    networkIO: number;
  };
}

interface ServiceHealth {
  id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  errorRate: number;
  lastCheck: Date;
}

interface SlowQuery {
  id: string;
  query: string;
  duration: number;
  timestamp: Date;
  affectedRows: number;
}

const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#6366f1',
  muted: '#6b7280'
};

export function PerformanceMonitor() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [slowQueries, setSlowQueries] = useState<SlowQuery[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState('5m');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);

  // Initialize WebSocket connection
  useEffect(() => {
    const ws = io(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3501', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    ws.on('connect', () => {
      console.log('Connected to performance monitoring');
      setConnected(true);
      
      // Subscribe to events
      ws.emit('subscribe', 'metrics');
      ws.emit('subscribe', 'health');
      ws.emit('subscribe', 'alerts');
    });

    ws.on('disconnect', () => {
      console.log('Disconnected from monitoring');
      setConnected(false);
    });

    ws.on('metrics:update', (data: PerformanceMetrics) => {
      setMetrics(prev => {
        const updated = [...prev, data];
        // Keep only last 100 data points
        return updated.slice(-100);
      });
    });

    ws.on('health:update', (data: ServiceHealth[]) => {
      setServices(data);
    });

    ws.on('query:slow', (query: SlowQuery) => {
      setSlowQueries(prev => {
        const updated = [query, ...prev];
        return updated.slice(0, 50); // Keep last 50 queries
      });
    });

    ws.on('alert:new', (alert: any) => {
      setAlerts(prev => [alert, ...prev].slice(0, 20));
    });

    setSocket(ws);

    return () => {
      ws.disconnect();
    };
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !socket) return;

    const interval = setInterval(() => {
      socket.emit('request:metrics');
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, socket]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    if (metrics.length === 0) return null;

    const latest = metrics[metrics.length - 1];
    const previous = metrics[Math.max(0, metrics.length - 2)];

    return {
      requestRate: {
        current: latest.requests.rate,
        change: previous ? ((latest.requests.rate - previous.requests.rate) / previous.requests.rate) * 100 : 0
      },
      errorRate: {
        current: latest.requests.errorRate,
        change: previous ? latest.requests.errorRate - previous.requests.errorRate : 0
      },
      responseTime: {
        p95: latest.responseTime.p95,
        change: previous ? ((latest.responseTime.p95 - previous.responseTime.p95) / previous.responseTime.p95) * 100 : 0
      },
      cacheHitRate: {
        current: latest.cache.hitRate,
        change: previous ? latest.cache.hitRate - previous.cache.hitRate : 0
      },
      dbConnections: {
        active: latest.database.activeConnections,
        total: latest.database.poolSize,
        utilization: (latest.database.activeConnections / latest.database.poolSize) * 100
      }
    };
  }, [metrics]);

  // Filter metrics by time range
  const filteredMetrics = useMemo(() => {
    const now = Date.now();
    const ranges: Record<string, number> = {
      '1m': 60000,
      '5m': 300000,
      '15m': 900000,
      '1h': 3600000,
      '24h': 86400000
    };

    const cutoff = now - (ranges[selectedTimeRange] || 300000);
    return metrics.filter(m => m.timestamp > cutoff);
  }, [metrics, selectedTimeRange]);

  // Export metrics
  const exportMetrics = useCallback(() => {
    const data = {
      timestamp: new Date().toISOString(),
      metrics: filteredMetrics,
      services,
      slowQueries,
      alerts
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-metrics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredMetrics, services, slowQueries, alerts]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">Performance Monitor</h1>
          <Badge variant={connected ? 'success' : 'destructive'}>
            {connected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>

        <div className="flex items-center gap-4">
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1m">1 min</SelectItem>
              <SelectItem value="5m">5 min</SelectItem>
              <SelectItem value="15m">15 min</SelectItem>
              <SelectItem value="1h">1 hour</SelectItem>
              <SelectItem value="24h">24 hours</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Switch
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
              id="auto-refresh"
            />
            <label htmlFor="auto-refresh">Auto-refresh</label>
          </div>

          <Button variant="outline" size="sm" onClick={exportMetrics}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.slice(0, 3).map(alert => (
            <Alert key={alert.id} variant={alert.severity}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {alert.message} - {format(new Date(alert.timestamp), 'HH:mm:ss')}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Request Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.requestRate.current.toFixed(1)}/s</div>
              <p className="text-xs flex items-center mt-1">
                {summary.requestRate.change > 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                )}
                {Math.abs(summary.requestRate.change).toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.errorRate.current.toFixed(2)}%</div>
              <p className="text-xs flex items-center mt-1">
                {summary.errorRate.change > 0 ? (
                  <TrendingUp className="h-3 w-3 text-red-500 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-green-500 mr-1" />
                )}
                {Math.abs(summary.errorRate.change).toFixed(2)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">P95 Response Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.responseTime.p95.toFixed(0)}ms</div>
              <p className="text-xs flex items-center mt-1">
                {summary.responseTime.change > 0 ? (
                  <TrendingUp className="h-3 w-3 text-red-500 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-green-500 mr-1" />
                )}
                {Math.abs(summary.responseTime.change).toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.cacheHitRate.current.toFixed(1)}%</div>
              <Progress value={summary.cacheHitRate.current} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">DB Connections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summary.dbConnections.active}/{summary.dbConnections.total}
              </div>
              <Progress value={summary.dbConnections.utilization} className="mt-2" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Charts */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="response">Response Times</TabsTrigger>
          <TabsTrigger value="cache">Cache</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Request Rate Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Request Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={filteredMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(ts) => format(new Date(ts), 'HH:mm:ss')}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(ts) => format(new Date(ts), 'HH:mm:ss')}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="requests.rate" 
                      stroke={COLORS.primary}
                      fill={COLORS.primary}
                      fillOpacity={0.3}
                      name="Requests/s"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Error Rate Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Error Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={filteredMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(ts) => format(new Date(ts), 'HH:mm:ss')}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(ts) => format(new Date(ts), 'HH:mm:ss')}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="requests.errorRate" 
                      stroke={COLORS.danger}
                      strokeWidth={2}
                      dot={false}
                      name="Error %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* System Resources */}
          <Card>
            <CardHeader>
              <CardTitle>System Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={filteredMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(ts) => format(new Date(ts), 'HH:mm:ss')}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(ts) => format(new Date(ts), 'HH:mm:ss')}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="system.cpuUsage" 
                    stroke={COLORS.primary}
                    strokeWidth={2}
                    dot={false}
                    name="CPU %"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="system.memoryUsage" 
                    stroke={COLORS.warning}
                    strokeWidth={2}
                    dot={false}
                    name="Memory %"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="response" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Response Time Percentiles</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={filteredMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(ts) => format(new Date(ts), 'HH:mm:ss')}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(ts) => format(new Date(ts), 'HH:mm:ss')}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="responseTime.p50" 
                    stroke={COLORS.success}
                    strokeWidth={2}
                    dot={false}
                    name="P50"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="responseTime.p95" 
                    stroke={COLORS.warning}
                    strokeWidth={2}
                    dot={false}
                    name="P95"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="responseTime.p99" 
                    stroke={COLORS.danger}
                    strokeWidth={2}
                    dot={false}
                    name="P99"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cache" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Cache Hit Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={filteredMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(ts) => format(new Date(ts), 'HH:mm:ss')}
                    />
                    <YAxis domain={[0, 100]} />
                    <Tooltip 
                      labelFormatter={(ts) => format(new Date(ts), 'HH:mm:ss')}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="cache.hitRate" 
                      stroke={COLORS.success}
                      fill={COLORS.success}
                      fillOpacity={0.3}
                      name="Hit Rate %"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cache Operations</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={filteredMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(ts) => format(new Date(ts), 'HH:mm:ss')}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(ts) => format(new Date(ts), 'HH:mm:ss')}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="cache.hits" 
                      stroke={COLORS.success}
                      strokeWidth={2}
                      dot={false}
                      name="Hits"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="cache.misses" 
                      stroke={COLORS.warning}
                      strokeWidth={2}
                      dot={false}
                      name="Misses"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="cache.evictions" 
                      stroke={COLORS.danger}
                      strokeWidth={2}
                      dot={false}
                      name="Evictions"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Connection Pool</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={filteredMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(ts) => format(new Date(ts), 'HH:mm:ss')}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(ts) => format(new Date(ts), 'HH:mm:ss')}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="database.activeConnections" 
                      stroke={COLORS.primary}
                      fill={COLORS.primary}
                      fillOpacity={0.3}
                      name="Active"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="database.poolSize" 
                      stroke={COLORS.muted}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      name="Pool Size"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Database Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={filteredMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(ts) => format(new Date(ts), 'HH:mm:ss')}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(ts) => format(new Date(ts), 'HH:mm:ss')}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="database.waitTime" 
                      stroke={COLORS.warning}
                      strokeWidth={2}
                      dot={false}
                      name="Wait Time (ms)"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="database.slowQueries" 
                      stroke={COLORS.danger}
                      strokeWidth={2}
                      dot={false}
                      name="Slow Queries"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Slow Queries Table */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Slow Queries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {slowQueries.slice(0, 5).map(query => (
                  <div key={query.id} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <code className="text-sm font-mono flex-1 truncate">
                        {query.query}
                      </code>
                      <Badge variant="destructive">{query.duration}ms</Badge>
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                      <span>{format(query.timestamp, 'HH:mm:ss')}</span>
                      <span>{query.affectedRows} rows</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Service Health Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {services.map(service => (
                  <div key={service.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`h-3 w-3 rounded-full ${
                        service.status === 'healthy' ? 'bg-green-500' :
                        service.status === 'degraded' ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`} />
                      <div>
                        <p className="font-medium">{service.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Last check: {format(service.lastCheck, 'HH:mm:ss')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">{service.responseTime}ms</p>
                        <p className="text-xs text-muted-foreground">Response Time</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{service.errorRate.toFixed(2)}%</p>
                        <p className="text-xs text-muted-foreground">Error Rate</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default PerformanceMonitor;