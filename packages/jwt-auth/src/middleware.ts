import { Request, Response, NextFunction } from 'express';
import { CandlefishAuth } from './CandlefishAuth';
import { MiddlewareOptions, TokenPayload, JWTConfig } from './types';
import { parseAuthHeader } from './utils';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      token?: string;
    }
  }
}

export class AuthMiddleware {
  private auth: CandlefishAuth;

  constructor(auth: CandlefishAuth) {
    this.auth = auth;
  }

  /**
   * Create Express middleware
   */
  middleware(options: MiddlewareOptions = {}) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const {
        required = true,
        roles = [],
        permissions = [],
        scope = [],
        onError,
        credentialsRequired = true
      } = options;

      try {
        // Extract token from Authorization header
        const token = parseAuthHeader(req.headers.authorization);

        if (!token) {
          if (credentialsRequired) {
            return this.handleError(
              new Error('No token provided'),
              req,
              res,
              next,
              onError
            );
          }
          // No token but not required, continue
          return next();
        }

        // Verify token
        const decoded = await this.auth.verifyToken(token);
        
        // Check roles if specified
        if (roles.length > 0 && decoded.role) {
          if (!roles.includes(decoded.role)) {
            return this.handleError(
              new Error('Insufficient role permissions'),
              req,
              res,
              next,
              onError
            );
          }
        }

        // Check permissions if specified
        if (permissions.length > 0 && decoded.permissions) {
          const hasPermission = permissions.some(perm => 
            decoded.permissions?.includes(perm)
          );
          
          if (!hasPermission) {
            return this.handleError(
              new Error('Insufficient permissions'),
              req,
              res,
              next,
              onError
            );
          }
        }

        // Check scope if specified
        if (scope.length > 0 && decoded.scope) {
          const userScopes = decoded.scope.split(' ');
          const hasScope = scope.some(s => userScopes.includes(s));
          
          if (!hasScope) {
            return this.handleError(
              new Error('Insufficient scope'),
              req,
              res,
              next,
              onError
            );
          }
        }

        // Attach user and token to request
        req.user = decoded;
        req.token = token;
        
        next();
      } catch (error: any) {
        if (!required && error.message.includes('No token')) {
          // Token not required and not provided, continue
          return next();
        }
        
        this.handleError(error, req, res, next, onError);
      }
    };
  }

  /**
   * Create role-based middleware
   */
  requireRole(...roles: string[]) {
    return this.middleware({ roles, required: true });
  }

  /**
   * Create permission-based middleware
   */
  requirePermission(...permissions: string[]) {
    return this.middleware({ permissions, required: true });
  }

  /**
   * Create scope-based middleware
   */
  requireScope(...scope: string[]) {
    return this.middleware({ scope, required: true });
  }

  /**
   * Optional authentication middleware
   */
  optional() {
    return this.middleware({ required: false, credentialsRequired: false });
  }

  /**
   * Handle authentication errors
   */
  private handleError(
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction,
    customHandler?: (error: Error, req: any, res: any, next?: any) => void
  ) {
    if (customHandler) {
      return customHandler(error, req, res, next);
    }

    // Default error handling
    const statusCode = this.getStatusCode(error.message);
    
    res.status(statusCode).json({
      error: true,
      message: error.message,
      code: this.getErrorCode(error.message)
    });
  }

  /**
   * Get HTTP status code based on error message
   */
  private getStatusCode(message: string): number {
    if (message.includes('No token') || message.includes('Invalid token')) {
      return 401;
    }
    if (message.includes('Insufficient') || message.includes('Forbidden')) {
      return 403;
    }
    if (message.includes('expired')) {
      return 401;
    }
    return 401;
  }

  /**
   * Get error code based on error message
   */
  private getErrorCode(message: string): string {
    if (message.includes('No token')) return 'NO_TOKEN';
    if (message.includes('Invalid token')) return 'INVALID_TOKEN';
    if (message.includes('expired')) return 'TOKEN_EXPIRED';
    if (message.includes('role')) return 'INSUFFICIENT_ROLE';
    if (message.includes('permission')) return 'INSUFFICIENT_PERMISSION';
    if (message.includes('scope')) return 'INSUFFICIENT_SCOPE';
    return 'AUTHENTICATION_ERROR';
  }
}

/**
 * Factory function to create middleware
 */
export function createAuthMiddleware(config: JWTConfig): AuthMiddleware {
  const auth = new CandlefishAuth(config);
  return new AuthMiddleware(auth);
}