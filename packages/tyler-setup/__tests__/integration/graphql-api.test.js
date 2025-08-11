import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { gql } from 'graphql-tag';
import fetch from 'node-fetch';

// Import GraphQL schema and resolvers
import { typeDefs } from '../graphql/schema/schema.graphql';
import resolvers from '../graphql/resolvers/index.js';

describe('GraphQL API Integration Tests', () => {
  let server;
  let url;
  let adminToken;
  let employeeToken;

  beforeAll(async () => {
    // Create Apollo Server instance
    server = new ApolloServer({
      schema: buildSubgraphSchema({ typeDefs, resolvers }),
      context: ({ req }) => ({
        token: req.headers.authorization?.replace('Bearer ', ''),
        user: null, // Will be populated by auth resolver
      }),
    });

    // Start server
    const { url: serverUrl } = await startStandaloneServer(server, {
      listen: { port: 0 }, // Use random available port
    });
    url = serverUrl;

    // Get test tokens
    adminToken = await getTestToken('admin');
    employeeToken = await getTestToken('employee');
  });

  afterAll(async () => {
    if (server) {
      await server.stop();
    }
  });

  describe('Authentication', () => {
    test('should require authentication for protected queries', async () => {
      const query = gql`
        query GetDashboardStats {
          dashboardStats {
            totalUsers
            activeUsers
          }
        }
      `;

      const response = await executeGraphQLQuery(query);

      expect(response.errors).toBeDefined();
      expect(response.errors[0].message).toMatch(/authentication required/i);
    });

    test('should validate JWT tokens', async () => {
      const query = gql`
        query GetDashboardStats {
          dashboardStats {
            totalUsers
            activeUsers
          }
        }
      `;

      const response = await executeGraphQLQuery(query, {}, 'invalid-token');

      expect(response.errors).toBeDefined();
      expect(response.errors[0].message).toMatch(/invalid token/i);
    });

    test('should allow authenticated queries with valid token', async () => {
      const query = gql`
        query GetDashboardStats {
          dashboardStats {
            totalUsers
            activeUsers
          }
        }
      `;

      const response = await executeGraphQLQuery(query, {}, adminToken);

      expect(response.errors).toBeUndefined();
      expect(response.data.dashboardStats).toBeDefined();
      expect(typeof response.data.dashboardStats.totalUsers).toBe('number');
    });
  });

  describe('Dashboard Queries', () => {
    test('should fetch dashboard statistics', async () => {
      const query = gql`
        query GetDashboardStats {
          dashboardStats {
            totalUsers
            activeUsers
            totalContractors
            totalSecrets
            recentActivity {
              id
              action
              timestamp
              user
            }
            systemHealth {
              status
              uptime
              memory
              cpu
            }
          }
        }
      `;

      const response = await executeGraphQLQuery(query, {}, adminToken);

      expect(response.data.dashboardStats).toEqual({
        totalUsers: expect.any(Number),
        activeUsers: expect.any(Number),
        totalContractors: expect.any(Number),
        totalSecrets: expect.any(Number),
        recentActivity: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            action: expect.any(String),
            timestamp: expect.any(Number),
            user: expect.any(String),
          }),
        ]),
        systemHealth: expect.objectContaining({
          status: expect.any(String),
          uptime: expect.any(String),
          memory: expect.any(String),
          cpu: expect.any(String),
        }),
      });
    });

    test('should restrict sensitive data for employee users', async () => {
      const query = gql`
        query GetDashboardStats {
          dashboardStats {
            totalUsers
            activeUsers
            totalContractors
            totalSecrets
          }
        }
      `;

      const response = await executeGraphQLQuery(query, {}, employeeToken);

      expect(response.data.dashboardStats).toBeDefined();
      expect(response.data.dashboardStats.totalContractors).toBeDefined();

      // Employees should not see user/secret counts
      expect(response.data.dashboardStats.totalUsers).toBeNull();
      expect(response.data.dashboardStats.totalSecrets).toBeNull();
    });
  });

  describe('User Operations', () => {
    let testUserId;

    test('should create a new user', async () => {
      const mutation = gql`
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
            email
            name
            role
            isActive
            createdAt
          }
        }
      `;

      const variables = {
        input: {
          email: `test-${Date.now()}@example.com`,
          name: 'Test User Integration',
          role: 'employee',
          password: 'TestPassword123!',
        },
      };

      const response = await executeGraphQLQuery(mutation, variables, adminToken);

      expect(response.errors).toBeUndefined();
      expect(response.data.createUser).toEqual({
        id: expect.any(String),
        email: variables.input.email,
        name: variables.input.name,
        role: variables.input.role,
        isActive: true,
        createdAt: expect.any(Number),
      });

      testUserId = response.data.createUser.id;
    });

    test('should fetch users list', async () => {
      const query = gql`
        query GetUsers($filter: UserFilter, $pagination: PaginationInput) {
          users(filter: $filter, pagination: $pagination) {
            users {
              id
              email
              name
              role
              isActive
              lastLogin
            }
            total
            hasMore
          }
        }
      `;

      const variables = {
        filter: { role: 'employee' },
        pagination: { page: 1, limit: 10 },
      };

      const response = await executeGraphQLQuery(query, variables, adminToken);

      expect(response.errors).toBeUndefined();
      expect(response.data.users).toEqual({
        users: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            email: expect.any(String),
            name: expect.any(String),
            role: expect.any(String),
            isActive: expect.any(Boolean),
          }),
        ]),
        total: expect.any(Number),
        hasMore: expect.any(Boolean),
      });
    });

    test('should update user', async () => {
      const mutation = gql`
        mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
          updateUser(id: $id, input: $input) {
            id
            name
            role
            updatedAt
          }
        }
      `;

      const variables = {
        id: testUserId,
        input: {
          name: 'Updated Test User',
          role: 'admin',
        },
      };

      const response = await executeGraphQLQuery(mutation, variables, adminToken);

      expect(response.errors).toBeUndefined();
      expect(response.data.updateUser).toEqual({
        id: testUserId,
        name: 'Updated Test User',
        role: 'admin',
        updatedAt: expect.any(Number),
      });
    });

    test('should prevent employee users from creating users', async () => {
      const mutation = gql`
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
          }
        }
      `;

      const variables = {
        input: {
          email: `unauthorized-${Date.now()}@example.com`,
          name: 'Unauthorized User',
          role: 'employee',
          password: 'Password123!',
        },
      };

      const response = await executeGraphQLQuery(mutation, variables, employeeToken);

      expect(response.errors).toBeDefined();
      expect(response.errors[0].message).toMatch(/insufficient permissions/i);
    });

    afterAll(async () => {
      // Cleanup test user
      if (testUserId) {
        const cleanup = gql`
          mutation DeleteUser($id: ID!, $force: Boolean) {
            deleteUser(id: $id, force: $force) {
              success
            }
          }
        `;

        await executeGraphQLQuery(cleanup, { id: testUserId, force: true }, adminToken);
      }
    });
  });

  describe('Contractor Operations', () => {
    let testContractorId;

    test('should create a new contractor', async () => {
      const mutation = gql`
        mutation CreateContractor($input: CreateContractorInput!) {
          createContractor(input: $input) {
            id
            name
            email
            phone
            company
            skills
            status
            createdAt
          }
        }
      `;

      const variables = {
        input: {
          name: 'Integration Test Contractor',
          email: `contractor-${Date.now()}@example.com`,
          phone: '+1234567890',
          company: 'Test Contracting LLC',
          skills: ['plumbing', 'electrical'],
        },
      };

      const response = await executeGraphQLQuery(mutation, variables, adminToken);

      expect(response.errors).toBeUndefined();
      expect(response.data.createContractor).toEqual({
        id: expect.any(String),
        name: variables.input.name,
        email: variables.input.email,
        phone: variables.input.phone,
        company: variables.input.company,
        skills: variables.input.skills,
        status: 'pending',
        createdAt: expect.any(Number),
      });

      testContractorId = response.data.createContractor.id;
    });

    test('should fetch contractors with filters', async () => {
      const query = gql`
        query GetContractors($filter: ContractorFilter) {
          contractors(filter: $filter) {
            contractors {
              id
              name
              email
              status
              skills
              rating
            }
            total
          }
        }
      `;

      const variables = {
        filter: { status: 'active' },
      };

      const response = await executeGraphQLQuery(query, variables, adminToken);

      expect(response.errors).toBeUndefined();
      expect(response.data.contractors.contractors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
            email: expect.any(String),
            status: 'active',
            skills: expect.any(Array),
          }),
        ])
      );
    });

    test('should search contractors by skills', async () => {
      const query = gql`
        query SearchContractors($skills: [String!]) {
          contractors(filter: { skills: $skills }) {
            contractors {
              id
              name
              skills
            }
            total
          }
        }
      `;

      const variables = {
        skills: ['plumbing'],
      };

      const response = await executeGraphQLQuery(query, variables, adminToken);

      expect(response.errors).toBeUndefined();
      response.data.contractors.contractors.forEach(contractor => {
        expect(contractor.skills).toContain('plumbing');
      });
    });

    test('should update contractor status', async () => {
      const mutation = gql`
        mutation UpdateContractor($id: ID!, $input: UpdateContractorInput!) {
          updateContractor(id: $id, input: $input) {
            id
            status
            updatedAt
          }
        }
      `;

      const variables = {
        id: testContractorId,
        input: {
          status: 'active',
        },
      };

      const response = await executeGraphQLQuery(mutation, variables, adminToken);

      expect(response.errors).toBeUndefined();
      expect(response.data.updateContractor).toEqual({
        id: testContractorId,
        status: 'active',
        updatedAt: expect.any(Number),
      });
    });

    afterAll(async () => {
      // Cleanup test contractor
      if (testContractorId) {
        const cleanup = gql`
          mutation DeleteContractor($id: ID!) {
            deleteContractor(id: $id) {
              success
            }
          }
        `;

        await executeGraphQLQuery(cleanup, { id: testContractorId }, adminToken);
      }
    });
  });

  describe('Secret Operations', () => {
    let testSecretId;

    test('should create a new secret', async () => {
      const mutation = gql`
        mutation CreateSecret($input: CreateSecretInput!) {
          createSecret(input: $input) {
            id
            name
            description
            type
            category
            createdAt
          }
        }
      `;

      const variables = {
        input: {
          name: `integration-test-secret-${Date.now()}`,
          description: 'Integration test secret',
          type: 'password',
          category: 'testing',
          value: 'super-secret-value',
          tags: ['integration-test'],
        },
      };

      const response = await executeGraphQLQuery(mutation, variables, adminToken);

      expect(response.errors).toBeUndefined();
      expect(response.data.createSecret).toEqual({
        id: expect.any(String),
        name: variables.input.name,
        description: variables.input.description,
        type: variables.input.type,
        category: variables.input.category,
        createdAt: expect.any(Number),
      });

      testSecretId = response.data.createSecret.id;
    });

    test('should fetch secrets without values', async () => {
      const query = gql`
        query GetSecrets($filter: SecretFilter) {
          secrets(filter: $filter) {
            id
            name
            description
            type
            category
            createdAt
          }
        }
      `;

      const response = await executeGraphQLQuery(query, {}, adminToken);

      expect(response.errors).toBeUndefined();
      expect(response.data.secrets).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
            type: expect.any(String),
            category: expect.any(String),
          }),
        ])
      );

      // Ensure no value is returned in list view
      response.data.secrets.forEach(secret => {
        expect(secret).not.toHaveProperty('value');
      });
    });

    test('should fetch secret with value for authorized users', async () => {
      const query = gql`
        query GetSecretValue($id: ID!) {
          secret(id: $id, includeValue: true) {
            id
            name
            value
          }
        }
      `;

      const variables = { id: testSecretId };

      const response = await executeGraphQLQuery(query, variables, adminToken);

      expect(response.errors).toBeUndefined();
      expect(response.data.secret).toEqual({
        id: testSecretId,
        name: expect.any(String),
        value: expect.any(String),
      });
    });

    test('should deny secret access for employee users', async () => {
      const query = gql`
        query GetSecrets {
          secrets {
            id
            name
          }
        }
      `;

      const response = await executeGraphQLQuery(query, {}, employeeToken);

      expect(response.errors).toBeDefined();
      expect(response.errors[0].message).toMatch(/insufficient permissions/i);
    });

    test('should rotate secret value', async () => {
      const mutation = gql`
        mutation RotateSecret($id: ID!) {
          rotateSecret(id: $id) {
            id
            version
            rotatedAt
          }
        }
      `;

      const variables = { id: testSecretId };

      const response = await executeGraphQLQuery(mutation, variables, adminToken);

      expect(response.errors).toBeUndefined();
      expect(response.data.rotateSecret).toEqual({
        id: testSecretId,
        version: expect.any(Number),
        rotatedAt: expect.any(Number),
      });
    });

    afterAll(async () => {
      // Cleanup test secret
      if (testSecretId) {
        const cleanup = gql`
          mutation DeleteSecret($id: ID!, $force: Boolean) {
            deleteSecret(id: $id, force: $force) {
              success
            }
          }
        `;

        await executeGraphQLQuery(cleanup, { id: testSecretId, force: true }, adminToken);
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid query syntax', async () => {
      const invalidQuery = `
        query {
          invalidField {
            nonExistentProperty
          }
        }
      `;

      const response = await executeRawGraphQLQuery(invalidQuery);

      expect(response.errors).toBeDefined();
      expect(response.errors[0].message).toMatch(/cannot query field/i);
    });

    test('should handle missing required variables', async () => {
      const query = gql`
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
          }
        }
      `;

      const response = await executeGraphQLQuery(query, {}, adminToken);

      expect(response.errors).toBeDefined();
      expect(response.errors[0].message).toMatch(/variable.*is required/i);
    });

    test('should handle database connection errors gracefully', async () => {
      // This would require mocking the database connection
      // For now, we'll test a scenario that might cause DB errors

      const query = gql`
        query GetUsers($pagination: PaginationInput) {
          users(pagination: $pagination) {
            users {
              id
            }
            total
          }
        }
      `;

      const variables = {
        pagination: { page: -1, limit: -1 }, // Invalid pagination
      };

      const response = await executeGraphQLQuery(query, variables, adminToken);

      expect(response.errors).toBeDefined();
      expect(response.errors[0].message).toMatch(/invalid pagination/i);
    });
  });

  describe('Performance', () => {
    test('should handle concurrent requests', async () => {
      const query = gql`
        query GetDashboardStats {
          dashboardStats {
            totalUsers
            totalContractors
          }
        }
      `;

      // Execute 10 concurrent requests
      const promises = Array(10).fill().map(() =>
        executeGraphQLQuery(query, {}, adminToken)
      );

      const responses = await Promise.all(promises);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.errors).toBeUndefined();
        expect(response.data.dashboardStats).toBeDefined();
      });
    });

    test('should handle large result sets efficiently', async () => {
      const query = gql`
        query GetAllContractors {
          contractors {
            contractors {
              id
              name
              email
              skills
            }
            total
          }
        }
      `;

      const startTime = Date.now();
      const response = await executeGraphQLQuery(query, {}, adminToken);
      const endTime = Date.now();

      expect(response.errors).toBeUndefined();
      expect(response.data.contractors).toBeDefined();

      // Response should be reasonably fast (under 2 seconds)
      expect(endTime - startTime).toBeLessThan(2000);
    });
  });

  describe('Input Validation', () => {
    test('should validate email format', async () => {
      const mutation = gql`
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
          }
        }
      `;

      const variables = {
        input: {
          email: 'invalid-email-format',
          name: 'Test User',
          role: 'employee',
          password: 'Password123!',
        },
      };

      const response = await executeGraphQLQuery(mutation, variables, adminToken);

      expect(response.errors).toBeDefined();
      expect(response.errors[0].message).toMatch(/invalid email/i);
    });

    test('should validate password strength', async () => {
      const mutation = gql`
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
          }
        }
      `;

      const variables = {
        input: {
          email: 'test@example.com',
          name: 'Test User',
          role: 'employee',
          password: 'weak',
        },
      };

      const response = await executeGraphQLQuery(mutation, variables, adminToken);

      expect(response.errors).toBeDefined();
      expect(response.errors[0].message).toMatch(/password.*requirements/i);
    });

    test('should validate enum values', async () => {
      const mutation = gql`
        mutation CreateUser($input: CreateUserInput!) {
          createUser(input: $input) {
            id
          }
        }
      `;

      const variables = {
        input: {
          email: 'test@example.com',
          name: 'Test User',
          role: 'invalid-role',
          password: 'Password123!',
        },
      };

      const response = await executeGraphQLQuery(mutation, variables, adminToken);

      expect(response.errors).toBeDefined();
      expect(response.errors[0].message).toMatch(/invalid.*role/i);
    });
  });

  // Helper functions
  async function executeGraphQLQuery(query, variables = {}, token = null) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify({
        query: query.loc ? query.loc.source.body : query,
        variables,
      }),
    });

    return await response.json();
  }

  async function executeRawGraphQLQuery(query, variables = {}, token = null) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    return await response.json();
  }

  async function getTestToken(role) {
    // In a real scenario, this would authenticate with the actual auth service
    // For integration tests, we'll use pre-generated tokens or mock authentication
    const testTokens = {
      admin: process.env.TEST_ADMIN_TOKEN || 'mock-admin-token',
      employee: process.env.TEST_EMPLOYEE_TOKEN || 'mock-employee-token',
    };

    return testTokens[role];
  }
});
