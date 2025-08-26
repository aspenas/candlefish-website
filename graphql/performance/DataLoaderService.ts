import DataLoader from 'dataloader';
import { LRUCache } from 'lru-cache';
import crypto from 'crypto';
import { GraphQLResolveInfo, GraphQLFieldResolver } from 'graphql';
import { getComplexity, simpleEstimator, fieldExtensionsEstimator } from 'graphql-query-complexity';

// Cache configuration
const cacheConfig = {
  max: 1000, // Maximum number of items in cache
  ttl: 1000 * 60 * 5, // 5 minutes TTL
  updateAgeOnGet: true,
  updateAgeOnHas: true,
};

// Multi-level cache implementation
export class MultiLevelCache {
  private l1Cache: LRUCache<string, any>;
  private redisClient: any; // Redis client instance

  constructor(redisClient: any) {
    this.l1Cache = new LRUCache(cacheConfig);
    this.redisClient = redisClient;
  }

  async get(key: string): Promise<any> {
    // Check L1 cache first
    const l1Value = this.l1Cache.get(key);
    if (l1Value !== undefined) {
      return l1Value;
    }

    // Check L2 cache (Redis)
    if (this.redisClient) {
      const l2Value = await this.redisClient.get(key);
      if (l2Value) {
        const parsed = JSON.parse(l2Value);
        // Populate L1 cache
        this.l1Cache.set(key, parsed);
        return parsed;
      }
    }

    return null;
  }

  async set(key: string, value: any, ttl: number = 300): Promise<void> {
    // Set in L1 cache
    this.l1Cache.set(key, value);

    // Set in L2 cache (Redis)
    if (this.redisClient) {
      await this.redisClient.setex(key, ttl, JSON.stringify(value));
    }
  }

  async delete(key: string): Promise<void> {
    this.l1Cache.delete(key);
    if (this.redisClient) {
      await this.redisClient.del(key);
    }
  }

  clear(): void {
    this.l1Cache.clear();
  }
}

// DataLoader factory for preventing N+1 queries
export class DataLoaderFactory {
  private loaders: Map<string, DataLoader<any, any>> = new Map();
  private cache: MultiLevelCache;

  constructor(cache: MultiLevelCache) {
    this.cache = cache;
  }

  // Create a DataLoader for batch loading entities
  createLoader<K, V>(
    name: string,
    batchFn: (keys: readonly K[]) => Promise<V[]>,
    options?: DataLoader.Options<K, V>
  ): DataLoader<K, V> {
    const existing = this.loaders.get(name);
    if (existing) {
      return existing;
    }

    const loader = new DataLoader<K, V>(batchFn, {
      cache: true,
      maxBatchSize: 100,
      batchScheduleFn: (callback) => setTimeout(callback, 10),
      ...options,
    });

    this.loaders.set(name, loader);
    return loader;
  }

  // User loader with caching
  getUserLoader(db: any): DataLoader<string, any> {
    return this.createLoader('users', async (userIds: readonly string[]) => {
      const cacheKeys = userIds.map(id => `user:${id}`);
      const cachedUsers = await Promise.all(
        cacheKeys.map(key => this.cache.get(key))
      );

      const uncachedIds = userIds.filter((_, idx) => !cachedUsers[idx]);

      if (uncachedIds.length === 0) {
        return cachedUsers;
      }

      // Batch query for uncached users
      const query = `
        SELECT * FROM users
        WHERE id = ANY($1::uuid[])
      `;
      const result = await db.query(query, [uncachedIds]);
      const userMap = new Map(result.rows.map((row: any) => [row.id, row]));

      // Cache the results
      await Promise.all(
        result.rows.map((user: any) =>
          this.cache.set(`user:${user.id}`, user, 300)
        )
      );

      // Return users in the same order as requested
      return userIds.map(id => {
        const cached = cachedUsers[userIds.indexOf(id)];
        return cached || userMap.get(id) || null;
      });
    });
  }

