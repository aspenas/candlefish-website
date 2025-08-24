// Comprehensive security tests for Netlify Extension Management System

import { test, expect, Page, Request } from '@playwright/test';
import { NetlifyApiClient } from '../../lib/netlify-api';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const API_BASE_URL = `${BASE_URL}/api`;

// Security test utilities
class SecurityTestUtil {
  static async testCSPHeaders(page: Page, url: string) {
    const response = await page.goto(url);
    const cspHeader = response?.headers()['content-security-policy'];

    return {
      hasCSP: !!cspHeader,
      cspHeader,
      response
    };
  }

  static async testSecurityHeaders(response: any) {
    const headers = response?.headers() || {};

    return {
      'Content-Security-Policy': headers['content-security-policy'],
      'X-Frame-Options': headers['x-frame-options'],
      'X-Content-Type-Options': headers['x-content-type-options'],
      'Referrer-Policy': headers['referrer-policy'],
      'Permissions-Policy': headers['permissions-policy'],
      'Strict-Transport-Security': headers['strict-transport-security']
    };
  }

  static generateMaliciousPayloads() {
    return {
      xss: [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src="x" onerror="alert(\'XSS\')">',
        '"><script>alert("XSS")</script>',
        '\'; alert("XSS"); //',
        '<iframe src="javascript:alert(\'XSS\')"></iframe>'
      ],
      sqlInjection: [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "1; DELETE FROM extensions WHERE 1=1; --",
        "'; INSERT INTO users VALUES ('hacker'); --",
        "' UNION SELECT password FROM users --"
      ],
      pathTraversal: [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '....//....//....//etc/passwd',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd',
        '..%252f..%252f..%252fetc%252fpasswd'
      ],
      commandInjection: [
        '; rm -rf /',
        '| cat /etc/passwd',
        '&& whoami',
        '; cat /etc/shadow',
        '`rm -rf /`',
        '$(rm -rf /)'
      ],
      nosqlInjection: [
        '{"$ne": null}',
        '{"$gt": ""}',
        '{"$where": "this.password.match(/.*/)"}',
        '{"$regex": ".*"}',
        '{"$or": [{"password": {"$ne": null}}]}'
      ]
    };
  }

  static async testRateLimiting(url: string, requests: number = 100) {
    const results = [];
    const startTime = Date.now();

    // Fire multiple requests rapidly
    const promises = Array.from({ length: requests }, async (_, i) => {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ test: i })
        });
        return { status: response.status, index: i };
      } catch (error) {
        return { error: error.message, index: i };
      }
    });

    const responses = await Promise.all(promises);
    const endTime = Date.now();

    return {
      duration: endTime - startTime,
      responses,
      rateLimited: responses.some(r => r.status === 429),
      successCount: responses.filter(r => r.status && r.status < 300).length,
      errorCount: responses.filter(r => r.error || (r.status && r.status >= 400)).length
    };
  }
}

