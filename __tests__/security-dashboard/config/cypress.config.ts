import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    // Base URL for the Security Dashboard
    baseUrl: 'http://localhost:3000',
    
    // Viewport settings
    viewportWidth: 1280,
    viewportHeight: 720,
    
    // Test files
    specPattern: '**/__tests__/security-dashboard/e2e/**/*.cy.{ts,tsx}',
    excludeSpecPattern: [
      '**/node_modules/**',
      '**/coverage/**',
    ],
    
    // Support file
    supportFile: '../support/e2e.ts',
    
    // Fixtures
    fixturesFolder: '../fixtures',
    
    // Screenshots and videos
    screenshotsFolder: '../screenshots',
    videosFolder: '../videos',
    video: true,
    screenshotOnRunFailure: true,
    
    // Test execution settings
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    pageLoadTimeout: 30000,
    
    // Retry settings
    retries: {
      runMode: 2,
      openMode: 0,
    },
    
    // Performance and memory
    watchForFileChanges: false,
    chromeWebSecurity: false,
    
    // Browser settings
    experimentalStudio: true,
    experimentalWebKitSupport: true,
    
    setupNodeEvents(on, config) {
      // Code coverage
      require('@cypress/code-coverage/task')(on, config);
      
      // Custom tasks
      on('task', {
        // Database seeding
        'db:seed': () => {
          // Seed test database with security data
          return null;
        },
        
        // Clean up test data
        'db:cleanup': () => {
          // Clean up test data after tests
          return null;
        },
        
        // Performance monitoring
        'performance:start': () => {
          console.log('Performance monitoring started');
          return null;
        },
        
        'performance:stop': () => {
          console.log('Performance monitoring stopped');
          return null;
        },
        
        // WebSocket testing utilities
        'websocket:connect': (url) => {
          // Connect to WebSocket for testing
          return { connected: true, url };
        },
        
        // Log custom messages
        log(message) {
          console.log(message);
          return null;
        },
      });
      
      // Environment-specific configuration
      if (config.env.CI) {
        // CI-specific settings
        config.video = true;
        config.screenshotOnRunFailure = true;
        config.browser = 'chrome';
      }
      
      return config;
    },
  },
  
  component: {
    devServer: {
      framework: 'vite',
      bundler: 'vite',
    },
    specPattern: '**/__tests__/security-dashboard/components/**/*.cy.{ts,tsx}',
    supportFile: '../support/component.ts',
    indexHtmlFile: '../support/component-index.html',
  },
  
  env: {
    // Test environment variables
    NODE_ENV: 'test',
    API_BASE_URL: 'http://localhost:3001/api',
    WS_BASE_URL: 'ws://localhost:3001',
    COVERAGE: true,
    
    // Authentication
    TEST_USER_EMAIL: 'admin@candlefish.ai',
    TEST_USER_PASSWORD: 'SecurePassword123!',
    TEST_ANALYST_EMAIL: 'analyst@candlefish.ai',
    TEST_ANALYST_PASSWORD: 'AnalystPassword123!',
    
    // Feature flags for testing
    ENABLE_WEBSOCKET_TESTS: true,
    ENABLE_PERFORMANCE_TESTS: true,
    ENABLE_ACCESSIBILITY_TESTS: true,
  },
});