// Core Security Types
export interface SecurityOverview {
  totalAssets: number;
  criticalVulnerabilities: number;
  activeAlerts: number;
  complianceScore: number;
  threatLevel: ThreatLevel;
  kongAdminApiVulnerability: KongVulnerabilityStatus;
  vulnerabilitiesBySeverity: VulnerabilitySeverityCount[];
  alertsByStatus: AlertStatusCount[];
  complianceBreakdown: ComplianceFramework[];
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

// Real-time Updates
export interface RealTimeUpdate {
  type: string;
  payload: any;
  timestamp: string;
}

export interface ConnectionStatus {
  connected: boolean;
  reconnecting: boolean;
  lastConnected?: string;
  error?: string;
}