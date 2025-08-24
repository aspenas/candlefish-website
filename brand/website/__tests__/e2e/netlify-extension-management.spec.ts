// Comprehensive E2E tests for Netlify Extension Management System using Playwright

import { test, expect, Page, BrowserContext } from '@playwright/test';
import {
  mockCandlefishSites,
  mockExtensionsByCategory,
  createBulkOperationData
} from '../factories/netlify-factory';

// Test configuration
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const NETLIFY_DASHBOARD_PATH = '/netlify-dashboard';
const API_BASE_URL = `${BASE_URL}/api`;

// Page Object Model classes
class NetlifyDashboardPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto(`${BASE_URL}${NETLIFY_DASHBOARD_PATH}`);
    await this.waitForPageLoad();
  }

  async waitForPageLoad() {
    await this.page.waitForSelector('[data-testid="netlify-dashboard"]', { timeout: 10000 });
    await this.page.waitForLoadState('networkidle');
  }

  async selectSite(siteId: string) {
    await this.page.click(`[data-testid="site-selector-${siteId}"]`);
    await this.page.waitForSelector(`[data-testid="selected-site-${siteId}"]`);
  }

  async toggleExtension(extensionId: string) {
    const toggleSelector = `[data-testid="toggle-${extensionId}"]`;
    await this.page.click(toggleSelector);

    // Wait for the toggle animation and API call
    await this.page.waitForTimeout(500);
    return this.page.waitForResponse(response =>
      response.url().includes('/extensions') &&
      response.status() === 200
    );
  }

  async openExtensionConfiguration(extensionId: string) {
    await this.page.click(`[data-testid="config-${extensionId}"]`);
    await this.page.waitForSelector('[data-testid="configuration-modal"]');
  }

  async saveExtensionConfiguration(config: Record<string, any>) {
    // Fill form fields based on config
    for (const [key, value] of Object.entries(config)) {
      const fieldSelector = `[name="${key}"]`;
      if (await this.page.isVisible(fieldSelector)) {
        await this.page.fill(fieldSelector, String(value));
      }
    }

    await this.page.click('[data-testid="save-config-button"]');
    await this.page.waitForSelector('[data-testid="config-saved-message"]');
  }

  async filterExtensionsByCategory(category: string) {
    await this.page.click(`[data-testid="category-filter-${category}"]`);
    await this.page.waitForTimeout(300); // Wait for filtering animation
  }

  async searchExtensions(query: string) {
    await this.page.fill('[placeholder="Search extensions..."]', query);
    await this.page.waitForTimeout(300); // Wait for debounced search
  }

  async getExtensionStatus(extensionId: string): Promise<boolean> {
    const toggleSelector = `[data-testid="toggle-${extensionId}"]`;
    return this.page.isChecked(toggleSelector);
  }

  async getVisibleExtensions(): Promise<string[]> {
    const extensionCards = await this.page.locator('[data-testid^="extension-card-"]').all();
    const extensionIds = await Promise.all(
      extensionCards.map(card => card.getAttribute('data-testid'))
    );
    return extensionIds
      .filter((id): id is string => id !== null)
      .map(id => id.replace('extension-card-', ''));
  }
}

class BulkDeploymentPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto(`${BASE_URL}${NETLIFY_DASHBOARD_PATH}/bulk-deployment`);
    await this.waitForPageLoad();
  }

  async waitForPageLoad() {
    await this.page.waitForSelector('[data-testid="bulk-deployment-interface"]', { timeout: 10000 });
    await this.page.waitForLoadState('networkidle');
  }

  async selectSites(siteIds: string[]) {
    for (const siteId of siteIds) {
      await this.page.check(`[data-testid="site-checkbox-${siteId}"]`);
    }
  }

  async selectExtensions(extensionIds: string[]) {
    for (const extensionId of extensionIds) {
      await this.page.check(`[data-testid="extension-checkbox-${extensionId}"]`);
    }
  }

  async setDeploymentAction(action: 'enable' | 'disable') {
    await this.page.selectOption('[data-testid="action-select"]', action);
  }

  async previewDeployment() {
    await this.page.click('[data-testid="preview-deployment-button"]');
    await this.page.waitForSelector('[data-testid="deployment-preview"]');
  }

  async executeDeployment() {
    await this.page.click('[data-testid="execute-deployment-button"]');
    await this.page.waitForSelector('[data-testid="deployment-progress"]');
  }

  async waitForDeploymentComplete() {
    await this.page.waitForSelector('[data-testid="deployment-complete"]', { timeout: 30000 });
  }

  async getDeploymentResults() {
    await this.waitForDeploymentComplete();
    const successCount = await this.page.textContent('[data-testid="deployment-success-count"]');
    const failedCount = await this.page.textContent('[data-testid="deployment-failed-count"]');
    return {
      success: parseInt(successCount || '0'),
      failed: parseInt(failedCount || '0')
    };
  }
}

class HealthMonitoringPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto(`${BASE_URL}${NETLIFY_DASHBOARD_PATH}/health`);
    await this.waitForPageLoad();
  }

  async waitForPageLoad() {
    await this.page.waitForSelector('[data-testid="health-monitoring-dashboard"]', { timeout: 10000 });
    await this.page.waitForLoadState('networkidle');
  }

  async refreshData() {
    await this.page.click('[data-testid="refresh-button"]');
    await this.page.waitForResponse(response =>
      response.url().includes('/health/sites') && response.status() === 200
    );
  }

  async filterSitesByStatus(status: string) {
    await this.page.selectOption('[data-testid="status-filter"]', status);
    await this.page.waitForTimeout(300);
  }

  async getSiteHealthStatus(siteId: string): Promise<string> {
    const statusElement = this.page.locator(`[data-testid="site-status-${siteId}"]`);
    const classList = await statusElement.getAttribute('class') || '';

    if (classList.includes('status-healthy')) return 'healthy';
    if (classList.includes('status-degraded')) return 'degraded';
    if (classList.includes('status-unhealthy')) return 'unhealthy';
    if (classList.includes('status-maintenance')) return 'maintenance';

    return 'unknown';
  }

  async clickOnSite(siteId: string) {
    await this.page.click(`[data-testid="site-card-${siteId}"]`);
  }

  async getOverviewMetrics() {
    const totalSites = await this.page.textContent('[data-testid="total-sites-count"]');
    const healthySites = await this.page.textContent('[data-testid="healthy-sites-count"]');
    const degradedSites = await this.page.textContent('[data-testid="degraded-sites-count"]');
    const unhealthySites = await this.page.textContent('[data-testid="unhealthy-sites-count"]');

    return {
      total: parseInt(totalSites || '0'),
      healthy: parseInt(healthySites || '0'),
      degraded: parseInt(degradedSites || '0'),
      unhealthy: parseInt(unhealthySites || '0')
    };
  }
}

