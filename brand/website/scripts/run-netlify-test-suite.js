#!/usr/bin/env node

/**
 * Comprehensive Netlify Extension Management Test Suite Runner
 * Runs all test categories with proper sequencing and reporting
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class TestSuiteRunner {
  constructor(options = {}) {
    this.options = {
      parallel: options.parallel || false,
      skipE2e: options.skipE2e || false,
      skipPerformance: options.skipPerformance || false,
      skipSecurity: options.skipSecurity || false,
      onlyUnit: options.onlyUnit || false,
      verbose: options.verbose || false,
      coverage: options.coverage !== false,
      ...options
    };

    this.results = {
      unit: { status: 'pending', duration: 0, error: null },
      api: { status: 'pending', duration: 0, error: null },
      components: { status: 'pending', duration: 0, error: null },
      integration: { status: 'pending', duration: 0, error: null },
      e2e: { status: 'pending', duration: 0, error: null },
      performance: { status: 'pending', duration: 0, error: null },
      accessibility: { status: 'pending', duration: 0, error: null },
      security: { status: 'pending', duration: 0, error: null },
      coverage: { status: 'pending', duration: 0, error: null }
    };

    this.startTime = Date.now();
  }

  async runAllTests() {
    console.log('🧪 Starting Comprehensive Netlify Extension Management Test Suite');
    console.log('================================================================');
    console.log(`Options: ${JSON.stringify(this.options, null, 2)}`);
    console.log('');

    try {
      if (this.options.onlyUnit) {
        await this.runUnitTests();
      } else {
        await this.runSequentialTests();
      }

      await this.generateFinalReport();
      return this.results;
    } catch (error) {
      console.error('💥 Test suite failed:', error.message);
      process.exit(1);
    }
  }

  async runSequentialTests() {
    const testSequence = [
      { name: 'unit', fn: () => this.runUnitTests() },
      { name: 'api', fn: () => this.runApiTests() },
      { name: 'components', fn: () => this.runComponentTests() },
      { name: 'integration', fn: () => this.runIntegrationTests() }
    ];

    if (!this.options.skipE2e) {
      testSequence.push({ name: 'e2e', fn: () => this.runE2eTests() });
      testSequence.push({ name: 'accessibility', fn: () => this.runAccessibilityTests() });
    }

    if (!this.options.skipPerformance) {
      testSequence.push({ name: 'performance', fn: () => this.runPerformanceTests() });
    }

    if (!this.options.skipSecurity) {
      testSequence.push({ name: 'security', fn: () => this.runSecurityTests() });
    }

    if (this.options.coverage) {
      testSequence.push({ name: 'coverage', fn: () => this.runCoverageValidation() });
    }

    // Run tests sequentially
    for (const test of testSequence) {
      await this.runTest(test.name, test.fn);
    }
  }

  async runTest(name, testFn) {
    const start = Date.now();
    console.log(`\n🔄 Running ${name} tests...`);

    try {
      await testFn();
      this.results[name].status = 'passed';
      console.log(`✅ ${name} tests passed`);
    } catch (error) {
      this.results[name].status = 'failed';
      this.results[name].error = error.message;
      console.error(`❌ ${name} tests failed:`, error.message);

      if (!this.options.continueOnFailure) {
        throw error;
      }
    } finally {
      this.results[name].duration = Date.now() - start;
    }
  }

  async runUnitTests() {
    return this.runCommand('npm test -- __tests__/api/netlify-api-client.test.ts --coverage');
  }

  async runApiTests() {
    return this.runCommand('npm test -- __tests__/api/netlify-endpoints.test.ts');
  }

  async runComponentTests() {
    return this.runCommand('npm test -- __tests__/components/netlify/');
  }

  async runIntegrationTests() {
    return this.runCommand('npm test -- __tests__/integration/netlify-workflows.test.ts');
  }

  async runE2eTests() {
    // Install playwright browsers if needed
    await this.runCommand('npx playwright install --with-deps');
    return this.runCommand('npx playwright test __tests__/e2e/netlify-extension-management.spec.ts');
  }

  async runPerformanceTests() {
    // Check if K6 is installed
    try {
      execSync('which k6', { stdio: 'ignore' });
    } catch (error) {
      throw new Error('K6 is not installed. Please install K6 for performance testing.');
    }

    await this.runCommand('k6 run __tests__/performance/k6/netlify-api-load-test.js');
    return this.runCommand('k6 run __tests__/performance/k6/websocket-performance-test.js');
  }

  async runAccessibilityTests() {
    return this.runCommand('npx playwright test __tests__/accessibility/netlify-accessibility.test.ts');
  }

  async runSecurityTests() {
    return this.runCommand('npm test -- __tests__/security/netlify-security.test.ts');
  }

  async runCoverageValidation() {
    return this.runCommand('node scripts/check-coverage.js');
  }

  async runCommand(command) {
    return new Promise((resolve, reject) => {
      const child = spawn('sh', ['-c', command], {
        stdio: this.options.verbose ? 'inherit' : 'pipe',
        cwd: process.cwd()
      });

      let stdout = '';
      let stderr = '';

      if (!this.options.verbose) {
        child.stdout?.on('data', (data) => {
          stdout += data.toString();
        });

        child.stderr?.on('data', (data) => {
          stderr += data.toString();
        });
      }

      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          const error = new Error(`Command failed: ${command}\n${stderr}`);
          error.stdout = stdout;
          error.stderr = stderr;
          reject(error);
        }
      });

      child.on('error', reject);
    });
  }

  async generateFinalReport() {
    const totalDuration = Date.now() - this.startTime;
    const passed = Object.values(this.results).filter(r => r.status === 'passed').length;
    const failed = Object.values(this.results).filter(r => r.status === 'failed').length;
    const pending = Object.values(this.results).filter(r => r.status === 'pending').length;

    console.log('\n🏁 Test Suite Complete');
    console.log('=====================');
    console.log(`Total Duration: ${Math.round(totalDuration / 1000)}s`);
    console.log(`Passed: ${passed}, Failed: ${failed}, Skipped: ${pending}`);
    console.log('');

    // Detailed results
    Object.entries(this.results).forEach(([name, result]) => {
      const status = result.status === 'passed' ? '✅' :
                    result.status === 'failed' ? '❌' : '⏭️';
      const duration = result.duration > 0 ? ` (${Math.round(result.duration / 1000)}s)` : '';

      console.log(`${status} ${name.padEnd(15)}: ${result.status}${duration}`);

      if (result.error && this.options.verbose) {
        console.log(`   Error: ${result.error}`);
      }
    });

    // Save results to file
    const reportPath = path.join(__dirname, '../reports/test-suite-results.json');
    const reportsDir = path.dirname(reportPath);

    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      options: this.options,
      results: this.results,
      summary: { passed, failed, pending, totalDuration },
      success: failed === 0
    }, null, 2));

    console.log(`\n📄 Detailed report saved to: ${reportPath}`);

    if (failed > 0) {
      console.log('\n❌ Some tests failed. Check the detailed output above.');
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed successfully!');
    }
  }
}

// CLI interface
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  args.forEach(arg => {
    switch (arg) {
      case '--parallel':
        options.parallel = true;
        break;
      case '--skip-e2e':
        options.skipE2e = true;
        break;
      case '--skip-performance':
        options.skipPerformance = true;
        break;
      case '--skip-security':
        options.skipSecurity = true;
        break;
      case '--only-unit':
        options.onlyUnit = true;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--no-coverage':
        options.coverage = false;
        break;
      case '--continue-on-failure':
        options.continueOnFailure = true;
        break;
      case '--help':
        console.log(`
Usage: node run-netlify-test-suite.js [options]

Options:
  --parallel              Run tests in parallel where possible
  --skip-e2e             Skip end-to-end tests
  --skip-performance     Skip performance tests
  --skip-security        Skip security tests
  --only-unit           Run only unit tests
  --verbose              Show detailed output
  --no-coverage         Skip coverage validation
  --continue-on-failure Continue running tests even if some fail
  --help                Show this help message

Examples:
  node run-netlify-test-suite.js                    # Run all tests
  node run-netlify-test-suite.js --only-unit        # Quick unit test run
  node run-netlify-test-suite.js --skip-e2e         # Skip E2E tests
  node run-netlify-test-suite.js --verbose          # Verbose output
`);
        process.exit(0);
      default:
        if (arg.startsWith('--')) {
          console.warn(`Unknown option: ${arg}`);
        }
    }
  });

  return options;
}

// Run if called directly
if (require.main === module) {
  const options = parseArgs();
  const runner = new TestSuiteRunner(options);
  runner.runAllTests().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = TestSuiteRunner;
