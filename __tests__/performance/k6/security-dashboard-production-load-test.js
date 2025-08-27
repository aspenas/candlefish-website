import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Gauge, Counter } from 'k6/metrics';
import { randomItem, randomString } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';

// Custom metrics for detailed monitoring
const errorRate = new Rate('errors');
const responseTrend = new Trend('response_time');
const throughput = new Counter('requests_per_second');
const concurrentUsers = new Gauge('concurrent_users');
const authFailures = new Counter('auth_failures');
const securityEvents = new Counter('security_events_processed');
const databaseConnections = new Gauge('database_connections_active');
const memoryUsage = new Gauge('memory_usage_mb');
const cpuUsage = new Gauge('cpu_usage_percent');

// Production load test configuration for 1000+ concurrent users
export const options = {
  scenarios: {
    // Steady state load test - typical production traffic
    steady_state: {
      executor: 'constant-vus',
      vus: 500,
      duration: '10m',
      gracefulStop: '30s',
    },
    
    // Spike test - sudden traffic increase
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 100,
      stages: [
        { duration: '1m', target: 100 },
        { duration: '30s', target: 2000 }, // Sudden spike
        { duration: '2m', target: 2000 },  // Maintain spike
        { duration: '1m', target: 100 },   // Back to normal
      ],
      gracefulStop: '30s',
      startTime: '12m',
    },
    
    // Soak test - extended duration at moderate load
    soak_test: {
      executor: 'constant-vus',
      vus: 300,
      duration: '30m',
      gracefulStop: '30s',
      startTime: '15m',
    },
    
    // Breakpoint test - find system limits
    breakpoint_test: {
      executor: 'ramping-arrival-rate',
      preAllocatedVUs: 100,
      maxVUs: 5000,
      stages: [
        { duration: '5m', target: 100 },   // Start with 100 RPS
        { duration: '5m', target: 500 },   // Increase to 500 RPS
        { duration: '5m', target: 1000 },  // Increase to 1000 RPS
        { duration: '5m', target: 2000 },  // Increase to 2000 RPS
        { duration: '5m', target: 3000 },  // Find breaking point
      ],
      gracefulStop: '30s',
      startTime: '45m',
    },
  },
  
  // Production SLA thresholds
  thresholds: {
    // Response time requirements
    'http_req_duration': [
      'p(95)<500',    // 95% of requests under 500ms
      'p(99)<1000',   // 99% of requests under 1s
    ],
    
    // Error rate requirements
    'http_req_failed': ['rate<0.001'],  // Less than 0.1% error rate
    'errors': ['rate<0.001'],
    
    // Availability requirements
    'checks': ['rate>0.999'],  // 99.9% check success rate
    
    // Custom business metrics
    'security_events_processed': ['count>1000'],
    'auth_failures': ['count<50'],
    
    // Resource utilization
    'database_connections_active': ['value<80'],  // Max 80 DB connections
    'memory_usage_mb': ['value<1024'],            // Max 1GB memory
    'cpu_usage_percent': ['value<80'],            // Max 80% CPU
  },
  
  // Test configuration
  noConnectionReuse: false,
  userAgent: 'SecurityDashboard-LoadTest/1.0.0',
  discardResponseBodies: false,  // Keep response bodies for validation
};

const BASE_URL = __ENV.BASE_URL || 'https://security.candlefish.ai';
const API_BASE_URL = __ENV.API_BASE_URL || `${BASE_URL}/api`;
const GRAPHQL_URL = __ENV.GRAPHQL_URL || `${BASE_URL}/graphql`;
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'demo-token-for-load-testing';
const ENVIRONMENT = __ENV.ENVIRONMENT || 'production';

// Test data pools
const SECURITY_EVENT_TYPES = [
  'authentication_failure',
  'suspicious_login',
  'data_access_violation',
  'malware_detection',
  'network_intrusion',
  'privilege_escalation',
  'data_exfiltration',
  'ddos_attempt',
];

const SEVERITY_LEVELS = ['low', 'medium', 'high', 'critical'];
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
];

// Helper functions
function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'User-Agent': randomItem(USER_AGENTS),
    'Accept': 'application/json',
    'X-Request-ID': randomString(16),
    'X-Environment': ENVIRONMENT,
  };
}

