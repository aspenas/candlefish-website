// Generated GraphQL Types
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };

// Scalars
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  UUID: string;
  DateTime: string;
  EmailAddress: string;
  URL: string;
  JSON: any;
  BigInt: bigint;
  Decimal: number;
  PhoneNumber: string;
  PositiveInt: number;
  NonNegativeInt: number;
  NonEmptyString: string;
  Base64: string;
  HexColorCode: string;
  Timestamp: number;
  Duration: string;
  Currency: string;
};

// Enums
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  USER = 'USER'
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION'
}

export enum OrganizationRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  ANALYST = 'ANALYST',
  VIEWER = 'VIEWER'
}

export enum Theme {
  LIGHT = 'LIGHT',
  DARK = 'DARK',
  AUTO = 'AUTO'
}

export enum DashboardLayout {
  GRID = 'GRID',
  FLUID = 'FLUID',
  MASONRY = 'MASONRY'
}

export enum WidgetType {
  LINE_CHART = 'LINE_CHART',
  BAR_CHART = 'BAR_CHART',
  PIE_CHART = 'PIE_CHART',
  DOUGHNUT_CHART = 'DOUGHNUT_CHART',
  AREA_CHART = 'AREA_CHART',
  SCATTER_PLOT = 'SCATTER_PLOT',
  BUBBLE_CHART = 'BUBBLE_CHART',
  HISTOGRAM = 'HISTOGRAM',
  FUNNEL_CHART = 'FUNNEL_CHART',
  GAUGE_CHART = 'GAUGE_CHART',
  HEATMAP = 'HEATMAP',
  TREEMAP = 'TREEMAP',
  SANKEY_DIAGRAM = 'SANKEY_DIAGRAM',
  TABLE = 'TABLE',
  METRIC_CARD = 'METRIC_CARD',
  PROGRESS_BAR = 'PROGRESS_BAR',
  SPARKLINE = 'SPARKLINE',
  MAP = 'MAP',
  CALENDAR_HEATMAP = 'CALENDAR_HEATMAP',
  WORD_CLOUD = 'WORD_CLOUD',
  IFRAME = 'IFRAME',
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  CUSTOM = 'CUSTOM'
}

export enum Visibility {
  PRIVATE = 'PRIVATE',
  ORGANIZATION = 'ORGANIZATION',
  PUBLIC = 'PUBLIC'
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
  CUSTOM = 'CUSTOM'
}

export enum WidgetStatus {
  LOADING = 'LOADING',
  READY = 'READY',
  ERROR = 'ERROR',
  EMPTY = 'EMPTY',
  CACHED = 'CACHED'
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
  CUSTOM = 'CUSTOM'
}

export enum DataSourceStatus {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  ERROR = 'ERROR',
  SYNCING = 'SYNCING',
  PENDING = 'PENDING'
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
  CUSTOM = 'CUSTOM'
}

export enum SharePermission {
  VIEW = 'VIEW',
  EDIT = 'EDIT',
  ADMIN = 'ADMIN'
}

export enum NotificationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

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
  organizations: Array<OrganizationMembership>;
  createdAt: Scalars['DateTime'];
  updatedAt: Scalars['DateTime'];
  lastLoginAt?: Maybe<Scalars['DateTime']>;
  timezone?: Maybe<Scalars['String']>;
  locale?: Maybe<Scalars['String']>;
  dashboards: Array<Dashboard>;
  notifications: Array<Notification>;
  notificationSettings?: Maybe<NotificationSettings>;
}

