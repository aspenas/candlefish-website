#!/usr/bin/env node

/**
 * Test Coverage Report Generator
 * Consolidates coverage from multiple test suites and generates reports
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Coverage thresholds
const COVERAGE_THRESHOLDS = {
  statements: 80,
  branches: 75,
  functions: 80,
  lines: 80,
};

// Component mapping for better reporting
const COMPONENTS = {
  'backend': {
    name: 'Backend API (Go)',
    paths: ['5470_S_Highline_Circle/backend/**'],
    priority: 'high',
  },
  'frontend': {
    name: 'Frontend React',
    paths: ['apps/api-site/**', 'apps/docs-site/**'],
    priority: 'high',
  },
  'mobile': {
    name: 'Mobile App (React Native)',
    paths: ['apps/mobile-inventory/**'],
    priority: 'high',
  },
  'graphql': {
    name: 'GraphQL Resolvers',
    paths: ['graphql/**'],
    priority: 'high',
  },
  'integration': {
    name: 'Integration Tests',
    paths: ['__tests__/integration/**'],
    priority: 'medium',
  },
  'security': {
    name: 'Security Tests',
    paths: ['__tests__/security/**'],
    priority: 'high',
  },
};

class CoverageReporter {
  constructor(options = {}) {
    this.coverageDir = options.coverageDir || './coverage';
    this.outputDir = options.outputDir || './coverage/reports';
    this.thresholds = { ...COVERAGE_THRESHOLDS, ...options.thresholds };

    this.ensureDirectories();
  }

  ensureDirectories() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async generateReport() {
    console.log('📊 Generating comprehensive coverage report...\n');

    const coverageData = await this.collectCoverageData();
    const consolidatedReport = this.consolidateReports(coverageData);
    const analysis = this.analyzeCoverage(consolidatedReport);

    // Generate different report formats
    await this.generateHTMLReport(consolidatedReport, analysis);
    await this.generateMarkdownReport(consolidatedReport, analysis);
    await this.generateJSONReport(consolidatedReport, analysis);
    await this.generateBadges(consolidatedReport);

    // Output summary to console
    this.printSummary(analysis);

    return analysis;
  }

  async collectCoverageData() {
    const coverageFiles = glob.sync(`${this.coverageDir}/**/coverage-summary.json`);
    const coverageData = {};

    console.log('🔍 Collecting coverage data from:');

    for (const file of coverageFiles) {
      try {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        const component = this.identifyComponent(file);

        console.log(`  • ${file} → ${component}`);

        coverageData[component] = {
          ...data,
          filePath: file,
          component: COMPONENTS[component] || { name: component, priority: 'low' },
        };
      } catch (error) {
        console.warn(`⚠️  Failed to parse ${file}: ${error.message}`);
      }
    }

    return coverageData;
  }

  identifyComponent(filePath) {
    const normalizedPath = filePath.replace(/\\/g, '/');

    for (const [component, config] of Object.entries(COMPONENTS)) {
      if (normalizedPath.includes(`/${component}/`) ||
          normalizedPath.includes(`${component}-coverage`) ||
          normalizedPath.includes(`coverage/${component}`)) {
        return component;
      }
    }

    // Extract component name from path
    const pathParts = normalizedPath.split('/');
    const coverageIndex = pathParts.findIndex(part => part === 'coverage');

    if (coverageIndex >= 0 && pathParts.length > coverageIndex + 1) {
      return pathParts[coverageIndex + 1];
    }

    return 'unknown';
  }

  consolidateReports(coverageData) {
    const consolidated = {
      timestamp: new Date().toISOString(),
      components: coverageData,
      total: {
        statements: { total: 0, covered: 0, pct: 0 },
        branches: { total: 0, covered: 0, pct: 0 },
        functions: { total: 0, covered: 0, pct: 0 },
        lines: { total: 0, covered: 0, pct: 0 },
      },
    };

    // Calculate totals
    for (const [component, data] of Object.entries(coverageData)) {
      if (data.total) {
        const total = data.total;
        consolidated.total.statements.total += total.statements?.total || 0;
        consolidated.total.statements.covered += total.statements?.covered || 0;
        consolidated.total.branches.total += total.branches?.total || 0;
        consolidated.total.branches.covered += total.branches?.covered || 0;
        consolidated.total.functions.total += total.functions?.total || 0;
        consolidated.total.functions.covered += total.functions?.covered || 0;
        consolidated.total.lines.total += total.lines?.total || 0;
        consolidated.total.lines.covered += total.lines?.covered || 0;
      }
    }

    // Calculate percentages
    for (const metric of ['statements', 'branches', 'functions', 'lines']) {
      const total = consolidated.total[metric].total;
      const covered = consolidated.total[metric].covered;
      consolidated.total[metric].pct = total > 0 ? (covered / total) * 100 : 0;
    }

    return consolidated;
  }

  analyzeCoverage(report) {
    const analysis = {
      overall: 'pass',
      components: {},
      summary: {
        totalComponents: Object.keys(report.components).length,
        passedComponents: 0,
        failedComponents: 0,
        coverageScore: 0,
      },
      issues: [],
      recommendations: [],
    };

    // Analyze overall coverage
    const overallPasses = Object.entries(this.thresholds).every(([metric, threshold]) => {
      return report.total[metric]?.pct >= threshold;
    });

    analysis.overall = overallPasses ? 'pass' : 'fail';

    // Calculate coverage score (weighted average)
    const weights = { statements: 0.3, branches: 0.3, functions: 0.2, lines: 0.2 };
    analysis.summary.coverageScore = Object.entries(weights).reduce((score, [metric, weight]) => {
      return score + (report.total[metric]?.pct || 0) * weight;
    }, 0);

    // Analyze individual components
    for (const [component, data] of Object.entries(report.components)) {
      const componentAnalysis = {
        status: 'pass',
        metrics: {},
        issues: [],
      };

      if (data.total) {
        for (const [metric, threshold] of Object.entries(this.thresholds)) {
          const coverage = data.total[metric]?.pct || 0;
          const passed = coverage >= threshold;

          componentAnalysis.metrics[metric] = {
            coverage,
            threshold,
            passed,
            gap: passed ? 0 : threshold - coverage,
          };

          if (!passed) {
            componentAnalysis.status = 'fail';
            componentAnalysis.issues.push(
              `${metric}: ${coverage.toFixed(1)}% < ${threshold}% (gap: ${(threshold - coverage).toFixed(1)}%)`
            );
          }
        }
      } else {
        componentAnalysis.status = 'unknown';
        componentAnalysis.issues.push('No coverage data available');
      }

      analysis.components[component] = componentAnalysis;

      // Update summary
      if (componentAnalysis.status === 'pass') {
        analysis.summary.passedComponents++;
      } else if (componentAnalysis.status === 'fail') {
        analysis.summary.failedComponents++;
      }
    }

    // Generate recommendations
    this.generateRecommendations(analysis, report);

    return analysis;
  }

  generateRecommendations(analysis, report) {
    // Identify components with low coverage
    const lowCoverageComponents = Object.entries(analysis.components)
      .filter(([, data]) => data.status === 'fail')
      .sort(([, a], [, b]) => {
        const aScore = Object.values(a.metrics).reduce((sum, m) => sum + (m.gap || 0), 0);
        const bScore = Object.values(b.metrics).reduce((sum, m) => sum + (m.gap || 0), 0);
        return bScore - aScore;
      });

    if (lowCoverageComponents.length > 0) {
      analysis.recommendations.push({
        type: 'coverage',
        priority: 'high',
        title: 'Improve coverage for critical components',
        description: `${lowCoverageComponents.length} components have coverage below thresholds`,
        components: lowCoverageComponents.map(([name]) => name),
      });
    }

    // Check for missing components
    const expectedComponents = ['backend', 'frontend', 'mobile', 'graphql'];
    const missingComponents = expectedComponents.filter(
      comp => !report.components[comp]
    );

    if (missingComponents.length > 0) {
      analysis.recommendations.push({
        type: 'missing',
        priority: 'medium',
        title: 'Add coverage for missing components',
        description: 'Some expected components are missing coverage reports',
        components: missingComponents,
      });
    }

    // Check for very low coverage
    const criticalComponents = Object.entries(analysis.components)
      .filter(([, data]) => {
        const avgCoverage = Object.values(data.metrics)
          .reduce((sum, m) => sum + (m.coverage || 0), 0) / Object.keys(data.metrics).length;
        return avgCoverage < 50;
      });

    if (criticalComponents.length > 0) {
      analysis.recommendations.push({
        type: 'critical',
        priority: 'high',
        title: 'Address critically low coverage',
        description: 'Some components have dangerously low test coverage',
        components: criticalComponents.map(([name]) => name),
      });
    }
  }

  async generateHTMLReport(report, analysis) {
    const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Coverage Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { padding: 30px; border-bottom: 1px solid #eee; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px 8px 0 0; }
        .content { padding: 30px; }
        .metric-card { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 6px; padding: 20px; margin: 10px 0; }
        .metric-value { font-size: 2em; font-weight: bold; }
        .metric-label { color: #666; font-size: 0.9em; }
        .component { border: 1px solid #dee2e6; border-radius: 6px; margin: 10px 0; overflow: hidden; }
        .component-header { background: #f8f9fa; padding: 15px; border-bottom: 1px solid #dee2e6; }
        .component-body { padding: 15px; }
        .status-pass { color: #28a745; }
        .status-fail { color: #dc3545; }
        .progress-bar { background: #e9ecef; height: 20px; border-radius: 10px; overflow: hidden; margin: 5px 0; }
        .progress-fill { height: 100%; transition: width 0.3s ease; }
        .progress-good { background: #28a745; }
        .progress-warn { background: #ffc107; }
        .progress-poor { background: #dc3545; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { text-align: left; padding: 12px; border-bottom: 1px solid #dee2e6; }
        th { background: #f8f9fa; }
        .recommendations { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 20px; margin: 20px 0; }
        .timestamp { color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Test Coverage Report</h1>
            <p class="timestamp">Generated: ${new Date(report.timestamp).toLocaleString()}</p>
        </div>
        <div class="content">
            <div class="metric-cards" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0;">
                <div class="metric-card">
                    <div class="metric-value ${analysis.overall === 'pass' ? 'status-pass' : 'status-fail'}">
                        ${analysis.summary.coverageScore.toFixed(1)}%
                    </div>
                    <div class="metric-label">Overall Score</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${report.total.statements.pct.toFixed(1)}%</div>
                    <div class="metric-label">Statements</div>
                    <div class="progress-bar">
                        <div class="progress-fill ${this.getProgressClass(report.total.statements.pct)}"
                             style="width: ${Math.min(100, report.total.statements.pct)}%"></div>
                    </div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${report.total.branches.pct.toFixed(1)}%</div>
                    <div class="metric-label">Branches</div>
                    <div class="progress-bar">
                        <div class="progress-fill ${this.getProgressClass(report.total.branches.pct)}"
                             style="width: ${Math.min(100, report.total.branches.pct)}%"></div>
                    </div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${report.total.functions.pct.toFixed(1)}%</div>
                    <div class="metric-label">Functions</div>
                    <div class="progress-bar">
                        <div class="progress-fill ${this.getProgressClass(report.total.functions.pct)}"
                             style="width: ${Math.min(100, report.total.functions.pct)}%"></div>
                    </div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${report.total.lines.pct.toFixed(1)}%</div>
                    <div class="metric-label">Lines</div>
                    <div class="progress-bar">
                        <div class="progress-fill ${this.getProgressClass(report.total.lines.pct)}"
                             style="width: ${Math.min(100, report.total.lines.pct)}%"></div>
                    </div>
                </div>
            </div>

            <h2>📦 Component Coverage</h2>
            ${this.generateComponentHTML(report, analysis)}

            ${analysis.recommendations.length > 0 ? `
            <div class="recommendations">
                <h3>💡 Recommendations</h3>
                ${analysis.recommendations.map(rec => `
                    <div style="margin: 15px 0;">
                        <strong>${rec.title}</strong> (${rec.priority} priority)
                        <p>${rec.description}</p>
                        ${rec.components ? `<small>Components: ${rec.components.join(', ')}</small>` : ''}
                    </div>
                `).join('')}
            </div>
            ` : ''}
        </div>
    </div>
</body>
</html>`;

    const outputPath = path.join(this.outputDir, 'coverage-report.html');
    fs.writeFileSync(outputPath, htmlTemplate);
    console.log(`📄 HTML report saved to: ${outputPath}`);
  }

  getProgressClass(percentage) {
    if (percentage >= 80) return 'progress-good';
    if (percentage >= 60) return 'progress-warn';
    return 'progress-poor';
  }

  generateComponentHTML(report, analysis) {
    return Object.entries(report.components).map(([component, data]) => {
      const componentAnalysis = analysis.components[component];
      const status = componentAnalysis.status;
      const statusClass = status === 'pass' ? 'status-pass' : 'status-fail';

      return `
        <div class="component">
            <div class="component-header">
                <h3>${data.component.name || component}
                    <span class="${statusClass}">${status.toUpperCase()}</span>
                </h3>
            </div>
            <div class="component-body">
                <table>
                    <thead>
                        <tr><th>Metric</th><th>Coverage</th><th>Threshold</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                        ${Object.entries(componentAnalysis.metrics).map(([metric, info]) => `
                            <tr>
                                <td>${metric.charAt(0).toUpperCase() + metric.slice(1)}</td>
                                <td>${info.coverage.toFixed(1)}%</td>
                                <td>${info.threshold}%</td>
                                <td class="${info.passed ? 'status-pass' : 'status-fail'}">
                                    ${info.passed ? '✅' : '❌'}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ${componentAnalysis.issues.length > 0 ? `
                    <div style="margin-top: 15px; color: #dc3545;">
                        <strong>Issues:</strong>
                        <ul>${componentAnalysis.issues.map(issue => `<li>${issue}</li>`).join('')}</ul>
                    </div>
                ` : ''}
            </div>
        </div>
      `;
    }).join('');
  }

  async generateMarkdownReport(report, analysis) {
    let markdown = `# 📊 Test Coverage Report\n\n`;
    markdown += `**Generated:** ${new Date(report.timestamp).toLocaleString()}\n\n`;

    // Overall status
    const statusEmoji = analysis.overall === 'pass' ? '✅' : '❌';
    markdown += `## ${statusEmoji} Overall Status: ${analysis.overall.toUpperCase()}\n\n`;

    // Summary metrics
    markdown += `### 📈 Coverage Metrics\n\n`;
    markdown += `| Metric | Coverage | Threshold | Status |\n`;
    markdown += `|--------|----------|-----------|--------|\n`;

    for (const [metric, threshold] of Object.entries(this.thresholds)) {
      const coverage = report.total[metric]?.pct || 0;
      const passed = coverage >= threshold;
      const status = passed ? '✅' : '❌';
      markdown += `| ${metric.charAt(0).toUpperCase() + metric.slice(1)} | ${coverage.toFixed(1)}% | ${threshold}% | ${status} |\n`;
    }

    // Component breakdown
    markdown += `\n### 📦 Component Coverage\n\n`;
    for (const [component, data] of Object.entries(report.components)) {
      const componentAnalysis = analysis.components[component];
      const statusEmoji = componentAnalysis.status === 'pass' ? '✅' : '❌';

      markdown += `#### ${statusEmoji} ${data.component.name || component}\n\n`;

      if (data.total) {
        for (const [metric, info] of Object.entries(componentAnalysis.metrics)) {
          const passedEmoji = info.passed ? '✅' : '❌';
          markdown += `- **${metric}**: ${info.coverage.toFixed(1)}% ${passedEmoji}\n`;
        }
      }

      if (componentAnalysis.issues.length > 0) {
        markdown += `\n**Issues:**\n`;
        componentAnalysis.issues.forEach(issue => {
          markdown += `- ${issue}\n`;
        });
      }
      markdown += `\n`;
    }

    // Recommendations
    if (analysis.recommendations.length > 0) {
      markdown += `## 💡 Recommendations\n\n`;
      analysis.recommendations.forEach(rec => {
        markdown += `### ${rec.title} (${rec.priority} priority)\n`;
        markdown += `${rec.description}\n`;
        if (rec.components) {
          markdown += `**Components:** ${rec.components.join(', ')}\n`;
        }
        markdown += `\n`;
      });
    }

    const outputPath = path.join(this.outputDir, 'coverage-report.md');
    fs.writeFileSync(outputPath, markdown);
    console.log(`📝 Markdown report saved to: ${outputPath}`);
  }

  async generateJSONReport(report, analysis) {
    const jsonReport = {
      ...report,
      analysis,
      metadata: {
        generator: 'test-coverage-report.js',
        version: '1.0.0',
        thresholds: this.thresholds,
      },
    };

    const outputPath = path.join(this.outputDir, 'coverage-report.json');
    fs.writeFileSync(outputPath, JSON.stringify(jsonReport, null, 2));
    console.log(`📋 JSON report saved to: ${outputPath}`);
  }

  async generateBadges(report) {
    // Generate coverage badges data for README
    const badges = {
      overall: {
        label: 'coverage',
        message: `${report.total.lines.pct.toFixed(1)}%`,
        color: this.getBadgeColor(report.total.lines.pct),
      },
      statements: {
        label: 'statements',
        message: `${report.total.statements.pct.toFixed(1)}%`,
        color: this.getBadgeColor(report.total.statements.pct),
      },
      branches: {
        label: 'branches',
        message: `${report.total.branches.pct.toFixed(1)}%`,
        color: this.getBadgeColor(report.total.branches.pct),
      },
      functions: {
        label: 'functions',
        message: `${report.total.functions.pct.toFixed(1)}%`,
        color: this.getBadgeColor(report.total.functions.pct),
      },
    };

    const badgesPath = path.join(this.outputDir, 'badges.json');
    fs.writeFileSync(badgesPath, JSON.stringify(badges, null, 2));
    console.log(`🏷️  Badge data saved to: ${badgesPath}`);

    // Generate shields.io URLs
    const shieldsUrls = Object.entries(badges).reduce((urls, [key, badge]) => {
      urls[key] = `https://img.shields.io/badge/${badge.label}-${encodeURIComponent(badge.message)}-${badge.color}`;
      return urls;
    }, {});

    const urlsPath = path.join(this.outputDir, 'shield-urls.json');
    fs.writeFileSync(urlsPath, JSON.stringify(shieldsUrls, null, 2));
  }

  getBadgeColor(percentage) {
    if (percentage >= 80) return 'brightgreen';
    if (percentage >= 70) return 'green';
    if (percentage >= 60) return 'yellow';
    if (percentage >= 50) return 'orange';
    return 'red';
  }

  printSummary(analysis) {
    console.log('\n📊 COVERAGE REPORT SUMMARY');
    console.log('============================\n');

    const statusEmoji = analysis.overall === 'pass' ? '✅' : '❌';
    console.log(`${statusEmoji} Overall Status: ${analysis.overall.toUpperCase()}`);
    console.log(`📈 Coverage Score: ${analysis.summary.coverageScore.toFixed(1)}%`);
    console.log(`📦 Components: ${analysis.summary.totalComponents} total, ${analysis.summary.passedComponents} passed, ${analysis.summary.failedComponents} failed\n`);

    if (analysis.recommendations.length > 0) {
      console.log('💡 Key Recommendations:');
      analysis.recommendations.slice(0, 3).forEach(rec => {
        console.log(`   • ${rec.title} (${rec.priority} priority)`);
      });
      console.log('');
    }

    console.log(`📁 Reports saved to: ${this.outputDir}`);

    return analysis.overall === 'pass';
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--coverage-dir':
        options.coverageDir = args[++i];
        break;
      case '--output-dir':
        options.outputDir = args[++i];
        break;
      case '--threshold':
        const [metric, value] = args[++i].split('=');
        options.thresholds = options.thresholds || {};
        options.thresholds[metric] = parseFloat(value);
        break;
      case '--help':
        console.log(`
Usage: node test-coverage-report.js [options]

Options:
  --coverage-dir <dir>     Directory containing coverage reports (default: ./coverage)
  --output-dir <dir>       Output directory for reports (default: ./coverage/reports)
  --threshold <metric>=<value>  Set threshold for specific metric (e.g., --threshold statements=85)
  --help                   Show this help message

Examples:
  node test-coverage-report.js
  node test-coverage-report.js --coverage-dir ./build/coverage --output-dir ./reports
  node test-coverage-report.js --threshold statements=85 --threshold branches=80
`);
        process.exit(0);
        break;
    }
  }

  try {
    const reporter = new CoverageReporter(options);
    const analysis = await reporter.generateReport();

    // Exit with appropriate code for CI/CD
    process.exit(analysis.overall === 'pass' ? 0 : 1);
  } catch (error) {
    console.error('❌ Failed to generate coverage report:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { CoverageReporter, COVERAGE_THRESHOLDS };
