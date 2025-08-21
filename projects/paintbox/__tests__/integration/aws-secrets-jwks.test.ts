/**
 * AWS Secrets Manager Integration Tests for JWKS
 * Tests real AWS integration with proper mocking for CI/CD
 */

import {
  fetchJWKS,
  getJWKSMetadata,
  listJWKSVersions,
  testConnection,
  cleanup
} from '@/lib/services/jwks-secrets-manager';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
  DescribeSecretCommand,
  ListSecretVersionIdsCommand,
  ResourceNotFoundException,
  DecryptionFailureException,
  InternalServiceErrorException,
  ThrottlingException
} from '@aws-sdk/client-secrets-manager';

// Mock AWS SDK for integration tests
jest.mock('@aws-sdk/client-secrets-manager');

const createMockJWKSData = () => ({
  'current-key': {
    kty: 'RSA',
    use: 'sig',
    kid: 'current-key',
    alg: 'RS256',
    n: 'test-modulus',
    e: 'AQAB'
  },
  'backup-key': {
    kty: 'RSA',
    use: 'sig',
    kid: 'backup-key',
    alg: 'RS256',
    n: 'backup-modulus',
    e: 'AQAB'
  }
});

const createMockJWKSFormat = () => ({
  keys: [
    {
      kty: 'RSA',
      use: 'sig',
      kid: 'jwks-key-1',
      alg: 'RS256',
      n: 'jwks-modulus-1',
      e: 'AQAB'
    },
    {
      kty: 'RSA',
      use: 'sig',
      kid: 'jwks-key-2',
      alg: 'RS256',
      n: 'jwks-modulus-2',
      e: 'AQAB'
    }
  ]
});

