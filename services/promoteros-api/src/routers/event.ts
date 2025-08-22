import { z } from 'zod';
import { protectedProcedure, router } from '../trpc';

export const eventRouter = router({
  list: protectedProcedure
    .input(z.object({
      venueId: z.string().optional(),
      status: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const events = await ctx.prisma.event.findMany({
        where: {
          organizationId: ctx.session!.organizationId,
          ...(input.venueId && { venueId: input.venueId }),
          ...(input.status && { status: input.status as any }),
        },
        include: {
          venue: true,
          eventRequest: true,
        },
        orderBy: { date: 'asc' },
        take: input.limit,
      });

      return events;
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const event = await ctx.prisma.event.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.session!.organizationId,
        },
        include: {
          venue: true,
          eventRequest: true,
          tasks: {
            include: { assignee: true },
            orderBy: { order: 'asc' },
          },
          dealTerms: true,
        },
      });

      if (!event) {
        throw new Error('Event not found');
      }

      return event;
    }),
});