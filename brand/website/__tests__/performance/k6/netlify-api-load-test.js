// K6 Performance Tests for Netlify Extension Management API
// Target: <50ms API response, 1000 concurrent users

import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { SharedArray } from 'k6/data';

// Custom metrics
const apiResponseTime = new Trend('api_response_time', true);
const apiErrorRate = new Rate('api_error_rate');
const websocketConnections = new Counter('websocket_connections');
const bulkOperationsSuccess = new Rate('bulk_operations_success_rate');

// Test configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_BASE_URL = `${BASE_URL}/api`;

// Test data - using SharedArray for memory efficiency across VUs
const testSites = new SharedArray('sites', function () {
  return [
    'candlefish-ai',
    'staging-candlefish-ai',
    'paintbox-candlefish-ai',
    'inventory-candlefish-ai',
    'promoteros-candlefish-ai',
    'claude-candlefish-ai',
    'dashboard-candlefish-ai',
    'ibm-candlefish-ai'
  ];
});

const testExtensions = new SharedArray('extensions', function () {
  return [
    'cache-control',
    'image-optimization',
    'compression',
    'security-headers',
    'csp-manager',
    'rate-limiting',
    'sitemap-generator',
    'structured-data',
    'meta-optimizer',
    'privacy-analytics'
  ];
});

// Performance test scenarios
export const options = {
  scenarios: {
    // Baseline load test
    baseline_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },   // Ramp up to 50 users
        { duration: '5m', target: 50 },   // Stay at 50 users
        { duration: '2m', target: 0 },    // Ramp down
      ],
      gracefulRampDown: '30s',
      tags: { test_type: 'baseline' }
    },

    // High load test
    high_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },  // Ramp up to 100 users
        { duration: '5m', target: 100 },  // Stay at 100 users
        { duration: '2m', target: 200 },  // Spike to 200 users
        { duration: '3m', target: 200 },  // Stay at spike
        { duration: '2m', target: 0 },    // Ramp down
      ],
      gracefulRampDown: '30s',
      tags: { test_type: 'high_load' }
    },

    // Stress test - Target 1000 concurrent users
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5m', target: 500 },   // Gradual ramp up
        { duration: '5m', target: 1000 },  // Target load
        { duration: '10m', target: 1000 }, // Sustained load
        { duration: '5m', target: 0 },     // Ramp down
      ],
      gracefulRampDown: '60s',
      tags: { test_type: 'stress' }
    },

    // Spike test
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 100,
      stages: [
        { duration: '10s', target: 100 },  // Normal load
        { duration: '30s', target: 2000 }, // Sudden spike
        { duration: '1m', target: 2000 },  // Stay at spike
        { duration: '10s', target: 100 },  // Back to normal
        { duration: '3m', target: 100 },   // Recovery period
      ],
      gracefulRampDown: '30s',
      tags: { test_type: 'spike' }
    },

    // WebSocket connections test
    websocket_test: {
      executor: 'constant-vus',
      vus: 100,
      duration: '5m',
      tags: { test_type: 'websocket' }
    }
  },

  // Performance thresholds
  thresholds: {
    // API response time thresholds
    'api_response_time': [
      'p(95) < 50',      // 95% of requests should be under 50ms
      'p(99) < 100',     // 99% of requests should be under 100ms
    ],

    // Error rate thresholds
    'api_error_rate': [
      'rate < 0.01',     // Error rate should be below 1%
    ],

    // HTTP request duration
    'http_req_duration': [
      'p(95) < 200',     // 95% of requests should be under 200ms
      'p(99) < 500',     // 99% of requests should be under 500ms
    ],

    // HTTP request failed rate
    'http_req_failed': [
      'rate < 0.02',     // Less than 2% of requests should fail
    ],

    // Bulk operations success rate
    'bulk_operations_success_rate': [
      'rate > 0.95',     // 95% of bulk operations should succeed
    ],

    // Specific scenario thresholds
    'http_req_duration{test_type:baseline}': ['p(95) < 50'],
    'http_req_duration{test_type:high_load}': ['p(95) < 100'],
    'http_req_duration{test_type:stress}': ['p(95) < 200'],
    'http_req_duration{test_type:spike}': ['p(95) < 500'],
  },
};

// Test setup
export function setup() {
  console.log('🚀 Starting Netlify Extension Management API Performance Tests');
  console.log(`📊 Base URL: ${BASE_URL}`);
  console.log(`🎯 Target: <50ms API response, 1000 concurrent users`);

  // Warmup the API
  const warmupResponse = http.get(`${API_BASE_URL}/health`);
  console.log(`🔥 Warmup response: ${warmupResponse.status}`);

  return {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    apiUrl: API_BASE_URL
  };
}

