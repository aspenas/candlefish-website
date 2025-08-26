import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTrend = new Trend('response_time');
const subscriptionDuration = new Trend('subscription_duration');
const dataTransfer = new Counter('data_transferred_bytes');

// Test configuration for different load scenarios
export const options = {
  scenarios: {
    // Scenario 1: API Load Test - 1000 concurrent users for 10 minutes
    api_load_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },   // Ramp up to 100 users
        { duration: '3m', target: 500 },   // Ramp up to 500 users
        { duration: '5m', target: 1000 },  // Ramp up to 1000 users
        { duration: '5m', target: 1000 },  // Stay at 1000 users
        { duration: '3m', target: 500 },   // Scale down to 500 users
        { duration: '2m', target: 0 },     // Ramp down to 0 users
      ],
      gracefulRampDown: '30s',
      exec: 'apiLoadTest',
    },

    // Scenario 2: WebSocket Subscription Test - 500 concurrent connections
    websocket_subscription_test: {
      executor: 'constant-vus',
      vus: 500,
      duration: '10m',
      exec: 'subscriptionTest',
    },

    // Scenario 3: Mixed Workload - Realistic user behavior
    mixed_workload: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 200,
      stages: [
        { duration: '2m', target: 20 },   // 20 requests per second
        { duration: '5m', target: 50 },   // 50 requests per second
        { duration: '3m', target: 80 },   // 80 requests per second
        { duration: '2m', target: 20 },   // Scale back down
      ],
      exec: 'mixedWorkload',
    },
  },

  thresholds: {
    // API response time thresholds
    'http_req_duration': ['p(95)<100', 'p(99)<500'], // 95% under 100ms, 99% under 500ms
    'http_req_failed': ['rate<0.01'], // Error rate should be less than 1%

    // Custom metric thresholds
    'errors': ['rate<0.05'], // Error rate should be less than 5%
    'response_time': ['p(90)<50', 'p(95)<100'], // Custom response time tracking
    'subscription_duration': ['p(95)<1000'], // WebSocket subscription latency

    // System resource thresholds
    'checks': ['rate>0.95'], // 95% of checks should pass
    'data_transferred_bytes': ['count>0'], // Ensure data is being transferred
  },
};

// Base URL configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const WS_URL = __ENV.WS_URL || 'ws://localhost:8080';

// Authentication setup
const AUTH_TOKEN = __ENV.AUTH_TOKEN || generateTestToken();

function generateTestToken() {
  // Generate a test JWT token for load testing
  // In real scenarios, this would be obtained through proper authentication
  return 'test-jwt-token-for-load-testing';
}

// Test data generators
function generateTestData() {
  return {
    organizationId: 'org-load-test',
    assetData: {
      name: `Load Test Asset ${Math.floor(Math.random() * 10000)}`,
      assetType: ['APPLICATION', 'DATABASE', 'API', 'WEBSITE'][Math.floor(Math.random() * 4)],
      environment: ['DEVELOPMENT', 'STAGING', 'PRODUCTION'][Math.floor(Math.random() * 3)],
      platform: ['KUBERNETES', 'AWS', 'GCP', 'AZURE', 'ON_PREMISE'][Math.floor(Math.random() * 5)],
      description: 'Generated for load testing purposes',
    },
    vulnerabilityData: {
      title: `Load Test Vulnerability ${Math.floor(Math.random() * 10000)}`,
      description: 'Critical vulnerability detected during load testing',
      severity: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'][Math.floor(Math.random() * 4)],
    },
  };
}

// Headers configuration
function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'User-Agent': 'K6 Load Test',
  };
}

// GraphQL query templates
const QUERIES = {
  SECURITY_OVERVIEW: `
    query SecurityOverview($organizationId: ID!) {
      securityOverview(organizationId: $organizationId) {
        totalAssets
        criticalVulnerabilities
        activeAlerts
        complianceScore
        threatLevel
        vulnerabilitiesBySeverity {
          severity
          count
        }
      }
    }
  `,

  GET_ASSETS: `
    query GetAssets($organizationId: ID!) {
      assets(organizationId: $organizationId) {
        id
        name
        assetType
        environment
        platform
        healthStatus
        createdAt
      }
    }
  `,

  GET_VULNERABILITIES: `
    query GetVulnerabilities($assetId: ID!) {
      vulnerabilities(assetId: $assetId) {
        id
        title
        severity
        status
        detectedAt
        cveId
      }
    }
  `,

  CREATE_ASSET: `
    mutation CreateAsset($organizationId: ID!, $input: CreateAssetInput!) {
      createAsset(organizationId: $organizationId, input: $input) {
        id
        name
        assetType
        environment
        platform
      }
    }
  `,
};

