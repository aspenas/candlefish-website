import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const websocketConnections = new Counter('websocket_connections');
const authenticatedRequests = new Counter('authenticated_requests');

// Test configuration
export const options = {
  stages: [
    // Ramp up
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '3m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 200 },  // Ramp up to 200 users
    { duration: '10m', target: 500 }, // Ramp up to 500 users
    { duration: '5m', target: 1000 }, // Ramp up to 1000 users (peak load)
    
    // Sustained load
    { duration: '15m', target: 1000 }, // Stay at 1000 users
    
    // Stress test
    { duration: '5m', target: 1500 },  // Stress test - 1500 users
    
    // Ramp down
    { duration: '5m', target: 500 },   // Ramp down to 500
    { duration: '3m', target: 100 },   // Ramp down to 100
    { duration: '2m', target: 0 },     // Ramp down to 0
  ],
  
  thresholds: {
    // Response time thresholds
    'http_req_duration': ['p(95)<2000', 'p(99)<5000'], // 95% < 2s, 99% < 5s
    'http_req_duration{type:api}': ['p(95)<1000'],      // API calls < 1s (95%)
    'http_req_duration{type:websocket}': ['p(95)<500'], // WebSocket < 500ms (95%)
    
    // Error rate thresholds
    'errors': ['rate<0.1'],           // Error rate < 10%
    'http_req_failed': ['rate<0.05'], // Failed requests < 5%
    
    // Success rate thresholds
    'checks': ['rate>0.95'],          // 95% of checks should pass
    
    // WebSocket specific thresholds
    'websocket_connections': ['count>100'], // At least 100 WS connections
  },
  
  ext: {
    loadimpact: {
      distribution: {
        'amazon:us:ashburn': { loadZone: 'amazon:us:ashburn', percent: 50 },
        'amazon:us:phoenix': { loadZone: 'amazon:us:phoenix', percent: 30 },
        'amazon:eu:dublin': { loadZone: 'amazon:eu:dublin', percent: 20 },
      },
    },
  },
};

// Test data
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_URL = __ENV.API_URL || 'http://localhost:4000';
const WS_URL = __ENV.WS_URL || 'ws://localhost:4001';

// User credentials for different user types
const ADMIN_USERS = [
  { username: 'tyler-admin', password: 'secure-password-123' },
  { username: 'patrick-admin', password: 'secure-password-456' },
];

const GUEST_USERS = [
  { username: 'aaron-guest', password: 'guest-password-123' },
  { username: 'james-guest', password: 'guest-password-456' },
];

const ANALYST_USERS = [
  { username: 'analyst1', password: 'analyst-password-123' },
  { username: 'analyst2', password: 'analyst-password-456' },
  { username: 'analyst3', password: 'analyst-password-789' },
];

// Authentication helper
function authenticate(userType = 'analyst') {
  let users;
  switch (userType) {
    case 'admin':
      users = ADMIN_USERS;
      break;
    case 'guest':
      users = GUEST_USERS;
      break;
    default:
      users = ANALYST_USERS;
  }
  
  const user = users[Math.floor(Math.random() * users.length)];
  
  const loginResponse = http.post(`${API_URL}/auth/login`, JSON.stringify({
    username: user.username,
    password: user.password,
  }), {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { type: 'auth' },
  });
  
  check(loginResponse, {
    'login successful': (r) => r.status === 200,
    'token received': (r) => r.json('token') !== undefined,
  });
  
  if (loginResponse.status === 200) {
    authenticatedRequests.add(1);
    return {
      token: loginResponse.json('token'),
      userType: userType,
      userId: loginResponse.json('user.id'),
    };
  }
  
  errorRate.add(1);
  return null;
}

// API request helper with authentication
function authenticatedRequest(method, endpoint, auth, body = null) {
  const headers = {
    'Authorization': `Bearer ${auth.token}`,
    'Content-Type': 'application/json',
  };
  
  const params = {
    headers: headers,
    tags: { type: 'api', user_type: auth.userType },
  };
  
  let response;
  const start = new Date().getTime();
  
  switch (method.toLowerCase()) {
    case 'get':
      response = http.get(`${API_URL}${endpoint}`, params);
      break;
    case 'post':
      response = http.post(`${API_URL}${endpoint}`, body ? JSON.stringify(body) : null, params);
      break;
    case 'put':
      response = http.put(`${API_URL}${endpoint}`, body ? JSON.stringify(body) : null, params);
      break;
    case 'delete':
      response = http.del(`${API_URL}${endpoint}`, null, params);
      break;
    default:
      response = http.get(`${API_URL}${endpoint}`, params);
  }
  
  const duration = new Date().getTime() - start;
  responseTime.add(duration);
  
  return response;
}

