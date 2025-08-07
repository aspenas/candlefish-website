import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up E2E test environment...');
  
  // Add any global cleanup logic here
  // - Close database connections
  // - Clean up test data
  // - Reset services
  
  console.log('✅ E2E test environment cleaned up');
}

export default globalTeardown;