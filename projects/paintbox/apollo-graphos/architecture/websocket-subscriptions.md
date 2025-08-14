# Apollo GraphOS Federation - WebSocket Subscription Architecture

## Overview
This document defines the WebSocket subscription architecture for real-time updates across all subgraphs in the Apollo GraphOS federation. The system is designed to handle 100 concurrent users with efficient message routing, connection management, and horizontal scalability.

## Architecture Components

### 1. Subscription Transport Layer

#### WebSocket Server Configuration
```typescript
interface SubscriptionServerConfig {
  port: number;
  path: string;
  maxConnections: number;
  connectionTimeout: number;
  heartbeatInterval: number;
  messageQueueSize: number;
  enableCompression: boolean;
  enableAuthentication: boolean;
}

const WEBSOCKET_CONFIG = {
  development: {
    port: 4000,
    path: '/graphql/subscriptions',
    maxConnections: 1000,
    connectionTimeout: 30000,      // 30 seconds
    heartbeatInterval: 25000,      // 25 seconds
    messageQueueSize: 100,
    enableCompression: true,
    enableAuthentication: true
  },
  production: {
    port: 4000,
    path: '/graphql/subscriptions',
    maxConnections: 10000,
    connectionTimeout: 60000,      // 60 seconds  
    heartbeatInterval: 55000,      // 55 seconds
    messageQueueSize: 1000,
    enableCompression: true,
    enableAuthentication: true
  }
};
```

### 2. Subscription Gateway Architecture

#### Federated Subscription Routing
```typescript
// Subscription routing configuration
interface SubscriptionRoute {
  subscriptionName: string;
  subgraph: string;
  requiresAuth: boolean;
  rateLimit: {
    maxConnections: number;
    windowMs: number;
  };
  channels: string[];
}

const SUBSCRIPTION_ROUTES: SubscriptionRoute[] = [
  // Estimates Subgraph
  {
    subscriptionName: 'estimateUpdated',
    subgraph: 'estimates',
    requiresAuth: true,
    rateLimit: { maxConnections: 10, windowMs: 60000 },
    channels: ['estimate:{id}', 'customer:{customerId}:estimates']
  },
  {
    subscriptionName: 'calculationProgress',
    subgraph: 'estimates', 
    requiresAuth: true,
    rateLimit: { maxConnections: 5, windowMs: 60000 },
    channels: ['estimate:{estimateId}:calculation']
  },
  
  // Customers Subgraph
  {
    subscriptionName: 'customerUpdated',
    subgraph: 'customers',
    requiresAuth: true,
    rateLimit: { maxConnections: 20, windowMs: 60000 },
    channels: ['customer:{id}', 'salesforce:customer:{salesforceId}']
  },
  {
    subscriptionName: 'customerSyncStatus',
    subgraph: 'customers',
    requiresAuth: true,
    rateLimit: { maxConnections: 5, windowMs: 60000 },
    channels: ['customer:{id}:sync', 'admin:sync:customers']
  },
  
  // Projects Subgraph
  {
    subscriptionName: 'projectUpdated',
    subgraph: 'projects',
    requiresAuth: true,
    rateLimit: { maxConnections: 15, windowMs: 60000 },
    channels: ['project:{id}', 'customer:{customerId}:projects']
  },
  {
    subscriptionName: 'projectPhotoAdded',
    subgraph: 'projects',
    requiresAuth: true,
    rateLimit: { maxConnections: 25, windowMs: 60000 },
    channels: ['project:{projectId}:photos', 'companycam:{companyCamId}:photos']
  },
  {
    subscriptionName: 'projectStatusChanged',
    subgraph: 'projects',
    requiresAuth: true,
    rateLimit: { maxConnections: 10, windowMs: 60000 },
    channels: ['project:{id}:status', 'customer:{customerId}:project:status']
  },
  
  // Integrations Subgraph
  {
    subscriptionName: 'integrationHealthChanged',
    subgraph: 'integrations',
    requiresAuth: true,
    rateLimit: { maxConnections: 5, windowMs: 60000 },
    channels: ['integration:{service}:health', 'admin:integrations:health']
  },
  {
    subscriptionName: 'syncProgress',
    subgraph: 'integrations',
    requiresAuth: true,
    rateLimit: { maxConnections: 10, windowMs: 60000 },
    channels: ['sync:{service}:progress', 'admin:sync:progress']
  },
  {
    subscriptionName: 'bulkSyncProgress',
    subgraph: 'integrations',
    requiresAuth: true,
    rateLimit: { maxConnections: 3, windowMs: 60000 },
    channels: ['bulk-sync:{operationId}', 'admin:bulk-sync']
  }
];
```

