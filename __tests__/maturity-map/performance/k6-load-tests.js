import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend, Gauge } from 'k6/metrics';
import { randomString, randomIntBetween, randomItem } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// Custom metrics for maturity map specific operations
const assessmentCreations = new Counter('assessment_creations');
const documentUploads = new Counter('document_uploads');
const responseSubmissions = new Counter('response_submissions');
const syncOperations = new Counter('sync_operations');
const assessmentCompletions = new Counter('assessment_completions');

const documentProcessingTime = new Trend('document_processing_time');
const assessmentLoadTime = new Trend('assessment_load_time');
const syncLatency = new Trend('sync_latency');
const websocketConnectTime = new Trend('websocket_connect_time');

const activeUsers = new Gauge('active_concurrent_users');
const memoryUsage = new Gauge('memory_usage_mb');

// Test configuration options
export const options = {
  stages: [
    // Ramp-up: gradually increase to target load
    { duration: '2m', target: 50 },   // Ramp up to 50 users over 2 minutes
    { duration: '5m', target: 100 },  // Ramp up to 100 users over next 5 minutes
    { duration: '10m', target: 200 }, // Ramp up to 200 users over next 10 minutes
    { duration: '15m', target: 500 }, // Ramp up to 500 users over next 15 minutes
    { duration: '20m', target: 1000 }, // Peak load: 1000 concurrent users
    { duration: '10m', target: 1000 }, // Sustain peak load for 10 minutes
    { duration: '5m', target: 500 },  // Ramp down to 500 users
    { duration: '3m', target: 200 },  // Ramp down to 200 users
    { duration: '2m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    // Performance thresholds
    http_req_duration: ['p(95)<500'], // 95% of requests should be under 500ms
    http_req_failed: ['rate<0.01'],   // Error rate should be less than 1%
    
    // GraphQL specific thresholds
    'http_req_duration{name:GetAssessments}': ['p(95)<200'],
    'http_req_duration{name:CreateAssessment}': ['p(95)<1000'],
    'http_req_duration{name:SubmitResponse}': ['p(95)<300'],
    'http_req_duration{name:UploadDocument}': ['p(95)<5000'],
    
    // Custom metric thresholds
    assessment_load_time: ['p(95)<300'],
    document_processing_time: ['p(95)<10000'], // 10 seconds for document processing
    sync_latency: ['p(95)<1000'],
    websocket_connect_time: ['p(95)<2000'],
    
    // Throughput thresholds
    assessment_creations: ['count>100'],
    response_submissions: ['count>1000'],
  },
  ext: {
    loadimpact: {
      distribution: {
        'amazon:us:ashburn': { loadZone: 'amazon:us:ashburn', percent: 50 },
        'amazon:eu:dublin': { loadZone: 'amazon:eu:dublin', percent: 30 },
        'amazon:ap:singapore': { loadZone: 'amazon:ap:singapore', percent: 20 },
      },
    },
  },
};

// Test data
const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const WS_URL = BASE_URL.replace('http', 'ws') + '/ws';

const ASSESSMENT_TEMPLATES = [
  'template-security-1',
  'template-privacy-1', 
  'template-compliance-1',
  'template-risk-1'
];

const ORGANIZATIONS = [
  'org-load-test-1',
  'org-load-test-2', 
  'org-load-test-3',
  'org-load-test-4',
  'org-load-test-5'
];

const SAMPLE_RESPONSES = [
  { questionId: 'q1', selectedValue: 1, comments: 'Basic implementation in place' },
  { questionId: 'q2', selectedValue: 2, comments: 'Partially implemented with room for improvement' },
  { questionId: 'q3', selectedValue: 3, comments: 'Well implemented with regular reviews' },
  { questionId: 'q4', selectedValue: 4, comments: 'Comprehensive implementation with continuous monitoring' },
];

// Authentication helper
function authenticate() {
  const loginPayload = {
    query: `
      mutation Login($email: String!, $password: String!) {
        login(email: $email, password: $password) {
          token
          user {
            id
            organizationId
          }
        }
      }
    `,
    variables: {
      email: `loadtest-user-${randomIntBetween(1, 100)}@example.com`,
      password: 'loadtest123'
    }
  };

  const response = http.post(`${BASE_URL}/graphql`, JSON.stringify(loginPayload), {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { name: 'Login' }
  });

  check(response, {
    'login successful': (r) => r.status === 200,
    'token received': (r) => {
      const body = JSON.parse(r.body);
      return body.data && body.data.login && body.data.login.token;
    }
  });

  if (response.status === 200) {
    const body = JSON.parse(response.body);
    return {
      token: body.data.login.token,
      userId: body.data.login.user.id,
      organizationId: body.data.login.user.organizationId
    };
  }
  
  return null;
}

// Assessment operations
function createAssessment(auth) {
  const createPayload = {
    query: `
      mutation CreateAssessment($input: CreateAssessmentInput!) {
        createAssessment(input: $input) {
          id
          title
          status
          questions {
            id
            text
            dimension
            options {
              value
              label
              score
            }
          }
        }
      }
    `,
    variables: {
      input: {
        title: `Load Test Assessment ${randomString(8)}`,
        organizationId: auth.organizationId,
        templateId: randomItem(ASSESSMENT_TEMPLATES),
        description: `Performance test assessment created at ${new Date().toISOString()}`
      }
    }
  };

  const startTime = Date.now();
  const response = http.post(`${BASE_URL}/graphql`, JSON.stringify(createPayload), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`
    },
    tags: { name: 'CreateAssessment' }
  });

  const duration = Date.now() - startTime;
  assessmentLoadTime.add(duration);

  check(response, {
    'assessment created': (r) => r.status === 200,
    'assessment has questions': (r) => {
      const body = JSON.parse(r.body);
      return body.data && body.data.createAssessment && body.data.createAssessment.questions.length > 0;
    }
  });

  if (response.status === 200) {
    assessmentCreations.add(1);
    const body = JSON.parse(response.body);
    return body.data.createAssessment;
  }

  return null;
}

function getAssessments(auth) {
  const query = {
    query: `
      query GetAssessments($organizationId: ID!, $first: Int) {
        assessments(organizationId: $organizationId, first: $first) {
          edges {
            node {
              id
              title
              status
              completionPercentage
              createdAt
              scores {
                dimension
                score
                level
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
          totalCount
        }
      }
    `,
    variables: {
      organizationId: auth.organizationId,
      first: 20
    }
  };

  const response = http.post(`${BASE_URL}/graphql`, JSON.stringify(query), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`
    },
    tags: { name: 'GetAssessments' }
  });

  check(response, {
    'assessments retrieved': (r) => r.status === 200,
    'pagination works': (r) => {
      const body = JSON.parse(r.body);
      return body.data && body.data.assessments && body.data.assessments.pageInfo;
    }
  });

  return response;
}

function submitAssessmentResponses(auth, assessment) {
  if (!assessment || !assessment.questions) return;

  const responses = assessment.questions.slice(0, randomIntBetween(1, assessment.questions.length))
    .map(question => ({
      questionId: question.id,
      selectedValue: randomIntBetween(1, 4),
      comments: `Load test response ${randomString(20)}`
    }));

  const mutation = {
    query: `
      mutation SubmitAssessmentResponse($input: SubmitResponseInput!) {
        submitAssessmentResponse(input: $input) {
          id
          completionPercentage
          status
          scores {
            dimension
            score
            level
          }
        }
      }
    `,
    variables: {
      input: {
        assessmentId: assessment.id,
        responses: responses
      }
    }
  };

  const response = http.post(`${BASE_URL}/graphql`, JSON.stringify(mutation), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`
    },
    tags: { name: 'SubmitResponse' }
  });

  check(response, {
    'responses submitted': (r) => r.status === 200,
    'completion percentage updated': (r) => {
      const body = JSON.parse(r.body);
      return body.data && body.data.submitAssessmentResponse && 
             body.data.submitAssessmentResponse.completionPercentage >= 0;
    }
  });

  if (response.status === 200) {
    responseSubmissions.add(responses.length);
    
    const body = JSON.parse(response.body);
    if (body.data.submitAssessmentResponse.completionPercentage === 100) {
      assessmentCompletions.add(1);
    }
  }

  return response;
}

function uploadDocument(auth, assessmentId) {
  // Simulate document upload with mock PDF content
  const documentContent = randomString(1024 * randomIntBetween(10, 100)); // 10KB to 100KB
  
  const formData = {
    operations: JSON.stringify({
      query: `
        mutation UploadAssessmentDocument($input: UploadDocumentInput!) {
          uploadAssessmentDocument(input: $input) {
            id
            filename
            size
            processingStatus
            uploadedAt
          }
        }
      `,
      variables: {
        input: {
          assessmentId: assessmentId,
          file: null
        }
      }
    }),
    map: JSON.stringify({ "0": ["variables.input.file"] }),
    "0": http.file(documentContent, `loadtest-document-${randomString(8)}.pdf`, 'application/pdf')
  };

  const startTime = Date.now();
  const response = http.post(`${BASE_URL}/graphql`, formData, {
    headers: {
      'Authorization': `Bearer ${auth.token}`
    },
    tags: { name: 'UploadDocument' }
  });

  const uploadTime = Date.now() - startTime;
  documentProcessingTime.add(uploadTime);

  check(response, {
    'document uploaded': (r) => r.status === 200,
    'upload response valid': (r) => {
      const body = JSON.parse(r.body);
      return body.data && body.data.uploadAssessmentDocument;
    }
  });

  if (response.status === 200) {
    documentUploads.add(1);
  }

  return response;
}

function testWebSocketConnection(auth) {
  const wsUrl = `${WS_URL}/assessment-updates`;
  
  const startTime = Date.now();
  const res = ws.connect(wsUrl, {
    headers: {
      'Authorization': `Bearer ${auth.token}`
    }
  }, function (socket) {
    websocketConnectTime.add(Date.now() - startTime);
    
    socket.on('open', function () {
      // Subscribe to assessment updates
      socket.send(JSON.stringify({
        type: 'subscribe',
        payload: {
          query: `
            subscription AssessmentProgress($organizationId: ID!) {
              assessmentProgress(organizationId: $organizationId) {
                assessmentId
                completionPercentage
                participantCount
              }
            }
          `,
          variables: {
            organizationId: auth.organizationId
          }
        }
      }));
    });

    socket.on('message', function (data) {
      const message = JSON.parse(data);
      check(message, {
        'websocket message valid': (msg) => msg.type && msg.payload
      });
    });

    socket.on('error', function (e) {
      console.error('WebSocket error:', e);
    });

    // Keep connection alive for a short time
    sleep(randomIntBetween(5, 15));
    socket.close();
  });

  check(res, {
    'websocket connected': (r) => r && r.status === 101
  });
}

function simulateOfflineSync(auth) {
  const offlineChanges = Array.from({ length: randomIntBetween(1, 10) }, () => ({
    type: 'UPDATE_RESPONSE',
    assessmentId: `assessment-${randomString(8)}`,
    questionId: `q${randomIntBetween(1, 20)}`,
    selectedValue: randomIntBetween(1, 4),
    timestamp: new Date(Date.now() - randomIntBetween(1, 3600) * 1000).toISOString(),
    deviceId: `device-${randomString(12)}`
  }));

  const syncMutation = {
    query: `
      mutation SyncOfflineChanges($changes: [OfflineChangeInput!]!) {
        syncOfflineChanges(changes: $changes) {
          success
          syncedChanges
          conflicts {
            changeId
            reason
          }
          errors {
            changeId
            message
          }
        }
      }
    `,
    variables: {
      changes: offlineChanges
    }
  };

  const startTime = Date.now();
  const response = http.post(`${BASE_URL}/graphql`, JSON.stringify(syncMutation), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`
    },
    tags: { name: 'SyncOfflineChanges' }
  });

  syncLatency.add(Date.now() - startTime);

  check(response, {
    'sync completed': (r) => r.status === 200,
    'sync results valid': (r) => {
      const body = JSON.parse(r.body);
      return body.data && body.data.syncOfflineChanges && 
             typeof body.data.syncOfflineChanges.success === 'boolean';
    }
  });

  if (response.status === 200) {
    syncOperations.add(1);
  }

  return response;
}

