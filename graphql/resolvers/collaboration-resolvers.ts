/**
 * Real-time Collaboration Resolvers
 * GraphQL resolvers with DataLoader patterns and caching strategies
 */

import { IResolvers } from '@graphql-tools/utils';
import { AuthContext } from '../types/context';
import { withFilter } from 'graphql-subscriptions';
import { ForbiddenError, UserInputError, ApolloError } from 'apollo-server-errors';
import {
  Document,
  DocumentVersion,
  Comment,
  PresenceSession,
  ActivityEvent,
  Operation,
  ConflictInfo,
  MergeResult,
  DocumentSharing,
  Annotation
} from '../types/collaboration';
import {
  CollaborationDataLoaders,
  DocumentDataLoader,
  CommentDataLoader,
  PresenceDataLoader,
  VersionDataLoader,
  ActivityDataLoader
} from '../dataloaders/collaboration-dataloaders';
import { CollaborationService } from '../services/collaboration-service';
import { PresenceService } from '../services/presence-service';
import { CommentService } from '../services/comment-service';
import { VersionControlService } from '../services/version-control-service';
import { ConflictResolutionService } from '../services/conflict-resolution-service';
import { IntegrationService } from '../services/integration-service';

// Import utility functions
import { validateDocumentAccess, hasDocumentPermission } from '../utils/authorization';
import { optimizeQuery, applyCaching } from '../utils/performance';
import { sanitizeInput, validateInput } from '../utils/validation';
import { auditLog } from '../utils/audit';
import { rateLimitCheck } from '../utils/rate-limiting';

