/**
 * Tests for custom React hooks.
 * Covers data fetching, WebSocket, and state management hooks.
 */

import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMetrics, useWebSocket, useAuth, useDashboardData } from '../hooks';
import * as apiMock from './__mocks__/apiMock';
import * as websocketMock from './__mocks__/websocketMock';

// Test wrapper for hooks that need QueryClient
const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useMetrics Hook', () => {
  beforeEach(() => {
    apiMock.resetAllMocks();
  });

  it('fetches metrics data successfully', async () => {
    const mockMetrics = [
      {
        metricName: 'cpu_usage',
        value: 75.5,
        timestamp: '2022-01-01T00:00:00Z',
        labels: { host: 'web-01' },
      },
    ];

    apiMock.setApiResponse('getMetrics', mockMetrics);

    const { result } = renderHook(
      () => useMetrics('cpu_usage', '1h'),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(mockMetrics);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  it('handles loading state', () => {
    // Mock delayed response
    apiMock.setApiResponse('getMetrics',
      new Promise(resolve => setTimeout(() => resolve([]), 100))
    );

    const { result } = renderHook(
      () => useMetrics('cpu_usage', '1h'),
      { wrapper: createTestWrapper() }
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('handles error state', async () => {
    const error = new Error('Failed to fetch metrics');
    apiMock.setApiError('getMetrics', error);

    const { result } = renderHook(
      () => useMetrics('cpu_usage', '1h'),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toBeUndefined();
    });
  });

  it('refetches data when parameters change', async () => {
    const mockMetrics1 = [{ metricName: 'cpu_usage', value: 75.5 }];
    const mockMetrics2 = [{ metricName: 'memory_usage', value: 2048 }];

    apiMock.setApiResponse('getMetrics', mockMetrics1);

    const { result, rerender } = renderHook(
      ({ metric, timeRange }) => useMetrics(metric, timeRange),
      {
        wrapper: createTestWrapper(),
        initialProps: { metric: 'cpu_usage', timeRange: '1h' },
      }
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(mockMetrics1);
    });

    // Change parameters
    apiMock.setApiResponse('getMetrics', mockMetrics2);
    rerender({ metric: 'memory_usage', timeRange: '1h' });

    await waitFor(() => {
      expect(result.current.data).toEqual(mockMetrics2);
    });

    expect(apiMock.getApiCallCount('getMetrics')).toBe(2);
  });

  it('provides refresh functionality', async () => {
    const mockMetrics = [{ metricName: 'cpu_usage', value: 75.5 }];
    apiMock.setApiResponse('getMetrics', mockMetrics);

    const { result } = renderHook(
      () => useMetrics('cpu_usage', '1h'),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(mockMetrics);
    });

    const initialCallCount = apiMock.getApiCallCount('getMetrics');

    // Trigger refresh
    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(apiMock.getApiCallCount('getMetrics')).toBe(initialCallCount + 1);
    });
  });

  it('caches data appropriately', async () => {
    const mockMetrics = [{ metricName: 'cpu_usage', value: 75.5 }];
    apiMock.setApiResponse('getMetrics', mockMetrics);

    // First hook instance
    const { result: result1 } = renderHook(
      () => useMetrics('cpu_usage', '1h'),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      expect(result1.current.data).toEqual(mockMetrics);
    });

    // Second hook instance with same parameters
    const { result: result2 } = renderHook(
      () => useMetrics('cpu_usage', '1h'),
      { wrapper: createTestWrapper() }
    );

    // Should use cached data
    await waitFor(() => {
      expect(result2.current.data).toEqual(mockMetrics);
    });

    // Should only have made one API call
    expect(apiMock.getApiCallCount('getMetrics')).toBe(1);
  });
});

