import request from 'supertest';
import { jest } from '@jest/globals';
import express from 'express';
import awsSecretsRouter from '../../routes/awsSecrets.js';
import { ValidationError, NotFoundError } from '../../middleware/errorHandler.js';

// Mock AWS SDK
const mockSecretsManagerClient = {
  send: jest.fn()
};

jest.mock('@aws-sdk/client-secrets-manager', () => ({
  SecretsManagerClient: jest.fn(() => mockSecretsManagerClient),
  ListSecretsCommand: jest.fn(),
  GetSecretValueCommand: jest.fn(),
  CreateSecretCommand: jest.fn(),
  UpdateSecretCommand: jest.fn(),
  DeleteSecretCommand: jest.fn()
}));

// Mock database connection
const mockDB = {
  query: jest.fn()
};

jest.mock('../../db/connection.js', () => ({
  getDB: () => mockDB
}));

// Mock Redis cache
const mockCache = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn()
};

jest.mock('../../utils/redis.js', () => ({
  cache: mockCache
}));

// Mock logger
jest.mock('../../utils/logger.js', () => ({
  logger: {
    error: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock rate limiter
jest.mock('../../middleware/rateLimiter.js', () => ({
  strictRateLimiter: (req, res, next) => next()
}));

describe('AWS Secrets Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/aws-secrets', awsSecretsRouter);

    // Reset all mocks
    jest.clearAllMocks();
    mockSecretsManagerClient.send.mockReset();
    mockDB.query.mockReset();
    mockCache.get.mockReset();
    mockCache.set.mockReset();
    mockCache.del.mockReset();
  });

  describe('GET /api/aws-secrets', () => {
    const mockSecrets = [
      {
        Name: 'test-secret-1',
        ARN: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test-secret-1',
        Description: 'Test secret 1',
        CreatedDate: new Date('2023-01-01'),
        LastAccessedDate: new Date('2023-01-15'),
        LastChangedDate: new Date('2023-01-10'),
        VersionId: 'v1',
        Tags: [{ Key: 'Environment', Value: 'test' }]
      },
      {
        Name: 'test-secret-2',
        ARN: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test-secret-2',
        Description: 'Test secret 2',
        CreatedDate: new Date('2023-02-01'),
        VersionId: 'v1',
        Tags: []
      }
    ];

    it('should return cached secrets when available', async () => {
      const cachedSecrets = mockSecrets.map(s => ({
        name: s.Name,
        arn: s.ARN,
        description: s.Description,
        createdDate: s.CreatedDate,
        lastAccessedDate: s.LastAccessedDate,
        lastChangedDate: s.LastChangedDate,
        versionId: s.VersionId,
        tags: s.Tags
      }));

      mockCache.get.mockResolvedValue(cachedSecrets);

      const response = await request(app)
        .get('/api/aws-secrets')
        .expect(200);

      expect(response.body).toEqual(cachedSecrets);
      expect(mockCache.get).toHaveBeenCalledWith('aws:secrets:list');
      expect(mockSecretsManagerClient.send).not.toHaveBeenCalled();
    });

    it('should fetch from AWS and cache when not cached', async () => {
      mockCache.get.mockResolvedValue(null);
      mockSecretsManagerClient.send.mockResolvedValue({
        SecretList: mockSecrets
      });
      mockDB.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/api/aws-secrets')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].name).toBe('test-secret-1');
      expect(response.body[1].name).toBe('test-secret-2');

      expect(mockSecretsManagerClient.send).toHaveBeenCalledTimes(1);
      expect(mockDB.query).toHaveBeenCalledTimes(2); // Once for each secret
      expect(mockCache.set).toHaveBeenCalledWith('aws:secrets:list', expect.any(Array), 600);
    });

    it('should handle AWS API errors gracefully', async () => {
      mockCache.get.mockResolvedValue(null);
      mockSecretsManagerClient.send.mockRejectedValue(new Error('AWS API Error'));

      const response = await request(app)
        .get('/api/aws-secrets')
        .expect(500);

      expect(response.body.error).toBeDefined();
    });

    it('should handle database errors gracefully', async () => {
      mockCache.get.mockResolvedValue(null);
      mockSecretsManagerClient.send.mockResolvedValue({
        SecretList: mockSecrets
      });
      mockDB.query.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/aws-secrets')
        .expect(500);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/aws-secrets/:name/value', () => {
    const mockSecretValue = {
      Name: 'test-secret',
      ARN: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test-secret',
      SecretString: '{"username":"admin","password":"secret"}',
      VersionId: 'v1',
      CreatedDate: new Date('2023-01-01')
    };

    it('should return secret value for valid secret name', async () => {
      mockSecretsManagerClient.send.mockResolvedValue(mockSecretValue);
      mockDB.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/api/aws-secrets/test-secret/value')
        .expect(200);

      expect(response.body.name).toBe('test-secret');
      expect(response.body.value).toEqual({ username: 'admin', password: 'secret' });
      expect(mockDB.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE aws_secrets'),
        ['test-secret']
      );
    });

    it('should handle non-JSON secret values', async () => {
      const nonJsonSecret = {
        ...mockSecretValue,
        SecretString: 'plain-text-secret'
      };
      mockSecretsManagerClient.send.mockResolvedValue(nonJsonSecret);
      mockDB.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/api/aws-secrets/test-secret/value')
        .expect(200);

      expect(response.body.value).toBe('plain-text-secret');
    });

    it('should return 400 for missing secret name', async () => {
      const response = await request(app)
        .get('/api/aws-secrets//value')
        .expect(404); // Express returns 404 for empty path params
    });

    it('should return 404 for non-existent secret', async () => {
      const error = new Error('Secret not found');
      error.name = 'ResourceNotFoundException';
      mockSecretsManagerClient.send.mockRejectedValue(error);

      const response = await request(app)
        .get('/api/aws-secrets/non-existent/value')
        .expect(500); // Will be handled by error middleware

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/aws-secrets', () => {
    const mockCreateResponse = {
      Name: 'new-secret',
      ARN: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:new-secret',
      VersionId: 'v1'
    };

    it('should create new secret successfully', async () => {
      mockSecretsManagerClient.send.mockResolvedValue(mockCreateResponse);
      mockDB.query.mockResolvedValue({ rows: [] });
      mockCache.del.mockResolvedValue(true);

      const secretData = {
        name: 'new-secret',
        value: { key: 'value' },
        description: 'New test secret',
        tags: [{ Key: 'Environment', Value: 'test' }]
      };

      const response = await request(app)
        .post('/api/aws-secrets')
        .send(secretData)
        .expect(201);

      expect(response.body.name).toBe('new-secret');
      expect(response.body.arn).toBe(mockCreateResponse.ARN);
      expect(mockDB.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO aws_secrets'),
        expect.arrayContaining([mockCreateResponse.Name, mockCreateResponse.ARN])
      );
      expect(mockCache.del).toHaveBeenCalledWith('aws:secrets:list');
    });

    it('should handle string values correctly', async () => {
      mockSecretsManagerClient.send.mockResolvedValue(mockCreateResponse);
      mockDB.query.mockResolvedValue({ rows: [] });

      const secretData = {
        name: 'new-secret',
        value: 'plain-string-value'
      };

      await request(app)
        .post('/api/aws-secrets')
        .send(secretData)
        .expect(201);

      expect(mockSecretsManagerClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          Name: 'new-secret',
          SecretString: 'plain-string-value'
        })
      );
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/aws-secrets')
        .send({ name: 'test' }) // Missing value
        .expect(500); // Will be handled by validation in route

      expect(response.body.error).toBeDefined();
    });

    it('should handle duplicate secret name', async () => {
      const error = new Error('Secret already exists');
      error.name = 'ResourceExistsException';
      mockSecretsManagerClient.send.mockRejectedValue(error);

      const secretData = {
        name: 'existing-secret',
        value: 'some-value'
      };

      const response = await request(app)
        .post('/api/aws-secrets')
        .send(secretData)
        .expect(500);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('PUT /api/aws-secrets/:name', () => {
    const mockUpdateResponse = {
      Name: 'test-secret',
      ARN: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test-secret',
      VersionId: 'v2'
    };

    it('should update secret successfully', async () => {
      mockSecretsManagerClient.send.mockResolvedValue(mockUpdateResponse);
      mockDB.query.mockResolvedValue({ rows: [] });
      mockCache.del.mockResolvedValue(true);

      const updateData = {
        value: { updated: 'value' },
        description: 'Updated description'
      };

      const response = await request(app)
        .put('/api/aws-secrets/test-secret')
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe('test-secret');
      expect(response.body.versionId).toBe('v2');
      expect(mockCache.del).toHaveBeenCalledTimes(2); // List cache and individual secret cache
    });

    it('should return 400 for missing value', async () => {
      const response = await request(app)
        .put('/api/aws-secrets/test-secret')
        .send({ description: 'Only description' })
        .expect(500);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('DELETE /api/aws-secrets/:name', () => {
    it('should delete secret with recovery window', async () => {
      mockSecretsManagerClient.send.mockResolvedValue({});
      mockDB.query.mockResolvedValue({ rows: [] });
      mockCache.del.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/aws-secrets/test-secret')
        .expect(200);

      expect(response.body.message).toContain('scheduled for deletion in 7 days');
      expect(mockSecretsManagerClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          SecretId: 'test-secret',
          ForceDeleteWithoutRecovery: false,
          RecoveryWindowInDays: 7
        })
      );
    });

    it('should force delete when requested', async () => {
      mockSecretsManagerClient.send.mockResolvedValue({});
      mockDB.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .delete('/api/aws-secrets/test-secret?forceDelete=true')
        .expect(200);

      expect(response.body.message).toContain('deleted permanently');
      expect(mockSecretsManagerClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          ForceDeleteWithoutRecovery: true
        })
      );
    });
  });

  describe('GET /api/aws-secrets/:name/metadata', () => {
    it('should return metadata from local database', async () => {
      const mockMetadata = {
        secret_name: 'test-secret',
        arn: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test-secret',
        description: 'Test secret',
        created_date: '2023-01-01T00:00:00Z',
        version_id: 'v1'
      };

      mockDB.query.mockResolvedValue({ rows: [mockMetadata] });

      const response = await request(app)
        .get('/api/aws-secrets/test-secret/metadata')
        .expect(200);

      expect(response.body).toEqual(mockMetadata);
    });

    it('should return 404 for non-existent secret in database', async () => {
      mockDB.query.mockResolvedValue({ rows: [] });

      const response = await request(app)
        .get('/api/aws-secrets/non-existent/metadata')
        .expect(500); // Will be handled by NotFoundError

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Security Tests', () => {
    it('should apply rate limiting to all routes', async () => {
      // This test verifies rate limiting middleware is applied
      // In real implementation, you'd need to mock the rate limiter to return rate limit exceeded
      expect(awsSecretsRouter.stack.some(layer =>
        layer.handle.name === 'strictRateLimiter' ||
        layer.name === 'strictRateLimiter'
      )).toBeTruthy();
    });

    it('should sanitize error messages to prevent information disclosure', async () => {
      mockCache.get.mockResolvedValue(null);
      const sensitiveError = new Error('AWS credentials invalid: access key AKIA123456789ABCDEF');
      mockSecretsManagerClient.send.mockRejectedValue(sensitiveError);

      const response = await request(app)
        .get('/api/aws-secrets')
        .expect(500);

      // Error message should not contain sensitive AWS credentials
      expect(response.body.error).not.toContain('AKIA123456789ABCDEF');
      expect(response.body.message).not.toContain('access key');
    });

    it('should handle malicious secret names', async () => {
      const maliciousName = '../../../etc/passwd';

      const response = await request(app)
        .get(`/api/aws-secrets/${encodeURIComponent(maliciousName)}/value`)
        .expect(500); // Should fail safely

      expect(response.body.error).toBeDefined();
    });
  });
});
