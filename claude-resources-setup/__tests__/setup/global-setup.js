import { chromium } from '@playwright/test'

async function globalSetup() {
  // Global setup that runs once before all tests
  console.log('🚀 Starting E2E test suite setup...')

  // Check if services are running
  const services = [
    { name: 'Dashboard', url: process.env.DASHBOARD_URL || 'http://localhost:5173' },
    { name: 'API', url: process.env.API_BASE_URL || 'http://localhost:3000' }
  ]

  for (const service of services) {
    try {
      const response = await fetch(`${service.url}/health`, {
        method: 'GET',
        timeout: 5000
      })

      if (response.ok) {
        console.log(`✅ ${service.name} service is healthy at ${service.url}`)
      } else {
        console.warn(`⚠️  ${service.name} service returned ${response.status} at ${service.url}`)
      }
    } catch (error) {
      console.error(`❌ ${service.name} service not reachable at ${service.url}:`, error.message)

      // Don't fail setup if services aren't running locally
      if (process.env.CI !== 'true') {
        console.log('   Continuing with mock services for local development...')
      }
    }
  }

  // Set up test database or mock services if needed
  if (process.env.SETUP_TEST_DB === 'true') {
    console.log('🗄️  Setting up test database...')
    // Database setup code would go here
  }

  // Create browser context for shared state
  const browser = await chromium.launch()
  const context = await browser.newContext()

  // Perform any authentication setup
  if (process.env.TEST_AUTH_TOKEN) {
    await context.addInitScript(() => {
      window.localStorage.setItem('auth_token', process.env.TEST_AUTH_TOKEN)
    })
  }

  // Store context state for tests
  await context.storageState({ path: '__tests__/setup/auth-state.json' })
  await browser.close()

  console.log('✅ E2E test suite setup complete!')
}

export default globalSetup
