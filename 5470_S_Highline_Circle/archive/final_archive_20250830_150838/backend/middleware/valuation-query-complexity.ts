/**
 * Query Complexity Analysis and Rate Limiting for Valuation System
 * 
 * Implements sophisticated query complexity scoring and rate limiting
 * to protect against resource-intensive operations and abuse
 */

import { 
  createComplexityLimitRule, 
  getComplexity, 
  ComplexityEstimator,
  ComplexityEstimatorArgs 
} from 'graphql-query-complexity';
import { 
  FieldNode, 
  FragmentDefinitionNode, 
  OperationDefinitionNode, 
  ValidationContext,
  GraphQLError
} from 'graphql';
import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import Redis from 'ioredis';
import { Context } from '../types/context';

// =====================================================
// COMPLEXITY SCORING CONFIGURATION
// =====================================================

/**
 * Base complexity scores for different operation types
 */
const BASE_COMPLEXITY_SCORES = {
  // Simple field access
  FIELD_ACCESS: 1,
  
  // Database queries
  SIMPLE_QUERY: 5,
  FILTERED_QUERY: 10,
  AGGREGATION_QUERY: 15,
  COMPLEX_JOIN: 20,
  
  // Computation operations
  CALCULATION: 3,
  SORTING: 5,
  GROUPING: 8,
  STATISTICAL_ANALYSIS: 12,
  
  // External API calls
  MARKET_RESEARCH: 25,
  EXTERNAL_PRICING: 30,
  
  // Batch operations
  BATCH_OPERATION: 50,
  BULK_VALUATION: 100,
  
  // Real-time operations
  SUBSCRIPTION: 20,
  LIVE_FEED: 40
} as const;

/**
 * Maximum allowed complexity scores by user type and operation
 */
const COMPLEXITY_LIMITS = {
  // Query complexity limits
  QUERY_MAX: {
    guest: 100,
    user: 500,
    premium: 1000,
    admin: 2000
  },
  
  // Mutation complexity limits
  MUTATION_MAX: {
    guest: 50,
    user: 200,
    premium: 500,
    admin: 1000
  },
  
  // Subscription complexity limits
  SUBSCRIPTION_MAX: {
    guest: 20,
    user: 100,
    premium: 200,
    admin: 500
  }
} as const;

// =====================================================
# COMPLEXITY ESTIMATORS
// =====================================================

/**
 * Custom complexity estimator for valuation queries
 */
