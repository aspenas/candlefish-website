#!/usr/bin/env node
/**
 * AWS Secrets Manager Migration Script
 * Migrates all hardcoded secrets to AWS Secrets Manager with KMS encryption
 */

import * as AWS from 'aws-sdk';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { promisify } from 'util';

const secretsManager = new AWS.SecretsManager({ region: 'us-east-1' });
const kms = new AWS.KMS({ region: 'us-east-1' });

interface SecretConfig {
  name: string;
  value: string;
  description: string;
  tags: { Key: string; Value: string }[];
  rotationRules?: {
    automaticallyAfterDays: number;
  };
  kmsKeyId?: string;
}

interface MigrationResult {
  secretArn: string;
  secretName: string;
  versionId: string;
  migrationTime: string;
}

class SecretsManagerMigration {
  private readonly kmsKeyAlias = 'alias/candlefish-secrets';
  private readonly migrationLog: MigrationResult[] = [];
  private kmsKeyId: string | undefined;

  async initialize(): Promise<void> {
    console.log('🔐 Initializing AWS Secrets Manager Migration...');

    // Create or get KMS key for encryption
    try {
      const keyResponse = await kms.describeKey({
        KeyId: this.kmsKeyAlias
      }).promise();

      this.kmsKeyId = keyResponse.KeyMetadata?.KeyId;
      console.log(`✅ Using existing KMS key: ${this.kmsKeyId}`);
    } catch (error) {
      // Create new KMS key if doesn't exist
      console.log('Creating new KMS key for secrets encryption...');
      const newKey = await kms.createKey({
        Description: 'Candlefish Secrets Encryption Key',
        KeyUsage: 'ENCRYPT_DECRYPT',
        Origin: 'AWS_KMS',
        Tags: [
          { TagKey: 'Environment', TagValue: 'production' },
          { TagKey: 'Service', TagValue: 'candlefish' },
          { TagKey: 'Purpose', TagValue: 'secrets-encryption' }
        ]
      }).promise();

      this.kmsKeyId = newKey.KeyMetadata?.KeyId;

      // Create alias
      await kms.createAlias({
        AliasName: this.kmsKeyAlias,
        TargetKeyId: this.kmsKeyId!
      }).promise();

      console.log(`✅ Created new KMS key: ${this.kmsKeyId}`);
    }

    // Enable automatic key rotation
    await kms.enableKeyRotation({
      KeyId: this.kmsKeyId!
    }).promise();

    console.log('✅ KMS key rotation enabled');
  }

