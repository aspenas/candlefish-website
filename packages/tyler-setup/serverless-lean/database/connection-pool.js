/**
 * DynamoDB Connection Pool and Caching Implementation
 * Optimized for GraphQL resolvers with high concurrency support
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand,
         DeleteCommand, QueryCommand, BatchGetCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { NodeHttpHandler } from '@aws-sdk/node-http-handler';
import DataLoader from 'dataloader';

// Connection pool configuration
const CONNECTION_POOL_CONFIG = {
  // HTTP connection pooling
  maxConnections: 50,
  maxIdleTime: 30000, // 30 seconds
  timeout: 5000,      // 5 seconds
  retryAttempts: 3,

  // DynamoDB specific settings
  maxConcurrentRequests: 100,
  requestTimeout: 30000,

  // Circuit breaker settings
  failureThreshold: 5,
  resetTimeout: 60000, // 1 minute

  // Cache settings
  defaultTTL: 300,     // 5 minutes
  maxCacheSize: 1000,  // items per loader
};

/**
 * Circuit Breaker implementation for fault tolerance
 */
class CircuitBreaker {
  constructor(threshold = 5, resetTime = 60000) {
    this.threshold = threshold;
    this.resetTime = resetTime;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }

  async execute(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.resetTime) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}

/**
 * Enhanced DynamoDB Client with connection pooling
 */
