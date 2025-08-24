#!/usr/bin/env node

/**
 * Performance Regression Check Script
 * Analyzes k6 performance test results to detect regressions
 */

const fs = require('fs');
const path = require('path');

// Performance thresholds
const THRESHOLDS = {
  // Response time thresholds (milliseconds)
  p95_response_time: 2000,  // 95th percentile < 2s
  p99_response_time: 5000,  // 99th percentile < 5s
  avg_response_time: 1000,  // Average < 1s

  // Error rate thresholds (percentage)
  max_error_rate: 5,        // < 5% error rate

  // Throughput thresholds
  min_rps: 10,              // > 10 requests per second

  // Resource utilization
  max_cpu_usage: 80,        // < 80% CPU
  max_memory_mb: 512,       // < 512 MB memory
};

// Historical baseline (would typically be loaded from storage)
const BASELINE = {
  p95_response_time: 1200,
  p99_response_time: 2500,
  avg_response_time: 600,
  error_rate: 1.2,
  rps: 25,
  cpu_usage: 45,
  memory_mb: 256,
};

// Regression tolerance (percentage increase that triggers alert)
const REGRESSION_TOLERANCE = {
  response_time: 20,    // 20% slower
  error_rate: 100,      // 100% more errors (e.g., 1% -> 2%)
  throughput: -10,      // 10% slower throughput
  resource_usage: 30,   // 30% more resource usage
};

function parseK6Results(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    const lines = data.trim().split('\n');
    const results = lines.map(line => JSON.parse(line));

    return analyzeResults(results);
  } catch (error) {
    console.error(`❌ Failed to parse k6 results: ${error.message}`);
    process.exit(1);
  }
}

function analyzeResults(results) {
  const metrics = {
    http_req_duration: [],
    http_req_failed: [],
    http_reqs: [],
    vus: [],
  };

  let totalRequests = 0;
  let failedRequests = 0;

  results.forEach(result => {
    if (result.type === 'Point') {
      const metricName = result.metric;
      const value = result.data.value;

      switch (metricName) {
        case 'http_req_duration':
          metrics.http_req_duration.push(value);
          break;
        case 'http_req_failed':
          if (value > 0) failedRequests++;
          totalRequests++;
          break;
        case 'http_reqs':
          metrics.http_reqs.push(value);
          break;
        case 'vus':
          metrics.vus.push(value);
          break;
      }
    }
  });

  return calculateStatistics(metrics, totalRequests, failedRequests);
}

function calculateStatistics(metrics, totalRequests, failedRequests) {
  const stats = {
    // Response time statistics
    avg_response_time: calculateAverage(metrics.http_req_duration),
    p95_response_time: calculatePercentile(metrics.http_req_duration, 95),
    p99_response_time: calculatePercentile(metrics.http_req_duration, 99),

    // Error rate
    error_rate: totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0,

    // Throughput
    total_requests: totalRequests,
    rps: calculateAverage(metrics.http_reqs) || 0,

    // Virtual users
    max_vus: Math.max(...metrics.vus, 0),
    avg_vus: calculateAverage(metrics.vus),
  };

  return stats;
}

