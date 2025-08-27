// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Authentication Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: User;
  expiresIn: number;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

// Core Security Types
export interface SecurityOverview {
  totalAssets: number;
  criticalVulnerabilities: number;
  activeAlerts: number;
  complianceScore: number;
  threatLevel: ThreatLevel;
  vulnerabilitiesBySeverity: VulnerabilitySeverityCount[];
  alertsByStatus: AlertStatusCount[];
  complianceBreakdown: ComplianceFramework[];
  realTimeMetrics: DashboardMetrics;
}

export interface Asset {
  id: string;
  name: string;
  assetType: AssetType;
  environment: Environment;
  platform: Platform;
  securityLevel: SecurityLevel;
  healthStatus: HealthStatus;
  lastHealthCheck?: string;
  createdAt: string;
  updatedAt: string;
  vulnerabilities: Vulnerability[];
  alerts: Alert[];
  tags: string[];
  configuration?: AssetConfiguration;
}

export interface Vulnerability {
  id: string;
  cveId?: string;
  title: string;
  description: string;
  severity: Severity;
  status: VulnerabilityStatus;
  cvssScore?: number;
  publishedAt?: string;
  discoveredAt: string;
  lastUpdated: string;
  asset: Asset;
  affectedComponents: string[];
  remediation?: Remediation;
  references: Reference[];
  isExploitable: boolean;
  hasPatch: boolean;
  statusHistory?: StatusHistoryEntry[];
}

export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  status: AlertStatus;
  alertType: AlertType;
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  assignedTo?: User;
  asset?: Asset;
  source: string;
  metadata: Record<string, any>;
  escalationLevel: number;
  responseTime?: number;
  resolutionTime?: number;
  acknowledgmentNote?: string;
  resolution?: string;
}

export interface KongAdminApiStatus {
  isSecure: boolean;
  protocol: string;
  isVulnerable: boolean;
  vulnerabilityDescription?: string;
  riskLevel: ThreatLevel;
  recommendedActions: string[];
  lastChecked: string;
  endpoint: string;
  port?: number;
}

export interface KongVulnerabilityStatus {
  isVulnerable: boolean;
  riskLevel: ThreatLevel;
  recommendedActions: string[];
  lastChecked: string;
}

// Enums
export enum ThreatLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum Severity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum AssetType {
  WEB_APPLICATION = 'WEB_APPLICATION',
  API = 'API',
  DATABASE = 'DATABASE',
  SERVER = 'SERVER',
  CONTAINER = 'CONTAINER',
  NETWORK_DEVICE = 'NETWORK_DEVICE',
  CLOUD_RESOURCE = 'CLOUD_RESOURCE',
}

export enum Environment {
  DEVELOPMENT = 'DEVELOPMENT',
  STAGING = 'STAGING',
  PRODUCTION = 'PRODUCTION',
  TEST = 'TEST',
}

export enum Platform {
  AWS = 'AWS',
  AZURE = 'AZURE',
  GCP = 'GCP',
  KUBERNETES = 'KUBERNETES',
  DOCKER = 'DOCKER',
  NETLIFY = 'NETLIFY',
  VERCEL = 'VERCEL',
  FLY_IO = 'FLY_IO',
  HEROKU = 'HEROKU',
  ON_PREMISE = 'ON_PREMISE',
}

export enum SecurityLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum HealthStatus {
  HEALTHY = 'HEALTHY',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  UNKNOWN = 'UNKNOWN',
}

export enum VulnerabilityStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  ACCEPTED = 'ACCEPTED',
  FALSE_POSITIVE = 'FALSE_POSITIVE',
}

export enum AlertStatus {
  ACTIVE = 'ACTIVE',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  RESOLVED = 'RESOLVED',
  SUPPRESSED = 'SUPPRESSED',
}

export enum AlertType {
  SECURITY_EVENT = 'SECURITY_EVENT',
  VULNERABILITY = 'VULNERABILITY',
  COMPLIANCE = 'COMPLIANCE',
  PERFORMANCE = 'PERFORMANCE',
  AVAILABILITY = 'AVAILABILITY',
  CONFIGURATION = 'CONFIGURATION',
}

// Supporting Types
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

export interface Remediation {
  description: string;
  estimatedEffort: string;
  priority: string;
  steps?: string[];
  resources?: Reference[];
}

export interface Reference {
  url: string;
  title: string;
  type?: string;
}

export interface VulnerabilitySeverityCount {
  severity: Severity;
  count: number;
}

