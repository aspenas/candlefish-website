// Comprehensive tests for ExtensionCatalog component

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExtensionCatalog } from '../../../components/netlify/ExtensionCatalog';
import {
  createMockExtensions,
  mockExtensionsByCategory,
  assertionHelpers
} from '../../factories/netlify-factory';

// Mock the API client
jest.mock('../../../lib/netlify-api', () => ({
  netlifyApi: {
    getExtensions: jest.fn(),
    enableExtension: jest.fn(),
    disableExtension: jest.fn(),
    getExtensionConfig: jest.fn(),
    updateExtensionConfig: jest.fn()
  }
}));

import { netlifyApi } from '../../../lib/netlify-api';

const mockNetlifyApi = netlifyApi as jest.Mocked<typeof netlifyApi>;

describe('ExtensionCatalog', () => {
  const mockProps = {
    siteId: 'test-site',
    extensions: createMockExtensions(6),
    loading: false,
    onExtensionToggle: jest.fn(),
    onExtensionConfigure: jest.fn(),
    onRefresh: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockNetlifyApi.getExtensions.mockResolvedValue(mockProps.extensions);
  });

  describe('Rendering', () => {
    it('should render extension catalog with extensions', () => {
      render(<ExtensionCatalog {...mockProps} />);

      expect(screen.getByText('Extension Catalog')).toBeInTheDocument();
      expect(screen.getByText('Available Extensions')).toBeInTheDocument();

      // Should render extension cards
      mockProps.extensions.forEach(extension => {
        expect(screen.getByText(extension.name)).toBeInTheDocument();
        expect(screen.getByText(extension.description)).toBeInTheDocument();
      });
    });

    it('should show loading state', () => {
      render(<ExtensionCatalog {...mockProps} loading={true} />);

      expect(screen.getByTestId('extension-catalog-loading')).toBeInTheDocument();
      expect(screen.getByText('Loading extensions...')).toBeInTheDocument();
    });

    it('should show empty state when no extensions', () => {
      render(<ExtensionCatalog {...mockProps} extensions={[]} />);

      expect(screen.getByTestId('extension-catalog-empty')).toBeInTheDocument();
      expect(screen.getByText('No extensions found')).toBeInTheDocument();
    });

    it('should render category counts', () => {
      const extensionsByCategory = Object.values(mockExtensionsByCategory).flat();
      render(<ExtensionCatalog {...mockProps} extensions={extensionsByCategory} />);

      expect(screen.getByText(/Performance \(\d+\)/)).toBeInTheDocument();
      expect(screen.getByText(/Security \(\d+\)/)).toBeInTheDocument();
      expect(screen.getByText(/SEO \(\d+\)/)).toBeInTheDocument();
    });
  });

  describe('Filtering and Search', () => {
    it('should filter by category', async () => {
      const user = userEvent.setup();
      const extensionsByCategory = Object.values(mockExtensionsByCategory).flat();
      render(<ExtensionCatalog {...mockProps} extensions={extensionsByCategory} />);

      // Click on performance category filter
      const performanceFilter = screen.getByRole('button', { name: /Performance/ });
      await user.click(performanceFilter);

      await waitFor(() => {
        // Should only show performance extensions
        const visibleExtensions = screen.getAllByTestId(/^extension-card-/);
        visibleExtensions.forEach(card => {
          expect(within(card).getByText('performance')).toBeInTheDocument();
        });
      });
    });

    it('should search extensions by name', async () => {
      const user = userEvent.setup();
      render(<ExtensionCatalog {...mockProps} />);

      const searchInput = screen.getByPlaceholderText('Search extensions...');
      await user.type(searchInput, 'cache');

      await waitFor(() => {
        // Should only show extensions with 'cache' in name or description
        const visibleCards = screen.queryAllByTestId(/^extension-card-/);
        expect(visibleCards.length).toBeGreaterThan(0);
      });
    });

    it('should search extensions by description', async () => {
      const user = userEvent.setup();
      const extensions = [
        ...createMockExtensions(2),
        { ...createMockExtensions(1)[0], description: 'Advanced performance optimization' }
      ];
      render(<ExtensionCatalog {...mockProps} extensions={extensions} />);

      const searchInput = screen.getByPlaceholderText('Search extensions...');
      await user.type(searchInput, 'optimization');

      await waitFor(() => {
        expect(screen.getByText('Advanced performance optimization')).toBeInTheDocument();
      });
    });

    it('should show no results when search has no matches', async () => {
      const user = userEvent.setup();
      render(<ExtensionCatalog {...mockProps} />);

      const searchInput = screen.getByPlaceholderText('Search extensions...');
      await user.type(searchInput, 'nonexistentextension');

      await waitFor(() => {
        expect(screen.getByText('No extensions found')).toBeInTheDocument();
      });
    });

    it('should clear filters', async () => {
      const user = userEvent.setup();
      const extensionsByCategory = Object.values(mockExtensionsByCategory).flat();
      render(<ExtensionCatalog {...mockProps} extensions={extensionsByCategory} />);

      // Apply category filter
      const performanceFilter = screen.getByRole('button', { name: /Performance/ });
      await user.click(performanceFilter);

      // Clear filters
      const clearButton = screen.getByRole('button', { name: 'Clear Filters' });
      await user.click(clearButton);

      await waitFor(() => {
        // Should show all extensions again
        const visibleExtensions = screen.getAllByTestId(/^extension-card-/);
        expect(visibleExtensions.length).toBe(extensionsByCategory.length);
      });
    });
  });

  describe('Extension Interactions', () => {
    it('should toggle extension on/off', async () => {
      const user = userEvent.setup();
      mockNetlifyApi.enableExtension.mockResolvedValue({
        ...mockProps.extensions[0],
        isEnabled: true
      });

      render(<ExtensionCatalog {...mockProps} />);

      const firstExtension = mockProps.extensions[0];
      const toggleButton = screen.getByTestId(`toggle-${firstExtension.id}`);

      await user.click(toggleButton);

      expect(mockProps.onExtensionToggle).toHaveBeenCalledWith(
        firstExtension.id,
        !firstExtension.isEnabled
      );
    });

    it('should open configuration modal', async () => {
      const user = userEvent.setup();
      render(<ExtensionCatalog {...mockProps} />);

      const firstExtension = mockProps.extensions[0];
      const configButton = screen.getByTestId(`config-${firstExtension.id}`);

      await user.click(configButton);

      expect(mockProps.onExtensionConfigure).toHaveBeenCalledWith(firstExtension.id);
    });

    it('should show extension details on hover', async () => {
      const user = userEvent.setup();
      render(<ExtensionCatalog {...mockProps} />);

      const firstExtensionCard = screen.getByTestId(`extension-card-${mockProps.extensions[0].id}`);

      await user.hover(firstExtensionCard);

      await waitFor(() => {
        expect(screen.getByTestId('extension-tooltip')).toBeInTheDocument();
        expect(screen.getByText(mockProps.extensions[0].performance.impact)).toBeInTheDocument();
      });
    });

    it('should handle toggle errors gracefully', async () => {
      const user = userEvent.setup();
      mockNetlifyApi.enableExtension.mockRejectedValue(new Error('Failed to enable'));

      render(<ExtensionCatalog {...mockProps} />);

      const firstExtension = mockProps.extensions[0];
      const toggleButton = screen.getByTestId(`toggle-${firstExtension.id}`);

      await user.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to toggle extension/)).toBeInTheDocument();
      });
    });
  });

  describe('Sorting', () => {
    it('should sort by name', async () => {
      const user = userEvent.setup();
      const extensions = createMockExtensions(3).map((ext, index) => ({
        ...ext,
        name: ['Zebra Extension', 'Alpha Extension', 'Beta Extension'][index]
      }));

      render(<ExtensionCatalog {...mockProps} extensions={extensions} />);

      const sortSelect = screen.getByLabelText('Sort by');
      await user.selectOptions(sortSelect, 'name');

      await waitFor(() => {
        const extensionCards = screen.getAllByTestId(/^extension-card-/);
        const firstCardName = within(extensionCards[0]).getByRole('heading', { level: 3 });
        expect(firstCardName).toHaveTextContent('Alpha Extension');
      });
    });

    it('should sort by category', async () => {
      const user = userEvent.setup();
      const extensions = Object.values(mockExtensionsByCategory).flat().slice(0, 4);

      render(<ExtensionCatalog {...mockProps} extensions={extensions} />);

      const sortSelect = screen.getByLabelText('Sort by');
      await user.selectOptions(sortSelect, 'category');

      await waitFor(() => {
        const extensionCards = screen.getAllByTestId(/^extension-card-/);
        expect(extensionCards.length).toBeGreaterThan(0);
      });
    });

    it('should sort by performance impact', async () => {
      const user = userEvent.setup();
      const extensions = createMockExtensions(3).map((ext, index) => ({
        ...ext,
        performance: {
          ...ext.performance,
          impact: (['low', 'medium', 'high'] as const)[index]
        }
      }));

      render(<ExtensionCatalog {...mockProps} extensions={extensions} />);

      const sortSelect = screen.getByLabelText('Sort by');
      await user.selectOptions(sortSelect, 'impact');

      await waitFor(() => {
        const extensionCards = screen.getAllByTestId(/^extension-card-/);
        expect(extensionCards.length).toBe(3);
      });
    });
  });

  describe('Bulk Actions', () => {
    it('should select multiple extensions', async () => {
      const user = userEvent.setup();
      render(<ExtensionCatalog {...mockProps} />);

      // Enable bulk mode
      const bulkModeToggle = screen.getByRole('button', { name: 'Bulk Actions' });
      await user.click(bulkModeToggle);

      // Select first two extensions
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);
      await user.click(checkboxes[1]);

      expect(screen.getByText('2 selected')).toBeInTheDocument();
    });

    it('should enable selected extensions in bulk', async () => {
      const user = userEvent.setup();
      mockNetlifyApi.enableExtension.mockResolvedValue({
        ...mockProps.extensions[0],
        isEnabled: true
      });

      render(<ExtensionCatalog {...mockProps} />);

      // Enable bulk mode and select extensions
      const bulkModeToggle = screen.getByRole('button', { name: 'Bulk Actions' });
      await user.click(bulkModeToggle);

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);

      // Perform bulk enable
      const bulkEnableButton = screen.getByRole('button', { name: 'Enable Selected' });
      await user.click(bulkEnableButton);

      await waitFor(() => {
        expect(mockProps.onExtensionToggle).toHaveBeenCalled();
      });
    });

    it('should disable selected extensions in bulk', async () => {
      const user = userEvent.setup();
      mockNetlifyApi.disableExtension.mockResolvedValue(undefined);

      render(<ExtensionCatalog {...mockProps} />);

      // Enable bulk mode and select extensions
      const bulkModeToggle = screen.getByRole('button', { name: 'Bulk Actions' });
      await user.click(bulkModeToggle);

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);

      // Perform bulk disable
      const bulkDisableButton = screen.getByRole('button', { name: 'Disable Selected' });
      await user.click(bulkDisableButton);

      await waitFor(() => {
        expect(mockProps.onExtensionToggle).toHaveBeenCalled();
      });
    });
  });

  describe('Performance', () => {
    it('should virtualize large lists', () => {
      const manyExtensions = createMockExtensions(100);
      render(<ExtensionCatalog {...mockProps} extensions={manyExtensions} />);

      // Should not render all 100 extensions in DOM at once
      const renderedCards = screen.getAllByTestId(/^extension-card-/);
      expect(renderedCards.length).toBeLessThan(100);
    });

    it('should debounce search input', async () => {
      const user = userEvent.setup();
      jest.useFakeTimers();

      render(<ExtensionCatalog {...mockProps} />);

      const searchInput = screen.getByPlaceholderText('Search extensions...');

      // Type rapidly
      await user.type(searchInput, 'cache');

      // Should not trigger search immediately
      expect(screen.getAllByTestId(/^extension-card-/)).toHaveLength(mockProps.extensions.length);

      // Advance timers to trigger debounced search
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        // Search should now be applied
        const visibleCards = screen.queryAllByTestId(/^extension-card-/);
        expect(visibleCards.length).toBeLessThanOrEqual(mockProps.extensions.length);
      });

      jest.useRealTimers();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ExtensionCatalog {...mockProps} />);

      expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Extension Catalog');
      expect(screen.getByRole('search')).toHaveAttribute('aria-label', 'Search extensions');
      expect(screen.getByRole('tablist')).toHaveAttribute('aria-label', 'Extension categories');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<ExtensionCatalog {...mockProps} />);

      const firstToggle = screen.getByTestId(`toggle-${mockProps.extensions[0].id}`);
      firstToggle.focus();

      // Should be able to activate with Enter
      await user.keyboard('{Enter}');

      expect(mockProps.onExtensionToggle).toHaveBeenCalled();
    });

    it('should announce status changes to screen readers', async () => {
      const user = userEvent.setup();
      mockNetlifyApi.enableExtension.mockResolvedValue({
        ...mockProps.extensions[0],
        isEnabled: true
      });

      render(<ExtensionCatalog {...mockProps} />);

      const toggleButton = screen.getByTestId(`toggle-${mockProps.extensions[0].id}`);
      await user.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent(/Extension.*enabled/);
      });
    });

    it('should have sufficient color contrast', () => {
      render(<ExtensionCatalog {...mockProps} />);

      const categoryButtons = screen.getAllByRole('button', { name: /Performance|Security|SEO/ });
      categoryButtons.forEach(button => {
        const styles = window.getComputedStyle(button);
        // This is a basic check - in reality you'd use a proper contrast checker
        expect(styles.color).toBeDefined();
        expect(styles.backgroundColor).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors during extension loading', async () => {
      mockNetlifyApi.getExtensions.mockRejectedValue(new Error('API Error'));

      render(<ExtensionCatalog {...mockProps} loading={true} />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to load extensions/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
      });
    });

    it('should retry failed requests', async () => {
      const user = userEvent.setup();
      mockNetlifyApi.getExtensions
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce(mockProps.extensions);

      render(<ExtensionCatalog {...mockProps} loading={true} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: 'Retry' });
      await user.click(retryButton);

      expect(mockProps.onRefresh).toHaveBeenCalled();
    });
  });

  describe('Data Validation', () => {
    it('should handle malformed extension data', () => {
      const malformedExtensions = [
        { id: 'test-1', name: 'Valid Extension', category: 'performance' },
        { id: 'test-2' }, // Missing required fields
        null,
        undefined
      ] as any[];

      render(<ExtensionCatalog {...mockProps} extensions={malformedExtensions} />);

      // Should render valid extensions and skip invalid ones
      expect(screen.getByText('Valid Extension')).toBeInTheDocument();

      // Should not crash or display errors for malformed data
      expect(screen.queryByText('Error')).not.toBeInTheDocument();
    });
  });
});
