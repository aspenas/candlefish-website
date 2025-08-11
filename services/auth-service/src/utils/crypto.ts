import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { JWTPayload, RefreshTokenPayload } from '../types';
import { logger } from './logger';

/**
 * Password hashing utilities
 */
export class PasswordUtils {
  static async hash(password: string): Promise<string> {
    try {
      return await bcrypt.hash(password, config.security.bcryptRounds);
    } catch (error) {
      logger.error('Password hashing failed:', error);
      throw new Error('Password hashing failed');
    }
  }

  static async verify(password: string, hashedPassword: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      logger.error('Password verification failed:', error);
      return false;
    }
  }

  static validateStrength(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (password.length > 128) {
      errors.push('Password must be less than 128 characters long');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common patterns
    if (/(.)\1{2,}/.test(password)) {
      errors.push('Password cannot contain repeating characters');
    }

    if (/^[a-zA-Z]+$/.test(password) || /^\d+$/.test(password)) {
      errors.push('Password cannot be only letters or only numbers');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

/**
 * JWT token utilities
 */
export class TokenUtils {
  private static parseExpiry(expiry: string): number {
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

  static generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp' | 'iss' | 'aud'>): string {
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = this.parseExpiry(config.jwt.accessTokenExpiry);

    const jwtPayload: JWTPayload = {
      ...payload,
      iat: now,
      exp: now + expiresIn,
      iss: config.jwt.issuer,
      aud: config.jwt.audience,
    };

    return jwt.sign(jwtPayload, config.jwt.secret, {
      algorithm: 'HS256',
    });
  }

  static generateRefreshToken(userId: string, tokenId: string): string {
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = this.parseExpiry(config.jwt.refreshTokenExpiry);

    const payload: RefreshTokenPayload = {
      sub: userId,
      tokenId,
      iat: now,
      exp: now + expiresIn,
      iss: config.jwt.issuer,
      aud: config.jwt.audience,
    };

    return jwt.sign(payload, config.jwt.secret, {
      algorithm: 'HS256',
    });
  }

  static verifyToken<T = JWTPayload>(token: string): T {
    try {
      return jwt.verify(token, config.jwt.secret, {
        issuer: config.jwt.issuer,
        audience: config.jwt.audience,
        algorithms: ['HS256'],
      }) as T;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('TOKEN_EXPIRED');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('INVALID_TOKEN');
      }
      throw new Error('TOKEN_VERIFICATION_FAILED');
    }
  }

  static decodeToken(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch (error) {
      logger.error('Token decoding failed:', error);
      return null;
    }
  }

  static getTokenExpiry(expiry: string): number {
    return this.parseExpiry(expiry);
  }
}

/**
 * General cryptographic utilities
 */
export class CryptoUtils {
  static generateSecureToken(length: number = 32): string {
    return uuidv4().replace(/-/g, '').substring(0, length);
  }

  static generateApiKeyPrefix(): string {
    return `cf_${this.generateSecureToken(8)}`;
  }

  static generateSessionId(): string {
    return uuidv4();
  }

  static hashApiKey(apiKey: string): string {
    return bcrypt.hashSync(apiKey, 10);
  }

  static verifyApiKey(apiKey: string, hashedApiKey: string): boolean {
    return bcrypt.compareSync(apiKey, hashedApiKey);
  }

  static generatePasswordResetToken(): string {
    return this.generateSecureToken(64);
  }

  static generateEmailVerificationToken(): string {
    return this.generateSecureToken(32);
  }
}
