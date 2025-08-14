/**
 * Production deployment feature types for Paintbox application
 */

import { APIResponse, PaginatedResponse } from './api';

// Temporal Cloud Management Types
export interface TemporalConnection {
  id: string;
  name: string;
  namespace: string;
  endpoint: string;
  status: 'connected' | 'disconnected' | 'testing' | 'error';
  createdAt: string;
  updatedAt: string;
  lastTestAt?: string;
  metadata?: Record<string, any>;
  tls?: {
    enabled: boolean;
    cert?: string;
    key?: string;
  };
}

export interface TemporalWorkflow {
  id: string;
  name: string;
  connectionId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'terminated';
  startTime: string;
  endTime?: string;
  runId: string;
  workflowType: string;
  input?: any;
  result?: any;
  error?: string;
  history?: WorkflowEvent[];
}

export interface WorkflowEvent {
  id: string;
  timestamp: string;
  eventType: string;
  eventId: number;
  details: Record<string, any>;
}

// API Key Management Types
export interface APIKey {
  id: string;
  name: string;
  keyPrefix: string;
  status: 'active' | 'revoked' | 'expired';
  permissions: string[];
  createdAt: string;
  expiresAt?: string;
  lastUsedAt?: string;
  usage: {
    total: number;
    thisMonth: number;
    thisWeek: number;
  };
  rateLimits: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
}

export interface APIKeyUsage {
  timestamp: string;
  requests: number;
  errors: number;
  endpoints: Record<string, number>;
}

export interface APIKeyRotationSchedule {
  id: string;
  keyId: string;
  scheduledAt: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  notificationSent: boolean;
}

// Monitoring & Alerting Types
export interface MonitoringMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: string;
  tags?: Record<string, string>;
  threshold?: {
    warning: number;
    critical: number;
  };
}

export interface Alert {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'resolved' | 'suppressed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  metricName: string;
  condition: {
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    threshold: number;
    duration: number; // in minutes
  };
  notifications: {
    channels: string[];
    escalation?: {
      delay: number; // in minutes
      channels: string[];
    };
  };
  createdAt: string;
  triggeredAt?: string;
  resolvedAt?: string;
  lastNotificationAt?: string;
}

export interface NotificationChannel {
  id: string;
  name: string;
  type: 'email' | 'slack' | 'webhook' | 'sms';
  config: {
    email?: { address: string };
    slack?: { webhook: string; channel: string };
    webhook?: { url: string; headers?: Record<string, string> };
    sms?: { phoneNumber: string };
  };
  enabled: boolean;
  createdAt: string;
}

export interface MonitoringDashboard {
  id: string;
  name: string;
  description: string;
  panels: DashboardPanel[];
  timeRange: {
    from: string;
    to: string;
  };
  refreshInterval: number; // in seconds
  createdAt: string;
  updatedAt: string;
}

export interface DashboardPanel {
  id: string;
  title: string;
  type: 'line' | 'bar' | 'gauge' | 'single_stat' | 'table';
  metrics: string[];
  position: { x: number; y: number; width: number; height: number };
  config?: Record<string, any>;
}

// Circuit Breaker Types
export interface CircuitBreaker {
  name: string;
  service: string;
  state: 'closed' | 'open' | 'half_open';
  failureThreshold: number;
  recoveryTimeout: number; // in seconds
  requestTimeout: number; // in milliseconds
  metrics: {
    successCount: number;
    failureCount: number;
    timeouts: number;
    consecutiveFailures: number;
    lastFailureTime?: string;
    lastSuccessTime?: string;
  };
  config: {
    enabled: boolean;
    automaticRecovery: boolean;
    notificationsEnabled: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CircuitBreakerMetrics {
  timestamp: string;
  requestCount: number;
  successCount: number;
  failureCount: number;
  timeouts: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
}

// Security Types
export interface SecurityScan {
  id: string;
  name: string;
  type: 'vulnerability' | 'compliance' | 'dependency' | 'secret';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  target: {
    type: 'repository' | 'deployment' | 'container' | 'api';
    identifier: string;
  };
  config: {
    depth: 'shallow' | 'deep';
    includeDependencies: boolean;
    excludePatterns?: string[];
  };
  results?: {
    vulnerabilities: Vulnerability[];
    summary: ScanSummary;
  };
  startedAt: string;
  completedAt?: string;
  triggeredBy: 'manual' | 'scheduled' | 'webhook';
}

export interface Vulnerability {
  id: string;
  cve?: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  score?: number; // CVSS score
  category: 'injection' | 'broken_auth' | 'sensitive_data' | 'xxe' | 'broken_access' | 'security_misconfig' | 'xss' | 'insecure_deserialization' | 'vulnerable_components' | 'insufficient_logging';
  status: 'open' | 'fixed' | 'accepted' | 'false_positive';
  location: {
    file?: string;
    line?: number;
    component?: string;
    dependency?: string;
  };
  remediation?: {
    description: string;
    references: string[];
    effort: 'low' | 'medium' | 'high';
  };
  firstDetected: string;
  lastSeen: string;
}

export interface ScanSummary {
  totalVulnerabilities: number;
  severityBreakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  categoryBreakdown: Record<Vulnerability['category'], number>;
  complianceScore?: number;
  trends: {
    previousScan?: {
      total: number;
      new: number;
      fixed: number;
    };
  };
}

export interface ComplianceStatus {
  framework: string; // e.g., 'SOC2', 'GDPR', 'HIPAA'
  score: number; // 0-100
  status: 'compliant' | 'non_compliant' | 'in_progress';
  controls: ComplianceControl[];
  lastAssessment: string;
  nextAssessment: string;
}

export interface ComplianceControl {
  id: string;
  name: string;
  description: string;
  status: 'implemented' | 'not_implemented' | 'partially_implemented';
  evidence?: string[];
  lastReview: string;
  responsible: string;
}

// WebSocket Event Types
export interface WebSocketEvent {
  type: 'metric_update' | 'alert_triggered' | 'circuit_breaker_state_change' | 'scan_completed' | 'workflow_update';
  timestamp: string;
  data: any;
}

// Store Types
export interface ProductionStore {
  temporal: {
    connections: TemporalConnection[];
    workflows: TemporalWorkflow[];
    selectedConnection?: string;
    isLoading: boolean;
  };
  apiKeys: {
    keys: APIKey[];
    usage: Record<string, APIKeyUsage[]>;
    rotationSchedule: APIKeyRotationSchedule[];
    isLoading: boolean;
  };
  monitoring: {
    metrics: Record<string, MonitoringMetric[]>;
    alerts: Alert[];
    channels: NotificationChannel[];
    dashboards: MonitoringDashboard[];
    realTimeData: Record<string, any>;
    isLoading: boolean;
  };
  circuitBreakers: {
    breakers: CircuitBreaker[];
    metrics: Record<string, CircuitBreakerMetrics[]>;
    isLoading: boolean;
  };
  security: {
    scans: SecurityScan[];
    vulnerabilities: Vulnerability[];
    compliance: ComplianceStatus[];
    isLoading: boolean;
  };
}
