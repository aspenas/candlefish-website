/**
 * K6 Load Testing Script for Item Valuation and Pricing System
 * Simulates realistic user behavior and tests performance under load
 */

import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { randomItem, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const WS_URL = __ENV.WS_URL || 'ws://localhost:8080';

// Custom metrics
const apiResponseTime = new Trend('api_response_time');
const valuationResponseTime = new Trend('valuation_response_time');
const graphqlResponseTime = new Trend('graphql_response_time');
const websocketLatency = new Trend('websocket_latency');
const cacheHitRate = new Rate('cache_hit_rate');
const errorRate = new Rate('error_rate');
const valuationCreated = new Counter('valuations_created');
const concurrentUsers = new Gauge('concurrent_users');

// Test scenarios
export const options = {
  scenarios: {
    // Smoke test - verify system works
    smoke: {
      executor: 'constant-vus',
      vus: 2,
      duration: '1m',
      tags: { scenario: 'smoke' },
      env: { SCENARIO: 'smoke' },
    },
    
    // Load test - normal expected load
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },  // Ramp up to 50 users
        { duration: '5m', target: 50 },  // Stay at 50 users
        { duration: '2m', target: 100 }, // Ramp up to 100 users
        { duration: '5m', target: 100 }, // Stay at 100 users
        { duration: '2m', target: 0 },   // Ramp down to 0 users
      ],
      gracefulRampDown: '30s',
      tags: { scenario: 'load' },
      env: { SCENARIO: 'load' },
    },
    
    // Stress test - beyond normal load
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '5m', target: 200 },
        { duration: '2m', target: 300 },
        { duration: '5m', target: 300 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '30s',
      tags: { scenario: 'stress' },
      env: { SCENARIO: 'stress' },
    },
    
    // Spike test - sudden traffic spike
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 100 },
        { duration: '1m', target: 100 },
        { duration: '10s', target: 500 },
        { duration: '3m', target: 500 },
        { duration: '10s', target: 100 },
        { duration: '3m', target: 100 },
        { duration: '10s', target: 0 },
      ],
      gracefulRampDown: '30s',
      tags: { scenario: 'spike' },
      env: { SCENARIO: 'spike' },
    },
    
    // Soak test - sustained load over time
    soak: {
      executor: 'constant-vus',
      vus: 100,
      duration: '30m',
      tags: { scenario: 'soak' },
      env: { SCENARIO: 'soak' },
    },
  },
  
  thresholds: {
    // API response time thresholds
    'http_req_duration': ['p(95)<200', 'p(99)<500'],
    'api_response_time': ['p(95)<150', 'p(99)<300'],
    'valuation_response_time': ['p(95)<300', 'p(99)<500'],
    'graphql_response_time': ['p(95)<200', 'p(99)<400'],
    
    // WebSocket thresholds
    'websocket_latency': ['p(95)<50', 'p(99)<100'],
    
    // Error rate thresholds
    'http_req_failed': ['rate<0.1'], // Less than 10% errors
    'error_rate': ['rate<0.05'], // Less than 5% errors
    
    // Cache performance
    'cache_hit_rate': ['rate>0.8'], // At least 80% cache hit rate
  },
};

// Test data
const testItems = generateTestItems(100);
const testRooms = ['living-room', 'bedroom', 'kitchen', 'office', 'garage'];
const testCategories = ['furniture', 'electronics', 'art', 'lighting', 'decor'];

// Main test function
export default function () {
  const scenario = __ENV.SCENARIO || 'load';
  
  // Update concurrent users metric
  concurrentUsers.add(__VU);
  
  // Run different test groups based on scenario
  group('API Tests', () => {
    testBasicAPI();
    testValuationAPI();
    testImageUpload();
  });
  
  group('GraphQL Tests', () => {
    testGraphQLQueries();
    testGraphQLMutations();
    testGraphQLSubscriptions();
  });
  
  group('WebSocket Tests', () => {
    testWebSocketConnection();
  });
  
  group('Cache Tests', () => {
    testCachePerformance();
  });
  
  // Simulate think time between operations
  sleep(randomIntBetween(1, 3));
}

/**
 * Test basic API endpoints
 */
function testBasicAPI() {
  // Get all items
  let response = http.get(`${BASE_URL}/api/v1/items`, {
    tags: { name: 'GetItems' },
  });
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
  
  apiResponseTime.add(response.timings.duration);
  errorRate.add(response.status !== 200);
  
  // Get specific item
  const itemId = randomItem(testItems).id;
  response = http.get(`${BASE_URL}/api/v1/items/${itemId}`, {
    tags: { name: 'GetItem' },
  });
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'has item data': (r) => JSON.parse(r.body).id === itemId,
  });
  
  // Search items
  const searchQuery = randomItem(testCategories);
  response = http.get(`${BASE_URL}/api/v1/search?q=${searchQuery}`, {
    tags: { name: 'SearchItems' },
  });
  
  check(response, {
    'search successful': (r) => r.status === 200,
    'has results': (r) => JSON.parse(r.body).results.length > 0,
  });
}

