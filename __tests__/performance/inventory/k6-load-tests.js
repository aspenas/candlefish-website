import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';

// Custom metrics
const failureRate = new Rate('failed_requests');
const apiLatency = new Trend('api_response_time');
const itemCreations = new Counter('items_created');
const itemUpdates = new Counter('items_updated');
const itemDeletions = new Counter('items_deleted');

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 5 },   // Ramp-up to 5 users
    { duration: '3m', target: 5 },   // Stay at 5 users
    { duration: '1m', target: 20 },  // Ramp-up to 20 users
    { duration: '3m', target: 20 },  // Stay at 20 users
    { duration: '1m', target: 50 },  // Ramp-up to 50 users
    { duration: '5m', target: 50 },  // Stay at 50 users
    { duration: '2m', target: 0 },   // Ramp-down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests must complete below 2s
    http_req_failed: ['rate<0.05'],    // Error rate must be below 5%
    failed_requests: ['rate<0.05'],    // Custom failure rate below 5%
    api_response_time: ['p(95)<1500'], // Custom API latency below 1.5s
  },
};

// Environment configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const API_BASE = `${BASE_URL}/api/v1`;

// Test data generators
function generateRandomItem() {
  const itemId = Math.floor(Math.random() * 1000000);
  return {
    name: `Load Test Item ${itemId}`,
    description: `Generated item for load testing - ${itemId}`,
    category: ['Furniture', 'Electronics', 'Clothing', 'Books', 'Sports'][Math.floor(Math.random() * 5)],
    sku: `LOAD-${itemId}`,
    barcode: String(Math.floor(Math.random() * 9000000000000) + 1000000000000),
    quantity: Math.floor(Math.random() * 100) + 1,
    minQuantity: Math.floor(Math.random() * 10) + 1,
    maxQuantity: Math.floor(Math.random() * 200) + 100,
    unitPrice: parseFloat((Math.random() * 1000 + 10).toFixed(2)),
    location: ['Warehouse A', 'Warehouse B', 'Store Front', 'Storage Room'][Math.floor(Math.random() * 4)],
    supplier: `Supplier ${Math.floor(Math.random() * 50) + 1}`,
    tags: 'load-test,performance,k6',
  };
}

function generateAuthHeaders() {
  // In real tests, you'd get a JWT token through login
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + (__ENV.API_TOKEN || 'test-token'),
  };
}

// Main test scenarios
export default function() {
  const scenarios = [
    getInventoryItems,
    searchItems,
    getItemDetails,
    createItem,
    updateItem,
    getAnalytics,
    exportData,
    bulkOperations,
  ];

  // Randomly select a scenario for each iteration
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  scenario();

  // Think time between operations
  sleep(Math.random() * 3 + 1); // 1-4 seconds
}

// Test scenario functions
function getInventoryItems() {
  const params = {
    tags: { name: 'get_inventory_items' },
    headers: generateAuthHeaders(),
  };

  // Test pagination and filtering
  const offset = Math.floor(Math.random() * 200);
  const limit = Math.floor(Math.random() * 50) + 10;
  const category = Math.random() > 0.7 ? 'Furniture' : '';

  let url = `${API_BASE}/items?offset=${offset}&limit=${limit}`;
  if (category) {
    url += `&category=${category}`;
  }

  const startTime = new Date().getTime();
  const response = http.get(url, params);
  const endTime = new Date().getTime();

  apiLatency.add(endTime - startTime);

  const success = check(response, {
    'get items - status is 200': (r) => r.status === 200,
    'get items - has items array': (r) => Array.isArray(r.json().items),
    'get items - response time < 2s': (r) => r.timings.duration < 2000,
    'get items - has total count': (r) => typeof r.json().total === 'number',
  });

  failureRate.add(!success);
}

function searchItems() {
  const params = {
    tags: { name: 'search_items' },
    headers: generateAuthHeaders(),
  };

  const searchTerms = ['sofa', 'table', 'lamp', 'chair', 'desk', 'bed'];
  const searchTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];

  const startTime = new Date().getTime();
  const response = http.get(`${API_BASE}/search?q=${searchTerm}`, params);
  const endTime = new Date().getTime();

  apiLatency.add(endTime - startTime);

  const success = check(response, {
    'search - status is 200': (r) => r.status === 200,
    'search - returns array': (r) => Array.isArray(r.json()),
    'search - response time < 1.5s': (r) => r.timings.duration < 1500,
  });

  failureRate.add(!success);
}

function getItemDetails() {
  // First get a random item ID from the inventory
  const listResponse = http.get(`${API_BASE}/items?limit=1&offset=${Math.floor(Math.random() * 100)}`, {
    headers: generateAuthHeaders(),
  });

  if (listResponse.status === 200 && listResponse.json().items.length > 0) {
    const itemId = listResponse.json().items[0].id;

    const params = {
      tags: { name: 'get_item_details' },
      headers: generateAuthHeaders(),
    };

    const startTime = new Date().getTime();
    const response = http.get(`${API_BASE}/items/${itemId}`, params);
    const endTime = new Date().getTime();

    apiLatency.add(endTime - startTime);

    const success = check(response, {
      'item details - status is 200': (r) => r.status === 200,
      'item details - has id': (r) => r.json().id === itemId,
      'item details - has required fields': (r) => {
        const item = r.json();
        return item.name && item.sku && item.category;
      },
      'item details - response time < 1s': (r) => r.timings.duration < 1000,
    });

    failureRate.add(!success);
  }
}

