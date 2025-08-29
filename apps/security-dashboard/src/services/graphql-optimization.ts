/**
 * GraphQL Optimization Service
 * Implements DataLoader batching, query complexity analysis, and caching
 * Designed to handle 10M+ events per day with <100ms P95 response time
 */

import DataLoader from 'dataloader';
import { GraphQLSchema, GraphQLFieldMap, getNamedType, isListType, GraphQLObjectType } from 'graphql';
import { createHash } from 'crypto';
import LRU from 'lru-cache';
import { RedisCacheOptimizer } from './database-optimization';

// ====================
// Query Complexity Analysis
// ====================

export interface ComplexityOptions {
  maximumComplexity: number;
  scalarCost: number;
  objectCost: number;
  listFactor: number;
  introspectionCost: number;
  depthLimit: number;
  variables?: Record<string, any>;
}

export class QueryComplexityAnalyzer {
  private defaultOptions: ComplexityOptions = {
    maximumComplexity: 1000,
    scalarCost: 1,
    objectCost: 2,
    listFactor: 10,
    introspectionCost: 1000,
    depthLimit: 10,
  };

  constructor(private options: Partial<ComplexityOptions> = {}) {
    this.options = { ...this.defaultOptions, ...options };
  }

  calculateComplexity(
    query: any,
    schema: GraphQLSchema,
    variables?: Record<string, any>
  ): number {
    let complexity = 0;
    let depth = 0;

    const visit = (node: any, parentType?: any): void => {
      if (depth > this.options.depthLimit!) {
        throw new Error(`Query depth limit exceeded: ${depth} > ${this.options.depthLimit}`);
      }

      if (node.kind === 'Field') {
        depth++;
        
        // Check if it's an introspection query
        if (node.name.value.startsWith('__')) {
          complexity += this.options.introspectionCost!;
        } else {
          // Calculate field cost
          const fieldType = parentType?.getFields()?.[node.name.value]?.type;
          
          if (fieldType) {
            const namedType = getNamedType(fieldType);
            
            if (namedType instanceof GraphQLObjectType) {
              complexity += this.options.objectCost!;
              
              // Check for list types
              if (isListType(fieldType)) {
                const limit = this.getLimit(node, variables);
                complexity += limit * this.options.listFactor!;
              }
              
              // Recursively visit selections
              if (node.selectionSet) {
                node.selectionSet.selections.forEach((selection: any) => {
                  visit(selection, namedType);
                });
              }
            } else {
              complexity += this.options.scalarCost!;
            }
          }
        }
        
        depth--;
      } else if (node.kind === 'FragmentSpread' || node.kind === 'InlineFragment') {
        if (node.selectionSet) {
          node.selectionSet.selections.forEach((selection: any) => {
            visit(selection, parentType);
          });
        }
      }
    };

    // Start visiting from query root
    if (query.definitions) {
      query.definitions.forEach((definition: any) => {
        if (definition.kind === 'OperationDefinition') {
          const rootType = schema.getQueryType();
          definition.selectionSet.selections.forEach((selection: any) => {
            visit(selection, rootType);
          });
        }
      });
    }

    if (complexity > this.options.maximumComplexity!) {
      throw new Error(
        `Query complexity ${complexity} exceeds maximum allowed complexity ${this.options.maximumComplexity}`
      );
    }

    return complexity;
  }

  private getLimit(node: any, variables?: Record<string, any>): number {
    const limitArg = node.arguments?.find((arg: any) => 
      arg.name.value === 'limit' || arg.name.value === 'first'
    );

    if (!limitArg) return 10; // Default limit

    if (limitArg.value.kind === 'IntValue') {
      return parseInt(limitArg.value.value, 10);
    } else if (limitArg.value.kind === 'Variable' && variables) {
      return variables[limitArg.value.name.value] || 10;
    }

    return 10;
  }
}

// ====================
// DataLoader Factory
// ====================

export class DataLoaderFactory {
  private loaders: Map<string, DataLoader<any, any>>;
  private cache: LRU<string, any>;
  private redis?: RedisCacheOptimizer;

  constructor(redis?: RedisCacheOptimizer) {
    this.loaders = new Map();
    this.cache = new LRU<string, any>({
      max: 10000,
      ttl: 1000 * 60 * 5, // 5 minutes
      updateAgeOnGet: true,
    });
    this.redis = redis;
  }

