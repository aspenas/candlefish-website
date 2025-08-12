// GraphQL Generated Types - matches backend schema
export type Maybe<T> = T | null;
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  UUID: string;
  DateTime: string;
  EmailAddress: string;
  NonEmptyString: string;
  PositiveInt: number;
  NonNegativeInt: number;
  BigInt: string;
  Decimal: number;
  HexColorCode: string;
  URL: string;
  JSON: any;
  Duration: string;
};

// Core Types
export interface User {
  id: Scalars['UUID'];
  email: Scalars['EmailAddress'];
  firstName: Scalars['NonEmptyString'];
  lastName: Scalars['NonEmptyString'];
  avatar?: Maybe<Scalars['URL']>;
  role: UserRole;
  status: UserStatus;
  preferences?: Maybe<UserPreferences>;
  organizations: OrganizationMembership[];
  createdAt: Scalars['DateTime'];
  updatedAt: Scalars['DateTime'];
  lastLoginAt?: Maybe<Scalars['DateTime']>;
  timezone?: Maybe<Scalars['String']>;
  locale?: Maybe<Scalars['String']>;
}

export interface Organization {
  id: Scalars['UUID'];
  name: Scalars['NonEmptyString'];
  slug: Scalars['NonEmptyString'];
  logo?: Maybe<Scalars['URL']>;
  website?: Maybe<Scalars['URL']>;
  description?: Maybe<Scalars['String']>;
  industry?: Maybe<Industry>;
  size: OrganizationSize;
  status: OrganizationStatus;
  subscription: Subscription;
  settings: OrganizationSettings;
  branding?: Maybe<BrandingSettings>;
  members: OrganizationMembership[];
  dashboards: Dashboard[];
  dataSources: DataSource[];
  usage: OrganizationUsage;
  limits: OrganizationLimits;
  createdAt: Scalars['DateTime'];
  updatedAt: Scalars['DateTime'];
}

export interface Dashboard {
  id: Scalars['UUID'];
  name: Scalars['NonEmptyString'];
  description?: Maybe<Scalars['String']>;
  layout: DashboardLayout;
  widgets: Widget[];
  filters: DashboardFilter[];
  visibility: Visibility;
  isPublic: Scalars['Boolean'];
  publicToken?: Maybe<Scalars['String']>;
  settings: DashboardSettings;
  theme?: Maybe<DashboardTheme>;
  autoRefresh: Scalars['Boolean'];
  refreshInterval?: Maybe<Scalars['PositiveInt']>;
  lastViewed?: Maybe<Scalars['DateTime']>;
  viewCount: Scalars['NonNegativeInt'];
  avgLoadTime?: Maybe<Scalars['Decimal']>;
  tags: Scalars['String'][];
  category?: Maybe<DashboardCategory>;
  isFavorite: Scalars['Boolean'];
  isTemplate: Scalars['Boolean'];
  createdBy: User;
  createdAt: Scalars['DateTime'];
  updatedAt: Scalars['DateTime'];
}

export interface Widget {
  id: Scalars['UUID'];
  name: Scalars['NonEmptyString'];
  description?: Maybe<Scalars['String']>;
  type: WidgetType;
  metric: Metric;
  query?: Maybe<WidgetQuery>;
  dataSource: DataSource;
  position: WidgetPosition;
  size: WidgetSize;
  config: WidgetConfig;
  style?: Maybe<WidgetStyle>;
  drillDown?: Maybe<DrillDownConfig>;
  filters: WidgetFilter[];
  actions: WidgetAction[];
  cacheTimeout?: Maybe<Scalars['PositiveInt']>;
  lastUpdated?: Maybe<Scalars['DateTime']>;
  loadTime?: Maybe<Scalars['Decimal']>;
  status: WidgetStatus;
  error?: Maybe<Scalars['String']>;
  tags: Scalars['String'][];
  createdBy: User;
  createdAt: Scalars['DateTime'];
  updatedAt: Scalars['DateTime'];
  data?: Maybe<WidgetData>;
}

