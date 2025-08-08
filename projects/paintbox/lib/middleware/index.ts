/**
 * Paintbox Security Middleware Suite
 * Comprehensive security middleware components for Next.js App Router
 */

// Authentication middleware
export {
  authMiddleware,
  createAuthMiddleware,
  adminAuthMiddleware,
  userAuthMiddleware,
  readOnlyAuthMiddleware,
  AuthService,
  getAuthService,
  type AuthenticatedUser,
  type AuthConfig,
} from './auth';

// Rate limiting middleware
export {
  rateLimitMiddleware,
  createRateLimitMiddleware,
  apiRateLimiter,
  authRateLimiter,
  sensitiveActionRateLimiter,
  publicApiRateLimiter,
  adminActionRateLimiter,
  RateLimiter,
  keyGenerators,
  type RateLimitConfig,
  type RateLimitInfo,
  type RateLimitResult,
} from './rate-limit';

// Input validation middleware
export {
  validationMiddleware,
  createValidationMiddleware,
  validateEstimateData,
  validateUserRegistration,
  validateUserLogin,
  validateCompanyCamData,
  validateSalesforceAccount,
  validateSalesforceOpportunity,
  validateApiKeyData,
  validateQueryParams,
  validateSensitiveData,
  commonSchemas,
  paintboxSchemas,
  sanitizeString,
  sanitizeObject,
  formatValidationErrors,
  type ValidationConfig,
} from './validation';

// Utility types for middleware chaining
import { NextRequest, NextResponse } from 'next/server';

export type MiddlewareFunction = (
  request: NextRequest
) => Promise<NextResponse | null | { user?: any; data?: any }>;

export type MiddlewareResult = NextResponse | null | { user?: any; data?: any };

/**
 * Compose multiple middleware functions into a single middleware chain
 * Returns the first non-null response or continues to the next middleware
 */
export function composeMiddleware(...middlewares: MiddlewareFunction[]) {
  return async (request: NextRequest): Promise<NextResponse | { [key: string]: any }> => {
    const context: { [key: string]: any } = {};

    for (const middleware of middlewares) {
      const result = await middleware(request);

      // If middleware returns a NextResponse, return it immediately (error/redirect)
      if (result instanceof NextResponse) {
        return result;
      }

      // If middleware returns data, merge it into context
      if (result && typeof result === 'object') {
        Object.assign(context, result);
      }
    }

    return context;
  };
}

/**
 * Create a middleware chain with common security practices
 */
export function createSecureApiMiddleware(options: {
  auth?: boolean;
  rateLimit?: boolean;
  validation?: any; // Zod schema
  adminOnly?: boolean;
  sensitiveAction?: boolean;
} = {}) {
  const middlewares: MiddlewareFunction[] = [];

  // Rate limiting (applied first)
  if (options.rateLimit) {
    if (options.sensitiveAction) {
      middlewares.push(sensitiveActionRateLimiter);
    } else if (options.adminOnly) {
      middlewares.push(adminActionRateLimiter);
    } else {
      middlewares.push(apiRateLimiter);
    }
  }

  // Authentication
  if (options.auth) {
    if (options.adminOnly) {
      middlewares.push(adminAuthMiddleware);
    } else {
      middlewares.push(userAuthMiddleware);
    }
  }

  // Input validation
  if (options.validation) {
    const validateMiddleware = createValidationMiddleware(
      options.validation,
      options.sensitiveAction ? {
        sanitizeStrings: true,
        allowExtraFields: false,
        maxPayloadSize: 50 * 1024 // 50KB for sensitive operations
      } : undefined
    );
    middlewares.push(validateMiddleware);
  }

  return composeMiddleware(...middlewares);
}

/**
 * Pre-configured middleware combinations for common use cases
 */

// Public API endpoints (rate limited, validated, no auth)
export const publicApiMiddleware = (validationSchema?: any) =>
  createSecureApiMiddleware({
    auth: false,
    rateLimit: true,
    validation: validationSchema,
  });

// Protected API endpoints (auth required, rate limited, validated)
export const protectedApiMiddleware = (validationSchema?: any) =>
  createSecureApiMiddleware({
    auth: true,
    rateLimit: true,
    validation: validationSchema,
  });

// Admin-only endpoints (admin auth, strict rate limiting, validation)
export const adminApiMiddleware = (validationSchema?: any) =>
  createSecureApiMiddleware({
    auth: true,
    rateLimit: true,
    validation: validationSchema,
    adminOnly: true,
  });

// Sensitive operations (admin auth, very strict rate limiting, strict validation)
export const sensitiveApiMiddleware = (validationSchema?: any) =>
  createSecureApiMiddleware({
    auth: true,
    rateLimit: true,
    validation: validationSchema,
    adminOnly: true,
    sensitiveAction: true,
  });

/**
 * Helper to apply middleware to Next.js API route handlers
 */
export function withMiddleware<T = any>(
  middleware: (request: NextRequest) => Promise<NextResponse | T>,
  handler: (request: NextRequest, context: T) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const result = await middleware(request);

      // If middleware returns a response (error/redirect), return it
      if (result instanceof NextResponse) {
        return result;
      }

      // Continue to handler with context
      return await handler(request, result as T);
    } catch (error) {
      console.error('Middleware error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Example usage patterns
 */
export const examples = {
  // Basic protected endpoint
  basicProtected: `
import { withMiddleware, protectedApiMiddleware } from '@/lib/middleware';

export const POST = withMiddleware(
  protectedApiMiddleware(),
  async (request, { user }) => {
    // Handler logic with authenticated user
    return NextResponse.json({ message: 'Success', userId: user.sub });
  }
);`,

  // Admin endpoint with validation
  adminWithValidation: `
import { withMiddleware, adminApiMiddleware, paintboxSchemas } from '@/lib/middleware';

export const POST = withMiddleware(
  adminApiMiddleware(paintboxSchemas.userRegistration),
  async (request, { user, data }) => {
    // Handler logic with admin user and validated data
    return NextResponse.json({ message: 'User created', data });
  }
);`,

  // Public endpoint with rate limiting
  publicRateLimited: `
import { withMiddleware, publicApiMiddleware, commonSchemas } from '@/lib/middleware';

export const GET = withMiddleware(
  publicApiMiddleware(z.object({ query: commonSchemas.sanitizedString })),
  async (request, { data }) => {
    // Handler logic with validated query data
    return NextResponse.json({ results: [] });
  }
);`,

  // Sensitive operation
  sensitiveOperation: `
import { withMiddleware, sensitiveApiMiddleware, paintboxSchemas } from '@/lib/middleware';

export const DELETE = withMiddleware(
  sensitiveApiMiddleware(z.object({ userId: commonSchemas.uuid })),
  async (request, { user, data }) => {
    // Handler logic for sensitive admin operation
    return NextResponse.json({ message: 'User deleted' });
  }
);`,
};

// Version and metadata
export const version = '1.0.0';
export const description = 'Comprehensive security middleware suite for Paintbox application';
export const features = [
  'JWT Authentication with RS256 signing',
  'Redis-backed rate limiting with multiple algorithms',
  'Comprehensive input validation with Zod',
  'XSS and injection protection',
  'Session management and concurrent session limits',
  'Audit logging and security monitoring',
  'Next.js App Router compatibility',
  'TypeScript support with full type safety',
];
