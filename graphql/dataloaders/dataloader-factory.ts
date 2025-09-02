/**
 * DataLoader Factory for GraphQL Performance Optimization
 * Solves N+1 query problems through batching and caching
 */

import DataLoader from 'dataloader';
import { getCache } from '../../clos/api-server/cache/redis-cache';

interface DataLoaderOptions {
  cache?: boolean;
  maxBatchSize?: number;
  batchScheduleFn?: (fn: () => void) => void;
  cacheKeyFn?: (key: any) => string;
  ttl?: number; // TTL for Redis cache in seconds
}

export class DataLoaderFactory {
  private loaders: Map<string, DataLoader<any, any>> = new Map();
  private cache = getCache();

  /**
   * Create a DataLoader with Redis caching support
   */
  createLoader<K, V>(
    name: string,
    batchFn: (keys: readonly K[]) => Promise<(V | Error)[]>,
    options: DataLoaderOptions = {}
  ): DataLoader<K, V> {
    // Check if loader already exists
    const existingLoader = this.loaders.get(name);
    if (existingLoader) {
      return existingLoader;
    }

    // Wrap batch function with Redis caching
    const cachedBatchFn = async (keys: readonly K[]): Promise<(V | Error)[]> => {
      const results: (V | Error | undefined)[] = new Array(keys.length);
      const uncachedKeys: K[] = [];
      const uncachedIndexes: number[] = [];

      // Try to get from Redis cache first
      if (options.cache !== false) {
        const cacheKeys = keys.map((key, index) => {
          const cacheKey = this.getCacheKey(name, key, options.cacheKeyFn);
          return cacheKey;
        });

        const cachedValues = await this.cache.mget<V>(cacheKeys);
        
        cachedValues.forEach((value, index) => {
          if (value !== null) {
            results[index] = value;
          } else {
            uncachedKeys.push(keys[index]);
            uncachedIndexes.push(index);
          }
        });
      } else {
        // No caching, fetch all
        uncachedKeys.push(...keys);
        uncachedIndexes.push(...keys.map((_, i) => i));
      }

      // Batch fetch uncached keys
      if (uncachedKeys.length > 0) {
        try {
          const fetchedValues = await batchFn(uncachedKeys);
          
          // Store fetched values in results and cache
          for (let i = 0; i < fetchedValues.length; i++) {
            const value = fetchedValues[i];
            const resultIndex = uncachedIndexes[i];
            const key = uncachedKeys[i];
            
            results[resultIndex] = value;
            
            // Cache successful fetches
            if (options.cache !== false && !(value instanceof Error)) {
              const cacheKey = this.getCacheKey(name, key, options.cacheKeyFn);
              await this.cache.set(cacheKey, value, { ttl: options.ttl || 300 });
            }
          }
        } catch (error) {
          // Fill all uncached positions with the error
          uncachedIndexes.forEach((index) => {
            results[index] = error as Error;
          });
        }
      }

      // Ensure all positions are filled
      return results.map((result) => 
        result !== undefined ? result : new Error('Value not found')
      ) as (V | Error)[];
    };

    // Create DataLoader with optimized settings
    const loader = new DataLoader<K, V>(cachedBatchFn, {
      cache: true, // Enable in-memory caching for request lifecycle
      maxBatchSize: options.maxBatchSize || 100,
      batchScheduleFn: options.batchScheduleFn || ((fn) => process.nextTick(fn)),
      cacheKeyFn: options.cacheKeyFn,
    });

    this.loaders.set(name, loader);
    return loader;
  }