// Main test function
export default function () {
  // Track active users
  activeUsers.add(1);

  group('Authentication', function () {
    const auth = authenticate();
    if (!auth) return;

    group('Assessment Operations', function () {
      // Get existing assessments
      getAssessments(auth);
      
      // Create new assessment (30% of users)
      if (Math.random() < 0.3) {
        const assessment = createAssessment(auth);
        
        if (assessment) {
          // Submit responses to the assessment
          submitAssessmentResponses(auth, assessment);
          
          // Upload document (20% chance)
          if (Math.random() < 0.2) {
            uploadDocument(auth, assessment.id);
          }
        }
      }
      
      // Simulate offline sync (10% of users)
      if (Math.random() < 0.1) {
        simulateOfflineSync(auth);
      }
    });

    group('Real-time Features', function () {
      // Test WebSocket connections (15% of users)
      if (Math.random() < 0.15) {
        testWebSocketConnection(auth);
      }
    });

    group('Data Retrieval', function () {
      // Simulate browsing behavior
      if (Math.random() < 0.8) {
        getAssessments(auth);
      }

      // Get assessment details
      if (Math.random() < 0.4) {
        // This would be a separate query for assessment details
        // Simplified for load test
        getAssessments(auth);
      }
    });
  });

  // Simulate user think time
  sleep(randomIntBetween(1, 5));
}

