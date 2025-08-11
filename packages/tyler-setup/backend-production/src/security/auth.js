// Enhanced authentication and authorization service
// Addresses security audit findings for Tyler Setup Platform

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const AWS = require('aws-sdk');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

const secretsManager = new AWS.SecretsManager({ region: process.env.AWS_REGION });
const dynamodb = new AWS.DynamoDB.DocumentClient({ region: process.env.AWS_REGION });
const encryptionService = require('./encryption');

class AuthService {
  constructor() {
    this.jwtSecrets = new Map();
    this.sessionStore = new Map();
    this.failedAttempts = new Map();
    this.blacklistedTokens = new Set();

    // Security configuration
    this.maxFailedAttempts = 5;
    this.lockoutDuration = 15 * 60 * 1000; // 15 minutes
    this.tokenRotationInterval = 24 * 60 * 60 * 1000; // 24 hours
    this.passwordPolicy = {
      minLength: 12,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
    };
  }

  async getJWTSecret() {
    const currentTime = Date.now();
    const cacheKey = 'current';

    // Check cache and rotation
    if (this.jwtSecrets.has(cacheKey)) {
      const cached = this.jwtSecrets.get(cacheKey);
      if (currentTime - cached.timestamp < 5 * 60 * 1000) { // 5 minutes cache
        return cached.secret;
      }
    }

    try {
      const result = await secretsManager.getSecretValue({
        SecretId: 'tyler-setup/auth/jwt-secret'
      }).promise();

      const secretData = JSON.parse(result.SecretString);

      this.jwtSecrets.set(cacheKey, {
        secret: secretData.secret,
        timestamp: currentTime,
        algorithm: secretData.algorithm || 'HS256'
      });

      return secretData.secret;
    } catch (error) {
      console.error('Failed to get JWT secret:', error);
      throw new Error('Authentication service unavailable');
    }
  }

  /**
   * Enhanced password hashing with timing attack protection
   */
  async hashPassword(password) {
    // Validate password strength
    this.validatePasswordStrength(password);

    // Use bcrypt with higher rounds for better security
    const saltRounds = 12;
    const hash = await bcrypt.hash(password, saltRounds);

    // Add timestamp for password age tracking
    const passwordData = {
      hash,
      createdAt: new Date().toISOString(),
      algorithm: 'bcrypt',
      rounds: saltRounds
    };

    return JSON.stringify(passwordData);
  }

  /**
   * Secure password verification with timing attack protection
   */
  async verifyPassword(password, hashedPasswordData, userEmail) {
    // Always perform hashing operation to prevent timing attacks
    const dummyHash = '$2b$12$dummy.hash.to.prevent.timing.attacks.dummy.hash.value';

    try {
      let passwordData;
      try {
        passwordData = JSON.parse(hashedPasswordData);
      } catch {
        // Legacy hash format - still verify but flag for upgrade
        passwordData = { hash: hashedPasswordData, algorithm: 'legacy' };
      }

      // Check account lockout
      if (this.isAccountLocked(userEmail)) {
        await bcrypt.compare(password, dummyHash); // Timing attack protection
        throw new Error('Account temporarily locked due to multiple failed attempts');
      }

      // Verify password
      const isValid = await bcrypt.compare(password, passwordData.hash);

      if (!isValid) {
        await this.recordFailedAttempt(userEmail);
        await bcrypt.compare(password, dummyHash); // Additional timing protection
        return false;
      }

      // Clear failed attempts on successful login
      this.clearFailedAttempts(userEmail);

      // Check if password needs to be rotated
      if (passwordData.createdAt) {
        const passwordAge = Date.now() - new Date(passwordData.createdAt).getTime();
        if (passwordAge > this.passwordPolicy.maxAge) {
          // Flag password as expired (don't fail auth, but require change)
          console.warn(`Password expired for user: ${userEmail}`);
        }
      }

      return true;
    } catch (error) {
      // Always perform dummy operation for timing consistency
      await bcrypt.compare(password, dummyHash);
      throw error;
    }
  }