export interface AlertStatusCount {
  status: AlertStatus;
  count: number;
}

export interface ComplianceFramework {
  name: string;
  version?: string;
  score: number;
  requirements: ComplianceRequirement[];
  criticalFailures: number;
  recommendations: string[];
}

export interface ComplianceRequirement {
  id: string;
  title: string;
  status: ComplianceStatus;
  description: string;
  evidence?: string[];
  lastAssessed?: string;
}

export enum ComplianceStatus {
  COMPLIANT = 'COMPLIANT',
  NON_COMPLIANT = 'NON_COMPLIANT',
  PARTIALLY_COMPLIANT = 'PARTIALLY_COMPLIANT',
  NOT_ASSESSED = 'NOT_ASSESSED',
}

export interface StatusHistoryEntry {
  status: VulnerabilityStatus | AlertStatus;
  changedAt: string;
  changedBy: User;
  note?: string;
}

export interface AssetConfiguration {
  scanningEnabled: boolean;
  alertingEnabled: boolean;
  complianceMonitoring: boolean;
  riskTolerance: SecurityLevel;
}

// Filtering and Sorting
export interface AssetFilter {
  organizationId?: string;
  assetType?: AssetType[];
  environment?: Environment[];
  platform?: Platform[];
  securityLevel?: SecurityLevel[];
  healthStatus?: HealthStatus[];
  tags?: string[];
  hasVulnerabilities?: boolean;
  hasAlerts?: boolean;
}

export interface VulnerabilityFilter {
  organizationId?: string;
  severity?: Severity[];
  status?: VulnerabilityStatus[];
  assetIds?: string[];
  cveId?: string;
  hasRemediations?: boolean;
  discoveredAfter?: string;
  discoveredBefore?: string;
}

export interface AlertFilter {
  organizationId?: string;
  severity?: Severity[];
  status?: AlertStatus[];
  alertType?: AlertType[];
  assetIds?: string[];
  assignedTo?: string[];
  createdAfter?: string;
  createdBefore?: string;
}

export interface SecurityMetrics {
  vulnerabilityTrends: VulnerabilityTrend[];
  alertTrends: AlertTrend[];
  assetHealthTrends: AssetHealthTrend[];
  threatActivityTrends: ThreatActivityTrend[];
}

export interface VulnerabilityTrend {
  date: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface AlertTrend {
  date: string;
  count: number;
  resolved: number;
  acknowledged: number;
}

export interface AssetHealthTrend {
  date: string;
  healthy: number;
  warning: number;
  critical: number;
  unknown: number;
}

export interface ThreatActivityTrend {
  date: string;
  blocked: number;
  allowed: number;
  investigated: number;
}

// Time Range for metrics
export interface TimeRange {
  start: string;
  end: string;
  period: TimePeriod;
}

export enum TimePeriod {
  HOUR = 'HOUR',
  DAY = 'DAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  QUARTER = 'QUARTER',
  YEAR = 'YEAR',
}

// Dashboard State
export interface DashboardState {
  selectedOrganization?: string;
  dateRange: TimeRange;
  filters: {
    assets: AssetFilter;
    vulnerabilities: VulnerabilityFilter;
    alerts: AlertFilter;
  };
  view: DashboardView;
}

export enum DashboardView {
  OVERVIEW = 'OVERVIEW',
  ASSETS = 'ASSETS',
  VULNERABILITIES = 'VULNERABILITIES',
  ALERTS = 'ALERTS',
  COMPLIANCE = 'COMPLIANCE',
  REPORTS = 'REPORTS',
}

// Notification Types
export interface NotificationSettings {
  email: boolean;
  slack: boolean;
  webhook: boolean;
  inApp: boolean;
}

export interface SecurityNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  severity: Severity;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

export enum NotificationType {
  ALERT = 'ALERT',
  VULNERABILITY = 'VULNERABILITY',
  COMPLIANCE = 'COMPLIANCE',
  SYSTEM = 'SYSTEM',
}

// Security Events
export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  severity: Severity;
  title: string;
  description: string;
  source: string;
  timestamp: string;
  assetId?: string;
  userId?: string;
  metadata: Record<string, any>;
  status: SecurityEventStatus;
  tags: string[];
}

