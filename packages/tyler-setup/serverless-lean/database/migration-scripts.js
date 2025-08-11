/**
 * Database Migration Scripts for Tyler Setup GraphQL Backend
 * Handles migration from current REST-based schema to optimized GraphQL single-table design
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, PutCommand, BatchWriteCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Configuration
const MIGRATION_CONFIG = {
  batchSize: 25, // DynamoDB batch write limit
  concurrency: 5, // Number of concurrent operations
  dryRun: process.env.DRY_RUN === 'true',
  preserveOldTables: process.env.PRESERVE_OLD_TABLES === 'true',

  // Table mappings
  oldTables: {
    users: `${process.env.SECRETS_PREFIX}-users`,
    contractors: `${process.env.SECRETS_PREFIX}-contractors`,
    refreshTokens: `${process.env.SECRETS_PREFIX}-refresh-tokens`,
    audit: `${process.env.SECRETS_PREFIX}-audit`,
    config: `${process.env.SECRETS_PREFIX}-config`,
  },

  newTables: {
    entities: `${process.env.SECRETS_PREFIX}-entities`,
    events: `${process.env.SECRETS_PREFIX}-events`,
    cache: `${process.env.SECRETS_PREFIX}-cache`,
    connections: `${process.env.SECRETS_PREFIX}-connections`,
    rateLimits: `${process.env.SECRETS_PREFIX}-rate-limits`,
  },
};

/**
 * Migration State Management
 */
class MigrationState {
  constructor() {
    this.state = {
      currentPhase: 'not_started',
      startTime: null,
      endTime: null,
      recordsProcessed: 0,
      recordsMigrated: 0,
      errors: [],
      phaseDetails: {},
    };
  }

  updatePhase(phase, details = {}) {
    console.log(`Migration phase: ${phase}`);
    this.state.currentPhase = phase;
    this.state.phaseDetails[phase] = {
      startTime: new Date().toISOString(),
      ...details,
    };
  }

  addError(error, context = '') {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      error: error.message,
      context,
      stack: error.stack,
    };
    this.state.errors.push(errorEntry);
    console.error(`Migration error [${context}]:`, error.message);
  }

  incrementCounters(processed = 0, migrated = 0) {
    this.state.recordsProcessed += processed;
    this.state.recordsMigrated += migrated;
  }

  getState() {
    return {
      ...this.state,
      duration: this.state.startTime ?
        Date.now() - new Date(this.state.startTime).getTime() : 0,
    };
  }
}

/**
 * Data Transformation Functions
 */
class DataTransformer {
  static transformUser(user) {
    const baseEntity = {
      PK: `USER#${user.id}`,
      SK: 'METADATA',
      GSI1PK: 'USER',
      GSI1SK: user.createdAt || Date.now(),
      GSI2PK: user.email,
      GSI2SK: user.isActive ? 'ACTIVE' : 'INACTIVE',
      entityType: 'USER',
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.isActive ? 'ACTIVE' : 'INACTIVE',
      createdAt: user.createdAt || Date.now(),
      updatedAt: user.updatedAt || Date.now(),
      version: 1,

      // Extended user fields for GraphQL
      fullName: user.name,
      initials: user.name ? user.name.split(' ').map(n => n[0]).join('') : '',
      lastLogin: user.lastLogin,

      // Profile object
      profile: {
        displayName: user.name,
        preferences: {},
        timezone: 'UTC',
        lastActivity: user.lastLogin || user.createdAt,
      },

      // Security fields (excluding sensitive data)
      createdBy: user.createdBy,
      isActive: user.isActive,
    };

    return [baseEntity];
  }

  static transformContractor(contractor) {
    const baseEntity = {
      PK: `CONTRACTOR#${contractor.id}`,
      SK: 'METADATA',
      GSI1PK: 'CONTRACTOR',
      GSI1SK: contractor.createdAt || Date.now(),
      GSI2PK: contractor.email || `contractor-${contractor.id}`,
      GSI2SK: contractor.expiresAt > Date.now() ? 'ACTIVE' : 'EXPIRED',
      entityType: 'CONTRACTOR',
      id: contractor.id,
      email: contractor.email,
      name: contractor.name,
      status: contractor.expiresAt > Date.now() ? 'ACTIVE' : 'EXPIRED',
      createdAt: contractor.createdAt || Date.now(),
      updatedAt: contractor.updatedAt || Date.now(),
      version: 1,

      // Contractor-specific fields
      token: contractor.token,
      expiresAt: contractor.expiresAt,
      invitedBy: contractor.invitedBy,
      accessLevel: contractor.accessLevel || 'limited',
      permissions: contractor.permissions || [],
    };

    return [baseEntity];
  }

