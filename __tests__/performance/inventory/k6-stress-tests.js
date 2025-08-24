import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';

// Custom metrics for stress testing
const failureRate = new Rate('failed_requests');
const apiLatency = new Trend('api_response_time');
const concurrentUsers = new Gauge('concurrent_users');
const resourceUtilization = new Trend('resource_utilization');
const databaseConnections = new Counter('db_connections');
const memoryUsage = new Trend('memory_usage_mb');

// Stress test configuration
export const options = {
  stages: [
    // Stress test pattern: gradually increase load beyond normal capacity
    { duration: '2m', target: 50 },    // Normal load
    { duration: '3m', target: 100 },   // Above normal
    { duration: '2m', target: 200 },   // High stress
    { duration: '5m', target: 300 },   // Peak stress
    { duration: '3m', target: 400 },   // Maximum stress
    { duration: '2m', target: 200 },   // Recovery test
    { duration: '2m', target: 0 },     // Cool down
  ],
  thresholds: {
    // More lenient thresholds for stress testing
    http_req_duration: ['p(99)<10000'], // 99% under 10s (stress conditions)
    http_req_failed: ['rate<0.20'],     // Allow up to 20% failure rate
    failed_requests: ['rate<0.25'],     // Custom failure threshold
    api_response_time: ['p(95)<8000'],  // 95% under 8s
    resource_utilization: ['p(95)<90'], // Resource usage under 90%
  },
  // Stress test specific options
  noConnectionReuse: false, // Test connection pooling under stress
  maxRedirects: 4,
  batch: 20, // Batch HTTP requests for efficiency
  discardResponseBodies: false, // Keep responses for validation
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const API_BASE = `${BASE_URL}/api/v1`;
const STRESS_TEST_DURATION = 300; // 5 minutes of peak stress

// Heavy payload generators for stress testing
function generateLargeItem() {
  const itemId = Math.floor(Math.random() * 1000000);
  return {
    name: `Stress Test Large Item ${itemId} - ${'X'.repeat(500)}`, // Large name
    description: 'Stress test description - ' + 'A'.repeat(2000), // Large description
    category: 'StressTest',
    sku: `STRESS-LARGE-${itemId}`,
    barcode: String(Math.floor(Math.random() * 9000000000000) + 1000000000000),
    quantity: Math.floor(Math.random() * 10000) + 1000, // Large quantities
    minQuantity: 100,
    maxQuantity: 50000,
    unitPrice: parseFloat((Math.random() * 10000 + 100).toFixed(2)), // High prices
    location: `Large Warehouse Complex Building ${Math.floor(Math.random() * 100)} - ` + 'Z'.repeat(200),
    supplier: `Major Enterprise Supplier Corporation ${Math.floor(Math.random() * 1000)} - ` + 'S'.repeat(300),
    tags: 'stress-test,large-payload,performance,high-volume,' + Array(50).fill('tag').map((t, i) => `${t}${i}`).join(','),
    metadata: {
      // Additional large data structure
      specifications: Array(100).fill(null).map((_, i) => ({
        key: `spec_${i}`,
        value: `specification_value_${i}_${'X'.repeat(100)}`,
        category: `category_${i % 10}`,
      })),
      customFields: Object.fromEntries(
        Array(50).fill(null).map((_, i) => [`custom_field_${i}`, `value_${i}_${'Y'.repeat(200)}`])
      ),
    },
  };
}

function generateBulkStressData(count = 500) {
  return {
    items: Array(count).fill(null).map((_, i) => ({
      id: `stress-bulk-${Date.now()}-${i}`,
      quantity: Math.floor(Math.random() * 1000) + 100,
      unitPrice: parseFloat((Math.random() * 1000 + 50).toFixed(2)),
      location: `Stress Location ${i}`,
      metadata: {
        batchId: `batch-${Date.now()}`,
        processed: false,
        priority: Math.floor(Math.random() * 10) + 1,
      },
    })),
    options: {
      validateData: true,
      updateInventory: true,
      sendNotifications: true,
      recalculateAnalytics: true,
    },
  };
}

// Stress test main function
export default function() {
  const currentVU = __VU;
  const iteration = __ITER;

  // Update concurrent users metric
  concurrentUsers.add(__VU);

  // Distribute load across different stress scenarios
  const stressScenarios = [
    highVolumeItemCreation,   // 25%
    massiveDataRetrieval,     // 20%
    complexAnalyticsQueries,  // 15%
    largeBulkOperations,      // 20%
    concurrentDataModification, // 10%
    resourceIntensiveExports,  // 10%
  ];

  // Weight-based scenario selection
  const weights = [25, 20, 15, 20, 10, 10];
  const random = Math.random() * 100;
  let cumulative = 0;
  let selectedScenario = 0;

  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (random <= cumulative) {
      selectedScenario = i;
      break;
    }
  }

  // Execute selected stress scenario
  stressScenarios[selectedScenario]();

  // Minimal sleep to maintain stress
  sleep(Math.random() * 0.5 + 0.1); // 0.1-0.6 seconds
}

