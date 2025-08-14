import { test, expect, Page } from '@playwright/test';
import { ProductionTestFactory } from '../factories/productionFactory';

// Test data setup
const testUser = {
  email: 'test.admin@paintbox.com',
  password: 'Test123!@#',
  permissions: ['admin:all'],
};

const testAPIKey = {
  name: 'E2E Test Key',
  permissions: ['read:metrics', 'write:metrics', 'read:alerts'],
};

const testTemporalConnection = {
  name: 'E2E Test Connection',
  namespace: 'e2e-test',
  endpoint: 'localhost:7233',
};

// Helper functions
async function loginUser(page: Page) {
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', testUser.email);
  await page.fill('[data-testid="password-input"]', testUser.password);
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('/dashboard');
}

async function navigateToProduction(page: Page) {
  await page.click('[data-testid="production-nav"]');
  await page.waitForURL('/production');
  await expect(page.locator('h1')).toContainText('Production Dashboard');
}

test.describe('Production Feature E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Setup test environment
    await page.goto('/');

    // Mock API responses for consistent testing
    await page.route('**/api/v1/**', async (route) => {
      const url = route.request().url();
      const method = route.request().method();

      // Handle authentication
      if (url.includes('/api/auth')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            user: { id: '1', email: testUser.email, permissions: testUser.permissions },
            token: 'mock-jwt-token',
          }),
        });
        return;
      }

      // Default to continue with actual request
      await route.continue();
    });
  });

  test.describe('Temporal Connection Management Workflow', () => {
    test('should create, test, and manage temporal connection', async ({ page }) => {
      await loginUser(page);
      await navigateToProduction(page);

      // Navigate to Temporal dashboard
      await page.click('[data-testid="temporal-dashboard-tab"]');
      await expect(page.locator('h2')).toContainText('Temporal Cloud Connections');

      // Create new connection
      await page.click('[data-testid="add-connection-button"]');
      await page.waitForSelector('[data-testid="connection-dialog"]');

      // Fill connection form
      await page.fill('[data-testid="connection-name-input"]', testTemporalConnection.name);
      await page.fill('[data-testid="connection-namespace-input"]', testTemporalConnection.namespace);
      await page.fill('[data-testid="connection-endpoint-input"]', testTemporalConnection.endpoint);

      // Mock successful creation
      await page.route('**/api/v1/temporal/connections', async (route) => {
        if (route.request().method() === 'POST') {
          const mockConnection = ProductionTestFactory.createTemporalConnection(testTemporalConnection);
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, data: mockConnection }),
          });
        }
      });

      await page.click('[data-testid="create-connection-button"]');

      // Verify connection appears in list
      await expect(page.locator(`[data-testid="connection-${testTemporalConnection.name}"]`))
        .toBeVisible();

      // Test connection
      await page.route('**/api/v1/temporal/connections/*/test', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { status: 'connected', responseTime: 150, serverVersion: '1.20.0' },
          }),
        });
      });

      await page.click(`[data-testid="test-connection-${testTemporalConnection.name}"]`);

      // Verify test results
      await expect(page.locator('[data-testid="connection-status"]'))
        .toContainText('Connected');
      await expect(page.locator('[data-testid="response-time"]'))
        .toContainText('150ms');

      // Edit connection
      await page.click(`[data-testid="edit-connection-${testTemporalConnection.name}"]`);
      await page.waitForSelector('[data-testid="connection-dialog"]');

      const updatedName = 'Updated E2E Connection';
      await page.fill('[data-testid="connection-name-input"]', updatedName);

      await page.route('**/api/v1/temporal/connections/*', async (route) => {
        if (route.request().method() === 'PUT') {
          const mockConnection = ProductionTestFactory.createTemporalConnection({
            ...testTemporalConnection,
            name: updatedName,
          });
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, data: mockConnection }),
          });
        }
      });

      await page.click('[data-testid="save-connection-button"]');

      // Verify update
      await expect(page.locator(`[data-testid="connection-${updatedName}"]`))
        .toBeVisible();

      // Delete connection
      await page.click(`[data-testid="delete-connection-${updatedName}"]`);
      await page.click('[data-testid="confirm-delete-button"]');

      await page.route('**/api/v1/temporal/connections/*', async (route) => {
        if (route.request().method() === 'DELETE') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true }),
          });
        }
      });

      // Verify deletion
      await expect(page.locator(`[data-testid="connection-${updatedName}"]`))
        .not.toBeVisible();
    });

    test('should handle workflow management', async ({ page }) => {
      await loginUser(page);
      await navigateToProduction(page);
      await page.click('[data-testid="temporal-dashboard-tab"]');

      // Mock existing connection
      const mockConnection = ProductionTestFactory.createTemporalConnection();
      const mockWorkflows = Array.from({ length: 3 }, () =>
        ProductionTestFactory.createTemporalWorkflow({ connectionId: mockConnection.id })
      );

      await page.route('**/api/v1/temporal/connections', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: [mockConnection] }),
        });
      });

      await page.route('**/api/v1/temporal/workflows*', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: mockWorkflows }),
        });
      });

      // Select connection
      await page.click(`[data-testid="select-connection-${mockConnection.id}"]`);

      // Verify workflows load
      await expect(page.locator('[data-testid="workflows-section"]')).toBeVisible();
      await expect(page.locator('[data-testid="workflow-item"]')).toHaveCount(3);

      // Filter workflows by status
      await page.selectOption('[data-testid="workflow-status-filter"]', 'running');

      // Verify filtering
      const runningWorkflows = mockWorkflows.filter(w => w.status === 'running');
      await expect(page.locator('[data-testid="workflow-item"]'))
        .toHaveCount(runningWorkflows.length);

      // View workflow details
      await page.click(`[data-testid="workflow-${mockWorkflows[0].id}"]`);
      await page.waitForSelector('[data-testid="workflow-details-dialog"]');

      await expect(page.locator('[data-testid="workflow-name"]'))
        .toContainText(mockWorkflows[0].name);
      await expect(page.locator('[data-testid="workflow-run-id"]'))
        .toContainText(mockWorkflows[0].runId);

      // View workflow history
      await page.click('[data-testid="workflow-history-tab"]');
      if (mockWorkflows[0].history) {
        await expect(page.locator('[data-testid="history-event"]'))
          .toHaveCount(mockWorkflows[0].history.length);
      }
    });
  });

  test.describe('API Key Management Workflow', () => {
    test('should complete full API key lifecycle', async ({ page }) => {
      await loginUser(page);
      await navigateToProduction(page);

      // Navigate to API Keys dashboard
      await page.click('[data-testid="api-keys-dashboard-tab"]');
      await expect(page.locator('h2')).toContainText('API Key Management');

      // Create new API key
      await page.click('[data-testid="create-api-key-button"]');
      await page.waitForSelector('[data-testid="api-key-dialog"]');

      await page.fill('[data-testid="api-key-name-input"]', testAPIKey.name);

      // Select permissions
      for (const permission of testAPIKey.permissions) {
        await page.check(`[data-testid="permission-${permission}"]`);
      }

      // Set rate limits
      await page.fill('[data-testid="rate-limit-per-minute"]', '100');
      await page.fill('[data-testid="rate-limit-per-hour"]', '6000');

      // Mock API key creation
      await page.route('**/api/v1/keys', async (route) => {
        if (route.request().method() === 'POST') {
          const mockAPIKey = ProductionTestFactory.createAPIKey({
            ...testAPIKey,
            keyValue: 'pk_test_1234567890abcdef', // Only returned on creation
          });
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, data: mockAPIKey }),
          });
        }
      });

      await page.click('[data-testid="create-api-key-button"]');

      // Verify key creation and secret display
      await expect(page.locator('[data-testid="api-key-secret"]'))
        .toContainText('pk_test_1234567890abcdef');
      await expect(page.locator('[data-testid="copy-secret-warning"]'))
        .toContainText('copy this secret now');

      // Copy secret
      await page.click('[data-testid="copy-secret-button"]');
      await expect(page.locator('[data-testid="copy-success-message"]'))
        .toBeVisible();

      await page.click('[data-testid="close-secret-dialog"]');

      // Verify key appears in list
      await expect(page.locator(`[data-testid="api-key-${testAPIKey.name}"]`))
        .toBeVisible();

      // View usage statistics
      await page.route('**/api/v1/keys/*/usage*', async (route) => {
        const mockUsage = Array.from({ length: 7 }, () =>
          ProductionTestFactory.createAPIKeyUsage()
        );
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              usage: mockUsage,
              summary: {
                totalRequests: 1500,
                totalErrors: 25,
                averageRequestsPerDay: 214,
                errorRate: 1.67,
              },
            },
          }),
        });
      });

      await page.click(`[data-testid="view-usage-${testAPIKey.name}"]`);
      await page.waitForSelector('[data-testid="usage-dialog"]');

      // Verify usage data
      await expect(page.locator('[data-testid="total-requests"]'))
        .toContainText('1,500');
      await expect(page.locator('[data-testid="error-rate"]'))
        .toContainText('1.67%');

      // Change time period
      await page.selectOption('[data-testid="usage-period-select"]', '30d');
      // Should trigger new API call for 30-day data

      await page.click('[data-testid="close-usage-dialog"]');

      // Rotate API key
      await page.click(`[data-testid="rotate-key-${testAPIKey.name}"]`);
      await page.click('[data-testid="confirm-rotation-button"]');

      await page.route('**/api/v1/keys/*/rotate', async (route) => {
        const rotatedKey = ProductionTestFactory.createAPIKey({
          ...testAPIKey,
          keyPrefix: 'pk_new12345',
          keyValue: 'pk_new_rotated_key_value_123456789',
        });
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: rotatedKey }),
        });
      });

      // Verify new secret is shown
      await expect(page.locator('[data-testid="new-api-key-secret"]'))
        .toContainText('pk_new_rotated_key_value_123456789');

      // Update permissions
      await page.click(`[data-testid="edit-key-${testAPIKey.name}"]`);
      await page.waitForSelector('[data-testid="api-key-dialog"]');

      await page.uncheck('[data-testid="permission-write:metrics"]');
      await page.check('[data-testid="permission-read:alerts"]');

      await page.route('**/api/v1/keys/*', async (route) => {
        if (route.request().method() === 'PUT') {
          const updatedKey = ProductionTestFactory.createAPIKey({
            ...testAPIKey,
            permissions: ['read:metrics', 'read:alerts'],
          });
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, data: updatedKey }),
          });
        }
      });

      await page.click('[data-testid="save-key-changes-button"]');

      // Verify permission changes
      await expect(page.locator(`[data-testid="key-permissions-${testAPIKey.name}"]`))
        .not.toContainText('write:metrics');

      // Revoke API key
      await page.click(`[data-testid="revoke-key-${testAPIKey.name}"]`);
      await page.fill('[data-testid="revocation-reason"]', 'End-to-end test cleanup');
      await page.click('[data-testid="confirm-revocation-button"]');

      await page.route('**/api/v1/keys/*', async (route) => {
        if (route.request().method() === 'DELETE') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true }),
          });
        }
      });

      // Verify key is marked as revoked
      await expect(page.locator(`[data-testid="key-status-${testAPIKey.name}"]`))
        .toContainText('Revoked');
    });
  });

  test.describe('Monitoring and Alerting Workflow', () => {
    test('should create alerts and handle notifications', async ({ page }) => {
      await loginUser(page);
      await navigateToProduction(page);

      // Navigate to Monitoring dashboard
      await page.click('[data-testid="monitoring-dashboard-tab"]');
      await expect(page.locator('h2')).toContainText('Monitoring & Alerts');

      // Create notification channel first
      await page.click('[data-testid="manage-channels-button"]');
      await page.click('[data-testid="add-channel-button"]');

      await page.fill('[data-testid="channel-name"]', 'E2E Test Channel');
      await page.selectOption('[data-testid="channel-type"]', 'email');
      await page.fill('[data-testid="email-address"]', 'alerts@paintbox-test.com');

      await page.route('**/api/v1/monitoring/channels', async (route) => {
        if (route.request().method() === 'POST') {
          const mockChannel = ProductionTestFactory.createNotificationChannel({
            name: 'E2E Test Channel',
            type: 'email',
            config: { email: { address: 'alerts@paintbox-test.com' } },
          });
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, data: mockChannel }),
          });
        }
      });

      await page.click('[data-testid="create-channel-button"]');

      // Test the channel
      await page.click('[data-testid="test-channel-button"]');
      await expect(page.locator('[data-testid="test-success-message"]'))
        .toContainText('Test notification sent');

      await page.click('[data-testid="close-channels-dialog"]');

      // Create alert rule
      await page.click('[data-testid="create-alert-button"]');
      await page.waitForSelector('[data-testid="alert-dialog"]');

      await page.fill('[data-testid="alert-name"]', 'High CPU Usage Alert');
      await page.fill('[data-testid="alert-description"]', 'Alert when CPU exceeds 80%');
      await page.selectOption('[data-testid="alert-severity"]', 'critical');
      await page.selectOption('[data-testid="alert-metric"]', 'cpu_usage');

      // Configure condition
      await page.selectOption('[data-testid="condition-operator"]', 'gt');
      await page.fill('[data-testid="condition-threshold"]', '80');
      await page.fill('[data-testid="condition-duration"]', '5');

      // Select notification channel
      await page.check('[data-testid="channel-E2E Test Channel"]');

      await page.route('**/api/v1/monitoring/alerts', async (route) => {
        if (route.request().method() === 'POST') {
          const mockAlert = ProductionTestFactory.createAlert({
            name: 'High CPU Usage Alert',
            severity: 'critical',
            metricName: 'cpu_usage',
          });
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, data: mockAlert }),
          });
        }
      });

      await page.click('[data-testid="create-alert-button"]');

      // Verify alert appears in list
      await expect(page.locator('[data-testid="alert-High CPU Usage Alert"]'))
        .toBeVisible();

      // Simulate metric ingestion that triggers alert
      await page.route('**/api/v1/monitoring/metrics', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, data: { inserted: 1 } }),
          });
        }
      });

      // Mock metrics data
      const mockMetrics = Array.from({ length: 10 }, () =>
        ProductionTestFactory.createMonitoringMetric({
          name: 'cpu_usage',
          value: 85, // Above threshold
        })
      );

      await page.route('**/api/v1/monitoring/metrics*', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, data: mockMetrics }),
          });
        }
      });

      // View metrics dashboard
      await page.click('[data-testid="metrics-tab"]');
      await expect(page.locator('[data-testid="metrics-chart"]')).toBeVisible();

      // Verify high CPU values are displayed
      await expect(page.locator('[data-testid="current-cpu-value"]'))
        .toContainText('85%');

      // Trigger alert manually for testing
      await page.click('[data-testid="alerts-tab"]');
      await page.click('[data-testid="trigger-alert-High CPU Usage Alert"]');

      await page.route('**/api/v1/monitoring/alerts/*/trigger', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { notificationsSent: 1, notificationFailures: [] },
          }),
        });
      });

      await page.click('[data-testid="confirm-trigger-button"]');

      // Verify alert status
      await expect(page.locator('[data-testid="alert-status-High CPU Usage Alert"]'))
        .toContainText('Active');

      // Resolve alert
      await page.click('[data-testid="resolve-alert-High CPU Usage Alert"]');
      await page.fill('[data-testid="resolution-notes"]', 'CPU usage returned to normal');
      await page.click('[data-testid="confirm-resolution-button"]');

      await page.route('**/api/v1/monitoring/alerts/*', async (route) => {
        if (route.request().method() === 'PUT') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: { status: 'resolved' },
            }),
          });
        }
      });

      await expect(page.locator('[data-testid="alert-status-High CPU Usage Alert"]'))
        .toContainText('Resolved');
    });
  });

  test.describe('Circuit Breaker Management Workflow', () => {
    test('should manage circuit breaker lifecycle', async ({ page }) => {
      await loginUser(page);
      await navigateToProduction(page);

      // Navigate to Circuit Breakers
      await page.click('[data-testid="circuit-breakers-tab"]');
      await expect(page.locator('h2')).toContainText('Circuit Breakers');

      // Create new circuit breaker
      await page.click('[data-testid="create-breaker-button"]');
      await page.waitForSelector('[data-testid="breaker-dialog"]');

      await page.fill('[data-testid="breaker-name"]', 'payment-service-breaker');
      await page.fill('[data-testid="breaker-service"]', 'payment-service');
      await page.fill('[data-testid="failure-threshold"]', '5');
      await page.fill('[data-testid="recovery-timeout"]', '60');
      await page.fill('[data-testid="request-timeout"]', '5000');

      await page.route('**/api/v1/circuit-breakers', async (route) => {
        if (route.request().method() === 'POST') {
          const mockBreaker = ProductionTestFactory.createCircuitBreaker({
            name: 'payment-service-breaker',
            service: 'payment-service',
            state: 'closed',
          });
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, data: mockBreaker }),
          });
        }
      });

      await page.click('[data-testid="create-breaker-button"]');

      // Verify breaker appears with correct state
      await expect(page.locator('[data-testid="breaker-payment-service-breaker"]'))
        .toBeVisible();
      await expect(page.locator('[data-testid="breaker-state-payment-service-breaker"]'))
        .toContainText('Closed');

      // Test circuit breaker
      await page.click('[data-testid="test-breaker-payment-service-breaker"]');
      await page.fill('[data-testid="test-request-count"]', '10');

      await page.route('**/api/v1/circuit-breakers/*/test', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              success: true,
              responseTime: 250,
              requestsSuccessful: 8,
              requestsFailed: 2,
            },
          }),
        });
      });

      await page.click('[data-testid="run-test-button"]');

      // Verify test results
      await expect(page.locator('[data-testid="test-results"]')).toBeVisible();
      await expect(page.locator('[data-testid="test-response-time"]'))
        .toContainText('250ms');

      // Simulate circuit breaker opening due to failures
      const openBreaker = ProductionTestFactory.createOpenCircuitBreaker();
      await page.route('**/api/v1/circuit-breakers/payment-service-breaker', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: openBreaker }),
        });
      });

      // Refresh to see state change
      await page.reload();
      await expect(page.locator('[data-testid="breaker-state-payment-service-breaker"]'))
        .toContainText('Open');

      // View metrics
      await page.click('[data-testid="view-metrics-payment-service-breaker"]');

      await page.route('**/api/v1/circuit-breakers/*/metrics*', async (route) => {
        const mockMetrics = Array.from({ length: 24 }, () => ({
          timestamp: new Date().toISOString(),
          requestCount: Math.floor(Math.random() * 1000),
          successCount: Math.floor(Math.random() * 800),
          failureCount: Math.floor(Math.random() * 200),
          timeouts: Math.floor(Math.random() * 50),
          averageResponseTime: Math.random() * 1000,
          p95ResponseTime: Math.random() * 2000,
          p99ResponseTime: Math.random() * 3000,
        }));

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              metrics: mockMetrics,
              summary: {
                totalRequests: 12000,
                successRate: 85.5,
                failureRate: 14.5,
                averageResponseTime: 450,
              },
            },
          }),
        });
      });

      await expect(page.locator('[data-testid="metrics-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="success-rate"]'))
        .toContainText('85.5%');

      // Reset circuit breaker
      await page.click('[data-testid="close-metrics-dialog"]');
      await page.click('[data-testid="reset-breaker-payment-service-breaker"]');
      await page.click('[data-testid="confirm-reset-button"]');

      await page.route('**/api/v1/circuit-breakers/*/reset', async (route) => {
        const resetBreaker = { ...openBreaker, state: 'closed' as const };
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: resetBreaker }),
        });
      });

      // Verify state change to closed
      await expect(page.locator('[data-testid="breaker-state-payment-service-breaker"]'))
        .toContainText('Closed');
    });
  });

  test.describe('Security Scanning Workflow', () => {
    test('should complete security scan workflow', async ({ page }) => {
      await loginUser(page);
      await navigateToProduction(page);

      // Navigate to Security
      await page.click('[data-testid="security-tab"]');
      await expect(page.locator('h2')).toContainText('Security Management');

      // Create new security scan
      await page.click('[data-testid="create-scan-button"]');
      await page.waitForSelector('[data-testid="scan-dialog"]');

      await page.fill('[data-testid="scan-name"]', 'E2E Repository Scan');
      await page.selectOption('[data-testid="scan-type"]', 'vulnerability');
      await page.selectOption('[data-testid="target-type"]', 'repository');
      await page.fill('[data-testid="target-identifier"]', 'https://github.com/example/repo');

      // Configure scan options
      await page.selectOption('[data-testid="scan-depth"]', 'deep');
      await page.check('[data-testid="include-dependencies"]');

      await page.route('**/api/v1/security/scans', async (route) => {
        if (route.request().method() === 'POST') {
          const mockScan = ProductionTestFactory.createSecurityScan({
            name: 'E2E Repository Scan',
            type: 'vulnerability',
            status: 'pending',
          });
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, data: mockScan }),
          });
        }
      });

      await page.click('[data-testid="create-scan-button"]');

      // Verify scan appears in list
      await expect(page.locator('[data-testid="scan-E2E Repository Scan"]'))
        .toBeVisible();
      await expect(page.locator('[data-testid="scan-status-E2E Repository Scan"]'))
        .toContainText('Pending');

      // Start the scan
      await page.click('[data-testid="start-scan-E2E Repository Scan"]');

      await page.route('**/api/v1/security/scans/*/start', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { status: 'running', estimatedDuration: 300 },
          }),
        });
      });

      await expect(page.locator('[data-testid="scan-status-E2E Repository Scan"]'))
        .toContainText('Running');

      // Simulate scan completion
      const vulnerabilities = Array.from({ length: 5 }, () =>
        ProductionTestFactory.createVulnerability()
      );

      const completedScan = ProductionTestFactory.createSecurityScan({
        name: 'E2E Repository Scan',
        status: 'completed',
        results: {
          vulnerabilities,
          summary: {
            totalVulnerabilities: vulnerabilities.length,
            severityBreakdown: {
              critical: 1,
              high: 2,
              medium: 1,
              low: 1,
            },
            categoryBreakdown: {
              injection: 1,
              broken_auth: 0,
              sensitive_data: 1,
              xxe: 0,
              broken_access: 1,
              security_misconfig: 1,
              xss: 1,
              insecure_deserialization: 0,
              vulnerable_components: 0,
              insufficient_logging: 0,
            },
            complianceScore: 85,
            trends: {
              previousScan: {
                total: 7,
                new: 2,
                fixed: 4,
              },
            },
          },
        },
      });

      await page.route('**/api/v1/security/scans/*', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, data: completedScan }),
          });
        }
      });

      // Wait for scan completion (simulate polling)
      await page.waitForTimeout(2000);
      await page.reload();

      await expect(page.locator('[data-testid="scan-status-E2E Repository Scan"]'))
        .toContainText('Completed');

      // View scan results
      await page.click('[data-testid="view-results-E2E Repository Scan"]');
      await page.waitForSelector('[data-testid="results-dialog"]');

      // Verify vulnerability summary
      await expect(page.locator('[data-testid="total-vulnerabilities"]'))
        .toContainText('5');
      await expect(page.locator('[data-testid="critical-count"]'))
        .toContainText('1');
      await expect(page.locator('[data-testid="compliance-score"]'))
        .toContainText('85%');

      // View vulnerability details
      await page.click('[data-testid="vulnerabilities-tab"]');
      await expect(page.locator('[data-testid="vulnerability-item"]'))
        .toHaveCount(5);

      // Update vulnerability status
      const firstVuln = vulnerabilities[0];
      await page.click(`[data-testid="vulnerability-${firstVuln.id}"]`);
      await page.selectOption('[data-testid="vulnerability-status"]', 'fixed');
      await page.fill('[data-testid="resolution-notes"]', 'Patched in version 1.2.3');

      await page.route('**/api/v1/security/vulnerabilities/*', async (route) => {
        if (route.request().method() === 'PUT') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: { ...firstVuln, status: 'fixed' },
            }),
          });
        }
      });

      await page.click('[data-testid="save-vulnerability-button"]');

      // Verify status update
      await expect(page.locator(`[data-testid="vulnerability-status-${firstVuln.id}"]`))
        .toContainText('Fixed');

      // Check compliance status
      await page.click('[data-testid="compliance-tab"]');

      await page.route('**/api/v1/security/compliance', async (route) => {
        const complianceStatuses = [
          ProductionTestFactory.createComplianceStatus({ framework: 'SOC2', score: 85 }),
          ProductionTestFactory.createComplianceStatus({ framework: 'GDPR', score: 92 }),
        ];
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: complianceStatuses }),
        });
      });

      await expect(page.locator('[data-testid="compliance-SOC2"]'))
        .toContainText('85%');
      await expect(page.locator('[data-testid="compliance-GDPR"]'))
        .toContainText('92%');
    });
  });

  test.describe('Cross-Feature Integration', () => {
    test('should demonstrate integrated production workflow', async ({ page }) => {
      await loginUser(page);
      await navigateToProduction(page);

      // Start with creating a temporal connection
      await page.click('[data-testid="temporal-dashboard-tab"]');
      await page.click('[data-testid="add-connection-button"]');

      // Create connection with monitoring enabled
      await page.fill('[data-testid="connection-name-input"]', 'Production Connection');
      await page.fill('[data-testid="connection-namespace-input"]', 'prod');
      await page.fill('[data-testid="connection-endpoint-input"]', 'temporal.prod.internal:7233');
      await page.check('[data-testid="enable-monitoring"]');

      // This would create both the connection and associated monitoring metrics
      await page.click('[data-testid="create-connection-button"]');

      // Navigate to monitoring to see metrics
      await page.click('[data-testid="monitoring-dashboard-tab"]');

      // Should see temporal-related metrics
      await expect(page.locator('[data-testid="temporal-metrics-section"]'))
        .toBeVisible();

      // Create circuit breaker for the temporal service
      await page.click('[data-testid="circuit-breakers-tab"]');
      await page.click('[data-testid="create-breaker-button"]');

      await page.fill('[data-testid="breaker-name"]', 'temporal-service-breaker');
      await page.fill('[data-testid="breaker-service"]', 'temporal-service');
      await page.click('[data-testid="create-breaker-button"]');

      // Create API key with monitoring access
      await page.click('[data-testid="api-keys-dashboard-tab"]');
      await page.click('[data-testid="create-api-key-button"]');

      await page.fill('[data-testid="api-key-name-input"]', 'Production Monitoring Key');
      await page.check('[data-testid="permission-read:metrics"]');
      await page.check('[data-testid="permission-read:alerts"]');
      await page.check('[data-testid="permission-read:circuit-breakers"]');

      await page.click('[data-testid="create-api-key-button"]');

      // Run security scan on the entire setup
      await page.click('[data-testid="security-tab"]');
      await page.click('[data-testid="create-scan-button"]');

      await page.fill('[data-testid="scan-name"]', 'Production Infrastructure Scan');
      await page.selectOption('[data-testid="scan-type"]', 'compliance');
      await page.selectOption('[data-testid="target-type"]', 'deployment');

      await page.click('[data-testid="create-scan-button"]');
      await page.click('[data-testid="start-scan-Production Infrastructure Scan"]');

      // Verify integrated dashboard shows all components
      await page.click('[data-testid="overview-tab"]');

      await expect(page.locator('[data-testid="temporal-connections-count"]'))
        .toContainText('1');
      await expect(page.locator('[data-testid="active-api-keys-count"]'))
        .toContainText('1');
      await expect(page.locator('[data-testid="circuit-breakers-count"]'))
        .toContainText('1');
      await expect(page.locator('[data-testid="running-scans-count"]'))
        .toContainText('1');

      // Test system health
      await page.click('[data-testid="health-check-button"]');

      // Should check all components
      await expect(page.locator('[data-testid="temporal-health"]'))
        .toContainText('Healthy');
      await expect(page.locator('[data-testid="monitoring-health"]'))
        .toContainText('Healthy');
      await expect(page.locator('[data-testid="security-health"]'))
        .toContainText('Healthy');
    });
  });
});
