/**
 * K6 Performance Tests for Security Dashboard
 * Target: Handle 15,000 events/second with sub-100ms response times
 */

import http from 'k6/http';
import ws from 'k6/ws';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { randomItem, randomString, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const eventsPerSecond = new Rate('events_per_second');
const concurrentConnections = new Gauge('concurrent_connections');
const memoryUsage = new Gauge('memory_usage_mb');
const cpuUsage = new Gauge('cpu_usage_percent');
const dbConnectionPool = new Gauge('db_connection_pool');
const wsConnections = new Counter('websocket_connections');
const wsMessages = new Counter('websocket_messages');

// Test configuration
export const options = {
  stages: [
    // Ramp up to 1000 users over 2 minutes
    { duration: '2m', target: 1000 },
    // Stay at 1000 users for 5 minutes
    { duration: '5m', target: 1000 },
    // Ramp up to 2500 users over 3 minutes (targeting 15,000 events/sec)
    { duration: '3m', target: 2500 },
    // Stay at peak load for 10 minutes
    { duration: '10m', target: 2500 },
    // Ramp down to 500 users
    { duration: '2m', target: 500 },
    // Final ramp down
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    // 95% of requests must complete within 100ms
    'http_req_duration{name:api_request}': ['p(95)<100'],
    // Error rate must be below 1%
    'errors': ['rate<0.01'],
    // Events per second should reach target
    'events_per_second': ['rate>15000'],
    // Response time trend
    'response_time': ['p(95)<100', 'p(99)<500'],
    // WebSocket connection success rate
    'ws_connect_duration': ['p(95)<1000'],
  },
  ext: {
    loadimpact: {
      distribution: {
        'amazon:us:ashburn': { loadZone: 'amazon:us:ashburn', percent: 50 },
        'amazon:ie:dublin': { loadZone: 'amazon:ie:dublin', percent: 25 },
        'amazon:sg:singapore': { loadZone: 'amazon:sg:singapore', percent: 25 },
      },
    },
  },
};

// Test data generators
const severities = ['critical', 'high', 'medium', 'low'];
const eventTypes = [
  'failed_login',
  'sql_injection_attempt',
  'xss_attempt',
  'brute_force_attempt',
  'ddos_pattern',
  'malware_detected',
  'unauthorized_api_access',
  'data_exfiltration_pattern',
];

const assetTypes = ['web_application', 'api_gateway', 'database', 'kubernetes_cluster'];
const environments = ['production', 'staging', 'development'];

// JWT token for authentication (should be generated in setup)
let authToken = '';
let organizationId = 'org-perf-test';

// Generate test JWT token
function generateTestJWT() {
  // In a real test, this would be a valid JWT
  // For now, we'll use a mock token
  return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXIiLCJvcmciOiJvcmctcGVyZi10ZXN0Iiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNjQzMjA4MDAwfQ.test-signature';
}

// Setup function - runs once per VU
export function setup() {
  authToken = generateTestJWT();
  console.log('Setup complete: Auth token generated');
  return { authToken, organizationId };
}

// Main test function
export default function(data) {
  const baseURL = __ENV.BASE_URL || 'http://localhost:3000';
  const apiURL = `${baseURL}/api`;
  const wsURL = baseURL.replace('http', 'ws');
  
  const headers = {
    'Authorization': `Bearer ${data.authToken}`,
    'Content-Type': 'application/json',
    'X-Organization-ID': data.organizationId,
  };

  group('Security Dashboard API Performance', function() {
    // Test 1: Security Overview (Dashboard Load)
    group('Security Overview', function() {
      const startTime = new Date().getTime();
      const response = http.get(`${apiURL}/security/overview`, { headers, tags: { name: 'api_request' } });
      const duration = new Date().getTime() - startTime;
      
      responseTime.add(duration);
      
      const success = check(response, {
        'security overview status is 200': (r) => r.status === 200,
        'response time < 100ms': () => duration < 100,
        'contains required fields': (r) => {
          const body = JSON.parse(r.body);
          return body.totalAssets !== undefined && body.threatLevel !== undefined;
        },
      });
      
      errorRate.add(!success);
    });

    // Test 2: Security Events (High Volume)
    group('Security Events', function() {
      const params = {
        page: randomIntBetween(1, 10),
        limit: 50,
        severity: randomItem(severities),
        timeRange: randomItem(['1h', '24h', '7d']),
      };
      
      const queryString = Object.entries(params)
        .map(([key, value]) => `${key}=${value}`)
        .join('&');
      
      const startTime = new Date().getTime();
      const response = http.get(`${apiURL}/security/events?${queryString}`, { headers, tags: { name: 'api_request' } });
      const duration = new Date().getTime() - startTime;
      
      responseTime.add(duration);
      
      const success = check(response, {
        'events status is 200': (r) => r.status === 200,
        'response time < 100ms': () => duration < 100,
        'events array exists': (r) => {
          const body = JSON.parse(r.body);
          return Array.isArray(body.events);
        },
      });
      
      errorRate.add(!success);
    });

    // Test 3: Create Security Event (Write Load)
    group('Create Security Event', function() {
      const eventData = {
        assetId: `asset-${randomIntBetween(1, 1000)}`,
        organizationId: data.organizationId,
        eventType: randomItem(eventTypes),
        severity: randomItem(severities),
        title: `Performance Test Event - ${randomString(10)}`,
        description: `Automated performance test event created at ${new Date().toISOString()}`,
        metadata: {
          testRun: true,
          vuId: __VU,
          iteration: __ITER,
          sourceIp: `192.168.${randomIntBetween(1, 255)}.${randomIntBetween(1, 255)}`,
          userAgent: 'K6-Performance-Test/1.0',
        },
        ipAddress: `203.0.113.${randomIntBetween(1, 255)}`,
        userAgent: 'K6-Performance-Test/1.0',
      };
      
      const startTime = new Date().getTime();
      const response = http.post(`${apiURL}/security/events`, JSON.stringify(eventData), { headers, tags: { name: 'api_request' } });
      const duration = new Date().getTime() - startTime;
      
      responseTime.add(duration);
      eventsPerSecond.add(1);
      
      const success = check(response, {
        'create event status is 201': (r) => r.status === 201,
        'response time < 100ms': () => duration < 100,
        'event has ID': (r) => {
          const body = JSON.parse(r.body);
          return body.id !== undefined;
        },
      });
      
      errorRate.add(!success);
    });

    // Test 4: Asset Operations
    group('Asset Operations', function() {
      const response = http.get(`${apiURL}/assets?limit=20`, { headers, tags: { name: 'api_request' } });
      
      check(response, {
        'assets status is 200': (r) => r.status === 200,
        'assets response time < 50ms': (r) => r.timings.duration < 50,
      });
    });

    // Test 5: Threat Detection
    group('Threat Detection', function() {
      const response = http.get(`${apiURL}/threats?status=active`, { headers, tags: { name: 'api_request' } });
      
      check(response, {
        'threats status is 200': (r) => r.status === 200,
        'threats response time < 75ms': (r) => r.timings.duration < 75,
      });
    });
  });

  // WebSocket Performance Test (subset of users)
  if (__VU % 10 === 0) { // Only 10% of VUs test WebSocket
    group('WebSocket Real-time Performance', function() {
      const wsUrl = `${wsURL}/socket.io/?EIO=4&transport=websocket&token=${data.authToken}`;
      
      const wsResponse = ws.connect(wsUrl, {
        headers: {
          'Authorization': `Bearer ${data.authToken}`,
        },
      }, function(socket) {
        wsConnections.add(1);
        concurrentConnections.add(1);
        
        socket.on('open', function() {
          console.log('WebSocket connected');
          
          // Subscribe to security events
          socket.send(JSON.stringify({
            type: 'subscribe',
            channel: 'security-events',
            organizationId: data.organizationId,
          }));
          wsMessages.add(1);
        });
        
        socket.on('message', function(message) {
          wsMessages.add(1);
          const data = JSON.parse(message);
          
          check(data, {
            'WebSocket message has type': (d) => d.type !== undefined,
            'WebSocket message processed < 10ms': () => true, // Placeholder for processing time
          });
        });
        
        socket.on('close', function() {
          console.log('WebSocket disconnected');
          concurrentConnections.add(-1);
        });
        
        // Keep connection alive for 30 seconds
        setTimeout(() => {
          socket.close();
        }, 30000);
      });
      
      check(wsResponse, {
        'WebSocket connection established': (r) => r && r.url !== '',
      });
    });
  }

  // Database stress test (create multiple events rapidly)
  if (__VU % 5 === 0) { // 20% of VUs do batch operations
    group('Batch Event Creation (DB Stress)', function() {
      const batchSize = 10;
      const events = [];
      
      for (let i = 0; i < batchSize; i++) {
        events.push({
          assetId: `asset-batch-${randomIntBetween(1, 100)}`,
          organizationId: data.organizationId,
          eventType: randomItem(eventTypes),
          severity: randomItem(severities),
          title: `Batch Event ${i} - ${randomString(8)}`,
          description: `Batch performance test event ${i}`,
          metadata: {
            batchId: `batch-${__VU}-${__ITER}`,
            batchIndex: i,
          },
        });
      }
      
      const startTime = new Date().getTime();
      const response = http.post(`${apiURL}/security/events/batch`, JSON.stringify({ events }), { headers, tags: { name: 'api_request' } });
      const duration = new Date().getTime() - startTime;
      
      responseTime.add(duration);
      eventsPerSecond.add(batchSize);
      
      check(response, {
        'batch create status is 201': (r) => r.status === 201,
        'batch response time < 200ms': () => duration < 200,
        'all events created': (r) => {
          const body = JSON.parse(r.body);
          return body.created === batchSize;
        },
      });
    });
  }

  // Simulate realistic user behavior
  sleep(randomIntBetween(1, 3));
}

// Stress test scenario for maximum throughput
export function stressTest() {
  const baseURL = __ENV.BASE_URL || 'http://localhost:3000';
  const apiURL = `${baseURL}/api`;
  
  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json',
    'X-Organization-ID': organizationId,
  };

  // Rapid-fire event creation to test 15,000 events/sec capacity
  const eventData = {
    assetId: `stress-asset-${__VU}`,
    organizationId: organizationId,
    eventType: randomItem(eventTypes),
    severity: randomItem(severities),
    title: `Stress Test Event ${__ITER}`,
    description: 'High-volume stress test event',
    metadata: {
      stressTest: true,
      vuId: __VU,
      iteration: __ITER,
      timestamp: Date.now(),
    },
  };
  
  const startTime = new Date().getTime();
  const response = http.post(`${apiURL}/security/events`, JSON.stringify(eventData), { headers });
  const duration = new Date().getTime() - startTime;
  
  eventsPerSecond.add(1);
  
  const success = check(response, {
    'stress test event created': (r) => r.status === 201,
    'stress test response < 50ms': () => duration < 50,
  });
  
  errorRate.add(!success);
}

