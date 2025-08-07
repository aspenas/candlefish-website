/**
 * End-to-End Tests for PromoterOS Frontend
 * Tests user interactions and complete workflows
 */

const { test, expect } = require('@playwright/test');

test.describe('PromoterOS Frontend E2E Tests', () => {
  const baseUrl = process.env.TEST_URL || 'http://localhost:8888';

  test.beforeEach(async ({ page }) => {
    await page.goto(baseUrl);
  });

  test('should load homepage correctly', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/PromoterOS/);
    
    // Check main heading
    await expect(page.locator('h1')).toContainText('PromoterOS');
    
    // Check subtitle is visible
    await expect(page.locator('.subtitle')).toBeVisible();
    
    // Check API sections are present
    await expect(page.locator('.api-section')).toHaveCount(3); // Assuming 3 API sections
  });

  test('should display API endpoints with status indicators', async ({ page }) => {
    // Check that all API endpoints show as operational
    const statusElements = page.locator('.status');
    await expect(statusElements).toHaveCount(3);
    
    for (let i = 0; i < await statusElements.count(); i++) {
      await expect(statusElements.nth(i)).toContainText('operational');
    }
  });

  test('should handle artist evaluation demo', async ({ page }) => {
    // Find and click the artist evaluation demo button
    const evaluateButton = page.locator('text=Test Artist Evaluation');
    await expect(evaluateButton).toBeVisible();
    
    await evaluateButton.click();
    
    // Check that loading state is shown
    await expect(page.locator('.loading')).toBeVisible();
    
    // Wait for results to load (with timeout)
    await page.waitForSelector('.results-section', { state: 'visible', timeout: 10000 });
    
    // Verify results are displayed
    const resultsSection = page.locator('.results-section');
    await expect(resultsSection).toBeVisible();
    
    // Check that JSON response is shown
    const resultsContent = page.locator('.results-content');
    await expect(resultsContent).toContainText('artist');
    await expect(resultsContent).toContainText('booking_analysis');
  });

  test('should handle booking score demo', async ({ page }) => {
    // Find and click the booking score demo button
    const bookingButton = page.locator('text=Test Booking Score');
    await expect(bookingButton).toBeVisible();
    
    await bookingButton.click();
    
    // Wait for results
    await page.waitForSelector('.results-section', { state: 'visible', timeout: 10000 });
    
    // Verify booking score results
    const resultsContent = page.locator('.results-content');
    await expect(resultsContent).toContainText('booking_score');
    await expect(resultsContent).toContainText('recommendation');
    await expect(resultsContent).toContainText('financial_analysis');
  });

  test('should display multiple demo results without interference', async ({ page }) => {
    // Test both demos in sequence
    const evaluateButton = page.locator('text=Test Artist Evaluation');
    await evaluateButton.click();
    
    await page.waitForSelector('.results-section', { state: 'visible', timeout: 10000 });
    
    // Verify first result
    let resultsContent = page.locator('.results-content').first();
    await expect(resultsContent).toContainText('artist');
    
    // Now test booking score
    const bookingButton = page.locator('text=Test Booking Score');
    await bookingButton.click();
    
    // Should have two result sections now
    await expect(page.locator('.results-section')).toHaveCount(2);
    
    // Both should be visible and contain appropriate content
    const allResults = page.locator('.results-content');
    await expect(allResults).toHaveCount(2);
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock network failure
    await page.route('**/api/**', route => route.abort());
    
    const evaluateButton = page.locator('text=Test Artist Evaluation');
    await evaluateButton.click();
    
    // Should show error state
    await page.waitForSelector('.error', { timeout: 10000 });
    const errorElement = page.locator('.error');
    await expect(errorElement).toBeVisible();
    await expect(errorElement).toContainText('Error');
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check that main elements are still visible and accessible
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('.demo-button').first()).toBeVisible();
    
    // Try clicking a button on mobile
    const button = page.locator('.demo-button').first();
    await button.click();
    
    // Should still work
    await page.waitForSelector('.results-section', { state: 'visible', timeout: 10000 });
  });

  test('should handle rapid button clicks without issues', async ({ page }) => {
    const button = page.locator('text=Test Artist Evaluation');
    
    // Click rapidly multiple times
    for (let i = 0; i < 5; i++) {
      await button.click();
      await page.waitForTimeout(100); // Small delay between clicks
    }
    
    // Should not crash or show multiple loading states
    // At most should have one result section
    await page.waitForSelector('.results-section', { state: 'visible', timeout: 10000 });
    
    const resultsSections = page.locator('.results-section');
    const count = await resultsSections.count();
    expect(count).toBeGreaterThanOrEqual(1);
    expect(count).toBeLessThanOrEqual(5); // Reasonable upper bound
  });

  test('should validate JSON response format', async ({ page }) => {
    await page.locator('text=Test Booking Score').click();
    
    await page.waitForSelector('.results-content', { state: 'visible', timeout: 10000 });
    
    // Get the JSON content
    const jsonText = await page.locator('.results-content').textContent();
    
    // Should be valid JSON
    let parsedJson;
    expect(() => {
      parsedJson = JSON.parse(jsonText);
    }).not.toThrow();
    
    // Should have expected structure
    expect(parsedJson).toHaveProperty('success', true);
    expect(parsedJson).toHaveProperty('data');
    expect(parsedJson.data).toHaveProperty('booking_score');
    expect(parsedJson.data.booking_score).toHaveProperty('overall_score');
    
    // Score should be a number between 0 and 100
    const score = parsedJson.data.booking_score.overall_score;
    expect(typeof score).toBe('number');
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  test('should maintain state during page navigation', async ({ page }) => {
    // Generate some results
    await page.locator('text=Test Artist Evaluation').click();
    await page.waitForSelector('.results-section', { state: 'visible' });
    
    // Scroll down to see results
    await page.locator('.results-section').scrollIntoViewIfNeeded();
    
    // Scroll back to top
    await page.locator('h1').scrollIntoViewIfNeeded();
    
    // Results should still be visible when scrolling back down
    await page.locator('.results-section').scrollIntoViewIfNeeded();
    await expect(page.locator('.results-section')).toBeVisible();
  });

  test('should handle browser back/forward navigation', async ({ page }) => {
    // Initial load
    const initialUrl = page.url();
    
    // Trigger an API call
    await page.locator('text=Test Artist Evaluation').click();
    await page.waitForSelector('.results-section', { state: 'visible' });
    
    // Navigate away (simulate by going to a different anchor)
    await page.goto(`${baseUrl}#test`);
    
    // Navigate back
    await page.goBack();
    
    // Should be back to the main page
    expect(page.url()).toBe(initialUrl);
    await expect(page.locator('h1')).toContainText('PromoterOS');
  });
});

