/**
 * Comprehensive JWKS Endpoint Tests
 * Unit tests for JWKS route handlers, validation, caching, and error handling
 */

import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { GET, HEAD, OPTIONS } from '@/app/api/.well-known/jwks.json/route';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
  ResourceNotFoundException,
  DecryptionFailureException,
  InternalServiceErrorException,
  ThrottlingException,
  InvalidParameterException,
  InvalidRequestException
} from '@aws-sdk/client-secrets-manager';

// Mock AWS SDK
jest.mock('@aws-sdk/client-secrets-manager');

// Test data factories
const createMockJWKSKey = (kid = 'test-key-1') => ({
  kty: 'RSA',
  use: 'sig',
  kid,
  alg: 'RS256',
  n: 'nzulYyqi_oq_1p5nv2vOtnU-q-gAZpxpDzG2n9yPITtK-GzlySM28IC07mlGV8gk8c99jyUe4Te2YE8csOBhJRsgph1I8y4N2T41GEd1xSTcD9AwidzyZASNrSSfqWxtRtOG5GFbQiEutSM9ac3tziO8uRx0vwFlDj9S3E9JV_Oe35BXCiD68CCwS5e3SzrkdMaqd1XWm0GM3_Vfo-6QZTS8mJjdz-rnIFt2ojw3v74xeBqwmiK5jkisbF1Fem4nIX-n3UqpPDeHV-nvDuPLiX6ENA4n5VbLFPPX291WCFxs7GG7aM4ipCXyHw3LXBGdAmAhmWpwCVhUfpRYDI1MVQ',
  e: 'AQAB'
});

const createMockSecretsResponse = (keys: any) => ({
  SecretString: JSON.stringify(keys)
});

const createMockRequest = (url = 'https://test.com/.well-known/jwks.json', headers = {}) => {
  return new NextRequest(url, { headers });
};

