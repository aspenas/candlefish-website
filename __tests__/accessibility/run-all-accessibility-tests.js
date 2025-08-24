#!/usr/bin/env node
/**
 * Comprehensive Accessibility Test Runner
 * Runs all accessibility tests and generates a unified report
 */

const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const util = require('util');

const execAsync = util.promisify(exec);

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const RESULTS_DIR = path.join(__dirname, '../results');
const REPORT_FILE = path.join(RESULTS_DIR, 'accessibility-comprehensive-report.json');

/**
 * Test suite configurations
 */
const TEST_SUITES = {
  jest_axe: {
    name: 'Jest + Axe Component Tests',
    command: 'npx jest --testPathPattern=__tests__/accessibility/components',
    timeout: 300000, // 5 minutes
    description: 'Component-level accessibility testing with jest-axe',
    critical: true
  },
  jest_pages: {
    name: 'Jest + Axe Page Tests',
    command: 'npx jest --testPathPattern=__tests__/accessibility/pages',
    timeout: 300000, // 5 minutes
    description: 'Page-level accessibility testing with jest-axe',
    critical: true
  },
  lighthouse: {
    name: 'Lighthouse Accessibility Audit',
    command: 'npx jest --testPathPattern=lighthouse-accessibility.test.js --runInBand',
    timeout: 600000, // 10 minutes
    description: 'Automated Lighthouse accessibility audits',
    critical: true
  },
  pa11y: {
    name: 'Pa11y WCAG Compliance Tests',
    command: 'npx jest --testPathPattern=pa11y-tests.test.js --runInBand',
    timeout: 900000, // 15 minutes
    description: 'Comprehensive WCAG 2.1 AA compliance testing',
    critical: true
  }
};

/**
 * Check if the application is running
 */
async function checkApplicationHealth() {
  try {
    const { stdout } = await execAsync(`curl -f -s ${BASE_URL}/health || echo "failed"`);
    if (stdout.includes('failed')) {
      throw new Error('Application health check failed');
    }
    console.log(`✅ Application is running at ${BASE_URL}`);
    return true;
  } catch (error) {
    console.error(`❌ Application not accessible at ${BASE_URL}`);
    console.error('Please start the application before running accessibility tests');
    return false;
  }
}

/**
 * Run a test suite
 */
async function runTestSuite(suiteKey, suite) {
  console.log(`\n🧪 Running ${suite.name}...`);
  console.log(`Description: ${suite.description}`);

  const startTime = Date.now();

  try {
    const { stdout, stderr } = await execAsync(suite.command, {
      timeout: suite.timeout,
      cwd: path.join(__dirname, '../..')
    });

    const duration = Date.now() - startTime;
    const result = {
      suite: suiteKey,
      name: suite.name,
      description: suite.description,
      status: 'passed',
      duration,
      output: stdout,
      errors: stderr || null,
      timestamp: new Date().toISOString(),
      critical: suite.critical
    };

    console.log(`✅ ${suite.name} completed successfully (${duration}ms)`);
    return result;

  } catch (error) {
    const duration = Date.now() - startTime;
    const result = {
      suite: suiteKey,
      name: suite.name,
      description: suite.description,
      status: 'failed',
      duration,
      output: error.stdout || '',
      errors: error.stderr || error.message,
      timestamp: new Date().toISOString(),
      critical: suite.critical
    };

    console.error(`❌ ${suite.name} failed (${duration}ms)`);
    if (error.stderr) {
      console.error('Error output:', error.stderr);
    }

    return result;
  }
}

/**
 * Analyze test results
 */