  /**
   * Validate password strength according to policy
   */
  validatePasswordStrength(password) {
    const policy = this.passwordPolicy;
    const errors = [];

    if (password.length < policy.minLength) {
      errors.push(`Password must be at least ${policy.minLength} characters long`);
    }

    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (policy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (policy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check against common passwords (simplified check)
    const commonPasswords = ['password', '123456', 'password123', 'admin', 'user'];
    if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
      errors.push('Password contains common words or patterns');
    }

    if (errors.length > 0) {
      throw new Error(`Password policy violations: ${errors.join(', ')}`);
    }
  }

  /**
   * Generate secure JWT tokens with enhanced security
   */
  async generateTokens(user, options = {}) {
    const jwtSecret = await this.getJWTSecret();
    const now = Date.now();
    const expiresIn = options.rememberMe ? '30d' : '24h';
    const expirationTime = options.rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60;

    // Generate unique token ID for revocation tracking
    const tokenId = crypto.randomBytes(16).toString('hex');
    const sessionId = crypto.randomBytes(32).toString('hex');

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions || [],
      iat: Math.floor(now / 1000),
      exp: Math.floor((now + expirationTime * 1000) / 1000),
      jti: tokenId,
      sid: sessionId,
      aud: 'tyler-setup-platform',
      iss: 'tyler-setup-auth-service'
    };

    // Sign token with enhanced security
    const token = jwt.sign(payload, jwtSecret, {
      algorithm: 'HS256',
      header: {
        typ: 'JWT',
        alg: 'HS256'
      }
    });

    // Generate refresh token
    const refreshTokenPayload = {
      sub: user.id,
      type: 'refresh',
      jti: crypto.randomBytes(16).toString('hex'),
      sid: sessionId,
      iat: Math.floor(now / 1000),
      exp: Math.floor((now + 30 * 24 * 60 * 60 * 1000) / 1000), // 30 days
      aud: 'tyler-setup-platform',
      iss: 'tyler-setup-auth-service'
    };

    const refreshToken = jwt.sign(refreshTokenPayload, jwtSecret, { algorithm: 'HS256' });

    // Store session information
    await this.storeSession(sessionId, {
      userId: user.id,
      tokenId,
      refreshTokenId: refreshTokenPayload.jti,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(now + expirationTime * 1000).toISOString(),
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      isActive: true
    });

    return {
      accessToken: token,
      refreshToken,
      expiresIn: expirationTime,
      tokenType: 'Bearer',
      sessionId
    };
  }

  /**
   * Verify and validate JWT tokens with enhanced security checks
   */
  async verifyToken(token, options = {}) {
    if (!token) {
      throw new Error('Token is required');
    }

    // Remove Bearer prefix if present
    if (token.startsWith('Bearer ')) {
      token = token.substring(7);
    }

    // Check token blacklist
    if (this.blacklistedTokens.has(token)) {
      throw new Error('Token has been revoked');
    }

    try {
      const jwtSecret = await this.getJWTSecret();

      // Verify token signature and claims
      const decoded = jwt.verify(token, jwtSecret, {
        algorithms: ['HS256'],
        audience: 'tyler-setup-platform',
        issuer: 'tyler-setup-auth-service',
        clockTolerance: 30 // 30 seconds clock skew tolerance
      });

      // Additional security checks
      if (!decoded.jti || !decoded.sid) {
        throw new Error('Invalid token format');
      }

      // Check if session is still active
      const session = await this.getSession(decoded.sid);
      if (!session || !session.isActive) {
        throw new Error('Session is no longer active');
      }

      // Check token ID matches session
      if (session.tokenId !== decoded.jti) {
        throw new Error('Token ID mismatch');
      }

      // Update last seen timestamp
      if (!options.skipUpdate) {
        await this.updateSessionActivity(decoded.sid);
      }

      return decoded;
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      } else if (error.name === 'TokenExpiredError') {
        throw new Error('Token has expired');
      } else if (error.name === 'NotBeforeError') {
        throw new Error('Token not active yet');
      }

      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken) {
    if (!refreshToken) {
      throw new Error('Refresh token is required');
    }

    try {
      const jwtSecret = await this.getJWTSecret();
      const decoded = jwt.verify(refreshToken, jwtSecret, {
        algorithms: ['HS256'],
        audience: 'tyler-setup-platform',
        issuer: 'tyler-setup-auth-service'
      });

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid refresh token type');
      }

      // Check if refresh token session is active
      const session = await this.getSession(decoded.sid);
      if (!session || !session.isActive || session.refreshTokenId !== decoded.jti) {
        throw new Error('Refresh token session is invalid');
      }

      // Generate new access token (keep same refresh token)
      const now = Date.now();
      const newTokenId = crypto.randomBytes(16).toString('hex');

      const newPayload = {
        sub: decoded.sub,
        email: session.email,
        role: session.role,
        permissions: session.permissions || [],
        iat: Math.floor(now / 1000),
        exp: Math.floor((now + 24 * 60 * 60 * 1000) / 1000), // 24 hours
        jti: newTokenId,
        sid: decoded.sid,
        aud: 'tyler-setup-platform',
        iss: 'tyler-setup-auth-service'
      };

      const newToken = jwt.sign(newPayload, jwtSecret, { algorithm: 'HS256' });

      // Update session with new token ID
      await this.updateSession(decoded.sid, { tokenId: newTokenId });

      return {
        accessToken: newToken,
        expiresIn: 24 * 60 * 60,
        tokenType: 'Bearer'
      };
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid refresh token');
      } else if (error.name === 'TokenExpiredError') {
        throw new Error('Refresh token has expired');
      }

