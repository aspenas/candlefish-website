import { z } from 'zod';
import { protectedProcedure, router } from '../trpc';

export const userRouter = router({
  me: protectedProcedure
    .query(async ({ ctx }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: ctx.session!.id },
        include: {
          memberships: {
            include: { organization: true },
          },
        },
      });

      return user;
    }),

  list: protectedProcedure
    .query(async ({ ctx }) => {
      const users = await ctx.prisma.user.findMany({
        where: {
          memberships: {
            some: {
              organizationId: ctx.session!.organizationId,
            },
          },
        },
        include: {
          memberships: {
            where: {
              organizationId: ctx.session!.organizationId,
            },
          },
        },
      });

      return users;
    }),
});
