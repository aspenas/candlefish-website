import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests @visual', () => {
  test.beforeEach(async ({ page }) => {
    // Set consistent viewport for visual testing
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Wait for fonts and animations to load
    await page.waitForLoadState('networkidle');
  });

  test('Homepage visual consistency', async ({ page }) => {
    await page.goto('/');
    
    // Wait for any animations to complete
    await page.waitForTimeout(2000);
    
    // Take full page screenshot
    await expect(page).toHaveScreenshot('homepage-desktop.png', {
      fullPage: true,
      threshold: 0.2, // Allow 20% difference for anti-aliasing
    });
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveScreenshot('homepage-mobile.png', {
      fullPage: true,
      threshold: 0.2,
    });
  });

  test('Assessment form visual consistency', async ({ page }) => {
    await page.goto('/assessment');
    await page.waitForTimeout(2000);
    
    // Screenshot of initial assessment state
    await expect(page).toHaveScreenshot('assessment-initial.png', {
      fullPage: true,
      threshold: 0.2,
    });
    
    // Answer first question and screenshot
    const firstRadio = await page.locator('input[type="radio"]').first();
    await firstRadio.check();
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('assessment-answered.png', {
      fullPage: true,
      threshold: 0.2,
    });
    
    // Navigate to next question
    await page.click('button:has-text("Next")');
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveScreenshot('assessment-question-2.png', {
      fullPage: true,
      threshold: 0.2,
    });
  });

  test('UI Components visual consistency', async ({ page }) => {
    // Create a test page with all components (this would be a dedicated test page)
    await page.goto('/');
    
    // Test button states
    const buttons = await page.locator('button').all();
    if (buttons.length > 0) {
      const firstButton = buttons[0];
      
      // Normal state
      await expect(firstButton).toHaveScreenshot('button-normal.png');
      
      // Hover state
      await firstButton.hover();
      await page.waitForTimeout(200);
      await expect(firstButton).toHaveScreenshot('button-hover.png');
      
      // Focus state
      await firstButton.focus();
      await page.waitForTimeout(200);
      await expect(firstButton).toHaveScreenshot('button-focus.png');
    }
  });

  test('Form validation visual states', async ({ page }) => {
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
    
    // Screenshot of empty contact form
    await expect(page).toHaveScreenshot('contact-form-empty.png', {
      fullPage: true,
      threshold: 0.2,
    });
    
    // Try to submit to trigger validation
    const submitButton = await page.locator('button:has-text("Get Results")').first();
    if (await submitButton.count() > 0) {
      await submitButton.click();
      await page.waitForTimeout(1000);
      
      // Screenshot with validation errors
      await expect(page).toHaveScreenshot('contact-form-errors.png', {
        fullPage: true,
        threshold: 0.2,
      });
    }
  });

  test('Dark mode visual consistency', async ({ page }) => {
    // Test dark mode if supported
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    await expect(page).toHaveScreenshot('homepage-dark-mode.png', {
      fullPage: true,
      threshold: 0.3, // Higher threshold for color scheme changes
    });
    
    // Reset to light mode
    await page.emulateMedia({ colorScheme: 'light' });
  });

  test('Loading states visual consistency', async ({ page }) => {
    // Intercept API calls to control loading states
    await page.route('/api/v1/**', route => {
      // Delay response to capture loading state
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: {} })
        });
      }, 2000);
    });
    
    await page.goto('/assessment');
    
    // Navigate to contact form and submit to see loading state
    for (let i = 0; i < 8; i++) {
      const radioButtons = await page.locator('input[type="radio"]').all();
      if (radioButtons.length > 0) {
        await radioButtons[0].check();
      }
      await page.click('button:has-text("Next")');
      await page.waitForTimeout(300);
    }
    
    // Fill contact form
    await page.fill('input[name="firstName"], label:has-text("First Name") + input', 'John');
    await page.fill('input[name="lastName"], label:has-text("Last Name") + input', 'Doe');
    await page.fill('input[type="email"], input[name="email"]', 'john@example.com');
    
    // Submit and capture loading state
    await page.click('button:has-text("Get Results")');
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('loading-state.png', {
      fullPage: true,
      threshold: 0.2,
    });
  });

  test('Error states visual consistency', async ({ page }) => {
    // Mock API error
    await page.route('/api/v1/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: 'Server error' })
      });
    });
    
    await page.goto('/assessment');
    
    // Complete assessment to trigger API call
    for (let i = 0; i < 8; i++) {
      const radioButtons = await page.locator('input[type="radio"]').all();
      if (radioButtons.length > 0) {
        await radioButtons[0].check();
      }
      await page.click('button:has-text("Next")');
      await page.waitForTimeout(300);
    }
    
    await page.fill('input[name="firstName"], label:has-text("First Name") + input', 'John');
    await page.fill('input[name="lastName"], label:has-text("Last Name") + input', 'Doe');
    await page.fill('input[type="email"], input[name="email"]', 'john@example.com');
    
    await page.click('button:has-text("Get Results")');
    await page.waitForTimeout(2000);
    
    // Screenshot error state if it appears
    const errorElements = await page.locator('[role="alert"], .error').all();
    if (errorElements.length > 0) {
      await expect(page).toHaveScreenshot('error-state.png', {
        fullPage: true,
        threshold: 0.2,
      });
    }
  });

  test('Responsive breakpoints visual consistency', async ({ page }) => {
    const breakpoints = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1280, height: 720 },
      { name: 'large-desktop', width: 1920, height: 1080 },
    ];
    
    for (const breakpoint of breakpoints) {
      await page.setViewportSize({ width: breakpoint.width, height: breakpoint.height });
      await page.goto('/');
      await page.waitForTimeout(1000);
      
      await expect(page).toHaveScreenshot(`homepage-${breakpoint.name}.png`, {
        fullPage: true,
        threshold: 0.2,
      });
    }
  });

  test('Animation consistency', async ({ page }) => {
    // Disable animations for consistent screenshots
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-delay: -1ms !important;
          animation-duration: 1ms !important;
          animation-iteration-count: 1 !important;
          background-attachment: initial !important;
          scroll-behavior: auto !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `
    });
    
    await page.goto('/');
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveScreenshot('homepage-no-animations.png', {
      fullPage: true,
      threshold: 0.1, // Lower threshold since animations are disabled
    });
  });

  test('Print styles visual consistency', async ({ page }) => {
    await page.goto('/');
    
    // Emulate print media
    await page.emulateMedia({ media: 'print' });
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveScreenshot('homepage-print.png', {
      fullPage: true,
      threshold: 0.3,
    });
    
    // Reset to screen media
    await page.emulateMedia({ media: 'screen' });
  });
});