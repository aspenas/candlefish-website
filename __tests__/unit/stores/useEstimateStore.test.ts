import { renderHook, act, waitFor } from '@testing-library/react';
import { useEstimateStore } from '@/projects/paintbox/stores/useEstimateStore';
import { useOfflineStore } from '@/projects/paintbox/stores/useOfflineStore';
import { v4 as uuidv4 } from 'uuid';

// Mock external dependencies
jest.mock('uuid');
jest.mock('@/projects/paintbox/stores/useOfflineStore');
jest.mock('@/lib/db/offline-db', () => ({
  offlineDB: {
    getEstimate: jest.fn(),
  },
}));

const mockUuidv4 = uuidv4 as jest.MockedFunction<typeof uuidv4>;
const mockUseOfflineStore = useOfflineStore as jest.MockedFunction<typeof useOfflineStore>;

// Mock fetch globally
global.fetch = jest.fn();

describe('useEstimateStore', () => {
  const mockOfflineStore = {
    networkStatus: { isOnline: true },
    saveEstimateOffline: jest.fn(),
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock implementations
    mockUuidv4.mockReturnValue('mock-uuid-123');
    (mockUseOfflineStore as any).getState = jest.fn().mockReturnValue(mockOfflineStore);

    // Reset fetch mock
    (global.fetch as jest.Mock).mockClear();

    // Clear localStorage
    localStorage.clear();

    // Reset zustand store
    useEstimateStore.getState().clearEstimate();
  });

  describe('Initial State', () => {
    it('has correct initial state', () => {
      const { result } = renderHook(() => useEstimateStore());

      expect(result.current.estimate).toEqual({
        id: null,
        clientInfo: {},
        measurements: {},
        pricing: {},
        stepsCompleted: [],
        createdAt: null,
        updatedAt: null,
        syncStatus: 'pending',
      });
      expect(result.current.isOfflineMode).toBe(false);
      expect(result.current.lastSavedAt).toBeNull();
    });
  });

  describe('updateClientInfo', () => {
    it('updates client info and triggers auto-save', async () => {
      const { result } = renderHook(() => useEstimateStore());
      const clientInfo = { name: 'John Doe', email: 'john@example.com' };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'saved-id', ...clientInfo }),
      });

      act(() => {
        result.current.updateClientInfo(clientInfo);
      });

      expect(result.current.estimate.clientInfo).toEqual(clientInfo);
      expect(result.current.estimate.updatedAt).toBeTruthy();

      // Wait for auto-save to trigger
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/estimates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('John Doe'),
        });
      }, { timeout: 1000 });
    });
  });

  describe('markStepCompleted', () => {
    it('adds completed step and updates timestamp', () => {
      const { result } = renderHook(() => useEstimateStore());

      act(() => {
        result.current.markStepCompleted('client-info');
      });

      expect(result.current.estimate.stepsCompleted).toContain('client-info');
      expect(result.current.estimate.updatedAt).toBeTruthy();
    });

    it('handles multiple completed steps', () => {
      const { result } = renderHook(() => useEstimateStore());

      act(() => {
        result.current.markStepCompleted('client-info');
        result.current.markStepCompleted('measurements');
        result.current.markStepCompleted('pricing');
      });

      expect(result.current.estimate.stepsCompleted).toEqual([
        'client-info',
        'measurements',
        'pricing',
      ]);
    });
  });

  describe('updateEstimate', () => {
    it('merges estimate data and updates timestamp', () => {
      const { result } = renderHook(() => useEstimateStore());
      const updateData = {
        measurements: { rooms: 3, sqft: 1500 },
        pricing: { total: 5000 },
      };

      act(() => {
        result.current.updateEstimate(updateData);
      });

      expect(result.current.estimate.measurements).toEqual(updateData.measurements);
      expect(result.current.estimate.pricing).toEqual(updateData.pricing);
      expect(result.current.estimate.updatedAt).toBeTruthy();
    });
  });

  describe('saveEstimate', () => {
    it('generates ID for new estimate', async () => {
      const { result } = renderHook(() => useEstimateStore());

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'mock-uuid-123' }),
      });

      await act(async () => {
        await result.current.saveEstimate();
      });

      expect(result.current.estimate.id).toBe('mock-uuid-123');
      expect(result.current.estimate.createdAt).toBeTruthy();
    });

    it('saves to server when online', async () => {
      const { result } = renderHook(() => useEstimateStore());

      const mockResponse = {
        id: 'server-id',
        syncStatus: 'synced',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await act(async () => {
        await result.current.saveEstimate();
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/estimates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.any(String),
      });

      expect(result.current.estimate.syncStatus).toBe('synced');
      expect(result.current.lastSavedAt).toBeTruthy();
    });

    it('saves offline when network is unavailable', async () => {
      const { result } = renderHook(() => useEstimateStore());

      // Mock offline state
      mockOfflineStore.networkStatus.isOnline = false;

      await act(async () => {
        await result.current.saveEstimate();
      });

      expect(mockOfflineStore.saveEstimateOffline).toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('falls back to offline save when server fails', async () => {
      const { result } = renderHook(() => useEstimateStore());

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      await act(async () => {
        await result.current.saveEstimate();
      });

      expect(mockOfflineStore.saveEstimateOffline).toHaveBeenCalled();
    });

    it('saves offline when network error occurs', async () => {
      const { result } = renderHook(() => useEstimateStore());

      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await act(async () => {
        await result.current.saveEstimate();
      });

      expect(mockOfflineStore.saveEstimateOffline).toHaveBeenCalled();
    });
  });

  describe('loadEstimate', () => {
    it('loads estimate from server when online', async () => {
      const { result } = renderHook(() => useEstimateStore());

      const mockEstimate = {
        id: 'test-id',
        clientInfo: { name: 'Jane Doe' },
        syncStatus: 'synced',
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockEstimate,
      });

      await act(async () => {
        await result.current.loadEstimate('test-id');
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/estimates/test-id');
      expect(result.current.estimate.id).toBe('test-id');
      expect(result.current.estimate.clientInfo).toEqual({ name: 'Jane Doe' });
      expect(result.current.estimate.syncStatus).toBe('synced');
    });

    it('falls back to offline storage when server fails', async () => {
      const { result } = renderHook(() => useEstimateStore());

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
      });

      // Mock offline DB
      const mockOfflineDB = await import('@/lib/db/offline-db');
      (mockOfflineDB.offlineDB.getEstimate as jest.Mock).mockResolvedValue({
        data: { id: 'offline-id', clientInfo: { name: 'Offline User' } },
        syncStatus: 'pending',
        updatedAt: new Date(),
      });

      await act(async () => {
        await result.current.loadEstimate('test-id');
      });

      expect(result.current.estimate.id).toBe('offline-id');
      expect(result.current.estimate.clientInfo).toEqual({ name: 'Offline User' });
    });

    it('loads from offline storage when offline', async () => {
      const { result } = renderHook(() => useEstimateStore());

      mockOfflineStore.networkStatus.isOnline = false;

      const mockOfflineDB = await import('@/lib/db/offline-db');
      (mockOfflineDB.offlineDB.getEstimate as jest.Mock).mockResolvedValue({
        data: { id: 'offline-id' },
        syncStatus: 'pending',
        updatedAt: new Date(),
      });

      await act(async () => {
        await result.current.loadEstimate('test-id');
      });

      expect(global.fetch).not.toHaveBeenCalled();
      expect(result.current.estimate.id).toBe('offline-id');
    });

    it('handles errors gracefully', async () => {
      const { result } = renderHook(() => useEstimateStore());

      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const mockOfflineDB = await import('@/lib/db/offline-db');
      (mockOfflineDB.offlineDB.getEstimate as jest.Mock).mockRejectedValue(
        new Error('DB error')
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await act(async () => {
        await result.current.loadEstimate('test-id');
      });

      expect(consoleSpy).toHaveBeenCalledWith('Failed to load estimate:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('clearEstimate', () => {
    it('resets estimate to initial state', () => {
      const { result } = renderHook(() => useEstimateStore());

      // First update the estimate with some data
      act(() => {
        result.current.updateClientInfo({ name: 'Test User' });
      });

      expect(result.current.estimate.clientInfo).toEqual({ name: 'Test User' });

      // Then clear it
      act(() => {
        result.current.clearEstimate();
      });

      expect(result.current.estimate).toEqual({
        id: null,
        clientInfo: {},
        measurements: {},
        pricing: {},
        stepsCompleted: [],
        createdAt: null,
        updatedAt: null,
        syncStatus: 'pending',
      });
      expect(result.current.lastSavedAt).toBeNull();
    });
  });

  describe('setOfflineMode', () => {
    it('toggles offline mode', () => {
      const { result } = renderHook(() => useEstimateStore());

      expect(result.current.isOfflineMode).toBe(false);

      act(() => {
        result.current.setOfflineMode(true);
      });

      expect(result.current.isOfflineMode).toBe(true);

      act(() => {
        result.current.setOfflineMode(false);
      });

      expect(result.current.isOfflineMode).toBe(false);
    });
  });

  describe('Persistence', () => {
    it('persists estimate data to localStorage', () => {
      const { result } = renderHook(() => useEstimateStore());

      const clientInfo = { name: 'Persistent User' };

      act(() => {
        result.current.updateClientInfo(clientInfo);
      });

      // Check that data is persisted
      const persistedData = JSON.parse(
        localStorage.getItem('paintbox-estimate-store') || '{}'
      );

      expect(persistedData.state.estimate.clientInfo).toEqual(clientInfo);
    });

    it('restores estimate data from localStorage', () => {
      const estimateData = {
        estimate: {
          id: 'persisted-id',
          clientInfo: { name: 'Restored User' },
          measurements: {},
          pricing: {},
          stepsCompleted: ['client-info'],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T01:00:00Z',
          syncStatus: 'synced',
        },
        lastSavedAt: '2024-01-01T01:00:00Z',
        isOfflineMode: false,
      };

      localStorage.setItem(
        'paintbox-estimate-store',
        JSON.stringify({ state: estimateData, version: 0 })
      );

      const { result } = renderHook(() => useEstimateStore());

      expect(result.current.estimate.id).toBe('persisted-id');
      expect(result.current.estimate.clientInfo).toEqual({ name: 'Restored User' });
    });
  });

  describe('Auto-save Behavior', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('auto-saves after client info update', async () => {
      const { result } = renderHook(() => useEstimateStore());

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      act(() => {
        result.current.updateClientInfo({ name: 'Auto Save Test' });
      });

      // Fast-forward time to trigger auto-save
      act(() => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it('auto-saves after step completion', async () => {
      const { result } = renderHook(() => useEstimateStore());

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      act(() => {
        result.current.markStepCompleted('measurements');
      });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it('auto-saves after estimate update with longer delay', async () => {
      const { result } = renderHook(() => useEstimateStore());

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      act(() => {
        result.current.updateEstimate({ pricing: { total: 1000 } });
      });

      // Should not save immediately
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(global.fetch).not.toHaveBeenCalled();

      // Should save after 1000ms
      act(() => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles save errors gracefully', async () => {
      const { result } = renderHook(() => useEstimateStore());

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Mock saveEstimateOffline to throw error
      mockOfflineStore.saveEstimateOffline.mockRejectedValue(
        new Error('Storage error')
      );

      await act(async () => {
        await result.current.saveEstimate();
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to save estimate:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });
});
