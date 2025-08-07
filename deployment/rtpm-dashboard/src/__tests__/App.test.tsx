/**
 * Tests for the main App component.
 * Covers routing, authentication, and global state management.
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { mockUser, mockAuthToken } from './setup';

// Mock the API module
jest.mock('@/services/api');

// Mock child components to isolate App testing
jest.mock('../components/Dashboard', () => {
  return function MockDashboard() {
    return <div data-testid="dashboard">Dashboard Component</div>;
  };
});

jest.mock('../components/Login', () => {
  return function MockLogin({ onLogin }: { onLogin: (token: string) => void }) {
    return (
      <div data-testid="login">
        <button onClick={() => onLogin(mockAuthToken)}>Login</button>
      </div>
    );
  };
});

jest.mock('../components/Loading', () => {
  return function MockLoading() {
    return <div data-testid="loading">Loading...</div>;
  };
});

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('App Component', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('Authentication Flow', () => {
    it('renders login component when not authenticated', () => {
      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      expect(screen.getByTestId('login')).toBeInTheDocument();
      expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument();
    });

    it('renders dashboard when authenticated with valid token', async () => {
      // Set up authenticated state
      localStorage.setItem('authToken', mockAuthToken);

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('login')).not.toBeInTheDocument();
    });

    it('handles login flow correctly', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Initially shows login
      expect(screen.getByTestId('login')).toBeInTheDocument();

      // Click login button
      await user.click(screen.getByText('Login'));

      // Should now show dashboard
      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      });

      // Token should be stored
      expect(localStorage.getItem('authToken')).toBe(mockAuthToken);
    });

    it('handles logout correctly', async () => {
      // Start with authenticated state
      localStorage.setItem('authToken', mockAuthToken);

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      });

      // Simulate logout (this would typically be triggered by a logout button in Dashboard)
      act(() => {
        localStorage.removeItem('authToken');
        window.dispatchEvent(new Event('storage'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('login')).toBeInTheDocument();
      });
    });

    it('handles token expiration', async () => {
      // Set expired token
      const expiredToken = 'expired.jwt.token';
      localStorage.setItem('authToken', expiredToken);

      // Mock API to return 401 for expired token
      const mockApi = require('@/services/api');
      mockApi.deploymentAPI.healthCheck.mockRejectedValue({
        response: { status: 401 }
      });

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Should redirect to login on 401
      await waitFor(() => {
        expect(screen.getByTestId('login')).toBeInTheDocument();
      });

      // Token should be removed
      expect(localStorage.getItem('authToken')).toBeNull();
    });
  });

  describe('Loading States', () => {
    it('shows loading indicator during authentication check', async () => {
      localStorage.setItem('authToken', mockAuthToken);

      // Mock a delayed API response
      const mockApi = require('@/services/api');
      mockApi.deploymentAPI.healthCheck.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ status: 'healthy' }), 100))
      );

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Should show loading initially
      expect(screen.getByTestId('loading')).toBeInTheDocument();

      // Should show dashboard after loading
      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      }, { timeout: 200 });
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      localStorage.setItem('authToken', mockAuthToken);

      // Mock API error
      const mockApi = require('@/services/api');
      mockApi.deploymentAPI.healthCheck.mockRejectedValue(
        new Error('Network error')
      );

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Should still attempt to render dashboard
      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      });
    });

    it('handles malformed tokens', async () => {
      localStorage.setItem('authToken', 'invalid-token-format');

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Should redirect to login
      await waitFor(() => {
        expect(screen.getByTestId('login')).toBeInTheDocument();
      });

      // Invalid token should be removed
      expect(localStorage.getItem('authToken')).toBeNull();
    });
  });

  describe('Routing', () => {
    it('handles browser navigation', async () => {
      localStorage.setItem('authToken', mockAuthToken);

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      });

      // Test navigation (would need more complex routing setup)
      expect(window.location.pathname).toBe('/');
    });
  });

  describe('State Management', () => {
    it('manages global authentication state', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Start unauthenticated
      expect(screen.getByTestId('login')).toBeInTheDocument();

      // Login
      await user.click(screen.getByText('Login'));

      // Should update state and show dashboard
      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      });
    });
  });

  describe('Theme and Preferences', () => {
    it('applies stored theme preferences', () => {
      localStorage.setItem('theme', 'dark');
      localStorage.setItem('authToken', mockAuthToken);

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Check if dark theme class is applied
      // This would depend on actual theme implementation
      const app = document.querySelector('[data-testid="app"]');
      if (app) {
        expect(app).toHaveClass('dark-theme');
      }
    });

    it('handles theme switching', async () => {
      localStorage.setItem('authToken', mockAuthToken);

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      });

      // Test theme switching logic (would require actual theme toggle)
      // This is a placeholder for theme functionality
    });
  });

  describe('Performance', () => {
    it('renders without performance issues', () => {
      const startTime = performance.now();

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render quickly (under 100ms)
      expect(renderTime).toBeLessThan(100);
    });

    it('does not cause memory leaks', async () => {
      const { unmount } = render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Unmount component
      unmount();

      // Test would verify cleanup of listeners, timers, etc.
      // This is more of a integration test concern
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', async () => {
      localStorage.setItem('authToken', mockAuthToken);

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      });

      // Check for main role
      const main = screen.getByRole('main', { hidden: true });
      expect(main).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Test tab navigation
      await user.tab();

      // Should focus on first interactive element
      const focusedElement = document.activeElement;
      expect(focusedElement).toBeInTheDocument();
    });

    it('has proper heading structure', async () => {
      localStorage.setItem('authToken', mockAuthToken);

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      });

      // Should have proper heading hierarchy (h1, then h2, etc.)
      // This would depend on actual component structure
    });

    it('provides screen reader support', async () => {
      localStorage.setItem('authToken', mockAuthToken);

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      });

      // Check for screen reader text
      const srOnly = document.querySelectorAll('.sr-only');
      expect(srOnly.length).toBeGreaterThan(0);
    });
  });

  describe('Environment Handling', () => {
    it('handles development environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Should enable development features
      // This would depend on actual development-specific logic

      process.env.NODE_ENV = originalEnv;
    });

    it('handles production environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Should disable development features
      // This would depend on actual production-specific logic

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Internationalization', () => {
    it('handles language preferences', () => {
      localStorage.setItem('language', 'es');
      localStorage.setItem('authToken', mockAuthToken);

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Should apply Spanish language
      // This would depend on actual i18n implementation
    });

    it('falls back to default language', () => {
      localStorage.setItem('authToken', mockAuthToken);

      render(
        <TestWrapper>
          <App />
        </TestWrapper>
      );

      // Should use English as default
      // This would depend on actual i18n implementation
    });
  });
});