import { PubSub } from 'graphql-subscriptions';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import Redis from 'ioredis';
import { GraphQLError } from 'graphql';
import { withFilter } from 'graphql-subscriptions';

// Subscription event types
export enum SubscriptionEvents {
  // Security Events
  SECURITY_EVENT_CREATED = 'SECURITY_EVENT_CREATED',
  SECURITY_EVENT_UPDATED = 'SECURITY_EVENT_UPDATED',
  SECURITY_EVENT_BATCH_PROCESSED = 'SECURITY_EVENT_BATCH_PROCESSED',
  
  // Alerts
  ALERT_CREATED = 'ALERT_CREATED',
  ALERT_UPDATED = 'ALERT_UPDATED',
  ALERT_STATUS_CHANGED = 'ALERT_STATUS_CHANGED',
  ALERT_ASSIGNED = 'ALERT_ASSIGNED',
  ALERT_ESCALATED = 'ALERT_ESCALATED',
  
  // Incidents
  INCIDENT_CREATED = 'INCIDENT_CREATED',
  INCIDENT_UPDATED = 'INCIDENT_UPDATED',
  INCIDENT_STATUS_CHANGED = 'INCIDENT_STATUS_CHANGED',
  INCIDENT_ASSIGNED = 'INCIDENT_ASSIGNED',
  
  // Assets
  ASSET_HEALTH_CHANGED = 'ASSET_HEALTH_CHANGED',
  ASSET_RISK_SCORE_UPDATED = 'ASSET_RISK_SCORE_UPDATED',
  ASSET_VULNERABILITY_DETECTED = 'ASSET_VULNERABILITY_DETECTED',
  
  // Threat Intelligence
  THREAT_DETECTED = 'THREAT_DETECTED',
  IOC_MATCHED = 'IOC_MATCHED',
  THREAT_ACTOR_ACTIVITY = 'THREAT_ACTOR_ACTIVITY',
  
  // System Events
  SYSTEM_HEALTH_UPDATE = 'SYSTEM_HEALTH_UPDATE',
  COMPLIANCE_STATUS_CHANGED = 'COMPLIANCE_STATUS_CHANGED',
  USER_ACTIVITY = 'USER_ACTIVITY',
  
  // Analytics
  METRICS_UPDATED = 'METRICS_UPDATED',
  ANOMALY_DETECTED = 'ANOMALY_DETECTED',
  PATTERN_DETECTED = 'PATTERN_DETECTED',
  
  // Real-time Dashboard
  DASHBOARD_DATA_UPDATED = 'DASHBOARD_DATA_UPDATED',
  KPI_THRESHOLD_CROSSED = 'KPI_THRESHOLD_CROSSED',
}

