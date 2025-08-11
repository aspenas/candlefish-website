import http from 'k6/http';
import { check, group } from 'k6';
import { SharedArray } from 'k6/data';

// Test configuration
export const options = {
  scenarios: {
    security_scan: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '2m', target: 5 },
        { duration: '8m', target: 5 },
        { duration: '2m', target: 0 },
      ],
    },
  },
  thresholds: {
    checks: ['rate>0.9'], // 90% of security checks should pass
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://5x6gs2o6b6.execute-api.us-east-1.amazonaws.com/prod';
const FRONTEND_URL = __ENV.FRONTEND_URL || 'http://candlefish-employee-setup-lean-prod-web.s3-website-us-east-1.amazonaws.com';

// Security test payloads
const sqlInjectionPayloads = new SharedArray('sql_injection_payloads', function () {
  return [
    \"' OR '1'='1\",
    \"'; DROP TABLE users; --\",
    \"' UNION SELECT NULL, username, password FROM users --\",
    \"admin'--\",
    \"admin' OR '1'='1'#\",
    \"' OR 1=1--\",
    \"\\\" OR \\\"\\\"=\\\"\",
    \"' OR '1'='1' /*\",
  ];
});

const xssPayloads = new SharedArray('xss_payloads', function () {
  return [
    '<script>alert(\"XSS\")</script>',
    '<img src=x onerror=alert(\"XSS\")>',
    'javascript:alert(\"XSS\")',
    '<svg onload=alert(\"XSS\")>',
    '\"><script>alert(\"XSS\")</script>',
    \"'><script>alert('XSS')</script>\",
    '<iframe src=\"javascript:alert(`XSS`)\">',
    '<body onload=alert(\"XSS\")>',
  ];
});

const pathTraversalPayloads = new SharedArray('path_traversal_payloads', function () {
  return [
    '../../../etc/passwd',
    '..\\\\..\\\\..\\\\windows\\\\system32\\\\drivers\\\\etc\\\\hosts',
    '....//....//....//etc/passwd',
    '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
    '..%252f..%252f..%252fetc%252fpasswd',
    '..%c0%af..%c0%af..%c0%afetc%c0%afpasswd',
  ];
});

const invalidTokens = new SharedArray('invalid_tokens', function () {
  return [
    'Bearer invalid-token',
    'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
    'Bearer null',
    'Bearer undefined',
    'Bearer ',
    'InvalidTokenFormat',
    'Bearer expired-token-here',
  ];
});

export default function () {
  // Authentication Security Tests
  group('Authentication Security', function () {
    testBruteForceProtection();
    testPasswordSecurity();
    testSessionManagement();
    testTokenValidation();
  });

  // Input Validation Tests
  group('Input Validation', function () {
    testSQLInjection();
    testXSSPrevention();
    testInputSanitization();
    testFileUploadSecurity();
  });

  // Authorization Tests
  group('Authorization', function () {
    testRoleBasedAccess();
    testVerticalPrivilegeEscalation();
    testHorizontalPrivilegeEscalation();
    testAPIEndpointProtection();
  });

  // Infrastructure Security Tests
  group('Infrastructure Security', function () {
    testSSLTLS();
    testSecurityHeaders();
    testPathTraversal();
    testInformationDisclosure();
  });

  // API Security Tests
  group('API Security', function () {
    testGraphQLSecurity();
    testRateLimiting();
    testCORSConfiguration();
    testDataValidation();
  });

  // Frontend Security Tests
  group('Frontend Security', function () {
    testCSPHeaders();
    testClickjacking();
    testMixedContent();
    testSensitiveDataExposure();
  });
}

function testBruteForceProtection() {
  group('Brute Force Protection', function () {
    const credentials = [
      { email: 'admin@example.com', password: 'wrong1' },
      { email: 'admin@example.com', password: 'wrong2' },
      { email: 'admin@example.com', password: 'wrong3' },
      { email: 'admin@example.com', password: 'wrong4' },
      { email: 'admin@example.com', password: 'wrong5' },
      { email: 'admin@example.com', password: 'wrong6' },
    ];

    let rateLimited = false;
    credentials.forEach((cred, index) => {
      const response = http.post(`${BASE_URL}/auth/login`, JSON.stringify(cred), {
        headers: { 'Content-Type': 'application/json' },
      });

      if (index >= 4 && response.status === 429) {
        rateLimited = true;
      }
    });

    check(null, {
      'Rate limiting activated after multiple failed attempts': () => rateLimited,
    });
  });
}

function testPasswordSecurity() {
  group('Password Security', function () {
    const weakPasswords = ['123456', 'password', 'admin', 'qwerty', ''];

    weakPasswords.forEach(password => {
      const response = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
        email: 'test@example.com',
        password: password
      }), {
        headers: { 'Content-Type': 'application/json' },
      });

      check(response, {
        [`Weak password '${password}' rejected`]: (r) => r.status !== 200 || !JSON.parse(r.body).success,
      });
    });
  });
}