  static transformRefreshToken(token) {
    const baseEntity = {
      PK: `REFRESH_TOKEN#${token.token}`,
      SK: 'METADATA',
      GSI1PK: 'REFRESH_TOKEN',
      GSI1SK: token.expiresAt || Date.now(),
      GSI2PK: `USER#${token.userId}`,
      GSI2SK: token.expiresAt || Date.now(),
      entityType: 'REFRESH_TOKEN',
      id: token.token,
      token: token.token,
      userId: token.userId,
      expiresAt: token.expiresAt,
      createdAt: token.createdAt || Date.now(),
      updatedAt: token.updatedAt || Date.now(),
      version: 1,
      ttl: Math.floor((token.expiresAt || Date.now()) / 1000),
    };

    return [baseEntity];
  }

  static transformAuditLog(audit) {
    const baseEntity = {
      PK: `AUDIT#${audit.id}`,
      SK: 'METADATA',
      GSI1PK: 'AUDIT',
      GSI1SK: audit.timestamp || Date.now(),
      GSI2PK: `USER#${audit.userId}`,
      GSI2SK: audit.timestamp || Date.now(),
      GSI3PK: `AUDIT_BY_USER`,
      GSI3SK: `${audit.userId}#${audit.timestamp}`,
      entityType: 'AUDIT',
      id: audit.id,
      action: audit.action,
      userId: audit.userId,
      targetUserId: audit.targetUserId,
      timestamp: audit.timestamp || Date.now(),
      details: audit.details || {},
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
      createdAt: audit.timestamp || Date.now(),
      version: 1,
    };

    // Create relationship record for user -> audit logs
    const relationshipRecord = {
      PK: `USER#${audit.userId}`,
      SK: `AUDIT#${audit.id}`,
      GSI1PK: 'USER_AUDIT_RELATION',
      GSI1SK: audit.timestamp || Date.now(),
      relationshipType: 'USER_AUDIT',
      targetId: audit.id,
      metadata: {
        action: audit.action,
        timestamp: audit.timestamp,
      },
    };

    return [baseEntity, relationshipRecord];
  }

  static transformConfig(config) {
    const baseEntity = {
      PK: `CONFIG#${config.key}`,
      SK: 'METADATA',
      GSI1PK: 'CONFIG',
      GSI1SK: config.updatedAt || Date.now(),
      entityType: 'CONFIG',
      id: config.key,
      key: config.key,
      value: config.value,
      description: config.description,
      category: config.category || 'general',
      isSecret: config.isSecret || false,
      createdAt: config.createdAt || Date.now(),
      updatedAt: config.updatedAt || Date.now(),
      version: 1,
    };

    return [baseEntity];
  }
}

/**
 * Main Migration Class
 */
class DatabaseMigration {
  constructor() {
    this.state = new MigrationState();
    this.transformer = DataTransformer;
  }

  /**
   * Execute complete migration process
   */
  async execute() {
    try {
      this.state.state.startTime = new Date().toISOString();
      console.log('Starting database migration...');
      console.log(`Dry run: ${MIGRATION_CONFIG.dryRun}`);

      // Phase 1: Pre-migration validation
      await this.validatePreMigration();

      // Phase 2: Create new table structure (handled by Terraform)
      this.state.updatePhase('create_tables');
      console.log('New tables should be created via Terraform before running migration');

      // Phase 3: Migrate data
      await this.migrateAllTables();

      // Phase 4: Validate migration
      await this.validateMigration();

      // Phase 5: Cleanup (optional)
      if (!MIGRATION_CONFIG.preserveOldTables) {
        await this.cleanupOldTables();
      }

      this.state.state.endTime = new Date().toISOString();
      this.state.updatePhase('completed');

      console.log('Migration completed successfully!');
      console.log('Final state:', JSON.stringify(this.state.getState(), null, 2));

    } catch (error) {
      this.state.addError(error, 'main_execution');
      this.state.updatePhase('failed');
      throw error;
    }
  }

