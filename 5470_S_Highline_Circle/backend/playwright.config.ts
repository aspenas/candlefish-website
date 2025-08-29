import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E testing
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory
  testDir: './tests/e2e',
  
  // Run tests in files in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['line'],
  ],
  
  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Record video on failure
    video: 'retain-on-failure',
    
    // Capture screenshot after each test
    screenshot: 'only-on-failure',
    
    // Global test timeout
    actionTimeout: 30000,
    navigationTimeout: 30000,
    
    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,
    
    // Extra HTTP headers
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
    },
  },
  
  // Global timeout for each test
  timeout: 60000,
  
  // Global setup
  globalSetup: require.resolve('./tests/config/global-setup-e2e'),
  globalTeardown: require.resolve('./tests/config/global-teardown-e2e'),
  
  // Test output directory
  outputDir: 'test-results/',
  
  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Chrome-specific settings
        launchOptions: {
          args: ['--disable-web-security', '--disable-features=VizDisplayCompositor'],
        },
      },
    },

    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        // Firefox-specific settings
        launchOptions: {
          firefoxUserPrefs: {
            'security.tls.insecure_fallback_hosts': 'localhost',
          },
        },
      },
    },

    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
      },
    },

    // Mobile testing
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
      },
    },
    
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 12'],
      },
    },

    // Tablet testing
    {
      name: 'iPad',
      use: {
        ...devices['iPad Pro'],
      },
    },

    // Microsoft Edge
    {
      name: 'Microsoft Edge',
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge',
      },
    },
  ],

  // Web server configuration for development server
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },

  // Test match patterns
  testMatch: [
    '**/*.spec.ts',
    '**/*.e2e.ts',
  ],

  // Test ignore patterns
  testIgnore: [
    '**/node_modules/**',
    '**/build/**',
    '**/dist/**',
  ],

  // Expect configuration
  expect: {
    // Global expect timeout
    timeout: 10000,
    
    // Screenshot comparisons
    threshold: 0.2,
    
    // Animation handling
    animations: 'disabled',
  },

  // Metadata for test runs
  metadata: {
    testType: 'e2e',
    environment: process.env.NODE_ENV || 'test',
    browser: process.env.BROWSER || 'chromium',
  },
});

// Environment-specific configurations
if (process.env.NODE_ENV === 'production') {
  // Production E2E testing configuration
  module.exports.use = {
    ...module.exports.use,
    baseURL: process.env.PRODUCTION_URL || 'https://your-app.com',
    headless: true,
    slowMo: 0,
  };
}

if (process.env.NODE_ENV === 'staging') {
  // Staging E2E testing configuration
  module.exports.use = {
    ...module.exports.use,
    baseURL: process.env.STAGING_URL || 'https://staging.your-app.com',
    headless: true,
    slowMo: 100,
  };
}

// Performance testing configuration
export const performanceConfig = defineConfig({
  ...module.exports,
  timeout: 120000, // Longer timeout for performance tests
  use: {
    ...module.exports.use,
    // Enable performance monitoring
    trace: 'on',
    video: 'on',
  },
  projects: [
    {
      name: 'performance',
      testDir: './tests/e2e/performance',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--no-sandbox',
            '--disable-setuid-sandbox',
          ],
        },
      },
    },
  ],
});

// Accessibility testing configuration
export const a11yConfig = defineConfig({
  ...module.exports,
  projects: [
    {
      name: 'accessibility',
      testDir: './tests/e2e/accessibility',
      use: {
        ...devices['Desktop Chrome'],
        // Enable accessibility features
        launchOptions: {
          args: [
            '--disable-web-security',
            '--force-prefers-reduced-motion',
            '--force-color-profile=srgb',
          ],
        },
      },
    },
  ],
});

// Load testing configuration
export const loadConfig = defineConfig({
  ...module.exports,
  timeout: 300000, // 5 minutes for load tests
  workers: 10, // More workers for load testing
  projects: [
    {
      name: 'load-testing',
      testDir: './tests/e2e/load',
      use: {
        ...devices['Desktop Chrome'],
        headless: true,
      },
    },
  ],
});

// Visual regression testing configuration
export const visualConfig = defineConfig({
  ...module.exports,
  expect: {
    ...module.exports.expect,
    // Stricter visual comparison for visual regression tests
    threshold: 0.1,
  },
  projects: [
    {
      name: 'visual-regression',
      testDir: './tests/e2e/visual',
      use: {
        ...devices['Desktop Chrome'],
        // Consistent viewport for visual testing
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
});