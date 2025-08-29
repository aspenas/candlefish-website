/**
 * Health Monitor NANDA Agent
 * Monitors service health and triggers recovery actions
 */

import { NANDAAgent, AgentType, AgentCapability } from '../agent-core';
import axios from 'axios';

interface HealthCheckResult {
  serviceId: string;
  serviceName: string;
  isHealthy: boolean;
  responseTime: number;
  statusCode: number;
  error?: string;
  metrics?: {
    cpu: number;
    memory: number;
    disk: number;
  };
}

export class HealthMonitorAgent extends NANDAAgent {
  private checkInterval: NodeJS.Timeout | null = null;
  private unhealthyServices: Map<string, number> = new Map();

  protected async registerCapabilities(): Promise<void> {
    // Health check capability
    this.capabilities.set('health_check', {
      name: 'health_check',
      description: 'Perform health check on a service',
      execute: async (context) => this.performHealthCheck(context.serviceId)
    });

    // Metric collection capability
    this.capabilities.set('metric_collection', {
      name: 'metric_collection',
      description: 'Collect metrics from a service',
      execute: async (context) => this.collectMetrics(context.serviceId)
    });

    // Anomaly detection capability
    this.capabilities.set('anomaly_detection', {
      name: 'anomaly_detection',
      description: 'Detect anomalies in service behavior',
      execute: async (context) => this.detectAnomalies(context.serviceId)
    });

    // Start monitoring loop
    await this.startMonitoring();
  }

  private async startMonitoring(): Promise<void> {
    // Check every 30 seconds
    this.checkInterval = setInterval(async () => {
      await this.monitorAllServices();
    }, 30000);

    // Initial check
    await this.monitorAllServices();
  }

  private async monitorAllServices(): Promise<void> {
    try {
      // Get all active services
      const result = await this.db.query(
        `SELECT id, name, health_check_url, auto_restart, max_restarts, restart_count 
         FROM services 
         WHERE is_active = true AND status = 'running'`
      );

      for (const service of result.rows) {
        const healthResult = await this.performHealthCheck(service.id);
        
        // Handle unhealthy services
        if (!healthResult.isHealthy) {
          await this.handleUnhealthyService(service, healthResult);
        } else {
          // Clear unhealthy count if service recovered
          this.unhealthyServices.delete(service.id);
        }

        // Store metrics
        await this.storeHealthMetrics(healthResult);
      }
    } catch (error) {
      this.logger.error('Error monitoring services:', error);
    }
  }

  private async performHealthCheck(serviceId: string): Promise<HealthCheckResult> {
    const service = await this.getService(serviceId);
    
    if (!service) {
      return {
        serviceId,
        serviceName: 'unknown',
        isHealthy: false,
        responseTime: 0,
        statusCode: 0,
        error: 'Service not found'
      };
    }

    const startTime = Date.now();
    
    try {
      if (service.health_check_url) {
        const response = await axios.get(service.health_check_url, {
          timeout: 5000,
          validateStatus: () => true
        });

        const responseTime = Date.now() - startTime;
        const isHealthy = response.status >= 200 && response.status < 300;

        return {
          serviceId,
          serviceName: service.name,
          isHealthy,
          responseTime,
          statusCode: response.status,
          metrics: await this.collectMetrics(serviceId)
        };
      } else {
        // Check if process is running for non-HTTP services
        const isRunning = await this.checkProcessRunning(service);
        
        return {
          serviceId,
          serviceName: service.name,
          isHealthy: isRunning,
          responseTime: Date.now() - startTime,
          statusCode: isRunning ? 200 : 503,
          metrics: await this.collectMetrics(serviceId)
        };
      }
    } catch (error) {
      return {
        serviceId,
        serviceName: service.name,
        isHealthy: false,
        responseTime: Date.now() - startTime,
        statusCode: 0,
        error: error.message
      };
    }
  }

  private async collectMetrics(serviceId: string): Promise<any> {
    try {
      const service = await this.getService(serviceId);
      
      if (service.container_id) {
        // Collect Docker metrics
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        const { stdout } = await execAsync(
          `docker stats --no-stream --format "json" ${service.container_id}`
        );
        
        const stats = JSON.parse(stdout);
        
        return {
          cpu: parseFloat(stats.CPUPerc.replace('%', '')),
          memory: parseFloat(stats.MemPerc.replace('%', '')),
          disk: 0 // Would need additional commands for disk usage
        };
      }
      
      // For non-containerized services, use system metrics
      return {
        cpu: Math.random() * 100, // Placeholder - would use actual system metrics
        memory: Math.random() * 100,
        disk: Math.random() * 100
      };
    } catch (error) {
      this.logger.error(`Error collecting metrics for ${serviceId}:`, error);
      return null;
    }
  }

