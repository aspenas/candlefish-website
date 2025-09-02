import { faker } from '@faker-js/faker';

// Base types for analytics data
export interface AgentMetric {
  id?: number;
  agent_id: string;
  agent_name: string;
  metric_type: string;
  value: number;
  unit?: string;
  metadata?: Record<string, any>;
  created_at?: Date;
  updated_at?: Date;
}

export interface ServiceMetric {
  id?: number;
  service_name: string;
  endpoint?: string;
  response_time_ms?: number;
  status_code?: number;
  error_message?: string;
  request_count?: number;
  cpu_usage?: number;
  memory_usage?: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface SystemMetric {
  id?: number;
  metric_name: string;
  metric_value: number;
  metric_unit?: string;
  component?: string;
  severity?: 'info' | 'warning' | 'critical';
  metadata?: Record<string, any>;
  created_at?: Date;
}

// Factory functions for creating test data
export class AnalyticsFixtures {
  // Agent metrics factory
  static createAgentMetric(overrides: Partial<AgentMetric> = {}): AgentMetric {
    const metricTypes = ['response_time', 'success_rate', 'error_rate', 'throughput', 'availability'];
    const units = ['ms', '%', 'req/s', 'MB', 'GB'];
    
    const metricType = faker.helpers.arrayElement(metricTypes);
    let value: number;
    let unit: string;
    
    switch (metricType) {
      case 'response_time':
        value = faker.number.float({ min: 50, max: 1000, fractionDigits: 1 });
        unit = 'ms';
        break;
      case 'success_rate':
      case 'availability':
        value = faker.number.float({ min: 85, max: 99.9, fractionDigits: 2 });
        unit = '%';
        break;
      case 'error_rate':
        value = faker.number.float({ min: 0.1, max: 15, fractionDigits: 2 });
        unit = '%';
        break;
      case 'throughput':
        value = faker.number.float({ min: 10, max: 1000, fractionDigits: 1 });
        unit = 'req/s';
        break;
      default:
        value = faker.number.float({ min: 0, max: 100, fractionDigits: 2 });
        unit = faker.helpers.arrayElement(units);
    }
    
    return {
      agent_id: faker.string.uuid(),
      agent_name: `${faker.company.name()} Agent`,
      metric_type: metricType,
      value,
      unit,
      metadata: {
        region: faker.location.country(),
        environment: faker.helpers.arrayElement(['production', 'staging', 'development']),
        version: faker.system.semver()
      },
      created_at: faker.date.recent({ days: 7 }),
      ...overrides
    };
  }

  // Service metrics factory
  static createServiceMetric(overrides: Partial<ServiceMetric> = {}): ServiceMetric {
    const serviceNames = ['api-server', 'web-dashboard', 'auth-service', 'data-processor', 'notification-service'];
    const endpoints = ['/api/v1/users', '/api/v1/analytics', '/api/v1/auth', '/api/v1/data', '/health'];
    const statusCodes = [200, 201, 400, 404, 500, 502, 503];
    
    const statusCode = faker.helpers.arrayElement(statusCodes);
    const isError = statusCode >= 400;
    
    return {
      service_name: faker.helpers.arrayElement(serviceNames),
      endpoint: faker.helpers.arrayElement(endpoints),
      response_time_ms: faker.number.int({ min: isError ? 200 : 50, max: isError ? 5000 : 500 }),
      status_code: statusCode,
      error_message: isError ? faker.lorem.sentence() : null,
      request_count: faker.number.int({ min: 1, max: 1000 }),
      cpu_usage: faker.number.float({ min: 10, max: 90, fractionDigits: 1 }),
      memory_usage: faker.number.float({ min: 128, max: 2048, fractionDigits: 1 }),
      created_at: faker.date.recent({ days: 1 }),
      ...overrides
    };
  }

