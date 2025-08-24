#!/usr/bin/env node
/**
 * Generate Summary Report for CI/CD
 * Consolidates all accessibility test results into a unified summary
 */

const fs = require('fs').promises;
const path = require('path');

const RESULTS_DIR = path.join(__dirname, '../results');

/**
 * Find and read all result files
 */
async function collectResults() {
  const results = {
    jestAxe: [],
    lighthouse: [],
    pa11y: [],
    timestamp: new Date().toISOString()
  };

  try {
    const files = await fs.readdir(RESULTS_DIR);

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const filePath = path.join(RESULTS_DIR, file);
      const content = await fs.readFile(filePath, 'utf8');

      try {
        const data = JSON.parse(content);

        // Categorize results based on filename or content
        if (file.includes('lighthouse') || data.testType === 'lighthouse') {
          results.lighthouse.push({ file, data });
        } else if (file.includes('pa11y') || data.testType === 'pa11y') {
          results.pa11y.push({ file, data });
        } else {
          results.jestAxe.push({ file, data });
        }
      } catch (parseError) {
        console.warn(`Could not parse ${file}:`, parseError.message);
      }
    }
  } catch (error) {
    console.warn('Could not read results directory:', error.message);
  }

  return results;
}

/**
 * Analyze consolidated results
 */
function analyzeResults(results) {
  const analysis = {
    overview: {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      criticalIssues: 0,
      overallStatus: 'unknown'
    },
    jestAxe: {
      componentTests: 0,
      pageTests: 0,
      violations: 0,
      status: 'unknown'
    },
    lighthouse: {
      pagesAudited: 0,
      averageScore: 0,
      failedPages: 0,
      status: 'unknown'
    },
    pa11y: {
      pagesAudited: 0,
      totalIssues: 0,
      criticalErrors: 0,
      status: 'unknown'
    },
    recommendations: []
  };

  // Analyze Jest + Axe results
  if (results.jestAxe.length > 0) {
    let totalViolations = 0;
    let passedTests = 0;
    let totalTests = 0;

    results.jestAxe.forEach(result => {
      if (result.data.testResults) {
        result.data.testResults.forEach(testFile => {
          testFile.assertionResults.forEach(assertion => {
            totalTests++;
            if (assertion.status === 'passed') {
              passedTests++;
            }
            if (assertion.failureMessages && assertion.failureMessages.length > 0) {
              totalViolations += assertion.failureMessages.length;
            }
          });
        });
      }
    });

    analysis.jestAxe.componentTests = totalTests;
    analysis.jestAxe.violations = totalViolations;
    analysis.jestAxe.status = totalViolations === 0 ? 'passed' : 'failed';

    analysis.overview.totalTests += totalTests;
    analysis.overview.passedTests += passedTests;
  }

  // Analyze Lighthouse results
  if (results.lighthouse.length > 0) {
    let totalScore = 0;
    let pageCount = 0;
    let failedPages = 0;

    results.lighthouse.forEach(result => {
      if (result.data.results) {
        result.data.results.forEach(pageResult => {
          pageCount++;
          const score = pageResult.score || 0;
          totalScore += score;

          if (score < 95) {
            failedPages++;
          }
        });
      }
    });

    analysis.lighthouse.pagesAudited = pageCount;
    analysis.lighthouse.averageScore = pageCount > 0 ? totalScore / pageCount : 0;
    analysis.lighthouse.failedPages = failedPages;
    analysis.lighthouse.status = failedPages === 0 ? 'passed' : 'failed';

    analysis.overview.totalTests += pageCount;
    analysis.overview.passedTests += (pageCount - failedPages);
  }

  // Analyze Pa11y results
  if (results.pa11y.length > 0) {
    let totalIssues = 0;
    let criticalErrors = 0;
    let pageCount = 0;

    results.pa11y.forEach(result => {
      if (result.data.results) {
        result.data.results.forEach(pageResult => {
          pageCount++;
          const issues = pageResult.totalIssues || 0;
          const errors = pageResult.errors ? pageResult.errors.length : 0;

          totalIssues += issues;
          criticalErrors += errors;
        });
      }
    });

    analysis.pa11y.pagesAudited = pageCount;
    analysis.pa11y.totalIssues = totalIssues;
    analysis.pa11y.criticalErrors = criticalErrors;
    analysis.pa11y.status = criticalErrors === 0 ? 'passed' : 'failed';

    analysis.overview.totalTests += pageCount;
    analysis.overview.passedTests += (pageCount - (criticalErrors > 0 ? pageCount : 0));
  }

  // Calculate overall metrics
  analysis.overview.failedTests = analysis.overview.totalTests - analysis.overview.passedTests;
  analysis.overview.criticalIssues = analysis.jestAxe.violations +
                                    analysis.lighthouse.failedPages +
                                    analysis.pa11y.criticalErrors;

  // Determine overall status
  if (analysis.overview.criticalIssues === 0) {
    analysis.overview.overallStatus = 'passed';
  } else if (analysis.overview.criticalIssues > 10) {
    analysis.overview.overallStatus = 'critical';
  } else {
    analysis.overview.overallStatus = 'failed';
  }

  // Generate recommendations
  if (analysis.jestAxe.violations > 0) {
    analysis.recommendations.push(`Fix ${analysis.jestAxe.violations} component-level accessibility violations`);
  }

  if (analysis.lighthouse.failedPages > 0) {
    analysis.recommendations.push(`Improve accessibility scores for ${analysis.lighthouse.failedPages} pages`);
  }

  if (analysis.pa11y.criticalErrors > 0) {
    analysis.recommendations.push(`Address ${analysis.pa11y.criticalErrors} critical WCAG compliance errors`);
  }

  if (analysis.recommendations.length === 0) {
    analysis.recommendations.push('All accessibility tests passed! Continue monitoring for regressions.');
  }

  return analysis;
}

