import { defineConfig } from 'cypress';
import { addCucumberPreprocessorPlugin } from '@badeball/cypress-cucumber-preprocessor';
import createBundler from '@bahmutov/cypress-esbuild-preprocessor';
import { createEsbuildPlugin } from '@badeball/cypress-cucumber-preprocessor/esbuild';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: [
      'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
      'cypress/e2e/**/*.feature'
    ],

    // Viewport settings
    viewportWidth: 1280,
    viewportHeight: 720,

    // Test settings
    defaultCommandTimeout: 10000,
    pageLoadTimeout: 30000,
    requestTimeout: 10000,
    responseTimeout: 10000,

    // Video and screenshot settings
    video: true,
    screenshotOnRunFailure: true,
    videosFolder: 'cypress/videos',
    screenshotsFolder: 'cypress/screenshots',

    // Retry settings
    retries: {
      runMode: 2,
      openMode: 0,
    },

    // Environment variables
    env: {
      apiUrl: 'http://localhost:3001',
      graphqlUrl: 'http://localhost:3001/graphql',
      authToken: '',
      testUser: {
        email: 'test@candlefish.ai',
        password: 'cypress-test-password',
        name: 'Cypress Test User',
      },
    },

    async setupNodeEvents(on, config) {
      // Cucumber preprocessor
      await addCucumberPreprocessorPlugin(on, config);

      // ESBuild bundler for TypeScript support
      on(
        'file:preprocessor',
        createBundler({
          plugins: [createEsbuildPlugin(config)],
        })
      );

      // Custom tasks
      on('task', {
        // Database seeding and cleanup
        async seedDatabase() {
          // Seed test data
          console.log('Seeding test database...');
          return null;
        },

        async cleanDatabase() {
          // Clean test data
          console.log('Cleaning test database...');
          return null;
        },

        // API mocking
        async setupApiMocks() {
          // Setup API mocks for tests
          console.log('Setting up API mocks...');
          return null;
        },

        // File operations
        async readFile(filename: string) {
          const fs = require('fs');
          return fs.readFileSync(filename, 'utf8');
        },

        async writeFile({ filename, content }: { filename: string; content: string }) {
          const fs = require('fs');
          fs.writeFileSync(filename, content);
          return null;
        },

        // Performance metrics
        async getPerformanceMetrics() {
          // Collect performance metrics
          return {
            loadTime: 0,
            renderTime: 0,
            memoryUsage: 0,
          };
        },
      });

      // Browser launch options
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.name === 'chrome') {
          // Chrome-specific flags
          launchOptions.args.push('--disable-features=VizDisplayCompositor');
          launchOptions.args.push('--disable-dev-shm-usage');
          launchOptions.args.push('--no-sandbox');

          // For testing PWA features
          launchOptions.args.push('--enable-features=NetworkService');
          launchOptions.args.push('--enable-automation');
        }

        return launchOptions;
      });

      return config;
    },
  },

  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
    supportFile: 'cypress/support/component.ts',
    specPattern: 'cypress/component/**/*.cy.{js,jsx,ts,tsx}',
  },

  // Global configuration
  chromeWebSecurity: false,
  modifyObstructiveCode: false,
  experimentalStudio: true,
  experimentalWebKitSupport: true,

  // Timeouts
  taskTimeout: 60000,
  execTimeout: 60000,

  // File patterns to ignore
  excludeSpecPattern: [
    '**/__snapshots__/*',
    '**/__image_snapshots__/*',
  ],
});
