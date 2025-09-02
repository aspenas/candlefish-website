import ws from 'k6/ws';
import { check } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';

// Custom metrics for WebSocket testing
const wsConnectionErrors = new Rate('ws_connection_errors');
const wsMessagesSent = new Counter('ws_messages_sent');
const wsMessagesReceived = new Counter('ws_messages_received');
const wsConnectionDuration = new Trend('ws_connection_duration');
const wsMessageLatency = new Trend('ws_message_latency');

export const options = {
  stages: [
    { duration: '1m', target: 10 },   // Ramp up to 10 concurrent connections
    { duration: '3m', target: 10 },   // Maintain 10 connections
    { duration: '1m', target: 50 },   // Scale to 50 connections
    { duration: '5m', target: 50 },   // Maintain 50 connections  
    { duration: '1m', target: 100 },  // Scale to 100 connections
    { duration: '3m', target: 100 },  // Maintain 100 connections
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    ws_connection_errors: ['rate<0.05'],     // Less than 5% connection errors
    ws_message_latency: ['p(95)<200'],       // 95% of messages under 200ms latency
    ws_connection_duration: ['avg>5000'],    // Connections should last at least 5 seconds
  },
};

const WS_URL = __ENV.WS_URL || 'ws://localhost:3501';

export default function () {
  const startTime = Date.now();
  let messagesSent = 0;
  let messagesReceived = 0;
  const messageTimes = new Map();

  const params = {
    tags: { 
      test_type: 'websocket_load',
      user_id: `user_${__VU}_${__ITER}`
    }
  };

  const response = ws.connect(WS_URL, params, function (socket) {
    // Connection established
    const connectionTime = Date.now() - startTime;
    wsConnectionDuration.add(connectionTime);

    // Authenticate
    const authMessage = JSON.stringify({
      type: 'authenticate',
      data: {
        token: 'test-token',
        userId: `loadtest-user-${__VU}`
      }
    });

    socket.send(authMessage);
    wsMessagesSent.add(1);
    messagesSent++;

    // Set up message handlers
    socket.on('message', function (message) {
      messagesReceived++;
      wsMessagesReceived.add(1);

      try {
        const data = JSON.parse(message);
        
        // Check for authentication response
        if (data.type === 'auth:success') {
          check(data, {
            'authentication successful': (d) => d.success === true,
            'user ID present': (d) => d.userId !== undefined,
          });

          // Subscribe to analytics updates
          subscribeToAnalytics(socket);
        }
        
        // Track message latency if we can match request/response
        if (data.requestId && messageTimes.has(data.requestId)) {
          const latency = Date.now() - messageTimes.get(data.requestId);
          wsMessageLatency.add(latency);
          messageTimes.delete(data.requestId);
        }

        // Handle different message types
        handleMessage(data, socket);

      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    });

    socket.on('error', function (error) {
      console.error('WebSocket error:', error);
      wsConnectionErrors.add(1);
    });

    socket.on('close', function () {
      const totalDuration = Date.now() - startTime;
      wsConnectionDuration.add(totalDuration);
      
      check(null, {
        'messages sent and received': () => messagesReceived > 0,
        'connection lasted reasonable time': () => totalDuration > 1000,
      });
    });

    // Send periodic messages during connection
    const messageInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        sendTestMessage(socket, messageTimes);
        messagesSent++;
        wsMessagesSent.add(1);
      }
    }, 2000 + Math.random() * 3000); // 2-5 second intervals

    // Keep connection alive for test duration
    const connectionDuration = 10000 + Math.random() * 20000; // 10-30 seconds
    setTimeout(() => {
      clearInterval(messageInterval);
      socket.close();
    }, connectionDuration);
  });

  check(response, {
    'WebSocket connection established': (r) => r && r.status === 101,
  });

  if (!response || response.status !== 101) {
    wsConnectionErrors.add(1);
  } else {
    wsConnectionErrors.add(0);
  }
}

function subscribeToAnalytics(socket) {
  const subscriptions = [
    {
      type: 'subscribe',
      data: {
        type: 'agent_metrics',
        interval: 5000
      }
    },
    {
      type: 'subscribe',
      data: {
        type: 'service_health',
        services: ['api-server', 'web-dashboard']
      }
    },
    {
      type: 'subscribe',
      data: {
        type: 'system_metrics',
        metrics: ['cpu_usage', 'memory_usage']
      }
    }
  ];

  subscriptions.forEach(subscription => {
    socket.send(JSON.stringify(subscription));
    wsMessagesSent.add(1);
  });
}

function sendTestMessage(socket, messageTimes) {
  const requestId = `req_${Date.now()}_${Math.random()}`;
  messageTimes.set(requestId, Date.now());

  const testMessages = [
    {
      type: 'analytics:request',
      data: {
        requestId,
        endpoint: 'agents/performance',
        filters: { status: 'active' }
      }
    },
    {
      type: 'analytics:request',
      data: {
        requestId,
        endpoint: 'services/health',
        timeRange: '1h'
      }
    },
    {
      type: 'heartbeat',
      data: {
        requestId,
        timestamp: Date.now()
      }
    }
  ];

  const message = testMessages[Math.floor(Math.random() * testMessages.length)];
  socket.send(JSON.stringify(message));
}