function calculateAverage(values) {
  if (!values || values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

function calculatePercentile(values, percentile) {
  if (!values || values.length === 0) return 0;

  const sorted = values.slice().sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function checkThresholds(stats) {
  const violations = [];

  if (stats.p95_response_time > THRESHOLDS.p95_response_time) {
    violations.push(`P95 response time: ${stats.p95_response_time.toFixed(2)}ms > ${THRESHOLDS.p95_response_time}ms`);
  }

  if (stats.p99_response_time > THRESHOLDS.p99_response_time) {
    violations.push(`P99 response time: ${stats.p99_response_time.toFixed(2)}ms > ${THRESHOLDS.p99_response_time}ms`);
  }

  if (stats.avg_response_time > THRESHOLDS.avg_response_time) {
    violations.push(`Average response time: ${stats.avg_response_time.toFixed(2)}ms > ${THRESHOLDS.avg_response_time}ms`);
  }

  if (stats.error_rate > THRESHOLDS.max_error_rate) {
    violations.push(`Error rate: ${stats.error_rate.toFixed(2)}% > ${THRESHOLDS.max_error_rate}%`);
  }

  if (stats.rps < THRESHOLDS.min_rps) {
    violations.push(`Throughput: ${stats.rps.toFixed(2)} RPS < ${THRESHOLDS.min_rps} RPS`);
  }

  return violations;
}

function checkRegressions(stats) {
  const regressions = [];

  // Check response time regression
  const responseTimeRegression = ((stats.avg_response_time - BASELINE.avg_response_time) / BASELINE.avg_response_time) * 100;
  if (responseTimeRegression > REGRESSION_TOLERANCE.response_time) {
    regressions.push(`Response time regression: ${responseTimeRegression.toFixed(1)}% slower than baseline`);
  }

  // Check error rate regression
  const errorRateRegression = ((stats.error_rate - BASELINE.error_rate) / BASELINE.error_rate) * 100;
  if (errorRateRegression > REGRESSION_TOLERANCE.error_rate) {
    regressions.push(`Error rate regression: ${errorRateRegression.toFixed(1)}% higher than baseline`);
  }

  // Check throughput regression
  const throughputRegression = ((stats.rps - BASELINE.rps) / BASELINE.rps) * 100;
  if (throughputRegression < REGRESSION_TOLERANCE.throughput) {
    regressions.push(`Throughput regression: ${Math.abs(throughputRegression).toFixed(1)}% slower than baseline`);
  }

  return regressions;
}

function generateReport(stats, thresholdViolations, regressions) {
  console.log('\n📊 Performance Test Analysis Report');
  console.log('=====================================\n');

  // Current metrics
  console.log('📈 Current Performance Metrics:');
  console.log(`  Average Response Time: ${stats.avg_response_time.toFixed(2)}ms`);
  console.log(`  P95 Response Time: ${stats.p95_response_time.toFixed(2)}ms`);
  console.log(`  P99 Response Time: ${stats.p99_response_time.toFixed(2)}ms`);
  console.log(`  Error Rate: ${stats.error_rate.toFixed(2)}%`);
  console.log(`  Throughput: ${stats.rps.toFixed(2)} requests/sec`);
  console.log(`  Total Requests: ${stats.total_requests}`);
  console.log(`  Max Virtual Users: ${stats.max_vus}`);

  // Baseline comparison
  console.log('\n🔍 Baseline Comparison:');
  console.log(`  Response Time: ${BASELINE.avg_response_time}ms → ${stats.avg_response_time.toFixed(2)}ms (${((stats.avg_response_time - BASELINE.avg_response_time) / BASELINE.avg_response_time * 100).toFixed(1)}%)`);
  console.log(`  Error Rate: ${BASELINE.error_rate}% → ${stats.error_rate.toFixed(2)}% (${((stats.error_rate - BASELINE.error_rate) / BASELINE.error_rate * 100).toFixed(1)}%)`);
  console.log(`  Throughput: ${BASELINE.rps} RPS → ${stats.rps.toFixed(2)} RPS (${((stats.rps - BASELINE.rps) / BASELINE.rps * 100).toFixed(1)}%)`);

  // Threshold violations
  if (thresholdViolations.length > 0) {
    console.log('\n❌ Threshold Violations:');
    thresholdViolations.forEach(violation => {
      console.log(`  • ${violation}`);
    });
  } else {
    console.log('\n✅ All thresholds passed');
  }

  // Regressions
  if (regressions.length > 0) {
    console.log('\n⚠️  Performance Regressions:');
    regressions.forEach(regression => {
      console.log(`  • ${regression}`);
    });
  } else {
    console.log('\n✅ No performance regressions detected');
  }

  // Overall result
  const hasIssues = thresholdViolations.length > 0 || regressions.length > 0;
  if (hasIssues) {
    console.log('\n🔴 PERFORMANCE CHECK FAILED');
    console.log('Please investigate and address the performance issues above.');
    return false;
  } else {
    console.log('\n🟢 PERFORMANCE CHECK PASSED');
    console.log('All performance metrics are within acceptable ranges.');
    return true;
  }
}

function saveResults(stats, outputPath) {
  const report = {
    timestamp: new Date().toISOString(),
    metrics: stats,
    thresholds: THRESHOLDS,
    baseline: BASELINE,
    status: 'completed'
  };

  try {
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Results saved to: ${outputPath}`);
  } catch (error) {
    console.warn(`⚠️  Failed to save results: ${error.message}`);
  }
}

function createGitHubSummary(stats, thresholdViolations, regressions, passed) {
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryFile) return;

  let summary = '## 🏃‍♂️ Performance Test Results\n\n';

  if (passed) {
    summary += '✅ **PASSED** - All performance metrics are within acceptable ranges\n\n';
  } else {
    summary += '❌ **FAILED** - Performance issues detected\n\n';
  }

  summary += '### 📊 Key Metrics\n\n';
  summary += '| Metric | Value | Baseline | Change |\n';
  summary += '|--------|-------|----------|--------|\n';
  summary += `| Avg Response Time | ${stats.avg_response_time.toFixed(2)}ms | ${BASELINE.avg_response_time}ms | ${((stats.avg_response_time - BASELINE.avg_response_time) / BASELINE.avg_response_time * 100).toFixed(1)}% |\n`;
  summary += `| Error Rate | ${stats.error_rate.toFixed(2)}% | ${BASELINE.error_rate}% | ${((stats.error_rate - BASELINE.error_rate) / BASELINE.error_rate * 100).toFixed(1)}% |\n`;
  summary += `| Throughput | ${stats.rps.toFixed(2)} RPS | ${BASELINE.rps} RPS | ${((stats.rps - BASELINE.rps) / BASELINE.rps * 100).toFixed(1)}% |\n`;

  if (thresholdViolations.length > 0) {
    summary += '\n### ❌ Threshold Violations\n\n';
    thresholdViolations.forEach(violation => {
      summary += `- ${violation}\n`;
    });
  }

  if (regressions.length > 0) {
    summary += '\n### ⚠️ Performance Regressions\n\n';
    regressions.forEach(regression => {
      summary += `- ${regression}\n`;
    });
  }

  try {
    fs.writeFileSync(summaryFile, summary);
  } catch (error) {
    console.warn(`⚠️  Failed to write GitHub summary: ${error.message}`);
  }
}

// Main execution
function main() {
  const resultsFile = process.argv[2];

  if (!resultsFile) {
    console.error('❌ Usage: node check-performance-regression.js <k6-results.json>');
    process.exit(1);
  }

  if (!fs.existsSync(resultsFile)) {
    console.error(`❌ Results file not found: ${resultsFile}`);
    process.exit(1);
  }

  console.log(`🔍 Analyzing performance results from: ${resultsFile}`);

  // Parse and analyze results
  const stats = parseK6Results(resultsFile);

  // Check thresholds and regressions
  const thresholdViolations = checkThresholds(stats);
  const regressions = checkRegressions(stats);

  // Generate report
  const passed = generateReport(stats, thresholdViolations, regressions);

  // Save results
  const outputPath = path.join(path.dirname(resultsFile), 'performance-analysis.json');
  saveResults(stats, outputPath);

  // Create GitHub summary if running in CI
  if (process.env.CI) {
    createGitHubSummary(stats, thresholdViolations, regressions, passed);
  }

  // Exit with appropriate code
  process.exit(passed ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = {
  parseK6Results,
  checkThresholds,
  checkRegressions,
  calculateStatistics,
  THRESHOLDS,
  REGRESSION_TOLERANCE
};
