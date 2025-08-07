/**
 * Mock Data Factories for System Analyzer
 * Generates realistic test data for services, metrics, alerts, and system analysis
 */

import { faker } from '@faker-js/faker';

// Types based on GraphQL schema
export type ServiceStatus = 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'UNKNOWN' | 'MAINTENANCE';
export type ProcessStatus = 'RUNNING' | 'STOPPED' | 'CRASHED' | 'STARTING' | 'STOPPING' | 'UNKNOWN';
export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AlertStatus = 'ACTIVE' | 'RESOLVED' | 'ACKNOWLEDGED' | 'SUPPRESSED';
export type ResourceType = 'CPU' | 'MEMORY' | 'DISK' | 'NETWORK' | 'DATABASE_CONNECTIONS' | 'API_REQUESTS' | 'CUSTOM';
export type DependencyType = 'DATABASE' | 'API' | 'MESSAGE_QUEUE' | 'CACHE' | 'FILE_STORAGE' | 'AUTHENTICATION' | 'EXTERNAL_SERVICE';

export interface MockService {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  version: string;
  environment: string;
  status: ServiceStatus;
  healthEndpoint?: string;
  baseUrl?: string;
  tags: string[];
  discoveredAt: Date;
  lastHealthCheck?: Date;
  lastStatusChange?: Date;
  uptime?: string;
  autoDiscovered: boolean;
  monitoringEnabled: boolean;
  alertingEnabled: boolean;
  healthCheckInterval?: string;
  healthCheckTimeout?: string;
  healthCheckRetries?: number;
}

export interface MockContainer {
  id: string;
  name: string;
  image: string;
  tag: string;
  status: ProcessStatus;
  cpuUsage?: number;
  memoryUsage?: number;
  memoryLimit?: number;
  networkRx?: number;
  networkTx?: number;
  diskUsage?: number;
  createdAt: Date;
  startedAt?: Date;
  lastRestart?: Date;
  restartCount: number;
}

export interface MockMetric {
  id: string;
  serviceId: string;
  name: string;
  type: ResourceType;
  value: number;
  unit: string;
  timestamp: Date;
  labels?: Record<string, string>;
  warningThreshold?: number;
  criticalThreshold?: number;
}

export interface MockAlert {
  id: string;
  serviceId: string;
  name: string;
  description: string;
  severity: AlertSeverity;
  status: AlertStatus;
  triggeredAt: Date;
  resolvedAt?: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  triggerValue?: number;
  thresholdValue?: number;
}

export interface MockSystemAnalysis {
  id: string;
  timestamp: Date;
  overallHealth: ServiceStatus;
  healthScore: number;
  totalServices: number;
  healthyServices: number;
  degradedServices: number;
  unhealthyServices: number;
  activeAlerts: number;
}

/**
 * Service Factory
 */
export class ServiceFactory {
  static create(overrides: Partial<MockService> = {}): MockService {
    const name = faker.system.fileName().replace(/\.[^/.]+$/, '');
    const environment = faker.helpers.arrayElement(['production', 'staging', 'development']);
    const status = faker.helpers.arrayElement<ServiceStatus>(['HEALTHY', 'DEGRADED', 'UNHEALTHY', 'UNKNOWN', 'MAINTENANCE']);
    
    return {
      id: faker.string.uuid(),
      name,
      displayName: faker.company.name(),
      description: faker.lorem.sentence(),
      version: faker.system.semver(),
      environment,
      status,
      healthEndpoint: `/health`,
      baseUrl: faker.internet.url(),
      tags: faker.helpers.arrayElements(['api', 'database', 'frontend', 'backend', 'microservice'], { min: 1, max: 3 }),
      discoveredAt: faker.date.recent({ days: 30 }),
      lastHealthCheck: faker.date.recent({ days: 1 }),
      lastStatusChange: faker.date.recent({ days: 7 }),
      uptime: `${faker.number.int({ min: 1, max: 30 })}d ${faker.number.int({ min: 1, max: 23 })}h`,
      autoDiscovered: faker.datatype.boolean(),
      monitoringEnabled: true,
      alertingEnabled: true,
      healthCheckInterval: '30s',
      healthCheckTimeout: '10s',
      healthCheckRetries: 3,
      ...overrides,
    };
  }

