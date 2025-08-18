#!/usr/bin/env ts-node
/**
 * @file Comprehensive Test Runner
 * @description Orchestrates all test suites for the Paintbox application
 */

import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface TestSuite {
  name: string;
  command: string;
  args: string[];
  timeout: number;
  critical: boolean;
  description: string;
}

interface TestResult {
  suite: string;
  passed: boolean;
  duration: number;
  coverage?: number;
  errors?: string[];
  output?: string;
}

class TestRunner {
  private results: TestResult[] = [];
  private startTime: number = 0;

  constructor() {
    this.startTime = Date.now();
  }

  private readonly testSuites: TestSuite[] = [
    {
      name: 'Jest Configuration',
      command: 'npm',
      args: ['run', 'test', '--', '--config', 'jest.config.js', '--dry-run'],
      timeout: 30000,
      critical: true,
      description: 'Validate Jest configuration and test discovery',
    },
    {
      name: 'Unit Tests - Excel Engine',
      command: 'npm',
      args: ['run', 'test', '--', '__tests__/unit/excel-engine', '--coverage'],
      timeout: 120000,
      critical: true,
      description: 'Excel formula engine and parser tests (14,683 formulas)',
    },
    {
      name: 'Unit Tests - Calculation Services',
      command: 'npm',
      args: ['run', 'test', '--', '__tests__/unit/calculations', '--coverage'],
      timeout: 60000,
      critical: true,
      description: 'Painting calculation and pricing logic tests',
    },
    {
      name: 'Unit Tests - Security Middleware',
      command: 'npm',
      args: ['run', 'test', '--', '__tests__/unit/middleware', '--coverage'],
      timeout: 45000,
      critical: true,
      description: 'Authentication, rate limiting, and validation tests',
    },
    {
      name: 'Unit Tests - Cache Layer',
      command: 'npm',
      args: ['run', 'test', '--', '__tests__/unit/cache', '--coverage'],
      timeout: 45000,
      critical: true,
      description: 'Three-tier cache implementation tests',
    },
    {
      name: 'Unit Tests - Services',
      command: 'npm',
      args: ['run', 'test', '--', '__tests__/unit/services', '--coverage'],
      timeout: 60000,
      critical: true,
      description: 'Salesforce, Company Cam, and other service tests',
    },
    {
      name: 'Integration Tests - API Routes',
      command: 'npm',
      args: ['run', 'test:integration'],
      timeout: 90000,
      critical: true,
      description: 'API endpoint integration tests',
    },
    {
      name: 'Integration Tests - Salesforce OAuth',
      command: 'npm',
      args: ['run', 'test', '--', '__tests__/integration/salesforce', '--testTimeout=30000'],
      timeout: 90000,
      critical: true,
      description: 'Salesforce OAuth flow and API integration',
    },
    {
      name: 'Performance Benchmarks',
      command: 'npm',
      args: ['run', 'test', '--', '__tests__/performance', '--testTimeout=60000'],
      timeout: 180000,
      critical: false,
      description: 'Calculation performance and benchmark tests',
    },
    {
      name: 'Excel Parity Validation',
      command: 'npm',
      args: ['run', 'test:excel-parity'],
      timeout: 300000,
      critical: true,
      description: 'Validate calculations match original Excel file',
    },
    {
      name: 'E2E Tests - Estimate Workflow',
      command: 'npm',
      args: ['run', 'test:e2e'],
      timeout: 600000,
      critical: true,
      description: 'End-to-end estimate workflow tests',
    },
    {
      name: 'Security Tests',
      command: 'npm',
      args: ['run', 'test:security'],
      timeout: 120000,
      critical: true,
      description: 'Security vulnerability and penetration tests',
    },
    {
      name: 'Accessibility Tests',
      command: 'npm',
      args: ['run', 'test:accessibility'],
      timeout: 90000,
      critical: false,
      description: 'WCAG compliance and accessibility tests',
    },
    {
      name: 'Load Tests',
      command: 'npm',
      args: ['run', 'test:load'],
      timeout: 300000,
      critical: false,
      description: 'Load testing for API endpoints',
    },
  ];

