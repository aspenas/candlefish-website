// Global test teardown for Paintbox Production Features Test Suite

const fs = require('fs');
const path = require('path');

module.exports = async () => {
  console.log('🧹 Cleaning up global test environment...');

  // Restore original environment variables
  if (global.__ORIGINAL_ENV__) {
    Object.entries(global.__ORIGINAL_ENV__).forEach(([key, value]) => {
      if (value !== undefined) {
        process.env[key] = value;
      } else {
        delete process.env[key];
      }
    });
    delete global.__ORIGINAL_ENV__;
  }

  // Clean up test utilities
  delete global.testUtils;

  // Archive old test results
  await archiveTestResults();

  // Generate final test summary
  await generateTestSummary();

  console.log('✅ Global test environment cleanup complete');
};

async function archiveTestResults() {
  const testResultsDir = path.join(process.cwd(), 'test-results');
  const archiveDir = path.join(testResultsDir, 'archive', new Date().toISOString().split('T')[0]);

  if (fs.existsSync(testResultsDir)) {
    // Create archive directory
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }

    // Move old XML files to archive
    const files = fs.readdirSync(testResultsDir);
    const xmlFiles = files.filter(file => file.endsWith('.xml') && fs.statSync(path.join(testResultsDir, file)).mtime < new Date(Date.now() - 24 * 60 * 60 * 1000));

    xmlFiles.forEach(file => {
      const oldPath = path.join(testResultsDir, file);
      const newPath = path.join(archiveDir, file);
      try {
        fs.renameSync(oldPath, newPath);
      } catch (error) {
        console.warn(`Failed to archive ${file}:`, error.message);
      }
    });

    if (xmlFiles.length > 0) {
      console.log(`📁 Archived ${xmlFiles.length} old test result files`);
    }
  }
}

async function generateTestSummary() {
  const testResultsDir = path.join(process.cwd(), 'test-results');
  const coverageDir = path.join(process.cwd(), 'coverage');

  if (!fs.existsSync(testResultsDir)) {
    return;
  }

  const summaryFile = path.join(testResultsDir, 'test-summary.json');
  const summary = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'test',
    ci: process.env.CI === 'true',
    results: {},
    coverage: null,
  };

  // Collect test results
  const xmlFiles = fs.readdirSync(testResultsDir).filter(file => file.endsWith('.xml'));
  xmlFiles.forEach(file => {
    const testType = file.replace('-tests.xml', '').replace('.xml', '');
    summary.results[testType] = {
      file: file,
      timestamp: fs.statSync(path.join(testResultsDir, file)).mtime.toISOString(),
    };
  });

  // Collect coverage data
  const coverageSummaryFile = path.join(coverageDir, 'coverage-summary.json');
  if (fs.existsSync(coverageSummaryFile)) {
    try {
      const coverageData = JSON.parse(fs.readFileSync(coverageSummaryFile, 'utf8'));
      summary.coverage = {
        lines: coverageData.total.lines.pct,
        functions: coverageData.total.functions.pct,
        branches: coverageData.total.branches.pct,
        statements: coverageData.total.statements.pct,
        threshold: 80, // This should match your Jest config
      };
    } catch (error) {
      console.warn('Failed to read coverage summary:', error.message);
    }
  }

  // Write summary
  try {
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
    console.log(`📊 Test summary saved to: ${summaryFile}`);
  } catch (error) {
    console.warn('Failed to write test summary:', error.message);
  }

  // Print final summary to console
  console.log('\n📈 Test Execution Summary:');
  console.log('===============================');
  Object.entries(summary.results).forEach(([testType, data]) => {
    console.log(`• ${testType}: ✅ ${data.file}`);
  });

  if (summary.coverage) {
    console.log('\n📊 Coverage Summary:');
    console.log(`• Lines: ${summary.coverage.lines}%`);
    console.log(`• Functions: ${summary.coverage.functions}%`);
    console.log(`• Branches: ${summary.coverage.branches}%`);
    console.log(`• Statements: ${summary.coverage.statements}%`);

    const meetsThreshold = Object.values(summary.coverage)
      .slice(0, 4) // Only check the percentage values
      .every(pct => pct >= summary.coverage.threshold);

    console.log(`• Threshold (${summary.coverage.threshold}%): ${meetsThreshold ? '✅ Met' : '❌ Not Met'}`);
  }

  console.log('===============================\n');
}