  static createMany(count: number, overrides: Partial<MockService> = {}): MockService[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createHealthy(overrides: Partial<MockService> = {}): MockService {
    return this.create({ status: 'HEALTHY', ...overrides });
  }

  static createUnhealthy(overrides: Partial<MockService> = {}): MockService {
    return this.create({ status: 'UNHEALTHY', ...overrides });
  }

  static createDegraded(overrides: Partial<MockService> = {}): MockService {
    return this.create({ status: 'DEGRADED', ...overrides });
  }
}

/**
 * Container Factory
 */
export class ContainerFactory {
  static create(overrides: Partial<MockContainer> = {}): MockContainer {
    const name = faker.system.fileName().replace(/\.[^/.]+$/, '');
    const status = faker.helpers.arrayElement<ProcessStatus>(['RUNNING', 'STOPPED', 'CRASHED', 'STARTING', 'STOPPING', 'UNKNOWN']);
    
    return {
      id: faker.string.uuid(),
      name,
      image: `${faker.hacker.noun()}/${name}`,
      tag: 'latest',
      status,
      cpuUsage: faker.number.float({ min: 0, max: 100, fractionDigits: 2 }),
      memoryUsage: faker.number.float({ min: 0, max: 100, fractionDigits: 2 }),
      memoryLimit: faker.number.float({ min: 512, max: 8192, fractionDigits: 0 }),
      networkRx: faker.number.float({ min: 0, max: 1000, fractionDigits: 2 }),
      networkTx: faker.number.float({ min: 0, max: 1000, fractionDigits: 2 }),
      diskUsage: faker.number.float({ min: 0, max: 100, fractionDigits: 2 }),
      createdAt: faker.date.recent({ days: 30 }),
      startedAt: faker.date.recent({ days: 1 }),
      lastRestart: faker.date.recent({ days: 7 }),
      restartCount: faker.number.int({ min: 0, max: 10 }),
      ...overrides,
    };
  }

  static createMany(count: number, overrides: Partial<MockContainer> = {}): MockContainer[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createRunning(overrides: Partial<MockContainer> = {}): MockContainer {
    return this.create({ status: 'RUNNING', ...overrides });
  }

  static createStopped(overrides: Partial<MockContainer> = {}): MockContainer {
    return this.create({ status: 'STOPPED', ...overrides });
  }
}

/**
 * Metric Factory
 */
export class MetricFactory {
  static create(overrides: Partial<MockMetric> = {}): MockMetric {
    const type = faker.helpers.arrayElement<ResourceType>(['CPU', 'MEMORY', 'DISK', 'NETWORK', 'DATABASE_CONNECTIONS', 'API_REQUESTS']);
    const value = this.generateValueForType(type);
    const unit = this.getUnitForType(type);
    
    return {
      id: faker.string.uuid(),
      serviceId: faker.string.uuid(),
      name: `${type.toLowerCase()}_usage`,
      type,
      value,
      unit,
      timestamp: faker.date.recent({ days: 1 }),
      labels: {
        instance: faker.internet.ip(),
        region: faker.location.countryCode(),
      },
      warningThreshold: value * 1.5,
      criticalThreshold: value * 2,
      ...overrides,
    };
  }

  static createMany(count: number, overrides: Partial<MockMetric> = {}): MockMetric[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createTimeSeries(serviceId: string, metricName: string, hours: number = 24): MockMetric[] {
    const metrics: MockMetric[] = [];
    const now = new Date();
    
    for (let i = hours; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - (i * 60 * 60 * 1000));
      metrics.push(this.create({
        serviceId,
        name: metricName,
        timestamp,
      }));
    }
    
    return metrics;
  }

