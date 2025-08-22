// PromoterOS shared types
import { z } from 'zod';

// ==================== ENUMS ====================

export const MembershipRole = z.enum(['OWNER', 'MANAGER', 'STAFF', 'PROMOTER']);
export type MembershipRole = z.infer<typeof MembershipRole>;

export const EventRequestStatus = z.enum(['NEW', 'REVIEW', 'APPROVED', 'DECLINED', 'SCHEDULED']);
export type EventRequestStatus = z.infer<typeof EventRequestStatus>;

export const EventStatus = z.enum(['DRAFT', 'CONFIRMED', 'CANCELED']);
export type EventStatus = z.infer<typeof EventStatus>;

export const DealType = z.enum(['FLAT', 'SPLIT', 'GUARANTEE_PLUS']);
export type DealType = z.infer<typeof DealType>;

export const EmailStatus = z.enum(['QUEUED', 'SENDING', 'SENT', 'FAILED']);
export type EmailStatus = z.infer<typeof EmailStatus>;

// ==================== CORE ENTITIES ====================

export const OrganizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Organization = z.infer<typeof OrganizationSchema>;

export const VenueSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  name: z.string(),
  slug: z.string(),
  timezone: z.string().default('America/Denver'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  capacity: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Venue = z.infer<typeof VenueSchema>;

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  image: z.string().optional(),
  emailVerified: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type User = z.infer<typeof UserSchema>;

export const MembershipSchema = z.object({
  id: z.string(),
  userId: z.string(),
  organizationId: z.string(),
  role: MembershipRole,
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Membership = z.infer<typeof MembershipSchema>;

// ==================== EVENT MANAGEMENT ====================

export const EventRequestSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  venueId: z.string(),
  requesterName: z.string(),
  requesterEmail: z.string().email(),
  requesterPhone: z.string().optional(),
  requesterCompany: z.string().optional(),
  artistName: z.string(),
  title: z.string(),
  description: z.string().optional(),
  dateStart: z.date(),
  dateEnd: z.date(),
  expectedAttendance: z.number().optional(),
  budgetMin: z.number().optional(),
  budgetMax: z.number().optional(),
  splitNotes: z.string().optional(),
  techNeeds: z.string().optional(),
  status: EventRequestStatus,
  submittedAt: z.date(),
  reviewedAt: z.date().optional(),
  decidedAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type EventRequest = z.infer<typeof EventRequestSchema>;

export const EventSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  venueId: z.string(),
  eventRequestId: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  date: z.date(),
  doorsAt: z.date().optional(),
  showAt: z.date().optional(),
  endAt: z.date().optional(),
  status: EventStatus,
  capacityOverride: z.number().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Event = z.infer<typeof EventSchema>;

// ==================== API REQUEST/RESPONSE TYPES ====================

export const CreateEventRequestSchema = z.object({
  venueId: z.string(),
  requesterName: z.string().min(1, 'Name is required'),
  requesterEmail: z.string().email('Valid email is required'),
  requesterPhone: z.string().optional(),
  requesterCompany: z.string().optional(),
  artistName: z.string().min(1, 'Artist name is required'),
  title: z.string().min(1, 'Event title is required'),
  description: z.string().optional(),
  dateStart: z.date(),
  dateEnd: z.date(),
  expectedAttendance: z.number().positive().optional(),
  budgetMin: z.number().positive().optional(),
  budgetMax: z.number().positive().optional(),
  splitNotes: z.string().optional(),
  techNeeds: z.string().optional(),
});
export type CreateEventRequest = z.infer<typeof CreateEventRequestSchema>;

export const EventRequestListResponse = z.object({
  requests: z.array(EventRequestSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});
export type EventRequestListResponse = z.infer<typeof EventRequestListResponse>;

// ==================== FORM TYPES ====================

export const EventRequestFormSchema = CreateEventRequestSchema.extend({
  dateStart: z.string().transform(str => new Date(str)),
  dateEnd: z.string().transform(str => new Date(str)),
});
export type EventRequestFormData = z.input<typeof EventRequestFormSchema>;

// ==================== API ERROR TYPES ====================

export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.any()).optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
