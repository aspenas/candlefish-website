/**
 * Cleanup authentication state for regular users after E2E tests
 */

import { test as cleanup } from '@playwright/test'
import fs from 'fs'

const USER_AUTH_FILE = '.auth/test-user.json'

cleanup('cleanup user authentication', async ({ page }) => {
  console.log('🧹 Cleaning up user authentication...')

  try {
    // Navigate to user logout
    await page.goto(`${process.env.DASHBOARD_URL || 'http://localhost:5173'}/logout`)

    // Wait for logout confirmation
    await page.waitForSelector('[data-testid="logout-success"]', {
      timeout: 5000
    }).catch(() => {
      // Logout page might not exist, continue cleanup
      console.log('⚠️ User logout page not found, continuing cleanup...')
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
    console.log(`⚠️ Error during user logout: ${error.message}`)
  }

  // Remove auth file
  if (fs.existsSync(USER_AUTH_FILE)) {
    fs.unlinkSync(USER_AUTH_FILE)
    console.log(`🗑️ Removed auth file: ${USER_AUTH_FILE}`)
  }

  console.log('✅ User authentication cleanup complete')
})
