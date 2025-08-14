import { faker } from '@faker-js/faker';
import type {
  TemporalConnection,
  TemporalWorkflow,
  APIKey,
  APIKeyUsage,
  MonitoringMetric,
  Alert,
  NotificationChannel,
  CircuitBreaker,
  SecurityScan,
  Vulnerability,
  ComplianceStatus,
} from '@/lib/types/production';

export class ProductionTestFactory {
  static createTemporalConnection(overrides: Partial<TemporalConnection> = {}): TemporalConnection {
    return {
      id: faker.string.uuid(),
      name: faker.company.name() + ' Temporal',
      namespace: faker.internet.domainWord(),
      endpoint: `${faker.internet.domainName()}:7233`,
      status: faker.helpers.arrayElement(['connected', 'disconnected', 'testing', 'error']),
      createdAt: faker.date.past().toISOString(),
      updatedAt: faker.date.recent().toISOString(),
      lastTestAt: faker.date.recent().toISOString(),
      metadata: {
        region: faker.location.countryCode(),
        version: faker.system.semver(),
      },
      tls: {
        enabled: faker.datatype.boolean(),
        cert: faker.datatype.boolean() ? faker.string.alphanumeric(1000) : undefined,
        key: faker.datatype.boolean() ? faker.string.alphanumeric(1000) : undefined,
      },
      ...overrides,
    };
  }

  static createTemporalWorkflow(overrides: Partial<TemporalWorkflow> = {}): TemporalWorkflow {
    const startTime = faker.date.past();
    const isCompleted = faker.datatype.boolean();
    const status = isCompleted
      ? faker.helpers.arrayElement(['completed', 'failed', 'cancelled', 'terminated'])
      : 'running';

    return {
      id: faker.string.uuid(),
      name: faker.hacker.phrase().replace(/\s+/g, '_'),
      connectionId: faker.string.uuid(),
      status,
      startTime: startTime.toISOString(),
      endTime: isCompleted ? faker.date.between({ from: startTime, to: new Date() }).toISOString() : undefined,
      runId: faker.string.uuid(),
      workflowType: faker.helpers.arrayElement(['DataSync', 'ReportGeneration', 'EmailCampaign', 'BackupProcess']),
      input: {
        userId: faker.string.uuid(),
        batchSize: faker.number.int({ min: 10, max: 1000 }),
        options: faker.helpers.objectKey({ parallel: true, retries: 3 }),
      },
      result: isCompleted ? { processed: faker.number.int({ min: 1, max: 1000 }) } : undefined,
      error: status === 'failed' ? faker.lorem.sentence() : undefined,
      history: Array.from({ length: faker.number.int({ min: 1, max: 10 }) }, (_, i) => ({
        id: faker.string.uuid(),
        timestamp: faker.date.between({ from: startTime, to: new Date() }).toISOString(),
        eventType: faker.helpers.arrayElement(['WorkflowExecutionStarted', 'ActivityTaskScheduled', 'ActivityTaskCompleted']),
        eventId: i + 1,
        details: { step: i + 1, duration: faker.number.int({ min: 100, max: 5000 }) },
      })),
      ...overrides,
    };
  }

  static createAPIKey(overrides: Partial<APIKey> = {}): APIKey {
    const createdAt = faker.date.past();
    const hasExpiry = faker.datatype.boolean();
    const isActive = faker.datatype.boolean();

    return {
      id: faker.string.uuid(),
      name: faker.hacker.noun() + '_key',
      keyPrefix: 'pk_' + faker.string.alphanumeric(8),
      status: isActive ? 'active' : faker.helpers.arrayElement(['revoked', 'expired']),
      permissions: faker.helpers.arrayElements([
        'read:metrics', 'write:metrics', 'read:alerts', 'write:alerts',
        'read:workflows', 'write:workflows', 'admin:all'
      ], { min: 1, max: 4 }),
      createdAt: createdAt.toISOString(),
      expiresAt: hasExpiry ? faker.date.future({ refDate: createdAt }).toISOString() : undefined,
      lastUsedAt: faker.datatype.boolean() ? faker.date.recent().toISOString() : undefined,
      usage: {
        total: faker.number.int({ min: 0, max: 100000 }),
        thisMonth: faker.number.int({ min: 0, max: 10000 }),
        thisWeek: faker.number.int({ min: 0, max: 2000 }),
      },
      rateLimits: {
        requestsPerMinute: faker.helpers.arrayElement([60, 100, 500, 1000]),
        requestsPerHour: faker.helpers.arrayElement([3600, 6000, 30000, 60000]),
        requestsPerDay: faker.helpers.arrayElement([86400, 144000, 720000, 1440000]),
      },
      ...overrides,
    };
  }