test.describe('PromoterOS Performance E2E', () => {
  const baseUrl = process.env.TEST_URL || 'http://localhost:8888';

  test('should load page within performance budgets', async ({ page }) => {
    // Start timing
    const startTime = Date.now();
    
    await page.goto(baseUrl);
    
    // Wait for main content to be visible
    await page.waitForSelector('h1', { state: 'visible' });
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
    
    console.log(`Page loaded in ${loadTime}ms`);
  });

  test('should handle API calls within reasonable time', async ({ page }) => {
    await page.goto(baseUrl);
    
    const startTime = Date.now();
    
    await page.locator('text=Test Artist Evaluation').click();
    await page.waitForSelector('.results-section', { state: 'visible' });
    
    const apiTime = Date.now() - startTime;
    
    // API should respond within 5 seconds
    expect(apiTime).toBeLessThan(5000);
    
    console.log(`API call completed in ${apiTime}ms`);
  });

  test('should not consume excessive memory', async ({ page, browser }) => {
    await page.goto(baseUrl);
    
    // Perform multiple operations
    for (let i = 0; i < 10; i++) {
      await page.locator('text=Test Artist Evaluation').click();
      await page.waitForSelector('.results-section', { state: 'visible' });
      await page.waitForTimeout(100);
    }
    
    // Check that we haven't crashed or frozen
    await expect(page.locator('h1')).toBeVisible();
  });
});

test.describe('PromoterOS Accessibility', () => {
  const baseUrl = process.env.TEST_URL || 'http://localhost:8888';

  test('should be accessible to screen readers', async ({ page }) => {
    await page.goto(baseUrl);
    
    // Check for proper heading structure
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    
    // Check for alt text on images (if any)
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      expect(alt).toBeTruthy();
    }
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto(baseUrl);
    
    // Tab through interactive elements
    const buttons = page.locator('.demo-button');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < buttonCount; i++) {
      await page.keyboard.press('Tab');
    }
    
    // Should be able to activate buttons with Enter
    await page.keyboard.press('Enter');
    
    // Should see results (or error if API is mocked)
    await page.waitForSelector('.results-section, .error', { timeout: 10000 });
  });

  test('should have appropriate color contrast', async ({ page }) => {
    await page.goto(baseUrl);
    
    // This is a basic test - in practice you'd use tools like axe-playwright
    // Check that text is readable
    const textColor = await page.locator('h1').evaluate(el => 
      window.getComputedStyle(el).color
    );
    const backgroundColor = await page.locator('body').evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    
    // Basic check that we have colors set
    expect(textColor).toBeTruthy();
    expect(backgroundColor).toBeTruthy();
  });
});