  async migrateSecret(config: SecretConfig): Promise<MigrationResult> {
    const secretName = `candlefish/${config.name}`;

    try {
      // Check if secret already exists
      const existing = await secretsManager.getSecretValue({
        SecretId: secretName
      }).promise().catch(() => null);

      if (existing) {
        console.log(`⚠️  Secret already exists: ${secretName}, updating...`);

        // Update existing secret
        const response = await secretsManager.updateSecret({
          SecretId: secretName,
          SecretString: config.value,
          Description: config.description,
          KmsKeyId: config.kmsKeyId || this.kmsKeyId
        }).promise();

        return {
          secretArn: response.ARN!,
          secretName: response.Name!,
          versionId: response.VersionId!,
          migrationTime: new Date().toISOString()
        };
      }

      // Create new secret
      const response = await secretsManager.createSecret({
        Name: secretName,
        Description: config.description,
        SecretString: config.value,
        KmsKeyId: config.kmsKeyId || this.kmsKeyId,
        Tags: [
          ...config.tags,
          { Key: 'MigratedAt', Value: new Date().toISOString() },
          { Key: 'MigratedBy', Value: 'security-remediation' }
        ]
      }).promise();

      // Configure rotation if specified
      if (config.rotationRules) {
        await this.configureRotation(secretName, config.rotationRules);
      }

      console.log(`✅ Migrated secret: ${secretName}`);

      return {
        secretArn: response.ARN!,
        secretName: response.Name!,
        versionId: response.VersionId!,
        migrationTime: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ Failed to migrate secret ${secretName}:`, error);
      throw error;
    }
  }

  async configureRotation(secretId: string, rules: { automaticallyAfterDays: number }): Promise<void> {
    try {
      await secretsManager.rotateSecret({
        SecretId: secretId,
        RotationRules: {
          AutomaticallyAfterDays: rules.automaticallyAfterDays
        },
        RotationLambdaARN: `arn:aws:lambda:us-east-1:681214184463:function:SecretsManagerRotation-${secretId.replace(/[^a-zA-Z0-9]/g, '-')}`
      }).promise();

      console.log(`✅ Configured rotation for ${secretId} (every ${rules.automaticallyAfterDays} days)`);
    } catch (error) {
      console.warn(`⚠️  Could not configure automatic rotation for ${secretId}:`, error);
    }
  }

  async migrateEnvironmentFile(filePath: string): Promise<void> {
    console.log(`\n📄 Processing environment file: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const secrets: SecretConfig[] = [];

    for (const line of lines) {
      if (line.startsWith('#') || !line.includes('=')) continue;

      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=').replace(/^["']|["']$/g, '').trim();

      if (!key || !value || value === 'undefined' || value === 'null') continue;

      // Determine secret type and rotation policy
      let rotationDays = 90; // Default rotation
      let description = `Migrated from ${path.basename(filePath)}`;

      if (key.includes('DATABASE') || key.includes('DB_')) {
        rotationDays = 30;
        description = 'Database credentials';
      } else if (key.includes('JWT') || key.includes('TOKEN')) {
        rotationDays = 7;
        description = 'Authentication token';
      } else if (key.includes('API_KEY')) {
        rotationDays = 60;
        description = 'External API key';
      }

      secrets.push({
        name: key.toLowerCase().replace(/_/g, '-'),
        value: value,
        description: description,
        tags: [
          { Key: 'Environment', Value: this.getEnvironmentFromPath(filePath) },
          { Key: 'OriginalFile', Value: path.basename(filePath) },
          { Key: 'Service', Value: this.getServiceFromPath(filePath) }
        ],
        rotationRules: {
          automaticallyAfterDays: rotationDays
        }
      });
    }

    // Migrate all secrets from this file
    for (const secret of secrets) {
      try {
        const result = await this.migrateSecret(secret);
        this.migrationLog.push(result);
      } catch (error) {
        console.error(`Failed to migrate ${secret.name}:`, error);
      }
    }

    // Create SDK access code for this file
    await this.generateSDKAccessCode(filePath, secrets);

    // Backup and remove original file
    await this.backupAndRemoveFile(filePath);
  }

  private getEnvironmentFromPath(filePath: string): string {
    if (filePath.includes('.production') || filePath.includes('prod')) return 'production';
    if (filePath.includes('.staging') || filePath.includes('stage')) return 'staging';
    if (filePath.includes('.development') || filePath.includes('dev')) return 'development';
    return 'unknown';
  }

  private getServiceFromPath(filePath: string): string {
    const pathParts = filePath.split('/');

    // Try to identify service from path
    if (filePath.includes('nanda')) return 'nanda';
    if (filePath.includes('paintbox')) return 'paintbox';
    if (filePath.includes('api')) return 'api';
    if (filePath.includes('website')) return 'website';

    // Use parent directory name
    const parentDir = pathParts[pathParts.length - 2];
    return parentDir || 'unknown';
  }

  async generateSDKAccessCode(originalPath: string, secrets: SecretConfig[]): Promise<void> {
    const sdkCodePath = originalPath.replace(/\.env.*$/, '.secrets.ts');

    const sdkCode = `/**
 * AWS Secrets Manager Access
 * Generated from: ${path.basename(originalPath)}
 * Migration date: ${new Date().toISOString()}
 *
 * This file replaces the original .env file with secure AWS Secrets Manager access
 */

import * as AWS from 'aws-sdk';

const secretsManager = new AWS.SecretsManager({
  region: process.env.AWS_REGION || 'us-east-1'
});

// Cache for secrets to avoid repeated API calls
const secretsCache = new Map<string, { value: string; expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get secret value from AWS Secrets Manager
 */
async function getSecret(secretName: string): Promise<string> {
  const cacheKey = \`candlefish/\${secretName}\`;

  // Check cache
  const cached = secretsCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.value;
  }

  try {
    const response = await secretsManager.getSecretValue({
      SecretId: cacheKey
    }).promise();

    const value = response.SecretString || '';

    // Update cache
    secretsCache.set(cacheKey, {
      value,
      expiry: Date.now() + CACHE_TTL
    });

    return value;
  } catch (error) {
    console.error(\`Failed to retrieve secret \${cacheKey}:\`, error);
    throw new Error(\`Secret retrieval failed: \${secretName}\`);
  }
}

/**
 * Environment configuration loaded from AWS Secrets Manager
 */
export class SecureConfig {
${secrets.map(s => `  static async get${s.name.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('')}(): Promise<string> {
    return getSecret('${s.name}');
  }`).join('\n\n')}

  /**
   * Load all secrets and populate process.env (for legacy compatibility)
   */
  static async loadToEnv(): Promise<void> {
    const secrets = [
${secrets.map(s => `      { env: '${s.name.toUpperCase().replace(/-/g, '_')}', secret: '${s.name}' }`).join(',\n')}
    ];

    await Promise.all(
      secrets.map(async ({ env, secret }) => {
        process.env[env] = await getSecret(secret);
      })
    );
  }

  /**
   * Get all secrets as an object
   */
  static async getAll(): Promise<Record<string, string>> {
    const result: Record<string, string> = {};

${secrets.map(s => `    result['${s.name.toUpperCase().replace(/-/g, '_')}'] = await this.get${s.name.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('')}();`).join('\n')}

    return result;
  }
}

// Auto-initialize for backward compatibility
if (process.env.NODE_ENV !== 'test') {
  SecureConfig.loadToEnv().catch(console.error);
}
`;

    fs.writeFileSync(sdkCodePath, sdkCode);
    console.log(`✅ Generated SDK access code: ${sdkCodePath}`);
  }

  async backupAndRemoveFile(filePath: string): Promise<void> {
    const backupDir = '/tmp/candlefish-env-backup';
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const backupPath = path.join(backupDir, `${path.basename(filePath)}.${Date.now()}.backup`);
    fs.copyFileSync(filePath, backupPath);

    // Remove from git
    try {
      const { execSync } = require('child_process');
      execSync(`git rm --cached "${filePath}"`, { stdio: 'ignore' });
    } catch (e) {
      // File might not be in git
    }

    // Delete file
    fs.unlinkSync(filePath);

    console.log(`✅ Backed up and removed: ${filePath}`);
    console.log(`   Backup location: ${backupPath}`);
  }

  async generateMigrationReport(): Promise<void> {
    const reportPath = '/tmp/secrets-migration-report.json';

    const report = {
      migrationDate: new Date().toISOString(),
      kmsKeyId: this.kmsKeyId,
      totalSecretsMigrated: this.migrationLog.length,
      secrets: this.migrationLog,
      nextSteps: [
        'Update all application code to use SecureConfig class',
        'Deploy updated applications',
        'Verify all services can access secrets',
        'Monitor CloudWatch for access errors',
        'Delete backup files after verification'
      ]
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📊 Migration report generated: ${reportPath}`);
  }

  async migrateAllEnvironmentFiles(): Promise<void> {
    const envFiles = [
      '/Users/patricksmith/candlefish-ai/brand/website/.env.production',
      '/Users/patricksmith/candlefish-ai/projects/paintbox/nanda-deployment/.env',
      '/Users/patricksmith/candlefish-ai/apps/nanda-dashboard/.env.local',
      '/Users/patricksmith/candlefish-ai/services/api/.env',
      '/Users/patricksmith/candlefish-ai/deployment/.env.production'
    ];

    for (const file of envFiles) {
      await this.migrateEnvironmentFile(file);
    }
  }
}

// Execute migration
async function main() {
  console.log('🚀 Starting AWS Secrets Manager Migration');
  console.log('=========================================\n');

  const migration = new SecretsManagerMigration();

  try {
    await migration.initialize();
    await migration.migrateAllEnvironmentFiles();
    await migration.generateMigrationReport();

    console.log('\n✅ Migration completed successfully!');
    console.log('Next steps:');
    console.log('1. Update application code to use SecureConfig class');
    console.log('2. Deploy updated applications');
    console.log('3. Verify secret access in CloudWatch');
    console.log('4. Delete backup files from /tmp/candlefish-env-backup');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { SecretsManagerMigration, SecretConfig, MigrationResult };
