import { faker } from '@faker-js/faker';

// Frontend-specific mock data for React components
export class MockDataFactory {
  // Dashboard overview data
  static createMockSystemOverview() {
    return {
      agents: {
        total: faker.number.int({ min: 5, max: 20 }),
        active: faker.number.int({ min: 3, max: 15 }),
        inactive: faker.number.int({ min: 0, max: 5 }),
        degraded: faker.number.int({ min: 0, max: 3 })
      },
      services: {
        total: faker.number.int({ min: 3, max: 10 }),
        healthy: faker.number.int({ min: 2, max: 8 }),
        degraded: faker.number.int({ min: 0, max: 2 }),
        down: faker.number.int({ min: 0, max: 1 })
      },
      system: {
        cpuUsage: faker.number.float({ min: 10, max: 90, fractionDigits: 1 }),
        memoryUsage: faker.number.float({ min: 20, max: 85, fractionDigits: 1 }),
        diskUsage: faker.number.float({ min: 15, max: 70, fractionDigits: 1 }),
        networkIO: faker.number.float({ min: 0, max: 100, fractionDigits: 2 }),
        uptime: faker.number.float({ min: 95, max: 99.9, fractionDigits: 2 })
      },
      alerts: {
        critical: faker.number.int({ min: 0, max: 3 }),
        warning: faker.number.int({ min: 0, max: 8 }),
        info: faker.number.int({ min: 0, max: 15 })
      }
    };
  }

  // Agent performance data
  static createMockAgent(overrides: any = {}) {
    const status = faker.helpers.arrayElement(['active', 'inactive', 'degraded', 'error']);
    const isHealthy = status === 'active';
    
    return {
      id: faker.string.uuid(),
      name: `${faker.company.name()} Agent`,
      status,
      type: faker.helpers.arrayElement(['processing', 'monitoring', 'analytics', 'automation']),
      version: faker.system.semver(),
      lastSeen: faker.date.recent({ days: 1 }).toISOString(),
      performance: {
        responseTime: faker.number.float({ 
          min: isHealthy ? 50 : 200, 
          max: isHealthy ? 150 : 1000, 
          fractionDigits: 1 
        }),
        successRate: faker.number.float({ 
          min: isHealthy ? 95 : 70, 
          max: isHealthy ? 99.9 : 94, 
          fractionDigits: 2 
        }),
        errorRate: faker.number.float({ 
          min: isHealthy ? 0.1 : 5, 
          max: isHealthy ? 4.9 : 25, 
          fractionDigits: 2 
        }),
        throughput: faker.number.float({ min: 10, max: 1000, fractionDigits: 1 }),
        cpuUsage: faker.number.float({ min: 5, max: 80, fractionDigits: 1 }),
        memoryUsage: faker.number.float({ min: 128, max: 2048, fractionDigits: 1 })
      },
      metadata: {
        environment: faker.helpers.arrayElement(['production', 'staging', 'development']),
        region: faker.location.country(),
        tags: faker.helpers.arrayElements(['critical', 'high-volume', 'user-facing', 'batch'], { min: 0, max: 3 })
      },
      ...overrides
    };
  }

  // Service health data
  static createMockService(overrides: any = {}) {
    const status = faker.helpers.arrayElement(['healthy', 'degraded', 'down']);
    const isHealthy = status === 'healthy';
    
    return {
      name: faker.helpers.arrayElement([
        'api-server', 'web-dashboard', 'auth-service', 'data-processor',
        'notification-service', 'file-storage', 'analytics-engine'
      ]),
      status,
      url: faker.internet.url(),
      version: faker.system.semver(),
      uptime: faker.number.float({ 
        min: status === 'down' ? 0 : status === 'degraded' ? 80 : 98, 
        max: status === 'down' ? 50 : status === 'degraded' ? 97 : 99.9, 
        fractionDigits: 2 
      }),
      responseTime: faker.number.int({ 
        min: isHealthy ? 20 : 100, 
        max: isHealthy ? 200 : 2000 
      }),
      errorRate: faker.number.float({ 
        min: isHealthy ? 0.01 : 1, 
        max: isHealthy ? 2 : 15, 
        fractionDigits: 2 
      }),
      healthChecks: {
        database: faker.helpers.arrayElement(['healthy', 'degraded', 'down']),
        cache: faker.helpers.arrayElement(['healthy', 'degraded', 'down']),
        storage: faker.helpers.arrayElement(['healthy', 'degraded', 'down']),
        external: faker.helpers.arrayElement(['healthy', 'degraded', 'down'])
      },
      metrics: {
        requestCount: faker.number.int({ min: 0, max: 10000 }),
        avgResponseTime: faker.number.float({ min: 50, max: 500, fractionDigits: 1 }),
        p95ResponseTime: faker.number.float({ min: 100, max: 1000, fractionDigits: 1 }),
        errorCount: faker.number.int({ min: 0, max: 100 })
      },
      ...overrides
    };
  }