// WebSocket connection helper
function connectWebSocket(auth) {
  const wsUrl = `${WS_URL}?token=${auth.token}`;
  
  const res = ws.connect(wsUrl, {
    tags: { type: 'websocket' },
  }, function (socket) {
    websocketConnections.add(1);
    
    socket.on('open', () => {
      // Subscribe to relevant channels based on user type
      if (auth.userType === 'admin' || auth.userType === 'analyst') {
        socket.send(JSON.stringify({
          type: 'subscribe',
          channels: ['security_events', 'alerts', 'incidents', 'threats'],
        }));
      } else if (auth.userType === 'guest') {
        socket.send(JSON.stringify({
          type: 'subscribe',
          channels: ['public_alerts', 'system_status'],
        }));
      }
    });
    
    socket.on('message', (data) => {
      const message = JSON.parse(data);
      check(message, {
        'valid message format': (m) => m.type !== undefined,
        'contains timestamp': (m) => m.timestamp !== undefined,
      });
    });
    
    socket.on('error', (e) => {
      errorRate.add(1);
    });
    
    // Keep connection alive for random duration
    socket.setTimeout(() => {
      socket.close();
    }, Math.random() * 30000 + 10000); // 10-40 seconds
  });
  
  check(res, {
    'websocket connection established': (r) => r && r.status === 101,
  });
}

// Main test scenarios
export default function () {
  const userType = Math.random() < 0.1 ? 'admin' : Math.random() < 0.3 ? 'guest' : 'analyst';
  const auth = authenticate(userType);
  
  if (!auth) {
    sleep(1);
    return;
  }
  
  // Run different scenarios based on user type
  if (auth.userType === 'admin') {
    adminWorkflow(auth);
  } else if (auth.userType === 'guest') {
    guestWorkflow(auth);
  } else {
    analystWorkflow(auth);
  }
  
  // Random sleep between 1-3 seconds
  sleep(Math.random() * 2 + 1);
}

// Admin workflow
function adminWorkflow(auth) {
  // Dashboard access
  let response = authenticatedRequest('GET', '/dashboard/metrics', auth);
  check(response, {
    'admin dashboard accessible': (r) => r.status === 200,
    'dashboard contains metrics': (r) => r.json('totalThreats') !== undefined,
  });
  
  // User management
  response = authenticatedRequest('GET', '/admin/users', auth);
  check(response, {
    'user list accessible': (r) => r.status === 200,
    'user data present': (r) => Array.isArray(r.json('data')),
  });
  
  // System settings
  response = authenticatedRequest('GET', '/admin/settings', auth);
  check(response, {
    'system settings accessible': (r) => r.status === 200,
  });
  
  // Incident management
  response = authenticatedRequest('GET', '/incidents?limit=20', auth);
  check(response, {
    'incidents list loaded': (r) => r.status === 200,
    'incidents data valid': (r) => r.json('data').length >= 0,
  });
  
  // Create new incident (10% chance)
  if (Math.random() < 0.1) {
    const incidentData = {
      title: `Performance Test Incident ${Date.now()}`,
      description: 'Automated incident created during load testing',
      severity: 'MEDIUM',
      priority: 'MEDIUM',
    };
    
    response = authenticatedRequest('POST', '/incidents', auth, incidentData);
    check(response, {
      'incident created successfully': (r) => r.status === 201,
      'incident has id': (r) => r.json('id') !== undefined,
    });
  }
  
  // Alert management
  response = authenticatedRequest('GET', '/alerts?status=OPEN&limit=50', auth);
  check(response, {
    'alerts loaded': (r) => r.status === 200,
  });
  
  // Bulk alert acknowledgment (5% chance)
  if (Math.random() < 0.05) {
    const alertIds = ['alert-1', 'alert-2', 'alert-3']; // Mock alert IDs
    response = authenticatedRequest('POST', '/alerts/bulk-acknowledge', auth, {
      alertIds: alertIds,
      notes: 'Bulk acknowledgment during load test',
    });
    check(response, {
      'bulk acknowledgment processed': (r) => r.status === 200,
    });
  }
  
  // Threat intelligence
  response = authenticatedRequest('GET', '/threats?limit=25&severity=HIGH,CRITICAL', auth);
  check(response, {
    'threat intelligence loaded': (r) => r.status === 200,
  });
  
  // WebSocket connection for real-time updates
  if (Math.random() < 0.3) { // 30% chance
    connectWebSocket(auth);
  }
}