// Subscription payload interfaces
export interface SecurityEventPayload {
  type: 'CREATED' | 'UPDATED' | 'BATCH_PROCESSED';
  event?: any;
  events?: any[];
  organizationId: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface AlertPayload {
  type: 'CREATED' | 'UPDATED' | 'STATUS_CHANGED' | 'ASSIGNED' | 'ESCALATED';
  alert: any;
  previousValues?: Record<string, any>;
  organizationId: string;
  userId?: string;
  timestamp: Date;
}

export interface IncidentPayload {
  type: 'CREATED' | 'UPDATED' | 'STATUS_CHANGED' | 'ASSIGNED';
  incident: any;
  previousValues?: Record<string, any>;
  organizationId: string;
  userId?: string;
  timestamp: Date;
}

export interface AssetPayload {
  type: 'HEALTH_CHANGED' | 'RISK_SCORE_UPDATED' | 'VULNERABILITY_DETECTED';
  asset: any;
  previousValues?: Record<string, any>;
  organizationId: string;
  timestamp: Date;
}

export interface ThreatPayload {
  type: 'THREAT_DETECTED' | 'IOC_MATCHED' | 'THREAT_ACTOR_ACTIVITY';
  threat?: any;
  ioc?: any;
  threatActor?: any;
  severity: string;
  organizationId: string;
  affectedAssets?: string[];
  timestamp: Date;
}

export interface SystemPayload {
  type: 'HEALTH_UPDATE' | 'COMPLIANCE_STATUS_CHANGED' | 'USER_ACTIVITY';
  data: any;
  organizationId: string;
  userId?: string;
  timestamp: Date;
}

export interface AnalyticsPayload {
  type: 'METRICS_UPDATED' | 'ANOMALY_DETECTED' | 'PATTERN_DETECTED';
  metrics?: any;
  anomaly?: any;
  pattern?: any;
  organizationId: string;
  severity?: string;
  confidence?: number;
  timestamp: Date;
}

// Create PubSub instance based on environment
export const createPubSub = () => {
  const redisUrl = process.env.REDIS_URL;
  
  if (redisUrl) {
    // Production: Use Redis for horizontal scaling
    console.log('🚀 Initializing Redis PubSub for subscriptions');
    
    const redis = new Redis(redisUrl, {
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    });
    
    return new RedisPubSub({
      publisher: redis,
      subscriber: redis.duplicate(),
    });
  } else {
    // Development: Use in-memory PubSub
    console.log('🔧 Using in-memory PubSub for development');
    return new PubSub();
  }
};

// Initialize global PubSub instance
export const pubsub = createPubSub();

// Authentication context interface
interface AuthContext {
  user?: {
    id: string;
    organizationId: string;
    role: string;
    permissions: string[];
  };
  organizationId?: string;
}

// Organization filter helper
export const organizationFilter = (
  payload: any,
  variables: any,
  context: AuthContext
) => {
  // Ensure user is authenticated
  if (!context.user) {
    return false;
  }
  
  // Check if event belongs to user's organization
  const eventOrgId = payload.organizationId || payload.data?.organizationId;
  const userOrgId = context.user.organizationId;
  
  // Super admins can see all organizations
  if (context.user.role === 'SUPER_ADMIN') {
    return variables.organizationId ? variables.organizationId === eventOrgId : true;
  }
  
  // Regular users can only see their organization's events
  return eventOrgId === userOrgId;
};

// Severity filter helper
export const severityFilter = (
  payload: any,
  variables: any
) => {
  if (!variables.severityThreshold) {
    return true;
  }
  
  const severityLevels = {
    'LOW': 0,
    'MEDIUM': 1,
    'HIGH': 2,
    'CRITICAL': 3,
  };
  
  const eventSeverity = payload.severity || payload.alert?.severity || payload.threat?.severity;
  const thresholdLevel = severityLevels[variables.severityThreshold as keyof typeof severityLevels];
  const eventLevel = severityLevels[eventSeverity as keyof typeof severityLevels];
  
  return eventLevel >= thresholdLevel;
};

// User-specific filter helper
export const userFilter = (
  payload: any,
  variables: any,
  context: AuthContext
) => {
  if (!variables.userId && !context.user) {
    return false;
  }
  
  const targetUserId = variables.userId || context.user!.id;
  const eventUserId = payload.userId || payload.alert?.assignedToId || payload.incident?.assignedToId;
  
  return eventUserId === targetUserId;
};

// Asset filter helper
export const assetFilter = (
  payload: any,
  variables: any
) => {
  if (!variables.assetIds || variables.assetIds.length === 0) {
    return true;
  }
  
  const eventAssetId = payload.assetId || payload.alert?.assetId || payload.event?.assetId;
  const affectedAssets = payload.affectedAssets || [];
  
  return variables.assetIds.includes(eventAssetId) || 
         affectedAssets.some((assetId: string) => variables.assetIds.includes(assetId));
};

// Custom filter composition helper
export const combineFilters = (...filters: Function[]) => {
  return (payload: any, variables: any, context: any) => {
    return filters.every(filter => filter(payload, variables, context));
  };
};

// Subscription resolvers with filtering
export const subscriptionResolvers = {
  Subscription: {
    // Security Events Real-time Stream
    securityEventStream: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([
          SubscriptionEvents.SECURITY_EVENT_CREATED,
          SubscriptionEvents.SECURITY_EVENT_UPDATED,
          SubscriptionEvents.SECURITY_EVENT_BATCH_PROCESSED,
        ]),
        combineFilters(organizationFilter, severityFilter)
      ),
      resolve: (payload: SecurityEventPayload) => ({
        type: payload.type,
        event: payload.event,
        events: payload.events,
        timestamp: payload.timestamp,
        metadata: payload.metadata,
      }),
    },
    
