#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Comprehensive Animation Test Runner
 * 
 * This script runs all animation-related tests with proper configuration
 * and generates comprehensive reports.
 */

const TEST_SUITES = {
  unit: {
    name: 'Unit Tests',
    pattern: '__tests__/{hooks,components}/**/*.test.{ts,tsx}',
    timeout: 30000
  },
  integration: {
    name: 'Integration Tests',
    pattern: '__tests__/integration/**/*.test.{ts,tsx}',
    timeout: 60000
  },
  api: {
    name: 'API Tests',
    pattern: '__tests__/api/**/*.test.{ts,tsx}',
    timeout: 30000
  },
  performance: {
    name: 'Performance Tests',
    pattern: '__tests__/performance/**/*.test.{ts,tsx}',
    timeout: 120000
  },
  e2e: {
    name: 'End-to-End Tests',
    pattern: '__tests__/e2e/**/*.spec.{ts,tsx}',
    timeout: 180000,
    tool: 'playwright'
  }
};

const CONFIG = {
  maxWorkers: '50%',
  coverage: true,
  verbose: true,
  bail: false,
  timeout: 30000
};

class TestRunner {
  constructor() {
    this.results = {};
    this.startTime = Date.now();
  }

  async runJestTests(suite, options = {}) {
    const jestArgs = [
      '--testPathPattern', suite.pattern,
      '--testTimeout', (options.timeout || suite.timeout).toString(),
      '--maxWorkers', CONFIG.maxWorkers
    ];

    if (CONFIG.coverage && suite.name !== 'Performance Tests') {
      jestArgs.push('--coverage');
      jestArgs.push('--coverageDirectory', `coverage/animation/${suite.name.toLowerCase().replace(/\s+/g, '-')}`);
    }

    if (CONFIG.verbose) {
      jestArgs.push('--verbose');
    }

    if (options.updateSnapshots) {
      jestArgs.push('--updateSnapshot');
    }

    console.log(`\n🧪 Running ${suite.name}...`);
    console.log(`Command: jest ${jestArgs.join(' ')}\n`);

    return new Promise((resolve) => {
      const jest = spawn('npx', ['jest', ...jestArgs], {
        stdio: 'inherit',
        cwd: process.cwd()
      });

      const timeout = setTimeout(() => {
        jest.kill('SIGTERM');
        console.error(`\n❌ ${suite.name} timed out after ${suite.timeout}ms\n`);
        resolve({ success: false, error: 'timeout' });
      }, suite.timeout + 10000); // Add buffer time

      jest.on('close', (code) => {
        clearTimeout(timeout);
        const success = code === 0;
        
        console.log(`\n${success ? '✅' : '❌'} ${suite.name} ${success ? 'passed' : 'failed'}\n`);
        
        resolve({ success, code });
      });

      jest.on('error', (error) => {
        clearTimeout(timeout);
        console.error(`\n❌ ${suite.name} error:`, error.message, '\n');
        resolve({ success: false, error: error.message });
      });
    });
  }

  async runPlaywrightTests(suite, options = {}) {
    const playwrightArgs = [
      'test',
      suite.pattern,
      '--timeout', (options.timeout || suite.timeout).toString()
    ];

    if (options.headed) {
      playwrightArgs.push('--headed');
    }

    if (options.debug) {
      playwrightArgs.push('--debug');
    }

    console.log(`\n🎭 Running ${suite.name} with Playwright...`);
    console.log(`Command: playwright ${playwrightArgs.join(' ')}\n`);

    return new Promise((resolve) => {
      const playwright = spawn('npx', ['playwright', ...playwrightArgs], {
        stdio: 'inherit',
        cwd: process.cwd(),
        env: {
          ...process.env,
          PLAYWRIGHT_TEST_BASE_URL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000'
        }
      });

      const timeout = setTimeout(() => {
        playwright.kill('SIGTERM');
        console.error(`\n❌ ${suite.name} timed out after ${suite.timeout}ms\n`);
        resolve({ success: false, error: 'timeout' });
      }, suite.timeout + 30000); // Add more buffer for E2E

      playwright.on('close', (code) => {
        clearTimeout(timeout);
        const success = code === 0;
        
        console.log(`\n${success ? '✅' : '❌'} ${suite.name} ${success ? 'passed' : 'failed'}\n`);
        
        resolve({ success, code });
      });

      playwright.on('error', (error) => {
        clearTimeout(timeout);
        console.error(`\n❌ ${suite.name} error:`, error.message, '\n');
        resolve({ success: false, error: error.message });
      });
    });
  }

