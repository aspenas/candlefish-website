/**
 * Component tests for DeploymentDashboard
 * Tests the main deployment dashboard UI component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DeploymentDashboard } from '../../../src/components/deployment/DeploymentDashboard';
import { DeploymentProvider } from '../../../src/contexts/DeploymentContext';
import { AuthProvider } from '../../../src/contexts/AuthContext';
import { WebSocketProvider } from '../../../src/contexts/WebSocketContext';
import * as deploymentApi from '../../../src/services/deployment.api';

// Mock API calls
jest.mock('../../../src/services/deployment.api');
const mockDeploymentApi = deploymentApi as jest.Mocked<typeof deploymentApi>;

// Mock WebSocket
const mockWebSocket = {
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: WebSocket.OPEN
};

jest.mock('../../../src/hooks/useWebSocket', () => ({
  useWebSocket: () => mockWebSocket
}));

// Test data
const mockDeployments = [
  {
    id: 'deploy-1',
    site_name: 'docs',
    environment: 'production',
    commit_sha: 'abc123',
    branch: 'main',
    status: 'success',
    deployment_strategy: 'blue-green',
    triggered_by: 'user@candlefish.ai',
    started_at: '2024-01-15T10:00:00Z',
    completed_at: '2024-01-15T10:05:30Z',
    duration_seconds: 330,
    live_url: 'https://docs.candlefish.ai',
    changelog: 'Updated API documentation'
  },
  {
    id: 'deploy-2',
    site_name: 'partners',
    environment: 'staging',
    commit_sha: 'def456',
    branch: 'feature/new-dashboard',
    status: 'building',
    deployment_strategy: 'rolling',
    triggered_by: 'dev@candlefish.ai',
    started_at: '2024-01-15T10:10:00Z',
    duration_seconds: 180,
    preview_url: 'https://feature-new-dashboard--partners.candlefish.ai'
  },
  {
    id: 'deploy-3',
    site_name: 'api',
    environment: 'production',
    commit_sha: 'ghi789',
    branch: 'main',
    status: 'failed',
    deployment_strategy: 'blue-green',
    triggered_by: 'ci@candlefish.ai',
    started_at: '2024-01-15T09:30:00Z',
    completed_at: '2024-01-15T09:35:15Z',
    duration_seconds: 315,
    error_message: 'Build failed: Missing environment variables'
  }
];

const mockEnvironments = [
  { id: 'env-1', name: 'production', description: 'Production environment' },
  { id: 'env-2', name: 'staging', description: 'Staging environment' },
  { id: 'env-3', name: 'preview', description: 'Preview environment' }
];

const mockUser = {
  id: 'user-123',
  email: 'test@candlefish.ai',
  role: 'admin',
  permissions: ['deployments:create', 'deployments:read', 'deployments:rollback']
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider initialUser={mockUser}>
        <WebSocketProvider>
          <DeploymentProvider>
            {children}
          </DeploymentProvider>
        </WebSocketProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe('DeploymentDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default API mocks
    mockDeploymentApi.listDeployments.mockResolvedValue({
      deployments: mockDeployments,
      pagination: { limit: 20, offset: 0, total: 3, has_more: false }
    });

    mockDeploymentApi.listEnvironments.mockResolvedValue({
      environments: mockEnvironments
    });

    mockDeploymentApi.getSiteHealth.mockResolvedValue({
      sites: [
        {
          site_name: 'docs',
          environment: 'production',
          status: 'healthy',
          last_check: '2024-01-15T10:15:00Z',
          response_time_ms: 150,
          uptime_percentage: 99.9,
          current_deployment: {
            id: 'deploy-1',
            commit_sha: 'abc123',
            deployed_at: '2024-01-15T10:05:30Z'
          }
        },
        {
          site_name: 'partners',
          environment: 'staging',
          status: 'degraded',
          last_check: '2024-01-15T10:15:00Z',
          response_time_ms: 850,
          uptime_percentage: 95.5
        },
        {
          site_name: 'api',
          environment: 'production',
          status: 'unhealthy',
          last_check: '2024-01-15T10:15:00Z',
          response_time_ms: 0,
          uptime_percentage: 88.2
        }
      ]
    });
  });

  it('renders deployment dashboard with all main sections', async () => {
    render(
      <TestWrapper>
        <DeploymentDashboard />
      </TestWrapper>
    );

    // Check main dashboard sections
    expect(screen.getByRole('heading', { name: /deployment dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new deployment/i })).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Recent Deployments')).toBeInTheDocument();
    });

    expect(screen.getByText('Health Status')).toBeInTheDocument();
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
  });

  it('displays recent deployments with correct status indicators', async () => {
    render(
      <TestWrapper>
        <DeploymentDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('docs')).toBeInTheDocument();
    });

    // Check deployment cards
    const docsDeployment = screen.getByTestId('deployment-deploy-1');
    expect(within(docsDeployment).getByText('docs')).toBeInTheDocument();
    expect(within(docsDeployment).getByText('production')).toBeInTheDocument();
    expect(within(docsDeployment).getByText('success')).toBeInTheDocument();
    expect(within(docsDeployment).getByText('5m 30s')).toBeInTheDocument(); // Duration

    const partnersDeployment = screen.getByTestId('deployment-deploy-2');
    expect(within(partnersDeployment).getByText('building')).toBeInTheDocument();
    expect(within(partnersDeployment).getByRole('progressbar')).toBeInTheDocument(); // Building indicator

    const apiDeployment = screen.getByTestId('deployment-deploy-3');
    expect(within(apiDeployment).getByText('failed')).toBeInTheDocument();
    expect(within(apiDeployment).getByText('Build failed')).toBeInTheDocument();
  });

  it('shows health status grid with correct indicators', async () => {
    render(
      <TestWrapper>
        <DeploymentDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Health Status')).toBeInTheDocument();
    });

    // Check health indicators
    const docsHealth = screen.getByTestId('health-docs-production');
    expect(within(docsHealth).getByText('healthy')).toBeInTheDocument();
    expect(within(docsHealth).getByText('150ms')).toBeInTheDocument(); // Response time

    const partnersHealth = screen.getByTestId('health-partners-staging');
    expect(within(partnersHealth).getByText('degraded')).toBeInTheDocument();
    expect(within(partnersHealth).getByText('850ms')).toBeInTheDocument();

    const apiHealth = screen.getByTestId('health-api-production');
    expect(within(apiHealth).getByText('unhealthy')).toBeInTheDocument();
    expect(within(apiHealth).getByText('88.2%')).toBeInTheDocument(); // Uptime
  });

  it('opens new deployment dialog when create button clicked', async () => {
    render(
      <TestWrapper>
        <DeploymentDashboard />
      </TestWrapper>
    );

    const createButton = screen.getByRole('button', { name: /new deployment/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Create New Deployment')).toBeInTheDocument();
    });

    // Check form fields
    expect(screen.getByLabelText(/site name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/environment/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/branch/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/deployment strategy/i)).toBeInTheDocument();
  });

  it('creates new deployment with form data', async () => {
    const mockCreateDeployment = mockDeploymentApi.createDeployment.mockResolvedValue({
      id: 'deploy-new',
      site_name: 'docs',
      environment: 'staging',
      status: 'pending'
    });

    render(
      <TestWrapper>
        <DeploymentDashboard />
      </TestWrapper>
    );

    // Open deployment dialog
    fireEvent.click(screen.getByRole('button', { name: /new deployment/i }));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Fill out form
    fireEvent.change(screen.getByLabelText(/site name/i), { target: { value: 'docs' } });
    fireEvent.change(screen.getByLabelText(/environment/i), { target: { value: 'staging' } });
    fireEvent.change(screen.getByLabelText(/branch/i), { target: { value: 'feature/test' } });
    fireEvent.change(screen.getByLabelText(/changelog/i), { target: { value: 'Test deployment' } });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /deploy/i }));

    await waitFor(() => {
      expect(mockCreateDeployment).toHaveBeenCalledWith({
        site_name: 'docs',
        environment: 'staging',
        branch: 'feature/test',
        changelog: 'Test deployment',
        deployment_strategy: 'blue-green' // Default
      });
    });

    // Dialog should close
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('filters deployments by environment', async () => {
    render(
      <TestWrapper>
        <DeploymentDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('docs')).toBeInTheDocument();
    });

    // Apply production filter
    const environmentFilter = screen.getByLabelText(/filter by environment/i);
    fireEvent.change(environmentFilter, { target: { value: 'production' } });

    await waitFor(() => {
      expect(mockDeploymentApi.listDeployments).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.objectContaining({ environment: 'production' })
        })
      );
    });
  });

  it('handles rollback action from deployment card', async () => {
    const mockRollback = mockDeploymentApi.initiateRollback.mockResolvedValue({
      id: 'rollback-123',
      status: 'pending'
    });

    render(
      <TestWrapper>
        <DeploymentDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('deployment-deploy-1')).toBeInTheDocument();
    });

    // Click rollback button on successful deployment
    const rollbackButton = within(screen.getByTestId('deployment-deploy-1'))
      .getByRole('button', { name: /rollback/i });
    fireEvent.click(rollbackButton);

    // Confirm rollback
    await waitFor(() => {
      expect(screen.getByText('Confirm Rollback')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /confirm rollback/i }));

    await waitFor(() => {
      expect(mockRollback).toHaveBeenCalledWith('deploy-1', expect.any(Object));
    });
  });

  it('updates deployment status via WebSocket', async () => {
    render(
      <TestWrapper>
        <DeploymentDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('deployment-deploy-2')).toBeInTheDocument();
    });

    // Initially shows building status
    expect(within(screen.getByTestId('deployment-deploy-2')).getByText('building')).toBeInTheDocument();

    // Simulate WebSocket message for deployment completion
    const wsMessageHandler = mockWebSocket.addEventListener.mock.calls
      .find(call => call[0] === 'message')?.[1];

    if (wsMessageHandler) {
      wsMessageHandler({
        data: JSON.stringify({
          type: 'deployment.status_changed',
          payload: {
            deployment_id: 'deploy-2',
            status: 'success',
            completed_at: '2024-01-15T10:15:00Z',
            live_url: 'https://partners-staging.candlefish.ai'
          }
        })
      });
    }

    await waitFor(() => {
      expect(within(screen.getByTestId('deployment-deploy-2')).getByText('success')).toBeInTheDocument();
    });
  });

  it('shows error message for failed API calls', async () => {
    mockDeploymentApi.listDeployments.mockRejectedValue(new Error('API Error'));

    render(
      <TestWrapper>
        <DeploymentDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/error loading deployments/i)).toBeInTheDocument();
    });

    // Should show retry button
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('handles empty deployment list', async () => {
    mockDeploymentApi.listDeployments.mockResolvedValue({
      deployments: [],
      pagination: { limit: 20, offset: 0, total: 0, has_more: false }
    });

    render(
      <TestWrapper>
        <DeploymentDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/no deployments found/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/create your first deployment/i)).toBeInTheDocument();
  });

  it('shows loading states correctly', async () => {
    // Delay the API response
    mockDeploymentApi.listDeployments.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({
        deployments: mockDeployments,
        pagination: { limit: 20, offset: 0, total: 3, has_more: false }
      }), 100))
    );

    render(
      <TestWrapper>
        <DeploymentDashboard />
      </TestWrapper>
    );

    // Should show loading skeleton
    expect(screen.getByTestId('deployments-skeleton')).toBeInTheDocument();
    expect(screen.getByTestId('health-skeleton')).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByTestId('deployments-skeleton')).not.toBeInTheDocument();
    });
  });

  it('handles pagination correctly', async () => {
    mockDeploymentApi.listDeployments.mockResolvedValue({
      deployments: mockDeployments.slice(0, 2),
      pagination: { limit: 2, offset: 0, total: 3, has_more: true }
    });

    render(
      <TestWrapper>
        <DeploymentDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Showing 1-2 of 3')).toBeInTheDocument();
    });

    const nextButton = screen.getByRole('button', { name: /next page/i });
    expect(nextButton).toBeEnabled();

    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(mockDeploymentApi.listDeployments).toHaveBeenCalledWith(
        expect.objectContaining({
          pagination: { limit: 2, offset: 2 }
        })
      );
    });
  });
});
