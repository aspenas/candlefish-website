/**
 * Real-time Subscription Handlers for Valuation and Pricing System
 * 
 * Implements WebSocket subscriptions for:
 * - Real-time valuation updates
 * - Price movement alerts
 * - Market comparison notifications
 * - Batch operation progress tracking
 * - Portfolio performance streaming
 */

import { PubSub, withFilter } from 'graphql-subscriptions';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import Redis from 'ioredis';
import { Context } from '../types/context';
import { 
  ValuationUpdate, 
  PriceAlert, 
  BatchProgress, 
  MarketComparison,
  MarketTrend,
  PricingInsights 
} from '../models';

// =====================================================
// PUBSUB CONFIGURATION
// =====================================================

// Use Redis for distributed subscription support
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  retryDelayOnFailover: 100,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 3
});

// Create PubSub instance with Redis backend for scalability
export const pubsub = process.env.NODE_ENV === 'production' 
  ? new RedisPubSub({
      publisher: redis,
      subscriber: redis.duplicate()
    })
  : new PubSub();

// =====================================================
// SUBSCRIPTION TOPICS
// =====================================================

export const SUBSCRIPTION_TOPICS = {
  VALUATION_UPDATED: 'VALUATION_UPDATED',
  PRICE_ALERT: 'PRICE_ALERT', 
  NEW_MARKET_COMPARISON: 'NEW_MARKET_COMPARISON',
  BATCH_PROGRESS: 'BATCH_PROGRESS',
  MARKET_TREND_UPDATE: 'MARKET_TREND_UPDATE',
  PORTFOLIO_VALUE_UPDATE: 'PORTFOLIO_VALUE_UPDATE',
  ITEM_LIQUIDATED: 'ITEM_LIQUIDATED',
  MARKET_OPPORTUNITY: 'MARKET_OPPORTUNITY',
  RISK_ALERT: 'RISK_ALERT'
} as const;

// =====================================================
// SUBSCRIPTION RESOLVERS
// =====================================================