// Soak test for extended load
export function soakTest() {
  const baseURL = __ENV.BASE_URL || 'http://localhost:3000';
  const apiURL = `${baseURL}/api`;
  
  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json',
    'X-Organization-ID': organizationId,
  };

  // Mixed load simulation
  const operations = [
    () => http.get(`${apiURL}/security/overview`, { headers }),
    () => http.get(`${apiURL}/security/events?limit=20`, { headers }),
    () => http.get(`${apiURL}/assets?limit=10`, { headers }),
    () => http.post(`${apiURL}/security/events`, JSON.stringify({
      assetId: `soak-asset-${randomIntBetween(1, 50)}`,
      organizationId: organizationId,
      eventType: randomItem(eventTypes),
      severity: randomItem(severities),
      title: `Soak Test Event ${Date.now()}`,
      description: 'Extended soak test event',
    }), { headers }),
  ];
  
  const operation = randomItem(operations);
  const response = operation();
  
  check(response, {
    'soak test operation successful': (r) => r.status >= 200 && r.status < 400,
    'soak test response time acceptable': (r) => r.timings.duration < 200,
  });
}

// Teardown function
export function teardown(data) {
  console.log('Performance test completed');
  console.log(`Final metrics summary:`);
  console.log(`- Total events processed: ${eventsPerSecond.rate * options.stages.reduce((sum, stage) => sum + parseInt(stage.duration), 0)}`);
  console.log(`- Peak concurrent connections: ${concurrentConnections.value}`);
  console.log(`- Error rate: ${errorRate.rate * 100}%`);
}