  async runSuite(suiteName, options = {}) {
    const suite = TEST_SUITES[suiteName];
    if (!suite) {
      throw new Error(`Unknown test suite: ${suiteName}`);
    }

    const startTime = Date.now();
    
    let result;
    if (suite.tool === 'playwright') {
      result = await this.runPlaywrightTests(suite, options);
    } else {
      result = await this.runJestTests(suite, options);
    }

    const duration = Date.now() - startTime;
    
    this.results[suiteName] = {
      ...result,
      duration,
      suite: suite.name
    };

    return result;
  }

  async runAll(options = {}) {
    console.log('🚀 Running Candlefish Animation Test Suite\n');
    console.log('Test Configuration:');
    console.log(`- Max Workers: ${CONFIG.maxWorkers}`);
    console.log(`- Coverage: ${CONFIG.coverage}`);
    console.log(`- Verbose: ${CONFIG.verbose}\n`);

    const suitesToRun = options.suites || Object.keys(TEST_SUITES);
    const results = [];

    for (const suiteName of suitesToRun) {
      if (options.skipE2e && suiteName === 'e2e') {
        console.log(`⏭️  Skipping ${TEST_SUITES[suiteName].name}`);
        continue;
      }

      const result = await this.runSuite(suiteName, options);
      results.push(result);

      if (!result.success && CONFIG.bail) {
        console.log('🛑 Bailing out due to test failure\n');
        break;
      }
    }

    this.printSummary();
    return this.results;
  }

  printSummary() {
    const totalTime = Date.now() - this.startTime;
    const totalSuites = Object.keys(this.results).length;
    const passedSuites = Object.values(this.results).filter(r => r.success).length;
    const failedSuites = totalSuites - passedSuites;

    console.log('\n' + '='.repeat(60));
    console.log('🎯 ANIMATION TEST SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`\nTotal Time: ${(totalTime / 1000).toFixed(2)}s`);
    console.log(`Total Suites: ${totalSuites}`);
    console.log(`Passed: ${passedSuites} ✅`);
    console.log(`Failed: ${failedSuites} ❌`);
    console.log(`Success Rate: ${((passedSuites / totalSuites) * 100).toFixed(1)}%`);

    console.log('\nDetailed Results:');
    for (const [suite, result] of Object.entries(this.results)) {
      const status = result.success ? '✅' : '❌';
      const duration = (result.duration / 1000).toFixed(2);
      console.log(`  ${status} ${result.suite}: ${duration}s`);
      
      if (!result.success && result.error) {
        console.log(`    Error: ${result.error}`);
      }
    }

    if (CONFIG.coverage) {
      console.log('\n📊 Coverage reports generated in:');
      console.log('  - coverage/animation/unit/');
      console.log('  - coverage/animation/integration/');
      console.log('  - coverage/animation/api/');
    }

    console.log('\n' + '='.repeat(60));
  }
}

// CLI Interface
const args = process.argv.slice(2);
const options = {
  suites: [],
  skipE2e: args.includes('--skip-e2e'),
  updateSnapshots: args.includes('--update-snapshots'),
  headed: args.includes('--headed'),
  debug: args.includes('--debug'),
  bail: args.includes('--bail')
};

// Parse suite arguments
if (args.includes('--unit')) options.suites.push('unit');
if (args.includes('--integration')) options.suites.push('integration');
if (args.includes('--api')) options.suites.push('api');
if (args.includes('--performance')) options.suites.push('performance');
if (args.includes('--e2e')) options.suites.push('e2e');

// If no specific suites requested, run all
if (options.suites.length === 0) {
  options.suites = Object.keys(TEST_SUITES);
}

// Apply global options
if (options.bail) {
  CONFIG.bail = true;
}

async function main() {
  const runner = new TestRunner();
  
  try {
    await runner.runAll(options);
    
    const failedSuites = Object.values(runner.results).filter(r => !r.success).length;
    process.exit(failedSuites > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Test runner failed:', error.message);
    process.exit(1);
  }
}

// Help text
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🧪 Candlefish Animation Test Runner

Usage: node run-animation-tests.js [options]

Test Suites:
  --unit            Run unit tests
  --integration     Run integration tests  
  --api            Run API tests
  --performance    Run performance tests
  --e2e            Run end-to-end tests

Options:
  --skip-e2e       Skip E2E tests (faster CI runs)
  --update-snapshots  Update Jest snapshots
  --headed         Run E2E tests in headed mode
  --debug          Run E2E tests in debug mode
  --bail           Stop on first failure
  --help, -h       Show this help

Examples:
  node run-animation-tests.js                    # Run all tests
  node run-animation-tests.js --unit --api       # Run only unit and API tests
  node run-animation-tests.js --skip-e2e         # Run all except E2E tests
  node run-animation-tests.js --e2e --headed     # Run E2E tests with browser visible
`);
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { TestRunner, TEST_SUITES };