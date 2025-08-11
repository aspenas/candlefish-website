import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const loginSuccessRate = new Rate('login_success_rate');
const apiResponseTime = new Trend('api_response_time');
const errorRate = new Rate('error_rate');
const authFailures = new Counter('auth_failures');

// Test configuration
export const options = {
  stages: [
    // Ramp-up
    { duration: '2m', target: 10 }, // 10 users for 2 minutes
    { duration: '3m', target: 20 }, // 20 users for 3 minutes
    { duration: '5m', target: 50 }, // 50 users for 5 minutes

    // Peak load
    { duration: '10m', target: 100 }, // 100 users for 10 minutes
    { duration: '5m', target: 200 }, // 200 users for 5 minutes (stress test)

    // Ramp-down
    { duration: '3m', target: 50 }, // 50 users for 3 minutes
    { duration: '2m', target: 0 },  // 0 users for 2 minutes
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests should be below 2s
    http_req_failed: ['rate<0.05'], // Error rate should be less than 5%
    login_success_rate: ['rate>0.95'], // Login success rate should be above 95%
    api_response_time: ['p(90)<1000'], // 90% of API calls should be below 1s
  },
};

// Test environment configuration
const BASE_URL = __ENV.TEST_BASE_URL || 'https://5x6gs2o6b6.execute-api.us-east-1.amazonaws.com/prod';
const FRONTEND_URL = __ENV.FRONTEND_URL || 'http://candlefish-employee-setup-lean-prod-web.s3-website-us-east-1.amazonaws.com';

// Test users for load testing
const TEST_USERS = [
  { email: 'loadtest1@example.com', password: 'LoadTest123!', role: 'admin' },
  { email: 'loadtest2@example.com', password: 'LoadTest123!', role: 'employee' },
  { email: 'loadtest3@example.com', password: 'LoadTest123!', role: 'admin' },
  { email: 'loadtest4@example.com', password: 'LoadTest123!', role: 'employee' },
  { email: 'loadtest5@example.com', password: 'LoadTest123!', role: 'admin' },
];

// GraphQL queries for load testing
const DASHBOARD_QUERY = JSON.stringify({
  query: `
    query GetDashboardStats {
      dashboardStats {
        totalUsers
        activeUsers
        totalContractors
        totalSecrets
        recentActivity {
          id
          action
          timestamp
          user
        }
        systemHealth {
          status
          uptime
          memory
          cpu
        }
      }
    }
  `
});

const CONTRACTORS_QUERY = JSON.stringify({
  query: `
    query GetContractors($pagination: PaginationInput) {
      contractors(pagination: $pagination) {
        contractors {
          id
          name
          email
          phone
          company
          skills
          status
          rating
          createdAt
        }
        total
        hasMore
      }
    }
  `,
  variables: {
    pagination: { page: 1, limit: 20 }
  }
});

const CREATE_CONTRACTOR_MUTATION = JSON.stringify({
  query: `
    mutation CreateContractor($input: CreateContractorInput!) {
      createContractor(input: $input) {
        id
        name
        email
        phone
        company
        skills
        status
      }
    }
  `,
  variables: {
    input: {
      name: 'Load Test Contractor',
      email: `loadtest-contractor-${Math.random().toString(36).substring(7)}@example.com`,
      phone: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
      company: 'Load Test Company',
      skills: ['testing', 'performance']
    }
  }
});

export function setup() {
  console.log('Setting up load test environment...');

  // Verify API is accessible
  const healthCheck = http.get(`${BASE_URL}/health`);
  check(healthCheck, {
    'API is accessible': (r) => r.status === 200,
  });

  // Verify frontend is accessible
  const frontendCheck = http.get(FRONTEND_URL);
  check(frontendCheck, {
    'Frontend is accessible': (r) => r.status === 200,
  });

  return { baseUrl: BASE_URL, frontendUrl: FRONTEND_URL };
}