// Setup function to initialize test data
export function setup() {
  console.log('Setting up load test environment...');
  
  // Create test organizations and users
  for (let i = 1; i <= 5; i++) {
    const setupPayload = {
      query: `
        mutation SetupLoadTest($input: SetupLoadTestInput!) {
          setupLoadTest(input: $input) {
            organizationId
            userCount
            assessmentCount
          }
        }
      `,
      variables: {
        input: {
          organizationId: `org-load-test-${i}`,
          userCount: 20,
          assessmentTemplates: ASSESSMENT_TEMPLATES
        }
      }
    };

    const response = http.post(`${BASE_URL}/graphql`, JSON.stringify(setupPayload), {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${__ENV.ADMIN_TOKEN}`
      }
    });

    if (response.status !== 200) {
      console.error(`Failed to setup test data for org ${i}:`, response.body);
    }
  }

  return {
    startTime: Date.now(),
    organizations: ORGANIZATIONS,
    templates: ASSESSMENT_TEMPLATES
  };
}

// Teardown function to clean up test data
export function teardown(data) {
  console.log('Cleaning up load test data...');
  console.log(`Test duration: ${(Date.now() - data.startTime) / 1000} seconds`);
  
  // Clean up test data
  const cleanupPayload = {
    query: `
      mutation CleanupLoadTest($organizationIds: [ID!]!) {
        cleanupLoadTest(organizationIds: $organizationIds) {
          deletedOrganizations
          deletedUsers
          deletedAssessments
        }
      }
    `,
    variables: {
      organizationIds: ORGANIZATIONS
    }
  };

  const response = http.post(`${BASE_URL}/graphql`, JSON.stringify(cleanupPayload), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${__ENV.ADMIN_TOKEN}`
    }
  });

  if (response.status === 200) {
    const result = JSON.parse(response.body);
    console.log('Cleanup completed:', result.data.cleanupLoadTest);
  } else {
    console.error('Cleanup failed:', response.body);
  }
}

