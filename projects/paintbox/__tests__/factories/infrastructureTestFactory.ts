/**
 * Infrastructure Test Data Factory
 * Comprehensive factory for generating test data for infrastructure components
 */

import { faker } from '@faker-js/faker';

// Types for infrastructure test data
export interface HealthTestData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, ServiceCheck>;
  summary: HealthSummary;
  timestamp: string;
  uptime: number;
  version: string;
}

export interface ServiceCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  message: string;
  details?: Record<string, any>;
  lastCheck: string;
}

export interface HealthSummary {
  total: number;
  healthy: number;
  degraded: number;
  unhealthy: number;
}

export interface WorkflowTestData {
  id: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  input: Record<string, any>;
  output?: Record<string, any>;
  startTime: string;
  endTime?: string;
  duration?: number;
  progress: number;
  error?: string;
  metadata: Record<string, any>;
}

export interface LoadTestData {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  scenario: LoadTestScenario;
  metrics: LoadTestMetrics;
  startTime: string;
  endTime?: string;
  duration?: number;
}

export interface LoadTestScenario {
  id: string;
  name: string;
  targetUrl: string;
  virtualUsers: number;
  duration: number;
  rampUpTime: number;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

export interface LoadTestMetrics {
  rps: number;
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  errorRate: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
}

export interface BackupTestData {
  id: string;
  type: 'database' | 'files' | 'full';
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  size: number;
  location: string;
  checksum: string;
  metadata: Record<string, any>;
}

export interface AlertTestData {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  source: string;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  metadata: Record<string, any>;
}

/**
 * Infrastructure Test Data Factory
 */
export class InfrastructureTestFactory {
  // Health Check Test Data
  static createHealthyResponse(): HealthTestData {
    const services = ['database', 'redis', 'temporal', 'api', 'websocket'];
    const checks: Record<string, ServiceCheck> = {};
    
    services.forEach(service => {
      checks[service] = {
        status: 'healthy',
        responseTime: faker.number.int({ min: 5, max: 50 }),
        message: `${service} is operating normally`,
        details: this.createServiceDetails(service),
        lastCheck: faker.date.recent().toISOString()
      };
    });

    return {
      status: 'healthy',
      checks,
      summary: {
        total: services.length,
        healthy: services.length,
        degraded: 0,
        unhealthy: 0
      },
      timestamp: new Date().toISOString(),
      uptime: faker.number.int({ min: 86400, max: 2592000 }), // 1 day to 30 days
      version: faker.system.semver()
    };
  }

  static createDegradedResponse(): HealthTestData {
    const healthyData = this.createHealthyResponse();
    
    // Make one service degraded
    const serviceNames = Object.keys(healthyData.checks);
    const degradedService = faker.helpers.arrayElement(serviceNames);
    
    healthyData.checks[degradedService] = {
      status: 'degraded',
      responseTime: faker.number.int({ min: 100, max: 500 }),
      message: `${degradedService} is experiencing performance issues`,
      details: this.createServiceDetails(degradedService),
      lastCheck: faker.date.recent().toISOString()
    };

    healthyData.status = 'degraded';
    healthyData.summary.healthy -= 1;
    healthyData.summary.degraded = 1;

    return healthyData;
  }

  static createUnhealthyResponse(): HealthTestData {
    const healthyData = this.createHealthyResponse();
    
    // Make multiple services unhealthy
    const serviceNames = Object.keys(healthyData.checks);
    const unhealthyServices = faker.helpers.arrayElements(serviceNames, { min: 2, max: 3 });
    
    unhealthyServices.forEach(service => {
      healthyData.checks[service] = {
        status: 'unhealthy',
        responseTime: faker.number.int({ min: 1000, max: 5000 }),
        message: `${service} is not responding`,
        details: this.createServiceDetails(service),
        lastCheck: faker.date.recent().toISOString()
      };
    });

    healthyData.status = 'unhealthy';
    healthyData.summary.healthy -= unhealthyServices.length;
    healthyData.summary.unhealthy = unhealthyServices.length;

    return healthyData;
  }