describe('AWS Secrets Manager JWKS Integration', () => {
  let mockSecretsClient: jest.Mocked<SecretsManagerClient>;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    // Mock console to reduce test noise
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();

    jest.clearAllMocks();

    // Create mock client
    mockSecretsClient = {
      send: jest.fn(),
      destroy: jest.fn()
    } as any;

    (SecretsManagerClient as jest.Mock).mockImplementation(() => mockSecretsClient);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    cleanup();
  });

  describe('fetchJWKS', () => {
    it('should successfully fetch JWKS from AWS', async () => {
      const mockData = createMockJWKSData();
      mockSecretsClient.send.mockResolvedValueOnce({
        SecretString: JSON.stringify(mockData)
      });

      const result = await fetchJWKS();

      expect(result.keys).toHaveLength(2);
      expect(result.keys[0]).toMatchObject({
        kty: 'RSA',
        use: 'sig',
        alg: 'RS256',
        e: 'AQAB'
      });

      expect(mockSecretsClient.send).toHaveBeenCalledWith(
        expect.any(GetSecretValueCommand)
      );
    });

    it('should handle JWKS format from AWS', async () => {
      const mockData = createMockJWKSFormat();
      mockSecretsClient.send.mockResolvedValueOnce({
        SecretString: JSON.stringify(mockData)
      });

      const result = await fetchJWKS();

      expect(result.keys).toHaveLength(2);
      expect(result.keys[0].kid).toBe('jwks-key-1');
      expect(result.keys[1].kid).toBe('jwks-key-2');
    });

    it('should fetch specific version when requested', async () => {
      const mockData = createMockJWKSData();
      mockSecretsClient.send.mockResolvedValueOnce({
        SecretString: JSON.stringify(mockData),
        VersionId: 'specific-version-id'
      });

      const result = await fetchJWKS({
        versionId: 'specific-version-id'
      });

      expect(result.keys).toHaveLength(2);
      expect(mockSecretsClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            VersionId: 'specific-version-id'
          })
        })
      );
    });

    it('should fetch from custom secret ID', async () => {
      const mockData = createMockJWKSData();
      mockSecretsClient.send.mockResolvedValueOnce({
        SecretString: JSON.stringify(mockData)
      });

      const customSecretId = 'custom/jwks/secret';
      const result = await fetchJWKS({
        secretId: customSecretId
      });

      expect(result.keys).toHaveLength(2);
      expect(mockSecretsClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            SecretId: customSecretId
          })
        })
      );
    });

    it('should handle timeout on AWS requests', async () => {
      // Mock a slow response that exceeds timeout
      mockSecretsClient.send.mockImplementationOnce(() =>
        new Promise(resolve => setTimeout(resolve, 6000))
      );

      await expect(fetchJWKS()).rejects.toThrow('AWS request timeout');
    });

    it('should handle ResourceNotFoundException', async () => {
      mockSecretsClient.send.mockRejectedValueOnce(
        new ResourceNotFoundException({
          message: 'Secret not found',
          $metadata: {}
        })
      );

      await expect(fetchJWKS()).rejects.toThrow('JWKS secret not found in AWS');
    });

    it('should handle DecryptionFailureException', async () => {
      mockSecretsClient.send.mockRejectedValueOnce(
        new DecryptionFailureException({
          message: 'KMS decryption failed',
          $metadata: {}
        })
      );

      await expect(fetchJWKS()).rejects.toThrow('Failed to decrypt JWKS secret');
    });

    it('should handle InternalServiceErrorException', async () => {
      mockSecretsClient.send.mockRejectedValueOnce(
        new InternalServiceErrorException({
          message: 'Internal service error',
          $metadata: {}
        })
      );

      await expect(fetchJWKS()).rejects.toThrow('AWS service temporarily unavailable');
    });

    it('should handle ThrottlingException', async () => {
      mockSecretsClient.send.mockRejectedValueOnce(
        new ThrottlingException({
          message: 'Too many requests',
          $metadata: {}
        })
      );

      await expect(fetchJWKS()).rejects.toThrow('AWS request throttled');
    });

    it('should handle malformed JSON in secret', async () => {
      mockSecretsClient.send.mockResolvedValueOnce({
        SecretString: 'invalid-json{'
      });

      await expect(fetchJWKS()).rejects.toThrow('Invalid JSON in secret');
    });

    it('should handle binary secrets (unsupported)', async () => {
      mockSecretsClient.send.mockResolvedValueOnce({
        SecretBinary: new Uint8Array([1, 2, 3])
      });

      await expect(fetchJWKS()).rejects.toThrow('Secret is binary, expected string');
    });

    it('should handle empty secret value', async () => {
      mockSecretsClient.send.mockResolvedValueOnce({});

      await expect(fetchJWKS()).rejects.toThrow('Secret value is empty');
    });

    it('should validate required key fields', async () => {
      const invalidData = {
        'invalid-key': {
          kty: 'RSA',
          use: 'sig'
          // Missing n, e, kid
        }
      };

      mockSecretsClient.send.mockResolvedValueOnce({
        SecretString: JSON.stringify(invalidData)
      });

      await expect(fetchJWKS()).rejects.toThrow('Invalid key: missing');
    });

    it('should handle empty keys object', async () => {
      mockSecretsClient.send.mockResolvedValueOnce({
        SecretString: JSON.stringify({})
      });

      await expect(fetchJWKS()).rejects.toThrow('No valid keys found in secret');
    });

    it('should apply default values for optional key fields', async () => {
      const partialData = {
        'partial-key': {
          n: 'test-modulus',
          e: 'AQAB'
          // Missing kty, use, alg - should get defaults
        }
      };

      mockSecretsClient.send.mockResolvedValueOnce({
        SecretString: JSON.stringify(partialData)
      });

      const result = await fetchJWKS();

      expect(result.keys[0]).toMatchObject({
        kty: 'RSA',
        use: 'sig',
        alg: 'RS256',
        kid: 'partial-key',
        n: 'test-modulus',
        e: 'AQAB'
      });
    });
  });

  describe('getJWKSMetadata', () => {
    it('should fetch secret metadata successfully', async () => {
      const mockMetadata = {
        ARN: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test-secret',
        Name: 'paintbox/production/jwt/public-keys',
        VersionIdsToStages: {
          'version-1': ['AWSCURRENT'],
          'version-2': ['AWSPENDING']
        },
        LastChangedDate: new Date('2024-01-01T12:00:00Z'),
        RotationEnabled: true,
        NextRotationDate: new Date('2024-02-01T12:00:00Z')
      };

      mockSecretsClient.send.mockResolvedValueOnce(mockMetadata);

      const result = await getJWKSMetadata();

      expect(result).toMatchObject({
        arn: mockMetadata.ARN,
        name: mockMetadata.Name,
        versionId: 'version-1',
        lastModified: mockMetadata.LastChangedDate,
        rotationEnabled: true,
        nextRotation: mockMetadata.NextRotationDate
      });

      expect(mockSecretsClient.send).toHaveBeenCalledWith(
        expect.any(DescribeSecretCommand)
      );
    });

    it('should handle missing optional metadata fields', async () => {
      const mockMetadata = {
        ARN: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test-secret',
        Name: 'paintbox/production/jwt/public-keys'
      };

      mockSecretsClient.send.mockResolvedValueOnce(mockMetadata);

      const result = await getJWKSMetadata();

      expect(result.arn).toBe(mockMetadata.ARN);
      expect(result.name).toBe(mockMetadata.Name);
      expect(result.rotationEnabled).toBe(false);
      expect(result.nextRotation).toBeUndefined();
    });

    it('should use custom secret ID when provided', async () => {
      const customSecretId = 'custom/secret/path';
      mockSecretsClient.send.mockResolvedValueOnce({
        ARN: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:custom-secret',
        Name: customSecretId
      });

      await getJWKSMetadata(customSecretId);

      expect(mockSecretsClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            SecretId: customSecretId
          })
        })
      );
    });
  });

  describe('listJWKSVersions', () => {
    it('should list all non-deprecated versions', async () => {
      const mockVersions = {
        Versions: [
          {
            VersionId: 'version-1',
            VersionStages: ['AWSCURRENT'],
            CreatedDate: new Date('2024-01-01')
          },
          {
            VersionId: 'version-2',
            VersionStages: ['AWSPENDING'],
            CreatedDate: new Date('2024-01-02')
          },
          {
            VersionId: 'version-3',
            VersionStages: ['DEPRECATED'],
            CreatedDate: new Date('2023-12-01')
          }
        ]
      };

      mockSecretsClient.send.mockResolvedValueOnce(mockVersions);

      const result = await listJWKSVersions();

      expect(result).toHaveLength(3);
      expect(result).toContain('version-1');
      expect(result).toContain('version-2');
      expect(result).toContain('version-3');

      expect(mockSecretsClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            IncludeDeprecated: false
          })
        })
      );
    });

    it('should handle empty versions list', async () => {
      mockSecretsClient.send.mockResolvedValueOnce({
        Versions: []
      });

      const result = await listJWKSVersions();

      expect(result).toHaveLength(0);
    });

    it('should handle missing versions property', async () => {
      mockSecretsClient.send.mockResolvedValueOnce({});

      const result = await listJWKSVersions();

      expect(result).toHaveLength(0);
    });

    it('should filter out versions without VersionId', async () => {
      const mockVersions = {
        Versions: [
          {
            VersionId: 'version-1',
            VersionStages: ['AWSCURRENT']
          },
          {
            // Missing VersionId
            VersionStages: ['AWSPENDING']
          }
        ]
      };

      mockSecretsClient.send.mockResolvedValueOnce(mockVersions);

      const result = await listJWKSVersions();

      expect(result).toHaveLength(1);
      expect(result[0]).toBe('version-1');
    });
  });

  describe('testConnection', () => {
    it('should return true for successful connection', async () => {
      mockSecretsClient.send.mockResolvedValueOnce({
        ARN: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test-secret',
        Name: 'paintbox/production/jwt/public-keys',
        RotationEnabled: false
      });

      const result = await testConnection();

      expect(result).toBe(true);
    });

    it('should return false for connection failures', async () => {
      mockSecretsClient.send.mockRejectedValueOnce(
        new Error('Connection failed')
      );

      const result = await testConnection();

      expect(result).toBe(false);
    });

    it('should log connection details on success', async () => {
      const mockMetadata = {
        ARN: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test-secret',
        Name: 'test-secret',
        RotationEnabled: true
      };

      mockSecretsClient.send.mockResolvedValueOnce(mockMetadata);

      await testConnection();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Connection test successful'),
        expect.objectContaining({
          name: 'test-secret',
          arn: mockMetadata.ARN,
          rotationEnabled: true
        })
      );
    });
  });

  describe('AWS Client Configuration', () => {
    it('should configure client with environment variables', () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        AWS_REGION: 'us-west-2',
        AWS_ACCESS_KEY_ID: 'test-access-key',
        AWS_SECRET_ACCESS_KEY: 'test-secret-key',
        AWS_SESSION_TOKEN: 'test-session-token'
      };

      // Force recreation of client
      cleanup();
      mockSecretsClient.send.mockResolvedValueOnce({
        SecretString: JSON.stringify(createMockJWKSData())
      });

      fetchJWKS();

      expect(SecretsManagerClient).toHaveBeenCalledWith(
        expect.objectContaining({
          region: 'us-west-2',
          credentials: {
            accessKeyId: 'test-access-key',
            secretAccessKey: 'test-secret-key',
            sessionToken: 'test-session-token'
          }
        })
      );

      process.env = originalEnv;
    });

    it('should use IAM role when no explicit credentials', () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        AWS_REGION: 'us-east-1'
      };
      delete process.env.AWS_ACCESS_KEY_ID;
      delete process.env.AWS_SECRET_ACCESS_KEY;

      cleanup();
      mockSecretsClient.send.mockResolvedValueOnce({
        SecretString: JSON.stringify(createMockJWKSData())
      });

      fetchJWKS();

      expect(SecretsManagerClient).toHaveBeenCalledWith(
        expect.objectContaining({
          region: 'us-east-1',
          // Should not have explicit credentials
        })
      );

      process.env = originalEnv;
    });
  });

  describe('Resource Cleanup', () => {
    it('should cleanup client resources', () => {
      cleanup();
      expect(mockSecretsClient.destroy).toHaveBeenCalled();
    });

    it('should handle multiple cleanup calls safely', () => {
      cleanup();
      cleanup();
      cleanup();

      // Should not throw errors
      expect(true).toBe(true);
    });
  });

  describe('Error Recovery', () => {
    it('should retry on transient failures', async () => {
      // First call fails, second succeeds
      mockSecretsClient.send
        .mockRejectedValueOnce(new InternalServiceErrorException({
          message: 'Temporary failure',
          $metadata: {}
        }))
        .mockResolvedValueOnce({
          SecretString: JSON.stringify(createMockJWKSData())
        });

      // Due to SDK retry configuration, this should succeed
      const result = await fetchJWKS();
      expect(result.keys).toHaveLength(2);
    });

    it('should handle network timeouts gracefully', async () => {
      mockSecretsClient.send.mockImplementationOnce(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Network timeout')), 100)
        )
      );

      await expect(fetchJWKS()).rejects.toThrow();
    });
  });

  describe('Performance Considerations', () => {
    it('should reuse client instances for efficiency', async () => {
      mockSecretsClient.send.mockResolvedValue({
        SecretString: JSON.stringify(createMockJWKSData())
      });

      // Make multiple calls
      await fetchJWKS();
      await fetchJWKS();
      await getJWKSMetadata();
      await listJWKSVersions();

      // Should create only one client instance
      expect(SecretsManagerClient).toHaveBeenCalledTimes(1);
    });

    it('should handle concurrent requests efficiently', async () => {
      mockSecretsClient.send.mockResolvedValue({
        SecretString: JSON.stringify(createMockJWKSData())
      });

      const requests = Array.from({ length: 5 }, () => fetchJWKS());
      const results = await Promise.all(requests);

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.keys).toHaveLength(2);
      });
    });
  });
});
