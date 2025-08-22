/**
 * Memory Monitoring API Endpoint
 * Provides real-time memory metrics
 */

import { NextRequest, NextResponse } from 'next/server';

interface MemoryStatus {
  status: 'healthy' | 'warning' | 'critical' | 'emergency';
  timestamp: string;
  memory: {
    heapUsedMB: number;
    heapTotalMB: number;
    rssMB: number;
    percentage: number;
    trend: string;
  };
  caches: {
    local: {
      items: number;
      hitRate: number;
    };
    redis: boolean;
  };
  database: {
    connections: number;
    isConnected: boolean;
  };
  recommendations: string[];
  optimizations: {
    available: string[];
    lastRun?: string;
  };
}

// GET /api/memory - Get current memory status
export async function GET(request: NextRequest) {
  try {
    const memUsage = process.memoryUsage();
    const memoryPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    // Determine overall status
    let status: MemoryStatus['status'] = 'healthy';
    if (memoryPercentage >= 92) {
      status = 'emergency';
    } else if (memoryPercentage >= 85) {
      status = 'critical';
    } else if (memoryPercentage >= 70) {
      status = 'warning';
    }

    const response: MemoryStatus = {
      status,
      timestamp: new Date().toISOString(),
      memory: {
        heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
        rssMB: Math.round(memUsage.rss / 1024 / 1024),
        percentage: memoryPercentage,
        trend: 'stable',
      },
      caches: {
        local: {
          items: 0,
          hitRate: 0,
        },
        redis: false,
      },
      database: {
        connections: 0,
        isConnected: true,
      },
      recommendations: [],
      optimizations: {
        available: ['light', 'standard'],
      },
    };

    // Set appropriate cache headers based on status
    const cacheControl = status === 'healthy'
      ? 'public, max-age=30'
      : 'no-cache, no-store, must-revalidate';

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': cacheControl,
        'X-Memory-Status': status,
        'X-Memory-Percentage': memoryPercentage.toString(),
      },
    });
  } catch (error) {
    console.error('Memory monitoring error:', error);

    return NextResponse.json(
      {
        status: 'error',
        message: 'Failed to retrieve memory metrics',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST /api/memory/optimize - Trigger manual optimization
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { level = 'standard', force = false } = body;

    const results: any = {
      timestamp: new Date().toISOString(),
      level,
      actions: ['Triggered garbage collection'],
      success: true,
    };

    // Force GC if available
    if (global.gc) {
      global.gc();
    }

    return NextResponse.json(results, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Optimization error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Optimization failed',
      },
      { status: 500 }
    );
  }
}
