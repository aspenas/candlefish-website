/**
 * Lighthouse Accessibility Tests
 * Uses Lighthouse CI for automated accessibility auditing
 */

const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs').promises;
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

// Lighthouse configuration for accessibility testing
const LIGHTHOUSE_CONFIG = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['accessibility'],
    // Include additional accessibility audits
    onlyAudits: [
      // Core accessibility audits
      'accesskeys',
      'aria-allowed-attr',
      'aria-command-name',
      'aria-hidden-body',
      'aria-hidden-focus',
      'aria-input-field-name',
      'aria-label',
      'aria-labelledby',
      'aria-required-attr',
      'aria-required-children',
      'aria-required-parent',
      'aria-roles',
      'aria-toggle-field-name',
      'aria-tooltip-name',
      'aria-valid-attr-value',
      'aria-valid-attr',
      'button-name',
      'bypass',
      'color-contrast',
      'definition-list',
      'dlitem',
      'document-title',
      'duplicate-id-active',
      'duplicate-id-aria',
      'duplicate-id',
      'form-field-multiple-labels',
      'frame-title',
      'heading-order',
      'html-has-lang',
      'html-lang-valid',
      'html-xml-lang-mismatch',
      'image-alt',
      'input-button-name',
      'input-image-alt',
      'label',
      'landmark-one-main',
      'link-name',
      'list',
      'listitem',
      'meta-refresh',
      'meta-viewport',
      'nested-interactive',
      'no-autoplay-audio',
      'object-alt',
      'scrollable-region-focusable',
      'select-name',
      'skip-link',
      'tabindex',
      'table-duplicate-name',
      'table-fake-caption',
      'td-headers-attr',
      'th-has-data-cells',
      'valid-lang',
      'video-caption',
      'video-description',

      // Additional manual audits we want to check
      'focusable-controls',
      'interactive-element-affordance',
      'logical-tab-order',
      'managed-focus',
      'offscreen-content-hidden',
      'use-landmarks'
    ]
  },
  audits: [
    'accessibility/accesskeys',
    'accessibility/aria-allowed-attr',
    'accessibility/aria-command-name',
    'accessibility/aria-hidden-body',
    'accessibility/aria-hidden-focus',
    'accessibility/aria-input-field-name',
    'accessibility/aria-label',
    'accessibility/aria-labelledby',
    'accessibility/aria-required-attr',
    'accessibility/aria-required-children',
    'accessibility/aria-required-parent',
    'accessibility/aria-roles',
    'accessibility/aria-toggle-field-name',
    'accessibility/aria-tooltip-name',
    'accessibility/aria-valid-attr-value',
    'accessibility/aria-valid-attr',
    'accessibility/button-name',
    'accessibility/bypass',
    'accessibility/color-contrast',
    'accessibility/definition-list',
    'accessibility/dlitem',
    'accessibility/document-title',
    'accessibility/duplicate-id-active',
    'accessibility/duplicate-id-aria',
    'accessibility/duplicate-id',
    'accessibility/form-field-multiple-labels',
    'accessibility/frame-title',
    'accessibility/heading-order',
    'accessibility/html-has-lang',
    'accessibility/html-lang-valid',
    'accessibility/html-xml-lang-mismatch',
    'accessibility/image-alt',
    'accessibility/input-button-name',
    'accessibility/input-image-alt',
    'accessibility/label',
    'accessibility/landmark-one-main',
    'accessibility/link-name',
    'accessibility/list',
    'accessibility/listitem',
    'accessibility/meta-refresh',
    'accessibility/meta-viewport',
    'accessibility/nested-interactive',
    'accessibility/no-autoplay-audio',
    'accessibility/object-alt',
    'accessibility/scrollable-region-focusable',
    'accessibility/select-name',
    'accessibility/skip-link',
    'accessibility/tabindex',
    'accessibility/table-duplicate-name',
    'accessibility/table-fake-caption',
    'accessibility/td-headers-attr',
    'accessibility/th-has-data-cells',
    'accessibility/valid-lang',
    'accessibility/video-caption',
    'accessibility/video-description'
  ]
};

// Chrome launch options for accessibility testing
const CHROME_OPTIONS = {
  chromeFlags: [
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-extensions',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    // Accessibility testing specific flags
    '--force-prefers-reduced-motion',
    '--enable-experimental-accessibility-features',
    '--enable-experimental-web-platform-features'
  ]
};

