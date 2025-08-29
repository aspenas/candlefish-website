import http from 'k6/http';
import ws from 'k6/ws';
import { check, group, sleep, fail } from 'k6';
import { Rate, Counter, Trend, Gauge } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import { randomIntBetween, randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Test configuration
export const options = {
  scenarios: {
    // Smoke test - verify basic functionality
    smoke_test: {
      executor: 'constant-vus',
      vus: 1,
      duration: '1m',
      tags: { test_type: 'smoke' },
      exec: 'smokeTest'
    },
    
    // Load test - normal expected load
    load_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5m', target: 100 },  // Ramp up
        { duration: '10m', target: 100 }, // Stay at 100 users
        { duration: '5m', target: 0 },    // Ramp down
      ],
      tags: { test_type: 'load' },
      exec: 'loadTest'
    },
    
    // Stress test - find breaking point
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '5m', target: 200 },
        { duration: '2m', target: 300 },
        { duration: '5m', target: 300 },
        { duration: '2m', target: 400 },
        { duration: '5m', target: 400 },
        { duration: '10m', target: 0 },
      ],
      tags: { test_type: 'stress' },
      exec: 'stressTest'
    },
    
    // Spike test - sudden load increases
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 100 },
        { duration: '1m', target: 100 },
        { duration: '10s', target: 1400 }, // Spike to 1400 users
        { duration: '3m', target: 1400 },
        { duration: '10s', target: 100 },
        { duration: '3m', target: 100 },
        { duration: '10s', target: 0 },
      ],
      tags: { test_type: 'spike' },
      exec: 'spikeTest'
    },
    
    // Volume test - large data processing
    volume_test: {
      executor: 'constant-vus',
      vus: 50,
      duration: '10m',
      tags: { test_type: 'volume' },
      exec: 'volumeTest'
    },
    
    // Soak test - extended duration
    soak_test: {
      executor: 'constant-vus',
      vus: 80,
      duration: '1h',
      tags: { test_type: 'soak' },
      exec: 'soakTest'
    },
    
    // Real-time WebSocket test
    websocket_test: {
      executor: 'constant-vus',
      vus: 200,
      duration: '10m',
      tags: { test_type: 'websocket' },
      exec: 'webSocketTest'
    },
    
    // API concurrency test
    api_concurrency: {
      executor: 'per-vu-iterations',
      vus: 100,
      iterations: 10,
      maxDuration: '10m',
      tags: { test_type: 'concurrency' },
      exec: 'apiConcurrencyTest'
    }
  },
  
  thresholds: {
    // Overall HTTP metrics
    'http_req_duration': ['p(95)<500', 'p(99)<1000'],
    'http_req_duration{expected_response:true}': ['p(95)<300'],
    'http_req_failed': ['rate<0.01'], // Less than 1% failures
    'http_reqs': ['rate>100'], // At least 100 requests per second
    
    // GraphQL specific
    'http_req_duration{name:GraphQL}': ['p(95)<400'],
    'graphql_errors': ['rate<0.005'], // Less than 0.5% GraphQL errors
    
    // WebSocket metrics
    'ws_connect_time': ['p(95)<200'],
    'ws_message_rate': ['rate>50'], // At least 50 messages per second
    
    // Database operations
    'db_query_duration': ['p(95)<100'],
    'db_connection_errors': ['rate<0.001'],
    
    // Memory and performance
    'memory_usage': ['value<85'], // Less than 85% memory usage
    'cpu_usage': ['value<80'], // Less than 80% CPU usage
    
    // Security tests
    'security_scan_failures': ['rate<0.1'],
    
    // Volume test specific
    'large_dataset_processing': ['p(95)<2000'],
    
    // Real-time processing
    'event_processing_latency': ['p(95)<50'], // 50ms for event processing
  }
};

// Custom metrics
const graphqlErrors = new Rate('graphql_errors');
const threatProcessingTime = new Trend('threat_processing_time');
const eventIngestionRate = new Rate('event_ingestion_rate');
const databaseConnections = new Gauge('database_connections');
const memoryUsage = new Gauge('memory_usage');
const cpuUsage = new Gauge('cpu_usage');
const securityScanFailures = new Rate('security_scan_failures');
const largeDatasetProcessing = new Trend('large_dataset_processing');
const eventProcessingLatency = new Trend('event_processing_latency');
const wsConnectTime = new Trend('ws_connect_time');
const wsMessageRate = new Rate('ws_message_rate');
const dbQueryDuration = new Trend('db_query_duration');
const dbConnectionErrors = new Rate('db_connection_errors');

