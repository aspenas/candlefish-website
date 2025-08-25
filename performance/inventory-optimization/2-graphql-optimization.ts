/**
 * GraphQL Optimization with DataLoader and Query Complexity Analysis
 * Implements depth limiting, query complexity scoring, and intelligent caching
 */

import { GraphQLSchema, GraphQLObjectType, GraphQLFieldConfig } from 'graphql';
import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { createComplexityLimitRule } from 'graphql-validation-complexity';
import depthLimit from 'graphql-depth-limit';
import costAnalysis from 'graphql-cost-analysis';
import { inventoryDataLoaders, inventoryCacheManager, CacheKeys, CacheTTL } from './1-redis-caching-implementation';
import DataLoader from 'dataloader';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';

/**
 * GraphQL Context with optimized data loaders
 */
export interface GraphQLContext {
  dataSources: {
    inventoryAPI: InventoryDataSource;
  };
  loaders: {
    item: DataLoader<string, any>;
    roomItems: DataLoader<string, any[]>;
    categoryItems: DataLoader<string, any[]>;
    userInventory: DataLoader<string, any>;
    bundleData: DataLoader<string, any>;
    analytics: DataLoader<string, any>;
  };
  cache: typeof inventoryCacheManager;
  user?: {
    id: string;
    role: string;
    permissions: string[];
  };
  requestId: string;
  startTime: number;
}

/**
 * Query complexity scoring
 */
const complexityScoring = {
  scalarCost: 1,
  objectCost: 2,
  listFactor: 10,
  depthCost: 1.5,
  introspectionCost: 1000,
  mutationCost: 10,
};

/**
 * Create optimized GraphQL context
 */
export function createGraphQLContext(req: any): GraphQLContext {
  return {
    dataSources: {
      inventoryAPI: new InventoryDataSource(),
    },
    loaders: {
      item: inventoryDataLoaders.loadItem,
      roomItems: inventoryDataLoaders.loadRoomItems,
      categoryItems: inventoryDataLoaders.loadCategoryItems,
      userInventory: createUserInventoryLoader(),
      bundleData: createBundleLoader(),
      analytics: createAnalyticsLoader(),
    },
    cache: inventoryCacheManager,
    user: req.user,
    requestId: req.headers['x-request-id'] || generateRequestId(),
    startTime: Date.now(),
  };
}

/**
 * Inventory Data Source with caching
 */
class InventoryDataSource {
  private cache = inventoryCacheManager;

  async getItem(id: string): Promise<any> {
    return this.cache.get(
      CacheKeys.INVENTORY_ITEM(id),
      () => this.fetchItemFromDB(id),
      CacheTTL.ITEM
    );
  }

  async getItems(params: any): Promise<any> {
    const cacheKey = CacheKeys.INVENTORY_LIST(JSON.stringify(params));
    return this.cache.get(
      cacheKey,
      () => this.fetchItemsFromDB(params),
      CacheTTL.LIST
    );
  }

  async searchItems(query: string, filters: any): Promise<any> {
    const cacheKey = CacheKeys.SEARCH_RESULTS(`${query}:${JSON.stringify(filters)}`);
    return this.cache.get(
      cacheKey,
      () => this.performSearch(query, filters),
      CacheTTL.SEARCH
    );
  }

  async getAnalytics(): Promise<any> {
    return this.cache.get(
      CacheKeys.ANALYTICS_SUMMARY,
      () => this.calculateAnalytics(),
      CacheTTL.ANALYTICS
    );
  }

  // Database operations (placeholders)
  private async fetchItemFromDB(id: string): Promise<any> {
    // Actual database query
    return {};
  }

  private async fetchItemsFromDB(params: any): Promise<any> {
    // Actual database query with pagination
    return { items: [], total: 0, pageInfo: {} };
  }

  private async performSearch(query: string, filters: any): Promise<any> {
    // Actual search implementation
    return { results: [], total: 0 };
  }

  private async calculateAnalytics(): Promise<any> {
    // Actual analytics calculation
    return {};
  }
}

/**
 * Create user inventory loader with caching
 */
function createUserInventoryLoader(): DataLoader<string, any> {
  return new DataLoader(
    async (userIds: readonly string[]) => {
      return Promise.all(
        userIds.map(userId =>
          inventoryCacheManager.get(
            CacheKeys.USER_INVENTORY(userId as string),
            async () => {
              // Fetch user inventory from database
              return {};
            },
            CacheTTL.USER_DATA
          )
        )
      );
    },
    { maxBatchSize: 50 }
  );
}

/**
 * Create bundle data loader
 */
function createBundleLoader(): DataLoader<string, any> {
  return new DataLoader(
    async (bundleIds: readonly string[]) => {
      return Promise.all(
        bundleIds.map(bundleId =>
          inventoryCacheManager.get(
            CacheKeys.BUNDLE_DATA(bundleId as string),
            async () => {
              // Fetch bundle data from database
              return {};
            },
            CacheTTL.ITEM
          )
        )
      );
    },
    { maxBatchSize: 30 }
  );
}

