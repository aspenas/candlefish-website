/**
 * Collaboration DataLoaders
 * Efficient data fetching with batching and caching for collaboration entities
 */

import DataLoader from 'dataloader';
import { AuthContext } from '../types/context';
import {
  Document,
  DocumentVersion,
  Comment,
  CommentThread,
  PresenceSession,
  ActivityEvent,
  Annotation,
  DocumentBranch,
  User,
  Organization
} from '../types/collaboration';

// =============================================================================
// DATALOADER INTERFACES
// =============================================================================

export interface CollaborationDataLoaders {
  // Document loaders
  document: DataLoader<string, Document | null>;
  documentsByOwner: DataLoader<string, Document[]>;
  documentsByOrganization: DataLoader<string, Document[]>;
  documentsRecent: DataLoader<string, Document[]>;
  documentVersions: DataLoader<string, DocumentVersion[]>;
  documentVersion: DataLoader<string, DocumentVersion | null>;
  documentComments: DataLoader<string, Comment[]>;
  documentActivity: DataLoader<string, ActivityEvent[]>;
  documentBranches: DataLoader<string, DocumentBranch[]>;

  // Comment loaders
  comment: DataLoader<string, Comment | null>;
  commentThread: DataLoader<string, CommentThread | null>;
  commentReplies: DataLoader<string, Comment[]>;
  commentReactions: DataLoader<string, any[]>;
  commentsByAuthor: DataLoader<string, Comment[]>;

  // Presence loaders
  presenceSession: DataLoader<string, PresenceSession | null>;
  documentPresence: DataLoader<string, PresenceSession[]>;
  userPresence: DataLoader<string, PresenceSession[]>;

  // Activity loaders
  activity: DataLoader<string, ActivityEvent[]>;
  activityByUser: DataLoader<string, ActivityEvent[]>;
  activityByDocument: DataLoader<string, ActivityEvent[]>;

  // Annotation loaders
  annotation: DataLoader<string, Annotation | null>;
  documentAnnotations: DataLoader<string, Annotation[]>;

  // User and organization loaders (extended)
  user: DataLoader<string, User | null>;
  organization: DataLoader<string, Organization | null>;

  // Branch loaders
  branch: DataLoader<string, DocumentBranch | null>;
  branchVersions: DataLoader<string, DocumentVersion[]>;
}

// =============================================================================
// DATALOADER FACTORY
// =============================================================================

export function createCollaborationDataLoaders(context: AuthContext): CollaborationDataLoaders {
  return {
    // Document loaders
    document: createDocumentLoader(context),
    documentsByOwner: createDocumentsByOwnerLoader(context),
    documentsByOrganization: createDocumentsByOrganizationLoader(context),
    documentsRecent: createDocumentsRecentLoader(context),
    documentVersions: createDocumentVersionsLoader(context),
    documentVersion: createDocumentVersionLoader(context),
    documentComments: createDocumentCommentsLoader(context),
    documentActivity: createDocumentActivityLoader(context),
    documentBranches: createDocumentBranchesLoader(context),

    // Comment loaders
    comment: createCommentLoader(context),
    commentThread: createCommentThreadLoader(context),
    commentReplies: createCommentRepliesLoader(context),
    commentReactions: createCommentReactionsLoader(context),
    commentsByAuthor: createCommentsByAuthorLoader(context),

    // Presence loaders
    presenceSession: createPresenceSessionLoader(context),
    documentPresence: createDocumentPresenceLoader(context),
    userPresence: createUserPresenceLoader(context),

    // Activity loaders
    activity: createActivityLoader(context),
    activityByUser: createActivityByUserLoader(context),
    activityByDocument: createActivityByDocumentLoader(context),

    // Annotation loaders
    annotation: createAnnotationLoader(context),
    documentAnnotations: createDocumentAnnotationsLoader(context),

    // User and organization loaders
    user: createUserLoader(context),
    organization: createOrganizationLoader(context),

    // Branch loaders
    branch: createBranchLoader(context),
    branchVersions: createBranchVersionsLoader(context)
  };
}

// =============================================================================
// DOCUMENT LOADERS
// =============================================================================

