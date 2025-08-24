// K6 WebSocket Performance Tests for Real-time Features
// Tests WebSocket connections, message throughput, and connection stability

import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { SharedArray } from 'k6/data';

// Custom metrics for WebSocket testing
const wsConnectionTime = new Trend('ws_connection_time', true);
const wsMessageLatency = new Trend('ws_message_latency', true);
const wsConnectionErrors = new Rate('ws_connection_errors');
const wsMessageErrors = new Rate('ws_message_errors');
const activeConnections = new Gauge('ws_active_connections');
const messagesReceived = new Counter('ws_messages_received');
const messagesSent = new Counter('ws_messages_sent');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const WS_BASE_URL = BASE_URL.replace(/^http/, 'ws');

const testSites = new SharedArray('sites', function () {
  return [
    'candlefish-ai',
    'staging-candlefish-ai',
    'paintbox-candlefish-ai',
    'inventory-candlefish-ai',
    'promoteros-candlefish-ai'
  ];
});

export const options = {
  scenarios: {
    // WebSocket connection load test
    websocket_connections: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },   // Ramp up to 50 connections
        { duration: '2m', target: 50 },    // Maintain 50 connections
        { duration: '30s', target: 100 },  // Scale to 100 connections
        { duration: '2m', target: 100 },   // Maintain 100 connections
        { duration: '30s', target: 0 },    // Ramp down
      ],
      gracefulRampDown: '30s',
      tags: { test_type: 'ws_connections' }
    },

    // High-frequency messaging test
    high_frequency_messaging: {
      executor: 'constant-vus',
      vus: 25,
      duration: '3m',
      tags: { test_type: 'high_frequency' }
    },

    // Connection stability test
    connection_stability: {
      executor: 'constant-vus',
      vus: 10,
      duration: '10m', // Long duration to test stability
      tags: { test_type: 'stability' }
    },

    // Concurrent deployment updates
    deployment_updates: {
      executor: 'per-vu-iterations',
      vus: 50,
      iterations: 10,
      tags: { test_type: 'deployment_updates' }
    }
  },

  thresholds: {
    // WebSocket connection time should be fast
    'ws_connection_time': [
      'p(95) < 1000', // 95% of connections should establish within 1s
      'p(99) < 2000', // 99% of connections should establish within 2s
    ],

    // Message latency should be minimal
    'ws_message_latency': [
      'p(95) < 100',  // 95% of messages should have <100ms latency
      'p(99) < 200',  // 99% of messages should have <200ms latency
    ],

    // Error rates should be minimal
    'ws_connection_errors': [
      'rate < 0.02',  // Less than 2% connection errors
    ],

    'ws_message_errors': [
      'rate < 0.01',  // Less than 1% message errors
    ],

    // Message throughput requirements
    'ws_messages_received': [
      'count > 1000', // Should receive at least 1000 messages during test
    ],
  },
};

export function setup() {
  console.log('🔌 Starting WebSocket Performance Tests');
  console.log(`🌐 WebSocket URL: ${WS_BASE_URL}`);

  return {
    timestamp: new Date().toISOString(),
    wsBaseUrl: WS_BASE_URL
  };
}

export default function (data) {
  const scenario = __ENV.K6_SCENARIO_NAME || 'websocket_connections';

  switch (scenario) {
    case 'high_frequency':
      testHighFrequencyMessaging(data);
      break;
    case 'stability':
      testConnectionStability(data);
      break;
    case 'deployment_updates':
      testDeploymentUpdates(data);
      break;
    default:
      testWebSocketConnections(data);
      break;
  }
}