/**
 * Create analytics loader
 */
function createAnalyticsLoader(): DataLoader<string, any> {
  return new DataLoader(
    async (keys: readonly string[]) => {
      return Promise.all(
        keys.map(key =>
          inventoryCacheManager.get(
            `analytics:${key}`,
            async () => {
              // Calculate specific analytics
              return {};
            },
            CacheTTL.ANALYTICS
          )
        )
      );
    },
    { maxBatchSize: 10 }
  );
}

/**
 * GraphQL query optimization plugins
 */
export const optimizationPlugins = [
  // Query depth limiting
  {
    async requestDidStart() {
      return {
        async validationDidStart() {
          return async (validationContext: any) => {
            const errors = depthLimit(7)(validationContext);
            if (errors.length > 0) {
              throw new Error('Query depth limit exceeded');
            }
          };
        },
      };
    },
  },

  // Query complexity analysis
  {
    async requestDidStart() {
      return {
        async didResolveOperation(requestContext: any) {
          const complexity = calculateQueryComplexity(requestContext.document);

          if (complexity > 1000) {
            throw new Error(`Query complexity ${complexity} exceeds maximum allowed complexity of 1000`);
          }

          // Log high complexity queries for monitoring
          if (complexity > 500) {
            console.warn('High complexity query detected:', {
              complexity,
              query: requestContext.request.query,
              operationName: requestContext.operationName,
            });
          }
        },
      };
    },
  },

  // Response caching plugin
  {
    async requestDidStart() {
      return {
        async willSendResponse(requestContext: any) {
          const { context, response } = requestContext;

          // Cache successful query responses
          if (!response.errors && requestContext.operation?.operation === 'query') {
            const cacheKey = generateQueryCacheKey(requestContext);
            const ttl = determineQueryCacheTTL(requestContext);

            if (ttl > 0) {
              await inventoryCacheManager.set(cacheKey, response.data, ttl);
            }
          }

          // Add performance metrics to response
          const duration = Date.now() - context.startTime;
          response.extensions = {
            ...response.extensions,
            performance: {
              duration,
              cacheStats: inventoryCacheManager.getStats(),
            },
          };
        },
      };
    },
  },

  // Request logging and monitoring
  {
    async requestDidStart() {
      return {
        async didEncounterErrors(requestContext: any) {
          console.error('GraphQL errors:', {
            errors: requestContext.errors,
            query: requestContext.request.query,
            variables: requestContext.request.variables,
          });
        },

        async willSendResponse(requestContext: any) {
          const duration = Date.now() - requestContext.context.startTime;

          // Log slow queries
          if (duration > 1000) {
            console.warn('Slow GraphQL query:', {
              duration,
              query: requestContext.request.query,
              operationName: requestContext.operationName,
            });
          }

          // Track metrics
          trackQueryMetrics({
            operationName: requestContext.operationName,
            duration,
            complexity: requestContext.complexity,
            errors: requestContext.errors?.length || 0,
          });
        },
      };
    },
  },
];

/**
 * Calculate query complexity
 */
function calculateQueryComplexity(document: any): number {
  let complexity = 0;

  // Simple complexity calculation (would be more sophisticated in production)
  const visit = (node: any, depth: number = 0) => {
    if (node.kind === 'Field') {
      complexity += complexityScoring.scalarCost;
      complexity += depth * complexityScoring.depthCost;

      if (node.name.value === '__schema' || node.name.value === '__type') {
        complexity += complexityScoring.introspectionCost;
      }

      // Check for list types
      const args = node.arguments || [];
      const limitArg = args.find((arg: any) => arg.name.value === 'limit');
      if (limitArg) {
        const limit = limitArg.value.value || 10;
        complexity += limit * complexityScoring.listFactor;
      }
    }

    if (node.selectionSet) {
      node.selectionSet.selections.forEach((selection: any) => {
        visit(selection, depth + 1);
      });
    }
  };

  document.definitions.forEach((definition: any) => {
    if (definition.kind === 'OperationDefinition') {
      if (definition.operation === 'mutation') {
        complexity += complexityScoring.mutationCost;
      }
      definition.selectionSet.selections.forEach((selection: any) => {
        visit(selection, 0);
      });
    }
  });

  return complexity;
}

/**
 * Generate cache key for query
 */
function generateQueryCacheKey(requestContext: any): string {
  const { query, variables, operationName } = requestContext.request;
  const userId = requestContext.context.user?.id || 'anonymous';

  const hash = require('crypto')
    .createHash('md5')
    .update(`${query}:${JSON.stringify(variables)}:${operationName}:${userId}`)
    .digest('hex');

  return `gql:${hash}`;
}

