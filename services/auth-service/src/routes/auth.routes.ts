import { Router } from 'express';
import {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  verifyToken,
  registerValidation,
  loginValidation,
  refreshTokenValidation,
} from '../controllers/auth.controller';
import { validate } from '../middleware/validation.middleware';
import { authenticateToken } from '../middleware/auth.middleware';
import {
  authRateLimit,
  registrationRateLimit,
  apiRateLimit
} from '../middleware/rate-limit.middleware';
import {
  validateContentType,
  sanitizeInput,
  trimStrings,
  normalizeEmail,
} from '../middleware/validation.middleware';

const router = Router();

// Content type validation for all routes
router.use(validateContentType(['application/json']));

// Common middleware
router.use(trimStrings);
router.use(normalizeEmail);

/**
 * @route   POST /auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register',
  registrationRateLimit,
  sanitizeInput([
    'email',
    'password',
    'firstName',
    'lastName',
    'organizationName',
    'organizationSlug',
  ]),
  validate(registerValidation),
  register
);

/**
 * @route   POST /auth/login
 * @desc    Authenticate user and get tokens
 * @access  Public
 */
router.post(
  '/login',
  authRateLimit,
  sanitizeInput(['email', 'password', 'rememberMe']),
  validate(loginValidation),
  login
);

/**
 * @route   POST /auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post(
  '/refresh',
  apiRateLimit,
  sanitizeInput(['refreshToken']),
  validate(refreshTokenValidation),
  refreshToken
);

/**
 * @route   POST /auth/logout
 * @desc    Logout user and revoke refresh token
 * @access  Public
 */
router.post(
  '/logout',
  apiRateLimit,
  sanitizeInput(['refreshToken']),
  validate(refreshTokenValidation),
  logout
);

/**
 * @route   GET /auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get(
  '/profile',
  apiRateLimit,
  authenticateToken,
  getProfile
);

/**
 * @route   POST /auth/verify
 * @desc    Verify access token (for service-to-service communication)
 * @access  Public (but requires token in header)
 */
router.post(
  '/verify',
  apiRateLimit,
  verifyToken
);

export default router;
