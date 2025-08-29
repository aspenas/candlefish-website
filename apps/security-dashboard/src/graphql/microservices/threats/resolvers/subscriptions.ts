import { SubscriptionResolvers } from '../../../generated/graphql';
import { Context } from '../../../types/context';
import { AuthenticationError, ForbiddenError } from '../../../errors';
import { withFilter } from 'graphql-subscriptions';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { Redis } from 'ioredis';
import { validateSubscriptionFilter } from '../validators';

// Redis configuration for pub/sub
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
});

const pubsub = new RedisPubSub({
  publisher: redis,
  subscriber: redis,
});

// Subscription topics
const TOPICS = {
  THREAT_INTELLIGENCE_UPDATE: 'THREAT_INTELLIGENCE_UPDATE',
  IOC_MATCH: 'IOC_MATCH',
  NEW_IOC: 'NEW_IOC',
  THREAT_FEED_UPDATE: 'THREAT_FEED_UPDATE',
  CORRELATION_MATCH: 'CORRELATION_MATCH',
  ATTRIBUTION_UPDATE: 'ATTRIBUTION_UPDATE',
  THREAT_ACTOR_ACTIVITY: 'THREAT_ACTOR_ACTIVITY',
  THREAT_CAMPAIGN_UPDATE: 'THREAT_CAMPAIGN_UPDATE',
  THREAT_LANDSCAPE_UPDATE: 'THREAT_LANDSCAPE_UPDATE',
} as const;

// Helper function to create organization-scoped topic
const createOrgTopic = (baseTopic: string, organizationId: string) => {
  return `${baseTopic}:${organizationId}`;
};

// Authorization helper for subscriptions
const authorizeSubscription = (context: Context, requiredRole = 'ANALYST') => {
  const { organizationId, userId, userRole } = context;
  
  if (!organizationId || !userId) {
    throw new AuthenticationError('Authentication required for subscriptions');
  }
  
  // Check role hierarchy
  const roleHierarchy = ['VIEWER', 'ANALYST', 'INCIDENT_RESPONDER', 'ADMIN', 'SUPER_ADMIN'];
  const userRoleIndex = roleHierarchy.indexOf(userRole);
  const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);
  
  if (userRoleIndex < requiredRoleIndex) {
    throw new ForbiddenError(`${requiredRole} role required for this subscription`);
  }
  
  return true;
};

