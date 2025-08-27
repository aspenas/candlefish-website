import {
  createComplexityLimitRule,
  fieldExtensionsEstimator,
  simpleEstimator,
  getComplexity,
} from 'graphql-query-complexity';
import { ValidationRule, GraphQLError, DocumentNode, FieldNode } from 'graphql';
import { GraphQLSchema } from 'graphql';

// Complexity configuration interface
export interface ComplexityConfig {
  maximumComplexity: number;
  scalarCost: number;
  objectCost: number;
  listFactor: number;
  introspectionCost: number;
  enableIntrospection: boolean;
  onComplete?: (complexity: number, context: any) => void;
  onError?: (error: Error, context: any) => void;
}

// Default complexity configuration
export const defaultComplexityConfig: ComplexityConfig = {
  maximumComplexity: 1000,
  scalarCost: 1,
  objectCost: 2,
  listFactor: 10,
  introspectionCost: 100,
  enableIntrospection: process.env.NODE_ENV !== 'production',
  onComplete: (complexity: number, context: any) => {
    console.log(`📊 Query complexity: ${complexity}`, {
      userId: context?.user?.id,
      organizationId: context?.user?.organizationId,
      operationName: context?.operationName,
    });
  },
  onError: (error: Error, context: any) => {
    console.error('❌ Query complexity error:', error.message, {
      userId: context?.user?.id,
      organizationId: context?.user?.organizationId,
    });
  },
};

// Custom complexity estimators
export const createCustomComplexityEstimators = () => {
  // Field-level complexity based on field extensions
  const fieldComplexityEstimator = fieldExtensionsEstimator({
    scalarCost: defaultComplexityConfig.scalarCost,
    objectCost: defaultComplexityConfig.objectCost,
    listFactor: defaultComplexityConfig.listFactor,
  });

  // Simple estimator with custom costs
  const simpleComplexityEstimator = simpleEstimator({
    maximumCost: defaultComplexityConfig.maximumComplexity,
    // Define costs for specific types and fields
    fieldCosts: {
      // High-cost operations
      'Query.securityEvents': 50,
      'Query.searchEvents': 100,
      'Query.eventAnalytics': 200,
      'Query.alertAnalytics': 150,
      'Query.assetAnalytics': 200,
      'Query.relatedEvents': 75,
      'Query.similarAlerts': 100,
      'Query.assetDependencies': 150,
      'Query.threatIntelligenceSearch': 200,
      'Query.complianceReport': 300,
      'Query.vulnerabilityReport': 250,
      
      // Medium-cost operations
      'Query.alerts': 25,
      'Query.assets': 20,
      'Query.vulnerabilities': 30,
      'Query.incidents': 25,
      'Query.users': 15,
      'Query.searchAlerts': 75,
      'Query.searchAssets': 50,
      
      // Low-cost operations
      'Query.user': 5,
      'Query.asset': 10,
      'Query.alert': 10,
      'Query.securityEvent': 10,
      'Query.incident': 10,
      'Query.vulnerability': 15,
      
      // Connection fields (based on 'first' argument)
      'AssetConnection.edges': (args: any) => (args.first || 10) * 2,
      'AlertConnection.edges': (args: any) => (args.first || 10) * 2,
      'VulnerabilityConnection.edges': (args: any) => (args.first || 10) * 3,
      'SecurityEventConnection.edges': (args: any) => (args.first || 10) * 2,
      
      // Aggregation fields (higher cost)
      'AssetConnection.aggregations': 50,
      'AlertConnection.aggregations': 50,
      'VulnerabilityConnection.aggregations': 75,
      'SecurityEventConnection.aggregations': 100,
      
      // Expensive relationship fields
      'Asset.vulnerabilities': 25,
      'Asset.alerts': 20,
      'Asset.events': 30,
      'Asset.dependencies': 40,
      'Alert.relatedEvents': 30,
      'Alert.evidence': 20,
      'Alert.similarAlerts': 50,
      'User.assignedAlerts': 25,
      'User.managedAssets': 20,
      
      // Time-series and analytics fields
      'EventAnalytics.eventTimeline': 100,
      'AlertAnalytics.alertTrends': 75,
      'AssetAnalytics.riskTrends': 100,
      'SecurityMetrics.vulnerabilityTrends': 50,
      'SecurityMetrics.alertTrends': 50,
      'SecurityMetrics.threatActivityTrends': 75,
    },
  });

  return {
    fieldComplexityEstimator,
    simpleComplexityEstimator,
  };
};

