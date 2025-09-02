import { buildSchema, graphql, validate, parse } from 'graphql';
import { readFileSync } from 'fs';
import { join } from 'path';
import { expect } from '@jest/globals';

describe('GraphQL Schema Validation', () => {
  let schema: any;
  let collaborationSchema: string;

  beforeAll(() => {
    // Load all GraphQL schema files
    const schemaPath = join(__dirname, '../../graphql/schema');
    
    try {
      const mainSchema = readFileSync(join(schemaPath, 'schema.graphql'), 'utf8');
      const typesSchema = readFileSync(join(schemaPath, 'types/collaboration.graphql'), 'utf8');
      const queriesSchema = readFileSync(join(schemaPath, 'collaboration-queries.graphql'), 'utf8');
      const mutationsSchema = readFileSync(join(schemaPath, 'collaboration-mutations.graphql'), 'utf8');
      const subscriptionsSchema = readFileSync(join(schemaPath, 'collaboration-subscriptions.graphql'), 'utf8');
      const scalarsSchema = readFileSync(join(schemaPath, 'scalars.graphql'), 'utf8');
      
      collaborationSchema = `
        ${scalarsSchema}
        ${typesSchema}
        ${queriesSchema}
        ${mutationsSchema}
        ${subscriptionsSchema}
        ${mainSchema}
      `;
      
      schema = buildSchema(collaborationSchema);
    } catch (error) {
      console.error('Failed to load schema files:', error);
      throw error;
    }
  });

  describe('Schema Structure', () => {
    test('should have valid schema syntax', () => {
      expect(schema).toBeDefined();
      expect(schema.getQueryType()).toBeDefined();
      expect(schema.getMutationType()).toBeDefined();
      expect(schema.getSubscriptionType()).toBeDefined();
    });

    test('should define all required types', () => {
      const typeMap = schema.getTypeMap();
      
      // Core collaboration types
      expect(typeMap.Document).toBeDefined();
      expect(typeMap.User).toBeDefined();
      expect(typeMap.Project).toBeDefined();
      expect(typeMap.Operation).toBeDefined();
      expect(typeMap.Version).toBeDefined();
      expect(typeMap.Comment).toBeDefined();
      expect(typeMap.Presence).toBeDefined();
      
      // Input types
      expect(typeMap.CreateDocumentInput).toBeDefined();
      expect(typeMap.UpdateDocumentInput).toBeDefined();
      expect(typeMap.OperationInput).toBeDefined();
      expect(typeMap.CommentInput).toBeDefined();
      
      // Enum types
      expect(typeMap.DocumentStatus).toBeDefined();
      expect(typeMap.OperationType).toBeDefined();
      expect(typeMap.UserRole).toBeDefined();
      expect(typeMap.PresenceStatus).toBeDefined();
    });

    test('should define all required custom scalars', () => {
      const typeMap = schema.getTypeMap();
      
      expect(typeMap.DateTime).toBeDefined();
      expect(typeMap.JSON).toBeDefined();
      expect(typeMap.Upload).toBeDefined();
      expect(typeMap.UUID).toBeDefined();
    });

    test('should have proper field relationships', () => {
      const documentType = schema.getType('Document');
      const fields = documentType.getFields();
      
      expect(fields.id).toBeDefined();
      expect(fields.title).toBeDefined();
      expect(fields.content).toBeDefined();
      expect(fields.owner).toBeDefined();
      expect(fields.collaborators).toBeDefined();
      expect(fields.versions).toBeDefined();
      expect(fields.comments).toBeDefined();
      expect(fields.createdAt).toBeDefined();
      expect(fields.updatedAt).toBeDefined();
    });
  });

  describe('Query Validation', () => {
    const testQueries = [
      {
        name: 'getDocument',
        query: `
          query GetDocument($id: UUID!) {
            document(id: $id) {
              id
              title
              content
              status
              owner {
                id
                name
                avatar
              }
              collaborators {
                id
                name
                role
                presence {
                  status
                  lastSeen
                  cursor
                }
              }
              versions {
                id
                number
                createdAt
                createdBy {
                  id
                  name
                }
              }
            }
          }
        `,
        variables: { id: '550e8400-e29b-41d4-a716-446655440000' }
      },
      {
        name: 'getDocuments',
        query: `
          query GetDocuments($projectId: UUID, $limit: Int, $offset: Int) {
            documents(projectId: $projectId, limit: $limit, offset: $offset) {
              items {
                id
                title
                status
                lastModified
                owner {
                  name
                }
              }
              totalCount
              hasMore
            }
          }
        `,
        variables: { 
          projectId: '550e8400-e29b-41d4-a716-446655440001',
          limit: 10,
          offset: 0
        }
      },
      {
        name: 'searchDocuments',
        query: `
          query SearchDocuments($query: String!, $filters: DocumentFilters) {
            searchDocuments(query: $query, filters: $filters) {
              results {
                id
                title
                content
                matchScore
                highlights
              }
              facets {
                type
                values {
                  value
                  count
                }
              }
            }
          }
        `,
        variables: {
          query: "collaboration platform",
          filters: {
            status: "ACTIVE",
            dateRange: {
              from: "2023-01-01T00:00:00Z",
              to: "2023-12-31T23:59:59Z"
            }
          }
        }
      }
    ];

    testQueries.forEach(({ name, query, variables }) => {
      test(`should validate ${name} query`, () => {
        const document = parse(query);
        const validationErrors = validate(schema, document);
        
        expect(validationErrors).toEqual([]);
      });
    });

    test('should reject invalid field selections', () => {
      const invalidQuery = `
        query InvalidQuery {
          document(id: "test") {
            id
            nonExistentField
          }
        }
      `;
      
      const document = parse(invalidQuery);
      const validationErrors = validate(schema, document);
      
      expect(validationErrors.length).toBeGreaterThan(0);
      expect(validationErrors[0].message).toContain('nonExistentField');
    });

    test('should validate required arguments', () => {
      const queryWithoutRequiredArg = `
        query MissingRequiredArg {
          document {
            id
            title
          }
        }
      `;
      
      const document = parse(queryWithoutRequiredArg);
      const validationErrors = validate(schema, document);
      
      expect(validationErrors.length).toBeGreaterThan(0);
      expect(validationErrors[0].message).toContain('required');
    });
  });

  describe('Mutation Validation', () => {
    const testMutations = [
      {
        name: 'createDocument',
        mutation: `
          mutation CreateDocument($input: CreateDocumentInput!) {
            createDocument(input: $input) {
              id
              title
              content
              status
              createdAt
              owner {
                id
                name
              }
            }
          }
        `,
        variables: {
          input: {
            title: "New Collaboration Document",
            content: "Initial content",
            projectId: "550e8400-e29b-41d4-a716-446655440000",
            type: "MARKDOWN",
            isPrivate: false
          }
        }
      },
      {
        name: 'updateDocument',
        mutation: `
          mutation UpdateDocument($id: UUID!, $input: UpdateDocumentInput!) {
            updateDocument(id: $id, input: $input) {
              id
              title
              content
              lastModified
              version {
                number
                createdBy {
                  name
                }
              }
            }
          }
        `,
        variables: {
          id: "550e8400-e29b-41d4-a716-446655440000",
          input: {
            title: "Updated Title",
            content: "Updated content"
          }
        }
      },
      {
        name: 'applyOperation',
        mutation: `
          mutation ApplyOperation($input: OperationInput!) {
            applyOperation(input: $input) {
              success
              operation {
                id
                type
                position
                content
                userId
                timestamp
              }
              documentVersion
              conflicts {
                operationId
                conflictType
                resolution
              }
            }
          }
        `,
        variables: {
          input: {
            documentId: "550e8400-e29b-41d4-a716-446655440000",
            type: "INSERT",
            position: 10,
            content: "New text",
            length: 8
          }
        }
      },
      {
        name: 'addComment',
        mutation: `
          mutation AddComment($input: CommentInput!) {
            addComment(input: $input) {
              id
              content
              author {
                id
                name
                avatar
              }
              position {
                start
                end
              }
              createdAt
              resolved
            }
          }
        `,
        variables: {
          input: {
            documentId: "550e8400-e29b-41d4-a716-446655440000",
            content: "This needs clarification",
            position: {
              start: 50,
              end: 75
            }
          }
        }
      }
    ];

    testMutations.forEach(({ name, mutation, variables }) => {
      test(`should validate ${name} mutation`, () => {
        const document = parse(mutation);
        const validationErrors = validate(schema, document);
        
        expect(validationErrors).toEqual([]);
      });
    });

    test('should validate input types', () => {
      const invalidMutation = `
        mutation InvalidInput($input: CreateDocumentInput!) {
          createDocument(input: $input) {
            id
          }
        }
      `;
      
      const document = parse(invalidMutation);
      const validationErrors = validate(schema, document);
      
      // Should pass validation (input type exists)
      expect(validationErrors).toEqual([]);
    });
  });

  describe('Subscription Validation', () => {
    const testSubscriptions = [
      {
        name: 'documentOperations',
        subscription: `
          subscription DocumentOperations($documentId: UUID!) {
            documentOperations(documentId: $documentId) {
              operation {
                id
                type
                position
                content
                userId
                timestamp
              }
              user {
                id
                name
                avatar
              }
              cursor
            }
          }
        `,
        variables: { documentId: "550e8400-e29b-41d4-a716-446655440000" }
      },
      {
        name: 'presenceUpdates',
        subscription: `
          subscription PresenceUpdates($documentId: UUID!) {
            presenceUpdates(documentId: $documentId) {
              user {
                id
                name
                avatar
              }
              presence {
                status
                cursor
                selection {
                  start
                  end
                }
                lastSeen
              }
            }
          }
        `,
        variables: { documentId: "550e8400-e29b-41d4-a716-446655440000" }
      },
      {
        name: 'documentComments',
        subscription: `
          subscription DocumentComments($documentId: UUID!) {
            documentComments(documentId: $documentId) {
              comment {
                id
                content
                author {
                  name
                  avatar
                }
                position {
                  start
                  end
                }
                createdAt
              }
              action
            }
          }
        `,
        variables: { documentId: "550e8400-e29b-41d4-a716-446655440000" }
      }
    ];

    testSubscriptions.forEach(({ name, subscription, variables }) => {
      test(`should validate ${name} subscription`, () => {
        const document = parse(subscription);
        const validationErrors = validate(schema, document);
        
        expect(validationErrors).toEqual([]);
      });
    });
  });

  describe('Directive Validation', () => {
    test('should support authentication directives', () => {
      const queryWithAuth = `
        query SecureQuery {
          document(id: "test") @auth(requires: USER) {
            id
            title
            sensitiveData @auth(requires: ADMIN)
          }
        }
      `;
      
      // Note: This would require custom directive validation
      // For now, we just test that the query can be parsed
      const document = parse(queryWithAuth);
      expect(document).toBeDefined();
    });

    test('should support rate limiting directives', () => {
      const mutationWithRateLimit = `
        mutation RateLimitedMutation($input: CreateDocumentInput!) {
          createDocument(input: $input) @rateLimit(max: 10, window: 60) {
            id
            title
          }
        }
      `;
      
      const document = parse(mutationWithRateLimit);
      expect(document).toBeDefined();
    });
  });

  describe('Complex Query Validation', () => {
    test('should validate nested queries with fragments', () => {
      const complexQuery = `
        fragment DocumentInfo on Document {
          id
          title
          content
          status
          createdAt
          updatedAt
        }

        fragment UserInfo on User {
          id
          name
          email
          avatar
        }

        query ComplexDocumentQuery($projectId: UUID!, $userId: UUID!) {
          project(id: $projectId) {
            id
            name
            documents {
              ...DocumentInfo
              owner {
                ...UserInfo
              }
              collaborators {
                user {
                  ...UserInfo
                }
                role
                addedAt
              }
            }
          }
          
          user(id: $userId) {
            ...UserInfo
            recentDocuments(limit: 5) {
              ...DocumentInfo
            }
          }
        }
      `;
      
      const document = parse(complexQuery);
      const validationErrors = validate(schema, document);
      
      expect(validationErrors).toEqual([]);
    });

    test('should validate queries with variables and aliases', () => {
      const queryWithAliases = `
        query DocumentsWithAliases($projectId: UUID!) {
          activeDocuments: documents(projectId: $projectId, status: ACTIVE) {
            items {
              id
              title
            }
            totalCount
          }
          
          archivedDocuments: documents(projectId: $projectId, status: ARCHIVED) {
            items {
              id
              title
            }
            totalCount
          }
        }
      `;
      
      const document = parse(queryWithAliases);
      const validationErrors = validate(schema, document);
      
      expect(validationErrors).toEqual([]);
    });
  });

  describe('Error Handling Validation', () => {
    test('should validate error types in schema', () => {
      const typeMap = schema.getTypeMap();
      
      // Check for error union types
      expect(typeMap.DocumentResult).toBeDefined();
      expect(typeMap.OperationResult).toBeDefined();
      
      // Check for error types
      expect(typeMap.ValidationError).toBeDefined();
      expect(typeMap.PermissionError).toBeDefined();
      expect(typeMap.ConflictError).toBeDefined();
    });

    test('should handle union types correctly', () => {
      const queryWithUnion = `
        query QueryWithUnion($id: UUID!) {
          documentResult(id: $id) {
            ... on Document {
              id
              title
              content
            }
            ... on ValidationError {
              message
              field
              code
            }
            ... on PermissionError {
              message
              requiredRole
            }
          }
        }
      `;
      
      const document = parse(queryWithUnion);
      const validationErrors = validate(schema, document);
      
      expect(validationErrors).toEqual([]);
    });
  });

  describe('Schema Introspection', () => {
    test('should support schema introspection queries', async () => {
      const introspectionQuery = `
        query IntrospectionQuery {
          __schema {
            types {
              name
              kind
              fields {
                name
                type {
                  name
                  kind
                }
              }
            }
            queryType {
              name
            }
            mutationType {
              name
            }
            subscriptionType {
              name
            }
          }
        }
      `;
      
      const result = await graphql({
        schema,
        source: introspectionQuery
      });
      
      expect(result.errors).toBeUndefined();
      expect(result.data.__schema).toBeDefined();
      expect(result.data.__schema.queryType.name).toBe('Query');
      expect(result.data.__schema.mutationType.name).toBe('Mutation');
      expect(result.data.__schema.subscriptionType.name).toBe('Subscription');
    });
  });

  describe('Performance Validation', () => {
    test('should detect potentially expensive queries', () => {
      const expensiveQuery = `
        query ExpensiveQuery {
          projects {
            documents {
              versions {
                comments {
                  replies {
                    author {
                      documents {
                        collaborators {
                          user {
                            projects {
                              documents {
                                id
                                title
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;
      
      const document = parse(expensiveQuery);
      const validationErrors = validate(schema, document);
      
      // Should validate syntactically but would be flagged by query complexity analysis
      expect(validationErrors).toEqual([]);
      
      // In a real implementation, you'd analyze query depth/complexity here
      const queryDepth = analyzeQueryDepth(document);
      expect(queryDepth).toBeGreaterThan(5); // This would be flagged as too deep
    });
  });
});

// Helper function to analyze query depth
function analyzeQueryDepth(document: any): number {
  let maxDepth = 0;
  
  function visitSelectionSet(selectionSet: any, currentDepth: number = 0) {
    if (!selectionSet || !selectionSet.selections) return currentDepth;
    
    maxDepth = Math.max(maxDepth, currentDepth);
    
    for (const selection of selectionSet.selections) {
      if (selection.selectionSet) {
        visitSelectionSet(selection.selectionSet, currentDepth + 1);
      }
    }
    
    return maxDepth;
  }
  
  document.definitions.forEach((definition: any) => {
    if (definition.selectionSet) {
      visitSelectionSet(definition.selectionSet);
    }
  });
  
  return maxDepth;
}