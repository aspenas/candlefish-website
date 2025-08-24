/**
 * k6 Load Testing Script for Candlefish AI Platform
 *
 * This script performs comprehensive load testing including:
 * - Baseline performance testing
 * - Load testing with gradual ramp-up
 * - Stress testing to find breaking points
 * - Spike testing for sudden traffic
 * - Soak testing for memory leaks
 *
 * Usage:
 *   k6 run k6-load-test.js
 *   k6 run --stage baseline k6-load-test.js
 *   k6 run --out cloud k6-load-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiTrend = new Trend('api_response_time');
const docsTrend = new Trend('docs_response_time');
const graphqlTrend = new Trend('graphql_response_time');
const requestCounter = new Counter('total_requests');
const activeUsers = new Gauge('active_users');

// Test configuration
const DOCS_URL = 'https://docs.candlefish.ai';
const API_URL = 'https://api.candlefish.ai';
const GRAPHQL_ENDPOINT = `${API_URL}/graphql`;

// Test scenarios
export const options = {
  scenarios: {
    // Baseline test - normal traffic
    baseline: {
      executor: 'constant-vus',
      vus: 10,
      duration: '2m',
      startTime: '0s',
      tags: { scenario: 'baseline' },
    },

    // Load test - gradual increase
    load_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },   // Ramp up to 50 users
        { duration: '5m', target: 50 },   // Stay at 50 users
        { duration: '2m', target: 100 },  // Ramp up to 100 users
        { duration: '5m', target: 100 },  // Stay at 100 users
        { duration: '2m', target: 0 },    // Ramp down to 0
      ],
      startTime: '2m',
      tags: { scenario: 'load' },
    },

    // Stress test - find breaking point
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 200 },  // Ramp up to 200 users
        { duration: '3m', target: 200 },  // Stay at 200
        { duration: '2m', target: 500 },  // Ramp up to 500 users
        { duration: '3m', target: 500 },  // Stay at 500
        { duration: '2m', target: 1000 }, // Push to 1000 users
        { duration: '3m', target: 1000 }, // Stay at 1000
        { duration: '5m', target: 0 },    // Ramp down
      ],
      startTime: '18m',
      tags: { scenario: 'stress' },
    },

    // Spike test - sudden traffic surge
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 500 }, // Spike to 500 users
        { duration: '1m', target: 500 },  // Hold the spike
        { duration: '10s', target: 0 },   // Quick ramp down
      ],
      startTime: '38m',
      tags: { scenario: 'spike' },
    },

    // Soak test - extended duration for memory leaks
    soak_test: {
      executor: 'constant-vus',
      vus: 50,
      duration: '10m',
      startTime: '40m',
      tags: { scenario: 'soak' },
    },
  },

  // Global thresholds
  thresholds: {
    // Response time thresholds
    http_req_duration: [
      'p(50)<200',   // 50% of requests should be below 200ms
      'p(95)<500',   // 95% of requests should be below 500ms
      'p(99)<1000',  // 99% of requests should be below 1000ms
    ],

    // Error rate threshold
    http_req_failed: ['rate<0.05'], // Error rate should be below 5%
    errors: ['rate<0.05'],

    // Custom metric thresholds
    api_response_time: ['p(95)<300'],
    docs_response_time: ['p(95)<400'],
    graphql_response_time: ['p(95)<500'],
  },
};

// GraphQL queries to test
const GRAPHQL_QUERIES = [
  {
    name: 'simple',
    query: '{ __typename }',
  },
  {
    name: 'documents',
    query: `{
      documents(first: 10) {
        edges {
          node {
            id
            title
            content
            createdAt
            updatedAt
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }`,
  },
  {
    name: 'complex',
    query: `{
      documents(first: 20) {
        edges {
          node {
            id
            title
            content
            author {
              id
              name
              email
            }
            tags {
              id
              name
            }
            comments(first: 5) {
              edges {
                node {
                  id
                  content
                  author {
                    name
                  }
                }
              }
            }
          }
        }
      }
      users(first: 10) {
        edges {
          node {
            id
            name
            documents {
              totalCount
            }
          }
        }
      }
    }`,
  },
];

// Helper function to make GraphQL request
function graphqlRequest(query) {
  const payload = JSON.stringify({ query: query.query });
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: {
      name: `graphql_${query.name}`,
    },
  };

  const response = http.post(GRAPHQL_ENDPOINT, payload, params);
  graphqlTrend.add(response.timings.duration);

  return response;
}

// User behavior simulation
export default function() {
  const scenario = __ENV.scenario || 'mixed';
  activeUsers.add(__VU);

  // Documentation site browsing
  let response = http.get(DOCS_URL, { tags: { name: 'docs_home' } });
  docsTrend.add(response.timings.duration);
  requestCounter.add(1);

  check(response, {
    'docs status is 200': (r) => r.status === 200,
    'docs response time < 500ms': (r) => r.timings.duration < 500,
    'docs has content': (r) => r.body.length > 0,
  }) || errorRate.add(1);

  sleep(Math.random() * 2 + 1); // Random think time 1-3s

  // API endpoint testing
  response = http.get(API_URL, { tags: { name: 'api_home' } });
  apiTrend.add(response.timings.duration);
  requestCounter.add(1);

  check(response, {
    'api status is 200': (r) => r.status === 200,
    'api response time < 300ms': (r) => r.timings.duration < 300,
  }) || errorRate.add(1);

  sleep(Math.random() * 2 + 1);

  // GraphQL query testing (randomly select a query)
  const query = GRAPHQL_QUERIES[Math.floor(Math.random() * GRAPHQL_QUERIES.length)];
  response = graphqlRequest(query);
  requestCounter.add(1);

  check(response, {
    'graphql status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'graphql response time < 500ms': (r) => r.timings.duration < 500,
    'graphql has valid JSON': (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch {
        return false;
      }
    },
  }) || errorRate.add(1);

  sleep(Math.random() * 3 + 2); // Random think time 2-5s

  // Simulate navigation through documentation
  if (Math.random() > 0.5) {
    const docPages = [
      '/getting-started',
      '/api-reference',
      '/guides',
      '/tutorials',
      '/examples',
    ];

    const page = docPages[Math.floor(Math.random() * docPages.length)];
    response = http.get(`${DOCS_URL}${page}`, { tags: { name: `docs_${page}` } });
    docsTrend.add(response.timings.duration);
    requestCounter.add(1);

    check(response, {
      'doc page loads': (r) => r.status === 200 || r.status === 404,
      'doc page response < 1000ms': (r) => r.timings.duration < 1000,
    }) || errorRate.add(1);

    sleep(Math.random() * 5 + 3); // Reading time 3-8s
  }

  // Simulate API interaction
  if (Math.random() > 0.3) {
    // Simulate authentication
    const authPayload = JSON.stringify({
      username: `user_${__VU}_${__ITER}`,
      password: 'test_password',
    });

    response = http.post(`${API_URL}/auth/login`, authPayload, {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'api_auth' },
    });
    apiTrend.add(response.timings.duration);
    requestCounter.add(1);

    // Check auth response (expecting 404 or similar since endpoint might not exist)
    check(response, {
      'auth attempt made': (r) => r.status < 500,
    }) || errorRate.add(1);
  }

  activeUsers.add(-1);
}

// Handle test lifecycle
export function setup() {
  console.log('🚀 Starting Candlefish AI Load Test');
  console.log(`📊 Testing ${DOCS_URL} and ${API_URL}`);

  // Warm up the servers
  http.get(DOCS_URL);
  http.get(API_URL);

  return {
    startTime: new Date().toISOString(),
  };
}

export function teardown(data) {
  console.log(`\n✅ Load test completed at ${new Date().toISOString()}`);
  console.log(`⏱️  Total duration: ${new Date() - new Date(data.startTime)}ms`);
}

// Custom summary generation
export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    metrics: {
      total_requests: data.metrics.total_requests?.values?.count || 0,
      error_rate: data.metrics.errors?.values?.rate || 0,
      avg_response_time: data.metrics.http_req_duration?.values?.avg || 0,
      p95_response_time: data.metrics.http_req_duration?.values['p(95)'] || 0,
      p99_response_time: data.metrics.http_req_duration?.values['p(99)'] || 0,
      docs_p95: data.metrics.docs_response_time?.values['p(95)'] || 0,
      api_p95: data.metrics.api_response_time?.values['p(95)'] || 0,
      graphql_p95: data.metrics.graphql_response_time?.values['p(95)'] || 0,
    },
    thresholds: data.root_group?.checks || [],
  };

  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'performance-results.json': JSON.stringify(summary, null, 2),
  };
}

// Helper to generate text summary
function textSummary(data, options) {
  let summary = '\n📊 PERFORMANCE TEST RESULTS\n';
  summary += '═'.repeat(50) + '\n\n';

  // Overall metrics
  summary += '📈 Overall Performance:\n';
  summary += `   Total Requests: ${data.metrics.total_requests?.values?.count || 0}\n`;
  summary += `   Error Rate: ${((data.metrics.errors?.values?.rate || 0) * 100).toFixed(2)}%\n`;
  summary += `   Avg Response: ${(data.metrics.http_req_duration?.values?.avg || 0).toFixed(2)}ms\n`;
  summary += `   P95 Response: ${(data.metrics.http_req_duration?.values['p(95)'] || 0).toFixed(2)}ms\n`;
  summary += `   P99 Response: ${(data.metrics.http_req_duration?.values['p(99)'] || 0).toFixed(2)}ms\n`;

  summary += '\n🎯 Service-Specific Metrics:\n';
  summary += `   Docs P95: ${(data.metrics.docs_response_time?.values['p(95)'] || 0).toFixed(2)}ms\n`;
  summary += `   API P95: ${(data.metrics.api_response_time?.values['p(95)'] || 0).toFixed(2)}ms\n`;
  summary += `   GraphQL P95: ${(data.metrics.graphql_response_time?.values['p(95)'] || 0).toFixed(2)}ms\n`;

  // Threshold results
  summary += '\n✅ Threshold Results:\n';
  Object.entries(data.metrics).forEach(([key, metric]) => {
    if (metric.thresholds) {
      Object.entries(metric.thresholds).forEach(([threshold, passed]) => {
        const icon = passed ? '✅' : '❌';
        summary += `   ${icon} ${key}: ${threshold}\n`;
      });
    }
  });

  summary += '\n' + '═'.repeat(50) + '\n';

  return summary;
}
