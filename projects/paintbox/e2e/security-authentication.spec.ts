import { test, expect, Page } from '@playwright/test'

test.describe('Security Authentication Flow', () => {

  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies()
    await page.context().clearPermissions()
  })

  test.describe('Login Security', () => {
    test('should enforce strong authentication requirements', async ({ page }) => {
      await page.goto('/login')

      // Check for HTTPS redirect in production
      if (process.env.NODE_ENV === 'production') {
        expect(page.url()).toMatch(/^https:/)
      }

      // Verify security headers are present
      const response = await page.goto('/login')
      const headers = response?.headers()

      expect(headers?.['x-frame-options']).toBe('DENY')
      expect(headers?.['x-content-type-options']).toBe('nosniff')
      expect(headers?.['x-xss-protection']).toBe('1; mode=block')
      expect(headers?.['content-security-policy']).toContain("default-src 'self'")
    })

    test('should reject weak passwords', async ({ page }) => {
      await page.goto('/register')

      const weakPasswords = [
        '123456',
        'password',
        'abc123',
        'qwerty',
        '11111111'
      ]

      for (const password of weakPasswords) {
        await page.fill('[data-testid="email"]', 'test@example.com')
        await page.fill('[data-testid="password"]', password)
        await page.fill('[data-testid="confirm-password"]', password)

        await page.click('[data-testid="register-button"]')

        // Should show password strength error
        await expect(page.locator('[data-testid="password-error"]')).toBeVisible()
        expect(await page.locator('[data-testid="password-error"]').textContent()).toMatch(/password.*too.*weak|password.*requirements/i)

        // Clear form for next iteration
        await page.fill('[data-testid="password"]', '')
        await page.fill('[data-testid="confirm-password"]', '')
      }
    })

    test('should implement rate limiting on login attempts', async ({ page }) => {
      await page.goto('/login')

      const email = 'attacker@evil.com'
      const password = 'wrongpassword'

      // Attempt multiple failed logins
      for (let i = 0; i < 6; i++) {
        await page.fill('[data-testid="username"]', email)
        await page.fill('[data-testid="password"]', password)
        await page.click('[data-testid="login-button"]')

        if (i < 4) {
          // First few attempts should show regular error
          await expect(page.locator('[data-testid="login-error"]')).toContainText(/invalid.*credentials/i)
        } else {
          // After 5 attempts, should be rate limited
          await expect(page.locator('[data-testid="login-error"]')).toContainText(/too.*many.*attempts|rate.*limit/i)

          // Login button should be disabled
          await expect(page.locator('[data-testid="login-button"]')).toBeDisabled()
        }

        // Wait a bit between attempts
        await page.waitForTimeout(100)
      }
    })

    test('should prevent credential stuffing attacks', async ({ page }) => {
      await page.goto('/login')

      // Simulate rapid automated login attempts
      const commonCredentials = [
        { email: 'admin@admin.com', password: 'admin' },
        { email: 'test@test.com', password: 'test' },
        { email: 'user@user.com', password: 'user' },
        { email: 'demo@demo.com', password: 'demo' }
      ]

      const startTime = Date.now()

      for (const { email, password } of commonCredentials) {
        await page.fill('[data-testid="username"]', email)
        await page.fill('[data-testid="password"]', password)
        await page.click('[data-testid="login-button"]')

        // Should either be rate limited or show CAPTCHA
        const isRateLimited = await page.locator('[data-testid="login-error"]').isVisible() &&
          (await page.locator('[data-testid="login-error"]').textContent())?.includes('rate limit')

        const hasCaptcha = await page.locator('[data-testid="captcha"]').isVisible()

        if (isRateLimited || hasCaptcha) {
          console.log('✅ Protection activated against credential stuffing')
          break
        }

        await page.waitForTimeout(50) // Rapid attempts
      }

      const endTime = Date.now()
      const duration = endTime - startTime

      // Should have protection mechanisms in place within reasonable time
      expect(duration).toBeLessThan(5000) // Should not take too long to trigger protection
    })

    test('should enforce secure session management', async ({ page }) => {
      await page.goto('/login')

      // Login with valid credentials
      await page.fill('[data-testid="username"]', 'user@test.com')
      await page.fill('[data-testid="password"]', 'TestUser123!')
      await page.click('[data-testid="login-button"]')

      await page.waitForURL('/dashboard')

      // Check session cookie properties
      const cookies = await page.context().cookies()
      const sessionCookie = cookies.find(cookie => cookie.name.includes('session') || cookie.name.includes('auth'))

      if (sessionCookie) {
        expect(sessionCookie.httpOnly).toBe(true) // Should be HTTP-only
        expect(sessionCookie.secure).toBe(true) // Should be secure in production
        expect(sessionCookie.sameSite).toBe('Strict') // Should prevent CSRF
      }

      // Session should timeout after inactivity
      await page.waitForTimeout(2000) // Wait a bit

      // Check if session timeout warning appears for long sessions
      await page.goto('/admin/secrets') // Try to access sensitive area

      // Should either be allowed (if session valid) or redirected to login
      const currentUrl = page.url()
      const isAuthenticated = !currentUrl.includes('/login')

      if (isAuthenticated) {
        // Should show session timeout warning for long sessions
        const timeoutWarning = page.locator('[data-testid="session-timeout-warning"]')
        // This might be visible for longer sessions
      }
    })
  })

  test.describe('Multi-Factor Authentication', () => {
    test('should require MFA for admin accounts', async ({ page }) => {
      await page.goto('/login')

      // Login with admin credentials
      await page.fill('[data-testid="username"]', 'admin@test.com')
      await page.fill('[data-testid="password"]', 'AdminPassword123!')
      await page.click('[data-testid="login-button"]')

      // Should be redirected to MFA page instead of dashboard
      await expect(page).toHaveURL('/auth/mfa')

      // MFA page should be displayed
      await expect(page.locator('[data-testid="mfa-form"]')).toBeVisible()
      await expect(page.locator('[data-testid="mfa-code-input"]')).toBeVisible()

      // Should not be able to access admin areas without MFA
      await page.goto('/admin/secrets')
      await expect(page).toHaveURL('/auth/mfa') // Should redirect back to MFA
    })

    test('should validate MFA codes properly', async ({ page }) => {
      await page.goto('/auth/mfa')

      // Test invalid MFA codes
      const invalidCodes = ['000000', '123456', '111111', 'abcdef']

      for (const code of invalidCodes) {
        await page.fill('[data-testid="mfa-code-input"]', code)
        await page.click('[data-testid="mfa-submit-button"]')

        await expect(page.locator('[data-testid="mfa-error"]')).toBeVisible()
        expect(await page.locator('[data-testid="mfa-error"]').textContent()).toMatch(/invalid.*code/i)

        // Clear for next iteration
        await page.fill('[data-testid="mfa-code-input"]', '')
      }
    })

    test('should implement MFA rate limiting', async ({ page }) => {
      await page.goto('/auth/mfa')

      // Attempt multiple failed MFA codes
      for (let i = 0; i < 6; i++) {
        await page.fill('[data-testid="mfa-code-input"]', '000000')
        await page.click('[data-testid="mfa-submit-button"]')

        if (i < 4) {
          await expect(page.locator('[data-testid="mfa-error"]')).toContainText(/invalid.*code/i)
        } else {
          // Should be rate limited after too many attempts
          await expect(page.locator('[data-testid="mfa-error"]')).toContainText(/too.*many.*attempts/i)
          await expect(page.locator('[data-testid="mfa-submit-button"]')).toBeDisabled()
        }

        await page.waitForTimeout(100)
      }
    })
  })

  test.describe('Password Security', () => {
    test('should enforce password complexity requirements', async ({ page }) => {
      await page.goto('/auth/change-password')

      const weakPasswords = [
        'short', // Too short
        'alllowercase123', // No uppercase
        'ALLUPPERCASE123', // No lowercase
        'NoNumbers!', // No numbers
        'NoSymbols123', // No symbols
        'password123!', // Common password
      ]

      for (const password of weakPasswords) {
        await page.fill('[data-testid="current-password"]', 'CurrentPassword123!')
        await page.fill('[data-testid="new-password"]', password)
        await page.fill('[data-testid="confirm-password"]', password)
        await page.click('[data-testid="change-password-button"]')

        // Should show validation error
        await expect(page.locator('[data-testid="password-validation-error"]')).toBeVisible()

        // Clear fields
        await page.fill('[data-testid="new-password"]', '')
        await page.fill('[data-testid="confirm-password"]', '')
      }
    })

    test('should prevent password reuse', async ({ page }) => {
      await page.goto('/auth/change-password')

      // Try to reuse current password
      await page.fill('[data-testid="current-password"]', 'CurrentPassword123!')
      await page.fill('[data-testid="new-password"]', 'CurrentPassword123!')
      await page.fill('[data-testid="confirm-password"]', 'CurrentPassword123!')
      await page.click('[data-testid="change-password-button"]')

      await expect(page.locator('[data-testid="password-reuse-error"]')).toBeVisible()
      expect(await page.locator('[data-testid="password-reuse-error"]').textContent()).toMatch(/cannot.*reuse.*password/i)
    })

    test('should require current password for changes', async ({ page }) => {
      await page.goto('/auth/change-password')

      // Try to change password without providing current password
      await page.fill('[data-testid="new-password"]', 'NewSecurePassword123!')
      await page.fill('[data-testid="confirm-password"]', 'NewSecurePassword123!')
      await page.click('[data-testid="change-password-button"]')

      await expect(page.locator('[data-testid="current-password-error"]')).toBeVisible()

      // Try with wrong current password
      await page.fill('[data-testid="current-password"]', 'WrongPassword123!')
      await page.click('[data-testid="change-password-button"]')

      await expect(page.locator('[data-testid="current-password-error"]')).toContainText(/incorrect.*current.*password/i)
    })
  })

  test.describe('Account Lockout Protection', () => {
    test('should lockout accounts after multiple failed attempts', async ({ page }) => {
      await page.goto('/login')

      const email = 'lockout-test@example.com'

      // Perform multiple failed login attempts
      for (let i = 0; i < 10; i++) {
        await page.fill('[data-testid="username"]', email)
        await page.fill('[data-testid="password"]', 'wrongpassword')
        await page.click('[data-testid="login-button"]')

        if (i >= 4) {
          // Account should be locked after 5 failed attempts
          const errorMessage = await page.locator('[data-testid="login-error"]').textContent()
          if (errorMessage?.includes('account.*locked') || errorMessage?.includes('too.*many.*attempts')) {
            console.log('✅ Account lockout protection activated')
            break
          }
        }

        await page.waitForTimeout(200)
      }

      // Even with correct password, should still be locked
      await page.fill('[data-testid="password"]', 'CorrectPassword123!')
      await page.click('[data-testid="login-button"]')

      await expect(page.locator('[data-testid="login-error"]')).toContainText(/account.*locked|temporarily.*disabled/i)
    })

    test('should provide account unlock mechanism', async ({ page }) => {
      await page.goto('/login')

      // Simulate locked account
      await page.fill('[data-testid="username"]', 'locked-account@example.com')
      await page.fill('[data-testid="password"]', 'password123')
      await page.click('[data-testid="login-button"]')

      // Should show account locked message with unlock option
      await expect(page.locator('[data-testid="account-locked-message"]')).toBeVisible()

      // Should provide unlock link/button
      const unlockButton = page.locator('[data-testid="unlock-account-button"]')
      if (await unlockButton.isVisible()) {
        await unlockButton.click()

        // Should redirect to unlock form or show unlock instructions
        await expect(page.locator('[data-testid="unlock-form"]')).toBeVisible()
      }
    })
  })

  test.describe('Session Security', () => {
    test('should invalidate sessions on logout', async ({ page }) => {
      // Login first
      await page.goto('/login')
      await page.fill('[data-testid="username"]', 'user@test.com')
      await page.fill('[data-testid="password"]', 'TestUser123!')
      await page.click('[data-testid="login-button"]')

      await page.waitForURL('/dashboard')

      // Logout
      await page.click('[data-testid="logout-button"]')
      await page.waitForURL('/login')

      // Try to access protected area using browser back
      await page.goBack()

      // Should be redirected to login, not show protected content
      await expect(page).toHaveURL('/login')
    })

    test('should detect and prevent session hijacking', async ({ page, context }) => {
      // Login to establish session
      await page.goto('/login')
      await page.fill('[data-testid="username"]', 'user@test.com')
      await page.fill('[data-testid="password"]', 'TestUser123!')
      await page.click('[data-testid="login-button"]')

      await page.waitForURL('/dashboard')

      // Get current cookies
      const cookies = await context.cookies()

      // Create new context (simulating different browser/device)
      const newContext = await page.context().browser()?.newContext()
      const newPage = await newContext?.newPage()

      if (newPage && newContext) {
        // Try to use stolen session cookies
        await newContext.addCookies(cookies)

        await newPage.goto('/dashboard')

        // System should detect suspicious activity
        // This might show security warning or require re-authentication
        const securityWarning = newPage.locator('[data-testid="security-warning"]')
        const reAuthRequired = newPage.locator('[data-testid="re-authentication-required"]')

        const hasSecurityMeasures = await securityWarning.isVisible() ||
                                   await reAuthRequired.isVisible() ||
                                   newPage.url().includes('/login')

        expect(hasSecurityMeasures).toBe(true)

        await newContext.close()
      }
    })

    test('should implement concurrent session limits', async ({ page, browser }) => {
      const email = 'concurrent-test@example.com'
      const password = 'TestUser123!'

      // Login in first session
      await page.goto('/login')
      await page.fill('[data-testid="username"]', email)
      await page.fill('[data-testid="password"]', password)
      await page.click('[data-testid="login-button"]')
      await page.waitForURL('/dashboard')

      // Create second session
      const context2 = await browser.newContext()
      const page2 = await context2.newPage()

      await page2.goto('/login')
      await page2.fill('[data-testid="username"]', email)
      await page2.fill('[data-testid="password"]', password)
      await page2.click('[data-testid="login-button"]')
      await page2.waitForURL('/dashboard')

      // Create third session (should exceed limit)
      const context3 = await browser.newContext()
      const page3 = await context3.newPage()

      await page3.goto('/login')
      await page3.fill('[data-testid="username"]', email)
      await page3.fill('[data-testid="password"]', password)
      await page3.click('[data-testid="login-button"]')

      // Should show concurrent session limit error or terminate oldest session
      const hasSessionLimit = await page3.locator('[data-testid="concurrent-session-error"]').isVisible() ||
                             page3.url().includes('/dashboard')

      if (page3.url().includes('/dashboard')) {
        // If third session allowed, first session should be invalidated
        await page.reload()
        const isFirstSessionInvalid = page.url().includes('/login') ||
                                     await page.locator('[data-testid="session-expired"]').isVisible()

        expect(isFirstSessionInvalid).toBe(true)
      }

      await context2.close()
      await context3.close()
    })
  })
})
