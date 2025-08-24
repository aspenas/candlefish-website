/**
 * Security tests for authentication and authorization
 * Tests access control, JWT security, and permission enforcement
 */

import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../src/deployment-api/app';
import * as authService from '../../src/deployment-api/services/auth.service';
import { generateTestJWT, expiredJWT, malformedJWT } from '../utils/jwt-helpers';

describe('Authentication & Authorization Security Tests', () => {

  describe('JWT Authentication', () => {
    it('should reject requests without authentication token', async () => {
      const response = await request(app)
        .get('/api/deployments')
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'Unauthorized',
        message: expect.stringContaining('authentication required')
      });
    });

    it('should reject requests with malformed JWT tokens', async () => {
      const malformedTokens = [
        'invalid.token.format',
        'Bearer invalid-token',
        'Bearer ',
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid',
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.invalid'
      ];

      for (const token of malformedTokens) {
        await request(app)
          .get('/api/deployments')
          .set('Authorization', token)
          .expect(401)
          .expect(res => {
            expect(res.body.error).toBe('Unauthorized');
          });
      }
    });

    it('should reject expired JWT tokens', async () => {
      const expiredToken = generateTestJWT({
        sub: 'user-123',
        role: 'admin',
        permissions: ['deployments:read'],
        exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
      });

      await request(app)
        .get('/api/deployments')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401)
        .expect(res => {
          expect(res.body.message).toContain('expired');
        });
    });

    it('should reject JWT tokens with invalid signature', async () => {
      const tokenWithInvalidSignature = generateTestJWT({
        sub: 'user-123',
        role: 'admin'
      }, 'wrong-secret');

      await request(app)
        .get('/api/deployments')
        .set('Authorization', `Bearer ${tokenWithInvalidSignature}`)
        .expect(401)
        .expect(res => {
          expect(res.body.message).toContain('invalid signature');
        });
    });

    it('should reject JWT tokens without required claims', async () => {
      const tokensWithMissingClaims = [
        generateTestJWT({ role: 'admin' }), // Missing sub
        generateTestJWT({ sub: 'user-123' }), // Missing role
        generateTestJWT({ sub: 'user-123', role: '' }), // Empty role
      ];

      for (const token of tokensWithMissingClaims) {
        await request(app)
          .get('/api/deployments')
          .set('Authorization', `Bearer ${token}`)
          .expect(401)
          .expect(res => {
            expect(res.body.message).toContain('invalid token claims');
          });
      }
    });

    it('should handle JWT token replay attacks', async () => {
      const validToken = generateTestJWT({
        sub: 'user-123',
        role: 'admin',
        permissions: ['deployments:read'],
        jti: 'unique-token-id-123' // JWT ID for tracking
      });

      // First request should succeed
      await request(app)
        .get('/api/deployments')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      // Simulate token being blacklisted (revoked)
      jest.spyOn(authService, 'isTokenRevoked').mockResolvedValue(true);

      // Same token should now be rejected
      await request(app)
        .get('/api/deployments')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(401)
        .expect(res => {
          expect(res.body.message).toContain('revoked');
        });
    });
  });

  describe('Role-Based Access Control', () => {
    it('should allow admin users full access', async () => {
      const adminToken = generateTestJWT({
        sub: 'admin-123',
        role: 'admin',
        permissions: ['deployments:create', 'deployments:read', 'deployments:rollback', 'secrets:rotate']
      });

      // Admin should access all endpoints
      await request(app)
        .get('/api/deployments')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      await request(app)
        .post('/api/deployments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          site_name: 'docs',
          environment: 'staging',
          commit_sha: 'a1b2c3d4e5f6789012345678901234567890abcd',
          branch: 'main'
        })
        .expect(201);

      await request(app)
        .post('/api/secrets/rotate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ secret_name: 'test-secret' })
        .expect(202);
    });

    it('should restrict developer users appropriately', async () => {
      const developerToken = generateTestJWT({
        sub: 'dev-123',
        role: 'developer',
        permissions: ['deployments:create', 'deployments:read']
      });

      // Developer can read and create deployments
      await request(app)
        .get('/api/deployments')
        .set('Authorization', `Bearer ${developerToken}`)
        .expect(200);

      await request(app)
        .post('/api/deployments')
        .set('Authorization', `Bearer ${developerToken}`)
        .send({
          site_name: 'docs',
          environment: 'staging',
          commit_sha: 'a1b2c3d4e5f6789012345678901234567890abcd',
          branch: 'feature/test'
        })
        .expect(201);

      // But cannot rotate secrets
      await request(app)
        .post('/api/secrets/rotate')
        .set('Authorization', `Bearer ${developerToken}`)
        .send({ secret_name: 'test-secret' })
        .expect(403)
        .expect(res => {
          expect(res.body.message).toContain('insufficient permissions');
        });

      // And cannot access audit logs
      await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${developerToken}`)
        .expect(403);
    });

    it('should restrict viewer users to read-only access', async () => {
      const viewerToken = generateTestJWT({
        sub: 'viewer-123',
        role: 'viewer',
        permissions: ['deployments:read']
      });

      // Viewer can read deployments
      await request(app)
        .get('/api/deployments')
        .set('Authorization', `Bearer ${viewerToken}`)
        .expect(200);

      // But cannot create deployments
      await request(app)
        .post('/api/deployments')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          site_name: 'docs',
          environment: 'staging',
          commit_sha: 'a1b2c3d4e5f6789012345678901234567890abcd',
          branch: 'main'
        })
        .expect(403);

      // Cannot initiate rollbacks
      await request(app)
        .post('/api/deployments/test-id/rollback')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ rollback_target: 'previous' })
        .expect(403);

      // Cannot rotate secrets
      await request(app)
        .post('/api/secrets/rotate')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ secret_name: 'test-secret' })
        .expect(403);
    });

    it('should prevent privilege escalation attempts', async () => {
      const userToken = generateTestJWT({
        sub: 'user-123',
        role: 'viewer',
        permissions: ['deployments:read']
      });

      // Try to manipulate request to gain admin privileges
      await request(app)
        .post('/api/deployments')
        .set('Authorization', `Bearer ${userToken}`)
        .set('X-Role-Override', 'admin') // Attempt privilege escalation
        .send({
          site_name: 'docs',
          environment: 'production',
          commit_sha: 'a1b2c3d4e5f6789012345678901234567890abcd',
          branch: 'main'
        })
        .expect(403); // Should still be forbidden

      // Try to manipulate JWT claims (this should fail at verification)
      const manipulatedToken = jwt.sign({
        sub: 'user-123',
        role: 'admin', // Changed from viewer to admin
        permissions: ['deployments:create', 'deployments:read'],
        iat: Math.floor(Date.now() / 1000)
      }, 'wrong-secret'); // Wrong secret will cause signature verification to fail

      await request(app)
        .post('/api/deployments')
        .set('Authorization', `Bearer ${manipulatedToken}`)
        .send({
          site_name: 'docs',
          environment: 'staging',
          commit_sha: 'a1b2c3d4e5f6789012345678901234567890abcd',
          branch: 'main'
        })
        .expect(401); // Should fail authentication
    });
  });

  describe('Permission-Based Access Control', () => {
    it('should enforce granular permissions', async () => {
      const limitedToken = generateTestJWT({
        sub: 'limited-123',
        role: 'custom',
        permissions: ['deployments:read', 'health:read'] // Limited permissions
      });

      // Can access permitted endpoints
      await request(app)
        .get('/api/deployments')
        .set('Authorization', `Bearer ${limitedToken}`)
        .expect(200);

      await request(app)
        .get('/api/health')
        .set('Authorization', `Bearer ${limitedToken}`)
        .expect(200);

      // Cannot access non-permitted endpoints
      await request(app)
        .post('/api/deployments')
        .set('Authorization', `Bearer ${limitedToken}`)
        .send({
          site_name: 'docs',
          environment: 'staging',
          commit_sha: 'a1b2c3d4e5f6789012345678901234567890abcd',
          branch: 'main'
        })
        .expect(403);

      await request(app)
        .get('/api/environments')
        .set('Authorization', `Bearer ${limitedToken}`)
        .expect(403);
    });

    it('should handle missing permissions gracefully', async () => {
      const noPermissionsToken = generateTestJWT({
        sub: 'noperm-123',
        role: 'none',
        permissions: [] // No permissions
      });

      await request(app)
        .get('/api/deployments')
        .set('Authorization', `Bearer ${noPermissionsToken}`)
        .expect(403)
        .expect(res => {
          expect(res.body.message).toContain('insufficient permissions');
          expect(res.body.required_permission).toBe('deployments:read');
        });
    });

    it('should validate permission format', async () => {
      const invalidPermissionsToken = generateTestJWT({
        sub: 'invalid-123',
        role: 'test',
        permissions: ['invalid-permission-format', 123, null] // Invalid permission formats
      });

      await request(app)
        .get('/api/deployments')
        .set('Authorization', `Bearer ${invalidPermissionsToken}`)
        .expect(401)
        .expect(res => {
          expect(res.body.message).toContain('invalid permission format');
        });
    });
  });

  describe('Environment-Specific Security', () => {
    it('should require additional approval for production deployments', async () => {
      const developerToken = generateTestJWT({
        sub: 'dev-123',
        role: 'developer',
        permissions: ['deployments:create', 'deployments:read']
      });

      // Should allow staging deployments
      await request(app)
        .post('/api/deployments')
        .set('Authorization', `Bearer ${developerToken}`)
        .send({
          site_name: 'docs',
          environment: 'staging',
          commit_sha: 'a1b2c3d4e5f6789012345678901234567890abcd',
          branch: 'main'
        })
        .expect(201);

      // Should require approval for production deployments
      await request(app)
        .post('/api/deployments')
        .set('Authorization', `Bearer ${developerToken}`)
        .send({
          site_name: 'docs',
          environment: 'production',
          commit_sha: 'a1b2c3d4e5f6789012345678901234567890abcd',
          branch: 'main'
        })
        .expect(403)
        .expect(res => {
          expect(res.body.message).toContain('production deployment requires approval');
        });
    });

    it('should enforce rollback permissions per environment', async () => {
      const stagingToken = generateTestJWT({
        sub: 'staging-123',
        role: 'developer',
        permissions: ['deployments:rollback:staging']
      });

      // Mock deployment exists
      jest.spyOn(authService, 'getDeployment').mockResolvedValue({
        id: 'deploy-123',
        environment: 'staging'
      });

      // Can rollback staging
      await request(app)
        .post('/api/deployments/deploy-123/rollback')
        .set('Authorization', `Bearer ${stagingToken}`)
        .send({ rollback_target: 'previous' })
        .expect(201);

      // Cannot rollback production
      jest.spyOn(authService, 'getDeployment').mockResolvedValue({
        id: 'deploy-456',
        environment: 'production'
      });

      await request(app)
        .post('/api/deployments/deploy-456/rollback')
        .set('Authorization', `Bearer ${stagingToken}`)
        .send({ rollback_target: 'previous' })
        .expect(403);
    });
  });

  describe('Rate Limiting & Abuse Prevention', () => {
    it('should implement rate limiting for deployment creation', async () => {
      const userToken = generateTestJWT({
        sub: 'rate-test-123',
        role: 'developer',
        permissions: ['deployments:create', 'deployments:read']
      });

      const deploymentPayload = {
        site_name: 'docs',
        environment: 'staging',
        commit_sha: 'a1b2c3d4e5f6789012345678901234567890abcd',
        branch: 'rate-limit-test'
      };

      // First few requests should succeed
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/deployments')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ ...deploymentPayload, branch: `test-${i}` })
          .expect(201);
      }

      // Subsequent requests should be rate limited
      await request(app)
        .post('/api/deployments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ ...deploymentPayload, branch: 'rate-limited' })
        .expect(429)
        .expect(res => {
          expect(res.body.message).toContain('rate limit exceeded');
          expect(res.headers['retry-after']).toBeDefined();
        });
    }, 30000);

    it('should detect and prevent brute force attacks', async () => {
      const invalidTokens = [
        'invalid1', 'invalid2', 'invalid3', 'invalid4', 'invalid5',
        'invalid6', 'invalid7', 'invalid8', 'invalid9', 'invalid10'
      ];

      // Multiple failed authentication attempts
      for (const token of invalidTokens) {
        await request(app)
          .get('/api/deployments')
          .set('Authorization', `Bearer ${token}`)
          .expect(401);
      }

      // Should start blocking requests from this IP/user
      await request(app)
        .get('/api/deployments')
        .set('Authorization', 'Bearer another-invalid-token')
        .expect(429)
        .expect(res => {
          expect(res.body.message).toContain('too many failed attempts');
        });
    }, 20000);
  });

  describe('Input Validation Security', () => {
    it('should prevent SQL injection attempts in filters', async () => {
      const userToken = generateTestJWT({
        sub: 'user-123',
        role: 'developer',
        permissions: ['deployments:read']
      });

      const sqlInjectionAttempts = [
        "'; DROP TABLE deployments; --",
        "' OR '1'='1",
        "'; UPDATE deployments SET status='hacked' WHERE 1=1; --",
        "' UNION SELECT * FROM users --"
      ];

      for (const injection of sqlInjectionAttempts) {
        await request(app)
          .get('/api/deployments')
          .query({ site_name: injection })
          .set('Authorization', `Bearer ${userToken}`)
          .expect(400)
          .expect(res => {
            expect(res.body.message).toContain('invalid input');
          });
      }
    });

    it('should prevent XSS attempts in deployment payloads', async () => {
      const userToken = generateTestJWT({
        sub: 'user-123',
        role: 'developer',
        permissions: ['deployments:create']
      });

      const xssPayloads = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(\'xss\')" />',
        '"><script>alert("xss")</script>'
      ];

      for (const xssPayload of xssPayloads) {
        await request(app)
          .post('/api/deployments')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            site_name: 'docs',
            environment: 'staging',
            commit_sha: 'a1b2c3d4e5f6789012345678901234567890abcd',
            branch: 'main',
            changelog: xssPayload
          })
          .expect(400)
          .expect(res => {
            expect(res.body.message).toContain('invalid characters detected');
          });
      }
    });

    it('should enforce request size limits', async () => {
      const userToken = generateTestJWT({
        sub: 'user-123',
        role: 'developer',
        permissions: ['deployments:create']
      });

      // Extremely large changelog to test payload size limits
      const largeChangelog = 'x'.repeat(1024 * 1024); // 1MB changelog

      await request(app)
        .post('/api/deployments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          site_name: 'docs',
          environment: 'staging',
          commit_sha: 'a1b2c3d4e5f6789012345678901234567890abcd',
          branch: 'main',
          changelog: largeChangelog
        })
        .expect(413)
        .expect(res => {
          expect(res.body.message).toContain('payload too large');
        });
    });
  });

  describe('API Security Headers', () => {
    it('should include security headers in responses', async () => {
      const userToken = generateTestJWT({
        sub: 'user-123',
        role: 'developer',
        permissions: ['deployments:read']
      });

      const response = await request(app)
        .get('/api/deployments')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Check security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['strict-transport-security']).toContain('max-age=');
      expect(response.headers['content-security-policy']).toBeDefined();
    });

    it('should not expose sensitive information in error responses', async () => {
      // Force internal error
      jest.spyOn(authService, 'listDeployments').mockRejectedValue(
        new Error('Database connection failed: postgresql://user:password@localhost:5432/db')
      );

      const userToken = generateTestJWT({
        sub: 'user-123',
        role: 'developer',
        permissions: ['deployments:read']
      });

      await request(app)
        .get('/api/deployments')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(500)
        .expect(res => {
          // Should not expose database connection string
          expect(res.body.message).not.toContain('password');
          expect(res.body.message).not.toContain('postgresql://');
          expect(res.body.message).toBe('Internal server error');
        });
    });
  });
});