  static createHealthyResponseWithCircuitBreakers(): HealthTestData {
    const healthyData = this.createHealthyResponse();
    
    healthyData['circuitBreakers'] = {
      database: {
        state: 'closed',
        failureCount: 0,
        lastFailure: null,
        nextAttempt: null
      },
      redis: {
        state: 'closed',
        failureCount: 0,
        lastFailure: null,
        nextAttempt: null
      },
      temporal: {
        state: 'half-open',
        failureCount: 2,
        lastFailure: faker.date.recent().toISOString(),
        nextAttempt: faker.date.future().toISOString()
      }
    };

    return healthyData;
  }

  private static createServiceDetails(service: string): Record<string, any> {
    switch (service) {
      case 'database':
        return {
          connections: faker.number.int({ min: 1, max: 20 }),
          maxConnections: 100,
          queryTime: faker.number.float({ min: 0.1, max: 5.0, fractionDigits: 2 }),
          transactions: faker.number.int({ min: 100, max: 1000 })
        };
      case 'redis':
        return {
          memory: `${faker.number.int({ min: 10, max: 100 })}MB`,
          keyspace: `db0:keys=${faker.number.int({ min: 50, max: 500 })}`,
          hitRate: faker.number.float({ min: 0.8, max: 0.99, fractionDigits: 3 }),
          avgTtl: faker.number.int({ min: 300, max: 3600 })
        };
      case 'temporal':
        return {
          workflows: faker.number.int({ min: 0, max: 10 }),
          activities: faker.number.int({ min: 0, max: 50 }),
          queueDepth: faker.number.int({ min: 0, max: 5 }),
          workerCount: faker.number.int({ min: 1, max: 10 })
        };
      case 'api':
        return {
          requestsPerSecond: faker.number.int({ min: 10, max: 100 }),
          avgResponseTime: faker.number.float({ min: 10, max: 100, fractionDigits: 1 }),
          errorRate: faker.number.float({ min: 0, max: 0.05, fractionDigits: 4 }),
          activeConnections: faker.number.int({ min: 5, max: 50 })
        };
      case 'websocket':
        return {
          connections: faker.number.int({ min: 10, max: 1000 }),
          messagesPerSecond: faker.number.int({ min: 50, max: 500 }),
          avgLatency: faker.number.float({ min: 1, max: 20, fractionDigits: 1 }),
          subscriberCount: faker.number.int({ min: 5, max: 100 })
        };
      default:
        return {
          status: 'operational',
          lastUpdate: faker.date.recent().toISOString()
        };
    }
  }

  // Workflow Test Data
  static createRunningWorkflow(): WorkflowTestData {
    return {
      id: faker.string.uuid(),
      type: faker.helpers.arrayElement(['agent-workflow', 'data-processing', 'notification', 'backup']),
      status: 'running',
      input: {
        prompt: faker.lorem.sentence(),
        userId: faker.string.uuid(),
        options: {
          timeout: 300000,
          retries: 3
        }
      },
      startTime: faker.date.recent().toISOString(),
      progress: faker.number.int({ min: 10, max: 90 }),
      metadata: {
        workerId: faker.string.alphanumeric(8),
        queue: 'default',
        attempt: 1,
        estimatedDuration: faker.number.int({ min: 60000, max: 600000 })
      }
    };
  }

  static createCompletedWorkflow(): WorkflowTestData {
    const workflow = this.createRunningWorkflow();
    workflow.status = 'completed';
    workflow.progress = 100;
    workflow.endTime = faker.date.recent().toISOString();
    workflow.duration = faker.number.int({ min: 30000, max: 300000 });
    workflow.output = {
      response: faker.lorem.paragraphs(2),
      metadata: {
        toolsUsed: faker.helpers.arrayElements(['api-call', 'database-query', 'file-operation']),
        cost: faker.number.float({ min: 0.01, max: 1.0, fractionDigits: 3 })
      }
    };

    return workflow;
  }