### 3. Message Broker Integration (Redis Pub/Sub)

#### Channel Management
```typescript
interface SubscriptionChannel {
  pattern: string;
  description: string;
  dataFormat: string;
  persistence: boolean;
  maxMessages: number;
}

const SUBSCRIPTION_CHANNELS: Record<string, SubscriptionChannel> = {
  // Entity-specific channels
  'customer:{id}': {
    pattern: 'customer:*',
    description: 'Customer entity updates',
    dataFormat: 'CustomerUpdateEvent',
    persistence: false,
    maxMessages: 100
  },
  
  'project:{id}': {
    pattern: 'project:*',
    description: 'Project entity updates', 
    dataFormat: 'ProjectUpdateEvent',
    persistence: false,
    maxMessages: 100
  },
  
  'estimate:{id}': {
    pattern: 'estimate:*',
    description: 'Estimate entity updates',
    dataFormat: 'EstimateUpdateEvent',
    persistence: false,
    maxMessages: 100
  },
  
  // Relationship channels
  'customer:{customerId}:estimates': {
    pattern: 'customer:*:estimates',
    description: 'Customer estimate relationship updates',
    dataFormat: 'CustomerEstimateEvent',
    persistence: false,
    maxMessages: 50
  },
  
  'customer:{customerId}:projects': {
    pattern: 'customer:*:projects',
    description: 'Customer project relationship updates',
    dataFormat: 'CustomerProjectEvent', 
    persistence: false,
    maxMessages: 50
  },
  
  // Photo and media channels
  'project:{projectId}:photos': {
    pattern: 'project:*:photos',
    description: 'Project photo additions/updates',
    dataFormat: 'ProjectPhotoEvent',
    persistence: true,  // Photos are important to persist briefly
    maxMessages: 200
  },
  
  // Status change channels
  'project:{id}:status': {
    pattern: 'project:*:status',
    description: 'Project status changes',
    dataFormat: 'ProjectStatusEvent',
    persistence: true,
    maxMessages: 50
  },
  
  // Integration and sync channels
  'integration:{service}:health': {
    pattern: 'integration:*:health',
    description: 'Integration health status changes',
    dataFormat: 'IntegrationHealthEvent',
    persistence: true,
    maxMessages: 20
  },
  
  'sync:{service}:progress': {
    pattern: 'sync:*:progress',
    description: 'Sync operation progress updates',
    dataFormat: 'SyncProgressEvent',
    persistence: false,
    maxMessages: 100
  },
  
  // Admin channels
  'admin:sync:customers': {
    pattern: 'admin:sync:*',
    description: 'Admin sync monitoring',
    dataFormat: 'AdminSyncEvent',
    persistence: true,
    maxMessages: 100
  }
};
```

