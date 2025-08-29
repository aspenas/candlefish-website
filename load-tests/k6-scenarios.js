/**
 * K6 Load Testing Scenarios for Security Dashboard
 * Target: 1000+ concurrent users, <100ms P95 response time
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { randomItem, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import ws from 'k6/ws';
import { SharedArray } from 'k6/data';

// Custom metrics
const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');
const wsLatency = new Trend('websocket_latency');
const eventProcessingRate = new Counter('events_processed');
const activeConnections = new Gauge('active_connections');
const cacheHitRate = new Rate('cache_hits');

// Test configuration
const BASE_URL = __ENV.BASE_URL || 'https://security.candlefish.ai';
const WS_URL = __ENV.WS_URL || 'wss://ws.security.candlefish.ai';
const API_TOKEN = __ENV.API_TOKEN || 'test-token';

// Load test data
const testUsers = new SharedArray('users', function () {
  return JSON.parse(open('./test-data/users.json'));
});

const securityEvents = new SharedArray('events', function () {
  return JSON.parse(open('./test-data/security-events.json'));
});

// Test scenarios
export const options = {
  scenarios: {
    // Scenario 1: Baseline Load Test
    baseline: {
      executor: 'constant-vus',
      vus: 100,
      duration: '5m',
      gracefulStop: '30s',
      tags: { scenario: 'baseline' },
    },

    // Scenario 2: Stress Test - Gradual ramp up to 1000 users
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },  // Warm up
        { duration: '3m', target: 500 },  // Ramp up to 500 users
        { duration: '5m', target: 1000 }, // Ramp up to 1000 users
        { duration: '10m', target: 1000 }, // Stay at 1000 users
        { duration: '3m', target: 500 },  // Scale down
        { duration: '2m', target: 0 },    // Cool down
      ],
      gracefulStop: '30s',
      tags: { scenario: 'stress' },
    },

    // Scenario 3: Spike Test - Sudden load increase
    spike: {
      executor: 'ramping-vus',
      startVUs: 100,
      stages: [
        { duration: '1m', target: 100 },  // Baseline
        { duration: '10s', target: 1500 }, // Spike to 1500 users
        { duration: '3m', target: 1500 },  // Hold spike
        { duration: '10s', target: 100 },  // Back to baseline
        { duration: '2m', target: 100 },   // Recovery
      ],
      gracefulStop: '30s',
      tags: { scenario: 'spike' },
    },

    // Scenario 4: Soak Test - Extended duration
    soak: {
      executor: 'constant-vus',
      vus: 500,
      duration: '2h',
      gracefulStop: '30s',
      tags: { scenario: 'soak' },
    },

    // Scenario 5: WebSocket Load Test
    websocket: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 100 },
        { duration: '2m', target: 500 },
        { duration: '5m', target: 500 },
        { duration: '2m', target: 0 },
      ],
      gracefulStop: '30s',
      exec: 'websocketTest',
      tags: { scenario: 'websocket' },
    },

    // Scenario 6: API Burst Test
    burst: {
      executor: 'shared-iterations',
      vus: 200,
      iterations: 10000,
      maxDuration: '5m',
      tags: { scenario: 'burst' },
    },

    // Scenario 7: Event Processing Test
    eventProcessing: {
      executor: 'constant-arrival-rate',
      rate: 10000, // 10,000 events per second
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 500,
      maxVUs: 1000,
      exec: 'eventProcessingTest',
      tags: { scenario: 'event-processing' },
    },
  },

  thresholds: {
    // API response time thresholds
    'http_req_duration{scenario:baseline}': ['p(95)<100', 'p(99)<200'],
    'http_req_duration{scenario:stress}': ['p(95)<150', 'p(99)<300'],
    'http_req_duration{scenario:spike}': ['p(95)<200', 'p(99)<500'],
    'http_req_duration{scenario:soak}': ['p(95)<100', 'p(99)<200'],
    
    // WebSocket latency thresholds
    'websocket_latency': ['p(95)<10', 'p(99)<20'],
    
    // Error rate thresholds
    'errors': ['rate<0.01'], // Less than 1% error rate
    'http_req_failed': ['rate<0.01'],
    
    // Throughput thresholds
    'http_reqs': ['rate>1000'], // More than 1000 requests per second
    'events_processed': ['rate>10000'], // More than 10,000 events per second
    
    // Cache performance
    'cache_hits': ['rate>0.8'], // 80% cache hit rate
  },
};

// Default test function
export default function () {
  const user = randomItem(testUsers);
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_TOKEN}`,
    'X-User-Id': user.id,
  };

  group('Dashboard Load', () => {
    // Get dashboard overview
    const dashboardStart = new Date();
    const dashboardRes = http.get(`${BASE_URL}/api/dashboard/overview`, { headers });
    apiLatency.add(new Date() - dashboardStart);
    
    check(dashboardRes, {
      'dashboard status 200': (r) => r.status === 200,
      'dashboard response time < 100ms': (r) => r.timings.duration < 100,
      'dashboard has data': (r) => r.json() && r.json().data,
    }) || errorRate.add(1);

    // Check cache header
    if (dashboardRes.headers['X-Cache-Status'] === 'HIT') {
      cacheHitRate.add(1);
    } else {
      cacheHitRate.add(0);
    }
  });

  sleep(randomIntBetween(1, 3));

  group('Security Events', () => {
    // Get recent security events
    const eventsStart = new Date();
    const eventsRes = http.get(`${BASE_URL}/api/security/events?limit=50`, { headers });
    apiLatency.add(new Date() - eventsStart);
    
    check(eventsRes, {
      'events status 200': (r) => r.status === 200,
      'events response time < 150ms': (r) => r.timings.duration < 150,
      'events array returned': (r) => Array.isArray(r.json().events),
    }) || errorRate.add(1);

    // Post new security event
    const newEvent = randomItem(securityEvents);
    const postStart = new Date();
    const postRes = http.post(
      `${BASE_URL}/api/security/events`,
      JSON.stringify(newEvent),
      { headers }
    );
    apiLatency.add(new Date() - postStart);
    
    check(postRes, {
      'post event status 201': (r) => r.status === 201,
      'post event response time < 50ms': (r) => r.timings.duration < 50,
      'event created': (r) => r.json() && r.json().id,
    }) || errorRate.add(1);

    if (postRes.status === 201) {
      eventProcessingRate.add(1);
    }
  });

  sleep(randomIntBetween(1, 2));

  group('Alerts', () => {
    // Get active alerts
    const alertsStart = new Date();
    const alertsRes = http.get(`${BASE_URL}/api/alerts?status=active`, { headers });
    apiLatency.add(new Date() - alertsStart);
    
    check(alertsRes, {
      'alerts status 200': (r) => r.status === 200,
      'alerts response time < 100ms': (r) => r.timings.duration < 100,
    }) || errorRate.add(1);

    // Acknowledge random alert
    if (alertsRes.status === 200 && alertsRes.json().alerts?.length > 0) {
      const alert = randomItem(alertsRes.json().alerts);
      const ackStart = new Date();
      const ackRes = http.patch(
        `${BASE_URL}/api/alerts/${alert.id}/acknowledge`,
        null,
        { headers }
      );
      apiLatency.add(new Date() - ackStart);
      
      check(ackRes, {
        'acknowledge status 200': (r) => r.status === 200,
        'acknowledge response time < 50ms': (r) => r.timings.duration < 50,
      }) || errorRate.add(1);
    }
  });

  sleep(randomIntBetween(2, 5));

  group('Metrics', () => {
    // Get metrics data
    const metricsStart = new Date();
    const metricsRes = http.get(
      `${BASE_URL}/api/metrics?from=${Date.now() - 3600000}&to=${Date.now()}`,
      { headers }
    );
    apiLatency.add(new Date() - metricsStart);
    
    check(metricsRes, {
      'metrics status 200': (r) => r.status === 200,
      'metrics response time < 200ms': (r) => r.timings.duration < 200,
      'metrics has data points': (r) => r.json() && r.json().dataPoints,
    }) || errorRate.add(1);
  });

  sleep(randomIntBetween(1, 3));
}

// WebSocket test function
export function websocketTest() {
  const user = randomItem(testUsers);
  const url = `${WS_URL}/events?token=${API_TOKEN}&userId=${user.id}`;
  
  const res = ws.connect(url, null, function (socket) {
    activeConnections.add(1);
    
    socket.on('open', () => {
      console.log(`WebSocket connected for user ${user.id}`);
      
      // Subscribe to events
      socket.send(JSON.stringify({
        type: 'subscribe',
        channels: ['security', 'alerts', 'metrics'],
      }));

      // Send events periodically
      socket.setInterval(() => {
        const event = randomItem(securityEvents);
        const startTime = new Date();
        
        socket.send(JSON.stringify({
          type: 'security:event',
          data: event,
          timestamp: Date.now(),
        }));

        socket.setTimeout(() => {
          wsLatency.add(new Date() - startTime);
        }, 100);

        eventProcessingRate.add(1);
      }, 100); // Send event every 100ms
    });

    socket.on('message', (data) => {
      const message = JSON.parse(data);
      
      check(message, {
        'ws message has type': (m) => m.type !== undefined,
        'ws message has timestamp': (m) => m.timestamp !== undefined,
      }) || errorRate.add(1);

      // Calculate round-trip latency
      if (message.type === 'pong' && message.timestamp) {
        const latency = Date.now() - message.timestamp;
        wsLatency.add(latency);
        
        check(latency, {
          'ws latency < 10ms': (l) => l < 10,
        }) || errorRate.add(1);
      }
    });

    socket.on('error', (e) => {
      console.error(`WebSocket error: ${e}`);
      errorRate.add(1);
    });

    socket.on('close', () => {
      activeConnections.add(-1);
    });

    // Keep connection open for test duration
    socket.setTimeout(() => {
      socket.close();
    }, 60000); // 1 minute connection
  });

  check(res, {
    'ws connection successful': (r) => r && r.status === 101,
  }) || errorRate.add(1);
}

// Event processing test function
export function eventProcessingTest() {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_TOKEN}`,
  };

  // Batch send events
  const batchSize = 100;
  const events = [];
  
  for (let i = 0; i < batchSize; i++) {
    events.push({
      ...randomItem(securityEvents),
      id: `${Date.now()}-${i}`,
      timestamp: Date.now(),
    });
  }

  const startTime = new Date();
  const res = http.post(
    `${BASE_URL}/api/security/events/batch`,
    JSON.stringify({ events }),
    { headers }
  );
  const processingTime = new Date() - startTime;
  
  check(res, {
    'batch status 200': (r) => r.status === 200,
    'batch processing < 500ms': () => processingTime < 500,
    'all events processed': (r) => r.json() && r.json().processed === batchSize,
  }) || errorRate.add(1);

  if (res.status === 200) {
    eventProcessingRate.add(batchSize);
    apiLatency.add(processingTime / batchSize); // Average per event
  }
}

// Lifecycle hooks
export function setup() {
  console.log('Setting up load test...');
  
  // Warm up cache
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_TOKEN}`,
  };
  
  http.get(`${BASE_URL}/api/dashboard/overview`, { headers });
  http.get(`${BASE_URL}/api/security/events`, { headers });
  http.get(`${BASE_URL}/api/alerts`, { headers });
  
  return {
    startTime: Date.now(),
  };
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Test completed in ${duration} seconds`);
}

// Custom summary
export function handleSummary(data) {
  return {
    'summary.json': JSON.stringify(data, null, 2),
    'summary.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function htmlReport(data) {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>Security Dashboard Load Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        .metric { margin: 10px 0; padding: 10px; background: #f5f5f5; }
        .pass { color: green; }
        .fail { color: red; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #4CAF50; color: white; }
    </style>
</head>
<body>
    <h1>Security Dashboard Load Test Report</h1>
    <div class="metric">
        <h2>Test Summary</h2>
        <p>Duration: ${data.state.testRunDurationMs / 1000}s</p>
        <p>Total Requests: ${data.metrics.http_reqs.values.count}</p>
        <p>Failed Requests: ${data.metrics.http_req_failed.values.rate * 100}%</p>
    </div>
    <div class="metric">
        <h2>Performance Metrics</h2>
        <table>
            <tr>
                <th>Metric</th>
                <th>P95</th>
                <th>P99</th>
                <th>Status</th>
            </tr>
            <tr>
                <td>API Response Time</td>
                <td>${data.metrics.http_req_duration.values['p(95)']}ms</td>
                <td>${data.metrics.http_req_duration.values['p(99)']}ms</td>
                <td class="${data.metrics.http_req_duration.values['p(95)'] < 100 ? 'pass' : 'fail'}">
                    ${data.metrics.http_req_duration.values['p(95)'] < 100 ? 'PASS' : 'FAIL'}
                </td>
            </tr>
            <tr>
                <td>WebSocket Latency</td>
                <td>${data.metrics.websocket_latency?.values['p(95)'] || 'N/A'}ms</td>
                <td>${data.metrics.websocket_latency?.values['p(99)'] || 'N/A'}ms</td>
                <td class="${data.metrics.websocket_latency?.values['p(95)'] < 10 ? 'pass' : 'fail'}">
                    ${data.metrics.websocket_latency?.values['p(95)'] < 10 ? 'PASS' : 'FAIL'}
                </td>
            </tr>
        </table>
    </div>
    <div class="metric">
        <h2>Throughput</h2>
        <p>Requests/sec: ${data.metrics.http_reqs.values.rate}</p>
        <p>Events Processed/sec: ${data.metrics.events_processed?.values.rate || 0}</p>
        <p>Cache Hit Rate: ${(data.metrics.cache_hits?.values.rate || 0) * 100}%</p>
    </div>
</body>
</html>
  `;
}

function textSummary(data, options) {
  const summary = [];
  
  summary.push('=== SECURITY DASHBOARD LOAD TEST RESULTS ===\n');
  summary.push(`Test Duration: ${data.state.testRunDurationMs / 1000}s\n`);
  summary.push(`Total VUs: ${data.state.vusMax}\n`);
  summary.push('\n=== PERFORMANCE METRICS ===\n');
  summary.push(`API Response Time (P95): ${data.metrics.http_req_duration.values['p(95)']}ms\n`);
  summary.push(`API Response Time (P99): ${data.metrics.http_req_duration.values['p(99)']}ms\n`);
  summary.push(`WebSocket Latency (P95): ${data.metrics.websocket_latency?.values['p(95)'] || 'N/A'}ms\n`);
  summary.push(`Error Rate: ${(data.metrics.errors?.values.rate || 0) * 100}%\n`);
  summary.push('\n=== THROUGHPUT ===\n');
  summary.push(`Requests/sec: ${data.metrics.http_reqs.values.rate}\n`);
  summary.push(`Events/sec: ${data.metrics.events_processed?.values.rate || 0}\n`);
  summary.push(`Cache Hit Rate: ${(data.metrics.cache_hits?.values.rate || 0) * 100}%\n`);
  
  return summary.join('');
}