  static createFailedWorkflow(): WorkflowTestData {
    const workflow = this.createRunningWorkflow();
    workflow.status = 'failed';
    workflow.endTime = faker.date.recent().toISOString();
    workflow.duration = faker.number.int({ min: 10000, max: 100000 });
    workflow.error = faker.helpers.arrayElement([
      'Timeout exceeded',
      'Authentication failed',
      'Rate limit exceeded',
      'Service unavailable',
      'Invalid input parameters'
    ]);

    return workflow;
  }

  static createWorkflowMetrics() {
    return {
      totalExecutions: faker.number.int({ min: 100, max: 10000 }),
      successRate: faker.number.float({ min: 0.85, max: 0.99, fractionDigits: 3 }),
      avgDuration: faker.number.int({ min: 30000, max: 180000 }),
      p95Duration: faker.number.int({ min: 60000, max: 300000 }),
      errorRate: faker.number.float({ min: 0.01, max: 0.15, fractionDigits: 3 }),
      throughput: faker.number.float({ min: 1.0, max: 10.0, fractionDigits: 1 }),
      costPerExecution: faker.number.float({ min: 0.01, max: 0.5, fractionDigits: 3 })
    };
  }

  // Load Testing Test Data
  static createLoadTestScenario(): LoadTestScenario {
    return {
      id: faker.string.uuid(),
      name: faker.company.buzzPhrase(),
      targetUrl: faker.internet.url(),
      virtualUsers: faker.number.int({ min: 10, max: 1000 }),
      duration: faker.number.int({ min: 60, max: 3600 }), // 1 minute to 1 hour
      rampUpTime: faker.number.int({ min: 10, max: 300 }), // 10 seconds to 5 minutes
      method: faker.helpers.arrayElement(['GET', 'POST', 'PUT', 'DELETE']),
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'LoadTest/1.0',
        'Accept': 'application/json'
      },
      body: faker.helpers.maybe(() => JSON.stringify({
        data: faker.lorem.words(10)
      }), { probability: 0.3 })
    };
  }

  static createLoadTestResult(): LoadTestData {
    const scenario = this.createLoadTestScenario();
    
    return {
      id: faker.string.uuid(),
      name: scenario.name,
      status: faker.helpers.arrayElement(['running', 'completed', 'failed']),
      scenario,
      metrics: this.createLoadTestMetrics(),
      startTime: faker.date.recent().toISOString(),
      endTime: faker.helpers.maybe(() => faker.date.recent().toISOString()),
      duration: faker.number.int({ min: 60000, max: 3600000 })
    };
  }

  static createLoadTestMetrics(): LoadTestMetrics {
    const totalRequests = faker.number.int({ min: 1000, max: 100000 });
    const errorRate = faker.number.float({ min: 0, max: 0.1, fractionDigits: 3 });
    const failedRequests = Math.floor(totalRequests * errorRate);
    const successfulRequests = totalRequests - failedRequests;

    return {
      rps: faker.number.float({ min: 10, max: 1000, fractionDigits: 1 }),
      avgResponseTime: faker.number.int({ min: 50, max: 500 }),
      minResponseTime: faker.number.int({ min: 10, max: 50 }),
      maxResponseTime: faker.number.int({ min: 500, max: 5000 }),
      p95ResponseTime: faker.number.int({ min: 100, max: 1000 }),
      p99ResponseTime: faker.number.int({ min: 200, max: 2000 }),
      errorRate,
      totalRequests,
      successfulRequests,
      failedRequests
    };
  }

  static createRealTimeLoadTestMetrics() {
    return {
      timestamp: new Date().toISOString(),
      currentRps: faker.number.float({ min: 5, max: 100, fractionDigits: 1 }),
      activeUsers: faker.number.int({ min: 10, max: 500 }),
      responseTime: faker.number.int({ min: 50, max: 300 }),
      errorCount: faker.number.int({ min: 0, max: 10 }),
      successCount: faker.number.int({ min: 100, max: 1000 }),
      bytesReceived: faker.number.int({ min: 1024, max: 1048576 }),
      bytesSent: faker.number.int({ min: 512, max: 524288 })
    };
  }