// Subscription resolvers
export const subscriptionResolvers: SubscriptionResolvers = {
  // Real-time threat intelligence updates
  threatIntelligenceUpdates: {
    subscribe: withFilter(
      (parent, args, context: Context) => {
        const { organizationId } = args;
        authorizeSubscription(context);
        
        // Verify organization access
        if (organizationId !== context.organizationId && context.userRole !== 'SUPER_ADMIN') {
          throw new ForbiddenError('Access denied to organization data');
        }
        
        const topic = createOrgTopic(TOPICS.THREAT_INTELLIGENCE_UPDATE, organizationId);
        return pubsub.asyncIterator([topic]);
      },
      (payload, args, context: Context) => {
        // Additional filtering based on provided filter
        if (!args.filter) return true;
        
        const { threat } = payload;
        const filter = validateSubscriptionFilter(args.filter);
        
        // Apply threat type filter
        if (filter.threatTypes && !filter.threatTypes.includes(threat.threatType)) {
          return false;
        }
        
        // Apply severity filter
        if (filter.severities && !filter.severities.includes(threat.severity)) {
          return false;
        }
        
        // Apply confidence filter
        if (filter.confidence && !filter.confidence.includes(threat.confidence)) {
          return false;
        }
        
        // Apply actor filter
        if (filter.threatActorIds && threat.threatActorIds) {
          const hasMatchingActor = filter.threatActorIds.some(
            actorId => threat.threatActorIds.includes(actorId)
          );
          if (!hasMatchingActor) return false;
        }
        
        return true;
      }
    ),
    resolve: (payload) => payload,
  },
  
  // IOC match notifications
  iocMatches: {
    subscribe: withFilter(
      (parent, args, context: Context) => {
        const { organizationId } = args;
        authorizeSubscription(context);
        
        if (organizationId !== context.organizationId && context.userRole !== 'SUPER_ADMIN') {
          throw new ForbiddenError('Access denied to organization data');
        }
        
        const topic = createOrgTopic(TOPICS.IOC_MATCH, organizationId);
        return pubsub.asyncIterator([topic]);
      },
      (payload, args) => {
        const { ioc, match } = payload;
        
        // Filter by confidence level
        if (args.confidence && ioc.confidence !== args.confidence) {
          return false;
        }
        
        // Filter by severity
        if (args.severity && match.context.severity !== args.severity) {
          return false;
        }
        
        return true;
      }
    ),
    resolve: (payload) => payload,
  },
  
  // New IOC notifications
  newIOCs: {
    subscribe: withFilter(
      (parent, args, context: Context) => {
        const { organizationId } = args;
        authorizeSubscription(context);
        
        if (organizationId !== context.organizationId && context.userRole !== 'SUPER_ADMIN') {
          throw new ForbiddenError('Access denied to organization data');
        }
        
        const topic = createOrgTopic(TOPICS.NEW_IOC, organizationId);
        return pubsub.asyncIterator([topic]);
      },
      (payload, args) => {
        const { ioc, source } = payload;
        
        // Filter by IOC types
        if (args.types && !args.types.includes(ioc.type)) {
          return false;
        }
        
        // Filter by feeds
        if (args.feeds && !args.feeds.includes(source.id)) {
          return false;
        }
        
        // Filter by confidence
        if (args.confidence && ioc.confidence !== args.confidence) {
          return false;
        }
        
        return true;
      }
    ),
    resolve: (payload) => payload,
  },
  
  // Threat feed status updates
  threatFeedUpdates: {
    subscribe: withFilter(
      (parent, args, context: Context) => {
        const { organizationId } = args;
        authorizeSubscription(context, 'ADMIN'); // Admin only for feed management
        
        if (organizationId !== context.organizationId && context.userRole !== 'SUPER_ADMIN') {
          throw new ForbiddenError('Access denied to organization data');
        }
        
        const topic = createOrgTopic(TOPICS.THREAT_FEED_UPDATE, organizationId);
        return pubsub.asyncIterator([topic]);
      },
      (payload, args) => {
        const { feed } = payload;
        
        // Filter by specific feed IDs
        if (args.feedIds && !args.feedIds.includes(feed.id)) {
          return false;
        }
        
        return true;
      }
    ),
    resolve: (payload) => payload,
  },
  
  // Correlation match notifications
  correlationMatches: {
    subscribe: withFilter(
      (parent, args, context: Context) => {
        const { organizationId } = args;
        authorizeSubscription(context);
        
        if (organizationId !== context.organizationId && context.userRole !== 'SUPER_ADMIN') {
          throw new ForbiddenError('Access denied to organization data');
        }
        
        const topic = createOrgTopic(TOPICS.CORRELATION_MATCH, organizationId);
        return pubsub.asyncIterator([topic]);
      },
      (payload, args) => {
        const { correlation, match } = payload;
        
        // Filter by specific correlation IDs
        if (args.correlationIds && !args.correlationIds.includes(correlation.id)) {
          return false;
        }
        
        // Filter by minimum confidence
        if (args.minConfidence && match.confidence < args.minConfidence) {
          return false;
        }
        
        return true;
      }
    ),
    resolve: (payload) => payload,
  },
  
  // Attribution updates
  attributionUpdates: {
    subscribe: withFilter(
      (parent, args, context: Context) => {
        const { organizationId } = args;
        authorizeSubscription(context);
        
        if (organizationId !== context.organizationId && context.userRole !== 'SUPER_ADMIN') {
          throw new ForbiddenError('Access denied to organization data');
        }
        
        const topic = createOrgTopic(TOPICS.ATTRIBUTION_UPDATE, organizationId);
        return pubsub.asyncIterator([topic]);
      },
      (payload, args) => {
        const { threat } = payload;
        
        // Filter by specific threat IDs
        if (args.threatIds && !args.threatIds.includes(threat.id)) {
          return false;
        }
        
        return true;
      }
    ),
    resolve: (payload) => payload,
  },
  
  // Threat actor activity updates
  threatActorActivity: {
    subscribe: withFilter(
      (parent, args, context: Context) => {
        const { organizationId } = args;
        authorizeSubscription(context);
        
        if (organizationId !== context.organizationId && context.userRole !== 'SUPER_ADMIN') {
          throw new ForbiddenError('Access denied to organization data');
        }
        
        const topic = createOrgTopic(TOPICS.THREAT_ACTOR_ACTIVITY, organizationId);
        return pubsub.asyncIterator([topic]);
      },
      (payload, args) => {
        const { actor } = payload;
        
        // Filter by specific actor IDs
        if (args.actorIds && !args.actorIds.includes(actor.id)) {
          return false;
        }
        
        return true;
      }
    ),
    resolve: (payload) => payload,
  },
  
  // Campaign updates
  campaignUpdates: {
    subscribe: withFilter(
      (parent, args, context: Context) => {
        const { organizationId } = args;
        authorizeSubscription(context);
        
        if (organizationId !== context.organizationId && context.userRole !== 'SUPER_ADMIN') {
          throw new ForbiddenError('Access denied to organization data');
        }
        
        const topic = createOrgTopic(TOPICS.THREAT_CAMPAIGN_UPDATE, organizationId);
        return pubsub.asyncIterator([topic]);
      },
      (payload, args) => {
        const { campaign } = payload;
        
        // Filter by specific campaign IDs
        if (args.campaignIds && !args.campaignIds.includes(campaign.id)) {
          return false;
        }
        
        return true;
      }
    ),
    resolve: (payload) => payload,
  },
  
  // Threat landscape updates
  threatLandscapeUpdates: {
    subscribe: withFilter(
      (parent, args, context: Context) => {
        const { organizationId } = args;
        authorizeSubscription(context);
        
        if (organizationId !== context.organizationId && context.userRole !== 'SUPER_ADMIN') {
          throw new ForbiddenError('Access denied to organization data');
        }
        
        const topic = createOrgTopic(TOPICS.THREAT_LANDSCAPE_UPDATE, organizationId);
        return pubsub.asyncIterator([topic]);
      },
      (payload, args) => {
        const { changes } = payload;
        
        // Filter by affected sectors
        if (args.sectors && args.sectors.length > 0) {
          const hasMatchingSector = args.sectors.some(sector =>
            payload.affectedSectors.includes(sector)
          );
          if (!hasMatchingSector) return false;
        }
        
        // Filter by affected regions
        if (args.regions && args.regions.length > 0) {
          const hasMatchingRegion = args.regions.some(region =>
            payload.affectedRegions.includes(region)
          );
          if (!hasMatchingRegion) return false;
        }
        
        return true;
      }
    ),
    resolve: (payload) => payload,
  },
};