class PooledDynamoDBClient {
  constructor() {
    // HTTP handler with connection pooling
    const httpHandler = new NodeHttpHandler({
      connectionTimeout: CONNECTION_POOL_CONFIG.timeout,
      socketTimeout: CONNECTION_POOL_CONFIG.timeout,
      httpsAgent: {
        maxSockets: CONNECTION_POOL_CONFIG.maxConnections,
        maxFreeSockets: 10,
        timeout: CONNECTION_POOL_CONFIG.maxIdleTime,
        freeSocketTimeout: CONNECTION_POOL_CONFIG.maxIdleTime,
        keepAlive: true,
      },
    });

    // Configure DynamoDB client with optimizations
    this.client = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
      maxAttempts: CONNECTION_POOL_CONFIG.retryAttempts,
      requestHandler: httpHandler,
      logger: console, // Enable SDK logging in development
    });

    this.docClient = DynamoDBDocumentClient.from(this.client, {
      marshallOptions: {
        convertEmptyValues: false,
        removeUndefinedValues: true,
        convertClassInstanceToMap: false,
      },
      unmarshallOptions: {
        wrapNumbers: false,
      },
    });

    // Circuit breaker for fault tolerance
    this.circuitBreaker = new CircuitBreaker(
      CONNECTION_POOL_CONFIG.failureThreshold,
      CONNECTION_POOL_CONFIG.resetTimeout
    );

    // Initialize DataLoaders
    this.initializeDataLoaders();

    // Performance metrics
    this.metrics = {
      requests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0,
      avgResponseTime: 0,
    };
  }

  /**
   * Initialize DataLoaders for batching and caching
   */
  initializeDataLoaders() {
    // Entity loader (by PK+SK)
    this.entityLoader = new DataLoader(
      async (keys) => {
        const batchGetParams = {
          RequestItems: {
            [process.env.ENTITY_TABLE]: {
              Keys: keys.map(key => ({ PK: key.pk, SK: key.sk }))
            }
          }
        };

        const result = await this.executeWithCircuitBreaker(
          () => this.docClient.send(new BatchGetCommand(batchGetParams))
        );

        const items = result.Responses[process.env.ENTITY_TABLE] || [];

        // Return results in the same order as requested keys
        return keys.map(key =>
          items.find(item => item.PK === key.pk && item.SK === key.sk) || null
        );
      },
      {
        maxBatchSize: 100, // DynamoDB batch limit
        cacheKeyFn: key => `${key.pk}#${key.sk}`,
        cacheMap: new Map(),
      }
    );

    // User loader (by ID)
    this.userLoader = new DataLoader(
      async (userIds) => {
        const keys = userIds.map(id => ({ pk: `USER#${id}`, sk: 'METADATA' }));
        return this.entityLoader.loadMany(keys);
      },
      {
        maxBatchSize: 100,
        cacheMap: new Map(),
      }
    );

    // Contractor loader (by ID)
    this.contractorLoader = new DataLoader(
      async (contractorIds) => {
        const keys = contractorIds.map(id => ({ pk: `CONTRACTOR#${id}`, sk: 'METADATA' }));
        return this.entityLoader.loadMany(keys);
      },
      {
        maxBatchSize: 100,
        cacheMap: new Map(),
      }
    );

    // Relationship loader (for nested queries)
    this.relationshipLoader = new DataLoader(
      async (relationships) => {
        const queries = [];
        const relsByTable = relationships.reduce((acc, rel) => {
          if (!acc[rel.table]) acc[rel.table] = [];
          acc[rel.table].push(rel);
          return acc;
        }, {});

        for (const [tableName, rels] of Object.entries(relsByTable)) {
          for (const rel of rels) {
            queries.push({
              TableName: tableName,
              KeyConditionExpression: 'PK = :pk',
              ExpressionAttributeValues: { ':pk': rel.pk },
              Limit: rel.limit || 50,
            });
          }
        }

        const results = await Promise.all(
          queries.map(query =>
            this.executeWithCircuitBreaker(() => this.docClient.send(new QueryCommand(query)))
          )
        );

        // Map results back to original relationships
        let resultIndex = 0;
        return relationships.map(rel => {
          const result = results[resultIndex++];
          return result.Items || [];
        });
      },
      {
        maxBatchSize: 25, // Limit concurrent queries
        cacheKeyFn: rel => `${rel.table}#${rel.pk}#${rel.limit || 50}`,
        cacheMap: new Map(),
      }
    );
  }

  /**
   * Execute operation with circuit breaker protection
   */
  async executeWithCircuitBreaker(operation) {
    const startTime = Date.now();

    try {
      this.metrics.requests++;
      const result = await this.circuitBreaker.execute(operation);

      // Update performance metrics
      const responseTime = Date.now() - startTime;
      this.metrics.avgResponseTime =
        (this.metrics.avgResponseTime + responseTime) / 2;

      return result;
    } catch (error) {
      this.metrics.errors++;
      console.error('DynamoDB operation failed:', {
        error: error.message,
        operation: operation.name,
        metrics: this.metrics,
      });
      throw error;
    }
  }

  /**
   * Get single entity by PK and SK
   */
  async getEntity(pk, sk) {
    return this.entityLoader.load({ pk, sk });
  }

  /**
   * Get user by ID
   */
  async getUser(userId) {
    return this.userLoader.load(userId);
  }

  /**
   * Get contractor by ID
   */
  async getContractor(contractorId) {
    return this.contractorLoader.load(contractorId);
  }

  /**
   * Get multiple users efficiently
   */
  async getUsers(userIds) {
    return this.userLoader.loadMany(userIds);
  }

  /**
   * Query relationships (for nested GraphQL queries)
   */
  async queryRelationships(pk, options = {}) {
    return this.relationshipLoader.load({
      table: options.table || process.env.ENTITY_TABLE,
      pk,
      limit: options.limit,
    });
  }

  /**
   * Paginated query with cursor support
   */
  async queryWithPagination(params, cursor, limit = 20) {
    const queryParams = {
      ...params,
      Limit: limit,
    };

    if (cursor) {
      queryParams.ExclusiveStartKey = this.decodeCursor(cursor);
    }

    const result = await this.executeWithCircuitBreaker(
      () => this.docClient.send(new QueryCommand(queryParams))
    );

    return {
      items: result.Items || [],
      nextCursor: result.LastEvaluatedKey ?
        this.encodeCursor(result.LastEvaluatedKey) : null,
      hasMore: !!result.LastEvaluatedKey,
    };
  }

  /**
   * Batch write operations
   */
  async batchWrite(operations) {
    const chunks = this.chunkArray(operations, 25); // DynamoDB batch limit
    const results = [];

    for (const chunk of chunks) {
      const params = {
        RequestItems: {
          [process.env.ENTITY_TABLE]: chunk
        }
      };

      const result = await this.executeWithCircuitBreaker(
        () => this.docClient.send(new BatchWriteCommand(params))
      );

      results.push(result);

      // Handle unprocessed items
      if (result.UnprocessedItems &&
          Object.keys(result.UnprocessedItems).length > 0) {
        console.warn('Unprocessed items in batch write:', result.UnprocessedItems);
      }
    }

    return results;
  }

  /**
   * Transactional write operations
   */
  async transactWrite(items) {
    // Implementation for transactional writes
    // This would use TransactWriteItemsCommand for ACID transactions
    throw new Error('Transactional writes not yet implemented');
  }

  /**
   * Cache management
   */
  clearCache(pattern) {
    if (pattern) {
      // Clear specific cache entries matching pattern
      [this.entityLoader, this.userLoader, this.contractorLoader, this.relationshipLoader]
        .forEach(loader => {
          if (loader.clear) {
            loader.clear(pattern);
          }
        });
    } else {
      // Clear all caches
      [this.entityLoader, this.userLoader, this.contractorLoader, this.relationshipLoader]
        .forEach(loader => loader.clearAll());
    }
  }

  /**
   * Prime cache with known data
   */
  primeCache(key, value) {
    if (key.startsWith('USER#')) {
      const userId = key.replace('USER#', '');
      this.userLoader.prime(userId, value);
    } else if (key.startsWith('CONTRACTOR#')) {
      const contractorId = key.replace('CONTRACTOR#', '');
      this.contractorLoader.prime(contractorId, value);
    }

    this.entityLoader.prime(key, value);
  }

  /**
   * Utility methods
   */
  encodeCursor(key) {
    return Buffer.from(JSON.stringify(key)).toString('base64');
  }

  decodeCursor(cursor) {
    try {
      return JSON.parse(Buffer.from(cursor, 'base64').toString());
    } catch (error) {
      throw new Error('Invalid cursor format');
    }
  }

  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      // Simple query to check connectivity
      await this.executeWithCircuitBreaker(() =>
        this.docClient.send(new GetCommand({
          TableName: process.env.ENTITY_TABLE,
          Key: { PK: 'HEALTH_CHECK', SK: 'PING' }
        }))
      );

      return {
        status: 'healthy',
        circuitBreaker: this.circuitBreaker.state,
        metrics: this.metrics,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        circuitBreaker: this.circuitBreaker.state,
        metrics: this.metrics,
      };
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      circuitBreakerState: this.circuitBreaker.state,
      loaderStats: {
        entity: this.getLoaderStats(this.entityLoader),
        user: this.getLoaderStats(this.userLoader),
        contractor: this.getLoaderStats(this.contractorLoader),
        relationship: this.getLoaderStats(this.relationshipLoader),
      },
    };
  }

  getLoaderStats(loader) {
    return {
      cacheSize: loader._cacheMap ? loader._cacheMap.size : 0,
      // Additional stats would require custom DataLoader implementation
    };
  }

  /**
   * Cleanup resources
   */
  async destroy() {
    // Clear all caches
    this.clearCache();

    // Close HTTP connections
    if (this.client.destroy) {
      await this.client.destroy();
    }
  }
}