/**
 * Test valuation API endpoints
 */
function testValuationAPI() {
  const itemId = randomItem(testItems).id;
  
  // Get current valuation
  let response = http.get(`${BASE_URL}/api/v1/valuations/${itemId}/current`, {
    tags: { name: 'GetCurrentValuation' },
  });
  
  const isCacheHit = response.headers['X-Cache'] === 'HIT';
  cacheHitRate.add(isCacheHit);
  
  check(response, {
    'valuation retrieved': (r) => r.status === 200,
    'has valuation data': (r) => JSON.parse(r.body).estimated_value > 0,
  });
  
  valuationResponseTime.add(response.timings.duration);
  
  // Create new valuation
  const valuationData = {
    item_id: itemId,
    method: 'market_lookup',
    estimated_value: randomIntBetween(100, 10000),
    confidence_score: Math.random(),
  };
  
  response = http.post(
    `${BASE_URL}/api/v1/valuations`,
    JSON.stringify(valuationData),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'CreateValuation' },
    }
  );
  
  check(response, {
    'valuation created': (r) => r.status === 201,
  });
  
  if (response.status === 201) {
    valuationCreated.add(1);
  }
  
  // Get pricing insights
  response = http.get(`${BASE_URL}/api/v1/pricing-insights`, {
    tags: { name: 'GetPricingInsights' },
  });
  
  check(response, {
    'insights retrieved': (r) => r.status === 200,
    'has room summaries': (r) => JSON.parse(r.body).room_summaries.length > 0,
  });
}

/**
 * Test image upload and processing
 */
function testImageUpload() {
  const itemId = randomItem(testItems).id;
  
  // Create form data with dummy image
  const formData = {
    file: http.file(generateDummyImage(), 'test.jpg', 'image/jpeg'),
    item_id: itemId,
  };
  
  const response = http.post(
    `${BASE_URL}/api/v1/items/${itemId}/photos`,
    formData,
    {
      tags: { name: 'UploadPhoto' },
    }
  );
  
  check(response, {
    'photo uploaded': (r) => r.status === 201,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}

/**
 * Test GraphQL queries
 */
function testGraphQLQueries() {
  // Get valuation with all related data
  const query = `
    query GetValuation($itemId: ID!) {
      valuation(itemId: $itemId) {
        currentValuation {
          estimatedValue
          confidenceScore
          valuationDate
        }
        priceHistory {
          price
          effectiveDate
        }
        marketComparisons {
          source
          price
          similarityScore
        }
      }
    }
  `;
  
  const variables = {
    itemId: randomItem(testItems).id,
  };
  
  const response = http.post(
    `${BASE_URL}/graphql`,
    JSON.stringify({ query, variables }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'GraphQLQuery' },
    }
  );
  
  check(response, {
    'graphql query successful': (r) => r.status === 200,
    'no graphql errors': (r) => !JSON.parse(r.body).errors,
  });
  
  graphqlResponseTime.add(response.timings.duration);
  
  // Batch query test
  const batchQuery = `
    query BatchValuations($itemIds: [ID!]!) {
      multipleValuations(itemIds: $itemIds) {
        itemId
        estimatedValue
        confidenceScore
      }
    }
  `;
  
  const batchVariables = {
    itemIds: testItems.slice(0, 10).map(item => item.id),
  };
  
  const batchResponse = http.post(
    `${BASE_URL}/graphql`,
    JSON.stringify({ query: batchQuery, variables: batchVariables }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'GraphQLBatchQuery' },
    }
  );
  
  check(batchResponse, {
    'batch query successful': (r) => r.status === 200,
    'returns multiple results': (r) => JSON.parse(r.body).data.multipleValuations.length === 10,
  });
}

/**
 * Test GraphQL mutations
 */
function testGraphQLMutations() {
  const mutation = `
    mutation CreateValuation($input: ValuationInput!) {
      createValuation(input: $input) {
        id
        estimatedValue
        confidenceScore
      }
    }
  `;
  
  const variables = {
    input: {
      itemId: randomItem(testItems).id,
      method: 'DEPRECIATION_MODEL',
      value: randomIntBetween(500, 5000),
      confidence: Math.random(),
    },
  };
  
  const response = http.post(
    `${BASE_URL}/graphql`,
    JSON.stringify({ query: mutation, variables }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'GraphQLMutation' },
    }
  );
  
  check(response, {
    'mutation successful': (r) => r.status === 200,
    'valuation created': (r) => JSON.parse(r.body).data.createValuation.id,
  });
}

