/**
 * Cleanup authentication state for admin users after E2E tests
 */

import { test as cleanup } from '@playwright/test'
import fs from 'fs'

const ADMIN_AUTH_FILE = '.auth/admin-user.json'

cleanup('cleanup admin authentication', async ({ page }) => {
  console.log('🧹 Cleaning up admin authentication...')

  try {
    // Navigate to admin logout
    await page.goto(`${process.env.DASHBOARD_URL || 'http://localhost:5173'}/admin/logout`)

    // Wait for logout confirmation
    await page.waitForSelector('[data-testid="logout-success"]', {
      timeout: 5000
    }).catch(() => {
      // Logout page might not exist, continue cleanup
      console.log('⚠️ Admin logout page not found, continuing cleanup...')
    })

    // Clear all storage
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
      // Clear any cookies
      document.cookie.split(";").forEach(function(c) {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
      })
    })

  } catch (error) {
    console.log(`⚠️ Error during admin logout: ${error.message}`)
  }

  // Remove auth file
  if (fs.existsSync(ADMIN_AUTH_FILE)) {
    fs.unlinkSync(ADMIN_AUTH_FILE)
    console.log(`🗑️ Removed auth file: ${ADMIN_AUTH_FILE}`)
  }

  console.log('✅ Admin authentication cleanup complete')
})
