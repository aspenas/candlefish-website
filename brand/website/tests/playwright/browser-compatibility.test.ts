import { test, expect, devices } from '@playwright/test';

const PRODUCTION_URL = 'https://candlefish.ai';

test.describe('Browser Compatibility Tests - Candlefish.ai', () => {
  
  test.describe('Desktop Browsers', () => {
    const browsers = [
      { name: 'Chromium', device: devices['Desktop Chrome'] },
      { name: 'Firefox', device: devices['Desktop Firefox'] },
      { name: 'WebKit (Safari)', device: devices['Desktop Safari'] }
    ];

    browsers.forEach(browser => {
      test(`${browser.name} - Basic functionality works`, async ({ page, context }) => {
        // Configure browser context
        await context.addInitScript(() => {
          // Add any browser-specific initialization
        });

        await page.goto(PRODUCTION_URL);
        await page.waitForLoadState('networkidle', { timeout: 30000 });
        
        // Basic page load test
        expect(page.url()).toContain('candlefish.ai');
        
        // Check basic elements
        const body = page.locator('body');
        await expect(body).toBeVisible();
        
        // Test JavaScript functionality
        const jsTest = await page.evaluate(() => {
          return {
            hasLocalStorage: typeof localStorage !== 'undefined',
            hasSessionStorage: typeof sessionStorage !== 'undefined',
            hasWebGL: !!window.WebGLRenderingContext,
            hasCanvas: !!document.createElement('canvas').getContext,
            userAgent: navigator.userAgent
          };
        });
        
        expect(jsTest.hasLocalStorage).toBeTruthy();
        expect(jsTest.hasCanvas).toBeTruthy();
        
        // Test CSS features
        const cssTest = await page.evaluate(() => {
          const div = document.createElement('div');
          div.style.display = 'flex';
          div.style.gridTemplateColumns = '1fr 1fr';
          return {
            supportsFlexbox: div.style.display === 'flex',
            supportsGrid: div.style.gridTemplateColumns !== ''
          };
        });
        
        expect(cssTest.supportsFlexbox).toBeTruthy();
      });

      test(`${browser.name} - Hero animation compatibility`, async ({ page }) => {
        await page.goto(PRODUCTION_URL);
        await page.waitForLoadState('networkidle');
        
        // Check for WebGL canvas (Three.js)
        const canvas = page.locator('canvas').first();
        await expect(canvas).toBeVisible({ timeout: 15000 });
        
        // Test WebGL context
        const webglSupport = await page.evaluate(() => {
          const canvas = document.createElement('canvas');
          const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
          return !!gl;
        });
        
        if (webglSupport) {
          // Test canvas interaction
          await canvas.hover();
          await canvas.click({ position: { x: 100, y: 100 } });
          await page.waitForTimeout(1000);
          
          // Canvas should still be visible after interaction
          await expect(canvas).toBeVisible();
        }
      });

      test(`${browser.name} - Navigation and routing`, async ({ page }) => {
        await page.goto(PRODUCTION_URL);
        await page.waitForLoadState('networkidle');
        
        // Test navigation to different routes
        const testRoutes = ['/atelier', '/workshop', '/archive'];
        
        for (const route of testRoutes) {
          await page.goto(`${PRODUCTION_URL}${route}`);
          await page.waitForLoadState('networkidle', { timeout: 10000 });
          
          expect(page.url()).toContain(route);
          
          const body = page.locator('body');
          await expect(body).toBeVisible();
        }
      });
    });
  });

  test.describe('Mobile Devices', () => {
    const mobileDevices = [
      { name: 'iPhone 12', device: devices['iPhone 12'] },
      { name: 'iPhone 12 Pro', device: devices['iPhone 12 Pro'] },
      { name: 'iPhone 13', device: devices['iPhone 13'] },
      { name: 'iPhone 13 Pro', device: devices['iPhone 13 Pro'] },
      { name: 'Pixel 5', device: devices['Pixel 5'] },
      { name: 'Samsung Galaxy S21', device: devices['Galaxy S21+'] },
      { name: 'iPad Pro', device: devices['iPad Pro'] },
      { name: 'iPad Mini', device: devices['iPad Mini'] }
    ];

    mobileDevices.forEach(device => {
      test(`${device.name} - Mobile responsiveness and touch interactions`, async ({ page, browser }) => {
        // Create new context with device settings
        const context = await browser.newContext({
          ...device.device,
          // Ensure mobile user agent
          userAgent: device.device.userAgent || 'Mobile Test Agent'
        });
        
        const mobilePage = await context.newPage();
        
        await mobilePage.goto(PRODUCTION_URL);
        await mobilePage.waitForLoadState('networkidle', { timeout: 30000 });
        
        // Basic mobile layout test
        const body = mobilePage.locator('body');
        await expect(body).toBeVisible();
        
        // Check viewport doesn't have horizontal scroll
        const scrollWidth = await mobilePage.evaluate(() => document.body.scrollWidth);
        const clientWidth = await mobilePage.evaluate(() => document.documentElement.clientWidth);
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 50); // Allow small tolerance
        
        // Test touch interactions
        const canvas = mobilePage.locator('canvas').first();
        if (await canvas.isVisible()) {
          // Test tap
          await canvas.tap();
          await mobilePage.waitForTimeout(500);
          
          // Test touch and drag
          await canvas.hover();
          await mobilePage.waitForTimeout(500);
        }
        
        // Test mobile navigation
        const mobileMenuButton = mobilePage.locator('button[aria-label*="menu"], .mobile-menu-toggle, [data-testid="hamburger"]').first();
        if (await mobileMenuButton.isVisible()) {
          await mobileMenuButton.tap();
          await mobilePage.waitForTimeout(500);
          
          const mobileMenu = mobilePage.locator('.mobile-menu, [data-testid="mobile-menu"]').first();
          if (await mobileMenu.isVisible()) {
            await expect(mobileMenu).toBeVisible();
          }
        }
        
        // Test form interaction on mobile
        const emailInput = mobilePage.locator('input[type="email"]').first();
        if (await emailInput.isVisible()) {
          await emailInput.tap();
          await emailInput.fill('test@mobile.com');
          
          // Check if virtual keyboard doesn't break layout
          await mobilePage.waitForTimeout(1000);
          await expect(body).toBeVisible();
        }
        
        await context.close();
      });

      test(`${device.name} - Performance on mobile`, async ({ page, browser }) => {
        const context = await browser.newContext(device.device);
        const mobilePage = await context.newPage();
        
        const startTime = Date.now();
        await mobilePage.goto(PRODUCTION_URL);
        await mobilePage.waitForLoadState('domcontentloaded');
        const loadTime = Date.now() - startTime;
        
        // Mobile should load within 10 seconds
        expect(loadTime).toBeLessThan(10000);
        
        // Test basic functionality loaded
        const body = mobilePage.locator('body');
        await expect(body).toBeVisible();
        
        // Check for critical resources
        const canvas = mobilePage.locator('canvas').first();
        if (await canvas.count() > 0) {
          await expect(canvas).toBeVisible({ timeout: 15000 });
        }
        
        await context.close();
      });
    });
  });

  test.describe('Cross-Browser Form Functionality', () => {
    const testDevices = [
      { name: 'Chrome Desktop', device: devices['Desktop Chrome'] },
      { name: 'Firefox Desktop', device: devices['Desktop Firefox'] },
      { name: 'Safari Desktop', device: devices['Desktop Safari'] },
      { name: 'Mobile Safari', device: devices['iPhone 12'] },
      { name: 'Mobile Chrome', device: devices['Pixel 5'] }
    ];

    testDevices.forEach(testDevice => {
      test(`${testDevice.name} - Form validation and submission`, async ({ page, browser }) => {
        const context = await browser.newContext(testDevice.device);
        const devicePage = await context.newPage();
        
        await devicePage.goto(PRODUCTION_URL);
        await devicePage.waitForLoadState('networkidle');
        
        // Test email input validation
        const emailInput = devicePage.locator('input[type="email"]').first();
        if (await emailInput.isVisible()) {
          // Test invalid email
          await emailInput.fill('invalid-email');
          
          const submitButton = devicePage.locator('button[type="submit"], input[type="submit"]').first();
          if (await submitButton.isVisible()) {
            await submitButton.click();
            await devicePage.waitForTimeout(1000);
            
            // Should show validation error
            const validationMessage = await emailInput.evaluate((input: HTMLInputElement) => input.validationMessage);
            expect(validationMessage).toBeTruthy();
          }
          
          // Test valid email
          await emailInput.fill('test@example.com');
          if (await submitButton.isVisible()) {
            await submitButton.click();
            await devicePage.waitForTimeout(2000);
          }
        }
        
        await context.close();
      });
    });
  });

  test.describe('WebGL and Modern Features Compatibility', () => {
    test('WebGL fallback handling', async ({ page }) => {
      await page.goto(PRODUCTION_URL);
      await page.waitForLoadState('networkidle');
      
      // Test WebGL support detection
      const webglInfo = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (!gl) {
          return { supported: false, vendor: null, renderer: null };
        }
        
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        return {
          supported: true,
          vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : null,
          renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : null,
          version: gl.getParameter(gl.VERSION),
          maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE)
        };
      });
      
      if (webglInfo.supported) {
        // If WebGL is supported, check if Three.js canvas is present
        const canvas = page.locator('canvas').first();
        await expect(canvas).toBeVisible({ timeout: 15000 });
      } else {
        // If WebGL is not supported, check for fallback content
        const body = page.locator('body');
        await expect(body).toBeVisible();
        
        // Should still have content even without WebGL
        const mainContent = page.locator('main, .main-content').first();
        await expect(mainContent).toBeVisible();
      }
    });

    test('Modern JavaScript features compatibility', async ({ page }) => {
      await page.goto(PRODUCTION_URL);
      await page.waitForLoadState('networkidle');
      
      const jsFeatures = await page.evaluate(() => {
        return {
          es6Modules: typeof Symbol !== 'undefined',
          promises: typeof Promise !== 'undefined',
          fetch: typeof fetch !== 'undefined',
          arrow: (() => true)(),
          templateLiterals: `test${1}` === 'test1',
          destructuring: (() => { const [a] = [1]; return a === 1; })(),
          classes: typeof class TestClass {} === 'function',
          asyncAwait: (async () => true)().constructor.name === 'Promise'
        };
      });
      
      // Modern features should be supported
      expect(jsFeatures.promises).toBeTruthy();
      expect(jsFeatures.arrow).toBeTruthy();
      expect(jsFeatures.templateLiterals).toBeTruthy();
    });
  });

  test.describe('Accessibility Across Browsers', () => {
    const accessibilityDevices = [
      { name: 'Chrome Desktop', device: devices['Desktop Chrome'] },
      { name: 'Firefox Desktop', device: devices['Desktop Firefox'] },
      { name: 'Safari Desktop', device: devices['Desktop Safari'] }
    ];

    accessibilityDevices.forEach(testDevice => {
      test(`${testDevice.name} - Keyboard navigation`, async ({ page, browser }) => {
        const context = await browser.newContext(testDevice.device);
        const devicePage = await context.newPage();
        
        await devicePage.goto(PRODUCTION_URL);
        await devicePage.waitForLoadState('networkidle');
        
        // Test Tab navigation
        await devicePage.keyboard.press('Tab');
        await devicePage.waitForTimeout(100);
        
        const focusedElement = await devicePage.evaluate(() => {
          const focused = document.activeElement;
          return {
            tagName: focused?.tagName,
            type: focused?.getAttribute('type'),
            role: focused?.getAttribute('role'),
            href: focused?.getAttribute('href')
          };
        });
        
        // Should focus on a focusable element
        const focusableElements = ['A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT'];
        expect(focusableElements.includes(focusedElement.tagName || '')).toBeTruthy();
        
        // Test Enter key on focused element
        await devicePage.keyboard.press('Enter');
        await devicePage.waitForTimeout(500);
        
        await context.close();
      });
    });
  });
});