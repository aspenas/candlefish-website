/**
 * Pa11y configuration for accessibility testing
 * Provides automated WCAG 2.1 AA compliance testing
 */

const pa11y = require('pa11y');
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

// Pa11y configuration for comprehensive accessibility testing
const PA11Y_CONFIG = {
  // Browser settings
  browser: null, // Will be set dynamically

  // WCAG 2.1 AA standards
  standard: 'WCAG2AA',

  // Include additional accessibility rules
  runners: ['axe', 'htmlcs'],

  // Viewport settings
  viewport: {
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1
  },

  // Timeout settings
  timeout: 30000,
  wait: 2000,

  // Chrome launch options
  chromeLaunchConfig: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-extensions',
      '--disable-gpu',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      // Accessibility-specific flags
      '--force-prefers-reduced-motion',
      '--enable-experimental-accessibility-features'
    ]
  },

  // Custom actions to perform before testing
  actions: [
    // Wait for page to fully load
    'wait for element body to be visible',

    // Handle cookie banners or modals that might interfere
    'click element .cookie-accept if exists',
    'click element .modal-close if exists',

    // Set focus to main content for keyboard navigation testing
    'set field #main-content to focused',
  ],

  // Elements to ignore (false positives or third-party content)
  ignore: [
    // Ignore third-party embedded content
    'WCAG2AA.Principle1.Guideline1_1.1_1_1.H67.2',  // Empty alt on decorative images
    'WCAG2AA.Principle1.Guideline1_3.1_3_1.H48',    // Navigation lists (handled by our custom nav)

    // Ignore specific elements that are handled by our framework
    'code', // Code blocks have different accessibility requirements
    '.syntax-highlight', // Syntax highlighting decorative elements
    '.line-numbers', // Line numbers are decorative

    // Ignore loading states and placeholders
    '.loading-skeleton',
    '.placeholder-text',
    '[aria-hidden="true"]', // Explicitly hidden decorative elements

    // Ignore analytics and tracking scripts
    'script[src*="analytics"]',
    'script[src*="tracking"]',
  ],

  // Include specific rules we want to enforce
  includeNotices: false,
  includeWarnings: true,

  // Custom rule configuration
  rules: {
    // Color contrast - use enhanced standards
    'color-contrast-aa': true,
    'color-contrast-aaa': false, // Too strict for some design elements

    // Focus management
    'focus-order': true,
    'focus-visible': true,

    // Keyboard navigation
    'keyboard-navigation': true,
    'skip-links': true,

    // Screen reader support
    'landmark-roles': true,
    'heading-structure': true,
    'alt-text': true,

    // Form accessibility
    'form-labels': true,
    'form-validation': true,
    'required-fields': true,

    // Interactive elements
    'button-name': true,
    'link-purpose': true,
    'interactive-elements': true
  }
};

// Mobile configuration for responsive accessibility testing
const MOBILE_CONFIG = {
  ...PA11Y_CONFIG,
  viewport: {
    width: 375,
    height: 667,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  },
  chromeLaunchConfig: {
    ...PA11Y_CONFIG.chromeLaunchConfig,
    args: [
      ...PA11Y_CONFIG.chromeLaunchConfig.args,
      '--user-agent="Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1"'
    ]
  }
};

// High contrast mode configuration
const HIGH_CONTRAST_CONFIG = {
  ...PA11Y_CONFIG,
  actions: [
    ...PA11Y_CONFIG.actions,
    // Enable high contrast mode
    'execute function() { document.documentElement.classList.add("high-contrast-mode"); }',
    'wait for 1000ms'
  ]
};

// Reduced motion configuration
const REDUCED_MOTION_CONFIG = {
  ...PA11Y_CONFIG,
  actions: [
    ...PA11Y_CONFIG.actions,
    // Set reduced motion preference
    'execute function() { document.documentElement.style.setProperty("--prefers-reduced-motion", "reduce"); }',
    'wait for 1000ms'
  ]
};

// Pages to test with Pa11y
const PAGES_TO_TEST = [
  {
    name: 'Homepage',
    url: '/',
    description: 'Main landing page',
    config: PA11Y_CONFIG,
    criticalRules: ['color-contrast-aa', 'landmark-roles', 'heading-structure'],
    expectedIssues: 0
  },
  {
    name: 'Documentation Portal',
    url: '/docs',
    description: 'Documentation home page',
    config: PA11Y_CONFIG,
    criticalRules: ['heading-structure', 'skip-links', 'keyboard-navigation'],
    expectedIssues: 0
  },
  {
    name: 'API Reference',
    url: '/docs/api',
    description: 'API documentation page',
    config: PA11Y_CONFIG,
    criticalRules: ['heading-structure', 'form-labels', 'interactive-elements'],
    expectedIssues: 0
  },
  {
    name: 'Getting Started',
    url: '/docs/getting-started',
    description: 'Getting started guide',
    config: PA11Y_CONFIG,
    criticalRules: ['heading-structure', 'alt-text', 'link-purpose'],
    expectedIssues: 0
  },
  {
    name: 'Search Page',
    url: '/search',
    description: 'Search functionality',
    config: PA11Y_CONFIG,
    criticalRules: ['form-labels', 'focus-visible', 'keyboard-navigation'],
    expectedIssues: 0
  },
  {
    name: 'Partner Portal',
    url: '/partners',
    description: 'Partner dashboard',
    config: PA11Y_CONFIG,
    criticalRules: ['form-labels', 'form-validation', 'required-fields'],
    expectedIssues: 0
  },
  {
    name: 'Authentication',
    url: '/auth/login',
    description: 'Login page',
    config: PA11Y_CONFIG,
    criticalRules: ['form-labels', 'form-validation', 'required-fields', 'button-name'],
    expectedIssues: 0
  }
];

