import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin, loginAsGuest, createMockData } from '../utils/e2e-helpers';

test.describe('Admin Dashboard Flow', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Admin Authentication', () => {
    test('should allow Tyler (admin) to login successfully', async () => {
      await loginAsAdmin(page, 'tyler');

      // Should redirect to admin dashboard
      await expect(page).toHaveURL('/dashboard/admin');
      
      // Should display admin header
      await expect(page.locator('[data-testid="admin-header"]')).toBeVisible();
      await expect(page.locator('text=Welcome, Tyler')).toBeVisible();
      
      // Should show admin-only navigation items
      await expect(page.locator('[data-testid="nav-user-management"]')).toBeVisible();
      await expect(page.locator('[data-testid="nav-system-settings"]')).toBeVisible();
      await expect(page.locator('[data-testid="nav-audit-logs"]')).toBeVisible();
    });

    test('should allow Patrick (admin) to login successfully', async () => {
      await loginAsAdmin(page, 'patrick');

      await expect(page).toHaveURL('/dashboard/admin');
      await expect(page.locator('text=Welcome, Patrick')).toBeVisible();
      
      // Patrick should have super admin privileges
      await expect(page.locator('[data-testid="nav-system-config"]')).toBeVisible();
      await expect(page.locator('[data-testid="nav-deployment-management"]')).toBeVisible();
    });

    test('should reject invalid admin credentials', async () => {
      await page.fill('[data-testid="username-input"]', 'invalid-admin');
      await page.fill('[data-testid="password-input"]', 'wrong-password');
      await page.click('[data-testid="login-button"]');

      // Should show error message
      await expect(page.locator('[data-testid="login-error"]')).toBeVisible();
      await expect(page.locator('text=Invalid credentials')).toBeVisible();
      
      // Should remain on login page
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Dashboard Overview', () => {
    test.beforeEach(async () => {
      await loginAsAdmin(page, 'tyler');
      await createMockData(page);
    });

    test('should display comprehensive security metrics', async () => {
      // Check main metric cards
      await expect(page.locator('[data-testid="metric-total-threats"]')).toBeVisible();
      await expect(page.locator('[data-testid="metric-active-incidents"]')).toBeVisible();
      await expect(page.locator('[data-testid="metric-resolved-today"]')).toBeVisible();
      await expect(page.locator('[data-testid="metric-system-health"]')).toBeVisible();

      // Verify metric values are populated
      const totalThreats = await page.locator('[data-testid="metric-total-threats"] .metric-value').textContent();
      expect(parseInt(totalThreats || '0')).toBeGreaterThan(0);

      const activeIncidents = await page.locator('[data-testid="metric-active-incidents"] .metric-value').textContent();
      expect(parseInt(activeIncidents || '0')).toBeGreaterThanOrEqual(0);
    });

    test('should display threat activity chart with real-time updates', async () => {
      await expect(page.locator('[data-testid="threat-activity-chart"]')).toBeVisible();
      
      // Chart should have data points
      await expect(page.locator('[data-testid="chart-data-points"]')).toHaveCount.greaterThan(0);
      
      // Should update when new data arrives
      const initialDataPoints = await page.locator('[data-testid="chart-data-points"]').count();
      
      // Simulate new threat data
      await page.evaluate(() => {
        window.mockSocketEmit('threat_updated', {
          id: 'new-threat-123',
          severity: 'HIGH',
          timestamp: new Date().toISOString(),
        });
      });

      // Wait for chart update
      await page.waitForTimeout(1000);
      const updatedDataPoints = await page.locator('[data-testid="chart-data-points"]').count();
      expect(updatedDataPoints).toBeGreaterThan(initialDataPoints);
    });

    test('should show recent alerts with proper severity indicators', async () => {
      const alertsPanel = page.locator('[data-testid="recent-alerts-panel"]');
      await expect(alertsPanel).toBeVisible();

      // Should display alerts list
      const alertItems = page.locator('[data-testid="alert-item"]');
      await expect(alertItems).toHaveCount.greaterThan(0);

      // First alert should have severity badge
      const firstAlert = alertItems.first();
      await expect(firstAlert.locator('[data-testid="severity-badge"]')).toBeVisible();

      // Should display alert timestamp
      await expect(firstAlert.locator('[data-testid="alert-timestamp"]')).toBeVisible();
    });

    test('should provide system health status indicator', async () => {
      const healthIndicator = page.locator('[data-testid="system-health-indicator"]');
      await expect(healthIndicator).toBeVisible();

      // Should show overall health status
      const healthStatus = await healthIndicator.locator('[data-testid="health-status"]').textContent();
      expect(['Healthy', 'Warning', 'Critical']).toContain(healthStatus);

      // Should show individual service statuses
      await expect(healthIndicator.locator('[data-testid="service-database"]')).toBeVisible();
      await expect(healthIndicator.locator('[data-testid="service-api"]')).toBeVisible();
      await expect(healthIndicator.locator('[data-testid="service-websocket"]')).toBeVisible();
    });
  });

  test.describe('Incident Management', () => {
    test.beforeEach(async () => {
      await loginAsAdmin(page, 'tyler');
      await page.goto('/incidents');
    });

    test('should create new security incident', async () => {
      await page.click('[data-testid="create-incident-button"]');
      
      // Fill incident form
      await page.fill('[data-testid="incident-title"]', 'Critical Security Breach');
      await page.fill('[data-testid="incident-description"]', 'Unauthorized access detected in production environment');
      await page.selectOption('[data-testid="incident-severity"]', 'CRITICAL');
      await page.selectOption('[data-testid="incident-priority"]', 'HIGH');
      await page.selectOption('[data-testid="incident-assignee"]', 'analyst-123');

      await page.click('[data-testid="save-incident-button"]');

      // Should redirect to incident detail page
      await expect(page).toHaveURL(/\/incidents\/[a-zA-Z0-9-]+/);
      await expect(page.locator('text=Critical Security Breach')).toBeVisible();
      await expect(page.locator('[data-testid="incident-status"]')).toHaveText('NEW');
    });

    test('should update incident status through workflow', async () => {
      // Navigate to existing incident
      await page.click('[data-testid="incident-item"]:first-child');
      
      const initialStatus = await page.locator('[data-testid="incident-status"]').textContent();
      expect(initialStatus).toBe('NEW');

      // Start investigation
      await page.click('[data-testid="start-investigation-button"]');
      await page.fill('[data-testid="investigation-notes"]', 'Beginning initial investigation');
      await page.click('[data-testid="update-status-button"]');

      // Status should update
      await expect(page.locator('[data-testid="incident-status"]')).toHaveText('INVESTIGATING');
      
      // Timeline should show status change
      await expect(page.locator('[data-testid="timeline-entry"]')).toContainText('Status changed to INVESTIGATING');
    });

    test('should manage incident assignments', async () => {
      await page.click('[data-testid="incident-item"]:first-child');
      
      // Change assignee
      await page.click('[data-testid="change-assignee-button"]');
      await page.selectOption('[data-testid="assignee-select"]', 'analyst-456');
      await page.fill('[data-testid="assignment-notes"]', 'Reassigning to specialist for deeper analysis');
      await page.click('[data-testid="confirm-assignment"]');

      // Should update assignee display
      await expect(page.locator('[data-testid="current-assignee"]')).toContainText('Jane Doe');
      
      // Should log assignment change
      await expect(page.locator('[data-testid="timeline-entry"]')).toContainText('Assigned to Jane Doe');
    });

    test('should execute incident response playbook', async () => {
      await page.click('[data-testid="incident-item"]:first-child');
      
      // Start playbook execution
      await page.click('[data-testid="execute-playbook-button"]');
      await page.selectOption('[data-testid="playbook-select"]', 'data-breach-response');
      await page.click('[data-testid="start-playbook-button"]');

      // Should display playbook progress
      await expect(page.locator('[data-testid="playbook-progress"]')).toBeVisible();
      await expect(page.locator('[data-testid="current-step"]')).toContainText('Step 1:');

      // Complete first step
      await page.click('[data-testid="complete-step-button"]');
      await page.fill('[data-testid="step-notes"]', 'Initial containment measures implemented');
      await page.click('[data-testid="confirm-step-completion"]');

      // Should advance to next step
      await expect(page.locator('[data-testid="current-step"]')).toContainText('Step 2:');
    });
  });

  test.describe('Alert Management', () => {
    test.beforeEach(async () => {
      await loginAsAdmin(page, 'tyler');
      await page.goto('/alerts');
    });

    test('should acknowledge high-priority alerts', async () => {
      // Filter for high-priority alerts
      await page.selectOption('[data-testid="severity-filter"]', 'HIGH');
      await page.waitForTimeout(500);

      const alertItems = page.locator('[data-testid="alert-item"]');
      await expect(alertItems).toHaveCount.greaterThan(0);

      // Acknowledge first alert
      const firstAlert = alertItems.first();
      await firstAlert.click();
      
      await page.click('[data-testid="acknowledge-alert-button"]');
      await page.fill('[data-testid="acknowledgment-notes"]', 'Alert reviewed and verified as legitimate threat');
      await page.click('[data-testid="confirm-acknowledgment"]');

      // Status should update
      await expect(page.locator('[data-testid="alert-status"]')).toHaveText('ACKNOWLEDGED');
      
      // Should record acknowledgment timestamp
      await expect(page.locator('[data-testid="acknowledged-at"]')).toBeVisible();
    });

    test('should bulk acknowledge multiple alerts', async () => {
      // Select multiple alerts
      await page.check('[data-testid="alert-checkbox"]:nth-child(1)');
      await page.check('[data-testid="alert-checkbox"]:nth-child(2)');
      await page.check('[data-testid="alert-checkbox"]:nth-child(3)');

      // Bulk acknowledge
      await page.click('[data-testid="bulk-acknowledge-button"]');
      await page.fill('[data-testid="bulk-notes"]', 'Bulk acknowledgment of related alerts');
      await page.click('[data-testid="confirm-bulk-action"]');

      // Should show success notification
      await expect(page.locator('[data-testid="success-notification"]')).toContainText('3 alerts acknowledged');
    });

    test('should escalate critical alerts to incidents', async () => {
      // Find a critical alert
      await page.selectOption('[data-testid="severity-filter"]', 'CRITICAL');
      await page.waitForTimeout(500);

      const criticalAlert = page.locator('[data-testid="alert-item"]').first();
      await criticalAlert.click();

      // Escalate to incident
      await page.click('[data-testid="escalate-to-incident-button"]');
      
      // Should pre-populate incident form
      await expect(page.locator('[data-testid="incident-title"]')).toHaveValue(/Critical Alert:/);
      await expect(page.locator('[data-testid="incident-severity"]')).toHaveValue('CRITICAL');

      // Complete escalation
      await page.fill('[data-testid="escalation-reason"]', 'Alert requires immediate incident response');
      await page.click('[data-testid="create-incident-button"]');

      // Should redirect to new incident
      await expect(page).toHaveURL(/\/incidents\/[a-zA-Z0-9-]+/);
      await expect(page.locator('[data-testid="incident-source-alert"]')).toBeVisible();
    });
  });

  test.describe('Threat Intelligence Management', () => {
    test.beforeEach(async () => {
      await loginAsAdmin(page, 'tyler');
      await page.goto('/threats');
    });

    test('should search and filter threat intelligence', async () => {
      // Search for specific threat
      await page.fill('[data-testid="threat-search"]', 'APT');
      await page.waitForTimeout(500);

      const searchResults = page.locator('[data-testid="threat-item"]');
      await expect(searchResults).toHaveCount.greaterThan(0);

      // All results should contain search term
      const threatTitles = await searchResults.locator('[data-testid="threat-title"]').allTextContents();
      expect(threatTitles.some(title => title.toLowerCase().includes('apt'))).toBeTruthy();

      // Apply severity filter
      await page.selectOption('[data-testid="severity-filter"]', 'HIGH');
      await page.waitForTimeout(500);

      // Results should be filtered
      const filteredResults = page.locator('[data-testid="threat-item"]');
      const severityBadges = await filteredResults.locator('[data-testid="severity-badge"]').allTextContents();
      expect(severityBadges.every(badge => badge === 'HIGH')).toBeTruthy();
    });

    test('should view detailed threat information', async () => {
      const firstThreat = page.locator('[data-testid="threat-item"]').first();
      await firstThreat.click();

      // Should display threat details
      await expect(page.locator('[data-testid="threat-name"]')).toBeVisible();
      await expect(page.locator('[data-testid="threat-description"]')).toBeVisible();
      await expect(page.locator('[data-testid="threat-severity"]')).toBeVisible();
      await expect(page.locator('[data-testid="threat-confidence"]')).toBeVisible();

      // Should show MITRE ATT&CK mapping
      await expect(page.locator('[data-testid="mitre-tactics"]')).toBeVisible();
      await expect(page.locator('[data-testid="mitre-techniques"]')).toBeVisible();

      // Should display IOCs
      await expect(page.locator('[data-testid="indicators-section"]')).toBeVisible();
      const iocItems = page.locator('[data-testid="ioc-item"]');
      if (await iocItems.count() > 0) {
        await expect(iocItems.first()).toBeVisible();
      }
    });

    test('should add new IOC to threat', async () => {
      const firstThreat = page.locator('[data-testid="threat-item"]').first();
      await firstThreat.click();

      // Add new IOC
      await page.click('[data-testid="add-ioc-button"]');
      
      await page.selectOption('[data-testid="ioc-type"]', 'IP');
      await page.fill('[data-testid="ioc-value"]', '192.168.1.100');
      await page.fill('[data-testid="ioc-description"]', 'Malicious C2 server');
      await page.selectOption('[data-testid="ioc-confidence"]', '0.9');

      await page.click('[data-testid="save-ioc-button"]');

      // Should appear in IOCs list
      await expect(page.locator('[data-testid="ioc-item"]')).toContainText('192.168.1.100');
    });
  });

  test.describe('User Management (Admin Only)', () => {
    test.beforeEach(async () => {
      await loginAsAdmin(page, 'tyler');
      await page.goto('/admin/users');
    });

    test('should display user management interface', async () => {
      await expect(page.locator('[data-testid="users-table"]')).toBeVisible();
      await expect(page.locator('[data-testid="add-user-button"]')).toBeVisible();
      
      // Should show existing users
      const userRows = page.locator('[data-testid="user-row"]');
      await expect(userRows).toHaveCount.greaterThan(0);
    });

    test('should create new user account', async () => {
      await page.click('[data-testid="add-user-button"]');
      
      await page.fill('[data-testid="user-name"]', 'John Smith');
      await page.fill('[data-testid="user-email"]', 'john.smith@security.com');
      await page.selectOption('[data-testid="user-role"]', 'SECURITY_ANALYST');
      await page.check('[data-testid="permission-read-threats"]');
      await page.check('[data-testid="permission-write-incidents"]');

      await page.click('[data-testid="create-user-button"]');

      // Should show success message
      await expect(page.locator('[data-testid="success-notification"]')).toContainText('User created successfully');
      
      // Should appear in users list
      await expect(page.locator('[data-testid="users-table"]')).toContainText('john.smith@security.com');
    });

    test('should modify user permissions', async () => {
      // Find existing user
      const userRow = page.locator('[data-testid="user-row"]').first();
      await userRow.locator('[data-testid="edit-user-button"]').click();

      // Modify permissions
      await page.check('[data-testid="permission-admin"]');
      await page.click('[data-testid="save-user-button"]');

      // Should update user role
      await expect(page.locator('[data-testid="success-notification"]')).toContainText('User updated');
    });

    test('should deactivate user account', async () => {
      const userRow = page.locator('[data-testid="user-row"]').first();
      const userEmail = await userRow.locator('[data-testid="user-email"]').textContent();
      
      await userRow.locator('[data-testid="deactivate-user-button"]').click();
      await page.click('[data-testid="confirm-deactivation"]');

      // User should be marked as inactive
      const updatedRow = page.locator(`[data-testid="user-row"]:has-text("${userEmail}")`);
      await expect(updatedRow.locator('[data-testid="user-status"]')).toHaveText('Inactive');
    });
  });

  test.describe('System Settings and Configuration', () => {
    test.beforeEach(async () => {
      await loginAsAdmin(page, 'patrick'); // Super admin required
      await page.goto('/admin/settings');
    });

    test('should configure alert thresholds', async () => {
      await page.click('[data-testid="alert-settings-tab"]');
      
      // Update critical alert threshold
      await page.fill('[data-testid="critical-alert-threshold"]', '5');
      await page.fill('[data-testid="high-alert-threshold"]', '10');
      
      await page.click('[data-testid="save-alert-settings"]');
      
      await expect(page.locator('[data-testid="success-notification"]')).toContainText('Settings saved');
    });

    test('should configure system integrations', async () => {
      await page.click('[data-testid="integrations-tab"]');
      
      // Configure SIEM integration
      await page.check('[data-testid="enable-siem-integration"]');
      await page.fill('[data-testid="siem-endpoint"]', 'https://siem.company.com/api');
      await page.fill('[data-testid="siem-api-key"]', 'siem-key-123');
      
      await page.click('[data-testid="test-connection-button"]');
      await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');
      
      await page.click('[data-testid="save-integration-settings"]');
    });
  });

  test.describe('Audit and Compliance', () => {
    test.beforeEach(async () => {
      await loginAsAdmin(page, 'tyler');
      await page.goto('/admin/audit');
    });

    test('should display audit logs with filtering', async () => {
      await expect(page.locator('[data-testid="audit-logs-table"]')).toBeVisible();
      
      // Filter by date range
      await page.fill('[data-testid="date-from"]', '2024-01-01');
      await page.fill('[data-testid="date-to"]', '2024-12-31');
      await page.click('[data-testid="apply-filters"]');
      
      const auditEntries = page.locator('[data-testid="audit-entry"]');
      await expect(auditEntries).toHaveCount.greaterThan(0);
      
      // Should display relevant information
      const firstEntry = auditEntries.first();
      await expect(firstEntry.locator('[data-testid="audit-timestamp"]')).toBeVisible();
      await expect(firstEntry.locator('[data-testid="audit-user"]')).toBeVisible();
      await expect(firstEntry.locator('[data-testid="audit-action"]')).toBeVisible();
    });

    test('should export audit logs for compliance', async () => {
      // Set up download handling
      const downloadPromise = page.waitForEvent('download');
      
      await page.click('[data-testid="export-audit-logs"]');
      await page.selectOption('[data-testid="export-format"]', 'CSV');
      await page.click('[data-testid="confirm-export"]');
      
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('audit-logs');
      expect(download.suggestedFilename()).toContain('.csv');
    });
  });

  test.describe('Real-time Updates and Notifications', () => {
    test.beforeEach(async () => {
      await loginAsAdmin(page, 'tyler');
    });

    test('should receive real-time alert notifications', async () => {
      await page.goto('/dashboard');
      
      // Simulate incoming alert
      await page.evaluate(() => {
        window.mockSocketEmit('alert_created', {
          id: 'alert-urgent-123',
          title: 'Critical Security Breach',
          severity: 'CRITICAL',
          timestamp: new Date().toISOString(),
        });
      });

      // Should show notification
      await expect(page.locator('[data-testid="notification-alert"]')).toBeVisible();
      await expect(page.locator('[data-testid="notification-alert"]')).toContainText('Critical Security Breach');
      
      // Should update alerts counter
      const alertsCounter = page.locator('[data-testid="alerts-counter"]');
      const initialCount = parseInt((await alertsCounter.textContent()) || '0');
      
      await page.waitForTimeout(1000);
      const updatedCount = parseInt((await alertsCounter.textContent()) || '0');
      expect(updatedCount).toBeGreaterThan(initialCount);
    });

    test('should maintain real-time connection status', async () => {
      await page.goto('/dashboard');
      
      // Should show connected status
      await expect(page.locator('[data-testid="connection-status"]')).toHaveText('Connected');
      
      // Simulate connection loss
      await page.evaluate(() => {
        window.mockSocketDisconnect();
      });

      // Should show disconnected status
      await expect(page.locator('[data-testid="connection-status"]')).toHaveText('Disconnected');
      await expect(page.locator('[data-testid="reconnecting-indicator"]')).toBeVisible();
    });
  });
});