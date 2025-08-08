/**
 * TypeScript types for System Analyzer Dashboard
 * Generated from GraphQL schema
 */

// Enums
export enum ServiceStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  UNHEALTHY = 'UNHEALTHY',
  UNKNOWN = 'UNKNOWN',
  MAINTENANCE = 'MAINTENANCE'
}

export enum ProcessStatus {
  RUNNING = 'RUNNING',
  STOPPED = 'STOPPED',
  CRASHED = 'CRASHED',
  STARTING = 'STARTING',
  STOPPING = 'STOPPING',
  UNKNOWN = 'UNKNOWN'
}

export enum AlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum AlertStatus {
  ACTIVE = 'ACTIVE',
  RESOLVED = 'RESOLVED',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  SUPPRESSED = 'SUPPRESSED'
}

export enum ResourceType {
  CPU = 'CPU',
  MEMORY = 'MEMORY',
  DISK = 'DISK',
  NETWORK = 'NETWORK',
  DATABASE_CONNECTIONS = 'DATABASE_CONNECTIONS',
  API_REQUESTS = 'API_REQUESTS',
  CUSTOM = 'CUSTOM'
}

export enum DependencyType {
  DATABASE = 'DATABASE',
  API = 'API',
  MESSAGE_QUEUE = 'MESSAGE_QUEUE',
  CACHE = 'CACHE',
  FILE_STORAGE = 'FILE_STORAGE',
  AUTHENTICATION = 'AUTHENTICATION',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE'
}

export enum TrendDirection {
  INCREASING = 'INCREASING',
  DECREASING = 'DECREASING',
  STABLE = 'STABLE',
  VOLATILE = 'VOLATILE'
}

export enum InsightType {
  PERFORMANCE_DEGRADATION = 'PERFORMANCE_DEGRADATION',
  RESOURCE_EXHAUSTION = 'RESOURCE_EXHAUSTION',
  ANOMALY_DETECTION = 'ANOMALY_DETECTION',
  CAPACITY_PLANNING = 'CAPACITY_PLANNING',
  DEPENDENCY_FAILURE = 'DEPENDENCY_FAILURE',
  ERROR_RATE_SPIKE = 'ERROR_RATE_SPIKE'
}

export enum RecommendationType {
  SCALING = 'SCALING',
  OPTIMIZATION = 'OPTIMIZATION',
  CONFIGURATION = 'CONFIGURATION',
  SECURITY = 'SECURITY',
  MAINTENANCE = 'MAINTENANCE',
  MONITORING = 'MONITORING'
}

export enum AggregationType {
  AVG = 'AVG',
  MIN = 'MIN',
  MAX = 'MAX',
  SUM = 'SUM',
  COUNT = 'COUNT',
  P50 = 'P50',
  P90 = 'P90',
  P95 = 'P95',
  P99 = 'P99'
}

export enum AlertCondition {
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN',
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  GREATER_THAN_OR_EQUAL = 'GREATER_THAN_OR_EQUAL',
  LESS_THAN_OR_EQUAL = 'LESS_THAN_OR_EQUAL',
  CHANGE_RATE_POSITIVE = 'CHANGE_RATE_POSITIVE',
  CHANGE_RATE_NEGATIVE = 'CHANGE_RATE_NEGATIVE'
}

// Base types
export interface TimeRange {
  start: string;
  end: string;
  duration: string;
}

export interface EnvironmentVariable {
  key: string;
  value?: string;
  masked: boolean;
}

export interface PortMapping {
  containerPort: number;
  hostPort?: number;
  protocol: string;
}

export interface VolumeMount {
  source: string;
  destination: string;
  readOnly: boolean;
}

export interface ContainerHealthCheck {
  command: string[];
  interval: string;
  timeout: string;
  retries: number;
  startPeriod?: string;
}

// Core entities
export interface Service {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  version?: string;
  environment: string;
  status: ServiceStatus;
  healthEndpoint?: string;
  baseUrl?: string;
  tags: string[];
  discoveredAt: string;
  lastHealthCheck?: string;
  lastStatusChange?: string;
  uptime?: string;
  autoDiscovered: boolean;
  monitoringEnabled: boolean;
  alertingEnabled: boolean;
  healthCheckInterval?: string;
  healthCheckTimeout?: string;
  healthCheckRetries?: number;
  dependencies?: ServiceDependency[];
  containers?: Container[];
  processes?: Process[];
  metrics?: Metric[];
  alerts?: Alert[];
}

export interface ServiceDependency {
  id: string;
  service: Service;
  dependsOn: Service;
  type: DependencyType;
  critical: boolean;
  healthImpact: number;
}

export interface Container {
  id: string;
  name: string;
  image: string;
  tag?: string;
  status: ProcessStatus;
  service?: Service;
  cpuUsage?: number;
  memoryUsage?: number;
  memoryLimit?: number;
  networkRx?: number;
  networkTx?: number;
  diskUsage?: number;
  environment: EnvironmentVariable[];
  ports: PortMapping[];
  volumes: VolumeMount[];
  createdAt: string;
  startedAt?: string;
  lastRestart?: string;
  healthCheck?: ContainerHealthCheck;
  restartCount: number;
}