// Critical pages to test for accessibility
const PAGES_TO_TEST = [
  {
    name: 'Homepage',
    url: '/',
    description: 'Main landing page accessibility',
    minScore: 95,
    criticalAudits: ['color-contrast', 'heading-order', 'landmark-one-main', 'bypass']
  },
  {
    name: 'Documentation Home',
    url: '/docs',
    description: 'Documentation portal accessibility',
    minScore: 95,
    criticalAudits: ['aria-valid-attr', 'button-name', 'link-name', 'form-field-multiple-labels']
  },
  {
    name: 'API Reference',
    url: '/docs/api',
    description: 'API documentation accessibility',
    minScore: 95,
    criticalAudits: ['table-duplicate-name', 'th-has-data-cells', 'td-headers-attr']
  },
  {
    name: 'Getting Started Guide',
    url: '/docs/getting-started',
    description: 'Getting started guide accessibility',
    minScore: 95,
    criticalAudits: ['heading-order', 'list', 'listitem', 'code-accessibility']
  },
  {
    name: 'Search Results',
    url: '/search?q=authentication',
    description: 'Search functionality accessibility',
    minScore: 95,
    criticalAudits: ['aria-live-regions', 'focus-management', 'keyboard-navigation']
  },
  {
    name: 'Partner Dashboard',
    url: '/partners',
    description: 'Partner portal accessibility',
    minScore: 95,
    criticalAudits: ['form-field-multiple-labels', 'input-button-name', 'aria-required-attr']
  },
  {
    name: 'Login Page',
    url: '/auth/login',
    description: 'Authentication page accessibility',
    minScore: 98,
    criticalAudits: ['label', 'form-field-multiple-labels', 'aria-required-attr', 'error-handling']
  }
];

/**
 * Run Lighthouse accessibility audit for a specific URL
 */
async function runAccessibilityAudit(chrome, url, config = {}) {
  const options = {
    logLevel: 'info',
    output: 'json',
    onlyCategories: ['accessibility'],
    port: chrome.port,
    ...config
  };

  try {
    const runnerResult = await lighthouse(url, options, LIGHTHOUSE_CONFIG);
    return runnerResult;
  } catch (error) {
    console.error(`Error running Lighthouse for ${url}:`, error);
    throw error;
  }
}

/**
 * Analyze accessibility audit results
 */
function analyzeAccessibilityResults(results, pageConfig) {
  const { lhr } = results;
  const accessibility = lhr.categories.accessibility;
  const audits = lhr.audits;

  const analysis = {
    url: lhr.finalUrl,
    score: Math.round(accessibility.score * 100),
    passed: Math.round(accessibility.score * 100) >= pageConfig.minScore,
    totalAudits: Object.keys(audits).length,
    passedAudits: 0,
    failedAudits: 0,
    criticalFailures: [],
    allFailures: [],
    manualChecks: [],
    recommendations: []
  };

  // Analyze each audit
  Object.entries(audits).forEach(([auditId, audit]) => {
    if (audit.score === 1) {
      analysis.passedAudits++;
    } else if (audit.score === 0) {
      analysis.failedAudits++;

      const failure = {
        id: auditId,
        title: audit.title,
        description: audit.description,
        impact: audit.details?.impact || 'unknown',
        elements: audit.details?.items || [],
        helpUrl: audit.helpUrl
      };

      analysis.allFailures.push(failure);

      // Check if this is a critical audit for this page
      if (pageConfig.criticalAudits && pageConfig.criticalAudits.includes(auditId)) {
        analysis.criticalFailures.push(failure);
      }
    } else if (audit.score === null) {
      analysis.manualChecks.push({
        id: auditId,
        title: audit.title,
        description: audit.description
      });
    }
  });

  // Generate recommendations based on failures
  if (analysis.score < 95) {
    analysis.recommendations.push('Overall accessibility score is below recommended threshold (95)');
  }

  if (analysis.criticalFailures.length > 0) {
    analysis.recommendations.push(`${analysis.criticalFailures.length} critical accessibility issues found for this page type`);
  }

  if (analysis.failedAudits > 5) {
    analysis.recommendations.push('High number of accessibility violations - consider comprehensive accessibility review');
  }

  return analysis;
}

/**
 * Generate accessibility report
 */