// Test data
const testUsers = new SharedArray('users', function () {
  return [
    { username: 'analyst1', password: 'test123', role: 'SECURITY_ANALYST' },
    { username: 'admin1', password: 'test123', role: 'ADMIN' },
    { username: 'engineer1', password: 'test123', role: 'SECURITY_ENGINEER' },
  ];
});

const threatTypes = ['MALWARE', 'PHISHING', 'APT', 'RANSOMWARE', 'BOTNET'];
const severityLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const eventTypes = ['NETWORK_INTRUSION', 'MALWARE_DETECTED', 'POLICY_VIOLATION'];

// Base URL configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;
const GRAPHQL_URL = `${API_URL}/graphql`;
const WS_URL = BASE_URL.replace('http', 'ws') + '/ws';

// Authentication helper
function authenticate() {
  const user = randomItem(testUsers);
  const loginPayload = {
    query: `
      mutation Login($username: String!, $password: String!) {
        login(username: $username, password: $password) {
          token
          refreshToken
          user {
            id
            username
            role
          }
        }
      }
    `,
    variables: { username: user.username, password: user.password }
  };

  const response = http.post(GRAPHQL_URL, JSON.stringify(loginPayload), {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'Login' }
  });

  check(response, {
    'login successful': (r) => r.status === 200,
    'login returns token': (r) => JSON.parse(r.body).data?.login?.token !== undefined,
  });

  if (response.status === 200) {
    const loginData = JSON.parse(response.body).data?.login;
    return loginData?.token;
  }
  
  fail('Authentication failed');
}

// GraphQL query helper
function graphqlQuery(query, variables = {}, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const payload = { query, variables };
  const response = http.post(GRAPHQL_URL, JSON.stringify(payload), {
    headers,
    tags: { name: 'GraphQL' }
  });

  // Track GraphQL errors
  if (response.status === 200) {
    const result = JSON.parse(response.body);
    if (result.errors && result.errors.length > 0) {
      graphqlErrors.add(1);
    } else {
      graphqlErrors.add(0);
    }
  } else {
    graphqlErrors.add(1);
  }

  return response;
}

// Smoke Test - Basic functionality verification
export function smokeTest() {
  group('Smoke Test - Basic Functionality', () => {
    const token = authenticate();

    group('Health Checks', () => {
      const healthResponse = http.get(`${API_URL}/health`);
      check(healthResponse, {
        'health endpoint responds': (r) => r.status === 200,
        'health status is OK': (r) => JSON.parse(r.body).status === 'OK',
      });
    });

    group('Basic GraphQL Operations', () => {
      const dashboardQuery = `
        query GetDashboardOverview {
          securityOverview {
            totalThreats
            activeIncidents
            systemHealth
          }
        }
      `;

      const response = graphqlQuery(dashboardQuery, {}, token);
      check(response, {
        'dashboard query successful': (r) => r.status === 200,
        'dashboard has data': (r) => {
          const data = JSON.parse(r.body).data?.securityOverview;
          return data && typeof data.totalThreats === 'number';
        },
      });
    });
  });
}

// Load Test - Normal expected load
export function loadTest() {
  const token = authenticate();

  group('Load Test - Normal Operations', () => {
    // Dashboard operations
    group('Dashboard Queries', () => {
      const queries = [
        'query { securityOverview { totalThreats activeIncidents systemHealth } }',
        'query { recentEvents(limit: 20) { id type severity timestamp } }',
        'query { threatActors(limit: 10) { id name type lastActivity } }'
      ];

      queries.forEach((query, index) => {
        const response = graphqlQuery(query, {}, token);
        check(response, {
          [`query ${index + 1} successful`]: (r) => r.status === 200,
        });
      });
    });

    // Threat intelligence operations
    group('Threat Intelligence', () => {
      const threatQuery = `
        query GetThreats($filter: ThreatFilter) {
          threats(filter: $filter) {
            data {
              id name severity confidence
              indicators { type value }
            }
            pagination { total pages }
          }
        }
      `;

      const response = graphqlQuery(threatQuery, {
        filter: { severity: randomItem(severityLevels) }
      }, token);

      check(response, {
        'threats query successful': (r) => r.status === 200,
        'threats data present': (r) => {
          const data = JSON.parse(r.body).data?.threats?.data;
          return Array.isArray(data);
        },
      });

      if (response.status === 200) {
        threatProcessingTime.add(response.timings.duration);
      }
    });

    // Incident management
    group('Incident Management', () => {
      const incidentMutation = `
        mutation CreateIncident($input: IncidentInput!) {
          createIncident(input: $input) {
            id title severity status
          }
        }
      `;

      const incidentData = {
        title: `Test Incident ${randomIntBetween(1000, 9999)}`,
        description: 'Automated test incident',
        severity: randomItem(severityLevels),
        type: randomItem(eventTypes)
      };

      const response = graphqlQuery(incidentMutation, { input: incidentData }, token);
      check(response, {
        'incident creation successful': (r) => r.status === 200,
        'incident has ID': (r) => {
          const data = JSON.parse(r.body).data?.createIncident;
          return data && data.id;
        },
      });
    });

    sleep(randomIntBetween(1, 3));
  });
}

