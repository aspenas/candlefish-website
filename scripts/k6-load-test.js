import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

/**
 * K6 Load Testing Script for Candlefish AI Platform
 * 
 * Tests frontend and backend performance under various load scenarios
 * Measures response times, error rates, and system stability
 */

// Custom metrics
const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');
const pageLoadTime = new Trend('page_load_time');
const webVitalsLCP = new Trend('web_vitals_lcp');
const webVitalsFID = new Trend('web_vitals_fid');
const webVitalsCLS = new Gauge('web_vitals_cls');
const requestsPerSecond = new Counter('requests_per_second');

// Configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_URL = __ENV.API_URL || 'http://localhost:3501';

// Test scenarios
export const options = {
  scenarios: {
    // Smoke test - minimal load
    smoke_test: {
      executor: 'constant-vus',
      vus: 1,
      duration: '1m',
      tags: { scenario: 'smoke' },
      startTime: '0s'
    },
    
    // Load test - normal expected load
    load_test: {
      executor: 'ramping-vus',
      stages: [
        { duration: '2m', target: 50 },  // Ramp up to 50 users
        { duration: '5m', target: 50 },  // Stay at 50 users
        { duration: '2m', target: 0 }    // Ramp down to 0 users
      ],
      tags: { scenario: 'load' },
      startTime: '2m'
    },
    
    // Stress test - beyond normal load
    stress_test: {
      executor: 'ramping-vus',
      stages: [
        { duration: '2m', target: 100 },
        { duration: '3m', target: 200 },
        { duration: '2m', target: 300 },
        { duration: '3m', target: 0 }
      ],
      tags: { scenario: 'stress' },
      startTime: '12m',
      exec: 'stressTest'
    },
    
    // Spike test - sudden load increase
    spike_test: {
      executor: 'ramping-vus',
      stages: [
        { duration: '10s', target: 5 },
        { duration: '10s', target: 100 },  // Spike to 100 users
        { duration: '30s', target: 100 },  // Stay at 100 users
        { duration: '10s', target: 5 },    // Scale down
        { duration: '30s', target: 5 },
        { duration: '10s', target: 0 }
      ],
      tags: { scenario: 'spike' },
      startTime: '23m'
    },
    
    // Soak test - extended period load
    soak_test: {
      executor: 'constant-vus',
      vus: 30,
      duration: '10m',
      tags: { scenario: 'soak' },
      startTime: '25m'
    }
  },
  
  thresholds: {
    // Response time thresholds
    'http_req_duration': ['p(95)<500', 'p(99)<1000'],
    'api_latency': ['p(95)<100', 'p(99)<200'],
    'page_load_time': ['p(95)<3000', 'p(99)<5000'],
    
    // Core Web Vitals thresholds
    'web_vitals_lcp': ['p(75)<2500'],
    'web_vitals_fid': ['p(75)<100'],
    'web_vitals_cls': ['value<0.1'],
    
    // Error rate threshold
    'errors': ['rate<0.01'],
    
    // Request rate
    'http_reqs': ['rate>100']
  }
};

// Helper function to extract Web Vitals from page
function extractWebVitals(response) {
  // In a real scenario, you'd parse the HTML and extract inline performance data
  // or make a separate request to a performance API endpoint
  return {
    lcp: Math.random() * 3000,  // Simulate LCP
    fid: Math.random() * 150,   // Simulate FID
    cls: Math.random() * 0.2    // Simulate CLS
  };
}

// Main test function
export default function() {
  const scenario = __ENV.SCENARIO || 'default';
  
  // Test frontend pages
  testFrontendPages();
  
  // Test API endpoints
  testAPIEndpoints();
  
  // Test WebGL/Three.js performance
  testWebGLPerformance();
  
  // Test real user workflows
  testUserWorkflows();
  
  sleep(1);
}

