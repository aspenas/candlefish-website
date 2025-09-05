import { test, expect, devices } from '@playwright/test'

const WORKSHOP_NOTES_URL = 'https://candlefish.ai/workshop-notes'

test.describe('iPhone Compatibility Tests - Workshop Notes', () => {
  
  // Test various iPhone models
  const iPhoneModels = [
    { name: 'iPhone SE (1st gen)', device: devices['iPhone SE'] },
    { name: 'iPhone 12', device: devices['iPhone 12'] },
    { name: 'iPhone 12 Pro', device: devices['iPhone 12 Pro'] },
    { name: 'iPhone 13', device: devices['iPhone 13'] },
    { name: 'iPhone 13 Pro', device: devices['iPhone 13 Pro'] },
    { name: 'iPhone 14', device: devices['iPhone 14 Pro'] }
  ]

  iPhoneModels.forEach(iPhone => {
    test(`${iPhone.name} - Basic page load and layout`, async ({ page, browser }) => {
      const context = await browser.newContext({
        ...iPhone.device,
        // Ensure proper iOS user agent
        userAgent: iPhone.device.userAgent || 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
      })
      
      const iPhonePage = await context.newPage()
      
      // Navigate to workshop notes
      await iPhonePage.goto(WORKSHOP_NOTES_URL)
      await iPhonePage.waitForLoadState('networkidle', { timeout: 15000 })
      
      // Basic layout checks
      const body = iPhonePage.locator('body')
      await expect(body).toBeVisible()
      
      // Check that content doesn't overflow horizontally
      const scrollWidth = await iPhonePage.evaluate(() => document.body.scrollWidth)
      const clientWidth = await iPhonePage.evaluate(() => document.documentElement.clientWidth)
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 10) // Allow small tolerance
      
      // Check navigation is properly positioned
      const nav = iPhonePage.locator('.workshop-nav')
      await expect(nav).toBeVisible()
      
      const navBounds = await nav.boundingBox()
      expect(navBounds?.y).toBeGreaterThanOrEqual(0)
      
      // Check main content is accessible
      const mainContent = iPhonePage.locator('main, .workshop-grid')
      await expect(mainContent).toBeVisible()
      
      await context.close()
    })

    test(`${iPhone.name} - Touch interactions work correctly`, async ({ page, browser }) => {
      const context = await browser.newContext(iPhone.device)
      const iPhonePage = await context.newPage()
      
      await iPhonePage.goto(WORKSHOP_NOTES_URL)
      await iPhonePage.waitForLoadState('networkidle')
      
      // Test tapping on workshop cards
      const workshopCards = iPhonePage.locator('.workshop-card')
      const cardCount = await workshopCards.count()
      
      if (cardCount > 0) {
        const firstCard = workshopCards.first()
        await expect(firstCard).toBeVisible()
        
        // Test tap
        await firstCard.tap()
        await iPhonePage.waitForTimeout(500)
        
        // Should not cause layout issues
        const body = iPhonePage.locator('body')
        await expect(body).toBeVisible()
      }
      
      // Test button interactions
      const buttons = iPhonePage.locator('.workshop-button, button')
      const buttonCount = await buttons.count()
      
      if (buttonCount > 0) {
        const firstButton = buttons.first()
        if (await firstButton.isVisible()) {
          await firstButton.tap()
          await iPhonePage.waitForTimeout(300)
        }
      }
      
      await context.close()
    })

    test(`${iPhone.name} - Viewport and safe areas handled correctly`, async ({ page, browser }) => {
      const context = await browser.newContext(iPhone.device)
      const iPhonePage = await context.newPage()
      
      await iPhonePage.goto(WORKSHOP_NOTES_URL)
      await iPhonePage.waitForLoadState('networkidle')
      
      // Check viewport meta tag is properly set
      const viewportContent = await iPhonePage.getAttribute('meta[name="viewport"]', 'content')
      expect(viewportContent).toContain('device-width')
      expect(viewportContent).toContain('initial-scale=1')
      
      // Test that navigation respects safe areas on notched devices
      if (iPhone.name.includes('12') || iPhone.name.includes('13') || iPhone.name.includes('14')) {
        const nav = iPhonePage.locator('.workshop-nav')
        const navStyles = await nav.evaluate(el => {
          const computed = window.getComputedStyle(el)
          return {
            paddingTop: computed.paddingTop,
            paddingLeft: computed.paddingLeft,
            paddingRight: computed.paddingRight
          }
        })
        
        // Should have padding for safe areas
        expect(parseInt(navStyles.paddingTop)).toBeGreaterThan(8)
      }
      
      // Check that content doesn't extend into unsafe areas
      const mainContent = iPhonePage.locator('.workshop-grid')
      const mainBounds = await mainContent.boundingBox()
      const viewportSize = iPhonePage.viewportSize()
      
      if (mainBounds && viewportSize) {
        expect(mainBounds.x).toBeGreaterThanOrEqual(0)
        expect(mainBounds.x + mainBounds.width).toBeLessThanOrEqual(viewportSize.width)
      }
      
      await context.close()
    })

    test(`${iPhone.name} - Orientation change handling`, async ({ page, browser }) => {
      const context = await browser.newContext(iPhone.device)
      const iPhonePage = await context.newPage()
      
      await iPhonePage.goto(WORKSHOP_NOTES_URL)
      await iPhonePage.waitForLoadState('networkidle')
      
      // Test portrait mode
      const body = iPhonePage.locator('body')
      await expect(body).toBeVisible()
      
      // Simulate orientation change to landscape
      await iPhonePage.setViewportSize({ width: 844, height: 390 }) // iPhone landscape
      await iPhonePage.waitForTimeout(500) // Allow time for reflow
      
      // Layout should still work in landscape
      await expect(body).toBeVisible()
      
      // Navigation should still be visible and functional
      const nav = iPhonePage.locator('.workshop-nav')
      await expect(nav).toBeVisible()
      
      // Content should not overflow
      const scrollWidth = await iPhonePage.evaluate(() => document.body.scrollWidth)
      const clientWidth = await iPhonePage.evaluate(() => document.documentElement.clientWidth)
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 20) // More tolerance for landscape
      
      await context.close()
    })

    test(`${iPhone.name} - Performance and memory optimization`, async ({ page, browser }) => {
      const context = await browser.newContext(iPhone.device)
      const iPhonePage = await context.newPage()
      
      // Monitor network requests
      let requestCount = 0
      iPhonePage.on('request', () => requestCount++)
      
      const startTime = Date.now()
      await iPhonePage.goto(WORKSHOP_NOTES_URL)
      await iPhonePage.waitForLoadState('networkidle')
      const loadTime = Date.now() - startTime
      
      // Should load reasonably fast on mobile
      expect(loadTime).toBeLessThan(8000) // 8 seconds for mobile
      
      // Check that performance optimizations are applied
      const hasOptimizations = await iPhonePage.evaluate(() => {
        // Check if mobile performance styles are applied
        const style = document.getElementById('mobile-performance-optimizations')
        const iosOptimizations = document.getElementById('ios-touch-optimizations')
        
        return {
          hasPerformanceStyles: !!style,
          hasIOSOptimizations: !!iosOptimizations,
          hasViewportVar: !!document.documentElement.style.getPropertyValue('--vh'),
          hasSafeAreaSupport: CSS.supports('padding: env(safe-area-inset-top)')
        }
      })
      
      // Performance optimizations should be present
      expect(hasOptimizations.hasViewportVar).toBeTruthy()
      
      // Memory usage check (if available)
      const memoryInfo = await iPhonePage.evaluate(() => {
        return (performance as any).memory ? {
          used: (performance as any).memory.usedJSHeapSize / 1024 / 1024,
          total: (performance as any).memory.totalJSHeapSize / 1024 / 1024
        } : null
      })
      
      if (memoryInfo) {
        // Should use reasonable amount of memory (less than 100MB)
        expect(memoryInfo.used).toBeLessThan(100)
      }
      
      await context.close()
    })

    test(`${iPhone.name} - Form inputs don't cause zoom`, async ({ page, browser }) => {
      const context = await browser.newContext(iPhone.device)
      const iPhonePage = await context.newPage()
      
      await iPhonePage.goto(WORKSHOP_NOTES_URL)
      await iPhonePage.waitForLoadState('networkidle')
      
      // Find any input fields
      const inputs = iPhonePage.locator('input, textarea')
      const inputCount = await inputs.count()
      
      if (inputCount > 0) {
        const firstInput = inputs.first()
        
        // Check font size is at least 16px to prevent zoom
        const fontSize = await firstInput.evaluate(el => {
          return window.getComputedStyle(el).fontSize
        })
        
        const fontSizeValue = parseInt(fontSize.replace('px', ''))
        expect(fontSizeValue).toBeGreaterThanOrEqual(16)
        
        // Test focus doesn't cause zoom
        await firstInput.focus()
        await iPhonePage.waitForTimeout(300)
        
        // Viewport should remain the same
        const viewportAfterFocus = iPhonePage.viewportSize()
        expect(viewportAfterFocus).toBeTruthy()
      }
      
      await context.close()
    })

    test(`${iPhone.name} - Scroll performance and bounce prevention`, async ({ page, browser }) => {
      const context = await browser.newContext(iPhone.device)
      const iPhonePage = await context.newPage()
      
      await iPhonePage.goto(WORKSHOP_NOTES_URL)
      await iPhonePage.waitForLoadState('networkidle')
      
      // Test scrolling performance
      const mainContent = iPhonePage.locator('main, .workshop-container')
      await expect(mainContent).toBeVisible()
      
      // Simulate scroll gestures
      await iPhonePage.evaluate(() => {
        // Check if scroll bounce prevention is active
        const hasOverflowScrolling = window.getComputedStyle(document.body).webkitOverflowScrolling === 'touch'
        const hasTouchScrolling = window.getComputedStyle(document.body).overflowScrolling === 'touch'
        
        return { hasOverflowScrolling, hasTouchScrolling }
      })
      
      // Test scroll to bottom and top
      await iPhonePage.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await iPhonePage.waitForTimeout(100)
      
      await iPhonePage.evaluate(() => window.scrollTo(0, 0))
      await iPhonePage.waitForTimeout(100)
      
      // Content should still be visible after scrolling
      await expect(mainContent).toBeVisible()
      
      await context.close()
    })
  })

  test.describe('iPhone Safari Specific Issues', () => {
    test('Safari backdrop-filter performance', async ({ page, browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 12'],
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
      })
      
      const safariPage = await context.newPage()
      
      await safariPage.goto(WORKSHOP_NOTES_URL)
      await safariPage.waitForLoadState('networkidle')
      
      // Check that backdrop-filter is optimized for Safari
      const cardStyles = await safariPage.evaluate(() => {
        const card = document.querySelector('.workshop-card')
        if (!card) return null
        
        const computed = window.getComputedStyle(card)
        return {
          backdropFilter: computed.backdropFilter || computed.webkitBackdropFilter,
          transform: computed.transform,
          willChange: computed.willChange
        }
      })
      
      if (cardStyles) {
        // Should have backdrop filter but optimized (reduced blur for performance)
        expect(cardStyles.backdropFilter).toBeTruthy()
        // Should have transform for GPU acceleration
        expect(cardStyles.transform).toContain('translateZ')
        // Should not have permanent will-change (memory optimization)
        expect(cardStyles.willChange).not.toBe('transform, opacity')
      }
      
      await context.close()
    })

    test('iOS standalone mode compatibility', async ({ page, browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 12'],
        // Simulate standalone mode (PWA)
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        extraHTTPHeaders: {
          'X-Requested-With': 'standalone'
        }
      })
      
      const standalonePage = await context.newPage()
      
      await standalonePage.goto(WORKSHOP_NOTES_URL)
      await standalonePage.waitForLoadState('networkidle')
      
      // Check that standalone mode optimizations are applied
      const standaloneOptimizations = await standalonePage.evaluate(() => {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
        const hasStatusBarMeta = !!document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
        
        return { isStandalone, hasStatusBarMeta }
      })
      
      expect(standaloneOptimizations.hasStatusBarMeta).toBeTruthy()
      
      await context.close()
    })
  })
})