  // System metrics factory
  static createSystemMetric(overrides: Partial<SystemMetric> = {}): SystemMetric {
    const metricNames = ['cpu_usage', 'memory_usage', 'disk_usage', 'network_io', 'active_connections'];
    const components = ['system', 'database', 'cache', 'storage', 'network'];
    const severities: SystemMetric['severity'][] = ['info', 'warning', 'critical'];
    
    const metricName = faker.helpers.arrayElement(metricNames);
    let value: number;
    let unit: string;
    let severity: SystemMetric['severity'];
    
    switch (metricName) {
      case 'cpu_usage':
      case 'memory_usage':
      case 'disk_usage':
        value = faker.number.float({ min: 0, max: 100, fractionDigits: 1 });
        unit = '%';
        severity = value > 90 ? 'critical' : value > 70 ? 'warning' : 'info';
        break;
      case 'network_io':
        value = faker.number.float({ min: 0, max: 1024, fractionDigits: 2 });
        unit = 'MB/s';
        severity = 'info';
        break;
      case 'active_connections':
        value = faker.number.int({ min: 0, max: 10000 });
        unit = 'connections';
        severity = value > 8000 ? 'warning' : 'info';
        break;
      default:
        value = faker.number.float({ min: 0, max: 100, fractionDigits: 2 });
        unit = 'units';
        severity = 'info';
    }
    
    return {
      metric_name: metricName,
      metric_value: value,
      metric_unit: unit,
      component: faker.helpers.arrayElement(components),
      severity,
      metadata: {
        host: faker.internet.domainName(),
        datacenter: faker.location.city(),
        instance_id: faker.string.alphanumeric(10)
      },
      created_at: faker.date.recent({ days: 1 }),
      ...overrides
    };
  }

  // Batch creation methods
  static createAgentMetrics(count: number, overrides: Partial<AgentMetric> = {}): AgentMetric[] {
    return Array.from({ length: count }, () => this.createAgentMetric(overrides));
  }

  static createServiceMetrics(count: number, overrides: Partial<ServiceMetric> = {}): ServiceMetric[] {
    return Array.from({ length: count }, () => this.createServiceMetric(overrides));
  }

  static createSystemMetrics(count: number, overrides: Partial<SystemMetric> = {}): SystemMetric[] {
    return Array.from({ length: count }, () => this.createSystemMetric(overrides));
  }

  // Time series data factory
  static createTimeSeriesData(
    count: number,
    baseValue: number,
    variance: number = 10,
    startTime: Date = new Date(Date.now() - 24 * 60 * 60 * 1000),
    intervalMinutes: number = 15
  ): Array<{ timestamp: Date; value: number }> {
    const data: Array<{ timestamp: Date; value: number }> = [];
    
    for (let i = 0; i < count; i++) {
      const timestamp = new Date(startTime.getTime() + i * intervalMinutes * 60 * 1000);
      const variation = faker.number.float({ min: -variance, max: variance });
      const value = Math.max(0, baseValue + variation);
      
      data.push({ timestamp, value });
    }
    
    return data;
  }

  // Performance scenario factories
  static createPerformanceDegradationScenario(agentId: string, duration: number = 60): AgentMetric[] {
    const metrics: AgentMetric[] = [];
    const startTime = new Date();
    
    // Normal performance
    for (let i = 0; i < 10; i++) {
      metrics.push(this.createAgentMetric({
        agent_id: agentId,
        metric_type: 'response_time',
        value: faker.number.float({ min: 80, max: 120 }),
        unit: 'ms',
        created_at: new Date(startTime.getTime() + i * 60000)
      }));
    }
    
    // Performance degradation
    for (let i = 10; i < 20; i++) {
      metrics.push(this.createAgentMetric({
        agent_id: agentId,
        metric_type: 'response_time',
        value: faker.number.float({ min: 200, max: 500 }),
        unit: 'ms',
        created_at: new Date(startTime.getTime() + i * 60000)
      }));
    }
    
    // Recovery
    for (let i = 20; i < 30; i++) {
      metrics.push(this.createAgentMetric({
        agent_id: agentId,
        metric_type: 'response_time',
        value: faker.number.float({ min: 90, max: 130 }),
        unit: 'ms',
        created_at: new Date(startTime.getTime() + i * 60000)
      }));
    }
    
    return metrics;
  }

  static createServiceOutageScenario(serviceName: string): ServiceMetric[] {
    const metrics: ServiceMetric[] = [];
    const startTime = new Date();
    
    // Normal operation
    for (let i = 0; i < 5; i++) {
      metrics.push(this.createServiceMetric({
        service_name: serviceName,
        status_code: 200,
        response_time_ms: faker.number.int({ min: 50, max: 150 }),
        created_at: new Date(startTime.getTime() + i * 60000)
      }));
    }
    
    // Outage
    for (let i = 5; i < 10; i++) {
      metrics.push(this.createServiceMetric({
        service_name: serviceName,
        status_code: 503,
        response_time_ms: faker.number.int({ min: 2000, max: 5000 }),
        error_message: 'Service unavailable',
        created_at: new Date(startTime.getTime() + i * 60000)
      }));
    }
    
    // Recovery
    for (let i = 10; i < 15; i++) {
      metrics.push(this.createServiceMetric({
        service_name: serviceName,
        status_code: 200,
        response_time_ms: faker.number.int({ min: 60, max: 180 }),
        created_at: new Date(startTime.getTime() + i * 60000)
      }));
    }
    
    return metrics;
  }