function createItem() {
  const itemData = generateRandomItem();

  const params = {
    tags: { name: 'create_item' },
    headers: generateAuthHeaders(),
  };

  const startTime = new Date().getTime();
  const response = http.post(`${API_BASE}/items`, JSON.stringify(itemData), params);
  const endTime = new Date().getTime();

  apiLatency.add(endTime - startTime);

  const success = check(response, {
    'create item - status is 201': (r) => r.status === 201,
    'create item - returns created item': (r) => {
      const item = r.json();
      return item.id && item.name === itemData.name && item.sku === itemData.sku;
    },
    'create item - response time < 2s': (r) => r.timings.duration < 2000,
    'create item - calculates total value': (r) => {
      const item = r.json();
      return Math.abs(item.totalValue - (itemData.quantity * itemData.unitPrice)) < 0.01;
    },
  });

  if (success) {
    itemCreations.add(1);
  }

  failureRate.add(!success);
}

function updateItem() {
  // First get a random item to update
  const listResponse = http.get(`${API_BASE}/items?limit=1&offset=${Math.floor(Math.random() * 100)}`, {
    headers: generateAuthHeaders(),
  });

  if (listResponse.status === 200 && listResponse.json().items.length > 0) {
    const item = listResponse.json().items[0];
    const updateData = {
      quantity: Math.floor(Math.random() * 100) + 1,
      unitPrice: parseFloat((Math.random() * 500 + 50).toFixed(2)),
    };

    const params = {
      tags: { name: 'update_item' },
      headers: generateAuthHeaders(),
    };

    const startTime = new Date().getTime();
    const response = http.put(`${API_BASE}/items/${item.id}`, JSON.stringify(updateData), params);
    const endTime = new Date().getTime();

    apiLatency.add(endTime - startTime);

    const success = check(response, {
      'update item - status is 200': (r) => r.status === 200,
      'update item - returns updated item': (r) => {
        const updated = r.json();
        return updated.id === item.id &&
               updated.quantity === updateData.quantity &&
               updated.unitPrice === updateData.unitPrice;
      },
      'update item - response time < 1.5s': (r) => r.timings.duration < 1500,
      'update item - recalculates total': (r) => {
        const updated = r.json();
        return Math.abs(updated.totalValue - (updateData.quantity * updateData.unitPrice)) < 0.01;
      },
    });

    if (success) {
      itemUpdates.add(1);
    }

    failureRate.add(!success);
  }
}

function getAnalytics() {
  const params = {
    tags: { name: 'get_analytics' },
    headers: generateAuthHeaders(),
  };

  const startTime = new Date().getTime();
  const response = http.get(`${API_BASE}/analytics/summary`, params);
  const endTime = new Date().getTime();

  apiLatency.add(endTime - startTime);

  const success = check(response, {
    'analytics - status is 200': (r) => r.status === 200,
    'analytics - has required metrics': (r) => {
      const data = r.json();
      return typeof data.totalItems === 'number' &&
             typeof data.totalValue === 'number' &&
             Array.isArray(data.categories);
    },
    'analytics - response time < 3s': (r) => r.timings.duration < 3000,
  });

  failureRate.add(!success);
}

function exportData() {
  const formats = ['csv', 'excel', 'pdf'];
  const format = formats[Math.floor(Math.random() * formats.length)];

  const params = {
    tags: { name: `export_${format}` },
    headers: generateAuthHeaders(),
  };

  const startTime = new Date().getTime();
  const response = http.get(`${API_BASE}/export/${format}`, params);
  const endTime = new Date().getTime();

  apiLatency.add(endTime - startTime);

  const success = check(response, {
    'export - status is 200': (r) => r.status === 200,
    'export - has content': (r) => r.body.length > 0,
    'export - response time < 10s': (r) => r.timings.duration < 10000,
    'export - correct content type': (r) => {
      const contentType = r.headers['Content-Type'] || '';
      if (format === 'csv') return contentType.includes('text/csv');
      if (format === 'excel') return contentType.includes('application/vnd.openxmlformats');
      if (format === 'pdf') return contentType.includes('application/pdf');
      return false;
    },
  });

  failureRate.add(!success);
}

