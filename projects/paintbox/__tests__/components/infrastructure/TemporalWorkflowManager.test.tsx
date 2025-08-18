/**
 * Temporal Workflow Manager Component Test Suite
 * Tests for the TemporalWorkflowManager React component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TemporalWorkflowManager from '@/components/infrastructure/TemporalWorkflowManager';
import { useWorkflowStore } from '@/stores/useInfrastructureStore';
import { useWorkflowWebSocket } from '@/hooks/useInfrastructureWebSocket';
import { workflowComponentFactory } from '../../factories/componentFactory';

// Mock dependencies
jest.mock('@/stores/useInfrastructureStore');
jest.mock('@/hooks/useInfrastructureWebSocket');
jest.mock('@/lib/services/temporalService');

const mockUseWorkflowStore = useWorkflowStore as jest.MockedFunction<typeof useWorkflowStore>;
const mockUseWorkflowWebSocket = useWorkflowWebSocket as jest.MockedFunction<typeof useWorkflowWebSocket>;

// Test utilities
const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('TemporalWorkflowManager Component', () => {
  let mockWorkflowData: any;
  let mockWebSocketActions: any;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    mockWorkflowData = workflowComponentFactory.createWorkflowManagerData();
    mockWebSocketActions = {
      isConnected: true,
      subscribeToWorkflow: jest.fn(),
      unsubscribeFromWorkflow: jest.fn(),
      cancelWorkflow: jest.fn(),
    };

    mockUseWorkflowStore.mockReturnValue(mockWorkflowData);
    mockUseWorkflowWebSocket.mockReturnValue(mockWebSocketActions);

    jest.clearAllMocks();
  });

  describe('Workflow List Rendering', () => {
    it('should render active workflows', () => {
      // Act
      renderWithProviders(<TemporalWorkflowManager />);

      // Assert
      expect(screen.getByText('Temporal Workflow Manager')).toBeInTheDocument();
      expect(screen.getByTestId('active-workflows')).toBeInTheDocument();
      expect(screen.getByText('Agent Workflow #1')).toBeInTheDocument();
      expect(screen.getByText('Running')).toBeInTheDocument();
    });

    it('should display workflow execution details', () => {
      // Act
      renderWithProviders(<TemporalWorkflowManager />);

      // Assert
      const workflowCard = screen.getByTestId('workflow-agent-workflow-1');
      expect(within(workflowCard).getByText('Started 2 minutes ago')).toBeInTheDocument();
      expect(within(workflowCard).getByText('Progress: 60%')).toBeInTheDocument();
      expect(within(workflowCard).getByTestId('workflow-status-badge')).toHaveClass('bg-blue-100');
    });

    it('should show empty state when no workflows are running', () => {
      // Arrange
      const emptyData = workflowComponentFactory.createEmptyWorkflowData();
      mockUseWorkflowStore.mockReturnValue(emptyData);

      // Act
      renderWithProviders(<TemporalWorkflowManager />);

      // Assert
      expect(screen.getByText('No active workflows')).toBeInTheDocument();
      expect(screen.getByText('Start a new workflow to begin monitoring')).toBeInTheDocument();
      expect(screen.getByTestId('start-workflow-button')).toBeInTheDocument();
    });

    it('should display workflow history', async () => {
      // Arrange
      renderWithProviders(<TemporalWorkflowManager />);

      // Act
      const historyTab = screen.getByTestId('history-tab');
      await user.click(historyTab);

      // Assert
      expect(screen.getByTestId('workflow-history')).toBeInTheDocument();
      expect(screen.getByText('Completed Workflow #1')).toBeInTheDocument();
      expect(screen.getByText('Failed Workflow #2')).toBeInTheDocument();
    });

    it('should filter workflows by status', async () => {
      // Arrange
      renderWithProviders(<TemporalWorkflowManager />);

      // Act
      const statusFilter = screen.getByTestId('status-filter');
      await user.selectOptions(statusFilter, 'failed');

      // Assert
      expect(screen.queryByText('Agent Workflow #1')).not.toBeInTheDocument();
      expect(screen.getByText('No failed workflows found')).toBeInTheDocument();
    });

    it('should search workflows by name or ID', async () => {
      // Arrange
      renderWithProviders(<TemporalWorkflowManager />);

      // Act
      const searchInput = screen.getByTestId('workflow-search');
      await user.type(searchInput, 'Agent');

      // Assert
      expect(screen.getByText('Agent Workflow #1')).toBeInTheDocument();
      expect(mockWorkflowData.setFilters).toHaveBeenCalledWith({ search: 'Agent' });
    });
  });

  describe('Workflow Actions', () => {
    it('should start a new workflow', async () => {
      // Arrange
      renderWithProviders(<TemporalWorkflowManager />);

      // Act
      const startButton = screen.getByTestId('start-workflow-button');
      await user.click(startButton);

      const modal = screen.getByTestId('start-workflow-modal');
      const workflowTypeSelect = within(modal).getByTestId('workflow-type-select');
      const inputField = within(modal).getByTestId('workflow-input');
      const confirmButton = within(modal).getByTestId('confirm-start-button');

      await user.selectOptions(workflowTypeSelect, 'agent-workflow');
      await user.type(inputField, '{"prompt": "Test workflow"}');
      await user.click(confirmButton);

      // Assert
      expect(mockWorkflowData.addExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'agent-workflow',
          input: { prompt: 'Test workflow' },
          status: 'running'
        })
      );
    });

    it('should cancel a running workflow', async () => {
      // Arrange
      renderWithProviders(<TemporalWorkflowManager />);

      // Act
      const workflowCard = screen.getByTestId('workflow-agent-workflow-1');
      const cancelButton = within(workflowCard).getByTestId('cancel-workflow-button');
      await user.click(cancelButton);

      const confirmDialog = screen.getByTestId('confirm-cancel-dialog');
      const confirmButton = within(confirmDialog).getByTestId('confirm-cancel-button');
      await user.click(confirmButton);

      // Assert
      expect(mockWebSocketActions.cancelWorkflow).toHaveBeenCalledWith('agent-workflow-1');
    });

    it('should retry a failed workflow', async () => {
      // Arrange
      const dataWithFailedWorkflow = workflowComponentFactory.createWorkflowDataWithFailures();
      mockUseWorkflowStore.mockReturnValue(dataWithFailedWorkflow);
      renderWithProviders(<TemporalWorkflowManager />);

      // Act
      const failedWorkflowCard = screen.getByTestId('workflow-failed-workflow-1');
      const retryButton = within(failedWorkflowCard).getByTestId('retry-workflow-button');
      await user.click(retryButton);

      // Assert
      expect(mockWorkflowData.addExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'running',
          retryAttempt: 1
        })
      );
    });

    it('should subscribe to workflow updates', async () => {
      // Arrange
      renderWithProviders(<TemporalWorkflowManager />);

      // Act
      const workflowCard = screen.getByTestId('workflow-agent-workflow-1');
      const subscribeButton = within(workflowCard).getByTestId('subscribe-button');
      await user.click(subscribeButton);

      // Assert
      expect(mockWebSocketActions.subscribeToWorkflow).toHaveBeenCalledWith('agent-workflow-1');
    });

    it('should view workflow details', async () => {
      // Arrange
      renderWithProviders(<TemporalWorkflowManager />);

      // Act
      const workflowCard = screen.getByTestId('workflow-agent-workflow-1');
      const detailsButton = within(workflowCard).getByTestId('view-details-button');
      await user.click(detailsButton);

      // Assert
      expect(screen.getByTestId('workflow-details-modal')).toBeInTheDocument();
      expect(screen.getByText('Workflow Execution Details')).toBeInTheDocument();
      expect(screen.getByText('Execution History')).toBeInTheDocument();
      expect(screen.getByText('Activity Timeline')).toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    it('should display WebSocket connection status', () => {
      // Act
      renderWithProviders(<TemporalWorkflowManager />);

      // Assert
      expect(screen.getByTestId('websocket-status')).toBeInTheDocument();
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    it('should show disconnected state', () => {
      // Arrange
      mockWebSocketActions.isConnected = false;
      mockUseWorkflowWebSocket.mockReturnValue(mockWebSocketActions);

      // Act
      renderWithProviders(<TemporalWorkflowManager />);

      // Assert
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
      expect(screen.getByTestId('websocket-indicator')).toHaveClass('bg-red-500');
    });

    it('should update workflow progress in real-time', async () => {
      // Arrange
      const { rerender } = renderWithProviders(<TemporalWorkflowManager />);

      // Act - simulate workflow progress update
      const updatedData = workflowComponentFactory.createWorkflowDataWithProgress(80);
      mockUseWorkflowStore.mockReturnValue(updatedData);

      rerender(
        <QueryClientProvider client={createQueryClient()}>
          <TemporalWorkflowManager />
        </QueryClientProvider>
      );

      // Assert
      expect(screen.getByText('Progress: 80%')).toBeInTheDocument();
    });

    it('should handle workflow completion notifications', async () => {
      // Arrange
      const { rerender } = renderWithProviders(<TemporalWorkflowManager />);

      // Act - simulate workflow completion
      const completedData = workflowComponentFactory.createCompletedWorkflowData();
      mockUseWorkflowStore.mockReturnValue(completedData);

      rerender(
        <QueryClientProvider client={createQueryClient()}>
          <TemporalWorkflowManager />
        </QueryClientProvider>
      );

      // Assert
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByTestId('workflow-status-badge')).toHaveClass('bg-green-100');
    });
  });

  describe('Workflow Metrics and Analytics', () => {
    it('should display workflow execution metrics', () => {
      // Act
      renderWithProviders(<TemporalWorkflowManager />);

      // Assert
      expect(screen.getByTestId('workflow-metrics')).toBeInTheDocument();
      expect(screen.getByText('Total Executions: 25')).toBeInTheDocument();
      expect(screen.getByText('Success Rate: 92%')).toBeInTheDocument();
      expect(screen.getByText('Avg Duration: 2.5m')).toBeInTheDocument();
    });

    it('should show execution time chart', async () => {
      // Arrange
      renderWithProviders(<TemporalWorkflowManager />);

      // Act
      const metricsTab = screen.getByTestId('metrics-tab');
      await user.click(metricsTab);

      // Assert
      expect(screen.getByTestId('execution-time-chart')).toBeInTheDocument();
      expect(screen.getByText('Workflow Execution Times')).toBeInTheDocument();
    });

    it('should display error analysis', async () => {
      // Arrange
      renderWithProviders(<TemporalWorkflowManager />);

      // Act
      const errorsTab = screen.getByTestId('errors-tab');
      await user.click(errorsTab);

      // Assert
      expect(screen.getByTestId('error-analysis')).toBeInTheDocument();
      expect(screen.getByText('Common Failure Patterns')).toBeInTheDocument();
      expect(screen.getByText('Error Rate Trends')).toBeInTheDocument();
    });

    it('should export workflow metrics', async () => {
      // Arrange
      renderWithProviders(<TemporalWorkflowManager />);

      // Act
      const exportButton = screen.getByTestId('export-metrics-button');
      await user.click(exportButton);

      // Assert
      expect(mockWorkflowData.exportMetrics).toHaveBeenCalledWith({
        format: 'csv',
        dateRange: 'last-30-days'
      });
    });
  });

  describe('Workflow Configuration', () => {
    it('should manage workflow templates', async () => {
      // Arrange
      renderWithProviders(<TemporalWorkflowManager />);

      // Act
      const templatesTab = screen.getByTestId('templates-tab');
      await user.click(templatesTab);

      // Assert
      expect(screen.getByTestId('workflow-templates')).toBeInTheDocument();
      expect(screen.getByText('Agent Workflow Template')).toBeInTheDocument();
      expect(screen.getByText('Data Processing Template')).toBeInTheDocument();
    });

    it('should create new workflow template', async () => {
      // Arrange
      renderWithProviders(<TemporalWorkflowManager />);

      // Act
      const templatesTab = screen.getByTestId('templates-tab');
      await user.click(templatesTab);

      const createButton = screen.getByTestId('create-template-button');
      await user.click(createButton);

      const modal = screen.getByTestId('create-template-modal');
      const nameInput = within(modal).getByTestId('template-name-input');
      const configTextarea = within(modal).getByTestId('template-config-textarea');
      const saveButton = within(modal).getByTestId('save-template-button');

      await user.type(nameInput, 'New Template');
      await user.type(configTextarea, '{"type": "custom-workflow"}');
      await user.click(saveButton);

      // Assert
      expect(mockWorkflowData.createTemplate).toHaveBeenCalledWith({
        name: 'New Template',
        config: { type: 'custom-workflow' }
      });
    });

    it('should configure workflow schedules', async () => {
      // Arrange
      renderWithProviders(<TemporalWorkflowManager />);

      // Act
      const schedulesTab = screen.getByTestId('schedules-tab');
      await user.click(schedulesTab);

      const createScheduleButton = screen.getByTestId('create-schedule-button');
      await user.click(createScheduleButton);

      const modal = screen.getByTestId('create-schedule-modal');
      const cronInput = within(modal).getByTestId('cron-expression-input');
      const workflowSelect = within(modal).getByTestId('workflow-type-select');
      const saveButton = within(modal).getByTestId('save-schedule-button');

      await user.type(cronInput, '0 0 * * *');
      await user.selectOptions(workflowSelect, 'agent-workflow');
      await user.click(saveButton);

      // Assert
      expect(mockWorkflowData.createSchedule).toHaveBeenCalledWith({
        cronExpression: '0 0 * * *',
        workflowType: 'agent-workflow'
      });
    });
  });

  describe('Accessibility', () => {
    it('should support keyboard navigation', async () => {
      // Arrange
      renderWithProviders(<TemporalWorkflowManager />);

      // Act
      const startButton = screen.getByTestId('start-workflow-button');
      startButton.focus();
      await user.keyboard('{Enter}');

      // Assert
      expect(screen.getByTestId('start-workflow-modal')).toBeInTheDocument();
    });

    it('should have proper ARIA labels', () => {
      // Act
      renderWithProviders(<TemporalWorkflowManager />);

      // Assert
      expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Temporal workflow manager');
      expect(screen.getByTestId('workflow-list')).toHaveAttribute('role', 'list');
      expect(screen.getByTestId('workflow-agent-workflow-1')).toHaveAttribute('role', 'listitem');
    });

    it('should announce workflow status changes', async () => {
      // Arrange
      const { rerender } = renderWithProviders(<TemporalWorkflowManager />);

      // Act
      const completedData = workflowComponentFactory.createCompletedWorkflowData();
      mockUseWorkflowStore.mockReturnValue(completedData);

      rerender(
        <QueryClientProvider client={createQueryClient()}>
          <TemporalWorkflowManager />
        </QueryClientProvider>
      );

      // Assert
      expect(screen.getByTestId('status-announcement')).toHaveAttribute('aria-live', 'polite');
      expect(screen.getByTestId('status-announcement')).toHaveTextContent('Workflow agent-workflow-1 completed successfully');
    });
  });

  describe('Error Handling', () => {
    it('should handle workflow start errors', async () => {
      // Arrange
      mockWorkflowData.addExecution.mockRejectedValue(new Error('Failed to start workflow'));
      renderWithProviders(<TemporalWorkflowManager />);

      // Act
      const startButton = screen.getByTestId('start-workflow-button');
      await user.click(startButton);

      const modal = screen.getByTestId('start-workflow-modal');
      const confirmButton = within(modal).getByTestId('confirm-start-button');
      await user.click(confirmButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Failed to start workflow')).toBeInTheDocument();
      });
    });

    it('should handle WebSocket connection errors', () => {
      // Arrange
      mockWebSocketActions.isConnected = false;
      mockUseWorkflowWebSocket.mockReturnValue({
        ...mockWebSocketActions,
        error: 'Connection failed'
      });

      // Act
      renderWithProviders(<TemporalWorkflowManager />);

      // Assert
      expect(screen.getByText('Connection Error')).toBeInTheDocument();
      expect(screen.getByText('Failed to connect to workflow service')).toBeInTheDocument();
    });

    it('should display loading states', () => {
      // Arrange
      const loadingData = workflowComponentFactory.createLoadingWorkflowData();
      mockUseWorkflowStore.mockReturnValue(loadingData);

      // Act
      renderWithProviders(<TemporalWorkflowManager />);

      // Assert
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText('Loading workflows...')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should virtualize large workflow lists', () => {
      // Arrange
      const largeDataset = workflowComponentFactory.createLargeWorkflowDataset(1000);
      mockUseWorkflowStore.mockReturnValue(largeDataset);

      // Act
      renderWithProviders(<TemporalWorkflowManager />);

      // Assert
      expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      // Should only render visible items
      const workflowCards = screen.getAllByTestId(/^workflow-/);
      expect(workflowCards.length).toBeLessThan(100);
    });

    it('should paginate workflow history', async () => {
      // Arrange
      renderWithProviders(<TemporalWorkflowManager />);

      // Act
      const historyTab = screen.getByTestId('history-tab');
      await user.click(historyTab);

      const nextPageButton = screen.getByTestId('next-page-button');
      await user.click(nextPageButton);

      // Assert
      expect(mockWorkflowData.loadHistoryPage).toHaveBeenCalledWith(2);
    });
  });
});
