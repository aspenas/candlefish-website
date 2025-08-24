describe('Authentication Flow', () => {
  beforeEach(() => {
    cy.task('cleanDatabase');
    cy.task('seedDatabase');
  });

  describe('Login Process', () => {
    it('should display login form on initial visit', () => {
      cy.visit('/login');

      cy.get('[data-testid="login-form"]').should('be.visible');
      cy.get('[data-testid="email-input"]').should('be.visible');
      cy.get('[data-testid="password-input"]').should('be.visible');
      cy.get('[data-testid="login-button"]').should('be.visible');

      // Check accessibility
      cy.checkA11y();
    });

    it('should successfully login with valid credentials', () => {
      cy.visit('/login');

      cy.get('[data-testid="email-input"]').type('test@candlefish.ai');
      cy.get('[data-testid="password-input"]').type('cypress-test-password');
      cy.get('[data-testid="login-button"]').click();

      // Wait for login API call
      cy.wait('@login');

      // Should redirect to dashboard
      cy.url().should('include', '/dashboard');
      cy.get('[data-testid="dashboard"]').should('be.visible');
      cy.get('[data-testid="user-menu"]').should('be.visible');

      // Check user data in localStorage
      cy.window().its('localStorage').invoke('getItem', 'authToken').should('exist');
    });

    it('should show error for invalid credentials', () => {
      cy.visit('/login');

      cy.get('[data-testid="email-input"]').type('invalid@email.com');
      cy.get('[data-testid="password-input"]').type('wrongpassword');
      cy.get('[data-testid="login-button"]').click();

      // Should show error message
      cy.get('[data-testid="error-message"]')
        .should('be.visible')
        .and('contain', 'Invalid credentials');

      // Should stay on login page
      cy.url().should('include', '/login');
    });

    it('should validate required fields', () => {
      cy.visit('/login');

      // Try to submit empty form
      cy.get('[data-testid="login-button"]').click();

      cy.get('[data-testid="email-error"]')
        .should('be.visible')
        .and('contain', 'Email is required');

      cy.get('[data-testid="password-error"]')
        .should('be.visible')
        .and('contain', 'Password is required');
    });

    it('should validate email format', () => {
      cy.visit('/login');

      cy.get('[data-testid="email-input"]').type('invalid-email');
      cy.get('[data-testid="password-input"]').type('password123');
      cy.get('[data-testid="login-button"]').click();

      cy.get('[data-testid="email-error"]')
        .should('be.visible')
        .and('contain', 'Please enter a valid email');
    });

    it('should handle login loading state', () => {
      cy.intercept('POST', '/api/auth/login', {
        delay: 2000,
        fixture: 'auth/login-success.json'
      }).as('loginSlow');

      cy.visit('/login');

      cy.get('[data-testid="email-input"]').type('test@candlefish.ai');
      cy.get('[data-testid="password-input"]').type('password123');
      cy.get('[data-testid="login-button"]').click();

      // Should show loading state
      cy.get('[data-testid="login-button"]')
        .should('be.disabled')
        .and('contain', 'Signing in...');

      cy.get('[data-testid="loading-spinner"]').should('be.visible');

      // Wait for completion
      cy.wait('@loginSlow');
      cy.url().should('include', '/dashboard');
    });
  });

  describe('Registration Process', () => {
    it('should allow new user registration', () => {
      cy.visit('/register');

      const userData = {
        name: 'New Test User',
        email: `newuser+${Date.now()}@candlefish.ai`,
        password: 'newpassword123',
        confirmPassword: 'newpassword123',
      };

      cy.fillForm(userData);
      cy.get('[data-testid="register-button"]').click();

      cy.wait('@register');

      // Should redirect to dashboard after registration
      cy.url().should('include', '/dashboard');
      cy.get('[data-testid="welcome-message"]')
        .should('be.visible')
        .and('contain', 'Welcome, New Test User!');
    });

    it('should validate password confirmation', () => {
      cy.visit('/register');

      cy.fillForm({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'different-password',
      });

      cy.get('[data-testid="register-button"]').click();

      cy.get('[data-testid="confirm-password-error"]')
        .should('be.visible')
        .and('contain', 'Passwords do not match');
    });

    it('should enforce password complexity', () => {
      cy.visit('/register');

      cy.fillForm({
        name: 'Test User',
        email: 'test@example.com',
        password: '123', // Too weak
        confirmPassword: '123',
      });

      cy.get('[data-testid="register-button"]').click();

      cy.get('[data-testid="password-error"]')
        .should('be.visible')
        .and('contain', 'Password must be at least 8 characters');
    });
  });

  describe('Logout Process', () => {
    beforeEach(() => {
      cy.login();
    });

    it('should successfully logout user', () => {
      cy.visit('/dashboard');

      cy.get('[data-testid="user-menu"]').click();
      cy.get('[data-testid="logout-button"]').click();

      // Should redirect to login page
      cy.url().should('include', '/login');
      cy.get('[data-testid="login-form"]').should('be.visible');

      // Should clear auth token
      cy.window().its('localStorage').invoke('getItem', 'authToken').should('be.null');
    });

    it('should logout on session expiry', () => {
      // Mock expired token
      cy.intercept('GET', '/api/auth/me', {
        statusCode: 401,
        body: { error: 'Token expired' }
      });

      cy.visit('/dashboard');

      // Should automatically redirect to login
      cy.url().should('include', '/login');
      cy.get('[data-testid="error-message"]')
        .should('be.visible')
        .and('contain', 'Session expired');
    });
  });

  describe('Protected Routes', () => {
    it('should redirect unauthenticated users to login', () => {
      cy.visit('/dashboard');

      cy.url().should('include', '/login');
      cy.get('[data-testid="login-form"]').should('be.visible');
    });

    it('should allow access to authenticated users', () => {
      cy.login();
      cy.visit('/dashboard');

      cy.url().should('include', '/dashboard');
      cy.get('[data-testid="dashboard"]').should('be.visible');
    });

    it('should remember intended destination after login', () => {
      // Try to visit protected route
      cy.visit('/documents/create');

      // Should redirect to login
      cy.url().should('include', '/login');

      // Login
      cy.get('[data-testid="email-input"]').type('test@candlefish.ai');
      cy.get('[data-testid="password-input"]').type('cypress-test-password');
      cy.get('[data-testid="login-button"]').click();

      cy.wait('@login');

      // Should redirect to originally intended route
      cy.url().should('include', '/documents/create');
    });
  });

  describe('Remember Me Functionality', () => {
    it('should persist login with remember me checked', () => {
      cy.visit('/login');

      cy.get('[data-testid="email-input"]').type('test@candlefish.ai');
      cy.get('[data-testid="password-input"]').type('cypress-test-password');
      cy.get('[data-testid="remember-me-checkbox"]').check();
      cy.get('[data-testid="login-button"]').click();

      cy.wait('@login');
      cy.url().should('include', '/dashboard');

      // Simulate browser restart by clearing sessionStorage
      cy.clearAllSessionStorage();

      // Visit app again - should still be logged in
      cy.visit('/dashboard');
      cy.get('[data-testid="dashboard"]').should('be.visible');
    });
  });

  describe('Password Reset Flow', () => {
    it('should send password reset email', () => {
      cy.visit('/login');
      cy.get('[data-testid="forgot-password-link"]').click();

      cy.url().should('include', '/forgot-password');

      cy.get('[data-testid="email-input"]').type('test@candlefish.ai');
      cy.get('[data-testid="send-reset-button"]').click();

      cy.wait('@sendPasswordReset');

      cy.get('[data-testid="success-message"]')
        .should('be.visible')
        .and('contain', 'Password reset email sent');
    });

    it('should reset password with valid token', () => {
      const resetToken = `valid-reset-token-${Math.random().toString(36).substr(2, 9)}`;

      cy.visit(`/reset-password?token=${resetToken}`);

      cy.get('[data-testid="new-password-input"]').type('newpassword123');
      cy.get('[data-testid="confirm-password-input"]').type('newpassword123');
      cy.get('[data-testid="reset-password-button"]').click();

      cy.wait('@resetPassword');

      cy.get('[data-testid="success-message"]')
        .should('be.visible')
        .and('contain', 'Password reset successful');

      cy.url().should('include', '/login');
    });

    it('should handle invalid reset token', () => {
      cy.visit('/reset-password?token=invalid-token');

      cy.get('[data-testid="error-message"]')
        .should('be.visible')
        .and('contain', 'Invalid or expired reset token');
    });
  });

  describe('Social Authentication', () => {
    it('should allow Google OAuth login', () => {
      cy.visit('/login');

      // Mock Google OAuth flow
      cy.window().then((win) => {
        cy.stub(win, 'open').as('googleAuth');
      });

      cy.get('[data-testid="google-login-button"]').click();

      cy.get('@googleAuth').should('have.been.called');
    });

    it('should handle OAuth callback', () => {
      // Simulate OAuth callback with success
      cy.visit('/auth/callback?provider=google&code=success');

      cy.wait('@oauthCallback');

      // Should redirect to dashboard
      cy.url().should('include', '/dashboard');
      cy.get('[data-testid="dashboard"]').should('be.visible');
    });

    it('should handle OAuth errors', () => {
      cy.visit('/auth/callback?provider=google&error=access_denied');

      cy.get('[data-testid="error-message"]')
        .should('be.visible')
        .and('contain', 'Authentication was cancelled');

      cy.url().should('include', '/login');
    });
  });

  describe('Multi-Factor Authentication', () => {
    it('should prompt for MFA when enabled', () => {
      // Mock user with MFA enabled
      cy.intercept('POST', '/api/auth/login', {
        statusCode: 200,
        body: {
          requiresMFA: true,
          tempToken: 'temp-mfa-token',
        }
      });

      cy.visit('/login');

      cy.get('[data-testid="email-input"]').type('mfa@candlefish.ai');
      cy.get('[data-testid="password-input"]').type('password123');
      cy.get('[data-testid="login-button"]').click();

      // Should show MFA form
      cy.get('[data-testid="mfa-form"]').should('be.visible');
      cy.get('[data-testid="mfa-code-input"]').should('be.visible');
    });

    it('should complete MFA verification', () => {
      cy.visit('/mfa?temp_token=temp-mfa-token');

      cy.get('[data-testid="mfa-code-input"]').type('123456');
      cy.get('[data-testid="verify-mfa-button"]').click();

      cy.wait('@verifyMFA');

      cy.url().should('include', '/dashboard');
    });
  });

  describe('Accessibility', () => {
    it('should be fully accessible on login page', () => {
      cy.visit('/login');

      // Check basic accessibility
      cy.checkA11y();

      // Check keyboard navigation
      cy.get('[data-testid="email-input"]').focus();
      cy.realPress('Tab');
      cy.focused().should('have.attr', 'data-testid', 'password-input');

      cy.realPress('Tab');
      cy.focused().should('have.attr', 'data-testid', 'remember-me-checkbox');

      cy.realPress('Tab');
      cy.focused().should('have.attr', 'data-testid', 'login-button');
    });

    it('should announce login status to screen readers', () => {
      cy.visit('/login');

      cy.get('[data-testid="email-input"]').type('test@candlefish.ai');
      cy.get('[data-testid="password-input"]').type('wrong-password');
      cy.get('[data-testid="login-button"]').click();

      // Should have aria-live region for status updates
      cy.get('[aria-live="polite"]')
        .should('contain', 'Invalid credentials');
    });
  });

  describe('Mobile Authentication', () => {
    beforeEach(() => {
      cy.setMobileViewport();
    });

    it('should work on mobile devices', () => {
      cy.visit('/login');

      cy.get('[data-testid="login-form"]').should('be.visible');

      cy.get('[data-testid="email-input"]').type('test@candlefish.ai');
      cy.get('[data-testid="password-input"]').type('cypress-test-password');
      cy.get('[data-testid="login-button"]').click();

      cy.wait('@login');

      cy.url().should('include', '/dashboard');
      cy.get('[data-testid="mobile-dashboard"]').should('be.visible');
    });

    it('should handle mobile keyboard interactions', () => {
      cy.visit('/login');

      // Email input should have proper keyboard type
      cy.get('[data-testid="email-input"]')
        .should('have.attr', 'inputmode', 'email')
        .and('have.attr', 'type', 'email');

      // Password input should have proper security
      cy.get('[data-testid="password-input"]')
        .should('have.attr', 'type', 'password');
    });
  });
});
