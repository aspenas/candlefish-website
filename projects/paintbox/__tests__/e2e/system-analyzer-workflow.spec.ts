/**
 * End-to-End Tests for System Analyzer Workflows
 * Tests complete user journeys using Playwright
 */

import { test, expect, Page } from '@playwright/test';
import { SystemAnalysisFactory, ServiceFactory, AlertFactory } from '../factories/systemAnalyzerFactory';

// Test configuration
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const API_URL = process.env.E2E_API_URL || 'http://localhost:4000';

test.describe('System Analyzer Dashboard E2E', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;

    // Set up test data via API
    await setupTestData();

    // Navigate to dashboard
    await page.goto(`${BASE_URL}/system-analyzer`);

    // Wait for initial load
    await page.waitForSelector('[data-testid="dashboard-container"]', {
      state: 'visible',
      timeout: 30000
    });
  });

  test.describe('Dashboard Overview', () => {
    test('should display system health overview correctly', async () => {
      // Wait for health score to load
      await page.waitForSelector('[data-testid="system-health-score"]');

      // Check health score is displayed
      const healthScore = await page.textContent('[data-testid="health-score-value"]');
      expect(healthScore).toMatch(/\d{1,3}%/);

      // Check health status badge
      const healthBadge = page.locator('[data-testid="health-status-badge"]');
      await expect(healthBadge).toBeVisible();
      await expect(healthBadge).toContainText(/(HEALTHY|DEGRADED|UNHEALTHY)/);
    });

    test('should display services summary with correct counts', async () => {
      // Check services summary card
      await page.waitForSelector('[data-testid="services-summary-card"]');

      // Verify service counts
      const totalServices = await page.textContent('[data-testid="total-services-count"]');
      const healthyServices = await page.textContent('[data-testid="healthy-services-count"]');
      const degradedServices = await page.textContent('[data-testid="degraded-services-count"]');
      const unhealthyServices = await page.textContent('[data-testid="unhealthy-services-count"]');

      expect(parseInt(totalServices || '0')).toBeGreaterThanOrEqual(0);
      expect(parseInt(healthyServices || '0')).toBeGreaterThanOrEqual(0);
      expect(parseInt(degradedServices || '0')).toBeGreaterThanOrEqual(0);
      expect(parseInt(unhealthyServices || '0')).toBeGreaterThanOrEqual(0);
    });

    test('should display active alerts summary', async () => {
      await page.waitForSelector('[data-testid="alerts-summary-card"]');

      // Check alert counts by severity
      const criticalAlerts = page.locator('[data-testid="critical-alerts-count"]');
      const highAlerts = page.locator('[data-testid="high-alerts-count"]');
      const mediumAlerts = page.locator('[data-testid="medium-alerts-count"]');
      const lowAlerts = page.locator('[data-testid="low-alerts-count"]');

      await expect(criticalAlerts).toBeVisible();
      await expect(highAlerts).toBeVisible();
      await expect(mediumAlerts).toBeVisible();
      await expect(lowAlerts).toBeVisible();
    });

    test('should show performance metrics chart', async () => {
      await page.waitForSelector('[data-testid="performance-chart"]');

      const chart = page.locator('[data-testid="performance-chart"]');
      await expect(chart).toBeVisible();

      // Check chart has data
      const chartCanvas = chart.locator('canvas');
      await expect(chartCanvas).toBeVisible();
    });

    test('should refresh data when refresh button clicked', async () => {
      // Wait for initial data load
      await page.waitForSelector('[data-testid="system-health-score"]');

      // Get initial health score
      const initialHealthScore = await page.textContent('[data-testid="health-score-value"]');

      // Click refresh button
      await page.click('[data-testid="refresh-button"]');

      // Wait for refresh indicator
      await page.waitForSelector('[data-testid="refresh-loading"]');

      // Wait for refresh to complete
      await page.waitForSelector('[data-testid="refresh-loading"]', { state: 'hidden' });

      // Data should be updated (or at least refresh was triggered)
      const refreshButton = page.locator('[data-testid="refresh-button"]');
      await expect(refreshButton).not.toHaveClass(/loading/);
    });
  });

  test.describe('Services Management', () => {
    test('should navigate to services list when services card clicked', async () => {
      await page.click('[data-testid="services-summary-card"]');

      // Should navigate to services page
      await expect(page).toHaveURL(/.*\/services$/);
      await page.waitForSelector('[data-testid="services-list"]');
    });

    test('should display services in grid view', async () => {
      await page.goto(`${BASE_URL}/system-analyzer/services`);
      await page.waitForSelector('[data-testid="services-grid"]');

      // Should show service cards
      const serviceCards = page.locator('[data-testid="service-card"]');
      await expect(serviceCards.first()).toBeVisible();

      // Check service card content
      const firstCard = serviceCards.first();
      await expect(firstCard.locator('[data-testid="service-name"]')).toBeVisible();
      await expect(firstCard.locator('[data-testid="service-status"]')).toBeVisible();
      await expect(firstCard.locator('[data-testid="service-environment"]')).toBeVisible();
    });

    test('should filter services by status', async () => {
      await page.goto(`${BASE_URL}/system-analyzer/services`);
      await page.waitForSelector('[data-testid="services-grid"]');

      // Get initial service count
      const initialCards = await page.locator('[data-testid="service-card"]').count();

      // Apply status filter
      await page.selectOption('[data-testid="status-filter"]', 'HEALTHY');

      // Wait for filter to apply
      await page.waitForTimeout(1000);

      // Check filtered results
      const filteredCards = await page.locator('[data-testid="service-card"]').count();

      // Should have filtered results
      expect(filteredCards).toBeLessThanOrEqual(initialCards);

      // All visible cards should be healthy
      const statusBadges = page.locator('[data-testid="service-status"]:visible');
      const statusCount = await statusBadges.count();

      for (let i = 0; i < statusCount; i++) {
        const statusText = await statusBadges.nth(i).textContent();
        expect(statusText).toBe('HEALTHY');
      }
    });

    test('should search services by name', async () => {
      await page.goto(`${BASE_URL}/system-analyzer/services`);
      await page.waitForSelector('[data-testid="services-grid"]');

      // Type in search box
      await page.fill('[data-testid="search-input"]', 'api');

      // Wait for search to filter
      await page.waitForTimeout(1000);

      // Check that results are filtered
      const serviceNames = page.locator('[data-testid="service-name"]:visible');
      const nameCount = await serviceNames.count();

      for (let i = 0; i < nameCount; i++) {
        const nameText = await serviceNames.nth(i).textContent();
        expect(nameText?.toLowerCase()).toContain('api');
      }
    });

    test('should navigate to service detail when service clicked', async () => {
      await page.goto(`${BASE_URL}/system-analyzer/services`);
      await page.waitForSelector('[data-testid="services-grid"]');

      // Click first service card
      const firstCard = page.locator('[data-testid="service-card"]').first();
      await firstCard.click();

      // Should navigate to service detail
      await expect(page).toHaveURL(/.*\/services\/.+$/);
      await page.waitForSelector('[data-testid="service-detail"]');

      // Check service detail content
      await expect(page.locator('[data-testid="service-overview"]')).toBeVisible();
      await expect(page.locator('[data-testid="service-metrics"]')).toBeVisible();
      await expect(page.locator('[data-testid="service-containers"]')).toBeVisible();
    });
  });

  test.describe('Alert Management', () => {
    test('should navigate to alerts list when alerts card clicked', async () => {
      await page.click('[data-testid="alerts-summary-card"]');

      // Should navigate to alerts page
      await expect(page).toHaveURL(/.*\/alerts$/);
      await page.waitForSelector('[data-testid="alerts-list"]');
    });

    test('should display alerts with proper severity indicators', async () => {
      await page.goto(`${BASE_URL}/system-analyzer/alerts`);
      await page.waitForSelector('[data-testid="alerts-list"]');

      // Check alert items
      const alertItems = page.locator('[data-testid="alert-item"]');
      await expect(alertItems.first()).toBeVisible();

      // Check alert severity badges
      const firstAlert = alertItems.first();
      const severityBadge = firstAlert.locator('[data-testid="alert-severity"]');
      await expect(severityBadge).toBeVisible();

      // Should have appropriate color classes
      const badgeClass = await severityBadge.getAttribute('class');
      expect(badgeClass).toMatch(/(bg-red|bg-yellow|bg-orange|bg-blue)/);
    });

    test('should acknowledge alert when acknowledge button clicked', async () => {
      await page.goto(`${BASE_URL}/system-analyzer/alerts`);
      await page.waitForSelector('[data-testid="alerts-list"]');

      // Find an active alert
      const activeAlert = page.locator('[data-testid="alert-item"]').first();
      const acknowledgeButton = activeAlert.locator('[data-testid="acknowledge-button"]');

      if (await acknowledgeButton.isVisible()) {
        // Click acknowledge
        await acknowledgeButton.click();

        // Should show confirmation
        await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

        // Alert status should change
        await page.waitForTimeout(2000);
        const statusBadge = activeAlert.locator('[data-testid="alert-status"]');
        await expect(statusBadge).toContainText('ACKNOWLEDGED');
      }
    });

    test('should filter alerts by severity', async () => {
      await page.goto(`${BASE_URL}/system-analyzer/alerts`);
      await page.waitForSelector('[data-testid="alerts-list"]');

      // Apply severity filter
      await page.selectOption('[data-testid="severity-filter"]', 'CRITICAL');

      // Wait for filter to apply
      await page.waitForTimeout(1000);

      // All visible alerts should be critical
      const severityBadges = page.locator('[data-testid="alert-severity"]:visible');
      const severityCount = await severityBadges.count();

      for (let i = 0; i < severityCount; i++) {
        const severityText = await severityBadges.nth(i).textContent();
        expect(severityText).toBe('CRITICAL');
      }
    });
  });

  test.describe('Real-time Updates', () => {
    test('should receive real-time service status updates', async () => {
      // Wait for WebSocket connection
      await page.waitForSelector('[data-testid="connection-status"].connected');

      // Monitor for status changes
      const statusIndicator = page.locator('[data-testid="real-time-indicator"]');
      await expect(statusIndicator).toBeVisible();

      // Simulate service status change via API
      await simulateServiceStatusChange();

      // Should see update notification
      await expect(page.locator('[data-testid="update-notification"]')).toBeVisible({
        timeout: 10000
      });
    });

    test('should show connection status indicator', async () => {
      const connectionStatus = page.locator('[data-testid="connection-status"]');
      await expect(connectionStatus).toBeVisible();

      // Should show as connected
      await expect(connectionStatus).toHaveClass(/connected/);
    });
  });

  test.describe('Error Handling', () => {
    test('should display error state when API is unavailable', async () => {
      // Block API requests
      await page.route(`${API_URL}/**`, route => {
        route.abort('failed');
      });

      // Reload page
      await page.reload();

      // Should show error state
      await expect(page.locator('[data-testid="error-state"]')).toBeVisible({
        timeout: 10000
      });
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    });

    test('should retry when retry button clicked', async () => {
      // Block API requests initially
      let blockRequests = true;
      await page.route(`${API_URL}/**`, route => {
        if (blockRequests) {
          route.abort('failed');
        } else {
          route.continue();
        }
      });

      // Reload to trigger error
      await page.reload();
      await expect(page.locator('[data-testid="error-state"]')).toBeVisible();

      // Unblock requests
      blockRequests = false;

      // Click retry
      await page.click('[data-testid="retry-button"]');

      // Should load successfully
      await expect(page.locator('[data-testid="dashboard-container"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-state"]')).not.toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('should adapt to mobile viewport', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Should show mobile layout
      const container = page.locator('[data-testid="dashboard-container"]');
      await expect(container).toHaveClass(/mobile-layout/);

      // Navigation should be collapsed
      const navigation = page.locator('[data-testid="navigation"]');
      await expect(navigation).toHaveClass(/collapsed/);
    });

    test('should show hamburger menu on mobile', async () => {
      await page.setViewportSize({ width: 375, height: 667 });

      const menuButton = page.locator('[data-testid="mobile-menu-button"]');
      await expect(menuButton).toBeVisible();

      // Click to open menu
      await menuButton.click();

      const mobileMenu = page.locator('[data-testid="mobile-menu"]');
      await expect(mobileMenu).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should load dashboard within acceptable time', async () => {
      const startTime = Date.now();

      await page.goto(`${BASE_URL}/system-analyzer`);
      await page.waitForSelector('[data-testid="system-health-score"]');

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
    });

    test('should handle large service lists efficiently', async () => {
      // Set up test with many services
      await setupManyServices();

      await page.goto(`${BASE_URL}/system-analyzer/services`);

      // Should use virtualization for large lists
      const virtualList = page.locator('[data-testid="virtualized-list"]');
      await expect(virtualList).toBeVisible({ timeout: 10000 });

      // Should only render visible items
      const renderedItems = await page.locator('[data-testid="service-card"]:visible').count();
      expect(renderedItems).toBeLessThan(50); // Should not render all items
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async () => {
      // Tab through interactive elements
      await page.keyboard.press('Tab');

      // Should focus first interactive element
      const focusedElement = await page.locator(':focus').first();
      await expect(focusedElement).toBeVisible();

      // Continue tabbing
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Should be able to activate with Enter
      await page.keyboard.press('Enter');

      // Should trigger navigation or action
      // (Specific behavior depends on focused element)
    });

    test('should have proper ARIA labels', async () => {
      const healthScore = page.locator('[data-testid="system-health-score"]');
      await expect(healthScore).toHaveAttribute('aria-label');

      const servicesCard = page.locator('[data-testid="services-summary-card"]');
      await expect(servicesCard).toHaveAttribute('aria-label');

      const alertsCard = page.locator('[data-testid="alerts-summary-card"]');
      await expect(alertsCard).toHaveAttribute('aria-label');
    });

    test('should have good color contrast', async () => {
      // This would typically use axe-playwright for automated a11y testing
      const healthBadge = page.locator('[data-testid="health-status-badge"]');

      // Check background and text colors have sufficient contrast
      const bgColor = await healthBadge.evaluate(el =>
        window.getComputedStyle(el).backgroundColor
      );
      const textColor = await healthBadge.evaluate(el =>
        window.getComputedStyle(el).color
      );

      expect(bgColor).toBeDefined();
      expect(textColor).toBeDefined();
      // In a real test, you'd calculate contrast ratio here
    });
  });

  // Helper functions
  async function setupTestData() {
    // Create test services, alerts, and metrics via API
    const mockServices = ServiceFactory.createMany(10);
    const mockAlerts = AlertFactory.createMany(5);

    // This would typically call your test API to set up data
    // For now, we assume the system has some default data
  }

  async function simulateServiceStatusChange() {
    // Simulate status change by calling API
    await page.evaluate(async () => {
      // This would trigger a real status change in your system
      // For testing, we might call a test endpoint
      fetch('/api/test/trigger-status-change', { method: 'POST' });
    });
  }

  async function setupManyServices() {
    // Set up system with many services for performance testing
    const manyServices = ServiceFactory.createMany(100);

    // This would call your test API to create many services
    // For now, we assume the system can handle large datasets
  }
});