  // Alert simulation
  static createCriticalAlertScenario(): SystemMetric[] {
    return [
      this.createSystemMetric({
        metric_name: 'cpu_usage',
        metric_value: 95.8,
        metric_unit: '%',
        severity: 'critical',
        metadata: {
          alert_id: faker.string.uuid(),
          threshold: 90,
          duration: 300 // 5 minutes
        }
      }),
      this.createSystemMetric({
        metric_name: 'memory_usage',
        metric_value: 92.3,
        metric_unit: '%',
        severity: 'critical',
        metadata: {
          alert_id: faker.string.uuid(),
          threshold: 85,
          duration: 180 // 3 minutes
        }
      })
    ];
  }

  // Realistic data sets for specific test scenarios
  static createRealisticDashboardData() {
    const agentIds = Array.from({ length: 5 }, () => faker.string.uuid());
    const serviceNames = ['api-server', 'web-dashboard', 'auth-service', 'data-processor'];
    
    return {
      agents: agentIds.flatMap(agentId => [
        this.createAgentMetric({ 
          agent_id: agentId, 
          agent_name: `Agent ${agentId.slice(-4)}`,
          metric_type: 'response_time' 
        }),
        this.createAgentMetric({ 
          agent_id: agentId, 
          agent_name: `Agent ${agentId.slice(-4)}`,
          metric_type: 'success_rate' 
        }),
        this.createAgentMetric({ 
          agent_id: agentId, 
          agent_name: `Agent ${agentId.slice(-4)}`,
          metric_type: 'error_rate' 
        })
      ]),
      services: serviceNames.flatMap(serviceName =>
        Array.from({ length: 10 }, () => this.createServiceMetric({ service_name: serviceName }))
      ),
      system: [
        this.createSystemMetric({ metric_name: 'cpu_usage' }),
        this.createSystemMetric({ metric_name: 'memory_usage' }),
        this.createSystemMetric({ metric_name: 'disk_usage' }),
        this.createSystemMetric({ metric_name: 'active_connections' })
      ]
    };
  }

  // Database seeding helper
  static async seedDatabase(pool: any): Promise<void> {
    const data = this.createRealisticDashboardData();
    
    // Insert agent metrics
    for (const agent of data.agents) {
      await pool.query(`
        INSERT INTO agent_performance_metrics 
        (agent_id, agent_name, metric_type, value, unit, metadata, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        agent.agent_id,
        agent.agent_name,
        agent.metric_type,
        agent.value,
        agent.unit,
        JSON.stringify(agent.metadata || {}),
        agent.created_at || new Date(),
        agent.updated_at || new Date()
      ]);
    }
    
    // Insert service metrics
    for (const service of data.services) {
      await pool.query(`
        INSERT INTO service_performance_metrics 
        (service_name, endpoint, response_time_ms, status_code, error_message, request_count, cpu_usage, memory_usage, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        service.service_name,
        service.endpoint,
        service.response_time_ms,
        service.status_code,
        service.error_message,
        service.request_count,
        service.cpu_usage,
        service.memory_usage,
        service.created_at || new Date(),
        service.updated_at || new Date()
      ]);
    }
    
    // Insert system metrics
    for (const system of data.system) {
      await pool.query(`
        INSERT INTO system_metrics 
        (metric_name, metric_value, metric_unit, component, severity, metadata, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        system.metric_name,
        system.metric_value,
        system.metric_unit,
        system.component,
        system.severity,
        JSON.stringify(system.metadata || {}),
        system.created_at || new Date()
      ]);
    }
  }

  // Clean up test data
  static async cleanupDatabase(pool: any): Promise<void> {
    await pool.query('DELETE FROM agent_performance_metrics WHERE created_at > NOW() - INTERVAL \'1 hour\'');
    await pool.query('DELETE FROM service_performance_metrics WHERE created_at > NOW() - INTERVAL \'1 hour\'');
    await pool.query('DELETE FROM system_metrics WHERE created_at > NOW() - INTERVAL \'1 hour\'');
  }
}