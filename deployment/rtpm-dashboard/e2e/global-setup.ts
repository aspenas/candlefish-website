/**
 * Global setup for Playwright E2E tests.
 * Initializes test environment and authentication.
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for E2E tests...');

  // Extract base URL from config
  const baseURL = config.projects[0].use?.baseURL || 'http://localhost:3000';

  console.log(`Base URL: ${baseURL}`);

  // Launch browser for setup
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Wait for application to be ready
    console.log('⏳ Waiting for application to be ready...');
    await page.goto(baseURL);

    // Wait for main application to load
    await page.waitForSelector('[data-testid="app"]', { timeout: 30000 });
    console.log('✅ Application is ready');

    // Set up test authentication
    await setupAuthentication(page);

    // Set up test data
    await setupTestData(page);

    // Verify API connectivity
    await verifyAPIConnectivity(page);

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }

  console.log('✅ Global setup completed successfully');
}

async function setupAuthentication(page: any) {
  console.log('🔑 Setting up authentication...');

  try {
    // Navigate to login if not already authenticated
    await page.goto('/login');

    // Check if already logged in
    const isDashboardVisible = await page.isVisible('[data-testid="dashboard"]');
    if (isDashboardVisible) {
      console.log('✅ Already authenticated');
      return;
    }

    // Perform login for test user
    await page.fill('[data-testid="username-input"]', 'test_user');
    await page.fill('[data-testid="password-input"]', 'test_password_123');
    await page.click('[data-testid="login-submit"]');

    // Wait for successful login
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });

    // Save authentication state
    await page.context().storageState({ path: 'e2e/auth-state.json' });

    console.log('✅ Authentication setup completed');
  } catch (error) {
    console.error('❌ Authentication setup failed:', error);
    throw error;
  }
}

async function setupTestData(page: any) {
  console.log('📊 Setting up test data...');

  try {
    // Create test alert rules
    await createTestAlertRules(page);

    // Inject test metrics
    await injectTestMetrics(page);

    // Set up test deployments
    await setupTestDeployments(page);

    console.log('✅ Test data setup completed');
  } catch (error) {
    console.error('❌ Test data setup failed:', error);
    // Don't throw here - some tests might work without full test data
  }
}

async function createTestAlertRules(page: any) {
  // Navigate to alerts management
  await page.goto('/alerts');

  // Create test alert rules via API calls
  await page.evaluate(() => {
    return fetch('/api/v1/alerts/rules', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      },
      body: JSON.stringify({
        name: 'E2E Test High CPU Alert',
        metric: 'cpu_usage',
        condition: 'greater_than',
        threshold: 80.0,
        duration: 300,
        severity: 'warning',
        enabled: true,
      }),
    });
  });

  await page.evaluate(() => {
    return fetch('/api/v1/alerts/rules', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      },
      body: JSON.stringify({
        name: 'E2E Test Memory Alert',
        metric: 'memory_usage',
        condition: 'greater_than',
        threshold: 90.0,
        duration: 600,
        severity: 'critical',
        enabled: true,
      }),
    });
  });
}

async function injectTestMetrics(page: any) {
  // Inject test metrics data
  const testMetrics = [
    {
      metric_name: 'cpu_usage',
      value: 75.5,
      timestamp: new Date().toISOString(),
      labels: { host: 'e2e-test-host-01', environment: 'test' },
    },
    {
      metric_name: 'memory_usage',
      value: 65.2,
      timestamp: new Date().toISOString(),
      labels: { host: 'e2e-test-host-01', environment: 'test' },
    },
    {
      metric_name: 'response_time',
      value: 125.7,
      timestamp: new Date().toISOString(),
      labels: { endpoint: '/api/health', method: 'GET' },
    },
  ];

  await page.evaluate((metrics) => {
    return fetch('/api/v1/metrics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      },
      body: JSON.stringify({ metrics }),
    });
  }, testMetrics);
}

async function setupTestDeployments(page: any) {
  // Mock Kubernetes deployments for testing
  await page.evaluate(() => {
    // This would typically interact with a test API or mock service
    // to set up test deployment states
    localStorage.setItem('e2e-test-deployments', JSON.stringify([
      {
        id: 'e2e-test-app-1',
        name: 'e2e-test-api',
        namespace: 'e2e-test',
        replicas: 3,
        readyReplicas: 3,
        status: 'Running',
        image: 'e2e-test-api:latest',
      },
      {
        id: 'e2e-test-app-2',
        name: 'e2e-test-frontend',
        namespace: 'e2e-test',
        replicas: 2,
        readyReplicas: 1,
        status: 'Updating',
        image: 'e2e-test-frontend:latest',
      },
    ]));
  });
}

async function verifyAPIConnectivity(page: any) {
  console.log('🔗 Verifying API connectivity...');

  try {
    const response = await page.evaluate(() => {
      return fetch('/api/health').then(res => res.json());
    });

    if (response.status !== 'healthy') {
      console.warn('⚠️ API health check returned non-healthy status:', response.status);
    } else {
      console.log('✅ API connectivity verified');
    }
  } catch (error) {
    console.error('❌ API connectivity check failed:', error);
    throw new Error('API is not accessible - cannot run E2E tests');
  }
}

export default globalSetup;
