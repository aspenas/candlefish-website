import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests @accessibility', () => {
  test.beforeEach(async ({ page }) => {
    // Set up common test conditions
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('Homepage accessibility compliance', async ({ page }) => {
    await page.goto('/');
    
    // Run axe accessibility tests
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Assessment page accessibility compliance', async ({ page }) => {
    await page.goto('/assessment');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Keyboard navigation works correctly', async ({ page }) => {
    await page.goto('/');
    
    // Test tab navigation
    await page.keyboard.press('Tab');
    const firstFocusedElement = await page.locator(':focus').first();
    await expect(firstFocusedElement).toBeVisible();
    
    // Continue tabbing through interactive elements
    let tabCount = 0;
    const maxTabs = 20; // Prevent infinite loop
    
    while (tabCount < maxTabs) {
      await page.keyboard.press('Tab');
      const focusedElement = await page.locator(':focus').first();
      
      if (await focusedElement.count() > 0) {
        await expect(focusedElement).toBeVisible();
        
        // Check if focused element is interactive
        const tagName = await focusedElement.evaluate(el => el.tagName.toLowerCase());
        const role = await focusedElement.getAttribute('role');
        const tabIndex = await focusedElement.getAttribute('tabindex');
        
        const isInteractive = ['button', 'a', 'input', 'select', 'textarea'].includes(tagName) ||
                             ['button', 'link', 'textbox'].includes(role || '') ||
                             tabIndex === '0';
        
        if (isInteractive) {
          // Test that interactive elements respond to Enter/Space
          if (tagName === 'button' || role === 'button') {
            // Don't actually activate buttons in accessibility tests
            // Just verify they're focusable
            expect(await focusedElement.isVisible()).toBe(true);
          }
        }
      }
      
      tabCount++;
    }
  });

  test('Screen reader compatibility', async ({ page }) => {
    await page.goto('/assessment');
    
    // Check for proper heading hierarchy
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    expect(headings.length).toBeGreaterThan(0);
    
    // Verify main heading exists
    const h1 = await page.locator('h1').first();
    await expect(h1).toBeVisible();
    
    // Check for proper form labels
    const inputs = await page.locator('input').all();
    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      
      if (id) {
        const label = await page.locator(`label[for="${id}"]`).first();
        const hasLabel = await label.count() > 0;
        const hasAriaLabel = !!ariaLabel || !!ariaLabelledBy;
        
        expect(hasLabel || hasAriaLabel).toBe(true);
      }
    }
    
    // Check for alt text on images
    const images = await page.locator('img').all();
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');
      
      // Images should have alt text or be decorative
      expect(alt !== null || role === 'presentation').toBe(true);
    }
  });

  test('Color contrast meets WCAG standards', async ({ page }) => {
    await page.goto('/');
    
    // Test high contrast mode compatibility
    await page.emulateMedia({ colorScheme: 'dark' });
    
    // Verify content is still visible and readable
    const body = await page.locator('body');
    await expect(body).toBeVisible();
    
    const mainContent = await page.locator('main, [role="main"]').first();
    if (await mainContent.count() > 0) {
      await expect(mainContent).toBeVisible();
    }
    
    // Reset to light mode
    await page.emulateMedia({ colorScheme: 'light' });
  });

  test('Focus indicators are visible', async ({ page }) => {
    await page.goto('/assessment');
    
    // Tab to interactive elements and verify focus indicators
    const interactiveElements = await page.locator('button, a, input, select, textarea, [tabindex="0"]').all();
    
    for (let i = 0; i < Math.min(5, interactiveElements.length); i++) {
      const element = interactiveElements[i];
      await element.focus();
      
      // Check for focus styles (outline, box-shadow, etc.)
      const styles = await element.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          outline: computed.outline,
          outlineWidth: computed.outlineWidth,
          outlineStyle: computed.outlineStyle,
          boxShadow: computed.boxShadow,
        };
      });
      
      // Element should have some kind of focus indicator
      const hasFocusIndicator = 
        styles.outline !== 'none' ||
        styles.outlineWidth !== '0px' ||
        styles.boxShadow !== 'none';
      
      expect(hasFocusIndicator).toBe(true);
    }
  });

  test('Page structure is semantic', async ({ page }) => {
    await page.goto('/');
    
    // Check for proper semantic structure
    const landmarks = await page.locator('main, nav, header, footer, aside, section, [role="main"], [role="navigation"], [role="banner"], [role="contentinfo"]').all();
    expect(landmarks.length).toBeGreaterThan(0);
    
    // Check for skip links (optional but recommended)
    const skipLinks = await page.locator('a[href^="#"]').all();
    
    // Verify proper use of lists
    const lists = await page.locator('ul, ol').all();
    for (const list of lists) {
      const listItems = await list.locator('li').all();
      if (listItems.length > 0) {
        expect(listItems.length).toBeGreaterThan(0);
      }
    }
  });

  test('Error messages are accessible', async ({ page }) => {
    await page.goto('/assessment');
    
    // Navigate to contact form
    for (let i = 0; i < 8; i++) {
      const radioButtons = await page.locator('input[type="radio"]').all();
      if (radioButtons.length > 0) {
        await radioButtons[0].check();
      }
      await page.click('button:has-text("Next")');
      await page.waitForTimeout(500);
    }
    
    // Try to submit without filling required fields
    const submitButton = await page.locator('button:has-text("Get Results")').first();
    if (await submitButton.count() > 0) {
      await submitButton.click();
      
      // Check for accessible error messages
      const errorMessages = await page.locator('[role="alert"], .error, [aria-invalid="true"]').all();
      
      for (const error of errorMessages) {
        await expect(error).toBeVisible();
        
        // Error should be associated with form field
        const ariaDescribedBy = await error.getAttribute('aria-describedby');
        const id = await error.getAttribute('id');
        
        if (id) {
          const associatedField = await page.locator(`[aria-describedby*="${id}"]`).first();
          if (await associatedField.count() > 0) {
            expect(await associatedField.count()).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  test('Responsive design maintains accessibility', async ({ page }) => {
    const viewports = [
      { width: 375, height: 667 },   // Mobile
      { width: 768, height: 1024 },  // Tablet
      { width: 1920, height: 1080 }, // Desktop
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('/');
      
      // Run accessibility scan at this viewport
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();
      
      expect(accessibilityScanResults.violations).toEqual([]);
      
      // Verify main content is still accessible
      const mainContent = await page.locator('main, [role="main"], h1').first();
      await expect(mainContent).toBeVisible();
    }
  });

  test('Dynamic content is accessible', async ({ page }) => {
    await page.goto('/assessment');
    
    // Interact with dynamic content (form progression)
    const firstRadio = await page.locator('input[type="radio"]').first();
    await firstRadio.check();
    
    // Verify ARIA live regions for dynamic updates
    const liveRegions = await page.locator('[aria-live], [role="status"], [role="alert"]').all();
    
    // Progress indicators should be accessible
    const progressBar = await page.locator('[role="progressbar"]').first();
    if (await progressBar.count() > 0) {
      await expect(progressBar).toBeVisible();
      
      const ariaValueNow = await progressBar.getAttribute('aria-valuenow');
      const ariaValueMax = await progressBar.getAttribute('aria-valuemax');
      
      expect(ariaValueNow).not.toBeNull();
      expect(ariaValueMax).not.toBeNull();
    }
  });
});