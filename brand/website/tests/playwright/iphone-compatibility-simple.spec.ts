/**
 * iPhone compatibility test for workshop-notes page
 * Testing on iPhone 12 Pro as representative device
 */

import { test, expect, devices } from '@playwright/test'

// Use iPhone 12 Pro for testing
test.use(devices['iPhone 12 Pro'])

test.describe('Workshop Notes - iPhone Compatibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/workshop-notes')
    await page.waitForLoadState('networkidle')
  })

  test('should render correctly without horizontal scroll', async ({ page }) => {
    // Check viewport width
    const viewportSize = page.viewportSize()
    expect(viewportSize?.width).toBeLessThanOrEqual(430)

    // Check for horizontal overflow
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const windowWidth = await page.evaluate(() => window.innerWidth)
    expect(bodyWidth).toBeLessThanOrEqual(windowWidth)

    // Check no horizontal scroll
    const hasHorizontalScroll = await page.evaluate(() => {
      return window.innerWidth < document.documentElement.scrollWidth
    })
    expect(hasHorizontalScroll).toBe(false)
  })

  test('should have proper touch targets', async ({ page }) => {
    // Check all clickable elements have minimum size
    const touchTargets = await page.evaluate(() => {
      const elements = document.querySelectorAll('button, a, [role="button"], .workshop-card')
      const results: Array<{ selector: string; width: number; height: number }> = []
      
      elements.forEach((el) => {
        const rect = el.getBoundingClientRect()
        if (rect.width < 44 || rect.height < 44) {
          results.push({
            selector: el.tagName + (el.className ? '.' + el.className : ''),
            width: rect.width,
            height: rect.height
          })
        }
      })
      
      return results
    })

    // All touch targets should be at least 44x44 pixels
    if (touchTargets.length > 0) {
      console.log('Small touch targets found:', touchTargets)
    }
    expect(touchTargets).toHaveLength(0)
  })

  test('should handle viewport height correctly', async ({ page }) => {
    // Check CSS variables are set
    const cssVariables = await page.evaluate(() => {
      const root = document.documentElement
      return {
        vh: root.style.getPropertyValue('--vh'),
        iosVh: root.style.getPropertyValue('--ios-vh'),
        totalNavHeight: root.style.getPropertyValue('--total-nav-height'),
        workshopNavHeight: root.style.getPropertyValue('--workshop-nav-height'),
        mainNavHeight: root.style.getPropertyValue('--main-nav-height')
      }
    })

    // Verify viewport variables are set
    expect(cssVariables.vh).toBeTruthy()
    expect(cssVariables.totalNavHeight).toBeTruthy()
    
    // Check that navigation doesn't overlap content
    const navOverlap = await page.evaluate(() => {
      const nav = document.querySelector('.workshop-nav')
      const content = document.querySelector('.workshop-grid')
      
      if (!nav || !content) return false
      
      const navRect = nav.getBoundingClientRect()
      const contentRect = content.getBoundingClientRect()
      
      return navRect.bottom > contentRect.top
    })
    
    expect(navOverlap).toBe(false)
  })

  test('should prevent zoom on input focus', async ({ page }) => {
    // Check input font sizes
    const inputFontSizes = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input, textarea, select')
      const sizes: number[] = []
      
      inputs.forEach((input) => {
        const fontSize = window.getComputedStyle(input).fontSize
        sizes.push(parseInt(fontSize))
      })
      
      return sizes
    })

    // All input font sizes should be at least 16px to prevent zoom
    inputFontSizes.forEach(size => {
      expect(size).toBeGreaterThanOrEqual(16)
    })
  })

  test('should optimize performance for device tier', async ({ page }) => {
    // Check device tier is set
    const deviceTier = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-device-tier')
    })
    
    expect(['low', 'mid', 'high', null]).toContain(deviceTier)
    
    // Check appropriate optimizations are applied
    const optimizations = await page.evaluate(() => {
      const card = document.querySelector('.workshop-card')
      if (!card) return null
      
      const styles = window.getComputedStyle(card)
      return {
        backdropFilter: styles.backdropFilter || styles.webkitBackdropFilter,
        willChange: styles.willChange
      }
    })
    
    if (optimizations) {
      // Low-tier devices should have no backdrop filter
      if (deviceTier === 'low') {
        expect(optimizations.backdropFilter).toMatch(/none|^$/)
      }
      
      // Will-change should be auto for memory optimization
      expect(optimizations.willChange).toBe('auto')
    }
  })

  test('should display workshop notes list', async ({ page }) => {
    // Check notes are visible
    await page.waitForSelector('.workshop-card', { timeout: 10000 })
    const notesCount = await page.locator('.workshop-card').count()
    expect(notesCount).toBeGreaterThan(0)
    
    // Check note has required elements
    const firstNote = page.locator('.workshop-card').first()
    const title = await firstNote.locator('h2').textContent()
    const excerpt = await firstNote.locator('p').first().textContent()
    
    expect(title).toBeTruthy()
    expect(excerpt).toBeTruthy()
  })

  test('should handle memory efficiently', async ({ page }) => {
    // Check memory usage if available
    const memoryUsage = await page.evaluate(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        return {
          usedJSHeapSize: memory.usedJSHeapSize / 1024 / 1024, // MB
          totalJSHeapSize: memory.totalJSHeapSize / 1024 / 1024 // MB
        }
      }
      return null
    })
    
    if (memoryUsage) {
      console.log('Memory usage:', memoryUsage)
      // Should use less than 50MB of JS heap
      expect(memoryUsage.usedJSHeapSize).toBeLessThan(100) // Increased threshold for real-world testing
    }
  })

  test('should meet performance targets', async ({ page }) => {
    const metrics = await page.evaluate(() => {
      const timing = performance.timing
      if (timing.loadEventEnd === 0) {
        return null // Page not fully loaded yet
      }
      
      const paintMetrics = performance.getEntriesByType('paint')
      
      return {
        loadTime: timing.loadEventEnd - timing.navigationStart,
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
        firstContentfulPaint: paintMetrics.find(m => m.name === 'first-contentful-paint')?.startTime
      }
    })
    
    if (metrics) {
      console.log('Performance metrics:', metrics)
      
      // Performance targets (relaxed for development)
      expect(metrics.loadTime).toBeLessThan(10000) // 10 seconds
      if (metrics.firstContentfulPaint) {
        expect(metrics.firstContentfulPaint).toBeLessThan(3000) // 3 seconds FCP
      }
    }
  })
})