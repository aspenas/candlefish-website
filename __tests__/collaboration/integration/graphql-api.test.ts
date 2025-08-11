/**
 * Integration Tests for GraphQL Collaboration API
 * Tests complete GraphQL operations with real database and WebSocket connections
 */

import { gql } from '@apollo/client';
import { testFactory } from '../factories/test-data-factory';
import { integrationTestUtils } from '../setup/integration.setup';

// GraphQL Queries and Mutations
const GET_DOCUMENTS = gql`
  query GetDocuments($organizationId: UUID!) {
    documents(organizationId: $organizationId) {
      id
      name
      type
      status
      content {
        format
        blocks {
          id
          type
          content
        }
      }
      owner {
        id
        name
        email
      }
      permissions {
        canRead
        canWrite
        canComment
        canShare
      }
      activeUsers {
        id
        user {
          id
          name
        }
        status
        isTyping
      }
      createdAt
      updatedAt
    }
  }
`;

const GET_DOCUMENT = gql`
  query GetDocument($id: UUID!) {
    document(id: $id) {
      id
      name
      type
      status
      content {
        format
        data
        blocks {
          id
          type
          content
          position {
            index
            offset
            length
          }
          authorId
        }
      }
      crdtState {
        type
        vectorClock {
          clocks
          version
        }
        operationLog {
          id
          type
          position
          content
          timestamp
        }
      }
      operations {
        id
        type
        position
        content
        authorId
        timestamp
        applied
      }
      comments {
        id
        content {
          text
          format
        }
        author {
          id
          name
        }
        position {
          blockId
          startOffset
          endOffset
        }
        status
        createdAt
      }
      presenceInfo {
        activeUsers
        totalUsers
      }
    }
  }
`;

const CREATE_DOCUMENT = gql`
  mutation CreateDocument($input: CreateDocumentInput!) {
    createDocument(input: $input) {
      id
      name
      type
      content {
        format
        blocks {
          id
          type
          content
        }
      }
      owner {
        id
        name
      }
      permissions {
        canRead
        canWrite
        canComment
      }
      createdAt
    }
  }
`;

const UPDATE_DOCUMENT_CONTENT = gql`
  mutation UpdateDocumentContent($id: UUID!, $operations: [CreateOperationInput!]!) {
    updateDocumentContent(id: $id, operations: $operations) {
      success
      appliedOperations {
        id
        type
        position
        content
        authorId
        timestamp
      }
      conflicts {
        type
        position
        conflictingOperations {
          id
          authorId
        }
      }
    }
  }
`;

const CREATE_COMMENT = gql`
  mutation CreateComment($input: CreateCommentInput!) {
    createComment(input: $input) {
      id
      content {
        text
        format
      }
      author {
        id
        name
      }
      position {
        blockId
        startOffset
        endOffset
      }
      status
      type
      priority
      createdAt
    }
  }
`;

const JOIN_DOCUMENT = gql`
  mutation JoinDocument($input: JoinDocumentInput!) {
    joinDocument(input: $input) {
      id
      user {
        id
        name
      }
      status
      joinedAt
    }
  }
`;

const LEAVE_DOCUMENT = gql`
  mutation LeaveDocument($documentId: UUID!) {
    leaveDocument(documentId: $documentId) {
      success
    }
  }
`;

const UPDATE_PRESENCE = gql`
  mutation UpdatePresence($input: UpdatePresenceInput!) {
    updatePresence(input: $input) {
      success
    }
  }
`;

// Subscriptions
const DOCUMENT_CONTENT_CHANGED = gql`
  subscription DocumentContentChanged($documentId: UUID!) {
    documentContentChanged(documentId: $documentId) {
      type
      operations {
        id
        type
        position
        content
        authorId
        timestamp
      }
      author {
        id
        name
      }
      conflictsDetected {
        type
        position
      }
    }
  }
`;

