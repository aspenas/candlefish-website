// Prometheus metrics endpoint for monitoring
import { NextResponse } from 'next/server';

// In-memory storage for metrics (in production, consider using a proper metrics library)
const metrics = new Map<string, number>();
const histograms = new Map<string, number[]>();

// Helper function to record metrics
export function recordMetric(name: string, value: number, labels?: Record<string, string>) {
  const key = labels ? `${name}{${Object.entries(labels).map(([k, v]) => `${k}="${v}"`).join(',')}}` : name;
  metrics.set(key, value);
}

// Helper function to record histogram metrics
export function recordHistogram(name: string, value: number, labels?: Record<string, string>) {
  const key = labels ? `${name}{${Object.entries(labels).map(([k, v]) => `${k}="${v}"`).join(',')}}` : name;
  const values = histograms.get(key) || [];
  values.push(value);
  histograms.set(key, values);
}

// Generate Prometheus format metrics
function generatePrometheusMetrics(): string {
  const lines: string[] = [];
  
  // Add standard application metrics
  lines.push('# HELP nodejs_version_info Node.js version info');
  lines.push('# TYPE nodejs_version_info gauge');
  lines.push(`nodejs_version_info{version="${process.version}"} 1`);
  
  lines.push('# HELP process_start_time_seconds Start time of the process since unix epoch in seconds');
  lines.push('# TYPE process_start_time_seconds gauge');
  lines.push(`process_start_time_seconds ${Math.floor(Date.now() / 1000) - process.uptime()}`);
  
  lines.push('# HELP process_uptime_seconds Number of seconds the current process has been running');
  lines.push('# TYPE process_uptime_seconds gauge');
  lines.push(`process_uptime_seconds ${process.uptime()}`);
  
  lines.push('# HELP process_resident_memory_bytes Resident memory size in bytes');
  lines.push('# TYPE process_resident_memory_bytes gauge');
  lines.push(`process_resident_memory_bytes ${process.memoryUsage().rss}`);
  
  lines.push('# HELP process_heap_bytes Process heap memory in bytes');
  lines.push('# TYPE process_heap_bytes gauge');
  lines.push(`process_heap_bytes ${process.memoryUsage().heapUsed}`);
  
  // HTTP request metrics
  lines.push('# HELP http_requests_total Total number of HTTP requests');
  lines.push('# TYPE http_requests_total counter');
  
  // Example metrics (you would record these in your application middleware)
  const totalRequests = metrics.get('http_requests_total') || 0;
  lines.push(`http_requests_total{method="GET",status="200"} ${totalRequests}`);
  
  lines.push('# HELP http_request_duration_seconds HTTP request duration in seconds');
  lines.push('# TYPE http_request_duration_seconds histogram');
  
  // Example histogram buckets
  const buckets = [0.1, 0.5, 1.0, 2.0, 5.0, 10.0];
  const durations = histograms.get('http_request_duration_seconds') || [];
  
  buckets.forEach(bucket => {
    const count = durations.filter(d => d <= bucket).length;
    lines.push(`http_request_duration_seconds_bucket{le="${bucket}"} ${count}`);
  });
  lines.push(`http_request_duration_seconds_bucket{le="+Inf"} ${durations.length}`);
  lines.push(`http_request_duration_seconds_count ${durations.length}`);
  
  if (durations.length > 0) {
    const sum = durations.reduce((a, b) => a + b, 0);
    lines.push(`http_request_duration_seconds_sum ${sum}`);
  } else {
    lines.push('http_request_duration_seconds_sum 0');
  }
  
  // Database connection metrics
  lines.push('# HELP database_connections_active Number of active database connections');
  lines.push('# TYPE database_connections_active gauge');
  lines.push(`database_connections_active ${metrics.get('database_connections_active') || 0}`);
  
  // Cache metrics
  lines.push('# HELP cache_hits_total Total number of cache hits');
  lines.push('# TYPE cache_hits_total counter');
  lines.push(`cache_hits_total ${metrics.get('cache_hits_total') || 0}`);
  
  lines.push('# HELP cache_misses_total Total number of cache misses');
  lines.push('# TYPE cache_misses_total counter');
  lines.push(`cache_misses_total ${metrics.get('cache_misses_total') || 0}`);
  
  // Application-specific metrics
  lines.push('# HELP candlefish_assessments_total Total number of assessments completed');
  lines.push('# TYPE candlefish_assessments_total counter');
  lines.push(`candlefish_assessments_total ${metrics.get('candlefish_assessments_total') || 0}`);
  
  lines.push('# HELP candlefish_users_active Number of active users');
  lines.push('# TYPE candlefish_users_active gauge');
  lines.push(`candlefish_users_active ${metrics.get('candlefish_users_active') || 0}`);
  
  return lines.join('\n') + '\n';
}

export async function GET() {
  try {
    // Record current metrics
    recordMetric('http_requests_total', (metrics.get('http_requests_total') || 0) + 1);
    recordHistogram('http_request_duration_seconds', Math.random() * 2); // Example duration
    
    // Generate metrics in Prometheus format
    const metricsOutput = generatePrometheusMetrics();
    
    return new NextResponse(metricsOutput, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Error generating metrics:', error);
    
    return NextResponse.json(
      { error: 'Failed to generate metrics' },
      { status: 500 }
    );
  }
}

// Export the metrics recording functions for use in other parts of the application
export { recordMetric as recordCustomMetric, recordHistogram as recordCustomHistogram };