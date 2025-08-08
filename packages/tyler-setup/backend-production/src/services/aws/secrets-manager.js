import { SecretsManagerClient, GetSecretValueCommand, CreateSecretCommand, UpdateSecretCommand, DeleteSecretCommand, ListSecretsCommand, RotateSecretCommand } from '@aws-sdk/client-secrets-manager';
import { KMSClient, EncryptCommand, DecryptCommand } from '@aws-sdk/client-kms';
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { logger } from '../../utils/logger.js';
import { cache } from '../../cache/manager.js';
import crypto from 'crypto';

// Initialize AWS clients
const secretsClient = new SecretsManagerClient({
  region: process.env.AWS_REGION || 'us-east-1',
  maxAttempts: 3,
  retryMode: 'adaptive',
});

const kmsClient = new KMSClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const cloudWatchClient = new CloudWatchClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

const stsClient = new STSClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

// KMS key for additional encryption
const KMS_KEY_ID = process.env.AWS_KMS_KEY_ID;

class SecretsManagerService {
  constructor() {
    this.secretCache = new Map();
    this.cacheTimeout = 300000; // 5 minutes
    this.rotationSchedule = new Map();
    this.auditLog = [];
    this.initialized = false;
  }

  async initialize() {
    try {
      // Verify AWS credentials
      const identity = await stsClient.send(new GetCallerIdentityCommand({}));
      logger.info(`AWS Secrets Manager initialized for account: ${identity.Account}`);

      // Set up automatic rotation schedules
      await this.setupRotationSchedules();

      // Warm up cache with frequently used secrets
      await this.warmCache();

      this.initialized = true;
      return true;
    } catch (error) {
      logger.error('Failed to initialize Secrets Manager:', error);
      throw new Error('AWS Secrets Manager initialization failed');
    }
  }

  /**
   * Get a secret value with caching and audit logging
   */
  async getSecret(secretName, options = {}) {
    const startTime = Date.now();

    try {
      // Check cache first
      if (!options.bypassCache && this.secretCache.has(secretName)) {
        const cached = this.secretCache.get(secretName);
        if (cached.expires > Date.now()) {
          await this.logAccess(secretName, 'GET', 'CACHED', startTime);
          return options.maskValue ? this.maskSecretValue(cached.value) : cached.value;
        }
      }

      // Fetch from AWS Secrets Manager
      const command = new GetSecretValueCommand({ SecretId: secretName });
      const response = await secretsClient.send(command);

      let secretValue;
      if (response.SecretString) {
        try {
          secretValue = JSON.parse(response.SecretString);
        } catch {
          secretValue = response.SecretString;
        }
      } else if (response.SecretBinary) {
        // Decrypt binary secrets with KMS
        secretValue = await this.decryptBinary(response.SecretBinary);
      }

      // Apply field-level encryption if configured
      if (options.encryptFields && Array.isArray(options.encryptFields)) {
        secretValue = await this.applyFieldEncryption(secretValue, options.encryptFields);
      }

      // Cache the secret
      this.secretCache.set(secretName, {
        value: secretValue,
        expires: Date.now() + this.cacheTimeout,
        version: response.VersionId,
      });

      // Log access for audit
      await this.logAccess(secretName, 'GET', 'SUCCESS', startTime);

      // Send metrics to CloudWatch
      await this.sendMetric('SecretAccess', 1, 'Count', { SecretName: secretName });

      return options.maskValue ? this.maskSecretValue(secretValue) : secretValue;
    } catch (error) {
      await this.logAccess(secretName, 'GET', 'FAILED', startTime, error.message);
      logger.error(`Failed to get secret ${secretName}:`, error);
      throw new Error(`Unable to retrieve secret: ${secretName}`);
    }
  }