const valuationComplexityEstimator: ComplexityEstimator = (args: ComplexityEstimatorArgs) => {
  const { type, field, args: fieldArgs, childComplexity } = args;
  
  // Field-specific complexity calculations
  switch (field.name) {
    // Simple field access
    case 'id':
    case 'createdAt':
    case 'updatedAt':
      return BASE_COMPLEXITY_SCORES.FIELD_ACCESS;
    
    // Single item queries
    case 'itemValuation':
    case 'currentValuation':
      return BASE_COMPLEXITY_SCORES.SIMPLE_QUERY + childComplexity;
    
    // Collection queries with potential for large datasets
    case 'valuations':
    case 'marketComparisons':
    case 'priceHistory':
      const limit = fieldArgs?.pagination?.first || fieldArgs?.limit || 20;
      const baseScore = BASE_COMPLEXITY_SCORES.FILTERED_QUERY;
      
      // Complexity increases with page size
      const pageMultiplier = Math.min(limit / 10, 10); // Cap at 10x
      
      // Additional complexity for filtering
      let filterMultiplier = 1;
      if (fieldArgs?.filter) {
        const filterCount = Object.keys(fieldArgs.filter).length;
        filterMultiplier = 1 + (filterCount * 0.2); // 20% increase per filter
      }
      
      // Additional complexity for sorting
      let sortMultiplier = 1;
      if (fieldArgs?.sort) {
        sortMultiplier = 1.5;
      }
      
      return Math.round(baseScore * pageMultiplier * filterMultiplier * sortMultiplier) + childComplexity;
    
    // Aggregated analytics queries
    case 'pricingInsights':
    case 'portfolioAnalytics':
      return BASE_COMPLEXITY_SCORES.AGGREGATION_QUERY + childComplexity;
    
    case 'roomValuationSummary':
    case 'marketInsights':
      return BASE_COMPLEXITY_SCORES.COMPLEX_JOIN + childComplexity;
    
    // Market research operations
    case 'findComparables':
    case 'performMarketResearch':
      const sources = fieldArgs?.sources?.length || 1;
      const maxResults = fieldArgs?.maxResults || fieldArgs?.limit || 10;
      return BASE_COMPLEXITY_SCORES.MARKET_RESEARCH + (sources * maxResults * 2) + childComplexity;
    
    // Statistical and predictive operations
    case 'predictedValue':
    case 'valueAtRisk':
      return BASE_COMPLEXITY_SCORES.STATISTICAL_ANALYSIS + childComplexity;
    
    case 'portfolioPerformance':
    case 'marketTrends':
      const timeRange = fieldArgs?.timeRange || {};
      const daysDiff = timeRange.end && timeRange.start 
        ? Math.ceil((new Date(timeRange.end).getTime() - new Date(timeRange.start).getTime()) / (1000 * 60 * 60 * 24))
        : 365;
      
      // Complexity increases with time range
      const timeMultiplier = Math.min(daysDiff / 365, 3); // Cap at 3x for longer periods
      return Math.round(BASE_COMPLEXITY_SCORES.STATISTICAL_ANALYSIS * timeMultiplier) + childComplexity;
    
    // Batch operations
    case 'requestValuations':
    case 'refreshValuations':
      const itemCount = fieldArgs?.itemIds?.length || fieldArgs?.input?.itemIds?.length || 1;
      return BASE_COMPLEXITY_SCORES.BATCH_OPERATION + (itemCount * 5) + childComplexity;
    
    case 'bulkUpdatePrices':
      const updateCount = fieldArgs?.updates?.length || 1;
      return BASE_COMPLEXITY_SCORES.BATCH_OPERATION + (updateCount * 3) + childComplexity;
    
    // Recommendation engines
    case 'sellRecommendations':
    case 'undervaluedItems':
    case 'investmentOpportunities':
      const maxItems = fieldArgs?.maxItems || fieldArgs?.limit || 10;
      return BASE_COMPLEXITY_SCORES.STATISTICAL_ANALYSIS + (maxItems * 2) + childComplexity;
    
    // External data operations
    case 'refreshMarketData':
      const refreshCount = fieldArgs?.itemIds?.length || 1;
      return BASE_COMPLEXITY_SCORES.EXTERNAL_PRICING + (refreshCount * 10) + childComplexity;
    
    // Subscription operations
    case 'valuationUpdated':
    case 'priceAlert':
      return BASE_COMPLEXITY_SCORES.SUBSCRIPTION + childComplexity;
    
    case 'portfolioValueUpdate':
    case 'marketTrendUpdate':
      return BASE_COMPLEXITY_SCORES.LIVE_FEED + childComplexity;
    
    // Default complexity for unknown fields
    default:
      return BASE_COMPLEXITY_SCORES.FIELD_ACCESS + childComplexity;
  }
};

/**
 * Create complexity limit rule with context-aware limits
 */
export function createComplexityRule(maxComplexity?: number) {
  return createComplexityLimitRule(maxComplexity || 1000, {
    estimators: [valuationComplexityEstimator],
    
    // Custom error message
    createError: (max: number, actual: number) => {
      return new GraphQLError(
        `Query complexity ${actual} exceeds maximum allowed complexity ${max}. ` +
        `Consider simplifying your query, reducing page sizes, or using pagination.`,
        {
          extensions: {
            code: 'QUERY_COMPLEXITY_TOO_HIGH',
            complexity: actual,
            maxComplexity: max
          }
        }
      );
    },
    
    // Complexity calculation based on user context
    onComplete: (complexity: number, context: any) => {
      // Log high-complexity queries for monitoring
      if (complexity > 500) {
        console.warn(`High complexity query executed: ${complexity}`, {
          user: context?.user?.id,
          operation: context?.operation?.operation,
          timestamp: new Date().toISOString()
        });
      }
    }
  });
}

