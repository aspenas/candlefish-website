import { Response, NextFunction } from 'express';
import { body } from 'express-validator';
import {
  AuthenticatedRequest,
  LoginRequest,
  RegisterRequest,
  RefreshTokenRequest,
  ApiResponse
} from '../types';
import { AuthService } from '../services/auth.service';
import { logger } from '../utils/logger';

const authService = new AuthService();
const moduleLogger = logger.child({ module: 'AuthController' });

/**
 * Validation rules for registration
 */
export const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?])/)
    .withMessage('Password must contain at least one uppercase letter, lowercase letter, number, and special character'),
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name is required and must be less than 100 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name is required and must be less than 100 characters'),
  body('organizationName')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Organization name must be less than 255 characters'),
  body('organizationSlug')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Organization slug must contain only lowercase letters, numbers, and hyphens'),
];

/**
 * Validation rules for login
 */
export const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  body('rememberMe')
    .optional()
    .isBoolean()
    .withMessage('Remember me must be a boolean'),
];

/**
 * Validation rules for refresh token
 */
export const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required'),
];

/**
 * Register a new user
 */
export const register = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const registerData: RegisterRequest = req.body;
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');

    const result = await authService.register(registerData, ipAddress, userAgent);

    const response: ApiResponse<{
      user: typeof result.user;
      tokens: typeof result.tokens;
    }> = {
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
        version: 'v1',
      },
    };

    moduleLogger.info('User registered successfully', {
      userId: result.user.id,
      email: result.user.email,
      organizationId: result.user.organizationId,
    });

    res.status(201).json(response);
  } catch (error) {
    moduleLogger.error('Registration failed:', error);
    next(error);
  }
};

/**
 * Login user
 */
export const login = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const loginData: LoginRequest = req.body;
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');

    const result = await authService.login(loginData, ipAddress, userAgent);

    const response: ApiResponse<{
      user: typeof result.user;
      tokens: typeof result.tokens;
    }> = {
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
        version: 'v1',
      },
    };

    moduleLogger.info('User logged in successfully', {
      userId: result.user.id,
      email: result.user.email,
    });

    res.status(200).json(response);
  } catch (error) {
    moduleLogger.error('Login failed:', error);
    next(error);
  }
};

/**
 * Refresh access token
 */
export const refreshToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken }: RefreshTokenRequest = req.body;

    const tokens = await authService.refreshToken(refreshToken);

    const response: ApiResponse<typeof tokens> = {
      success: true,
      data: tokens,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
        version: 'v1',
      },
    };

    res.status(200).json(response);
  } catch (error) {
    moduleLogger.error('Token refresh failed:', error);
    next(error);
  }
};

/**
 * Logout user
 */
export const logout = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken }: RefreshTokenRequest = req.body;

    await authService.logout(refreshToken);

    const response: ApiResponse<null> = {
      success: true,
      data: null,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
        version: 'v1',
      },
    };

    moduleLogger.info('User logged out successfully');

    res.status(200).json(response);
  } catch (error) {
    moduleLogger.error('Logout failed:', error);
    next(error);
  }
};

/**
 * Get current user profile
 */
export const getProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string,
          version: 'v1',
        },
      };

      res.status(401).json(response);
      return;
    }

    const response: ApiResponse<typeof req.user> = {
      success: true,
      data: req.user,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
        version: 'v1',
      },
    };

    res.status(200).json(response);
  } catch (error) {
    moduleLogger.error('Get profile failed:', error);
    next(error);
  }
};

/**
 * Verify token endpoint (for service-to-service communication)
 */
export const verifyToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authorization token is required',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string,
          version: 'v1',
        },
      };

      res.status(400).json(response);
      return;
    }

    const user = await authService.verifyAccessToken(token);

    const response: ApiResponse<{
      valid: boolean;
      user: typeof user;
    }> = {
      success: true,
      data: {
        valid: true,
        user,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
        version: 'v1',
      },
    };

    res.status(200).json(response);
  } catch (error) {
    const response: ApiResponse<{
      valid: boolean;
      error: string;
    }> = {
      success: true,
      data: {
        valid: false,
        error: error instanceof Error ? error.message : 'Token verification failed',
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
        version: 'v1',
      },
    };

    res.status(200).json(response);
  }
};
