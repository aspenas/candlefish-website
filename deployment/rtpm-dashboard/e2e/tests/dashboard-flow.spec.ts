/**
 * E2E tests for complete dashboard workflows.
 * Tests user journeys through the RTPM dashboard.
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Dashboard Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Load authentication state
    await page.goto('/');
    
    // Wait for application to load
    await page.waitForSelector('[data-testid="app"]', { timeout: 10000 });
  });

  test('should display dashboard with all panels', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    
    // Wait for dashboard to load
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    
    // Verify all panels are present
    await expect(page.locator('[data-testid="dns-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="infrastructure-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="kubernetes-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="validation-panel"]')).toBeVisible();
    
    // Verify dashboard header
    await expect(page.locator('[data-testid="dashboard-header"]')).toContainText('Real-time Performance Monitoring');
  });

  test('should show system status information', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Wait for status to load
    await expect(page.locator('[data-testid="system-status"]')).toBeVisible();
    
    // Check status indicator
    const statusElement = page.locator('[data-testid="system-status"]');
    const statusText = await statusElement.textContent();
    
    expect(statusText).toMatch(/healthy|degraded|unhealthy/i);
    
    // Verify last updated timestamp
    await expect(page.locator('[data-testid="last-updated"]')).toBeVisible();
  });

  test('should handle real-time updates via WebSocket', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Wait for WebSocket connection
    await page.waitForFunction(() => {
      return (window as any).websocketConnected === true;
    }, { timeout: 10000 });
    
    // Monitor metric updates
    const metricUpdates: any[] = [];
    await page.addListener('console', msg => {
      if (msg.text().includes('metric_update')) {
        metricUpdates.push(msg.text());
      }
    });
    
    // Wait for some metric updates
    await page.waitForTimeout(5000);
    
    // Should have received some real-time updates
    expect(metricUpdates.length).toBeGreaterThan(0);
  });

  test('should allow panel customization', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Open panel settings
    await page.click('[data-testid="panel-settings-button"]');
    await expect(page.locator('[data-testid="panel-settings-modal"]')).toBeVisible();
    
    // Toggle DNS panel visibility
    const dnsToggle = page.locator('[data-testid="toggle-dns-panel"]');
    await dnsToggle.click();
    
    // Save settings
    await page.click('[data-testid="save-panel-settings"]');
    
    // Verify DNS panel is hidden
    await expect(page.locator('[data-testid="dns-panel"]')).not.toBeVisible();
    
    // Refresh page and verify settings persisted
    await page.reload();
    await expect(page.locator('[data-testid="dns-panel"]')).not.toBeVisible();
  });

  test('should handle panel drag and drop reordering', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Get initial panel positions
    const initialPanels = await page.locator('[data-testid*="panel"]').all();
    const initialOrder = await Promise.all(
      initialPanels.map(panel => panel.getAttribute('data-testid'))
    );
    
    // Drag DNS panel to different position
    const dnsPanel = page.locator('[data-testid="dns-panel"]');
    const kubernetesPanel = page.locator('[data-testid="kubernetes-panel"]');
    
    await dnsPanel.hover();
    await page.mouse.down();
    await kubernetesPanel.hover();
    await page.mouse.up();
    
    // Wait for reorder to complete
    await page.waitForTimeout(1000);
    
    // Get new panel order
    const finalPanels = await page.locator('[data-testid*="panel"]').all();
    const finalOrder = await Promise.all(
      finalPanels.map(panel => panel.getAttribute('data-testid'))
    );
    
    // Order should have changed
    expect(finalOrder).not.toEqual(initialOrder);
  });

  test('should display and handle alerts', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check alerts section
    await expect(page.locator('[data-testid="alerts-section"]')).toBeVisible();
    
    // Should show active alerts if any
    const alertCount = await page.locator('[data-testid="alert-notification"]').count();
    
    if (alertCount > 0) {
      // Click on first alert
      await page.click('[data-testid="alert-notification"]');
      
      // Should show alert details
      await expect(page.locator('[data-testid="alert-details-modal"]')).toBeVisible();
      
      // Should have acknowledge button
      await expect(page.locator('[data-testid="acknowledge-alert-button"]')).toBeVisible();
      
      // Acknowledge alert
      await page.click('[data-testid="acknowledge-alert-button"]');
      
      // Alert should be acknowledged
      await expect(page.locator('[data-testid="alert-acknowledged"]')).toBeVisible();
    }
  });

  test('should handle manual data refresh', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Get initial last updated time
    const initialTime = await page.locator('[data-testid="last-updated"]').textContent();
    
    // Wait a moment
    await page.waitForTimeout(1000);
    
    // Click refresh button
    await page.click('[data-testid="refresh-button"]');
    
    // Wait for refresh to complete
    await page.waitForTimeout(2000);
    
    // Last updated time should have changed
    const newTime = await page.locator('[data-testid="last-updated"]').textContent();
    expect(newTime).not.toBe(initialTime);
  });

  test('should show loading states during data fetch', async ({ page }) => {
    // Intercept API calls to simulate slow response
    await page.route('/api/v1/deployment/status', route => {
      setTimeout(() => route.continue(), 2000);
    });
    
    await page.goto('/dashboard');
    
    // Should show loading indicators
    await expect(page.locator('[data-testid="dashboard-loading"]')).toBeVisible();
    
    // Loading should disappear after data loads
    await expect(page.locator('[data-testid="dashboard-loading"]')).not.toBeVisible({ timeout: 5000 });
    
    // Dashboard content should be visible
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Intercept API calls to simulate errors
    await page.route('/api/v1/deployment/status', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });
    
    await page.goto('/dashboard');
    
    // Should show error state
    await expect(page.locator('[data-testid="dashboard-error"]')).toBeVisible();
    
    // Should show retry button
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText('server error');
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Focus should start on main content
    await page.keyboard.press('Tab');
    
    // Should be able to navigate through panels
    let focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
    expect(focusedElement).toBeTruthy();
    
    // Navigate through multiple elements
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
    }
    
    // Should be able to activate elements with Enter/Space
    const activeElement = page.locator(':focus');
    if (await activeElement.isVisible()) {
      await page.keyboard.press('Enter');
      // Action should be triggered (depends on focused element)
    }
  });

  test('should be responsive on different screen sizes', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    
    // Should show mobile layout
    await expect(page.locator('[data-testid="dashboard"]')).toHaveClass(/mobile-layout/);
    
    // Panels should stack vertically
    const panels = page.locator('[data-testid*="panel"]');
    const panelCount = await panels.count();
    
    for (let i = 0; i < panelCount; i++) {
      await expect(panels.nth(i)).toBeVisible();
    }
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    
    // Should show tablet layout
    await expect(page.locator('[data-testid="dashboard"]')).toHaveClass(/tablet-layout/);
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.reload();
    
    // Should show desktop layout
    await expect(page.locator('[data-testid="dashboard"]')).toHaveClass(/desktop-layout/);
  });

  test('should handle WebSocket disconnection and reconnection', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Wait for WebSocket connection
    await page.waitForFunction(() => (window as any).websocketConnected === true);
    
    // Simulate network disconnection
    await page.evaluate(() => {
      (window as any).websocketClient?.disconnect();
    });
    
    // Should show disconnection warning
    await expect(page.locator('[data-testid="connection-warning"]')).toBeVisible();
    
    // Simulate reconnection
    await page.evaluate(() => {
      (window as any).websocketClient?.connect();
    });
    
    // Warning should disappear
    await expect(page.locator('[data-testid="connection-warning"]')).not.toBeVisible();
  });

  test('should persist user preferences', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Set theme preference
    await page.click('[data-testid="theme-toggle"]');
    
    // Verify dark theme applied
    await expect(page.locator('html')).toHaveClass(/dark-theme/);
    
    // Refresh page
    await page.reload();
    
    // Theme preference should persist
    await expect(page.locator('html')).toHaveClass(/dark-theme/);
    
    // Set auto-refresh interval
    await page.click('[data-testid="settings-button"]');
    await page.selectOption('[data-testid="refresh-interval-select"]', '60');
    await page.click('[data-testid="save-settings"]');
    
    // Preference should be saved
    await page.reload();
    await page.click('[data-testid="settings-button"]');
    const selectedValue = await page.locator('[data-testid="refresh-interval-select"]').inputValue();
    expect(selectedValue).toBe('60');
  });

  test('should handle large datasets efficiently', async ({ page }) => {
    // Mock large dataset response
    await page.route('/api/v1/metrics/query', route => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        metric_name: 'performance_test',
        value: Math.random() * 100,
        timestamp: new Date(Date.now() - i * 1000).toISOString(),
        labels: { instance: `server-${i % 100}` }
      }));
      
      route.fulfill({
        status: 200,
        body: JSON.stringify({ metrics: largeDataset })
      });
    });
    
    await page.goto('/dashboard');
    
    const startTime = Date.now();
    
    // Trigger data load
    await page.click('[data-testid="refresh-button"]');
    
    // Wait for data to load
    await expect(page.locator('[data-testid="metrics-chart"]')).toBeVisible();
    
    const loadTime = Date.now() - startTime;
    
    // Should handle large dataset in reasonable time (under 5 seconds)
    expect(loadTime).toBeLessThan(5000);
    
    // UI should remain responsive
    await page.click('[data-testid="panel-settings-button"]');
    await expect(page.locator('[data-testid="panel-settings-modal"]')).toBeVisible({ timeout: 1000 });
  });
});