// Publisher functions for triggering subscriptions
export class ThreatSubscriptionPublisher {
  // Publish threat intelligence updates
  static async publishThreatIntelligenceUpdate(
    organizationId: string,
    updateType: string,
    threat: any,
    previousValues?: any,
    changedFields?: string[],
    source?: string
  ) {
    const topic = createOrgTopic(TOPICS.THREAT_INTELLIGENCE_UPDATE, organizationId);
    
    await pubsub.publish(topic, {
      type: updateType,
      threat,
      previousValues,
      changedFields: changedFields || [],
      timestamp: new Date(),
      source: source || 'system',
    });
  }
  
  // Publish IOC match notifications
  static async publishIOCMatch(
    organizationId: string,
    ioc: any,
    match: any,
    alert?: any,
    asset?: any,
    priority: string = 'MEDIUM'
  ) {
    const topic = createOrgTopic(TOPICS.IOC_MATCH, organizationId);
    
    await pubsub.publish(topic, {
      ioc,
      match,
      alert,
      asset,
      priority,
      timestamp: new Date(),
    });
  }
  
  // Publish new IOC notifications
  static async publishNewIOC(
    organizationId: string,
    ioc: any,
    source: any,
    priority: string = 'MEDIUM',
    matchingFilters: string[] = []
  ) {
    const topic = createOrgTopic(TOPICS.NEW_IOC, organizationId);
    
    await pubsub.publish(topic, {
      ioc,
      source,
      priority,
      matchingFilters,
      timestamp: new Date(),
    });
  }
  
  // Publish threat feed updates
  static async publishThreatFeedUpdate(
    organizationId: string,
    updateType: string,
    feed: any,
    stats?: any,
    message?: string
  ) {
    const topic = createOrgTopic(TOPICS.THREAT_FEED_UPDATE, organizationId);
    
    await pubsub.publish(topic, {
      type: updateType,
      feed,
      stats,
      timestamp: new Date(),
      message: message || '',
    });
  }
  
  // Publish correlation match notifications
  static async publishCorrelationMatch(
    organizationId: string,
    correlation: any,
    match: any,
    confidence: number,
    priority: string = 'MEDIUM',
    affectedAssets: any[] = []
  ) {
    const topic = createOrgTopic(TOPICS.CORRELATION_MATCH, organizationId);
    
    await pubsub.publish(topic, {
      correlation,
      match,
      confidence,
      priority,
      timestamp: new Date(),
      affectedAssets,
    });
  }
  
  // Publish attribution updates
  static async publishAttributionUpdate(
    organizationId: string,
    updateType: string,
    threat: any,
    attribution?: any,
    confidence?: string,
    evidence?: any[]
  ) {
    const topic = createOrgTopic(TOPICS.ATTRIBUTION_UPDATE, organizationId);
    
    await pubsub.publish(topic, {
      type: updateType,
      threat,
      attribution,
      confidence,
      timestamp: new Date(),
      evidence: evidence || [],
    });
  }
  