/**
 * Determine cache TTL based on query type
 */
function determineQueryCacheTTL(requestContext: any): number {
  const operationName = requestContext.operationName || '';

  // Different TTLs for different query types
  if (operationName.includes('Analytics')) {
    return 600; // 10 minutes for analytics
  }
  if (operationName.includes('Search')) {
    return 120; // 2 minutes for search
  }
  if (operationName.includes('List')) {
    return 60; // 1 minute for lists
  }
  if (operationName.includes('Detail')) {
    return 300; // 5 minutes for details
  }

  return 0; // No caching by default
}

/**
 * Track query metrics
 */
function trackQueryMetrics(metrics: any): void {
  // Send to monitoring service (Prometheus, DataDog, etc.)
  console.log('Query metrics:', metrics);
}

/**
 * Generate request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Rate limiting for GraphQL
 */
export const graphqlRateLimiter = new RateLimiterRedis({
  storeClient: new Redis({
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
  }),
  keyPrefix: 'gql_rl',
  points: 100, // Number of requests
  duration: 60, // Per 60 seconds
  blockDuration: 60, // Block for 60 seconds
});

/**
 * GraphQL field resolver optimization
 */
export function optimizeFieldResolver(
  fieldConfig: GraphQLFieldConfig<any, any>
): GraphQLFieldConfig<any, any> {
  const originalResolve = fieldConfig.resolve;

  fieldConfig.resolve = async (parent, args, context, info) => {
    const cacheKey = `field:${info.parentType.name}.${info.fieldName}:${JSON.stringify(args)}`;

    // Check if this field should be cached
    const shouldCache = determineShouldCache(info);

    if (shouldCache) {
      const cached = await context.cache.get(cacheKey);
      if (cached !== null) {
        return cached;
      }
    }

    // Execute original resolver
    const result = originalResolve ? await originalResolve(parent, args, context, info) : parent[info.fieldName];

    // Cache the result if applicable
    if (shouldCache && result !== null && result !== undefined) {
      const ttl = determineFieldCacheTTL(info);
      await context.cache.set(cacheKey, result, ttl);
    }

    return result;
  };

  return fieldConfig;
}

/**
 * Determine if field should be cached
 */
function determineShouldCache(info: any): boolean {
  // Don't cache mutations
  if (info.operation.operation === 'mutation') {
    return false;
  }

  // Don't cache subscription fields
  if (info.operation.operation === 'subscription') {
    return false;
  }

  // Cache specific fields
  const cacheableFields = [
    'items',
    'item',
    'analytics',
    'summary',
    'categories',
    'rooms',
  ];

  return cacheableFields.includes(info.fieldName);
}

/**
 * Determine field cache TTL
 */
function determineFieldCacheTTL(info: any): number {
  const fieldName = info.fieldName;

  if (fieldName === 'analytics' || fieldName === 'summary') {
    return 600; // 10 minutes
  }
  if (fieldName === 'categories' || fieldName === 'rooms') {
    return 3600; // 1 hour for mostly static data
  }

  return 60; // Default 1 minute
}

/**
 * Batch resolver for optimized database queries
 */
export class BatchResolver {
  private batchSize: number;
  private batchWindow: number;
  private queue: Map<string, { resolve: Function; reject: Function; args: any }[]>;
  private timers: Map<string, NodeJS.Timeout>;

  constructor(batchSize = 100, batchWindow = 10) {
    this.batchSize = batchSize;
    this.batchWindow = batchWindow;
    this.queue = new Map();
    this.timers = new Map();
  }

  async resolve(type: string, args: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.queue.has(type)) {
        this.queue.set(type, []);
      }

      this.queue.get(type)!.push({ resolve, reject, args });

      // Process immediately if batch is full
      if (this.queue.get(type)!.length >= this.batchSize) {
        this.processBatch(type);
      } else {
        // Schedule batch processing
        if (!this.timers.has(type)) {
          this.timers.set(
            type,
            setTimeout(() => this.processBatch(type), this.batchWindow)
          );
        }
      }
    });
  }

  private async processBatch(type: string): Promise<void> {
    const batch = this.queue.get(type) || [];
    if (batch.length === 0) return;

    this.queue.set(type, []);
    if (this.timers.has(type)) {
      clearTimeout(this.timers.get(type)!);
      this.timers.delete(type);
    }

    try {
      // Execute batch query
      const results = await this.executeBatchQuery(type, batch.map(b => b.args));

      // Resolve individual promises
      batch.forEach((item, index) => {
        item.resolve(results[index]);
      });
    } catch (error) {
      // Reject all promises in batch
      batch.forEach(item => {
        item.reject(error);
      });
    }
  }

  private async executeBatchQuery(type: string, argsList: any[]): Promise<any[]> {
    // Implementation would execute optimized batch query
    return argsList.map(() => ({}));
  }
}

export const batchResolver = new BatchResolver();