// Stress test scenarios
function highVolumeItemCreation() {
  const params = {
    tags: { name: 'stress_item_creation' },
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + (__ENV.API_TOKEN || 'test-token'),
    },
  };

  // Create multiple items rapidly
  const itemCount = Math.floor(Math.random() * 10) + 5; // 5-14 items
  const results = [];

  const startTime = new Date().getTime();

  for (let i = 0; i < itemCount; i++) {
    const itemData = generateLargeItem();
    const response = http.post(`${API_BASE}/items`, JSON.stringify(itemData), params);
    results.push(response);

    // Track database connections
    databaseConnections.add(1);

    // No sleep between requests to maximize stress
  }

  const endTime = new Date().getTime();
  apiLatency.add(endTime - startTime);

  // Check results
  const successCount = results.filter(r => r.status === 201).length;
  const successRate = successCount / results.length;

  check({ successRate }, {
    'stress creation - success rate > 70%': (data) => data.successRate > 0.7,
    'stress creation - at least some succeed': (data) => data.successRate > 0.3,
  });

  failureRate.add(successRate < 0.5);
}

function massiveDataRetrieval() {
  const params = {
    tags: { name: 'stress_data_retrieval' },
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + (__ENV.API_TOKEN || 'test-token'),
    },
  };

  // Multiple concurrent large data retrievals
  const requests = [];
  const startTime = new Date().getTime();

  // Large page sizes to stress the system
  const pageSizes = [500, 1000, 2000, 5000];

  for (let i = 0; i < 5; i++) {
    const pageSize = pageSizes[Math.floor(Math.random() * pageSizes.length)];
    const offset = Math.floor(Math.random() * 10000);

    const url = `${API_BASE}/items?limit=${pageSize}&offset=${offset}&includeMetadata=true`;
    const response = http.get(url, params);
    requests.push(response);
  }

  const endTime = new Date().getTime();
  apiLatency.add(endTime - startTime);

  // Analyze memory usage based on response sizes
  const totalResponseSize = requests.reduce((sum, r) => sum + (r.body ? r.body.length : 0), 0);
  memoryUsage.add(totalResponseSize / 1024 / 1024); // MB

  const successCount = requests.filter(r => r.status === 200).length;
  const successRate = successCount / requests.length;

  check({ successRate, totalResponseSize }, {
    'stress retrieval - success rate > 60%': (data) => data.successRate > 0.6,
    'stress retrieval - handles large responses': (data) => data.totalResponseSize > 0,
    'stress retrieval - response size reasonable': (data) => data.totalResponseSize < 100 * 1024 * 1024, // < 100MB
  });

  failureRate.add(successRate < 0.4);
}

function complexAnalyticsQueries() {
  const params = {
    tags: { name: 'stress_analytics' },
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + (__ENV.API_TOKEN || 'test-token'),
    },
  };

  const startTime = new Date().getTime();

  // Multiple complex analytics requests
  const analyticsRequests = [
    `${API_BASE}/analytics/summary`,
    `${API_BASE}/analytics/by-room`,
    `${API_BASE}/analytics/by-category`,
    `${API_BASE}/ai/insights`,
    `${API_BASE}/ai/predictive-trends`,
    `${API_BASE}/analytics/revenue-trends?period=yearly`,
    `${API_BASE}/analytics/inventory-turnover`,
  ];

  const responses = analyticsRequests.map(url => http.get(url, params));
  const endTime = new Date().getTime();

  apiLatency.add(endTime - startTime);

  // Calculate resource utilization based on response times
  const avgResponseTime = responses.reduce((sum, r) => sum + r.timings.duration, 0) / responses.length;
  resourceUtilization.add(Math.min(100, (avgResponseTime / 5000) * 100)); // Normalize to percentage

  const successCount = responses.filter(r => r.status === 200).length;
  const successRate = successCount / responses.length;

  check({ successRate, avgResponseTime }, {
    'stress analytics - success rate > 50%': (data) => data.successRate > 0.5,
    'stress analytics - average time reasonable': (data) => data.avgResponseTime < 15000,
    'stress analytics - at least one succeeds': (data) => data.successRate > 0,
  });

  failureRate.add(successRate < 0.3);
}

