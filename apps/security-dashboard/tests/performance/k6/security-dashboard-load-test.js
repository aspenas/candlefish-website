import { check, group, sleep, fail } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import http from 'k6/http';
import ws from 'k6/ws';
import { randomItem, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
export const ErrorRate = new Rate('error_rate');
export const ApiResponseTime = new Trend('api_response_time', true);
export const WebSocketConnections = new Counter('websocket_connections');
export const DatabaseQueries = new Counter('database_queries');
export const GraphQLOperations = new Counter('graphql_operations');

// Test configuration
export const options = {
  stages: [
    // Ramp up
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '3m', target: 200 },  // Ramp up to 200 users
    { duration: '10m', target: 200 }, // Stay at 200 users (steady state)
    { duration: '3m', target: 500 },  // Spike test to 500 users
    { duration: '2m', target: 500 },  // Stay at spike
    { duration: '5m', target: 0 },    // Ramp down
  ],
  thresholds: {
    // HTTP response times
    'http_req_duration': ['p(95)<2000', 'p(99)<5000'], // 95% < 2s, 99% < 5s
    'http_req_duration{name:GraphQL}': ['p(95)<1500'],
    'http_req_duration{name:Dashboard}': ['p(95)<1000'],
    
    // Error rates
    'error_rate': ['rate<0.01'], // Less than 1% errors
    'http_req_failed': ['rate<0.02'], // Less than 2% HTTP failures
    
    // WebSocket connections
    'ws_connecting': ['p(95)<500'], // WebSocket connections under 500ms
    'ws_session_duration': ['p(95)<30000'], // Sessions last at least 30s
    
    // Custom metrics
    'api_response_time': ['p(95)<1000'],
    'websocket_connections': ['count>100'],
  },
  // Performance testing limits
  noConnectionReuse: false,
  userAgent: 'K6-SecurityDashboard-LoadTest/1.0',
};

// Test data and configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3005';
const API_URL = __ENV.API_URL || 'http://localhost:4000/graphql';
const WS_URL = __ENV.WS_URL || 'ws://localhost:4000/graphql';

// Test users for authentication
const TEST_USERS = [
  { email: 'analyst1@company.com', password: 'testPass123!', role: 'ANALYST' },
  { email: 'analyst2@company.com', password: 'testPass123!', role: 'ANALYST' },
  { email: 'admin1@company.com', password: 'adminPass123!', role: 'ADMIN' },
  { email: 'admin2@company.com', password: 'adminPass123!', role: 'ADMIN' },
];

// GraphQL queries for different operations
const QUERIES = {
  GET_SECURITY_METRICS: {
    query: `
      query GetSecurityMetrics($timeRange: TimeRange!) {
        securityMetrics(timeRange: $timeRange) {
          totalThreats
          activeIncidents
          resolvedToday
          criticalAlerts
          systemHealth
          threatTrends {
            timestamp
            count
            severity
          }
        }
      }
    `,
    variables: { timeRange: '24h' }
  },
  
  GET_SECURITY_EVENTS: {
    query: `
      query GetSecurityEvents($limit: Int!, $offset: Int!, $severity: Severity) {
        securityEvents(limit: $limit, offset: $offset, severity: $severity) {
          id
          timestamp
          type
          severity
          source
          destination
          description
          mitre_tactics
          mitre_techniques
        }
      }
    `,
    variables: { limit: 50, offset: 0 }
  },
  
  GET_INCIDENTS: {
    query: `
      query GetIncidents($status: IncidentStatus, $limit: Int!) {
        incidents(status: $status, limit: $limit) {
          id
          title
          description
          severity
          status
          assignee
          created_at
          updated_at
          events {
            id
            type
            severity
          }
          assets_affected
        }
      }
    `,
    variables: { limit: 25 }
  },
  
  GET_THREAT_INTELLIGENCE: {
    query: `
      query GetThreatIntelligence($limit: Int!) {
        threatIntelligence(limit: $limit) {
          id
          name
          severity
          confidence
          first_seen
          last_seen
          indicators {
            type
            value
            confidence
          }
          mitre_mapping {
            tactics
            techniques
          }
        }
      }
    `,
    variables: { limit: 20 }
  }
};

