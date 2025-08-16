import { User, Organization, UserRole, RefreshToken } from '@prisma/client';
import { CandlefishAuth, TokenPayload, TokenPair as JWTTokenPair } from '@candlefish/jwt-auth';
import { prisma } from '../config/database';
import { redisService } from '../config/redis';
import {
  LoginRequest,
  RegisterRequest,
  TokenPair,
  AuthenticatedUser,
  SessionData,
  AuditLogData
} from '../types';
import { PasswordUtils, CryptoUtils } from '../utils/crypto';
import { config, parseDuration } from '../config';
import { logger } from '../utils/logger';

export class AuthService {
  private moduleLogger = logger.child({ module: 'AuthService' });
  private jwtAuth: CandlefishAuth;

  constructor() {
    this.jwtAuth = new CandlefishAuth({
      secretId: config.aws.secretId,
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
      region: config.aws.region,
      expiresIn: config.jwt.accessTokenExpiry,
      refreshExpiresIn: config.jwt.refreshTokenExpiry,
      cacheTimeout: 600 // 10 minutes
    });
  }

  /**
   * Register a new user with organization
   */
  async register(registerData: RegisterRequest, ipAddress?: string, userAgent?: string): Promise<{
    user: AuthenticatedUser;
    tokens: TokenPair;
  }> {
    const { email, password, firstName, lastName, organizationName, organizationSlug } = registerData;

    // Validate password strength
    const passwordValidation = PasswordUtils.validateStrength(password);
    if (!passwordValidation.isValid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // Hash password
    const hashedPassword = await PasswordUtils.hash(password);

    // Create organization if provided, otherwise use default
    let organization: Organization;

    if (organizationName && organizationSlug) {
      // Check if organization slug is available
      const existingOrg = await prisma.organization.findUnique({
        where: { slug: organizationSlug.toLowerCase() },
      });

      if (existingOrg) {
        throw new Error('Organization slug is already taken');
      }

      organization = await prisma.organization.create({
        data: {
          name: organizationName,
          slug: organizationSlug.toLowerCase(),
          description: `${organizationName} organization`,
        },
      });
    } else {
      // Create personal organization
      const personalSlug = `${firstName.toLowerCase()}-${lastName.toLowerCase()}-${CryptoUtils.generateSecureToken(8)}`;
      organization = await prisma.organization.create({
        data: {
          name: `${firstName} ${lastName}'s Organization`,
          slug: personalSlug,
          description: 'Personal organization',
        },
      });
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName,
        lastName,
        organizationId: organization.id,
        role: UserRole.OWNER, // First user in organization is owner
        isActive: true,
        isEmailVerified: false,
      },
      include: {
        organization: true,
      },
    });

    // Generate tokens
    const tokens = await this.generateTokenPair(user);

    // Create session
    await this.createSession(user.id, tokens.refreshToken, {
      ipAddress,
      userAgent,
    });