export interface Process {
  id: string;
  pid: number;
  name: string;
  command: string;
  status: ProcessStatus;
  service?: Service;
  cpuPercent?: number;
  memoryMb?: number;
  openFiles?: number;
  threads?: number;
  user?: string;
  startTime: string;
  parentPid?: number;
  children?: Process[];
  workingDirectory?: string;
  environment: EnvironmentVariable[];
}

export interface Metric {
  id: string;
  service: Service;
  name: string;
  type: ResourceType;
  value: number;
  unit: string;
  timestamp: string;
  labels?: Record<string, any>;
  warningThreshold?: number;
  criticalThreshold?: number;
}

export interface MetricSeries {
  service: Service;
  name: string;
  type: ResourceType;
  unit: string;
  dataPoints: MetricDataPoint[];
  aggregation: AggregationType;
  timeRange: TimeRange;
}

export interface MetricDataPoint {
  timestamp: string;
  value: number;
  labels?: Record<string, any>;
}

export interface Alert {
  id: string;
  service: Service;
  name: string;
  description: string;
  severity: AlertSeverity;
  status: AlertStatus;
  rule: AlertRule;
  triggeredAt: string;
  resolvedAt?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  notifications: AlertNotification[];
  triggerMetric?: Metric;
  triggerValue?: number;
  thresholdValue?: number;
}

export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  metric: string;
  condition: AlertCondition;
  threshold: number;
  duration: string;
  severity: AlertSeverity;
  enabled: boolean;
  notificationChannels: string[];
  suppressDuration?: string;
  services: Service[];
  tags: string[];
}

export interface AlertNotification {
  id: string;
  alert: Alert;
  channel: string;
  sentAt: string;
  acknowledged: boolean;
  response?: string;
}

export interface SystemAnalysis {
  id: string;
  timestamp: string;
  overallHealth: ServiceStatus;
  healthScore: number;
  totalServices: number;
  healthyServices: number;
  degradedServices: number;
  unhealthyServices: number;
  performanceInsights: PerformanceInsight[];
  resourceUtilization: SystemResourceUtilization;
  activeAlerts: number;
  alertsByService: ServiceAlertSummary[];
  recommendations: SystemRecommendation[];
  trendAnalysis: TrendAnalysis;
}

export interface PerformanceInsight {
  type: InsightType;
  severity: AlertSeverity;
  title: string;
  description: string;
  service?: Service;
  metric?: string;
  currentValue?: number;
  expectedValue?: number;
  impact: string;
  recommendation: string;
}

export interface SystemResourceUtilization {
  cpu: ResourceUtilization;
  memory: ResourceUtilization;
  disk: ResourceUtilization;
  network: ResourceUtilization;
}

export interface ResourceUtilization {
  current: number;
  average: number;
  peak: number;
  percentile95: number;
  trend: TrendDirection;
}

export interface ServiceAlertSummary {
  service: Service;
  activeAlerts: number;
  criticalAlerts: number;
  lastAlert?: string;
}

export interface SystemRecommendation {
  id: string;
  type: RecommendationType;
  priority: AlertSeverity;
  title: string;
  description: string;
  service?: Service;
  estimatedImpact: string;
  actionItems: string[];
  automatable: boolean;
}

export interface TrendAnalysis {
  timeRange: TimeRange;
  serviceHealthTrend: TrendDirection;
  alertFrequencyTrend: TrendDirection;
  performanceTrend: TrendDirection;
  availabilityTrend: number;
  mttrTrend: TrendDirection;
}

// Health check types
export interface ServiceHealthResult {
  service: Service;
  status: ServiceStatus;
  responseTime?: string;
  checks: HealthCheckResult[];
  timestamp: string;
  error?: string;
}

export interface HealthCheckResult {
  name: string;
  status: ServiceStatus;
  message?: string;
  duration: string;
}

// Subscription update types
export interface ServiceStatusUpdate {
  service: Service;
  previousStatus: ServiceStatus;
  currentStatus: ServiceStatus;
  timestamp: string;
  reason?: string;
}

export interface ContainerStatusUpdate {
  container: Container;
  previousStatus: ProcessStatus;
  currentStatus: ProcessStatus;
  timestamp: string;
  reason?: string;
}

export interface ProcessStatusUpdate {
  process: Process;
  previousStatus: ProcessStatus;
  currentStatus: ProcessStatus;
  timestamp: string;
  reason?: string;
}

// Action result types
export interface ServiceActionResult {
  success: boolean;
  message: string;
  service: Service;
  timestamp: string;
}

export interface ContainerActionResult {
  success: boolean;
  message: string;
  container: Container;
  timestamp: string;
}

// Dashboard-specific types
export interface DashboardFilters {
  environment?: string;
  status?: ServiceStatus;
  tags?: string[];
  alertSeverity?: AlertSeverity;
  timeRange?: TimeRange;
}

export interface ChartDataPoint {
  x: string | number;
  y: number;
  label?: string;
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'area';
  title: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  colors?: string[];
  showLegend?: boolean;
  responsive?: boolean;
}

export interface DashboardCard {
  id: string;
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon?: string;
  color?: 'green' | 'yellow' | 'red' | 'blue' | 'gray';
}

export interface NotificationMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  dismissible?: boolean;
}
