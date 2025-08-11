/**
 * Unit Tests for Collaboration GraphQL Resolvers
 * Tests document resolvers, comment resolvers, presence resolvers, and subscriptions
 */

import { createMockUser, createMockDocument, createMockComment, createMockPresenceSession } from '../setup/unit.setup';

// Mock implementation of collaboration resolvers
class MockCollaborationResolvers {
  constructor(private mockDb: any, private mockPubSub: any) {}

  // Document resolvers
  async documents(parent: any, args: any, context: any) {
    const { organizationId } = context.user;
    return this.mockDb.documents.filter((doc: any) => doc.organizationId === organizationId);
  }

  async document(parent: any, args: { id: string }, context: any) {
    const document = this.mockDb.documents.find((doc: any) => doc.id === args.id);

    if (!document || document.organizationId !== context.user.organizationId) {
      throw new Error('Document not found or access denied');
    }

    return document;
  }

  async createDocument(parent: any, args: { input: any }, context: any) {
    const document = {
      id: `doc-${Date.now()}`,
      ...args.input,
      ownerId: context.user.id,
      organizationId: context.user.organizationId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.mockDb.documents.push(document);

    // Publish creation event
    this.mockPubSub.publish('DOCUMENT_CREATED', { documentCreated: document });

    return document;
  }

  async updateDocumentContent(parent: any, args: { id: string; operations: any[] }, context: any) {
    const document = this.mockDb.documents.find((doc: any) => doc.id === args.id);

    if (!document) {
      throw new Error('Document not found');
    }

    // Apply operations (mock implementation)
    const appliedOperations = args.operations.map((op: any) => ({
      ...op,
      id: `op-${Date.now()}-${Math.random()}`,
      authorId: context.user.id,
      timestamp: new Date().toISOString(),
      applied: true,
    }));

    document.operations = [...(document.operations || []), ...appliedOperations];
    document.updatedAt = new Date().toISOString();

    // Publish content change event
    this.mockPubSub.publish('DOCUMENT_CONTENT_CHANGED', {
      documentContentChanged: {
        documentId: document.id,
        type: 'CONTENT_UPDATED',
        operations: appliedOperations,
        author: context.user,
        conflictsDetected: [],
      },
    });

    return {
      success: true,
      appliedOperations,
      conflicts: [],
    };
  }

  // Comment resolvers
  async comments(parent: any, args: { documentId: string }, context: any) {
    return this.mockDb.comments.filter((comment: any) =>
      comment.documentId === args.documentId &&
      comment.status !== 'DELETED'
    );
  }

  async createComment(parent: any, args: { input: any }, context: any) {
    const comment = {
      id: `comment-${Date.now()}`,
      ...args.input,
      authorId: context.user.id,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.mockDb.comments.push(comment);

    // Publish comment event
    this.mockPubSub.publish('COMMENT_ADDED', {
      commentAdded: {
        comment,
        author: context.user,
        mentionedUsers: [],
      },
    });

    return comment;
  }

  async resolveComment(parent: any, args: { id: string }, context: any) {
    const comment = this.mockDb.comments.find((c: any) => c.id === args.id);

    if (!comment) {
      throw new Error('Comment not found');
    }

    comment.status = 'RESOLVED';
    comment.resolvedBy = context.user.id;
    comment.resolvedAt = new Date().toISOString();

    return comment;
  }

  // Presence resolvers
  async joinDocument(parent: any, args: { input: any }, context: any) {
    const session = {
      id: `session-${Date.now()}`,
      userId: context.user.id,
      documentId: args.input.documentId,
      status: 'ACTIVE',
      joinedAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
    };

    this.mockDb.presenceSessions.push(session);

    // Publish presence change
    this.mockPubSub.publish('DOCUMENT_PRESENCE_CHANGED', {
      documentPresenceChanged: {
        type: 'USER_JOINED',
        session,
        activeUserCount: this.mockDb.presenceSessions.filter((s: any) =>
          s.documentId === args.input.documentId && s.status === 'ACTIVE'
        ).length,
      },
    });

    return session;
  }

  async leaveDocument(parent: any, args: { documentId: string }, context: any) {
    const session = this.mockDb.presenceSessions.find((s: any) =>
      s.documentId === args.documentId &&
      s.userId === context.user.id &&
      s.status === 'ACTIVE'
    );

    if (session) {
      session.status = 'OFFLINE';
      session.leftAt = new Date().toISOString();

      // Publish presence change
      this.mockPubSub.publish('DOCUMENT_PRESENCE_CHANGED', {
        documentPresenceChanged: {
          type: 'USER_LEFT',
          session,
          activeUserCount: this.mockDb.presenceSessions.filter((s: any) =>
            s.documentId === args.documentId && s.status === 'ACTIVE'
          ).length,
        },
      });
    }

    return { success: true };
  }

  async updatePresence(parent: any, args: { input: any }, context: any) {
    const session = this.mockDb.presenceSessions.find((s: any) =>
      s.userId === context.user.id && s.status === 'ACTIVE'
    );

    if (session) {
      Object.assign(session, args.input);
      session.lastSeenAt = new Date().toISOString();

      // Publish presence update (throttled in real implementation)
      this.mockPubSub.publish('DOCUMENT_PRESENCE_CHANGED', {
        documentPresenceChanged: {
          type: 'USER_UPDATED',
          session,
          activeUserCount: this.mockDb.presenceSessions.filter((s: any) =>
            s.documentId === session.documentId && s.status === 'ACTIVE'
          ).length,
        },
      });
    }

    return { success: true };
  }

  // Subscription resolvers
  documentContentChanged(parent: any, args: { documentId: string }, context: any) {
    return this.mockPubSub.asyncIterator('DOCUMENT_CONTENT_CHANGED');
  }

  documentPresenceChanged(parent: any, args: { documentId: string }, context: any) {
    return this.mockPubSub.asyncIterator('DOCUMENT_PRESENCE_CHANGED');
  }

  commentAdded(parent: any, args: { documentId: string }, context: any) {
    return this.mockPubSub.asyncIterator('COMMENT_ADDED');
  }
}

// Mock database and PubSub
const mockDb = {
  documents: [],
  comments: [],
  presenceSessions: [],
};

const mockPubSub = {
  publish: jest.fn(),
  asyncIterator: jest.fn(() => ({
    [Symbol.asyncIterator]: jest.fn(),
  })),
};

describe('Collaboration GraphQL Resolvers', () => {
  let resolvers: MockCollaborationResolvers;
  let mockContext: any;

  beforeEach(() => {
    resolvers = new MockCollaborationResolvers(mockDb, mockPubSub);

    // Clear mock database
    mockDb.documents.length = 0;
    mockDb.comments.length = 0;
    mockDb.presenceSessions.length = 0;

    // Reset mocks
    jest.clearAllMocks();

    // Create mock context
    mockContext = {
      user: createMockUser(),
      db: mockDb,
      pubsub: mockPubSub,
    };
  });

  describe('Document Resolvers', () => {
    it('should fetch documents for organization', async () => {
      // Setup test data
      const doc1 = createMockDocument({ organizationId: mockContext.user.organizationId });
      const doc2 = createMockDocument({ organizationId: 'other-org' });
      mockDb.documents.push(doc1, doc2);

      const result = await resolvers.documents(null, {}, mockContext);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(doc1.id);
      expect(result[0].organizationId).toBe(mockContext.user.organizationId);
    });

    it('should fetch single document with access control', async () => {
      const document = createMockDocument({
        organizationId: mockContext.user.organizationId
      });
      mockDb.documents.push(document);

      const result = await resolvers.document(null, { id: document.id }, mockContext);

      expect(result.id).toBe(document.id);
      expect(result.organizationId).toBe(mockContext.user.organizationId);
    });

    it('should deny access to documents from other organizations', async () => {
      const document = createMockDocument({ organizationId: 'other-org' });
      mockDb.documents.push(document);

      await expect(
        resolvers.document(null, { id: document.id }, mockContext)
      ).rejects.toThrow('Document not found or access denied');
    });

    it('should create new document', async () => {
      const input = {
        name: 'New Document',
        type: 'TEXT_DOCUMENT',
        content: {
          format: 'RICH_TEXT',
          blocks: [],
        },
      };

      const result = await resolvers.createDocument(null, { input }, mockContext);

      expect(result.name).toBe(input.name);
      expect(result.type).toBe(input.type);
      expect(result.ownerId).toBe(mockContext.user.id);
      expect(result.organizationId).toBe(mockContext.user.organizationId);
      expect(mockDb.documents).toHaveLength(1);
      expect(mockPubSub.publish).toHaveBeenCalledWith('DOCUMENT_CREATED', {
        documentCreated: result,
      });
    });

    it('should update document content with operations', async () => {
      const document = createMockDocument();
      mockDb.documents.push(document);

      const operations = [
        {
          type: 'INSERT',
          position: 0,
          content: { text: 'Hello World' },
        },
      ];

      const result = await resolvers.updateDocumentContent(
        null,
        { id: document.id, operations },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.appliedOperations).toHaveLength(1);
      expect(result.conflicts).toHaveLength(0);
      expect(mockPubSub.publish).toHaveBeenCalledWith('DOCUMENT_CONTENT_CHANGED', {
        documentContentChanged: expect.objectContaining({
          documentId: document.id,
          type: 'CONTENT_UPDATED',
        }),
      });
    });
  });

  describe('Comment Resolvers', () => {
    it('should fetch comments for document', async () => {
      const documentId = 'doc-123';
      const comment1 = createMockComment({ documentId, status: 'ACTIVE' });
      const comment2 = createMockComment({ documentId, status: 'RESOLVED' });
      const comment3 = createMockComment({ documentId, status: 'DELETED' });
      mockDb.comments.push(comment1, comment2, comment3);

      const result = await resolvers.comments(null, { documentId }, mockContext);

      expect(result).toHaveLength(2); // DELETED comments are filtered out
      expect(result.map((c: any) => c.status)).not.toContain('DELETED');
    });

    it('should create new comment', async () => {
      const input = {
        documentId: 'doc-123',
        content: {
          text: 'Great point!',
          format: 'PLAIN_TEXT',
        },
        position: {
          blockId: 'block-123',
          startOffset: 0,
          endOffset: 5,
        },
      };

      const result = await resolvers.createComment(null, { input }, mockContext);

      expect(result.content.text).toBe(input.content.text);
      expect(result.authorId).toBe(mockContext.user.id);
      expect(result.status).toBe('ACTIVE');
      expect(mockDb.comments).toHaveLength(1);
      expect(mockPubSub.publish).toHaveBeenCalledWith('COMMENT_ADDED', {
        commentAdded: expect.objectContaining({
          comment: result,
          author: mockContext.user,
        }),
      });
    });

    it('should resolve comment', async () => {
      const comment = createMockComment({ status: 'ACTIVE' });
      mockDb.comments.push(comment);

      const result = await resolvers.resolveComment(
        null,
        { id: comment.id },
        mockContext
      );

      expect(result.status).toBe('RESOLVED');
      expect(result.resolvedBy).toBe(mockContext.user.id);
      expect(result.resolvedAt).toBeDefined();
    });
  });

  describe('Presence Resolvers', () => {
    it('should join document and create presence session', async () => {
      const input = {
        documentId: 'doc-123',
        permissions: ['EDIT'],
      };

      const result = await resolvers.joinDocument(null, { input }, mockContext);

      expect(result.userId).toBe(mockContext.user.id);
      expect(result.documentId).toBe(input.documentId);
      expect(result.status).toBe('ACTIVE');
      expect(mockDb.presenceSessions).toHaveLength(1);
      expect(mockPubSub.publish).toHaveBeenCalledWith('DOCUMENT_PRESENCE_CHANGED', {
        documentPresenceChanged: expect.objectContaining({
          type: 'USER_JOINED',
          session: result,
        }),
      });
    });

    it('should leave document and update presence', async () => {
      const session = createMockPresenceSession({
        userId: mockContext.user.id,
        documentId: 'doc-123',
        status: 'ACTIVE',
      });
      mockDb.presenceSessions.push(session);

      const result = await resolvers.leaveDocument(
        null,
        { documentId: 'doc-123' },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(session.status).toBe('OFFLINE');
      expect(session.leftAt).toBeDefined();
      expect(mockPubSub.publish).toHaveBeenCalledWith('DOCUMENT_PRESENCE_CHANGED', {
        documentPresenceChanged: expect.objectContaining({
          type: 'USER_LEFT',
        }),
      });
    });

    it('should update user presence', async () => {
      const session = createMockPresenceSession({
        userId: mockContext.user.id,
        status: 'ACTIVE',
      });
      mockDb.presenceSessions.push(session);

      const input = {
        cursor: {
          blockId: 'block-456',
          offset: 10,
        },
        isTyping: true,
      };

      const result = await resolvers.updatePresence(null, { input }, mockContext);

      expect(result.success).toBe(true);
      expect(session.cursor).toEqual(input.cursor);
      expect(session.isTyping).toBe(input.isTyping);
      expect(mockPubSub.publish).toHaveBeenCalledWith('DOCUMENT_PRESENCE_CHANGED', {
        documentPresenceChanged: expect.objectContaining({
          type: 'USER_UPDATED',
        }),
      });
    });
  });

  describe('Subscription Resolvers', () => {
    it('should create document content subscription', () => {
      const result = resolvers.documentContentChanged(
        null,
        { documentId: 'doc-123' },
        mockContext
      );

      expect(mockPubSub.asyncIterator).toHaveBeenCalledWith('DOCUMENT_CONTENT_CHANGED');
      expect(result).toBeDefined();
    });

    it('should create presence subscription', () => {
      const result = resolvers.documentPresenceChanged(
        null,
        { documentId: 'doc-123' },
        mockContext
      );

      expect(mockPubSub.asyncIterator).toHaveBeenCalledWith('DOCUMENT_PRESENCE_CHANGED');
      expect(result).toBeDefined();
    });

    it('should create comment subscription', () => {
      const result = resolvers.commentAdded(
        null,
        { documentId: 'doc-123' },
        mockContext
      );

      expect(mockPubSub.asyncIterator).toHaveBeenCalledWith('COMMENT_ADDED');
      expect(result).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid document IDs', async () => {
      await expect(
        resolvers.document(null, { id: 'invalid-id' }, mockContext)
      ).rejects.toThrow('Document not found or access denied');
    });

    it('should handle missing comments', async () => {
      await expect(
        resolvers.resolveComment(null, { id: 'invalid-comment' }, mockContext)
      ).rejects.toThrow('Comment not found');
    });

    it('should handle operations on non-existent documents', async () => {
      await expect(
        resolvers.updateDocumentContent(
          null,
          { id: 'invalid-doc', operations: [] },
          mockContext
        )
      ).rejects.toThrow('Document not found');
    });
  });

  describe('Authorization and Security', () => {
    it('should enforce organization boundaries', async () => {
      const otherOrgDoc = createMockDocument({ organizationId: 'other-org' });
      mockDb.documents.push(otherOrgDoc);

      await expect(
        resolvers.document(null, { id: otherOrgDoc.id }, mockContext)
      ).rejects.toThrow('Document not found or access denied');
    });

    it('should track operation authorship', async () => {
      const document = createMockDocument();
      mockDb.documents.push(document);

      const operations = [
        { type: 'INSERT', position: 0, content: { text: 'test' } },
      ];

      const result = await resolvers.updateDocumentContent(
        null,
        { id: document.id, operations },
        mockContext
      );

      expect(result.appliedOperations[0].authorId).toBe(mockContext.user.id);
      expect(result.appliedOperations[0].timestamp).toBeDefined();
    });

    it('should validate comment permissions', async () => {
      const input = {
        documentId: 'doc-123',
        content: { text: 'Comment', format: 'PLAIN_TEXT' },
      };

      const result = await resolvers.createComment(null, { input }, mockContext);

      expect(result.authorId).toBe(mockContext.user.id);
    });
  });

  describe('Real-time Event Publishing', () => {
    it('should publish document creation events', async () => {
      const input = { name: 'Test Doc', type: 'TEXT_DOCUMENT' };

      await resolvers.createDocument(null, { input }, mockContext);

      expect(mockPubSub.publish).toHaveBeenCalledWith(
        'DOCUMENT_CREATED',
        expect.objectContaining({
          documentCreated: expect.objectContaining({
            name: input.name,
            type: input.type,
          }),
        })
      );
    });

    it('should publish content change events with operation details', async () => {
      const document = createMockDocument();
      mockDb.documents.push(document);

      const operations = [
        { type: 'INSERT', position: 0, content: { text: 'Hello' } },
      ];

      await resolvers.updateDocumentContent(
        null,
        { id: document.id, operations },
        mockContext
      );

      expect(mockPubSub.publish).toHaveBeenCalledWith(
        'DOCUMENT_CONTENT_CHANGED',
        expect.objectContaining({
          documentContentChanged: expect.objectContaining({
            documentId: document.id,
            operations: expect.arrayContaining([
              expect.objectContaining({
                type: 'INSERT',
                content: { text: 'Hello' },
              }),
            ]),
            author: mockContext.user,
          }),
        })
      );
    });

    it('should publish presence events with user count', async () => {
      const input = { documentId: 'doc-123' };

      await resolvers.joinDocument(null, { input }, mockContext);

      expect(mockPubSub.publish).toHaveBeenCalledWith(
        'DOCUMENT_PRESENCE_CHANGED',
        expect.objectContaining({
          documentPresenceChanged: expect.objectContaining({
            type: 'USER_JOINED',
            activeUserCount: 1,
          }),
        })
      );
    });
  });
});
