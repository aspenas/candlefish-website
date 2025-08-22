import { inferAsyncReturnType } from '@trpc/server';
import { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { config } from './config';

// Initialize Prisma client
const prisma = new PrismaClient({
  log: config.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// User session type
export interface UserSession {
  id: string;
  email: string;
  name?: string;
  organizationId: string;
  role: string;
}

// Context creator function
export async function createContext({ req, res }: CreateExpressContextOptions) {
  // Try to get user from JWT token
  let session: UserSession | null = null;

  const authorization = req.headers.authorization;
  if (authorization?.startsWith('Bearer ')) {
    const token = authorization.slice(7);
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as any;
      session = decoded;
    } catch (error) {
      // Token is invalid, but we'll continue without authentication
      console.warn('Invalid JWT token:', error);
    }
  }

  return {
    req,
    res,
    prisma,
    session,
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;
