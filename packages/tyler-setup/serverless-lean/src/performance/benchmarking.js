/**
 * GraphQL Performance Benchmarking Suite
 * Comprehensive testing for 1000+ concurrent users
 */

import { performance } from 'perf_hooks';
import { Worker } from 'worker_threads';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Performance test configurations
 */
const TEST_CONFIGS = {
  // Load test scenarios
  scenarios: {
    light: { users: 50, duration: 60000, rampUp: 10000 },
    moderate: { users: 200, duration: 120000, rampUp: 20000 },
    heavy: { users: 500, duration: 300000, rampUp: 30000 },
    stress: { users: 1000, duration: 600000, rampUp: 60000 },
    spike: { users: 2000, duration: 300000, rampUp: 5000 },
  },

  // Query patterns to test
  queries: {
    simple: {
      name: 'Simple User Query',
      complexity: 5,
      query: `
        query GetMe {
          me {
            id
            name
            email
            role
          }
        }
      `,
    },

    nested: {
      name: 'Nested User with Audit Logs',
      complexity: 45,
      query: `
        query GetUserWithAuditLogs($userId: ID!, $first: Int = 10) {
          user(id: $userId) {
            id
            name
            email
            role
            auditLogs(first: $first) {
              edges {
                node {
                  id
                  action
                  timestamp
                  details
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        }
      `,
    },

    complex: {
      name: 'Complex Dashboard Query',
      complexity: 120,
      query: `
        query DashboardData($first: Int = 20) {
          users(first: 5) {
            edges {
              node {
                id
                name
                email
                role
                contractorsInvited(first: 3) {
                  edges {
                    node {
                      id
                      name
                      company
                      status
                    }
                  }
                }
              }
            }
          }

          auditLogs(first: $first) {
            edges {
              node {
                id
                action
                timestamp
                user {
                  name
                }
              }
            }
            pageInfo {
              hasNextPage
            }
          }

          performanceMetrics {
            queryCount
            avgExecutionTime
            cacheStats {
              hits
              misses
              hitRatio
            }
          }
        }
      `,
    },

    pagination: {
      name: 'Large Pagination Query',
      complexity: 60,
      query: `
        query PaginatedUsers($first: Int!, $after: String) {
          users(
            first: $first
            after: $after
            filter: { isActive: true }
            orderBy: "createdAt"
            sortOrder: DESC
          ) {
            edges {
              node {
                id
                name
                email
                role
                createdAt
                auditLogs(first: 1) {
                  edges {
                    node {
                      action
                      timestamp
                    }
                  }
                }
              }
              cursor
            }
            pageInfo {
              hasNextPage
              endCursor
            }
            totalCount
          }
        }
      `,
    },

    mutation: {
      name: 'User Creation Mutation',
      complexity: 35,
      query: `
        mutation CreateTestUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
            name
            email
            role
            createdAt
          }
        }
      `,
    },
  },

  // Performance thresholds
  thresholds: {
    p50: 100,   // 50th percentile < 100ms
    p95: 500,   // 95th percentile < 500ms
    p99: 1000,  // 99th percentile < 1000ms
    errorRate: 0.1, // < 0.1% error rate
    throughput: 100, // > 100 RPS
  },
};

/**
 * Performance test runner
 */