function createDocumentLoader(context: AuthContext): DataLoader<string, Document | null> {
  return new DataLoader<string, Document | null>(
    async (documentIds: readonly string[]) => {
      const sql = `
        SELECT d.*,
               o.name as organization_name,
               u.first_name as owner_first_name,
               u.last_name as owner_last_name,
               dc.content_data,
               dc.checksum,
               dc.size_bytes
        FROM documents d
        LEFT JOIN organizations o ON d.organization_id = o.id
        LEFT JOIN users u ON d.owner_id = u.id
        LEFT JOIN document_content dc ON d.id = dc.document_id
        WHERE d.id = ANY($1)
          AND d.deleted_at IS NULL
          AND (d.organization_id = $2 OR d.is_public = true)
        ORDER BY d.updated_at DESC
      `;

      const results = await context.db.query(sql, [
        Array.from(documentIds),
        context.organizationId
      ]);

      // Create lookup map
      const documentMap = new Map<string, Document>();
      results.forEach((row: any) => {
        documentMap.set(row.id, transformRowToDocument(row));
      });

      // Return results in the same order as requested
      return documentIds.map(id => documentMap.get(id) || null);
    },
    {
      // Caching options
      cacheKeyFn: (key: string) => `document:${key}:${context.organizationId}`,
      batchScheduleFn: callback => setTimeout(callback, 10), // 10ms batch window
      maxBatchSize: 100
    }
  );
}

function createDocumentsByOwnerLoader(context: AuthContext): DataLoader<string, Document[]> {
  return new DataLoader<string, Document[]>(
    async (ownerIds: readonly string[]) => {
      const sql = `
        SELECT d.*, COUNT(c.id) as comment_count,
               COUNT(DISTINCT p.user_id) as collaborator_count
        FROM documents d
        LEFT JOIN comments c ON d.id = c.document_id AND c.deleted_at IS NULL
        LEFT JOIN document_permissions dp ON d.id = dp.document_id
        LEFT JOIN presence_sessions p ON d.id = p.document_id AND p.status = 'ACTIVE'
        WHERE d.owner_id = ANY($1)
          AND d.deleted_at IS NULL
          AND d.organization_id = $2
        GROUP BY d.id
        ORDER BY d.updated_at DESC
        LIMIT 100
      `;

      const results = await context.db.query(sql, [
        Array.from(ownerIds),
        context.organizationId
      ]);

      // Group by owner
      const ownerDocuments = new Map<string, Document[]>();
      results.forEach((row: any) => {
        const document = transformRowToDocument(row);
        const ownerId = row.owner_id;

        if (!ownerDocuments.has(ownerId)) {
          ownerDocuments.set(ownerId, []);
        }
        ownerDocuments.get(ownerId)!.push(document);
      });

      return ownerIds.map(ownerId => ownerDocuments.get(ownerId) || []);
    },
    {
      cacheKeyFn: (key: string) => `documents_by_owner:${key}:${context.organizationId}`,
      maxBatchSize: 10
    }
  );
}

function createDocumentVersionsLoader(context: AuthContext): DataLoader<string, DocumentVersion[]> {
  return new DataLoader<string, DocumentVersion[]>(
    async (documentIds: readonly string[]) => {
      const sql = `
        SELECT dv.*, u.first_name, u.last_name,
               dc.content_data, dc.checksum, dc.size_bytes,
               CASE WHEN dv.id = d.current_version_id THEN true ELSE false END as is_current
        FROM document_versions dv
        LEFT JOIN users u ON dv.author_id = u.id
        LEFT JOIN document_content dc ON dv.id = dc.version_id
        LEFT JOIN documents d ON dv.document_id = d.id
        WHERE dv.document_id = ANY($1)
          AND dv.deleted_at IS NULL
        ORDER BY dv.created_at DESC
        LIMIT 50
      `;

      const results = await context.db.query(sql, [Array.from(documentIds)]);

      // Group by document ID
      const versionsByDocument = new Map<string, DocumentVersion[]>();
      results.forEach((row: any) => {
        const version = transformRowToDocumentVersion(row);
        const documentId = row.document_id;

        if (!versionsByDocument.has(documentId)) {
          versionsByDocument.set(documentId, []);
        }
        versionsByDocument.get(documentId)!.push(version);
      });

      return documentIds.map(docId => versionsByDocument.get(docId) || []);
    },
    {
      cacheKeyFn: (key: string) => `document_versions:${key}`,
      maxBatchSize: 20
    }
  );
}

// =============================================================================
// COMMENT LOADERS
// =============================================================================

