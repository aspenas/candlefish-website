/**
 * K6 Performance Tests for Netlify Extension Management API
 *
 * Target: <50ms response time for all endpoints
 * Load: 1000 concurrent users
 * Duration: 5 minutes
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const failureRate = new Rate('failed_requests');
const responseTimeTrend = new Trend('api_response_time', true);

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 100 },   // Ramp up to 100 users
    { duration: '1m', target: 500 },    // Ramp up to 500 users
    { duration: '2m', target: 1000 },   // Ramp up to 1000 users
    { duration: '2m', target: 1000 },   // Stay at 1000 users
    { duration: '30s', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<50'], // 95% of requests must complete within 50ms
    http_req_failed: ['rate<0.1'],   // Error rate must be below 10%
    failed_requests: ['rate<0.1'],   // Custom failure rate threshold
    api_response_time: ['p(95)<50'], // Custom response time metric
  },
};

// Test data
const BASE_URL = __ENV.API_BASE_URL || 'https://api.candlefish.ai';
const API_KEY = __ENV.API_KEY || 'test-api-key';

const SITES = [
  'candlefish-ai',
  'staging-candlefish-ai',
  'paintbox-candlefish-ai',
  'inventory-candlefish-ai',
  'promoteros-candlefish-ai',
  'claude-candlefish-ai',
  'dashboard-candlefish-ai',
  'ibm-candlefish-ai'
];

const EXTENSIONS = [
  'cache-control',
  'image-optimization',
  'security-headers',
  'sitemap-generator',
  'analytics-suite',
  'compression',
  'rate-limiting',
  'structured-data'
];

// Helper functions
function makeRequest(method, endpoint, payload = null) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
  };

  const params = {
    headers,
    timeout: '10s',
    tags: { endpoint: endpoint.split('?')[0] }
  };

  let response;
  if (method === 'GET') {
    response = http.get(`${BASE_URL}${endpoint}`, params);
  } else if (method === 'POST') {
    response = http.post(`${BASE_URL}${endpoint}`, JSON.stringify(payload), params);
  } else if (method === 'DELETE') {
    response = http.del(`${BASE_URL}${endpoint}`, null, params);
  }

  // Record custom metrics
  responseTimeTrend.add(response.timings.duration);
  failureRate.add(response.status >= 400);

  return response;
}

function randomSite() {
  return SITES[Math.floor(Math.random() * SITES.length)];
}

function randomExtension() {
  return EXTENSIONS[Math.floor(Math.random() * EXTENSIONS.length)];
}

// Main test function
export default function () {
  const siteId = randomSite();
  const extensionId = randomExtension();

  group('GET /api/extensions - List all extensions', () => {
    const response = makeRequest('GET', '/api/extensions');

    check(response, {
      'status is 200': (r) => r.status === 200,
      'response time < 50ms': (r) => r.timings.duration < 50,
      'has extensions array': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.data?.extensions);
        } catch (e) {
          return false;
        }
      },
      'response size < 100KB': (r) => r.body.length < 100 * 1024,
    });
  });

  group(`GET /api/sites/{siteId}/extensions - Get site extensions`, () => {
    const response = makeRequest('GET', `/api/sites/${siteId}/extensions`);

    check(response, {
      'status is 200': (r) => r.status === 200,
      'response time < 50ms': (r) => r.timings.duration < 50,
      'has site extensions': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.data?.siteId === siteId;
        } catch (e) {
          return false;
        }
      },
      'has performance metrics': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.data?.performance?.metrics !== undefined;
        } catch (e) {
          return false;
        }
      },
    });
  });

  group(`POST /api/sites/{siteId}/extensions - Enable extension`, () => {
    const response = makeRequest('POST', `/api/sites/${siteId}/extensions`, {
      extensionId: extensionId
    });

    check(response, {
      'status is 200': (r) => r.status === 200,
      'response time < 50ms': (r) => r.timings.duration < 50,
      'extension enabled': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.data?.isEnabled === true;
        } catch (e) {
          return false;
        }
      },
    });
  });

  group(`GET /api/recommendations/{siteId} - Get AI recommendations`, () => {
    const response = makeRequest('GET', `/api/recommendations/${siteId}`);

    check(response, {
      'status is 200': (r) => r.status === 200,
      'response time < 50ms': (r) => r.timings.duration < 50,
      'has recommendations': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.data?.recommendations);
        } catch (e) {
          return false;
        }
      },
      'recommendations have confidence scores': (r) => {
        try {
          const body = JSON.parse(r.body);
          const recommendations = body.data?.recommendations || [];
          return recommendations.every(rec =>
            typeof rec.confidence === 'number' &&
            rec.confidence >= 0 &&
            rec.confidence <= 1
          );
        } catch (e) {
          return false;
        }
      },
    });
  });

  group(`GET /api/sites/{siteId}/metrics - Get performance metrics`, () => {
    const timeRange = ['1h', '24h', '7d', '30d'][Math.floor(Math.random() * 4)];
    const response = makeRequest('GET', `/api/sites/${siteId}/metrics?timeRange=${timeRange}`);

    check(response, {
      'status is 200': (r) => r.status === 200,
      'response time < 50ms': (r) => r.timings.duration < 50,
      'has metrics array': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body.data);
        } catch (e) {
          return false;
        }
      },
      'metrics have core web vitals': (r) => {
        try {
          const body = JSON.parse(r.body);
          const metrics = body.data || [];
          return metrics.every(metric =>
            metric.metrics?.lcp !== undefined &&
            metric.metrics?.fid !== undefined &&
            metric.metrics?.cls !== undefined
          );
        } catch (e) {
          return false;
        }
      },
    });
  });

  group(`POST /api/extension-config/{siteId}/{extensionId} - Configure extension`, () => {
    const config = {
      enabled: true,
      threshold: Math.floor(Math.random() * 100),
      strategy: ['conservative', 'balanced', 'aggressive'][Math.floor(Math.random() * 3)]
    };

    const response = makeRequest('POST', `/api/extension-config/${siteId}/${extensionId}`, {
      config: config
    });

    check(response, {
      'status is 200': (r) => r.status === 200,
      'response time < 50ms': (r) => r.timings.duration < 50,
      'config saved': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.data?.config !== undefined;
        } catch (e) {
          return false;
        }
      },
    });
  });

  group(`DELETE /api/sites/{siteId}/extensions/{extensionId} - Disable extension`, () => {
    const response = makeRequest('DELETE', `/api/sites/${siteId}/extensions/${extensionId}`);

    check(response, {
      'status is 200': (r) => r.status === 200,
      'response time < 50ms': (r) => r.timings.duration < 50,
    });
  });

  // Batch operations test (lower frequency)
  if (Math.random() < 0.1) { // 10% of users
    group('POST /api/batch-toggle - Batch operations', () => {
      const operations = Array.from({ length: 3 }, () => ({
        siteId: randomSite(),
        extensionId: randomExtension(),
        action: Math.random() < 0.5 ? 'enable' : 'disable'
      }));

      const response = makeRequest('POST', '/api/batch-toggle', { operations });

      check(response, {
        'status is 200': (r) => r.status === 200,
        'response time < 100ms': (r) => r.timings.duration < 100, // Higher threshold for batch
        'has batch results': (r) => {
          try {
            const body = JSON.parse(r.body);
            return typeof body.data?.success === 'number' &&
                   typeof body.data?.failed === 'number';
          } catch (e) {
            return false;
          }
        },
      });
    });
  }

  // Health check (frequent)
  if (Math.random() < 0.05) { // 5% of users
    group('GET /api/health - Health check', () => {
      const response = makeRequest('GET', '/api/health');

      check(response, {
        'status is 200': (r) => r.status === 200,
        'response time < 10ms': (r) => r.timings.duration < 10, // Very fast for health check
        'status is ok': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.data?.status === 'ok';
          } catch (e) {
            return false;
          }
        },
      });
    });
  }

  // Think time between requests
  sleep(Math.random() * 2 + 0.5); // 0.5-2.5 seconds
}

// Setup function - runs once at the beginning
export function setup() {
  console.log('Starting Netlify API Load Test');
  console.log(`Target URL: ${BASE_URL}`);
  console.log(`Test sites: ${SITES.length}`);
  console.log(`Test extensions: ${EXTENSIONS.length}`);

  // Verify API is accessible
  const healthCheck = http.get(`${BASE_URL}/api/health`, {
    timeout: '10s'
  });

  if (healthCheck.status !== 200) {
    throw new Error(`API health check failed: ${healthCheck.status}`);
  }

  console.log('API health check passed');
  return {};
}

// Teardown function - runs once at the end
export function teardown(data) {
  console.log('Load test completed');
}

// Export additional test scenarios
export function stressTest() {
  // Stress test with higher load
  const options = {
    stages: [
      { duration: '2m', target: 2000 }, // Ramp up to 2000 users
      { duration: '5m', target: 2000 }, // Stay at 2000 users
      { duration: '1m', target: 0 },    // Ramp down
    ],
    thresholds: {
      http_req_duration: ['p(95)<100'], // Relaxed threshold for stress test
      http_req_failed: ['rate<0.2'],    // Higher error tolerance
    },
  };

  // Use same test logic but with stress test options
  return { options };
}

export function spikeTest() {
  // Spike test with sudden load increases
  const options = {
    stages: [
      { duration: '10s', target: 100 },   // Normal load
      { duration: '30s', target: 1500 },  // Sudden spike
      { duration: '10s', target: 100 },   // Back to normal
      { duration: '30s', target: 2000 },  // Higher spike
      { duration: '10s', target: 0 },     // Complete ramp down
    ],
    thresholds: {
      http_req_duration: ['p(95)<200'], // Very relaxed for spikes
      http_req_failed: ['rate<0.3'],    // Higher error tolerance
    },
  };

  return { options };
}

// Database performance test
export function databaseLoadTest() {
  const siteId = randomSite();

  group('Database-intensive operations', () => {
    // Test metrics queries (database heavy)
    for (let i = 0; i < 5; i++) {
      const timeRange = ['1h', '24h', '7d', '30d'][i % 4];
      const response = makeRequest('GET', `/api/sites/${siteId}/metrics?timeRange=${timeRange}`);

      check(response, {
        'metrics query < 100ms': (r) => r.timings.duration < 100,
        'status is 200': (r) => r.status === 200,
      });
    }

    // Test recommendations (ML/AI heavy)
    const recResponse = makeRequest('GET', `/api/recommendations/${siteId}`);
    check(recResponse, {
      'recommendations query < 150ms': (r) => r.timings.duration < 150,
      'status is 200': (r) => r.status === 200,
    });
  });
}

// Memory leak test
export function memoryTest() {
  // Test with large payloads
  const largeConfig = {
    config: {
      rules: Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        pattern: `pattern-${i}`,
        action: 'allow',
        metadata: { created: new Date().toISOString() }
      }))
    }
  };

  const response = makeRequest('POST', `/api/extension-config/${randomSite()}/${randomExtension()}`, largeConfig);

  check(response, {
    'large payload handled': (r) => r.status < 400,
    'response time reasonable': (r) => r.timings.duration < 1000,
  });
}
