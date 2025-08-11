import { handler } from '../../src/handlers/secrets.js';
import { mockDynamoDBDocumentClient, mockSecretsManagerClient } from '../mocks/aws-sdk.js';
import { verifyJwtToken } from '../../src/utils/security.js';
import { logAudit } from '../../src/utils/helpers.js';

// Mock dependencies
jest.mock('@aws-sdk/lib-dynamodb');
jest.mock('@aws-sdk/client-secrets-manager');
jest.mock('../../src/utils/security.js');
jest.mock('../../src/utils/helpers.js');

describe('Secrets Handler', () => {
  let mockEvent, mockUser, mockSecret;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUser = {
      id: 'admin-123',
      email: 'admin@example.com',
      role: 'admin'
    };

    mockSecret = {
      id: 'secret-123',
      name: 'database-password',
      description: 'Production database password',
      type: 'password',
      category: 'database',
      awsSecretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test-secret',
      createdBy: 'admin-123',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
      tags: ['production', 'database']
    };

    mockEvent = {
      httpMethod: 'GET',
      path: '/secrets',
      headers: {
        Authorization: 'Bearer valid-token',
        'User-Agent': 'test-agent',
        'X-Forwarded-For': '192.168.1.1'
      },
      queryStringParameters: null,
      pathParameters: null,
      body: null
    };

    // Setup default mocks
    verifyJwtToken.mockResolvedValue(mockUser);
    logAudit.mockResolvedValue();

    // Mock environment variables
    process.env.SECRETS_PREFIX = 'test';
    process.env.AWS_REGION = 'us-east-1';
  });

  describe('GET /secrets', () => {
    it('should return list of secrets for admin', async () => {
      mockDynamoDBDocumentClient.send.mockResolvedValueOnce({
        Items: [mockSecret],
        Count: 1,
        ScannedCount: 1
      });

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.secrets).toEqual([mockSecret]);
      expect(body.data.total).toBe(1);
    });

    it('should filter secrets by category', async () => {
      mockEvent.queryStringParameters = { category: 'database' };

      mockDynamoDBDocumentClient.send.mockResolvedValueOnce({
        Items: [mockSecret],
        Count: 1
      });

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.data.secrets).toEqual([mockSecret]);
    });

    it('should deny access for employee users', async () => {
      verifyJwtToken.mockResolvedValue({ ...mockUser, role: 'employee' });

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(403);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toBe('Insufficient permissions');
    });
  });

  describe('GET /secrets/:id', () => {
    beforeEach(() => {
      mockEvent.pathParameters = { id: 'secret-123' };
      mockEvent.path = '/secrets/secret-123';
    });

    it('should return secret details without value for admin', async () => {
      mockDynamoDBDocumentClient.send.mockResolvedValueOnce({
        Item: mockSecret
      });

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(mockSecret);
      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
        action: 'SECRET_VIEWED'
      }));
    });

    it('should return secret value for authorized users with getValue param', async () => {
      mockEvent.queryStringParameters = { getValue: 'true' };

      mockDynamoDBDocumentClient.send.mockResolvedValueOnce({
        Item: mockSecret
      });

      mockSecretsManagerClient.send.mockResolvedValueOnce({
        SecretString: JSON.stringify({ password: 'super-secret-password' })
      });

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.value).toEqual({ password: 'super-secret-password' });
      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
        action: 'SECRET_VALUE_ACCESSED'
      }));
    });

    it('should return 404 for non-existent secret', async () => {
      mockDynamoDBDocumentClient.send.mockResolvedValueOnce({
        Item: null
      });

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.error.message).toBe('Secret not found');
    });
  });

  describe('POST /secrets', () => {
    beforeEach(() => {
      mockEvent.httpMethod = 'POST';
      mockEvent.body = JSON.stringify({
        name: 'api-key',
        description: 'Third-party API key',
        type: 'api-key',
        category: 'integration',
        value: 'sk-1234567890abcdef',
        tags: ['production', 'api']
      });
    });

    it('should create new secret in AWS Secrets Manager', async () => {
      mockSecretsManagerClient.send.mockResolvedValueOnce({
        ARN: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test-api-key-abc123',
        Name: 'test-api-key',
        VersionId: 'version-1'
      });

      mockDynamoDBDocumentClient.send.mockResolvedValueOnce({}); // PutCommand

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('api-key');
      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
        action: 'SECRET_CREATED'
      }));
    });

    it('should validate required fields', async () => {
      mockEvent.body = JSON.stringify({
        name: 'incomplete-secret'
        // Missing required fields
      });

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.message).toContain('validation');
    });

    it('should prevent duplicate secret names', async () => {
      mockDynamoDBDocumentClient.send.mockResolvedValueOnce({
        Items: [mockSecret] // Existing secret found
      });

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(409);
      const body = JSON.parse(result.body);
      expect(body.error.message).toBe('Secret with this name already exists');
    });

    it('should handle AWS Secrets Manager errors', async () => {
      mockSecretsManagerClient.send.mockRejectedValue(
        new Error('ResourceLimitExceededException')
      );

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
    });
  });

  describe('PUT /secrets/:id', () => {
    beforeEach(() => {
      mockEvent.httpMethod = 'PUT';
      mockEvent.pathParameters = { id: 'secret-123' };
      mockEvent.path = '/secrets/secret-123';
      mockEvent.body = JSON.stringify({
        description: 'Updated description',
        tags: ['production', 'database', 'updated']
      });
    });

    it('should update secret metadata', async () => {
      mockDynamoDBDocumentClient.send
        .mockResolvedValueOnce({ Item: mockSecret }) // GetCommand
        .mockResolvedValueOnce({}); // UpdateCommand

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
        action: 'SECRET_UPDATED'
      }));
    });

    it('should update secret value in AWS Secrets Manager', async () => {
      mockEvent.body = JSON.stringify({
        value: 'new-secret-value',
        description: 'Updated with new value'
      });

      mockDynamoDBDocumentClient.send
        .mockResolvedValueOnce({ Item: mockSecret }) // GetCommand
        .mockResolvedValueOnce({}); // UpdateCommand

      mockSecretsManagerClient.send.mockResolvedValueOnce({
        VersionId: 'new-version-id'
      });

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
        action: 'SECRET_VALUE_UPDATED'
      }));
    });

    it('should return 404 for non-existent secret', async () => {
      mockDynamoDBDocumentClient.send.mockResolvedValueOnce({
        Item: null
      });

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(404);
      const body = JSON.parse(result.body);
      expect(body.error.message).toBe('Secret not found');
    });
  });

  describe('DELETE /secrets/:id', () => {
    beforeEach(() => {
      mockEvent.httpMethod = 'DELETE';
      mockEvent.pathParameters = { id: 'secret-123' };
      mockEvent.path = '/secrets/secret-123';
    });

    it('should delete secret from both DynamoDB and AWS Secrets Manager', async () => {
      mockDynamoDBDocumentClient.send
        .mockResolvedValueOnce({ Item: mockSecret }) // GetCommand
        .mockResolvedValueOnce({}); // DeleteCommand

      mockSecretsManagerClient.send.mockResolvedValueOnce({}); // DeleteSecretCommand

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
        action: 'SECRET_DELETED'
      }));
    });

    it('should support force delete with immediate deletion', async () => {
      mockEvent.queryStringParameters = { force: 'true' };

      mockDynamoDBDocumentClient.send
        .mockResolvedValueOnce({ Item: mockSecret })
        .mockResolvedValueOnce({});

      mockSecretsManagerClient.send.mockResolvedValueOnce({});

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
    });
  });

  describe('POST /secrets/:id/rotate', () => {
    beforeEach(() => {
      mockEvent.httpMethod = 'POST';
      mockEvent.path = '/secrets/secret-123/rotate';
      mockEvent.pathParameters = { id: 'secret-123' };
    });

    it('should rotate secret value', async () => {
      mockDynamoDBDocumentClient.send.mockResolvedValueOnce({
        Item: mockSecret
      });

      mockSecretsManagerClient.send
        .mockResolvedValueOnce({ VersionId: 'new-version' }) // UpdateSecretCommand
        .mockResolvedValueOnce({}); // PutSecretValueCommand

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
        action: 'SECRET_ROTATED'
      }));
    });
  });

  describe('Authorization & Security', () => {
    it('should require admin role for secret operations', async () => {
      verifyJwtToken.mockResolvedValue({ ...mockUser, role: 'employee' });

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(403);
      const body = JSON.parse(result.body);
      expect(body.error.message).toBe('Insufficient permissions');
    });

    it('should log all secret access attempts', async () => {
      mockDynamoDBDocumentClient.send.mockResolvedValueOnce({
        Items: [mockSecret]
      });

      await handler(mockEvent);

      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
        action: 'SECRETS_LIST_ACCESSED',
        userId: mockUser.id
      }));
    });

    it('should sanitize secret data in responses', async () => {
      const secretWithSensitiveData = {
        ...mockSecret,
        internalNotes: 'Sensitive internal information',
        awsSecretArn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test'
      };

      mockDynamoDBDocumentClient.send.mockResolvedValueOnce({
        Items: [secretWithSensitiveData]
      });

      const result = await handler(mockEvent);
      const body = JSON.parse(result.body);

      // Ensure sensitive fields are not exposed
      expect(body.data.secrets[0]).not.toHaveProperty('internalNotes');
    });
  });

  describe('Error Handling', () => {
    it('should handle AWS Secrets Manager service errors', async () => {
      mockSecretsManagerClient.send.mockRejectedValue(
        new Error('InternalServiceErrorException')
      );

      mockEvent.httpMethod = 'POST';
      mockEvent.body = JSON.stringify({
        name: 'test-secret',
        value: 'test-value',
        type: 'password'
      });

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
    });

    it('should handle malformed JSON in request body', async () => {
      mockEvent.httpMethod = 'POST';
      mockEvent.body = 'invalid-json';

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
    });
  });

  describe('Input Validation', () => {
    it('should validate secret name format', async () => {
      mockEvent.httpMethod = 'POST';
      mockEvent.body = JSON.stringify({
        name: 'invalid name with spaces!',
        value: 'test-value',
        type: 'password'
      });

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.message).toContain('name must be alphanumeric');
    });

    it('should validate secret type', async () => {
      mockEvent.httpMethod = 'POST';
      mockEvent.body = JSON.stringify({
        name: 'valid-name',
        value: 'test-value',
        type: 'invalid-type'
      });

      const result = await handler(mockEvent);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error.message).toContain('type must be one of');
    });
  });
});
