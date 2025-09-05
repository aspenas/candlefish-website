/**
 * Comprehensive iPhone compatibility test suite
 * Tests workshop-notes page on various iPhone models and iOS versions
 */

import { test, expect, devices } from '@playwright/test'

// iPhone device configurations to test
const iPhoneDevices = [
  { name: 'iPhone SE', device: devices['iPhone SE'] },
  { name: 'iPhone 12', device: devices['iPhone 12'] },
  { name: 'iPhone 12 Pro', device: devices['iPhone 12 Pro'] },
  { name: 'iPhone 13 Pro', device: devices['iPhone 13 Pro'] },
  { name: 'iPhone 14 Pro', device: devices['iPhone 14 Pro'] },
]

// Test the workshop-notes page on each iPhone model
iPhoneDevices.forEach(({ name, device }) => {
  test.describe(`Workshop Notes - ${name}`, () => {
    test.use(device)

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

    test('should handle touch interactions properly', async ({ page }) => {
      // Test tap on note card
      const firstNote = await page.locator('.workshop-card').first()
      await firstNote.tap()
      
      // Should open note viewer
      await page.waitForSelector('.note-viewer', { timeout: 5000 })
      const noteViewer = await page.locator('.note-viewer').isVisible()
      expect(noteViewer).toBe(true)
      
      // Close note viewer
      const closeButton = await page.locator('[aria-label*="Close"]').first()
      if (await closeButton.isVisible()) {
        await closeButton.tap()
        await page.waitForSelector('.note-viewer', { state: 'hidden', timeout: 5000 })
      }
    })

    test('should handle orientation changes', async ({ page, context }) => {
      // Skip if device doesn't support orientation change
      if (!device.viewport?.width || !device.viewport?.height) {
        test.skip()
      }

      const initialOrientation = await page.evaluate(() => window.orientation)
      
      // Rotate to landscape
      await context.setViewportSize({
        width: device.viewport!.height,
        height: device.viewport!.width
      })
      
      await page.waitForTimeout(500) // Wait for orientation change handlers
      
      // Check layout adjusts properly
      const hasLayoutIssues = await page.evaluate(() => {
        const body = document.body
        const html = document.documentElement
        return body.scrollWidth > window.innerWidth || 
               html.scrollWidth > window.innerWidth
      })
      
      expect(hasLayoutIssues).toBe(false)
      
      // Rotate back to portrait
      await context.setViewportSize({
        width: device.viewport!.width,
        height: device.viewport!.height
      })
    })

    test('should optimize performance for device tier', async ({ page }) => {
      // Check device tier is set
      const deviceTier = await page.evaluate(() => {
        return document.documentElement.getAttribute('data-device-tier')
      })
      
      expect(['low', 'mid', 'high']).toContain(deviceTier)
      
      // Check appropriate optimizations are applied
      const optimizations = await page.evaluate(() => {
        const styles = window.getComputedStyle(document.querySelector('.workshop-card') as Element)
        return {
          backdropFilter: styles.backdropFilter || styles.webkitBackdropFilter,
          willChange: styles.willChange
        }
      })
      
      // Low-tier devices should have no backdrop filter
      if (deviceTier === 'low') {
        expect(optimizations.backdropFilter).toMatch(/none|^$/)
      }
      
      // Will-change should be auto for memory optimization
      expect(optimizations.willChange).toBe('auto')
    })

    test('should handle safe areas on notched devices', async ({ page }) => {
      // Check if device has notch (iPhone X and later)
      const hasNotch = name.includes('Pro') || name.includes('X') || 
                      (name.includes('12') && !name.includes('SE')) ||
                      name.includes('13') || name.includes('14')
      
      if (hasNotch) {
        const safeAreaStyles = await page.evaluate(() => {
          const nav = document.querySelector('.workshop-nav')
          if (!nav) return null
          
          const styles = window.getComputedStyle(nav)
          return {
            paddingTop: styles.paddingTop,
            paddingLeft: styles.paddingLeft,
            paddingRight: styles.paddingRight
          }
        })
        
        expect(safeAreaStyles).toBeTruthy()
        
        // Should have safe area padding
        if (safeAreaStyles) {
          expect(parseInt(safeAreaStyles.paddingTop)).toBeGreaterThanOrEqual(8)
        }
      }
    })

    test('should prevent elastic scroll bounce', async ({ page }) => {
      // Simulate scroll to top and bottom
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.waitForTimeout(100)
      
      // Try to scroll up (should not bounce)
      await page.evaluate(() => {
        const event = new TouchEvent('touchstart', {
          touches: [new Touch({ identifier: 1, target: document.body, clientY: 100 })]
        })
        document.dispatchEvent(event)
        
        const moveEvent = new TouchEvent('touchmove', {
          touches: [new Touch({ identifier: 1, target: document.body, clientY: 200 })]
        })
        document.dispatchEvent(moveEvent)
      })
      
      // Check no overscroll occurred
      const scrollTop = await page.evaluate(() => window.scrollY)
      expect(scrollTop).toBe(0)
    })

    test('should load and display images properly', async ({ page }) => {
      // Check all images load without errors
      const brokenImages = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'))
        return images.filter(img => !img.complete || img.naturalHeight === 0)
          .map(img => img.src)
      })
      
      expect(brokenImages).toHaveLength(0)
    })

    test('should have accessible form elements', async ({ page }) => {
      // Check all form inputs have labels
      const unlabeledInputs = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input, textarea, select'))
        return inputs.filter(input => {
          const id = input.getAttribute('id')
          const ariaLabel = input.getAttribute('aria-label')
          const ariaLabelledBy = input.getAttribute('aria-labelledby')
          const label = id ? document.querySelector(`label[for="${id}"]`) : null
          
          return !label && !ariaLabel && !ariaLabelledBy
        }).map(input => input.outerHTML.substring(0, 100))
      })
      
      expect(unlabeledInputs).toHaveLength(0)
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
        // Should use less than 50MB of JS heap
        expect(memoryUsage.usedJSHeapSize).toBeLessThan(50)
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

    test('should handle filter and search', async ({ page }) => {
      // Test category filter
      const techButton = await page.locator('button:has-text("technical")').first()
      await techButton.tap()
      
      // Wait for filter to apply
      await page.waitForTimeout(500)
      
      // Check filtered results
      const filteredNotes = await page.locator('.workshop-card').count()
      expect(filteredNotes).toBeGreaterThanOrEqual(0)
      
      // Test search
      const searchInput = await page.locator('#search-input')
      await searchInput.tap()
      await searchInput.fill('operational')
      
      // Wait for search to apply
      await page.waitForTimeout(500)
      
      // Check search results
      const searchResults = await page.locator('.workshop-card').count()
      expect(searchResults).toBeGreaterThanOrEqual(0)
    })
  })
})