  // Security Events Loader
  createSecurityEventLoader(dbClient: any): DataLoader<string, any> {
    return new DataLoader(
      async (ids: readonly string[]) => {
        const cacheKey = `events:${ids.join(',')}`;
        
        // Check Redis cache first
        if (this.redis) {
          const cached = await this.redis.getCached(cacheKey);
          if (cached) return cached;
        }

        // Batch query
        const query = `
          SELECT * FROM security_events 
          WHERE id = ANY($1::uuid[])
        `;
        const result = await dbClient.query(query, [ids]);
        
        // Map results to maintain order
        const eventMap = new Map(result.rows.map((row: any) => [row.id, row]));
        const ordered = ids.map(id => eventMap.get(id) || null);
        
        // Cache in Redis
        if (this.redis) {
          await this.redis.cacheQuery(cacheKey, ordered, 60);
        }
        
        return ordered;
      },
      {
        cache: true,
        cacheKeyFn: (key) => key,
        maxBatchSize: 100,
      }
    );
  }

  // User Loader with caching
  createUserLoader(dbClient: any): DataLoader<string, any> {
    return new DataLoader(
      async (userIds: readonly string[]) => {
        const cacheKey = `users:${userIds.join(',')}`;
        
        // Check memory cache
        const cached = this.cache.get(cacheKey);
        if (cached) return cached;

        const query = `
          SELECT * FROM users 
          WHERE id = ANY($1::uuid[])
        `;
        const result = await dbClient.query(query, [userIds]);
        
        const userMap = new Map(result.rows.map((row: any) => [row.id, row]));
        const ordered = userIds.map(id => userMap.get(id) || null);
        
        // Cache result
        this.cache.set(cacheKey, ordered);
        
        return ordered;
      },
      {
        cache: true,
        maxBatchSize: 50,
      }
    );
  }

  // Asset Loader with relationship pre-loading
  createAssetLoader(neo4jDriver: any): DataLoader<string, any> {
    return new DataLoader(
      async (assetIds: readonly string[]) => {
        const session = neo4jDriver.session();
        
        try {
          const result = await session.run(
            `
            MATCH (a:Asset)
            WHERE a.id IN $assetIds
            OPTIONAL MATCH (a)-[r:RELATES_TO]-(related:Asset)
            RETURN a, collect(DISTINCT {
              type: type(r),
              relatedAsset: related.id,
              properties: properties(r)
            }) as relationships
            `,
            { assetIds }
          );
          
          const assetMap = new Map(
            result.records.map((record: any) => [
              record.get('a').properties.id,
              {
                ...record.get('a').properties,
                relationships: record.get('relationships'),
              },
            ])
          );
          
          return assetIds.map(id => assetMap.get(id) || null);
        } finally {
          await session.close();
        }
      },
      {
        cache: true,
        maxBatchSize: 200,
      }
    );
  }

  // Metrics Aggregation Loader
  createMetricsLoader(dbClient: any): DataLoader<string, any> {
    return new DataLoader(
      async (timeRanges: readonly string[]) => {
        const queries = timeRanges.map(range => {
          const [start, end] = range.split('|');
          return {
            start,
            end,
            query: `
              SELECT 
                COUNT(*) as total_events,
                COUNT(*) FILTER (WHERE severity = 'critical') as critical_events,
                COUNT(*) FILTER (WHERE severity = 'high') as high_events,
                AVG(response_time_ms) as avg_response_time,
                MAX(response_time_ms) as max_response_time,
                MIN(response_time_ms) as min_response_time
              FROM security_events
              WHERE timestamp BETWEEN $1::timestamp AND $2::timestamp
            `,
          };
        });

        const results = await Promise.all(
          queries.map(({ query, start, end }) => 
            dbClient.query(query, [start, end])
          )
        );

        return results.map(result => result.rows[0]);
      },
      {
        cache: true,
        cacheKeyFn: (key) => key,
        maxBatchSize: 10,
      }
    );
  }

  // Get or create loader
  getLoader(name: string): DataLoader<any, any> | undefined {
    return this.loaders.get(name);
  }

  registerLoader(name: string, loader: DataLoader<any, any>): void {
    this.loaders.set(name, loader);
  }

  // Clear all loaders (useful for testing or cache invalidation)
  clearAll(): void {
    this.loaders.forEach(loader => loader.clearAll());
    this.cache.clear();
  }
}

// ====================
// Response Caching Strategy
// ====================

export interface CacheStrategy {
  ttl: number;
  staleWhileRevalidate?: number;
  tags?: string[];
  varyOn?: string[];
}

export class ResponseCacheManager {
  private cache: LRU<string, any>;
  private redis?: RedisCacheOptimizer;
  private cacheStrategies: Map<string, CacheStrategy>;

  constructor(redis?: RedisCacheOptimizer) {
    this.cache = new LRU<string, any>({
      max: 1000,
      ttl: 1000 * 60, // 1 minute default
    });
    this.redis = redis;
    this.cacheStrategies = new Map();
    
    this.setupDefaultStrategies();
  }

