import { jest } from '@jest/globals';
import { handler as authHandler } from '../src/handlers/auth.js';
import { handler as authorizerHandler } from '../src/handlers/authorizer.js';

// Mock AWS SDK
const mockQuery = jest.fn();
const mockPut = jest.fn();
const mockGet = jest.fn();
const mockDelete = jest.fn();

jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: () => ({
      send: jest.fn().mockImplementation((command) => {
        if (command.constructor.name === 'QueryCommand') return mockQuery();
        if (command.constructor.name === 'PutCommand') return mockPut();
        if (command.constructor.name === 'GetCommand') return mockGet();
        if (command.constructor.name === 'DeleteCommand') return mockDelete();
        return Promise.resolve({});
      })
    })
  },
  QueryCommand: class QueryCommand {},
  PutCommand: class PutCommand {},
  GetCommand: class GetCommand {},
  DeleteCommand: class DeleteCommand {}
}));

jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn()
}));

// Mock security functions
jest.mock('../src/utils/security.js', () => ({
  generateJwtToken: jest.fn().mockResolvedValue('mock-jwt-token'),
  verifyJwtToken: jest.fn().mockResolvedValue({
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'admin',
    type: 'employee',
    exp: Math.floor(Date.now() / 1000) + 3600
  }),
  verifyPassword: jest.fn().mockResolvedValue(true),
  generateRefreshToken: jest.fn().mockReturnValue('mock-refresh-token'),
  RATE_LIMITS: {
    AUTH: {
      windowMs: 15 * 60 * 1000,
      max: 5,
      message: 'Too many authentication attempts'
    }
  }
}));

// Mock validation
jest.mock('../src/utils/validation.js', () => ({
  validateBody: jest.fn().mockImplementation((data) => data),
  sanitizeObject: jest.fn().mockImplementation((data) => data),
  userLoginSchema: {}
}));

// Mock helpers
jest.mock('../src/utils/helpers.js', () => ({
  response: (statusCode, body) => ({ statusCode, body }),
  errorResponse: (statusCode, message) => ({ statusCode, body: { error: { message } } }),
  logAudit: jest.fn().mockResolvedValue(undefined),
  handleError: jest.fn().mockImplementation((error) => ({ 
    statusCode: 500, 
    body: { error: { message: error.message } } 
  })),
  checkRateLimit: jest.fn().mockReturnValue(true),
  getClientIP: jest.fn().mockReturnValue('127.0.0.1'),
  validateRequestSize: jest.fn().mockReturnValue(true)
}));

describe('Authentication Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SECRETS_PREFIX = 'test-app';
  });

  describe('POST /auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      // Mock user found in database
      mockQuery.mockResolvedValue({
        Items: [{
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'admin',
          passwordHash: 'hashed-password',
          isActive: true
        }]
      });

      mockPut.mockResolvedValue({});

      const event = {
        httpMethod: 'POST',
        path: '/auth/login',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123'
        }),
        headers: {},
        requestContext: { identity: { sourceIp: '127.0.0.1' } }
      };

      const result = await authHandler(event);

      expect(result.statusCode).toBe(200);
      expect(result.body.success).toBe(true);
      expect(result.body.token).toBe('mock-jwt-token');
      expect(result.body.refreshToken).toBe('mock-refresh-token');
      expect(result.body.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin',
        lastLogin: undefined
      });
    });

    it('should fail login with invalid credentials', async () => {
      // Mock user not found
      mockQuery.mockResolvedValue({ Items: [] });

      const event = {
        httpMethod: 'POST',
        path: '/auth/login',
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: 'password123'
        }),
        headers: {},
        requestContext: { identity: { sourceIp: '127.0.0.1' } }
      };

      const result = await authHandler(event);

      expect(result.statusCode).toBe(401);
      expect(result.body.error.message).toBe('Invalid credentials');
    });

    it('should fail login with disabled account', async () => {
      mockQuery.mockResolvedValue({
        Items: [{
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'admin',
          passwordHash: 'hashed-password',
          isActive: false
        }]
      });

      const event = {
        httpMethod: 'POST',
        path: '/auth/login',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123'
        }),
        headers: {},
        requestContext: { identity: { sourceIp: '127.0.0.1' } }
      };

      const result = await authHandler(event);

      expect(result.statusCode).toBe(403);
      expect(result.body.error.message).toBe('Account is disabled');
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh token successfully', async () => {
      // Mock refresh token found
      mockGet.mockResolvedValueOnce({
        Item: {
          token: 'valid-refresh-token',
          userId: 'user-123',
          expiresAt: Date.now() + 86400000,
          createdAt: Date.now() - 3600000
        }
      });

      // Mock user found
      mockGet.mockResolvedValueOnce({
        Item: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'admin',
          isActive: true
        }
      });

      mockPut.mockResolvedValue({});

      const event = {
        httpMethod: 'POST',
        path: '/auth/refresh',
        body: JSON.stringify({
          refreshToken: 'valid-refresh-token'
        }),
        headers: {},
        requestContext: { identity: { sourceIp: '127.0.0.1' } }
      };

      const result = await authHandler(event);

      expect(result.statusCode).toBe(200);
      expect(result.body.success).toBe(true);
      expect(result.body.token).toBe('mock-jwt-token');
      expect(result.body.refreshToken).toBe('mock-refresh-token');
    });

    it('should fail with invalid refresh token', async () => {
      mockGet.mockResolvedValue({ Item: null });

      const event = {
        httpMethod: 'POST',
        path: '/auth/refresh',
        body: JSON.stringify({
          refreshToken: 'invalid-refresh-token'
        }),
        headers: {},
        requestContext: { identity: { sourceIp: '127.0.0.1' } }
      };

      const result = await authHandler(event);

      expect(result.statusCode).toBe(401);
      expect(result.body.error.message).toBe('Invalid refresh token');
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      mockDelete.mockResolvedValue({});

      const event = {
        httpMethod: 'POST',
        path: '/auth/logout',
        body: JSON.stringify({
          refreshToken: 'refresh-token-to-revoke'
        }),
        headers: {
          Authorization: 'Bearer valid-jwt-token'
        },
        requestContext: { identity: { sourceIp: '127.0.0.1' } }
      };

      const result = await authHandler(event);

      expect(result.statusCode).toBe(200);
      expect(result.body.success).toBe(true);
      expect(result.body.message).toBe('Logged out successfully');
    });
  });

  describe('OPTIONS request', () => {
    it('should handle CORS preflight', async () => {
      const event = {
        httpMethod: 'OPTIONS',
        path: '/auth/login'
      };

      const result = await authHandler(event);

      expect(result.statusCode).toBe(200);
    });
  });
});