  /**
   * Create a new secret with encryption
   */
  async createSecret(secretName, secretValue, options = {}) {
    const startTime = Date.now();

    try {
      // Validate secret name format
      if (!this.isValidSecretName(secretName)) {
        throw new Error('Invalid secret name format');
      }

      // Encrypt sensitive fields if specified
      let processedValue = secretValue;
      if (options.encryptFields && Array.isArray(options.encryptFields)) {
        processedValue = await this.encryptFields(secretValue, options.encryptFields);
      }

      // Convert to string if object
      const secretString = typeof processedValue === 'object'
        ? JSON.stringify(processedValue)
        : processedValue;

      // Create secret in AWS
      const command = new CreateSecretCommand({
        Name: secretName,
        SecretString: secretString,
        Description: options.description || `Created by Candlefish Employee Setup on ${new Date().toISOString()}`,
        KmsKeyId: KMS_KEY_ID,
        Tags: [
          { Key: 'Environment', Value: process.env.NODE_ENV || 'production' },
          { Key: 'Application', Value: 'candlefish-employee-setup' },
          { Key: 'CreatedBy', Value: options.userId || 'system' },
          ...(options.tags || []),
        ],
      });

      const response = await secretsClient.send(command);

      // Set up rotation if requested
      if (options.enableRotation) {
        await this.enableRotation(secretName, options.rotationDays || 30);
      }

      // Log creation for audit
      await this.logAccess(secretName, 'CREATE', 'SUCCESS', startTime);

      // Send metrics
      await this.sendMetric('SecretCreated', 1, 'Count', { SecretName: secretName });

      return {
        success: true,
        secretArn: response.ARN,
        versionId: response.VersionId,
        name: response.Name,
      };
    } catch (error) {
      await this.logAccess(secretName, 'CREATE', 'FAILED', startTime, error.message);
      logger.error(`Failed to create secret ${secretName}:`, error);
      throw new Error(`Unable to create secret: ${error.message}`);
    }
  }

  /**
   * Update an existing secret
   */
  async updateSecret(secretName, secretValue, options = {}) {
    const startTime = Date.now();

    try {
      // Encrypt sensitive fields if specified
      let processedValue = secretValue;
      if (options.encryptFields && Array.isArray(options.encryptFields)) {
        processedValue = await this.encryptFields(secretValue, options.encryptFields);
      }

      const secretString = typeof processedValue === 'object'
        ? JSON.stringify(processedValue)
        : processedValue;

      const command = new UpdateSecretCommand({
        SecretId: secretName,
        SecretString: secretString,
      });

      const response = await secretsClient.send(command);

      // Invalidate cache
      this.secretCache.delete(secretName);

      // Log update for audit
      await this.logAccess(secretName, 'UPDATE', 'SUCCESS', startTime);

      // Send metrics
      await this.sendMetric('SecretUpdated', 1, 'Count', { SecretName: secretName });

      return {
        success: true,
        secretArn: response.ARN,
        versionId: response.VersionId,
      };
    } catch (error) {
      await this.logAccess(secretName, 'UPDATE', 'FAILED', startTime, error.message);
      logger.error(`Failed to update secret ${secretName}:`, error);
      throw new Error(`Unable to update secret: ${error.message}`);
    }
  }

  /**
   * Delete a secret (with recovery window)
   */
  async deleteSecret(secretName, options = {}) {
    const startTime = Date.now();

    try {
      const command = new DeleteSecretCommand({
        SecretId: secretName,
        RecoveryWindowInDays: options.recoveryDays || 30,
        ForceDeleteWithoutRecovery: options.forceDelete || false,
      });

      const response = await secretsClient.send(command);

      // Remove from cache
      this.secretCache.delete(secretName);

      // Log deletion for audit
      await this.logAccess(secretName, 'DELETE', 'SUCCESS', startTime);

      // Send metrics
      await this.sendMetric('SecretDeleted', 1, 'Count', { SecretName: secretName });

      return {
        success: true,
        secretArn: response.ARN,
        deletionDate: response.DeletionDate,
      };
    } catch (error) {
      await this.logAccess(secretName, 'DELETE', 'FAILED', startTime, error.message);
      logger.error(`Failed to delete secret ${secretName}:`, error);
      throw new Error(`Unable to delete secret: ${error.message}`);
    }
  }

