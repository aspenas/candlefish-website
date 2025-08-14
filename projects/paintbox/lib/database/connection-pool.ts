import { Pool, PoolConfig, PoolClient } from 'pg';
import { logger } from '@/lib/logging/simple-logger';

// Database connection configuration
const poolConfig: PoolConfig = {
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME || 'paintbox',
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD,

  // Connection pooling settings
  min: parseInt(process.env.DATABASE_POOL_MIN || '2'),
  max: parseInt(process.env.DATABASE_POOL_MAX || '20'),
  idleTimeoutMillis: parseInt(process.env.DATABASE_POOL_IDLE || '30000'),
  connectionTimeoutMillis: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '5000'),

  // SSL configuration for production
  ssl: process.env.DATABASE_SSL === 'true' ? {
    rejectUnauthorized: process.env.NODE_ENV === 'production',
  } : undefined,

  // Statement timeout to prevent long-running queries
  statement_timeout: parseInt(process.env.DATABASE_STATEMENT_TIMEOUT || '30000'),

  // Application name for monitoring
  application_name: 'paintbox-app',
};

// Create singleton pool instance
let pool: Pool | null = null;

/**
 * Get or create database connection pool
 */
export function getPool(): Pool {
  if (!pool) {
    pool = new Pool(poolConfig);

    // Pool event handlers
    pool.on('connect', (client) => {
      logger.database('New client connected to pool', {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount,
      });
    });

    pool.on('acquire', (client) => {
      logger.debug('Client acquired from pool', {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount,
      });
    });

    pool.on('error', (err, client) => {
      logger.error('Database pool error', {
        error: err.message,
        stack: err.stack,
      });
    });

    pool.on('remove', (client) => {
      logger.debug('Client removed from pool', {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount,
      });
    });
  }

  return pool;
}

/**
 * Execute a query with automatic connection handling
 */
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<{ rows: T[]; rowCount: number }> {
  const pool = getPool();
  const start = Date.now();

  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    logger.database('Query executed', {
      query: text.substring(0, 100),
      params: params?.length || 0,
      rows: result.rowCount,
      duration,
    });

    return result;
  } catch (error) {
    logger.error('Database query error', {
      query: text.substring(0, 100),
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start,
    });
    throw error;
  }
}

/**
 * Execute a transaction with automatic rollback on error
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  const start = Date.now();

  try {
    await client.query('BEGIN');
    logger.database('Transaction started');

    const result = await callback(client);

    await client.query('COMMIT');
    const duration = Date.now() - start;

    logger.database('Transaction committed', { duration });
    return result;

  } catch (error) {
    await client.query('ROLLBACK');
    const duration = Date.now() - start;

    logger.error('Transaction rolled back', {
      error: error instanceof Error ? error.message : String(error),
      duration,
    });
    throw error;

  } finally {
    client.release();
  }
}

/**
 * Create a single connection for simple operations
 */
export async function createConnection(): Promise<PoolClient> {
  const pool = getPool();
  return await pool.connect();
}

/**
 * Health check for database connection
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const result = await query('SELECT 1 as health');
    return result.rows[0]?.health === 1;
  } catch (error) {
    logger.error('Database health check failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Get pool statistics
 */
export function getPoolStats() {
  const p = getPool();
  return {
    totalCount: p.totalCount,
    idleCount: p.idleCount,
    waitingCount: p.waitingCount,
    config: {
      min: poolConfig.min,
      max: poolConfig.max,
      idleTimeoutMillis: poolConfig.idleTimeoutMillis,
    },
  };
}

/**
 * Gracefully close all database connections
 */
export async function closePool(): Promise<void> {
  if (pool) {
    logger.info('Closing database connection pool');
    await pool.end();
    pool = null;
    logger.info('Database connection pool closed');
  }
}

// Handle process termination
process.on('SIGTERM', async () => {
  await closePool();
});

process.on('SIGINT', async () => {
  await closePool();
});

// Export types
export type { PoolClient } from 'pg';
