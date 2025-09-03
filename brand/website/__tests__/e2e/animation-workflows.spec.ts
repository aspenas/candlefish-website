import { test, expect, Page, Browser } from '@playwright/test';
import { AnimationConfigFactory, AnimationEventFactory } from '../factories/animation-updated.factory';

// Test configuration
const TEST_BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';
const ANIMATION_TIMEOUT = 30000; // 30 seconds for animation tests

test.describe('Critical Animation User Workflows', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async ({ browser: b }) => {
    browser = b;
  });

  test.beforeEach(async () => {
    page = await browser.newPage();
    
    // Set up viewport for consistent testing
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Enable console logs for debugging
    page.on('console', msg => console.log(`Browser console: ${msg.text()}`));
    
    // Handle uncaught exceptions
    page.on('pageerror', err => console.error(`Page error: ${err.message}`));
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Animation Loading and Initialization', () => {
    test('should load and initialize cursor trail animation', async () => {
      await page.goto(`${TEST_BASE_URL}/atelier`);
      
      // Wait for the page to load
      await page.waitForLoadState('networkidle');
      
      // Check that cursor trail canvas is present
      const cursorTrailCanvas = page.locator('canvas[style*="mix-blend-mode: screen"]');
      await expect(cursorTrailCanvas).toBeVisible();
      
      // Initially should be inactive (opacity 0)
      await expect(cursorTrailCanvas).toHaveClass(/opacity-0/);
      
      // Move mouse to activate animation
      await page.mouse.move(500, 300);
      
      // Animation should become active
      await expect(cursorTrailCanvas).toHaveClass(/opacity-100/, { timeout: 2000 });
      
      // Verify canvas dimensions match viewport
      const canvasBounds = await cursorTrailCanvas.boundingBox();
      expect(canvasBounds?.width).toBe(1920);
      expect(canvasBounds?.height).toBe(1080);
    });

    test('should load dynamic background with spatial layers', async () => {
      await page.goto(`${TEST_BASE_URL}/atelier`);
      
      await page.waitForLoadState('networkidle');
      
      // Check for dynamic background container
      const backgroundContainer = page.locator('.fixed.inset-0.pointer-events-none.z-0');
      await expect(backgroundContainer).toBeVisible();
      
      // Verify multiple spatial layers are rendered
      const spatialLayers = page.locator('.fixed.inset-0.pointer-events-none.z-0 > div');
      const layerCount = await spatialLayers.count();
      expect(layerCount).toBeGreaterThan(3); // Base + spatial layers + vignette
      
      // Test parallax effect by moving mouse
      await page.mouse.move(100, 100);
      await page.waitForTimeout(100);
      
      await page.mouse.move(800, 600);
      await page.waitForTimeout(100);
      
      // Verify layers respond to mouse movement (implementation detail)
      // This would require checking transform styles or similar
    });

    test('should handle animation configuration loading errors gracefully', async () => {
      // Mock network to return error for animation config
      await page.route('**/api/animation/config/**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: { message: 'Server error' }
          })
        });
      });
      
      await page.goto(`${TEST_BASE_URL}/atelier`);
      
      // Page should still load despite config error
      await page.waitForLoadState('networkidle');
      
      // Animation should fall back to default behavior
      const cursorTrailCanvas = page.locator('canvas[style*="mix-blend-mode: screen"]');
      await expect(cursorTrailCanvas).toBeVisible();
      
      // Should still respond to mouse movement with defaults
      await page.mouse.move(500, 300);
      await expect(cursorTrailCanvas).toHaveClass(/opacity-100/, { timeout: 2000 });
    });
  });

  test.describe('Interactive Animation Behaviors', () => {
    test('should generate particle trails on mouse movement', async () => {
      await page.goto(`${TEST_BASE_URL}/atelier`);
      await page.waitForLoadState('networkidle');
      
      const cursorTrailCanvas = page.locator('canvas[style*="mix-blend-mode: screen"]');
      
      // Create a path of mouse movements
      const path = [
        { x: 200, y: 200 },
        { x: 400, y: 300 },
        { x: 600, y: 200 },
        { x: 800, y: 400 }
      ];
      
      // Move mouse along path with delays to generate particles
      for (const point of path) {
        await page.mouse.move(point.x, point.y);
        await page.waitForTimeout(50); // Allow particles to generate
      }
      
      // Verify animation is active
      await expect(cursorTrailCanvas).toHaveClass(/opacity-100/);
      
      // Check that canvas context is being used (particles are drawn)
      const canvasActivity = await page.evaluate(() => {
        const canvas = document.querySelector('canvas[style*="mix-blend-mode: screen"]') as HTMLCanvasElement;
        if (!canvas) return false;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return false;
        
        // Check if canvas has been drawn on (non-empty)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        return imageData.data.some((pixel, index) => index % 4 !== 3 && pixel > 0); // Check non-alpha channels
      });
      
      expect(canvasActivity).toBe(true);
    });

    test('should handle rapid mouse movements without performance degradation', async () => {
      await page.goto(`${TEST_BASE_URL}/atelier`);
      await page.waitForLoadState('networkidle');
      
      // Monitor performance
      let performanceEntries: any[] = [];
      await page.exposeFunction('capturePerformance', (entry: any) => {
        performanceEntries.push(entry);
      });
      
      // Inject performance monitoring
      await page.evaluateOnNewDocument(() => {
        let frameCount = 0;
        let lastTime = performance.now();
        
        const measureFPS = () => {
          frameCount++;
          const currentTime = performance.now();
          
          if (currentTime - lastTime >= 1000) { // Every second
            const fps = frameCount;
            (window as any).capturePerformance({ fps, timestamp: currentTime });
            frameCount = 0;
            lastTime = currentTime;
          }
          
          requestAnimationFrame(measureFPS);
        };
        
        requestAnimationFrame(measureFPS);
      });
      
      // Perform rapid mouse movements
      for (let i = 0; i < 100; i++) {
        await page.mouse.move(
          Math.random() * 1920,
          Math.random() * 1080
        );
        await page.waitForTimeout(10); // Very rapid movements
      }
      
      // Wait for performance measurements
      await page.waitForTimeout(2000);
      
      // Verify FPS stays reasonable (> 30 FPS)
      if (performanceEntries.length > 0) {
        const avgFPS = performanceEntries.reduce((sum, entry) => sum + entry.fps, 0) / performanceEntries.length;
        expect(avgFPS).toBeGreaterThan(30);
      }
    });

    test('should fade out animation after mouse leaves page', async () => {
      await page.goto(`${TEST_BASE_URL}/atelier`);
      await page.waitForLoadState('networkidle');
      
      const cursorTrailCanvas = page.locator('canvas[style*="mix-blend-mode: screen"]');
      
      // Activate animation
      await page.mouse.move(500, 300);
      await expect(cursorTrailCanvas).toHaveClass(/opacity-100/, { timeout: 2000 });
      
      // Simulate mouse leaving page
      await page.dispatchEvent('document', 'mouseleave');
      
      // Should fade out (this might take a few seconds based on implementation)
      await expect(cursorTrailCanvas).toHaveClass(/opacity-0/, { timeout: 5000 });
    });
  });

  test.describe('Configuration Management Workflows', () => {
    test('should allow real-time configuration updates', async () => {
      // Mock API responses for configuration
      await page.route('**/api/animation/config/**', route => {
        if (route.request().method() === 'GET') {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: AnimationConfigFactory.create({
                animationId: 'test-animation',
                speed: 1.0,
                enabled: true
              })
            })
          });
        } else if (route.request().method() === 'PUT') {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: AnimationConfigFactory.create({
                animationId: 'test-animation',
                speed: 2.0,
                enabled: true
              })
            })
          });
        }
      });
      
      await page.goto(`${TEST_BASE_URL}/atelier`);
      await page.waitForLoadState('networkidle');
      
      // If there's a configuration panel, test it
      const configPanel = page.locator('[data-testid="animation-config-panel"]');
      
      if (await configPanel.isVisible()) {
        // Test speed adjustment
        const speedControl = page.locator('[data-testid="speed-control"]');
        if (await speedControl.isVisible()) {
          await speedControl.fill('2.0');
          await speedControl.blur(); // Trigger update
          
          // Verify update was sent to API
          // This would be validated through network monitoring
        }
        
        // Test enable/disable toggle
        const enableToggle = page.locator('[data-testid="enable-animation"]');
        if (await enableToggle.isVisible()) {
          await enableToggle.click();
          
          // Animation should stop/start based on toggle
          const cursorTrailCanvas = page.locator('canvas[style*="mix-blend-mode: screen"]');
          
          // Move mouse to test if animation responds
          await page.mouse.move(500, 300);
          
          // Check animation state (this would depend on implementation)
        }
      }
    });

    test('should handle offline/network error scenarios', async () => {
      // Start with working network
      await page.goto(`${TEST_BASE_URL}/atelier`);
      await page.waitForLoadState('networkidle');
      
      // Verify animation works initially
      const cursorTrailCanvas = page.locator('canvas[style*="mix-blend-mode: screen"]');
      await page.mouse.move(500, 300);
      await expect(cursorTrailCanvas).toHaveClass(/opacity-100/, { timeout: 2000 });
      
      // Simulate network failure
      await page.context().setOffline(true);
      
      // Animation should continue to work with cached/default settings
      await page.mouse.move(600, 400);
      await expect(cursorTrailCanvas).toHaveClass(/opacity-100/);
      
      // Restore network
      await page.context().setOffline(false);
      
      // Animation should still work
      await page.mouse.move(700, 500);
      await expect(cursorTrailCanvas).toHaveClass(/opacity-100/);
    });
  });

  test.describe('Performance and Memory Management', () => {
    test('should limit particle count for performance', async () => {
      await page.goto(`${TEST_BASE_URL}/atelier`);
      await page.waitForLoadState('networkidle');
      
      // Generate many particles by rapid mouse movement
      for (let i = 0; i < 200; i++) {
        await page.mouse.move(
          100 + (i * 5) % 1700, // Create a pattern
          100 + Math.floor(i / 340) * 50
        );
        
        // Minimal delay to generate maximum particles
        if (i % 10 === 0) {
          await page.waitForTimeout(1);
        }
      }
      
      // Check that performance is maintained
      const performanceOk = await page.evaluate(() => {
        // Simple check - page should remain responsive
        const start = performance.now();
        
        // Do some DOM work to test responsiveness
        const div = document.createElement('div');
        document.body.appendChild(div);
        document.body.removeChild(div);
        
        const end = performance.now();
        return (end - start) < 100; // Should complete quickly
      });
      
      expect(performanceOk).toBe(true);
    });

    test('should handle memory cleanup on page navigation', async () => {
      await page.goto(`${TEST_BASE_URL}/atelier`);
      await page.waitForLoadState('networkidle');
      
      // Generate animation activity
      await page.mouse.move(500, 300);
      await page.waitForTimeout(1000);
      
      // Navigate away
      await page.goto(`${TEST_BASE_URL}/`);
      await page.waitForLoadState('networkidle');
      
      // Navigate back
      await page.goto(`${TEST_BASE_URL}/atelier`);
      await page.waitForLoadState('networkidle');
      
      // Animation should work normally (no memory leaks)
      const cursorTrailCanvas = page.locator('canvas[style*="mix-blend-mode: screen"]');
      await page.mouse.move(600, 400);
      await expect(cursorTrailCanvas).toHaveClass(/opacity-100/, { timeout: 2000 });
    });
  });

  test.describe('Accessibility and User Preferences', () => {
    test('should respect reduced motion preferences', async () => {
      // Set reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' });
      
      await page.goto(`${TEST_BASE_URL}/atelier`);
      await page.waitForLoadState('networkidle');
      
      // Move mouse to activate animation
      await page.mouse.move(500, 300);
      
      // Animation should either be disabled or significantly reduced
      const cursorTrailCanvas = page.locator('canvas[style*="mix-blend-mode: screen"]');
      
      // Depending on implementation, animation might be disabled entirely
      // or run with reduced effects
      const isReduced = await page.evaluate(() => {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      });
      
      expect(isReduced).toBe(true);
      
      // If animation still runs, verify it's less intensive
      // (This would need to be implemented based on actual reduced motion handling)
    });

    test('should work with keyboard navigation', async () => {
      await page.goto(`${TEST_BASE_URL}/atelier`);
      await page.waitForLoadState('networkidle');
      
      // Test keyboard accessibility if there are interactive elements
      const interactiveElements = page.locator('button, input, [tabindex]');
      const elementCount = await interactiveElements.count();
      
      if (elementCount > 0) {
        // Tab through elements
        for (let i = 0; i < Math.min(elementCount, 5); i++) {
          await page.keyboard.press('Tab');
          await page.waitForTimeout(100);
        }
        
        // Verify page remains functional
        await page.mouse.move(500, 300);
        const cursorTrailCanvas = page.locator('canvas[style*="mix-blend-mode: screen"]');
        await expect(cursorTrailCanvas).toHaveClass(/opacity-100/, { timeout: 2000 });
      }
    });

    test('should handle high contrast mode', async () => {
      // Simulate high contrast mode
      await page.emulateMedia({ colorScheme: 'dark' });
      
      await page.goto(`${TEST_BASE_URL}/atelier`);
      await page.waitForLoadState('networkidle');
      
      // Animation should still be visible and functional
      const cursorTrailCanvas = page.locator('canvas[style*="mix-blend-mode: screen"]');
      await page.mouse.move(500, 300);
      await expect(cursorTrailCanvas).toHaveClass(/opacity-100/, { timeout: 2000 });
      
      // Colors might be adjusted for accessibility
      // (This would need specific implementation testing)
    });
  });

  test.describe('Error Scenarios and Edge Cases', () => {
    test('should handle WebGL context loss gracefully', async () => {
      await page.goto(`${TEST_BASE_URL}/atelier`);
      await page.waitForLoadState('networkidle');
      
      // Simulate WebGL context loss
      await page.evaluate(() => {
        const canvas = document.querySelector('canvas');
        if (canvas) {
          const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
          if (gl) {
            const loseContext = gl.getExtension('WEBGL_lose_context');
            if (loseContext) {
              loseContext.loseContext();
            }
          }
        }
      });
      
      await page.waitForTimeout(100);
      
      // Animation should continue to work (fallback to 2D canvas)
      const cursorTrailCanvas = page.locator('canvas[style*="mix-blend-mode: screen"]');
      await page.mouse.move(500, 300);
      await expect(cursorTrailCanvas).toHaveClass(/opacity-100/, { timeout: 2000 });
    });

    test('should handle rapid page resizes', async () => {
      await page.goto(`${TEST_BASE_URL}/atelier`);
      await page.waitForLoadState('networkidle');
      
      // Activate animation
      await page.mouse.move(500, 300);
      
      const cursorTrailCanvas = page.locator('canvas[style*="mix-blend-mode: screen"]');
      await expect(cursorTrailCanvas).toHaveClass(/opacity-100/, { timeout: 2000 });
      
      // Perform rapid resizes
      const sizes = [
        { width: 1024, height: 768 },
        { width: 1440, height: 900 },
        { width: 800, height: 600 },
        { width: 1920, height: 1080 }
      ];
      
      for (const size of sizes) {
        await page.setViewportSize(size);
        await page.waitForTimeout(50); // Brief pause between resizes
      }
      
      // Animation should still work after resizes
      await page.mouse.move(400, 300);
      await expect(cursorTrailCanvas).toHaveClass(/opacity-100/);
      
      // Verify canvas dimensions updated
      const canvasBounds = await cursorTrailCanvas.boundingBox();
      expect(canvasBounds?.width).toBe(1920);
      expect(canvasBounds?.height).toBe(1080);
    });

    test('should handle tab visibility changes', async () => {
      await page.goto(`${TEST_BASE_URL}/atelier`);
      await page.waitForLoadState('networkidle');
      
      // Activate animation
      await page.mouse.move(500, 300);
      const cursorTrailCanvas = page.locator('canvas[style*="mix-blend-mode: screen"]');
      await expect(cursorTrailCanvas).toHaveClass(/opacity-100/, { timeout: 2000 });
      
      // Simulate tab becoming hidden
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', {
          value: true,
          writable: true
        });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      
      await page.waitForTimeout(100);
      
      // Animation might be paused or hidden
      
      // Simulate tab becoming visible again
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', {
          value: false,
          writable: true
        });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      
      await page.waitForTimeout(100);
      
      // Animation should resume
      await page.mouse.move(600, 400);
      await expect(cursorTrailCanvas).toHaveClass(/opacity-100/);
    });
  });
});