  // Disaster Recovery Test Data
  static createBackupStatus(): BackupTestData {
    return {
      id: faker.string.uuid(),
      type: faker.helpers.arrayElement(['database', 'files', 'full']),
      status: faker.helpers.arrayElement(['completed', 'running', 'failed']),
      startTime: faker.date.recent().toISOString(),
      endTime: faker.helpers.maybe(() => faker.date.recent().toISOString()),
      size: faker.number.int({ min: 1024 * 1024, max: 10 * 1024 * 1024 * 1024 }), // 1MB to 10GB
      location: faker.system.filePath(),
      checksum: faker.string.hexadecimal({ length: 64 }),
      metadata: {
        compression: faker.helpers.arrayElement(['gzip', 'lz4', 'zstd']),
        encryption: true,
        retentionDays: faker.number.int({ min: 7, max: 365 }),
        tags: faker.helpers.arrayElements(['daily', 'weekly', 'monthly', 'critical'])
      }
    };
  }

  static createRestorePoint() {
    return {
      id: faker.string.uuid(),
      timestamp: faker.date.recent().toISOString(),
      type: faker.helpers.arrayElement(['automatic', 'manual', 'pre-deployment']),
      size: faker.number.int({ min: 1024 * 1024, max: 5 * 1024 * 1024 * 1024 }),
      description: faker.lorem.sentence(),
      verified: faker.datatype.boolean(),
      retentionUntil: faker.date.future().toISOString(),
      metadata: {
        version: faker.system.semver(),
        environment: faker.helpers.arrayElement(['production', 'staging', 'development']),
        triggeredBy: faker.internet.email()
      }
    };
  }

  static createDRMetrics() {
    return {
      rto: faker.number.int({ min: 5, max: 60 }), // 5-60 minutes
      rpo: faker.number.int({ min: 1, max: 15 }), // 1-15 minutes
      lastSuccessfulBackup: faker.date.recent().toISOString(),
      backupFrequency: faker.helpers.arrayElement(['hourly', 'daily', 'weekly']),
      replicationLag: faker.number.float({ min: 0.1, max: 10.0, fractionDigits: 1 }), // seconds
      availabilityPercentage: faker.number.float({ min: 99.0, max: 99.99, fractionDigits: 3 }),
      mttr: faker.number.int({ min: 5, max: 120 }), // 5-120 minutes
      mtbf: faker.number.int({ min: 720, max: 8760 }) // 30 days to 1 year in hours
    };
  }

  static createDRDrill() {
    return {
      id: faker.string.uuid(),
      name: faker.lorem.words(3),
      type: faker.helpers.arrayElement(['failover-test', 'backup-restore', 'network-partition', 'data-corruption']),
      status: faker.helpers.arrayElement(['scheduled', 'running', 'completed', 'failed']),
      scheduledTime: faker.date.future().toISOString(),
      startTime: faker.helpers.maybe(() => faker.date.recent().toISOString()),
      endTime: faker.helpers.maybe(() => faker.date.recent().toISOString()),
      duration: faker.helpers.maybe(() => faker.number.int({ min: 300000, max: 7200000 })), // 5 minutes to 2 hours
      success: faker.helpers.maybe(() => faker.datatype.boolean()),
      results: faker.helpers.maybe(() => ({
        rtoAchieved: faker.number.int({ min: 5, max: 30 }),
        rpoAchieved: faker.number.int({ min: 1, max: 10 }),
        issuesFound: faker.number.int({ min: 0, max: 5 }),
        recommendations: faker.lorem.sentences(3)
      })),
      participants: faker.helpers.arrayElements([
        faker.internet.email(),
        faker.internet.email(),
        faker.internet.email()
      ])
    };
  }

