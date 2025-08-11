// Tyler Setup Platform - K6 Load Testing Suite
// Comprehensive performance testing for all endpoints

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import { randomString, randomItem } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// Custom metrics
const apiResponseTime = new Trend('api_response_time');
const websocketLatency = new Trend('websocket_latency');
const cacheHitRate = new Rate('cache_hit_rate');
const errorRate = new Rate('error_rate');
const concurrentUsers = new Gauge('concurrent_users');
const coldStarts = new Counter('lambda_cold_starts');

// Test configuration
const BASE_URL = __ENV.BASE_URL || 'https://api.tyler-setup.candlefish.ai';
const WS_URL = __ENV.WS_URL || 'wss://ws.tyler-setup.candlefish.ai';

// Test data
const testUsers = new SharedArray('users', function () {
  return JSON.parse(open('./test-data/users.json'));
});

/**
 * Performance test scenarios based on requirements:
 * - API response time < 200ms p95
 * - Support 500+ concurrent users
 * - WebSocket latency < 100ms
 * - Dashboard load time < 3s
 */
export const options = {
  scenarios: {
    // Scenario 1: Baseline Load Test
    baseline: {
      executor: 'constant-vus',
      vus: 50,
      duration: '5m',
      tags: { scenario: 'baseline' },
    },

    // Scenario 2: Stress Test (500+ concurrent users)
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '3m', target: 300 },
        { duration: '5m', target: 500 },
        { duration: '3m', target: 600 }, // Above requirement to test limits
        { duration: '2m', target: 0 },
      ],
      tags: { scenario: 'stress' },
    },

    // Scenario 3: Spike Test
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 500 }, // Sudden spike
        { duration: '30s', target: 500 }, // Maintain spike
        { duration: '10s', target: 0 },   // Quick drop
      ],
      startTime: '15m',
      tags: { scenario: 'spike' },
    },

    // Scenario 4: WebSocket Performance
    websocket: {
      executor: 'constant-vus',
      vus: 100,
      duration: '5m',
      startTime: '20m',
      exec: 'websocketTest',
      tags: { scenario: 'websocket' },
    },

    // Scenario 5: API Endpoint Testing
    api_endpoints: {
      executor: 'per-vu-iterations',
      vus: 50,
      iterations: 20,
      maxDuration: '10m',
      startTime: '25m',
      exec: 'apiEndpointTest',
      tags: { scenario: 'api_endpoints' },
    },

    // Scenario 6: Dashboard Load Test
    dashboard: {
      executor: 'constant-arrival-rate',
      rate: 30,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 50,
      startTime: '35m',
      exec: 'dashboardLoadTest',
      tags: { scenario: 'dashboard' },
    },
  },

  thresholds: {
    // API response time requirements
    'http_req_duration{scenario:api_endpoints}': [
      'p(95)<200', // 95th percentile < 200ms
      'p(99)<500', // 99th percentile < 500ms
    ],

    // WebSocket latency requirements
    'websocket_latency': ['p(95)<100'], // < 100ms

    // Dashboard load time requirements
    'http_req_duration{scenario:dashboard}': ['p(95)<3000'], // < 3s

    // Error rate threshold
    'http_req_failed': ['rate<0.01'], // < 1% error rate
    'error_rate': ['rate<0.01'],

    // Concurrent users support
    'concurrent_users': ['value>500'], // Support 500+ users

    // Cache performance
    'cache_hit_rate': ['rate>0.8'], // > 80% cache hit rate
  },
};

// Default function - Main test scenario
export default function () {
  const user = randomItem(testUsers);
  const authToken = login(user.email, user.password);

  if (authToken) {
    // Update concurrent users metric
    concurrentUsers.add(1);

    // Test various user flows
    const flowChoice = Math.random();

    if (flowChoice < 0.3) {
      // User management flow (30%)
      userManagementFlow(authToken);
    } else if (flowChoice < 0.5) {
      // Contractor access flow (20%)
      contractorAccessFlow(authToken);
    } else if (flowChoice < 0.7) {
      // Secrets management flow (20%)
      secretsManagementFlow(authToken);
    } else {
      // Dashboard and monitoring flow (30%)
      dashboardFlow(authToken);
    }

    // Logout
    logout(authToken);
    concurrentUsers.add(-1);
  }

  sleep(1);
}

