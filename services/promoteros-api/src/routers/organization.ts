import { z } from 'zod';
import { publicProcedure, router } from '../trpc';

export const organizationRouter = router({
  getBySlug: publicProcedure
    .input(z.object({
      slug: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const organization = await ctx.prisma.organization.findUnique({
        where: {
          slug: input.slug,
        },
        include: {
          venues: true,
        },
      });

      if (!organization) {
        throw new Error('Organization not found');
      }

      return organization;
    }),
});
