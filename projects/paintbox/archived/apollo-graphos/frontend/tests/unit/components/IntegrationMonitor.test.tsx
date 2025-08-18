import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing';
import { GET_INTEGRATION_STATUS, GET_SYNC_PROGRESS } from '@/graphql/queries';
import { INTEGRATION_STATUS_UPDATED, SYNC_PROGRESS_UPDATED, WEBSOCKET_CONNECTION_STATUS } from '@/graphql/subscriptions';
import { HealthStatus, SyncStatus, IntegrationType } from '@/types';
import { IntegrationMonitor } from '@/components/monitor/IntegrationMonitor';

// Mock utility functions
jest.mock('@/utils/formatters', () => ({
  formatRelativeTime: (date: string) => `${Math.floor((new Date().getTime() - new Date(date).getTime()) / 60000)} minutes ago`
}));

const mockIntegrations = [
  {
    id: 'integration-salesforce',
    name: 'Salesforce CRM',
    type: IntegrationType.SALESFORCE,
    status: HealthStatus.HEALTHY,
    lastCheckAt: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
    responseTime: 250,
    errorMessage: null,
    metadata: {
      endpoint: 'https://mycompany.salesforce.com',
      version: '58.0',
      rateLimitRemaining: 9950,
      rateLimitResetAt: new Date(Date.now() + 3600000).toISOString()
    }
  },
  {
    id: 'integration-companycam',
    name: 'CompanyCam',
    type: IntegrationType.COMPANY_CAM,
    status: HealthStatus.WARNING,
    lastCheckAt: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
    responseTime: 1200,
    errorMessage: null,
    metadata: {
      endpoint: 'https://api.companycam.com',
      version: '2.0',
      rateLimitRemaining: 100
    }
  },
  {
    id: 'integration-redis',
    name: 'Redis Cache',
    type: IntegrationType.REDIS,
    status: HealthStatus.ERROR,
    lastCheckAt: new Date(Date.now() - 180000).toISOString(), // 3 minutes ago
    responseTime: 5000,
    errorMessage: 'Connection timeout after 5 seconds',
    metadata: {
      endpoint: 'redis.internal:6379',
      version: '7.0'
    }
  }
];

const mockSyncProgress = [
  {
    id: 'sync-1',
    integration: 'Salesforce CRM',
    status: SyncStatus.IN_PROGRESS,
    progress: 75,
    total: 100,
    startedAt: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
    completedAt: null,
    errorMessage: null,
    recordsProcessed: 75
  },
  {
    id: 'sync-2',
    integration: 'CompanyCam',
    status: SyncStatus.COMPLETED,
    progress: 100,
    total: 50,
    startedAt: new Date(Date.now() - 1200000).toISOString(), // 20 minutes ago
    completedAt: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
    errorMessage: null,
    recordsProcessed: 50
  },
  {
    id: 'sync-3',
    integration: 'Redis Cache',
    status: SyncStatus.FAILED,
    progress: 25,
    total: 80,
    startedAt: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
    completedAt: null,
    errorMessage: 'Redis connection lost during sync',
    recordsProcessed: 20
  }
];

const createIntegrationStatusMock = () => ({
  request: {
    query: GET_INTEGRATION_STATUS
  },
  result: {
    data: {
      integrations: mockIntegrations
    }
  }
});

const createSyncProgressMock = () => ({
  request: {
    query: GET_SYNC_PROGRESS
  },
  result: {
    data: {
      syncProgress: mockSyncProgress
    }
  }
});

const createSubscriptionMock = (subscription: any, data: any) => ({
  request: {
    query: subscription
  },
  result: {
    data
  }
});