  private setupDefaultStrategies() {
    // Different caching strategies for different query types
    this.cacheStrategies.set('securityEvents', {
      ttl: 5,
      staleWhileRevalidate: 10,
      tags: ['events'],
    });

    this.cacheStrategies.set('dashboard', {
      ttl: 10,
      staleWhileRevalidate: 30,
      tags: ['dashboard', 'metrics'],
    });

    this.cacheStrategies.set('threatMetrics', {
      ttl: 30,
      staleWhileRevalidate: 60,
      tags: ['threats', 'metrics'],
    });

    this.cacheStrategies.set('userProfile', {
      ttl: 300,
      tags: ['user'],
    });

    this.cacheStrategies.set('complianceReport', {
      ttl: 3600,
      tags: ['compliance', 'reports'],
    });
  }

  generateCacheKey(
    query: string,
    variables?: Record<string, any>,
    context?: Record<string, any>
  ): string {
    const components = [
      query,
      JSON.stringify(variables || {}),
      context?.userId || 'anonymous',
      context?.role || 'public',
    ];

    return createHash('sha256')
      .update(components.join(':'))
      .digest('hex');
  }

  async get(
    key: string,
    queryType?: string
  ): Promise<{ data: any; stale?: boolean } | null> {
    // Try memory cache first
    const memCached = this.cache.get(key);
    if (memCached) {
      return { data: memCached, stale: false };
    }

    // Try Redis cache
    if (this.redis) {
      const strategy = this.cacheStrategies.get(queryType || 'default');
      const redisCached = await this.redis.getCached(key);
      
      if (redisCached) {
        // Check if stale but within revalidation window
        if (strategy?.staleWhileRevalidate) {
          const staleKey = `${key}:stale`;
          const staleData = await this.redis.getCached(staleKey);
          
          if (staleData) {
            return { data: redisCached, stale: true };
          }
        }
        
        // Update memory cache
        this.cache.set(key, redisCached);
        return { data: redisCached, stale: false };
      }
    }

    return null;
  }

  async set(
    key: string,
    data: any,
    queryType?: string
  ): Promise<void> {
    const strategy = this.cacheStrategies.get(queryType || 'default') || {
      ttl: 60,
    };

    // Set in memory cache
    this.cache.set(key, data);

    // Set in Redis with strategy
    if (this.redis) {
      await this.redis.cacheQuery(key, data, strategy.ttl);
      
      // Set stale version if staleWhileRevalidate is configured
      if (strategy.staleWhileRevalidate) {
        const staleKey = `${key}:stale`;
        await this.redis.cacheQuery(
          staleKey,
          data,
          strategy.ttl + strategy.staleWhileRevalidate
        );
      }

      // Tag for invalidation
      if (strategy.tags) {
        for (const tag of strategy.tags) {
          await this.redis.client.sadd(`tag:${tag}`, key);
          await this.redis.client.expire(`tag:${tag}`, strategy.ttl);
        }
      }
    }
  }

  async invalidateByTags(tags: string[]): Promise<void> {
    if (!this.redis) return;

    for (const tag of tags) {
      const keys = await this.redis.client.smembers(`tag:${tag}`);
      
      for (const key of keys) {
        this.cache.delete(key);
        await this.redis.client.del(key);
        await this.redis.client.del(`${key}:stale`);
      }
      
      await this.redis.client.del(`tag:${tag}`);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    // Clear memory cache
    const keys = this.cache.keys();
    const regex = new RegExp(pattern.replace('*', '.*'));
    
    keys.forEach(key => {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    });

    // Clear Redis cache
    if (this.redis) {
      await this.redis.invalidatePattern(pattern);
    }
  }

  getCacheHeaders(strategy: CacheStrategy): Record<string, string> {
    return {
      'Cache-Control': `max-age=${strategy.ttl}, stale-while-revalidate=${strategy.staleWhileRevalidate || 0}`,
      'X-Cache-Tags': (strategy.tags || []).join(','),
      'Vary': (strategy.varyOn || ['Authorization']).join(','),
    };
  }
}

// ====================
// Rate Limiting
// ====================

export class GraphQLRateLimiter {
  private redis?: RedisCacheOptimizer;
  private limits: Map<string, { points: number; duration: number }>;

  constructor(redis?: RedisCacheOptimizer) {
    this.redis = redis;
    this.limits = new Map();
    
    this.setupDefaultLimits();
  }