function createCommentLoader(context: AuthContext): DataLoader<string, Comment | null> {
  return new DataLoader<string, Comment | null>(
    async (commentIds: readonly string[]) => {
      const sql = `
        SELECT c.*, u.first_name, u.last_name, u.avatar,
               ct.subject as thread_subject,
               COUNT(cr.id) as reply_count,
               COUNT(DISTINCT react.id) as reaction_count
        FROM comments c
        LEFT JOIN users u ON c.author_id = u.id
        LEFT JOIN comment_threads ct ON c.thread_id = ct.id
        LEFT JOIN comments cr ON c.id = cr.parent_comment_id AND cr.deleted_at IS NULL
        LEFT JOIN comment_reactions react ON c.id = react.comment_id
        WHERE c.id = ANY($1) AND c.deleted_at IS NULL
        GROUP BY c.id, u.id, ct.id
      `;

      const results = await context.db.query(sql, [Array.from(commentIds)]);

      const commentMap = new Map<string, Comment>();
      results.forEach((row: any) => {
        commentMap.set(row.id, transformRowToComment(row));
      });

      return commentIds.map(id => commentMap.get(id) || null);
    },
    {
      cacheKeyFn: (key: string) => `comment:${key}`,
      maxBatchSize: 50
    }
  );
}

function createDocumentCommentsLoader(context: AuthContext): DataLoader<string, Comment[]> {
  return new DataLoader<string, Comment[]>(
    async (documentIds: readonly string[]) => {
      const sql = `
        SELECT c.*, u.first_name, u.last_name, u.avatar,
               COUNT(cr.id) as reply_count
        FROM comments c
        LEFT JOIN users u ON c.author_id = u.id
        LEFT JOIN comments cr ON c.id = cr.parent_comment_id AND cr.deleted_at IS NULL
        WHERE c.document_id = ANY($1)
          AND c.deleted_at IS NULL
          AND c.parent_comment_id IS NULL -- Root comments only
        GROUP BY c.id, u.id
        ORDER BY c.created_at DESC
        LIMIT 100
      `;

      const results = await context.db.query(sql, [Array.from(documentIds)]);

      const commentsByDocument = new Map<string, Comment[]>();
      results.forEach((row: any) => {
        const comment = transformRowToComment(row);
        const documentId = row.document_id;

        if (!commentsByDocument.has(documentId)) {
          commentsByDocument.set(documentId, []);
        }
        commentsByDocument.get(documentId)!.push(comment);
      });

      return documentIds.map(docId => commentsByDocument.get(docId) || []);
    },
    {
      cacheKeyFn: (key: string) => `document_comments:${key}`,
      maxBatchSize: 20
    }
  );
}

function createCommentRepliesLoader(context: AuthContext): DataLoader<string, Comment[]> {
  return new DataLoader<string, Comment[]>(
    async (commentIds: readonly string[]) => {
      const sql = `
        SELECT c.*, u.first_name, u.last_name, u.avatar
        FROM comments c
        LEFT JOIN users u ON c.author_id = u.id
        WHERE c.parent_comment_id = ANY($1)
          AND c.deleted_at IS NULL
        ORDER BY c.created_at ASC
      `;

      const results = await context.db.query(sql, [Array.from(commentIds)]);

      const repliesByComment = new Map<string, Comment[]>();
      results.forEach((row: any) => {
        const reply = transformRowToComment(row);
        const parentId = row.parent_comment_id;

        if (!repliesByComment.has(parentId)) {
          repliesByComment.set(parentId, []);
        }
        repliesByComment.get(parentId)!.push(reply);
      });

      return commentIds.map(commentId => repliesByComment.get(commentId) || []);
    },
    {
      cacheKeyFn: (key: string) => `comment_replies:${key}`,
      maxBatchSize: 50
    }
  );
}

// =============================================================================
// PRESENCE LOADERS
// =============================================================================