function generateSecurityEvent() {
  return {
    id: randomString(12),
    type: randomItem(SECURITY_EVENT_TYPES),
    severity: randomItem(SEVERITY_LEVELS),
    timestamp: new Date().toISOString(),
    source_ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    user_id: `user_${randomString(8)}`,
    asset_id: `asset_${randomString(10)}`,
    description: `Security event detected: ${randomString(20)}`,
    metadata: {
      user_agent: randomItem(USER_AGENTS),
      geo_location: randomItem(['US', 'EU', 'APAC']),
      risk_score: Math.floor(Math.random() * 100),
      confidence: Math.random(),
    },
  };
}

function validateResponse(response, expectedStatus = 200, checkName = 'response validation') {
  const validations = {
    [`${checkName}: status is ${expectedStatus}`]: (r) => r.status === expectedStatus,
    [`${checkName}: response time < 5s`]: (r) => r.timings.duration < 5000,
    [`${checkName}: has response body`]: (r) => r.body && r.body.length > 0,
  };
  
  // Add content-type validation for JSON responses
  if (expectedStatus === 200) {
    validations[`${checkName}: content-type is JSON`] = (r) => 
      r.headers['Content-Type'] && r.headers['Content-Type'].includes('application/json');
  }
  
  const result = check(response, validations);
  
  // Update custom metrics
  errorRate.add(response.status >= 400);
  responseTrend.add(response.timings.duration);
  throughput.add(1);
  
  return result;
}

// Test scenarios
export function healthCheck() {
  group('Health Check', () => {
    const response = http.get(`${API_BASE_URL}/health`, {
      headers: getHeaders(),
      timeout: '10s',
    });
    
    validateResponse(response, 200, 'health check');
    
    // Parse health response for system metrics
    try {
      const health = JSON.parse(response.body);
      if (health.database) {
        databaseConnections.add(health.database.activeConnections || 0);
      }
      if (health.memory) {
        memoryUsage.add(health.memory.usedMB || 0);
      }
      if (health.cpu) {
        cpuUsage.add(health.cpu.percentage || 0);
      }
    } catch (e) {
      // Ignore parsing errors
    }
  });
}

export function authenticationFlow() {
  group('Authentication Flow', () => {
    // Login attempt
    const loginResponse = http.post(`${API_BASE_URL}/auth/login`, JSON.stringify({
      username: `testuser_${randomString(8)}`,
      password: 'test-password-123',
      mfa_token: '123456',
    }), {
      headers: getHeaders(),
      timeout: '15s',
    });
    
    const loginSuccess = validateResponse(loginResponse, 200, 'authentication');
    
    if (!loginSuccess) {
      authFailures.add(1);
    }
    
    // Token validation
    if (loginResponse.status === 200) {
      const tokenResponse = http.get(`${API_BASE_URL}/auth/validate`, {
        headers: {
          ...getHeaders(),
          'Authorization': `Bearer ${AUTH_TOKEN}`,
        },
        timeout: '10s',
      });
      
      validateResponse(tokenResponse, 200, 'token validation');
    }
  });
}

export function securityDashboardOverview() {
  group('Security Dashboard Overview', () => {
    // Main dashboard data
    const overviewResponse = http.get(`${API_BASE_URL}/security/overview`, {
      headers: getHeaders(),
      timeout: '15s',
    });
    
    validateResponse(overviewResponse, 200, 'dashboard overview');
    
    // Recent security events
    const eventsResponse = http.get(`${API_BASE_URL}/security/events?limit=50&sort=timestamp_desc`, {
      headers: getHeaders(),
      timeout: '10s',
    });
    
    validateResponse(eventsResponse, 200, 'recent events');
    
    // Security metrics
    const metricsResponse = http.get(`${API_BASE_URL}/security/metrics?timeframe=24h`, {
      headers: getHeaders(),
      timeout: '10s',
    });
    
    validateResponse(metricsResponse, 200, 'security metrics');
  });
}

