import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MobileAnalytics } from '../MobileAnalytics';

// Mock touch events and mobile viewport
Object.defineProperty(window, 'ontouchstart', {
  writable: true,
  value: undefined
});

// Mock mobile viewport
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 375,
});

Object.defineProperty(window, 'innerHeight', {
  writable: true,
  configurable: true,
  value: 667,
});

describe('MobileAnalytics', () => {
  let queryClient: QueryClient;
  let mockAnalyticsApi: any;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    mockAnalyticsApi = require('../../lib/analytics-api');
    
    // Mock mobile-optimized API responses
    mockAnalyticsApi.getMobileOverview = jest.fn().mockResolvedValue({
      success: true,
      data: {
        activeAgents: 12,
        healthyServices: 8,
        totalServices: 9,
        systemHealth: 'good',
        alerts: 2,
        lastUpdate: '2024-01-01T10:00:00Z'
      }
    });

    mockAnalyticsApi.getTopPerformers = jest.fn().mockResolvedValue({
      success: true,
      data: [
        { name: 'Agent Alpha', score: 98.5, trend: 'up' },
        { name: 'Agent Beta', score: 97.2, trend: 'stable' },
        { name: 'Agent Gamma', score: 96.8, trend: 'down' }
      ]
    });

    mockAnalyticsApi.getRecentAlerts = jest.fn().mockResolvedValue({
      success: true,
      data: [
        {
          id: 'alert-1',
          severity: 'warning',
          message: 'High response time detected',
          timestamp: '2024-01-01T09:55:00Z',
          component: 'api-server'
        },
        {
          id: 'alert-2',
          severity: 'info',
          message: 'Service restarted successfully',
          timestamp: '2024-01-01T09:50:00Z',
          component: 'web-dashboard'
        }
      ]
    });
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  it('should render mobile-optimized dashboard', async () => {
    renderWithProviders(<MobileAnalytics />);

    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-dashboard')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('12 Active')).toBeInTheDocument();
      expect(screen.getByText('8/9 Healthy')).toBeInTheDocument();
    });
  });

  it('should display system status cards', async () => {
    renderWithProviders(<MobileAnalytics />);

    await waitFor(() => {
      const activeAgentsCard = screen.getByTestId('active-agents-card');
      const servicesCard = screen.getByTestId('services-health-card');
      const alertsCard = screen.getByTestId('alerts-card');

      expect(activeAgentsCard).toBeInTheDocument();
      expect(servicesCard).toBeInTheDocument();
      expect(alertsCard).toBeInTheDocument();
    });

    // Check status indicators
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('2 Alerts')).toBeInTheDocument();
  });

  it('should support swipe navigation between sections', async () => {
    renderWithProviders(<MobileAnalytics />);

    await waitFor(() => {
      expect(screen.getByTestId('swipe-container')).toBeInTheDocument();
    });

    const swipeContainer = screen.getByTestId('swipe-container');

    // Simulate swipe left (next section)
    fireEvent.touchStart(swipeContainer, {
      touches: [{ clientX: 300, clientY: 100 }]
    });
    
    fireEvent.touchMove(swipeContainer, {
      touches: [{ clientX: 100, clientY: 100 }]
    });
    
    fireEvent.touchEnd(swipeContainer, {
      changedTouches: [{ clientX: 100, clientY: 100 }]
    });

    await waitFor(() => {
      expect(screen.getByText('Top Performers')).toBeInTheDocument();
    });
  });

  it('should show pull-to-refresh indicator', async () => {
    renderWithProviders(<MobileAnalytics />);

    const container = screen.getByTestId('mobile-dashboard');

    // Simulate pull down gesture
    fireEvent.touchStart(container, {
      touches: [{ clientX: 200, clientY: 50 }]
    });

    fireEvent.touchMove(container, {
      touches: [{ clientX: 200, clientY: 150 }]
    });

    // Should show refresh indicator
    expect(screen.getByTestId('pull-refresh-indicator')).toBeInTheDocument();
    expect(screen.getByText('Pull to refresh')).toBeInTheDocument();
  });

  it('should trigger refresh on pull-to-refresh release', async () => {
    renderWithProviders(<MobileAnalytics />);

    const container = screen.getByTestId('mobile-dashboard');

    // Clear previous API calls
    mockAnalyticsApi.getMobileOverview.mockClear();

    // Complete pull-to-refresh gesture
    fireEvent.touchStart(container, {
      touches: [{ clientX: 200, clientY: 50 }]
    });

    fireEvent.touchMove(container, {
      touches: [{ clientX: 200, clientY: 200 }]
    });

    fireEvent.touchEnd(container, {
      changedTouches: [{ clientX: 200, clientY: 200 }]
    });

    await waitFor(() => {
      expect(mockAnalyticsApi.getMobileOverview).toHaveBeenCalled();
    });

    // Should show refreshing indicator
    expect(screen.getByText('Refreshing...')).toBeInTheDocument();
  });

  it('should display top performers section', async () => {
    renderWithProviders(<MobileAnalytics />);

    // Navigate to top performers section
    const topPerformersTab = screen.getByRole('tab', { name: /top performers/i });
    fireEvent.click(topPerformersTab);

    await waitFor(() => {
      expect(screen.getByText('Agent Alpha')).toBeInTheDocument();
      expect(screen.getByText('98.5')).toBeInTheDocument();
      expect(screen.getByText('Agent Beta')).toBeInTheDocument();
      expect(screen.getByText('97.2')).toBeInTheDocument();
    });

    // Check trend indicators
    const upTrend = screen.getByTestId('trend-up');
    const stableTrend = screen.getByTestId('trend-stable');
    const downTrend = screen.getByTestId('trend-down');

    expect(upTrend).toBeInTheDocument();
    expect(stableTrend).toBeInTheDocument();
    expect(downTrend).toBeInTheDocument();
  });

  it('should show recent alerts with severity levels', async () => {
    renderWithProviders(<MobileAnalytics />);

    // Navigate to alerts section
    const alertsTab = screen.getByRole('tab', { name: /alerts/i });
    fireEvent.click(alertsTab);

    await waitFor(() => {
      expect(screen.getByText('High response time detected')).toBeInTheDocument();
      expect(screen.getByText('Service restarted successfully')).toBeInTheDocument();
    });

    // Check severity indicators
    const warningAlert = screen.getByTestId('alert-warning');
    const infoAlert = screen.getByTestId('alert-info');

    expect(warningAlert).toHaveClass('alert-warning');
    expect(infoAlert).toHaveClass('alert-info');
  });

  it('should handle tap to view alert details', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MobileAnalytics />);

    const alertsTab = screen.getByRole('tab', { name: /alerts/i });
    await user.click(alertsTab);

    await waitFor(() => {
      expect(screen.getByText('High response time detected')).toBeInTheDocument();
    });

    const alertItem = screen.getByTestId('alert-item-alert-1');
    await user.click(alertItem);

    // Should show alert details modal
    await waitFor(() => {
      expect(screen.getByText('Alert Details')).toBeInTheDocument();
      expect(screen.getByText('Component: api-server')).toBeInTheDocument();
    });
  });

  it('should adapt to device orientation changes', async () => {
    renderWithProviders(<MobileAnalytics />);

    // Simulate landscape orientation
    Object.defineProperty(window, 'innerWidth', { value: 667 });
    Object.defineProperty(window, 'innerHeight', { value: 375 });

    fireEvent(window, new Event('orientationchange'));

    await waitFor(() => {
      const dashboard = screen.getByTestId('mobile-dashboard');
      expect(dashboard).toHaveClass('landscape-mode');
    });
  });

  it('should show loading shimmer on mobile', () => {
    // Reset mocks to return pending promises
    mockAnalyticsApi.getMobileOverview.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<MobileAnalytics />);

    expect(screen.getByTestId('mobile-loading-shimmer')).toBeInTheDocument();
    expect(screen.getAllByTestId('shimmer-card')).toHaveLength(3);
  });

  it('should handle network errors gracefully on mobile', async () => {
    mockAnalyticsApi.getMobileOverview.mockRejectedValue(
      new Error('Network Error')
    );

    renderWithProviders(<MobileAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('Connection Error')).toBeInTheDocument();
      expect(screen.getByText('Check your internet connection')).toBeInTheDocument();
    });

    const retryButton = screen.getByRole('button', { name: /try again/i });
    expect(retryButton).toBeInTheDocument();
  });

  it('should support haptic feedback on interactions', async () => {
    // Mock navigator.vibrate
    Object.defineProperty(navigator, 'vibrate', {
      writable: true,
      value: jest.fn()
    });

    const user = userEvent.setup();
    renderWithProviders(<MobileAnalytics />);

    await waitFor(() => {
      expect(screen.getByText('12 Active')).toBeInTheDocument();
    });

    const activeAgentsCard = screen.getByTestId('active-agents-card');
    await user.click(activeAgentsCard);

    // Should trigger haptic feedback
    expect(navigator.vibrate).toHaveBeenCalledWith(50);
  });

  it('should optimize for thumb navigation zones', async () => {
    renderWithProviders(<MobileAnalytics />);

    await waitFor(() => {
      const navigationTabs = screen.getByTestId('bottom-navigation');
      expect(navigationTabs).toBeInTheDocument();
    });

    // Check that interactive elements are in thumb-friendly positions
    const tabs = screen.getAllByRole('tab');
    tabs.forEach(tab => {
      const rect = tab.getBoundingClientRect();
      expect(rect.height).toBeGreaterThanOrEqual(48); // Minimum touch target
    });
  });

  it('should handle fast tapping without double execution', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MobileAnalytics />);

    await waitFor(() => {
      expect(screen.getByTestId('active-agents-card')).toBeInTheDocument();
    });

    const card = screen.getByTestId('active-agents-card');
    
    // Rapidly tap the same element
    await user.click(card);
    await user.click(card);
    await user.click(card);

    // Should only execute once due to debouncing
    await waitFor(() => {
      const modals = screen.queryAllByRole('dialog');
      expect(modals).toHaveLength(1); // Only one modal should open
    });
  });

  it('should support accessibility on mobile', async () => {
    renderWithProviders(<MobileAnalytics />);

    // Check ARIA labels for mobile
    expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Mobile Analytics Dashboard');
    
    await waitFor(() => {
      const navigationTabs = screen.getByRole('tablist');
      expect(navigationTabs).toHaveAttribute('aria-label', 'Analytics sections');
    });

    // Check screen reader announcements
    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
  });

  it('should handle background/foreground app transitions', async () => {
    renderWithProviders(<MobileAnalytics />);

    // Clear API call mocks
    mockAnalyticsApi.getMobileOverview.mockClear();

    // Simulate app going to background
    Object.defineProperty(document, 'hidden', { value: true });
    fireEvent(document, new Event('visibilitychange'));

    await testUtils.waitForUpdate();

    // Simulate app returning to foreground
    Object.defineProperty(document, 'hidden', { value: false });
    fireEvent(document, new Event('visibilitychange'));

    // Should refresh data when returning to foreground
    await waitFor(() => {
      expect(mockAnalyticsApi.getMobileOverview).toHaveBeenCalled();
    });
  });

  it('should optimize battery usage with reduced animations', async () => {
    // Mock low battery API
    Object.defineProperty(navigator, 'getBattery', {
      writable: true,
      value: jest.fn().mockResolvedValue({
        level: 0.15, // 15% battery
        charging: false
      })
    });

    renderWithProviders(<MobileAnalytics />);

    await waitFor(() => {
      const dashboard = screen.getByTestId('mobile-dashboard');
      expect(dashboard).toHaveClass('reduced-animations');
    });
  });
});