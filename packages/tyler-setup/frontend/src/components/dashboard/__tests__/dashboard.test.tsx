import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../dashboard';
import { createMockApolloProvider, successfulDashboardMock, networkErrorMock, mockDashboardStats } from '../../../__tests__/mocks/apollo-client';
import { useAuth } from '../../../hooks/use-auth';

// Mock the auth hook
jest.mock('../../../hooks/use-auth');
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock chart components to avoid canvas issues in tests
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="chart-container">{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
}));

// Mock components
jest.mock('../metric-card', () => {
  return function MockMetricCard({ title, value, description, trend }: any) {
    return (
      <div data-testid={`metric-card-${title.toLowerCase().replace(/\\s+/g, '-')}`}>
        <h3>{title}</h3>
        <div>{value}</div>
        <p>{description}</p>
        {trend && <span>{trend.value}% {trend.direction}</span>}
      </div>
    );
  };
});

jest.mock('../recent-activity', () => {
  return function MockRecentActivity({ activities }: any) {
    return (
      <div data-testid="recent-activity">
        <h3>Recent Activity</h3>
        <ul>
          {activities.map((activity: any) => (
            <li key={activity.id}>
              {activity.action} - {activity.user}
            </li>
          ))}
        </ul>
      </div>
    );
  };
});

jest.mock('../system-health', () => {
  return function MockSystemHealth({ health }: any) {
    return (
      <div data-testid="system-health">
        <h3>System Health</h3>
        <div>Status: {health.status}</div>
        <div>Uptime: {health.uptime}</div>
        <div>Memory: {health.memory}</div>
        <div>CPU: {health.cpu}</div>
      </div>
    );
  };
});

const renderDashboard = (mocks: any[] = [successfulDashboardMock]) => {
  return render(
    <BrowserRouter>
      {createMockApolloProvider(<Dashboard />, mocks)}
    </BrowserRouter>
  );
};

describe('Dashboard Component', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin'
      },
      token: 'mock-token',
      isAuthenticated: true,
      login: jest.fn(),
      logout: jest.fn(),
      loading: false
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading spinner while fetching data', () => {
      renderDashboard([]);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('Successful Data Load', () => {
    it('should render dashboard with all metrics', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });

      // Check metric cards
      expect(screen.getByTestId('metric-card-total-users')).toBeInTheDocument();
      expect(screen.getByTestId('metric-card-active-users')).toBeInTheDocument();
      expect(screen.getByTestId('metric-card-total-contractors')).toBeInTheDocument();
      expect(screen.getByTestId('metric-card-total-secrets')).toBeInTheDocument();

      // Check metric values
      expect(screen.getByText('25')).toBeInTheDocument(); // totalUsers
      expect(screen.getByText('23')).toBeInTheDocument(); // activeUsers
      expect(screen.getByText('150')).toBeInTheDocument(); // totalContractors
      expect(screen.getByText('45')).toBeInTheDocument(); // totalSecrets
    });

    it('should render recent activity section', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('recent-activity')).toBeInTheDocument();
      });

      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      expect(screen.getByText(/USER_LOGIN - john.doe@example.com/)).toBeInTheDocument();
      expect(screen.getByText(/CONTRACTOR_CREATED - admin@example.com/)).toBeInTheDocument();
    });

    it('should render system health section', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('system-health')).toBeInTheDocument();
      });

      expect(screen.getByText('System Health')).toBeInTheDocument();
      expect(screen.getByText('Status: healthy')).toBeInTheDocument();
      expect(screen.getByText('Uptime: 99.9%')).toBeInTheDocument();
      expect(screen.getByText('Memory: 65%')).toBeInTheDocument();
      expect(screen.getByText('CPU: 32%')).toBeInTheDocument();
    });

    it('should render charts container', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('chart-container')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error message when data fetch fails', async () => {
      renderDashboard([networkErrorMock]);

      await waitFor(() => {
        expect(screen.getByText(/error loading dashboard data/i)).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      renderDashboard([networkErrorMock]);

      await waitFor(() => {
        expect(screen.getByText(/retry/i)).toBeInTheDocument();
      });
    });
  });

  describe('User Permissions', () => {
    it('should show all sections for admin users', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: '1', email: 'admin@example.com', name: 'Admin', role: 'admin' },
        token: 'token',
        isAuthenticated: true,
        login: jest.fn(),
        logout: jest.fn(),
        loading: false
      });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('metric-card-total-users')).toBeInTheDocument();
        expect(screen.getByTestId('metric-card-total-secrets')).toBeInTheDocument();
      });
    });

    it('should hide sensitive sections for employee users', async () => {
      mockUseAuth.mockReturnValue({
        user: { id: '2', email: 'employee@example.com', name: 'Employee', role: 'employee' },
        token: 'token',
        isAuthenticated: true,
        login: jest.fn(),
        logout: jest.fn(),
        loading: false
      });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByTestId('metric-card-total-contractors')).toBeInTheDocument();
      });

      // Secrets should be hidden for employees
      expect(screen.queryByTestId('metric-card-total-secrets')).not.toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    it('should update metrics when data changes', async () => {
      const { rerender } = renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('25')).toBeInTheDocument(); // totalUsers
      });

      // Mock updated data
      const updatedMock = {
        ...successfulDashboardMock,
        result: {
          data: {
            dashboardStats: {
              ...mockDashboardStats,
              totalUsers: 30
            }
          }
        }
      };

      rerender(
        <BrowserRouter>
          {createMockApolloProvider(<Dashboard />, [updatedMock])}
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('30')).toBeInTheDocument(); // updated totalUsers
      });
    });
  });

  describe('Responsive Design', () => {
    it('should render mobile-friendly layout on small screens', async () => {
      // Mock window.matchMedia for responsive tests
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(max-width: 768px)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });

      // Check if mobile-specific classes are applied
      const dashboard = screen.getByText('Dashboard').closest('div');
      expect(dashboard).toHaveClass('mobile-layout'); // Assuming this class exists
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument();
      });

      // Check for proper headings
      expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();

      // Check for proper button labels
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });
    });

    it('should be keyboard navigable', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });

      // Test tab navigation
      const focusableElements = screen.getAllByRole('button');
      focusableElements.forEach(element => {
        expect(element).toHaveAttribute('tabIndex');
      });
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', async () => {
      const renderSpy = jest.fn();

      const TestDashboard = () => {
        renderSpy();
        return <Dashboard />;
      };

      const { rerender } = render(
        <BrowserRouter>
          {createMockApolloProvider(<TestDashboard />, [successfulDashboardMock])}
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
      });

      const initialRenderCount = renderSpy.mock.calls.length;

      // Rerender with same props - should not cause additional renders
      rerender(
        <BrowserRouter>
          {createMockApolloProvider(<TestDashboard />, [successfulDashboardMock])}
        </BrowserRouter>
      );

      expect(renderSpy.mock.calls.length).toBe(initialRenderCount);
    });
  });
});