export function securityEventProcessing() {
  group('Security Event Processing', () => {
    // Create new security event
    const event = generateSecurityEvent();
    
    const createResponse = http.post(`${API_BASE_URL}/security/events`, 
      JSON.stringify(event), {
        headers: getHeaders(),
        timeout: '15s',
      }
    );
    
    const createSuccess = validateResponse(createResponse, 201, 'event creation');
    
    if (createSuccess) {
      securityEvents.add(1);
      
      try {
        const createdEvent = JSON.parse(createResponse.body);
        const eventId = createdEvent.id;
        
        // Get the created event
        sleep(0.1); // Brief pause to allow processing
        
        const getResponse = http.get(`${API_BASE_URL}/security/events/${eventId}`, {
          headers: getHeaders(),
          timeout: '10s',
        });
        
        validateResponse(getResponse, 200, 'event retrieval');
        
        // Update event status
        const updateResponse = http.patch(`${API_BASE_URL}/security/events/${eventId}`, 
          JSON.stringify({ status: 'investigated' }), {
            headers: getHeaders(),
            timeout: '10s',
          }
        );
        
        validateResponse(updateResponse, 200, 'event update');
        
      } catch (e) {
        console.error('Error processing security event:', e);
      }
    }
  });
}

export function assetManagement() {
  group('Asset Management', () => {
    // Get asset list
    const assetsResponse = http.get(`${API_BASE_URL}/assets?page=1&limit=25`, {
      headers: getHeaders(),
      timeout: '10s',
    });
    
    validateResponse(assetsResponse, 200, 'assets list');
    
    // Create new asset
    const asset = {
      name: `server-${randomString(8)}`,
      type: randomItem(['server', 'workstation', 'mobile', 'iot']),
      ip_address: `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      environment: randomItem(['production', 'staging', 'development']),
      owner: `team-${randomString(5)}`,
      tags: [`env:${ENVIRONMENT}`, 'load-test'],
    };
    
    const createAssetResponse = http.post(`${API_BASE_URL}/assets`, 
      JSON.stringify(asset), {
        headers: getHeaders(),
        timeout: '15s',
      }
    );
    
    validateResponse(createAssetResponse, 201, 'asset creation');
  });
}

export function vulnerabilityAssessment() {
  group('Vulnerability Assessment', () => {
    // Get vulnerabilities overview
    const vulnOverviewResponse = http.get(`${API_BASE_URL}/vulnerabilities/overview`, {
      headers: getHeaders(),
      timeout: '15s',
    });
    
    validateResponse(vulnOverviewResponse, 200, 'vulnerabilities overview');
    
    // Get vulnerability list with filtering
    const vulnListResponse = http.get(
      `${API_BASE_URL}/vulnerabilities?severity=high&status=open&limit=20`, {
        headers: getHeaders(),
        timeout: '10s',
      }
    );
    
    validateResponse(vulnListResponse, 200, 'vulnerabilities list');
    
    // Vulnerability scan request
    const scanResponse = http.post(`${API_BASE_URL}/vulnerabilities/scan`, 
      JSON.stringify({ 
        asset_id: `asset_${randomString(10)}`,
        scan_type: 'full',
      }), {
        headers: getHeaders(),
        timeout: '20s',
      }
    );
    
    validateResponse(scanResponse, 202, 'vulnerability scan');
  });
}

export function complianceReporting() {
  group('Compliance Reporting', () => {
    // Get compliance dashboard
    const complianceResponse = http.get(`${API_BASE_URL}/compliance/dashboard`, {
      headers: getHeaders(),
      timeout: '15s',
    });
    
    validateResponse(complianceResponse, 200, 'compliance dashboard');
    
    // Generate compliance report
    const reportResponse = http.post(`${API_BASE_URL}/compliance/reports`, 
      JSON.stringify({
        framework: randomItem(['SOC2', 'ISO27001', 'PCI-DSS', 'GDPR']),
        date_range: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString(),
        },
        format: 'pdf',
      }), {
        headers: getHeaders(),
        timeout: '30s',
      }
    );
    
    validateResponse(reportResponse, 202, 'compliance report generation');
  });
}

export function graphQLQueries() {
  group('GraphQL Queries', () => {
    // Complex security metrics query
    const complexQueryResponse = http.post(GRAPHQL_URL, JSON.stringify({
      query: `
        query SecurityMetrics($startDate: DateTime!, $endDate: DateTime!) {
          securityMetrics(startDate: $startDate, endDate: $endDate) {
            totalEvents
            eventsByType {
              type
              count
              averageSeverity
            }
            eventsByHour {
              hour
              count
            }
            topVulnerableAssets(limit: 10) {
              assetId
              vulnerabilityCount
              criticalCount
            }
            complianceScore
            threatLevel
            riskTrend {
              date
              riskScore
            }
          }
          alerts(limit: 20) {
            id
            type
            severity
            timestamp
            status
          }
        }
      `,
      variables: {
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
      },
    }), {
      headers: getHeaders(),
      timeout: '20s',
    });
    
    validateResponse(complexQueryResponse, 200, 'complex GraphQL query');
    
    // Real-time subscription simulation
    const subscriptionResponse = http.post(GRAPHQL_URL, JSON.stringify({
      query: `
        subscription SecurityEventUpdates {
          securityEventAdded {
            id
            type
            severity
            timestamp
            description
          }
        }
      `,
    }), {
      headers: getHeaders(),
      timeout: '10s',
    });
    
    check(subscriptionResponse, {
      'GraphQL subscription response': (r) => r.status === 200 || r.status === 101, // WebSocket upgrade
    });
  });
}

// Main test execution
export default function () {
  // Update concurrent users metric
  concurrentUsers.add(__VU);
  
  // Distribute test scenarios based on user behavior patterns
  const scenarios = [
    { func: healthCheck, weight: 5 },
    { func: authenticationFlow, weight: 10 },
    { func: securityDashboardOverview, weight: 30 },
    { func: securityEventProcessing, weight: 20 },
    { func: assetManagement, weight: 15 },
    { func: vulnerabilityAssessment, weight: 10 },
    { func: complianceReporting, weight: 5 },
    { func: graphQLQueries, weight: 5 },
  ];
  
  // Weighted random selection
  const totalWeight = scenarios.reduce((sum, scenario) => sum + scenario.weight, 0);
  const random = Math.random() * totalWeight;
  let cumulativeWeight = 0;
  
  for (const scenario of scenarios) {
    cumulativeWeight += scenario.weight;
    if (random <= cumulativeWeight) {
      scenario.func();
      break;
    }
  }
  
  // Variable sleep based on user behavior simulation
  const sleepTime = Math.random() * 2 + 0.5; // 0.5-2.5 seconds
  sleep(sleepTime);
}

// Setup function - runs once before all VUs
export function setup() {
  console.log('🚀 Starting Security Dashboard Production Load Test');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`🎯 Target Environment: ${ENVIRONMENT}`);
  console.log(`⏱️  Test Duration: ${JSON.stringify(options.scenarios)}`);
  
  // Warm up the system
  const warmupResponse = http.get(`${API_BASE_URL}/health`);
  if (warmupResponse.status !== 200) {
    console.error('❌ System warmup failed. Check if the application is accessible.');
    throw new Error('System not ready for load testing');
  }
  
  console.log('✅ System warmup completed');
  
  return {
    startTime: new Date(),
    baseUrl: BASE_URL,
    environment: ENVIRONMENT,
  };
}

// Teardown function - runs once after all VUs complete
export function teardown(data) {
  const endTime = new Date();
  const duration = (endTime - data.startTime) / 1000;
  
  console.log('\n📊 Load Test Summary:');
  console.log(`⏱️  Total Duration: ${duration} seconds`);
  console.log(`🎯 Environment: ${data.environment}`);
  console.log(`📍 Base URL: ${data.baseUrl}`);
  console.log('\n🔍 Check detailed metrics in the HTML report');
  
  // System health check post-test
  const healthResponse = http.get(`${API_BASE_URL}/health`);
  if (healthResponse.status === 200) {
    console.log('✅ System is healthy after load test');
    
    try {
      const health = JSON.parse(healthResponse.body);
      console.log(`💾 Memory Usage: ${health.memory?.percentage || 'N/A'}%`);
      console.log(`⚙️  CPU Usage: ${health.cpu?.percentage || 'N/A'}%`);
      console.log(`🗄️  DB Connections: ${health.database?.activeConnections || 'N/A'}`);
    } catch (e) {
      console.log('ℹ️  Health details not available');
    }
  } else {
    console.log('⚠️  System health check failed after load test');
  }
}

// Generate HTML report
export function handleSummary(data) {
  return {
    'load-test-report.html': htmlReport(data),
    'load-test-results.json': JSON.stringify(data),
  };
}