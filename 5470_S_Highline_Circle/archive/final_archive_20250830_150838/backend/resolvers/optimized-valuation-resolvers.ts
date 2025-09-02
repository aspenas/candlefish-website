/**
 * Optimized GraphQL Resolvers with Performance Enhancements
 * 
 * Key optimizations:
 * - Aggressive DataLoader batching
 * - Query result caching with Redis
 * - Parallel execution where possible
 * - Optimized database queries
 * - Request deduplication
 */

import DataLoader from 'dataloader';
import { PubSub } from 'graphql-subscriptions';
import { withFilter } from 'graphql-subscriptions';
import Redis from 'ioredis';
import pLimit from 'p-limit';
import LRU from 'lru-cache';
import { Context } from '../types/context';

// Initialize Redis client with optimized settings
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

// In-memory LRU cache for micro-caching
const memoryCache = new LRU<string, any>({
  max: 10000,
  ttl: 1000 * 60, // 1 minute
  updateAgeOnGet: true,
  updateAgeOnHas: true,
});

// Limit concurrent operations
const concurrencyLimit = pLimit(100);

const pubsub = new PubSub();

// =====================================================
// OPTIMIZED DATALOADER FACTORY
// =====================================================

export function createOptimizedDataLoaders(context: Context) {
  // Batch size configuration
  const BATCH_SIZE = 100;
  const CACHE_TTL = 300; // 5 minutes in seconds

  return {
    // Optimized valuations loader with Redis caching
    valuationsByItemId: new DataLoader<string, any[]>(
      async (itemIds) => {
        // Check Redis cache first
        const cacheKeys = itemIds.map(id => `valuation:items:${id}`);
        const cachedResults = await redis.mget(...cacheKeys);
        
        const uncachedIds: string[] = [];
        const results = new Map<string, any[]>();
        
        // Process cached results
        cachedResults.forEach((cached, index) => {
          if (cached) {
            results.set(itemIds[index], JSON.parse(cached));
          } else {
            uncachedIds.push(itemIds[index]);
          }
        });
        
        // Fetch uncached data
        if (uncachedIds.length > 0) {
          const valuations = await context.db.query(`
            SELECT * FROM item_valuations 
            WHERE item_id = ANY($1)
            ORDER BY created_at DESC
          `, [uncachedIds]);
          
          // Group by item_id and cache
          const pipeline = redis.pipeline();
          
          uncachedIds.forEach(itemId => {
            const itemValuations = valuations.filter(v => v.item_id === itemId);
            results.set(itemId, itemValuations);
            
            // Add to Redis cache
            pipeline.setex(
              `valuation:items:${itemId}`,
              CACHE_TTL,
              JSON.stringify(itemValuations)
            );
          });
          
          // Execute pipeline
          await pipeline.exec();
        }
        
        // Return in original order
        return itemIds.map(id => results.get(id) || []);
      },
      {
        batchScheduleFn: (callback) => setTimeout(callback, 10), // 10ms batching window
        maxBatchSize: BATCH_SIZE,
        cache: true,
      }
    ),

    // Current valuations with memory cache
    currentValuationsByItemId: new DataLoader<string, any>(
      async (itemIds) => {
        // Check memory cache first
        const memCached = itemIds.map(id => {
          const key = `current:${id}`;
          return memoryCache.get(key);
        });
        
        const uncachedIds = itemIds.filter((_, i) => !memCached[i]);
        
        if (uncachedIds.length === 0) {
          return memCached;
        }
        
        // Batch fetch from database
        const currentValuations = await context.db.query(`
          SELECT * FROM current_valuations 
          WHERE item_id = ANY($1)
        `, [uncachedIds]);
        
        const resultMap = new Map();
        currentValuations.forEach(cv => {
          resultMap.set(cv.item_id, cv);
          // Add to memory cache
          memoryCache.set(`current:${cv.item_id}`, cv);
        });
        
        return itemIds.map(id => {
          const cached = memoryCache.get(`current:${id}`);
          if (cached) return cached;
          return resultMap.get(id) || null;
        });
      },
      {
        batchScheduleFn: (callback) => setTimeout(callback, 5),
        maxBatchSize: BATCH_SIZE * 2, // Larger batches for simple queries
      }
    ),

    // Parallel market comparisons loader
    marketComparisonsByItemId: new DataLoader<string, any[]>(
      async (itemIds) => {
        // Use parallel execution for multiple sources
        const sources = ['ebay', 'facebook', 'chairish'];
        
        const comparisonsPromises = sources.map(source =>
          concurrencyLimit(() =>
            context.db.query(`
              SELECT * FROM market_comparisons 
              WHERE item_id = ANY($1) AND source = $2
              ORDER BY similarity_score DESC NULLS LAST
              LIMIT 10
            `, [itemIds, source])
          )
        );
        
        const allComparisons = await Promise.all(comparisonsPromises);
        const flatComparisons = allComparisons.flat();
        
        // Group by item_id
        return itemIds.map(itemId =>
          flatComparisons.filter(mc => mc.item_id === itemId)
        );
      },
      {
        batchScheduleFn: (callback) => setTimeout(callback, 20),
        maxBatchSize: 50, // Smaller batches for complex queries
      }
    ),

    // Optimized price history with pagination
    priceHistoryByItemId: new DataLoader<string, any[]>(
      async (itemIds) => {
        // Use window function for efficient pagination
        const history = await context.db.query(`
          WITH ranked_history AS (
            SELECT 
              *,
              ROW_NUMBER() OVER (PARTITION BY item_id ORDER BY effective_date DESC) as rn
            FROM price_history
            WHERE item_id = ANY($1)
          )
          SELECT * FROM ranked_history
          WHERE rn <= 50
          ORDER BY item_id, effective_date DESC
        `, [itemIds]);
        
        return itemIds.map(itemId =>
          history.filter(ph => ph.item_id === itemId)
        );
      },
      {
        maxBatchSize: BATCH_SIZE,
      }
    ),

    // Aggregated room statistics loader
    roomStatsByRoomId: new DataLoader<string, any>(
      async (roomIds) => {
        const stats = await context.db.query(`
          SELECT 
            r.id as room_id,
            COUNT(DISTINCT i.id) as item_count,
            COUNT(DISTINCT cv.item_id) as items_with_valuations,
            COALESCE(SUM(i.purchase_price), 0) as total_purchase_value,
            COALESCE(SUM(cv.estimated_value), 0) as total_estimated_value,
            AVG(cv.confidence_score) as avg_confidence,
            MAX(cv.valuation_date) as last_valuation_date
          FROM rooms r
          LEFT JOIN items i ON r.id = i.room_id
          LEFT JOIN current_valuations cv ON i.id = cv.item_id
          WHERE r.id = ANY($1)
          GROUP BY r.id
        `, [roomIds]);
        
        const statsMap = new Map();
        stats.forEach(s => statsMap.set(s.room_id, s));
        
        return roomIds.map(id => statsMap.get(id) || null);
      },
      {
        maxBatchSize: 20, // Room queries are heavier
      }
    ),
  };
}

