import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-netinfo/lib/types';
import { offlineSync } from '../../src/services/offlineSync';
import { apolloClient } from '../../src/services/apolloClient';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-community/netinfo');
jest.mock('../../src/services/apolloClient');

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockApolloClient = apolloClient as jest.Mocked<typeof apolloClient>;

describe('OfflineSync Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
    mockAsyncStorage.removeItem.mockResolvedValue();
  });

  describe('Network Detection', () => {
    it('should detect online status', () => {
      (NetInfo as any).isConnected = true;
      expect(offlineSync.isOnline()).toBe(true);

      (NetInfo as any).isConnected = false;
      expect(offlineSync.isOnline()).toBe(false);
    });

    it('should listen for network state changes', async () => {
      const mockListener = jest.fn();
      offlineSync.addNetworkListener(mockListener);

      // Simulate network state change
      const networkChangeCallback = (NetInfo.addEventListener as jest.Mock).mock.calls[0][0];
      networkChangeCallback({ isConnected: true });

      expect(mockListener).toHaveBeenCalledWith(true);
    });
  });

  describe('Photo Storage', () => {
    const mockPhoto = {
      uri: 'file:///path/to/photo.jpg',
      estimateId: 'estimate1',
      roomId: 'kitchen',
      tag: 'WW15-001',
      metadata: {
        timestamp: '2025-01-15T10:00:00Z',
        location: { latitude: 40.7128, longitude: -74.0060 },
        dimensions: { width: 1920, height: 1080 },
      },
    };

    it('should store photo data offline', async () => {
      await offlineSync.storePhoto(mockPhoto);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_photos',
        JSON.stringify([mockPhoto])
      );
    });

    it('should append to existing stored photos', async () => {
      const existingPhotos = [
        { tag: 'WW15-001', uri: 'existing1.jpg' },
        { tag: 'WW15-002', uri: 'existing2.jpg' },
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingPhotos));

      await offlineSync.storePhoto(mockPhoto);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_photos',
        JSON.stringify([...existingPhotos, mockPhoto])
      );
    });

    it('should retrieve stored photos', async () => {
      const storedPhotos = [mockPhoto];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedPhotos));

      const result = await offlineSync.getStoredPhotos();

      expect(result).toEqual(storedPhotos);
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('offline_photos');
    });

    it('should return empty array when no photos stored', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await offlineSync.getStoredPhotos();

      expect(result).toEqual([]);
    });

    it('should handle corrupted photo storage data', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('invalid json');

      const result = await offlineSync.getStoredPhotos();

      expect(result).toEqual([]);
    });
  });

  describe('Photo Upload', () => {
    const mockPhoto = {
      uri: 'file:///path/to/photo.jpg',
      estimateId: 'estimate1',
      roomId: 'kitchen',
      tag: 'WW15-001',
      metadata: {
        timestamp: '2025-01-15T10:00:00Z',
        location: { latitude: 40.7128, longitude: -74.0060 },
      },
    };

    it('should upload photo when online', async () => {
      const mockUploadResponse = {
        data: {
          uploadPhoto: {
            url: 'https://storage.paintbox.com/photos/WW15-001.jpg',
            success: true,
          },
        },
      };

      mockApolloClient.mutate.mockResolvedValue(mockUploadResponse);

      const result = await offlineSync.uploadPhoto(mockPhoto);

      expect(result.url).toBe('https://storage.paintbox.com/photos/WW15-001.jpg');
      expect(mockApolloClient.mutate).toHaveBeenCalledWith({
        mutation: expect.any(Object),
        variables: {
          input: {
            uri: mockPhoto.uri,
            estimateId: mockPhoto.estimateId,
            roomId: mockPhoto.roomId,
            tag: mockPhoto.tag,
            metadata: mockPhoto.metadata,
          },
        },
      });
    });

    it('should handle upload failures', async () => {
      mockApolloClient.mutate.mockRejectedValue(new Error('Network error'));

      await expect(offlineSync.uploadPhoto(mockPhoto)).rejects.toThrow('Network error');
    });

    it('should retry failed uploads', async () => {
      mockApolloClient.mutate
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce({
          data: {
            uploadPhoto: {
              url: 'https://storage.paintbox.com/photos/WW15-001.jpg',
              success: true,
            },
          },
        });

      const result = await offlineSync.uploadPhoto(mockPhoto, { retryCount: 2 });

      expect(result.url).toBe('https://storage.paintbox.com/photos/WW15-001.jpg');
      expect(mockApolloClient.mutate).toHaveBeenCalledTimes(2);
    });

    it('should compress large images before upload', async () => {
      const largePhoto = {
        ...mockPhoto,
        metadata: {
          ...mockPhoto.metadata,
          dimensions: { width: 4000, height: 3000 },
          fileSize: 15 * 1024 * 1024, // 15MB
        },
      };

      mockApolloClient.mutate.mockResolvedValue({
        data: {
          uploadPhoto: {
            url: 'https://storage.paintbox.com/photos/WW15-001.jpg',
            success: true,
          },
        },
      });

      await offlineSync.uploadPhoto(largePhoto);

      expect(mockApolloClient.mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            input: expect.objectContaining({
              compressed: true,
              quality: 0.7,
            }),
          }),
        })
      );
    });
  });

  describe('Estimate Data Sync', () => {
    const mockEstimateData = {
      id: 'estimate1',
      customerId: 'customer1',
      measurements: {
        kitchen: { totalArea: 200, walls: [] },
        livingroom: { totalArea: 300, walls: [] },
      },
      selectedTier: 'BETTER',
      status: 'DRAFT',
      lastModified: '2025-01-15T10:00:00Z',
    };

    it('should store estimate data offline', async () => {
      await offlineSync.storeEstimateData(mockEstimateData);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_estimates',
        JSON.stringify([mockEstimateData])
      );
    });

    it('should update existing estimate data', async () => {
      const existingEstimates = [mockEstimateData];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingEstimates));

      const updatedEstimate = {
        ...mockEstimateData,
        selectedTier: 'BEST',
        lastModified: '2025-01-15T11:00:00Z',
      };

      await offlineSync.storeEstimateData(updatedEstimate);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_estimates',
        JSON.stringify([updatedEstimate])
      );
    });

    it('should sync estimates when coming back online', async () => {
      const offlineEstimates = [mockEstimateData];
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(offlineEstimates));

      mockApolloClient.mutate.mockResolvedValue({
        data: {
          updateEstimate: {
            id: 'estimate1',
            success: true,
          },
        },
      });

      await offlineSync.syncEstimateData();

      expect(mockApolloClient.mutate).toHaveBeenCalledWith({
        mutation: expect.any(Object),
        variables: {
          id: mockEstimateData.id,
          input: expect.objectContaining({
            measurements: mockEstimateData.measurements,
            selectedTier: mockEstimateData.selectedTier,
            status: mockEstimateData.status,
          }),
        },
      });

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('offline_estimates');
    });

    it('should handle sync conflicts', async () => {
      const offlineEstimate = {
        ...mockEstimateData,
        selectedTier: 'BEST',
        lastModified: '2025-01-15T10:00:00Z',
      };

      const serverEstimate = {
        ...mockEstimateData,
        selectedTier: 'GOOD',
        lastModified: '2025-01-15T11:00:00Z', // Newer on server
      };

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify([offlineEstimate]));
      
      mockApolloClient.query.mockResolvedValue({
        data: {
          estimate: serverEstimate,
        },
      });

      const conflictResolver = jest.fn().mockResolvedValue(serverEstimate);
      await offlineSync.syncEstimateData({ conflictResolver });

      expect(conflictResolver).toHaveBeenCalledWith(offlineEstimate, serverEstimate);
    });
  });

  describe('Background Sync', () => {
    it('should automatically sync when network becomes available', async () => {
      const syncSpy = jest.spyOn(offlineSync, 'syncAllData');

      // Simulate app going online
      const networkChangeCallback = (NetInfo.addEventListener as jest.Mock).mock.calls[0][0];
      networkChangeCallback({ isConnected: true });

      expect(syncSpy).toHaveBeenCalled();
    });

    it('should batch upload multiple photos', async () => {
      const photos = [
        { tag: 'WW15-001', uri: 'photo1.jpg', estimateId: 'estimate1' },
        { tag: 'WW15-002', uri: 'photo2.jpg', estimateId: 'estimate1' },
        { tag: 'WW15-003', uri: 'photo3.jpg', estimateId: 'estimate1' },
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(photos));

      mockApolloClient.mutate.mockResolvedValue({
        data: {
          batchUploadPhotos: {
            success: true,
            uploadedCount: 3,
          },
        },
      });

      const result = await offlineSync.syncPhotos();

      expect(result.uploadedCount).toBe(3);
      expect(mockApolloClient.mutate).toHaveBeenCalledWith({
        mutation: expect.any(Object),
        variables: {
          photos,
        },
      });
    });

    it('should handle partial batch upload failures', async () => {
      const photos = [
        { tag: 'WW15-001', uri: 'photo1.jpg', estimateId: 'estimate1' },
        { tag: 'WW15-002', uri: 'photo2.jpg', estimateId: 'estimate1' },
        { tag: 'WW15-003', uri: 'photo3.jpg', estimateId: 'estimate1' },
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(photos));

      mockApolloClient.mutate.mockResolvedValue({
        data: {
          batchUploadPhotos: {
            success: false,
            uploadedCount: 2,
            failedPhotos: [{ tag: 'WW15-003', error: 'File corrupted' }],
          },
        },
      });

      const result = await offlineSync.syncPhotos();

      expect(result.uploadedCount).toBe(2);
      expect(result.failedPhotos).toHaveLength(1);

      // Failed photos should remain in offline storage
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_photos',
        JSON.stringify([{ tag: 'WW15-003', uri: 'photo3.jpg', estimateId: 'estimate1' }])
      );
    });

    it('should prioritize uploads by estimate status', async () => {
      const estimates = [
        { id: 'estimate1', status: 'SENT', priority: 1 },
        { id: 'estimate2', status: 'DRAFT', priority: 3 },
        { id: 'estimate3', status: 'REVIEW', priority: 2 },
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(estimates));

      const syncSpy = jest.fn().mockResolvedValue({ success: true });
      offlineSync.syncEstimate = syncSpy;

      await offlineSync.syncEstimateData();

      // Should sync in priority order: SENT, REVIEW, DRAFT
      expect(syncSpy).toHaveBeenNthCalledWith(1, estimates[0]); // SENT
      expect(syncSpy).toHaveBeenNthCalledWith(2, estimates[2]); // REVIEW
      expect(syncSpy).toHaveBeenNthCalledWith(3, estimates[1]); // DRAFT
    });
  });

  describe('Storage Management', () => {
    it('should clean up old offline data', async () => {
      const oldPhotos = [
        {
          tag: 'WW15-001',
          uri: 'old_photo.jpg',
          metadata: { timestamp: '2025-01-01T00:00:00Z' }, // Old photo
        },
        {
          tag: 'WW15-002',
          uri: 'new_photo.jpg',
          metadata: { timestamp: '2025-01-15T00:00:00Z' }, // Recent photo
        },
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(oldPhotos));

      await offlineSync.cleanupOldData({ maxAgeInDays: 7 });

      // Should only keep recent photos
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'offline_photos',
        JSON.stringify([oldPhotos[1]])
      );
    });

    it('should report storage usage', async () => {
      const photos = [
        { uri: 'photo1.jpg', metadata: { fileSize: 2 * 1024 * 1024 } }, // 2MB
        { uri: 'photo2.jpg', metadata: { fileSize: 3 * 1024 * 1024 } }, // 3MB
        { uri: 'photo3.jpg', metadata: { fileSize: 1.5 * 1024 * 1024 } }, // 1.5MB
      ];

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(photos));

      const usage = await offlineSync.getStorageUsage();

      expect(usage.totalSizeBytes).toBe(6.5 * 1024 * 1024); // 6.5MB
      expect(usage.photoCount).toBe(3);
    });

    it('should compress storage when nearing limit', async () => {
      const photos = Array.from({ length: 100 }, (_, i) => ({
        tag: `WW15-${String(i + 1).padStart(3, '0')}`,
        uri: `photo${i}.jpg`,
        metadata: {
          fileSize: 5 * 1024 * 1024, // 5MB each
          timestamp: new Date(2025, 0, i + 1).toISOString(),
        },
      }));

      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(photos));

      // Mock storage limit of 200MB
      const compressedPhotos = await offlineSync.compressOfflineStorage({
        maxSizeBytes: 200 * 1024 * 1024,
      });

      expect(compressedPhotos.length).toBeLessThan(100);
      expect(compressedPhotos.every(photo => 
        photo.metadata.fileSize <= 2 * 1024 * 1024 // Compressed to 2MB max
      )).toBe(true);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle storage quota exceeded errors', async () => {
      const mockPhoto = {
        uri: 'large_photo.jpg',
        metadata: { fileSize: 50 * 1024 * 1024 }, // 50MB
      };

      mockAsyncStorage.setItem.mockRejectedValue(
        new Error('QuotaExceededError: DOM Exception 22')
      );

      await expect(offlineSync.storePhoto(mockPhoto)).rejects.toThrow('Storage quota exceeded');
    });

    it('should recover from corrupted offline data', async () => {
      // Mock corrupted data
      mockAsyncStorage.getItem.mockResolvedValue('corrupted_json_data{');

      const photos = await offlineSync.getStoredPhotos();

      expect(photos).toEqual([]);
      // Should clear corrupted data
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('offline_photos');
    });

    it('should handle network timeouts gracefully', async () => {
      const mockPhoto = { uri: 'photo.jpg', tag: 'WW15-001' };

      // Mock timeout error
      mockApolloClient.mutate.mockRejectedValue(
        new Error('Network request timed out')
      );

      await expect(
        offlineSync.uploadPhoto(mockPhoto, { timeout: 5000 })
      ).rejects.toThrow('Network request timed out');

      // Photo should remain in offline storage for retry
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'failed_uploads',
        JSON.stringify([{ ...mockPhoto, lastAttempt: expect.any(String) }])
      );
    });

    it('should implement exponential backoff for retries', async () => {
      const mockPhoto = { uri: 'photo.jpg', tag: 'WW15-001' };

      mockApolloClient.mutate
        .mockRejectedValueOnce(new Error('Server error'))
        .mockRejectedValueOnce(new Error('Server error'))
        .mockResolvedValueOnce({
          data: { uploadPhoto: { url: 'success.jpg', success: true } },
        });

      const startTime = Date.now();
      await offlineSync.uploadPhoto(mockPhoto, { 
        retryCount: 3,
        exponentialBackoff: true,
      });
      const endTime = Date.now();

      // Should have waited with exponential backoff
      expect(endTime - startTime).toBeGreaterThan(3000); // At least 1s + 2s delays
      expect(mockApolloClient.mutate).toHaveBeenCalledTimes(3);
    });
  });
});