export default function (data) {
  const user = TEST_USERS[Math.floor(Math.random() * TEST_USERS.length)];
  let authToken = null;

  // 1. Authentication Load Test
  const loginStart = Date.now();
  const loginResponse = http.post(`${data.baseUrl}/auth/login`,
    JSON.stringify({
      email: user.email,
      password: user.password
    }), {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  const loginSuccess = check(loginResponse, {
    'Login status is 200': (r) => r.status === 200,
    'Login response has token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true && body.token;
      } catch (e) {
        return false;
      }
    },
  });

  loginSuccessRate.add(loginSuccess);
  apiResponseTime.add(Date.now() - loginStart);

  if (loginResponse.status === 200) {
    try {
      const loginData = JSON.parse(loginResponse.body);
      authToken = loginData.token;
    } catch (e) {
      console.error('Failed to parse login response:', e);
      authFailures.add(1);
      return;
    }
  } else {
    authFailures.add(1);
    errorRate.add(1);
    return;
  }

  // Sleep between requests
  sleep(1);

  // 2. Dashboard Data Load Test
  const dashboardStart = Date.now();
  const dashboardResponse = http.post(`${data.baseUrl}/graphql`, DASHBOARD_QUERY, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
  });

  check(dashboardResponse, {
    'Dashboard query successful': (r) => r.status === 200,
    'Dashboard has data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && body.data.dashboardStats;
      } catch (e) {
        return false;
      }
    },
  });

  apiResponseTime.add(Date.now() - dashboardStart);
  if (dashboardResponse.status !== 200) errorRate.add(1);

  sleep(2);

  // 3. Contractors List Load Test
  const contractorsStart = Date.now();
  const contractorsResponse = http.post(`${data.baseUrl}/graphql`, CONTRACTORS_QUERY, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
  });

  check(contractorsResponse, {
    'Contractors query successful': (r) => r.status === 200,
    'Contractors list returned': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && body.data.contractors && body.data.contractors.contractors;
      } catch (e) {
        return false;
      }
    },
  });

  apiResponseTime.add(Date.now() - contractorsStart);
  if (contractorsResponse.status !== 200) errorRate.add(1);

  sleep(1);

  // 4. Create Contractor Load Test (Only for admin users)
  if (user.role === 'admin' && Math.random() < 0.3) { // 30% chance to create contractor
    const createStart = Date.now();
    const createResponse = http.post(`${data.baseUrl}/graphql`, CREATE_CONTRACTOR_MUTATION, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
    });

    check(createResponse, {
      'Contractor creation successful': (r) => r.status === 200,
      'Contractor created': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.data && body.data.createContractor && body.data.createContractor.id;
        } catch (e) {
          return false;
        }
      },
    });

    apiResponseTime.add(Date.now() - createStart);
    if (createResponse.status !== 200) errorRate.add(1);
  }

  sleep(2);

  // 5. Frontend Load Test (Static Assets)
  const frontendStart = Date.now();
  const frontendResponse = http.get(`${data.frontendUrl}/static/css/main.css`);

  check(frontendResponse, {
    'Frontend CSS loads': (r) => r.status === 200,
  });

  if (frontendResponse.status !== 200) errorRate.add(1);

  sleep(1);

  // 6. API Health Check
  const healthStart = Date.now();
  const healthResponse = http.get(`${data.baseUrl}/health`);

  check(healthResponse, {
    'Health check successful': (r) => r.status === 200,
    'Health check response time < 100ms': (r) => r.timings.duration < 100,
  });

  apiResponseTime.add(Date.now() - healthStart);
  if (healthResponse.status !== 200) errorRate.add(1);

  // Random sleep between 1-5 seconds to simulate user behavior
  sleep(Math.random() * 4 + 1);
}

export function teardown(data) {
  console.log('Tearing down load test environment...');

  // Cleanup any test data created during load testing
  // This would typically involve calling cleanup APIs

  // Final health check
  const finalHealthCheck = http.get(`${data.baseUrl}/health`);
  console.log(`Final health check status: ${finalHealthCheck.status}`);
}

// Stress test scenarios
export const stressTestOptions = {
  stages: [
    { duration: '1m', target: 50 },   // Quick ramp-up
    { duration: '5m', target: 500 },  // High load
    { duration: '2m', target: 1000 }, // Extreme load
    { duration: '1m', target: 0 },    // Quick ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'], // Relaxed for stress test
    http_req_failed: ['rate<0.10'], // Allow higher error rate
  },
};

// Spike test scenarios
export const spikeTestOptions = {
  stages: [
    { duration: '30s', target: 10 },  // Normal load
    { duration: '1m', target: 300 },  // Sudden spike
    { duration: '30s', target: 10 },  // Back to normal
    { duration: '1m', target: 300 },  // Another spike
    { duration: '30s', target: 0 },   // Complete ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.15'],
  },
};

// Volume test scenarios
export const volumeTestOptions = {
  stages: [
    { duration: '5m', target: 100 },  // Steady load
    { duration: '60m', target: 100 }, // Extended duration
    { duration: '5m', target: 0 },    // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.05'],
  },
};
