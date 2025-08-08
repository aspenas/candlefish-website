import { defineConfig, devices } from '@playwright/test'

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './__tests__/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
    process.env.CI ? ['github'] : ['list']
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.DASHBOARD_URL || 'http://localhost:5173',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* Record video on failure */
    video: 'retain-on-failure',

    /* Global timeout for each action */
    actionTimeout: 60000, // Extended for phased deployment scenarios

    /* Global timeout for navigation */
    navigationTimeout: 60000, // Extended for complex onboarding flows

    /* Extra HTTP headers for authentication in tests */
    extraHTTPHeaders: {
      'X-Test-Environment': 'playwright',
      'X-Test-Suite': 'phased-deployment'
    },

    /* Storage state for authenticated tests */
    storageState: process.env.STORAGE_STATE_PATH,

    /* Ignore HTTPS errors in test environment */
    ignoreHTTPSErrors: true,

    /* User agent for tests */
    userAgent: 'Claude-Resources-E2E-Tests/1.0',
  },

  /* Configure projects for major browsers */
  projects: [
    // Main test suite projects
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: ['**/*.spec.js', '**/*.test.js']
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testMatch: ['**/*.spec.js', '**/*.test.js']
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testMatch: ['**/*.spec.js', '**/*.test.js']
    },

    // Phased deployment specific tests
    {
      name: 'phased-deployment-admin',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/admin-user.json',
        baseURL: process.env.ADMIN_DASHBOARD_URL || 'http://localhost:5173/admin'
      },
      testMatch: ['**/admin-*.spec.js', '**/leadership-*.spec.js'],
      dependencies: ['setup-admin-auth']
    },

    {
      name: 'phased-deployment-user',
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/test-user.json'
      },
      testMatch: ['**/user-onboarding-*.spec.js', '**/onboarding-*.spec.js'],
      dependencies: ['setup-user-auth']
    },

    // Performance testing project
    {
      name: 'performance-tests',
      use: {
        ...devices['Desktop Chrome'],
        // Disable video/screenshots for performance tests
        video: 'off',
        screenshot: 'off'
      },
      testMatch: ['**/performance-*.spec.js', '**/load-*.spec.js'],
      timeout: 300000 // 5 minutes for performance tests
    },

    // Mobile testing for responsive onboarding
    {
      name: 'mobile-onboarding',
      use: { ...devices['Pixel 5'] },
      testMatch: ['**/user-onboarding-*.spec.js'],
      dependencies: ['setup-user-auth']
    },

    // Authentication setup projects
    {
      name: 'setup-admin-auth',
      testMatch: ['**/auth-setup-admin.spec.js'],
      teardown: 'cleanup-admin-auth'
    },

    {
      name: 'setup-user-auth',
      testMatch: ['**/auth-setup-user.spec.js'],
      teardown: 'cleanup-user-auth'
    },

    // Cleanup projects
    {
      name: 'cleanup-admin-auth',
      testMatch: ['**/auth-cleanup-admin.spec.js']
    },

    {
      name: 'cleanup-user-auth',
      testMatch: ['**/auth-cleanup-user.spec.js']
    },

    // Cross-browser compatibility for critical flows
    {
      name: 'compatibility-edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
      testMatch: ['**/critical-*.spec.js']
    },

    {
      name: 'compatibility-chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
      testMatch: ['**/critical-*.spec.js']
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: process.env.CI ? undefined : [
    {
      command: 'cd dashboard && npm run dev',
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
    },
    {
      command: 'npm run start:api',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
    }
  ],

  /* Test output directory */
  outputDir: 'test-results/',

  /* Global setup and teardown */
  globalSetup: './__tests__/setup/global-setup.js',
  globalTeardown: './__tests__/setup/global-teardown.js',

  /* Expect settings */
  expect: {
    /* Maximum timeout for assertions */
    timeout: 15000, // Extended for complex onboarding flows

    /* Threshold for screenshot comparisons */
    threshold: 0.3,

    /* Enable/disable animations during testing */
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      mode: 'css' // Use CSS to disable animations
    },
    toMatchSnapshot: {
      animations: 'disabled',
      caret: 'hide'
    }
  },

  /* Metadata */
  metadata: {
    'test-suite': 'Claude Resources Phased Deployment E2E Tests',
    'environment': process.env.NODE_ENV || 'test',
    'dashboard-url': process.env.DASHBOARD_URL || 'http://localhost:5173',
    'admin-dashboard-url': process.env.ADMIN_DASHBOARD_URL || 'http://localhost:5173/admin',
    'api-url': process.env.API_BASE_URL || 'http://localhost:3000',
    'test-data-version': '1.0.0',
    'phased-deployment-version': '2.1.0'
  },

  /* Test timeouts */
  timeout: 60000, // 1 minute default timeout

  /* Global test configuration */
  globalTimeout: 300000, // 5 minutes for entire test suite

  /* Maximum failures before stopping */
  maxFailures: process.env.CI ? 5 : undefined,

  /* Test directories */
  testIgnore: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.git/**'
  ]
})