// Stress Test - Find breaking point
export function stressTest() {
  const token = authenticate();

  group('Stress Test - High Load Operations', () => {
    // Concurrent complex queries
    group('Complex Queries Under Stress', () => {
      const complexQuery = `
        query ComplexThreatAnalysis($dateRange: DateRange!) {
          threatIntelligence(dateRange: $dateRange) {
            threats {
              id name severity confidence
              indicators { type value confidence }
              associatedActors { id name type }
              campaigns { id name status }
            }
            correlations {
              primary { id name }
              related { id name }
              score
            }
            geographicDistribution {
              country threatCount
            }
          }
        }
      `;

      const response = graphqlQuery(complexQuery, {
        dateRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        }
      }, token);

      check(response, {
        'complex query under stress succeeds': (r) => r.status === 200,
        'complex query response time acceptable': (r) => r.timings.duration < 2000,
      });
    });

    // Rapid fire operations
    group('Rapid Fire Operations', () => {
      for (let i = 0; i < 5; i++) {
        const quickQuery = 'query { systemHealth { status components } }';
        const response = graphqlQuery(quickQuery, {}, token);
        
        check(response, {
          [`rapid fire query ${i + 1} successful`]: (r) => r.status === 200,
        });

        // No sleep to create pressure
      }
    });

    sleep(0.5);
  });
}

// Spike Test - Sudden load increases
export function spikeTest() {
  const token = authenticate();

  group('Spike Test - Sudden Load Handling', () => {
    // Simulate sudden spike in activity
    const spikeDuration = Math.random() < 0.3 ? 10 : 1; // 30% chance of extended spike
    
    for (let i = 0; i < spikeDuration; i++) {
      const spikeQuery = `
        query SpikeQuery {
          recentEvents(limit: 100) { id type timestamp }
          alerts(status: OPEN) { id severity title }
          systemMetrics { cpu memory disk }
        }
      `;

      const response = graphqlQuery(spikeQuery, {}, token);
      check(response, {
        'spike query handles load': (r) => r.status === 200,
        'spike query response time': (r) => r.timings.duration < 1500,
      });

      if (response.status === 200) {
        eventIngestionRate.add(1);
      } else {
        eventIngestionRate.add(0);
      }
    }
  });
}

// Volume Test - Large data processing
export function volumeTest() {
  const token = authenticate();

  group('Volume Test - Large Dataset Processing', () => {
    // Test processing large amounts of data
    group('Large Data Queries', () => {
      const largeDataQuery = `
        query LargeDataset($limit: Int!) {
          securityEvents(limit: $limit) {
            data {
              id timestamp type severity
              sourceIp destinationIp
              rawData metadata
            }
            pagination { total }
          }
        }
      `;

      const startTime = Date.now();
      const response = graphqlQuery(largeDataQuery, { limit: 10000 }, token);
      const processingTime = Date.now() - startTime;

      check(response, {
        'large dataset query successful': (r) => r.status === 200,
        'large dataset processing time acceptable': (r) => processingTime < 5000,
      });

      largeDatasetProcessing.add(processingTime);
    });

    // Test bulk operations
    group('Bulk Operations', () => {
      const bulkCreateMutation = `
        mutation BulkCreateEvents($events: [SecurityEventInput!]!) {
          bulkCreateSecurityEvents(events: $events) {
            success
            processed
            errors
          }
        }
      `;

      const events = Array.from({ length: 100 }, (_, i) => ({
        type: randomItem(eventTypes),
        severity: randomItem(severityLevels),
        sourceIp: `192.168.1.${randomIntBetween(1, 254)}`,
        timestamp: new Date().toISOString(),
        description: `Bulk test event ${i + 1}`
      }));

      const response = graphqlQuery(bulkCreateMutation, { events }, token);
      check(response, {
        'bulk create successful': (r) => r.status === 200,
        'bulk processing completed': (r) => {
          const data = JSON.parse(r.body).data?.bulkCreateSecurityEvents;
          return data && data.success;
        },
      });
    });

    sleep(2);
  });
}