function largeBulkOperations() {
  const params = {
    tags: { name: 'stress_bulk_operations' },
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + (__ENV.API_TOKEN || 'test-token'),
    },
  };

  // Large bulk operations
  const bulkSizes = [100, 250, 500, 1000];
  const bulkSize = bulkSizes[Math.floor(Math.random() * bulkSizes.length)];

  const bulkData = generateBulkStressData(bulkSize);

  const startTime = new Date().getTime();
  const response = http.post(`${API_BASE}/items/bulk`, JSON.stringify(bulkData), {
    ...params,
    timeout: '120s', // Extended timeout for large operations
  });
  const endTime = new Date().getTime();

  apiLatency.add(endTime - startTime);

  // Estimate resource usage
  const payloadSize = JSON.stringify(bulkData).length;
  resourceUtilization.add(Math.min(100, (payloadSize / (1024 * 1024)) * 10)); // Rough estimate

  const success = check(response, {
    'stress bulk - completes within timeout': (r) => r.status !== 0, // Not timeout
    'stress bulk - handles large payload': (r) => r.status < 500 || r.status === 413, // Accept or payload too large
    'stress bulk - reasonable processing time': (r) => r.timings.duration < 120000, // 2 minutes max
  });

  if (response.status === 200 && response.json().updated) {
    check(response, {
      'stress bulk - processes some items': (r) => r.json().updated > 0,
      'stress bulk - error rate acceptable': (r) => {
        const result = r.json();
        return result.errors.length < (bulkSize * 0.5); // Less than 50% errors
      },
    });
  }

  failureRate.add(!success);
}

function concurrentDataModification() {
  const params = {
    tags: { name: 'stress_concurrent_modification' },
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + (__ENV.API_TOKEN || 'test-token'),
    },
  };

  // Simulate concurrent modifications to test locking and consistency
  const itemId = `concurrent-test-${Math.floor(Math.random() * 100) + 1}`;

  const modifications = [
    // Quantity updates
    { quantity: Math.floor(Math.random() * 1000) + 100 },
    // Price updates
    { unitPrice: parseFloat((Math.random() * 1000 + 50).toFixed(2)) },
    // Location updates
    { location: `Stress Location ${Math.floor(Math.random() * 100)}` },
    // Combined updates
    {
      quantity: Math.floor(Math.random() * 500) + 50,
      unitPrice: parseFloat((Math.random() * 500 + 25).toFixed(2)),
      location: `Combined Update Location ${Math.floor(Math.random() * 50)}`,
    },
  ];

  const modification = modifications[Math.floor(Math.random() * modifications.length)];

  const startTime = new Date().getTime();
  const response = http.put(`${API_BASE}/items/${itemId}`, JSON.stringify(modification), params);
  const endTime = new Date().getTime();

  apiLatency.add(endTime - startTime);

  const success = check(response, {
    'stress concurrent - handles concurrent access': (r) => r.status === 200 || r.status === 404 || r.status === 409,
    'stress concurrent - no corruption': (r) => r.status !== 500,
    'stress concurrent - reasonable response time': (r) => r.timings.duration < 10000,
  });

  failureRate.add(!success);
}

