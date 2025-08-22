import { test, expect } from '@playwright/test';

test.describe('Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Wait for the dashboard to load
    await expect(page.getByText('RTPM Dashboard')).toBeVisible();
    await expect(page.getByText('Real-time Performance Monitoring')).toBeVisible();
  });

  test('should display main dashboard components', async ({ page }) => {
    // Check for main navigation elements
    await expect(page.getByText('Overview')).toBeVisible();
    await expect(page.getByText('Real-time')).toBeVisible();
    await expect(page.getByText('Historical')).toBeVisible();
    await expect(page.getByText('Agents')).toBeVisible();
    await expect(page.getByText('Alerts')).toBeVisible();

    // Check for header components
    await expect(page.getByText('Agent Performance Monitor')).toBeVisible();
    await expect(page.getByText(/Last updated:/)).toBeVisible();

    // Check for connection status
    await expect(page.getByText('Connected')).toBeVisible();
  });

  test('should navigate between different views', async ({ page }) => {
    // Start on overview (default)
    await expect(page.getByText('Total Agents')).toBeVisible();
    await expect(page.getByText('Online Agents')).toBeVisible();

    // Navigate to Real-time view
    await page.getByText('Real-time').click();
    await expect(page.locator('[data-testid="line-chart"]')).toBeVisible();

    // Navigate to Historical view
    await page.getByText('Historical').click();
    await expect(page.locator('[data-testid="line-chart"]')).toBeVisible();

    // Navigate to Agents view
    await page.getByText('Agents').click();
    await expect(page.locator('[data-testid="virtualized-list"]')).toBeVisible();

    // Navigate to Alerts view
    await page.getByText('Alerts').click();
    // Alert configuration should be visible

    // Navigate back to Overview
    await page.getByText('Overview').click();
    await expect(page.getByText('Total Agents')).toBeVisible();
  });

  test('should highlight active navigation item', async ({ page }) => {
    // Check that Overview is initially active
    const overviewButton = page.getByText('Overview').first();
    await expect(overviewButton).toHaveClass(/bg-blue-600/);

    // Click on Real-time and check it becomes active
    await page.getByText('Real-time').click();
    const realtimeButton = page.getByText('Real-time').first();
    await expect(realtimeButton).toHaveClass(/bg-blue-600/);

    // Overview should no longer be active
    await expect(overviewButton).not.toHaveClass(/bg-blue-600/);
  });

  test('should collapse and expand sidebar', async ({ page }) => {
    // Check that sidebar is initially expanded
    await expect(page.getByText('Real-time Performance Monitoring')).toBeVisible();

    // Click collapse button
    await page.getByTitle('Minimize').click();

    // Text should be hidden in collapsed state
    await expect(page.getByText('Real-time Performance Monitoring')).not.toBeVisible();

    // Click expand button
    await page.getByTitle('Maximize').click();

    // Text should reappear
    await expect(page.getByText('Real-time Performance Monitoring')).toBeVisible();
  });

  test('should use keyboard navigation', async ({ page }) => {
    // Focus first navigation item
    await page.keyboard.press('Tab');
    await expect(page.getByText('Overview')).toBeFocused();

    // Tab to next item
    await page.keyboard.press('Tab');
    await expect(page.getByText('Real-time')).toBeFocused();

    // Press Enter to activate
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="line-chart"]')).toBeVisible();
  });

  test('should show refresh functionality', async ({ page }) => {
    const refreshButton = page.getByTitle('Refresh data');
    await expect(refreshButton).toBeVisible();

    // Click refresh button
    await refreshButton.click();

    // Button should briefly show loading state
    await expect(refreshButton).toBeDisabled();

    // Should re-enable after refresh
    await expect(refreshButton).toBeEnabled({ timeout: 5000 });
  });

  test('should show export functionality', async ({ page }) => {
    const exportButton = page.getByTitle('Export data');
    await expect(exportButton).toBeVisible();

    // Click export button
    await exportButton.click();

    // Export manager should open (implementation dependent)
    // This test documents the expected behavior
  });
});

