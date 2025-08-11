import { Request, Response } from 'express';
import { checkDatabaseConnection } from '../config/database';
import { checkRedisConnection } from '../config/redis';
import { ApiResponse } from '../types';
import { logger } from '../utils/logger';

const moduleLogger = logger.child({ module: 'HealthController' });

interface HealthCheck {
  service: string;
  status: 'healthy' | 'unhealthy';
  responseTime?: number;
  error?: string;
  details?: any;
}

/**
 * Basic health check endpoint
 */
export const healthCheck = async (req: Request, res: Response): Promise<void> => {
  const response: ApiResponse<{
    status: 'healthy';
    uptime: number;
    timestamp: string;
  }> = {
    success: true,
    data: {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: 'v1',
    },
  };

  res.status(200).json(response);
};

/**
 * Detailed health check with dependencies
 */
export const detailedHealthCheck = async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  const checks: HealthCheck[] = [];

  // Check database connection
  const dbStartTime = Date.now();
  try {
    const dbHealthy = await checkDatabaseConnection();
    checks.push({
      service: 'database',
      status: dbHealthy ? 'healthy' : 'unhealthy',
      responseTime: Date.now() - dbStartTime,
    });
  } catch (error) {
    checks.push({
      service: 'database',
      status: 'unhealthy',
      responseTime: Date.now() - dbStartTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Check Redis connection
  const redisStartTime = Date.now();
  try {
    const redisHealthy = await checkRedisConnection();
    checks.push({
      service: 'redis',
      status: redisHealthy ? 'healthy' : 'unhealthy',
      responseTime: Date.now() - redisStartTime,
    });
  } catch (error) {
    checks.push({
      service: 'redis',
      status: 'unhealthy',
      responseTime: Date.now() - redisStartTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Check memory usage
  const memUsage = process.memoryUsage();
  checks.push({
    service: 'memory',
    status: memUsage.heapUsed < 512 * 1024 * 1024 ? 'healthy' : 'unhealthy', // 512MB threshold
    details: {
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
    },
  });

  const allHealthy = checks.every(check => check.status === 'healthy');
  const totalResponseTime = Date.now() - startTime;

  const response: ApiResponse<{
    status: 'healthy' | 'unhealthy';
    uptime: number;
    timestamp: string;
    responseTime: number;
    checks: HealthCheck[];
    version: string;
    environment: string;
  }> = {
    success: true,
    data: {
      status: allHealthy ? 'healthy' : 'unhealthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      responseTime: totalResponseTime,
      checks,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'unknown',
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: 'v1',
    },
  };

  const statusCode = allHealthy ? 200 : 503;

  if (!allHealthy) {
    moduleLogger.warn('Health check failed', {
      checks: checks.filter(check => check.status === 'unhealthy'),
    });
  }

  res.status(statusCode).json(response);
};

/**
 * Readiness check for Kubernetes/Docker
 */
export const readinessCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check critical dependencies
    const dbHealthy = await checkDatabaseConnection();
    const redisHealthy = await checkRedisConnection();

    if (dbHealthy && redisHealthy) {
      const response: ApiResponse<{
        status: 'ready';
        timestamp: string;
      }> = {
        success: true,
        data: {
          status: 'ready',
          timestamp: new Date().toISOString(),
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: 'v1',
        },
      };

      res.status(200).json(response);
    } else {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'NOT_READY',
          message: 'Service dependencies are not ready',
        },
        meta: {
          timestamp: new Date().toISOString(),
          version: 'v1',
        },
      };

      res.status(503).json(response);
    }
  } catch (error) {
    moduleLogger.error('Readiness check failed:', error);

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'READINESS_CHECK_FAILED',
        message: 'Readiness check failed',
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: 'v1',
      },
    };

    res.status(503).json(response);
  }
};

/**
 * Liveness check for Kubernetes/Docker
 */
export const livenessCheck = async (req: Request, res: Response): Promise<void> => {
  const response: ApiResponse<{
    status: 'alive';
    uptime: number;
    timestamp: string;
  }> = {
    success: true,
    data: {
      status: 'alive',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
    meta: {
      timestamp: new Date().toISOString(),
      version: 'v1',
    },
  };

  res.status(200).json(response);
};
