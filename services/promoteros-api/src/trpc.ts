import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';
import { Context } from './context';
import { rateLimit } from './middleware/rateLimit';

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError
            ? error.cause.flatten()
            : null,
      },
    };
  },
});

// Middleware to check authentication
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  });
});

// Middleware to check organization membership
const hasOrgAccess = t.middleware(async ({ ctx, next }) => {
  if (!ctx.session?.user || !ctx.session?.organizationId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  const membership = await ctx.prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: ctx.session.user.id,
        organizationId: ctx.session.organizationId,
      },
    },
  });

  if (!membership) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'No access to this organization',
    });
  }

  return next({
    ctx: {
      ...ctx,
      membership,
    },
  });
});

// Middleware for role-based access
const requireRole = (roles: string[]) => {
  return t.middleware(async ({ ctx, next }) => {
    if (!ctx.session?.user || !ctx.session?.organizationId) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    const membership = await ctx.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: ctx.session.user.id,
          organizationId: ctx.session.organizationId,
        },
      },
    });

    if (!membership || !roles.includes(membership.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Insufficient permissions',
      });
    }

    return next({
      ctx: {
        ...ctx,
        membership,
      },
    });
  });
};

export const router = t.router;
export const publicProcedure = t.procedure.use(rateLimit);
export const protectedProcedure = t.procedure.use(isAuthed).use(hasOrgAccess);
export const adminProcedure = t.procedure.use(requireRole(['OWNER', 'MANAGER']));
export const ownerProcedure = t.procedure.use(requireRole(['OWNER']));