// Analyst workflow
function analystWorkflow(auth) {
  // Dashboard access
  let response = authenticatedRequest('GET', '/dashboard/analyst', auth);
  check(response, {
    'analyst dashboard accessible': (r) => r.status === 200,
  });
  
  // Incident investigation
  response = authenticatedRequest('GET', '/incidents?assignee=' + auth.userId, auth);
  check(response, {
    'assigned incidents loaded': (r) => r.status === 200,
  });
  
  // Alert triage
  response = authenticatedRequest('GET', '/alerts?status=NEW&severity=HIGH,CRITICAL&limit=30', auth);
  check(response, {
    'high priority alerts loaded': (r) => r.status === 200,
  });
  
  // Acknowledge alert (20% chance)
  if (Math.random() < 0.2) {
    response = authenticatedRequest('POST', '/alerts/alert-123/acknowledge', auth, {
      notes: 'Alert reviewed during load test',
    });
    check(response, {
      'alert acknowledged': (r) => r.status === 200 || r.status === 404, // 404 if alert doesn't exist
    });
  }
  
  // Threat research
  response = authenticatedRequest('GET', '/threats/search?q=malware&limit=20', auth);
  check(response, {
    'threat search completed': (r) => r.status === 200,
  });
  
  // IOC lookup
  response = authenticatedRequest('GET', '/iocs?type=IP&limit=15', auth);
  check(response, {
    'IOC data retrieved': (r) => r.status === 200,
  });
  
  // Security events
  response = authenticatedRequest('GET', '/events?last=1h&limit=100', auth);
  check(response, {
    'security events loaded': (r) => r.status === 200,
  });
  
  // Update incident status (15% chance)
  if (Math.random() < 0.15) {
    response = authenticatedRequest('PATCH', '/incidents/incident-456/status', auth, {
      status: 'INVESTIGATING',
      notes: 'Status update during load test',
    });
    check(response, {
      'incident status updated': (r) => r.status === 200 || r.status === 404,
    });
  }
  
  // WebSocket for real-time updates
  if (Math.random() < 0.5) { // 50% chance
    connectWebSocket(auth);
  }
}

// Guest workflow
function guestWorkflow(auth) {
  // Limited dashboard access
  let response = authenticatedRequest('GET', '/dashboard/guest', auth);
  check(response, {
    'guest dashboard accessible': (r) => r.status === 200,
    'limited data returned': (r) => r.json('restrictedAccess') === true,
  });
  
  // Public security status
  response = authenticatedRequest('GET', '/public/security-status', auth);
  check(response, {
    'public security status available': (r) => r.status === 200,
  });
  
  // Public alerts
  response = authenticatedRequest('GET', '/public/alerts?limit=10', auth);
  check(response, {
    'public alerts accessible': (r) => r.status === 200,
    'sanitized alert data': (r) => r.json('data')[0] && !r.json('data')[0].sensitiveInfo,
  });
  
  // Public incident summaries
  response = authenticatedRequest('GET', '/public/incidents?limit=5', auth);
  check(response, {
    'public incident summaries available': (r) => r.status === 200,
  });
  
  // Reports access
  response = authenticatedRequest('GET', '/reports/public', auth);
  check(response, {
    'public reports accessible': (r) => r.status === 200,
  });
  
  // Attempt to access restricted endpoint (should fail)
  response = authenticatedRequest('GET', '/admin/users', auth);
  check(response, {
    'admin access properly restricted': (r) => r.status === 403,
  });
  
  response = authenticatedRequest('GET', '/incidents/detailed', auth);
  check(response, {
    'detailed incident access restricted': (r) => r.status === 403,
  });
  
  // WebSocket for public updates
  if (Math.random() < 0.2) { // 20% chance
    connectWebSocket(auth);
  }
}

