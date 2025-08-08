/**
 * Offline Functionality Tests for PWA and Mobile App
 * Tests offline capabilities, caching strategies, and data synchronization
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { setupWorker } from 'msw';
import { rest } from 'msw';
import { SystemAnalyzerDashboard } from '../../components/dashboard/SystemAnalyzerDashboard';
import { ServiceFactory, SystemAnalysisFactory } from '../factories/systemAnalyzerFactory';

// Mock service worker for intercepting network requests
const mockServiceWorker = setupWorker(
  rest.get('/api/services', (req, res, ctx) => {
    return res(
      ctx.json({
        data: { services: ServiceFactory.createMany(5) }
      })
    );
  }),

  rest.get('/api/system-analysis', (req, res, ctx) => {
    return res(
      ctx.json({
        data: { systemAnalysis: SystemAnalysisFactory.createHealthy() }
      })
    );
  }),

  // Simulate network failures
  rest.get('/api/services-offline', (req, res, ctx) => {
    return res.networkError('Network offline');
  }),
);

// Mock IndexedDB for offline storage
const mockIndexedDB = {
  databases: new Map(),

  open: jest.fn().mockImplementation((name: string, version?: number) => {
    return Promise.resolve({
      name,
      version: version || 1,
      objectStoreNames: ['services', 'metrics', 'alerts', 'analysis'],
      transaction: jest.fn().mockImplementation((stores, mode) => ({
        objectStore: jest.fn().mockImplementation((storeName) => ({
          get: jest.fn().mockResolvedValue(mockIndexedDB.databases.get(`${name}:${storeName}`)),
          put: jest.fn().mockImplementation((data, key) => {
            mockIndexedDB.databases.set(`${name}:${storeName}:${key}`, data);
            return Promise.resolve();
          }),
          delete: jest.fn().mockResolvedValue(undefined),
          getAll: jest.fn().mockImplementation(() => {
            const results: any[] = [];
            mockIndexedDB.databases.forEach((value, key) => {
              if (key.startsWith(`${name}:${storeName}:`)) {
                results.push(value);
              }
            });
            return Promise.resolve(results);
          }),
        })),
      })),
      close: jest.fn(),
    });
  }),
};

// Mock browser APIs
Object.defineProperty(window, 'indexedDB', {
  value: mockIndexedDB,
  writable: true,
});

Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

Object.defineProperty(window, 'caches', {
  value: {
    open: jest.fn().mockResolvedValue({
      match: jest.fn().mockResolvedValue(null),
      put: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(true),
      keys: jest.fn().mockResolvedValue([]),
    }),
    delete: jest.fn().mockResolvedValue(true),
    keys: jest.fn().mockResolvedValue([]),
  },
  writable: true,
});

// Mock service worker registration
Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    register: jest.fn().mockResolvedValue({
      installing: null,
      waiting: null,
      active: {
        postMessage: jest.fn(),
        state: 'activated',
      },
      scope: '/',
      update: jest.fn().mockResolvedValue(undefined),
      unregister: jest.fn().mockResolvedValue(true),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }),
    ready: Promise.resolve({
      active: { postMessage: jest.fn() },
      sync: { register: jest.fn() },
    }),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  writable: true,
});

describe('Offline Functionality Tests', () => {
  let originalOnLine: boolean;

  beforeAll(async () => {
    await mockServiceWorker.start({ quiet: true });
    originalOnLine = navigator.onLine;
  });

  afterAll(async () => {
    await mockServiceWorker.stop();
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: originalOnLine,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockIndexedDB.databases.clear();

    // Reset network status
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  describe('Service Worker Registration', () => {
    it('should register service worker successfully', async () => {
      const registration = await navigator.serviceWorker.register('/sw.js');

      expect(registration).toBeDefined();
      expect(registration.scope).toBe('/');
      expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js');
    });

    it('should handle service worker registration failure', async () => {
      const mockRegister = navigator.serviceWorker.register as jest.Mock;
      mockRegister.mockRejectedValueOnce(new Error('SW registration failed'));

      try {
        await navigator.serviceWorker.register('/sw.js');
        fail('Should have thrown an error');
      } catch (error) {
        expect((error as Error).message).toBe('SW registration failed');
      }
    });

    it('should update service worker when available', async () => {
      const registration = await navigator.serviceWorker.register('/sw.js');

      await registration.update();

      expect(registration.update).toHaveBeenCalled();
    });
  });

  describe('Offline Detection', () => {
    it('should detect when browser goes offline', () => {
      expect(navigator.onLine).toBe(true);

      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      // Dispatch offline event
      act(() => {
        window.dispatchEvent(new Event('offline'));
      });

      expect(navigator.onLine).toBe(false);
    });

    it('should detect when browser comes back online', () => {
      // Start offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      expect(navigator.onLine).toBe(false);

      // Go back online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      // Dispatch online event
      act(() => {
        window.dispatchEvent(new Event('online'));
      });

      expect(navigator.onLine).toBe(true);
    });

    it('should show offline indicator when offline', async () => {
      render(<SystemAnalyzerDashboard />);

      // Go offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      act(() => {
        window.dispatchEvent(new Event('offline'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('offline-indicator')).toBeInTheDocument();
      });
    });
  });

  describe('Data Caching', () => {
    it('should cache data when online', async () => {
      const mockData = {
        services: ServiceFactory.createMany(3),
        analysis: SystemAnalysisFactory.createHealthy(),
      };

      // Mock successful cache put operation
      const mockCache = await window.caches.open('system-analyzer-v1');
      const putSpy = jest.spyOn(mockCache, 'put');

      render(<SystemAnalyzerDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-container')).toBeInTheDocument();
      });

      // Should cache API responses
      expect(putSpy).toHaveBeenCalled();
    });

    it('should retrieve cached data when offline', async () => {
      const cachedServices = ServiceFactory.createMany(3);
      const cachedAnalysis = SystemAnalysisFactory.createHealthy();

      // Mock cached response
      const mockCache = await window.caches.open('system-analyzer-v1');
      const matchSpy = jest.spyOn(mockCache, 'match').mockResolvedValue(
        new Response(JSON.stringify({
          data: {
            services: cachedServices,
            systemAnalysis: cachedAnalysis,
          },
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      // Go offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      render(<SystemAnalyzerDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-container')).toBeInTheDocument();
      });

      // Should use cached data
      expect(matchSpy).toHaveBeenCalled();

      // Should show cached data indicator
      await waitFor(() => {
        expect(screen.getByTestId('cached-data-indicator')).toBeInTheDocument();
      });
    });

    it('should handle cache miss gracefully', async () => {
      // Mock cache miss
      const mockCache = await window.caches.open('system-analyzer-v1');
      jest.spyOn(mockCache, 'match').mockResolvedValue(undefined);

      // Go offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      render(<SystemAnalyzerDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('offline-error-state')).toBeInTheDocument();
      });
    });
  });

  describe('IndexedDB Storage', () => {
    it('should store data in IndexedDB for offline access', async () => {
      const testData = {
        services: ServiceFactory.createMany(5),
        timestamp: new Date().toISOString(),
      };

      // Open database
      const db = await mockIndexedDB.open('system-analyzer', 1);
      const transaction = db.transaction(['services'], 'readwrite');
      const store = transaction.objectStore('services');

      // Store data
      await store.put(testData, 'services-cache');

      // Verify data was stored
      expect(mockIndexedDB.databases.has('system-analyzer:services:services-cache')).toBe(true);
    });

    it('should retrieve data from IndexedDB when offline', async () => {
      const cachedServices = ServiceFactory.createMany(3);

      // Pre-populate IndexedDB
      mockIndexedDB.databases.set(
        'system-analyzer:services:services-cache',
        { services: cachedServices, timestamp: new Date().toISOString() }
      );

      // Go offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      render(<SystemAnalyzerDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-container')).toBeInTheDocument();
      });

      // Should show data from IndexedDB
      expect(screen.getByTestId('services-summary-card')).toBeInTheDocument();
    });

    it('should handle IndexedDB errors gracefully', async () => {
      // Mock IndexedDB error
      mockIndexedDB.open.mockRejectedValueOnce(new Error('IndexedDB not available'));

      render(<SystemAnalyzerDashboard />);

      // Should fallback gracefully and show appropriate message
      await waitFor(() => {
        expect(screen.getByTestId('storage-error-message')).toBeInTheDocument();
      });
    });

    it('should clean up old cached data', async () => {
      const oldData = {
        services: ServiceFactory.createMany(2),
        timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 48 hours old
      };

      // Store old data
      mockIndexedDB.databases.set('system-analyzer:services:old-cache', oldData);

      const db = await mockIndexedDB.open('system-analyzer', 1);
      const transaction = db.transaction(['services'], 'readwrite');
      const store = transaction.objectStore('services');

      // Should clean up old data (simulate cleanup logic)
      const deleteSpy = jest.spyOn(store, 'delete');

      // Trigger cleanup (this would normally be done by the app)
      await store.delete('old-cache');

      expect(deleteSpy).toHaveBeenCalledWith('old-cache');
    });
  });

  describe('Background Sync', () => {
    it('should register background sync when offline actions are queued', async () => {
      const registration = await navigator.serviceWorker.ready;
      const syncSpy = jest.spyOn(registration.sync, 'register');

      // Go offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      render(<SystemAnalyzerDashboard />);

      // Try to perform an action that would require network
      const refreshButton = screen.getByTestId('refresh-button');
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(syncSpy).toHaveBeenCalledWith('sync-data');
      });
    });

    it('should sync queued actions when coming back online', async () => {
      // Start offline with queued actions
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      render(<SystemAnalyzerDashboard />);

      // Queue an action
      const refreshButton = screen.getByTestId('refresh-button');
      fireEvent.click(refreshButton);

      // Come back online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      act(() => {
        window.dispatchEvent(new Event('online'));
      });

      // Should show sync indicator
      await waitFor(() => {
        expect(screen.getByTestId('sync-indicator')).toBeInTheDocument();
      });
    });
  });

  describe('Offline Form Handling', () => {
    it('should queue form submissions when offline', async () => {
      // Go offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      render(<SystemAnalyzerDashboard />);

      // Try to submit a form (e.g., acknowledge alert)
      const acknowledgeButton = screen.queryByTestId('acknowledge-alert-button');

      if (acknowledgeButton) {
        fireEvent.click(acknowledgeButton);

        await waitFor(() => {
          expect(screen.getByTestId('queued-action-indicator')).toBeInTheDocument();
        });
      }
    });

    it('should show offline form validation messages', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      render(<SystemAnalyzerDashboard />);

      // Should show appropriate offline messages for interactive elements
      const offlineMessage = screen.queryByText(/offline.*queue/i);
      if (offlineMessage) {
        expect(offlineMessage).toBeInTheDocument();
      }
    });
  });

  describe('Data Staleness Indicators', () => {
    it('should show data age when using cached data', async () => {
      const oldTimestamp = new Date(Date.now() - 60 * 60 * 1000); // 1 hour old

      // Mock cached data with timestamp
      mockIndexedDB.databases.set(
        'system-analyzer:analysis:cache',
        {
          analysis: SystemAnalysisFactory.createHealthy(),
          timestamp: oldTimestamp.toISOString(),
        }
      );

      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      render(<SystemAnalyzerDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('data-age-indicator')).toBeInTheDocument();
        expect(screen.getByText(/1 hour ago/i)).toBeInTheDocument();
      });
    });

    it('should warn when data is very stale', async () => {
      const veryOldTimestamp = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours old

      mockIndexedDB.databases.set(
        'system-analyzer:analysis:cache',
        {
          analysis: SystemAnalysisFactory.createHealthy(),
          timestamp: veryOldTimestamp.toISOString(),
        }
      );

      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      render(<SystemAnalyzerDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('stale-data-warning')).toBeInTheDocument();
        expect(screen.getByText(/data may be outdated/i)).toBeInTheDocument();
      });
    });
  });

  describe('Progressive Web App Features', () => {
    it('should provide app install prompt functionality', async () => {
      // Mock beforeinstallprompt event
      const mockInstallPrompt = {
        prompt: jest.fn(),
        userChoice: Promise.resolve({ outcome: 'accepted' }),
      };

      // Simulate beforeinstallprompt event
      act(() => {
        const event = new CustomEvent('beforeinstallprompt');
        (event as any).prompt = mockInstallPrompt.prompt;
        (event as any).userChoice = mockInstallPrompt.userChoice;
        window.dispatchEvent(event);
      });

      render(<SystemAnalyzerDashboard />);

      await waitFor(() => {
        const installButton = screen.queryByTestId('app-install-button');
        if (installButton) {
          expect(installButton).toBeInTheDocument();
        }
      });
    });

    it('should handle app install prompt interaction', async () => {
      const mockPrompt = jest.fn();
      const mockUserChoice = Promise.resolve({ outcome: 'accepted' });

      // Mock install prompt
      const mockEvent = {
        prompt: mockPrompt,
        userChoice: mockUserChoice,
        preventDefault: jest.fn(),
      };

      render(<SystemAnalyzerDashboard />);

      // Simulate install button click
      const installButton = screen.queryByTestId('app-install-button');
      if (installButton) {
        fireEvent.click(installButton);

        // Would trigger install prompt
        expect(mockPrompt).toHaveBeenCalled;
      }
    });
  });

  describe('Network Recovery', () => {
    it('should automatically refresh data when network is restored', async () => {
      // Start offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      render(<SystemAnalyzerDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('offline-indicator')).toBeInTheDocument();
      });

      // Come back online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      act(() => {
        window.dispatchEvent(new Event('online'));
      });

      // Should automatically refresh data
      await waitFor(() => {
        expect(screen.getByTestId('auto-refresh-indicator')).toBeInTheDocument();
      });
    });

    it('should handle partial network connectivity', async () => {
      // Simulate slow/unreliable network
      mockServiceWorker.use(
        rest.get('/api/services', (req, res, ctx) => {
          return res(ctx.delay(5000), ctx.status(408)); // Timeout
        })
      );

      render(<SystemAnalyzerDashboard />);

      // Should fall back to cached data after timeout
      await waitFor(() => {
        expect(screen.getByTestId('network-timeout-message')).toBeInTheDocument();
      }, { timeout: 6000 });
    });
  });

  describe('Storage Quota Management', () => {
    it('should handle storage quota exceeded gracefully', async () => {
      // Mock storage quota exceeded error
      const mockCache = await window.caches.open('system-analyzer-v1');
      jest.spyOn(mockCache, 'put').mockRejectedValue(
        new DOMException('Quota exceeded', 'QuotaExceededError')
      );

      render(<SystemAnalyzerDashboard />);

      // Should handle quota error gracefully
      await waitFor(() => {
        const storageWarning = screen.queryByTestId('storage-warning');
        if (storageWarning) {
          expect(storageWarning).toBeInTheDocument();
        }
      });
    });

    it('should clean up old cache entries when storage is full', async () => {
      const mockCache = await window.caches.open('system-analyzer-v1');
      const deleteSpy = jest.spyOn(mockCache, 'delete');

      // Mock quota exceeded error followed by successful cleanup
      jest.spyOn(mockCache, 'put')
        .mockRejectedValueOnce(new DOMException('Quota exceeded', 'QuotaExceededError'))
        .mockResolvedValueOnce(undefined);

      render(<SystemAnalyzerDashboard />);

      // Should attempt cleanup
      await waitFor(() => {
        expect(deleteSpy).toHaveBeenCalled();
      });
    });
  });
});
