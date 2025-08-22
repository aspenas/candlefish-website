import { z } from 'zod';
import { publicProcedure, router } from '../trpc';

export const venueRouter = router({
  getBySlug: publicProcedure
    .input(z.object({
      organizationSlug: z.string(),
      venueSlug: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const venue = await ctx.prisma.venue.findFirst({
        where: {
          slug: input.venueSlug,
          organization: {
            slug: input.organizationSlug,
          },
        },
        include: {
          organization: true,
        },
      });

      if (!venue) {
        throw new Error('Venue not found');
      }

      return venue;
    }),

  getAll: publicProcedure
    .input(z.object({
      organizationSlug: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const venues = await ctx.prisma.venue.findMany({
        where: {
          organization: {
            slug: input.organizationSlug,
          },
        },
        include: {
          organization: true,
        },
      });

      return venues;
    }),
});
