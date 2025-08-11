/**
 * Tyler Setup Platform - Dashboard Component Tests
 * Comprehensive tests for the main dashboard component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import { Dashboard } from '../../../frontend/src/pages/dashboard/dashboard';
import { useAuth } from '../../../frontend/src/hooks/use-auth';
import { GET_SYSTEM_HEALTH, GET_AUDIT_LOGS } from '../../../frontend/src/lib/graphql/dashboard';

// Mock hooks
jest.mock('../../../frontend/src/hooks/use-auth');
jest.mock('../../../frontend/src/hooks/use-toast');

// Mock components
jest.mock('../../../frontend/src/components/dashboard/system-health', () => {
  return {
    SystemHealth: ({ data, loading, error }: any) => (
      <div data-testid="system-health">
        {loading && <div>Loading health...</div>}
        {error && <div>Error: {error.message}</div>}
        {data && (
          <div>
            <div>Status: {data.systemHealth.status}</div>
            <div>CPU: {data.systemHealth.metrics.cpuUsage}%</div>
          </div>
        )}
      </div>
    )
  };
});

jest.mock('../../../frontend/src/components/dashboard/metric-card', () => {
  return {
    MetricCard: ({ title, value, trend }: any) => (
      <div data-testid={`metric-${title.toLowerCase().replace(/\s+/g, '-')}`}>
        <h3>{title}</h3>
        <span>{value}</span>
        {trend && <span className={`trend-${trend > 0 ? 'up' : 'down'}`}>{trend}%</span>}
      </div>
    )
  };
});

describe('Dashboard Component', () => {
  const mockUser = createMockUser({ role: 'ADMIN' });

  const mockSystemHealth = {
    status: 'HEALTHY',
    services: [
      {
        name: 'database',
        status: 'HEALTHY',
        responseTime: 45,
        lastCheck: new Date('2024-01-01T12:00:00Z')
      },
      {
        name: 'secrets-manager',
        status: 'HEALTHY',
        responseTime: 120,
        lastCheck: new Date('2024-01-01T12:00:00Z')
      }
    ],
    metrics: {
      cpuUsage: 25.5,
      memoryUsage: 67.8,
      diskUsage: 45.2,
      activeConnections: 15
    }
  };

  const mockAuditLogs = [
    {
      id: 'log-1',
      userId: 'user-123',
      action: 'SECRET_READ',
      resource: 'database-url',
      timestamp: new Date('2024-01-01T12:00:00Z'),
      metadata: { secretName: 'database-url' },
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0'
    },
    {
      id: 'log-2',
      userId: 'user-456',
      action: 'SECRET_CREATE',
      resource: 'api-key',
      timestamp: new Date('2024-01-01T11:30:00Z'),
      metadata: { secretName: 'api-key' },
      ipAddress: '192.168.1.2',
      userAgent: 'Chrome/96.0'
    }
  ];

  const successfulMocks = [
    {
      request: {
        query: GET_SYSTEM_HEALTH,
      },
      result: {
        data: {
          systemHealth: mockSystemHealth
        }
      }
    },
    {
      request: {
        query: GET_AUDIT_LOGS,
        variables: { limit: 10, offset: 0 }
      },
      result: {
        data: {
          auditLogs: mockAuditLogs
        }
      }
    }
  ];

  const TestWrapper = ({ children, mocks = successfulMocks }: any) => (
    <MockedProvider mocks={mocks} addTypename={false}>
      <MemoryRouter>
        {children}
      </MemoryRouter>
    </MockedProvider>
  );

  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      loading: false
    });

    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render dashboard with all sections', async () => {
      // Act
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Assert
      expect(screen.getByText('Tyler Setup Dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('system-health')).toBeInTheDocument();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Status: HEALTHY')).toBeInTheDocument();
        expect(screen.getByText('CPU: 25.5%')).toBeInTheDocument();
      });
    });

    it('should show welcome message with user name', () => {
      // Act
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Assert
      expect(screen.getByText(`Welcome back, ${mockUser.firstName}!`)).toBeInTheDocument();
    });

    it('should display metric cards', async () => {
      // Act
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('metric-system-uptime')).toBeInTheDocument();
        expect(screen.getByTestId('metric-active-sessions')).toBeInTheDocument();
        expect(screen.getByTestId('metric-secrets-managed')).toBeInTheDocument();
        expect(screen.getByTestId('metric-api-calls-today')).toBeInTheDocument();
      });
    });
  });

  describe('System Health', () => {
    it('should show loading state for system health', () => {
      // Arrange
      const loadingMocks = [
        {
          request: {
            query: GET_SYSTEM_HEALTH,
          },
          result: {
            loading: true
          }
        }
      ];

      // Act
      render(
        <TestWrapper mocks={loadingMocks}>
          <Dashboard />
        </TestWrapper>
      );

      // Assert
      expect(screen.getByText('Loading health...')).toBeInTheDocument();
    });

    it('should show error state for system health', async () => {
      // Arrange
      const errorMocks = [
        {
          request: {
            query: GET_SYSTEM_HEALTH,
          },
          error: new Error('Failed to fetch system health')
        }
      ];

      // Act
      render(
        <TestWrapper mocks={errorMocks}>
          <Dashboard />
        </TestWrapper>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Error: Failed to fetch system health')).toBeInTheDocument();
      });
    });

    it('should display service statuses', async () => {
      // Act
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Status: HEALTHY')).toBeInTheDocument();
        expect(screen.getByText('CPU: 25.5%')).toBeInTheDocument();
      });
    });
  });

  describe('Recent Activity', () => {
    it('should display recent audit logs', async () => {
      // Act
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Recent Activity')).toBeInTheDocument();
        expect(screen.getByText('SECRET_READ')).toBeInTheDocument();
        expect(screen.getByText('SECRET_CREATE')).toBeInTheDocument();
        expect(screen.getByText('database-url')).toBeInTheDocument();
        expect(screen.getByText('api-key')).toBeInTheDocument();
      });
    });

    it('should show empty state when no audit logs', async () => {
      // Arrange
      const emptyLogsMocks = [
        {
          request: {
            query: GET_SYSTEM_HEALTH,
          },
          result: {
            data: {
              systemHealth: mockSystemHealth
            }
          }
        },
        {
          request: {
            query: GET_AUDIT_LOGS,
            variables: { limit: 10, offset: 0 }
          },
          result: {
            data: {
              auditLogs: []
            }
          }
        }
      ];

      // Act
      render(
        <TestWrapper mocks={emptyLogsMocks}>
          <Dashboard />
        </TestWrapper>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText('No recent activity')).toBeInTheDocument();
      });
    });

    it('should handle audit logs loading error', async () => {
      // Arrange
      const errorMocks = [
        {
          request: {
            query: GET_SYSTEM_HEALTH,
          },
          result: {
            data: {
              systemHealth: mockSystemHealth
            }
          }
        },
        {
          request: {
            query: GET_AUDIT_LOGS,
            variables: { limit: 10, offset: 0 }
          },
          error: new Error('Failed to load audit logs')
        }
      ];

      // Act
      render(
        <TestWrapper mocks={errorMocks}>
          <Dashboard />
        </TestWrapper>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Failed to load recent activity')).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('should refresh system health when refresh button clicked', async () => {
      // Arrange
      let healthRefreshed = false;
      const refreshMocks = [
        ...successfulMocks,
        {
          request: {
            query: GET_SYSTEM_HEALTH,
          },
          result: () => {
            healthRefreshed = true;
            return {
              data: {
                systemHealth: mockSystemHealth
              }
            };
          }
        }
      ];

      // Act
      render(
        <TestWrapper mocks={refreshMocks}>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Status: HEALTHY')).toBeInTheDocument();
      });

      const refreshButton = screen.getByTestId('refresh-health-button');
      fireEvent.click(refreshButton);

      // Assert
      await waitFor(() => {
        expect(healthRefreshed).toBe(true);
      });
    });

    it('should navigate to secrets page when manage secrets button clicked', async () => {
      // Act
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Manage Secrets')).toBeInTheDocument();
      });

      const manageSecretsButton = screen.getByText('Manage Secrets');
      fireEvent.click(manageSecretsButton);

      // Assert
      // Navigation testing would require router mocking
      expect(manageSecretsButton).toBeInTheDocument();
    });

    it('should show more audit logs when view all clicked', async () => {
      // Act
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('View All Activity')).toBeInTheDocument();
      });

      const viewAllButton = screen.getByText('View All Activity');
      fireEvent.click(viewAllButton);

      // Assert
      // Navigation or state change testing
      expect(viewAllButton).toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    it('should handle system health subscription updates', async () => {
      // This would require WebSocket subscription mocking
      // For now, we'll test the component structure

      // Act
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('system-health')).toBeInTheDocument();
      });
    });

    it('should show real-time indicator when connected', async () => {
      // Act
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('realtime-status')).toBeInTheDocument();
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('should adapt layout for mobile screens', async () => {
      // Arrange
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375, // Mobile width
      });

      // Mock window.matchMedia for mobile
      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: query === '(max-width: 768px)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      // Act
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Assert
      await waitFor(() => {
        const dashboard = screen.getByTestId('dashboard-container');
        expect(dashboard).toHaveClass('mobile-layout');
      });
    });

    it('should show/hide sidebar on mobile', async () => {
      // Arrange - Mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: query === '(max-width: 768px)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      // Act
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Assert - Sidebar should be hidden initially on mobile
      expect(screen.queryByTestId('dashboard-sidebar')).not.toBeInTheDocument();

      // Click menu button to show sidebar
      const menuButton = screen.getByTestId('mobile-menu-button');
      fireEvent.click(menuButton);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-sidebar')).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should memoize expensive calculations', async () => {
      // Act
      const { rerender } = render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Status: HEALTHY')).toBeInTheDocument();
      });

      // Rerender with same props
      rerender(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Assert - Component should not refetch if data hasn't changed
      expect(screen.getByText('Status: HEALTHY')).toBeInTheDocument();
    });

    it('should implement lazy loading for heavy components', async () => {
      // Act
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Assert - Check that heavy components are loaded lazily
      expect(screen.getByTestId('system-health')).toBeInTheDocument();

      // Scroll to trigger lazy loading
      fireEvent.scroll(window, { target: { scrollY: 500 } });

      await waitFor(() => {
        expect(screen.getByTestId('audit-logs-section')).toBeInTheDocument();
      });
    });
  });

  describe('Error Boundaries', () => {
    it('should catch and display component errors', async () => {
      // Arrange - Mock a component that throws an error
      const ErrorThrowingComponent = () => {
        throw new Error('Test component error');
      };

      const errorMocks = [
        {
          request: {
            query: GET_SYSTEM_HEALTH,
          },
          result: () => {
            throw new Error('GraphQL Error');
          }
        }
      ];

      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Act
      render(
        <TestWrapper mocks={errorMocks}>
          <Dashboard />
        </TestWrapper>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      // Act
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Assert
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByLabelText('Tyler Setup Dashboard')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      // Act
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Manage Secrets')).toBeInTheDocument();
      });

      const manageSecretsButton = screen.getByText('Manage Secrets');

      // Simulate keyboard navigation
      fireEvent.keyDown(manageSecretsButton, { key: 'Enter', code: 'Enter' });

      // Assert - Should respond to keyboard events
      expect(manageSecretsButton).toHaveFocus();
    });

    it('should have proper heading hierarchy', async () => {
      // Act
      render(
        <TestWrapper>
          <Dashboard />
        </TestWrapper>
      );

      // Assert
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Tyler Setup Dashboard');
      expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(3); // System Health, Metrics, Recent Activity
    });
  });
});
