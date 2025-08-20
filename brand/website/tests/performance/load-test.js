import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
export const errorRate = new Rate('errors');
export const responseTimeTrend = new Trend('response_time', true);

// Test configuration
export const options = {
  scenarios: {
    // Smoke test - basic functionality
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '1m',
      tags: { test_type: 'smoke' },
    },
    
    // Load test - normal expected load
    load: {
      executor: 'constant-vus',
      vus: 10,
      duration: '5m',
      tags: { test_type: 'load' },
      startTime: '1m',
    },
    
    // Stress test - beyond normal capacity
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 20 },
        { duration: '5m', target: 20 },
        { duration: '2m', target: 40 },
        { duration: '5m', target: 40 },
        { duration: '2m', target: 0 },
      ],
      tags: { test_type: 'stress' },
      startTime: '6m',
    },
    
    // Spike test - sudden traffic increase
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 100 },
        { duration: '1m', target: 100 },
        { duration: '10s', target: 0 },
      ],
      tags: { test_type: 'spike' },
      startTime: '16m',
    }
  },
  
  thresholds: {
    http_req_duration: ['p(99)<2000'], // 99% of requests must complete below 2s
    http_req_failed: ['rate<0.1'], // Error rate must be below 10%
    response_time: ['p(95)<1500'], // 95% of response times below 1.5s
    errors: ['rate<0.05'], // Error rate below 5%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Test data
const testPaths = [
  '/',
  '/assessment',
  '/case-studies',
  '/insights',
];

const assessmentAnswers = [
  { questionId: 'q1', value: 3 },
  { questionId: 'q2', value: 2 },
  { questionId: 'q3', value: [1, 2] },
  { questionId: 'q4', value: 3 },
  { questionId: 'q5', value: 2 },
  { questionId: 'q6', value: 3 },
  { questionId: 'q7', value: 2 },
  { questionId: 'q8', value: 3 },
];

export default function () {
  // Homepage load test
  testPageLoad('/', 'Homepage');
  
  // Assessment page load test
  testPageLoad('/assessment', 'Assessment Page');
  
  // API endpoint tests
  testApiEndpoints();
  
  // Assessment submission test
  testAssessmentSubmission();
  
  // Case studies page
  testPageLoad('/case-studies', 'Case Studies');
  
  // Static resources test
  testStaticResources();
  
  sleep(1);
}

function testPageLoad(path, pageName) {
  const response = http.get(`${BASE_URL}${path}`, {
    tags: { page: pageName },
  });
  
  const success = check(response, {
    [`${pageName}: status is 200`]: (r) => r.status === 200,
    [`${pageName}: response time < 2s`]: (r) => r.timings.duration < 2000,
    [`${pageName}: has content`]: (r) => r.body.length > 0,
    [`${pageName}: content type is HTML`]: (r) => 
      r.headers['Content-Type'] && r.headers['Content-Type'].includes('text/html'),
  });
  
  errorRate.add(!success);
  responseTimeTrend.add(response.timings.duration);
}

function testApiEndpoints() {
  const apiTests = [
    { endpoint: '/api/v1/cms/pages', method: 'GET', name: 'CMS Pages API' },
    { endpoint: '/api/v1/case-studies', method: 'GET', name: 'Case Studies API' },
    { endpoint: '/api/v1/blog/posts', method: 'GET', name: 'Blog Posts API' },
  ];
  
  apiTests.forEach(test => {
    const response = http.request(test.method, `${BASE_URL}${test.endpoint}`, null, {
      headers: { 'Content-Type': 'application/json' },
      tags: { api: test.name },
    });
    
    const success = check(response, {
      [`${test.name}: status is 200 or 404`]: (r) => [200, 404].includes(r.status),
      [`${test.name}: response time < 1s`]: (r) => r.timings.duration < 1000,
    });
    
    errorRate.add(!success);
    responseTimeTrend.add(response.timings.duration);
  });
}

function testAssessmentSubmission() {
  const submissionData = {
    answers: assessmentAnswers,
    email: 'test@example.com',
    firstName: 'Load',
    lastName: 'Test',
    company: 'K6 Testing'
  };
  
  const response = http.post(
    `${BASE_URL}/api/v1/assessments/maturity-assessment/submit`,
    JSON.stringify(submissionData),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { api: 'Assessment Submission' },
    }
  );
  
  const success = check(response, {
    'Assessment submission: status is 200 or 201': (r) => [200, 201].includes(r.status),
    'Assessment submission: response time < 3s': (r) => r.timings.duration < 3000,
    'Assessment submission: has results': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.data && typeof body.data === 'object';
      } catch {
        return false;
      }
    },
  });
  
  errorRate.add(!success);
  responseTimeTrend.add(response.timings.duration);
}

function testStaticResources() {
  const staticResources = [
    '/favicon.ico',
    '/_next/static/css/app.css',
    '/_next/static/js/main.js',
  ];
  
  staticResources.forEach(resource => {
    const response = http.get(`${BASE_URL}${resource}`, {
      tags: { resource: 'static' },
    });
    
    check(response, {
      [`Static resource ${resource}: loads successfully`]: (r) => 
        [200, 304].includes(r.status), // 200 or 304 (not modified)
      [`Static resource ${resource}: response time < 1s`]: (r) => 
        r.timings.duration < 1000,
    });
  });
}

// Teardown function - runs after all iterations
export function teardown(data) {
  console.log('Load test completed');
  console.log(`Total requests: ${data ? data.requestCount : 'unknown'}`);
}

// Setup function - runs before test starts
export function setup() {
  console.log('Starting load test...');
  console.log(`Target URL: ${BASE_URL}`);
  
  // Verify the application is running
  const response = http.get(`${BASE_URL}/`);
  if (response.status !== 200) {
    throw new Error(`Application not available at ${BASE_URL}`);
  }
  
  return { baseUrl: BASE_URL };
}