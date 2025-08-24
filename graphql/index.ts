/**
 * Candlefish AI - GraphQL Federation Entry Point
 * Philosophy: Unified API with comprehensive feature set
 */

export * from './federation/auth-service';
export * from './federation/workshop-service';
export * from './dataloaders/federated-dataloaders';
export * from './subscriptions/realtime-subscriptions';
export * from './security/query-security';
export * from './caching/resolver-caching';
export * from './gateway/federated-gateway';

// Re-export commonly used types and utilities
export {
  // Gateway
  createServer,
  startServer,
  createFederatedGateway,
  SUBGRAPH_CONFIGS,

  // Security
  rateLimiter,
  createSecurityValidationRules,
  persistedQueryStore,
  metricsCollector,

  // Caching
  cacheManager,
  cached,
  CacheWarmer,
  CacheInvalidator,
  createCachedResolver,

  // DataLoaders
  UserDataLoader,
  DocumentationDataLoader,
  PartnerDataLoader,
  RelationshipDataLoaders,
  createDataLoadersContext,

  // Subscriptions
  activePubSub as pubsub,
  connectionManager,
  subscriptionResolvers,
  createWebSocketServer,
  EventPublisher,

  // Schemas
  authSchema,
  workshopSchema,
} from './gateway/federated-gateway';
