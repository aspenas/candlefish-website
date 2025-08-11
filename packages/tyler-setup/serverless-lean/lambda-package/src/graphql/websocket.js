/**
 * WebSocket Handler for GraphQL Subscriptions
 * Manages real-time connections for 2000+ concurrent users
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { PutCommand, GetCommand, DeleteCommand, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import { GraphQLError, parse, execute, subscribe } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { validateAuth } from '../utils/security.js';
import { typeDefs } from './typeDefs.js';
import resolvers from './resolvers/index.js';
import { publishEvents } from './resolvers/subscriptionResolvers.js';

// Initialize clients
const dynamodb = new DynamoDBClient({
  region: process.env.AWS_REGION,
  maxAttempts: 3,
});

// In-memory connection cache for performance
const connectionCache = new Map();

// Create GraphQL schema
const schema = makeExecutableSchema({ typeDefs, resolvers });

/**
 * Main WebSocket handler
 */
export const handler = async (event) => {
  const { connectionId, routeKey, domainName, stage } = event.requestContext;

  console.log(`WebSocket event: ${routeKey} for connection: ${connectionId}`);

  try {
    switch (routeKey) {
      case '$connect':
        return await handleConnect(connectionId, event);
      case '$disconnect':
        return await handleDisconnect(connectionId);
      case '$default':
        return await handleMessage(connectionId, event, domainName, stage);
      default:
        return { statusCode: 400, body: 'Invalid route' };
    }
  } catch (error) {
    console.error(`WebSocket error for ${connectionId}:`, error);
    return {
      statusCode: error.statusCode || 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

/**
 * Handle new WebSocket connection
 */
async function handleConnect(connectionId, event) {
  try {
    // Extract authorization from query string or headers
    const token = event.queryStringParameters?.token ||
                 event.headers?.Authorization?.replace('Bearer ', '');

    if (!token) {
      return { statusCode: 401, body: 'Unauthorized' };
    }

    // Validate token and get user
    const user = await validateAuth({ headers: { Authorization: `Bearer ${token}` } });

    if (!user) {
      return { statusCode: 401, body: 'Invalid token' };
    }

    // Store connection in DynamoDB
    await dynamodb.send(new PutCommand({
      TableName: process.env.WS_CONNECTIONS_TABLE,
      Item: {
        connectionId,
        userId: user.id,
        userRole: user.role,
        userType: user.type || 'employee',
        connectedAt: Date.now(),
        ttl: Math.floor(Date.now() / 1000) + 86400, // 24 hour TTL
        subscriptions: [],
        metadata: {
          ip: event.requestContext.identity.sourceIp,
          userAgent: event.headers['User-Agent'],
        },
      },
    }));

    // Cache connection for faster access
    connectionCache.set(connectionId, {
      user,
      subscriptions: new Set(),
      lastActivity: Date.now(),
    });

    console.log(`WebSocket connected: ${connectionId} for user: ${user.id}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Connected', connectionId }),
    };
  } catch (error) {
    console.error('Connection error:', error);
    return { statusCode: 401, body: 'Connection failed' };
  }
}

/**
 * Handle WebSocket disconnection
 */
async function handleDisconnect(connectionId) {
  try {
    // Remove from cache
    connectionCache.delete(connectionId);

    // Remove from DynamoDB
    await dynamodb.send(new DeleteCommand({
      TableName: process.env.WS_CONNECTIONS_TABLE,
      Key: { connectionId },
    }));

    console.log(`WebSocket disconnected: ${connectionId}`);

    return { statusCode: 200, body: 'Disconnected' };
  } catch (error) {
    console.error('Disconnection error:', error);
    return { statusCode: 200, body: 'Disconnected' };
  }
}

/**
 * Handle incoming WebSocket messages
 */
async function handleMessage(connectionId, event, domainName, stage) {
  const apiGateway = new ApiGatewayManagementApiClient({
    endpoint: `https://${domainName}/${stage}`,
  });

  try {
    const message = JSON.parse(event.body);

    // Get connection from cache or database
    let connection = connectionCache.get(connectionId);
    if (!connection) {
      const result = await dynamodb.send(new GetCommand({
        TableName: process.env.WS_CONNECTIONS_TABLE,
        Key: { connectionId },
      }));

      if (!result.Item) {
        return { statusCode: 401, body: 'Connection not found' };
      }

      connection = {
        user: result.Item,
        subscriptions: new Set(result.Item.subscriptions || []),
        lastActivity: Date.now(),
      };
      connectionCache.set(connectionId, connection);
    }

    // Update last activity
    connection.lastActivity = Date.now();

    // Handle different message types
    switch (message.type) {
      case 'subscribe':
        return await handleSubscribe(connectionId, connection, message, apiGateway);
      case 'unsubscribe':
        return await handleUnsubscribe(connectionId, connection, message);
      case 'ping':
        await sendToConnection(apiGateway, connectionId, { type: 'pong', timestamp: Date.now() });
        return { statusCode: 200, body: 'Pong' };
      default:
        return { statusCode: 400, body: 'Invalid message type' };
    }
  } catch (error) {
    console.error('Message handling error:', error);

    // Send error to client
    try {
      await sendToConnection(apiGateway, connectionId, {
        type: 'error',
        message: error.message,
      });
    } catch (sendError) {
      console.error('Failed to send error to client:', sendError);
    }

    return { statusCode: 500, body: 'Message processing failed' };
  }
}

/**
 * Handle subscription request
 */
async function handleSubscribe(connectionId, connection, message, apiGateway) {
  const { id, query, variables, operationName } = message;

  try {
    // Parse and validate GraphQL subscription
    const document = parse(query);

    // Create context for subscription
    const context = {
      user: connection.user,
      connectionId,
      pubsub: { subscribe: () => {} }, // Mock pubsub for now
    };

    // Execute subscription
    const result = await subscribe({
      schema,
      document,
      variableValues: variables,
      operationName,
      contextValue: context,
    });

    if (result.errors) {
      await sendToConnection(apiGateway, connectionId, {
        id,
        type: 'error',
        errors: result.errors,
      });
      return { statusCode: 400, body: 'Subscription failed' };
    }

    // Store subscription
    const subscriptionKey = `${operationName || 'subscription'}_${id}`;
    connection.subscriptions.add(subscriptionKey);

    // Update in database
    await dynamodb.send(new UpdateCommand({
      TableName: process.env.WS_CONNECTIONS_TABLE,
      Key: { connectionId },
      UpdateExpression: 'SET subscriptions = :subs, lastActivity = :now',
      ExpressionAttributeValues: {
        ':subs': Array.from(connection.subscriptions),
        ':now': Date.now(),
      },
    }));

    // Send confirmation
    await sendToConnection(apiGateway, connectionId, {
      id,
      type: 'subscription_ack',
      message: 'Subscription active',
    });

    console.log(`Subscription added: ${subscriptionKey} for connection: ${connectionId}`);

    return { statusCode: 200, body: 'Subscribed' };
  } catch (error) {
    console.error('Subscription error:', error);
    await sendToConnection(apiGateway, connectionId, {
      id,
      type: 'error',
      message: error.message,
    });
    return { statusCode: 400, body: 'Subscription failed' };
  }
}

/**
 * Handle unsubscribe request
 */
async function handleUnsubscribe(connectionId, connection, message) {
  const { id } = message;

  try {
    // Remove subscription
    const subscriptionKey = Array.from(connection.subscriptions)
      .find(sub => sub.includes(`_${id}`));

    if (subscriptionKey) {
      connection.subscriptions.delete(subscriptionKey);

      // Update in database
      await dynamodb.send(new UpdateCommand({
        TableName: process.env.WS_CONNECTIONS_TABLE,
        Key: { connectionId },
        UpdateExpression: 'SET subscriptions = :subs',
        ExpressionAttributeValues: {
          ':subs': Array.from(connection.subscriptions),
        },
      }));

      console.log(`Subscription removed: ${subscriptionKey} for connection: ${connectionId}`);
    }

    return { statusCode: 200, body: 'Unsubscribed' };
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return { statusCode: 500, body: 'Unsubscribe failed' };
  }
}

/**
 * Send message to WebSocket connection
 */
async function sendToConnection(apiGateway, connectionId, data) {
  try {
    await apiGateway.send(new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: JSON.stringify(data),
    }));
  } catch (error) {
    if (error.statusCode === 410) {
      // Connection is gone, clean up
      console.log(`Stale connection detected: ${connectionId}`);
      await handleDisconnect(connectionId);
    } else {
      throw error;
    }
  }
}

/**
 * Broadcast event to all matching subscribers
 * Called from mutation resolvers when data changes
 */
export async function broadcastEvent(eventType, data, filter = {}) {
  const apiGateway = new ApiGatewayManagementApiClient({
    endpoint: process.env.WS_API_ENDPOINT,
  });

  try {
    // Get all active connections
    const result = await dynamodb.send(new ScanCommand({
      TableName: process.env.WS_CONNECTIONS_TABLE,
      FilterExpression: 'attribute_exists(connectionId)',
    }));

    if (!result.Items || result.Items.length === 0) {
      return;
    }

    // Send to each matching connection
    const sendPromises = result.Items.map(async (connection) => {
      // Check if user should receive this event
      if (!shouldReceiveEvent(connection, eventType, data, filter)) {
        return;
      }

      try {
        await sendToConnection(apiGateway, connection.connectionId, {
          type: 'subscription_data',
          event: eventType,
          data,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.error(`Failed to send to ${connection.connectionId}:`, error);
      }
    });

    await Promise.all(sendPromises);

    console.log(`Broadcasted ${eventType} to ${sendPromises.length} connections`);
  } catch (error) {
    console.error('Broadcast error:', error);
  }
}

/**
 * Check if connection should receive event based on permissions and filters
 */
function shouldReceiveEvent(connection, eventType, data, filter) {
  // Check user role permissions
  switch (eventType) {
    case 'AUDIT_LOG_ADDED':
    case 'USER_STATUS_CHANGED':
    case 'CONTRACTOR_ACCESS_CHANGED':
    case 'PERFORMANCE_ALERT':
      // Admin only events
      if (connection.userRole !== 'admin') {
        return false;
      }
      break;

    case 'SECRET_CHANGED':
      // Check if user can access this secret
      if (connection.userType === 'contractor') {
        const allowedSecrets = connection.allowedSecrets || [];
        if (!allowedSecrets.includes(data.name)) {
          return false;
        }
      } else if (connection.userRole !== 'admin' && connection.userRole !== 'user') {
        return false;
      }
      break;

    case 'CONFIG_CHANGED':
      // Check if config is public or user is admin
      if (!data.isPublic && connection.userRole !== 'admin') {
        return false;
      }
      break;
  }

  // Apply additional filters
  if (filter.userId && filter.userId !== connection.userId) {
    return false;
  }

  if (filter.role && filter.role !== connection.userRole) {
    return false;
  }

  return true;
}

/**
 * Clean up stale connections (called periodically)
 */
export async function cleanupStaleConnections() {
  const apiGateway = new ApiGatewayManagementApiClient({
    endpoint: process.env.WS_API_ENDPOINT,
  });

  try {
    // Get all connections
    const result = await dynamodb.send(new ScanCommand({
      TableName: process.env.WS_CONNECTIONS_TABLE,
    }));

    if (!result.Items) return;

    const now = Date.now();
    const staleThreshold = 30 * 60 * 1000; // 30 minutes

    for (const connection of result.Items) {
      const lastActivity = connection.lastActivity || connection.connectedAt;

      if (now - lastActivity > staleThreshold) {
        try {
          // Send ping to check if connection is alive
          await sendToConnection(apiGateway, connection.connectionId, {
            type: 'ping',
            timestamp: now,
          });
        } catch (error) {
          // Connection is dead, remove it
          console.log(`Removing stale connection: ${connection.connectionId}`);
          await handleDisconnect(connection.connectionId);
        }
      }
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

/**
 * WebSocket authorizer for $connect route
 */
export const wsAuthorizer = async (event) => {
  try {
    const token = event.queryStringParameters?.token ||
                 event.headers?.Authorization?.replace('Bearer ', '');

    if (!token) {
      return generatePolicy('user', 'Deny', event.methodArn);
    }

    const user = await validateAuth({ headers: { Authorization: `Bearer ${token}` } });

    if (!user) {
      return generatePolicy('user', 'Deny', event.methodArn);
    }

    return generatePolicy(user.id, 'Allow', event.methodArn, {
      userId: user.id,
      userRole: user.role,
      userType: user.type || 'employee',
    });
  } catch (error) {
    console.error('Authorization error:', error);
    return generatePolicy('user', 'Deny', event.methodArn);
  }
};

/**
 * Generate IAM policy for WebSocket authorization
 */
function generatePolicy(principalId, effect, resource, context = {}) {
  return {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource,
        },
      ],
    },
    context,
  };
}

// Export for use in mutation resolvers
export { publishEvents, broadcastEvent as publish };
