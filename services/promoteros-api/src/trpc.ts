import { initTRPC, TRPCError } from '@trpc/server';
import { Context } from './context';
import superjson from 'superjson';

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause && typeof error.cause === 'object' && 'issues' in error.cause
            ? error.cause.issues
            : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

// Auth middleware
const requireAuth = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session, // Type narrowing
    },
  });
});

export const protectedProcedure = t.procedure.use(requireAuth);

// Organization access middleware
const requireOrganizationAccess = t.middleware(async ({ ctx, input, next }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }

  // For now, just check if user has a valid session
  // In production, you'd check organization membership

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

export const organizationProcedure = t.procedure.use(requireOrganizationAccess);

// Admin middleware (for now, same as auth - in production check for admin role)
const requireAdmin = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }
  // TODO: Check for admin role in production
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

export const adminProcedure = t.procedure.use(requireAdmin);
