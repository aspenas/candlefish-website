import { test, expect, Page } from '@playwright/test';
import { AuthHelper } from '../helpers/AuthHelper';
import { ApiClient } from '../helpers/ApiClient';

test.describe('Authentication and Authorization Security', () => {
  let authHelper: AuthHelper;
  let apiClient: ApiClient;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    apiClient = new ApiClient(page);
  });

  test.describe('JWT Security', () => {
    test('should reject invalid JWT tokens', async ({ page }) => {
      // Set invalid JWT token
      await page.addInitScript(() => {
        localStorage.setItem('auth_token', 'invalid.jwt.token');
      });

      await page.goto('/dashboard');

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
      await expect(page.locator('[data-testid="error-message"]')).toContainText(/invalid token/i);
    });

    test('should reject expired JWT tokens', async ({ page }) => {
      // Create an expired token (simplified - would need proper JWT creation in real test)
      const expiredToken = await authHelper.createExpiredToken();
      
      await page.addInitScript((token) => {
        localStorage.setItem('auth_token', token);
      }, expiredToken);

      await page.goto('/dashboard');

      // Should redirect to login with appropriate error
      await expect(page).toHaveURL(/\/login/);
      await expect(page.locator('[data-testid="token-expired-message"]')).toBeVisible();
    });

    test('should reject tampered JWT tokens', async ({ page }) => {
      // Get a valid token and tamper with it
      const validToken = await authHelper.getValidToken('user@example.com', 'password123');
      const tamperedToken = validToken.slice(0, -5) + 'XXXXX'; // Tamper with signature
      
      await page.addInitScript((token) => {
        localStorage.setItem('auth_token', token);
      }, tamperedToken);

      await page.goto('/dashboard');

      // Should be rejected
      await expect(page).toHaveURL(/\/login/);
    });

    test('should validate JWT signature properly', async ({ page }) => {
      // Test with token signed with wrong key
      const wronglySignedToken = await authHelper.createTokenWithWrongKey('user@example.com');
      
      await page.addInitScript((token) => {
        localStorage.setItem('auth_token', token);
      }, wronglySignedToken);

      const response = await apiClient.makeAuthenticatedRequest('/api/user/profile');
      
      expect(response.status).toBe(401);
      expect(response.data.error).toContain('Invalid signature');
    });

    test('should enforce token refresh before expiration', async ({ page }) => {
      // Set token that expires soon
      const shortLivedToken = await authHelper.createShortLivedToken('user@example.com', 30); // 30 seconds
      
      await page.addInitScript((token) => {
        localStorage.setItem('auth_token', token);
      }, shortLivedToken);

      await page.goto('/dashboard');
      
      // Wait for token to be close to expiration
      await page.waitForTimeout(25000);
      
      // Make an authenticated request - should trigger refresh
      await page.click('[data-testid="profile-button"]');
      
      // Should successfully refresh token
      const newToken = await page.evaluate(() => localStorage.getItem('auth_token'));
      expect(newToken).not.toBe(shortLivedToken);
      expect(newToken).toBeTruthy();
    });
  });

  test.describe('Session Management', () => {
    test('should prevent session fixation attacks', async ({ page }) => {
      // Set a session ID before authentication
      await page.goto('/login');
      const preAuthSessionId = await page.evaluate(() => 
        document.cookie.match(/sessionId=([^;]+)/)?.[1]
      );

      // Login
      await authHelper.login('user@example.com', 'password123');
      
      // Session ID should change after authentication
      const postAuthSessionId = await page.evaluate(() => 
        document.cookie.match(/sessionId=([^;]+)/)?.[1]
      );

      expect(postAuthSessionId).not.toBe(preAuthSessionId);
      expect(postAuthSessionId).toBeTruthy();
    });

    test('should invalidate sessions on logout', async ({ page }) => {
      await authHelper.login('user@example.com', 'password123');
      
      const sessionToken = await page.evaluate(() => localStorage.getItem('auth_token'));
      expect(sessionToken).toBeTruthy();

      // Logout
      await page.click('[data-testid="logout-button"]');
      
      // Token should be removed from client
      const tokenAfterLogout = await page.evaluate(() => localStorage.getItem('auth_token'));
      expect(tokenAfterLogout).toBeNull();

      // Server should reject the old token
      const response = await apiClient.makeRequestWithToken('/api/user/profile', sessionToken);
      expect(response.status).toBe(401);
    });

    test('should handle concurrent login sessions', async ({ browser }) => {
      const page1 = await browser.newPage();
      const page2 = await browser.newPage();
      
      const authHelper1 = new AuthHelper(page1);
      const authHelper2 = new AuthHelper(page2);

      // Login with same user from different sessions
      await authHelper1.login('user@example.com', 'password123');
      await authHelper2.login('user@example.com', 'password123');

      // Both sessions should be valid initially
      await page1.goto('/dashboard');
      await page2.goto('/dashboard');
      
      await expect(page1.locator('[data-testid="dashboard"]')).toBeVisible();
      await expect(page2.locator('[data-testid="dashboard"]')).toBeVisible();

      // Depending on security policy, might invalidate previous session
      // This test would check your specific session handling policy
    });

    test('should enforce session timeout', async ({ page }) => {
      await authHelper.login('user@example.com', 'password123');
      await page.goto('/dashboard');
      
      // Mock long period of inactivity
      await page.evaluate(() => {
        // Modify last activity timestamp to simulate timeout
        const longAgo = Date.now() - (31 * 60 * 1000); // 31 minutes ago
        localStorage.setItem('lastActivity', longAgo.toString());
      });

      // Trigger activity check
      await page.reload();
      
      // Should redirect to login due to timeout
      await expect(page).toHaveURL(/\/login/);
      await expect(page.locator('[data-testid="session-timeout-message"]')).toBeVisible();
    });
  });

  test.describe('Password Security', () => {
    test('should enforce password complexity requirements', async ({ page }) => {
      await page.goto('/register');
      
      const weakPasswords = [
        '123456',
        'password',
        'abc123',
        '11111111',
        'qwerty'
      ];

      for (const password of weakPasswords) {
        await page.fill('[data-testid="email-input"]', 'test@example.com');
        await page.fill('[data-testid="password-input"]', password);
        await page.fill('[data-testid="confirm-password-input"]', password);
        await page.click('[data-testid="register-button"]');
        
        // Should show password strength error
        await expect(page.locator('[data-testid="password-error"]')).toContainText(/password too weak/i);
        
        // Clear form for next test
        await page.fill('[data-testid="password-input"]', '');
      }
    });

    test('should prevent password reuse', async ({ page }) => {
      await authHelper.login('existinguser@example.com', 'OldPassword123!');
      await page.goto('/settings/password');
      
      // Try to change to same password
      await page.fill('[data-testid="current-password"]', 'OldPassword123!');
      await page.fill('[data-testid="new-password"]', 'OldPassword123!');
      await page.fill('[data-testid="confirm-password"]', 'OldPassword123!');
      await page.click('[data-testid="change-password-button"]');
      
      await expect(page.locator('[data-testid="password-error"]')).toContainText(/cannot reuse recent password/i);
    });

    test('should implement secure password reset', async ({ page }) => {
      await page.goto('/forgot-password');
      await page.fill('[data-testid="email-input"]', 'user@example.com');
      await page.click('[data-testid="send-reset-button"]');
      
      // Should not reveal if email exists
      await expect(page.locator('[data-testid="reset-message"]')).toContainText(/if the email exists/i);
      
      // Test with invalid reset token
      await page.goto('/reset-password?token=invalid-token-123');
      await expect(page.locator('[data-testid="invalid-token-error"]')).toBeVisible();
      
      // Test with expired token
      const expiredToken = await authHelper.createExpiredResetToken();
      await page.goto(`/reset-password?token=${expiredToken}`);
      await expect(page.locator('[data-testid="expired-token-error"]')).toBeVisible();
    });

    test('should rate limit password reset attempts', async ({ page }) => {
      await page.goto('/forgot-password');
      
      // Make multiple rapid password reset requests
      for (let i = 0; i < 6; i++) {
        await page.fill('[data-testid="email-input"]', `user${i}@example.com`);
        await page.click('[data-testid="send-reset-button"]');
        await page.waitForTimeout(100);
      }
      
      // Should be rate limited
      await expect(page.locator('[data-testid="rate-limit-error"]')).toContainText(/too many requests/i);
    });
  });

  test.describe('Multi-Factor Authentication', () => {
    test('should enforce 2FA when enabled', async ({ page }) => {
      await authHelper.login('2fa-user@example.com', 'password123');
      
      // Should redirect to 2FA verification
      await expect(page).toHaveURL(/\/verify-2fa/);
      await expect(page.locator('[data-testid="2fa-prompt"]')).toBeVisible();
      
      // Try to access protected resource without 2FA
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/\/verify-2fa/);
    });

    test('should validate TOTP codes correctly', async ({ page }) => {
      await authHelper.login('2fa-user@example.com', 'password123');
      await page.goto('/verify-2fa');
      
      // Invalid TOTP code
      await page.fill('[data-testid="totp-input"]', '123456');
      await page.click('[data-testid="verify-button"]');
      await expect(page.locator('[data-testid="invalid-code-error"]')).toBeVisible();
      
      // Valid TOTP code (would need to generate valid code in real test)
      const validCode = await authHelper.generateValidTOTP('2fa-user@example.com');
      await page.fill('[data-testid="totp-input"]', validCode);
      await page.click('[data-testid="verify-button"]');
      
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test('should handle backup codes properly', async ({ page }) => {
      await authHelper.login('2fa-user@example.com', 'password123');
      await page.goto('/verify-2fa');
      
      // Use backup code
      await page.click('[data-testid="use-backup-code"]');
      
      const backupCode = await authHelper.getValidBackupCode('2fa-user@example.com');
      await page.fill('[data-testid="backup-code-input"]', backupCode);
      await page.click('[data-testid="verify-backup-button"]');
      
      await expect(page).toHaveURL(/\/dashboard/);
      
      // Same backup code should not work twice
      await authHelper.logout();
      await authHelper.login('2fa-user@example.com', 'password123');
      await page.goto('/verify-2fa');
      await page.click('[data-testid="use-backup-code"]');
      await page.fill('[data-testid="backup-code-input"]', backupCode);
      await page.click('[data-testid="verify-backup-button"]');
      
      await expect(page.locator('[data-testid="invalid-backup-error"]')).toBeVisible();
    });

    test('should rate limit 2FA attempts', async ({ page }) => {
      await authHelper.login('2fa-user@example.com', 'password123');
      await page.goto('/verify-2fa');
      
      // Make multiple failed attempts
      for (let i = 0; i < 6; i++) {
        await page.fill('[data-testid="totp-input"]', '000000');
        await page.click('[data-testid="verify-button"]');
        await page.waitForTimeout(100);
      }
      
      // Should be locked out
      await expect(page.locator('[data-testid="2fa-lockout-error"]')).toContainText(/too many failed attempts/i);
    });
  });

  test.describe('Authorization and Permissions', () => {
    test('should enforce role-based access control', async ({ page }) => {
      // Login as regular user
      await authHelper.login('user@example.com', 'password123');
      
      // Try to access admin-only endpoint
      const response = await apiClient.makeAuthenticatedRequest('/api/admin/users');
      expect(response.status).toBe(403);
      expect(response.data.error).toContain('Insufficient permissions');
      
      // Try to access admin UI
      await page.goto('/admin');
      await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();
    });

    test('should validate document permissions', async ({ page }) => {
      await authHelper.login('user@example.com', 'password123');
      
      // Try to access private document of another user
      const response = await apiClient.makeAuthenticatedRequest('/api/documents/private-doc-123');
      expect(response.status).toBe(404); // Should return 404 to avoid information leakage
      
      // Try to edit read-only document
      const editResponse = await apiClient.makeAuthenticatedRequest(
        '/api/documents/readonly-doc-456',
        'PUT',
        { content: 'Modified content' }
      );
      expect(editResponse.status).toBe(403);
    });

    test('should prevent privilege escalation', async ({ page }) => {
      await authHelper.login('user@example.com', 'password123');
      
      // Try to modify user role via API
      const response = await apiClient.makeAuthenticatedRequest(
        '/api/user/profile',
        'PUT',
        { role: 'admin' }
      );
      
      // Should either be forbidden or ignore the role field
      expect(response.status).toBe(403);
      
      // Verify role didn't change
      const profileResponse = await apiClient.makeAuthenticatedRequest('/api/user/profile');
      expect(profileResponse.data.role).not.toBe('admin');
    });

    test('should validate API key permissions', async ({ page }) => {
      const apiKey = await authHelper.getApiKey('user@example.com', ['documents:read']);
      
      // Should work for allowed operations
      const readResponse = await apiClient.makeApiKeyRequest(
        '/api/documents',
        'GET',
        null,
        apiKey
      );
      expect(readResponse.status).toBe(200);
      
      // Should fail for non-allowed operations
      const writeResponse = await apiClient.makeApiKeyRequest(
        '/api/documents',
        'POST',
        { title: 'New Document' },
        apiKey
      );
      expect(writeResponse.status).toBe(403);
    });
  });

  test.describe('Input Validation and Sanitization', () => {
    test('should prevent SQL injection in login', async ({ page }) => {
      await page.goto('/login');
      
      const sqlInjectionPayloads = [
        "admin'; DROP TABLE users; --",
        "' OR '1'='1",
        "admin' /*",
        "admin' UNION SELECT * FROM users --"
      ];
      
      for (const payload of sqlInjectionPayloads) {
        await page.fill('[data-testid="email-input"]', payload);
        await page.fill('[data-testid="password-input"]', 'password');
        await page.click('[data-testid="login-button"]');
        
        // Should show login failed, not SQL error
        await expect(page.locator('[data-testid="login-error"]')).toContainText(/invalid credentials/i);
        
        // Clear form
        await page.fill('[data-testid="email-input"]', '');
        await page.fill('[data-testid="password-input"]', '');
      }
    });

    test('should prevent XSS in user inputs', async ({ page }) => {
      await authHelper.login('user@example.com', 'password123');
      await page.goto('/profile/edit');
      
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src="x" onerror="alert(\'XSS\')">',
        '<svg onload="alert(\'XSS\')">',
        '"><script>alert("XSS")</script>'
      ];
      
      for (const payload of xssPayloads) {
        await page.fill('[data-testid="name-input"]', payload);
        await page.click('[data-testid="save-button"]');
        
        // Wait and check that no alert appeared
        await page.waitForTimeout(1000);
        
        // Verify content is properly escaped
        const nameDisplay = await page.locator('[data-testid="profile-name"]').textContent();
        expect(nameDisplay).not.toContain('<script>');
        expect(nameDisplay).toContain('&lt;script&gt;');
        
        // Clear form
        await page.fill('[data-testid="name-input"]', '');
      }
    });

    test('should validate file uploads securely', async ({ page }) => {
      await authHelper.login('user@example.com', 'password123');
      await page.goto('/documents/new');
      
      // Try to upload executable file
      const maliciousFile = Buffer.from('#!/bin/bash\necho "malicious"');
      await page.setInputFiles('[data-testid="file-upload"]', {
        name: 'malicious.sh',
        mimeType: 'application/x-sh',
        buffer: maliciousFile
      });
      
      await expect(page.locator('[data-testid="upload-error"]')).toContainText(/file type not allowed/i);
      
      // Try to upload file with script in filename
      const scriptNameFile = Buffer.from('safe content');
      await page.setInputFiles('[data-testid="file-upload"]', {
        name: 'safe<script>alert(1)</script>.txt',
        mimeType: 'text/plain',
        buffer: scriptNameFile
      });
      
      await expect(page.locator('[data-testid="upload-error"]')).toContainText(/invalid filename/i);
    });

    test('should prevent path traversal attacks', async ({ page }) => {
      await authHelper.login('user@example.com', 'password123');
      
      const pathTraversalPayloads = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32\\config\\sam',
        '/etc/shadow',
        '....//....//etc//passwd'
      ];
      
      for (const payload of pathTraversalPayloads) {
        const response = await apiClient.makeAuthenticatedRequest(`/api/files/${encodeURIComponent(payload)}`);
        
        // Should return 404 or 400, not expose file system
        expect(response.status).toBeOneOf([400, 404]);
        expect(response.data).not.toContain('root:');
      }
    });
  });

  test.describe('CSRF Protection', () => {
    test('should require CSRF token for state-changing operations', async ({ page }) => {
      await authHelper.login('user@example.com', 'password123');
      
      // Get CSRF token from page
      const csrfToken = await page.evaluate(() => 
        document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
      );
      
      expect(csrfToken).toBeTruthy();
      
      // Make request without CSRF token
      const response = await apiClient.makeRequestWithoutCSRF(
        '/api/user/profile',
        'PUT',
        { name: 'Updated Name' }
      );
      
      expect(response.status).toBe(403);
      expect(response.data.error).toContain('CSRF');
    });

    test('should validate CSRF token correctly', async ({ page }) => {
      await authHelper.login('user@example.com', 'password123');
      
      // Make request with invalid CSRF token
      const response = await apiClient.makeRequestWithCSRF(
        '/api/user/profile',
        'PUT',
        { name: 'Updated Name' },
        'invalid-csrf-token'
      );
      
      expect(response.status).toBe(403);
    });

    test('should refresh CSRF token appropriately', async ({ page }) => {
      await authHelper.login('user@example.com', 'password123');
      await page.goto('/dashboard');
      
      const initialToken = await page.evaluate(() => 
        document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
      );
      
      // Simulate token expiration
      await page.evaluate(() => {
        const meta = document.querySelector('meta[name="csrf-token"]');
        if (meta) meta.setAttribute('content', 'expired-token');
      });
      
      // Make a request that should trigger token refresh
      await page.click('[data-testid="profile-button"]');
      
      const newToken = await page.evaluate(() => 
        document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
      );
      
      expect(newToken).not.toBe(initialToken);
      expect(newToken).not.toBe('expired-token');
    });
  });

  test.describe('Rate Limiting', () => {
    test('should rate limit login attempts', async ({ page }) => {
      await page.goto('/login');
      
      // Make multiple rapid login attempts
      for (let i = 0; i < 6; i++) {
        await page.fill('[data-testid="email-input"]', 'user@example.com');
        await page.fill('[data-testid="password-input"]', 'wrongpassword');
        await page.click('[data-testid="login-button"]');
        await page.waitForTimeout(100);
      }
      
      // Should be rate limited
      await expect(page.locator('[data-testid="rate-limit-error"]')).toContainText(/too many attempts/i);
      
      // Should include lockout duration
      await expect(page.locator('[data-testid="lockout-duration"]')).toContainText(/minutes/i);
    });

    test('should rate limit API requests per user', async ({ page }) => {
      await authHelper.login('user@example.com', 'password123');
      
      // Make rapid API requests
      const requests = [];
      for (let i = 0; i < 50; i++) {
        requests.push(apiClient.makeAuthenticatedRequest('/api/user/profile'));
      }
      
      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      
      // Check rate limit headers
      const rateLimitResponse = rateLimitedResponses[0];
      expect(rateLimitResponse.headers['x-ratelimit-remaining']).toBeDefined();
      expect(rateLimitResponse.headers['retry-after']).toBeDefined();
    });

    test('should apply different rate limits based on user tier', async ({ page }) => {
      // Premium user should have higher rate limits
      await authHelper.login('premium-user@example.com', 'password123');
      
      let premiumRequests = 0;
      while (premiumRequests < 100) {
        const response = await apiClient.makeAuthenticatedRequest('/api/documents');
        if (response.status === 429) break;
        premiumRequests++;
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      // Regular user should have lower rate limits
      await authHelper.login('user@example.com', 'password123');
      
      let regularRequests = 0;
      while (regularRequests < 100) {
        const response = await apiClient.makeAuthenticatedRequest('/api/documents');
        if (response.status === 429) break;
        regularRequests++;
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      expect(premiumRequests).toBeGreaterThan(regularRequests);
    });
  });

  test.describe('Security Headers', () => {
    test('should include security headers in responses', async ({ page }) => {
      const response = await page.goto('/dashboard');
      
      // Check for important security headers
      expect(response?.headers()['strict-transport-security']).toBeTruthy();
      expect(response?.headers()['x-frame-options']).toBe('DENY');
      expect(response?.headers()['x-content-type-options']).toBe('nosniff');
      expect(response?.headers()['x-xss-protection']).toBe('1; mode=block');
      expect(response?.headers()['referrer-policy']).toBeTruthy();
      
      // Content Security Policy should be present and restrictive
      const csp = response?.headers()['content-security-policy'];
      expect(csp).toBeTruthy();
      expect(csp).toContain("default-src 'self'");
    });

    test('should prevent clickjacking attacks', async ({ page }) => {
      // Attempt to load the app in an iframe
      const frameTest = `
        <html>
          <body>
            <iframe src="${page.url()}" width="800" height="600"></iframe>
          </body>
        </html>
      `;
      
      await page.setContent(frameTest);
      
      // Frame should be blocked by X-Frame-Options
      const frame = page.locator('iframe');
      await expect(frame).not.toBeVisible({ timeout: 5000 });
    });
  });
});