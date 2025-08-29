import { check, group, fail } from 'k6';
import { Rate, Counter } from 'k6/metrics';
import http from 'k6/http';
import { randomString, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Security testing metrics
export const SQLInjectionAttempts = new Counter('sql_injection_attempts');
export const XSSAttempts = new Counter('xss_attempts');
export const AuthBypassAttempts = new Counter('auth_bypass_attempts');
export const SecurityVulnerabilities = new Rate('security_vulnerabilities');

// Test configuration for security testing
export const options = {
  stages: [
    { duration: '2m', target: 10 }, // Light load for security testing
    { duration: '5m', target: 10 }, // Sustained security testing
    { duration: '1m', target: 0 },  // Ramp down
  ],
  thresholds: {
    'security_vulnerabilities': ['rate<0.01'], // Less than 1% vulnerability rate
    'http_req_failed': ['rate<0.05'], // Allow some failures in security testing
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3005';
const API_URL = __ENV.API_URL || 'http://localhost:4000/graphql';

// Common security payloads
const SQL_INJECTION_PAYLOADS = [
  "' OR '1'='1",
  "'; DROP TABLE users;--",
  "' UNION SELECT * FROM users--",
  "admin'--",
  "' OR 1=1#",
  "'; EXEC xp_cmdshell('dir')--",
  "' AND (SELECT COUNT(*) FROM users) > 0--",
  "' OR '1'='1' /*",
];

const XSS_PAYLOADS = [
  "<script>alert('XSS')</script>",
  "<img src=x onerror=alert('XSS')>",
  "javascript:alert('XSS')",
  "<svg onload=alert('XSS')>",
  "'><script>alert('XSS')</script>",
  "\"><script>alert('XSS')</script>",
  "<iframe src=javascript:alert('XSS')>",
  "<body onload=alert('XSS')>",
];

const COMMAND_INJECTION_PAYLOADS = [
  "; cat /etc/passwd",
  "| whoami",
  "&& dir",
  "; rm -rf /",
  "| net user",
  "; ls -la",
  "&& ping 127.0.0.1",
  "; id",
];

const JWT_MANIPULATION_PAYLOADS = [
  "none", // Algorithm confusion
  "Bearer invalid_token",
  "Bearer ", // Empty token
  "Bearer expired_token",
  "Bearer eyJhbGciOiJub25lIn0.eyJzdWIiOiJhZG1pbiJ9.", // None algorithm
];

// Security testing functions
function testSQLInjection() {
  group('SQL Injection Tests', () => {
    SQL_INJECTION_PAYLOADS.forEach((payload, index) => {
      SQLInjectionAttempts.add(1);
      
      // Test in login form
      const loginResponse = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
        email: payload,
        password: 'password123'
      }), {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'SQLInjection', payload: `login_${index}` }
      });
      
      const loginSecure = check(loginResponse, {
        'SQL injection in login blocked': (r) => r.status === 400 || r.status === 401,
        'No SQL error messages': (r) => !r.body.includes('SQL') && !r.body.includes('mysql'),
        'No database schema exposure': (r) => !r.body.includes('table') && !r.body.includes('column'),
      });
      
      SecurityVulnerabilities.add(!loginSecure);
      
      // Test in GraphQL queries
      const graphqlResponse = http.post(API_URL, JSON.stringify({
        query: `query { securityEvents(filter: "${payload}") { id } }`
      }), {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'SQLInjection', payload: `graphql_${index}` }
      });
      
      const graphqlSecure = check(graphqlResponse, {
        'SQL injection in GraphQL blocked': (r) => r.status === 400 || (r.status === 200 && r.json().errors),
        'No SQL error exposure in GraphQL': (r) => !r.body.includes('SQL syntax'),
      });
      
      SecurityVulnerabilities.add(!graphqlSecure);
    });
  });
}