export const collaborationResolvers: IResolvers = {
  // =============================================================================
  // QUERY RESOLVERS
  // =============================================================================
  Query: {
    // Document Queries
    document: async (
      parent,
      { id },
      context: AuthContext,
      info
    ): Promise<Document | null> => {
      await rateLimitCheck(context, 'document_query', 100, 60);

      const document = await context.dataLoaders.collaboration.document.load(id);
      if (!document) return null;

      await validateDocumentAccess(context.user!, document, 'VIEW');

      // Apply caching strategy
      const cacheKey = `document:${id}:${context.user!.id}`;
      return applyCaching(cacheKey, document, 300); // 5 min cache
    },

    documents: async (
      parent,
      { filter, sort, pagination },
      context: AuthContext,
      info
    ): Promise<any> => {
      await rateLimitCheck(context, 'documents_query', 50, 60);

      const service = new CollaborationService(context);
      const result = await service.getDocuments({
        filter: sanitizeInput(filter),
        sort: sort || [{ field: 'UPDATED_AT', direction: 'DESC' }],
        pagination: pagination || { first: 20 },
        userId: context.user!.id,
        organizationId: context.organizationId!
      });

      return optimizeQuery(result, info);
    },

    myDocuments: async (
      parent,
      { filter, sort, pagination },
      context: AuthContext,
      info
    ): Promise<any> => {
      const service = new CollaborationService(context);
      return service.getMyDocuments({
        filter,
        sort,
        pagination,
        userId: context.user!.id
      });
    },

    documentPresence: async (
      parent,
      { documentId },
      context: AuthContext,
      info
    ): Promise<PresenceSession[]> => {
      const document = await context.dataLoaders.collaboration.document.load(documentId);
      if (!document) throw new UserInputError('Document not found');

      await validateDocumentAccess(context.user!, document, 'VIEW');

      const presenceService = new PresenceService(context);
      return presenceService.getDocumentPresence(documentId);
    },

    documentComments: async (
      parent,
      { documentId, filter, sort, pagination },
      context: AuthContext,
      info
    ): Promise<any> => {
      const document = await context.dataLoaders.collaboration.document.load(documentId);
      if (!document) throw new UserInputError('Document not found');

      await validateDocumentAccess(context.user!, document, 'VIEW');

      const commentService = new CommentService(context);
      return commentService.getDocumentComments({
        documentId,
        filter,
        sort,
        pagination,
        userId: context.user!.id
      });
    },

    documentVersions: async (
      parent,
      { documentId, branchId, pagination },
      context: AuthContext,
      info
    ): Promise<any> => {
      const document = await context.dataLoaders.collaboration.document.load(documentId);
      if (!document) throw new UserInputError('Document not found');

      await validateDocumentAccess(context.user!, document, 'VIEW');

      const versionService = new VersionControlService(context);
      return versionService.getDocumentVersions({
        documentId,
        branchId,
        pagination,
        userId: context.user!.id
      });
    },

    documentActivity: async (
      parent,
      { documentId, filter, pagination },
      context: AuthContext,
      info
    ): Promise<any> => {
      const document = await context.dataLoaders.collaboration.document.load(documentId);
      if (!document) throw new UserInputError('Document not found');

      await validateDocumentAccess(context.user!, document, 'VIEW');

      // Use DataLoader for activity events
      const activities = await context.dataLoaders.collaboration.activity
        .loadMany([documentId]);

      return {
        edges: activities.map((activity: ActivityEvent) => ({
          node: activity,
          cursor: Buffer.from(activity.id).toString('base64')
        })),
        pageInfo: {
          hasNextPage: false, // Implement pagination logic
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null
        },
        totalCount: activities.length
      };
    },

    searchDocuments: async (
      parent,
      { query, filter, sort, pagination },
      context: AuthContext,
      info
    ): Promise<any> => {
      await rateLimitCheck(context, 'search_query', 20, 60);

      const service = new CollaborationService(context);
      return service.searchDocuments({
        query: sanitizeInput(query),
        filter,
        sort,
        pagination,
        userId: context.user!.id,
        organizationId: context.organizationId!
      });
    }
  },

  // =============================================================================
  // MUTATION RESOLVERS
  // =============================================================================
  Mutation: {
    // Document Mutations
    createDocument: async (
      parent,
      { input },
      context: AuthContext,
      info
    ): Promise<Document> => {
      await rateLimitCheck(context, 'create_document', 10, 3600);
      await validateInput(input, 'CreateDocumentInput');

      const service = new CollaborationService(context);
      const document = await service.createDocument({
        ...input,
        ownerId: context.user!.id,
        organizationId: context.organizationId!
      });

      // Audit log
      await auditLog(context, 'DOCUMENT_CREATED', 'DOCUMENT', document.id, {
        documentName: document.name,
        documentType: document.type
      });

      // Invalidate cache
      await context.cache.del(`user:${context.user!.id}:documents`);

      return document;
    },

    updateDocumentContent: async (
      parent,
      { input },
      context: AuthContext,
      info
    ): Promise<any> => {
      await validateInput(input, 'UpdateDocumentContentInput');

      const document = await context.dataLoaders.collaboration.document
        .load(input.documentId);
      if (!document) throw new UserInputError('Document not found');

      await validateDocumentAccess(context.user!, document, 'EDIT');

      const service = new CollaborationService(context);
      const result = await service.updateDocumentContent({
        documentId: input.documentId,
        operations: input.operations,
        conflictResolution: input.conflictResolution,
        userId: context.user!.id
      });

      // Publish real-time update
      await context.pubsub.publish(`DOCUMENT_CONTENT_CHANGED:${input.documentId}`, {
        documentContentChanged: {
          type: 'CONTENT_UPDATED',
          document: result.document,
          operations: result.appliedOperations,
          author: context.user,
          timestamp: new Date(),
          affectedBlocks: result.appliedOperations.map(op => op.blockId),
          changeCount: result.appliedOperations.length,
          newChecksum: result.newChecksum,
          sessionId: context.requestId,
          conflictsDetected: result.conflicts
        }
      });

      return result;
    },

    shareDocument: async (
      parent,
      { input },
      context: AuthContext,
      info
    ): Promise<DocumentSharing> => {
      await rateLimitCheck(context, 'share_document', 20, 3600);
      await validateInput(input, 'ShareDocumentInput');

      const document = await context.dataLoaders.collaboration.document
        .load(input.documentId);
      if (!document) throw new UserInputError('Document not found');

      await validateDocumentAccess(context.user!, document, 'SHARE');

      const service = new CollaborationService(context);
      const sharing = await service.shareDocument(input, context.user!.id);

      // Audit log
      await auditLog(context, 'DOCUMENT_SHARED', 'DOCUMENT', document.id, {
        sharedWith: [...(input.userIds || []), ...(input.emails || [])],
        permission: input.permission
      });

      return sharing;
    },

    // Presence Mutations
    joinDocument: async (
      parent,
      { input },
      context: AuthContext,
      info
    ): Promise<PresenceSession> => {
      await rateLimitCheck(context, 'join_document', 50, 60);

      const document = await context.dataLoaders.collaboration.document
        .load(input.documentId);
      if (!document) throw new UserInputError('Document not found');

      await validateDocumentAccess(context.user!, document, 'VIEW');

      const presenceService = new PresenceService(context);
      const session = await presenceService.joinDocument({
        documentId: input.documentId,
        userId: context.user!.id,
        permissions: input.permissions || ['VIEW'],
        deviceInfo: context.req.headers['user-agent']
      });

      // Publish presence change
      await context.pubsub.publish(`DOCUMENT_PRESENCE_CHANGED:${input.documentId}`, {
        documentPresenceChanged: {
          type: 'USER_JOINED',
          session,
          timestamp: new Date(),
          documentId: input.documentId,
          activeUserCount: await presenceService.getActiveUserCount(input.documentId)
        }
      });

      return session;
    },

    updatePresence: async (
      parent,
      { input },
      context: AuthContext,
      info
    ): Promise<PresenceSession> => {
      await rateLimitCheck(context, 'update_presence', 1000, 60);

      const presenceService = new PresenceService(context);
      const session = await presenceService.updatePresence({
        userId: context.user!.id,
        ...input
      });

      // Publish cursor position change
      if (input.cursor) {
        await context.pubsub.publish(`CURSOR_POSITION_CHANGED:${session.documentId}`, {
          cursorPositionChanged: {
            session,
            cursor: input.cursor,
            selection: input.selection,
            timestamp: new Date(),
            documentId: session.documentId,
            blockId: input.cursor.blockId
          }
        });
      }

      return session;
    },

    // Comment Mutations
    addComment: async (
      parent,
      { input },
      context: AuthContext,
      info
    ): Promise<Comment> => {
      await rateLimitCheck(context, 'add_comment', 100, 3600);
      await validateInput(input, 'CreateCommentInput');

      const document = await context.dataLoaders.collaboration.document
        .load(input.documentId);
      if (!document) throw new UserInputError('Document not found');

      await validateDocumentAccess(context.user!, document, 'COMMENT');

      const commentService = new CommentService(context);
      const comment = await commentService.addComment({
        ...input,
        authorId: context.user!.id
      });

      // Handle mentions
      if (input.mentions && input.mentions.length > 0) {
        await commentService.processMentions(comment.id, input.mentions);
      }

      // Publish comment event
      await context.pubsub.publish(`COMMENT_ADDED:${input.documentId}`, {
        commentAdded: {
          comment,
          author: context.user,
          timestamp: new Date(),
          documentId: input.documentId,
          threadId: comment.threadId,
          mentionedUsers: input.mentions ?
            await context.dataLoaders.collaboration.user.loadMany(input.mentions) : []
        }
      });

      return comment;
    },

    resolveComment: async (
      parent,
      { input },
      context: AuthContext,
      info
    ): Promise<Comment> => {
      const comment = await context.dataLoaders.collaboration.comment.load(input.id);
      if (!comment) throw new UserInputError('Comment not found');

      const document = await context.dataLoaders.collaboration.document
        .load(comment.documentId);
      await validateDocumentAccess(context.user!, document!, 'COMMENT');

      const commentService = new CommentService(context);
      const resolvedComment = await commentService.resolveComment({
        commentId: input.id,
        resolution: input.resolution,
        resolvedBy: context.user!.id,
        resolveThread: input.resolveThread
      });

      // Publish resolution event
      await context.pubsub.publish(`COMMENT_RESOLUTION_CHANGED:${document!.id}`, {
        commentResolutionChanged: {
          comment: resolvedComment,
          thread: resolvedComment.thread,
          resolvedBy: context.user,
          timestamp: new Date(),
          isResolved: true,
          resolution: input.resolution,
          affectedComments: input.resolveThread ?
            await commentService.getThreadCommentCount(resolvedComment.threadId) : 1
        }
      });

      return resolvedComment;
    },

    // Version Control Mutations
    createDocumentVersion: async (
      parent,
      { input },
      context: AuthContext,
      info
    ): Promise<DocumentVersion> => {
      await rateLimitCheck(context, 'create_version', 20, 3600);

      const document = await context.dataLoaders.collaboration.document
        .load(input.documentId);
      if (!document) throw new UserInputError('Document not found');

      await validateDocumentAccess(context.user!, document, 'EDIT');

      const versionService = new VersionControlService(context);
      const version = await versionService.createVersion({
        ...input,
        authorId: context.user!.id
      });

      // Publish version event
      await context.pubsub.publish(`DOCUMENT_VERSION_CREATED:${input.documentId}`, {
        documentVersionCreated: {
          version,
          document,
          createdBy: context.user,
          timestamp: new Date(),
          isMajorVersion: input.isMajorVersion || false,
          changesSummary: input.description,
          diffStats: await versionService.calculateDiffStats(version.id)
        }
      });

      return version;
    },

    mergeBranches: async (
      parent,
      { input },
      context: AuthContext,
      info
    ): Promise<MergeResult> => {
      await validateInput(input, 'MergeBranchInput');

      const sourceBranch = await context.dataLoaders.collaboration.branch
        .load(input.sourceBranchId);
      const targetBranch = await context.dataLoaders.collaboration.branch
        .load(input.targetBranchId);

      if (!sourceBranch || !targetBranch) {
        throw new UserInputError('Branch not found');
      }

      const document = await context.dataLoaders.collaboration.document
        .load(sourceBranch.documentId);
      await validateDocumentAccess(context.user!, document!, 'EDIT');

      const versionService = new VersionControlService(context);
      const conflictService = new ConflictResolutionService(context);

      const mergeResult = await versionService.mergeBranches({
        sourceBranchId: input.sourceBranchId,
        targetBranchId: input.targetBranchId,
        strategy: input.strategy,
        resolveConflicts: input.resolveConflicts,
        mergedBy: context.user!.id
      });

      // Handle conflict resolution
      if (input.resolveConflicts && input.resolveConflicts.length > 0) {
        for (const resolution of input.resolveConflicts) {
          await conflictService.resolveConflict({
            conflictId: resolution.conflictId,
            resolution: resolution.resolution,
            resolvedBy: context.user!.id
          });
        }
      }

      // Publish merge event
      await context.pubsub.publish(`DOCUMENT_MERGE_ACTIVITY:${document!.id}`, {
        documentMergeActivity: {
          type: mergeResult.success ? 'MERGE_COMPLETED' : 'MERGE_FAILED',
          merge: mergeResult,
          document: document!,
          mergedBy: context.user,
          timestamp: new Date(),
          sourceBranch,
          targetBranch,
          conflictCount: mergeResult.conflictCount
        }
      });

      return mergeResult;
    }
  },

  // =============================================================================
  // SUBSCRIPTION RESOLVERS
  // =============================================================================
  Subscription: {
    documentContentChanged: {
      subscribe: withFilter(
        (parent, args, context: AuthContext) => {
          return context.pubsub.asyncIterator(`DOCUMENT_CONTENT_CHANGED:${args.documentId}`);
        },
        async (payload, variables, context: AuthContext) => {
          // Verify user has access to document
          const document = await context.dataLoaders.collaboration.document
            .load(variables.documentId);
          if (!document) return false;

          try {
            await validateDocumentAccess(context.user!, document, 'VIEW');
            return true;
          } catch {
            return false;
          }
        }
      )
    },

    documentPresenceChanged: {
      subscribe: withFilter(
        (parent, args, context: AuthContext) => {
          return context.pubsub.asyncIterator(`DOCUMENT_PRESENCE_CHANGED:${args.documentId}`);
        },
        async (payload, variables, context: AuthContext) => {
          // Filter out user's own presence changes if desired
          return payload.documentPresenceChanged.session.userId !== context.user!.id;
        }
      )
    },

    cursorPositionChanged: {
      subscribe: withFilter(
        (parent, args, context: AuthContext) => {
          return context.pubsub.asyncIterator(`CURSOR_POSITION_CHANGED:${args.documentId}`);
        },
        async (payload, variables, context: AuthContext) => {
          // Don't send cursor events back to the same user
          return payload.cursorPositionChanged.session.userId !== context.user!.id;
        }
      )
    },

    commentAdded: {
      subscribe: withFilter(
        (parent, args, context: AuthContext) => {
          return context.pubsub.asyncIterator(`COMMENT_ADDED:${args.documentId}`);
        },
        async (payload, variables, context: AuthContext) => {
          const document = await context.dataLoaders.collaboration.document
            .load(variables.documentId);
          if (!document) return false;

          try {
            await validateDocumentAccess(context.user!, document, 'VIEW');
            return true;
          } catch {
            return false;
          }
        }
      )
    },

    documentActivity: {
      subscribe: withFilter(
        (parent, args, context: AuthContext) => {
          return context.pubsub.asyncIterator([
            `DOCUMENT_ACTIVITY:${args.documentId}`,
            `COMMENT_ADDED:${args.documentId}`,
            `DOCUMENT_CONTENT_CHANGED:${args.documentId}`,
            `DOCUMENT_VERSION_CREATED:${args.documentId}`
          ]);
        },
        async (payload, variables, context: AuthContext) => {
          // Apply activity filter if provided
          if (variables.filter) {
            const activity = payload.documentActivity ||
                           payload.commentAdded ||
                           payload.documentContentChanged ||
                           payload.documentVersionCreated;

            if (variables.filter.types &&
                !variables.filter.types.includes(activity.type)) {
              return false;
            }

            if (variables.filter.severity &&
                !variables.filter.severity.includes(activity.severity)) {
              return false;
            }
          }

          return true;
        }
      )
    }
  },

  // =============================================================================
  // FIELD RESOLVERS
  // =============================================================================
  Document: {
    owner: async (parent: Document, args, context: AuthContext) => {
      return context.dataLoaders.user.load(parent.ownerId);
    },

    organization: async (parent: Document, args, context: AuthContext) => {
      return context.dataLoaders.organization.load(parent.organizationId);
    },

    activeUsers: async (parent: Document, args, context: AuthContext) => {
      const presenceService = new PresenceService(context);
      return presenceService.getDocumentPresence(parent.id);
    },

    comments: async (parent: Document, args, context: AuthContext) => {
      return context.dataLoaders.collaboration.documentComments.load(parent.id);
    },

    versions: async (parent: Document, args, context: AuthContext) => {
      return context.dataLoaders.collaboration.documentVersions.load(parent.id);
    },

    currentVersion: async (parent: Document, args, context: AuthContext) => {
      return context.dataLoaders.collaboration.documentVersion.load(parent.currentVersionId);
    },

    activity: async (parent: Document, args, context: AuthContext) => {
      return context.dataLoaders.collaboration.documentActivity.load(parent.id);
    },

    metrics: async (parent: Document, args, context: AuthContext) => {
      const service = new CollaborationService(context);
      return service.getDocumentMetrics(parent.id);
    },

    paintboxEstimate: async (parent: Document, args, context: AuthContext) => {
      if (!parent.paintboxEstimateId) return null;

      const integrationService = new IntegrationService(context);
      return integrationService.getPaintboxEstimate(parent.paintboxEstimateId);
    },

    brandPortalTheme: async (parent: Document, args, context: AuthContext) => {
      if (!parent.brandPortalThemeId) return null;

      const integrationService = new IntegrationService(context);
      return integrationService.getBrandPortalTheme(parent.brandPortalThemeId);
    }
  },

  Comment: {
    author: async (parent: Comment, args, context: AuthContext) => {
      return context.dataLoaders.user.load(parent.authorId);
    },

    document: async (parent: Comment, args, context: AuthContext) => {
      return context.dataLoaders.collaboration.document.load(parent.documentId);
    },

    thread: async (parent: Comment, args, context: AuthContext) => {
      if (!parent.threadId) return null;
      return context.dataLoaders.collaboration.commentThread.load(parent.threadId);
    },

    parentComment: async (parent: Comment, args, context: AuthContext) => {
      if (!parent.parentCommentId) return null;
      return context.dataLoaders.collaboration.comment.load(parent.parentCommentId);
    },

    replies: async (parent: Comment, args, context: AuthContext) => {
      return context.dataLoaders.collaboration.commentReplies.load(parent.id);
    },

    reactions: async (parent: Comment, args, context: AuthContext) => {
      return context.dataLoaders.collaboration.commentReactions.load(parent.id);
    },

    mentions: async (parent: Comment, args, context: AuthContext) => {
      const mentionUserIds = parent.content.mentions?.map(m => m.userId) || [];
      if (mentionUserIds.length === 0) return [];
      return context.dataLoaders.user.loadMany(mentionUserIds);
    }
  },

  PresenceSession: {
    user: async (parent: PresenceSession, args, context: AuthContext) => {
      return context.dataLoaders.user.load(parent.userId);
    },

    document: async (parent: PresenceSession, args, context: AuthContext) => {
      return context.dataLoaders.collaboration.document.load(parent.documentId);
    }
  },

  DocumentVersion: {
    author: async (parent: DocumentVersion, args, context: AuthContext) => {
      return context.dataLoaders.user.load(parent.authorId);
    },

    document: async (parent: DocumentVersion, args, context: AuthContext) => {
      return context.dataLoaders.collaboration.document.load(parent.documentId);
    },

    parentVersion: async (parent: DocumentVersion, args, context: AuthContext) => {
      if (!parent.parentVersionId) return null;
      return context.dataLoaders.collaboration.documentVersion.load(parent.parentVersionId);
    },

    changes: async (parent: DocumentVersion, args, context: AuthContext) => {
      const versionService = new VersionControlService(context);
      return versionService.getVersionChanges(parent.id);
    }
  },

  ActivityEvent: {
    actor: async (parent: ActivityEvent, args, context: AuthContext) => {
      if (!parent.actorId) return null;
      return context.dataLoaders.user.load(parent.actorId);
    },

    target: async (parent: ActivityEvent, args, context: AuthContext) => {
      if (!parent.targetId) return null;

      switch (parent.targetType) {
        case 'DOCUMENT':
          return context.dataLoaders.collaboration.document.load(parent.targetId);
        case 'COMMENT':
          return context.dataLoaders.collaboration.comment.load(parent.targetId);
        case 'VERSION':
          return context.dataLoaders.collaboration.documentVersion.load(parent.targetId);
        case 'USER':
          return context.dataLoaders.user.load(parent.targetId);
        default:
          return null;
      }
    }
  }
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Validate document access with caching
 */
async function validateDocumentAccessCached(
  context: AuthContext,
  documentId: string,
  permission: string
): Promise<void> {
  const cacheKey = `access:${context.user!.id}:${documentId}:${permission}`;
  const cached = await context.cache.get(cacheKey);

  if (cached === 'true') return;
  if (cached === 'false') throw new ForbiddenError('Access denied');

  try {
    const document = await context.dataLoaders.collaboration.document.load(documentId);
    if (!document) throw new UserInputError('Document not found');

    await validateDocumentAccess(context.user!, document, permission);

    // Cache successful access check for 5 minutes
    await context.cache.set(cacheKey, 'true', 300);
  } catch (error) {
    // Cache failed access check for 1 minute
    await context.cache.set(cacheKey, 'false', 60);
    throw error;
  }
}

/**
 * Helper function to publish activity events
 */
async function publishActivityEvent(
  context: AuthContext,
  documentId: string,
  event: Partial<ActivityEvent>
): Promise<void> {
  const activityEvent: ActivityEvent = {
    id: generateId(),
    documentId,
    type: event.type!,
    action: event.action!,
    description: event.description!,
    actorId: context.user!.id,
    actorType: 'USER',
    targetType: event.targetType!,
    targetId: event.targetId,
    context: event.context || {},
    metadata: event.metadata || {},
    impact: {
      severity: event.impact?.severity || 'INFO',
      scope: event.impact?.scope || 'DOCUMENT',
      affectedUsers: event.impact?.affectedUsers || [context.user!.id],
      changesCount: event.impact?.changesCount || 1
    },
    timestamp: new Date(),
    processedAt: new Date()
  };

  // Store activity event
  const service = new CollaborationService(context);
  await service.recordActivity(activityEvent);

  // Publish to subscribers
  await context.pubsub.publish(`DOCUMENT_ACTIVITY:${documentId}`, {
    documentActivity: activityEvent
  });
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return require('crypto').randomUUID();
}

/**
 * Enhanced error handling with context
 */
class CollaborationError extends ApolloError {
  constructor(message: string, code: string, context?: any) {
    super(message, code);
    this.extensions.context = context;
  }
}

export default collaborationResolvers;
