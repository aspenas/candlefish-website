import { graphql, GraphQLSchema, buildSchema } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { createMockStore } from '@graphql-tools/mock';
import { addMocksToSchema } from '@graphql-tools/mock';
import DataLoader from 'dataloader';

// Mock implementations
import { mockDocumentService } from '../fixtures/document-service.mock';
import { mockUserService } from '../fixtures/user-service.mock';
import { mockProjectService } from '../fixtures/project-service.mock';
import { mockCollaborationService } from '../fixtures/collaboration-service.mock';
import { createTestContext } from '../fixtures/test-context';

// Import resolvers
import { documentResolvers } from '../../graphql/resolvers/document-resolvers';
import { userResolvers } from '../../graphql/resolvers/user-resolvers';
import { collaborationResolvers } from '../../graphql/resolvers/collaboration-resolvers';
import { subscriptionResolvers } from '../../graphql/resolvers/subscription-resolvers';

// Type definitions
const typeDefs = `
  scalar DateTime
  scalar JSON
  scalar UUID
  scalar Upload

  type Query {
    document(id: UUID!): Document
    documents(projectId: UUID, limit: Int = 20, offset: Int = 0, status: DocumentStatus): DocumentConnection
    searchDocuments(query: String!, filters: DocumentFilters): SearchResult
    user(id: UUID!): User
    project(id: UUID!): Project
    presence(documentId: UUID!): [Presence!]!
  }

  type Mutation {
    createDocument(input: CreateDocumentInput!): Document!
    updateDocument(id: UUID!, input: UpdateDocumentInput!): Document!
    deleteDocument(id: UUID!): Boolean!
    applyOperation(input: OperationInput!): OperationResult!
    addComment(input: CommentInput!): Comment!
    updatePresence(input: PresenceInput!): Presence!
    shareDocument(documentId: UUID!, userIds: [UUID!]!, role: UserRole!): [DocumentCollaborator!]!
  }

  type Subscription {
    documentOperations(documentId: UUID!): OperationEvent!
    presenceUpdates(documentId: UUID!): PresenceEvent!
    documentComments(documentId: UUID!): CommentEvent!
    documentChanges(documentId: UUID!): DocumentChangeEvent!
  }

  type Document {
    id: UUID!
    title: String!
    content: String!
    status: DocumentStatus!
    type: DocumentType!
    projectId: UUID
    project: Project
    owner: User!
    ownerId: UUID!
    collaborators: [DocumentCollaborator!]!
    versions: [Version!]!
    comments: [Comment!]!
    lastOperation: Operation
    presence: [Presence!]!
    permissions: DocumentPermissions!
    createdAt: DateTime!
    updatedAt: DateTime!
    lastModified: DateTime!
  }

  type User {
    id: UUID!
    name: String!
    email: String!
    avatar: String
    status: UserStatus!
    lastSeen: DateTime
    preferences: UserPreferences!
    projects: [Project!]!
    documents: [Document!]!
    recentDocuments(limit: Int = 10): [Document!]!
    collaborations: [DocumentCollaborator!]!
  }

  type Project {
    id: UUID!
    name: String!
    description: String
    ownerId: UUID!
    owner: User!
    members: [ProjectMember!]!
    documents: [Document!]!
    settings: ProjectSettings!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type DocumentCollaborator {
    id: UUID!
    document: Document!
    user: User!
    role: UserRole!
    addedAt: DateTime!
    addedBy: User!
    presence: Presence
  }

  type Version {
    id: UUID!
    number: Int!
    documentId: UUID!
    document: Document!
    content: String!
    createdBy: User!
    createdAt: DateTime!
    comment: String
    operations: [Operation!]!
  }

  type Operation {
    id: UUID!
    type: OperationType!
    position: Int!
    length: Int
    content: String
    userId: UUID!
    user: User!
    documentId: UUID!
    timestamp: DateTime!
    acknowledged: Boolean!
  }

  type Comment {
    id: UUID!
    content: String!
    documentId: UUID!
    document: Document!
    author: User!
    position: CommentPosition
    resolved: Boolean!
    resolvedBy: User
    resolvedAt: DateTime
    replies: [CommentReply!]!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Presence {
    userId: UUID!
    user: User!
    documentId: UUID!
    status: PresenceStatus!
    cursor: Int
    selection: Selection
    lastSeen: DateTime!
    color: String!
  }

  # Input Types
  input CreateDocumentInput {
    title: String!
    content: String = ""
    type: DocumentType = MARKDOWN
    projectId: UUID
    isPrivate: Boolean = false
    permissions: DocumentPermissionsInput
  }

  input UpdateDocumentInput {
    title: String
    content: String
    status: DocumentStatus
    permissions: DocumentPermissionsInput
  }

  input OperationInput {
    documentId: UUID!
    type: OperationType!
    position: Int!
    content: String
    length: Int
    clientId: String
  }

  input CommentInput {
    documentId: UUID!
    content: String!
    position: CommentPositionInput
    replyTo: UUID
  }

  input PresenceInput {
    documentId: UUID!
    cursor: Int
    selection: SelectionInput
    status: PresenceStatus = ACTIVE
  }

  # Enums and other types...
  enum DocumentStatus { DRAFT ACTIVE ARCHIVED DELETED }
  enum DocumentType { MARKDOWN RICH_TEXT PLAIN_TEXT }
  enum UserRole { VIEWER COMMENTER EDITOR ADMIN OWNER }
  enum UserStatus { ACTIVE INACTIVE SUSPENDED }
  enum OperationType { INSERT DELETE RETAIN REPLACE }
  enum PresenceStatus { ACTIVE IDLE AWAY OFFLINE }

  # Additional types would be defined here...
  type DocumentConnection {
    items: [Document!]!
    totalCount: Int!
    hasMore: Boolean!
    cursor: String
  }

  type SearchResult {
    results: [DocumentSearchMatch!]!
    totalCount: Int!
    facets: [SearchFacet!]!
  }

  type DocumentSearchMatch {
    document: Document!
    matchScore: Float!
    highlights: [String!]!
  }

  type OperationResult {
    success: Boolean!
    operation: Operation
    documentVersion: Int!
    conflicts: [OperationConflict!]!
  }

  type OperationEvent {
    operation: Operation!
    user: User!
    documentVersion: Int!
  }

  type PresenceEvent {
    presence: Presence!
    action: PresenceAction!
  }

  type CommentEvent {
    comment: Comment!
    action: CommentAction!
  }

  type DocumentChangeEvent {
    document: Document!
    changeType: DocumentChangeType!
    changedBy: User!
    timestamp: DateTime!
  }

  # More types would be defined here...
  type DocumentPermissions {
    canRead: Boolean!
    canWrite: Boolean!
    canComment: Boolean!
    canShare: Boolean!
    canDelete: Boolean!
  }

  input DocumentPermissionsInput {
    isPublic: Boolean
    allowComments: Boolean
    allowDownload: Boolean
  }

  type Selection {
    start: Int!
    end: Int!
  }

  input SelectionInput {
    start: Int!
    end: Int!
  }

  type CommentPosition {
    start: Int!
    end: Int!
  }

  input CommentPositionInput {
    start: Int!
    end: Int!
  }

  type CommentReply {
    id: UUID!
    content: String!
    author: User!
    createdAt: DateTime!
  }

  type ProjectMember {
    user: User!
    role: UserRole!
    addedAt: DateTime!
    addedBy: User!
  }

  type ProjectSettings {
    isPublic: Boolean!
    allowInvitations: Boolean!
    autoSave: Boolean!
    versionLimit: Int!
  }

  type UserPreferences {
    theme: String!
    language: String!
    notifications: NotificationSettings!
    editor: EditorSettings!
  }

  type NotificationSettings {
    email: Boolean!
    push: Boolean!
    mentions: Boolean!
    comments: Boolean!
  }

  type EditorSettings {
    fontSize: Int!
    lineHeight: Float!
    tabSize: Int!
    wordWrap: Boolean!
  }

  type SearchFacet {
    field: String!
    values: [SearchFacetValue!]!
  }

  type SearchFacetValue {
    value: String!
    count: Int!
  }

  type OperationConflict {
    operationId: UUID!
    conflictType: ConflictType!
    resolution: ConflictResolution!
  }

  input DocumentFilters {
    status: DocumentStatus
    type: DocumentType
    ownerId: UUID
    dateRange: DateRangeInput
    tags: [String!]
  }

  input DateRangeInput {
    from: DateTime
    to: DateTime
  }

  enum PresenceAction { JOINED LEFT UPDATED }
  enum CommentAction { ADDED UPDATED DELETED RESOLVED }
  enum DocumentChangeType { CREATED UPDATED DELETED SHARED UNSHARED }
  enum ConflictType { INSERT_COLLISION DELETE_COLLISION POSITION_MISMATCH }
  enum ConflictResolution { AUTO_RESOLVED MANUAL_REQUIRED USER_RESOLVED }
`;

