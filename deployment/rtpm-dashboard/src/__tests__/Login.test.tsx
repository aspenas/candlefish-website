/**
 * Tests for the Login component.
 * Covers authentication forms, validation, and error handling.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from '../components/Login';
import { mockAuthToken } from './setup';
import * as apiMock from './__mocks__/apiMock';

describe('Login Component', () => {
  const mockOnLogin = jest.fn();

  beforeEach(() => {
    mockOnLogin.mockClear();
    apiMock.resetAllMocks();
  });

  describe('Form Rendering', () => {
    it('renders login form with all fields', () => {
      render(<Login onLogin={mockOnLogin} />);

      expect(screen.getByTestId('login-form')).toBeInTheDocument();
      expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('renders with proper form labels and accessibility', () => {
      render(<Login onLogin={mockOnLogin} />);

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);

      expect(usernameInput).toHaveAttribute('type', 'text');
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(usernameInput).toHaveAttribute('required');
      expect(passwordInput).toHaveAttribute('required');
    });

    it('has proper ARIA attributes for accessibility', () => {
      render(<Login onLogin={mockOnLogin} />);

      const form = screen.getByTestId('login-form');
      expect(form).toHaveAttribute('role', 'form');
      expect(form).toHaveAttribute('aria-labelledby', 'login-heading');
      
      const heading = screen.getByTestId('login-heading');
      expect(heading).toHaveTextContent('Sign In');
    });

    it('shows password visibility toggle', () => {
      render(<Login onLogin={mockOnLogin} />);

      const toggleButton = screen.getByTestId('password-visibility-toggle');
      expect(toggleButton).toBeInTheDocument();
      expect(toggleButton).toHaveAttribute('aria-label', 'Show password');
    });
  });

  describe('Form Interaction', () => {
    it('allows typing in username and password fields', async () => {
      const user = userEvent.setup();
      render(<Login onLogin={mockOnLogin} />);

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(usernameInput, 'testuser');
      await user.type(passwordInput, 'password123');

      expect(usernameInput).toHaveValue('testuser');
      expect(passwordInput).toHaveValue('password123');
    });

    it('toggles password visibility', async () => {
      const user = userEvent.setup();
      render(<Login onLogin={mockOnLogin} />);

      const passwordInput = screen.getByLabelText(/password/i);
      const toggleButton = screen.getByTestId('password-visibility-toggle');

      // Initially password should be hidden
      expect(passwordInput).toHaveAttribute('type', 'password');

      // Click toggle to show password
      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'text');
      expect(toggleButton).toHaveAttribute('aria-label', 'Hide password');

      // Click again to hide password
      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute('type', 'password');
      expect(toggleButton).toHaveAttribute('aria-label', 'Show password');
    });

    it('enables submit button when form is filled', async () => {
      const user = userEvent.setup();
      render(<Login onLogin={mockOnLogin} />);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);

      // Initially button should be disabled
      expect(submitButton).toBeDisabled();

      // Fill in username only
      await user.type(usernameInput, 'testuser');
      expect(submitButton).toBeDisabled();

      // Fill in password
      await user.type(passwordInput, 'password123');
      expect(submitButton).not.toBeDisabled();
    });

    it('handles form submission with valid credentials', async () => {
      const user = userEvent.setup();
      
      // Mock successful login
      apiMock.setApiResponse('login', {
        access_token: mockAuthToken,
        token_type: 'bearer',
        user: {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com'
        }
      });

      render(<Login onLogin={mockOnLogin} />);

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(usernameInput, 'testuser');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnLogin).toHaveBeenCalledWith(mockAuthToken);
      });
    });

    it('can submit form with Enter key', async () => {
      const user = userEvent.setup();
      
      apiMock.setApiResponse('login', {
        access_token: mockAuthToken,
        token_type: 'bearer'
      });

      render(<Login onLogin={mockOnLogin} />);

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await user.type(usernameInput, 'testuser');
      await user.type(passwordInput, 'password123');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockOnLogin).toHaveBeenCalled();
      });
    });
  });

  describe('Form Validation', () => {
    it('shows validation errors for empty fields', async () => {
      const user = userEvent.setup();
      render(<Login onLogin={mockOnLogin} />);

      const submitButton = screen.getByRole('button', { name: /sign in/i });
      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);

      // Try to submit empty form
      await user.click(usernameInput);
      await user.tab(); // Move focus to trigger validation
      await user.click(passwordInput);
      await user.tab();

      // Should show validation messages
      expect(screen.getByText(/username is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });

    it('validates username format', async () => {
      const user = userEvent.setup();
      render(<Login onLogin={mockOnLogin} />);

      const usernameInput = screen.getByLabelText(/username/i);

      // Test invalid username formats
      await user.type(usernameInput, 'a'); // Too short
      await user.tab();

      expect(screen.getByText(/username must be at least 3 characters/i)).toBeInTheDocument();

      // Clear and test valid username
      await user.clear(usernameInput);
      await user.type(usernameInput, 'validuser');
      await user.tab();

      expect(screen.queryByText(/username must be at least 3 characters/i)).not.toBeInTheDocument();
    });

    it('validates password strength', async () => {
      const user = userEvent.setup();
      render(<Login onLogin={mockOnLogin} />);

      const passwordInput = screen.getByLabelText(/password/i);

      // Test weak password
      await user.type(passwordInput, '123'); // Too short
      await user.tab();

      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();

      // Test strong password
      await user.clear(passwordInput);
      await user.type(passwordInput, 'strongpassword123');
      await user.tab();

      expect(screen.queryByText(/password must be at least 8 characters/i)).not.toBeInTheDocument();
    });

    it('clears validation errors when corrected', async () => {
      const user = userEvent.setup();
      render(<Login onLogin={mockOnLogin} />);

      const usernameInput = screen.getByLabelText(/username/i);
      
      // Trigger validation error
      await user.type(usernameInput, 'a');
      await user.tab();
      
      expect(screen.getByText(/username must be at least 3 characters/i)).toBeInTheDocument();

      // Fix the error
      await user.type(usernameInput, 'validuser');
      await user.tab();

      expect(screen.queryByText(/username must be at least 3 characters/i)).not.toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('shows loading state during authentication', async () => {
      const user = userEvent.setup();
      
      // Mock delayed login response
      apiMock.setApiResponse('login', 
        new Promise(resolve => 
          setTimeout(() => resolve({ access_token: mockAuthToken }), 100)
        )
      );

      render(<Login onLogin={mockOnLogin} />);

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(usernameInput, 'testuser');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      // Should show loading state
      expect(screen.getByTestId('login-loading')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
      expect(screen.getByText(/signing in/i)).toBeInTheDocument();

      // Wait for completion
      await waitFor(() => {
        expect(mockOnLogin).toHaveBeenCalled();
      });
    });

    it('disables form during loading', async () => {
      const user = userEvent.setup();
      
      apiMock.setApiResponse('login', 
        new Promise(resolve => 
          setTimeout(() => resolve({ access_token: mockAuthToken }), 100)
        )
      );

      render(<Login onLogin={mockOnLogin} />);

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(usernameInput, 'testuser');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      // All form elements should be disabled during loading
      expect(usernameInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('displays error for invalid credentials', async () => {
      const user = userEvent.setup();
      
      // Mock login error
      apiMock.setApiError('login', {
        response: {
          status: 401,
          data: { error: 'Invalid credentials' }
        }
      });

      render(<Login onLogin={mockOnLogin} />);

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(usernameInput, 'wronguser');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('login-error')).toBeInTheDocument();
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });

      // Form should be re-enabled
      expect(usernameInput).not.toBeDisabled();
      expect(passwordInput).not.toBeDisabled();
      expect(submitButton).not.toBeDisabled();
    });

    it('displays network error messages', async () => {
      const user = userEvent.setup();
      
      apiMock.setApiError('login', {
        code: 'NETWORK_ERROR',
        message: 'Network Error'
      });

      render(<Login onLogin={mockOnLogin} />);

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(usernameInput, 'testuser');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it('displays server error messages', async () => {
      const user = userEvent.setup();
      
      apiMock.setApiError('login', {
        response: {
          status: 500,
          data: { error: 'Internal server error' }
        }
      });

      render(<Login onLogin={mockOnLogin} />);

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(usernameInput, 'testuser');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/server error/i)).toBeInTheDocument();
      });
    });

    it('allows retry after error', async () => {
      const user = userEvent.setup();
      
      // First attempt fails
      apiMock.setApiError('login', {
        response: { status: 401, data: { error: 'Invalid credentials' } }
      });

      render(<Login onLogin={mockOnLogin} />);

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(usernameInput, 'testuser');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('login-error')).toBeInTheDocument();
      });

      // Fix credentials and try again
      apiMock.setApiResponse('login', { access_token: mockAuthToken });
      
      await user.clear(passwordInput);
      await user.type(passwordInput, 'correctpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnLogin).toHaveBeenCalledWith(mockAuthToken);
      });
    });

    it('clears errors when user types', async () => {
      const user = userEvent.setup();
      
      apiMock.setApiError('login', {
        response: { status: 401, data: { error: 'Invalid credentials' } }
      });

      render(<Login onLogin={mockOnLogin} />);

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(usernameInput, 'testuser');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('login-error')).toBeInTheDocument();
      });

      // Start typing - error should clear
      await user.type(usernameInput, 'x');
      
      expect(screen.queryByTestId('login-error')).not.toBeInTheDocument();
    });
  });

  describe('Security Features', () => {
    it('prevents form submission with malicious input', async () => {
      const user = userEvent.setup();
      render(<Login onLogin={mockOnLogin} />);

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);

      // Try XSS attempt
      await user.type(usernameInput, '<script>alert("xss")</script>');
      await user.type(passwordInput, 'password');

      // Input should be sanitized or validated
      expect(usernameInput).toHaveValue('<script>alert("xss")</script>');
      
      // Form validation should catch this
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(submitButton);

      // Should show validation error or sanitize input
      await waitFor(() => {
        expect(screen.getByText(/invalid username format/i)).toBeInTheDocument();
      });
    });

    it('implements rate limiting feedback', async () => {
      const user = userEvent.setup();
      
      // Mock rate limit error
      apiMock.setApiError('login', {
        response: {
          status: 429,
          data: { error: 'Too many login attempts. Please try again later.' }
        }
      });

      render(<Login onLogin={mockOnLogin} />);

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(usernameInput, 'testuser');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/too many login attempts/i)).toBeInTheDocument();
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe('Accessibility', () => {
    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<Login onLogin={mockOnLogin} />);

      // Tab through form elements
      await user.tab();
      expect(screen.getByLabelText(/username/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/password/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('password-visibility-toggle')).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /sign in/i })).toHaveFocus();
    });

    it('provides proper screen reader support', () => {
      render(<Login onLogin={mockOnLogin} />);

      // Check for proper labeling
      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);

      expect(usernameInput).toHaveAttribute('aria-describedby');
      expect(passwordInput).toHaveAttribute('aria-describedby');
    });

    it('announces errors to screen readers', async () => {
      const user = userEvent.setup();
      
      apiMock.setApiError('login', {
        response: { status: 401, data: { error: 'Invalid credentials' } }
      });

      render(<Login onLogin={mockOnLogin} />);

      const usernameInput = screen.getByLabelText(/username/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(usernameInput, 'testuser');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        const errorElement = screen.getByTestId('login-error');
        expect(errorElement).toHaveAttribute('role', 'alert');
        expect(errorElement).toHaveAttribute('aria-live', 'polite');
      });
    });

    it('has proper focus management', async () => {
      const user = userEvent.setup();
      render(<Login onLogin={mockOnLogin} />);

      const usernameInput = screen.getByLabelText(/username/i);
      
      // Focus should be on username field on initial render
      expect(usernameInput).toHaveFocus();

      // After error, focus should remain manageable
      apiMock.setApiError('login', {
        response: { status: 401, data: { error: 'Invalid credentials' } }
      });

      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(usernameInput, 'testuser');
      await user.type(passwordInput, 'wrongpassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId('login-error')).toBeInTheDocument();
      });

      // Focus should return to a logical place (usually the form)
      expect(document.activeElement).toBe(usernameInput);
    });
  });
});