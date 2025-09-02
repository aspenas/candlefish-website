import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🧪 Setting up E2E test environment...');
  
  // Start services if not already running
  if (!process.env.CI) {
    console.log('📡 Services should be started by webServer config');
  }
  
  // Wait for services to be ready
  await waitForServices();
  
  // Setup test data
  await setupTestData();
  
  // Create admin user session for tests
  await setupAdminSession(config);
  
  console.log('✅ E2E test environment ready');
}

async function waitForServices() {
  const maxRetries = 30;
  const delay = 2000; // 2 seconds
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      // Check frontend
      const frontendResponse = await fetch('http://localhost:3500');
      if (!frontendResponse.ok) throw new Error('Frontend not ready');
      
      // Check API
      const apiResponse = await fetch('http://localhost:3501/api/health');
      if (!apiResponse.ok) throw new Error('API not ready');
      
      console.log('✅ All services are ready');
      return;
    } catch (error) {
      console.log(`⏳ Waiting for services... (${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Services failed to start within timeout');
}

async function setupTestData() {
  try {
    // Create test analytics data via API
    const testData = {
      agents: [
        {
          id: 'e2e-agent-1',
          name: 'E2E Test Agent 1',
          status: 'active',
          performance: {
            responseTime: 120,
            successRate: 98.5,
            errorRate: 1.5
          }
        },
        {
          id: 'e2e-agent-2',
          name: 'E2E Test Agent 2',
          status: 'inactive',
          performance: {
            responseTime: 150,
            successRate: 96.8,
            errorRate: 3.2
          }
        }
      ],
      services: [
        {
          name: 'e2e-api-server',
          status: 'healthy',
          responseTime: 89,
          uptime: 99.9,
          errorRate: 0.1
        },
        {
          name: 'e2e-web-dashboard',
          status: 'degraded',
          responseTime: 200,
          uptime: 98.5,
          errorRate: 1.5
        }
      ]
    };

    await fetch('http://localhost:3501/api/v1/analytics/test-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });
    
    console.log('✅ Test data created');
  } catch (error) {
    console.warn('⚠️ Could not create test data:', error instanceof Error ? error.message : String(error));
  }
}

async function setupAdminSession(config: FullConfig) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Login as admin user
    await page.goto('http://localhost:3500/login');
    
    await page.fill('[data-testid="username-input"]', 'admin');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    
    // Wait for successful login
    await page.waitForURL('http://localhost:3500/dashboard');
    
    // Save authenticated state
    await page.context().storageState({ path: './e2e/auth/admin-session.json' });
    
    console.log('✅ Admin session created');
  } catch (error) {
    console.warn('⚠️ Could not create admin session:', error instanceof Error ? error.message : String(error));
  } finally {
    await browser.close();
  }
}

export default globalSetup;