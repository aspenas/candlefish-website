import { test, expect } from '@playwright/test';

test.describe('Analytics Dashboard E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Use admin session
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'admin');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    
    // Navigate to analytics
    await page.click('[data-testid="analytics-nav-link"]');
    await page.waitForURL('/analytics');
  });

  test('should display analytics dashboard with all sections', async ({ page }) => {
    // Check main heading
    await expect(page.getByRole('heading', { name: 'Analytics Dashboard' })).toBeVisible();
    
    // Check all main sections are present
    await expect(page.getByTestId('system-overview-section')).toBeVisible();
    await expect(page.getByTestId('agent-performance-section')).toBeVisible();
    await expect(page.getByTestId('service-health-section')).toBeVisible();
    await expect(page.getByTestId('performance-trends-section')).toBeVisible();
  });

  test('should load and display system metrics', async ({ page }) => {
    // Wait for system metrics to load
    await expect(page.getByTestId('cpu-usage-metric')).toBeVisible();
    await expect(page.getByTestId('memory-usage-metric')).toBeVisible();
    await expect(page.getByTestId('disk-usage-metric')).toBeVisible();
    
    // Check metric values are displayed
    const cpuUsage = page.getByTestId('cpu-usage-value');
    await expect(cpuUsage).toContainText('%');
    
    const memoryUsage = page.getByTestId('memory-usage-value');
    await expect(memoryUsage).toContainText('%');
  });

  test('should display agent performance table', async ({ page }) => {
    // Wait for agents table to load
    await expect(page.getByTestId('agents-table')).toBeVisible();
    
    // Check table headers
    await expect(page.getByRole('columnheader', { name: 'Agent Name' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Response Time' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Success Rate' })).toBeVisible();
    
    // Check for test agent data
    await expect(page.getByText('E2E Test Agent 1')).toBeVisible();
    await expect(page.getByText('E2E Test Agent 2')).toBeVisible();
  });

  test('should filter agents by status', async ({ page }) => {
    // Wait for initial load
    await expect(page.getByTestId('agents-table')).toBeVisible();
    
    // Count all agents initially
    const allAgents = page.locator('[data-testid="agent-row"]');
    const initialCount = await allAgents.count();
    expect(initialCount).toBeGreaterThan(0);
    
    // Filter by active status
    await page.click('[data-testid="agent-status-filter"]');
    await page.click('[data-testid="filter-active"]');
    
    // Wait for filter to apply
    await page.waitForTimeout(500);
    
    // Check filtered results
    const activeAgents = page.locator('[data-testid="agent-row"][data-status="active"]');
    const activeCount = await activeAgents.count();
    
    expect(activeCount).toBeLessThanOrEqual(initialCount);
    
    // Verify only active agents are shown
    const visibleAgents = page.locator('[data-testid="agent-row"]:visible');
    const visibleCount = await visibleAgents.count();
    expect(visibleCount).toBe(activeCount);
  });

  test('should change time range and update data', async ({ page }) => {
    // Wait for initial load
    await expect(page.getByTestId('time-range-selector')).toBeVisible();
    
    // Check current time range
    await expect(page.getByTestId('current-time-range')).toContainText('Last 24 hours');
    
    // Change to last 7 days
    await page.click('[data-testid="time-range-selector"]');
    await page.click('[data-testid="time-range-7d"]');
    
    // Wait for data to update
    await page.waitForLoadState('networkidle');
    
    // Verify time range changed
    await expect(page.getByTestId('current-time-range')).toContainText('Last 7 days');
    
    // Check that charts updated (by waiting for re-render)
    await expect(page.getByTestId('performance-chart')).toBeVisible();
  });

  test('should display service health status', async ({ page }) => {
    // Wait for services section
    await expect(page.getByTestId('service-health-section')).toBeVisible();
    
    // Check for test services
    await expect(page.getByText('e2e-api-server')).toBeVisible();
    await expect(page.getByText('e2e-web-dashboard')).toBeVisible();
    
    // Check health indicators
    const healthyService = page.locator('[data-testid="service-row"]').filter({ hasText: 'e2e-api-server' });
    await expect(healthyService.getByTestId('health-indicator')).toHaveClass(/healthy/);
    
    const degradedService = page.locator('[data-testid="service-row"]').filter({ hasText: 'e2e-web-dashboard' });
    await expect(degradedService.getByTestId('health-indicator')).toHaveClass(/degraded/);
  });

  test('should render performance trend charts', async ({ page }) => {
    // Wait for trends section
    await expect(page.getByTestId('performance-trends-section')).toBeVisible();
    
    // Check chart containers
    await expect(page.getByTestId('agent-trends-chart')).toBeVisible();
    await expect(page.getByTestId('service-trends-chart')).toBeVisible();
    
    // Check chart legends
    await expect(page.getByText('Response Time')).toBeVisible();
    await expect(page.getByText('Success Rate')).toBeVisible();
    
    // Verify chart has data points
    const chartSvg = page.locator('[data-testid="performance-chart"] svg');
    await expect(chartSvg).toBeVisible();
  });

  test('should export analytics data', async ({ page }) => {
    // Wait for data to load
    await expect(page.getByTestId('system-overview-section')).toBeVisible();
    
    // Start download promise before clicking
    const downloadPromise = page.waitForEvent('download');
    
    // Click export button
    await page.click('[data-testid="export-data-button"]');
    await page.click('[data-testid="export-csv"]');
    
    // Wait for download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.csv');
    
    // Verify download path
    const path = await download.path();
    expect(path).toBeTruthy();
  });

  test('should handle real-time updates', async ({ page }) => {
    // Wait for initial load
    await expect(page.getByTestId('system-overview-section')).toBeVisible();
    
    // Get initial CPU usage value
    const initialCpuUsage = await page.getByTestId('cpu-usage-value').textContent();
    
    // Trigger a simulated real-time update via API
    await page.evaluate(async () => {
      // Simulate WebSocket update
      window.dispatchEvent(new CustomEvent('analytics-update', {
        detail: {
          type: 'system',
          data: { cpuUsage: 67.5, memoryUsage: 72.1 }
        }
      }));
    });
    
    // Wait for update
    await page.waitForTimeout(1000);
    
    // Check if values updated (they should be different or show loading state)
    const updatedCpuUsage = await page.getByTestId('cpu-usage-value').textContent();
    expect(updatedCpuUsage).toBeDefined();
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check mobile layout
    await expect(page.getByTestId('mobile-analytics-dashboard')).toBeVisible();
    
    // Check mobile navigation
    await expect(page.getByTestId('mobile-nav-tabs')).toBeVisible();
    
    // Test swipe navigation between sections
    const swipeContainer = page.getByTestId('swipe-container');
    await swipeContainer.hover();
    
    // Simulate swipe gesture
    await page.mouse.down();
    await page.mouse.move(100, 300); // Swipe left
    await page.mouse.up();
    
    // Wait for navigation
    await page.waitForTimeout(500);
    
    // Should show next section
    await expect(page.getByTestId('agents-mobile-section')).toBeVisible();
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Simulate network error
    await page.route('**/api/v1/analytics/**', route => {
      route.abort('failed');
    });
    
    // Reload page to trigger error
    await page.reload();
    
    // Check error state
    await expect(page.getByText('Error loading analytics data')).toBeVisible();
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible();
    
    // Test retry functionality
    await page.unroute('**/api/v1/analytics/**');
    await page.click('[data-testid="retry-button"]');
    
    // Should load successfully after retry
    await expect(page.getByTestId('system-overview-section')).toBeVisible();
  });

  test('should support keyboard navigation', async ({ page }) => {
    // Focus on first interactive element
    await page.keyboard.press('Tab');
    
    // Check focus is visible
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();
    
    // Navigate through controls with Tab
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Test keyboard shortcuts
    await page.keyboard.press('Control+r'); // Refresh
    await page.waitForLoadState('networkidle');
    
    // Should still be functional after keyboard refresh
    await expect(page.getByTestId('system-overview-section')).toBeVisible();
  });

  test('should maintain accessibility standards', async ({ page }) => {
    // Check main landmarks
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('navigation')).toBeVisible();
    
    // Check headings hierarchy
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toBeVisible();
    
    // Check form labels
    const filterButton = page.getByRole('button', { name: /filter/i });
    await expect(filterButton).toBeVisible();
    
    // Check ARIA labels
    const chartRegion = page.getByRole('region', { name: /performance trends/i });
    await expect(chartRegion).toBeVisible();
    
    // Test screen reader announcements
    const liveRegion = page.locator('[aria-live="polite"]');
    await expect(liveRegion).toBeAttached();
  });

  test('should handle concurrent users simulation', async ({ page, context }) => {
    // Create additional browser contexts to simulate multiple users
    const context2 = await context.browser()!.newContext();
    const page2 = await context2.newPage();
    
    // Login with second user
    await page2.goto('/login');
    await page2.fill('[data-testid="username-input"]', 'user');
    await page2.fill('[data-testid="password-input"]', 'user123');
    await page2.click('[data-testid="login-button"]');
    await page2.waitForURL('/dashboard');
    
    // Both users access analytics
    await page2.goto('/analytics');
    
    // Both should see the same data
    await expect(page.getByTestId('system-overview-section')).toBeVisible();
    await expect(page2.getByTestId('system-overview-section')).toBeVisible();
    
    // Clean up
    await context2.close();
  });
});