// Soak Test - Extended duration
export function soakTest() {
  const token = authenticate();

  group('Soak Test - Extended Operations', () => {
    // Simulate normal user behavior over extended period
    const operations = [
      () => graphqlQuery('query { securityOverview { totalThreats activeIncidents } }', {}, token),
      () => graphqlQuery('query { recentEvents(limit: 10) { id type severity } }', {}, token),
      () => graphqlQuery('query { alerts(limit: 5) { id title severity } }', {}, token),
      () => graphqlQuery('query { systemHealth { status } }', {}, token),
    ];

    // Perform random operations with realistic delays
    const operation = randomItem(operations);
    const response = operation();

    check(response, {
      'soak test operation successful': (r) => r.status === 200,
    });

    // Track system metrics during soak test
    if (Math.random() < 0.1) { // 10% of requests
      const metricsResponse = http.get(`${API_URL}/metrics`);
      if (metricsResponse.status === 200) {
        const metrics = JSON.parse(metricsResponse.body);
        memoryUsage.add(metrics.memoryUsagePercent || 0);
        cpuUsage.add(metrics.cpuUsagePercent || 0);
        databaseConnections.add(metrics.dbConnections || 0);
      }
    }

    sleep(randomIntBetween(2, 8)); // Realistic user think time
  });
}

// WebSocket Test - Real-time functionality
export function webSocketTest() {
  const token = authenticate();

  group('WebSocket Test - Real-time Updates', () => {
    const connectStart = Date.now();
    
    const response = ws.connect(WS_URL, { headers: { 'Authorization': `Bearer ${token}` } }, (socket) => {
      wsConnectTime.add(Date.now() - connectStart);

      // Subscribe to threat updates
      socket.send(JSON.stringify({
        type: 'subscribe',
        topic: 'threat_updates'
      }));

      // Subscribe to alert updates
      socket.send(JSON.stringify({
        type: 'subscribe',
        topic: 'alert_updates'
      }));

      let messageCount = 0;
      const startTime = Date.now();

      socket.on('message', (data) => {
        messageCount++;
        wsMessageRate.add(1);

        const message = JSON.parse(data);
        if (message.type === 'threat_update') {
          const processingTime = Date.now() - new Date(message.timestamp).getTime();
          eventProcessingLatency.add(processingTime);
        }

        check(message, {
          'websocket message valid': (msg) => msg.type && msg.data,
          'websocket message timely': (msg) => {
            const messageAge = Date.now() - new Date(msg.timestamp).getTime();
            return messageAge < 1000; // Less than 1 second old
          },
        });
      });

      // Keep connection open for test duration
      sleep(30);

      const duration = (Date.now() - startTime) / 1000;
      const messageRate = messageCount / duration;
      
      check(null, {
        'websocket message rate adequate': () => messageRate >= 1, // At least 1 message per second
        'websocket connection stable': () => messageCount > 0,
      });
    });
  });
}

// API Concurrency Test
export function apiConcurrencyTest() {
  const token = authenticate();

  group('API Concurrency Test', () => {
    // Test concurrent access to same resources
    const resourceId = 'threat-123'; // Shared resource
    
    const concurrentOperations = [
      () => graphqlQuery(`query { threat(id: "${resourceId}") { id name severity } }`, {}, token),
      () => graphqlQuery(`mutation { updateThreat(id: "${resourceId}", input: { severity: HIGH }) { id } }`, {}, token),
      () => graphqlQuery(`query { threat(id: "${resourceId}") { indicators { type value } } }`, {}, token),
    ];

    // Execute operations concurrently
    const promises = concurrentOperations.map(op => op());
    
    promises.forEach((response, index) => {
      check(response, {
        [`concurrent operation ${index + 1} successful`]: (r) => r.status === 200 || r.status === 409, // 409 for conflicts
      });

      if (response.status === 200) {
        const query = response.url.includes('mutation') ? 'mutation' : 'query';
        dbQueryDuration.add(response.timings.duration);
      } else if (response.status >= 500) {
        dbConnectionErrors.add(1);
      } else {
        dbConnectionErrors.add(0);
      }
    });

    sleep(1);
  });
}