  // Publish threat actor activity updates
  static async publishThreatActorActivity(
    organizationId: string,
    activityType: string,
    actor: any,
    activity: any,
    significance: number = 0.5
  ) {
    const topic = createOrgTopic(TOPICS.THREAT_ACTOR_ACTIVITY, organizationId);
    
    await pubsub.publish(topic, {
      type: activityType,
      actor,
      activity,
      timestamp: new Date(),
      significance,
    });
  }
  
  // Publish campaign updates
  static async publishCampaignUpdate(
    organizationId: string,
    updateType: string,
    campaign: any,
    changes: any,
    impact?: any
  ) {
    const topic = createOrgTopic(TOPICS.THREAT_CAMPAIGN_UPDATE, organizationId);
    
    await pubsub.publish(topic, {
      type: updateType,
      campaign,
      changes,
      timestamp: new Date(),
      impact,
    });
  }
  
  // Publish threat landscape updates
  static async publishThreatLandscapeUpdate(
    organizationId: string,
    updateType: string,
    changes: any,
    affectedSectors: string[] = [],
    affectedRegions: string[] = [],
    significance: number = 0.5
  ) {
    const topic = createOrgTopic(TOPICS.THREAT_LANDSCAPE_UPDATE, organizationId);
    
    await pubsub.publish(topic, {
      type: updateType,
      changes,
      timestamp: new Date(),
      affectedSectors,
      affectedRegions,
      significance,
    });
  }
  
  // Cleanup method for graceful shutdown
  static async cleanup() {
    await redis.quit();
  }
}

// Subscription health monitoring
export class SubscriptionHealthMonitor {
  private static subscriptionCounts: Map<string, number> = new Map();
  private static lastHeartbeat: Map<string, Date> = new Map();
  
  static trackSubscription(topic: string, organizationId: string) {
    const key = `${topic}:${organizationId}`;
    const current = this.subscriptionCounts.get(key) || 0;
    this.subscriptionCounts.set(key, current + 1);
    this.lastHeartbeat.set(key, new Date());
  }
  
  static untrackSubscription(topic: string, organizationId: string) {
    const key = `${topic}:${organizationId}`;
    const current = this.subscriptionCounts.get(key) || 0;
    
    if (current > 1) {
      this.subscriptionCounts.set(key, current - 1);
    } else {
      this.subscriptionCounts.delete(key);
      this.lastHeartbeat.delete(key);
    }
  }
  
  static getSubscriptionStats() {
    const stats = {
      totalSubscriptions: 0,
      subscriptionsByTopic: {} as Record<string, number>,
      activeTopics: this.subscriptionCounts.size,
    };
    
    this.subscriptionCounts.forEach((count, key) => {
      const [topic] = key.split(':');
      stats.totalSubscriptions += count;
      stats.subscriptionsByTopic[topic] = (stats.subscriptionsByTopic[topic] || 0) + count;
    });
    
    return stats;
  }
  
  static cleanupStaleSubscriptions(maxAge: number = 300000) { // 5 minutes
    const now = new Date();
    const staleKeys: string[] = [];
    
    this.lastHeartbeat.forEach((heartbeat, key) => {
      if (now.getTime() - heartbeat.getTime() > maxAge) {
        staleKeys.push(key);
      }
    });
    
    staleKeys.forEach(key => {
      this.subscriptionCounts.delete(key);
      this.lastHeartbeat.delete(key);
    });
    
    return staleKeys.length;
  }
}

// Rate limiting for subscriptions
export class SubscriptionRateLimiter {
  private static limits: Map<string, { count: number; resetTime: number }> = new Map();
  
  static checkLimit(
    organizationId: string,
    topic: string,
    maxPerMinute: number = 60
  ): boolean {
    const key = `${organizationId}:${topic}`;
    const now = Date.now();
    const windowStart = Math.floor(now / 60000) * 60000; // Start of current minute
    
    const current = this.limits.get(key);
    
    if (!current || current.resetTime !== windowStart) {
      // New window or first request
      this.limits.set(key, { count: 1, resetTime: windowStart });
      return true;
    }
    
    if (current.count >= maxPerMinute) {
      return false; // Rate limited
    }
    
    current.count++;
    return true;
  }
  
  static cleanup() {
    const now = Date.now();
    const cutoff = now - 120000; // Keep last 2 minutes
    
    this.limits.forEach((value, key) => {
      if (value.resetTime < cutoff) {
        this.limits.delete(key);
      }
    });
  }
}

// Auto-cleanup interval
setInterval(() => {
  SubscriptionHealthMonitor.cleanupStaleSubscriptions();
  SubscriptionRateLimiter.cleanup();
}, 60000); // Every minute
