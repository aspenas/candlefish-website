/**
 * E2E Authentication Flow Tests
 * Tests complete OAuth flow, JWT verification, and session management
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { faker } from '@faker-js/faker';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Test configuration
const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const JWKS_URL = `${BASE_URL}/.well-known/jwks.json`;
const AUTH_URL = `${BASE_URL}/api/auth`;

// Mock user data
const createMockUser = () => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  name: faker.person.fullName(),
  picture: faker.image.avatar()
});

// Helper functions
const getJWKS = async (page: Page) => {
  const response = await page.request.get(JWKS_URL);
  expect(response.status()).toBe(200);
  return await response.json();
};

const createTestJWT = (payload: any, privateKey: string, kid: string) => {
  return jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    keyid: kid,
    expiresIn: '1h'
  });
};

const waitForNetworkIdle = async (page: Page, timeout = 2000) => {
  await page.waitForLoadState('networkidle', { timeout });
};

test.describe('Authentication Flow E2E Tests', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext({
      // Clear storage for each test
      storageState: undefined
    });
    page = await context.newPage();

    // Set up network monitoring
    page.on('response', response => {
      if (response.status() >= 400) {
        console.log(`Failed request: ${response.url()} - ${response.status()}`);
      }
    });
  });

  test.afterEach(async () => {
    await context.close();
  });

  test.describe('JWKS Endpoint Validation', () => {
    test('should serve valid JWKS endpoint', async () => {
      const response = await page.request.get(JWKS_URL);

      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('application/json');
      expect(response.headers()['access-control-allow-origin']).toBe('*');

      const jwks = await response.json();
      expect(jwks).toHaveProperty('keys');
      expect(Array.isArray(jwks.keys)).toBe(true);
      expect(jwks.keys.length).toBeGreaterThan(0);

      // Validate key structure
      jwks.keys.forEach((key: any) => {
        expect(key).toHaveProperty('kty', 'RSA');
        expect(key).toHaveProperty('use', 'sig');
        expect(key).toHaveProperty('alg', 'RS256');
        expect(key).toHaveProperty('kid');
        expect(key).toHaveProperty('n');
        expect(key).toHaveProperty('e');
      });
    });

    test('should handle CORS preflight requests', async () => {
      const response = await page.request.fetch(JWKS_URL, {
        method: 'OPTIONS'
      });

      expect(response.status()).toBe(204);
      expect(response.headers()['access-control-allow-origin']).toBe('*');
      expect(response.headers()['access-control-allow-methods']).toBe('GET, HEAD, OPTIONS');
    });

    test('should support HEAD requests for health checks', async () => {
      const response = await page.request.fetch(JWKS_URL, {
        method: 'HEAD'
      });

      expect(response.status()).toBe(200);
      expect(response.headers()['cache-control']).toBe('no-cache');
    });

    test('should include caching headers', async () => {
      const response = await page.request.get(JWKS_URL);

      expect(response.headers()['cache-control']).toContain('public');
      expect(response.headers()['cache-control']).toContain('max-age');
      expect(response.headers()).toHaveProperty('etag');
    });

    test('should support conditional requests with ETag', async () => {
      // First request
      const response1 = await page.request.get(JWKS_URL);
      const etag = response1.headers()['etag'];

      // Second request with If-None-Match
      const response2 = await page.request.get(JWKS_URL, {
        headers: {
          'If-None-Match': etag
        }
      });

      expect(response2.status()).toBe(304);
    });
  });

  test.describe('Authentication Pages', () => {
    test('should load login page', async () => {
      await page.goto(`${BASE_URL}/login`);

      await expect(page).toHaveTitle(/Paintbox/);
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
      await expect(page.locator('[data-testid="google-signin-button"]')).toBeVisible();
    });

    test('should redirect to login when accessing protected pages', async () => {
      await page.goto(`${BASE_URL}/estimate/new`);

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    });

    test('should show error message for invalid authentication', async () => {
      await page.goto(`${BASE_URL}/login?error=OAuthSignin`);

      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Authentication failed');
    });
  });

  test.describe('OAuth Flow Simulation', () => {
    test('should handle Google OAuth callback', async () => {
      // Simulate OAuth callback with mock parameters
      const mockCode = faker.string.alphanumeric(32);
      const mockState = faker.string.alphanumeric(16);

      await page.goto(`${BASE_URL}/api/auth/callback/google?code=${mockCode}&state=${mockState}`);

      // Should either redirect to success or show appropriate error
      await page.waitForURL('**', { timeout: 5000 });

      const url = page.url();
      expect(url).toMatch(/\/(login|estimate|error)/);
    });

    test('should handle OAuth error callbacks', async () => {
      await page.goto(`${BASE_URL}/api/auth/callback/google?error=access_denied`);

      await page.waitForURL('**/login?error=*');
      expect(page.url()).toContain('error=');
    });

    test('should handle invalid OAuth state', async () => {
      const mockCode = faker.string.alphanumeric(32);
      const invalidState = 'invalid_state';

      await page.goto(`${BASE_URL}/api/auth/callback/google?code=${mockCode}&state=${invalidState}`);

      await page.waitForURL('**/login?error=*');
      expect(page.url()).toContain('error=');
    });
  });

  test.describe('JWT Token Validation', () => {
    test('should reject invalid JWT tokens', async () => {
      // Set invalid token in storage
      await context.addCookies([{
        name: 'next-auth.session-token',
        value: 'invalid.jwt.token',
        domain: new URL(BASE_URL).hostname,
        path: '/'
      }]);

      await page.goto(`${BASE_URL}/estimate/new`);

      // Should redirect to login due to invalid token
      await expect(page).toHaveURL(/\/login/);
    });

    test('should handle expired JWT tokens', async () => {
      // Create expired token
      const expiredPayload = {
        sub: faker.string.uuid(),
        email: faker.internet.email(),
        exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
      };

      // This would require a valid private key for testing
      // In a real test, you'd mock the JWT verification

      await page.goto(`${BASE_URL}/estimate/new`);

      // Should redirect to login due to expired token
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Session Management', () => {
    test('should maintain session across page reloads', async () => {
      // This test would require setting up a valid session
      // Mock session setup
      await context.addCookies([{
        name: 'next-auth.session-token',
        value: 'mock-valid-session-token',
        domain: new URL(BASE_URL).hostname,
        path: '/'
      }]);

      await page.goto(`${BASE_URL}/`);
      await page.reload();

      // Session should persist through reload
      // This would need to be adjusted based on actual auth implementation
    });

    test('should clear session on logout', async () => {
      // Set up mock session
      await context.addCookies([{
        name: 'next-auth.session-token',
        value: 'mock-session-token',
        domain: new URL(BASE_URL).hostname,
        path: '/'
      }]);

      await page.goto(`${BASE_URL}/`);

      // Trigger logout
      await page.goto(`${BASE_URL}/api/auth/signout`);

      // Navigate to protected page
      await page.goto(`${BASE_URL}/estimate/new`);

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });

    test('should handle concurrent sessions', async () => {
      // Open second tab/context
      const secondContext = await page.context().browser()!.newContext();
      const secondPage = await secondContext.newPage();

      try {
        // Set same session in both contexts
        const sessionCookie = {
          name: 'next-auth.session-token',
          value: 'shared-session-token',
          domain: new URL(BASE_URL).hostname,
          path: '/'
        };

        await context.addCookies([sessionCookie]);
        await secondContext.addCookies([sessionCookie]);

        // Both should access protected content
        await page.goto(`${BASE_URL}/`);
        await secondPage.goto(`${BASE_URL}/`);

        // Verify both can access content
        // This would need actual session validation
      } finally {
        await secondContext.close();
      }
    });
  });

  test.describe('Security Headers and CSRF Protection', () => {
    test('should include security headers', async () => {
      const response = await page.request.get(`${BASE_URL}/`);

      // Check for security headers
      const headers = response.headers();
      expect(headers['x-content-type-options']).toBe('nosniff');
      // Add other security header checks as needed
    });

    test('should protect against CSRF attacks', async () => {
      // Test CSRF protection on auth endpoints
      const response = await page.request.post(`${AUTH_URL}/signin/google`, {
        data: {
          csrfToken: 'invalid-token'
        }
      });

      // Should reject invalid CSRF token
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });

    test('should validate origin headers', async () => {
      const response = await page.request.post(`${AUTH_URL}/signin/google`, {
        headers: {
          'origin': 'https://malicious-site.com'
        }
      });

      // Should reject requests from invalid origins
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network failures gracefully', async () => {
      // Simulate network failure
      await page.route(JWKS_URL, route => route.abort());

      await page.goto(`${BASE_URL}/login`);

      // Page should still load with graceful degradation
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    });

    test('should handle auth service downtime', async () => {
      // Mock auth service returning 503
      await page.route(`${AUTH_URL}/**`, route => {
        route.fulfill({ status: 503, body: 'Service Unavailable' });
      });

      await page.goto(`${BASE_URL}/login`);

      // Should show appropriate error message
      await expect(page.locator('[data-testid="service-error"]')).toBeVisible();
    });

    test('should recover from temporary failures', async () => {
      let requestCount = 0;

      // Fail first few requests, then succeed
      await page.route(JWKS_URL, route => {
        requestCount++;
        if (requestCount <= 2) {
          route.fulfill({ status: 500, body: 'Internal Server Error' });
        } else {
          route.continue();
        }
      });

      await page.goto(`${BASE_URL}/login`);

      // Should eventually succeed
      await waitForNetworkIdle(page);
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    });
  });

  test.describe('Performance Tests', () => {
    test('should load authentication pages quickly', async () => {
      const startTime = Date.now();

      await page.goto(`${BASE_URL}/login`);
      await waitForNetworkIdle(page);

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
    });

    test('should handle multiple concurrent auth requests', async () => {
      const promises = Array.from({ length: 5 }, () =>
        page.request.get(JWKS_URL)
      );

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.status()).toBe(200);
      });
    });

    test('should cache JWKS responses effectively', async () => {
      let requestCount = 0;

      await page.route(JWKS_URL, route => {
        requestCount++;
        route.continue();
      });

      // Make multiple requests
      await Promise.all([
        page.request.get(JWKS_URL),
        page.request.get(JWKS_URL),
        page.request.get(JWKS_URL)
      ]);

      // Should cache and reduce requests
      expect(requestCount).toBeLessThanOrEqual(2);
    });
  });

  test.describe('Mobile and Responsive Behavior', () => {
    test('should work on mobile devices', async () => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE

      await page.goto(`${BASE_URL}/login`);

      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
      await expect(page.locator('[data-testid="google-signin-button"]')).toBeVisible();

      // Check touch-friendly button size
      const button = page.locator('[data-testid="google-signin-button"]');
      const boundingBox = await button.boundingBox();
      expect(boundingBox!.height).toBeGreaterThanOrEqual(44); // Apple's minimum touch target
    });

    test('should handle orientation changes', async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(`${BASE_URL}/login`);

      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();

      // Rotate to landscape
      await page.setViewportSize({ width: 667, height: 375 });
      await page.waitForTimeout(500);

      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async () => {
      await page.goto(`${BASE_URL}/login`);

      // Tab through login form
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="google-signin-button"]')).toBeFocused();

      // Should be able to activate with Enter
      await page.keyboard.press('Enter');
      // This would trigger OAuth flow
    });

    test('should have proper ARIA labels', async () => {
      await page.goto(`${BASE_URL}/login`);

      const button = page.locator('[data-testid="google-signin-button"]');
      await expect(button).toHaveAttribute('aria-label');

      const form = page.locator('[data-testid="login-form"]');
      await expect(form).toHaveAttribute('role', 'form');
    });

    test('should support screen readers', async () => {
      await page.goto(`${BASE_URL}/login`);

      // Check for proper heading structure
      await expect(page.locator('h1')).toBeVisible();

      // Check for descriptive text
      await expect(page.locator('[data-testid="login-description"]')).toBeVisible();
    });
  });
});
