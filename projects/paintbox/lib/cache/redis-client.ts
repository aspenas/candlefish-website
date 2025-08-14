/**
 * Redis Client with Connection Pooling
 * Provides optimized Redis connectivity with automatic failover
 */

import Redis, { Cluster } from 'ioredis';
import { logger } from '@/lib/logging/simple-logger';
import { RedisStub } from './redis-stub';

export interface RedisPoolOptions {
  minConnections?: number;
  maxConnections?: number;
  connectionTimeout?: number;
  commandTimeout?: number;
  retryDelayOnFailover?: number;
  maxRetriesPerRequest?: number;
  enableReadyCheck?: boolean;
  keepAlive?: number;
}

class RedisConnectionPool {
  private pool: Redis[] = [];
  private activeConnections = 0;
  private pendingRequests: Array<(client: Redis) => void> = [];
  private options: Required<RedisPoolOptions>;
  private redisUrl: string;
  private isCluster: boolean = false;
  private clusterClient?: Cluster;
  private isBuildTime: boolean;

  constructor(redisUrl?: string, options: RedisPoolOptions = {}) {
    this.redisUrl = redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';

    // Check if it's a cluster configuration
    this.isCluster = this.redisUrl.includes(',') || process.env.REDIS_CLUSTER === 'true';

    this.options = {
      minConnections: options.minConnections || 2,
      maxConnections: options.maxConnections || 10,
      connectionTimeout: options.connectionTimeout || 10000,
      commandTimeout: options.commandTimeout || 5000,
      retryDelayOnFailover: options.retryDelayOnFailover || 100,
      maxRetriesPerRequest: options.maxRetriesPerRequest || 3,
      enableReadyCheck: options.enableReadyCheck !== false,
      keepAlive: options.keepAlive || 30000,
    };

    // Detect build time
    this.isBuildTime = process.env.NODE_ENV === 'production' &&
                      (process.env.NEXT_PHASE === 'phase-production-build' ||
                       process.env.npm_lifecycle_event === 'build' ||
                       process.argv.includes('build'));

    if (!this.isBuildTime) {
      this.initialize().catch(err => {
        logger.warn('Redis initialization failed, continuing without cache', { error: err.message });
      });
    } else {
      logger.info('Redis disabled during build time - using stub implementation');
    }
  }

  private async initialize(): Promise<void> {
    if (this.isCluster) {
      await this.initializeCluster();
    } else {
      await this.initializeStandalone();
    }
  }