describe('useWebSocket Hook', () => {
  beforeEach(() => {
    websocketMock.resetWebSocketMocks();
  });

  it('establishes WebSocket connection', async () => {
    const { result } = renderHook(() => useWebSocket());

    await act(async () => {
      await result.current.connect('mock-token');
    });

    expect(result.current.isConnected).toBe(true);
    expect(websocketMock.getEventCount('connect')).toBe(1);
  });

  it('handles connection errors', async () => {
    const { result } = renderHook(() => useWebSocket());

    await act(async () => {
      try {
        await result.current.connect('invalid-token');
      } catch (error) {
        // Expected to fail
      }
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).toBeTruthy();
  });

  it('subscribes to metrics updates', async () => {
    const { result } = renderHook(() => useWebSocket());

    await act(async () => {
      await result.current.connect('mock-token');
    });

    act(() => {
      result.current.subscribe(['cpu_usage', 'memory_usage']);
    });

    const subscriptions = result.current.subscriptions;
    expect(subscriptions).toContain('cpu_usage');
    expect(subscriptions).toContain('memory_usage');
  });

  it('receives real-time metric updates', async () => {
    const onMetricUpdate = jest.fn();

    const { result } = renderHook(() =>
      useWebSocket({ onMetricUpdate })
    );

    await act(async () => {
      await result.current.connect('mock-token');
    });

    // Simulate metric update
    act(() => {
      websocketMock.simulateMetricUpdate({
        metricName: 'cpu_usage',
        value: 85.0,
        timestamp: new Date().toISOString(),
      });
    });

    await waitFor(() => {
      expect(onMetricUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          metricName: 'cpu_usage',
          value: 85.0,
        })
      );
    });
  });

  it('handles WebSocket disconnection and reconnection', async () => {
    const { result } = renderHook(() => useWebSocket());

    // Connect
    await act(async () => {
      await result.current.connect('mock-token');
    });

    expect(result.current.isConnected).toBe(true);

    // Disconnect
    act(() => {
      result.current.disconnect();
    });

    expect(result.current.isConnected).toBe(false);

    // Reconnect
    await act(async () => {
      await result.current.connect('mock-token');
    });

    expect(result.current.isConnected).toBe(true);
  });

  it('maintains subscription state across reconnections', async () => {
    const { result } = renderHook(() => useWebSocket());

    await act(async () => {
      await result.current.connect('mock-token');
    });

    // Subscribe to metrics
    act(() => {
      result.current.subscribe(['cpu_usage']);
    });

    expect(result.current.subscriptions).toContain('cpu_usage');

    // Simulate connection loss and reconnect
    act(() => {
      websocketMock.simulateConnectionError();
    });

    await act(async () => {
      websocketMock.simulateReconnect();
    });

    // Should re-subscribe automatically
    await waitFor(() => {
      expect(result.current.subscriptions).toContain('cpu_usage');
    });
  });

  it('limits reconnection attempts', async () => {
    const { result } = renderHook(() => useWebSocket({ maxReconnectAttempts: 3 }));

    await act(async () => {
      await result.current.connect('mock-token');
    });

    // Simulate multiple connection failures
    for (let i = 0; i < 5; i++) {
      act(() => {
        websocketMock.simulateConnectionError();
      });
    }

    await waitFor(() => {
      expect(result.current.reconnectAttempts).toBeLessThanOrEqual(3);
    });
  });
});

describe('useAuth Hook', () => {
  beforeEach(() => {
    localStorage.clear();
    apiMock.resetAllMocks();
  });

  it('initializes with no authentication', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
  });

  it('initializes with existing token from localStorage', () => {
    localStorage.setItem('authToken', 'existing-token');

    const { result } = renderHook(() => useAuth());

    expect(result.current.token).toBe('existing-token');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('handles login successfully', async () => {
    const mockUser = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
    };

    apiMock.setApiResponse('login', {
      access_token: 'new-token',
      user: mockUser,
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('testuser', 'password123');
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.token).toBe('new-token');
    expect(localStorage.getItem('authToken')).toBe('new-token');
  });

  it('handles login errors', async () => {
    apiMock.setApiError('login', {
      response: { status: 401, data: { error: 'Invalid credentials' } }
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      try {
        await result.current.login('testuser', 'wrongpassword');
      } catch (error) {
        // Expected to fail
      }
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.error).toBeTruthy();
  });

  it('handles logout', () => {
    localStorage.setItem('authToken', 'existing-token');

    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(localStorage.getItem('authToken')).toBeNull();
  });

  it('validates token on initialization', async () => {
    const mockUser = {
      id: 'user-123',
      username: 'testuser',
    };

    localStorage.setItem('authToken', 'valid-token');
    apiMock.setApiResponse('validateToken', { user: mockUser });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
    });

    expect(apiMock.getApiCallCount('validateToken')).toBe(1);
  });

  it('removes invalid token', async () => {
    localStorage.setItem('authToken', 'invalid-token');
    apiMock.setApiError('validateToken', {
      response: { status: 401 }
    });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(false);
    });

    expect(localStorage.getItem('authToken')).toBeNull();
  });

  it('refreshes token when needed', async () => {
    localStorage.setItem('authToken', 'expiring-token');
    apiMock.setApiResponse('refreshToken', {
      access_token: 'new-refreshed-token',
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.refreshToken();
    });

    expect(result.current.token).toBe('new-refreshed-token');
    expect(localStorage.getItem('authToken')).toBe('new-refreshed-token');
  });
});

