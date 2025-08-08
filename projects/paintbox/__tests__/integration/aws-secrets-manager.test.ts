import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { SecretsManagerClient, GetSecretValueCommand, CreateSecretCommand, UpdateSecretCommand, DeleteSecretCommand, ListSecretsCommand } from '@aws-sdk/client-secrets-manager'

// Import the actual secrets manager service
import { SecretsManager } from '../../lib/services/secrets-manager'

// Mock AWS SDK
const mockSend = jest.fn()
const mockSecretsManagerClient = jest.fn(() => ({
  send: mockSend
}))

jest.mock('@aws-sdk/client-secrets-manager', () => ({
  SecretsManagerClient: mockSecretsManagerClient,
  GetSecretValueCommand: jest.fn((params) => ({ input: params })),
  CreateSecretCommand: jest.fn((params) => ({ input: params })),
  UpdateSecretCommand: jest.fn((params) => ({ input: params })),
  DeleteSecretCommand: jest.fn((params) => ({ input: params })),
  ListSecretsCommand: jest.fn((params) => ({ input: params })),
}))

describe('AWS Secrets Manager Integration', () => {
  let secretsManager: SecretsManager

  beforeEach(() => {
    jest.clearAllMocks()
    secretsManager = new SecretsManager()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Connection and Authentication', () => {
    it('should successfully connect to AWS Secrets Manager', async () => {
      mockSend.mockResolvedValueOnce({
        SecretList: []
      })

      const result = await secretsManager.testConnection()

      expect(result.connected).toBe(true)
      expect(mockSend).toHaveBeenCalledWith(expect.any(Object))
    })

    it('should handle AWS authentication failures', async () => {
      mockSend.mockRejectedValueOnce({
        name: 'UnauthorizedOperation',
        message: 'The security token included in the request is invalid'
      })

      const result = await secretsManager.testConnection()

      expect(result.connected).toBe(false)
      expect(result.error).toContain('authentication failed')
    })

    it('should handle network connectivity issues', async () => {
      mockSend.mockRejectedValueOnce({
        name: 'NetworkingError',
        message: 'Connection timeout'
      })

      const result = await secretsManager.testConnection()

      expect(result.connected).toBe(false)
      expect(result.error).toContain('network error')
    })

    it('should handle AWS service unavailability', async () => {
      mockSend.mockRejectedValueOnce({
        name: 'ServiceUnavailableException',
        message: 'The service is temporarily unavailable'
      })

      const result = await secretsManager.testConnection()

      expect(result.connected).toBe(false)
      expect(result.error).toContain('service unavailable')
    })
  })

  describe('Secret Retrieval', () => {
    it('should retrieve existing secrets successfully', async () => {
      const mockSecret = {
        SecretString: JSON.stringify({
          client_id: 'test-client-id',
          client_secret: 'test-client-secret'
        }),
        VersionId: 'version-123',
        CreatedDate: new Date('2024-01-01'),
        Name: 'test/salesforce/credentials'
      }

      mockSend.mockResolvedValueOnce(mockSecret)

      const result = await secretsManager.getSecret('test/salesforce/credentials')

      expect(result).toEqual({
        client_id: 'test-client-id',
        client_secret: 'test-client-secret'
      })
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: { SecretId: 'test/salesforce/credentials' }
        })
      )
    })

    it('should handle non-existent secrets gracefully', async () => {
      mockSend.mockRejectedValueOnce({
        name: 'ResourceNotFoundException',
        message: 'Secrets Manager can\'t find the specified secret.'
      })

      await expect(secretsManager.getSecret('non-existent-secret')).rejects.toThrow('Secret not found')
    })

    it('should handle malformed secret data', async () => {
      const mockSecret = {
        SecretString: 'invalid-json-data',
        VersionId: 'version-123',
        CreatedDate: new Date('2024-01-01'),
        Name: 'test/malformed/secret'
      }

      mockSend.mockResolvedValueOnce(mockSecret)

      await expect(secretsManager.getSecret('test/malformed/secret')).rejects.toThrow('Invalid secret format')
    })

    it('should implement retry logic for transient failures', async () => {
      // First two calls fail, third succeeds
      mockSend
        .mockRejectedValueOnce({ name: 'InternalServiceError', message: 'Internal error' })
        .mockRejectedValueOnce({ name: 'ThrottlingException', message: 'Rate exceeded' })
        .mockResolvedValueOnce({
          SecretString: JSON.stringify({ key: 'value' }),
          VersionId: 'version-123'
        })

      const result = await secretsManager.getSecretWithRetry('test/retry/secret', 3, 100)

      expect(result).toEqual({ key: 'value' })
      expect(mockSend).toHaveBeenCalledTimes(3)
    })

    it('should cache secrets to reduce API calls', async () => {
      const mockSecret = {
        SecretString: JSON.stringify({ cached: 'value' }),
        VersionId: 'version-123'
      }

      mockSend.mockResolvedValue(mockSecret)

      // First call should hit AWS
      const result1 = await secretsManager.getSecretCached('test/cached/secret', 300) // 5 min cache

      // Second call should use cache
      const result2 = await secretsManager.getSecretCached('test/cached/secret', 300)

      expect(result1).toEqual(result2)
      expect(mockSend).toHaveBeenCalledTimes(1) // Only one AWS call
    })
  })

  describe('Secret Management', () => {
    it('should create new secrets successfully', async () => {
      const secretData = {
        api_key: 'new-api-key',
        endpoint: 'https://api.example.com'
      }

      mockSend.mockResolvedValueOnce({
        ARN: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test/new/secret',
        Name: 'test/new/secret',
        VersionId: 'version-123'
      })

      const result = await secretsManager.createSecret('test/new/secret', secretData, 'Test secret')

      expect(result.success).toBe(true)
      expect(result.arn).toContain('test/new/secret')
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Name: 'test/new/secret',
            SecretString: JSON.stringify(secretData),
            Description: 'Test secret'
          })
        })
      )
    })

    it('should update existing secrets', async () => {
      const updatedData = {
        api_key: 'updated-api-key',
        endpoint: 'https://api-v2.example.com'
      }

      mockSend.mockResolvedValueOnce({
        ARN: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test/existing/secret',
        Name: 'test/existing/secret',
        VersionId: 'version-456'
      })

      const result = await secretsManager.updateSecret('test/existing/secret', updatedData)

      expect(result.success).toBe(true)
      expect(result.versionId).toBe('version-456')
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            SecretId: 'test/existing/secret',
            SecretString: JSON.stringify(updatedData)
          })
        })
      )
    })

    it('should validate secret names against AWS naming conventions', async () => {
      const invalidNames = [
        'invalid name with spaces',
        'invalid/name/with/too/many/slashes/that/exceeds/the/limit',
        'invalid-name-with-$pecial-characters',
        '', // empty name
        'a'.repeat(513) // too long
      ]

      for (const name of invalidNames) {
        await expect(secretsManager.createSecret(name, { key: 'value' })).rejects.toThrow('Invalid secret name')
      }
    })

    it('should validate secret values', async () => {
      const invalidValues = [
        null,
        undefined,
        '', // empty string
        'a'.repeat(65537), // too large (64KB limit)
        { circular: {} } // will cause JSON.stringify to fail
      ]

      // Add circular reference
      invalidValues[invalidValues.length - 1].circular.ref = invalidValues[invalidValues.length - 1]

      for (const value of invalidValues) {
        await expect(secretsManager.createSecret('test/invalid/value', value)).rejects.toThrow()
      }
    })
  })

  describe('Secret Rotation', () => {
    it('should rotate secrets successfully', async () => {
      mockSend.mockResolvedValueOnce({
        ARN: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test/rotate/secret',
        Name: 'test/rotate/secret',
        VersionId: 'AWSPENDING'
      })

      const result = await secretsManager.rotateSecret('test/rotate/secret', 'lambda-rotation-function')

      expect(result.success).toBe(true)
      expect(result.rotationId).toBeDefined()
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            SecretId: 'test/rotate/secret',
            RotationLambdaARN: 'lambda-rotation-function'
          })
        })
      )
    })

    it('should check rotation status', async () => {
      mockSend.mockResolvedValueOnce({
        Name: 'test/rotate/secret',
        RotationEnabled: true,
        RotationLambdaARN: 'lambda-rotation-function',
        NextRotationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        VersionIdsToStages: {
          'version-current': ['AWSCURRENT'],
          'version-pending': ['AWSPENDING']
        }
      })

      const result = await secretsManager.getRotationStatus('test/rotate/secret')

      expect(result.rotationEnabled).toBe(true)
      expect(result.nextRotationDate).toBeInstanceOf(Date)
      expect(result.versions).toHaveProperty('AWSCURRENT')
      expect(result.versions).toHaveProperty('AWSPENDING')
    })
  })

  describe('Security and Access Control', () => {
    it('should enforce proper IAM permissions', async () => {
      mockSend.mockRejectedValueOnce({
        name: 'UnauthorizedOperation',
        message: 'User is not authorized to perform: secretsmanager:GetSecretValue'
      })

      await expect(secretsManager.getSecret('test/restricted/secret')).rejects.toThrow('Access denied')
    })

    it('should log all access attempts for auditing', async () => {
      const auditSpy = jest.spyOn(secretsManager, 'auditLog')

      mockSend.mockResolvedValueOnce({
        SecretString: JSON.stringify({ key: 'value' }),
        VersionId: 'version-123'
      })

      await secretsManager.getSecret('test/audit/secret')

      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'GET_SECRET',
          secretName: 'test/audit/secret',
          success: true
        })
      )
    })

    it('should redact sensitive data in logs', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})

      mockSend.mockResolvedValueOnce({
        SecretString: JSON.stringify({
          password: 'super-secret-password',
          api_key: 'very-sensitive-api-key'
        }),
        VersionId: 'version-123'
      })

      await secretsManager.getSecret('test/sensitive/secret')

      const logCalls = consoleSpy.mock.calls.flat().join(' ')
      expect(logCalls).not.toContain('super-secret-password')
      expect(logCalls).not.toContain('very-sensitive-api-key')

      consoleSpy.mockRestore()
    })

    it('should implement secure deletion of secrets', async () => {
      mockSend.mockResolvedValueOnce({
        ARN: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test/delete/secret',
        Name: 'test/delete/secret',
        DeletionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days recovery window
      })

      const result = await secretsManager.deleteSecret('test/delete/secret', 7)

      expect(result.success).toBe(true)
      expect(result.deletionDate).toBeInstanceOf(Date)
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            SecretId: 'test/delete/secret',
            RecoveryWindowInDays: 7,
            ForceDeleteWithoutRecovery: false
          })
        })
      )
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle concurrent secret retrievals efficiently', async () => {
      const secretNames = Array.from({ length: 10 }, (_, i) => `test/concurrent/secret-${i}`)

      mockSend.mockImplementation(() => Promise.resolve({
        SecretString: JSON.stringify({ key: 'value' }),
        VersionId: 'version-123'
      }))

      const startTime = Date.now()
      const promises = secretNames.map(name => secretsManager.getSecret(name))
      const results = await Promise.all(promises)
      const endTime = Date.now()

      expect(results).toHaveLength(10)
      expect(results.every(result => result.key === 'value')).toBe(true)
      expect(endTime - startTime).toBeLessThan(5000) // Should complete within 5 seconds
    })

    it('should implement connection pooling for better performance', async () => {
      const poolSpy = jest.spyOn(secretsManager, 'getConnection')

      mockSend.mockResolvedValue({
        SecretString: JSON.stringify({ key: 'value' }),
        VersionId: 'version-123'
      })

      // Make multiple requests
      await Promise.all([
        secretsManager.getSecret('test/pool/secret-1'),
        secretsManager.getSecret('test/pool/secret-2'),
        secretsManager.getSecret('test/pool/secret-3')
      ])

      // Should reuse connections from pool
      expect(poolSpy).toHaveBeenCalledTimes(1)
    })

    it('should handle rate limiting gracefully', async () => {
      mockSend
        .mockRejectedValueOnce({
          name: 'ThrottlingException',
          message: 'Rate exceeded'
        })
        .mockResolvedValueOnce({
          SecretString: JSON.stringify({ key: 'value' }),
          VersionId: 'version-123'
        })

      const result = await secretsManager.getSecretWithBackoff('test/throttled/secret')

      expect(result).toEqual({ key: 'value' })
      expect(mockSend).toHaveBeenCalledTimes(2)
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle region failover automatically', async () => {
      // Mock primary region failure
      mockSend
        .mockRejectedValueOnce({
          name: 'ServiceUnavailableException',
          message: 'Service unavailable in us-east-1'
        })
        .mockResolvedValueOnce({
          SecretString: JSON.stringify({ key: 'failover-value' }),
          VersionId: 'version-123'
        })

      const result = await secretsManager.getSecretWithFailover('test/failover/secret')

      expect(result).toEqual({ key: 'failover-value' })
      expect(mockSend).toHaveBeenCalledTimes(2)
    })

    it('should provide detailed error information for debugging', async () => {
      mockSend.mockRejectedValueOnce({
        name: 'AccessDeniedException',
        message: 'Access denied to secret test/debug/secret',
        $fault: 'client',
        $metadata: {
          httpStatusCode: 403,
          requestId: 'test-request-id'
        }
      })

      try {
        await secretsManager.getSecret('test/debug/secret')
        fail('Should have thrown an error')
      } catch (error) {
        expect(error.message).toContain('Access denied')
        expect(error.statusCode).toBe(403)
        expect(error.requestId).toBe('test-request-id')
      }
    })
  })
})
