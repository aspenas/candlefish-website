import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { CameraScreen } from '../../src/screens/CameraScreen';
import { cameraService } from '../../src/services/cameraService';
import { offlineSync } from '../../src/services/offlineSync';

// Mock dependencies
jest.mock('react-native-camera', () => ({
  RNCamera: {
    Constants: {
      Type: { back: 'back', front: 'front' },
      FlashMode: { off: 'off', on: 'on', auto: 'auto' },
    },
  },
}));

jest.mock('../../src/services/cameraService');
jest.mock('../../src/services/offlineSync');
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: { alert: jest.fn() },
  PermissionsAndroid: {
    request: jest.fn(),
    PERMISSIONS: { ANDROID: { CAMERA: 'android.permission.CAMERA' } },
    RESULTS: { GRANTED: 'granted' },
  },
}));

const mockCameraService = cameraService as jest.Mocked<typeof cameraService>;
const mockOfflineSync = offlineSync as jest.Mocked<typeof offlineSync>;

describe('CameraScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    setParams: jest.fn(),
  };

  const defaultRoute = {
    params: {
      estimateId: 'estimate1',
      roomId: 'kitchen',
      tagPrefix: 'WW15',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCameraService.hasPermission.mockResolvedValue(true);
    mockCameraService.capturePhoto.mockResolvedValue({
      uri: 'file:///path/to/photo.jpg',
      width: 1920,
      height: 1080,
      exif: {},
    });
  });

  it('should render camera interface with controls', () => {
    const { getByTestId } = render(
      <CameraScreen navigation={mockNavigation} route={defaultRoute} />
    );

    expect(getByTestId('camera-view')).toBeTruthy();
    expect(getByTestId('capture-button')).toBeTruthy();
    expect(getByTestId('flash-toggle')).toBeTruthy();
    expect(getByTestId('camera-flip')).toBeTruthy();
    expect(getByTestId('gallery-button')).toBeTruthy();
  });

  it('should check camera permissions on mount', async () => {
    render(<CameraScreen navigation={mockNavigation} route={defaultRoute} />);

    await waitFor(() => {
      expect(mockCameraService.hasPermission).toHaveBeenCalled();
    });
  });

  it('should request permissions if not granted', async () => {
    mockCameraService.hasPermission.mockResolvedValue(false);
    mockCameraService.requestPermission.mockResolvedValue(true);

    render(<CameraScreen navigation={mockNavigation} route={defaultRoute} />);

    await waitFor(() => {
      expect(mockCameraService.requestPermission).toHaveBeenCalled();
    });
  });

  it('should show error if camera permissions denied', async () => {
    mockCameraService.hasPermission.mockResolvedValue(false);
    mockCameraService.requestPermission.mockResolvedValue(false);

    render(<CameraScreen navigation={mockNavigation} route={defaultRoute} />);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Camera Permission Required',
        'Please enable camera access in your device settings to take photos.',
        expect.any(Array)
      );
    });
  });

  it('should capture photo with WW tag when capture button pressed', async () => {
    const { getByTestId } = render(
      <CameraScreen navigation={mockNavigation} route={defaultRoute} />
    );

    const captureButton = getByTestId('capture-button');
    fireEvent.press(captureButton);

    await waitFor(() => {
      expect(mockCameraService.capturePhoto).toHaveBeenCalledWith(
        expect.objectContaining({
          tagPrefix: 'WW15',
          estimateId: 'estimate1',
          roomId: 'kitchen',
        })
      );
    });
  });

  it('should generate sequential WW tags (WW15-001, WW15-002, etc.)', async () => {
    const { getByTestId } = render(
      <CameraScreen navigation={mockNavigation} route={defaultRoute} />
    );

    const captureButton = getByTestId('capture-button');

    // Take first photo
    fireEvent.press(captureButton);
    await waitFor(() => {
      expect(mockCameraService.capturePhoto).toHaveBeenLastCalledWith(
        expect.objectContaining({
          filename: expect.stringMatching(/WW15-001/)
        })
      );
    });

    // Take second photo
    fireEvent.press(captureButton);
    await waitFor(() => {
      expect(mockCameraService.capturePhoto).toHaveBeenLastCalledWith(
        expect.objectContaining({
          filename: expect.stringMatching(/WW15-002/)
        })
      );
    });
  });

  it('should toggle flash mode', async () => {
    const { getByTestId } = render(
      <CameraScreen navigation={mockNavigation} route={defaultRoute} />
    );

    const flashToggle = getByTestId('flash-toggle');
    
    // Initial state should be off
    expect(getByTestId('flash-icon')).toHaveProp('name', 'flash-off');

    fireEvent.press(flashToggle);
    expect(getByTestId('flash-icon')).toHaveProp('name', 'flash-on');

    fireEvent.press(flashToggle);
    expect(getByTestId('flash-icon')).toHaveProp('name', 'flash-auto');

    fireEvent.press(flashToggle);
    expect(getByTestId('flash-icon')).toHaveProp('name', 'flash-off');
  });

  it('should flip between front and back camera', async () => {
    const { getByTestId } = render(
      <CameraScreen navigation={mockNavigation} route={defaultRoute} />
    );

    const flipButton = getByTestId('camera-flip');
    fireEvent.press(flipButton);

    // Should trigger camera type change
    expect(getByTestId('camera-view')).toHaveProp('type', 'front');

    fireEvent.press(flipButton);
    expect(getByTestId('camera-view')).toHaveProp('type', 'back');
  });

  it('should save photos to offline storage when no network', async () => {
    mockOfflineSync.isOnline.mockReturnValue(false);

    const { getByTestId } = render(
      <CameraScreen navigation={mockNavigation} route={defaultRoute} />
    );

    const captureButton = getByTestId('capture-button');
    fireEvent.press(captureButton);

    await waitFor(() => {
      expect(mockOfflineSync.storePhoto).toHaveBeenCalledWith({
        uri: 'file:///path/to/photo.jpg',
        estimateId: 'estimate1',
        roomId: 'kitchen',
        tag: expect.stringMatching(/WW15-\d{3}/),
        metadata: expect.objectContaining({
          timestamp: expect.any(String),
          location: expect.any(Object),
        }),
      });
    });
  });

  it('should upload photos immediately when online', async () => {
    mockOfflineSync.isOnline.mockReturnValue(true);
    mockOfflineSync.uploadPhoto.mockResolvedValue({ url: 'https://example.com/photo.jpg' });

    const { getByTestId } = render(
      <CameraScreen navigation={mockNavigation} route={defaultRoute} />
    );

    const captureButton = getByTestId('capture-button');
    fireEvent.press(captureButton);

    await waitFor(() => {
      expect(mockOfflineSync.uploadPhoto).toHaveBeenCalledWith({
        uri: 'file:///path/to/photo.jpg',
        estimateId: 'estimate1',
        roomId: 'kitchen',
        tag: expect.stringMatching(/WW15-\d{3}/),
        metadata: expect.objectContaining({
          timestamp: expect.any(String),
          location: expect.any(Object),
        }),
      });
    });
  });

  it('should show photo count and storage indicator', async () => {
    const { getByTestId, getByText } = render(
      <CameraScreen navigation={mockNavigation} route={defaultRoute} />
    );

    expect(getByText('0 photos')).toBeTruthy();

    const captureButton = getByTestId('capture-button');
    fireEvent.press(captureButton);

    await waitFor(() => {
      expect(getByText('1 photo')).toBeTruthy();
    });

    fireEvent.press(captureButton);
    await waitFor(() => {
      expect(getByText('2 photos')).toBeTruthy();
    });
  });

  it('should handle camera errors gracefully', async () => {
    mockCameraService.capturePhoto.mockRejectedValue(new Error('Camera hardware error'));

    const { getByTestId } = render(
      <CameraScreen navigation={mockNavigation} route={defaultRoute} />
    );

    const captureButton = getByTestId('capture-button');
    fireEvent.press(captureButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Camera Error',
        'Unable to capture photo. Please try again.',
        expect.any(Array)
      );
    });
  });

  it('should add GPS coordinates to photo metadata', async () => {
    const mockLocation = {
      latitude: 40.7128,
      longitude: -74.0060,
      accuracy: 10,
    };

    mockCameraService.getCurrentLocation.mockResolvedValue(mockLocation);

    const { getByTestId } = render(
      <CameraScreen navigation={mockNavigation} route={defaultRoute} />
    );

    const captureButton = getByTestId('capture-button');
    fireEvent.press(captureButton);

    await waitFor(() => {
      expect(mockOfflineSync.storePhoto).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            location: mockLocation,
          }),
        })
      );
    });
  });

  it('should handle location permission denied', async () => {
    mockCameraService.getCurrentLocation.mockRejectedValue(
      new Error('Location permission denied')
    );

    const { getByTestId } = render(
      <CameraScreen navigation={mockNavigation} route={defaultRoute} />
    );

    const captureButton = getByTestId('capture-button');
    fireEvent.press(captureButton);

    await waitFor(() => {
      expect(mockOfflineSync.storePhoto).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            location: null,
          }),
        })
      );
    });
  });

  it('should navigate to gallery when gallery button pressed', () => {
    const { getByTestId } = render(
      <CameraScreen navigation={mockNavigation} route={defaultRoute} />
    );

    const galleryButton = getByTestId('gallery-button');
    fireEvent.press(galleryButton);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('Gallery', {
      estimateId: 'estimate1',
      roomId: 'kitchen',
    });
  });

  it('should show offline indicator when no network', () => {
    mockOfflineSync.isOnline.mockReturnValue(false);

    const { getByTestId } = render(
      <CameraScreen navigation={mockNavigation} route={defaultRoute} />
    );

    expect(getByTestId('offline-indicator')).toBeTruthy();
  });

  it('should handle different WW tag ranges (WW1-WW30)', async () => {
    const testCases = [
      { tagPrefix: 'WW1', expected: /WW1-\d{3}/ },
      { tagPrefix: 'WW15', expected: /WW15-\d{3}/ },
      { tagPrefix: 'WW30', expected: /WW30-\d{3}/ },
    ];

    for (const testCase of testCases) {
      const route = {
        params: {
          ...defaultRoute.params,
          tagPrefix: testCase.tagPrefix,
        },
      };

      const { getByTestId, unmount } = render(
        <CameraScreen navigation={mockNavigation} route={route} />
      );

      const captureButton = getByTestId('capture-button');
      fireEvent.press(captureButton);

      await waitFor(() => {
        expect(mockCameraService.capturePhoto).toHaveBeenLastCalledWith(
          expect.objectContaining({
            filename: expect.stringMatching(testCase.expected),
          })
        );
      });

      unmount();
    }
  });

  it('should maintain photo sequence across app restarts', async () => {
    // Mock existing photos in storage
    mockOfflineSync.getStoredPhotos.mockResolvedValue([
      { tag: 'WW15-001' },
      { tag: 'WW15-002' },
      { tag: 'WW15-005' }, // Gap in sequence
    ]);

    const { getByTestId } = render(
      <CameraScreen navigation={mockNavigation} route={defaultRoute} />
    );

    const captureButton = getByTestId('capture-button');
    fireEvent.press(captureButton);

    await waitFor(() => {
      expect(mockCameraService.capturePhoto).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: expect.stringMatching(/WW15-006/), // Should continue from highest
        })
      );
    });
  });

  it('should handle low storage warning', async () => {
    mockCameraService.getAvailableStorage.mockResolvedValue(100); // 100MB

    const { getByTestId } = render(
      <CameraScreen navigation={mockNavigation} route={defaultRoute} />
    );

    await waitFor(() => {
      expect(getByTestId('storage-warning')).toBeTruthy();
    });
  });

  it('should disable capture when storage critically low', async () => {
    mockCameraService.getAvailableStorage.mockResolvedValue(10); // 10MB

    const { getByTestId } = render(
      <CameraScreen navigation={mockNavigation} route={defaultRoute} />
    );

    const captureButton = getByTestId('capture-button');
    
    await waitFor(() => {
      expect(captureButton).toHaveProp('disabled', true);
    });
  });

  it('should compress images for better storage efficiency', async () => {
    const { getByTestId } = render(
      <CameraScreen navigation={mockNavigation} route={defaultRoute} />
    );

    const captureButton = getByTestId('capture-button');
    fireEvent.press(captureButton);

    await waitFor(() => {
      expect(mockCameraService.capturePhoto).toHaveBeenCalledWith(
        expect.objectContaining({
          quality: 0.8, // 80% quality for good balance
          maxWidth: 1920,
          maxHeight: 1080,
        })
      );
    });
  });

  it('should show upload progress indicator', async () => {
    mockOfflineSync.isOnline.mockReturnValue(true);
    let uploadResolve: (value: any) => void;
    const uploadPromise = new Promise(resolve => {
      uploadResolve = resolve;
    });
    mockOfflineSync.uploadPhoto.mockReturnValue(uploadPromise as any);

    const { getByTestId } = render(
      <CameraScreen navigation={mockNavigation} route={defaultRoute} />
    );

    const captureButton = getByTestId('capture-button');
    fireEvent.press(captureButton);

    await waitFor(() => {
      expect(getByTestId('upload-progress')).toBeTruthy();
    });

    uploadResolve!({ url: 'https://example.com/photo.jpg' });

    await waitFor(() => {
      expect(() => getByTestId('upload-progress')).toThrow();
    });
  });
});