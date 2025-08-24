import React, { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CameraIcon,
  QrCodeIcon,
  CloudArrowUpIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { api } from '../services/api';
import { PhotoSession, CapturedPhoto } from '../types';
import PhotoCaptureWorkflow from '../components/PhotoCaptureWorkflow';
import QRLabelSystem from '../components/QRLabelSystem';
import BulkUploadZone from '../components/BulkUploadZone';
import ErrorBoundary from '../components/ErrorBoundary';
import { photoStorage, photoSyncManager, createCapturedPhoto } from '../utils/photoUtils';

interface PhotoMatch {
  file: {
    id: string;
    name: string;
    file: File;
  };
  itemId: string;
  angle: 'main' | 'detail' | 'label' | 'damage' | 'angle2' | 'angle3';
  confirmed: boolean;
}

const PhotoCapture: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'workflow' | 'qr' | 'bulk'>('workflow');
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [offlineQueue, setOfflineQueue] = useState<CapturedPhoto[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Fetch data
  const { data: itemsData, isLoading: itemsLoading, error: itemsError } = useQuery({
    queryKey: ['items'],
    queryFn: api.getItems,
    retry: 3,
  });

  const { data: roomsData, isLoading: roomsLoading, error: roomsError } = useQuery({
    queryKey: ['rooms'],
    queryFn: api.getRooms,
    retry: 3,
  });

  const items = Array.isArray(itemsData) ? itemsData : (itemsData?.items || itemsData || []);
  const rooms = Array.isArray(roomsData) ? roomsData : (roomsData?.rooms || roomsData || []);

  // Photo upload mutation
  const uploadPhotoMutation = useMutation({
    mutationFn: async ({ itemId, photo, angle }: {
      itemId: string;
      photo: CapturedPhoto;
      angle: string;
    }) => {
      const formData = new FormData();
      formData.append('photo', photo.blob, `${itemId}_${angle}_${Date.now()}.jpg`);
      formData.append('itemId', itemId);
      formData.append('angle', angle);
      formData.append('metadata', JSON.stringify(photo.metadata));

      // Simulate progress for demo
      setUploadProgress(prev => ({ ...prev, [photo.id]: 0 }));

      const response = await fetch('/api/items/photos', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      setUploadProgress(prev => ({ ...prev, [photo.id]: 100 }));
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['items'] });

      // Update photo as uploaded
      photoStorage.updatePhoto(variables.photo.id, { uploaded: true });

      // Remove from upload progress
      setTimeout(() => {
        setUploadProgress(prev => {
          const { [variables.photo.id]: _, ...rest } = prev;
          return rest;
        });
      }, 2000);
    },
    onError: (error, variables) => {
      console.error('Photo upload failed:', error);

      // Queue for background sync if offline
      if (!isOnline) {
        photoSyncManager.queuePhotoForSync(variables.photo.id);
      }
    }
  });

  // Handle photo updates from workflow
  const handlePhotosUpdated = useCallback(async (itemId: string, photos: CapturedPhoto[]) => {
    // Store photos locally first
    for (const photo of photos) {
      await photoStorage.storePhoto(photo);

      if (isOnline) {
        // Upload immediately if online
        uploadPhotoMutation.mutate({
          itemId,
          photo,
          angle: photo.angle
        });
      } else {
        // Queue for later sync
        photoSyncManager.queuePhotoForSync(photo.id);
      }
    }
  }, [isOnline, uploadPhotoMutation]);

  // Handle session save
  const handleSessionSaved = useCallback(async (session: PhotoSession) => {
    await photoStorage.storeSession(session);
    console.log('Photo session saved:', session.id);
  }, []);

  // Handle QR scanned photos
  const handleQRScanned = useCallback(async (itemId: string, photoFile: File) => {
    try {
      const photo = await createCapturedPhoto(photoFile, itemId, 'main');

      await handlePhotosUpdated(itemId, [photo]);
    } catch (error) {
      console.error('Failed to process QR scanned photo:', error);
    }
  }, [handlePhotosUpdated]);

  // Handle bulk upload matches
  const handlePhotosUploaded = useCallback(async (matches: PhotoMatch[]) => {
    for (const match of matches) {
      try {
        const photo = await createCapturedPhoto(match.file.file, match.itemId, match.angle);

        await handlePhotosUpdated(match.itemId, [photo]);
      } catch (error) {
        console.error('Failed to process bulk upload photo:', error);
      }
    }
  }, [handlePhotosUpdated]);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      photoSyncManager.retryFailedUploads();
    };

    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load offline queue
  useEffect(() => {
    const loadOfflineQueue = async () => {
      try {
        const pendingPhotos = await photoSyncManager.getPendingUploads();
        setOfflineQueue(pendingPhotos);
      } catch (error) {
        console.error('Failed to load offline queue:', error);
      }
    };

    loadOfflineQueue();
  }, []);

  if (itemsLoading || roomsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading inventory data...</p>
        </div>
      </div>
    );
  }

  if (itemsError || roomsError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-lg shadow-lg p-8 max-w-md">
          <div className="text-red-600 mb-4">
            <ExclamationTriangleIcon className="h-12 w-12 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Data</h2>
          <p className="text-gray-600 mb-6">
            Could not connect to the inventory system. Please check your connection and try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const photosNeeded = items.filter((item: any) => !item.images || item.images.length === 0);
  const progressPercent = items.length > 0 ? Math.round(((items.length - photosNeeded.length) / items.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.history.back()}
                className="inline-flex items-center text-gray-500 hover:text-gray-700"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Back to Inventory
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Photo Capture</h1>
                <p className="mt-1 text-sm text-gray-500">
                  {photosNeeded.length} of {items.length} items need photos ({progressPercent}% complete)
                </p>
              </div>
            </div>

            {/* Status indicators */}
            <div className="flex items-center space-x-4">
              {/* Online/Offline Status */}
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                isOnline ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isOnline ? 'bg-green-500' : 'bg-yellow-500'
                }`}></div>
                <span>{isOnline ? 'Online' : 'Offline'}</span>
              </div>

              {/* Upload Queue */}
              {offlineQueue.length > 0 && (
                <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm">
                  <CloudArrowUpIcon className="h-4 w-4" />
                  <span>{offlineQueue.length} queued</span>
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="pb-6">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Overall Progress</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('workflow')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'workflow'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <CameraIcon className="h-5 w-5" />
                <span>Batch Photography</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('qr')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'qr'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <QrCodeIcon className="h-5 w-5" />
                <span>QR Labels</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('bulk')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'bulk'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <CloudArrowUpIcon className="h-5 w-5" />
                <span>Bulk Upload</span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Upload Progress Indicators */}
        {Object.keys(uploadProgress).length > 0 && (
          <div className="mb-6 bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Uploading Photos</h3>
            <div className="space-y-2">
              {Object.entries(uploadProgress).map(([photoId, progress]) => (
                <div key={photoId} className="flex items-center space-x-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Photo {photoId.slice(-8)}</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1">
                      <div
                        className="bg-indigo-600 h-1 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                  {progress === 100 && (
                    <CheckCircleIcon className="h-4 w-4 text-green-500" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'workflow' && (
          <div className="bg-white rounded-lg p-4">
            <ErrorBoundary fallback={<div className="p-4 text-center text-red-600">Unable to load photo capture workflow. Please try refreshing the page.</div>}>
              <PhotoCaptureWorkflow
                items={items}
                rooms={rooms}
                onPhotosUpdated={handlePhotosUpdated}
                onSessionSaved={handleSessionSaved}
              />
            </ErrorBoundary>
          </div>
        )}

        {activeTab === 'qr' && (
          <div className="bg-white rounded-lg p-4">
            <ErrorBoundary fallback={<div className="p-4 text-center text-red-600">Unable to load QR label system. Please try refreshing the page.</div>}>
              <QRLabelSystem
                items={items}
                rooms={rooms}
                onQRScanned={handleQRScanned}
              />
            </ErrorBoundary>
          </div>
        )}

        {activeTab === 'bulk' && (
          <div className="bg-white rounded-lg p-4">
            <ErrorBoundary fallback={<div className="p-4 text-center text-red-600">Unable to load bulk upload zone. Please try refreshing the page.</div>}>
              <BulkUploadZone
                items={items}
                rooms={rooms}
                onPhotosUploaded={handlePhotosUploaded}
              />
            </ErrorBoundary>
          </div>
        )}

        {/* Offline Notice */}
        {!isOnline && (
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Working Offline
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    Photos will be saved locally and uploaded when you're back online.
                    {offlineQueue.length > 0 && ` ${offlineQueue.length} photos are queued for upload.`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhotoCapture;