function testWebSocketConnections(data) {
  const siteId = testSites[Math.floor(Math.random() * testSites.length)];
  const wsUrl = `${data.wsBaseUrl}/ws/sites/${siteId}`;

  const connectionStart = Date.now();
  let connectionEstablished = false;
  let messagesReceived = 0;

  const response = ws.connect(wsUrl, {}, function (socket) {
    const connectionTime = Date.now() - connectionStart;
    wsConnectionTime.add(connectionTime);
    connectionEstablished = true;

    // Update active connections gauge
    activeConnections.add(1);

    socket.on('open', () => {
      console.log(`✅ WebSocket connected to ${siteId} in ${connectionTime}ms`);

      // Subscribe to relevant channels
      const subscriptions = [
        'extension.updates',
        'deployment.progress',
        'health.status',
        'performance.metrics'
      ];

      subscriptions.forEach(channel => {
        const subscribeMessage = {
          type: 'subscribe',
          channel: channel,
          timestamp: Date.now()
        };

        socket.send(JSON.stringify(subscribeMessage));
        messagesSent.add(1);
      });

      // Send periodic ping messages
      socket.setInterval(() => {
        const pingMessage = {
          type: 'ping',
          timestamp: Date.now(),
          clientId: `test-client-${__VU}`
        };

        socket.send(JSON.stringify(pingMessage));
        messagesSent.add(1);
      }, 5000); // Ping every 5 seconds
    });

    socket.on('message', (data) => {
      messagesReceived++;
      const messageReceiveTime = Date.now();

      try {
        const message = JSON.parse(data);

        // Calculate latency if timestamp is present
        if (message.timestamp) {
          const latency = messageReceiveTime - message.timestamp;
          wsMessageLatency.add(latency);
        }

        // Validate message structure
        const messageValid = check(message, {
          'message has type': (msg) => typeof msg.type === 'string',
          'message has valid structure': (msg) => {
            switch (msg.type) {
              case 'subscription.confirmed':
                return msg.channel !== undefined;
              case 'extension.toggled':
                return msg.payload && msg.payload.siteId && msg.payload.extensionId;
              case 'deployment.progress':
                return msg.payload && typeof msg.payload.progress === 'number';
              case 'health.update':
                return msg.payload && msg.payload.siteId;
              case 'pong':
                return msg.timestamp !== undefined;
              default:
                return true; // Allow unknown message types
            }
          }
        });

        if (!messageValid) {
          wsMessageErrors.add(1);
        }

        messagesReceived.add(1);

        // Simulate different response types
        if (message.type === 'extension.toggled') {
          // Simulate client acknowledgment
          socket.send(JSON.stringify({
            type: 'ack',
            messageId: message.id || Date.now(),
            timestamp: Date.now()
          }));
          messagesSent.add(1);
        }

      } catch (error) {
        console.error(`❌ Failed to parse WebSocket message: ${error}`);
        wsMessageErrors.add(1);
      }
    });

    socket.on('error', (error) => {
      console.error(`❌ WebSocket error for ${siteId}: ${error.error()}`);
      wsConnectionErrors.add(1);
    });

    socket.on('close', () => {
      console.log(`🔌 WebSocket connection closed for ${siteId}`);
      activeConnections.add(-1);
    });

    // Keep connection open for test duration
    const testDuration = 60 + Math.random() * 30; // 60-90 seconds
    socket.setTimeout(() => {
      console.log(`⏰ Closing WebSocket connection for ${siteId} after ${testDuration}s`);
      socket.close();
    }, testDuration * 1000);
  });

  // Check if connection was successful
  const connectionSuccess = check(response, {
    'WebSocket connection established': () => connectionEstablished,
    'Connection URL is correct': (r) => r && r.url === wsUrl,
  });

  if (!connectionSuccess) {
    wsConnectionErrors.add(1);
  }

  sleep(1);
}

