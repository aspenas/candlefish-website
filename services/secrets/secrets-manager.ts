/**
 * Generic Secrets Manager for AWS Secrets Manager integration
 * Used across all Candlefish services
 */

import { SecretsManagerClient, GetSecretValueCommand, CreateSecretCommand, UpdateSecretCommand } from '@aws-sdk/client-secrets-manager';

export class SecretsManager {
  private client: SecretsManagerClient;
  private cache: Map<string, { value: string; expiresAt: number }> = new Map();
  private cacheTTL: number = 5 * 60 * 1000; // 5 minutes

  constructor(region?: string) {
    this.client = new SecretsManagerClient({ 
      region: region || process.env.AWS_REGION || 'us-east-1' 
    });
  }

  /**
   * Get secret value from AWS Secrets Manager with caching
   */
  async getSecret(secretId: string, useCache: boolean = true): Promise<string> {
    // Check cache first
    if (useCache) {
      const cached = this.cache.get(secretId);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.value;
      }
    }

    try {
      const command = new GetSecretValueCommand({ SecretId: secretId });
      const response = await this.client.send(command);
      
      if (!response.SecretString) {
        throw new Error(`Secret ${secretId} has no string value`);
      }

      // Cache the result
      if (useCache) {
        this.cache.set(secretId, {
          value: response.SecretString,
          expiresAt: Date.now() + this.cacheTTL,
        });
      }

      return response.SecretString;
    } catch (error: any) {
      console.error(`Failed to retrieve secret ${secretId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get and parse JSON secret
   */
  async getJSONSecret(secretId: string, useCache: boolean = true): Promise<any> {
    const secretString = await this.getSecret(secretId, useCache);
    try {
      return JSON.parse(secretString);
    } catch (error) {
      throw new Error(`Secret ${secretId} is not valid JSON`);
    }
  }

  /**
   * Create a new secret
   */
  async createSecret(
    name: string, 
    value: string | object, 
    description?: string, 
    tags?: { Key: string; Value: string }[]
  ): Promise<void> {
    const secretString = typeof value === 'string' ? value : JSON.stringify(value);
    
    const command = new CreateSecretCommand({
      Name: name,
      Description: description,
      SecretString: secretString,
      Tags: tags,
    });

    try {
      await this.client.send(command);
      console.log(`✅ Secret ${name} created successfully`);
    } catch (error: any) {
      if (error.name === 'ResourceExistsException') {
        console.log(`Secret ${name} already exists, skipping creation`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Update an existing secret
   */
  async updateSecret(secretId: string, value: string | object): Promise<void> {
    const secretString = typeof value === 'string' ? value : JSON.stringify(value);
    
    const command = new UpdateSecretCommand({
      SecretId: secretId,
      SecretString: secretString,
    });

    await this.client.send(command);
    
    // Clear cache for this secret
    this.cache.delete(secretId);
    
    console.log(`✅ Secret ${secretId} updated successfully`);
  }

  /**
   * Clear cache for specific secret or all secrets
   */
  clearCache(secretId?: string): void {
    if (secretId) {
      this.cache.delete(secretId);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Health check - verify connection to AWS Secrets Manager
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try to list secrets (limited permissions)
      await this.client.send(new GetSecretValueCommand({ 
        SecretId: 'candlefish/health-check-secret' 
      }));
      return true;
    } catch (error: any) {
      // Expected failure for non-existent secret means connection works
      if (error.name === 'ResourceNotFoundException') {
        return true;
      }
      return false;
    }
  }
}

// Singleton instance
let secretsManager: SecretsManager | null = null;

export function getSecretsManager(): SecretsManager {
  if (!secretsManager) {
    secretsManager = new SecretsManager();
  }
  return secretsManager;
}