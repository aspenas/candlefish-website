/**
 * GraphQL Resolvers for Item Valuation and Pricing System
 * 
 * Implements comprehensive valuation operations with:
 * - DataLoader patterns for N+1 query prevention
 * - Real-time subscription support
 * - Complex aggregation queries
 * - Federation support for inventory integration
 */

import { 
  Resolvers, 
  ValuationMethod, 
  MarketSource, 
  ValuationStatus,
  TrendDirection,
  SortDirection 
} from '../generated/graphql';
import DataLoader from 'dataloader';
import { PubSub } from 'graphql-subscriptions';
import { withFilter } from 'graphql-subscriptions';
import { Context } from '../types/context';
import { ValidationError, NotFoundError } from '../utils/errors';
import { 
  ItemValuation, 
  MarketComparison, 
  PriceHistory, 
  ValuationRequest,
  DepreciationModel,
  MarketTrend,
  CurrentValuation,
  RoomValuationSummary,
  MarketInsight,
  PricingInsights
} from '../models';

const pubsub = new PubSub();

// =====================================================
// DATALOADER FACTORY FUNCTIONS
// =====================================================

/**
 * Creates DataLoaders for batch loading valuation data
 * Prevents N+1 queries by batching database operations
 */
export function createValuationDataLoaders(context: Context) {
  return {
    // Item valuations by item ID
    valuationsByItemId: new DataLoader<string, ItemValuation[]>(async (itemIds) => {
      const valuations = await context.db.query(`
        SELECT * FROM item_valuations 
        WHERE item_id = ANY($1)
        ORDER BY created_at DESC
      `, [itemIds]);
      
      return itemIds.map(itemId => 
        valuations.filter(v => v.item_id === itemId)
      );
    }),

    // Current valuations by item ID
    currentValuationsByItemId: new DataLoader<string, CurrentValuation | null>(async (itemIds) => {
      const currentValuations = await context.db.query(`
        SELECT * FROM current_valuations 
        WHERE item_id = ANY($1)
      `, [itemIds]);
      
      return itemIds.map(itemId => 
        currentValuations.find(cv => cv.item_id === itemId) || null
      );
    }),

    // Market comparisons by item ID
    marketComparisonsByItemId: new DataLoader<string, MarketComparison[]>(async (itemIds) => {
      const comparisons = await context.db.query(`
        SELECT * FROM market_comparisons 
        WHERE item_id = ANY($1)
        ORDER BY similarity_score DESC NULLS LAST, created_at DESC
      `, [itemIds]);
      
      return itemIds.map(itemId => 
        comparisons.filter(mc => mc.item_id === itemId)
      );
    }),

    // Price history by item ID
    priceHistoryByItemId: new DataLoader<string, PriceHistory[]>(async (itemIds) => {
      const history = await context.db.query(`
        SELECT * FROM price_history 
        WHERE item_id = ANY($1)
        ORDER BY effective_date DESC
      `, [itemIds]);
      
      return itemIds.map(itemId => 
        history.filter(ph => ph.item_id === itemId)
      );
    }),

    // Valuation requests by item ID
    valuationRequestsByItemId: new DataLoader<string, ValuationRequest[]>(async (itemIds) => {
      const requests = await context.db.query(`
        SELECT * FROM valuation_requests 
        WHERE item_id = ANY($1)
        ORDER BY created_at DESC
      `, [itemIds]);
      
      return itemIds.map(itemId => 
        requests.filter(vr => vr.item_id === itemId)
      );
    }),

    // Single valuations by ID
    valuationsById: new DataLoader<string, ItemValuation | null>(async (ids) => {
      const valuations = await context.db.query(`
        SELECT * FROM item_valuations 
        WHERE id = ANY($1)
      `, [ids]);
      
      return ids.map(id => 
        valuations.find(v => v.id === id) || null
      );
    }),

    // Items by ID (for federation)
    itemsById: new DataLoader<string, any>(async (itemIds) => {
      const items = await context.db.query(`
        SELECT * FROM items WHERE id = ANY($1)
      `, [itemIds]);
      
      return itemIds.map(id => 
        items.find(item => item.id === id) || null
      );
    }),

    // Rooms by ID (for federation)
    roomsById: new DataLoader<string, any>(async (roomIds) => {
      const rooms = await context.db.query(`
        SELECT * FROM rooms WHERE id = ANY($1)
      `, [roomIds]);
      
      return roomIds.map(id => 
        rooms.find(room => room.id === id) || null
      );
    }),

    // Depreciation models by category and brand
    depreciationModels: new DataLoader<string, DepreciationModel | null>(async (keys) => {
      // Keys format: "category:brand" or "category:" for category-only
      const models = await context.db.query(`
        SELECT * FROM depreciation_models 
        WHERE (category, COALESCE(brand, '')) = ANY($1)
      `, [keys.map(key => {
        const [category, brand] = key.split(':');
        return [category, brand || ''];
      })]);
      
      return keys.map(key => 
        models.find(dm => {
          const [category, brand] = key.split(':');
          return dm.category === category && 
                 (dm.brand === (brand || null));
        }) || null
      );
    })
  };
}