function testHighFrequencyMessaging(data) {
  const siteId = testSites[Math.floor(Math.random() * testSites.length)];
  const wsUrl = `${data.wsBaseUrl}/ws/sites/${siteId}`;

  let messageCount = 0;
  const testDuration = 30000; // 30 seconds of high-frequency messaging

  ws.connect(wsUrl, {}, function (socket) {
    activeConnections.add(1);

    socket.on('open', () => {
      console.log(`🚀 Starting high-frequency messaging test for ${siteId}`);

      // Send messages rapidly
      const sendInterval = socket.setInterval(() => {
        const message = {
          type: 'performance.request',
          siteId: siteId,
          timestamp: Date.now(),
          sequence: messageCount++
        };

        socket.send(JSON.stringify(message));
        messagesSent.add(1);
      }, 100); // Send message every 100ms

      // Stop after test duration
      socket.setTimeout(() => {
        socket.clearInterval(sendInterval);
        console.log(`📊 Sent ${messageCount} messages in ${testDuration / 1000}s`);
        socket.close();
      }, testDuration);
    });

    socket.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        const latency = Date.now() - (message.timestamp || Date.now());

        wsMessageLatency.add(latency);
        messagesReceived.add(1);

        // Validate high-frequency response
        check(message, {
          'high-frequency message valid': (msg) => msg.type !== undefined,
          'response latency acceptable': () => latency < 500, // Should respond within 500ms
        });

      } catch (error) {
        wsMessageErrors.add(1);
      }
    });

    socket.on('close', () => {
      activeConnections.add(-1);
    });
  });

  sleep(35); // Wait for test to complete
}

function testConnectionStability(data) {
  const siteId = testSites[Math.floor(Math.random() * testSites.length)];
  const wsUrl = `${data.wsBaseUrl}/ws/sites/${siteId}`;

  let reconnectCount = 0;
  let totalUptime = 0;
  let connectionStartTime = Date.now();

  function createConnection() {
    const connectionStart = Date.now();

    ws.connect(wsUrl, {}, function (socket) {
      activeConnections.add(1);
      connectionStartTime = Date.now();

      socket.on('open', () => {
        const connectionTime = Date.now() - connectionStart;
        wsConnectionTime.add(connectionTime);

        console.log(`🔄 Stable connection ${reconnectCount + 1} established in ${connectionTime}ms`);

        // Send heartbeat messages
        const heartbeatInterval = socket.setInterval(() => {
          socket.send(JSON.stringify({
            type: 'heartbeat',
            timestamp: Date.now(),
            clientId: `stability-test-${__VU}`
          }));
          messagesSent.add(1);
        }, 10000); // Every 10 seconds

        // Test connection for 2 minutes then reconnect
        socket.setTimeout(() => {
          socket.clearInterval(heartbeatInterval);
          totalUptime += Date.now() - connectionStartTime;
          socket.close();

          if (reconnectCount < 5) { // Test 5 reconnections
            reconnectCount++;
            sleep(2); // Wait 2 seconds before reconnecting
            createConnection();
          }
        }, 120000); // 2 minutes per connection
      });

      socket.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          messagesReceived.add(1);

          check(message, {
            'stability test message valid': (msg) => msg.type !== undefined,
          });

        } catch (error) {
          wsMessageErrors.add(1);
        }
      });

      socket.on('error', (error) => {
        console.error(`❌ Stability test connection error: ${error.error()}`);
        wsConnectionErrors.add(1);
        totalUptime += Date.now() - connectionStartTime;
      });

      socket.on('close', () => {
        activeConnections.add(-1);
        totalUptime += Date.now() - connectionStartTime;

        const uptimePercentage = (totalUptime / (Date.now() - connectionStart)) * 100;
        console.log(`📊 Connection uptime: ${uptimePercentage.toFixed(2)}%`);
      });
    });
  }

  createConnection();

  sleep(600); // Wait for all reconnections to complete (10 minutes)
}

