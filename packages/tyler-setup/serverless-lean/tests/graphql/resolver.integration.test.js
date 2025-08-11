/**
 * GraphQL Resolver Integration Tests
 * Validates end-to-end data flows and performance
 */

import { graphql } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { ApolloServer } from '@apollo/server';
import { typeDefs } from '../../src/graphql/typeDefs';
import resolvers from '../../src/graphql/resolvers/index';
import { createDataLoaderContext } from '../../src/database/connection-pool';
import { getCacheManager } from '../../src/database/cache-layer';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SecretsManagerClient } from '@aws-sdk/client-secrets-manager';

// Mock AWS services
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');
jest.mock('@aws-sdk/client-secrets-manager');
jest.mock('@aws-sdk/client-kms');

describe('GraphQL Resolver Integration Tests', () => {
  let server;
  let schema;
  let context;
  let mockDynamoClient;
  let mockSecretsClient;

  beforeAll(async () => {
    // Create schema
    schema = makeExecutableSchema({ typeDefs, resolvers });

    // Initialize server
    server = new ApolloServer({
      schema,
      context: async ({ req }) => {
        return createMockContext(req);
      },
    });

    await server.start();
  });

  beforeEach(() => {
    // Reset mocks
    mockDynamoClient = new DynamoDBClient();
    mockSecretsClient = new SecretsManagerClient();

    // Create fresh context for each test
    context = createMockContext();
  });

  afterAll(async () => {
    await server.stop();
  });

  describe('Query Resolvers', () => {
    describe('Health Check', () => {
      it('should return system health status', async () => {
        const query = `
          query Health {
            health {
              status
              timestamp
              version
              database {
                connected
                latency
              }
              cache {
                hitRatio
                operations
              }
            }
          }
        `;

        const result = await graphql({
          schema,
          source: query,
          contextValue: context,
        });

        expect(result.errors).toBeUndefined();
        expect(result.data.health.status).toBe('healthy');
        expect(result.data.health.database.connected).toBe(true);
        expect(result.data.health.cache.hitRatio).toBeGreaterThanOrEqual(0);
      });

      it('should cache health check results', async () => {
        const query = `query Health { health { status } }`;

        // First call - cache miss
        const result1 = await graphql({ schema, source: query, contextValue: context });
        expect(context.cache.get).toHaveBeenCalledWith('system', 'health');

        // Second call - cache hit
        const result2 = await graphql({ schema, source: query, contextValue: context });
        expect(result1.data).toEqual(result2.data);
        expect(context.cache.stats.hits).toBeGreaterThan(0);
      });
    });

    describe('User Queries', () => {
      it('should batch user lookups with DataLoader', async () => {
        const query = `
          query GetUsers($ids: [ID!]!) {
            users1: user(id: $ids[0]) { id name email }
            users2: user(id: $ids[1]) { id name email }
            users3: user(id: $ids[2]) { id name email }
          }
        `;

        const variables = {
          ids: ['user1', 'user2', 'user3'],
        };

        // Mock batch response
        context.getUser.mockImplementation((id) =>
          Promise.resolve({ id, name: `User ${id}`, email: `${id}@test.com` })
        );

        const result = await graphql({
          schema,
          source: query,
          variableValues: variables,
          contextValue: context,
        });

        expect(result.errors).toBeUndefined();
        // DataLoader should batch these into a single call
        expect(context.batchGetCalls).toBe(1);
      });

      it('should paginate user list with cursor', async () => {
        const query = `
          query ListUsers($first: Int, $after: String) {
            users(first: $first, after: $after) {
              edges {
                node { id name email }
                cursor
              }
              pageInfo {
                hasNextPage
                hasPreviousPage
                startCursor
                endCursor
              }
              totalCount
            }
          }
        `;

        const mockUsers = Array(25).fill(null).map((_, i) => ({
          id: `user${i}`,
          name: `User ${i}`,
          email: `user${i}@test.com`,
        }));

        mockDynamoClient.send.mockResolvedValue({
          Items: mockUsers.slice(0, 10),
          LastEvaluatedKey: { id: 'user9' },
        });

        const result = await graphql({
          schema,
          source: query,
          variableValues: { first: 10 },
          contextValue: context,
        });

        expect(result.errors).toBeUndefined();
        expect(result.data.users.edges).toHaveLength(10);
        expect(result.data.users.pageInfo.hasNextPage).toBe(true);
        expect(result.data.users.totalCount).toBe(10);
      });

      it('should filter users by role and status', async () => {
        const query = `
          query FilterUsers($filter: UserFilter) {
            users(filter: $filter) {
              edges {
                node { id role isActive }
              }
            }
          }
        `;

        const result = await graphql({
          schema,
          source: query,
          variableValues: {
            filter: {
              role: 'ADMIN',
              isActive: true,
            },
          },
          contextValue: context,
        });

        expect(mockDynamoClient.send).toHaveBeenCalledWith(
          expect.objectContaining({
            FilterExpression: expect.stringContaining('#role = :role'),
            ExpressionAttributeValues: expect.objectContaining({
              ':role': 'ADMIN',
              ':isActive': true,
            }),
          })
        );
      });
    });

    describe('Secret Queries', () => {
      it('should enforce role-based access for secrets', async () => {
        const query = `
          query GetSecret($name: String!) {
            secret(name: $name) {
              id
              name
              value
              tags
            }
          }
        `;

        // Test as contractor with limited access
        context.user = {
          id: 'contractor1',
          type: 'contractor',
          allowedSecrets: ['api-key'],
        };

        // Allowed secret
        const result1 = await graphql({
          schema,
          source: query,
          variableValues: { name: 'api-key' },
          contextValue: context,
        });
        expect(result1.errors).toBeUndefined();

        // Denied secret
        const result2 = await graphql({
          schema,
          source: query,
          variableValues: { name: 'admin-password' },
          contextValue: context,
        });
        expect(result2.errors).toBeDefined();
        expect(result2.errors[0].message).toContain('Access denied');
      });

      it('should mask sensitive data for contractors', async () => {
        context.user = {
          id: 'contractor1',
          type: 'contractor',
          allowedSecrets: ['api-key'],
        };

        const query = `
          query GetSecret {
            secret(name: "api-key") {
              value
            }
          }
        `;

        mockSecretsClient.send.mockResolvedValue({
          SecretString: JSON.stringify({
            apiKey: 'sk_live_abcdef123456',
            password: 'supersecret',
          }),
        });

        const result = await graphql({
          schema,
          source: query,
          contextValue: context,
        });

        expect(result.data.secret.value.apiKey).not.toBe('sk_live_abcdef123456');
        expect(result.data.secret.value.password).toBe('****');
      });
    });
  });

  describe('Mutation Resolvers', () => {
    describe('Authentication Flow', () => {
      it('should handle complete login flow', async () => {
        const loginMutation = `
          mutation Login($email: String!, $password: String!) {
            login(email: $email, password: $password) {
              token
              refreshToken
              expiresIn
              user {
                id
                email
                role
              }
            }
          }
        `;

        mockDynamoClient.send.mockResolvedValueOnce({
          Items: [{
            id: 'user1',
            email: 'test@example.com',
            passwordHash: '$2b$10$hashedpassword',
            role: 'admin',
            isActive: true,
          }],
        });

        const result = await graphql({
          schema,
          source: loginMutation,
          variableValues: {
            email: 'test@example.com',
            password: 'password123',
          },
          contextValue: context,
        });

        expect(result.errors).toBeUndefined();
        expect(result.data.login.token).toBeDefined();
        expect(result.data.login.refreshToken).toBeDefined();
        expect(result.data.login.user.email).toBe('test@example.com');
      });

      it('should refresh tokens correctly', async () => {
        const refreshMutation = `
          mutation RefreshToken($refreshToken: String!) {
            refreshToken(refreshToken: $refreshToken) {
              token
              refreshToken
              expiresIn
            }
          }
        `;

        mockDynamoClient.send.mockResolvedValueOnce({
          Item: {
            token: 'old-refresh-token',
            userId: 'user1',
            expiresAt: Date.now() + 86400000,
          },
        });

        const result = await graphql({
          schema,
          source: refreshMutation,
          variableValues: { refreshToken: 'old-refresh-token' },
          contextValue: context,
        });

        expect(result.errors).toBeUndefined();
        expect(result.data.refreshToken.token).toBeDefined();
        expect(result.data.refreshToken.refreshToken).not.toBe('old-refresh-token');
      });
    });

    describe('User Management', () => {
      it('should create user with proper validation', async () => {
        const createUserMutation = `
          mutation CreateUser($input: CreateUserInput!) {
            createUser(input: $input) {
              id
              email
              name
              role
            }
          }
        `;

        context.user = { id: 'admin1', role: 'admin' };

        const result = await graphql({
          schema,
          source: createUserMutation,
          variableValues: {
            input: {
              email: 'newuser@example.com',
              name: 'New User',
              password: 'securePassword123',
              role: 'USER',
            },
          },
          contextValue: context,
        });

        expect(result.errors).toBeUndefined();
        expect(result.data.createUser.email).toBe('newuser@example.com');
        expect(mockDynamoClient.send).toHaveBeenCalledWith(
          expect.objectContaining({
            Item: expect.objectContaining({
              email: 'newuser@example.com',
              passwordHash: expect.any(String),
            }),
          })
        );
      });

      it('should update user with audit logging', async () => {
        const updateUserMutation = `
          mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
            updateUser(id: $id, input: $input) {
              id
              name
              role
            }
          }
        `;

        context.user = { id: 'admin1', role: 'admin' };

        const result = await graphql({
          schema,
          source: updateUserMutation,
          variableValues: {
            id: 'user1',
            input: {
              name: 'Updated Name',
              role: 'ADMIN',
            },
          },
          contextValue: context,
        });

        expect(context.logAudit).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'USER_UPDATED',
            targetUserId: 'user1',
          })
        );
      });
    });

    describe('Contractor Management', () => {
      it('should invite contractor with secure token', async () => {
        const inviteContractorMutation = `
          mutation InviteContractor($input: InviteContractorInput!) {
            inviteContractor(input: $input) {
              id
              email
              company
              status
              expiresAt
            }
          }
        `;

        context.user = { id: 'admin1', role: 'admin' };

        const result = await graphql({
          schema,
          source: inviteContractorMutation,
          variableValues: {
            input: {
              email: 'contractor@external.com',
              name: 'John Contractor',
              company: 'External Co',
              accessDuration: 7,
              allowedSecrets: ['api-key'],
              reason: 'Integration support',
            },
          },
          contextValue: context,
        });

        expect(result.errors).toBeUndefined();
        expect(result.data.inviteContractor.status).toBe('pending');
        expect(mockDynamoClient.send).toHaveBeenCalledWith(
          expect.objectContaining({
            Item: expect.objectContaining({
              tokenHash: expect.any(String),
              allowedSecrets: ['api-key'],
            }),
          })
        );
      });
    });
  });

  describe('Subscription Resolvers', () => {
    it('should filter audit log subscriptions by role', async () => {
      const subscription = `
        subscription AuditLogUpdates($filter: AuditLogFilter) {
          auditLogAdded(filter: $filter) {
            id
            action
            userId
            timestamp
          }
        }
      `;

      // Admin should receive events
      context.user = { id: 'admin1', role: 'admin' };
      const adminResult = await subscribe({
        schema,
        document: parse(subscription),
        contextValue: context,
      });
      expect(adminResult.errors).toBeUndefined();

      // Non-admin should be denied
      context.user = { id: 'user1', role: 'user' };
      const userResult = await subscribe({
        schema,
        document: parse(subscription),
        contextValue: context,
      });
      expect(userResult.errors).toBeDefined();
    });

    it('should filter secret changes for contractors', async () => {
      const subscription = `
        subscription SecretChanges($name: String) {
          secretChanged(name: $name) {
            name
            action
          }
        }
      `;

      context.user = {
        id: 'contractor1',
        type: 'contractor',
        allowedSecrets: ['api-key'],
      };

      // Should receive updates for allowed secrets
      const result = await subscribe({
        schema,
        document: parse(subscription),
        variableValues: { name: 'api-key' },
        contextValue: context,
      });

      expect(result.errors).toBeUndefined();
    });
  });

  describe('Performance Tests', () => {
    it('should handle 100 concurrent queries efficiently', async () => {
      const query = `query { health { status } }`;

      const startTime = Date.now();
      const queries = Array(100).fill(null).map(() =>
        graphql({ schema, source: query, contextValue: context })
      );

      const results = await Promise.all(queries);
      const duration = Date.now() - startTime;

      expect(results.every(r => !r.errors)).toBe(true);
      expect(duration).toBeLessThan(5000); // Should complete in < 5 seconds
      console.log(`100 concurrent queries completed in ${duration}ms`);
    });

    it('should prevent N+1 queries with DataLoader', async () => {
      const query = `
        query GetContractorsWithInviters {
          contractors(first: 10) {
            edges {
              node {
                id
                name
                invitedBy {
                  id
                  name
                  email
                }
              }
            }
          }
        }
      `;

      const mockContractors = Array(10).fill(null).map((_, i) => ({
        id: `contractor${i}`,
        name: `Contractor ${i}`,
        invitedBy: `user${i % 3}`, // Only 3 unique users
      }));

      mockDynamoClient.send.mockResolvedValueOnce({
        Items: mockContractors,
      });

      const result = await graphql({
        schema,
        source: query,
        contextValue: context,
      });

      // Should batch user lookups - only 3 unique users
      expect(context.getUserBatchCalls).toBeLessThanOrEqual(1);
    });

    it('should enforce query depth limits', async () => {
      const deepQuery = `
        query DeepQuery {
          users {
            edges {
              node {
                auditLogs {
                  edges {
                    node {
                      user {
                        auditLogs {
                          edges {
                            node {
                              user {
                                auditLogs {
                                  edges {
                                    node {
                                      id
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
            }
          }
        }
      `;

      const result = await graphql({
        schema,
        source: deepQuery,
        contextValue: context,
      });

      expect(result.errors).toBeDefined();
      expect(result.errors[0].message).toContain('depth limit');
    });

    it('should enforce query complexity limits', async () => {
      const complexQuery = `
        query ComplexQuery {
          ${Array(100).fill(null).map((_, i) => `
            user${i}: user(id: "user${i}") {
              id name email role
              auditLogs(first: 100) {
                edges {
                  node { id action timestamp }
                }
              }
            }
          `).join('\n')}
        }
      `;

      const result = await graphql({
        schema,
        source: complexQuery,
        contextValue: context,
      });

      expect(result.errors).toBeDefined();
      expect(result.errors[0].message).toContain('complexity');
    });
  });

  describe('Cache Integration', () => {
    it('should use multi-layer caching effectively', async () => {
      const query = `
        query GetSecret($name: String!) {
          secret(name: $name) {
            value
          }
        }
      `;

      // First call - all cache misses
      await graphql({
        schema,
        source: query,
        variableValues: { name: 'api-key' },
        contextValue: context,
      });

      expect(context.cache.get).toHaveBeenCalledWith('secret', 'api-key', { field: 'value' });
      expect(context.cache.stats.misses.memory).toBe(1);

      // Second call - memory cache hit
      await graphql({
        schema,
        source: query,
        variableValues: { name: 'api-key' },
        contextValue: context,
      });

      expect(context.cache.stats.hits.memory).toBe(1);
      expect(context.cache.stats.hitRatio).toBeGreaterThan(0);
    });

    it('should invalidate cache on mutations', async () => {
      const updateMutation = `
        mutation UpdateSecret($name: String!, $input: UpdateSecretInput!) {
          updateSecret(name: $name, input: $input) {
            name
          }
        }
      `;

      context.user = { id: 'admin1', role: 'admin', type: 'employee' };

      await graphql({
        schema,
        source: updateMutation,
        variableValues: {
          name: 'api-key',
          input: { value: 'new-value' },
        },
        contextValue: context,
      });

      expect(context.cache.delete).toHaveBeenCalledWith('secret', 'api-key');
    });
  });
});