const DOCUMENT_PRESENCE_CHANGED = gql`
  subscription DocumentPresenceChanged($documentId: UUID!) {
    documentPresenceChanged(documentId: $documentId) {
      type
      session {
        id
        user {
          id
          name
        }
        status
        cursor {
          blockId
          offset
        }
        isTyping
      }
      activeUserCount
    }
  }
`;

const COMMENT_ADDED = gql`
  subscription CommentAdded($documentId: UUID!) {
    commentAdded(documentId: $documentId) {
      comment {
        id
        content {
          text
        }
        author {
          id
          name
        }
        position {
          blockId
          startOffset
          endOffset
        }
      }
      mentionedUsers {
        id
        name
      }
    }
  }
`;

describe('GraphQL Collaboration API Integration Tests', () => {
  let testData: any;

  beforeEach(async () => {
    // Reset test data
    testFactory.reset();

    // Create test scenario
    testData = testFactory.createCollaborationScenario({
      userCount: 3,
      documentCount: 2,
      commentCount: 5,
    });

    // Set up test data in database
    for (const org of [testData.organization]) {
      await integrationTestUtils.db.query(
        'INSERT INTO organizations (id, name, slug, plan) VALUES ($1, $2, $3, $4)',
        [org.id, org.name, org.slug, org.plan]
      );
    }

    for (const user of testData.users) {
      await integrationTestUtils.db.query(
        'INSERT INTO users (id, email, organization_id, role) VALUES ($1, $2, $3, $4)',
        [user.id, user.email, user.organizationId, user.role]
      );
    }

    for (const document of testData.documents) {
      await integrationTestUtils.db.query(
        'INSERT INTO documents (id, name, type, status, content, owner_id, organization_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [document.id, document.name, document.type, document.status, JSON.stringify(document.content), document.ownerId, document.organizationId]
      );
    }
  });

  describe('Document Queries', () => {
    it('should fetch documents for organization', async () => {
      const response = await integrationTestUtils.graphql.query(
        GET_DOCUMENTS,
        { organizationId: testData.organization.id },
        {
          headers: {
            'x-user-id': testData.users[0].id,
            'x-organization-id': testData.organization.id,
          },
        }
      );

      expect(response.errors).toBeUndefined();
      expect(response.data.documents).toHaveLength(testData.documents.length);

      const document = response.data.documents[0];
      expect(document.id).toBeDefined();
      expect(document.name).toBeDefined();
      expect(document.type).toMatch(/TEXT_DOCUMENT|SPREADSHEET|PRESENTATION/);
      expect(document.owner).toBeDefined();
      expect(document.permissions).toBeDefined();
    });

    it('should fetch single document with full details', async () => {
      const documentId = testData.documents[0].id;

      const response = await integrationTestUtils.graphql.query(
        GET_DOCUMENT,
        { id: documentId },
        {
          headers: {
            'x-user-id': testData.users[0].id,
            'x-organization-id': testData.organization.id,
          },
        }
      );

      expect(response.errors).toBeUndefined();
      expect(response.data.document).toBeDefined();

      const document = response.data.document;
      expect(document.id).toBe(documentId);
      expect(document.content).toBeDefined();
      expect(document.content.blocks).toBeInstanceOf(Array);
      expect(document.crdtState).toBeDefined();
      expect(document.operations).toBeInstanceOf(Array);
      expect(document.presenceInfo).toBeDefined();
    });

    it('should enforce organization access control', async () => {
      // Try to access document from different organization
      const differentOrgUser = testFactory.createUser({ organizationId: 'different-org' });

      await integrationTestUtils.db.query(
        'INSERT INTO organizations (id, name, slug) VALUES ($1, $2, $3)',
        ['different-org', 'Different Org', 'different-org']
      );

      await integrationTestUtils.db.query(
        'INSERT INTO users (id, email, organization_id) VALUES ($1, $2, $3)',
        [differentOrgUser.id, differentOrgUser.email, differentOrgUser.organizationId]
      );

      const response = await integrationTestUtils.graphql.query(
        GET_DOCUMENT,
        { id: testData.documents[0].id },
        {
          headers: {
            'x-user-id': differentOrgUser.id,
            'x-organization-id': differentOrgUser.organizationId,
          },
        }
      );

      expect(response.errors).toBeDefined();
      expect(response.errors[0].message).toMatch(/not found|access denied/i);
    });
  });

  describe('Document Mutations', () => {
    it('should create new document', async () => {
      const input = {
        name: 'Integration Test Document',
        type: 'TEXT_DOCUMENT',
        content: {
          format: 'RICH_TEXT',
          data: { version: '1.0' },
          blocks: [
            {
              type: 'PARAGRAPH',
              content: { text: 'Initial content' },
              position: { index: 0, offset: 0, length: 15, depth: 0 },
            },
          ],
        },
        permissions: {
          collaborators: [],
          organization: 'INTERNAL',
        },
      };

      const response = await integrationTestUtils.graphql.mutate(
        CREATE_DOCUMENT,
        { input },
        {
          headers: {
            'x-user-id': testData.users[0].id,
            'x-organization-id': testData.organization.id,
          },
        }
      );

      expect(response.errors).toBeUndefined();
      expect(response.data.createDocument).toBeDefined();

      const document = response.data.createDocument;
      expect(document.name).toBe(input.name);
      expect(document.type).toBe(input.type);
      expect(document.content.format).toBe(input.content.format);
      expect(document.content.blocks).toHaveLength(1);
      expect(document.owner.id).toBe(testData.users[0].id);
      expect(document.permissions.canRead).toBe(true);
      expect(document.createdAt).toBeDefined();

      // Verify document was actually created in database
      const dbResult = await integrationTestUtils.db.query(
        'SELECT * FROM documents WHERE id = $1',
        [document.id]
      );
      expect(dbResult.rows).toHaveLength(1);
    });

    it('should update document content with operations', async () => {
      const documentId = testData.documents[0].id;
      const operations = [
        {
          type: 'INSERT',
          position: 0,
          content: { text: 'Hello World! ' },
          clientId: testData.users[0].id,
        },
        {
          type: 'FORMAT',
          position: 0,
          length: 5,
          content: { style: { bold: true } },
          clientId: testData.users[0].id,
        },
      ];

      const response = await integrationTestUtils.graphql.mutate(
        UPDATE_DOCUMENT_CONTENT,
        { id: documentId, operations },
        {
          headers: {
            'x-user-id': testData.users[0].id,
            'x-organization-id': testData.organization.id,
          },
        }
      );

      expect(response.errors).toBeUndefined();
      expect(response.data.updateDocumentContent).toBeDefined();

      const result = response.data.updateDocumentContent;
      expect(result.success).toBe(true);
      expect(result.appliedOperations).toHaveLength(2);
      expect(result.conflicts).toHaveLength(0);

      // Verify operations were stored
      const dbResult = await integrationTestUtils.db.query(
        'SELECT * FROM operations WHERE document_id = $1',
        [documentId]
      );
      expect(dbResult.rows.length).toBeGreaterThan(0);
    });

    it('should handle concurrent operations with conflict detection', async () => {
      const documentId = testData.documents[0].id;

      // Create conflicting operations from different users
      const user1Operations = [
        {
          type: 'INSERT',
          position: 0,
          content: { text: 'User 1 text' },
          clientId: testData.users[0].id,
        },
      ];

      const user2Operations = [
        {
          type: 'INSERT',
          position: 0,
          content: { text: 'User 2 text' },
          clientId: testData.users[1].id,
        },
      ];

      // Execute operations simultaneously
      const [response1, response2] = await Promise.all([
        integrationTestUtils.graphql.mutate(
          UPDATE_DOCUMENT_CONTENT,
          { id: documentId, operations: user1Operations },
          {
            headers: {
              'x-user-id': testData.users[0].id,
              'x-organization-id': testData.organization.id,
            },
          }
        ),
        integrationTestUtils.graphql.mutate(
          UPDATE_DOCUMENT_CONTENT,
          { id: documentId, operations: user2Operations },
          {
            headers: {
              'x-user-id': testData.users[1].id,
              'x-organization-id': testData.organization.id,
            },
          }
        ),
      ]);

      expect(response1.errors).toBeUndefined();
      expect(response2.errors).toBeUndefined();

      // At least one should succeed
      const success1 = response1.data.updateDocumentContent.success;
      const success2 = response2.data.updateDocumentContent.success;
      expect(success1 || success2).toBe(true);

      // Check for conflict detection (in real CRDT implementation)
      // This might show conflicts or successful automatic resolution
    });
  });

  describe('Comment Operations', () => {
    it('should create comment with position', async () => {
      const documentId = testData.documents[0].id;
      const input = {
        documentId,
        content: {
          text: 'This is a test comment from integration test',
          format: 'PLAIN_TEXT',
        },
        position: {
          blockId: 'block-123',
          startOffset: 0,
          endOffset: 10,
        },
        type: 'GENERAL',
        priority: 'NORMAL',
      };

      const response = await integrationTestUtils.graphql.mutate(
        CREATE_COMMENT,
        { input },
        {
          headers: {
            'x-user-id': testData.users[0].id,
            'x-organization-id': testData.organization.id,
          },
        }
      );

      expect(response.errors).toBeUndefined();
      expect(response.data.createComment).toBeDefined();

      const comment = response.data.createComment;
      expect(comment.content.text).toBe(input.content.text);
      expect(comment.author.id).toBe(testData.users[0].id);
      expect(comment.position.blockId).toBe(input.position.blockId);
      expect(comment.status).toBe('ACTIVE');
      expect(comment.type).toBe(input.type);
      expect(comment.priority).toBe(input.priority);

      // Verify in database
      const dbResult = await integrationTestUtils.db.query(
        'SELECT * FROM comments WHERE id = $1',
        [comment.id]
      );
      expect(dbResult.rows).toHaveLength(1);
    });

    it('should create threaded comments', async () => {
      const documentId = testData.documents[0].id;

      // Create parent comment
      const parentInput = {
        documentId,
        content: { text: 'Parent comment', format: 'PLAIN_TEXT' },
        type: 'QUESTION',
      };

      const parentResponse = await integrationTestUtils.graphql.mutate(
        CREATE_COMMENT,
        { input: parentInput },
        {
          headers: {
            'x-user-id': testData.users[0].id,
            'x-organization-id': testData.organization.id,
          },
        }
      );

      const parentCommentId = parentResponse.data.createComment.id;

      // Create reply comment
      const replyInput = {
        documentId,
        content: { text: 'Reply to parent', format: 'PLAIN_TEXT' },
        parentCommentId,
        type: 'GENERAL',
      };

      const replyResponse = await integrationTestUtils.graphql.mutate(
        CREATE_COMMENT,
        { input: replyInput },
        {
          headers: {
            'x-user-id': testData.users[1].id,
            'x-organization-id': testData.organization.id,
          },
        }
      );

      expect(replyResponse.errors).toBeUndefined();
      expect(replyResponse.data.createComment.id).toBeDefined();

      // Verify parent-child relationship in database
      const dbResult = await integrationTestUtils.db.query(
        'SELECT * FROM comments WHERE parent_id = $1',
        [parentCommentId]
      );
      expect(dbResult.rows).toHaveLength(1);
    });
  });

  describe('Presence Management', () => {
    it('should join document and create presence session', async () => {
      const documentId = testData.documents[0].id;
      const input = {
        documentId,
        permissions: ['EDIT'],
      };

      const response = await integrationTestUtils.graphql.mutate(
        JOIN_DOCUMENT,
        { input },
        {
          headers: {
            'x-user-id': testData.users[0].id,
            'x-organization-id': testData.organization.id,
          },
        }
      );

      expect(response.errors).toBeUndefined();
      expect(response.data.joinDocument).toBeDefined();

      const session = response.data.joinDocument;
      expect(session.user.id).toBe(testData.users[0].id);
      expect(session.status).toBe('ACTIVE');
      expect(session.joinedAt).toBeDefined();

      // Verify in database
      const dbResult = await integrationTestUtils.db.query(
        'SELECT * FROM presence_sessions WHERE user_id = $1 AND document_id = $2',
        [testData.users[0].id, documentId]
      );
      expect(dbResult.rows).toHaveLength(1);
    });

    it('should update presence with cursor position', async () => {
      const documentId = testData.documents[0].id;

      // First join the document
      await integrationTestUtils.graphql.mutate(
        JOIN_DOCUMENT,
        { input: { documentId } },
        {
          headers: {
            'x-user-id': testData.users[0].id,
            'x-organization-id': testData.organization.id,
          },
        }
      );

      // Update presence
      const presenceInput = {
        cursor: {
          blockId: 'block-123',
          offset: 42,
          x: 100.5,
          y: 200.0,
        },
        isTyping: true,
      };

      const response = await integrationTestUtils.graphql.mutate(
        UPDATE_PRESENCE,
        { input: presenceInput },
        {
          headers: {
            'x-user-id': testData.users[0].id,
            'x-organization-id': testData.organization.id,
          },
        }
      );

      expect(response.errors).toBeUndefined();
      expect(response.data.updatePresence.success).toBe(true);

      // Verify presence was updated in database
      const dbResult = await integrationTestUtils.db.query(
        'SELECT cursor_position FROM presence_sessions WHERE user_id = $1 AND document_id = $2',
        [testData.users[0].id, documentId]
      );
      expect(dbResult.rows).toHaveLength(1);

      const storedCursor = dbResult.rows[0].cursor_position;
      expect(storedCursor.blockId).toBe(presenceInput.cursor.blockId);
      expect(storedCursor.offset).toBe(presenceInput.cursor.offset);
    });

    it('should leave document and update presence', async () => {
      const documentId = testData.documents[0].id;

      // Join first
      await integrationTestUtils.graphql.mutate(
        JOIN_DOCUMENT,
        { input: { documentId } },
        {
          headers: {
            'x-user-id': testData.users[0].id,
            'x-organization-id': testData.organization.id,
          },
        }
      );

      // Leave document
      const response = await integrationTestUtils.graphql.mutate(
        LEAVE_DOCUMENT,
        { documentId },
        {
          headers: {
            'x-user-id': testData.users[0].id,
            'x-organization-id': testData.organization.id,
          },
        }
      );

      expect(response.errors).toBeUndefined();
      expect(response.data.leaveDocument.success).toBe(true);

      // Verify presence session was deactivated
      const dbResult = await integrationTestUtils.db.query(
        'SELECT status FROM presence_sessions WHERE user_id = $1 AND document_id = $2',
        [testData.users[0].id, documentId]
      );
      expect(dbResult.rows[0].status).toBe('OFFLINE');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple simultaneous document queries', async () => {
      const startTime = Date.now();

      // Execute multiple queries concurrently
      const promises = Array.from({ length: 10 }, () =>
        integrationTestUtils.graphql.query(
          GET_DOCUMENTS,
          { organizationId: testData.organization.id },
          {
            headers: {
              'x-user-id': testData.users[0].id,
              'x-organization-id': testData.organization.id,
            },
          }
        )
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();

      // All requests should succeed
      responses.forEach(response => {
        expect(response.errors).toBeUndefined();
        expect(response.data.documents).toBeDefined();
      });

      // Should complete in reasonable time (adjust threshold as needed)
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds
    });

    it('should handle rapid operation sequences', async () => {
      const documentId = testData.documents[0].id;
      const operationCount = 50;

      // Generate sequence of operations
      const operations = Array.from({ length: operationCount }, (_, i) => ({
        type: 'INSERT',
        position: i,
        content: { text: `Operation ${i} ` },
        clientId: testData.users[0].id,
      }));

      // Split into chunks and execute rapidly
      const chunkSize = 10;
      const chunks = [];
      for (let i = 0; i < operations.length; i += chunkSize) {
        chunks.push(operations.slice(i, i + chunkSize));
      }

      const promises = chunks.map(chunk =>
        integrationTestUtils.graphql.mutate(
          UPDATE_DOCUMENT_CONTENT,
          { id: documentId, operations: chunk },
          {
            headers: {
              'x-user-id': testData.users[0].id,
              'x-organization-id': testData.organization.id,
            },
          }
        )
      );

      const responses = await Promise.all(promises);

      // All should succeed
      responses.forEach(response => {
        expect(response.errors).toBeUndefined();
        expect(response.data.updateDocumentContent.success).toBe(true);
      });

      // Verify all operations were stored
      const dbResult = await integrationTestUtils.db.query(
        'SELECT COUNT(*) as count FROM operations WHERE document_id = $1',
        [documentId]
      );
      expect(parseInt(dbResult.rows[0].count)).toBeGreaterThanOrEqual(operationCount);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain operation order consistency', async () => {
      const documentId = testData.documents[0].id;
      const userId = testData.users[0].id;

      // Create a series of dependent operations
      const operations = [
        { type: 'INSERT', position: 0, content: { text: 'First ' } },
        { type: 'INSERT', position: 6, content: { text: 'Second ' } },
        { type: 'INSERT', position: 13, content: { text: 'Third' } },
      ];

      // Execute operations sequentially
      for (const operation of operations) {
        await integrationTestUtils.graphql.mutate(
          UPDATE_DOCUMENT_CONTENT,
          {
            id: documentId,
            operations: [{ ...operation, clientId: userId }]
          },
          {
            headers: {
              'x-user-id': userId,
              'x-organization-id': testData.organization.id,
            },
          }
        );
      }

      // Verify operations were stored in correct order
      const dbResult = await integrationTestUtils.db.query(
        'SELECT * FROM operations WHERE document_id = $1 ORDER BY timestamp',
        [documentId]
      );

      expect(dbResult.rows.length).toBeGreaterThanOrEqual(3);

      // Check that timestamps are in ascending order
      for (let i = 1; i < dbResult.rows.length; i++) {
        expect(new Date(dbResult.rows[i].timestamp))
          .toBeAfterOrEqualTo(new Date(dbResult.rows[i-1].timestamp));
      }
    });

    it('should maintain referential integrity between entities', async () => {
      const documentId = testData.documents[0].id;
      const userId = testData.users[0].id;

      // Create comment
      const commentResponse = await integrationTestUtils.graphql.mutate(
        CREATE_COMMENT,
        {
          input: {
            documentId,
            content: { text: 'Test comment', format: 'PLAIN_TEXT' },
          },
        },
        {
          headers: {
            'x-user-id': userId,
            'x-organization-id': testData.organization.id,
          },
        }
      );

      const commentId = commentResponse.data.createComment.id;

      // Verify all relationships exist
      const relationships = await Promise.all([
        integrationTestUtils.db.query('SELECT * FROM documents WHERE id = $1', [documentId]),
        integrationTestUtils.db.query('SELECT * FROM users WHERE id = $1', [userId]),
        integrationTestUtils.db.query('SELECT * FROM comments WHERE id = $1', [commentId]),
      ]);

      relationships.forEach(result => {
        expect(result.rows).toHaveLength(1);
      });

      // Verify foreign key relationships
      const comment = relationships[2].rows[0];
      expect(comment.document_id).toBe(documentId);
      expect(comment.author_id).toBe(userId);
    });
  });
});
