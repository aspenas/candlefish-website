import ws from 'k6/ws';
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// Custom metrics for WebSocket testing
const wsConnectionErrors = new Rate('ws_connection_errors');
const wsMessageLatency = new Trend('ws_message_latency');
const wsActiveConnections = new Gauge('ws_active_connections');
const wsMessagesReceived = new Counter('ws_messages_received');
const wsMessagesSent = new Counter('ws_messages_sent');
const wsReconnections = new Counter('ws_reconnections');

// Test configuration for WebSocket stress testing
export const options = {
  stages: [
    // WebSocket connection ramp-up
    { duration: '1m', target: 100 },   // 100 concurrent WS connections
    { duration: '2m', target: 250 },   // 250 concurrent WS connections
    { duration: '2m', target: 500 },   // 500 concurrent WS connections
    { duration: '3m', target: 750 },   // 750 concurrent WS connections
    { duration: '5m', target: 1000 },  // 1000 concurrent WS connections (target load)
    
    // Stress phase
    { duration: '5m', target: 1000 },  // Sustain 1000 connections
    { duration: '2m', target: 1500 },  // Stress test - 1500 connections
    { duration: '3m', target: 1500 },  // Sustain stress load
    
    // Recovery and ramp-down
    { duration: '2m', target: 1000 },  // Back to normal load
    { duration: '2m', target: 500 },   // Ramp down
    { duration: '1m', target: 100 },   // Ramp down
    { duration: '1m', target: 0 },     // Complete shutdown
  ],
  
  thresholds: {
    // WebSocket specific thresholds
    'ws_connection_errors': ['rate<0.05'],     // Less than 5% connection errors
    'ws_message_latency': ['p(95)<500'],       // 95% of messages under 500ms latency
    'ws_active_connections': ['max>=1000'],     // Achieve at least 1000 concurrent connections
    
    // General thresholds
    'checks': ['rate>0.90'],                   // 90% of checks should pass
  },
};

// Configuration
const WS_URL = __ENV.WS_URL || 'ws://localhost:4001';
const API_URL = __ENV.API_URL || 'http://localhost:4000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

// Message types for testing
const MESSAGE_TYPES = [
  'subscribe_security_events',
  'subscribe_alerts',
  'subscribe_incidents',
  'subscribe_threats',
  'subscribe_system_status',
  'heartbeat',
  'unsubscribe',
];

// Subscription channels
const SUBSCRIPTION_CHANNELS = [
  'security_events',
  'alerts',
  'incidents',
  'threat_intelligence',
  'system_health',
  'user_activity',
];

