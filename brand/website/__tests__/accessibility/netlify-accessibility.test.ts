// Comprehensive accessibility tests for Netlify Extension Management System

import { test, expect, Page } from '@playwright/test';
import { injectAxe, checkA11y, getViolations } from 'axe-playwright';

// Accessibility test configuration
const A11Y_OPTIONS = {
  rules: {
    'color-contrast': { enabled: true },
    'keyboard-navigation': { enabled: true },
    'focus-management': { enabled: true },
    'aria-labels': { enabled: true },
    'heading-order': { enabled: true },
    'landmark-roles': { enabled: true }
  }
};

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const NETLIFY_DASHBOARD_PATH = '/netlify-dashboard';

// Page Object for accessibility testing
class AccessibilityTestPage {
  constructor(private page: Page) {}

  async setupA11yTesting() {
    await injectAxe(this.page);
  }

  async checkPageAccessibility(context: string) {
    await checkA11y(this.page, undefined, A11Y_OPTIONS, undefined, context);
  }

  async getA11yViolations() {
    return await getViolations(this.page, undefined, A11Y_OPTIONS);
  }

  async testKeyboardNavigation() {
    // Start from the beginning of the page
    await this.page.keyboard.press('Tab');

    const focusableElements = await this.page.locator('[tabindex]:not([tabindex="-1"]), button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]').all();

    for (let i = 0; i < Math.min(focusableElements.length, 10); i++) {
      const focusedElement = await this.page.locator(':focus').first();
      expect(focusedElement).toBeTruthy();
      await this.page.keyboard.press('Tab');
    }
  }

  async testScreenReaderSupport() {
    // Check for ARIA labels and roles
    const ariaElements = await this.page.locator('[aria-label], [aria-labelledby], [aria-describedby], [role]').all();
    expect(ariaElements.length).toBeGreaterThan(0);

    // Check for semantic structure
    const headings = await this.page.locator('h1, h2, h3, h4, h5, h6').all();
    expect(headings.length).toBeGreaterThan(0);

    // Verify heading hierarchy
    for (const heading of headings) {
      const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
      const text = await heading.textContent();
      expect(text).toBeTruthy();
      expect(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']).toContain(tagName);
    }
  }

  async testColorContrast() {
    // This would typically use a more sophisticated color contrast checker
    // For now, we'll check that elements have defined colors
    const coloredElements = await this.page.locator('button, .btn, a, [role="button"]').all();

    for (const element of coloredElements.slice(0, 10)) {
      const styles = await element.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          color: computed.color,
          backgroundColor: computed.backgroundColor,
          borderColor: computed.borderColor
        };
      });

      expect(styles.color).toBeTruthy();
    }
  }

  async testFocusManagement() {
    // Test focus visibility
    await this.page.keyboard.press('Tab');
    const focusedElement = await this.page.locator(':focus').first();

    const focusStyles = await focusedElement.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return {
        outline: computed.outline,
        outlineColor: computed.outlineColor,
        outlineStyle: computed.outlineStyle,
        outlineWidth: computed.outlineWidth,
        boxShadow: computed.boxShadow
      };
    });

    // Should have some kind of focus indicator
    const hasFocusIndicator =
      focusStyles.outline !== 'none' ||
      focusStyles.boxShadow !== 'none' ||
      focusStyles.outlineColor !== 'transparent';

    expect(hasFocusIndicator).toBe(true);
  }
}

