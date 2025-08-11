/**
 * Optimized GraphQL with DataLoader for N+1 Query Prevention
 * Target: <100ms response time for complex queries
 */

import DataLoader from 'dataloader';
import { GraphQLSchema, GraphQLObjectType, GraphQLString, GraphQLList, GraphQLInt } from 'graphql';
import { PubSub } from 'graphql-subscriptions';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import Redis from 'ioredis';
import { LRUCache } from 'lru-cache';
import { performance } from 'perf_hooks';
import crypto from 'crypto';

// Performance configuration
const PERF_CONFIG = {
  DATALOADER_BATCH_SIZE: 100,
  DATALOADER_CACHE_TTL: 60000, // 1 minute
  QUERY_COMPLEXITY_LIMIT: 1000,
  QUERY_DEPTH_LIMIT: 10,
  RESULT_CACHE_TTL: 30000, // 30 seconds
  CACHE_KEY_PREFIX: 'gql:',
};

// Database connection pool
class OptimizedDBPool {
  private pool: any;
  private queryCache: LRUCache<string, any>;

  constructor() {
    // Initialize connection pool
    const { Pool } = require('pg');
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'collaboration',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      max: 20, // Maximum pool size
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      statement_timeout: 5000, // 5 second query timeout
    });

    // Query result cache
    this.queryCache = new LRUCache({
      max: 1000,
      ttl: PERF_CONFIG.RESULT_CACHE_TTL,
    });
  }

  async query(sql: string, params: any[] = []): Promise<any> {
    const cacheKey = this.getCacheKey(sql, params);

    // Check cache first
    const cached = this.queryCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const startTime = performance.now();
    try {
      const result = await this.pool.query(sql, params);

      // Cache successful results
      this.queryCache.set(cacheKey, result.rows);

      const elapsed = performance.now() - startTime;
      if (elapsed > 100) {
        console.warn(`Slow query (${elapsed}ms): ${sql.substring(0, 100)}`);
      }

      return result.rows;
    } catch (error) {
      console.error('Query error:', error);
      throw error;
    }
  }

  private getCacheKey(sql: string, params: any[]): string {
    const hash = crypto.createHash('md5');
    hash.update(sql);
    hash.update(JSON.stringify(params));
    return `query:${hash.digest('hex')}`;
  }

  async batchQuery(sql: string, paramSets: any[][]): Promise<any[]> {
    // Execute multiple queries in a single round trip
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const results = [];
      for (const params of paramSets) {
        const result = await client.query(sql, params);
        results.push(result.rows);
      }

      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

// Optimized DataLoaders
export class OptimizedDataLoaders {
  private db: OptimizedDBPool;
  private loaders: Map<string, DataLoader<any, any>>;

  constructor() {
    this.db = new OptimizedDBPool();
    this.loaders = new Map();
    this.initializeLoaders();
  }

  private initializeLoaders(): void {
    // User loader with batching
    this.loaders.set('user', new DataLoader(
      async (ids: readonly string[]) => {
        const query = `
          SELECT * FROM users
          WHERE id = ANY($1::uuid[])
          ORDER BY array_position($1::uuid[], id)
        `;
        const users = await this.db.query(query, [ids]);

        // Map results back to input order
        const userMap = new Map(users.map((u: any) => [u.id, u]));
        return ids.map(id => userMap.get(id) || null);
      },
      {
        maxBatchSize: PERF_CONFIG.DATALOADER_BATCH_SIZE,
        cache: true,
        cacheMap: new LRUCache({
          max: 1000,
          ttl: PERF_CONFIG.DATALOADER_CACHE_TTL,
        }),
      }
    ));

    // Document loader with field selection
    this.loaders.set('document', new DataLoader(
      async (requests: readonly any[]) => {
        // Extract unique IDs and fields
        const ids = requests.map(r => r.id);
        const fields = [...new Set(requests.flatMap(r => r.fields || ['*']))];

        const query = `
          SELECT ${fields.join(', ')}
          FROM documents
          WHERE id = ANY($1::uuid[])
          AND deleted_at IS NULL
          ORDER BY array_position($1::uuid[], id)
        `;

        const docs = await this.db.query(query, [ids]);
        const docMap = new Map(docs.map((d: any) => [d.id, d]));
        return ids.map(id => docMap.get(id) || null);
      },
      {
        maxBatchSize: PERF_CONFIG.DATALOADER_BATCH_SIZE,
        cacheKeyFn: (key: any) => `${key.id}:${(key.fields || []).sort().join(',')}`,
      }
    ));

    // Comment loader with pagination support
    this.loaders.set('comments', new DataLoader(
      async (requests: readonly any[]) => {
        // Group by document ID for efficient querying
        const docGroups = new Map<string, any[]>();

        for (const req of requests) {
          if (!docGroups.has(req.documentId)) {
            docGroups.set(req.documentId, []);
          }
          docGroups.get(req.documentId)!.push(req);
        }

        const results = new Map<string, any[]>();

        // Batch query for each document
        for (const [docId, reqs] of docGroups) {
          const limit = Math.max(...reqs.map((r: any) => r.limit || 20));
          const offset = Math.min(...reqs.map((r: any) => r.offset || 0));

          const query = `
            SELECT c.*, u.name as author_name, u.avatar as author_avatar
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.document_id = $1
            AND c.deleted_at IS NULL
            ORDER BY c.created_at DESC
            LIMIT $2 OFFSET $3
          `;

          const comments = await this.db.query(query, [docId, limit, offset]);
          results.set(docId, comments);
        }

        // Map results back to requests
        return requests.map(req => results.get(req.documentId) || []);
      },
      {
        maxBatchSize: 50,
        cacheKeyFn: (key: any) => `${key.documentId}:${key.limit}:${key.offset}`,
      }
    ));

    // Presence loader with Redis integration
    this.loaders.set('presence', new DataLoader(
      async (roomIds: readonly string[]) => {
        const redis = new Redis();
        const pipeline = redis.pipeline();

        for (const roomId of roomIds) {
          pipeline.hgetall(`presence:${roomId}`);
        }

        const results = await pipeline.exec();
        redis.disconnect();

        return results?.map(r => r?.[1] || {}) || [];
      },
      {
        maxBatchSize: 100,
        cache: true,
        batch: true,
      }
    ));

    // Activity feed loader with aggregation
    this.loaders.set('activity', new DataLoader(
      async (userIds: readonly string[]) => {
        const query = `
          WITH recent_activity AS (
            SELECT
              user_id,
              json_agg(
                json_build_object(
                  'id', id,
                  'type', activity_type,
                  'document_id', document_id,
                  'created_at', created_at,
                  'metadata', metadata
                ) ORDER BY created_at DESC
              ) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as activities
            FROM activity_log
            WHERE user_id = ANY($1::uuid[])
            GROUP BY user_id
          )
          SELECT * FROM recent_activity
        `;

        const activities = await this.db.query(query, [userIds]);
        const activityMap = new Map(activities.map((a: any) => [a.user_id, a.activities]));
        return userIds.map(id => activityMap.get(id) || []);
      },
      {
        maxBatchSize: 50,
      }
    ));
  }

  getLoader(name: string): DataLoader<any, any> {
    const loader = this.loaders.get(name);
    if (!loader) {
      throw new Error(`Loader ${name} not found`);
    }
    return loader;
  }

  // Clear all caches
  clearAll(): void {
    for (const loader of this.loaders.values()) {
      loader.clearAll();
    }
  }

  // Prime cache with data
  prime(loaderName: string, key: any, value: any): void {
    const loader = this.getLoader(loaderName);
    loader.prime(key, value);
  }
}

// GraphQL Context with optimizations
export interface GraphQLContext {
  loaders: OptimizedDataLoaders;
  pubsub: RedisPubSub;
  userId?: string;
  requestId: string;
  metrics: RequestMetrics;
}

class RequestMetrics {
  private queries: Map<string, number> = new Map();
  private startTime: number;

  constructor() {
    this.startTime = performance.now();
  }

  recordQuery(name: string, duration: number): void {
    const current = this.queries.get(name) || 0;
    this.queries.set(name, current + duration);
  }

  getMetrics(): any {
    return {
      totalDuration: performance.now() - this.startTime,
      queries: Object.fromEntries(this.queries),
    };
  }
}

// Optimized GraphQL Schema
export function createOptimizedSchema(): GraphQLSchema {
  // Initialize Redis PubSub for subscriptions
  const pubsub = new RedisPubSub({
    publisher: new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    }),
    subscriber: new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    }),
  });

  // Define types
  const UserType = new GraphQLObjectType({
    name: 'User',
    fields: () => ({
      id: { type: GraphQLString },
      name: { type: GraphQLString },
      email: { type: GraphQLString },
      avatar: { type: GraphQLString },
      documents: {
        type: new GraphQLList(DocumentType),
        resolve: async (user, args, context: GraphQLContext) => {
          const startTime = performance.now();
          const docs = await context.loaders.getLoader('document').loadMany(
            user.document_ids || []
          );
          context.metrics.recordQuery('user.documents', performance.now() - startTime);
          return docs;
        },
      },
      activity: {
        type: new GraphQLList(ActivityType),
        resolve: async (user, args, context: GraphQLContext) => {
          return context.loaders.getLoader('activity').load(user.id);
        },
      },
    }),
  });

  const DocumentType = new GraphQLObjectType({
    name: 'Document',
    fields: () => ({
      id: { type: GraphQLString },
      title: { type: GraphQLString },
      content: { type: GraphQLString },
      created_at: { type: GraphQLString },
      updated_at: { type: GraphQLString },
      author: {
        type: UserType,
        resolve: async (doc, args, context: GraphQLContext) => {
          return context.loaders.getLoader('user').load(doc.author_id);
        },
      },
      collaborators: {
        type: new GraphQLList(UserType),
        resolve: async (doc, args, context: GraphQLContext) => {
          if (!doc.collaborator_ids) return [];
          return context.loaders.getLoader('user').loadMany(doc.collaborator_ids);
        },
      },
      comments: {
        type: new GraphQLList(CommentType),
        args: {
          limit: { type: GraphQLInt, defaultValue: 20 },
          offset: { type: GraphQLInt, defaultValue: 0 },
        },
        resolve: async (doc, args, context: GraphQLContext) => {
          return context.loaders.getLoader('comments').load({
            documentId: doc.id,
            limit: args.limit,
            offset: args.offset,
          });
        },
      },
      presence: {
        type: PresenceType,
        resolve: async (doc, args, context: GraphQLContext) => {
          return context.loaders.getLoader('presence').load(doc.id);
        },
      },
    }),
  });

  const CommentType = new GraphQLObjectType({
    name: 'Comment',
    fields: () => ({
      id: { type: GraphQLString },
      content: { type: GraphQLString },
      created_at: { type: GraphQLString },
      author_name: { type: GraphQLString },
      author_avatar: { type: GraphQLString },
    }),
  });

  const ActivityType = new GraphQLObjectType({
    name: 'Activity',
    fields: () => ({
      id: { type: GraphQLString },
      type: { type: GraphQLString },
      document_id: { type: GraphQLString },
      created_at: { type: GraphQLString },
      metadata: { type: GraphQLString },
    }),
  });

  const PresenceType = new GraphQLObjectType({
    name: 'Presence',
    fields: () => ({
      online_users: { type: new GraphQLList(GraphQLString) },
      cursor_positions: { type: GraphQLString },
    }),
  });

  // Root Query with field-level caching
  const RootQuery = new GraphQLObjectType({
    name: 'Query',
    fields: {
      user: {
        type: UserType,
        args: {
          id: { type: GraphQLString },
        },
        resolve: async (parent, args, context: GraphQLContext) => {
          return context.loaders.getLoader('user').load(args.id);
        },
      },
      document: {
        type: DocumentType,
        args: {
          id: { type: GraphQLString },
          fields: { type: new GraphQLList(GraphQLString) },
        },
        resolve: async (parent, args, context: GraphQLContext) => {
          return context.loaders.getLoader('document').load({
            id: args.id,
            fields: args.fields,
          });
        },
      },
      documents: {
        type: new GraphQLList(DocumentType),
        args: {
          limit: { type: GraphQLInt, defaultValue: 20 },
          offset: { type: GraphQLInt, defaultValue: 0 },
        },
        resolve: async (parent, args, context: GraphQLContext) => {
          const db = new OptimizedDBPool();
          const query = `
            SELECT * FROM documents
            WHERE deleted_at IS NULL
            ORDER BY updated_at DESC
            LIMIT $1 OFFSET $2
          `;
          return db.query(query, [args.limit, args.offset]);
        },
      },
    },
  });

  // Optimized Subscriptions
  const RootSubscription = new GraphQLObjectType({
    name: 'Subscription',
    fields: {
      documentUpdated: {
        type: DocumentType,
        args: {
          documentId: { type: GraphQLString },
        },
        subscribe: (parent, args, context: GraphQLContext) => {
          return context.pubsub.asyncIterator(`document.${args.documentId}`);
        },
      },
      presenceUpdated: {
        type: PresenceType,
        args: {
          roomId: { type: GraphQLString },
        },
        subscribe: (parent, args, context: GraphQLContext) => {
          return context.pubsub.asyncIterator(`presence.${args.roomId}`);
        },
      },
    },
  });

  return new GraphQLSchema({
    query: RootQuery,
    subscription: RootSubscription,
  });
}