  async runSuite(suite: TestSuite): Promise<TestResult> {
    console.log(`\n🧪 Running ${suite.name}...`);
    console.log(`   ${suite.description}`);

    const startTime = Date.now();

    return new Promise((resolve) => {
      const process = spawn(suite.command, suite.args, {
        stdio: ['inherit', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'test' },
      });

      let stdout = '';
      let stderr = '';

      process.stdout?.on('data', (data) => {
        stdout += data.toString();
        // Show real-time output for critical tests
        if (suite.critical) {
          process.stdout.write(data);
        }
      });

      process.stderr?.on('data', (data) => {
        stderr += data.toString();
        if (suite.critical) {
          process.stderr.write(data);
        }
      });

      const timeout = setTimeout(() => {
        process.kill('SIGKILL');
        resolve({
          suite: suite.name,
          passed: false,
          duration: Date.now() - startTime,
          errors: [`Test suite timed out after ${suite.timeout}ms`],
          output: stdout + stderr,
        });
      }, suite.timeout);

      process.on('close', (code) => {
        clearTimeout(timeout);
        const duration = Date.now() - startTime;

        const coverage = this.extractCoverage(stdout);
        const errors = code !== 0 ? [stderr || 'Unknown error'] : undefined;

        const result: TestResult = {
          suite: suite.name,
          passed: code === 0,
          duration,
          coverage,
          errors,
          output: stdout + stderr,
        };

        if (result.passed) {
          console.log(`   ✅ ${suite.name} passed (${duration}ms)`);
          if (coverage) {
            console.log(`   📊 Coverage: ${coverage.toFixed(1)}%`);
          }
        } else {
          console.log(`   ❌ ${suite.name} failed (${duration}ms)`);
          if (errors) {
            console.log(`   Error: ${errors[0].substring(0, 200)}...`);
          }
        }

        resolve(result);
      });
    });
  }

  private extractCoverage(output: string): number | undefined {
    // Extract coverage percentage from Jest output
    const coverageMatch = output.match(/All files.*?(\d+\.?\d*)%/);
    return coverageMatch ? parseFloat(coverageMatch[1]) : undefined;
  }

  async runAll(options: {
    parallel?: boolean;
    criticalOnly?: boolean;
    skipSlow?: boolean;
  } = {}): Promise<void> {
    console.log('🚀 Starting Paintbox Test Suite');
    console.log('=====================================');

    let suitesToRun = this.testSuites;

    if (options.criticalOnly) {
      suitesToRun = suitesToRun.filter(suite => suite.critical);
      console.log('Running critical tests only...');
    }

    if (options.skipSlow) {
      suitesToRun = suitesToRun.filter(suite => suite.timeout < 180000);
      console.log('Skipping slow tests...');
    }

    if (options.parallel && !options.criticalOnly) {
      // Run non-critical tests in parallel
      const criticalSuites = suitesToRun.filter(suite => suite.critical);
      const nonCriticalSuites = suitesToRun.filter(suite => !suite.critical);

      // Run critical tests sequentially
      for (const suite of criticalSuites) {
        const result = await this.runSuite(suite);
        this.results.push(result);
      }

      // Run non-critical tests in parallel
      if (nonCriticalSuites.length > 0) {
        console.log('\n🔄 Running non-critical tests in parallel...');
        const parallelResults = await Promise.all(
          nonCriticalSuites.map(suite => this.runSuite(suite))
        );
        this.results.push(...parallelResults);
      }
    } else {
      // Run all tests sequentially
      for (const suite of suitesToRun) {
        const result = await this.runSuite(suite);
        this.results.push(result);

        // Stop on critical test failure
        if (!result.passed && suite.critical && !options.criticalOnly) {
          console.log(`\n⚠️  Critical test failed: ${suite.name}`);
          console.log('Stopping execution due to critical failure.');
          break;
        }
      }
    }

    this.printSummary();
    this.generateReports();
  }

  private printSummary(): void {
    const totalDuration = Date.now() - this.startTime;
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;

    const criticalResults = this.results.filter(r =>
      this.testSuites.find(s => s.name === r.suite)?.critical
    );
    const criticalPassed = criticalResults.filter(r => r.passed).length;
    const criticalFailed = criticalResults.length - criticalPassed;

    const averageCoverage = this.results
      .filter(r => r.coverage !== undefined)
      .reduce((sum, r) => sum + (r.coverage || 0), 0) /
      this.results.filter(r => r.coverage !== undefined).length;

    console.log('\n');
    console.log('📊 TEST SUMMARY');
    console.log('=====================================');
    console.log(`⏱️  Total Time: ${(totalDuration / 1000).toFixed(1)}s`);
    console.log(`📈 Overall: ${passedTests}/${totalTests} passed (${((passedTests/totalTests)*100).toFixed(1)}%)`);
    console.log(`🔥 Critical: ${criticalPassed}/${criticalResults.length} passed`);

    if (averageCoverage) {
      console.log(`📊 Average Coverage: ${averageCoverage.toFixed(1)}%`);
    }

    if (failedTests > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results
        .filter(r => !r.passed)
        .forEach(result => {
          const suite = this.testSuites.find(s => s.name === result.suite);
          const critical = suite?.critical ? ' (CRITICAL)' : '';
          console.log(`   • ${result.suite}${critical}`);
        });
    }

    if (criticalFailed > 0) {
      console.log('\n🚨 CRITICAL FAILURES DETECTED');
      console.log('The application may not be ready for production deployment.');
    } else if (failedTests === 0) {
      console.log('\n🎉 ALL TESTS PASSED!');
      console.log('Application is ready for deployment.');
    }
  }