/**
 * Run Pa11y test for a specific page
 */
async function runPa11yTest(pageConfig, browser) {
  const fullUrl = `${BASE_URL}${pageConfig.url}`;
  const config = {
    ...pageConfig.config,
    browser: browser
  };

  try {
    console.log(`Testing ${pageConfig.name}: ${fullUrl}`);
    const results = await pa11y(fullUrl, config);

    return {
      page: pageConfig.name,
      url: fullUrl,
      description: pageConfig.description,
      issues: results.issues || [],
      totalIssues: results.issues ? results.issues.length : 0,
      errors: results.issues ? results.issues.filter(issue => issue.type === 'error') : [],
      warnings: results.issues ? results.issues.filter(issue => issue.type === 'warning') : [],
      notices: results.issues ? results.issues.filter(issue => issue.type === 'notice') : [],
      passed: results.issues ? results.issues.filter(issue => issue.type === 'error').length === 0 : true,
      criticalRules: pageConfig.criticalRules,
      expectedIssues: pageConfig.expectedIssues,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error testing ${pageConfig.name}:`, error);
    return {
      page: pageConfig.name,
      url: fullUrl,
      error: error.message,
      passed: false,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Run Pa11y tests for mobile viewport
 */
async function runMobilePa11yTests(browser) {
  console.log('Running mobile accessibility tests...');
  const mobileResults = [];

  for (const pageConfig of PAGES_TO_TEST) {
    const mobilePageConfig = {
      ...pageConfig,
      config: MOBILE_CONFIG,
      name: `${pageConfig.name} (Mobile)`
    };

    const result = await runPa11yTest(mobilePageConfig, browser);
    mobileResults.push(result);
  }

  return mobileResults;
}

/**
 * Run Pa11y tests for high contrast mode
 */
async function runHighContrastPa11yTests(browser) {
  console.log('Running high contrast accessibility tests...');
  const highContrastResults = [];

  // Test a subset of critical pages in high contrast mode
  const criticalPages = PAGES_TO_TEST.filter(page =>
    ['Homepage', 'Documentation Portal', 'Authentication'].includes(page.name)
  );

  for (const pageConfig of criticalPages) {
    const highContrastPageConfig = {
      ...pageConfig,
      config: HIGH_CONTRAST_CONFIG,
      name: `${pageConfig.name} (High Contrast)`,
      criticalRules: [...pageConfig.criticalRules, 'color-contrast-aa']
    };

    const result = await runPa11yTest(highContrastPageConfig, browser);
    highContrastResults.push(result);
  }

  return highContrastResults;
}

/**
 * Run Pa11y tests for reduced motion
 */
async function runReducedMotionPa11yTests(browser) {
  console.log('Running reduced motion accessibility tests...');
  const reducedMotionResults = [];

  // Test pages that typically have animations
  const animatedPages = PAGES_TO_TEST.filter(page =>
    ['Homepage', 'Documentation Portal'].includes(page.name)
  );

  for (const pageConfig of animatedPages) {
    const reducedMotionPageConfig = {
      ...pageConfig,
      config: REDUCED_MOTION_CONFIG,
      name: `${pageConfig.name} (Reduced Motion)`
    };

    const result = await runPa11yTest(reducedMotionPageConfig, browser);
    reducedMotionResults.push(result);
  }

  return reducedMotionResults;
}

/**
 * Analyze Pa11y results
 */
function analyzePa11yResults(results) {
  const analysis = {
    totalPages: results.length,
    passedPages: results.filter(r => r.passed).length,
    failedPages: results.filter(r => !r.passed).length,
    totalIssues: results.reduce((sum, r) => sum + (r.totalIssues || 0), 0),
    totalErrors: results.reduce((sum, r) => sum + (r.errors ? r.errors.length : 0), 0),
    totalWarnings: results.reduce((sum, r) => sum + (r.warnings ? r.warnings.length : 0), 0),
    commonIssues: {},
    criticalFailures: [],
    recommendations: []
  };

  // Analyze common issues across pages
  results.forEach(result => {
    if (result.issues) {
      result.issues.forEach(issue => {
        const key = issue.code || issue.message;
        if (!analysis.commonIssues[key]) {
          analysis.commonIssues[key] = {
            code: issue.code,
            message: issue.message,
            type: issue.type,
            count: 0,
            pages: []
          };
        }
        analysis.commonIssues[key].count++;
        if (!analysis.commonIssues[key].pages.includes(result.page)) {
          analysis.commonIssues[key].pages.push(result.page);
        }
      });
    }

    // Check for critical failures
    if (result.errors && result.errors.length > 0) {
      analysis.criticalFailures.push({
        page: result.page,
        errorCount: result.errors.length,
        errors: result.errors
      });
    }
  });

  // Generate recommendations
  if (analysis.failedPages > 0) {
    analysis.recommendations.push(`${analysis.failedPages} pages failed accessibility tests`);
  }

  if (analysis.totalErrors > 0) {
    analysis.recommendations.push(`${analysis.totalErrors} critical accessibility errors found`);
  }

  const topIssues = Object.values(analysis.commonIssues)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  topIssues.forEach(issue => {
    if (issue.count > 1) {
      analysis.recommendations.push(
        `"${issue.message}" appears on ${issue.count} pages - consider global fix`
      );
    }
  });

  if (analysis.recommendations.length === 0) {
    analysis.recommendations.push('All pages passed Pa11y accessibility tests!');
  }

  return analysis;
}

/**
 * Generate Pa11y report
 */
function generatePa11yReport(results, analysis) {
  let report = '\n';
  report += '╔══════════════════════════════════════════════════════════════════╗\n';
  report += '║                        PA11Y ACCESSIBILITY REPORT               ║\n';
  report += '╠══════════════════════════════════════════════════════════════════╣\n';
  report += `║  Pages Tested: ${analysis.totalPages.toString().padStart(5)}                                           ║\n`;
  report += `║  Pages Passed: ${analysis.passedPages.toString().padStart(5)} / ${analysis.totalPages}                                      ║\n`;
  report += `║  Total Issues: ${analysis.totalIssues.toString().padStart(5)}                                           ║\n`;
  report += `║  Critical Errors: ${analysis.totalErrors.toString().padStart(2)}                                         ║\n`;
  report += `║  Warnings: ${analysis.totalWarnings.toString().padStart(8)}                                           ║\n`;
  report += '║                                                                  ║\n';

  // Individual page results
  report += '║  📊 PAGE RESULTS                                                ║\n';
  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    const issueCount = result.totalIssues || 0;
    const pageStr = result.page.slice(0, 35).padEnd(35);
    const issueStr = `${issueCount} issues`.padStart(10);
    report += `║  ${status} ${pageStr} ${issueStr}                  ║\n`;
  });

  report += '║                                                                  ║\n';

  // Common issues
  report += '║  🔍 MOST COMMON ISSUES                                          ║\n';
  const topIssues = Object.values(analysis.commonIssues)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  if (topIssues.length === 0) {
    report += '║  🎉 No common accessibility issues found!                       ║\n';
  } else {
    topIssues.forEach(issue => {
      const message = issue.message.slice(0, 45);
      const count = `(${issue.count}x)`;
      report += `║  • ${message.padEnd(45)} ${count.padStart(6)}          ║\n`;
    });
  }

  report += '║                                                                  ║\n';

  // Recommendations
  report += '║  📋 RECOMMENDATIONS                                             ║\n';
  analysis.recommendations.slice(0, 4).forEach(rec => {
    const lines = rec.match(/.{1,62}/g) || [rec];
    lines.forEach((line, i) => {
      const prefix = i === 0 ? '• ' : '  ';
      report += `║  ${(prefix + line).padEnd(64)} ║\n`;
    });
  });

  report += '║                                                                  ║\n';
  report += '╚══════════════════════════════════════════════════════════════════╝\n';

  return report;
}

/**
 * Save Pa11y results to file
 */
async function savePa11yResults(results, analysis, filename = 'pa11y-accessibility-results.json') {
  const outputDir = path.join(__dirname, '../../results');
  await fs.mkdir(outputDir, { recursive: true });

  const outputData = {
    timestamp: new Date().toISOString(),
    analysis,
    results,
    summary: {
      totalPages: analysis.totalPages,
      passedPages: analysis.passedPages,
      totalIssues: analysis.totalIssues,
      passRate: (analysis.passedPages / analysis.totalPages) * 100
    }
  };

  const outputPath = path.join(outputDir, filename);
  await fs.writeFile(outputPath, JSON.stringify(outputData, null, 2));

  console.log(`Pa11y results saved to: ${outputPath}`);
  return outputPath;
}

module.exports = {
  PA11Y_CONFIG,
  MOBILE_CONFIG,
  HIGH_CONTRAST_CONFIG,
  REDUCED_MOTION_CONFIG,
  PAGES_TO_TEST,
  runPa11yTest,
  runMobilePa11yTests,
  runHighContrastPa11yTests,
  runReducedMotionPa11yTests,
  analyzePa11yResults,
  generatePa11yReport,
  savePa11yResults
};