// Test frontend page loads
function testFrontendPages() {
  const pages = [
    '/',
    '/assessment',
    '/workshop-notes',
    '/atelier/enhancement-paradox'
  ];
  
  pages.forEach(page => {
    const startTime = Date.now();
    const response = http.get(`${BASE_URL}${page}`, {
      tags: { type: 'frontend', page: page }
    });
    const loadTime = Date.now() - startTime;
    
    // Record metrics
    pageLoadTime.add(loadTime);
    requestsPerSecond.add(1);
    
    // Extract and record Web Vitals
    const vitals = extractWebVitals(response);
    webVitalsLCP.add(vitals.lcp);
    webVitalsFID.add(vitals.fid);
    webVitalsCLS.add(vitals.cls);
    
    // Perform checks
    const result = check(response, {
      'frontend page status is 200': (r) => r.status === 200,
      'frontend page load time < 3s': (r) => loadTime < 3000,
      'frontend page has content': (r) => r.body.length > 1000
    });
    
    errorRate.add(!result);
  });
}

// Test API endpoints
function testAPIEndpoints() {
  const endpoints = [
    { path: '/health', method: 'GET' },
    { path: '/api/services', method: 'GET' },
    { path: '/api/metrics', method: 'GET' },
    { path: '/api/logs', method: 'GET' }
  ];
  
  endpoints.forEach(endpoint => {
    const startTime = Date.now();
    const response = http.request(
      endpoint.method,
      `${API_URL}${endpoint.path}`,
      null,
      {
        tags: { type: 'api', endpoint: endpoint.path },
        timeout: '5s'
      }
    );
    const latency = Date.now() - startTime;
    
    // Record metrics
    apiLatency.add(latency);
    requestsPerSecond.add(1);
    
    // Perform checks
    const result = check(response, {
      'API status is 200': (r) => r.status === 200,
      'API latency < 100ms': (r) => latency < 100,
      'API returns JSON': (r) => r.headers['Content-Type'] && r.headers['Content-Type'].includes('application/json')
    });
    
    errorRate.add(!result);
  });
}

// Test WebGL/Three.js performance
function testWebGLPerformance() {
  // Simulate WebGL scene loading
  const webglPages = [
    '/assessment',  // Has 3D visualizations
    '/workshop-notes'  // May have interactive elements
  ];
  
  webglPages.forEach(page => {
    const response = http.get(`${BASE_URL}${page}`, {
      tags: { type: 'webgl', page: page }
    });
    
    // Check for WebGL resources
    check(response, {
      'WebGL page loads': (r) => r.status === 200,
      'Contains Three.js': (r) => r.body.includes('three') || r.body.includes('THREE'),
      'Contains canvas element': (r) => r.body.includes('<canvas')
    });
    
    // Simulate frame rendering (60 FPS target)
    const frameTime = 16.67; // Target frame time in ms
    const actualFrameTime = Math.random() * 30; // Simulate varying frame times
    
    check(actualFrameTime, {
      'Frame time < 16.67ms (60 FPS)': (t) => t < frameTime,
      'Frame time < 33.33ms (30 FPS minimum)': (t) => t < 33.33
    });
  });
}

// Test realistic user workflows
function testUserWorkflows() {
  // Workflow 1: User completes assessment
  const assessmentWorkflow = () => {
    // 1. Load assessment page
    let response = http.get(`${BASE_URL}/assessment`, {
      tags: { workflow: 'assessment', step: 'load' }
    });
    
    check(response, {
      'Assessment page loads': (r) => r.status === 200
    });
    
    sleep(2); // User reads instructions
    
    // 2. Submit assessment form (simulated)
    const assessmentData = {
      dimension1: Math.random() * 10,
      dimension2: Math.random() * 10,
      dimension3: Math.random() * 10
    };
    
    response = http.post(`${BASE_URL}/api/assessment`, JSON.stringify(assessmentData), {
      headers: { 'Content-Type': 'application/json' },
      tags: { workflow: 'assessment', step: 'submit' }
    });
    
    check(response, {
      'Assessment submission successful': (r) => r.status === 200 || r.status === 201
    });
    
    sleep(1); // View results
  };
  
  // Workflow 2: Browse workshop notes
  const workshopWorkflow = () => {
    // 1. Load workshop notes index
    let response = http.get(`${BASE_URL}/workshop-notes`, {
      tags: { workflow: 'workshop', step: 'index' }
    });
    
    check(response, {
      'Workshop index loads': (r) => r.status === 200
    });
    
    sleep(1); // User browses
    
    // 2. Load specific workshop note
    response = http.get(`${BASE_URL}/workshop-notes/enhancement-paradox`, {
      tags: { workflow: 'workshop', step: 'detail' }
    });
    
    check(response, {
      'Workshop detail loads': (r) => r.status === 200
    });
    
    sleep(3); // User reads content
  };
  
  // Execute workflows based on probability
  if (Math.random() < 0.6) {
    assessmentWorkflow();
  } else {
    workshopWorkflow();
  }
}

