/**
 * Collaboration Performance Optimization and Error Handling
 * Advanced patterns for GraphQL performance, caching, and error management
 */

import {
  ApolloError,
  UserInputError,
  ForbiddenError,
  AuthenticationError
} from 'apollo-server-errors';
import { GraphQLError, GraphQLResolveInfo } from 'graphql';
import { AuthContext } from '../types/context';
import { parse, validate, execute } from 'graphql';
import LRU from 'lru-cache';

// =============================================================================
// PERFORMANCE OPTIMIZATION STRATEGIES
// =============================================================================

/**
 * Query Complexity Analysis
 * Prevents expensive queries from overwhelming the system
 */
export class QueryComplexityAnalyzer {
  private maxComplexity: number;
  private complexityCache: LRU<string, number>;

  constructor(maxComplexity: number = 1000) {
    this.maxComplexity = maxComplexity;
    this.complexityCache = new LRU({ max: 1000, ttl: 300000 }); // 5 minutes
  }

  public analyzeQuery(info: GraphQLResolveInfo, args: any): number {
    const queryHash = this.hashQuery(info.operation);
    const cached = this.complexityCache.get(queryHash);

    if (cached !== undefined) {
      return cached;
    }

    const complexity = this.calculateComplexity(info, args);
    this.complexityCache.set(queryHash, complexity);

    if (complexity > this.maxComplexity) {
      throw new UserInputError(
        `Query complexity ${complexity} exceeds maximum allowed complexity ${this.maxComplexity}`
      );
    }

    return complexity;
  }

  private calculateComplexity(info: GraphQLResolveInfo, args: any): number {
    let complexity = 1;

    // Calculate based on field complexity annotations
    const fieldComplexity = (info.schema.getField as any)?.complexity?.value || 1;
    complexity += fieldComplexity;

    // Factor in pagination limits
    if (args.pagination?.first) {
      complexity += Math.ceil(args.pagination.first / 10);
    }

    // Factor in filter complexity
    if (args.filter) {
      complexity += Object.keys(args.filter).length * 2;
    }

    // Factor in nested selections
    const selectionCount = this.countSelections(info.fieldNodes[0].selectionSet);
    complexity += selectionCount;

    return complexity;
  }

  private countSelections(selectionSet: any): number {
    if (!selectionSet?.selections) return 0;

    let count = selectionSet.selections.length;

    for (const selection of selectionSet.selections) {
      if (selection.selectionSet) {
        count += this.countSelections(selection.selectionSet);
      }
    }

    return count;
  }

  private hashQuery(operation: any): string {
    const operationString = JSON.stringify(operation);
    return require('crypto').createHash('md5').update(operationString).digest('hex');
  }
}

/**
 * Query Depth Limiting
 * Prevents deeply nested queries that could cause performance issues
 */
export class QueryDepthLimiter {
  private maxDepth: number;

  constructor(maxDepth: number = 15) {
    this.maxDepth = maxDepth;
  }

  public validateDepth(info: GraphQLResolveInfo): void {
    const depth = this.calculateDepth(info.fieldNodes[0], 0);

    if (depth > this.maxDepth) {
      throw new UserInputError(
        `Query depth ${depth} exceeds maximum allowed depth ${this.maxDepth}`
      );
    }
  }

  private calculateDepth(node: any, currentDepth: number): number {
    if (!node.selectionSet) {
      return currentDepth;
    }

    let maxDepth = currentDepth;

    for (const selection of node.selectionSet.selections) {
      if (selection.kind === 'Field') {
        const depth = this.calculateDepth(selection, currentDepth + 1);
        maxDepth = Math.max(maxDepth, depth);
      }
    }

    return maxDepth;
  }
}

/**
 * Intelligent Caching Strategy
 * Multi-layer caching with different TTL strategies
 */
export class CollaborationCacheManager {
  private queryCache: LRU<string, any>;
  private fieldCache: LRU<string, any>;
  private userCache: LRU<string, any>;
  private documentCache: LRU<string, any>;

  constructor() {
    // Different cache configurations for different data types
    this.queryCache = new LRU({
      max: 1000,
      ttl: 60000 // 1 minute for full queries
    });

    this.fieldCache = new LRU({
      max: 5000,
      ttl: 300000 // 5 minutes for individual fields
    });

    this.userCache = new LRU({
      max: 10000,
      ttl: 900000 // 15 minutes for user data
    });

    this.documentCache = new LRU({
      max: 2000,
      ttl: 180000 // 3 minutes for documents (more dynamic)
    });
  }

