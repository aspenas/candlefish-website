/**
 * Partner Resolvers - Partner network management
 * Philosophy: Operational craft - sustainable partner ecosystem
 */

import { IResolvers } from '@graphql-tools/utils';
import { Context, requireAuth, requireRole, authorized } from '../context';
import { withFilter } from 'graphql-subscriptions';
import { 
  Partner, 
  RegisterPartnerInput, 
  UpdatePartnerInput,
  PartnerStatus,
  PartnerTier,
  SubmitLeadInput 
} from '../../types';

export const partnerResolvers: IResolvers<any, Context> = {
  Query: {
    // Get single partner by slug (public)
    partner: async (_, { slug }, { loaders }) => {
      const partner = await loaders.partnerBySlug.load(slug);
      
      // Only show active partners to public
      if (partner && partner.status !== PartnerStatus.ACTIVE) {
        return null;
      }
      
      return partner;
    },

    // Get single partner by ID (authenticated)
    partnerById: async (_, { id }, { loaders, user }) => {
      const partner = await loaders.partnerById.load(id);
      
      // Public users can only see active partners
      if (!user && partner?.status !== PartnerStatus.ACTIVE) {
        return null;
      }
      
      return partner;
    },

    // Get all partners with filtering and pagination
    allPartners: async (
      _,
      { first = 20, after, tier, status, industry },
      { db, user }
    ) => {
      // Filter by status - only active for non-authenticated users
      let statusFilter = status;
      if (!user && !statusFilter) {
        statusFilter = PartnerStatus.ACTIVE;
      }
      if (!user && statusFilter !== PartnerStatus.ACTIVE) {
        statusFilter = PartnerStatus.ACTIVE;
      }

      const result = await db.partners.findMany({
        first,
        after,
        where: {
          tier,
          status: statusFilter,
          industries: industry ? { contains: industry } : undefined,
        },
        orderBy: { joinedAt: 'desc' },
      });

      return {
        edges: result.items.map(partner => ({
          node: partner,
          cursor: partner.id,
        })),
        pageInfo: {
          hasNextPage: result.hasNextPage,
          hasPreviousPage: result.hasPreviousPage,
          startCursor: result.items[0]?.id,
          endCursor: result.items[result.items.length - 1]?.id,
        },
        totalCount: result.totalCount,
      };
    },
  },

  Mutation: {
    // Register new partner
    registerPartner: async (
      _,
      { input }: { input: RegisterPartnerInput },
      { db, loaders, analytics, notifications, auth }
    ) => {
      // Generate slug if not provided
      if (!input.slug) {
        input.slug = input.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
      }

      // Check slug uniqueness
      const existing = await loaders.partnerBySlug.load(input.slug);
      if (existing) {
        throw new Error(`Partner with slug "${input.slug}" already exists`);
      }

      // Create partner with pending status
      const partner = await db.partners.create({
        ...input,
        status: PartnerStatus.PENDING,
        tier: PartnerTier.BRONZE,
        joinedAt: new Date(),
        profileViews: 0,
        isVerified: false,
      });

      // Create user account for primary contact if email provided
      if (input.contactEmail) {
        const tempPassword = auth.generateTempPassword();
        const user = await db.users.create({
          email: input.contactEmail,
          username: input.contactEmail,
          role: 'PARTNER',
          isActive: false,
        });

        // Send welcome email with temp password
        await notifications.send({
          type: 'partner_welcome',
          to: input.contactEmail,
          data: {
            partnerName: partner.name,
            tempPassword,
            loginUrl: process.env.PARTNER_PORTAL_URL,
          },
        });

        // Link user to partner
        await db.partners.update(partner.id, {
          primaryContactId: user.id,
        });
      }

      // Track analytics
      await analytics.track('partner_registered', {
        partnerId: partner.id,
        name: partner.name,
        industry: input.industry,
      });

      // Notify admins
      await notifications.send({
        type: 'admin_partner_registration',
        to: 'admin@candlefish.ai',
        data: {
          partnerName: partner.name,
          partnerEmail: input.contactEmail,
          reviewUrl: `${process.env.ADMIN_PORTAL_URL}/partners/${partner.id}`,
        },
      });

      // Clear caches
      loaders.partnerBySlug.clear(input.slug);

      return partner;
    },

    // Update partner (partner users or admins only)
    updatePartner: async (
      _,
      { id, input }: { id: string; input: UpdatePartnerInput },
      context: Context
    ) => {
      const user = requireAuth(context);
      const { db, loaders, analytics, pubsub } = context;

      const existing = await loaders.partnerById.load(id);
      if (!existing) {
        throw new Error('Partner not found');
      }

      // Check permissions
      const canEdit = 
        user.role === 'ADMIN' || 
        (user.role === 'PARTNER' && existing.primaryContactId === user.id);

      if (!canEdit) {
        throw new Error('Not authorized to edit this partner');
      }

      const updated = await db.partners.update(id, {
        ...input,
        updatedAt: new Date(),
      });

      // Track analytics
      await analytics.track('partner_updated', {
        partnerId: id,
        editorId: user.id,
        changes: Object.keys(input),
      });

      // Notify subscribers of partner changes
      pubsub.publish('PARTNER_STATUS_CHANGED', { 
        partnerStatusChanged: updated 
      });

      // Clear caches
      loaders.partnerById.clear(id);
      if (input.slug) {
        loaders.partnerBySlug.clear(input.slug);
      }

      return updated;
    },

    // Submit lead for partner contact
    submitLead: async (
      _,
      { input }: { input: SubmitLeadInput },
      { db, analytics, notifications }
    ) => {
      const partner = await db.partners.findById(input.partnerId);
      if (!partner) {
        throw new Error('Partner not found');
      }

      if (partner.status !== PartnerStatus.ACTIVE) {
        throw new Error('Partner is not currently accepting leads');
      }

      // Create lead record
      const lead = await db.leads.create({
        ...input,
        status: 'NEW',
        source: 'website',
      });

      // Send notification to partner
      const contactEmail = partner.contactEmail || partner.primaryContact?.email;
      if (contactEmail) {
        await notifications.send({
          type: 'partner_lead',
          to: contactEmail,
          data: {
            leadName: input.name,
            leadEmail: input.email,
            leadCompany: input.company,
            leadMessage: input.message,
            partnerPortalUrl: `${process.env.PARTNER_PORTAL_URL}/leads/${lead.id}`,
          },
        });
      }

      // Track analytics
      await analytics.track('lead_submitted', {
        partnerId: input.partnerId,
        operatorId: input.operatorId,
        leadEmail: input.email,
      });

      return lead;
    },
  },

  Subscription: {
    // Subscribe to partner registrations (admin only)
    partnerRegistered: {
      subscribe: withFilter(
        (_, __, { pubsub }) => pubsub.asyncIterator('PARTNER_REGISTERED'),
        (payload, variables, context) => {
          // Only admins can subscribe
          return context.user?.role === 'ADMIN';
        }
      ),
    },

    // Subscribe to partner status changes
    partnerStatusChanged: {
      subscribe: withFilter(
        (_, __, { pubsub }) => pubsub.asyncIterator('PARTNER_STATUS_CHANGED'),
        (payload, variables) => {
          if (!variables.partnerId) return true;
          return payload.partnerStatusChanged.id === variables.partnerId;
        }
      ),
    },
  },

  // Field resolvers for Partner type
  Partner: {
    // Resolve primary contact
    primaryContact: async (parent, _, { loaders }) => {
      if (!parent.primaryContactId) return null;
      return await loaders.userById.load(parent.primaryContactId);
    },

    // Resolve industries
    industry: async (parent, _, { db }) => {
      if (!parent.industryIds || parent.industryIds.length === 0) return [];
      return await db.industries.findByIds(parent.industryIds);
    },

    // Resolve certifications
    certifications: async (parent, _, { db }) => {
      return await db.certifications.findByPartnerId(parent.id);
    },

    // Resolve implementations
    implementations: async (parent, _, { db, user }) => {
      const implementations = await db.implementations.findByPartnerId(parent.id);
      
      // Filter private implementations for public users
      if (!user) {
        return implementations.filter(impl => impl.isPublic);
      }
      
      return implementations;
    },

    // Resolve testimonials
    testimonials: async (parent, _, { db, user }) => {
      const testimonials = await db.testimonials.findByPartnerId(parent.id);
      
      // Filter private testimonials for public users
      if (!user) {
        return testimonials.filter(test => test.isPublic);
      }
      
      return testimonials;
    },

    // Resolve partner resources
    resources: async (parent, _, { db, user }) => {
      const resources = await db.partnerResources.findByPartnerId(parent.id);
      
      // Filter by access level
      if (!user) {
        return resources.filter(resource => resource.accessLevel === 'PUBLIC');
      }
      
      // Partner users can see their own resources
      if (user.role === 'PARTNER' && parent.primaryContactId === user.id) {
        return resources;
      }
      
      // Operators can see partner and operator resources
      if (user.role === 'OPERATOR') {
        return resources.filter(resource => 
          ['PUBLIC', 'PARTNER_ONLY', 'OPERATOR_ONLY'].includes(resource.accessLevel)
        );
      }
      
      return resources.filter(resource => resource.accessLevel === 'PUBLIC');
    },

    // Resolve case studies
    caseStudies: async (parent, _, { db, user }) => {
      const caseStudies = await db.caseStudies.findByPartnerId(parent.id);
      
      // Filter private case studies for public users
      if (!user) {
        return caseStudies.filter(cs => cs.isPublic);
      }
      
      return caseStudies;
    },

    // Resolve operators
    operators: async (parent, _, { loaders, user }) => {
      const operators = await loaders.operatorsByPartner.load(parent.id);
      
      // Filter by public profile setting for non-authenticated users
      if (!user) {
        return operators.filter(op => op.isPublicProfile);
      }
      
      return operators;
    },

    // Resolve API access (partner users only)
    apiAccess: async (parent, _, { db, user }) => {
      // Only partner users and admins can see API access
      if (!user || (user.role !== 'ADMIN' && user.role !== 'PARTNER')) {
        return null;
      }
      
      // Partner users can only see their own API access
      if (user.role === 'PARTNER' && parent.primaryContactId !== user.id) {
        return null;
      }
      
      return await db.apiAccess.findByPartnerId(parent.id);
    },

    // Resolve leads (partner users and admins only)
    leads: async (parent, _, { db, user }) => {
      // Only partner users and admins can see leads
      if (!user || (user.role !== 'ADMIN' && user.role !== 'PARTNER')) {
        return [];
      }
      
      // Partner users can only see their own leads
      if (user.role === 'PARTNER' && parent.primaryContactId !== user.id) {
        return [];
      }
      
      return await db.leads.findByPartnerId(parent.id);
    },

    // Track profile views (increment on access)
    profileViews: async (parent, _, { db, analytics, user }) => {
      // Only increment for public views (not partner's own views)
      if (!user || (user.role !== 'PARTNER' && parent.primaryContactId !== user.id)) {
        await db.partners.incrementProfileViews(parent.id);
        
        // Track analytics
        await analytics.track('partner_profile_viewed', {
          partnerId: parent.id,
          userId: user?.id,
        });
      }
      
      return parent.profileViews + 1;
    },
  },
};

export default partnerResolvers;