  // Alert Test Data
  static createAlert(): AlertTestData {
    return {
      id: faker.string.uuid(),
      title: faker.helpers.arrayElement([
        'High CPU Usage Detected',
        'Database Connection Failed',
        'Disk Space Low',
        'Memory Usage Critical',
        'API Response Time High',
        'Backup Failed',
        'Security Breach Detected'
      ]),
      message: faker.lorem.paragraph(),
      severity: faker.helpers.arrayElement(['info', 'warning', 'error', 'critical']),
      source: faker.helpers.arrayElement(['health-monitor', 'workflow-engine', 'load-balancer', 'backup-service']),
      timestamp: faker.date.recent().toISOString(),
      acknowledged: faker.datatype.boolean(),
      acknowledgedBy: faker.helpers.maybe(() => faker.internet.email()),
      acknowledgedAt: faker.helpers.maybe(() => faker.date.recent().toISOString()),
      metadata: {
        service: faker.helpers.arrayElement(['database', 'redis', 'api', 'frontend']),
        environment: faker.helpers.arrayElement(['production', 'staging', 'development']),
        region: faker.helpers.arrayElement(['us-east-1', 'us-west-2', 'eu-west-1']),
        threshold: faker.number.float({ min: 50, max: 95, fractionDigits: 1 }),
        currentValue: faker.number.float({ min: 80, max: 100, fractionDigits: 1 })
      }
    };
  }

  static createCriticalAlert(): AlertTestData {
    const alert = this.createAlert();
    alert.severity = 'critical';
    alert.title = faker.helpers.arrayElement([
      'System Down',
      'Data Breach Detected',
      'Critical Service Failure',
      'Database Corruption'
    ]);
    return alert;
  }

  // WebSocket Test Data
  static createWebSocketMessage() {
    return {
      type: faker.helpers.arrayElement([
        'health-update',
        'workflow-update',
        'load-test-update',
        'backup-update',
        'alert'
      ]),
      payload: {
        timestamp: new Date().toISOString(),
        data: faker.lorem.words(10)
      },
      id: faker.string.uuid()
    };
  }

  static createSlackWebhookPayload() {
    return {
      token: faker.string.alphanumeric(20),
      team_id: faker.string.alphanumeric(10),
      api_app_id: faker.string.alphanumeric(10),
      event: {
        type: 'app_mention',
        user: faker.string.alphanumeric(10),
        text: `<@${faker.string.alphanumeric(10)}> ${faker.lorem.sentence()}`,
        ts: faker.date.recent().getTime().toString(),
        channel: faker.string.alphanumeric(10),
        thread_ts: faker.helpers.maybe(() => faker.date.recent().getTime().toString())
      },
      type: 'event_callback',
      event_id: faker.string.uuid(),
      event_time: Math.floor(Date.now() / 1000)
    };
  }

  static createGitHubWebhookPayload() {
    return {
      action: faker.helpers.arrayElement(['opened', 'closed', 'synchronize']),
      number: faker.number.int({ min: 1, max: 1000 }),
      pull_request: {
        id: faker.number.int({ min: 1, max: 1000000 }),
        number: faker.number.int({ min: 1, max: 1000 }),
        title: faker.lorem.sentence(),
        user: {
          login: faker.internet.userName(),
          id: faker.number.int({ min: 1, max: 1000000 })
        },
        body: faker.lorem.paragraphs(2),
        state: faker.helpers.arrayElement(['open', 'closed']),
        head: {
          sha: faker.git.commitSha(),
          ref: faker.git.branch()
        },
        base: {
          sha: faker.git.commitSha(),
          ref: 'main'
        }
      },
      repository: {
        id: faker.number.int({ min: 1, max: 1000000 }),
        name: faker.lorem.word(),
        full_name: `${faker.internet.userName()}/${faker.lorem.word()}`,
        owner: {
          login: faker.internet.userName(),
          id: faker.number.int({ min: 1, max: 1000000 })
        }
      }
    };
  }

  // User and Authentication Test Data
  static createTestUser() {
    return {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      name: faker.person.fullName(),
      role: faker.helpers.arrayElement(['viewer', 'operator', 'admin']),
      permissions: faker.helpers.arrayElements([
        'health:read',
        'workflows:read',
        'workflows:create',
        'workflows:cancel',
        'load-testing:read',
        'load-testing:run',
        'disaster-recovery:read',
        'disaster-recovery:backup'
      ]),
      createdAt: faker.date.past().toISOString(),
      lastLogin: faker.date.recent().toISOString(),
      active: true
    };
  }

