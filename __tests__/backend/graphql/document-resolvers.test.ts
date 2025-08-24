import { gql } from 'graphql-tag';
import { createTestServer, graphqlTestUtils, errorTestUtils } from '../../utils/graphql-test-utils';

// Document management GraphQL tests
const typeDefs = gql`
  type User {
    id: ID!
    email: String!
    name: String!
    role: String!
  }
  
  type Organization {
    id: ID!
    name: String!
    slug: String!
  }
  
  type Document {
    id: ID!
    title: String!
    content: String!
    status: DocumentStatus!
    author: User!
    organization: Organization!
    collaborators: [User!]!
    comments: [Comment!]!
    createdAt: String!
    updatedAt: String!
  }
  
  type Comment {
    id: ID!
    content: String!
    author: User!
    document: Document!
    createdAt: String!
  }
  
  enum DocumentStatus {
    DRAFT
    REVIEW
    PUBLISHED
    ARCHIVED
  }
  
  input CreateDocumentInput {
    title: String!
    content: String!
    organizationId: ID!
    status: DocumentStatus = DRAFT
  }
  
  input UpdateDocumentInput {
    title: String
    content: String
    status: DocumentStatus
  }
  
  input CreateCommentInput {
    documentId: ID!
    content: String!
  }
  
  type Query {
    document(id: ID!): Document
    documents(authorId: ID, organizationId: ID, status: DocumentStatus): [Document!]!
    searchDocuments(query: String!, organizationId: ID): [Document!]!
  }
  
  type Mutation {
    createDocument(input: CreateDocumentInput!): Document!
    updateDocument(id: ID!, input: UpdateDocumentInput!): Document!
    deleteDocument(id: ID!): Boolean!
    addCollaborator(documentId: ID!, userId: ID!): Document!
    removeCollaborator(documentId: ID!, userId: ID!): Document!
    createComment(input: CreateCommentInput!): Comment!
  }
  
  type Subscription {
    documentUpdated(documentId: ID!): Document!
    commentAdded(documentId: ID!): Comment!
  }
`;

// Mock PubSub for subscriptions
const mockPubSub = {
  publish: jest.fn(),
  subscribe: jest.fn(),
  asyncIterator: jest.fn(() => ({
    next: jest.fn(),
    return: jest.fn(),
    throw: jest.fn(),
  })),
};

