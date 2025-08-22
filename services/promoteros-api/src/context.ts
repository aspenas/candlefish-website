import { inferAsyncReturnType } from '@trpc/server';
import { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { prisma } from './db';
import { verifyJWT } from './utils/auth';
import type { Session } from './types';

export async function createContext({ req, res }: CreateExpressContextOptions) {
  // Get session from Authorization header
  let session: Session | null = null;

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    try {
      const decoded = await verifyJWT(token);
      session = decoded as Session;
    } catch (error) {
      // Invalid token, continue as unauthenticated
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
