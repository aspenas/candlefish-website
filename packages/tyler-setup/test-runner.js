#!/usr/bin/env node

/**
 * Tyler Setup Platform - Comprehensive Test Runner
 *
 * This script orchestrates all testing activities across the platform,
 * providing a unified interface for running different test suites.
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const yargs = require('yargs');

// Configuration
const CONFIG = {
  timeout: {
    unit: 30000,      // 30 seconds
    integration: 120000, // 2 minutes
    e2e: 300000,      // 5 minutes
    load: 900000,     // 15 minutes
    security: 600000, // 10 minutes
  },
  coverage: {
    threshold: 80,
    directories: ['serverless-lean/src', 'frontend/src'],
  },
  parallel: {
    maxWorkers: require('os').cpus().length,
  },
};

// Test suite definitions
const TEST_SUITES = {
  unit: {
    name: 'Unit Tests',
    description: 'Fast isolated tests for individual components',
    commands: [
      { cwd: 'serverless-lean', cmd: 'npm test' },
      { cwd: 'frontend', cmd: 'npm test' },
    ],
    timeout: CONFIG.timeout.unit,
    parallel: true,
  },
  integration: {
    name: 'Integration Tests',
    description: 'Tests for API endpoints and database interactions',
    commands: [
      { cwd: '.', cmd: 'npm run test:integration' },
    ],
    timeout: CONFIG.timeout.integration,
    parallel: false,
    requires: ['unit'],
  },
  e2e: {
    name: 'End-to-End Tests',
    description: 'Full user journey tests with real browsers',
    commands: [
      { cwd: 'frontend', cmd: 'npx playwright test' },
    ],
    timeout: CONFIG.timeout.e2e,
    parallel: false,
    requires: ['unit', 'integration'],
  },
  load: {
    name: 'Load Tests',
    description: 'Performance testing under various load conditions',
    commands: [
      { cwd: '.', cmd: 'k6 run __tests__/performance/load-test.js' },
      { cwd: '.', cmd: 'artillery run __tests__/performance/artillery-load-test.yml' },
    ],
    timeout: CONFIG.timeout.load,
    parallel: false,
    requires: ['integration'],
  },
  security: {
    name: 'Security Tests',
    description: 'Vulnerability scanning and penetration testing',
    commands: [
      { cwd: '.', cmd: 'k6 run __tests__/security/security-tests.js' },
      { cwd: '.', cmd: 'npm audit --audit-level moderate' },
    ],
    timeout: CONFIG.timeout.security,
    parallel: false,
  },
  smoke: {
    name: 'Smoke Tests',
    description: 'Quick health checks for critical functionality',
    commands: [
      { cwd: 'serverless-lean', cmd: 'npm test -- --testPathPattern="health|smoke"' },
      { cwd: 'frontend', cmd: 'npm test -- --testPathPattern="smoke"' },
    ],
    timeout: CONFIG.timeout.unit / 2,
    parallel: true,
  },
};

class TestRunner {
  constructor(options = {}) {
    this.options = {
      verbose: false,
      bail: false,
      coverage: false,
      reporter: 'spec',
      parallel: true,
      ...options,
    };

    this.results = {
      passed: [],
      failed: [],
      skipped: [],
      startTime: Date.now(),
      endTime: null,
    };

    this.setupEnvironment();
  }

  setupEnvironment() {
    // Ensure test environment variables are set
    process.env.NODE_ENV = 'test';
    process.env.CI = process.env.CI || 'false';

    // Create results directory
    const resultsDir = path.join(__dirname, 'test-results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }
  }

  async run(suites = ['unit']) {
    console.log(chalk.blue.bold('🧪 Tyler Setup Platform - Test Runner'));
    console.log(chalk.gray(`Starting test execution for: ${suites.join(', ')}`));
    console.log(chalk.gray(`Timestamp: ${new Date().toISOString()}`));
    console.log('');

    try {
      // Validate test environment
      await this.validateEnvironment();

      // Setup test infrastructure
      await this.setupTestInfrastructure();

      // Run requested test suites
      for (const suiteName of suites) {
        await this.runTestSuite(suiteName);
      }

      // Generate reports
      await this.generateReports();

      // Cleanup
      await this.cleanup();

      // Summary
      this.printSummary();

      return this.results.failed.length === 0;
    } catch (error) {
      console.error(chalk.red.bold('❌ Test execution failed:'), error.message);

      if (this.options.verbose) {
        console.error(error.stack);
      }

      return false;
    }
  }

  async validateEnvironment() {
    console.log(chalk.yellow('🔍 Validating test environment...'));

    // Check Node.js version
    const nodeVersion = process.version;
    const requiredNodeVersion = '18.0.0';
    if (!this.isVersionCompatible(nodeVersion.slice(1), requiredNodeVersion)) {
      throw new Error(`Node.js ${requiredNodeVersion}+ required, found ${nodeVersion}`);
    }

    // Check required dependencies
    const requiredPackages = ['jest', 'vitest', 'playwright'];
    for (const pkg of requiredPackages) {
      try {
        require.resolve(pkg);
      } catch (error) {
        console.log(chalk.yellow(`Installing missing dependency: ${pkg}`));
        await this.executeCommand('npm', ['install', pkg], '.');
      }
    }

    // Check test data directories
    const requiredDirs = [
      '__tests__',
      'serverless-lean/tests',
      'frontend/e2e',
    ];

    for (const dir of requiredDirs) {
      if (!fs.existsSync(path.join(__dirname, dir))) {
        throw new Error(`Required test directory not found: ${dir}`);
      }
    }

    console.log(chalk.green('✅ Environment validation passed'));
  }

  async setupTestInfrastructure() {
    console.log(chalk.yellow('🏗️  Setting up test infrastructure...'));

    // Start local services for testing
    const services = [];

    // DynamoDB Local
    if (!process.env.DYNAMODB_ENDPOINT) {
      console.log('Starting DynamoDB Local...');
      const dynamoProcess = spawn('npx', [
        'dynamodb-local',
        '--sharedDb',
        '--port', '8000',
        '--inMemory'
      ], {
        detached: true,
        stdio: 'ignore'
      });

      services.push({ name: 'dynamodb', process: dynamoProcess });
      process.env.DYNAMODB_ENDPOINT = 'http://localhost:8000';

      // Wait for service to be ready
      await this.waitForService('http://localhost:8000', 10000);
    }

    // LocalStack for AWS services
    if (!process.env.AWS_ENDPOINT && this.needsLocalStack()) {
      console.log('Starting LocalStack...');
      const localstackProcess = spawn('docker', [
        'run', '--rm', '-d',
        '-p', '4566:4566',
        '--name', 'localstack-test',
        '-e', 'SERVICES=s3,secretsmanager,ses',
        'localstack/localstack'
      ], {
        detached: true,
        stdio: 'ignore'
      });

      services.push({ name: 'localstack', process: localstackProcess });
      process.env.AWS_ENDPOINT = 'http://localhost:4566';

      await this.waitForService('http://localhost:4566/health', 30000);
    }

    this.testServices = services;
    console.log(chalk.green('✅ Test infrastructure ready'));
  }

  async runTestSuite(suiteName) {
    const suite = TEST_SUITES[suiteName];
    if (!suite) {
      throw new Error(`Unknown test suite: ${suiteName}`);
    }

    console.log(chalk.blue.bold(`\n📋 Running ${suite.name}`));
    console.log(chalk.gray(suite.description));

    // Check dependencies
    if (suite.requires) {
      for (const dep of suite.requires) {
        if (!this.results.passed.includes(dep)) {
          console.log(chalk.yellow(`⏭️  Skipping ${suiteName} (requires ${dep})`));
          this.results.skipped.push(suiteName);
          return;
        }
      }
    }

    const startTime = Date.now();

    try {
      if (suite.parallel && this.options.parallel) {
        await this.runCommandsParallel(suite.commands, suite.timeout);
      } else {
        await this.runCommandsSequential(suite.commands, suite.timeout);
      }

      const duration = Date.now() - startTime;
      console.log(chalk.green(`✅ ${suite.name} passed (${duration}ms)`));
      this.results.passed.push(suiteName);

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(chalk.red(`❌ ${suite.name} failed (${duration}ms)`));
      console.error(chalk.red(error.message));

      this.results.failed.push({
        suite: suiteName,
        error: error.message,
        duration,
      });

      if (this.options.bail) {
        throw new Error(`Test suite failed: ${suiteName}`);
      }
    }
  }

  async runCommandsParallel(commands, timeout) {
    const promises = commands.map(({ cwd, cmd }) =>
      this.executeCommand(cmd.split(' ')[0], cmd.split(' ').slice(1), cwd, timeout)
    );

    await Promise.all(promises);
  }

  async runCommandsSequential(commands, timeout) {
    for (const { cwd, cmd } of commands) {
      const [command, ...args] = cmd.split(' ');
      await this.executeCommand(command, args, cwd, timeout);
    }
  }

  async executeCommand(command, args, cwd, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const fullPath = path.resolve(__dirname, cwd || '.');

      if (this.options.verbose) {
        console.log(chalk.gray(`Executing: ${command} ${args.join(' ')} in ${fullPath}`));
      }

      const child = spawn(command, args, {
        cwd: fullPath,
        stdio: this.options.verbose ? 'inherit' : 'pipe',
        shell: process.platform === 'win32',
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

      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error(`Command timeout after ${timeout}ms: ${command} ${args.join(' ')}`));
      }, timeout);

      child.on('close', (code) => {
        clearTimeout(timer);

        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(`Command failed with code ${code}: ${command} ${args.join(' ')}\n${stderr}`));
        }
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        reject(new Error(`Command error: ${error.message}`));
      });
    });
  }

  async waitForService(url, timeout = 10000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          return;
        }
      } catch (error) {
        // Service not ready yet
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error(`Service not ready at ${url} after ${timeout}ms`);
  }

  async generateReports() {
    console.log(chalk.yellow('\n📊 Generating test reports...'));

    const reportData = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.results.startTime,
      results: this.results,
      environment: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: process.memoryUsage(),
      },
      coverage: await this.collectCoverage(),
    };

    // Write JSON report
    fs.writeFileSync(
      path.join(__dirname, 'test-results', 'test-report.json'),
      JSON.stringify(reportData, null, 2)
    );

    // Generate HTML report
    await this.generateHtmlReport(reportData);

    console.log(chalk.green('✅ Reports generated'));
  }

  async collectCoverage() {
    if (!this.options.coverage) {
      return null;
    }

    const coverage = {};

    // Collect coverage from backend
    const backendCoverage = path.join(__dirname, 'serverless-lean', 'coverage', 'coverage-summary.json');
    if (fs.existsSync(backendCoverage)) {
      coverage.backend = JSON.parse(fs.readFileSync(backendCoverage, 'utf8'));
    }

    // Collect coverage from frontend
    const frontendCoverage = path.join(__dirname, 'frontend', 'coverage', 'coverage-summary.json');
    if (fs.existsSync(frontendCoverage)) {
      coverage.frontend = JSON.parse(fs.readFileSync(frontendCoverage, 'utf8'));
    }

    return coverage;
  }

  async generateHtmlReport(data) {
    const template = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Tyler Setup - Test Report</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 40px; }
            .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .passed { color: #28a745; }
            .failed { color: #dc3545; }
            .skipped { color: #ffc107; }
            .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
            .card { background: #fff; border: 1px solid #dee2e6; border-radius: 8px; padding: 20px; }
            .metric { font-size: 2em; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #dee2e6; }
            th { background-color: #f8f9fa; }
            .duration { font-family: monospace; }
            pre { background: #f8f9fa; padding: 15px; border-radius: 4px; overflow: auto; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🧪 Tyler Setup Platform - Test Report</h1>
            <p>Generated: ${data.timestamp}</p>
            <p>Total Duration: ${(data.duration / 1000).toFixed(2)}s</p>
        </div>

        <div class="summary">
            <div class="card">
                <h3>✅ Passed</h3>
                <div class="metric passed">${data.results.passed.length}</div>
            </div>
            <div class="card">
                <h3>❌ Failed</h3>
                <div class="metric failed">${data.results.failed.length}</div>
            </div>
            <div class="card">
                <h3>⏭️ Skipped</h3>
                <div class="metric skipped">${data.results.skipped.length}</div>
            </div>
        </div>

        <h2>Test Results</h2>
        <table>
            <thead>
                <tr>
                    <th>Test Suite</th>
                    <th>Status</th>
                    <th>Duration</th>
                    <th>Details</th>
                </tr>
            </thead>
            <tbody>
                ${data.results.passed.map(suite => `
                    <tr>
                        <td>${suite}</td>
                        <td class="passed">✅ PASSED</td>
                        <td class="duration">-</td>
                        <td>-</td>
                    </tr>
                `).join('')}
                ${data.results.failed.map(result => `
                    <tr>
                        <td>${result.suite}</td>
                        <td class="failed">❌ FAILED</td>
                        <td class="duration">${(result.duration / 1000).toFixed(2)}s</td>
                        <td><pre>${result.error}</pre></td>
                    </tr>
                `).join('')}
                ${data.results.skipped.map(suite => `
                    <tr>
                        <td>${suite}</td>
                        <td class="skipped">⏭️ SKIPPED</td>
                        <td class="duration">-</td>
                        <td>-</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <h2>Environment Information</h2>
        <pre>${JSON.stringify(data.environment, null, 2)}</pre>

        ${data.coverage ? `
        <h2>Coverage Summary</h2>
        <pre>${JSON.stringify(data.coverage, null, 2)}</pre>
        ` : ''}
    </body>
    </html>
    `;

    fs.writeFileSync(
      path.join(__dirname, 'test-results', 'test-report.html'),
      template
    );
  }

  async cleanup() {
    console.log(chalk.yellow('\n🧹 Cleaning up test infrastructure...'));

    // Stop test services
    if (this.testServices) {
      for (const service of this.testServices) {
        try {
          if (service.name === 'localstack') {
            await this.executeCommand('docker', ['stop', 'localstack-test'], '.');
          } else {
            service.process.kill();
          }
        } catch (error) {
          console.warn(`Failed to stop ${service.name}:`, error.message);
        }
      }
    }

    // Clean up test data
    const tempDirs = [
      path.join(__dirname, '.tmp'),
      path.join(__dirname, 'serverless-lean', '.nyc_output'),
    ];

    for (const dir of tempDirs) {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }

    console.log(chalk.green('✅ Cleanup completed'));
  }

  printSummary() {
    this.results.endTime = Date.now();
    const totalDuration = this.results.endTime - this.results.startTime;

    console.log(chalk.blue.bold('\n📈 Test Execution Summary'));
    console.log(chalk.gray(''.padEnd(50, '=')));

    console.log(chalk.green(`✅ Passed: ${this.results.passed.length}`));
    console.log(chalk.red(`❌ Failed: ${this.results.failed.length}`));
    console.log(chalk.yellow(`⏭️  Skipped: ${this.results.skipped.length}`));

    console.log(chalk.gray(`Total Duration: ${(totalDuration / 1000).toFixed(2)}s`));

    if (this.results.failed.length > 0) {
      console.log(chalk.red.bold('\n🚨 Failed Test Suites:'));
      this.results.failed.forEach(result => {
        console.log(chalk.red(`  • ${result.suite}: ${result.error}`));
      });
    }

    console.log(chalk.gray(`\n📄 Reports available at: test-results/`));

    if (this.results.failed.length === 0) {
      console.log(chalk.green.bold('\n🎉 All tests passed!'));
    } else {
      console.log(chalk.red.bold('\n💥 Some tests failed!'));
    }
  }

  needsLocalStack() {
    // Check if any test suites require AWS services
    return process.env.AWS_ENDPOINT === undefined;
  }

  isVersionCompatible(current, required) {
    const currentParts = current.split('.').map(Number);
    const requiredParts = required.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      const currentPart = currentParts[i] || 0;
      const requiredPart = requiredParts[i] || 0;

      if (currentPart > requiredPart) return true;
      if (currentPart < requiredPart) return false;
    }

    return true;
  }
}

// CLI Interface
const argv = yargs
  .usage('Usage: $0 [suites...] [options]')
  .example('$0 unit integration', 'Run unit and integration tests')
  .example('$0 --all --coverage', 'Run all tests with coverage')
  .example('$0 smoke --verbose', 'Run smoke tests with verbose output')

  .option('all', {
    alias: 'a',
    describe: 'Run all test suites',
    type: 'boolean',
    default: false,
  })

  .option('coverage', {
    alias: 'c',
    describe: 'Generate coverage reports',
    type: 'boolean',
    default: false,
  })

  .option('verbose', {
    alias: 'v',
    describe: 'Verbose output',
    type: 'boolean',
    default: false,
  })

  .option('bail', {
    alias: 'b',
    describe: 'Stop on first failure',
    type: 'boolean',
    default: false,
  })

  .option('parallel', {
    alias: 'p',
    describe: 'Run tests in parallel when possible',
    type: 'boolean',
    default: true,
  })

  .option('reporter', {
    alias: 'r',
    describe: 'Test reporter format',
    choices: ['spec', 'json', 'junit'],
    default: 'spec',
  })

  .help()
  .argv;

// Main execution
async function main() {
  const suites = argv.all
    ? Object.keys(TEST_SUITES)
    : argv._.length > 0
      ? argv._
      : ['unit'];

  const runner = new TestRunner({
    verbose: argv.verbose,
    bail: argv.bail,
    coverage: argv.coverage,
    reporter: argv.reporter,
    parallel: argv.parallel,
  });

  const success = await runner.run(suites);
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red.bold('Fatal error:'), error.message);
    process.exit(1);
  });
}

module.exports = { TestRunner, TEST_SUITES };
