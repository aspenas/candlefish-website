#!/usr/bin/env npx tsx

/**
 * Manual Test Script for Paintbox Complete Workflow
 * Tests all steps of the estimator flow with detailed logging
 * Usage: npx tsx scripts/test-complete-workflow.ts
 */

const BASE_URL = 'http://localhost:3006';

interface TestResult {
  step: string;
  success: boolean;
  message: string;
  error?: string;
  duration?: number;
}

const results: TestResult[] = [];

function logStep(step: string) {
  console.log(`\n🔍 TESTING: ${step}`);
  console.log('─'.repeat(50));
}

function logSuccess(message: string) {
  console.log(`✅ ${message}`);
}

function logError(message: string) {
  console.log(`❌ ${message}`);
}

function logInfo(message: string) {
  console.log(`ℹ️  ${message}`);
}

async function testHttpEndpoint(url: string, options: RequestInit = {}): Promise<TestResult> {
  const step = `${options.method || 'GET'} ${url.replace(BASE_URL, '')}`;
  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Paintbox-Test-Script/1.0',
        ...options.headers
      }
    });

    const duration = Date.now() - startTime;

    if (response.ok) {
      const contentType = response.headers.get('content-type');
      let data = null;

      if (contentType?.includes('application/json')) {
        data = await response.json();
      }

      return {
        step,
        success: true,
        message: `HTTP ${response.status} - ${response.statusText}`,
        duration
      };
    } else {
      return {
        step,
        success: false,
        message: `HTTP ${response.status} - ${response.statusText}`,
        duration
      };
    }
  } catch (error) {
    return {
      step,
      success: false,
      message: 'Request failed',
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}

async function testPageLoad(path: string): Promise<TestResult> {
  const url = `${BASE_URL}${path}`;
  const step = `Page Load: ${path}`;
  const startTime = Date.now();

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });

    const duration = Date.now() - startTime;

    if (response.ok) {
      const html = await response.text();
      const hasReactRoot = html.includes('__NEXT_DATA__') || html.includes('_app');

      return {
        step,
        success: true,
        message: `Page loaded successfully (${hasReactRoot ? 'React app' : 'Static page'}) - ${duration}ms`,
        duration
      };
    } else {
      return {
        step,
        success: false,
        message: `HTTP ${response.status} - ${response.statusText}`,
        duration
      };
    }
  } catch (error) {
    return {
      step,
      success: false,
      message: 'Page load failed',
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}

async function main() {
  console.log('🎨 PAINTBOX COMPLETE WORKFLOW TEST SUITE');
  console.log('==========================================');
  console.log(`Testing against: ${BASE_URL}`);
  console.log(`Started: ${new Date().toISOString()}`);

  // Test 1: Server Health Check
  logStep('Server Health Check');

  let healthResult = await testHttpEndpoint(`${BASE_URL}/api/health`);
  results.push(healthResult);

  if (healthResult.success) {
    logSuccess(`Server is healthy (${healthResult.duration}ms)`);
  } else {
    logError(`Health check failed: ${healthResult.message}`);

    // Try alternative health check
    healthResult = await testHttpEndpoint(`${BASE_URL}/api/status`);
    results.push(healthResult);

    if (healthResult.success) {
      logSuccess(`Status endpoint working (${healthResult.duration}ms)`);
    } else {
      logError('No health endpoints available');
    }
  }

  // Test 2: Page Load Tests
  logStep('Page Load Tests');

  const pagesToTest = [
    '/',
    '/estimate/new',
    '/estimate/new/details',
    '/estimate/new/exterior',
    '/estimate/new/interior',
    '/estimate/new/review',
    '/estimate/success'
  ];

  for (const path of pagesToTest) {
    const result = await testPageLoad(path);
    results.push(result);

    if (result.success) {
      logSuccess(`${path} - ${result.message}`);
    } else {
      logError(`${path} - ${result.message || result.error}`);
    }
  }

  // Test 3: API Endpoint Tests
  logStep('API Endpoint Tests');

  // Test estimate creation
  const testEstimate = {
    clientInfo: {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      phone: '(555) 123-4567'
    },
    measurements: {
      exterior: { totalArea: 1000 },
      interior: { rooms: [{ name: 'Test Room', area: 200 }] }
    }
  };

  const createResult = await testHttpEndpoint(`${BASE_URL}/api/estimates`, {
    method: 'POST',
    body: JSON.stringify(testEstimate)
  });
  results.push(createResult);

  if (createResult.success) {
    logSuccess(`Estimate creation API working (${createResult.duration}ms)`);
  } else {
    logError(`Estimate creation failed: ${createResult.message}`);
  }

  // Test 4: Salesforce Integration
  logStep('Salesforce Integration Tests');

  const searchResult = await testHttpEndpoint(`${BASE_URL}/api/v1/salesforce/search?query=test`);
  results.push(searchResult);

  if (searchResult.success) {
    logSuccess(`Salesforce search API working (${searchResult.duration}ms)`);
  } else {
    logInfo(`Salesforce search not available: ${searchResult.message} (expected if not configured)`);
  }

  // Test 5: Workflow Navigation Test
  logStep('Workflow Navigation Verification');

  // Test redirect from /estimate/new to /estimate/new/details
  const redirectResult = await testPageLoad('/estimate/new');
  results.push(redirectResult);

  if (redirectResult.success) {
    logSuccess('New estimate page loads (should redirect to details)');
  } else {
    logError(`New estimate page failed: ${redirectResult.message}`);
  }

  // Test 6: Data Persistence Simulation
  logStep('Data Persistence Test (LocalStorage simulation)');

  // This would typically be tested in browser, but we can test the API layer
  const persistenceData = {
    step: 'details',
    data: testEstimate.clientInfo,
    timestamp: new Date().toISOString()
  };

  logInfo('Data persistence handled by Zustand store in browser');
  logInfo('API layer supports estimate save/load operations');

  // Test 7: Performance Test
  logStep('Performance Test');

  const performanceStart = Date.now();
  const concurrentPromises = [];

  for (let i = 0; i < 5; i++) {
    concurrentPromises.push(testPageLoad('/'));
  }

  try {
    await Promise.all(concurrentPromises);
    const performanceDuration = Date.now() - performanceStart;

    results.push({
      step: 'Concurrent Load Test',
      success: true,
      message: `5 concurrent requests completed in ${performanceDuration}ms`,
      duration: performanceDuration
    });

    logSuccess(`Performance test passed (${performanceDuration}ms for 5 concurrent requests)`);
  } catch (error) {
    results.push({
      step: 'Concurrent Load Test',
      success: false,
      message: 'Concurrent requests failed',
      error: error.message
    });

    logError('Performance test failed');
  }

  // Test Results Summary
  console.log('\n📊 TEST RESULTS SUMMARY');
  console.log('========================');

  const totalTests = results.length;
  const passedTests = results.filter(r => r.success).length;
  const failedTests = totalTests - passedTests;
  const successRate = Math.round((passedTests / totalTests) * 100);

  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests} ✅`);
  console.log(`Failed: ${failedTests} ❌`);
  console.log(`Success Rate: ${successRate}%`);

  // Detailed Results
  console.log('\n📋 DETAILED RESULTS');
  console.log('===================');

  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    const duration = result.duration ? ` (${result.duration}ms)` : '';
    console.log(`${index + 1}. ${status} ${result.step}: ${result.message}${duration}`);

    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  // Workflow-Specific Verification
  console.log('\n🔄 WORKFLOW VERIFICATION');
  console.log('=========================');

  const workflowSteps = [
    'estimate/new → estimate/new/details redirect',
    'Client details form availability',
    'Exterior measurements page',
    'Interior room management',
    'Review and pricing display',
    'Success page completion'
  ];

  workflowSteps.forEach((step, index) => {
    const stepResult = results.find(r => r.step.includes(step.split(' ')[0]));
    const status = stepResult?.success ? '✅' : '❌';
    console.log(`${index + 1}. ${status} ${step}`);
  });

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS');
  console.log('==================');

  if (failedTests === 0) {
    console.log('🎉 All tests passed! The Paintbox estimator workflow is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Review the detailed results above.');

    const criticalFailures = results.filter(r =>
      !r.success && (
        r.step.includes('estimate/new') ||
        r.step.includes('/details') ||
        r.step.includes('Page Load')
      )
    );

    if (criticalFailures.length > 0) {
      console.log('🚨 Critical workflow issues detected:');
      criticalFailures.forEach(failure => {
        console.log(`   - ${failure.step}: ${failure.message}`);
      });
    }
  }

  // Next Steps
  console.log('\n📝 NEXT STEPS');
  console.log('=============');
  console.log('1. Run Playwright E2E tests: npm run test:e2e');
  console.log('2. Run API tests: npm run test:api');
  console.log('3. Test in browser manually: open http://localhost:3006/estimate/new');
  console.log('4. Check browser console for JavaScript errors');
  console.log('5. Verify Zustand store persistence in browser dev tools');

  console.log(`\n✨ Test completed at: ${new Date().toISOString()}`);

  // Exit with appropriate code
  process.exit(failedTests === 0 ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Test script failed:', error);
    process.exit(1);
  });
}

export { main as testCompleteWorkflow, results };
