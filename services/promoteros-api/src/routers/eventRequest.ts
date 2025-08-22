import { z } from 'zod';
import { router, publicProcedure, protectedProcedure, adminProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { EventRequestStatus } from '@prisma/client';
import { sendEmail } from '../utils/email';
import { createAuditLog } from '../utils/audit';

const createEventRequestSchema = z.object({
  venueSlug: z.string(),
  requesterName: z.string().min(1),
  requesterEmail: z.string().email(),
  requesterPhone: z.string().optional(),
  requesterCompany: z.string().optional(),
  artistName: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  dateStart: z.string().transform(str => new Date(str)),
  dateEnd: z.string().transform(str => new Date(str)),
  expectedAttendance: z.number().optional(),
  budgetMin: z.number().optional(),
  budgetMax: z.number().optional(),
  splitNotes: z.string().optional(),
  techNeeds: z.string().optional(),
  // Honeypot field for spam protection
  website: z.string().optional(),
});

export const eventRequestRouter = router({
  // Public endpoint for intake form
  submitRequest: publicProcedure
    .input(createEventRequestSchema)
    .mutation(async ({ ctx, input }) => {
      // Check honeypot
      if (input.website) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid submission',
        });
      }

      // Find venue by slug
      const venue = await ctx.prisma.venue.findFirst({
        where: { slug: input.venueSlug },
        include: { organization: true },
      });

      if (!venue) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Venue not found',
        });
      }

      // Create event request
      const eventRequest = await ctx.prisma.eventRequest.create({
        data: {
          organizationId: venue.organizationId,
          venueId: venue.id,
          requesterName: input.requesterName,
          requesterEmail: input.requesterEmail,
          requesterPhone: input.requesterPhone,
          requesterCompany: input.requesterCompany,
          artistName: input.artistName,
          title: input.title,
          description: input.description,
          dateStart: input.dateStart,
          dateEnd: input.dateEnd,
          expectedAttendance: input.expectedAttendance,
          budgetMin: input.budgetMin,
          budgetMax: input.budgetMax,
          splitNotes: input.splitNotes,
          techNeeds: input.techNeeds,
          status: 'NEW',
        },
      });

      // Queue confirmation email to requester
      await ctx.prisma.emailQueue.create({
        data: {
          to: input.requesterEmail,
          subject: `Event Request Received - ${venue.name}`,
          template: 'event-request-confirmation',
          payload: {
            requesterName: input.requesterName,
            venueName: venue.name,
            eventTitle: input.title,
            artistName: input.artistName,
            requestId: eventRequest.id,
          },
        },
      });

      // Queue notification email to venue managers
      const managers = await ctx.prisma.membership.findMany({
        where: {
          organizationId: venue.organizationId,
          role: { in: ['OWNER', 'MANAGER'] },
        },
        include: { user: true },
      });

      for (const manager of managers) {
        await ctx.prisma.emailQueue.create({
          data: {
            to: manager.user.email,
            subject: `New Event Request - ${input.artistName}`,
            template: 'new-event-request',
            payload: {
              managerName: manager.user.name,
              venueName: venue.name,
              eventTitle: input.title,
              artistName: input.artistName,
              requesterName: input.requesterName,
              dateStart: input.dateStart.toISOString(),
              requestId: eventRequest.id,
            },
          },
        });
      }

      return {
        success: true,
        requestId: eventRequest.id,
        message: 'Your event request has been submitted successfully. You will receive a confirmation email shortly.',
      };
    }),

  // Get all requests for the organization
  list: protectedProcedure
    .input(z.object({
      status: z.nativeEnum(EventRequestStatus).optional(),
      venueId: z.string().optional(),
      search: z.string().optional(),
      limit: z.number().min(1).max(100).default(50),
      cursor: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const where = {
        organizationId: ctx.session!.organizationId,
        ...(input.status && { status: input.status }),
        ...(input.venueId && { venueId: input.venueId }),
        ...(input.search && {
          OR: [
            { artistName: { contains: input.search, mode: 'insensitive' as const } },
            { title: { contains: input.search, mode: 'insensitive' as const } },
            { requesterName: { contains: input.search, mode: 'insensitive' as const } },
          ],
        }),
      };

      const requests = await ctx.prisma.eventRequest.findMany({
        where,
        include: {
          venue: true,
          decisionLogs: {
            include: { user: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: input.limit + 1,
        ...(input.cursor && {
          cursor: { id: input.cursor },
          skip: 1,
        }),
      });

      let nextCursor: string | undefined;
      if (requests.length > input.limit) {
        const nextItem = requests.pop();
        nextCursor = nextItem!.id;
      }

      return {
        items: requests,
        nextCursor,
      };
    }),

  // Get single request
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const request = await ctx.prisma.eventRequest.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.session!.organizationId,
        },
        include: {
          venue: true,
          decisionLogs: {
            include: { user: true },
            orderBy: { createdAt: 'desc' },
          },
          event: true,
        },
      });

      if (!request) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event request not found',
        });
      }

      return request;
    }),

  // Update request status
  updateStatus: adminProcedure
    .input(z.object({
      id: z.string(),
      status: z.nativeEnum(EventRequestStatus),
      note: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const request = await ctx.prisma.eventRequest.findFirst({
        where: {
          id: input.id,
          organizationId: ctx.session!.organizationId,
        },
      });

      if (!request) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Event request not found',
        });
      }

      // Update status
      const updated = await ctx.prisma.eventRequest.update({
        where: { id: input.id },
        data: {
          status: input.status,
          ...(input.status === 'REVIEW' && { reviewedAt: new Date() }),
          ...(input.status === 'APPROVED' || input.status === 'DECLINED'
            ? { decidedAt: new Date() }
            : {}),
        },
      });

      // Create decision log
      await ctx.prisma.decisionLog.create({
        data: {
          eventRequestId: input.id,
          userId: ctx.session!.user.id,
          action: input.status,
          note: input.note,
        },
      });

      // Create audit log
      await createAuditLog(ctx.prisma, {
        organizationId: ctx.session!.organizationId,
        actorUserId: ctx.session!.user.id,
        action: `UPDATE_STATUS_${input.status}`,
        entityType: 'EventRequest',
        entityId: input.id,
        meta: { previousStatus: request.status, newStatus: input.status },
      });

      // Send status update email
      await ctx.prisma.emailQueue.create({
        data: {
          to: request.requesterEmail,
          subject: `Event Request ${input.status === 'APPROVED' ? 'Approved' : input.status === 'DECLINED' ? 'Declined' : 'Update'} - ${request.title}`,
          template: 'event-request-status',
          payload: {
            requesterName: request.requesterName,
            eventTitle: request.title,
            status: input.status,
            note: input.note,
          },
        },
      });

      return updated;
    }),

  // Convert approved request to event
  convertToEvent: adminProcedure
    .input(z.object({
      requestId: z.string(),
      doorsAt: z.string().transform(str => new Date(str)),
      showAt: z.string().transform(str => new Date(str)),
      endAt: z.string().transform(str => new Date(str)),
      capacityOverride: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const request = await ctx.prisma.eventRequest.findFirst({
        where: {
          id: input.requestId,
          organizationId: ctx.session!.organizationId,
          status: 'APPROVED',
        },
      });

      if (!request) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Approved event request not found',
        });
      }

      // Check if event already exists
      const existingEvent = await ctx.prisma.event.findUnique({
        where: { eventRequestId: input.requestId },
      });

      if (existingEvent) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Event already created for this request',
        });
      }

      // Create event
      const event = await ctx.prisma.event.create({
        data: {
          organizationId: request.organizationId,
          venueId: request.venueId,
          eventRequestId: input.requestId,
          title: request.title,
          description: request.description,
          date: request.dateStart,
          doorsAt: input.doorsAt,
          showAt: input.showAt,
          endAt: input.endAt,
          status: 'CONFIRMED',
          capacityOverride: input.capacityOverride,
        },
      });

      // Update request status
      await ctx.prisma.eventRequest.update({
        where: { id: input.requestId },
        data: { status: 'SCHEDULED' },
      });

      // Create tasks from templates
      const templates = await ctx.prisma.taskTemplate.findMany({
        where: { organizationId: request.organizationId },
        orderBy: { order: 'asc' },
      });

      for (const template of templates) {
        const dueAt = new Date(request.dateStart);
        dueAt.setDate(dueAt.getDate() - template.defaultDueDays);

        await ctx.prisma.eventTask.create({
          data: {
            eventId: event.id,
            title: template.title,
            description: template.description,
            dueAt,
            order: template.order,
          },
        });
      }

      // Send confirmation email
      await ctx.prisma.emailQueue.create({
        data: {
          to: request.requesterEmail,
          subject: `Event Confirmed - ${request.title}`,
          template: 'event-confirmation',
          payload: {
            requesterName: request.requesterName,
            eventTitle: request.title,
            date: request.dateStart.toISOString(),
            doorsAt: input.doorsAt.toISOString(),
            showAt: input.showAt.toISOString(),
            eventId: event.id,
          },
        },
      });

      return event;
    }),
});
