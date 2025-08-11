// WebSocket Service Lambda Function
// Handles real-time connections and messaging

const AWS = require('aws-sdk');
const jwt = require('jsonwebtoken');

const apiGateway = new AWS.ApiGatewayManagementApi({
  endpoint: process.env.WEBSOCKET_ENDPOINT
});
const dynamodb = new AWS.DynamoDB.DocumentClient({ region: process.env.AWS_REGION });
const secretsManager = new AWS.SecretsManager({ region: process.env.AWS_REGION });

// Cache for secrets
const secretsCache = new Map();

class WebSocketService {
  async getSecret(secretName) {
    if (secretsCache.has(secretName)) {
      const cached = secretsCache.get(secretName);
      if (Date.now() - cached.timestamp < 300000) { // 5 minutes cache
        return cached.value;
      }
    }

    try {
      const result = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
      const value = JSON.parse(result.SecretString);

      secretsCache.set(secretName, {
        value,
        timestamp: Date.now(),
      });

      return value;
    } catch (error) {
      console.error(`Failed to get secret ${secretName}:`, error);
      throw error;
    }
  }

  async authenticateConnection(token) {
    try {
      const jwtSecret = await this.getSecret('tyler-setup/auth/jwt-secret');
      const decoded = jwt.verify(token, jwtSecret.secret);

      return {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role,
        permissions: decoded.permissions || [],
      };
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  async storeConnection(connectionId, user, rooms = []) {
    const item = {
      connection_id: connectionId,
      user_id: user.id,
      user_email: user.email,
      user_role: user.role,
      rooms: rooms,
      connected_at: new Date().toISOString(),
      expires_at: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
      last_seen: new Date().toISOString(),
    };

    await dynamodb.put({
      TableName: process.env.WEBSOCKET_CONNECTIONS_TABLE,
      Item: item,
    }).promise();

    return item;
  }

  async removeConnection(connectionId) {
    await dynamodb.delete({
      TableName: process.env.WEBSOCKET_CONNECTIONS_TABLE,
      Key: { connection_id: connectionId },
    }).promise();
  }

  async getConnection(connectionId) {
    const result = await dynamodb.get({
      TableName: process.env.WEBSOCKET_CONNECTIONS_TABLE,
      Key: { connection_id: connectionId },
    }).promise();

    return result.Item;
  }

  async getUserConnections(userId) {
    const result = await dynamodb.query({
      TableName: process.env.WEBSOCKET_CONNECTIONS_TABLE,
      IndexName: 'UserConnections',
      KeyConditionExpression: 'user_id = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
    }).promise();

    return result.Items;
  }

  async getRoomConnections(roomId) {
    const result = await dynamodb.scan({
      TableName: process.env.WEBSOCKET_CONNECTIONS_TABLE,
      FilterExpression: 'contains(rooms, :roomId)',
      ExpressionAttributeValues: {
        ':roomId': roomId,
      },
    }).promise();

    return result.Items;
  }

  async joinRoom(connectionId, roomId) {
    const connection = await this.getConnection(connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    const rooms = connection.rooms || [];
    if (!rooms.includes(roomId)) {
      rooms.push(roomId);

      await dynamodb.update({
        TableName: process.env.WEBSOCKET_CONNECTIONS_TABLE,
        Key: { connection_id: connectionId },
        UpdateExpression: 'SET rooms = :rooms, last_seen = :lastSeen',
        ExpressionAttributeValues: {
          ':rooms': rooms,
          ':lastSeen': new Date().toISOString(),
        },
      }).promise();
    }

    return rooms;
  }

  async leaveRoom(connectionId, roomId) {
    const connection = await this.getConnection(connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    const rooms = (connection.rooms || []).filter(r => r !== roomId);

    await dynamodb.update({
      TableName: process.env.WEBSOCKET_CONNECTIONS_TABLE,
      Key: { connection_id: connectionId },
      UpdateExpression: 'SET rooms = :rooms, last_seen = :lastSeen',
      ExpressionAttributeValues: {
        ':rooms': rooms,
        ':lastSeen': new Date().toISOString(),
      },
    }).promise();

    return rooms;
  }

  async sendMessage(connectionId, message) {
    try {
      await apiGateway.postToConnection({
        ConnectionId: connectionId,
        Data: JSON.stringify(message),
      }).promise();

      return true;
    } catch (error) {
      if (error.statusCode === 410) {
        // Connection is stale, remove it
        await this.removeConnection(connectionId);
      }
      return false;
    }
  }

  async broadcastToRoom(roomId, message, excludeConnectionId = null) {
    const connections = await this.getRoomConnections(roomId);
    const promises = connections
      .filter(conn => conn.connection_id !== excludeConnectionId)
      .map(conn => this.sendMessage(conn.connection_id, message));

    const results = await Promise.allSettled(promises);
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;

    return { sent: successCount, total: promises.length };
  }

  async broadcastToUser(userId, message, excludeConnectionId = null) {
    const connections = await this.getUserConnections(userId);
    const promises = connections
      .filter(conn => conn.connection_id !== excludeConnectionId)
      .map(conn => this.sendMessage(conn.connection_id, message));

    const results = await Promise.allSettled(promises);
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;

    return { sent: successCount, total: promises.length };
  }

  async storeEvent(eventId, roomId, eventType, data, userId) {
    const event = {
      event_id: eventId,
      room_id: roomId,
      event_type: eventType,
      data: data,
      user_id: userId,
      timestamp: Date.now(),
      expires_at: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
      created_at: new Date().toISOString(),
    };

    await dynamodb.put({
      TableName: process.env.REAL_TIME_EVENTS_TABLE,
      Item: event,
    }).promise();

    return event;
  }

  async getRoomEvents(roomId, limit = 50, startTimestamp = null) {
    const params = {
      TableName: process.env.REAL_TIME_EVENTS_TABLE,
      IndexName: 'RoomEvents',
      KeyConditionExpression: 'room_id = :roomId',
      ExpressionAttributeValues: {
        ':roomId': roomId,
      },
      ScanIndexForward: false, // Newest first
      Limit: limit,
    };

    if (startTimestamp) {
      params.KeyConditionExpression += ' AND #timestamp < :startTimestamp';
      params.ExpressionAttributeValues[':startTimestamp'] = startTimestamp;
      params.ExpressionAttributeNames = { '#timestamp': 'timestamp' };
    }

    const result = await dynamodb.query(params).promise();
    return result.Items;
  }
}

const wsService = new WebSocketService();

// Lambda handlers for different WebSocket routes
exports.handler = async (event) => {
  const { requestContext } = event;
  const { connectionId, routeKey } = requestContext;

  console.log(`WebSocket event: ${routeKey} for connection ${connectionId}`);

  try {
    switch (routeKey) {
      case '$connect':
        return await handleConnect(event);
      case '$disconnect':
        return await handleDisconnect(event);
      case 'ping':
        return await handlePing(event);
      case 'join':
        return await handleJoinRoom(event);
      case 'leave':
        return await handleLeaveRoom(event);
      case 'message':
        return await handleMessage(event);
      case 'typing':
        return await handleTyping(event);
      case 'subscribe':
        return await handleSubscribe(event);
      default:
        return { statusCode: 400, body: 'Unknown route' };
    }
  } catch (error) {
    console.error('WebSocket handler error:', error);
    return { statusCode: 500, body: 'Internal server error' };
  }
};

async function handleConnect(event) {
  const { connectionId } = event.requestContext;
  const token = event.queryStringParameters?.token;

  if (!token) {
    return { statusCode: 401, body: 'Authentication token required' };
  }

  try {
    const user = await wsService.authenticateConnection(token);
    await wsService.storeConnection(connectionId, user);

    // Send welcome message
    await wsService.sendMessage(connectionId, {
      type: 'connected',
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        timestamp: new Date().toISOString(),
      },
    });

    return { statusCode: 200, body: 'Connected' };
  } catch (error) {
    console.error('Connection authentication failed:', error);
    return { statusCode: 401, body: 'Authentication failed' };
  }
}

async function handleDisconnect(event) {
  const { connectionId } = event.requestContext;

  try {
    await wsService.removeConnection(connectionId);
    return { statusCode: 200, body: 'Disconnected' };
  } catch (error) {
    console.error('Disconnect error:', error);
    return { statusCode: 500, body: 'Disconnect failed' };
  }
}

async function handlePing(event) {
  const { connectionId } = event.requestContext;

  try {
    await wsService.sendMessage(connectionId, {
      type: 'pong',
      timestamp: new Date().toISOString(),
    });

    // Update last seen
    await dynamodb.update({
      TableName: process.env.WEBSOCKET_CONNECTIONS_TABLE,
      Key: { connection_id: connectionId },
      UpdateExpression: 'SET last_seen = :lastSeen',
      ExpressionAttributeValues: {
        ':lastSeen': new Date().toISOString(),
      },
    }).promise();

    return { statusCode: 200, body: 'Pong sent' };
  } catch (error) {
    console.error('Ping error:', error);
    return { statusCode: 500, body: 'Ping failed' };
  }
}

async function handleJoinRoom(event) {
  const { connectionId } = event.requestContext;
  const body = JSON.parse(event.body || '{}');
  const { roomId } = body;

  if (!roomId) {
    return { statusCode: 400, body: 'Room ID required' };
  }

  try {
    const connection = await wsService.getConnection(connectionId);
    if (!connection) {
      return { statusCode: 404, body: 'Connection not found' };
    }

    const rooms = await wsService.joinRoom(connectionId, roomId);

    // Notify room about new member
    await wsService.broadcastToRoom(roomId, {
      type: 'user_joined',
      data: {
        user: {
          id: connection.user_id,
          email: connection.user_email,
          role: connection.user_role,
        },
        roomId,
        timestamp: new Date().toISOString(),
      },
    }, connectionId);

    // Send confirmation to user
    await wsService.sendMessage(connectionId, {
      type: 'joined_room',
      data: {
        roomId,
        rooms,
        timestamp: new Date().toISOString(),
      },
    });

    return { statusCode: 200, body: 'Joined room' };
  } catch (error) {
    console.error('Join room error:', error);
    return { statusCode: 500, body: 'Join room failed' };
  }
}

async function handleLeaveRoom(event) {
  const { connectionId } = event.requestContext;
  const body = JSON.parse(event.body || '{}');
  const { roomId } = body;

  if (!roomId) {
    return { statusCode: 400, body: 'Room ID required' };
  }

  try {
    const connection = await wsService.getConnection(connectionId);
    if (!connection) {
      return { statusCode: 404, body: 'Connection not found' };
    }

    const rooms = await wsService.leaveRoom(connectionId, roomId);

    // Notify room about member leaving
    await wsService.broadcastToRoom(roomId, {
      type: 'user_left',
      data: {
        user: {
          id: connection.user_id,
          email: connection.user_email,
          role: connection.user_role,
        },
        roomId,
        timestamp: new Date().toISOString(),
      },
    }, connectionId);

    // Send confirmation to user
    await wsService.sendMessage(connectionId, {
      type: 'left_room',
      data: {
        roomId,
        rooms,
        timestamp: new Date().toISOString(),
      },
    });

    return { statusCode: 200, body: 'Left room' };
  } catch (error) {
    console.error('Leave room error:', error);
    return { statusCode: 500, body: 'Leave room failed' };
  }
}

async function handleMessage(event) {
  const { connectionId } = event.requestContext;
  const body = JSON.parse(event.body || '{}');
  const { roomId, message, messageType = 'text' } = body;

  if (!roomId || !message) {
    return { statusCode: 400, body: 'Room ID and message required' };
  }

  try {
    const connection = await wsService.getConnection(connectionId);
    if (!connection) {
      return { statusCode: 404, body: 'Connection not found' };
    }

    // Check if user is in the room
    if (!connection.rooms || !connection.rooms.includes(roomId)) {
      return { statusCode: 403, body: 'Not a member of this room' };
    }

    const eventId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store the event
    await wsService.storeEvent(eventId, roomId, 'message', {
      message,
      messageType,
    }, connection.user_id);

    // Broadcast to room
    const messageData = {
      type: 'message',
      data: {
        id: eventId,
        roomId,
        message,
        messageType,
        user: {
          id: connection.user_id,
          email: connection.user_email,
          role: connection.user_role,
        },
        timestamp: new Date().toISOString(),
      },
    };

    await wsService.broadcastToRoom(roomId, messageData);

    return { statusCode: 200, body: 'Message sent' };
  } catch (error) {
    console.error('Message error:', error);
    return { statusCode: 500, body: 'Message failed' };
  }
}

async function handleTyping(event) {
  const { connectionId } = event.requestContext;
  const body = JSON.parse(event.body || '{}');
  const { roomId, isTyping } = body;

  if (!roomId) {
    return { statusCode: 400, body: 'Room ID required' };
  }

  try {
    const connection = await wsService.getConnection(connectionId);
    if (!connection) {
      return { statusCode: 404, body: 'Connection not found' };
    }

    // Check if user is in the room
    if (!connection.rooms || !connection.rooms.includes(roomId)) {
      return { statusCode: 403, body: 'Not a member of this room' };
    }

    // Broadcast typing indicator to room (excluding sender)
    await wsService.broadcastToRoom(roomId, {
      type: 'typing',
      data: {
        user: {
          id: connection.user_id,
          email: connection.user_email,
          role: connection.user_role,
        },
        roomId,
        isTyping,
        timestamp: new Date().toISOString(),
      },
    }, connectionId);

    return { statusCode: 200, body: 'Typing status sent' };
  } catch (error) {
    console.error('Typing error:', error);
    return { statusCode: 500, body: 'Typing failed' };
  }
}

async function handleSubscribe(event) {
  const { connectionId } = event.requestContext;
  const body = JSON.parse(event.body || '{}');
  const { roomId, eventTypes = [] } = body;

  if (!roomId) {
    return { statusCode: 400, body: 'Room ID required' };
  }

  try {
    const connection = await wsService.getConnection(connectionId);
    if (!connection) {
      return { statusCode: 404, body: 'Connection not found' };
    }

    // Get recent events for the room
    const events = await wsService.getRoomEvents(roomId, 25);

    // Filter events by type if specified
    const filteredEvents = eventTypes.length > 0
      ? events.filter(event => eventTypes.includes(event.event_type))
      : events;

    // Send historical events to the connection
    await wsService.sendMessage(connectionId, {
      type: 'room_history',
      data: {
        roomId,
        events: filteredEvents.reverse(), // Oldest first
        timestamp: new Date().toISOString(),
      },
    });

    return { statusCode: 200, body: 'Subscribed to room' };
  } catch (error) {
    console.error('Subscribe error:', error);
    return { statusCode: 500, body: 'Subscribe failed' };
  }
}