  /**
   * List all secrets with pagination
   */
  async listSecrets(options = {}) {
    try {
      const command = new ListSecretsCommand({
        MaxResults: options.limit || 100,
        NextToken: options.nextToken,
        Filters: options.filters,
      });

      const response = await secretsClient.send(command);

      // Map and mask sensitive information
      const secrets = response.SecretList.map(secret => ({
        name: secret.Name,
        description: secret.Description,
        lastChanged: secret.LastChangedDate,
        lastAccessed: secret.LastAccessedDate,
        tags: secret.Tags,
        rotationEnabled: secret.RotationEnabled,
        rotationLambdaArn: secret.RotationLambdaARN,
      }));

      return {
        secrets,
        nextToken: response.NextToken,
        total: secrets.length,
      };
    } catch (error) {
      logger.error('Failed to list secrets:', error);
      throw new Error('Unable to list secrets');
    }
  }

  /**
   * Rotate a secret manually
   */
  async rotateSecret(secretName, options = {}) {
    const startTime = Date.now();

    try {
      const command = new RotateSecretCommand({
        SecretId: secretName,
        ClientRequestToken: options.token || crypto.randomUUID(),
        RotationLambdaARN: options.lambdaArn || process.env.ROTATION_LAMBDA_ARN,
      });

      const response = await secretsClient.send(command);

      // Invalidate cache
      this.secretCache.delete(secretName);

      // Log rotation for audit
      await this.logAccess(secretName, 'ROTATE', 'SUCCESS', startTime);

      // Send metrics
      await this.sendMetric('SecretRotated', 1, 'Count', { SecretName: secretName });

      return {
        success: true,
        secretArn: response.ARN,
        versionId: response.VersionId,
      };
    } catch (error) {
      await this.logAccess(secretName, 'ROTATE', 'FAILED', startTime, error.message);
      logger.error(`Failed to rotate secret ${secretName}:`, error);
      throw new Error(`Unable to rotate secret: ${error.message}`);
    }
  }

  /**
   * Enable automatic rotation for a secret
   */
  async enableRotation(secretName, rotationDays = 30) {
    try {
      // Schedule rotation
      this.rotationSchedule.set(secretName, {
        interval: rotationDays * 24 * 60 * 60 * 1000,
        lastRotation: Date.now(),
        nextRotation: Date.now() + (rotationDays * 24 * 60 * 60 * 1000),
      });

      logger.info(`Rotation enabled for ${secretName} every ${rotationDays} days`);
      return true;
    } catch (error) {
      logger.error(`Failed to enable rotation for ${secretName}:`, error);
      return false;
    }
  }

  /**
   * Encrypt specific fields using KMS
   */
  async encryptFields(data, fields) {
    const encrypted = { ...data };

    for (const field of fields) {
      if (data[field]) {
        const command = new EncryptCommand({
          KeyId: KMS_KEY_ID,
          Plaintext: Buffer.from(JSON.stringify(data[field])),
        });

        const response = await kmsClient.send(command);
        encrypted[field] = Buffer.from(response.CiphertextBlob).toString('base64');
      }
    }

    return encrypted;
  }

  /**
   * Apply field-level encryption for retrieval
   */
  async applyFieldEncryption(data, fields) {
    const decrypted = { ...data };

    for (const field of fields) {
      if (data[field] && typeof data[field] === 'string') {
        try {
          const command = new DecryptCommand({
            CiphertextBlob: Buffer.from(data[field], 'base64'),
          });

          const response = await kmsClient.send(command);
          decrypted[field] = JSON.parse(Buffer.from(response.Plaintext).toString());
        } catch (error) {
          logger.warn(`Failed to decrypt field ${field}, using original value`);
        }
      }
    }

    return decrypted;
  }