/**
 * Helper function to create mock context
 */
function createMockContext(req = {}) {
  const cacheManager = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(true),
    delete: jest.fn().mockResolvedValue(true),
    invalidate: jest.fn().mockResolvedValue(true),
    getStats: jest.fn().mockReturnValue({
      hits: { memory: 0, dax: 0, dynamodb: 0 },
      misses: { memory: 0, dax: 0, dynamodb: 0 },
      hitRatio: 0,
    }),
    stats: {
      hits: { memory: 0, dax: 0, dynamodb: 0 },
      misses: { memory: 0, dax: 0, dynamodb: 0 },
      hitRatio: 0,
    },
  };

  return {
    user: req.user || { id: 'test-user', role: 'user', type: 'employee' },
    event: req,
    cache: cacheManager,
    client: new DynamoDBClient(),
    getUser: jest.fn().mockResolvedValue({
      id: 'user1',
      name: 'Test User',
      email: 'test@example.com',
    }),
    getContractor: jest.fn().mockResolvedValue({
      id: 'contractor1',
      name: 'Test Contractor',
      email: 'contractor@example.com',
    }),
    getEntity: jest.fn().mockResolvedValue({}),
    pooledClient: {
      healthCheck: jest.fn().mockResolvedValue({ status: 'healthy' }),
      encodeCursor: jest.fn((obj) => Buffer.from(JSON.stringify(obj)).toString('base64')),
      decodeCursor: jest.fn((str) => JSON.parse(Buffer.from(str, 'base64').toString())),
      getMetrics: jest.fn().mockResolvedValue({}),
    },
    queryWithPagination: jest.fn().mockResolvedValue({
      edges: [],
      pageInfo: { hasNextPage: false },
      totalCount: 0,
    }),
    logAudit: jest.fn().mockResolvedValue(true),
    batchGetCalls: 0,
    getUserBatchCalls: 0,
    metrics: {
      totalQueries: 0,
      totalExecutionTime: 0,
      slowQueries: [],
      errors: 0,
    },
  };
}