// =====================================================
// OPTIMIZED RESOLVER IMPLEMENTATIONS
// =====================================================

export const optimizedResolvers = {
  Query: {
    // Get valuation with parallel data fetching
    async getValuation(parent, { itemId }, context) {
      const loaders = context.loaders;
      
      // Parallel fetch all related data
      const [currentValuation, history, comparisons] = await Promise.all([
        loaders.currentValuationsByItemId.load(itemId),
        loaders.priceHistoryByItemId.load(itemId),
        loaders.marketComparisonsByItemId.load(itemId),
      ]);
      
      return {
        itemId,
        currentValuation,
        priceHistory: history,
        marketComparisons: comparisons,
        confidence: currentValuation?.confidence_score || 0,
        lastUpdated: currentValuation?.valuation_date || new Date(),
      };
    },

    // Optimized pricing insights with caching
    async getPricingInsights(parent, args, context) {
      // Check Redis cache first
      const cacheKey = 'pricing:insights:dashboard';
      const cached = await redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }
      
      // Execute optimized query with CTEs
      const insights = await context.db.query(`
        WITH RECURSIVE category_stats AS (
          SELECT 
            category,
            COUNT(*) as item_count,
            AVG(cv.estimated_value) as avg_value,
            SUM(cv.estimated_value) as total_value
          FROM items i
          JOIN current_valuations cv ON i.id = cv.item_id
          GROUP BY category
        ),
        top_performers AS (
          SELECT 
            cv.*,
            RANK() OVER (ORDER BY value_change_percent DESC) as rank
          FROM current_valuations cv
          WHERE value_change_percent IS NOT NULL
          LIMIT 20
        )
        SELECT json_build_object(
          'categories', (SELECT json_agg(cs.*) FROM category_stats cs),
          'topPerformers', (SELECT json_agg(tp.*) FROM top_performers tp WHERE rank <= 10),
          'totalValue', (SELECT SUM(estimated_value) FROM current_valuations),
          'totalItems', (SELECT COUNT(*) FROM items),
          'avgConfidence', (SELECT AVG(confidence_score) FROM current_valuations)
        ) as data
      `);
      
      const result = insights[0].data;
      
      // Cache for 5 minutes
      await redis.setex(cacheKey, 300, JSON.stringify(result));
      
      return result;
    },

    // Batch valuation requests
    async getMultipleValuations(parent, { itemIds }, context) {
      const loaders = context.loaders;
      
      // Batch load all valuations
      const valuations = await Promise.all(
        itemIds.map(id => loaders.currentValuationsByItemId.load(id))
      );
      
      return valuations.filter(v => v !== null);
    },

    // Search with optimized full-text search
    async searchItems(parent, { query, filters }, context) {
      const cacheKey = `search:${query}:${JSON.stringify(filters)}`;
      const cached = memoryCache.get(cacheKey);
      
      if (cached) {
        return cached;
      }
      
      // Use PostgreSQL full-text search with GIN index
      const results = await context.db.query(`
        SELECT 
          i.*,
          cv.estimated_value,
          cv.confidence_score,
          ts_rank(to_tsvector('english', i.name || ' ' || COALESCE(i.description, '')), 
                  plainto_tsquery('english', $1)) as relevance
        FROM items i
        LEFT JOIN current_valuations cv ON i.id = cv.item_id
        WHERE to_tsvector('english', i.name || ' ' || COALESCE(i.description, '')) 
              @@ plainto_tsquery('english', $1)
          ${filters.category ? 'AND i.category = $2' : ''}
          ${filters.minPrice ? 'AND cv.estimated_value >= $3' : ''}
          ${filters.maxPrice ? 'AND cv.estimated_value <= $4' : ''}
        ORDER BY relevance DESC
        LIMIT 50
      `, [query, filters.category, filters.minPrice, filters.maxPrice].filter(Boolean));
      
      memoryCache.set(cacheKey, results);
      return results;
    },
  },

  Mutation: {
    // Optimized valuation creation with event streaming
    async createValuation(parent, { input }, context) {
      const { itemId, method, value, confidence } = input;
      
      // Start transaction
      const tx = await context.db.beginTransaction();
      
      try {
        // Create valuation
        const valuation = await tx.query(`
          INSERT INTO item_valuations 
          (id, item_id, valuation_method, estimated_value, confidence_score, created_at)
          VALUES ($1, $2, $3, $4, $5, NOW())
          RETURNING *
        `, [generateId(), itemId, method, value, confidence]);
        
        // Update current valuation view (materialized)
        await tx.query(`
          REFRESH MATERIALIZED VIEW CONCURRENTLY current_valuations
        `);
        
        await tx.commit();
        
        // Invalidate caches
        const pipeline = redis.pipeline();
        pipeline.del(`valuation:items:${itemId}`);
        pipeline.del(`current:${itemId}`);
        pipeline.del('pricing:insights:dashboard');
        await pipeline.exec();
        
        // Clear memory cache
        memoryCache.delete(`current:${itemId}`);
        
        // Publish event
        pubsub.publish('VALUATION_CREATED', {
          valuationCreated: valuation[0],
        });
        
        return valuation[0];
      } catch (error) {
        await tx.rollback();
        throw error;
      }
    },

    // Bulk valuation updates
    async bulkUpdateValuations(parent, { updates }, context) {
      // Process in parallel batches
      const batchSize = 10;
      const results = [];
      
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);
        
        const batchResults = await Promise.all(
          batch.map(update =>
            concurrencyLimit(() =>
              this.createValuation(parent, { input: update }, context)
            )
          )
        );
        
        results.push(...batchResults);
      }
      
      return results;
    },
  },

  Subscription: {
    // Optimized subscription with filtering
    valuationCreated: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['VALUATION_CREATED']),
        (payload, variables) => {
          if (!variables.itemId) return true;
          return payload.valuationCreated.item_id === variables.itemId;
        }
      ),
    },

    // Batch updates subscription
    pricingInsightsUpdated: {
      subscribe: () => pubsub.asyncIterator(['INSIGHTS_UPDATED']),
    },
  },

  // Field resolvers with caching
  CurrentValuation: {
    async item(parent, args, context) {
      // Use DataLoader for batch loading
      return context.loaders.itemsByIdLoader.load(parent.item_id);
    },
    
    async priceHistory(parent, args, context) {
      return context.loaders.priceHistoryByItemId.load(parent.item_id);
    },
    
    async marketComparisons(parent, args, context) {
      return context.loaders.marketComparisonsByItemId.load(parent.item_id);
    },
  },
};

// Utility function for ID generation
function generateId(): string {
  return require('uuid').v4();
}

// Export optimized resolvers
export default optimizedResolvers;