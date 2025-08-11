/**
 * Tyler Setup Platform - Auth Lambda Function Tests
 * Comprehensive unit tests for authentication Lambda function
 */

const { handler } = require('../../../serverless-lean/src/handlers/auth');
const { validateUser } = require('../../../serverless-lean/src/utils/validation');
const jwt = require('jsonwebtoken');

// Mock dependencies
jest.mock('../../../serverless-lean/src/utils/validation');
jest.mock('jsonwebtoken');
jest.mock('bcryptjs');

describe('Auth Lambda Handler', () => {
  let mockContext;
  let mockCallback;

  beforeEach(() => {
    mockContext = {
      requestId: 'test-request-id',
      functionName: 'auth-handler',
      getRemainingTimeInMillis: () => 30000
    };

    mockCallback = jest.fn();

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('POST /auth/login', () => {
    it('should authenticate valid user credentials', async () => {
      // Arrange
      const event = {
        httpMethod: 'POST',
        path: '/auth/login',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'validPassword123'
        })
      };

      const mockUser = createMockUser();
      validateUser.mockResolvedValue(mockUser);
      jwt.sign.mockReturnValue('mock-jwt-token');

      // Act
      const result = await handler(event, mockContext);

      // Assert
      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.token).toBe('mock-jwt-token');
      expect(body.data.user).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
        organizationId: mockUser.organizationId
      });
      expect(body.data.user.password).toBeUndefined();

      expect(validateUser).toHaveBeenCalledWith('test@example.com', 'validPassword123');
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          organizationId: mockUser.organizationId,
          role: mockUser.role
        }),
        expect.any(String),
        { expiresIn: '24h' }
      );
    });

    it('should reject invalid credentials', async () => {
      // Arrange
      const event = {
        httpMethod: 'POST',
        path: '/auth/login',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrongPassword'
        })
      };

      validateUser.mockResolvedValue(null);

      // Act
      const result = await handler(event, mockContext);

      // Assert
      expect(result.statusCode).toBe(401);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toBe('Invalid credentials');
    });

    it('should validate required fields', async () => {
      // Arrange
      const event = {
        httpMethod: 'POST',
        path: '/auth/login',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'test@example.com'
          // Missing password
        })
      };

      // Act
      const result = await handler(event, mockContext);

      // Assert
      expect(result.statusCode).toBe(400);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toContain('Password is required');
    });

    it('should validate email format', async () => {
      // Arrange
      const event = {
        httpMethod: 'POST',
        path: '/auth/login',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'invalid-email',
          password: 'validPassword123'
        })
      };

      // Act
      const result = await handler(event, mockContext);

      // Assert
      expect(result.statusCode).toBe(400);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toContain('Valid email is required');
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      const event = {
        httpMethod: 'POST',
        path: '/auth/login',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'validPassword123'
        })
      };

      validateUser.mockRejectedValue(new Error('Database connection failed'));

      // Act
      const result = await handler(event, mockContext);

      // Assert
      expect(result.statusCode).toBe(500);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toBe('Internal server error');
    });

    it('should handle malformed JSON', async () => {
      // Arrange
      const event = {
        httpMethod: 'POST',
        path: '/auth/login',
        headers: {
          'Content-Type': 'application/json'
        },
        body: 'invalid json'
      };

      // Act
      const result = await handler(event, mockContext);

      // Assert
      expect(result.statusCode).toBe(400);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toContain('Invalid JSON');
    });

    it('should include security headers', async () => {
      // Arrange
      const event = {
        httpMethod: 'POST',
        path: '/auth/login',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'validPassword123'
        })
      };

      const mockUser = createMockUser();
      validateUser.mockResolvedValue(mockUser);
      jwt.sign.mockReturnValue('mock-jwt-token');

      // Act
      const result = await handler(event, mockContext);

      // Assert
      expect(result.headers).toMatchObject({
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
      });
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh valid JWT token', async () => {
      // Arrange
      const event = {
        httpMethod: 'POST',
        path: '/auth/refresh',
        headers: {
          'Authorization': 'Bearer valid-jwt-token',
          'Content-Type': 'application/json'
        },
        body: '{}'
      };

      const mockPayload = {
        userId: 'user-123',
        organizationId: 'org-123',
        role: 'USER',
        exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      };

      jwt.verify.mockReturnValue(mockPayload);
      jwt.sign.mockReturnValue('new-jwt-token');

      // Act
      const result = await handler(event, mockContext);

      // Assert
      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.token).toBe('new-jwt-token');

      expect(jwt.verify).toHaveBeenCalledWith('valid-jwt-token', expect.any(String));
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockPayload.userId,
          organizationId: mockPayload.organizationId,
          role: mockPayload.role
        }),
        expect.any(String),
        { expiresIn: '24h' }
      );
    });

    it('should reject expired tokens', async () => {
      // Arrange
      const event = {
        httpMethod: 'POST',
        path: '/auth/refresh',
        headers: {
          'Authorization': 'Bearer expired-jwt-token',
          'Content-Type': 'application/json'
        },
        body: '{}'
      };

      jwt.verify.mockImplementation(() => {
        const error = new Error('jwt expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      // Act
      const result = await handler(event, mockContext);

      // Assert
      expect(result.statusCode).toBe(401);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toBe('Token expired');
    });

    it('should reject invalid tokens', async () => {
      // Arrange
      const event = {
        httpMethod: 'POST',
        path: '/auth/refresh',
        headers: {
          'Authorization': 'Bearer invalid-jwt-token',
          'Content-Type': 'application/json'
        },
        body: '{}'
      };

      jwt.verify.mockImplementation(() => {
        throw new Error('invalid signature');
      });

      // Act
      const result = await handler(event, mockContext);

      // Assert
      expect(result.statusCode).toBe(401);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toBe('Invalid token');
    });

    it('should require authorization header', async () => {
      // Arrange
      const event = {
        httpMethod: 'POST',
        path: '/auth/refresh',
        headers: {
          'Content-Type': 'application/json'
        },
        body: '{}'
      };

      // Act
      const result = await handler(event, mockContext);

      // Assert
      expect(result.statusCode).toBe(401);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toBe('Authorization header required');
    });
  });

  describe('POST /auth/logout', () => {
    it('should successfully logout user', async () => {
      // Arrange
      const event = {
        httpMethod: 'POST',
        path: '/auth/logout',
        headers: {
          'Authorization': 'Bearer valid-jwt-token',
          'Content-Type': 'application/json'
        },
        body: '{}'
      };

      const mockPayload = {
        userId: 'user-123',
        jti: 'token-id-123'
      };

      jwt.verify.mockReturnValue(mockPayload);

      // Act
      const result = await handler(event, mockContext);

      // Assert
      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Successfully logged out');
    });
  });

  describe('Error Handling', () => {
    it('should handle unsupported HTTP methods', async () => {
      // Arrange
      const event = {
        httpMethod: 'GET',
        path: '/auth/login'
      };

      // Act
      const result = await handler(event, mockContext);

      // Assert
      expect(result.statusCode).toBe(405);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toBe('Method not allowed');
    });

    it('should handle unsupported paths', async () => {
      // Arrange
      const event = {
        httpMethod: 'POST',
        path: '/auth/unknown'
      };

      // Act
      const result = await handler(event, mockContext);

      // Assert
      expect(result.statusCode).toBe(404);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toBe('Endpoint not found');
    });

    it('should handle unexpected errors', async () => {
      // Arrange
      const event = {
        httpMethod: 'POST',
        path: '/auth/login',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'validPassword123'
        })
      };

      // Mock an unexpected error
      validateUser.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      // Act
      const result = await handler(event, mockContext);

      // Assert
      expect(result.statusCode).toBe(500);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toBe('Internal server error');
    });
  });

  describe('Rate Limiting', () => {
    it('should implement rate limiting for login attempts', async () => {
      // Arrange
      const event = {
        httpMethod: 'POST',
        path: '/auth/login',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '192.168.1.1'
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrongPassword'
        })
      };

      // Mock multiple failed attempts
      validateUser.mockResolvedValue(null);

      // Simulate 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await handler(event, mockContext);
      }

      // Act - 6th attempt should be rate limited
      const result = await handler(event, mockContext);

      // Assert
      expect(result.statusCode).toBe(429);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toContain('Too many login attempts');
    });
  });

  describe('Audit Logging', () => {
    it('should log successful authentication', async () => {
      // Arrange
      const event = {
        httpMethod: 'POST',
        path: '/auth/login',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '192.168.1.1',
          'User-Agent': 'Mozilla/5.0 Test Browser'
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'validPassword123'
        })
      };

      const mockUser = createMockUser();
      validateUser.mockResolvedValue(mockUser);
      jwt.sign.mockReturnValue('mock-jwt-token');

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      await handler(event, mockContext);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/LOGIN_SUCCESS/),
        expect.objectContaining({
          userId: mockUser.id,
          email: mockUser.email,
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0 Test Browser'
        })
      );

      consoleSpy.mockRestore();
    });

    it('should log failed authentication attempts', async () => {
      // Arrange
      const event = {
        httpMethod: 'POST',
        path: '/auth/login',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '192.168.1.1'
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrongPassword'
        })
      };

      validateUser.mockResolvedValue(null);

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      await handler(event, mockContext);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/LOGIN_FAILED/),
        expect.objectContaining({
          email: 'test@example.com',
          ip: '192.168.1.1',
          reason: 'Invalid credentials'
        })
      );

      consoleSpy.mockRestore();
    });
  });
});
