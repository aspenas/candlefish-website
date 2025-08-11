/**
 * WebSocket Handler for GraphQL Subscriptions
 * Handles WebSocket lifecycle and GraphQL subscription events
 */

import { WebSocketManager } from '../graphql/websocket.js';
import { validateAuth } from '../utils/helpers.js';

const wsManager = new WebSocketManager();

/**
 * Handle WebSocket connection events
 */
export const connect = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    const connectionId = event.requestContext.connectionId;

    // Extract authentication from query parameters or headers
    let user = null;
    try {
      const token = event.queryStringParameters?.token ||
                   event.headers?.Authorization?.replace('Bearer ', '');

      if (token) {
        user = await validateAuth({ headers: { Authorization: `Bearer ${token}` } });
      }
    } catch (error) {
      console.warn('WebSocket authentication failed:', error.message);
      // Allow connection but limit access to authenticated subscriptions
    }

    await wsManager.handleConnect(connectionId, { user });

    console.log(`WebSocket connected: ${connectionId}`, { userId: user?.id });

    return {
      statusCode: 200,
      body: 'Connected',
    };
  } catch (error) {
    console.error('WebSocket connection error:', error);
    return {
      statusCode: 500,
      body: 'Connection failed',
    };
  }
};

/**
 * Handle WebSocket disconnection events
 */
export const disconnect = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    const connectionId = event.requestContext.connectionId;

    await wsManager.handleDisconnect(connectionId);

    console.log(`WebSocket disconnected: ${connectionId}`);

    return {
      statusCode: 200,
      body: 'Disconnected',
    };
  } catch (error) {
    console.error('WebSocket disconnection error:', error);
    return {
      statusCode: 500,
      body: 'Disconnection failed',
    };
  }
};

/**
 * Handle WebSocket messages (GraphQL operations)
 */
export const message = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    const connectionId = event.requestContext.connectionId;
    const message = JSON.parse(event.body);

    const response = await wsManager.handleMessage(connectionId, message);

    // Send response back to client if needed
    if (response) {
      await wsManager.sendToClient(connectionId, response);
    }

    return {
      statusCode: 200,
      body: 'Message processed',
    };
  } catch (error) {
    console.error('WebSocket message error:', error);

    try {
      // Send error message to client
      const connectionId = event.requestContext.connectionId;
      await wsManager.sendToClient(connectionId, {
        type: 'error',
        payload: {
          message: 'Message processing failed',
          extensions: {
            code: 'MESSAGE_ERROR',
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (sendError) {
      console.error('Failed to send error message:', sendError);
    }

    return {
      statusCode: 500,
      body: 'Message processing failed',
    };
  }
};

/**
 * Handle ping/pong for connection health
 */
export const ping = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    const connectionId = event.requestContext.connectionId;

    await wsManager.sendToClient(connectionId, {
      type: 'pong',
      timestamp: Date.now(),
    });

    return {
      statusCode: 200,
      body: 'Pong sent',
    };
  } catch (error) {
    console.error('WebSocket ping error:', error);
    return {
      statusCode: 500,
      body: 'Ping failed',
    };
  }
};
