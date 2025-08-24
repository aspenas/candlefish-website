/**
 * Component tests for DeploymentHistory
 * Tests deployment history timeline and filtering
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeploymentHistory } from '../../../src/components/deployment/DeploymentHistory';
import { format } from 'date-fns';

const mockDeployments = [
  {
    id: 'deploy-1',
    site_name: 'docs',
    environment: 'production',
    commit_sha: 'abc123456789012345678901234567890abcdef',
    branch: 'main',
    status: 'success',
    deployment_strategy: 'blue-green',
    deployment_type: 'standard',
    triggered_by: 'alice@candlefish.ai',
    started_at: '2024-01-15T10:00:00Z',
    completed_at: '2024-01-15T10:05:30Z',
    duration_seconds: 330,
    live_url: 'https://docs.candlefish.ai',
    changelog: 'Updated API documentation and fixed typos',
    steps: [
      { step_name: 'build', status: 'success', duration_seconds: 180 },
      { step_name: 'deploy', status: 'success', duration_seconds: 120 },
      { step_name: 'health_check', status: 'success', duration_seconds: 30 }
    ]
  },
  {
    id: 'deploy-2',
    site_name: 'partners',
    environment: 'staging',
    commit_sha: 'def456789012345678901234567890abcdef12',
    branch: 'feature/new-dashboard',
    status: 'failed',
    deployment_strategy: 'rolling',
    deployment_type: 'standard',
    triggered_by: 'bob@candlefish.ai',
    started_at: '2024-01-15T09:30:00Z',
    completed_at: '2024-01-15T09:35:15Z',
    duration_seconds: 315,
    changelog: 'Implementing new partner dashboard UI',
    steps: [
      { step_name: 'build', status: 'success', duration_seconds: 200 },
      { step_name: 'deploy', status: 'failed', duration_seconds: 115, error_message: 'Connection timeout' }
    ]
  },
  {
    id: 'deploy-3',
    site_name: 'api',
    environment: 'production',
    commit_sha: 'ghi789012345678901234567890abcdef1234',
    branch: 'release/v2.1.0',
    status: 'success',
    deployment_strategy: 'blue-green',
    deployment_type: 'hotfix',
    triggered_by: 'ci-system',
    started_at: '2024-01-14T16:45:00Z',
    completed_at: '2024-01-14T16:52:45Z',
    duration_seconds: 465,
    live_url: 'https://api.candlefish.ai',
    changelog: 'Critical security patch for authentication',
    steps: [
      { step_name: 'build', status: 'success', duration_seconds: 240 },
      { step_name: 'deploy_blue', status: 'success', duration_seconds: 150 },
      { step_name: 'health_check', status: 'success', duration_seconds: 45 },
      { step_name: 'switch_traffic', status: 'success', duration_seconds: 30 }
    ]
  },
  {
    id: 'deploy-4',
    site_name: 'docs',
    environment: 'preview',
    commit_sha: 'jkl012345678901234567890abcdef123456',
    branch: 'feature/api-v3-docs',
    status: 'building',
    deployment_strategy: 'standard',
    deployment_type: 'preview',
    triggered_by: 'carol@candlefish.ai',
    started_at: '2024-01-15T11:00:00Z',
    duration_seconds: 120,
    preview_url: 'https://api-v3-docs--docs.candlefish.ai',
    changelog: 'Draft documentation for API v3'
  }
];

const defaultProps = {
  deployments: mockDeployments,
  loading: false,
  onFilter: jest.fn(),
  onLoadMore: jest.fn(),
  hasMore: false
};

describe('DeploymentHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders deployment history timeline', () => {
    render(<DeploymentHistory {...defaultProps} />);

    expect(screen.getByRole('heading', { name: /deployment history/i })).toBeInTheDocument();

    // Check all deployments are rendered
    expect(screen.getByText('docs')).toBeInTheDocument();
    expect(screen.getByText('partners')).toBeInTheDocument();
    expect(screen.getByText('api')).toBeInTheDocument();

    // Check timeline structure
    expect(screen.getByTestId('deployment-timeline')).toBeInTheDocument();
  });

  it('displays deployment cards with correct information', () => {
    render(<DeploymentHistory {...defaultProps} />);

    const firstDeployment = screen.getByTestId('deployment-card-deploy-1');

    expect(within(firstDeployment).getByText('docs')).toBeInTheDocument();
    expect(within(firstDeployment).getByText('production')).toBeInTheDocument();
    expect(within(firstDeployment).getByText('success')).toBeInTheDocument();
    expect(within(firstDeployment).getByText('5m 30s')).toBeInTheDocument(); // Duration
    expect(within(firstDeployment).getByText('abc1234')).toBeInTheDocument(); // Short SHA
    expect(within(firstDeployment).getByText('alice@candlefish.ai')).toBeInTheDocument();
  });

  it('shows different status indicators', () => {
    render(<DeploymentHistory {...defaultProps} />);

    // Success status
    const successCard = screen.getByTestId('deployment-card-deploy-1');
    expect(within(successCard).getByTestId('status-success')).toBeInTheDocument();

    // Failed status
    const failedCard = screen.getByTestId('deployment-card-deploy-2');
    expect(within(failedCard).getByTestId('status-failed')).toBeInTheDocument();

    // Building status
    const buildingCard = screen.getByTestId('deployment-card-deploy-4');
    expect(within(buildingCard).getByTestId('status-building')).toBeInTheDocument();
    expect(within(buildingCard).getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows deployment type badges', () => {
    render(<DeploymentHistory {...defaultProps} />);

    // Hotfix badge
    const hotfixCard = screen.getByTestId('deployment-card-deploy-3');
    expect(within(hotfixCard).getByText('hotfix')).toBeInTheDocument();

    // Preview badge
    const previewCard = screen.getByTestId('deployment-card-deploy-4');
    expect(within(previewCard).getByText('preview')).toBeInTheDocument();
  });

  it('expands deployment details when clicked', async () => {
    render(<DeploymentHistory {...defaultProps} />);

    const deploymentCard = screen.getByTestId('deployment-card-deploy-1');
    fireEvent.click(deploymentCard);

    await waitFor(() => {
      expect(screen.getByTestId('deployment-details-deploy-1')).toBeInTheDocument();
    });

    // Check expanded details
    expect(screen.getByText('Updated API documentation and fixed typos')).toBeInTheDocument();
    expect(screen.getByText('build')).toBeInTheDocument();
    expect(screen.getByText('deploy')).toBeInTheDocument();
    expect(screen.getByText('health_check')).toBeInTheDocument();

    // Check step durations
    expect(screen.getByText('3m 0s')).toBeInTheDocument(); // Build step
    expect(screen.getByText('2m 0s')).toBeInTheDocument(); // Deploy step
  });

  it('shows error details for failed deployments', async () => {
    render(<DeploymentHistory {...defaultProps} />);

    const failedCard = screen.getByTestId('deployment-card-deploy-2');
    fireEvent.click(failedCard);

    await waitFor(() => {
      expect(screen.getByText('Connection timeout')).toBeInTheDocument();
    });

    expect(screen.getByTestId('error-details')).toBeInTheDocument();
  });

  it('filters deployments by site', async () => {
    const onFilterMock = jest.fn();
    render(<DeploymentHistory {...defaultProps} onFilter={onFilterMock} />);

    const siteFilter = screen.getByLabelText(/filter by site/i);
    fireEvent.change(siteFilter, { target: { value: 'docs' } });

    expect(onFilterMock).toHaveBeenCalledWith({ site_name: 'docs' });
  });

  it('filters deployments by environment', async () => {
    const onFilterMock = jest.fn();
    render(<DeploymentHistory {...defaultProps} onFilter={onFilterMock} />);

    const environmentFilter = screen.getByLabelText(/filter by environment/i);
    fireEvent.change(environmentFilter, { target: { value: 'production' } });

    expect(onFilterMock).toHaveBeenCalledWith({ environment: 'production' });
  });

  it('filters deployments by status', async () => {
    const onFilterMock = jest.fn();
    render(<DeploymentHistory {...defaultProps} onFilter={onFilterMock} />);

    const statusFilter = screen.getByLabelText(/filter by status/i);
    fireEvent.change(statusFilter, { target: { value: 'failed' } });

    expect(onFilterMock).toHaveBeenCalledWith({ status: 'failed' });
  });

  it('filters deployments by date range', async () => {
    const user = userEvent.setup();
    const onFilterMock = jest.fn();
    render(<DeploymentHistory {...defaultProps} onFilter={onFilterMock} />);

    const startDateInput = screen.getByLabelText(/start date/i);
    const endDateInput = screen.getByLabelText(/end date/i);

    await user.type(startDateInput, '2024-01-14');
    await user.type(endDateInput, '2024-01-15');

    expect(onFilterMock).toHaveBeenCalledWith({
      start_date: '2024-01-14',
      end_date: '2024-01-15'
    });
  });

  it('clears all filters when clear button clicked', () => {
    const onFilterMock = jest.fn();
    render(<DeploymentHistory {...defaultProps} onFilter={onFilterMock} />);

    // Apply a filter first
    fireEvent.change(screen.getByLabelText(/filter by site/i), { target: { value: 'docs' } });

    // Clear filters
    fireEvent.click(screen.getByRole('button', { name: /clear filters/i }));

    expect(onFilterMock).toHaveBeenCalledWith({});
  });

  it('shows load more button when hasMore is true', () => {
    render(<DeploymentHistory {...defaultProps} hasMore={true} />);

    const loadMoreButton = screen.getByRole('button', { name: /load more/i });
    expect(loadMoreButton).toBeInTheDocument();

    fireEvent.click(loadMoreButton);
    expect(defaultProps.onLoadMore).toHaveBeenCalled();
  });

  it('shows loading skeleton when loading', () => {
    render(<DeploymentHistory {...defaultProps} loading={true} />);

    expect(screen.getByTestId('history-skeleton')).toBeInTheDocument();
    expect(screen.getAllByTestId('deployment-card-skeleton')).toHaveLength(5);
  });

  it('shows empty state when no deployments', () => {
    render(<DeploymentHistory {...defaultProps} deployments={[]} />);

    expect(screen.getByText(/no deployments found/i)).toBeInTheDocument();
    expect(screen.getByText(/try adjusting your filters/i)).toBeInTheDocument();
  });

  it('handles rollback action from deployment card', async () => {
    const onRollbackMock = jest.fn();
    render(<DeploymentHistory {...defaultProps} onRollback={onRollbackMock} />);

    const successCard = screen.getByTestId('deployment-card-deploy-1');

    // Open actions menu
    const actionsButton = within(successCard).getByRole('button', { name: /actions/i });
    fireEvent.click(actionsButton);

    // Click rollback option
    const rollbackOption = screen.getByRole('menuitem', { name: /rollback/i });
    fireEvent.click(rollbackOption);

    expect(onRollbackMock).toHaveBeenCalledWith('deploy-1');
  });

  it('copies deployment URL to clipboard', async () => {
    const mockClipboard = {
      writeText: jest.fn().mockResolvedValue(undefined)
    };
    Object.assign(navigator, { clipboard: mockClipboard });

    render(<DeploymentHistory {...defaultProps} />);

    const successCard = screen.getByTestId('deployment-card-deploy-1');

    // Click copy URL button
    const copyButton = within(successCard).getByRole('button', { name: /copy url/i });
    fireEvent.click(copyButton);

    expect(mockClipboard.writeText).toHaveBeenCalledWith('https://docs.candlefish.ai');

    // Should show success toast
    await waitFor(() => {
      expect(screen.getByText('URL copied to clipboard')).toBeInTheDocument();
    });
  });

  it('shows deployment logs link for failed deployments', () => {
    render(<DeploymentHistory {...defaultProps} />);

    const failedCard = screen.getByTestId('deployment-card-deploy-2');
    fireEvent.click(failedCard);

    const logsLink = screen.getByRole('link', { name: /view logs/i });
    expect(logsLink).toBeInTheDocument();
    expect(logsLink).toHaveAttribute('href', '/deployments/deploy-2/logs');
  });

  it('groups deployments by date', () => {
    render(<DeploymentHistory {...defaultProps} groupByDate={true} />);

    // Should show date headers
    expect(screen.getByText(format(new Date('2024-01-15'), 'MMMM d, yyyy'))).toBeInTheDocument();
    expect(screen.getByText(format(new Date('2024-01-14'), 'MMMM d, yyyy'))).toBeInTheDocument();
  });

  it('handles keyboard navigation through deployment cards', async () => {
    const user = userEvent.setup();
    render(<DeploymentHistory {...defaultProps} />);

    const firstCard = screen.getByTestId('deployment-card-deploy-1');

    // Focus first card
    firstCard.focus();
    expect(firstCard).toHaveFocus();

    // Navigate with arrow keys
    await user.keyboard('{ArrowDown}');
    expect(screen.getByTestId('deployment-card-deploy-2')).toHaveFocus();

    // Expand with Enter
    await user.keyboard('{Enter}');
    await waitFor(() => {
      expect(screen.getByTestId('deployment-details-deploy-2')).toBeInTheDocument();
    });
  });
});
