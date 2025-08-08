/**
 * Authentication setup for regular users in E2E tests
 * Creates authenticated sessions for user onboarding test scenarios
 */

import { test as setup } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const USER_AUTH_FILE = '.auth/test-user.json'
const TEST_CONFIG = {
  userEmail: process.env.TEST_USER_EMAIL || 'testuser@candlefish-test.ai',
  userPassword: process.env.TEST_USER_PASSWORD || 'test-user-password-123!',
  baseURL: process.env.DASHBOARD_URL || 'http://localhost:5173'
}

setup('create test user account', async ({ page }) => {
  console.log('👤 Creating test user account...')

  // Ensure auth directory exists
  const authDir = path.dirname(USER_AUTH_FILE)
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true })
  }

  // For this setup, we'll simulate user creation via admin interface
  // In a real scenario, this might involve API calls or database setup

  // Navigate to user registration/invitation flow
  const invitationToken = 'test-user-setup-token'
  await page.goto(`${TEST_CONFIG.baseURL}/onboarding/invite/${invitationToken}`)

  // Accept invitation
  await page.waitForSelector('[data-testid="invitation-welcome"]', { timeout: 10000 })
  await page.click('[data-testid="accept-invitation-button"]')

  // Set up password
  await page.waitForSelector('[data-testid="password-setup"]', { timeout: 10000 })
  await page.fill('[data-testid="password-input"]', TEST_CONFIG.userPassword)
  await page.fill('[data-testid="confirm-password-input"]', TEST_CONFIG.userPassword)
  await page.click('[data-testid="set-password-button"]')

  // Wait for password setup success
  await page.waitForSelector('[data-testid="password-setup-success"]', { timeout: 10000 })

  console.log('✅ Test user account created')
})

setup('authenticate test user', async ({ page }) => {
  console.log('🔑 Authenticating test user...')

  // Navigate to login page
  await page.goto(`${TEST_CONFIG.baseURL}/login`)

  // Wait for login form
  await page.waitForSelector('[data-testid="login-form"]', { timeout: 10000 })

  // Fill in credentials
  await page.fill('[data-testid="email-input"]', TEST_CONFIG.userEmail)
  await page.fill('[data-testid="password-input"]', TEST_CONFIG.userPassword)

  // Submit login
  await page.click('[data-testid="login-button"]')

  // Wait for successful login
  await page.waitForURL(/.*\/dashboard/, { timeout: 15000 })

  // Verify user dashboard is loaded
  await page.waitForSelector('[data-testid="user-dashboard"]', { timeout: 10000 })

  // Save authentication state
  await page.context().storageState({ path: USER_AUTH_FILE })

  console.log('✅ Test user authentication complete')
  console.log(`📁 Auth state saved to: ${USER_AUTH_FILE}`)
})

setup('verify user permissions', async ({ page }) => {
  console.log('🔍 Verifying user permissions...')

  // Load the saved auth state
  await page.goto(`${TEST_CONFIG.baseURL}/dashboard`)

  // Verify access to user features
  const userFeatures = [
    '[data-testid="nav-dashboard"]',
    '[data-testid="nav-repositories"]',
    '[data-testid="nav-sync-history"]',
    '[data-testid="nav-settings"]',
    '[data-testid="user-profile"]'
  ]

  for (const feature of userFeatures) {
    await page.waitForSelector(feature, { timeout: 5000 })
    console.log(`✓ User feature accessible: ${feature}`)
  }

  // Verify admin features are NOT accessible
  const adminFeatures = [
    '[data-testid="nav-user-management"]',
    '[data-testid="nav-phase-management"]',
    '[data-testid="admin-controls"]'
  ]

  for (const feature of adminFeatures) {
    const element = page.locator(feature)
    const isVisible = await element.isVisible().catch(() => false)
    if (isVisible) {
      throw new Error(`Admin feature should not be accessible to regular user: ${feature}`)
    }
    console.log(`✓ Admin feature properly restricted: ${feature}`)
  }

  // Test user-specific API access
  const response = await page.request.get(`${process.env.API_BASE_URL || 'http://localhost:3000'}/api/user/profile`)
  if (response.ok()) {
    console.log('✓ User API access verified')
  } else {
    throw new Error(`User API access failed: ${response.status()}`)
  }

  console.log('✅ User permissions verified')
})

setup('setup onboarding test data', async ({ page }) => {
  console.log('📋 Setting up onboarding test data...')

  // Create test data for onboarding scenarios
  const testData = {
    userId: 'test-user-onboarding',
    phase: 'phase-2',
    targetSteps: [
      { id: 'step-1', name: 'Account Setup', status: 'pending' },
      { id: 'step-2', name: 'Claude Desktop Installation', status: 'pending' },
      { id: 'step-3', name: 'Repository Access Configuration', status: 'pending' },
      { id: 'step-4', name: 'First Successful Sync', status: 'pending' }
    ],
    repositories: [
      { id: 'repo-1', name: 'test-repo-1', url: 'https://github.com/test/repo1' },
      { id: 'repo-2', name: 'test-repo-2', url: 'https://github.com/test/repo2' }
    ]
  }

  // Store test data in localStorage for use during tests
  await page.evaluate((data) => {
    localStorage.setItem('e2e-test-data', JSON.stringify(data))
  }, testData)

  console.log('✅ Onboarding test data setup complete')
})