// Get authentication token
function getAuthToken() {
  if (AUTH_TOKEN) {
    return AUTH_TOKEN;
  }
  
  // Get token via API
  const loginResponse = http.post(`${API_URL}/auth/login`, JSON.stringify({
    username: 'load-test-user',
    password: 'load-test-password',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (loginResponse.status === 200) {
    return loginResponse.json('token');
  }
  
  return null;
}

// Main WebSocket stress test
export default function () {
  const token = getAuthToken();
  if (!token) {
    console.error('Failed to get authentication token');
    return;
  }
  
  const wsUrl = `${WS_URL}?token=${token}`;
  
  // Track connection metrics
  let connectionStart = new Date();
  let activeConnection = false;
  let messagesReceived = 0;
  let messagesSent = 0;
  
  const res = ws.connect(wsUrl, {
    tags: { scenario: 'websocket_stress' },
  }, function (socket) {
    
    // Connection established
    socket.on('open', () => {
      activeConnection = true;
      wsActiveConnections.add(1);
      
      const connectionTime = new Date() - connectionStart;
      console.log(`WebSocket connected in ${connectionTime}ms`);
      
      // Initial subscriptions
      subscribeToChannels(socket);
      
      // Set up message handlers
      setupMessageHandlers(socket);
      
      // Start message simulation
      simulateUserActivity(socket);
    });
    
    // Handle incoming messages
    socket.on('message', (data) => {
      messagesReceived++;
      wsMessagesReceived.add(1);
      
      try {
        const message = JSON.parse(data);
        handleIncomingMessage(socket, message);
      } catch (e) {
        console.error('Failed to parse WebSocket message:', e);
        wsConnectionErrors.add(1);
      }
    });
    
    // Handle connection errors
    socket.on('error', (e) => {
      console.error('WebSocket error:', e);
      wsConnectionErrors.add(1);
      activeConnection = false;
      wsActiveConnections.add(-1);
    });
    
    // Handle connection close
    socket.on('close', () => {
      activeConnection = false;
      wsActiveConnections.add(-1);
      console.log(`Connection closed. Messages sent: ${messagesSent}, received: ${messagesReceived}`);
    });
    
    // Connection timeout and cleanup
    socket.setTimeout(() => {
      if (activeConnection) {
        socket.close();
      }
    }, Math.random() * 60000 + 30000); // 30-90 seconds
  });
  
  // Check connection establishment
  check(res, {
    'websocket connection established': (r) => r && r.status === 101,
  });
  
  if (!res || res.status !== 101) {
    wsConnectionErrors.add(1);
  }
}

// Subscribe to relevant channels
function subscribeToChannels(socket) {
  const channelsToSubscribe = SUBSCRIPTION_CHANNELS.slice(0, Math.floor(Math.random() * 3) + 2);
  
  channelsToSubscribe.forEach(channel => {
    const subscribeMessage = {
      type: 'subscribe',
      channel: channel,
      timestamp: new Date().toISOString(),
    };
    
    socket.send(JSON.stringify(subscribeMessage));
    wsMessagesSent.add(1);
  });
}

// Set up message handlers for different types
function setupMessageHandlers(socket) {
  // Ping/Pong for connection health
  socket.setInterval(() => {
    if (socket.readyState === 1) { // OPEN
      const pingMessage = {
        type: 'ping',
        timestamp: new Date().toISOString(),
      };
      
      socket.send(JSON.stringify(pingMessage));
      wsMessagesSent.add(1);
    }
  }, 30000); // Every 30 seconds
}

// Handle different types of incoming messages
function handleIncomingMessage(socket, message) {
  const receiveTime = new Date();
  
  // Calculate latency if timestamp is present
  if (message.timestamp) {
    const sentTime = new Date(message.timestamp);
    const latency = receiveTime - sentTime;
    wsMessageLatency.add(latency);
  }
  
  // Validate message structure
  const isValidMessage = check(message, {
    'message has type': (m) => m.type !== undefined,
    'message has valid format': (m) => typeof m === 'object',
  });
  
  if (!isValidMessage) {
    wsConnectionErrors.add(0.1); // Minor error for malformed messages
  }
  
  // Handle specific message types
  switch (message.type) {
    case 'security_event':
      handleSecurityEvent(socket, message);
      break;
    case 'alert':
      handleAlert(socket, message);
      break;
    case 'incident_update':
      handleIncidentUpdate(socket, message);
      break;
    case 'threat_intelligence':
      handleThreatIntelligence(socket, message);
      break;
    case 'system_health':
      handleSystemHealth(socket, message);
      break;
    case 'pong':
      // Connection health confirmed
      break;
    case 'error':
      wsConnectionErrors.add(1);
      console.error('Server error:', message.error);
      break;
    default:
      // Unknown message type
      console.warn('Unknown message type:', message.type);
  }
}

// Simulate realistic user activity
function simulateUserActivity(socket) {
  // Random user interactions
  socket.setInterval(() => {
    if (socket.readyState === 1) {
      const activity = Math.random();
      
      if (activity < 0.2) {
        // Request data update
        requestDataUpdate(socket);
      } else if (activity < 0.3) {
        // Change subscription
        changeSubscription(socket);
      } else if (activity < 0.4) {
        // Send acknowledgment
        sendAcknowledgment(socket);
      }
      // 60% of the time, just listen (realistic user behavior)
    }
  }, Math.random() * 10000 + 5000); // Every 5-15 seconds
}

// Request real-time data updates
function requestDataUpdate(socket) {
  const updateTypes = ['alerts', 'incidents', 'threats', 'events'];
  const requestType = updateTypes[Math.floor(Math.random() * updateTypes.length)];
  
  const requestMessage = {
    type: 'request_update',
    data_type: requestType,
    timestamp: new Date().toISOString(),
  };
  
  socket.send(JSON.stringify(requestMessage));
  wsMessagesSent.add(1);
}

// Change subscription preferences
function changeSubscription(socket) {
  const action = Math.random() < 0.5 ? 'subscribe' : 'unsubscribe';
  const channel = SUBSCRIPTION_CHANNELS[Math.floor(Math.random() * SUBSCRIPTION_CHANNELS.length)];
  
  const subscriptionMessage = {
    type: action,
    channel: channel,
    timestamp: new Date().toISOString(),
  };
  
  socket.send(JSON.stringify(subscriptionMessage));
  wsMessagesSent.add(1);
}

// Send acknowledgment for received alerts/incidents
function sendAcknowledgment(socket) {
  const ackMessage = {
    type: 'acknowledge',
    item_id: `item-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
  };
  
  socket.send(JSON.stringify(ackMessage));
  wsMessagesSent.add(1);
}

// Specific message handlers
function handleSecurityEvent(socket, message) {
  check(message, {
    'security event has severity': (m) => m.severity !== undefined,
    'security event has source': (m) => m.source !== undefined,
    'security event has timestamp': (m) => m.timestamp !== undefined,
  });
  
  // Simulate analyst response to high severity events
  if (message.severity === 'CRITICAL' || message.severity === 'HIGH') {
    // Send acknowledgment
    setTimeout(() => {
      if (socket.readyState === 1) {
        const response = {
          type: 'event_acknowledged',
          event_id: message.id,
          timestamp: new Date().toISOString(),
        };
        
        socket.send(JSON.stringify(response));
        wsMessagesSent.add(1);
      }
    }, Math.random() * 5000); // Random delay 0-5 seconds
  }
}

function handleAlert(socket, message) {
  check(message, {
    'alert has id': (m) => m.id !== undefined,
    'alert has title': (m) => m.title !== undefined,
    'alert has severity': (m) => m.severity !== undefined,
  });
  
  // Simulate alert triage workflow
  if (Math.random() < 0.3) { // 30% chance of interaction
    const response = {
      type: 'alert_interaction',
      alert_id: message.id,
      action: Math.random() < 0.7 ? 'acknowledge' : 'escalate',
      timestamp: new Date().toISOString(),
    };
    
    socket.send(JSON.stringify(response));
    wsMessagesSent.add(1);
  }
}

function handleIncidentUpdate(socket, message) {
  check(message, {
    'incident update has id': (m) => m.incident_id !== undefined,
    'incident update has status': (m) => m.status !== undefined,
  });
  
  // Track incident updates for assigned incidents
  if (message.assigned_to === 'current_user') {
    const response = {
      type: 'incident_viewed',
      incident_id: message.incident_id,
      timestamp: new Date().toISOString(),
    };
    
    socket.send(JSON.stringify(response));
    wsMessagesSent.add(1);
  }
}

function handleThreatIntelligence(socket, message) {
  check(message, {
    'threat intel has confidence': (m) => m.confidence !== undefined,
    'threat intel has indicators': (m) => Array.isArray(m.indicators),
  });
  
  // High confidence threats trigger analyst attention
  if (message.confidence > 0.8) {
    const response = {
      type: 'threat_reviewed',
      threat_id: message.id,
      analyst_notes: 'Reviewed during stress test',
      timestamp: new Date().toISOString(),
    };
    
    socket.send(JSON.stringify(response));
    wsMessagesSent.add(1);
  }
}

function handleSystemHealth(socket, message) {
  check(message, {
    'system health has status': (m) => m.status !== undefined,
    'system health has services': (m) => m.services !== undefined,
  });
  
  // Respond to system health degradation
  if (message.status === 'DEGRADED' || message.status === 'DOWN') {
    const response = {
      type: 'health_alert_acknowledged',
      timestamp: new Date().toISOString(),
    };
    
    socket.send(JSON.stringify(response));
    wsMessagesSent.add(1);
  }
}

// Connection stability test
export function connectionStabilityTest() {
  const token = getAuthToken();
  if (!token) return;
  
  const wsUrl = `${WS_URL}?token=${token}`;
  
  // Test multiple rapid connections
  for (let i = 0; i < 5; i++) {
    const connectionAttempt = ws.connect(wsUrl, function (socket) {
      socket.on('open', () => {
        // Immediately close to test connection churn
        setTimeout(() => socket.close(), 1000);
      });
    });
    
    check(connectionAttempt, {
      [`connection attempt ${i + 1} successful`]: (r) => r && r.status === 101,
    });
    
    sleep(0.1);
  }
}

// Message throughput test
export function messageThroughputTest() {
  const token = getAuthToken();
  if (!token) return;
  
  const wsUrl = `${WS_URL}?token=${token}`;
  
  ws.connect(wsUrl, function (socket) {
    socket.on('open', () => {
      // Send burst of messages
      const startTime = new Date();
      const messageCount = 100;
      
      for (let i = 0; i < messageCount; i++) {
        const message = {
          type: 'throughput_test',
          sequence: i,
          timestamp: new Date().toISOString(),
        };
        
        socket.send(JSON.stringify(message));
        wsMessagesSent.add(1);
      }
      
      const endTime = new Date();
      const throughput = messageCount / ((endTime - startTime) / 1000);
      
      console.log(`Message throughput: ${throughput.toFixed(2)} messages/second`);
      
      // Close after test
      setTimeout(() => socket.close(), 5000);
    });
    
    let receivedCount = 0;
    socket.on('message', () => {
      receivedCount++;
      if (receivedCount >= 100) {
        check(receivedCount, {
          'all messages received': (count) => count === 100,
        });
      }
    });
  });
}

// Reconnection resilience test
export function reconnectionTest() {
  const token = getAuthToken();
  if (!token) return;
  
  const wsUrl = `${WS_URL}?token=${token}`;
  let reconnectAttempts = 0;
  const maxReconnects = 3;
  
  function connect() {
    ws.connect(wsUrl, function (socket) {
      socket.on('open', () => {
        console.log(`Connected (attempt ${reconnectAttempts + 1})`);
        
        // Simulate network interruption after 5 seconds
        setTimeout(() => {
          socket.close(1000, 'Simulated network interruption');
        }, 5000);
      });
      
      socket.on('close', (code, reason) => {
        wsReconnections.add(1);
        reconnectAttempts++;
        
        console.log(`Connection closed: ${code} ${reason}`);
        
        if (reconnectAttempts < maxReconnects) {
          console.log(`Attempting reconnection ${reconnectAttempts + 1}`);
          setTimeout(connect, 2000); // Reconnect after 2 seconds
        }
      });
    });
  }
  
  connect();
  
  // Wait for all reconnection attempts
  sleep(30);
  
  check(reconnectAttempts, {
    'reconnection attempts made': (attempts) => attempts === maxReconnects,
  });
}

// Cleanup and reporting
export function teardown(data) {
  console.log('\n=== WebSocket Stress Test Results ===');
  console.log(`Active connections peak: ${wsActiveConnections.max}`);
  console.log(`Total messages sent: ${wsMessagesSent.count}`);
  console.log(`Total messages received: ${wsMessagesReceived.count}`);
  console.log(`Average message latency: ${wsMessageLatency.avg.toFixed(2)}ms`);
  console.log(`Connection error rate: ${(wsConnectionErrors.rate * 100).toFixed(2)}%`);
  console.log(`Total reconnections: ${wsReconnections.count}`);
  console.log('=====================================\n');
}