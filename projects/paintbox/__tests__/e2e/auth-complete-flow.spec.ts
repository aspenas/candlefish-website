/**
 * End-to-End Authentication Flow Tests
 * Tests complete authentication workflows across all frontends
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { faker } from '@faker-js/faker';

// Test data factories
const createTestUser = () => ({
  email: faker.internet.email(),
  password: faker.internet.password({ length: 12 }),
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  role: faker.helpers.arrayElement(['admin', 'operator', 'partner', 'viewer']),
});

const createPartnerUser = () => ({
  ...createTestUser(),
  role: 'partner',
  companyName: faker.company.name(),
  contactPhone: faker.phone.number(),
});

// Page object models
class LoginPage {
  constructor(private page: Page) {}

  async navigateToLogin() {
    await this.page.goto('/login');
    await expect(this.page.locator('h1')).toContainText('Sign In');
  }

  async fillLoginForm(email: string, password: string) {
    await this.page.fill('[data-testid="email-input"]', email);
    await this.page.fill('[data-testid="password-input"]', password);
  }

  async submitLogin() {
    await this.page.click('[data-testid="login-button"]');
  }

  async loginWithCredentials(email: string, password: string) {
    await this.fillLoginForm(email, password);
    await this.submitLogin();
  }

  async expectLoginError(message: string) {
    await expect(this.page.locator('[data-testid="error-message"]'))
      .toContainText(message);
  }

  async clickForgotPassword() {
    await this.page.click('[data-testid="forgot-password-link"]');
  }

  async clickSignUp() {
    await this.page.click('[data-testid="signup-link"]');
  }

  async expectOAuthButtons() {
    await expect(this.page.locator('[data-testid="google-oauth-button"]')).toBeVisible();
    await expect(this.page.locator('[data-testid="salesforce-oauth-button"]')).toBeVisible();
  }

  async clickGoogleOAuth() {
    await this.page.click('[data-testid="google-oauth-button"]');
  }

  async clickSalesforceOAuth() {
    await this.page.click('[data-testid="salesforce-oauth-button"]');
  }
}

class SignUpPage {
  constructor(private page: Page) {}

  async fillSignUpForm(user: ReturnType<typeof createTestUser>) {
    await this.page.fill('[data-testid="firstname-input"]', user.firstName);
    await this.page.fill('[data-testid="lastname-input"]', user.lastName);
    await this.page.fill('[data-testid="email-input"]', user.email);
    await this.page.fill('[data-testid="password-input"]', user.password);
    await this.page.fill('[data-testid="confirm-password-input"]', user.password);
  }

  async fillPartnerSignUpForm(user: ReturnType<typeof createPartnerUser>) {
    await this.fillSignUpForm(user);
    await this.page.fill('[data-testid="company-name-input"]', user.companyName);
    await this.page.fill('[data-testid="phone-input"]', user.contactPhone);
  }

  async selectRole(role: string) {
    await this.page.selectOption('[data-testid="role-select"]', role);
  }

  async acceptTerms() {
    await this.page.check('[data-testid="terms-checkbox"]');
  }

  async submitSignUp() {
    await this.page.click('[data-testid="signup-button"]');
  }

  async expectValidationError(field: string, message: string) {
    await expect(this.page.locator(`[data-testid="${field}-error"]`))
      .toContainText(message);
  }

  async expectSuccessMessage() {
    await expect(this.page.locator('[data-testid="success-message"]'))
      .toContainText('Account created successfully');
  }
}

class DashboardPage {
  constructor(private page: Page) {}

  async expectWelcomeMessage(userName: string) {
    await expect(this.page.locator('[data-testid="welcome-message"]'))
      .toContainText(`Welcome, ${userName}`);
  }

  async expectUserRole(role: string) {
    await expect(this.page.locator('[data-testid="user-role"]'))
      .toContainText(role);
  }

  async expectNavigationForRole(role: string) {
    switch (role) {
      case 'admin':
        await expect(this.page.locator('[data-testid="admin-panel-link"]')).toBeVisible();
        await expect(this.page.locator('[data-testid="user-management-link"]')).toBeVisible();
        break;
      case 'partner':
        await expect(this.page.locator('[data-testid="partner-portal-link"]')).toBeVisible();
        await expect(this.page.locator('[data-testid="projects-link"]')).toBeVisible();
        break;
      case 'operator':
        await expect(this.page.locator('[data-testid="monitoring-link"]')).toBeVisible();
        await expect(this.page.locator('[data-testid="alerts-link"]')).toBeVisible();
        break;
      case 'viewer':
        await expect(this.page.locator('[data-testid="dashboard-link"]')).toBeVisible();
        break;
    }
  }

  async logout() {
    await this.page.click('[data-testid="user-menu-button"]');
    await this.page.click('[data-testid="logout-button"]');
  }
}

class PartnerPortalPage {
  constructor(private page: Page) {}

  async navigateToPortal() {
    await this.page.goto('/partners');
  }

  async expectPartnerDashboard() {
    await expect(this.page.locator('h1')).toContainText('Partner Portal');
  }

  async expectProjectsSection() {
    await expect(this.page.locator('[data-testid="projects-section"]')).toBeVisible();
  }

  async expectRoleSpecificFeatures(role: string) {
    if (role === 'tyler') {
      await expect(this.page.locator('[data-testid="admin-controls"]')).toBeVisible();
      await expect(this.page.locator('[data-testid="system-settings"]')).toBeVisible();
    } else if (role === 'aaron') {
      await expect(this.page.locator('[data-testid="project-management"]')).toBeVisible();
      await expect(this.page.locator('[data-testid="estimator-tools"]')).toBeVisible();
    }
  }
}

class ApiPlaygroundPage {
  constructor(private page: Page) {}

  async navigateToPlayground() {
    await this.page.goto('/api');
  }

  async expectGraphQLPlayground() {
    await expect(this.page.locator('.graphiql-container')).toBeVisible();
  }

  async executeQuery(query: string) {
    await this.page.fill('.query-editor .CodeMirror textarea', query);
    await this.page.click('[data-testid="execute-query-button"]');
  }

  async expectQueryResult(expectedData: any) {
    const resultText = await this.page.textContent('.result-window');
    expect(JSON.parse(resultText || '{}')).toMatchObject(expectedData);
  }

  async expectAuthenticationRequired() {
    await expect(this.page.locator('.error-message'))
      .toContainText('Authentication required');
  }
}

// Test suites
test.describe('Authentication Flows', () => {
  let loginPage: LoginPage;
  let signUpPage: SignUpPage;
  let dashboardPage: DashboardPage;
  let partnerPortalPage: PartnerPortalPage;
  let apiPlaygroundPage: ApiPlaygroundPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    signUpPage = new SignUpPage(page);
    dashboardPage = new DashboardPage(page);
    partnerPortalPage = new PartnerPortalPage(page);
    apiPlaygroundPage = new ApiPlaygroundPage(page);
  });

  test.describe('Login Flow', () => {
    test('should login successfully with valid credentials', async ({ page }) => {
      await loginPage.navigateToLogin();

      // Use test credentials
      await loginPage.loginWithCredentials('admin@candlefish.ai', 'admin123');

      // Should redirect to dashboard
      await expect(page).toHaveURL('/dashboard');
      await dashboardPage.expectWelcomeMessage('Admin User');
      await dashboardPage.expectUserRole('admin');
      await dashboardPage.expectNavigationForRole('admin');
    });

    test('should show error with invalid credentials', async ({ page }) => {
      await loginPage.navigateToLogin();

      await loginPage.loginWithCredentials('invalid@example.com', 'wrongpassword');

      await loginPage.expectLoginError('Invalid email or password');
      await expect(page).toHaveURL('/login');
    });

    test('should handle account lockout after multiple failed attempts', async ({ page }) => {
      await loginPage.navigateToLogin();

      // Attempt 5 failed logins
      for (let i = 0; i < 5; i++) {
        await loginPage.loginWithCredentials('test@example.com', 'wrongpassword');
        await page.waitForTimeout(1000); // Wait between attempts
      }

      await loginPage.expectLoginError('Account temporarily locked due to multiple failed attempts');
    });

    test('should redirect to intended page after login', async ({ page }) => {
      // Try to access protected page without authentication
      await page.goto('/dashboard/admin');

      // Should redirect to login with return URL
      await expect(page).toHaveURL(/\/login\?returnUrl=/);

      // Login and should redirect back to intended page
      await loginPage.loginWithCredentials('admin@candlefish.ai', 'admin123');
      await expect(page).toHaveURL('/dashboard/admin');
    });

    test('should handle session expiration gracefully', async ({ page, context }) => {
      // Login first
      await loginPage.navigateToLogin();
      await loginPage.loginWithCredentials('admin@candlefish.ai', 'admin123');
      await expect(page).toHaveURL('/dashboard');

      // Simulate session expiration by clearing auth tokens
      await context.clearCookies();
      await page.evaluate(() => localStorage.clear());

      // Try to navigate to protected page
      await page.goto('/dashboard/settings');

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
      await expect(page.locator('[data-testid="session-expired-message"]'))
        .toContainText('Your session has expired');
    });
  });

  test.describe('OAuth Authentication', () => {
    test('should display OAuth login options', async ({ page }) => {
      await loginPage.navigateToLogin();
      await loginPage.expectOAuthButtons();
    });

    test('should handle Google OAuth flow', async ({ page, context }) => {
      await loginPage.navigateToLogin();

      // Mock OAuth popup
      const popup = await context.waitForEvent('page', {
        predicate: page => page.url().includes('accounts.google.com')
      });

      await loginPage.clickGoogleOAuth();

      // Simulate successful OAuth
      await popup.goto('/oauth/callback?code=mock_auth_code&state=mock_state');

      // Should redirect to dashboard
      await expect(page).toHaveURL('/dashboard');
    });

    test('should handle Salesforce OAuth flow', async ({ page, context }) => {
      await loginPage.navigateToLogin();

      const popup = await context.waitForEvent('page', {
        predicate: page => page.url().includes('login.salesforce.com')
      });

      await loginPage.clickSalesforceOAuth();

      // Simulate successful Salesforce OAuth
      await popup.goto('/oauth/salesforce/callback?code=mock_sf_code');

      await expect(page).toHaveURL('/dashboard');
    });

    test('should handle OAuth errors gracefully', async ({ page, context }) => {
      await loginPage.navigateToLogin();

      const popup = await context.waitForEvent('page');
      await loginPage.clickGoogleOAuth();

      // Simulate OAuth error
      await popup.goto('/oauth/callback?error=access_denied');

      await expect(page.locator('[data-testid="oauth-error"]'))
        .toContainText('Authentication was cancelled');
    });
  });

  test.describe('User Registration', () => {
    test('should register new user successfully', async ({ page }) => {
      const newUser = createTestUser();

      await page.goto('/signup');

      await signUpPage.fillSignUpForm(newUser);
      await signUpPage.selectRole(newUser.role);
      await signUpPage.acceptTerms();
      await signUpPage.submitSignUp();

      await signUpPage.expectSuccessMessage();

      // Should receive verification email notification
      await expect(page.locator('[data-testid="verification-notice"]'))
        .toContainText('Please check your email to verify your account');
    });

    test('should register partner user with additional fields', async ({ page }) => {
      const partnerUser = createPartnerUser();

      await page.goto('/signup?type=partner');

      await signUpPage.fillPartnerSignUpForm(partnerUser);
      await signUpPage.selectRole('partner');
      await signUpPage.acceptTerms();
      await signUpPage.submitSignUp();

      await signUpPage.expectSuccessMessage();
    });

    test('should validate form fields', async ({ page }) => {
      await page.goto('/signup');

      // Submit empty form
      await signUpPage.submitSignUp();

      // Should show validation errors
      await signUpPage.expectValidationError('firstname', 'First name is required');
      await signUpPage.expectValidationError('email', 'Email is required');
      await signUpPage.expectValidationError('password', 'Password is required');
    });

    test('should validate password strength', async ({ page }) => {
      const user = createTestUser();
      user.password = '123'; // Weak password

      await page.goto('/signup');
      await signUpPage.fillSignUpForm(user);

      await signUpPage.expectValidationError(
        'password',
        'Password must be at least 8 characters with uppercase, lowercase, and numbers'
      );
    });

    test('should prevent duplicate email registration', async ({ page }) => {
      const existingUser = createTestUser();
      existingUser.email = 'admin@candlefish.ai'; // Existing email

      await page.goto('/signup');
      await signUpPage.fillSignUpForm(existingUser);
      await signUpPage.selectRole(existingUser.role);
      await signUpPage.acceptTerms();
      await signUpPage.submitSignUp();

      await signUpPage.expectValidationError(
        'email',
        'An account with this email already exists'
      );
    });
  });

  test.describe('Role-Based Access Control', () => {
    test('admin role should have full system access', async ({ page }) => {
      await loginPage.navigateToLogin();
      await loginPage.loginWithCredentials('admin@candlefish.ai', 'admin123');

      await dashboardPage.expectNavigationForRole('admin');

      // Should access admin-only pages
      await page.goto('/admin/users');
      await expect(page.locator('h1')).toContainText('User Management');

      await page.goto('/admin/system');
      await expect(page.locator('h1')).toContainText('System Settings');
    });

    test('partner role should access partner portal', async ({ page }) => {
      await loginPage.navigateToLogin();
      await loginPage.loginWithCredentials('partner@candlefish.ai', 'partner123');

      await dashboardPage.expectNavigationForRole('partner');

      await partnerPortalPage.navigateToPortal();
      await partnerPortalPage.expectPartnerDashboard();
      await partnerPortalPage.expectProjectsSection();
    });

    test('tyler role should have admin controls in partner portal', async ({ page }) => {
      await loginPage.navigateToLogin();
      await loginPage.loginWithCredentials('tyler@candlefish.ai', 'tyler123');

      await partnerPortalPage.navigateToPortal();
      await partnerPortalPage.expectRoleSpecificFeatures('tyler');
    });

    test('aaron role should have project management features', async ({ page }) => {
      await loginPage.navigateToLogin();
      await loginPage.loginWithCredentials('aaron@candlefish.ai', 'aaron123');

      await partnerPortalPage.navigateToPortal();
      await partnerPortalPage.expectRoleSpecificFeatures('aaron');
    });

    test('viewer role should have read-only access', async ({ page }) => {
      await loginPage.navigateToLogin();
      await loginPage.loginWithCredentials('viewer@candlefish.ai', 'viewer123');

      await dashboardPage.expectNavigationForRole('viewer');

      // Should not access admin pages
      await page.goto('/admin/users');
      await expect(page.locator('[data-testid="access-denied"]'))
        .toContainText('Access denied');
    });

    test('should enforce API access control', async ({ page }) => {
      await apiPlaygroundPage.navigateToPlayground();

      // Without authentication
      await apiPlaygroundPage.executeQuery(`
        query {
          services {
            id
            name
          }
        }
      `);

      await apiPlaygroundPage.expectAuthenticationRequired();

      // Login and try again
      await loginPage.navigateToLogin();
      await loginPage.loginWithCredentials('admin@candlefish.ai', 'admin123');

      await apiPlaygroundPage.navigateToPlayground();
      await apiPlaygroundPage.executeQuery(`
        query {
          services {
            id
            name
          }
        }
      `);

      await apiPlaygroundPage.expectQueryResult({
        data: {
          services: expect.any(Array)
        }
      });
    });
  });

  test.describe('Multi-Frontend Authentication', () => {
    test('should maintain session across all frontends', async ({ page, context }) => {
      // Login on main app
      await loginPage.navigateToLogin();
      await loginPage.loginWithCredentials('admin@candlefish.ai', 'admin123');

      // Check session on docs site
      await page.goto('https://docs.candlefish.ai');
      await expect(page.locator('[data-testid="user-info"]')).toBeVisible();

      // Check session on API playground
      await page.goto('https://api.candlefish.ai');
      await expect(page.locator('[data-testid="authenticated-user"]')).toBeVisible();

      // Check session on partner portal
      await page.goto('https://partners.candlefish.ai');
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });

    test('should handle cross-domain logout', async ({ page, context }) => {
      // Login on main app
      await loginPage.navigateToLogin();
      await loginPage.loginWithCredentials('admin@candlefish.ai', 'admin123');

      // Logout from partner portal
      await page.goto('https://partners.candlefish.ai');
      await dashboardPage.logout();

      // Should be logged out from all domains
      await page.goto('/');
      await expect(page).toHaveURL(/\/login/);

      await page.goto('https://docs.candlefish.ai');
      await expect(page.locator('[data-testid="login-required"]')).toBeVisible();
    });
  });

  test.describe('Security Features', () => {
    test('should implement CSRF protection', async ({ page }) => {
      // Attempt to make a POST request without CSRF token
      const response = await page.evaluate(() => {
        return fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'admin@candlefish.ai',
            password: 'admin123'
          })
        });
      });

      expect(response.status).toBe(403); // CSRF token missing
    });

    test('should implement secure headers', async ({ page }) => {
      const response = await page.goto('/');
      const headers = response?.headers();

      expect(headers?.['x-frame-options']).toBe('DENY');
      expect(headers?.['x-content-type-options']).toBe('nosniff');
      expect(headers?.['x-xss-protection']).toBe('1; mode=block');
      expect(headers?.['strict-transport-security']).toBeDefined();
    });

    test('should handle brute force protection', async ({ page }) => {
      await loginPage.navigateToLogin();

      // Attempt multiple rapid logins
      for (let i = 0; i < 10; i++) {
        await loginPage.loginWithCredentials('test@example.com', 'wrongpassword');
        await page.waitForTimeout(100);
      }

      await expect(page.locator('[data-testid="rate-limit-error"]'))
        .toContainText('Too many login attempts');
    });

    test('should validate JWT tokens properly', async ({ page, context }) => {
      // Login to get valid token
      await loginPage.navigateToLogin();
      await loginPage.loginWithCredentials('admin@candlefish.ai', 'admin123');

      // Tamper with JWT token
      await context.addCookies([{
        name: 'auth-token',
        value: 'invalid.jwt.token',
        domain: 'localhost',
        path: '/'
      }]);

      // Try to access protected resource
      await page.goto('/dashboard');

      // Should redirect to login due to invalid token
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Password Management', () => {
    test('should handle forgot password flow', async ({ page }) => {
      await loginPage.navigateToLogin();
      await loginPage.clickForgotPassword();

      await expect(page).toHaveURL('/forgot-password');

      await page.fill('[data-testid="email-input"]', 'user@example.com');
      await page.click('[data-testid="reset-password-button"]');

      await expect(page.locator('[data-testid="reset-email-sent"]'))
        .toContainText('Password reset email sent');
    });

    test('should handle password reset with valid token', async ({ page }) => {
      // Simulate clicking password reset link from email
      await page.goto('/reset-password?token=valid-reset-token');

      const newPassword = faker.internet.password({ length: 12 });
      await page.fill('[data-testid="new-password-input"]', newPassword);
      await page.fill('[data-testid="confirm-password-input"]', newPassword);
      await page.click('[data-testid="update-password-button"]');

      await expect(page.locator('[data-testid="password-updated"]'))
        .toContainText('Password updated successfully');

      // Should be able to login with new password
      await expect(page).toHaveURL('/login');
      await loginPage.loginWithCredentials('user@example.com', newPassword);
      await expect(page).toHaveURL('/dashboard');
    });

    test('should reject invalid password reset tokens', async ({ page }) => {
      await page.goto('/reset-password?token=invalid-token');

      await expect(page.locator('[data-testid="invalid-token"]'))
        .toContainText('Invalid or expired reset token');
    });

    test('should enforce password complexity on reset', async ({ page }) => {
      await page.goto('/reset-password?token=valid-reset-token');

      // Try weak password
      await page.fill('[data-testid="new-password-input"]', '123');
      await page.fill('[data-testid="confirm-password-input"]', '123');
      await page.click('[data-testid="update-password-button"]');

      await expect(page.locator('[data-testid="password-error"]'))
        .toContainText('Password does not meet complexity requirements');
    });
  });

  test.describe('Account Management', () => {
    test('should allow profile updates', async ({ page }) => {
      await loginPage.navigateToLogin();
      await loginPage.loginWithCredentials('user@candlefish.ai', 'user123');

      await page.goto('/profile');

      await page.fill('[data-testid="firstname-input"]', 'Updated Name');
      await page.fill('[data-testid="phone-input"]', '+1-555-123-4567');
      await page.click('[data-testid="save-profile-button"]');

      await expect(page.locator('[data-testid="profile-updated"]'))
        .toContainText('Profile updated successfully');
    });

    test('should handle email verification', async ({ page }) => {
      // Simulate clicking verification link from email
      await page.goto('/verify-email?token=valid-verification-token');

      await expect(page.locator('[data-testid="email-verified"]'))
        .toContainText('Email verified successfully');

      // Should redirect to dashboard
      await expect(page).toHaveURL('/dashboard');
    });

    test('should allow account deletion', async ({ page }) => {
      await loginPage.navigateToLogin();
      await loginPage.loginWithCredentials('user@candlefish.ai', 'user123');

      await page.goto('/profile/delete-account');

      // Should require password confirmation
      await page.fill('[data-testid="confirm-password-input"]', 'user123');
      await page.check('[data-testid="understand-deletion-checkbox"]');
      await page.click('[data-testid="delete-account-button"]');

      await expect(page.locator('[data-testid="account-deleted"]'))
        .toContainText('Account deleted successfully');

      // Should redirect to homepage
      await expect(page).toHaveURL('/');
    });
  });
});
