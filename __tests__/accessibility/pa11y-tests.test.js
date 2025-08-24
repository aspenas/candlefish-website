/**
 * Pa11y Accessibility Tests
 * Comprehensive WCAG 2.1 AA compliance testing using Pa11y
 */

const puppeteer = require('puppeteer');
const {
  PA11Y_CONFIG,
  PAGES_TO_TEST,
  runPa11yTest,
  runMobilePa11yTests,
  runHighContrastPa11yTests,
  runReducedMotionPa11yTests,
  analyzePa11yResults,
  generatePa11yReport,
  savePa11yResults
} = require('./utils/pa11y-config');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

describe('Pa11y Accessibility Tests', () => {
  let browser;
  const allResults = [];

  beforeAll(async () => {
    // Launch browser for Pa11y testing
    browser = await puppeteer.launch(PA11Y_CONFIG.chromeLaunchConfig);
    console.log('Browser launched for Pa11y testing');
  }, 30000);

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }

    // Generate comprehensive report if we have results
    if (allResults.length > 0) {
      const analysis = analyzePa11yResults(allResults);
      const report = generatePa11yReport(allResults, analysis);
      console.log(report);

      // Save detailed results
      await savePa11yResults(allResults, analysis);

      // Final assertions
      const failedPages = allResults.filter(r => !r.passed);
      const totalErrors = allResults.reduce((sum, r) => sum + (r.errors ? r.errors.length : 0), 0);

      if (failedPages.length > 0) {
        console.warn(`⚠️  ${failedPages.length} pages failed Pa11y accessibility tests`);
      }

      if (totalErrors > 0) {
        console.error(`❌ ${totalErrors} critical accessibility errors found`);
      }
    }
  });

  describe('Desktop Accessibility Tests', () => {
    PAGES_TO_TEST.forEach(pageConfig => {
      test(`${pageConfig.name} should pass Pa11y accessibility audit`, async () => {
        const result = await runPa11yTest(pageConfig, browser);
        allResults.push(result);

        // Log results
        console.log(`${pageConfig.name}: ${result.totalIssues || 0} issues (${result.passed ? 'PASSED' : 'FAILED'})`);

        if (result.error) {
          console.error(`Error testing ${pageConfig.name}:`, result.error);
          throw new Error(result.error);
        }

        if (result.errors && result.errors.length > 0) {
          console.log(`Critical errors for ${pageConfig.name}:`);
          result.errors.forEach(error => {
            console.log(`  - ${error.message} (${error.code})`);
            console.log(`    Element: ${error.selector || 'N/A'}`);
            console.log(`    Context: ${error.context || 'N/A'}`);
          });
        }

        if (result.warnings && result.warnings.length > 5) {
          console.log(`${result.warnings.length} warnings found for ${pageConfig.name}`);
        }

        // Assertions
        expect(result.passed).toBe(true);
        expect(result.errors || []).toHaveLength(0);
        expect(result.totalIssues || 0).toBeLessThanOrEqual(pageConfig.expectedIssues);

      }, 60000); // 60 second timeout per page
    });
  });

  describe('Mobile Accessibility Tests', () => {
    test('should pass mobile accessibility audits', async () => {
      const mobileResults = await runMobilePa11yTests(browser);
      allResults.push(...mobileResults);

      // Log mobile results
      console.log('\nMobile Accessibility Results:');
      mobileResults.forEach(result => {
        console.log(`  ${result.page}: ${result.totalIssues || 0} issues (${result.passed ? 'PASSED' : 'FAILED'})`);
      });

      const failedMobilePages = mobileResults.filter(result => !result.passed);
      const mobileCriticalErrors = mobileResults.reduce((sum, r) => sum + (r.errors ? r.errors.length : 0), 0);

      if (failedMobilePages.length > 0) {
        console.log('Failed mobile pages:');
        failedMobilePages.forEach(page => {
          console.log(`  - ${page.page}: ${page.errors ? page.errors.length : 0} errors`);
        });
      }

      expect(failedMobilePages).toHaveLength(0);
      expect(mobileCriticalErrors).toBe(0);
    }, 120000); // 2 minute timeout for all mobile tests
  });

  describe('High Contrast Mode Tests', () => {
    test('should pass high contrast accessibility audits', async () => {
      const highContrastResults = await runHighContrastPa11yTests(browser);
      allResults.push(...highContrastResults);

      // Log high contrast results
      console.log('\nHigh Contrast Mode Results:');
      highContrastResults.forEach(result => {
        console.log(`  ${result.page}: ${result.totalIssues || 0} issues (${result.passed ? 'PASSED' : 'FAILED'})`);
      });

      const failedHighContrastPages = highContrastResults.filter(result => !result.passed);

      if (failedHighContrastPages.length > 0) {
        console.log('Failed high contrast pages:');
        failedHighContrastPages.forEach(page => {
          console.log(`  - ${page.page}: ${page.errors ? page.errors.length : 0} errors`);
          if (page.errors) {
            page.errors.forEach(error => {
              if (error.code && error.code.includes('color-contrast')) {
                console.log(`    Color contrast issue: ${error.message}`);
              }
            });
          }
        });
      }

      // High contrast mode should have zero failures for color contrast
      expect(failedHighContrastPages).toHaveLength(0);
    }, 90000); // 90 second timeout
  });

  describe('Reduced Motion Tests', () => {
    test('should pass reduced motion accessibility audits', async () => {
      const reducedMotionResults = await runReducedMotionPa11yTests(browser);
      allResults.push(...reducedMotionResults);

      // Log reduced motion results
      console.log('\nReduced Motion Results:');
      reducedMotionResults.forEach(result => {
        console.log(`  ${result.page}: ${result.totalIssues || 0} issues (${result.passed ? 'PASSED' : 'FAILED'})`);
      });

      const failedReducedMotionPages = reducedMotionResults.filter(result => !result.passed);

      expect(failedReducedMotionPages).toHaveLength(0);
    }, 60000); // 60 second timeout
  });

  describe('Specific Accessibility Features', () => {
    test('should have proper form accessibility', async () => {
      const formPages = PAGES_TO_TEST.filter(page =>
        page.criticalRules.includes('form-labels') ||
        page.criticalRules.includes('form-validation') ||
        page.criticalRules.includes('required-fields')
      );

      const formResults = [];

      for (const pageConfig of formPages) {
        const config = {
          ...pageConfig.config,
          includeNotices: true, // Include form-specific notices
          includeWarnings: true
        };

        const result = await runPa11yTest({...pageConfig, config}, browser);
        formResults.push(result);
      }

      // Check for form-specific issues
      const formIssues = formResults.flatMap(result =>
        (result.issues || []).filter(issue =>
          issue.code && (
            issue.code.includes('label') ||
            issue.code.includes('form') ||
            issue.code.includes('input') ||
            issue.code.includes('required')
          )
        )
      );

      if (formIssues.length > 0) {
        console.log('Form accessibility issues found:');
        formIssues.forEach(issue => {
          console.log(`  - ${issue.message} (${issue.code})`);
        });
      }

      expect(formIssues.filter(issue => issue.type === 'error')).toHaveLength(0);
    }, 90000);

    test('should have proper heading structure', async () => {
      const headingResults = [];

      for (const pageConfig of PAGES_TO_TEST) {
        const result = await runPa11yTest(pageConfig, browser);
        headingResults.push(result);
      }

      // Check for heading structure issues
      const headingIssues = headingResults.flatMap(result =>
        (result.issues || []).filter(issue =>
          issue.code && issue.code.includes('heading')
        )
      );

      if (headingIssues.length > 0) {
        console.log('Heading structure issues found:');
        headingIssues.forEach(issue => {
          console.log(`  - ${issue.message} (${issue.code})`);
        });
      }

      expect(headingIssues.filter(issue => issue.type === 'error')).toHaveLength(0);
    }, 90000);

    test('should have proper landmark usage', async () => {
      const landmarkResults = [];

      for (const pageConfig of PAGES_TO_TEST) {
        const result = await runPa11yTest(pageConfig, browser);
        landmarkResults.push(result);
      }

      // Check for landmark issues
      const landmarkIssues = landmarkResults.flatMap(result =>
        (result.issues || []).filter(issue =>
          issue.code && (
            issue.code.includes('landmark') ||
            issue.code.includes('main') ||
            issue.code.includes('navigation') ||
            issue.code.includes('banner') ||
            issue.code.includes('contentinfo')
          )
        )
      );

      if (landmarkIssues.length > 0) {
        console.log('Landmark issues found:');
        landmarkIssues.forEach(issue => {
          console.log(`  - ${issue.message} (${issue.code})`);
        });
      }

      expect(landmarkIssues.filter(issue => issue.type === 'error')).toHaveLength(0);
    }, 90000);

    test('should have proper color contrast', async () => {
      const contrastResults = [];

      for (const pageConfig of PAGES_TO_TEST) {
        // Use enhanced color contrast testing
        const enhancedConfig = {
          ...pageConfig.config,
          rules: {
            ...pageConfig.config.rules,
            'color-contrast-aa': true,
            'color-contrast-enhanced': true
          }
        };

        const result = await runPa11yTest({...pageConfig, config: enhancedConfig}, browser);
        contrastResults.push(result);
      }

      // Check for color contrast issues
      const contrastIssues = contrastResults.flatMap(result =>
        (result.issues || []).filter(issue =>
          issue.code && issue.code.includes('color-contrast')
        )
      );

      if (contrastIssues.length > 0) {
        console.log('Color contrast issues found:');
        contrastIssues.forEach(issue => {
          console.log(`  - ${issue.message} (${issue.code})`);
          console.log(`    Element: ${issue.selector || 'N/A'}`);
        });
      }

      // Color contrast errors are critical
      expect(contrastIssues.filter(issue => issue.type === 'error')).toHaveLength(0);
    }, 120000);

    test('should have proper keyboard navigation support', async () => {
      const keyboardResults = [];

      for (const pageConfig of PAGES_TO_TEST) {
        // Add keyboard-specific actions
        const keyboardConfig = {
          ...pageConfig.config,
          actions: [
            ...pageConfig.config.actions,
            // Test tab navigation
            'press tab',
            'wait for 500ms',
            'press tab',
            'wait for 500ms'
          ]
        };

        const result = await runPa11yTest({...pageConfig, config: keyboardConfig}, browser);
        keyboardResults.push(result);
      }

      // Check for keyboard navigation issues
      const keyboardIssues = keyboardResults.flatMap(result =>
        (result.issues || []).filter(issue =>
          issue.code && (
            issue.code.includes('keyboard') ||
            issue.code.includes('focus') ||
            issue.code.includes('tab') ||
            issue.code.includes('skip')
          )
        )
      );

      if (keyboardIssues.length > 0) {
        console.log('Keyboard navigation issues found:');
        keyboardIssues.forEach(issue => {
          console.log(`  - ${issue.message} (${issue.code})`);
        });
      }

      expect(keyboardIssues.filter(issue => issue.type === 'error')).toHaveLength(0);
    }, 120000);
  });

  describe('Accessibility Regression Tests', () => {
    test('should not introduce new accessibility issues', async () => {
      // This test would compare against a baseline
      // For now, we'll just ensure critical pages have zero errors
      const criticalPages = ['Homepage', 'Authentication', 'Documentation Portal'];
      const regressionResults = [];

      for (const pageConfig of PAGES_TO_TEST.filter(p => criticalPages.includes(p.name))) {
        const result = await runPa11yTest(pageConfig, browser);
        regressionResults.push(result);
      }

      const totalErrors = regressionResults.reduce((sum, r) => sum + (r.errors ? r.errors.length : 0), 0);
      const totalCriticalIssues = regressionResults.reduce((sum, r) => sum + (r.totalIssues || 0), 0);

      // Critical pages should have zero errors and minimal issues
      expect(totalErrors).toBe(0);
      expect(totalCriticalIssues).toBeLessThanOrEqual(5); // Allow for minor warnings

      console.log(`Regression test: ${totalErrors} errors, ${totalCriticalIssues} total issues across critical pages`);
    }, 90000);
  });
});