  // Historical trend data
  static createMockTrendData(points: number = 24, metric: string = 'responseTime') {
    const baseValue = metric === 'responseTime' ? 120 : 
                     metric === 'successRate' ? 98 : 
                     metric === 'errorRate' ? 2 : 50;
    const variance = baseValue * 0.2; // 20% variance
    
    return Array.from({ length: points }, (_, index) => {
      const timestamp = new Date(Date.now() - (points - index) * 60 * 60 * 1000);
      const variation = faker.number.float({ min: -variance, max: variance });
      const value = Math.max(0, baseValue + variation);
      
      return {
        timestamp: timestamp.toISOString(),
        value: parseFloat(value.toFixed(2)),
        label: timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
    });
  }

  // Alert data
  static createMockAlert(overrides: any = {}) {
    const severity = faker.helpers.arrayElement(['critical', 'warning', 'info']);
    const alertTypes = ['Performance Degradation', 'Service Outage', 'High Error Rate', 'Resource Exhaustion'];
    
    return {
      id: faker.string.uuid(),
      title: faker.helpers.arrayElement(alertTypes),
      message: faker.lorem.sentence(),
      severity,
      component: faker.helpers.arrayElement(['api-server', 'database', 'cache', 'storage', 'network']),
      timestamp: faker.date.recent({ days: 1 }).toISOString(),
      status: faker.helpers.arrayElement(['active', 'acknowledged', 'resolved']),
      tags: faker.helpers.arrayElements(['performance', 'availability', 'security', 'capacity'], { min: 1, max: 3 }),
      details: {
        metric: faker.helpers.arrayElement(['cpu_usage', 'memory_usage', 'response_time', 'error_rate']),
        currentValue: faker.number.float({ min: 0, max: 100, fractionDigits: 2 }),
        threshold: faker.number.float({ min: 0, max: 100, fractionDigits: 2 }),
        duration: faker.number.int({ min: 1, max: 300 }) // minutes
      },
      ...overrides
    };
  }

  // Chart data for different chart types
  static createMockChartData(type: 'line' | 'bar' | 'area' | 'pie', points: number = 10) {
    switch (type) {
      case 'line':
      case 'area':
        return Array.from({ length: points }, (_, index) => ({
          x: index,
          y: faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
          timestamp: new Date(Date.now() - (points - index) * 60000).toISOString()
        }));
        
      case 'bar':
        const categories = ['API', 'Database', 'Cache', 'Storage', 'Network'];
        return categories.map(category => ({
          category,
          value: faker.number.float({ min: 0, max: 100, fractionDigits: 1 }),
          color: faker.color.rgb()
        }));
        
      case 'pie':
        const segments = ['Healthy', 'Degraded', 'Warning', 'Critical'];
        return segments.map(segment => ({
          name: segment,
          value: faker.number.int({ min: 1, max: 50 }),
          color: faker.color.rgb()
        }));
        
      default:
        return [];
    }
  }

  // WebSocket event simulation
  static createMockWebSocketEvent(type: string, data?: any) {
    return {
      type,
      data: data || {
        timestamp: new Date().toISOString(),
        source: faker.helpers.arrayElement(['agent', 'service', 'system']),
        payload: faker.helpers.arrayElement([
          this.createMockAgent(),
          this.createMockService(),
          this.createMockAlert()
        ])
      }
    };
  }

  // Mobile-specific data
  static createMockMobileOverview() {
    return {
      summary: {
        activeAgents: faker.number.int({ min: 5, max: 25 }),
        healthyServices: faker.number.int({ min: 3, max: 15 }),
        totalServices: faker.number.int({ min: 5, max: 20 }),
        totalAlerts: faker.number.int({ min: 0, max: 10 }),
        systemHealth: faker.helpers.arrayElement(['excellent', 'good', 'warning', 'critical'])
      },
      topPerformers: Array.from({ length: 5 }, () => ({
        name: `Agent ${faker.string.alphanumeric(4)}`,
        score: faker.number.float({ min: 85, max: 99.9, fractionDigits: 1 }),
        trend: faker.helpers.arrayElement(['up', 'down', 'stable'])
      })),
      recentAlerts: Array.from({ length: 3 }, () => this.createMockAlert()),
      quickStats: {
        avgResponseTime: faker.number.float({ min: 80, max: 200, fractionDigits: 1 }),
        successRate: faker.number.float({ min: 95, max: 99.9, fractionDigits: 2 }),
        errorRate: faker.number.float({ min: 0.1, max: 5, fractionDigits: 2 })
      }
    };
  }

  // Performance test data
  static createLargeDataset(size: number = 1000) {
    return {
      agents: Array.from({ length: size }, () => this.createMockAgent()),
      services: Array.from({ length: Math.floor(size / 10) }, () => this.createMockService()),
      trends: Array.from({ length: size * 2 }, (_, index) => ({
        timestamp: new Date(Date.now() - index * 60000).toISOString(),
        value: faker.number.float({ min: 0, max: 1000, fractionDigits: 2 })
      })),
      alerts: Array.from({ length: Math.floor(size / 5) }, () => this.createMockAlert())
    };
  }

  // API response wrappers
  static wrapInApiResponse(data: any, success: boolean = true) {
    return {
      success,
      data,
      timestamp: new Date().toISOString(),
      ...(success ? {} : { error: faker.lorem.sentence() })
    };
  }

  // Complete dashboard mock data
  static createCompleteDashboardMockData() {
    return {
      overview: this.createMockSystemOverview(),
      agents: Array.from({ length: 8 }, () => this.createMockAgent()),
      services: Array.from({ length: 6 }, () => this.createMockService()),
      trends: {
        responseTime: this.createMockTrendData(24, 'responseTime'),
        successRate: this.createMockTrendData(24, 'successRate'),
        errorRate: this.createMockTrendData(24, 'errorRate')
      },
      alerts: Array.from({ length: 5 }, () => this.createMockAlert()),
      charts: {
        performanceChart: this.createMockChartData('area', 20),
        serviceDistribution: this.createMockChartData('pie', 4),
        responseTimeBar: this.createMockChartData('bar', 6)
      }
    };
  }

  // Test scenario generators
  static createErrorScenario() {
    return {
      overview: {
        ...this.createMockSystemOverview(),
        system: {
          cpuUsage: 95.8,
          memoryUsage: 92.3,
          diskUsage: 78.5,
          networkIO: 150.2,
          uptime: 87.4
        }
      },
      agents: Array.from({ length: 3 }, () => this.createMockAgent({ status: 'error' })),
      services: Array.from({ length: 2 }, () => this.createMockService({ status: 'down' })),
      alerts: Array.from({ length: 8 }, () => this.createMockAlert({ severity: 'critical' }))
    };
  }

  static createOptimalScenario() {
    return {
      overview: {
        ...this.createMockSystemOverview(),
        system: {
          cpuUsage: 25.4,
          memoryUsage: 45.7,
          diskUsage: 32.1,
          networkIO: 15.8,
          uptime: 99.9
        }
      },
      agents: Array.from({ length: 10 }, () => this.createMockAgent({ status: 'active' })),
      services: Array.from({ length: 8 }, () => this.createMockService({ status: 'healthy' })),
      alerts: Array.from({ length: 2 }, () => this.createMockAlert({ severity: 'info' }))
    };
  }
}

// Export commonly used mock data
export const mockSystemOverview = MockDataFactory.createMockSystemOverview();
export const mockAgents = Array.from({ length: 5 }, () => MockDataFactory.createMockAgent());
export const mockServices = Array.from({ length: 4 }, () => MockDataFactory.createMockService());
export const mockTrendData = MockDataFactory.createMockTrendData();
export const mockAlerts = Array.from({ length: 3 }, () => MockDataFactory.createMockAlert());
export const mockMobileOverview = MockDataFactory.createMockMobileOverview();
export const mockCompleteDashboard = MockDataFactory.createCompleteDashboardMockData();