  public async cacheQuery<T>(
    key: string,
    fetcher: () => Promise<T>,
    cacheType: 'query' | 'field' | 'user' | 'document' = 'field'
  ): Promise<T> {
    const cache = this.getCache(cacheType);
    const cached = cache.get(key);

    if (cached !== undefined) {
      return cached;
    }

    const result = await fetcher();
    cache.set(key, result);
    return result;
  }

  public invalidateCache(pattern: string, cacheType?: 'query' | 'field' | 'user' | 'document'): void {
    const caches = cacheType ? [this.getCache(cacheType)] : [
      this.queryCache, this.fieldCache, this.userCache, this.documentCache
    ];

    caches.forEach(cache => {
      const keys = Array.from(cache.keys());
      keys.forEach(key => {
        if (typeof key === 'string' && key.includes(pattern)) {
          cache.delete(key);
        }
      });
    });
  }

  private getCache(type: string): LRU<string, any> {
    switch (type) {
      case 'query': return this.queryCache;
      case 'user': return this.userCache;
      case 'document': return this.documentCache;
      default: return this.fieldCache;
    }
  }
}

/**
 * Query Optimization Helper
 * Automatically optimizes common query patterns
 */
export class QueryOptimizer {
  public static optimizeDocumentQuery(args: any, context: AuthContext): any {
    const optimizedArgs = { ...args };

    // Add default limits if not specified
    if (!optimizedArgs.pagination?.first && !optimizedArgs.pagination?.last) {
      optimizedArgs.pagination = {
        ...optimizedArgs.pagination,
        first: 20
      };
    }

    // Optimize filters based on user context
    if (!optimizedArgs.filter) {
      optimizedArgs.filter = {};
    }

    // Add organization filter for tenant isolation
    if (context.organizationId) {
      optimizedArgs.filter.organizationId = context.organizationId;
    }

    // Add performance-friendly sorting
    if (!optimizedArgs.sort) {
      optimizedArgs.sort = [{ field: 'UPDATED_AT', direction: 'DESC' }];
    }

    return optimizedArgs;
  }

  public static shouldUseDataLoader(fieldName: string, parentType: string): boolean {
    // Define which fields should use DataLoader
    const dataLoaderFields = new Set([
      'owner', 'author', 'user', 'organization',
      'comments', 'versions', 'activity', 'presence',
      'reactions', 'mentions', 'collaborators'
    ]);

    return dataLoaderFields.has(fieldName);
  }
}

/**
 * Performance Monitoring
 * Tracks and reports query performance metrics
 */
export class PerformanceMonitor {
  private metrics: Map<string, QueryMetrics> = new Map();
  private slowQueryThreshold: number = 1000; // 1 second

  public recordQuery(
    operationName: string,
    duration: number,
    complexity: number,
    cacheHit: boolean = false
  ): void {
    const existing = this.metrics.get(operationName) || {
      operationName,
      totalExecutions: 0,
      totalDuration: 0,
      averageDuration: 0,
      maxDuration: 0,
      minDuration: Infinity,
      slowQueryCount: 0,
      cacheHitRate: 0,
      totalCacheHits: 0,
      totalComplexity: 0,
      averageComplexity: 0
    };

    existing.totalExecutions++;
    existing.totalDuration += duration;
    existing.averageDuration = existing.totalDuration / existing.totalExecutions;
    existing.maxDuration = Math.max(existing.maxDuration, duration);
    existing.minDuration = Math.min(existing.minDuration, duration);
    existing.totalComplexity += complexity;
    existing.averageComplexity = existing.totalComplexity / existing.totalExecutions;

    if (duration > this.slowQueryThreshold) {
      existing.slowQueryCount++;
    }

    if (cacheHit) {
      existing.totalCacheHits++;
    }

    existing.cacheHitRate = (existing.totalCacheHits / existing.totalExecutions) * 100;

    this.metrics.set(operationName, existing);

    // Log slow queries
    if (duration > this.slowQueryThreshold) {
      console.warn(`Slow query detected: ${operationName} took ${duration}ms (complexity: ${complexity})`);
    }
  }

  public getMetrics(): QueryMetrics[] {
    return Array.from(this.metrics.values());
  }

  public getSlowQueries(): QueryMetrics[] {
    return this.getMetrics()
      .filter(m => m.slowQueryCount > 0)
      .sort((a, b) => b.averageDuration - a.averageDuration);
  }

  public reset(): void {
    this.metrics.clear();
  }
}

