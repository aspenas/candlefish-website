#!/usr/bin/env node

/**
 * Comprehensive test runner for Candlefish Animation System
 * Runs unit tests, integration tests, E2E tests, visual regression tests, and performance tests
 */

const { spawn, execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// Configuration
const config = {
  testTypes: {
    unit: {
      name: 'Unit Tests',
      command: 'jest',
      args: ['--config=jest.config.candlefish.js', '--coverage'],
      timeout: 300000 // 5 minutes
    },
    integration: {
      name: 'Integration Tests',
      command: 'jest',
      args: ['--config=jest.config.candlefish.js', '--testPathPattern=integration'],
      timeout: 600000 // 10 minutes
    },
    e2e: {
      name: 'E2E Tests',
      command: 'cypress',
      args: ['run', '--spec', 'cypress/e2e/*candlefish*.cy.ts'],
      timeout: 900000 // 15 minutes
    },
    visual: {
      name: 'Visual Regression Tests',
      command: 'playwright',
      args: ['test', '__tests__/visual/candlefish-mood-appearances.test.ts'],
      timeout: 1200000 // 20 minutes
    },
    performance: {
      name: 'Performance Tests',
      command: 'k6',
      args: ['run', '__tests__/performance/k6/candlefish-animation-performance.js'],
      timeout: 1800000 // 30 minutes
    }
  },
  
  // Test execution order (some tests depend on others)
  executionOrder: ['unit', 'integration', 'e2e', 'visual', 'performance'],
  
  // Directories
  reportsDir: './test-reports',
  screenshotsDir: './test-results',
  
  // Options
  parallel: process.env.CI ? false : true, // Run sequentially in CI
  continueOnFailure: process.env.CONTINUE_ON_FAILURE === 'true',
  skipTests: process.env.SKIP_TESTS ? process.env.SKIP_TESTS.split(',') : [],
  onlyTests: process.env.ONLY_TESTS ? process.env.ONLY_TESTS.split(',') : []
}

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString()
  const colors = {
    info: '\x1b[36m', // cyan
    success: '\x1b[32m', // green
    warning: '\x1b[33m', // yellow
    error: '\x1b[31m', // red
    reset: '\x1b[0m'
  }
  
  console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`)
}

function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
    log(`Created directory: ${dirPath}`)
  }
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    log(`Running: ${command} ${args.join(' ')}`)
    
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    })
    
    const timeout = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new Error(`Command timed out after ${options.timeout}ms`))
    }, options.timeout || 300000)
    
    child.on('close', (code) => {
      clearTimeout(timeout)
      
      if (code === 0) {
        log(`✅ ${command} completed successfully`, 'success')
        resolve({ success: true, code })
      } else {
        log(`❌ ${command} failed with code ${code}`, 'error')
        resolve({ success: false, code })
      }
    })
    
    child.on('error', (error) => {
      clearTimeout(timeout)
      log(`❌ ${command} error: ${error.message}`, 'error')
      reject(error)
    })
  })
}

async function setupEnvironment() {
  log('Setting up test environment...', 'info')
  
  // Ensure required directories exist
  ensureDirectoryExists(config.reportsDir)
  ensureDirectoryExists(config.screenshotsDir)
  ensureDirectoryExists(path.join(config.reportsDir, 'html'))
  ensureDirectoryExists(path.join(config.reportsDir, 'junit'))
  ensureDirectoryExists(path.join(config.reportsDir, 'coverage'))
  
  // Check if required dependencies are installed
  const requiredCommands = ['jest', 'cypress', 'playwright', 'k6']
  
  for (const cmd of requiredCommands) {
    try {
      execSync(`${cmd} --version`, { stdio: 'ignore' })
      log(`✅ ${cmd} is available`, 'success')
    } catch (error) {
      log(`❌ ${cmd} is not available. Please install it.`, 'error')
      
      // Provide installation instructions
      const installInstructions = {
        jest: 'npm install --save-dev jest @types/jest ts-jest',
        cypress: 'npm install --save-dev cypress',
        playwright: 'npm install --save-dev @playwright/test',
        k6: 'Visit https://k6.io/docs/get-started/installation/ for installation instructions'
      }
      
      log(`Installation: ${installInstructions[cmd]}`, 'info')
    }
  }
  
  // Start local server if needed (for E2E and visual tests)
  if (!process.env.CI && !process.env.SERVER_RUNNING) {
    log('Starting local development server...', 'info')
    
    try {
      // Check if server is already running
      execSync('curl -f http://localhost:3000 > /dev/null 2>&1', { stdio: 'ignore' })
      log('✅ Local server is already running', 'success')
    } catch (error) {
      log('⚠️  Local server not running. Please start with `npm run dev` in another terminal', 'warning')
    }
  }
}

async function runTestSuite(testType, testConfig) {
  log(`\n🧪 Starting ${testConfig.name}...`, 'info')
  
  const startTime = Date.now()
  
  try {
    // Set environment variables for specific test types
    const env = { ...process.env }
    
    if (testType === 'visual') {
      env.PLAYWRIGHT_HTML_REPORT = path.join(config.reportsDir, 'html', 'visual-report')
    }
    
    if (testType === 'performance') {
      env.K6_OUT = `json=${path.join(config.reportsDir, 'k6-results.json')}`
    }
    
    const result = await runCommand(testConfig.command, testConfig.args, {
      timeout: testConfig.timeout,
      env
    })
    
    const duration = Math.round((Date.now() - startTime) / 1000)
    
    if (result.success) {
      log(`✅ ${testConfig.name} completed in ${duration}s`, 'success')
      return { testType, success: true, duration }
    } else {
      log(`❌ ${testConfig.name} failed after ${duration}s`, 'error')
      return { testType, success: false, duration, code: result.code }
    }
    
  } catch (error) {
    const duration = Math.round((Date.now() - startTime) / 1000)
    log(`💥 ${testConfig.name} crashed after ${duration}s: ${error.message}`, 'error')
    return { testType, success: false, duration, error: error.message }
  }
}

async function generateSummaryReport(results) {
  log('\n📊 Generating test summary report...', 'info')
  
  const totalTests = results.length
  const passedTests = results.filter(r => r.success).length
  const failedTests = totalTests - passedTests
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0)
  
  const summaryReport = {
    timestamp: new Date().toISOString(),
    summary: {
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      duration: totalDuration,
      success: failedTests === 0
    },
    results: results.map(result => ({
      testType: result.testType,
      name: config.testTypes[result.testType].name,
      success: result.success,
      duration: result.duration,
      ...(result.error && { error: result.error }),
      ...(result.code && { exitCode: result.code })
    }))
  }
  
  // Write JSON report
  const reportPath = path.join(config.reportsDir, 'candlefish-test-summary.json')
  fs.writeFileSync(reportPath, JSON.stringify(summaryReport, null, 2))
  
  // Write HTML report
  const htmlReport = generateHTMLReport(summaryReport)
  const htmlReportPath = path.join(config.reportsDir, 'html', 'candlefish-test-summary.html')
  fs.writeFileSync(htmlReportPath, htmlReport)
  
  log(`📄 Summary report saved to: ${reportPath}`, 'info')
  log(`🌐 HTML report saved to: ${htmlReportPath}`, 'info')
  
  return summaryReport
}

function generateHTMLReport(summaryReport) {
  const { summary, results } = summaryReport
  
  const resultsTable = results.map(result => `
    <tr class="${result.success ? 'success' : 'failure'}">
      <td>${result.name}</td>
      <td>${result.success ? '✅ Passed' : '❌ Failed'}</td>
      <td>${result.duration}s</td>
      <td>${result.error || result.exitCode || '-'}</td>
    </tr>
  `).join('')
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Candlefish Animation Test Summary</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 40px; }
        .header { background: #3A3A60; color: white; padding: 20px; border-radius: 8px; }
        .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 20px 0; }
        .metric { background: #f8f9fa; padding: 15px; border-radius: 4px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: #3A3A60; }
        .metric-label { color: #666; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; }
        .success { background: #d4edda; }
        .failure { background: #f8d7da; }
        .timestamp { color: #666; font-size: 0.9em; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🐠 Candlefish Animation Test Results</h1>
        <p class="timestamp">Generated: ${summaryReport.timestamp}</p>
      </div>
      
      <div class="summary">
        <div class="metric">
          <div class="metric-value">${summary.total}</div>
          <div class="metric-label">Total Tests</div>
        </div>
        <div class="metric">
          <div class="metric-value" style="color: #28a745">${summary.passed}</div>
          <div class="metric-label">Passed</div>
        </div>
        <div class="metric">
          <div class="metric-value" style="color: #dc3545">${summary.failed}</div>
          <div class="metric-label">Failed</div>
        </div>
        <div class="metric">
          <div class="metric-value">${summary.duration}s</div>
          <div class="metric-label">Total Duration</div>
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Test Suite</th>
            <th>Status</th>
            <th>Duration</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          ${resultsTable}
        </tbody>
      </table>
      
      <h2>Test Coverage Areas</h2>
      <ul>
        <li><strong>Emotional State Machine:</strong> 6 moods, state transitions, context evaluation</li>
        <li><strong>Memory System:</strong> Trust management, feeding memory, persistence</li>
        <li><strong>Particle System:</strong> Food particles, bubbles, physics simulation</li>
        <li><strong>API Integration:</strong> Session management, interactions, WebSocket events</li>
        <li><strong>Visual Regression:</strong> Mood appearances, particle effects, responsive design</li>
        <li><strong>Performance:</strong> Animation smoothness, memory usage, load testing</li>
      </ul>
    </body>
    </html>
  `
}

