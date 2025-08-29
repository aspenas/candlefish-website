// API Types and Interfaces for CLOS Dashboard

export interface Service {
  id: string;
  name: string;
  port: number;
  group: string;
  status: 'running' | 'stopped' | 'unhealthy';
  health: 'healthy' | 'unhealthy' | 'unknown';
  cpu: number;
  memory: number;
  started_at?: string;
  dependencies?: string[];
}

export interface Port {
  port: number;
  service_id: string;
  allocated_at: string;
  status: 'allocated' | 'free' | 'conflict';
}

export interface HealthMetric {
  service_id: string;
  cpu: number;
  memory: number;
  disk: number;
  timestamp: string;
}

export interface LogEntry {
  id: string;
  service_id: string;
  message: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  timestamp: string;
}

export interface SystemHealth {
  docker: {
    status: 'healthy' | 'unhealthy';
    version: string;
  };
  network: {
    status: 'healthy' | 'unhealthy';
    name: string;
  };
  registry: {
    status: 'healthy' | 'unhealthy';
    type: string;
  };
  uptime: number;
  total_services: number;
  running_services: number;
}

export interface PortConflict {
  port: number;
  conflicting_services: string[];
  suggested_ports: number[];
}

// WebSocket Message Types
export interface WebSocketMessage {
  type: 'service_update' | 'health_update' | 'log_entry' | 'port_conflict';
  data: any;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  has_next: boolean;
}

// Request Types
export interface StartServiceRequest {
  environment?: Record<string, string>;
  restart_policy?: 'no' | 'always' | 'on-failure';
}

export interface LogFilterRequest {
  service_id?: string;
  level?: LogEntry['level'];
  start_time?: string;
  end_time?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface PortResolveRequest {
  conflicts: PortConflict[];
  auto_resolve?: boolean;
}