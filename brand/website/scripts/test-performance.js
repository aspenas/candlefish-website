#!/usr/bin/env node

/**
 * Performance Testing Script
 * Tests the optimized quantum pipeline animation
 * Target: Lighthouse Score 99%
 */

const puppeteer = require('puppeteer');
const lighthouse = require('lighthouse');
const fs = require('fs').promises;
const path = require('path');

const URL = process.env.TEST_URL || 'http://localhost:3000';

// Lighthouse configuration for performance testing
const LIGHTHOUSE_CONFIG = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['performance'],
    emulatedFormFactor: 'desktop',
    throttling: {
      rttMs: 40,
      throughputKbps: 10 * 1024,
      cpuSlowdownMultiplier: 1,
      requestLatencyMs: 0,
      downloadThroughputKbps: 0,
      uploadThroughputKbps: 0
    },
    screenEmulation: {
      mobile: false,
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      disabled: false
    }
  }
};

// Performance thresholds for passing
const THRESHOLDS = {
  performance: 99, // Target score
  'first-contentful-paint': 1800,
  'largest-contentful-paint': 2500,
  'total-blocking-time': 200,
  'cumulative-layout-shift': 0.1,
  'speed-index': 3400
};

async function runLighthouse() {
  console.log('🚀 Starting Performance Test...');
  console.log(`📍 Testing URL: ${URL}`);
  console.log('🎯 Target Score: 99/100\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    // Run Lighthouse
    const { lhr: results } = await lighthouse(URL, {
      port: new URL(browser.wsEndpoint()).port,
      output: 'json',
      logLevel: 'error',
      ...LIGHTHOUSE_CONFIG
    });

    // Extract metrics
    const performanceScore = Math.round(results.categories.performance.score * 100);
    const metrics = results.audits;

    console.log('📊 Performance Results:');
    console.log('━'.repeat(50));

    // Overall score
    const scoreEmoji = performanceScore >= 99 ? '✅' : performanceScore >= 90 ? '⚠️' : '❌';
    console.log(`${scoreEmoji} Performance Score: ${performanceScore}/100`);

    // Core Web Vitals
    console.log('\n🎯 Core Web Vitals:');
    console.log(`  FCP: ${metrics['first-contentful-paint'].displayValue} ${getStatus(metrics['first-contentful-paint'].score)}`);
    console.log(`  LCP: ${metrics['largest-contentful-paint'].displayValue} ${getStatus(metrics['largest-contentful-paint'].score)}`);
    console.log(`  TBT: ${metrics['total-blocking-time'].displayValue} ${getStatus(metrics['total-blocking-time'].score)}`);
    console.log(`  CLS: ${metrics['cumulative-layout-shift'].displayValue} ${getStatus(metrics['cumulative-layout-shift'].score)}`);
    console.log(`  SI:  ${metrics['speed-index'].displayValue} ${getStatus(metrics['speed-index'].score)}`);

    // Additional metrics
    console.log('\n📈 Additional Metrics:');
    console.log(`  Time to Interactive: ${metrics['interactive'].displayValue}`);
    console.log(`  First Meaningful Paint: ${metrics['first-meaningful-paint']?.displayValue || 'N/A'}`);
    console.log(`  Max Potential FID: ${metrics['max-potential-fid']?.displayValue || 'N/A'}`);

    // Opportunities for improvement
    if (performanceScore < 99) {
      console.log('\n💡 Opportunities for Improvement:');

      const opportunities = Object.values(results.audits)
        .filter(audit => audit.score !== null && audit.score < 0.9 && audit.details?.type === 'opportunity')
        .sort((a, b) => (b.details?.overallSavingsMs || 0) - (a.details?.overallSavingsMs || 0))
        .slice(0, 5);

      opportunities.forEach(opp => {
        const savings = opp.details?.overallSavingsMs;
        if (savings) {
          console.log(`  • ${opp.title}: Save ~${Math.round(savings)}ms`);
        }
      });
    }

    // Diagnostics
    const diagnostics = Object.values(results.audits)
      .filter(audit => audit.score !== null && audit.score < 0.9 && audit.details?.type === 'table')
      .slice(0, 3);

    if (diagnostics.length > 0) {
      console.log('\n⚠️ Diagnostics:');
      diagnostics.forEach(diag => {
        console.log(`  • ${diag.title}`);
      });
    }

    // Save detailed report
    const reportPath = path.join(__dirname, '..', 'performance-report.json');
    await fs.writeFile(reportPath, JSON.stringify(results, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);

    // Check if target is met
    if (performanceScore >= THRESHOLDS.performance) {
      console.log('\n🎉 SUCCESS! Target performance score achieved!');
      console.log('The quantum pipeline animation is fully optimized! 🚀');
      return true;
    } else {
      console.log(`\n⚠️ Performance score ${performanceScore} is below target of ${THRESHOLDS.performance}`);
      console.log('Review the opportunities above for optimization suggestions.');
      return false;
    }

  } catch (error) {
    console.error('❌ Error running Lighthouse:', error);
    return false;
  } finally {
    await browser.close();
  }
}

function getStatus(score) {
  if (score >= 0.9) return '✅';
  if (score >= 0.5) return '⚠️';
  return '❌';
}

// Run tests
(async () => {
  try {
    const success = await runLighthouse();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
})();

// Export for use in other scripts
module.exports = { runLighthouse };
