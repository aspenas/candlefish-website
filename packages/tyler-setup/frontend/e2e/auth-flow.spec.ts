import { test, expect, Page } from '@playwright/test';

test.describe('Authentication Flow', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    // Clear any existing authentication state
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should display login form on initial visit', async () => {
    await page.goto('/');

    // Should redirect to login or show login form
    await expect(page.getByRole('heading', { name: /sign in|login/i })).toBeVisible();
    await expect(page.getByLabel(/username|email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in|login/i })).toBeVisible();
  });

  test('should show validation errors for empty credentials', async () => {
    await page.goto('/');

    // Try to submit empty form
    await page.getByRole('button', { name: /sign in|login/i }).click();

    // Should show validation errors
    await expect(page.getByText(/username.*required|email.*required/i)).toBeVisible();
    await expect(page.getByText(/password.*required/i)).toBeVisible();
  });

  test('should show error for invalid credentials', async () => {
    await page.goto('/');

    // Enter invalid credentials
    await page.getByLabel(/username|email/i).fill('invalid@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in|login/i }).click();

    // Should show authentication error
    await expect(page.getByText(/invalid.*credentials|authentication.*failed/i)).toBeVisible({
      timeout: 10000
    });
  });

  test('should successfully authenticate with valid credentials', async () => {
    await page.goto('/');

    // Enter valid test credentials
    await page.getByLabel(/username|email/i).fill('testuser@example.com');
    await page.getByLabel(/password/i).fill('testpassword123');
    await page.getByRole('button', { name: /sign in|login/i }).click();

    // Should navigate to dashboard
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();

    // Should show user info in header/navigation
    await expect(page.getByText(/testuser|welcome/i)).toBeVisible();
  });

  test('should persist authentication across page reloads', async () => {
    // First, authenticate
    await authenticateUser(page);

    // Reload the page
    await page.reload();

    // Should remain authenticated
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('should handle logout functionality', async () => {
    // First, authenticate
    await authenticateUser(page);

    // Find and click logout button
    await page.getByRole('button', { name: /logout|sign out/i }).click();

    // Should redirect to login page
    await expect(page).toHaveURL(/login|\//);
    await expect(page.getByRole('heading', { name: /sign in|login/i })).toBeVisible();

    // Verify authentication state is cleared
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    expect(token).toBeNull();
  });

  test('should handle session expiration gracefully', async () => {
    // Authenticate first
    await authenticateUser(page);

    // Simulate expired token
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'expired.jwt.token');
    });

    // Try to access a protected route
    await page.goto('/aws-secrets');

    // Should redirect to login due to expired token
    await expect(page).toHaveURL(/login/);
    await expect(page.getByText(/session.*expired|please.*sign.*in/i)).toBeVisible();
  });

  test('should redirect to intended destination after login', async () => {
    // Try to access protected route without authentication
    await page.goto('/settings');

    // Should redirect to login
    await expect(page).toHaveURL(/login/);

    // Authenticate
    await page.getByLabel(/username|email/i).fill('testuser@example.com');
    await page.getByLabel(/password/i).fill('testpassword123');
    await page.getByRole('button', { name: /sign in|login/i }).click();

    // Should redirect to originally requested page
    await expect(page).toHaveURL(/settings/);
  });

  test('should handle multiple failed login attempts', async () => {
    await page.goto('/');

    // Attempt multiple failed logins
    for (let i = 0; i < 3; i++) {
      await page.getByLabel(/username|email/i).fill('user@example.com');
      await page.getByLabel(/password/i).fill('wrongpassword');
      await page.getByRole('button', { name: /sign in|login/i }).click();

      await expect(page.getByText(/invalid.*credentials/i)).toBeVisible();
      await page.getByLabel(/username|email/i).clear();
      await page.getByLabel(/password/i).clear();
    }

    // After multiple attempts, should show rate limiting or account lockout warning
    await page.getByLabel(/username|email/i).fill('user@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in|login/i }).click();

    await expect(page.getByText(/too.*many.*attempts|account.*locked|rate.*limit/i)).toBeVisible({
      timeout: 10000
    });
  });

  test('should handle network errors during authentication', async () => {
    await page.goto('/');

    // Intercept and fail the authentication request
    await page.route('**/api/auth/login', route => route.abort('failed'));

    await page.getByLabel(/username|email/i).fill('testuser@example.com');
    await page.getByLabel(/password/i).fill('testpassword123');
    await page.getByRole('button', { name: /sign in|login/i }).click();

    // Should show network error message
    await expect(page.getByText(/network.*error|connection.*failed|try.*again/i)).toBeVisible();
  });

  test('should validate password strength for registration', async () => {
    await page.goto('/register');

    const passwordInput = page.getByLabel(/password/i).first();

    // Test weak passwords
    const weakPasswords = ['123', 'password', 'abc123'];

    for (const weakPassword of weakPasswords) {
      await passwordInput.fill(weakPassword);
      await passwordInput.blur();

      await expect(page.getByText(/password.*weak|password.*requirements/i)).toBeVisible();
    }

    // Test strong password
    await passwordInput.fill('StrongPassword123!');
    await passwordInput.blur();

    await expect(page.getByText(/password.*strong|meets.*requirements/i)).toBeVisible();
  });
});

// Helper function for authentication
async function authenticateUser(page: Page) {
  await page.goto('/');
  await page.getByLabel(/username|email/i).fill('testuser@example.com');
  await page.getByLabel(/password/i).fill('testpassword123');
  await page.getByRole('button', { name: /sign in|login/i }).click();
  await expect(page).toHaveURL(/dashboard/);
}
