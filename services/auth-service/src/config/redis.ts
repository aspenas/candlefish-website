import { createClient, RedisClientType } from 'redis';
import { config } from './index';
import { logger } from '../utils/logger';

class RedisService {
  private client: RedisClientType;
  private isConnected = false;

  constructor() {
    this.client = createClient({
      url: config.redis.url,
      socket: {
        connectTimeout: 5000,
      },
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      logger.info('Redis client connected');
      this.isConnected = true;
    });

    this.client.on('ready', () => {
      logger.info('Redis client ready');
    });

    this.client.on('error', (err) => {
      logger.error('Redis client error:', err);
      this.isConnected = false;
    });

    this.client.on('end', () => {
      logger.info('Redis client disconnected');
      this.isConnected = false;
    });
  }

  async connect(): Promise<void> {
    try {
      if (!this.isConnected) {
        await this.client.connect();
      }
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.isConnected) {
        await this.client.quit();
      }
    } catch (error) {
      logger.error('Error disconnecting from Redis:', error);
    }
  }

  private getKey(key: string): string {
    return `${config.redis.keyPrefix}${key}`;
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(this.getKey(key));
    } catch (error) {
      logger.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    try {
      const fullKey = this.getKey(key);
      if (ttlSeconds) {
        await this.client.setEx(fullKey, ttlSeconds, value);
      } else {
        await this.client.set(fullKey, value);
      }
      return true;
    } catch (error) {
      logger.error(`Redis SET error for key ${key}:`, error);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      const deleted = await this.client.del(this.getKey(key));
      return deleted > 0;
    } catch (error) {
      logger.error(`Redis DEL error for key ${key}:`, error);
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const exists = await this.client.exists(this.getKey(key));
      return exists === 1;
    } catch (error) {
      logger.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }

  async incr(key: string): Promise<number> {
    try {
      return await this.client.incr(this.getKey(key));
    } catch (error) {
      logger.error(`Redis INCR error for key ${key}:`, error);
      throw error;
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    try {
      const result = await this.client.expire(this.getKey(key), ttlSeconds);
      return result;
    } catch (error) {
      logger.error(`Redis EXPIRE error for key ${key}:`, error);
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(this.getKey(key));
    } catch (error) {
      logger.error(`Redis TTL error for key ${key}:`, error);
      return -1;
    }
  }

  // Session-specific methods
  async setSession(sessionId: string, data: Record<string, any>, ttlSeconds: number): Promise<boolean> {
    return await this.set(`session:${sessionId}`, JSON.stringify(data), ttlSeconds);
  }

  async getSession(sessionId: string): Promise<Record<string, any> | null> {
    const data = await this.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    return await this.del(`session:${sessionId}`);
  }

  // Rate limiting methods
  async getRateLimit(key: string): Promise<number> {
    const current = await this.get(`ratelimit:${key}`);
    return current ? parseInt(current, 10) : 0;
  }

  async incrementRateLimit(key: string, windowSeconds: number): Promise<number> {
    const fullKey = this.getKey(`ratelimit:${key}`);
    const current = await this.client.incr(fullKey);

    if (current === 1) {
      await this.client.expire(fullKey, windowSeconds);
    }

    return current;
  }

  // Health check
  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis ping failed:', error);
      return false;
    }
  }

  get isHealthy(): boolean {
    return this.isConnected;
  }
}

// Create singleton instance
export const redisService = new RedisService();

// Health check function
export const checkRedisConnection = async (): Promise<boolean> => {
  try {
    if (!redisService.isHealthy) {
      await redisService.connect();
    }
    return await redisService.ping();
  } catch (error) {
    logger.error('Redis health check failed:', error);
    return false;
  }
};