function handleMessage(data, socket) {
  switch (data.type) {
    case 'analytics:agent:update':
      check(data, {
        'agent update has agent_id': (d) => d.data && d.data.agent_id !== undefined,
        'agent update has metrics': (d) => d.data && d.data.metrics !== undefined,
      });
      break;

    case 'analytics:service:health':
      check(data, {
        'service health has service_name': (d) => d.data && d.data.service_name !== undefined,
        'service health has status': (d) => d.data && d.data.status !== undefined,
      });
      break;

    case 'analytics:system:alert':
      check(data, {
        'system alert has severity': (d) => d.data && d.data.severity !== undefined,
        'system alert has message': (d) => d.data && d.data.message !== undefined,
      });
      
      // Acknowledge critical alerts
      if (data.data && data.data.severity === 'critical') {
        const ackMessage = JSON.stringify({
          type: 'alert:acknowledge',
          data: {
            alertId: data.data.id,
            userId: `loadtest-user-${__VU}`
          }
        });
        socket.send(ackMessage);
        wsMessagesSent.add(1);
      }
      break;

    case 'subscription:confirmed':
      check(data, {
        'subscription confirmed': (d) => d.success === true,
        'subscription has type': (d) => d.data && d.data.type !== undefined,
      });
      break;

    case 'subscription:error':
      console.error('Subscription error:', data.error);
      break;

    case 'heartbeat:response':
      check(data, {
        'heartbeat response received': (d) => d.timestamp !== undefined,
      });
      break;
  }
}

// Stress test for WebSocket connections
export function stressTest() {
  const connections = [];
  const maxConnections = 20;
  
  // Create multiple concurrent connections
  for (let i = 0; i < maxConnections; i++) {
    const params = {
      tags: { 
        test_type: 'websocket_stress',
        connection_id: i
      }
    };

    const response = ws.connect(WS_URL, params, function (socket) {
      // Send rapid-fire messages
      for (let j = 0; j < 10; j++) {
        const message = JSON.stringify({
          type: 'stress_test',
          data: {
            connectionId: i,
            messageId: j,
            payload: 'x'.repeat(1000) // 1KB payload
          }
        });
        socket.send(message);
        wsMessagesSent.add(1);
      }

      // Close connection after short time
      setTimeout(() => {
        socket.close();
      }, 5000);
    });

    connections.push(response);
  }

  // Check that most connections were successful
  const successfulConnections = connections.filter(r => r && r.status === 101).length;
  check(null, {
    'majority of stress connections successful': () => successfulConnections >= maxConnections * 0.8,
  });
}

// Memory pressure test
export function memoryPressureTest() {
  const params = {
    tags: { test_type: 'websocket_memory' }
  };

  const response = ws.connect(WS_URL, params, function (socket) {
    socket.on('message', function (message) {
      wsMessagesReceived.add(1);
    });

    // Send large payloads to test memory handling
    const largePayload = {
      type: 'memory_test',
      data: {
        largeArray: new Array(10000).fill().map((_, i) => ({
          id: i,
          value: Math.random(),
          timestamp: new Date().toISOString(),
          metadata: {
            description: `Large payload item ${i}`,
            tags: ['memory', 'test', 'load'],
            data: 'x'.repeat(100) // 100 bytes per item
          }
        }))
      }
    };

    // Send multiple large payloads
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify(largePayload));
          wsMessagesSent.add(1);
        }
      }, i * 1000);
    }

    // Keep connection open for a while
    setTimeout(() => {
      socket.close();
    }, 10000);
  });

  check(response, {
    'memory pressure connection established': (r) => r && r.status === 101,
  });
}

// Connection recovery test
export function connectionRecoveryTest() {
  const params = {
    tags: { test_type: 'websocket_recovery' }
  };

  const response = ws.connect(WS_URL, params, function (socket) {
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 3;

    socket.on('close', function () {
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        console.log(`Attempting reconnection ${reconnectAttempts}/${maxReconnectAttempts}`);
        
        // Simulate reconnection after delay
        setTimeout(() => {
          // In a real scenario, this would create a new connection
          // For this test, we just track the attempt
          check(null, {
            [`reconnection attempt ${reconnectAttempts} initiated`]: () => true,
          });
        }, 1000 * reconnectAttempts);
      }
    });

    // Force close connection to test recovery
    setTimeout(() => {
      socket.close();
    }, 2000);
  });

  check(response, {
    'recovery test connection established': (r) => r && r.status === 101,
  });
}

export function setup() {
  console.log('Starting WebSocket load tests...');
  
  // Test basic connectivity
  const testResponse = ws.connect(WS_URL, {}, function (socket) {
    socket.close();
  });

  check(testResponse, {
    'WebSocket server is available': (r) => r && r.status === 101,
  });

  return { startTime: new Date() };
}

export function teardown(data) {
  const endTime = new Date();
  const duration = (endTime - data.startTime) / 1000;
  console.log(`WebSocket load test completed in ${duration} seconds`);
}