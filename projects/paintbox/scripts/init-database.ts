#!/usr/bin/env ts-node

/**
 * Database initialization script for Paintbox
 * Sets up tables, indexes, and initial data
 */

import { getPool, query, transaction } from '@/lib/database/connection-pool';
import { config } from 'dotenv';
import path from 'path';

// Load environment variables
config({ path: path.join(__dirname, '..', '.env.local') });

async function initDatabase() {

  try {
    console.log('🔧 Initializing Paintbox database...');

    // Get database pool
    const pool = getPool();

    // Create tables
    console.log('📋 Creating tables...');

    // Users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        role VARCHAR(50) DEFAULT 'user',
        company_id VARCHAR(36),
        salesforce_id VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_company (company_id),
        INDEX idx_salesforce (salesforce_id)
      )
    `);

    // Projects table
    await query(`
      CREATE TABLE IF NOT EXISTS projects (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'draft',
        client_name VARCHAR(255),
        client_email VARCHAR(255),
        client_phone VARCHAR(50),
        property_address TEXT,
        salesforce_opportunity_id VARCHAR(50),
        companycam_project_id VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user (user_id),
        INDEX idx_status (status),
        INDEX idx_salesforce (salesforce_opportunity_id),
        INDEX idx_companycam (companycam_project_id)
      )
    `);

    // Estimates table
    await query(`
      CREATE TABLE IF NOT EXISTS estimates (
        id VARCHAR(36) PRIMARY KEY,
        project_id VARCHAR(36) NOT NULL,
        version INT DEFAULT 1,
        type VARCHAR(50) DEFAULT 'standard',
        pricing_tier VARCHAR(20) DEFAULT 'good',
        data JSON NOT NULL,
        calculations JSON,
        total_amount DECIMAL(10, 2),
        labor_hours DECIMAL(8, 2),
        material_cost DECIMAL(10, 2),
        labor_cost DECIMAL(10, 2),
        profit_margin DECIMAL(5, 2),
        tax_rate DECIMAL(5, 2),
        status VARCHAR(50) DEFAULT 'draft',
        approved_at TIMESTAMP NULL,
        approved_by VARCHAR(36),
        pdf_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        INDEX idx_project (project_id),
        INDEX idx_status (status),
        INDEX idx_version (project_id, version)
      )
    `);

    // Photos table (Company Cam integration)
    await query(`
      CREATE TABLE IF NOT EXISTS photos (
        id VARCHAR(36) PRIMARY KEY,
        project_id VARCHAR(36) NOT NULL,
        companycam_photo_id VARCHAR(50),
        url TEXT NOT NULL,
        thumbnail_url TEXT,
        caption TEXT,
        tags JSON,
        room VARCHAR(100),
        surface_type VARCHAR(50),
        metadata JSON,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        INDEX idx_project (project_id),
        INDEX idx_companycam (companycam_photo_id),
        INDEX idx_room (room)
      )
    `);

    // Calculations cache table
    await query(`
      CREATE TABLE IF NOT EXISTS calculation_cache (
        id VARCHAR(36) PRIMARY KEY,
        estimate_id VARCHAR(36) NOT NULL,
        formula_key VARCHAR(255) NOT NULL,
        input_hash VARCHAR(64) NOT NULL,
        result JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        FOREIGN KEY (estimate_id) REFERENCES estimates(id) ON DELETE CASCADE,
        UNIQUE KEY unique_calculation (estimate_id, formula_key, input_hash),
        INDEX idx_estimate (estimate_id),
        INDEX idx_expires (expires_at)
      )
    `);

    // Audit log table
    await query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36),
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id VARCHAR(36),
        changes JSON,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_entity (entity_type, entity_id),
        INDEX idx_created (created_at)
      )
    `);

    // Sessions table
    await query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        token_hash VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user (user_id),
        INDEX idx_token (token_hash),
        INDEX idx_expires (expires_at)
      )
    `);

    // Create stored procedures for common operations
    console.log('🔄 Creating stored procedures...');

    // Procedure to clean expired sessions
    await query(`
      CREATE PROCEDURE IF NOT EXISTS cleanup_expired_sessions()
      BEGIN
        DELETE FROM sessions WHERE expires_at < NOW();
        DELETE FROM calculation_cache WHERE expires_at < NOW();
      END
    `);

    // Procedure to update project status
    await query(`
      CREATE PROCEDURE IF NOT EXISTS update_project_status(
        IN p_project_id VARCHAR(36),
        IN p_status VARCHAR(50)
      )
      BEGIN
        UPDATE projects
        SET status = p_status,
            completed_at = IF(p_status = 'completed', NOW(), NULL)
        WHERE id = p_project_id;
      END
    `);

    // Insert default data
    console.log('📝 Inserting default data...');

    // Create system user
    await query(`
      INSERT IGNORE INTO users (id, email, name, role)
      VALUES ('system', 'system@paintbox.app', 'System', 'admin')
    `);

    console.log('✅ Database initialization complete!');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    // Pool will be closed automatically on process exit
  }
}

// Run initialization
if (require.main === module) {
  initDatabase().catch(console.error);
}

export { initDatabase };