#### Event Data Formats
```typescript
// Base event structure
interface BaseSubscriptionEvent {
  eventId: string;
  eventType: string;
  timestamp: string;
  source: string;
  userId?: string;
  metadata?: Record<string, any>;
}

// Specific event types
interface CustomerUpdateEvent extends BaseSubscriptionEvent {
  eventType: 'CUSTOMER_UPDATED';
  customer: Customer;
  previousValues?: Partial<Customer>;
  changeReason?: string;
}

interface ProjectUpdateEvent extends BaseSubscriptionEvent {
  eventType: 'PROJECT_UPDATED';
  project: Project;
  previousValues?: Partial<Project>;
  changeReason?: string;
}

interface EstimateUpdateEvent extends BaseSubscriptionEvent {
  eventType: 'ESTIMATE_UPDATED';
  estimate: Estimate;
  previousValues?: Partial<Estimate>;
  changeReason?: string;
}

interface ProjectPhotoEvent extends BaseSubscriptionEvent {
  eventType: 'PROJECT_PHOTO_ADDED';
  projectId: string;
  photo: ProjectPhoto;
  uploadedBy: string;
}

interface ProjectStatusEvent extends BaseSubscriptionEvent {
  eventType: 'PROJECT_STATUS_CHANGED';
  projectId: string;
  oldStatus: ProjectStatus;
  newStatus: ProjectStatus;
  reason?: string;
  changedBy: string;
}

interface IntegrationHealthEvent extends BaseSubscriptionEvent {
  eventType: 'INTEGRATION_HEALTH_CHANGED';
  service: IntegrationService;
  oldStatus: IntegrationStatus;
  newStatus: IntegrationStatus;
  healthMetrics: IntegrationHealth;
}

interface SyncProgressEvent extends BaseSubscriptionEvent {
  eventType: 'SYNC_PROGRESS_UPDATE';
  service: IntegrationService;
  operationId: string;
  progress: SyncProgress;
}

interface CalculationProgressEvent extends BaseSubscriptionEvent {
  eventType: 'CALCULATION_PROGRESS';
  estimateId: string;
  stage: string;
  progress: number; // 0-100
  message?: string;
  completed: boolean;
}
```

### 4. Connection Management

#### Connection State Management
```typescript
interface SubscriptionConnection {
  id: string;
  userId: string;
  connectionTime: Date;
  lastActivity: Date;
  subscriptions: Map<string, SubscriptionInfo>;
  metadata: ConnectionMetadata;
  rateLimitState: RateLimitState;
}

interface SubscriptionInfo {
  subscriptionId: string;
  operationName: string;
  variables: Record<string, any>;
  channels: string[];
  createdAt: Date;
  messageCount: number;
}

interface ConnectionMetadata {
  userAgent: string;
  ipAddress: string;
  authToken: string;
  permissions: string[];
  tenant?: string;
}

interface RateLimitState {
  connections: number;
  messagesInWindow: number;
  windowStart: Date;
  blocked: boolean;
  nextResetTime?: Date;
}

class SubscriptionConnectionManager {
  private connections = new Map<string, SubscriptionConnection>();
  private userConnections = new Map<string, Set<string>>(); // userId -> connectionIds
  private channelSubscriptions = new Map<string, Set<string>>(); // channel -> connectionIds
  
  addConnection(connection: SubscriptionConnection): void {
    this.connections.set(connection.id, connection);
    
    if (!this.userConnections.has(connection.userId)) {
      this.userConnections.set(connection.userId, new Set());
    }
    this.userConnections.get(connection.userId)!.add(connection.id);
  }
  
  removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      // Remove from user connections
      const userConnections = this.userConnections.get(connection.userId);
      if (userConnections) {
        userConnections.delete(connectionId);
        if (userConnections.size === 0) {
          this.userConnections.delete(connection.userId);
        }
      }
      
      // Remove from channel subscriptions
      connection.subscriptions.forEach(sub => {
        sub.channels.forEach(channel => {
          const channelSubs = this.channelSubscriptions.get(channel);
          if (channelSubs) {
            channelSubs.delete(connectionId);
            if (channelSubs.size === 0) {
              this.channelSubscriptions.delete(channel);
            }
          }
        });
      });
      
      this.connections.delete(connectionId);
    }
  }
  
  addSubscription(connectionId: string, subscription: SubscriptionInfo): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.subscriptions.set(subscription.subscriptionId, subscription);
      
      // Add to channel subscriptions
      subscription.channels.forEach(channel => {
        if (!this.channelSubscriptions.has(channel)) {
          this.channelSubscriptions.set(channel, new Set());
        }
        this.channelSubscriptions.get(channel)!.add(connectionId);
      });
    }
  }
  
  removeSubscription(connectionId: string, subscriptionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      const subscription = connection.subscriptions.get(subscriptionId);
      if (subscription) {
        // Remove from channel subscriptions
        subscription.channels.forEach(channel => {
          const channelSubs = this.channelSubscriptions.get(channel);
          if (channelSubs) {
            channelSubs.delete(connectionId);
            if (channelSubs.size === 0) {
              this.channelSubscriptions.delete(channel);
            }
          }
        });
        
        connection.subscriptions.delete(subscriptionId);
      }
    }
  }
  
  getConnectionsByChannel(channel: string): Set<string> {
    return this.channelSubscriptions.get(channel) || new Set();
  }
  
  getConnectionsByUser(userId: string): Set<string> {
    return this.userConnections.get(userId) || new Set();
  }
  
  getConnectionCount(): number {
    return this.connections.size;
  }
  
  getChannelCount(): number {
    return this.channelSubscriptions.size;
  }
}
```

