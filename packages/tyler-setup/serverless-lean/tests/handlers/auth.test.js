import { handler } from '../../src/handlers/auth.js';
import { mockDynamoDBDocumentClient } from '../mocks/aws-sdk.js';
import { generateJwtToken, verifyPassword, hashPassword } from '../../src/utils/security.js';
import { logAudit } from '../../src/utils/helpers.js';

// Mock dependencies
jest.mock('@aws-sdk/lib-dynamodb');
jest.mock('../../src/utils/security.js');
jest.mock('../../src/utils/helpers.js');

describe('Auth Handler', () => {
  let mockEvent, mockUser, mockRefreshToken;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'employee',
      passwordHash: 'hashed-password',
      isActive: true,
      lastLogin: null,
      lastLoginIP: null
    };

    mockRefreshToken = 'mock-refresh-token';

    mockEvent = {
      httpMethod: 'POST',
      path: '/auth/login',
      headers: {
        'User-Agent': 'test-agent',
        'X-Forwarded-For': '192.168.1.1'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    };

    // Setup default mocks
    generateJwtToken.mockResolvedValue('mock-jwt-token');
    verifyPassword.mockResolvedValue(true);
    logAudit.mockResolvedValue();

    // Mock environment variables
    process.env.SECRETS_PREFIX = 'test';
    process.env.AWS_REGION = 'us-east-1';
  });

  describe('POST /auth/login', () => {
    it('should successfully authenticate valid user', async () => {
      // Mock DynamoDB responses
      mockDynamoDBDocumentClient.send
        .mockResolvedValueOnce({
          Items: [mockUser] // QueryCommand for user lookup
        })
        .mockResolvedValueOnce({}) // PutCommand for refresh token
        .mockResolvedValueOnce({}); // PutCommand for user update

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.token).toBe('mock-jwt-token');
      expect(body.user.email).toBe('test@example.com');
      expect(generateJwtToken).toHaveBeenCalledWith({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'employee',
        type: 'employee'
      });
    });

    it('should reject login for non-existent user', async () => {
      mockDynamoDBDocumentClient.send.mockResolvedValueOnce({
        Items: [] // No user found
      });

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toBe('Invalid credentials');
      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
        action: 'LOGIN_FAILED',
        reason: 'User not found'
      }));
    });

    it('should reject login for invalid password', async () => {
      mockDynamoDBDocumentClient.send.mockResolvedValueOnce({
        Items: [mockUser]
      });
      verifyPassword.mockResolvedValue(false);

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
        action: 'LOGIN_FAILED',
        reason: 'Invalid password'
      }));
    });

    it('should reject login for inactive user', async () => {
      mockDynamoDBDocumentClient.send.mockResolvedValueOnce({
        Items: [{ ...mockUser, isActive: false }]
      });

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(403);
      const body = JSON.parse(result.body);
      expect(body.error.message).toBe('Account is disabled');
      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
        action: 'LOGIN_FAILED',
        reason: 'Account disabled'
      }));
    });

    it('should handle malformed request body', async () => {
      mockEvent.body = 'invalid-json';

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
    });

    it('should enforce rate limiting', async () => {
      // Mock rate limit check to fail
      const rateLimitEvent = {
        ...mockEvent,
        headers: {
          ...mockEvent.headers,
          'X-Forwarded-For': '192.168.1.100'
        }
      };

      // Simulate multiple rapid requests by calling handler multiple times
      for (let i = 0; i < 15; i++) {
        await handler(rateLimitEvent);
      }

      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
        action: 'RATE_LIMIT_EXCEEDED'
      }));
    });
  });

  describe('POST /auth/refresh', () => {
    beforeEach(() => {
      mockEvent.path = '/auth/refresh';
      mockEvent.body = JSON.stringify({
        refreshToken: 'valid-refresh-token'
      });
    });

    it('should successfully refresh token', async () => {
      const mockStoredToken = {
        token: 'valid-refresh-token',
        userId: 'user-123',
        expiresAt: Date.now() + 86400000, // Future expiry
        createdAt: Date.now() - 3600000
      };

      mockDynamoDBDocumentClient.send
        .mockResolvedValueOnce({ Item: mockStoredToken }) // GetCommand for refresh token
        .mockResolvedValueOnce({ Item: mockUser }) // GetCommand for user
        .mockResolvedValueOnce({}); // PutCommand for token update

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.token).toBe('mock-jwt-token');
    });

    it('should reject expired refresh token', async () => {
      const expiredToken = {
        token: 'expired-refresh-token',
        userId: 'user-123',
        expiresAt: Date.now() - 86400000, // Past expiry
        createdAt: Date.now() - 172800000
      };

      mockDynamoDBDocumentClient.send.mockResolvedValueOnce({
        Item: expiredToken
      });

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body);
      expect(body.error.message).toBe('Refresh token expired');
    });

    it('should reject non-existent refresh token', async () => {
      mockDynamoDBDocumentClient.send.mockResolvedValueOnce({
        Item: null // Token not found
      });

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body);
      expect(body.error.message).toBe('Invalid refresh token');
    });
  });

  describe('POST /auth/logout', () => {
    beforeEach(() => {
      mockEvent.path = '/auth/logout';
      mockEvent.headers.Authorization = 'Bearer mock-jwt-token';
      mockEvent.body = JSON.stringify({
        refreshToken: 'valid-refresh-token'
      });
    });

    it('should successfully logout user', async () => {
      mockDynamoDBDocumentClient.send.mockResolvedValueOnce({}); // DeleteCommand

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Logged out successfully');
    });

    it('should handle logout gracefully even with errors', async () => {
      mockDynamoDBDocumentClient.send.mockRejectedValue(new Error('DynamoDB error'));

      const result = await handler(mockEvent);

      // Should still return success to prevent information leakage
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
    });
  });

  describe('CORS Handling', () => {
    it('should handle OPTIONS preflight request', async () => {
      mockEvent.httpMethod = 'OPTIONS';

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(200);
      expect(result.headers['Access-Control-Allow-Methods']).toBe('GET,POST,PUT,DELETE,OPTIONS');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown endpoint', async () => {
      mockEvent.path = '/auth/unknown';

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.error.message).toBe('Authentication endpoint not found');
    });

    it('should handle DynamoDB errors gracefully', async () => {
      mockDynamoDBDocumentClient.send.mockRejectedValue(
        new Error('DynamoDB connection failed')
      );

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
    });
  });
});
