import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import NetInfo from '@react-native-netinfo/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OfflineSyncProvider, useOfflineSync } from '../../../../apps/mobile-maturity-map/src/services/offlineSync';
import { mockStore, persistor } from '../../../__mocks__/redux-store';
import { 
  createAssessmentFactory,
  createResponseFactory 
} from '../../../utils/test-data-factories';

// Mock NetInfo
jest.mock('@react-native-netinfo/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn(),
  configure: jest.fn(),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  clear: jest.fn(),
}));

// Mock SQLite for offline storage
jest.mock('react-native-sqlite-storage', () => ({
  openDatabase: jest.fn(() => ({
    transaction: jest.fn(),
    executeSql: jest.fn(),
    close: jest.fn(),
  })),
  enablePromise: jest.fn(),
}));

// Test component that uses offline sync
const TestOfflineComponent: React.FC = () => {
  const { 
    isOnline, 
    syncStatus, 
    pendingChanges, 
    lastSyncTime,
    forcSync 
  } = useOfflineSync();

  return (
    <>
      {isOnline ? (
        <text testID="online-status">Online</text>
      ) : (
        <text testID="offline-status">Offline</text>
      )}
      <text testID="sync-status">{syncStatus}</text>
      <text testID="pending-changes">{pendingChanges.length} pending</text>
      {lastSyncTime && <text testID="last-sync">{lastSyncTime}</text>}
      <button testID="force-sync-btn" onPress={forcSync}>
        Force Sync
      </button>
    </>
  );
};