describe('JWKS Endpoint Comprehensive Tests', () => {
  let mockSecretsClient: jest.Mocked<SecretsManagerClient>;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    // Mock console to avoid test output noise
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();

    // Reset all mocks
    jest.clearAllMocks();

    // Create mock client
    mockSecretsClient = {
      send: jest.fn(),
      destroy: jest.fn()
    } as any;

    (SecretsManagerClient as jest.Mock).mockImplementation(() => mockSecretsClient);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('GET - Success Scenarios', () => {
    it('should return valid JWKS with single key', async () => {
      const mockKey = createMockJWKSKey();
      const mockKeys = { [mockKey.kid]: mockKey };

      mockSecretsClient.send.mockResolvedValueOnce(
        createMockSecretsResponse(mockKeys)
      );

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.keys).toHaveLength(1);
      expect(data.keys[0]).toMatchObject({
        kty: 'RSA',
        use: 'sig',
        alg: 'RS256',
        kid: mockKey.kid,
        n: mockKey.n,
        e: 'AQAB'
      });

      // Verify security headers
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('X-JWKS-Source')).toBe('aws');
    });

    it('should return valid JWKS with multiple keys', async () => {
      const mockKeys = {
        'key-1': createMockJWKSKey('key-1'),
        'key-2': createMockJWKSKey('key-2'),
        'key-3': createMockJWKSKey('key-3')
      };

      mockSecretsClient.send.mockResolvedValueOnce(
        createMockSecretsResponse(mockKeys)
      );

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.keys).toHaveLength(3);

      const kids = data.keys.map((key: any) => key.kid);
      expect(kids).toContain('key-1');
      expect(kids).toContain('key-2');
      expect(kids).toContain('key-3');
    });

    it('should handle JWKS format input', async () => {
      const jwksFormat = {
        keys: [
          createMockJWKSKey('jwks-key-1'),
          createMockJWKSKey('jwks-key-2')
        ]
      };

      mockSecretsClient.send.mockResolvedValueOnce({
        SecretString: JSON.stringify(jwksFormat)
      });

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.keys).toHaveLength(2);
    });

    it('should generate proper ETag for caching', async () => {
      const mockKeys = { 'key-1': createMockJWKSKey() };

      mockSecretsClient.send.mockResolvedValueOnce(
        createMockSecretsResponse(mockKeys)
      );

      const request = createMockRequest();
      const response = await GET(request);

      const etag = response.headers.get('ETag');
      expect(etag).toBeTruthy();
      expect(etag).toMatch(/^"[a-f0-9]{16}"$/);
    });

    it('should return 304 for matching If-None-Match header', async () => {
      const mockKeys = { 'key-1': createMockJWKSKey() };

      mockSecretsClient.send.mockResolvedValueOnce(
        createMockSecretsResponse(mockKeys)
      );

      // First request to get ETag
      const request1 = createMockRequest();
      const response1 = await GET(request1);
      const etag = response1.headers.get('ETag');

      // Second request with If-None-Match
      const request2 = createMockRequest('https://test.com/.well-known/jwks.json', {
        'if-none-match': etag!
      });
      const response2 = await GET(request2);

      expect(response2.status).toBe(304);
      expect(response2.headers.get('ETag')).toBe(etag);
    });
  });

  describe('GET - Error Handling', () => {
    it('should handle ResourceNotFoundException', async () => {
      mockSecretsClient.send.mockRejectedValueOnce(
        new ResourceNotFoundException({ message: 'Secret not found', $metadata: {} })
      );

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200); // Always returns 200 with fallback
      expect(data.keys).toHaveLength(1); // Fallback keys
      expect(response.headers.get('X-JWKS-Source')).toBe('fallback-error');
    });

    it('should handle DecryptionFailureException', async () => {
      mockSecretsClient.send.mockRejectedValueOnce(
        new DecryptionFailureException({ message: 'KMS decryption failed', $metadata: {} })
      );

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.keys).toHaveLength(1); // Fallback keys
      expect(response.headers.get('X-Error')).toContain('KMS decryption failed');
    });

    it('should handle InternalServiceErrorException', async () => {
      mockSecretsClient.send.mockRejectedValueOnce(
        new InternalServiceErrorException({ message: 'AWS service error', $metadata: {} })
      );

      const request = createMockRequest();
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('X-JWKS-Source')).toBe('fallback-error');
    });

    it('should handle ThrottlingException', async () => {
      mockSecretsClient.send.mockRejectedValueOnce(
        new ThrottlingException({ message: 'Too many requests', $metadata: {} })
      );

      const request = createMockRequest();
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toContain('max-age=60');
    });

    it('should handle JSON parsing errors', async () => {
      mockSecretsClient.send.mockResolvedValueOnce({
        SecretString: 'invalid-json{'
      });

      const request = createMockRequest();
      const response = await GET(request);

      expect(response.status).toBe(200); // Fallback response
      expect(response.headers.get('X-JWKS-Source')).toBe('fallback-error');
    });

    it('should handle empty secret string', async () => {
      mockSecretsClient.send.mockResolvedValueOnce({
        SecretString: ''
      });

      const request = createMockRequest();
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('X-JWKS-Source')).toBe('fallback-error');
    });

    it('should handle missing SecretString', async () => {
      mockSecretsClient.send.mockResolvedValueOnce({});

      const request = createMockRequest();
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('X-JWKS-Source')).toBe('fallback-error');
    });

    it('should handle SecretBinary (unsupported)', async () => {
      mockSecretsClient.send.mockResolvedValueOnce({
        SecretBinary: new Uint8Array([1, 2, 3])
      });

      const request = createMockRequest();
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('X-JWKS-Source')).toBe('fallback-error');
    });
  });

  describe('GET - Input Validation', () => {
    it('should reject keys missing required fields', async () => {
      const invalidKeys = {
        'key-1': {
          kty: 'RSA',
          use: 'sig',
          // Missing kid, n, e
        }
      };

      mockSecretsClient.send.mockResolvedValueOnce(
        createMockSecretsResponse(invalidKeys)
      );

      const request = createMockRequest();
      const response = await GET(request);

      expect(response.status).toBe(200); // Falls back to hardcoded keys
      expect(response.headers.get('X-JWKS-Source')).toBe('fallback-error');
    });

    it('should handle empty keys object', async () => {
      mockSecretsClient.send.mockResolvedValueOnce(
        createMockSecretsResponse({})
      );

      const request = createMockRequest();
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('X-JWKS-Source')).toBe('fallback-error');
    });

    it('should validate JWKS format with empty keys array', async () => {
      const jwksFormat = { keys: [] };

      mockSecretsClient.send.mockResolvedValueOnce({
        SecretString: JSON.stringify(jwksFormat)
      });

      const request = createMockRequest();
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('X-JWKS-Source')).toBe('fallback-error');
    });
  });

  describe('GET - Caching Behavior', () => {
    it('should cache successful AWS responses', async () => {
      const mockKeys = { 'key-1': createMockJWKSKey() };

      mockSecretsClient.send.mockResolvedValueOnce(
        createMockSecretsResponse(mockKeys)
      );

      const request1 = createMockRequest();
      const request2 = createMockRequest();

      // First call
      const response1 = await GET(request1);
      expect(mockSecretsClient.send).toHaveBeenCalledTimes(1);
      expect(response1.headers.get('X-JWKS-Source')).toBe('aws');

      // Second call should use cache
      const response2 = await GET(request2);
      expect(mockSecretsClient.send).toHaveBeenCalledTimes(1); // No additional call
      expect(response2.headers.get('X-JWKS-Source')).toBe('cache');
    });

    it('should set appropriate cache headers for AWS source', async () => {
      const mockKeys = { 'key-1': createMockJWKSKey() };

      mockSecretsClient.send.mockResolvedValueOnce(
        createMockSecretsResponse(mockKeys)
      );

      const request = createMockRequest();
      const response = await GET(request);

      const cacheControl = response.headers.get('Cache-Control');
      expect(cacheControl).toContain('public');
      expect(cacheControl).toContain('max-age=600');
      expect(cacheControl).toContain('stale-while-revalidate=300');
    });

    it('should set shorter cache TTL for fallback responses', async () => {
      mockSecretsClient.send.mockRejectedValueOnce(new Error('AWS error'));

      const request = createMockRequest();
      const response = await GET(request);

      const cacheControl = response.headers.get('Cache-Control');
      expect(cacheControl).toContain('max-age=60');
    });
  });

  describe('GET - Request Tracing', () => {
    it('should generate unique request IDs', async () => {
      const mockKeys = { 'key-1': createMockJWKSKey() };

      mockSecretsClient.send.mockResolvedValue(
        createMockSecretsResponse(mockKeys)
      );

      const request1 = createMockRequest();
      const request2 = createMockRequest();

      const response1 = await GET(request1);
      const response2 = await GET(request2);

      const requestId1 = response1.headers.get('X-Request-Id');
      const requestId2 = response2.headers.get('X-Request-Id');

      expect(requestId1).toBeTruthy();
      expect(requestId2).toBeTruthy();
      expect(requestId1).not.toBe(requestId2);
    });

    it('should include response time in headers', async () => {
      const mockKeys = { 'key-1': createMockJWKSKey() };

      mockSecretsClient.send.mockResolvedValueOnce(
        createMockSecretsResponse(mockKeys)
      );

      const request = createMockRequest();
      const response = await GET(request);

      const responseTime = response.headers.get('X-Response-Time');
      expect(responseTime).toMatch(/^\d+ms$/);
    });

    it('should include cache hit rate in headers', async () => {
      const mockKeys = { 'key-1': createMockJWKSKey() };

      mockSecretsClient.send.mockResolvedValue(
        createMockSecretsResponse(mockKeys)
      );

      const request = createMockRequest();

      // Make multiple requests to generate cache hits
      await GET(request);
      await GET(request);
      const response = await GET(request);

      const hitRate = response.headers.get('X-Cache-Hit-Rate');
      expect(hitRate).toMatch(/^\d+%$/);
    });
  });

  describe('HEAD - Health Checks', () => {
    it('should return 200 for HEAD requests', async () => {
      const request = new NextRequest('https://test.com/.well-known/jwks.json', {
        method: 'HEAD'
      });

      const response = await HEAD(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Cache-Control')).toBe('no-cache');
    });

    it('should indicate cache status in HEAD response', async () => {
      const request = new NextRequest('https://test.com/.well-known/jwks.json', {
        method: 'HEAD'
      });

      const response = await HEAD(request);

      const cacheStatus = response.headers.get('X-Cache-Status');
      expect(['valid', 'expired']).toContain(cacheStatus);
    });

    it('should handle HEAD request errors gracefully', async () => {
      // Force an error in HEAD handler by mocking an exception
      jest.spyOn(global, 'Date').mockImplementationOnce(() => {
        throw new Error('Forced error');
      });

      const request = new NextRequest('https://test.com/.well-known/jwks.json', {
        method: 'HEAD'
      });

      const response = await HEAD(request);

      expect(response.status).toBe(503);

      jest.restoreAllMocks();
    });
  });

  describe('OPTIONS - CORS Handling', () => {
    it('should handle CORS preflight requests', async () => {
      const request = new NextRequest('https://test.com/.well-known/jwks.json', {
        method: 'OPTIONS'
      });

      const response = await OPTIONS(request);

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, HEAD, OPTIONS');
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Authorization, If-None-Match');
      expect(response.headers.get('Access-Control-Max-Age')).toBe('86400');
    });

    it('should set appropriate cache headers for OPTIONS', async () => {
      const request = new NextRequest('https://test.com/.well-known/jwks.json', {
        method: 'OPTIONS'
      });

      const response = await OPTIONS(request);

      expect(response.headers.get('Cache-Control')).toBe('public, max-age=86400');
    });
  });

  describe('Security Features', () => {
    it('should include security headers in all responses', async () => {
      const mockKeys = { 'key-1': createMockJWKSKey() };

      mockSecretsClient.send.mockResolvedValueOnce(
        createMockSecretsResponse(mockKeys)
      );

      const request = createMockRequest();
      const response = await GET(request);

      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    it('should truncate error messages in headers for security', async () => {
      const longErrorMessage = 'A'.repeat(200);
      mockSecretsClient.send.mockRejectedValueOnce(new Error(longErrorMessage));

      const request = createMockRequest();
      const response = await GET(request);

      const errorHeader = response.headers.get('X-Error');
      expect(errorHeader!.length).toBeLessThanOrEqual(100);
    });

    it('should handle client info extraction safely', async () => {
      const mockKeys = { 'key-1': createMockJWKSKey() };

      mockSecretsClient.send.mockResolvedValueOnce(
        createMockSecretsResponse(mockKeys)
      );

      const request = createMockRequest('https://test.com/.well-known/jwks.json', {
        'user-agent': 'Test Agent with special chars <script>alert(1)</script>',
        'x-forwarded-for': '192.168.1.1, 10.0.0.1',
        'x-real-ip': '203.0.113.1'
      });

      const response = await GET(request);

      expect(response.status).toBe(200);
      // Should not throw errors with malicious headers
    });
  });

  describe('Performance Characteristics', () => {
    it('should handle concurrent requests efficiently', async () => {
      const mockKeys = { 'key-1': createMockJWKSKey() };

      mockSecretsClient.send.mockResolvedValue(
        createMockSecretsResponse(mockKeys)
      );

      const requests = Array.from({ length: 10 }, () =>
        GET(createMockRequest())
      );

      const responses = await Promise.all(requests);

      expect(responses).toHaveLength(10);
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should only make one AWS call due to caching
      expect(mockSecretsClient.send).toHaveBeenCalledTimes(1);
    });

    it('should complete requests within reasonable time', async () => {
      const mockKeys = { 'key-1': createMockJWKSKey() };

      mockSecretsClient.send.mockResolvedValueOnce(
        createMockSecretsResponse(mockKeys)
      );

      const start = Date.now();
      const request = createMockRequest();
      const response = await GET(request);
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Fallback Key Validation', () => {
    it('should always have valid fallback keys available', async () => {
      mockSecretsClient.send.mockRejectedValueOnce(new Error('Total AWS failure'));

      const request = createMockRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.keys).toHaveLength(1);
      expect(data.keys[0]).toHaveProperty('kid');
      expect(data.keys[0]).toHaveProperty('n');
      expect(data.keys[0]).toHaveProperty('e');
      expect(data.keys[0].kty).toBe('RSA');
      expect(data.keys[0].use).toBe('sig');
      expect(data.keys[0].alg).toBe('RS256');
    });
  });
});
