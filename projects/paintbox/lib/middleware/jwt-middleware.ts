/**
 * JWT Middleware for Next.js API Routes
 * Integrates @candlefish/jwt-auth package with API route protection
 */

import { NextRequest, NextResponse } from 'next/server';
import { CandlefishAuth, TokenPayload, AuthMiddleware } from '@candlefish/jwt-auth';

interface JWTMiddlewareConfig {
  authServiceUrl?: string;
  jwksUrl?: string;
  issuer?: string;
  audience?: string;
  secretId?: string;
  required?: boolean;
  roles?: string[];
  permissions?: string[];
}

interface AuthenticatedRequest extends NextRequest {
  user?: TokenPayload;
  isAuthenticated: boolean;
}

export class NextJWTMiddleware {
  private jwtAuth: CandlefishAuth;
  private config: JWTMiddlewareConfig;

  constructor(config: JWTMiddlewareConfig = {}) {
    this.config = {
      required: true,
      ...config,
    };

    // Initialize JWT auth with JWKS or AWS secrets
    if (config.secretId) {
      // Server-side with AWS secrets for signing
      this.jwtAuth = new CandlefishAuth({
        secretId: config.secretId,
        issuer: config.issuer || process.env.JWT_ISSUER || 'candlefish-auth',
        audience: config.audience || process.env.JWT_AUDIENCE || 'candlefish-api',
        region: process.env.AWS_REGION || 'us-east-1',
        cacheTimeout: 600,
      });
    } else {
      // Client-side or verification only with JWKS
      const jwksUrl = config.jwksUrl || 
        `${config.authServiceUrl || process.env.AUTH_SERVICE_URL || 'http://localhost:3001'}/.well-known/jwks.json`;
      
      this.jwtAuth = new CandlefishAuth({
        jwksUrl,
        issuer: config.issuer || process.env.JWT_ISSUER || 'candlefish-auth',
        audience: config.audience || process.env.JWT_AUDIENCE || 'candlefish-api',
        cacheTimeout: 600,
      });
    }
  }

  /**
   * Create middleware function for API routes
   */
  public middleware() {
    return async (request: NextRequest): Promise<NextResponse | void> => {
      try {
        // Extract token from Authorization header
        const authHeader = request.headers.get('authorization');
        const token = this.jwtAuth.extractToken(authHeader);

        // Handle missing token
        if (!token) {
          if (this.config.required) {
            return NextResponse.json(
              { 
                success: false, 
                error: { 
                  code: 'MISSING_TOKEN', 
                  message: 'Authorization token is required' 
                } 
              },
              { status: 401 }
            );
          }
          // Add user info to headers for optional auth
          const response = NextResponse.next();
          response.headers.set('x-authenticated', 'false');
          return response;
        }

        // Verify token
        let tokenPayload: TokenPayload;
        try {
          tokenPayload = await this.jwtAuth.verifyToken(token);
        } catch (error) {
          if (this.config.required) {
            return NextResponse.json(
              { 
                success: false, 
                error: { 
                  code: 'INVALID_TOKEN', 
                  message: 'Invalid or expired token' 
                } 
              },
              { status: 401 }
            );
          }
          // For optional auth, continue without user
          const response = NextResponse.next();
          response.headers.set('x-authenticated', 'false');
          return response;
        }

        // Check role requirements
        if (this.config.roles && this.config.roles.length > 0) {
          const userRole = tokenPayload.role;
          if (!userRole || !this.config.roles.includes(userRole)) {
            return NextResponse.json(
              { 
                success: false, 
                error: { 
                  code: 'INSUFFICIENT_ROLE', 
                  message: `Required role: ${this.config.roles.join(' or ')}` 
                } 
              },
              { status: 403 }
            );
          }
        }

        // Check permission requirements
        if (this.config.permissions && this.config.permissions.length > 0) {
          const userPermissions = tokenPayload.permissions || [];
          const hasPermissions = this.config.permissions.every(permission =>
            userPermissions.includes(permission)
          );

          if (!hasPermissions) {
            return NextResponse.json(
              { 
                success: false, 
                error: { 
                  code: 'INSUFFICIENT_PERMISSIONS', 
                  message: `Required permissions: ${this.config.permissions.join(', ')}` 
                } 
              },
              { status: 403 }
            );
          }
        }

        // Add user info to request headers for downstream handlers
        const response = NextResponse.next();
        response.headers.set('x-authenticated', 'true');
        response.headers.set('x-user-id', tokenPayload.sub);
        response.headers.set('x-user-email', tokenPayload.email || '');
        response.headers.set('x-user-role', tokenPayload.role || '');
        if (tokenPayload.organizationId) {
          response.headers.set('x-organization-id', tokenPayload.organizationId);
        }
        if (tokenPayload.permissions) {
          response.headers.set('x-user-permissions', tokenPayload.permissions.join(','));
        }

        return response;
      } catch (error) {
        console.error('JWT middleware error:', error);
        return NextResponse.json(
          { 
            success: false, 
            error: { 
              code: 'MIDDLEWARE_ERROR', 
              message: 'Authentication middleware error' 
            } 
          },
          { status: 500 }
        );
      }
    };
  }

