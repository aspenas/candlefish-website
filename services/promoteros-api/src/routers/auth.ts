import { z } from 'zod';
import { publicProcedure, router } from '../trpc';
import { TRPCError } from '@trpc/server';

export const authRouter = router({
  // For now, just a simple health check for auth
  // In production, implement proper login/logout/register
  status: publicProcedure
    .query(async ({ ctx }) => {
      return {
        authenticated: !!ctx.session,
        user: ctx.session ? {
          id: ctx.session.id,
          email: ctx.session.email,
          name: ctx.session.name,
        } : null,
      };
    }),
});
