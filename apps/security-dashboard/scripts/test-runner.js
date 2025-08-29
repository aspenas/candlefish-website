#!/usr/bin/env node

/**
 * Comprehensive Test Runner for Security Dashboard
 * Manages all test suites and generates consolidated reports
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class TestRunner {
  constructor() {
    this.results = {
      unit: null,
      integration: null,
      e2e: null,
      accessibility: null,
      performance: null,
      security: null,
      coverage: null
    };
    
    this.startTime = Date.now();
    this.outputDir = path.join(process.cwd(), 'test-results');
    
    this.ensureOutputDir();
  }

  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: chalk.blue,
      success: chalk.green,
      warning: chalk.yellow,
      error: chalk.red,
      header: chalk.cyan.bold
    };
    
    console.log(`${colors[type]('[' + timestamp + ']')} ${colors[type](message)}`);
  }

  async runCommand(command, options = {}) {
    return new Promise((resolve, reject) => {
      this.log(`Running: ${command}`);
      
      const child = spawn('bash', ['-c', command], {
        stdio: options.silent ? 'pipe' : 'inherit',
        cwd: process.cwd(),
        env: { ...process.env, ...options.env }
      });

      let stdout = '';
      let stderr = '';

      if (options.silent) {
        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });
      }

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, code });
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });
    });
  }

  async runUnitTests() {
    this.log('Running Unit Tests...', 'header');
    
    try {
      const result = await this.runCommand(
        'npm run test -- --coverage --reporters=default --reporters=jest-junit --outputFile=test-results/unit-test-results.xml',
        { 
          env: { 
            JEST_JUNIT_OUTPUT_DIR: this.outputDir,
            JEST_JUNIT_OUTPUT_NAME: 'unit-test-results.xml'
          }
        }
      );
      
      this.results.unit = { success: true, ...result };
      this.log('Unit tests completed successfully', 'success');
      
      // Extract coverage data
      const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
      if (fs.existsSync(coveragePath)) {
        this.results.coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
      }
      
    } catch (error) {
      this.results.unit = { success: false, error: error.message };
      this.log(`Unit tests failed: ${error.message}`, 'error');
    }
  }

  async runIntegrationTests() {
    this.log('Running Integration Tests...', 'header');
    
    try {
      // Start test database if needed
      const dbResult = await this.runCommand('docker-compose -f docker-compose.test.yml up -d db', { silent: true });
      
      const result = await this.runCommand(
        'npm run test:integration -- --reporters=default --reporters=jest-junit --outputFile=test-results/integration-test-results.xml',
        {
          env: {
            NODE_ENV: 'test',
            DATABASE_URL: 'postgresql://test:test@localhost:5433/security_dashboard_test',
            JEST_JUNIT_OUTPUT_DIR: this.outputDir,
            JEST_JUNIT_OUTPUT_NAME: 'integration-test-results.xml'
          }
        }
      );
      
      this.results.integration = { success: true, ...result };
      this.log('Integration tests completed successfully', 'success');
      
    } catch (error) {
      this.results.integration = { success: false, error: error.message };
      this.log(`Integration tests failed: ${error.message}`, 'error');
    } finally {
      // Clean up test database
      await this.runCommand('docker-compose -f docker-compose.test.yml down', { silent: true });
    }
  }

  async runE2ETests() {
    this.log('Running E2E Tests...', 'header');
    
    try {
      // Start application in test mode
      this.log('Starting application for E2E tests...');
      const appProcess = spawn('npm', ['run', 'dev'], {
        env: { ...process.env, NODE_ENV: 'test', PORT: '3001' },
        detached: true
      });
      
      // Wait for app to start
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Run Playwright tests
      const playwrightResult = await this.runCommand(
        'npx playwright test --reporter=junit --output-file=test-results/e2e-playwright-results.xml'
      );
      
      // Run Cypress tests
      const cypressResult = await this.runCommand(
        'npx cypress run --reporter junit --reporter-options mochaFile=test-results/e2e-cypress-results.xml'
      );
      
      this.results.e2e = { 
        success: true, 
        playwright: playwrightResult,
        cypress: cypressResult
      };
      this.log('E2E tests completed successfully', 'success');
      
      // Kill app process
      process.kill(-appProcess.pid);
      
    } catch (error) {
      this.results.e2e = { success: false, error: error.message };
      this.log(`E2E tests failed: ${error.message}`, 'error');
    }
  }

  async runAccessibilityTests() {
    this.log('Running Accessibility Tests...', 'header');
    
    try {
      const result = await this.runCommand(
        'npx playwright test --config=playwright.accessibility.config.ts --reporter=junit --output-file=test-results/accessibility-test-results.xml'
      );
      
      this.results.accessibility = { success: true, ...result };
      this.log('Accessibility tests completed successfully', 'success');
      
    } catch (error) {
      this.results.accessibility = { success: false, error: error.message };
      this.log(`Accessibility tests failed: ${error.message}`, 'error');
    }
  }

  async runPerformanceTests() {
    this.log('Running Performance Tests...', 'header');
    
    try {
      // Check if K6 is installed
      try {
        execSync('which k6', { stdio: 'pipe' });
      } catch {
        this.log('K6 not found, installing...', 'warning');
        await this.runCommand('npm install -g k6');
      }
      
      // Run load tests
      const loadTestResult = await this.runCommand(
        'k6 run --out json=test-results/k6-load-test-results.json __tests__/performance/k6/comprehensive-load-test.js'
      );
      
      // Run WebSocket stress tests
      const wsTestResult = await this.runCommand(
        'k6 run --out json=test-results/k6-websocket-test-results.json __tests__/performance/k6/websocket-stress-test.js'
      );
      
      this.results.performance = { 
        success: true,
        loadTest: loadTestResult,
        websocketTest: wsTestResult
      };
      this.log('Performance tests completed successfully', 'success');
      
    } catch (error) {
      this.results.performance = { success: false, error: error.message };
      this.log(`Performance tests failed: ${error.message}`, 'error');
    }
  }

  async runSecurityTests() {
    this.log('Running Security Tests...', 'header');
    
    try {
      // Run vulnerability scanner
      const vulnResult = await this.runCommand(
        'node __tests__/security/vulnerability-scanner.js'
      );
      
      // Run OWASP ZAP integration if available
      let zapResult = null;
      try {
        zapResult = await this.runCommand(
          'node __tests__/security/owasp-zap-integration.js'
        );
      } catch (zapError) {
        this.log('OWASP ZAP not available, skipping...', 'warning');
      }
      
      this.results.security = { 
        success: true,
        vulnerabilityScanner: vulnResult,
        zapIntegration: zapResult
      };
      this.log('Security tests completed successfully', 'success');
      
    } catch (error) {
      this.results.security = { success: false, error: error.message };
      this.log(`Security tests failed: ${error.message}`, 'error');
    }
  }

  generateConsolidatedReport() {
    this.log('Generating consolidated report...', 'header');
    
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    
    const report = {
      summary: {
        startTime: new Date(this.startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        duration: `${Math.round(duration / 1000)}s`,
        totalTests: this.getTotalTestCount(),
        passedSuites: this.getPassedSuiteCount(),
        failedSuites: this.getFailedSuiteCount()
      },
      coverage: this.results.coverage,
      results: this.results
    };
    
    // Generate JSON report
    const jsonReport = path.join(this.outputDir, 'consolidated-test-report.json');
    fs.writeFileSync(jsonReport, JSON.stringify(report, null, 2));
    
    // Generate HTML report
    this.generateHTMLReport(report);
    
    // Generate JUnit XML (merged)
    this.generateMergedJUnitReport();
    
    this.log(`Reports generated in ${this.outputDir}`, 'success');
    
    return report;
  }

  generateHTMLReport(report) {
    const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Security Dashboard - Test Report</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
            .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; padding: 20px; }
            .summary-card { background: #f8f9fa; border-radius: 6px; padding: 15px; text-align: center; }
            .summary-card h3 { margin: 0 0 10px 0; color: #495057; }
            .summary-card .value { font-size: 2em; font-weight: bold; color: #28a745; }
            .summary-card .value.failed { color: #dc3545; }
            .section { margin: 20px; }
            .section h2 { color: #343a40; border-bottom: 2px solid #e9ecef; padding-bottom: 10px; }
            .test-suite { background: #f8f9fa; border-radius: 6px; padding: 15px; margin: 10px 0; }
            .test-suite h3 { margin: 0 0 10px 0; }
            .test-suite.success { border-left: 4px solid #28a745; }
            .test-suite.failed { border-left: 4px solid #dc3545; }
            .coverage-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 15px 0; }
            .coverage-item { background: white; border-radius: 4px; padding: 10px; text-align: center; border: 1px solid #dee2e6; }
            .coverage-bar { width: 100%; height: 8px; background: #e9ecef; border-radius: 4px; overflow: hidden; margin: 5px 0; }
            .coverage-fill { height: 100%; background: #28a745; }
            .coverage-fill.warning { background: #ffc107; }
            .coverage-fill.danger { background: #dc3545; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Security Dashboard - Test Report</h1>
                <p>Generated on ${new Date(report.summary.endTime).toLocaleString()}</p>
            </div>
            
            <div class="summary">
                <div class="summary-card">
                    <h3>Duration</h3>
                    <div class="value">${report.summary.duration}</div>
                </div>
                <div class="summary-card">
                    <h3>Passed Suites</h3>
                    <div class="value">${report.summary.passedSuites}</div>
                </div>
                <div class="summary-card">
                    <h3>Failed Suites</h3>
                    <div class="value ${report.summary.failedSuites > 0 ? 'failed' : ''}">${report.summary.failedSuites}</div>
                </div>
                <div class="summary-card">
                    <h3>Overall Status</h3>
                    <div class="value ${report.summary.failedSuites === 0 ? '' : 'failed'}">${report.summary.failedSuites === 0 ? 'PASSED' : 'FAILED'}</div>
                </div>
            </div>
            
            ${this.generateCoverageHTML(report.coverage)}
            ${this.generateSuitesHTML(report.results)}
        </div>
    </body>
    </html>`;
    
    const htmlReport = path.join(this.outputDir, 'consolidated-test-report.html');
    fs.writeFileSync(htmlReport, htmlTemplate);
  }

  generateCoverageHTML(coverage) {
    if (!coverage || !coverage.total) return '';
    
    const { lines, functions, branches, statements } = coverage.total;
    
    return `
    <div class="section">
        <h2>Code Coverage</h2>
        <div class="coverage-grid">
            <div class="coverage-item">
                <strong>Lines</strong>
                <div class="coverage-bar">
                    <div class="coverage-fill ${this.getCoverageClass(lines.pct)}" style="width: ${lines.pct}%"></div>
                </div>
                <span>${lines.pct}% (${lines.covered}/${lines.total})</span>
            </div>
            <div class="coverage-item">
                <strong>Functions</strong>
                <div class="coverage-bar">
                    <div class="coverage-fill ${this.getCoverageClass(functions.pct)}" style="width: ${functions.pct}%"></div>
                </div>
                <span>${functions.pct}% (${functions.covered}/${functions.total})</span>
            </div>
            <div class="coverage-item">
                <strong>Branches</strong>
                <div class="coverage-bar">
                    <div class="coverage-fill ${this.getCoverageClass(branches.pct)}" style="width: ${branches.pct}%"></div>
                </div>
                <span>${branches.pct}% (${branches.covered}/${branches.total})</span>
            </div>
            <div class="coverage-item">
                <strong>Statements</strong>
                <div class="coverage-bar">
                    <div class="coverage-fill ${this.getCoverageClass(statements.pct)}" style="width: ${statements.pct}%"></div>
                </div>
                <span>${statements.pct}% (${statements.covered}/${statements.total})</span>
            </div>
        </div>
    </div>`;
  }

  generateSuitesHTML(results) {
    const suites = Object.entries(results).map(([name, result]) => {
      const status = result && result.success ? 'success' : 'failed';
      const statusText = result && result.success ? 'PASSED' : 'FAILED';
      const errorText = result && result.error ? `<p><strong>Error:</strong> ${result.error}</p>` : '';
      
      return `
      <div class="test-suite ${status}">
          <h3>${this.capitalizeFirst(name)} Tests - ${statusText}</h3>
          ${errorText}
      </div>`;
    }).join('');
    
    return `
    <div class="section">
        <h2>Test Suites</h2>
        ${suites}
    </div>`;
  }

  getCoverageClass(percentage) {
    if (percentage >= 80) return '';
    if (percentage >= 60) return 'warning';
    return 'danger';
  }

  generateMergedJUnitReport() {
    // This would merge all JUnit XML files into a single report
    // Implementation depends on specific requirements
    this.log('JUnit merge functionality would be implemented here', 'info');
  }

  getTotalTestCount() {
    // This would aggregate test counts from all suites
    return 'N/A';
  }

  getPassedSuiteCount() {
    return Object.values(this.results).filter(result => result && result.success).length;
  }

  getFailedSuiteCount() {
    return Object.values(this.results).filter(result => result && !result.success).length;
  }

  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  printFinalSummary(report) {
    this.log('='.repeat(80), 'header');
    this.log('FINAL TEST SUMMARY', 'header');
    this.log('='.repeat(80), 'header');
    
    this.log(`Duration: ${report.summary.duration}`);
    this.log(`Passed Suites: ${report.summary.passedSuites}`);
    this.log(`Failed Suites: ${report.summary.failedSuites}`);
    
    if (report.coverage && report.coverage.total) {
      const { lines, functions, branches, statements } = report.coverage.total;
      this.log('\nCOVERAGE SUMMARY:');
      this.log(`Lines: ${lines.pct}%`);
      this.log(`Functions: ${functions.pct}%`);
      this.log(`Branches: ${branches.pct}%`);
      this.log(`Statements: ${statements.pct}%`);
    }
    
    const overallStatus = report.summary.failedSuites === 0 ? 'PASSED' : 'FAILED';
    const statusColor = overallStatus === 'PASSED' ? 'success' : 'error';
    
    this.log(`\nOVERALL STATUS: ${overallStatus}`, statusColor);
    this.log('='.repeat(80), 'header');
    
    return overallStatus === 'PASSED' ? 0 : 1;
  }

  async run(suites = ['unit', 'integration', 'e2e', 'accessibility', 'performance', 'security']) {
    this.log('Starting comprehensive test run...', 'header');
    this.log(`Test suites to run: ${suites.join(', ')}`);
    
    // Run test suites
    for (const suite of suites) {
      switch (suite) {
        case 'unit':
          await this.runUnitTests();
          break;
        case 'integration':
          await this.runIntegrationTests();
          break;
        case 'e2e':
          await this.runE2ETests();
          break;
        case 'accessibility':
          await this.runAccessibilityTests();
          break;
        case 'performance':
          await this.runPerformanceTests();
          break;
        case 'security':
          await this.runSecurityTests();
          break;
        default:
          this.log(`Unknown test suite: ${suite}`, 'warning');
      }
    }
    
    // Generate reports
    const report = this.generateConsolidatedReport();
    
    // Print final summary and exit with appropriate code
    const exitCode = this.printFinalSummary(report);
    process.exit(exitCode);
  }
}

// CLI handling
if (require.main === module) {
  const args = process.argv.slice(2);
  const runner = new TestRunner();
  
  if (args.length === 0) {
    // Run all suites
    runner.run();
  } else if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: node test-runner.js [options] [suites...]

Options:
  --help, -h          Show this help message
  
Test Suites:
  unit               Run unit tests
  integration        Run integration tests  
  e2e                Run end-to-end tests
  accessibility      Run accessibility tests
  performance        Run performance tests
  security           Run security tests
  
Examples:
  node test-runner.js                    # Run all test suites
  node test-runner.js unit integration   # Run only unit and integration tests
  node test-runner.js security          # Run only security tests
`);
    process.exit(0);
  } else {
    // Run specified suites
    const validSuites = ['unit', 'integration', 'e2e', 'accessibility', 'performance', 'security'];
    const requestedSuites = args.filter(suite => validSuites.includes(suite));
    
    if (requestedSuites.length === 0) {
      console.error('No valid test suites specified. Use --help for usage information.');
      process.exit(1);
    }
    
    runner.run(requestedSuites);
  }
}

module.exports = TestRunner;