function createDocumentPresenceLoader(context: AuthContext): DataLoader<string, PresenceSession[]> {
  return new DataLoader<string, PresenceSession[]>(
    async (documentIds: readonly string[]) => {
      const sql = `
        SELECT p.*, u.first_name, u.last_name, u.avatar,
               EXTRACT(EPOCH FROM (NOW() - p.last_seen_at))::int as seconds_since_seen
        FROM presence_sessions p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.document_id = ANY($1)
          AND p.status IN ('ACTIVE', 'AWAY')
          AND p.last_seen_at > NOW() - INTERVAL '5 minutes'
        ORDER BY p.joined_at DESC
      `;

      const results = await context.db.query(sql, [Array.from(documentIds)]);

      const presenceByDocument = new Map<string, PresenceSession[]>();
      results.forEach((row: any) => {
        const session = transformRowToPresenceSession(row);
        const documentId = row.document_id;

        if (!presenceByDocument.has(documentId)) {
          presenceByDocument.set(documentId, []);
        }
        presenceByDocument.get(documentId)!.push(session);
      });

      return documentIds.map(docId => presenceByDocument.get(docId) || []);
    },
    {
      cacheKeyFn: (key: string) => `document_presence:${key}`,
      batchScheduleFn: callback => setTimeout(callback, 50), // Shorter batch for real-time
      maxBatchSize: 10
    }
  );
}

// =============================================================================
// ACTIVITY LOADERS
// =============================================================================

function createDocumentActivityLoader(context: AuthContext): DataLoader<string, ActivityEvent[]> {
  return new DataLoader<string, ActivityEvent[]>(
    async (documentIds: readonly string[]) => {
      const sql = `
        SELECT ae.*, u.first_name, u.last_name, u.avatar
        FROM activity_events ae
        LEFT JOIN users u ON ae.actor_id = u.id
        WHERE ae.document_id = ANY($1)
          AND ae.timestamp > NOW() - INTERVAL '30 days'
        ORDER BY ae.timestamp DESC
        LIMIT 100
      `;

      const results = await context.db.query(sql, [Array.from(documentIds)]);

      const activityByDocument = new Map<string, ActivityEvent[]>();
      results.forEach((row: any) => {
        const activity = transformRowToActivityEvent(row);
        const documentId = row.document_id;

        if (!activityByDocument.has(documentId)) {
          activityByDocument.set(documentId, []);
        }
        activityByDocument.get(documentId)!.push(activity);
      });

      return documentIds.map(docId => activityByDocument.get(docId) || []);
    },
    {
      cacheKeyFn: (key: string) => `document_activity:${key}`,
      maxBatchSize: 20
    }
  );
}

// =============================================================================
// USER AND ORGANIZATION LOADERS
// =============================================================================

function createUserLoader(context: AuthContext): DataLoader<string, User | null> {
  return new DataLoader<string, User | null>(
    async (userIds: readonly string[]) => {
      const sql = `
        SELECT u.*, om.role as org_role
        FROM users u
        LEFT JOIN organization_memberships om ON u.id = om.user_id
          AND om.organization_id = $2
        WHERE u.id = ANY($1) AND u.status = 'ACTIVE'
      `;

      const results = await context.db.query(sql, [
        Array.from(userIds),
        context.organizationId
      ]);

      const userMap = new Map<string, User>();
      results.forEach((row: any) => {
        userMap.set(row.id, transformRowToUser(row));
      });

      return userIds.map(id => userMap.get(id) || null);
    },
    {
      cacheKeyFn: (key: string) => `user:${key}:${context.organizationId}`,
      maxBatchSize: 100
    }
  );
}

function createOrganizationLoader(context: AuthContext): DataLoader<string, Organization | null> {
  return new DataLoader<string, Organization | null>(
    async (orgIds: readonly string[]) => {
      const sql = `
        SELECT o.*, COUNT(om.user_id) as member_count
        FROM organizations o
        LEFT JOIN organization_memberships om ON o.id = om.organization_id
        WHERE o.id = ANY($1) AND o.status = 'ACTIVE'
        GROUP BY o.id
      `;

      const results = await context.db.query(sql, [Array.from(orgIds)]);

      const orgMap = new Map<string, Organization>();
      results.forEach((row: any) => {
        orgMap.set(row.id, transformRowToOrganization(row));
      });

      return orgIds.map(id => orgMap.get(id) || null);
    },
    {
      cacheKeyFn: (key: string) => `organization:${key}`,
      maxBatchSize: 10
    }
  );
}

// =============================================================================
// ADDITIONAL LOADERS (Stubs for other entities)
// =============================================================================

function createCommentThreadLoader(context: AuthContext): DataLoader<string, CommentThread | null> {
  return new DataLoader<string, CommentThread | null>(
    async (threadIds: readonly string[]) => {
      // Implementation for comment thread loading
      const results = await context.db.query(
        'SELECT * FROM comment_threads WHERE id = ANY($1)',
        [Array.from(threadIds)]
      );

      const threadMap = new Map<string, CommentThread>();
      results.forEach((row: any) => {
        threadMap.set(row.id, transformRowToCommentThread(row));
      });

      return threadIds.map(id => threadMap.get(id) || null);
    }
  );
}