function bulkOperations() {
  // Create bulk update payload
  const bulkData = {
    items: []
  };

  for (let i = 0; i < Math.floor(Math.random() * 10) + 5; i++) {
    bulkData.items.push({
      id: `bulk-test-${Math.random().toString(36).substr(2, 9)}`,
      quantity: Math.floor(Math.random() * 100) + 1,
    });
  }

  const params = {
    tags: { name: 'bulk_update' },
    headers: generateAuthHeaders(),
  };

  const startTime = new Date().getTime();
  const response = http.post(`${API_BASE}/items/bulk`, JSON.stringify(bulkData), params);
  const endTime = new Date().getTime();

  apiLatency.add(endTime - startTime);

  const success = check(response, {
    'bulk update - status is 200': (r) => r.status === 200,
    'bulk update - returns summary': (r) => {
      const result = r.json();
      return typeof result.updated === 'number' && Array.isArray(result.errors);
    },
    'bulk update - response time < 5s': (r) => r.timings.duration < 5000,
  });

  failureRate.add(!success);
}

// Stress test scenario - high intensity operations
export function stressTest() {
  const operations = [
    () => {
      // Rapid item creation
      for (let i = 0; i < 10; i++) {
        createItem();
      }
    },
    () => {
      // Multiple concurrent searches
      const searchPromises = [];
      for (let i = 0; i < 5; i++) {
        searchPromises.push(searchItems());
      }
    },
    () => {
      // Large bulk operation
      const largeData = { items: [] };
      for (let i = 0; i < 100; i++) {
        largeData.items.push({
          id: `stress-${i}`,
          quantity: Math.floor(Math.random() * 50) + 1,
        });
      }

      const response = http.post(`${API_BASE}/items/bulk`, JSON.stringify(largeData), {
        headers: generateAuthHeaders(),
        tags: { name: 'stress_bulk_update' },
      });

      check(response, {
        'stress bulk - completes': (r) => r.status < 500,
        'stress bulk - reasonable time': (r) => r.timings.duration < 30000,
      });
    },
  ];

  // Execute random stress operation
  operations[Math.floor(Math.random() * operations.length)]();

  sleep(0.1); // Minimal sleep for stress test
}

// Spike test scenario - sudden load increase
export function spikeTest() {
  // Simulate sudden spike in activity
  const concurrent = Math.floor(Math.random() * 20) + 10;

  for (let i = 0; i < concurrent; i++) {
    // Mix of heavy operations
    if (Math.random() > 0.5) {
      getAnalytics();
    } else {
      exportData();
    }
  }

  sleep(Math.random() * 2);
}

// Error handling and recovery test
export function errorRecoveryTest() {
  // Test with invalid data to trigger errors
  const invalidData = {
    name: '', // Invalid empty name
    sku: '', // Invalid empty SKU
    quantity: -1, // Invalid negative quantity
    unitPrice: -100, // Invalid negative price
  };

  const response = http.post(`${API_BASE}/items`, JSON.stringify(invalidData), {
    headers: generateAuthHeaders(),
    tags: { name: 'error_recovery' },
  });

  check(response, {
    'error handling - returns 400': (r) => r.status === 400,
    'error handling - has error details': (r) => r.json().error !== undefined,
    'error handling - response time reasonable': (r) => r.timings.duration < 2000,
  });

  // Test system recovery with valid request after error
  sleep(1);
  createItem(); // Should work normally
}

// Setup function - runs once before test execution
export function setup() {
  console.log('🚀 Starting inventory API performance tests...');
  console.log(`📊 Base URL: ${BASE_URL}`);
  console.log(`👥 Max VUs: ${options.stages[Math.max(...options.stages.map(s => s.target))]}`);

  // Verify API is accessible
  const healthCheck = http.get(`${BASE_URL}/health`);
  if (healthCheck.status !== 200) {
    throw new Error(`API health check failed: ${healthCheck.status}`);
  }

  console.log('✅ API health check passed');

  return {
    startTime: new Date(),
  };
}

// Teardown function - runs once after test execution
export function teardown(data) {
  console.log(`📈 Test completed at: ${new Date()}`);
  console.log(`⏱️  Total duration: ${(new Date() - data.startTime) / 1000}s`);

  // Cleanup test data (optional)
  const cleanupResponse = http.del(`${API_BASE}/test-data/cleanup`, {
    headers: generateAuthHeaders(),
  });

  if (cleanupResponse.status === 200) {
    console.log('🧹 Test data cleanup completed');
  }
}

// Generate HTML report
export function handleSummary(data) {
  return {
    'inventory-performance-report.html': htmlReport(data),
    'inventory-performance-summary.json': JSON.stringify(data, null, 2),
  };
}

// Additional test configurations for different scenarios
export const loadTestOptions = {
  ...options,
  stages: [
    { duration: '2m', target: 10 },
    { duration: '5m', target: 10 },
    { duration: '2m', target: 0 },
  ],
};

export const stressTestOptions = {
  ...options,
  stages: [
    { duration: '1m', target: 100 },
    { duration: '3m', target: 100 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'],
    http_req_failed: ['rate<0.1'],
  },
};

export const spikeTestOptions = {
  ...options,
  stages: [
    { duration: '1m', target: 10 },
    { duration: '30s', target: 100 }, // Sudden spike
    { duration: '1m', target: 10 },
    { duration: '30s', target: 0 },
  ],
};

export const volumeTestOptions = {
  ...options,
  stages: [
    { duration: '5m', target: 50 },
    { duration: '30m', target: 50 }, // Extended duration
    { duration: '5m', target: 0 },
  ],
};
