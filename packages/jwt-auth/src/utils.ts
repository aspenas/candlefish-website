import * as crypto from 'crypto';
import { JWKSKey } from './types';

export function jwkToPem(jwk: JWKSKey): string {
  const keyData: any = {
    kty: jwk.kty,
    n: jwk.n,
    e: jwk.e
  };
  
  // Add private key components if present
  if (jwk.d) {
    keyData.d = jwk.d;
    keyData.p = jwk.p;
    keyData.q = jwk.q;
    keyData.dp = jwk.dp;
    keyData.dq = jwk.dq;
    keyData.qi = jwk.qi;
  }
  
  // Create key from JWK
  const key = jwk.d 
    ? crypto.createPrivateKey({ format: 'jwk', key: keyData })
    : crypto.createPublicKey({ format: 'jwk', key: keyData });
  
  // Export as PEM
  return key.export({
    type: jwk.d ? 'pkcs1' : 'spki',
    format: 'pem'
  }) as string;
}

export function generateKeyId(): string {
  return crypto.randomUUID();
}

export function generateJti(): string {
  return crypto.randomUUID();
}

export function isTokenExpired(exp: number): boolean {
  return Date.now() >= exp * 1000;
}

export function getExpirationTime(expiresIn: string | number): number {
  const now = Math.floor(Date.now() / 1000);
  
  if (typeof expiresIn === 'number') {
    return now + expiresIn;
  }
  
  // Parse string format (e.g., '1h', '7d', '30m')
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid expiresIn format: ${expiresIn}`);
  }
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400
  };
  
  return now + (value * multipliers[unit]);
}

export function parseAuthHeader(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
}

export function createErrorResponse(message: string, statusCode: number = 401) {
  return {
    error: true,
    message,
    statusCode
  };
}