function createDocumentBranchesLoader(context: AuthContext): DataLoader<string, DocumentBranch[]> {
  return new DataLoader<string, DocumentBranch[]>(
    async (documentIds: readonly string[]) => {
      // Implementation for document branches loading
      return documentIds.map(() => []); // Stub implementation
    }
  );
}

function createPresenceSessionLoader(context: AuthContext): DataLoader<string, PresenceSession | null> {
  return new DataLoader<string, PresenceSession | null>(
    async (sessionIds: readonly string[]) => {
      // Implementation for presence session loading
      return sessionIds.map(() => null); // Stub implementation
    }
  );
}

function createUserPresenceLoader(context: AuthContext): DataLoader<string, PresenceSession[]> {
  return new DataLoader<string, PresenceSession[]>(
    async (userIds: readonly string[]) => {
      // Implementation for user presence loading
      return userIds.map(() => []); // Stub implementation
    }
  );
}

function createActivityLoader(context: AuthContext): DataLoader<string, ActivityEvent[]> {
  return new DataLoader<string, ActivityEvent[]>(
    async (ids: readonly string[]) => {
      // Implementation for activity loading
      return ids.map(() => []); // Stub implementation
    }
  );
}

function createActivityByUserLoader(context: AuthContext): DataLoader<string, ActivityEvent[]> {
  return new DataLoader<string, ActivityEvent[]>(
    async (userIds: readonly string[]) => {
      // Implementation for activity by user loading
      return userIds.map(() => []); // Stub implementation
    }
  );
}

function createActivityByDocumentLoader(context: AuthContext): DataLoader<string, ActivityEvent[]> {
  return new DataLoader<string, ActivityEvent[]>(
    async (documentIds: readonly string[]) => {
      // Implementation for activity by document loading
      return documentIds.map(() => []); // Stub implementation
    }
  );
}

function createAnnotationLoader(context: AuthContext): DataLoader<string, Annotation | null> {
  return new DataLoader<string, Annotation | null>(
    async (annotationIds: readonly string[]) => {
      // Implementation for annotation loading
      return annotationIds.map(() => null); // Stub implementation
    }
  );
}

function createDocumentAnnotationsLoader(context: AuthContext): DataLoader<string, Annotation[]> {
  return new DataLoader<string, Annotation[]>(
    async (documentIds: readonly string[]) => {
      // Implementation for document annotations loading
      return documentIds.map(() => []); // Stub implementation
    }
  );
}

function createBranchLoader(context: AuthContext): DataLoader<string, DocumentBranch | null> {
  return new DataLoader<string, DocumentBranch | null>(
    async (branchIds: readonly string[]) => {
      // Implementation for branch loading
      return branchIds.map(() => null); // Stub implementation
    }
  );
}

function createBranchVersionsLoader(context: AuthContext): DataLoader<string, DocumentVersion[]> {
  return new DataLoader<string, DocumentVersion[]>(
    async (branchIds: readonly string[]) => {
      // Implementation for branch versions loading
      return branchIds.map(() => []); // Stub implementation
    }
  );
}

function createCommentReactionsLoader(context: AuthContext): DataLoader<string, any[]> {
  return new DataLoader<string, any[]>(
    async (commentIds: readonly string[]) => {
      // Implementation for comment reactions loading
      return commentIds.map(() => []); // Stub implementation
    }
  );
}

function createCommentsByAuthorLoader(context: AuthContext): DataLoader<string, Comment[]> {
  return new DataLoader<string, Comment[]>(
    async (authorIds: readonly string[]) => {
      // Implementation for comments by author loading
      return authorIds.map(() => []); // Stub implementation
    }
  );
}

function createDocumentsByOrganizationLoader(context: AuthContext): DataLoader<string, Document[]> {
  return new DataLoader<string, Document[]>(
    async (orgIds: readonly string[]) => {
      // Implementation for documents by organization loading
      return orgIds.map(() => []); // Stub implementation
    }
  );
}

function createDocumentsRecentLoader(context: AuthContext): DataLoader<string, Document[]> {
  return new DataLoader<string, Document[]>(
    async (keys: readonly string[]) => {
      // Implementation for recent documents loading
      return keys.map(() => []); // Stub implementation
    }
  );
}