  static createAPIKeyUsage(overrides: Partial<APIKeyUsage> = {}): APIKeyUsage {
    const requests = faker.number.int({ min: 0, max: 1000 });
    const errors = faker.number.int({ min: 0, max: Math.floor(requests * 0.1) });

    return {
      timestamp: faker.date.recent().toISOString(),
      requests,
      errors,
      endpoints: {
        '/api/v1/metrics': faker.number.int({ min: 0, max: Math.floor(requests * 0.4) }),
        '/api/v1/alerts': faker.number.int({ min: 0, max: Math.floor(requests * 0.3) }),
        '/api/v1/workflows': faker.number.int({ min: 0, max: Math.floor(requests * 0.3) }),
      },
      ...overrides,
    };
  }

  static createMonitoringMetric(overrides: Partial<MonitoringMetric> = {}): MonitoringMetric {
    const metricName = faker.helpers.arrayElement(['cpu_usage', 'memory_usage', 'disk_usage', 'response_time', 'error_rate']);
    const value = metricName.includes('usage')
      ? faker.number.float({ min: 0, max: 100, fractionDigits: 2 })
      : faker.number.float({ min: 0, max: 1000, fractionDigits: 2 });

    return {
      name: metricName,
      value,
      unit: metricName.includes('usage') ? 'percent' : metricName.includes('time') ? 'ms' : 'count',
      timestamp: faker.date.recent().toISOString(),
      tags: {
        service: faker.helpers.arrayElement(['api', 'database', 'cache', 'worker']),
        environment: faker.helpers.arrayElement(['production', 'staging', 'development']),
        region: faker.location.countryCode(),
      },
      threshold: {
        warning: value * 0.8,
        critical: value * 0.9,
      },
      ...overrides,
    };
  }

  static createAlert(overrides: Partial<Alert> = {}): Alert {
    const createdAt = faker.date.past();
    const isTriggered = faker.datatype.boolean();
    const isResolved = isTriggered && faker.datatype.boolean();

    return {
      id: faker.string.uuid(),
      name: faker.hacker.phrase().replace(/\s+/g, '_') + '_alert',
      description: faker.lorem.sentence(),
      status: isResolved ? 'resolved' : isTriggered ? 'active' : 'suppressed',
      severity: faker.helpers.arrayElement(['low', 'medium', 'high', 'critical']),
      metricName: faker.helpers.arrayElement(['cpu_usage', 'memory_usage', 'error_rate', 'response_time']),
      condition: {
        operator: faker.helpers.arrayElement(['gt', 'lt', 'gte', 'lte']),
        threshold: faker.number.float({ min: 1, max: 100 }),
        duration: faker.number.int({ min: 1, max: 60 }),
      },
      notifications: {
        channels: faker.helpers.arrayElements(['email', 'slack', 'webhook'], { min: 1, max: 3 }),
        escalation: faker.datatype.boolean() ? {
          delay: faker.number.int({ min: 5, max: 30 }),
          channels: ['email'],
        } : undefined,
      },
      createdAt: createdAt.toISOString(),
      triggeredAt: isTriggered ? faker.date.between({ from: createdAt, to: new Date() }).toISOString() : undefined,
      resolvedAt: isResolved ? faker.date.recent().toISOString() : undefined,
      lastNotificationAt: isTriggered ? faker.date.recent().toISOString() : undefined,
      ...overrides,
    };
  }

