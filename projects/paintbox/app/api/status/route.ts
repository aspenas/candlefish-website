/**
 * System Status API Endpoint
 * Provides detailed system status information for monitoring dashboards
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logging/simple-logger';
import getCacheInstance from '@/lib/cache/cache-service';

interface SystemMetrics {
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    total: number;
    free: number;
    used: number;
    usagePercentage: number;
    heap: {
      used: number;
      total: number;
      limit: number;
    };
  };
  process: {
    pid: number;
    uptime: number;
    version: string;
    platform: string;
    arch: string;
  };
  network: {
    connections: number;
    activeHandles: number;
    activeRequests: number;
  };
  disk?: {
    total: number;
    free: number;
    used: number;
    usagePercentage: number;
  };
}

interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'error' | 'unknown';
  pid?: number;
  uptime?: number;
  memory?: number;
  cpu?: number;
  restarts?: number;
}

interface SystemStatusResponse {
  timestamp: string;
  environment: string;
  version: string;
  status: 'healthy' | 'degraded' | 'critical';
  metrics: SystemMetrics;
  services: ServiceStatus[];
  alerts: Array<{
    level: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    timestamp: string;
    component: string;
  }>;
  performance: {
    requestsPerMinute: number;
    averageResponseTime: number;
    errorRate: number;
  };
}

class SystemStatusCollector {
  private cache = getCacheInstance();

  async collectMetrics(): Promise<SystemMetrics> {
    const os = require('os');
    const process = global.process;
    
    // CPU metrics
    const cpuUsage = process.cpuUsage();
    const loadAverage = os.loadavg();
    
    // Memory metrics
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    
    // Process metrics
    const processMetrics = {
      pid: process.pid,
      uptime: process.uptime(),
      version: process.version,
      platform: process.platform,
      arch: process.arch,
    };
    
    // Network metrics (approximated)
    const activeHandles = (process as any)._getActiveHandles()?.length || 0;
    const activeRequests = (process as any)._getActiveRequests()?.length || 0;
    
    const metrics: SystemMetrics = {
      cpu: {
        usage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
        loadAverage,
      },
      memory: {
        total: totalMemory,
        free: freeMemory,
        used: usedMemory,
        usagePercentage: (usedMemory / totalMemory) * 100,
        heap: {
          used: memoryUsage.heapUsed,
          total: memoryUsage.heapTotal,
          limit: memoryUsage.rss,
        },
      },
      process: processMetrics,
      network: {
        connections: 0, // Would need netstat parsing
        activeHandles,
        activeRequests,
      },
    };
    
    // Try to get disk metrics (if available)
    try {
      const fs = require('fs').promises;
      const stats = await fs.statfs(process.cwd());
      const totalDisk = stats.blocks * stats.bsize;
      const freeDisk = stats.bavail * stats.bsize;
      const usedDisk = totalDisk - freeDisk;
      
      metrics.disk = {
        total: totalDisk,
        free: freeDisk,
        used: usedDisk,
        usagePercentage: (usedDisk / totalDisk) * 100,
      };
    } catch (error) {
      // Disk metrics not available on this platform
    }
    
    return metrics;
  }

  async getServiceStatuses(): Promise<ServiceStatus[]> {
    const services: ServiceStatus[] = [];
    
    try {
      // Try to get PM2 service status
      const pm2Status = await this.getPM2Status();
      services.push(...pm2Status);
    } catch (error) {
      // PM2 not available, try alternative methods
    }
    
    // Add current process as a service
    services.push({
      name: 'paintbox-app',
      status: 'running',
      pid: process.pid,
      uptime: process.uptime(),
      memory: process.memoryUsage().rss,
      cpu: 0, // Would need sampling over time
      restarts: 0,
    });
    
    return services;
  }

  private async getPM2Status(): Promise<ServiceStatus[]> {
    return new Promise((resolve, reject) => {
      const { exec } = require('child_process');
      
      exec('pm2 jlist', (error: any, stdout: string, stderr: string) => {
        if (error) {
          reject(error);
          return;
        }
        
        try {
          const processes = JSON.parse(stdout);
          const services = processes.map((proc: any) => ({
            name: proc.name,
            status: proc.pm2_env.status === 'online' ? 'running' : 'stopped',
            pid: proc.pid,
            uptime: Date.now() - proc.pm2_env.pm_uptime,
            memory: proc.monit.memory,
            cpu: proc.monit.cpu,
            restarts: proc.pm2_env.restart_time,
          }));
          
          resolve(services);
        } catch (parseError) {
          reject(parseError);
        }
      });
    });
  }

  async collectPerformanceMetrics(): Promise<{
    requestsPerMinute: number;
    averageResponseTime: number;
    errorRate: number;
  }> {
    try {
      // Get performance metrics from cache
      const metricsKey = 'performance_metrics';
      const cached = await this.cache.get(metricsKey);
      
      if (cached) {
        return JSON.parse(cached);
      }
      
      // Default metrics if none cached
      return {
        requestsPerMinute: 0,
        averageResponseTime: 0,
        errorRate: 0,
      };
    } catch (error) {
      return {
        requestsPerMinute: 0,
        averageResponseTime: 0,
        errorRate: 0,
      };
    }
  }

  async generateAlerts(metrics: SystemMetrics, services: ServiceStatus[]): Promise<Array<{
    level: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    timestamp: string;
    component: string;
  }>> {
    const alerts = [];
    const timestamp = new Date().toISOString();
    
    // Memory alerts
    if (metrics.memory.usagePercentage > 90) {
      alerts.push({
        level: 'critical' as const,
        message: `Memory usage critical: ${metrics.memory.usagePercentage.toFixed(1)}%`,
        timestamp,
        component: 'memory',
      });
    } else if (metrics.memory.usagePercentage > 80) {
      alerts.push({
        level: 'warning' as const,
        message: `Memory usage high: ${metrics.memory.usagePercentage.toFixed(1)}%`,
        timestamp,
        component: 'memory',
      });
    }
    
    // CPU alerts
    const avgLoad = metrics.cpu.loadAverage[0];
    const cpuCores = require('os').cpus().length;
    const loadPercentage = (avgLoad / cpuCores) * 100;
    
    if (loadPercentage > 90) {
      alerts.push({
        level: 'critical' as const,
        message: `CPU load critical: ${loadPercentage.toFixed(1)}%`,
        timestamp,
        component: 'cpu',
      });
    } else if (loadPercentage > 80) {
      alerts.push({
        level: 'warning' as const,
        message: `CPU load high: ${loadPercentage.toFixed(1)}%`,
        timestamp,
        component: 'cpu',
      });
    }
    
    // Disk space alerts
    if (metrics.disk && metrics.disk.usagePercentage > 90) {
      alerts.push({
        level: 'critical' as const,
        message: `Disk space critical: ${metrics.disk.usagePercentage.toFixed(1)}%`,
        timestamp,
        component: 'disk',
      });
    } else if (metrics.disk && metrics.disk.usagePercentage > 80) {
      alerts.push({
        level: 'warning' as const,
        message: `Disk space high: ${metrics.disk.usagePercentage.toFixed(1)}%`,
        timestamp,
        component: 'disk',
      });
    }
    
    // Service alerts
    const stoppedServices = services.filter(s => s.status === 'stopped' || s.status === 'error');
    for (const service of stoppedServices) {
      alerts.push({
        level: 'error' as const,
        message: `Service ${service.name} is ${service.status}`,
        timestamp,
        component: 'service',
      });
    }
    
    // High restart count alerts
    const highRestartServices = services.filter(s => (s.restarts || 0) > 5);
    for (const service of highRestartServices) {
      alerts.push({
        level: 'warning' as const,
        message: `Service ${service.name} has restarted ${service.restarts} times`,
        timestamp,
        component: 'service',
      });
    }
    
    return alerts;
  }

  determineOverallStatus(
    metrics: SystemMetrics, 
    services: ServiceStatus[], 
    alerts: any[]
  ): 'healthy' | 'degraded' | 'critical' {
    const criticalAlerts = alerts.filter(a => a.level === 'critical');
    const errorAlerts = alerts.filter(a => a.level === 'error');
    
    if (criticalAlerts.length > 0) {
      return 'critical';
    }
    
    if (errorAlerts.length > 0 || 
        metrics.memory.usagePercentage > 80 || 
        (metrics.disk && metrics.disk.usagePercentage > 80)) {
      return 'degraded';
    }
    
    return 'healthy';
  }
}

// Format bytes helper
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// API Route Handler
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    logger.info('System status requested', {
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
    });

    const collector = new SystemStatusCollector();
    
    // Collect all system information
    const [metrics, services, performance] = await Promise.all([
      collector.collectMetrics(),
      collector.getServiceStatuses(),
      collector.collectPerformanceMetrics(),
    ]);
    
    // Generate alerts based on collected data
    const alerts = await collector.generateAlerts(metrics, services);
    
    // Determine overall system status
    const overallStatus = collector.determineOverallStatus(metrics, services, alerts);
    
    const response: SystemStatusResponse = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      status: overallStatus,
      metrics,
      services,
      alerts,
      performance,
    };
    
    logger.info('System status collected', {
      status: overallStatus,
      duration: Date.now() - startTime,
      servicesCount: services.length,
      alertsCount: alerts.length,
    });
    
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown status collection error';
    
    logger.error('System status collection failed', {
      error: errorMessage,
      duration: Date.now() - startTime,
    });
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      status: 'critical',
      error: errorMessage,
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  }
}

// Simple status endpoint for quick checks
export async function HEAD(request: NextRequest) {
  try {
    const collector = new SystemStatusCollector();
    const metrics = await collector.collectMetrics();
    
    // Quick status based on basic metrics
    const memoryOk = metrics.memory.usagePercentage < 95;
    const diskOk = !metrics.disk || metrics.disk.usagePercentage < 95;
    
    const statusCode = (memoryOk && diskOk) ? 200 : 503;
    
    return new NextResponse(null, { 
      status: statusCode,
      headers: {
        'X-Memory-Usage': metrics.memory.usagePercentage.toFixed(1),
        'X-Disk-Usage': metrics.disk ? metrics.disk.usagePercentage.toFixed(1) : 'unknown',
        'X-Uptime': metrics.process.uptime.toString(),
      },
    });
    
  } catch (error) {
    return new NextResponse(null, { status: 503 });
  }
}