/**
 * Unit Tests for ServiceGrid Component
 * Tests service list display, filtering, sorting, and interactions
 */

import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ServiceGrid } from '../../../../components/dashboard/components/ServiceGrid';
import { ServiceFactory } from '../../../factories/systemAnalyzerFactory';
import '@testing-library/jest-dom';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Server: () => <div data-testid="server-icon" />,
  Activity: () => <div data-testid="activity-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  Filter: () => <div data-testid="filter-icon" />,
  Search: () => <div data-testid="search-icon" />,
  SortAsc: () => <div data-testid="sort-asc-icon" />,
  SortDesc: () => <div data-testid="sort-desc-icon" />,
}));

describe('ServiceGrid', () => {
  const mockServices = [
    ServiceFactory.createHealthy({
      id: 'service-1',
      name: 'api-gateway',
      displayName: 'API Gateway',
      environment: 'production',
      tags: ['api', 'gateway'],
      uptime: '5d 12h',
    }),
    ServiceFactory.createDegraded({
      id: 'service-2',
      name: 'user-service',
      displayName: 'User Service',
      environment: 'production',
      tags: ['api', 'users'],
      uptime: '2d 8h',
    }),
    ServiceFactory.createUnhealthy({
      id: 'service-3',
      name: 'notification-service',
      displayName: 'Notification Service',
      environment: 'staging',
      tags: ['notifications'],
      uptime: '0d 0h',
    }),
  ];

  const defaultProps = {
    services: mockServices,
    loading: false,
    onServiceClick: jest.fn(),
    onServiceAction: jest.fn(),
  };

  const renderServiceGrid = (props = {}) => {
    return render(
      <ServiceGrid {...defaultProps} {...props} />
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading skeleton when loading', () => {
      renderServiceGrid({ loading: true });

      expect(screen.getAllByTestId('service-skeleton')).toHaveLength(6); // Default skeleton count
      expect(screen.queryByTestId('service-card')).not.toBeInTheDocument();
    });

    it('should show custom loading message when provided', () => {
      renderServiceGrid({ loading: true, loadingMessage: 'Fetching services...' });

      expect(screen.getByText('Fetching services...')).toBeInTheDocument();
    });
  });

  describe('Service Display', () => {
    it('should render all services', () => {
      renderServiceGrid();

      expect(screen.getAllByTestId('service-card')).toHaveLength(3);
      expect(screen.getByText('API Gateway')).toBeInTheDocument();
      expect(screen.getByText('User Service')).toBeInTheDocument();
      expect(screen.getByText('Notification Service')).toBeInTheDocument();
    });

    it('should display service status badges correctly', () => {
      renderServiceGrid();

      const healthyBadge = screen.getByTestId('status-badge-service-1');
      const degradedBadge = screen.getByTestId('status-badge-service-2');
      const unhealthyBadge = screen.getByTestId('status-badge-service-3');

      expect(healthyBadge).toHaveTextContent('HEALTHY');
      expect(healthyBadge).toHaveClass('bg-green-500');

      expect(degradedBadge).toHaveTextContent('DEGRADED');
      expect(degradedBadge).toHaveClass('bg-yellow-500');

      expect(unhealthyBadge).toHaveTextContent('UNHEALTHY');
      expect(unhealthyBadge).toHaveClass('bg-red-500');
    });

    it('should display service metadata', () => {
      renderServiceGrid();

      // Check environment badges
      expect(screen.getAllByText('production')).toHaveLength(2);
      expect(screen.getByText('staging')).toBeInTheDocument();

      // Check uptime information
      expect(screen.getByText('5d 12h')).toBeInTheDocument();
      expect(screen.getByText('2d 8h')).toBeInTheDocument();
      expect(screen.getByText('0d 0h')).toBeInTheDocument();

      // Check tags
      expect(screen.getAllByText('api')).toHaveLength(2);
      expect(screen.getByText('gateway')).toBeInTheDocument();
      expect(screen.getByText('users')).toBeInTheDocument();
      expect(screen.getByText('notifications')).toBeInTheDocument();
    });

    it('should show empty state when no services provided', () => {
      renderServiceGrid({ services: [] });

      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByText(/no services found/i)).toBeInTheDocument();
      expect(screen.getByTestId('empty-state-icon')).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('should filter services by status', async () => {
      const user = userEvent.setup();
      renderServiceGrid();

      const statusFilter = screen.getByTestId('status-filter');
      await user.selectOptions(statusFilter, 'HEALTHY');

      expect(screen.getAllByTestId('service-card')).toHaveLength(1);
      expect(screen.getByText('API Gateway')).toBeInTheDocument();
      expect(screen.queryByText('User Service')).not.toBeInTheDocument();
    });

    it('should filter services by environment', async () => {
      const user = userEvent.setup();
      renderServiceGrid();

      const environmentFilter = screen.getByTestId('environment-filter');
      await user.selectOptions(environmentFilter, 'staging');

      expect(screen.getAllByTestId('service-card')).toHaveLength(1);
      expect(screen.getByText('Notification Service')).toBeInTheDocument();
      expect(screen.queryByText('API Gateway')).not.toBeInTheDocument();
    });

    it('should filter services by tags', async () => {
      const user = userEvent.setup();
      renderServiceGrid();

      const tagFilter = screen.getByTestId('tag-filter');
      await user.type(tagFilter, 'api');

      expect(screen.getAllByTestId('service-card')).toHaveLength(2);
      expect(screen.getByText('API Gateway')).toBeInTheDocument();
      expect(screen.getByText('User Service')).toBeInTheDocument();
      expect(screen.queryByText('Notification Service')).not.toBeInTheDocument();
    });

    it('should search services by name', async () => {
      const user = userEvent.setup();
      renderServiceGrid();

      const searchInput = screen.getByTestId('search-input');
      await user.type(searchInput, 'user');

      expect(screen.getAllByTestId('service-card')).toHaveLength(1);
      expect(screen.getByText('User Service')).toBeInTheDocument();
      expect(screen.queryByText('API Gateway')).not.toBeInTheDocument();
    });

    it('should clear filters when clear button clicked', async () => {
      const user = userEvent.setup();
      renderServiceGrid();

      // Apply a filter
      const statusFilter = screen.getByTestId('status-filter');
      await user.selectOptions(statusFilter, 'HEALTHY');

      expect(screen.getAllByTestId('service-card')).toHaveLength(1);

      // Clear filters
      const clearButton = screen.getByTestId('clear-filters');
      await user.click(clearButton);

      expect(screen.getAllByTestId('service-card')).toHaveLength(3);
    });

    it('should show filter count when filters are active', async () => {
      const user = userEvent.setup();
      renderServiceGrid();

      const statusFilter = screen.getByTestId('status-filter');
      await user.selectOptions(statusFilter, 'HEALTHY');

      expect(screen.getByTestId('active-filter-count')).toHaveTextContent('1 filter active');
    });
  });

  describe('Sorting', () => {
    it('should sort services by name ascending', async () => {
      const user = userEvent.setup();
      renderServiceGrid();

      const sortSelect = screen.getByTestId('sort-select');
      await user.selectOptions(sortSelect, 'name-asc');

      const serviceCards = screen.getAllByTestId('service-card');
      expect(within(serviceCards[0]).getByText('API Gateway')).toBeInTheDocument();
      expect(within(serviceCards[1]).getByText('Notification Service')).toBeInTheDocument();
      expect(within(serviceCards[2]).getByText('User Service')).toBeInTheDocument();
    });

    it('should sort services by name descending', async () => {
      const user = userEvent.setup();
      renderServiceGrid();

      const sortSelect = screen.getByTestId('sort-select');
      await user.selectOptions(sortSelect, 'name-desc');

      const serviceCards = screen.getAllByTestId('service-card');
      expect(within(serviceCards[0]).getByText('User Service')).toBeInTheDocument();
      expect(within(serviceCards[1]).getByText('Notification Service')).toBeInTheDocument();
      expect(within(serviceCards[2]).getByText('API Gateway')).toBeInTheDocument();
    });

    it('should sort services by status', async () => {
      const user = userEvent.setup();
      renderServiceGrid();

      const sortSelect = screen.getByTestId('sort-select');
      await user.selectOptions(sortSelect, 'status');

      const serviceCards = screen.getAllByTestId('service-card');
      // HEALTHY should come first, then DEGRADED, then UNHEALTHY
      expect(within(serviceCards[0]).getByText('API Gateway')).toBeInTheDocument();
      expect(within(serviceCards[1]).getByText('User Service')).toBeInTheDocument();
      expect(within(serviceCards[2]).getByText('Notification Service')).toBeInTheDocument();
    });

    it('should sort services by uptime', async () => {
      const user = userEvent.setup();
      renderServiceGrid();

      const sortSelect = screen.getByTestId('sort-select');
      await user.selectOptions(sortSelect, 'uptime-desc');

      const serviceCards = screen.getAllByTestId('service-card');
      // Longest uptime first
      expect(within(serviceCards[0]).getByText('5d 12h')).toBeInTheDocument();
      expect(within(serviceCards[1]).getByText('2d 8h')).toBeInTheDocument();
      expect(within(serviceCards[2]).getByText('0d 0h')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onServiceClick when service card is clicked', async () => {
      const user = userEvent.setup();
      const onServiceClick = jest.fn();
      renderServiceGrid({ onServiceClick });

      const serviceCard = screen.getByTestId('service-card-service-1');
      await user.click(serviceCard);

      expect(onServiceClick).toHaveBeenCalledWith(mockServices[0]);
    });

    it('should call onServiceAction when action button is clicked', async () => {
      const user = userEvent.setup();
      const onServiceAction = jest.fn();
      renderServiceGrid({ onServiceAction });

      const actionButton = screen.getByTestId('service-action-service-1');
      await user.click(actionButton);

      expect(onServiceAction).toHaveBeenCalledWith('restart', mockServices[0]);
    });

    it('should handle service card keyboard navigation', async () => {
      const user = userEvent.setup();
      const onServiceClick = jest.fn();
      renderServiceGrid({ onServiceClick });

      const serviceCard = screen.getByTestId('service-card-service-1');
      await user.tab(); // Focus on first card
      await user.keyboard('{Enter}');

      expect(onServiceClick).toHaveBeenCalledWith(mockServices[0]);
    });

    it('should show service actions menu on right click', async () => {
      const user = userEvent.setup();
      renderServiceGrid();

      const serviceCard = screen.getByTestId('service-card-service-1');
      await user.pointer({ keys: '[MouseRight]', target: serviceCard });

      expect(screen.getByTestId('service-context-menu')).toBeInTheDocument();
      expect(screen.getByText('View Details')).toBeInTheDocument();
      expect(screen.getByText('Restart Service')).toBeInTheDocument();
      expect(screen.getByText('View Logs')).toBeInTheDocument();
    });
  });

  describe('Layout Options', () => {
    it('should switch between grid and list view', async () => {
      const user = userEvent.setup();
      renderServiceGrid();

      // Default should be grid view
      expect(screen.getByTestId('service-grid')).toHaveClass('grid');

      // Switch to list view
      const listViewButton = screen.getByTestId('list-view-button');
      await user.click(listViewButton);

      expect(screen.getByTestId('service-grid')).toHaveClass('flex flex-col');
    });

    it('should adjust grid columns based on screen size', () => {
      // Mock window size
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768, // Tablet width
      });

      renderServiceGrid();

      const grid = screen.getByTestId('service-grid');
      expect(grid).toHaveClass('md:grid-cols-2');
    });

    it('should support compact view mode', async () => {
      const user = userEvent.setup();
      renderServiceGrid();

      const compactViewButton = screen.getByTestId('compact-view-button');
      await user.click(compactViewButton);

      const serviceCards = screen.getAllByTestId('service-card');
      serviceCards.forEach(card => {
        expect(card).toHaveClass('compact');
      });
    });
  });

  describe('Performance', () => {
    it('should virtualize long lists of services', () => {
      const manyServices = Array.from({ length: 1000 }, (_, i) =>
        ServiceFactory.createHealthy({ id: `service-${i}`, name: `Service ${i}` })
      );

      renderServiceGrid({ services: manyServices });

      // Should only render visible items
      const visibleCards = screen.getAllByTestId('service-card');
      expect(visibleCards.length).toBeLessThan(50); // Should be much less than 1000
    });

    it('should debounce search input', async () => {
      const user = userEvent.setup();
      renderServiceGrid();

      const searchInput = screen.getByTestId('search-input');
      
      // Type multiple characters quickly
      await user.type(searchInput, 'api', { delay: 50 });

      // Should debounce and only filter once after delay
      await waitFor(() => {
        expect(screen.getAllByTestId('service-card')).toHaveLength(2);
      }, { timeout: 1000 });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderServiceGrid();

      expect(screen.getByLabelText('Search services')).toBeInTheDocument();
      expect(screen.getByLabelText('Filter by status')).toBeInTheDocument();
      expect(screen.getByLabelText('Sort services')).toBeInTheDocument();
    });

    it('should support screen reader navigation', () => {
      renderServiceGrid();

      const serviceCards = screen.getAllByTestId('service-card');
      serviceCards.forEach((card, index) => {
        expect(card).toHaveAttribute('role', 'button');
        expect(card).toHaveAttribute('aria-label', expect.stringContaining(mockServices[index].displayName));
      });
    });

    it('should have proper focus management', async () => {
      const user = userEvent.setup();
      renderServiceGrid();

      // Should be able to tab through all interactive elements
      await user.tab(); // Search input
      expect(screen.getByTestId('search-input')).toHaveFocus();

      await user.tab(); // Status filter
      expect(screen.getByTestId('status-filter')).toHaveFocus();

      await user.tab(); // First service card
      expect(screen.getByTestId('service-card-service-1')).toHaveFocus();
    });
  });

  describe('Error Handling', () => {
    it('should handle services with missing data gracefully', () => {
      const incompleteService = {
        id: 'incomplete-service',
        name: 'incomplete',
        // Missing other required fields
      } as any;

      renderServiceGrid({ services: [incompleteService] });

      expect(screen.getByTestId('service-card')).toBeInTheDocument();
      expect(screen.getByText('incomplete')).toBeInTheDocument();
      expect(screen.getByText('Unknown')).toBeInTheDocument(); // For missing status
    });

    it('should handle click errors gracefully', async () => {
      const user = userEvent.setup();
      const onServiceClick = jest.fn().mockImplementation(() => {
        throw new Error('Click handler error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      renderServiceGrid({ onServiceClick });

      const serviceCard = screen.getByTestId('service-card-service-1');
      await user.click(serviceCard);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error handling service click'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Real-time Updates', () => {
    it('should update service status in real-time', () => {
      const { rerender } = renderServiceGrid();

      // Update service status
      const updatedServices = [
        { ...mockServices[0], status: 'DEGRADED' as const },
        ...mockServices.slice(1),
      ];

      rerender(<ServiceGrid {...defaultProps} services={updatedServices} />);

      const statusBadge = screen.getByTestId('status-badge-service-1');
      expect(statusBadge).toHaveTextContent('DEGRADED');
      expect(statusBadge).toHaveClass('bg-yellow-500');
    });

    it('should highlight recently updated services', () => {
      const recentlyUpdatedService = {
        ...mockServices[0],
        lastStatusChange: new Date(Date.now() - 5000), // 5 seconds ago
      };

      renderServiceGrid({ services: [recentlyUpdatedService, ...mockServices.slice(1)] });

      const serviceCard = screen.getByTestId('service-card-service-1');
      expect(serviceCard).toHaveClass('recently-updated');
    });
  });
});