test.describe('Dashboard Mobile Navigation', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('should show mobile menu on small screens', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('RTPM Dashboard')).toBeVisible();

    // Should show mobile menu button
    const menuButton = page.getByRole('button', { name: /menu/i });
    await expect(menuButton).toBeVisible();

    // Click to open mobile menu
    await menuButton.click();

    // Mobile navigation should appear
    await expect(page.getByText('Real-time Performance Monitoring')).toBeVisible();

    // Navigation items should be visible
    await expect(page.getByText('Overview')).toBeVisible();
    await expect(page.getByText('Real-time')).toBeVisible();
    await expect(page.getByText('Historical')).toBeVisible();
    await expect(page.getByText('Agents')).toBeVisible();
    await expect(page.getByText('Alerts')).toBeVisible();
  });

  test('should navigate and close mobile menu', async ({ page }) => {
    await page.goto('/');

    // Open mobile menu
    const menuButton = page.getByRole('button', { name: /menu/i });
    await menuButton.click();

    // Click on Real-time
    await page.getByText('Real-time').click();

    // Menu should close automatically
    await expect(page.getByText('Real-time Performance Monitoring')).not.toBeVisible();

    // Should be on Real-time view
    await expect(page.locator('[data-testid="line-chart"]')).toBeVisible();
  });

  test('should close mobile menu with close button', async ({ page }) => {
    await page.goto('/');

    // Open mobile menu
    const menuButton = page.getByRole('button', { name: /menu/i });
    await menuButton.click();

    // Click close button
    await page.getByRole('button', { name: /close/i }).click();

    // Menu should close
    await expect(page.getByText('Real-time Performance Monitoring')).not.toBeVisible();
  });
});

test.describe('Dashboard Responsiveness', () => {
  const viewports = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1200, height: 800 },
    { name: 'Large Desktop', width: 1920, height: 1080 },
  ];

  viewports.forEach(({ name, width, height }) => {
    test(`should display correctly on ${name}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/');

      // Dashboard should load regardless of viewport
      await expect(page.getByText('RTPM Dashboard')).toBeVisible({ timeout: 10000 });

      // Navigation should be accessible
      if (width < 768) {
        // Mobile: should show menu button
        await expect(page.getByRole('button', { name: /menu/i })).toBeVisible();
      } else {
        // Desktop/Tablet: should show sidebar
        await expect(page.getByText('Overview')).toBeVisible();
      }

      // Content should be visible
      await expect(page.getByText('Agent Performance Monitor')).toBeVisible();
    });
  });
});

test.describe('Dashboard Performance', () => {
  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await expect(page.getByText('RTPM Dashboard')).toBeVisible();

    const loadTime = Date.now() - startTime;

    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should handle rapid navigation without performance issues', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('RTPM Dashboard')).toBeVisible();

    const startTime = Date.now();

    // Rapidly navigate between views
    for (let i = 0; i < 10; i++) {
      await page.getByText('Real-time').click();
      await page.getByText('Historical').click();
      await page.getByText('Agents').click();
      await page.getByText('Overview').click();
    }

    const navigationTime = Date.now() - startTime;

    // Rapid navigation should complete within 5 seconds
    expect(navigationTime).toBeLessThan(5000);
  });

  test('should maintain responsive interactions', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('RTPM Dashboard')).toBeVisible();

    // Test multiple interactions
    const interactions = [
      () => page.getByText('Real-time').click(),
      () => page.getByTitle('Refresh data').click(),
      () => page.getByText('Agents').click(),
      () => page.getByTitle('Export data').click(),
      () => page.getByText('Overview').click(),
    ];

    for (const interaction of interactions) {
      const startTime = Date.now();
      await interaction();
      const responseTime = Date.now() - startTime;

      // Each interaction should respond within 500ms
      expect(responseTime).toBeLessThan(500);
    }
  });
});

test.describe('Dashboard Error Handling', () => {
  test('should handle network errors gracefully', async ({ page }) => {
    // Block all network requests to simulate offline
    await page.route('**/*', route => route.abort());

    await page.goto('/');

    // Page should still load with cached resources
    // Or show appropriate error state
    await expect(page.locator('body')).toBeVisible();
  });

  test('should recover from temporary network issues', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('RTPM Dashboard')).toBeVisible();

    // Block network temporarily
    await page.route('**/api/**', route => route.abort());

    // Try to refresh data
    await page.getByTitle('Refresh data').click();

    // Restore network
    await page.unroute('**/api/**');

    // Should continue working
    await expect(page.getByText('RTPM Dashboard')).toBeVisible();
  });

  test('should display connection status correctly', async ({ page }) => {
    await page.goto('/');

    // Should initially show connected state
    await expect(page.getByText('Connected')).toBeVisible();

    // Mock WebSocket disconnection would show disconnected state
    // This would require WebSocket mocking in the test environment
  });
});
