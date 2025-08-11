/**
 * Tyler Setup Platform - Secrets Management Lambda Tests
 * Comprehensive unit tests for AWS Secrets Manager Lambda function
 */

const { handler } = require('../../../serverless-lean/src/handlers/secrets');
const { SecretsManager } = require('aws-sdk');
const { validateSecretInput } = require('../../../serverless-lean/src/utils/validation');

// Mock AWS SDK
jest.mock('aws-sdk');
jest.mock('../../../serverless-lean/src/utils/validation');

describe('Secrets Lambda Handler', () => {
  let mockSecretsManager;
  let mockContext;

  beforeEach(() => {
    mockSecretsManager = {
      getSecretValue: jest.fn(),
      putSecretValue: jest.fn(),
      createSecret: jest.fn(),
      deleteSecret: jest.fn(),
      updateSecret: jest.fn(),
      listSecrets: jest.fn()
    };

    SecretsManager.mockImplementation(() => mockSecretsManager);

    mockContext = {
      requestId: 'test-request-id',
      functionName: 'secrets-handler',
      getRemainingTimeInMillis: () => 30000
    };

    validateSecretInput.mockImplementation((input) => {
      if (!input.name) throw new Error('Secret name is required');
      if (input.name.length < 1) throw new Error('Secret name too short');
      return true;
    });

    jest.clearAllMocks();
  });

  describe('GET /secrets', () => {
    it('should list all secrets for organization', async () => {
      // Arrange
      const event = {
        httpMethod: 'GET',
        path: '/secrets',
        headers: {
          'Authorization': 'Bearer valid-token'
        },
        requestContext: {
          authorizer: {
            userId: 'user-123',
            organizationId: 'org-123',
            role: 'ADMIN'
          }
        }
      };

      const mockSecrets = [
        {
          Name: 'tyler-setup/org-123/database-url',
          Description: 'Database connection string',
          LastChangedDate: new Date('2024-01-01'),
          Tags: [
            { Key: 'Organization', Value: 'org-123' },
            { Key: 'Environment', Value: 'production' }
          ]
        },
        {
          Name: 'tyler-setup/org-123/api-key',
          Description: 'External API key',
          LastChangedDate: new Date('2024-01-02'),
          Tags: [
            { Key: 'Organization', Value: 'org-123' },
            { Key: 'Environment', Value: 'production' }
          ]
        }
      ];

      mockSecretsManager.listSecrets.mockImplementation(() => ({
        promise: () => Promise.resolve({
          SecretList: mockSecrets
        })
      }));

      // Act
      const result = await handler(event, mockContext);

      // Assert
      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.secrets).toHaveLength(2);
      expect(body.data.secrets[0]).toMatchObject({
        name: 'database-url',
        description: 'Database connection string',
        lastChanged: '2024-01-01T00:00:00.000Z'
      });

      expect(mockSecretsManager.listSecrets).toHaveBeenCalledWith({
        Filters: [
          {
            Key: 'tag-key',
            Values: ['Organization']
          },
          {
            Key: 'tag-value',
            Values: ['org-123']
          }
        ],
        MaxResults: 100
      });
    });

    it('should handle empty secret list', async () => {
      // Arrange
      const event = {
        httpMethod: 'GET',
        path: '/secrets',
        headers: {
          'Authorization': 'Bearer valid-token'
        },
        requestContext: {
          authorizer: {
            userId: 'user-123',
            organizationId: 'org-123',
            role: 'ADMIN'
          }
        }
      };

      mockSecretsManager.listSecrets.mockImplementation(() => ({
        promise: () => Promise.resolve({
          SecretList: []
        })
      }));

      // Act
      const result = await handler(event, mockContext);

      // Assert
      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.secrets).toHaveLength(0);
    });

    it('should require admin role for listing secrets', async () => {
      // Arrange
      const event = {
        httpMethod: 'GET',
        path: '/secrets',
        headers: {
          'Authorization': 'Bearer valid-token'
        },
        requestContext: {
          authorizer: {
            userId: 'user-123',
            organizationId: 'org-123',
            role: 'USER' // Not admin
          }
        }
      };

      // Act
      const result = await handler(event, mockContext);

      // Assert
      expect(result.statusCode).toBe(403);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toBe('Admin role required');
    });
  });

  describe('GET /secrets/:name', () => {
    it('should retrieve specific secret value', async () => {
      // Arrange
      const event = {
        httpMethod: 'GET',
        path: '/secrets/database-url',
        pathParameters: {
          name: 'database-url'
        },
        headers: {
          'Authorization': 'Bearer valid-token'
        },
        requestContext: {
          authorizer: {
            userId: 'user-123',
            organizationId: 'org-123',
            role: 'ADMIN'
          }
        }
      };

      mockSecretsManager.getSecretValue.mockImplementation(() => ({
        promise: () => Promise.resolve({
          Name: 'tyler-setup/org-123/database-url',
          SecretString: 'postgresql://user:pass@localhost:5432/db',
          VersionId: 'version-123',
          CreatedDate: new Date('2024-01-01')
        })
      }));

      // Act
      const result = await handler(event, mockContext);

      // Assert
      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data).toMatchObject({
        name: 'database-url',
        value: 'postgresql://user:pass@localhost:5432/db',
        version: 'version-123',
        created: '2024-01-01T00:00:00.000Z'
      });

      expect(mockSecretsManager.getSecretValue).toHaveBeenCalledWith({
        SecretId: 'tyler-setup/org-123/database-url'
      });
    });

    it('should handle secret not found', async () => {
      // Arrange
      const event = {
        httpMethod: 'GET',
        path: '/secrets/nonexistent',
        pathParameters: {
          name: 'nonexistent'
        },
        headers: {
          'Authorization': 'Bearer valid-token'
        },
        requestContext: {
          authorizer: {
            userId: 'user-123',
            organizationId: 'org-123',
            role: 'ADMIN'
          }
        }
      };

      mockSecretsManager.getSecretValue.mockImplementation(() => ({
        promise: () => Promise.reject({
          code: 'ResourceNotFoundException',
          message: 'Secret not found'
        })
      }));

      // Act
      const result = await handler(event, mockContext);

      // Assert
      expect(result.statusCode).toBe(404);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toBe('Secret not found');
    });
  });

  describe('POST /secrets', () => {
    it('should create new secret', async () => {
      // Arrange
      const event = {
        httpMethod: 'POST',
        path: '/secrets',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'new-api-key',
          value: 'secret-api-key-value',
          description: 'External service API key',
          tags: {
            Environment: 'production',
            Service: 'external-api'
          }
        }),
        requestContext: {
          authorizer: {
            userId: 'user-123',
            organizationId: 'org-123',
            role: 'ADMIN'
          }
        }
      };

      mockSecretsManager.createSecret.mockImplementation(() => ({
        promise: () => Promise.resolve({
          ARN: 'arn:aws:secretsmanager:us-east-1:123456789:secret:tyler-setup/org-123/new-api-key',
          Name: 'tyler-setup/org-123/new-api-key',
          VersionId: 'version-123'
        })
      }));

      // Act
      const result = await handler(event, mockContext);

      // Assert
      expect(result.statusCode).toBe(201);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data).toMatchObject({
        name: 'new-api-key',
        arn: 'arn:aws:secretsmanager:us-east-1:123456789:secret:tyler-setup/org-123/new-api-key',
        version: 'version-123'
      });

      expect(mockSecretsManager.createSecret).toHaveBeenCalledWith({
        Name: 'tyler-setup/org-123/new-api-key',
        SecretString: 'secret-api-key-value',
        Description: 'External service API key',
        Tags: [
          { Key: 'Organization', Value: 'org-123' },
          { Key: 'CreatedBy', Value: 'user-123' },
          { Key: 'Environment', Value: 'production' },
          { Key: 'Service', Value: 'external-api' }
        ]
      });
    });

    it('should validate secret input', async () => {
      // Arrange
      const event = {
        httpMethod: 'POST',
        path: '/secrets',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          // Missing name
          value: 'secret-value'
        }),
        requestContext: {
          authorizer: {
            userId: 'user-123',
            organizationId: 'org-123',
            role: 'ADMIN'
          }
        }
      };

      validateSecretInput.mockImplementation(() => {
        throw new Error('Secret name is required');
      });

      // Act
      const result = await handler(event, mockContext);

      // Assert
      expect(result.statusCode).toBe(400);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toBe('Secret name is required');
    });

    it('should handle secret already exists', async () => {
      // Arrange
      const event = {
        httpMethod: 'POST',
        path: '/secrets',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'existing-secret',
          value: 'secret-value'
        }),
        requestContext: {
          authorizer: {
            userId: 'user-123',
            organizationId: 'org-123',
            role: 'ADMIN'
          }
        }
      };

      mockSecretsManager.createSecret.mockImplementation(() => ({
        promise: () => Promise.reject({
          code: 'ResourceExistsException',
          message: 'Secret already exists'
        })
      }));

      // Act
      const result = await handler(event, mockContext);

      // Assert
      expect(result.statusCode).toBe(409);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toBe('Secret already exists');
    });
  });

  describe('PUT /secrets/:name', () => {
    it('should update existing secret', async () => {
      // Arrange
      const event = {
        httpMethod: 'PUT',
        path: '/secrets/api-key',
        pathParameters: {
          name: 'api-key'
        },
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          value: 'updated-secret-value',
          description: 'Updated API key'
        }),
        requestContext: {
          authorizer: {
            userId: 'user-123',
            organizationId: 'org-123',
            role: 'ADMIN'
          }
        }
      };

      mockSecretsManager.updateSecret.mockImplementation(() => ({
        promise: () => Promise.resolve({
          ARN: 'arn:aws:secretsmanager:us-east-1:123456789:secret:tyler-setup/org-123/api-key',
          Name: 'tyler-setup/org-123/api-key',
          VersionId: 'version-456'
        })
      }));

      // Act
      const result = await handler(event, mockContext);

      // Assert
      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data).toMatchObject({
        name: 'api-key',
        version: 'version-456'
      });

      expect(mockSecretsManager.updateSecret).toHaveBeenCalledWith({
        SecretId: 'tyler-setup/org-123/api-key',
        SecretString: 'updated-secret-value',
        Description: 'Updated API key'
      });
    });
  });

  describe('DELETE /secrets/:name', () => {
    it('should delete secret', async () => {
      // Arrange
      const event = {
        httpMethod: 'DELETE',
        path: '/secrets/old-secret',
        pathParameters: {
          name: 'old-secret'
        },
        headers: {
          'Authorization': 'Bearer valid-token'
        },
        requestContext: {
          authorizer: {
            userId: 'user-123',
            organizationId: 'org-123',
            role: 'ADMIN'
          }
        }
      };

      mockSecretsManager.deleteSecret.mockImplementation(() => ({
        promise: () => Promise.resolve({
          ARN: 'arn:aws:secretsmanager:us-east-1:123456789:secret:tyler-setup/org-123/old-secret',
          Name: 'tyler-setup/org-123/old-secret',
          DeletionDate: new Date('2024-02-01')
        })
      }));

      // Act
      const result = await handler(event, mockContext);

      // Assert
      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Secret scheduled for deletion');

      expect(mockSecretsManager.deleteSecret).toHaveBeenCalledWith({
        SecretId: 'tyler-setup/org-123/old-secret',
        RecoveryWindowInDays: 30
      });
    });

    it('should support immediate deletion', async () => {
      // Arrange
      const event = {
        httpMethod: 'DELETE',
        path: '/secrets/old-secret',
        pathParameters: {
          name: 'old-secret'
        },
        queryStringParameters: {
          force: 'true'
        },
        headers: {
          'Authorization': 'Bearer valid-token'
        },
        requestContext: {
          authorizer: {
            userId: 'user-123',
            organizationId: 'org-123',
            role: 'ADMIN'
          }
        }
      };

      mockSecretsManager.deleteSecret.mockImplementation(() => ({
        promise: () => Promise.resolve({
          ARN: 'arn:aws:secretsmanager:us-east-1:123456789:secret:tyler-setup/org-123/old-secret',
          Name: 'tyler-setup/org-123/old-secret',
          DeletionDate: new Date()
        })
      }));

      // Act
      const result = await handler(event, mockContext);

      // Assert
      expect(result.statusCode).toBe(200);

      expect(mockSecretsManager.deleteSecret).toHaveBeenCalledWith({
        SecretId: 'tyler-setup/org-123/old-secret',
        ForceDeleteWithoutRecovery: true
      });
    });
  });

  describe('Security & Access Control', () => {
    it('should require authentication', async () => {
      // Arrange
      const event = {
        httpMethod: 'GET',
        path: '/secrets',
        headers: {}
      };

      // Act
      const result = await handler(event, mockContext);

      // Assert
      expect(result.statusCode).toBe(401);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toBe('Authentication required');
    });

    it('should enforce organization isolation', async () => {
      // Arrange
      const event = {
        httpMethod: 'GET',
        path: '/secrets/some-secret',
        pathParameters: {
          name: 'some-secret'
        },
        headers: {
          'Authorization': 'Bearer valid-token'
        },
        requestContext: {
          authorizer: {
            userId: 'user-123',
            organizationId: 'org-123',
            role: 'ADMIN'
          }
        }
      };

      // Mock attempt to access secret from different organization
      mockSecretsManager.getSecretValue.mockImplementation(() => ({
        promise: () => Promise.reject({
          code: 'AccessDeniedException',
          message: 'Access denied'
        })
      }));

      // Act
      const result = await handler(event, mockContext);

      // Assert
      expect(result.statusCode).toBe(403);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toBe('Access denied');
    });

    it('should log secret access attempts', async () => {
      // Arrange
      const event = {
        httpMethod: 'GET',
        path: '/secrets/database-url',
        pathParameters: {
          name: 'database-url'
        },
        headers: {
          'Authorization': 'Bearer valid-token',
          'X-Forwarded-For': '192.168.1.1'
        },
        requestContext: {
          authorizer: {
            userId: 'user-123',
            organizationId: 'org-123',
            role: 'ADMIN'
          }
        }
      };

      mockSecretsManager.getSecretValue.mockImplementation(() => ({
        promise: () => Promise.resolve({
          Name: 'tyler-setup/org-123/database-url',
          SecretString: 'secret-value',
          VersionId: 'version-123'
        })
      }));

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      await handler(event, mockContext);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/SECRET_ACCESS/),
        expect.objectContaining({
          secretName: 'database-url',
          userId: 'user-123',
          organizationId: 'org-123',
          action: 'READ',
          ip: '192.168.1.1'
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle AWS service errors', async () => {
      // Arrange
      const event = {
        httpMethod: 'GET',
        path: '/secrets',
        headers: {
          'Authorization': 'Bearer valid-token'
        },
        requestContext: {
          authorizer: {
            userId: 'user-123',
            organizationId: 'org-123',
            role: 'ADMIN'
          }
        }
      };

      mockSecretsManager.listSecrets.mockImplementation(() => ({
        promise: () => Promise.reject({
          code: 'InternalServiceError',
          message: 'AWS service error'
        })
      }));

      // Act
      const result = await handler(event, mockContext);

      // Assert
      expect(result.statusCode).toBe(502);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toBe('Service temporarily unavailable');
    });

    it('should handle malformed JSON in request body', async () => {
      // Arrange
      const event = {
        httpMethod: 'POST',
        path: '/secrets',
        headers: {
          'Authorization': 'Bearer valid-token',
          'Content-Type': 'application/json'
        },
        body: 'invalid json',
        requestContext: {
          authorizer: {
            userId: 'user-123',
            organizationId: 'org-123',
            role: 'ADMIN'
          }
        }
      };

      // Act
      const result = await handler(event, mockContext);

      // Assert
      expect(result.statusCode).toBe(400);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toContain('Invalid JSON');
    });
  });
});
