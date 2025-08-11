/**
 * Global Jest Setup for Collaboration Tests
 * Sets up test database, Redis, WebSocket servers, and other infrastructure
 */

const { spawn } = require('child_process');
const { Client } = require('pg');
const Redis = require('ioredis');
const WebSocket = require('ws');
const dockerCompose = require('docker-compose');
const path = require('path');

module.exports = async () => {
  console.log('🚀 Starting global test setup...');

  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5433/collaboration_test';
  process.env.REDIS_URL = 'redis://localhost:6380';
  process.env.WEBSOCKET_PORT = '8081';
  process.env.GRAPHQL_PORT = '4001';

  try {
    // Start Docker services for testing
    await startDockerServices();

    // Wait for services to be ready
    await waitForServices();

    // Setup test database
    await setupTestDatabase();

    // Setup Redis for real-time features
    await setupRedis();

    // Start WebSocket server for real-time testing
    await startWebSocketServer();

    // Store global test state
    global.__COLLABORATION_TEST_STATE__ = {
      databaseUrl: process.env.DATABASE_URL,
      redisUrl: process.env.REDIS_URL,
      websocketPort: process.env.WEBSOCKET_PORT,
      graphqlPort: process.env.GRAPHQL_PORT,
      startTime: new Date(),
    };

    console.log('✅ Global test setup completed successfully');
  } catch (error) {
    console.error('❌ Global test setup failed:', error);
    throw error;
  }
};

async function startDockerServices() {
  console.log('📦 Starting Docker services...');

  const composeFile = path.join(__dirname, '../../../docker-compose.test.yml');

  try {
    await dockerCompose.upAll({
      cwd: path.dirname(composeFile),
      log: true,
      commandOptions: ['--force-recreate', '--remove-orphans'],
    });

    // Wait a bit for containers to fully start
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('✅ Docker services started');
  } catch (error) {
    console.error('❌ Failed to start Docker services:', error);
    throw error;
  }
}

async function waitForServices() {
  console.log('⏳ Waiting for services to be ready...');

  // Wait for PostgreSQL
  await waitForPostgreSQL();

  // Wait for Redis
  await waitForRedis();

  console.log('✅ All services are ready');
}

async function waitForPostgreSQL() {
  const maxAttempts = 30;
  const delay = 1000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const client = new Client({
        connectionString: process.env.DATABASE_URL,
      });

      await client.connect();
      await client.query('SELECT 1');
      await client.end();

      console.log('✅ PostgreSQL is ready');
      return;
    } catch (error) {
      if (attempt === maxAttempts) {
        throw new Error(`PostgreSQL not ready after ${maxAttempts} attempts: ${error.message}`);
      }

      console.log(`⏳ PostgreSQL not ready (attempt ${attempt}/${maxAttempts}), retrying...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

async function waitForRedis() {
  const maxAttempts = 30;
  const delay = 1000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const redis = new Redis(process.env.REDIS_URL);
      await redis.ping();
      await redis.quit();

      console.log('✅ Redis is ready');
      return;
    } catch (error) {
      if (attempt === maxAttempts) {
        throw new Error(`Redis not ready after ${maxAttempts} attempts: ${error.message}`);
      }

      console.log(`⏳ Redis not ready (attempt ${attempt}/${maxAttempts}), retrying...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

async function setupTestDatabase() {
  console.log('🗄️ Setting up test database...');

  try {
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    });

    await client.connect();

    // Create test schema
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      -- Organizations table
      CREATE TABLE IF NOT EXISTS organizations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        plan VARCHAR(50) DEFAULT 'FREE',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        organization_id UUID REFERENCES organizations(id),
        role VARCHAR(50) DEFAULT 'USER',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Documents table
      CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        type VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'DRAFT',
        content JSONB DEFAULT '{}',
        crdt_state JSONB DEFAULT '{}',
        owner_id UUID REFERENCES users(id),
        organization_id UUID REFERENCES organizations(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Document versions table
      CREATE TABLE IF NOT EXISTS document_versions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
        version VARCHAR(50) NOT NULL,
        content JSONB NOT NULL,
        author_id UUID REFERENCES users(id),
        is_current BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );

      -- Comments table
      CREATE TABLE IF NOT EXISTS comments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
        content JSONB NOT NULL,
        author_id UUID REFERENCES users(id),
        parent_id UUID REFERENCES comments(id),
        position JSONB,
        status VARCHAR(50) DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Presence sessions table
      CREATE TABLE IF NOT EXISTS presence_sessions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id),
        document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'ACTIVE',
        cursor_position JSONB,
        joined_at TIMESTAMP DEFAULT NOW(),
        last_seen_at TIMESTAMP DEFAULT NOW()
      );

      -- Operations table for CRDT
      CREATE TABLE IF NOT EXISTS operations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
        operation_type VARCHAR(50) NOT NULL,
        position INTEGER NOT NULL,
        content JSONB,
        author_id UUID REFERENCES users(id),
        client_id UUID NOT NULL,
        timestamp TIMESTAMP DEFAULT NOW(),
        applied BOOLEAN DEFAULT FALSE
      );

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_documents_org ON documents(organization_id);
      CREATE INDEX IF NOT EXISTS idx_comments_document ON comments(document_id);
      CREATE INDEX IF NOT EXISTS idx_presence_document ON presence_sessions(document_id);
      CREATE INDEX IF NOT EXISTS idx_operations_document ON operations(document_id);
      CREATE INDEX IF NOT EXISTS idx_operations_timestamp ON operations(timestamp);
    `);

    await client.end();
    console.log('✅ Test database setup completed');
  } catch (error) {
    console.error('❌ Failed to setup test database:', error);
    throw error;
  }
}

async function setupRedis() {
  console.log('📊 Setting up Redis for real-time features...');

  try {
    const redis = new Redis(process.env.REDIS_URL);

    // Clear any existing test data
    await redis.flushdb();

    // Set up Redis pub/sub channels for testing
    await redis.set('test:setup:timestamp', Date.now());

    await redis.quit();
    console.log('✅ Redis setup completed');
  } catch (error) {
    console.error('❌ Failed to setup Redis:', error);
    throw error;
  }
}

async function startWebSocketServer() {
  console.log('🔌 Starting WebSocket server for real-time testing...');

  try {
    const wss = new WebSocket.Server({
      port: parseInt(process.env.WEBSOCKET_PORT),
      clientTracking: true,
    });

    // Store WebSocket server reference for cleanup
    global.__TEST_WEBSOCKET_SERVER__ = wss;

    // Basic message handling for tests
    wss.on('connection', (ws) => {
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);

          // Echo messages back to all connected clients (broadcast)
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(data);
            }
          });
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });

    // Wait for server to be ready
    await new Promise((resolve) => {
      wss.on('listening', resolve);
    });

    console.log(`✅ WebSocket server started on port ${process.env.WEBSOCKET_PORT}`);
  } catch (error) {
    console.error('❌ Failed to start WebSocket server:', error);
    throw error;
  }
}
