/**
 * Production Health Check API
 * Comprehensive health monitoring for all production services
 */

import { NextRequest, NextResponse } from 'next/server';
import { salesforceService } from '@/lib/services/salesforce';
import { companyCamApi } from '@/lib/services/companycam-api';
import { getCacheInstance } from '@/lib/cache/cache-service';
import { logger } from '@/lib/logging/simple-logger';
import {
  salesforceCircuitBreaker,
  companyCamCircuitBreaker,
  redisCircuitBreaker,
  withErrorHandler
} from '@/lib/middleware/error-handler';

interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency?: number;
  details?: Record<string, any>;
  error?: string;
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  services: HealthCheckResult[];
  overall: {
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
  circuitBreakers: {
    salesforce: any;
    companyCam: any;
    redis: any;
  };
}

async function checkService<T>(
  serviceName: string,
  checkFn: () => Promise<T>,
  timeout: number = 5000
): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    await Promise.race([
      checkFn(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Health check timeout')), timeout)
      ),
    ]);

    const latency = Date.now() - startTime;

    return {
      service: serviceName,
      status: latency > 2000 ? 'degraded' : 'healthy',
      latency,
    };
  } catch (error) {
    return {
      service: serviceName,
      status: 'unhealthy',
      latency: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function performHealthCheck(): Promise<SystemHealth> {
  logger.info('Starting production health check');

  // Check all services in parallel
  const [
    salesforceHealth,
    companyCamHealth,
    redisHealth,
    databaseHealth,
  ] = await Promise.all([
    // Salesforce health check
    checkService('salesforce', async () => {
      await salesforceService.testConnection();
    }),

    // CompanyCam health check
    checkService('companycam', async () => {
      const health = await companyCamApi.healthCheck();
      if (health.status !== 'online') {
        throw new Error(health.details?.reason || 'Service offline');
      }
    }),

    // Redis health check
    checkService('redis', async () => {
      const cache = getCacheInstance();
      await cache.get('health-check-test');
    }),

    // Database health check (if implemented)
    checkService('database', async () => {
      // For now, check if DATABASE_URL is configured
      if (!process.env.DATABASE_URL) {
        throw new Error('Database URL not configured');
      }
      // TODO: Add actual database ping when database service is implemented
    }),
  ]);

  const services = [salesforceHealth, companyCamHealth, redisHealth, databaseHealth];

  // Calculate overall status
  const counts = services.reduce(
    (acc, service) => {
      acc[service.status]++;
      return acc;
    },
    { healthy: 0, degraded: 0, unhealthy: 0 }
  );

  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (counts.unhealthy > 0) {
    overallStatus = 'unhealthy';
  } else if (counts.degraded > 0) {
    overallStatus = 'degraded';
  }

  const health: SystemHealth = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    services,
    overall: counts,
    circuitBreakers: {
      salesforce: salesforceCircuitBreaker.getState(),
      companyCam: companyCamCircuitBreaker.getState(),
      redis: redisCircuitBreaker.getState(),
    },
  };

  logger.info('Production health check completed', {
    status: overallStatus,
    services: counts
  });

  return health;
}

// GET /api/health/production - Full health check
export const GET = withErrorHandler(async (request: NextRequest) => {
  const detailed = request.nextUrl.searchParams.get('detailed') === 'true';

  const health = await performHealthCheck();

  // Return appropriate status code
  const statusCode = health.status === 'healthy' ? 200 :
                    health.status === 'degraded' ? 200 : 503;

  const response = detailed ? health : {
    status: health.status,
    timestamp: health.timestamp,
    version: health.version,
    environment: health.environment,
    services: health.services.map(s => ({
      service: s.service,
      status: s.status,
    })),
  };

  return NextResponse.json(response, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
});

// HEAD /api/health/production - Quick status check
export const HEAD = withErrorHandler(async () => {
  const health = await performHealthCheck();

  const statusCode = health.status === 'healthy' ? 200 :
                    health.status === 'degraded' ? 200 : 503;

  return new NextResponse(null, {
    status: statusCode,
    headers: {
      'X-Health-Status': health.status,
      'X-Health-Timestamp': health.timestamp,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
});