      throw error;
    }
  }

  /**
   * Revoke token and invalidate session
   */
  async revokeToken(token, sessionId = null) {
    // Add token to blacklist
    if (token) {
      this.blacklistedTokens.add(token);

      // Limit blacklist size to prevent memory issues
      if (this.blacklistedTokens.size > 10000) {
        const oldestTokens = Array.from(this.blacklistedTokens).slice(0, 1000);
        oldestTokens.forEach(t => this.blacklistedTokens.delete(t));
      }
    }

    // Invalidate session
    if (sessionId) {
      await this.invalidateSession(sessionId);
    }
  }

  /**
   * Session management functions
   */
  async storeSession(sessionId, sessionData) {
    await dynamodb.put({
      TableName: process.env.SESSIONS_TABLE,
      Item: {
        session_id: sessionId,
        ...sessionData,
        ttl: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60 // 30 days TTL
      }
    }).promise();
  }

  async getSession(sessionId) {
    const result = await dynamodb.get({
      TableName: process.env.SESSIONS_TABLE,
      Key: { session_id: sessionId }
    }).promise();

    return result.Item;
  }

  async updateSession(sessionId, updates) {
    const updateExpression = [];
    const expressionAttributeValues = {};

    Object.entries(updates).forEach(([key, value]) => {
      updateExpression.push(`${key} = :${key}`);
      expressionAttributeValues[`:${key}`] = value;
    });

    await dynamodb.update({
      TableName: process.env.SESSIONS_TABLE,
      Key: { session_id: sessionId },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeValues: expressionAttributeValues
    }).promise();
  }

  async updateSessionActivity(sessionId) {
    await this.updateSession(sessionId, {
      lastSeenAt: new Date().toISOString()
    });
  }

  async invalidateSession(sessionId) {
    await this.updateSession(sessionId, {
      isActive: false,
      invalidatedAt: new Date().toISOString()
    });
  }

  /**
   * Account lockout management
   */
  async recordFailedAttempt(userEmail) {
    const attempts = this.failedAttempts.get(userEmail) || { count: 0, firstAttempt: Date.now() };
    attempts.count++;
    attempts.lastAttempt = Date.now();

    this.failedAttempts.set(userEmail, attempts);

    // Log security event
    console.warn(`Failed login attempt for user: ${userEmail}, attempts: ${attempts.count}`);

    // Trigger security alert if threshold exceeded
    if (attempts.count >= this.maxFailedAttempts) {
      await this.triggerSecurityAlert('account_lockout', { userEmail, attempts: attempts.count });
    }
  }

  isAccountLocked(userEmail) {
    const attempts = this.failedAttempts.get(userEmail);
    if (!attempts || attempts.count < this.maxFailedAttempts) {
      return false;
    }

    // Check if lockout period has expired
    const lockoutExpiry = attempts.lastAttempt + this.lockoutDuration;
    if (Date.now() > lockoutExpiry) {
      this.clearFailedAttempts(userEmail);
      return false;
    }

    return true;
  }

  clearFailedAttempts(userEmail) {
    this.failedAttempts.delete(userEmail);
  }

  /**
   * Security event logging and alerting
   */
  async triggerSecurityAlert(alertType, data) {
    const alertData = {
      type: alertType,
      timestamp: new Date().toISOString(),
      data,
      severity: 'HIGH'
    };

    // Log to CloudWatch
    console.error(`SECURITY ALERT [${alertType}]:`, JSON.stringify(alertData));

    // Could send to SNS, Lambda, or other alerting system
    // await sns.publish({
    //   TopicArn: process.env.SECURITY_ALERTS_TOPIC,
    //   Message: JSON.stringify(alertData)
    // }).promise();
  }

  /**
   * Rate limiting middleware factory
   */
  createRateLimiter(options = {}) {
    return rateLimit({
      windowMs: options.windowMs || 15 * 60 * 1000, // 15 minutes
      max: options.max || 100, // requests per window
      message: options.message || 'Too many requests, please try again later',
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        this.triggerSecurityAlert('rate_limit_exceeded', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path
        });
        res.status(429).json({ error: 'Too many requests' });
      }
    });
  }

  /**
   * Slow down middleware for additional protection
   */
  createSlowDown(options = {}) {
    return slowDown({
      windowMs: options.windowMs || 15 * 60 * 1000,
      delayAfter: options.delayAfter || 50,
      delayMs: options.delayMs || 500,
      maxDelayMs: options.maxDelayMs || 10000
    });
  }

  /**
   * Multi-factor authentication token generation
   */
  generateMFAToken() {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Verify MFA token (simplified implementation)
   */
  async verifyMFAToken(userId, token, storedToken) {
    // In production, this would integrate with TOTP libraries like speakeasy
    // For now, simple token comparison with timing attack protection
    return this.secureCompare(token, storedToken);
  }

  /**
   * Secure string comparison to prevent timing attacks
   */
  secureCompare(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') {
      return false;
    }

    if (a.length !== b.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(a, 'utf8'),
      Buffer.from(b, 'utf8')
    );
  }

  /**
   * Generate secure password reset token
   */
  generatePasswordResetToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Cleanup expired sessions and blacklisted tokens
   */
  async cleanup() {
    // Clean up failed attempts older than lockout duration
    const cutoffTime = Date.now() - this.lockoutDuration;
    for (const [email, attempts] of this.failedAttempts.entries()) {
      if (attempts.lastAttempt < cutoffTime) {
        this.failedAttempts.delete(email);
      }
    }

    // Clean up blacklisted tokens (in production, use Redis with TTL)
    if (this.blacklistedTokens.size > 5000) {
      this.blacklistedTokens.clear();
    }
  }
}

// Export singleton instance
module.exports = new AuthService();
