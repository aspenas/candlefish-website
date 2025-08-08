import { PubSub } from 'graphql-subscriptions';
import { DataLoaders } from '../dataloaders';
import { Request, Response } from 'express';

// User context from JWT token
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  organizationId: string;
  permissions: string[];
  lastLoginAt?: Date;
}

// Database interface for query operations
export interface DatabaseClient {
  // Basic query operations
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  queryOne<T = any>(sql: string, params?: any[]): Promise<T | null>;

  // Transaction support
  withTransaction<T>(callback: (client: DatabaseClient) => Promise<T>): Promise<T>;

  // Utility methods for building queries
  buildWhereClause(filter: any, additionalConditions?: Record<string, any>): string;
  buildOrderClause(sort: any[]): string;
  queryWithPagination(
    sql: string,
    pagination: any,
    params?: any[]
  ): Promise<{
    rows: any[];
    pageInfo: {
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      startCursor?: string;
      endCursor?: string;
    };
    totalCount: number;
  }>;
}

// Cache interface for Redis operations
export interface CacheClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  mget(keys: string[]): Promise<(string | null)[]>;
  mset(keyValues: Array<[string, string]>, ttl?: number): Promise<void>;
  exists(key: string): Promise<boolean>;
  expire(key: string, ttl: number): Promise<void>;

  // Pattern operations
  keys(pattern: string): Promise<string[]>;
  scan(cursor: string, pattern?: string, count?: number): Promise<{
    cursor: string;
    keys: string[];
  }>;

  // Hash operations
  hget(key: string, field: string): Promise<string | null>;
  hset(key: string, field: string, value: string): Promise<void>;
  hgetall(key: string): Promise<Record<string, string>>;
  hdel(key: string, field: string): Promise<void>;

  // List operations
  lpush(key: string, value: string): Promise<number>;
  rpop(key: string): Promise<string | null>;
  llen(key: string): Promise<number>;
}

// Data source interfaces for different services
export interface UserDataSource {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByIds(ids: string[]): Promise<User[]>;
  create(userData: Partial<User>): Promise<User>;
  update(id: string, userData: Partial<User>): Promise<User>;
  delete(id: string): Promise<boolean>;
}

export interface OrganizationDataSource {
  findById(id: string): Promise<any>;
  findByUserId(userId: string): Promise<any[]>;
  getUsage(organizationId: string): Promise<any>;
  getLimits(organizationId: string): Promise<any>;
  create(orgData: any): Promise<any>;
  update(id: string, orgData: any): Promise<any>;
  delete(id: string): Promise<boolean>;
}

export interface DashboardDataSource {
  findById(id: string): Promise<any>;
  findByOrganizationId(organizationId: string): Promise<any[]>;
  findByUserId(userId: string): Promise<any[]>;
  create(dashboardData: any): Promise<any>;
  update(id: string, dashboardData: any): Promise<any>;
  delete(id: string): Promise<boolean>;
  clone(cloneOptions: any): Promise<any>;
  addToFavorites(dashboardId: string, userId: string): Promise<any>;
  removeFromFavorites(dashboardId: string, userId: string): Promise<any>;
}

export interface WidgetDataSource {
  findById(id: string): Promise<any>;
  findByDashboardId(dashboardId: string): Promise<any[]>;
  create(widgetData: any): Promise<any>;
  update(id: string, widgetData: any): Promise<any>;
  updatePosition(id: string, positionData: any): Promise<any>;
  delete(id: string): Promise<boolean>;
  refresh(id: string): Promise<any>;
}

export interface DataSourceDataSource {
  findById(id: string): Promise<any>;
  findByOrganizationId(organizationId: string): Promise<any[]>;
  create(dataSourceData: any): Promise<any>;
  update(id: string, dataSourceData: any): Promise<any>;
  delete(id: string): Promise<boolean>;
  testConnection(connectionData: any): Promise<any>;
  sync(id: string): Promise<any>;
}

export interface MetricDataSource {
  findById(id: string): Promise<any>;
  findByDataSourceId(dataSourceId: string): Promise<any[]>;
  findByOrganizationId(organizationId: string): Promise<any[]>;
  create(metricData: any): Promise<any>;
  update(id: string, metricData: any): Promise<any>;
  delete(id: string): Promise<boolean>;
  calculate(id: string, parameters?: any): Promise<any>;
}

export interface AlertDataSource {
  findById(id: string): Promise<any>;
  findByMetricId(metricId: string): Promise<any[]>;
  findByOrganizationId(organizationId: string): Promise<any[]>;
  create(alertData: any): Promise<any>;
  update(id: string, alertData: any): Promise<any>;
  delete(id: string): Promise<boolean>;
  test(id: string): Promise<any>;
}

export interface NotificationDataSource {
  findById(id: string): Promise<any>;
  findByUserId(userId: string): Promise<any[]>;
  create(notificationData: any): Promise<any>;
  markRead(id: string): Promise<any>;
  delete(id: string): Promise<boolean>;
}

