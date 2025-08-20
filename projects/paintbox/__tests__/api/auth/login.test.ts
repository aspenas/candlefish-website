/**
 * Login API Endpoint Tests
 * Tests for the /api/auth/login endpoint
 */

import { NextRequest } from 'next/server';
import { POST, OPTIONS } from '@/app/api/auth/login/route';

// Mock AWS Secrets Manager
jest.mock('@aws-sdk/client-secrets-manager', () => ({
  SecretsManagerClient: jest.fn(() => ({
    send: jest.fn(),
  })),
  GetSecretValueCommand: jest.fn(),
}));

// Mock logger
jest.mock('@/lib/logging/simple-logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock bcrypt
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
}));

describe('Login Endpoint (/api/auth/login)', () => {
  let mockSecretsClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    const { SecretsManagerClient } = require('@aws-sdk/client-secrets-manager');
    mockSecretsClient = new SecretsManagerClient();

    // Mock private key retrieval
    mockSecretsClient.send.mockResolvedValue({
      SecretString: JSON.stringify({
        kid: 'test-key-id',
        kty: 'RSA',
        alg: 'RS256',
        use: 'sig',
        privateKey: 'mock-private-key-pem',
      }),
    });
  });

  describe('POST /api/auth/login', () => {
    it('should successfully authenticate valid credentials', async () => {
      const loginData = {
        email: 'admin@paintbox.com',
        password: 'admin',
        rememberMe: false,
      };

      const request = new NextRequest('https://test.com/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('user');
      expect(data.data).toHaveProperty('tokens');
      
      // Check user data
      expect(data.data.user).toHaveProperty('id', '1');
      expect(data.data.user).toHaveProperty('email', 'admin@paintbox.com');
      expect(data.data.user).toHaveProperty('role', 'admin');
      expect(data.data.user).toHaveProperty('organizationId', 'org_1');

      // Check token structure
      expect(data.data.tokens).toHaveProperty('accessToken');
      expect(data.data.tokens).toHaveProperty('refreshToken');
      expect(data.data.tokens).toHaveProperty('expiresIn', 24 * 60 * 60); // 24 hours
      expect(data.data.tokens).toHaveProperty('tokenType', 'Bearer');
    });

    it('should handle remember me functionality', async () => {
      const loginData = {
        email: 'admin@paintbox.com',
        password: 'admin',
        rememberMe: true,
      };

      const request = new NextRequest('https://test.com/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.tokens.expiresIn).toBe(7 * 24 * 60 * 60); // 7 days
    });

    it('should reject invalid email', async () => {
      const loginData = {
        email: 'invalid@example.com',
        password: 'admin',
      };

      const request = new NextRequest('https://test.com/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_CREDENTIALS');
      expect(data.error.message).toBe('Invalid email or password');
    });

    it('should reject invalid password', async () => {
      const loginData = {
        email: 'admin@paintbox.com',
        password: 'wrong-password',
      };

      const request = new NextRequest('https://test.com/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_CREDENTIALS');
      expect(data.error.message).toBe('Invalid email or password');
    });

    it('should validate required fields', async () => {
      const loginData = {
        email: '',
        password: '',
      };

      const request = new NextRequest('https://test.com/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_REQUEST');
      expect(data.error.message).toBe('Email and password are required');
    });

    it('should handle missing email field', async () => {
      const loginData = {
        password: 'admin',
      };

      const request = new NextRequest('https://test.com/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_REQUEST');
    });

    it('should handle missing password field', async () => {
      const loginData = {
        email: 'admin@paintbox.com',
      };

      const request = new NextRequest('https://test.com/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_REQUEST');
    });

    it('should handle AWS secrets retrieval failure', async () => {
      // Mock AWS error
      mockSecretsClient.send.mockRejectedValueOnce(new Error('Access denied'));

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
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('LOGIN_ERROR');
      expect(data.error.message).toBe('Authentication service error');
    });

    it('should handle malformed JSON request', async () => {
      const request = new NextRequest('https://test.com/api/auth/login', {
        method: 'POST',
        body: 'invalid-json',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('LOGIN_ERROR');
    });

    it('should implement timing attack protection', async () => {
      const startTime = Date.now();

      const loginData = {
        email: 'nonexistent@example.com',
        password: 'any-password',
      };

      const request = new NextRequest('https://test.com/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginData),
      });

      const response = await POST(request);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should take at least 1 second due to timing attack protection
      expect(duration).toBeGreaterThanOrEqual(1000);
      expect(response.status).toBe(401);
    });

    it('should handle empty request body', async () => {
      const request = new NextRequest('https://test.com/api/auth/login', {
        method: 'POST',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });
  });

  describe('OPTIONS /api/auth/login', () => {
    it('should handle CORS preflight requests', async () => {
      const request = new NextRequest('https://test.com/api/auth/login', {
        method: 'OPTIONS',
      });

      const response = await OPTIONS(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, OPTIONS');
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Authorization');
    });
  });

  describe('Security Tests', () => {
    it('should not return sensitive user information', async () => {
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

      // User object should not contain password or hash
      expect(data.data.user).not.toHaveProperty('password');
      expect(data.data.user).not.toHaveProperty('passwordHash');
      expect(data.data.user).not.toHaveProperty('permissions');
    });

    it('should handle SQL injection attempts in email', async () => {
      const maliciousEmail = "admin@paintbox.com'; DROP TABLE users; --";
      
      const loginData = {
        email: maliciousEmail,
        password: 'admin',
      };

      const request = new NextRequest('https://test.com/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });

    it('should handle XSS attempts in input fields', async () => {
      const xssPayload = "<script>alert('xss')</script>";
      
      const loginData = {
        email: xssPayload,
        password: xssPayload,
      };

      const request = new NextRequest('https://test.com/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginData),
      });

      const response = await POST(request);
      const data = await response.json();

      // Should handle gracefully without executing script
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });
  });

  describe('Rate Limiting & Brute Force Protection', () => {
    it('should be designed to work with rate limiting middleware', async () => {
      // This test validates that the endpoint structure supports rate limiting
      // The actual rate limiting would be implemented in middleware
      
      const loginData = {
        email: 'admin@paintbox.com',
        password: 'wrong-password',
      };

      const request = new NextRequest('https://test.com/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(loginData),
        headers: {
          'x-forwarded-for': '192.168.1.100',
          'user-agent': 'test-client',
        },
      });

      const response = await POST(request);
      
      // Endpoint should handle headers that rate limiting middleware would check
      expect(response.status).toBe(401);
    });
  });
});