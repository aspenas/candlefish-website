const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs');
const path = require('path');

/**
 * Lighthouse Performance Testing for Analytics Dashboard
 * Tests web performance metrics and accessibility
 */

const config = {
  extends: 'lighthouse:default',
  settings: {
    formFactor: 'desktop',
    throttling: {
      rttMs: 40,
      throughputKbps: 10240,
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
      disabled: false,
    },
    emulatedUserAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  }
};

const mobileConfig = {
  extends: 'lighthouse:default',
  settings: {
    formFactor: 'mobile',
    throttling: {
      rttMs: 150,
      throughputKbps: 1638,
      cpuSlowdownMultiplier: 4,
      requestLatencyMs: 0,
      downloadThroughputKbps: 0,
      uploadThroughputKbps: 0
    },
    screenEmulation: {
      mobile: true,
      width: 375,
      height: 667,
      deviceScaleFactor: 2,
      disabled: false,
    }
  }
};

const testUrls = [
  'http://localhost:3500',
  'http://localhost:3500/analytics',
  'http://localhost:3500/analytics/mobile',
  'http://localhost:3500/analytics/trends'
];

const performanceThresholds = {
  'first-contentful-paint': 2000,
  'largest-contentful-paint': 4000,
  'interactive': 5000,
  'speed-index': 4000,
  'cumulative-layout-shift': 0.1,
  'max-potential-fid': 300
};

const accessibilityThresholds = {
  'accessibility': 95,
  'best-practices': 90,
  'seo': 90
};

async function runLighthouseTest(url, config, device = 'desktop') {
  console.log(`🚀 Running Lighthouse test for ${url} (${device})...`);
  
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  const options = {
    logLevel: 'info',
    output: 'json',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    port: chrome.port,
  };

  try {
    const runnerResult = await lighthouse(url, options, config);
    await chrome.kill();

    return {
      url,
      device,
      lhr: runnerResult.lhr,
      report: runnerResult.report
    };
  } catch (error) {
    await chrome.kill();
    throw error;
  }
}

async function analyzePerformanceResults(results) {
  const analysis = {
    passed: [],
    failed: [],
    summary: {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0
    }
  };

  for (const result of results) {
    const { url, device, lhr } = result;
    const audits = lhr.audits;
    
    console.log(`\n📊 Analyzing ${url} (${device})`);
    
    // Performance metrics
    for (const [metric, threshold] of Object.entries(performanceThresholds)) {
      analysis.summary.totalTests++;
      
      if (audits[metric]) {
        const value = audits[metric].numericValue;
        const passed = value <= threshold;
        
        const testResult = {
          url,
          device,
          metric,
          value,
          threshold,
          passed,
          score: audits[metric].score
        };
        
        if (passed) {
          analysis.passed.push(testResult);
          analysis.summary.passedTests++;
          console.log(`✅ ${metric}: ${value}ms (threshold: ${threshold}ms)`);
        } else {
          analysis.failed.push(testResult);
          analysis.summary.failedTests++;
          console.log(`❌ ${metric}: ${value}ms (threshold: ${threshold}ms)`);
        }
      }
    }
    
    // Accessibility and best practices
    for (const [category, threshold] of Object.entries(accessibilityThresholds)) {
      analysis.summary.totalTests++;
      
      if (lhr.categories[category]) {
        const score = Math.round(lhr.categories[category].score * 100);
        const passed = score >= threshold;
        
        const testResult = {
          url,
          device,
          metric: category,
          value: score,
          threshold,
          passed,
          score: score / 100
        };
        
        if (passed) {
          analysis.passed.push(testResult);
          analysis.summary.passedTests++;
          console.log(`✅ ${category}: ${score}% (threshold: ${threshold}%)`);
        } else {
          analysis.failed.push(testResult);
          analysis.summary.failedTests++;
          console.log(`❌ ${category}: ${score}% (threshold: ${threshold}%)`);
        }
      }
    }
  }

  return analysis;
}

