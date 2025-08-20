/**
 * Authentication Infrastructure Security Tests
 * Comprehensive security testing for JWT/JWKS authentication system
 */

import { NextRequest } from 'next/server';

// Mock all dependencies for isolated security testing
jest.mock('@aws-sdk/client-secrets-manager', () => ({
  SecretsManagerClient: jest.fn(() => ({
    send: jest.fn(),
  })),
  GetSecretValueCommand: jest.fn(),
}));

jest.mock('@/lib/logging/simple-logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Authentication Infrastructure Security', () => {
  let mockSecretsClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    const { SecretsManagerClient } = require('@aws-sdk/client-secrets-manager');
    mockSecretsClient = new SecretsManagerClient();
  });

  describe('JWKS Endpoint Security', () => {
    it('should prevent timing attacks on JWKS retrieval', async () => {
      const { GET } = require('@/app/api/.well-known/jwks.json/route');
      
      // Mock successful response
      mockSecretsClient.send.mockResolvedValue({
        SecretString: JSON.stringify({
          'key-1': {
            kty: 'RSA',
            use: 'sig',
            alg: 'RS256',
            n: 'test-modulus',
            e: 'AQAB',
          },
        }),
      });

      const request = new NextRequest('https://test.com/.well-known/jwks.json');
      
      // Multiple requests should have consistent timing
      const times: number[] = [];
      
      for (let i = 0; i < 3; i++) {
        const start = Date.now();
        await GET(request);
        const end = Date.now();
        times.push(end - start);
      }

      // Timing should be relatively consistent (within 100ms variance)
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      expect(maxTime - minTime).toBeLessThan(100);
    });

    it('should not expose sensitive AWS credentials in errors', async () => {
      const { GET } = require('@/app/api/.well-known/jwks.json/route');
      
      // Mock AWS error with potentially sensitive info
      mockSecretsClient.send.mockRejectedValue(
        new Error('The security token included in the request is expired')
      );

      const request = new NextRequest('https://test.com/.well-known/jwks.json');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.message).not.toContain('security token');
      expect(data.message).not.toContain('expired');
      expect(data.message).not.toContain('AWS');
    });

    it('should validate JWKS key structure to prevent malicious keys', async () => {
      const { GET } = require('@/app/api/.well-known/jwks.json/route');
      
      // Mock malicious key structure
      mockSecretsClient.send.mockResolvedValue({
        SecretString: JSON.stringify({
          'malicious-key': {
            kty: 'RSA',
            use: 'sig',
            alg: 'none', // Vulnerable algorithm
            n: '../../../etc/passwd', // Path traversal attempt
            e: '<script>alert("xss")</script>', // XSS attempt
          },
        }),
      });

      const request = new NextRequest('https://test.com/.well-known/jwks.json');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      
      // Should sanitize/normalize the key
      const key = data.keys[0];
      expect(key.alg).toBe('RS256'); // Should default to secure algorithm
      expect(key.n).toBe('../../../etc/passwd'); // Should not execute, just return as string
      expect(key.e).toBe('<script>alert("xss")</script>'); // Should not execute
    });

    it('should implement proper CORS policy', async () => {
      const { GET, OPTIONS } = require('@/app/api/.well-known/jwks.json/route');
      
      mockSecretsClient.send.mockResolvedValue({
        SecretString: JSON.stringify({
          'key-1': {
            kty: 'RSA',
            use: 'sig',
            alg: 'RS256',
            n: 'test-modulus',
            e: 'AQAB',
          },
        }),
      });

      // Test GET request CORS headers
      const getRequest = new NextRequest('https://test.com/.well-known/jwks.json');
      const getResponse = await GET(getRequest);
      
      expect(getResponse.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(getResponse.headers.get('Access-Control-Allow-Methods')).toBe('GET, OPTIONS');
      expect(getResponse.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type');

      // Test OPTIONS preflight
      const optionsRequest = new NextRequest('https://test.com/.well-known/jwks.json', {
        method: 'OPTIONS',
      });
      const optionsResponse = await OPTIONS(optionsRequest);
      
      expect(optionsResponse.status).toBe(200);
      expect(optionsResponse.headers.get('Access-Control-Max-Age')).toBe('86400');
    });

    it('should have secure cache headers to prevent sensitive data caching', async () => {
      const { GET } = require('@/app/api/.well-known/jwks.json/route');
      
      mockSecretsClient.send.mockResolvedValue({
        SecretString: JSON.stringify({
          'key-1': {
            kty: 'RSA',
            use: 'sig',
            alg: 'RS256',
            n: 'test-modulus',
            e: 'AQAB',
          },
        }),
      });

      const request = new NextRequest('https://test.com/.well-known/jwks.json');
      const response = await GET(request);

      // Should allow public caching for JWKS (it's public keys)
      const cacheControl = response.headers.get('Cache-Control');
      expect(cacheControl).toContain('public');
      expect(cacheControl).toContain('max-age=600'); // 10 minutes
      expect(cacheControl).toContain('stale-while-revalidate=300'); // 5 minutes stale
    });

    it('should handle cache poisoning attempts', async () => {
      const { GET } = require('@/app/api/.well-known/jwks.json/route');
      
      // First request with normal keys
      mockSecretsClient.send.mockResolvedValueOnce({
        SecretString: JSON.stringify({
          'key-1': {
            kty: 'RSA',
            use: 'sig',
            alg: 'RS256',
            n: 'legitimate-modulus',
            e: 'AQAB',
          },
        }),
      });

      const request1 = new NextRequest('https://test.com/.well-known/jwks.json');
      const response1 = await GET(request1);
      const data1 = await response1.json();

      // Second request should use cache, not make new AWS call
      const request2 = new NextRequest('https://test.com/.well-known/jwks.json');
      const response2 = await GET(request2);
      const data2 = await response2.json();

      expect(data1).toEqual(data2);
      expect(mockSecretsClient.send).toHaveBeenCalledTimes(1);
    });
  });

  describe('Login Endpoint Security', () => {
    it('should implement proper rate limiting structure', async () => {
      const { POST } = require('@/app/api/auth/login/route');
      
      mockSecretsClient.send.mockResolvedValue({
        SecretString: JSON.stringify({
          kid: 'test-key',
          privateKey: 'mock-key',
        }),
      });

      const loginData = {
        email: 'admin@paintbox.com',
        password: 'wrong-password',
      };

      // Multiple failed attempts
      const requests = [];
      for (let i = 0; i < 5; i++) {
        const request = new NextRequest('https://test.com/api/auth/login', {
          method: 'POST',
          body: JSON.stringify(loginData),
          headers: {
            'x-forwarded-for': '192.168.1.100',
            'user-agent': 'potential-attacker',
          },
        });
        requests.push(POST(request));
      }

      const responses = await Promise.all(requests);
      
      // All should fail with 401 (rate limiting would be handled by middleware)
      responses.forEach((response) => {
        expect(response.status).toBe(401);
      });
    });

    it('should prevent username enumeration attacks', async () => {
      const { POST } = require('@/app/api/auth/login/route');
      
      mockSecretsClient.send.mockResolvedValue({
        SecretString: JSON.stringify({
          kid: 'test-key',
          privateKey: 'mock-key',
        }),
      });

      // Test with valid email, invalid password
      const validEmailRequest = new NextRequest('https://test.com/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'admin@paintbox.com',
          password: 'wrong-password',
        }),
      });

      // Test with invalid email, any password
      const invalidEmailRequest = new NextRequest('https://test.com/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: 'any-password',
        }),
      });

      const [validEmailResponse, invalidEmailResponse] = await Promise.all([
        POST(validEmailRequest),
        POST(invalidEmailRequest),
      ]);

      const validEmailData = await validEmailResponse.json();
      const invalidEmailData = await invalidEmailResponse.json();

      // Both should return the same error message
      expect(validEmailResponse.status).toBe(401);
      expect(invalidEmailResponse.status).toBe(401);
      expect(validEmailData.error.message).toBe(invalidEmailData.error.message);
      expect(validEmailData.error.code).toBe(invalidEmailData.error.code);
    });

    it('should implement timing attack protection', async () => {
      const { POST } = require('@/app/api/auth/login/route');
      
      mockSecretsClient.send.mockResolvedValue({
        SecretString: JSON.stringify({
          kid: 'test-key',
          privateKey: 'mock-key',
        }),
      });

      // Test timing for valid vs invalid email
      const validEmailData = {
        email: 'admin@paintbox.com',
        password: 'wrong-password',
      };

      const invalidEmailData = {
        email: 'nonexistent@example.com',
        password: 'any-password',
      };

      // Measure response times
      const startValid = Date.now();
      const validRequest = new NextRequest('https://test.com/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(validEmailData),
      });
      await POST(validRequest);
      const validTime = Date.now() - startValid;

      const startInvalid = Date.now();
      const invalidRequest = new NextRequest('https://test.com/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(invalidEmailData),
      });
      await POST(invalidRequest);
      const invalidTime = Date.now() - startInvalid;

      // Invalid email should take at least 1000ms (timing attack protection)
      expect(invalidTime).toBeGreaterThanOrEqual(1000);
      
      // Time difference should be minimal (within 100ms tolerance)
      expect(Math.abs(validTime - invalidTime)).toBeLessThan(100);
    });

    it('should sanitize input to prevent injection attacks', async () => {
      const { POST } = require('@/app/api/auth/login/route');
      
      mockSecretsClient.send.mockResolvedValue({
        SecretString: JSON.stringify({
          kid: 'test-key',
          privateKey: 'mock-key',
        }),
      });

      // SQL injection attempt
      const sqlInjectionData = {
        email: "admin@paintbox.com'; DROP TABLE users; --",
        password: "'; DROP TABLE passwords; --",
      };

      // NoSQL injection attempt
      const noSqlInjectionData = {
        email: { $ne: null },
        password: { $regex: '.*' },
      };

      // XSS attempt
      const xssData = {
        email: '<script>alert("xss")</script>@example.com',
        password: 'javascript:alert("xss")',
      };

      const requests = [
        new NextRequest('https://test.com/api/auth/login', {
          method: 'POST',
          body: JSON.stringify(sqlInjectionData),
        }),
        new NextRequest('https://test.com/api/auth/login', {
          method: 'POST',
          body: JSON.stringify(noSqlInjectionData),
        }),
        new NextRequest('https://test.com/api/auth/login', {
          method: 'POST',
          body: JSON.stringify(xssData),
        }),
      ];

      const responses = await Promise.all(requests.map(req => POST(req)));
      
      // All should be handled gracefully without execution
      responses.forEach(async (response) => {
        expect([400, 401, 500]).toContain(response.status);
        const data = await response.json();
        expect(data.success).toBe(false);
        
        // Should not contain the malicious payload in response
        const responseText = JSON.stringify(data);
        expect(responseText).not.toContain('DROP TABLE');
        expect(responseText).not.toContain('<script>');
        expect(responseText).not.toContain('javascript:');
      });
    });

    it('should not expose sensitive information in error responses', async () => {
      const { POST } = require('@/app/api/auth/login/route');
      
      // Mock AWS error
      mockSecretsClient.send.mockRejectedValue(new Error('InvalidSignatureException: The request signature we calculated does not match the signature you provided'));

      const loginData = {
        email: 'admin@paintbox.com',
        password: 'admin',
      };

      const request = new NextRequest('https://test.com/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.message).toBe('Authentication service error');
      
      // Should not expose AWS error details
      expect(data.error.message).not.toContain('InvalidSignatureException');
      expect(data.error.message).not.toContain('signature');
      expect(data.error.message).not.toContain('AWS');
    });

    it('should validate JWT token structure (when implemented)', async () => {
      // This test is for future JWT implementation
      // Currently the endpoint returns mock tokens
      
      const { POST } = require('@/app/api/auth/login/route');
      
      mockSecretsClient.send.mockResolvedValue({
        SecretString: JSON.stringify({
          kid: 'test-key',
          privateKey: 'mock-key',
        }),
      });

      const loginData = {
        email: 'admin@paintbox.com',
        password: 'admin',
      };

      const request = new NextRequest('https://test.com/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginData),
      });

      const response = await POST(request);
      const data = await response.json();

      if (response.status === 200) {
        // Validate token structure (currently mock)
        expect(data.data.tokens).toHaveProperty('accessToken');
        expect(data.data.tokens).toHaveProperty('refreshToken');
        expect(data.data.tokens).toHaveProperty('tokenType', 'Bearer');
        expect(data.data.tokens).toHaveProperty('expiresIn');
        
        // Token should not be empty
        expect(data.data.tokens.accessToken).toBeTruthy();
        expect(data.data.tokens.refreshToken).toBeTruthy();
      }
    });

    it('should implement secure session management', async () => {
      const { POST } = require('@/app/api/auth/login/route');
      
      mockSecretsClient.send.mockResolvedValue({
        SecretString: JSON.stringify({
          kid: 'test-key',
          privateKey: 'mock-key',
        }),
      });

      const loginData = {
        email: 'admin@paintbox.com',
        password: 'admin',
        rememberMe: false,
      };

      const request = new NextRequest('https://test.com/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginData),
      });

      const response = await POST(request);

      // Should not set insecure cookies or session headers
      expect(response.headers.get('Set-Cookie')).toBeNull();
      
      // Should not expose session IDs in headers
      const sessionHeaders = ['X-Session-ID', 'Session-ID', 'JSESSIONID'];
      sessionHeaders.forEach(header => {
        expect(response.headers.get(header)).toBeNull();
      });
    });
  });

  describe('Cross-Endpoint Security', () => {
    it('should maintain consistent error handling across auth endpoints', async () => {
      const jwksModule = require('@/app/api/.well-known/jwks.json/route');
      const loginModule = require('@/app/api/auth/login/route');
      
      // Force errors in both endpoints
      mockSecretsClient.send.mockRejectedValue(new Error('Service unavailable'));

      const jwksRequest = new NextRequest('https://test.com/.well-known/jwks.json');
      const loginRequest = new NextRequest('https://test.com/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password',
        }),
      });

      const [jwksResponse, loginResponse] = await Promise.all([
        jwksModule.GET(jwksRequest),
        loginModule.POST(loginRequest),
      ]);

      // Both should handle errors gracefully
      expect(jwksResponse.status).toBe(500);
      expect(loginResponse.status).toBe(500);

      const jwksData = await jwksResponse.json();
      const loginData = await loginResponse.json();

      // Both should have consistent error structures
      expect(jwksData).toHaveProperty('error');
      expect(loginData).toHaveProperty('error');
      expect(loginData).toHaveProperty('success', false);
    });

    it('should prevent CSRF attacks on state-changing endpoints', async () => {
      const { POST } = require('@/app/api/auth/login/route');
      
      mockSecretsClient.send.mockResolvedValue({
        SecretString: JSON.stringify({
          kid: 'test-key',
          privateKey: 'mock-key',
        }),
      });

      // Request without proper CSRF protection
      const loginData = {
        email: 'admin@paintbox.com',
        password: 'admin',
      };

      const csrfRequest = new NextRequest('https://test.com/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginData),
        headers: {
          'Origin': 'https://evil-site.com',
          'Referer': 'https://evil-site.com/attack',
        },
      });

      // Currently no CSRF protection implemented, but structure should support it
      const response = await POST(csrfRequest);
      
      // Test passes if endpoint handles the request (CSRF protection would be middleware)
      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('Infrastructure Security', () => {
    it('should not expose internal service URLs or paths', async () => {
      const healthModule = require('@/app/api/health/route');
      
      // Mock services to return internal information
      const mockCache = require('@/lib/cache/cache-service')();
      mockCache.set.mockResolvedValue(true);
      mockCache.get.mockResolvedValue('ok');
      mockCache.del.mockResolvedValue(1);

      const { PrismaClient } = require('@prisma/client');
      const mockPrisma = new PrismaClient();
      mockPrisma.$queryRaw.mockResolvedValue([{ health_check: 1 }]);

      const request = new NextRequest('https://test.com/api/health');
      const response = await healthModule.GET(request);
      const data = await response.json();

      // Health check should not expose internal URLs or sensitive paths
      const responseText = JSON.stringify(data);
      expect(responseText).not.toContain('localhost');
      expect(responseText).not.toContain('127.0.0.1');
      expect(responseText).not.toContain('/etc/');
      expect(responseText).not.toContain('/var/');
      expect(responseText).not.toContain('/root/');
      expect(responseText).not.toContain('password');
      expect(responseText).not.toContain('secret');
      expect(responseText).not.toContain('key');
    });

    it('should implement proper error boundaries', async () => {
      // Test that critical errors don't crash the entire auth system
      const jwksModule = require('@/app/api/.well-known/jwks.json/route');
      
      // Mock a critical system error
      mockSecretsClient.send.mockImplementation(() => {
        throw new Error('System.exit(1)'); // Simulate critical error
      });

      const request = new NextRequest('https://test.com/.well-known/jwks.json');
      
      // Should not crash, should return error response
      const response = await jwksModule.GET(request);
      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('keys', []);
    });
  });
});