/**
 * K6 Performance Tests for Candlefish AI Platform
 * Comprehensive load testing across all implementations
 */

import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomString, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const errorRate = new Rate('error_rate');
const apiResponseTime = new Trend('api_response_time');
const graphqlResponseTime = new Trend('graphql_response_time');
const websocketMessages = new Counter('websocket_messages');
const authSuccessRate = new Rate('auth_success_rate');

// Test configuration
const CONFIG = {
  BASE_URL: __ENV.BASE_URL || 'https://paintbox.fly.dev',
  API_URL: __ENV.API_URL || 'https://api.candlefish.ai',
  DOCS_URL: __ENV.DOCS_URL || 'https://docs.candlefish.ai',
  PARTNERS_URL: __ENV.PARTNERS_URL || 'https://partners.candlefish.ai',
  WS_URL: __ENV.WS_URL || 'wss://paintbox.fly.dev',
  ADMIN_EMAIL: __ENV.ADMIN_EMAIL || 'admin@candlefish.ai',
  ADMIN_PASSWORD: __ENV.ADMIN_PASSWORD || 'admin123',
};

// Test scenarios
export const options = {
  scenarios: {
    // Baseline load test
    baseline_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 10 },   // Ramp up
        { duration: '5m', target: 10 },   // Stay at 10
        { duration: '2m', target: 0 },    // Ramp down
      ],
    },

    // Stress testing
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },  // Ramp up to stress level
        { duration: '5m', target: 100 },  // Stay at stress level
        { duration: '2m', target: 0 },    // Ramp down
      ],
    },

    // Spike testing
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 100 }, // Sudden spike
        { duration: '1m', target: 100 },  // Stay at spike
        { duration: '10s', target: 0 },   // Quick ramp down
      ],
    },

    // Volume testing
    volume_test: {
      executor: 'constant-vus',
      vus: 50,
      duration: '10m',
    },

    // API-focused testing
    api_performance: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 20 },
        { duration: '3m', target: 20 },
        { duration: '1m', target: 0 },
      ],
    },

    // GraphQL-focused testing
    graphql_performance: {
      executor: 'constant-vus',
      vus: 15,
      duration: '5m',
    },

    // WebSocket testing
    websocket_performance: {
      executor: 'constant-vus',
      vus: 10,
      duration: '3m',
    },

    // Authentication load testing
    auth_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },
        { duration: '2m', target: 50 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
    http_req_failed: ['rate<0.1'],     // Error rate under 10%
    error_rate: ['rate<0.05'],         // Custom error rate under 5%
    api_response_time: ['p(95)<1000'], // API responses under 1s
    graphql_response_time: ['p(95)<1500'], // GraphQL under 1.5s
    auth_success_rate: ['rate>0.95'],  // 95% auth success rate
  },
};

// Test data generators
function generateEstimateData() {
  return {
    clientInfo: {
      name: `Test Client ${randomString(8)}`,
      address: `${randomIntBetween(100, 9999)} Test St`,
      city: 'Test City',
      state: 'TS',
      zip: String(randomIntBetween(10000, 99999)),
      phone: `555-${randomIntBetween(100, 999)}-${randomIntBetween(1000, 9999)}`,
      email: `client${randomIntBetween(1, 1000)}@test.com`,
    },
    surfaces: [
      {
        name: `Surface ${randomIntBetween(1, 10)}`,
        area: randomIntBetween(100, 1000),
        coats: randomIntBetween(1, 3),
        primer: Math.random() > 0.5,
      },
    ],
    rooms: [
      {
        name: `Room ${randomIntBetween(1, 10)}`,
        dimensions: {
          length: randomIntBetween(8, 20),
          width: randomIntBetween(8, 20),
          height: randomIntBetween(8, 12),
        },
        walls: randomIntBetween(3, 4),
        ceiling: Math.random() > 0.5,
      },
    ],
  };
}

function generateServiceData() {
  return {
    name: `service-${randomString(8)}`,
    displayName: `Test Service ${randomIntBetween(1, 1000)}`,
    environment: 'test',
    baseUrl: `https://service-${randomString(6)}.test.com`,
    healthEndpoint: '/health',
    tags: ['test', 'performance'],
  };
}

// Authentication helper
function authenticate() {
  const loginPayload = {
    email: CONFIG.ADMIN_EMAIL,
    password: CONFIG.ADMIN_PASSWORD,
  };

  const response = http.post(`${CONFIG.BASE_URL}/api/auth/login`, JSON.stringify(loginPayload), {
    headers: { 'Content-Type': 'application/json' },
  });

  const success = check(response, {
    'auth: login successful': (r) => r.status === 200,
    'auth: token received': (r) => r.json('token') !== undefined,
  });

  authSuccessRate.add(success);

  if (success) {
    return response.json('token');
  }
  return null;
}