const MUTATIONS = {
  CREATE_SECURITY_EVENT: {
    query: `
      mutation CreateSecurityEvent($input: SecurityEventInput!) {
        createSecurityEvent(input: $input) {
          id
          type
          severity
          timestamp
        }
      }
    `,
    variables: {
      input: {
        type: 'PERFORMANCE_TEST_EVENT',
        severity: 'MEDIUM',
        source: '10.0.0.1',
        description: 'Load test generated security event',
        mitre_tactics: ['Discovery'],
        mitre_techniques: ['T1057']
      }
    }
  },
  
  UPDATE_INCIDENT: {
    query: `
      mutation UpdateIncident($id: ID!, $input: IncidentInput!) {
        updateIncident(id: $id, input: $input) {
          id
          status
          updated_at
        }
      }
    `,
    variables: {
      id: 'load-test-incident',
      input: {
        title: 'Load Test Incident Update',
        description: 'Updated during performance testing',
        severity: 'HIGH'
      }
    }
  }
};

// Authentication helper
function authenticate() {
  const user = randomItem(TEST_USERS);
  
  const loginPayload = JSON.stringify({
    email: user.email,
    password: user.password
  });
  
  const loginResponse = http.post(`${BASE_URL}/api/auth/login`, loginPayload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'Authentication' }
  });
  
  check(loginResponse, {
    'login successful': (r) => r.status === 200,
    'login response time < 500ms': (r) => r.timings.duration < 500,
  }) || fail('Authentication failed');
  
  const authData = loginResponse.json();
  return {
    token: authData.token,
    user: authData.user,
    headers: {
      'Authorization': `Bearer ${authData.token}`,
      'Content-Type': 'application/json'
    }
  };
}

// GraphQL request helper
function executeGraphQL(query, variables, auth, operationName) {
  const payload = JSON.stringify({ query, variables });
  
  const response = http.post(API_URL, payload, {
    headers: auth.headers,
    tags: { 
      name: 'GraphQL',
      operation: operationName 
    }
  });
  
  GraphQLOperations.add(1);
  ApiResponseTime.add(response.timings.duration);
  
  const success = check(response, {
    [`${operationName} status 200`]: (r) => r.status === 200,
    [`${operationName} no errors`]: (r) => {
      const body = r.json();
      return !body.errors;
    },
    [`${operationName} has data`]: (r) => {
      const body = r.json();
      return body.data !== null;
    }
  });
  
  ErrorRate.add(!success);
  return response;
}

// WebSocket connection test
function testWebSocketConnection(auth) {
  const wsUrl = `${WS_URL}?token=${auth.token}`;
  
  const response = ws.connect(wsUrl, {
    'Sec-WebSocket-Protocol': 'graphql-ws',
  }, function(socket) {
    WebSocketConnections.add(1);
    
    socket.on('open', () => {
      // Send connection init
      socket.send(JSON.stringify({
        type: 'connection_init',
        payload: { authorization: `Bearer ${auth.token}` }
      }));
    });
    
    socket.on('message', (message) => {
      const data = JSON.parse(message);
      
      if (data.type === 'connection_ack') {
        // Subscribe to real-time events
        socket.send(JSON.stringify({
          id: '1',
          type: 'start',
          payload: {
            query: `
              subscription {
                securityEventAdded {
                  id
                  type
                  severity
                  timestamp
                }
              }
            `
          }
        }));
      }
    });
    
    // Keep connection alive for random duration
    const connectionDuration = randomIntBetween(10000, 60000); // 10-60 seconds
    socket.setTimeout(() => {
      socket.close();
    }, connectionDuration);
  });
  
  check(response, {
    'WebSocket connection established': (r) => r && r.status === 101,
  });
}

