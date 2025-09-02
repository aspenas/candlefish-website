import { test, expect } from '@playwright/test';

test.describe('Mobile Analytics E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'admin');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
    
    // Navigate to analytics
    await page.click('[data-testid="analytics-nav-link"]');
    await page.waitForURL('/analytics');
  });

  test('should display mobile-optimized dashboard', async ({ page }) => {
    // Check mobile layout
    await expect(page.getByTestId('mobile-analytics-dashboard')).toBeVisible();
    
    // Check mobile navigation tabs
    await expect(page.getByTestId('mobile-nav-tabs')).toBeVisible();
    
    // Check overview cards are visible and touch-friendly
    await expect(page.getByTestId('active-agents-card')).toBeVisible();
    await expect(page.getByTestId('services-health-card')).toBeVisible();
    await expect(page.getByTestId('alerts-card')).toBeVisible();
    
    // Verify cards are properly sized for touch
    const card = page.getByTestId('active-agents-card');
    const box = await card.boundingBox();
    expect(box!.height).toBeGreaterThan(48); // Minimum touch target
  });

  test('should support pull-to-refresh gesture', async ({ page }) => {
    // Get initial content
    await expect(page.getByTestId('active-agents-card')).toBeVisible();
    const initialText = await page.getByTestId('active-agents-value').textContent();
    
    // Perform pull-to-refresh gesture
    const container = page.getByTestId('mobile-dashboard-container');
    
    // Start touch at top
    await container.hover();
    await page.mouse.down();
    await page.mouse.move(200, 200); // Pull down
    await page.waitForTimeout(500);
    
    // Check for refresh indicator
    await expect(page.getByTestId('pull-refresh-indicator')).toBeVisible();
    
    // Release to refresh
    await page.mouse.up();
    
    // Should show refreshing state
    await expect(page.getByText('Refreshing...')).toBeVisible();
    
    // Wait for refresh to complete
    await page.waitForTimeout(2000);
    
    // Content should be reloaded
    await expect(page.getByTestId('active-agents-card')).toBeVisible();
  });

  test('should navigate between sections with swipe gestures', async ({ page }) => {
    // Start on overview section
    await expect(page.getByTestId('overview-section')).toBeVisible();
    
    // Swipe left to go to next section
    const swipeContainer = page.getByTestId('swipe-container');
    
    await swipeContainer.hover();
    await page.mouse.down();
    await page.mouse.move(-150, 0); // Swipe left
    await page.mouse.up();
    
    // Should navigate to agents section
    await expect(page.getByTestId('agents-section')).toBeVisible();
    
    // Swipe left again
    await swipeContainer.hover();
    await page.mouse.down();
    await page.mouse.move(-150, 0); // Swipe left
    await page.mouse.up();
    
    // Should navigate to services section
    await expect(page.getByTestId('services-section')).toBeVisible();
    
    // Swipe right to go back
    await swipeContainer.hover();
    await page.mouse.down();
    await page.mouse.move(150, 0); // Swipe right
    await page.mouse.up();
    
    // Should go back to agents section
    await expect(page.getByTestId('agents-section')).toBeVisible();
  });

  test('should display agent performance in mobile-optimized cards', async ({ page }) => {
    // Navigate to agents section
    await page.click('[data-testid="nav-agents"]');
    await expect(page.getByTestId('agents-section')).toBeVisible();
    
    // Check agent cards are displayed
    await expect(page.getByTestId('agent-card-e2e-agent-1')).toBeVisible();
    
    // Check card contains essential information
    const agentCard = page.getByTestId('agent-card-e2e-agent-1');
    await expect(agentCard.getByText('E2E Test Agent 1')).toBeVisible();
    await expect(agentCard.getByTestId('agent-status')).toBeVisible();
    await expect(agentCard.getByTestId('response-time')).toBeVisible();
    
    // Tap card for details
    await agentCard.click();
    
    // Should show agent details modal
    await expect(page.getByTestId('agent-details-modal')).toBeVisible();
    await expect(page.getByText('Agent Performance Details')).toBeVisible();
    
    // Close modal
    await page.click('[data-testid="close-modal"]');
    await expect(page.getByTestId('agent-details-modal')).not.toBeVisible();
  });

  test('should show service health with mobile-friendly indicators', async ({ page }) => {
    // Navigate to services section
    await page.click('[data-testid="nav-services"]');
    await expect(page.getByTestId('services-section')).toBeVisible();
    
    // Check service cards
    await expect(page.getByTestId('service-card-e2e-api-server')).toBeVisible();
    await expect(page.getByTestId('service-card-e2e-web-dashboard')).toBeVisible();
    
    // Check health indicators
    const healthyService = page.getByTestId('service-card-e2e-api-server');
    await expect(healthyService.getByTestId('health-indicator')).toHaveClass(/healthy/);
    
    const degradedService = page.getByTestId('service-card-e2e-web-dashboard');
    await expect(degradedService.getByTestId('health-indicator')).toHaveClass(/degraded/);
    
    // Tap on degraded service for details
    await degradedService.click();
    
    // Should show service details
    await expect(page.getByTestId('service-details-modal')).toBeVisible();
    await expect(page.getByText('Service Health Details')).toBeVisible();
  });

  test('should display alerts with appropriate mobile UI', async ({ page }) => {
    // Navigate to alerts section
    await page.click('[data-testid="nav-alerts"]');
    await expect(page.getByTestId('alerts-section')).toBeVisible();
    
    // Check alert cards
    const alertCards = page.locator('[data-testid^="alert-card-"]');
    const count = await alertCards.count();
    expect(count).toBeGreaterThan(0);
    
    // Check first alert
    const firstAlert = alertCards.first();
    await expect(firstAlert).toBeVisible();
    
    // Check alert has severity indicator
    await expect(firstAlert.getByTestId('severity-indicator')).toBeVisible();
    
    // Tap alert for full details
    await firstAlert.click();
    
    // Should show alert details
    await expect(page.getByTestId('alert-details-modal')).toBeVisible();
    await expect(page.getByText('Alert Details')).toBeVisible();
  });

  test('should handle device orientation changes', async ({ page }) => {
    // Start in portrait
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.getByTestId('mobile-analytics-dashboard')).toBeVisible();
    
    // Check portrait layout
    const portraitNav = page.getByTestId('bottom-navigation');
    await expect(portraitNav).toBeVisible();
    
    // Switch to landscape
    await page.setViewportSize({ width: 667, height: 375 });
    
    // Wait for layout adjustment
    await page.waitForTimeout(500);
    
    // Check landscape layout adaptations
    await expect(page.getByTestId('mobile-analytics-dashboard')).toHaveClass(/landscape/);
    
    // Navigation might change position in landscape
    const landscapeNav = page.getByTestId('side-navigation').or(page.getByTestId('bottom-navigation'));
    await expect(landscapeNav).toBeVisible();
  });

  test('should provide haptic feedback on interactions', async ({ page }) => {
    // Mock vibration API
    await page.addInitScript(() => {
      window.vibrationCalls = [];
      navigator.vibrate = (pattern) => {
        window.vibrationCalls.push(pattern);
        return true;
      };
    });
    
    // Interact with card
    await page.click('[data-testid="active-agents-card"]');
    
    // Check if vibration was called
    const vibrationCalls = await page.evaluate(() => window.vibrationCalls);
    expect(vibrationCalls.length).toBeGreaterThan(0);
  });

  test('should optimize for thumb navigation', async ({ page }) => {
    // Check bottom navigation is in thumb-friendly zone
    const bottomNav = page.getByTestId('bottom-navigation');
    await expect(bottomNav).toBeVisible();
    
    const navBox = await bottomNav.boundingBox();
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    
    // Bottom nav should be in bottom third of screen (thumb zone)
    expect(navBox!.y).toBeGreaterThan(viewportHeight * 0.66);
    
    // Tab targets should be large enough for thumbs
    const tabs = page.locator('[data-testid="nav-tab"]');
    const tabCount = await tabs.count();
    
    for (let i = 0; i < tabCount; i++) {
      const tab = tabs.nth(i);
      const tabBox = await tab.boundingBox();
      expect(tabBox!.height).toBeGreaterThan(48); // Minimum touch target
      expect(tabBox!.width).toBeGreaterThan(48);
    }
  });

  test('should handle fast tapping without double actions', async ({ page }) => {
    const card = page.getByTestId('active-agents-card');
    
    // Perform rapid taps
    await card.click();
    await card.click();
    await card.click();
    
    // Should only open one modal despite multiple taps
    const modals = page.locator('[data-testid$="-modal"]:visible');
    const modalCount = await modals.count();
    expect(modalCount).toBeLessThanOrEqual(1);
  });

  test('should show loading shimmers on mobile', async ({ page }) => {
    // Intercept API calls to delay them
    await page.route('**/api/v1/analytics/**', async route => {
      await page.waitForTimeout(1000); // Delay response
      route.continue();
    });
    
    // Reload to trigger loading state
    await page.reload();
    
    // Should show mobile loading shimmers
    await expect(page.getByTestId('mobile-loading-shimmer')).toBeVisible();
    await expect(page.locator('[data-testid="shimmer-card"]').first()).toBeVisible();
    
    // Wait for content to load
    await page.waitForTimeout(2000);
    await expect(page.getByTestId('active-agents-card')).toBeVisible();
  });

  test('should handle network errors on mobile', async ({ page }) => {
    // Simulate network failure
    await page.route('**/api/v1/analytics/**', route => {
      route.abort('failed');
    });
    
    await page.reload();
    
    // Should show mobile-friendly error state
    await expect(page.getByText('Connection Error')).toBeVisible();
    await expect(page.getByText('Check your internet connection')).toBeVisible();
    
    // Should have retry button
    const retryButton = page.getByRole('button', { name: /try again/i });
    await expect(retryButton).toBeVisible();
    
    // Button should be touch-friendly
    const retryBox = await retryButton.boundingBox();
    expect(retryBox!.height).toBeGreaterThan(44);
  });

  test('should optimize battery usage in low battery mode', async ({ page }) => {
    // Mock battery API
    await page.addInitScript(() => {
      navigator.getBattery = () => Promise.resolve({
        level: 0.15, // 15% battery
        charging: false,
        dischargingTime: 3600,
        chargingTime: Infinity
      });
    });
    
    await page.reload();
    
    // Should activate battery saving mode
    await expect(page.getByTestId('mobile-analytics-dashboard')).toHaveClass(/battery-saving/);
    
    // Animations should be reduced
    await expect(page.getByTestId('mobile-analytics-dashboard')).toHaveClass(/reduced-motion/);
  });

  test('should handle app visibility changes', async ({ page }) => {
    // Track API calls
    let apiCalls = 0;
    await page.route('**/api/v1/analytics/**', route => {
      apiCalls++;
      route.continue();
    });
    
    // Simulate app going to background
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true, writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    
    await page.waitForTimeout(1000);
    const backgroundCalls = apiCalls;
    
    // Simulate app returning to foreground
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: false, writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    
    await page.waitForTimeout(1000);
    
    // Should have made additional API calls when returning to foreground
    expect(apiCalls).toBeGreaterThan(backgroundCalls);
  });

  test('should support accessibility on mobile', async ({ page }) => {
    // Check basic accessibility features
    await expect(page.getByRole('main')).toBeVisible();
    
    // Check navigation accessibility
    const nav = page.getByRole('navigation');
    await expect(nav).toBeVisible();
    await expect(nav).toHaveAttribute('aria-label');
    
    // Check screen reader announcements
    const liveRegion = page.locator('[aria-live="polite"]');
    await expect(liveRegion).toBeAttached();
    
    // Test keyboard navigation on mobile
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();
    
    // Skip link for screen readers
    const skipLink = page.locator('a:has-text("Skip to main content")');
    if (await skipLink.count() > 0) {
      await expect(skipLink).toHaveAttribute('href', '#main');
    }
  });

  test('should maintain performance on slower devices', async ({ page, browserName }) => {
    // Simulate slower device performance
    const client = await page.context().newCDPSession(page);
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    
    const startTime = Date.now();
    
    // Navigate and measure load time
    await page.goto('/analytics');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within reasonable time even on slow devices
    expect(loadTime).toBeLessThan(10000); // 10 seconds max
    
    // Content should still be functional
    await expect(page.getByTestId('mobile-analytics-dashboard')).toBeVisible();
  });
});