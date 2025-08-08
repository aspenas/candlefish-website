async function globalTeardown() {
  // Global teardown that runs once after all tests
  console.log('🧹 Starting E2E test suite teardown...')

  // Clean up test data
  if (process.env.CLEANUP_TEST_DATA === 'true') {
    console.log('🗑️  Cleaning up test data...')

    try {
      // Clean up any test repositories, files, or database entries
      // This would make API calls to clean up test data

      const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000'

      // Example cleanup calls
      const cleanupEndpoints = [
        '/api/test/cleanup/repositories',
        '/api/test/cleanup/sync-operations',
        '/api/test/cleanup/team-members'
      ]

      for (const endpoint of cleanupEndpoints) {
        try {
          await fetch(`${apiBaseUrl}${endpoint}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${process.env.TEST_API_TOKEN || 'test-token'}`,
              'Content-Type': 'application/json'
            }
          })
          console.log(`✅ Cleaned up ${endpoint}`)
        } catch (error) {
          console.warn(`⚠️  Failed to cleanup ${endpoint}:`, error.message)
        }
      }
    } catch (error) {
      console.error('❌ Error during test data cleanup:', error.message)
    }
  }

  // Clean up temporary files
  try {
    const fs = await import('fs/promises')
    const path = await import('path')

    const tempFiles = [
      '__tests__/setup/auth-state.json',
      'test-results/temp-screenshots',
      'test-results/temp-videos'
    ]

    for (const file of tempFiles) {
      try {
        const filePath = path.resolve(file)
        await fs.access(filePath)
        await fs.rm(filePath, { recursive: true, force: true })
        console.log(`🗑️  Removed temporary file: ${file}`)
      } catch (error) {
        // File doesn't exist, which is fine
      }
    }
  } catch (error) {
    console.warn('⚠️  Error cleaning up temporary files:', error.message)
  }

  // Generate test summary
  try {
    const testResults = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'test',
      dashboardUrl: process.env.DASHBOARD_URL || 'http://localhost:5173',
      apiUrl: process.env.API_BASE_URL || 'http://localhost:3000',
      ci: process.env.CI === 'true'
    }

    const fs = await import('fs/promises')
    await fs.writeFile(
      'test-results/test-summary.json',
      JSON.stringify(testResults, null, 2)
    )
    console.log('📊 Generated test summary')
  } catch (error) {
    console.warn('⚠️  Failed to generate test summary:', error.message)
  }

  console.log('✅ E2E test suite teardown complete!')
}

export default globalTeardown