    // Alert Updates
    alertUpdates: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([
          SubscriptionEvents.ALERT_CREATED,
          SubscriptionEvents.ALERT_UPDATED,
          SubscriptionEvents.ALERT_STATUS_CHANGED,
          SubscriptionEvents.ALERT_ASSIGNED,
          SubscriptionEvents.ALERT_ESCALATED,
        ]),
        combineFilters(organizationFilter, severityFilter, assetFilter)
      ),
      resolve: (payload: AlertPayload) => ({
        type: payload.type,
        alert: payload.alert,
        previousValues: payload.previousValues,
        timestamp: payload.timestamp,
      }),
    },
    
    // Assignment Updates for specific users
    assignmentUpdates: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([
          SubscriptionEvents.ALERT_ASSIGNED,
          SubscriptionEvents.INCIDENT_ASSIGNED,
        ]),
        combineFilters(organizationFilter, userFilter)
      ),
      resolve: (payload: any) => ({
        type: payload.type,
        alert: payload.alert,
        incident: payload.incident,
        assignee: payload.assignee,
        timestamp: payload.timestamp,
      }),
    },
    
    // Incident Updates
    incidentUpdates: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([
          SubscriptionEvents.INCIDENT_CREATED,
          SubscriptionEvents.INCIDENT_UPDATED,
          SubscriptionEvents.INCIDENT_STATUS_CHANGED,
        ]),
        combineFilters(organizationFilter, severityFilter)
      ),
      resolve: (payload: IncidentPayload) => ({
        type: payload.type,
        incident: payload.incident,
        previousValues: payload.previousValues,
        timestamp: payload.timestamp,
      }),
    },
    
    // Asset Health and Risk Updates
    assetHealthUpdates: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([
          SubscriptionEvents.ASSET_HEALTH_CHANGED,
          SubscriptionEvents.ASSET_RISK_SCORE_UPDATED,
          SubscriptionEvents.ASSET_VULNERABILITY_DETECTED,
        ]),
        combineFilters(organizationFilter, assetFilter)
      ),
      resolve: (payload: AssetPayload) => ({
        type: payload.type,
        asset: payload.asset,
        previousValues: payload.previousValues,
        timestamp: payload.timestamp,
      }),
    },
    
    // Threat Detection Alerts
    threatDetected: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([
          SubscriptionEvents.THREAT_DETECTED,
          SubscriptionEvents.IOC_MATCHED,
          SubscriptionEvents.THREAT_ACTOR_ACTIVITY,
        ]),
        combineFilters(organizationFilter, severityFilter)
      ),
      resolve: (payload: ThreatPayload) => ({
        type: payload.type,
        threat: payload.threat,
        ioc: payload.ioc,
        threatActor: payload.threatActor,
        severity: payload.severity,
        affectedAssets: payload.affectedAssets,
        timestamp: payload.timestamp,
      }),
    },
    
    // System Health and Compliance Updates
    systemUpdates: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([
          SubscriptionEvents.SYSTEM_HEALTH_UPDATE,
          SubscriptionEvents.COMPLIANCE_STATUS_CHANGED,
        ]),
        organizationFilter
      ),
      resolve: (payload: SystemPayload) => ({
        type: payload.type,
        data: payload.data,
        timestamp: payload.timestamp,
      }),
    },
    
    // Analytics and Anomaly Detection
    analyticsUpdates: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([
          SubscriptionEvents.METRICS_UPDATED,
          SubscriptionEvents.ANOMALY_DETECTED,
          SubscriptionEvents.PATTERN_DETECTED,
        ]),
        organizationFilter
      ),
      resolve: (payload: AnalyticsPayload) => ({
        type: payload.type,
        metrics: payload.metrics,
        anomaly: payload.anomaly,
        pattern: payload.pattern,
        confidence: payload.confidence,
        timestamp: payload.timestamp,
      }),
    },
    
    // Real-time Dashboard Updates
    dashboardUpdates: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([
          SubscriptionEvents.DASHBOARD_DATA_UPDATED,
          SubscriptionEvents.KPI_THRESHOLD_CROSSED,
        ]),
        organizationFilter
      ),
      resolve: (payload: any) => ({
        type: payload.type,
        dashboard: payload.dashboard,
        metrics: payload.metrics,
        threshold: payload.threshold,
        timestamp: payload.timestamp,
      }),
    },
  },
};

// Event Publisher Helper Class
export class EventPublisher {
  constructor(private pubsub: PubSub | RedisPubSub) {}
  
