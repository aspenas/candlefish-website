#!/usr/bin/env node

/**
 * Comprehensive Test Runner for Netlify Extension Management System
 *
 * Runs all test suites in the correct order with proper reporting
 * and error handling. Includes performance benchmarking and
 * comprehensive coverage reporting.
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class TestRunner {
  constructor() {
    this.testResults = {};
    this.startTime = Date.now();
    this.verbose = process.argv.includes('--verbose') || process.argv.includes('-v');
    this.continueOnFailure = process.argv.includes('--continue-on-failure');
    this.skipE2E = process.argv.includes('--skip-e2e');
    this.skipPerf = process.argv.includes('--skip-performance');
    this.onlyUnit = process.argv.includes('--only-unit');
    this.parallel = process.argv.includes('--parallel');
  }

  log(message, level = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const colors = {
      info: chalk.blue,
      success: chalk.green,
      warning: chalk.yellow,
      error: chalk.red,
      debug: chalk.gray
    };

    if (level === 'debug' && !this.verbose) return;

    console.log(`${chalk.gray(timestamp)} ${colors[level](`[${level.toUpperCase()}]`)} ${message}`);
  }

  async runCommand(command, options = {}) {
    const { cwd = process.cwd(), env = process.env, timeout = 300000 } = options;

    this.log(`Running: ${command}`, 'debug');

    return new Promise((resolve, reject) => {
      const child = spawn('npm', ['run', ...command.split(' ').slice(2)], {
        cwd,
        env: { ...env, FORCE_COLOR: '1' },
        stdio: this.verbose ? 'inherit' : 'pipe',
        shell: true
      });

      let stdout = '';
      let stderr = '';

      if (!this.verbose) {
        child.stdout?.on('data', (data) => {
          stdout += data.toString();
        });

        child.stderr?.on('data', (data) => {
          stderr += data.toString();
        });
      }

      const timeoutId = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Command timed out after ${timeout}ms: ${command}`));
      }, timeout);

      child.on('close', (code) => {
        clearTimeout(timeoutId);

        if (code === 0) {
          resolve({ code, stdout, stderr });
        } else {
          const error = new Error(`Command failed with code ${code}: ${command}`);
          error.code = code;
          error.stdout = stdout;
          error.stderr = stderr;
          reject(error);
        }
      });

      child.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
    });
  }

  async runTestSuite(name, command, options = {}) {
    const startTime = Date.now();
    this.log(`Starting ${name}...`, 'info');

    try {
      const result = await this.runCommand(command, options);
      const duration = Date.now() - startTime;

      this.testResults[name] = {
        status: 'passed',
        duration,
        command,
        output: result.stdout
      };

      this.log(`${name} completed in ${duration}ms`, 'success');
      return true;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.testResults[name] = {
        status: 'failed',
        duration,
        command,
        error: error.message,
        output: error.stdout,
        stderr: error.stderr
      };

      this.log(`${name} failed after ${duration}ms: ${error.message}`, 'error');

      if (!this.continueOnFailure) {
        throw error;
      }

      return false;
    }
  }

  async runParallelTests(testSuites) {
    this.log('Running tests in parallel...', 'info');

    const promises = testSuites.map(({ name, command, options }) =>
      this.runTestSuite(name, command, options).catch(error => ({ error, name }))
    );

    const results = await Promise.allSettled(promises);

    const failures = results
      .filter(result => result.status === 'rejected' || result.value?.error)
      .map(result => result.reason || result.value);

    if (failures.length > 0) {
      this.log(`${failures.length} test suite(s) failed in parallel execution`, 'error');
      if (!this.continueOnFailure) {
        throw new Error('Parallel test execution failed');
      }
    }

    return failures.length === 0;
  }

  async checkDependencies() {
    this.log('Checking dependencies...', 'info');

    const requiredPackages = [
      'jest',
      'cypress',
      'playwright',
      'k6',
      '@axe-core/playwright'
    ];

    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    const missing = requiredPackages.filter(pkg => !allDeps[pkg]);

    if (missing.length > 0) {
      this.log(`Missing required packages: ${missing.join(', ')}`, 'error');
      this.log('Run: npm install', 'info');
      throw new Error('Missing dependencies');
    }

    this.log('All dependencies are available', 'success');
  }

  async setupTestEnvironment() {
    this.log('Setting up test environment...', 'info');

    // Ensure test directories exist
    const testDirs = [
      '__tests__',
      '__tests__/api',
      '__tests__/components',
      '__tests__/integration',
      '__tests__/security',
      'cypress/e2e',
      'cypress/fixtures',
      'tests/performance',
      'tests/playwright'
    ];

    testDirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        this.log(`Created directory: ${dir}`, 'debug');
      }
    });

    // Create test fixtures if they don't exist
    await this.createTestFixtures();

    this.log('Test environment setup complete', 'success');
  }

  async createTestFixtures() {
    const fixturesDir = 'cypress/fixtures';
    const fixtures = {
      'candlefish-sites.json': [
        {
          id: 'candlefish-ai',
          name: 'Candlefish AI',
          url: 'https://candlefish.ai',
          status: 'active',
          deployBranch: 'main',
          buildTime: 45
        },
        {
          id: 'staging-candlefish-ai',
          name: 'Staging - Candlefish AI',
          url: 'https://staging.candlefish.ai',
          status: 'building',
          deployBranch: 'staging',
          buildTime: 38
        }
      ],
      'available-extensions.json': {
        success: true,
        data: {
          extensions: [
            {
              id: 'cache-control',
              name: 'Advanced Cache Control',
              description: 'Optimize caching strategies',
              category: 'performance',
              isEnabled: false,
              performance: { impact: 'medium', loadTime: 120, bundleSize: 15 }
            },
            {
              id: 'security-headers',
              name: 'Security Headers Suite',
              description: 'Essential security headers',
              category: 'security',
              isEnabled: true,
              performance: { impact: 'low', loadTime: 50, bundleSize: 8 }
            }
          ],
          total: 2,
          categories: ['performance', 'security']
        }
      },
      'ai-recommendations.json': {
        success: true,
        data: {
          siteId: 'candlefish-ai',
          recommendations: [
            {
              extension: {
                id: 'image-optimization',
                name: 'Smart Image Optimization'
              },
              confidence: 0.92,
              reasoning: 'Your site would benefit from image optimization',
              potentialImpact: { performance: 35, security: 0, seo: 12, userExperience: 28 }
            }
          ]
        }
      }
    };

    for (const [filename, content] of Object.entries(fixtures)) {
      const filepath = path.join(fixturesDir, filename);
      if (!fs.existsSync(filepath)) {
        fs.writeFileSync(filepath, JSON.stringify(content, null, 2));
        this.log(`Created fixture: ${filename}`, 'debug');
      }
    }
  }

  async generateCoverageReport() {
    this.log('Generating comprehensive coverage report...', 'info');

    try {
      // Combine coverage from different test types
      const coverageCommands = [
        'npm run test:coverage -- --silent',
        'npm run test:integration -- --coverage --silent'
      ];

      for (const command of coverageCommands) {
        try {
          await this.runCommand(command, { timeout: 120000 });
        } catch (error) {
          this.log(`Coverage command failed: ${command}`, 'warning');
        }
      }

      // Generate combined report
      if (fs.existsSync('coverage')) {
        this.log('Coverage report generated successfully', 'success');

        // Parse coverage summary
        const summaryPath = 'coverage/coverage-summary.json';
        if (fs.existsSync(summaryPath)) {
          const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
          const total = summary.total;

          this.log('Coverage Summary:', 'info');
          this.log(`  Lines: ${total.lines.pct}%`, 'info');
          this.log(`  Functions: ${total.functions.pct}%`, 'info');
          this.log(`  Branches: ${total.branches.pct}%`, 'info');
          this.log(`  Statements: ${total.statements.pct}%`, 'info');

          // Check if coverage meets thresholds
          const thresholds = { lines: 80, functions: 80, branches: 80, statements: 80 };
          const failed = Object.entries(thresholds).filter(([key, threshold]) =>
            total[key].pct < threshold
          );

          if (failed.length > 0) {
            this.log(`Coverage below threshold for: ${failed.map(([key]) => key).join(', ')}`, 'warning');
          } else {
            this.log('All coverage thresholds met!', 'success');
          }
        }
      }
    } catch (error) {
      this.log(`Failed to generate coverage report: ${error.message}`, 'error');
    }
  }

  async runHealthChecks() {
    this.log('Running pre-test health checks...', 'info');

    const checks = [
      {
        name: 'TypeScript compilation',
        command: 'npx tsc --noEmit',
        critical: true
      },
      {
        name: 'ESLint validation',
        command: 'npm run lint',
        critical: false
      },
      {
        name: 'Dependency audit',
        command: 'npm audit --audit-level=high',
        critical: false
      }
    ];

    for (const check of checks) {
      try {
        await this.runCommand(check.command, { timeout: 60000 });
        this.log(`✓ ${check.name}`, 'success');
      } catch (error) {
        if (check.critical) {
          this.log(`✗ ${check.name} (CRITICAL)`, 'error');
          throw error;
        } else {
          this.log(`✗ ${check.name} (WARNING)`, 'warning');
        }
      }
    }
  }

  generateFinalReport() {
    const totalDuration = Date.now() - this.startTime;
    const passed = Object.values(this.testResults).filter(r => r.status === 'passed').length;
    const failed = Object.values(this.testResults).filter(r => r.status === 'failed').length;
    const total = passed + failed;

    this.log('\n' + '='.repeat(60), 'info');
    this.log('NETLIFY EXTENSION MANAGEMENT TEST REPORT', 'info');
    this.log('='.repeat(60), 'info');
    this.log(`Total Duration: ${(totalDuration / 1000).toFixed(2)}s`, 'info');
    this.log(`Test Suites: ${total} (${passed} passed, ${failed} failed)`, 'info');
    this.log('', 'info');

    // Detailed results
    for (const [name, result] of Object.entries(this.testResults)) {
      const status = result.status === 'passed' ? '✓' : '✗';
      const color = result.status === 'passed' ? 'success' : 'error';
      const duration = (result.duration / 1000).toFixed(2);

      this.log(`${status} ${name} (${duration}s)`, color);

      if (result.status === 'failed' && this.verbose) {
        this.log(`   Error: ${result.error}`, 'error');
      }
    }

    this.log('', 'info');

    // Performance summary
    const fastestTest = Object.entries(this.testResults)
      .sort(([,a], [,b]) => a.duration - b.duration)[0];
    const slowestTest = Object.entries(this.testResults)
      .sort(([,a], [,b]) => b.duration - a.duration)[0];

    if (fastestTest && slowestTest) {
      this.log(`Fastest: ${fastestTest[0]} (${(fastestTest[1].duration / 1000).toFixed(2)}s)`, 'info');
      this.log(`Slowest: ${slowestTest[0]} (${(slowestTest[1].duration / 1000).toFixed(2)}s)`, 'info');
    }

    this.log('='.repeat(60), 'info');

    return failed === 0;
  }

  async run() {
    try {
      this.log('🚀 Starting Netlify Extension Management Test Suite', 'info');
      this.log('', 'info');

      // Pre-flight checks
      await this.checkDependencies();
      await this.setupTestEnvironment();
      await this.runHealthChecks();

      // Define test suites
      const testSuites = [];

      // Unit tests (always run)
      testSuites.push({
        name: 'Unit Tests - API Client',
        command: 'npm run test -- --testPathPattern=api/netlify-api.test.ts',
        options: { timeout: 60000 }
      });

      testSuites.push({
        name: 'Unit Tests - Components',
        command: 'npm run test -- --testPathPattern=components/netlify',
        options: { timeout: 90000 }
      });

      testSuites.push({
        name: 'Unit Tests - Test Factories',
        command: 'npm run test -- --testPathPattern=factories/netlify-factory',
        options: { timeout: 30000 }
      });

      if (!this.onlyUnit) {
        // Integration tests
        testSuites.push({
          name: 'Integration Tests - API Workflows',
          command: 'npm run test -- --testPathPattern=integration/netlify-workflows',
          options: { timeout: 120000 }
        });

        // Security tests
        testSuites.push({
          name: 'Security Tests - Authentication',
          command: 'npm run test -- --testPathPattern=security/netlify-auth-security',
          options: { timeout: 90000 }
        });

        // E2E tests (unless skipped)
        if (!this.skipE2E) {
          testSuites.push({
            name: 'E2E Tests - User Journeys',
            command: 'npm run test:e2e',
            options: { timeout: 300000 }
          });
        }

        // Accessibility tests
        testSuites.push({
          name: 'Accessibility Tests - WCAG Compliance',
          command: 'npx playwright test tests/playwright/netlify-accessibility.test.ts',
          options: { timeout: 240000 }
        });

        // Performance tests (unless skipped)
        if (!this.skipPerf) {
          testSuites.push({
            name: 'Performance Tests - API Load Testing',
            command: 'k6 run tests/performance/netlify-api-load-test.js',
            options: {
              timeout: 360000,
              env: {
                ...process.env,
                API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000',
                API_KEY: process.env.API_KEY || 'test-api-key'
              }
            }
          });
        }
      }

      // Run tests
      if (this.parallel && testSuites.length > 1) {
        await this.runParallelTests(testSuites);
      } else {
        for (const testSuite of testSuites) {
          const success = await this.runTestSuite(testSuite.name, testSuite.command, testSuite.options);
          if (!success && !this.continueOnFailure) {
            break;
          }
        }
      }

      // Generate coverage report
      if (!this.onlyUnit) {
        await this.generateCoverageReport();
      }

      // Final report
      const success = this.generateFinalReport();

      if (success) {
        this.log('🎉 All tests passed!', 'success');
        process.exit(0);
      } else {
        this.log('❌ Some tests failed', 'error');
        process.exit(1);
      }

    } catch (error) {
      this.log(`Fatal error: ${error.message}`, 'error');
      if (this.verbose) {
        console.error(error);
      }
      process.exit(1);
    }
  }
}

// CLI usage information
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Netlify Extension Management Test Runner

Usage: node scripts/run-all-tests.js [options]

Options:
  --verbose, -v              Show detailed output
  --continue-on-failure      Continue running tests even if some fail
  --skip-e2e                Skip end-to-end tests
  --skip-performance        Skip performance tests
  --only-unit               Run only unit tests
  --parallel                Run tests in parallel (faster but less detailed output)
  --help, -h                Show this help message

Examples:
  node scripts/run-all-tests.js                    # Run all tests
  node scripts/run-all-tests.js --verbose          # Run with detailed output
  node scripts/run-all-tests.js --only-unit        # Run only unit tests
  node scripts/run-all-tests.js --parallel         # Run tests in parallel
  node scripts/run-all-tests.js --skip-e2e         # Skip E2E tests (faster)
  `);
  process.exit(0);
}

// Run the test suite
const runner = new TestRunner();
runner.run().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
