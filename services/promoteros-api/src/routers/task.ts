import { z } from 'zod';
import { protectedProcedure, router } from '../trpc';

export const taskRouter = router({
  list: protectedProcedure
    .input(z.object({
      eventId: z.string().optional(),
      assigneeId: z.string().optional(),
      done: z.boolean().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const tasks = await ctx.prisma.eventTask.findMany({
        where: {
          event: {
            organizationId: ctx.session!.organizationId,
          },
          ...(input.eventId && { eventId: input.eventId }),
          ...(input.assigneeId && { assigneeUserId: input.assigneeId }),
          ...(typeof input.done === 'boolean' && { done: input.done }),
        },
        include: {
          event: { include: { venue: true } },
          assignee: true,
        },
        orderBy: { dueAt: 'asc' },
      });

      return tasks;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      done: z.boolean().optional(),
      assigneeUserId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.eventTask.findFirst({
        where: {
          id: input.id,
          event: {
            organizationId: ctx.session!.organizationId,
          },
        },
      });

      if (!task) {
        throw new Error('Task not found');
      }

      return ctx.prisma.eventTask.update({
        where: { id: input.id },
        data: {
          ...(typeof input.done === 'boolean' && {
            done: input.done,
            completedAt: input.done ? new Date() : null,
          }),
          ...(input.assigneeUserId && { assigneeUserId: input.assigneeUserId }),
        },
      });
    }),
});