export enum SecurityEventType {
  AUTHENTICATION_FAILURE = 'AUTHENTICATION_FAILURE',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  MALWARE_DETECTED = 'MALWARE_DETECTED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  DATA_EXFILTRATION = 'DATA_EXFILTRATION',
  CONFIGURATION_CHANGE = 'CONFIGURATION_CHANGE',
  VULNERABILITY_DISCOVERED = 'VULNERABILITY_DISCOVERED',
  COMPLIANCE_VIOLATION = 'COMPLIANCE_VIOLATION'
}

export enum SecurityEventStatus {
  NEW = 'NEW',
  INVESTIGATING = 'INVESTIGATING',
  RESOLVED = 'RESOLVED',
  FALSE_POSITIVE = 'FALSE_POSITIVE'
}

// Threat Detection
export interface Threat {
  id: string;
  name: string;
  type: ThreatType;
  severity: Severity;
  status: ThreatStatus;
  description: string;
  detectedAt: string;
  lastSeenAt: string;
  affectedAssets: string[];
  indicators: ThreatIndicator[];
  mitigationSteps: string[];
  source: string;
}

export enum ThreatType {
  MALWARE = 'MALWARE',
  PHISHING = 'PHISHING',
  BRUTE_FORCE = 'BRUTE_FORCE',
  DDoS = 'DDoS',
  INSIDER_THREAT = 'INSIDER_THREAT',
  APT = 'APT',
  RANSOMWARE = 'RANSOMWARE'
}

export enum ThreatStatus {
  ACTIVE = 'ACTIVE',
  CONTAINED = 'CONTAINED',
  MITIGATED = 'MITIGATED',
  MONITORING = 'MONITORING'
}

export interface ThreatIndicator {
  type: string;
  value: string;
  confidence: number;
}

// Incidents
export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  status: IncidentStatus;
  priority: IncidentPriority;
  assignedTo?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  affectedAssets: string[];
  events: SecurityEvent[];
  timeline: IncidentTimelineEntry[];
  tags: string[];
}

export enum IncidentStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED'
}

export enum IncidentPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface IncidentTimelineEntry {
  id: string;
  timestamp: string;
  action: string;
  description: string;
  userId: string;
  userName: string;
}

// Dashboard Metrics
export interface DashboardMetrics {
  eventsPerHour: MetricDataPoint[];
  threatsDetected: number;
  incidentsActive: number;
  systemHealth: SystemHealthMetrics;
  topThreats: ThreatSummary[];
  recentActivity: ActivitySummary[];
}

export interface MetricDataPoint {
  timestamp: string;
  value: number;
  label?: string;
}

export interface SystemHealthMetrics {
  overall: number;
  components: ComponentHealth[];
}

export interface ComponentHealth {
  name: string;
  status: HealthStatus;
  lastCheck: string;
}

export interface ThreatSummary {
  type: ThreatType;
  count: number;
  severity: Severity;
}

export interface ActivitySummary {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  severity: Severity;
}

// Filter Types for API endpoints
export interface EventFilter {
  type?: SecurityEventType[];
  severity?: Severity[];
  status?: SecurityEventStatus[];
  dateFrom?: string;
  dateTo?: string;
  source?: string;
  assetId?: string;
}

export interface ThreatFilter {
  type?: ThreatType[];
  severity?: Severity[];
  status?: ThreatStatus[];
  dateFrom?: string;
  dateTo?: string;
}

export interface IncidentFilter {
  status?: IncidentStatus[];
  priority?: IncidentPriority[];
  severity?: Severity[];
  assignedTo?: string;
  dateFrom?: string;
  dateTo?: string;
}

// User Management and RBAC
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  permissions: Permission[];
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  avatar?: string;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  ANALYST = 'ANALYST',
  VIEWER = 'VIEWER',
  INCIDENT_RESPONDER = 'INCIDENT_RESPONDER'
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
}

// Real-time Updates
export interface RealTimeUpdate {
  type: RealTimeUpdateType;
  payload: any;
  timestamp: string;
}

export enum RealTimeUpdateType {
  NEW_EVENT = 'NEW_EVENT',
  THREAT_DETECTED = 'THREAT_DETECTED',
  INCIDENT_CREATED = 'INCIDENT_CREATED',
  INCIDENT_UPDATED = 'INCIDENT_UPDATED',
  METRICS_UPDATED = 'METRICS_UPDATED',
  ALERT_TRIGGERED = 'ALERT_TRIGGERED'
}

export interface ConnectionStatus {
  connected: boolean;
  reconnecting: boolean;
  lastConnected?: string;
  error?: string;
}