/**
 * Dynamic complexity limit based on user context
 */
export function getComplexityLimit(context: Context, operationType: 'query' | 'mutation' | 'subscription'): number {
  const userRole = context.user?.role || 'guest';
  const limits = COMPLEXITY_LIMITS[`${operationType.toUpperCase()}_MAX` as keyof typeof COMPLEXITY_LIMITS];
  
  return (limits as any)[userRole] || (limits as any).guest;
}

// =====================================================
// RATE LIMITING CONFIGURATION
// =====================================================

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379')
});

/**
 * Rate limiters for different operation types
 */
const rateLimiters = {
  // General query rate limiting
  queries: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'valuation_query_limit',
    points: 100, // Number of requests
    duration: 60, // Per 60 seconds
    blockDuration: 60, // Block for 60 seconds if limit exceeded
  }),

  // Mutation rate limiting (more restrictive)
  mutations: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'valuation_mutation_limit',
    points: 20, // Number of mutations
    duration: 60, // Per 60 seconds
    blockDuration: 120, // Block for 2 minutes
  }),

  // Batch operation rate limiting (very restrictive)
  batchOperations: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'valuation_batch_limit',
    points: 5, // Number of batch operations
    duration: 300, // Per 5 minutes
    blockDuration: 600, // Block for 10 minutes
  }),

  // Market research rate limiting
  marketResearch: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'market_research_limit',
    points: 10, // Number of research operations
    duration: 60, // Per minute
    blockDuration: 300, // Block for 5 minutes
  }),

  // Subscription connection limiting
  subscriptions: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'subscription_limit',
    points: 10, // Number of concurrent subscriptions
    duration: 3600, // Per hour
    blockDuration: 1800, // Block for 30 minutes
  })
};

/**
 * Premium user rate limiters (higher limits)
 */
const premiumRateLimiters = {
  queries: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'premium_valuation_query_limit',
    points: 500,
    duration: 60,
    blockDuration: 30,
  }),

  mutations: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'premium_valuation_mutation_limit',
    points: 100,
    duration: 60,
    blockDuration: 60,
  }),

  batchOperations: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'premium_batch_limit',
    points: 20,
    duration: 300,
    blockDuration: 300,
  }),

  marketResearch: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'premium_market_research_limit',
    points: 50,
    duration: 60,
    blockDuration: 120,
  })
};

// =====================================================
// RATE LIMITING MIDDLEWARE
// =====================================================

/**
 * Rate limiting middleware for GraphQL operations
 */
export async function applyRateLimit(
  context: Context, 
  operationType: 'query' | 'mutation' | 'subscription',
  operationName?: string
): Promise<void> {
  const userId = context.user?.id || context.ip || 'anonymous';
  const userRole = context.user?.role || 'guest';
  const isPremium = ['premium', 'admin'].includes(userRole);
  
  // Select appropriate rate limiters
  const limiters = isPremium ? premiumRateLimiters : rateLimiters;
  
  try {
    // Apply different rate limits based on operation type
    switch (operationType) {
      case 'query':
        await limiters.queries.consume(userId);
        break;
        
      case 'mutation':
        await limiters.mutations.consume(userId);
        
        // Additional limiting for batch operations
        if (operationName && isBatchOperation(operationName)) {
          await limiters.batchOperations.consume(userId);
        }
        
        // Additional limiting for market research
        if (operationName && isMarketResearchOperation(operationName)) {
          await limiters.marketResearch.consume(userId);
        }
        break;
        
      case 'subscription':
        await limiters.subscriptions.consume(userId);
        break;
    }
  } catch (rateLimitError) {
    // Extract rate limit information
    const resetTime = new Date(Date.now() + (rateLimitError.msBeforeNext || 60000));
    
    throw new GraphQLError(
      `Rate limit exceeded for ${operationType} operations. Try again in ${Math.ceil((rateLimitError.msBeforeNext || 60000) / 1000)} seconds.`,
      {
        extensions: {
          code: 'RATE_LIMIT_EXCEEDED',
          operationType,
          retryAfter: Math.ceil((rateLimitError.msBeforeNext || 60000) / 1000),
          resetTime: resetTime.toISOString(),
          remainingPoints: rateLimitError.remainingPoints || 0,
          totalHits: rateLimitError.totalHits || 0
        }
      }
    );
  }
}

