import { test, expect } from '@playwright/test';
import { login, logout, createTestUser, cleanupTestUser } from './utils/auth-helpers';
import { mockApiResponses } from './utils/api-mocks';

test.describe('Authentication Flow', () => {
  const testUser = {
    email: 'e2e-test@example.com',
    password: 'TestPassword123!',
    name: 'E2E Test User',
    role: 'admin'
  };

  test.beforeEach(async ({ page }) => {
    // Mock API responses for consistent testing
    await mockApiResponses(page);

    // Ensure test user exists
    await createTestUser(testUser);
  });

  test.afterEach(async () => {
    // Cleanup test data
    await cleanupTestUser(testUser.email);
  });

  test.describe('Login Process', () => {
    test('should successfully log in with valid credentials', async ({ page }) => {
      await page.goto('/login');

      // Fill login form
      await page.fill('[data-testid=\"email-input\"]', testUser.email);
      await page.fill('[data-testid=\"password-input\"]', testUser.password);

      // Submit form
      await page.click('[data-testid=\"login-button\"]');

      // Wait for redirect to dashboard
      await expect(page).toHaveURL('/dashboard');

      // Verify user is logged in
      await expect(page.locator('[data-testid=\"user-menu\"]')).toBeVisible();
      await expect(page.locator('[data-testid=\"user-name\"]')).toHaveText(testUser.name);
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login');

      // Fill form with invalid credentials
      await page.fill('[data-testid=\"email-input\"]', 'invalid@example.com');
      await page.fill('[data-testid=\"password-input\"]', 'wrongpassword');

      await page.click('[data-testid=\"login-button\"]');

      // Should show error message
      await expect(page.locator('[data-testid=\"error-message\"]')).toBeVisible();
      await expect(page.locator('[data-testid=\"error-message\"]')).toHaveText(/invalid credentials/i);

      // Should remain on login page
      await expect(page).toHaveURL('/login');
    });

    test('should validate required fields', async ({ page }) => {
      await page.goto('/login');

      // Try to submit without filling fields
      await page.click('[data-testid=\"login-button\"]');

      // Should show validation errors
      await expect(page.locator('[data-testid=\"email-error\"]')).toBeVisible();
      await expect(page.locator('[data-testid=\"password-error\"]')).toBeVisible();
    });

    test('should validate email format', async ({ page }) => {
      await page.goto('/login');

      await page.fill('[data-testid=\"email-input\"]', 'invalid-email');
      await page.fill('[data-testid=\"password-input\"]', 'password');

      await page.click('[data-testid=\"login-button\"]');

      await expect(page.locator('[data-testid=\"email-error\"]')).toBeVisible();
      await expect(page.locator('[data-testid=\"email-error\"]')).toHaveText(/valid email/i);
    });

    test('should show loading state during login', async ({ page }) => {
      await page.goto('/login');

      await page.fill('[data-testid=\"email-input\"]', testUser.email);
      await page.fill('[data-testid=\"password-input\"]', testUser.password);

      // Intercept login request to add delay
      await page.route('**/auth/login', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        route.continue();
      });

      await page.click('[data-testid=\"login-button\"]');

      // Should show loading spinner
      await expect(page.locator('[data-testid=\"login-loading\"]')).toBeVisible();

      // Button should be disabled
      await expect(page.locator('[data-testid=\"login-button\"]')).toBeDisabled();
    });

    test('should handle network errors gracefully', async ({ page }) => {
      await page.goto('/login');

      // Mock network failure
      await page.route('**/auth/login', route => route.abort('failed'));

      await page.fill('[data-testid=\"email-input\"]', testUser.email);
      await page.fill('[data-testid=\"password-input\"]', testUser.password);
      await page.click('[data-testid=\"login-button\"]');

      await expect(page.locator('[data-testid=\"error-message\"]')).toBeVisible();
      await expect(page.locator('[data-testid=\"error-message\"]')).toHaveText(/network error/i);
    });

    test('should remember login state after page refresh', async ({ page }) => {
      // Log in first
      await login(page, testUser);

      // Refresh page
      await page.reload();

      // Should still be logged in
      await expect(page).toHaveURL('/dashboard');
      await expect(page.locator('[data-testid=\"user-menu\"]')).toBeVisible();
    });
  });

  test.describe('Logout Process', () => {
    test.beforeEach(async ({ page }) => {
      // Login before each logout test
      await login(page, testUser);
    });

    test('should successfully log out user', async ({ page }) => {
      // Click user menu
      await page.click('[data-testid=\"user-menu\"]');

      // Click logout
      await page.click('[data-testid=\"logout-button\"]');

      // Should redirect to login page
      await expect(page).toHaveURL('/login');

      // Should not have user session
      await expect(page.locator('[data-testid=\"user-menu\"]')).not.toBeVisible();
    });

    test('should clear user data on logout', async ({ page }) => {
      await logout(page);

      // Try to access protected route
      await page.goto('/dashboard');

      // Should redirect to login
      await expect(page).toHaveURL('/login');
    });

    test('should handle logout API errors gracefully', async ({ page }) => {
      // Mock logout API failure
      await page.route('**/auth/logout', route => route.abort('failed'));

      await page.click('[data-testid=\"user-menu\"]');
      await page.click('[data-testid=\"logout-button\"]');

      // Should still log out locally even if API fails
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Session Management', () => {
    test('should redirect to login when token expires', async ({ page }) => {
      await login(page, testUser);

      // Mock token expiration
      await page.route('**/graphql', (route) => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            errors: [{ message: 'Token expired' }]
          })
        });
      });

      // Try to access protected data
      await page.goto('/contractors');

      // Should redirect to login
      await expect(page).toHaveURL('/login');
      await expect(page.locator('[data-testid=\"error-message\"]')).toHaveText(/session expired/i);
    });

    test('should refresh token automatically', async ({ page }) => {
      await login(page, testUser);

      // Mock initial API call with 401, then success after token refresh
      let callCount = 0;
      await page.route('**/graphql', (route) => {
        callCount++;
        if (callCount === 1) {
          // First call - expired token
          route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({
              errors: [{ message: 'Token expired' }]
            })
          });
        } else {
          // After token refresh - success
          route.continue();
        }
      });

      // Mock token refresh success
      await page.route('**/auth/refresh', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            token: 'new-token',
            refreshToken: 'new-refresh-token'
          })
        });
      });

      await page.goto('/dashboard');

      // Should successfully load dashboard after token refresh
      await expect(page.locator('[data-testid=\"dashboard-title\"]')).toBeVisible();
    });

    test('should handle concurrent requests during token refresh', async ({ page }) => {
      await login(page, testUser);

      // Navigate to page that makes multiple API calls
      await page.goto('/dashboard');

      // Should handle multiple expired token responses gracefully
      await expect(page.locator('[data-testid=\"dashboard-title\"]')).toBeVisible();
    });
  });

  test.describe('Password Security', () => {
    test('should hide password input by default', async ({ page }) => {
      await page.goto('/login');

      const passwordInput = page.locator('[data-testid=\"password-input\"]');
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('should toggle password visibility', async ({ page }) => {
      await page.goto('/login');

      const passwordInput = page.locator('[data-testid=\"password-input\"]');
      const toggleButton = page.locator('[data-testid=\"password-toggle\"]');

      // Initially hidden
      await expect(passwordInput).toHaveAttribute('type', 'password');

      // Click toggle to show
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'text');

      // Click again to hide
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('should prevent password from being copied to clipboard', async ({ page }) => {
      await page.goto('/login');

      const passwordInput = page.locator('[data-testid=\"password-input\"]');
      await passwordInput.fill('secret-password');

      // Try to select all and copy
      await passwordInput.selectText();

      // Password input should have copy protection
      await expect(passwordInput).toHaveAttribute('data-copy-protected', 'true');
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('/login');

      // Tab through form elements
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid=\"email-input\"]')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid=\"password-input\"]')).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid=\"login-button\"]')).toBeFocused();
    });

    test('should submit form with Enter key', async ({ page }) => {
      await page.goto('/login');

      await page.fill('[data-testid=\"email-input\"]', testUser.email);
      await page.fill('[data-testid=\"password-input\"]', testUser.password);

      // Press Enter to submit
      await page.keyboard.press('Enter');

      await expect(page).toHaveURL('/dashboard');
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await page.goto('/login');

      await expect(page.locator('[data-testid=\"email-input\"]')).toHaveAttribute('aria-label', /email/i);
      await expect(page.locator('[data-testid=\"password-input\"]')).toHaveAttribute('aria-label', /password/i);
      await expect(page.locator('[data-testid=\"login-button\"]')).toHaveAttribute('aria-label', /sign in/i);
    });

    test('should announce errors to screen readers', async ({ page }) => {
      await page.goto('/login');

      await page.click('[data-testid=\"login-button\"]');

      // Error messages should have proper ARIA attributes
      await expect(page.locator('[data-testid=\"email-error\"]')).toHaveAttribute('role', 'alert');
      await expect(page.locator('[data-testid=\"password-error\"]')).toHaveAttribute('role', 'alert');
    });
  });

  test.describe('Security Features', () => {
    test('should implement rate limiting on login attempts', async ({ page }) => {
      await page.goto('/login');

      // Make multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        await page.fill('[data-testid=\"email-input\"]', 'test@example.com');
        await page.fill('[data-testid=\"password-input\"]', 'wrong-password');
        await page.click('[data-testid=\"login-button\"]');

        if (i < 4) {
          await expect(page.locator('[data-testid=\"error-message\"]')).toHaveText(/invalid credentials/i);
        }
      }

      // Should be rate limited after 5 attempts
      await expect(page.locator('[data-testid=\"error-message\"]')).toHaveText(/too many attempts/i);
      await expect(page.locator('[data-testid=\"login-button\"]')).toBeDisabled();
    });

    test('should not expose sensitive information in error messages', async ({ page }) => {
      await page.goto('/login');

      await page.fill('[data-testid=\"email-input\"]', 'nonexistent@example.com');
      await page.fill('[data-testid=\"password-input\"]', 'password');
      await page.click('[data-testid=\"login-button\"]');

      // Should not indicate whether email exists or not
      const errorMessage = await page.locator('[data-testid=\"error-message\"]').textContent();
      expect(errorMessage).not.toContain('user not found');
      expect(errorMessage).not.toContain('email does not exist');
      expect(errorMessage).toMatch(/invalid credentials/i);
    });

    test('should clear sensitive data on page unload', async ({ page, context }) => {
      await page.goto('/login');
      await page.fill('[data-testid=\"password-input\"]', 'sensitive-password');

      // Navigate away
      await page.goto('/');

      // Go back
      await page.goBack();

      // Password field should be empty
      await expect(page.locator('[data-testid=\"password-input\"]')).toHaveValue('');
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should be usable on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/login');

      // Form should be visible and usable
      await expect(page.locator('[data-testid=\"login-form\"]')).toBeVisible();

      // Buttons should be appropriately sized for touch
      const loginButton = page.locator('[data-testid=\"login-button\"]');
      const buttonBox = await loginButton.boundingBox();
      expect(buttonBox?.height).toBeGreaterThanOrEqual(44); // iOS touch target minimum
    });

    test('should handle virtual keyboard on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/login');

      // Focus on input field
      await page.click('[data-testid=\"email-input\"]');

      // Form should still be accessible when virtual keyboard appears
      await expect(page.locator('[data-testid=\"login-button\"]')).toBeVisible();
    });
  });
});
