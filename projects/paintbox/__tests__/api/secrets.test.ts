import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'

// Mock AWS SDK
const mockSend = jest.fn()
const mockSecretsManagerClient = jest.fn(() => ({
  send: mockSend
}))

jest.mock('@aws-sdk/client-secrets-manager', () => ({
  SecretsManagerClient: mockSecretsManagerClient,
  GetSecretValueCommand: jest.fn((params) => ({ input: params })),
  CreateSecretCommand: jest.fn((params) => ({ input: params })),
  UpdateSecretCommand: jest.fn((params) => ({ input: params })),
  DeleteSecretCommand: jest.fn((params) => ({ input: params })),
  ListSecretsCommand: jest.fn((params) => ({ input: params })),
}))

// Mock rate limiter
const mockRateLimiter = {
  check: jest.fn(),
  reset: jest.fn(),
}

jest.mock('../../lib/middleware/rateLimiter', () => ({
  rateLimiter: mockRateLimiter
}))

describe('/api/v1/secrets/config', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NODE_ENV = 'test'
    process.env.APP_VERSION = '1.0.0'
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should return application configuration successfully', async () => {
    // Mock rate limiter to allow request
    mockRateLimiter.check.mockResolvedValue({ allowed: true, remaining: 99 })

    // Import the handler after mocks are set up
    const { GET } = await import('../../app/api/v1/secrets/config/route')

    const request = new NextRequest('http://localhost:3000/api/v1/secrets/config', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('environment')
    expect(data).toHaveProperty('version')
    expect(data).toHaveProperty('features')
    expect(data).toHaveProperty('security')
    expect(data.features).toHaveProperty('salesforce')
    expect(data.features).toHaveProperty('companycam')
    expect(data.features).toHaveProperty('audit')
  })

  it('should apply rate limiting', async () => {
    // Mock rate limiter to deny request
    mockRateLimiter.check.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + 60000
    })

    const { GET } = await import('../../app/api/v1/secrets/config/route')

    const request = new NextRequest('http://localhost:3000/api/v1/secrets/config', {
      method: 'GET',
    })

    const response = await GET(request)

    expect(response.status).toBe(429)
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0')
  })

  it('should reject requests with invalid authentication', async () => {
    mockRateLimiter.check.mockResolvedValue({ allowed: true, remaining: 99 })

    const { GET } = await import('../../app/api/v1/secrets/config/route')

    const request = new NextRequest('http://localhost:3000/api/v1/secrets/config', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer invalid-token'
      }
    })

    const response = await GET(request)

    expect(response.status).toBe(401)
  })

  it('should validate request origin and prevent CSRF', async () => {
    mockRateLimiter.check.mockResolvedValue({ allowed: true, remaining: 99 })

    const { GET } = await import('../../app/api/v1/secrets/config/route')

    const request = new NextRequest('http://localhost:3000/api/v1/secrets/config', {
      method: 'GET',
      headers: {
        'Origin': 'http://evil.com',
        'Referer': 'http://evil.com/attack'
      }
    })

    const response = await GET(request)

    expect(response.status).toBe(403)
  })

  it('should handle malicious input in query parameters', async () => {
    mockRateLimiter.check.mockResolvedValue({ allowed: true, remaining: 99 })

    const { GET } = await import('../../app/api/v1/secrets/config/route')

    // Test SQL injection attempts
    for (const payload of global.securityTestHelpers.sqlInjectionPayloads) {
      const request = new NextRequest(`http://localhost:3000/api/v1/secrets/config?filter=${encodeURIComponent(payload)}`, {
        method: 'GET',
      })

      const response = await GET(request)

      // Should either reject malicious input or sanitize it
      expect([200, 400, 403]).toContain(response.status)

      if (response.status === 200) {
        const data = await response.json()
        // Ensure no SQL injection occurred by checking response structure
        expect(data).toHaveProperty('environment')
        expect(typeof data.environment).toBe('string')
      }
    }
  })
})