// Singleton instance for connection reuse
let pooledClient = null;

/**
 * Get or create the singleton DynamoDB client instance
 */
export function getDynamoDBClient() {
  if (!pooledClient) {
    pooledClient = new PooledDynamoDBClient();

    // Set up periodic metrics logging
    if (process.env.NODE_ENV !== 'production') {
      setInterval(() => {
        console.log('DynamoDB Client Metrics:', pooledClient.getMetrics());
      }, 60000); // Every minute
    }
  }

  return pooledClient;
}

/**
 * DataLoader context factory for GraphQL resolvers
 */
export function createDataLoaderContext() {
  const client = getDynamoDBClient();

  return {
    // Individual loaders
    userLoader: client.userLoader,
    contractorLoader: client.contractorLoader,
    entityLoader: client.entityLoader,
    relationshipLoader: client.relationshipLoader,

    // Convenience methods
    getUser: (id) => client.getUser(id),
    getUsers: (ids) => client.getUsers(ids),
    getContractor: (id) => client.getContractor(id),
    getEntity: (pk, sk) => client.getEntity(pk, sk),
    queryRelationships: (pk, options) => client.queryRelationships(pk, options),
    queryWithPagination: (params, cursor, limit) =>
      client.queryWithPagination(params, cursor, limit),

    // Cache management
    clearCache: (pattern) => client.clearCache(pattern),
    primeCache: (key, value) => client.primeCache(key, value),

    // Direct client access for complex operations
    client: client.docClient,
    pooledClient: client,
  };
}

export default PooledDynamoDBClient;
