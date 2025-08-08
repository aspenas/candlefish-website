import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'

// Polyfills for Node.js environment
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock window.location for tests
delete window.location
window.location = {
  ...window.location,
  assign: jest.fn(),
  replace: jest.fn(),
  reload: jest.fn(),
}

// Mock fetch globally
global.fetch = jest.fn()

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

// Mock AWS SDK
jest.mock('@aws-sdk/client-secrets-manager', () => ({
  SecretsManagerClient: jest.fn(() => ({
    send: jest.fn(),
  })),
  GetSecretValueCommand: jest.fn(),
  CreateSecretCommand: jest.fn(),
  UpdateSecretCommand: jest.fn(),
  DeleteSecretCommand: jest.fn(),
  ListSecretsCommand: jest.fn(),
}))

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}))

// Mock environment variables
process.env = {
  ...process.env,
  NODE_ENV: 'test',
  AWS_REGION: 'us-east-1',
  NEXTAUTH_SECRET: 'test-secret',
  NEXT_PUBLIC_API_URL: 'http://localhost:3000',
}

// Security test helpers
global.securityTestHelpers = {
  // Mock malicious payloads for testing
  sqlInjectionPayloads: [
    "'; DROP TABLE users; --",
    "' OR '1'='1",
    "' UNION SELECT * FROM secrets --",
    "'; INSERT INTO admin_users VALUES ('hacker', 'password'); --"
  ],

  xssPayloads: [
    "<script>alert('XSS')</script>",
    "javascript:alert('XSS')",
    "<img src=x onerror=alert('XSS')>",
    "';alert(String.fromCharCode(88,83,83));//"
  ],

  // Rate limiting test helpers
  createRateLimitRequests: (count) => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      timestamp: Date.now() + i,
      ip: '192.168.1.1',
      userAgent: 'test-agent'
    }))
  },

  // Mock JWT tokens
  createMockJWT: (payload = {}, expired = false) => {
    const header = { alg: 'HS256', typ: 'JWT' }
    const defaultPayload = {
      sub: 'test-user',
      iat: Math.floor(Date.now() / 1000),
      exp: expired ? Math.floor(Date.now() / 1000) - 3600 : Math.floor(Date.now() / 1000) + 3600,
      ...payload
    }

    // Simple base64 encoding for testing (not secure, just for mocking)
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64')
    const encodedPayload = Buffer.from(JSON.stringify(defaultPayload)).toString('base64')
    const signature = 'mock-signature'

    return `${encodedHeader}.${encodedPayload}.${signature}`
  },

  // Mock AWS responses
  createMockAWSSecret: (name, value, description = '') => ({
    Name: name,
    ARN: `arn:aws:secretsmanager:us-east-1:123456789012:secret:${name}`,
    Description: description,
    SecretString: JSON.stringify(value),
    VersionId: 'test-version-id',
    VersionStages: ['AWSCURRENT'],
    CreatedDate: new Date(),
    LastChangedDate: new Date(),
  }),
}

// Mock Redis client
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),
    keys: jest.fn(),
    disconnect: jest.fn(),
  }))
})

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks()
  fetch.mockClear()
})