// Main test function
export default function (data) {
  const scenario = __ENV.K6_SCENARIO_NAME || 'baseline_load';

  switch (scenario) {
    case 'websocket_test':
      testWebSocketConnections(data);
      break;
    default:
      testApiEndpoints(data);
      break;
  }
}

// API Endpoints Testing
function testApiEndpoints(data) {
  const siteId = testSites[Math.floor(Math.random() * testSites.length)];
  const extensionId = testExtensions[Math.floor(Math.random() * testExtensions.length)];

  group('GET /api/extensions', () => {
    const startTime = Date.now();
    const response = http.get(`${data.apiUrl}/extensions`);
    const duration = Date.now() - startTime;

    const success = check(response, {
      'status is 200': (r) => r.status === 200,
      'response time < 50ms': () => duration < 50,
      'has extensions data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success && Array.isArray(body.data.extensions);
        } catch {
          return false;
        }
      },
      'content type is JSON': (r) => r.headers['Content-Type']?.includes('application/json'),
    });

    apiResponseTime.add(duration);
    apiErrorRate.add(!success);
  });

  group('GET /api/sites', () => {
    const startTime = Date.now();
    const response = http.get(`${data.apiUrl}/sites`);
    const duration = Date.now() - startTime;

    const success = check(response, {
      'status is 200': (r) => r.status === 200,
      'response time < 50ms': () => duration < 50,
      'has sites data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success && Array.isArray(body.data.sites);
        } catch {
          return false;
        }
      }
    });

    apiResponseTime.add(duration);
    apiErrorRate.add(!success);
  });

  group(`GET /api/sites/${siteId}/extensions`, () => {
    const startTime = Date.now();
    const response = http.get(`${data.apiUrl}/sites/${siteId}/extensions`);
    const duration = Date.now() - startTime;

    const success = check(response, {
      'status is 200': (r) => r.status === 200,
      'response time < 50ms': () => duration < 50,
      'has site extensions data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success && body.data.siteId === siteId;
        } catch {
          return false;
        }
      }
    });

    apiResponseTime.add(duration);
    apiErrorRate.add(!success);
  });

  group(`POST /api/sites/${siteId}/extensions - Enable Extension`, () => {
    const startTime = Date.now();
    const response = http.post(
      `${data.apiUrl}/sites/${siteId}/extensions`,
      JSON.stringify({ extensionId }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
    const duration = Date.now() - startTime;

    const success = check(response, {
      'status is 200': (r) => r.status === 200,
      'response time < 100ms': () => duration < 100, // Allow more time for POST
      'extension enabled': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success && body.data.isEnabled === true;
        } catch {
          return false;
        }
      }
    });

    apiResponseTime.add(duration);
    apiErrorRate.add(!success);
  });

  group(`DELETE /api/sites/${siteId}/extensions/${extensionId} - Disable Extension`, () => {
    const startTime = Date.now();
    const response = http.del(`${data.apiUrl}/sites/${siteId}/extensions/${extensionId}`);
    const duration = Date.now() - startTime;

    const success = check(response, {
      'status is 200': (r) => r.status === 200,
      'response time < 100ms': () => duration < 100,
      'successful deletion': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success;
        } catch {
          return false;
        }
      }
    });

    apiResponseTime.add(duration);
    apiErrorRate.add(!success);
  });

  group('POST /api/bulk/deploy - Bulk Operations', () => {
    const operations = [
      {
        siteId: testSites[0],
        extensionId: testExtensions[0],
        action: 'enable'
      },
      {
        siteId: testSites[1],
        extensionId: testExtensions[1],
        action: 'enable'
      }
    ];

    const startTime = Date.now();
    const response = http.post(
      `${data.apiUrl}/bulk/deploy`,
      JSON.stringify({ operations }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
    const duration = Date.now() - startTime;

    const success = check(response, {
      'status is 200 or 207': (r) => r.status === 200 || r.status === 207,
      'response time < 200ms': () => duration < 200, // Allow more time for bulk operations
      'bulk operation completed': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success && body.data.summary;
        } catch {
          return false;
        }
      }
    });

    apiResponseTime.add(duration);
    apiErrorRate.add(!success);
    bulkOperationsSuccess.add(success);
  });

  group('GET /api/health/sites - Health Check', () => {
    const startTime = Date.now();
    const response = http.get(`${data.apiUrl}/health/sites`);
    const duration = Date.now() - startTime;

    const success = check(response, {
      'status is 200': (r) => r.status === 200 || r.status === 207,
      'response time < 100ms': () => duration < 100,
      'has health data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success && body.data.overview;
        } catch {
          return false;
        }
      }
    });

    apiResponseTime.add(duration);
    apiErrorRate.add(!success);
  });

  group(`GET /api/metrics/extensions/${extensionId} - Extension Metrics`, () => {
    const startTime = Date.now();
    const response = http.get(`${data.apiUrl}/metrics/extensions/${extensionId}?siteId=${siteId}&timeRange=24h`);
    const duration = Date.now() - startTime;

    const success = check(response, {
      'status is 200': (r) => r.status === 200,
      'response time < 150ms': () => duration < 150, // Metrics might be slower
      'has metrics data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success && body.data.metrics;
        } catch {
          return false;
        }
      }
    });

    apiResponseTime.add(duration);
    apiErrorRate.add(!success);
  });

  // Random sleep between 0.5-2 seconds to simulate realistic user behavior
  sleep(Math.random() * 1.5 + 0.5);
}