// WebSocket test scenario
export function websocketTest() {
  const url = `${WS_URL}/graphql`;
  const params = {
    tags: { name: 'WebSocketConnection' },
  };

  const response = ws.connect(url, params, function (socket) {
    socket.on('open', () => {
      console.log('WebSocket connected');

      // Subscribe to real-time updates
      socket.send(JSON.stringify({
        type: 'connection_init',
        payload: {
          authorization: `Bearer ${getAuthToken()}`,
        },
      }));

      // Send subscription
      socket.send(JSON.stringify({
        id: '1',
        type: 'start',
        payload: {
          query: `
            subscription OnUserUpdate {
              userUpdated {
                id
                email
                status
              }
            }
          `,
        },
      }));
    });

    socket.on('message', (data) => {
      const startTime = Date.now();
      const message = JSON.parse(data);

      if (message.type === 'data') {
        const latency = Date.now() - startTime;
        websocketLatency.add(latency);

        check(message, {
          'WebSocket message received': (msg) => msg.payload !== undefined,
          'WebSocket latency < 100ms': () => latency < 100,
        });
      }
    });

    socket.on('error', (e) => {
      console.error('WebSocket error:', e);
      errorRate.add(1);
    });

    // Keep connection alive for test duration
    socket.setTimeout(() => {
      socket.close();
    }, 60000);
  });

  check(response, {
    'WebSocket connection successful': (r) => r && r.status === 101,
  });
}

// API endpoint test scenario
export function apiEndpointTest() {
  const authToken = getAuthToken();
  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json',
  };

  // Test all critical endpoints
  const endpoints = [
    { method: 'GET', path: '/users', name: 'ListUsers' },
    { method: 'GET', path: '/contractors', name: 'ListContractors' },
    { method: 'GET', path: '/secrets', name: 'ListSecrets' },
    { method: 'GET', path: '/audit', name: 'GetAuditLog' },
    { method: 'GET', path: '/config', name: 'GetConfig' },
    { method: 'GET', path: '/health', name: 'HealthCheck' },
  ];

  endpoints.forEach(endpoint => {
    const startTime = Date.now();
    const response = http.request(endpoint.method, `${BASE_URL}${endpoint.path}`, null, {
      headers,
      tags: { endpoint: endpoint.name },
    });

    const responseTime = Date.now() - startTime;
    apiResponseTime.add(responseTime);

    // Check for cold starts (response time > 1000ms on first request)
    if (responseTime > 1000 && response.headers['X-Cold-Start'] === 'true') {
      coldStarts.add(1);
    }

    // Check cache headers
    if (response.headers['X-Cache'] === 'Hit') {
      cacheHitRate.add(1);
    } else {
      cacheHitRate.add(0);
    }

    check(response, {
      [`${endpoint.name} status 200`]: (r) => r.status === 200,
      [`${endpoint.name} response time < 200ms`]: (r) => responseTime < 200,
      [`${endpoint.name} has body`]: (r) => r.body && r.body.length > 0,
    });

    if (response.status !== 200) {
      errorRate.add(1);
    } else {
      errorRate.add(0);
    }

    sleep(0.5);
  });
}

// Dashboard load test scenario
export function dashboardLoadTest() {
  const authToken = getAuthToken();

  // Simulate dashboard load with parallel requests
  const batch = [
    ['GET', `${BASE_URL}/users?limit=10`, null, { tags: { name: 'DashboardUsers' } }],
    ['GET', `${BASE_URL}/contractors?status=active`, null, { tags: { name: 'DashboardContractors' } }],
    ['GET', `${BASE_URL}/audit?limit=20`, null, { tags: { name: 'DashboardAudit' } }],
    ['GET', `${BASE_URL}/config`, null, { tags: { name: 'DashboardConfig' } }],
    ['GET', `${BASE_URL}/health`, null, { tags: { name: 'DashboardHealth' } }],
  ];

  const startTime = Date.now();
  const responses = http.batch(batch.map(req => {
    return {
      method: req[0],
      url: req[1],
      body: req[2],
      params: {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        ...req[3],
      },
    };
  }));

  const totalLoadTime = Date.now() - startTime;

  check(responses, {
    'Dashboard loads successfully': (responses) => responses.every(r => r.status === 200),
    'Dashboard load time < 3s': () => totalLoadTime < 3000,
  });

  // Check individual response times
  responses.forEach((response, index) => {
    const name = batch[index][3].tags.name;
    check(response, {
      [`${name} loaded`]: (r) => r.status === 200,
    });
  });
}

// Helper functions for user flows
function login(email, password) {
  const response = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    email,
    password,
  }), {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'Login' },
  });

  check(response, {
    'Login successful': (r) => r.status === 200,
    'Auth token received': (r) => r.json('token') !== undefined,
  });

  return response.status === 200 ? response.json('token') : null;
}

function logout(authToken) {
  const response = http.post(`${BASE_URL}/auth/logout`, null, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
    tags: { name: 'Logout' },
  });

  check(response, {
    'Logout successful': (r) => r.status === 200,
  });
}