export class PerformanceTester {
  constructor(graphqlEndpoint, authToken) {
    this.endpoint = graphqlEndpoint;
    this.authToken = authToken;
    this.results = [];
    this.workers = [];
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [],
      errors: [],
      throughput: 0,
    };
  }

  /**
   * Run performance benchmark
   */
  async runBenchmark(scenario = 'moderate', queries = ['simple', 'nested', 'complex']) {
    console.log(`Starting performance benchmark: ${scenario}`);
    console.log(`Queries: ${queries.join(', ')}`);

    const config = TEST_CONFIGS.scenarios[scenario];
    const startTime = performance.now();

    try {
      // Warm up
      await this.warmUp();

      // Run load test
      const results = await this.runLoadTest(config, queries);

      // Analyze results
      const analysis = this.analyzeResults(results);

      // Generate report
      const report = this.generateReport(scenario, analysis);

      // Save results
      await this.saveResults(scenario, report);

      console.log(`Benchmark completed in ${Math.round(performance.now() - startTime)}ms`);
      return report;
    } catch (error) {
      console.error('Benchmark failed:', error);
      throw error;
    }
  }

  /**
   * Warm up the system
   */
  async warmUp() {
    console.log('Warming up system...');

    const warmupPromises = [];
    for (let i = 0; i < 10; i++) {
      warmupPromises.push(
        this.executeQuery(TEST_CONFIGS.queries.simple.query)
      );
    }

    await Promise.all(warmupPromises);
    console.log('Warmup completed');
  }

  /**
   * Run load test with multiple concurrent users
   */
  async runLoadTest(config, queryNames) {
    const { users, duration, rampUp } = config;
    const userPromises = [];

    console.log(`Ramping up ${users} virtual users over ${rampUp}ms`);

    for (let i = 0; i < users; i++) {
      // Stagger user start times for gradual ramp-up
      const delay = (i / users) * rampUp;

      const userPromise = new Promise(resolve => {
        setTimeout(async () => {
          const userResults = await this.simulateUser(duration - delay, queryNames);
          resolve(userResults);
        }, delay);
      });

      userPromises.push(userPromise);
    }

    console.log(`Running load test for ${duration}ms`);
    const allResults = await Promise.all(userPromises);

    return allResults.flat();
  }

  /**
   * Simulate single user behavior
   */
  async simulateUser(duration, queryNames) {
    const startTime = performance.now();
    const userResults = [];
    let requestCount = 0;

    while (performance.now() - startTime < duration) {
      try {
        // Choose random query
        const queryName = queryNames[Math.floor(Math.random() * queryNames.length)];
        const queryConfig = TEST_CONFIGS.queries[queryName];

        // Generate variables if needed
        const variables = this.generateQueryVariables(queryName);

        // Execute query and measure performance
        const result = await this.executeQuery(queryConfig.query, variables);

        userResults.push({
          queryName,
          responseTime: result.responseTime,
          success: result.success,
          error: result.error,
          complexity: queryConfig.complexity,
          timestamp: Date.now(),
        });

        requestCount++;

        // Add realistic delay between requests (100-1000ms)
        await this.delay(100 + Math.random() * 900);
      } catch (error) {
        userResults.push({
          queryName: 'unknown',
          responseTime: 0,
          success: false,
          error: error.message,
          timestamp: Date.now(),
        });
      }
    }

    return userResults;
  }

  /**
   * Execute GraphQL query
   */
  async executeQuery(query, variables = {}) {
    const startTime = performance.now();

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`,
        },
        body: JSON.stringify({ query, variables }),
      });

      const responseTime = performance.now() - startTime;
      const data = await response.json();

      if (data.errors && data.errors.length > 0) {
        throw new Error(data.errors[0].message);
      }

      return {
        success: true,
        responseTime,
        data: data.data,
        error: null,
      };
    } catch (error) {
      const responseTime = performance.now() - startTime;
      return {
        success: false,
        responseTime,
        data: null,
        error: error.message,
      };
    }
  }

  /**
   * Generate variables for different query types
   */
  generateQueryVariables(queryName) {
    switch (queryName) {
      case 'nested':
        return {
          userId: 'test-user-id',
          first: Math.floor(Math.random() * 20) + 5,
        };

      case 'pagination':
        return {
          first: Math.floor(Math.random() * 50) + 10,
          after: Math.random() > 0.7 ? 'sample-cursor' : undefined,
        };

      case 'mutation':
        return {
          input: {
            name: `Test User ${Math.floor(Math.random() * 10000)}`,
            email: `test${Math.floor(Math.random() * 10000)}@example.com`,
            password: 'test-password-123',
            role: 'USER',
          },
        };

      default:
        return {};
    }
  }

  /**
   * Analyze benchmark results
   */
  analyzeResults(results) {
    const responseTimes = results
      .filter(r => r.success)
      .map(r => r.responseTime)
      .sort((a, b) => a - b);

    const errors = results.filter(r => !r.success);
    const totalRequests = results.length;
    const successfulRequests = results.filter(r => r.success).length;

    // Calculate percentiles
    const getPercentile = (arr, p) => {
      const index = Math.ceil((p / 100) * arr.length) - 1;
      return arr[index] || 0;
    };

    const analysis = {
      totalRequests,
      successfulRequests,
      failedRequests: errors.length,
      errorRate: (errors.length / totalRequests) * 100,

      responseTime: {
        min: Math.min(...responseTimes) || 0,
        max: Math.max(...responseTimes) || 0,
        mean: responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length || 0,
        p50: getPercentile(responseTimes, 50),
        p95: getPercentile(responseTimes, 95),
        p99: getPercentile(responseTimes, 99),
      },

      // Query-specific analysis
      byQuery: this.analyzeByQuery(results),

      // Error analysis
      errors: this.analyzeErrors(errors),

      // Throughput calculation
      throughput: this.calculateThroughput(results),

      // Performance score
      score: this.calculatePerformanceScore(results),
    };

    return analysis;
  }

  /**
   * Analyze results by query type
   */
  analyzeByQuery(results) {
    const byQuery = {};

    for (const result of results) {
      if (!byQuery[result.queryName]) {
        byQuery[result.queryName] = {
          count: 0,
          successful: 0,
          failed: 0,
          responseTimes: [],
        };
      }

      const queryStats = byQuery[result.queryName];
      queryStats.count++;

      if (result.success) {
        queryStats.successful++;
        queryStats.responseTimes.push(result.responseTime);
      } else {
        queryStats.failed++;
      }
    }

    // Calculate statistics for each query
    for (const queryName in byQuery) {
      const stats = byQuery[queryName];
      const times = stats.responseTimes.sort((a, b) => a - b);

      stats.errorRate = (stats.failed / stats.count) * 100;
      stats.avgResponseTime = times.reduce((sum, t) => sum + t, 0) / times.length || 0;
      stats.p95ResponseTime = times[Math.ceil(0.95 * times.length) - 1] || 0;
      stats.complexity = TEST_CONFIGS.queries[queryName]?.complexity || 0;
    }

    return byQuery;
  }

  /**
   * Analyze error patterns
   */
  analyzeErrors(errors) {
    const errorCounts = {};
    const errorsByTime = [];

    for (const error of errors) {
      const errorType = this.categorizeError(error.error);
      errorCounts[errorType] = (errorCounts[errorType] || 0) + 1;

      errorsByTime.push({
        timestamp: error.timestamp,
        type: errorType,
        message: error.error,
      });
    }

    return {
      counts: errorCounts,
      timeline: errorsByTime,
      patterns: this.detectErrorPatterns(errorsByTime),
    };
  }

  /**
   * Categorize errors for analysis
   */
  categorizeError(errorMessage) {
    if (errorMessage.includes('timeout')) return 'timeout';
    if (errorMessage.includes('rate limit')) return 'rate_limit';
    if (errorMessage.includes('complexity')) return 'complexity';
    if (errorMessage.includes('authentication')) return 'auth';
    if (errorMessage.includes('authorization')) return 'authz';
    if (errorMessage.includes('network')) return 'network';
    return 'other';
  }

  /**
   * Detect error patterns
   */
  detectErrorPatterns(errorsByTime) {
    const patterns = [];

    // Check for error spikes
    const timeWindows = this.groupErrorsByTimeWindow(errorsByTime, 10000); // 10-second windows
    const avgErrorsPerWindow = Object.values(timeWindows).reduce((sum, count) => sum + count, 0) / Object.keys(timeWindows).length;

    for (const [window, count] of Object.entries(timeWindows)) {
      if (count > avgErrorsPerWindow * 3) {
        patterns.push({
          type: 'error_spike',
          window,
          count,
          threshold: avgErrorsPerWindow * 3,
        });
      }
    }

    return patterns;
  }

  /**
   * Group errors by time window
   */
  groupErrorsByTimeWindow(errors, windowSize) {
    const windows = {};

    for (const error of errors) {
      const window = Math.floor(error.timestamp / windowSize) * windowSize;
      windows[window] = (windows[window] || 0) + 1;
    }

    return windows;
  }

  /**
   * Calculate throughput (requests per second)
   */
  calculateThroughput(results) {
    if (results.length === 0) return 0;

    const timestamps = results.map(r => r.timestamp);
    const duration = (Math.max(...timestamps) - Math.min(...timestamps)) / 1000; // seconds

    return results.length / duration;
  }

  /**
   * Calculate overall performance score (0-100)
   */
  calculatePerformanceScore(results) {
    const analysis = this.analyzeResults(results);
    let score = 100;

    // Penalize high error rates
    if (analysis.errorRate > TEST_CONFIGS.thresholds.errorRate) {
      score -= Math.min(50, analysis.errorRate * 10);
    }

    // Penalize slow response times
    if (analysis.responseTime.p95 > TEST_CONFIGS.thresholds.p95) {
      score -= Math.min(30, (analysis.responseTime.p95 - TEST_CONFIGS.thresholds.p95) / 10);
    }

    // Penalize low throughput
    if (analysis.throughput < TEST_CONFIGS.thresholds.throughput) {
      score -= Math.min(20, (TEST_CONFIGS.thresholds.throughput - analysis.throughput) / 5);
    }

    return Math.max(0, Math.round(score));
  }

  /**
   * Generate performance report
   */
  generateReport(scenario, analysis) {
    const report = {
      scenario,
      timestamp: new Date().toISOString(),
      duration: TEST_CONFIGS.scenarios[scenario].duration,
      users: TEST_CONFIGS.scenarios[scenario].users,

      summary: {
        totalRequests: analysis.totalRequests,
        successfulRequests: analysis.successfulRequests,
        errorRate: `${analysis.errorRate.toFixed(2)}%`,
        throughput: `${analysis.throughput.toFixed(1)} RPS`,
        performanceScore: `${analysis.score}/100`,
      },

      responseTime: {
        min: `${analysis.responseTime.min.toFixed(1)}ms`,
        max: `${analysis.responseTime.max.toFixed(1)}ms`,
        mean: `${analysis.responseTime.mean.toFixed(1)}ms`,
        p50: `${analysis.responseTime.p50.toFixed(1)}ms`,
        p95: `${analysis.responseTime.p95.toFixed(1)}ms`,
        p99: `${analysis.responseTime.p99.toFixed(1)}ms`,
      },

      thresholds: {
        p95: analysis.responseTime.p95 <= TEST_CONFIGS.thresholds.p95 ? 'PASS' : 'FAIL',
        errorRate: analysis.errorRate <= TEST_CONFIGS.thresholds.errorRate ? 'PASS' : 'FAIL',
        throughput: analysis.throughput >= TEST_CONFIGS.thresholds.throughput ? 'PASS' : 'FAIL',
      },

      queryPerformance: analysis.byQuery,

      errorAnalysis: analysis.errors,

      recommendations: this.generateRecommendations(analysis),
    };

    return report;
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations(analysis) {
    const recommendations = [];

    if (analysis.errorRate > 1) {
      recommendations.push({
        type: 'high_error_rate',
        priority: 'high',
        message: 'Error rate is above 1%. Check error logs and investigate root causes.',
      });
    }

    if (analysis.responseTime.p95 > 1000) {
      recommendations.push({
        type: 'slow_response_time',
        priority: 'high',
        message: 'P95 response time is above 1 second. Consider optimizing slow queries.',
      });
    }

    if (analysis.throughput < 50) {
      recommendations.push({
        type: 'low_throughput',
        priority: 'medium',
        message: 'Throughput is below 50 RPS. Check for bottlenecks in the system.',
      });
    }

    // Query-specific recommendations
    for (const [queryName, stats] of Object.entries(analysis.byQuery)) {
      if (stats.errorRate > 2) {
        recommendations.push({
          type: 'query_errors',
          priority: 'high',
          message: `Query "${queryName}" has high error rate: ${stats.errorRate.toFixed(1)}%`,
        });
      }

      if (stats.p95ResponseTime > 2000) {
        recommendations.push({
          type: 'slow_query',
          priority: 'medium',
          message: `Query "${queryName}" is slow: P95 ${stats.p95ResponseTime.toFixed(1)}ms`,
        });
      }
    }

    return recommendations;
  }

  /**
   * Save results to file
   */
  async saveResults(scenario, report) {
    const resultsDir = './performance-results';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${scenario}-${timestamp}.json`;

    try {
      mkdirSync(resultsDir, { recursive: true });
      writeFileSync(join(resultsDir, filename), JSON.stringify(report, null, 2));
      console.log(`Results saved to ${join(resultsDir, filename)}`);
    } catch (error) {
      console.error('Failed to save results:', error);
    }
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Database performance tester
 */
export class DatabasePerformanceTester {
  constructor(dynamoClient, cacheManager) {
    this.client = dynamoClient;
    this.cache = cacheManager;
  }

  /**
   * Test query performance
   */
  async testQueryPerformance() {
    const tests = [
      {
        name: 'Single Item Lookup',
        operation: () => this.client.getUser('test-user-id'),
      },
      {
        name: 'Batch Item Lookup',
        operation: () => this.client.getUsers([
          'user-1', 'user-2', 'user-3', 'user-4', 'user-5'
        ]),
      },
      {
        name: 'Paginated Query',
        operation: () => this.client.queryWithPagination(
          {
            TableName: process.env.ENTITIES_TABLE,
            IndexName: 'GSI1',
            KeyConditionExpression: 'GSI1PK = :pk',
            ExpressionAttributeValues: { ':pk': 'USER' },
          },
          null,
          20
        ),
      },
      {
        name: 'Filtered Scan',
        operation: () => this.client.client.send(new ScanCommand({
          TableName: process.env.ENTITIES_TABLE,
          FilterExpression: 'contains(#name, :search)',
          ExpressionAttributeNames: { '#name': 'name' },
          ExpressionAttributeValues: { ':search': 'test' },
          Limit: 10,
        })),
      },
    ];

    const results = [];

    for (const test of tests) {
      console.log(`Testing: ${test.name}`);

      const times = [];
      const errors = [];

      // Run test multiple times
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();

        try {
          await test.operation();
          times.push(performance.now() - startTime);
        } catch (error) {
          errors.push(error.message);
        }
      }

      results.push({
        name: test.name,
        avgTime: times.reduce((sum, t) => sum + t, 0) / times.length,
        minTime: Math.min(...times),
        maxTime: Math.max(...times),
        successRate: (times.length / 10) * 100,
        errors: errors,
      });
    }

    return results;
  }

  /**
   * Test cache performance
   */
  async testCachePerformance() {
    const cacheTests = [
      {
        name: 'Cache Miss',
        operation: async () => {
          await this.cache.delete('user', 'test-cache-user');
          return this.cache.get('user', 'test-cache-user');
        },
      },
      {
        name: 'Cache Hit',
        operation: async () => {
          await this.cache.set('user', 'test-cache-user', { id: 'test-cache-user', name: 'Test' });
          return this.cache.get('user', 'test-cache-user');
        },
      },
      {
        name: 'Cache Invalidation',
        operation: async () => {
          await this.cache.set('user', 'test-cache-user', { id: 'test-cache-user', name: 'Test' });
          return this.cache.invalidate('user');
        },
      },
    ];

    const results = [];

    for (const test of cacheTests) {
      const times = [];

      for (let i = 0; i < 100; i++) {
        const startTime = performance.now();
        await test.operation();
        times.push(performance.now() - startTime);
      }

      results.push({
        name: test.name,
        avgTime: times.reduce((sum, t) => sum + t, 0) / times.length,
        minTime: Math.min(...times),
        maxTime: Math.max(...times),
      });
    }

    return results;
  }
}

