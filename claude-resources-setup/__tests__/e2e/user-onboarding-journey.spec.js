/**
 * End-to-End tests for complete user onboarding journey
 * Tests the entire user experience from invitation to completion
 */

import { test, expect } from '@playwright/test'

// Test configuration
const TEST_CONFIG = {
  baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
  adminEmail: process.env.TEST_ADMIN_EMAIL || 'admin@candlefish-test.ai',
  adminPassword: process.env.TEST_ADMIN_PASSWORD || 'test-admin-password',
  testUserEmail: 'test-user@candlefish-test.ai',
  testUserPassword: 'test-user-password',
  timeout: 30000
}

// Test data setup
const TEST_USER = {
  username: 'e2e-test-user',
  email: TEST_CONFIG.testUserEmail,
  department: 'Engineering',
  role: 'developer',
  phase: 'phase-2'
}

const ONBOARDING_STEPS = [
  {
    id: 'step-1',
    name: 'Account Setup',
    description: 'Set up your account and profile',
    selector: '[data-testid="step-account-setup"]',
    completionSelector: '[data-testid="step-1-complete"]'
  },
  {
    id: 'step-2',
    name: 'Claude Desktop Installation',
    description: 'Download and install Claude Desktop application',
    selector: '[data-testid="step-claude-installation"]',
    completionSelector: '[data-testid="step-2-complete"]'
  },
  {
    id: 'step-3',
    name: 'Repository Access Configuration',
    description: 'Configure access to your repositories',
    selector: '[data-testid="step-repo-access"]',
    completionSelector: '[data-testid="step-3-complete"]'
  },
  {
    id: 'step-4',
    name: 'First Successful Sync',
    description: 'Complete your first repository sync',
    selector: '[data-testid="step-first-sync"]',
    completionSelector: '[data-testid="step-4-complete"]'
  }
]