describe('IntegrationMonitor', () => {
  beforeEach(() => {
    // Mock window.addEventListener and removeEventListener
    global.addEventListener = jest.fn();
    global.removeEventListener = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the monitor header correctly', async () => {
    const mocks = [createIntegrationStatusMock(), createSyncProgressMock()];

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <IntegrationMonitor />
      </MockedProvider>
    );

    expect(screen.getByText('Integration Monitor')).toBeInTheDocument();
    expect(screen.getByText('Monitor external API health and sync progress')).toBeInTheDocument();
  });

  it('displays system overview cards correctly', async () => {
    const mocks = [createIntegrationStatusMock(), createSyncProgressMock()];

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <IntegrationMonitor />
      </MockedProvider>
    );

    await waitFor(() => {
      // System Health - should be WARNING because Redis has ERROR status
      expect(screen.getByText('Warning')).toBeInTheDocument();

      // Integrations - 1 healthy out of 3 total
      expect(screen.getByText('1/3')).toBeInTheDocument();

      // Active Syncs - 1 in progress
      expect(screen.getByText('1')).toBeInTheDocument();

      // WebSocket - should show disconnected initially
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
    });
  });

  it('displays active syncs section', async () => {
    const mocks = [createIntegrationStatusMock(), createSyncProgressMock()];

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <IntegrationMonitor />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Active Syncs')).toBeInTheDocument();
      expect(screen.getByText('Salesforce CRM')).toBeInTheDocument();
      expect(screen.getByText('75.0% complete')).toBeInTheDocument();
      expect(screen.getByText('75 / 100 records')).toBeInTheDocument();
    });

    // Check progress bar
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveStyle('width: 75%');
  });

  it('displays integration status list correctly', async () => {
    const mocks = [createIntegrationStatusMock(), createSyncProgressMock()];

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <IntegrationMonitor />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Integration Status')).toBeInTheDocument();

      // Check all integrations are displayed
      expect(screen.getByText('Salesforce CRM')).toBeInTheDocument();
      expect(screen.getByText('CompanyCam')).toBeInTheDocument();
      expect(screen.getByText('Redis Cache')).toBeInTheDocument();
    });

    // Check status indicators
    expect(screen.getByText('healthy')).toBeInTheDocument();
    expect(screen.getByText('warning')).toBeInTheDocument();
    expect(screen.getByText('error')).toBeInTheDocument();

    // Check response times
    expect(screen.getByText('250ms')).toBeInTheDocument();
    expect(screen.getByText('1200ms')).toBeInTheDocument();
    expect(screen.getByText('5000ms')).toBeInTheDocument();
  });

  it('displays error messages for failed integrations', async () => {
    const mocks = [createIntegrationStatusMock(), createSyncProgressMock()];

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <IntegrationMonitor />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Error: Connection timeout after 5 seconds')).toBeInTheDocument();
    });
  });

  it('displays rate limit information', async () => {
    const mocks = [createIntegrationStatusMock(), createSyncProgressMock()];

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <IntegrationMonitor />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Rate limit: 9950 remaining')).toBeInTheDocument();
    });
  });

  it('handles refresh button click', async () => {
    const user = userEvent.setup();
    const mocks = [
      createIntegrationStatusMock(),
      createSyncProgressMock(),
      // Add second set of mocks for refetch
      createIntegrationStatusMock(),
      createSyncProgressMock()
    ];

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <IntegrationMonitor />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Salesforce CRM')).toBeInTheDocument();
    });

    const refreshButton = screen.getByText('Refresh');
    await user.click(refreshButton);

    // Should show loading state briefly
    expect(refreshButton).toBeDisabled();
  });

  it('shows loading state initially', () => {
    const loadingMocks = [
      {
        request: { query: GET_INTEGRATION_STATUS },
        result: { loading: true }
      },
      {
        request: { query: GET_SYNC_PROGRESS },
        result: { loading: true }
      }
    ];

    render(
      <MockedProvider mocks={loadingMocks} addTypename={false}>
        <IntegrationMonitor />
      </MockedProvider>
    );

    expect(screen.getByText('Loading integrations...')).toBeInTheDocument();
  });

  it('displays empty state when no integrations exist', async () => {
    const emptyMocks = [
      {
        request: { query: GET_INTEGRATION_STATUS },
        result: { data: { integrations: [] } }
      },
      {
        request: { query: GET_SYNC_PROGRESS },
        result: { data: { syncProgress: [] } }
      }
    ];

    render(
      <MockedProvider mocks={emptyMocks} addTypename={false}>
        <IntegrationMonitor />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('No integrations found')).toBeInTheDocument();
      expect(screen.getByText('Configure integrations to monitor their health status')).toBeInTheDocument();
    });
  });

  it('handles websocket status updates via subscription', async () => {
    const wsStatusData = {
      connectionStatus: {
        connected: true,
        timestamp: new Date().toISOString(),
        clientCount: 5
      }
    };

    const mocks = [
      createIntegrationStatusMock(),
      createSyncProgressMock(),
      createSubscriptionMock(WEBSOCKET_CONNECTION_STATUS, wsStatusData)
    ];

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <IntegrationMonitor />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });
  });

  it('handles integration status updates via subscription', async () => {
    const statusUpdateData = {
      integrationStatusUpdated: {
        id: 'integration-salesforce',
        name: 'Salesforce CRM',
        type: IntegrationType.SALESFORCE,
        status: HealthStatus.ERROR,
        lastCheckAt: new Date().toISOString(),
        responseTime: 3000,
        errorMessage: 'API limit exceeded',
        metadata: {}
      }
    };

    const mocks = [
      createIntegrationStatusMock(),
      createSyncProgressMock(),
      // Add refetch mocks for subscription update
      createIntegrationStatusMock(),
      createSubscriptionMock(INTEGRATION_STATUS_UPDATED, statusUpdateData)
    ];

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <IntegrationMonitor />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Salesforce CRM')).toBeInTheDocument();
    });
  });

  it('handles sync progress updates via subscription', async () => {
    const syncUpdateData = {
      syncProgressUpdated: {
        id: 'sync-1',
        integration: 'Salesforce CRM',
        status: SyncStatus.IN_PROGRESS,
        progress: 85,
        total: 100,
        startedAt: new Date(Date.now() - 900000).toISOString(),
        completedAt: null,
        errorMessage: null,
        recordsProcessed: 85
      }
    };

    const mocks = [
      createIntegrationStatusMock(),
      createSyncProgressMock(),
      // Add refetch mocks for subscription update
      createSyncProgressMock(),
      createSubscriptionMock(SYNC_PROGRESS_UPDATED, syncUpdateData)
    ];

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <IntegrationMonitor />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('75.0% complete')).toBeInTheDocument();
    });
  });

  it('monitors network online/offline status', () => {
    const mocks = [createIntegrationStatusMock(), createSyncProgressMock()];

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <IntegrationMonitor />
      </MockedProvider>
    );

    // Verify event listeners are added
    expect(global.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    expect(global.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
  });

  it('displays WebSocket connection details section', async () => {
    const mocks = [createIntegrationStatusMock(), createSyncProgressMock()];

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <IntegrationMonitor />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('WebSocket Connection')).toBeInTheDocument();
      expect(screen.getByText('Status:')).toBeInTheDocument();
      expect(screen.getByText('Reconnecting:')).toBeInTheDocument();
      expect(screen.getByText('Reconnect attempts:')).toBeInTheDocument();
    });
  });

  it('calculates system health correctly based on integration statuses', async () => {
    // Test with all healthy integrations
    const healthyIntegrations = mockIntegrations.map(integration => ({
      ...integration,
      status: HealthStatus.HEALTHY
    }));

    const healthyMock = {
      request: { query: GET_INTEGRATION_STATUS },
      result: { data: { integrations: healthyIntegrations } }
    };

    const mocks = [healthyMock, createSyncProgressMock()];

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <IntegrationMonitor />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Healthy')).toBeInTheDocument();
    });
  });

  it('does not show active syncs section when there are no active syncs', async () => {
    const completedSyncs = mockSyncProgress.map(sync => ({
      ...sync,
      status: SyncStatus.COMPLETED
    }));

    const noActiveSyncsMock = {
      request: { query: GET_SYNC_PROGRESS },
      result: { data: { syncProgress: completedSyncs } }
    };

    const mocks = [createIntegrationStatusMock(), noActiveSyncsMock];

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <IntegrationMonitor />
      </MockedProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('Active Syncs')).not.toBeInTheDocument();
    });
  });

  it('displays correct sync status colors', async () => {
    const mocks = [createIntegrationStatusMock(), createSyncProgressMock()];

    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <IntegrationMonitor />
      </MockedProvider>
    );

    await waitFor(() => {
      const inProgressBadge = screen.getByText('IN PROGRESS');
      expect(inProgressBadge).toHaveClass('bg-blue-100', 'text-blue-800');
    });
  });
});