function testXSS() {
  group('Cross-Site Scripting (XSS) Tests', () => {
    // First, authenticate to get access to forms
    const authResponse = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
      email: 'test@company.com',
      password: 'testPassword123!'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
    const authHeaders = authResponse.status === 200 
      ? { 'Authorization': `Bearer ${authResponse.json().token}` }
      : {};
    
    XSS_PAYLOADS.forEach((payload, index) => {
      XSSAttempts.add(1);
      
      // Test XSS in incident creation
      const incidentResponse = http.post(`${API_URL}`, JSON.stringify({
        query: `
          mutation CreateIncident($input: IncidentInput!) {
            createIncident(input: $input) {
              id
              title
              description
            }
          }
        `,
        variables: {
          input: {
            title: payload,
            description: `Description with XSS: ${payload}`,
            severity: 'HIGH'
          }
        }
      }), {
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        tags: { name: 'XSS', payload: `incident_${index}` }
      });
      
      const xssSecure = check(incidentResponse, {
        'XSS payload sanitized': (r) => {
          if (r.status === 200 && r.json().data) {
            const data = r.json().data.createIncident;
            return !data.title.includes('<script>') && !data.description.includes('<script>');
          }
          return true; // If creation failed, it's also secure
        },
        'No JavaScript execution context': (r) => !r.body.includes('javascript:'),
      });
      
      SecurityVulnerabilities.add(!xssSecure);
      
      // Test XSS in search functionality
      const searchResponse = http.post(API_URL, JSON.stringify({
        query: `query SearchIncidents($query: String!) { incidents(search: $query) { id } }`,
        variables: { query: payload }
      }), {
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        tags: { name: 'XSS', payload: `search_${index}` }
      });
      
      const searchSecure = check(searchResponse, {
        'XSS in search sanitized': (r) => !r.body.includes('<script>') && !r.body.includes('onerror'),
      });
      
      SecurityVulnerabilities.add(!searchSecure);
    });
  });
}

function testAuthenticationBypass() {
  group('Authentication Bypass Tests', () => {
    AuthBypassAttempts.add(1);
    
    // Test direct access to protected endpoints without authentication
    const protectedEndpoints = [
      '/api/admin/users',
      '/api/incidents',
      '/api/threats',
      '/api/system/config',
    ];
    
    protectedEndpoints.forEach(endpoint => {
      const response = http.get(`${BASE_URL}${endpoint}`, {
        tags: { name: 'AuthBypass', endpoint }
      });
      
      const authSecure = check(response, {
        [`${endpoint} requires authentication`]: (r) => r.status === 401 || r.status === 403,
        [`${endpoint} no data leakage`]: (r) => r.status !== 200 || !r.body.includes('user') && !r.body.includes('admin'),
      });
      
      SecurityVulnerabilities.add(!authSecure);
    });
    
    // Test JWT token manipulation
    JWT_MANIPULATION_PAYLOADS.forEach((payload, index) => {
      const response = http.get(`${BASE_URL}/api/incidents`, {
        headers: { 'Authorization': payload },
        tags: { name: 'AuthBypass', payload: `jwt_${index}` }
      });
      
      const jwtSecure = check(response, {
        'Invalid JWT rejected': (r) => r.status === 401,
        'No privilege escalation': (r) => r.status !== 200,
      });
      
      SecurityVulnerabilities.add(!jwtSecure);
    });
  });
}

function testInputValidation() {
  group('Input Validation Tests', () => {
    // Test oversized inputs
    const oversizedPayload = randomString(10000); // 10KB payload
    
    const oversizeResponse = http.post(API_URL, JSON.stringify({
      query: `mutation CreateIncident($input: IncidentInput!) {
        createIncident(input: $input) { id }
      }`,
      variables: {
        input: {
          title: oversizedPayload,
          description: oversizedPayload,
          severity: 'HIGH'
        }
      }
    }), {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'InputValidation', type: 'oversize' }
    });
    
    const oversizeSecure = check(oversizeResponse, {
      'Oversized input rejected': (r) => r.status === 400 || r.status === 413,
      'No memory exhaustion': (r) => r.timings.duration < 5000, // Response within 5s
    });
    
    SecurityVulnerabilities.add(!oversizeSecure);
    
    // Test malformed JSON
    const malformedResponse = http.post(API_URL, '{"invalid": json}', {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'InputValidation', type: 'malformed' }
    });
    
    const malformedSecure = check(malformedResponse, {
      'Malformed JSON handled': (r) => r.status === 400,
      'No server error exposure': (r) => !r.body.includes('SyntaxError'),
    });
    
    SecurityVulnerabilities.add(!malformedSecure);
  });
}