test.describe('User Onboarding Journey E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Set longer timeout for E2E tests
    test.setTimeout(60000)

    // Navigate to the application
    await page.goto(TEST_CONFIG.baseURL)

    // Clear any existing state
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
  })

  test.describe('Admin Initiated Onboarding', () => {
    test('should complete full admin-initiated user onboarding flow', async ({ page }) => {
      // Step 1: Admin Login
      console.log('🔐 Admin logging in...')
      await page.goto(`${TEST_CONFIG.baseURL}/admin/login`)

      await page.fill('[data-testid="email-input"]', TEST_CONFIG.adminEmail)
      await page.fill('[data-testid="password-input"]', TEST_CONFIG.adminPassword)
      await page.click('[data-testid="login-button"]')

      await expect(page).toHaveURL(/.*\/admin\/dashboard/)
      await expect(page.locator('[data-testid="admin-dashboard"]')).toBeVisible()

      // Step 2: Navigate to User Management
      console.log('👥 Navigating to user management...')
      await page.click('[data-testid="nav-user-management"]')
      await expect(page).toHaveURL(/.*\/admin\/users/)

      // Step 3: Add New User
      console.log('➕ Adding new user...')
      await page.click('[data-testid="add-user-button"]')

      const addUserModal = page.locator('[data-testid="add-user-modal"]')
      await expect(addUserModal).toBeVisible()

      await page.fill('[data-testid="user-username"]', TEST_USER.username)
      await page.fill('[data-testid="user-email"]', TEST_USER.email)
      await page.selectOption('[data-testid="user-department"]', TEST_USER.department)
      await page.selectOption('[data-testid="user-role"]', TEST_USER.role)
      await page.selectOption('[data-testid="user-phase"]', TEST_USER.phase)

      await page.click('[data-testid="create-user-button"]')

      // Wait for user creation success
      await expect(page.locator('[data-testid="user-created-success"]')).toBeVisible()
      await expect(addUserModal).not.toBeVisible()

      // Step 4: Verify User in List
      console.log('✅ Verifying user in list...')
      const userRow = page.locator(`[data-testid="user-row-${TEST_USER.username}"]`)
      await expect(userRow).toBeVisible()
      await expect(userRow.locator('[data-testid="user-status"]')).toHaveText('Invited')

      // Step 5: Send Invitation
      console.log('📧 Sending invitation...')
      await userRow.locator('[data-testid="send-invitation-button"]').click()

      const invitationModal = page.locator('[data-testid="invitation-modal"]')
      await expect(invitationModal).toBeVisible()

      await page.click('[data-testid="send-invitation-confirm"]')
      await expect(page.locator('[data-testid="invitation-sent-success"]')).toBeVisible()

      // Verify invitation status updated
      await expect(userRow.locator('[data-testid="user-status"]')).toHaveText('Invitation Sent')

      // Step 6: Start User Onboarding (simulate user clicking invitation link)
      console.log('🚀 Starting user onboarding...')
      await page.click('[data-testid="start-onboarding-button"]', { force: true })

      // Wait for onboarding to begin
      await expect(page.locator('[data-testid="onboarding-started-success"]')).toBeVisible()
      await expect(userRow.locator('[data-testid="user-status"]')).toHaveText('Onboarding')

      console.log('✅ Admin-initiated onboarding flow completed')
    })

    test('should handle bulk user onboarding', async ({ page }) => {
      // Step 1: Admin Login
      await page.goto(`${TEST_CONFIG.baseURL}/admin/login`)
      await page.fill('[data-testid="email-input"]', TEST_CONFIG.adminEmail)
      await page.fill('[data-testid="password-input"]', TEST_CONFIG.adminPassword)
      await page.click('[data-testid="login-button"]')

      // Step 2: Navigate to Bulk Import
      console.log('📥 Starting bulk user import...')
      await page.click('[data-testid="nav-user-management"]')
      await page.click('[data-testid="bulk-import-button"]')

      const bulkImportModal = page.locator('[data-testid="bulk-import-modal"]')
      await expect(bulkImportModal).toBeVisible()

      // Step 3: Upload CSV File (simulate)
      const csvData = `
username,email,department,role,phase
bulk-user-1,bulk1@candlefish-test.ai,Engineering,developer,phase-2
bulk-user-2,bulk2@candlefish-test.ai,Product,manager,phase-2
bulk-user-3,bulk3@candlefish-test.ai,Design,designer,phase-2
      `.trim()

      // In a real test, you would upload an actual file
      // For this demo, we'll simulate the CSV data input
      await page.fill('[data-testid="csv-data-input"]', csvData)
      await page.click('[data-testid="process-csv-button"]')

      // Step 4: Review and Confirm Import
      await expect(page.locator('[data-testid="csv-preview"]')).toBeVisible()
      await expect(page.locator('[data-testid="import-summary"]')).toContainText('3 users ready to import')

      await page.click('[data-testid="confirm-bulk-import"]')

      // Step 5: Wait for Import Completion
      await expect(page.locator('[data-testid="bulk-import-progress"]')).toBeVisible()
      await expect(page.locator('[data-testid="bulk-import-complete"]')).toBeVisible({ timeout: 15000 })

      // Step 6: Verify Imported Users
      const importResults = page.locator('[data-testid="import-results"]')
      await expect(importResults).toContainText('Successfully imported: 3')
      await expect(importResults).toContainText('Failed: 0')

      console.log('✅ Bulk user onboarding completed')
    })
  })

  test.describe('User Self-Service Onboarding', () => {
    test('should complete full user self-service onboarding journey', async ({ page }) => {
      // Step 1: User receives invitation and clicks link
      console.log('📧 User clicking invitation link...')
      const invitationToken = 'test-invitation-token-123'
      await page.goto(`${TEST_CONFIG.baseURL}/onboarding/invite/${invitationToken}`)

      // Step 2: Accept Invitation
      console.log('✋ Accepting invitation...')
      await expect(page.locator('[data-testid="invitation-welcome"]')).toBeVisible()
      await expect(page.locator('[data-testid="invited-user-info"]')).toContainText(TEST_USER.email)

      await page.click('[data-testid="accept-invitation-button"]')

      // Step 3: Set Initial Password
      console.log('🔑 Setting up password...')
      await expect(page.locator('[data-testid="password-setup"]')).toBeVisible()

      await page.fill('[data-testid="password-input"]', TEST_CONFIG.testUserPassword)
      await page.fill('[data-testid="confirm-password-input"]', TEST_CONFIG.testUserPassword)
      await page.click('[data-testid="set-password-button"]')

      // Step 4: Enter Onboarding Flow
      console.log('🎯 Entering onboarding flow...')
      await expect(page).toHaveURL(/.*\/onboarding\/steps/)
      await expect(page.locator('[data-testid="onboarding-welcome"]')).toBeVisible()
      await expect(page.locator('[data-testid="progress-tracker"]')).toBeVisible()

      // Verify initial progress state
      await expect(page.locator('[data-testid="progress-percentage"]')).toHaveText('0%')
      await expect(page.locator('[data-testid="current-step"]')).toHaveText('Step 1 of 4')

      // Step 5: Complete Each Onboarding Step
      for (let i = 0; i < ONBOARDING_STEPS.length; i++) {
        const step = ONBOARDING_STEPS[i]
        console.log(`📋 Completing ${step.name}...`)

        // Verify current step is active
        await expect(page.locator(step.selector)).toBeVisible()
        await expect(page.locator('[data-testid="step-title"]')).toHaveText(step.name)
        await expect(page.locator('[data-testid="step-description"]')).toHaveText(step.description)

        // Complete step-specific actions
        await completeOnboardingStep(page, step, i)

        // Verify step completion
        await expect(page.locator(step.completionSelector)).toBeVisible()

        // Check progress update
        const expectedProgress = Math.round(((i + 1) / ONBOARDING_STEPS.length) * 100)
        await expect(page.locator('[data-testid="progress-percentage"]')).toHaveText(`${expectedProgress}%`)

        // Move to next step (unless it's the last step)
        if (i < ONBOARDING_STEPS.length - 1) {
          await page.click('[data-testid="next-step-button"]')

          // Verify step transition
          const nextStepNumber = i + 2
          await expect(page.locator('[data-testid="current-step"]')).toHaveText(`Step ${nextStepNumber} of 4`)
        }
      }

      // Step 6: Complete Onboarding
      console.log('🎉 Completing onboarding...')
      await page.click('[data-testid="complete-onboarding-button"]')

      // Step 7: Verify Completion
      await expect(page.locator('[data-testid="onboarding-complete"]')).toBeVisible()
      await expect(page.locator('[data-testid="completion-message"]')).toContainText('Congratulations!')
      await expect(page.locator('[data-testid="progress-percentage"]')).toHaveText('100%')

      // Step 8: Navigate to Main Dashboard
      await page.click('[data-testid="go-to-dashboard-button"]')
      await expect(page).toHaveURL(/.*\/dashboard/)
      await expect(page.locator('[data-testid="user-dashboard"]')).toBeVisible()

      console.log('✅ User self-service onboarding journey completed')
    })

    test('should handle onboarding interruption and resume', async ({ page }) => {
      const invitationToken = 'resume-test-token-456'

      // Step 1: Start onboarding
      console.log('🔄 Starting onboarding (to be interrupted)...')
      await page.goto(`${TEST_CONFIG.baseURL}/onboarding/invite/${invitationToken}`)
      await page.click('[data-testid="accept-invitation-button"]')

      await page.fill('[data-testid="password-input"]', TEST_CONFIG.testUserPassword)
      await page.fill('[data-testid="confirm-password-input"]', TEST_CONFIG.testUserPassword)
      await page.click('[data-testid="set-password-button"]')

      // Step 2: Complete first step only
      await completeOnboardingStep(page, ONBOARDING_STEPS[0], 0)
      await expect(page.locator('[data-testid="progress-percentage"]')).toHaveText('25%')

      // Step 3: Simulate interruption (close browser/tab)
      console.log('❌ Simulating onboarding interruption...')
      await page.evaluate(() => {
        // Simulate saving state to localStorage
        localStorage.setItem('onboarding_progress', JSON.stringify({
          userId: 'resume-test-user',
          currentStep: 1,
          completedSteps: ['step-1'],
          progress: 25
        }))
      })

      // Simulate navigation away
      await page.goto(`${TEST_CONFIG.baseURL}/some-other-page`)

      // Step 4: Return to onboarding
      console.log('🔄 Resuming onboarding...')
      await page.goto(`${TEST_CONFIG.baseURL}/onboarding/resume`)

      // Step 5: Verify resume state
      await expect(page.locator('[data-testid="onboarding-resume"]')).toBeVisible()
      await expect(page.locator('[data-testid="resume-message"]')).toContainText('Continue where you left off')
      await expect(page.locator('[data-testid="progress-percentage"]')).toHaveText('25%')
      await expect(page.locator('[data-testid="current-step"]')).toHaveText('Step 2 of 4')

      await page.click('[data-testid="continue-onboarding-button"]')

      // Step 6: Verify correct step is active
      await expect(page.locator(ONBOARDING_STEPS[1].selector)).toBeVisible()
      await expect(page.locator(ONBOARDING_STEPS[0].completionSelector)).toBeVisible()

      console.log('✅ Onboarding resume functionality verified')
    })

    test('should provide help and support during onboarding', async ({ page }) => {
      const invitationToken = 'help-test-token-789'

      // Start onboarding
      await page.goto(`${TEST_CONFIG.baseURL}/onboarding/invite/${invitationToken}`)
      await page.click('[data-testid="accept-invitation-button"]')

      await page.fill('[data-testid="password-input"]', TEST_CONFIG.testUserPassword)
      await page.fill('[data-testid="confirm-password-input"]', TEST_CONFIG.testUserPassword)
      await page.click('[data-testid="set-password-button"]')

      // Test help functionality
      console.log('❓ Testing help and support features...')

      // Step 1: Test contextual help
      await expect(page.locator('[data-testid="help-icon"]')).toBeVisible()
      await page.click('[data-testid="help-icon"]')

      const helpPanel = page.locator('[data-testid="help-panel"]')
      await expect(helpPanel).toBeVisible()
      await expect(helpPanel).toContainText('Account Setup Help')
      await expect(helpPanel).toContainText('This step helps you configure')

      // Step 2: Test video tutorial
      await page.click('[data-testid="watch-tutorial-button"]')

      const videoModal = page.locator('[data-testid="video-tutorial-modal"]')
      await expect(videoModal).toBeVisible()
      await expect(videoModal.locator('[data-testid="tutorial-video"]')).toBeVisible()

      await page.click('[data-testid="close-video-modal"]')
      await expect(videoModal).not.toBeVisible()

      // Step 3: Test FAQ
      await page.click('[data-testid="faq-button"]')

      const faqPanel = page.locator('[data-testid="faq-panel"]')
      await expect(faqPanel).toBeVisible()
      await expect(faqPanel.locator('[data-testid="faq-item"]').first()).toBeVisible()

      // Step 4: Test contact support
      await page.click('[data-testid="contact-support-button"]')

      const supportModal = page.locator('[data-testid="support-modal"]')
      await expect(supportModal).toBeVisible()

      await page.fill('[data-testid="support-message"]', 'I need help with account setup')
      await page.click('[data-testid="send-support-request"]')

      await expect(page.locator('[data-testid="support-sent-confirmation"]')).toBeVisible()

      console.log('✅ Help and support features verified')
    })
  })

  test.describe('Phase Management and Transitions', () => {
    test('should handle phase-specific onboarding flows', async ({ page }) => {
      // Test different onboarding flows for different phases
      const phases = [
        { id: 'phase-1', name: 'Leadership', expectedSteps: 5 },
        { id: 'phase-2', name: 'Development Team', expectedSteps: 4 },
        { id: 'phase-3', name: 'Extended Team', expectedSteps: 3 }
      ]

      for (const phase of phases) {
        console.log(`🎯 Testing ${phase.name} phase onboarding...`)

        const invitationToken = `phase-${phase.id}-token`
        await page.goto(`${TEST_CONFIG.baseURL}/onboarding/invite/${invitationToken}`)

        // Accept invitation
        await page.click('[data-testid="accept-invitation-button"]')

        // Set password
        await page.fill('[data-testid="password-input"]', TEST_CONFIG.testUserPassword)
        await page.fill('[data-testid="confirm-password-input"]', TEST_CONFIG.testUserPassword)
        await page.click('[data-testid="set-password-button"]')

        // Verify phase-specific content
        await expect(page.locator('[data-testid="phase-info"]')).toContainText(phase.name)
        await expect(page.locator('[data-testid="total-steps"]')).toHaveText(`${phase.expectedSteps}`)

        // Verify phase-specific customizations
        if (phase.id === 'phase-1') {
          await expect(page.locator('[data-testid="leadership-welcome"]')).toBeVisible()
          await expect(page.locator('[data-testid="admin-tools-info"]')).toBeVisible()
        } else if (phase.id === 'phase-2') {
          await expect(page.locator('[data-testid="developer-welcome"]')).toBeVisible()
          await expect(page.locator('[data-testid="technical-setup-info"]')).toBeVisible()
        }

        console.log(`✅ ${phase.name} phase onboarding verified`)

        // Clean up for next iteration
        await page.evaluate(() => {
          localStorage.clear()
          sessionStorage.clear()
        })
      }
    })

    test('should handle phase transitions and user migrations', async ({ page }) => {
      // Admin login
      await page.goto(`${TEST_CONFIG.baseURL}/admin/login`)
      await page.fill('[data-testid="email-input"]', TEST_CONFIG.adminEmail)
      await page.fill('[data-testid="password-input"]', TEST_CONFIG.adminPassword)
      await page.click('[data-testid="login-button"]')

      // Navigate to phase management
      console.log('🔄 Testing phase transitions...')
      await page.click('[data-testid="nav-phase-management"]')
      await expect(page).toHaveURL(/.*\/admin\/phases/)

      // Start next phase
      await page.click('[data-testid="start-phase-2-button"]')

      const confirmModal = page.locator('[data-testid="start-phase-confirmation"]')
      await expect(confirmModal).toBeVisible()
      await expect(confirmModal).toContainText('Are you ready to start Phase 2?')

      await page.click('[data-testid="confirm-start-phase"]')

      // Verify phase transition
      await expect(page.locator('[data-testid="phase-2-status"]')).toHaveText('In Progress')
      await expect(page.locator('[data-testid="phase-transition-success"]')).toBeVisible()

      // Test user migration between phases
      await page.click('[data-testid="migrate-users-button"]')

      const migrationModal = page.locator('[data-testid="user-migration-modal"]')
      await expect(migrationModal).toBeVisible()

      // Select users to migrate
      await page.check('[data-testid="migrate-user-checkbox-1"]')
      await page.check('[data-testid="migrate-user-checkbox-2"]')

      await page.click('[data-testid="confirm-migration"]')

      // Verify migration success
      await expect(page.locator('[data-testid="migration-success"]')).toBeVisible()
      await expect(page.locator('[data-testid="migrated-users-count"]')).toHaveText('2 users migrated')

      console.log('✅ Phase transitions and user migrations verified')
    })
  })

  test.describe('Error Handling and Recovery', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Start onboarding
      const invitationToken = 'network-error-token'
      await page.goto(`${TEST_CONFIG.baseURL}/onboarding/invite/${invitationToken}`)
      await page.click('[data-testid="accept-invitation-button"]')

      // Simulate network failure during password setup
      console.log('🌐 Testing network error handling...')
      await page.route('**/api/users/*/password', route => {
        route.abort('failed')
      })

      await page.fill('[data-testid="password-input"]', TEST_CONFIG.testUserPassword)
      await page.fill('[data-testid="confirm-password-input"]', TEST_CONFIG.testUserPassword)
      await page.click('[data-testid="set-password-button"]')

      // Verify error handling
      await expect(page.locator('[data-testid="network-error-message"]')).toBeVisible()
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible()

      // Test retry functionality
      await page.unroute('**/api/users/*/password')
      await page.click('[data-testid="retry-button"]')

      // Verify successful retry
      await expect(page.locator('[data-testid="password-setup-success"]')).toBeVisible()

      console.log('✅ Network error handling verified')
    })

    test('should handle validation errors', async ({ page }) => {
      const invitationToken = 'validation-error-token'
      await page.goto(`${TEST_CONFIG.baseURL}/onboarding/invite/${invitationToken}`)
      await page.click('[data-testid="accept-invitation-button"]')

      // Test password validation
      console.log('🔍 Testing validation errors...')

      // Weak password
      await page.fill('[data-testid="password-input"]', '123')
      await page.fill('[data-testid="confirm-password-input"]', '123')
      await page.click('[data-testid="set-password-button"]')

      await expect(page.locator('[data-testid="password-validation-error"]')).toBeVisible()
      await expect(page.locator('[data-testid="password-validation-error"]')).toContainText('Password must be at least 8 characters')

      // Mismatched passwords
      await page.fill('[data-testid="password-input"]', 'ValidPassword123!')
      await page.fill('[data-testid="confirm-password-input"]', 'DifferentPassword123!')
      await page.click('[data-testid="set-password-button"]')

      await expect(page.locator('[data-testid="password-mismatch-error"]')).toBeVisible()

      // Valid password
      await page.fill('[data-testid="confirm-password-input"]', 'ValidPassword123!')
      await page.click('[data-testid="set-password-button"]')

      await expect(page.locator('[data-testid="password-setup-success"]')).toBeVisible()

      console.log('✅ Validation error handling verified')
    })

    test('should handle expired invitation links', async ({ page }) => {
      console.log('⏰ Testing expired invitation handling...')

      const expiredToken = 'expired-invitation-token'
      await page.goto(`${TEST_CONFIG.baseURL}/onboarding/invite/${expiredToken}`)

      // Should show expired invitation page
      await expect(page.locator('[data-testid="invitation-expired"]')).toBeVisible()
      await expect(page.locator('[data-testid="expired-message"]')).toContainText('This invitation has expired')
      await expect(page.locator('[data-testid="request-new-invitation"]')).toBeVisible()

      // Test requesting new invitation
      await page.click('[data-testid="request-new-invitation"]')

      const requestModal = page.locator('[data-testid="new-invitation-request"]')
      await expect(requestModal).toBeVisible()

      await page.fill('[data-testid="request-email"]', TEST_CONFIG.testUserEmail)
      await page.click('[data-testid="send-request"]')

      await expect(page.locator('[data-testid="request-sent-confirmation"]')).toBeVisible()

      console.log('✅ Expired invitation handling verified')
    })
  })

  test.describe('Analytics and Tracking', () => {
    test('should track onboarding analytics events', async ({ page }) => {
      // Setup analytics event tracking
      const analyticsEvents = []

      await page.addInitScript(() => {
        window.analyticsEvents = []
        window.trackEvent = (event, data) => {
          window.analyticsEvents.push({ event, data, timestamp: Date.now() })
        }
      })

      // Start onboarding
      const invitationToken = 'analytics-test-token'
      await page.goto(`${TEST_CONFIG.baseURL}/onboarding/invite/${invitationToken}`)

      console.log('📊 Testing analytics tracking...')

      // Accept invitation
      await page.click('[data-testid="accept-invitation-button"]')

      // Set password
      await page.fill('[data-testid="password-input"]', TEST_CONFIG.testUserPassword)
      await page.fill('[data-testid="confirm-password-input"]', TEST_CONFIG.testUserPassword)
      await page.click '[data-testid="set-password-button"]')

      // Complete first step
      await completeOnboardingStep(page, ONBOARDING_STEPS[0], 0)

      // Verify analytics events were tracked
      const events = await page.evaluate(() => window.analyticsEvents)

      expect(events).toContainEqual(
        expect.objectContaining({
          event: 'onboarding_started',
          data: expect.objectContaining({
            userId: expect.any(String),
            phase: expect.any(String)
          })
        })
      )

      expect(events).toContainEqual(
        expect.objectContaining({
          event: 'onboarding_step_completed',
          data: expect.objectContaining({
            stepId: 'step-1',
            stepName: 'Account Setup'
          })
        })
      )

      console.log('✅ Analytics tracking verified')
    })
  })
})