describe('/api/v1/secrets/token', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should issue temporary access token with valid credentials', async () => {
    mockRateLimiter.check.mockResolvedValue({ allowed: true, remaining: 99 })

    const { POST } = await import('../../app/api/v1/secrets/token/route')

    const request = new NextRequest('http://localhost:3000/api/v1/secrets/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientId: 'test-client',
        clientSecret: 'test-secret',
        scope: 'read:secrets'
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('accessToken')
    expect(data).toHaveProperty('expiresIn')
    expect(data).toHaveProperty('tokenType', 'Bearer')
  })

  it('should reject requests with invalid credentials', async () => {
    mockRateLimiter.check.mockResolvedValue({ allowed: true, remaining: 99 })

    const { POST } = await import('../../app/api/v1/secrets/token/route')

    const request = new NextRequest('http://localhost:3000/api/v1/secrets/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientId: 'invalid-client',
        clientSecret: 'invalid-secret',
        scope: 'read:secrets'
      })
    })

    const response = await POST(request)

    expect(response.status).toBe(401)
  })

  it('should validate request payload and prevent injection attacks', async () => {
    mockRateLimiter.check.mockResolvedValue({ allowed: true, remaining: 99 })

    const { POST } = await import('../../app/api/v1/secrets/token/route')

    // Test various malicious payloads
    const maliciousPayloads = [
      // SQL injection in clientId
      { clientId: "'; DROP TABLE tokens; --", clientSecret: 'test', scope: 'read:secrets' },
      // XSS in scope
      { clientId: 'test', clientSecret: 'test', scope: '<script>alert("xss")</script>' },
      // Command injection in clientSecret
      { clientId: 'test', clientSecret: '$(rm -rf /)', scope: 'read:secrets' },
      // JSON injection
      { clientId: 'test", "admin": true, "fake": "', clientSecret: 'test', scope: 'read:secrets' }
    ]

    for (const payload of maliciousPayloads) {
      const request = new NextRequest('http://localhost:3000/api/v1/secrets/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      })

      const response = await POST(request)

      // Should reject malicious input
      expect([400, 401, 403]).toContain(response.status)
    }
  })

  it('should enforce rate limiting on token requests', async () => {
    // First request should succeed
    mockRateLimiter.check.mockResolvedValueOnce({ allowed: true, remaining: 0 })
    // Second request should be rate limited
    mockRateLimiter.check.mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + 60000
    })

    const { POST } = await import('../../app/api/v1/secrets/token/route')

    const validRequest = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: 'test-client',
        clientSecret: 'test-secret',
        scope: 'read:secrets'
      })
    }

    // First request
    const request1 = new NextRequest('http://localhost:3000/api/v1/secrets/token', validRequest)
    const response1 = await POST(request1)

    // Second request should be rate limited
    const request2 = new NextRequest('http://localhost:3000/api/v1/secrets/token', validRequest)
    const response2 = await POST(request2)

    expect(response2.status).toBe(429)
  })
})

describe('/api/v1/secrets/health', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return health status of secrets service', async () => {
    mockRateLimiter.check.mockResolvedValue({ allowed: true, remaining: 99 })

    // Mock AWS Secrets Manager health check
    mockSend.mockResolvedValue({
      SecretList: []
    })

    const { GET } = await import('../../app/api/v1/secrets/health/route')

    const request = new NextRequest('http://localhost:3000/api/v1/secrets/health', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('status')
    expect(data).toHaveProperty('timestamp')
    expect(data).toHaveProperty('services')
    expect(data.services).toHaveProperty('aws_secrets_manager')
  })

  it('should handle AWS connection failures gracefully', async () => {
    mockRateLimiter.check.mockResolvedValue({ allowed: true, remaining: 99 })

    // Mock AWS failure
    mockSend.mockRejectedValue(new Error('AWS connection failed'))

    const { GET } = await import('../../app/api/v1/secrets/health/route')

    const request = new NextRequest('http://localhost:3000/api/v1/secrets/health', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data.status).toBe('unhealthy')
    expect(data.services.aws_secrets_manager.status).toBe('error')
  })

  it('should not expose sensitive information in health check', async () => {
    mockRateLimiter.check.mockResolvedValue({ allowed: true, remaining: 99 })
    mockSend.mockResolvedValue({ SecretList: [] })

    const { GET } = await import('../../app/api/v1/secrets/health/route')

    const request = new NextRequest('http://localhost:3000/api/v1/secrets/health', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    // Ensure no sensitive data is exposed
    const responseString = JSON.stringify(data)
    expect(responseString).not.toMatch(/password|secret|key|token/i)
    expect(responseString).not.toMatch(/arn:aws:secretsmanager/)
  })
})

describe('Security Headers and CORS', () => {
  it('should include proper security headers in all responses', async () => {
    mockRateLimiter.check.mockResolvedValue({ allowed: true, remaining: 99 })

    const { GET } = await import('../../app/api/v1/secrets/config/route')

    const request = new NextRequest('http://localhost:3000/api/v1/secrets/config', {
      method: 'GET',
    })

    const response = await GET(request)

    // Check security headers
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(response.headers.get('X-Frame-Options')).toBe('DENY')
    expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block')
    expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(response.headers.get('Content-Security-Policy')).toContain("default-src 'self'")
  })

  it('should handle CORS preflight requests correctly', async () => {
    const { OPTIONS } = await import('../../app/api/v1/secrets/config/route')

    const request = new NextRequest('http://localhost:3000/api/v1/secrets/config', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://app.paintbox.com',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Authorization, Content-Type'
      }
    })

    const response = await OPTIONS(request)

    expect(response.status).toBe(200)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://app.paintbox.com')
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET')
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Authorization')
  })
})