// WebSocket Testing
function testWebSocketConnections(data) {
  const siteId = testSites[Math.floor(Math.random() * testSites.length)];
  const wsUrl = data.baseUrl.replace(/^http/, 'ws') + `/ws/sites/${siteId}`;

  group('WebSocket Connection Test', () => {
    const response = ws.connect(wsUrl, {}, function (socket) {
      websocketConnections.add(1);

      socket.on('open', () => {
        console.log(`WebSocket connected for site: ${siteId}`);

        // Send test message
        socket.send(JSON.stringify({
          type: 'subscribe',
          channel: 'extension.updates'
        }));
      });

      socket.on('message', (data) => {
        const message = JSON.parse(data);

        check(message, {
          'message has type': (msg) => msg.type !== undefined,
          'message has payload': (msg) => msg.payload !== undefined,
          'message has timestamp': (msg) => msg.timestamp !== undefined,
        });
      });

      socket.on('error', (e) => {
        console.log(`WebSocket error: ${e.error()}`);
      });

      // Keep connection open for 30 seconds
      socket.setTimeout(() => {
        socket.close();
      }, 30000);
    });

    check(response, {
      'WebSocket connection established': (r) => r && r.url === wsUrl,
    });
  });

  sleep(1);
}

// Webhook simulation for deployment events
function testWebhookEndpoints(data) {
  group('POST /api/netlify/webhook - Deployment Events', () => {
    const webhookPayload = {
      id: `deploy-perf-test-${__VU}-${Date.now()}`,
      site_id: testSites[Math.floor(Math.random() * testSites.length)],
      build_id: `build-${__VU}-${Date.now()}`,
      state: ['ready', 'building', 'error'][Math.floor(Math.random() * 3)],
      name: 'Performance Test Deploy',
      url: 'https://test.netlify.app',
      ssl_url: 'https://test.netlify.app',
      admin_url: 'https://app.netlify.com/sites/test',
      deploy_url: `https://deploy-${__VU}.netlify.app`,
      deploy_ssl_url: `https://deploy-${__VU}.netlify.app`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: `perf-test-user-${__VU}`,
      branch: 'main',
      context: 'production',
      deploy_time: Math.floor(Math.random() * 120) * 1000 // 0-2 minutes
    };

    const startTime = Date.now();
    const response = http.post(
      `${data.apiUrl}/netlify/webhook`,
      JSON.stringify(webhookPayload),
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Netlify-Event': 'deploy-succeeded'
        },
      }
    );
    const duration = Date.now() - startTime;

    check(response, {
      'webhook processed successfully': (r) => r.status === 200,
      'response time < 100ms': () => duration < 100,
      'webhook acknowledged': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.success && body.data.processed;
        } catch {
          return false;
        }
      }
    });

    apiResponseTime.add(duration);
  });
}

