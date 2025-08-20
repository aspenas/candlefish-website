/**
 * Health Check API Endpoint
 * Comprehensive health monitoring for all system components
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logging/simple-logger';
import getCacheInstance from '@/lib/cache/cache-service';
import { getSecretsManager } from '@/lib/services/secrets-manager';

// Health check configuration
const HEALTH_CHECK_CONFIG = {
  timeout: 5000, // 5 seconds
  critical: ['database', 'redis', 'secrets', 'jwks'],
  optional: ['salesforce', 'companycam'],
};

interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  details?: any;
  error?: string;
}

interface HealthResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: Record<string, HealthCheckResult>;
  summary: {
    total: number;
    healthy: number;
    unhealthy: number;
    degraded: number;
  };
}

class HealthChecker {
  private startTime = Date.now();

  async checkDatabase(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Use a simple query to check database connectivity
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();

      await prisma.$queryRaw`SELECT 1 as health_check`;
      await prisma.$disconnect();

      return {
        name: 'database',
        status: 'healthy',
        responseTime: Date.now() - startTime,
        details: {
          type: 'postgresql',
          connected: true,
        },
      };
    } catch (error) {
      return {
        name: 'database',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Database connection failed',
      };
    }
  }

  async checkRedis(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const cache = getCacheInstance();

      // Test Redis with a simple set/get operation
      const testKey = `health_check_${Date.now()}`;
      const testValue = 'ok';

      await cache.set(testKey, testValue, 10); // 10 second TTL
      const result = await cache.get(testKey);
      await cache.del(testKey);

      if (result !== testValue) {
        throw new Error('Redis read/write test failed');
      }

      return {
        name: 'redis',
        status: 'healthy',
        responseTime: Date.now() - startTime,
        details: {
          type: 'redis',
          connected: true,
          test_passed: true,
        },
      };
    } catch (error) {
      return {
        name: 'redis',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Redis connection failed',
      };
    }
  }

  async checkSecrets(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const secretsManager = getSecretsManager();

      // Test secrets manager by attempting to retrieve secrets
      const secrets = await secretsManager.getSecrets();

      // Check if critical secrets are available
      const hasDatabase = Boolean(secrets.database?.url);
      const hasRedis = Boolean(secrets.redis?.url);

      if (!hasDatabase || !hasRedis) {
        return {
          name: 'secrets',
          status: 'degraded',
          responseTime: Date.now() - startTime,
          details: {
            secrets_accessible: true,
            database_config: hasDatabase,
            redis_config: hasRedis,
          },
        };
      }

      return {
        name: 'secrets',
        status: 'healthy',
        responseTime: Date.now() - startTime,
        details: {
          secrets_accessible: true,
          database_config: hasDatabase,
          redis_config: hasRedis,
        },
      };
    } catch (error) {
      return {
        name: 'secrets',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Secrets manager failed',
      };
    }
  }

  async checkSalesforce(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Import Salesforce service dynamically to avoid circular dependencies
      const { default: salesforceService } = await import('@/lib/services/salesforce-api');

      // Test Salesforce connectivity with a simple query
      const testResult = await salesforceService.testConnection();

      return {
        name: 'salesforce',
        status: testResult.success ? 'healthy' : 'degraded',
        responseTime: Date.now() - startTime,
        details: {
          connected: testResult.success,
          instance_url: testResult.instanceUrl,
          api_version: testResult.apiVersion,
        },
        error: testResult.success ? undefined : testResult.error,
      };
    } catch (error) {
      return {
        name: 'salesforce',
        status: 'degraded', // Optional service, so degraded rather than unhealthy
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Salesforce check failed',
      };
    }
  }

  async checkCompanyCam(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Import CompanyCam service dynamically
      const { default: companyCamService } = await import('@/lib/services/companycam-api');

      // Test CompanyCam API connectivity
      const testResult = await companyCamService.testConnection();

      return {
        name: 'companycam',
        status: testResult.success ? 'healthy' : 'degraded',
        responseTime: Date.now() - startTime,
        details: {
          connected: testResult.success,
          api_accessible: testResult.success,
        },
        error: testResult.success ? undefined : testResult.error,
      };
    } catch (error) {
      return {
        name: 'companycam',
        status: 'degraded', // Optional service
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'CompanyCam check failed',
      };
    }
  }

  async checkJWKS(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Test JWKS endpoint internally
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const jwksUrl = `${baseUrl}/.well-known/jwks.json`;

      const response = await fetch(jwksUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'PaintboxHealthCheck/1.0',
        },
        timeout: 5000,
      });

      if (!response.ok) {
        throw new Error(`JWKS endpoint returned ${response.status}: ${response.statusText}`);
      }

      const jwks = await response.json();

      if (!jwks.keys || !Array.isArray(jwks.keys)) {
        throw new Error('JWKS response missing keys array');
      }

      const keyCount = jwks.keys.length;

      if (keyCount === 0) {
        return {
          name: 'jwks',
          status: 'degraded',
          responseTime: Date.now() - startTime,
          details: {
            keyCount: 0,
            endpoint_accessible: true,
            keys_available: false,
          },
          error: 'No public keys available in JWKS',
        };
      }

      // Validate key structure
      const validKeys = jwks.keys.filter((key: any) =>
        key.kty && key.use && key.kid && key.alg && key.n && key.e
      );

      return {
        name: 'jwks',
        status: validKeys.length === keyCount ? 'healthy' : 'degraded',
        responseTime: Date.now() - startTime,
        details: {
          keyCount: keyCount,
          validKeyCount: validKeys.length,
          endpoint_accessible: true,
          keys_available: true,
          keyIds: jwks.keys.map((k: any) => k.kid),
        },
      };

    } catch (error) {
      return {
        name: 'jwks',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'JWKS check failed',
        details: {
          keyCount: 0,
          endpoint_accessible: false,
          keys_available: false,
        },
      };
    }
  }

  async checkDiskSpace(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const fs = require('fs').promises;
      const path = require('path');

      // Check available disk space
      const stats = await fs.statfs(process.cwd());
      const totalSpace = stats.blocks * stats.bsize;
      const freeSpace = stats.bavail * stats.bsize;
      const usedPercentage = ((totalSpace - freeSpace) / totalSpace) * 100;

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (usedPercentage > 90) {
        status = 'unhealthy';
      } else if (usedPercentage > 80) {
        status = 'degraded';
      }

      return {
        name: 'disk_space',
        status,
        responseTime: Date.now() - startTime,
        details: {
          total_gb: Math.round(totalSpace / (1024 ** 3)),
          free_gb: Math.round(freeSpace / (1024 ** 3)),
          used_percentage: Math.round(usedPercentage),
        },
      };
    } catch (error) {
      return {
        name: 'disk_space',
        status: 'degraded',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Disk space check failed',
      };
    }
  }

  async checkMemory(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const used = process.memoryUsage();
      const totalMemory = require('os').totalmem();
      const freeMemory = require('os').freemem();
      const usedPercentage = ((totalMemory - freeMemory) / totalMemory) * 100;

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (usedPercentage > 90) {
        status = 'unhealthy';
      } else if (usedPercentage > 80) {
        status = 'degraded';
      }

      return {
        name: 'memory',
        status,
        responseTime: Date.now() - startTime,
        details: {
          rss_mb: Math.round(used.rss / 1024 / 1024),
          heap_used_mb: Math.round(used.heapUsed / 1024 / 1024),
          heap_total_mb: Math.round(used.heapTotal / 1024 / 1024),
          external_mb: Math.round(used.external / 1024 / 1024),
          system_memory_used_percentage: Math.round(usedPercentage),
        },
      };
    } catch (error) {
      return {
        name: 'memory',
        status: 'degraded',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Memory check failed',
      };
    }
  }

  async runAllChecks(): Promise<HealthResponse> {
    const startTime = Date.now();

    // Run all health checks in parallel with timeout
    const checkPromises = [
      this.withTimeout(this.checkDatabase(), 'database'),
      this.withTimeout(this.checkRedis(), 'redis'),
      this.withTimeout(this.checkSecrets(), 'secrets'),
      this.withTimeout(this.checkJWKS(), 'jwks'),
      this.withTimeout(this.checkSalesforce(), 'salesforce'),
      this.withTimeout(this.checkCompanyCam(), 'companycam'),
      this.withTimeout(this.checkDiskSpace(), 'disk_space'),
      this.withTimeout(this.checkMemory(), 'memory'),
    ];

    const results = await Promise.allSettled(checkPromises);

    // Process results
    const checks: Record<string, HealthCheckResult> = {};
    const summary = { total: 0, healthy: 0, unhealthy: 0, degraded: 0 };

    results.forEach((result, index) => {
      let check: HealthCheckResult;

      if (result.status === 'fulfilled') {
        check = result.value;
      } else {
        // Handle timeout or other failures
        const checkNames = ['database', 'redis', 'secrets', 'jwks', 'salesforce', 'companycam', 'disk_space', 'memory'];
        check = {
          name: checkNames[index],
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          error: result.reason?.message || 'Health check failed',
        };
      }

      checks[check.name] = check;
      summary.total++;

      switch (check.status) {
        case 'healthy':
          summary.healthy++;
          break;
        case 'degraded':
          summary.degraded++;
          break;
        case 'unhealthy':
          summary.unhealthy++;
          break;
      }
    });

    // Determine overall health status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Check critical services
    const criticalServices = HEALTH_CHECK_CONFIG.critical;
    const criticalUnhealthy = criticalServices.some(service =>
      checks[service]?.status === 'unhealthy'
    );

    if (criticalUnhealthy) {
      overallStatus = 'unhealthy';
    } else if (summary.unhealthy > 0 || summary.degraded > 0) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks,
      summary,
    };
  }

  private async withTimeout<T>(promise: Promise<T>, name: string): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Health check timeout for ${name} after ${HEALTH_CHECK_CONFIG.timeout}ms`));
      }, HEALTH_CHECK_CONFIG.timeout);
    });

    return Promise.race([promise, timeoutPromise]);
  }
}

// API Route Handler
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    logger.info('Health check requested', {
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
    });

    const checker = new HealthChecker();
    const healthResponse = await checker.runAllChecks();

    // Determine HTTP status code based on health
    let statusCode = 200;
    if (healthResponse.status === 'degraded') {
      statusCode = 200; // Still operational
    } else if (healthResponse.status === 'unhealthy') {
      statusCode = 503; // Service unavailable
    }

    // Log health check result
    logger.info('Health check completed', {
      status: healthResponse.status,
      duration: Date.now() - startTime,
      summary: healthResponse.summary,
    });

    return NextResponse.json(healthResponse, {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown health check error';

    logger.error('Health check failed', {
      error: errorMessage,
      duration: Date.now() - startTime,
    });

    const errorResponse: HealthResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: 0,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        error: {
          name: 'error',
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          error: errorMessage,
        },
      },
      summary: {
        total: 1,
        healthy: 0,
        unhealthy: 1,
        degraded: 0,
      },
    };

    return NextResponse.json(errorResponse, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  }
}

// Also support HEAD requests for simple up/down checks
export async function HEAD(request: NextRequest) {
  try {
    const checker = new HealthChecker();

    // Quick check of just critical services
    const criticalChecks = await Promise.allSettled([
      checker.checkDatabase(),
      checker.checkRedis(),
      checker.checkSecrets(),
      checker.checkJWKS(),
    ]);

    const hasUnhealthy = criticalChecks.some(result =>
      result.status === 'fulfilled' && result.value.status === 'unhealthy'
    );

    const statusCode = hasUnhealthy ? 503 : 200;

    return new NextResponse(null, {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (error) {
    return new NextResponse(null, { status: 503 });
  }
}