export interface Metric {
  id: Scalars['UUID'];
  name: Scalars['NonEmptyString'];
  description?: Maybe<Scalars['String']>;
  type: MetricType;
  query: MetricQuery;
  dataSource: DataSource;
  aggregation: AggregationType;
  dimensions: Dimension[];
  filters: Filter[];
  format: MetricFormat;
  unit?: Maybe<Scalars['String']>;
  precision?: Maybe<Scalars['NonNegativeInt']>;
  lastCalculated?: Maybe<Scalars['DateTime']>;
  calculationTime?: Maybe<Scalars['Decimal']>;
  cacheTimeout?: Maybe<Scalars['PositiveInt']>;
  tags: Scalars['String'][];
  category?: Maybe<MetricCategory>;
  isCustom: Scalars['Boolean'];
  createdBy: User;
  createdAt: Scalars['DateTime'];
  updatedAt: Scalars['DateTime'];
  usageCount: Scalars['NonNegativeInt'];
  history: MetricValue[];
}

export interface DataSource {
  id: Scalars['UUID'];
  name: Scalars['NonEmptyString'];
  type: DataSourceType;
  status: DataSourceStatus;
  connection: DataSourceConnection;
  config: DataSourceConfig;
  schema?: Maybe<DataSourceSchema>;
  tables: DataTable[];
  lastSyncAt?: Maybe<Scalars['DateTime']>;
  syncStatus: SyncStatus;
  queryCount: Scalars['NonNegativeInt'];
  avgQueryTime?: Maybe<Scalars['Decimal']>;
  errorRate?: Maybe<Scalars['Decimal']>;
  description?: Maybe<Scalars['String']>;
  tags: Scalars['String'][];
  createdBy: User;
  createdAt: Scalars['DateTime'];
  updatedAt: Scalars['DateTime'];
}

export interface Alert {
  id: Scalars['UUID'];
  name: Scalars['NonEmptyString'];
  description?: Maybe<Scalars['String']>;
  metric: Metric;
  condition: AlertCondition;
  threshold: Scalars['Decimal'];
  operator: ComparisonOperator;
  frequency: Scalars['Duration'];
  enabled: Scalars['Boolean'];
  severity: AlertSeverity;
  channels: NotificationChannel[];
  lastTriggered?: Maybe<Scalars['DateTime']>;
  status: AlertStatus;
  createdBy: User;
  createdAt: Scalars['DateTime'];
  updatedAt: Scalars['DateTime'];
  history: AlertExecution[];
}

export interface Notification {
  id: Scalars['UUID'];
  type: NotificationType;
  title: Scalars['NonEmptyString'];
  message: Scalars['String'];
  user: User;
  data?: Maybe<Scalars['JSON']>;
  actions: NotificationAction[];
  read: Scalars['Boolean'];
  readAt?: Maybe<Scalars['DateTime']>;
  priority: NotificationPriority;
  category?: Maybe<NotificationCategory>;
  createdAt: Scalars['DateTime'];
  expiresAt?: Maybe<Scalars['DateTime']>;
  channels: NotificationDelivery[];
}

// Supporting Types
export interface OrganizationMembership {
  id: Scalars['UUID'];
  user: User;
  organization: Organization;
  role: OrganizationRole;
  permissions: Permission[];
  invitedBy?: Maybe<User>;
  joinedAt: Scalars['DateTime'];
  isActive: Scalars['Boolean'];
}

export interface UserPreferences {
  theme: Theme;
  language: Scalars['String'];
  timezone: Scalars['String'];
  dateFormat: Scalars['String'];
  currency: Currency;
  dashboardLayout: DashboardLayout;
  emailNotifications: Scalars['Boolean'];
  pushNotifications: Scalars['Boolean'];
  analyticsPreferences?: Maybe<AnalyticsPreferences>;
}

export interface AnalyticsPreferences {
  defaultTimeRange: TimeRange;
  defaultChartType: ChartType;
  autoRefresh: Scalars['Boolean'];
  refreshInterval?: Maybe<Scalars['PositiveInt']>;
  showTooltips: Scalars['Boolean'];
  enableAnimations: Scalars['Boolean'];
  colorScheme: ColorScheme;
}

