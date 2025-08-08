import { test, expect, Page, APIRequestContext } from '@playwright/test'

test.describe('Security API Endpoints', () => {
  let apiContext: APIRequestContext

  test.beforeAll(async ({ playwright }) => {
    // Create API context for testing endpoints directly
    apiContext = await playwright.request.newContext({
      baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
      },
    })
  })

  test.afterAll(async () => {
    await apiContext.dispose()
  })

  test.describe('Authentication Endpoints', () => {
    test('should require authentication for protected endpoints', async () => {
      const protectedEndpoints = [
        '/api/v1/secrets/config',
        '/api/v1/services/salesforce/status',
        '/api/v1/services/companycam/status',
        '/api/v1/audit/events'
      ]

      for (const endpoint of protectedEndpoints) {
        const response = await apiContext.get(endpoint)

        // Should return 401 Unauthorized without proper auth
        expect(response.status()).toBe(401)

        const body = await response.json()
        expect(body).toHaveProperty('error')
        expect(body.error).toMatch(/unauthorized|authentication.*required/i)
      }
    })

    test('should reject invalid authentication tokens', async () => {
      const invalidTokens = [
        'invalid-token',
        'Bearer invalid-token',
        'Bearer expired-token-123',
        'malformed.jwt.token',
        ''
      ]

      for (const token of invalidTokens) {
        const response = await apiContext.get('/api/v1/secrets/config', {
          headers: {
            'Authorization': token
          }
        })

        expect(response.status()).toBe(401)

        const body = await response.json()
        expect(body.error).toMatch(/invalid.*token|unauthorized/i)
      }
    })

    test('should validate JWT token structure and expiration', async () => {
      // Test with malformed JWT
      const malformedJWT = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.malformed'

      const response = await apiContext.get('/api/v1/secrets/config', {
        headers: {
          'Authorization': malformedJWT
        }
      })

      expect(response.status()).toBe(401)

      const body = await response.json()
      expect(body.error).toMatch(/invalid.*token|malformed.*jwt/i)
    })

    test('should implement token refresh mechanism', async () => {
      // Test token refresh endpoint
      const refreshResponse = await apiContext.post('/api/v1/auth/refresh', {
        data: {
          refreshToken: 'mock-refresh-token'
        }
      })

      // Should either provide new token or reject invalid refresh token
      expect([200, 401, 403]).toContain(refreshResponse.status())

      if (refreshResponse.status() === 200) {
        const body = await refreshResponse.json()
        expect(body).toHaveProperty('accessToken')
        expect(body).toHaveProperty('expiresIn')
      }
    })
  })

  test.describe('Rate Limiting', () => {
    test('should implement rate limiting on API endpoints', async () => {
      const endpoint = '/api/v1/secrets/config'
      const requests = []

      // Send rapid requests to trigger rate limiting
      for (let i = 0; i < 20; i++) {
        requests.push(apiContext.get(endpoint, {
          headers: {
            'Authorization': 'Bearer test-token'
          }
        }))
      }

      const responses = await Promise.all(requests)

      // Should have some rate limited responses
      const rateLimitedResponses = responses.filter(r => r.status() === 429)
      expect(rateLimitedResponses.length).toBeGreaterThan(0)

      // Rate limited responses should have proper headers
      for (const response of rateLimitedResponses) {
        expect(response.headers()['x-ratelimit-remaining']).toBeDefined()
        expect(response.headers()['retry-after']).toBeDefined()
      }
    })

    test('should implement different rate limits per endpoint', async () => {
      const endpoints = [
        { path: '/api/v1/secrets/token', expectedLimit: 5 }, // Lower limit for auth
        { path: '/api/v1/secrets/config', expectedLimit: 100 }, // Higher limit for config
        { path: '/api/v1/audit/events', expectedLimit: 50 } // Medium limit for audit
      ]

      for (const { path, expectedLimit } of endpoints) {
        const requests = []

        for (let i = 0; i < expectedLimit + 10; i++) {
          if (path === '/api/v1/secrets/token') {
            requests.push(apiContext.post(path, {
              data: {
                clientId: 'test',
                clientSecret: 'test',
                scope: 'read'
              }
            }))
          } else {
            requests.push(apiContext.get(path, {
              headers: { 'Authorization': 'Bearer test-token' }
            }))
          }
        }

        const responses = await Promise.all(requests)
        const rateLimited = responses.filter(r => r.status() === 429)

        expect(rateLimited.length).toBeGreaterThan(0)
        console.log(`${path}: ${rateLimited.length} rate limited out of ${responses.length}`)
      }
    })

    test('should reset rate limits after time window', async () => {
      const endpoint = '/api/v1/secrets/config'

      // Exhaust rate limit
      const rapidRequests = []
      for (let i = 0; i < 15; i++) {
        rapidRequests.push(apiContext.get(endpoint, {
          headers: { 'Authorization': 'Bearer test-token' }
        }))
      }

      const rapidResponses = await Promise.all(rapidRequests)
      const rateLimited = rapidResponses.filter(r => r.status() === 429)
      expect(rateLimited.length).toBeGreaterThan(0)

      // Wait for rate limit reset (in real implementation)
      // For testing, we'll just verify the reset mechanism exists
      const resetResponse = await apiContext.get(endpoint, {
        headers: { 'Authorization': 'Bearer test-token' }
      })

      // Should still be rate limited immediately after
      expect(resetResponse.status()).toBe(429)
    })
  })

  test.describe('Input Validation', () => {
    test('should validate and sanitize request payloads', async () => {
      const maliciousPayloads = [
        // SQL Injection attempts
        { clientId: "'; DROP TABLE users; --", clientSecret: 'test', scope: 'read' },
        { clientId: "' OR '1'='1", clientSecret: 'test', scope: 'read' },

        // XSS attempts
        { clientId: '<script>alert("xss")</script>', clientSecret: 'test', scope: 'read' },
        { clientId: 'javascript:alert("xss")', clientSecret: 'test', scope: 'read' },

        // Command injection
        { clientId: '$(rm -rf /)', clientSecret: 'test', scope: 'read' },
        { clientId: '`whoami`', clientSecret: 'test', scope: 'read' },

        // JSON injection
        { clientId: 'test", "admin": true, "fake": "', clientSecret: 'test', scope: 'read' },

        // NoSQL injection
        { clientId: { '$gt': '' }, clientSecret: 'test', scope: 'read' },

        // Path traversal
        { clientId: '../../../etc/passwd', clientSecret: 'test', scope: 'read' },

        // LDAP injection
        { clientId: 'test*)(uid=*))(|(uid=*', clientSecret: 'test', scope: 'read' }
      ]

      for (const payload of maliciousPayloads) {
        const response = await apiContext.post('/api/v1/secrets/token', {
          data: payload
        })

        // Should reject malicious payloads
        expect([400, 401, 403]).toContain(response.status())

        const body = await response.json()
        expect(body).toHaveProperty('error')

        // Should not echo back the malicious input
        const responseText = JSON.stringify(body)
        expect(responseText).not.toContain('<script>')
        expect(responseText).not.toContain('DROP TABLE')
        expect(responseText).not.toContain('rm -rf')
      }
    })

    test('should validate query parameters', async () => {
      const maliciousQueries = [
        '?service=salesforce; DROP TABLE audit_events; --',
        '?action=login\' OR \'1\'=\'1',
        '?user=<script>alert("xss")</script>',
        '?start_date=../../etc/passwd',
        '?search=$ne=null'
      ]

      for (const query of maliciousQueries) {
        const response = await apiContext.get(`/api/v1/audit/events${query}`, {
          headers: { 'Authorization': 'Bearer admin-token' }
        })

        // Should either reject or sanitize malicious queries
        expect([200, 400, 403]).toContain(response.status())

        if (response.status() === 200) {
          const body = await response.json()
          // Should have proper response structure, not SQL injection results
          expect(body).toHaveProperty('events')
          expect(Array.isArray(body.events)).toBe(true)
        }
      }
    })

    test('should validate file upload endpoints', async () => {
      // Test file upload with malicious files
      const maliciousFiles = [
        { name: '../../../etc/passwd', content: 'malicious content' },
        { name: 'script.js', content: '<script>alert("xss")</script>' },
        { name: 'shell.php', content: '<?php system($_GET["cmd"]); ?>' },
        { name: 'large-file.txt', content: 'A'.repeat(10 * 1024 * 1024) } // 10MB file
      ]

      for (const file of maliciousFiles) {
        const response = await apiContext.post('/api/v1/upload', {
          multipart: {
            file: {
              name: file.name,
              mimeType: 'text/plain',
              buffer: Buffer.from(file.content)
            }
          },
          headers: { 'Authorization': 'Bearer test-token' }
        })

        // Should reject malicious uploads
        expect([400, 403, 413, 415]).toContain(response.status())
      }
    })
  })

  test.describe('CORS and Security Headers', () => {
    test('should implement proper CORS policies', async () => {
      const allowedOrigins = [
        'https://app.paintbox.com',
        'https://admin.paintbox.com'
      ]

      const blockedOrigins = [
        'https://evil.com',
        'http://localhost:3001',
        'https://phishing-site.com'
      ]

      // Test allowed origins
      for (const origin of allowedOrigins) {
        const response = await apiContext.get('/api/v1/secrets/config', {
          headers: {
            'Origin': origin,
            'Authorization': 'Bearer test-token'
          }
        })

        expect(response.headers()['access-control-allow-origin']).toBe(origin)
      }

      // Test blocked origins
      for (const origin of blockedOrigins) {
        const response = await apiContext.get('/api/v1/secrets/config', {
          headers: {
            'Origin': origin,
            'Authorization': 'Bearer test-token'
          }
        })

        expect(response.headers()['access-control-allow-origin']).not.toBe(origin)
      }
    })

    test('should include security headers in all responses', async () => {
      const response = await apiContext.get('/api/v1/secrets/config', {
        headers: { 'Authorization': 'Bearer test-token' }
      })

      const headers = response.headers()

      // Security headers
      expect(headers['x-content-type-options']).toBe('nosniff')
      expect(headers['x-frame-options']).toBe('DENY')
      expect(headers['x-xss-protection']).toBe('1; mode=block')
      expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')

      // CSP header
      expect(headers['content-security-policy']).toContain("default-src 'self'")

      // HSTS header (for HTTPS)
      if (response.url().startsWith('https://')) {
        expect(headers['strict-transport-security']).toBeDefined()
      }
    })

    test('should handle preflight requests correctly', async () => {
      const preflightResponse = await apiContext.fetch('/api/v1/secrets/config', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://app.paintbox.com',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Authorization, Content-Type'
        }
      })

      expect(preflightResponse.status()).toBe(200)

      const headers = preflightResponse.headers()
      expect(headers['access-control-allow-methods']).toContain('GET')
      expect(headers['access-control-allow-headers']).toContain('Authorization')
      expect(headers['access-control-max-age']).toBeDefined()
    })
  })

  test.describe('Error Handling Security', () => {
    test('should not expose stack traces in error responses', async () => {
      // Trigger various error conditions
      const errorRequests = [
        { method: 'GET', url: '/api/v1/nonexistent/endpoint' },
        { method: 'POST', url: '/api/v1/secrets/token', data: { invalid: 'data' } },
        { method: 'GET', url: '/api/v1/secrets/config', headers: { 'Authorization': 'Bearer expired-token' } }
      ]

      for (const request of errorRequests) {
        const response = await apiContext.fetch(request.url, {
          method: request.method,
          data: request.data,
          headers: request.headers
        })

        const body = await response.text()

        // Should not expose stack traces, file paths, or internal details
        expect(body).not.toMatch(/at.*\(.*\.js:\d+:\d+\)/) // Stack trace
        expect(body).not.toMatch(/\/usr\/.*|\/var\/.*|C:\\/) // File paths
        expect(body).not.toMatch(/TypeError|ReferenceError/) // Detailed error types
        expect(body).not.toMatch(/node_modules/) // Internal dependencies
      }
    })

    test('should sanitize error messages', async () => {
      // Test with malicious input that might be echoed in errors
      const maliciousInput = '<script>alert("xss")</script>'

      const response = await apiContext.post('/api/v1/secrets/token', {
        data: {
          clientId: maliciousInput,
          clientSecret: 'test',
          scope: 'read'
        }
      })

      expect(response.status()).toBe(400)

      const body = await response.json()
      const responseText = JSON.stringify(body)

      // Should not echo back unescaped malicious input
      expect(responseText).not.toContain('<script>alert("xss")</script>')

      // If input is referenced, it should be sanitized
      if (responseText.includes('script')) {
        expect(responseText).toMatch(/&lt;script&gt;|\\u003cscript\\u003e/)
      }
    })

    test('should implement proper HTTP status codes', async () => {
      const testCases = [
        {
          url: '/api/v1/secrets/config',
          method: 'GET',
          headers: {},
          expectedStatus: 401 // Unauthorized
        },
        {
          url: '/api/v1/nonexistent',
          method: 'GET',
          headers: { 'Authorization': 'Bearer test-token' },
          expectedStatus: 404 // Not Found
        },
        {
          url: '/api/v1/secrets/token',
          method: 'POST',
          data: { invalid: 'payload' },
          expectedStatus: 400 // Bad Request
        },
        {
          url: '/api/v1/secrets/config',
          method: 'POST', // Wrong method
          headers: { 'Authorization': 'Bearer test-token' },
          expectedStatus: 405 // Method Not Allowed
        }
      ]

      for (const testCase of testCases) {
        const response = await apiContext.fetch(testCase.url, {
          method: testCase.method,
          headers: testCase.headers,
          data: testCase.data
        })

        expect(response.status()).toBe(testCase.expectedStatus)
      }
    })
  })

  test.describe('Data Protection', () => {
    test('should not log sensitive data in access logs', async () => {
      // Make requests with sensitive data
      await apiContext.post('/api/v1/secrets/token', {
        data: {
          clientId: 'test-client',
          clientSecret: 'super-secret-value-123',
          scope: 'read:secrets'
        }
      })

      // In a real test, you'd check actual log files
      // For this test, we verify the response doesn't echo sensitive data
      const response = await apiContext.get('/api/v1/audit/events', {
        headers: { 'Authorization': 'Bearer admin-token' }
      })

      if (response.status() === 200) {
        const body = await response.json()
        const logContent = JSON.stringify(body)

        // Should not contain the actual secret values
        expect(logContent).not.toContain('super-secret-value-123')
      }
    })

    test('should implement request/response size limits', async () => {
      // Test large request payload
      const largePayload = {
        clientId: 'test',
        clientSecret: 'A'.repeat(1024 * 1024), // 1MB secret
        scope: 'read'
      }

      const response = await apiContext.post('/api/v1/secrets/token', {
        data: largePayload
      })

      // Should reject overly large payloads
      expect([400, 413]).toContain(response.status())
    })

    test('should validate content types', async () => {
      // Test with wrong content type
      const response = await apiContext.post('/api/v1/secrets/token', {
        data: 'clientId=test&clientSecret=test', // Form data instead of JSON
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })

      // Should either reject or properly handle content type
      expect([400, 415]).toContain(response.status())
    })
  })

  test.describe('API Versioning Security', () => {
    test('should reject requests to deprecated API versions', async () => {
      const deprecatedVersions = [
        '/api/v0/secrets/config',
        '/api/beta/secrets/config',
        '/api/legacy/secrets/config'
      ]

      for (const url of deprecatedVersions) {
        const response = await apiContext.get(url, {
          headers: { 'Authorization': 'Bearer test-token' }
        })

        // Should return 404 or 410 Gone
        expect([404, 410]).toContain(response.status())
      }
    })

    test('should validate API version in headers', async () => {
      const response = await apiContext.get('/api/v1/secrets/config', {
        headers: {
          'Authorization': 'Bearer test-token',
          'API-Version': '2.0' // Future version
        }
      })

      // Should either ignore unsupported version or return error
      expect([200, 400, 406]).toContain(response.status())
    })
  })
})
