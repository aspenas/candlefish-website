import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomString, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const errorRate = new Rate('error_rate');
const apiResponseTime = new Trend('api_response_time');
const loginAttempts = new Counter('login_attempts');
const documentOperations = new Counter('document_operations');

// Test configuration
export const options = {
  stages: [
    // Ramp-up
    { duration: '2m', target: 20 }, // Ramp up to 20 users over 2 minutes
    { duration: '5m', target: 50 }, // Stay at 50 users for 5 minutes
    { duration: '2m', target: 100 }, // Ramp up to 100 users over 2 minutes
    { duration: '5m', target: 100 }, // Stay at 100 users for 5 minutes
    { duration: '2m', target: 200 }, // Ramp up to 200 users over 2 minutes
    { duration: '10m', target: 200 }, // Stay at 200 users for 10 minutes

    // Ramp-down
    { duration: '2m', target: 50 }, // Ramp down to 50 users over 2 minutes
    { duration: '2m', target: 0 },   // Ramp down to 0 users over 2 minutes
  ],

  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.02'],   // Error rate must be below 2%
    error_rate: ['rate<0.05'],        // Custom error rate must be below 5%
    api_response_time: ['p(95)<300'], // 95% of API calls under 300ms
  },
};

// Base URL configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const API_URL = `${BASE_URL}/api`;
const GRAPHQL_URL = `${BASE_URL}/graphql`;

// Test data
const testUsers = [
  { email: 'load-test-1@candlefish.ai', password: 'loadtest123' },
  { email: 'load-test-2@candlefish.ai', password: 'loadtest123' },
  { email: 'load-test-3@candlefish.ai', password: 'loadtest123' },
  { email: 'load-test-4@candlefish.ai', password: 'loadtest123' },
  { email: 'load-test-5@candlefish.ai', password: 'loadtest123' },
];

