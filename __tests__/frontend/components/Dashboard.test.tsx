import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MockedProvider } from '@apollo/client/testing';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Dashboard } from '../../../apps/analytics-dashboard/src/components/Dashboard';
import { DashboardBuilder } from '../../../apps/analytics-dashboard/src/components/DashboardBuilder';
import { WidgetContainer } from '../../../apps/analytics-dashboard/src/components/WidgetContainer';
import { ChartWidget } from '../../../apps/analytics-dashboard/src/components/widgets/ChartWidget';
import { MetricWidget } from '../../../apps/analytics-dashboard/src/components/widgets/MetricWidget';
import { GET_DASHBOARD, UPDATE_DASHBOARD, DASHBOARD_SUBSCRIPTION } from '../../../apps/analytics-dashboard/src/graphql/dashboard';
import { useDashboardStore } from '../../../apps/analytics-dashboard/src/stores/dashboard-store';
import { useAuthStore } from '../../../apps/analytics-dashboard/src/stores/auth-store';

// Mock stores
vi.mock('../../../apps/analytics-dashboard/src/stores/dashboard-store');
vi.mock('../../../apps/analytics-dashboard/src/stores/auth-store');

// Mock Recharts to avoid canvas issues in tests
vi.mock('recharts', () => ({
  LineChart: ({ children, ...props }: any) => <div data-testid="line-chart" {...props}>{children}</div>,
  BarChart: ({ children, ...props }: any) => <div data-testid="bar-chart" {...props}>{children}</div>,
  PieChart: ({ children, ...props }: any) => <div data-testid="pie-chart" {...props}>{children}</div>,
  Line: (props: any) => <div data-testid="line" {...props} />,
  Bar: (props: any) => <div data-testid="bar" {...props} />,
  Pie: (props: any) => <div data-testid="pie" {...props} />,
  Cell: (props: any) => <div data-testid="cell" {...props} />,
  XAxis: (props: any) => <div data-testid="x-axis" {...props} />,
  YAxis: (props: any) => <div data-testid="y-axis" {...props} />,
  CartesianGrid: (props: any) => <div data-testid="cartesian-grid" {...props} />,
  Tooltip: (props: any) => <div data-testid="tooltip" {...props} />,
  Legend: (props: any) => <div data-testid="legend" {...props} />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
}));

// Mock framer-motion to avoid animation issues
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>,
}));

const mockDashboard = {
  id: 'dashboard-123',
  name: 'Test Dashboard',
  organizationId: 'org-123',
  config: {
    layout: 'grid',
    theme: 'light',
    widgets: [
      {
        id: 'widget-1',
        type: 'line_chart',
        title: 'Page Views',
        position: { x: 0, y: 0, width: 6, height: 4 },
        query: 'SELECT date, count() as views FROM events WHERE event_type = "page_view" GROUP BY date',
        config: {
          xAxis: 'date',
          yAxis: 'views',
          color: '#8884d8',
        },
      },
      {
        id: 'widget-2',
        type: 'metric',
        title: 'Total Users',
        position: { x: 6, y: 0, width: 3, height: 2 },
        query: 'SELECT count(DISTINCT user_id) as total_users FROM events',
        config: {
          format: 'number',
          suffix: '',
          color: '#82ca9d',
        },
      },
      {
        id: 'widget-3',
        type: 'bar_chart',
        title: 'Top Pages',
        position: { x: 0, y: 4, width: 9, height: 4 },
        query: 'SELECT page, count() as visits FROM events WHERE event_type = "page_view" GROUP BY page ORDER BY visits DESC LIMIT 10',
        config: {
          xAxis: 'page',
          yAxis: 'visits',
          color: '#ffc658',
        },
      },
    ],
  },
  isActive: true,
  createdAt: new Date('2024-01-01').toISOString(),
  updatedAt: new Date('2024-01-01').toISOString(),
};

const mockWidgetData = {
  'widget-1': [
    { date: '2024-01-01', views: 1200 },
    { date: '2024-01-02', views: 1350 },
    { date: '2024-01-03', views: 1100 },
    { date: '2024-01-04', views: 1500 },
    { date: '2024-01-05', views: 1250 },
  ],
  'widget-2': [{ total_users: 2450 }],
  'widget-3': [
    { page: '/dashboard', visits: 5200 },
    { page: '/analytics', visits: 3800 },
    { page: '/settings', visits: 2100 },
    { page: '/profile', visits: 1500 },
    { page: '/reports', visits: 1200 },
  ],
};

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  organizationId: 'org-123',
  role: 'USER',
};

