/**
 * Simple Health Check API Endpoint
 * Fast health check optimized for load balancer polling
 * Minimal overhead for frequent health checks
 */

import { NextRequest, NextResponse } from 'next/server';

// Fast health check with minimal processing
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Quick memory check to ensure system isn't overloaded
    const memUsage = process.memoryUsage();
    const memPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    // Fail if memory usage is critically high
    if (memPercentage > 95) {
      return NextResponse.json(
        {
          status: 'error',
          reason: 'high_memory_usage',
          memory: `${memPercentage.toFixed(1)}%`
        },
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'X-Health-Check': 'simple',
          }
        }
      );
    }

    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: Math.round(process.uptime()),
        memory: `${memPercentage.toFixed(1)}%`,
        responseTime: `${responseTime}ms`
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Health-Check': 'simple',
          'X-Response-Time': `${responseTime}ms`,
        }
      }
    );
  } catch (error) {
    console.error('Simple health check error:', error);

    return NextResponse.json(
      {
        status: 'error',
        reason: 'internal_error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'X-Health-Check': 'simple',
        }
      }
    );
  }
}

// HEAD request for even faster health checks
export async function HEAD(request: NextRequest) {
  try {
    const memUsage = process.memoryUsage();
    const memPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    return new NextResponse(null, {
      status: memPercentage > 95 ? 503 : 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Check': 'simple-head',
        'X-Memory-Usage': `${memPercentage.toFixed(1)}%`,
      },
    });
  } catch {
    return new NextResponse(null, {
      status: 503,
      headers: {
        'X-Health-Check': 'simple-head-error'
      }
    });
  }
}
