/**
 * Optimized Database Connection Pool
 * Minimizes memory usage with intelligent connection management
 */

import { PrismaClient } from '@prisma/client';

interface PoolConfig {
  min: number;
  max: number;
  idleTimeout: number;
  acquireTimeout: number;
  evictionRunInterval: number;
}

class OptimizedDatabasePool {
  private static instance: OptimizedDatabasePool;
  private prisma: PrismaClient | null = null;
  private connectionCount = 0;
  private lastActivity = Date.now();
  private poolConfig: PoolConfig;

  private constructor() {
    this.poolConfig = {
      min: parseInt(process.env.POOL_MIN || '1'),
      max: parseInt(process.env.POOL_MAX || '5'), // Reduced from 10
      idleTimeout: parseInt(process.env.POOL_IDLE_TIMEOUT || '60000'), // 1 minute
      acquireTimeout: 5000,
      evictionRunInterval: 30000, // Check every 30 seconds
    };

    this.initializePrisma();
    this.startConnectionMonitoring();
  }

  static getInstance(): OptimizedDatabasePool {
    if (!OptimizedDatabasePool.instance) {
      OptimizedDatabasePool.instance = new OptimizedDatabasePool();
    }
    return OptimizedDatabasePool.instance;
  }

  private initializePrisma() {
    // Use SQLite in-memory for staging to reduce resource usage
    const databaseUrl = process.env.DATABASE_URL || 'file:/data/paintbox.db';

    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      // Optimization: Reduce connection pool overhead
      // @ts-ignore - These options might not be in types but work in practice
      __internal: {
        previewFeatures: ['metrics', 'tracing'],
      },
    });

    // Set pragmas for SQLite optimization
    if (databaseUrl.includes('file:')) {
      this.optimizeSQLite();
    }

    // Middleware to track activity
    this.prisma.$use(async (params, next) => {
      this.lastActivity = Date.now();
      this.connectionCount++;

      try {
        const result = await next(params);
        return result;
      } finally {
        this.connectionCount--;
      }
    });
  }

  private async optimizeSQLite() {
    if (!this.prisma) return;

    try {
      // SQLite optimizations for memory efficiency
      await this.prisma.$executeRaw`PRAGMA journal_mode = WAL`;
      await this.prisma.$executeRaw`PRAGMA synchronous = NORMAL`;
      await this.prisma.$executeRaw`PRAGMA cache_size = -10000`; // 10MB cache
      await this.prisma.$executeRaw`PRAGMA temp_store = MEMORY`;
      await this.prisma.$executeRaw`PRAGMA mmap_size = 30000000000`;
      await this.prisma.$executeRaw`PRAGMA page_size = 4096`;
      await this.prisma.$executeRaw`PRAGMA optimize`;

      console.log('SQLite optimized for memory efficiency');
    } catch (error) {
      console.error('SQLite optimization failed:', error);
    }
  }

  private startConnectionMonitoring() {
    setInterval(() => {
      const idleTime = Date.now() - this.lastActivity;
      const memUsage = process.memoryUsage();
      const heapPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;

      // Aggressive connection cleanup under memory pressure
      if (heapPercentage > 80 && this.connectionCount === 0) {
        console.log('High memory detected, disconnecting idle database');
        this.disconnect();
      }

      // Disconnect after extended idle period
      if (idleTime > this.poolConfig.idleTimeout && this.connectionCount === 0) {
        console.log('Database idle, disconnecting to save memory');
        this.disconnect();
      }
    }, this.poolConfig.evictionRunInterval);
  }

  async getClient(): Promise<PrismaClient> {
    // Reconnect if disconnected
    if (!this.prisma) {
      console.log('Reconnecting to database');
      this.initializePrisma();
    }

    if (!this.prisma) {
      throw new Error('Failed to initialize database connection');
    }

    this.lastActivity = Date.now();
    return this.prisma;
  }

  async disconnect() {
    if (this.prisma) {
      await this.prisma.$disconnect();
      this.prisma = null;
      console.log('Database disconnected');
    }
  }

  async executeWithRetry<T>(
    operation: (prisma: PrismaClient) => Promise<T>,
    maxRetries = 3
  ): Promise<T> {
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const client = await this.getClient();
        return await operation(client);
      } catch (error) {
        lastError = error;
        console.error(`Database operation failed (attempt ${attempt + 1}):`, error);

        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));

        // Reconnect on connection errors
        if (error instanceof Error && error.message.includes('connection')) {
          await this.disconnect();
        }
      }
    }

    throw lastError;
  }

  // Optimized query methods

  async findUnique<T>(model: string, where: any): Promise<T | null> {
    return this.executeWithRetry(async (prisma) => {
      const modelAccess = (prisma as any)[model];
      return await modelAccess.findUnique({ where });
    });
  }

  async findMany<T>(
    model: string,
    options: {
      where?: any;
      take?: number;
      skip?: number;
      orderBy?: any;
      select?: any;
    } = {}
  ): Promise<T[]> {
    return this.executeWithRetry(async (prisma) => {
      const modelAccess = (prisma as any)[model];

      // Limit default results to prevent memory overload
      const queryOptions = {
        ...options,
        take: options.take || 100,
      };

      return await modelAccess.findMany(queryOptions);
    });
  }

  async create<T>(model: string, data: any): Promise<T> {
    return this.executeWithRetry(async (prisma) => {
      const modelAccess = (prisma as any)[model];
      return await modelAccess.create({ data });
    });
  }

  async update<T>(model: string, where: any, data: any): Promise<T> {
    return this.executeWithRetry(async (prisma) => {
      const modelAccess = (prisma as any)[model];
      return await modelAccess.update({ where, data });
    });
  }

  async delete<T>(model: string, where: any): Promise<T> {
    return this.executeWithRetry(async (prisma) => {
      const modelAccess = (prisma as any)[model];
      return await modelAccess.delete({ where });
    });
  }

  // Batch operations for efficiency

  async batchCreate<T>(model: string, data: any[]): Promise<number> {
    return this.executeWithRetry(async (prisma) => {
      const modelAccess = (prisma as any)[model];

      // Split into smaller batches to avoid memory spikes
      const batchSize = 100;
      let created = 0;

      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        const result = await modelAccess.createMany({ data: batch });
        created += result.count;
      }

      return created;
    });
  }

  async transaction<T>(operations: (prisma: PrismaClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    return await client.$transaction(operations);
  }

  getConnectionStats() {
    return {
      activeConnections: this.connectionCount,
      lastActivity: new Date(this.lastActivity).toISOString(),
      idleTime: Date.now() - this.lastActivity,
      poolConfig: this.poolConfig,
      isConnected: this.prisma !== null,
    };
  }
}

// Export singleton instance
export const db = OptimizedDatabasePool.getInstance();

// Export convenience functions
export async function withDatabase<T>(
  operation: (prisma: PrismaClient) => Promise<T>
): Promise<T> {
  return db.executeWithRetry(operation);
}

export async function getDatabase(): Promise<PrismaClient> {
  return db.getClient();
}

export { OptimizedDatabasePool };