export interface UserPreferences {
  theme: Theme;
  language: Scalars['String'];
  timezone: Scalars['String'];
  dateFormat: Scalars['String'];
  currency: Scalars['Currency'];
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

export enum TimeRange {
  HOUR = 'HOUR',
  DAY = 'DAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  QUARTER = 'QUARTER',
  YEAR = 'YEAR',
  CUSTOM = 'CUSTOM'
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
  METRIC = 'METRIC'
}

export enum ColorScheme {
  DEFAULT = 'DEFAULT',
  VIBRANT = 'VIBRANT',
  PASTEL = 'PASTEL',
  MONOCHROME = 'MONOCHROME',
  CUSTOM = 'CUSTOM'
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
  members: Array<OrganizationMembership>;
  dashboards: Array<Dashboard>;
  dataSources: Array<DataSource>;
  usage: OrganizationUsage;
  limits: OrganizationLimits;
  createdAt: Scalars['DateTime'];
  updatedAt: Scalars['DateTime'];
}

export interface OrganizationMembership {
  id: Scalars['UUID'];
  user: User;
  organization: Organization;
  role: OrganizationRole;
  permissions: Array<Permission>;
  invitedBy?: Maybe<User>;
  joinedAt: Scalars['DateTime'];
  isActive: Scalars['Boolean'];
}

export interface Permission {
  id: Scalars['UUID'];
  name: Scalars['NonEmptyString'];
  resource: Resource;
  action: Action;
  conditions?: Maybe<Scalars['JSON']>;
}

export enum Resource {
  ORGANIZATION = 'ORGANIZATION',
  USER = 'USER',
  DASHBOARD = 'DASHBOARD',
  WIDGET = 'WIDGET',
  DATA_SOURCE = 'DATA_SOURCE',
  METRIC = 'METRIC',
  ALERT = 'ALERT',
  REPORT = 'REPORT',
  API_KEY = 'API_KEY',
  BILLING = 'BILLING'
}

export enum Action {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  INVITE = 'INVITE',
  EXPORT = 'EXPORT',
  SHARE = 'SHARE',
  MANAGE_BILLING = 'MANAGE_BILLING',
  MANAGE_USERS = 'MANAGE_USERS',
  MANAGE_SETTINGS = 'MANAGE_SETTINGS'
}

export interface OrganizationSettings {
  timezone: Scalars['String'];
  dateFormat: Scalars['String'];
  currency: Scalars['Currency'];
  language: Scalars['String'];
  requireTwoFactor: Scalars['Boolean'];
  passwordPolicy: PasswordPolicy;
  sessionTimeout: Scalars['PositiveInt'];
  allowedDomains?: Maybe<Array<Scalars['String']>>;
  ipWhitelist?: Maybe<Array<Scalars['String']>>;
  dataRetentionDays: Scalars['PositiveInt'];
  allowDataExport: Scalars['Boolean'];
  enableAuditLogs: Scalars['Boolean'];
  enableRealTime: Scalars['Boolean'];
  enableCustomMetrics: Scalars['Boolean'];
  enableAdvancedFilters: Scalars['Boolean'];
  enableAPIAccess: Scalars['Boolean'];
}

export interface Dashboard {
  id: Scalars['UUID'];
  name: Scalars['NonEmptyString'];
  description?: Maybe<Scalars['String']>;
  layout: DashboardLayout;
  widgets: Array<Widget>;
  filters?: Maybe<Array<DashboardFilter>>;
  visibility: Visibility;
  isPublic: Scalars['Boolean'];
  publicToken?: Maybe<Scalars['String']>;
  sharedWith?: Maybe<Array<DashboardShare>>;
  settings: DashboardSettings;
  theme?: Maybe<DashboardTheme>;
  autoRefresh: Scalars['Boolean'];
  refreshInterval?: Maybe<Scalars['PositiveInt']>;
  lastViewed?: Maybe<Scalars['DateTime']>;
  viewCount: Scalars['NonNegativeInt'];
  avgLoadTime?: Maybe<Scalars['Decimal']>;
  tags?: Maybe<Array<Scalars['String']>>;
  category?: Maybe<DashboardCategory>;
  isFavorite: Scalars['Boolean'];
  isTemplate: Scalars['Boolean'];
  templateSource?: Maybe<Dashboard>;
  createdBy: User;
  updatedBy?: Maybe<User>;
  createdAt: Scalars['DateTime'];
  updatedAt: Scalars['DateTime'];
  dataSources: Array<DataSource>;
  alerts: Array<Alert>;
  exports: Array<Export>;
  snapshots: Array<DashboardSnapshot>;
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
  filters?: Maybe<Array<WidgetFilter>>;
  actions?: Maybe<Array<WidgetAction>>;
  cacheTimeout?: Maybe<Scalars['PositiveInt']>;
  lastUpdated?: Maybe<Scalars['DateTime']>;
  loadTime?: Maybe<Scalars['Decimal']>;
  status: WidgetStatus;
  error?: Maybe<Scalars['String']>;
  tags?: Maybe<Array<Scalars['String']>>;
  createdBy: User;
  createdAt: Scalars['DateTime'];
  updatedAt: Scalars['DateTime'];
  data?: Maybe<WidgetData>;
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
  colors?: Maybe<Array<Scalars['HexColorCode']>>;
  animation?: Maybe<AnimationConfig>;
  tooltip?: Maybe<TooltipConfig>;
  responsive: Scalars['Boolean'];
  customOptions?: Maybe<Scalars['JSON']>;
}

export interface WidgetData {
  series: Array<DataSeries>;
  summary?: Maybe<DataSummary>;
  lastUpdated: Scalars['DateTime'];
  rowCount: Scalars['NonNegativeInt'];
  executionTime: Scalars['Decimal'];
}

export interface DataSeries {
  name: Scalars['String'];
  data: Array<DataPoint>;
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

export interface DataSource {
  id: Scalars['UUID'];
  name: Scalars['NonEmptyString'];
  type: DataSourceType;
  status: DataSourceStatus;
  connection: DataSourceConnection;
  config: DataSourceConfig;
  schema?: Maybe<DataSourceSchema>;
  tables: Array<DataTable>;
  lastSyncAt?: Maybe<Scalars['DateTime']>;
  queryCount: Scalars['NonNegativeInt'];
  avgQueryTime?: Maybe<Scalars['Decimal']>;
  errorRate?: Maybe<Scalars['Decimal']>;
  description?: Maybe<Scalars['String']>;
  tags?: Maybe<Array<Scalars['String']>>;
  createdBy: User;
  createdAt: Scalars['DateTime'];
  updatedAt: Scalars['DateTime'];
  metrics: Array<Metric>;
  dashboards: Array<Dashboard>;
}

export interface DataSourceConnection {
  host?: Maybe<Scalars['String']>;
  port?: Maybe<Scalars['PositiveInt']>;
  database?: Maybe<Scalars['String']>;
  username?: Maybe<Scalars['String']>;
  ssl?: Maybe<Scalars['Boolean']>;
  connectionString?: Maybe<Scalars['String']>;
}

export interface Metric {
  id: Scalars['UUID'];
  name: Scalars['NonEmptyString'];
  description?: Maybe<Scalars['String']>;
  type: MetricType;
  query: MetricQuery;
  dataSource: DataSource;
  aggregation: AggregationType;
  dimensions?: Maybe<Array<Dimension>>;
  filters?: Maybe<Array<Filter>>;
  format: MetricFormat;
  unit?: Maybe<Scalars['String']>;
  precision?: Maybe<Scalars['NonNegativeInt']>;
  lastCalculated?: Maybe<Scalars['DateTime']>;
  calculationTime?: Maybe<Scalars['Decimal']>;
  cacheTimeout?: Maybe<Scalars['PositiveInt']>;
  tags?: Maybe<Array<Scalars['String']>>;
  category?: Maybe<MetricCategory>;
  isCustom: Scalars['Boolean'];
  createdBy: User;
  createdAt: Scalars['DateTime'];
  updatedAt: Scalars['DateTime'];
  usageCount: Scalars['NonNegativeInt'];
  dashboards: Array<Dashboard>;
  alerts: Array<Alert>;
  history: Array<MetricValue>;
}

export interface Notification {
  id: Scalars['UUID'];
  type: NotificationType;
  title: Scalars['NonEmptyString'];
  message: Scalars['String'];
  user: User;
  data?: Maybe<Scalars['JSON']>;
  actions?: Maybe<Array<NotificationAction>>;
  read: Scalars['Boolean'];
  readAt?: Maybe<Scalars['DateTime']>;
  priority: NotificationPriority;
  category?: Maybe<NotificationCategory>;
  createdAt: Scalars['DateTime'];
  expiresAt?: Maybe<Scalars['DateTime']>;
  channels: Array<NotificationDelivery>;
}

// Input Types
export interface LoginInput {
  email: Scalars['EmailAddress'];
  password: Scalars['String'];
  rememberMe?: InputMaybe<Scalars['Boolean']>;
}

export interface RegisterInput {
  email: Scalars['EmailAddress'];
  password: Scalars['String'];
  firstName: Scalars['NonEmptyString'];
  lastName: Scalars['NonEmptyString'];
  organizationName?: InputMaybe<Scalars['NonEmptyString']>;
}

export interface ForgotPasswordInput {
  email: Scalars['EmailAddress'];
}

export interface ResetPasswordInput {
  token: Scalars['String'];
  password: Scalars['String'];
}

export interface CreateDashboardInput {
  name: Scalars['NonEmptyString'];
  description?: InputMaybe<Scalars['String']>;
  layout?: InputMaybe<DashboardLayout>;
  visibility?: InputMaybe<Visibility>;
  category?: InputMaybe<DashboardCategory>;
  tags?: InputMaybe<Array<Scalars['String']>>;
}

export interface UpdateDashboardInput {
  id: Scalars['UUID'];
  name?: InputMaybe<Scalars['NonEmptyString']>;
  description?: InputMaybe<Scalars['String']>;
  layout?: InputMaybe<DashboardLayout>;
  visibility?: InputMaybe<Visibility>;
  category?: InputMaybe<DashboardCategory>;
  tags?: InputMaybe<Array<Scalars['String']>>;
  autoRefresh?: InputMaybe<Scalars['Boolean']>;
  refreshInterval?: InputMaybe<Scalars['PositiveInt']>;
}

export interface CreateWidgetInput {
  dashboardId: Scalars['UUID'];
  name: Scalars['NonEmptyString'];
  description?: InputMaybe<Scalars['String']>;
  type: WidgetType;
  metricId: Scalars['UUID'];
  dataSourceId: Scalars['UUID'];
  position: WidgetPositionInput;
  size: WidgetSizeInput;
  config: WidgetConfigInput;
}

export interface WidgetPositionInput {
  x: Scalars['NonNegativeInt'];
  y: Scalars['NonNegativeInt'];
  row: Scalars['NonNegativeInt'];
  col: Scalars['NonNegativeInt'];
}

export interface WidgetSizeInput {
  width: Scalars['PositiveInt'];
  height: Scalars['PositiveInt'];
  minWidth?: InputMaybe<Scalars['PositiveInt']>;
  minHeight?: InputMaybe<Scalars['PositiveInt']>;
  maxWidth?: InputMaybe<Scalars['PositiveInt']>;
  maxHeight?: InputMaybe<Scalars['PositiveInt']>;
}

export interface WidgetConfigInput {
  title?: InputMaybe<WidgetTitleInput>;
  legend?: InputMaybe<WidgetLegendInput>;
  colors?: InputMaybe<Array<Scalars['HexColorCode']>>;
  responsive?: InputMaybe<Scalars['Boolean']>;
  customOptions?: InputMaybe<Scalars['JSON']>;
}

export interface InviteUserInput {
  email: Scalars['EmailAddress'];
  role: OrganizationRole;
  message?: InputMaybe<Scalars['String']>;
}

export interface ShareDashboardInput {
  dashboardId: Scalars['UUID'];
  userIds?: InputMaybe<Array<Scalars['UUID']>>;
  emails?: InputMaybe<Array<Scalars['EmailAddress']>>;
  permission: SharePermission;
  expiresAt?: InputMaybe<Scalars['DateTime']>;
  message?: InputMaybe<Scalars['String']>;
}

// Connection types for pagination
export interface PageInfo {
  hasNextPage: Scalars['Boolean'];
  hasPreviousPage: Scalars['Boolean'];
  startCursor?: Maybe<Scalars['String']>;
  endCursor?: Maybe<Scalars['String']>;
}

export interface DashboardConnection {
  edges: Array<DashboardEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int'];
}

export interface DashboardEdge {
  node: Dashboard;
  cursor: Scalars['String'];
}

export interface WidgetConnection {
  edges: Array<WidgetEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int'];
}

export interface WidgetEdge {
  node: Widget;
  cursor: Scalars['String'];
}

export interface NotificationConnection {
  edges: Array<NotificationEdge>;
  pageInfo: PageInfo;
  totalCount: Scalars['Int'];
}

export interface NotificationEdge {
  node: Notification;
  cursor: Scalars['String'];
}

// Subscription types
export interface DashboardUpdatedSubscription {
  dashboardUpdated: DashboardUpdate;
}

export interface DashboardUpdate {
  dashboard: Dashboard;
  updateType: DashboardUpdateType;
  updatedBy: User;
  changes?: Maybe<Scalars['JSON']>;
  timestamp: Scalars['DateTime'];
}

export enum DashboardUpdateType {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  DELETED = 'DELETED',
  SHARED = 'SHARED',
  WIDGET_ADDED = 'WIDGET_ADDED',
  WIDGET_UPDATED = 'WIDGET_UPDATED',
  WIDGET_REMOVED = 'WIDGET_REMOVED'
}

// Additional required types referenced in the schema
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
  OTHER = 'OTHER'
}

export enum OrganizationSize {
  STARTUP = 'STARTUP',
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
  ENTERPRISE = 'ENTERPRISE'
}

export enum OrganizationStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  TRIAL = 'TRIAL',
  PENDING_SETUP = 'PENDING_SETUP'
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
  LAST = 'LAST'
}