  /**
   * Mask secret values for display
   */
  maskSecretValue(value) {
    if (typeof value === 'string') {
      return value.length > 8
        ? value.substring(0, 4) + '****' + value.substring(value.length - 4)
        : '********';
    }

    if (typeof value === 'object') {
      const masked = {};
      for (const [key, val] of Object.entries(value)) {
        masked[key] = this.maskSecretValue(val);
      }
      return masked;
    }

    return '********';
  }

  /**
   * Validate secret name format
   */
  isValidSecretName(name) {
    const pattern = /^[a-zA-Z0-9/_+=.@-]+$/;
    return pattern.test(name) && name.length <= 512;
  }

  /**
   * Log access for audit trail
   */
  async logAccess(secretName, action, status, startTime, errorMessage = null) {
    const entry = {
      timestamp: new Date().toISOString(),
      secretName,
      action,
      status,
      duration: Date.now() - startTime,
      userId: global.currentUser?.id || 'system',
      ip: global.currentRequest?.ip || 'internal',
      errorMessage,
    };

    this.auditLog.push(entry);

    // Send to CloudWatch Logs
    logger.info('Secret access audit:', entry);

    // Store in database for compliance
    try {
      await this.storeAuditLog(entry);
    } catch (error) {
      logger.error('Failed to store audit log:', error);
    }
  }

  /**
   * Store audit log in database
   */
  async storeAuditLog(entry) {
    // Implementation depends on database schema
    // This would typically insert into an audit_logs table
  }

  /**
   * Send metrics to CloudWatch
   */
  async sendMetric(metricName, value, unit, dimensions = {}) {
    try {
      const command = new PutMetricDataCommand({
        Namespace: 'Candlefish/EmployeeSetup',
        MetricData: [
          {
            MetricName: metricName,
            Value: value,
            Unit: unit,
            Timestamp: new Date(),
            Dimensions: Object.entries(dimensions).map(([Name, Value]) => ({ Name, Value })),
          },
        ],
      });

      await cloudWatchClient.send(command);
    } catch (error) {
      logger.warn(`Failed to send metric ${metricName}:`, error);
    }
  }

  /**
   * Setup automatic rotation schedules
   */
  async setupRotationSchedules() {
    // Set up periodic check for rotation
    setInterval(() => {
      for (const [secretName, schedule] of this.rotationSchedule.entries()) {
        if (Date.now() >= schedule.nextRotation) {
          this.rotateSecret(secretName)
            .then(() => {
              schedule.lastRotation = Date.now();
              schedule.nextRotation = Date.now() + schedule.interval;
            })
            .catch(error => {
              logger.error(`Automatic rotation failed for ${secretName}:`, error);
            });
        }
      }
    }, 60000); // Check every minute
  }

  /**
   * Warm cache with frequently used secrets
   */
  async warmCache() {
    const frequentSecrets = [
      'database/credentials',
      'jwt/secret',
      'api/keys',
      'claude/api-key',
    ];

    for (const secretName of frequentSecrets) {
      try {
        await this.getSecret(secretName, { bypassCache: true });
      } catch (error) {
        logger.warn(`Failed to warm cache for ${secretName}:`, error.message);
      }
    }
  }

  /**
   * Get audit logs for a specific secret
   */
  getAuditLogs(secretName, options = {}) {
    let logs = this.auditLog.filter(log => log.secretName === secretName);

    if (options.startDate) {
      logs = logs.filter(log => new Date(log.timestamp) >= new Date(options.startDate));
    }

    if (options.endDate) {
      logs = logs.filter(log => new Date(log.timestamp) <= new Date(options.endDate));
    }

    if (options.action) {
      logs = logs.filter(log => log.action === options.action);
    }

    return logs;
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this.secretCache.entries()) {
      if (value.expires <= now) {
        this.secretCache.delete(key);
      }
    }
  }
}

// Export singleton instance
export const secretsManager = new SecretsManagerService();

// Export class for testing
export { SecretsManagerService };
