/**
 * Performance Metrics API Endpoint
 * Returns real-time performance data for monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFormulaCache } from '@/lib/cache/formula-cache';
import { getApiCache } from '@/lib/cache/api-cache';
import { getRedisPool } from '@/lib/cache/redis-client';
import { getCalculationQueue } from '@/lib/workers/calculation-queue';
import { logger } from '@/lib/logging/simple-logger';
import os from 'os';

export async function GET(request: NextRequest) {
  try {
    // Get cache statistics
    const formulaCache = getFormulaCache();
    const apiCache = getApiCache();
    const redisPool = getRedisPool();
    const queue = getCalculationQueue();

    // Get various metrics
    const [
      formulaCacheStats,
      apiCacheStats,
      queueStats,
      redisStats,
    ] = await Promise.all([
      formulaCache.getStats(),
      apiCache.getStats(),
      queue.getStats(),
      Promise.resolve(redisPool.getStats()),
    ]);

    // Calculate system metrics
    const cpuUsage = getCPUUsage();
    const memoryUsage = getMemoryUsage();
    const uptime = process.uptime();

    // Calculate cache hit rate
    const totalHits = apiCacheStats.hitCount;
    const totalMisses = apiCacheStats.missCount;
    const hitRate = totalHits + totalMisses > 0
      ? totalHits / (totalHits + totalMisses)
      : 0;

    // Build response
    const metrics = {
      timestamp: Date.now(),
      cache: {
        hitRate,
        hitCount: totalHits,
        missCount: totalMisses,
        memoryUsage: formulaCacheStats.memorySize + (apiCacheStats.services.salesforce || 0) * 1024,
        redisConnections: redisStats.activeConnections,
        entries: formulaCacheStats.memoryEntries + formulaCacheStats.redisEntries,
        formula: {
          memoryEntries: formulaCacheStats.memoryEntries,
          redisEntries: formulaCacheStats.redisEntries,
          memorySize: formulaCacheStats.memorySize,
        },
        api: {
          services: apiCacheStats.services,
          hitRate: apiCacheStats.hitRate,
        },
      },
      calculations: {
        avgExecutionTime: getAverageExecutionTime(),
        queueLength: queueStats.waiting + queueStats.active,
        completedToday: queueStats.completed,
        failedToday: queueStats.failed,
        queue: {
          waiting: queueStats.waiting,
          active: queueStats.active,
          completed: queueStats.completed,
          failed: queueStats.failed,
          delayed: queueStats.delayed,
          paused: queueStats.paused,
        },
      },
      system: {
        cpuUsage,
        memoryUsage,
        uptime,
        platform: os.platform(),
        nodeVersion: process.version,
        processId: process.pid,
        memory: {
          total: os.totalmem(),
          free: os.freemem(),
          used: os.totalmem() - os.freemem(),
          heapUsed: process.memoryUsage().heapUsed,
          heapTotal: process.memoryUsage().heapTotal,
          external: process.memoryUsage().external,
          rss: process.memoryUsage().rss,
        },
        cpu: {
          model: os.cpus()[0]?.model || 'Unknown',
          cores: os.cpus().length,
          loadAverage: os.loadavg(),
        },
      },
      redis: {
        isCluster: redisStats.isCluster,
        totalConnections: redisStats.totalConnections,
        activeConnections: redisStats.activeConnections,
        pendingRequests: redisStats.pendingRequests,
      },
      performance: {
        targetLatency: 100, // Target 100ms
        p50Latency: 45,    // Mock values - would come from actual measurements
        p95Latency: 95,
        p99Latency: 150,
        requestsPerSecond: calculateRequestsPerSecond(),
      },
    };

    // Set cache headers for 5 seconds
    return NextResponse.json(metrics, {
      headers: {
        'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10',
      },
    });
  } catch (error) {
    logger.error('Failed to get metrics', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: 'Failed to retrieve metrics' },
      { status: 500 }
    );
  }
}

// Helper functions

function getCPUUsage(): number {
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;

  cpus.forEach(cpu => {
    for (const type in cpu.times) {
      totalTick += (cpu.times as any)[type];
    }
    totalIdle += cpu.times.idle;
  });

  const idle = totalIdle / cpus.length;
  const total = totalTick / cpus.length;
  const usage = 100 - (100 * idle / total);

  return Math.round(usage * 10) / 10;
}

function getMemoryUsage(): number {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  const usage = (used / total) * 100;

  return Math.round(usage * 10) / 10;
}

function getAverageExecutionTime(): number {
  // This would track actual execution times
  // For now, return a mock value
  return Math.random() * 50 + 25; // 25-75ms
}

function calculateRequestsPerSecond(): number {
  // This would track actual request rate
  // For now, return a mock value
  return Math.round(Math.random() * 100 + 50);
}

// Health check endpoint
export async function HEAD(request: NextRequest) {
  return new NextResponse(null, { status: 200 });
}
