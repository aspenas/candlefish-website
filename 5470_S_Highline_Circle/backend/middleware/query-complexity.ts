// =====================================================
// QUERY COMPLEXITY ANALYSIS & RATE LIMITING
// =====================================================
// Advanced GraphQL query analysis, complexity scoring, and rate limiting
// Protects against complex queries and implements fair usage policies
// =====================================================

import { 
  costAnalysis,
  maximumCostRule,
  createRateLimiter,
  shield,
  rule,
  and,
  or,
  not
} from 'graphql-query-complexity';
import { DepthLimitRule } from 'graphql-depth-limit';
import { 
  ValidationContext,
  DocumentNode,
  OperationDefinitionNode,
  FieldNode,
  GraphQLError,
  visit,
  visitWithTypeInfo,
  TypeInfo,
  getOperationAST
} from 'graphql';
import Redis from 'ioredis';
import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';

// =====================================================
// COMPLEXITY CONFIGURATION
// =====================================================

interface ComplexityConfig {
  maximumComplexity: number;
  maximumDepth: number;
  introspectionComplexity: number;
  rateLimit: {
    points: number;
    duration: number; // seconds
    blockDuration: number; // seconds
  };
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
}

const defaultComplexityConfig: ComplexityConfig = {
  maximumComplexity: 10000,
  maximumDepth: 15,
  introspectionComplexity: 1000,
  rateLimit: {
    points: 1000, // Number of requests
    duration: 60, // Per 60 seconds by IP
    blockDuration: 60, // Block for 60 seconds if limit exceeded
  }
};

// =====================================================
// FIELD COMPLEXITY ESTIMATORS
// =====================================================

export class SecurityComplexityEstimator {
  // Base complexity scores for different field types
  private static readonly BASE_COMPLEXITIES = {
    // Simple scalars
    'String': 1,
    'Int': 1,
    'Float': 1,
    'Boolean': 1,
    'ID': 1,
    'DateTime': 1,
    'UUID': 1,
    'JSON': 2,
    
    // Security-specific types with higher complexity
    'SecurityEvent': 10,
    'ThreatIntelligence': 8,
    'SecurityCase': 12,
    'PlaybookExecution': 15,
    'IOC': 5,
    'MitreAttackPattern': 7,
    
    // Analytics and aggregation types
    'TimeSeriesData': 25,
    'EventCorrelationGraph': 50,
    'AttackPathResult': 100,
    'ThreatHuntResult': 75,
    
    // Connection types (pagination)
    'SecurityEventConnection': 20,
    'ThreatIntelligenceConnection': 15,
    'SecurityCaseConnection': 25,
    
    // System status and metrics
    'SecurityOperationsStatus': 30,
    'SecurityMetricsReport': 40,
    'ComplianceReport': 35,
  };

  // Field-specific complexity multipliers
  private static readonly FIELD_MULTIPLIERS = {
    // High-cost operations
    'eventsTimeSeriesAggregation': 50,
    'eventCorrelationGraph': 100,
    'threatHunt': 150,
    'attackPathAnalysis': 200,
    'findSimilarIOCs': 75,
    'entityRelationshipGraph': 80,
    
    // Batch operations
    'batchIngestSecurityEvents': 25,
    'bulkImportIOCs': 20,
    
    // Complex queries with joins
    'securityEvents': 5,
    'threatIntelligence': 4,
    'securityCases': 8,
    'playbookExecutions': 10,
    
    // Simple lookups
    'securityEvent': 2,
    'threatIntelligenceById': 2,
    'securityCase': 3,
    'playbookExecution': 4,
  };