### 5. Authentication and Authorization

#### JWT-Based WebSocket Authentication
```typescript
interface SubscriptionAuthContext {
  userId: string;
  email: string;
  roles: string[];
  permissions: string[];
  tenantId?: string;
  sessionId: string;
  expiresAt: Date;
}

class SubscriptionAuthenticator {
  async authenticate(token: string): Promise<SubscriptionAuthContext | null> {
    try {
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      
      // Check expiration
      if (decoded.exp && decoded.exp < Date.now() / 1000) {
        return null;
      }
      
      // Build auth context
      return {
        userId: decoded.sub,
        email: decoded.email,
        roles: decoded.roles || [],
        permissions: decoded.permissions || [],
        tenantId: decoded.tenant,
        sessionId: decoded.jti,
        expiresAt: new Date(decoded.exp * 1000)
      };
    } catch (error) {
      return null;
    }
  }
  
  authorize(
    authContext: SubscriptionAuthContext,
    subscriptionName: string,
    variables: Record<string, any>
  ): boolean {
    // Implement subscription-specific authorization logic
    switch (subscriptionName) {
      case 'estimateUpdated':
        return this.canAccessEstimate(authContext, variables.id);
        
      case 'customerUpdated':
        return this.canAccessCustomer(authContext, variables.id);
        
      case 'projectUpdated':
      case 'projectPhotoAdded':
      case 'projectStatusChanged':
        return this.canAccessProject(authContext, variables.id || variables.projectId);
        
      case 'integrationHealthChanged':
      case 'syncProgress':
        return authContext.roles.includes('admin') || 
               authContext.permissions.includes('view:integrations');
        
      default:
        return false;
    }
  }
  
  private canAccessEstimate(auth: SubscriptionAuthContext, estimateId: string): boolean {
    // Check if user can access this specific estimate
    // This would typically involve a database lookup
    return auth.permissions.includes('view:estimates') ||
           auth.permissions.includes('view:own:estimates');
  }
  
  private canAccessCustomer(auth: SubscriptionAuthContext, customerId: string): boolean {
    return auth.permissions.includes('view:customers') ||
           auth.permissions.includes('view:own:customers');
  }
  
  private canAccessProject(auth: SubscriptionAuthContext, projectId: string): boolean {
    return auth.permissions.includes('view:projects') ||
           auth.permissions.includes('view:own:projects');
  }
}
```

### 6. Rate Limiting and Throttling

