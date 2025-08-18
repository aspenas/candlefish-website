import { defineConfig, devices } from '@playwright/test';

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
    ['json', { outputFile: 'test-results/e2e-results.json' }],
    ['junit', { outputFile: 'test-results/e2e-junit.xml' }],
    ...(process.env.CI ? [['github'] as const] : []),
  ],

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* Record video on failure */
    video: 'retain-on-failure',

    /* API endpoint for backend tests */
    extraHTTPHeaders: {
      'Authorization': `Bearer ${process.env.TEST_AUTH_TOKEN}`,
    },
  },

  /* Global setup and teardown */
  // globalSetup: require.resolve('./__tests__/setup/e2e-global-setup.ts'),
  // globalTeardown: require.resolve('./__tests__/setup/e2e-global-teardown.ts'),

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use incognito mode to avoid cross-test pollution
        contextOptions: {
          // Disable cache to ensure fresh state
          storageState: undefined,
        }
      },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Security-specific test configuration */
  timeout: 60000, // 60 seconds for security tests that may be slower
  expect: {
    timeout: 10000, // 10 seconds for assertions
  },

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run dev:next',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: true, // Always reuse existing server
  //   timeout: 120000, // 2 minutes to start the server
  // },


  /* Test output directory */
  outputDir: 'test-results/',

  /* Metadata */
  metadata: {
    testType: 'e2e-security',
    environment: process.env.NODE_ENV || 'test',
  },
})