function generateAccessibilityReport(results) {
  const totalPages = results.length;
  const passedPages = results.filter(r => r.passed).length;
  const avgScore = results.reduce((sum, r) => sum + r.score, 0) / totalPages;

  let report = '\n';
  report += '╔══════════════════════════════════════════════════════════════════╗\n';
  report += '║                    ACCESSIBILITY AUDIT REPORT                   ║\n';
  report += '╠══════════════════════════════════════════════════════════════════╣\n';
  report += `║  Pages Tested: ${totalPages.toString().padStart(5)}                                           ║\n`;
  report += `║  Pages Passed: ${passedPages.toString().padStart(5)} / ${totalPages}                                      ║\n`;
  report += `║  Average Score: ${avgScore.toFixed(1).padStart(4)}%                                        ║\n`;
  report += '║                                                                  ║\n';
  report += '║  📊 INDIVIDUAL PAGE RESULTS                                     ║\n';

  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    const scoreStr = `${result.score}%`.padStart(4);
    const nameStr = result.url.padEnd(35);
    report += `║  ${status} ${nameStr} ${scoreStr}                     ║\n`;

    if (!result.passed && result.criticalFailures.length > 0) {
      report += `║     Critical Issues: ${result.criticalFailures.length.toString().padStart(2)}                                    ║\n`;
    }
  });

  report += '║                                                                  ║\n';
  report += '║  🔍 CRITICAL ISSUES SUMMARY                                     ║\n';

  const criticalIssues = {};
  results.forEach(result => {
    result.criticalFailures.forEach(failure => {
      if (!criticalIssues[failure.id]) {
        criticalIssues[failure.id] = {
          title: failure.title,
          pages: [],
          impact: failure.impact
        };
      }
      criticalIssues[failure.id].pages.push(result.url);
    });
  });

  Object.entries(criticalIssues).forEach(([issueId, issue]) => {
    report += `║  • ${issue.title.slice(0, 50).padEnd(50)}       ║\n`;
    report += `║    Pages affected: ${issue.pages.length.toString().padStart(2)}                                          ║\n`;
  });

  if (Object.keys(criticalIssues).length === 0) {
    report += '║  🎉 No critical accessibility issues found!                     ║\n';
  }

  report += '║                                                                  ║\n';
  report += '║  📋 RECOMMENDATIONS                                             ║\n';

  const allRecommendations = [...new Set(results.flatMap(r => r.recommendations))];
  if (allRecommendations.length === 0) {
    report += '║  ✨ All pages meet accessibility standards!                     ║\n';
  } else {
    allRecommendations.slice(0, 3).forEach(rec => {
      const lines = rec.match(/.{1,62}/g) || [rec];
      lines.forEach((line, i) => {
        const prefix = i === 0 ? '• ' : '  ';
        report += `║  ${(prefix + line).padEnd(64)} ║\n`;
      });
    });
  }

  report += '║                                                                  ║\n';
  report += '╚══════════════════════════════════════════════════════════════════╝\n';

  return report;
}

/**
 * Save detailed results to JSON file
 */
async function saveDetailedResults(results, filename = 'accessibility-audit-results.json') {
  const outputDir = path.join(__dirname, '../../results');
  await fs.mkdir(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, filename);
  await fs.writeFile(outputPath, JSON.stringify(results, null, 2));

  console.log(`Detailed accessibility results saved to: ${outputPath}`);
}

/**
 * Main test suite
 */
