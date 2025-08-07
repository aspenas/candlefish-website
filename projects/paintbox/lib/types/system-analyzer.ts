// System Analyzer Types
// Matches the GraphQL schema for type safety

export type ServiceStatus = 
  | 'HEALTHY' 
  | 'DEGRADED' 
  | 'UNHEALTHY' 
  | 'UNKNOWN' 
  | 'MAINTENANCE';

export type ProcessStatus = 
  | 'RUNNING' 
  | 'STOPPED' 
  | 'CRASHED' 
  | 'STARTING' 
  | 'STOPPING' 
  | 'UNKNOWN';

export type AlertSeverity = 
  | 'LOW' 
  | 'MEDIUM' 
  | 'HIGH' 
  | 'CRITICAL';

export type ResourceType = 
  | 'CPU' 
  | 'MEMORY' 
  | 'DISK' 
  | 'NETWORK' 
  | 'DATABASE_CONNECTIONS' 
  | 'API_REQUESTS' 
  | 'CUSTOM';

export type DependencyType = 
  | 'DATABASE' 
  | 'API' 
  | 'MESSAGE_QUEUE' 
  | 'CACHE' 
  | 'FILE_STORAGE' 
  | 'AUTHENTICATION' 
  | 'EXTERNAL_SERVICE';

export type AlertStatus = 
  | 'ACTIVE' 
  | 'RESOLVED' 
  | 'ACKNOWLEDGED' 
  | 'SUPPRESSED';

export type AlertCondition = 
  | 'GREATER_THAN' 
  | 'LESS_THAN' 
  | 'EQUALS' 
  | 'NOT_EQUALS' 
  | 'GREATER_THAN_OR_EQUAL' 
  | 'LESS_THAN_OR_EQUAL' 
  | 'CHANGE_RATE_POSITIVE' 
  | 'CHANGE_RATE_NEGATIVE';

export type AggregationType = 
  | 'AVG' 
  | 'MIN' 
  | 'MAX' 
  | 'SUM' 
  | 'COUNT' 
  | 'P50' 
  | 'P90' 
  | 'P95' 
  | 'P99';

export type InsightType = 
  | 'PERFORMANCE_DEGRADATION' 
  | 'RESOURCE_EXHAUSTION' 
  | 'ANOMALY_DETECTION' 
  | 'CAPACITY_PLANNING' 
  | 'DEPENDENCY_FAILURE' 
  | 'ERROR_RATE_SPIKE';

export type TrendDirection = 
  | 'INCREASING' 
  | 'DECREASING' 
  | 'STABLE' 
  | 'VOLATILE';

export type RecommendationType = 
  | 'SCALING' 
  | 'OPTIMIZATION' 
  | 'CONFIGURATION' 
  | 'SECURITY' 
  | 'MAINTENANCE' 
  | 'MONITORING';

// Core interfaces
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
  
  // Relationships
  dependencies: ServiceDependency[];
  containers: Container[];
  processes: Process[];
  metrics: Metric[];
  alerts: Alert[];
  
  // Timestamps
  discoveredAt: Date;
  lastHealthCheck?: Date;
  lastStatusChange?: Date;
  uptime?: number; // in milliseconds
  
  // Configuration
  autoDiscovered: boolean;
  monitoringEnabled: boolean;
  alertingEnabled: boolean;
  
  // Health Check Configuration
  healthCheckInterval?: number; // in milliseconds
  healthCheckTimeout?: number; // in milliseconds
  healthCheckRetries?: number;
}

export interface ServiceDependency {
  id: string;
  serviceId: string;
  dependsOnId: string;
  service: Service;
  dependsOn: Service;
  type: DependencyType;
  critical: boolean;
  healthImpact: number; // 0-1 scale
}

export interface Container {
  id: string;
  name: string;
  image: string;
  tag?: string;
  status: ProcessStatus;
  serviceId?: string;
  service?: Service;
  
