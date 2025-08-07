import { beforeAll, afterAll, describe, test, expect } from '@jest/globals';
import { GenericContainer, Wait } from 'testcontainers';
import { Client } from 'pg';
import Redis from 'redis';
import request from 'supertest';
import app from '../../index.js';

describe('Database Integration Tests', () => {
  let postgresContainer;
  let redisContainer;
  let pgClient;
  let redisClient;

  beforeAll(async () => {
    // Start PostgreSQL test container
    postgresContainer = await new GenericContainer('postgres:15-alpine')
      .withEnvironment({
        POSTGRES_DB: 'tyler_test',
        POSTGRES_USER: 'test',
        POSTGRES_PASSWORD: 'test'
      })
      .withExposedPorts(5432)
      .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections'))
      .start();

    // Start Redis test container
    redisContainer = await new GenericContainer('redis:7-alpine')
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forLogMessage('Ready to accept connections'))
      .start();

    // Set up test environment variables
    const postgresPort = postgresContainer.getMappedPort(5432);
    const redisPort = redisContainer.getMappedPort(6379);

    process.env.DATABASE_URL = `postgresql://test:test@localhost:${postgresPort}/tyler_test`;
    process.env.REDIS_URL = `redis://localhost:${redisPort}`;
    process.env.JWT_SECRET = 'test-secret-key';
    process.env.NODE_ENV = 'test';

    // Initialize database client
    pgClient = new Client({
      connectionString: process.env.DATABASE_URL
    });
    await pgClient.connect();

    // Initialize Redis client
    redisClient = Redis.createClient({ url: process.env.REDIS_URL });
    await redisClient.connect();

    // Run database migrations
    await setupTestSchema();
  });

  afterAll(async () => {
    // Cleanup
    if (pgClient) await pgClient.end();
    if (redisClient) await redisClient.quit();
    if (postgresContainer) await postgresContainer.stop();
    if (redisContainer) await redisContainer.stop();
  });

  async function setupTestSchema() {
    // Create test tables
    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS aws_secrets (
        id SERIAL PRIMARY KEY,
        secret_name VARCHAR(255) UNIQUE NOT NULL,
        arn VARCHAR(512) NOT NULL,
        description TEXT,
        created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_accessed_date TIMESTAMP,
        version_id VARCHAR(128),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS metrics (
        id SERIAL PRIMARY KEY,
        metric_name VARCHAR(255) NOT NULL,
        value NUMERIC NOT NULL,
        labels JSONB,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS telemetry_events (
        id SERIAL PRIMARY KEY,
        event_type VARCHAR(255) NOT NULL,
        severity VARCHAR(50) DEFAULT 'info',
        event_data JSONB,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) UNIQUE NOT NULL,
        value JSONB NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for performance
    await pgClient.query(`
      CREATE INDEX IF NOT EXISTS idx_metrics_name_timestamp 
      ON metrics(metric_name, timestamp DESC)
    `);

    await pgClient.query(`
      CREATE INDEX IF NOT EXISTS idx_telemetry_type_timestamp 
      ON telemetry_events(event_type, timestamp DESC)
    `);
  }

  describe('Database Connection and Schema', () => {
    test('should connect to PostgreSQL successfully', async () => {
      const result = await pgClient.query('SELECT version()');
      expect(result.rows[0].version).toContain('PostgreSQL');
    });

    test('should connect to Redis successfully', async () => {
      await redisClient.set('test_key', 'test_value');
      const value = await redisClient.get('test_key');
      expect(value).toBe('test_value');
    });

    test('should have all required tables created', async () => {
      const tables = await pgClient.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);

      const tableNames = tables.rows.map(row => row.table_name);
      expect(tableNames).toContain('aws_secrets');
      expect(tableNames).toContain('metrics');
      expect(tableNames).toContain('telemetry_events');
      expect(tableNames).toContain('settings');
    });

    test('should have proper indexes for performance', async () => {
      const indexes = await pgClient.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public'
      `);

      const indexNames = indexes.rows.map(row => row.indexname);
      expect(indexNames).toContain('idx_metrics_name_timestamp');
      expect(indexNames).toContain('idx_telemetry_type_timestamp');
    });
  });

  describe('AWS Secrets Integration', () => {
    beforeEach(async () => {
      // Clean up test data
      await pgClient.query('DELETE FROM aws_secrets');
      await redisClient.flushAll();
    });

    test('should store and retrieve AWS secret metadata', async () => {
      const secretData = {
        secret_name: 'test-integration-secret',
        arn: 'arn:aws:secretsmanager:us-east-1:123456789:secret:test-integration-secret',
        description: 'Integration test secret',
        version_id: 'v1'
      };

      // Insert test data
      await pgClient.query(`
        INSERT INTO aws_secrets (secret_name, arn, description, version_id)
        VALUES ($1, $2, $3, $4)
      `, [secretData.secret_name, secretData.arn, secretData.description, secretData.version_id]);

      // Verify data was stored correctly
      const result = await pgClient.query(
        'SELECT * FROM aws_secrets WHERE secret_name = $1',
        [secretData.secret_name]
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].secret_name).toBe(secretData.secret_name);
      expect(result.rows[0].arn).toBe(secretData.arn);
    });

    test('should handle concurrent secret operations safely', async () => {
      const secretName = 'concurrent-test-secret';
      
      // Simulate concurrent operations
      const operations = Array.from({ length: 10 }, (_, i) => 
        pgClient.query(`
          INSERT INTO aws_secrets (secret_name, arn, description)
          VALUES ($1, $2, $3)
          ON CONFLICT (secret_name) DO UPDATE SET
            description = EXCLUDED.description,
            updated_at = CURRENT_TIMESTAMP
        `, [
          secretName,
          `arn:aws:secretsmanager:us-east-1:123456789:secret:${secretName}`,
          `Concurrent operation ${i}`
        ])
      );

      await Promise.all(operations);

      // Verify only one record exists
      const result = await pgClient.query(
        'SELECT COUNT(*) FROM aws_secrets WHERE secret_name = $1',
        [secretName]
      );

      expect(parseInt(result.rows[0].count)).toBe(1);
    });
  });

  describe('Caching Integration', () => {
    beforeEach(async () => {
      await redisClient.flushAll();
    });

    test('should cache and retrieve data correctly', async () => {
      const cacheKey = 'test:cache:key';
      const testData = { name: 'test', value: 123 };

      // Set cache
      await redisClient.setEx(cacheKey, 300, JSON.stringify(testData));

      // Get from cache
      const cachedData = await redisClient.get(cacheKey);
      expect(JSON.parse(cachedData)).toEqual(testData);
    });

    test('should handle cache expiration correctly', async () => {
      const cacheKey = 'test:expire:key';
      const testData = 'expire-test';

      // Set cache with short TTL
      await redisClient.setEx(cacheKey, 1, testData);

      // Verify data exists
      let cachedData = await redisClient.get(cacheKey);
      expect(cachedData).toBe(testData);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Verify data expired
      cachedData = await redisClient.get(cacheKey);
      expect(cachedData).toBeNull();
    });

    test('should handle cache invalidation patterns', async () => {
      const pattern = 'test:pattern:*';
      const keys = ['test:pattern:1', 'test:pattern:2', 'test:pattern:3'];

      // Set multiple keys
      for (const key of keys) {
        await redisClient.set(key, `value-${key}`);
      }

      // Verify keys exist
      for (const key of keys) {
        const value = await redisClient.get(key);
        expect(value).toBe(`value-${key}`);
      }

      // Delete by pattern (simulating cache invalidation)
      const keysToDelete = await redisClient.keys(pattern);
      if (keysToDelete.length > 0) {
        await redisClient.del(keysToDelete);
      }

      // Verify keys are deleted
      for (const key of keys) {
        const value = await redisClient.get(key);
        expect(value).toBeNull();
      }
    });
  });

  describe('Performance and Load Testing', () => {
    test('should handle high-volume metric insertions', async () => {
      const startTime = Date.now();
      const batchSize = 1000;

      // Insert metrics in batch
      const values = [];
      for (let i = 0; i < batchSize; i++) {
        values.push(`('test_metric', ${Math.random() * 100}, '{"batch": ${i}}', NOW())`);
      }

      const query = `
        INSERT INTO metrics (metric_name, value, labels, timestamp)
        VALUES ${values.join(', ')}
      `;

      await pgClient.query(query);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verify insertion performance (should complete within reasonable time)
      expect(duration).toBeLessThan(5000); // 5 seconds max

      // Verify all records inserted
      const result = await pgClient.query(
        "SELECT COUNT(*) FROM metrics WHERE metric_name = 'test_metric'"
      );
      expect(parseInt(result.rows[0].count)).toBe(batchSize);
    });

    test('should handle concurrent database connections efficiently', async () => {
      const concurrency = 20;
      const operations = Array.from({ length: concurrency }, (_, i) =>
        pgClient.query('SELECT $1 as connection_id, NOW() as timestamp', [i])
      );

      const startTime = Date.now();
      const results = await Promise.all(operations);
      const endTime = Date.now();

      // All operations should complete
      expect(results).toHaveLength(concurrency);
      
      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(2000); // 2 seconds max

      // Verify each operation returned correct data
      results.forEach((result, index) => {
        expect(parseInt(result.rows[0].connection_id)).toBe(index);
      });
    });
  });

  describe('Data Integrity and Transactions', () => {
    test('should maintain referential integrity', async () => {
      // Test foreign key constraints and data consistency
      const testData = {
        secret_name: 'integrity-test',
        arn: 'arn:aws:secretsmanager:us-east-1:123456789:secret:integrity-test'
      };

      await pgClient.query(`
        INSERT INTO aws_secrets (secret_name, arn)
        VALUES ($1, $2)
      `, [testData.secret_name, testData.arn]);

      // Verify unique constraint works
      await expect(
        pgClient.query(`
          INSERT INTO aws_secrets (secret_name, arn)
          VALUES ($1, $2)
        `, [testData.secret_name, 'different-arn'])
      ).rejects.toThrow();
    });

    test('should handle transaction rollbacks correctly', async () => {
      await pgClient.query('BEGIN');

      try {
        await pgClient.query(`
          INSERT INTO aws_secrets (secret_name, arn)
          VALUES ('rollback-test', 'arn:test')
        `);

        // Force an error
        await pgClient.query(`
          INSERT INTO aws_secrets (secret_name, arn)
          VALUES ('rollback-test', 'arn:test')  -- Duplicate key error
        `);

        await pgClient.query('COMMIT');
      } catch (error) {
        await pgClient.query('ROLLBACK');
      }

      // Verify no data was committed
      const result = await pgClient.query(
        "SELECT COUNT(*) FROM aws_secrets WHERE secret_name = 'rollback-test'"
      );
      expect(parseInt(result.rows[0].count)).toBe(0);
    });
  });

  describe('Backup and Recovery Simulation', () => {
    test('should create consistent data snapshots', async () => {
      // Insert test data
      const testSecrets = [
        { name: 'backup-secret-1', arn: 'arn:aws:secretsmanager:us-east-1:123456789:secret:backup-secret-1' },
        { name: 'backup-secret-2', arn: 'arn:aws:secretsmanager:us-east-1:123456789:secret:backup-secret-2' }
      ];

      for (const secret of testSecrets) {
        await pgClient.query(`
          INSERT INTO aws_secrets (secret_name, arn)
          VALUES ($1, $2)
        `, [secret.name, secret.arn]);
      }

      // Simulate backup by creating a snapshot
      const backupData = await pgClient.query('SELECT * FROM aws_secrets');
      expect(backupData.rows).toHaveLength(testSecrets.length);

      // Simulate data loss
      await pgClient.query('DELETE FROM aws_secrets');

      // Verify data is gone
      const emptyResult = await pgClient.query('SELECT COUNT(*) FROM aws_secrets');
      expect(parseInt(emptyResult.rows[0].count)).toBe(0);

      // Simulate recovery
      for (const row of backupData.rows) {
        await pgClient.query(`
          INSERT INTO aws_secrets (secret_name, arn, description, created_date, version_id)
          VALUES ($1, $2, $3, $4, $5)
        `, [row.secret_name, row.arn, row.description, row.created_date, row.version_id]);
      }

      // Verify recovery
      const recoveredResult = await pgClient.query('SELECT COUNT(*) FROM aws_secrets');
      expect(parseInt(recoveredResult.rows[0].count)).toBe(testSecrets.length);
    });
  });
});