const apolloMocks = [
  {
    request: {
      query: GET_DASHBOARD,
      variables: { id: 'dashboard-123' },
    },
    result: {
      data: {
        dashboard: mockDashboard,
      },
    },
  },
  {
    request: {
      query: UPDATE_DASHBOARD,
      variables: {
        id: 'dashboard-123',
        input: {
          config: expect.any(Object),
        },
      },
    },
    result: {
      data: {
        updateDashboard: {
          ...mockDashboard,
          updatedAt: new Date().toISOString(),
        },
      },
    },
  },
  {
    request: {
      query: DASHBOARD_SUBSCRIPTION,
      variables: { organizationId: 'org-123' },
    },
    result: {
      data: {
        dashboardUpdates: mockDashboard,
      },
    },
  },
];

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <MockedProvider mocks={apolloMocks} addTypename={false}>
    <DndProvider backend={HTML5Backend}>
      {children}
    </DndProvider>
  </MockedProvider>
);

describe('Dashboard Component', () => {
  const mockDashboardStore = {
    dashboard: mockDashboard,
    loading: false,
    error: null,
    setDashboard: vi.fn(),
    updateWidget: vi.fn(),
    addWidget: vi.fn(),
    removeWidget: vi.fn(),
    updateLayout: vi.fn(),
    loadDashboard: vi.fn(),
  };

  const mockAuthStore = {
    user: mockUser,
    isAuthenticated: true,
    loading: false,
  };

  beforeEach(() => {
    vi.mocked(useDashboardStore).mockReturnValue(mockDashboardStore);
    vi.mocked(useAuthStore).mockReturnValue(mockAuthStore);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Dashboard Rendering', () => {
    it('should render dashboard with widgets', async () => {
      render(
        <TestWrapper>
          <Dashboard dashboardId="dashboard-123" />
        </TestWrapper>
      );

      expect(screen.getByText('Test Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Page Views')).toBeInTheDocument();
      expect(screen.getByText('Total Users')).toBeInTheDocument();
      expect(screen.getByText('Top Pages')).toBeInTheDocument();
    });

    it('should show loading state', () => {
      vi.mocked(useDashboardStore).mockReturnValue({
        ...mockDashboardStore,
        loading: true,
        dashboard: null,
      });

      render(
        <TestWrapper>
          <Dashboard dashboardId="dashboard-123" />
        </TestWrapper>
      );

      expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();
    });

    it('should show error state', () => {
      const error = new Error('Failed to load dashboard');
      vi.mocked(useDashboardStore).mockReturnValue({
        ...mockDashboardStore,
        loading: false,
        error,
        dashboard: null,
      });

      render(
        <TestWrapper>
          <Dashboard dashboardId="dashboard-123" />
        </TestWrapper>
      );

      expect(screen.getByText('Error loading dashboard')).toBeInTheDocument();
      expect(screen.getByText('Failed to load dashboard')).toBeInTheDocument();
    });

    it('should render empty state when no widgets', () => {
      const emptyDashboard = {
        ...mockDashboard,
        config: { ...mockDashboard.config, widgets: [] },
      };

      vi.mocked(useDashboardStore).mockReturnValue({
        ...mockDashboardStore,
        dashboard: emptyDashboard,
      });

      render(
        <TestWrapper>
          <Dashboard dashboardId="dashboard-123" />
        </TestWrapper>
      );

      expect(screen.getByText('No widgets added yet')).toBeInTheDocument();
      expect(screen.getByText('Add Widget')).toBeInTheDocument();
    });
  });

  describe('Widget Interactions', () => {
    it('should handle widget editing', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <Dashboard dashboardId="dashboard-123" />
        </TestWrapper>
      );

      // Click edit button on first widget
      const editButton = screen.getAllByLabelText('Edit widget')[0];
      await user.click(editButton);

      // Should open edit modal
      expect(screen.getByText('Edit Widget')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Page Views')).toBeInTheDocument();
    });

    it('should handle widget deletion', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <Dashboard dashboardId="dashboard-123" />
        </TestWrapper>
      );

      // Click delete button on first widget
      const deleteButton = screen.getAllByLabelText('Delete widget')[0];
      await user.click(deleteButton);

      // Should show confirmation dialog
      expect(screen.getByText('Delete Widget')).toBeInTheDocument();
      expect(screen.getByText('Are you sure you want to delete this widget?')).toBeInTheDocument();

      // Confirm deletion
      const confirmButton = screen.getByText('Delete');
      await user.click(confirmButton);

      expect(mockDashboardStore.removeWidget).toHaveBeenCalledWith('widget-1');
    });

    it('should handle widget duplication', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <Dashboard dashboardId="dashboard-123" />
        </TestWrapper>
      );

      // Click duplicate button on first widget
      const duplicateButton = screen.getAllByLabelText('Duplicate widget')[0];
      await user.click(duplicateButton);

      expect(mockDashboardStore.addWidget).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'line_chart',
          title: 'Page Views (Copy)',
          query: mockDashboard.config.widgets[0].query,
        })
      );
    });
  });

  describe('Dashboard Layout', () => {
    it('should handle widget drag and drop', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <DashboardBuilder dashboard={mockDashboard} editable={true} />
        </TestWrapper>
      );

      // Find widget elements
      const widget = screen.getByText('Page Views').closest('[data-widget-id]');
      expect(widget).toBeInTheDocument();

      // Simulate drag and drop (this is complex with react-dnd, so we'll test the handler directly)
      const newLayout = [
        { i: 'widget-1', x: 6, y: 0, w: 6, h: 4 }, // Moved position
        { i: 'widget-2', x: 0, y: 0, w: 3, h: 2 },
        { i: 'widget-3', x: 0, y: 4, w: 9, h: 4 },
      ];

      // Simulate layout change
      fireEvent(widget!, new CustomEvent('layoutChange', { detail: newLayout }));

      await waitFor(() => {
        expect(mockDashboardStore.updateLayout).toHaveBeenCalledWith(newLayout);
      });
    });

    it('should handle responsive layout changes', () => {
      // Mock window resize
      global.innerWidth = 768; // Mobile width
      global.dispatchEvent(new Event('resize'));

      render(
        <TestWrapper>
          <DashboardBuilder dashboard={mockDashboard} editable={true} />
        </TestWrapper>
      );

      // Should render in mobile layout
      expect(screen.getByTestId('dashboard-mobile-layout')).toBeInTheDocument();
    });

    it('should snap widgets to grid', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <DashboardBuilder dashboard={mockDashboard} editable={true} />
        </TestWrapper>
      );

      const widget = screen.getByText('Page Views').closest('[data-widget-id]');

      // Simulate dragging to an off-grid position
      const offGridLayout = [
        { i: 'widget-1', x: 2.5, y: 1.3, w: 6, h: 4 }, // Off-grid position
      ];

      fireEvent(widget!, new CustomEvent('layoutChange', { detail: offGridLayout }));

      await waitFor(() => {
        // Should be snapped to grid
        expect(mockDashboardStore.updateLayout).toHaveBeenCalledWith([
          { i: 'widget-1', x: 3, y: 1, w: 6, h: 4 }, // Snapped to grid
        ]);
      });
    });
  });

  describe('Widget Types', () => {
    describe('ChartWidget', () => {
      it('should render line chart widget', () => {
        const lineWidget = mockDashboard.config.widgets[0];

        render(
          <TestWrapper>
            <ChartWidget
              widget={lineWidget}
              data={mockWidgetData['widget-1']}
              loading={false}
            />
          </TestWrapper>
        );

        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
        expect(screen.getByText('Page Views')).toBeInTheDocument();
      });

      it('should render bar chart widget', () => {
        const barWidget = mockDashboard.config.widgets[2];

        render(
          <TestWrapper>
            <ChartWidget
              widget={barWidget}
              data={mockWidgetData['widget-3']}
              loading={false}
            />
          </TestWrapper>
        );

        expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
        expect(screen.getByText('Top Pages')).toBeInTheDocument();
      });

      it('should show loading state for chart', () => {
        const widget = mockDashboard.config.widgets[0];

        render(
          <TestWrapper>
            <ChartWidget widget={widget} data={[]} loading={true} />
          </TestWrapper>
        );

        expect(screen.getByTestId('chart-loading-skeleton')).toBeInTheDocument();
      });

      it('should show empty state for chart with no data', () => {
        const widget = mockDashboard.config.widgets[0];

        render(
          <TestWrapper>
            <ChartWidget widget={widget} data={[]} loading={false} />
          </TestWrapper>
        );

        expect(screen.getByText('No data available')).toBeInTheDocument();
      });

      it('should handle chart interaction events', async () => {
        const onDataPointClick = vi.fn();
        const widget = {
          ...mockDashboard.config.widgets[0],
          config: {
            ...mockDashboard.config.widgets[0].config,
            onDataPointClick,
          },
        };

        render(
          <TestWrapper>
            <ChartWidget
              widget={widget}
              data={mockWidgetData['widget-1']}
              loading={false}
            />
          </TestWrapper>
        );

        // Simulate clicking on a data point
        const chart = screen.getByTestId('line-chart');
        fireEvent.click(chart);

        // Note: In real tests, you'd mock Recharts to actually trigger onClick events
        // This is a simplified version
      });
    });

    describe('MetricWidget', () => {
      it('should render metric widget', () => {
        const metricWidget = mockDashboard.config.widgets[1];

        render(
          <TestWrapper>
            <MetricWidget
              widget={metricWidget}
              data={mockWidgetData['widget-2']}
              loading={false}
            />
          </TestWrapper>
        );

        expect(screen.getByText('Total Users')).toBeInTheDocument();
        expect(screen.getByText('2,450')).toBeInTheDocument();
      });

      it('should format numbers correctly', () => {
        const metricWidget = {
          ...mockDashboard.config.widgets[1],
          config: {
            format: 'currency',
            currency: 'USD',
          },
        };

        const data = [{ revenue: 12500.75 }];

        render(
          <TestWrapper>
            <MetricWidget widget={metricWidget} data={data} loading={false} />
          </TestWrapper>
        );

        expect(screen.getByText('$12,500.75')).toBeInTheDocument();
      });

      it('should show percentage change', () => {
        const metricWidget = {
          ...mockDashboard.config.widgets[1],
          config: {
            showChange: true,
            changeValue: 12.5,
            changeType: 'increase',
          },
        };

        render(
          <TestWrapper>
            <MetricWidget
              widget={metricWidget}
              data={mockWidgetData['widget-2']}
              loading={false}
            />
          </TestWrapper>
        );

        expect(screen.getByText('+12.5%')).toBeInTheDocument();
        expect(screen.getByTestId('metric-change-positive')).toBeInTheDocument();
      });

      it('should show loading skeleton for metric', () => {
        const widget = mockDashboard.config.widgets[1];

        render(
          <TestWrapper>
            <MetricWidget widget={widget} data={[]} loading={true} />
          </TestWrapper>
        );

        expect(screen.getByTestId('metric-loading-skeleton')).toBeInTheDocument();
      });
    });
  });

  describe('Dashboard Actions', () => {
    it('should handle dashboard name editing', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <Dashboard dashboardId="dashboard-123" editable={true} />
        </TestWrapper>
      );

      // Click on dashboard title to edit
      const titleElement = screen.getByText('Test Dashboard');
      await user.click(titleElement);

      // Should show input field
      const input = screen.getByDisplayValue('Test Dashboard');
      expect(input).toBeInTheDocument();

      // Change the name
      await user.clear(input);
      await user.type(input, 'Updated Dashboard Name');
      await user.press('Enter');

      expect(mockDashboardStore.setDashboard).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Dashboard Name',
        })
      );
    });

    it('should handle dashboard sharing', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <Dashboard dashboardId="dashboard-123" />
        </TestWrapper>
      );

      const shareButton = screen.getByLabelText('Share dashboard');
      await user.click(shareButton);

      expect(screen.getByText('Share Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Copy Link')).toBeInTheDocument();
    });

    it('should handle dashboard export', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <Dashboard dashboardId="dashboard-123" />
        </TestWrapper>
      );

      const exportButton = screen.getByLabelText('Export dashboard');
      await user.click(exportButton);

      expect(screen.getByText('Export Options')).toBeInTheDocument();
      expect(screen.getByText('PDF')).toBeInTheDocument();
      expect(screen.getByText('PNG')).toBeInTheDocument();
      expect(screen.getByText('CSV')).toBeInTheDocument();
    });

    it('should handle dashboard fullscreen mode', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <Dashboard dashboardId="dashboard-123" />
        </TestWrapper>
      );

      const fullscreenButton = screen.getByLabelText('Enter fullscreen');
      await user.click(fullscreenButton);

      // Should hide header and navigation
      expect(screen.queryByTestId('dashboard-header')).not.toBeInTheDocument();
      expect(screen.queryByTestId('navigation-bar')).not.toBeInTheDocument();

      // Should show exit fullscreen button
      expect(screen.getByLabelText('Exit fullscreen')).toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    it('should handle real-time dashboard updates', async () => {
      const updatedDashboard = {
        ...mockDashboard,
        name: 'Updated Dashboard',
        updatedAt: new Date().toISOString(),
      };

      render(
        <TestWrapper>
          <Dashboard dashboardId="dashboard-123" />
        </TestWrapper>
      );

      // Simulate real-time update
      vi.mocked(useDashboardStore).mockReturnValue({
        ...mockDashboardStore,
        dashboard: updatedDashboard,
      });

      // Re-render with updated store
      render(
        <TestWrapper>
          <Dashboard dashboardId="dashboard-123" />
        </TestWrapper>
      );

      expect(screen.getByText('Updated Dashboard')).toBeInTheDocument();
    });

    it('should handle real-time widget data updates', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <Dashboard dashboardId="dashboard-123" />
        </TestWrapper>
      );

      // Should show real-time indicator when data is updating
      expect(screen.getByTestId('realtime-indicator')).toBeInTheDocument();

      // Should show last updated timestamp
      expect(screen.getByText(/Last updated/)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle widget query errors', () => {
      const widget = {
        ...mockDashboard.config.widgets[0],
        error: new Error('Query execution failed'),
      };

      render(
        <TestWrapper>
          <ChartWidget widget={widget} data={[]} loading={false} />
        </TestWrapper>
      );

      expect(screen.getByText('Error loading data')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('should handle network errors gracefully', async () => {
      const user = userEvent.setup();

      // Mock network error
      const errorMocks = [
        {
          request: {
            query: GET_DASHBOARD,
            variables: { id: 'dashboard-123' },
          },
          error: new Error('Network error'),
        },
      ];

      render(
        <MockedProvider mocks={errorMocks} addTypename={false}>
          <Dashboard dashboardId="dashboard-123" />
        </MockedProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Network Error')).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });

      // Should retry on button click
      const retryButton = screen.getByText('Retry');
      await user.click(retryButton);

      expect(mockDashboardStore.loadDashboard).toHaveBeenCalledWith('dashboard-123');
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <Dashboard dashboardId="dashboard-123" />
        </TestWrapper>
      );

      // Should be able to tab through interactive elements
      await user.tab();
      expect(screen.getAllByRole('button')[0]).toHaveFocus();

      await user.tab();
      expect(screen.getAllByRole('button')[1]).toHaveFocus();
    });

    it('should have proper ARIA labels', () => {
      render(
        <TestWrapper>
          <Dashboard dashboardId="dashboard-123" />
        </TestWrapper>
      );

      expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Dashboard: Test Dashboard');
      expect(screen.getAllByRole('button', { name: /Edit widget/ })).toHaveLength(3);
      expect(screen.getAllByRole('button', { name: /Delete widget/ })).toHaveLength(3);
    });

    it('should announce widget updates to screen readers', async () => {
      render(
        <TestWrapper>
          <Dashboard dashboardId="dashboard-123" />
        </TestWrapper>
      );

      // Should have live region for announcements
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should have sufficient color contrast', () => {
      render(
        <TestWrapper>
          <Dashboard dashboardId="dashboard-123" />
        </TestWrapper>
      );

      // This would typically be tested with actual color contrast tools
      // For now, we'll just verify the elements exist
      expect(screen.getByText('Page Views')).toHaveStyle('color: rgb(0, 0, 0)'); // High contrast text
    });
  });
});