  // Resource Usage
  cpuUsage?: number;
  memoryUsage?: number;
  memoryLimit?: number;
  networkRx?: number;
  networkTx?: number;
  diskUsage?: number;
  
  // Configuration
  environment: EnvironmentVariable[];
  ports: PortMapping[];
  volumes: VolumeMount[];
  
  // Timestamps
  createdAt: Date;
  startedAt?: Date;
  lastRestart?: Date;
  
  // Health
  healthCheck?: ContainerHealthCheck;
  restartCount: number;
}

export interface Process {
  id: string;
  pid: number;
  name: string;
  command: string;
  status: ProcessStatus;
  serviceId?: string;
  service?: Service;
  
  // Resource Usage
  cpuPercent?: number;
  memoryMb?: number;
  openFiles?: number;
  threads?: number;
  
  // Process Info
  user?: string;
  startTime: Date;
  parentPid?: number;
  children: Process[];
  
  // Environment
  workingDirectory?: string;
  environment: EnvironmentVariable[];
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
  interval: number; // in milliseconds
  timeout: number; // in milliseconds
  retries: number;
  startPeriod?: number; // in milliseconds
}

export interface Metric {
  id: string;
  serviceId: string;
  service: Service;
  name: string;
  type: ResourceType;
  value: number;
  unit: string;
  timestamp: Date;
  labels?: Record<string, any>;
  
  // Thresholds for alerting
  warningThreshold?: number;
  criticalThreshold?: number;
}

export interface MetricSeries {
  serviceId: string;
  service: Service;
  name: string;
  type: ResourceType;
  unit: string;
  dataPoints: MetricDataPoint[];
  aggregation: AggregationType;
  timeRange: TimeRange;
}

export interface MetricDataPoint {
  timestamp: Date;
  value: number;
  labels?: Record<string, any>;
}

export interface TimeRange {
  start: Date;
  end: Date;
  duration: number; // in milliseconds
}

export interface Alert {
  id: string;
  serviceId: string;
  service: Service;
  name: string;
  description: string;
  severity: AlertSeverity;
  status: AlertStatus;
  
  // Rule Configuration
  ruleId: string;
  rule: AlertRule;
  
  // Lifecycle
  triggeredAt: Date;
  resolvedAt?: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  
  // Notifications
  notifications: AlertNotification[];
  
  // Related Data
  triggerMetricId?: string;
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
  duration: number; // How long condition must be true (in milliseconds)
  severity: AlertSeverity;
  enabled: boolean;
  
  // Notification settings
  notificationChannels: string[];
  suppressDuration?: number; // in milliseconds
  
  // Service targeting
  serviceIds: string[];
  services: Service[];
  tags: string[];
}

export interface AlertNotification {
  id: string;
  alertId: string;
  alert: Alert;
  channel: string; // slack, email, webhook, pagerduty, etc.
  sentAt: Date;
  acknowledged: boolean;
  response?: string;
}

export interface SystemAnalysis {
  id: string;
  timestamp: Date;
  
  // Overall Health
  overallHealth: ServiceStatus;
  healthScore: number; // 0-100
  
  // Service Analysis
  totalServices: number;
  healthyServices: number;
  degradedServices: number;
  unhealthyServices: number;
  
  // Performance Insights
  performanceInsights: PerformanceInsight[];
  resourceUtilization: SystemResourceUtilization;
  
  // Alerts Summary
  activeAlerts: number;
  alertsByService: ServiceAlertSummary[];
  
  // Recommendations
  recommendations: SystemRecommendation[];
  
  // Trends
  trendAnalysis: TrendAnalysis;
}

export interface PerformanceInsight {
  type: InsightType;
  severity: AlertSeverity;
  title: string;
  description: string;
  serviceId?: string;
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
  serviceId: string;
  service: Service;
  activeAlerts: number;
  criticalAlerts: number;
  lastAlert?: Date;
}