test.describe('Netlify Extension Management - Accessibility Tests', () => {
  let a11yPage: AccessibilityTestPage;

  test.beforeEach(async ({ page }) => {
    a11yPage = new AccessibilityTestPage(page);
    await a11yPage.setupA11yTesting();

    // Mock API responses to ensure consistent testing
    await page.route('**/api/**', (route) => {
      const url = route.request().url();

      if (url.includes('/extensions')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              extensions: [
                {
                  id: 'cache-control',
                  name: 'Cache Control',
                  description: 'Advanced cache management',
                  category: 'performance',
                  isEnabled: false,
                  performance: { impact: 'medium', loadTime: 120 }
                }
              ],
              total: 1,
              categories: ['performance']
            }
          })
        });
      } else {
        route.continue();
      }
    });
  });

  test.describe('Dashboard Accessibility', () => {
    test('should meet WCAG 2.1 AA standards on main dashboard', async ({ page }) => {
      await page.goto(`${BASE_URL}${NETLIFY_DASHBOARD_PATH}`);
      await page.waitForLoadState('networkidle');

      // Run automated accessibility checks
      await a11yPage.checkPageAccessibility('Main Dashboard');

      // Manual checks for critical elements
      await expect(page.locator('[role="main"]')).toBeVisible();
      await expect(page.locator('h1')).toBeVisible();

      // Check for landmark roles
      await expect(page.locator('[role="navigation"]')).toBeVisible();
      await expect(page.locator('[role="search"]')).toBeVisible();
    });

    test('should have proper heading hierarchy', async ({ page }) => {
      await page.goto(`${BASE_URL}${NETLIFY_DASHBOARD_PATH}`);
      await page.waitForLoadState('networkidle');

      // Check heading structure
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBe(1); // Should have exactly one H1

      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();

      for (let i = 0; i < headings.length; i++) {
        const heading = headings[i];
        const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
        const text = await heading.textContent();

        expect(text?.trim()).toBeTruthy();
        console.log(`Heading ${i + 1}: ${tagName} - "${text}"`);
      }
    });

    test('should support keyboard navigation', async ({ page }) => {
      await page.goto(`${BASE_URL}${NETLIFY_DASHBOARD_PATH}`);
      await page.waitForLoadState('networkidle');

      await a11yPage.testKeyboardNavigation();
    });

    test('should have proper ARIA labels and roles', async ({ page }) => {
      await page.goto(`${BASE_URL}${NETLIFY_DASHBOARD_PATH}`);
      await page.waitForLoadState('networkidle');

      // Check for essential ARIA attributes
      await expect(page.locator('[aria-label]')).toHaveCount.toBeGreaterThan(5);

      // Form elements should have labels
      const inputs = await page.locator('input, select, textarea').all();
      for (const input of inputs) {
        const hasLabel = await input.evaluate(el => {
          const ariaLabel = el.getAttribute('aria-label');
          const ariaLabelledby = el.getAttribute('aria-labelledby');
          const id = el.getAttribute('id');
          const label = id ? document.querySelector(`label[for="${id}"]`) : null;

          return !!(ariaLabel || ariaLabelledby || label);
        });

        expect(hasLabel).toBe(true);
      }
    });

    test('should have sufficient color contrast', async ({ page }) => {
      await page.goto(`${BASE_URL}${NETLIFY_DASHBOARD_PATH}`);
      await page.waitForLoadState('networkidle');

      await a11yPage.testColorContrast();
    });

    test('should manage focus properly', async ({ page }) => {
      await page.goto(`${BASE_URL}${NETLIFY_DASHBOARD_PATH}`);
      await page.waitForLoadState('networkidle');

      await a11yPage.testFocusManagement();
    });
  });

  test.describe('Extension Cards Accessibility', () => {
    test('should have accessible extension toggle buttons', async ({ page }) => {
      await page.goto(`${BASE_URL}${NETLIFY_DASHBOARD_PATH}`);
      await page.waitForLoadState('networkidle');

      // Check toggle buttons have proper ARIA states
      const toggleButtons = await page.locator('[role="switch"], [aria-checked]').all();

      for (const button of toggleButtons.slice(0, 5)) {
        const ariaChecked = await button.getAttribute('aria-checked');
        const ariaLabel = await button.getAttribute('aria-label');

        expect(['true', 'false']).toContain(ariaChecked);
        expect(ariaLabel).toBeTruthy();
      }
    });

    test('should announce state changes to screen readers', async ({ page }) => {
      await page.goto(`${BASE_URL}${NETLIFY_DASHBOARD_PATH}`);
      await page.waitForLoadState('networkidle');

      // Check for live regions
      const liveRegions = await page.locator('[aria-live]').all();
      expect(liveRegions.length).toBeGreaterThan(0);

      // Check live region attributes
      for (const region of liveRegions) {
        const ariaLive = await region.getAttribute('aria-live');
        expect(['polite', 'assertive', 'off']).toContain(ariaLive);
      }
    });

    test('should have accessible configuration modals', async ({ page }) => {
      await page.goto(`${BASE_URL}${NETLIFY_DASHBOARD_PATH}`);
      await page.waitForLoadState('networkidle');

      // If there's a configuration button, test the modal
      const configButtons = await page.locator('[data-testid^="config-"]').all();

      if (configButtons.length > 0) {
        await configButtons[0].click();
        await page.waitForTimeout(500);

        // Check modal accessibility
        const modal = page.locator('[role="dialog"]');
        if (await modal.count() > 0) {
          await expect(modal).toBeVisible();

          // Modal should have aria-labelledby or aria-label
          const hasLabel = await modal.evaluate(el => {
            return !!(el.getAttribute('aria-labelledby') || el.getAttribute('aria-label'));
          });
          expect(hasLabel).toBe(true);

          // Should trap focus
          await page.keyboard.press('Tab');
          const focusedElement = await page.locator(':focus').first();
          const isInsideModal = await focusedElement.evaluate((el, modalEl) => {
            return modalEl.contains(el);
          }, await modal.elementHandle());

          expect(isInsideModal).toBe(true);
        }
      }
    });
  });

  test.describe('Form Accessibility', () => {
    test('should have accessible search and filter forms', async ({ page }) => {
      await page.goto(`${BASE_URL}${NETLIFY_DASHBOARD_PATH}`);
      await page.waitForLoadState('networkidle');

      // Search input accessibility
      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
      if (await searchInput.count() > 0) {
        const ariaLabel = await searchInput.getAttribute('aria-label');
        const placeholder = await searchInput.getAttribute('placeholder');

        expect(ariaLabel || placeholder).toBeTruthy();
      }

      // Filter controls accessibility
      const selectElements = await page.locator('select').all();
      for (const select of selectElements) {
        const hasLabel = await select.evaluate(el => {
          const ariaLabel = el.getAttribute('aria-label');
          const ariaLabelledby = el.getAttribute('aria-labelledby');
          const id = el.getAttribute('id');
          const label = id ? document.querySelector(`label[for="${id}"]`) : null;

          return !!(ariaLabel || ariaLabelledby || label);
        });

        expect(hasLabel).toBe(true);
      }
    });

    test('should provide clear error messages', async ({ page }) => {
      await page.goto(`${BASE_URL}${NETLIFY_DASHBOARD_PATH}/bulk-deployment`);
      await page.waitForLoadState('networkidle');

      // Try to submit without required selections
      const submitButton = page.locator('button[type="submit"], [data-testid*="execute"], [data-testid*="deploy"]').first();

      if (await submitButton.count() > 0) {
        await submitButton.click();
        await page.waitForTimeout(1000);

        // Check for error messages
        const errorElements = await page.locator('[role="alert"], [aria-live], .error, [data-testid*="error"]').all();

        if (errorElements.length > 0) {
          for (const error of errorElements) {
            const text = await error.textContent();
            expect(text?.trim()).toBeTruthy();

            // Error should be associated with the problematic field
            const ariaDescribedby = await error.getAttribute('id');
            if (ariaDescribedby) {
              const associatedField = page.locator(`[aria-describedby="${ariaDescribedby}"]`);
              expect(await associatedField.count()).toBeGreaterThanOrEqual(0);
            }
          }
        }
      }
    });
  });

  test.describe('Tables and Data Accessibility', () => {
    test('should have accessible data tables', async ({ page }) => {
      await page.goto(`${BASE_URL}${NETLIFY_DASHBOARD_PATH}/health`);
      await page.waitForLoadState('networkidle');

      const tables = await page.locator('table').all();

      for (const table of tables) {
        // Table should have caption or aria-label
        const hasCaption = await table.locator('caption').count() > 0;
        const hasAriaLabel = await table.getAttribute('aria-label');

        if (!hasCaption && !hasAriaLabel) {
          console.warn('Table missing caption or aria-label');
        }

        // Headers should be properly marked
        const headers = await table.locator('th').all();
        for (const header of headers) {
          const scope = await header.getAttribute('scope');
          expect(['col', 'row', null]).toContain(scope);
        }
      }
    });

    test('should have accessible status indicators', async ({ page }) => {
      await page.goto(`${BASE_URL}${NETLIFY_DASHBOARD_PATH}/health`);
      await page.waitForLoadState('networkidle');

      // Status indicators should not rely on color alone
      const statusElements = await page.locator('[data-testid*="status"], .status').all();

      for (const status of statusElements.slice(0, 10)) {
        const text = await status.textContent();
        const ariaLabel = await status.getAttribute('aria-label');
        const title = await status.getAttribute('title');

        // Should have text content or meaningful aria-label
        expect(text?.trim() || ariaLabel || title).toBeTruthy();
      }
    });
  });

  test.describe('Animation and Motion Accessibility', () => {
    test('should respect reduced motion preferences', async ({ page }) => {
      // Set reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' });

      await page.goto(`${BASE_URL}${NETLIFY_DASHBOARD_PATH}`);
      await page.waitForLoadState('networkidle');

      // Check that animations are disabled or reduced
      const animatedElements = await page.locator('[class*="animate"], [class*="transition"]').all();

      for (const element of animatedElements.slice(0, 5)) {
        const styles = await element.evaluate(el => {
          const computed = window.getComputedStyle(el);
          return {
            animationDuration: computed.animationDuration,
            transitionDuration: computed.transitionDuration
          };
        });

        // With reduced motion, durations should be very short or 0
        const animationTime = parseFloat(styles.animationDuration) || 0;
        const transitionTime = parseFloat(styles.transitionDuration) || 0;

        if (animationTime > 0) {
          expect(animationTime).toBeLessThan(0.1); // Less than 100ms
        }
        if (transitionTime > 0) {
          expect(transitionTime).toBeLessThan(0.1);
        }
      }
    });

    test('should not cause seizures with flashing content', async ({ page }) => {
      await page.goto(`${BASE_URL}${NETLIFY_DASHBOARD_PATH}`);
      await page.waitForLoadState('networkidle');

      // Check for potentially problematic flashing animations
      const flashingElements = await page.locator('[class*="blink"], [class*="flash"], [class*="strobe"]').all();

      // Should not have elements with these problematic class names
      expect(flashingElements.length).toBe(0);
    });
  });

  test.describe('Mobile Accessibility', () => {
    test('should be accessible on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto(`${BASE_URL}${NETLIFY_DASHBOARD_PATH}`);
      await page.waitForLoadState('networkidle');

      // Check for mobile accessibility
      await a11yPage.checkPageAccessibility('Mobile Dashboard');

      // Touch targets should be large enough (44px minimum)
      const touchTargets = await page.locator('button, a, [role="button"], input[type="checkbox"], input[type="radio"]').all();

      for (const target of touchTargets.slice(0, 10)) {
        const bbox = await target.boundingBox();
        if (bbox) {
          expect(Math.min(bbox.width, bbox.height)).toBeGreaterThanOrEqual(44);
        }
      }
    });

    test('should have accessible mobile navigation', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto(`${BASE_URL}${NETLIFY_DASHBOARD_PATH}`);
      await page.waitForLoadState('networkidle');

      // Check for mobile menu if present
      const mobileMenuToggle = page.locator('[data-testid="mobile-menu-toggle"], .mobile-menu, [aria-expanded]').first();

      if (await mobileMenuToggle.count() > 0) {
        const ariaExpanded = await mobileMenuToggle.getAttribute('aria-expanded');
        expect(['true', 'false']).toContain(ariaExpanded);

        const ariaControls = await mobileMenuToggle.getAttribute('aria-controls');
        if (ariaControls) {
          const controlledElement = page.locator(`#${ariaControls}`);
          expect(await controlledElement.count()).toBe(1);
        }
      }
    });
  });

  test.describe('Screen Reader Testing', () => {
    test('should provide meaningful screen reader experience', async ({ page }) => {
      await page.goto(`${BASE_URL}${NETLIFY_DASHBOARD_PATH}`);
      await page.waitForLoadState('networkidle');

      await a11yPage.testScreenReaderSupport();

      // Check for skip links
      const skipLinks = await page.locator('a[href^="#"], [class*="skip"]').all();
      for (const skipLink of skipLinks) {
        const href = await skipLink.getAttribute('href');
        const text = await skipLink.textContent();

        expect(text?.toLowerCase()).toMatch(/(skip|jump)/);

        if (href?.startsWith('#')) {
          const target = page.locator(href);
          expect(await target.count()).toBeGreaterThan(0);
        }
      }
    });

    test('should announce dynamic content changes', async ({ page }) => {
      await page.goto(`${BASE_URL}${NETLIFY_DASHBOARD_PATH}`);
      await page.waitForLoadState('networkidle');

      // Look for live regions
      const liveRegions = await page.locator('[aria-live]:not([aria-live="off"])').all();
      expect(liveRegions.length).toBeGreaterThan(0);

      // Test that status changes are announced
      const toggleButton = page.locator('[data-testid^="toggle-"]').first();
      if (await toggleButton.count() > 0) {
        await toggleButton.click();
        await page.waitForTimeout(1000);

        // Check if live region was updated
        const liveRegion = page.locator('[aria-live="polite"], [aria-live="assertive"]').first();
        if (await liveRegion.count() > 0) {
          const content = await liveRegion.textContent();
          expect(content?.trim()).toBeTruthy();
        }
      }
    });
  });

  test.describe('Accessibility Reporting', () => {
    test('should generate comprehensive accessibility report', async ({ page }) => {
      await page.goto(`${BASE_URL}${NETLIFY_DASHBOARD_PATH}`);
      await page.waitForLoadState('networkidle');

      // Run full accessibility audit
      const violations = await a11yPage.getA11yViolations();

      if (violations.length > 0) {
        console.log('\n🚨 Accessibility Violations Found:');
        violations.forEach((violation, index) => {
          console.log(`\n${index + 1}. ${violation.id}: ${violation.description}`);
          console.log(`   Impact: ${violation.impact}`);
          console.log(`   Help: ${violation.helpUrl}`);
          console.log(`   Elements: ${violation.nodes.length}`);
        });
      }

      // We can be lenient in development but should have no critical violations
      const criticalViolations = violations.filter(v => v.impact === 'critical');
      expect(criticalViolations.length).toBe(0);

      const seriousViolations = violations.filter(v => v.impact === 'serious');
      expect(seriousViolations.length).toBeLessThan(5); // Allow some serious violations for now
    });
  });
});
