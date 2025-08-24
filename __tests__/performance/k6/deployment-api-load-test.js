/**
 * K6 Load Tests for Deployment API
 * Tests API performance under various load conditions
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomItem, randomString } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// Custom metrics
const deploymentCreationRate = new Rate('deployment_creation_success');
const deploymentCreationTrend = new Trend('deployment_creation_duration');
const apiErrorRate = new Rate('api_errors');
const concurrentDeploymentsCounter = new Counter('concurrent_deployments');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp up to 10 users
    { duration: '5m', target: 20 },   // Stay at 20 users
    { duration: '3m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 50 },   // Stay at 50 users
    { duration: '2m', target: 100 },  // Spike to 100 users
    { duration: '1m', target: 100 },  // Stay at spike
    { duration: '3m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
    http_req_failed: ['rate<0.02'],    // Error rate under 2%
    deployment_creation_success: ['rate>0.95'], // 95% success rate for deployments
    deployment_creation_duration: ['p(90)<5000'], // 90% of deployments under 5s
    api_errors: ['rate<0.01'],         // API error rate under 1%
  }
};

// Test data
const sites = ['docs', 'partners', 'api'];
const environments = ['staging', 'preview'];
const branches = ['main', 'develop', 'feature/test-1', 'feature/test-2', 'hotfix/critical'];
const strategies = ['blue-green', 'rolling', 'recreate'];

// API base URL
const BASE_URL = __ENV.API_BASE_URL || 'https://deploy-api.candlefish.ai/v1';

// Authentication token (should be set via environment variable)
const AUTH_TOKEN = __ENV.AUTH_TOKEN;

if (!AUTH_TOKEN) {
  throw new Error('AUTH_TOKEN environment variable is required');
}

const headers = {
  'Authorization': `Bearer ${AUTH_TOKEN}`,
  'Content-Type': 'application/json',
};

export function setup() {
  // Verify API is accessible
  const response = http.get(`${BASE_URL}/health`, { headers });
  check(response, {
    'API is accessible': (r) => r.status === 200,
    'API is healthy': (r) => r.json('status') === 'healthy',
  });

  console.log('Load test starting...');
  return { startTime: new Date() };
}

export default function(data) {
  const userId = `load-test-user-${__VU}`;

  group('Deployment API Load Test', () => {
    // Test deployment creation under load
    group('Create Deployments', () => {
      testDeploymentCreation(userId);
    });

    // Test deployment listing with various filters
    group('List Deployments', () => {
      testDeploymentListing();
    });

    // Test deployment details retrieval
    group('Get Deployment Details', () => {
      testDeploymentDetails();
    });

    // Test health checks under load
    group('Health Checks', () => {
      testHealthEndpoints();
    });

    // Test environment management
    group('Environment Management', () => {
      testEnvironmentEndpoints();
    });

    // Simulate realistic user behavior
    sleep(Math.random() * 3 + 1); // 1-4 seconds between requests
  });
}

function testDeploymentCreation(userId) {
  const deploymentPayload = {
    site_name: randomItem(sites),
    environment: randomItem(environments),
    commit_sha: randomString(40, 'abcdef0123456789'),
    branch: randomItem(branches),
    deployment_strategy: randomItem(strategies),
    changelog: `Load test deployment ${randomString(10)}`,
    triggered_by: userId
  };

  const startTime = new Date();
  const response = http.post(
    `${BASE_URL}/deployments`,
    JSON.stringify(deploymentPayload),
    { headers }
  );

  const duration = new Date() - startTime;
  deploymentCreationTrend.add(duration);

  const success = check(response, {
    'deployment created': (r) => r.status === 201,
    'response has deployment ID': (r) => r.json('id') !== undefined,
    'deployment in pending state': (r) => r.json('status') === 'pending',
    'response time acceptable': (r) => r.timings.duration < 5000,
  });

  deploymentCreationRate.add(success);
  concurrentDeploymentsCounter.add(1);

  if (!success) {
    apiErrorRate.add(1);
    console.error(`Deployment creation failed: ${response.status} - ${response.body}`);
  }

  // Store deployment ID for later use
  if (response.status === 201) {
    const deploymentId = response.json('id');
    // Store in global state for other tests
    __ENV[`deployment_${__VU}_${__ITER}`] = deploymentId;
  }
}

function testDeploymentListing() {
  const scenarios = [
    // No filters
    {},
    // Filter by site
    { site_name: randomItem(sites) },
    // Filter by environment
    { environment: randomItem(environments) },
    // Filter by status
    { status: randomItem(['pending', 'building', 'success', 'failed']) },
    // Pagination
    { limit: 10, offset: Math.floor(Math.random() * 50) },
    // Combined filters
    {
      site_name: randomItem(sites),
      environment: randomItem(environments),
      limit: 20
    }
  ];

  const scenario = randomItem(scenarios);
  const queryString = Object.keys(scenario)
    .map(key => `${key}=${encodeURIComponent(scenario[key])}`)
    .join('&');

  const url = `${BASE_URL}/deployments${queryString ? '?' + queryString : ''}`;
  const response = http.get(url, { headers });

  check(response, {
    'deployments listed': (r) => r.status === 200,
    'response has deployments array': (r) => Array.isArray(r.json('deployments')),
    'response has pagination': (r) => r.json('pagination') !== undefined,
    'response time acceptable': (r) => r.timings.duration < 2000,
  });

  if (response.status !== 200) {
    apiErrorRate.add(1);
  }
}

function testDeploymentDetails() {
  // Try to get deployment details for previously created deployments
  const deploymentKeys = Object.keys(__ENV).filter(key => key.startsWith('deployment_'));

  if (deploymentKeys.length === 0) {
    // If no deployments from this test, use a mock ID
    return;
  }

  const deploymentId = __ENV[randomItem(deploymentKeys)];
  const response = http.get(`${BASE_URL}/deployments/${deploymentId}`, { headers });

  check(response, {
    'deployment details retrieved': (r) => r.status === 200 || r.status === 404,
    'response has deployment data': (r) => r.status === 404 || r.json('id') !== undefined,
    'response time acceptable': (r) => r.timings.duration < 1500,
  });

  if (response.status !== 200 && response.status !== 404) {
    apiErrorRate.add(1);
  }
}

function testHealthEndpoints() {
  const healthEndpoints = [
    '/health',
    '/health/sites',
    `/health/sites/${randomItem(sites)}`,
  ];

  healthEndpoints.forEach(endpoint => {
    const response = http.get(`${BASE_URL}${endpoint}`, { headers });

    check(response, {
      [`${endpoint} accessible`]: (r) => r.status === 200,
      [`${endpoint} response time acceptable`]: (r) => r.timings.duration < 1000,
    });

    if (response.status !== 200) {
      apiErrorRate.add(1);
    }
  });
}

function testEnvironmentEndpoints() {
  // Test environments listing
  const envResponse = http.get(`${BASE_URL}/environments`, { headers });

  check(envResponse, {
    'environments listed': (r) => r.status === 200,
    'environments array returned': (r) => Array.isArray(r.json('environments')),
    'response time acceptable': (r) => r.timings.duration < 1000,
  });

  if (envResponse.status !== 200) {
    apiErrorRate.add(1);
    return;
  }

  // Test environment variables (if environments exist)
  const environments = envResponse.json('environments');
  if (environments && environments.length > 0) {
    const env = randomItem(environments);
    const varsResponse = http.get(
      `${BASE_URL}/environments/${env.name}/variables?site_name=${randomItem(sites)}`,
      { headers }
    );

    check(varsResponse, {
      'environment variables retrieved': (r) => r.status === 200,
      'variables array returned': (r) => Array.isArray(r.json('variables')),
      'response time acceptable': (r) => r.timings.duration < 1500,
    });

    if (varsResponse.status !== 200) {
      apiErrorRate.add(1);
    }
  }
}

export function teardown(data) {
  const endTime = new Date();
  const duration = (endTime - data.startTime) / 1000;

  console.log(`Load test completed in ${duration}s`);

  // Final health check to ensure system is stable after load test
  const response = http.get(`${BASE_URL}/health`, { headers });
  check(response, {
    'System healthy after load test': (r) => r.status === 200 && r.json('status') === 'healthy',
  });
}
