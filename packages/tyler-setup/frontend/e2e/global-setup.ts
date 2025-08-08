import { chromium, FullConfig } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';

let backendProcess: ChildProcess;
let frontendProcess: ChildProcess;

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test environment...');

  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/tyler_e2e_test';
  process.env.REDIS_URL = 'redis://localhost:6379/2';
  process.env.JWT_SECRET = 'e2e-test-secret';
  process.env.REACT_APP_API_URL = 'http://localhost:3001';
  process.env.REACT_APP_GRAPHQL_URL = 'http://localhost:3001/graphql';

  // Wait for services to be ready
  await waitForService('http://localhost:3000', 60000, 'Frontend');
  await waitForService('http://localhost:3001/health', 60000, 'Backend API');

  // Create test user for authentication
  await setupTestUser();

  console.log('✅ E2E test environment ready');
}

async function waitForService(url: string, timeout: number, name: string): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log(`✅ ${name} is ready at ${url}`);
        return;
      }
    } catch (error) {
      // Service not ready yet
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  throw new Error(`${name} failed to start within ${timeout}ms`);
}

async function setupTestUser(): Promise<void> {
  try {
    // Create a browser instance for setup
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    // Navigate to the app and perform any necessary setup
    await page.goto('http://localhost:3000');

    // Store test credentials in browser local storage or session storage
    await page.evaluate(() => {
      localStorage.setItem('e2e_test_token', 'test-jwt-token');
      localStorage.setItem('e2e_test_user', JSON.stringify({
        id: 'test-user-id',
        username: 'testuser',
        email: 'test@example.com',
        role: 'admin'
      }));
    });

    await browser.close();
    console.log('✅ Test user setup completed');
  } catch (error) {
    console.error('❌ Test user setup failed:', error);
  }
}

export default globalSetup;