// =====================================================
// QUERY RESOLVERS
// =====================================================

const Query: Resolvers['Query'] = {
  // Single item queries
  itemValuation: async (_, { id }, context) => {
    return context.loaders.valuationsById.load(id);
  },

  currentValuation: async (_, { itemId }, context) => {
    return context.loaders.currentValuationsByItemId.load(itemId);
  },

  itemPricingHistory: async (_, { itemId, limit = 50 }, context) => {
    const history = await context.loaders.priceHistoryByItemId.load(itemId);
    return history.slice(0, limit);
  },

  itemMarketComparisons: async (_, { itemId, limit = 20 }, context) => {
    const comparisons = await context.loaders.marketComparisonsByItemId.load(itemId);
    return comparisons.slice(0, limit);
  },

  // Collection queries with filtering and pagination
  valuations: async (_, { filter, sort, pagination }, context) => {
    let query = `
      SELECT v.*, i.name as item_name 
      FROM item_valuations v
      JOIN items i ON v.item_id = i.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 0;

    // Apply filters
    if (filter) {
      if (filter.itemIds?.length) {
        query += ` AND v.item_id = ANY($${++paramCount})`;
        params.push(filter.itemIds);
      }
      
      if (filter.methods?.length) {
        query += ` AND v.valuation_method = ANY($${++paramCount})`;
        params.push(filter.methods);
      }
      
      if (filter.confidenceRange) {
        if (filter.confidenceRange.min !== null) {
          query += ` AND v.confidence_score >= $${++paramCount}`;
          params.push(filter.confidenceRange.min);
        }
        if (filter.confidenceRange.max !== null) {
          query += ` AND v.confidence_score <= $${++paramCount}`;
          params.push(filter.confidenceRange.max);
        }
      }
      
      if (filter.valueRange) {
        if (filter.valueRange.min !== null) {
          query += ` AND v.estimated_value >= $${++paramCount}`;
          params.push(filter.valueRange.min);
        }
        if (filter.valueRange.max !== null) {
          query += ` AND v.estimated_value <= $${++paramCount}`;
          params.push(filter.valueRange.max);
        }
      }
      
      if (filter.createdAfter) {
        query += ` AND v.created_at >= $${++paramCount}`;
        params.push(filter.createdAfter);
      }
      
      if (filter.createdBefore) {
        query += ` AND v.created_at <= $${++paramCount}`;
        params.push(filter.createdBefore);
      }
      
      if (filter.needsUpdate) {
        query += ` AND (v.expires_at IS NULL OR v.expires_at < NOW())`;
      }
      
      if (filter.categories?.length) {
        query += ` AND i.category = ANY($${++paramCount})`;
        params.push(filter.categories);
      }
      
      if (filter.rooms?.length) {
        query += ` AND i.room_id = ANY($${++paramCount})`;
        params.push(filter.rooms);
      }
      
      if (filter.hasComparisons !== undefined) {
        if (filter.hasComparisons) {
          query += ` AND EXISTS (SELECT 1 FROM market_comparisons mc WHERE mc.item_id = v.item_id)`;
        } else {
          query += ` AND NOT EXISTS (SELECT 1 FROM market_comparisons mc WHERE mc.item_id = v.item_id)`;
        }
      }
    }

    // Apply sorting
    if (sort) {
      const sortField = {
        CREATED_AT: 'v.created_at',
        UPDATED_AT: 'v.updated_at',
        ESTIMATED_VALUE: 'v.estimated_value',
        CONFIDENCE_SCORE: 'v.confidence_score',
        EXPIRY_DATE: 'v.expires_at',
        ITEM_NAME: 'i.name'
      }[sort.field] || 'v.created_at';
      
      query += ` ORDER BY ${sortField} ${sort.direction || 'DESC'}`;
    } else {
      query += ` ORDER BY v.created_at DESC`;
    }

    // Apply pagination
    const limit = pagination?.first || 20;
    const offset = pagination?.after ? parseInt(pagination.after) : 0;
    
    query += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);

    const valuations = await context.db.query(query, params);
    
    // Get total count for pagination info
    const countQuery = query.replace(/SELECT v\.\*, i\.name as item_name/, 'SELECT COUNT(*)').split(' ORDER BY')[0];
    const countResult = await context.db.query(countQuery, params.slice(0, -2));
    const totalCount = parseInt(countResult[0].count);

    return {
      edges: valuations.map((valuation, index) => ({
        node: valuation,
        cursor: String(offset + index)
      })),
      nodes: valuations,
      pageInfo: {
        hasNextPage: offset + limit < totalCount,
        hasPreviousPage: offset > 0,
        startCursor: String(offset),
        endCursor: String(offset + valuations.length - 1)
      },
      totalCount
    };
  },

  // Market comparisons with filtering
  marketComparisons: async (_, { filter, pagination }, context) => {
    let query = `
      SELECT mc.*, i.name as item_name 
      FROM market_comparisons mc
      JOIN items i ON mc.item_id = i.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 0;

    if (filter) {
      if (filter.itemIds?.length) {
        query += ` AND mc.item_id = ANY($${++paramCount})`;
        params.push(filter.itemIds);
      }
      
      if (filter.sources?.length) {
        query += ` AND mc.source = ANY($${++paramCount})`;
        params.push(filter.sources);
      }
      
      if (filter.priceRange) {
        if (filter.priceRange.min !== null) {
          query += ` AND mc.price >= $${++paramCount}`;
          params.push(filter.priceRange.min);
        }
        if (filter.priceRange.max !== null) {
          query += ` AND mc.price <= $${++paramCount}`;
          params.push(filter.priceRange.max);
        }
      }
      
      if (filter.similarityRange) {
        if (filter.similarityRange.min !== null) {
          query += ` AND mc.similarity_score >= $${++paramCount}`;
          params.push(filter.similarityRange.min);
        }
        if (filter.similarityRange.max !== null) {
          query += ` AND mc.similarity_score <= $${++paramCount}`;
          params.push(filter.similarityRange.max);
        }
      }
      
      if (filter.soldOnly) {
        query += ` AND mc.sold_date IS NOT NULL`;
      }
      
      if (filter.activeOnly) {
        query += ` AND mc.sold_date IS NULL`;
      }
      
      if (filter.location) {
        query += ` AND mc.location ILIKE $${++paramCount}`;
        params.push(`%${filter.location}%`);
      }
    }

    query += ` ORDER BY mc.similarity_score DESC NULLS LAST, mc.created_at DESC`;

    const limit = pagination?.first || 20;
    const offset = pagination?.after ? parseInt(pagination.after) : 0;
    
    query += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);

    const comparisons = await context.db.query(query, params);
    
    const countQuery = query.replace(/SELECT mc\.\*, i\.name as item_name/, 'SELECT COUNT(*)').split(' ORDER BY')[0];
    const countResult = await context.db.query(countQuery, params.slice(0, -2));
    const totalCount = parseInt(countResult[0].count);

    return {
      edges: comparisons.map((comparison, index) => ({
        node: comparison,
        cursor: String(offset + index)
      })),
      nodes: comparisons,
      pageInfo: {
        hasNextPage: offset + limit < totalCount,
        hasPreviousPage: offset > 0,
        startCursor: String(offset),
        endCursor: String(offset + comparisons.length - 1)
      },
      totalCount
    };
  },

  // Comprehensive pricing insights
  pricingInsights: async (_, { roomIds, categories, timeRange }, context) => {
    let whereClause = 'WHERE i.purchase_price IS NOT NULL';
    const params: any[] = [];
    let paramCount = 0;

    if (roomIds?.length) {
      whereClause += ` AND i.room_id = ANY($${++paramCount})`;
      params.push(roomIds);
    }

    if (categories?.length) {
      whereClause += ` AND i.category = ANY($${++paramCount})`;
      params.push(categories);
    }

    // Main portfolio metrics
    const portfolioQuery = `
      SELECT 
        COUNT(*) as total_items,
        COUNT(cv.item_id) as items_with_valuations,
        COALESCE(SUM(i.purchase_price), 0) as total_purchase_value,
        COALESCE(SUM(cv.estimated_value), 0) as total_current_value,
        COALESCE(AVG(cv.confidence_score), 0) as avg_confidence_score
      FROM items i
      LEFT JOIN current_valuations cv ON i.id = cv.item_id
      ${whereClause}
    `;

    const portfolioResult = await context.db.query(portfolioQuery, params);
    const portfolio = portfolioResult[0];

    // Room summaries
    const roomSummaries = await context.db.query(`
      SELECT * FROM room_valuation_summary
      ${roomIds?.length ? 'WHERE room_id = ANY($1)' : ''}
      ORDER BY total_estimated_value DESC NULLS LAST
    `, roomIds?.length ? [roomIds] : []);

    // Market insights
    const marketInsights = await context.db.query(`
      SELECT * FROM market_insights
      ${categories?.length ? 'WHERE category = ANY($1)' : ''}
      ORDER BY retention_percent DESC
    `, categories?.length ? [categories] : []);

    // Top performers
    const topPerformers = await context.db.query(`
      SELECT * FROM current_valuations
      ${whereClause.replace('WHERE', 'WHERE cv.')}
      ORDER BY value_change_percent DESC NULLS LAST
      LIMIT 10
    `, params);

    // Items needing updates
    const needsUpdate = await context.db.query(`
      SELECT cv.* FROM current_valuations cv
      JOIN items i ON cv.item_id = i.id
      ${whereClause}
      AND (cv.expires_at < NOW() OR cv.confidence_score < 0.7)
      ORDER BY cv.expires_at ASC NULLS LAST, cv.confidence_score ASC
      LIMIT 20
    `, params);

    return {
      totalItems: parseInt(portfolio.total_items),
      itemsWithValuations: parseInt(portfolio.items_with_valuations),
      totalPurchaseValue: parseFloat(portfolio.total_purchase_value),
      totalCurrentValue: parseFloat(portfolio.total_current_value),
      overallAppreciation: parseFloat(portfolio.total_current_value) - parseFloat(portfolio.total_purchase_value),
      avgConfidenceScore: parseFloat(portfolio.avg_confidence_score),
      roomSummaries,
      marketInsights,
      topPerformers,
      needsUpdate,
      appreciationOverTime: [], // TODO: Implement time series data
      marketTrends: [] // TODO: Implement market trends
    };
  },

  // Room valuation summary
  roomValuationSummary: async (_, { roomId }, context) => {
    const summary = await context.db.query(`
      SELECT * FROM room_valuation_summary WHERE room_id = $1
    `, [roomId]);
    
    return summary[0] || null;
  },

  // Market insights
  marketInsights: async (_, { categories, brands, minItems = 3 }, context) => {
    let query = `
      SELECT * FROM market_insights 
      WHERE item_count >= $1
    `;
    const params = [minItems];
    let paramCount = 1;

    if (categories?.length) {
      query += ` AND category = ANY($${++paramCount})`;
      params.push(categories);
    }

    if (brands?.length) {
      query += ` AND brand = ANY($${++paramCount})`;
      params.push(brands);
    }

    query += ` ORDER BY retention_percent DESC`;

    return context.db.query(query, params);
  },

  // Depreciation models
  depreciationModels: async (_, __, context) => {
    return context.db.query(`
      SELECT * FROM depreciation_models 
      ORDER BY category, brand NULLS LAST
    `);
  },

  depreciationModel: async (_, { category, brand }, context) => {
    const key = `${category || ''}:${brand || ''}`;
    return context.loaders.depreciationModels.load(key);
  },

  // Find comparable items
  findComparables: async (_, { itemId, sources, limit = 10 }, context) => {
    let query = `
      SELECT * FROM market_comparisons 
      WHERE item_id = $1
    `;
    const params = [itemId];
    let paramCount = 1;

    if (sources?.length) {
      query += ` AND source = ANY($${++paramCount})`;
      params.push(sources);
    }

    query += ` ORDER BY similarity_score DESC NULLS LAST, created_at DESC LIMIT $${++paramCount}`;
    params.push(limit);

    return context.db.query(query, params);
  },

  // Sell recommendations
  sellRecommendations: async (_, { maxItems = 10, minAppreciation = 0 }, context) => {
    return context.db.query(`
      SELECT * FROM current_valuations
      WHERE value_change_percent >= $1
      AND estimated_value > purchase_price
      ORDER BY value_change_percent DESC, estimated_value DESC
      LIMIT $2
    `, [minAppreciation, maxItems]);
  },

  // Undervalued items
  undervaluedItems: async (_, { maxItems = 10, confidenceThreshold = 0.8 }, context) => {
    return context.db.query(`
      SELECT * FROM current_valuations
      WHERE confidence_score >= $1
      AND value_change_percent < -10  -- More than 10% loss
      ORDER BY value_change_percent ASC, confidence_score DESC
      LIMIT $2
    `, [confidenceThreshold, maxItems]);
  }
};