  // Security events loader with batching
  getSecurityEventsLoader(db: any): DataLoader<string, any[]> {
    return this.createLoader('securityEvents', async (assetIds: readonly string[]) => {
      const query = `
        SELECT * FROM security_events
        WHERE asset_id = ANY($1::uuid[])
        ORDER BY timestamp DESC
        LIMIT 100
      `;
      const result = await db.query(query, [assetIds]);

      // Group events by asset_id
      const eventsByAsset = new Map<string, any[]>();
      assetIds.forEach(id => eventsByAsset.set(id, []));

      result.rows.forEach((event: any) => {
        const events = eventsByAsset.get(event.asset_id) || [];
        events.push(event);
        eventsByAsset.set(event.asset_id, events);
      });

      return assetIds.map(id => eventsByAsset.get(id) || []);
    });
  }

  // Alerts loader with pagination support
  getAlertsLoader(db: any): DataLoader<{ userId: string; limit: number; offset: number }, any[]> {
    return this.createLoader('alerts', async (params: readonly { userId: string; limit: number; offset: number }[]) => {
      // Group by similar parameters for efficient batching
      const uniqueQueries = new Map<string, { params: typeof params[0]; indices: number[] }>();

      params.forEach((param, idx) => {
        const key = `${param.limit}:${param.offset}`;
        const existing = uniqueQueries.get(key);
        if (existing) {
          existing.indices.push(idx);
        } else {
          uniqueQueries.set(key, { params: param, indices: [idx] });
        }
      });

      const results = new Array(params.length);

      await Promise.all(
        Array.from(uniqueQueries.values()).map(async ({ params: p, indices }) => {
          const userIds = indices.map(i => params[i].userId);
          const query = `
            SELECT * FROM alerts
            WHERE user_id = ANY($1::uuid[])
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
          `;
          const result = await db.query(query, [userIds, p.limit, p.offset]);

          // Group results by user_id
          const alertsByUser = new Map<string, any[]>();
          result.rows.forEach((alert: any) => {
            const alerts = alertsByUser.get(alert.user_id) || [];
            alerts.push(alert);
            alertsByUser.set(alert.user_id, alerts);
          });

          // Assign results back to correct positions
          indices.forEach(i => {
            results[i] = alertsByUser.get(params[i].userId) || [];
          });
        })
      );

      return results;
    });
  }

  // Clear all loaders (useful for testing or cache invalidation)
  clearAll(): void {
    this.loaders.forEach(loader => loader.clearAll());
    this.cache.clear();
  }
}

// GraphQL query complexity analyzer
export class QueryComplexityAnalyzer {
  private maxComplexity: number;
  private scalarCost: number;

  constructor(maxComplexity = 1000, scalarCost = 1) {
    this.maxComplexity = maxComplexity;
    this.scalarCost = scalarCost;
  }

  // Calculate query complexity
  calculateComplexity(
    schema: any,
    document: any,
    variables: Record<string, any> = {}
  ): number {
    return getComplexity({
      schema,
      query: document,
      variables,
      estimators: [
        fieldExtensionsEstimator(),
        simpleEstimator({ defaultComplexity: this.scalarCost }),
      ],
    });
  }

  // Middleware to check query complexity
  complexityMiddleware(schema: any) {
    return async (req: any, res: any, next: any) => {
      if (req.body && req.body.query) {
        try {
          const complexity = this.calculateComplexity(
            schema,
            req.body.query,
            req.body.variables
          );

          if (complexity > this.maxComplexity) {
            return res.status(400).json({
              errors: [{
                message: `Query too complex. Complexity: ${complexity}, Max: ${this.maxComplexity}`,
                extensions: {
                  code: 'QUERY_TOO_COMPLEX',
                  complexity,
                  maxComplexity: this.maxComplexity,
                },
              }],
            });
          }

          // Add complexity to request for logging
          req.queryComplexity = complexity;
        } catch (error) {
          console.error('Failed to calculate query complexity:', error);
        }
      }
      next();
    };
  }
}

// Response cache with cache hints
export class ResponseCache {
  private cache: MultiLevelCache;

  constructor(cache: MultiLevelCache) {
    this.cache = cache;
  }