describe('Authorization Handler', () => {
  describe('JWT Token Validation', () => {
    it('should authorize valid token', async () => {
      const event = {
        authorizationToken: 'Bearer valid-jwt-token',
        methodArn: 'arn:aws:execute-api:us-east-1:123456789:abcdef123/prod/GET/users',
        requestContext: { identity: { sourceIp: '127.0.0.1' } }
      };

      const result = await authorizerHandler(event);

      expect(result.principalId).toBe('user-123');
      expect(result.policyDocument).toBeDefined();
      expect(result.context.userId).toBe('user-123');
      expect(result.context.email).toBe('test@example.com');
      expect(result.context.role).toBe('admin');
    });

    it('should deny invalid token', async () => {
      const { verifyJwtToken } = await import('../src/utils/security.js');
      verifyJwtToken.mockRejectedValueOnce(new Error('Invalid token'));

      const event = {
        authorizationToken: 'Bearer invalid-token',
        methodArn: 'arn:aws:execute-api:us-east-1:123456789:abcdef123/prod/GET/users',
        requestContext: { identity: { sourceIp: '127.0.0.1' } }
      };

      await expect(authorizerHandler(event)).rejects.toThrow('Unauthorized');
    });

    it('should deny missing token', async () => {
      const event = {
        methodArn: 'arn:aws:execute-api:us-east-1:123456789:abcdef123/prod/GET/users',
        requestContext: { identity: { sourceIp: '127.0.0.1' } }
      };

      await expect(authorizerHandler(event)).rejects.toThrow('Unauthorized');
    });
  });

  describe('Role-based Access Control', () => {
    it('should generate admin policy', async () => {
      const event = {
        authorizationToken: 'Bearer admin-token',
        methodArn: 'arn:aws:execute-api:us-east-1:123456789:abcdef123/prod/GET/users',
        requestContext: { identity: { sourceIp: '127.0.0.1' } }
      };

      const result = await authorizerHandler(event);

      expect(result.policyDocument.Statement).toContainEqual(
        expect.objectContaining({
          Effect: 'Allow',
          Action: 'execute-api:Invoke'
        })
      );
    });

    it('should generate employee policy with restrictions', async () => {
      const { verifyJwtToken } = await import('../src/utils/security.js');
      verifyJwtToken.mockResolvedValueOnce({
        id: 'user-456',
        email: 'employee@example.com',
        name: 'Employee User',
        role: 'employee',
        type: 'employee',
        exp: Math.floor(Date.now() / 1000) + 3600
      });

      const event = {
        authorizationToken: 'Bearer employee-token',
        methodArn: 'arn:aws:execute-api:us-east-1:123456789:abcdef123/prod/GET/users',
        requestContext: { identity: { sourceIp: '127.0.0.1' } }
      };

      const result = await authorizerHandler(event);

      expect(result.context.role).toBe('employee');
      expect(result.policyDocument.Statement).toBeDefined();
    });
  });
});