// Query complexity analyzer
export class QueryComplexityAnalyzer {
  static calculate(query: any, variables: any = {}): number {
    let complexity = 0;

    const visit = (node: any, multiplier: number = 1) => {
      if (node.kind === 'Field') {
        // Base cost for field
        complexity += multiplier;

        // Additional cost for list fields
        if (node.name.value.endsWith('s')) {
          const limit = this.getArgValue(node, 'limit', variables) || 20;
          complexity += limit * 0.1;
        }

        // Recursively visit selections
        if (node.selectionSet) {
          node.selectionSet.selections.forEach((selection: any) => {
            visit(selection, multiplier);
          });
        }
      } else if (node.selectionSet) {
        node.selectionSet.selections.forEach((selection: any) => {
          visit(selection, multiplier);
        });
      }
    };

    visit(query);
    return complexity;
  }

  private static getArgValue(node: any, argName: string, variables: any): any {
    const arg = node.arguments?.find((a: any) => a.name.value === argName);
    if (!arg) return null;

    if (arg.value.kind === 'Variable') {
      return variables[arg.value.name.value];
    }
    return arg.value.value;
  }
}

// Export context factory
export function createGraphQLContext(req: any): GraphQLContext {
  return {
    loaders: new OptimizedDataLoaders(),
    pubsub: new RedisPubSub({
      publisher: new Redis(),
      subscriber: new Redis(),
    }),
    userId: req.user?.id,
    requestId: crypto.randomUUID(),
    metrics: new RequestMetrics(),
  };
}
