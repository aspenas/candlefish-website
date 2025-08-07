/**
 * Global teardown for Playwright E2E tests.
 * Cleans up test data and environment.
 */

import { chromium, FullConfig } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown...');

  const baseURL = config.projects[0].use?.baseURL || 'http://localhost:3000';

  // Launch browser for cleanup
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Load authentication state if available
    const authStatePath = 'e2e/auth-state.json';
    if (fs.existsSync(authStatePath)) {
      await page.context().addInitScript(() => {
        // Load auth token from storage
        const authState = JSON.parse(localStorage.getItem('auth-state') || '{}');
        if (authState.token) {
          localStorage.setItem('authToken', authState.token);
        }
      });
    }

    await page.goto(baseURL);

    // Clean up test data
    await cleanupTestData(page);

    // Clean up test alert rules
    await cleanupTestAlertRules(page);

    // Clean up test files
    cleanupTestFiles();

  } catch (error) {
    console.error('❌ Global teardown error:', error);
    // Don't throw - we want cleanup to be best-effort
  } finally {
    await browser.close();
  }

  console.log('✅ Global teardown completed');
}

async function cleanupTestData(page: any) {
  console.log('🗑️ Cleaning up test data...');

  try {
    // Remove test metrics
    await page.evaluate(() => {
      // Call API to clean up test metrics if such endpoint exists
      const authToken = localStorage.getItem('authToken');
      if (authToken) {
        fetch('/api/v1/metrics/cleanup', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filter: { environment: 'test' }
          }),
        }).catch(() => {
          // Ignore cleanup failures
        });
      }
    });

    // Clear test deployments from localStorage
    await page.evaluate(() => {
      localStorage.removeItem('e2e-test-deployments');
    });

    console.log('✅ Test data cleanup completed');
  } catch (error) {
    console.warn('⚠️ Test data cleanup failed (non-critical):', error);
  }
}

async function cleanupTestAlertRules(page: any) {
  console.log('🚨 Cleaning up test alert rules...');

  try {
    await page.evaluate(async () => {
      const authToken = localStorage.getItem('authToken');
      if (!authToken) return;

      // Get all alert rules
      const response = await fetch('/api/v1/alerts/rules', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (!response.ok) return;

      const data = await response.json();
      const testRules = data.rules?.filter((rule: any) => 
        rule.name.startsWith('E2E Test ')
      ) || [];

      // Delete test alert rules
      for (const rule of testRules) {
        await fetch(`/api/v1/alerts/rules/${rule.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        }).catch(() => {
          // Ignore deletion failures
        });
      }
    });

    console.log('✅ Test alert rules cleanup completed');
  } catch (error) {
    console.warn('⚠️ Alert rules cleanup failed (non-critical):', error);
  }
}

function cleanupTestFiles() {
  console.log('📁 Cleaning up test files...');

  try {
    // Remove authentication state file
    const authStatePath = 'e2e/auth-state.json';
    if (fs.existsSync(authStatePath)) {
      fs.unlinkSync(authStatePath);
    }

    // Clean up screenshot/video files older than 7 days
    const testResultsDir = 'test-results';
    if (fs.existsSync(testResultsDir)) {
      const files = fs.readdirSync(testResultsDir);
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

      files.forEach(file => {
        const filePath = path.join(testResultsDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime.getTime() < sevenDaysAgo) {
          if (stats.isDirectory()) {
            fs.rmSync(filePath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(filePath);
          }
        }
      });
    }

    console.log('✅ Test files cleanup completed');
  } catch (error) {
    console.warn('⚠️ Test files cleanup failed (non-critical):', error);
  }
}

export default globalTeardown;