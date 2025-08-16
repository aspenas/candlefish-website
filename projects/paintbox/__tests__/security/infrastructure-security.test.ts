/**
 * Infrastructure Security Test Suite
 * Security testing for authentication, authorization, input validation, and protection mechanisms
 */

import { describe, it, beforeEach, afterEach, expect } from '@jest/globals';
import { securityTestFactory } from '../factories/securityTestFactory';
import { createSecurityScanner } from '../helpers/securityScanner';
import { createPenetrationTester } from '../helpers/penetrationTester';

// Mock security dependencies
jest.mock('@/lib/security/authentication');
jest.mock('@/lib/security/authorization');
jest.mock('@/lib/security/rateLimiting');
jest.mock('@/lib/security/inputValidation');

describe('Infrastructure Security Tests', () => {
  let securityScanner: any;
  let penetrationTester: any;

  beforeEach(() => {
    securityScanner = createSecurityScanner();
    penetrationTester = createPenetrationTester();
  });

  afterEach(() => {
    securityScanner.cleanup();
    penetrationTester.cleanup();
  });

  describe('Authentication Security', () => {
    it('should enforce strong authentication for API endpoints', async () => {
      const endpoints = [
        '/api/health',
        '/api/workflows',
        '/api/load-testing',
        '/api/disaster-recovery',
        '/api/slack-integration'
      ];

      for (const endpoint of endpoints) {
        // Test without authentication
        const unauthenticatedResponse = await securityTestFactory.makeUnauthenticatedRequest(endpoint);
        expect(unauthenticatedResponse.status).toBe(401);

        // Test with invalid token
        const invalidTokenResponse = await securityTestFactory.makeRequestWithInvalidToken(endpoint);
        expect(invalidTokenResponse.status).toBe(401);

        // Test with expired token
        const expiredTokenResponse = await securityTestFactory.makeRequestWithExpiredToken(endpoint);
        expect(expiredTokenResponse.status).toBe(401);

        // Test with valid authentication
        const validResponse = await securityTestFactory.makeAuthenticatedRequest(endpoint);
        expect(validResponse.status).not.toBe(401);
      }
    });

    it('should implement secure JWT token handling', async () => {
      const testUser = securityTestFactory.createTestUser();
      
      // Generate JWT token
      const token = await securityTestFactory.generateJWTToken(testUser);
      
      // Validate token structure
      const tokenParts = token.split('.');
      expect(tokenParts.length).toBe(3); // Header, payload, signature
      
      // Verify token claims
      const decodedToken = await securityTestFactory.decodeJWTToken(token);
      expect(decodedToken.sub).toBe(testUser.id);
      expect(decodedToken.exp).toBeGreaterThan(Date.now() / 1000);
      expect(decodedToken.iat).toBeLessThanOrEqual(Date.now() / 1000);
      
      // Test token signature verification
      const isValid = await securityTestFactory.verifyJWTSignature(token);
      expect(isValid).toBe(true);
      
      // Test tampered token
      const tamperedToken = token.slice(0, -5) + 'XXXXX';
      const isTamperedValid = await securityTestFactory.verifyJWTSignature(tamperedToken);
      expect(isTamperedValid).toBe(false);
    });

    it('should protect against brute force attacks', async () => {
      const loginEndpoint = '/api/auth/login';
      const invalidCredentials = securityTestFactory.createInvalidCredentials();
      
      // Attempt multiple failed logins
      const failedAttempts = [];
      for (let i = 0; i < 20; i++) {
        const response = await securityTestFactory.attemptLogin(loginEndpoint, invalidCredentials);
        failedAttempts.push(response);
      }
      
      // Should start rate limiting after several attempts
      const rateLimitedAttempts = failedAttempts.filter(response => response.status === 429);
      expect(rateLimitedAttempts.length).toBeGreaterThan(0);
      
      // Should include appropriate headers
      const lastAttempt = failedAttempts[failedAttempts.length - 1];
      if (lastAttempt.status === 429) {
        expect(lastAttempt.headers['retry-after']).toBeDefined();
        expect(lastAttempt.headers['x-ratelimit-remaining']).toBeDefined();
      }
    });

    it('should implement secure session management', async () => {
      const testUser = securityTestFactory.createTestUser();
      
      // Create session
      const session = await securityTestFactory.createUserSession(testUser);
      expect(session.id).toBeDefined();
      expect(session.userId).toBe(testUser.id);
      expect(session.expiresAt).toBeGreaterThan(new Date());
      
      // Verify session security attributes
      expect(session.httpOnly).toBe(true);
      expect(session.secure).toBe(true);
      expect(session.sameSite).toBe('strict');
      
      // Test session validation
      const isValid = await securityTestFactory.validateSession(session.id);
      expect(isValid).toBe(true);
      
      // Test session invalidation
      await securityTestFactory.invalidateSession(session.id);
      const isValidAfterInvalidation = await securityTestFactory.validateSession(session.id);
      expect(isValidAfterInvalidation).toBe(false);
    });

    it('should enforce multi-factor authentication for admin operations', async () => {
      const adminUser = securityTestFactory.createAdminUser();
      const sensitiveEndpoints = [
        '/api/admin/users',
        '/api/admin/system-config',
        '/api/admin/security-settings'
      ];
      
      for (const endpoint of sensitiveEndpoints) {
        // Test access with just password authentication
        const singleFactorResponse = await securityTestFactory.makeAdminRequest(endpoint, {
          authMethod: 'password-only'
        });
        expect(singleFactorResponse.status).toBe(403); // Should require MFA
        
        // Test with MFA enabled
        const mfaCode = securityTestFactory.generateMFACode(adminUser);
        const mfaResponse = await securityTestFactory.makeAdminRequest(endpoint, {
          authMethod: 'password-mfa',
          mfaCode
        });
        expect(mfaResponse.status).not.toBe(403);
      }
    });
  });

  describe('Authorization Security', () => {
    it('should implement role-based access control', async () => {
      const roles = ['admin', 'operator', 'viewer'];
      const endpoints = {
        '/api/health': ['admin', 'operator', 'viewer'],
        '/api/workflows/create': ['admin', 'operator'],
        '/api/workflows/cancel': ['admin', 'operator'],
        '/api/system/config': ['admin'],
        '/api/disaster-recovery/trigger': ['admin']
      };
      
      for (const [endpoint, allowedRoles] of Object.entries(endpoints)) {
        for (const role of roles) {
          const user = securityTestFactory.createUserWithRole(role);
          const response = await securityTestFactory.makeAuthorizedRequest(endpoint, user);
          
          if (allowedRoles.includes(role)) {
            expect(response.status).not.toBe(403);
          } else {
            expect(response.status).toBe(403);
          }
        }
      }
    });

    it('should validate resource ownership', async () => {
      const user1 = securityTestFactory.createTestUser();
      const user2 = securityTestFactory.createTestUser();
      
      // User1 creates a workflow
      const workflow = await securityTestFactory.createWorkflow(user1);
      
      // User1 should be able to access their workflow
      const user1Response = await securityTestFactory.makeAuthorizedRequest(
        `/api/workflows/${workflow.id}`,
        user1
      );
      expect(user1Response.status).toBe(200);
      
      // User2 should not be able to access user1's workflow
      const user2Response = await securityTestFactory.makeAuthorizedRequest(
        `/api/workflows/${workflow.id}`,
        user2
      );
      expect(user2Response.status).toBe(403);
      
      // Admin should be able to access any workflow
      const adminUser = securityTestFactory.createAdminUser();
      const adminResponse = await securityTestFactory.makeAuthorizedRequest(
        `/api/workflows/${workflow.id}`,
        adminUser
      );
      expect(adminResponse.status).toBe(200);
    });

    it('should prevent privilege escalation', async () => {
      const regularUser = securityTestFactory.createTestUser();
      
      // Attempt to modify user role
      const roleEscalationResponse = await securityTestFactory.makeAuthorizedRequest(
        '/api/users/role',
        regularUser,
        {
          method: 'PUT',
          body: { userId: regularUser.id, role: 'admin' }
        }
      );
      expect(roleEscalationResponse.status).toBe(403);
      
      // Attempt to access admin endpoints
      const adminEndpoints = [
        '/api/admin/users',
        '/api/admin/system-config',
        '/api/admin/audit-logs'
      ];
      
      for (const endpoint of adminEndpoints) {
        const response = await securityTestFactory.makeAuthorizedRequest(endpoint, regularUser);
        expect(response.status).toBe(403);
      }
    });

    it('should implement fine-grained permissions', async () => {
      const permissions = {
        'health:read': '/api/health',
        'workflows:create': '/api/workflows',
        'workflows:cancel': '/api/workflows/cancel',
        'load-testing:run': '/api/load-testing/run',
        'disaster-recovery:backup': '/api/disaster-recovery/backup'
      };
      
      for (const [permission, endpoint] of Object.entries(permissions)) {
        // User with specific permission
        const userWithPermission = securityTestFactory.createUserWithPermissions([permission]);
        const allowedResponse = await securityTestFactory.makeAuthorizedRequest(endpoint, userWithPermission);
        expect(allowedResponse.status).not.toBe(403);
        
        // User without permission
        const userWithoutPermission = securityTestFactory.createUserWithPermissions([]);
        const deniedResponse = await securityTestFactory.makeAuthorizedRequest(endpoint, userWithoutPermission);
        expect(deniedResponse.status).toBe(403);
      }
    });
  });

  describe('Input Validation Security', () => {
    it('should prevent SQL injection attacks', async () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "1; DELETE FROM workflows WHERE 1=1; --",
        "'; INSERT INTO users (username, role) VALUES ('hacker', 'admin'); --"
      ];
      
      const endpoints = [
        '/api/workflows/search',
        '/api/health/services',
        '/api/load-testing/scenarios'
      ];
      
      for (const endpoint of endpoints) {
        for (const payload of sqlInjectionPayloads) {
          const response = await securityTestFactory.makeRequestWithPayload(endpoint, {
            query: payload,
            filter: payload,
            search: payload
          });
          
          // Should either reject the input or sanitize it safely
          expect(response.status).not.toBe(500); // No internal server errors
          
          if (response.status === 400) {
            expect(response.body.error).toContain('Invalid input');
          }
        }
      }
    });

    it('should prevent XSS attacks', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        '"><script>document.location="http://evil.com"</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(1)">',
        '&lt;script&gt;alert("xss")&lt;/script&gt;'
      ];
      
      const inputFields = [
        'workflowName',
        'description',
        'alertMessage',
        'scenarioName'
      ];
      
      for (const payload of xssPayloads) {
        for (const field of inputFields) {
          const response = await securityTestFactory.makeRequestWithPayload('/api/workflows', {
            [field]: payload
          });
          
          // Input should be rejected or properly escaped
          if (response.status === 200) {
            expect(response.body[field]).not.toContain('<script>');
            expect(response.body[field]).not.toContain('javascript:');
          } else {
            expect(response.status).toBe(400);
          }
        }
      }
    });

    it('should validate file upload security', async () => {
      const maliciousFiles = [
        securityTestFactory.createMaliciousFile('virus.exe', 'application/x-executable'),
        securityTestFactory.createMaliciousFile('script.php', 'application/x-php'),
        securityTestFactory.createMaliciousFile('payload.jsp', 'application/x-jsp'),
        securityTestFactory.createMaliciousFile('shell.sh', 'application/x-shellscript')
      ];
      
      const uploadEndpoint = '/api/workflows/import';
      
      for (const file of maliciousFiles) {
        const response = await securityTestFactory.uploadFile(uploadEndpoint, file);
        
        // Should reject malicious file types
        expect(response.status).toBe(400);
        expect(response.body.error).toContain('file type not allowed');
      }
      
      // Test file size limits
      const oversizedFile = securityTestFactory.createOversizedFile(100 * 1024 * 1024); // 100MB
      const oversizedResponse = await securityTestFactory.uploadFile(uploadEndpoint, oversizedFile);
      expect(oversizedResponse.status).toBe(413); // Payload too large
    });

    it('should sanitize and validate all input parameters', async () => {
      const endpoints = [
        {
          url: '/api/workflows',
          method: 'POST',
          requiredFields: ['name', 'type', 'config']
        },
        {
          url: '/api/load-testing/scenarios',
          method: 'POST',
          requiredFields: ['name', 'targetUrl', 'virtualUsers']
        },
        {
          url: '/api/alerts',
          method: 'POST',
          requiredFields: ['title', 'message', 'severity']
        }
      ];
      
      for (const endpoint of endpoints) {
        // Test missing required fields
        const missingFieldsResponse = await securityTestFactory.makeRequest(endpoint.url, {
          method: endpoint.method,
          body: {}
        });
        expect(missingFieldsResponse.status).toBe(400);
        
        // Test invalid data types
        const invalidTypesData = {};
        endpoint.requiredFields.forEach(field => {
          invalidTypesData[field] = {}; // Object instead of expected type
        });
        
        const invalidTypesResponse = await securityTestFactory.makeRequest(endpoint.url, {
          method: endpoint.method,
          body: invalidTypesData
        });
        expect(invalidTypesResponse.status).toBe(400);
        
        // Test excessive input lengths
        const excessiveLengthData = {};
        endpoint.requiredFields.forEach(field => {
          excessiveLengthData[field] = 'x'.repeat(10000); // Very long string
        });
        
        const excessiveLengthResponse = await securityTestFactory.makeRequest(endpoint.url, {
          method: endpoint.method,
          body: excessiveLengthData
        });
        expect(excessiveLengthResponse.status).toBe(400);
      }
    });
  });

  describe('Rate Limiting and DoS Protection', () => {
    it('should implement rate limiting on API endpoints', async () => {
      const endpoints = [
        { url: '/api/health', limit: 100, window: 60000 }, // 100 requests per minute
        { url: '/api/workflows', limit: 50, window: 60000 }, // 50 requests per minute
        { url: '/api/auth/login', limit: 5, window: 60000 } // 5 attempts per minute
      ];
      
      for (const endpoint of endpoints) {
        const requests = [];
        
        // Make requests up to the limit
        for (let i = 0; i < endpoint.limit + 10; i++) {
          requests.push(securityTestFactory.makeRequest(endpoint.url));
        }
        
        const responses = await Promise.all(requests);
        
        // Some requests should be rate limited
        const rateLimitedResponses = responses.filter(r => r.status === 429);
        expect(rateLimitedResponses.length).toBeGreaterThan(0);
        
        // Rate limited responses should include proper headers
        rateLimitedResponses.forEach(response => {
          expect(response.headers['x-ratelimit-limit']).toBeDefined();
          expect(response.headers['x-ratelimit-remaining']).toBeDefined();
          expect(response.headers['retry-after']).toBeDefined();
        });
      }
    });

    it('should protect against slowloris attacks', async () => {
      const slowRequests = [];
      
      // Create multiple slow connections
      for (let i = 0; i < 100; i++) {
        slowRequests.push(securityTestFactory.createSlowRequest('/api/health'));
      }
      
      // Server should handle slow requests gracefully
      const responses = await Promise.allSettled(slowRequests);
      
      // Most requests should eventually complete or timeout gracefully
      const successfulResponses = responses.filter(r => r.status === 'fulfilled');
      const timedOutResponses = responses.filter(r => r.status === 'rejected');
      
      // Should not crash the server
      expect(successfulResponses.length + timedOutResponses.length).toBe(slowRequests.length);
    });

    it('should handle large payload attacks', async () => {
      const largePayloads = [
        securityTestFactory.createLargeJSONPayload(10 * 1024 * 1024), // 10MB JSON
        securityTestFactory.createDeeplyNestedPayload(1000), // 1000 levels deep
        securityTestFactory.createRepeatedFieldPayload(100000) // 100k repeated fields
      ];
      
      for (const payload of largePayloads) {
        const response = await securityTestFactory.makeRequest('/api/workflows', {
          method: 'POST',
          body: payload
        });
        
        // Should reject oversized or malformed payloads
        expect([400, 413, 414]).toContain(response.status);
      }
    });

    it('should implement connection limits', async () => {
      const maxConnections = 1000;
      const connections = [];
      
      // Attempt to create many concurrent connections
      for (let i = 0; i < maxConnections + 100; i++) {
        connections.push(securityTestFactory.createConnection('/api/health'));
      }
      
      const connectionResults = await Promise.allSettled(connections);
      
      // Some connections should be rejected to prevent resource exhaustion
      const rejectedConnections = connectionResults.filter(r => 
        r.status === 'rejected' || 
        (r.status === 'fulfilled' && r.value.status >= 500)
      );
      
      expect(rejectedConnections.length).toBeGreaterThan(0);
    });
  });

  describe('Data Protection and Privacy', () => {
    it('should encrypt sensitive data at rest', async () => {
      const sensitiveData = {
        apiKeys: securityTestFactory.generateAPIKeys(),
        webhookSecrets: securityTestFactory.generateWebhookSecrets(),
        databaseCredentials: securityTestFactory.generateDBCredentials()
      };
      
      // Store sensitive data
      for (const [type, data] of Object.entries(sensitiveData)) {
        await securityTestFactory.storeSensitiveData(type, data);
      }
      
      // Verify data is encrypted in storage
      const storedData = await securityTestFactory.getStoredData();
      
      Object.values(sensitiveData).forEach(originalData => {
        // Original data should not appear in plaintext
        expect(JSON.stringify(storedData)).not.toContain(originalData.secret);
        expect(JSON.stringify(storedData)).not.toContain(originalData.key);
      });
      
      // Verify data can be decrypted correctly
      for (const [type, originalData] of Object.entries(sensitiveData)) {
        const decryptedData = await securityTestFactory.retrieveSensitiveData(type);
        expect(decryptedData).toEqual(originalData);
      }
    });

    it('should implement secure data transmission', async () => {
      const endpoints = [
        '/api/health',
        '/api/workflows',
        '/api/load-testing',
        '/api/disaster-recovery'
      ];
      
      for (const endpoint of endpoints) {
        // Test HTTPS enforcement
        const httpResponse = await securityTestFactory.makeInsecureRequest(endpoint);
        expect(httpResponse.status).toBe(301); // Should redirect to HTTPS
        
        // Test HSTS headers
        const httpsResponse = await securityTestFactory.makeSecureRequest(endpoint);
        expect(httpsResponse.headers['strict-transport-security']).toBeDefined();
        
        // Test TLS version
        const tlsInfo = await securityTestFactory.getTLSInfo(endpoint);
        expect(tlsInfo.version).toMatch(/TLSv1\.[23]/); // TLS 1.2 or 1.3
        expect(tlsInfo.cipher).toBeDefined();
        expect(tlsInfo.certificate.valid).toBe(true);
      }
    });

    it('should protect against data leakage in logs', async () => {
      const sensitiveData = {
        password: 'secretPassword123',
        apiKey: 'api_key_abc123def456',
        creditCard: '4111-1111-1111-1111',
        ssn: '123-45-6789'
      };
      
      // Make requests with sensitive data
      await securityTestFactory.makeRequestWithSensitiveData('/api/auth/login', sensitiveData);
      
      // Check logs for sensitive data leakage
      const logs = await securityTestFactory.getApplicationLogs();
      
      Object.values(sensitiveData).forEach(sensitive => {
        expect(logs).not.toContain(sensitive);
      });
      
      // Verify sensitive data is properly masked
      expect(logs).toContain('password: [REDACTED]');
      expect(logs).toContain('apiKey: [REDACTED]');
    });

    it('should implement data retention policies', async () => {
      const retentionPolicies = {
        userSessions: 30 * 24 * 60 * 60 * 1000, // 30 days
        auditLogs: 365 * 24 * 60 * 60 * 1000, // 1 year
        temporaryFiles: 24 * 60 * 60 * 1000, // 24 hours
        workflowLogs: 90 * 24 * 60 * 60 * 1000 // 90 days
      };
      
      for (const [dataType, retentionPeriod] of Object.entries(retentionPolicies)) {
        // Create old data
        const oldData = await securityTestFactory.createOldData(dataType, retentionPeriod + 1000);
        
        // Run data cleanup
        await securityTestFactory.runDataCleanup(dataType);
        
        // Verify old data is removed
        const remainingData = await securityTestFactory.checkDataExists(oldData.id);
        expect(remainingData).toBe(false);
      }
    });
  });

  describe('Webhook Security', () => {
    it('should validate webhook signatures properly', async () => {
      const webhookEndpoints = [
        '/api/webhooks/slack',
        '/api/webhooks/github'
      ];
      
      for (const endpoint of webhookEndpoints) {
        const payload = securityTestFactory.createWebhookPayload();
        
        // Test with valid signature
        const validSignature = securityTestFactory.generateWebhookSignature(payload, endpoint);
        const validResponse = await securityTestFactory.sendWebhook(endpoint, payload, validSignature);
        expect(validResponse.status).toBe(200);
        
        // Test with invalid signature
        const invalidSignature = 'invalid_signature';
        const invalidResponse = await securityTestFactory.sendWebhook(endpoint, payload, invalidSignature);
        expect(invalidResponse.status).toBe(401);
        
        // Test with missing signature
        const missingSignatureResponse = await securityTestFactory.sendWebhook(endpoint, payload);
        expect(missingSignatureResponse.status).toBe(401);
        
        // Test with tampered payload
        const tamperedPayload = { ...payload, malicious: 'code' };
        const tamperedResponse = await securityTestFactory.sendWebhook(endpoint, tamperedPayload, validSignature);
        expect(tamperedResponse.status).toBe(401);
      }
    });

    it('should prevent webhook replay attacks', async () => {
      const payload = securityTestFactory.createWebhookPayload();
      const signature = securityTestFactory.generateWebhookSignature(payload);
      
      // First request should succeed
      const firstResponse = await securityTestFactory.sendWebhook('/api/webhooks/slack', payload, signature);
      expect(firstResponse.status).toBe(200);
      
      // Replay the same request
      const replayResponse = await securityTestFactory.sendWebhook('/api/webhooks/slack', payload, signature);
      expect(replayResponse.status).toBe(409); // Conflict - already processed
    });

    it('should implement webhook rate limiting', async () => {
      const payload = securityTestFactory.createWebhookPayload();
      const requests = [];
      
      // Send many webhook requests rapidly
      for (let i = 0; i < 100; i++) {
        const signature = securityTestFactory.generateWebhookSignature({ ...payload, id: i });
        requests.push(securityTestFactory.sendWebhook('/api/webhooks/slack', { ...payload, id: i }, signature));
      }
      
      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Security Headers and CORS', () => {
    it('should include security headers in responses', async () => {
      const response = await securityTestFactory.makeRequest('/api/health');
      
      const requiredHeaders = {
        'x-frame-options': 'DENY',
        'x-content-type-options': 'nosniff',
        'x-xss-protection': '1; mode=block',
        'referrer-policy': 'strict-origin-when-cross-origin',
        'permissions-policy': expect.any(String)
      };
      
      Object.entries(requiredHeaders).forEach(([header, expectedValue]) => {
        expect(response.headers[header]).toBeDefined();
        if (typeof expectedValue === 'string') {
          expect(response.headers[header]).toBe(expectedValue);
        }
      });
    });

    it('should implement proper CORS policies', async () => {
      const allowedOrigins = ['https://app.paintbox.com', 'https://dashboard.paintbox.com'];
      const blockedOrigins = ['https://evil.com', 'http://localhost:3000'];
      
      // Test allowed origins
      for (const origin of allowedOrigins) {
        const response = await securityTestFactory.makeCORSRequest('/api/health', origin);
        expect(response.headers['access-control-allow-origin']).toBe(origin);
      }
      
      // Test blocked origins
      for (const origin of blockedOrigins) {
        const response = await securityTestFactory.makeCORSRequest('/api/health', origin);
        expect(response.headers['access-control-allow-origin']).not.toBe(origin);
      }
      
      // Test preflight requests
      const preflightResponse = await securityTestFactory.makePreflightRequest('/api/workflows');
      expect(preflightResponse.status).toBe(200);
      expect(preflightResponse.headers['access-control-allow-methods']).toContain('POST');
      expect(preflightResponse.headers['access-control-allow-headers']).toContain('authorization');
    });

    it('should prevent clickjacking attacks', async () => {
      const endpoints = ['/api/health', '/infrastructure', '/workflows'];
      
      for (const endpoint of endpoints) {
        const response = await securityTestFactory.makeRequest(endpoint);
        
        // Should have X-Frame-Options or CSP frame-ancestors
        const hasFrameOptions = response.headers['x-frame-options'];
        const hasCSP = response.headers['content-security-policy']?.includes('frame-ancestors');
        
        expect(hasFrameOptions || hasCSP).toBeTruthy();
        
        if (hasFrameOptions) {
          expect(['DENY', 'SAMEORIGIN']).toContain(response.headers['x-frame-options']);
        }
      }
    });
  });

  describe('Audit Logging and Monitoring', () => {
    it('should log security events', async () => {
      const securityEvents = [
        { action: 'failed_login', endpoint: '/api/auth/login' },
        { action: 'unauthorized_access', endpoint: '/api/admin/users' },
        { action: 'privilege_escalation', endpoint: '/api/users/role' },
        { action: 'suspicious_activity', endpoint: '/api/workflows' }
      ];
      
      for (const event of securityEvents) {
        await securityTestFactory.triggerSecurityEvent(event);
      }
      
      // Check audit logs
      const auditLogs = await securityTestFactory.getAuditLogs();
      
      securityEvents.forEach(event => {
        const logEntry = auditLogs.find(log => 
          log.action === event.action && log.endpoint === event.endpoint
        );
        
        expect(logEntry).toBeDefined();
        expect(logEntry.timestamp).toBeDefined();
        expect(logEntry.userAgent).toBeDefined();
        expect(logEntry.ipAddress).toBeDefined();
      });
    });

    it('should detect and alert on suspicious patterns', async () => {
      // Simulate suspicious activity patterns
      const suspiciousPatterns = [
        { type: 'multiple_failed_logins', count: 10 },
        { type: 'unusual_access_hours', time: '03:00' },
        { type: 'privilege_escalation_attempts', count: 5 },
        { type: 'mass_data_access', count: 1000 }
      ];
      
      for (const pattern of suspiciousPatterns) {
        await securityTestFactory.simulateSuspiciousPattern(pattern);
      }
      
      // Check security alerts
      const securityAlerts = await securityTestFactory.getSecurityAlerts();
      
      expect(securityAlerts.length).toBeGreaterThan(0);
      
      suspiciousPatterns.forEach(pattern => {
        const alert = securityAlerts.find(a => a.type === pattern.type);
        expect(alert).toBeDefined();
        expect(alert.severity).toMatch(/^(medium|high|critical)$/);
      });
    });

    it('should implement real-time security monitoring', async () => {
      const monitor = securityTestFactory.createSecurityMonitor();
      
      // Start monitoring
      monitor.start();
      
      // Generate various security events
      const events = [
        securityTestFactory.createFailedLoginAttempt(),
        securityTestFactory.createUnauthorizedAccessAttempt(),
        securityTestFactory.createSuspiciousFileUpload(),
        securityTestFactory.createAnomalousTrafficPattern()
      ];
      
      for (const event of events) {
        await securityTestFactory.triggerSecurityEvent(event);
      }
      
      // Allow monitoring to process events
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const monitorResults = monitor.getResults();
      
      expect(monitorResults.eventsDetected).toBe(events.length);
      expect(monitorResults.alertsGenerated).toBeGreaterThan(0);
      expect(monitorResults.responseTime).toBeLessThan(5000); // Should respond within 5 seconds
      
      monitor.stop();
    });
  });
});