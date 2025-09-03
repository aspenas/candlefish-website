import { test, expect, Page } from '@playwright/test'

// Helper function to wait for canvas to be ready
async function waitForCanvasReady(page: Page) {
  await page.waitForSelector('canvas[data-animation-id]')
  // Wait for initial animation frame
  await page.waitForTimeout(1000)
}

// Helper function to set fish mood via localStorage
async function setFishMood(page: Page, mood: string, trustLevel: number = 50) {
  const memoryData = {
    trustLevel,
    lastInteraction: Date.now(),
    feedingSpots: [],
    interactionCount: 10,
    behaviorPattern: 'test',
    visitDates: [Date.now()],
    personalityQuirks: []
  }
  
  await page.evaluate(({ memory, mood }) => {
    localStorage.setItem('candlefish_memory', JSON.stringify(memory))
    // Force mood change if possible
    if (window.candlefishEngine) {
      window.candlefishEngine.emotionalState.transitionTo(mood, 'test', 0.8)
    }
  }, { memory: memoryData, mood })
}

// Helper function to trigger mood changes via interactions
async function triggerMoodChange(page: Page, mood: string) {
  const canvas = page.locator('canvas')
  
  switch (mood) {
    case 'excited':
      // Feed the fish to make it excited
      await canvas.click({ position: { x: 200, y: 150 } })
      await page.waitForTimeout(500)
      break
    
    case 'shy':
      // Make rapid movements to trigger shy state
      for (let i = 0; i < 10; i++) {
        await canvas.hover({ position: { x: 100 + i * 30, y: 100 + i * 10 } })
        await page.waitForTimeout(50)
      }
      break
    
    case 'playful':
      // Set moderate trust and make gentle movements
      await setFishMood(page, 'curious', 60)
      await page.reload()
      await waitForCanvasReady(page)
      await canvas.hover({ position: { x: 200, y: 150 } })
      await page.waitForTimeout(500)
      break
    
    case 'trusting':
      // Set high trust and gentle cursor presence
      await setFishMood(page, 'curious', 85)
      await page.reload()
      await waitForCanvasReady(page)
      await canvas.hover({ position: { x: 200, y: 150 } })
      await page.waitForTimeout(1000)
      break
    
    case 'lonely':
      // Set old interaction time to trigger loneliness
      const lonelyMemory = {
        trustLevel: 40,
        lastInteraction: Date.now() - 70000, // 70 seconds ago
        feedingSpots: [],
        interactionCount: 5,
        behaviorPattern: 'test',
        visitDates: [Date.now() - 70000],
        personalityQuirks: []
      }
      await page.evaluate(({ memory }) => {
        localStorage.setItem('candlefish_memory', JSON.stringify(memory))
      }, { memory: lonelyMemory })
      await page.reload()
      await waitForCanvasReady(page)
      await page.waitForTimeout(2000)
      break
    
    default:
      // Default curious state
      await canvas.hover({ position: { x: 200, y: 150 } })
      await page.waitForTimeout(500)
  }
}