  // Generate cache key from query and variables
  private generateCacheKey(query: string, variables: any = {}): string {
    const hash = crypto.createHash('sha256');
    hash.update(query);
    hash.update(JSON.stringify(variables));
    return `gql:${hash.digest('hex')}`;
  }

  // Cache middleware for GraphQL responses
  middleware() {
    return async (req: any, res: any, next: any) => {
      if (req.method !== 'POST' || !req.body.query) {
        return next();
      }

      // Skip caching for mutations and subscriptions
      const query = req.body.query.trim();
      if (query.startsWith('mutation') || query.startsWith('subscription')) {
        return next();
      }

      const cacheKey = this.generateCacheKey(query, req.body.variables);

      // Check cache
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        res.set('X-Cache', 'HIT');
        return res.json(cached);
      }

      // Store original send function
      const originalSend = res.send;
      res.send = function(data: any) {
        res.send = originalSend;

        // Cache successful responses
        if (res.statusCode === 200) {
          const response = JSON.parse(data);
          if (!response.errors) {
            // Determine cache TTL from response hints
            const ttl = extractCacheTTL(response) || 60;
            cache.set(cacheKey, response, ttl);
          }
        }

        res.set('X-Cache', 'MISS');
        return res.send(data);
      };

      next();
    };
  }
}

// Extract cache TTL from GraphQL response
function extractCacheTTL(response: any): number | null {
  if (response.extensions && response.extensions.cacheControl) {
    return response.extensions.cacheControl.maxAge || null;
  }
  return null;
}

// Subscription optimizer for handling many concurrent connections
export class SubscriptionOptimizer {
  private subscriptions: Map<string, Set<any>> = new Map();
  private pubsub: any; // PubSub instance

  constructor(pubsub: any) {
    this.pubsub = pubsub;
  }

  // Optimize subscription by batching similar subscriptions
  subscribe(topic: string, filter: any, callback: (data: any) => void): () => void {
    const key = `${topic}:${JSON.stringify(filter)}`;

    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, new Set());

      // Create single subscription for this combination
      this.pubsub.subscribe(topic, (data: any) => {
        if (this.matchesFilter(data, filter)) {
          const callbacks = this.subscriptions.get(key);
          if (callbacks) {
            callbacks.forEach(cb => cb(data));
          }
        }
      });
    }

    const callbacks = this.subscriptions.get(key)!;
    callbacks.add(callback);

    // Return unsubscribe function
    return () => {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.subscriptions.delete(key);
      }
    };
  }

  private matchesFilter(data: any, filter: any): boolean {
    // Implement filter matching logic
    return Object.entries(filter).every(([key, value]) => data[key] === value);
  }
}

// Batch resolver for optimizing nested queries
export function createBatchResolver<TSource, TArgs, TContext>(
  resolver: GraphQLFieldResolver<TSource, TContext, TArgs>,
  options: {
    batch?: boolean;
    cache?: boolean;
    maxBatchSize?: number;
  } = {}
): GraphQLFieldResolver<TSource, TContext, TArgs> {
  const { batch = true, cache = true, maxBatchSize = 100 } = options;

  if (!batch) {
    return resolver;
  }

  // Create a DataLoader for this resolver
  const loader = new DataLoader<{ source: TSource; args: TArgs; context: TContext }, any>(
    async (keys) => {
      // Group by similar arguments
      const groups = new Map<string, typeof keys[0][]>();

      keys.forEach(key => {
        const argKey = JSON.stringify(key.args);
        const group = groups.get(argKey) || [];
        group.push(key);
        groups.set(argKey, group);
      });

      const results = new Array(keys.length);

      await Promise.all(
        Array.from(groups.entries()).map(async ([_, groupKeys]) => {
          // Batch resolve for this group
          const sources = groupKeys.map(k => k.source);
          const batchResults = await Promise.all(
            sources.map(source =>
              resolver(source, groupKeys[0].args, groupKeys[0].context, {} as GraphQLResolveInfo)
            )
          );

          // Map results back to original positions
          groupKeys.forEach((key, idx) => {
            const originalIdx = keys.indexOf(key);
            results[originalIdx] = batchResults[idx];
          });
        })
      );

      return results;
    },
    { cache, maxBatchSize }
  );

  return (source, args, context, info) => {
    return loader.load({ source, args, context });
  };
}