  /**
   * Create common data loaders for the application
   */
  createCommonLoaders(db: any) {
    // User loader
    const userLoader = this.createLoader<string, any>(
      'user',
      async (userIds) => {
        const query = `
          SELECT * FROM users 
          WHERE id = ANY($1::uuid[])
          ORDER BY array_position($1::uuid[], id)
        `;
        const result = await db.query(query, [userIds]);
        
        // Map results to maintain order
        const userMap = new Map(result.rows.map((row: any) => [row.id, row]));
        return userIds.map((id) => userMap.get(id) || new Error(`User ${id} not found`));
      },
      { ttl: 3600 } // Cache users for 1 hour
    );

    // Document loader
    const documentLoader = this.createLoader<string, any>(
      'document',
      async (docIds) => {
        const query = `
          SELECT * FROM documents 
          WHERE id = ANY($1::uuid[])
          ORDER BY array_position($1::uuid[], id)
        `;
        const result = await db.query(query, [docIds]);
        
        const docMap = new Map(result.rows.map((row: any) => [row.id, row]));
        return docIds.map((id) => docMap.get(id) || new Error(`Document ${id} not found`));
      },
      { ttl: 600 } // Cache documents for 10 minutes
    );

    // Comments loader (one-to-many relationship)
    const commentsByDocLoader = this.createLoader<string, any[]>(
      'commentsByDoc',
      async (docIds) => {
        const query = `
          SELECT * FROM comments 
          WHERE document_id = ANY($1::uuid[])
          ORDER BY created_at DESC
        `;
        const result = await db.query(query, [docIds]);
        
        // Group comments by document
        const commentGroups = new Map<string, any[]>();
        docIds.forEach((id) => commentGroups.set(id, []));
        
        result.rows.forEach((comment: any) => {
          const group = commentGroups.get(comment.document_id);
          if (group) group.push(comment);
        });
        
        return docIds.map((id) => commentGroups.get(id) || []);
      },
      { ttl: 300 } // Cache comments for 5 minutes
    );

    // Tags loader (many-to-many relationship)
    const tagsByDocLoader = this.createLoader<string, any[]>(
      'tagsByDoc',
      async (docIds) => {
        const query = `
          SELECT dt.document_id, t.*
          FROM document_tags dt
          JOIN tags t ON dt.tag_id = t.id
          WHERE dt.document_id = ANY($1::uuid[])
        `;
        const result = await db.query(query, [docIds]);
        
        const tagGroups = new Map<string, any[]>();
        docIds.forEach((id) => tagGroups.set(id, []));
        
        result.rows.forEach((row: any) => {
          const group = tagGroups.get(row.document_id);
          if (group) group.push(row);
        });
        
        return docIds.map((id) => tagGroups.get(id) || []);
      },
      { ttl: 600 } // Cache tags for 10 minutes
    );

    // Aggregation loader (counts, sums, etc.)
    const statsLoader = this.createLoader<string, any>(
      'stats',
      async (entityIds) => {
        const query = `
          SELECT 
            entity_id,
            COUNT(*) as total_views,
            AVG(rating) as avg_rating,
            MAX(updated_at) as last_activity
          FROM entity_stats
          WHERE entity_id = ANY($1::uuid[])
          GROUP BY entity_id
        `;
        const result = await db.query(query, [entityIds]);
        
        const statsMap = new Map(result.rows.map((row: any) => [row.entity_id, row]));
        return entityIds.map((id) => statsMap.get(id) || {
          entity_id: id,
          total_views: 0,
          avg_rating: null,
          last_activity: null
        });
      },
      { ttl: 60 } // Cache stats for 1 minute
    );

    return {
      userLoader,
      documentLoader,
      commentsByDocLoader,
      tagsByDocLoader,
      statsLoader,
    };
  }

  /**
   * Clear all loaders (useful for tests or cache invalidation)
   */
  clearAll(): void {
    this.loaders.forEach((loader) => loader.clearAll());
  }

  /**
   * Clear specific loader
   */
  clearLoader(name: string): void {
    const loader = this.loaders.get(name);
    if (loader) {
      loader.clearAll();
    }
  }

  /**
   * Prime loader cache with known data
   */
  prime<K, V>(name: string, key: K, value: V): void {
    const loader = this.loaders.get(name) as DataLoader<K, V>;
    if (loader) {
      loader.prime(key, value);
    }
  }

  /**
   * Get loader by name
   */
  getLoader<K, V>(name: string): DataLoader<K, V> | undefined {
    return this.loaders.get(name) as DataLoader<K, V>;
  }

  private getCacheKey(
    loaderName: string,
    key: any,
    customKeyFn?: (key: any) => string
  ): string {
    const keyStr = customKeyFn ? customKeyFn(key) : JSON.stringify(key);
    return `loader:${loaderName}:${keyStr}`;
  }
}

// Context creation for GraphQL resolvers
export interface DataLoaderContext {
  loaders: ReturnType<DataLoaderFactory['createCommonLoaders']>;
  factory: DataLoaderFactory;
}

export function createDataLoaderContext(db: any): DataLoaderContext {
  const factory = new DataLoaderFactory();
  const loaders = factory.createCommonLoaders(db);
  
  return {
    loaders,
    factory,
  };
}

// GraphQL resolver example using DataLoaders
export const resolvers = {
  Query: {
    user: async (_: any, { id }: { id: string }, context: DataLoaderContext) => {
      return context.loaders.userLoader.load(id);
    },
    
    users: async (_: any, { ids }: { ids: string[] }, context: DataLoaderContext) => {
      return context.loaders.userLoader.loadMany(ids);
    },
    
    document: async (_: any, { id }: { id: string }, context: DataLoaderContext) => {
      return context.loaders.documentLoader.load(id);
    },
  },
  
  Document: {
    author: async (document: any, _: any, context: DataLoaderContext) => {
      return context.loaders.userLoader.load(document.author_id);
    },
    
    comments: async (document: any, _: any, context: DataLoaderContext) => {
      return context.loaders.commentsByDocLoader.load(document.id);
    },
    
    tags: async (document: any, _: any, context: DataLoaderContext) => {
      return context.loaders.tagsByDocLoader.load(document.id);
    },
    
    stats: async (document: any, _: any, context: DataLoaderContext) => {
      return context.loaders.statsLoader.load(document.id);
    },
  },
  
  Comment: {
    author: async (comment: any, _: any, context: DataLoaderContext) => {
      return context.loaders.userLoader.load(comment.author_id);
    },
  },
};