function testCSRFProtection() {
  group('CSRF Protection Tests', () => {
    // Attempt to perform state-changing operations without CSRF token
    const csrfResponse = http.post(`${BASE_URL}/api/incidents`, JSON.stringify({
      title: 'CSRF Test Incident',
      severity: 'HIGH'
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Origin': 'http://malicious-site.com'
      },
      tags: { name: 'CSRF' }
    });
    
    const csrfSecure = check(csrfResponse, {
      'CSRF protection active': (r) => r.status === 403 || r.status === 401,
      'Origin header validated': (r) => r.status !== 200,
    });
    
    SecurityVulnerabilities.add(!csrfSecure);
  });
}

function testRateLimiting() {
  group('Rate Limiting Tests', () => {
    const requests = [];
    const startTime = Date.now();
    
    // Attempt to exceed rate limits
    for (let i = 0; i < 100; i++) {
      const response = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
        email: 'test@company.com',
        password: 'wrongpassword'
      }), {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'RateLimit', attempt: i }
      });
      
      requests.push(response);
      
      // Stop if rate limited
      if (response.status === 429) {
        break;
      }
    }
    
    const rateLimitSecure = check(requests, {
      'Rate limiting active': (reqs) => reqs.some(r => r.status === 429),
      'Rate limit not too restrictive': (reqs) => reqs.length > 10, // Allow at least 10 attempts
    });
    
    SecurityVulnerabilities.add(!rateLimitSecure);
  });
}

function testSecurityHeaders() {
  group('Security Headers Tests', () => {
    const response = http.get(BASE_URL, {
      tags: { name: 'SecurityHeaders' }
    });
    
    const headersSecure = check(response, {
      'X-Frame-Options header present': (r) => r.headers['X-Frame-Options'] !== undefined,
      'X-Content-Type-Options header present': (r) => r.headers['X-Content-Type-Options'] === 'nosniff',
      'X-XSS-Protection header present': (r) => r.headers['X-XSS-Protection'] !== undefined,
      'Content-Security-Policy header present': (r) => r.headers['Content-Security-Policy'] !== undefined,
      'Strict-Transport-Security header present': (r) => r.headers['Strict-Transport-Security'] !== undefined,
      'No server information disclosure': (r) => !r.headers['Server'] || !r.headers['Server'].includes('version'),
    });
    
    SecurityVulnerabilities.add(!headersSecure);
  });
}

function testFileUploadSecurity() {
  group('File Upload Security Tests', () => {
    // Test malicious file upload (if file upload exists)
    const maliciousFiles = [
      { name: 'test.php', content: '<?php system($_GET["cmd"]); ?>', type: 'application/x-php' },
      { name: 'test.jsp', content: '<% Runtime.exec(request.getParameter("cmd")); %>', type: 'application/x-jsp' },
      { name: 'test.exe', content: 'MZ\x90\x00', type: 'application/x-msdownload' },
      { name: '../../../etc/passwd', content: 'root:x:0:0:root', type: 'text/plain' },
    ];
    
    maliciousFiles.forEach(file => {
      const formData = {
        file: http.file(file.content, file.name, file.type),
      };
      
      const uploadResponse = http.post(`${BASE_URL}/api/upload`, formData, {
        tags: { name: 'FileUpload', file: file.name }
      });
      
      const uploadSecure = check(uploadResponse, {
        'Malicious file upload rejected': (r) => r.status === 400 || r.status === 415,
        'Path traversal blocked': (r) => !r.body.includes('/etc/passwd'),
        'Executable files blocked': (r) => file.name.includes('.exe') ? r.status !== 200 : true,
      });
      
      SecurityVulnerabilities.add(!uploadSecure);
    });
  });
}

