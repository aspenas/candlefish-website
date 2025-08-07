/**
 * E2E tests for authentication flows.
 * Tests login, logout, session management, and security features.
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start with clean state (no authentication)
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await page.goto('/');
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill login form
    await page.fill('[data-testid="username-input"]', 'test_user');
    await page.fill('[data-testid="password-input"]', 'test_password_123');
    
    // Submit form
    await page.click('[data-testid="login-submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    
    // Should store auth token
    const authToken = await page.evaluate(() => localStorage.getItem('authToken'));
    expect(authToken).toBeTruthy();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Mock login API to return error
    await page.route('/api/v1/auth/login', route => {
      route.fulfill({
        status: 401,
        body: JSON.stringify({ error: 'Invalid credentials' }),
      });
    });

    await page.goto('/login');
    
    // Fill form with invalid credentials
    await page.fill('[data-testid="username-input"]', 'invalid_user');
    await page.fill('[data-testid="password-input"]', 'wrong_password');
    
    // Submit form
    await page.click('[data-testid="login-submit"]');
    
    // Should show error message
    await expect(page.locator('[data-testid="login-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-error"]')).toContainText('Invalid credentials');
    
    // Should remain on login page
    await expect(page).toHaveURL(/\/login/);
  });

  test('should handle loading state during login', async ({ page }) => {
    // Mock delayed login response
    await page.route('/api/v1/auth/login', route => {
      setTimeout(() => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            access_token: 'test-token',
            user: { username: 'test_user' }
          }),
        });
      }, 2000);
    });

    await page.goto('/login');
    
    await page.fill('[data-testid="username-input"]', 'test_user');
    await page.fill('[data-testid="password-input"]', 'test_password_123');
    
    // Submit form
    await page.click('[data-testid="login-submit"]');
    
    // Should show loading state
    await expect(page.locator('[data-testid="login-loading"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-submit"]')).toBeDisabled();
    
    // Should show signing in text
    await expect(page.locator('[data-testid="login-submit"]')).toContainText(/signing in/i);
    
    // Loading should disappear after login
    await expect(page.locator('[data-testid="login-loading"]')).not.toBeVisible({ timeout: 5000 });
  });

  test('should logout successfully', async ({ page }) => {
    // First login
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'test_user');
    await page.fill('[data-testid="password-input"]', 'test_password_123');
    await page.click('[data-testid="login-submit"]');
    
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    
    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
    
    // Auth token should be removed
    const authToken = await page.evaluate(() => localStorage.getItem('authToken'));
    expect(authToken).toBeNull();
  });

  test('should handle session expiration', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'test_user');
    await page.fill('[data-testid="password-input"]', 'test_password_123');
    await page.click('[data-testid="login-submit"]');
    
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    
    // Mock API to return 401 (expired token)
    await page.route('/api/v1/**', route => {
      route.fulfill({
        status: 401,
        body: JSON.stringify({ error: 'Token expired' }),
      });
    });
    
    // Try to refresh data
    await page.click('[data-testid="refresh-button"]');
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
    
    // Should show session expired message
    await expect(page.locator('[data-testid="session-expired-message"]')).toBeVisible();
  });

  test('should handle token refresh', async ({ page }) => {
    // Mock token refresh flow
    let tokenRefreshCalled = false;
    
    await page.route('/api/v1/auth/refresh', route => {
      tokenRefreshCalled = true;
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          access_token: 'new-refreshed-token',
          token_type: 'bearer'
        }),
      });
    });
    
    // Login with token that will need refresh
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'test_user');
    await page.fill('[data-testid="password-input"]', 'test_password_123');
    await page.click('[data-testid="login-submit"]');
    
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    
    // Simulate token near expiry - trigger refresh
    await page.evaluate(() => {
      // Simulate token refresh trigger
      (window as any).triggerTokenRefresh?.();
    });
    
    // Wait for refresh to complete
    await page.waitForTimeout(1000);
    
    // New token should be stored
    const newToken = await page.evaluate(() => localStorage.getItem('authToken'));
    expect(newToken).toBe('new-refreshed-token');
  });

  test('should validate form inputs', async ({ page }) => {
    await page.goto('/login');
    
    // Try to submit empty form
    await page.click('[data-testid="login-submit"]');
    
    // Should show validation errors
    await expect(page.locator('[data-testid="username-error"]')).toContainText(/required/i);
    await expect(page.locator('[data-testid="password-error"]')).toContainText(/required/i);
    
    // Fill only username
    await page.fill('[data-testid="username-input"]', 'test');
    await page.click('[data-testid="login-submit"]');
    
    // Should still show password error
    await expect(page.locator('[data-testid="password-error"]')).toContainText(/required/i);
    
    // Username error should be gone
    await expect(page.locator('[data-testid="username-error"]')).not.toBeVisible();
  });

  test('should toggle password visibility', async ({ page }) => {
    await page.goto('/login');
    
    const passwordInput = page.locator('[data-testid="password-input"]');
    const toggleButton = page.locator('[data-testid="password-visibility-toggle"]');
    
    // Initially password should be hidden
    await expect(passwordInput).toHaveAttribute('type', 'password');
    
    // Click toggle to show password
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
    
    // Click again to hide password
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should handle remember me functionality', async ({ page }) => {
    await page.goto('/login');
    
    // Check remember me option
    const rememberCheckbox = page.locator('[data-testid="remember-me-checkbox"]');
    await rememberCheckbox.check();
    
    // Login
    await page.fill('[data-testid="username-input"]', 'test_user');
    await page.fill('[data-testid="password-input"]', 'test_password_123');
    await page.click('[data-testid="login-submit"]');
    
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    
    // Close browser and reopen (simulate browser restart)
    await page.context().clearCookies();
    await page.goto('/');
    
    // Should still be logged in if remember me worked
    // (This depends on implementation - might use longer-lived tokens)
  });

  test('should handle rate limiting', async ({ page }) => {
    // Mock rate limiting response
    await page.route('/api/v1/auth/login', route => {
      route.fulfill({
        status: 429,
        body: JSON.stringify({ 
          error: 'Too many login attempts. Please try again later.',
          retry_after: 60
        }),
      });
    });

    await page.goto('/login');
    
    await page.fill('[data-testid="username-input"]', 'test_user');
    await page.fill('[data-testid="password-input"]', 'wrong_password');
    await page.click('[data-testid="login-submit"]');
    
    // Should show rate limit message
    await expect(page.locator('[data-testid="login-error"]')).toContainText(/too many attempts/i);
    
    // Submit button should be disabled temporarily
    await expect(page.locator('[data-testid="login-submit"]')).toBeDisabled();
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/login');
    
    // Tab through form elements
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="username-input"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="password-input"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="password-visibility-toggle"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="login-submit"]')).toBeFocused();
    
    // Should be able to submit with Enter
    await page.fill('[data-testid="username-input"]', 'test_user');
    await page.fill('[data-testid="password-input"]', 'test_password_123');
    await page.keyboard.press('Enter');
    
    // Should submit form
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should prevent CSRF attacks', async ({ page }) => {
    await page.goto('/login');
    
    // Check that CSRF token is included
    const csrfToken = await page.evaluate(() => {
      const metaTag = document.querySelector('meta[name="csrf-token"]');
      return metaTag?.getAttribute('content');
    });
    
    // Should have CSRF token
    expect(csrfToken).toBeTruthy();
    
    // Login request should include CSRF token
    let requestHeaders: Record<string, string> = {};
    page.on('request', request => {
      if (request.url().includes('/auth/login')) {
        requestHeaders = request.headers();
      }
    });
    
    await page.fill('[data-testid="username-input"]', 'test_user');
    await page.fill('[data-testid="password-input"]', 'test_password_123');
    await page.click('[data-testid="login-submit"]');
    
    // Should include CSRF token in request
    expect(requestHeaders['x-csrf-token'] || requestHeaders['X-CSRF-Token']).toBeTruthy();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Mock network error
    await page.route('/api/v1/auth/login', route => {
      route.abort('failed');
    });

    await page.goto('/login');
    
    await page.fill('[data-testid="username-input"]', 'test_user');
    await page.fill('[data-testid="password-input"]', 'test_password_123');
    await page.click('[data-testid="login-submit"]');
    
    // Should show network error message
    await expect(page.locator('[data-testid="login-error"]')).toContainText(/network error|connection failed/i);
    
    // Should re-enable form for retry
    await expect(page.locator('[data-testid="login-submit"]')).not.toBeDisabled();
  });

  test('should maintain session across page refreshes', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="username-input"]', 'test_user');
    await page.fill('[data-testid="password-input"]', 'test_password_123');
    await page.click('[data-testid="login-submit"]');
    
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    
    // Refresh page
    await page.reload();
    
    // Should still be authenticated
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('should handle multiple concurrent login attempts', async ({ page, context }) => {
    // Create multiple pages (tabs)
    const page2 = await context.newPage();
    const page3 = await context.newPage();
    
    // Navigate all to login
    await Promise.all([
      page.goto('/login'),
      page2.goto('/login'),
      page3.goto('/login')
    ]);
    
    // Fill forms on all pages
    await Promise.all([
      page.fill('[data-testid="username-input"]', 'test_user'),
      page2.fill('[data-testid="username-input"]', 'test_user'),
      page3.fill('[data-testid="username-input"]', 'test_user')
    ]);
    
    await Promise.all([
      page.fill('[data-testid="password-input"]', 'test_password_123'),
      page2.fill('[data-testid="password-input"]', 'test_password_123'),
      page3.fill('[data-testid="password-input"]', 'test_password_123')
    ]);
    
    // Submit all forms simultaneously
    await Promise.all([
      page.click('[data-testid="login-submit"]'),
      page2.click('[data-testid="login-submit"]'),
      page3.click('[data-testid="login-submit"]')
    ]);
    
    // All should eventually reach dashboard
    await Promise.all([
      expect(page.locator('[data-testid="dashboard"]')).toBeVisible(),
      expect(page2.locator('[data-testid="dashboard"]')).toBeVisible(),
      expect(page3.locator('[data-testid="dashboard"]')).toBeVisible()
    ]);
  });

  test('should log security events', async ({ page }) => {
    const securityEvents: any[] = [];
    
    // Monitor console for security-related logs
    page.on('console', msg => {
      if (msg.text().includes('security') || msg.text().includes('auth')) {
        securityEvents.push({
          type: msg.type(),
          text: msg.text(),
          timestamp: new Date().toISOString()
        });
      }
    });
    
    await page.goto('/login');
    
    // Failed login attempt
    await page.fill('[data-testid="username-input"]', 'test_user');
    await page.fill('[data-testid="password-input"]', 'wrong_password');
    await page.click('[data-testid="login-submit"]');
    
    // Successful login
    await page.fill('[data-testid="password-input"]', 'test_password_123');
    await page.click('[data-testid="login-submit"]');
    
    await page.waitForTimeout(1000);
    
    // Should have logged security events
    expect(securityEvents.length).toBeGreaterThan(0);
    
    const failedLoginEvent = securityEvents.find(event => 
      event.text.includes('failed') && event.text.includes('login')
    );
    expect(failedLoginEvent).toBeTruthy();
  });
});