function testDeploymentUpdates(data) {
  const siteId = testSites[Math.floor(Math.random() * testSites.length)];
  const wsUrl = `${data.wsBaseUrl}/ws/sites/${siteId}`;

  let deploymentUpdateCount = 0;

  ws.connect(wsUrl, {}, function (socket) {
    activeConnections.add(1);

    socket.on('open', () => {
      // Subscribe to deployment updates
      socket.send(JSON.stringify({
        type: 'subscribe',
        channel: 'deployment.updates',
        siteId: siteId
      }));
      messagesSent.add(1);

      // Simulate triggering deployment updates
      const deploymentStates = ['building', 'ready', 'error'];

      const triggerDeployment = () => {
        const state = deploymentStates[Math.floor(Math.random() * deploymentStates.length)];
        const deploymentUpdate = {
          type: 'deployment.simulate',
          payload: {
            siteId: siteId,
            state: state,
            buildId: `test-build-${Date.now()}`,
            timestamp: Date.now()
          }
        };

        socket.send(JSON.stringify(deploymentUpdate));
        messagesSent.add(1);
      };

      // Trigger multiple deployment updates
      for (let i = 0; i < 5; i++) {
        socket.setTimeout(triggerDeployment, i * 2000); // Every 2 seconds
      }
    });

    socket.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        messagesReceived.add(1);

        if (message.type === 'deployment.progress' || message.type === 'deployment.complete') {
          deploymentUpdateCount++;

          const isValid = check(message, {
            'deployment message has payload': (msg) => msg.payload !== undefined,
            'deployment has siteId': (msg) => msg.payload && msg.payload.siteId === siteId,
            'deployment has state': (msg) => msg.payload && msg.payload.state !== undefined,
          });

          if (!isValid) {
            wsMessageErrors.add(1);
          }
        }

      } catch (error) {
        wsMessageErrors.add(1);
      }
    });

    socket.on('close', () => {
      activeConnections.add(-1);
      console.log(`📦 Received ${deploymentUpdateCount} deployment updates`);
    });

    // Close connection after 15 seconds
    socket.setTimeout(() => {
      socket.close();
    }, 15000);
  });

  sleep(20);
}

export function handleSummary(data) {
  console.log('\n🔌 WebSocket Performance Test Summary');
  console.log(`⏱️  Connection Time P95: ${data.metrics.ws_connection_time.values.p95.toFixed(2)}ms`);
  console.log(`📡 Message Latency P95: ${data.metrics.ws_message_latency.values.p95.toFixed(2)}ms`);
  console.log(`❌ Connection Error Rate: ${(data.metrics.ws_connection_errors.values.rate * 100).toFixed(2)}%`);
  console.log(`❌ Message Error Rate: ${(data.metrics.ws_message_errors.values.rate * 100).toFixed(2)}%`);
  console.log(`📤 Messages Sent: ${data.metrics.ws_messages_sent.values.count}`);
  console.log(`📥 Messages Received: ${data.metrics.ws_messages_received.values.count}`);
  console.log(`🔗 Peak Active Connections: ${data.metrics.ws_active_connections.values.max}`);

  const thresholdsMet = {
    connectionTime: data.metrics.ws_connection_time.values.p95 < 1000,
    messageLatency: data.metrics.ws_message_latency.values.p95 < 100,
    connectionErrors: data.metrics.ws_connection_errors.values.rate < 0.02,
    messageErrors: data.metrics.ws_message_errors.values.rate < 0.01,
    messagesReceived: data.metrics.ws_messages_received.values.count > 1000
  };

  console.log('\n🎯 WebSocket Thresholds:');
  Object.entries(thresholdsMet).forEach(([metric, met]) => {
    console.log(`${met ? '✅' : '❌'} ${metric}: ${met ? 'PASSED' : 'FAILED'}`);
  });

  const allThresholdsMet = Object.values(thresholdsMet).every(Boolean);
  console.log(`\n🏆 Overall WebSocket Performance: ${allThresholdsMet ? 'PASSED' : 'FAILED'}`);

  return {
    'websocket-performance-summary.json': JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        connectionTimeP95: data.metrics.ws_connection_time.values.p95,
        messageLatencyP95: data.metrics.ws_message_latency.values.p95,
        connectionErrorRate: data.metrics.ws_connection_errors.values.rate,
        messageErrorRate: data.metrics.ws_message_errors.values.rate,
        messagesSent: data.metrics.ws_messages_sent.values.count,
        messagesReceived: data.metrics.ws_messages_received.values.count,
        peakActiveConnections: data.metrics.ws_active_connections.values.max,
        thresholdsMet: allThresholdsMet,
        detailedThresholds: thresholdsMet
      },
      rawMetrics: data.metrics
    }, null, 2)
  };
}
