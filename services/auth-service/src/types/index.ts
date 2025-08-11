import { Request } from 'express';
import { User, Organization, UserRole } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  organization?: Organization;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  organizationId: string;
  permissions: string[];
  isActive: boolean;
}

export interface JWTPayload {
  sub: string; // User ID
  email: string;
  role: UserRole;
  organizationId: string;
  permissions: string[];
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export interface RefreshTokenPayload {
  sub: string; // User ID
  tokenId: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName?: string;
  organizationSlug?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
    version: string;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SessionData {
  userId: string;
  organizationId: string;
  loginAt: string;
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

export interface AuditLogData {
  action: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export type UserWithOrganization = User & {
  organization: Organization;
};

export type CreateUserData = Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'lastLoginAt'>;
export type UpdateUserData = Partial<Pick<User, 'firstName' | 'lastName' | 'avatar' | 'isActive'>>;

export type CreateOrganizationData = Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateOrganizationData = Partial<Pick<Organization, 'name' | 'description' | 'settings'>>;

// Environment configuration type
export interface Config {
  database: {
    url: string;
  };
  redis: {
    url: string;
    keyPrefix: string;
  };
  jwt: {
    secret: string;
    accessTokenExpiry: string;
    refreshTokenExpiry: string;
    issuer: string;
    audience: string;
  };
  server: {
    port: number;
    host: string;
    apiVersion: string;
  };
  security: {
    bcryptRounds: number;
    maxLoginAttempts: number;
    accountLockTime: string;
    sessionSecret: string;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  email: {
    smtp: {
      host: string;
      port: number;
      user: string;
      pass: string;
    };
    from: string;
  };
  logging: {
    level: string;
    enableRequestLogging: boolean;
  };
}
