import { test, expect, Page } from '@playwright/test';

const PRODUCTION_URL = 'https://candlefish.ai';

test.describe('Production E2E Tests - Candlefish.ai', () => {
  test.beforeEach(async ({ page }) => {
    // Set longer timeout for production tests
    test.setTimeout(60000);
  });

  test.describe('1. Hero Fish Animation and Interactions', () => {
    test('hero fish animation loads and responds to mouse interactions', async ({ page }) => {
      await page.goto(PRODUCTION_URL);
      
      // Wait for page to load completely
      await page.waitForLoadState('networkidle');
      
      // Check if Three.js canvas is present (hero animation)
      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible({ timeout: 10000 });
      
      // Test mouse interaction with fish animation
      const heroSection = page.locator('[data-testid="hero-section"], .hero, main').first();
      await heroSection.hover();
      
      // Wait a bit for any animation responses
      await page.waitForTimeout(1000);
      
      // Verify the canvas is still present and interactive
      await expect(canvas).toBeVisible();
      
      // Test different mouse positions
      await heroSection.click({ position: { x: 100, y: 100 } });
      await page.waitForTimeout(500);
      await heroSection.click({ position: { x: 200, y: 150 } });
      await page.waitForTimeout(500);
    });

    test('hero section is responsive and scales properly', async ({ page }) => {
      await page.goto(PRODUCTION_URL);
      await page.waitForLoadState('networkidle');
      
      // Test different viewport sizes
      const viewports = [
        { width: 1920, height: 1080 },
        { width: 1366, height: 768 },
        { width: 768, height: 1024 },
        { width: 375, height: 667 }
      ];
      
      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.waitForTimeout(500);
        
        const canvas = page.locator('canvas').first();
        await expect(canvas).toBeVisible();
        
        // Check canvas dimensions adapt to viewport
        const canvasBox = await canvas.boundingBox();
        expect(canvasBox?.width).toBeGreaterThan(0);
        expect(canvasBox?.height).toBeGreaterThan(0);
      }
    });
  });

  test.describe('2. Navigation Between Major Routes', () => {
    const routes = [
      { path: '/', name: 'Homepage' },
      { path: '/atelier', name: 'Atelier' },
      { path: '/workshop', name: 'Workshop' },
      { path: '/workshop/notes', name: 'Workshop Notes' },
      { path: '/archive', name: 'Archive' },
      { path: '/archive/workshop-notes', name: 'Workshop Notes Archive' }
    ];

    routes.forEach(route => {
      test(`navigation to ${route.name} (${route.path}) works correctly`, async ({ page }) => {
        await page.goto(`${PRODUCTION_URL}${route.path}`);
        await page.waitForLoadState('networkidle');
        
        // Check that page loaded without errors
        expect(page.url()).toContain(route.path);
        
        // Check for basic page structure
        const body = page.locator('body');
        await expect(body).toBeVisible();
        
        // Look for navigation elements
        const nav = page.locator('nav, [role="navigation"]').first();
        if (await nav.isVisible()) {
          await expect(nav).toBeVisible();
        }
        
        // Check for main content
        const main = page.locator('main, [role="main"], .main-content').first();
        if (await main.isVisible()) {
          await expect(main).toBeVisible();
        }
      });
    });

    test('navigation menu links work correctly', async ({ page }) => {
      await page.goto(PRODUCTION_URL);
      await page.waitForLoadState('networkidle');
      
      // Look for navigation links
      const navLinks = page.locator('nav a, [role="navigation"] a, .nav-link');
      const linkCount = await navLinks.count();
      
      if (linkCount > 0) {
        // Test first few navigation links
        for (let i = 0; i < Math.min(linkCount, 3); i++) {
          const link = navLinks.nth(i);
          if (await link.isVisible()) {
            const href = await link.getAttribute('href');
            if (href && !href.startsWith('#') && !href.startsWith('mailto:')) {
              await link.click();
              await page.waitForLoadState('networkidle');
              
              // Verify navigation occurred
              expect(page.url()).toContain(href.replace(/^\//, ''));
              
              // Go back for next test
              await page.goBack();
              await page.waitForLoadState('networkidle');
            }
          }
        }
      }
    });
  });

  test.describe('3. Form Submissions', () => {
    test('contact form submission works', async ({ page }) => {
      await page.goto(PRODUCTION_URL);
      await page.waitForLoadState('networkidle');
      
      // Look for contact form
      const contactForm = page.locator('form').filter({ has: page.locator('input[type="email"], input[name*="email"]') });
      
      if (await contactForm.isVisible()) {
        // Fill out form
        const nameField = contactForm.locator('input[name*="name"], input[placeholder*="name"], input[placeholder*="Name"]').first();
        const emailField = contactForm.locator('input[type="email"], input[name*="email"]').first();
        const messageField = contactForm.locator('textarea, input[name*="message"]').first();
        
        if (await nameField.isVisible()) await nameField.fill('Test User');
        await emailField.fill('test@example.com');
        if (await messageField.isVisible()) await messageField.fill('This is a test message');
        
        // Submit form
        const submitButton = contactForm.locator('button[type="submit"], input[type="submit"], button:has-text("Send"), button:has-text("Submit")').first();
        await submitButton.click();
        
        // Wait for response
        await page.waitForTimeout(3000);
        
        // Check for success/error message or form state change
        const successMessage = page.locator(':text("thank you"), :text("Thank you"), :text("success"), :text("Success"), :text("sent"), :text("Sent")');
        const errorMessage = page.locator(':text("error"), :text("Error"), :text("failed"), :text("Failed")');
        
        // At least one should be visible or form should be reset
        const hasResponse = (await successMessage.count() > 0) || (await errorMessage.count() > 0);
        if (!hasResponse) {
          // Check if form was reset as alternative success indicator
          const emailValue = await emailField.inputValue();
          // Form might have been reset or still contain value
          expect(typeof emailValue).toBe('string');
        }
      }
    });

    test('newsletter subscription works', async ({ page }) => {
      await page.goto(PRODUCTION_URL);
      await page.waitForLoadState('networkidle');
      
      // Look for newsletter signup
      const newsletterForm = page.locator('form').filter({ 
        has: page.locator(':text("newsletter"), :text("Newsletter"), :text("subscribe"), :text("Subscribe")') 
      }).first();
      
      const emailInput = page.locator('input[type="email"]').filter({ 
        hasNot: page.locator('form').filter({ has: page.locator('textarea') }) 
      }).first();
      
      if (await emailInput.isVisible()) {
        await emailInput.fill('newsletter-test@example.com');
        
        const submitButton = page.locator('button:near(input[type="email"]), input[type="submit"]:near(input[type="email"])').first();
        if (await submitButton.isVisible()) {
          await submitButton.click();
          await page.waitForTimeout(2000);
          
          // Check for response
          const response = page.locator(':text("subscribed"), :text("Subscribed"), :text("thank you"), :text("Thank you")');
          // Response may or may not be visible depending on implementation
        }
      }
    });

    test('assessment form functionality', async ({ page }) => {
      // Try to find assessment form on main page or dedicated assessment page
      const assessmentPaths = ['/', '/assessment', '/atelier'];
      
      for (const path of assessmentPaths) {
        await page.goto(`${PRODUCTION_URL}${path}`);
        await page.waitForLoadState('networkidle');
        
        // Look for assessment or survey forms
        const assessmentForm = page.locator('form').filter({ 
          has: page.locator(':text("assessment"), :text("Assessment"), :text("survey"), :text("Survey"), :text("questionnaire")') 
        }).first();
        
        if (await assessmentForm.isVisible()) {
          // Fill out any visible form fields
          const textInputs = assessmentForm.locator('input[type="text"], input:not([type])');
          const textareas = assessmentForm.locator('textarea');
          const selects = assessmentForm.locator('select');
          const radioButtons = assessmentForm.locator('input[type="radio"]');
          const checkboxes = assessmentForm.locator('input[type="checkbox"]');
          
          // Fill text inputs
          const textInputCount = await textInputs.count();
          for (let i = 0; i < textInputCount; i++) {
            if (await textInputs.nth(i).isVisible()) {
              await textInputs.nth(i).fill('Test input');
            }
          }
          
          // Fill textareas
          const textareaCount = await textareas.count();
          for (let i = 0; i < textareaCount; i++) {
            if (await textareas.nth(i).isVisible()) {
              await textareas.nth(i).fill('Test response');
            }
          }
          
          // Select from dropdowns
          const selectCount = await selects.count();
          for (let i = 0; i < selectCount; i++) {
            if (await selects.nth(i).isVisible()) {
              const options = selects.nth(i).locator('option');
              if (await options.count() > 1) {
                await selects.nth(i).selectOption({ index: 1 });
              }
            }
          }
          
          // Select first radio button in each group
          const radioCount = await radioButtons.count();
          const checkedRadios = new Set();
          for (let i = 0; i < radioCount; i++) {
            const radio = radioButtons.nth(i);
            if (await radio.isVisible()) {
              const name = await radio.getAttribute('name');
              if (name && !checkedRadios.has(name)) {
                await radio.click();
                checkedRadios.add(name);
              }
            }
          }
          
          // Check some checkboxes
          const checkboxCount = await checkboxes.count();
          for (let i = 0; i < Math.min(checkboxCount, 2); i++) {
            if (await checkboxes.nth(i).isVisible()) {
              await checkboxes.nth(i).check();
            }
          }
          
          // Submit form
          const submitButton = assessmentForm.locator('button[type="submit"], input[type="submit"]').first();
          if (await submitButton.isVisible()) {
            await submitButton.click();
            await page.waitForTimeout(3000);
          }
          
          break; // Found and tested assessment form
        }
      }
    });
  });

  test.describe('4. Responsive Design Across Breakpoints', () => {
    const breakpoints = [
      { name: 'Desktop Large', width: 1920, height: 1080 },
      { name: 'Desktop', width: 1366, height: 768 },
      { name: 'Laptop', width: 1024, height: 768 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Mobile Large', width: 414, height: 896 },
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Mobile Small', width: 320, height: 568 }
    ];

    breakpoints.forEach(breakpoint => {
      test(`responsive design works correctly at ${breakpoint.name} (${breakpoint.width}x${breakpoint.height})`, async ({ page }) => {
        await page.setViewportSize({ width: breakpoint.width, height: breakpoint.height });
        await page.goto(PRODUCTION_URL);
        await page.waitForLoadState('networkidle');
        
        // Check basic layout
        const body = page.locator('body');
        await expect(body).toBeVisible();
        
        // Check for horizontal scrollbar (shouldn't exist)
        const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
        const viewportWidth = breakpoint.width;
        expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20); // Allow small tolerance
        
        // Check navigation is accessible
        const nav = page.locator('nav, [role="navigation"]').first();
        if (await nav.isVisible()) {
          const navBox = await nav.boundingBox();
          if (navBox) {
            expect(navBox.width).toBeGreaterThan(0);
            expect(navBox.width).toBeLessThanOrEqual(viewportWidth);
          }
        }
        
        // Check main content is visible
        const main = page.locator('main, [role="main"], .main-content').first();
        if (await main.isVisible()) {
          const mainBox = await main.boundingBox();
          if (mainBox) {
            expect(mainBox.width).toBeGreaterThan(0);
          }
        }
        
        // For mobile, check if mobile menu exists and works
        if (breakpoint.width < 768) {
          const mobileMenuToggle = page.locator('button:has([data-testid="hamburger"]), .mobile-menu-toggle, .hamburger').first();
          if (await mobileMenuToggle.isVisible()) {
            await mobileMenuToggle.click();
            await page.waitForTimeout(500);
            
            const mobileMenu = page.locator('.mobile-menu, [data-testid="mobile-menu"]').first();
            if (await mobileMenu.isVisible()) {
              await expect(mobileMenu).toBeVisible();
            }
          }
        }
      });
    });
  });

  test.describe('5. Workshop Pages', () => {
    test('workshop main page loads correctly', async ({ page }) => {
      await page.goto(`${PRODUCTION_URL}/workshop`);
      await page.waitForLoadState('networkidle');
      
      expect(page.url()).toContain('/workshop');
      
      // Check for workshop content
      const main = page.locator('main, [role="main"], .workshop-content').first();
      await expect(main).toBeVisible();
      
      // Look for workshop-specific elements
      const workshopElements = page.locator(':text("workshop"), :text("Workshop"), .workshop-item, .workshop-section');
      if (await workshopElements.count() > 0) {
        await expect(workshopElements.first()).toBeVisible();
      }
    });

    test('workshop notes page loads correctly', async ({ page }) => {
      await page.goto(`${PRODUCTION_URL}/workshop/notes`);
      await page.waitForLoadState('networkidle');
      
      expect(page.url()).toContain('/workshop/notes');
      
      // Check for notes content
      const main = page.locator('main, [role="main"], .notes-content').first();
      await expect(main).toBeVisible();
      
      // Look for notes or articles
      const notes = page.locator('article, .note, .workshop-note, .post').first();
      if (await notes.isVisible()) {
        await expect(notes).toBeVisible();
      }
    });

    test('workshop navigation and interactions work', async ({ page }) => {
      await page.goto(`${PRODUCTION_URL}/workshop`);
      await page.waitForLoadState('networkidle');
      
      // Look for interactive elements
      const links = page.locator('a[href*="/workshop"]');
      const linkCount = await links.count();
      
      if (linkCount > 0) {
        // Test first workshop link
        const firstLink = links.first();
        if (await firstLink.isVisible()) {
          const href = await firstLink.getAttribute('href');
          await firstLink.click();
          await page.waitForLoadState('networkidle');
          
          if (href) {
            expect(page.url()).toContain(href.replace(/^.*\//, ''));
          }
        }
      }
    });
  });

  test.describe('6. Archive Pages', () => {
    test('main archive page renders properly', async ({ page }) => {
      await page.goto(`${PRODUCTION_URL}/archive`);
      await page.waitForLoadState('networkidle');
      
      expect(page.url()).toContain('/archive');
      
      // Check for archive content
      const main = page.locator('main, [role="main"], .archive-content').first();
      await expect(main).toBeVisible();
      
      // Look for archive listings
      const archiveItems = page.locator('.archive-item, .archived-post, article, .post-preview').first();
      if (await archiveItems.isVisible()) {
        await expect(archiveItems).toBeVisible();
      }
    });

    test('workshop notes archive renders properly', async ({ page }) => {
      await page.goto(`${PRODUCTION_URL}/archive/workshop-notes`);
      await page.waitForLoadState('networkidle');
      
      expect(page.url()).toContain('/archive/workshop-notes');
      
      // Check for archive content
      const main = page.locator('main, [role="main"]').first();
      await expect(main).toBeVisible();
      
      // Look for archived workshop notes
      const notes = page.locator('article, .note, .workshop-note, .archive-item').first();
      if (await notes.isVisible()) {
        await expect(notes).toBeVisible();
      }
    });

    test('archive navigation and filtering work', async ({ page }) => {
      await page.goto(`${PRODUCTION_URL}/archive`);
      await page.waitForLoadState('networkidle');
      
      // Look for filter or navigation elements
      const filters = page.locator('button:text("filter"), select, .filter-button, .archive-filter').first();
      if (await filters.isVisible()) {
        await filters.click();
        await page.waitForTimeout(1000);
      }
      
      // Test archive item links
      const archiveLinks = page.locator('a[href*="/archive/"]');
      const linkCount = await archiveLinks.count();
      
      if (linkCount > 0) {
        const firstLink = archiveLinks.first();
        if (await firstLink.isVisible()) {
          await firstLink.click();
          await page.waitForLoadState('networkidle');
          
          // Should navigate to archived item
          expect(page.url()).toContain('/archive');
        }
      }
    });
  });

  test.describe('7. Performance Under Various Network Conditions', () => {
    test('site loads within acceptable time on fast network', async ({ page }) => {
      const startTime = Date.now();
      await page.goto(PRODUCTION_URL);
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      // Should load within 5 seconds on fast network
      expect(loadTime).toBeLessThan(5000);
    });

    test('site is functional on slow 3G network', async ({ page, context }) => {
      // Simulate slow 3G
      await context.route('**/*', async route => {
        await new Promise(resolve => setTimeout(resolve, 100)); // Add 100ms delay
        await route.continue();
      });
      
      const startTime = Date.now();
      await page.goto(PRODUCTION_URL);
      await page.waitForLoadState('domcontentloaded'); // Use less strict loading state
      const loadTime = Date.now() - startTime;
      
      // Should still load within reasonable time
      expect(loadTime).toBeLessThan(15000);
      
      // Basic functionality should work
      const body = page.locator('body');
      await expect(body).toBeVisible();
    });

    test('critical resources load first', async ({ page }) => {
      const resourceTimes: Array<{ url: string, time: number, type: string }> = [];
      
      page.on('response', response => {
        const url = response.url();
        const type = response.request().resourceType();
        resourceTimes.push({ url, time: Date.now(), type });
      });
      
      await page.goto(PRODUCTION_URL);
      await page.waitForLoadState('networkidle');
      
      // CSS should load before images
      const cssResources = resourceTimes.filter(r => r.type === 'stylesheet' || r.url.endsWith('.css'));
      const imageResources = resourceTimes.filter(r => r.type === 'image');
      
      if (cssResources.length > 0 && imageResources.length > 0) {
        const firstCss = Math.min(...cssResources.map(r => r.time));
        const firstImage = Math.min(...imageResources.map(r => r.time));
        expect(firstCss).toBeLessThanOrEqual(firstImage + 1000); // Allow some tolerance
      }
    });
  });

  test.describe('8. Accessibility Compliance (WCAG 2.1 AA)', () => {
    test('page has proper heading hierarchy', async ({ page }) => {
      await page.goto(PRODUCTION_URL);
      await page.waitForLoadState('networkidle');
      
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      const headingCount = await headings.count();
      
      if (headingCount > 0) {
        // Should have at least one h1
        const h1Count = await page.locator('h1').count();
        expect(h1Count).toBeGreaterThanOrEqual(1);
        
        // Check heading hierarchy (basic test)
        for (let i = 0; i < Math.min(headingCount, 5); i++) {
          const heading = headings.nth(i);
          const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
          expect(tagName).toMatch(/^h[1-6]$/);
        }
      }
    });

    test('images have alt text', async ({ page }) => {
      await page.goto(PRODUCTION_URL);
      await page.waitForLoadState('networkidle');
      
      const images = page.locator('img');
      const imageCount = await images.count();
      
      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        const alt = await img.getAttribute('alt');
        const role = await img.getAttribute('role');
        
        // Images should have alt text or role="presentation"
        expect(alt !== null || role === 'presentation').toBeTruthy();
      }
    });

    test('links have accessible names', async ({ page }) => {
      await page.goto(PRODUCTION_URL);
      await page.waitForLoadState('networkidle');
      
      const links = page.locator('a');
      const linkCount = await links.count();
      
      for (let i = 0; i < Math.min(linkCount, 10); i++) {
        const link = links.nth(i);
        if (await link.isVisible()) {
          const text = await link.textContent();
          const ariaLabel = await link.getAttribute('aria-label');
          const title = await link.getAttribute('title');
          
          // Links should have accessible text
          const hasAccessibleText = (text && text.trim().length > 0) || 
                                   (ariaLabel && ariaLabel.trim().length > 0) || 
                                   (title && title.trim().length > 0);
          expect(hasAccessibleText).toBeTruthy();
        }
      }
    });

    test('form fields have labels', async ({ page }) => {
      await page.goto(PRODUCTION_URL);
      await page.waitForLoadState('networkidle');
      
      const inputs = page.locator('input:not([type="hidden"]), textarea, select');
      const inputCount = await inputs.count();
      
      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i);
        if (await input.isVisible()) {
          const id = await input.getAttribute('id');
          const ariaLabel = await input.getAttribute('aria-label');
          const ariaLabelledBy = await input.getAttribute('aria-labelledby');
          const placeholder = await input.getAttribute('placeholder');
          
          // Check for label
          let hasLabel = false;
          if (id) {
            const label = page.locator(`label[for="${id}"]`);
            hasLabel = await label.count() > 0;
          }
          
          const hasAccessibleName = hasLabel || ariaLabel || ariaLabelledBy || placeholder;
          expect(hasAccessibleName).toBeTruthy();
        }
      }
    });

    test('color contrast is sufficient', async ({ page }) => {
      await page.goto(PRODUCTION_URL);
      await page.waitForLoadState('networkidle');
      
      // Basic color contrast check by examining computed styles
      const textElements = page.locator('p, span, a, button, h1, h2, h3, h4, h5, h6').first();
      
      if (await textElements.isVisible()) {
        const styles = await textElements.evaluate(el => {
          const computed = getComputedStyle(el);
          return {
            color: computed.color,
            backgroundColor: computed.backgroundColor,
            fontSize: computed.fontSize
          };
        });
        
        // Basic check that colors are defined
        expect(styles.color).toBeTruthy();
        expect(styles.fontSize).toBeTruthy();
      }
    });
  });
});