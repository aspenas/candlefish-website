/**
 * Service management utilities for tests
 * Manages test database, Redis, and other services
 */

import { DatabaseManager } from '../../src/deployment-api/database/manager';
import { RedisClient } from '../../src/deployment-api/cache/redis';
import { WebSocketManager } from '../../src/deployment-api/websocket/manager';

export interface TestServices {
  database: DatabaseManager;
  redis: RedisClient;
  websocket?: WebSocketManager;
}

export interface TestDatabaseConfig {
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
}

export interface TestRedisConfig {
  host?: string;
  port?: number;
  password?: string;
  database?: number;
}

// Global test services instance
let testServices: TestServices | null = null;

/**
 * Start all test services (database, Redis, etc.)
 */
export async function startTestServices(config: {
  database?: TestDatabaseConfig;
  redis?: TestRedisConfig;
} = {}): Promise<TestServices> {
  if (testServices) {
    return testServices;
  }

  console.log('Starting test services...');

  // Start test database
  const database = new DatabaseManager({
    host: config.database?.host || process.env.TEST_DB_HOST || 'localhost',
    port: config.database?.port || parseInt(process.env.TEST_DB_PORT || '5432'),
    database: config.database?.database || process.env.TEST_DB_NAME || 'deployment_api_test',
    username: config.database?.username || process.env.TEST_DB_USER || 'postgres',
    password: config.database?.password || process.env.TEST_DB_PASSWORD || 'postgres',
  });

  await database.connect();
  await database.runMigrations();

  // Start test Redis
  const redis = new RedisClient({
    host: config.redis?.host || process.env.TEST_REDIS_HOST || 'localhost',
    port: config.redis?.port || parseInt(process.env.TEST_REDIS_PORT || '6379'),
    password: config.redis?.password || process.env.TEST_REDIS_PASSWORD,
    database: config.redis?.database || parseInt(process.env.TEST_REDIS_DB || '1'), // Use DB 1 for tests
  });

  await redis.connect();

  testServices = {
    database,
    redis
  };

  console.log('Test services started successfully');
  return testServices;
}

/**
 * Stop all test services
 */
export async function stopTestServices(): Promise<void> {
  if (!testServices) {
    return;
  }

  console.log('Stopping test services...');

  try {
    // Clean up database
    await testServices.database.cleanup();
    await testServices.database.disconnect();

    // Clean up Redis
    await testServices.redis.flushAll();
    await testServices.redis.disconnect();

    // Clean up WebSocket if it exists
    if (testServices.websocket) {
      await testServices.websocket.close();
    }

    testServices = null;
    console.log('Test services stopped successfully');
  } catch (error) {
    console.error('Error stopping test services:', error);
    throw error;
  }
}

/**
 * Reset test services to clean state
 */
export async function resetTestServices(): Promise<void> {
  if (!testServices) {
    throw new Error('Test services not started');
  }

  console.log('Resetting test services...');

  // Clear database
  await testServices.database.cleanup();
  await testServices.database.runMigrations();

  // Clear Redis
  await testServices.redis.flushAll();

  console.log('Test services reset successfully');
}

/**
 * Get current test services instance
 */
export function getTestServices(): TestServices {
  if (!testServices) {
    throw new Error('Test services not started. Call startTestServices() first.');
  }
  return testServices;
}

/**
 * Database-specific test utilities
 */
export class TestDatabaseManager {
  private db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  /**
   * Seed the database with test data
   */
  async seedTestData(): Promise<void> {
    // Create test environments
    await this.db.query(`
      INSERT INTO environments (id, name, description, priority, auto_deploy, require_approval, max_concurrent_deployments)
      VALUES
        ('env-prod', 'production', 'Production environment', 1, false, true, 1),
        ('env-staging', 'staging', 'Staging environment', 2, true, false, 2),
        ('env-preview', 'preview', 'Preview environment', 3, false, false, 5)
      ON CONFLICT (name) DO NOTHING
    `);

    // Create test sites
    await this.db.query(`
      INSERT INTO sites (id, name, description, repository_url, build_command, deploy_command)
      VALUES
        ('site-docs', 'docs', 'Documentation site', 'https://github.com/candlefish/docs', 'npm run build', 'npm run deploy'),
        ('site-partners', 'partners', 'Partners portal', 'https://github.com/candlefish/partners', 'npm run build', 'npm run deploy'),
        ('site-api', 'api', 'API documentation', 'https://github.com/candlefish/api-docs', 'npm run build', 'npm run deploy')
      ON CONFLICT (name) DO NOTHING
    `);

    // Create test users
    await this.db.query(`
      INSERT INTO users (id, email, role, permissions, created_at)
      VALUES
        ('user-admin', 'admin@candlefish.ai', 'admin', '["deployments:create","deployments:read","deployments:rollback","secrets:rotate"]', NOW()),
        ('user-dev', 'developer@candlefish.ai', 'developer', '["deployments:create","deployments:read","deployments:rollback:staging"]', NOW()),
        ('user-viewer', 'viewer@candlefish.ai', 'viewer', '["deployments:read"]', NOW())
      ON CONFLICT (email) DO NOTHING
    `);
  }

  /**
   * Clean up all test data
   */
  async cleanupTestData(): Promise<void> {
    // Order matters due to foreign key constraints
    const tables = [
      'deployment_steps',
      'deployments',
      'rollbacks',
      'audit_logs',
      'health_checks',
      'secret_rotations',
      'environment_variables',
      'users',
      'sites',
      'environments'
    ];

    for (const table of tables) {
      await this.db.query(`DELETE FROM ${table} WHERE id LIKE 'test-%' OR id LIKE 'user-%' OR id LIKE 'site-%' OR id LIKE 'env-%'`);
    }
  }