export enum MetricCategory {
  BUSINESS = 'BUSINESS',
  TECHNICAL = 'TECHNICAL',
  FINANCIAL = 'FINANCIAL',
  OPERATIONAL = 'OPERATIONAL',
  MARKETING = 'MARKETING',
  SALES = 'SALES',
  CUSTOMER = 'CUSTOMER',
  PRODUCT = 'PRODUCT',
  SECURITY = 'SECURITY',
  PERFORMANCE = 'PERFORMANCE'
}

export enum SeriesType {
  LINE = 'LINE',
  BAR = 'BAR',
  AREA = 'AREA',
  SCATTER = 'SCATTER',
  BUBBLE = 'BUBBLE'
}

export enum NotificationType {
  ALERT = 'ALERT',
  SYSTEM = 'SYSTEM',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  REMINDER = 'REMINDER',
  ACHIEVEMENT = 'ACHIEVEMENT',
  INVITATION = 'INVITATION',
  UPDATE = 'UPDATE'
}

export enum NotificationCategory {
  ALERTS = 'ALERTS',
  SYSTEM = 'SYSTEM',
  DASHBOARDS = 'DASHBOARDS',
  BILLING = 'BILLING',
  SECURITY = 'SECURITY',
  UPDATES = 'UPDATES',
  SOCIAL = 'SOCIAL'
}

// Additional types to complete the schema
export interface Subscription { }
export interface PasswordPolicy { }
export interface BrandingSettings { }
export interface OrganizationUsage { }
export interface OrganizationLimits { }
export interface DashboardSettings { }
export interface DashboardTheme { }
export interface DashboardFilter { }
export interface DashboardShare { }
export interface DashboardSnapshot { }
export interface WidgetQuery { }
export interface WidgetTitle { }
export interface WidgetTitleInput { }
export interface WidgetLegend { }
export interface WidgetLegendInput { }
export interface WidgetAxes { }
export interface WidgetStyle { }
export interface DrillDownConfig { }
export interface WidgetFilter { }
export interface WidgetAction { }
export interface AnimationConfig { }
export interface TooltipConfig { }
export interface DataSummary { }
export interface DataSourceConfig { }
export interface DataSourceSchema { }
export interface DataTable { }
export interface MetricQuery { }
export interface Dimension { }
export interface Filter { }
export interface MetricFormat { }
export interface MetricValue { }
export interface Alert { }
export interface Export { }
export interface NotificationAction { }
export interface NotificationDelivery { }
export interface NotificationSettings { }