// Main test function
export default function() {
  const token = authenticate();

  if (!token) {
    console.log('Authentication failed, skipping tests');
    return;
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Test different scenarios based on the current scenario
  const scenario = __ENV.K6_SCENARIO || 'baseline_load';

  switch (scenario) {
    case 'api_performance':
      testAPIEndpoints(headers);
      break;
    case 'graphql_performance':
      testGraphQLQueries(headers);
      break;
    case 'websocket_performance':
      testWebSocketConnections(token);
      break;
    case 'auth_load':
      testAuthenticationLoad();
      break;
    default:
      testFullApplication(headers);
  }

  sleep(1);
}

function testAPIEndpoints(headers) {
  group('API Endpoints Performance', () => {
    // Health check endpoint
    group('Health Check', () => {
      const response = http.get(`${CONFIG.BASE_URL}/api/health`, { headers });

      const success = check(response, {
        'health check: status 200': (r) => r.status === 200,
        'health check: response time < 500ms': (r) => r.timings.duration < 500,
      });

      apiResponseTime.add(response.timings.duration);
      errorRate.add(!success);
    });

    // Estimate endpoints
    group('Estimates API', () => {
      // Create estimate
      const estimateData = generateEstimateData();
      const createResponse = http.post(
        `${CONFIG.BASE_URL}/api/estimates`,
        JSON.stringify(estimateData),
        { headers }
      );

      const createSuccess = check(createResponse, {
        'create estimate: status 201': (r) => r.status === 201,
        'create estimate: has ID': (r) => r.json('id') !== undefined,
        'create estimate: response time < 1s': (r) => r.timings.duration < 1000,
      });

      apiResponseTime.add(createResponse.timings.duration);
      errorRate.add(!createSuccess);

      if (createSuccess) {
        const estimateId = createResponse.json('id');

        // Get estimate
        const getResponse = http.get(`${CONFIG.BASE_URL}/api/estimates/${estimateId}`, { headers });

        const getSuccess = check(getResponse, {
          'get estimate: status 200': (r) => r.status === 200,
          'get estimate: correct ID': (r) => r.json('id') === estimateId,
          'get estimate: response time < 500ms': (r) => r.timings.duration < 500,
        });

        apiResponseTime.add(getResponse.timings.duration);
        errorRate.add(!getSuccess);

        // List estimates
        const listResponse = http.get(`${CONFIG.BASE_URL}/api/estimates?limit=20`, { headers });

        const listSuccess = check(listResponse, {
          'list estimates: status 200': (r) => r.status === 200,
          'list estimates: has data': (r) => Array.isArray(r.json('data')),
          'list estimates: response time < 1s': (r) => r.timings.duration < 1000,
        });

        apiResponseTime.add(listResponse.timings.duration);
        errorRate.add(!listSuccess);
      }
    });

    // Services API
    group('Services API', () => {
      const serviceData = generateServiceData();

      // Register service
      const registerResponse = http.post(
        `${CONFIG.BASE_URL}/api/services/register`,
        JSON.stringify(serviceData),
        { headers }
      );

      const registerSuccess = check(registerResponse, {
        'register service: status 201': (r) => r.status === 201,
        'register service: response time < 1s': (r) => r.timings.duration < 1000,
      });

      apiResponseTime.add(registerResponse.timings.duration);
      errorRate.add(!registerSuccess);
    });

    // Metrics endpoints
    group('Metrics API', () => {
      const metricsResponse = http.get(`${CONFIG.BASE_URL}/api/metrics?timeRange=1h`, { headers });

      const metricsSuccess = check(metricsResponse, {
        'metrics: status 200': (r) => r.status === 200,
        'metrics: response time < 2s': (r) => r.timings.duration < 2000,
      });

      apiResponseTime.add(metricsResponse.timings.duration);
      errorRate.add(!metricsSuccess);
    });
  });
}

function testGraphQLQueries(headers) {
  group('GraphQL Performance', () => {
    const graphqlEndpoint = `${CONFIG.BASE_URL}/api/graphql`;

    // Simple query
    group('Simple Queries', () => {
      const query = `
        query GetServices {
          services(limit: 10) {
            id
            name
            status
            environment
          }
        }
      `;

      const response = http.post(graphqlEndpoint, JSON.stringify({ query }), { headers });

      const success = check(response, {
        'graphql simple: status 200': (r) => r.status === 200,
        'graphql simple: no errors': (r) => !r.json('errors'),
        'graphql simple: has data': (r) => r.json('data') !== undefined,
        'graphql simple: response time < 1s': (r) => r.timings.duration < 1000,
      });

      graphqlResponseTime.add(response.timings.duration);
      errorRate.add(!success);
    });

    // Complex query with nested data
    group('Complex Queries', () => {
      const query = `
        query ComplexServiceQuery {
          services(limit: 5) {
            id
            name
            status
            dependencies {
              id
              service {
                name
              }
              dependsOn {
                name
                status
              }
            }
            containers {
              id
              name
              status
              cpuUsage
              memoryUsage
            }
            metrics(limit: 10) {
              id
              name
              value
              unit
              timestamp
            }
            alerts {
              id
              severity
              status
              description
            }
          }
        }
      `;

      const response = http.post(graphqlEndpoint, JSON.stringify({ query }), { headers });

      const success = check(response, {
        'graphql complex: status 200': (r) => r.status === 200,
        'graphql complex: no errors': (r) => !r.json('errors'),
        'graphql complex: response time < 3s': (r) => r.timings.duration < 3000,
      });

      graphqlResponseTime.add(response.timings.duration);
      errorRate.add(!success);
    });

    // System analysis query
    group('System Analysis', () => {
      const query = `
        query SystemAnalysis {
          systemAnalysis(timeRange: { duration: "1h" }) {
            id
            overallHealth
            healthScore
            totalServices
            healthyServices
            degradedServices
            unhealthyServices
            performanceInsights {
              type
              severity
              title
              description
              impact
            }
            recommendations {
              type
              priority
              title
              description
              estimatedImpact
            }
          }
        }
      `;

      const response = http.post(graphqlEndpoint, JSON.stringify({ query }), { headers });

      const success = check(response, {
        'system analysis: status 200': (r) => r.status === 200,
        'system analysis: no errors': (r) => !r.json('errors'),
        'system analysis: response time < 5s': (r) => r.timings.duration < 5000,
      });

      graphqlResponseTime.add(response.timings.duration);
      errorRate.add(!success);
    });

    // Mutation testing
    group('Mutations', () => {
      const serviceData = generateServiceData();
      const mutation = `
        mutation RegisterService($input: RegisterServiceInput!) {
          registerService(input: $input) {
            id
            name
            status
          }
        }
      `;

      const variables = {
        input: serviceData
      };

      const response = http.post(
        graphqlEndpoint,
        JSON.stringify({ query: mutation, variables }),
        { headers }
      );

      const success = check(response, {
        'graphql mutation: status 200': (r) => r.status === 200,
        'graphql mutation: no errors': (r) => !r.json('errors'),
        'graphql mutation: response time < 2s': (r) => r.timings.duration < 2000,
      });

      graphqlResponseTime.add(response.timings.duration);
      errorRate.add(!success);
    });
  });
}

function testWebSocketConnections(token) {
  group('WebSocket Performance', () => {
    const wsUrl = `${CONFIG.WS_URL}/ws?token=${token}`;

    const response = ws.connect(wsUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }, function (socket) {
      socket.on('open', () => {
        console.log('WebSocket connected');

        // Subscribe to service status updates
        socket.send(JSON.stringify({
          type: 'subscribe',
          topic: 'service.status',
          serviceId: 'all'
        }));

        // Subscribe to system metrics
        socket.send(JSON.stringify({
          type: 'subscribe',
          topic: 'system.metrics'
        }));

        // Subscribe to alerts
        socket.send(JSON.stringify({
          type: 'subscribe',
          topic: 'alerts'
        }));
      });

      socket.on('message', (data) => {
        websocketMessages.add(1);

        try {
          const message = JSON.parse(data);

          check(message, {
            'websocket: valid message format': (msg) => msg.type !== undefined,
            'websocket: has timestamp': (msg) => msg.timestamp !== undefined,
          });
        } catch (e) {
          errorRate.add(1);
        }
      });

      socket.on('error', (error) => {
        console.log('WebSocket error:', error);
        errorRate.add(1);
      });

      // Keep connection open for testing
      socket.setTimeout(() => {
        socket.close();
      }, 30000); // 30 seconds
    });

    check(response, {
      'websocket: connection established': (r) => r && r.url === wsUrl,
    });
  });
}

