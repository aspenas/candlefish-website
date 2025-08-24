#!/usr/bin/env node
/**
 * Base health check script for Candlefish services
 * Provides common health check functionality that can be extended by services
 */

const http = require('http');
const { performance } = require('perf_hooks');

class HealthChecker {
  constructor(options = {}) {
    this.port = options.port || process.env.PORT || 3000;
    this.path = options.path || '/health';
    this.timeout = options.timeout || 5000;
    this.hostname = options.hostname || 'localhost';
    this.checks = [];
  }

  // Add custom health checks
  addCheck(name, checkFn) {
    this.checks.push({ name, check: checkFn });
  }

  // Default HTTP health check
  async httpHealthCheck() {
    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      const request = http.request({
        hostname: this.hostname,
        port: this.port,
        path: this.path,
        method: 'GET',
        timeout: this.timeout
      }, (res) => {
        const duration = performance.now() - startTime;
        if (res.statusCode >= 200 && res.statusCode < 400) {
          resolve({ status: 'healthy', duration: Math.round(duration) });
        } else {
          reject(new Error(`Health check failed with status ${res.statusCode}`));
        }
      });

      request.on('error', reject);
      request.on('timeout', () => {
        request.destroy();
        reject(new Error('Health check timeout'));
      });

      request.end();
    });
  }

  // Run all health checks
  async runChecks() {
    const results = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: process.env.SERVICE_NAME || 'unknown',
      version: process.env.APP_VERSION || 'unknown',
      checks: {}
    };

    try {
      // Run HTTP health check if service has HTTP endpoint
      if (process.env.HTTP_HEALTH_CHECK !== 'false') {
        try {
          results.checks.http = await this.httpHealthCheck();
        } catch (error) {
          results.checks.http = { status: 'unhealthy', error: error.message };
          results.status = 'unhealthy';
        }
      }

      // Run custom checks
      for (const { name, check } of this.checks) {
        try {
          results.checks[name] = await check();
        } catch (error) {
          results.checks[name] = { status: 'unhealthy', error: error.message };
          results.status = 'unhealthy';
        }
      }

      return results;
    } catch (error) {
      results.status = 'unhealthy';
      results.error = error.message;
      return results;
    }
  }

  // Memory health check
  async memoryCheck() {
    const usage = process.memoryUsage();
    const maxMemory = parseInt(process.env.MAX_MEMORY_MB || '1024') * 1024 * 1024;
    const memoryUsagePercent = (usage.rss / maxMemory) * 100;

    if (memoryUsagePercent > 90) {
      throw new Error(`Memory usage too high: ${memoryUsagePercent.toFixed(1)}%`);
    }

    return {
      status: 'healthy',
      memoryUsage: {
        rss: Math.round(usage.rss / 1024 / 1024),
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
        usagePercent: Math.round(memoryUsagePercent)
      }
    };
  }

  // Process health check
  async processCheck() {
    const uptime = process.uptime();
    const loadAvg = require('os').loadavg();

    return {
      status: 'healthy',
      uptime: Math.round(uptime),
      pid: process.pid,
      loadAverage: loadAvg.map(load => Math.round(load * 100) / 100)
    };
  }
}

// Main execution
async function main() {
  const checker = new HealthChecker();

  // Add default checks
  checker.addCheck('memory', () => checker.memoryCheck());
  checker.addCheck('process', () => checker.processCheck());

  try {
    const results = await checker.runChecks();

    if (results.status === 'healthy') {
      process.exit(0);
    } else {
      console.error('Health check failed:', JSON.stringify(results, null, 2));
      process.exit(1);
    }
  } catch (error) {
    console.error('Health check error:', error.message);
    process.exit(1);
  }
}

// Export for use by other health check scripts
module.exports = HealthChecker;

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Health check failed:', error.message);
    process.exit(1);
  });
}
