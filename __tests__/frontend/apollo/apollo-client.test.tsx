import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { InMemoryCache, gql } from '@apollo/client';
import { GraphQLError } from 'graphql';
import { act } from 'react-dom/test-utils';

// Import components that use Apollo Client
import { DashboardList } from '../../../apps/analytics-dashboard/src/components/dashboard/DashboardList';
import { DashboardDetail } from '../../../apps/analytics-dashboard/src/components/dashboard/DashboardDetail';
import { WidgetEditor } from '../../../apps/analytics-dashboard/src/components/widgets/WidgetEditor';
import { RealTimeWidget } from '../../../apps/analytics-dashboard/src/components/widgets/RealTimeWidget';

// GraphQL queries and mutations
const GET_DASHBOARDS = gql`
  query GetDashboards($organizationId: ID!) {
    dashboards(organizationId: $organizationId) {
      id
      name
      description
      isActive
      createdAt
      updatedAt
      widgets {
        id
        name
        type
        position {
          x
          y
          width
          height
        }
      }
    }
  }
`;

const GET_DASHBOARD = gql`
  query GetDashboard($id: ID!) {
    dashboard(id: $id) {
      id
      name
      description
      config
      isActive
      widgets {
        id
        name
        type
        position {
          x
          y
          width
          height
        }
        config
      }
    }
  }
`;

const CREATE_DASHBOARD = gql`
  mutation CreateDashboard($input: CreateDashboardInput!) {
    createDashboard(input: $input) {
      id
      name
      description
      isActive
    }
  }
`;

const UPDATE_DASHBOARD = gql`
  mutation UpdateDashboard($id: ID!, $input: UpdateDashboardInput!) {
    updateDashboard(id: $id, input: $input) {
      id
      name
      description
      config
      updatedAt
    }
  }
`;

const DELETE_DASHBOARD = gql`
  mutation DeleteDashboard($id: ID!) {
    deleteDashboard(id: $id) {
      success
      message
    }
  }
`;

const WIDGET_DATA_SUBSCRIPTION = gql`
  subscription WidgetDataUpdated($widgetId: ID!) {
    widgetDataUpdated(widgetId: $widgetId) {
      id
      data
      lastUpdated
    }
  }
`;

const DASHBOARD_UPDATED_SUBSCRIPTION = gql`
  subscription DashboardUpdated($dashboardId: ID!) {
    dashboardUpdated(dashboardId: $dashboardId) {
      id
      name
      widgets {
        id
        name
        position {
          x
          y
          width
          height
        }
      }
      updatedAt
    }
  }
`;

// Mock data
const mockDashboards = [
  {
    id: 'dashboard-1',
    name: 'Sales Dashboard',
    description: 'Overview of sales metrics',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    widgets: [
      {
        id: 'widget-1',
        name: 'Total Sales',
        type: 'metric',
        position: { x: 0, y: 0, width: 4, height: 2 },
      },
      {
        id: 'widget-2',
        name: 'Sales Chart',
        type: 'line_chart',
        position: { x: 4, y: 0, width: 8, height: 4 },
      },
    ],
  },
  {
    id: 'dashboard-2',
    name: 'Analytics Dashboard',
    description: 'User analytics and engagement',
    isActive: true,
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    widgets: [
      {
        id: 'widget-3',
        name: 'Active Users',
        type: 'metric',
        position: { x: 0, y: 0, width: 6, height: 3 },
      },
    ],
  },
];

const mockDashboard = {
  id: 'dashboard-1',
  name: 'Sales Dashboard',
  description: 'Overview of sales metrics',
  config: { theme: 'light', layout: 'grid' },
  isActive: true,
  widgets: [
    {
      id: 'widget-1',
      name: 'Total Sales',
      type: 'metric',
      position: { x: 0, y: 0, width: 4, height: 2 },
      config: { color: '#007AFF', format: 'currency' },
    },
    {
      id: 'widget-2',
      name: 'Sales Chart',
      type: 'line_chart',
      position: { x: 4, y: 0, width: 8, height: 4 },
      config: { xAxis: 'date', yAxis: 'value' },
    },
  ],
};