// Security Test Functions
export function securityScanTest() {
  group('Security Scan Test', () => {
    // Test SQL injection
    group('SQL Injection Tests', () => {
      const maliciousPayloads = [
        "'; DROP TABLE threats; --",
        "' OR '1'='1",
        "'; INSERT INTO threats VALUES (1,'malicious','HIGH'); --"
      ];

      maliciousPayloads.forEach((payload, index) => {
        const response = graphqlQuery(`
          query { threat(id: "${payload}") { id name } }
        `);

        const passed = check(response, {
          [`SQL injection ${index + 1} blocked`]: (r) => r.status === 400 || r.status === 422,
        });

        if (!passed) {
          securityScanFailures.add(1);
        } else {
          securityScanFailures.add(0);
        }
      });
    });

    // Test XSS prevention
    group('XSS Prevention Tests', () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(1)">'
      ];

      xssPayloads.forEach((payload, index) => {
        const response = graphqlQuery(`
          mutation CreateThreat($input: ThreatInput!) {
            createThreat(input: $input) { id name }
          }
        `, {
          input: {
            name: payload,
            description: 'XSS test',
            severity: 'LOW'
          }
        });

        const passed = check(response, {
          [`XSS payload ${index + 1} sanitized`]: (r) => {
            if (r.status === 200) {
              const data = JSON.parse(r.body).data?.createThreat;
              return data && !data.name.includes('<script>');
            }
            return true;
          },
        });

        if (!passed) {
          securityScanFailures.add(1);
        } else {
          securityScanFailures.add(0);
        }
      });
    });

    // Test rate limiting
    group('Rate Limiting Tests', () => {
      const startTime = Date.now();
      let successCount = 0;
      let rateLimitedCount = 0;

      // Send rapid requests
      for (let i = 0; i < 100; i++) {
        const response = http.get(`${API_URL}/health`);
        if (response.status === 200) {
          successCount++;
        } else if (response.status === 429) {
          rateLimitedCount++;
        }
      }

      const passed = check(null, {
        'rate limiting active': () => rateLimitedCount > 0,
        'some requests still succeed': () => successCount > 0,
      });

      if (!passed) {
        securityScanFailures.add(1);
      } else {
        securityScanFailures.add(0);
      }
    });
  });
}

// Performance monitoring during tests
export function handleSummary(data) {
  return {
    'summary.json': JSON.stringify(data),
    stdout: `
      ==========================================
      Security Dashboard Performance Test Results
      ==========================================
      
      📊 Test Summary:
      • Total Requests: ${data.metrics.http_reqs.count}
      • Failed Requests: ${data.metrics.http_req_failed.count} (${(data.metrics.http_req_failed.rate * 100).toFixed(2)}%)
      • Average Response Time: ${data.metrics.http_req_duration.avg.toFixed(2)}ms
      • 95th Percentile: ${data.metrics['http_req_duration'].p95?.toFixed(2)}ms
      • 99th Percentile: ${data.metrics['http_req_duration'].p99?.toFixed(2)}ms
      
      🔍 GraphQL Performance:
      • GraphQL Errors: ${(data.metrics.graphql_errors.rate * 100).toFixed(2)}%
      • Threat Processing Time: ${data.metrics.threat_processing_time?.avg?.toFixed(2)}ms
      
      ⚡ Real-time Performance:
      • WebSocket Connect Time: ${data.metrics.ws_connect_time?.avg?.toFixed(2)}ms
      • Event Processing Latency: ${data.metrics.event_processing_latency?.avg?.toFixed(2)}ms
      
      💾 System Resources:
      • Peak Memory Usage: ${data.metrics.memory_usage?.max?.toFixed(1)}%
      • Peak CPU Usage: ${data.metrics.cpu_usage?.max?.toFixed(1)}%
      • DB Connection Errors: ${(data.metrics.db_connection_errors.rate * 100).toFixed(3)}%
      
      🔒 Security Tests:
      • Security Scan Failures: ${(data.metrics.security_scan_failures.rate * 100).toFixed(2)}%
      
      📈 Volume Processing:
      • Large Dataset Processing: ${data.metrics.large_dataset_processing?.avg?.toFixed(2)}ms
      
      ==========================================
      
      ${Object.keys(data.metrics).map(key => {
        const metric = data.metrics[key];
        const thresholds = options.thresholds[key];
        if (thresholds && metric.thresholds) {
          const failed = Object.keys(metric.thresholds).filter(t => !metric.thresholds[t].ok);
          if (failed.length > 0) {
            return `❌ ${key}: Failed thresholds: ${failed.join(', ')}`;
          } else {
            return `✅ ${key}: All thresholds passed`;
          }
        }
        return '';
      }).filter(Boolean).join('\n')}
      
      Test completed at: ${new Date().toISOString()}
      Duration: ${(data.state.testRunDurationMs / 1000).toFixed(2)} seconds
    `
  };
}