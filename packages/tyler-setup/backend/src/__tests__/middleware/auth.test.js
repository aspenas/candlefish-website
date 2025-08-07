import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';
import { 
  authMiddleware, 
  optionalAuth, 
  requireRole, 
  requireAnyRole, 
  generateToken, 
  verifyToken 
} from '../../middleware/auth.js';
import { UnauthorizedError } from '../../middleware/errorHandler.js';

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('../../utils/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn()
  }
}));

describe('Authentication Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {},
      query: {},
      user: null
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
    
    // Reset JWT mocks
    jwt.verify.mockReset();
    jwt.sign.mockReset();
  });

  describe('authMiddleware', () => {
    const mockUser = {
      id: '123',
      username: 'testuser',
      email: 'test@example.com',
      role: 'user'
    };

    it('should authenticate valid Bearer token', () => {
      req.headers.authorization = 'Bearer valid-token';
      jwt.verify.mockReturnValue(mockUser);

      authMiddleware(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith('valid-token', process.env.JWT_SECRET);
      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalledWith();
    });

    it('should authenticate valid x-api-key header', () => {
      req.headers['x-api-key'] = 'api-key-token';
      jwt.verify.mockReturnValue(mockUser);

      authMiddleware(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith('api-key-token', process.env.JWT_SECRET);
      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalledWith();
    });

    it('should authenticate token from query parameter', () => {
      req.query.token = 'query-token';
      jwt.verify.mockReturnValue(mockUser);

      authMiddleware(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith('query-token', process.env.JWT_SECRET);
      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalledWith();
    });

    it('should throw UnauthorizedError when no token provided', () => {
      expect(() => authMiddleware(req, res, next)).toThrow(UnauthorizedError);
      expect(next).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedError for invalid token', () => {
      req.headers.authorization = 'Bearer invalid-token';
      jwt.verify.mockImplementation(() => {
        const error = new Error('Invalid token');
        error.name = 'JsonWebTokenError';
        throw error;
      });

      expect(() => authMiddleware(req, res, next)).toThrow(UnauthorizedError);
      expect(next).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedError for expired token', () => {
      req.headers.authorization = 'Bearer expired-token';
      jwt.verify.mockImplementation(() => {
        const error = new Error('Token expired');
        error.name = 'TokenExpiredError';
        throw error;
      });

      expect(() => authMiddleware(req, res, next)).toThrow(UnauthorizedError);
      expect(next).not.toHaveBeenCalled();
    });

    it('should prioritize Authorization header over other methods', () => {
      req.headers.authorization = 'Bearer bearer-token';
      req.headers['x-api-key'] = 'api-key-token';
      req.query.token = 'query-token';
      jwt.verify.mockReturnValue(mockUser);

      authMiddleware(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith('bearer-token', process.env.JWT_SECRET);
    });
  });

  describe('optionalAuth', () => {
    const mockUser = { id: '123', username: 'testuser' };

    it('should set user when valid token provided', () => {
      req.headers.authorization = 'Bearer valid-token';
      jwt.verify.mockReturnValue(mockUser);

      optionalAuth(req, res, next);

      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalledWith();
    });

    it('should continue without user when no token provided', () => {
      optionalAuth(req, res, next);

      expect(req.user).toBeNull();
      expect(next).toHaveBeenCalledWith();
    });

    it('should continue without user when invalid token provided', () => {
      req.headers.authorization = 'Bearer invalid-token';
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      optionalAuth(req, res, next);

      expect(req.user).toBeNull();
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('requireRole', () => {
    it('should allow access for user with correct role', () => {
      req.user = { id: '123', role: 'admin' };
      const middleware = requireRole('admin');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should allow access for admin user regardless of required role', () => {
      req.user = { id: '123', role: 'admin' };
      const middleware = requireRole('user');

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should deny access for user with incorrect role', () => {
      req.user = { id: '123', role: 'user' };
      const middleware = requireRole('admin');

      expect(() => middleware(req, res, next)).toThrow(UnauthorizedError);
      expect(next).not.toHaveBeenCalled();
    });

    it('should deny access when no user authenticated', () => {
      const middleware = requireRole('user');

      expect(() => middleware(req, res, next)).toThrow(UnauthorizedError);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireAnyRole', () => {
    it('should allow access for user with any of the required roles', () => {
      req.user = { id: '123', role: 'manager' };
      const middleware = requireAnyRole(['admin', 'manager', 'supervisor']);

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should allow access for admin user regardless of required roles', () => {
      req.user = { id: '123', role: 'admin' };
      const middleware = requireAnyRole(['manager', 'supervisor']);

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should deny access for user without any required role', () => {
      req.user = { id: '123', role: 'user' };
      const middleware = requireAnyRole(['admin', 'manager']);

      expect(() => middleware(req, res, next)).toThrow(UnauthorizedError);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('generateToken', () => {
    const mockUser = {
      id: '123',
      username: 'testuser',
      email: 'test@example.com',
      role: 'user'
    };

    it('should generate JWT token with user data', () => {
      const expectedToken = 'generated-jwt-token';
      jwt.sign.mockReturnValue(expectedToken);

      const result = generateToken(mockUser);

      expect(jwt.sign).toHaveBeenCalledWith(
        {
          id: mockUser.id,
          username: mockUser.username,
          email: mockUser.email,
          role: mockUser.role
        },
        process.env.JWT_SECRET,
        {
          expiresIn: process.env.JWT_EXPIRES_IN || '24h'
        }
      );
      expect(result).toBe(expectedToken);
    });
  });

  describe('verifyToken', () => {
    const mockUser = { id: '123', username: 'testuser' };

    it('should verify and return decoded token', () => {
      jwt.verify.mockReturnValue(mockUser);

      const result = verifyToken('valid-token');

      expect(jwt.verify).toHaveBeenCalledWith('valid-token', process.env.JWT_SECRET);
      expect(result).toEqual(mockUser);
    });

    it('should throw error for invalid token', () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      expect(() => verifyToken('invalid-token')).toThrow('Invalid token');
    });
  });

  describe('Security Tests', () => {
    it('should not accept empty Bearer token', () => {
      req.headers.authorization = 'Bearer ';

      expect(() => authMiddleware(req, res, next)).toThrow(UnauthorizedError);
    });

    it('should not accept malformed Authorization header', () => {
      req.headers.authorization = 'InvalidBearer token';

      expect(() => authMiddleware(req, res, next)).toThrow(UnauthorizedError);
    });

    it('should handle extremely long tokens gracefully', () => {
      const longToken = 'a'.repeat(10000);
      req.headers.authorization = `Bearer ${longToken}`;
      jwt.verify.mockImplementation(() => {
        throw new Error('Token too long');
      });

      expect(() => authMiddleware(req, res, next)).toThrow();
    });

    it('should not leak token in error messages', () => {
      req.headers.authorization = 'Bearer secret-token';
      jwt.verify.mockImplementation(() => {
        const error = new Error('Invalid token');
        error.name = 'JsonWebTokenError';
        throw error;
      });

      try {
        authMiddleware(req, res, next);
      } catch (error) {
        expect(error.message).not.toContain('secret-token');
      }
    });
  });
});