// Additional test scenarios
export function threatIntelligenceLoad() {
  const auth = authenticate('analyst');
  if (!auth) return;
  
  // Heavy threat intelligence operations
  for (let i = 0; i < 10; i++) {
    const response = authenticatedRequest('GET', `/threats/${Math.floor(Math.random() * 1000)}`, auth);
    check(response, {
      'threat detail loaded': (r) => r.status === 200 || r.status === 404,
    });
    sleep(0.1);
  }
  
  // IOC batch lookup
  const iocBatch = [];
  for (let i = 0; i < 50; i++) {
    iocBatch.push(`192.168.1.${Math.floor(Math.random() * 255)}`);
  }
  
  const response = authenticatedRequest('POST', '/iocs/batch-lookup', auth, {
    indicators: iocBatch,
  });
  check(response, {
    'batch IOC lookup completed': (r) => r.status === 200,
    'batch results returned': (r) => r.json('results').length === iocBatch.length,
  });
}

export function alertProcessingLoad() {
  const auth = authenticate('analyst');
  if (!auth) return;
  
  // Simulate alert processing workflow
  const response = authenticatedRequest('GET', '/alerts?status=NEW&limit=100', auth);
  check(response, {
    'new alerts retrieved': (r) => r.status === 200,
  });
  
  if (response.status === 200) {
    const alerts = response.json('data') || [];
    
    // Process alerts in batches
    for (let i = 0; i < Math.min(alerts.length, 10); i++) {
      const alert = alerts[i];
      
      // Acknowledge alert
      const ackResponse = authenticatedRequest('POST', `/alerts/${alert.id}/acknowledge`, auth, {
        notes: `Processed in load test batch ${Date.now()}`,
      });
      
      check(ackResponse, {
        'alert acknowledgment processed': (r) => r.status === 200,
      });
      
      sleep(0.2);
    }
  }
}

export function reportGenerationLoad() {
  const auth = authenticate('admin');
  if (!auth) return;
  
  // Generate various reports
  const reportTypes = ['security-overview', 'threat-analysis', 'incident-summary'];
  
  reportTypes.forEach(reportType => {
    const response = authenticatedRequest('POST', `/reports/generate`, auth, {
      type: reportType,
      period: 'last-30-days',
      format: 'json',
    });
    
    check(response, {
      [`${reportType} report generated`]: (r) => r.status === 200 || r.status === 202,
    });
    
    sleep(1);
  });
}

// Stress test scenarios
export function stressTest() {
  const auth = authenticate();
  if (!auth) return;
  
  // Rapid-fire requests
  for (let i = 0; i < 20; i++) {
    const endpoint = ['/alerts', '/incidents', '/threats', '/events'][Math.floor(Math.random() * 4)];
    const response = authenticatedRequest('GET', `${endpoint}?limit=5`, auth);
    
    check(response, {
      'stress test request completed': (r) => r.status < 500,
    });
    
    // No sleep - maximum load
  }
  
  // Test connection limits
  if (Math.random() < 0.1) {
    connectWebSocket(auth);
  }
}

// Data integrity test
export function dataConsistencyTest() {
  const auth = authenticate('analyst');
  if (!auth) return;
  
  // Create incident and immediately retrieve it
  const incidentData = {
    title: `Consistency Test ${Date.now()}`,
    description: 'Testing data consistency',
    severity: 'LOW',
  };
  
  const createResponse = authenticatedRequest('POST', '/incidents', auth, incidentData);
  
  if (createResponse.status === 201) {
    const incidentId = createResponse.json('id');
    
    // Immediately retrieve the created incident
    const getResponse = authenticatedRequest('GET', `/incidents/${incidentId}`, auth);
    
    check(getResponse, {
      'created incident retrievable': (r) => r.status === 200,
      'incident data consistent': (r) => r.json('title') === incidentData.title,
    });
    
    // Update and verify
    const updateResponse = authenticatedRequest('PATCH', `/incidents/${incidentId}/status`, auth, {
      status: 'INVESTIGATING',
      notes: 'Data consistency test update',
    });
    
    if (updateResponse.status === 200) {
      sleep(0.5); // Brief wait for eventual consistency
      
      const verifyResponse = authenticatedRequest('GET', `/incidents/${incidentId}`, auth);
      check(verifyResponse, {
        'incident update consistent': (r) => r.json('status') === 'INVESTIGATING',
      });
    }
  }
}

// Cleanup function
export function teardown(data) {
  console.log('Load test completed');
  console.log(`Total authenticated requests: ${authenticatedRequests.count}`);
  console.log(`Total WebSocket connections: ${websocketConnections.count}`);
  console.log(`Average response time: ${responseTime.avg}ms`);
  console.log(`Error rate: ${(errorRate.rate * 100).toFixed(2)}%`);
}