describe('useDashboardData Hook', () => {
  beforeEach(() => {
    apiMock.resetAllMocks();
  });

  it('fetches all dashboard data', async () => {
    const mockData = {
      deploymentStatus: { status: 'healthy' },
      dnsConfiguration: [{ domain: 'example.com' }],
      kubernetesDeployments: [{ name: 'rtpm-api' }],
      validationResults: [{ type: 'dns', status: 'passed' }],
    };

    Object.keys(mockData).forEach(key => {
      apiMock.setApiResponse(key, mockData[key as keyof typeof mockData]);
    });

    const { result } = renderHook(
      () => useDashboardData(),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toEqual(
        expect.objectContaining(mockData)
      );
    });
  });

  it('handles partial data loading', async () => {
    // Mock some APIs to succeed and others to fail
    apiMock.setApiResponse('deploymentStatus', { status: 'healthy' });
    apiMock.setApiError('dnsConfiguration', new Error('DNS API failed'));
    apiMock.setApiResponse('kubernetesDeployments', [{ name: 'rtpm-api' }]);

    const { result } = renderHook(
      () => useDashboardData(),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      expect(result.current.data.deploymentStatus).toEqual({ status: 'healthy' });
      expect(result.current.data.kubernetesDeployments).toEqual([{ name: 'rtpm-api' }]);
      expect(result.current.errors.dnsConfiguration).toBeTruthy();
    });
  });

  it('provides refresh functionality for all data', async () => {
    const mockData = {
      deploymentStatus: { status: 'healthy' },
    };

    apiMock.setApiResponse('deploymentStatus', mockData.deploymentStatus);

    const { result } = renderHook(
      () => useDashboardData(),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      expect(result.current.data.deploymentStatus).toEqual(mockData.deploymentStatus);
    });

    const initialCallCount = apiMock.getApiCallCount();

    // Trigger refresh
    act(() => {
      result.current.refreshAll();
    });

    await waitFor(() => {
      expect(apiMock.getApiCallCount()).toBeGreaterThan(initialCallCount);
    });
  });

  it('auto-refreshes data at intervals', async () => {
    jest.useFakeTimers();

    const mockData = { deploymentStatus: { status: 'healthy' } };
    apiMock.setApiResponse('deploymentStatus', mockData.deploymentStatus);

    const { result } = renderHook(
      () => useDashboardData({ autoRefreshInterval: 30000 }),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      expect(result.current.data.deploymentStatus).toEqual(mockData.deploymentStatus);
    });

    const initialCallCount = apiMock.getApiCallCount();

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(30000);
    });

    await waitFor(() => {
      expect(apiMock.getApiCallCount()).toBeGreaterThan(initialCallCount);
    });

    jest.useRealTimers();
  });

  it('pauses auto-refresh when document is hidden', async () => {
    jest.useFakeTimers();

    const mockData = { deploymentStatus: { status: 'healthy' } };
    apiMock.setApiResponse('deploymentStatus', mockData.deploymentStatus);

    const { result } = renderHook(
      () => useDashboardData({ autoRefreshInterval: 30000 }),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      expect(result.current.data.deploymentStatus).toEqual(mockData.deploymentStatus);
    });

    const initialCallCount = apiMock.getApiCallCount();

    // Simulate document becoming hidden
    Object.defineProperty(document, 'hidden', { value: true, writable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(60000); // 2x the refresh interval
    });

    // Should not have made additional calls while hidden
    expect(apiMock.getApiCallCount()).toBe(initialCallCount);

    jest.useRealTimers();
  });

  it('batches multiple data requests efficiently', async () => {
    const { result } = renderHook(
      () => useDashboardData(),
      { wrapper: createTestWrapper() }
    );

    // Multiple components requesting the same hook should share queries
    const { result: result2 } = renderHook(
      () => useDashboardData(),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result2.current.isLoading).toBe(false);
    });

    // Should only make one set of API calls despite multiple hook instances
    const totalCalls = Object.values(apiMock.apiCallHistory).length;
    expect(totalCalls).toBeLessThan(10); // Reasonable number for batched requests
  });

  it('handles network errors gracefully', async () => {
    // Mock all APIs to fail
    const apis = ['deploymentStatus', 'dnsConfiguration', 'kubernetesDeployments'];
    apis.forEach(api => {
      apiMock.setApiError(api, new Error('Network error'));
    });

    const { result } = renderHook(
      () => useDashboardData(),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(Object.keys(result.current.errors)).toEqual(
        expect.arrayContaining(apis)
      );
    });

    // Should provide retry functionality
    expect(typeof result.current.retry).toBe('function');
  });
});
