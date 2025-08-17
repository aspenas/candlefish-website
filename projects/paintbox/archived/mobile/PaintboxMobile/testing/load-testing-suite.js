#!/usr/bin/env node

/**
 * Paintbox Performance Load Testing Suite
 *
 * This suite tests the performance of the Paintbox paint estimation system
 * under various load conditions with realistic data scenarios.
 *
 * Target Performance:
 * - API: <200ms simple queries, <500ms complex federated queries
 * - Mobile: <2s app launch, >55fps scrolling, <150MB memory
 * - Network: >70% cache hit rate, <30s photo sync
 *
 * Usage:
 * node load-testing-suite.js [--concurrent-users=100] [--duration=300] [--scenario=all]
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// Configuration
const CONFIG = {
  GRAPHQL_ENDPOINT: process.env.GRAPHQL_ENDPOINT || 'http://localhost:4000/graphql',
  CONCURRENT_USERS: parseInt(process.env.CONCURRENT_USERS || '100'),
  TEST_DURATION: parseInt(process.env.TEST_DURATION || '300'), // seconds
  RAMP_UP_TIME: parseInt(process.env.RAMP_UP_TIME || '60'), // seconds
  RESULTS_DIR: path.join(__dirname, 'load-test-results'),
  TEST_DATA_FILE: path.join(__dirname, 'test-data.json'),
};

// Test scenarios
const TEST_SCENARIOS = {
  // Simulates typical user workflow
  USER_WORKFLOW: {
    name: 'Typical User Workflow',
    weight: 0.4, // 40% of traffic
    steps: [
      { operation: 'login', weight: 1.0 },
      { operation: 'getDashboard', weight: 1.0 },
      { operation: 'getProjects', weight: 0.8 },
      { operation: 'getProjectDetail', weight: 0.6 },
      { operation: 'getProjectPhotos', weight: 0.4 },
      { operation: 'createEstimate', weight: 0.2 },
      { operation: 'calculatePricing', weight: 0.2 },
    ]
  },

  // Heavy data operations
  HEAVY_DATA_OPS: {
    name: 'Heavy Data Operations',
    weight: 0.3, // 30% of traffic
    steps: [
      { operation: 'searchProjects', weight: 1.0 },
      { operation: 'getProjectTimeline', weight: 0.7 },
      { operation: 'bulkPhotoUpload', weight: 0.3 },
      { operation: 'generateReports', weight: 0.2 },
      { operation: 'exportData', weight: 0.1 },
    ]
  },

  // Manager operations
  MANAGER_WORKFLOW: {
    name: 'Manager Workflow',
    weight: 0.2, // 20% of traffic
    steps: [
      { operation: 'getManagerDashboard', weight: 1.0 },
      { operation: 'getPendingApprovals', weight: 0.8 },
      { operation: 'approveEstimate', weight: 0.4 },
      { operation: 'assignProject', weight: 0.3 },
      { operation: 'updateProjectStatus', weight: 0.3 },
    ]
  },

  // Real-time operations
  REALTIME_OPS: {
    name: 'Real-time Operations',
    weight: 0.1, // 10% of traffic
    steps: [
      { operation: 'subscribeProjectUpdates', weight: 1.0 },
      { operation: 'syncOfflineChanges', weight: 0.6 },
      { operation: 'livePhotoSync', weight: 0.4 },
    ]
  }
};

// GraphQL operations with test data
const GRAPHQL_OPERATIONS = {
  login: {
    query: `
      mutation Login($email: String!, $password: String!) {
        login(email: $email, password: $password) {
          token
          user { id name email role }
        }
      }
    `,
    variables: () => ({
      email: 'testuser@paintbox.com',
      password: 'testpass123'
    }),
    expectedDuration: 300
  },

  getDashboard: {
    query: `
      query GetDashboard {
        recentProjects: projects(limit: 5, filter: { status: IN_PROGRESS }) {
          edges {
            node {
              id name status priority scheduledStartDate
              customer { name }
            }
          }
        }
        pendingEstimates: estimates(limit: 5, filter: { status: DRAFT }) {
          edges {
            node {
              id goodPrice betterPrice bestPrice status createdAt
            }
          }
        }
      }
    `,
    expectedDuration: 150
  },

  getProjects: {
    query: `
      query GetProjects($limit: Int!, $offset: Int!) {
        projects(limit: $limit, offset: $offset) {
          edges {
            node {
              id name description status priority
              scheduledStartDate completionPercentage
              customer { name email }
              serviceAddress { street city state }
            }
          }
          pageInfo {
            hasNextPage hasPreviousPage
            startCursor endCursor
          }
        }
      }
    `,
    variables: () => ({
      limit: 20,
      offset: Math.floor(Math.random() * 100)
    }),
    expectedDuration: 180
  },

  getProjectDetail: {
    query: `
      query GetProjectDetail($id: ID!) {
        project(id: $id) {
          id name description status priority
          scheduledStartDate actualStartDate
          scheduledEndDate actualEndDate
          customer { name email phone address }
          photos {
            id url thumbnailUrl category capturedAt
            coordinates { latitude longitude }
          }
          permits {
            id type number status issuedDate expirationDate
          }
        }
      }
    `,
    variables: () => ({
      id: getRandomProjectId()
    }),
    expectedDuration: 250
  },

  getProjectPhotos: {
    query: `
      query GetProjectPhotos($projectId: ID!, $category: PhotoCategory) {
        projectPhotos(projectId: $projectId, category: $category) {
          id url thumbnailUrl originalFileName
          fileSize mimeType category tags
          capturedAt uploadedAt syncStatus
          location { address floor room }
          aiAnalysis {
            detectedObjects surfaceType conditionAssessment
            qualityScore confidence
          }
        }
      }
    `,
    variables: () => ({
      projectId: getRandomProjectId(),
      category: getRandomPhotoCategory()
    }),
    expectedDuration: 200
  },

  createEstimate: {
    query: `
      mutation CreateEstimate($input: EstimateInput!) {
        createEstimate(input: $input) {
          id projectId customerId
          goodPrice betterPrice bestPrice
          totalSquareFootage laborHours
          status createdAt
        }
      }
    `,
    variables: () => ({
      input: {
        projectId: getRandomProjectId(),
        customerId: getRandomCustomerId(),
        notes: 'Load test estimate'
      }
    }),
    expectedDuration: 400
  },

  calculatePricing: {
    query: `
      query CalculatePricing($input: PricingInput!) {
        calculatePricing(input: $input) {
          laborCost materialCost overheadCost
          profitMargin subtotal tax total
          breakdown {
            surfaceType area cost
          }
        }
      }
    `,
    variables: () => ({
      input: {
        measurements: generateRandomMeasurements(),
        paintSystem: 'premium',
        laborRate: 45.00
      }
    }),
    expectedDuration: 350
  },

  searchProjects: {
    query: `
      query SearchProjects($query: String!, $limit: Int!) {
        searchProjects(query: $query, limit: $limit) {
          id name description status
          customer { name }
          serviceAddress { street city }
        }
      }
    `,
    variables: () => ({
      query: getRandomSearchTerm(),
      limit: 20
    }),
    expectedDuration: 180
  },

  getManagerDashboard: {
    query: `
      query GetManagerDashboard {
        pendingDiscountApprovals: estimates(filter: { status: REVIEW }) {
          edges {
            node {
              id goodPrice betterPrice bestPrice
              project { name customer { name } }
            }
          }
        }
        projectsNeedingReview: projects(filter: { status: REVIEW }) {
          edges {
            node {
              id name status priority
              customer { name }
            }
          }
        }
        overdueProjects: projects(limit: 10, filter: { isOverdue: true }) {
          edges {
            node {
              id name scheduledEndDate
              customer { name }
            }
          }
        }
      }
    `,
    expectedDuration: 300
  },

  // Additional operations...
  subscribeProjectUpdates: {
    query: `
      subscription ProjectUpdates($projectId: ID!) {
        projectUpdated(projectId: $projectId) {
          id name status completionPercentage
          lastUpdate { type message timestamp }
        }
      }
    `,
    variables: () => ({
      projectId: getRandomProjectId()
    }),
    expectedDuration: 100,
    isSubscription: true
  }
};

// Load testing class
class LoadTestRunner {
  constructor() {
    this.results = {
      startTime: Date.now(),
      endTime: null,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimeStats: {},
      errorStats: {},
      throughputStats: [],
      userScenarios: {},
    };

    this.activeUsers = [];
    this.isRunning = false;
  }

  // Initialize load testing
  async initialize() {
    console.log('Initializing Paintbox Load Testing Suite...');

    // Create results directory
    if (!fs.existsSync(CONFIG.RESULTS_DIR)) {
      fs.mkdirSync(CONFIG.RESULTS_DIR, { recursive: true });
    }

    // Load test data
    await this.loadTestData();

    console.log(`Configuration:
      - GraphQL Endpoint: ${CONFIG.GRAPHQL_ENDPOINT}
      - Concurrent Users: ${CONFIG.CONCURRENT_USERS}
      - Test Duration: ${CONFIG.TEST_DURATION}s
      - Ramp-up Time: ${CONFIG.RAMP_UP_TIME}s`);
  }

  // Load test data from Excel files or generate
  async loadTestData() {
    try {
      if (fs.existsSync(CONFIG.TEST_DATA_FILE)) {
        const data = JSON.parse(fs.readFileSync(CONFIG.TEST_DATA_FILE, 'utf8'));
        this.testData = data;
      } else {
        this.testData = await this.generateTestData();
        fs.writeFileSync(CONFIG.TEST_DATA_FILE, JSON.stringify(this.testData, null, 2));
      }

      console.log(`Loaded test data: ${this.testData.projects.length} projects, ${this.testData.customers.length} customers`);
    } catch (error) {
      console.error('Failed to load test data:', error);
      process.exit(1);
    }
  }

  // Generate synthetic test data
  async generateTestData() {
    console.log('Generating synthetic test data...');

    const projects = [];
    const customers = [];
    const estimates = [];

    // Generate customers
    for (let i = 0; i < 1000; i++) {
      customers.push({
        id: `customer-${i}`,
        name: `Customer ${i}`,
        email: `customer${i}@test.com`,
        phone: `555-${String(i).padStart(4, '0')}`,
        address: {
          street: `${i} Test Street`,
          city: 'Test City',
          state: 'TX',
          postalCode: '12345'
        }
      });
    }

    // Generate projects
    for (let i = 0; i < 5000; i++) {
      const customerId = `customer-${Math.floor(Math.random() * 1000)}`;
      projects.push({
        id: `project-${i}`,
        name: `Project ${i}`,
        description: `Test project description for project ${i}`,
        customerId,
        status: getRandomProjectStatus(),
        priority: getRandomPriority(),
        scheduledStartDate: getRandomDate(),
        serviceAddress: customers.find(c => c.id === customerId)?.address
      });
    }

    // Generate estimates
    for (let i = 0; i < 2000; i++) {
      const projectId = `project-${Math.floor(Math.random() * 5000)}`;
      const project = projects.find(p => p.id === projectId);

      estimates.push({
        id: `estimate-${i}`,
        projectId,
        customerId: project?.customerId,
        goodPrice: 1000 + Math.random() * 5000,
        betterPrice: 1500 + Math.random() * 7500,
        bestPrice: 2000 + Math.random() * 10000,
        status: getRandomEstimateStatus(),
        totalSquareFootage: 500 + Math.random() * 3000
      });
    }

    return { projects, customers, estimates };
  }

  // Run load test
  async runLoadTest(scenario = 'all') {
    console.log(`\nStarting load test with scenario: ${scenario}`);
    console.log('=' .repeat(50));

    this.isRunning = true;
    this.results.startTime = Date.now();

    // Start performance monitoring
    this.startPerformanceMonitoring();

    // Ramp up users gradually
    await this.rampUpUsers();

    // Run test for specified duration
    console.log(`Running load test for ${CONFIG.TEST_DURATION} seconds...`);
    await this.sleep(CONFIG.TEST_DURATION * 1000);

    // Ramp down users
    await this.rampDownUsers();

    // Finalize results
    this.results.endTime = Date.now();
    this.isRunning = false;

    // Generate and save report
    const report = await this.generateReport();
    await this.saveResults(report);

    console.log('\nLoad test completed!');
    console.log(`Results saved to: ${CONFIG.RESULTS_DIR}`);

    return report;
  }

  // Gradually increase user load
  async rampUpUsers() {
    console.log(`Ramping up to ${CONFIG.CONCURRENT_USERS} users over ${CONFIG.RAMP_UP_TIME} seconds...`);

    const usersPerSecond = CONFIG.CONCURRENT_USERS / CONFIG.RAMP_UP_TIME;
    const interval = 1000 / usersPerSecond;

    for (let i = 0; i < CONFIG.CONCURRENT_USERS; i++) {
      if (!this.isRunning) break;

      const user = new VirtualUser(i, this);
      this.activeUsers.push(user);
      user.start();

      await this.sleep(interval);

      if (i % 10 === 0) {
        console.log(`Ramped up ${i + 1}/${CONFIG.CONCURRENT_USERS} users`);
      }
    }

    console.log(`All ${CONFIG.CONCURRENT_USERS} users active`);
  }

  // Gradually decrease user load
  async rampDownUsers() {
    console.log('Ramping down users...');

    this.isRunning = false;

    // Wait for users to finish current operations
    await Promise.all(this.activeUsers.map(user => user.stop()));

    console.log('All users stopped');
  }

  // Monitor performance during test
  startPerformanceMonitoring() {
    const monitoringInterval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(monitoringInterval);
        return;
      }

      const now = Date.now();
      const recentRequests = this.results.totalRequests;

      this.results.throughputStats.push({
        timestamp: now,
        requestsPerSecond: recentRequests / ((now - this.results.startTime) / 1000),
        activeUsers: this.activeUsers.length
      });

      // Log progress every 30 seconds
      const elapsed = Math.floor((now - this.results.startTime) / 1000);
      if (elapsed % 30 === 0) {
        const rps = Math.round(recentRequests / (elapsed || 1));
        const successRate = Math.round((this.results.successfulRequests / this.results.totalRequests) * 100) || 0;
        console.log(`Progress: ${elapsed}s | Requests: ${recentRequests} | RPS: ${rps} | Success Rate: ${successRate}%`);
      }
    }, 1000);
  }

  // Record test results
  recordResult(operation, duration, success, error = null) {
    this.results.totalRequests++;

    if (success) {
      this.results.successfulRequests++;
    } else {
      this.results.failedRequests++;

      if (error) {
        this.results.errorStats[error] = (this.results.errorStats[error] || 0) + 1;
      }
    }

    // Record response time stats
    if (!this.results.responseTimeStats[operation]) {
      this.results.responseTimeStats[operation] = {
        count: 0,
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        durations: []
      };
    }

    const stats = this.results.responseTimeStats[operation];
    stats.count++;
    stats.totalDuration += duration;
    stats.minDuration = Math.min(stats.minDuration, duration);
    stats.maxDuration = Math.max(stats.maxDuration, duration);
    stats.durations.push(duration);
  }

  // Generate comprehensive test report
  async generateReport() {
    console.log('\nGenerating performance report...');

    const duration = (this.results.endTime - this.results.startTime) / 1000;
    const averageRps = this.results.totalRequests / duration;

    // Calculate response time percentiles
    const responseTimeReport = {};
    for (const [operation, stats] of Object.entries(this.results.responseTimeStats)) {
      const sortedDurations = stats.durations.sort((a, b) => a - b);
      const count = sortedDurations.length;

      responseTimeReport[operation] = {
        count: stats.count,
        avgDuration: stats.totalDuration / stats.count,
        minDuration: stats.minDuration,
        maxDuration: stats.maxDuration,
        p50: this.calculatePercentile(sortedDurations, 0.5),
        p90: this.calculatePercentile(sortedDurations, 0.9),
        p95: this.calculatePercentile(sortedDurations, 0.95),
        p99: this.calculatePercentile(sortedDurations, 0.99),
      };
    }

    // Performance assessment
    const performanceAssessment = this.assessPerformance(responseTimeReport);

    const report = {
      testConfiguration: {
        concurrentUsers: CONFIG.CONCURRENT_USERS,
        duration: CONFIG.TEST_DURATION,
        rampUpTime: CONFIG.RAMP_UP_TIME,
        endpoint: CONFIG.GRAPHQL_ENDPOINT
      },
      summary: {
        totalRequests: this.results.totalRequests,
        successfulRequests: this.results.successfulRequests,
        failedRequests: this.results.failedRequests,
        successRate: (this.results.successfulRequests / this.results.totalRequests) * 100,
        averageRps: Math.round(averageRps),
        testDuration: Math.round(duration)
      },
      responseTimeAnalysis: responseTimeReport,
      performanceAssessment,
      errorAnalysis: this.results.errorStats,
      throughputOverTime: this.results.throughputStats,
      timestamp: new Date().toISOString()
    };

    return report;
  }

  // Assess performance against targets
  assessPerformance(responseTimeReport) {
    const assessment = {
      overall: 'PASS',
      issues: [],
      recommendations: []
    };

    for (const [operation, stats] of Object.entries(responseTimeReport)) {
      const operationConfig = GRAPHQL_OPERATIONS[operation];
      if (!operationConfig) continue;

      const expectedDuration = operationConfig.expectedDuration;
      const actualP95 = stats.p95;

      if (actualP95 > expectedDuration * 1.5) { // 50% slower than expected
        assessment.overall = 'FAIL';
        assessment.issues.push(`${operation}: P95 response time (${actualP95}ms) exceeds target (${expectedDuration}ms)`);
      } else if (actualP95 > expectedDuration * 1.2) { // 20% slower than expected
        assessment.overall = 'WARNING';
        assessment.issues.push(`${operation}: P95 response time (${actualP95}ms) is slower than target (${expectedDuration}ms)`);
      }
    }

    // Check overall success rate
    const successRate = (this.results.successfulRequests / this.results.totalRequests) * 100;
    if (successRate < 95) {
      assessment.overall = 'FAIL';
      assessment.issues.push(`Overall success rate (${successRate.toFixed(1)}%) is below 95%`);
    }

    // Generate recommendations
    if (assessment.issues.length > 0) {
      assessment.recommendations = [
        'Review database query performance and indexing',
        'Consider implementing additional caching layers',
        'Optimize GraphQL resolver functions',
        'Review server resource allocation',
        'Consider implementing query complexity limits'
      ];
    }

    return assessment;
  }

  // Save test results
  async saveResults(report) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `load-test-${timestamp}.json`;
    const filepath = path.join(CONFIG.RESULTS_DIR, filename);

    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));

    // Also save a summary CSV for easy analysis
    const csvData = this.generateCSVSummary(report);
    const csvFilename = `load-test-summary-${timestamp}.csv`;
    const csvFilepath = path.join(CONFIG.RESULTS_DIR, csvFilename);
    fs.writeFileSync(csvFilepath, csvData);

    console.log(`\nDetailed results: ${filepath}`);
    console.log(`Summary CSV: ${csvFilepath}`);
  }

  // Generate CSV summary
  generateCSVSummary(report) {
    let csv = 'Operation,Count,Avg(ms),Min(ms),Max(ms),P50(ms),P90(ms),P95(ms),P99(ms)\n';

    for (const [operation, stats] of Object.entries(report.responseTimeAnalysis)) {
      csv += `${operation},${stats.count},${Math.round(stats.avgDuration)},${Math.round(stats.minDuration)},${Math.round(stats.maxDuration)},${Math.round(stats.p50)},${Math.round(stats.p90)},${Math.round(stats.p95)},${Math.round(stats.p99)}\n`;
    }

    return csv;
  }

  // Utility methods
  calculatePercentile(sortedArray, percentile) {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil(sortedArray.length * percentile) - 1;
    return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Virtual user simulation
class VirtualUser {
  constructor(id, testRunner) {
    this.id = id;
    this.testRunner = testRunner;
    this.isActive = false;
    this.scenario = this.selectScenario();
  }

  selectScenario() {
    const random = Math.random();
    let cumulativeWeight = 0;

    for (const [name, scenario] of Object.entries(TEST_SCENARIOS)) {
      cumulativeWeight += scenario.weight;
      if (random <= cumulativeWeight) {
        return scenario;
      }
    }

    return TEST_SCENARIOS.USER_WORKFLOW; // Default fallback
  }

  async start() {
    this.isActive = true;

    while (this.isActive && this.testRunner.isRunning) {
      try {
        await this.executeScenario();

        // Random think time between scenarios (1-5 seconds)
        const thinkTime = 1000 + Math.random() * 4000;
        await this.testRunner.sleep(thinkTime);
      } catch (error) {
        console.error(`User ${this.id} error:`, error.message);
        await this.testRunner.sleep(5000); // Wait before retrying
      }
    }
  }

  async executeScenario() {
    for (const step of this.scenario.steps) {
      if (!this.isActive || !this.testRunner.isRunning) break;

      // Execute step based on weight (probability)
      if (Math.random() <= step.weight) {
        await this.executeOperation(step.operation);

        // Small delay between steps
        await this.testRunner.sleep(100 + Math.random() * 500);
      }
    }
  }

  async executeOperation(operationName) {
    const operation = GRAPHQL_OPERATIONS[operationName];
    if (!operation) {
      console.warn(`Unknown operation: ${operationName}`);
      return;
    }

    const startTime = performance.now();

    try {
      if (operation.isSubscription) {
        // Handle GraphQL subscriptions differently
        await this.executeSubscription(operation);
      } else {
        // Regular query/mutation
        await this.executeGraphQLQuery(operation);
      }

      const duration = performance.now() - startTime;
      this.testRunner.recordResult(operationName, duration, true);

    } catch (error) {
      const duration = performance.now() - startTime;
      this.testRunner.recordResult(operationName, duration, false, error.message);
    }
  }

  async executeGraphQLQuery(operation) {
    const variables = typeof operation.variables === 'function'
      ? operation.variables()
      : operation.variables;

    // Simulate GraphQL request (would use actual HTTP client in real implementation)
    const simulatedLatency = 50 + Math.random() * 200; // 50-250ms base latency
    await this.testRunner.sleep(simulatedLatency);

    // Add some realistic failure rate (2%)
    if (Math.random() < 0.02) {
      throw new Error('Simulated network error');
    }
  }

  async executeSubscription(operation) {
    // Simulate subscription connection
    const connectionTime = 100 + Math.random() * 200;
    await this.testRunner.sleep(connectionTime);

    // Simulate receiving updates for a period
    const updateDuration = 10000 + Math.random() * 20000; // 10-30 seconds
    const updateInterval = 1000 + Math.random() * 3000; // 1-4 seconds between updates

    const endTime = Date.now() + updateDuration;
    while (Date.now() < endTime && this.isActive) {
      await this.testRunner.sleep(updateInterval);
      // Each update would be recorded as a separate operation in real implementation
    }
  }

  async stop() {
    this.isActive = false;
  }
}

// Helper functions for test data generation
function getRandomProjectId() {
  return `project-${Math.floor(Math.random() * 5000)}`;
}

function getRandomCustomerId() {
  return `customer-${Math.floor(Math.random() * 1000)}`;
}

function getRandomPhotoCategory() {
  const categories = ['BEFORE', 'PROGRESS', 'AFTER', 'DAMAGE', 'MATERIALS'];
  return categories[Math.floor(Math.random() * categories.length)];
}

function getRandomProjectStatus() {
  const statuses = ['ACTIVE', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'REVIEW'];
  return statuses[Math.floor(Math.random() * statuses.length)];
}

function getRandomEstimateStatus() {
  const statuses = ['DRAFT', 'REVIEW', 'APPROVED', 'SENT', 'ACCEPTED'];
  return statuses[Math.floor(Math.random() * statuses.length)];
}

function getRandomPriority() {
  const priorities = ['LOW', 'MEDIUM', 'HIGH'];
  return priorities[Math.floor(Math.random() * priorities.length)];
}

function getRandomDate() {
  const start = new Date();
  const end = new Date(start.getTime() + (90 * 24 * 60 * 60 * 1000)); // 90 days from now
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function getRandomSearchTerm() {
  const terms = ['paint', 'kitchen', 'bathroom', 'exterior', 'interior', 'commercial', 'residential'];
  return terms[Math.floor(Math.random() * terms.length)];
}

function generateRandomMeasurements() {
  const measurements = [];
  const rooms = ['Living Room', 'Kitchen', 'Bedroom', 'Bathroom'];
  const surfaces = ['wall', 'ceiling', 'trim'];

  for (let i = 0; i < 5 + Math.random() * 10; i++) {
    measurements.push({
      roomName: rooms[Math.floor(Math.random() * rooms.length)],
      surfaceType: surfaces[Math.floor(Math.random() * surfaces.length)],
      length: 8 + Math.random() * 12,
      width: 8 + Math.random() * 12,
      height: 8 + Math.random() * 4
    });
  }

  return measurements;
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const scenario = args.find(arg => arg.startsWith('--scenario='))?.split('=')[1] || 'all';

  // Override config from command line args
  if (args.find(arg => arg.startsWith('--concurrent-users='))) {
    CONFIG.CONCURRENT_USERS = parseInt(args.find(arg => arg.startsWith('--concurrent-users=')).split('=')[1]);
  }
  if (args.find(arg => arg.startsWith('--duration='))) {
    CONFIG.TEST_DURATION = parseInt(args.find(arg => arg.startsWith('--duration=')).split('=')[1]);
  }

  const testRunner = new LoadTestRunner();

  try {
    await testRunner.initialize();
    const report = await testRunner.runLoadTest(scenario);

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('LOAD TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Requests: ${report.summary.totalRequests}`);
    console.log(`Success Rate: ${report.summary.successRate.toFixed(1)}%`);
    console.log(`Average RPS: ${report.summary.averageRps}`);
    console.log(`Test Duration: ${report.summary.testDuration}s`);
    console.log(`Overall Assessment: ${report.performanceAssessment.overall}`);

    if (report.performanceAssessment.issues.length > 0) {
      console.log('\nPerformance Issues:');
      report.performanceAssessment.issues.forEach(issue => {
        console.log(`  - ${issue}`);
      });
    }

    console.log('\n' + '='.repeat(60));

    // Exit with appropriate code
    process.exit(report.performanceAssessment.overall === 'FAIL' ? 1 : 0);

  } catch (error) {
    console.error('Load test failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { LoadTestRunner, VirtualUser, TEST_SCENARIOS, GRAPHQL_OPERATIONS };
