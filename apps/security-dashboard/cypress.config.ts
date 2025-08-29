import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3005',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    videosFolder: 'cypress/videos',
    screenshotsFolder: 'cypress/screenshots',
    video: true,
    screenshotOnRunFailure: true,
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    env: {
      apiUrl: 'http://localhost:4000/graphql',
      wsUrl: 'ws://localhost:4000/graphql',
      testUser: {
        email: 'test@company.com',
        password: 'testPassword123!',
        role: 'SECURITY_ANALYST',
      },
      adminUser: {
        email: 'admin@company.com',
        password: 'adminPassword123!',
        role: 'SECURITY_ADMIN',
      },
    },
    setupNodeEvents(on, config) {
      // Database seeding and cleanup
      on('task', {
        seedDatabase: async () => {
          // Implement database seeding for tests
          const { seedTestData } = await import('./cypress/support/database');
          return seedTestData();
        },
        
        cleanDatabase: async () => {
          // Clean up test data
          const { cleanTestData } = await import('./cypress/support/database');
          return cleanTestData();
        },

        // Mock external services
        mockThreatIntelligenceAPI: (mockData) => {
          // Mock threat intelligence API responses
          return mockData;
        },

        // Generate test data
        generateSecurityEvents: (count: number = 10) => {
          const events = [];
          for (let i = 0; i < count; i++) {
            events.push({
              id: `test-evt-${i}`,
              type: 'MALWARE_DETECTED',
              severity: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'][i % 4],
              timestamp: new Date(Date.now() - i * 60000).toISOString(),
              source: `192.168.1.${100 + i}`,
              description: `Test security event ${i}`,
            });
          }
          return events;
        },

        log: (message: string) => {
          console.log(message);
          return null;
        },
      });

      // Code coverage
      require('@cypress/code-coverage/task')(on, config);
      
      return config;
    },
  },

  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
    specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}',
  },
});