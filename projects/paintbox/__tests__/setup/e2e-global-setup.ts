import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global E2E test setup...');

  // Wait for the development server to be ready
  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';

  console.log(`📡 Waiting for server at ${baseURL}...`);

  // Check if server is ready
  let serverReady = false;
  let attempts = 0;
  const maxAttempts = 30; // 30 seconds timeout

  while (!serverReady && attempts < maxAttempts) {
    try {
      const response = await fetch(`${baseURL}/`);
      if (response.ok) {
        serverReady = true;
        console.log('✅ Server is ready!');
      }
    } catch (error) {
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  if (!serverReady) {
    console.error('❌ Server not ready after 30 seconds');
    throw new Error('Server not ready for testing');
  }

  // Set up test browser context with clean state
  const browser = await chromium.launch();
  const context = await browser.newContext();

  // Clear any existing storage
  await context.clearCookies();
  await context.clearPermissions();

  await browser.close();

  console.log('✅ Global setup completed successfully');
}

export default globalSetup;