function analyzeResults(results) {
  const analysis = {
    totalSuites: results.length,
    passedSuites: results.filter(r => r.status === 'passed').length,
    failedSuites: results.filter(r => r.status === 'failed').length,
    criticalFailures: results.filter(r => r.status === 'failed' && r.critical).length,
    totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
    passRate: 0,
    overallStatus: 'unknown',
    recommendations: []
  };

  analysis.passRate = (analysis.passedSuites / analysis.totalSuites) * 100;

  // Determine overall status
  if (analysis.criticalFailures > 0) {
    analysis.overallStatus = 'critical_failure';
    analysis.recommendations.push(`${analysis.criticalFailures} critical test suites failed`);
  } else if (analysis.failedSuites > 0) {
    analysis.overallStatus = 'partial_failure';
    analysis.recommendations.push(`${analysis.failedSuites} non-critical test suites failed`);
  } else {
    analysis.overallStatus = 'success';
    analysis.recommendations.push('All accessibility test suites passed successfully!');
  }

  // Add specific recommendations based on failures
  const failedSuites = results.filter(r => r.status === 'failed');
  failedSuites.forEach(suite => {
    if (suite.suite === 'jest_axe' || suite.suite === 'jest_pages') {
      analysis.recommendations.push('Component/page accessibility issues found - review jest-axe output');
    } else if (suite.suite === 'lighthouse') {
      analysis.recommendations.push('Lighthouse accessibility audit failed - check color contrast and ARIA usage');
    } else if (suite.suite === 'pa11y') {
      analysis.recommendations.push('WCAG compliance issues found - review pa11y output for specific violations');
    }
  });

  // Performance recommendations
  if (analysis.totalDuration > 1200000) { // 20 minutes
    analysis.recommendations.push('Test execution is slow - consider optimizing test setup or running tests in parallel');
  }

  return analysis;
}

/**
 * Generate comprehensive report
 */
function generateReport(results, analysis) {
  const report = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    environment: {
      node: process.version,
      platform: process.platform
    },
    summary: analysis,
    results: results,
    metadata: {
      testSuites: Object.keys(TEST_SUITES),
      totalTests: results.length,
      reportVersion: '1.0.0'
    }
  };

  return report;
}

/**
 * Generate console report
 */
function generateConsoleReport(analysis, results) {
  let report = '\n';
  report += '╔══════════════════════════════════════════════════════════════════╗\n';
  report += '║               COMPREHENSIVE ACCESSIBILITY REPORT                ║\n';
  report += '╠══════════════════════════════════════════════════════════════════╣\n';
  report += `║  Target URL: ${BASE_URL.padEnd(51)} ║\n`;
  report += `║  Test Suites: ${analysis.totalSuites.toString().padStart(4)}                                               ║\n`;
  report += `║  Passed: ${analysis.passedSuites.toString().padStart(9)}                                               ║\n`;
  report += `║  Failed: ${analysis.failedSuites.toString().padStart(9)}                                               ║\n`;
  report += `║  Critical Failures: ${analysis.criticalFailures.toString().padStart(2)}                                        ║\n`;
  report += `║  Pass Rate: ${analysis.passRate.toFixed(1).padStart(8)}%                                       ║\n`;
  report += `║  Total Duration: ${(analysis.totalDuration / 1000 / 60).toFixed(1).padStart(5)} minutes                            ║\n`;
  report += '║                                                                  ║\n';

  // Overall status
  const statusIcon = analysis.overallStatus === 'success' ? '✅' :
                    analysis.overallStatus === 'partial_failure' ? '⚠️' : '❌';
  const statusText = analysis.overallStatus.replace('_', ' ').toUpperCase();
  report += `║  Overall Status: ${statusIcon} ${statusText.padEnd(38)} ║\n`;
  report += '║                                                                  ║\n';

  // Individual test suite results
  report += '║  📊 TEST SUITE RESULTS                                          ║\n';
  results.forEach(result => {
    const statusIcon = result.status === 'passed' ? '✅' : '❌';
    const suiteNameTruncated = result.name.slice(0, 35).padEnd(35);
    const duration = `${Math.round(result.duration / 1000)}s`.padStart(6);
    report += `║  ${statusIcon} ${suiteNameTruncated} ${duration}              ║\n`;

    if (result.status === 'failed' && result.critical) {
      report += '║     ⚠️  CRITICAL FAILURE - Immediate attention required        ║\n';
    }
  });

  report += '║                                                                  ║\n';

  // Recommendations
  report += '║  📋 RECOMMENDATIONS                                             ║\n';
  analysis.recommendations.slice(0, 4).forEach(rec => {
    // Word wrap recommendations
    const words = rec.split(' ');
    let currentLine = '';
    const maxLineLength = 62;

    words.forEach((word, index) => {
      if ((currentLine + word).length <= maxLineLength) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) {
          report += `║  • ${currentLine.padEnd(62)} ║\n`;
          currentLine = word;
        } else {
          report += `║  • ${word.padEnd(62)} ║\n`;
        }
      }

      if (index === words.length - 1 && currentLine) {
        report += `║  • ${currentLine.padEnd(62)} ║\n`;
      }
    });
  });

  report += '║                                                                  ║\n';

  // Next steps
  report += '║  🎯 NEXT STEPS                                                  ║\n';
  if (analysis.criticalFailures > 0) {
    report += '║  1. Fix critical accessibility issues immediately              ║\n';
    report += '║  2. Review failed test outputs for specific violations        ║\n';
    report += '║  3. Re-run tests after fixes                                  ║\n';
  } else if (analysis.failedSuites > 0) {
    report += '║  1. Review non-critical test failures                         ║\n';
    report += '║  2. Address accessibility improvements                         ║\n';
    report += '║  3. Monitor for regressions                                    ║\n';
  } else {
    report += '║  1. Monitor accessibility in CI/CD pipeline                   ║\n';
    report += '║  2. Add accessibility tests to new features                   ║\n';
    report += '║  3. Periodic accessibility audits                             ║\n';
  }

  report += '║                                                                  ║\n';
  report += '╚══════════════════════════════════════════════════════════════════╝\n';

  return report;
}

