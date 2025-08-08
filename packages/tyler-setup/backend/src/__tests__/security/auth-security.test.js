import request from 'supertest';
import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import app from '../../index.js';

// Mock rate limiter for security tests
jest.mock('../../middleware/rateLimiter.js', () => ({
  rateLimiter: (req, res, next) => next(),
  strictRateLimiter: (req, res, next) => next()
}));

describe('Authentication Security Tests', () => {
  describe('JWT Token Security', () => {
    test('should reject requests with no authorization header', async () => {
      const response = await request(app)
        .get('/api/aws-secrets')
        .expect(401);

      expect(response.body.error).toMatch(/unauthorized|token/i);
    });

    test('should reject malformed authorization headers', async () => {
      const malformedHeaders = [
        'InvalidToken',
        'Bearer',
        'Bearer ',
        'bearer token123',
        'Basic dGVzdDp0ZXN0', // Base64 encoded, wrong auth type
      ];

      for (const header of malformedHeaders) {
        const response = await request(app)
          .get('/api/aws-secrets')
          .set('Authorization', header)
          .expect(401);

        expect(response.body.error).toMatch(/unauthorized|invalid.*token/i);
      }
    });

    test('should reject expired JWT tokens', async () => {
      const expiredToken = jwt.sign(
        { id: 'test', username: 'test' },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' } // Already expired
      );

      const response = await request(app)
        .get('/api/aws-secrets')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.error).toMatch(/expired|unauthorized/i);
    });

    test('should reject JWT tokens with invalid signatures', async () => {
      const invalidToken = jwt.sign(
        { id: 'test', username: 'test' },
        'wrong-secret-key',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/aws-secrets')
        .set('Authorization', `Bearer ${invalidToken}`)
        .expect(401);

      expect(response.body.error).toMatch(/invalid.*token|unauthorized/i);
    });

    test('should reject JWT tokens with missing required claims', async () => {
      const tokenWithoutId = jwt.sign(
        { username: 'test' }, // Missing id claim
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/aws-secrets')
        .set('Authorization', `Bearer ${tokenWithoutId}`)
        .expect(401);

      expect(response.body.error).toMatch(/invalid.*token|missing.*claims/i);
    });

    test('should validate JWT token algorithm', async () => {
      // Create token with 'none' algorithm (security vulnerability)
      const noneAlgToken = jwt.sign(
        { id: 'test', username: 'test' },
        '', // Empty secret for 'none' algorithm
        { algorithm: 'none' }
      );

      const response = await request(app)
        .get('/api/aws-secrets')
        .set('Authorization', `Bearer ${noneAlgToken}`)
        .expect(401);

      expect(response.body.error).toMatch(/invalid.*token|unauthorized/i);
    });

    test('should handle extremely long JWT tokens', async () => {
      const longPayload = {
        id: 'test',
        username: 'test',
        data: 'x'.repeat(10000) // Very long data
      };

      const longToken = jwt.sign(longPayload, process.env.JWT_SECRET, { expiresIn: '1h' });

      const response = await request(app)
        .get('/api/aws-secrets')
        .set('Authorization', `Bearer ${longToken}`)
        .expect(401);

      // Should reject or handle gracefully
      expect([400, 401, 413]).toContain(response.status);
    });

    test('should not accept JWT tokens in URL parameters for sensitive operations', async () => {
      const validToken = jwt.sign(
        { id: 'test', username: 'test', role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Token in query parameter should be rejected for API routes
      const response = await request(app)
        .get(`/api/aws-secrets?token=${validToken}`)
        .expect(401);

      expect(response.body.error).toMatch(/unauthorized|invalid.*token/i);
    });
  });

  describe('Role-Based Access Control (RBAC)', () => {
    function createTokenWithRole(role) {
      return jwt.sign(
        { id: 'test', username: 'test', role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    }

    test('should enforce admin-only access to sensitive endpoints', async () => {
      const userToken = createTokenWithRole('user');
      const adminEndpoints = [
        '/api/config',
        '/api/settings',
      ];

      for (const endpoint of adminEndpoints) {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(401);

        expect(response.body.error).toMatch(/insufficient.*permission|unauthorized|admin.*required/i);
      }
    });

    test('should allow admin access to all endpoints', async () => {
      const adminToken = createTokenWithRole('admin');

      // These should succeed (mocked AWS calls will still fail, but auth should pass)
      const protectedEndpoints = [
        '/api/config',
        '/api/settings',
        '/api/aws-secrets'
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${adminToken}`);

        // Should not fail with 401 (auth error)
        expect(response.status).not.toBe(401);
      }
    });

    test('should validate role injection attacks', async () => {
      // Attempt to inject admin role via token manipulation
      const tokenWithInjectedRole = jwt.sign(
        {
          id: 'test',
          username: 'test',
          role: 'user',
          'role\\": \\"admin': true // JSON injection attempt
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/settings')
        .set('Authorization', `Bearer ${tokenWithInjectedRole}`)
        .expect(401);

      expect(response.body.error).toMatch(/insufficient.*permission|unauthorized/i);
    });
  });

  describe('Input Validation and Sanitization', () => {
    function createValidToken() {
      return jwt.sign(
        { id: 'test', username: 'test', role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    }

    test('should sanitize SQL injection attempts', async () => {
      const token = createValidToken();
      const sqlInjectionAttempts = [
        "test'; DROP TABLE aws_secrets; --",
        "test' OR '1'='1",
        "test'; INSERT INTO aws_secrets VALUES ('malicious'); --"
      ];

      for (const maliciousInput of sqlInjectionAttempts) {
        const response = await request(app)
          .get(`/api/aws-secrets/${encodeURIComponent(maliciousInput)}/metadata`)
          .set('Authorization', `Bearer ${token}`);

        // Should not cause SQL errors or return sensitive data
        expect([400, 404, 500]).toContain(response.status);
        if (response.body.error) {
          expect(response.body.error).not.toMatch(/sql|database|syntax/i);
        }
      }
    });

    test('should prevent NoSQL injection attempts', async () => {
      const token = createValidToken();
      const nosqlPayloads = [
        { $ne: null },
        { $gt: "" },
        { $where: "function() { return true; }" }
      ];

      for (const payload of nosqlPayloads) {
        const response = await request(app)
          .post('/api/aws-secrets')
          .set('Authorization', `Bearer ${token}`)
          .send({
            name: 'test-secret',
            value: payload // NoSQL injection in value
          });

        // Should not process malicious payloads
        expect([400, 422, 500]).toContain(response.status);
      }
    });

    test('should validate and sanitize XSS attempts', async () => {
      const token = createValidToken();
      const xssPayloads = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(1)">',
        '"><script>alert("xss")</script>'
      ];

      for (const xssPayload of xssPayloads) {
        const response = await request(app)
          .post('/api/aws-secrets')
          .set('Authorization', `Bearer ${token}`)
          .send({
            name: xssPayload,
            value: 'test-value',
            description: xssPayload
          });

        // Should sanitize or reject XSS content
        if (response.status === 201) {
          expect(response.body.name).not.toContain('<script>');
          expect(response.body.description).not.toContain('<script>');
        }
      }
    });

    test('should enforce input length limits', async () => {
      const token = createValidToken();
      const veryLongString = 'x'.repeat(10000);

      const response = await request(app)
        .post('/api/aws-secrets')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: veryLongString,
          value: veryLongString,
          description: veryLongString
        });

      // Should reject overly long inputs
      expect([400, 413, 422]).toContain(response.status);
    });

    test('should validate file path traversal attempts', async () => {
      const token = createValidToken();
      const pathTraversalAttempts = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32\\config',
        '/etc/shadow',
        'C:\\Windows\\System32\\config\\SAM'
      ];

      for (const maliciousPath of pathTraversalAttempts) {
        const response = await request(app)
          .get(`/api/aws-secrets/${encodeURIComponent(maliciousPath)}/metadata`)
          .set('Authorization', `Bearer ${token}`);

        // Should not allow path traversal
        expect([400, 404]).toContain(response.status);
      }
    });
  });

  describe('Rate Limiting and DoS Protection', () => {
    // Note: This test may need actual rate limiter implementation
    test('should implement rate limiting on authentication endpoints', async () => {
      const requests = [];
      const maxRequests = 10;

      // Rapid-fire requests
      for (let i = 0; i < maxRequests; i++) {
        requests.push(
          request(app)
            .post('/api/auth/login')
            .send({
              username: 'test@example.com',
              password: 'wrongpassword'
            })
        );
      }

      const responses = await Promise.all(requests);

      // At least some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('should handle large payload attacks', async () => {
      const token = jwt.sign(
        { id: 'test', username: 'test', role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const largePayload = {
        name: 'test',
        value: JSON.stringify({ data: 'x'.repeat(50000) }), // Very large JSON
        description: 'x'.repeat(10000)
      };

      const response = await request(app)
        .post('/api/aws-secrets')
        .set('Authorization', `Bearer ${token}`)
        .send(largePayload);

      // Should reject large payloads
      expect([413, 400]).toContain(response.status);
    });
  });

  describe('HTTPS and Security Headers', () => {
    test('should include security headers in responses', async () => {
      const response = await request(app)
        .get('/health');

      // Check for essential security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-xss-protection']).toBeDefined();
      expect(response.headers['content-security-policy']).toBeDefined();
    });

    test('should not expose sensitive information in error responses', async () => {
      const invalidToken = 'invalid.jwt.token';

      const response = await request(app)
        .get('/api/aws-secrets')
        .set('Authorization', `Bearer ${invalidToken}`);

      // Error response should not contain sensitive details
      expect(response.body.error).not.toMatch(/secret|key|password|database|internal/i);
      expect(response.body).not.toHaveProperty('stack');
      expect(response.body).not.toHaveProperty('sqlQuery');
    });

    test('should handle CORS properly for security', async () => {
      const response = await request(app)
        .options('/api/aws-secrets')
        .set('Origin', 'http://malicious-site.com');

      // Should not allow unauthorized origins
      expect(response.headers['access-control-allow-origin']).not.toBe('http://malicious-site.com');
    });
  });

  describe('Session Security', () => {
    test('should invalidate tokens after logout', async () => {
      // This test assumes token blacklisting is implemented
      const token = jwt.sign(
        { id: 'test', username: 'test', role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Use token successfully
      let response = await request(app)
        .get('/api/aws-secrets')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).not.toBe(401);

      // Logout (assuming logout endpoint exists)
      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      // Token should now be invalid
      response = await request(app)
        .get('/api/aws-secrets')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(response.body.error).toMatch(/invalid.*token|unauthorized/i);
    });

    test('should enforce token refresh for long-running sessions', async () => {
      // Test assumes refresh token mechanism
      const shortLivedToken = jwt.sign(
        { id: 'test', username: 'test', role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '1s' } // Very short expiry
      );

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 2000));

      const response = await request(app)
        .get('/api/aws-secrets')
        .set('Authorization', `Bearer ${shortLivedToken}`)
        .expect(401);

      expect(response.body.error).toMatch(/expired|unauthorized/i);
    });
  });

  describe('Information Disclosure Prevention', () => {
    test('should not leak sensitive information in 404 responses', async () => {
      const token = jwt.sign(
        { id: 'test', username: 'test', role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/aws-secrets/non-existent-secret/metadata')
        .set('Authorization', `Bearer ${token}`);

      // Should not reveal whether secret exists or internal paths
      expect(response.body.error).not.toMatch(/database|table|column|internal/i);
    });

    test('should not expose internal error details to clients', async () => {
      const token = jwt.sign(
        { id: 'test', username: 'test', role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Cause an internal server error
      const response = await request(app)
        .post('/api/aws-secrets')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: null, // Invalid data to cause error
          value: null
        });

      // Should not expose stack traces or internal details
      expect(response.body).not.toHaveProperty('stack');
      expect(response.body).not.toHaveProperty('trace');
      expect(response.body.error).not.toMatch(/line \d+|\.js:|internal/i);
    });
  });
});
