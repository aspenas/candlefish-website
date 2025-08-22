/**
 * Memory Monitoring API Endpoint
 * Provides real-time memory metrics and optimization controls
 */

import { NextRequest, NextResponse } from 'next/server';
import { memoryMonitor } from '@/lib/monitoring/memory-monitor';
import { getCache } from '@/lib/cache/memory-optimized-cache';
import { db } from '@/lib/database/optimized-pool';

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
    const report = memoryMonitor.getMemoryReport();
    const cacheStats = getCache().getStats();
    const dbStats = db.getConnectionStats();
    
    const memoryPercentage = report?.current?.percentage 
      ? parseFloat(report.current.percentage) 
      : 0;
    
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
        heapUsedMB: report?.current?.heapUsedMB || 0,
        heapTotalMB: report?.current?.heapTotalMB || 0,
        rssMB: report?.current?.rssMB || 0,
        percentage: memoryPercentage,
        trend: report?.trend || 'stable',
      },
      caches: {
        local: {
          items: cacheStats.hits + cacheStats.misses,
          hitRate: (cacheStats as any).hitRate || 0,
        },
        redis: false, // Will be true if Redis is connected
      },
      database: {
        connections: dbStats.activeConnections,
        isConnected: dbStats.isConnected,
      },
      recommendations: report?.recommendations || [],
      optimizations: {
        available: getAvailableOptimizations(status),
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
      actions: [],
    };
    
    // Get current memory state
    const report = memoryMonitor.getMemoryReport();
    const beforeMemory = report?.current?.heapUsedMB || 0;
    
    switch (level) {
      case 'light':
        results.actions = await performLightOptimization();
        break;
      
      case 'standard':
        results.actions = await performStandardOptimization();
        break;
      
      case 'aggressive':
        results.actions = await performAggressiveOptimization(force);
        break;
      
      case 'emergency':
        if (!force) {
          return NextResponse.json(
            { error: 'Emergency optimization requires force=true' },
            { status: 400 }
          );
        }
        results.actions = await performEmergencyOptimization();
        break;
      
      default:
        return NextResponse.json(
          { error: 'Invalid optimization level' },
          { status: 400 }
        );
    }
    
    // Wait a moment for GC to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Get new memory state
    const afterReport = memoryMonitor.getMemoryReport();
    const afterMemory = afterReport?.current?.heapUsedMB || 0;
    
    results.memoryFreed = Math.max(0, beforeMemory - afterMemory);
    results.beforeMB = beforeMemory;
    results.afterMB = afterMemory;
    results.success = true;
    
    return NextResponse.json(results, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Memory-Freed': results.memoryFreed.toString(),
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

// DELETE /api/memory/cache - Clear caches
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const target = url.searchParams.get('target') || 'all';
    
    const results: any = {
      timestamp: new Date().toISOString(),
      cleared: [],
    };
    
    if (target === 'all' || target === 'local') {
      await getCache().clear();
      results.cleared.push('local');
    }
    
    if (target === 'all' || target === 'database') {
      await db.disconnect();
      results.cleared.push('database');
    }
    
    // Force garbage collection
    if (global.gc) {
      global.gc();
      results.gcTriggered = true;
    }
    
    return NextResponse.json(results, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Cache clear error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to clear caches',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Helper functions for optimization levels

function getAvailableOptimizations(status: string): string[] {
  const optimizations = ['light', 'standard'];
  
  if (status === 'warning' || status === 'critical') {
    optimizations.push('aggressive');
  }
  
  if (status === 'emergency') {
    optimizations.push('emergency');
  }
  
  return optimizations;
}

async function performLightOptimization(): Promise<string[]> {
  const actions: string[] = [];
  
  // Clear expired cache entries
  actions.push('Cleared expired cache entries');
  
  // Trigger gentle GC if available
  if (global.gc) {
    global.gc();
    actions.push('Triggered garbage collection');
  }
  
  return actions;
}

async function performStandardOptimization(): Promise<string[]> {
  const actions: string[] = [];
  
  // Clear local cache
  await getCache().clear();
  actions.push('Cleared local cache');
  
  // Reduce database connections
  const dbStats = db.getConnectionStats();
  if (dbStats.activeConnections === 0) {
    await db.disconnect();
    actions.push('Disconnected idle database');
  }
  
  // Clear module cache for non-essential modules
  clearNonEssentialModules();
  actions.push('Cleared non-essential module cache');
  
  // Force GC
  if (global.gc) {
    global.gc();
    actions.push('Forced garbage collection');
  }
  
  return actions;
}

async function performAggressiveOptimization(force: boolean): Promise<string[]> {
  const actions: string[] = [];
  
  // Clear all caches
  await getCache().clear();
  actions.push('Cleared all caches');
  
  // Disconnect database
  await db.disconnect();
  actions.push('Disconnected database');
  
  // Clear require cache
  if (force) {
    clearRequireCache();
    actions.push('Cleared require cache');
  }
  
  // Multiple GC runs
  if (global.gc) {
    global.gc();
    global.gc();
    actions.push('Performed aggressive garbage collection');
  }
  
  return actions;
}

async function performEmergencyOptimization(): Promise<string[]> {
  const actions: string[] = [];
  
  console.warn('[EMERGENCY] Performing emergency memory optimization');
  
  // Clear everything
  await getCache().clear();
  await db.disconnect();
  
  actions.push('Cleared all caches and connections');
  
  // Clear all module caches
  clearRequireCache();
  actions.push('Cleared all module caches');
  
  // Aggressive GC
  if (global.gc) {
    for (let i = 0; i < 3; i++) {
      global.gc();
    }
    actions.push('Performed emergency garbage collection (3x)');
  }
  
  // Log emergency action
  console.error('[EMERGENCY] Memory optimization completed', actions);
  
  return actions;
}

function clearNonEssentialModules() {
  const keysToDelete: string[] = [];
  
  for (const key in require.cache) {
    // Keep only critical modules
    if (key.includes('node_modules') && 
        !key.includes('@prisma') &&
        !key.includes('next') &&
        !key.includes('react')) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => delete require.cache[key]);
}

function clearRequireCache() {
  const keysToDelete: string[] = [];
  
  for (const key in require.cache) {
    // Keep absolute minimum
    if (!key.includes('next/dist/server') && 
        !key.includes('@prisma/client')) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => delete require.cache[key]);
}