  static createNotificationChannel(overrides: Partial<NotificationChannel> = {}): NotificationChannel {
    const type = faker.helpers.arrayElement(['email', 'slack', 'webhook', 'sms']);

    let config: NotificationChannel['config'] = {};
    switch (type) {
      case 'email':
        config.email = { address: faker.internet.email() };
        break;
      case 'slack':
        config.slack = {
          webhook: faker.internet.url(),
          channel: '#' + faker.hacker.noun(),
        };
        break;
      case 'webhook':
        config.webhook = {
          url: faker.internet.url(),
          headers: { 'Authorization': 'Bearer ' + faker.string.alphanumeric(32) },
        };
        break;
      case 'sms':
        config.sms = { phoneNumber: faker.phone.number() };
        break;
    }

    return {
      id: faker.string.uuid(),
      name: faker.company.name() + ' ' + type,
      type,
      config,
      enabled: faker.datatype.boolean(),
      createdAt: faker.date.past().toISOString(),
      ...overrides,
    };
  }

  static createCircuitBreaker(overrides: Partial<CircuitBreaker> = {}): CircuitBreaker {
    const successCount = faker.number.int({ min: 0, max: 1000 });
    const failureCount = faker.number.int({ min: 0, max: 100 });
    const state = failureCount > 10 ? 'open' : successCount > failureCount ? 'closed' : 'half_open';

    return {
      name: faker.hacker.noun() + '_breaker',
      service: faker.helpers.arrayElement(['payment-service', 'user-service', 'notification-service', 'analytics-service']),
      state,
      failureThreshold: faker.number.int({ min: 5, max: 50 }),
      recoveryTimeout: faker.number.int({ min: 30, max: 300 }),
      requestTimeout: faker.number.int({ min: 1000, max: 30000 }),
      metrics: {
        successCount,
        failureCount,
        timeouts: faker.number.int({ min: 0, max: 20 }),
        consecutiveFailures: state === 'open' ? faker.number.int({ min: 5, max: 20 }) : faker.number.int({ min: 0, max: 4 }),
        lastFailureTime: failureCount > 0 ? faker.date.recent().toISOString() : undefined,
        lastSuccessTime: successCount > 0 ? faker.date.recent().toISOString() : undefined,
      },
      config: {
        enabled: faker.datatype.boolean(),
        automaticRecovery: faker.datatype.boolean(),
        notificationsEnabled: faker.datatype.boolean(),
      },
      createdAt: faker.date.past().toISOString(),
      updatedAt: faker.date.recent().toISOString(),
      ...overrides,
    };
  }

  static createSecurityScan(overrides: Partial<SecurityScan> = {}): SecurityScan {
    const startedAt = faker.date.past();
    const status = faker.helpers.arrayElement(['pending', 'running', 'completed', 'failed', 'cancelled']);
    const isCompleted = status === 'completed';

    return {
      id: faker.string.uuid(),
      name: faker.hacker.phrase().replace(/\s+/g, '_') + '_scan',
      type: faker.helpers.arrayElement(['vulnerability', 'compliance', 'dependency', 'secret']),
      status,
      target: {
        type: faker.helpers.arrayElement(['repository', 'deployment', 'container', 'api']),
        identifier: faker.internet.url(),
      },
      config: {
        depth: faker.helpers.arrayElement(['shallow', 'deep']),
        includeDependencies: faker.datatype.boolean(),
        excludePatterns: faker.datatype.boolean() ? [
          'node_modules/**',
          '*.test.js',
          'dist/**',
        ] : undefined,
      },
      results: isCompleted ? {
        vulnerabilities: Array.from({ length: faker.number.int({ min: 0, max: 10 }) }, () =>
          this.createVulnerability()
        ),
        summary: {
          totalVulnerabilities: faker.number.int({ min: 0, max: 10 }),
          severityBreakdown: {
            critical: faker.number.int({ min: 0, max: 2 }),
            high: faker.number.int({ min: 0, max: 3 }),
            medium: faker.number.int({ min: 0, max: 5 }),
            low: faker.number.int({ min: 0, max: 10 }),
          },
          categoryBreakdown: {
            injection: faker.number.int({ min: 0, max: 2 }),
            broken_auth: faker.number.int({ min: 0, max: 1 }),
            sensitive_data: faker.number.int({ min: 0, max: 2 }),
            xxe: faker.number.int({ min: 0, max: 1 }),
            broken_access: faker.number.int({ min: 0, max: 2 }),
            security_misconfig: faker.number.int({ min: 0, max: 3 }),
            xss: faker.number.int({ min: 0, max: 2 }),
            insecure_deserialization: faker.number.int({ min: 0, max: 1 }),
            vulnerable_components: faker.number.int({ min: 0, max: 4 }),
            insufficient_logging: faker.number.int({ min: 0, max: 1 }),
          },
          complianceScore: faker.number.int({ min: 60, max: 100 }),
          trends: {
            previousScan: {
              total: faker.number.int({ min: 0, max: 15 }),
              new: faker.number.int({ min: 0, max: 5 }),
              fixed: faker.number.int({ min: 0, max: 8 }),
            },
          },
        },
      } : undefined,
      startedAt: startedAt.toISOString(),
      completedAt: isCompleted ? faker.date.between({ from: startedAt, to: new Date() }).toISOString() : undefined,
      triggeredBy: faker.helpers.arrayElement(['manual', 'scheduled', 'webhook']),
      ...overrides,
    };
  }