export const valuationSubscriptions = {
  /**
   * Real-time valuation updates
   * Triggered when item valuations change
   */
  valuationUpdated: {
    subscribe: withFilter(
      () => pubsub.asyncIterator([SUBSCRIPTION_TOPICS.VALUATION_UPDATED]),
      (payload: { valuationUpdated: ValuationUpdate }, variables: any, context: Context) => {
        // Filter by item IDs if specified
        if (variables.itemIds && variables.itemIds.length > 0) {
          return variables.itemIds.includes(payload.valuationUpdated.itemId);
        }
        
        // Filter by rooms if specified
        if (variables.roomIds && variables.roomIds.length > 0) {
          // TODO: Add room-based filtering logic
          return true;
        }
        
        // Filter by minimum change threshold
        if (variables.minChangePercent) {
          const changePercent = payload.valuationUpdated.oldValue 
            ? ((payload.valuationUpdated.newValue - payload.valuationUpdated.oldValue) / payload.valuationUpdated.oldValue) * 100
            : 100;
          return Math.abs(changePercent) >= variables.minChangePercent;
        }
        
        return true;
      }
    ),
    resolve: (payload: { valuationUpdated: ValuationUpdate }) => payload.valuationUpdated
  },

  /**
   * Price movement alerts
   * Triggered by significant price changes or market events
   */
  priceAlert: {
    subscribe: withFilter(
      () => pubsub.asyncIterator([SUBSCRIPTION_TOPICS.PRICE_ALERT]),
      (payload: { priceAlert: PriceAlert }, variables: any, context: Context) => {
        // Filter by item IDs
        if (variables.itemIds && !variables.itemIds.includes(payload.priceAlert.itemId)) {
          return false;
        }
        
        // Filter by alert types
        if (variables.alertTypes && !variables.alertTypes.includes(payload.priceAlert.alertType)) {
          return false;
        }
        
        // Filter by minimum change percentage
        if (variables.minChangePercent && 
            Math.abs(payload.priceAlert.changePercent) < variables.minChangePercent) {
          return false;
        }
        
        // Filter by market sources
        if (variables.sources && payload.priceAlert.source && 
            !variables.sources.includes(payload.priceAlert.source)) {
          return false;
        }
        
        return true;
      }
    ),
    resolve: (payload: { priceAlert: PriceAlert }) => payload.priceAlert
  },

  /**
   * New market comparison notifications
   * Triggered when new comparable items are found
   */
  newMarketComparison: {
    subscribe: withFilter(
      () => pubsub.asyncIterator([SUBSCRIPTION_TOPICS.NEW_MARKET_COMPARISON]),
      (payload: { newMarketComparison: MarketComparison }, variables: any, context: Context) => {
        // Filter by item IDs
        if (variables.itemIds && !variables.itemIds.includes(payload.newMarketComparison.itemId)) {
          return false;
        }
        
        // Filter by similarity threshold
        if (variables.minSimilarity && 
            payload.newMarketComparison.similarityScore &&
            payload.newMarketComparison.similarityScore < variables.minSimilarity) {
          return false;
        }
        
        // Filter by market sources
        if (variables.sources && !variables.sources.includes(payload.newMarketComparison.source)) {
          return false;
        }
        
        return true;
      }
    ),
    resolve: (payload: { newMarketComparison: MarketComparison }) => payload.newMarketComparison
  },

  /**
   * Batch operation progress updates
   * Real-time progress tracking for bulk operations
   */
  batchProgress: {
    subscribe: withFilter(
      () => pubsub.asyncIterator([SUBSCRIPTION_TOPICS.BATCH_PROGRESS]),
      (payload: { batchProgress: BatchProgress }, variables: any) => {
        return !variables.requestId || payload.batchProgress.requestId === variables.requestId;
      }
    ),
    resolve: (payload: { batchProgress: BatchProgress }) => payload.batchProgress
  },

  /**
   * Market trend updates
   * Notifications when market trends change significantly
   */
  marketTrendUpdate: {
    subscribe: withFilter(
      () => pubsub.asyncIterator([SUBSCRIPTION_TOPICS.MARKET_TREND_UPDATE]),
      (payload: { marketTrendUpdate: MarketTrend }, variables: any) => {
        // Filter by categories
        if (variables.categories && variables.categories.length > 0) {
          return payload.marketTrendUpdate.category && 
                 variables.categories.includes(payload.marketTrendUpdate.category);
        }
        
        // Filter by brands
        if (variables.brands && variables.brands.length > 0) {
          return payload.marketTrendUpdate.brand &&
                 variables.brands.includes(payload.marketTrendUpdate.brand);
        }
        
        return true;
      }
    ),
    resolve: (payload: { marketTrendUpdate: MarketTrend }) => payload.marketTrendUpdate
  },

  /**
   * Portfolio performance updates
   * Real-time portfolio value and performance metrics
   */
  portfolioValueUpdate: {
    subscribe: withFilter(
      () => pubsub.asyncIterator([SUBSCRIPTION_TOPICS.PORTFOLIO_VALUE_UPDATE]),
      (payload: { portfolioValueUpdate: PricingInsights }, variables: any, context: Context) => {
        // Filter by minimum change threshold
        if (variables.minChangeAmount && 
            Math.abs(payload.portfolioValueUpdate.overallAppreciation) < variables.minChangeAmount) {
          return false;
        }
        
        return true;
      }
    ),
    resolve: (payload: { portfolioValueUpdate: PricingInsights }) => payload.portfolioValueUpdate
  },

  /**
   * Item liquidation events
   * Notifications when items are sold or marked as liquidated
   */
  itemLiquidated: {
    subscribe: withFilter(
      () => pubsub.asyncIterator([SUBSCRIPTION_TOPICS.ITEM_LIQUIDATED]),
      (payload: any, variables: any) => {
        if (variables.itemIds && !variables.itemIds.includes(payload.itemLiquidated.itemId)) {
          return false;
        }
        return true;
      }
    ),
    resolve: (payload: any) => payload.itemLiquidated
  },

  /**
   * Market opportunity alerts
   * Notifications for investment or selling opportunities
   */
  marketOpportunity: {
    subscribe: withFilter(
      () => pubsub.asyncIterator([SUBSCRIPTION_TOPICS.MARKET_OPPORTUNITY]),
      (payload: any, variables: any) => {
        // Filter by opportunity type
        if (variables.opportunityTypes && 
            !variables.opportunityTypes.includes(payload.marketOpportunity.type)) {
          return false;
        }
        
        // Filter by categories
        if (variables.categories && payload.marketOpportunity.category &&
            !variables.categories.includes(payload.marketOpportunity.category)) {
          return false;
        }
        
        return true;
      }
    ),
    resolve: (payload: any) => payload.marketOpportunity
  },

  /**
   * Portfolio risk alerts
   * Notifications for risk threshold breaches
   */
  riskAlert: {
    subscribe: withFilter(
      () => pubsub.asyncIterator([SUBSCRIPTION_TOPICS.RISK_ALERT]),
      (payload: any, variables: any) => {
        // Filter by risk level
        if (variables.minRiskLevel && 
            payload.riskAlert.severity < variables.minRiskLevel) {
          return false;
        }
        
        return true;
      }
    ),
    resolve: (payload: any) => payload.riskAlert
  }
};

