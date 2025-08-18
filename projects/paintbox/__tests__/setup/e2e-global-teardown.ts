import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global E2E test teardown...');

  // Clean up any test data if needed
  // This could include clearing test databases, removing uploaded files, etc.

  console.log('✅ Global teardown completed successfully');
}

export default globalTeardown;
