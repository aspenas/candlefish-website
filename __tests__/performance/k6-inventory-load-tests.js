// k6 Performance Tests for Inventory Management API
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomIntBetween, randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const errorRate = new Rate('errors');
const apiResponseTime = new Trend('api_response_time');
const successfulRequests = new Counter('successful_requests');
const failedRequests = new Counter('failed_requests');

// Test configuration
export const options = {
  stages: [
    // Ramp up
    { duration: '2m', target: 20 },   // Simulate ramp-up of 20 users over 2 minutes
    { duration: '5m', target: 20 },   // Stay at 20 users for 5 minutes
    { duration: '2m', target: 50 },   // Bump up to 50 users over 2 minutes
    { duration: '5m', target: 50 },   // Stay at 50 users for 5 minutes
    { duration: '2m', target: 100 },  // Ramp up to 100 users over 2 minutes
    { duration: '5m', target: 100 },  // Stay at 100 users for 5 minutes
    { duration: '5m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    // API response time should be below 500ms for 95% of requests
    'http_req_duration': ['p(95)<500'],
    // Error rate should be below 1%
    'errors': ['rate<0.01'],
    // 99% of requests should complete within 1 second
    'http_req_duration{name:GetItems}': ['p(99)<1000'],
    // Search requests should be fast
    'http_req_duration{name:SearchItems}': ['p(95)<300'],
  },
};

// Test data generators
const categories = ['Furniture', 'Lighting', 'Art / Decor', 'Electronics', 'Rug / Carpet'];
const decisions = ['Keep', 'Sell', 'Donate', 'Unsure'];
const rooms = ['Living Room', 'Master Bedroom', 'Kitchen', 'Dining Room', 'Office'];

function generateRandomItem() {
  return {
    room_id: `room-${randomIntBetween(1, 5)}`,
    name: `Test Item ${randomIntBetween(1, 10000)}`,
    description: `Generated test item for performance testing`,
    category: randomItem(categories),
    decision: randomItem(decisions),
    purchase_price: randomIntBetween(10, 5000),
    asking_price: randomIntBetween(5, 4000),
    quantity: randomIntBetween(1, 10),
    is_fixture: Math.random() > 0.8,
    source: 'Performance Test Store',
    condition: 'Good',
  };
}

function generateSearchQueries() {
  const queries = [
    'lamp', 'sofa', 'table', 'chair', 'art', 'rug',
    'furniture', 'lighting', 'decor', 'electronics',
    'vintage', 'modern', 'antique', 'wood', 'metal'
  ];
  return randomItem(queries);
}

// Base URL configuration
const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:8080';
const API_VERSION = '/api/v1';

// Authentication helper
function getAuthHeaders() {
  // In a real scenario, you might need to authenticate first
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${__ENV.API_TOKEN || 'test-token'}`,
  };
}

export function setup() {
  // Setup phase - create test rooms if needed
  const setupData = {
    rooms: [],
    items: []
  };

  console.log('Setting up test data...');

  // Create test rooms
  for (let i = 1; i <= 5; i++) {
    const room = {
      name: `Test Room ${i}`,
      floor: i <= 2 ? 'Main Floor' : 'Upper Floor',
      description: `Test room ${i} for performance testing`,
    };

    const response = http.post(
      `${BASE_URL}${API_VERSION}/rooms`,
      JSON.stringify(room),
      { headers: getAuthHeaders() }
    );

    if (response.status === 201) {
      const createdRoom = JSON.parse(response.body);
      setupData.rooms.push(createdRoom);
      console.log(`Created room: ${createdRoom.name} (${createdRoom.id})`);
    }
  }

  // Create some initial test items
  setupData.rooms.forEach((room, index) => {
    for (let i = 0; i < 10; i++) {
      const item = {
        ...generateRandomItem(),
        room_id: room.id,
        name: `Initial Item ${index}-${i}`,
      };

      const response = http.post(
        `${BASE_URL}${API_VERSION}/items`,
        JSON.stringify(item),
        { headers: getAuthHeaders() }
      );

      if (response.status === 201) {
        const createdItem = JSON.parse(response.body);
        setupData.items.push(createdItem);
      }
    }
  });

  console.log(`Setup complete: ${setupData.rooms.length} rooms, ${setupData.items.length} items`);
  return setupData;
}

export default function (data) {
  // Weighted test scenarios
  const scenario = Math.random();

  if (scenario < 0.4) {
    // 40% - Read operations (most common)
    testReadOperations(data);
  } else if (scenario < 0.6) {
    // 20% - Search operations
    testSearchOperations(data);
  } else if (scenario < 0.8) {
    // 20% - Create/Update operations
    testWriteOperations(data);
  } else if (scenario < 0.95) {
    // 15% - Analytics/Reporting operations
    testAnalyticsOperations(data);
  } else {
    // 5% - Heavy operations (bulk updates, exports)
    testHeavyOperations(data);
  }

  // Random sleep between 1-3 seconds to simulate user think time
  sleep(randomIntBetween(1, 3));
}

function testReadOperations(data) {
  const scenarios = [
    // Get all items
    () => {
      const response = http.get(
        `${BASE_URL}${API_VERSION}/items`,
        {
          headers: getAuthHeaders(),
          tags: { name: 'GetItems' }
        }
      );
      return checkResponse(response, 'Get Items');
    },

    // Get items with pagination
    () => {
      const limit = randomIntBetween(10, 50);
      const offset = randomIntBetween(0, 100);
      const response = http.get(
        `${BASE_URL}${API_VERSION}/items?limit=${limit}&offset=${offset}`,
        {
          headers: getAuthHeaders(),
          tags: { name: 'GetItemsPaginated' }
        }
      );
      return checkResponse(response, 'Get Items Paginated');
    },

    // Get specific item
    () => {
      if (data.items.length > 0) {
        const item = randomItem(data.items);
        const response = http.get(
          `${BASE_URL}${API_VERSION}/items/${item.id}`,
          {
            headers: getAuthHeaders(),
            tags: { name: 'GetItem' }
          }
        );
        return checkResponse(response, 'Get Item by ID');
      }
    },

    // Get rooms
    () => {
      const response = http.get(
        `${BASE_URL}${API_VERSION}/rooms`,
        {
          headers: getAuthHeaders(),
          tags: { name: 'GetRooms' }
        }
      );
      return checkResponse(response, 'Get Rooms');
    },

    // Get room items
    () => {
      if (data.rooms.length > 0) {
        const room = randomItem(data.rooms);
        const response = http.get(
          `${BASE_URL}${API_VERSION}/rooms/${room.id}/items`,
          {
            headers: getAuthHeaders(),
            tags: { name: 'GetRoomItems' }
          }
        );
        return checkResponse(response, 'Get Room Items');
      }
    },
  ];

  const scenario = randomItem(scenarios);
  scenario();
}

function testSearchOperations(data) {
  const scenarios = [
    // Text search
    () => {
      const query = generateSearchQueries();
      const response = http.get(
        `${BASE_URL}${API_VERSION}/search?q=${encodeURIComponent(query)}`,
        {
          headers: getAuthHeaders(),
          tags: { name: 'SearchItems' }
        }
      );
      return checkResponse(response, 'Search Items');
    },

    // Category filter
    () => {
      const category = randomItem(categories);
      const response = http.get(
        `${BASE_URL}${API_VERSION}/items?categories=${encodeURIComponent(category)}`,
        {
          headers: getAuthHeaders(),
          tags: { name: 'FilterByCategory' }
        }
      );
      return checkResponse(response, 'Filter by Category');
    },

    // Decision filter
    () => {
      const decision = randomItem(decisions);
      const response = http.get(
        `${BASE_URL}${API_VERSION}/items?decisions=${encodeURIComponent(decision)}`,
        {
          headers: getAuthHeaders(),
          tags: { name: 'FilterByDecision' }
        }
      );
      return checkResponse(response, 'Filter by Decision');
    },

    // Price range filter
    () => {
      const minPrice = randomIntBetween(0, 1000);
      const maxPrice = randomIntBetween(1000, 5000);
      const response = http.get(
        `${BASE_URL}${API_VERSION}/items?minValue=${minPrice}&maxValue=${maxPrice}`,
        {
          headers: getAuthHeaders(),
          tags: { name: 'FilterByPrice' }
        }
      );
      return checkResponse(response, 'Filter by Price Range');
    },

    // Combined filters
    () => {
      const category = randomItem(categories);
      const decision = randomItem(decisions);
      const response = http.get(
        `${BASE_URL}${API_VERSION}/items?categories=${category}&decisions=${decision}`,
        {
          headers: getAuthHeaders(),
          tags: { name: 'CombinedFilters' }
        }
      );
      return checkResponse(response, 'Combined Filters');
    },
  ];

  const scenario = randomItem(scenarios);
  scenario();
}

function testWriteOperations(data) {
  const scenarios = [
    // Create item
    () => {
      if (data.rooms.length > 0) {
        const room = randomItem(data.rooms);
        const item = {
          ...generateRandomItem(),
          room_id: room.id,
        };

        const response = http.post(
          `${BASE_URL}${API_VERSION}/items`,
          JSON.stringify(item),
          {
            headers: getAuthHeaders(),
            tags: { name: 'CreateItem' }
          }
        );

        if (checkResponse(response, 'Create Item', 201)) {
          const createdItem = JSON.parse(response.body);
          data.items.push(createdItem);
        }
      }
    },

    // Update item
    () => {
      if (data.items.length > 0) {
        const item = randomItem(data.items);
        const updates = {
          decision: randomItem(decisions),
          purchase_price: randomIntBetween(10, 5000),
          asking_price: randomIntBetween(5, 4000),
        };

        const response = http.put(
          `${BASE_URL}${API_VERSION}/items/${item.id}`,
          JSON.stringify(updates),
          {
            headers: getAuthHeaders(),
            tags: { name: 'UpdateItem' }
          }
        );
        return checkResponse(response, 'Update Item');
      }
    },

    // Bulk update items
    () => {
      if (data.items.length >= 5) {
        const selectedItems = data.items
          .sort(() => 0.5 - Math.random())
          .slice(0, randomIntBetween(2, 5));

        const updates = {
          itemIds: selectedItems.map(item => item.id),
          decision: randomItem(decisions),
        };

        const response = http.put(
          `${BASE_URL}${API_VERSION}/items/bulk-update`,
          JSON.stringify(updates),
          {
            headers: getAuthHeaders(),
            tags: { name: 'BulkUpdateItems' }
          }
        );
        return checkResponse(response, 'Bulk Update Items');
      }
    },

    // Create room
    () => {
      const room = {
        name: `Performance Test Room ${randomIntBetween(1000, 9999)}`,
        floor: Math.random() > 0.5 ? 'Main Floor' : 'Upper Floor',
        description: 'Room created during performance testing',
      };

      const response = http.post(
        `${BASE_URL}${API_VERSION}/rooms`,
        JSON.stringify(room),
        {
          headers: getAuthHeaders(),
          tags: { name: 'CreateRoom' }
        }
      );

      if (checkResponse(response, 'Create Room', 201)) {
        const createdRoom = JSON.parse(response.body);
        data.rooms.push(createdRoom);
      }
    },
  ];

  const scenario = randomItem(scenarios);
  scenario();
}

function testAnalyticsOperations(data) {
  const scenarios = [
    // Get inventory summary
    () => {
      const response = http.get(
        `${BASE_URL}${API_VERSION}/summary`,
        {
          headers: getAuthHeaders(),
          tags: { name: 'GetSummary' }
        }
      );
      return checkResponse(response, 'Get Inventory Summary');
    },

    // Get room analytics
    () => {
      const response = http.get(
        `${BASE_URL}${API_VERSION}/analytics/rooms`,
        {
          headers: getAuthHeaders(),
          tags: { name: 'GetRoomAnalytics' }
        }
      );
      return checkResponse(response, 'Get Room Analytics');
    },

    // Get category analytics
    () => {
      const response = http.get(
        `${BASE_URL}${API_VERSION}/analytics/categories`,
        {
          headers: getAuthHeaders(),
          tags: { name: 'GetCategoryAnalytics' }
        }
      );
      return checkResponse(response, 'Get Category Analytics');
    },

    // Get recent activities
    () => {
      const limit = randomIntBetween(10, 50);
      const response = http.get(
        `${BASE_URL}${API_VERSION}/activities?limit=${limit}`,
        {
          headers: getAuthHeaders(),
          tags: { name: 'GetActivities' }
        }
      );
      return checkResponse(response, 'Get Recent Activities');
    },
  ];

  const scenario = randomItem(scenarios);
  scenario();
}

function testHeavyOperations(data) {
  const scenarios = [
    // Export Excel
    () => {
      const response = http.get(
        `${BASE_URL}${API_VERSION}/export/excel`,
        {
          headers: getAuthHeaders(),
          tags: { name: 'ExportExcel' }
        }
      );
      return checkResponse(response, 'Export Excel');
    },

    // Export CSV
    () => {
      const response = http.get(
        `${BASE_URL}${API_VERSION}/export/csv`,
        {
          headers: getAuthHeaders(),
          tags: { name: 'ExportCSV' }
        }
      );
      return checkResponse(response, 'Export CSV');
    },

    // Bulk create items
    () => {
      if (data.rooms.length > 0) {
        const room = randomItem(data.rooms);
        const items = Array.from({ length: randomIntBetween(5, 20) }, (_, i) => ({
          ...generateRandomItem(),
          room_id: room.id,
          name: `Bulk Item ${Date.now()}-${i}`,
        }));

        const response = http.post(
          `${BASE_URL}${API_VERSION}/items/bulk`,
          JSON.stringify({ items }),
          {
            headers: getAuthHeaders(),
            tags: { name: 'BulkCreateItems' }
          }
        );

        if (checkResponse(response, 'Bulk Create Items', 201)) {
          const result = JSON.parse(response.body);
          if (result.items) {
            data.items.push(...result.items);
          }
        }
      }
    },

    // Complex search with sorting and filtering
    () => {
      const query = generateSearchQueries();
      const category = randomItem(categories);
      const sortBy = randomItem(['name', 'purchase_price', 'created_at']);
      const sortOrder = randomItem(['asc', 'desc']);

      const response = http.get(
        `${BASE_URL}${API_VERSION}/items?q=${query}&categories=${category}&sort_by=${sortBy}&sort_order=${sortOrder}&limit=100`,
        {
          headers: getAuthHeaders(),
          tags: { name: 'ComplexSearch' }
        }
      );
      return checkResponse(response, 'Complex Search');
    },
  ];

  const scenario = randomItem(scenarios);
  scenario();
}

function checkResponse(response, operationName, expectedStatus = 200) {
  const success = response.status === expectedStatus;

  // Record metrics
  apiResponseTime.add(response.timings.duration);

  if (success) {
    successfulRequests.add(1);
  } else {
    failedRequests.add(1);
    console.error(`${operationName} failed: ${response.status} - ${response.body}`);
  }

  // Check response
  const result = check(response, {
    [`${operationName} - Status ${expectedStatus}`]: (r) => r.status === expectedStatus,
    [`${operationName} - Response time < 2s`]: (r) => r.timings.duration < 2000,
  });

  errorRate.add(!result);
  return result;
}

export function teardown(data) {
  console.log('Cleaning up test data...');

  // Delete test items (optional cleanup)
  let deletedItems = 0;
  data.items.forEach(item => {
    if (item.name && item.name.includes('Performance') || item.name.includes('Bulk')) {
      const response = http.del(
        `${BASE_URL}${API_VERSION}/items/${item.id}`,
        null,
        { headers: getAuthHeaders() }
      );

      if (response.status === 200 || response.status === 204) {
        deletedItems++;
      }
    }
  });

  // Delete test rooms (optional cleanup)
  let deletedRooms = 0;
  data.rooms.forEach(room => {
    if (room.name && room.name.includes('Performance Test')) {
      const response = http.del(
        `${BASE_URL}${API_VERSION}/rooms/${room.id}`,
        null,
        { headers: getAuthHeaders() }
      );

      if (response.status === 200 || response.status === 204) {
        deletedRooms++;
      }
    }
  });

  console.log(`Cleanup complete: ${deletedItems} items, ${deletedRooms} rooms deleted`);
}

// Alternative test configurations for different scenarios

// Smoke test configuration
export const smokeTestOptions = {
  stages: [
    { duration: '30s', target: 5 },
    { duration: '1m', target: 5 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    'http_req_duration': ['p(95)<1000'],
    'errors': ['rate<0.05'],
  },
};

// Load test configuration
export const loadTestOptions = {
  stages: [
    { duration: '5m', target: 100 },  // Ramp up to 100 users
    { duration: '10m', target: 100 }, // Stay at 100 users
    { duration: '5m', target: 0 },    // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<800'],
    'errors': ['rate<0.02'],
  },
};

// Stress test configuration
export const stressTestOptions = {
  stages: [
    { duration: '5m', target: 200 },  // Ramp up to 200 users
    { duration: '10m', target: 200 }, // Stay at 200 users
    { duration: '5m', target: 300 },  // Ramp up to 300 users
    { duration: '10m', target: 300 }, // Stay at 300 users
    { duration: '5m', target: 0 },    // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<1500'],
    'errors': ['rate<0.05'],
  },
};

// Spike test configuration
export const spikeTestOptions = {
  stages: [
    { duration: '1m', target: 10 },   // Baseline
    { duration: '30s', target: 200 }, // Sudden spike
    { duration: '1m', target: 200 },  // Stay at spike
    { duration: '30s', target: 10 },  // Return to baseline
    { duration: '1m', target: 10 },   // Stay at baseline
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<2000'],
    'errors': ['rate<0.10'],
  },
};