/**
 * Generate summary report
 */
function generateSummaryReport(analysis) {
  const statusIcon = analysis.overview.overallStatus === 'passed' ? '✅' :
                    analysis.overview.overallStatus === 'critical' ? '🚨' : '⚠️';

  let report = `${statusIcon} **Accessibility Test Summary**\n\n`;

  // Overview
  report += '## Overview\n';
  report += `- **Overall Status**: ${analysis.overview.overallStatus.toUpperCase()}\n`;
  report += `- **Total Tests**: ${analysis.overview.totalTests}\n`;
  report += `- **Passed**: ${analysis.overview.passedTests}\n`;
  report += `- **Failed**: ${analysis.overview.failedTests}\n`;
  report += `- **Critical Issues**: ${analysis.overview.criticalIssues}\n\n`;

  // Jest + Axe Results
  if (analysis.jestAxe.componentTests > 0) {
    const jestIcon = analysis.jestAxe.status === 'passed' ? '✅' : '❌';
    report += `## ${jestIcon} Component Tests (Jest + Axe)\n`;
    report += `- **Tests Run**: ${analysis.jestAxe.componentTests}\n`;
    report += `- **Violations Found**: ${analysis.jestAxe.violations}\n`;
    report += `- **Status**: ${analysis.jestAxe.status.toUpperCase()}\n\n`;
  }

  // Lighthouse Results
  if (analysis.lighthouse.pagesAudited > 0) {
    const lighthouseIcon = analysis.lighthouse.status === 'passed' ? '✅' : '❌';
    report += `## ${lighthouseIcon} Lighthouse Audits\n`;
    report += `- **Pages Audited**: ${analysis.lighthouse.pagesAudited}\n`;
    report += `- **Average Score**: ${analysis.lighthouse.averageScore.toFixed(1)}%\n`;
    report += `- **Failed Pages**: ${analysis.lighthouse.failedPages}\n`;
    report += `- **Status**: ${analysis.lighthouse.status.toUpperCase()}\n\n`;
  }

  // Pa11y Results
  if (analysis.pa11y.pagesAudited > 0) {
    const pa11yIcon = analysis.pa11y.status === 'passed' ? '✅' : '❌';
    report += `## ${pa11yIcon} WCAG Compliance (Pa11y)\n`;
    report += `- **Pages Audited**: ${analysis.pa11y.pagesAudited}\n`;
    report += `- **Total Issues**: ${analysis.pa11y.totalIssues}\n`;
    report += `- **Critical Errors**: ${analysis.pa11y.criticalErrors}\n`;
    report += `- **Status**: ${analysis.pa11y.status.toUpperCase()}\n\n`;
  }

  // Recommendations
  if (analysis.recommendations.length > 0) {
    report += '## 📋 Recommendations\n';
    analysis.recommendations.forEach(rec => {
      report += `- ${rec}\n`;
    });
    report += '\n';
  }

  // Next Steps
  report += '## 🎯 Next Steps\n';
  if (analysis.overview.overallStatus === 'critical') {
    report += '- 🚨 **URGENT**: Address critical accessibility issues immediately\n';
    report += '- 📋 Review detailed test outputs for specific violations\n';
    report += '- 🔄 Re-run tests after fixes are implemented\n';
  } else if (analysis.overview.overallStatus === 'failed') {
    report += '- ⚠️ Review failed tests and implement accessibility improvements\n';
    report += '- 📊 Monitor accessibility metrics in future releases\n';
    report += '- 🧪 Add regression tests for fixed issues\n';
  } else {
    report += '- ✅ Continue monitoring accessibility in CI/CD pipeline\n';
    report += '- 📈 Consider implementing accessibility performance budgets\n';
    report += '- 🎓 Share accessibility best practices with the team\n';
  }

  return report;
}

/**
 * Main execution
 */
async function main() {
  console.log('🔍 Collecting accessibility test results...');

  const results = await collectResults();
  const analysis = analyzeResults(results);
  const summaryReport = generateSummaryReport(analysis);

  // Save comprehensive analysis
  const analysisPath = path.join(RESULTS_DIR, 'accessibility-comprehensive-report.json');
  await fs.writeFile(analysisPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    results,
    analysis,
    summary: summaryReport
  }, null, 2));

  // Save human-readable summary
  const summaryPath = path.join(RESULTS_DIR, 'accessibility-summary.txt');
  await fs.writeFile(summaryPath, summaryReport);

  console.log('📊 Summary report generated:');
  console.log(`   Analysis: ${analysisPath}`);
  console.log(`   Summary: ${summaryPath}`);

  // Output summary to console
  console.log('\n' + summaryReport);

  // Exit with appropriate code for CI
  if (analysis.overview.overallStatus === 'critical') {
    process.exit(2);
  } else if (analysis.overview.overallStatus === 'failed') {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Error generating summary report:', error);
    process.exit(1);
  });
}

module.exports = {
  collectResults,
  analyzeResults,
  generateSummaryReport
};