  /**
   * Pre-migration validation
   */
  async validatePreMigration() {
    this.state.updatePhase('validation');

    console.log('Validating source tables...');

    for (const [tableName, tableId] of Object.entries(MIGRATION_CONFIG.oldTables)) {
      try {
        const result = await docClient.send(new ScanCommand({
          TableName: tableId,
          Select: 'COUNT',
        }));

        console.log(`✓ ${tableName}: ${result.Count} records`);
      } catch (error) {
        throw new Error(`Failed to validate table ${tableName}: ${error.message}`);
      }
    }

    // Validate new tables exist
    for (const [tableName, tableId] of Object.entries(MIGRATION_CONFIG.newTables)) {
      try {
        await docClient.send(new ScanCommand({
          TableName: tableId,
          Select: 'COUNT',
          Limit: 1,
        }));

        console.log(`✓ Target table ${tableName} is accessible`);
      } catch (error) {
        throw new Error(`Target table ${tableName} not accessible: ${error.message}`);
      }
    }
  }

  /**
   * Migrate all tables
   */
  async migrateAllTables() {
    this.state.updatePhase('data_migration');

    const migrationTasks = [
      { source: 'users', target: 'entities', transformer: 'transformUser' },
      { source: 'contractors', target: 'entities', transformer: 'transformContractor' },
      { source: 'refreshTokens', target: 'entities', transformer: 'transformRefreshToken' },
      { source: 'audit', target: 'entities', transformer: 'transformAuditLog' },
      { source: 'config', target: 'entities', transformer: 'transformConfig' },
    ];

    for (const task of migrationTasks) {
      try {
        console.log(`Migrating ${task.source} to ${task.target}...`);
        await this.migrateTable(task);
      } catch (error) {
        this.state.addError(error, `migrate_${task.source}`);
        throw error;
      }
    }
  }

  /**
   * Migrate single table
   */
  async migrateTable(task) {
    const sourceTable = MIGRATION_CONFIG.oldTables[task.source];
    const targetTable = MIGRATION_CONFIG.newTables[task.target];

    let lastEvaluatedKey = null;
    let totalProcessed = 0;

    do {
      const scanParams = {
        TableName: sourceTable,
        Limit: MIGRATION_CONFIG.batchSize,
      };

      if (lastEvaluatedKey) {
        scanParams.ExclusiveStartKey = lastEvaluatedKey;
      }

      const scanResult = await docClient.send(new ScanCommand(scanParams));

      if (scanResult.Items && scanResult.Items.length > 0) {
        // Transform data
        const transformedItems = [];

        for (const item of scanResult.Items) {
          try {
            const transformed = this.transformer[task.transformer](item);
            transformedItems.push(...transformed);
          } catch (error) {
            this.state.addError(error, `transform_${task.source}_${item.id}`);
            console.warn(`Skipping item due to transformation error: ${item.id}`);
          }
        }

        // Write to target table
        if (transformedItems.length > 0) {
          await this.batchWriteItems(targetTable, transformedItems);
        }

        totalProcessed += scanResult.Items.length;
        this.state.incrementCounters(scanResult.Items.length, transformedItems.length);

        console.log(`Processed ${totalProcessed} items from ${task.source}`);
      }

      lastEvaluatedKey = scanResult.LastEvaluatedKey;

    } while (lastEvaluatedKey);

    console.log(`✓ Completed migration of ${task.source}: ${totalProcessed} items`);
  }

  /**
   * Batch write items to target table
   */
  async batchWriteItems(tableName, items) {
    const chunks = this.chunkArray(items, MIGRATION_CONFIG.batchSize);

    for (const chunk of chunks) {
      if (MIGRATION_CONFIG.dryRun) {
        console.log(`DRY RUN: Would write ${chunk.length} items to ${tableName}`);
        continue;
      }

      const putRequests = chunk.map(item => ({
        PutRequest: { Item: item }
      }));

      const params = {
        RequestItems: {
          [tableName]: putRequests
        }
      };

      try {
        const result = await docClient.send(new BatchWriteCommand(params));

        // Handle unprocessed items
        if (result.UnprocessedItems && Object.keys(result.UnprocessedItems).length > 0) {
          console.warn(`Unprocessed items: ${JSON.stringify(result.UnprocessedItems)}`);
          // Could implement retry logic here
        }
      } catch (error) {
        this.state.addError(error, `batch_write_${tableName}`);
        throw error;
      }
    }
  }

  /**
   * Validate migration results
   */
  async validateMigration() {
    this.state.updatePhase('validation_post');

    console.log('Validating migration results...');

    // Count records in new tables
    for (const [tableName, tableId] of Object.entries(MIGRATION_CONFIG.newTables)) {
      try {
        const result = await docClient.send(new ScanCommand({
          TableName: tableId,
          Select: 'COUNT',
        }));

        console.log(`✓ ${tableName}: ${result.Count} records`);
      } catch (error) {
        this.state.addError(error, `validate_${tableName}`);
      }
    }

    // Spot check data integrity
    await this.validateDataIntegrity();
  }