// Helper function to complete different onboarding steps
async function completeOnboardingStep(page, step, stepIndex) {
  switch (step.id) {
    case 'step-1': // Account Setup
      await page.check('[data-testid="terms-agreement"]')
      await page.check('[data-testid="privacy-agreement"]')
      await page.fill('[data-testid="display-name"]', 'E2E Test User')
      await page.selectOption('[data-testid="timezone"]', 'America/New_York')
      await page.click('[data-testid="save-account-setup"]')
      break

    case 'step-2': // Claude Desktop Installation
      await page.click('[data-testid="download-claude-desktop"]')
      await page.waitForTimeout(2000) // Simulate download time
      await page.check('[data-testid="installation-complete-checkbox"]')
      await page.click('[data-testid="verify-installation"]')
      break

    case 'step-3': // Repository Access Configuration
      await page.fill('[data-testid="github-token"]', 'test-github-token-123')
      await page.click('[data-testid="connect-github"]')
      await page.waitForSelector('[data-testid="github-connected"]')
      await page.check('[data-testid="repo-checkbox-1"]')
      await page.check('[data-testid="repo-checkbox-2"]')
      await page.click('[data-testid="configure-repositories"]')
      break

    case 'step-4': // First Successful Sync
      await page.click('[data-testid="start-first-sync"]')
      await page.waitForSelector('[data-testid="sync-progress"]')
      await page.waitForSelector('[data-testid="sync-complete"]', { timeout: 30000 })
      await page.click('[data-testid="confirm-sync-success"]')
      break

    default:
      throw new Error(`Unknown step: ${step.id}`)
  }

  // Wait for step completion to be processed
  await page.waitForTimeout(1000)
}
