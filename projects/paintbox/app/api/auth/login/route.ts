/**
 * Login API Endpoint
 * Handles user authentication and JWT token generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logging/simple-logger';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

// Initialize AWS Secrets Manager client
const secretsClient = new SecretsManagerClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

async function getPrivateKey(): Promise<any> {
  try {
    const command = new GetSecretValueCommand({
      SecretId: 'paintbox/production/jwt/private-key'
    });

    const response = await secretsClient.send(command);

    if (!response.SecretString) {
      throw new Error('Private key secret is empty');
    }

    return JSON.parse(response.SecretString);
  } catch (error) {
    logger.error('Failed to get private key from secrets', { error });
    throw new Error('Authentication service unavailable');
  }
}

function createJWTFromKey(payload: any, privateKey: any, expiresIn: string = '24h'): string {
  // Convert JWK to PEM format for signing
  // This is a simplified implementation - in production you'd use a proper library
  const header = {
    alg: 'RS256',
    typ: 'JWT',
    kid: privateKey.kid
  };

  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + (24 * 60 * 60), // 24 hours
    iss: process.env.JWT_ISSUER || 'candlefish-auth',
    aud: process.env.JWT_AUDIENCE || 'candlefish-api',
  };

  // This is a placeholder - you would need to implement proper RSA signing
  // For now, returning a mock token structure
  throw new Error('JWT signing not fully implemented - requires RSA key conversion');
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body: LoginRequest = await request.json();
    const { email, password, rememberMe = false } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Email and password are required'
        }
      }, { status: 400 });
    }

    logger.info('Login attempt', { email, rememberMe });

    // TODO: Replace with actual user lookup from database
    // This is a placeholder implementation
    const mockUser = {
      id: '1',
      email: 'admin@paintbox.com',
      passwordHash: '$2b$10$example', // This should come from database
      role: 'admin',
      organizationId: 'org_1',
      permissions: ['read', 'write', 'admin']
    };

    // Check if user exists and password is correct
    if (email !== mockUser.email) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Prevent timing attacks
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      }, { status: 401 });
    }

    // In production, verify password hash
    // const passwordValid = await bcrypt.compare(password, mockUser.passwordHash);
    const passwordValid = password === 'admin'; // Mock for demo

    if (!passwordValid) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      }, { status: 401 });
    }

    // Get private key for signing
    const privateKey = await getPrivateKey();

    // Create JWT payload
    const tokenPayload = {
      sub: mockUser.id,
      email: mockUser.email,
      role: mockUser.role,
      organizationId: mockUser.organizationId,
      permissions: mockUser.permissions,
    };

    // Generate tokens
    const expiresIn = rememberMe ? '7d' : '24h';

    // For now, return a structured response without actual JWT signing
    // In production, implement proper JWT signing with the private key
    const tokens: TokenResponse = {
      accessToken: `mock_access_token_${Date.now()}`, // Replace with actual JWT
      refreshToken: `mock_refresh_token_${Date.now()}`, // Replace with actual refresh token
      expiresIn: rememberMe ? 7 * 24 * 60 * 60 : 24 * 60 * 60, // seconds
      tokenType: 'Bearer'
    };

    logger.info('Login successful', {
      userId: mockUser.id,
      email: mockUser.email,
      rememberMe,
      duration: Date.now() - startTime
    });

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
          organizationId: mockUser.organizationId,
        },
        tokens
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Login failed';

    logger.error('Login error', {
      error: errorMessage,
      duration: Date.now() - startTime,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json({
      success: false,
      error: {
        code: 'LOGIN_ERROR',
        message: 'Authentication service error'
      }
    }, { status: 500 });
  }
}

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