function testAuthenticationLoad() {
  group('Authentication Load Testing', () => {
    // Test login endpoint under load
    const loginPayload = {
      email: `user${randomIntBetween(1, 100)}@test.com`,
      password: 'testpass123',
    };

    const loginResponse = http.post(
      `${CONFIG.BASE_URL}/api/auth/login`,
      JSON.stringify(loginPayload),
      { headers: { 'Content-Type': 'application/json' } }
    );

    const loginSuccess = check(loginResponse, {
      'auth load: response received': (r) => r.status !== 0,
      'auth load: response time < 2s': (r) => r.timings.duration < 2000,
    });

    authSuccessRate.add(loginSuccess);
    errorRate.add(!loginSuccess);

    // Test OAuth endpoints
    const oauthResponse = http.get(`${CONFIG.BASE_URL}/api/auth/oauth/google`);

    check(oauthResponse, {
      'oauth: redirect received': (r) => r.status === 302 || r.status === 200,
      'oauth: response time < 1s': (r) => r.timings.duration < 1000,
    });

    // Test JWT validation
    if (loginResponse.status === 200 && loginResponse.json('token')) {
      const token = loginResponse.json('token');
      const validateResponse = http.get(`${CONFIG.BASE_URL}/api/auth/validate`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      check(validateResponse, {
        'jwt validation: status 200': (r) => r.status === 200,
        'jwt validation: response time < 500ms': (r) => r.timings.duration < 500,
      });
    }
  });
}

function testFullApplication(headers) {
  group('Full Application Testing', () => {
    // Test main application pages
    group('Frontend Performance', () => {
      // Homepage
      const homeResponse = http.get(CONFIG.BASE_URL);
      check(homeResponse, {
        'homepage: status 200': (r) => r.status === 200,
        'homepage: response time < 2s': (r) => r.timings.duration < 2000,
      });

      // Dashboard
      const dashboardResponse = http.get(`${CONFIG.BASE_URL}/dashboard`, { headers });
      check(dashboardResponse, {
        'dashboard: status 200': (r) => r.status === 200,
        'dashboard: response time < 3s': (r) => r.timings.duration < 3000,
      });

      // Partner portal
      const partnerResponse = http.get(`${CONFIG.PARTNERS_URL}`, { headers });
      check(partnerResponse, {
        'partner portal: accessible': (r) => r.status === 200 || r.status === 302,
        'partner portal: response time < 2s': (r) => r.timings.duration < 2000,
      });

      // API documentation
      const docsResponse = http.get(`${CONFIG.DOCS_URL}`);
      check(docsResponse, {
        'docs: status 200': (r) => r.status === 200,
        'docs: response time < 2s': (r) => r.timings.duration < 2000,
      });
    });

    // Test API endpoints
    testAPIEndpoints(headers);

    // Test GraphQL
    testGraphQLQueries(headers);
  });
}

// Setup function
export function setup() {
  console.log('Starting Candlefish AI Platform Performance Tests');
  console.log(`Base URL: ${CONFIG.BASE_URL}`);
  console.log(`API URL: ${CONFIG.API_URL}`);
  console.log(`Docs URL: ${CONFIG.DOCS_URL}`);
  console.log(`Partners URL: ${CONFIG.PARTNERS_URL}`);

  // Verify endpoints are accessible
  const healthCheck = http.get(`${CONFIG.BASE_URL}/api/health`);
  if (healthCheck.status !== 200) {
    throw new Error(`Health check failed: ${healthCheck.status}`);
  }

  console.log('All endpoints accessible, starting load tests...');
}

// Teardown function
export function teardown(data) {
  console.log('Performance tests completed');
  console.log('Check the results for detailed metrics and thresholds');
}

// Handle summary
export function handleSummary(data) {
  return {
    'performance-report.json': JSON.stringify(data, null, 2),
    'performance-report.html': generateHTMLReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function generateHTMLReport(data) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Candlefish AI Platform - Performance Test Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .metric { margin: 10px 0; padding: 10px; border: 1px solid #ddd; }
        .pass { background-color: #d4edda; }
        .fail { background-color: #f8d7da; }
        .summary { background-color: #e2e3e5; padding: 15px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <h1>Candlefish AI Platform Performance Test Report</h1>
      <div class="summary">
        <h2>Test Summary</h2>
        <p><strong>Start Time:</strong> ${new Date(data.state.testRunDurationMs).toISOString()}</p>
        <p><strong>Duration:</strong> ${Math.round(data.state.testRunDurationMs / 1000)}s</p>
        <p><strong>VUs:</strong> ${data.metrics.vus.values.max}</p>
        <p><strong>Iterations:</strong> ${data.metrics.iterations.values.count}</p>
        <p><strong>Total Requests:</strong> ${data.metrics.http_reqs.values.count}</p>
        <p><strong>Failed Requests:</strong> ${data.metrics.http_req_failed.values.count}</p>
      </div>

      <h2>Key Metrics</h2>
      ${Object.entries(data.metrics).map(([name, metric]) => {
        const thresholds = data.thresholds[name] || {};
        const passed = Object.values(thresholds).every(t => t.ok);

        return `
          <div class="metric ${passed ? 'pass' : 'fail'}">
            <h3>${name}</h3>
            <p><strong>Value:</strong> ${JSON.stringify(metric.values)}</p>
            <p><strong>Thresholds:</strong> ${passed ? 'PASSED' : 'FAILED'}</p>
          </div>
        `;
      }).join('')}
    </body>
    </html>
  `;
}