/**
 * Save report to file
 */
async function saveReport(report) {
  await fs.mkdir(RESULTS_DIR, { recursive: true });
  await fs.writeFile(REPORT_FILE, JSON.stringify(report, null, 2));

  // Also save a human-readable version
  const readableFile = path.join(RESULTS_DIR, 'accessibility-summary.txt');
  const consoleReport = generateConsoleReport(report.summary, report.results);
  await fs.writeFile(readableFile, consoleReport);

  console.log(`\n📁 Reports saved:`);
  console.log(`   JSON: ${REPORT_FILE}`);
  console.log(`   Text: ${readableFile}`);
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 Starting Comprehensive Accessibility Testing');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Test Suites: ${Object.keys(TEST_SUITES).length}`);

  // Check application health
  const isHealthy = await checkApplicationHealth();
  if (!isHealthy && !process.env.SKIP_HEALTH_CHECK) {
    process.exit(1);
  }

  const results = [];
  const startTime = Date.now();

  // Run all test suites
  for (const [suiteKey, suite] of Object.entries(TEST_SUITES)) {
    const result = await runTestSuite(suiteKey, suite);
    results.push(result);

    // Short delay between test suites to allow cleanup
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  const totalDuration = Date.now() - startTime;
  console.log(`\n⏱️  Total execution time: ${Math.round(totalDuration / 1000 / 60)} minutes`);

  // Analyze results
  const analysis = analyzeResults(results);

  // Generate and display report
  const report = generateReport(results, analysis);
  const consoleReport = generateConsoleReport(analysis, results);
  console.log(consoleReport);

  // Save report
  await saveReport(report);

  // Exit with appropriate code
  if (analysis.criticalFailures > 0) {
    console.error('\n💥 Critical accessibility failures detected!');
    process.exit(2); // Critical failure
  } else if (analysis.failedSuites > 0) {
    console.warn('\n⚠️  Some accessibility tests failed');
    process.exit(1); // Non-critical failure
  } else {
    console.log('\n🎉 All accessibility tests passed!');
    process.exit(0); // Success
  }
}

// Handle CLI arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Comprehensive Accessibility Test Runner

Usage: node run-all-accessibility-tests.js [options]

Options:
  --help, -h              Show this help message
  --skip-health-check     Skip application health check
  --base-url <url>        Override base URL (default: ${BASE_URL})

Environment Variables:
  BASE_URL               Target application URL
  SKIP_HEALTH_CHECK      Skip health check if set to 'true'

Exit Codes:
  0  All tests passed
  1  Some tests failed (non-critical)
  2  Critical tests failed

Examples:
  node run-all-accessibility-tests.js
  BASE_URL=https://staging.example.com node run-all-accessibility-tests.js
  node run-all-accessibility-tests.js --skip-health-check
  `);
  process.exit(0);
}

// Override base URL from command line
const baseUrlIndex = args.indexOf('--base-url');
if (baseUrlIndex !== -1 && args[baseUrlIndex + 1]) {
  process.env.BASE_URL = args[baseUrlIndex + 1];
}

// Skip health check if requested
if (args.includes('--skip-health-check')) {
  process.env.SKIP_HEALTH_CHECK = 'true';
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Accessibility testing interrupted');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Accessibility testing terminated');
  process.exit(143);
});

// Run the main function
main().catch(error => {
  console.error('\n💥 Fatal error during accessibility testing:', error);
  process.exit(1);
});