  public static estimateFieldComplexity = (args: {
    type: any;
    field: any;
    node: FieldNode;
    variables: Record<string, any>;
    childComplexity: number;
  }): number => {
    const { type, field, node, variables, childComplexity } = args;
    const fieldName = field.name;
    const typeName = type.name;

    // Base complexity from type
    let complexity = this.BASE_COMPLEXITIES[typeName] || 5;

    // Apply field-specific multipliers
    if (this.FIELD_MULTIPLIERS[fieldName]) {
      complexity *= this.FIELD_MULTIPLIERS[fieldName];
    }

    // Pagination multiplier
    const paginationArgs = this.extractPaginationArgs(node, variables);
    if (paginationArgs.first || paginationArgs.last) {
      const limit = paginationArgs.first || paginationArgs.last || 50;
      complexity *= Math.min(limit / 10, 10); // Max 10x multiplier
    }

    // Time range multiplier for analytics
    const timeRange = this.extractTimeRangeArgs(node, variables);
    if (timeRange.start && timeRange.end) {
      const durationHours = (new Date(timeRange.end).getTime() - new Date(timeRange.start).getTime()) / (1000 * 60 * 60);
      if (durationHours > 24 * 7) { // More than 1 week
        complexity *= 3;
      } else if (durationHours > 24) { // More than 1 day
        complexity *= 2;
      }
    }

    // Filter complexity
    const filterComplexity = this.calculateFilterComplexity(node, variables);
    complexity += filterComplexity;

    // Add child complexity
    complexity += childComplexity;

    return Math.ceil(complexity);
  };

  private static extractPaginationArgs(node: FieldNode, variables: Record<string, any>) {
    const args: any = {};
    
    if (node.arguments) {
      for (const arg of node.arguments) {
        if (arg.name.value === 'pagination') {
          if (arg.value.kind === 'Variable') {
            const varName = arg.value.name.value;
            const pagination = variables[varName] || {};
            return {
              first: pagination.first,
              last: pagination.last,
              after: pagination.after,
              before: pagination.before
            };
          } else if (arg.value.kind === 'ObjectValue') {
            const paginationObj: any = {};
            arg.value.fields?.forEach(field => {
              if (field.value.kind === 'IntValue') {
                paginationObj[field.name.value] = parseInt(field.value.value);
              }
            });
            return paginationObj;
          }
        }
      }
    }
    
    return {};
  }

  private static extractTimeRangeArgs(node: FieldNode, variables: Record<string, any>) {
    const args: any = {};
    
    if (node.arguments) {
      for (const arg of node.arguments) {
        if (arg.name.value === 'timeRange') {
          if (arg.value.kind === 'Variable') {
            const varName = arg.value.name.value;
            return variables[varName] || {};
          } else if (arg.value.kind === 'ObjectValue') {
            const timeRangeObj: any = {};
            arg.value.fields?.forEach(field => {
              if (field.value.kind === 'StringValue') {
                timeRangeObj[field.name.value] = field.value.value;
              }
            });
            return timeRangeObj;
          }
        }
      }
    }
    
    return {};
  }

  private static calculateFilterComplexity(node: FieldNode, variables: Record<string, any>): number {
    let filterComplexity = 0;
    
    if (node.arguments) {
      for (const arg of node.arguments) {
        if (arg.name.value === 'filter') {
          if (arg.value.kind === 'Variable') {
            const varName = arg.value.name.value;
            const filter = variables[varName] || {};
            
            // Count number of filter fields
            const filterCount = Object.keys(filter).length;
            filterComplexity += filterCount * 2;
            
            // Complex filters add more cost
            if (filter.search) filterComplexity += 10; // Text search is expensive
            if (filter.correlationScoreRange) filterComplexity += 5;
            if (filter.riskScoreRange) filterComplexity += 3;
            if (filter.mitreAttackPatternIds && filter.mitreAttackPatternIds.length > 10) {
              filterComplexity += filter.mitreAttackPatternIds.length;
            }
          }
        }
      }
    }
    
    return filterComplexity;
  }
}

// =====================================================
// QUERY DEPTH ANALYSIS
// =====================================================

export class QueryDepthAnalyzer {
  public static createDepthLimitRule(maxDepth: number) {
    return (context: ValidationContext): any => {
      return {
        Field(node: FieldNode, key: any, parent: any, path: any, ancestors: any[]) {
          const depth = ancestors.filter(ancestor => ancestor.kind === 'Field').length;
          
          if (depth > maxDepth) {
            context.reportError(new GraphQLError(
              `Query depth limit of ${maxDepth} exceeded, found ${depth}`,
              [node]
            ));
          }
        }
      };
    };
  }
}

// =====================================================
// RATE LIMITING
// =====================================================

export class SecurityRateLimiter {
  private rateLimiter: RateLimiterRedis | RateLimiterMemory;
  private complexityLimiter: RateLimiterRedis | RateLimiterMemory;
  
