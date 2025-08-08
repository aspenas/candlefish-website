// Jest setup for phased deployment test suite
import '@testing-library/jest-dom'
import { server } from '../mocks/server'
import { TextEncoder, TextDecoder } from 'util'

// Global test environment setup
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() { return null }
  disconnect() { return null }
  unobserve() { return null }
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() { return null }
  disconnect() { return null }
  unobserve() { return null }
}

// Mock WebSocket
global.WebSocket = class WebSocket {
  constructor(url) {
    this.url = url
    this.readyState = WebSocket.CONNECTING
    setTimeout(() => {
      this.readyState = WebSocket.OPEN
      this.onopen?.()
    }, 0)
  }

  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  send(data) {
    // Mock send
  }

  close() {
    this.readyState = WebSocket.CLOSED
    this.onclose?.()
  }
}

// Setup MSW
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// Suppress console errors in tests unless explicitly testing them
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

// Global test utilities
global.createMockApiResponse = (data, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: jest.fn().mockResolvedValue(data),
  text: jest.fn().mockResolvedValue(JSON.stringify(data)),
  headers: new Headers()
})

global.createMockError = (message, status = 500) => {
  const error = new Error(message)
  error.status = status
  return error
}

// Setup for phased deployment tests
if (process.env.NODE_ENV === 'test') {
  // Mock environment variables
  process.env.TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'admin@candlefish-test.ai'
  process.env.TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'testuser@candlefish-test.ai'
  process.env.API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000'
  process.env.DASHBOARD_URL = process.env.DASHBOARD_URL || 'http://localhost:5173'
}

// Performance monitoring for tests
global.performance = global.performance || {
  now: jest.fn(() => Date.now())
}

// Extend Jest matchers for phased deployment tests
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      }
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      }
    }
  },

  toBeWithinTimeRange(received, expected, tolerance = 1000) {
    const pass = Math.abs(received - expected) <= tolerance
    if (pass) {
      return {
        message: () => `expected ${received} not to be within ${tolerance}ms of ${expected}`,
        pass: true,
      }
    } else {
      return {
        message: () => `expected ${received} to be within ${tolerance}ms of ${expected}`,
        pass: false,
      }
    }
  },

  toHaveValidOnboardingProgress(received) {
    const hasProgress = typeof received.progress === 'number'
    const hasStatus = typeof received.status === 'string'
    const hasSteps = Array.isArray(received.steps)
    const validProgress = received.progress >= 0 && received.progress <= 100

    const pass = hasProgress && hasStatus && hasSteps && validProgress

    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to have valid onboarding progress`,
        pass: true,
      }
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to have valid onboarding progress (progress: number 0-100, status: string, steps: array)`,
        pass: false,
      }
    }
  },

  toHaveValidPhaseMetrics(received) {
    const hasCompletionRate = typeof received.completionRate === 'number'
    const hasErrorRate = typeof received.errorRate === 'number'
    const hasAvgTime = typeof received.avgOnboardingTime === 'number'
    const hasSatisfaction = typeof received.userSatisfaction === 'number'

    const validRanges = received.completionRate >= 0 && received.completionRate <= 100 &&
                       received.errorRate >= 0 && received.errorRate <= 100 &&
                       received.avgOnboardingTime >= 0 &&
                       received.userSatisfaction >= 0 && received.userSatisfaction <= 5

    const pass = hasCompletionRate && hasErrorRate && hasAvgTime && hasSatisfaction && validRanges

    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to have valid phase metrics`,
        pass: true,
      }
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to have valid phase metrics (completionRate: 0-100, errorRate: 0-100, avgOnboardingTime: >=0, userSatisfaction: 0-5)`,
        pass: false,
      }
    }
  }
})

// Global test timeout for complex scenarios
jest.setTimeout(60000)
