// Shared Security Types from Web Frontend - Mobile Optimized
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

// Mobile-specific types for enhanced UX
export interface MobileSecurityNotification {
  id: string;
  title: string;
  body: string;
  data: {
    type: NotificationType;
    severity: Severity;
    alertId?: string;
    vulnerabilityId?: string;
    deepLink?: string;
  };
  priority: 'high' | 'default' | 'low';
  sound?: string;
  badge?: number;
  timestamp: string;
}

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  biometricType?: 'fingerprint' | 'faceId' | 'touchId' | 'iris';
}

export interface OfflineAction {
  id: string;
  type: 'acknowledge' | 'resolve' | 'escalate';
  targetId: string;
  targetType: 'alert' | 'vulnerability' | 'incident';
  payload: any;
  timestamp: string;
  userId: string;
  retryCount: number;
}

// Mobile performance metrics
export interface MobilePerformanceMetrics {
  appStartTime: number;
  screenLoadTime: Record<string, number>;
  apolloCacheSize: number;
  networkLatency: number;
  batteryLevel?: number;
  memoryUsage: number;
  crashCount: number;
}

// Enums (identical to web)
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

// Dashboard State - Mobile Optimized
export interface MobileDashboardState {
  selectedOrganization?: string;
  dateRange: TimeRange;
  filters: {
    assets: AssetFilter;
    vulnerabilities: VulnerabilityFilter;
    alerts: AlertFilter;
  };
  view: DashboardView;
  isOffline: boolean;
  lastSyncTimestamp?: string;
  pendingActions: OfflineAction[];
}

export enum DashboardView {
  OVERVIEW = 'OVERVIEW',
  ASSETS = 'ASSETS',
  VULNERABILITIES = 'VULNERABILITIES',
  ALERTS = 'ALERTS',
  COMPLIANCE = 'COMPLIANCE',
  REPORTS = 'REPORTS',
}

// Notification Types - Enhanced for Mobile
export interface NotificationSettings {
  pushEnabled: boolean;
  criticalAlertsOnly: boolean;
  kongVulnerabilityAlerts: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  soundEnabled: boolean;
  vibrationEnabled: boolean;
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
  deepLinkData?: any;
}

export enum NotificationType {
  ALERT = 'ALERT',
  VULNERABILITY = 'VULNERABILITY',
  COMPLIANCE = 'COMPLIANCE',
  SYSTEM = 'SYSTEM',
  KONG_ADMIN_API = 'KONG_ADMIN_API',
}

// Real-time Updates - Mobile Optimized
export interface RealTimeUpdate {
  type: string;
  payload: any;
  timestamp: string;
  priority: 'high' | 'medium' | 'low';
}

export interface ConnectionStatus {
  connected: boolean;
  reconnecting: boolean;
  lastConnected?: string;
  error?: string;
  networkType?: 'wifi' | 'cellular' | 'unknown';
}

// Mobile-specific UI States
export interface LoadingState {
  isLoading: boolean;
  operation?: string;
  progress?: number;
}

export interface ErrorState {
  hasError: boolean;
  error?: Error;
  retry?: () => void;
}

export interface RefreshState {
  isRefreshing: boolean;
  lastRefresh?: string;
}

// Gesture and Touch Interactions
export interface SwipeAction {
  id: string;
  label: string;
  icon: string;
  color: string;
  action: () => void;
}

export interface PullToRefreshOptions {
  enabled: boolean;
  threshold: number;
  onRefresh: () => Promise<void>;
}

// Mobile Analytics and Performance
export interface MobileAnalytics {
  screenViews: Record<string, number>;
  actionCounts: Record<string, number>;
  errorCounts: Record<string, number>;
  performanceMetrics: MobilePerformanceMetrics;
  userEngagement: {
    sessionDuration: number;
    screensPerSession: number;
    actionsPerSession: number;
  };
}

// Device and Platform Info
export interface DeviceInfo {
  platform: 'ios' | 'android';
  version: string;
  model?: string;
  manufacturer?: string;
  isTablet: boolean;
  hasNotch: boolean;
  screenSize: {
    width: number;
    height: number;
  };
  biometricCapabilities: string[];
}

export default SecurityOverview;