describe('Apollo Client Integration Tests', () => {
  describe('Query Operations', () => {
    it('should fetch dashboards successfully', async () => {
      // Arrange
      const mocks = [
        {
          request: {
            query: GET_DASHBOARDS,
            variables: { organizationId: 'org-123' },
          },
          result: {
            data: {
              dashboards: mockDashboards,
            },
          },
        },
      ];

      // Act
      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <DashboardList organizationId="org-123" />
        </MockedProvider>
      );

      // Assert
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Sales Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    it('should handle query errors gracefully', async () => {
      // Arrange
      const errorMocks = [
        {
          request: {
            query: GET_DASHBOARDS,
            variables: { organizationId: 'org-123' },
          },
          error: new Error('Failed to fetch dashboards'),
        },
      ];

      // Act
      render(
        <MockedProvider mocks={errorMocks} addTypename={false}>
          <DashboardList organizationId="org-123" />
        </MockedProvider>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/Failed to fetch dashboards/)).toBeInTheDocument();
      });
    });

    it('should handle GraphQL errors in response', async () => {
      // Arrange
      const errorMocks = [
        {
          request: {
            query: GET_DASHBOARDS,
            variables: { organizationId: 'org-123' },
          },
          result: {
            errors: [new GraphQLError('Access denied')],
          },
        },
      ];

      // Act
      render(
        <MockedProvider mocks={errorMocks} addTypename={false}>
          <DashboardList organizationId="org-123" />
        </MockedProvider>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/Access denied/)).toBeInTheDocument();
      });
    });

    it('should fetch single dashboard with variables', async () => {
      // Arrange
      const mocks = [
        {
          request: {
            query: GET_DASHBOARD,
            variables: { id: 'dashboard-1' },
          },
          result: {
            data: {
              dashboard: mockDashboard,
            },
          },
        },
      ];

      // Act
      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <DashboardDetail dashboardId="dashboard-1" />
        </MockedProvider>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Sales Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Total Sales')).toBeInTheDocument();
        expect(screen.getByText('Sales Chart')).toBeInTheDocument();
      });
    });
  });

  describe('Mutation Operations', () => {
    it('should create dashboard successfully', async () => {
      // Arrange
      const newDashboard = {
        name: 'New Dashboard',
        description: 'A new dashboard',
        organizationId: 'org-123',
      };

      const mocks = [
        {
          request: {
            query: CREATE_DASHBOARD,
            variables: { input: newDashboard },
          },
          result: {
            data: {
              createDashboard: {
                id: 'dashboard-3',
                name: 'New Dashboard',
                description: 'A new dashboard',
                isActive: true,
              },
            },
          },
        },
      ];

      // Act
      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <WidgetEditor onSave={() => {}} />
        </MockedProvider>
      );

      // Trigger create action
      fireEvent.click(screen.getByTestId('create-dashboard-button'));
      fireEvent.change(screen.getByTestId('dashboard-name-input'), {
        target: { value: 'New Dashboard' },
      });
      fireEvent.change(screen.getByTestId('dashboard-description-input'), {
        target: { value: 'A new dashboard' },
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('save-dashboard-button'));
      });

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Dashboard created successfully')).toBeInTheDocument();
      });
    });

    it('should update dashboard successfully', async () => {
      // Arrange
      const updatedData = {
        name: 'Updated Dashboard Name',
        description: 'Updated description',
      };

      const mocks = [
        {
          request: {
            query: GET_DASHBOARD,
            variables: { id: 'dashboard-1' },
          },
          result: {
            data: { dashboard: mockDashboard },
          },
        },
        {
          request: {
            query: UPDATE_DASHBOARD,
            variables: { id: 'dashboard-1', input: updatedData },
          },
          result: {
            data: {
              updateDashboard: {
                ...mockDashboard,
                ...updatedData,
                updatedAt: new Date().toISOString(),
              },
            },
          },
        },
      ];

      // Act
      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <DashboardDetail dashboardId="dashboard-1" />
        </MockedProvider>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Sales Dashboard')).toBeInTheDocument();
      });

      // Trigger update
      fireEvent.click(screen.getByTestId('edit-dashboard-button'));
      fireEvent.change(screen.getByTestId('dashboard-name-input'), {
        target: { value: 'Updated Dashboard Name' },
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('save-changes-button'));
      });

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Updated Dashboard Name')).toBeInTheDocument();
      });
    });

    it('should handle mutation errors', async () => {
      // Arrange
      const mocks = [
        {
          request: {
            query: CREATE_DASHBOARD,
            variables: { input: { name: 'Test', organizationId: 'org-123' } },
          },
          error: new Error('Validation failed'),
        },
      ];

      // Act
      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <WidgetEditor onSave={() => {}} />
        </MockedProvider>
      );

      // Trigger create action
      fireEvent.click(screen.getByTestId('create-dashboard-button'));
      fireEvent.change(screen.getByTestId('dashboard-name-input'), {
        target: { value: 'Test' },
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('save-dashboard-button'));
      });

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/Validation failed/)).toBeInTheDocument();
      });
    });

    it('should delete dashboard successfully', async () => {
      // Arrange
      const mocks = [
        {
          request: {
            query: GET_DASHBOARD,
            variables: { id: 'dashboard-1' },
          },
          result: {
            data: { dashboard: mockDashboard },
          },
        },
        {
          request: {
            query: DELETE_DASHBOARD,
            variables: { id: 'dashboard-1' },
          },
          result: {
            data: {
              deleteDashboard: {
                success: true,
                message: 'Dashboard deleted successfully',
              },
            },
          },
        },
      ];

      // Act
      render(
        <MockedProvider mocks={mocks} addTypename={false}>
          <DashboardDetail dashboardId="dashboard-1" />
        </MockedProvider>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Sales Dashboard')).toBeInTheDocument();
      });

      // Trigger delete
      fireEvent.click(screen.getByTestId('delete-dashboard-button'));
      fireEvent.click(screen.getByTestId('confirm-delete-button'));

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Dashboard deleted successfully')).toBeInTheDocument();
      });
    });
  });

  describe('Subscription Operations', () => {
    it('should handle widget data subscription updates', async () => {
      // Arrange
      const subscriptionMock = {
        request: {
          query: WIDGET_DATA_SUBSCRIPTION,
          variables: { widgetId: 'widget-1' },
        },
        result: {
          data: {
            widgetDataUpdated: {
              id: 'widget-1',
              data: [
                { x: '2024-01-01', y: 1000 },
                { x: '2024-01-02', y: 1200 },
                { x: '2024-01-03', y: 1100 },
              ],
              lastUpdated: new Date().toISOString(),
            },
          },
        },
      };

      // Act
      render(
        <MockedProvider mocks={[subscriptionMock]} addTypename={false}>
          <RealTimeWidget widgetId="widget-1" />
        </MockedProvider>
      );

      // Assert - initial loading state
      expect(screen.getByTestId('widget-loading')).toBeInTheDocument();

      // Wait for subscription data
      await waitFor(() => {
        expect(screen.getByTestId('widget-chart')).toBeInTheDocument();
        expect(screen.getByText('1000')).toBeInTheDocument();
        expect(screen.getByText('1200')).toBeInTheDocument();
      });
    });

    it('should handle dashboard update subscriptions', async () => {
      // Arrange
      const initialMock = {
        request: {
          query: GET_DASHBOARD,
          variables: { id: 'dashboard-1' },
        },
        result: {
          data: { dashboard: mockDashboard },
        },
      };

      const subscriptionMock = {
        request: {
          query: DASHBOARD_UPDATED_SUBSCRIPTION,
          variables: { dashboardId: 'dashboard-1' },
        },
        result: {
          data: {
            dashboardUpdated: {
              ...mockDashboard,
              name: 'Updated via Subscription',
              widgets: [
                ...mockDashboard.widgets,
                {
                  id: 'widget-3',
                  name: 'New Widget',
                  position: { x: 0, y: 4, width: 6, height: 3 },
                },
              ],
              updatedAt: new Date().toISOString(),
            },
          },
        },
      };

      // Act
      render(
        <MockedProvider mocks={[initialMock, subscriptionMock]} addTypename={false}>
          <DashboardDetail dashboardId="dashboard-1" />
        </MockedProvider>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Sales Dashboard')).toBeInTheDocument();
      });

      // Simulate subscription update
      await waitFor(() => {
        expect(screen.getByText('Updated via Subscription')).toBeInTheDocument();
        expect(screen.getByText('New Widget')).toBeInTheDocument();
      });
    });

    it('should handle subscription errors', async () => {
      // Arrange
      const subscriptionMock = {
        request: {
          query: WIDGET_DATA_SUBSCRIPTION,
          variables: { widgetId: 'widget-1' },
        },
        error: new Error('Subscription connection failed'),
      };

      // Act
      render(
        <MockedProvider mocks={[subscriptionMock]} addTypename={false}>
          <RealTimeWidget widgetId="widget-1" />
        </MockedProvider>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/connection failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Cache Management', () => {
    it('should update cache after mutations', async () => {
      // Arrange
      const cache = new InMemoryCache();
      const newDashboard = {
        id: 'dashboard-3',
        name: 'New Dashboard',
        description: 'A new dashboard',
        isActive: true,
      };

      const mocks = [
        {
          request: {
            query: GET_DASHBOARDS,
            variables: { organizationId: 'org-123' },
          },
          result: {
            data: { dashboards: mockDashboards },
          },
        },
        {
          request: {
            query: CREATE_DASHBOARD,
            variables: {
              input: {
                name: 'New Dashboard',
                description: 'A new dashboard',
                organizationId: 'org-123',
              },
            },
          },
          result: {
            data: { createDashboard: newDashboard },
          },
        },
      ];

      // Act
      render(
        <MockedProvider mocks={mocks} cache={cache} addTypename={false}>
          <div>
            <DashboardList organizationId="org-123" />
            <WidgetEditor onSave={() => {}} />
          </div>
        </MockedProvider>
      );

      // Wait for initial query
      await waitFor(() => {
        expect(screen.getByText('Sales Dashboard')).toBeInTheDocument();
      });

      // Trigger create mutation
      fireEvent.click(screen.getByTestId('create-dashboard-button'));
      fireEvent.change(screen.getByTestId('dashboard-name-input'), {
        target: { value: 'New Dashboard' },
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('save-dashboard-button'));
      });

      // Assert cache is updated
      await waitFor(() => {
        expect(screen.getByText('New Dashboard')).toBeInTheDocument();
      });

      // Verify cache contains new dashboard
      const cachedData = cache.readQuery({
        query: GET_DASHBOARDS,
        variables: { organizationId: 'org-123' },
      });

      expect(cachedData.dashboards).toHaveLength(3);
      expect(cachedData.dashboards).toContainEqual(
        expect.objectContaining({ name: 'New Dashboard' })
      );
    });

    it('should handle cache eviction on delete', async () => {
      // Arrange
      const cache = new InMemoryCache();
      const mocks = [
        {
          request: {
            query: GET_DASHBOARDS,
            variables: { organizationId: 'org-123' },
          },
          result: {
            data: { dashboards: mockDashboards },
          },
        },
        {
          request: {
            query: DELETE_DASHBOARD,
            variables: { id: 'dashboard-1' },
          },
          result: {
            data: {
              deleteDashboard: { success: true, message: 'Deleted' },
            },
          },
        },
      ];

      // Act
      render(
        <MockedProvider mocks={mocks} cache={cache} addTypename={false}>
          <DashboardList organizationId="org-123" />
        </MockedProvider>
      );

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Sales Dashboard')).toBeInTheDocument();
      });

      // Trigger delete
      fireEvent.click(screen.getByTestId('delete-dashboard-dashboard-1'));
      await act(async () => {
        fireEvent.click(screen.getByTestId('confirm-delete'));
      });

      // Assert item is removed from UI
      await waitFor(() => {
        expect(screen.queryByText('Sales Dashboard')).not.toBeInTheDocument();
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });
    });
  });

  describe('Error Boundary Integration', () => {
    it('should handle network errors gracefully', async () => {
      // Arrange
      const networkErrorMock = {
        request: {
          query: GET_DASHBOARDS,
          variables: { organizationId: 'org-123' },
        },
        networkError: new Error('Network request failed'),
      };

      // Act
      render(
        <MockedProvider mocks={[networkErrorMock]} addTypename={false}>
          <DashboardList organizationId="org-123" />
        </MockedProvider>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/Network request failed/)).toBeInTheDocument();
        expect(screen.getByTestId('retry-button')).toBeInTheDocument();
      });
    });

    it('should handle timeout errors', async () => {
      // Arrange
      const timeoutMock = {
        request: {
          query: GET_DASHBOARDS,
          variables: { organizationId: 'org-123' },
        },
        error: new Error('Request timeout'),
      };

      // Act
      render(
        <MockedProvider mocks={[timeoutMock]} addTypename={false}>
          <DashboardList organizationId="org-123" />
        </MockedProvider>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/Request timeout/)).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state during queries', async () => {
      // Arrange
      const delayedMock = {
        request: {
          query: GET_DASHBOARDS,
          variables: { organizationId: 'org-123' },
        },
        result: {
          data: { dashboards: mockDashboards },
        },
        delay: 100, // Add delay to test loading state
      };

      // Act
      render(
        <MockedProvider mocks={[delayedMock]} addTypename={false}>
          <DashboardList organizationId="org-123" />
        </MockedProvider>
      );

      // Assert loading state appears
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

      // Assert loading state disappears after data loads
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
        expect(screen.getByText('Sales Dashboard')).toBeInTheDocument();
      });
    });

    it('should show mutation loading states', async () => {
      // Arrange
      const delayedMutationMock = {
        request: {
          query: CREATE_DASHBOARD,
          variables: {
            input: {
              name: 'Test Dashboard',
              organizationId: 'org-123',
            },
          },
        },
        result: {
          data: {
            createDashboard: {
              id: 'dashboard-3',
              name: 'Test Dashboard',
              description: null,
              isActive: true,
            },
          },
        },
        delay: 100,
      };

      // Act
      render(
        <MockedProvider mocks={[delayedMutationMock]} addTypename={false}>
          <WidgetEditor onSave={() => {}} />
        </MockedProvider>
      );

      // Trigger mutation
      fireEvent.click(screen.getByTestId('create-dashboard-button'));
      fireEvent.change(screen.getByTestId('dashboard-name-input'), {
        target: { value: 'Test Dashboard' },
      });

      fireEvent.click(screen.getByTestId('save-dashboard-button'));

      // Assert loading state
      expect(screen.getByTestId('save-loading-spinner')).toBeInTheDocument();

      // Assert loading state disappears
      await waitFor(() => {
        expect(screen.queryByTestId('save-loading-spinner')).not.toBeInTheDocument();
      });
    });
  });

  describe('Optimistic Updates', () => {
    it('should perform optimistic updates for mutations', async () => {
      // Arrange
      const cache = new InMemoryCache();
      const optimisticUpdate = {
        id: 'temp-dashboard',
        name: 'Optimistic Dashboard',
        description: 'Creating...',
        isActive: true,
        __typename: 'Dashboard',
      };

      const mocks = [
        {
          request: {
            query: CREATE_DASHBOARD,
            variables: {
              input: {
                name: 'Optimistic Dashboard',
                organizationId: 'org-123',
              },
            },
          },
          result: {
            data: {
              createDashboard: {
                id: 'dashboard-real',
                name: 'Optimistic Dashboard',
                description: 'Created successfully',
                isActive: true,
              },
            },
          },
          delay: 1000, // Simulate slow network
        },
      ];

      // Act
      render(
        <MockedProvider mocks={mocks} cache={cache} addTypename={false}>
          <WidgetEditor onSave={() => {}} />
        </MockedProvider>
      );

      // Trigger optimistic update
      fireEvent.click(screen.getByTestId('create-dashboard-button'));
      fireEvent.change(screen.getByTestId('dashboard-name-input'), {
        target: { value: 'Optimistic Dashboard' },
      });

      fireEvent.click(screen.getByTestId('save-dashboard-button'));

      // Assert optimistic state appears immediately
      expect(screen.getByText('Creating...')).toBeInTheDocument();

      // Assert real data replaces optimistic data
      await waitFor(() => {
        expect(screen.getByText('Created successfully')).toBeInTheDocument();
        expect(screen.queryByText('Creating...')).not.toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });
});