  /**
   * Create a handler wrapper for API routes
   */
  public withAuth<T extends any[]>(
    handler: (request: NextRequest, ...args: T) => Promise<NextResponse>,
    config?: Partial<JWTMiddlewareConfig>
  ) {
    const middlewareConfig = { ...this.config, ...config };
    const middleware = new NextJWTMiddleware(middlewareConfig);

    return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
      const middlewareResult = await middleware.middleware()(request);
      
      if (middlewareResult instanceof NextResponse && middlewareResult.status >= 400) {
        return middlewareResult;
      }

      // Extract user info from headers for the handler
      const authHeader = request.headers.get('authorization');
      const token = this.jwtAuth.extractToken(authHeader);
      
      if (token) {
        try {
          const tokenPayload = await this.jwtAuth.verifyToken(token);
          // Add user to request context (for TypeScript, we'd need to extend the Request type)
          (request as any).user = tokenPayload;
          (request as any).isAuthenticated = true;
        } catch (error) {
          (request as any).isAuthenticated = false;
        }
      } else {
        (request as any).isAuthenticated = false;
      }

      return handler(request, ...args);
    };
  }
}

// Convenience functions for common middleware configurations

/**
 * Require authentication for API route
 */
export function requireAuth(config?: Partial<JWTMiddlewareConfig>) {
  const middleware = new NextJWTMiddleware({ required: true, ...config });
  return middleware.withAuth.bind(middleware);
}

/**
 * Optional authentication for API route
 */
export function optionalAuth(config?: Partial<JWTMiddlewareConfig>) {
  const middleware = new NextJWTMiddleware({ required: false, ...config });
  return middleware.withAuth.bind(middleware);
}

/**
 * Require specific role for API route
 */
export function requireRole(roles: string | string[], config?: Partial<JWTMiddlewareConfig>) {
  const roleArray = Array.isArray(roles) ? roles : [roles];
  const middleware = new NextJWTMiddleware({ required: true, roles: roleArray, ...config });
  return middleware.withAuth.bind(middleware);
}

/**
 * Require specific permissions for API route
 */
export function requirePermissions(permissions: string | string[], config?: Partial<JWTMiddlewareConfig>) {
  const permArray = Array.isArray(permissions) ? permissions : [permissions];
  const middleware = new NextJWTMiddleware({ required: true, permissions: permArray, ...config });
  return middleware.withAuth.bind(middleware);
}

// Example usage helper for extracting user from request
export function getUserFromRequest(request: NextRequest): TokenPayload | null {
  return (request as any).user || null;
}

export function isAuthenticated(request: NextRequest): boolean {
  return (request as any).isAuthenticated || false;
}

// Export types for use in other files
export type { AuthenticatedRequest, JWTMiddlewareConfig, TokenPayload };