  private async initializeCluster(): Promise<void> {
    try {
      const nodes = this.redisUrl.split(',').map(url => {
        const [host, port] = url.replace('redis://', '').split(':');
        return { host, port: parseInt(port || '6379', 10) };
      });

      this.clusterClient = new Redis.Cluster(nodes, {
        redisOptions: {
          connectTimeout: this.options.connectionTimeout,
          commandTimeout: this.options.commandTimeout,
          keepAlive: this.options.keepAlive,
        },
        clusterRetryStrategy: (times: number) => {
          if (times > this.options.maxRetriesPerRequest) {
            return null;
          }
          return Math.min(times * this.options.retryDelayOnFailover, 2000);
        },
      });

      this.clusterClient.on('connect', () => {
        logger.info('Redis cluster connected');
      });

      this.clusterClient.on('error', (error) => {
        logger.error('Redis cluster error', { error: error.message });
      });

    } catch (error) {
      logger.error('Failed to initialize Redis cluster', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private async initializeStandalone(): Promise<void> {
    // Create minimum number of connections
    for (let i = 0; i < this.options.minConnections; i++) {
      await this.createConnection();
    }
  }

  private async createConnection(): Promise<Redis> {
    const client = new Redis(this.redisUrl, {
      connectTimeout: this.options.connectionTimeout,
      commandTimeout: this.options.commandTimeout,
      keepAlive: this.options.keepAlive,
      enableReadyCheck: this.options.enableReadyCheck,
      retryStrategy: (times: number) => {
        if (times > this.options.maxRetriesPerRequest) {
          return null;
        }
        return Math.min(times * this.options.retryDelayOnFailover, 2000);
      },
      lazyConnect: false,
    });

    client.on('error', (error) => {
      logger.error('Redis connection error', {
        error: error.message,
        activeConnections: this.activeConnections
      });
      this.removeConnection(client);
    });

    client.on('close', () => {
      this.removeConnection(client);
    });

    client.on('ready', () => {
      logger.debug('Redis connection ready', {
        totalConnections: this.pool.length + 1
      });
    });

    this.pool.push(client);
    this.activeConnections++;

    return client;
  }

  private removeConnection(client: Redis): void {
    const index = this.pool.indexOf(client);
    if (index > -1) {
      this.pool.splice(index, 1);
      this.activeConnections--;

      // Ensure minimum connections
      if (this.activeConnections < this.options.minConnections) {
        this.createConnection().catch(err => {
          logger.error('Failed to maintain minimum connections', { error: err.message });
        });
      }
    }
  }

  async getClient(): Promise<Redis | Cluster | RedisStub> {
    // If build time, return stub
    if (this.isBuildTime) {
      return new RedisStub();
    }

    // If not initialized (runtime without Redis), throw error to be caught by execute method
    if (this.pool.length === 0 && !this.clusterClient) {
      throw new Error('Redis not available during build time');
    }

    // If using cluster, return the cluster client
    if (this.isCluster && this.clusterClient) {
      return this.clusterClient;
    }

    // Try to get an available connection from the pool
    const availableClient = this.pool.find(client => client.status === 'ready');

    if (availableClient) {
      return availableClient;
    }

    // If we haven't reached max connections, create a new one
    if (this.activeConnections < this.options.maxConnections) {
      return await this.createConnection();
    }

    // Wait for an available connection
    return new Promise((resolve) => {
      this.pendingRequests.push(resolve);

      // Check periodically for available connections
      const checkInterval = setInterval(() => {
        const client = this.pool.find(c => c.status === 'ready');
        if (client) {
          clearInterval(checkInterval);
          const request = this.pendingRequests.shift();
          if (request) {
            request(client);
          }
        }
      }, 100);
    });
  }

  async execute<T>(operation: (client: Redis | Cluster | RedisStub) => Promise<T>): Promise<T> {
    try {
      const client = await this.getClient();
      return await operation(client);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Redis not available during build time')) {
        logger.warn('Redis operation skipped during build time');
        throw error; // Let the caller handle gracefully
      }
      logger.error('Redis operation failed', { error: errorMessage });
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const client = await this.getClient();
      await client.ping();
      return true;
    } catch (error) {
      if (this.isBuildTime) {
        return true; // Always healthy during build time
      }
      logger.error('Redis health check failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down Redis connection pool');

    // Clear pending requests
    this.pendingRequests = [];

    // Close cluster client if exists
    if (this.clusterClient) {
      await this.clusterClient.disconnect();
    }

    // Close all pool connections
    await Promise.all(
      this.pool.map(client => client.disconnect())
    );

    this.pool = [];
    this.activeConnections = 0;
  }

  getStats(): {
    totalConnections: number;
    activeConnections: number;
    pendingRequests: number;
    isCluster: boolean;
  } {
    return {
      totalConnections: this.pool.length,
      activeConnections: this.activeConnections,
      pendingRequests: this.pendingRequests.length,
      isCluster: this.isCluster,
    };
  }
}

// Singleton instance
let poolInstance: RedisConnectionPool | null = null;

export function getRedisPool(redisUrl?: string, options?: RedisPoolOptions): RedisConnectionPool {
  if (!poolInstance) {
    poolInstance = new RedisConnectionPool(redisUrl, options);
  }
  return poolInstance;
}

export function createRedisPool(redisUrl?: string, options?: RedisPoolOptions): RedisConnectionPool {
  return new RedisConnectionPool(redisUrl, options);
}

export default RedisConnectionPool;
