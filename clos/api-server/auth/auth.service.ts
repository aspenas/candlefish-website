/**
 * Authentication Service
 * Handles user authentication, JWT tokens, and API keys
 */

import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Redis } from 'ioredis';

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  isActive: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  key: string;
  permissions: string[];
}

export class AuthService {
  private db: Pool;
  private redis: Redis;
  private jwtSecret: string;
  private jwtRefreshSecret: string;
  private accessTokenExpiry = '15m';
  private refreshTokenExpiry = '7d';

  constructor(db: Pool, redis: Redis) {
    this.db = db;
    this.redis = redis;
    this.jwtSecret = process.env.JWT_SECRET || 'clos-jwt-secret-2024';
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'clos-jwt-refresh-secret-2024';
  }

  /**
   * Authenticate user with username/password
   */
  async authenticateUser(username: string, password: string): Promise<AuthTokens> {
    // Get user from database
    const result = await this.db.query(
      'SELECT * FROM users WHERE username = $1 OR email = $1',
      [username]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid credentials');
    }

    const user = result.rows[0];

    // Check if user is active
    if (!user.is_active) {
      throw new Error('Account is disabled');
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    await this.db.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Generate tokens
    return this.generateTokens(user);
  }

  /**
   * Authenticate with API key
   */
  async authenticateApiKey(apiKey: string): Promise<User> {
    const keyHash = this.hashApiKey(apiKey);

    // Check API keys table
    const result = await this.db.query(
      `SELECT u.*, ak.permissions 
       FROM api_keys ak
       JOIN users u ON ak.user_id = u.id
       WHERE ak.key_hash = $1 AND ak.is_active = true
       AND (ak.expires_at IS NULL OR ak.expires_at > CURRENT_TIMESTAMP)`,
      [keyHash]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid API key');
    }

    const user = result.rows[0];

    // Update last used
    await this.db.query(
      'UPDATE api_keys SET last_used = CURRENT_TIMESTAMP WHERE key_hash = $1',
      [keyHash]
    );

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.is_active
    };
  }

  /**
   * Generate JWT tokens
   */
  private generateTokens(user: any): AuthTokens {
    const payload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };

    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.accessTokenExpiry
    } as jwt.SignOptions);

    const refreshToken = jwt.sign(
      { userId: user.id },
      this.jwtRefreshSecret,
      { expiresIn: this.refreshTokenExpiry } as jwt.SignOptions
    );

    // Store refresh token in Redis
    this.redis.setex(
      `refresh_token:${user.id}`,
      7 * 24 * 60 * 60, // 7 days in seconds
      refreshToken
    );

    // Create session record
    this.createSession(user.id, accessToken, refreshToken);

    return {
      accessToken,
      refreshToken,
      expiresIn: 900 // 15 minutes in seconds
    };
  }

  /**
   * Verify JWT token
   */
  async verifyToken(token: string): Promise<any> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      
      // Check if token is blacklisted
      const isBlacklisted = await this.redis.get(`blacklist:${token}`);
      if (isBlacklisted) {
        throw new Error('Token is blacklisted');
      }

      return decoded;
    } catch (error) {
      if (error instanceof Error && error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      }
      throw new Error('Invalid token');
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const decoded = jwt.verify(refreshToken, this.jwtRefreshSecret) as any;
      
      // Check if refresh token exists in Redis
      const storedToken = await this.redis.get(`refresh_token:${decoded.userId}`);
      if (storedToken !== refreshToken) {
        throw new Error('Invalid refresh token');
      }

      // Get user
      const result = await this.db.query(
        'SELECT * FROM users WHERE id = $1 AND is_active = true',
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      // Generate new tokens
      return this.generateTokens(result.rows[0]);
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Logout user
   */
  async logout(userId: string, token: string): Promise<void> {
    // Blacklist the current token
    const decoded = jwt.decode(token) as any;
    if (decoded && decoded.exp) {
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await this.redis.setex(`blacklist:${token}`, ttl, '1');
      }
    }

    // Remove refresh token
    await this.redis.del(`refresh_token:${userId}`);

    // Update session
    await this.db.query(
      'DELETE FROM sessions WHERE user_id = $1',
      [userId]
    );
  }

  /**
   * Create API key
   */
  async createApiKey(userId: string, name: string, permissions: string[]): Promise<ApiKey> {
    // Generate API key
    const apiKey = this.generateApiKey();
    const keyHash = this.hashApiKey(apiKey);

    // Store in database
    const result = await this.db.query(
      `INSERT INTO api_keys (user_id, key_hash, name, permissions, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id`,
      [userId, keyHash, name, JSON.stringify(permissions)]
    );

    return {
      id: result.rows[0].id,
      userId,
      name,
      key: apiKey, // Only returned once
      permissions
    };
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(keyId: string, userId: string): Promise<void> {
    await this.db.query(
      'UPDATE api_keys SET is_active = false WHERE id = $1 AND user_id = $2',
      [keyId, userId]
    );
  }

  /**
   * Change password
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    // Get current password hash
    const result = await this.db.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    // Verify old password
    const passwordValid = await bcrypt.compare(oldPassword, result.rows[0].password_hash);
    if (!passwordValid) {
      throw new Error('Invalid current password');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await this.db.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newPasswordHash, userId]
    );

    // Invalidate all sessions
    await this.redis.del(`refresh_token:${userId}`);
    await this.db.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
  }

  /**
   * Create user
   */
  async createUser(username: string, email: string, password: string, role: string = 'user'): Promise<User> {
    // Check if user exists
    const existing = await this.db.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existing.rows.length > 0) {
      throw new Error('User already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const result = await this.db.query(
      `INSERT INTO users (username, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, username, email, role, is_active`,
      [username, email, passwordHash, role]
    );

    return {
      id: result.rows[0].id,
      username: result.rows[0].username,
      email: result.rows[0].email,
      role: result.rows[0].role,
      isActive: result.rows[0].is_active
    };
  }

  /**
   * Create session record
   */
  private async createSession(userId: string, accessToken: string, refreshToken: string): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(accessToken).digest('hex');
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // First delete existing sessions for the user
    await this.db.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
    
    // Then insert new session
    await this.db.query(
      `INSERT INTO sessions (user_id, token_hash, refresh_token_hash, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '7 days')`,
      [userId, tokenHash, refreshTokenHash]
    );
  }

  /**
   * Generate API key
   */
  private generateApiKey(): string {
    return `clos_${crypto.randomBytes(32).toString('hex')}`;
  }

  /**
   * Hash API key
   */
  private hashApiKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  /**
   * Check user permission
   */
  async checkPermission(userId: string, permission: string): Promise<boolean> {
    const result = await this.db.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    const role = result.rows[0].role;

    // Admin has all permissions
    if (role === 'admin') {
      return true;
    }

    // Define role permissions
    const rolePermissions = {
      user: ['read', 'write', 'restart_own'],
      viewer: ['read']
    };

    return (rolePermissions[role as keyof typeof rolePermissions]?.includes(permission)) || false;
  }
}