import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics for stress testing
const errorRate = new Rate('stress_error_rate');
const connectionErrors = new Counter('connection_errors');
const timeoutErrors = new Counter('timeout_errors');
const serverErrors = new Counter('server_errors');
const peakResponseTime = new Trend('peak_response_time');

// Stress test configuration
export const options = {
  stages: [
    // Gradual ramp-up to identify breaking point
    { duration: '2m', target: 100 },   // Normal load
    { duration: '5m', target: 200 },   // Above normal load
    { duration: '2m', target: 400 },   // High load
    { duration: '5m', target: 600 },   // Very high load
    { duration: '2m', target: 800 },   // Extreme load
    { duration: '5m', target: 1000 },  // Peak load
    { duration: '2m', target: 1200 },  // Beyond capacity
    { duration: '5m', target: 1200 },  // Sustain peak stress

    // Gradual ramp-down to test recovery
    { duration: '5m', target: 800 },
    { duration: '5m', target: 400 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 0 },
  ],

  thresholds: {
    // More lenient thresholds for stress testing
    http_req_duration: ['p(95)<2000'], // 95% under 2s during stress
    http_req_failed: ['rate<0.1'],     // Up to 10% failure rate acceptable
    stress_error_rate: ['rate<0.15'],  // Custom error threshold
    connection_errors: ['count<100'],   // Limit connection errors
  },

  // Disable default thresholds that might be too strict for stress testing
  noConnectionReuse: false,
  userAgent: 'K6-StressTest/1.0',
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const API_URL = `${BASE_URL}/api`;
const GRAPHQL_URL = `${BASE_URL}/graphql`;

// Authentication token (assume pre-authenticated for stress test)
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'stress-test-token';

function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`,
  };
}

// Heavy GraphQL operations for stress testing
const HEAVY_QUERIES = {
  // Complex document query with nested relations
  COMPLEX_DOCUMENTS: `
    query GetComplexDocuments($organizationId: ID!, $limit: Int!) {
      documents(organizationId: $organizationId, limit: $limit) {
        id
        title
        content
        status
        author {
          id
          name
          email
          profile {
            avatar
            bio
          }
        }
        collaborators {
          id
          name
          role
        }
        comments {
          id
          content
          author {
            name
          }
          replies {
            id
            content
            author {
              name
            }
          }
        }
        versions {
          id
          timestamp
          changes
        }
        permissions {
          userId
          level
        }
        analytics {
          views
          edits
          shares
        }
        createdAt
        updatedAt
      }
    }
  `,

  // Resource-intensive search
  FULL_TEXT_SEARCH: `
    query FullTextSearch($organizationId: ID!, $query: String!, $limit: Int!) {
      searchDocuments(organizationId: $organizationId, query: $query, limit: $limit) {
        id
        title
        content
        highlights
        score
        author {
          name
        }
        tags
        category
        relatedDocuments {
          id
          title
          similarity
        }
      }

      searchUsers(organizationId: $organizationId, query: $query) {
        id
        name
        email
        recentDocuments {
          id
          title
        }
      }

      searchComments(organizationId: $organizationId, query: $query) {
        id
        content
        document {
          title
        }
        author {
          name
        }
      }
    }
  `,

  // Analytics aggregation query
  ANALYTICS_DASHBOARD: `
    query GetAnalyticsDashboard($organizationId: ID!, $dateRange: DateRangeInput!) {
      organizationAnalytics(organizationId: $organizationId, dateRange: $dateRange) {
        documentStats {
          total
          created
          updated
          deleted
          byStatus {
            draft
            review
            published
            archived
          }
          byAuthor {
            userId
            count
          }
        }

        userActivity {
          activeUsers
          sessionDuration
          actionsPerSession
          topContributors {
            userId
            name
            contributionScore
          }
        }

        collaborationStats {
          documentsWithCollaboration
          averageCollaborators
          commentsPerDocument
          realTimeSessionDuration
        }

        performanceMetrics {
          averageLoadTime
          searchResponseTime
          apiResponseTime
          errorRate
        }

        storageStats {
          totalSize
          documentsSize
          attachmentsSize
          availableSpace
        }

        trends {
          daily {
            date
            documents
            users
            activity
          }
          weekly {
            week
            growth
            engagement
          }
        }
      }
    }
  `
};

function makeStressRequest(query, variables, description) {
  const startTime = Date.now();

  const response = http.post(
    GRAPHQL_URL,
    JSON.stringify({ query, variables }),
    {
      headers: getAuthHeaders(),
      timeout: '30s', // Longer timeout for stress testing
    }
  );

  const responseTime = Date.now() - startTime;
  peakResponseTime.add(responseTime);

  // Track different types of errors
  if (response.status === 0) {
    connectionErrors.add(1);
    errorRate.add(1);
  } else if (response.status >= 500) {
    serverErrors.add(1);
    errorRate.add(1);
  } else if (response.timings && response.timings.duration > 30000) {
    timeoutErrors.add(1);
    errorRate.add(1);
  }

  const success = check(response, {
    [`${description} - status check`]: (r) => r.status === 200,
    [`${description} - response time`]: (r) => r.timings.duration < 30000,
    [`${description} - has data`]: (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data !== null && body.data !== undefined;
      } catch {
        return false;
      }
    },
  });

  if (!success) {
    errorRate.add(1);
  }

  return response;
}

export default function () {
  // Randomly select stress test scenario
  const scenario = randomIntBetween(1, 4);

  switch (scenario) {
    case 1:
      // Heavy document loading
      group('Heavy Document Loading', () => {
        makeStressRequest(
          HEAVY_QUERIES.COMPLEX_DOCUMENTS,
          {
            organizationId: 'stress-test-org',
            limit: 50, // Large batch
          },
          'Complex Documents Query'
        );
      });
      break;

    case 2:
      // Intensive search operations
      group('Intensive Search', () => {
        const searchTerms = ['stress', 'test', 'document', 'content', 'data', 'query'];
        const searchTerm = searchTerms[randomIntBetween(0, searchTerms.length - 1)];

        makeStressRequest(
          HEAVY_QUERIES.FULL_TEXT_SEARCH,
          {
            organizationId: 'stress-test-org',
            query: searchTerm,
            limit: 25,
          },
          'Full Text Search'
        );
      });
      break;

    case 3:
      // Analytics dashboard (CPU intensive)
      group('Analytics Dashboard', () => {
        makeStressRequest(
          HEAVY_QUERIES.ANALYTICS_DASHBOARD,
          {
            organizationId: 'stress-test-org',
            dateRange: {
              startDate: '2024-01-01',
              endDate: '2024-12-31',
            },
          },
          'Analytics Dashboard'
        );
      });
      break;

    case 4:
      // Rapid-fire document operations
      group('Rapid Document Operations', () => {
        // Create multiple documents rapidly
        for (let i = 0; i < 3; i++) {
          const createMutation = `
            mutation CreateStressDocument($input: CreateDocumentInput!) {
              createDocument(input: $input) {
                id
                title
                content
                status
                author {
                  id
                  name
                }
              }
            }
          `;

          makeStressRequest(
            createMutation,
            {
              input: {
                title: `Stress Test Document ${Date.now()}-${i}`,
                content: `Large content block: ${'x'.repeat(1000)}`, // 1KB of content
                organizationId: 'stress-test-org',
                status: 'DRAFT',
              },
            },
            `Rapid Document Creation ${i + 1}`
          );

          // No sleep between operations to maximize stress
        }
      });
      break;
  }

  // Minimal sleep to maintain constant pressure
  sleep(randomIntBetween(0.1, 0.5));
}

// Setup for stress test
export function setup() {
  console.log('🚨 STARTING STRESS TEST 🚨');
  console.log(`Target: ${BASE_URL}`);
  console.log('This test will push the system to its limits!');

  // Verify system is ready
  const healthCheck = http.get(`${API_URL}/health`, {
    timeout: '10s',
  });

  console.log(`Health check status: ${healthCheck.status}`);

  if (healthCheck.status !== 200) {
    console.warn('⚠️  System may not be healthy before stress test!');
  }

  return {
    startTime: Date.now(),
    initialHealth: healthCheck.status === 200,
  };
}

// Teardown and analysis
export function teardown(data) {
  const duration = Date.now() - data.startTime;
  console.log('\n🏁 STRESS TEST COMPLETED');
  console.log(`Duration: ${Math.round(duration / 1000)}s`);

  // Final health check
  const finalHealthCheck = http.get(`${API_URL}/health`, {
    timeout: '10s',
  });

  console.log(`Final health check: ${finalHealthCheck.status}`);

  if (finalHealthCheck.status !== 200) {
    console.error('🔴 System appears unhealthy after stress test!');
  } else {
    console.log('✅ System recovered successfully');
  }
}

// Custom summary for stress test
export function handleSummary(data) {
  const metrics = data.metrics;

  const summary = {
    test_type: 'stress_test',
    duration: data.state.testRunDurationMs,
    total_requests: metrics.http_reqs?.count || 0,
    failed_requests: metrics.http_req_failed?.values || 0,
    error_rate: (metrics.stress_error_rate?.rate || 0) * 100,

    response_times: {
      avg: Math.round(metrics.http_req_duration?.avg || 0),
      p50: Math.round(metrics['http_req_duration{expected_response:true}']?.p50 || 0),
      p95: Math.round(metrics['http_req_duration{expected_response:true}']?.p95 || 0),
      p99: Math.round(metrics['http_req_duration{expected_response:true}']?.p99 || 0),
      max: Math.round(metrics.http_req_duration?.max || 0),
    },

    peak_metrics: {
      peak_response_time_avg: Math.round(metrics.peak_response_time?.avg || 0),
      peak_response_time_max: Math.round(metrics.peak_response_time?.max || 0),
    },

    error_breakdown: {
      connection_errors: metrics.connection_errors?.count || 0,
      timeout_errors: metrics.timeout_errors?.count || 0,
      server_errors: metrics.server_errors?.count || 0,
    },

    thresholds: data.thresholds || {},

    recommendations: generateRecommendations(metrics),
  };

  return {
    'stress-test-results.json': JSON.stringify(summary, null, 2),
    stdout: generateStressTestReport(summary),
  };
}

function generateRecommendations(metrics) {
  const recommendations = [];

  const errorRate = (metrics.stress_error_rate?.rate || 0) * 100;
  const avgResponseTime = metrics.http_req_duration?.avg || 0;
  const p95ResponseTime = metrics['http_req_duration{expected_response:true}']?.p95 || 0;

  if (errorRate > 15) {
    recommendations.push('🔴 CRITICAL: Error rate exceeded 15% - investigate server capacity and error handling');
  } else if (errorRate > 5) {
    recommendations.push('🟡 WARNING: Error rate above 5% - consider scaling resources');
  }

  if (avgResponseTime > 2000) {
    recommendations.push('🔴 CRITICAL: Average response time exceeded 2s - urgent performance optimization needed');
  } else if (avgResponseTime > 1000) {
    recommendations.push('🟡 WARNING: Response times degrading - consider performance tuning');
  }

  if (p95ResponseTime > 5000) {
    recommendations.push('🔴 CRITICAL: 95th percentile response time exceeded 5s - system under severe stress');
  }

  const connectionErrors = metrics.connection_errors?.count || 0;
  if (connectionErrors > 50) {
    recommendations.push('🔴 CRITICAL: High connection errors - check network and connection pooling');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ System performed well under stress - good resilience');
  }

  return recommendations;
}

function generateStressTestReport(summary) {
  return `
╔══════════════════════════════════════════════════════════════════╗
║                           STRESS TEST REPORT                     ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  📊 PERFORMANCE METRICS                                          ║
║  Total Requests: ${summary.total_requests.toLocaleString().padStart(10)}                                    ║
║  Failed Requests: ${summary.failed_requests.toLocaleString().padStart(9)}                                     ║
║  Error Rate: ${summary.error_rate.toFixed(2).padStart(13)}%                                    ║
║                                                                  ║
║  ⏱️  RESPONSE TIMES                                              ║
║  Average: ${summary.response_times.avg.toLocaleString().padStart(12)}ms                                    ║
║  50th Percentile: ${summary.response_times.p50.toLocaleString().padStart(7)}ms                                    ║
║  95th Percentile: ${summary.response_times.p95.toLocaleString().padStart(7)}ms                                    ║
║  99th Percentile: ${summary.response_times.p99.toLocaleString().padStart(7)}ms                                    ║
║  Maximum: ${summary.response_times.max.toLocaleString().padStart(12)}ms                                    ║
║                                                                  ║
║  🚨 ERROR BREAKDOWN                                              ║
║  Connection Errors: ${summary.error_breakdown.connection_errors.toString().padStart(6)}                              ║
║  Timeout Errors: ${summary.error_breakdown.timeout_errors.toString().padStart(9)}                              ║
║  Server Errors: ${summary.error_breakdown.server_errors.toString().padStart(10)}                              ║
║                                                                  ║
║  📈 RECOMMENDATIONS                                              ║
${summary.recommendations.map(rec => `║  ${rec.padEnd(64)} ║`).join('\n')}
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
`;
}