  // Publish security event
  async publishSecurityEvent(payload: SecurityEventPayload) {
    const eventType = payload.type === 'CREATED' 
      ? SubscriptionEvents.SECURITY_EVENT_CREATED
      : payload.type === 'UPDATED'
      ? SubscriptionEvents.SECURITY_EVENT_UPDATED
      : SubscriptionEvents.SECURITY_EVENT_BATCH_PROCESSED;
    
    await this.pubsub.publish(eventType, payload);
    console.log(`📡 Published ${eventType} for org ${payload.organizationId}`);
  }
  
  // Publish alert update
  async publishAlertUpdate(payload: AlertPayload) {
    const eventType = payload.type === 'CREATED'
      ? SubscriptionEvents.ALERT_CREATED
      : payload.type === 'STATUS_CHANGED'
      ? SubscriptionEvents.ALERT_STATUS_CHANGED
      : payload.type === 'ASSIGNED'
      ? SubscriptionEvents.ALERT_ASSIGNED
      : payload.type === 'ESCALATED'
      ? SubscriptionEvents.ALERT_ESCALATED
      : SubscriptionEvents.ALERT_UPDATED;
    
    await this.pubsub.publish(eventType, payload);
    console.log(`📡 Published ${eventType} for alert ${payload.alert.id}`);
  }
  
  // Publish incident update
  async publishIncidentUpdate(payload: IncidentPayload) {
    const eventType = payload.type === 'CREATED'
      ? SubscriptionEvents.INCIDENT_CREATED
      : payload.type === 'STATUS_CHANGED'
      ? SubscriptionEvents.INCIDENT_STATUS_CHANGED
      : payload.type === 'ASSIGNED'
      ? SubscriptionEvents.INCIDENT_ASSIGNED
      : SubscriptionEvents.INCIDENT_UPDATED;
    
    await this.pubsub.publish(eventType, payload);
    console.log(`📡 Published ${eventType} for incident ${payload.incident.id}`);
  }
  
  // Publish asset update
  async publishAssetUpdate(payload: AssetPayload) {
    const eventType = payload.type === 'HEALTH_CHANGED'
      ? SubscriptionEvents.ASSET_HEALTH_CHANGED
      : payload.type === 'RISK_SCORE_UPDATED'
      ? SubscriptionEvents.ASSET_RISK_SCORE_UPDATED
      : SubscriptionEvents.ASSET_VULNERABILITY_DETECTED;
    
    await this.pubsub.publish(eventType, payload);
    console.log(`📡 Published ${eventType} for asset ${payload.asset.id}`);
  }
  
  // Publish threat detection
  async publishThreatDetection(payload: ThreatPayload) {
    const eventType = payload.type === 'THREAT_DETECTED'
      ? SubscriptionEvents.THREAT_DETECTED
      : payload.type === 'IOC_MATCHED'
      ? SubscriptionEvents.IOC_MATCHED
      : SubscriptionEvents.THREAT_ACTOR_ACTIVITY;
    
    await this.pubsub.publish(eventType, payload);
    console.log(`📡 Published ${eventType} with severity ${payload.severity}`);
  }
  
  // Publish system update
  async publishSystemUpdate(payload: SystemPayload) {
    const eventType = payload.type === 'HEALTH_UPDATE'
      ? SubscriptionEvents.SYSTEM_HEALTH_UPDATE
      : payload.type === 'COMPLIANCE_STATUS_CHANGED'
      ? SubscriptionEvents.COMPLIANCE_STATUS_CHANGED
      : SubscriptionEvents.USER_ACTIVITY;
    
    await this.pubsub.publish(eventType, payload);
    console.log(`📡 Published ${eventType} for org ${payload.organizationId}`);
  }
  
  // Publish analytics update
  async publishAnalyticsUpdate(payload: AnalyticsPayload) {
    const eventType = payload.type === 'METRICS_UPDATED'
      ? SubscriptionEvents.METRICS_UPDATED
      : payload.type === 'ANOMALY_DETECTED'
      ? SubscriptionEvents.ANOMALY_DETECTED
      : SubscriptionEvents.PATTERN_DETECTED;
    
    await this.pubsub.publish(eventType, payload);
    console.log(`📡 Published ${eventType} for org ${payload.organizationId}`);
  }
  
