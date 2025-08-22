/**
 * Comprehensive Health Check API Endpoint
 * Production-grade health monitoring for Fly.io deployment
 */

import { NextRequest, NextResponse } from 'next/server';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  service: string;
  version: string;
  environment: string;
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  checks: {
    [key: string]: {
      status: 'pass' | 'fail' | 'warn';
      message?: string;
      responseTime?: number;
    };
  };
}

async function performHealthChecks(): Promise<HealthStatus['checks']> {
  const checks: HealthStatus['checks'] = {};

  // Memory check
  const memUsed = process.memoryUsage();
  const memTotal = memUsed.heapTotal + memUsed.external;
  const memPercentage = (memUsed.heapUsed / memUsed.heapTotal) * 100;

  checks.memory = {
    status: memPercentage > 95 ? 'fail' : memPercentage > 85 ? 'warn' : 'pass',
    message: `Memory usage: ${memPercentage.toFixed(1)}%`
  };

  // JWKS configuration check (local check to avoid circular dependency)
  try {
    const jwksStart = Date.now();

    // Check if JWKS secrets are available instead of making HTTP request
    const hasJwksSecret = process.env.PAINTBOX_JWKS_PRIVATE_KEY || process.env.AWS_REGION;
    const jwksTime = Date.now() - jwksStart;

    checks.jwks = {
      status: hasJwksSecret ? 'pass' : 'warn',
      message: hasJwksSecret ? 'JWKS configuration available' : 'JWKS configuration not fully available',
      responseTime: jwksTime
    };
  } catch (error) {
    checks.jwks = {
      status: 'warn',
      message: `JWKS config check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }

  // Disk space check (if mounted volume exists)
  try {
    const fs = await import('fs/promises');
    await fs.access('/data');
    checks.storage = {
      status: 'pass',
      message: 'Storage accessible'
    };
  } catch {
    checks.storage = {
      status: 'warn',
      message: 'Storage not accessible or not mounted'
    };
  }

  return checks;
}

// Comprehensive health check that returns detailed status
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const memUsage = process.memoryUsage();
    const checks = await performHealthChecks();

    // Determine overall status - only fail for critical system issues
    const hasFailures = Object.values(checks).some(check =>
      check.status === 'fail' && check.message?.includes('Memory usage')
    );
    const hasWarnings = Object.values(checks).some(check => check.status === 'warn');

    const overallStatus: HealthStatus['status'] = hasFailures ? 'unhealthy' : hasWarnings ? 'degraded' : 'healthy';
    const httpStatus = hasFailures ? 503 : 200;

    const healthData: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      service: 'paintbox',
      version: process.env.npm_package_version || '0.1.0',
      environment: process.env.NODE_ENV || 'production',
      uptime: Math.round(process.uptime()),
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024),
        total: Math.round(memUsage.heapTotal / 1024 / 1024),
        percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
      },
      checks
    };

    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      healthData,
      {
        status: httpStatus,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Response-Time': `${responseTime}ms`,
          'X-Health-Status': overallStatus,
        },
      }
    );
  } catch (error) {
    console.error('Health check error:', error);

    const errorResponse: Partial<HealthStatus> = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'paintbox',
      environment: process.env.NODE_ENV || 'production',
      checks: {
        system: {
          status: 'fail',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      }
    };

    return NextResponse.json(
      errorResponse,
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Health-Status': 'unhealthy',
        },
      }
    );
  }
}

// Support HEAD requests for simple up/down checks
export async function HEAD(request: NextRequest) {
  try {
    // Quick memory check for HEAD requests
    const memUsage = process.memoryUsage();
    const memPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    const status = memPercentage > 95 ? 503 : 200;

    return new NextResponse(null, {
      status,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Memory-Usage': `${memPercentage.toFixed(1)}%`,
        'X-Uptime': `${Math.round(process.uptime())}s`,
      },
    });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
