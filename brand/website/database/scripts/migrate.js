#!/usr/bin/env node

/**
 * Database Migration Script for Candlefish Website
 * Handles database schema migrations with proper error handling and rollback
 */

const fs = require('fs').promises;
const path = require('path');
const { Client } = require('pg');

class DatabaseMigrator {
  constructor(config = {}) {
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'candlefish_production',
      user: process.env.DB_USER || 'candlefish_app',
      password: process.env.DB_PASSWORD,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      ...config
    };
    
    this.client = null;
    this.migrationsDir = path.join(__dirname, '..', 'migrations');
    this.rollbacksDir = path.join(__dirname, '..', 'rollbacks');
  }

  /**
   * Initialize database connection
   */
  async connect() {
    this.client = new Client(this.config);
    
    try {
      await this.client.connect();
      console.log(`✅ Connected to database: ${this.config.database}`);
    } catch (error) {
      console.error('❌ Failed to connect to database:', error.message);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  async disconnect() {
    if (this.client) {
      await this.client.end();
      console.log('🔌 Database connection closed');
    }
  }

  /**
   * Ensure migrations table exists
   */
  async ensureMigrationsTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        version INTEGER UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        checksum VARCHAR(64) NOT NULL
      );
    `;
    
    await this.client.query(query);
    console.log('📋 Migrations table ready');
  }

  /**
   * Get applied migrations from database
   */
  async getAppliedMigrations() {
    const result = await this.client.query(
      'SELECT version, name, checksum FROM schema_migrations ORDER BY version'
    );
    
    return result.rows.reduce((acc, row) => {
      acc[row.version] = {
        name: row.name,
        checksum: row.checksum
      };
      return acc;
    }, {});
  }

  /**
   * Get available migration files
   */
  async getAvailableMigrations() {
    try {
      const files = await fs.readdir(this.migrationsDir);
      const migrations = [];
      
      for (const file of files) {
        if (file.endsWith('.sql')) {
          const match = file.match(/^(\d+)_(.+)\.sql$/);
          if (match) {
            const version = parseInt(match[1]);
            const name = match[2];
            const filePath = path.join(this.migrationsDir, file);
            const content = await fs.readFile(filePath, 'utf8');
            const checksum = this.calculateChecksum(content);
            
            migrations.push({
              version,
              name,
              file,
              content,
              checksum
            });
          }
        }
      }
      
      return migrations.sort((a, b) => a.version - b.version);
    } catch (error) {
      console.error('❌ Failed to read migrations directory:', error.message);
      throw error;
    }
  }

  /**
   * Calculate checksum for migration content
   */
  calculateChecksum(content) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Execute a single migration
   */
  async executeMigration(migration) {
    console.log(`📦 Applying migration ${migration.version}: ${migration.name}`);
    
    try {
      // Begin transaction
      await this.client.query('BEGIN');
      
      // Execute migration
      await this.client.query(migration.content);
      
      // Record migration
      await this.client.query(
        'INSERT INTO schema_migrations (version, name, checksum) VALUES ($1, $2, $3)',
        [migration.version, migration.name, migration.checksum]
      );
      
      // Commit transaction
      await this.client.query('COMMIT');
      
      console.log(`✅ Migration ${migration.version} applied successfully`);
    } catch (error) {
      // Rollback on error
      await this.client.query('ROLLBACK');
      console.error(`❌ Migration ${migration.version} failed:`, error.message);
      throw error;
    }
  }

  /**
   * Run pending migrations
   */
  async migrate() {
    console.log('🚀 Starting database migration...');
    
    await this.connect();
    await this.ensureMigrationsTable();
    
    const appliedMigrations = await this.getAppliedMigrations();
    const availableMigrations = await this.getAvailableMigrations();
    
    console.log(`📊 Applied migrations: ${Object.keys(appliedMigrations).length}`);
    console.log(`📊 Available migrations: ${availableMigrations.length}`);
    
    // Validate applied migrations
    for (const migration of availableMigrations) {
      const applied = appliedMigrations[migration.version];
      
      if (applied) {
        if (applied.checksum !== migration.checksum) {
          throw new Error(
            `Migration ${migration.version} checksum mismatch. ` +
            `Applied: ${applied.checksum}, Available: ${migration.checksum}`
          );
        }
      }
    }
    
    // Find pending migrations
    const pendingMigrations = availableMigrations.filter(
      migration => !appliedMigrations[migration.version]
    );
    
    if (pendingMigrations.length === 0) {
      console.log('✨ No pending migrations');
      return;
    }
    
    console.log(`📝 Found ${pendingMigrations.length} pending migrations`);
    
    // Apply pending migrations
    for (const migration of pendingMigrations) {
      await this.executeMigration(migration);
    }
    
    console.log(`🎉 Migration completed! Applied ${pendingMigrations.length} migrations`);
  }

  /**
   * Rollback to a specific version
   */
  async rollback(targetVersion = null) {
    console.log('⏪ Starting database rollback...');
    
    await this.connect();
    await this.ensureMigrationsTable();
    
    const appliedMigrations = await this.getAppliedMigrations();
    const versions = Object.keys(appliedMigrations).map(Number).sort((a, b) => b - a);
    
    if (versions.length === 0) {
      console.log('ℹ️ No migrations to rollback');
      return;
    }
    
    // Determine which migrations to rollback
    let migrationsToRollback;
    
    if (targetVersion === null) {
      // Rollback last migration only
      migrationsToRollback = [versions[0]];
    } else {
      // Rollback to target version
      migrationsToRollback = versions.filter(v => v > targetVersion);
    }
    
    if (migrationsToRollback.length === 0) {
      console.log(`ℹ️ Already at version ${targetVersion || 'latest'}`);
      return;
    }
    
    console.log(`📝 Rolling back ${migrationsToRollback.length} migrations`);
    
    // Execute rollbacks in reverse order
    for (const version of migrationsToRollback) {
      await this.executeRollback(version, appliedMigrations[version]);
    }
    
    console.log(`🎉 Rollback completed! Rolled back ${migrationsToRollback.length} migrations`);
  }

  /**
   * Execute a rollback for a specific migration
   */
  async executeRollback(version, migrationInfo) {
    console.log(`⏪ Rolling back migration ${version}: ${migrationInfo.name}`);
    
    // Look for rollback file
    const rollbackFile = path.join(this.rollbacksDir, `${version.toString().padStart(3, '0')}_${migrationInfo.name}.sql`);
    
    try {
      const rollbackContent = await fs.readFile(rollbackFile, 'utf8');
      
      // Begin transaction
      await this.client.query('BEGIN');
      
      // Execute rollback
      await this.client.query(rollbackContent);
      
      // Remove migration record
      await this.client.query(
        'DELETE FROM schema_migrations WHERE version = $1',
        [version]
      );
      
      // Commit transaction
      await this.client.query('COMMIT');
      
      console.log(`✅ Migration ${version} rolled back successfully`);
    } catch (error) {
      // Rollback on error
      await this.client.query('ROLLBACK');
      
      if (error.code === 'ENOENT') {
        console.error(`❌ Rollback file not found: ${rollbackFile}`);
        console.error(`⚠️ Manual rollback required for migration ${version}`);
      } else {
        console.error(`❌ Rollback ${version} failed:`, error.message);
      }
      
      throw error;
    }
  }

  /**
   * Check migration status
   */
  async status() {
    console.log('📊 Checking migration status...');
    
    await this.connect();
    await this.ensureMigrationsTable();
    
    const appliedMigrations = await this.getAppliedMigrations();
    const availableMigrations = await this.getAvailableMigrations();
    
    console.log('\n📋 Migration Status:');
    console.log('==================');
    
    if (availableMigrations.length === 0) {
      console.log('No migrations found');
      return;
    }
    
    for (const migration of availableMigrations) {
      const applied = appliedMigrations[migration.version];
      const status = applied ? '✅ Applied' : '⏳ Pending';
      const date = applied ? new Date(applied.applied_at).toLocaleString() : '';
      
      console.log(`${migration.version.toString().padStart(3, '0')}: ${migration.name} - ${status} ${date}`);
    }
    
    const pendingCount = availableMigrations.filter(
      m => !appliedMigrations[m.version]
    ).length;
    
    console.log(`\n📊 Summary: ${Object.keys(appliedMigrations).length} applied, ${pendingCount} pending`);
  }

  /**
   * Create a new migration file
   */
  async create(name) {
    if (!name) {
      throw new Error('Migration name is required');
    }
    
    const availableMigrations = await this.getAvailableMigrations();
    const lastVersion = availableMigrations.length > 0 
      ? Math.max(...availableMigrations.map(m => m.version))
      : 0;
    
    const newVersion = (lastVersion + 1).toString().padStart(3, '0');
    const fileName = `${newVersion}_${name.replace(/\s+/g, '_').toLowerCase()}.sql`;
    const filePath = path.join(this.migrationsDir, fileName);
    
    const template = `-- Migration: ${name}
-- Version: ${newVersion}
-- Created: ${new Date().toISOString()}

-- Add your migration SQL here
-- Example:
-- CREATE TABLE example (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     name VARCHAR(255) NOT NULL,
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- Remember to create a corresponding rollback file in the rollbacks directory
`;
    
    await fs.writeFile(filePath, template);
    console.log(`✅ Created migration: ${fileName}`);
    
    // Create rollback template
    const rollbackDir = this.rollbacksDir;
    await fs.mkdir(rollbackDir, { recursive: true });
    
    const rollbackFile = path.join(rollbackDir, fileName);
    const rollbackTemplate = `-- Rollback for: ${name}
-- Version: ${newVersion}
-- Created: ${new Date().toISOString()}

-- Add your rollback SQL here
-- Example:
-- DROP TABLE IF EXISTS example;
`;
    
    await fs.writeFile(rollbackFile, rollbackTemplate);
    console.log(`✅ Created rollback: ${fileName}`);
  }
}

/**
 * Main CLI interface
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const migrator = new DatabaseMigrator();
  
  try {
    switch (command) {
      case 'migrate':
      case 'up':
        await migrator.migrate();
        break;
        
      case 'rollback':
      case 'down':
        const targetVersion = args[1] ? parseInt(args[1]) : null;
        await migrator.rollback(targetVersion);
        break;
        
      case 'status':
        await migrator.status();
        break;
        
      case 'create':
        const name = args.slice(1).join(' ');
        await migrator.create(name);
        break;
        
      default:
        console.log(`
Usage: node migrate.js <command> [options]

Commands:
  migrate, up              Run pending migrations
  rollback, down [version] Rollback migrations (to version if specified)
  status                   Show migration status
  create <name>            Create a new migration file

Environment variables:
  DB_HOST       Database host (default: localhost)
  DB_PORT       Database port (default: 5432)
  DB_NAME       Database name (default: candlefish_production)
  DB_USER       Database user (default: candlefish_app)
  DB_PASSWORD   Database password

Examples:
  node migrate.js migrate
  node migrate.js rollback
  node migrate.js rollback 2
  node migrate.js status
  node migrate.js create "add user preferences table"
        `);
        process.exit(0);
    }
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await migrator.disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = DatabaseMigrator;