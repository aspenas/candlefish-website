#!/usr/bin/env node

/**
 * Performance monitoring script for Candlefish AI website
 * Collects and analyzes performance metrics
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  urls: [
    'http://localhost:3000',
    'https://candlefish.ai'
  ],
  metrics: {
    performanceThreshold: 80,
    accessibilityThreshold: 90,
    bestPracticesThreshold: 80,
    seoThreshold: 80
  },
  outputDir: path.join(__dirname, '..', 'reports'),
  retries: 3,
  timeout: 30000
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Logging utility
const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  data: (msg) => console.log(`${colors.cyan}[DATA]${colors.reset} ${msg}`)
};

// Ensure output directory exists
async function ensureOutputDir() {
  try {
    await fs.mkdir(CONFIG.outputDir, { recursive: true });
  } catch (error) {
    log.error(`Failed to create output directory: ${error.message}`);
    throw error;
  }
}

// Run Lighthouse audit
async function runLighthouseAudit(url) {
  log.info(`Running Lighthouse audit for ${url}`);
  
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = path.join(CONFIG.outputDir, `lighthouse-${timestamp}.json`);
    
    const command = [
      'lighthouse',
      url,
      '--output=json',
      `--output-path=${outputFile}`,
      '--chrome-flags="--headless --no-sandbox"',
      '--quiet'
    ].join(' ');
    
    execSync(command, { timeout: CONFIG.timeout });
    
    const reportData = JSON.parse(await fs.readFile(outputFile, 'utf8'));
    return reportData;
    
  } catch (error) {
    log.error(`Lighthouse audit failed for ${url}: ${error.message}`);
    throw error;
  }
}

// Extract key metrics from Lighthouse report
function extractMetrics(report) {
  const categories = report.categories;
  const audits = report.audits;
  
  return {
    performance: Math.round(categories.performance.score * 100),
    accessibility: Math.round(categories.accessibility.score * 100),
    bestPractices: Math.round(categories['best-practices'].score * 100),
    seo: Math.round(categories.seo.score * 100),
    metrics: {
      firstContentfulPaint: audits['first-contentful-paint'].displayValue,
      largestContentfulPaint: audits['largest-contentful-paint'].displayValue,
      firstInputDelay: audits['max-potential-fid'].displayValue,
      cumulativeLayoutShift: audits['cumulative-layout-shift'].displayValue,
      totalBlockingTime: audits['total-blocking-time'].displayValue,
      speedIndex: audits['speed-index'].displayValue
    },
    opportunities: Object.keys(audits)
      .filter(key => audits[key].details && audits[key].details.overallSavingsMs > 100)
      .map(key => ({
        audit: key,
        title: audits[key].title,
        description: audits[key].description,
        savings: audits[key].details.overallSavingsMs
      }))
      .sort((a, b) => b.savings - a.savings)
      .slice(0, 5)
  };
}

// Analyze performance trends
async function analyzePerformanceTrends() {
  try {
    const reportFiles = await fs.readdir(CONFIG.outputDir);
    const lighthouseFiles = reportFiles
      .filter(file => file.startsWith('lighthouse-') && file.endsWith('.json'))
      .sort()
      .slice(-10); // Get last 10 reports
    
    if (lighthouseFiles.length < 2) {
      log.warning('Not enough historical data for trend analysis');
      return null;
    }
    
    const reports = await Promise.all(
      lighthouseFiles.map(async file => {
        const data = JSON.parse(await fs.readFile(path.join(CONFIG.outputDir, file), 'utf8'));
        return {
          timestamp: data.fetchTime,
          url: data.finalUrl,
          metrics: extractMetrics(data)
        };
      })
    );
    
    // Calculate trends
    const trends = {};
    const metrics = ['performance', 'accessibility', 'bestPractices', 'seo'];
    
    metrics.forEach(metric => {
      const values = reports.map(r => r.metrics[metric]);
      const first = values[0];
      const last = values[values.length - 1];
      const trend = last - first;
      
      trends[metric] = {
        current: last,
        change: trend,
        direction: trend > 0 ? 'improving' : trend < 0 ? 'declining' : 'stable'
      };
    });
    
    return trends;
    
  } catch (error) {
    log.error(`Failed to analyze trends: ${error.message}`);
    return null;
  }
}

// Generate performance report
async function generatePerformanceReport(url, metrics, trends) {
  const timestamp = new Date().toISOString();
  
  const report = {
    timestamp,
    url,
    metrics,
    trends,
    thresholds: CONFIG.metrics,
    status: {
      performance: metrics.performance >= CONFIG.metrics.performanceThreshold,
      accessibility: metrics.accessibility >= CONFIG.metrics.accessibilityThreshold,
      bestPractices: metrics.bestPractices >= CONFIG.metrics.bestPracticesThreshold,
      seo: metrics.seo >= CONFIG.metrics.seoThreshold
    }
  };
  
  // Save detailed report
  const reportFile = path.join(CONFIG.outputDir, `performance-report-${timestamp.replace(/[:.]/g, '-')}.json`);
  await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
  
  return report;
}

// Display results in console
function displayResults(report) {
  const { metrics, status, trends } = report;
  
  log.info(`Performance Report for ${report.url}`);
  console.log('='.repeat(60));
  
  // Core Web Vitals
  log.data('Core Metrics:');
  console.log(`  Performance:     ${status.performance ? '✓' : '✗'} ${metrics.performance}/100`);
  console.log(`  Accessibility:   ${status.accessibility ? '✓' : '✗'} ${metrics.accessibility}/100`);
  console.log(`  Best Practices:  ${status.bestPractices ? '✓' : '✗'} ${metrics.bestPractices}/100`);
  console.log(`  SEO:             ${status.seo ? '✓' : '✗'} ${metrics.seo}/100`);
  
  // Web Vitals
  log.data('Web Vitals:');
  console.log(`  First Contentful Paint:    ${metrics.metrics.firstContentfulPaint}`);
  console.log(`  Largest Contentful Paint:  ${metrics.metrics.largestContentfulPaint}`);
  console.log(`  First Input Delay:         ${metrics.metrics.firstInputDelay}`);
  console.log(`  Cumulative Layout Shift:   ${metrics.metrics.cumulativeLayoutShift}`);
  console.log(`  Total Blocking Time:       ${metrics.metrics.totalBlockingTime}`);
  console.log(`  Speed Index:               ${metrics.metrics.speedIndex}`);
  
  // Trends (if available)
  if (trends) {
    log.data('Trends:');
    Object.entries(trends).forEach(([key, trend]) => {
      const arrow = trend.direction === 'improving' ? '↗' : 
                   trend.direction === 'declining' ? '↘' : '→';
      const color = trend.direction === 'improving' ? colors.green : 
                   trend.direction === 'declining' ? colors.red : colors.yellow;
      
      console.log(`  ${key}: ${color}${arrow} ${trend.change > 0 ? '+' : ''}${trend.change}${colors.reset} (${trend.current})`);
    });
  }
  
  // Performance Opportunities
  if (metrics.opportunities.length > 0) {
    log.data('Top Performance Opportunities:');
    metrics.opportunities.forEach((opp, index) => {
      console.log(`  ${index + 1}. ${opp.title} (${opp.savings}ms savings)`);
    });
  }
  
  console.log('='.repeat(60));
  
  // Overall status
  const allPassed = Object.values(status).every(s => s);
  if (allPassed) {
    log.success('All performance thresholds met!');
  } else {
    log.warning('Some performance thresholds not met');
  }
}

// Send alerts if thresholds are not met
async function sendAlerts(report) {
  const failedMetrics = Object.entries(report.status)
    .filter(([_, passed]) => !passed)
    .map(([metric]) => metric);
  
  if (failedMetrics.length > 0) {
    log.warning(`Performance alert: ${failedMetrics.join(', ')} below threshold`);
    
    // Create alert file for external monitoring systems
    const alertFile = path.join(CONFIG.outputDir, 'performance-alert.json');
    const alert = {
      timestamp: new Date().toISOString(),
      url: report.url,
      failedMetrics,
      metrics: report.metrics,
      severity: failedMetrics.includes('performance') ? 'high' : 'medium'
    };
    
    await fs.writeFile(alertFile, JSON.stringify(alert, null, 2));
  }
}

// Main monitoring function
async function monitorPerformance(url) {
  log.info(`Starting performance monitoring for ${url}`);
  
  try {
    // Run Lighthouse audit
    const lighthouseReport = await runLighthouseAudit(url);
    const metrics = extractMetrics(lighthouseReport);
    
    // Analyze trends
    const trends = await analyzePerformanceTrends();
    
    // Generate report
    const report = await generatePerformanceReport(url, metrics, trends);
    
    // Display results
    displayResults(report);
    
    // Send alerts if needed
    await sendAlerts(report);
    
    return report;
    
  } catch (error) {
    log.error(`Performance monitoring failed for ${url}: ${error.message}`);
    throw error;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const urls = args.length > 0 ? args : CONFIG.urls;
  
  try {
    await ensureOutputDir();
    
    log.info('Starting performance monitoring...');
    
    const results = [];
    
    for (const url of urls) {
      try {
        const result = await monitorPerformance(url);
        results.push(result);
      } catch (error) {
        log.error(`Failed to monitor ${url}: ${error.message}`);
        results.push({ url, error: error.message });
      }
    }
    
    // Summary
    const successful = results.filter(r => !r.error).length;
    const failed = results.filter(r => r.error).length;
    
    log.info(`Monitoring complete: ${successful} successful, ${failed} failed`);
    
    // Exit with error code if any monitoring failed
    if (failed > 0) {
      process.exit(1);
    }
    
  } catch (error) {
    log.error(`Performance monitoring script failed: ${error.message}`);
    process.exit(1);
  }
}

// Check if Lighthouse is installed
function checkDependencies() {
  try {
    execSync('lighthouse --version', { stdio: 'ignore' });
  } catch (error) {
    log.error('Lighthouse is not installed. Please install it with: npm install -g lighthouse');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  checkDependencies();
  main().catch(error => {
    log.error(`Unexpected error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  monitorPerformance,
  runLighthouseAudit,
  extractMetrics,
  analyzePerformanceTrends
};