export interface Subscription {
  id: Scalars['UUID'];
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  currentPeriodStart: Scalars['DateTime'];
  currentPeriodEnd: Scalars['DateTime'];
  trialEnd?: Maybe<Scalars['DateTime']>;
  cancelAtPeriodEnd: Scalars['Boolean'];
  usage: SubscriptionUsage;
}

export interface OrganizationSettings {
  timezone: Scalars['String'];
  dateFormat: Scalars['String'];
  currency: Currency;
  language: Scalars['String'];
  requireTwoFactor: Scalars['Boolean'];
  passwordPolicy: PasswordPolicy;
  sessionTimeout: Scalars['PositiveInt'];
  allowedDomains: Scalars['String'][];
  ipWhitelist: Scalars['String'][];
  dataRetentionDays: Scalars['PositiveInt'];
  allowDataExport: Scalars['Boolean'];
  enableAuditLogs: Scalars['Boolean'];
  enableRealTime: Scalars['Boolean'];
  enableCustomMetrics: Scalars['Boolean'];
  enableAdvancedFilters: Scalars['Boolean'];
  enableAPIAccess: Scalars['Boolean'];
}

export interface BrandingSettings {
  primaryColor: Scalars['HexColorCode'];
  secondaryColor: Scalars['HexColorCode'];
  accentColor: Scalars['HexColorCode'];
  logoUrl?: Maybe<Scalars['URL']>;
  faviconUrl?: Maybe<Scalars['URL']>;
  customCSS?: Maybe<Scalars['String']>;
  customDomain?: Maybe<Scalars['String']>;
}

export interface WidgetPosition {
  x: Scalars['NonNegativeInt'];
  y: Scalars['NonNegativeInt'];
  row: Scalars['NonNegativeInt'];
  col: Scalars['NonNegativeInt'];
}

export interface WidgetSize {
  width: Scalars['PositiveInt'];
  height: Scalars['PositiveInt'];
  minWidth?: Maybe<Scalars['PositiveInt']>;
  minHeight?: Maybe<Scalars['PositiveInt']>;
  maxWidth?: Maybe<Scalars['PositiveInt']>;
  maxHeight?: Maybe<Scalars['PositiveInt']>;
}

export interface WidgetConfig {
  title?: Maybe<WidgetTitle>;
  legend?: Maybe<WidgetLegend>;
  axes?: Maybe<WidgetAxes>;
  colors: Scalars['HexColorCode'][];
  animation?: Maybe<AnimationConfig>;
  tooltip?: Maybe<TooltipConfig>;
  responsive: Scalars['Boolean'];
  customOptions?: Maybe<Scalars['JSON']>;
}

export interface WidgetData {
  series: DataSeries[];
  summary?: Maybe<DataSummary>;
  lastUpdated: Scalars['DateTime'];
  rowCount: Scalars['NonNegativeInt'];
  executionTime: Scalars['Decimal'];
}

export interface DataSeries {
  name: Scalars['String'];
  data: DataPoint[];
  color?: Maybe<Scalars['HexColorCode']>;
  type?: Maybe<SeriesType>;
}

export interface DataPoint {
  x: Scalars['JSON'];
  y: Scalars['Decimal'];
  label?: Maybe<Scalars['String']>;
  color?: Maybe<Scalars['HexColorCode']>;
  metadata?: Maybe<Scalars['JSON']>;
}

// Enums
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  USER = 'USER',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
}

export enum OrganizationRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  ANALYST = 'ANALYST',
  VIEWER = 'VIEWER',
}

export enum OrganizationSize {
  STARTUP = 'STARTUP',
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
  ENTERPRISE = 'ENTERPRISE',
}

export enum OrganizationStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  TRIAL = 'TRIAL',
  PENDING_SETUP = 'PENDING_SETUP',
}

