import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for E2E tests...');
  
  // Start mock API server if needed
  if (process.env.E2E_USE_MOCK_API !== 'false') {
    console.log('📡 Starting mock API server...');
    // Start mock server here if needed
  }
  
  // Pre-warm the browser cache
  console.log('🌡️ Pre-warming browser cache...');
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Visit the app to warm up
    await page.goto(config.projects[0].use?.baseURL || 'http://localhost:5173');
    await page.waitForLoadState('networkidle');
    console.log('✅ App pre-warmed successfully');
  } catch (error) {
    console.warn('⚠️ Failed to pre-warm app:', error);
  } finally {
    await context.close();
    await browser.close();
  }
  
  console.log('✅ Global setup completed');
}

export default globalSetup;