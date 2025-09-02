import { Pool } from 'pg';
import Redis from 'ioredis';
import { spawn } from 'child_process';

export default async function globalSetup() {
  console.log('🧪 Setting up test environment...');
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/clos_test';
  process.env.REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379/1';
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-analytics-tests';
  
  // Wait for databases to be ready
  await waitForDatabase();
  await waitForRedis();
  
  // Initialize test database schema
  await setupTestDatabase();
  
  console.log('✅ Test environment ready');
}

async function waitForDatabase(maxRetries = 10, delay = 1000) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1
  });
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      await pool.query('SELECT NOW()');
      await pool.end();
      console.log('✅ Database connection ready');
      return;
    } catch (error) {
      console.log(`⏳ Waiting for database... (${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  await pool.end();
  throw new Error('Database not ready after maximum retries');
}

async function waitForRedis(maxRetries = 10, delay = 1000) {
  const redis = new Redis(process.env.REDIS_URL!);
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      await redis.ping();
      await redis.disconnect();
      console.log('✅ Redis connection ready');
      return;
    } catch (error) {
      console.log(`⏳ Waiting for Redis... (${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  await redis.disconnect();
  throw new Error('Redis not ready after maximum retries');
}

async function setupTestDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5
  });
  
  try {
    // Create analytics tables for testing
    await pool.query(`
      CREATE TABLE IF NOT EXISTS agent_performance_metrics (
        id SERIAL PRIMARY KEY,
        agent_id VARCHAR(255) NOT NULL,
        agent_name VARCHAR(255) NOT NULL,
        metric_type VARCHAR(100) NOT NULL,
        value DECIMAL(10,4) NOT NULL,
        unit VARCHAR(50),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS service_performance_metrics (
        id SERIAL PRIMARY KEY,
        service_name VARCHAR(255) NOT NULL,
        endpoint VARCHAR(500),
        response_time_ms INTEGER,
        status_code INTEGER,
        error_message TEXT,
        request_count INTEGER DEFAULT 1,
        cpu_usage DECIMAL(5,2),
        memory_usage DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_metrics (
        id SERIAL PRIMARY KEY,
        metric_name VARCHAR(255) NOT NULL,
        metric_value DECIMAL(15,4) NOT NULL,
        metric_unit VARCHAR(50),
        component VARCHAR(255),
        severity VARCHAR(20) DEFAULT 'info',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Create indexes for performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_agent_metrics_created_at 
      ON agent_performance_metrics(created_at);
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_service_metrics_created_at 
      ON service_performance_metrics(created_at);
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_system_metrics_created_at 
      ON system_metrics(created_at);
    `);
    
    console.log('✅ Test database schema initialized');
  } catch (error) {
    console.error('❌ Failed to setup test database:', error);
    throw error;
  } finally {
    await pool.end();
  }
}