  constructor(config: ComplexityConfig) {
    const rateLimitConfig = {
      storeClient: config.redis ? new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        db: config.redis.db || 0,
      }) : undefined,
      keyPrefix: 'gql_rate_limit',
      points: config.rateLimit.points,
      duration: config.rateLimit.duration,
      blockDuration: config.rateLimit.blockDuration,
    };

    const complexityLimitConfig = {
      ...rateLimitConfig,
      keyPrefix: 'gql_complexity_limit',
      points: config.maximumComplexity * 10, // Allow 10x max complexity per minute
      duration: 60, // Per minute
    };

    if (config.redis) {
      this.rateLimiter = new RateLimiterRedis(rateLimitConfig);
      this.complexityLimiter = new RateLimiterRedis(complexityLimitConfig);
    } else {
      this.rateLimiter = new RateLimiterMemory(rateLimitConfig);
      this.complexityLimiter = new RateLimiterMemory(complexityLimitConfig);
    }
  }

  public async checkRateLimit(key: string): Promise<void> {
    try {
      await this.rateLimiter.consume(key);
    } catch (rejRes: any) {
      const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
      throw new GraphQLError(
        `Rate limit exceeded. Try again in ${secs} seconds.`,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        { 
          code: 'RATE_LIMITED',
          retryAfter: secs 
        }
      );
    }
  }

  public async checkComplexityLimit(key: string, complexity: number): Promise<void> {
    try {
      await this.complexityLimiter.consume(key, complexity);
    } catch (rejRes: any) {
      const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
      throw new GraphQLError(
        `Query complexity limit exceeded. Try again in ${secs} seconds.`,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        { 
          code: 'COMPLEXITY_LIMITED',
          retryAfter: secs,
          complexity
        }
      );
    }
  }

  public async getRateLimitStatus(key: string): Promise<{
    totalHits: number;
    totalRemainingPoints: number;
    msBeforeNext: number;
  }> {
    const status = await this.rateLimiter.get(key);
    return {
      totalHits: status?.totalHits || 0,
      totalRemainingPoints: status?.remainingPoints || 0,
      msBeforeNext: status?.msBeforeNext || 0
    };
  }
}

// =====================================================
// QUERY ANALYZER
// =====================================================

export class SecurityQueryAnalyzer {
  private config: ComplexityConfig;
  private rateLimiter: SecurityRateLimiter;

  constructor(config: Partial<ComplexityConfig> = {}) {
    this.config = { ...defaultComplexityConfig, ...config };
    this.rateLimiter = new SecurityRateLimiter(this.config);
  }

  public createValidationRules() {
    return [
      // Query complexity rule
      maximumCostRule({
        estimators: [
          SecurityComplexityEstimator.estimateFieldComplexity,
          // Fallback estimator
          () => 1
        ],
        maximumCost: this.config.maximumComplexity,
        onComplete: (complexity: number, context: ValidationContext) => {
          // Store complexity for rate limiting
          (context as any).queryComplexity = complexity;
        },
        createError: (max: number, actual: number) => {
          return new GraphQLError(
            `Query complexity limit of ${max} exceeded, found ${actual}`,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            { 
              code: 'QUERY_TOO_COMPLEX',
              maxComplexity: max,
              actualComplexity: actual
            }
          );
        }
      }),

      // Query depth rule
      QueryDepthAnalyzer.createDepthLimitRule(this.config.maximumDepth)
    ];
  }

  public async analyzeAndValidateQuery(
    document: DocumentNode,
    variables: Record<string, any> = {},
    context: any = {}
  ): Promise<QueryAnalysisResult> {
    const operation = getOperationAST(document);
    if (!operation) {
      throw new GraphQLError('No operation found in document');
    }

    // Extract client identifier for rate limiting
    const clientId = this.extractClientId(context);

    // Check basic rate limit
    await this.rateLimiter.checkRateLimit(clientId);

    // Calculate query complexity
    const complexity = this.calculateComplexity(document, variables);
    
    // Check complexity-based rate limit
    await this.rateLimiter.checkComplexityLimit(clientId, complexity);

    // Analyze query patterns for potential abuse
    const queryPattern = this.analyzeQueryPattern(document, variables);
    
    // Check for suspicious patterns
    if (queryPattern.isSuspicious) {
      throw new GraphQLError(
        `Suspicious query pattern detected: ${queryPattern.reason}`,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        { code: 'SUSPICIOUS_QUERY' }
      );
    }

    return {
      complexity,
      depth: queryPattern.depth,
      fieldCount: queryPattern.fieldCount,
      operationType: operation.operation,
      operationName: operation.name?.value,
      queryPattern,
      estimatedExecutionTime: this.estimateExecutionTime(complexity, queryPattern),
      rateLimitStatus: await this.rateLimiter.getRateLimitStatus(clientId)
    };
  }