// =====================================================
// PUBLISHER FUNCTIONS
// =====================================================

/**
 * Publishes valuation update events
 */
export async function publishValuationUpdate(update: ValuationUpdate): Promise<void> {
  try {
    await pubsub.publish(SUBSCRIPTION_TOPICS.VALUATION_UPDATED, {
      valuationUpdated: update
    });
  } catch (error) {
    console.error('Failed to publish valuation update:', error);
  }
}

/**
 * Publishes price alert events
 */
export async function publishPriceAlert(alert: PriceAlert): Promise<void> {
  try {
    await pubsub.publish(SUBSCRIPTION_TOPICS.PRICE_ALERT, {
      priceAlert: alert
    });
  } catch (error) {
    console.error('Failed to publish price alert:', error);
  }
}

/**
 * Publishes new market comparison events
 */
export async function publishMarketComparison(comparison: MarketComparison): Promise<void> {
  try {
    await pubsub.publish(SUBSCRIPTION_TOPICS.NEW_MARKET_COMPARISON, {
      newMarketComparison: comparison
    });
  } catch (error) {
    console.error('Failed to publish market comparison:', error);
  }
}

/**
 * Publishes batch progress updates
 */
export async function publishBatchProgress(progress: BatchProgress): Promise<void> {
  try {
    await pubsub.publish(SUBSCRIPTION_TOPICS.BATCH_PROGRESS, {
      batchProgress: progress
    });
  } catch (error) {
    console.error('Failed to publish batch progress:', error);
  }
}

/**
 * Publishes market trend updates
 */
export async function publishMarketTrend(trend: MarketTrend): Promise<void> {
  try {
    await pubsub.publish(SUBSCRIPTION_TOPICS.MARKET_TREND_UPDATE, {
      marketTrendUpdate: trend
    });
  } catch (error) {
    console.error('Failed to publish market trend:', error);
  }
}

/**
 * Publishes portfolio value updates
 */
export async function publishPortfolioUpdate(insights: PricingInsights): Promise<void> {
  try {
    await pubsub.publish(SUBSCRIPTION_TOPICS.PORTFOLIO_VALUE_UPDATE, {
      portfolioValueUpdate: insights
    });
  } catch (error) {
    console.error('Failed to publish portfolio update:', error);
  }
}

