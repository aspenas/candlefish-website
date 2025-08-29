import { test, expect, Page } from '@playwright/test';
import { loginAsGuest, createMockData } from '../utils/e2e-helpers';

test.describe('Guest Access Flow', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Guest Authentication', () => {
    test('should allow Aaron (guest) to access limited dashboard', async () => {
      await loginAsGuest(page, 'aaron');

      // Should redirect to guest dashboard
      await expect(page).toHaveURL('/dashboard/guest');
      
      // Should display guest header
      await expect(page.locator('[data-testid="guest-header"]')).toBeVisible();
      await expect(page.locator('text=Welcome, Aaron')).toBeVisible();
      
      // Should show read-only navigation items
      await expect(page.locator('[data-testid="nav-overview"]')).toBeVisible();
      await expect(page.locator('[data-testid="nav-reports"]')).toBeVisible();
      
      // Should NOT show admin-only items
      await expect(page.locator('[data-testid="nav-user-management"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="nav-system-settings"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="nav-audit-logs"]')).not.toBeVisible();
    });

    test('should allow James (guest) to access limited dashboard', async () => {
      await loginAsGuest(page, 'james');

      await expect(page).toHaveURL('/dashboard/guest');
      await expect(page.locator('text=Welcome, James')).toBeVisible();
      
      // Should have read-only access indicators
      await expect(page.locator('[data-testid="read-only-badge"]')).toBeVisible();
      await expect(page.locator('text=Read-Only Access')).toBeVisible();
    });

    test('should reject invalid guest credentials', async () => {
      await page.fill('[data-testid="username-input"]', 'invalid-guest');
      await page.fill('[data-testid="password-input"]', 'wrong-password');
      await page.click('[data-testid="login-button"]');

      // Should show error message
      await expect(page.locator('[data-testid="login-error"]')).toBeVisible();
      await expect(page.locator('text=Invalid credentials')).toBeVisible();
      
      // Should remain on login page
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Limited Dashboard View', () => {
    test.beforeEach(async () => {
      await loginAsGuest(page, 'aaron');
      await createMockData(page);
    });

    test('should display security overview with limited information', async () => {
      // Should show high-level metrics only
      await expect(page.locator('[data-testid="metric-threat-level"]')).toBeVisible();
      await expect(page.locator('[data-testid="metric-system-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="metric-recent-activity"]')).toBeVisible();

      // Should NOT show detailed counts
      await expect(page.locator('[data-testid="metric-total-threats"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="metric-active-incidents"]')).not.toBeVisible();
      
      // Metrics should show general status instead of specific numbers
      const threatLevel = await page.locator('[data-testid="metric-threat-level"] .metric-value').textContent();
      expect(['Low', 'Medium', 'High', 'Critical']).toContain(threatLevel);
      
      const systemStatus = await page.locator('[data-testid="metric-system-status"] .metric-value').textContent();
      expect(['Normal', 'Warning', 'Alert']).toContain(systemStatus);
    });

    test('should display simplified threat activity chart', async () => {
      await expect(page.locator('[data-testid="threat-activity-chart"]')).toBeVisible();
      
      // Should show aggregated data without specific details
      await expect(page.locator('[data-testid="chart-title"]')).toContainText('Security Activity Trends');
      
      // Should not show detailed tooltips
      const dataPoint = page.locator('[data-testid="chart-data-point"]').first();
      await dataPoint.hover();
      
      // Tooltip should show general information only
      await expect(page.locator('[data-testid="chart-tooltip"]')).toContainText('Activity Level:');
      await expect(page.locator('[data-testid="chart-tooltip"]')).not.toContainText('specific count');
    });

    test('should show public security alerts only', async () => {
      const alertsPanel = page.locator('[data-testid="public-alerts-panel"]');
      await expect(alertsPanel).toBeVisible();

      // Should display public alerts
      const alertItems = page.locator('[data-testid="public-alert-item"]');
      await expect(alertItems).toHaveCount.greaterThan(0);

      // Alerts should not contain sensitive information
      const firstAlert = alertItems.first();
      const alertText = await firstAlert.textContent();
      
      expect(alertText).not.toContain('IP address');
      expect(alertText).not.toContain('specific user');
      expect(alertText).not.toContain('internal system');
      
      // Should show general threat types only
      expect(alertText).toMatch(/(Malware|Phishing|Suspicious Activity) detected/);
    });

    test('should provide system health status without details', async () => {
      const healthIndicator = page.locator('[data-testid="system-health-indicator"]');
      await expect(healthIndicator).toBeVisible();

      // Should show overall status only
      const healthStatus = await healthIndicator.locator('[data-testid="health-status"]').textContent();
      expect(['Normal', 'Warning', 'Alert']).toContain(healthStatus);

      // Should NOT show individual service statuses
      await expect(healthIndicator.locator('[data-testid="service-database"]')).not.toBeVisible();
      await expect(healthIndicator.locator('[data-testid="service-api"]')).not.toBeVisible();
      await expect(healthIndicator.locator('[data-testid="service-websocket"]')).not.toBeVisible();
    });
  });

  test.describe('Read-Only Incident Viewing', () => {
    test.beforeEach(async () => {
      await loginAsGuest(page, 'aaron');
      await page.goto('/incidents');
    });

    test('should display public incidents with limited details', async () => {
      // Should show incidents list but read-only
      await expect(page.locator('[data-testid="incidents-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="read-only-warning"]')).toBeVisible();

      // Should NOT show create incident button
      await expect(page.locator('[data-testid="create-incident-button"]')).not.toBeVisible();

      const incidentItems = page.locator('[data-testid="incident-item"]');
      await expect(incidentItems).toHaveCount.greaterThan(0);

      // Incident items should show limited information
      const firstIncident = incidentItems.first();
      await expect(firstIncident.locator('[data-testid="incident-id"]')).toBeVisible();
      await expect(firstIncident.locator('[data-testid="incident-status"]')).toBeVisible();
      await expect(firstIncident.locator('[data-testid="incident-severity"]')).toBeVisible();
      
      // Should NOT show sensitive details
      await expect(firstIncident.locator('[data-testid="incident-assignee"]')).not.toBeVisible();
      await expect(firstIncident.locator('[data-testid="incident-details"]')).not.toBeVisible();
    });

    test('should prevent modification of incident data', async () => {
      const firstIncident = page.locator('[data-testid="incident-item"]').first();
      await firstIncident.click();

      // Should display incident in read-only mode
      await expect(page.locator('[data-testid="incident-readonly-view"]')).toBeVisible();
      await expect(page.locator('[data-testid="readonly-notice"]')).toContainText('You have read-only access');

      // Action buttons should not be available
      await expect(page.locator('[data-testid="update-status-button"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="assign-incident-button"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="add-note-button"]')).not.toBeVisible();
      
      // Should show general status and timeline only
      await expect(page.locator('[data-testid="incident-status-display"]')).toBeVisible();
      await expect(page.locator('[data-testid="public-timeline"]')).toBeVisible();
    });

    test('should show sanitized incident timeline', async () => {
      const firstIncident = page.locator('[data-testid="incident-item"]').first();
      await firstIncident.click();

      const timeline = page.locator('[data-testid="public-timeline"]');
      await expect(timeline).toBeVisible();

      const timelineEntries = timeline.locator('[data-testid="timeline-entry"]');
      await expect(timelineEntries).toHaveCount.greaterThan(0);

      // Timeline entries should not contain sensitive information
      for (let i = 0; i < Math.min(3, await timelineEntries.count()); i++) {
        const entry = timelineEntries.nth(i);
        const entryText = await entry.textContent();
        
        expect(entryText).not.toContain('investigation notes');
        expect(entryText).not.toContain('analyst');
        expect(entryText).not.toContain('internal');
        expect(entryText).toMatch(/(Status changed|Incident created|Resolved)/);
      }
    });
  });

  test.describe('Limited Alert Viewing', () => {
    test.beforeEach(async () => {
      await loginAsGuest(page, 'james');
      await page.goto('/alerts');
    });

    test('should display public alerts with restricted access', async () => {
      // Should show alerts but with read-only access
      await expect(page.locator('[data-testid="public-alerts-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="access-restricted-notice"]')).toBeVisible();

      // Should NOT show management functions
      await expect(page.locator('[data-testid="acknowledge-alert-button"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="bulk-actions-menu"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="escalate-alert-button"]')).not.toBeVisible();

      const alertItems = page.locator('[data-testid="public-alert-item"]');
      await expect(alertItems).toHaveCount.greaterThan(0);

      // Alerts should show general information only
      const firstAlert = alertItems.first();
      await expect(firstAlert.locator('[data-testid="alert-type"]')).toBeVisible();
      await expect(firstAlert.locator('[data-testid="alert-severity"]')).toBeVisible();
      await expect(firstAlert.locator('[data-testid="alert-timestamp"]')).toBeVisible();
      
      // Should NOT show technical details
      await expect(firstAlert.locator('[data-testid="alert-source-ip"]')).not.toBeVisible();
      await expect(firstAlert.locator('[data-testid="alert-rule-id"]')).not.toBeVisible();
    });

    test('should provide filtered alert severity information', async () => {
      // Should show severity filter but limited options
      const severityFilter = page.locator('[data-testid="severity-filter"]');
      await expect(severityFilter).toBeVisible();

      const options = await severityFilter.locator('option').allTextContents();
      expect(options).toContain('All Levels');
      expect(options).toContain('High');
      expect(options).toContain('Critical');
      
      // Should not have granular filtering options
      expect(options).not.toContain('Internal');
      expect(options).not.toContain('System');
    });

    test('should show alert trends without sensitive data', async () => {
      await expect(page.locator('[data-testid="alert-trends-chart"]')).toBeVisible();
      
      // Chart should show general trends
      await expect(page.locator('[data-testid="trend-line"]')).toBeVisible();
      
      // Should display aggregated information
      const chartLegend = page.locator('[data-testid="chart-legend"]');
      await expect(chartLegend).toContainText('Security Activity');
      await expect(chartLegend).not.toContainText('Specific Threats');
      await expect(chartLegend).not.toContainText('Internal Events');
    });
  });

  test.describe('Public Reports Access', () => {
    test.beforeEach(async () => {
      await loginAsGuest(page, 'aaron');
      await page.goto('/reports');
    });

    test('should display available public reports', async () => {
      await expect(page.locator('[data-testid="public-reports-list"]')).toBeVisible();
      
      const reportItems = page.locator('[data-testid="report-item"]');
      await expect(reportItems).toHaveCount.greaterThan(0);

      // Should show report types appropriate for guests
      await expect(page.locator('text=Security Overview Report')).toBeVisible();
      await expect(page.locator('text=Threat Landscape Summary')).toBeVisible();
      await expect(page.locator('text=System Status Report')).toBeVisible();

      // Should NOT show detailed internal reports
      await expect(page.locator('text=Incident Response Analysis')).not.toBeVisible();
      await expect(page.locator('text=Vulnerability Assessment')).not.toBeVisible();
      await expect(page.locator('text=User Activity Report')).not.toBeVisible();
    });

    test('should generate and download public security report', async () => {
      const downloadPromise = page.waitForEvent('download');
      
      await page.click('[data-testid="security-overview-report"]');
      await page.selectOption('[data-testid="report-format"]', 'PDF');
      await page.selectOption('[data-testid="report-period"]', 'last-30-days');
      await page.click('[data-testid="generate-report-button"]');

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('security-overview');
      expect(download.suggestedFilename()).toContain('.pdf');
    });

    test('should show report preview with limited data', async () => {
      await page.click('[data-testid="security-overview-report"]');
      await page.click('[data-testid="preview-report-button"]');

      await expect(page.locator('[data-testid="report-preview"]')).toBeVisible();
      
      // Should contain general security metrics
      await expect(page.locator('[data-testid="report-content"]')).toContainText('Security Status');
      await expect(page.locator('[data-testid="report-content"]')).toContainText('Threat Level');
      
      // Should NOT contain sensitive information
      const reportContent = await page.locator('[data-testid="report-content"]').textContent();
      expect(reportContent).not.toContain('specific IP addresses');
      expect(reportContent).not.toContain('user names');
      expect(reportContent).not.toContain('internal system names');
    });
  });

  test.describe('Navigation and Access Restrictions', () => {
    test.beforeEach(async () => {
      await loginAsGuest(page, 'james');
    });

    test('should prevent access to admin-only pages', async () => {
      // Attempt to access user management
      await page.goto('/admin/users');
      await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();
      await expect(page.locator('text=Access Denied')).toBeVisible();
      
      // Should redirect to guest dashboard
      await expect(page).toHaveURL('/dashboard/guest');

      // Attempt to access system settings
      await page.goto('/admin/settings');
      await expect(page).toHaveURL('/dashboard/guest');
      
      // Attempt to access audit logs
      await page.goto('/admin/audit');
      await expect(page).toHaveURL('/dashboard/guest');
    });

    test('should show appropriate navigation menu for guests', async () => {
      await page.goto('/dashboard/guest');
      
      const navigation = page.locator('[data-testid="guest-navigation"]');
      await expect(navigation).toBeVisible();

      // Should show allowed navigation items
      await expect(navigation.locator('[data-testid="nav-overview"]')).toBeVisible();
      await expect(navigation.locator('[data-testid="nav-alerts"]')).toBeVisible();
      await expect(navigation.locator('[data-testid="nav-incidents"]')).toBeVisible();
      await expect(navigation.locator('[data-testid="nav-reports"]')).toBeVisible();

      // Should NOT show admin navigation items
      await expect(navigation.locator('[data-testid="nav-admin"]')).not.toBeVisible();
      await expect(navigation.locator('[data-testid="nav-users"]')).not.toBeVisible();
      await expect(navigation.locator('[data-testid="nav-settings"]')).not.toBeVisible();
    });

    test('should handle API requests with guest permissions', async () => {
      await page.goto('/dashboard/guest');
      
      // Monitor network requests
      const responses: any[] = [];
      page.on('response', response => {
        if (response.url().includes('/api/')) {
          responses.push({
            url: response.url(),
            status: response.status(),
          });
        }
      });

      // Trigger some data fetches
      await page.reload();
      await page.waitForTimeout(2000);

      // Should have successful responses for allowed endpoints
      const allowedRequests = responses.filter(r => 
        r.url.includes('/api/public/') || 
        r.url.includes('/api/overview') ||
        r.url.includes('/api/guest/')
      );
      expect(allowedRequests.every(r => r.status === 200)).toBeTruthy();

      // Any admin endpoint requests should be blocked
      const adminRequests = responses.filter(r => 
        r.url.includes('/api/admin/') ||
        r.url.includes('/api/users/') ||
        r.url.includes('/api/settings/')
      );
      adminRequests.forEach(request => {
        expect([401, 403]).toContain(request.status);
      });
    });
  });

  test.describe('Session Management for Guests', () => {
    test('should automatically log out after inactivity period', async () => {
      await loginAsGuest(page, 'aaron');
      await expect(page).toHaveURL('/dashboard/guest');

      // Set short session timeout for testing
      await page.evaluate(() => {
        localStorage.setItem('sessionTimeout', '5000'); // 5 seconds
      });

      // Wait for session timeout
      await page.waitForTimeout(6000);

      // Should redirect to login page
      await expect(page).toHaveURL('/login');
      await expect(page.locator('[data-testid="session-expired-message"]')).toBeVisible();
    });

    test('should display session time remaining for guests', async () => {
      await loginAsGuest(page, 'james');
      
      // Should show session indicator
      const sessionIndicator = page.locator('[data-testid="session-indicator"]');
      await expect(sessionIndicator).toBeVisible();
      
      // Should display time remaining
      await expect(sessionIndicator.locator('[data-testid="time-remaining"]')).toBeVisible();
      
      // Should show warning when session is about to expire
      await page.evaluate(() => {
        // Simulate session about to expire
        window.dispatchEvent(new CustomEvent('sessionWarning', {
          detail: { minutesRemaining: 5 }
        }));
      });

      await expect(page.locator('[data-testid="session-warning"]')).toBeVisible();
      await expect(page.locator('text=Your session will expire in 5 minutes')).toBeVisible();
    });

    test('should allow session extension for active guests', async () => {
      await loginAsGuest(page, 'aaron');
      
      // Simulate session warning
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('sessionWarning', {
          detail: { minutesRemaining: 2 }
        }));
      });

      await expect(page.locator('[data-testid="extend-session-dialog"]')).toBeVisible();
      await page.click('[data-testid="extend-session-button"]');

      // Should extend session
      await expect(page.locator('[data-testid="session-extended-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="extend-session-dialog"]')).not.toBeVisible();
    });
  });

  test.describe('Real-time Updates for Guests', () => {
    test.beforeEach(async () => {
      await loginAsGuest(page, 'aaron');
      await page.goto('/dashboard/guest');
    });

    test('should receive public security notifications', async () => {
      // Simulate public security notification
      await page.evaluate(() => {
        window.mockSocketEmit('public_security_alert', {
          id: 'public-alert-123',
          message: 'General security advisory: Increased phishing activity detected',
          level: 'ADVISORY',
          timestamp: new Date().toISOString(),
        });
      });

      // Should show notification
      await expect(page.locator('[data-testid="public-notification"]')).toBeVisible();
      await expect(page.locator('[data-testid="public-notification"]')).toContainText('phishing activity');
      
      // Should not contain sensitive details
      const notificationText = await page.locator('[data-testid="public-notification"]').textContent();
      expect(notificationText).not.toContain('IP address');
      expect(notificationText).not.toContain('specific user');
    });

    test('should update public security status in real-time', async () => {
      const statusIndicator = page.locator('[data-testid="public-security-status"]');
      await expect(statusIndicator).toBeVisible();
      
      const initialStatus = await statusIndicator.textContent();
      
      // Simulate status change
      await page.evaluate(() => {
        window.mockSocketEmit('public_status_update', {
          level: 'ELEVATED',
          message: 'Security level elevated due to increased threat activity',
          timestamp: new Date().toISOString(),
        });
      });

      await page.waitForTimeout(1000);
      const updatedStatus = await statusIndicator.textContent();
      expect(updatedStatus).not.toBe(initialStatus);
      expect(updatedStatus).toContain('ELEVATED');
    });

    test('should not receive sensitive real-time updates', async () => {
      // Set up listener for any WebSocket messages
      const receivedMessages: any[] = [];
      await page.evaluateHandle(() => {
        const originalEmit = window.mockSocketEmit;
        window.mockSocketEmit = (event: string, data: any) => {
          window.receivedMessages = window.receivedMessages || [];
          window.receivedMessages.push({ event, data });
          return originalEmit(event, data);
        };
      });

      // Simulate various types of updates
      await page.evaluate(() => {
        // These should not be received by guests
        window.mockSocketEmit('incident_created', { id: 'inc-123', sensitive: true });
        window.mockSocketEmit('threat_intelligence_update', { classified: true });
        window.mockSocketEmit('user_activity', { username: 'admin' });
        
        // This should be received
        window.mockSocketEmit('public_security_alert', { public: true });
      });

      await page.waitForTimeout(1000);

      // Check that only public messages were processed
      const messages = await page.evaluate(() => window.receivedMessages || []);
      const publicMessages = messages.filter(m => m.event === 'public_security_alert');
      const sensitiveMessages = messages.filter(m => 
        ['incident_created', 'threat_intelligence_update', 'user_activity'].includes(m.event)
      );

      expect(publicMessages.length).toBeGreaterThan(0);
      expect(sensitiveMessages.length).toBe(0);
    });
  });
});