export enum Industry {
  TECHNOLOGY = 'TECHNOLOGY',
  HEALTHCARE = 'HEALTHCARE',
  FINANCE = 'FINANCE',
  EDUCATION = 'EDUCATION',
  RETAIL = 'RETAIL',
  MANUFACTURING = 'MANUFACTURING',
  CONSULTING = 'CONSULTING',
  MEDIA = 'MEDIA',
  GOVERNMENT = 'GOVERNMENT',
  NON_PROFIT = 'NON_PROFIT',
  OTHER = 'OTHER',
}

export enum SubscriptionPlan {
  FREE = 'FREE',
  STARTER = 'STARTER',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE',
  CUSTOM = 'CUSTOM',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  CANCELED = 'CANCELED',
  PAST_DUE = 'PAST_DUE',
  UNPAID = 'UNPAID',
  TRIALING = 'TRIALING',
  INCOMPLETE = 'INCOMPLETE',
}

export enum BillingCycle {
  MONTHLY = 'MONTHLY',
  ANNUALLY = 'ANNUALLY',
}

export enum Theme {
  LIGHT = 'LIGHT',
  DARK = 'DARK',
  AUTO = 'AUTO',
}

export enum DashboardLayout {
  GRID = 'GRID',
  FLUID = 'FLUID',
  MASONRY = 'MASONRY',
}

export enum Visibility {
  PRIVATE = 'PRIVATE',
  ORGANIZATION = 'ORGANIZATION',
  PUBLIC = 'PUBLIC',
}

export enum DashboardCategory {
  OVERVIEW = 'OVERVIEW',
  SALES = 'SALES',
  MARKETING = 'MARKETING',
  FINANCE = 'FINANCE',
  OPERATIONS = 'OPERATIONS',
  CUSTOMER = 'CUSTOMER',
  PRODUCT = 'PRODUCT',
  TECHNICAL = 'TECHNICAL',
  CUSTOM = 'CUSTOM',
}

export enum WidgetType {
  LINE_CHART = 'LINE_CHART',
  BAR_CHART = 'BAR_CHART',
  PIE_CHART = 'PIE_CHART',
  DOUGHNUT_CHART = 'DOUGHNUT_CHART',
  AREA_CHART = 'AREA_CHART',
  SCATTER_PLOT = 'SCATTER_PLOT',
  GAUGE_CHART = 'GAUGE_CHART',
  HEATMAP = 'HEATMAP',
  TABLE = 'TABLE',
  METRIC_CARD = 'METRIC_CARD',
  PROGRESS_BAR = 'PROGRESS_BAR',
  SPARKLINE = 'SPARKLINE',
  MAP = 'MAP',
  CUSTOM = 'CUSTOM',
}

export enum WidgetStatus {
  LOADING = 'LOADING',
  READY = 'READY',
  ERROR = 'ERROR',
  EMPTY = 'EMPTY',
  CACHED = 'CACHED',
}

export enum MetricType {
  COUNT = 'COUNT',
  SUM = 'SUM',
  AVERAGE = 'AVERAGE',
  MEDIAN = 'MEDIAN',
  PERCENTILE = 'PERCENTILE',
  MIN = 'MIN',
  MAX = 'MAX',
  DISTINCT_COUNT = 'DISTINCT_COUNT',
  RATIO = 'RATIO',
  GROWTH_RATE = 'GROWTH_RATE',
  CUSTOM = 'CUSTOM',
}

export enum AggregationType {
  COUNT = 'COUNT',
  SUM = 'SUM',
  AVG = 'AVG',
  MIN = 'MIN',
  MAX = 'MAX',
  MEDIAN = 'MEDIAN',
  P50 = 'P50',
  P90 = 'P90',
  P95 = 'P95',
  P99 = 'P99',
  DISTINCT = 'DISTINCT',
  FIRST = 'FIRST',
  LAST = 'LAST',
}