describe('GraphQL Resolvers', () => {
  let schema: GraphQLSchema;
  let mockContext: any;

  beforeAll(() => {
    // Create executable schema with resolvers
    const resolvers = {
      Query: {
        ...documentResolvers.Query,
        ...userResolvers.Query,
      },
      Mutation: {
        ...documentResolvers.Mutation,
        ...collaborationResolvers.Mutation,
      },
      Subscription: {
        ...subscriptionResolvers.Subscription,
      },
      Document: {
        ...documentResolvers.Document,
      },
      User: {
        ...userResolvers.User,
      },
      // Custom scalar resolvers
      DateTime: {
        serialize: (value: any) => value.toISOString(),
        parseValue: (value: any) => new Date(value),
        parseLiteral: (ast: any) => new Date(ast.value),
      },
      UUID: {
        serialize: (value: any) => value,
        parseValue: (value: any) => value,
        parseLiteral: (ast: any) => ast.value,
      },
      JSON: {
        serialize: (value: any) => value,
        parseValue: (value: any) => value,
        parseLiteral: (ast: any) => JSON.parse(ast.value),
      },
    };

    schema = makeExecutableSchema({ typeDefs, resolvers });
    
    // Create mock context with DataLoaders
    mockContext = createTestContext();
  });

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('Query Resolvers', () => {
    describe('document resolver', () => {
      test('should resolve document by ID', async () => {
        const query = `
          query GetDocument($id: UUID!) {
            document(id: $id) {
              id
              title
              content
              status
              owner {
                id
                name
              }
            }
          }
        `;

        const variables = { id: 'doc-123' };
        
        mockDocumentService.getDocumentById.mockResolvedValue({
          id: 'doc-123',
          title: 'Test Document',
          content: 'Test content',
          status: 'ACTIVE',
          ownerId: 'user-456'
        });

        mockUserService.getUserById.mockResolvedValue({
          id: 'user-456',
          name: 'John Doe',
          email: 'john@example.com'
        });

        const result = await graphql({
          schema,
          source: query,
          variableValues: variables,
          contextValue: mockContext
        });

        expect(result.errors).toBeUndefined();
        expect(result.data?.document).toEqual({
          id: 'doc-123',
          title: 'Test Document',
          content: 'Test content',
          status: 'ACTIVE',
          owner: {
            id: 'user-456',
            name: 'John Doe'
          }
        });

        expect(mockDocumentService.getDocumentById).toHaveBeenCalledWith('doc-123');
      });

      test('should return null for non-existent document', async () => {
        const query = `
          query GetDocument($id: UUID!) {
            document(id: $id) {
              id
              title
            }
          }
        `;

        const variables = { id: 'non-existent' };
        
        mockDocumentService.getDocumentById.mockResolvedValue(null);

        const result = await graphql({
          schema,
          source: query,
          variableValues: variables,
          contextValue: mockContext
        });

        expect(result.errors).toBeUndefined();
        expect(result.data?.document).toBeNull();
      });

      test('should handle resolver errors gracefully', async () => {
        const query = `
          query GetDocument($id: UUID!) {
            document(id: $id) {
              id
              title
            }
          }
        `;

        const variables = { id: 'error-doc' };
        
        mockDocumentService.getDocumentById.mockRejectedValue(
          new Error('Database connection failed')
        );

        const result = await graphql({
          schema,
          source: query,
          variableValues: variables,
          contextValue: mockContext
        });

        expect(result.errors).toBeDefined();
        expect(result.errors![0].message).toContain('Database connection failed');
      });
    });

    describe('documents resolver', () => {
      test('should resolve paginated documents', async () => {
        const query = `
          query GetDocuments($projectId: UUID, $limit: Int, $offset: Int) {
            documents(projectId: $projectId, limit: $limit, offset: $offset) {
              items {
                id
                title
                status
              }
              totalCount
              hasMore
            }
          }
        `;

        const variables = { projectId: 'project-123', limit: 10, offset: 0 };
        
        mockDocumentService.getDocuments.mockResolvedValue({
          items: [
            { id: 'doc-1', title: 'Doc 1', status: 'ACTIVE' },
            { id: 'doc-2', title: 'Doc 2', status: 'DRAFT' }
          ],
          totalCount: 25,
          hasMore: true
        });

        const result = await graphql({
          schema,
          source: query,
          variableValues: variables,
          contextValue: mockContext
        });

        expect(result.errors).toBeUndefined();
        expect(result.data?.documents).toEqual({
          items: [
            { id: 'doc-1', title: 'Doc 1', status: 'ACTIVE' },
            { id: 'doc-2', title: 'Doc 2', status: 'DRAFT' }
          ],
          totalCount: 25,
          hasMore: true
        });
      });
    });

    describe('searchDocuments resolver', () => {
      test('should resolve document search with facets', async () => {
        const query = `
          query SearchDocuments($query: String!, $filters: DocumentFilters) {
            searchDocuments(query: $query, filters: $filters) {
              results {
                document {
                  id
                  title
                }
                matchScore
                highlights
              }
              totalCount
              facets {
                field
                values {
                  value
                  count
                }
              }
            }
          }
        `;

        const variables = {
          query: 'collaboration',
          filters: { status: 'ACTIVE' }
        };
        
        mockDocumentService.searchDocuments.mockResolvedValue({
          results: [
            {
              document: { id: 'doc-1', title: 'Collaboration Guide' },
              matchScore: 0.95,
              highlights: ['<mark>Collaboration</mark> techniques']
            }
          ],
          totalCount: 1,
          facets: [
            {
              field: 'status',
              values: [
                { value: 'ACTIVE', count: 8 },
                { value: 'DRAFT', count: 3 }
              ]
            }
          ]
        });

        const result = await graphql({
          schema,
          source: query,
          variableValues: variables,
          contextValue: mockContext
        });

        expect(result.errors).toBeUndefined();
        expect(result.data?.searchDocuments.totalCount).toBe(1);
        expect(result.data?.searchDocuments.facets).toHaveLength(1);
      });
    });
  });

  describe('Mutation Resolvers', () => {
    describe('createDocument mutation', () => {
      test('should create a new document', async () => {
        const mutation = `
          mutation CreateDocument($input: CreateDocumentInput!) {
            createDocument(input: $input) {
              id
              title
              content
              status
              owner {
                id
                name
              }
            }
          }
        `;

        const variables = {
          input: {
            title: 'New Document',
            content: 'Initial content',
            type: 'MARKDOWN',
            projectId: 'project-123'
          }
        };

        mockDocumentService.createDocument.mockResolvedValue({
          id: 'doc-new',
          title: 'New Document',
          content: 'Initial content',
          status: 'DRAFT',
          ownerId: 'user-current'
        });

        mockUserService.getUserById.mockResolvedValue({
          id: 'user-current',
          name: 'Current User',
          email: 'current@example.com'
        });

        const result = await graphql({
          schema,
          source: mutation,
          variableValues: variables,
          contextValue: mockContext
        });

        expect(result.errors).toBeUndefined();
        expect(result.data?.createDocument).toEqual({
          id: 'doc-new',
          title: 'New Document',
          content: 'Initial content',
          status: 'DRAFT',
          owner: {
            id: 'user-current',
            name: 'Current User'
          }
        });

        expect(mockDocumentService.createDocument).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'New Document',
            content: 'Initial content'
          }),
          'user-current'
        );
      });

      test('should handle validation errors', async () => {
        const mutation = `
          mutation CreateDocument($input: CreateDocumentInput!) {
            createDocument(input: $input) {
              id
              title
            }
          }
        `;

        const variables = {
          input: {
            title: '', // Invalid empty title
            content: 'Test content'
          }
        };

        mockDocumentService.createDocument.mockRejectedValue(
          new Error('Title is required')
        );

        const result = await graphql({
          schema,
          source: mutation,
          variableValues: variables,
          contextValue: mockContext
        });

        expect(result.errors).toBeDefined();
        expect(result.errors![0].message).toContain('Title is required');
      });
    });

    describe('applyOperation mutation', () => {
      test('should apply operational transform', async () => {
        const mutation = `
          mutation ApplyOperation($input: OperationInput!) {
            applyOperation(input: $input) {
              success
              operation {
                id
                type
                position
                content
              }
              documentVersion
              conflicts {
                operationId
                conflictType
              }
            }
          }
        `;

        const variables = {
          input: {
            documentId: 'doc-123',
            type: 'INSERT',
            position: 10,
            content: 'Hello World'
          }
        };

        mockCollaborationService.applyOperation.mockResolvedValue({
          success: true,
          operation: {
            id: 'op-123',
            type: 'INSERT',
            position: 10,
            content: 'Hello World',
            documentId: 'doc-123',
            userId: 'user-current'
          },
          documentVersion: 5,
          conflicts: []
        });

        const result = await graphql({
          schema,
          source: mutation,
          variableValues: variables,
          contextValue: mockContext
        });

        expect(result.errors).toBeUndefined();
        expect(result.data?.applyOperation.success).toBe(true);
        expect(result.data?.applyOperation.documentVersion).toBe(5);
        expect(result.data?.applyOperation.conflicts).toHaveLength(0);
      });

      test('should handle operation conflicts', async () => {
        const mutation = `
          mutation ApplyOperation($input: OperationInput!) {
            applyOperation(input: $input) {
              success
              conflicts {
                operationId
                conflictType
                resolution
              }
            }
          }
        `;

        const variables = {
          input: {
            documentId: 'doc-123',
            type: 'DELETE',
            position: 5,
            length: 3
          }
        };

        mockCollaborationService.applyOperation.mockResolvedValue({
          success: false,
          operation: null,
          documentVersion: 4,
          conflicts: [
            {
              operationId: 'op-conflict',
              conflictType: 'DELETE_COLLISION',
              resolution: 'MANUAL_REQUIRED'
            }
          ]
        });

        const result = await graphql({
          schema,
          source: mutation,
          variableValues: variables,
          contextValue: mockContext
        });

        expect(result.errors).toBeUndefined();
        expect(result.data?.applyOperation.success).toBe(false);
        expect(result.data?.applyOperation.conflicts).toHaveLength(1);
      });
    });
  });

  describe('Field Resolvers', () => {
    describe('Document field resolvers', () => {
      test('should resolve document owner using DataLoader', async () => {
        const query = `
          query GetDocumentWithOwner($id: UUID!) {
            document(id: $id) {
              id
              title
              owner {
                id
                name
              }
            }
          }
        `;

        const variables = { id: 'doc-123' };

        mockDocumentService.getDocumentById.mockResolvedValue({
          id: 'doc-123',
          title: 'Test Document',
          ownerId: 'user-456'
        });

        // Mock DataLoader
        mockContext.dataloaders.userLoader.load.mockResolvedValue({
          id: 'user-456',
          name: 'Document Owner',
          email: 'owner@example.com'
        });

        const result = await graphql({
          schema,
          source: query,
          variableValues: variables,
          contextValue: mockContext
        });

        expect(result.errors).toBeUndefined();
        expect(result.data?.document.owner.name).toBe('Document Owner');
        expect(mockContext.dataloaders.userLoader.load).toHaveBeenCalledWith('user-456');
      });

      test('should resolve document collaborators', async () => {
        const query = `
          query GetDocumentCollaborators($id: UUID!) {
            document(id: $id) {
              id
              collaborators {
                user {
                  id
                  name
                }
                role
                addedAt
              }
            }
          }
        `;

        const variables = { id: 'doc-123' };

        mockDocumentService.getDocumentById.mockResolvedValue({
          id: 'doc-123',
          title: 'Collaborative Document'
        });

        mockDocumentService.getDocumentCollaborators.mockResolvedValue([
          {
            id: 'collab-1',
            userId: 'user-789',
            role: 'EDITOR',
            addedAt: '2023-01-01T00:00:00Z'
          },
          {
            id: 'collab-2',
            userId: 'user-101',
            role: 'VIEWER',
            addedAt: '2023-01-02T00:00:00Z'
          }
        ]);

        // Mock user lookups
        mockContext.dataloaders.userLoader.loadMany.mockResolvedValue([
          { id: 'user-789', name: 'Editor User' },
          { id: 'user-101', name: 'Viewer User' }
        ]);

        const result = await graphql({
          schema,
          source: query,
          variableValues: variables,
          contextValue: mockContext
        });

        expect(result.errors).toBeUndefined();
        expect(result.data?.document.collaborators).toHaveLength(2);
        expect(result.data?.document.collaborators[0].role).toBe('EDITOR');
      });

      test('should resolve document versions', async () => {
        const query = `
          query GetDocumentVersions($id: UUID!) {
            document(id: $id) {
              id
              versions {
                id
                number
                createdAt
                createdBy {
                  name
                }
              }
            }
          }
        `;

        const variables = { id: 'doc-123' };

        mockDocumentService.getDocumentById.mockResolvedValue({
          id: 'doc-123',
          title: 'Versioned Document'
        });

        mockDocumentService.getDocumentVersions.mockResolvedValue([
          {
            id: 'version-1',
            number: 1,
            createdAt: '2023-01-01T00:00:00Z',
            createdById: 'user-creator'
          },
          {
            id: 'version-2',
            number: 2,
            createdAt: '2023-01-02T00:00:00Z',
            createdById: 'user-editor'
          }
        ]);

        mockContext.dataloaders.userLoader.loadMany.mockResolvedValue([
          { id: 'user-creator', name: 'Document Creator' },
          { id: 'user-editor', name: 'Document Editor' }
        ]);

        const result = await graphql({
          schema,
          source: query,
          variableValues: variables,
          contextValue: mockContext
        });

        expect(result.errors).toBeUndefined();
        expect(result.data?.document.versions).toHaveLength(2);
        expect(result.data?.document.versions[1].createdBy.name).toBe('Document Editor');
      });
    });

    describe('User field resolvers', () => {
      test('should resolve user recent documents', async () => {
        const query = `
          query GetUserWithRecentDocs($id: UUID!) {
            user(id: $id) {
              id
              name
              recentDocuments(limit: 3) {
                id
                title
                lastModified
              }
            }
          }
        `;

        const variables = { id: 'user-123' };

        mockUserService.getUserById.mockResolvedValue({
          id: 'user-123',
          name: 'Active User',
          email: 'active@example.com'
        });

        mockDocumentService.getRecentDocumentsByUser.mockResolvedValue([
          {
            id: 'doc-recent-1',
            title: 'Recent Doc 1',
            lastModified: '2023-01-03T00:00:00Z'
          },
          {
            id: 'doc-recent-2',
            title: 'Recent Doc 2',
            lastModified: '2023-01-02T00:00:00Z'
          }
        ]);

        const result = await graphql({
          schema,
          source: query,
          variableValues: variables,
          contextValue: mockContext
        });

        expect(result.errors).toBeUndefined();
        expect(result.data?.user.recentDocuments).toHaveLength(2);
        expect(mockDocumentService.getRecentDocumentsByUser).toHaveBeenCalledWith(
          'user-123',
          3
        );
      });
    });
  });

  describe('DataLoader Integration', () => {
    test('should batch user lookups efficiently', async () => {
      const query = `
        query GetMultipleDocuments {
          doc1: document(id: "doc-1") {
            owner { name }
          }
          doc2: document(id: "doc-2") {
            owner { name }
          }
          doc3: document(id: "doc-3") {
            owner { name }
          }
        }
      `;

      // Mock documents with same owner to test batching
      mockDocumentService.getDocumentById
        .mockResolvedValueOnce({ id: 'doc-1', ownerId: 'user-shared' })
        .mockResolvedValueOnce({ id: 'doc-2', ownerId: 'user-shared' })
        .mockResolvedValueOnce({ id: 'doc-3', ownerId: 'user-shared' });

      // Mock batched user lookup
      mockContext.dataloaders.userLoader.load.mockResolvedValue({
        id: 'user-shared',
        name: 'Shared Owner'
      });

      const result = await graphql({
        schema,
        source: query,
        contextValue: mockContext
      });

      expect(result.errors).toBeUndefined();
      expect(result.data?.doc1.owner.name).toBe('Shared Owner');
      expect(result.data?.doc2.owner.name).toBe('Shared Owner');
      expect(result.data?.doc3.owner.name).toBe('Shared Owner');

      // Should batch the user lookups into a single call
      expect(mockContext.dataloaders.userLoader.load).toHaveBeenCalledTimes(3);
    });

    test('should handle DataLoader errors gracefully', async () => {
      const query = `
        query GetDocumentWithBadOwner($id: UUID!) {
          document(id: $id) {
            id
            owner {
              name
            }
          }
        }
      `;

      const variables = { id: 'doc-bad-owner' };

      mockDocumentService.getDocumentById.mockResolvedValue({
        id: 'doc-bad-owner',
        ownerId: 'user-nonexistent'
      });

      mockContext.dataloaders.userLoader.load.mockRejectedValue(
        new Error('User not found')
      );

      const result = await graphql({
        schema,
        source: query,
        variableValues: variables,
        contextValue: mockContext
      });

      expect(result.errors).toBeDefined();
      expect(result.errors![0].message).toContain('User not found');
    });
  });

  describe('Authorization Integration', () => {
    test('should enforce document read permissions', async () => {
      const query = `
        query GetRestrictedDocument($id: UUID!) {
          document(id: $id) {
            id
            title
            content
          }
        }
      `;

      const variables = { id: 'doc-private' };

      // Mock unauthorized access
      mockDocumentService.getDocumentById.mockRejectedValue(
        new Error('Access denied: Insufficient permissions')
      );

      const result = await graphql({
        schema,
        source: query,
        variableValues: variables,
        contextValue: { ...mockContext, user: { id: 'unauthorized-user' } }
      });

      expect(result.errors).toBeDefined();
      expect(result.errors![0].message).toContain('Access denied');
    });

    test('should enforce mutation permissions', async () => {
      const mutation = `
        mutation DeleteRestrictedDocument($id: UUID!) {
          deleteDocument(id: $id)
        }
      `;

      const variables = { id: 'doc-protected' };

      mockDocumentService.deleteDocument.mockRejectedValue(
        new Error('Access denied: Owner or admin privileges required')
      );

      const result = await graphql({
        schema,
        source: mutation,
        variableValues: variables,
        contextValue: { ...mockContext, user: { id: 'regular-user', role: 'USER' } }
      });

      expect(result.errors).toBeDefined();
      expect(result.errors![0].message).toContain('Owner or admin privileges required');
    });
  });

  describe('Error Handling', () => {
    test('should handle service layer errors gracefully', async () => {
      const query = `
        query GetDocument($id: UUID!) {
          document(id: $id) {
            id
            title
          }
        }
      `;

      const variables = { id: 'doc-service-error' };

      mockDocumentService.getDocumentById.mockRejectedValue(
        new Error('Service temporarily unavailable')
      );

      const result = await graphql({
        schema,
        source: query,
        variableValues: variables,
        contextValue: mockContext
      });

      expect(result.errors).toBeDefined();
      expect(result.errors![0].message).toBe('Service temporarily unavailable');
      expect(result.errors![0].path).toEqual(['document']);
    });

    test('should provide detailed field-level errors', async () => {
      const query = `
        query GetDocumentWithBadRelations($id: UUID!) {
          document(id: $id) {
            id
            title
            owner {
              id
              name
            }
            project {
              id
              name
            }
          }
        }
      `;

      const variables = { id: 'doc-partial-error' };

      mockDocumentService.getDocumentById.mockResolvedValue({
        id: 'doc-partial-error',
        title: 'Partially Accessible Document',
        ownerId: 'user-valid',
        projectId: 'project-invalid'
      });

      mockContext.dataloaders.userLoader.load.mockResolvedValue({
        id: 'user-valid',
        name: 'Valid User'
      });

      mockContext.dataloaders.projectLoader.load.mockRejectedValue(
        new Error('Project access denied')
      );

      const result = await graphql({
        schema,
        source: query,
        variableValues: variables,
        contextValue: mockContext
      });

      // Should have partial success with field-level error
      expect(result.data?.document.title).toBe('Partially Accessible Document');
      expect(result.data?.document.owner.name).toBe('Valid User');
      expect(result.errors).toBeDefined();
      expect(result.errors![0].path).toEqual(['document', 'project']);
    });
  });
});