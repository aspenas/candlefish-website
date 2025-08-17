#!/usr/bin/env node

/**
 * Health Monitor for Paintbox Application
 * Monitors all services and alerts on failures
 */

const http = require('http');
const https = require('https');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const config = {
  services: [
    {
      name: 'paintbox-app',
      type: 'http',
      url: 'http://localhost:3000/api/health',
      timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 5000,
      expectedStatusCode: 200,
      critical: true,
    },
    {
      name: 'paintbox-websocket',
      type: 'tcp',
      host: 'localhost',
      port: 3001,
      timeout: 3000,
      critical: true,
    },
    {
      name: 'redis',
      type: 'tcp',
      host: 'localhost',
      port: 6379,
      timeout: 3000,
      critical: true,
    },
    {
      name: 'postgresql',
      type: 'tcp',
      host: 'localhost',
      port: 5432,
      timeout: 3000,
      critical: true,
    },
    {
      name: 'paintbox-worker',
      type: 'process',
      processName: 'paintbox-worker',
      critical: false,
    }
  ],

  // Monitoring configuration
  interval: parseInt(process.env.MONITOR_INTERVAL) || 30000,
  maxFailures: 3,
  alertCooldown: 300000, // 5 minutes

  // Alert configuration
  webhookUrl: process.env.ALERT_WEBHOOK_URL,
  logFile: path.join(__dirname, '../logs/health-monitor.json'),

  // Recovery configuration
  autoRestart: process.env.NODE_ENV === 'production',
  restartCommands: {
    'paintbox-app': 'pm2 restart paintbox-app',
    'paintbox-websocket': 'pm2 restart paintbox-websocket',
    'paintbox-worker': 'pm2 restart paintbox-worker',
    'redis': 'sudo systemctl restart redis',
    'postgresql': 'sudo systemctl restart postgresql',
  }
};

// State tracking
const serviceStates = new Map();
const lastAlerts = new Map();

class HealthMonitor {
  constructor() {
    this.isRunning = false;
    this.setupGracefulShutdown();
  }

  async start() {
    console.log(`[${new Date().toISOString()}] Health Monitor starting...`);
    console.log(`Monitoring ${config.services.length} services every ${config.interval}ms`);

    this.isRunning = true;

    // Initialize service states
    config.services.forEach(service => {
      serviceStates.set(service.name, {
        status: 'unknown',
        consecutiveFailures: 0,
        lastCheck: null,
        lastSuccess: null,
        lastFailure: null,
        responseTime: null,
      });
    });

    // Start monitoring loop
    await this.monitoringLoop();
  }

