/**
 * GraphQL Resolvers Index - Optimized for Performance
 * Implements efficient batching, caching, and N+1 query prevention
 */

import { queryResolvers } from './queryResolvers.js';
import { mutationResolvers } from './mutationResolvers.js';
import { subscriptionResolvers } from './subscriptionResolvers.js';
import { scalarResolvers } from './scalarResolvers.js';
import { nodeResolvers } from './nodeResolvers.js';
import { connectionResolvers } from './connectionResolvers.js';

/**
 * Combined resolvers with performance optimizations
 */
const resolvers = {
  // Scalar types
  ...scalarResolvers,

  // Root resolvers
  Query: queryResolvers,
  Mutation: mutationResolvers,
  Subscription: subscriptionResolvers,

  // Node interface resolvers
  Node: nodeResolvers,

  // Entity resolvers with DataLoader optimization
  User: {
    // Relationship resolvers use DataLoader for batching
    auditLogs: async (parent, args, context) => {
      const { first, after, last, before, filter } = args;
      return context.queryWithPagination(
        {
          TableName: process.env.AUDIT_TABLE,
          IndexName: 'user-index',
          KeyConditionExpression: 'userId = :userId',
          ExpressionAttributeValues: { ':userId': parent.id },
          ScanIndexForward: false, // Most recent first
        },
        after || before,
        first || last || 20
      );
    },

    contractorsInvited: async (parent, args, context) => {
      const { first, after, status } = args;
      const filterExpression = status
        ? 'invitedBy = :invitedBy AND #status = :status'
        : 'invitedBy = :invitedBy';

      const expressionAttributeValues = { ':invitedBy': parent.id };
      const expressionAttributeNames = {};

      if (status) {
        expressionAttributeValues[':status'] = status;
        expressionAttributeNames['#status'] = 'status';
      }

      return context.queryWithPagination(
        {
          TableName: process.env.CONTRACTORS_TABLE,
          IndexName: 'invitedBy-index',
          KeyConditionExpression: filterExpression,
          ExpressionAttributeValues: expressionAttributeValues,
          ...(status && { ExpressionAttributeNames: expressionAttributeNames }),
          ScanIndexForward: false,
        },
        after,
        first || 20
      );
    },
  },

  Contractor: {
    // Use DataLoader to batch user lookups
    invitedBy: async (parent, args, context) => {
      return context.getUser(parent.invitedBy);
    },

    auditLogs: async (parent, args, context) => {
      const { first, after, filter } = args;
      return context.queryWithPagination(
        {
          TableName: process.env.AUDIT_TABLE,
          IndexName: 'user-index',
          KeyConditionExpression: 'userId = :userId',
          ExpressionAttributeValues: { ':userId': parent.id },
          ScanIndexForward: false,
        },
        after,
        first || 20
      );
    },
  },

  Secret: {
    // Cache-optimized secret value resolution
    value: async (parent, args, context) => {
      // Check cache first
      const cacheKey = `secret:${parent.name}:value`;
      let value = await context.cache.get('secret', parent.name, { field: 'value' });

      if (value === null) {
        // Load from Secrets Manager
        const { SecretsManagerClient, GetSecretValueCommand } =
          await import('@aws-sdk/client-secrets-manager');

        const client = new SecretsManagerClient({ region: process.env.AWS_REGION });
        const result = await client.send(new GetSecretValueCommand({
          SecretId: `${process.env.SECRETS_PREFIX}/${parent.name}`
        }));

        try {
          value = JSON.parse(result.SecretString);
        } catch {
          value = result.SecretString;
        }

        // Cache for 5 minutes
        await context.cache.set('secret', parent.name, value, { field: 'value' }, 300);
      }

      // Mask sensitive data for contractors
      if (context.user?.type === 'contractor') {
        value = maskSensitiveData(value);
      }

      return value;
    },

    createdBy: async (parent, args, context) => {
      return context.getUser(parent.createdBy);
    },

    lastModifiedBy: async (parent, args, context) => {
      return parent.lastModifiedBy ? context.getUser(parent.lastModifiedBy) : null;
    },
  },

  AuditLog: {
    // Batch user resolution with DataLoader
    user: async (parent, args, context) => {
      return parent.userId ? context.getUser(parent.userId) : null;
    },
  },

  Config: {
    updatedBy: async (parent, args, context) => {
      return context.getUser(parent.updatedBy);
    },
  },

  // Connection resolvers for pagination
  ...connectionResolvers,
};

/**
 * Mask sensitive data for contractors
 */
function maskSensitiveData(data) {
  if (typeof data === 'string') {
    return data.length > 10 ? `${data.substring(0, 4)}****${data.substring(data.length - 2)}` : '****';
  }

  if (typeof data === 'object' && data !== null) {
    const masked = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string' && (
        key.toLowerCase().includes('password') ||
        key.toLowerCase().includes('secret') ||
        key.toLowerCase().includes('key') ||
        key.toLowerCase().includes('token')
      )) {
        masked[key] = '****';
      } else {
        masked[key] = value;
      }
    }
    return masked;
  }

  return data;
}

export default resolvers;
