import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  console.log('🔧 Setting up E2E test environment...')

  const { baseURL } = config.projects[0].use

  // Launch browser for setup
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // Ensure the application is running
    console.log(`🌐 Checking application availability at ${baseURL}`)
    await page.goto(baseURL || 'http://localhost:3000')
    await page.waitForLoadState('networkidle')

    // Setup test data and authentication states
    console.log('🔑 Setting up test authentication...')

    // Create admin user session for security tests
    await page.goto('/admin/login')
    await page.fill('[data-testid="username"]', 'admin@test.com')
    await page.fill('[data-testid="password"]', 'TestAdmin123!')
    await page.click('[data-testid="login-button"]')

    // Wait for successful login
    await page.waitForURL('/admin/dashboard')

    // Store admin session
    const adminStorage = await context.storageState()
    await page.context().storageState({ path: 'e2e/auth/admin-session.json' })

    // Create regular user session
    await page.goto('/login')
    await page.fill('[data-testid="username"]', 'user@test.com')
    await page.fill('[data-testid="password"]', 'TestUser123!')
    await page.click('[data-testid="login-button"]')

    // Wait for successful login
    await page.waitForURL('/dashboard')

    // Store user session
    await page.context().storageState({ path: 'e2e/auth/user-session.json' })

    // Setup mock API responses for security testing
    console.log('🎭 Setting up mock responses for security tests...')

    await page.route('**/api/v1/secrets/**', async (route) => {
      const url = route.request().url()
      const method = route.request().method()

      // Mock successful responses for most security endpoints
      if (url.includes('/config')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            environment: 'test',
            version: '1.0.0',
            features: {
              salesforce: true,
              companycam: true,
              audit: true
            },
            security: {
              tokenExpiry: 3600,
              rateLimits: {
                global: 1000,
                perUser: 100
              }
            }
          })
        })
      } else {
        // Default to continuing the request
        await route.continue()
      }
    })

    console.log('✅ Global setup completed successfully')

  } catch (error) {
    console.error('❌ Global setup failed:', error)
    throw error
  } finally {
    await browser.close()
  }
}

export default globalSetup