const resolvers = {
  Query: {
    document: async (_: any, { id }: any, { user, db }: any) => {
      if (!user) throw new Error('Not authenticated');
      
      const document = await db.findDocumentById(id);
      if (!document) throw new Error('Document not found');
      
      // Check access permissions
      if (document.authorId !== user.id && document.organizationId !== user.organizationId) {
        throw new Error('Forbidden');
      }
      
      return document;
    },
    
    documents: async (_: any, filters: any, { user, db }: any) => {
      if (!user) throw new Error('Not authenticated');
      
      let documents = Array.from(db.documents?.values() || []);
      
      // Apply filters
      if (filters.authorId) {
        documents = documents.filter(doc => doc.authorId === filters.authorId);
      }
      
      if (filters.organizationId) {
        documents = documents.filter(doc => doc.organizationId === filters.organizationId);
      }
      
      if (filters.status) {
        documents = documents.filter(doc => doc.status === filters.status);
      }
      
      // Only return documents user has access to
      return documents.filter(doc => 
        doc.authorId === user.id || 
        doc.organizationId === user.organizationId
      );
    },
    
    searchDocuments: async (_: any, { query, organizationId }: any, { user, db }: any) => {
      if (!user) throw new Error('Not authenticated');
      
      let documents = Array.from(db.documents?.values() || []);
      
      // Filter by organization if provided
      if (organizationId) {
        documents = documents.filter(doc => doc.organizationId === organizationId);
      }
      
      // Simple text search in title and content
      const searchTerm = query.toLowerCase();
      documents = documents.filter(doc => 
        doc.title.toLowerCase().includes(searchTerm) ||
        doc.content.toLowerCase().includes(searchTerm)
      );
      
      // Only return documents user has access to
      return documents.filter(doc => 
        doc.authorId === user.id || 
        doc.organizationId === user.organizationId
      );
    },
  },
  
  Mutation: {
    createDocument: async (_: any, { input }: any, { user, db }: any) => {
      if (!user) throw new Error('Not authenticated');
      
      // Validate organization access
      if (input.organizationId !== user.organizationId && user.role !== 'ADMIN') {
        throw new Error('Forbidden: Cannot create document in this organization');
      }
      
      const document = await db.createDocument({
        ...input,
        authorId: user.id,
        collaborators: [],
      });
      
      return document;
    },
    
    updateDocument: async (_: any, { id, input }: any, { user, db }: any) => {
      if (!user) throw new Error('Not authenticated');
      
      const document = await db.findDocumentById(id);
      if (!document) throw new Error('Document not found');
      
      // Check permissions
      if (document.authorId !== user.id && !document.collaborators?.includes(user.id)) {
        throw new Error('Forbidden: You cannot edit this document');
      }
      
      const updated = await db.updateDocument(id, input);
      
      // Publish update for real-time collaboration
      mockPubSub.publish('DOCUMENT_UPDATED', { documentUpdated: updated });
      
      return updated;
    },
    
    deleteDocument: async (_: any, { id }: any, { user, db }: any) => {
      if (!user) throw new Error('Not authenticated');
      
      const document = await db.findDocumentById(id);
      if (!document) throw new Error('Document not found');
      
      // Only author or admin can delete
      if (document.authorId !== user.id && user.role !== 'ADMIN') {
        throw new Error('Forbidden: You cannot delete this document');
      }
      
      await db.deleteDocument(id);
      return true;
    },
    
    addCollaborator: async (_: any, { documentId, userId }: any, { user, db }: any) => {
      if (!user) throw new Error('Not authenticated');
      
      const document = await db.findDocumentById(documentId);
      if (!document) throw new Error('Document not found');
      
      // Only author can add collaborators
      if (document.authorId !== user.id) {
        throw new Error('Forbidden: Only the author can add collaborators');
      }
      
      const collaborators = document.collaborators || [];
      if (!collaborators.includes(userId)) {
        collaborators.push(userId);
        return await db.updateDocument(documentId, { collaborators });
      }
      
      return document;
    },
    
    createComment: async (_: any, { input }: any, { user, db }: any) => {
      if (!user) throw new Error('Not authenticated');
      
      const document = await db.findDocumentById(input.documentId);
      if (!document) throw new Error('Document not found');
      
      // Check access to document
      if (document.authorId !== user.id && document.organizationId !== user.organizationId) {
        throw new Error('Forbidden');
      }
      
      const comment = await db.createComment({
        ...input,
        authorId: user.id,
      });
      
      // Publish comment for real-time updates
      mockPubSub.publish('COMMENT_ADDED', { commentAdded: comment });
      
      return comment;
    },
  },
  
  Subscription: {
    documentUpdated: {
      subscribe: (_: any, { documentId }: any) => 
        mockPubSub.asyncIterator(['DOCUMENT_UPDATED']),
    },
    
    commentAdded: {
      subscribe: (_: any, { documentId }: any) => 
        mockPubSub.asyncIterator(['COMMENT_ADDED']),
    },
  },
};