  private setupDefaultLimits() {
    // Different limits for different operations
    this.limits.set('query', { points: 100, duration: 60 });
    this.limits.set('mutation', { points: 20, duration: 60 });
    this.limits.set('subscription', { points: 10, duration: 60 });
    
    // Specific operation limits
    this.limits.set('bulkQuery', { points: 5, duration: 60 });
    this.limits.set('export', { points: 2, duration: 300 });
    this.limits.set('complexAnalysis', { points: 10, duration: 300 });
  }

  async checkLimit(
    identifier: string,
    operation: string,
    complexity?: number
  ): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    if (!this.redis) {
      return { allowed: true, remaining: 999, resetAt: new Date() };
    }

    const limit = this.limits.get(operation) || { points: 50, duration: 60 };
    
    // Adjust points based on complexity
    const points = complexity ? Math.ceil(complexity / 100) : 1;
    
    const key = `rate_limit:${operation}:${identifier}`;
    const current = await this.redis.client.incrby(key, points);
    
    if (current === points) {
      await this.redis.client.expire(key, limit.duration);
    }
    
    const ttl = await this.redis.client.ttl(key);
    const remaining = Math.max(0, limit.points - current);
    
    return {
      allowed: current <= limit.points,
      remaining,
      resetAt: new Date(Date.now() + ttl * 1000),
    };
  }

  async reset(identifier: string, operation?: string): Promise<void> {
    if (!this.redis) return;

    if (operation) {
      await this.redis.client.del(`rate_limit:${operation}:${identifier}`);
    } else {
      // Reset all limits for identifier
      const keys = await this.redis.client.keys(`rate_limit:*:${identifier}`);
      if (keys.length > 0) {
        await this.redis.client.del(...keys);
      }
    }
  }
}

// ====================
// Unified GraphQL Optimizer
// ====================

export class GraphQLOptimizer {
  private complexityAnalyzer: QueryComplexityAnalyzer;
  private dataLoaderFactory: DataLoaderFactory;
  private cacheManager: ResponseCacheManager;
  private rateLimiter: GraphQLRateLimiter;

  constructor(
    redis?: RedisCacheOptimizer,
    complexityOptions?: Partial<ComplexityOptions>
  ) {
    this.complexityAnalyzer = new QueryComplexityAnalyzer(complexityOptions);
    this.dataLoaderFactory = new DataLoaderFactory(redis);
    this.cacheManager = new ResponseCacheManager(redis);
    this.rateLimiter = new GraphQLRateLimiter(redis);
  }

  async executeOptimizedQuery(
    query: string,
    variables: Record<string, any>,
    context: any,
    schema: GraphQLSchema,
    executeFn: () => Promise<any>
  ): Promise<any> {
    const startTime = Date.now();
    
    try {
      // 1. Check rate limiting
      const { allowed, remaining, resetAt } = await this.rateLimiter.checkLimit(
        context.userId || context.ip,
        'query'
      );

      if (!allowed) {
        throw new Error(`Rate limit exceeded. Resets at ${resetAt.toISOString()}`);
      }

      // 2. Analyze query complexity
      const complexity = this.complexityAnalyzer.calculateComplexity(
        query,
        schema,
        variables
      );

      // 3. Generate cache key
      const cacheKey = this.cacheManager.generateCacheKey(query, variables, context);
      
      // 4. Check cache
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        console.log(`Cache hit for query (${Date.now() - startTime}ms)`);
        
        // If stale, trigger background revalidation
        if (cached.stale) {
          executeFn().then(result => 
            this.cacheManager.set(cacheKey, result)
          ).catch(console.error);
        }
        
        return cached.data;
      }

      // 5. Execute query with DataLoaders
      context.loaders = this.dataLoaderFactory;
      const result = await executeFn();

      // 6. Cache result
      await this.cacheManager.set(cacheKey, result);

      console.log(`Query executed in ${Date.now() - startTime}ms (complexity: ${complexity})`);
      
      return result;
    } catch (error) {
      console.error(`Query failed after ${Date.now() - startTime}ms:`, error);
      throw error;
    }
  }

  getDataLoaderFactory(): DataLoaderFactory {
    return this.dataLoaderFactory;
  }

  getCacheManager(): ResponseCacheManager {
    return this.cacheManager;
  }

  getRateLimiter(): GraphQLRateLimiter {
    return this.rateLimiter;
  }

  async invalidateCache(tags?: string[], pattern?: string): Promise<void> {
    if (tags) {
      await this.cacheManager.invalidateByTags(tags);
    }
    if (pattern) {
      await this.cacheManager.invalidatePattern(pattern);
    }
  }

  async getMetrics(): Promise<any> {
    return {
      cache: this.cacheManager.cache.size,
      loaders: this.dataLoaderFactory.loaders.size,
      timestamp: new Date().toISOString(),
    };
  }
}

export default GraphQLOptimizer;