  private extractClientId(context: any): string {
    // Extract client identifier from context
    const ip = context.req?.ip || context.request?.ip || 'unknown';
    const userId = context.user?.id;
    const authToken = context.authToken;

    if (userId) {
      return `user:${userId}`;
    } else if (authToken) {
      // Use hash of auth token
      return `token:${this.hashString(authToken)}`;
    } else {
      return `ip:${ip}`;
    }
  }

  private hashString(str: string): string {
    // Simple hash function for rate limiting keys
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private calculateComplexity(document: DocumentNode, variables: Record<string, any>): number {
    // This would integrate with the GraphQL complexity analysis library
    // For now, return a placeholder calculation
    let complexity = 0;
    
    visit(document, {
      Field(node) {
        const fieldName = node.name.value;
        complexity += SecurityComplexityEstimator.FIELD_MULTIPLIERS[fieldName] || 1;
        
        // Add complexity for arguments
        if (node.arguments && node.arguments.length > 0) {
          complexity += node.arguments.length * 2;
        }
      }
    });

    return complexity;
  }

  private analyzeQueryPattern(document: DocumentNode, variables: Record<string, any>): QueryPattern {
    let depth = 0;
    let maxDepth = 0;
    let fieldCount = 0;
    const fieldNames: string[] = [];
    const suspiciousPatterns: string[] = [];

    visit(document, {
      enter(node) {
        if (node.kind === 'Field') {
          depth++;
          maxDepth = Math.max(maxDepth, depth);
          fieldCount++;
          fieldNames.push(node.name.value);

          // Check for suspicious patterns
          if (node.name.value.includes('__')) {
            suspiciousPatterns.push('introspection_query');
          }
        }
      },
      leave(node) {
        if (node.kind === 'Field') {
          depth--;
        }
      }
    });

    // Check for repetitive field selection (potential abuse)
    const fieldCounts = fieldNames.reduce((acc, field) => {
      acc[field] = (acc[field] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const maxFieldRepetition = Math.max(...Object.values(fieldCounts));
    if (maxFieldRepetition > 100) {
      suspiciousPatterns.push('excessive_field_repetition');
    }

    // Check for very wide queries (too many fields at same level)
    if (fieldCount > 1000) {
      suspiciousPatterns.push('excessive_field_selection');
    }

    // Check for suspicious variable patterns
    const variableKeys = Object.keys(variables);
    if (variableKeys.some(key => key.length > 1000)) {
      suspiciousPatterns.push('suspicious_variable_size');
    }

    return {
      depth: maxDepth,
      fieldCount,
      fieldNames,
      suspiciousPatterns,
      isSuspicious: suspiciousPatterns.length > 0,
      reason: suspiciousPatterns.join(', '),
      fieldCounts,
      variableCount: variableKeys.length,
      variableSize: JSON.stringify(variables).length
    };
  }

  private estimateExecutionTime(complexity: number, pattern: QueryPattern): number {
    // Estimate execution time in milliseconds based on complexity and pattern
    let baseTime = complexity * 2; // 2ms per complexity point
    
    // Add time for deep queries
    if (pattern.depth > 10) {
      baseTime += (pattern.depth - 10) * 100;
    }
    
    // Add time for wide queries
    if (pattern.fieldCount > 100) {
      baseTime += (pattern.fieldCount - 100) * 5;
    }
    
    // Database operations
    const dbOperations = pattern.fieldNames.filter(name => 
      ['securityEvents', 'threatIntelligence', 'securityCases'].includes(name)
    ).length;
    baseTime += dbOperations * 50; // 50ms per DB operation
    
    // Analytics operations
    const analyticsOperations = pattern.fieldNames.filter(name =>
      name.includes('Analysis') || name.includes('Metrics') || name.includes('Correlation')
    ).length;
    baseTime += analyticsOperations * 200; // 200ms per analytics operation
    
    return Math.ceil(baseTime);
  }

  public createMiddleware() {
    return async (req: any, res: any, next: any) => {
      try {
        if (req.body?.query) {
          // Parse and analyze the query
          const analysis = await this.analyzeAndValidateQuery(
            req.body.query,
            req.body.variables || {},
            { req, user: req.user, authToken: req.headers.authorization }
          );

          // Add analysis results to request context
          req.queryAnalysis = analysis;

          // Add response headers for rate limit info
          res.set({
            'X-Query-Complexity': analysis.complexity.toString(),
            'X-Query-Depth': analysis.depth.toString(),
            'X-Estimated-Time': analysis.estimatedExecutionTime.toString(),
            'X-RateLimit-Limit': this.config.rateLimit.points.toString(),
            'X-RateLimit-Remaining': analysis.rateLimitStatus.totalRemainingPoints.toString(),
          });
        }
        
        next();
      } catch (error) {
        // Handle rate limiting and validation errors
        if (error instanceof GraphQLError) {
          const statusCode = error.extensions?.code === 'RATE_LIMITED' ? 429 : 400;
          res.status(statusCode).json({
            errors: [error],
            extensions: error.extensions
          });
          return;
        }
        
        next(error);
      }
    };
  }
}

// =====================================================
// ADAPTIVE COMPLEXITY MANAGEMENT
// =====================================================

export class AdaptiveComplexityManager {
  private complexityHistory: Map<string, ComplexityMetrics> = new Map();
  private performanceThresholds: PerformanceThresholds;

  constructor(thresholds: PerformanceThresholds = {
    maxExecutionTime: 30000, // 30 seconds
    maxMemoryUsage: 512 * 1024 * 1024, // 512MB
    maxCPUUsage: 80, // 80%
    adaptiveWindow: 60 * 1000, // 1 minute
  }) {
    this.performanceThresholds = thresholds;
    this.startPerformanceMonitoring();
  }

  public async adjustComplexityLimits(systemMetrics: SystemMetrics): Promise<ComplexityAdjustment> {
    const currentLoad = this.calculateSystemLoad(systemMetrics);
    
    let adjustment: ComplexityAdjustment = {
      complexityMultiplier: 1.0,
      rateLimitMultiplier: 1.0,
      maxDepthAdjustment: 0,
      reason: 'normal_operation'
    };

    // High system load - reduce limits
    if (currentLoad > 0.8) {
      adjustment = {
        complexityMultiplier: 0.5,
        rateLimitMultiplier: 0.3,
        maxDepthAdjustment: -5,
        reason: 'high_system_load'
      };
    } else if (currentLoad > 0.6) {
      adjustment = {
        complexityMultiplier: 0.75,
        rateLimitMultiplier: 0.6,
        maxDepthAdjustment: -2,
        reason: 'moderate_system_load'
      };
    } else if (currentLoad < 0.3) {
      // Low load - can be more permissive
      adjustment = {
        complexityMultiplier: 1.25,
        rateLimitMultiplier: 1.5,
        maxDepthAdjustment: 2,
        reason: 'low_system_load'
      };
    }

    return adjustment;
  }

  private calculateSystemLoad(metrics: SystemMetrics): number {
    const cpuWeight = 0.4;
    const memoryWeight = 0.3;
    const responseTimeWeight = 0.3;

    const cpuLoad = metrics.cpuUsage / 100;
    const memoryLoad = metrics.memoryUsage / metrics.totalMemory;
    const responseTimeLoad = Math.min(metrics.averageResponseTime / 5000, 1); // Normalize to 5s

    return (cpuLoad * cpuWeight) + (memoryLoad * memoryWeight) + (responseTimeLoad * responseTimeWeight);
  }

  private startPerformanceMonitoring(): void {
    // Monitor system performance and adjust complexity limits
    setInterval(async () => {
      try {
        const systemMetrics = await this.getSystemMetrics();
        const adjustment = await this.adjustComplexityLimits(systemMetrics);
        
        if (adjustment.reason !== 'normal_operation') {
          console.log('Adjusting complexity limits:', adjustment);
        }
      } catch (error) {
        console.error('Error in performance monitoring:', error);
      }
    }, this.performanceThresholds.adaptiveWindow);
  }

  private async getSystemMetrics(): Promise<SystemMetrics> {
    // This would integrate with system monitoring tools
    // For now, return mock metrics
    return {
      cpuUsage: Math.random() * 100,
      memoryUsage: Math.random() * 1024 * 1024 * 1024,
      totalMemory: 8 * 1024 * 1024 * 1024,
      averageResponseTime: Math.random() * 2000,
      activeConnections: Math.floor(Math.random() * 100),
      queriesPerSecond: Math.random() * 1000,
    };
  }
}

// =====================================================
// TYPE DEFINITIONS
// =====================================================

interface QueryAnalysisResult {
  complexity: number;
  depth: number;
  fieldCount: number;
  operationType: 'query' | 'mutation' | 'subscription';
  operationName?: string;
  queryPattern: QueryPattern;
  estimatedExecutionTime: number;
  rateLimitStatus: {
    totalHits: number;
    totalRemainingPoints: number;
    msBeforeNext: number;
  };
}

interface QueryPattern {
  depth: number;
  fieldCount: number;
  fieldNames: string[];
  suspiciousPatterns: string[];
  isSuspicious: boolean;
  reason: string;
  fieldCounts: Record<string, number>;
  variableCount: number;
  variableSize: number;
}

interface ComplexityMetrics {
  averageComplexity: number;
  maxComplexity: number;
  queryCount: number;
  totalExecutionTime: number;
  lastUpdated: Date;
}

interface PerformanceThresholds {
  maxExecutionTime: number;
  maxMemoryUsage: number;
  maxCPUUsage: number;
  adaptiveWindow: number;
}

interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  totalMemory: number;
  averageResponseTime: number;
  activeConnections: number;
  queriesPerSecond: number;
}

interface ComplexityAdjustment {
  complexityMultiplier: number;
  rateLimitMultiplier: number;
  maxDepthAdjustment: number;
  reason: string;
}

// =====================================================
// EXPORT FACTORY
// =====================================================

export class SecurityQueryProtection {
  public static create(config: Partial<ComplexityConfig> = {}) {
    const analyzer = new SecurityQueryAnalyzer(config);
    const adaptiveManager = new AdaptiveComplexityManager();

    return {
      analyzer,
      adaptiveManager,
      validationRules: analyzer.createValidationRules(),
      middleware: analyzer.createMiddleware(),
      
      // Helper function to create complete protection setup
      setupProtection: (apolloServer: any) => {
        // Add validation rules
        apolloServer.validationRules = analyzer.createValidationRules();
        
        // Add complexity analysis to context
        apolloServer.context = ({ req, connection }: any) => ({
          ...apolloServer.context,
          queryAnalysis: req?.queryAnalysis,
        });

        return apolloServer;
      }
    };
  }
}

// =====================================================
// SECURITY MONITORING
// =====================================================

export class SecurityQueryMonitor {
  private suspiciousActivities: Map<string, SuspiciousActivity[]> = new Map();
  private alertThresholds: AlertThresholds;

  constructor(thresholds: AlertThresholds = {
    complexitySpike: 5.0, // 5x normal complexity
    rateLimitViolations: 10,
    suspiciousPatternCount: 5,
    timeWindow: 60 * 1000, // 1 minute
  }) {
    this.alertThresholds = thresholds;
    this.startMonitoring();
  }

  public recordQueryActivity(clientId: string, analysis: QueryAnalysisResult): void {
    const activity: SuspiciousActivity = {
      timestamp: new Date(),
      clientId,
      complexity: analysis.complexity,
      depth: analysis.depth,
      fieldCount: analysis.fieldCount,
      suspiciousPatterns: analysis.queryPattern.suspiciousPatterns,
      operationType: analysis.operationType,
    };

    const activities = this.suspiciousActivities.get(clientId) || [];
    activities.push(activity);
    
    // Keep only recent activities
    const cutoff = Date.now() - this.alertThresholds.timeWindow;
    const recentActivities = activities.filter(a => a.timestamp.getTime() > cutoff);
    
    this.suspiciousActivities.set(clientId, recentActivities);

    // Check for alerts
    this.checkForAlerts(clientId, recentActivities);
  }

  private checkForAlerts(clientId: string, activities: SuspiciousActivity[]): void {
    if (activities.length < 2) return;

    // Check for complexity spikes
    const avgComplexity = activities.reduce((sum, a) => sum + a.complexity, 0) / activities.length;
    const maxComplexity = Math.max(...activities.map(a => a.complexity));
    
    if (maxComplexity > avgComplexity * this.alertThresholds.complexitySpike) {
      this.triggerAlert('COMPLEXITY_SPIKE', clientId, {
        avgComplexity,
        maxComplexity,
        activities: activities.length
      });
    }

    // Check for suspicious pattern accumulation
    const totalSuspiciousPatterns = activities.reduce(
      (sum, a) => sum + a.suspiciousPatterns.length, 0
    );
    
    if (totalSuspiciousPatterns >= this.alertThresholds.suspiciousPatternCount) {
      this.triggerAlert('SUSPICIOUS_PATTERNS', clientId, {
        totalPatterns: totalSuspiciousPatterns,
        activities: activities.length,
        patterns: [...new Set(activities.flatMap(a => a.suspiciousPatterns))]
      });
    }

    // Check for excessive query depth
    const deepQueries = activities.filter(a => a.depth > 15).length;
    if (deepQueries > 5) {
      this.triggerAlert('EXCESSIVE_DEPTH', clientId, {
        deepQueryCount: deepQueries,
        maxDepth: Math.max(...activities.map(a => a.depth))
      });
    }
  }

  private triggerAlert(type: string, clientId: string, metadata: any): void {
    console.warn(`Security Alert: ${type} for client ${clientId}`, metadata);
    
    // Here you would integrate with your alerting system
    // (email, Slack, security dashboard, etc.)
  }

  private startMonitoring(): void {
    // Clean up old activities periodically
    setInterval(() => {
      const cutoff = Date.now() - this.alertThresholds.timeWindow * 2;
      
      for (const [clientId, activities] of this.suspiciousActivities) {
        const recent = activities.filter(a => a.timestamp.getTime() > cutoff);
        if (recent.length === 0) {
          this.suspiciousActivities.delete(clientId);
        } else {
          this.suspiciousActivities.set(clientId, recent);
        }
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  public getClientActivity(clientId: string): SuspiciousActivity[] {
    return this.suspiciousActivities.get(clientId) || [];
  }

  public getAllSuspiciousClients(): Array<{ clientId: string; activityCount: number; riskScore: number }> {
    const results = [];
    
    for (const [clientId, activities] of this.suspiciousActivities) {
      const riskScore = this.calculateRiskScore(activities);
      if (riskScore > 0.5) { // Only include risky clients
        results.push({
          clientId,
          activityCount: activities.length,
          riskScore
        });
      }
    }
    
    return results.sort((a, b) => b.riskScore - a.riskScore);
  }

  private calculateRiskScore(activities: SuspiciousActivity[]): number {
    if (activities.length === 0) return 0;

    let score = 0;
    
    // High activity volume
    score += Math.min(activities.length / 100, 0.3);
    
    // High complexity queries
    const avgComplexity = activities.reduce((sum, a) => sum + a.complexity, 0) / activities.length;
    score += Math.min(avgComplexity / 10000, 0.3);
    
    // Suspicious patterns
    const suspiciousCount = activities.reduce((sum, a) => sum + a.suspiciousPatterns.length, 0);
    score += Math.min(suspiciousCount / 20, 0.4);
    
    return Math.min(score, 1.0);
  }
}

interface SuspiciousActivity {
  timestamp: Date;
  clientId: string;
  complexity: number;
  depth: number;
  fieldCount: number;
  suspiciousPatterns: string[];
  operationType: 'query' | 'mutation' | 'subscription';
}

interface AlertThresholds {
  complexitySpike: number;
  rateLimitViolations: number;
  suspiciousPatternCount: number;
  timeWindow: number;
}