// =====================================================
// MUTATION RESOLVERS
// =====================================================

const Mutation: Resolvers['Mutation'] = {
  // Create new valuation
  createValuation: async (_, { input }, context) => {
    const valuation = await context.db.query(`
      INSERT INTO item_valuations (
        item_id, valuation_method, estimated_value, confidence_score,
        depreciation_rate, estimated_age_months, condition_factor,
        notes, valuer_type, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      input.itemId,
      input.valuationMethod,
      input.estimatedValue,
      input.confidenceScore,
      input.depreciationRate,
      input.estimatedAgeMonths,
      input.conditionFactor,
      input.notes,
      input.valuerType,
      input.expiresAt
    ]);

    const result = valuation[0];

    // Clear relevant caches
    context.loaders.valuationsByItemId.clear(input.itemId);
    context.loaders.currentValuationsByItemId.clear(input.itemId);

    // Publish valuation update
    pubsub.publish('VALUATION_UPDATED', {
      valuationUpdated: {
        itemId: input.itemId,
        valuationId: result.id,
        newValue: input.estimatedValue,
        method: input.valuationMethod,
        confidence: input.confidenceScore,
        timestamp: new Date(),
        item: await context.loaders.itemsById.load(input.itemId),
        valuation: result
      }
    });

    return result;
  },

  // Update existing valuation
  updateValuation: async (_, { id, input }, context) => {
    const existing = await context.loaders.valuationsById.load(id);
    if (!existing) {
      throw new NotFoundError('Valuation not found');
    }

    const valuation = await context.db.query(`
      UPDATE item_valuations 
      SET 
        estimated_value = COALESCE($2, estimated_value),
        confidence_score = COALESCE($3, confidence_score),
        notes = COALESCE($4, notes),
        expires_at = COALESCE($5, expires_at),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [
      id,
      input.estimatedValue,
      input.confidenceScore,
      input.notes,
      input.expiresAt
    ]);

    const result = valuation[0];

    // Clear caches
    context.loaders.valuationsById.clear(id);
    context.loaders.valuationsByItemId.clear(existing.item_id);
    context.loaders.currentValuationsByItemId.clear(existing.item_id);

    // Publish update
    pubsub.publish('VALUATION_UPDATED', {
      valuationUpdated: {
        itemId: existing.item_id,
        valuationId: id,
        oldValue: existing.estimated_value,
        newValue: result.estimated_value,
        method: result.valuation_method,
        confidence: result.confidence_score,
        changeReason: 'Manual update',
        timestamp: new Date(),
        item: await context.loaders.itemsById.load(existing.item_id),
        valuation: result
      }
    });

    return result;
  },

  // Batch valuation requests
  requestValuations: async (_, { input }, context) => {
    const requestId = require('crypto').randomUUID();
    
    // Create valuation requests
    const requests = await Promise.all(
      input.itemIds.map(itemId =>
        context.db.query(`
          INSERT INTO valuation_requests (
            item_id, request_type, priority, status
          ) VALUES ($1, $2, $3, 'pending')
          RETURNING *
        `, [itemId, input.requestType, input.priority || 5])
      )
    );

    // TODO: Implement actual valuation processing
    
    return {
      requestId,
      totalItems: input.itemIds.length,
      successCount: 0,
      failureCount: 0,
      estimatedCompletion: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      errors: [],
      status: ValuationStatus.Pending,
      progressPercent: 0
    };
  },

  // Record price change
  recordPriceChange: async (_, { input }, context) => {
    const priceHistory = await context.db.query(`
      INSERT INTO price_history (
        item_id, price_type, price, change_reason, 
        source_type, metadata, effective_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      input.itemId,
      input.priceType,
      input.price,
      input.changeReason,
      input.sourceType,
      JSON.stringify(input.metadata),
      input.effectiveDate || new Date()
    ]);

    const result = priceHistory[0];

    // Clear cache
    context.loaders.priceHistoryByItemId.clear(input.itemId);

    // Publish price alert if significant change
    const previousPrice = await context.db.query(`
      SELECT price FROM price_history 
      WHERE item_id = $1 AND price_type = $2 
      AND effective_date < $3
      ORDER BY effective_date DESC 
      LIMIT 1
    `, [input.itemId, input.priceType, result.effective_date]);

    if (previousPrice[0]) {
      const changePercent = ((result.price - previousPrice[0].price) / previousPrice[0].price) * 100;
      
      if (Math.abs(changePercent) >= 10) { // 10% change threshold
        pubsub.publish('PRICE_ALERT', {
          priceAlert: {
            itemId: input.itemId,
            alertType: changePercent > 0 ? 'price_spike' : 'price_drop',
            currentPrice: result.price,
            previousPrice: previousPrice[0].price,
            changePercent,
            message: `Price ${changePercent > 0 ? 'increased' : 'decreased'} by ${Math.abs(changePercent).toFixed(1)}%`,
            timestamp: new Date(),
            item: await context.loaders.itemsById.load(input.itemId)
          }
        });
      }
    }

    return result;
  }
};

// =====================================================
// TYPE RESOLVERS
// =====================================================

const ItemValuation: Resolvers['ItemValuation'] = {
  item: async (parent, _, context) => {
    return context.loaders.itemsById.load(parent.itemId);
  },

  marketComparisons: async (parent, _, context) => {
    return context.loaders.marketComparisonsByItemId.load(parent.itemId);
  },

  priceHistory: async (parent, _, context) => {
    return context.loaders.priceHistoryByItemId.load(parent.itemId);
  }
};

const MarketComparison: Resolvers['MarketComparison'] = {
  item: async (parent, _, context) => {
    return context.loaders.itemsById.load(parent.itemId);
  }
};

const PriceHistory: Resolvers['PriceHistory'] = {
  item: async (parent, _, context) => {
    return context.loaders.itemsById.load(parent.itemId);
  }
};

const CurrentValuation: Resolvers['CurrentValuation'] = {
  item: async (parent, _, context) => {
    return context.loaders.itemsById.load(parent.itemId);
  },

  valuation: async (parent, _, context) => {
    return context.loaders.valuationsById.load(parent.valuationId);
  }
};

const RoomValuationSummary: Resolvers['RoomValuationSummary'] = {
  room: async (parent, _, context) => {
    return context.loaders.roomsById.load(parent.roomId);
  },

  topValuedItems: async (parent, { limit = 5 }, context) => {
    return context.db.query(`
      SELECT * FROM current_valuations 
      WHERE item_id IN (
        SELECT id FROM items WHERE room_id = $1
      )
      ORDER BY estimated_value DESC 
      LIMIT $2
    `, [parent.roomId, limit]);
  },

  recentChanges: async (parent, _, context) => {
    return context.db.query(`
      SELECT ph.* FROM price_history ph
      JOIN items i ON ph.item_id = i.id
      WHERE i.room_id = $1
      ORDER BY ph.created_at DESC
      LIMIT 10
    `, [parent.roomId]);
  }
};

// =====================================================
// FEDERATION RESOLVERS
// =====================================================

const Item: Resolvers['Item'] = {
  currentValuation: async (parent, _, context) => {
    return context.loaders.currentValuationsByItemId.load(parent.id);
  },

  valuations: async (parent, _, context) => {
    return context.loaders.valuationsByItemId.load(parent.id);
  },

  marketComparisons: async (parent, _, context) => {
    return context.loaders.marketComparisonsByItemId.load(parent.id);
  },

  priceHistory: async (parent, _, context) => {
    return context.loaders.priceHistoryByItemId.load(parent.id);
  },

  valuationRequests: async (parent, _, context) => {
    return context.loaders.valuationRequestsByItemId.load(parent.id);
  },

  estimatedValue: async (parent, _, context) => {
    const current = await context.loaders.currentValuationsByItemId.load(parent.id);
    return current?.estimatedValue || null;
  },

  valueAppreciation: async (parent, _, context) => {
    const current = await context.loaders.currentValuationsByItemId.load(parent.id);
    if (!current || !parent.purchasePrice) return null;
    return current.estimatedValue - parent.purchasePrice;
  },

  valuationConfidence: async (parent, _, context) => {
    const current = await context.loaders.currentValuationsByItemId.load(parent.id);
    return current?.confidenceScore || null;
  },

  lastValuationDate: async (parent, _, context) => {
    const current = await context.loaders.currentValuationsByItemId.load(parent.id);
    return current?.valuationDate || null;
  },

  needsValuationUpdate: async (parent, _, context) => {
    const current = await context.loaders.currentValuationsByItemId.load(parent.id);
    if (!current) return true;
    if (current.expiresAt && new Date(current.expiresAt) < new Date()) return true;
    if (current.confidenceScore && current.confidenceScore < 0.7) return true;
    return false;
  }
};

const Room: Resolvers['Room'] = {
  valuationSummary: async (parent, _, context) => {
    const summary = await context.db.query(`
      SELECT * FROM room_valuation_summary WHERE room_id = $1
    `, [parent.id]);
    return summary[0] || null;
  },

  totalEstimatedValue: async (parent, _, context) => {
    const result = await context.db.query(`
      SELECT COALESCE(SUM(cv.estimated_value), 0) as total
      FROM current_valuations cv
      JOIN items i ON cv.item_id = i.id
      WHERE i.room_id = $1
    `, [parent.id]);
    return parseFloat(result[0].total);
  }
};

// =====================================================
// SUBSCRIPTION RESOLVERS
// =====================================================

const Subscription: Resolvers['Subscription'] = {
  valuationUpdated: {
    subscribe: withFilter(
      () => pubsub.asyncIterator(['VALUATION_UPDATED']),
      (payload, variables) => {
        if (!variables.itemIds) return true;
        return variables.itemIds.includes(payload.valuationUpdated.itemId);
      }
    )
  },

  priceAlert: {
    subscribe: withFilter(
      () => pubsub.asyncIterator(['PRICE_ALERT']),
      (payload, variables) => {
        if (variables.itemIds && !variables.itemIds.includes(payload.priceAlert.itemId)) {
          return false;
        }
        if (variables.alertTypes && !variables.alertTypes.includes(payload.priceAlert.alertType)) {
          return false;
        }
        if (variables.minChangePercent && Math.abs(payload.priceAlert.changePercent) < variables.minChangePercent) {
          return false;
        }
        return true;
      }
    )
  },

  newMarketComparison: {
    subscribe: withFilter(
      () => pubsub.asyncIterator(['NEW_MARKET_COMPARISON']),
      (payload, variables) => {
        if (!variables.itemIds) return true;
        return variables.itemIds.includes(payload.newMarketComparison.itemId);
      }
    )
  }
};

// =====================================================
# RESOLVER EXPORTS
# =====================================================

export const valuationResolvers: Resolvers = {
  Query,
  Mutation,
  Subscription,
  ItemValuation,
  MarketComparison,
  PriceHistory,
  CurrentValuation,
  RoomValuationSummary,
  Item,
  Room
};

export { createValuationDataLoaders };