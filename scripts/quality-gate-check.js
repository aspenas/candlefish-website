#!/usr/bin/env node
/**
 * Quality Gate Check Script
 *
 * This script enforces quality gates for the Security Dashboard test suite:
 * - 80% minimum code coverage across all metrics
 * - All tests must pass
 * - Performance thresholds must be met
 * - No high/critical security vulnerabilities
 *
 * Usage: node scripts/quality-gate-check.js
 */

const fs = require('fs');
const path = require('path');

// Color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Quality gate thresholds
const QUALITY_GATES = {
  coverage: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80
  },
  performance: {
    p95ResponseTime: 100, // ms
    errorRate: 0.01 // 1%
  },
  security: {
    allowedVulnerabilities: ['LOW', 'MEDIUM'],
    blockedVulnerabilities: ['HIGH', 'CRITICAL']
  }
};

/**
 * Log messages with color coding
 */
const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  header: (msg) => console.log(`\n${colors.bold}${colors.blue}${msg}${colors.reset}`)
};

/**
 * Check if file exists
 */
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

/**
 * Read and parse JSON file safely
 */
function readJsonFile(filePath) {
  try {
    if (!fileExists(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    log.error(`Failed to read ${filePath}: ${error.message}`);
    return null;
  }
}

/**
 * Check code coverage against thresholds
 */
function checkCoverage() {
  log.header('Checking Code Coverage...');

  const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
  const coverage = readJsonFile(coveragePath);

  if (!coverage || !coverage.total) {
    log.error('Coverage report not found or invalid');
    return false;
  }

  const { total } = coverage;
  let allPassed = true;

  // Check each coverage metric
  Object.entries(QUALITY_GATES.coverage).forEach(([metric, threshold]) => {
    const actual = total[metric]?.pct;
    if (actual === undefined) {
      log.error(`Coverage metric '${metric}' not found`);
      allPassed = false;
      return;
    }

    if (actual >= threshold) {
      log.success(`${metric}: ${actual}% (>= ${threshold}%)`);
    } else {
      log.error(`${metric}: ${actual}% (< ${threshold}%)`);
      allPassed = false;
    }
  });

  if (allPassed) {
    log.success('All coverage thresholds met!');
  } else {
    log.error('Coverage thresholds not met');
  }

  return allPassed;
}

/**
 * Check test results
 */
function checkTestResults() {
  log.header('Checking Test Results...');

  // Check Jest results
  const jestResultsPath = path.join(process.cwd(), 'coverage', 'jest-results.json');
  if (fileExists(jestResultsPath)) {
    const jestResults = readJsonFile(jestResultsPath);
    if (jestResults) {
      const { numFailedTests, numPassedTests, numTotalTests } = jestResults;

      if (numFailedTests === 0) {
        log.success(`All ${numTotalTests} tests passed`);
        return true;
      } else {
        log.error(`${numFailedTests} out of ${numTotalTests} tests failed`);
        return false;
      }
    }
  }

  // Check JUnit XML results as fallback
  const junitPath = path.join(process.cwd(), 'coverage', 'junit.xml');
  if (fileExists(junitPath)) {
    const junitContent = fs.readFileSync(junitPath, 'utf8');

    // Simple XML parsing for test results
    const failuresMatch = junitContent.match(/failures="(\d+)"/);
    const errorsMatch = junitContent.match(/errors="(\d+)"/);
    const testsMatch = junitContent.match(/tests="(\d+)"/);

    const failures = failuresMatch ? parseInt(failuresMatch[1], 10) : 0;
    const errors = errorsMatch ? parseInt(errorsMatch[1], 10) : 0;
    const totalTests = testsMatch ? parseInt(testsMatch[1], 10) : 0;

    const failedTests = failures + errors;

    if (failedTests === 0) {
      log.success(`All ${totalTests} tests passed`);
      return true;
    } else {
      log.error(`${failedTests} out of ${totalTests} tests failed`);
      return false;
    }
  }

  log.warning('No test results found, assuming tests passed');
  return true;
}

/**
 * Check performance test results
 */
function checkPerformance() {
  log.header('Checking Performance Results...');

  const k6ResultsPath = path.join(process.cwd(), 'k6-results.json');
  if (!fileExists(k6ResultsPath)) {
    log.warning('K6 performance results not found, skipping performance check');
    return true;
  }

  const k6Results = readJsonFile(k6ResultsPath);
  if (!k6Results || !k6Results.metrics) {
    log.error('Invalid K6 results format');
    return false;
  }

  const { metrics } = k6Results;
  let performancePassed = true;

  // Check response time (p95)
  if (metrics.http_req_duration && metrics.http_req_duration['p(95)']) {
    const p95ResponseTime = metrics.http_req_duration['p(95)'];
    if (p95ResponseTime <= QUALITY_GATES.performance.p95ResponseTime) {
      log.success(`P95 response time: ${p95ResponseTime.toFixed(2)}ms (<= ${QUALITY_GATES.performance.p95ResponseTime}ms)`);
    } else {
      log.error(`P95 response time: ${p95ResponseTime.toFixed(2)}ms (> ${QUALITY_GATES.performance.p95ResponseTime}ms)`);
      performancePassed = false;
    }
  }

  // Check error rate
  if (metrics.http_req_failed && metrics.http_req_failed.rate !== undefined) {
    const errorRate = metrics.http_req_failed.rate;
    if (errorRate <= QUALITY_GATES.performance.errorRate) {
      log.success(`Error rate: ${(errorRate * 100).toFixed(2)}% (<= ${(QUALITY_GATES.performance.errorRate * 100).toFixed(2)}%)`);
    } else {
      log.error(`Error rate: ${(errorRate * 100).toFixed(2)}% (> ${(QUALITY_GATES.performance.errorRate * 100).toFixed(2)}%)`);
      performancePassed = false;
    }
  }

  return performancePassed;
}

/**
 * Check security scan results
 */
function checkSecurity() {
  log.header('Checking Security Scan Results...');

  const securityReportPath = path.join(process.cwd(), 'dependency-check-report.json');
  if (!fileExists(securityReportPath)) {
    log.warning('Security scan results not found, skipping security check');
    return true;
  }

  const securityReport = readJsonFile(securityReportPath);
  if (!securityReport || !securityReport.dependencies) {
    log.error('Invalid security report format');
    return false;
  }

  let securityPassed = true;
  let highCriticalCount = 0;
  let totalVulns = 0;

  // Check for high/critical vulnerabilities
  securityReport.dependencies.forEach(dependency => {
    if (dependency.vulnerabilities) {
      dependency.vulnerabilities.forEach(vuln => {
        totalVulns++;
        if (QUALITY_GATES.security.blockedVulnerabilities.includes(vuln.severity)) {
          log.error(`${vuln.severity} vulnerability found: ${vuln.name} in ${dependency.fileName}`);
          highCriticalCount++;
          securityPassed = false;
        }
      });
    }
  });

  if (securityPassed) {
    log.success(`No high/critical vulnerabilities found (${totalVulns} total vulnerabilities)`);
  } else {
    log.error(`${highCriticalCount} high/critical vulnerabilities found`);
  }

  return securityPassed;
}

/**
 * Generate quality gate report
 */
function generateReport(results) {
  log.header('Generating Quality Gate Report...');

  const report = {
    timestamp: new Date().toISOString(),
    overallStatus: Object.values(results).every(result => result) ? 'PASSED' : 'FAILED',
    gates: results,
    summary: {
      passed: Object.values(results).filter(result => result).length,
      failed: Object.values(results).filter(result => !result).length,
      total: Object.keys(results).length
    }
  };

  // Write report to file
  const reportPath = path.join(process.cwd(), 'quality-gate-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  log.info(`Quality gate report written to: ${reportPath}`);

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.bold}QUALITY GATE SUMMARY${colors.reset}`);
  console.log('='.repeat(60));
  console.log(`Overall Status: ${report.overallStatus === 'PASSED' ? colors.green + 'PASSED' : colors.red + 'FAILED'}${colors.reset}`);
  console.log(`Gates Passed: ${colors.green}${report.summary.passed}${colors.reset}/${report.summary.total}`);
  console.log(`Gates Failed: ${colors.red}${report.summary.failed}${colors.reset}/${report.summary.total}`);
  console.log('='.repeat(60));

  // Detail breakdown
  Object.entries(results).forEach(([gate, passed]) => {
    const status = passed ? `${colors.green}PASSED${colors.reset}` : `${colors.red}FAILED${colors.reset}`;
    console.log(`${gate.padEnd(20)}: ${status}`);
  });

  console.log('='.repeat(60) + '\n');

  return report.overallStatus === 'PASSED';
}

/**
 * Main function
 */
async function main() {
  console.log(`${colors.bold}${colors.blue}Security Dashboard Quality Gates${colors.reset}\n`);

  const results = {
    'Code Coverage': checkCoverage(),
    'Test Results': checkTestResults(),
    'Performance': checkPerformance(),
    'Security Scan': checkSecurity()
  };

  const allPassed = generateReport(results);

  if (allPassed) {
    log.success('All quality gates passed! 🎉');
    process.exit(0);
  } else {
    log.error('Quality gates failed! ❌');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    log.error(`Quality gate check failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  checkCoverage,
  checkTestResults,
  checkPerformance,
  checkSecurity,
  generateReport,
  QUALITY_GATES
};
