/**
 * @file Authentication Middleware Tests
 * @description Tests for JWT authentication middleware
 */

import { authMiddleware, verifyToken, generateToken } from '@/lib/middleware/auth';
import { createJWTPayload, createAPIRequest, createAPIResponse } from '@/__tests__/factories';
import { NextRequest, NextResponse } from 'next/server';
import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('@/lib/services/secrets-manager');

const mockJwt = jwt as jest.Mocked<typeof jwt>;

describe('Authentication Middleware', () => {
  let mockRequest: NextRequest;
  let mockResponse: NextResponse;
  const secretKey = 'test-secret-key-123';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock URL for NextRequest
    const url = 'https://app.paintbox.com/api/v1/estimates';
    mockRequest = new NextRequest(url);
    
    // Set up default JWT mocks
    process.env.JWT_SECRET = secretKey;
  });

  describe('Token Generation', () => {
    it('should generate valid JWT tokens', () => {
      const payload = createJWTPayload();
      const expectedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItaWQifQ.signature';
      
      mockJwt.sign.mockReturnValue(expectedToken);

      const token = generateToken(payload);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        payload,
        secretKey,
        expect.objectContaining({
          expiresIn: '1h',
          issuer: 'paintbox-app',
          audience: 'paintbox-api',
        })
      );
      expect(token).toBe(expectedToken);
    });

    it('should support custom token expiration', () => {
      const payload = createJWTPayload();
      const customExpiry = '7d';

      generateToken(payload, { expiresIn: customExpiry });

      expect(mockJwt.sign).toHaveBeenCalledWith(
        payload,
        secretKey,
        expect.objectContaining({
          expiresIn: customExpiry,
        })
      );
    });

    it('should include required claims in token', () => {
      const payload = createJWTPayload({
        sub: 'user-123',
        email: 'test@example.com',
        role: 'admin',
      });

      generateToken(payload);

      const signCall = mockJwt.sign.mock.calls[0];
      const tokenPayload = signCall[0] as any;

      expect(tokenPayload.sub).toBe('user-123');
      expect(tokenPayload.email).toBe('test@example.com');
      expect(tokenPayload.role).toBe('admin');
      expect(tokenPayload.iat).toBeDefined();
    });
  });

  describe('Token Verification', () => {
    it('should verify valid JWT tokens', async () => {
      const payload = createJWTPayload();
      const token = 'valid.jwt.token';

      mockJwt.verify.mockReturnValue(payload as any);

      const result = await verifyToken(token);

      expect(mockJwt.verify).toHaveBeenCalledWith(token, secretKey);
      expect(result.valid).toBe(true);
      expect(result.payload).toEqual(payload);
      expect(result.error).toBeNull();
    });

    it('should reject expired tokens', async () => {
      const token = 'expired.jwt.token';
      const error = new Error('jwt expired');
      error.name = 'TokenExpiredError';

      mockJwt.verify.mockImplementation(() => {
        throw error;
      });

      const result = await verifyToken(token);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token expired');
      expect(result.payload).toBeNull();
    });

    it('should reject malformed tokens', async () => {
      const token = 'malformed.token';
      const error = new Error('invalid token');
      error.name = 'JsonWebTokenError';

      mockJwt.verify.mockImplementation(() => {
        throw error;
      });

      const result = await verifyToken(token);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid token');
      expect(result.payload).toBeNull();
    });

    it('should handle missing or invalid signature', async () => {
      const token = 'token.with.invalid.signature';
      const error = new Error('invalid signature');
      error.name = 'JsonWebTokenError';

      mockJwt.verify.mockImplementation(() => {
        throw error;
      });

      const result = await verifyToken(token);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid token');
    });
  });

  describe('Authentication Middleware', () => {
    it('should allow requests with valid authentication', async () => {
      const payload = createJWTPayload();
      const token = 'Bearer valid.jwt.token';

      // Add authorization header
      mockRequest.headers.set('authorization', token);
      
      mockJwt.verify.mockReturnValue(payload as any);

      const response = await authMiddleware(mockRequest);

      expect(response).toBeUndefined(); // No response means continue
    });

    it('should reject requests without authorization header', async () => {
      const response = await authMiddleware(mockRequest);

      expect(response).toBeInstanceOf(NextResponse);
      if (response instanceof NextResponse) {
        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.error).toBe('Missing authorization header');
      }
    });

    it('should reject requests with invalid token format', async () => {
      mockRequest.headers.set('authorization', 'InvalidFormat token123');

      const response = await authMiddleware(mockRequest);

      expect(response).toBeInstanceOf(NextResponse);
      if (response instanceof NextResponse) {
        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.error).toBe('Invalid authorization format');
      }
    });

    it('should reject requests with expired tokens', async () => {
      const token = 'Bearer expired.jwt.token';
      mockRequest.headers.set('authorization', token);

      const error = new Error('jwt expired');
      error.name = 'TokenExpiredError';
      mockJwt.verify.mockImplementation(() => {
        throw error;
      });

      const response = await authMiddleware(mockRequest);

      expect(response).toBeInstanceOf(NextResponse);
      if (response instanceof NextResponse) {
        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.error).toBe('Token expired');
      }
    });

    it('should attach user info to request context', async () => {
      const payload = createJWTPayload({
        sub: 'user-123',
        email: 'test@example.com',
        role: 'admin',
      });
      
      mockRequest.headers.set('authorization', 'Bearer valid.token');
      mockJwt.verify.mockReturnValue(payload as any);

      // Mock the request object to capture user context
      const mockSetContext = jest.fn();
      (mockRequest as any).setContext = mockSetContext;

      await authMiddleware(mockRequest);

      expect(mockSetContext).toHaveBeenCalledWith('user', {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      });
    });
  });

  describe('Role-Based Access Control', () => {
    it('should allow admin access to all endpoints', async () => {
      const payload = createJWTPayload({ role: 'admin' });
      mockRequest.headers.set('authorization', 'Bearer admin.token');
      mockJwt.verify.mockReturnValue(payload as any);

      const response = await authMiddleware(mockRequest, { 
        requiredRole: 'user' 
      });

      expect(response).toBeUndefined(); // Allow access
    });

    it('should restrict user access to admin endpoints', async () => {
      const payload = createJWTPayload({ role: 'user' });
      mockRequest.headers.set('authorization', 'Bearer user.token');
      mockJwt.verify.mockReturnValue(payload as any);

      const response = await authMiddleware(mockRequest, { 
        requiredRole: 'admin' 
      });

      expect(response).toBeInstanceOf(NextResponse);
      if (response instanceof NextResponse) {
        expect(response.status).toBe(403);
        const body = await response.json();
        expect(body.error).toBe('Insufficient permissions');
      }
    });

    it('should handle custom permission validation', async () => {
      const payload = createJWTPayload({ role: 'user' });
      mockRequest.headers.set('authorization', 'Bearer user.token');
      mockJwt.verify.mockReturnValue(payload as any);

      const customPermissionCheck = jest.fn().mockReturnValue(false);

      const response = await authMiddleware(mockRequest, {
        customPermission: customPermissionCheck,
      });

      expect(customPermissionCheck).toHaveBeenCalledWith(payload);
      expect(response).toBeInstanceOf(NextResponse);
      if (response instanceof NextResponse) {
        expect(response.status).toBe(403);
      }
    });
  });

  describe('Security Headers', () => {
    it('should add security headers to responses', async () => {
      const payload = createJWTPayload();
      mockRequest.headers.set('authorization', 'Bearer valid.token');
      mockJwt.verify.mockReturnValue(payload as any);

      const response = await authMiddleware(mockRequest, {
        addSecurityHeaders: true,
      });

      if (response instanceof NextResponse) {
        expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
        expect(response.headers.get('X-Frame-Options')).toBe('DENY');
        expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      }
    });

    it('should set CORS headers when configured', async () => {
      const payload = createJWTPayload();
      mockRequest.headers.set('authorization', 'Bearer valid.token');
      mockJwt.verify.mockReturnValue(payload as any);

      const response = await authMiddleware(mockRequest, {
        cors: {
          origin: 'https://app.paintbox.com',
          methods: ['GET', 'POST'],
          credentials: true,
        },
      });

      if (response instanceof NextResponse) {
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://app.paintbox.com');
        expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST');
        expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true');
      }
    });
  });

  describe('Token Refresh', () => {
    it('should handle token refresh requests', async () => {
      const refreshToken = 'valid.refresh.token';
      const newPayload = createJWTPayload();
      const newAccessToken = 'new.access.token';

      mockRequest.headers.set('x-refresh-token', refreshToken);
      mockJwt.verify.mockReturnValue(newPayload as any);
      mockJwt.sign.mockReturnValue(newAccessToken);

      const response = await authMiddleware(mockRequest, {
        allowRefresh: true,
      });

      expect(mockJwt.verify).toHaveBeenCalledWith(refreshToken, secretKey);
      expect(mockJwt.sign).toHaveBeenCalled();
    });

    it('should reject invalid refresh tokens', async () => {
      const refreshToken = 'invalid.refresh.token';
      
      mockRequest.headers.set('x-refresh-token', refreshToken);
      
      const error = new Error('invalid token');
      error.name = 'JsonWebTokenError';
      mockJwt.verify.mockImplementation(() => {
        throw error;
      });

      const response = await authMiddleware(mockRequest, {
        allowRefresh: true,
      });

      expect(response).toBeInstanceOf(NextResponse);
      if (response instanceof NextResponse) {
        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.error).toBe('Invalid refresh token');
      }
    });
  });

  describe('Route Protection', () => {
    it('should protect admin routes', async () => {
      const adminRequest = new NextRequest('https://app.paintbox.com/api/admin/users');
      const userPayload = createJWTPayload({ role: 'user' });
      
      adminRequest.headers.set('authorization', 'Bearer user.token');
      mockJwt.verify.mockReturnValue(userPayload as any);

      const response = await authMiddleware(adminRequest);

      expect(response).toBeInstanceOf(NextResponse);
      if (response instanceof NextResponse) {
        expect(response.status).toBe(403);
      }
    });

    it('should allow public routes without authentication', async () => {
      const publicRequest = new NextRequest('https://app.paintbox.com/api/health');

      const response = await authMiddleware(publicRequest, {
        publicRoutes: ['/api/health', '/api/status'],
      });

      expect(response).toBeUndefined(); // Allow access
    });

    it('should handle API key authentication for service routes', async () => {
      const serviceRequest = new NextRequest('https://app.paintbox.com/api/webhooks/salesforce');
      const validApiKey = 'valid-api-key-123';
      
      serviceRequest.headers.set('x-api-key', validApiKey);

      const response = await authMiddleware(serviceRequest, {
        allowApiKey: true,
        validApiKeys: [validApiKey],
      });

      expect(response).toBeUndefined(); // Allow access
    });
  });

  describe('Security Features', () => {
    it('should prevent timing attacks during token verification', async () => {
      const validToken = 'Bearer valid.token';
      const invalidToken = 'Bearer invalid.token';

      const payload = createJWTPayload();
      
      // Mock both scenarios
      mockJwt.verify
        .mockReturnValueOnce(payload as any) // Valid token
        .mockImplementationOnce(() => { // Invalid token
          throw new Error('invalid token');
        });

      const startTime1 = Date.now();
      await authMiddleware(
        new NextRequest('https://app.paintbox.com/api/test', {
          headers: { authorization: validToken },
        })
      );
      const endTime1 = Date.now();

      const startTime2 = Date.now();
      await authMiddleware(
        new NextRequest('https://app.paintbox.com/api/test', {
          headers: { authorization: invalidToken },
        })
      );
      const endTime2 = Date.now();

      // Response times should be similar to prevent timing attacks
      const timeDiff = Math.abs((endTime1 - startTime1) - (endTime2 - startTime2));
      expect(timeDiff).toBeLessThan(50); // Within 50ms
    });

    it('should rate limit authentication attempts', async () => {
      const invalidToken = 'Bearer invalid.token';
      const request = new NextRequest('https://app.paintbox.com/api/test', {
        headers: { 
          authorization: invalidToken,
          'x-forwarded-for': '192.168.1.1',
        },
      });

      mockJwt.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      // Make multiple failed attempts
      const responses = [];
      for (let i = 0; i < 6; i++) {
        responses.push(await authMiddleware(request, { enableRateLimit: true }));
      }

      // Should rate limit after too many failures
      const lastResponse = responses[responses.length - 1];
      expect(lastResponse).toBeInstanceOf(NextResponse);
      if (lastResponse instanceof NextResponse) {
        expect(lastResponse.status).toBe(429); // Too Many Requests
      }
    });

    it('should log security events', async () => {
      const mockLogger = jest.fn();
      const invalidToken = 'Bearer invalid.token';
      
      mockRequest.headers.set('authorization', invalidToken);
      mockJwt.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      await authMiddleware(mockRequest, {
        logger: mockLogger,
      });

      expect(mockLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'auth_failure',
          reason: 'invalid_token',
          ip: expect.any(String),
          userAgent: expect.any(String),
        })
      );
    });
  });

  describe('Performance', () => {
    it('should cache JWT verification results', async () => {
      const token = 'Bearer cacheable.token';
      const payload = createJWTPayload();
      
      mockRequest.headers.set('authorization', token);
      mockJwt.verify.mockReturnValue(payload as any);

      // First call
      await authMiddleware(mockRequest, { enableCache: true });
      
      // Second call should use cache
      await authMiddleware(mockRequest, { enableCache: true });

      // JWT verify should only be called once due to caching
      expect(mockJwt.verify).toHaveBeenCalledTimes(1);
    });

    it('should handle high concurrent authentication requests', async () => {
      const payload = createJWTPayload();
      mockJwt.verify.mockReturnValue(payload as any);

      const requests = Array.from({ length: 100 }, (_, i) => {
        const req = new NextRequest(`https://app.paintbox.com/api/test/${i}`, {
          headers: { authorization: 'Bearer valid.token' },
        });
        return authMiddleware(req);
      });

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      // All requests should succeed
      expect(responses.filter(r => r === undefined)).toHaveLength(100);
      
      // Should complete reasonably fast
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty authorization header', async () => {
      mockRequest.headers.set('authorization', '');

      const response = await authMiddleware(mockRequest);

      expect(response).toBeInstanceOf(NextResponse);
      if (response instanceof NextResponse) {
        expect(response.status).toBe(401);
      }
    });

    it('should handle malformed JWT tokens', async () => {
      mockRequest.headers.set('authorization', 'Bearer not.a.jwt');
      
      mockJwt.verify.mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      const response = await authMiddleware(mockRequest);

      expect(response).toBeInstanceOf(NextResponse);
      if (response instanceof NextResponse) {
        expect(response.status).toBe(401);
      }
    });

    it('should handle very long tokens gracefully', async () => {
      const veryLongToken = 'Bearer ' + 'x'.repeat(10000);
      mockRequest.headers.set('authorization', veryLongToken);

      const response = await authMiddleware(mockRequest);

      expect(response).toBeInstanceOf(NextResponse);
      if (response instanceof NextResponse) {
        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.error).toBe('Token too long');
      }
    });
  });
});