/**
 * Test GraphQL subscriptions via WebSocket
 */
function testGraphQLSubscriptions() {
  const itemId = randomItem(testItems).id;
  
  ws.connect(`${WS_URL}/graphql`, null, (socket) => {
    socket.on('open', () => {
      // Subscribe to valuation updates
      socket.send(JSON.stringify({
        type: 'start',
        payload: {
          query: `
            subscription ValuationUpdates($itemId: ID!) {
              valuationCreated(itemId: $itemId) {
                id
                estimatedValue
              }
            }
          `,
          variables: { itemId },
        },
      }));
    });
    
    socket.on('message', (data) => {
      const message = JSON.parse(data);
      check(message, {
        'subscription message received': () => message.type === 'data',
      });
    });
    
    socket.setTimeout(() => {
      socket.close();
    }, 5000);
  });
}

/**
 * Test WebSocket connections
 */
function testWebSocketConnection() {
  const startTime = Date.now();
  
  ws.connect(`${WS_URL}/ws`, null, (socket) => {
    socket.on('open', () => {
      // Join room
      socket.send(JSON.stringify({
        type: 'join_room',
        room: randomItem(testRooms),
      }));
      
      // Send test message
      socket.send(JSON.stringify({
        type: 'broadcast',
        data: {
          message: 'Test message',
          timestamp: Date.now(),
        },
      }));
    });
    
    socket.on('message', (data) => {
      const latency = Date.now() - startTime;
      websocketLatency.add(latency);
      
      check(data, {
        'websocket message received': () => data.length > 0,
        'latency < 50ms': () => latency < 50,
      });
    });
    
    socket.on('error', (e) => {
      errorRate.add(1);
    });
    
    socket.setTimeout(() => {
      socket.close();
    }, 10000);
  });
}

/**
 * Test cache performance
 */
function testCachePerformance() {
  const itemId = randomItem(testItems).id;
  
  // First request (cache miss)
  let response1 = http.get(`${BASE_URL}/api/v1/valuations/${itemId}/current`, {
    tags: { name: 'CacheMiss' },
  });
  
  const isCacheMiss = response1.headers['X-Cache'] !== 'HIT';
  
  // Second request (should be cache hit)
  let response2 = http.get(`${BASE_URL}/api/v1/valuations/${itemId}/current`, {
    tags: { name: 'CacheHit' },
  });
  
  const isCacheHit = response2.headers['X-Cache'] === 'HIT';
  
  check(response2, {
    'cache hit on second request': () => isCacheHit,
    'faster response on cache hit': () => response2.timings.duration < response1.timings.duration,
  });
  
  cacheHitRate.add(isCacheHit);
  
  // Test cache invalidation
  const updateResponse = http.put(
    `${BASE_URL}/api/v1/items/${itemId}`,
    JSON.stringify({ asking_price: randomIntBetween(1000, 5000) }),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'CacheInvalidation' },
    }
  );
  
  // Third request (should be cache miss after invalidation)
  let response3 = http.get(`${BASE_URL}/api/v1/valuations/${itemId}/current`, {
    tags: { name: 'CacheMissAfterInvalidation' },
  });
  
  check(response3, {
    'cache invalidated after update': () => response3.headers['X-Cache'] !== 'HIT',
  });
}

/**
 * Helper function to generate test items
 */
function generateTestItems(count) {
  const items = [];
  for (let i = 0; i < count; i++) {
    items.push({
      id: `item-${i}`,
      name: `Test Item ${i}`,
      category: randomItem(testCategories),
      room_id: randomItem(testRooms),
      purchase_price: randomIntBetween(100, 10000),
    });
  }
  return items;
}

/**
 * Generate dummy image data
 */
function generateDummyImage() {
  // Create a simple 1x1 pixel PNG
  const pngData = new Uint8Array([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
    0x54, 0x08, 0x99, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
    0x00, 0x00, 0x03, 0x00, 0x01, 0x5B, 0x84, 0x34,
    0x61, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
    0x44, 0xAE, 0x42, 0x60, 0x82
  ]);
  
  return pngData.buffer;
}

/**
 * Setup function - run once per VU
 */
export function setup() {
  console.log('Starting load test...');
  console.log(`Target URL: ${BASE_URL}`);
  console.log(`WebSocket URL: ${WS_URL}`);
  
  // Warm up cache
  for (let i = 0; i < 10; i++) {
    http.get(`${BASE_URL}/api/v1/items`);
  }
  
  return { startTime: Date.now() };
}

/**
 * Teardown function - run once per test
 */
export function teardown(data) {
  const duration = Date.now() - data.startTime;
  console.log(`Test completed in ${duration}ms`);
}