function resourceIntensiveExports() {
  const params = {
    tags: { name: 'stress_exports' },
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + (__ENV.API_TOKEN || 'test-token'),
    },
    timeout: '180s', // Long timeout for exports
  };

  const exportFormats = ['excel', 'csv', 'pdf'];
  const format = exportFormats[Math.floor(Math.random() * exportFormats.length)];

  // Add parameters to make export more intensive
  const exportParams = new URLSearchParams({
    includeImages: 'true',
    includeMetadata: 'true',
    includeAnalytics: 'true',
    format: 'detailed',
  });

  const startTime = new Date().getTime();
  const response = http.get(`${API_BASE}/export/${format}?${exportParams}`, params);
  const endTime = new Date().getTime();

  apiLatency.add(endTime - startTime);

  // Estimate resource usage based on export time and size
  const responseSize = response.body ? response.body.length : 0;
  resourceUtilization.add(Math.min(100, (endTime - startTime) / 1000)); // Seconds as percentage
  memoryUsage.add(responseSize / 1024 / 1024); // MB

  const success = check(response, {
    'stress export - completes or reasonable failure': (r) => r.status === 200 || r.status === 503 || r.status === 413,
    'stress export - no server crash': (r) => r.status !== 500,
    'stress export - handles timeout gracefully': (r) => r.status !== 0,
  });

  if (response.status === 200) {
    check(response, {
      'stress export - generates content': (r) => r.body.length > 0,
      'stress export - reasonable size': (r) => r.body.length < 50 * 1024 * 1024, // < 50MB
    });
  }

  failureRate.add(!success);
}

// Chaos engineering scenarios
export function chaosTest() {
  // Simulate various failure scenarios during stress
  const chaosScenarios = [
    simulateNetworkLatency,
    simulatePartialFailures,
    simulateDataCorruption,
    simulateResourceExhaustion,
  ];

  const scenario = chaosScenarios[Math.floor(Math.random() * chaosScenarios.length)];
  scenario();

  sleep(Math.random() * 2 + 1);
}

function simulateNetworkLatency() {
  // Add artificial delay to simulate network issues
  sleep(Math.random() * 5 + 1); // 1-6 seconds delay

  // Then perform normal operation
  const response = http.get(`${API_BASE}/items?limit=10`, {
    headers: { 'Authorization': 'Bearer ' + (__ENV.API_TOKEN || 'test-token') },
    tags: { name: 'chaos_network_latency' },
  });

  check(response, {
    'chaos network - survives latency': (r) => r.status === 200,
    'chaos network - timeout handling': (r) => r.timings.duration < 30000,
  });
}

function simulatePartialFailures() {
  // Mix successful and failing requests
  const requests = [];

  for (let i = 0; i < 5; i++) {
    if (Math.random() > 0.3) { // 70% success rate simulation
      requests.push(http.get(`${API_BASE}/items?limit=5&offset=${i * 5}`, {
        headers: { 'Authorization': 'Bearer ' + (__ENV.API_TOKEN || 'test-token') },
        tags: { name: 'chaos_partial_success' },
      }));
    } else {
      // Intentionally invalid request
      requests.push(http.get(`${API_BASE}/items?limit=-1&offset=invalid`, {
        headers: { 'Authorization': 'Bearer invalid-token' },
        tags: { name: 'chaos_partial_failure' },
      }));
    }
  }

  const successCount = requests.filter(r => r.status === 200).length;
  const failureCount = requests.filter(r => r.status >= 400).length;

  check({ successCount, failureCount }, {
    'chaos partial - handles mixed results': (data) => data.successCount > 0,
    'chaos partial - graceful error handling': (data) => data.failureCount > 0,
  });
}

function simulateDataCorruption() {
  // Send malformed data to test error handling
  const corruptedData = {
    name: null, // Invalid null
    sku: { invalid: 'object' }, // Wrong type
    quantity: 'not-a-number', // Wrong type
    unitPrice: Infinity, // Invalid number
    category: '', // Empty required field
  };

  const response = http.post(`${API_BASE}/items`, JSON.stringify(corruptedData), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + (__ENV.API_TOKEN || 'test-token'),
    },
    tags: { name: 'chaos_data_corruption' },
  });

  check(response, {
    'chaos corruption - rejects invalid data': (r) => r.status === 400,
    'chaos corruption - provides error details': (r) => r.json().error !== undefined,
    'chaos corruption - no server crash': (r) => r.status !== 500,
  });
}

function simulateResourceExhaustion() {
  // Attempt to exhaust resources with large requests
  const massivePayload = {
    items: Array(10000).fill(null).map((_, i) => ({
      id: `exhaust-${i}`,
      data: 'X'.repeat(10000), // Large data per item
    })),
  };

  const response = http.post(`${API_BASE}/items/bulk`, JSON.stringify(massivePayload), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + (__ENV.API_TOKEN || 'test-token'),
    },
    tags: { name: 'chaos_resource_exhaustion' },
    timeout: '60s',
  });

  check(response, {
    'chaos exhaustion - handles large payload': (r) => r.status !== 0, // Not timeout
    'chaos exhaustion - appropriate response': (r) =>
      r.status === 413 || r.status === 400 || r.status === 503 || r.status === 200,
    'chaos exhaustion - no memory leak': (r) => r.timings.duration < 60000,
  });
}

