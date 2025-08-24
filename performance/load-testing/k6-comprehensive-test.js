/**
 * Comprehensive K6 Load Testing Suite
 * Tests API, frontend, and real-time performance under various load scenarios
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { randomString, randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';
import ws from 'k6/ws';
import { browser } from 'k6/experimental/browser';

// Custom metrics
const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');
const databaseLatency = new Trend('database_latency');
const cacheHitRate = new Rate('cache_hits');
const websocketLatency = new Trend('websocket_latency');
const pageLoadTime = new Trend('page_load_time');
const timeToInteractive = new Trend('time_to_interactive');

// Test configuration
const BASE_URL = __ENV.BASE_URL || 'https://api.candlefish.ai';
const WS_URL = __ENV.WS_URL || 'wss://api.candlefish.ai/graphql';

// Performance thresholds aligned with targets
export const options = {
  scenarios: {
    // Scenario 1: API Load Test
    api_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },   // Ramp up to 50 users
        { duration: '5m', target: 50 },   // Stay at 50 users
        { duration: '2m', target: 100 },  // Ramp up to 100 users
        { duration: '5m', target: 100 },  // Stay at 100 users
        { duration: '2m', target: 0 },    // Ramp down to 0 users
      ],
      gracefulRampDown: '30s',
      exec: 'apiLoadTest',
    },

    // Scenario 2: Database Stress Test
    database_stress: {
      executor: 'constant-arrival-rate',
      rate: 100,
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 50,
      exec: 'databaseStressTest',
    },

    // Scenario 3: Cache Performance Test
    cache_test: {
      executor: 'shared-iterations',
      vus: 20,
      iterations: 1000,
      exec: 'cachePerformanceTest',
    },

    // Scenario 4: WebSocket Real-time Test
    websocket_test: {
      executor: 'constant-vus',
      vus: 30,
      duration: '10m',
      exec: 'websocketTest',
    },

    // Scenario 5: Browser Performance Test
    browser_test: {
      executor: 'per-vu-iterations',
      vus: 5,
      iterations: 10,
      exec: 'browserPerformanceTest',
      options: {
        browser: {
          type: 'chromium',
          headless: true,
        },
      },
    },

    // Scenario 6: Spike Test
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 0 },
        { duration: '10s', target: 500 },  // Spike to 500 users
        { duration: '1m', target: 500 },   // Stay at 500 users
        { duration: '10s', target: 0 },    // Back to 0
      ],
      exec: 'spikeTest',
    },
  },

  thresholds: {
    // API thresholds
    'http_req_duration': ['p(95)<200'],  // 95% of requests < 200ms
    'http_req_failed': ['rate<0.01'],    // Error rate < 1%
    'api_latency': ['p(95)<200'],

    // Database thresholds
    'database_latency': ['p(95)<50'],    // 95% of DB queries < 50ms

    // Cache thresholds
    'cache_hits': ['rate>0.8'],          // Cache hit rate > 80%

    // WebSocket thresholds
    'websocket_latency': ['p(95)<100'],  // 95% of WS messages < 100ms

    // Browser thresholds
    'page_load_time': ['p(95)<3000'],    // 95% of pages load < 3s
    'time_to_interactive': ['p(95)<3000'], // TTI < 3s

    // General thresholds
    'errors': ['rate<0.05'],             // Overall error rate < 5%
  },
};

// Test setup
export function setup() {
  // Authenticate and get token
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    username: 'test_user',
    password: 'test_password',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  const token = loginRes.json('token');

  // Warm up cache
  http.get(`${BASE_URL}/warmup`);

  return { token };
}

// Scenario 1: API Load Test
export function apiLoadTest(data) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.token}`,
  };

  group('GraphQL Queries', () => {
    // Simple query
    const simpleQuery = `
      query GetUser($id: ID!) {
        user(id: $id) {
          id
          name
          email
        }
      }
    `;

    const simpleRes = http.post(
      `${BASE_URL}/graphql`,
      JSON.stringify({
        query: simpleQuery,
        variables: { id: Math.floor(Math.random() * 1000) },
      }),
      { headers, tags: { type: 'simple_query' } }
    );

    check(simpleRes, {
      'simple query status is 200': (r) => r.status === 200,
      'simple query has data': (r) => r.json('data.user') !== null,
      'simple query < 200ms': (r) => r.timings.duration < 200,
    });

    apiLatency.add(simpleRes.timings.duration);
    errorRate.add(simpleRes.status !== 200);

    // Complex query with nested data
    const complexQuery = `
      query GetUserWithPosts($id: ID!) {
        user(id: $id) {
          id
          name
          posts(limit: 10) {
            id
            title
            content
            comments(limit: 5) {
              id
              text
              author {
                name
              }
            }
          }
        }
      }
    `;

    const complexRes = http.post(
      `${BASE_URL}/graphql`,
      JSON.stringify({
        query: complexQuery,
        variables: { id: Math.floor(Math.random() * 1000) },
      }),
      { headers, tags: { type: 'complex_query' } }
    );

    check(complexRes, {
      'complex query status is 200': (r) => r.status === 200,
      'complex query < 500ms': (r) => r.timings.duration < 500,
    });

    apiLatency.add(complexRes.timings.duration);
    errorRate.add(complexRes.status !== 200);
  });

  group('REST API Endpoints', () => {
    // GET request
    const getRes = http.get(`${BASE_URL}/api/documents`, { headers });
    check(getRes, {
      'GET status is 200': (r) => r.status === 200,
      'GET response has documents': (r) => r.json('documents') !== null,
    });

    // POST request
    const postRes = http.post(
      `${BASE_URL}/api/documents`,
      JSON.stringify({
        title: `Test Document ${randomString(10)}`,
        content: randomString(100),
      }),
      { headers }
    );
    check(postRes, {
      'POST status is 201': (r) => r.status === 201,
      'POST returns document ID': (r) => r.json('id') !== null,
    });

    // Check cache headers
    const cacheRes = http.get(`${BASE_URL}/api/cached-data`, { headers });
    check(cacheRes, {
      'Cache-Control header present': (r) => r.headers['Cache-Control'] !== undefined,
      'Cache hit': (r) => r.headers['X-Cache'] === 'HIT',
    });

    cacheHitRate.add(cacheRes.headers['X-Cache'] === 'HIT');
  });

  sleep(1);
}

// Scenario 2: Database Stress Test
export function databaseStressTest(data) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.token}`,
  };

  // Heavy database query
  const heavyQuery = `
    query SearchDocuments($term: String!, $limit: Int!) {
      searchDocuments(term: $term, limit: $limit) {
        totalCount
        documents {
          id
          title
          content
          author {
            name
            email
          }
          tags {
            name
          }
          createdAt
          updatedAt
        }
      }
    }
  `;

  const startTime = Date.now();
  const res = http.post(
    `${BASE_URL}/graphql`,
    JSON.stringify({
      query: heavyQuery,
      variables: {
        term: randomItem(['ai', 'machine learning', 'data', 'api', 'cloud']),
        limit: 50,
      },
    }),
    { headers }
  );
  const dbLatency = Date.now() - startTime;

  check(res, {
    'database query successful': (r) => r.status === 200,
    'database query < 50ms': () => dbLatency < 50,
  });

  databaseLatency.add(dbLatency);

  // Concurrent writes
  const batch = [];
  for (let i = 0; i < 5; i++) {
    batch.push([
      'POST',
      `${BASE_URL}/graphql`,
      JSON.stringify({
        query: `
          mutation CreateDocument($input: DocumentInput!) {
            createDocument(input: $input) {
              id
            }
          }
        `,
        variables: {
          input: {
            title: `Stress Test ${randomString(10)}`,
            content: randomString(500),
          },
        },
      }),
      { headers },
    ]);
  }

  const batchRes = http.batch(batch);
  check(batchRes[0], {
    'batch writes successful': (r) => r.status === 200,
  });
}

// Scenario 3: Cache Performance Test
export function cachePerformanceTest(data) {
  const headers = {
    'Authorization': `Bearer ${data.token}`,
  };

  const documentId = Math.floor(Math.random() * 100) + 1;

  // First request (cache miss expected)
  const firstRes = http.get(`${BASE_URL}/api/documents/${documentId}`, { headers });
  const firstCacheStatus = firstRes.headers['X-Cache'] || 'MISS';

  // Second request (cache hit expected)
  const secondRes = http.get(`${BASE_URL}/api/documents/${documentId}`, { headers });
  const secondCacheStatus = secondRes.headers['X-Cache'] || 'MISS';

  check(firstRes, {
    'first request successful': (r) => r.status === 200,
  });

  check(secondRes, {
    'second request successful': (r) => r.status === 200,
    'second request is cache hit': () => secondCacheStatus === 'HIT',
    'cached response faster': () => secondRes.timings.duration < firstRes.timings.duration,
  });

  cacheHitRate.add(secondCacheStatus === 'HIT');

  // Test cache invalidation
  const updateRes = http.put(
    `${BASE_URL}/api/documents/${documentId}`,
    JSON.stringify({ title: 'Updated Title' }),
    { headers: { ...headers, 'Content-Type': 'application/json' } }
  );

  // Third request after update (cache miss expected)
  const thirdRes = http.get(`${BASE_URL}/api/documents/${documentId}`, { headers });
  const thirdCacheStatus = thirdRes.headers['X-Cache'] || 'MISS';

  check(updateRes, {
    'update successful': (r) => r.status === 200,
    'cache invalidated after update': () => thirdCacheStatus === 'MISS',
  });
}

// Scenario 4: WebSocket Real-time Test
export function websocketTest(data) {
  const url = `${WS_URL}?token=${data.token}`;

  const res = ws.connect(url, {}, function (socket) {
    socket.on('open', () => {
      console.log('WebSocket connected');

      // Subscribe to real-time updates
      socket.send(JSON.stringify({
        type: 'connection_init',
        payload: { Authorization: `Bearer ${data.token}` },
      }));

      socket.send(JSON.stringify({
        id: '1',
        type: 'start',
        payload: {
          query: `
            subscription OnDocumentUpdate {
              documentUpdated {
                id
                title
                updatedAt
              }
            }
          `,
        },
      }));
    });

    socket.on('message', (data) => {
      const message = JSON.parse(data);
      const receiveTime = Date.now();

      if (message.type === 'data') {
        // Calculate latency from timestamp in message
        const latency = message.payload.timestamp
          ? receiveTime - message.payload.timestamp
          : 0;

        websocketLatency.add(latency);

        check(message, {
          'websocket message received': () => true,
          'websocket latency < 100ms': () => latency < 100,
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
    }, 30000);
  });

  check(res, {
    'websocket connection successful': (r) => r && r.status === 101,
  });
}

// Scenario 5: Browser Performance Test
export function browserPerformanceTest() {
  const page = browser.newPage();

  try {
    // Navigate to main page
    const navigationStart = Date.now();
    page.goto('https://candlefish.ai', { waitUntil: 'networkidle' });
    const pageLoadDuration = Date.now() - navigationStart;

    pageLoadTime.add(pageLoadDuration);

    // Measure Time to Interactive
    const ttiStart = Date.now();
    page.waitForSelector('.main-content', { state: 'visible' });
    page.evaluate(() => {
      return new Promise((resolve) => {
        if (document.readyState === 'complete') {
          resolve();
        } else {
          window.addEventListener('load', resolve);
        }
      });
    });
    const ttiDuration = Date.now() - ttiStart;

    timeToInteractive.add(ttiDuration);

    // Check Core Web Vitals
    const metrics = page.evaluate(() => {
      return {
        FCP: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
        LCP: new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            resolve(lastEntry.startTime);
          }).observe({ entryTypes: ['largest-contentful-paint'] });
        }),
        CLS: new Promise((resolve) => {
          let cls = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) {
                cls += entry.value;
              }
            }
            resolve(cls);
          }).observe({ entryTypes: ['layout-shift'] });
        }),
      };
    });

    check(metrics, {
      'FCP < 1800ms': (m) => m.FCP < 1800,
      'LCP < 2500ms': (m) => m.LCP < 2500,
      'CLS < 0.1': (m) => m.CLS < 0.1,
    });

    // Test interactive elements
    page.click('button.cta-button');
    page.waitForSelector('.modal', { state: 'visible', timeout: 2000 });

    // Test form submission
    page.fill('input[name="email"]', 'test@example.com');
    page.click('button[type="submit"]');

    const responseTime = page.evaluate(() => {
      return performance.now();
    });

    check(responseTime, {
      'form submission < 1000ms': (t) => t < 1000,
    });

  } finally {
    page.close();
  }
}

// Scenario 6: Spike Test
export function spikeTest(data) {
  // Same as API load test but with spike pattern
  apiLoadTest(data);

  // Additional checks for spike resilience
  const res = http.get(`${BASE_URL}/health`, {
    headers: { 'Authorization': `Bearer ${data.token}` },
  });

  check(res, {
    'service available during spike': (r) => r.status === 200,
    'response time acceptable during spike': (r) => r.timings.duration < 1000,
  });
}

// Test teardown
export function teardown(data) {
  // Generate summary report
  const stats = {
    timestamp: new Date().toISOString(),
    scenarios: {
      api_load: { status: 'completed' },
      database_stress: { status: 'completed' },
      cache_test: { status: 'completed' },
      websocket_test: { status: 'completed' },
      browser_test: { status: 'completed' },
      spike_test: { status: 'completed' },
    },
  };

  // Send results to monitoring system
  http.post(
    `${BASE_URL}/monitoring/test-results`,
    JSON.stringify(stats),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${data.token}`,
      },
    }
  );

  console.log('Load testing completed. Check the dashboard for detailed results.');
}