  // Publish dashboard update
  async publishDashboardUpdate(payload: any) {
    const eventType = payload.type === 'KPI_THRESHOLD_CROSSED'
      ? SubscriptionEvents.KPI_THRESHOLD_CROSSED
      : SubscriptionEvents.DASHBOARD_DATA_UPDATED;
    
    await this.pubsub.publish(eventType, payload);
    console.log(`📡 Published ${eventType} for org ${payload.organizationId}`);
  }
}

// Create global event publisher
export const eventPublisher = new EventPublisher(pubsub);

// Subscription connection management
export class SubscriptionManager {
  private connections: Map<string, Set<string>> = new Map();
  
  // Track user connections
  addConnection(userId: string, connectionId: string) {
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Set());
    }
    this.connections.get(userId)!.add(connectionId);
    console.log(`👤 User ${userId} connected with connection ${connectionId}`);
  }
  
  // Remove user connections
  removeConnection(userId: string, connectionId: string) {
    const userConnections = this.connections.get(userId);
    if (userConnections) {
      userConnections.delete(connectionId);
      if (userConnections.size === 0) {
        this.connections.delete(userId);
      }
    }
    console.log(`👋 User ${userId} disconnected connection ${connectionId}`);
  }
  
  // Get active connections for a user
  getUserConnections(userId: string): Set<string> {
    return this.connections.get(userId) || new Set();
  }
  
  // Get total active connections
  getTotalConnections(): number {
    return Array.from(this.connections.values())
      .reduce((total, connections) => total + connections.size, 0);
  }
  
  // Get connection statistics
  getConnectionStats() {
    const userCount = this.connections.size;
    const totalConnections = this.getTotalConnections();
    const averageConnectionsPerUser = userCount > 0 ? totalConnections / userCount : 0;
    
    return {
      activeUsers: userCount,
      totalConnections,
      averageConnectionsPerUser: Math.round(averageConnectionsPerUser * 100) / 100,
    };
  }
}

// Create global subscription manager
export const subscriptionManager = new SubscriptionManager();

// WebSocket connection lifecycle handlers
export const onConnect = (connectionParams: any, websocket: any, context: any) => {
  console.log('🔌 WebSocket connection initiated');
  
  // Extract authentication token
  const token = connectionParams?.Authorization || connectionParams?.authorization;
  if (!token) {
    throw new GraphQLError('Authentication required for subscriptions', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  
  // Store connection info for tracking
  return {
    token: token.replace('Bearer ', ''),
    connectedAt: new Date(),
    connectionId: Math.random().toString(36).substring(2, 15),
  };
};

export const onDisconnect = (websocket: any, context: any) => {
  console.log('🔌 WebSocket connection closed');
  
  // Clean up connection tracking
  if (context.userId && context.connectionId) {
    subscriptionManager.removeConnection(context.userId, context.connectionId);
  }
};

// Rate limiting for subscriptions
export class SubscriptionRateLimiter {
  private subscriptionCounts: Map<string, { count: number; resetTime: number }> = new Map();
  
  checkRateLimit(userId: string, maxSubscriptions: number = 50, windowMs: number = 60000): boolean {
    const now = Date.now();
    const userLimit = this.subscriptionCounts.get(userId);
    
    if (!userLimit || now > userLimit.resetTime) {
      this.subscriptionCounts.set(userId, { count: 1, resetTime: now + windowMs });
      return true;
    }
    
    if (userLimit.count >= maxSubscriptions) {
      return false;
    }
    
    userLimit.count++;
    return true;
  }
  
  cleanup() {
    const now = Date.now();
    for (const [userId, limit] of this.subscriptionCounts.entries()) {
      if (now > limit.resetTime) {
        this.subscriptionCounts.delete(userId);
      }
    }
  }
}

// Create global rate limiter
export const subscriptionRateLimiter = new SubscriptionRateLimiter();

// Cleanup interval for rate limiter
setInterval(() => {
  subscriptionRateLimiter.cleanup();
}, 60000); // Clean up every minute

// Export subscription utilities
export {
  withFilter,
  organizationFilter,
  severityFilter,
  userFilter,
  assetFilter,
  combineFilters,
};

// Health check for subscription system
export const subscriptionHealthCheck = () => {
  const stats = subscriptionManager.getConnectionStats();
  
  return {
    status: 'healthy',
    connections: stats,
    pubsubConnected: true, // In production, check Redis connection
    timestamp: new Date(),
  };
};