// Dynamic complexity based on user role and organization
export const createRoleBasedComplexityLimiter = (baseLimit: number = 1000) => {
  const roleMultipliers = {
    VIEWER: 0.5,
    ANALYST: 1.0,
    INCIDENT_RESPONDER: 1.5,
    ADMIN: 2.0,
    SUPER_ADMIN: 3.0,
  };

  return (context: any): number => {
    const userRole = context?.user?.role || 'VIEWER';
    const multiplier = roleMultipliers[userRole as keyof typeof roleMultipliers] || 0.5;
    return Math.floor(baseLimit * multiplier);
  };
};

// Time-based complexity adjustment (lower limits during peak hours)
export const createTimeBasedComplexityLimiter = (baseLimit: number = 1000) => {
  return (context: any): number => {
    const currentHour = new Date().getHours();
    
    // Peak business hours (9 AM - 5 PM): 80% of base limit
    if (currentHour >= 9 && currentHour <= 17) {
      return Math.floor(baseLimit * 0.8);
    }
    
    // Off-peak hours: full limit
    return baseLimit;
  };
};

// Organization-based complexity (based on subscription tier)
export const createOrganizationComplexityLimiter = (baseLimit: number = 1000) => {
  const subscriptionMultipliers = {
    STARTER: 0.5,
    PROFESSIONAL: 1.0,
    ENTERPRISE: 2.0,
    CUSTOM: 3.0,
  };

  return async (context: any): Promise<number> => {
    if (!context?.user?.organizationId) {
      return Math.floor(baseLimit * 0.5); // Default for unauthenticated
    }

    // In a real implementation, fetch organization subscription from database
    const subscription = await getOrganizationSubscription(context.user.organizationId);
    const multiplier = subscriptionMultipliers[subscription as keyof typeof subscriptionMultipliers] || 1.0;
    
    return Math.floor(baseLimit * multiplier);
  };
};

// Placeholder for organization subscription lookup
async function getOrganizationSubscription(organizationId: string): Promise<string> {
  // In production, query your database
  return 'PROFESSIONAL'; // Default
}

// Advanced complexity rule with multiple factors
export const createAdvancedComplexityRule = (
  schema: GraphQLSchema,
  config: Partial<ComplexityConfig> = {}
): ValidationRule => {
  const finalConfig = { ...defaultComplexityConfig, ...config };
  const { fieldComplexityEstimator, simpleComplexityEstimator } = createCustomComplexityEstimators();
  
  const roleBasedLimiter = createRoleBasedComplexityLimiter(finalConfig.maximumComplexity);
  const timeBasedLimiter = createTimeBasedComplexityLimiter(finalConfig.maximumComplexity);

  return createComplexityLimitRule(finalConfig.maximumComplexity, {
    estimators: [fieldComplexityEstimator, simpleComplexityEstimator],
    onComplete: (complexity: number, context: any) => {
      // Calculate dynamic limits
      const roleLimit = roleBasedLimiter(context);
      const timeLimit = timeBasedLimiter(context);
      const effectiveLimit = Math.min(roleLimit, timeLimit);

      // Log complexity metrics
      console.log(`📊 Query Complexity Analysis:`, {
        complexity,
        baseLimit: finalConfig.maximumComplexity,
        roleLimit,
        timeLimit,
        effectiveLimit,
        userId: context?.user?.id,
        userRole: context?.user?.role,
        organizationId: context?.user?.organizationId,
        operationName: context?.operationName,
        exceededLimit: complexity > effectiveLimit,
      });

      // Call custom completion handler
      if (finalConfig.onComplete) {
        finalConfig.onComplete(complexity, context);
      }

      // Check if complexity exceeds dynamic limits
      if (complexity > effectiveLimit) {
        throw new GraphQLError(
          `Query complexity ${complexity} exceeds limit ${effectiveLimit} for role ${context?.user?.role || 'VIEWER'}`,
          {
            extensions: {
              code: 'QUERY_COMPLEXITY_EXCEEDED',
              complexity,
              limit: effectiveLimit,
              role: context?.user?.role,
            },
          }
        );
      }
    },
    createError: (max: number, actual: number) => {
      return new GraphQLError(
        `Query complexity ${actual} exceeds maximum allowed complexity ${max}`,
        {
          extensions: {
            code: 'QUERY_COMPLEXITY_EXCEEDED',
            complexity: actual,
            limit: max,
          },
        }
      );
    },
  });
};