// Performance testing for specific scenarios
export function handleSummary(data) {
  console.log('📊 Performance Test Summary');
  console.log(`🎯 API Response Time P95: ${data.metrics.api_response_time.values.p95.toFixed(2)}ms`);
  console.log(`🎯 API Response Time P99: ${data.metrics.api_response_time.values.p99.toFixed(2)}ms`);
  console.log(`❌ API Error Rate: ${(data.metrics.api_error_rate.values.rate * 100).toFixed(2)}%`);
  console.log(`✅ Bulk Operations Success Rate: ${(data.metrics.bulk_operations_success_rate?.values.rate * 100 || 0).toFixed(2)}%`);
  console.log(`🔌 WebSocket Connections: ${data.metrics.websocket_connections?.values.count || 0}`);

  // Performance thresholds check
  const thresholdsMet = {
    apiResponseTime: data.metrics.api_response_time.values.p95 < 50,
    errorRate: data.metrics.api_error_rate.values.rate < 0.01,
    httpDuration: data.metrics.http_req_duration.values.p95 < 200,
    bulkOperationsSuccess: (data.metrics.bulk_operations_success_rate?.values.rate || 0) > 0.95
  };

  console.log('\n🎯 Performance Thresholds:');
  Object.entries(thresholdsMet).forEach(([metric, met]) => {
    console.log(`${met ? '✅' : '❌'} ${metric}: ${met ? 'PASSED' : 'FAILED'}`);
  });

  const allThresholdsMet = Object.values(thresholdsMet).every(Boolean);
  console.log(`\n🏆 Overall Performance: ${allThresholdsMet ? 'PASSED' : 'FAILED'}`);

  return {
    'performance-summary.json': JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        apiResponseTimeP95: data.metrics.api_response_time.values.p95,
        apiResponseTimeP99: data.metrics.api_response_time.values.p99,
        errorRate: data.metrics.api_error_rate.values.rate,
        httpDurationP95: data.metrics.http_req_duration.values.p95,
        bulkOperationsSuccessRate: data.metrics.bulk_operations_success_rate?.values.rate || 0,
        websocketConnections: data.metrics.websocket_connections?.values.count || 0,
        thresholdsMet: allThresholdsMet,
        detailedThresholds: thresholdsMet
      },
      rawMetrics: data.metrics
    }, null, 2),

    // Generate HTML report
    'performance-report.html': generateHTMLReport(data)
  };
}

function generateHTMLReport(data) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Netlify Extension Management - Performance Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; }
        .header { border-bottom: 2px solid #3FD3C6; padding-bottom: 20px; margin-bottom: 30px; }
        .metric-card { background: #f8f9fa; padding: 20px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #3FD3C6; }
        .passed { border-left-color: #8AC926; }
        .failed { border-left-color: #FF5722; }
        .metric-value { font-size: 2em; font-weight: bold; color: #1B263B; }
        .metric-label { color: #666; font-size: 0.9em; }
        .threshold-status { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.8em; font-weight: bold; }
        .threshold-passed { background: #8AC926; color: white; }
        .threshold-failed { background: #FF5722; color: white; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Netlify Extension Management API</h1>
        <h2>Performance Test Report</h2>
        <p>Generated: ${new Date().toLocaleString()}</p>
        <p>Target: &lt;50ms API response, 1000 concurrent users</p>
    </div>

    <div class="metric-card ${data.metrics.api_response_time.values.p95 < 50 ? 'passed' : 'failed'}">
        <div class="metric-value">${data.metrics.api_response_time.values.p95.toFixed(2)}ms</div>
        <div class="metric-label">API Response Time (P95)</div>
        <span class="threshold-status ${data.metrics.api_response_time.values.p95 < 50 ? 'threshold-passed' : 'threshold-failed'}">
            Target: &lt;50ms
        </span>
    </div>

    <div class="metric-card ${data.metrics.api_error_rate.values.rate < 0.01 ? 'passed' : 'failed'}">
        <div class="metric-value">${(data.metrics.api_error_rate.values.rate * 100).toFixed(2)}%</div>
        <div class="metric-label">API Error Rate</div>
        <span class="threshold-status ${data.metrics.api_error_rate.values.rate < 0.01 ? 'threshold-passed' : 'threshold-failed'}">
            Target: &lt;1%
        </span>
    </div>

    <div class="metric-card ${data.metrics.http_req_duration.values.p95 < 200 ? 'passed' : 'failed'}">
        <div class="metric-value">${data.metrics.http_req_duration.values.p95.toFixed(2)}ms</div>
        <div class="metric-label">HTTP Request Duration (P95)</div>
        <span class="threshold-status ${data.metrics.http_req_duration.values.p95 < 200 ? 'threshold-passed' : 'threshold-failed'}">
            Target: &lt;200ms
        </span>
    </div>

    <div class="metric-card">
        <div class="metric-value">${data.metrics.websocket_connections?.values.count || 0}</div>
        <div class="metric-label">WebSocket Connections</div>
    </div>

    <h3>Detailed Metrics</h3>
    <pre style="background: #f8f9fa; padding: 20px; border-radius: 8px; overflow-x: auto;">
${JSON.stringify(data.metrics, null, 2)}
    </pre>
</body>
</html>`;
}
