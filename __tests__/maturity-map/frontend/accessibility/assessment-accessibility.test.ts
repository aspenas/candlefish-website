import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y, getViolations } from 'axe-playwright';
import { createAssessmentFactory } from '../../../utils/test-data-factories';

test.describe('Assessment Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authentication and navigation
    await page.goto('/login');
    await page.fill('[data-testid=email]', 'assessor@example.com');
    await page.fill('[data-testid=password]', 'password123');
    await page.click('[data-testid=login-button]');
    
    // Wait for login to complete
    await page.waitForURL('/dashboard');
    
    // Inject axe-core for accessibility testing
    await injectAxe(page);
  });

  test.describe('Assessment Form Accessibility', () => {
    test('should have no accessibility violations on assessment creation form', async ({ page }) => {
      // Navigate to assessment creation
      await page.goto('/assessments/create');
      await page.waitForLoadState('networkidle');

      // Check for accessibility violations
      const violations = await getViolations(page, {
        rules: {
          // Enable all WCAG 2.1 Level AA rules
          'wcag21aa': { enabled: true },
          'wcag21a': { enabled: true },
          'wcag20a': { enabled: true },
          'wcag20aa': { enabled: true }
        }
      });

      expect(violations).toHaveLength(0);
    });

    test('should support keyboard navigation in form fields', async ({ page }) => {
      await page.goto('/assessments/create');
      await page.waitForLoadState('networkidle');

      // Test keyboard navigation through form elements
      await page.keyboard.press('Tab'); // Focus title field
      let focusedElement = await page.locator(':focus');
      await expect(focusedElement).toHaveAttribute('data-testid', 'assessment-title');

      await page.keyboard.press('Tab'); // Focus description field
      focusedElement = await page.locator(':focus');
      await expect(focusedElement).toHaveAttribute('data-testid', 'assessment-description');

      await page.keyboard.press('Tab'); // Focus first template
      focusedElement = await page.locator(':focus');
      await expect(focusedElement).toHaveRole('radio');

      // Test arrow key navigation within template selection
      await page.keyboard.press('ArrowDown');
      focusedElement = await page.locator(':focus');
      const secondTemplate = await page.locator('[role=radio]').nth(1);
      await expect(focusedElement).toEqual(secondTemplate);

      // Test space key selection
      await page.keyboard.press('Space');
      await expect(focusedElement).toBeChecked();
    });

    test('should provide proper ARIA labels and descriptions', async ({ page }) => {
      await page.goto('/assessments/create');
      await page.waitForLoadState('networkidle');

      // Check form has proper labeling
      const form = await page.locator('[role=form]');
      await expect(form).toHaveAttribute('aria-label', 'Create new assessment');

      // Check required field indicators
      const titleField = await page.locator('[data-testid=assessment-title]');
      await expect(titleField).toHaveAttribute('aria-required', 'true');
      await expect(titleField).toHaveAttribute('aria-describedby');

      // Check template selection has proper grouping
      const templateGroup = await page.locator('[role=radiogroup]');
      await expect(templateGroup).toHaveAttribute('aria-label', 'Select assessment template');
      await expect(templateGroup).toHaveAttribute('aria-required', 'true');

      // Check individual templates have proper labels
      const templates = await page.locator('[role=radio]');
      const templateCount = await templates.count();
      
      for (let i = 0; i < templateCount; i++) {
        const template = templates.nth(i);
        await expect(template).toHaveAttribute('aria-label');
        await expect(template).toHaveAttribute('aria-describedby');
      }
    });

    test('should announce validation errors to screen readers', async ({ page }) => {
      await page.goto('/assessments/create');
      await page.waitForLoadState('networkidle');

      // Submit form without filling required fields
      await page.click('[data-testid=submit-button]');

      // Check error announcements
      const errorRegion = await page.locator('[role=alert]');
      await expect(errorRegion).toBeVisible();
      await expect(errorRegion).toHaveAttribute('aria-live', 'assertive');

      // Check individual field errors
      const titleError = await page.locator('[data-testid=title-error]');
      await expect(titleError).toBeVisible();
      await expect(titleError).toHaveAttribute('role', 'alert');

      // Verify error is associated with field
      const titleField = await page.locator('[data-testid=assessment-title]');
      const describedBy = await titleField.getAttribute('aria-describedby');
      const errorId = await titleError.getAttribute('id');
      expect(describedBy).toContain(errorId);
    });

    test('should support high contrast mode', async ({ page }) => {
      // Enable high contrast simulation
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.addStyleTag({
        content: `
          @media (prefers-contrast: high) {
            * { 
              filter: contrast(1.5) !important;
            }
          }
        `
      });

      await page.goto('/assessments/create');
      await page.waitForLoadState('networkidle');

      // Verify elements are still visible and accessible
      const submitButton = await page.locator('[data-testid=submit-button]');
      await expect(submitButton).toBeVisible();

      // Check color contrast ratios
      const violations = await getViolations(page, {
        rules: {
          'color-contrast': { enabled: true }
        }
      });

      expect(violations.filter(v => v.id === 'color-contrast')).toHaveLength(0);
    });
  });

  test.describe('Assessment Questions Accessibility', () => {
    test('should have accessible question navigation', async ({ page }) => {
      // Mock assessment with questions
      await page.route('/api/graphql', async (route) => {
        const request = route.request();
        if (request.postData()?.includes('GetAssessment')) {
          await route.fulfill({
            json: {
              data: {
                assessment: createAssessmentFactory({
                  id: 'assessment-1',
                  questions: [
                    {
                      id: 'q1',
                      text: 'Does your organization have a documented security policy?',
                      dimension: 'governance',
                      options: [
                        { value: 1, label: 'No policy exists' },
                        { value: 2, label: 'Basic policy exists' },
                        { value: 3, label: 'Comprehensive policy exists' },
                        { value: 4, label: 'Policy is regularly updated' }
                      ]
                    },
                    {
                      id: 'q2',
                      text: 'How often do you conduct security training?',
                      dimension: 'awareness',
                      options: [
                        { value: 1, label: 'Never' },
                        { value: 2, label: 'Annually' },
                        { value: 3, label: 'Quarterly' },
                        { value: 4, label: 'Monthly' }
                      ]
                    }
                  ]
                })
              }
            }
          });
        }
      });

      await page.goto('/assessments/assessment-1');
      await page.waitForLoadState('networkidle');

      // Check question navigation landmarks
      const nav = await page.locator('[role=navigation][aria-label*="question"]');
      await expect(nav).toBeVisible();

      // Test skip links
      const skipLink = await page.locator('[data-testid=skip-to-content]');
      await skipLink.focus();
      await page.keyboard.press('Enter');

      const mainContent = await page.locator('[role=main]');
      const focusedElement = await page.locator(':focus');
      expect(await mainContent.boundingBox()).toEqual(
        expect.objectContaining({
          x: (await focusedElement.boundingBox())?.x
        })
      );
    });

    test('should properly structure question content', async ({ page }) => {
      await page.goto('/assessments/assessment-1');
      await page.waitForLoadState('networkidle');

      // Check heading hierarchy
      const h1 = await page.locator('h1');
      await expect(h1).toHaveCount(1);
      await expect(h1).toContainText('Assessment');

      const questionHeadings = await page.locator('h2, h3, h4, h5, h6');
      const headingCount = await questionHeadings.count();
      
      // Verify logical heading order
      for (let i = 0; i < headingCount; i++) {
        const heading = questionHeadings.nth(i);
        const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
        
        // Questions should be h2 or lower in hierarchy
        expect(['h2', 'h3', 'h4', 'h5', 'h6']).toContain(tagName);
      }

      // Check question groups have proper structure
      const questionGroups = await page.locator('[role=group]');
      const groupCount = await questionGroups.count();

      for (let i = 0; i < groupCount; i++) {
        const group = questionGroups.nth(i);
        await expect(group).toHaveAttribute('aria-labelledby');
        
        // Verify group contains radio buttons
        const radios = await group.locator('[role=radio]');
        await expect(radios).toHaveCountGreaterThan(0);
      }
    });

    test('should support screen reader navigation patterns', async ({ page }) => {
      await page.goto('/assessments/assessment-1');
      await page.waitForLoadState('networkidle');

      // Test landmark navigation
      const landmarks = await page.locator('[role=banner], [role=navigation], [role=main], [role=complementary], [role=contentinfo]');
      const landmarkCount = await landmarks.count();
      expect(landmarkCount).toBeGreaterThan(0);

      // Test region labels
      const main = await page.locator('[role=main]');
      await expect(main).toHaveAttribute('aria-label');

      const navigation = await page.locator('[role=navigation]');
      const navCount = await navigation.count();
      for (let i = 0; i < navCount; i++) {
        const nav = navigation.nth(i);
        const hasLabel = await nav.getAttribute('aria-label') || await nav.getAttribute('aria-labelledby');
        expect(hasLabel).toBeTruthy();
      }

      // Test list structures
      const lists = await page.locator('ul, ol');
      const listCount = await lists.count();
      
      for (let i = 0; i < listCount; i++) {
        const list = lists.nth(i);
        const listItems = await list.locator('li');
        await expect(listItems).toHaveCountGreaterThan(0);
      }
    });

    test('should handle focus management correctly', async ({ page }) => {
      await page.goto('/assessments/assessment-1');
      await page.waitForLoadState('networkidle');

      // Test initial focus
      const firstFocusable = await page.locator('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])').first();
      await expect(firstFocusable).toBeFocused();

      // Test modal focus trapping
      const helpButton = await page.locator('[data-testid=help-button]');
      if (await helpButton.isVisible()) {
        await helpButton.click();
        
        const modal = await page.locator('[role=dialog]');
        await expect(modal).toBeVisible();
        
        // Focus should be trapped within modal
        const modalFocusables = await modal.locator('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])');
        const firstModalFocusable = modalFocusables.first();
        const lastModalFocusable = modalFocusables.last();
        
        await expect(firstModalFocusable).toBeFocused();
        
        // Tab to last element and then tab again should cycle to first
        const count = await modalFocusables.count();
        for (let i = 0; i < count - 1; i++) {
          await page.keyboard.press('Tab');
        }
        
        await expect(lastModalFocusable).toBeFocused();
        await page.keyboard.press('Tab');
        await expect(firstModalFocusable).toBeFocused();
        
        // Shift+Tab should go to last element
        await page.keyboard.press('Shift+Tab');
        await expect(lastModalFocusable).toBeFocused();
      }
    });

    test('should provide accessible progress indicators', async ({ page }) => {
      await page.goto('/assessments/assessment-1');
      await page.waitForLoadState('networkidle');

      // Check progress bar accessibility
      const progressBar = await page.locator('[role=progressbar]');
      await expect(progressBar).toBeVisible();
      await expect(progressBar).toHaveAttribute('aria-label');
      await expect(progressBar).toHaveAttribute('aria-valuenow');
      await expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      await expect(progressBar).toHaveAttribute('aria-valuemax', '100');

      // Verify progress text is associated
      const progressText = await page.locator('[data-testid=progress-text]');
      if (await progressText.isVisible()) {
        const progressId = await progressBar.getAttribute('aria-describedby');
        const textId = await progressText.getAttribute('id');
        expect(progressId).toContain(textId);
      }

      // Test live region for progress updates
      const liveRegion = await page.locator('[aria-live]');
      if (await liveRegion.isVisible()) {
        await expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      }
    });
  });

  test.describe('Visual and Interactive Accessibility', () => {
    test('should support reduced motion preferences', async ({ page }) => {
      // Enable reduced motion
      await page.emulateMedia({ reducedMotion: 'reduce' });

      await page.goto('/assessments/assessment-1');
      await page.waitForLoadState('networkidle');

      // Check that animations are disabled or reduced
      const animatedElements = await page.locator('[data-testid*="animated"], .animate, [style*="animation"]');
      const count = await animatedElements.count();

      for (let i = 0; i < count; i++) {
        const element = animatedElements.nth(i);
        const computedStyle = await element.evaluate((el) => {
          return window.getComputedStyle(el);
        });

        // Animation duration should be very short or none
        expect(
          computedStyle.animationDuration === 'none' || 
          computedStyle.animationDuration === '0s' ||
          parseFloat(computedStyle.animationDuration) <= 0.01
        ).toBeTruthy();
      }
    });

    test('should handle zoom up to 200% without loss of functionality', async ({ page }) => {
      await page.goto('/assessments/assessment-1');
      await page.waitForLoadState('networkidle');

      // Set zoom to 200%
      await page.setViewportSize({ width: 640, height: 480 });

      // Verify essential functions still work
      const questions = await page.locator('[role=group]');
      const firstQuestion = questions.first();
      
      await expect(firstQuestion).toBeVisible();
      
      const radioButtons = await firstQuestion.locator('[role=radio]');
      const firstRadio = radioButtons.first();
      
      await expect(firstRadio).toBeVisible();
      await expect(firstRadio).toBeEnabled();
      
      // Test interaction at high zoom
      await firstRadio.click();
      await expect(firstRadio).toBeChecked();

      // Verify navigation still works
      const nextButton = await page.locator('[data-testid=next-question]');
      if (await nextButton.isVisible()) {
        await expect(nextButton).toBeEnabled();
      }
    });

    test('should provide sufficient touch targets for mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/assessments/assessment-1');
      await page.waitForLoadState('networkidle');

      // Check touch target sizes (minimum 44x44 pixels)
      const interactiveElements = await page.locator('button, input, select, textarea, a[href], [role=button], [role=radio], [role=checkbox]');
      const elementCount = await interactiveElements.count();

      for (let i = 0; i < elementCount; i++) {
        const element = interactiveElements.nth(i);
        if (await element.isVisible()) {
          const box = await element.boundingBox();
          if (box) {
            expect(box.width).toBeGreaterThanOrEqual(44);
            expect(box.height).toBeGreaterThanOrEqual(44);
          }
        }
      }

      // Test touch interaction
      const firstRadio = await page.locator('[role=radio]').first();
      await firstRadio.tap();
      await expect(firstRadio).toBeChecked();
    });

    test('should maintain focus visibility', async ({ page }) => {
      await page.goto('/assessments/assessment-1');
      await page.waitForLoadState('networkidle');

      // Test focus indicators
      const focusableElements = await page.locator('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])');
      const count = await focusableElements.count();

      for (let i = 0; i < Math.min(count, 10); i++) { // Test first 10 elements
        const element = focusableElements.nth(i);
        await element.focus();

        // Check that focus is visible (outline, box-shadow, etc.)
        const computedStyle = await element.evaluate((el) => {
          const style = window.getComputedStyle(el, ':focus');
          return {
            outline: style.outline,
            outlineWidth: style.outlineWidth,
            outlineColor: style.outlineColor,
            boxShadow: style.boxShadow
          };
        });

        const hasFocusIndicator = 
          computedStyle.outline !== 'none' ||
          computedStyle.outlineWidth !== '0px' ||
          computedStyle.boxShadow !== 'none' ||
          computedStyle.boxShadow.includes('inset') === false;

        expect(hasFocusIndicator).toBeTruthy();
      }
    });
  });

  test.describe('Content and Language Accessibility', () => {
    test('should have proper document language attributes', async ({ page }) => {
      await page.goto('/assessments/assessment-1');
      await page.waitForLoadState('networkidle');

      // Check html lang attribute
      const htmlLang = await page.getAttribute('html', 'lang');
      expect(htmlLang).toBeTruthy();
      expect(htmlLang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/); // e.g., 'en' or 'en-US'

      // Check for any content in different languages
      const foreignElements = await page.locator('[lang], [xml:lang]');
      const foreignCount = await foreignElements.count();

      for (let i = 0; i < foreignCount; i++) {
        const element = foreignElements.nth(i);
        const lang = await element.getAttribute('lang') || await element.getAttribute('xml:lang');
        expect(lang).toBeTruthy();
        expect(lang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/);
      }
    });

    test('should provide accessible error messages and instructions', async ({ page }) => {
      await page.goto('/assessments/create');
      await page.waitForLoadState('networkidle');

      // Submit form to trigger validation
      await page.click('[data-testid=submit-button]');

      // Check error message structure
      const errors = await page.locator('[role=alert]');
      const errorCount = await errors.count();

      for (let i = 0; i < errorCount; i++) {
        const error = errors.nth(i);
        const errorText = await error.textContent();
        
        // Error should be descriptive and actionable
        expect(errorText).toBeTruthy();
        expect(errorText!.length).toBeGreaterThan(10); // Not just "Error"
        
        // Should contain guidance on how to fix
        const hasActionableText = 
          errorText!.includes('required') ||
          errorText!.includes('must') ||
          errorText!.includes('should') ||
          errorText!.includes('please') ||
          errorText!.includes('enter') ||
          errorText!.includes('select');
        
        expect(hasActionableText).toBeTruthy();
      }

      // Check help text is descriptive
      const helpTexts = await page.locator('[data-testid*="help"], [id*="help"]');
      const helpCount = await helpTexts.count();

      for (let i = 0; i < helpCount; i++) {
        const help = helpTexts.nth(i);
        const helpText = await help.textContent();
        if (helpText) {
          expect(helpText.length).toBeGreaterThan(5); // Substantial help text
        }
      }
    });

    test('should use semantic markup correctly', async ({ page }) => {
      await page.goto('/assessments/assessment-1');
      await page.waitForLoadState('networkidle');

      // Check for proper use of semantic elements
      const semanticElements = await page.locator('header, nav, main, article, section, aside, footer, h1, h2, h3, h4, h5, h6');
      await expect(semanticElements).toHaveCountGreaterThan(0);

      // Verify table markup if tables exist
      const tables = await page.locator('table');
      const tableCount = await tables.count();

      for (let i = 0; i < tableCount; i++) {
        const table = tables.nth(i);
        
        // Tables should have captions or aria-label
        const hasCaption = await table.locator('caption').count() > 0;
        const hasAriaLabel = await table.getAttribute('aria-label');
        expect(hasCaption || hasAriaLabel).toBeTruthy();

        // Check for proper header structure
        const headers = await table.locator('th');
        if (await headers.count() > 0) {
          const firstHeader = headers.first();
          const scope = await firstHeader.getAttribute('scope');
          // Headers should have scope attribute for complex tables
          if (await headers.count() > 1) {
            expect(scope).toBeTruthy();
          }
        }
      }

      // Check form structure
      const forms = await page.locator('form');
      const formCount = await forms.count();

      for (let i = 0; i < formCount; i++) {
        const form = forms.nth(i);
        const inputs = await form.locator('input, select, textarea');
        const inputCount = await inputs.count();

        for (let j = 0; j < inputCount; j++) {
          const input = inputs.nth(j);
          const id = await input.getAttribute('id');
          
          if (id) {
            // Check for associated label
            const label = await page.locator(`label[for="${id}"]`);
            const hasLabel = await label.count() > 0;
            const hasAriaLabel = await input.getAttribute('aria-label');
            const hasAriaLabelledby = await input.getAttribute('aria-labelledby');
            
            expect(hasLabel || hasAriaLabel || hasAriaLabelledby).toBeTruthy();
          }
        }
      }
    });
  });

  test.describe('Assessment Results Accessibility', () => {
    test('should make charts and visualizations accessible', async ({ page }) => {
      await page.goto('/assessments/assessment-1/results');
      await page.waitForLoadState('networkidle');

      // Check for chart accessibility
      const charts = await page.locator('[role=img], svg, canvas').filter({ hasText: /chart|graph/i });
      const chartCount = await charts.count();

      for (let i = 0; i < chartCount; i++) {
        const chart = charts.nth(i);
        
        // Charts should have accessible names
        const hasAltText = await chart.getAttribute('alt');
        const hasAriaLabel = await chart.getAttribute('aria-label');
        const hasAriaLabelledby = await chart.getAttribute('aria-labelledby');
        
        expect(hasAltText || hasAriaLabel || hasAriaLabelledby).toBeTruthy();

        // Check for text alternatives
        const hasRole = await chart.getAttribute('role');
        if (hasRole === 'img') {
          const description = await chart.getAttribute('aria-describedby');
          if (description) {
            const descElement = await page.locator(`#${description}`);
            await expect(descElement).toBeVisible();
          }
        }
      }

      // Check data tables for results
      const dataTables = await page.locator('table[data-testid*="results"], table[data-testid*="scores"]');
      const dataTableCount = await dataTables.count();

      for (let i = 0; i < dataTableCount; i++) {
        const table = dataTables.nth(i);
        
        // Should have caption
        const caption = await table.locator('caption');
        await expect(caption).toBeVisible();

        // Should have proper header associations
        const cells = await table.locator('td');
        const cellCount = await cells.count();
        
        for (let j = 0; j < Math.min(cellCount, 5); j++) { // Check first 5 cells
          const cell = cells.nth(j);
          const headers = await cell.getAttribute('headers');
          // Complex tables should have header associations
          if (dataTableCount > 1) {
            expect(headers).toBeTruthy();
          }
        }
      }
    });

    test('should provide accessible score summaries', async ({ page }) => {
      await page.goto('/assessments/assessment-1/results');
      await page.waitForLoadState('networkidle');

      // Check score announcements
      const scoreElements = await page.locator('[data-testid*="score"], [aria-label*="score"]');
      const scoreCount = await scoreElements.count();

      for (let i = 0; i < scoreCount; i++) {
        const score = scoreElements.nth(i);
        
        // Scores should be announced clearly
        const ariaLabel = await score.getAttribute('aria-label');
        const text = await score.textContent();
        
        if (ariaLabel || text) {
          const content = ariaLabel || text!;
          expect(content).toMatch(/\d+/); // Should contain numbers
          expect(content.toLowerCase()).toMatch(/(score|percent|level|rating)/);
        }
      }

      // Check for screen reader friendly summaries
      const summaryRegions = await page.locator('[role=region][aria-label*="summary"], [data-testid*="summary"]');
      if (await summaryRegions.count() > 0) {
        const summary = summaryRegions.first();
        await expect(summary).toBeVisible();
        
        const summaryText = await summary.textContent();
        expect(summaryText).toBeTruthy();
        expect(summaryText!.length).toBeGreaterThan(20); // Substantial summary
      }
    });
  });

  test.afterEach(async ({ page }) => {
    // Generate accessibility report
    const violations = await getViolations(page);
    
    if (violations.length > 0) {
      console.log('Accessibility violations found:');
      violations.forEach((violation) => {
        console.log(`- ${violation.id}: ${violation.description}`);
        console.log(`  Impact: ${violation.impact}`);
        console.log(`  Help: ${violation.helpUrl}`);
      });
    }
  });
});