// Helper functions
function authenticate() {
  const user = testUsers[randomIntBetween(0, testUsers.length - 1)];

  const loginPayload = {
    email: user.email,
    password: user.password,
  };

  const loginResponse = http.post(
    `${API_URL}/auth/login`,
    JSON.stringify(loginPayload),
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  loginAttempts.add(1);

  const loginSuccess = check(loginResponse, {
    'login status is 200': (r) => r.status === 200,
    'login response has token': (r) => {
      const body = JSON.parse(r.body);
      return body.token !== undefined;
    },
  });

  if (loginSuccess) {
    const loginData = JSON.parse(loginResponse.body);
    return {
      token: loginData.token,
      user: loginData.user,
    };
  }

  errorRate.add(1);
  return null;
}

function getAuthHeaders(token) {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

function makeGraphQLRequest(query, variables = {}, token = null) {
  const payload = {
    query,
    variables,
  };

  const headers = token ? getAuthHeaders(token) : {
    'Content-Type': 'application/json',
  };

  const response = http.post(
    GRAPHQL_URL,
    JSON.stringify(payload),
    { headers }
  );

  apiResponseTime.add(response.timings.duration);

  return response;
}

// Main test function
export default function () {
  // Authenticate user
  const authData = authenticate();

  if (!authData) {
    console.error('Authentication failed');
    return;
  }

  const { token, user } = authData;

  group('Document Operations', () => {
    // Get documents list
    group('List Documents', () => {
      const query = `
        query GetDocuments($organizationId: ID!, $limit: Int, $offset: Int) {
          documents(organizationId: $organizationId, limit: $limit, offset: $offset) {
            id
            title
            content
            status
            author {
              id
              name
            }
            createdAt
            updatedAt
          }
        }
      `;

      const variables = {
        organizationId: user.organizationId,
        limit: 20,
        offset: 0,
      };

      const response = makeGraphQLRequest(query, variables, token);

      check(response, {
        'documents query successful': (r) => r.status === 200,
        'documents response has data': (r) => {
          const body = JSON.parse(r.body);
          return body.data && body.data.documents;
        },
      }) || errorRate.add(1);

      documentOperations.add(1, { operation: 'read' });
    });

    sleep(randomIntBetween(1, 3));

    // Create new document
    group('Create Document', () => {
      const mutation = `
        mutation CreateDocument($input: CreateDocumentInput!) {
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

      const variables = {
        input: {
          title: `Load Test Document ${randomString(8)}`,
          content: `This is a document created during load testing. Random content: ${randomString(50)}`,
          organizationId: user.organizationId,
          status: 'DRAFT',
        },
      };

      const response = makeGraphQLRequest(mutation, variables, token);

      const success = check(response, {
        'document creation successful': (r) => r.status === 200,
        'document creation has id': (r) => {
          const body = JSON.parse(r.body);
          return body.data && body.data.createDocument && body.data.createDocument.id;
        },
      });

      if (!success) {
        errorRate.add(1);
      } else {
        // Store created document ID for later operations
        const responseBody = JSON.parse(response.body);
        const documentId = responseBody.data.createDocument.id;

        // Update the document
        sleep(randomIntBetween(1, 2));

        const updateMutation = `
          mutation UpdateDocument($id: ID!, $input: UpdateDocumentInput!) {
            updateDocument(id: $id, input: $input) {
              id
              title
              content
              status
              updatedAt
            }
          }
        `;

        const updateVariables = {
          id: documentId,
          input: {
            title: `Updated Load Test Document ${randomString(8)}`,
            content: `This document was updated during load testing. Updated content: ${randomString(75)}`,
            status: 'REVIEW',
          },
        };

        const updateResponse = makeGraphQLRequest(updateMutation, updateVariables, token);

        check(updateResponse, {
          'document update successful': (r) => r.status === 200,
          'document update has updated timestamp': (r) => {
            const body = JSON.parse(r.body);
            return body.data && body.data.updateDocument && body.data.updateDocument.updatedAt;
          },
        }) || errorRate.add(1);

        documentOperations.add(1, { operation: 'update' });

        // Sometimes delete the document (30% chance)
        if (Math.random() < 0.3) {
          sleep(randomIntBetween(1, 2));

          const deleteMutation = `
            mutation DeleteDocument($id: ID!) {
              deleteDocument(id: $id)
            }
          `;

          const deleteResponse = makeGraphQLRequest(
            deleteMutation,
            { id: documentId },
            token
          );

          check(deleteResponse, {
            'document deletion successful': (r) => r.status === 200,
          }) || errorRate.add(1);

          documentOperations.add(1, { operation: 'delete' });
        }
      }

      documentOperations.add(1, { operation: 'create' });
    });

    sleep(randomIntBetween(1, 3));
  });

  // User profile operations
  group('User Profile', () => {
    const query = `
      query GetCurrentUser {
        me {
          id
          name
          email
          role
          organization {
            id
            name
          }
        }
      }
    `;

    const response = makeGraphQLRequest(query, {}, token);

    check(response, {
      'user profile query successful': (r) => r.status === 200,
      'user profile has data': (r) => {
        const body = JSON.parse(r.body);
        return body.data && body.data.me;
      },
    }) || errorRate.add(1);
  });

  // Search operations
  group('Search', () => {
    const searchTerms = ['test', 'document', 'load', 'content', 'draft'];
    const searchTerm = searchTerms[randomIntBetween(0, searchTerms.length - 1)];

    const query = `
      query SearchDocuments($organizationId: ID!, $query: String!) {
        searchDocuments(organizationId: $organizationId, query: $query) {
          id
          title
          content
          status
          author {
            name
          }
        }
      }
    `;

    const variables = {
      organizationId: user.organizationId,
      query: searchTerm,
    };

    const response = makeGraphQLRequest(query, variables, token);

    check(response, {
      'search query successful': (r) => r.status === 200,
      'search response has results': (r) => {
        const body = JSON.parse(r.body);
        return body.data && Array.isArray(body.data.searchDocuments);
      },
    }) || errorRate.add(1);
  });

  // Random sleep to simulate real user behavior
  sleep(randomIntBetween(2, 5));
}

// Setup function
export function setup() {
  console.log('Setting up load test...');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`API URL: ${API_URL}`);
  console.log(`GraphQL URL: ${GRAPHQL_URL}`);

  // Verify that the API is accessible
  const healthCheck = http.get(`${API_URL}/health`);

  if (healthCheck.status !== 200) {
    console.error('API health check failed!');
    console.error(`Status: ${healthCheck.status}`);
    console.error(`Body: ${healthCheck.body}`);
  }

  return {
    apiHealthy: healthCheck.status === 200,
  };
}

// Teardown function
export function teardown(data) {
  console.log('Tearing down load test...');
  console.log('Test summary:');
  console.log(`- API was healthy at start: ${data.apiHealthy}`);
}

// Handle summary
export function handleSummary(data) {
  return {
    'load-test-summary.json': JSON.stringify(data, null, 2),
    stdout: `
========================================
LOAD TEST SUMMARY
========================================

Test Duration: ${data.metrics.iteration_duration.avg}ms
Total Requests: ${data.metrics.http_reqs.count}
Failed Requests: ${data.metrics.http_req_failed.values}
Request Rate: ${data.metrics.http_reqs.rate}/s

Response Times:
- Average: ${Math.round(data.metrics.http_req_duration.avg)}ms
- 95th Percentile: ${Math.round(data.metrics['http_req_duration{expected_response:true}'].p95)}ms
- 99th Percentile: ${Math.round(data.metrics['http_req_duration{expected_response:true}'].p99)}ms

Custom Metrics:
- Login Attempts: ${data.metrics.login_attempts.count}
- Document Operations: ${data.metrics.document_operations.count}
- Error Rate: ${(data.metrics.error_rate.rate * 100).toFixed(2)}%

Threshold Results:
${Object.entries(data.thresholds || {})
  .map(([key, result]) => `- ${key}: ${result.ok ? 'PASS' : 'FAIL'}`)
  .join('\n')}

========================================
`,
  };
}
