#!/usr/bin/env node

/**
 * Generate comprehensive performance test report
 * Analyzes performance test results and creates detailed reports
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const REPORT_CONFIG = {
  inputDir: path.join(__dirname, '../../test-results'),
  outputDir: path.join(__dirname, '../../reports'),
  thresholds: {
    maxResponseTime: 2000,
    minThroughput: 10,
    maxErrorRate: 5,
    maxMemoryUsage: 512 * 1024 * 1024 // 512MB
  }
}

class PerformanceReportGenerator {
  constructor() {
    this.results = []
    this.summary = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      averageResponseTime: 0,
      totalThroughput: 0,
      maxMemoryUsage: 0,
      issues: []
    }
  }

  async generate() {
    console.log('📊 Generating performance test report...')

    try {
      await this.loadTestResults()
      await this.analyzeResults()
      await this.generateReports()

      console.log('✅ Performance report generated successfully')
      console.log(`📁 Reports saved to: ${REPORT_CONFIG.outputDir}`)

      return this.summary
    } catch (error) {
      console.error('❌ Error generating performance report:', error.message)
      process.exit(1)
    }
  }

  async loadTestResults() {
    console.log('📂 Loading test results...')

    if (!fs.existsSync(REPORT_CONFIG.inputDir)) {
      throw new Error(`Test results directory not found: ${REPORT_CONFIG.inputDir}`)
    }

    const files = fs.readdirSync(REPORT_CONFIG.inputDir)
    const resultFiles = files.filter(file => file.endsWith('.json'))

    for (const file of resultFiles) {
      const filePath = path.join(REPORT_CONFIG.inputDir, file)
      const content = fs.readFileSync(filePath, 'utf8')

      try {
        const result = JSON.parse(content)
        this.results.push({
          file,
          ...result
        })
      } catch (error) {
        console.warn(`⚠️ Could not parse result file ${file}:`, error.message)
      }
    }

    console.log(`📥 Loaded ${this.results.length} test result files`)
  }

  async analyzeResults() {
    console.log('🔍 Analyzing performance results...')

    let totalResponseTime = 0
    let totalRequests = 0
    let totalErrors = 0
    let maxMemory = 0

    for (const result of this.results) {
      this.summary.totalTests++

      if (result.summary) {
        totalRequests += result.summary.totalRequests || 0
        totalErrors += (result.summary.totalRequests || 0) - (result.summary.successfulRequests || 0)

        if (result.responseTime) {
          totalResponseTime += result.responseTime.avg || 0
        }

        if (result.resources && result.resources.memory) {
          maxMemory = Math.max(maxMemory, result.resources.memory.max || 0)
        }

        // Check for performance issues
        this.analyzePerformanceIssues(result)

        // Determine if test passed
        const passed = this.isTestPassing(result)
        if (passed) {
          this.summary.passedTests++
        } else {
          this.summary.failedTests++
        }
      }
    }

    // Calculate aggregated metrics
    this.summary.averageResponseTime = totalResponseTime / this.summary.totalTests || 0
    this.summary.totalThroughput = totalRequests / this.summary.totalTests || 0
    this.summary.maxMemoryUsage = maxMemory
    this.summary.overallErrorRate = (totalErrors / totalRequests) * 100 || 0

    console.log(`📈 Analysis complete: ${this.summary.passedTests}/${this.summary.totalTests} tests passed`)
  }

  analyzePerformanceIssues(result) {
    const issues = []

    // Response time issues
    if (result.responseTime) {
      if (result.responseTime.avg > REPORT_CONFIG.thresholds.maxResponseTime) {
        issues.push({
          type: 'response_time',
          severity: 'high',
          message: `Average response time (${result.responseTime.avg}ms) exceeds threshold (${REPORT_CONFIG.thresholds.maxResponseTime}ms)`,
          value: result.responseTime.avg,
          threshold: REPORT_CONFIG.thresholds.maxResponseTime
        })
      }

      if (result.responseTime.p95 > REPORT_CONFIG.thresholds.maxResponseTime * 2) {
        issues.push({
          type: 'response_time_p95',
          severity: 'medium',
          message: `95th percentile response time (${result.responseTime.p95}ms) is concerning`,
          value: result.responseTime.p95,
          threshold: REPORT_CONFIG.thresholds.maxResponseTime * 2
        })
      }
    }

    // Throughput issues
    if (result.summary && result.summary.throughput < REPORT_CONFIG.thresholds.minThroughput) {
      issues.push({
        type: 'throughput',
        severity: 'medium',
        message: `Throughput (${result.summary.throughput} req/s) is below minimum threshold (${REPORT_CONFIG.thresholds.minThroughput} req/s)`,
        value: result.summary.throughput,
        threshold: REPORT_CONFIG.thresholds.minThroughput
      })
    }

    // Error rate issues
    if (result.summary && result.summary.errorRate > REPORT_CONFIG.thresholds.maxErrorRate) {
      issues.push({
        type: 'error_rate',
        severity: 'high',
        message: `Error rate (${result.summary.errorRate}%) exceeds threshold (${REPORT_CONFIG.thresholds.maxErrorRate}%)`,
        value: result.summary.errorRate,
        threshold: REPORT_CONFIG.thresholds.maxErrorRate
      })
    }

    // Memory usage issues
    if (result.resources && result.resources.memory && result.resources.memory.max > REPORT_CONFIG.thresholds.maxMemoryUsage) {
      issues.push({
        type: 'memory_usage',
        severity: 'medium',
        message: `Peak memory usage (${Math.round(result.resources.memory.max / 1024 / 1024)}MB) exceeds threshold (${Math.round(REPORT_CONFIG.thresholds.maxMemoryUsage / 1024 / 1024)}MB)`,
        value: result.resources.memory.max,
        threshold: REPORT_CONFIG.thresholds.maxMemoryUsage
      })
    }

    // Database performance issues
    if (result.database) {
      if (result.database.avgQueueLength > 10) {
        issues.push({
          type: 'database_queue',
          severity: 'medium',
          message: `Database queue length (${result.database.avgQueueLength}) indicates potential bottleneck`,
          value: result.database.avgQueueLength
        })
      }

      if (result.database.avgQueryTime > 100) {
        issues.push({
          type: 'database_performance',
          severity: 'medium',
          message: `Average database query time (${result.database.avgQueryTime}ms) is concerning`,
          value: result.database.avgQueryTime
        })
      }
    }

    this.summary.issues.push(...issues.map(issue => ({ ...issue, testFile: result.file })))
  }

  isTestPassing(result) {
    if (!result.summary) return false

    const responseTimeOk = !result.responseTime || result.responseTime.avg <= REPORT_CONFIG.thresholds.maxResponseTime
    const throughputOk = !result.summary.throughput || result.summary.throughput >= REPORT_CONFIG.thresholds.minThroughput
    const errorRateOk = !result.summary.errorRate || result.summary.errorRate <= REPORT_CONFIG.thresholds.maxErrorRate
    const memoryOk = !result.resources || !result.resources.memory || result.resources.memory.max <= REPORT_CONFIG.thresholds.maxMemoryUsage

    return responseTimeOk && throughputOk && errorRateOk && memoryOk
  }

  async generateReports() {
    console.log('📝 Generating reports...')

    // Ensure output directory exists
    if (!fs.existsSync(REPORT_CONFIG.outputDir)) {
      fs.mkdirSync(REPORT_CONFIG.outputDir, { recursive: true })
    }

    // Generate JSON report
    await this.generateJSONReport()

    // Generate HTML report
    await this.generateHTMLReport()

    // Generate summary report
    await this.generateSummaryReport()

    // Generate CSV report for further analysis
    await this.generateCSVReport()
  }

  async generateJSONReport() {
    const reportData = {
      generatedAt: new Date().toISOString(),
      summary: this.summary,
      results: this.results,
      thresholds: REPORT_CONFIG.thresholds
    }

    const filePath = path.join(REPORT_CONFIG.outputDir, 'performance-report.json')
    fs.writeFileSync(filePath, JSON.stringify(reportData, null, 2))
    console.log(`📄 JSON report: ${filePath}`)
  }

  async generateHTMLReport() {
    const html = this.generateHTMLContent()
    const filePath = path.join(REPORT_CONFIG.outputDir, 'performance-report.html')
    fs.writeFileSync(filePath, html)
    console.log(`🌐 HTML report: ${filePath}`)
  }

  generateHTMLContent() {
    const issuesByType = this.groupIssuesByType()
    const chartData = this.generateChartData()

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Test Report - Claude Resources Deployment</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { border-bottom: 2px solid #eee; margin-bottom: 30px; padding-bottom: 20px; }
        .header h1 { color: #2c3e50; margin: 0; }
        .header .meta { color: #7f8c8d; margin-top: 10px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric-card { background: #f8f9fa; padding: 20px; border-radius: 6px; text-align: center; }
        .metric-card .value { font-size: 2em; font-weight: bold; color: #2c3e50; }
        .metric-card .label { color: #7f8c8d; margin-top: 5px; }
        .metric-card.success .value { color: #27ae60; }
        .metric-card.warning .value { color: #f39c12; }
        .metric-card.error .value { color: #e74c3c; }
        .issues { margin-bottom: 30px; }
        .issue { background: #fff5f5; border-left: 4px solid #e74c3c; padding: 15px; margin-bottom: 10px; border-radius: 0 6px 6px 0; }
        .issue.medium { background: #fffbf0; border-left-color: #f39c12; }
        .issue.low { background: #f0fff4; border-left-color: #27ae60; }
        .issue-title { font-weight: bold; color: #2c3e50; }
        .issue-details { color: #7f8c8d; margin-top: 5px; font-size: 0.9em; }
        .results-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .results-table th, .results-table td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
        .results-table th { background: #f8f9fa; font-weight: bold; }
        .status-pass { color: #27ae60; font-weight: bold; }
        .status-fail { color: #e74c3c; font-weight: bold; }
        .recommendations { background: #f0f8ff; padding: 20px; border-radius: 6px; margin-top: 30px; }
        .recommendations h3 { color: #2c3e50; margin-top: 0; }
        .recommendations ul { color: #34495e; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Performance Test Report</h1>
            <div class="meta">
                <strong>Claude Resources Phased Deployment System</strong><br>
                Generated: ${new Date().toLocaleString()}<br>
                Total Tests: ${this.summary.totalTests}
            </div>
        </div>

        <div class="summary">
            <div class="metric-card ${this.summary.passedTests === this.summary.totalTests ? 'success' : 'warning'}">
                <div class="value">${this.summary.passedTests}/${this.summary.totalTests}</div>
                <div class="label">Tests Passed</div>
            </div>
            <div class="metric-card ${this.summary.averageResponseTime <= REPORT_CONFIG.thresholds.maxResponseTime ? 'success' : 'error'}">
                <div class="value">${Math.round(this.summary.averageResponseTime)}ms</div>
                <div class="label">Avg Response Time</div>
            </div>
            <div class="metric-card ${this.summary.totalThroughput >= REPORT_CONFIG.thresholds.minThroughput ? 'success' : 'warning'}">
                <div class="value">${Math.round(this.summary.totalThroughput)}</div>
                <div class="label">Throughput (req/s)</div>
            </div>
            <div class="metric-card ${this.summary.overallErrorRate <= REPORT_CONFIG.thresholds.maxErrorRate ? 'success' : 'error'}">
                <div class="value">${Math.round(this.summary.overallErrorRate)}%</div>
                <div class="label">Error Rate</div>
            </div>
            <div class="metric-card">
                <div class="value">${Math.round(this.summary.maxMemoryUsage / 1024 / 1024)}MB</div>
                <div class="label">Peak Memory</div>
            </div>
        </div>

        ${this.summary.issues.length > 0 ? `
        <div class="issues">
            <h2>Performance Issues (${this.summary.issues.length})</h2>
            ${this.summary.issues.map(issue => `
                <div class="issue ${issue.severity}">
                    <div class="issue-title">${issue.type.replace('_', ' ').toUpperCase()}: ${issue.message}</div>
                    <div class="issue-details">Test: ${issue.testFile} | Severity: ${issue.severity.toUpperCase()}</div>
                </div>
            `).join('')}
        </div>
        ` : '<div class="issues"><h2>No Performance Issues Found ✅</h2></div>'}

        <div class="results">
            <h2>Detailed Results</h2>
            <table class="results-table">
                <thead>
                    <tr>
                        <th>Test File</th>
                        <th>Status</th>
                        <th>Avg Response Time</th>
                        <th>Throughput</th>
                        <th>Error Rate</th>
                        <th>Peak Memory</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.results.map(result => `
                        <tr>
                            <td>${result.file}</td>
                            <td class="${this.isTestPassing(result) ? 'status-pass' : 'status-fail'}">
                                ${this.isTestPassing(result) ? 'PASS' : 'FAIL'}
                            </td>
                            <td>${result.responseTime ? Math.round(result.responseTime.avg) + 'ms' : 'N/A'}</td>
                            <td>${result.summary ? Math.round(result.summary.throughput) + ' req/s' : 'N/A'}</td>
                            <td>${result.summary ? Math.round(result.summary.errorRate) + '%' : 'N/A'}</td>
                            <td>${result.resources && result.resources.memory ? Math.round(result.resources.memory.max / 1024 / 1024) + 'MB' : 'N/A'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="recommendations">
            <h3>Recommendations</h3>
            ${this.generateRecommendations()}
        </div>
    </div>
</body>
</html>
    `
  }

  generateRecommendations() {
    const recommendations = []
    const highIssues = this.summary.issues.filter(i => i.severity === 'high')
    const mediumIssues = this.summary.issues.filter(i => i.severity === 'medium')

    if (highIssues.length > 0) {
      recommendations.push('🔴 <strong>High Priority:</strong> Address high-severity performance issues immediately')
    }

    if (this.summary.averageResponseTime > REPORT_CONFIG.thresholds.maxResponseTime) {
      recommendations.push('⚡ Optimize response times by implementing caching, database query optimization, or API endpoint optimization')
    }

    if (this.summary.overallErrorRate > REPORT_CONFIG.thresholds.maxErrorRate) {
      recommendations.push('🛠️ Investigate and fix error conditions causing high error rates')
    }

    if (this.summary.maxMemoryUsage > REPORT_CONFIG.thresholds.maxMemoryUsage) {
      recommendations.push('💾 Optimize memory usage through better data structures, garbage collection tuning, or memory leak fixes')
    }

    if (mediumIssues.filter(i => i.type === 'database_queue').length > 0) {
      recommendations.push('🗄️ Consider increasing database connection pool size or optimizing database queries')
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Performance is within acceptable thresholds. Continue monitoring in production.')
    } else {
      recommendations.push('📊 Consider implementing performance monitoring and alerting in production')
      recommendations.push('🔄 Re-run performance tests after implementing optimizations')
    }

    return '<ul><li>' + recommendations.join('</li><li>') + '</li></ul>'
  }

  groupIssuesByType() {
    const groups = {}
    this.summary.issues.forEach(issue => {
      if (!groups[issue.type]) {
        groups[issue.type] = []
      }
      groups[issue.type].push(issue)
    })
    return groups
  }

  generateChartData() {
    return {
      responseTime: this.results.map(r => ({
        test: r.file,
        avg: r.responseTime?.avg || 0,
        p95: r.responseTime?.p95 || 0
      })),
      throughput: this.results.map(r => ({
        test: r.file,
        value: r.summary?.throughput || 0
      }))
    }
  }

  async generateSummaryReport() {
    const summary = `
Performance Test Summary Report
==============================

Generated: ${new Date().toISOString()}
Test Suite: Claude Resources Phased Deployment

Overall Results:
- Total Tests: ${this.summary.totalTests}
- Passed: ${this.summary.passedTests}
- Failed: ${this.summary.failedTests}
- Success Rate: ${Math.round((this.summary.passedTests / this.summary.totalTests) * 100)}%

Key Metrics:
- Average Response Time: ${Math.round(this.summary.averageResponseTime)}ms (threshold: ${REPORT_CONFIG.thresholds.maxResponseTime}ms)
- Total Throughput: ${Math.round(this.summary.totalThroughput)} req/s (threshold: ${REPORT_CONFIG.thresholds.minThroughput} req/s)
- Overall Error Rate: ${Math.round(this.summary.overallErrorRate)}% (threshold: ${REPORT_CONFIG.thresholds.maxErrorRate}%)
- Peak Memory Usage: ${Math.round(this.summary.maxMemoryUsage / 1024 / 1024)}MB (threshold: ${Math.round(REPORT_CONFIG.thresholds.maxMemoryUsage / 1024 / 1024)}MB)

Issues Found: ${this.summary.issues.length}
- High Severity: ${this.summary.issues.filter(i => i.severity === 'high').length}
- Medium Severity: ${this.summary.issues.filter(i => i.severity === 'medium').length}
- Low Severity: ${this.summary.issues.filter(i => i.severity === 'low').length}

${this.summary.issues.length > 0 ? 'Top Issues:' : 'No issues found!'}
${this.summary.issues.slice(0, 5).map(issue =>
  `- ${issue.type}: ${issue.message} (${issue.testFile})`
).join('\n')}

Recommendation: ${this.summary.passedTests === this.summary.totalTests ?
  'All tests passed! System performance is within acceptable limits.' :
  'Review failed tests and address performance issues before deployment.'}
`

    const filePath = path.join(REPORT_CONFIG.outputDir, 'performance-summary.txt')
    fs.writeFileSync(filePath, summary)
    console.log(`📄 Summary report: ${filePath}`)
  }

  async generateCSVReport() {
    const headers = ['Test File', 'Status', 'Avg Response Time (ms)', 'P95 Response Time (ms)', 'Throughput (req/s)', 'Error Rate (%)', 'Peak Memory (MB)', 'Issues']

    const rows = this.results.map(result => [
      result.file,
      this.isTestPassing(result) ? 'PASS' : 'FAIL',
      result.responseTime?.avg || '',
      result.responseTime?.p95 || '',
      result.summary?.throughput || '',
      result.summary?.errorRate || '',
      result.resources?.memory ? Math.round(result.resources.memory.max / 1024 / 1024) : '',
      this.summary.issues.filter(i => i.testFile === result.file).length
    ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')

    const filePath = path.join(REPORT_CONFIG.outputDir, 'performance-data.csv')
    fs.writeFileSync(filePath, csv)
    console.log(`📊 CSV report: ${filePath}`)
  }
}

// Run report generation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const generator = new PerformanceReportGenerator()
  generator.generate().then(summary => {
    console.log('\n📈 Performance Report Summary:')
    console.log(`✅ Tests Passed: ${summary.passedTests}/${summary.totalTests}`)
    console.log(`⚡ Avg Response Time: ${Math.round(summary.averageResponseTime)}ms`)
    console.log(`🚀 Throughput: ${Math.round(summary.totalThroughput)} req/s`)
    console.log(`❌ Error Rate: ${Math.round(summary.overallErrorRate)}%`)
    console.log(`💾 Peak Memory: ${Math.round(summary.maxMemoryUsage / 1024 / 1024)}MB`)
    console.log(`⚠️  Issues Found: ${summary.issues.length}`)

    if (summary.issues.length > 0) {
      console.log('\n🔍 Top Issues:')
      summary.issues.slice(0, 3).forEach(issue => {
        console.log(`   • ${issue.type}: ${issue.message}`)
      })
    }
  }).catch(error => {
    console.error('❌ Report generation failed:', error.message)
    process.exit(1)
  })
}

export { PerformanceReportGenerator }