  private async detectAnomalies(serviceId: string): Promise<any> {
    try {
      // Get historical metrics
      const result = await this.db.query(
        `SELECT 
          AVG(cpu_usage) as avg_cpu,
          AVG(memory_usage) as avg_memory,
          AVG(response_time) as avg_response_time,
          STDDEV(cpu_usage) as stddev_cpu,
          STDDEV(memory_usage) as stddev_memory,
          STDDEV(response_time) as stddev_response_time
         FROM health_metrics
         WHERE service_id = $1
         AND created_at > NOW() - INTERVAL '7 days'`,
        [serviceId]
      );

      const baseline = result.rows[0];
      
      // Get current metrics
      const current = await this.collectMetrics(serviceId);
      
      if (!current || !baseline) {
        return { hasAnomaly: false };
      }

      // Simple anomaly detection: check if current values are > 2 standard deviations from mean
      const anomalies = [];
      
      if (current.cpu > baseline.avg_cpu + (2 * baseline.stddev_cpu)) {
        anomalies.push({ type: 'cpu', severity: 'high' });
      }
      
      if (current.memory > baseline.avg_memory + (2 * baseline.stddev_memory)) {
        anomalies.push({ type: 'memory', severity: 'high' });
      }

      return {
        hasAnomaly: anomalies.length > 0,
        anomalies
      };
    } catch (error) {
      this.logger.error(`Error detecting anomalies for ${serviceId}:`, error);
      return { hasAnomaly: false };
    }
  }

  private async handleUnhealthyService(service: any, healthResult: HealthCheckResult): Promise<void> {
    // Track consecutive failures
    const failureCount = (this.unhealthyServices.get(service.id) || 0) + 1;
    this.unhealthyServices.set(service.id, failureCount);

    this.logger.warn(`Service ${service.name} is unhealthy (${failureCount} consecutive failures)`);

    // Make decision based on failure count and configuration
    const decision = await this.makeDecision({
      service,
      healthResult,
      failureCount,
      reason: `Service health check failed: ${healthResult.error || `Status ${healthResult.statusCode}`}`
    });

    // Auto-restart if configured and within limits
    if (service.auto_restart && 
        failureCount >= 3 && 
        service.restart_count < service.max_restarts) {
      
      await this.requestServiceRestart(service);
    } else if (failureCount >= 5) {
      // Alert for manual intervention
      await this.createIncident(service, healthResult);
    }
  }

  private async requestServiceRestart(service: any): Promise<void> {
    // Communicate with recovery agent
    await this.communicateWith('auto-healer', {
      action: 'restart_service',
      serviceId: service.id,
      serviceName: service.name,
      reason: 'Health check failures exceeded threshold'
    });

    // Update restart count
    await this.db.query(
      'UPDATE services SET restart_count = restart_count + 1 WHERE id = $1',
      [service.id]
    );
  }

  private async createIncident(service: any, healthResult: HealthCheckResult): Promise<void> {
    await this.db.query(
      `INSERT INTO incidents (service_id, severity, description, status)
       VALUES ($1, $2, $3, 'open')`,
      [
        service.id,
        'high',
        `Service ${service.name} is unhealthy: ${healthResult.error || `Status ${healthResult.statusCode}`}`
      ]
    );

    // Notify team
    this.emit('incident_created', {
      service: service.name,
      severity: 'high',
      description: healthResult.error
    });
  }

  private async storeHealthMetrics(healthResult: HealthCheckResult): Promise<void> {
    if (!healthResult.metrics) return;

    await this.db.query(
      `INSERT INTO health_metrics 
       (service_id, cpu_usage, memory_usage, response_time, status_code)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        healthResult.serviceId,
        healthResult.metrics.cpu,
        healthResult.metrics.memory,
        healthResult.responseTime,
        healthResult.statusCode
      ]
    );
  }

  private async getService(serviceId: string): Promise<any> {
    const result = await this.db.query(
      'SELECT * FROM services WHERE id = $1',
      [serviceId]
    );
    return result.rows[0];
  }

  private async checkProcessRunning(service: any): Promise<boolean> {
    if (service.process_id) {
      try {
        process.kill(service.process_id, 0);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  protected async analyzeContext(context: any): Promise<any> {
    const { service, healthResult, failureCount } = context;
    
    return {
      summary: `Service ${service.name} health analysis`,
      factors: [
        `Failure count: ${failureCount}`,
        `Auto-restart enabled: ${service.auto_restart}`,
        `Restart count: ${service.restart_count}/${service.max_restarts}`
      ],
      risks: failureCount >= 3 ? ['Service degradation', 'Potential data loss'] : [],
      opportunities: ['Auto-recovery possible', 'Metrics collection for analysis']
    };
  }

  protected async calculateConfidence(analysis: any, action: any): Promise<number> {
    // Higher confidence for auto-restart if enabled and within limits
    if (action.name === 'restart_service') {
      return 0.85;
    }
    return 0.7;
  }

  async stop(): Promise<void> {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    await super.stop();
  }
}