export enum DataSourceType {
  POSTGRESQL = 'POSTGRESQL',
  MYSQL = 'MYSQL',
  CLICKHOUSE = 'CLICKHOUSE',
  SNOWFLAKE = 'SNOWFLAKE',
  BIGQUERY = 'BIGQUERY',
  REDSHIFT = 'REDSHIFT',
  MONGODB = 'MONGODB',
  ELASTICSEARCH = 'ELASTICSEARCH',
  REST_API = 'REST_API',
  GRAPHQL_API = 'GRAPHQL_API',
  CSV_UPLOAD = 'CSV_UPLOAD',
  GOOGLE_SHEETS = 'GOOGLE_SHEETS',
  SALESFORCE = 'SALESFORCE',
  HUBSPOT = 'HUBSPOT',
  STRIPE = 'STRIPE',
  MIXPANEL = 'MIXPANEL',
  AMPLITUDE = 'AMPLITUDE',
  CUSTOM = 'CUSTOM',
}

export enum DataSourceStatus {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  ERROR = 'ERROR',
  SYNCING = 'SYNCING',
  PENDING = 'PENDING',
}

export enum SyncStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  IN_PROGRESS = 'IN_PROGRESS',
  PENDING = 'PENDING',
  SKIPPED = 'SKIPPED',
}

export enum AlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum AlertStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PAUSED = 'PAUSED',
  ERROR = 'ERROR',
}

export enum ComparisonOperator {
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN',
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  GREATER_THAN_OR_EQUAL = 'GREATER_THAN_OR_EQUAL',
  LESS_THAN_OR_EQUAL = 'LESS_THAN_OR_EQUAL',
}

export enum NotificationType {
  ALERT = 'ALERT',
  SYSTEM = 'SYSTEM',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  REMINDER = 'REMINDER',
  ACHIEVEMENT = 'ACHIEVEMENT',
  INVITATION = 'INVITATION',
  UPDATE = 'UPDATE',
}

export enum NotificationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum NotificationCategory {
  ALERTS = 'ALERTS',
  SYSTEM = 'SYSTEM',
  DASHBOARDS = 'DASHBOARDS',
  BILLING = 'BILLING',
  SECURITY = 'SECURITY',
  UPDATES = 'UPDATES',
  SOCIAL = 'SOCIAL',
}

export enum TimeRange {
  HOUR = 'HOUR',
  DAY = 'DAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  QUARTER = 'QUARTER',
  YEAR = 'YEAR',
  CUSTOM = 'CUSTOM',
}

export enum ChartType {
  LINE = 'LINE',
  BAR = 'BAR',
  PIE = 'PIE',
  DOUGHNUT = 'DOUGHNUT',
  AREA = 'AREA',
  SCATTER = 'SCATTER',
  FUNNEL = 'FUNNEL',
  GAUGE = 'GAUGE',
  TABLE = 'TABLE',
  METRIC = 'METRIC',
}

export enum ColorScheme {
  DEFAULT = 'DEFAULT',
  VIBRANT = 'VIBRANT',
  PASTEL = 'PASTEL',
  MONOCHROME = 'MONOCHROME',
  CUSTOM = 'CUSTOM',
}

export enum SeriesType {
  LINE = 'LINE',
  BAR = 'BAR',
  AREA = 'AREA',
  SCATTER = 'SCATTER',
  BUBBLE = 'BUBBLE',
}

// Additional interfaces for completeness
export interface Currency {}
export interface Permission {}
export interface PasswordPolicy {}
export interface SubscriptionUsage {}
export interface OrganizationUsage {}
export interface OrganizationLimits {}
export interface DataSourceConnection {}
export interface DataSourceConfig {}
export interface DataSourceSchema {}
export interface DataTable {}
export interface MetricQuery {}
export interface MetricFormat {}
export interface Dimension {}
export interface Filter {}
export interface MetricValue {}
export interface AlertCondition {}
export interface AlertExecution {}
export interface NotificationChannel {}
export interface NotificationAction {}
export interface NotificationDelivery {}
export interface DashboardSettings {}
export interface DashboardTheme {}
export interface DashboardFilter {}
export interface WidgetQuery {}
export interface WidgetStyle {}
export interface DrillDownConfig {}
export interface WidgetFilter {}
export interface WidgetAction {}
export interface WidgetTitle {}
export interface WidgetLegend {}
export interface WidgetAxes {}
export interface AnimationConfig {}
export interface TooltipConfig {}
export interface DataSummary {}
export interface MetricCategory {}