// Scenario 1: API Load Test
export function apiLoadTest() {
  const testData = generateTestData();

  // Test security overview endpoint
  const overviewResponse = http.post(`${BASE_URL}/graphql`, JSON.stringify({
    query: QUERIES.SECURITY_OVERVIEW,
    variables: { organizationId: testData.organizationId }
  }), { headers: getHeaders() });

  const overviewSuccess = check(overviewResponse, {
    'Security overview status is 200': (r) => r.status === 200,
    'Security overview response time < 100ms': (r) => r.timings.duration < 100,
    'Security overview has valid data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.data && data.data.securityOverview;
      } catch (e) {
        return false;
      }
    },
  });

  errorRate.add(!overviewSuccess);
  responseTrend.add(overviewResponse.timings.duration);
  dataTransfer.add(overviewResponse.body.length);

  sleep(1);

  // Test assets endpoint
  const assetsResponse = http.post(`${BASE_URL}/graphql`, JSON.stringify({
    query: QUERIES.GET_ASSETS,
    variables: { organizationId: testData.organizationId }
  }), { headers: getHeaders() });

  const assetsSuccess = check(assetsResponse, {
    'Assets status is 200': (r) => r.status === 200,
    'Assets response time < 150ms': (r) => r.timings.duration < 150,
    'Assets response has valid structure': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.data && Array.isArray(data.data.assets);
      } catch (e) {
        return false;
      }
    },
  });

  errorRate.add(!assetsSuccess);
  responseTrend.add(assetsResponse.timings.duration);
  dataTransfer.add(assetsResponse.body.length);

  sleep(2);

  // Test asset creation (write operation)
  if (Math.random() < 0.1) { // 10% of users create assets
    const createAssetResponse = http.post(`${BASE_URL}/graphql`, JSON.stringify({
      query: QUERIES.CREATE_ASSET,
      variables: {
        organizationId: testData.organizationId,
        input: testData.assetData
      }
    }), { headers: getHeaders() });

    const createSuccess = check(createAssetResponse, {
      'Asset creation status is 200': (r) => r.status === 200,
      'Asset creation response time < 200ms': (r) => r.timings.duration < 200,
      'Asset creation successful': (r) => {
        try {
          const data = JSON.parse(r.body);
          return data.data && data.data.createAsset && data.data.createAsset.id;
        } catch (e) {
          return false;
        }
      },
    });

    errorRate.add(!createSuccess);
    responseTrend.add(createAssetResponse.timings.duration);
    dataTransfer.add(createAssetResponse.body.length);
  }

  sleep(1);
}

// Scenario 2: WebSocket Subscription Test
export function subscriptionTest() {
  const testData = generateTestData();

  const response = ws.connect(`${WS_URL}/graphql`, {
    protocols: ['graphql-ws'],
  }, function (socket) {
    const startTime = new Date().getTime();

    // WebSocket GraphQL subscription initialization
    socket.on('open', function () {
      // Send connection init
      socket.send(JSON.stringify({
        type: 'connection_init',
        payload: {
          authorization: `Bearer ${AUTH_TOKEN}`,
        }
      }));
    });

    socket.on('message', function (message) {
      const data = JSON.parse(message);

      if (data.type === 'connection_ack') {
        // Subscribe to security events
        socket.send(JSON.stringify({
          id: '1',
          type: 'start',
          payload: {
            query: `
              subscription SecurityEventAdded($organizationId: ID!) {
                securityEventAdded(organizationId: $organizationId) {
                  id
                  title
                  severity
                  eventType
                  createdAt
                }
              }
            `,
            variables: { organizationId: testData.organizationId }
          }
        }));

        // Subscribe to Kong API status changes
        socket.send(JSON.stringify({
          id: '2',
          type: 'start',
          payload: {
            query: `
              subscription KongAdminApiStatusChanged {
                kongAdminApiStatusChanged {
                  isSecure
                  protocol
                  isVulnerable
                  riskLevel
                  lastChecked
                }
              }
            `
          }
        }));
      }

      if (data.type === 'data') {
        const duration = new Date().getTime() - startTime;
        subscriptionDuration.add(duration);
        dataTransfer.add(JSON.stringify(data).length);

        check(data, {
          'Subscription message has valid structure': (d) => d.payload && d.payload.data,
          'Subscription latency < 50ms': () => duration < 50,
        });
      }
    });

    socket.setTimeout(() => {
      socket.close();
    }, 30000); // Keep connection open for 30 seconds
  });

  check(response, {
    'WebSocket connection established': (r) => r && r.status === 101,
  });
}