// =====================================================
// SUBSCRIPTION MANAGER CLASS
// =====================================================

export class ValuationSubscriptionManager {
  private activeConnections = new Map<string, Set<string>>();
  private connectionMetadata = new Map<string, any>();

  /**
   * Track new subscription connection
   */
  addConnection(connectionId: string, subscriptionName: string, variables: any = {}): void {
    if (!this.activeConnections.has(subscriptionName)) {
      this.activeConnections.set(subscriptionName, new Set());
    }
    
    this.activeConnections.get(subscriptionName)!.add(connectionId);
    this.connectionMetadata.set(connectionId, {
      subscriptionName,
      variables,
      connectedAt: new Date(),
      lastActivity: new Date()
    });
  }

  /**
   * Remove subscription connection
   */
  removeConnection(connectionId: string): void {
    const metadata = this.connectionMetadata.get(connectionId);
    if (metadata) {
      const connections = this.activeConnections.get(metadata.subscriptionName);
      if (connections) {
        connections.delete(connectionId);
      }
      this.connectionMetadata.delete(connectionId);
    }
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): any {
    const stats = {
      totalConnections: this.connectionMetadata.size,
      subscriptionBreakdown: {} as any,
      oldestConnection: null as Date | null,
      newestConnection: null as Date | null
    };

    // Calculate subscription breakdown
    this.activeConnections.forEach((connections, subscriptionName) => {
      stats.subscriptionBreakdown[subscriptionName] = connections.size;
    });

    // Find oldest and newest connections
    this.connectionMetadata.forEach((metadata) => {
      const connectedAt = metadata.connectedAt;
      if (!stats.oldestConnection || connectedAt < stats.oldestConnection) {
        stats.oldestConnection = connectedAt;
      }
      if (!stats.newestConnection || connectedAt > stats.newestConnection) {
        stats.newestConnection = connectedAt;
      }
    });

    return stats;
  }

  /**
   * Clean up inactive connections
   */
  cleanupInactiveConnections(maxInactiveMinutes = 60): number {
    const cutoff = new Date(Date.now() - maxInactiveMinutes * 60 * 1000);
    let cleaned = 0;

    this.connectionMetadata.forEach((metadata, connectionId) => {
      if (metadata.lastActivity < cutoff) {
        this.removeConnection(connectionId);
        cleaned++;
      }
    });

    return cleaned;
  }

  /**
   * Update connection activity timestamp
   */
  updateConnectionActivity(connectionId: string): void {
    const metadata = this.connectionMetadata.get(connectionId);
    if (metadata) {
      metadata.lastActivity = new Date();
    }
  }

  /**
   * Broadcast custom message to specific subscription type
   */
  async broadcastToSubscription(subscriptionName: string, message: any): Promise<void> {
    const topic = `CUSTOM_${subscriptionName.toUpperCase()}`;
    await pubsub.publish(topic, message);
  }
}

// Global subscription manager instance
export const subscriptionManager = new ValuationSubscriptionManager();

// =====================================================
// HEALTH CHECK AND MONITORING
// =====================================================

/**
 * Health check for subscription system
 */
export function getSubscriptionHealth(): any {
  return {
    status: 'healthy',
    redisConnection: redis.status,
    activeSubscriptions: subscriptionManager.getConnectionStats(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  };
}

/**
 * Cleanup function for graceful shutdown
 */
export async function cleanup(): Promise<void> {
  try {
    await redis.quit();
    console.log('Valuation subscription system cleaned up successfully');
  } catch (error) {
    console.error('Error during subscription cleanup:', error);
  }
}

// Periodic cleanup of inactive connections
setInterval(() => {
  const cleaned = subscriptionManager.cleanupInactiveConnections();
  if (cleaned > 0) {
    console.log(`Cleaned up ${cleaned} inactive subscription connections`);
  }
}, 5 * 60 * 1000); // Every 5 minutes