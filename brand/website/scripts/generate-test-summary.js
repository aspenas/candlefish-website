#!/usr/bin/env node

/**
 * Generate comprehensive test summary for CI/CD pipeline
 * Aggregates results from all test suites and generates reports
 */

const fs = require('fs');
const path = require('path');

class TestSummaryGenerator {
  constructor() {
    this.results = {
      coverage: null,
      performance: {},
      accessibility: [],
      security: [],
      e2e: [],
      timestamp: new Date().toISOString()
    };
  }

  async generateSummary() {
    try {
      await this.loadCoverageResults();
      await this.loadPerformanceResults();
      await this.loadTestResults();
      await this.generateReports();

      console.log('✅ Test summary generated successfully');
      return this.results;
    } catch (error) {
      console.error('❌ Error generating test summary:', error);
      throw error;
    }
  }

  async loadCoverageResults() {
    try {
      const coveragePath = path.join(__dirname, '../coverage/coverage-summary.json');
      if (fs.existsSync(coveragePath)) {
        this.results.coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
        console.log('📊 Coverage results loaded');
      }
    } catch (error) {
      console.warn('⚠️  Could not load coverage results:', error.message);
    }
  }

  async loadPerformanceResults() {
    try {
      const performanceDir = path.join(__dirname, '../performance-results');
      if (fs.existsSync(performanceDir)) {
        const files = fs.readdirSync(performanceDir);

        for (const file of files) {
          if (file.endsWith('.json')) {
            const filePath = path.join(performanceDir, file);
            const testName = path.basename(file, '.json');
            this.results.performance[testName] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          }
        }
        console.log('⚡ Performance results loaded');
      }
    } catch (error) {
      console.warn('⚠️  Could not load performance results:', error.message);
    }
  }

  async loadTestResults() {
    try {
      // Load Playwright test results
      const playwrightResultsPath = path.join(__dirname, '../test-results');
      if (fs.existsSync(playwrightResultsPath)) {
        const files = fs.readdirSync(playwrightResultsPath, { recursive: true });

        for (const file of files) {
          if (file.endsWith('.json')) {
            const filePath = path.join(playwrightResultsPath, file);
            const result = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            if (file.includes('accessibility')) {
              this.results.accessibility.push(result);
            } else if (file.includes('security')) {
              this.results.security.push(result);
            } else {
              this.results.e2e.push(result);
            }
          }
        }
        console.log('🎭 Playwright test results loaded');
      }
    } catch (error) {
      console.warn('⚠️  Could not load test results:', error.message);
    }
  }

