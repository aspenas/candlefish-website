/**
 * Tyler Setup Platform - GraphQL Resolvers Tests
 * Comprehensive unit tests for all GraphQL resolvers
 */

const { ApolloServer } = require('apollo-server-express');
const { createTestClient } = require('apollo-server-testing');
const { typeDefs } = require('../../../graphql/schema/schema.graphql');
const { resolvers } = require('../../../graphql/resolvers');
const { AuthService } = require('../../../backend/src/services/auth-service');
const { SecretsService } = require('../../../backend/src/services/secrets-service');
const { UserService } = require('../../../backend/src/services/user-service');

// Mock services
jest.mock('../../../backend/src/services/auth-service');
jest.mock('../../../backend/src/services/secrets-service');
jest.mock('../../../backend/src/services/user-service');

describe('GraphQL Resolvers', () => {
  let server;
  let query;
  let mutate;
  let mockAuthService;
  let mockSecretsService;
  let mockUserService;

  beforeAll(async () => {
    mockAuthService = new AuthService();
    mockSecretsService = new SecretsService();
    mockUserService = new UserService();

    server = new ApolloServer({
      typeDefs,
      resolvers,
      context: ({ req }) => ({
        user: req.user || createMockUser(),
        services: {
          auth: mockAuthService,
          secrets: mockSecretsService,
          user: mockUserService
        }
      })
    });

    const testClient = createTestClient(server);
    query = testClient.query;
    mutate = testClient.mutate;
  });

  afterAll(async () => {
    await server.stop();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Query Resolvers', () => {
    describe('me', () => {
      const ME_QUERY = `
        query Me {
          me {
            id
            email
            firstName
            lastName
            role
            organizationId
          }
        }
      `;

      it('should return current user information', async () => {
        // Arrange
        const mockUser = createMockUser();
        mockUserService.findById.mockResolvedValue(mockUser);

        // Act
        const response = await query({
          query: ME_QUERY
        });

        // Assert
        expect(response.errors).toBeUndefined();
        expect(response.data.me).toMatchObject({
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          role: mockUser.role,
          organizationId: mockUser.organizationId
        });
        expect(mockUserService.findById).toHaveBeenCalledWith(mockUser.id);
      });

      it('should handle user not found', async () => {
        // Arrange
        mockUserService.findById.mockResolvedValue(null);

        // Act
        const response = await query({
          query: ME_QUERY
        });

        // Assert
        expect(response.errors).toBeDefined();
        expect(response.errors[0].message).toContain('User not found');
      });
    });

    describe('secrets', () => {
      const SECRETS_QUERY = `
        query GetSecrets {
          secrets {
            name
            description
            lastUpdated
            tags {
              key
              value
            }
          }
        }
      `;

      it('should return organization secrets for admin users', async () => {
        // Arrange
        const mockSecrets = [
          {
            name: 'database-url',
            description: 'Database connection string',
            lastUpdated: new Date('2024-01-01'),
            tags: [
              { key: 'Environment', value: 'production' },
              { key: 'Service', value: 'database' }
            ]
          },
          {
            name: 'api-key',
            description: 'External API key',
            lastUpdated: new Date('2024-01-02'),
            tags: [
              { key: 'Environment', value: 'production' },
              { key: 'Service', value: 'external-api' }
            ]
          }
        ];

        const adminUser = createMockUser({ role: 'ADMIN' });
        mockSecretsService.listSecrets.mockResolvedValue(mockSecrets);

        // Act
        const response = await query(
          { query: SECRETS_QUERY },
          {
            req: { user: adminUser }
          }
        );

        // Assert
        expect(response.errors).toBeUndefined();
        expect(response.data.secrets).toHaveLength(2);
        expect(response.data.secrets[0]).toMatchObject({
          name: 'database-url',
          description: 'Database connection string',
          lastUpdated: '2024-01-01T00:00:00.000Z'
        });
        expect(mockSecretsService.listSecrets).toHaveBeenCalledWith(adminUser.organizationId);
      });

      it('should deny access for non-admin users', async () => {
        // Arrange
        const regularUser = createMockUser({ role: 'USER' });

        // Act
        const response = await query(
          { query: SECRETS_QUERY },
          {
            req: { user: regularUser }
          }
        );

        // Assert
        expect(response.errors).toBeDefined();
        expect(response.errors[0].message).toContain('Admin access required');
      });
    });

    describe('secret', () => {
      const SECRET_QUERY = `
        query GetSecret($name: String!) {
          secret(name: $name) {
            name
            value
            description
            version
            created
          }
        }
      `;

      it('should return specific secret value', async () => {
        // Arrange
        const mockSecret = {
          name: 'database-url',
          value: 'postgresql://user:pass@localhost:5432/db',
          description: 'Database connection string',
          version: 'version-123',
          created: new Date('2024-01-01')
        };

        const adminUser = createMockUser({ role: 'ADMIN' });
        mockSecretsService.getSecret.mockResolvedValue(mockSecret);

        // Act
        const response = await query(
          {
            query: SECRET_QUERY,
            variables: { name: 'database-url' }
          },
          {
            req: { user: adminUser }
          }
        );

        // Assert
        expect(response.errors).toBeUndefined();
        expect(response.data.secret).toMatchObject({
          name: 'database-url',
          value: 'postgresql://user:pass@localhost:5432/db',
          description: 'Database connection string',
          version: 'version-123',
          created: '2024-01-01T00:00:00.000Z'
        });
        expect(mockSecretsService.getSecret).toHaveBeenCalledWith(
          'database-url',
          adminUser.organizationId
        );
      });

      it('should handle secret not found', async () => {
        // Arrange
        const adminUser = createMockUser({ role: 'ADMIN' });
        mockSecretsService.getSecret.mockRejectedValue(
          new Error('Secret not found')
        );

        // Act
        const response = await query(
          {
            query: SECRET_QUERY,
            variables: { name: 'nonexistent' }
          },
          {
            req: { user: adminUser }
          }
        );

        // Assert
        expect(response.errors).toBeDefined();
        expect(response.errors[0].message).toContain('Secret not found');
      });
    });

    describe('systemHealth', () => {
      const HEALTH_QUERY = `
        query SystemHealth {
          systemHealth {
            status
            services {
              name
              status
              responseTime
              lastCheck
            }
            metrics {
              cpuUsage
              memoryUsage
              diskUsage
              activeConnections
            }
          }
        }
      `;

      it('should return system health status', async () => {
        // Arrange
        const mockHealth = {
          status: 'HEALTHY',
          services: [
            {
              name: 'database',
              status: 'HEALTHY',
              responseTime: 45,
              lastCheck: new Date('2024-01-01T12:00:00Z')
            },
            {
              name: 'secrets-manager',
              status: 'HEALTHY',
              responseTime: 120,
              lastCheck: new Date('2024-01-01T12:00:00Z')
            }
          ],
          metrics: {
            cpuUsage: 25.5,
            memoryUsage: 67.8,
            diskUsage: 45.2,
            activeConnections: 15
          }
        };

        mockUserService.getSystemHealth.mockResolvedValue(mockHealth);

        // Act
        const response = await query({
          query: HEALTH_QUERY
        });

        // Assert
        expect(response.errors).toBeUndefined();
        expect(response.data.systemHealth).toMatchObject({
          status: 'HEALTHY',
          services: expect.arrayContaining([
            expect.objectContaining({
              name: 'database',
              status: 'HEALTHY',
              responseTime: 45
            })
          ]),
          metrics: expect.objectContaining({
            cpuUsage: 25.5,
            memoryUsage: 67.8
          })
        });
      });
    });

    describe('auditLogs', () => {
      const AUDIT_LOGS_QUERY = `
        query GetAuditLogs($limit: Int, $offset: Int) {
          auditLogs(limit: $limit, offset: $offset) {
            id
            userId
            action
            resource
            timestamp
            metadata
            ipAddress
            userAgent
          }
        }
      `;

      it('should return audit logs for admin users', async () => {
        // Arrange
        const mockLogs = [
          {
            id: 'log-1',
            userId: 'user-123',
            action: 'SECRET_READ',
            resource: 'database-url',
            timestamp: new Date('2024-01-01T12:00:00Z'),
            metadata: { secretName: 'database-url' },
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0'
          }
        ];

        const adminUser = createMockUser({ role: 'ADMIN' });
        mockUserService.getAuditLogs.mockResolvedValue(mockLogs);

        // Act
        const response = await query(
          {
            query: AUDIT_LOGS_QUERY,
            variables: { limit: 10, offset: 0 }
          },
          {
            req: { user: adminUser }
          }
        );

        // Assert
        expect(response.errors).toBeUndefined();
        expect(response.data.auditLogs).toHaveLength(1);
        expect(response.data.auditLogs[0]).toMatchObject({
          id: 'log-1',
          userId: 'user-123',
          action: 'SECRET_READ',
          resource: 'database-url'
        });
      });
    });
  });

  describe('Mutation Resolvers', () => {
    describe('createSecret', () => {
      const CREATE_SECRET_MUTATION = `
        mutation CreateSecret($input: CreateSecretInput!) {
          createSecret(input: $input) {
            name
            description
            created
          }
        }
      `;

      it('should create new secret', async () => {
        // Arrange
        const input = {
          name: 'new-api-key',
          value: 'secret-api-key-value',
          description: 'New external API key',
          tags: [
            { key: 'Environment', value: 'production' },
            { key: 'Service', value: 'external-api' }
          ]
        };

        const mockResult = {
          name: 'new-api-key',
          description: 'New external API key',
          created: new Date('2024-01-01')
        };

        const adminUser = createMockUser({ role: 'ADMIN' });
        mockSecretsService.createSecret.mockResolvedValue(mockResult);

        // Act
        const response = await mutate(
          {
            mutation: CREATE_SECRET_MUTATION,
            variables: { input }
          },
          {
            req: { user: adminUser }
          }
        );

        // Assert
        expect(response.errors).toBeUndefined();
        expect(response.data.createSecret).toMatchObject({
          name: 'new-api-key',
          description: 'New external API key',
          created: '2024-01-01T00:00:00.000Z'
        });
        expect(mockSecretsService.createSecret).toHaveBeenCalledWith(
          input,
          adminUser.organizationId,
          adminUser.id
        );
      });

      it('should validate input parameters', async () => {
        // Arrange
        const input = {
          // Missing name
          value: 'secret-value'
        };

        const adminUser = createMockUser({ role: 'ADMIN' });

        // Act
        const response = await mutate(
          {
            mutation: CREATE_SECRET_MUTATION,
            variables: { input }
          },
          {
            req: { user: adminUser }
          }
        );

        // Assert
        expect(response.errors).toBeDefined();
        expect(response.errors[0].message).toContain('Secret name is required');
      });

      it('should deny access for non-admin users', async () => {
        // Arrange
        const input = {
          name: 'new-secret',
          value: 'secret-value'
        };

        const regularUser = createMockUser({ role: 'USER' });

        // Act
        const response = await mutate(
          {
            mutation: CREATE_SECRET_MUTATION,
            variables: { input }
          },
          {
            req: { user: regularUser }
          }
        );

        // Assert
        expect(response.errors).toBeDefined();
        expect(response.errors[0].message).toContain('Admin access required');
      });
    });

    describe('updateSecret', () => {
      const UPDATE_SECRET_MUTATION = `
        mutation UpdateSecret($name: String!, $input: UpdateSecretInput!) {
          updateSecret(name: $name, input: $input) {
            name
            description
            updated
          }
        }
      `;

      it('should update existing secret', async () => {
        // Arrange
        const input = {
          value: 'updated-secret-value',
          description: 'Updated API key description'
        };

        const mockResult = {
          name: 'api-key',
          description: 'Updated API key description',
          updated: new Date('2024-01-02')
        };

        const adminUser = createMockUser({ role: 'ADMIN' });
        mockSecretsService.updateSecret.mockResolvedValue(mockResult);

        // Act
        const response = await mutate(
          {
            mutation: UPDATE_SECRET_MUTATION,
            variables: { name: 'api-key', input }
          },
          {
            req: { user: adminUser }
          }
        );

        // Assert
        expect(response.errors).toBeUndefined();
        expect(response.data.updateSecret).toMatchObject({
          name: 'api-key',
          description: 'Updated API key description',
          updated: '2024-01-02T00:00:00.000Z'
        });
        expect(mockSecretsService.updateSecret).toHaveBeenCalledWith(
          'api-key',
          input,
          adminUser.organizationId,
          adminUser.id
        );
      });
    });

    describe('deleteSecret', () => {
      const DELETE_SECRET_MUTATION = `
        mutation DeleteSecret($name: String!, $force: Boolean) {
          deleteSecret(name: $name, force: $force)
        }
      `;

      it('should delete secret with recovery window', async () => {
        // Arrange
        const adminUser = createMockUser({ role: 'ADMIN' });
        mockSecretsService.deleteSecret.mockResolvedValue(true);

        // Act
        const response = await mutate(
          {
            mutation: DELETE_SECRET_MUTATION,
            variables: { name: 'old-secret', force: false }
          },
          {
            req: { user: adminUser }
          }
        );

        // Assert
        expect(response.errors).toBeUndefined();
        expect(response.data.deleteSecret).toBe(true);
        expect(mockSecretsService.deleteSecret).toHaveBeenCalledWith(
          'old-secret',
          adminUser.organizationId,
          adminUser.id,
          false
        );
      });

      it('should force delete secret immediately', async () => {
        // Arrange
        const adminUser = createMockUser({ role: 'ADMIN' });
        mockSecretsService.deleteSecret.mockResolvedValue(true);

        // Act
        const response = await mutate(
          {
            mutation: DELETE_SECRET_MUTATION,
            variables: { name: 'old-secret', force: true }
          },
          {
            req: { user: adminUser }
          }
        );

        // Assert
        expect(response.errors).toBeUndefined();
        expect(response.data.deleteSecret).toBe(true);
        expect(mockSecretsService.deleteSecret).toHaveBeenCalledWith(
          'old-secret',
          adminUser.organizationId,
          adminUser.id,
          true
        );
      });
    });

    describe('updateProfile', () => {
      const UPDATE_PROFILE_MUTATION = `
        mutation UpdateProfile($input: UpdateProfileInput!) {
          updateProfile(input: $input) {
            id
            firstName
            lastName
            email
            timezone
          }
        }
      `;

      it('should update user profile', async () => {
        // Arrange
        const input = {
          firstName: 'Updated',
          lastName: 'Name',
          timezone: 'America/Los_Angeles'
        };

        const mockUser = createMockUser();
        const updatedUser = { ...mockUser, ...input };
        mockUserService.updateProfile.mockResolvedValue(updatedUser);

        // Act
        const response = await mutate(
          {
            mutation: UPDATE_PROFILE_MUTATION,
            variables: { input }
          },
          {
            req: { user: mockUser }
          }
        );

        // Assert
        expect(response.errors).toBeUndefined();
        expect(response.data.updateProfile).toMatchObject({
          id: mockUser.id,
          firstName: 'Updated',
          lastName: 'Name',
          timezone: 'America/Los_Angeles'
        });
        expect(mockUserService.updateProfile).toHaveBeenCalledWith(
          mockUser.id,
          input
        );
      });
    });

    describe('changePassword', () => {
      const CHANGE_PASSWORD_MUTATION = `
        mutation ChangePassword($input: ChangePasswordInput!) {
          changePassword(input: $input)
        }
      `;

      it('should change user password', async () => {
        // Arrange
        const input = {
          currentPassword: 'oldPassword123',
          newPassword: 'newSecurePassword456!'
        };

        const mockUser = createMockUser();
        mockAuthService.validatePassword.mockResolvedValue(true);
        mockUserService.changePassword.mockResolvedValue(true);

        // Act
        const response = await mutate(
          {
            mutation: CHANGE_PASSWORD_MUTATION,
            variables: { input }
          },
          {
            req: { user: mockUser }
          }
        );

        // Assert
        expect(response.errors).toBeUndefined();
        expect(response.data.changePassword).toBe(true);
        expect(mockAuthService.validatePassword).toHaveBeenCalledWith(
          input.currentPassword,
          mockUser.passwordHash
        );
        expect(mockUserService.changePassword).toHaveBeenCalledWith(
          mockUser.id,
          input.newPassword
        );
      });

      it('should reject invalid current password', async () => {
        // Arrange
        const input = {
          currentPassword: 'wrongPassword',
          newPassword: 'newSecurePassword456!'
        };

        const mockUser = createMockUser();
        mockAuthService.validatePassword.mockResolvedValue(false);

        // Act
        const response = await mutate(
          {
            mutation: CHANGE_PASSWORD_MUTATION,
            variables: { input }
          },
          {
            req: { user: mockUser }
          }
        );

        // Assert
        expect(response.errors).toBeDefined();
        expect(response.errors[0].message).toContain('Invalid current password');
      });
    });
  });

  describe('Subscription Resolvers', () => {
    describe('secretUpdates', () => {
      it('should subscribe to secret updates for organization', () => {
        // Arrange
        const mockUser = createMockUser({ role: 'ADMIN' });
        const context = { user: mockUser };

        // Act
        const subscription = resolvers.Subscription.secretUpdates.subscribe(
          null,
          {},
          context
        );

        // Assert
        expect(subscription).toBeDefined();
        // Additional subscription testing would require WebSocket mocking
      });
    });

    describe('systemHealthUpdates', () => {
      it('should subscribe to system health updates', () => {
        // Arrange
        const mockUser = createMockUser({ role: 'ADMIN' });
        const context = { user: mockUser };

        // Act
        const subscription = resolvers.Subscription.systemHealthUpdates.subscribe(
          null,
          {},
          context
        );

        // Assert
        expect(subscription).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      // Arrange
      const SECRETS_QUERY = `
        query GetSecrets {
          secrets {
            name
            description
          }
        }
      `;

      const adminUser = createMockUser({ role: 'ADMIN' });
      mockSecretsService.listSecrets.mockRejectedValue(
        new Error('Service temporarily unavailable')
      );

      // Act
      const response = await query(
        { query: SECRETS_QUERY },
        { req: { user: adminUser } }
      );

      // Assert
      expect(response.errors).toBeDefined();
      expect(response.errors[0].message).toContain('Service temporarily unavailable');
    });

    it('should handle unauthenticated requests', async () => {
      // Arrange
      const ME_QUERY = `
        query Me {
          me {
            id
            email
          }
        }
      `;

      // Act
      const response = await query(
        { query: ME_QUERY },
        { req: {} } // No user
      );

      // Assert
      expect(response.errors).toBeDefined();
      expect(response.errors[0].message).toContain('Authentication required');
    });

    it('should validate GraphQL input types', async () => {
      // Arrange
      const CREATE_SECRET_MUTATION = `
        mutation CreateSecret($input: CreateSecretInput!) {
          createSecret(input: $input) {
            name
          }
        }
      `;

      const invalidInput = {
        name: '', // Empty name
        value: 'secret-value'
      };

      const adminUser = createMockUser({ role: 'ADMIN' });

      // Act
      const response = await mutate(
        {
          mutation: CREATE_SECRET_MUTATION,
          variables: { input: invalidInput }
        },
        { req: { user: adminUser } }
      );

      // Assert
      expect(response.errors).toBeDefined();
      expect(response.errors[0].message).toContain('validation');
    });
  });
});