// Query depth limiting
export const createDepthLimitRule = (maxDepth: number = 10) => {
  return (validationContext: any) => {
    const depths: Record<string, number> = {};
    
    return {
      Field: {
        enter(node: FieldNode, key: any, parent: any, path: any) {
          const fieldName = node.name.value;
          const currentDepth = path.length;
          
          if (currentDepth > maxDepth) {
            validationContext.reportError(
              new GraphQLError(
                `Query depth ${currentDepth} exceeds maximum allowed depth ${maxDepth}`,
                {
                  nodes: [node],
                  extensions: {
                    code: 'QUERY_DEPTH_EXCEEDED',
                    depth: currentDepth,
                    maxDepth,
                    field: fieldName,
                  },
                }
              )
            );
          }
          
          depths[fieldName] = Math.max(depths[fieldName] || 0, currentDepth);
        },
      },
    };
  };
};

// Query timeout based on complexity
export const calculateQueryTimeout = (complexity: number): number => {
  // Base timeout: 30 seconds
  const baseTimeout = 30000;
  
  // Additional time based on complexity (100ms per complexity point)
  const complexityTimeout = complexity * 100;
  
  // Maximum timeout: 5 minutes
  const maxTimeout = 300000;
  
  return Math.min(baseTimeout + complexityTimeout, maxTimeout);
};

// Query complexity middleware for Express/HTTP
export const complexityMiddleware = (schema: GraphQLSchema, config?: Partial<ComplexityConfig>) => {
  return async (req: any, res: any, next: any) => {
    const { query, variables, operationName } = req.body;
    
    if (!query) {
      return next();
    }

    try {
      const { fieldComplexityEstimator, simpleComplexityEstimator } = createCustomComplexityEstimators();
      const complexity = getComplexity({
        estimators: [fieldComplexityEstimator, simpleComplexityEstimator],
        query,
        variables,
        schema,
      });

      // Add complexity info to request context
      req.context = {
        ...req.context,
        queryComplexity: complexity,
        queryTimeout: calculateQueryTimeout(complexity),
        operationName,
      };

      // Set request timeout based on complexity
      req.setTimeout(calculateQueryTimeout(complexity));

      next();
    } catch (error) {
      console.error('❌ Complexity analysis error:', error);
      next(error);
    }
  };
};

// Rate limiting based on query complexity
interface ComplexityRateLimitState {
  totalComplexity: number;
  requestCount: number;
  resetTime: number;
}

export class ComplexityRateLimit {
  private limits: Map<string, ComplexityRateLimitState> = new Map();

  checkComplexityLimit(
    key: string,
    complexity: number,
    maxComplexityPerWindow: number = 10000,
    windowMs: number = 60000
  ): boolean {
    const now = Date.now();
    let state = this.limits.get(key);

    if (!state || now > state.resetTime) {
      state = {
        totalComplexity: complexity,
        requestCount: 1,
        resetTime: now + windowMs,
      };
      this.limits.set(key, state);
      return true;
    }

    const newTotalComplexity = state.totalComplexity + complexity;
    
    if (newTotalComplexity > maxComplexityPerWindow) {
      console.warn(`🚫 Complexity rate limit exceeded for ${key}:`, {
        currentTotal: state.totalComplexity,
        newComplexity: complexity,
        limit: maxComplexityPerWindow,
        requestCount: state.requestCount,
      });
      return false;
    }

    state.totalComplexity = newTotalComplexity;
    state.requestCount++;
    
    return true;
  }

  // Get current complexity usage for a key
  getUsage(key: string): { complexity: number; requests: number; remaining: number } {
    const state = this.limits.get(key);
    if (!state || Date.now() > state.resetTime) {
      return { complexity: 0, requests: 0, remaining: 10000 };
    }

    return {
      complexity: state.totalComplexity,
      requests: state.requestCount,
      remaining: Math.max(0, 10000 - state.totalComplexity),
    };
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, state] of this.limits.entries()) {
      if (now > state.resetTime) {
        this.limits.delete(key);
      }
    }
  }
}

