#!/usr/bin/env node

/**
 * Coverage threshold checker
 * Ensures test coverage meets minimum requirements
 */

const fs = require('fs');
const path = require('path');

// Coverage thresholds from jest.config.js
const THRESHOLDS = {
  branches: 80,
  functions: 80,
  lines: 80,
  statements: 80,
};

function readCoverage() {
  const coveragePath = path.join(__dirname, '../coverage/coverage-summary.json');

  if (!fs.existsSync(coveragePath)) {
    console.error('❌ Coverage file not found. Run tests first: npm run test:coverage');
    process.exit(1);
  }

  try {
    const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
    return coverage.total;
  } catch (error) {
    console.error('❌ Failed to read coverage file:', error.message);
    process.exit(1);
  }
}

function checkCoverage(coverage) {
  console.log('\n📊 Coverage Report');
  console.log('==================');

  let passed = true;
  const metrics = ['branches', 'functions', 'lines', 'statements'];

  for (const metric of metrics) {
    const actual = coverage[metric].pct;
    const threshold = THRESHOLDS[metric];
    const status = actual >= threshold ? '✅' : '❌';

    if (actual < threshold) {
      passed = false;
    }

    console.log(`${status} ${metric.padEnd(12)}: ${actual.toFixed(2)}% (required: ${threshold}%)`);
  }

  console.log('==================');

  if (passed) {
    console.log('✅ All coverage thresholds met!');
    return true;
  } else {
    console.log('❌ Coverage thresholds not met. Please add more tests.');
    return false;
  }
}

function generateCoverageReport(coverage) {
  const report = `
# Test Coverage Report

## Summary
- **Branches**: ${coverage.branches.pct.toFixed(2)}% (${coverage.branches.covered}/${coverage.branches.total})
- **Functions**: ${coverage.functions.pct.toFixed(2)}% (${coverage.functions.covered}/${coverage.functions.total})
- **Lines**: ${coverage.lines.pct.toFixed(2)}% (${coverage.lines.covered}/${coverage.lines.total})
- **Statements**: ${coverage.statements.pct.toFixed(2)}% (${coverage.statements.covered}/${coverage.statements.total})

## Status
${Object.entries(THRESHOLDS).map(([metric, threshold]) => {
  const actual = coverage[metric].pct;
  const status = actual >= threshold ? '✅ PASS' : '❌ FAIL';
  return `- **${metric}**: ${status} (${actual.toFixed(2)}% >= ${threshold}%)`;
}).join('\n')}

Generated on: ${new Date().toISOString()}
`;

  const reportPath = path.join(__dirname, '../coverage/report.md');
  fs.writeFileSync(reportPath, report);
  console.log(`\n📝 Coverage report saved to: ${reportPath}`);
}

function main() {
  const coverage = readCoverage();
  const passed = checkCoverage(coverage);
  generateCoverageReport(coverage);

  if (!passed) {
    console.log('\n💡 Tips for improving coverage:');
    console.log('   • Add tests for uncovered functions');
    console.log('   • Test error handling and edge cases');
    console.log('   • Add integration tests for component interactions');
    console.log('   • Test animation state changes and lifecycle methods');
    console.log('\n   Run "npm run test:coverage" to see detailed coverage report');

    process.exit(1);
  }

  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = { checkCoverage, readCoverage };