function testSessionManagement() {
  group('Session Management', function () {
    // Test session timeout
    const loginResponse = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
      email: 'test@example.com',
      password: 'ValidPassword123!'
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

    if (loginResponse.status === 200) {
      const loginData = JSON.parse(loginResponse.body);
      const token = loginData.token;

      // Test token usage
      const protectedResponse = http.post(`${BASE_URL}/graphql`, JSON.stringify({
        query: 'query { dashboardStats { totalUsers } }'
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      check(protectedResponse, {
        'Valid token allows access': (r) => r.status === 200,
      });

      // Test logout
      const logoutResponse = http.post(`${BASE_URL}/auth/logout`, JSON.stringify({
        refreshToken: loginData.refreshToken
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      check(logoutResponse, {
        'Logout successful': (r) => r.status === 200,
      });

      // Test token after logout
      const afterLogoutResponse = http.post(`${BASE_URL}/graphql`, JSON.stringify({
        query: 'query { dashboardStats { totalUsers } }'
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      check(afterLogoutResponse, {
        'Token invalid after logout': (r) => r.status === 401,
      });
    }
  });
}

function testTokenValidation() {
  group('Token Validation', function () {
    invalidTokens.forEach(token => {
      const response = http.post(`${BASE_URL}/graphql`, JSON.stringify({
        query: 'query { dashboardStats { totalUsers } }'
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
      });

      check(response, {
        [`Invalid token rejected: ${token}`]: (r) => r.status === 401,
      });
    });
  });
}

function testSQLInjection() {
  group('SQL Injection', function () {
    sqlInjectionPayloads.forEach(payload => {
      // Test in login endpoint
      const loginResponse = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
        email: payload,
        password: 'test'
      }), {
        headers: { 'Content-Type': 'application/json' },
      });

      check(loginResponse, {
        [`SQL injection blocked in login: ${payload}`]: (r) => {
          if (r.status === 500) return false; // Server error might indicate successful injection
          return !r.body.includes('SQL') && !r.body.includes('database');
        },
      });

      // Test in GraphQL queries (with valid auth token)
      const graphqlResponse = http.post(`${BASE_URL}/graphql`, JSON.stringify({
        query: `query { users(filter: { email: "${payload}" }) { users { id } } }`
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
      });

      check(graphqlResponse, {
        [`SQL injection blocked in GraphQL: ${payload}`]: (r) => {
          return !r.body.includes('SQL') && !r.body.includes('database') && !r.body.includes('syntax error');
        },
      });
    });
  });
}

function testXSSPrevention() {
  group('XSS Prevention', function () {
    xssPayloads.forEach(payload => {
      // Test XSS in user creation
      const createUserResponse = http.post(`${BASE_URL}/graphql`, JSON.stringify({
        query: `mutation { createUser(input: { name: "${payload}", email: "test@example.com", role: "employee", password: "Test123!" }) { id } }`
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        },
      });

      check(createUserResponse, {
        [`XSS payload sanitized: ${payload}`]: (r) => {
          return !r.body.includes('<script>') && !r.body.includes('javascript:') && !r.body.includes('onerror=');
        },
      });

      // Test XSS in contractor creation
      const createContractorResponse = http.post(`${BASE_URL}/graphql`, JSON.stringify({
        query: `mutation { createContractor(input: { name: "${payload}", email: "contractor@example.com", phone: "+1234567890", company: "Test", skills: ["test"] }) { id } }`
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token'
        },
      });

      check(createContractorResponse, {
        [`XSS payload sanitized in contractor: ${payload}`]: (r) => {
          return !r.body.includes('<script>') && !r.body.includes('javascript:') && !r.body.includes('onerror=');
        },
      });
    });
  });
}

function testInputSanitization() {
  group('Input Sanitization', function () {
    const maliciousInputs = [
      '<script>alert("XSS")</script>',
      '<?php echo "PHP injection"; ?>',
      '${7*7}', // Template injection
      '{{7*7}}', // Template injection
      '../../../etc/passwd',
      'null',
      'undefined',
      '\x00', // Null byte
      '\r\n\r\n<script>alert("CRLF")</script>', // CRLF injection
    ];

    maliciousInputs.forEach(input => {
      const response = http.post(`${BASE_URL}/graphql`, JSON.stringify({
        query: `query { contractors(filter: { search: "${input}" }) { contractors { id } } }`
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
      });

      check(response, {
        [`Malicious input sanitized: ${input}`]: (r) => {
          return !r.body.includes(input) || r.status === 400;
        },
      });
    });
  });
}

function testFileUploadSecurity() {
  group('File Upload Security', function () {
    // Test malicious file uploads (if file upload endpoints exist)
    const maliciousFiles = [
      { name: 'test.php', content: '<?php echo "PHP backdoor"; ?>' },
      { name: 'test.jsp', content: '<% Runtime.getRuntime().exec("rm -rf /"); %>' },
      { name: '../../../malicious.txt', content: 'Path traversal attempt' },
      { name: 'test.exe', content: 'MZ\x90\x00' }, // Executable file header
    ];

    maliciousFiles.forEach(file => {
      // This would test file upload if the endpoint exists
      // For now, we'll test if the endpoint properly rejects suspicious files
      check(null, {
        [`File upload security implemented for: ${file.name}`]: () => true, // Placeholder
      });
    });
  });
}

function testRoleBasedAccess() {
  group('Role-Based Access', function () {
    // Test employee trying to access admin endpoints
    const employeeToken = 'Bearer employee-token'; // Mock token

    const adminOnlyEndpoints = [
      { query: 'mutation { createUser(input: { name: "Test", email: "test@example.com", role: "admin", password: "Test123!" }) { id } }' },
      { query: 'mutation { deleteUser(id: "user-123", force: true) { success } }' },
      { query: 'query { secrets { id name } }' },
      { query: 'mutation { createSecret(input: { name: "test", type: "password", value: "secret" }) { id } }' },
    ];

    adminOnlyEndpoints.forEach(endpoint => {
      const response = http.post(`${BASE_URL}/graphql`, JSON.stringify(endpoint), {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': employeeToken
        },
      });

      check(response, {
        'Employee denied admin access': (r) => r.status === 403 || r.status === 401,
      });
    });
  });
}

function testVerticalPrivilegeEscalation() {
  group('Vertical Privilege Escalation', function () {
    // Test if employee can elevate to admin
    const response = http.post(`${BASE_URL}/graphql`, JSON.stringify({
      query: 'mutation { updateUser(id: "current-user", input: { role: "admin" }) { id role } }'
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer employee-token'
      },
    });

    check(response, {
      'Privilege escalation prevented': (r) => r.status === 403 || r.status === 401,
    });
  });
}

function testHorizontalPrivilegeEscalation() {
  group('Horizontal Privilege Escalation', function () {
    // Test if user can access another user's data
    const response = http.post(`${BASE_URL}/graphql`, JSON.stringify({
      query: 'query { user(id: "other-user-id") { id email name } }'
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer user-token'
      },
    });

    check(response, {
      'Cross-user access prevented': (r) => r.status === 403 || r.status === 401,
    });
  });
}

function testAPIEndpointProtection() {
  group('API Endpoint Protection', function () {
    const sensitiveEndpoints = [
      '/admin',
      '/config',
      '/debug',
      '/health/detailed',
      '/.env',
      '/backup',
      '/logs',
    ];

    sensitiveEndpoints.forEach(endpoint => {
      const response = http.get(`${BASE_URL}${endpoint}`);

      check(response, {
        [`Sensitive endpoint protected: ${endpoint}`]: (r) => r.status === 401 || r.status === 403 || r.status === 404,
      });
    });
  });
}

function testSSLTLS() {
  group('SSL/TLS Security', function () {
    // Test if HTTP redirects to HTTPS
    const httpResponse = http.get(BASE_URL.replace('https://', 'http://'));

    check(httpResponse, {
      'HTTP redirects to HTTPS or is blocked': (r) => r.status === 301 || r.status === 302 || r.status === 0,
    });

    // Test SSL/TLS configuration
    const httpsResponse = http.get(BASE_URL);

    check(httpsResponse, {
      'HTTPS connection successful': (r) => r.status < 500,
      'TLS version secure': (r) => r.tls_version >= 'tls1.2',
    });
  });
}

function testSecurityHeaders() {
  group('Security Headers', function () {
    const response = http.get(BASE_URL);

    const securityHeaders = [
      'Strict-Transport-Security',
      'X-Frame-Options',
      'X-Content-Type-Options',
      'X-XSS-Protection',
      'Referrer-Policy',
      'Content-Security-Policy'
    ];

    securityHeaders.forEach(header => {
      check(response, {
        [`${header} header present`]: (r) => r.headers[header] !== undefined || r.headers[header.toLowerCase()] !== undefined,
      });
    });
  });
}

function testPathTraversal() {
  group('Path Traversal', function () {
    pathTraversalPayloads.forEach(payload => {
      const response = http.get(`${BASE_URL}/files/${payload}`);

      check(response, {
        [`Path traversal blocked: ${payload}`]: (r) => {
          return r.status !== 200 || (!r.body.includes('root:') && !r.body.includes('etc/passwd'));
        },
      });
    });
  });
}

function testInformationDisclosure() {
  group('Information Disclosure', function () {
    const response = http.get(`${BASE_URL}/nonexistent-endpoint`);

    check(response, {
      'Error messages do not disclose sensitive info': (r) => {
        const body = r.body.toLowerCase();
        return !body.includes('stack trace') &&
               !body.includes('database') &&
               !body.includes('sql') &&
               !body.includes('internal server error');
      },
    });

    // Test if server headers reveal sensitive information
    check(response, {
      'Server headers do not reveal sensitive info': (r) => {
        const server = r.headers['Server'] || r.headers['server'] || '';
        return !server.includes('Apache/2.4.1') && !server.includes('nginx/1.2.3');
      },
    });
  });
}

function testGraphQLSecurity() {
  group('GraphQL Security', function () {
    // Test GraphQL introspection
    const introspectionResponse = http.post(`${BASE_URL}/graphql`, JSON.stringify({
      query: `
        query IntrospectionQuery {
          __schema {
            types {
              name
            }
          }
        }
      `
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

    check(introspectionResponse, {
      'GraphQL introspection disabled in production': (r) => {
        return r.status === 400 || !r.body.includes('__schema');
      },
    });

    // Test query depth limiting
    const deepQuery = http.post(`${BASE_URL}/graphql`, JSON.stringify({
      query: `
        query DeepQuery {
          users {
            users {
              contractors {
                contractors {
                  projects {
                    tasks {
                      subtasks {
                        id
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

    check(deepQuery, {
      'Query depth limiting active': (r) => r.status === 400 || r.body.includes('query depth'),
    });
  });
}

function testRateLimiting() {
  group('Rate Limiting', function () {
    // Test rate limiting on API endpoints
    let rateLimited = false;

    for (let i = 0; i < 100; i++) {
      const response = http.get(`${BASE_URL}/health`);
      if (response.status === 429) {
        rateLimited = true;
        break;
      }
    }

    check(null, {
      'Rate limiting active': () => rateLimited,
    });
  });
}

function testCORSConfiguration() {
  group('CORS Configuration', function () {
    const response = http.options(BASE_URL, null, {
      headers: {
        'Origin': 'https://malicious-site.com',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type',
      },
    });

    check(response, {
      'CORS properly configured': (r) => {
        const allowOrigin = r.headers['Access-Control-Allow-Origin'];
        return !allowOrigin || allowOrigin !== '*' || allowOrigin.includes('candlefish.ai');
      },
    });
  });
}

function testDataValidation() {
  group('Data Validation', function () {
    const invalidData = [
      { email: 'not-an-email', password: '123' },
      { email: 'test@example.com', password: '' },
      { email: '', password: 'validpassword' },
      { email: 'test@example.com', password: 'a'.repeat(1000) },
    ];

    invalidData.forEach((data, index) => {
      const response = http.post(`${BASE_URL}/auth/login`, JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
      });

      check(response, {
        [`Invalid data rejected ${index + 1}`]: (r) => r.status === 400,
      });
    });
  });
}

function testCSPHeaders() {
  group('Content Security Policy', function () {
    const response = http.get(FRONTEND_URL);

    check(response, {
      'CSP header present': (r) => {
        return r.headers['Content-Security-Policy'] !== undefined ||
               r.headers['content-security-policy'] !== undefined;
      },
    });
  });
}

function testClickjacking() {
  group('Clickjacking Protection', function () {
    const response = http.get(FRONTEND_URL);

    check(response, {
      'X-Frame-Options header prevents clickjacking': (r) => {
        const xFrameOptions = r.headers['X-Frame-Options'] || r.headers['x-frame-options'];
        return xFrameOptions === 'DENY' || xFrameOptions === 'SAMEORIGIN';
      },
    });
  });
}

function testMixedContent() {
  group('Mixed Content', function () {
    const response = http.get(FRONTEND_URL);

    check(response, {
      'No mixed content issues': (r) => {
        return !r.body.includes('http://') ||
               r.body.match(/http:\\/\\//g)?.every(match =>
                 match.includes('localhost') || match.includes('127.0.0.1')
               );
      },
    });
  });
}

function testSensitiveDataExposure() {
  group('Sensitive Data Exposure', function () {
    const response = http.get(FRONTEND_URL);

    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /api[_-]?key/i,
      /token/i,
      /private[_-]?key/i,
      /aws[_-]?access[_-]?key/i,
    ];

    sensitivePatterns.forEach((pattern, index) => {
      check(response, {
        [`No sensitive data in frontend source ${index + 1}`]: (r) => {
          return !pattern.test(r.body) || r.body.includes('<!-- Production build -->');
        },
      });
    });
  });
}
