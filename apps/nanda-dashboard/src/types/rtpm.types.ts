// Real-time Performance Monitoring Types
// Aligned with backend API design

export interface Agent {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'warning' | 'error' | 'maintenance';
  version: string;
  capabilities: string[];
  lastSeen: Date;
  region?: string;
  platform?: string;
  tags?: string[];
}

export interface AgentMetrics {
  agentId: string;
  timestamp: Date;
  cpu: number; // 0-100 percentage
  memory: number; // 0-100 percentage
  requestRate: number; // requests per second
  errorRate: number; // 0-100 percentage
  responseTime: number; // milliseconds
  throughput?: number; // operations per second
  activeConnections?: number;
  queueDepth?: number;
  diskUsage?: number; // 0-100 percentage
  networkLatency?: number; // milliseconds
}

export interface AggregatedMetrics {
  timeRange: TimeRange;
  startTime: Date;
  endTime: Date;
  metrics: {
    avgCpu: number;
    avgMemory: number;
    avgResponseTime: number;
    totalRequests: number;
    errorRate: number;
    uptime: number;
    peakCpu: number;
    peakMemory: number;
    minResponseTime: number;
    maxResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
  };
  dataPoints: AgentMetrics[];
}

export interface Alert {
  id: string;
  agentId?: string; // Optional for global alerts
  name: string;
  description?: string;
  metric: MetricType;
  operator: AlertOperator;
  threshold: number;
  actions: AlertAction[];
  enabled: boolean;
  severity: AlertSeverity;
  conditions?: AlertCondition[];
  cooldownPeriod?: number; // seconds
  createdAt: Date;
  updatedAt: Date;
  lastTriggered?: Date;
}

export interface AlertAction {
  type: 'email' | 'webhook' | 'slack' | 'sms' | 'dashboard';
  config: Record<string, any>;
  enabled: boolean;
}

export interface AlertCondition {
  metric: MetricType;
  operator: AlertOperator;
  value: number;
  duration?: number; // seconds - how long condition must persist
}

export interface AlertHistory {
  id: string;
  alertId: string;
  agentId?: string;
  triggeredAt: Date;
  resolvedAt?: Date;
  value: number;
  threshold: number;
  severity: AlertSeverity;
  message: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export interface RealtimeMetrics {
  timestamp: Date;
  agents: {
    total: number;
    online: number;
    offline: number;
    warning: number;
    error: number;
  };
  system: {
    avgCpu: number;
    avgMemory: number;
    avgResponseTime: number;
    requestRate: number;
    errorRate: number;
    throughput: number;
    activeConnections: number;
  };
  network: {
    latency: number;
    bandwidth: number;
    packetLoss: number;
  };
}

export interface HistoricalDataPoint {
  timestamp: Date;
  agentId?: string;
  metrics: Partial<AgentMetrics>;
}

export interface DashboardConfig {
  id: string;
  name: string;
  layout: DashboardLayout[];
  filters: DashboardFilters;
  refreshInterval: number; // seconds
  timeRange: TimeRange;
  autoRefresh: boolean;
  theme: 'light' | 'dark' | 'auto';
}

export interface DashboardLayout {
  id: string;
  type: WidgetType;
  position: { x: number; y: number; w: number; h: number };
  config: Record<string, any>;
}

export interface DashboardFilters {
  agentIds?: string[];
  regions?: string[];
  platforms?: string[];
  statuses?: Agent['status'][];
  tags?: string[];
}

export interface ExportConfig {
  format: 'csv' | 'json' | 'pdf' | 'excel';
  timeRange: TimeRange;
  agentIds?: string[];
  metrics: MetricType[];
  includeCharts?: boolean;
  includeAlerts?: boolean;
}

export interface WebSocketMessage {
  type: 'metrics' | 'alert' | 'agent_status' | 'system_health';
  timestamp: Date;
  data: any;
  agentId?: string;
}

// Enums and Type Unions
export type TimeRange = '1h' | '6h' | '24h' | '7d' | '30d' | 'custom';

export type MetricType =
  | 'cpu'
  | 'memory'
  | 'responseTime'
  | 'requestRate'
  | 'errorRate'
  | 'throughput'
  | 'activeConnections'
  | 'queueDepth'
  | 'diskUsage'
  | 'networkLatency'
  | 'uptime';

export type AlertOperator =
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'eq'
  | 'neq'
  | 'contains'
  | 'not_contains';

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

export type WidgetType =
  | 'metrics_overview'
  | 'agent_grid'
  | 'historical_chart'
  | 'realtime_chart'
  | 'alert_list'
  | 'system_health'
  | 'top_agents'
  | 'error_breakdown'
  | 'response_time_heatmap'
  | 'geographic_map';

// Chart Configuration Types
export interface ChartConfig {
  type: 'line' | 'area' | 'bar' | 'pie' | 'heatmap' | 'gauge';
  metrics: MetricType[];
  timeRange: TimeRange;
  aggregation: 'avg' | 'sum' | 'min' | 'max' | 'p95' | 'p99';
  groupBy?: 'agent' | 'region' | 'platform' | 'status';
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  animate?: boolean;
  height?: number;
}

// Virtualization Types for Large Agent Lists
export interface VirtualizedAgentRow {
  id: string;
  agent: Agent;
  metrics: AgentMetrics;
  alerts: AlertHistory[];
  height: number;
  index: number;
}

export interface GridViewConfig {
  itemsPerPage: number;
  sortBy: keyof Agent | keyof AgentMetrics;
  sortOrder: 'asc' | 'desc';
  filters: DashboardFilters;
  groupBy?: 'status' | 'region' | 'platform';
  viewMode: 'grid' | 'list' | 'compact';
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Health Check Types
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  timestamp: Date;
  checks: {
    database: boolean;
    redis: boolean;
    websocket: boolean;
    monitoring: boolean;
  };
  metrics: {
    memoryUsage: number;
    cpuUsage: number;
    activeConnections: number;
    messageQueueSize: number;
  };
}

// Performance Thresholds
export interface PerformanceThresholds {
  cpu: { warning: number; critical: number };
  memory: { warning: number; critical: number };
  responseTime: { warning: number; critical: number };
  errorRate: { warning: number; critical: number };
  diskUsage: { warning: number; critical: number };
}

// Default thresholds
export const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  cpu: { warning: 70, critical: 90 },
  memory: { warning: 80, critical: 95 },
  responseTime: { warning: 1000, critical: 5000 },
  errorRate: { warning: 5, critical: 10 },
  diskUsage: { warning: 80, critical: 95 }
};
