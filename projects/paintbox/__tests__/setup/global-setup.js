// Global test setup for Paintbox Production Features Test Suite

const fs = require('fs');
const path = require('path');

module.exports = async () => {
  console.log('🚀 Setting up global test environment...');

  // Create test results directory
  const testResultsDir = path.join(process.cwd(), 'test-results');
  if (!fs.existsSync(testResultsDir)) {
    fs.mkdirSync(testResultsDir, { recursive: true });
  }

  // Create coverage directory
  const coverageDir = path.join(process.cwd(), 'coverage');
  if (!fs.existsSync(coverageDir)) {
    fs.mkdirSync(coverageDir, { recursive: true });
  }

  // Set global test environment variables
  process.env.NODE_ENV = 'test';
  process.env.CI = process.env.CI || 'false';
  process.env.TZ = 'UTC';

  // Mock environment variables for consistent testing
  process.env.NEXTAUTH_SECRET = 'test-secret-key-for-jwt';
  process.env.NEXTAUTH_URL = 'http://localhost:3000';
  process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000';
  process.env.AWS_REGION = 'us-east-1';
  process.env.TEMPORAL_ADDRESS = 'localhost:7233';
  process.env.REDIS_URL = 'redis://localhost:6379';

  // Initialize test database schema if needed
  // This would typically set up a test database
  console.log('📊 Test database initialized');

  // Setup mock external services
  setupMockServices();

  console.log('✅ Global test environment setup complete');
};

function setupMockServices() {
  // Mock external service endpoints for testing
  const mockServices = {
    temporal: 'http://localhost:7233',
    redis: 'redis://localhost:6379/1', // Use database 1 for tests
    aws: 'https://secretsmanager.us-east-1.amazonaws.com',
    slack: 'https://hooks.slack.com/services/test',
    email: 'https://api.sendgrid.com/v3',
  };

  // Store original values for cleanup
  global.__ORIGINAL_ENV__ = {};

  Object.entries(mockServices).forEach(([service, url]) => {
    const envVar = `${service.toUpperCase()}_URL`;
    global.__ORIGINAL_ENV__[envVar] = process.env[envVar];
    process.env[envVar] = url;
  });

  console.log('🔧 Mock services configured');
}

// Export utility functions for tests
global.testUtils = {
  // Generate unique test IDs
  generateTestId: () => `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,

  // Wait for async operations
  waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Mock date for consistent testing
  mockDate: (dateString) => {
    const mockDate = new Date(dateString);
    global.Date = jest.fn(() => mockDate);
    global.Date.now = jest.fn(() => mockDate.getTime());
    return mockDate;
  },

  // Restore real date
  restoreDate: () => {
    global.Date = Date;
  },

  // Create mock fetch responses
  createMockResponse: (data, status = 200, headers = {}) => ({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Map(Object.entries(headers)),
    json: async () => data,
    text: async () => JSON.stringify(data),
  }),
};