  static createVulnerability(overrides: Partial<Vulnerability> = {}): Vulnerability {
    const severity = faker.helpers.arrayElement(['low', 'medium', 'high', 'critical']);
    const category = faker.helpers.arrayElement([
      'injection', 'broken_auth', 'sensitive_data', 'xxe', 'broken_access',
      'security_misconfig', 'xss', 'insecure_deserialization', 'vulnerable_components', 'insufficient_logging'
    ]);

    return {
      id: faker.string.uuid(),
      cve: faker.datatype.boolean() ? `CVE-${faker.date.past().getFullYear()}-${faker.number.int({ min: 1000, max: 9999 })}` : undefined,
      title: faker.hacker.phrase(),
      description: faker.lorem.paragraph(),
      severity,
      score: severity === 'critical' ? faker.number.float({ min: 9.0, max: 10.0 }) :
             severity === 'high' ? faker.number.float({ min: 7.0, max: 8.9 }) :
             severity === 'medium' ? faker.number.float({ min: 4.0, max: 6.9 }) :
             faker.number.float({ min: 0.1, max: 3.9 }),
      category,
      status: faker.helpers.arrayElement(['open', 'fixed', 'accepted', 'false_positive']),
      location: {
        file: faker.datatype.boolean() ? faker.system.filePath() : undefined,
        line: faker.datatype.boolean() ? faker.number.int({ min: 1, max: 1000 }) : undefined,
        component: faker.datatype.boolean() ? faker.hacker.noun() : undefined,
        dependency: faker.datatype.boolean() ? faker.hacker.noun() + '@' + faker.system.semver() : undefined,
      },
      remediation: {
        description: faker.lorem.sentence(),
        references: [
          faker.internet.url(),
          faker.internet.url(),
        ],
        effort: faker.helpers.arrayElement(['low', 'medium', 'high']),
      },
      firstDetected: faker.date.past().toISOString(),
      lastSeen: faker.date.recent().toISOString(),
      ...overrides,
    };
  }

  static createComplianceStatus(overrides: Partial<ComplianceStatus> = {}): ComplianceStatus {
    const framework = faker.helpers.arrayElement(['SOC2', 'GDPR', 'HIPAA', 'PCI-DSS']);
    const score = faker.number.int({ min: 60, max: 100 });

    return {
      framework,
      score,
      status: score >= 90 ? 'compliant' : score >= 70 ? 'in_progress' : 'non_compliant',
      controls: Array.from({ length: faker.number.int({ min: 5, max: 15 }) }, () => ({
        id: faker.string.uuid(),
        name: faker.hacker.phrase(),
        description: faker.lorem.sentence(),
        status: faker.helpers.arrayElement(['implemented', 'not_implemented', 'partially_implemented']),
        evidence: faker.datatype.boolean() ? [faker.internet.url()] : undefined,
        lastReview: faker.date.past().toISOString(),
        responsible: faker.person.fullName(),
      })),
      lastAssessment: faker.date.past().toISOString(),
      nextAssessment: faker.date.future().toISOString(),
      ...overrides,
    };
  }