interface QueryMetrics {
  operationName: string;
  totalExecutions: number;
  totalDuration: number;
  averageDuration: number;
  maxDuration: number;
  minDuration: number;
  slowQueryCount: number;
  cacheHitRate: number;
  totalCacheHits: number;
  totalComplexity: number;
  averageComplexity: number;
}

// =============================================================================
// ERROR HANDLING PATTERNS
// =============================================================================

/**
 * Structured Error Handling
 * Standardized error responses with proper categorization
 */
export enum ErrorCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMITED = 'RATE_LIMITED',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  INTEGRATION_ERROR = 'INTEGRATION_ERROR',
  PERFORMANCE_ERROR = 'PERFORMANCE_ERROR'
}

export class CollaborationError extends ApolloError {
  public category: ErrorCategory;
  public details?: any;
  public retryable: boolean;

  constructor(
    message: string,
    category: ErrorCategory,
    code?: string,
    details?: any,
    retryable: boolean = false
  ) {
    super(message, code || category);
    this.category = category;
    this.details = details;
    this.retryable = retryable;

    // Add structured extensions
    this.extensions = {
      ...this.extensions,
      category,
      details,
      retryable,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Error Factory
 * Creates standardized errors for common scenarios
 */
export class ErrorFactory {
  public static documentNotFound(documentId: string): CollaborationError {
    return new CollaborationError(
      `Document with ID ${documentId} not found`,
      ErrorCategory.NOT_FOUND,
      'DOCUMENT_NOT_FOUND',
      { documentId }
    );
  }

  public static insufficientPermissions(
    requiredPermission: string,
    resource?: string
  ): CollaborationError {
    return new CollaborationError(
      `Insufficient permissions. Required: ${requiredPermission}${resource ? ` for ${resource}` : ''}`,
      ErrorCategory.AUTHORIZATION,
      'INSUFFICIENT_PERMISSIONS',
      { requiredPermission, resource }
    );
  }

  public static validationError(field: string, value: any, constraint: string): CollaborationError {
    return new CollaborationError(
      `Validation failed for field '${field}': ${constraint}`,
      ErrorCategory.VALIDATION,
      'VALIDATION_ERROR',
      { field, value, constraint }
    );
  }

  public static conflictError(resource: string, reason: string): CollaborationError {
    return new CollaborationError(
      `Conflict detected for ${resource}: ${reason}`,
      ErrorCategory.CONFLICT,
      'RESOURCE_CONFLICT',
      { resource, reason }
    );
  }

  public static rateLimitError(operation: string, resetTime: Date): CollaborationError {
    return new CollaborationError(
      `Rate limit exceeded for ${operation}. Try again after ${resetTime.toISOString()}`,
      ErrorCategory.RATE_LIMITED,
      'RATE_LIMIT_EXCEEDED',
      { operation, resetTime },
      true // This is retryable
    );
  }

  public static systemError(operation: string, cause?: Error): CollaborationError {
    return new CollaborationError(
      `System error occurred during ${operation}`,
      ErrorCategory.SYSTEM_ERROR,
      'SYSTEM_ERROR',
      { operation, cause: cause?.message },
      true // System errors are often retryable
    );
  }

  public static integrationError(
    service: string,
    operation: string,
    cause?: Error
  ): CollaborationError {
    return new CollaborationError(
      `Integration error with ${service} during ${operation}`,
      ErrorCategory.INTEGRATION_ERROR,
      'INTEGRATION_ERROR',
      { service, operation, cause: cause?.message },
      true // Integration errors are usually retryable
    );
  }

  public static performanceError(
    operation: string,
    threshold: number,
    actual: number
  ): CollaborationError {
    return new CollaborationError(
      `Performance threshold exceeded for ${operation}. Expected < ${threshold}ms, got ${actual}ms`,
      ErrorCategory.PERFORMANCE_ERROR,
      'PERFORMANCE_THRESHOLD_EXCEEDED',
      { operation, threshold, actual }
    );
  }
}

/**
 * Error Handler with Retry Logic
 * Handles errors with appropriate retry strategies
 */
export class ErrorHandler {
  public static async handleWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    backoffMs: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          throw error;
        }

        if (attempt === maxRetries) {
          break;
        }

        // Exponential backoff
        const delay = backoffMs * Math.pow(2, attempt - 1);
        await this.sleep(delay);
      }
    }