export interface SystemRecommendation {
  id: string;
  type: RecommendationType;
  priority: AlertSeverity;
  title: string;
  description: string;
  serviceId?: string;
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
  availabilityTrend: number; // Percentage
  mttrTrend: TrendDirection; // Mean Time To Resolution
}

// Input types for mutations
export interface RegisterServiceInput {
  name: string;
  displayName?: string;
  description?: string;
  version?: string;
  environment: string;
  baseUrl?: string;
  healthEndpoint?: string;
  tags: string[];
  dependencies: ServiceDependencyInput[];
  monitoringEnabled?: boolean;
  alertingEnabled?: boolean;
  healthCheckInterval?: number;
  healthCheckTimeout?: number;
  healthCheckRetries?: number;
}

export interface UpdateServiceInput {
  displayName?: string;
  description?: string;
  version?: string;
  baseUrl?: string;
  healthEndpoint?: string;
  tags?: string[];
  monitoringEnabled?: boolean;
  alertingEnabled?: boolean;
  healthCheckInterval?: number;
  healthCheckTimeout?: number;
  healthCheckRetries?: number;
}

export interface ServiceDependencyInput {
  dependsOnServiceId: string;
  type: DependencyType;
  critical: boolean;
  healthImpact: number;
}

export interface CreateAlertRuleInput {
  name: string;
  description?: string;
  metric: string;
  condition: AlertCondition;
  threshold: number;
  duration: number;
  severity: AlertSeverity;
  serviceIds: string[];
  tags?: string[];
  notificationChannels: string[];
  suppressDuration?: number;
}

export interface UpdateAlertRuleInput {
  name?: string;
  description?: string;
  metric?: string;
  condition?: AlertCondition;
  threshold?: number;
  duration?: number;
  severity?: AlertSeverity;
  enabled?: boolean;
  serviceIds?: string[];
  tags?: string[];
  notificationChannels?: string[];
  suppressDuration?: number;
}

export interface TimeRangeInput {
  start?: Date;
  end?: Date;
  duration?: number; // Alternative to start/end, in milliseconds
}

// Response types
export interface ServiceHealthResult {
  service: Service;
  status: ServiceStatus;
  responseTime?: number; // in milliseconds
  checks: HealthCheckResult[];
  timestamp: Date;
  error?: string;
}

export interface HealthCheckResult {
  name: string;
  status: ServiceStatus;
  message?: string;
  duration: number; // in milliseconds
}

export interface ServiceStatusUpdate {
  service: Service;
  previousStatus: ServiceStatus;
  currentStatus: ServiceStatus;
  timestamp: Date;
  reason?: string;
}

export interface ContainerStatusUpdate {
  container: Container;
  previousStatus: ProcessStatus;
  currentStatus: ProcessStatus;
  timestamp: Date;
  reason?: string;
}

export interface ProcessStatusUpdate {
  process: Process;
  previousStatus: ProcessStatus;
  currentStatus: ProcessStatus;
  timestamp: Date;
  reason?: string;
}

export interface ServiceActionResult {
  success: boolean;
  message: string;
  service: Service;
  timestamp: Date;
}

export interface ContainerActionResult {
  success: boolean;
  message: string;
  container: Container;
  timestamp: Date;
}

// Query filter interfaces
export interface ServiceFilters {
  status?: ServiceStatus;
  environment?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface MetricFilters {
  serviceId?: string;
  type?: ResourceType;
  timeRange?: TimeRangeInput;
  limit?: number;
}

export interface AlertFilters {
  serviceId?: string;
  severity?: AlertSeverity;
  status?: AlertStatus;
  limit?: number;
  offset?: number;
}

export interface AlertRuleFilters {
  serviceId?: string;
  enabled?: boolean;
  severity?: AlertSeverity;
}

export interface ContainerFilters {
  serviceId?: string;
  status?: ProcessStatus;
}

export interface ProcessFilters {
  serviceId?: string;
  status?: ProcessStatus;
}