    // Log audit event
    await this.logAuditEvent({
      userId: user.id,
      organizationId: user.organizationId,
      action: 'USER_REGISTERED',
      details: { email: user.email },
      ipAddress,
      userAgent,
    });

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      sub: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      organizationId: user.organizationId,
      permissions: Array.isArray(user.permissions) ? user.permissions as string[] : [],
      isActive: user.isActive,
    };

    this.moduleLogger.info('User registered successfully', {
      userId: user.id,
      email: user.email,
      organizationId: user.organizationId,
    });

    return { user: authenticatedUser, tokens };
  }

  /**
   * Authenticate user login
   */
  async login(loginData: LoginRequest, ipAddress?: string, userAgent?: string): Promise<{
    user: AuthenticatedUser;
    tokens: TokenPair;
  }> {
    const { email, password, rememberMe } = loginData;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        organization: true,
      },
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingTime = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new Error(`Account is locked. Try again in ${remainingTime} minutes`);
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await PasswordUtils.verify(password, user.password);

    if (!isPasswordValid) {
      // Increment failed login attempts
      const failedAttempts = user.failedLoginAttempts + 1;
      const updateData: any = {
        failedLoginAttempts: failedAttempts,
      };

      // Lock account if max attempts reached
      if (failedAttempts >= config.security.maxLoginAttempts) {
        const lockDuration = parseDuration(config.security.accountLockTime);
        updateData.lockedUntil = new Date(Date.now() + lockDuration);
        this.moduleLogger.warn('Account locked due to too many failed attempts', {
          userId: user.id,
          email: user.email,
          attempts: failedAttempts,
        });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      throw new Error('Invalid email or password');
    }

    // Reset failed login attempts on successful login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    // Generate tokens (extend refresh token if remember me)
    const tokens = await this.generateTokenPair(user, rememberMe);

    // Create session
    await this.createSession(user.id, tokens.refreshToken, {
      ipAddress,
      userAgent,
    });

    // Log audit event
    await this.logAuditEvent({
      userId: user.id,
      organizationId: user.organizationId,
      action: 'USER_LOGIN',
      details: { rememberMe: !!rememberMe },
      ipAddress,
      userAgent,
    });

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      sub: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      organizationId: user.organizationId,
      permissions: Array.isArray(user.permissions) ? user.permissions as string[] : [],
      isActive: user.isActive,
    };

    this.moduleLogger.info('User logged in successfully', {
      userId: user.id,
      email: user.email,
    });

    return { user: authenticatedUser, tokens };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshTokenString: string): Promise<TokenPair> {
    try {
      // Use the shared jwt-auth package for refresh
      const jwtTokens = await this.jwtAuth.refreshToken(refreshTokenString);

      // Find refresh token in database to validate
      const refreshToken = await prisma.refreshToken.findUnique({
        where: { token: refreshTokenString },
        include: {
          user: {
            include: {
              organization: true,
            },
          },
        },
      });

      if (!refreshToken || refreshToken.revoked || refreshToken.expiresAt < new Date()) {
        throw new Error('Invalid or expired refresh token');
      }

      // Check if user is still active
      if (!refreshToken.user.isActive) {
        throw new Error('User account is deactivated');
      }

      // Store new refresh token in database
      const tokenId = CryptoUtils.generateSecureToken();
      const expiresAt = new Date(Date.now() + (jwtTokens.expiresIn * 1000));

      await prisma.refreshToken.create({
        data: {
          id: tokenId,
          token: jwtTokens.refreshToken,
          userId: refreshToken.user.id,
          expiresAt,
        },
      });

      // Revoke old refresh token
      await prisma.refreshToken.update({
        where: { id: refreshToken.id },
        data: {
          revoked: true,
          revokedAt: new Date(),
        },
      });

      this.moduleLogger.info('Token refreshed successfully', {
        userId: refreshToken.user.id,
      });

      return {
        accessToken: jwtTokens.accessToken,
        refreshToken: jwtTokens.refreshToken,
        expiresIn: jwtTokens.expiresIn,
        tokenType: jwtTokens.tokenType,
      };
    } catch (error) {
      this.moduleLogger.error('Token refresh failed:', error);
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Logout user by revoking refresh token
   */
  async logout(refreshTokenString: string): Promise<void> {
    try {
      const refreshToken = await prisma.refreshToken.findUnique({
        where: { token: refreshTokenString },
        include: { user: true },
      });

      if (refreshToken) {
        // Revoke refresh token
        await prisma.refreshToken.update({
          where: { id: refreshToken.id },
          data: {
            revoked: true,
            revokedAt: new Date(),
          },
        });

        // Remove session from Redis
        const sessionKey = `session:${refreshToken.user.id}:${refreshToken.deviceId || 'default'}`;
        await redisService.del(sessionKey);

        // Log audit event
        await this.logAuditEvent({
          userId: refreshToken.user.id,
          organizationId: refreshToken.user.organizationId,
          action: 'USER_LOGOUT',
        });

        this.moduleLogger.info('User logged out successfully', {
          userId: refreshToken.user.id,
        });
      }
    } catch (error) {
      this.moduleLogger.error('Logout failed:', error);
      throw new Error('Logout failed');
    }
  }

  /**
   * Generate token pair (access + refresh)
   */
  private async generateTokenPair(user: User & { organization?: Organization }, rememberMe: boolean = false): Promise<TokenPair> {
    const tokenId = CryptoUtils.generateSecureToken();

    // Generate access token using CandlefishAuth
    const tokenPayload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      permissions: Array.isArray(user.permissions) ? user.permissions as string[] : [],
    };

    const accessToken = await this.jwtAuth.signToken(tokenPayload);

    // Generate refresh token using CandlefishAuth
    const refreshTokenString = await this.jwtAuth.generateRefreshToken(user.id);

    // Calculate expiry (extend if remember me)
    const baseExpiry = this.parseExpiry(config.jwt.refreshTokenExpiry);
    const expirySeconds = rememberMe ? baseExpiry * 4 : baseExpiry; // 4x longer if remember me
    const expiresAt = new Date(Date.now() + (expirySeconds * 1000));

    // Store refresh token in database
    await prisma.refreshToken.create({
      data: {
        id: tokenId,
        token: refreshTokenString,
        userId: user.id,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenString,
      expiresIn: this.parseExpiry(config.jwt.accessTokenExpiry),
      tokenType: 'Bearer',
    };
  }

  /**
   * Create session in Redis
   */
  private async createSession(userId: string, refreshToken: string, metadata: {
    ipAddress?: string;
    userAgent?: string;
    deviceId?: string;
  }): Promise<void> {
    const sessionId = CryptoUtils.generateSessionId();
    const sessionData: SessionData = {
      userId,
      organizationId: '', // Will be set by caller
      loginAt: new Date().toISOString(),
      ...metadata,
    };

    const sessionTtl = this.parseExpiry(config.jwt.refreshTokenExpiry);
    await redisService.setSession(sessionId, sessionData, sessionTtl);
  }

  /**
   * Log audit event
   */
  private async logAuditEvent(data: AuditLogData & {
    userId?: string;
    organizationId?: string;
  }): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: data.userId,
          organizationId: data.organizationId,
          action: data.action,
          resourceType: data.resourceType,
          resourceId: data.resourceId,
          details: data.details || {},
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });
    } catch (error) {
      this.moduleLogger.error('Failed to log audit event:', error);
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<AuthenticatedUser | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: true,
      },
    });

    if (!user || !user.isActive) {
      return null;
    }

    return {
      id: user.id,
      sub: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      organizationId: user.organizationId,
      permissions: Array.isArray(user.permissions) ? user.permissions as string[] : [],
      isActive: user.isActive,
    };
  }

  /**
   * Verify access token and return user
   */
  async verifyAccessToken(token: string): Promise<AuthenticatedUser> {
    try {
      const payload = await this.jwtAuth.verifyToken(token);
      const user = await this.getUserById(payload.sub);

      if (!user) {
        throw new Error('User not found or inactive');
      }

      return user;
    } catch (error) {
      this.moduleLogger.error('Token verification failed:', error);
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Parse expiry string to seconds
   */
  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid expiry format: ${expiry}`);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 24 * 60 * 60;
      default: throw new Error(`Unsupported expiry unit: ${unit}`);
    }
  }

  /**
   * Get public keys in JWKS format
   */
  async getPublicKeys(): Promise<{ keys: any[] }> {
    return await this.jwtAuth.getPublicKeys();
  }
}