function userManagementFlow(authToken) {
  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json',
  };

  // List users
  let response = http.get(`${BASE_URL}/users`, { headers, tags: { name: 'ListUsers' } });
  check(response, { 'List users successful': (r) => r.status === 200 });

  // Create user
  const newUser = {
    email: `test-${randomString(8)}@example.com`,
    name: `Test User ${randomString(4)}`,
    role: 'developer',
  };

  response = http.post(`${BASE_URL}/users`, JSON.stringify(newUser), {
    headers,
    tags: { name: 'CreateUser' },
  });

  if (response.status === 201) {
    const userId = response.json('id');

    // Update user
    response = http.put(`${BASE_URL}/users/${userId}`, JSON.stringify({
      role: 'admin',
    }), {
      headers,
      tags: { name: 'UpdateUser' },
    });
    check(response, { 'Update user successful': (r) => r.status === 200 });

    // Delete user
    response = http.del(`${BASE_URL}/users/${userId}`, null, {
      headers,
      tags: { name: 'DeleteUser' },
    });
    check(response, { 'Delete user successful': (r) => r.status === 200 });
  }
}

function contractorAccessFlow(authToken) {
  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json',
  };

  // Invite contractor
  const response = http.post(`${BASE_URL}/contractors/invite`, JSON.stringify({
    email: `contractor-${randomString(8)}@example.com`,
    name: `Contractor ${randomString(4)}`,
    expiresIn: 86400, // 24 hours
  }), {
    headers,
    tags: { name: 'InviteContractor' },
  });

  if (response.status === 201) {
    const token = response.json('token');

    // Access with token
    const accessResponse = http.get(`${BASE_URL}/contractors/access/${token}`, {
      tags: { name: 'ContractorAccess' },
    });
    check(accessResponse, { 'Contractor access successful': (r) => r.status === 200 });

    // Revoke access
    const contractorId = response.json('id');
    const revokeResponse = http.post(`${BASE_URL}/contractors/revoke/${contractorId}`, null, {
      headers,
      tags: { name: 'RevokeContractor' },
    });
    check(revokeResponse, { 'Revoke contractor successful': (r) => r.status === 200 });
  }
}

function secretsManagementFlow(authToken) {
  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json',
  };

  // List secrets
  let response = http.get(`${BASE_URL}/secrets`, { headers, tags: { name: 'ListSecrets' } });
  check(response, { 'List secrets successful': (r) => r.status === 200 });

  // Create secret
  const secretName = `test-secret-${randomString(8)}`;
  response = http.post(`${BASE_URL}/secrets`, JSON.stringify({
    name: secretName,
    value: randomString(32),
    description: 'Test secret for load testing',
  }), {
    headers,
    tags: { name: 'CreateSecret' },
  });

  if (response.status === 201) {
    // Get secret
    response = http.get(`${BASE_URL}/secrets/${secretName}`, {
      headers,
      tags: { name: 'GetSecret' },
    });
    check(response, { 'Get secret successful': (r) => r.status === 200 });

    // Update secret
    response = http.put(`${BASE_URL}/secrets/${secretName}`, JSON.stringify({
      value: randomString(32),
    }), {
      headers,
      tags: { name: 'UpdateSecret' },
    });
    check(response, { 'Update secret successful': (r) => r.status === 200 });

    // Delete secret
    response = http.del(`${BASE_URL}/secrets/${secretName}`, null, {
      headers,
      tags: { name: 'DeleteSecret' },
    });
    check(response, { 'Delete secret successful': (r) => r.status === 200 });
  }
}

function dashboardFlow(authToken) {
  const headers = {
    'Authorization': `Bearer ${authToken}`,
  };

  // Simulate dashboard load
  const requests = [
    http.get(`${BASE_URL}/users?limit=10`, { headers, tags: { name: 'DashboardUsers' } }),
    http.get(`${BASE_URL}/contractors?status=active`, { headers, tags: { name: 'DashboardContractors' } }),
    http.get(`${BASE_URL}/audit?limit=20`, { headers, tags: { name: 'DashboardAudit' } }),
    http.get(`${BASE_URL}/config`, { headers, tags: { name: 'DashboardConfig' } }),
    http.get(`${BASE_URL}/health`, { headers, tags: { name: 'DashboardHealth' } }),
  ];

  requests.forEach(response => {
    check(response, {
      'Dashboard component loaded': (r) => r.status === 200,
    });
  });
}

// Helper function to get auth token (cached for performance)
let cachedToken = null;
let tokenExpiry = 0;

function getAuthToken() {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const user = randomItem(testUsers);
  cachedToken = login(user.email, user.password);
  tokenExpiry = Date.now() + 3600000; // 1 hour

  return cachedToken;
}

// Export test summary
export function handleSummary(data) {
  return {
    'performance-report.html': htmlReport(data),
    'performance-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
