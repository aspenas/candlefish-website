/**
 * Documentation Resolvers - Public documentation management
 * Philosophy: Operational craft - clear, maintainable documentation system
 */

import { IResolvers } from '@graphql-tools/utils';
import { Context, requireAuth, requireRole, authorized } from '../context';
import { withFilter } from 'graphql-subscriptions';
import { 
  Documentation, 
  DocumentationCategory, 
  CreateDocumentationInput, 
  UpdateDocumentationInput,
  ContentStatus 
} from '../../types';

export const documentationResolvers: IResolvers<any, Context> = {
  Query: {
    // Get single documentation by slug (public)
    documentation: async (_, { slug }, { loaders }) => {
      return await loaders.documentationBySlug.load(slug);
    },

    // Get single documentation by ID (public)
    documentationById: async (_, { id }, { loaders }) => {
      return await loaders.documentationById.load(id);
    },

    // Get all documentation with filtering and pagination
    allDocumentation: async (
      _,
      { first = 20, after, category, status, tags },
      { db, user }
    ) => {
      // Filter by status - only published for non-authenticated users
      let statusFilter = status;
      if (!user && !statusFilter) {
        statusFilter = ContentStatus.PUBLISHED;
      }
      if (!user && statusFilter !== ContentStatus.PUBLISHED) {
        statusFilter = ContentStatus.PUBLISHED; // Override for public access
      }

      const result = await db.documentation.findMany({
        first,
        after,
        where: {
          categorySlug: category,
          status: statusFilter,
          tags: tags ? { hasSome: tags } : undefined,
        },
        orderBy: { updatedAt: 'desc' },
      });

      return {
        edges: result.items.map(doc => ({
          node: doc,
          cursor: doc.id,
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

    // Get documentation categories
    documentationCategories: async (_, __, { db }) => {
      return await db.documentationCategories.findMany({
        where: { isVisible: true },
        orderBy: { order: 'asc' },
      });
    },
  },

  Mutation: {
    // Create new documentation (editors only)
    createDocumentation: async (
      _,
      { input }: { input: CreateDocumentationInput },
      context: Context
    ) => {
      const user = requireRole(context, ['ADMIN', 'EDITOR']);
      const { db, loaders, analytics } = context;

      // Generate slug if not provided
      if (!input.slug) {
        input.slug = input.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
      }

      // Check slug uniqueness
      const existing = await loaders.documentationBySlug.load(input.slug);
      if (existing) {
        throw new Error(`Documentation with slug "${input.slug}" already exists`);
      }

      // Create documentation
      const documentation = await db.documentation.create({
        ...input,
        authorId: user.id,
        version: '1.0.0',
        views: 0,
      });

      // Track analytics
      await analytics.track('documentation_created', {
        documentationId: documentation.id,
        authorId: user.id,
        category: input.categoryId,
      });

      // Clear relevant caches
      loaders.documentationBySlug.clear(input.slug);
      loaders.documentationsByCategory.clear(input.categoryId);

      return documentation;
    },

    // Update documentation (editors only)
    updateDocumentation: async (
      _,
      { id, input }: { id: string; input: UpdateDocumentationInput },
      context: Context
    ) => {
      const user = requireRole(context, ['ADMIN', 'EDITOR']);
      const { db, loaders, analytics } = context;

      const existing = await loaders.documentationById.load(id);
      if (!existing) {
        throw new Error('Documentation not found');
      }

      // Check permissions (editors can only edit their own, admins can edit any)
      if (user.role !== 'ADMIN' && existing.authorId !== user.id) {
        throw new Error('Not authorized to edit this documentation');
      }

      // Update version if content changed
      let version = existing.version;
      if (input.content && input.content !== existing.content) {
        const [major, minor, patch] = version.split('.').map(Number);
        version = `${major}.${minor}.${patch + 1}`;
      }

      const updated = await db.documentation.update(id, {
        ...input,
        version,
        updatedAt: new Date(),
      });

      // Track analytics
      await analytics.track('documentation_updated', {
        documentationId: id,
        editorId: user.id,
        changes: Object.keys(input),
      });

      // Clear caches
      loaders.documentationById.clear(id);
      if (input.slug) {
        loaders.documentationBySlug.clear(input.slug);
      }
      if (existing.slug !== input.slug) {
        loaders.documentationBySlug.clear(existing.slug);
      }

      return updated;
    },

    // Delete documentation (admins only)
    deleteDocumentation: async (_, { id }, context: Context) => {
      const user = requireRole(context, ['ADMIN']);
      const { db, loaders, analytics } = context;

      const existing = await loaders.documentationById.load(id);
      if (!existing) {
        throw new Error('Documentation not found');
      }

      await db.documentation.delete(id);

      // Track analytics
      await analytics.track('documentation_deleted', {
        documentationId: id,
        deletedBy: user.id,
        title: existing.title,
      });

      // Clear caches
      loaders.documentationById.clear(id);
      loaders.documentationBySlug.clear(existing.slug);

      return true;
    },

    // Publish documentation (editors only)
    publishDocumentation: async (_, { id }, context: Context) => {
      const user = requireRole(context, ['ADMIN', 'EDITOR']);
      const { db, loaders, pubsub, analytics } = context;

      const existing = await loaders.documentationById.load(id);
      if (!existing) {
        throw new Error('Documentation not found');
      }

      // Check permissions
      if (user.role !== 'ADMIN' && existing.authorId !== user.id) {
        throw new Error('Not authorized to publish this documentation');
      }

      const published = await db.documentation.update(id, {
        status: ContentStatus.PUBLISHED,
        publishedAt: new Date(),
      });

      // Track analytics
      await analytics.track('documentation_published', {
        documentationId: id,
        publishedBy: user.id,
        title: existing.title,
      });

      // Notify subscribers
      pubsub.publish('DOCUMENTATION_PUBLISHED', { documentationPublished: published });

      // Clear caches
      loaders.documentationById.clear(id);

      return published;
    },
  },

  Subscription: {
    // Subscribe to documentation updates in a category
    documentationUpdated: {
      subscribe: withFilter(
        (_, __, { pubsub }) => pubsub.asyncIterator('DOCUMENTATION_UPDATED'),
        (payload, variables) => {
          if (!variables.categoryId) return true;
          return payload.documentationUpdated.categoryId === variables.categoryId;
        }
      ),
    },

    // Subscribe to newly published documentation
    documentationPublished: {
      subscribe: (_, __, { pubsub }) => pubsub.asyncIterator('DOCUMENTATION_PUBLISHED'),
    },
  },

  // Field resolvers for Documentation type
  Documentation: {
    // Resolve author using DataLoader
    author: async (parent, _, { loaders }) => {
      if (!parent.authorId) return null;
      return await loaders.userById.load(parent.authorId);
    },

    // Resolve category using DataLoader
    category: async (parent, _, { loaders, db }) => {
      if (!parent.categoryId) return null;
      return await db.documentationCategories.findById(parent.categoryId);
    },

    // Resolve related documents using DataLoader
    relatedDocuments: async (parent, _, { loaders }) => {
      return await loaders.relatedDocumentation.load(parent.id);
    },

    // Resolve content blocks
    blocks: async (parent, _, { db }) => {
      return await db.contentBlocks.findByDocumentId(parent.id);
    },

    // Resolve assets
    assets: async (parent, _, { loaders }) => {
      if (!parent.assetIds || parent.assetIds.length === 0) return [];
      return await loaders.assetsByIds.load(parent.assetIds);
    },

    // Resolve reactions using DataLoader
    reactions: async (parent, _, { loaders }) => {
      return await loaders.reactionsByContent.load(parent.id);
    },

    // Resolve feedback using DataLoader
    feedback: async (parent, _, { loaders }) => {
      return await loaders.feedbackByContent.load(parent.id);
    },

    // Calculate reading time based on content
    readingTime: (parent) => {
      const wordsPerMinute = 200;
      const wordCount = parent.content.split(/\s+/).length;
      return Math.ceil(wordCount / wordsPerMinute);
    },

    // Generate table of contents from content
    tableOfContents: (parent) => {
      const headingRegex = /^(#{1,6})\s+(.+)$/gm;
      const toc: any[] = [];
      let match;

      while ((match = headingRegex.exec(parent.content)) !== null) {
        const level = match[1].length;
        const title = match[2];
        const anchor = title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');

        toc.push({
          id: `toc-${toc.length}`,
          title,
          level,
          anchor,
          children: [],
        });
      }

      return toc;
    },

    // Track view count (increment on access)
    views: async (parent, _, { db, analytics, user }) => {
      // Increment view count
      await db.documentation.incrementViews(parent.id);

      // Track analytics
      await analytics.track('documentation_viewed', {
        documentationId: parent.id,
        userId: user?.id,
        title: parent.title,
      });

      return parent.views + 1;
    },
  },

  // Field resolvers for DocumentationCategory type
  DocumentationCategory: {
    // Resolve parent category
    parentCategory: async (parent, _, { db }) => {
      if (!parent.parentCategoryId) return null;
      return await db.documentationCategories.findById(parent.parentCategoryId);
    },

    // Resolve subcategories
    subcategories: async (parent, _, { db }) => {
      return await db.documentationCategories.findMany({
        where: { parentCategoryId: parent.id, isVisible: true },
        orderBy: { order: 'asc' },
      });
    },

    // Resolve documents in category
    documents: async (parent, _, { loaders }) => {
      return await loaders.documentationsByCategory.load(parent.id);
    },
  },
};

export default documentationResolvers;