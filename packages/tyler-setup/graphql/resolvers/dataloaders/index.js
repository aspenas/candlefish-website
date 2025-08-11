// DataLoader Implementation for N+1 Query Prevention
// Efficient batching and caching for database operations

import DataLoader from 'dataloader';
import { DynamoDBDocumentClient, BatchGetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

/**
 * Create all DataLoaders for efficient data fetching
 */
export function createDataLoaderContext() {
  return {
    // User-related DataLoaders
    userById: createUserByIdLoader(),
    usersByIds: createUsersByIdsLoader(),
    userByEmail: createUserByEmailLoader(),

    // Contractor-related DataLoaders
    contractorById: createContractorByIdLoader(),
    contractorsByIds: createContractorsByIdsLoader(),
    contractorsByInviter: createContractorsByInviterLoader(),

    // Secret-related DataLoaders
    secretByName: createSecretByNameLoader(),
    secretsByNames: createSecretsByNamesLoader(),
    secretsByType: createSecretsByTypeLoader(),

    // Audit-related DataLoaders
    auditLogsByUserId: createAuditLogsByUserIdLoader(),
    auditLogsByResource: createAuditLogsByResourceLoader(),

    // Configuration DataLoaders
    configByKey: createConfigByKeyLoader(),
    configsByCategory: createConfigsByCategoryLoader(),

    // WebSocket DataLoaders
    connectionsByUserId: createConnectionsByUserIdLoader(),
    eventsByConnectionId: createEventsByConnectionIdLoader(),

    // Statistics and Analytics DataLoaders
    userStats: createUserStatsLoader(),
    contractorStats: createContractorStatsLoader(),
    secretStats: createSecretStatsLoader(),

    // Session and Auth DataLoaders
    sessionsByUserId: createSessionsByUserIdLoader(),
    refreshTokensByUserId: createRefreshTokensByUserIdLoader(),
  };
}

/**
 * User DataLoaders
 */
function createUserByIdLoader() {
  return new DataLoader(async (userIds) => {
    try {
      const dynamodb = getDynamoDBClient();
      const tableName = `${process.env.SECRETS_PREFIX}-users`;

      const keys = userIds.map(id => ({ id }));

      const result = await dynamodb.send(new BatchGetCommand({
        RequestItems: {
          [tableName]: {
            Keys: keys,
          },
        },
      }));

      const users = result.Responses?.[tableName] || [];
      const userMap = new Map(users.map(user => [user.id, user]));

      return userIds.map(id => userMap.get(id) || null);
    } catch (error) {
      console.error('Error in userByIdLoader:', error);
      return userIds.map(() => null);
    }
  }, {
    maxBatchSize: 100,
    cacheKeyFn: (key) => key,
  });
}

function createUsersByIdsLoader() {
  return new DataLoader(async (userIdArrays) => {
    try {
      const dynamodb = getDynamoDBClient();
      const tableName = `${process.env.SECRETS_PREFIX}-users`;

      // Flatten all user IDs and get unique ones
      const allUserIds = [...new Set(userIdArrays.flat())];
      const keys = allUserIds.map(id => ({ id }));

      const result = await dynamodb.send(new BatchGetCommand({
        RequestItems: {
          [tableName]: {
            Keys: keys,
          },
        },
      }));

      const users = result.Responses?.[tableName] || [];
      const userMap = new Map(users.map(user => [user.id, user]));

      return userIdArrays.map(userIds =>
        userIds.map(id => userMap.get(id)).filter(Boolean)
      );
    } catch (error) {
      console.error('Error in usersByIdsLoader:', error);
      return userIdArrays.map(() => []);
    }
  });
}

function createUserByEmailLoader() {
  return new DataLoader(async (emails) => {
    try {
      const dynamodb = getDynamoDBClient();
      const tableName = `${process.env.SECRETS_PREFIX}-users`;

      const queries = emails.map(email =>
        dynamodb.send(new QueryCommand({
          TableName: tableName,
          IndexName: 'email-index',
          KeyConditionExpression: 'email = :email',
          ExpressionAttributeValues: {
            ':email': email,
          },
        }))
      );

      const results = await Promise.all(queries);

      return results.map((result, index) => {
        const users = result.Items || [];
        return users.length > 0 ? users[0] : null;
      });
    } catch (error) {
      console.error('Error in userByEmailLoader:', error);
      return emails.map(() => null);
    }
  });
}

/**
 * Contractor DataLoaders
 */
function createContractorByIdLoader() {
  return new DataLoader(async (contractorIds) => {
    try {
      const dynamodb = getDynamoDBClient();
      const tableName = `${process.env.SECRETS_PREFIX}-contractors`;

      const keys = contractorIds.map(id => ({ id }));

      const result = await dynamodb.send(new BatchGetCommand({
        RequestItems: {
          [tableName]: {
            Keys: keys,
          },
        },
      }));

      const contractors = result.Responses?.[tableName] || [];
      const contractorMap = new Map(contractors.map(contractor => [contractor.id, contractor]));

      return contractorIds.map(id => contractorMap.get(id) || null);
    } catch (error) {
      console.error('Error in contractorByIdLoader:', error);
      return contractorIds.map(() => null);
    }
  });
}

function createContractorsByIdsLoader() {
  return new DataLoader(async (contractorIdArrays) => {
    try {
      const dynamodb = getDynamoDBClient();
      const tableName = `${process.env.SECRETS_PREFIX}-contractors`;

      const allContractorIds = [...new Set(contractorIdArrays.flat())];
      const keys = allContractorIds.map(id => ({ id }));

      const result = await dynamodb.send(new BatchGetCommand({
        RequestItems: {
          [tableName]: {
            Keys: keys,
          },
        },
      }));

      const contractors = result.Responses?.[tableName] || [];
      const contractorMap = new Map(contractors.map(contractor => [contractor.id, contractor]));

      return contractorIdArrays.map(contractorIds =>
        contractorIds.map(id => contractorMap.get(id)).filter(Boolean)
      );
    } catch (error) {
      console.error('Error in contractorsByIdsLoader:', error);
      return contractorIdArrays.map(() => []);
    }
  });
}

function createContractorsByInviterLoader() {
  return new DataLoader(async (inviterIds) => {
    try {
      const dynamodb = getDynamoDBClient();
      const tableName = `${process.env.SECRETS_PREFIX}-contractors`;

      const queries = inviterIds.map(inviterId =>
        dynamodb.send(new QueryCommand({
          TableName: tableName,
          IndexName: 'invitedBy-index',
          KeyConditionExpression: 'invitedBy = :inviterId',
          ExpressionAttributeValues: {
            ':inviterId': inviterId,
          },
        }))
      );

      const results = await Promise.all(queries);

      return results.map(result => result.Items || []);
    } catch (error) {
      console.error('Error in contractorsByInviterLoader:', error);
      return inviterIds.map(() => []);
    }
  });
}

/**
 * Secret DataLoaders
 */
function createSecretByNameLoader() {
  return new DataLoader(async (secretNames) => {
    try {
      // In production, this would query AWS Secrets Manager or your secret store
      // For now, return mock data structure
      const secrets = secretNames.map(name => ({
        name,
        description: `Secret ${name}`,
        type: 'API_KEY',
        createdAt: new Date(),
        lastRotated: null,
        nextRotation: null,
        version: 'AWSCURRENT',
        isEncrypted: true,
        kmsKeyId: 'alias/secrets-key',
        value: null, // Actual value would be fetched separately with proper auth
      }));

      return secrets;
    } catch (error) {
      console.error('Error in secretByNameLoader:', error);
      return secretNames.map(() => null);
    }
  });
}

function createSecretsByNamesLoader() {
  return new DataLoader(async (secretNameArrays) => {
    try {
      const allSecretNames = [...new Set(secretNameArrays.flat())];

      // Mock implementation - in production, batch fetch from Secrets Manager
      const secrets = allSecretNames.map(name => ({
        name,
        description: `Secret ${name}`,
        type: 'API_KEY',
        createdAt: new Date(),
        lastRotated: null,
        nextRotation: null,
        version: 'AWSCURRENT',
        isEncrypted: true,
        kmsKeyId: 'alias/secrets-key',
        value: null,
      }));

      const secretMap = new Map(secrets.map(secret => [secret.name, secret]));

      return secretNameArrays.map(secretNames =>
        secretNames.map(name => secretMap.get(name)).filter(Boolean)
      );
    } catch (error) {
      console.error('Error in secretsByNamesLoader:', error);
      return secretNameArrays.map(() => []);
    }
  });
}

function createSecretsByTypeLoader() {
  return new DataLoader(async (types) => {
    try {
      // Mock implementation - would query secret store by type
      return types.map(type => [
        {
          name: `${type.toLowerCase()}-secret-1`,
          type,
          createdAt: new Date(),
          description: `A ${type} secret`,
        },
        {
          name: `${type.toLowerCase()}-secret-2`,
          type,
          createdAt: new Date(),
          description: `Another ${type} secret`,
        },
      ]);
    } catch (error) {
      console.error('Error in secretsByTypeLoader:', error);
      return types.map(() => []);
    }
  });
}

/**
 * Audit DataLoaders
 */
function createAuditLogsByUserIdLoader() {
  return new DataLoader(async (userIds) => {
    try {
      const dynamodb = getDynamoDBClient();
      const tableName = `${process.env.SECRETS_PREFIX}-audit`;

      const queries = userIds.map(userId =>
        dynamodb.send(new QueryCommand({
          TableName: tableName,
          IndexName: 'user-index',
          KeyConditionExpression: 'userId = :userId',
          ExpressionAttributeValues: {
            ':userId': userId,
          },
          Limit: 50, // Limit to avoid large responses
          ScanIndexForward: false, // Most recent first
        }))
      );

      const results = await Promise.all(queries);

      return results.map(result => result.Items || []);
    } catch (error) {
      console.error('Error in auditLogsByUserIdLoader:', error);
      return userIds.map(() => []);
    }
  });
}

function createAuditLogsByResourceLoader() {
  return new DataLoader(async (resources) => {
    try {
      const dynamodb = getDynamoDBClient();
      const tableName = `${process.env.SECRETS_PREFIX}-audit`;

      const queries = resources.map(resource =>
        dynamodb.send(new QueryCommand({
          TableName: tableName,
          IndexName: 'resource-index',
          KeyConditionExpression: '#resource = :resource',
          ExpressionAttributeNames: {
            '#resource': 'resource',
          },
          ExpressionAttributeValues: {
            ':resource': resource,
          },
          Limit: 50,
          ScanIndexForward: false,
        }))
      );

      const results = await Promise.all(queries);

      return results.map(result => result.Items || []);
    } catch (error) {
      console.error('Error in auditLogsByResourceLoader:', error);
      return resources.map(() => []);
    }
  });
}

/**
 * Configuration DataLoaders
 */
function createConfigByKeyLoader() {
  return new DataLoader(async (keys) => {
    try {
      const dynamodb = getDynamoDBClient();
      const tableName = `${process.env.SECRETS_PREFIX}-config`;

      const configKeys = keys.map(key => ({ key }));

      const result = await dynamodb.send(new BatchGetCommand({
        RequestItems: {
          [tableName]: {
            Keys: configKeys,
          },
        },
      }));

      const configs = result.Responses?.[tableName] || [];
      const configMap = new Map(configs.map(config => [config.key, config]));

      return keys.map(key => configMap.get(key) || null);
    } catch (error) {
      console.error('Error in configByKeyLoader:', error);
      return keys.map(() => null);
    }
  });
}

function createConfigsByCategoryLoader() {
  return new DataLoader(async (categories) => {
    try {
      const dynamodb = getDynamoDBClient();
      const tableName = `${process.env.SECRETS_PREFIX}-config`;

      const queries = categories.map(category =>
        dynamodb.send(new QueryCommand({
          TableName: tableName,
          IndexName: 'category-index',
          KeyConditionExpression: 'category = :category',
          ExpressionAttributeValues: {
            ':category': category,
          },
        }))
      );

      const results = await Promise.all(queries);

      return results.map(result => result.Items || []);
    } catch (error) {
      console.error('Error in configsByCategoryLoader:', error);
      return categories.map(() => []);
    }
  });
}

/**
 * WebSocket DataLoaders
 */
function createConnectionsByUserIdLoader() {
  return new DataLoader(async (userIds) => {
    try {
      // Mock implementation - would query WebSocket connections table
      return userIds.map(userId => [
        {
          connectionId: `conn-${userId}-1`,
          userId,
          connectedAt: new Date(),
          lastPing: new Date(),
          endpoint: '/websocket',
          userAgent: 'Mock User Agent',
          ip: '127.0.0.1',
          isActive: true,
        }
      ]);
    } catch (error) {
      console.error('Error in connectionsByUserIdLoader:', error);
      return userIds.map(() => []);
    }
  });
}

function createEventsByConnectionIdLoader() {
  return new DataLoader(async (connectionIds) => {
    try {
      // Mock implementation - would query WebSocket events table
      return connectionIds.map(connectionId => [
        {
          id: `event-${connectionId}-1`,
          type: 'USER_CONNECTED',
          connectionId,
          data: { message: 'User connected' },
          timestamp: new Date(),
        }
      ]);
    } catch (error) {
      console.error('Error in eventsByConnectionIdLoader:', error);
      return connectionIds.map(() => []);
    }
  });
}

/**
 * Statistics DataLoaders
 */
function createUserStatsLoader() {
  return new DataLoader(async (userIds) => {
    try {
      // Mock implementation - would calculate from audit logs and other data
      return userIds.map(userId => ({
        totalLogins: Math.floor(Math.random() * 100),
        lastLoginDaysAgo: Math.floor(Math.random() * 30),
        createdUsersCount: Math.floor(Math.random() * 10),
        invitedContractorsCount: Math.floor(Math.random() * 5),
        secretsAccessedCount: Math.floor(Math.random() * 20),
        loginHistory: [],
        activityScore: Math.random() * 100,
      }));
    } catch (error) {
      console.error('Error in userStatsLoader:', error);
      return userIds.map(() => null);
    }
  });
}

function createContractorStatsLoader() {
  return new DataLoader(async (contractorIds) => {
    try {
      // Mock implementation
      return contractorIds.map(contractorId => ({
        totalAccesses: Math.floor(Math.random() * 50),
        lastAccessDaysAgo: Math.floor(Math.random() * 7),
        secretsAccessedCount: Math.floor(Math.random() * 10),
        averageSessionDuration: Math.random() * 3600,
        dailyUsage: [],
        accessPattern: 'Regular',
      }));
    } catch (error) {
      console.error('Error in contractorStatsLoader:', error);
      return contractorIds.map(() => null);
    }
  });
}

function createSecretStatsLoader() {
  return new DataLoader(async (secretNames) => {
    try {
      // Mock implementation
      return secretNames.map(secretName => ({
        accessCount: Math.floor(Math.random() * 100),
        rotationCount: Math.floor(Math.random() * 10),
        lastAccessDaysAgo: Math.floor(Math.random() * 30),
        daysSinceRotation: Math.floor(Math.random() * 90),
        topAccessors: [],
        accessTrend: [],
      }));
    } catch (error) {
      console.error('Error in secretStatsLoader:', error);
      return secretNames.map(() => null);
    }
  });
}

/**
 * Session and Auth DataLoaders
 */
function createSessionsByUserIdLoader() {
  return new DataLoader(async (userIds) => {
    try {
      // Mock implementation - would query sessions table
      return userIds.map(userId => [
        {
          id: `session-${userId}-1`,
          userId,
          token: 'mock-session-token',
          refreshToken: 'mock-refresh-token',
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          lastActivity: new Date(),
          ip: '127.0.0.1',
          userAgent: 'Mock User Agent',
          isActive: true,
        }
      ]);
    } catch (error) {
      console.error('Error in sessionsByUserIdLoader:', error);
      return userIds.map(() => []);
    }
  });
}

function createRefreshTokensByUserIdLoader() {
  return new DataLoader(async (userIds) => {
    try {
      const dynamodb = getDynamoDBClient();
      const tableName = `${process.env.SECRETS_PREFIX}-refresh-tokens`;

      const queries = userIds.map(userId =>
        dynamodb.send(new QueryCommand({
          TableName: tableName,
          IndexName: 'userId-index',
          KeyConditionExpression: 'userId = :userId',
          ExpressionAttributeValues: {
            ':userId': userId,
          },
        }))
      );

      const results = await Promise.all(queries);

      return results.map(result => result.Items || []);
    } catch (error) {
      console.error('Error in refreshTokensByUserIdLoader:', error);
      return userIds.map(() => []);
    }
  });
}

/**
 * Utility function to get DynamoDB client
 */
function getDynamoDBClient() {
  // This would be injected from context in a real implementation
  // For now, create a new client
  const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
  const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

  const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
  return DynamoDBDocumentClient.from(dynamoClient);
}

/**
 * Helper function to create DataLoader with common options
 */
function createDataLoaderWithOptions(batchLoadFn, options = {}) {
  return new DataLoader(batchLoadFn, {
    maxBatchSize: 100,
    cacheKeyFn: (key) => typeof key === 'string' ? key : JSON.stringify(key),
    ...options,
  });
}

/**
 * Clear all DataLoader caches - useful for testing or when data changes
 */
export function clearDataLoaderCaches(dataloaders) {
  Object.values(dataloaders).forEach(loader => {
    if (loader && typeof loader.clearAll === 'function') {
      loader.clearAll();
    }
  });
}
