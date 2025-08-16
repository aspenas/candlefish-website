/**
 * Infrastructure Management System Types
 * TypeScript definitions for health monitoring, temporal workflows, and system management
 */

// ===== HEALTH MONITORING TYPES =====

export interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  details?: Record<string, any>;
  error?: string;
  lastChecked?: string;
}

export interface HealthSummary {
  total: number;
  healthy: number;
  unhealthy: number;
  degraded: number;
}

export interface HealthResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: Record<string, HealthCheckResult>;
  summary: HealthSummary;
}

export interface HealthMetrics {
  responseTime: number[];
  timestamp: string[];
  status: ('healthy' | 'unhealthy' | 'degraded')[];
}

// ===== TEMPORAL WORKFLOW TYPES =====

export interface WorkflowInput {
  prompt: string;
  userId: string;
  conversationId?: string;
  context?: Record<string, any>;
  options?: {
    timeout?: number;
    maxCost?: number;
    preferredModel?: string;
  };
}

export interface WorkflowMetadata {
  workflowId: string;
  duration: number;
  toolsUsed: string[];
  llmCost: number;
  success: boolean;
}

export interface WorkflowOutput {
  response: string;
  metadata: WorkflowMetadata;
}

export interface WorkflowExecution {
  id: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'terminated';
  startTime: string;
  endTime?: string;
  input: WorkflowInput;
  output?: WorkflowOutput;
  error?: string;
  progress?: number;
}

export interface WorkflowMetrics {
  totalExecutions: number;
  successRate: number;
  averageDuration: number;
  averageCost: number;
  executionsToday: number;
  executionsThisWeek: number;
}

// ===== SLACK INTEGRATION TYPES =====

export interface SlackWebhookConfig {
  url: string;
  channel: string;
  username?: string;
  iconEmoji?: string;
  enabled: boolean;
}

export interface SlackMessageTemplate {
  id: string;
  name: string;
  template: string;
  variables: string[];
  eventType: string;
}

export interface SlackEventConfig {
  eventType: string;
  enabled: boolean;
  webhookId: string;
  templateId?: string;
  conditions?: Record<string, any>;
}

export interface SlackDeliveryStatus {
  id: string;
  timestamp: string;
  webhookId: string;
  status: 'delivered' | 'failed' | 'pending';
  message: string;
  error?: string;
  responseTime?: number;
}

// ===== LOAD TESTING TYPES =====

export interface LoadTestScenario {
  id: string;
  name: string;
  description: string;
  config: {
    duration: number;
    rampUp: number;
    virtualUsers: number;
    requestsPerSecond?: number;
  };
  endpoints: LoadTestEndpoint[];
}

export interface LoadTestEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  body?: any;
  weight: number;
}

export interface LoadTestResult {
  id: string;
  scenarioId: string;
  startTime: string;
  endTime?: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  metrics: LoadTestMetrics;
}

export interface LoadTestMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  throughput: number;
}

export interface LoadTestRealTimeMetrics {
  timestamp: string;
  activeUsers: number;
  requestsPerSecond: number;
  responseTime: number;
  errorRate: number;
  errors: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
}

// ===== DISASTER RECOVERY TYPES =====

export interface BackupStatus {
  id: string;
  type: 'database' | 'files' | 'configuration' | 'full';
  status: 'completed' | 'running' | 'failed' | 'scheduled';
  startTime: string;
  endTime?: string;
  size?: string;
  location: string;
  retentionDate: string;
}

export interface RestorePoint {
  id: string;
  name: string;
  timestamp: string;
  type: 'automatic' | 'manual';
  size: string;
  integrity: 'verified' | 'unverified' | 'corrupted';
  description?: string;
}

export interface FailoverStatus {
  primaryRegion: string;
  secondaryRegion: string;
  status: 'active' | 'standby' | 'failing-over' | 'failed-over';
  lastFailover?: string;
  healthChecks: {
    primary: boolean;
    secondary: boolean;
  };
}

export interface DRMetrics {
  rto: number; // Recovery Time Objective (minutes)
  rpo: number; // Recovery Point Objective (minutes)
  lastSuccessfulBackup: string;
  backupFrequency: string;
  replicationLag: number; // seconds
}

export interface DRDrill {
  id: string;
  name: string;
  scheduledTime: string;
  completedTime?: string;
  status: 'scheduled' | 'running' | 'completed' | 'failed';
  type: 'backup-restore' | 'failover' | 'full-dr';
  results?: {
    rto: number;
    rpo: number;
    success: boolean;
    issues: string[];
  };
}

// ===== WEBSOCKET TYPES =====

export interface WebSocketMessage {
  type: 'health-update' | 'workflow-update' | 'load-test-update' | 'backup-update' | 'alert';
  payload: any;
  timestamp: string;
}

export interface AlertMessage {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  source: string;
  acknowledged?: boolean;
}

// ===== SYSTEM CONFIGURATION TYPES =====

export interface SystemThresholds {
  health: {
    responseTimeWarning: number; // ms
    responseTimeError: number; // ms
    errorRateWarning: number; // percentage
    errorRateError: number; // percentage
  };
  performance: {
    cpuWarning: number; // percentage
    cpuError: number; // percentage
    memoryWarning: number; // percentage
    memoryError: number; // percentage
    diskWarning: number; // percentage
    diskError: number; // percentage
  };
  workflow: {
    durationWarning: number; // ms
    durationError: number; // ms
    costWarning: number; // USD
    costError: number; // USD
  };
}

export interface NotificationSettings {
  enabled: boolean;
  channels: ('email' | 'slack' | 'webhook')[];
  filters: {
    severity: ('info' | 'warning' | 'error' | 'critical')[];
    sources: string[];
  };
}

// ===== STORE STATE TYPES =====

export interface HealthStore {
  currentHealth: HealthResponse | null;
  healthHistory: HealthMetrics;
  isLoading: boolean;
  error: string | null;
  lastUpdate: string | null;
  autoRefresh: boolean;
  refreshInterval: number;
}

export interface WorkflowStore {
  executions: WorkflowExecution[];
  activeExecution: WorkflowExecution | null;
  metrics: WorkflowMetrics | null;
  isExecuting: boolean;
  executionHistory: WorkflowExecution[];
  filters: {
    status?: string;
    dateRange?: [string, string];
    userId?: string;
  };
}

export interface LoadTestStore {
  scenarios: LoadTestScenario[];
  activeTest: LoadTestResult | null;
  testHistory: LoadTestResult[];
  realTimeMetrics: LoadTestRealTimeMetrics | null;
  isRunning: boolean;
}

export interface DRStore {
  backupStatus: BackupStatus[];
  restorePoints: RestorePoint[];
  failoverStatus: FailoverStatus;
  metrics: DRMetrics;
  drills: DRDrill[];
  isRestoring: boolean;
}

export interface AlertStore {
  alerts: AlertMessage[];
  unreadCount: number;
  filters: {
    severity?: string[];
    source?: string[];
    acknowledged?: boolean;
  };
}