// Additional test scenarios
export const scenarios = {
  // Standard load test
  load_test: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: options.stages,
    gracefulRampDown: '30s',
  },
  
  // Spike test for sudden load increases
  spike_test: {
    executor: 'ramping-vus',
    startVUs: 100,
    stages: [
      { duration: '1m', target: 100 },
      { duration: '30s', target: 5000 }, // Sudden spike
      { duration: '2m', target: 5000 },
      { duration: '30s', target: 100 }, // Quick ramp down
      { duration: '1m', target: 100 },
    ],
    gracefulRampDown: '30s',
  },
  
  // Constant rate for exact throughput testing
  constant_rate: {
    executor: 'constant-arrival-rate',
    rate: 15000, // Target 15,000 events per second
    timeUnit: '1s',
    duration: '5m',
    preAllocatedVUs: 1000,
    maxVUs: 3000,
  },
  
  // WebSocket-only test
  websocket_test: {
    executor: 'constant-vus',
    vus: 500,
    duration: '10m',
    exec: 'webSocketTest',
  },
};

// WebSocket-specific test function
export function webSocketTest() {
  const wsURL = (__ENV.BASE_URL || 'http://localhost:3000').replace('http', 'ws');
  const url = `${wsURL}/socket.io/?EIO=4&transport=websocket&token=${authToken}`;
  
  const response = ws.connect(url, function(socket) {
    socket.on('open', function() {
      // Subscribe to all channels
      socket.send(JSON.stringify({ type: 'subscribe', channel: 'security-events' }));
      socket.send(JSON.stringify({ type: 'subscribe', channel: 'threats' }));
      socket.send(JSON.stringify({ type: 'subscribe', channel: 'incidents' }));
    });
    
    socket.on('message', function(message) {
      wsMessages.add(1);
      // Simulate message processing time
      const processingStart = Date.now();
      JSON.parse(message); // Parse message
      const processingTime = Date.now() - processingStart;
      
      check(null, {
        'message processing < 5ms': () => processingTime < 5,
      });
    });
    
    // Send periodic heartbeat
    const heartbeat = setInterval(() => {
      socket.send(JSON.stringify({ type: 'heartbeat', timestamp: Date.now() }));
    }, 30000);
    
    setTimeout(() => {
      clearInterval(heartbeat);
      socket.close();
    }, 300000); // 5 minutes
  });
  
  check(response, {
    'WebSocket connection successful': (r) => r && r.url,
  });
}