  async monitoringLoop() {
    while (this.isRunning) {
      try {
        await this.checkAllServices();
        await this.sleep(config.interval);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Monitoring loop error:`, error);
        await this.sleep(5000); // Short delay on error
      }
    }
  }

  async checkAllServices() {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Performing health checks...`);

    const checks = config.services.map(service => this.checkService(service));
    const results = await Promise.allSettled(checks);

    // Process results
    results.forEach((result, index) => {
      const service = config.services[index];
      if (result.status === 'fulfilled') {
        this.updateServiceState(service.name, result.value);
      } else {
        console.error(`[${timestamp}] Error checking ${service.name}:`, result.reason);
        this.updateServiceState(service.name, {
          status: 'error',
          error: result.reason.message,
          responseTime: null,
        });
      }
    });

    // Log current status
    await this.logHealthStatus();

    // Check for alerts
    await this.checkAlerts();
  }

  async checkService(service) {
    const startTime = Date.now();

    try {
      let result;

      switch (service.type) {
        case 'http':
          result = await this.checkHttpService(service);
          break;
        case 'tcp':
          result = await this.checkTcpService(service);
          break;
        case 'process':
          result = await this.checkProcessService(service);
          break;
        default:
          throw new Error(`Unknown service type: ${service.type}`);
      }

      const responseTime = Date.now() - startTime;
      return {
        status: 'healthy',
        responseTime,
        ...result,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        status: 'unhealthy',
        error: error.message,
        responseTime,
      };
    }
  }

  async checkHttpService(service) {
    return new Promise((resolve, reject) => {
      const url = new URL(service.url);
      const client = url.protocol === 'https:' ? https : http;

      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: 'GET',
        timeout: service.timeout,
      };

      const req = client.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === service.expectedStatusCode) {
            resolve({
              statusCode: res.statusCode,
              responseSize: data.length,
            });
          } else {
            reject(new Error(`HTTP ${res.statusCode}: Expected ${service.expectedStatusCode}`));
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request timeout after ${service.timeout}ms`));
      });

      req.on('error', reject);
      req.end();
    });
  }

  async checkTcpService(service) {
    return new Promise((resolve, reject) => {
      const net = require('net');
      const socket = new net.Socket();

      const timeout = setTimeout(() => {
        socket.destroy();
        reject(new Error(`TCP connection timeout after ${service.timeout}ms`));
      }, service.timeout);

      socket.connect(service.port, service.host, () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve({ connected: true });
      });

      socket.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  async checkProcessService(service) {
    return new Promise((resolve, reject) => {
      exec(`pgrep -f "${service.processName}"`, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Process not found: ${service.processName}`));
        } else {
          const pids = stdout.trim().split('\n').filter(pid => pid);
          resolve({
            processCount: pids.length,
            pids: pids,
          });
        }
      });
    });
  }

  updateServiceState(serviceName, checkResult) {
    const state = serviceStates.get(serviceName);
    const timestamp = new Date().toISOString();

    state.lastCheck = timestamp;
    state.responseTime = checkResult.responseTime;

    if (checkResult.status === 'healthy') {
      state.status = 'healthy';
      state.consecutiveFailures = 0;
      state.lastSuccess = timestamp;
      console.log(`[${timestamp}] ✅ ${serviceName} - ${checkResult.responseTime}ms`);
    } else {
      state.status = 'unhealthy';
      state.consecutiveFailures++;
      state.lastFailure = timestamp;
      state.error = checkResult.error;
      console.log(`[${timestamp}] ❌ ${serviceName} - ${checkResult.error} (${state.consecutiveFailures} failures)`);
    }

    serviceStates.set(serviceName, state);
  }

  async checkAlerts() {
    const criticalServices = config.services.filter(s => s.critical);

    for (const service of criticalServices) {
      const state = serviceStates.get(service.name);

      if (state.consecutiveFailures >= config.maxFailures) {
        await this.triggerAlert(service, state);

        // Attempt auto-restart if enabled
        if (config.autoRestart && config.restartCommands[service.name]) {
          await this.attemptServiceRestart(service);
        }
      }
    }
  }

  async triggerAlert(service, state) {
    const now = Date.now();
    const lastAlert = lastAlerts.get(service.name) || 0;

    // Check cooldown period
    if (now - lastAlert < config.alertCooldown) {
      return;
    }

    const alertMessage = {
      type: 'service_failure',
      service: service.name,
      timestamp: new Date().toISOString(),
      consecutiveFailures: state.consecutiveFailures,
      lastError: state.error,
      environment: process.env.NODE_ENV || 'development',
    };

    console.log(`[${alertMessage.timestamp}] 🚨 ALERT: ${service.name} has failed ${state.consecutiveFailures} times`);

    // Send webhook alert if configured
    if (config.webhookUrl) {
      await this.sendWebhookAlert(alertMessage);
    }

    lastAlerts.set(service.name, now);
  }

  async sendWebhookAlert(alertMessage) {
    try {
      const payload = {
        text: `🚨 Paintbox Service Alert`,
        attachments: [
          {
            color: 'danger',
            fields: [
              {
                title: 'Service',
                value: alertMessage.service,
                short: true,
              },
              {
                title: 'Environment',
                value: alertMessage.environment,
                short: true,
              },
              {
                title: 'Consecutive Failures',
                value: alertMessage.consecutiveFailures.toString(),
                short: true,
              },
              {
                title: 'Last Error',
                value: alertMessage.lastError || 'Unknown error',
                short: false,
              },
              {
                title: 'Timestamp',
                value: alertMessage.timestamp,
                short: true,
              }
            ]
          }
        ]
      };

      await this.httpPost(config.webhookUrl, JSON.stringify(payload), {
        'Content-Type': 'application/json',
      });

      console.log(`[${alertMessage.timestamp}] 📡 Alert sent to webhook`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Failed to send webhook alert:`, error);
    }
  }

  async attemptServiceRestart(service) {
    const command = config.restartCommands[service.name];
    if (!command) return;

    console.log(`[${new Date().toISOString()}] 🔄 Attempting to restart ${service.name}...`);

    return new Promise((resolve) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`[${new Date().toISOString()}] Failed to restart ${service.name}:`, error);
        } else {
          console.log(`[${new Date().toISOString()}] ✅ Restart command executed for ${service.name}`);
        }
        resolve();
      });
    });
  }

  async logHealthStatus() {
    try {
      const statusReport = {
        timestamp: new Date().toISOString(),
        services: {},
        summary: {
          total: config.services.length,
          healthy: 0,
          unhealthy: 0,
          critical_failures: 0,
        }
      };

      serviceStates.forEach((state, serviceName) => {
        statusReport.services[serviceName] = { ...state };

        if (state.status === 'healthy') {
          statusReport.summary.healthy++;
        } else {
          statusReport.summary.unhealthy++;

          const service = config.services.find(s => s.name === serviceName);
          if (service && service.critical && state.consecutiveFailures >= config.maxFailures) {
            statusReport.summary.critical_failures++;
          }
        }
      });

      // Ensure log directory exists
      const logDir = path.dirname(config.logFile);
      await fs.mkdir(logDir, { recursive: true });

      // Append to log file
      await fs.appendFile(config.logFile, JSON.stringify(statusReport) + '\n');

    } catch (error) {
      console.error(`[${new Date().toISOString()}] Failed to log health status:`, error);
    }
  }

  async httpPost(url, data, headers = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;

      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Length': Buffer.byteLength(data),
          ...headers,
        },
      };

      const req = client.request(options, (res) => {
        let responseData = '';
        res.on('data', chunk => responseData += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, data: responseData }));
      });

      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  setupGracefulShutdown() {
    const shutdown = (signal) => {
      console.log(`[${new Date().toISOString()}] Received ${signal}, shutting down gracefully...`);
      this.isRunning = false;
      setTimeout(() => process.exit(0), 1000);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    process.on('SIGUSR2', shutdown); // PM2 reload
  }
}

// Start the health monitor
if (require.main === module) {
  const monitor = new HealthMonitor();
  monitor.start().catch(error => {
    console.error(`[${new Date().toISOString()}] Fatal error:`, error);
    process.exit(1);
  });
}

module.exports = HealthMonitor;