  /**
   * Validate data integrity with sample checks
   */
  async validateDataIntegrity() {
    console.log('Performing data integrity checks...');

    try {
      // Sample user data check
      const userSample = await docClient.send(new ScanCommand({
        TableName: MIGRATION_CONFIG.newTables.entities,
        FilterExpression: 'entityType = :type',
        ExpressionAttributeValues: { ':type': 'USER' },
        Limit: 10,
      }));

      for (const user of userSample.Items || []) {
        if (!user.PK || !user.SK || !user.email || !user.entityType) {
          throw new Error(`Invalid user record: ${JSON.stringify(user)}`);
        }
      }

      console.log(`✓ User data integrity check passed (${userSample.Items?.length} samples)`);

      // Sample audit data check
      const auditSample = await docClient.send(new ScanCommand({
        TableName: MIGRATION_CONFIG.newTables.entities,
        FilterExpression: 'entityType = :type',
        ExpressionAttributeValues: { ':type': 'AUDIT' },
        Limit: 10,
      }));

      for (const audit of auditSample.Items || []) {
        if (!audit.PK || !audit.SK || !audit.action || !audit.userId) {
          throw new Error(`Invalid audit record: ${JSON.stringify(audit)}`);
        }
      }

      console.log(`✓ Audit data integrity check passed (${auditSample.Items?.length} samples)`);

    } catch (error) {
      this.state.addError(error, 'data_integrity_check');
      throw error;
    }
  }

  /**
   * Cleanup old tables (optional)
   */
  async cleanupOldTables() {
    this.state.updatePhase('cleanup');

    if (MIGRATION_CONFIG.dryRun) {
      console.log('DRY RUN: Would cleanup old tables');
      return;
    }

    console.log('WARNING: Cleanup of old tables should be done manually after validation');
    console.log('Old tables to cleanup:', Object.values(MIGRATION_CONFIG.oldTables));
  }

  /**
   * Utility: Chunk array into smaller arrays
   */
  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Rollback migration (emergency procedure)
   */
  async rollback() {
    this.state.updatePhase('rollback');

    console.log('WARNING: Starting migration rollback...');

    if (MIGRATION_CONFIG.dryRun) {
      console.log('DRY RUN: Would rollback migration');
      return;
    }

    // Clear new tables
    for (const [tableName, tableId] of Object.entries(MIGRATION_CONFIG.newTables)) {
      console.log(`Clearing table: ${tableName}`);
      await this.clearTable(tableId);
    }

    console.log('Rollback completed');
  }

  /**
   * Clear table (for rollback)
   */
  async clearTable(tableName) {
    let lastEvaluatedKey = null;

    do {
      const scanParams = {
        TableName: tableName,
        ProjectionExpression: 'PK, SK',
        Limit: MIGRATION_CONFIG.batchSize,
      };

      if (lastEvaluatedKey) {
        scanParams.ExclusiveStartKey = lastEvaluatedKey;
      }

      const scanResult = await docClient.send(new ScanCommand(scanParams));

      if (scanResult.Items && scanResult.Items.length > 0) {
        const deleteRequests = scanResult.Items.map(item => ({
          DeleteRequest: { Key: { PK: item.PK, SK: item.SK } }
        }));

        const params = {
          RequestItems: {
            [tableName]: deleteRequests
          }
        };

        await docClient.send(new BatchWriteCommand(params));
      }

      lastEvaluatedKey = scanResult.LastEvaluatedKey;

    } while (lastEvaluatedKey);
  }
}

/**
 * CLI Interface
 */
async function main() {
  const command = process.argv[2];
  const migration = new DatabaseMigration();

  try {
    switch (command) {
      case 'migrate':
        await migration.execute();
        break;

      case 'validate':
        await migration.validatePreMigration();
        console.log('Pre-migration validation completed');
        break;

      case 'rollback':
        await migration.rollback();
        break;

      case 'dry-run':
        process.env.DRY_RUN = 'true';
        await migration.execute();
        break;

      default:
        console.log(`
Usage: node migration-scripts.js <command>

Commands:
  migrate     - Execute full migration
  validate    - Run pre-migration validation only
  rollback    - Rollback migration (emergency use)
  dry-run     - Run migration in dry-run mode

Environment Variables:
  DRY_RUN=true              - Don't actually write data
  PRESERVE_OLD_TABLES=true  - Keep old tables after migration
  SECRETS_PREFIX            - Table name prefix
  AWS_REGION               - AWS region
        `);
        process.exit(1);
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { DatabaseMigration, DataTransformer, MIGRATION_CONFIG };