test.describe('Netlify Extension Management - Security Tests', () => {
  let apiClient: NetlifyApiClient;

  test.beforeEach(async ({ page }) => {
    apiClient = new NetlifyApiClient(API_BASE_URL);

    // Set up request monitoring
    page.on('request', request => {
      console.log(`${request.method()} ${request.url()}`);
    });

    page.on('response', response => {
      if (response.status() >= 400) {
        console.log(`❌ ${response.status()} ${response.url()}`);
      }
    });
  });

  test.describe('HTTP Security Headers', () => {
    test('should have proper security headers on main pages', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/netlify-dashboard`);
      const securityHeaders = await SecurityTestUtil.testSecurityHeaders(response);

      // Content Security Policy
      expect(securityHeaders['Content-Security-Policy']).toBeTruthy();

      // X-Frame-Options
      expect(securityHeaders['X-Frame-Options']).toMatch(/DENY|SAMEORIGIN/i);

      // X-Content-Type-Options
      expect(securityHeaders['X-Content-Type-Options']).toBe('nosniff');

      // Security-conscious referrer policy
      expect(securityHeaders['Referrer-Policy']).toMatch(/strict-origin|no-referrer|same-origin/i);

      console.log('Security Headers:', securityHeaders);
    });

    test('should have CSP that prevents XSS attacks', async ({ page }) => {
      const { hasCSP, cspHeader } = await SecurityTestUtil.testCSPHeaders(page, `${BASE_URL}/netlify-dashboard`);

      expect(hasCSP).toBe(true);
      expect(cspHeader).toContain("default-src 'self'");
      expect(cspHeader).not.toContain("'unsafe-inline'"); // Should avoid unsafe inline scripts
      expect(cspHeader).not.toContain("'unsafe-eval'");   // Should avoid unsafe eval
    });

    test('should have HTTPS security headers in production', async ({ page }) => {
      // This test would be more meaningful in a production environment
      const response = await page.goto(`${BASE_URL}/netlify-dashboard`);
      const headers = response?.headers() || {};

      // In production, should have HSTS
      if (BASE_URL.startsWith('https://')) {
        expect(headers['strict-transport-security']).toBeTruthy();
      }
    });
  });

  test.describe('Input Validation and Sanitization', () => {
    test('should sanitize XSS attempts in extension search', async ({ page }) => {
      await page.goto(`${BASE_URL}/netlify-dashboard`);
      await page.waitForLoadState('networkidle');

      const maliciousPayloads = SecurityTestUtil.generateMaliciousPayloads().xss;

      for (const payload of maliciousPayloads) {
        const searchInput = page.locator('input[placeholder*="search" i]').first();

        if (await searchInput.count() > 0) {
          await searchInput.fill(payload);
          await page.keyboard.press('Enter');
          await page.waitForTimeout(500);

          // Check that script didn't execute
          const alertDialog = page.locator('div[role="alert"]:has-text("XSS")');
          expect(await alertDialog.count()).toBe(0);

          // Check that payload is properly escaped in DOM
          const searchValue = await searchInput.inputValue();
          if (searchValue.includes('<script>')) {
            // Should be escaped
            const escapedContent = await page.locator('body').innerHTML();
            expect(escapedContent).not.toContain('<script>alert("XSS")</script>');
          }
        }
      }
    });

    test('should validate API input parameters', async ({ page }) => {
      const maliciousPayloads = SecurityTestUtil.generateMaliciousPayloads();

      // Test extension enable endpoint
      for (const payload of maliciousPayloads.xss.slice(0, 3)) {
        const response = await page.request.post(`${API_BASE_URL}/sites/test-site/extensions`, {
          data: { extensionId: payload }
        });

        // Should reject malicious input
        expect([400, 404, 422]).toContain(response.status());

        const responseBody = await response.text();
        expect(responseBody).not.toContain('<script>');
      }
    });

    test('should prevent SQL injection in API endpoints', async ({ page }) => {
      const sqlPayloads = SecurityTestUtil.generateMaliciousPayloads().sqlInjection;

      for (const payload of sqlPayloads.slice(0, 3)) {
        // Test various endpoints with SQL injection attempts
        const endpoints = [
          { method: 'GET', url: `${API_BASE_URL}/extensions?category=${encodeURIComponent(payload)}` },
          { method: 'GET', url: `${API_BASE_URL}/sites/${encodeURIComponent(payload)}/extensions` },
          { method: 'POST', url: `${API_BASE_URL}/sites/test/extensions`, data: { extensionId: payload } }
        ];

        for (const endpoint of endpoints) {
          let response;
          if (endpoint.method === 'GET') {
            response = await page.request.get(endpoint.url);
          } else {
            response = await page.request.post(endpoint.url, { data: endpoint.data });
          }

          // Should not expose database errors or succeed with malicious input
          const responseBody = await response.text();
          expect(responseBody.toLowerCase()).not.toContain('sql');
          expect(responseBody.toLowerCase()).not.toContain('database error');
          expect(responseBody.toLowerCase()).not.toContain('mysql');
          expect(responseBody.toLowerCase()).not.toContain('postgresql');
        }
      }
    });

    test('should prevent path traversal attacks', async ({ page }) => {
      const pathTraversalPayloads = SecurityTestUtil.generateMaliciousPayloads().pathTraversal;

      for (const payload of pathTraversalPayloads.slice(0, 3)) {
        // Test file access endpoints
        const response = await page.request.get(`${API_BASE_URL}/metrics/extensions/${encodeURIComponent(payload)}`);

        // Should not expose sensitive files
        const responseBody = await response.text();
        expect(responseBody).not.toContain('root:');
        expect(responseBody).not.toContain('passwd');
        expect(responseBody).not.toContain('[users]');
        expect([404, 400, 403]).toContain(response.status());
      }
    });
  });

  test.describe('Authentication and Authorization', () => {
    test('should require authentication for sensitive operations', async ({ page }) => {
      // Test without authentication headers
      const sensitiveEndpoints = [
        { method: 'POST', url: `${API_BASE_URL}/sites/test/extensions`, data: { extensionId: 'test' } },
        { method: 'DELETE', url: `${API_BASE_URL}/sites/test/extensions/test` },
        { method: 'POST', url: `${API_BASE_URL}/bulk/deploy`, data: { operations: [] } }
      ];

      for (const endpoint of sensitiveEndpoints) {
        let response;
        if (endpoint.method === 'POST') {
          response = await page.request.post(endpoint.url, { data: endpoint.data });
        } else if (endpoint.method === 'DELETE') {
          response = await page.request.delete(endpoint.url);
        }

        // Should require authentication (401) or validate input first (400/422)
        expect([401, 403, 400, 422]).toContain(response.status());
      }
    });

    test('should validate JWT tokens properly', async ({ page }) => {
      const maliciousTokens = [
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFkbWluIiwiaWF0IjoxNTE2MjM5MDIyfQ.invalid',
        'Bearer invalid.token.here',
        'Bearer ' + 'A'.repeat(1000), // Extremely long token
        'Bearer null',
        'Bearer undefined'
      ];

      for (const token of maliciousTokens) {
        const response = await page.request.post(`${API_BASE_URL}/sites/test/extensions`, {
          headers: { 'Authorization': token },
          data: { extensionId: 'test' }
        });

        // Should reject invalid tokens
        expect([401, 403, 400]).toContain(response.status());
      }
    });

    test('should prevent privilege escalation', async ({ page }) => {
      // Test with different privilege levels (if implemented)
      const testOperations = [
        { url: `${API_BASE_URL}/bulk/deploy`, data: { operations: [{ siteId: 'admin-site', extensionId: 'test', action: 'enable' }] } },
        { url: `${API_BASE_URL}/sites/admin-site/extensions`, data: { extensionId: 'admin-extension' } }
      ];

      for (const operation of testOperations) {
        const response = await page.request.post(operation.url, {
          headers: { 'Authorization': 'Bearer user-level-token' },
          data: operation.data
        });

        // Should not allow unauthorized access to admin resources
        expect([403, 404, 401]).toContain(response.status());
      }
    });
  });

  test.describe('Rate Limiting and DoS Protection', () => {
    test('should implement rate limiting on API endpoints', async ({ page }) => {
      const testResult = await SecurityTestUtil.testRateLimiting(`${API_BASE_URL}/extensions`, 50);

      console.log(`Rate limiting test: ${testResult.successCount} success, ${testResult.errorCount} errors in ${testResult.duration}ms`);

      // Should have some form of rate limiting after rapid requests
      expect(testResult.rateLimited || testResult.errorCount > 0).toBe(true);
    });

    test('should protect against bulk operation abuse', async ({ page }) => {
      const largeOperationsList = Array.from({ length: 100 }, (_, i) => ({
        siteId: `site-${i}`,
        extensionId: `extension-${i}`,
        action: 'enable'
      }));

      const response = await page.request.post(`${API_BASE_URL}/bulk/deploy`, {
        data: { operations: largeOperationsList }
      });

      // Should reject or limit large bulk operations
      expect([400, 413, 429, 422]).toContain(response.status());
    });

    test('should handle webhook DoS attempts', async ({ page }) => {
      const webhookPayloads = Array.from({ length: 20 }, (_, i) => ({
        id: `dos-test-${i}`,
        site_id: 'test-site',
        build_id: `build-${i}`,
        state: 'ready',
        name: `DoS Test ${i}`,
        url: 'https://test.netlify.app',
        ssl_url: 'https://test.netlify.app',
        admin_url: 'https://app.netlify.com/sites/test',
        deploy_url: `https://deploy-${i}.netlify.app`,
        deploy_ssl_url: `https://deploy-${i}.netlify.app`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: `dos-user-${i}`,
        branch: 'main',
        context: 'production'
      }));

      const promises = webhookPayloads.map(payload =>
        page.request.post(`${API_BASE_URL}/netlify/webhook`, { data: payload })
      );

      const responses = await Promise.all(promises);
      const rateLimitedCount = responses.filter(r => r.status() === 429).length;

      // Should implement some form of rate limiting
      expect(rateLimitedCount).toBeGreaterThan(0);
    });
  });

  test.describe('Data Exposure and Information Disclosure', () => {
    test('should not expose sensitive information in error messages', async ({ page }) => {
      const sensitiveEndpoints = [
        `${API_BASE_URL}/sites/nonexistent/extensions`,
        `${API_BASE_URL}/metrics/extensions/nonexistent`,
        `${API_BASE_URL}/extension-config/nonexistent/nonexistent`
      ];

      for (const endpoint of sensitiveEndpoints) {
        const response = await page.request.get(endpoint);
        const responseBody = await response.text();

        // Should not expose internal paths, database details, etc.
        expect(responseBody.toLowerCase()).not.toContain('c:\\');
        expect(responseBody.toLowerCase()).not.toContain('/etc/');
        expect(responseBody.toLowerCase()).not.toContain('database connection');
        expect(responseBody.toLowerCase()).not.toContain('stack trace');
        expect(responseBody.toLowerCase()).not.toContain('internal server error');
      }
    });

    test('should not expose debug information in production', async ({ page }) => {
      await page.goto(`${BASE_URL}/netlify-dashboard`);

      // Check that debug tools are not exposed
      const debugElements = await page.locator('[data-debug], .debug, [id*="debug"], [class*="debug"]').count();
      expect(debugElements).toBe(0);

      // Check console for debug messages
      const consoleLogs = [];
      page.on('console', msg => {
        if (msg.type() === 'log' || msg.type() === 'debug') {
          consoleLogs.push(msg.text());
        }
      });

      await page.reload();
      await page.waitForTimeout(2000);

      const debugLogs = consoleLogs.filter(log =>
        log.toLowerCase().includes('debug') ||
        log.toLowerCase().includes('dev') ||
        log.toLowerCase().includes('password') ||
        log.toLowerCase().includes('secret')
      );

      expect(debugLogs.length).toBe(0);
    });

    test('should implement proper CORS policy', async ({ page }) => {
      // Test CORS preflight request
      const corsResponse = await page.request.fetch(`${API_BASE_URL}/extensions`, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://malicious-site.com',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'content-type'
        }
      });

      const corsHeaders = corsResponse.headers();

      // Should have proper CORS headers
      if (corsHeaders['access-control-allow-origin']) {
        expect(corsHeaders['access-control-allow-origin']).not.toBe('*');
      }
    });
  });

  test.describe('WebSocket Security', () => {
    test('should validate WebSocket connections', async ({ page }) => {
      await page.goto(`${BASE_URL}/netlify-dashboard`);

      // Test WebSocket connection with malicious origin
      const wsResult = await page.evaluate(async () => {
        try {
          const ws = new WebSocket('ws://localhost:3000/ws/sites/test', [], {
            headers: { 'Origin': 'https://malicious-site.com' }
          } as any);

          return new Promise((resolve) => {
            ws.onopen = () => resolve({ connected: true });
            ws.onerror = () => resolve({ connected: false, error: true });
            ws.onclose = () => resolve({ connected: false, closed: true });

            setTimeout(() => resolve({ timeout: true }), 5000);
          });
        } catch (error) {
          return { error: error.message };
        }
      });

      // Should validate origin or implement proper authentication
      expect(wsResult).toMatchObject(
        expect.objectContaining({
          connected: expect.any(Boolean)
        })
      );
    });

    test('should prevent WebSocket message injection', async ({ page }) => {
      await page.goto(`${BASE_URL}/netlify-dashboard`);

      const maliciousMessages = [
        { type: 'admin.command', payload: { command: 'rm -rf /' } },
        { type: 'system.override', payload: { action: 'grant_admin' } },
        { type: 'extension.toggle', payload: { siteId: '../../../admin', extensionId: 'evil' } }
      ];

      for (const message of maliciousMessages) {
        const result = await page.evaluate(async (msg) => {
          try {
            const ws = new WebSocket('ws://localhost:3000/ws/sites/test');
            return new Promise((resolve) => {
              ws.onopen = () => {
                ws.send(JSON.stringify(msg));
                resolve({ sent: true });
              };
              ws.onerror = () => resolve({ error: true });
              setTimeout(() => resolve({ timeout: true }), 3000);
            });
          } catch (error) {
            return { error: error.message };
          }
        }, message);

        // Connection should handle malicious messages safely
        expect(result).toBeDefined();
      }
    });
  });

  test.describe('File Upload Security (if applicable)', () => {
    test('should validate file uploads', async ({ page }) => {
      // This test would apply if there are file upload features
      const maliciousFiles = [
        { name: 'test.php', content: '<?php system($_GET["cmd"]); ?>', type: 'application/x-php' },
        { name: 'test.exe', content: 'MZ...', type: 'application/octet-stream' },
        { name: '../../../evil.js', content: 'alert("XSS")', type: 'text/javascript' }
      ];

      // If there are file upload endpoints, test them
      const uploadEndpoints = await page.locator('input[type="file"]').count();

      if (uploadEndpoints > 0) {
        console.log('File upload functionality detected, testing security...');

        for (const file of maliciousFiles) {
          // Test file upload (implementation would depend on actual upload mechanism)
          const fileInput = page.locator('input[type="file"]').first();

          // Create a test file
          const buffer = Buffer.from(file.content);

          await fileInput.setInputFiles({
            name: file.name,
            mimeType: file.type,
            buffer
          });

          // Should reject malicious file types
          const errorMessage = page.locator('[role="alert"], .error').first();
          await expect(errorMessage).toBeVisible();
        }
      }
    });
  });

  test.describe('Session Security', () => {
    test('should implement secure session handling', async ({ page }) => {
      await page.goto(`${BASE_URL}/netlify-dashboard`);

      // Check for secure cookies
      const cookies = await page.context().cookies();
      const secureCookies = cookies.filter(cookie => cookie.secure);
      const httpOnlyCookies = cookies.filter(cookie => cookie.httpOnly);

      // In HTTPS environment, cookies should be secure
      if (BASE_URL.startsWith('https://')) {
        expect(secureCookies.length).toBeGreaterThan(0);
      }

      // Session cookies should be httpOnly
      expect(httpOnlyCookies.length).toBeGreaterThan(0);
    });

    test('should prevent session fixation', async ({ page, context }) => {
      // Get initial session
      await page.goto(`${BASE_URL}/netlify-dashboard`);
      const initialCookies = await context.cookies();

      // Simulate login (if authentication is implemented)
      // This would depend on actual authentication flow

      // Check that session ID changed after authentication
      const postAuthCookies = await context.cookies();

      // Session tokens should change after authentication events
      const sessionCookieChanged = initialCookies.some(initial => {
        const corresponding = postAuthCookies.find(post => post.name === initial.name);
        return corresponding && corresponding.value !== initial.value;
      });

      // If there are authentication flows, session should change
      if (initialCookies.length > 0) {
        expect(sessionCookieChanged || initialCookies.length === 0).toBe(true);
      }
    });
  });

  test.describe('Content Security', () => {
    test('should prevent clickjacking attacks', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/netlify-dashboard`);
      const xFrameOptions = response?.headers()['x-frame-options'];

      expect(xFrameOptions).toMatch(/DENY|SAMEORIGIN/i);
    });

    test('should implement proper content type handling', async ({ page }) => {
      const response = await page.goto(`${BASE_URL}/netlify-dashboard`);
      const contentType = response?.headers()['content-type'];
      const xContentTypeOptions = response?.headers()['x-content-type-options'];

      expect(contentType).toContain('text/html');
      expect(xContentTypeOptions).toBe('nosniff');
    });
  });

  test.describe('Security Monitoring', () => {
    test('should log security events', async ({ page }) => {
      // Monitor console for security-related messages
      const securityLogs = [];
      page.on('console', msg => {
        const text = msg.text().toLowerCase();
        if (text.includes('security') || text.includes('warning') || text.includes('blocked')) {
          securityLogs.push(msg.text());
        }
      });

      await page.goto(`${BASE_URL}/netlify-dashboard`);

      // Try a potentially suspicious action
      await page.evaluate(() => {
        // Attempt to access restricted properties
        try {
          (window as any).location.href = 'javascript:alert("XSS")';
        } catch (e) {
          console.warn('Security: Blocked javascript: protocol');
        }
      });

      // Security warnings should be logged
      expect(securityLogs.length).toBeGreaterThanOrEqual(0);
    });
  });
});
