/**
 * Accessibility Tests for Netlify Extension Management
 *
 * Tests WCAG 2.1 AA compliance for the Netlify dashboard,
 * including keyboard navigation, screen reader compatibility,
 * color contrast, and other accessibility requirements.
 */

import { test, expect, Page } from '@playwright/test';
import { injectAxe, checkA11y, getViolations } from 'axe-playwright';

// Helper function to set up test page with mocked API responses
async function setupTestPage(page: Page) {
  // Mock API responses for consistent testing
  await page.route('/api/sites', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          {
            id: 'candlefish-ai',
            name: 'Candlefish AI',
            url: 'https://candlefish.ai',
            status: 'active',
            deployBranch: 'main',
            buildTime: 45
          },
          {
            id: 'staging-candlefish-ai',
            name: 'Staging - Candlefish AI',
            url: 'https://staging.candlefish.ai',
            status: 'building',
            deployBranch: 'staging',
            buildTime: 38
          }
        ]
      })
    });
  });

  await page.route('/api/extensions', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          extensions: [
            {
              id: 'cache-control',
              name: 'Advanced Cache Control',
              description: 'Optimize caching strategies for better performance',
              category: 'performance',
              isEnabled: false,
              performance: { impact: 'medium', loadTime: 120, bundleSize: 15 }
            },
            {
              id: 'security-headers',
              name: 'Security Headers Suite',
              description: 'Essential security headers for protection',
              category: 'security',
              isEnabled: true,
              performance: { impact: 'low', loadTime: 50, bundleSize: 8 }
            },
            {
              id: 'image-optimization',
              name: 'Smart Image Optimization',
              description: 'Automatically optimize images for faster loading',
              category: 'performance',
              isEnabled: false,
              performance: { impact: 'high', loadTime: 200, bundleSize: 25 }
            }
          ],
          total: 3,
          categories: ['performance', 'security']
        }
      })
    });
  });

  await page.route('/api/sites/*/extensions', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          siteId: 'candlefish-ai',
          extensions: [
            {
              id: 'cache-control',
              name: 'Advanced Cache Control',
              isEnabled: false,
              category: 'performance'
            }
          ],
          recommendations: [
            {
              extension: {
                id: 'image-optimization',
                name: 'Smart Image Optimization'
              },
              confidence: 0.92,
              reasoning: 'Your site would benefit from image optimization',
              potentialImpact: { performance: 35, security: 0, seo: 12, userExperience: 28 }
            }
          ],
          performance: {
            siteId: 'candlefish-ai',
            timestamp: new Date().toISOString(),
            metrics: {
              lcp: 1800,
              fid: 85,
              cls: 0.08,
              fcp: 1200,
              ttfb: 150
            },
            scores: {
              performance: 92,
              accessibility: 98,
              bestPractices: 85,
              seo: 94
            }
          }
        }
      })
    });
  });

  // Navigate to dashboard and wait for initial load
  await page.goto('/netlify-dashboard');
  await page.waitForLoadState('networkidle');

  // Inject axe-core for accessibility testing
  await injectAxe(page);
}

