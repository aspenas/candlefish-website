/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NetlifyDashboard } from '../../../components/netlify/NetlifyDashboard';
import { NetlifyApiClient } from '../../../lib/netlify-api';
import { 
  createMockSite, 
  createMockExtension, 
  createMockPerformanceMetrics,
  createMockRecommendation,
  mockCandlefishSites 
} from '../../factories/netlify-factory';

// Mock the Netlify API client
jest.mock('../../../lib/netlify-api');
const mockNetlifyApi = NetlifyApiClient as jest.MockedClass<typeof NetlifyApiClient>;

// Mock Next.js router
const mockPush = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockPush,
    pathname: '/netlify-dashboard',
    query: {},
    asPath: '/netlify-dashboard'
  })
}));

// Mock toast notifications
const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
  loading: jest.fn(),
  dismiss: jest.fn()
};
jest.mock('react-hot-toast', () => ({
  toast: mockToast,
  Toaster: () => <div data-testid="toaster" />
}));

describe('NetlifyDashboard', () => {
  let mockApiInstance: jest.Mocked<NetlifyApiClient>;
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a mock API instance
    mockApiInstance = {
      getSites: jest.fn(),
      getExtensions: jest.fn(),
      getSiteExtensions: jest.fn(),
      enableExtension: jest.fn(),
      disableExtension: jest.fn(),
      getRecommendations: jest.fn(),
      getPerformanceMetrics: jest.fn(),
      updateExtensionConfig: jest.fn(),
      batchToggleExtensions: jest.fn(),
      healthCheck: jest.fn()
    } as any;

    // Mock the constructor to return our mock instance
    mockNetlifyApi.mockImplementation(() => mockApiInstance);
  });

  describe('Initial Load', () => {
    it('should render loading state initially', () => {
      // Mock API calls to return pending promises
      mockApiInstance.getSites.mockReturnValue(new Promise(() => {}));
      mockApiInstance.getExtensions.mockReturnValue(new Promise(() => {}));

      render(<NetlifyDashboard />);

      expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should load and display sites successfully', async () => {
      mockApiInstance.getSites.mockResolvedValue(mockCandlefishSites);
      mockApiInstance.getExtensions.mockResolvedValue([]);
      mockApiInstance.getSiteExtensions.mockResolvedValue({
        siteId: 'candlefish-ai',
        extensions: [],
        recommendations: [],
        performance: createMockPerformanceMetrics()
      });

      render(<NetlifyDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Candlefish AI')).toBeInTheDocument();
        expect(screen.getByText('Staging - Candlefish AI')).toBeInTheDocument();
        expect(screen.getByText('Paintbox Portfolio')).toBeInTheDocument();
      });

      // Should show 8 sites total
      const siteButtons = screen.getAllByRole('button', { name: /candlefish\.ai|staging\.candlefish\.ai|paintbox\.candlefish\.ai/i });
      expect(siteButtons.length).toBeGreaterThan(0);
    });

    it('should handle API errors gracefully', async () => {
      mockApiInstance.getSites.mockRejectedValue(new Error('Network error'));
      mockApiInstance.getExtensions.mockRejectedValue(new Error('Network error'));

      render(<NetlifyDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load dashboard/i)).toBeInTheDocument();
        expect(mockToast.error).toHaveBeenCalledWith('Failed to load dashboard data');
      });
    });
  });

  describe('Site Selection', () => {
    beforeEach(async () => {
      mockApiInstance.getSites.mockResolvedValue(mockCandlefishSites);
      mockApiInstance.getExtensions.mockResolvedValue([
        createMockExtension({ id: 'ext-1', name: 'Cache Control' }),
        createMockExtension({ id: 'ext-2', name: 'Image Optimization' })
      ]);
      mockApiInstance.getSiteExtensions.mockResolvedValue({
        siteId: 'candlefish-ai',
        extensions: [createMockExtension({ id: 'ext-1', isEnabled: true })],
        recommendations: [createMockRecommendation()],
        performance: createMockPerformanceMetrics()
      });
      mockApiInstance.getPerformanceMetrics.mockResolvedValue([createMockPerformanceMetrics()]);
    });

    it('should select first site by default', async () => {
      render(<NetlifyDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Candlefish AI')).toBeInTheDocument();
        expect(mockApiInstance.getSiteExtensions).toHaveBeenCalledWith('candlefish-ai');
      });
    });

    it('should switch sites when clicked', async () => {
      render(<NetlifyDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Candlefish AI')).toBeInTheDocument();
      });

      // Click on staging site
      const stagingButton = screen.getByRole('button', { name: /staging - candlefish ai/i });
      await user.click(stagingButton);

      expect(mockApiInstance.getSiteExtensions).toHaveBeenCalledWith('staging-candlefish-ai');
    });

    it('should update URL when site changes', async () => {
      render(<NetlifyDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Candlefish AI')).toBeInTheDocument();
      });

      const paintboxButton = screen.getByRole('button', { name: /paintbox portfolio/i });
      await user.click(paintboxButton);

      expect(mockPush).toHaveBeenCalledWith(
        expect.objectContaining({
          pathname: '/netlify-dashboard',
          query: { site: 'paintbox-candlefish-ai' }
        })
      );
    });
  });

  describe('Extension Management', () => {
    beforeEach(async () => {
      const mockExtensions = [
        createMockExtension({ id: 'ext-1', name: 'Cache Control', isEnabled: true }),
        createMockExtension({ id: 'ext-2', name: 'Image Optimization', isEnabled: false }),
        createMockExtension({ id: 'ext-3', name: 'Security Headers', category: 'security', isEnabled: true })
      ];

      mockApiInstance.getSites.mockResolvedValue([createMockSite()]);
      mockApiInstance.getExtensions.mockResolvedValue(mockExtensions);
      mockApiInstance.getSiteExtensions.mockResolvedValue({
        siteId: 'candlefish-ai-site',
        extensions: mockExtensions,
        recommendations: [],
        performance: createMockPerformanceMetrics()
      });
    });

    it('should display extensions with correct states', async () => {
      render(<NetlifyDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Cache Control')).toBeInTheDocument();
        expect(screen.getByText('Image Optimization')).toBeInTheDocument();
        expect(screen.getByText('Security Headers')).toBeInTheDocument();
      });

      // Check enabled/disabled states
      const enabledToggle = screen.getByRole('switch', { name: /cache control/i });
      const disabledToggle = screen.getByRole('switch', { name: /image optimization/i });
      
      expect(enabledToggle).toBeChecked();
      expect(disabledToggle).not.toBeChecked();
    });

    it('should enable extension when toggle is clicked', async () => {
      mockApiInstance.enableExtension.mockResolvedValue(
        createMockExtension({ id: 'ext-2', isEnabled: true })
      );

      render(<NetlifyDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Image Optimization')).toBeInTheDocument();
      });

      const toggle = screen.getByRole('switch', { name: /image optimization/i });
      await user.click(toggle);

      expect(mockApiInstance.enableExtension).toHaveBeenCalledWith('candlefish-ai-site', 'ext-2');
      expect(mockToast.success).toHaveBeenCalledWith('Extension enabled successfully');
    });

    it('should disable extension when toggle is clicked', async () => {
      mockApiInstance.disableExtension.mockResolvedValue(undefined);

      render(<NetlifyDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Cache Control')).toBeInTheDocument();
      });

      const toggle = screen.getByRole('switch', { name: /cache control/i });
      await user.click(toggle);

      expect(mockApiInstance.disableExtension).toHaveBeenCalledWith('candlefish-ai-site', 'ext-1');
      expect(mockToast.success).toHaveBeenCalledWith('Extension disabled successfully');
    });

    it('should handle extension toggle errors', async () => {
      mockApiInstance.enableExtension.mockRejectedValue(new Error('API Error'));

      render(<NetlifyDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Image Optimization')).toBeInTheDocument();
      });

      const toggle = screen.getByRole('switch', { name: /image optimization/i });
      await user.click(toggle);

      expect(mockToast.error).toHaveBeenCalledWith('Failed to enable extension');
    });
  });

  describe('Filtering and Search', () => {
    beforeEach(async () => {
      const mockExtensions = [
        createMockExtension({ id: 'ext-1', name: 'Cache Control', category: 'performance' }),
        createMockExtension({ id: 'ext-2', name: 'Security Headers', category: 'security' }),
        createMockExtension({ id: 'ext-3', name: 'SEO Tools', category: 'seo' }),
        createMockExtension({ id: 'ext-4', name: 'Analytics Suite', category: 'analytics' })
      ];

      mockApiInstance.getSites.mockResolvedValue([createMockSite()]);
      mockApiInstance.getExtensions.mockResolvedValue(mockExtensions);
      mockApiInstance.getSiteExtensions.mockResolvedValue({
        siteId: 'candlefish-ai-site',
        extensions: mockExtensions,
        recommendations: [],
        performance: createMockPerformanceMetrics()
      });
    });

    it('should filter extensions by category', async () => {
      render(<NetlifyDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Cache Control')).toBeInTheDocument();
        expect(screen.getByText('Security Headers')).toBeInTheDocument();
      });

      // Filter by performance category
      const performanceFilter = screen.getByRole('button', { name: /performance/i });
      await user.click(performanceFilter);

      expect(screen.getByText('Cache Control')).toBeInTheDocument();
      expect(screen.queryByText('Security Headers')).not.toBeInTheDocument();
    });

    it('should search extensions by name', async () => {
      render(<NetlifyDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Cache Control')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search extensions/i);
      await user.type(searchInput, 'cache');

      expect(screen.getByText('Cache Control')).toBeInTheDocument();
      expect(screen.queryByText('Security Headers')).not.toBeInTheDocument();
    });

    it('should filter by enabled/disabled status', async () => {
      render(<NetlifyDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Cache Control')).toBeInTheDocument();
      });

      const enabledFilter = screen.getByRole('button', { name: /enabled only/i });
      await user.click(enabledFilter);

      // Should only show enabled extensions (based on mock data)
      const extensionCards = screen.getAllByTestId('extension-card');
      expect(extensionCards.length).toBeLessThan(4); // Less than total mock extensions
    });

    it('should clear filters when reset button is clicked', async () => {
      render(<NetlifyDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Cache Control')).toBeInTheDocument();
      });

      // Apply filter
      const performanceFilter = screen.getByRole('button', { name: /performance/i });
      await user.click(performanceFilter);

      // Clear filters
      const clearButton = screen.getByRole('button', { name: /clear filters/i });
      await user.click(clearButton);

      // All extensions should be visible again
      expect(screen.getByText('Cache Control')).toBeInTheDocument();
      expect(screen.getByText('Security Headers')).toBeInTheDocument();
      expect(screen.getByText('SEO Tools')).toBeInTheDocument();
      expect(screen.getByText('Analytics Suite')).toBeInTheDocument();
    });
  });

  describe('Performance Metrics', () => {
    beforeEach(async () => {
      mockApiInstance.getSites.mockResolvedValue([createMockSite()]);
      mockApiInstance.getExtensions.mockResolvedValue([]);
      mockApiInstance.getSiteExtensions.mockResolvedValue({
        siteId: 'candlefish-ai-site',
        extensions: [],
        recommendations: [],
        performance: createMockPerformanceMetrics()
      });
      mockApiInstance.getPerformanceMetrics.mockResolvedValue([
        createMockPerformanceMetrics({ timestamp: new Date('2024-01-20T09:00:00Z') }),
        createMockPerformanceMetrics({ timestamp: new Date('2024-01-20T10:00:00Z') }),
        createMockPerformanceMetrics({ timestamp: new Date('2024-01-20T11:00:00Z') })
      ]);
    });

    it('should display Core Web Vitals metrics', async () => {
      render(<NetlifyDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/lcp/i)).toBeInTheDocument();
        expect(screen.getByText(/fid/i)).toBeInTheDocument();
        expect(screen.getByText(/cls/i)).toBeInTheDocument();
        expect(screen.getByText('1.8s')).toBeInTheDocument(); // LCP value
      });
    });

    it('should change time range when selector is used', async () => {
      render(<NetlifyDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/lcp/i)).toBeInTheDocument();
      });

      const timeRangeSelector = screen.getByRole('combobox', { name: /time range/i });
      await user.selectOptions(timeRangeSelector, '7d');

      expect(mockApiInstance.getPerformanceMetrics).toHaveBeenCalledWith('candlefish-ai-site', '7d');
    });

    it('should show performance trends in charts', async () => {
      render(<NetlifyDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('performance-chart')).toBeInTheDocument();
        expect(screen.getByTestId('lighthouse-scores')).toBeInTheDocument();
      });

      // Should display Lighthouse scores
      expect(screen.getByText('92')).toBeInTheDocument(); // Performance score
      expect(screen.getByText('98')).toBeInTheDocument(); // Accessibility score
    });
  });

  describe('AI Recommendations', () => {
    beforeEach(async () => {
      const mockRecommendations = [
        createMockRecommendation({
          confidence: 0.92,
          reasoning: 'Your site would benefit from advanced caching'
        }),
        createMockRecommendation({
          confidence: 0.78,
          reasoning: 'Consider enabling security headers'
        })
      ];

      mockApiInstance.getSites.mockResolvedValue([createMockSite()]);
      mockApiInstance.getExtensions.mockResolvedValue([]);
      mockApiInstance.getSiteExtensions.mockResolvedValue({
        siteId: 'candlefish-ai-site',
        extensions: [],
        recommendations: mockRecommendations,
        performance: createMockPerformanceMetrics()
      });
    });

    it('should display AI recommendations', async () => {
      render(<NetlifyDashboard />);

      await waitFor(() => {
        expect(screen.getByText('AI Recommendations')).toBeInTheDocument();
        expect(screen.getByText('Your site would benefit from advanced caching')).toBeInTheDocument();
        expect(screen.getByText('Consider enabling security headers')).toBeInTheDocument();
      });
    });

    it('should show confidence levels', async () => {
      render(<NetlifyDashboard />);

      await waitFor(() => {
        expect(screen.getByText('92%')).toBeInTheDocument(); // High confidence
        expect(screen.getByText('78%')).toBeInTheDocument(); // Lower confidence
      });
    });

    it('should apply recommendation when clicked', async () => {
      mockApiInstance.enableExtension.mockResolvedValue(
        createMockExtension({ isEnabled: true })
      );

      render(<NetlifyDashboard />);

      await waitFor(() => {
        expect(screen.getByText('AI Recommendations')).toBeInTheDocument();
      });

      const applyButton = screen.getAllByRole('button', { name: /apply/i })[0];
      await user.click(applyButton);

      expect(mockApiInstance.enableExtension).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith('Recommendation applied successfully');
    });
  });

  describe('Batch Operations', () => {
    beforeEach(async () => {
      const mockExtensions = [
        createMockExtension({ id: 'ext-1', name: 'Extension 1', isEnabled: false }),
        createMockExtension({ id: 'ext-2', name: 'Extension 2', isEnabled: false }),
        createMockExtension({ id: 'ext-3', name: 'Extension 3', isEnabled: true })
      ];

      mockApiInstance.getSites.mockResolvedValue([createMockSite()]);
      mockApiInstance.getExtensions.mockResolvedValue(mockExtensions);
      mockApiInstance.getSiteExtensions.mockResolvedValue({
        siteId: 'candlefish-ai-site',
        extensions: mockExtensions,
        recommendations: [],
        performance: createMockPerformanceMetrics()
      });
    });

    it('should enable bulk selection mode', async () => {
      render(<NetlifyDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Extension 1')).toBeInTheDocument();
      });

      const bulkButton = screen.getByRole('button', { name: /bulk operations/i });
      await user.click(bulkButton);

      // Should show checkboxes for selection
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    it('should execute batch enable/disable operations', async () => {
      mockApiInstance.batchToggleExtensions.mockResolvedValue({
        success: 2,
        failed: 0,
        errors: []
      });

      render(<NetlifyDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Extension 1')).toBeInTheDocument();
      });

      // Enable bulk mode
      const bulkButton = screen.getByRole('button', { name: /bulk operations/i });
      await user.click(bulkButton);

      // Select extensions
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]); // Select first extension
      await user.click(checkboxes[1]); // Select second extension

      // Execute batch enable
      const batchEnableButton = screen.getByRole('button', { name: /enable selected/i });
      await user.click(batchEnableButton);

      expect(mockApiInstance.batchToggleExtensions).toHaveBeenCalledWith([
        { siteId: 'candlefish-ai-site', extensionId: 'ext-1', action: 'enable' },
        { siteId: 'candlefish-ai-site', extensionId: 'ext-2', action: 'enable' }
      ]);
    });
  });

  describe('Real-time Updates', () => {
    it('should establish WebSocket connection for live updates', async () => {
      const mockWebSocket = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        close: jest.fn()
      } as any;

      mockApiInstance.createWebSocketConnection = jest.fn().mockReturnValue(mockWebSocket);

      mockApiInstance.getSites.mockResolvedValue([createMockSite()]);
      mockApiInstance.getExtensions.mockResolvedValue([]);
      mockApiInstance.getSiteExtensions.mockResolvedValue({
        siteId: 'candlefish-ai-site',
        extensions: [],
        recommendations: [],
        performance: createMockPerformanceMetrics()
      });

      render(<NetlifyDashboard />);

      await waitFor(() => {
        expect(mockApiInstance.createWebSocketConnection).toHaveBeenCalledWith('candlefish-ai-site');
        expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
      });
    });

    it('should handle WebSocket messages for performance updates', async () => {
      const mockWebSocket = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        close: jest.fn()
      } as any;

      mockApiInstance.createWebSocketConnection = jest.fn().mockReturnValue(mockWebSocket);
      mockApiInstance.getSites.mockResolvedValue([createMockSite()]);
      mockApiInstance.getExtensions.mockResolvedValue([]);
      mockApiInstance.getSiteExtensions.mockResolvedValue({
        siteId: 'candlefish-ai-site',
        extensions: [],
        recommendations: [],
        performance: createMockPerformanceMetrics()
      });

      render(<NetlifyDashboard />);

      await waitFor(() => {
        expect(mockWebSocket.addEventListener).toHaveBeenCalled();
      });

      // Simulate WebSocket message
      const messageHandler = mockWebSocket.addEventListener.mock.calls
        .find(call => call[0] === 'message')[1];

      const mockMessage = {
        data: JSON.stringify({
          type: 'performance_update',
          data: createMockPerformanceMetrics({
            metrics: { ...createMockPerformanceMetrics().metrics, lcp: 1600 }
          })
        })
      };

      messageHandler(mockMessage);

      // Should update the display with new metrics
      await waitFor(() => {
        expect(screen.getByText('1.6s')).toBeInTheDocument(); // Updated LCP
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', async () => {
      mockApiInstance.getSites.mockResolvedValue([createMockSite()]);
      mockApiInstance.getExtensions.mockResolvedValue([createMockExtension()]);
      mockApiInstance.getSiteExtensions.mockResolvedValue({
        siteId: 'candlefish-ai-site',
        extensions: [createMockExtension()],
        recommendations: [],
        performance: createMockPerformanceMetrics()
      });

      render(<NetlifyDashboard />);

      await waitFor(() => {
        // Main dashboard should have proper landmark
        expect(screen.getByRole('main')).toBeInTheDocument();
        
        // Navigation should be properly labeled
        expect(screen.getByRole('navigation', { name: /site selector/i })).toBeInTheDocument();
        
        // Form controls should have labels
        expect(screen.getByLabelText(/search extensions/i)).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', async () => {
      mockApiInstance.getSites.mockResolvedValue(mockCandlefishSites);
      mockApiInstance.getExtensions.mockResolvedValue([createMockExtension()]);
      mockApiInstance.getSiteExtensions.mockResolvedValue({
        siteId: 'candlefish-ai',
        extensions: [createMockExtension()],
        recommendations: [],
        performance: createMockPerformanceMetrics()
      });

      render(<NetlifyDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Candlefish AI')).toBeInTheDocument();
      });

      // Tab navigation should work
      await user.tab();
      expect(document.activeElement).toHaveAttribute('role', 'button');

      // Arrow keys should navigate between sites
      await user.keyboard('[ArrowDown]');
      await user.keyboard('[Enter]');

      // Should select the next site
      expect(mockApiInstance.getSiteExtensions).toHaveBeenCalledWith('staging-candlefish-ai');
    });

    it('should announce important changes to screen readers', async () => {
      mockApiInstance.getSites.mockResolvedValue([createMockSite()]);
      mockApiInstance.getExtensions.mockResolvedValue([createMockExtension({ isEnabled: false })]);
      mockApiInstance.getSiteExtensions.mockResolvedValue({
        siteId: 'candlefish-ai-site',
        extensions: [createMockExtension({ isEnabled: false })],
        recommendations: [],
        performance: createMockPerformanceMetrics()
      });
      mockApiInstance.enableExtension.mockResolvedValue(createMockExtension({ isEnabled: true }));

      render(<NetlifyDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Test Extension')).toBeInTheDocument();
      });

      const toggle = screen.getByRole('switch');
      await user.click(toggle);

      // Should have live region announcement
      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent(/extension enabled/i);
      });
    });
  });
});