    throw new CollaborationError(
      `Operation failed after ${maxRetries} attempts: ${lastError.message}`,
      ErrorCategory.SYSTEM_ERROR,
      'MAX_RETRIES_EXCEEDED',
      { attempts: maxRetries, lastError: lastError.message },
      false
    );
  }

  private static isRetryableError(error: any): boolean {
    if (error instanceof CollaborationError) {
      return error.retryable;
    }

    // Common retryable patterns
    const retryableMessages = [
      'timeout',
      'connection',
      'network',
      'temporary',
      'unavailable',
      'overloaded'
    ];

    const errorMessage = error.message?.toLowerCase() || '';
    return retryableMessages.some(pattern => errorMessage.includes(pattern));
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public static formatErrorForClient(error: any): any {
    if (error instanceof CollaborationError) {
      return {
        message: error.message,
        category: error.category,
        code: error.extensions?.code,
        retryable: error.retryable,
        details: error.details,
        timestamp: error.extensions?.timestamp
      };
    }

    // Handle other error types
    return {
      message: error.message || 'An unexpected error occurred',
      category: ErrorCategory.SYSTEM_ERROR,
      code: 'UNKNOWN_ERROR',
      retryable: false
    };
  }
}

/**
 * Circuit Breaker Pattern
 * Prevents cascading failures in distributed systems
 */
export class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private maxFailures: number = 5,
    private timeout: number = 60000, // 1 minute
    private resetTimeout: number = 30000 // 30 seconds
  ) {}

  public async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime < this.resetTimeout) {
        throw new CollaborationError(
          'Circuit breaker is OPEN',
          ErrorCategory.SYSTEM_ERROR,
          'CIRCUIT_BREAKER_OPEN',
          {
            state: this.state,
            failures: this.failures,
            nextAttemptIn: this.resetTimeout - (Date.now() - this.lastFailureTime)
          },
          true
        );
      }

      this.state = 'HALF_OPEN';
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.maxFailures) {
      this.state = 'OPEN';
    }
  }

  public getState(): { state: string; failures: number; lastFailure: number } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailure: this.lastFailureTime
    };
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function applyCaching<T>(
  cacheKey: string,
  data: T,
  ttlSeconds: number = 300
): T {
  // This would integrate with your caching system
  return data;
}

export function optimizeQuery(data: any, info: GraphQLResolveInfo): any {
  // Apply query-specific optimizations
  return data;
}

export async function rateLimitCheck(
  context: AuthContext,
  operation: string,
  maxRequests: number,
  windowSeconds: number
): Promise<void> {
  const key = `rate_limit:${operation}:${context.user?.id || 'anonymous'}`;
  const result = await context.rateLimiter.checkLimit(key, maxRequests, windowSeconds * 1000);

  if (!result.allowed) {
    throw ErrorFactory.rateLimitError(operation, result.resetTime);
  }

  await context.rateLimiter.consume(key);
}

export function sanitizeInput(input: any): any {
  if (!input || typeof input !== 'object') return input;

  const sanitized = Array.isArray(input) ? [] : {};

  for (const [key, value] of Object.entries(input)) {
    if (typeof value === 'string') {
      // Basic XSS protection
      sanitized[key] = value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .trim();
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeInput(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export function validateInput(input: any, schema: string): void {
  // This would integrate with a validation library like Joi or Yup
  if (!input) {
    throw ErrorFactory.validationError('input', input, 'Input is required');
  }

  // Add specific validation rules based on schema
}

export async function auditLog(
  context: AuthContext,
  action: string,
  resource: string,
  resourceId: string,
  metadata?: any
): Promise<void> {
  try {
    await context.db.query(`
      INSERT INTO audit_logs (user_id, organization_id, action, resource, resource_id, metadata, ip_address, user_agent, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    `, [
      context.user?.id,
      context.organizationId,
      action,
      resource,
      resourceId,
      JSON.stringify(metadata),
      context.requestTracker?.ipAddress,
      context.requestTracker?.userAgent
    ]);
  } catch (error) {
    console.error('Failed to write audit log:', error);
    // Don't fail the operation due to audit logging issues
  }
}

// Export singleton instances
export const performanceMonitor = new PerformanceMonitor();
export const cacheManager = new CollaborationCacheManager();
export const queryComplexityAnalyzer = new QueryComplexityAnalyzer();
export const queryDepthLimiter = new QueryDepthLimiter();

export default {
  QueryComplexityAnalyzer,
  QueryDepthLimiter,
  CollaborationCacheManager,
  QueryOptimizer,
  PerformanceMonitor,
  CollaborationError,
  ErrorFactory,
  ErrorHandler,
  CircuitBreaker,
  ErrorCategory,
  performanceMonitor,
  cacheManager,
  queryComplexityAnalyzer,
  queryDepthLimiter,
  applyCaching,
  optimizeQuery,
  rateLimitCheck,
  sanitizeInput,
  validateInput,
  auditLog
};