function createDocumentVersionLoader(context: AuthContext): DataLoader<string, DocumentVersion | null> {
  return new DataLoader<string, DocumentVersion | null>(
    async (versionIds: readonly string[]) => {
      const sql = `
        SELECT dv.*, u.first_name, u.last_name,
               dc.content_data, dc.checksum, dc.size_bytes
        FROM document_versions dv
        LEFT JOIN users u ON dv.author_id = u.id
        LEFT JOIN document_content dc ON dv.id = dc.version_id
        WHERE dv.id = ANY($1) AND dv.deleted_at IS NULL
      `;

      const results = await context.db.query(sql, [Array.from(versionIds)]);

      const versionMap = new Map<string, DocumentVersion>();
      results.forEach((row: any) => {
        versionMap.set(row.id, transformRowToDocumentVersion(row));
      });

      return versionIds.map(id => versionMap.get(id) || null);
    }
  );
}

// =============================================================================
// TRANSFORM FUNCTIONS
// =============================================================================

function transformRowToDocument(row: any): Document {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    type: row.type,
    status: row.status,
    ownerId: row.owner_id,
    organizationId: row.organization_id,
    currentVersionId: row.current_version_id,
    paintboxEstimateId: row.paintbox_estimate_id,
    brandPortalThemeId: row.brand_portal_theme_id,
    content: {
      format: row.content_format,
      data: row.content_data || {},
      blocks: [],
      length: row.content_length || 0,
      html: row.content_html,
      markdown: row.content_markdown,
      plainText: row.content_plain_text,
      attachments: [],
      images: []
    },
    crdtState: {
      type: row.crdt_type || 'YATA',
      state: row.crdt_state || {},
      vectorClock: {
        clocks: row.vector_clock || {},
        version: row.vector_version || 0
      },
      operationLog: [],
      mergeable: true
    },
    permissions: {
      canRead: true,
      canWrite: row.can_write || false,
      canComment: row.can_comment || false,
      canShare: row.can_share || false,
      canManage: row.can_manage || false,
      canDelete: row.can_delete || false,
      owner: 'MANAGE',
      collaborators: [],
      organization: 'INTERNAL',
      public: null
    },
    sharing: row.is_shared ? {
      id: row.sharing_id,
      isPublic: row.is_public || false,
      shareUrl: row.share_url,
      embedUrl: row.embed_url,
      allowAnonymous: row.allow_anonymous || false,
      allowComments: row.allow_comments || false,
      expiresAt: row.sharing_expires_at,
      maxViews: row.max_views,
      currentViews: row.current_views || 0,
      trackingEnabled: row.tracking_enabled || false
    } : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastEditedAt: row.last_edited_at,
    lastViewedAt: row.last_viewed_at
  };
}

function transformRowToDocumentVersion(row: any): DocumentVersion {
  return {
    id: row.id,
    documentId: row.document_id,
    version: row.version,
    name: row.name,
    description: row.description,
    authorId: row.author_id,
    parentVersionId: row.parent_version_id,
    branchId: row.branch_id,
    isCurrentVersion: row.is_current || false,
    isMajorVersion: row.is_major_version || false,
    content: {
      format: row.content_format,
      data: row.content_data || {},
      blocks: [],
      length: row.content_length || 0,
      html: row.content_html,
      markdown: row.content_markdown,
      plainText: row.content_plain_text,
      attachments: [],
      images: []
    },
    checksum: row.checksum,
    size: row.size_bytes || 0,
    changes: [],
    diffStats: {
      totalChanges: row.total_changes || 0,
      additions: row.additions || 0,
      deletions: row.deletions || 0,
      modifications: row.modifications || 0,
      charactersAdded: row.characters_added || 0,
      charactersDeleted: row.characters_deleted || 0
    },
    createdAt: row.created_at,
    publishedAt: row.published_at
  };
}