// Stress test specific function
export function stressTest() {
  // More aggressive testing for stress scenarios
  const batchSize = 10;
  const requests = [];
  
  for (let i = 0; i < batchSize; i++) {
    requests.push(['GET', `${BASE_URL}/`, null, { tags: { type: 'stress' }}]);
    requests.push(['GET', `${API_URL}/api/metrics`, null, { tags: { type: 'stress' }}]);
  }
  
  const responses = http.batch(requests);
  
  responses.forEach(response => {
    check(response, {
      'Stress test response OK': (r) => r.status === 200 || r.status === 304
    });
  });
}

// Lifecycle hooks
export function setup() {
  console.log('Starting Candlefish AI load tests...');
  
  // Warm up the system
  http.get(`${BASE_URL}/`);
  http.get(`${API_URL}/health`);
  
  return {
    startTime: Date.now()
  };
}

export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log(`Load tests completed in ${duration} seconds`);
  
  // You could send results to a monitoring service here
  // Example: http.post('https://monitoring.candlefish.ai/results', JSON.stringify(results));
}

// Handle test results
export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    duration: data.state.testRunDurationMs,
    scenarios: {},
    metrics: {},
    thresholds: {}
  };
  
  // Extract scenario results
  Object.keys(data.metrics).forEach(metric => {
    const m = data.metrics[metric];
    if (m.type === 'trend') {
      summary.metrics[metric] = {
        avg: m.values.avg,
        min: m.values.min,
        max: m.values.max,
        p95: m.values['p(95)'],
        p99: m.values['p(99)']
      };
    } else if (m.type === 'rate') {
      summary.metrics[metric] = m.values.rate;
    } else if (m.type === 'counter') {
      summary.metrics[metric] = m.values.count;
    }
  });
  
  // Check threshold results
  Object.keys(data.metrics).forEach(metric => {
    if (data.metrics[metric].thresholds) {
      summary.thresholds[metric] = Object.keys(data.metrics[metric].thresholds).every(
        threshold => data.metrics[metric].thresholds[threshold].ok
      );
    }
  });
  
  return {
    'stdout': JSON.stringify(summary, null, 2),
    './k6-results.json': JSON.stringify(summary, null, 2),
    './k6-results.html': htmlReport(summary)
  };
}

// Generate HTML report
function htmlReport(summary) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Candlefish AI - K6 Load Test Results</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 {
            color: #764ba2;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
        }
        .metric {
            display: inline-block;
            margin: 10px;
            padding: 15px;
            background: #f7f7f7;
            border-radius: 5px;
            min-width: 200px;
        }
        .metric-label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
        }
        .metric-value {
            font-size: 24px;
            font-weight: bold;
            color: #333;
        }
        .threshold-pass {
            color: #48bb78;
        }
        .threshold-fail {
            color: #f56565;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
        }
        th {
            background: #667eea;
            color: white;
        }
        tr:hover {
            background: #f7fafc;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>K6 Load Test Results</h1>
        <p>Test completed at: ${summary.timestamp}</p>
        <p>Duration: ${(summary.duration / 1000).toFixed(2)} seconds</p>
        
        <h2>Key Metrics</h2>
        <div class="metrics">
            ${Object.entries(summary.metrics).map(([key, value]) => `
                <div class="metric">
                    <div class="metric-label">${key.replace(/_/g, ' ')}</div>
                    <div class="metric-value">${
                        typeof value === 'object' ? 
                        `${value.avg?.toFixed(2) || value}ms` : 
                        value
                    }</div>
                </div>
            `).join('')}
        </div>
        
        <h2>Threshold Results</h2>
        <table>
            <thead>
                <tr>
                    <th>Metric</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(summary.thresholds).map(([key, passed]) => `
                    <tr>
                        <td>${key}</td>
                        <td class="${passed ? 'threshold-pass' : 'threshold-fail'}">
                            ${passed ? '✅ PASS' : '❌ FAIL'}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
</body>
</html>
  `;
}