// Create global complexity rate limiter
export const complexityRateLimit = new ComplexityRateLimit();

// Cleanup interval
setInterval(() => {
  complexityRateLimit.cleanup();
}, 60000); // Clean up every minute

// Query analysis and optimization suggestions
export interface QueryAnalysis {
  complexity: number;
  depth: number;
  fields: number;
  suggestions: string[];
  optimizations: string[];
  estimatedTime: number;
}

export const analyzeQuery = (
  query: DocumentNode,
  schema: GraphQLSchema,
  variables?: any
): QueryAnalysis => {
  try {
    const { fieldComplexityEstimator, simpleComplexityEstimator } = createCustomComplexityEstimators();
    const complexity = getComplexity({
      estimators: [fieldComplexityEstimator, simpleComplexityEstimator],
      query,
      variables,
      schema,
    });

    // Calculate query depth and field count
    const depth = calculateQueryDepth(query);
    const fieldCount = calculateFieldCount(query);
    
    // Generate suggestions
    const suggestions = generateOptimizationSuggestions(complexity, depth, fieldCount);
    const optimizations = generateQueryOptimizations(query);

    // Estimate execution time (rough approximation)
    const estimatedTime = Math.ceil(complexity * 10); // 10ms per complexity point

    return {
      complexity,
      depth,
      fields: fieldCount,
      suggestions,
      optimizations,
      estimatedTime,
    };
  } catch (error) {
    console.error('Query analysis error:', error);
    return {
      complexity: 0,
      depth: 0,
      fields: 0,
      suggestions: ['Unable to analyze query'],
      optimizations: [],
      estimatedTime: 0,
    };
  }
};

// Helper functions for query analysis
function calculateQueryDepth(query: DocumentNode): number {
  let maxDepth = 0;
  
  // Simplified depth calculation - in production, use a proper AST visitor
  const queryString = query.loc?.source.body || '';
  const openBraces = queryString.split('{').length - 1;
  const closeBraces = queryString.split('}').length - 1;
  
  return Math.min(openBraces, closeBraces);
}

function calculateFieldCount(query: DocumentNode): number {
  // Simplified field counting - in production, use a proper AST visitor
  const queryString = query.loc?.source.body || '';
  return queryString.split(/\s+/).filter(token => 
    !['query', 'mutation', 'subscription', 'fragment', '{', '}', '(', ')'].includes(token)
  ).length;
}

function generateOptimizationSuggestions(
  complexity: number,
  depth: number,
  fieldCount: number
): string[] {
  const suggestions: string[] = [];

  if (complexity > 500) {
    suggestions.push('Consider breaking this query into smaller queries');
    suggestions.push('Use pagination with smaller page sizes');
    suggestions.push('Remove unnecessary fields from the selection set');
  }

  if (depth > 5) {
    suggestions.push('Reduce query nesting depth using fragments');
    suggestions.push('Consider using separate queries for deeply nested data');
  }

  if (fieldCount > 50) {
    suggestions.push('Select only the fields you need');
    suggestions.push('Use GraphQL fragments to organize field selections');
  }

  if (complexity > 1000) {
    suggestions.push('This query may timeout - consider optimizing');
    suggestions.push('Use query variables to enable query caching');
  }

  return suggestions;
}

function generateQueryOptimizations(query: DocumentNode): string[] {
  const optimizations: string[] = [];
  const queryString = query.loc?.source.body || '';

  if (queryString.includes('edges { node {')) {
    optimizations.push('Using proper Connection pattern - good!');
  } else if (queryString.includes('Connection')) {
    optimizations.push('Consider using edges { node { ... } } pattern for connections');
  }

  if (queryString.includes('...')) {
    optimizations.push('Using fragments - good for performance and maintainability');
  }

  if (queryString.includes('first:') || queryString.includes('limit:')) {
    optimizations.push('Using pagination - good for performance');
  } else {
    optimizations.push('Consider adding pagination to list queries');
  }

  return optimizations;
}

// Export all complexity utilities
export {
  createCustomComplexityEstimators,
  createRoleBasedComplexityLimiter,
  createTimeBasedComplexityLimiter,
  createOrganizationComplexityLimiter,
  createDepthLimitRule,
  calculateQueryTimeout,
  complexityMiddleware,
};