function testAPISecurityMisconfiguration() {
  group('API Security Misconfiguration Tests', () => {
    // Test for sensitive endpoints exposure
    const sensitiveEndpoints = [
      '/api/debug',
      '/api/config',
      '/api/admin/logs',
      '/api/system/info',
      '/.env',
      '/config.json',
      '/swagger.json',
      '/graphql', // Should require authentication
    ];
    
    sensitiveEndpoints.forEach(endpoint => {
      const response = http.get(`${BASE_URL}${endpoint}`, {
        tags: { name: 'APIMisconfig', endpoint }
      });
      
      const apiSecure = check(response, {
        [`${endpoint} not exposed`]: (r) => r.status === 404 || r.status === 401 || r.status === 403,
        [`${endpoint} no sensitive data`]: (r) => {
          if (r.status === 200) {
            return !r.body.includes('password') && 
                   !r.body.includes('secret') && 
                   !r.body.includes('key') &&
                   !r.body.includes('token');
          }
          return true;
        },
      });
      
      SecurityVulnerabilities.add(!apiSecure);
    });
  });
}

function testBusinessLogicFlaws() {
  group('Business Logic Security Tests', () => {
    // Authenticate as regular user
    const authResponse = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
      email: 'analyst@company.com',
      password: 'analystPassword123!'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (authResponse.status === 200) {
      const token = authResponse.json().token;
      const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
      
      // Test privilege escalation attempts
      const adminOperations = [
        {
          name: 'Delete User',
          query: 'mutation { deleteUser(id: "admin") { success } }'
        },
        {
          name: 'Modify System Config',
          query: 'mutation { updateSystemConfig(config: { adminAccess: true }) { success } }'
        },
        {
          name: 'Access Admin Dashboard',
          query: 'query { adminDashboard { users { email password } } }'
        }
      ];
      
      adminOperations.forEach(operation => {
        const response = http.post(API_URL, JSON.stringify({
          query: operation.query
        }), {
          headers,
          tags: { name: 'PrivilegeEscalation', operation: operation.name }
        });
        
        const privilegeSecure = check(response, {
          [`${operation.name} privilege escalation blocked`]: (r) => {
            if (r.status === 200) {
              const body = r.json();
              return body.errors && body.errors.some(e => e.message.includes('permission'));
            }
            return r.status === 403 || r.status === 401;
          },
        });
        
        SecurityVulnerabilities.add(!privilegeSecure);
      });
    }
  });
}

// Main security test execution
export default function() {
  testSQLInjection();
  testXSS();
  testAuthenticationBypass();
  testInputValidation();
  testCSRFProtection();
  testRateLimiting();
  testSecurityHeaders();
  testFileUploadSecurity();
  testAPISecurityMisconfiguration();
  testBusinessLogicFlaws();
}

// Specialized security test scenarios
export function owasp10Test() {
  group('OWASP Top 10 Security Tests', () => {
    // A01:2021 – Broken Access Control
    testAuthenticationBypass();
    testBusinessLogicFlaws();
    
    // A02:2021 – Cryptographic Failures
    testSecurityHeaders();
    
    // A03:2021 – Injection
    testSQLInjection();
    
    // A04:2021 – Insecure Design
    testRateLimiting();
    
    // A05:2021 – Security Misconfiguration
    testAPISecurityMisconfiguration();
    
    // A06:2021 – Vulnerable and Outdated Components
    // (Would require dependency checking)
    
    // A07:2021 – Identification and Authentication Failures
    testAuthenticationBypass();
    
    // A08:2021 – Software and Data Integrity Failures
    testFileUploadSecurity();
    
    // A09:2021 – Security Logging and Monitoring Failures
    // (Would require log analysis)
    
    // A10:2021 – Server-Side Request Forgery (SSRF)
    testInputValidation();
  });
}

export function teardown(data) {
  console.log('Security testing completed');
  console.log(`SQL Injection attempts: ${SQLInjectionAttempts.value}`);
  console.log(`XSS attempts: ${XSSAttempts.value}`);
  console.log(`Auth bypass attempts: ${AuthBypassAttempts.value}`);
  console.log(`Security vulnerability rate: ${(SecurityVulnerabilities.rate * 100).toFixed(2)}%`);
  
  if (SecurityVulnerabilities.rate > 0.01) {
    console.warn('WARNING: Security vulnerabilities detected!');
  }
}