/**
 * Load testing with Artillery.js configuration
 */
export const artilleryConfig = {
  config: {
    target: 'https://your-graphql-endpoint.com',
    phases: [
      { duration: 60, arrivalRate: 10, name: 'Warm up' },
      { duration: 120, arrivalRate: 50, name: 'Ramp up load' },
      { duration: 300, arrivalRate: 100, name: 'Sustained load' },
      { duration: 60, arrivalRate: 200, name: 'Spike test' },
    ],
    defaults: {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_TEST_TOKEN',
      },
    },
  },
  scenarios: [
    {
      name: 'GraphQL Query Mix',
      weight: 70,
      flow: [
        {
          post: {
            url: '/graphql',
            json: {
              query: TEST_CONFIGS.queries.simple.query,
            },
          },
        },
      ],
    },
    {
      name: 'Complex Queries',
      weight: 20,
      flow: [
        {
          post: {
            url: '/graphql',
            json: {
              query: TEST_CONFIGS.queries.complex.query,
              variables: { first: 20 },
            },
          },
        },
      ],
    },
    {
      name: 'Mutations',
      weight: 10,
      flow: [
        {
          post: {
            url: '/graphql',
            json: {
              query: TEST_CONFIGS.queries.mutation.query,
              variables: {
                input: {
                  name: 'Load Test User {{ $randomString() }}',
                  email: 'test{{ $randomInt(0, 10000) }}@example.com',
                  password: 'test-password',
                  role: 'USER',
                },
              },
            },
          },
        },
      ],
    },
  ],
};

export default PerformanceTester;