// Federation query planner optimizer
export class FederationOptimizer {
  private queryPlans: LRUCache<string, any>;

  constructor() {
    this.queryPlans = new LRUCache({
      max: 500,
      ttl: 1000 * 60 * 10, // 10 minutes
    });
  }

  // Optimize query plan execution
  async executeQueryPlan(plan: any, context: any): Promise<any> {
    const planKey = JSON.stringify(plan);

    // Check for cached plan optimization
    let optimizedPlan = this.queryPlans.get(planKey);
    if (!optimizedPlan) {
      optimizedPlan = this.optimizePlan(plan);
      this.queryPlans.set(planKey, optimizedPlan);
    }

    // Execute plan with parallelization
    return this.executePlan(optimizedPlan, context);
  }

  private optimizePlan(plan: any): any {
    // Identify independent subqueries that can be parallelized
    const optimized = { ...plan };

    if (plan.sequence) {
      const dependencies = this.analyzeDependencies(plan.sequence);
      optimized.parallel = this.groupParallelQueries(plan.sequence, dependencies);
    }

    return optimized;
  }

  private analyzeDependencies(sequence: any[]): Map<number, Set<number>> {
    const deps = new Map<number, Set<number>>();

    sequence.forEach((step, idx) => {
      const stepDeps = new Set<number>();

      // Check if step depends on previous steps
      if (step.requires) {
        step.requires.forEach((req: any) => {
          const depIdx = sequence.findIndex(s => s.provides === req);
          if (depIdx >= 0 && depIdx < idx) {
            stepDeps.add(depIdx);
          }
        });
      }

      deps.set(idx, stepDeps);
    });

    return deps;
  }

  private groupParallelQueries(
    sequence: any[],
    dependencies: Map<number, Set<number>>
  ): any[][] {
    const groups: any[][] = [];
    const processed = new Set<number>();

    while (processed.size < sequence.length) {
      const group: any[] = [];

      sequence.forEach((step, idx) => {
        if (processed.has(idx)) return;

        const deps = dependencies.get(idx) || new Set();
        const allDepsProcessed = Array.from(deps).every(d => processed.has(d));

        if (allDepsProcessed) {
          group.push({ ...step, index: idx });
          processed.add(idx);
        }
      });

      if (group.length > 0) {
        groups.push(group);
      }
    }

    return groups;
  }

  private async executePlan(plan: any, context: any): Promise<any> {
    const results: any[] = [];

    if (plan.parallel) {
      // Execute groups in sequence, but queries within groups in parallel
      for (const group of plan.parallel) {
        const groupResults = await Promise.all(
          group.map(step => this.executeStep(step, context))
        );
        results.push(...groupResults);
      }
    } else {
      // Fallback to sequential execution
      for (const step of plan.sequence) {
        const result = await this.executeStep(step, context);
        results.push(result);
      }
    }

    return this.mergeResults(results);
  }

  private async executeStep(step: any, context: any): Promise<any> {
    // Execute individual query step
    // This would integrate with your actual federation gateway
    return step;
  }

  private mergeResults(results: any[]): any {
    // Merge results from multiple subqueries
    return results.reduce((merged, result) => ({ ...merged, ...result }), {});
  }
}

// Export configured instances
export function createPerformanceOptimizers(redisClient: any, pubsub: any) {
  const cache = new MultiLevelCache(redisClient);
  const dataLoaderFactory = new DataLoaderFactory(cache);
  const queryComplexityAnalyzer = new QueryComplexityAnalyzer();
  const responseCache = new ResponseCache(cache);
  const subscriptionOptimizer = new SubscriptionOptimizer(pubsub);
  const federationOptimizer = new FederationOptimizer();

  return {
    cache,
    dataLoaderFactory,
    queryComplexityAnalyzer,
    responseCache,
    subscriptionOptimizer,
    federationOptimizer,
  };
}
