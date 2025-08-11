#!/usr/bin/env node

/**
 * Performance testing script for Candlefish.ai homepage
 * Runs Lighthouse tests and generates performance reports
 */

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Performance thresholds
const PERFORMANCE_BUDGET = {
  performance: 90,
  accessibility: 95,
  'best-practices': 90,
  seo: 95,
  pwa: 80,
  
  // Core Web Vitals
  'first-contentful-paint': 1800,
  'largest-contentful-paint': 2500,
  'cumulative-layout-shift': 0.1,
  'total-blocking-time': 300,
  'speed-index': 3400,
  'time-to-interactive': 3800
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

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkLighthouseInstalled() {
  return new Promise((resolve) => {
    exec('lighthouse --version', (error) => {
      resolve(!error);
    });
  });
}

async function installLighthouse() {
  log('Installing Lighthouse CLI...', 'cyan');
  return new Promise((resolve, reject) => {
    exec('npm install -g lighthouse', (error, stdout) => {
      if (error) {
        reject(error);
      } else {
        log('Lighthouse installed successfully!', 'green');
        resolve(stdout);
      }
    });
  });
}

function runLighthouse(url, outputPath) {
  const command = `lighthouse ${url} \
    --output=json \
    --output=html \
    --output-path=${outputPath} \
    --chrome-flags="--headless" \
    --only-categories=performance,accessibility,best-practices,seo \
    --throttling.cpuSlowdownMultiplier=4 \
    --preset=desktop`;

  return new Promise((resolve, reject) => {
    log(`Running Lighthouse test for ${url}...`, 'cyan');
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

function parseResults(jsonPath) {
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  
  const scores = {
    performance: Math.round(data.categories.performance.score * 100),
    accessibility: Math.round(data.categories.accessibility.score * 100),
    'best-practices': Math.round(data.categories['best-practices'].score * 100),
    seo: Math.round(data.categories.seo.score * 100)
  };

  const metrics = {};
  const audits = data.audits;
  
  if (audits['first-contentful-paint']) {
    metrics['first-contentful-paint'] = audits['first-contentful-paint'].numericValue;
  }
  if (audits['largest-contentful-paint']) {
    metrics['largest-contentful-paint'] = audits['largest-contentful-paint'].numericValue;
  }
  if (audits['cumulative-layout-shift']) {
    metrics['cumulative-layout-shift'] = audits['cumulative-layout-shift'].numericValue;
  }
  if (audits['total-blocking-time']) {
    metrics['total-blocking-time'] = audits['total-blocking-time'].numericValue;
  }
  if (audits['speed-index']) {
    metrics['speed-index'] = audits['speed-index'].numericValue;
  }
  if (audits['interactive']) {
    metrics['time-to-interactive'] = audits['interactive'].numericValue;
  }

  return { scores, metrics };
}

function checkBudget(results) {
  const failures = [];
  
  // Check score budgets
  for (const [key, threshold] of Object.entries(PERFORMANCE_BUDGET)) {
    if (results.scores[key] !== undefined) {
      if (results.scores[key] < threshold) {
        failures.push({
          metric: key,
          actual: results.scores[key],
          threshold,
          type: 'score'
        });
      }
    }
  }

  // Check metric budgets
  for (const [key, threshold] of Object.entries(PERFORMANCE_BUDGET)) {
    if (results.metrics[key] !== undefined) {
      if (results.metrics[key] > threshold) {
        failures.push({
          metric: key,
          actual: results.metrics[key],
          threshold,
          type: 'metric'
        });
      }
    }
  }

  return failures;
}

function formatMetricValue(value, metric) {
  if (metric.includes('layout-shift')) {
    return value.toFixed(3);
  }
  return `${Math.round(value)}ms`;
}

function printResults(results, failures) {
  console.log('\n' + '='.repeat(60));
  log('PERFORMANCE TEST RESULTS', 'cyan');
  console.log('='.repeat(60) + '\n');

  // Print scores
  log('Lighthouse Scores:', 'blue');
  for (const [key, value] of Object.entries(results.scores)) {
    const passed = value >= (PERFORMANCE_BUDGET[key] || 0);
    const icon = passed ? '✅' : '❌';
    const color = passed ? 'green' : 'red';
    log(`  ${icon} ${key}: ${value}/100 (threshold: ${PERFORMANCE_BUDGET[key] || 'N/A'})`, color);
  }

  // Print metrics
  console.log('');
  log('Core Web Vitals:', 'blue');
  for (const [key, value] of Object.entries(results.metrics)) {
    const threshold = PERFORMANCE_BUDGET[key];
    const passed = threshold ? value <= threshold : true;
    const icon = passed ? '✅' : '❌';
    const color = passed ? 'green' : 'red';
    const formattedValue = formatMetricValue(value, key);
    const formattedThreshold = threshold ? formatMetricValue(threshold, key) : 'N/A';
    log(`  ${icon} ${key}: ${formattedValue} (threshold: ${formattedThreshold})`, color);
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  if (failures.length === 0) {
    log('✅ ALL PERFORMANCE BUDGETS PASSED!', 'green');
  } else {
    log(`❌ ${failures.length} PERFORMANCE BUDGET(S) FAILED`, 'red');
    console.log('\nFailed metrics:');
    failures.forEach(failure => {
      const actual = failure.type === 'score' ? 
        `${failure.actual}/100` : 
        formatMetricValue(failure.actual, failure.metric);
      const threshold = failure.type === 'score' ? 
        `${failure.threshold}/100` : 
        formatMetricValue(failure.threshold, failure.metric);
      log(`  - ${failure.metric}: ${actual} (threshold: ${threshold})`, 'yellow');
    });
  }
  console.log('='.repeat(60) + '\n');
}

async function main() {
  const url = process.argv[2] || 'http://localhost:3000';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = path.join(__dirname, '..', 'lighthouse-reports');
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, `lighthouse-${timestamp}`);

  try {
    // Check if Lighthouse is installed
    const isInstalled = await checkLighthouseInstalled();
    if (!isInstalled) {
      await installLighthouse();
    }

    // Run Lighthouse test
    await runLighthouse(url, outputPath);
    
    // Parse results
    const results = parseResults(`${outputPath}.report.json`);
    
    // Check performance budget
    const failures = checkBudget(results);
    
    // Print results
    printResults(results, failures);
    
    // Save summary
    const summary = {
      timestamp: new Date().toISOString(),
      url,
      ...results,
      budgetFailures: failures
    };
    
    fs.writeFileSync(
      path.join(outputDir, 'latest-summary.json'),
      JSON.stringify(summary, null, 2)
    );
    
    log(`Full reports saved to: ${outputDir}`, 'cyan');
    log(`HTML report: ${outputPath}.report.html`, 'cyan');
    
    // Exit with error code if budget failed
    if (failures.length > 0) {
      process.exit(1);
    }
    
  } catch (error) {
    log(`Error running performance test: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run the script
main();