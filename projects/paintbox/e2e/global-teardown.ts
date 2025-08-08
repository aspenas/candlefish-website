import { FullConfig } from '@playwright/test'
import fs from 'fs/promises'
import path from 'path'

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up E2E test environment...')

  try {
    // Clean up auth files
    const authDir = path.join(__dirname, 'auth')
    try {
      await fs.rmdir(authDir, { recursive: true })
      console.log('🗑️  Cleaned up authentication files')
    } catch (error) {
      // Directory might not exist, ignore
    }

    // Clean up any test artifacts
    const testResultsDir = path.join(process.cwd(), 'test-results')
    try {
      const files = await fs.readdir(testResultsDir)
      const oldFiles = files.filter(file => {
        const filePath = path.join(testResultsDir, file)
        try {
          const stats = require('fs').statSync(filePath)
          const dayAgo = Date.now() - (24 * 60 * 60 * 1000)
          return stats.mtime.getTime() < dayAgo
        } catch {
          return false
        }
      })

      for (const file of oldFiles) {
        await fs.unlink(path.join(testResultsDir, file))
      }

      if (oldFiles.length > 0) {
        console.log(`🗑️  Cleaned up ${oldFiles.length} old test artifacts`)
      }
    } catch (error) {
      // Directory might not exist, ignore
    }

    console.log('✅ Global teardown completed successfully')

  } catch (error) {
    console.error('❌ Global teardown failed:', error)
  }
}

export default globalTeardown