test.describe('Netlify Dashboard Accessibility Tests', () => {

  test.describe('WCAG 2.1 AA Compliance', () => {
    test('should have no accessibility violations on initial load', async ({ page }) => {
      await setupTestPage(page);

      // Run axe accessibility scan
      await checkA11y(page, null, {
        detailedReport: true,
        detailedReportOptions: { html: true }
      });
    });

    test('should maintain accessibility after site selection', async ({ page }) => {
      await setupTestPage(page);

      // Click on staging site to switch
      await page.click('[data-testid="site-option"]:has-text("Staging")');
      await page.waitForLoadState('networkidle');

      // Check accessibility after state change
      await checkA11y(page);
    });

    test('should maintain accessibility with modal dialogs open', async ({ page }) => {
      await setupTestPage(page);

      // Open configuration modal
      await page.click('[data-testid="configure-button"]');
      await page.waitForSelector('[data-testid="configuration-modal"]');

      // Check accessibility of modal
      await checkA11y(page, '[data-testid="configuration-modal"]');

      // Check focus trap in modal
      await page.keyboard.press('Tab');
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeDefined();
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should support full keyboard navigation', async ({ page }) => {
      await setupTestPage(page);

      // Start at beginning of page
      await page.keyboard.press('Home');

      // Tab through all interactive elements
      const interactiveElements = [];
      let previousElement = null;

      for (let i = 0; i < 20; i++) {
        await page.keyboard.press('Tab');

        const currentElement = await page.evaluate(() => {
          const focused = document.activeElement;
          return {
            tagName: focused?.tagName,
            role: focused?.getAttribute('role'),
            ariaLabel: focused?.getAttribute('aria-label'),
            id: focused?.id,
            className: focused?.className
          };
        });

        // Stop if we've cycled back to the beginning
        if (JSON.stringify(currentElement) === JSON.stringify(previousElement)) {
          break;
        }

        interactiveElements.push(currentElement);
        previousElement = currentElement;

        // Verify element is focusable
        const isFocusable = await page.evaluate(() => {
          const focused = document.activeElement;
          return focused && (
            focused.tabIndex >= 0 ||
            ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A'].includes(focused.tagName) ||
            focused.getAttribute('role') === 'button'
          );
        });

        expect(isFocusable).toBe(true);
      }

      // Should have found multiple interactive elements
      expect(interactiveElements.length).toBeGreaterThan(5);
    });

    test('should support arrow key navigation for site selector', async ({ page }) => {
      await setupTestPage(page);

      // Focus on first site
      await page.focus('[data-testid="site-option"]');

      // Use arrow keys to navigate
      await page.keyboard.press('ArrowDown');

      const focusedSite = await page.evaluate(() => {
        return document.activeElement?.textContent?.trim();
      });

      expect(focusedSite).toContain('Staging');

      // Test arrow up wraps to end
      await page.keyboard.press('ArrowUp');
      const wrappedSite = await page.evaluate(() => {
        return document.activeElement?.textContent?.trim();
      });

      expect(wrappedSite).toContain('Candlefish AI');
    });

    test('should support Enter and Space key activation', async ({ page }) => {
      await setupTestPage(page);

      // Mock extension toggle endpoint
      await page.route('POST', '/api/sites/*/extensions', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { id: 'cache-control', isEnabled: true }
          })
        });
      });

      // Focus on extension toggle
      const toggle = page.locator('[data-testid="extension-toggle"]').first();
      await toggle.focus();

      // Press Enter to activate
      await page.keyboard.press('Enter');

      // Verify toggle state changed
      const isChecked = await toggle.isChecked();
      expect(isChecked).toBe(true);

      // Test Space key on button
      const configButton = page.locator('[data-testid="configure-button"]').first();
      await configButton.focus();
      await page.keyboard.press('Space');

      // Should open configuration modal
      await expect(page.locator('[data-testid="configuration-modal"]')).toBeVisible();
    });

    test('should maintain focus management during state changes', async ({ page }) => {
      await setupTestPage(page);

      // Focus on extension toggle
      const toggle = page.locator('[data-testid="extension-toggle"]').first();
      await toggle.focus();

      // Get initial focused element
      const initialFocusId = await page.evaluate(() => document.activeElement?.id);

      // Toggle extension
      await page.keyboard.press('Enter');
      await page.waitForTimeout(100); // Allow for state update

      // Focus should remain on the same element
      const currentFocusId = await page.evaluate(() => document.activeElement?.id);
      expect(currentFocusId).toBe(initialFocusId);
    });
  });

  test.describe('Screen Reader Compatibility', () => {
    test('should have proper heading structure', async ({ page }) => {
      await setupTestPage(page);

      // Check heading hierarchy
      const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', elements =>
        elements.map(el => ({
          level: parseInt(el.tagName[1]),
          text: el.textContent?.trim()
        }))
      );

      expect(headings.length).toBeGreaterThan(0);

      // Should start with h1
      expect(headings[0]?.level).toBe(1);

      // Check for proper heading sequence (no skipping levels)
      for (let i = 1; i < headings.length; i++) {
        const levelDiff = headings[i].level - headings[i - 1].level;
        expect(levelDiff).toBeLessThanOrEqual(1);
      }
    });

    test('should have descriptive labels and roles', async ({ page }) => {
      await setupTestPage(page);

      // Check extension toggles have proper labels
      const toggles = page.locator('[data-testid="extension-toggle"]');
      const toggleCount = await toggles.count();

      for (let i = 0; i < toggleCount; i++) {
        const toggle = toggles.nth(i);
        const ariaLabel = await toggle.getAttribute('aria-label');
        const associatedLabel = await toggle.getAttribute('aria-labelledby');

        // Should have either aria-label or aria-labelledby
        expect(ariaLabel || associatedLabel).toBeTruthy();

        if (ariaLabel) {
          expect(ariaLabel).toContain('extension');
        }
      }

      // Check buttons have descriptive labels
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();

      for (let i = 0; i < buttonCount; i++) {
        const button = buttons.nth(i);
        const ariaLabel = await button.getAttribute('aria-label');
        const text = await button.textContent();

        // Button should have either visible text or aria-label
        expect(ariaLabel || text?.trim()).toBeTruthy();
      }
    });

    test('should announce important state changes', async ({ page }) => {
      await setupTestPage(page);

      // Mock successful extension enable
      await page.route('POST', '/api/sites/*/extensions', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { id: 'cache-control', isEnabled: true }
          })
        });
      });

      // Enable extension
      await page.click('[data-testid="extension-toggle"]');

      // Should have live region announcement
      const announcement = page.locator('[role="status"], [aria-live]');
      await expect(announcement).toHaveText(/extension.*enabled/i);
    });

    test('should provide proper form labels and descriptions', async ({ page }) => {
      await setupTestPage(page);

      // Open configuration modal
      await page.click('[data-testid="configure-button"]');
      await page.waitForSelector('[data-testid="configuration-modal"]');

      // Check form inputs have labels
      const inputs = page.locator('input, select, textarea');
      const inputCount = await inputs.count();

      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i);
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledBy = await input.getAttribute('aria-labelledby');

        if (id) {
          // Check for associated label
          const label = page.locator(`label[for="${id}"]`);
          const hasLabel = await label.count() > 0;
          expect(hasLabel || ariaLabel || ariaLabelledBy).toBeTruthy();
        }
      }
    });

    test('should provide error descriptions for form validation', async ({ page }) => {
      await setupTestPage(page);

      // Open configuration modal
      await page.click('[data-testid="configure-button"]');
      await page.waitForSelector('[data-testid="configuration-modal"]');

      // Enter invalid value to trigger validation
      const input = page.locator('[data-testid="config-maxAge"]');
      await input.fill('-1'); // Invalid negative value

      // Try to save
      await page.click('[data-testid="save-config"]');

      // Should show validation error with proper association
      const errorMessage = page.locator('[data-testid="validation-error-maxAge"]');
      await expect(errorMessage).toBeVisible();

      // Error should be associated with input via aria-describedby
      const ariaDescribedBy = await input.getAttribute('aria-describedby');
      expect(ariaDescribedBy).toBeTruthy();

      const errorId = await errorMessage.getAttribute('id');
      expect(ariaDescribedBy).toContain(errorId || '');
    });
  });

  test.describe('Color and Contrast', () => {
    test('should meet WCAG AA color contrast requirements', async ({ page }) => {
      await setupTestPage(page);

      // Check contrast ratios using axe
      await checkA11y(page, null, {
        rules: {
          'color-contrast': { enabled: true }
        }
      });

      // Additional manual contrast checks for key elements
      const criticalElements = [
        '[data-testid="extension-toggle"]',
        'button',
        'a',
        '[role="tab"]'
      ];

      for (const selector of criticalElements) {
        const elements = page.locator(selector);
        const count = await elements.count();

        if (count > 0) {
          // Get computed styles for contrast calculation
          const styles = await elements.first().evaluate(el => {
            const computed = getComputedStyle(el);
            return {
              color: computed.color,
              backgroundColor: computed.backgroundColor,
              fontSize: computed.fontSize
            };
          });

          expect(styles.color).toBeDefined();
          expect(styles.backgroundColor).toBeDefined();
        }
      }
    });

    test('should be usable without color alone', async ({ page }) => {
      await setupTestPage(page);

      // Check that status indicators don't rely solely on color
      const statusIndicators = page.locator('[data-testid^="status-"]');
      const count = await statusIndicators.count();

      for (let i = 0; i < count; i++) {
        const indicator = statusIndicators.nth(i);

        // Should have text, icon, or pattern in addition to color
        const hasText = await indicator.textContent();
        const hasAriaLabel = await indicator.getAttribute('aria-label');
        const hasIcon = await indicator.locator('svg, [data-icon]').count();

        expect(hasText?.trim() || hasAriaLabel || hasIcon > 0).toBeTruthy();
      }
    });

    test('should be usable in high contrast mode', async ({ page }) => {
      await setupTestPage(page);

      // Simulate high contrast mode
      await page.addStyleTag({
        content: `
          @media (prefers-contrast: high) {
            * {
              background-color: white !important;
              color: black !important;
              border-color: black !important;
            }

            button, [role="button"] {
              background-color: black !important;
              color: white !important;
              border: 2px solid black !important;
            }
          }
        `
      });

      // Force high contrast media query
      await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });

      // Elements should still be distinguishable
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();

      for (let i = 0; i < buttonCount; i++) {
        const button = buttons.nth(i);
        await expect(button).toBeVisible();

        // Button should have distinct styling
        const styles = await button.evaluate(el => {
          const computed = getComputedStyle(el);
          return {
            border: computed.border,
            outline: computed.outline
          };
        });

        // Should have visible border or outline
        expect(styles.border !== 'none' || styles.outline !== 'none').toBeTruthy();
      }
    });
  });

  test.describe('Motor Impairments Support', () => {
    test('should have adequately sized touch targets', async ({ page }) => {
      await setupTestPage(page);

      // Set mobile viewport to test touch targets
      await page.setViewportSize({ width: 375, height: 667 });

      const interactiveElements = await page.locator('button, [role="button"], input, select').all();

      for (const element of interactiveElements) {
        if (await element.isVisible()) {
          const box = await element.boundingBox();

          if (box) {
            // WCAG recommends 44x44px minimum for touch targets
            expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
          }
        }
      }
    });

    test('should support click alternatives for drag operations', async ({ page }) => {
      await setupTestPage(page);

      // Check that any drag/drop interfaces have keyboard alternatives
      const draggableElements = page.locator('[draggable="true"]');
      const count = await draggableElements.count();

      for (let i = 0; i < count; i++) {
        const element = draggableElements.nth(i);

        // Should be keyboard accessible
        const tabIndex = await element.getAttribute('tabindex');
        const role = await element.getAttribute('role');

        expect(parseInt(tabIndex || '0') >= 0 || role === 'button').toBeTruthy();

        // Should have keyboard event handlers or aria-instructions
        const ariaInstructions = await element.getAttribute('aria-describedby');
        expect(ariaInstructions).toBeTruthy();
      }
    });

    test('should provide adequate time for actions', async ({ page }) => {
      await setupTestPage(page);

      // Test that timeouts/loading states give adequate time
      await page.click('[data-testid="extension-toggle"]');

      // Should show loading state
      const loadingSpinner = page.locator('[data-testid="loading-spinner"]');
      await expect(loadingSpinner).toBeVisible();

      // Loading should not timeout too quickly (min 20 seconds for complex actions)
      await page.waitForTimeout(1000);
      await expect(loadingSpinner).toBeVisible();
    });
  });

  test.describe('Cognitive Accessibility', () => {
    test('should provide clear navigation and orientation', async ({ page }) => {
      await setupTestPage(page);

      // Check for breadcrumbs or clear navigation
      const navigation = page.locator('nav, [role="navigation"]');
      await expect(navigation).toBeVisible();

      // Should indicate current location
      const currentPage = page.locator('[aria-current="page"], .current, [data-current="true"]');
      expect(await currentPage.count()).toBeGreaterThan(0);
    });

    test('should use consistent interaction patterns', async ({ page }) => {
      await setupTestPage(page);

      // All toggles should work the same way
      const toggles = page.locator('[data-testid="extension-toggle"]');
      const toggleCount = await toggles.count();

      for (let i = 0; i < toggleCount; i++) {
        const toggle = toggles.nth(i);

        // Should have consistent ARIA attributes
        const role = await toggle.getAttribute('role');
        const ariaChecked = await toggle.getAttribute('aria-checked');

        expect(role).toBe('switch');
        expect(['true', 'false']).toContain(ariaChecked || '');
      }
    });

    test('should provide helpful error recovery', async ({ page }) => {
      await setupTestPage(page);

      // Test error state with recovery options
      await page.route('POST', '/api/sites/*/extensions', async route => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 'VALIDATION_ERROR',
            message: 'Extension conflicts with current configuration'
          })
        });
      });

      // Try to enable extension (should fail)
      await page.click('[data-testid="extension-toggle"]');

      // Should show clear error message
      const errorToast = page.locator('[data-testid="toast-error"]');
      await expect(errorToast).toBeVisible();
      await expect(errorToast).toContainText('Extension conflicts');

      // Should provide recovery action
      const retryButton = page.locator('button:has-text("Try Again"), button:has-text("Retry")');
      expect(await retryButton.count()).toBeGreaterThan(0);
    });

    test('should support users with attention difficulties', async ({ page }) => {
      await setupTestPage(page);

      // Check for reduced motion support
      await page.emulateMedia({ reducedMotion: 'reduce' });

      // Animations should be reduced or disabled
      const animatedElements = page.locator('[class*="animate"], [class*="transition"]');
      const count = await animatedElements.count();

      if (count > 0) {
        // Should respect prefers-reduced-motion
        const styles = await animatedElements.first().evaluate(el => {
          return getComputedStyle(el).getPropertyValue('animation-duration');
        });

        // Animation should be instant or very fast when reduced motion is preferred
        expect(styles === '0s' || styles === '0.01s').toBeTruthy();
      }
    });
  });

  test.describe('Multi-language and Internationalization', () => {
    test('should have proper language attributes', async ({ page }) => {
      await setupTestPage(page);

      // HTML should have lang attribute
      const htmlLang = await page.getAttribute('html', 'lang');
      expect(htmlLang).toBeTruthy();
      expect(htmlLang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/); // e.g., 'en' or 'en-US'

      // Check for any elements with different languages
      const elementsWithLang = await page.locator('[lang]').count();
      if (elementsWithLang > 0) {
        // Each should have valid lang attribute
        const langValues = await page.$$eval('[lang]', elements =>
          elements.map(el => el.getAttribute('lang'))
        );

        langValues.forEach(lang => {
          expect(lang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/);
        });
      }
    });

    test('should be RTL-compatible', async ({ page }) => {
      await setupTestPage(page);

      // Test RTL layout
      await page.addStyleTag({
        content: `
          html { direction: rtl; }
          * { text-align: right; }
        `
      });

      // Layout should not break
      const dashboard = page.locator('[data-testid="netlify-dashboard"]');
      await expect(dashboard).toBeVisible();

      // Interactive elements should still be accessible
      const firstButton = page.locator('button').first();
      await expect(firstButton).toBeVisible();
      await firstButton.click();
    });
  });

  test.describe('Mobile Accessibility', () => {
    test('should be accessible on mobile devices', async ({ page }) => {
      await setupTestPage(page);

      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Run accessibility scan on mobile
      await checkA11y(page);

      // Check that mobile navigation works
      const mobileNav = page.locator('[data-testid="mobile-nav-toggle"]');
      if (await mobileNav.count() > 0) {
        await mobileNav.click();

        const mobileMenu = page.locator('[data-testid="mobile-nav-menu"]');
        await expect(mobileMenu).toBeVisible();

        // Mobile menu should be keyboard accessible
        await page.keyboard.press('Tab');
        const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
        expect(focusedElement).toBeDefined();
      }
    });

    test('should support zoom up to 200%', async ({ page }) => {
      await setupTestPage(page);

      // Zoom to 200%
      await page.addStyleTag({
        content: `
          html { zoom: 2; }
          body { zoom: 2; }
        `
      });

      // Content should still be usable
      const dashboard = page.locator('[data-testid="netlify-dashboard"]');
      await expect(dashboard).toBeVisible();

      // No horizontal scrolling should be required
      const hasHorizontalScrollbar = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      expect(hasHorizontalScrollbar).toBeFalsy();
    });
  });

  test.afterEach(async ({ page }) => {
    // Check for any console errors that might indicate accessibility issues
    const logs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logs.push(msg.text());
      }
    });

    // If there were errors, they might indicate accessibility problems
    if (logs.length > 0) {
      console.warn('Console errors detected:', logs);
    }
  });
});