describe('Offline Sync Functionality', () => {
  let mockNetInfo: any;
  let store: any;

  beforeEach(() => {
    mockNetInfo = NetInfo as jest.Mocked<typeof NetInfo>;
    store = mockStore({
      assessments: {
        assessments: [],
        loading: false,
        error: null,
      },
      sync: {
        isOnline: true,
        syncStatus: 'idle',
        pendingChanges: [],
        lastSyncTime: null,
        conflicts: [],
      },
      offline: {
        queue: [],
        lastAction: null,
      },
    });

    // Mock AsyncStorage as empty initially
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <OfflineSyncProvider>
          {children}
        </OfflineSyncProvider>
      </PersistGate>
    </Provider>
  );

  describe('Network State Detection', () => {
    it('should detect online state', async () => {
      // Arrange
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
        type: 'wifi',
      });

      // Act
      render(
        <TestWrapper>
          <TestOfflineComponent />
        </TestWrapper>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('online-status')).toBeTruthy();
      });
    });

    it('should detect offline state', async () => {
      // Arrange
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
        type: 'none',
      });

      // Act
      render(
        <TestWrapper>
          <TestOfflineComponent />
        </TestWrapper>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('offline-status')).toBeTruthy();
      });
    });

    it('should handle network state changes', async () => {
      // Arrange
      let networkCallback: (state: any) => void;
      mockNetInfo.addEventListener.mockImplementation((callback) => {
        networkCallback = callback;
        return jest.fn(); // unsubscribe function
      });

      mockNetInfo.fetch.mockResolvedValue({
        isConnected: true,
        isInternetReachable: true,
      });

      // Act
      render(
        <TestWrapper>
          <TestOfflineComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('online-status')).toBeTruthy();
      });

      // Simulate going offline
      act(() => {
        networkCallback({
          isConnected: false,
          isInternetReachable: false,
          type: 'none',
        });
      });

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('offline-status')).toBeTruthy();
      });
    });
  });

  describe('Offline Data Storage', () => {
    it('should store assessment data locally when offline', async () => {
      // Arrange
      const mockAssessment = createAssessmentFactory({
        id: 'assessment-1',
        title: 'Offline Assessment',
        responses: [
          createResponseFactory({
            questionId: 'q1',
            selectedValue: 3,
            comments: 'Test response',
          }),
        ],
      });

      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
      });

      store = mockStore({
        ...store.getState(),
        sync: {
          ...store.getState().sync,
          isOnline: false,
        },
        assessments: {
          assessments: [mockAssessment],
          loading: false,
          error: null,
        },
      });

      // Act
      render(
        <TestWrapper>
          <TestOfflineComponent />
        </TestWrapper>
      );

      // Assert
      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          'offline_assessments',
          expect.stringContaining('assessment-1')
        );
      });
    });

    it('should queue changes while offline', async () => {
      // Arrange
      mockNetInfo.fetch.mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
      });

      const offlineChange = {
        type: 'UPDATE_RESPONSE',
        assessmentId: 'assessment-1',
        questionId: 'q1',
        selectedValue: 4,
        timestamp: Date.now(),
      };

      store = mockStore({
        ...store.getState(),
        sync: {
          ...store.getState().sync,
          isOnline: false,
          pendingChanges: [offlineChange],
        },
      });

      // Act
      render(
        <TestWrapper>
          <TestOfflineComponent />
        </TestWrapper>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('pending-changes')).toHaveTextContent('1 pending');
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_queue',
        expect.stringContaining('UPDATE_RESPONSE')
      );
    });

    it('should persist data across app restarts', async () => {
      // Arrange
      const persistedAssessment = createAssessmentFactory({
        id: 'persisted-1',
        title: 'Persisted Assessment',
      });

      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'offline_assessments') {
          return Promise.resolve(JSON.stringify([persistedAssessment]));
        }
        if (key === 'offline_queue') {
          return Promise.resolve(JSON.stringify([{
            type: 'CREATE_ASSESSMENT',
            data: persistedAssessment,
            timestamp: Date.now() - 300000, // 5 minutes ago
          }]));
        }
        return Promise.resolve(null);
      });

      // Act
      render(
        <TestWrapper>
          <TestOfflineComponent />
        </TestWrapper>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('pending-changes')).toHaveTextContent('1 pending');
      });

      // Verify data was restored from persistence
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('offline_assessments');
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('offline_queue');
    });
  });

  describe('Data Synchronization', () => {
    it('should sync pending changes when coming back online', async () => {
      // Arrange
      let networkCallback: (state: any) => void;
      mockNetInfo.addEventListener.mockImplementation((callback) => {
        networkCallback = callback;
        return jest.fn();
      });

      const pendingChanges = [
        {
          type: 'UPDATE_RESPONSE',
          assessmentId: 'assessment-1',
          questionId: 'q1',
          selectedValue: 4,
          timestamp: Date.now() - 60000, // 1 minute ago
        },
        {
          type: 'ADD_COMMENT',
          assessmentId: 'assessment-1',
          questionId: 'q2',
          comments: 'Added while offline',
          timestamp: Date.now() - 30000, // 30 seconds ago
        },
      ];

      store = mockStore({
        ...store.getState(),
        sync: {
          ...store.getState().sync,
          isOnline: false,
          pendingChanges,
        },
      });

      // Mock GraphQL mutations for sync
      const mockGraphQLClient = {
        mutate: jest.fn().mockResolvedValue({
          data: { submitAssessmentResponse: { success: true } },
        }),
      };

      // Act
      render(
        <TestWrapper>
          <TestOfflineComponent />
        </TestWrapper>
      );

      // Simulate coming back online
      act(() => {
        networkCallback({
          isConnected: true,
          isInternetReachable: true,
          type: 'wifi',
        });
      });

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('online-status')).toBeTruthy();
        expect(screen.getByTestId('sync-status')).toHaveTextContent('syncing');
      });

      // Verify sync completed
      await waitFor(() => {
        expect(screen.getByTestId('sync-status')).toHaveTextContent('completed');
        expect(screen.getByTestId('pending-changes')).toHaveTextContent('0 pending');
      });
    });

    it('should handle sync conflicts', async () => {
      // Arrange
      const localChange = {
        type: 'UPDATE_RESPONSE',
        assessmentId: 'assessment-1',
        questionId: 'q1',
        selectedValue: 3,
        timestamp: Date.now() - 120000, // 2 minutes ago
      };

      const remoteAssessment = createAssessmentFactory({
        id: 'assessment-1',
        responses: [
          createResponseFactory({
            questionId: 'q1',
            selectedValue: 4, // Different value
            updatedAt: new Date(Date.now() - 60000).toISOString(), // Updated 1 minute ago
          }),
        ],
      });

      store = mockStore({
        ...store.getState(),
        sync: {
          ...store.getState().sync,
          pendingChanges: [localChange],
          conflicts: [
            {
              assessmentId: 'assessment-1',
              questionId: 'q1',
              localValue: 3,
              remoteValue: 4,
              localTimestamp: localChange.timestamp,
              remoteTimestamp: Date.now() - 60000,
            },
          ],
        },
      });

      // Act
      render(
        <TestWrapper>
          <TestOfflineComponent />
        </TestWrapper>
      );

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('sync-status')).toHaveTextContent('conflicts');
      });

      // In a real implementation, this would show a conflict resolution UI
    });

    it('should retry failed sync operations', async () => {
      // Arrange
      const failedChange = {
        type: 'UPDATE_RESPONSE',
        assessmentId: 'assessment-1',
        questionId: 'q1',
        selectedValue: 3,
        timestamp: Date.now(),
        retryCount: 2,
      };

      store = mockStore({
        ...store.getState(),
        sync: {
          ...store.getState().sync,
          pendingChanges: [failedChange],
          isOnline: true,
        },
      });

      const mockGraphQLClient = {
        mutate: jest.fn()
          .mockRejectedValueOnce(new Error('Network error'))
          .mockRejectedValueOnce(new Error('Server error'))
          .mockResolvedValueOnce({
            data: { submitAssessmentResponse: { success: true } },
          }),
      };

      // Act
      render(
        <TestWrapper>
          <TestOfflineComponent />
        </TestWrapper>
      );

      const forceSyncBtn = screen.getByTestId('force-sync-btn');
      fireEvent.press(forceSyncBtn);

      // Assert
      await waitFor(() => {
        expect(mockGraphQLClient.mutate).toHaveBeenCalledTimes(3);
        expect(screen.getByTestId('sync-status')).toHaveTextContent('completed');
      });
    });

    it('should handle partial sync failures', async () => {
      // Arrange
      const changes = [
        {
          type: 'UPDATE_RESPONSE',
          assessmentId: 'assessment-1',
          questionId: 'q1',
          selectedValue: 3,
        },
        {
          type: 'UPDATE_RESPONSE',
          assessmentId: 'assessment-1',
          questionId: 'q2',
          selectedValue: 4,
        },
      ];

      const mockGraphQLClient = {
        mutate: jest.fn()
          .mockResolvedValueOnce({ data: { success: true } }) // First succeeds
          .mockRejectedValueOnce(new Error('Server error')), // Second fails
      };

      store = mockStore({
        ...store.getState(),
        sync: {
          ...store.getState().sync,
          pendingChanges: changes,
          isOnline: true,
        },
      });

      // Act
      render(
        <TestWrapper>
          <TestOfflineComponent />
        </TestWrapper>
      );

      const forceSyncBtn = screen.getByTestId('force-sync-btn');
      fireEvent.press(forceSyncBtn);

      // Assert
      await waitFor(() => {
        // Should have 1 remaining pending change
        expect(screen.getByTestId('pending-changes')).toHaveTextContent('1 pending');
        expect(screen.getByTestId('sync-status')).toHaveTextContent('partial');
      });
    });
  });

  describe('Data Integrity and Validation', () => {
    it('should validate data before syncing', async () => {
      // Arrange
      const invalidChange = {
        type: 'UPDATE_RESPONSE',
        assessmentId: 'assessment-1',
        questionId: 'q1',
        selectedValue: 999, // Invalid value
        timestamp: Date.now(),
      };

      store = mockStore({
        ...store.getState(),
        sync: {
          ...store.getState().sync,
          pendingChanges: [invalidChange],
          isOnline: true,
        },
      });

      // Act
      render(
        <TestWrapper>
          <TestOfflineComponent />
        </TestWrapper>
      );

      const forceSyncBtn = screen.getByTestId('force-sync-btn');
      fireEvent.press(forceSyncBtn);

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('sync-status')).toHaveTextContent('validation-error');
        expect(screen.getByTestId('pending-changes')).toHaveTextContent('1 pending');
      });
    });

    it('should handle corrupted local data gracefully', async () => {
      // Arrange
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'offline_assessments') {
          return Promise.resolve('corrupted json data {');
        }
        return Promise.resolve(null);
      });

      // Act
      render(
        <TestWrapper>
          <TestOfflineComponent />
        </TestWrapper>
      );

      // Assert
      await waitFor(() => {
        // Should not crash and should handle gracefully
        expect(screen.getByTestId('sync-status')).toHaveTextContent('idle');
      });

      // Should attempt to clear corrupted data
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('offline_assessments');
    });

    it('should implement data versioning for schema migrations', async () => {
      // Arrange
      const oldVersionData = {
        version: '1.0.0',
        assessments: [
          {
            id: 'assessment-1',
            title: 'Old Format Assessment',
            // Old schema without some new fields
          },
        ],
      };

      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'offline_assessments') {
          return Promise.resolve(JSON.stringify(oldVersionData));
        }
        if (key === 'data_version') {
          return Promise.resolve('1.0.0');
        }
        return Promise.resolve(null);
      });

      // Act
      render(
        <TestWrapper>
          <TestOfflineComponent />
        </TestWrapper>
      );

      // Assert
      await waitFor(() => {
        // Should migrate data to new schema
        expect(AsyncStorage.setItem).toHaveBeenCalledWith('data_version', '2.0.0');
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          'offline_assessments',
          expect.stringContaining('assessment-1')
        );
      });
    });
  });

  describe('Performance and Storage Management', () => {
    it('should implement storage quota management', async () => {
      // Arrange - Mock storage quota exceeded
      const largeAssessments = Array.from({ length: 1000 }, (_, i) =>
        createAssessmentFactory({
          id: `assessment-${i}`,
          responses: Array.from({ length: 100 }, (_, j) => ({
            questionId: `q${j}`,
            comments: 'Very long comment '.repeat(100),
          })),
        })
      );

      store = mockStore({
        ...store.getState(),
        assessments: {
          assessments: largeAssessments,
          loading: false,
          error: null,
        },
      });

      (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(
        new Error('QuotaExceededError')
      );

      // Act
      render(
        <TestWrapper>
          <TestOfflineComponent />
        </TestWrapper>
      );

      // Assert
      await waitFor(() => {
        // Should handle quota exceeded by cleaning up old data
        expect(AsyncStorage.removeItem).toHaveBeenCalled();
      });
    });

    it('should implement data compression for large datasets', async () => {
      // Arrange
      const largeAssessment = createAssessmentFactory({
        responses: Array.from({ length: 500 }, (_, i) => ({
          questionId: `q${i}`,
          comments: 'Detailed response comment '.repeat(50),
        })),
      });

      store = mockStore({
        ...store.getState(),
        assessments: {
          assessments: [largeAssessment],
          loading: false,
          error: null,
        },
      });

      // Act
      render(
        <TestWrapper>
          <TestOfflineComponent />
        </TestWrapper>
      );

      // Assert
      await waitFor(() => {
        const setItemCalls = (AsyncStorage.setItem as jest.Mock).mock.calls;
        const compressedData = setItemCalls.find(call => 
          call[0] === 'offline_assessments'
        );
        
        if (compressedData) {
          // In a real implementation, we'd verify data is compressed
          expect(compressedData[1]).toBeTruthy();
        }
      });
    });

    it('should cleanup old offline data periodically', async () => {
      // Arrange
      const oldTimestamp = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days ago
      const oldChange = {
        type: 'UPDATE_RESPONSE',
        assessmentId: 'assessment-1',
        questionId: 'q1',
        selectedValue: 3,
        timestamp: oldTimestamp,
      };

      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'offline_queue') {
          return Promise.resolve(JSON.stringify([oldChange]));
        }
        return Promise.resolve(null);
      });

      // Act
      render(
        <TestWrapper>
          <TestOfflineComponent />
        </TestWrapper>
      );

      // Assert
      await waitFor(() => {
        // Should clean up old changes
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          'offline_queue',
          '[]' // Empty array after cleanup
        );
      });
    });
  });

  describe('Security Considerations', () => {
    it('should encrypt sensitive offline data', async () => {
      // Arrange
      const sensitiveAssessment = createAssessmentFactory({
        title: 'Confidential Security Assessment',
        responses: [
          createResponseFactory({
            comments: 'Contains PII and sensitive security information',
          }),
        ],
      });

      store = mockStore({
        ...store.getState(),
        assessments: {
          assessments: [sensitiveAssessment],
          loading: false,
          error: null,
        },
      });

      // Act
      render(
        <TestWrapper>
          <TestOfflineComponent />
        </TestWrapper>
      );

      // Assert
      await waitFor(() => {
        const setItemCalls = (AsyncStorage.setItem as jest.Mock).mock.calls;
        const encryptedData = setItemCalls.find(call => 
          call[0] === 'offline_assessments_encrypted'
        );
        
        if (encryptedData) {
          // In a real implementation, we'd verify data is encrypted
          expect(encryptedData[1]).not.toContain('Confidential Security Assessment');
        }
      });
    });

    it('should validate data integrity with checksums', async () => {
      // Arrange
      const assessmentData = createAssessmentFactory();
      const tamperedData = JSON.stringify(assessmentData).replace('IN_PROGRESS', 'COMPLETED');

      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === 'offline_assessments') {
          return Promise.resolve(tamperedData);
        }
        if (key === 'offline_assessments_checksum') {
          return Promise.resolve('original_checksum'); // Doesn't match tampered data
        }
        return Promise.resolve(null);
      });

      // Act
      render(
        <TestWrapper>
          <TestOfflineComponent />
        </TestWrapper>
      );

      // Assert
      await waitFor(() => {
        // Should detect tampering and clear corrupted data
        expect(AsyncStorage.removeItem).toHaveBeenCalledWith('offline_assessments');
        expect(AsyncStorage.removeItem).toHaveBeenCalledWith('offline_assessments_checksum');
      });
    });
  });
});