  async generateReports() {
    const reportsDir = path.join(__dirname, '../reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Generate HTML report
    await this.generateHtmlReport(reportsDir);

    // Generate markdown report
    await this.generateMarkdownReport(reportsDir);

    // Generate JSON report
    await this.generateJsonReport(reportsDir);

    // Generate GitHub Actions summary
    await this.generateGitHubSummary();
  }

  async generateHtmlReport(reportsDir) {
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Netlify Extension Management - Test Summary</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', roboto; margin: 40px; }
        .header { color: #333; border-bottom: 2px solid #eee; padding-bottom: 20px; }
        .metric-card { background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .metric-title { font-weight: 600; color: #495057; font-size: 18px; margin-bottom: 10px; }
        .metric-value { font-size: 24px; font-weight: 700; }
        .success { color: #28a745; }
        .warning { color: #ffc107; }
        .error { color: #dc3545; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .coverage-bar { background: #e9ecef; height: 20px; border-radius: 10px; overflow: hidden; }
        .coverage-fill { height: 100%; transition: width 0.3s ease; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; font-weight: 600; }
        .timestamp { color: #6c757d; font-size: 14px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 Netlify Extension Management Test Summary</h1>
        <p class="timestamp">Generated: ${this.results.timestamp}</p>
    </div>

    ${this.generateCoverageSection()}
    ${this.generatePerformanceSection()}
    ${this.generateTestResultsSection()}
</body>
</html>
    `;

    fs.writeFileSync(path.join(reportsDir, 'test-summary.html'), htmlContent);
    console.log('📄 HTML report generated: reports/test-summary.html');
  }

  generateCoverageSection() {
    if (!this.results.coverage) return '<div class="metric-card"><p>No coverage data available</p></div>';

    const { total } = this.results.coverage;

    return `
    <div class="metric-card">
        <h2 class="metric-title">📊 Code Coverage</h2>
        <div class="grid">
            ${['lines', 'functions', 'branches', 'statements'].map(metric => {
              const pct = total[metric].pct;
              const status = pct >= 80 ? 'success' : pct >= 60 ? 'warning' : 'error';
              return `
                <div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span>${metric.charAt(0).toUpperCase() + metric.slice(1)}</span>
                        <span class="${status}">${pct}%</span>
                    </div>
                    <div class="coverage-bar">
                        <div class="coverage-fill ${status}" style="width: ${pct}%; background-color: ${
                          status === 'success' ? '#28a745' : status === 'warning' ? '#ffc107' : '#dc3545'
                        };"></div>
                    </div>
                </div>
              `;
            }).join('')}
        </div>
        <p><strong>Total Coverage:</strong> ${total.lines.covered}/${total.lines.total} lines covered</p>
    </div>
    `;
  }

  generatePerformanceSection() {
    if (Object.keys(this.results.performance).length === 0) {
      return '<div class="metric-card"><p>No performance data available</p></div>';
    }

    return `
    <div class="metric-card">
        <h2 class="metric-title">⚡ Performance Metrics</h2>
        <table>
            <thead>
                <tr>
                    <th>Test Suite</th>
                    <th>Avg Response Time</th>
                    <th>Max Response Time</th>
                    <th>Success Rate</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(this.results.performance).map(([name, data]) => {
                  const avgTime = data.metrics?.http_req_duration?.avg || 'N/A';
                  const maxTime = data.metrics?.http_req_duration?.max || 'N/A';
                  const successRate = data.metrics?.http_req_success_rate || 'N/A';
                  const status = avgTime < 50 ? 'success' : avgTime < 100 ? 'warning' : 'error';

                  return `
                    <tr>
                        <td>${name}</td>
                        <td class="${status}">${avgTime}ms</td>
                        <td>${maxTime}ms</td>
                        <td>${successRate}%</td>
                        <td class="${status}">${avgTime < 50 ? '✅ Pass' : avgTime < 100 ? '⚠️ Warning' : '❌ Fail'}</td>
                    </tr>
                  `;
                }).join('')}
            </tbody>
        </table>
    </div>
    `;
  }

  generateTestResultsSection() {
    const sections = [
      { title: 'Accessibility Tests', data: this.results.accessibility, icon: '♿' },
      { title: 'Security Tests', data: this.results.security, icon: '🔒' },
      { title: 'E2E Tests', data: this.results.e2e, icon: '🎭' }
    ];

    return sections.map(section => `
      <div class="metric-card">
          <h2 class="metric-title">${section.icon} ${section.title}</h2>
          ${section.data.length === 0
            ? '<p>No data available</p>'
            : `<p><strong>${section.data.length}</strong> test suites executed</p>`
          }
      </div>
    `).join('');
  }

  async generateMarkdownReport(reportsDir) {
    const markdownContent = this.generateMarkdownContent();
    fs.writeFileSync(path.join(reportsDir, 'test-summary.md'), markdownContent);
    console.log('📝 Markdown report generated: reports/test-summary.md');
  }

  generateMarkdownContent() {
    let content = `# 🧪 Netlify Extension Management Test Summary\n\n`;
    content += `**Generated:** ${this.results.timestamp}\n\n`;

    // Coverage section
    if (this.results.coverage) {
      const { total } = this.results.coverage;
      content += `## 📊 Code Coverage\n\n`;
      content += `| Metric | Coverage | Status |\n`;
      content += `|--------|----------|--------|\n`;

      ['lines', 'functions', 'branches', 'statements'].forEach(metric => {
        const pct = total[metric].pct;
        const status = pct >= 80 ? '✅ Pass' : pct >= 60 ? '⚠️ Warning' : '❌ Fail';
        content += `| ${metric.charAt(0).toUpperCase() + metric.slice(1)} | ${pct}% | ${status} |\n`;
      });

      content += `\n**Overall:** ${total.lines.covered}/${total.lines.total} lines covered\n\n`;
    }

    // Performance section
    if (Object.keys(this.results.performance).length > 0) {
      content += `## ⚡ Performance Metrics\n\n`;
      content += `| Test Suite | Avg Response | Max Response | Success Rate | Status |\n`;
      content += `|------------|--------------|--------------|--------------|--------|\n`;

      Object.entries(this.results.performance).forEach(([name, data]) => {
        const avgTime = data.metrics?.http_req_duration?.avg || 'N/A';
        const maxTime = data.metrics?.http_req_duration?.max || 'N/A';
        const successRate = data.metrics?.http_req_success_rate || 'N/A';
        const status = avgTime < 50 ? '✅ Pass' : avgTime < 100 ? '⚠️ Warning' : '❌ Fail';

        content += `| ${name} | ${avgTime}ms | ${maxTime}ms | ${successRate}% | ${status} |\n`;
      });
      content += `\n`;
    }

    return content;
  }

  async generateJsonReport(reportsDir) {
    const jsonContent = JSON.stringify(this.results, null, 2);
    fs.writeFileSync(path.join(reportsDir, 'test-summary.json'), jsonContent);
    console.log('📋 JSON report generated: reports/test-summary.json');
  }

  async generateGitHubSummary() {
    if (!process.env.GITHUB_STEP_SUMMARY) return;

    const summary = this.generateMarkdownContent();
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
    console.log('📝 GitHub Actions summary updated');
  }
}

// Run if called directly
if (require.main === module) {
  const generator = new TestSummaryGenerator();
  generator.generateSummary().catch(error => {
    console.error('Failed to generate test summary:', error);
    process.exit(1);
  });
}

module.exports = TestSummaryGenerator;