#### Per-User and Per-Connection Rate Limiting
```typescript
interface RateLimitConfig {
  maxConnectionsPerUser: number;
  maxSubscriptionsPerConnection: number;
  maxMessagesPerMinute: number;
  windowSizeMs: number;
  blockDurationMs: number;
}

const RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxConnectionsPerUser: 5,
  maxSubscriptionsPerConnection: 10,
  maxMessagesPerMinute: 100,
  windowSizeMs: 60000,      // 1 minute
  blockDurationMs: 300000   // 5 minutes
};

class SubscriptionRateLimiter {
  private userLimits = new Map<string, UserRateLimitState>();
  private connectionLimits = new Map<string, ConnectionRateLimitState>();
  
  checkConnectionLimit(userId: string): boolean {
    const userState = this.getUserState(userId);
    return userState.activeConnections < RATE_LIMIT_CONFIG.maxConnectionsPerUser;
  }
  
  checkSubscriptionLimit(connectionId: string): boolean {
    const connectionState = this.getConnectionState(connectionId);
    return connectionState.activeSubscriptions < RATE_LIMIT_CONFIG.maxSubscriptionsPerConnection;
  }
  
  checkMessageRate(connectionId: string): boolean {
    const connectionState = this.getConnectionState(connectionId);
    const now = Date.now();
    
    // Reset window if needed
    if (now - connectionState.windowStart >= RATE_LIMIT_CONFIG.windowSizeMs) {
      connectionState.messagesInWindow = 0;
      connectionState.windowStart = now;
    }
    
    // Check if blocked
    if (connectionState.blockedUntil && now < connectionState.blockedUntil) {
      return false;
    }
    
    // Check rate limit
    if (connectionState.messagesInWindow >= RATE_LIMIT_CONFIG.maxMessagesPerMinute) {
      connectionState.blockedUntil = now + RATE_LIMIT_CONFIG.blockDurationMs;
      return false;
    }
    
    return true;
  }
  
  recordMessage(connectionId: string): void {
    const connectionState = this.getConnectionState(connectionId);
    connectionState.messagesInWindow++;
    connectionState.lastMessage = Date.now();
  }
  
  private getUserState(userId: string): UserRateLimitState {
    if (!this.userLimits.has(userId)) {
      this.userLimits.set(userId, {
        userId,
        activeConnections: 0,
        firstConnection: Date.now()
      });
    }
    return this.userLimits.get(userId)!;
  }
  
  private getConnectionState(connectionId: string): ConnectionRateLimitState {
    if (!this.connectionLimits.has(connectionId)) {
      this.connectionLimits.set(connectionId, {
        connectionId,
        activeSubscriptions: 0,
        messagesInWindow: 0,
        windowStart: Date.now(),
        lastMessage: Date.now(),
        blockedUntil: null
      });
    }
    return this.connectionLimits.get(connectionId)!;
  }
}

interface UserRateLimitState {
  userId: string;
  activeConnections: number;
  firstConnection: number;
}

interface ConnectionRateLimitState {
  connectionId: string;
  activeSubscriptions: number;
  messagesInWindow: number;
  windowStart: number;
  lastMessage: number;
  blockedUntil: number | null;
}
```

### 7. Message Distribution and Filtering

#### Intelligent Message Routing
```typescript
class SubscriptionMessageRouter {
  constructor(
    private connectionManager: SubscriptionConnectionManager,
    private rateLimiter: SubscriptionRateLimiter,
    private authenticator: SubscriptionAuthenticator
  ) {}
  
  async routeMessage(channel: string, event: BaseSubscriptionEvent): Promise<void> {
    const connections = this.connectionManager.getConnectionsByChannel(channel);
    
    const deliveryPromises = Array.from(connections).map(connectionId => 
      this.deliverToConnection(connectionId, channel, event)
    );
    
    await Promise.all(deliveryPromises);
  }
  
  private async deliverToConnection(
    connectionId: string,
    channel: string,
    event: BaseSubscriptionEvent
  ): Promise<void> {
    try {
      // Check rate limits
      if (!this.rateLimiter.checkMessageRate(connectionId)) {
        console.log(`Rate limit exceeded for connection ${connectionId}`);
        return;
      }
      
      // Get connection details
      const connection = this.connectionManager.getConnection(connectionId);
      if (!connection) {
        return;
      }
      
      // Check authorization for this specific event
      if (!await this.isAuthorizedForEvent(connection, event)) {
        return;
      }
      
      // Filter event data based on user permissions
      const filteredEvent = await this.filterEventData(connection, event);
      
      // Deliver message
      await this.sendMessage(connectionId, filteredEvent);
      
      // Record message for rate limiting
      this.rateLimiter.recordMessage(connectionId);
      
    } catch (error) {
      console.error(`Failed to deliver message to connection ${connectionId}:`, error);
    }
  }
  
  private async isAuthorizedForEvent(
    connection: SubscriptionConnection,
    event: BaseSubscriptionEvent
  ): Promise<boolean> {
    // Event-specific authorization checks
    switch (event.eventType) {
      case 'CUSTOMER_UPDATED':
        const customerEvent = event as CustomerUpdateEvent;
        return this.canAccessCustomerData(connection, customerEvent.customer.id);
        
      case 'PROJECT_UPDATED':
        const projectEvent = event as ProjectUpdateEvent;  
        return this.canAccessProjectData(connection, projectEvent.project.id);
        
      case 'ESTIMATE_UPDATED':
        const estimateEvent = event as EstimateUpdateEvent;
        return this.canAccessEstimateData(connection, estimateEvent.estimate.id);
        
      default:
        return true;
    }
  }
  
  private async filterEventData(
    connection: SubscriptionConnection,
    event: BaseSubscriptionEvent
  ): Promise<BaseSubscriptionEvent> {
    // Remove sensitive fields based on user permissions
    const clonedEvent = JSON.parse(JSON.stringify(event));
    
    if (!connection.metadata.permissions.includes('view:sensitive:data')) {
      // Remove sensitive fields like pricing, financial data, etc.
      if ('customer' in clonedEvent && clonedEvent.customer) {
        delete clonedEvent.customer.creditLimit;
        delete clonedEvent.customer.paymentTerms;
      }
      
      if ('estimate' in clonedEvent && clonedEvent.estimate) {
        delete clonedEvent.estimate.actualCost;
        delete clonedEvent.estimate.profitMargin;
      }
    }
    
    return clonedEvent;
  }
  
  private async sendMessage(connectionId: string, event: BaseSubscriptionEvent): Promise<void> {
    // Implement actual WebSocket message sending
    // This would integrate with your WebSocket server implementation
  }
}
```