// Main test scenarios
export default function() {
  // Authenticate user
  const auth = authenticate();
  
  group('Dashboard Loading', () => {
    // Load main dashboard
    const dashboardResponse = http.get(BASE_URL, {
      headers: auth.headers,
      tags: { name: 'Dashboard' }
    });
    
    check(dashboardResponse, {
      'dashboard loads successfully': (r) => r.status === 200,
      'dashboard response time < 1s': (r) => r.timings.duration < 1000,
      'dashboard contains expected content': (r) => r.body.includes('Security Dashboard'),
    });
    
    // Load dashboard data
    executeGraphQL(
      QUERIES.GET_SECURITY_METRICS.query,
      QUERIES.GET_SECURITY_METRICS.variables,
      auth,
      'GetSecurityMetrics'
    );
  });
  
  group('Security Events Operations', () => {
    // Fetch security events
    const severity = randomItem(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
    const variables = { ...QUERIES.GET_SECURITY_EVENTS.variables, severity };
    
    executeGraphQL(
      QUERIES.GET_SECURITY_EVENTS.query,
      variables,
      auth,
      'GetSecurityEvents'
    );
    
    // Create new security event (simulate real-time detection)
    if (Math.random() < 0.3) { // 30% chance
      executeGraphQL(
        MUTATIONS.CREATE_SECURITY_EVENT.query,
        MUTATIONS.CREATE_SECURITY_EVENT.variables,
        auth,
        'CreateSecurityEvent'
      );
    }
  });
  
  group('Incident Management', () => {
    // Fetch incidents
    const status = randomItem(['OPEN', 'INVESTIGATING', 'RESOLVED']);
    const variables = { ...QUERIES.GET_INCIDENTS.variables, status };
    
    executeGraphQL(
      QUERIES.GET_INCIDENTS.query,
      variables,
      auth,
      'GetIncidents'
    );
    
    // Update incident (simulate workflow)
    if (Math.random() < 0.2) { // 20% chance
      executeGraphQL(
        MUTATIONS.UPDATE_INCIDENT.query,
        MUTATIONS.UPDATE_INCIDENT.variables,
        auth,
        'UpdateIncident'
      );
    }
  });
  
  group('Threat Intelligence', () => {
    executeGraphQL(
      QUERIES.GET_THREAT_INTELLIGENCE.query,
      QUERIES.GET_THREAT_INTELLIGENCE.variables,
      auth,
      'GetThreatIntelligence'
    );
  });
  
  group('Real-time Features', () => {
    // Test WebSocket connections (subset of users)
    if (Math.random() < 0.4) { // 40% of users establish WebSocket
      testWebSocketConnection(auth);
    }
  });
  
  // Simulate user think time
  sleep(randomIntBetween(1, 3));
}

// Specialized test scenarios for different user behaviors
export function analystWorkflow() {
  const auth = authenticate();
  
  group('Security Analyst Workflow', () => {
    // Analyst typically monitors threats and manages incidents
    executeGraphQL(QUERIES.GET_SECURITY_EVENTS.query, 
      { ...QUERIES.GET_SECURITY_EVENTS.variables, severity: 'HIGH' }, 
      auth, 'AnalystGetEvents');
    
    sleep(2);
    
    executeGraphQL(QUERIES.GET_INCIDENTS.query,
      { ...QUERIES.GET_INCIDENTS.variables, status: 'INVESTIGATING' },
      auth, 'AnalystGetIncidents');
    
    // Simulate investigation workflow
    if (Math.random() < 0.5) {
      executeGraphQL(MUTATIONS.UPDATE_INCIDENT.query,
        MUTATIONS.UPDATE_INCIDENT.variables,
        auth, 'AnalystUpdateIncident');
    }
  });
}

export function adminWorkflow() {
  const auth = authenticate();
  
  group('Security Admin Workflow', () => {
    // Admin reviews overall metrics and system health
    executeGraphQL(QUERIES.GET_SECURITY_METRICS.query,
      QUERIES.GET_SECURITY_METRICS.variables,
      auth, 'AdminGetMetrics');
    
    sleep(1);
    
    // Review threat intelligence
    executeGraphQL(QUERIES.GET_THREAT_INTELLIGENCE.query,
      QUERIES.GET_THREAT_INTELLIGENCE.variables,
      auth, 'AdminGetThreatIntel');
  });
}

// Database stress test
export function databaseStressTest() {
  const auth = authenticate();
  
  group('Database Stress Test', () => {
    // Simulate heavy analytical queries
    for (let i = 0; i < 5; i++) {
      const timeRange = randomItem(['1h', '6h', '24h', '7d']);
      executeGraphQL(
        QUERIES.GET_SECURITY_METRICS.query,
        { timeRange },
        auth,
        `StressMetrics_${i}`
      );
      
      sleep(0.5);
    }
    
    DatabaseQueries.add(5);
  });
}

// Error handling and resilience test
export function errorResilienceTest() {
  const auth = authenticate();
  
  group('Error Resilience Test', () => {
    // Send malformed queries to test error handling
    const malformedQuery = {
      query: `query { nonExistentField }`,
      variables: {}
    };
    
    const response = executeGraphQL(
      malformedQuery.query,
      malformedQuery.variables,
      auth,
      'MalformedQuery'
    );
    
    // Should handle errors gracefully
    check(response, {
      'malformed query returns 400': (r) => r.status === 400 || 
        (r.status === 200 && r.json().errors),
    });
  });
}

// Cleanup and teardown
export function teardown(data) {
  console.log('Performance test completed');
  console.log(`Total GraphQL operations: ${GraphQLOperations.value}`);
  console.log(`Total WebSocket connections: ${WebSocketConnections.value}`);
  console.log(`Average API response time: ${ApiResponseTime.avg}ms`);
  console.log(`Error rate: ${(ErrorRate.rate * 100).toFixed(2)}%`);
}