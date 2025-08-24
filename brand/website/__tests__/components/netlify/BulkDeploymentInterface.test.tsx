// Comprehensive tests for BulkDeploymentInterface component

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BulkDeploymentInterface } from '../../../components/netlify/BulkDeploymentInterface';
import {
  mockCandlefishSites,
  mockExtensionsByCategory,
  createBulkOperationData,
  assertionHelpers
} from '../../factories/netlify-factory';

// Mock the API client
jest.mock('../../../lib/netlify-api', () => ({
  netlifyApi: {
    batchToggleExtensions: jest.fn(),
    getSites: jest.fn(),
    getExtensions: jest.fn()
  }
}));

import { netlifyApi } from '../../../lib/netlify-api';

const mockNetlifyApi = netlifyApi as jest.Mocked<typeof netlifyApi>;

// Mock the WebSocket provider
const MockWebSocketProvider = ({ children }: { children: React.ReactNode }) => (
  <div data-testid="websocket-provider">{children}</div>
);

jest.mock('../../../components/netlify/WebSocketProvider', () => ({
  WebSocketProvider: MockWebSocketProvider,
  useWebSocket: () => ({
    connected: true,
    send: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn()
  })
}));

describe('BulkDeploymentInterface', () => {
  const mockProps = {
    sites: mockCandlefishSites.slice(0, 3),
    extensions: Object.values(mockExtensionsByCategory).flat().slice(0, 6),
    onDeploymentStart: jest.fn(),
    onDeploymentComplete: jest.fn(),
    onProgress: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockNetlifyApi.getSites.mockResolvedValue(mockProps.sites);
    mockNetlifyApi.getExtensions.mockResolvedValue(mockProps.extensions);
    mockNetlifyApi.batchToggleExtensions.mockResolvedValue({
      success: 3,
      failed: 0,
      errors: []
    });
  });

  describe('Rendering', () => {
    it('should render bulk deployment interface', () => {
      render(<BulkDeploymentInterface {...mockProps} />);

      expect(screen.getByText('Bulk Deployment')).toBeInTheDocument();
      expect(screen.getByText('Deploy extensions across multiple sites')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Execute Deployment' })).toBeInTheDocument();
    });

    it('should render site selection grid', () => {
      render(<BulkDeploymentInterface {...mockProps} />);

      mockProps.sites.forEach(site => {
        expect(screen.getByText(site.name)).toBeInTheDocument();
        expect(screen.getByText(site.url)).toBeInTheDocument();
      });
    });

    it('should render extension selection grid', () => {
      render(<BulkDeploymentInterface {...mockProps} />);

      mockProps.extensions.forEach(extension => {
        expect(screen.getByText(extension.name)).toBeInTheDocument();
        expect(screen.getByText(extension.category)).toBeInTheDocument();
      });
    });

    it('should show loading state during initialization', () => {
      render(<BulkDeploymentInterface {...mockProps} sites={[]} extensions={[]} />);

      expect(screen.getByTestId('bulk-deployment-loading')).toBeInTheDocument();
      expect(screen.getByText('Loading deployment interface...')).toBeInTheDocument();
    });
  });

  describe('Site Selection', () => {
    it('should select individual sites', async () => {
      const user = userEvent.setup();
      render(<BulkDeploymentInterface {...mockProps} />);

      const siteCheckbox = screen.getByTestId(`site-checkbox-${mockProps.sites[0].id}`);
      await user.click(siteCheckbox);

      expect(siteCheckbox).toBeChecked();
      expect(screen.getByText('1 site selected')).toBeInTheDocument();
    });

    it('should select all sites', async () => {
      const user = userEvent.setup();
      render(<BulkDeploymentInterface {...mockProps} />);

      const selectAllButton = screen.getByRole('button', { name: 'Select All Sites' });
      await user.click(selectAllButton);

      mockProps.sites.forEach(site => {
        const checkbox = screen.getByTestId(`site-checkbox-${site.id}`);
        expect(checkbox).toBeChecked();
      });

      expect(screen.getByText(`${mockProps.sites.length} sites selected`)).toBeInTheDocument();
    });

    it('should deselect all sites', async () => {
      const user = userEvent.setup();
      render(<BulkDeploymentInterface {...mockProps} />);

      // First select all
      const selectAllButton = screen.getByRole('button', { name: 'Select All Sites' });
      await user.click(selectAllButton);

      // Then deselect all
      const deselectAllButton = screen.getByRole('button', { name: 'Deselect All Sites' });
      await user.click(deselectAllButton);

      mockProps.sites.forEach(site => {
        const checkbox = screen.getByTestId(`site-checkbox-${site.id}`);
        expect(checkbox).not.toBeChecked();
      });

      expect(screen.getByText('0 sites selected')).toBeInTheDocument();
    });

    it('should filter sites by status', async () => {
      const user = userEvent.setup();
      render(<BulkDeploymentInterface {...mockProps} />);

      const statusFilter = screen.getByLabelText('Filter by status');
      await user.selectOptions(statusFilter, 'active');

      await waitFor(() => {
        const visibleSites = screen.getAllByTestId(/^site-card-/);
        visibleSites.forEach(siteCard => {
          const statusBadge = within(siteCard).getByTestId('site-status');
          expect(statusBadge).toHaveTextContent('active');
        });
      });
    });

    it('should search sites by name', async () => {
      const user = userEvent.setup();
      render(<BulkDeploymentInterface {...mockProps} />);

      const searchInput = screen.getByPlaceholderText('Search sites...');
      await user.type(searchInput, 'Candlefish');

      await waitFor(() => {
        const visibleSites = screen.getAllByTestId(/^site-card-/);
        visibleSites.forEach(siteCard => {
          const siteName = within(siteCard).getByRole('heading', { level: 3 });
          expect(siteName.textContent).toMatch(/Candlefish/i);
        });
      });
    });
  });

  describe('Extension Selection', () => {
    it('should select individual extensions', async () => {
      const user = userEvent.setup();
      render(<BulkDeploymentInterface {...mockProps} />);

      const extensionCheckbox = screen.getByTestId(`extension-checkbox-${mockProps.extensions[0].id}`);
      await user.click(extensionCheckbox);

      expect(extensionCheckbox).toBeChecked();
      expect(screen.getByText('1 extension selected')).toBeInTheDocument();
    });

    it('should select extensions by category', async () => {
      const user = userEvent.setup();
      render(<BulkDeploymentInterface {...mockProps} />);

      const categoryButton = screen.getByRole('button', { name: 'Select All Performance' });
      await user.click(categoryButton);

      const performanceExtensions = mockProps.extensions.filter(ext => ext.category === 'performance');
      performanceExtensions.forEach(extension => {
        const checkbox = screen.getByTestId(`extension-checkbox-${extension.id}`);
        expect(checkbox).toBeChecked();
      });
    });

    it('should filter extensions by category', async () => {
      const user = userEvent.setup();
      render(<BulkDeploymentInterface {...mockProps} />);

      const categoryFilter = screen.getByLabelText('Filter by category');
      await user.selectOptions(categoryFilter, 'security');

      await waitFor(() => {
        const visibleExtensions = screen.getAllByTestId(/^extension-card-/);
        visibleExtensions.forEach(extensionCard => {
          const categoryBadge = within(extensionCard).getByTestId('extension-category');
          expect(categoryBadge).toHaveTextContent('security');
        });
      });
    });

    it('should show extension impact information', () => {
      render(<BulkDeploymentInterface {...mockProps} />);

      mockProps.extensions.forEach(extension => {
        const extensionCard = screen.getByTestId(`extension-card-${extension.id}`);
        const impactBadge = within(extensionCard).getByTestId('performance-impact');
        expect(impactBadge).toHaveTextContent(extension.performance.impact);
      });
    });
  });

  describe('Operation Configuration', () => {
    it('should set operation action (enable/disable)', async () => {
      const user = userEvent.setup();
      render(<BulkDeploymentInterface {...mockProps} />);

      const actionSelect = screen.getByLabelText('Action');
      await user.selectOptions(actionSelect, 'disable');

      expect((actionSelect as HTMLSelectElement).value).toBe('disable');
    });

    it('should configure deployment strategy', async () => {
      const user = userEvent.setup();
      render(<BulkDeploymentInterface {...mockProps} />);

      const strategySelect = screen.getByLabelText('Deployment Strategy');
      await user.selectOptions(strategySelect, 'sequential');

      expect((strategySelect as HTMLSelectElement).value).toBe('sequential');
    });

    it('should set batch size', async () => {
      const user = userEvent.setup();
      render(<BulkDeploymentInterface {...mockProps} />);

      const batchSizeInput = screen.getByLabelText('Batch Size');
      await user.clear(batchSizeInput);
      await user.type(batchSizeInput, '5');

      expect((batchSizeInput as HTMLInputElement).value).toBe('5');
    });

    it('should validate batch size limits', async () => {
      const user = userEvent.setup();
      render(<BulkDeploymentInterface {...mockProps} />);

      const batchSizeInput = screen.getByLabelText('Batch Size');
      await user.clear(batchSizeInput);
      await user.type(batchSizeInput, '50');

      await waitFor(() => {
        expect(screen.getByText(/Batch size cannot exceed 20/)).toBeInTheDocument();
      });
    });

    it('should configure rollback options', async () => {
      const user = userEvent.setup();
      render(<BulkDeploymentInterface {...mockProps} />);

      const rollbackCheckbox = screen.getByLabelText('Enable automatic rollback on failure');
      await user.click(rollbackCheckbox);

      expect(rollbackCheckbox).toBeChecked();
    });
  });

  describe('Preview and Validation', () => {
    it('should show deployment preview', async () => {
      const user = userEvent.setup();
      render(<BulkDeploymentInterface {...mockProps} />);

      // Select sites and extensions
      const siteCheckbox = screen.getByTestId(`site-checkbox-${mockProps.sites[0].id}`);
      const extensionCheckbox = screen.getByTestId(`extension-checkbox-${mockProps.extensions[0].id}`);

      await user.click(siteCheckbox);
      await user.click(extensionCheckbox);

      // Open preview
      const previewButton = screen.getByRole('button', { name: 'Preview Deployment' });
      await user.click(previewButton);

      await waitFor(() => {
        expect(screen.getByTestId('deployment-preview')).toBeInTheDocument();
        expect(screen.getByText('1 operation(s) will be executed')).toBeInTheDocument();
        expect(screen.getByText(`${mockProps.sites[0].name} → ${mockProps.extensions[0].name}`)).toBeInTheDocument();
      });
    });

    it('should validate selections before deployment', async () => {
      const user = userEvent.setup();
      render(<BulkDeploymentInterface {...mockProps} />);

      // Try to deploy without selections
      const deployButton = screen.getByRole('button', { name: 'Execute Deployment' });
      await user.click(deployButton);

      await waitFor(() => {
        expect(screen.getByText('Please select at least one site and one extension')).toBeInTheDocument();
      });
    });

    it('should show estimated deployment time', async () => {
      const user = userEvent.setup();
      render(<BulkDeploymentInterface {...mockProps} />);

      // Select multiple sites and extensions
      const selectAllSitesButton = screen.getByRole('button', { name: 'Select All Sites' });
      const selectAllExtensionsButton = screen.getByRole('button', { name: 'Select All Extensions' });

      await user.click(selectAllSitesButton);
      await user.click(selectAllExtensionsButton);

      await waitFor(() => {
        expect(screen.getByTestId('estimated-time')).toBeInTheDocument();
        expect(screen.getByText(/Estimated time:/)).toBeInTheDocument();
      });
    });

    it('should warn about potential conflicts', async () => {
      const user = userEvent.setup();
      const conflictingExtensions = mockProps.extensions.map(ext => ({
        ...ext,
        isEnabled: true
      }));

      render(<BulkDeploymentInterface {...mockProps} extensions={conflictingExtensions} />);

      // Select sites and already-enabled extensions
      const siteCheckbox = screen.getByTestId(`site-checkbox-${mockProps.sites[0].id}`);
      const extensionCheckbox = screen.getByTestId(`extension-checkbox-${conflictingExtensions[0].id}`);

      await user.click(siteCheckbox);
      await user.click(extensionCheckbox);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/Some extensions are already enabled/)).toBeInTheDocument();
      });
    });
  });

  describe('Deployment Execution', () => {
    it('should execute deployment successfully', async () => {
      const user = userEvent.setup();
      render(<BulkDeploymentInterface {...mockProps} />);

      // Select sites and extensions
      const siteCheckbox = screen.getByTestId(`site-checkbox-${mockProps.sites[0].id}`);
      const extensionCheckbox = screen.getByTestId(`extension-checkbox-${mockProps.extensions[0].id}`);

      await user.click(siteCheckbox);
      await user.click(extensionCheckbox);

      // Execute deployment
      const deployButton = screen.getByRole('button', { name: 'Execute Deployment' });
      await user.click(deployButton);

      // Should show progress
      await waitFor(() => {
        expect(screen.getByTestId('deployment-progress')).toBeInTheDocument();
        expect(screen.getByText('Deployment in progress...')).toBeInTheDocument();
      });

      // Wait for completion
      await waitFor(() => {
        expect(mockProps.onDeploymentComplete).toHaveBeenCalledWith({
          success: 1,
          failed: 0,
          total: 1
        });
      });
    });

    it('should show real-time progress updates', async () => {
      const user = userEvent.setup();
      jest.useFakeTimers();

      // Mock API to resolve after delay
      mockNetlifyApi.batchToggleExtensions.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          success: 3,
          failed: 0,
          errors: []
        }), 2000))
      );

      render(<BulkDeploymentInterface {...mockProps} />);

      // Select and deploy
      const siteCheckbox = screen.getByTestId(`site-checkbox-${mockProps.sites[0].id}`);
      const extensionCheckbox = screen.getByTestId(`extension-checkbox-${mockProps.extensions[0].id}`);

      await user.click(siteCheckbox);
      await user.click(extensionCheckbox);

      const deployButton = screen.getByRole('button', { name: 'Execute Deployment' });
      await user.click(deployButton);

      // Should show progress bar
      expect(screen.getByRole('progressbar')).toBeInTheDocument();

      // Advance time and check progress updates
      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(mockProps.onProgress).toHaveBeenCalled();
      });

      jest.useRealTimers();
    });

    it('should handle deployment errors gracefully', async () => {
      const user = userEvent.setup();
      mockNetlifyApi.batchToggleExtensions.mockRejectedValue(
        new Error('Deployment failed')
      );

      render(<BulkDeploymentInterface {...mockProps} />);

      // Select and deploy
      const siteCheckbox = screen.getByTestId(`site-checkbox-${mockProps.sites[0].id}`);
      const extensionCheckbox = screen.getByTestId(`extension-checkbox-${mockProps.extensions[0].id}`);

      await user.click(siteCheckbox);
      await user.click(extensionCheckbox);

      const deployButton = screen.getByRole('button', { name: 'Execute Deployment' });
      await user.click(deployButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/Deployment failed/)).toBeInTheDocument();
      });
    });

    it('should handle partial deployment failures', async () => {
      const user = userEvent.setup();
      mockNetlifyApi.batchToggleExtensions.mockResolvedValue({
        success: 2,
        failed: 1,
        errors: [
          {
            operation: { siteId: 'site-1', extensionId: 'ext-1', action: 'enable' },
            error: 'Extension not found'
          }
        ]
      });

      render(<BulkDeploymentInterface {...mockProps} />);

      // Select and deploy
      const selectAllSitesButton = screen.getByRole('button', { name: 'Select All Sites' });
      const extensionCheckbox = screen.getByTestId(`extension-checkbox-${mockProps.extensions[0].id}`);

      await user.click(selectAllSitesButton);
      await user.click(extensionCheckbox);

      const deployButton = screen.getByRole('button', { name: 'Execute Deployment' });
      await user.click(deployButton);

      await waitFor(() => {
        expect(screen.getByTestId('deployment-summary')).toBeInTheDocument();
        expect(screen.getByText('2 succeeded, 1 failed')).toBeInTheDocument();
        expect(screen.getByText('Extension not found')).toBeInTheDocument();
      });
    });

    it('should support cancelling deployment', async () => {
      const user = userEvent.setup();
      jest.useFakeTimers();

      // Mock long-running deployment
      const mockAbortController = {
        abort: jest.fn(),
        signal: { aborted: false }
      };
      global.AbortController = jest.fn().mockImplementation(() => mockAbortController);

      render(<BulkDeploymentInterface {...mockProps} />);

      // Start deployment
      const siteCheckbox = screen.getByTestId(`site-checkbox-${mockProps.sites[0].id}`);
      const extensionCheckbox = screen.getByTestId(`extension-checkbox-${mockProps.extensions[0].id}`);

      await user.click(siteCheckbox);
      await user.click(extensionCheckbox);

      const deployButton = screen.getByRole('button', { name: 'Execute Deployment' });
      await user.click(deployButton);

      // Cancel deployment
      const cancelButton = screen.getByRole('button', { name: 'Cancel Deployment' });
      await user.click(cancelButton);

      expect(mockAbortController.abort).toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('Real-time Updates', () => {
    it('should receive WebSocket deployment updates', async () => {
      const mockWebSocketHook = require('../../../components/netlify/WebSocketProvider').useWebSocket;
      const mockSubscribe = jest.fn();
      mockWebSocketHook.mockReturnValue({
        connected: true,
        send: jest.fn(),
        subscribe: mockSubscribe,
        unsubscribe: jest.fn()
      });

      render(<BulkDeploymentInterface {...mockProps} />);

      expect(mockSubscribe).toHaveBeenCalledWith('deployment.progress', expect.any(Function));
      expect(mockSubscribe).toHaveBeenCalledWith('deployment.complete', expect.any(Function));
    });

    it('should update progress from WebSocket events', async () => {
      const mockWebSocketHook = require('../../../components/netlify/WebSocketProvider').useWebSocket;
      let progressCallback: Function;

      mockWebSocketHook.mockReturnValue({
        connected: true,
        send: jest.fn(),
        subscribe: jest.fn((event, callback) => {
          if (event === 'deployment.progress') {
            progressCallback = callback;
          }
        }),
        unsubscribe: jest.fn()
      });

      render(<BulkDeploymentInterface {...mockProps} />);

      // Simulate WebSocket progress update
      if (progressCallback) {
        progressCallback({
          deploymentId: 'test-deployment',
          progress: 50,
          currentOperation: 'Enabling cache-control on site-1'
        });
      }

      await waitFor(() => {
        expect(mockProps.onProgress).toHaveBeenCalledWith({
          progress: 50,
          message: 'Enabling cache-control on site-1'
        });
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and structure', () => {
      render(<BulkDeploymentInterface {...mockProps} />);

      expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Bulk Deployment Interface');
      expect(screen.getByRole('region', { name: 'Site Selection' })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Extension Selection' })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Deployment Configuration' })).toBeInTheDocument();
    });

    it('should announce deployment status to screen readers', async () => {
      const user = userEvent.setup();
      render(<BulkDeploymentInterface {...mockProps} />);

      const siteCheckbox = screen.getByTestId(`site-checkbox-${mockProps.sites[0].id}`);
      const extensionCheckbox = screen.getByTestId(`extension-checkbox-${mockProps.extensions[0].id}`);

      await user.click(siteCheckbox);
      await user.click(extensionCheckbox);

      const deployButton = screen.getByRole('button', { name: 'Execute Deployment' });
      await user.click(deployButton);

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent(/Deployment started/);
      });
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<BulkDeploymentInterface {...mockProps} />);

      const firstSiteCheckbox = screen.getByTestId(`site-checkbox-${mockProps.sites[0].id}`);
      firstSiteCheckbox.focus();

      // Should be able to check with Space
      await user.keyboard(' ');
      expect(firstSiteCheckbox).toBeChecked();

      // Should be able to navigate between elements with Tab
      await user.keyboard('{Tab}');
      expect(document.activeElement).not.toBe(firstSiteCheckbox);
    });
  });

  describe('Error Recovery', () => {
    it('should provide retry mechanism for failed operations', async () => {
      const user = userEvent.setup();
      mockNetlifyApi.batchToggleExtensions
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ success: 1, failed: 0, errors: [] });

      render(<BulkDeploymentInterface {...mockProps} />);

      // Select and deploy
      const siteCheckbox = screen.getByTestId(`site-checkbox-${mockProps.sites[0].id}`);
      const extensionCheckbox = screen.getByTestId(`extension-checkbox-${mockProps.extensions[0].id}`);

      await user.click(siteCheckbox);
      await user.click(extensionCheckbox);

      const deployButton = screen.getByRole('button', { name: 'Execute Deployment' });
      await user.click(deployButton);

      // Wait for error
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Retry Deployment' })).toBeInTheDocument();
      });

      // Retry
      const retryButton = screen.getByRole('button', { name: 'Retry Deployment' });
      await user.click(retryButton);

      await waitFor(() => {
        expect(mockProps.onDeploymentComplete).toHaveBeenCalledWith({
          success: 1,
          failed: 0,
          total: 1
        });
      });
    });

    it('should allow manual rollback of failed deployments', async () => {
      const user = userEvent.setup();
      mockNetlifyApi.batchToggleExtensions.mockResolvedValue({
        success: 1,
        failed: 2,
        errors: [
          { operation: { siteId: 'site-1', extensionId: 'ext-1', action: 'enable' }, error: 'Failed' },
          { operation: { siteId: 'site-2', extensionId: 'ext-1', action: 'enable' }, error: 'Failed' }
        ]
      });

      render(<BulkDeploymentInterface {...mockProps} />);

      // Select and deploy
      const selectAllSitesButton = screen.getByRole('button', { name: 'Select All Sites' });
      const extensionCheckbox = screen.getByTestId(`extension-checkbox-${mockProps.extensions[0].id}`);

      await user.click(selectAllSitesButton);
      await user.click(extensionCheckbox);

      const deployButton = screen.getByRole('button', { name: 'Execute Deployment' });
      await user.click(deployButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Rollback Changes' })).toBeInTheDocument();
      });

      const rollbackButton = screen.getByRole('button', { name: 'Rollback Changes' });
      await user.click(rollbackButton);

      // Should call API to reverse successful operations
      expect(mockNetlifyApi.batchToggleExtensions).toHaveBeenCalledTimes(2);
    });
  });
});