function transformRowToComment(row: any): Comment {
  return {
    id: row.id,
    documentId: row.document_id,
    threadId: row.thread_id,
    authorId: row.author_id,
    parentCommentId: row.parent_comment_id,
    content: {
      text: row.content_text,
      html: row.content_html,
      markdown: row.content_markdown,
      format: row.content_format || 'PLAIN_TEXT',
      attachments: [],
      mentions: [],
      links: []
    },
    position: row.position_data ? {
      blockId: row.position_data.blockId,
      startOffset: row.position_data.startOffset,
      endOffset: row.position_data.endOffset,
      x: row.position_data.x,
      y: row.position_data.y,
      page: row.position_data.page,
      section: row.position_data.section
    } : null,
    status: row.status || 'ACTIVE',
    priority: row.priority || 'NORMAL',
    type: row.type || 'GENERAL',
    isResolved: row.is_resolved || false,
    resolvedBy: row.resolved_by,
    resolvedAt: row.resolved_at,
    replyCount: row.reply_count || 0,
    reactions: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    editedAt: row.edited_at
  };
}

function transformRowToPresenceSession(row: any): PresenceSession {
  return {
    id: row.id,
    userId: row.user_id,
    documentId: row.document_id,
    status: row.status,
    joinedAt: row.joined_at,
    lastSeenAt: row.last_seen_at,
    sessionDuration: calculateDuration(row.joined_at, row.last_seen_at),
    cursor: row.cursor_data ? {
      blockId: row.cursor_data.blockId,
      offset: row.cursor_data.offset,
      x: row.cursor_data.x,
      y: row.cursor_data.y,
      height: row.cursor_data.height
    } : null,
    selection: row.selection_data ? {
      start: row.selection_data.start,
      end: row.selection_data.end,
      text: row.selection_data.text,
      isCollapsed: row.selection_data.isCollapsed
    } : null,
    viewport: row.viewport_data ? {
      scrollTop: row.viewport_data.scrollTop,
      scrollLeft: row.viewport_data.scrollLeft,
      visibleBlocks: row.viewport_data.visibleBlocks,
      zoom: row.viewport_data.zoom
    } : null,
    isTyping: row.is_typing || false,
    isIdle: row.seconds_since_seen > 300,
    currentAction: row.current_action,
    device: {
      type: row.device_type || 'DESKTOP',
      os: row.device_os || 'Unknown',
      browser: row.device_browser,
      screenResolution: row.screen_resolution,
      timezone: row.timezone || 'UTC',
      locale: row.locale || 'en-US'
    },
    connectionQuality: {
      latency: row.latency || 0,
      bandwidth: row.bandwidth,
      connectionType: row.connection_type || 'WEBSOCKET',
      isStable: row.is_stable_connection || true,
      packetLoss: row.packet_loss || 0
    },
    permissions: {
      canRead: true,
      canWrite: row.session_can_write || false,
      canComment: row.session_can_comment || false,
      canShare: row.session_can_share || false,
      canManage: row.session_can_manage || false,
      canDelete: row.session_can_delete || false
    }
  };
}

function transformRowToActivityEvent(row: any): ActivityEvent {
  return {
    id: row.id,
    documentId: row.document_id,
    type: row.type,
    action: row.action,
    description: row.description,
    actorId: row.actor_id,
    actorType: row.actor_type || 'USER',
    targetType: row.target_type,
    targetId: row.target_id,
    context: row.context_data || {},
    metadata: row.metadata || {},
    impact: {
      severity: row.impact_severity || 'INFO',
      scope: row.impact_scope || 'DOCUMENT',
      affectedUsers: row.affected_user_ids || [],
      changesCount: row.changes_count || 0
    },
    timestamp: row.timestamp,
    processedAt: row.processed_at
  };
}

function transformRowToUser(row: any): User {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    avatar: row.avatar,
    role: row.role,
    status: row.status,
    organizationId: row.organization_id,
    permissions: row.permissions || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at,
    timezone: row.timezone,
    locale: row.locale
  };
}

function transformRowToOrganization(row: any): Organization {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logo: row.logo,
    website: row.website,
    description: row.description,
    industry: row.industry,
    size: row.size,
    status: row.status,
    memberCount: row.member_count || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function transformRowToCommentThread(row: any): CommentThread {
  return {
    id: row.id,
    documentId: row.document_id,
    subject: row.subject,
    status: row.status || 'OPEN',
    priority: row.priority || 'NORMAL',
    rootCommentId: row.root_comment_id,
    commentCount: row.comment_count || 0,
    participantCount: row.participant_count || 0,
    isResolved: row.is_resolved || false,
    resolvedBy: row.resolved_by,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastActivityAt: row.last_activity_at
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function calculateDuration(start: Date, end: Date): string {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return `PT${Math.floor(diff / 1000)}S`; // ISO 8601 duration format
}

export default createCollaborationDataLoaders;