// Memory monitoring (if available)
export function handleSummary(data) {
  const summary = {
    testDuration: data.state.testRunDurationMs / 1000,
    totalRequests: data.metrics.http_reqs.count,
    failedRequests: data.metrics.http_req_failed.count,
    averageResponseTime: data.metrics.http_req_duration.avg,
    p95ResponseTime: data.metrics['http_req_duration{p:0.95}'],
    requestsPerSecond: data.metrics.http_reqs.rate,
    
    // Custom metrics
    assessmentsCreated: data.metrics.assessment_creations?.count || 0,
    documentsUploaded: data.metrics.document_uploads?.count || 0,
    responsesSubmitted: data.metrics.response_submissions?.count || 0,
    syncOperations: data.metrics.sync_operations?.count || 0,
    assessmentsCompleted: data.metrics.assessment_completions?.count || 0,
    
    averageAssessmentLoadTime: data.metrics.assessment_load_time?.avg || 0,
    averageDocumentProcessingTime: data.metrics.document_processing_time?.avg || 0,
    averageSyncLatency: data.metrics.sync_latency?.avg || 0,
    
    thresholdFailures: Object.keys(data.thresholds || {}).filter(
      key => data.thresholds[key].ok === false
    )
  };

  return {
    'stdout': `
========================================
MATURITY MAP LOAD TEST SUMMARY
========================================
Test Duration: ${summary.testDuration}s
Total Requests: ${summary.totalRequests}
Failed Requests: ${summary.failedRequests} (${((summary.failedRequests / summary.totalRequests) * 100).toFixed(2)}%)
Requests/second: ${summary.requestsPerSecond.toFixed(2)}

Response Times:
- Average: ${summary.averageResponseTime.toFixed(2)}ms
- 95th percentile: ${summary.p95ResponseTime.toFixed(2)}ms

Business Metrics:
- Assessments Created: ${summary.assessmentsCreated}
- Documents Uploaded: ${summary.documentsUploaded}
- Responses Submitted: ${summary.responsesSubmitted}
- Sync Operations: ${summary.syncOperations}
- Assessments Completed: ${summary.assessmentsCompleted}

Performance Metrics:
- Avg Assessment Load Time: ${summary.averageAssessmentLoadTime.toFixed(2)}ms
- Avg Document Processing: ${summary.averageDocumentProcessingTime.toFixed(2)}ms
- Avg Sync Latency: ${summary.averageSyncLatency.toFixed(2)}ms

${summary.thresholdFailures.length > 0 ? 
  `THRESHOLD FAILURES:\n${summary.thresholdFailures.join('\n')}` : 
  'All thresholds passed ✓'
}
========================================
    `,
    'summary.json': JSON.stringify(summary, null, 2),
  };
}