test.describe('Candlefish Mood Visual Appearances', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await waitForCanvasReady(page)
    
    // Clear localStorage for consistent starting state
    await page.evaluate(() => localStorage.clear())
  })
  
  test('curious mood - default gentle glow and movement @visual', async ({ page }) => {
    await triggerMoodChange(page, 'curious')
    
    // Take screenshot of curious fish
    const canvas = page.locator('canvas')
    await expect(canvas).toHaveScreenshot('curious-mood.png')
    
    // Verify visual characteristics through canvas inspection
    const canvasData = await page.evaluate(() => {
      const canvas = document.querySelector('canvas') as HTMLCanvasElement
      const ctx = canvas.getContext('2d')
      if (!ctx) return null
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      
      // Count pixels with golden glow color (curious mood color)
      let glowPixels = 0
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        const a = data[i + 3]
        
        // Check for golden/orange glow (curious mood)
        if (r > 200 && g > 150 && b < 150 && a > 100) {
          glowPixels++
        }
      }
      
      return glowPixels
    })
    
    expect(canvasData).toBeGreaterThan(0) // Should have some glow pixels
  })
  
  test('excited mood - bright glow and rapid movement @visual', async ({ page }) => {
    await triggerMoodChange(page, 'excited')
    
    const canvas = page.locator('canvas')
    await expect(canvas).toHaveScreenshot('excited-mood.png')
    
    // Verify increased brightness and activity
    const visualMetrics = await page.evaluate(() => {
      const canvas = document.querySelector('canvas') as HTMLCanvasElement
      const ctx = canvas.getContext('2d')
      if (!ctx) return null
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      
      let totalBrightness = 0
      let brightPixels = 0
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        const a = data[i + 3]
        
        if (a > 50) { // Non-transparent pixels
          const brightness = (r + g + b) / 3
          totalBrightness += brightness
          if (brightness > 150) brightPixels++
        }
      }
      
      return { totalBrightness, brightPixels }
    })
    
    expect(visualMetrics?.brightPixels).toBeGreaterThan(0)
  })
  
  test('shy mood - dimmed appearance and edge positioning @visual', async ({ page }) => {
    await triggerMoodChange(page, 'shy')
    
    // Wait for fish to retreat to edges
    await page.waitForTimeout(2000)
    
    const canvas = page.locator('canvas')
    await expect(canvas).toHaveScreenshot('shy-mood.png')
    
    // Verify dimmer appearance
    const shyMetrics = await page.evaluate(() => {
      const canvas = document.querySelector('canvas') as HTMLCanvasElement
      const ctx = canvas.getContext('2d')
      if (!ctx) return null
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      
      let purplePixels = 0 // Shy mood uses purple colors
      let edgePixels = 0
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        const a = data[i + 3]
        
        // Check for purple/violet colors (shy mood)
        if (b > r && b > g && a > 100) {
          purplePixels++
          
          // Check if pixel is near edges
          const pixelIndex = i / 4
          const x = pixelIndex % canvas.width
          const y = Math.floor(pixelIndex / canvas.width)
          
          if (x < 100 || x > canvas.width - 100 || y < 100 || y > canvas.height - 100) {
            edgePixels++
          }
        }
      }
      
      return { purplePixels, edgePixels }
    })
    
    expect(shyMetrics?.purplePixels).toBeGreaterThan(0)
  })
  
  test('playful mood - vibrant pink glow and dynamic movement @visual', async ({ page }) => {
    await triggerMoodChange(page, 'playful')
    
    const canvas = page.locator('canvas')
    await expect(canvas).toHaveScreenshot('playful-mood.png')
    
    // Verify pink/magenta coloring
    const playfulMetrics = await page.evaluate(() => {
      const canvas = document.querySelector('canvas') as HTMLCanvasElement
      const ctx = canvas.getContext('2d')
      if (!ctx) return null
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      
      let pinkPixels = 0
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        const a = data[i + 3]
        
        // Check for pink/magenta colors (playful mood)
        if (r > 200 && g < 150 && b > 150 && a > 100) {
          pinkPixels++
        }
      }
      
      return pinkPixels
    })
    
    expect(playfulMetrics).toBeGreaterThan(0)
  })
  
  test('trusting mood - green glow and close following behavior @visual', async ({ page }) => {
    await triggerMoodChange(page, 'trusting')
    
    const canvas = page.locator('canvas')
    
    // Move cursor to see following behavior
    await canvas.hover({ position: { x: 300, y: 200 } })
    await page.waitForTimeout(500)
    
    await expect(canvas).toHaveScreenshot('trusting-mood.png')
    
    // Verify green coloring
    const trustingMetrics = await page.evaluate(() => {
      const canvas = document.querySelector('canvas') as HTMLCanvasElement
      const ctx = canvas.getContext('2d')
      if (!ctx) return null
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      
      let greenPixels = 0
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        const a = data[i + 3]
        
        // Check for green colors (trusting mood)
        if (g > r && g > b && g > 150 && a > 100) {
          greenPixels++
        }
      }
      
      return greenPixels
    })
    
    expect(trustingMetrics).toBeGreaterThan(0)
  })
  
  test('lonely mood - muted gray appearance and slow movement @visual', async ({ page }) => {
    await triggerMoodChange(page, 'lonely')
    
    const canvas = page.locator('canvas')
    await expect(canvas).toHaveScreenshot('lonely-mood.png')
    
    // Verify muted/gray coloring and lonely bubbles
    const lonelyMetrics = await page.evaluate(() => {
      const canvas = document.querySelector('canvas') as HTMLCanvasElement
      const ctx = canvas.getContext('2d')
      if (!ctx) return null
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      
      let grayPixels = 0
      let mutedPixels = 0
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        const a = data[i + 3]
        
        if (a > 50) {
          // Check for gray/muted colors
          const colorDiff = Math.abs(r - g) + Math.abs(g - b) + Math.abs(r - b)
          if (colorDiff < 50 && (r + g + b) / 3 < 180) {
            grayPixels++
          }
          
          // Check for overall muted appearance
          if ((r + g + b) / 3 < 150) {
            mutedPixels++
          }
        }
      }
      
      return { grayPixels, mutedPixels }
    })
    
    expect(lonelyMetrics?.grayPixels).toBeGreaterThan(0)
  })
  
  test('mood transitions - visual morphing between states @visual', async ({ page }) => {
    // Start curious, then transition to excited
    await triggerMoodChange(page, 'curious')
    
    const canvas = page.locator('canvas')
    await expect(canvas).toHaveScreenshot('mood-transition-start.png')
    
    // Feed to trigger excited state
    await canvas.click({ position: { x: 200, y: 150 } })
    await page.waitForTimeout(1000)
    
    await expect(canvas).toHaveScreenshot('mood-transition-excited.png')
    
    // Wait for mood to settle
    await page.waitForTimeout(2000)
    
    await expect(canvas).toHaveScreenshot('mood-transition-settled.png')
  })
  
  test('particle effects - food particles and bubbles @visual', async ({ page }) => {
    const canvas = page.locator('canvas')
    
    // Create food particle
    await canvas.click({ position: { x: 250, y: 180 } })
    
    // Capture food particle appearance
    await page.waitForTimeout(500)
    await expect(canvas).toHaveScreenshot('food-particles.png')
    
    // Wait for consumption and bubble effects
    await page.waitForTimeout(2000)
    await expect(canvas).toHaveScreenshot('consumption-bubbles.png')
  })
  
  test('trail effects - fish movement trails in different moods @visual', async ({ page }) => {
    const canvas = page.locator('canvas')
    
    // Create excited state for prominent trail
    await triggerMoodChange(page, 'excited')
    
    // Move cursor to create fish movement and trail
    await canvas.hover({ position: { x: 150, y: 120 } })
    await page.waitForTimeout(200)
    await canvas.hover({ position: { x: 250, y: 180 } })
    await page.waitForTimeout(200)
    await canvas.hover({ position: { x: 350, y: 220 } })
    await page.waitForTimeout(300)
    
    await expect(canvas).toHaveScreenshot('excited-trail-effects.png')
    
    // Now test shy state trail (should be dimmer)
    await triggerMoodChange(page, 'shy')
    
    await canvas.hover({ position: { x: 100, y: 100 } })
    await page.waitForTimeout(200)
    await canvas.hover({ position: { x: 200, y: 150 } })
    await page.waitForTimeout(300)
    
    await expect(canvas).toHaveScreenshot('shy-trail-effects.png')
  })
  
  test('background mood influence - environment changes @visual', async ({ page }) => {
    // Test different background tints based on mood
    
    // Excited state - warmer background
    await triggerMoodChange(page, 'excited')
    const canvasContainer = page.locator('.candlefish-container')
    await expect(canvasContainer).toHaveScreenshot('excited-background.png')
    
    // Lonely state - cooler background
    await triggerMoodChange(page, 'lonely')
    await expect(canvasContainer).toHaveScreenshot('lonely-background.png')
    
    // Shy state - darker background
    await triggerMoodChange(page, 'shy')
    await expect(canvasContainer).toHaveScreenshot('shy-background.png')
  })
  
  test('responsive mood display - different screen sizes @visual', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1280, height: 720 })
    await triggerMoodChange(page, 'playful')
    
    const canvas = page.locator('canvas')
    await expect(canvas).toHaveScreenshot('playful-desktop.png')
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.reload()
    await waitForCanvasReady(page)
    await triggerMoodChange(page, 'playful')
    
    await expect(canvas).toHaveScreenshot('playful-tablet.png')
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 })
    await page.reload()
    await waitForCanvasReady(page)
    await triggerMoodChange(page, 'playful')
    
    await expect(canvas).toHaveScreenshot('playful-mobile.png')
  })
  
  test('high trust milestone celebration effects @visual', async ({ page }) => {
    // Set up high trust scenario
    const highTrustMemory = {
      trustLevel: 89.5, // Just below milestone
      lastInteraction: Date.now(),
      feedingSpots: [{ x: 200, y: 150 }],
      interactionCount: 50,
      behaviorPattern: 'trusting',
      visitDates: [Date.now()],
      personalityQuirks: []
    }
    
    await page.evaluate(({ memory }) => {
      localStorage.setItem('candlefish_memory', JSON.stringify(memory))
    }, { memory: highTrustMemory })
    
    await page.reload()
    await waitForCanvasReady(page)
    
    const canvas = page.locator('canvas')
    
    // Feed to cross the 90 trust milestone
    await canvas.click({ position: { x: 200, y: 150 } })
    await page.waitForTimeout(1000)
    
    // Should show celebration effects
    await expect(canvas).toHaveScreenshot('trust-milestone-celebration.png')
  })
  
  test('accessibility - reduced motion preferences @visual', async ({ page }) => {
    // Enable reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' })
    
    await page.reload()
    await waitForCanvasReady(page)
    
    // Should show static fallback
    const container = page.locator('.candlefish-container')
    await expect(container).toHaveScreenshot('reduced-motion-fallback.png')
  })
  
  test('error states - graceful degradation @visual', async ({ page }) => {
    // Simulate WebGL context loss
    await page.evaluate(() => {
      const canvas = document.querySelector('canvas') as HTMLCanvasElement
      const gl = canvas.getContext('webgl')
      if (gl) {
        // Force context loss
        const loseContext = gl.getExtension('WEBGL_lose_context')
        if (loseContext) {
          loseContext.loseContext()
        }
      }
    })
    
    await page.waitForTimeout(1000)
    
    const container = page.locator('.candlefish-container')
    await expect(container).toHaveScreenshot('webgl-fallback.png')
  })
})