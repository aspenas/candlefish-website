import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown...');

  // Stop mock API server if started
  if (process.env.E2E_USE_MOCK_API !== 'false') {
    console.log('🛑 Stopping mock API server...');
    // Stop mock server here if needed
  }

  // Clean up any test data
  console.log('🗑️ Cleaning up test data...');

  console.log('✅ Global teardown completed');
}

export default globalTeardown;