describe('Lighthouse Accessibility Tests', () => {
  let chrome;

  beforeAll(async () => {
    // Launch Chrome for testing
    chrome = await chromeLauncher.launch(CHROME_OPTIONS);
    console.log(`Chrome launched on port ${chrome.port}`);
  }, 30000);

  afterAll(async () => {
    if (chrome) {
      await chrome.kill();
    }
  });

  describe('Page-by-Page Accessibility Audits', () => {
    const results = [];

    PAGES_TO_TEST.forEach(pageConfig => {
      test(`${pageConfig.name} should meet accessibility standards`, async () => {
        const fullUrl = `${BASE_URL}${pageConfig.url}`;
        console.log(`Testing accessibility for: ${fullUrl}`);

        const auditResults = await runAccessibilityAudit(chrome, fullUrl);
        const analysis = analyzeAccessibilityResults(auditResults, pageConfig);

        results.push({
          ...analysis,
          pageConfig,
          timestamp: new Date().toISOString()
        });

        // Log results for this page
        console.log(`${pageConfig.name}: ${analysis.score}% (${analysis.passed ? 'PASSED' : 'FAILED'})`);

        if (analysis.criticalFailures.length > 0) {
          console.log(`Critical failures for ${pageConfig.name}:`);
          analysis.criticalFailures.forEach(failure => {
            console.log(`  - ${failure.title}: ${failure.description}`);
          });
        }

        // Assertions
        expect(analysis.score).toBeGreaterThanOrEqual(pageConfig.minScore);
        expect(analysis.criticalFailures).toHaveLength(0);

        // Store results for final report
        if (!global.accessibilityResults) {
          global.accessibilityResults = [];
        }
        global.accessibilityResults.push(analysis);
      }, 60000); // 60 second timeout per page
    });

    afterAll(async () => {
      if (global.accessibilityResults && global.accessibilityResults.length > 0) {
        // Generate and display final report
        const report = generateAccessibilityReport(global.accessibilityResults);
        console.log(report);

        // Save detailed results
        await saveDetailedResults(global.accessibilityResults);

        // Check overall pass rate
        const totalPages = global.accessibilityResults.length;
        const passedPages = global.accessibilityResults.filter(r => r.passed).length;
        const passRate = (passedPages / totalPages) * 100;

        if (passRate < 100) {
          console.warn(`⚠️  Overall accessibility pass rate: ${passRate.toFixed(1)}%`);
        } else {
          console.log(`✅ All pages passed accessibility tests!`);
        }
      }
    });
  });

  describe('Specific Accessibility Features', () => {
    test('should have proper color contrast across all pages', async () => {
      const colorContrastResults = [];

      for (const pageConfig of PAGES_TO_TEST) {
        const fullUrl = `${BASE_URL}${pageConfig.url}`;
        const auditResults = await runAccessibilityAudit(chrome, fullUrl, {
          onlyAudits: ['color-contrast']
        });

        const colorContrastAudit = auditResults.lhr.audits['color-contrast'];
        colorContrastResults.push({
          page: pageConfig.name,
          url: fullUrl,
          passed: colorContrastAudit.score === 1,
          issues: colorContrastAudit.details?.items || []
        });
      }

      const failedPages = colorContrastResults.filter(result => !result.passed);

      if (failedPages.length > 0) {
        console.log('Color contrast failures:');
        failedPages.forEach(page => {
          console.log(`  ${page.page}: ${page.issues.length} issues`);
        });
      }

      expect(failedPages).toHaveLength(0);
    });

    test('should have proper keyboard navigation', async () => {
      const keyboardResults = [];

      for (const pageConfig of PAGES_TO_TEST) {
        const fullUrl = `${BASE_URL}${pageConfig.url}`;
        const auditResults = await runAccessibilityAudit(chrome, fullUrl, {
          onlyAudits: ['tabindex', 'focusable-controls', 'interactive-element-affordance']
        });

        const tabindexAudit = auditResults.lhr.audits['tabindex'];
        const focusableAudit = auditResults.lhr.audits['focusable-controls'];

        keyboardResults.push({
          page: pageConfig.name,
          url: fullUrl,
          tabindexPassed: tabindexAudit?.score === 1,
          focusablePassed: focusableAudit?.score !== 0, // null or 1 is okay
          issues: [
            ...(tabindexAudit?.details?.items || []),
            ...(focusableAudit?.details?.items || [])
          ]
        });
      }

      const failedPages = keyboardResults.filter(result =>
        !result.tabindexPassed || !result.focusablePassed
      );

      expect(failedPages).toHaveLength(0);
    });

    test('should have proper ARIA usage', async () => {
      const ariaAudits = [
        'aria-allowed-attr',
        'aria-hidden-focus',
        'aria-input-field-name',
        'aria-label',
        'aria-required-attr',
        'aria-roles',
        'aria-valid-attr-value',
        'aria-valid-attr'
      ];

      const ariaResults = [];

      for (const pageConfig of PAGES_TO_TEST) {
        const fullUrl = `${BASE_URL}${pageConfig.url}`;
        const auditResults = await runAccessibilityAudit(chrome, fullUrl, {
          onlyAudits: ariaAudits
        });

        const failedAudits = ariaAudits.filter(audit =>
          auditResults.lhr.audits[audit]?.score === 0
        );

        ariaResults.push({
          page: pageConfig.name,
          url: fullUrl,
          passed: failedAudits.length === 0,
          failedAudits: failedAudits.map(audit => ({
            id: audit,
            title: auditResults.lhr.audits[audit].title,
            issues: auditResults.lhr.audits[audit].details?.items || []
          }))
        });
      }

      const failedPages = ariaResults.filter(result => !result.passed);

      if (failedPages.length > 0) {
        console.log('ARIA usage failures:');
        failedPages.forEach(page => {
          console.log(`  ${page.page}:`);
          page.failedAudits.forEach(audit => {
            console.log(`    - ${audit.title}: ${audit.issues.length} issues`);
          });
        });
      }

      expect(failedPages).toHaveLength(0);
    });
  });

  describe('Mobile Accessibility', () => {
    test('should be accessible on mobile viewports', async () => {
      const mobileResults = [];

      for (const pageConfig of PAGES_TO_TEST) {
        const fullUrl = `${BASE_URL}${pageConfig.url}`;
        const auditResults = await runAccessibilityAudit(chrome, fullUrl, {
          emulatedFormFactor: 'mobile',
          screenEmulation: {
            mobile: true,
            width: 375,
            height: 667,
            deviceScaleFactor: 2
          }
        });

        const analysis = analyzeAccessibilityResults(auditResults, pageConfig);
        mobileResults.push({
          ...analysis,
          page: pageConfig.name
        });
      }

      const failedPages = mobileResults.filter(result => !result.passed);

      if (failedPages.length > 0) {
        console.log('Mobile accessibility failures:');
        failedPages.forEach(page => {
          console.log(`  ${page.page}: ${page.score}% (${page.failedAudits} issues)`);
        });
      }

      expect(failedPages).toHaveLength(0);
    });
  });
});