  /**
   * Get current deployment for a site/environment
   */
  async getCurrentDeployment(siteName: string, environment: string): Promise<any> {
    const result = await this.db.query(`
      SELECT * FROM deployments
      WHERE site_name = $1 AND environment = $2 AND status = 'success'
      ORDER BY completed_at DESC
      LIMIT 1
    `, [siteName, environment]);

    return result.rows[0] || null;
  }

  /**
   * Update deployment status directly (for testing)
   */
  async updateDeploymentStatus(deploymentId: string, status: string): Promise<void> {
    await this.db.query(`
      UPDATE deployments
      SET status = $1, updated_at = NOW()
      WHERE id = $2
    `, [status, deploymentId]);
  }

  /**
   * Create test deployment directly in database
   */
  async createTestDeployment(data: any): Promise<string> {
    const deploymentId = `test-deploy-${Date.now()}`;

    await this.db.query(`
      INSERT INTO deployments (
        id, site_name, environment, commit_sha, branch, status,
        deployment_strategy, triggered_by, started_at, changelog, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, NOW(), NOW())
    `, [
      deploymentId,
      data.site_name,
      data.environment,
      data.commit_sha,
      data.branch,
      'pending',
      data.deployment_strategy || 'blue-green',
      data.triggered_by || 'test-user',
      data.changelog || 'Test deployment'
    ]);

    return deploymentId;
  }
}

/**
 * Redis-specific test utilities
 */
export class TestRedisManager {
  private redis: RedisClient;

  constructor(redis: RedisClient) {
    this.redis = redis;
  }

  /**
   * Set up test cache data
   */
  async seedCacheData(): Promise<void> {
    // Cache some test deployment data
    await this.redis.set('deployment:test-1:status', 'success', 3600);
    await this.redis.set('deployment:test-2:status', 'building', 3600);

    // Cache health check data
    await this.redis.set('health:docs:production', JSON.stringify({
      status: 'healthy',
      last_check: new Date().toISOString(),
      response_time_ms: 150
    }), 300);
  }

  /**
   * Clear all test cache data
   */
  async clearCacheData(): Promise<void> {
    const keys = await this.redis.keys('test:*');
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  /**
   * Get cached deployment status
   */
  async getDeploymentStatus(deploymentId: string): Promise<string | null> {
    return await this.redis.get(`deployment:${deploymentId}:status`);
  }

  /**
   * Set cached deployment status
   */
  async setDeploymentStatus(deploymentId: string, status: string, ttl: number = 3600): Promise<void> {
    await this.redis.set(`deployment:${deploymentId}:status`, status, ttl);
  }
}

/**
 * Health check utilities for testing
 */
export async function waitForServiceHealth(
  serviceName: string,
  expectedStatus: 'healthy' | 'unhealthy' | 'degraded',
  timeout: number = 30000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const services = getTestServices();
      const healthData = await services.redis.get(`health:${serviceName}`);

      if (healthData) {
        const health = JSON.parse(healthData);
        if (health.status === expectedStatus) {
          return;
        }
      }
    } catch (error) {
      // Continue waiting
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  throw new Error(`Timeout waiting for ${serviceName} to reach ${expectedStatus} status`);
}

/**
 * Test service health checker
 */
export class TestHealthChecker {
  private static healthStatus = new Map<string, any>();

  static setServiceHealth(serviceName: string, status: any): void {
    this.healthStatus.set(serviceName, {
      ...status,
      last_check: new Date().toISOString()
    });
  }

  static getServiceHealth(serviceName: string): any {
    return this.healthStatus.get(serviceName) || {
      status: 'unknown',
      last_check: new Date().toISOString()
    };
  }

  static clearAll(): void {
    this.healthStatus.clear();
  }
}

/**
 * Test environment variables
 */
export function setupTestEnvironment(): void {
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests
  process.env.JWT_SECRET = 'test-jwt-secret-key';
  process.env.REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379/1';
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/deployment_api_test';
}

/**
 * Clean up test environment
 */
export function cleanupTestEnvironment(): void {
  // Reset environment variables to their original state
  delete process.env.NODE_ENV;
  delete process.env.LOG_LEVEL;
  delete process.env.JWT_SECRET;
  delete process.env.REDIS_URL;
  delete process.env.DATABASE_URL;
}

/**
 * Test service availability checker
 */
export async function checkTestServicesAvailable(): Promise<boolean> {
  try {
    const services = await startTestServices();

    // Test database connection
    await services.database.query('SELECT 1');

    // Test Redis connection
    await services.redis.ping();

    return true;
  } catch (error) {
    console.error('Test services not available:', error.message);
    return false;
  }
}

/**
 * Global test setup and teardown
 */
export async function globalTestSetup(): Promise<void> {
  setupTestEnvironment();

  const available = await checkTestServicesAvailable();
  if (!available) {
    throw new Error('Test services are not available. Please ensure PostgreSQL and Redis are running.');
  }

  const services = await startTestServices();
  const dbManager = new TestDatabaseManager(services.database);
  await dbManager.seedTestData();

  console.log('Global test setup completed');
}

export async function globalTestTeardown(): Promise<void> {
  if (testServices) {
    const dbManager = new TestDatabaseManager(testServices.database);
    await dbManager.cleanupTestData();
  }

  await stopTestServices();
  cleanupTestEnvironment();

  console.log('Global test teardown completed');
}
