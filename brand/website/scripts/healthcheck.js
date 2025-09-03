#!/usr/bin/env node

/**
 * Health Check Script for Bioluminescent Candlefish Animation
 * Comprehensive health checks for production deployment
 */

const http = require('http');
const os = require('os');

const HEALTH_CHECK_TIMEOUT = 8000;
const PORT = process.env.PORT || 3000;
const MAX_MEMORY_USAGE = 0.9; // 90% of available memory
const MAX_CPU_USAGE = 0.85; // 85% CPU usage threshold

/**
 * Perform HTTP health check
 */
function httpHealthCheck() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: '/api/health',
      method: 'GET',
      timeout: HEALTH_CHECK_TIMEOUT
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            resolve({
              status: 'healthy',
              timestamp: response.timestamp || new Date().toISOString(),
              uptime: response.uptime || process.uptime(),
              animation: response.animation || { status: 'unknown' }
            });
          } catch (e) {
            resolve({
              status: 'healthy',
              timestamp: new Date().toISOString(),
              uptime: process.uptime(),
              note: 'Health endpoint responded but JSON parse failed'
            });
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(new Error(`Health check request failed: ${err.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Health check timed out after ${HEALTH_CHECK_TIMEOUT}ms`));
    });

    req.end();
  });
}

/**
 * Check system resources
 */
function checkSystemResources() {
  const memoryUsage = process.memoryUsage();
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const cpuUsage = process.cpuUsage();
  
  const memoryUsagePercent = (totalMemory - freeMemory) / totalMemory;
  
  // Check memory usage
  if (memoryUsagePercent > MAX_MEMORY_USAGE) {
    throw new Error(`High memory usage: ${(memoryUsagePercent * 100).toFixed(1)}%`);
  }
  
  // Check if process memory is reasonable
  const processMemoryMB = memoryUsage.rss / (1024 * 1024);
  const maxProcessMemoryMB = 1024; // 1GB limit for the process
  
  if (processMemoryMB > maxProcessMemoryMB) {
    throw new Error(`Process memory usage too high: ${processMemoryMB.toFixed(1)}MB`);
  }
  
  return {
    memory: {
      usage: `${(memoryUsagePercent * 100).toFixed(1)}%`,
      process: `${processMemoryMB.toFixed(1)}MB`,
      available: `${(freeMemory / (1024 * 1024 * 1024)).toFixed(2)}GB`
    },
    cpu: {
      user: cpuUsage.user,
      system: cpuUsage.system
    },
    uptime: os.uptime(),
    loadAverage: os.loadavg()
  };
}

/**
 * Check animation-specific health
 */
async function checkAnimationHealth() {
  try {
    // Check WebGL/animation endpoints if they exist
    const animationHealthPromise = new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: PORT,
        path: '/api/animation/status',
        method: 'GET',
        timeout: 3000
      };

      const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const response = JSON.parse(data);
              resolve(response);
            } catch (e) {
              resolve({ status: 'unknown', note: 'Parse error' });
            }
          } else if (res.statusCode === 404) {
            resolve({ status: 'not_implemented', note: 'Animation endpoint not found' });
          } else {
            reject(new Error(`Animation health check failed: ${res.statusCode}`));
          }
        });
      });

      req.on('error', () => {
        resolve({ status: 'not_available', note: 'Animation endpoint unreachable' });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ status: 'timeout', note: 'Animation endpoint timed out' });
      });

      req.end();
    });

    return await animationHealthPromise;
  } catch (error) {
    return {
      status: 'error',
      error: error.message
    };
  }
}

/**
 * Main health check function
 */
async function performHealthCheck() {
  const startTime = Date.now();
  
  try {
    // Parallel health checks
    const [httpHealth, systemResources, animationHealth] = await Promise.all([
      httpHealthCheck(),
      Promise.resolve(checkSystemResources()),
      checkAnimationHealth()
    ]);

    const endTime = Date.now();
    const duration = endTime - startTime;

    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      checks: {
        http: httpHealth,
        system: systemResources,
        animation: animationHealth
      },
      environment: {
        nodeVersion: process.version,
        platform: os.platform(),
        arch: os.arch(),
        pid: process.pid
      }
    };

    console.log('Health check passed:', JSON.stringify(healthStatus, null, 2));
    process.exit(0);

  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const errorStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      error: error.message,
      environment: {
        nodeVersion: process.version,
        platform: os.platform(),
        arch: os.arch(),
        pid: process.pid
      }
    };

    console.error('Health check failed:', JSON.stringify(errorStatus, null, 2));
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGTERM', () => {
  console.log('Health check received SIGTERM, exiting...');
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('Health check received SIGINT, exiting...');
  process.exit(1);
});

// Run health check
performHealthCheck().catch((error) => {
  console.error('Unhandled health check error:', error);
  process.exit(1);
});