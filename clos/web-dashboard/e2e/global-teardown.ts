import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up E2E test environment...');
  
  // Clean up test data
  await cleanupTestData();
  
  // Clean up test files
  await cleanupTestFiles();
  
  console.log('✅ E2E test environment cleaned up');
}

async function cleanupTestData() {
  try {
    // Clean up test analytics data
    await fetch('http://localhost:3501/api/v1/analytics/test-data', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('✅ Test data cleaned up');
  } catch (error) {
    console.warn('⚠️ Could not clean up test data:', error instanceof Error ? error.message : String(error));
  }
}

async function cleanupTestFiles() {
  const fs = require('fs');
  const path = require('path');
  
  try {
    // Remove session files
    const authDir = path.join(__dirname, 'auth');
    if (fs.existsSync(authDir)) {
      fs.rmSync(authDir, { recursive: true, force: true });
    }
    
    // Remove temporary screenshots/videos that might be left over
    const tempDir = path.join(__dirname, '../test-results');
    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir);
      files.forEach((file: string) => {
        if (file.includes('temp') || file.includes('tmp')) {
          fs.unlinkSync(path.join(tempDir, file));
        }
      });
    }
    
    console.log('✅ Test files cleaned up');
  } catch (error) {
    console.warn('⚠️ Could not clean up test files:', error instanceof Error ? error.message : String(error));
  }
}

export default globalTeardown;