async function generatePerformanceReport(results, analysis) {
  const reportDir = path.join(__dirname, '../../test-results/lighthouse');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  // Generate HTML reports for each test
  for (const result of results) {
    const { url, device, report } = result;
    const sanitizedUrl = url.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `lighthouse_${sanitizedUrl}_${device}.html`;
    const filepath = path.join(reportDir, filename);
    
    fs.writeFileSync(filepath, report);
    console.log(`📄 Report saved: ${filepath}`);
  }

  // Generate summary JSON
  const summaryData = {
    timestamp: new Date().toISOString(),
    analysis,
    results: results.map(r => ({
      url: r.url,
      device: r.device,
      scores: {
        performance: Math.round(r.lhr.categories.performance.score * 100),
        accessibility: Math.round(r.lhr.categories.accessibility.score * 100),
        bestPractices: Math.round(r.lhr.categories['best-practices'].score * 100),
        seo: Math.round(r.lhr.categories.seo.score * 100)
      },
      metrics: {
        fcp: r.lhr.audits['first-contentful-paint']?.numericValue,
        lcp: r.lhr.audits['largest-contentful-paint']?.numericValue,
        tti: r.lhr.audits['interactive']?.numericValue,
        cls: r.lhr.audits['cumulative-layout-shift']?.numericValue,
        si: r.lhr.audits['speed-index']?.numericValue
      }
    }))
  };

  const summaryPath = path.join(reportDir, 'lighthouse_summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summaryData, null, 2));
  console.log(`📊 Summary saved: ${summaryPath}`);

  return summaryData;
}

async function runBudgetTest(url) {
  console.log(`💰 Running performance budget test for ${url}...`);
  
  const budgetConfig = {
    ...config,
    settings: {
      ...config.settings,
      budgets: [{
        path: '/*',
        timings: [
          { metric: 'first-contentful-paint', budget: 2000 },
          { metric: 'largest-contentful-paint', budget: 4000 },
          { metric: 'interactive', budget: 5000 },
          { metric: 'speed-index', budget: 4000 }
        ],
        resourceSizes: [
          { resourceType: 'script', budget: 500 },
          { resourceType: 'image', budget: 1000 },
          { resourceType: 'stylesheet', budget: 100 },
          { resourceType: 'font', budget: 100 }
        ],
        resourceCounts: [
          { resourceType: 'script', budget: 20 },
          { resourceType: 'image', budget: 30 },
          { resourceType: 'stylesheet', budget: 10 }
        ]
      }]
    }
  };

  return runLighthouseTest(url, budgetConfig, 'budget');
}

async function runProgressiveWebAppTest(url) {
  console.log(`📱 Running PWA test for ${url}...`);
  
  const pwaConfig = {
    extends: 'lighthouse:default',
    settings: {
      ...config.settings,
      onlyCategories: ['pwa']
    }
  };

  return runLighthouseTest(url, pwaConfig, 'pwa');
}

async function runAccessibilityAudit(url) {
  console.log(`♿ Running accessibility audit for ${url}...`);
  
  const a11yConfig = {
    extends: 'lighthouse:default',
    settings: {
      ...config.settings,
      onlyCategories: ['accessibility']
    }
  };

  const result = await runLighthouseTest(url, a11yConfig, 'accessibility');
  
  // Extract specific accessibility issues
  const issues = [];
  const audits = result.lhr.audits;
  
  for (const [auditId, audit] of Object.entries(audits)) {
    if (audit.score !== null && audit.score < 1 && audit.details) {
      issues.push({
        id: auditId,
        title: audit.title,
        description: audit.description,
        impact: audit.scoreDisplayMode,
        details: audit.details
      });
    }
  }

  return {
    ...result,
    accessibilityIssues: issues
  };
}

async function main() {
  console.log('🎯 Starting Lighthouse Performance Testing Suite');
  
  const results = [];

  try {
    // Test each URL on desktop and mobile
    for (const url of testUrls) {
      // Desktop tests
      const desktopResult = await runLighthouseTest(url, config, 'desktop');
      results.push(desktopResult);

      // Mobile tests  
      const mobileResult = await runLighthouseTest(url, mobileConfig, 'mobile');
      results.push(mobileResult);

      // Budget test for main analytics page
      if (url.includes('/analytics') && !url.includes('/mobile')) {
        const budgetResult = await runBudgetTest(url);
        results.push(budgetResult);
      }

      // PWA test for main page
      if (url === 'http://localhost:3500') {
        const pwaResult = await runProgressiveWebAppTest(url);
        results.push(pwaResult);
      }

      // Accessibility audit
      const a11yResult = await runAccessibilityAudit(url);
      results.push(a11yResult);
    }

    // Analyze results
    const analysis = await analyzePerformanceResults(results);
    
    // Generate reports
    const summaryData = await generatePerformanceReport(results, analysis);
    
    // Print final summary
    console.log('\n🎯 LIGHTHOUSE PERFORMANCE TEST SUMMARY');
    console.log('=====================================');
    console.log(`Total Tests: ${analysis.summary.totalTests}`);
    console.log(`Passed: ${analysis.summary.passedTests}`);
    console.log(`Failed: ${analysis.summary.failedTests}`);
    console.log(`Success Rate: ${Math.round((analysis.summary.passedTests / analysis.summary.totalTests) * 100)}%`);
    
    if (analysis.failed.length > 0) {
      console.log('\n❌ FAILED TESTS:');
      analysis.failed.forEach(test => {
        console.log(`   ${test.url} (${test.device}) - ${test.metric}: ${test.value} (threshold: ${test.threshold})`);
      });
    }

    // Exit with appropriate code
    process.exit(analysis.failed.length > 0 ? 1 : 0);

  } catch (error) {
    console.error('❌ Lighthouse tests failed:', error);
    process.exit(1);
  }
}

// Export for use in other scripts
module.exports = {
  runLighthouseTest,
  analyzePerformanceResults,
  generatePerformanceReport,
  runBudgetTest,
  runProgressiveWebAppTest,
  runAccessibilityAudit,
  performanceThresholds,
  accessibilityThresholds
};

// Run if called directly
if (require.main === module) {
  main();
}