// Test fixtures and setup
test.describe('Netlify Extension Management E2E Tests', () => {
  let dashboardPage: NetlifyDashboardPage;
  let bulkDeploymentPage: BulkDeploymentPage;
  let healthMonitoringPage: HealthMonitoringPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new NetlifyDashboardPage(page);
    bulkDeploymentPage = new BulkDeploymentPage(page);
    healthMonitoringPage = new HealthMonitoringPage(page);

    // Set up API mocking for consistent test data
    await page.route('**/api/**', (route) => {
      const url = route.request().url();

      if (url.includes('/extensions') && route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              extensions: Object.values(mockExtensionsByCategory).flat(),
              total: Object.values(mockExtensionsByCategory).flat().length,
              categories: Object.keys(mockExtensionsByCategory)
            },
            timestamp: new Date()
          })
        });
      } else if (url.includes('/sites') && route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { sites: mockCandlefishSites, total: mockCandlefishSites.length },
            timestamp: new Date()
          })
        });
      } else {
        route.continue();
      }
    });
  });

  test.describe('Dashboard Navigation and Layout', () => {
    test('should load dashboard with all main components', async ({ page }) => {
      await dashboardPage.goto();

      // Check main dashboard components are present
      await expect(page.locator('[data-testid="site-selector"]')).toBeVisible();
      await expect(page.locator('[data-testid="extension-catalog"]')).toBeVisible();
      await expect(page.locator('[data-testid="performance-metrics"]')).toBeVisible();
      await expect(page.locator('[data-testid="health-overview"]')).toBeVisible();
    });

    test('should display correct site count and status', async ({ page }) => {
      await dashboardPage.goto();

      const siteCards = page.locator('[data-testid^="site-card-"]');
      await expect(siteCards).toHaveCount(mockCandlefishSites.length);

      // Verify each site appears with correct information
      for (const site of mockCandlefishSites.slice(0, 3)) { // Test first 3 for performance
        await expect(page.locator(`text=${site.name}`)).toBeVisible();
        await expect(page.locator(`[data-testid="site-status-${site.id}"]`)).toBeVisible();
      }
    });

    test('should handle responsive layout on different screen sizes', async ({ page }) => {
      // Test desktop layout
      await page.setViewportSize({ width: 1920, height: 1080 });
      await dashboardPage.goto();

      const sidebar = page.locator('[data-testid="dashboard-sidebar"]');
      await expect(sidebar).toBeVisible();

      // Test tablet layout
      await page.setViewportSize({ width: 768, height: 1024 });
      await expect(sidebar).toHaveCSS('display', 'none');

      const mobileMenu = page.locator('[data-testid="mobile-menu-toggle"]');
      await expect(mobileMenu).toBeVisible();

      // Test mobile layout
      await page.setViewportSize({ width: 375, height: 667 });
      const extensionGrid = page.locator('[data-testid="extension-grid"]');
      await expect(extensionGrid).toHaveCSS('grid-template-columns', '1fr');
    });
  });

  test.describe('Extension Management', () => {
    test('should enable and disable extensions', async ({ page }) => {
      await dashboardPage.goto();

      // Select a site first
      const testSite = mockCandlefishSites[0];
      await dashboardPage.selectSite(testSite.id);

      // Get first available extension
      const testExtension = Object.values(mockExtensionsByCategory).flat()[0];

      // Check initial state
      const initialState = await dashboardPage.getExtensionStatus(testExtension.id);

      // Toggle the extension
      await dashboardPage.toggleExtension(testExtension.id);

      // Verify state changed
      const newState = await dashboardPage.getExtensionStatus(testExtension.id);
      expect(newState).toBe(!initialState);

      // Verify success message appears
      await expect(page.locator('[data-testid="extension-toggle-success"]')).toBeVisible();
    });

    test('should configure extensions', async ({ page }) => {
      await dashboardPage.goto();

      const testSite = mockCandlefishSites[0];
      await dashboardPage.selectSite(testSite.id);

      const testExtension = Object.values(mockExtensionsByCategory).flat()[0];

      // Open configuration modal
      await dashboardPage.openExtensionConfiguration(testExtension.id);

      // Configure the extension
      const testConfig = {
        threshold: '150',
        enabled: 'true',
        cacheStrategy: 'aggressive'
      };

      await dashboardPage.saveExtensionConfiguration(testConfig);

      // Verify configuration was saved
      await expect(page.locator('[data-testid="config-saved-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="config-saved-message"]')).toContainText('Configuration saved successfully');
    });

    test('should filter extensions by category', async ({ page }) => {
      await dashboardPage.goto();

      // Filter by performance category
      await dashboardPage.filterExtensionsByCategory('performance');

      const visibleExtensions = await dashboardPage.getVisibleExtensions();
      const performanceExtensions = mockExtensionsByCategory.performance.map(ext => ext.id);

      expect(visibleExtensions.every(id => performanceExtensions.includes(id))).toBe(true);

      // Clear filter and verify all extensions are visible again
      await dashboardPage.filterExtensionsByCategory('all');

      const allVisibleExtensions = await dashboardPage.getVisibleExtensions();
      expect(allVisibleExtensions.length).toBeGreaterThan(visibleExtensions.length);
    });

    test('should search extensions', async ({ page }) => {
      await dashboardPage.goto();

      // Search for cache-related extensions
      await dashboardPage.searchExtensions('cache');

      const visibleExtensions = await dashboardPage.getVisibleExtensions();
      expect(visibleExtensions.length).toBeGreaterThan(0);

      // Verify search results contain relevant extensions
      const extensionNames = await Promise.all(
        visibleExtensions.map(async id => {
          const nameElement = page.locator(`[data-testid="extension-card-${id}"] h3`);
          return nameElement.textContent();
        })
      );

      const hasRelevantResults = extensionNames.some(name =>
        name?.toLowerCase().includes('cache')
      );
      expect(hasRelevantResults).toBe(true);
    });

    test('should handle extension toggle errors gracefully', async ({ page }) => {
      await dashboardPage.goto();

      // Mock API error for specific extension
      await page.route('**/api/sites/*/extensions', (route) => {
        if (route.request().method() === 'POST') {
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: 'Internal server error',
              timestamp: new Date()
            })
          });
        } else {
          route.continue();
        }
      });

      const testSite = mockCandlefishSites[0];
      await dashboardPage.selectSite(testSite.id);

      const testExtension = Object.values(mockExtensionsByCategory).flat()[0];
      await dashboardPage.toggleExtension(testExtension.id);

      // Verify error message is displayed
      await expect(page.locator('[data-testid="extension-toggle-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="extension-toggle-error"]')).toContainText('Failed to toggle extension');
    });
  });

  test.describe('Bulk Deployment', () => {
    test('should execute bulk deployment successfully', async ({ page }) => {
      await bulkDeploymentPage.goto();

      const { sites, extensions } = createBulkOperationData();

      // Select sites and extensions
      await bulkDeploymentPage.selectSites(sites.slice(0, 2).map(s => s.id));
      await bulkDeploymentPage.selectExtensions(extensions.slice(0, 2).map(e => e.id));

      // Set deployment action
      await bulkDeploymentPage.setDeploymentAction('enable');

      // Preview deployment
      await bulkDeploymentPage.previewDeployment();

      // Verify preview shows correct operation count
      const previewText = await page.textContent('[data-testid="deployment-preview"]');
      expect(previewText).toContain('4 operation(s) will be executed'); // 2 sites × 2 extensions

      // Execute deployment
      await bulkDeploymentPage.executeDeployment();

      // Wait for completion and check results
      const results = await bulkDeploymentPage.getDeploymentResults();
      expect(results.success + results.failed).toBe(4);
      expect(results.success).toBeGreaterThan(0);
    });

    test('should handle partial deployment failures', async ({ page }) => {
      await bulkDeploymentPage.goto();

      // Mock some operations to fail
      await page.route('**/api/bulk/deploy', (route) => {
        route.fulfill({
          status: 207, // Multi-status
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              successful: [{ operation: {}, result: {} }],
              failed: [{ operation: {}, error: 'Extension not found' }],
              summary: { total: 2, successful: 1, failed: 1 }
            },
            timestamp: new Date()
          })
        });
      });

      const { sites, extensions } = createBulkOperationData();

      await bulkDeploymentPage.selectSites([sites[0].id]);
      await bulkDeploymentPage.selectExtensions(extensions.slice(0, 2).map(e => e.id));
      await bulkDeploymentPage.setDeploymentAction('enable');
      await bulkDeploymentPage.executeDeployment();

      const results = await bulkDeploymentPage.getDeploymentResults();
      expect(results.success).toBe(1);
      expect(results.failed).toBe(1);

      // Verify error details are shown
      await expect(page.locator('[data-testid="deployment-errors"]')).toBeVisible();
      await expect(page.locator('text=Extension not found')).toBeVisible();
    });

    test('should validate selections before deployment', async ({ page }) => {
      await bulkDeploymentPage.goto();

      // Try to execute without selections
      await bulkDeploymentPage.executeDeployment();

      // Should show validation error
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
      await expect(page.locator('text=Please select at least one site and one extension')).toBeVisible();
    });

    test('should cancel deployment in progress', async ({ page }) => {
      await bulkDeploymentPage.goto();

      // Mock long-running deployment
      await page.route('**/api/bulk/deploy', (route) => {
        // Simulate slow response
        setTimeout(() => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: { successful: [], failed: [], summary: { total: 0, successful: 0, failed: 0 } },
              timestamp: new Date()
            })
          });
        }, 2000);
      });

      const { sites, extensions } = createBulkOperationData();
      await bulkDeploymentPage.selectSites([sites[0].id]);
      await bulkDeploymentPage.selectExtensions([extensions[0].id]);
      await bulkDeploymentPage.executeDeployment();

      // Cancel deployment while in progress
      await page.click('[data-testid="cancel-deployment-button"]');

      // Verify cancellation
      await expect(page.locator('[data-testid="deployment-cancelled"]')).toBeVisible();
    });
  });

  test.describe('Health Monitoring', () => {
    test('should display site health overview', async ({ page }) => {
      await healthMonitoringPage.goto();

      const overviewMetrics = await healthMonitoringPage.getOverviewMetrics();

      expect(overviewMetrics.total).toBeGreaterThan(0);
      expect(overviewMetrics.total).toBe(
        overviewMetrics.healthy + overviewMetrics.degraded + overviewMetrics.unhealthy
      );

      // Verify charts are rendered
      await expect(page.locator('[data-testid="performance-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="status-chart"]')).toBeVisible();
    });

    test('should filter sites by health status', async ({ page }) => {
      await healthMonitoringPage.goto();

      // Filter to show only healthy sites
      await healthMonitoringPage.filterSitesByStatus('healthy');

      // Verify only healthy sites are shown
      const visibleSiteCards = page.locator('[data-testid^="site-card-"]');
      const count = await visibleSiteCards.count();

      for (let i = 0; i < count; i++) {
        const card = visibleSiteCards.nth(i);
        const siteId = await card.getAttribute('data-testid');
        const statusElement = card.locator('[data-testid^="site-status-"]');
        await expect(statusElement).toHaveClass(/status-healthy/);
      }
    });

    test('should refresh health data', async ({ page }) => {
      await healthMonitoringPage.goto();

      // Wait for initial load
      await page.waitForLoadState('networkidle');

      // Record initial timestamp
      const initialTimestamp = await page.textContent('[data-testid="last-updated-time"]');

      // Refresh data
      await healthMonitoringPage.refreshData();

      // Verify timestamp updated
      await page.waitForTimeout(1000); // Wait for timestamp update
      const updatedTimestamp = await page.textContent('[data-testid="last-updated-time"]');
      expect(updatedTimestamp).not.toBe(initialTimestamp);
    });

    test('should navigate to site details on click', async ({ page }) => {
      await healthMonitoringPage.goto();

      const testSite = mockCandlefishSites[0];
      await healthMonitoringPage.clickOnSite(testSite.id);

      // Should navigate to site detail view or show modal
      await expect(page.locator(`[data-testid="site-details-${testSite.id}"]`)).toBeVisible();
    });

    test('should handle auto-refresh', async ({ page }) => {
      await healthMonitoringPage.goto();

      // Mock time to test auto-refresh
      let refreshCount = 0;
      await page.route('**/api/health/sites', (route) => {
        refreshCount++;
        route.continue();
      });

      // Wait for auto-refresh interval (should be configured to short interval for testing)
      await page.waitForTimeout(5000);

      expect(refreshCount).toBeGreaterThan(1);
    });
  });

  test.describe('Real-time Features', () => {
    test('should receive WebSocket notifications', async ({ page }) => {
      await dashboardPage.goto();

      // Mock WebSocket connection
      await page.addInitScript(() => {
        class MockWebSocket {
          constructor(public url: string) {
            setTimeout(() => {
              if (this.onopen) this.onopen(new Event('open'));
            }, 100);
          }

          send(data: string) {
            console.log('WebSocket send:', data);
          }

          close() {
            if (this.onclose) this.onclose(new CloseEvent('close'));
          }

          onopen: ((event: Event) => void) | null = null;
          onmessage: ((event: MessageEvent) => void) | null = null;
          onclose: ((event: CloseEvent) => void) | null = null;
          onerror: ((event: Event) => void) | null = null;
        }

        (window as any).WebSocket = MockWebSocket;
      });

      // Simulate receiving deployment notification
      await page.evaluate(() => {
        const mockMessage = {
          type: 'deployment.complete',
          payload: {
            siteId: 'test-site',
            status: 'success',
            timestamp: new Date().toISOString()
          }
        };

        // Trigger message event if WebSocket is connected
        if (window.mockWebSocket && window.mockWebSocket.onmessage) {
          window.mockWebSocket.onmessage(new MessageEvent('message', {
            data: JSON.stringify(mockMessage)
          }));
        }
      });

      // Verify notification appears
      await expect(page.locator('[data-testid="deployment-notification"]')).toBeVisible();
    });

    test('should handle WebSocket connection failures', async ({ page }) => {
      await dashboardPage.goto();

      // Mock WebSocket to fail connection
      await page.addInitScript(() => {
        class FailingWebSocket {
          constructor(url: string) {
            setTimeout(() => {
              if (this.onerror) this.onerror(new Event('error'));
            }, 100);
          }

          onopen: ((event: Event) => void) | null = null;
          onmessage: ((event: MessageEvent) => void) | null = null;
          onclose: ((event: CloseEvent) => void) | null = null;
          onerror: ((event: Event) => void) | null = null;
        }

        (window as any).WebSocket = FailingWebSocket;
      });

      // Should show offline indicator or connection error
      await expect(page.locator('[data-testid="websocket-offline"]')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should be navigable by keyboard', async ({ page }) => {
      await dashboardPage.goto();

      // Tab through main navigation elements
      await page.keyboard.press('Tab');
      expect(await page.locator(':focus').getAttribute('data-testid')).toContain('site-selector');

      await page.keyboard.press('Tab');
      expect(await page.locator(':focus').getAttribute('data-testid')).toContain('extension-search');

      // Should be able to activate elements with Enter/Space
      const firstExtensionToggle = page.locator('[data-testid^="toggle-"]').first();
      await firstExtensionToggle.focus();
      await page.keyboard.press('Space');

      // Verify toggle worked
      await expect(page.locator('[data-testid="extension-toggle-success"]')).toBeVisible();
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      await dashboardPage.goto();

      // Check main landmarks
      await expect(page.locator('[role="main"]')).toBeVisible();
      await expect(page.locator('[role="navigation"]')).toBeVisible();
      await expect(page.locator('[role="search"]')).toBeVisible();

      // Check form elements have labels
      const searchInput = page.locator('[placeholder="Search extensions..."]');
      await expect(searchInput).toHaveAttribute('aria-label');

      // Check toggle buttons have appropriate ARIA states
      const toggleButtons = page.locator('[data-testid^="toggle-"]');
      const firstToggle = toggleButtons.first();
      expect(['true', 'false']).toContain(await firstToggle.getAttribute('aria-checked') || '');
    });

    test('should announce important changes to screen readers', async ({ page }) => {
      await dashboardPage.goto();

      const testSite = mockCandlefishSites[0];
      await dashboardPage.selectSite(testSite.id);

      const testExtension = Object.values(mockExtensionsByCategory).flat()[0];
      await dashboardPage.toggleExtension(testExtension.id);

      // Check for ARIA live region announcements
      const liveRegion = page.locator('[aria-live]');
      await expect(liveRegion).toContainText(/Extension.*enabled|disabled/);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      // Mock API to return errors
      await page.route('**/api/**', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Internal server error',
            timestamp: new Date()
          })
        });
      });

      await dashboardPage.goto();

      // Should show error state
      await expect(page.locator('[data-testid="api-error"]')).toBeVisible();
      await expect(page.locator('[role="button"]', { hasText: 'Retry' })).toBeVisible();
    });

    test('should recover from network failures', async ({ page }) => {
      await dashboardPage.goto();

      // Simulate network failure
      await page.setOfflineMode(true);

      const testSite = mockCandlefishSites[0];
      await dashboardPage.selectSite(testSite.id);

      const testExtension = Object.values(mockExtensionsByCategory).flat()[0];
      await dashboardPage.toggleExtension(testExtension.id);

      // Should show offline error
      await expect(page.locator('[data-testid="offline-error"]')).toBeVisible();

      // Restore network and retry
      await page.setOfflineMode(false);
      await page.click('[data-testid="retry-button"]');

      // Should recover and complete the operation
      await expect(page.locator('[data-testid="extension-toggle-success"]')).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should load dashboard within performance budget', async ({ page }) => {
      const startTime = Date.now();

      await dashboardPage.goto();

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds

      // Check Core Web Vitals
      const metrics = await page.evaluate(() => {
        return new Promise(resolve => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lcp = entries.find(entry => entry.entryType === 'largest-contentful-paint');
            const fid = entries.find(entry => entry.entryType === 'first-input');
            const cls = entries.find(entry => entry.entryType === 'layout-shift');

            resolve({
              lcp: lcp?.startTime,
              fid: (fid as any)?.processingStart - (fid as any)?.startTime,
              cls: (cls as any)?.value
            });
          }).observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
        });
      });

      // Verify Core Web Vitals meet thresholds
      if ((metrics as any).lcp) {
        expect((metrics as any).lcp).toBeLessThan(2500); // LCP < 2.5s
      }
      if ((metrics as any).fid) {
        expect((metrics as any).fid).toBeLessThan(100); // FID < 100ms
      }
      if ((metrics as any).cls !== undefined) {
        expect((metrics as any).cls).toBeLessThan(0.1); // CLS < 0.1
      }
    });

    test('should handle large datasets efficiently', async ({ page }) => {
      // Mock API to return large dataset
      await page.route('**/api/extensions', (route) => {
        const largeExtensionList = Array.from({ length: 100 }, (_, i) => ({
          id: `extension-${i}`,
          name: `Extension ${i}`,
          description: `Description for extension ${i}`,
          category: ['performance', 'security', 'seo'][i % 3],
          isEnabled: false,
          performance: { impact: 'medium', loadTime: 100 }
        }));

        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              extensions: largeExtensionList,
              total: largeExtensionList.length,
              categories: ['performance', 'security', 'seo']
            },
            timestamp: new Date()
          })
        });
      });

      await dashboardPage.goto();

      // Should still load within reasonable time
      await page.waitForLoadState('networkidle', { timeout: 5000 });

      // Verify virtualization is working (not all items should be in DOM)
      const renderedItems = await page.locator('[data-testid^="extension-card-"]').count();
      expect(renderedItems).toBeLessThan(100);
      expect(renderedItems).toBeGreaterThan(10); // But should show reasonable number
    });
  });
});