// Scenario 3: Mixed Workload - Realistic User Behavior
export function mixedWorkload() {
  const testData = generateTestData();

  // Simulate realistic user behavior patterns
  const userActions = [
    () => viewSecurityOverview(testData),
    () => browseAssets(testData),
    () => viewVulnerabilityDetails(testData),
    () => acknowledgeAlert(testData),
    () => searchAssets(testData),
  ];

  // Execute random user action
  const randomAction = userActions[Math.floor(Math.random() * userActions.length)];
  randomAction();

  // Random think time between 1-5 seconds
  sleep(Math.random() * 4 + 1);
}

// User action implementations
function viewSecurityOverview(testData) {
  const response = http.post(`${BASE_URL}/graphql`, JSON.stringify({
    query: QUERIES.SECURITY_OVERVIEW,
    variables: { organizationId: testData.organizationId }
  }), { headers: getHeaders() });

  const success = check(response, {
    'View security overview successful': (r) => r.status === 200,
  });

  errorRate.add(!success);
  responseTrend.add(response.timings.duration);
}

function browseAssets(testData) {
  const response = http.post(`${BASE_URL}/graphql`, JSON.stringify({
    query: QUERIES.GET_ASSETS,
    variables: { organizationId: testData.organizationId }
  }), { headers: getHeaders() });

  const success = check(response, {
    'Browse assets successful': (r) => r.status === 200,
  });

  errorRate.add(!success);
  responseTrend.add(response.timings.duration);
}

function viewVulnerabilityDetails(testData) {
  // First get an asset, then get its vulnerabilities
  const assetsResponse = http.post(`${BASE_URL}/graphql`, JSON.stringify({
    query: QUERIES.GET_ASSETS,
    variables: { organizationId: testData.organizationId }
  }), { headers: getHeaders() });

  if (assetsResponse.status === 200) {
    try {
      const data = JSON.parse(assetsResponse.body);
      if (data.data && data.data.assets && data.data.assets.length > 0) {
        const randomAsset = data.data.assets[Math.floor(Math.random() * data.data.assets.length)];

        const vulnResponse = http.post(`${BASE_URL}/graphql`, JSON.stringify({
          query: QUERIES.GET_VULNERABILITIES,
          variables: { assetId: randomAsset.id }
        }), { headers: getHeaders() });

        const success = check(vulnResponse, {
          'View vulnerabilities successful': (r) => r.status === 200,
        });

        errorRate.add(!success);
        responseTrend.add(vulnResponse.timings.duration);
      }
    } catch (e) {
      errorRate.add(1);
    }
  }
}

function acknowledgeAlert(testData) {
  // Simulate alert acknowledgment
  const response = http.post(`${BASE_URL}/api/alerts/acknowledge`, JSON.stringify({
    alertId: `alert-${Math.floor(Math.random() * 1000)}`,
    organizationId: testData.organizationId,
  }), { headers: getHeaders() });

  const success = check(response, {
    'Acknowledge alert processed': (r) => r.status === 200 || r.status === 404, // 404 is OK for non-existent alerts
  });

  errorRate.add(!success && response.status !== 404);
  responseTrend.add(response.timings.duration);
}

function searchAssets(testData) {
  const searchTerms = ['database', 'api', 'web', 'critical', 'production'];
  const searchTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];

  const response = http.get(`${BASE_URL}/api/assets/search?q=${searchTerm}&org=${testData.organizationId}`, {
    headers: getHeaders()
  });

  const success = check(response, {
    'Search assets successful': (r) => r.status === 200,
    'Search response time < 200ms': (r) => r.timings.duration < 200,
  });

  errorRate.add(!success);
  responseTrend.add(response.timings.duration);
}

// Test lifecycle hooks
export function setup() {
  console.log('Starting Security Dashboard load test...');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`WebSocket URL: ${WS_URL}`);

  // Verify services are available
  const healthCheck = http.get(`${BASE_URL}/health`);
  if (healthCheck.status !== 200) {
    console.error('Health check failed - services may not be available');
  }

  return { startTime: new Date() };
}

export function teardown(data) {
  const endTime = new Date();
  const duration = (endTime - data.startTime) / 1000;
  console.log(`Load test completed in ${duration} seconds`);
}

// Default export for single scenario runs
export default apiLoadTest;