describe('GraphQL Document Resolvers', () => {
  let server: any;
  
  beforeAll(async () => {
    server = await createTestServer(typeDefs, resolvers);
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('Document Creation', () => {
    it('should create a new document', async () => {
      const user = graphqlTestUtils.createTestUser();
      
      const response = await graphqlTestUtils.executeQuery(
        server,
        gql`
          mutation CreateDocument($input: CreateDocumentInput!) {
            createDocument(input: $input) {
              id
              title
              content
              status
              author {
                id
                name
              }
            }
          }
        `,
        {
          input: {
            title: 'Test Document',
            content: 'This is a test document',
            organizationId: user.organizationId,
            status: 'DRAFT',
          },
        },
        user
      );
      
      expect(response.body.singleResult.errors).toBeUndefined();
      expect(response.body.singleResult.data.createDocument).toMatchObject({
        id: expect.any(String),
        title: 'Test Document',
        content: 'This is a test document',
        status: 'DRAFT',
        author: {
          id: user.id,
          name: user.name,
        },
      });
    });
    
    it('should fail to create document in different organization for regular user', async () => {
      const user = graphqlTestUtils.createTestUser();
      
      const response = await graphqlTestUtils.executeQuery(
        server,
        gql`
          mutation CreateDocument($input: CreateDocumentInput!) {
            createDocument(input: $input) {
              id
              title
            }
          }
        `,
        {
          input: {
            title: 'Test Document',
            content: 'Content',
            organizationId: 'different-org-id',
          },
        },
        user
      );
      
      errorTestUtils.expectForbiddenError(response);
    });
  });
  
  describe('Document Updates', () => {
    it('should allow author to update their document', async () => {
      const user = graphqlTestUtils.createTestUser({ id: 'user-1' });
      
      const response = await graphqlTestUtils.executeQuery(
        server,
        gql`
          mutation UpdateDocument($id: ID!, $input: UpdateDocumentInput!) {
            updateDocument(id: $id, input: $input) {
              id
              title
              content
              status
            }
          }
        `,
        {
          id: 'doc-1',
          input: {
            title: 'Updated Test Document',
            content: 'Updated content',
            status: 'REVIEW',
          },
        },
        user
      );
      
      expect(response.body.singleResult.errors).toBeUndefined();
      expect(response.body.singleResult.data.updateDocument).toMatchObject({
        id: 'doc-1',
        title: 'Updated Test Document',
        content: 'Updated content',
        status: 'REVIEW',
      });
      
      // Verify publication for real-time updates
      expect(mockPubSub.publish).toHaveBeenCalledWith(
        'DOCUMENT_UPDATED',
        expect.objectContaining({
          documentUpdated: expect.objectContaining({
            id: 'doc-1',
            title: 'Updated Test Document',
          }),
        })
      );
    });
    
    it('should fail to update document without permission', async () => {
      const unauthorizedUser = graphqlTestUtils.createTestUser({ id: 'unauthorized-user' });
      
      const response = await graphqlTestUtils.executeQuery(
        server,
        gql`
          mutation UpdateDocument($id: ID!, $input: UpdateDocumentInput!) {
            updateDocument(id: $id, input: $input) {
              id
              title
            }
          }
        `,
        {
          id: 'doc-1',
          input: {
            title: 'Unauthorized Update',
          },
        },
        unauthorizedUser
      );
      
      errorTestUtils.expectForbiddenError(response);
    });
  });
  
  describe('Document Queries', () => {
    it('should fetch a document by ID', async () => {
      const user = graphqlTestUtils.createTestUser({ id: 'user-1', organizationId: 'org-1' });
      
      const response = await graphqlTestUtils.executeQuery(
        server,
        gql`
          query GetDocument($id: ID!) {
            document(id: $id) {
              id
              title
              content
              status
              author {
                id
                name
              }
            }
          }
        `,
        {
          id: 'doc-1',
        },
        user
      );
      
      expect(response.body.singleResult.errors).toBeUndefined();
      expect(response.body.singleResult.data.document).toMatchObject({
        id: 'doc-1',
        title: expect.any(String),
        content: expect.any(String),
        status: expect.any(String),
      });
    });
    
    it('should fetch documents with filters', async () => {
      const user = graphqlTestUtils.createTestUser({ id: 'user-1' });
      
      const response = await graphqlTestUtils.executeQuery(
        server,
        gql`
          query GetDocuments($authorId: ID, $status: DocumentStatus) {
            documents(authorId: $authorId, status: $status) {
              id
              title
              status
              author {
                id
                name
              }
            }
          }
        `,
        {
          authorId: 'user-1',
          status: 'PUBLISHED',
        },
        user
      );
      
      expect(response.body.singleResult.errors).toBeUndefined();
      expect(Array.isArray(response.body.singleResult.data.documents)).toBe(true);
    });
    
    it('should search documents by text', async () => {
      const user = graphqlTestUtils.createTestUser();
      
      const response = await graphqlTestUtils.executeQuery(
        server,
        gql`
          query SearchDocuments($query: String!, $organizationId: ID) {
            searchDocuments(query: $query, organizationId: $organizationId) {
              id
              title
              content
            }
          }
        `,
        {
          query: 'test',
          organizationId: user.organizationId,
        },
        user
      );
      
      expect(response.body.singleResult.errors).toBeUndefined();
      expect(Array.isArray(response.body.singleResult.data.searchDocuments)).toBe(true);
    });
  });
  
  describe('Collaboration', () => {
    it('should add collaborator to document', async () => {
      const author = graphqlTestUtils.createTestUser({ id: 'user-1' });
      
      const response = await graphqlTestUtils.executeQuery(
        server,
        gql`
          mutation AddCollaborator($documentId: ID!, $userId: ID!) {
            addCollaborator(documentId: $documentId, userId: $userId) {
              id
              collaborators {
                id
              }
            }
          }
        `,
        {
          documentId: 'doc-1',
          userId: 'user-2',
        },
        author
      );
      
      expect(response.body.singleResult.errors).toBeUndefined();
    });
  });
  
  describe('Comments', () => {
    it('should create a comment on a document', async () => {
      const user = graphqlTestUtils.createTestUser({ organizationId: 'org-1' });
      
      const response = await graphqlTestUtils.executeQuery(
        server,
        gql`
          mutation CreateComment($input: CreateCommentInput!) {
            createComment(input: $input) {
              id
              content
              author {
                id
                name
              }
            }
          }
        `,
        {
          input: {
            documentId: 'doc-1',
            content: 'This is a test comment',
          },
        },
        user
      );
      
      expect(response.body.singleResult.errors).toBeUndefined();
      expect(response.body.singleResult.data.createComment).toMatchObject({
        id: expect.any(String),
        content: 'This is a test comment',
        author: {
          id: user.id,
          name: user.name,
        },
      });
      
      // Verify real-time comment notification
      expect(mockPubSub.publish).toHaveBeenCalledWith(
        'COMMENT_ADDED',
        expect.objectContaining({
          commentAdded: expect.objectContaining({
            content: 'This is a test comment',
          }),
        })
      );
    });
  });
  
  describe('Document Deletion', () => {
    it('should allow author to delete their document', async () => {
      const author = graphqlTestUtils.createTestUser({ id: 'user-1' });
      
      const response = await graphqlTestUtils.executeQuery(
        server,
        gql`
          mutation DeleteDocument($id: ID!) {
            deleteDocument(id: $id)
          }
        `,
        {
          id: 'doc-1',
        },
        author
      );
      
      expect(response.body.singleResult.errors).toBeUndefined();
      expect(response.body.singleResult.data.deleteDocument).toBe(true);
    });
    
    it('should allow admin to delete any document', async () => {
      const admin = graphqlTestUtils.createAdminUser();
      
      const response = await graphqlTestUtils.executeQuery(
        server,
        gql`
          mutation DeleteDocument($id: ID!) {
            deleteDocument(id: $id)
          }
        `,
        {
          id: 'doc-1',
        },
        admin
      );
      
      expect(response.body.singleResult.errors).toBeUndefined();
      expect(response.body.singleResult.data.deleteDocument).toBe(true);
    });
    
    it('should fail for unauthorized user', async () => {
      const unauthorizedUser = graphqlTestUtils.createTestUser({ id: 'unauthorized-user' });
      
      const response = await graphqlTestUtils.executeQuery(
        server,
        gql`
          mutation DeleteDocument($id: ID!) {
            deleteDocument(id: $id)
          }
        `,
        {
          id: 'doc-1',
        },
        unauthorizedUser
      );
      
      errorTestUtils.expectForbiddenError(response);
    });
  });
});