  // Batch creation methods for testing large datasets
  static createTemporalConnections(count: number): TemporalConnection[] {
    return Array.from({ length: count }, () => this.createTemporalConnection());
  }

  static createAPIKeys(count: number): APIKey[] {
    return Array.from({ length: count }, () => this.createAPIKey());
  }

  static createVulnerabilities(count: number): Vulnerability[] {
    return Array.from({ length: count }, () => this.createVulnerability());
  }

  // Error scenario generators
  static createTemporalConnectionError(): TemporalConnection {
    return this.createTemporalConnection({
      status: 'error',
      lastTestAt: new Date().toISOString(),
    });
  }

  static createExpiredAPIKey(): APIKey {
    return this.createAPIKey({
      status: 'expired',
      expiresAt: faker.date.past().toISOString(),
    });
  }

  static createCriticalVulnerability(): Vulnerability {
    return this.createVulnerability({
      severity: 'critical',
      status: 'open',
      score: faker.number.float({ min: 9.0, max: 10.0 }),
    });
  }

  static createOpenCircuitBreaker(): CircuitBreaker {
    return this.createCircuitBreaker({
      state: 'open',
      metrics: {
        successCount: 0,
        failureCount: 25,
        timeouts: 5,
        consecutiveFailures: 15,
        lastFailureTime: new Date().toISOString(),
        lastSuccessTime: faker.date.past().toISOString(),
      },
    });
  }
}

// Mock data generators for testing edge cases
export const mockDataGenerators = {
  // SQL injection payloads for security testing
  sqlInjectionPayloads: [
    "'; DROP TABLE users; --",
    "' OR '1'='1",
    "' UNION SELECT * FROM secrets --",
    "'; INSERT INTO admin_users VALUES ('hacker', 'password'); --",
    "' AND (SELECT COUNT(*) FROM information_schema.tables) > 0 --"
  ],

  // XSS payloads for security testing
  xssPayloads: [
    "<script>alert('XSS')</script>",
    "javascript:alert('XSS')",
    "<img src=x onerror=alert('XSS')>",
    "';alert(String.fromCharCode(88,83,83));//",
    "<svg onload=alert('XSS')>"
  ],

  // Invalid input data for validation testing
  invalidInputs: {
    temporal: {
      invalidEndpoints: [
        "",
        "not-a-url",
        "ftp://invalid-protocol.com",
        "http://localhost:-1",
        "https://toolongdomainname".repeat(50) + ".com"
      ],
      invalidNamespaces: [
        "",
        " ",
        "namespace with spaces",
        "namespace-with-@special-chars!",
        "a".repeat(300)
      ]
    },
    apiKeys: {
      invalidPermissions: [
        [""],
        ["invalid:permission"],
        ["read:nonexistent"],
        ["admin:*"],
        Array(100).fill("read:test") // Too many permissions
      ]
    },
    alerts: {
      invalidThresholds: [
        -1,
        Number.POSITIVE_INFINITY,
        Number.NaN,
        "not-a-number",
        null
      ]
    }
  },

  // Rate limiting test data
  rateLimitingTestData: {
    createRequests: (count: number, ip: string = '192.168.1.1') =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        timestamp: Date.now() + i,
        ip,
        userAgent: 'test-agent',
        endpoint: '/api/v1/test',
        method: 'GET'
      })),

    createBurstRequests: (burstSize: number, intervalMs: number = 100) => {
      const requests = [];
      for (let i = 0; i < burstSize; i++) {
        requests.push({
          id: i,
          timestamp: Date.now() + (i * intervalMs),
          ip: '192.168.1.1',
          userAgent: 'burst-test-agent'
        });
      }
      return requests;
    }
  }
};