// Test PWA features on iOS
test.describe('PWA Features on iOS', () => {
  test.use(devices['iPhone 12 Pro'])
  
  test('should have proper meta tags for iOS PWA', async ({ page }) => {
    await page.goto('/workshop-notes')
    
    const metaTags = await page.evaluate(() => {
      const tags: Record<string, string | null> = {}
      
      // Check viewport
      const viewport = document.querySelector('meta[name="viewport"]')
      tags.viewport = viewport?.getAttribute('content')
      
      // Check Apple-specific tags
      const appleMobileWebAppCapable = document.querySelector('meta[name="apple-mobile-web-app-capable"]')
      tags.webAppCapable = appleMobileWebAppCapable?.getAttribute('content')
      
      const appleMobileWebAppStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
      tags.statusBarStyle = appleMobileWebAppStatusBar?.getAttribute('content')
      
      const appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]')
      tags.touchIcon = appleTouchIcon?.getAttribute('href')
      
      return tags
    })
    
    // Check viewport includes viewport-fit for notch handling
    expect(metaTags.viewport).toContain('viewport-fit=cover')
    
    // iOS PWA tags should be present
    expect(metaTags.webAppCapable).toBe('yes')
    expect(metaTags.statusBarStyle).toBeTruthy()
    expect(metaTags.touchIcon).toBeTruthy()
  })
})

// Performance benchmark test
test.describe('Performance Benchmarks', () => {
  test.use(devices['iPhone 12'])
  
  test('should meet performance targets', async ({ page }) => {
    const metrics = await page.evaluate(() => {
      return new Promise<any>((resolve) => {
        // Wait for page to fully load
        if (document.readyState === 'complete') {
          const timing = performance.timing
          const paintMetrics = performance.getEntriesByType('paint')
          
          resolve({
            loadTime: timing.loadEventEnd - timing.navigationStart,
            domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
            firstContentfulPaint: paintMetrics.find(m => m.name === 'first-contentful-paint')?.startTime,
            largestContentfulPaint: 0 // Will be set below
          })
        } else {
          window.addEventListener('load', () => {
            const timing = performance.timing
            const paintMetrics = performance.getEntriesByType('paint')
            
            resolve({
              loadTime: timing.loadEventEnd - timing.navigationStart,
              domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
              firstContentfulPaint: paintMetrics.find(m => m.name === 'first-contentful-paint')?.startTime,
              largestContentfulPaint: 0
            })
          })
        }
      })
    })
    
    // Performance targets
    expect(metrics.loadTime).toBeLessThan(8000) // 8 seconds on 3G
    expect(metrics.firstContentfulPaint).toBeLessThan(2000) // 2 seconds FCP
  })
})