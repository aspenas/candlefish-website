/**
 * Metrics API Endpoint
 * Prometheus-compatible metrics for monitoring and alerting
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();
    const timestamp = Date.now();

    // Convert bytes to MB for readability
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const externalMB = Math.round(memUsage.external / 1024 / 1024);
    const rssMB = Math.round(memUsage.rss / 1024 / 1024);

    // Prometheus format metrics
    const metrics = [
      '# HELP paintbox_uptime_seconds Application uptime in seconds',
      '# TYPE paintbox_uptime_seconds gauge',
      `paintbox_uptime_seconds ${uptime}`,
      '',
      '# HELP paintbox_memory_heap_used_mb Memory heap used in MB',
      '# TYPE paintbox_memory_heap_used_mb gauge',
      `paintbox_memory_heap_used_mb ${heapUsedMB}`,
      '',
      '# HELP paintbox_memory_heap_total_mb Memory heap total in MB',
      '# TYPE paintbox_memory_heap_total_mb gauge',
      `paintbox_memory_heap_total_mb ${heapTotalMB}`,
      '',
      '# HELP paintbox_memory_external_mb External memory in MB',
      '# TYPE paintbox_memory_external_mb gauge',
      `paintbox_memory_external_mb ${externalMB}`,
      '',
      '# HELP paintbox_memory_rss_mb Resident set size in MB',
      '# TYPE paintbox_memory_rss_mb gauge',
      `paintbox_memory_rss_mb ${rssMB}`,
      '',
      '# HELP paintbox_memory_usage_percentage Memory usage percentage',
      '# TYPE paintbox_memory_usage_percentage gauge',
      `paintbox_memory_usage_percentage ${((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(2)}`,
      '',
      '# HELP paintbox_health_status Application health status (1=healthy, 0=unhealthy)',
      '# TYPE paintbox_health_status gauge',
      'paintbox_health_status 1',
      '',
      '# HELP paintbox_timestamp_seconds Current timestamp in seconds',
      '# TYPE paintbox_timestamp_seconds gauge',
      `paintbox_timestamp_seconds ${Math.floor(timestamp / 1000)}`,
      '',
    ].join('\n');

    return new NextResponse(metrics, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Metrics endpoint error:', error);

    const errorMetrics = [
      '# HELP paintbox_health_status Application health status (1=healthy, 0=unhealthy)',
      '# TYPE paintbox_health_status gauge',
      'paintbox_health_status 0',
      '',
      '# HELP paintbox_error_total Total number of errors',
      '# TYPE paintbox_error_total counter',
      'paintbox_error_total 1',
      '',
    ].join('\n');

    return new NextResponse(errorMetrics, {
      status: 500,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  }
}
