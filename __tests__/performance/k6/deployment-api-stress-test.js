/**
 * K6 Stress Tests for Deployment API
 * Tests system behavior under extreme load and failure scenarios
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { randomItem, randomString } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// Custom metrics for stress testing
const systemStabilityRate = new Rate('system_stability');
const maxConcurrentDeployments = new Gauge('max_concurrent_deployments');
const systemRecoveryTime = new Trend('system_recovery_time');
const memoryPressureGauge = new Gauge('memory_pressure');
const apiSaturationPoint = new Gauge('api_saturation_point');

// Stress test configuration - more aggressive than load test
export const options = {
  stages: [
    { duration: '1m', target: 50 },    // Quick ramp to 50
    { duration: '2m', target: 100 },   // Ramp to 100
    { duration: '2m', target: 200 },   // Stress level 1
    { duration: '3m', target: 300 },   // Stress level 2
    { duration: '2m', target: 500 },   // Extreme stress
    { duration: '1m', target: 500 },   // Hold extreme load
    { duration: '2m', target: 200 },   // Partial recovery
    { duration: '1m', target: 50 },    // Recovery
    { duration: '2m', target: 0 },     // Full recovery
  ],
  thresholds: {
    http_req_duration: ['p(95)<10000'],  // More lenient under stress
    http_req_failed: ['rate<0.1'],       // Allow 10% failure under stress
    system_stability: ['rate>0.8'],      // System should remain 80% stable
  }
};

const BASE_URL = __ENV.API_BASE_URL || 'https://deploy-api.candlefish.ai/v1';
const AUTH_TOKEN = __ENV.AUTH_TOKEN;

if (!AUTH_TOKEN) {
  throw new Error('AUTH_TOKEN environment variable is required');
}

const headers = {
  'Authorization': `Bearer ${AUTH_TOKEN}`,
  'Content-Type': 'application/json',
};

// Test data for stress scenarios
const sites = ['docs', 'partners', 'api'];
const environments = ['staging', 'preview'];
const branches = ['main', 'develop', 'feature/stress-test'];

export function setup() {
  console.log('Starting stress test...');

  // Baseline health check
  const response = http.get(`${BASE_URL}/health`, { headers });
  const baselineHealth = response.json();

  console.log(`Baseline health: ${JSON.stringify(baselineHealth)}`);

  return {
    startTime: new Date(),
    baselineHealth,
    concurrentDeployments: 0,
    maxConcurrent: 0
  };
}

export default function(data) {
  const vuId = __VU;
  const iteration = __ITER;

  group('Stress Test Scenarios', () => {

    // Scenario 1: Concurrent deployment creation
    if (Math.random() < 0.4) {
      group('Concurrent Deployment Creation', () => {
        createStressDeployments(vuId, iteration);
      });
    }

    // Scenario 2: High-frequency API calls
    if (Math.random() < 0.3) {
      group('High-Frequency API Calls', () => {
        performHighFrequencyRequests();
      });
    }

    // Scenario 3: Memory pressure through large payloads
    if (Math.random() < 0.2) {
      group('Large Payload Stress', () => {
        sendLargePayloads();
      });
    }

    // Scenario 4: Database stress through complex queries
    if (Math.random() < 0.3) {
      group('Database Query Stress', () => {
        performComplexQueries();
      });
    }

    // Scenario 5: Rollback stress testing
    if (Math.random() < 0.1) {
      group('Rollback Stress', () => {
        stressRollbackOperations();
      });
    }

    // Monitor system health during stress
    monitorSystemHealth();

    // Minimal sleep to maximize pressure
    sleep(Math.random() * 0.5);
  });
}

function createStressDeployments(vuId, iteration) {
  // Create multiple deployments rapidly
  const concurrentCount = Math.floor(Math.random() * 5) + 1; // 1-5 concurrent

  for (let i = 0; i < concurrentCount; i++) {
    const deploymentPayload = {
      site_name: randomItem(sites),
      environment: randomItem(environments),
      commit_sha: randomString(40, 'abcdef0123456789'),
      branch: `stress-test-${vuId}-${iteration}-${i}`,
      deployment_strategy: 'blue-green',
      changelog: `Stress test deployment ${vuId}-${iteration}-${i}`,
      metadata: {
        stress_test: true,
        vu_id: vuId,
        iteration: iteration,
        concurrent_index: i
      }
    };

    const startTime = new Date();
    const response = http.post(
      `${BASE_URL}/deployments`,
      JSON.stringify(deploymentPayload),
      {
        headers,
        timeout: '30s' // Longer timeout for stress conditions
      }
    );
    const duration = new Date() - startTime;

    const success = check(response, {
      'stress deployment created': (r) => [201, 409, 429].includes(r.status),
      'response within timeout': () => duration < 30000,
    });

    systemStabilityRate.add(success);

    // Track concurrent deployments
    if (response.status === 201) {
      maxConcurrentDeployments.add(1);
    }

    // Handle rate limiting gracefully
    if (response.status === 429) {
      console.log(`Rate limited - backing off (VU: ${vuId})`);
      sleep(Math.random() * 2 + 1);
    }
  }
}

function performHighFrequencyRequests() {
  // Burst of API calls to test rate limiting and caching
  const burstSize = Math.floor(Math.random() * 20) + 10; // 10-30 requests

  for (let i = 0; i < burstSize; i++) {
    const endpoints = [
      '/deployments',
      '/deployments?limit=1',
      '/environments',
      '/health',
      '/health/sites'
    ];

    const endpoint = randomItem(endpoints);
    const response = http.get(`${BASE_URL}${endpoint}`, {
      headers,
      timeout: '10s'
    });

    check(response, {
      'high frequency request handled': (r) => r.status < 500,
      'response time reasonable under stress': (r) => r.timings.duration < 10000,
    });

    // No sleep - maximum frequency
  }
}

function sendLargePayloads() {
  // Create deployments with large changelog/metadata to stress memory
  const largeChangelog = randomString(10000); // 10KB changelog
  const largeMetadata = {};

  // Create large metadata object
  for (let i = 0; i < 100; i++) {
    largeMetadata[`key_${i}`] = randomString(100);
  }

  const largePayload = {
    site_name: randomItem(sites),
    environment: randomItem(environments),
    commit_sha: randomString(40, 'abcdef0123456789'),
    branch: 'stress-test-large-payload',
    deployment_strategy: 'blue-green',
    changelog: largeChangelog,
    metadata: largeMetadata
  };

  const response = http.post(
    `${BASE_URL}/deployments`,
    JSON.stringify(largePayload),
    {
      headers,
      timeout: '60s'
    }
  );

  check(response, {
    'large payload handled': (r) => [201, 413, 429].includes(r.status),
    'no memory errors': (r) => !r.body.includes('out of memory'),
  });

  memoryPressureGauge.add(JSON.stringify(largePayload).length);
}

function performComplexQueries() {
  // Complex filtering that might stress the database
  const complexFilters = [
    // Multiple filters
    '?site_name=docs&environment=staging&status=success&limit=50',
    // Date range queries
    '?start_time=2024-01-01T00:00:00Z&end_time=2024-12-31T23:59:59Z&limit=100',
    // Large pagination
    '?limit=100&offset=500',
    // Multiple status filters (if supported)
    '?status=success&status=failed&status=pending'
  ];

  complexFilters.forEach(filter => {
    const response = http.get(`${BASE_URL}/deployments${filter}`, {
      headers,
      timeout: '30s'
    });

    check(response, {
      [`complex query handled: ${filter}`]: (r) => r.status < 500,
      'database query completed': (r) => r.timings.duration < 30000,
    });
  });
}

function stressRollbackOperations() {
  // Get recent deployments to rollback
  const response = http.get(`${BASE_URL}/deployments?limit=5&status=success`, { headers });

  if (response.status === 200) {
    const deployments = response.json('deployments') || [];

    if (deployments.length >= 2) {
      const currentId = deployments[0].id;
      const targetId = deployments[1].id;

      const rollbackPayload = {
        rollback_target: targetId,
        reason: 'Stress test rollback',
        force: false
      };

      const rollbackResponse = http.post(
        `${BASE_URL}/deployments/${currentId}/rollback`,
        JSON.stringify(rollbackPayload),
        { headers, timeout: '30s' }
      );

      check(rollbackResponse, {
        'rollback initiated under stress': (r) => [201, 400, 409].includes(r.status),
        'rollback response timely': (r) => r.timings.duration < 30000,
      });
    }
  }
}

function monitorSystemHealth() {
  // Quick health check to monitor system degradation
  const response = http.get(`${BASE_URL}/health`, {
    headers,
    timeout: '5s'
  });

  const healthy = check(response, {
    'system responsive': (r) => r.status === 200,
    'health check fast': (r) => r.timings.duration < 5000,
  });

  systemStabilityRate.add(healthy);

  // Check for degraded services
  if (response.status === 200) {
    const health = response.json();

    if (health.status === 'degraded' || health.status === 'unhealthy') {
      console.log(`System health degraded: ${JSON.stringify(health)}`);
    }

    // Check individual service health
    if (health.checks) {
      Object.keys(health.checks).forEach(service => {
        if (health.checks[service] === 'unhealthy') {
          console.log(`Service unhealthy: ${service}`);
        }
      });
    }
  }
}

export function teardown(data) {
  const endTime = new Date();
  const totalDuration = (endTime - data.startTime) / 1000;

  console.log(`Stress test completed in ${totalDuration}s`);

  // System recovery monitoring
  console.log('Monitoring system recovery...');
  const recoveryStartTime = new Date();

  let systemHealthy = false;
  let attempts = 0;
  const maxAttempts = 30; // 5 minutes of recovery monitoring

  while (!systemHealthy && attempts < maxAttempts) {
    sleep(10); // Wait 10 seconds between checks
    attempts++;

    const response = http.get(`${BASE_URL}/health`, { headers });

    if (response.status === 200) {
      const health = response.json();
      systemHealthy = health.status === 'healthy';

      if (systemHealthy) {
        const recoveryTime = (new Date() - recoveryStartTime) / 1000;
        systemRecoveryTime.add(recoveryTime);
        console.log(`System recovered in ${recoveryTime}s`);
        break;
      } else {
        console.log(`Recovery attempt ${attempts}: ${health.status}`);
      }
    }
  }

  if (!systemHealthy) {
    console.error('System did not fully recover within monitoring period');
  }

  // Final system state report
  const finalResponse = http.get(`${BASE_URL}/health`, { headers });
  if (finalResponse.status === 200) {
    console.log(`Final system state: ${JSON.stringify(finalResponse.json())}`);
  }
}
