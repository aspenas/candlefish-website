import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTrend = new Trend('response_time');
const requestsCounter = new Counter('requests_total');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp up to 10 users over 2 minutes
    { duration: '5m', target: 10 },   // Stay at 10 users for 5 minutes
    { duration: '2m', target: 50 },   // Ramp up to 50 users over 2 minutes
    { duration: '10m', target: 50 },  // Stay at 50 users for 10 minutes
    { duration: '2m', target: 100 },  // Ramp up to 100 users over 2 minutes
    { duration: '5m', target: 100 },  // Stay at 100 users for 5 minutes
    { duration: '2m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.05'],   // Error rate must be below 5%
    errors: ['rate<0.05'],            // Custom error rate threshold
  },
};

// Base URL configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3501';
const API_VERSION = '/api/v1';

// Authentication setup
function authenticate() {
  const loginPayload = JSON.stringify({
    username: 'loadtest',
    password: 'loadtest123'
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const response = http.post(`${BASE_URL}/api/auth/login`, loginPayload, params);
  
  check(response, {
    'login successful': (r) => r.status === 200,
    'token received': (r) => r.json('token') !== undefined,
  });

  return response.json('token');
}

// Main test scenario
export default function () {
  // Authenticate once per VU iteration
  const token = authenticate();
  
  if (!token) {
    console.error('Failed to authenticate');
    return;
  }

  const authParams = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  // Test scenarios weighted by realistic usage patterns
  const scenarios = [
    { name: 'system_overview', weight: 30 },
    { name: 'agent_performance', weight: 25 },
    { name: 'service_health', weight: 20 },
    { name: 'performance_trends', weight: 15 },
    { name: 'create_metric', weight: 10 },
  ];

  // Select scenario based on weight
  const totalWeight = scenarios.reduce((sum, s) => sum + s.weight, 0);
  const random = Math.random() * totalWeight;
  let currentWeight = 0;
  let selectedScenario = scenarios[0];

  for (const scenario of scenarios) {
    currentWeight += scenario.weight;
    if (random <= currentWeight) {
      selectedScenario = scenario;
      break;
    }
  }

  // Execute selected scenario
  executeScenario(selectedScenario.name, authParams);
  
  // Random sleep to simulate user thinking time
  sleep(Math.random() * 3 + 1); // 1-4 seconds
}

function executeScenario(scenarioName, authParams) {
  let response;
  requestsCounter.add(1);

  switch (scenarioName) {
    case 'system_overview':
      response = http.get(`${BASE_URL}${API_VERSION}/analytics/system/overview`, authParams);
      checkSystemOverviewResponse(response);
      break;

    case 'agent_performance':
      const agentParams = {
        ...authParams,
        tags: { endpoint: 'agent_performance' }
      };
      response = http.get(`${BASE_URL}${API_VERSION}/analytics/agents/performance?limit=20`, agentParams);
      checkAgentPerformanceResponse(response);
      break;

    case 'service_health':
      response = http.get(`${BASE_URL}${API_VERSION}/analytics/services/health`, authParams);
      checkServiceHealthResponse(response);
      break;

    case 'performance_trends':
      const trendParams = `?period=24h&interval=1h`;
      response = http.get(`${BASE_URL}${API_VERSION}/analytics/trends${trendParams}`, authParams);
      checkTrendsResponse(response);
      break;

    case 'create_metric':
      const metricPayload = JSON.stringify({
        type: 'agent',
        agent_id: `loadtest-agent-${Math.floor(Math.random() * 100)}`,
        agent_name: `Load Test Agent ${Math.floor(Math.random() * 100)}`,
        metric_type: 'response_time',
        value: Math.random() * 200 + 50, // 50-250ms
        unit: 'ms'
      });
      response = http.post(`${BASE_URL}${API_VERSION}/analytics/metrics`, metricPayload, authParams);
      checkCreateMetricResponse(response);
      break;
  }

  // Record metrics for all scenarios
  if (response) {
    responseTrend.add(response.timings.duration);
    
    if (response.status !== 200) {
      errorRate.add(1);
    } else {
      errorRate.add(0);
    }
  }
}

// Response validation functions
function checkSystemOverviewResponse(response) {
  const isSuccess = check(response, {
    'system overview status is 200': (r) => r.status === 200,
    'system overview has data': (r) => r.json('data') !== undefined,
    'system overview response time < 500ms': (r) => r.timings.duration < 500,
  });

  if (isSuccess && response.status === 200) {
    const data = response.json('data');
    check(data, {
      'has agents data': (d) => d.agents !== undefined,
      'has services data': (d) => d.services !== undefined,
      'has system data': (d) => d.system !== undefined,
    });
  }
}

function checkAgentPerformanceResponse(response) {
  const isSuccess = check(response, {
    'agent performance status is 200': (r) => r.status === 200,
    'agent performance has data array': (r) => Array.isArray(r.json('data')),
    'agent performance response time < 800ms': (r) => r.timings.duration < 800,
  });

  if (isSuccess && response.status === 200) {
    const data = response.json('data');
    if (data.length > 0) {
      check(data[0], {
        'agent has required fields': (agent) => 
          agent.agent_id !== undefined && 
          agent.agent_name !== undefined && 
          agent.metric_type !== undefined,
      });
    }
  }
}

function checkServiceHealthResponse(response) {
  check(response, {
    'service health status is 200': (r) => r.status === 200,
    'service health has data array': (r) => Array.isArray(r.json('data')),
    'service health response time < 600ms': (r) => r.timings.duration < 600,
  });
}

function checkTrendsResponse(response) {
  const isSuccess = check(response, {
    'trends status is 200': (r) => r.status === 200,
    'trends has data': (r) => r.json('data') !== undefined,
    'trends response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  if (isSuccess && response.status === 200) {
    const data = response.json('data');
    check(data, {
      'trends has agent_trends': (d) => d.agent_trends !== undefined,
      'trends has service_trends': (d) => d.service_trends !== undefined,
    });
  }
}

function checkCreateMetricResponse(response) {
  check(response, {
    'create metric status is 201': (r) => r.status === 201,
    'create metric has data': (r) => r.json('data') !== undefined,
    'create metric response time < 300ms': (r) => r.timings.duration < 300,
  });
}

// Stress test scenario
export function stressTest() {
  const token = authenticate();
  
  if (!token) {
    return;
  }

  const authParams = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  // Simulate rapid-fire requests
  for (let i = 0; i < 10; i++) {
    const response = http.get(`${BASE_URL}${API_VERSION}/analytics/system/overview`, authParams);
    
    check(response, {
      [`stress test iteration ${i} successful`]: (r) => r.status === 200,
    });
    
    if (i < 9) sleep(0.1); // Very short sleep between requests
  }
}

// Database connection test
export function dbConnectionTest() {
  const token = authenticate();
  
  if (!token) {
    return;
  }

  const authParams = {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  };

  // Test multiple concurrent database queries
  const requests = [
    http.get(`${BASE_URL}${API_VERSION}/analytics/agents/performance?limit=100`, authParams),
    http.get(`${BASE_URL}${API_VERSION}/analytics/services/health`, authParams),
    http.get(`${BASE_URL}${API_VERSION}/analytics/system/overview`, authParams),
    http.get(`${BASE_URL}${API_VERSION}/analytics/trends?period=7d`, authParams),
  ];

  // Check all requests completed successfully
  requests.forEach((response, index) => {
    check(response, {
      [`concurrent db query ${index} successful`]: (r) => r.status === 200,
      [`concurrent db query ${index} fast enough`]: (r) => r.timings.duration < 2000,
    });
  });
}

// Memory usage test
export function memoryTest() {
  const token = authenticate();
  
  if (!token) {
    return;
  }

  const authParams = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };

  // Create many metrics to test memory usage
  const promises = [];
  for (let i = 0; i < 50; i++) {
    const payload = JSON.stringify({
      type: 'agent',
      agent_id: `memory-test-agent-${i}`,
      agent_name: `Memory Test Agent ${i}`,
      metric_type: 'memory_test',
      value: Math.random() * 1000,
      unit: 'MB',
      metadata: {
        test_data: 'x'.repeat(1000), // 1KB of test data
        iteration: i,
        timestamp: new Date().toISOString()
      }
    });

    promises.push(http.post(`${BASE_URL}${API_VERSION}/analytics/metrics`, payload, authParams));
  }

  // Check all metrics were created successfully
  promises.forEach((response, index) => {
    check(response, {
      [`memory test metric ${index} created`]: (r) => r.status === 201,
    });
  });
}

// Setup and teardown
export function setup() {
  console.log('Starting Analytics Dashboard load tests...');
  
  // Warm up the service
  const warmUpResponse = http.get(`${BASE_URL}/api/health`);
  check(warmUpResponse, {
    'service is ready': (r) => r.status === 200,
  });
  
  return { startTime: new Date() };
}

export function teardown(data) {
  const endTime = new Date();
  const duration = (endTime - data.startTime) / 1000;
  console.log(`Load test completed in ${duration} seconds`);
}