// Main execution function
async function main() {
  const startTime = Date.now()
  
  log('🐠 Starting Candlefish Animation Test Suite', 'info')
  log('=' * 60, 'info')
  
  try {
    // Setup
    await setupEnvironment()
    
    // Determine which tests to run
    let testsToRun = config.onlyTests.length > 0 
      ? config.onlyTests 
      : config.executionOrder.filter(testType => !config.skipTests.includes(testType))
    
    log(`\n📋 Test plan: ${testsToRun.join(', ')}`, 'info')
    
    // Run tests
    const results = []
    
    for (const testType of testsToRun) {
      if (!config.testTypes[testType]) {
        log(`⚠️  Unknown test type: ${testType}`, 'warning')
        continue
      }
      
      const result = await runTestSuite(testType, config.testTypes[testType])
      results.push(result)
      
      // Stop on failure if not continuing
      if (!result.success && !config.continueOnFailure) {
        log('❌ Stopping due to test failure', 'error')
        break
      }
      
      // Brief pause between test suites
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    
    // Generate summary
    const summary = await generateSummaryReport(results)
    
    // Final summary
    const totalDuration = Math.round((Date.now() - startTime) / 1000)
    
    log('\n' + '=' * 60, 'info')
    log('📊 FINAL RESULTS', 'info')
    log('=' * 60, 'info')
    log(`Total Duration: ${totalDuration}s`, 'info')
    log(`Tests Passed: ${summary.summary.passed}/${summary.summary.total}`, summary.summary.success ? 'success' : 'error')
    
    if (summary.summary.success) {
      log('🎉 All tests passed!', 'success')
      process.exit(0)
    } else {
      log('💥 Some tests failed', 'error')
      process.exit(1)
    }
    
  } catch (error) {
    log(`💥 Test suite crashed: ${error.message}`, 'error')
    console.error(error)
    process.exit(1)
  }
}

// Handle CLI arguments
const args = process.argv.slice(2)

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Candlefish Animation Test Runner

Usage: node scripts/run-candlefish-tests.js [options]

Options:
  --help, -h              Show this help message
  --only <tests>          Run only specified tests (comma-separated)
  --skip <tests>          Skip specified tests (comma-separated)
  --continue-on-failure   Continue running tests even if some fail
  --ci                    Run in CI mode (sequential execution)

Test Types:
  - unit: Jest unit tests for core classes
  - integration: API and WebSocket integration tests
  - e2e: Cypress end-to-end interaction tests
  - visual: Playwright visual regression tests
  - performance: K6 performance and load tests

Examples:
  node scripts/run-candlefish-tests.js --only unit,integration
  node scripts/run-candlefish-tests.js --skip performance
  node scripts/run-candlefish-tests.js --continue-on-failure

Environment Variables:
  SKIP_TESTS=unit,e2e       Skip specified tests
  ONLY_TESTS=integration    Run only specified tests
  CONTINUE_ON_FAILURE=true  Continue on failure
  CI=true                   Enable CI mode
  SERVER_RUNNING=true       Skip server startup check
`)
  process.exit(0)
}

// Parse CLI arguments
if (args.includes('--only')) {
  const onlyIndex = args.indexOf('--only')
  if (args[onlyIndex + 1]) {
    process.env.ONLY_TESTS = args[onlyIndex + 1]
  }
}

if (args.includes('--skip')) {
  const skipIndex = args.indexOf('--skip')
  if (args[skipIndex + 1]) {
    process.env.SKIP_TESTS = args[skipIndex + 1]
  }
}

if (args.includes('--continue-on-failure')) {
  process.env.CONTINUE_ON_FAILURE = 'true'
}

if (args.includes('--ci')) {
  process.env.CI = 'true'
}

// Run the main function
if (require.main === module) {
  main().catch(console.error)
}

module.exports = { main, config }