  static createAdminUser() {
    const user = this.createTestUser();
    user.role = 'admin';
    user.permissions = [
      'health:read',
      'workflows:read',
      'workflows:create',
      'workflows:cancel',
      'load-testing:read',
      'load-testing:run',
      'disaster-recovery:read',
      'disaster-recovery:backup',
      'disaster-recovery:restore',
      'system:admin',
      'users:manage'
    ];
    return user;
  }

  // Batch data generation
  static createHealthHistory(count: number = 100) {
    return Array.from({ length: count }, (_, i) => ({
      timestamp: new Date(Date.now() - i * 30000).toISOString(), // Every 30 seconds
      responseTime: faker.number.int({ min: 10, max: 200 }),
      status: faker.helpers.weightedArrayElement([
        { weight: 80, value: 'healthy' },
        { weight: 15, value: 'degraded' },
        { weight: 5, value: 'unhealthy' }
      ])
    }));
  }

  static createWorkflowExecutions(count: number = 50) {
    return Array.from({ length: count }, () => {
      const status = faker.helpers.weightedArrayElement([
        { weight: 70, value: 'completed' },
        { weight: 20, value: 'running' },
        { weight: 8, value: 'failed' },
        { weight: 2, value: 'cancelled' }
      ]);

      return status === 'completed' ? this.createCompletedWorkflow() :
             status === 'failed' ? this.createFailedWorkflow() :
             this.createRunningWorkflow();
    });
  }

  static createAlertHistory(count: number = 30) {
    return Array.from({ length: count }, () => {
      const severity = faker.helpers.weightedArrayElement([
        { weight: 50, value: 'info' },
        { weight: 30, value: 'warning' },
        { weight: 15, value: 'error' },
        { weight: 5, value: 'critical' }
      ]);

      const alert = this.createAlert();
      alert.severity = severity;
      return alert;
    });
  }

  static createLargeDataset(recordCount: number) {
    return {
      healthMetrics: this.createHealthHistory(recordCount),
      workflows: this.createWorkflowExecutions(Math.floor(recordCount / 2)),
      alerts: this.createAlertHistory(Math.floor(recordCount / 5)),
      loadTests: Array.from({ length: Math.floor(recordCount / 10) }, () => this.createLoadTestResult()),
      backups: Array.from({ length: Math.floor(recordCount / 20) }, () => this.createBackupStatus())
    };
  }

  // Helper methods for specific test scenarios
  static createLoadingState() {
    return {
      isLoading: true,
      data: null,
      error: null,
      lastUpdate: null
    };
  }

  static createErrorState(errorMessage: string = 'Failed to load data') {
    return {
      isLoading: false,
      data: null,
      error: errorMessage,
      lastUpdate: null
    };
  }

  static createEmptyState() {
    return {
      isLoading: false,
      data: [],
      error: null,
      lastUpdate: new Date().toISOString()
    };
  }

  // Performance test data
  static createPerformanceMetrics() {
    return {
      apiResponseTime: faker.number.int({ min: 50, max: 300 }),
      databaseQueryTime: faker.number.int({ min: 5, max: 100 }),
      cacheHitRate: faker.number.float({ min: 0.8, max: 0.99, fractionDigits: 3 }),
      memoryUsage: faker.number.float({ min: 0.3, max: 0.9, fractionDigits: 2 }),
      cpuUsage: faker.number.float({ min: 0.1, max: 0.8, fractionDigits: 2 }),
      diskUsage: faker.number.float({ min: 0.2, max: 0.7, fractionDigits: 2 }),
      networkLatency: faker.number.int({ min: 1, max: 50 }),
      throughput: faker.number.int({ min: 100, max: 10000 })
    };
  }
}

export default InfrastructureTestFactory;