  private generateReports(): void {
    const reportDir = path.join(process.cwd(), 'test-results');

    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    // Generate JSON report
    const jsonReport = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      summary: {
        total: this.results.length,
        passed: this.results.filter(r => r.passed).length,
        failed: this.results.filter(r => !r.passed).length,
        averageCoverage: this.results
          .filter(r => r.coverage !== undefined)
          .reduce((sum, r) => sum + (r.coverage || 0), 0) /
          this.results.filter(r => r.coverage !== undefined).length,
      },
      results: this.results,
    };

    fs.writeFileSync(
      path.join(reportDir, 'test-report.json'),
      JSON.stringify(jsonReport, null, 2)
    );

    // Generate HTML report
    const htmlReport = this.generateHTMLReport(jsonReport);
    fs.writeFileSync(
      path.join(reportDir, 'test-report.html'),
      htmlReport
    );

    // Generate CI/CD compatible report
    const junitReport = this.generateJUnitReport();
    fs.writeFileSync(
      path.join(reportDir, 'junit.xml'),
      junitReport
    );

    console.log(`\n📄 Reports generated in ${reportDir}/`);
  }

  private generateHTMLReport(report: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Paintbox Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .suite { border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 5px; }
        .suite.passed { border-left: 5px solid #28a745; }
        .suite.failed { border-left: 5px solid #dc3545; }
    </style>
</head>
<body>
    <h1>Paintbox Test Report</h1>
    <div class="summary">
        <h2>Summary</h2>
        <p><strong>Timestamp:</strong> ${report.timestamp}</p>
        <p><strong>Duration:</strong> ${(report.duration / 1000).toFixed(1)}s</p>
        <p><strong>Total Tests:</strong> ${report.summary.total}</p>
        <p><strong>Passed:</strong> <span class="passed">${report.summary.passed}</span></p>
        <p><strong>Failed:</strong> <span class="failed">${report.summary.failed}</span></p>
        <p><strong>Success Rate:</strong> ${((report.summary.passed / report.summary.total) * 100).toFixed(1)}%</p>
        ${report.summary.averageCoverage ? `<p><strong>Average Coverage:</strong> ${report.summary.averageCoverage.toFixed(1)}%</p>` : ''}
    </div>

    <h2>Test Results</h2>
    ${report.results.map((result: TestResult) => `
        <div class="suite ${result.passed ? 'passed' : 'failed'}">
            <h3>${result.suite} ${result.passed ? '✅' : '❌'}</h3>
            <p><strong>Duration:</strong> ${result.duration}ms</p>
            ${result.coverage ? `<p><strong>Coverage:</strong> ${result.coverage.toFixed(1)}%</p>` : ''}
            ${result.errors ? `<p><strong>Errors:</strong> ${result.errors.join(', ')}</p>` : ''}
        </div>
    `).join('')}
</body>
</html>
    `.trim();
  }

  private generateJUnitReport(): string {
    const totalTests = this.results.length;
    const failures = this.results.filter(r => !r.passed).length;
    const time = (Date.now() - this.startTime) / 1000;

    const testCases = this.results.map(result => `
        <testcase name="${result.suite}" classname="Paintbox" time="${result.duration / 1000}">
            ${!result.passed ? `<failure message="${result.errors?.[0] || 'Test failed'}">${result.output || ''}</failure>` : ''}
        </testcase>
    `).join('');

    return `
<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="Paintbox Test Suite" tests="${totalTests}" failures="${failures}" time="${time}">
    ${testCases}
</testsuite>
    `.trim();
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options = {
    parallel: args.includes('--parallel'),
    criticalOnly: args.includes('--critical-only'),
    skipSlow: args.includes('--skip-slow'),
  };

  const runner = new TestRunner();

  try {
    await runner.runAll(options);

    // Exit with appropriate code
    const hasFailures = runner.results.some(r => !r.passed);
    const hasCriticalFailures = runner.results.some(r => {
      const suite = runner.testSuites.find(s => s.name === r.suite);
      return !r.passed && suite?.critical;
    });

    if (hasCriticalFailures) {
      process.exit(2); // Critical failure
    } else if (hasFailures) {
      process.exit(1); // Non-critical failure
    } else {
      process.exit(0); // All passed
    }
  } catch (error) {
    console.error('❌ Test runner failed:', error);
    process.exit(3);
  }
}

if (require.main === module) {
  main();
}

export { TestRunner };