/**
 * Check if operation is a batch operation
 */
function isBatchOperation(operationName: string): boolean {
  const batchOperations = [
    'requestValuations',
    'refreshValuations', 
    'bulkUpdatePrices',
    'refreshMarketData'
  ];
  
  return batchOperations.some(op => operationName.toLowerCase().includes(op.toLowerCase()));
}

/**
 * Check if operation involves market research
 */
function isMarketResearchOperation(operationName: string): boolean {
  const marketOperations = [
    'findComparables',
    'performMarketResearch',
    'refreshMarketData'
  ];
  
  return marketOperations.some(op => operationName.toLowerCase().includes(op.toLowerCase()));
}

// =====================================================
// QUERY DEPTH LIMITING
// =====================================================

/**
 * Limit query depth to prevent deeply nested queries
 */
export function createDepthLimitRule(maxDepth: number = 10) {
  return (context: ValidationContext) => {
    const depths: Record<string, number> = {};
    
    return {
      Field: (node: FieldNode) => {
        const fieldName = node.name.value;
        const path = getPath(context, node);
        depths[path] = (depths[path] || 0) + 1;
        
        if (depths[path] > maxDepth) {
          context.reportError(
            new GraphQLError(
              `Query depth limit of ${maxDepth} exceeded at field "${fieldName}"`,
              {
                nodes: [node],
                extensions: {
                  code: 'QUERY_DEPTH_TOO_HIGH',
                  maxDepth,
                  actualDepth: depths[path]
                }
              }
            )
          );
        }
      }
    };
  };
}

/**
 * Get field path for depth calculation
 */
function getPath(context: ValidationContext, node: FieldNode): string {
  const path = [];
  let current = node;
  
  // This is a simplified path calculation
  // In a real implementation, you'd traverse the AST more carefully
  while (current) {
    if (current.name) {
      path.unshift(current.name.value);
    }
    // This would need proper AST traversal logic
    break;
  }
  
  return path.join('.');
}

// =====================================================
// MONITORING AND METRICS
// =====================================================

/**
 * Query performance metrics collector
 */
export class QueryMetricsCollector {
  private metrics: Map<string, any> = new Map();

  recordQuery(operationName: string, complexity: number, duration: number, success: boolean): void {
    const key = operationName || 'anonymous';
    const existing = this.metrics.get(key) || {
      count: 0,
      totalComplexity: 0,
      totalDuration: 0,
      successCount: 0,
      errorCount: 0,
      avgComplexity: 0,
      avgDuration: 0
    };

    existing.count++;
    existing.totalComplexity += complexity;
    existing.totalDuration += duration;
    
    if (success) {
      existing.successCount++;
    } else {
      existing.errorCount++;
    }

    existing.avgComplexity = existing.totalComplexity / existing.count;
    existing.avgDuration = existing.totalDuration / existing.count;

    this.metrics.set(key, existing);
  }

  getMetrics(): Record<string, any> {
    return Object.fromEntries(this.metrics.entries());
  }

  getTopQueries(limit: number = 10): Array<[string, any]> {
    return Array.from(this.metrics.entries())
      .sort(([,a], [,b]) => b.count - a.count)
      .slice(0, limit);
  }

  clearMetrics(): void {
    this.metrics.clear();
  }
}

export const metricsCollector = new QueryMetricsCollector();

// =====================================================
// EXPORTS
// =====================================================

export {
  BASE_COMPLEXITY_SCORES,
  COMPLEXITY_LIMITS,
  valuationComplexityEstimator,
  rateLimiters,
  premiumRateLimiters
};