### 8. Monitoring and Metrics

#### Subscription Performance Metrics
```typescript
interface SubscriptionMetrics {
  // Connection metrics
  activeConnections: number;
  connectionsPerSecond: number;
  avgConnectionDuration: number;
  disconnectionReasons: Record<string, number>;
  
  // Subscription metrics  
  activeSubscriptions: number;
  subscriptionsPerConnection: number;
  subscriptionsByType: Record<string, number>;
  
  // Message metrics
  messagesPerSecond: number;
  avgMessageLatency: number;
  messageDeliveryRate: number;
  failedDeliveries: number;
  
  // Rate limiting metrics
  rateLimitHits: number;
  blockedConnections: number;
  avgBlockDuration: number;
  
  // Channel metrics
  activeChannels: number;
  messagesPerChannel: Record<string, number>;
  subscribersPerChannel: Record<string, number>;
}

class SubscriptionMonitoring {
  private metrics: SubscriptionMetrics;
  
  trackConnection(action: 'connect' | 'disconnect', connectionId: string): void {
    // Implement connection tracking
  }
  
  trackSubscription(action: 'subscribe' | 'unsubscribe', subscriptionId: string): void {
    // Implement subscription tracking
  }
  
  trackMessage(channel: string, deliveryLatency: number, success: boolean): void {
    // Implement message tracking
  }
  
  trackRateLimit(connectionId: string, action: 'hit' | 'block'): void {
    // Implement rate limiting tracking
  }
  
  getMetrics(): SubscriptionMetrics {
    return this.metrics;
  }
  
  exportMetrics(): void {
    // Export metrics to monitoring system (Prometheus, DataDog, etc.)
  }
}
```

## Implementation Guidelines

### 1. Scalability Considerations
- Use Redis Cluster for message broker scaling
- Implement connection sticky sessions for load balancing
- Design for horizontal scaling of subscription servers

### 2. Error Handling and Resilience
- Implement exponential backoff for failed message deliveries
- Graceful degradation when message broker is unavailable
- Automatic reconnection logic for clients
- Dead letter queues for failed messages

### 3. Security Best Practices
- Validate all subscription arguments
- Implement connection-level and user-level rate limiting
- Log all subscription activities for audit trails
- Use secure WebSocket connections (WSS) in production

### 4. Performance Optimization
- Use message batching for high-frequency updates
- Implement subscription filtering at the server level
- Cache authorization decisions with TTL
- Use connection pooling for database operations

This WebSocket subscription architecture provides real-time capabilities while maintaining security, scalability, and performance for 100 concurrent users across all federated subgraphs.