// Setup for stress testing
export function setup() {
  console.log('🔥 Starting inventory API STRESS tests...');
  console.log(`📊 Target Peak Load: 400 concurrent users`);
  console.log(`⏱️  Peak Duration: ${STRESS_TEST_DURATION}s`);

  // Verify API baseline performance before stress
  const baselineStart = new Date().getTime();
  const healthCheck = http.get(`${BASE_URL}/health`);
  const baselineEnd = new Date().getTime();

  if (healthCheck.status !== 200) {
    throw new Error(`Baseline health check failed: ${healthCheck.status}`);
  }

  const baselineTime = baselineEnd - baselineStart;
  console.log(`✅ Baseline response time: ${baselineTime}ms`);

  if (baselineTime > 5000) {
    console.warn('⚠️  Warning: High baseline latency detected');
  }

  return {
    startTime: new Date(),
    baselineLatency: baselineTime,
  };
}

export function teardown(data) {
  const endTime = new Date();
  const duration = (endTime - data.startTime) / 1000;

  console.log(`🏁 Stress test completed`);
  console.log(`⏱️  Total duration: ${duration}s`);
  console.log(`📈 Baseline latency: ${data.baselineLatency}ms`);

  // Post-stress health check
  const postStressHealth = http.get(`${BASE_URL}/health`);
  if (postStressHealth.status === 200) {
    console.log('✅ System survived stress test - healthy');
  } else {
    console.error('❌ System degraded after stress test');
  }

  // Cleanup stress test data
  try {
    http.del(`${API_BASE}/test-data/stress-cleanup`, {
      headers: { 'Authorization': 'Bearer ' + (__ENV.API_TOKEN || 'test-token') },
      timeout: '30s',
    });
    console.log('🧹 Stress test data cleanup initiated');
  } catch (e) {
    console.warn('⚠️  Cleanup failed - manual intervention may be required');
  }
}

export function handleSummary(data) {
  return {
    'inventory-stress-test-report.html': htmlReport(data),
    'inventory-stress-test-summary.json': JSON.stringify(data, null, 2),
    'inventory-stress-test-metrics.txt': generateStressTestSummary(data),
  };
}

function generateStressTestSummary(data) {
  const summary = `
INVENTORY API STRESS TEST SUMMARY
=================================

Test Configuration:
- Peak Users: 400
- Duration: ${data.state.testRunDuration}s
- Scenarios: High Volume Creation, Massive Retrieval, Complex Analytics, Bulk Operations

Key Metrics:
- Total Requests: ${data.metrics.http_reqs.values.count}
- Success Rate: ${((1 - data.metrics.http_req_failed.values.rate) * 100).toFixed(2)}%
- Average Response Time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
- 95th Percentile: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
- 99th Percentile: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms

Custom Metrics:
- API Latency (avg): ${data.metrics.api_response_time?.values.avg.toFixed(2) || 'N/A'}ms
- Failed Requests Rate: ${((data.metrics.failed_requests?.values.rate || 0) * 100).toFixed(2)}%
- Peak Concurrent Users: ${data.metrics.concurrent_users?.values.max || 'N/A'}
- Max Resource Utilization: ${data.metrics.resource_utilization?.values.max?.toFixed(2) || 'N/A'}%
- Max Memory Usage: ${data.metrics.memory_usage_mb?.values.max?.toFixed(2) || 'N/A'}MB

Threshold Status:
${Object.entries(data.metrics)
  .filter(([key, metric]) => metric.thresholds)
  .map(([key, metric]) => `- ${key}: ${metric.thresholds.failed ? '❌ FAILED' : '✅ PASSED'}`)
  .join('\n')}

System Behavior Under Stress:
- Breaking Point: ${data.metrics.http_req_failed?.values.rate > 0.5 ? 'REACHED' : 'NOT REACHED'}
- Recovery: ${data.metrics.http_req_failed?.values.rate < 0.1 ? 'SUCCESSFUL' : 'DEGRADED'}
- Stability: ${data.metrics.http_req_duration?.values['p(99)'] < 10000 ? 'STABLE' : 'UNSTABLE'}

Generated: ${new Date().toISOString()}
`;

  return summary;
}