  private static generateValueForType(type: ResourceType): number {
    switch (type) {
      case 'CPU':
      case 'MEMORY':
      case 'DISK':
        return faker.number.float({ min: 0, max: 100, fractionDigits: 2 });
      case 'NETWORK':
        return faker.number.float({ min: 0, max: 1000, fractionDigits: 2 });
      case 'DATABASE_CONNECTIONS':
        return faker.number.int({ min: 0, max: 100 });
      case 'API_REQUESTS':
        return faker.number.int({ min: 0, max: 10000 });
      case 'CUSTOM':
      default:
        return faker.number.float({ min: 0, max: 1000, fractionDigits: 2 });
    }
  }

  private static getUnitForType(type: ResourceType): string {
    switch (type) {
      case 'CPU':
      case 'MEMORY':
      case 'DISK':
        return '%';
      case 'NETWORK':
        return 'MB/s';
      case 'DATABASE_CONNECTIONS':
        return 'connections';
      case 'API_REQUESTS':
        return 'req/s';
      case 'CUSTOM':
      default:
        return 'units';
    }
  }
}

/**
 * Alert Factory
 */
export class AlertFactory {
  static create(overrides: Partial<MockAlert> = {}): MockAlert {
    const severity = faker.helpers.arrayElement<AlertSeverity>(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
    const status = faker.helpers.arrayElement<AlertStatus>(['ACTIVE', 'RESOLVED', 'ACKNOWLEDGED', 'SUPPRESSED']);
    
    return {
      id: faker.string.uuid(),
      serviceId: faker.string.uuid(),
      name: faker.hacker.phrase(),
      description: faker.lorem.sentence(),
      severity,
      status,
      triggeredAt: faker.date.recent({ days: 7 }),
      resolvedAt: status === 'RESOLVED' ? faker.date.recent({ days: 1 }) : undefined,
      acknowledgedAt: status === 'ACKNOWLEDGED' ? faker.date.recent({ days: 3 }) : undefined,
      acknowledgedBy: status === 'ACKNOWLEDGED' ? faker.person.fullName() : undefined,
      triggerValue: faker.number.float({ min: 80, max: 100, fractionDigits: 2 }),
      thresholdValue: faker.number.float({ min: 70, max: 90, fractionDigits: 2 }),
      ...overrides,
    };
  }

  static createMany(count: number, overrides: Partial<MockAlert> = {}): MockAlert[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  static createActive(overrides: Partial<MockAlert> = {}): MockAlert {
    return this.create({ status: 'ACTIVE', ...overrides });
  }

  static createCritical(overrides: Partial<MockAlert> = {}): MockAlert {
    return this.create({ 
      severity: 'CRITICAL', 
      status: 'ACTIVE',
      triggerValue: faker.number.float({ min: 95, max: 100, fractionDigits: 2 }),
      ...overrides 
    });
  }

  static createResolved(overrides: Partial<MockAlert> = {}): MockAlert {
    return this.create({ 
      status: 'RESOLVED', 
      resolvedAt: faker.date.recent({ days: 1 }),
      ...overrides 
    });
  }
}

/**
 * System Analysis Factory
 */
export class SystemAnalysisFactory {
  static create(overrides: Partial<MockSystemAnalysis> = {}): MockSystemAnalysis {
    const totalServices = faker.number.int({ min: 5, max: 50 });
    const healthyServices = faker.number.int({ min: Math.floor(totalServices * 0.6), max: totalServices });
    const degradedServices = faker.number.int({ min: 0, max: Math.floor((totalServices - healthyServices) * 0.7) });
    const unhealthyServices = totalServices - healthyServices - degradedServices;
    
    const healthScore = Math.round((healthyServices / totalServices) * 100);
    const overallHealth: ServiceStatus = healthScore >= 90 ? 'HEALTHY' : 
                                        healthScore >= 70 ? 'DEGRADED' : 'UNHEALTHY';
    
    return {
      id: faker.string.uuid(),
      timestamp: new Date(),
      overallHealth,
      healthScore,
      totalServices,
      healthyServices,
      degradedServices,
      unhealthyServices,
      activeAlerts: faker.number.int({ min: 0, max: Math.floor(totalServices * 0.3) }),
      ...overrides,
    };
  }

  static createHealthy(overrides: Partial<MockSystemAnalysis> = {}): MockSystemAnalysis {
    return this.create({
      overallHealth: 'HEALTHY',
      healthScore: faker.number.int({ min: 90, max: 100 }),
      activeAlerts: faker.number.int({ min: 0, max: 2 }),
      ...overrides,
    });
  }

  static createDegraded(overrides: Partial<MockSystemAnalysis> = {}): MockSystemAnalysis {
    return this.create({
      overallHealth: 'DEGRADED',
      healthScore: faker.number.int({ min: 70, max: 89 }),
      activeAlerts: faker.number.int({ min: 3, max: 8 }),
      ...overrides,
    });
  }

  static createUnhealthy(overrides: Partial<MockSystemAnalysis> = {}): MockSystemAnalysis {
    return this.create({
      overallHealth: 'UNHEALTHY',
      healthScore: faker.number.int({ min: 0, max: 69 }),
      activeAlerts: faker.number.int({ min: 5, max: 15 }),
      ...overrides,
    });
  }
}

/**
 * Complete System Mock Factory
 * Creates a full system with services, containers, metrics, and alerts
 */
export class SystemMockFactory {
  static createCompleteSystem(serviceCount: number = 10) {
    const services = ServiceFactory.createMany(serviceCount);
    const containers: MockContainer[] = [];
    const metrics: MockMetric[] = [];
    const alerts: MockAlert[] = [];

    services.forEach(service => {
      // Add containers for each service
      const serviceContainers = ContainerFactory.createMany(
        faker.number.int({ min: 1, max: 3 })
      );
      containers.push(...serviceContainers);

      // Add metrics for each service
      const serviceMetrics = MetricFactory.createMany(
        faker.number.int({ min: 5, max: 10 }),
        { serviceId: service.id }
      );
      metrics.push(...serviceMetrics);

      // Add alerts for some services
      if (faker.datatype.boolean({ probability: 0.3 })) {
        const serviceAlerts = AlertFactory.createMany(
          faker.number.int({ min: 1, max: 3 }),
          { serviceId: service.id }
        );
        alerts.push(...serviceAlerts);
      }
    });

    const analysis = SystemAnalysisFactory.create({
      totalServices: services.length,
      healthyServices: services.filter(s => s.status === 'HEALTHY').length,
      degradedServices: services.filter(s => s.status === 'DEGRADED').length,
      unhealthyServices: services.filter(s => s.status === 'UNHEALTHY').length,
      activeAlerts: alerts.filter(a => a.status === 'ACTIVE').length,
    });

    return {
      services,
      containers,
      metrics,
      alerts,
      analysis,
    };
  }

  static createLoadTestScenario(serviceCount: number = 100) {
    const system = this.createCompleteSystem(serviceCount);
    
    // Add high load metrics
    system.services.forEach(service => {
      const loadMetrics = [
        MetricFactory.create({
          serviceId: service.id,
          type: 'API_REQUESTS',
          value: faker.number.int({ min: 8000, max: 12000 }),
        }),
        MetricFactory.create({
          serviceId: service.id,
          type: 'CPU',
          value: faker.number.float({ min: 85, max: 98 }),
        }),
        MetricFactory.create({
          serviceId: service.id,
          type: 'MEMORY',
          value: faker.number.float({ min: 80, max: 95 }),
        }),
      ];
      system.metrics.push(...loadMetrics);
    });

    return system;
  }
}

// Export all factories
export {
  ServiceFactory,
  ContainerFactory,
  MetricFactory,
  AlertFactory,
  SystemAnalysisFactory,
  SystemMockFactory,
};