/**
 * GraphQL Query Resolvers - Optimized for Performance
 * Implements efficient pagination, filtering, and caching
 */

import { QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { SecretsManagerClient, ListSecretsCommand, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { GraphQLError } from 'graphql';

/**
 * Query resolvers with performance optimizations
 */
export const queryResolvers = {
  // Health check - cached for 30 seconds
  health: async (parent, args, context) => {
    const cacheKey = 'system:health';
    let health = await context.cache.get('system', 'health');

    if (health === null) {
      const dbHealth = await context.pooledClient.healthCheck();
      const cacheStats = context.cache.getStats();

      health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        database: {
          connected: dbHealth.status === 'healthy',
          latency: Math.round(Math.random() * 50), // Simulated latency
          operations: {
            reads: context.metrics.totalQueries,
            writes: Math.floor(context.metrics.totalQueries * 0.2),
            errors: context.metrics.errors,
            avgLatency: context.metrics.totalQueries > 0
              ? context.metrics.totalExecutionTime / context.metrics.totalQueries
              : 0,
          },
        },
        cache: {
          layers: {
            memory: {
              connected: true,
              hitRatio: cacheStats.memory?.hitRatio || 0,
              size: cacheStats.memory?.size || 0,
            },
            dax: {
              connected: cacheStats.dax?.connected || false,
              hitRatio: 0.85, // Simulated
              size: 0,
            },
            dynamodb: {
              connected: true,
              hitRatio: 0.95, // Simulated
              size: 0,
            },
          },
          hitRatio: cacheStats.hitRatio || 0,
          operations: cacheStats.hits + cacheStats.misses,
        },
      };

      // Cache for 30 seconds
      await context.cache.set('system', 'health', health, {}, 30);
    }

    return health;
  },

  // Current user - from context
  me: async (parent, args, context) => {
    if (!context.user) return null;

    // Use DataLoader for consistent user data
    return context.getUser(context.user.id);
  },

  // Node resolution for Relay Global Object Identification
  node: async (parent, args, context) => {
    const { id } = args;

    // Parse the global ID to determine type and local ID
    try {
      const decoded = Buffer.from(id, 'base64').toString('utf-8');
      const [type, localId] = decoded.split(':');

      switch (type) {
        case 'User':
          return context.getUser(localId);
        case 'Contractor':
          return context.getContractor(localId);
        case 'Secret':
          return context.getEntity(`SECRET#${localId}`, 'METADATA');
        case 'AuditLog':
          return context.getEntity(`AUDIT#${localId}`, 'METADATA');
        case 'Config':
          return context.getEntity(`CONFIG#${localId}`, 'METADATA');
        default:
          return null;
      }
    } catch (error) {
      return null;
    }
  },

  // Users with efficient pagination and filtering
  users: async (parent, args, context) => {
    const { first, after, last, before, filter, orderBy = 'createdAt', sortOrder = 'DESC' } = args;

    // Build scan parameters with filters
    const scanParams = {
      TableName: process.env.USERS_TABLE,
      Limit: first || last || 20,
    };

    // Apply filters
    if (filter) {
      const filterExpressions = [];
      const expressionAttributeNames = {};
      const expressionAttributeValues = {};

      if (filter.role) {
        filterExpressions.push('#role = :role');
        expressionAttributeNames['#role'] = 'role';
        expressionAttributeValues[':role'] = filter.role;
      }

      if (filter.isActive !== undefined) {
        filterExpressions.push('isActive = :isActive');
        expressionAttributeValues[':isActive'] = filter.isActive;
      }

      if (filter.search) {
        filterExpressions.push('(contains(#name, :search) OR contains(email, :search))');
        expressionAttributeNames['#name'] = 'name';
        expressionAttributeValues[':search'] = filter.search;
      }

      if (filter.createdAfter) {
        filterExpressions.push('createdAt >= :createdAfter');
        expressionAttributeValues[':createdAfter'] = new Date(filter.createdAfter).getTime();
      }

      if (filter.createdBefore) {
        filterExpressions.push('createdAt <= :createdBefore');
        expressionAttributeValues[':createdBefore'] = new Date(filter.createdBefore).getTime();
      }

      if (filterExpressions.length > 0) {
        scanParams.FilterExpression = filterExpressions.join(' AND ');
        scanParams.ExpressionAttributeNames = expressionAttributeNames;
        scanParams.ExpressionAttributeValues = expressionAttributeValues;
      }
    }

    // Handle pagination cursor
    if (after) {
      scanParams.ExclusiveStartKey = context.pooledClient.decodeCursor(after);
    }

    const result = await context.client.send(new ScanCommand(scanParams));

    // Sort results in memory (for small datasets)
    let items = result.Items || [];
    const sortKey = orderBy === 'name' ? 'name' : 'createdAt';
    const sortDirection = sortOrder === 'ASC' ? 1 : -1;

    items.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal < bVal) return -1 * sortDirection;
      if (aVal > bVal) return 1 * sortDirection;
      return 0;
    });

    // Create connection response
    return createConnection(items, result.LastEvaluatedKey, context);
  },

  // Single user lookup with caching
  user: async (parent, args, context) => {
    const { id } = args;
    return context.getUser(id);
  },

  // Contractors with filtering and pagination
  contractors: async (parent, args, context) => {
    const { first, after, last, before, filter, orderBy = 'createdAt', sortOrder = 'DESC' } = args;

    const scanParams = {
      TableName: process.env.CONTRACTORS_TABLE,
      Limit: first || last || 20,
    };

    // Apply filters
    if (filter) {
      const filterExpressions = [];
      const expressionAttributeNames = {};
      const expressionAttributeValues = {};

      if (filter.status) {
        filterExpressions.push('#status = :status');
        expressionAttributeNames['#status'] = 'status';
        expressionAttributeValues[':status'] = filter.status;
      }

      if (filter.company) {
        filterExpressions.push('company = :company');
        expressionAttributeValues[':company'] = filter.company;
      }

      if (filter.search) {
        filterExpressions.push('(contains(#name, :search) OR contains(email, :search))');
        expressionAttributeNames['#name'] = 'name';
        expressionAttributeValues[':search'] = filter.search;
      }

      if (filterExpressions.length > 0) {
        scanParams.FilterExpression = filterExpressions.join(' AND ');
        scanParams.ExpressionAttributeNames = expressionAttributeNames;
        scanParams.ExpressionAttributeValues = expressionAttributeValues;
      }
    }

    if (after) {
      scanParams.ExclusiveStartKey = context.pooledClient.decodeCursor(after);
    }

    const result = await context.client.send(new ScanCommand(scanParams));
    return createConnection(result.Items || [], result.LastEvaluatedKey, context);
  },

  // Single contractor lookup
  contractor: async (parent, args, context) => {
    const { id } = args;
    return context.getContractor(id);
  },

  // Secrets with role-based access and caching
  secrets: async (parent, args, context) => {
    const { first, after, last, before, filter, orderBy = 'updatedAt', sortOrder = 'DESC' } = args;

    // Check contractor permissions
    if (context.user?.type === 'contractor') {
      // Return only allowed secrets
      const allowedSecrets = context.user.allowedSecrets || [];
      const secretPromises = allowedSecrets.map(name =>
        getSecretMetadata(name, context)
      );

      const secrets = await Promise.all(secretPromises);
      return createConnection(secrets.filter(Boolean), null, context);
    }

    // For employees, list from Secrets Manager
    const client = new SecretsManagerClient({ region: process.env.AWS_REGION });

    try {
      const result = await client.send(new ListSecretsCommand({
        MaxResults: first || last || 20,
        NextToken: after,
        Filters: [
          {
            Key: 'name',
            Values: [`${process.env.SECRETS_PREFIX}/`],
          },
        ],
      }));

      const secrets = result.SecretList.map(secret => ({
        id: secret.Name.replace(`${process.env.SECRETS_PREFIX}/`, ''),
        name: secret.Name.replace(`${process.env.SECRETS_PREFIX}/`, ''),
        description: secret.Description,
        createdAt: secret.CreatedDate?.toISOString(),
        updatedAt: secret.LastChangedDate?.toISOString(),
        version: secret.VersionId,
        tags: secret.Tags?.map(tag => `${tag.Key}:${tag.Value}`) || [],
        accessCount: 0, // Would need to implement tracking
      }));

      return {
        edges: secrets.map(secret => ({
          node: secret,
          cursor: context.pooledClient.encodeCursor({ name: secret.name }),
        })),
        pageInfo: {
          hasNextPage: !!result.NextToken,
          hasPreviousPage: false,
          startCursor: secrets.length > 0 ? context.pooledClient.encodeCursor({ name: secrets[0].name }) : null,
          endCursor: secrets.length > 0 ? context.pooledClient.encodeCursor({ name: secrets[secrets.length - 1].name }) : null,
        },
        totalCount: secrets.length,
      };
    } catch (error) {
      throw new GraphQLError(`Failed to list secrets: ${error.message}`);
    }
  },

  // Single secret lookup
  secret: async (parent, args, context) => {
    const { name } = args;

    // Check contractor permissions
    if (context.user?.type === 'contractor') {
      const allowedSecrets = context.user.allowedSecrets || [];
      if (!allowedSecrets.includes(name)) {
        throw new GraphQLError('Access denied to this secret');
      }
    }

    return getSecretMetadata(name, context);
  },

  // Audit logs with efficient querying
  auditLogs: async (parent, args, context) => {
    const { first, after, last, before, filter, orderBy = 'timestamp', sortOrder = 'DESC' } = args;

    let queryParams;

    if (filter?.userId) {
      // Query by user ID using GSI
      queryParams = {
        TableName: process.env.AUDIT_TABLE,
        IndexName: 'user-index',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: { ':userId': filter.userId },
        ScanIndexForward: sortOrder === 'ASC',
        Limit: first || last || 50,
      };

      if (after) {
        queryParams.ExclusiveStartKey = context.pooledClient.decodeCursor(after);
      }

      const result = await context.client.send(new QueryCommand(queryParams));
      return createConnection(result.Items || [], result.LastEvaluatedKey, context);
    } else {
      // Scan with filters
      const scanParams = {
        TableName: process.env.AUDIT_TABLE,
        Limit: first || last || 50,
      };

      // Apply filters
      if (filter) {
        const filterExpressions = [];
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};

        if (filter.action) {
          filterExpressions.push('#action = :action');
          expressionAttributeNames['#action'] = 'action';
          expressionAttributeValues[':action'] = filter.action;
        }

        if (filter.resource) {
          filterExpressions.push('contains(resource, :resource)');
          expressionAttributeValues[':resource'] = filter.resource;
        }

        if (filter.startDate) {
          filterExpressions.push('#timestamp >= :startDate');
          expressionAttributeNames['#timestamp'] = 'timestamp';
          expressionAttributeValues[':startDate'] = new Date(filter.startDate).getTime();
        }

        if (filter.endDate) {
          filterExpressions.push('#timestamp <= :endDate');
          expressionAttributeNames['#timestamp'] = 'timestamp';
          expressionAttributeValues[':endDate'] = new Date(filter.endDate).getTime();
        }

        if (filterExpressions.length > 0) {
          scanParams.FilterExpression = filterExpressions.join(' AND ');
          scanParams.ExpressionAttributeNames = expressionAttributeNames;
          scanParams.ExpressionAttributeValues = expressionAttributeValues;
        }
      }

      if (after) {
        scanParams.ExclusiveStartKey = context.pooledClient.decodeCursor(after);
      }

      const result = await context.client.send(new ScanCommand(scanParams));
      const items = (result.Items || []).sort((a, b) => b.timestamp - a.timestamp);

      return createConnection(items, result.LastEvaluatedKey, context);
    }
  },

  // Configuration with role-based filtering
  configs: async (parent, args, context) => {
    const { first, after, filter, orderBy = 'key', sortOrder = 'ASC' } = args;

    const scanParams = {
      TableName: process.env.CONFIG_TABLE,
      Limit: first || 50,
    };

    // Apply filters
    if (filter) {
      const filterExpressions = [];
      const expressionAttributeNames = {};
      const expressionAttributeValues = {};

      if (filter.category) {
        filterExpressions.push('category = :category');
        expressionAttributeValues[':category'] = filter.category;
      }

      if (filter.isPublic !== undefined) {
        filterExpressions.push('isPublic = :isPublic');
        expressionAttributeValues[':isPublic'] = filter.isPublic;
      }

      // Non-admin users can only see public configs
      if (context.user?.role !== 'admin') {
        filterExpressions.push('isPublic = :isPublic');
        expressionAttributeValues[':isPublic'] = true;
      }

      if (filter.search) {
        filterExpressions.push('(contains(#key, :search) OR contains(description, :search))');
        expressionAttributeNames['#key'] = 'key';
        expressionAttributeValues[':search'] = filter.search;
      }

      if (filterExpressions.length > 0) {
        scanParams.FilterExpression = filterExpressions.join(' AND ');
        scanParams.ExpressionAttributeNames = expressionAttributeNames;
        scanParams.ExpressionAttributeValues = expressionAttributeValues;
      }
    } else if (context.user?.role !== 'admin') {
      // Default filter for non-admin users
      scanParams.FilterExpression = 'isPublic = :isPublic';
      scanParams.ExpressionAttributeValues = { ':isPublic': true };
    }

    if (after) {
      scanParams.ExclusiveStartKey = context.pooledClient.decodeCursor(after);
    }

    const result = await context.client.send(new ScanCommand(scanParams));
    return createConnection(result.Items || [], result.LastEvaluatedKey, context);
  },

  // Single config lookup
  config: async (parent, args, context) => {
    const { key } = args;

    const item = await context.getEntity(`CONFIG#${key}`, 'METADATA');

    // Check if user can access this config
    if (!item || (!item.isPublic && context.user?.role !== 'admin')) {
      return null;
    }

    return item;
  },

  // Performance metrics for monitoring
  performanceMetrics: async (parent, args, context) => {
    const { timeRange = 3600 } = args; // Default 1 hour

    const metrics = context.metrics;
    const cacheStats = context.cache.getStats();
    const dbStats = await context.pooledClient.getMetrics();

    return {
      queryCount: metrics.totalQueries,
      avgExecutionTime: metrics.totalQueries > 0
        ? metrics.totalExecutionTime / metrics.totalQueries
        : 0,
      slowQueries: metrics.slowQueries,
      cacheStats: {
        hits: cacheStats.hits?.memory + cacheStats.hits?.dax + cacheStats.hits?.dynamodb,
        misses: cacheStats.misses?.memory + cacheStats.misses?.dax + cacheStats.misses?.dynamodb,
        hitRatio: cacheStats.hitRatio,
        evictions: 0, // Would need to implement tracking
      },
      connectionPool: {
        active: 10, // Simulated
        idle: 5,    // Simulated
        waiting: 0, // Simulated
        maxConnections: 50,
      },
    };
  },
};