export interface ExportDataSource {
  findById(id: string): Promise<any>;
  findByDashboardId(dashboardId: string): Promise<any[]>;
  findByUserId(userId: string): Promise<any[]>;
  create(exportData: any): Promise<any>;
  cancel(id: string): Promise<boolean>;
}

export interface DashboardShareDataSource {
  findById(id: string): Promise<any>;
  findByDashboardId(dashboardId: string): Promise<any[]>;
  create(shareData: any): Promise<any>;
  createByEmail(shareData: any): Promise<any>;
  delete(id: string): Promise<boolean>;
}

export interface DashboardSnapshotDataSource {
  findByDashboardId(dashboardId: string): Promise<any[]>;
  create(snapshotData: any): Promise<any>;
  restore(id: string): Promise<any>;
}

// Combined data sources interface
export interface DataSources {
  user: UserDataSource;
  organization: OrganizationDataSource;
  dashboard: DashboardDataSource;
  widget: WidgetDataSource;
  dataSource: DataSourceDataSource;
  metric: MetricDataSource;
  alert: AlertDataSource;
  notification: NotificationDataSource;
  export: ExportDataSource;
  dashboardShare: DashboardShareDataSource;
  dashboardSnapshot: DashboardSnapshotDataSource;
}

// Request tracking and logging
export interface RequestTracker {
  requestId: string;
  userId?: string;
  organizationId?: string;
  startTime: Date;
  operation?: string;
  variables?: any;
  userAgent?: string;
  ipAddress?: string;
}

// Feature flags for A/B testing and gradual rollouts
export interface FeatureFlags {
  isEnabled(flag: string, userId?: string, organizationId?: string): boolean;
  getVariant(flag: string, userId?: string, organizationId?: string): string | null;
  getAllFlags(userId?: string, organizationId?: string): Record<string, boolean>;
}

// Rate limiting interface
export interface RateLimiter {
  checkLimit(key: string, limit: number, window: number): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: Date;
  }>;
  consume(key: string): Promise<void>;
  reset(key: string): Promise<void>;
}

// Security context for request validation
export interface SecurityContext {
  validateCSRF(token: string): boolean;
  validateOrigin(origin: string): boolean;
  checkIPWhitelist(ip: string, organizationId: string): boolean;
  detectSuspiciousActivity(userId: string, action: string): boolean;
}

// Analytics and monitoring
export interface Analytics {
  track(event: string, properties: Record<string, any>): void;
  identify(userId: string, traits: Record<string, any>): void;
  increment(metric: string, tags?: Record<string, string>): void;
  timing(metric: string, duration: number, tags?: Record<string, string>): void;
  gauge(metric: string, value: number, tags?: Record<string, string>): void;
}

// Main GraphQL context interface
export interface AuthContext {
  // User and authentication
  user: User | null;
  organizationId?: string;
  isAuthenticated: boolean;

  // Core services
  db: DatabaseClient;
  cache: CacheClient;
  pubsub: PubSub;

  // Data loaders for N+1 prevention
  dataLoaders: DataLoaders;

  // Data sources for different services
  dataSources: DataSources;

  // Request context
  req: Request;
  res: Response;
  requestId: string;
  requestTracker: RequestTracker;

  // Utilities
  featureFlags: FeatureFlags;
  rateLimiter: RateLimiter;
  security: SecurityContext;
  analytics: Analytics;

  // Environment and configuration
  config: {
    nodeEnv: string;
    isDevelopment: boolean;
    isProduction: boolean;
    apiVersion: string;
    allowIntrospection: boolean;
    enablePlayground: boolean;
    corsOrigins: string[];
    jwtSecret: string;
    databaseUrl: string;
    redisUrl: string;
    uploadMaxSize: number;
    rateLimitWindow: number;
    rateLimitMax: number;
  };
}

// Context creation function type
export type CreateContextFunction = (params: {
  req: Request;
  res: Response;
  connection?: any;
}) => Promise<AuthContext> | AuthContext;

// Subscription context for WebSocket connections
export interface SubscriptionContext extends Omit<AuthContext, 'req' | 'res'> {
  connection: any;
  connectionParams: any;
}

// Error context for error handling
export interface ErrorContext {
  user?: User;
  requestId: string;
  operation?: string;
  variables?: any;
  query?: string;
}

// Audit context for logging sensitive operations
export interface AuditContext {
  userId: string;
  organizationId: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

// Performance monitoring context
export interface PerformanceContext {
  startTime: Date;
  operation: string;
  complexity: number;
  depth: number;
  resolverTimes: Record<string, number>;
  databaseQueries: Array<{
    query: string;
    duration: number;
    rows: number;
  }>;
  cacheHits: number;
  cacheMisses: number;
}

export default AuthContext;
