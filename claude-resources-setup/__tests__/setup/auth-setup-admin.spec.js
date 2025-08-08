/**
 * Authentication setup for admin users in E2E tests
 * Creates authenticated sessions for admin-specific test scenarios
 */

import { test as setup } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const ADMIN_AUTH_FILE = '.auth/admin-user.json'
const TEST_CONFIG = {
  adminEmail: process.env.TEST_ADMIN_EMAIL || 'admin@candlefish-test.ai',
  adminPassword: process.env.TEST_ADMIN_PASSWORD || 'test-admin-password-123!',
  baseURL: process.env.DASHBOARD_URL || 'http://localhost:5173'
}

setup('authenticate admin user', async ({ page }) => {
  console.log('🔐 Setting up admin authentication...')

  // Ensure auth directory exists
  const authDir = path.dirname(ADMIN_AUTH_FILE)
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true })
  }

  // Navigate to admin login page
  await page.goto(`${TEST_CONFIG.baseURL}/admin/login`)

  // Wait for login form to be visible
  await page.waitForSelector('[data-testid="admin-login-form"]', { timeout: 10000 })

  // Fill in admin credentials
  await page.fill('[data-testid="email-input"]', TEST_CONFIG.adminEmail)
  await page.fill('[data-testid="password-input"]', TEST_CONFIG.adminPassword)

  // Submit login form
  await page.click('[data-testid="login-button"]')

  // Wait for successful login redirect
  await page.waitForURL(/.*\/admin\/dashboard/, { timeout: 15000 })

  // Verify admin dashboard is loaded
  await page.waitForSelector('[data-testid="admin-dashboard"]', { timeout: 10000 })
  await page.waitForSelector('[data-testid="admin-nav"]', { timeout: 10000 })

  // Verify admin permissions
  const adminIndicator = page.locator('[data-testid="admin-indicator"]')
  await adminIndicator.waitFor({ state: 'visible' })

  // Save authentication state
  await page.context().storageState({ path: ADMIN_AUTH_FILE })

  console.log('✅ Admin authentication setup complete')
  console.log(`📁 Auth state saved to: ${ADMIN_AUTH_FILE}`)
})

setup('verify admin permissions', async ({ page }) => {
  console.log('🔍 Verifying admin permissions...')

  // Load the saved auth state
  await page.goto(`${TEST_CONFIG.baseURL}/admin/dashboard`)

  // Verify access to admin-only features
  const adminFeatures = [
    '[data-testid="nav-user-management"]',
    '[data-testid="nav-phase-management"]',
    '[data-testid="nav-deployment-control"]',
    '[data-testid="nav-system-settings"]',
    '[data-testid="nav-analytics"]'
  ]

  for (const feature of adminFeatures) {
    await page.waitForSelector(feature, { timeout: 5000 })
    console.log(`✓ Admin feature accessible: ${feature}`)
  }

  // Test admin-specific API access
  const response = await page.request.get(`${process.env.API_BASE_URL || 'http://localhost:3000'}/api/admin/system-status`)
  if (response.ok()) {
    console.log('✓ Admin API access verified')
  } else {
    throw new Error(`Admin API access failed: ${response.status()}`)
  }

  console.log('✅ Admin permissions verified')
})