/**
 * Helper function to create GraphQL connections
 */
function createConnection(items, lastEvaluatedKey, context) {
  return {
    edges: items.map(item => ({
      node: item,
      cursor: context.pooledClient.encodeCursor({ id: item.id || item.name }),
    })),
    pageInfo: {
      hasNextPage: !!lastEvaluatedKey,
      hasPreviousPage: false, // Simple implementation
      startCursor: items.length > 0 ? context.pooledClient.encodeCursor({ id: items[0].id || items[0].name }) : null,
      endCursor: items.length > 0 ? context.pooledClient.encodeCursor({ id: items[items.length - 1].id || items[items.length - 1].name }) : null,
    },
    totalCount: items.length, // Approximation for performance
  };
}

/**
 * Helper function to get secret metadata
 */
async function getSecretMetadata(name, context) {
  const cacheKey = `secret:${name}:metadata`;
  let metadata = await context.cache.get('secret', name, { field: 'metadata' });

  if (metadata === null) {
    const client = new SecretsManagerClient({ region: process.env.AWS_REGION });

    try {
      const result = await client.send(new GetSecretValueCommand({
        SecretId: `${process.env.SECRETS_PREFIX}/${name}`,
        VersionStage: 'AWSCURRENT',
      }));

      metadata = {
        id: name,
        name,
        description: result.Description || '',
        createdAt: result.CreatedDate?.toISOString(),
        updatedAt: result.LastChangedDate?.toISOString(),
        version: result.VersionId,
        tags: result.Tags?.map(tag => `${tag.Key}:${tag.Value}`) || [],
        accessCount: 0, // Would need separate tracking
        createdBy: 'system', // Would need separate tracking
      };

      // Cache metadata for 10 minutes
      await context.cache.set('secret', name, metadata, { field: 'metadata' }, 600);
    } catch (error) {
      return null;
    }
  }

  return metadata;
}
