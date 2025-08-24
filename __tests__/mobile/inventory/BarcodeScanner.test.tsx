import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { BarcodeScanner } from '../../../apps/mobile-inventory/src/components/BarcodeScanner';
import { store } from '../../../apps/mobile-inventory/src/store';

// Mock React Navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: {
      onScan: jest.fn(),
    },
  }),
}));

// Mock expo-camera
const mockCamera = {
  takePictureAsync: jest.fn(),
  resumePreview: jest.fn(),
  pausePreview: jest.fn(),
};

jest.mock('expo-camera', () => ({
  Camera: {
    requestCameraPermissionsAsync: jest.fn(() =>
      Promise.resolve({ status: 'granted' })
    ),
    Constants: {
      Type: { back: 'back', front: 'front' },
      FlashMode: { on: 'on', off: 'off', auto: 'auto' },
    },
  },
}));

// Mock expo-barcode-scanner
jest.mock('expo-barcode-scanner', () => ({
  BarCodeScanner: {
    requestPermissionsAsync: jest.fn(() =>
      Promise.resolve({ status: 'granted' })
    ),
    Constants: {
      BarCodeType: {
        qr: 'qr',
        pdf417: 'pdf417',
        aztec: 'aztec',
        ean13: 'ean13',
        ean8: 'ean8',
        exp_pdf417: 'exp_pdf417',
        exp_qr: 'exp_qr',
        exp_aztec: 'exp_aztec',
        exp_codabar: 'exp_codabar',
        exp_code39: 'exp_code39',
        exp_code93: 'exp_code93',
        exp_code128: 'exp_code128',
        exp_datamatrix: 'exp_datamatrix',
        exp_ean13: 'exp_ean13',
        exp_ean8: 'exp_ean8',
        exp_interleaved2of5: 'exp_interleaved2of5',
        exp_itf14: 'exp_itf14',
        exp_maxicode: 'exp_maxicode',
        exp_rss14: 'exp_rss14',
        exp_rss_expanded: 'exp_rss_expanded',
        exp_upc_a: 'exp_upc_a',
        exp_upc_e: 'exp_upc_e',
        exp_upc_ean: 'exp_upc_ean',
      },
    },
  },
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
}));

// Mock expo-av
jest.mock('expo-av', () => ({
  Audio: {
    Sound: {
      createAsync: jest.fn(() => Promise.resolve({
        sound: {
          playAsync: jest.fn(),
          unloadAsync: jest.fn(),
        },
      })),
    },
  },
}));

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <NavigationContainer>
    <Provider store={store}>
      {children}
    </Provider>
  </NavigationContainer>
);

describe('BarcodeScanner Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should request camera permissions on mount', async () => {
    const { Camera } = require('expo-camera');
    const { BarCodeScanner } = require('expo-barcode-scanner');

    render(
      <TestWrapper>
        <BarcodeScanner />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(Camera.requestCameraPermissionsAsync).toHaveBeenCalled();
      expect(BarCodeScanner.requestPermissionsAsync).toHaveBeenCalled();
    });
  });

  it('should show permission denied message when camera access is denied', async () => {
    const { Camera } = require('expo-camera');
    const { BarCodeScanner } = require('expo-barcode-scanner');

    Camera.requestCameraPermissionsAsync.mockResolvedValue({ status: 'denied' });
    BarCodeScanner.requestPermissionsAsync.mockResolvedValue({ status: 'denied' });

    render(
      <TestWrapper>
        <BarcodeScanner />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Camera access is required to scan barcodes')).toBeTruthy();
    });

    expect(screen.getByText('Grant Permission')).toBeTruthy();
  });

  it('should display camera view when permissions are granted', async () => {
    render(
      <TestWrapper>
        <BarcodeScanner />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('camera-view')).toBeTruthy();
    });

    expect(screen.getByTestId('scan-overlay')).toBeTruthy();
    expect(screen.getByText('Point camera at barcode')).toBeTruthy();
  });

  it('should handle barcode scan successfully', async () => {
    const mockOnScan = jest.fn();
    const { useRoute } = require('@react-navigation/native');
    useRoute.mockReturnValue({
      params: { onScan: mockOnScan },
    });

    render(
      <TestWrapper>
        <BarcodeScanner />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('camera-view')).toBeTruthy();
    });

    // Simulate barcode scan
    const cameraView = screen.getByTestId('camera-view');
    fireEvent(cameraView, 'onBarCodeScanned', {
      type: 'ean13',
      data: '1234567890123',
      bounds: {
        origin: { x: 100, y: 100 },
        size: { width: 200, height: 50 },
      },
    });

    // Should trigger haptic feedback
    const Haptics = require('expo-haptics');
    expect(Haptics.impactAsync).toHaveBeenCalledWith(
      Haptics.ImpactFeedbackStyle.Medium
    );

    // Should play scan sound
    const { Audio } = require('expo-av');
    expect(Audio.Sound.createAsync).toHaveBeenCalled();

    // Should show scan success animation
    expect(screen.getByTestId('scan-success-animation')).toBeTruthy();

    // Should call onScan callback
    expect(mockOnScan).toHaveBeenCalledWith('1234567890123', 'ean13');

    // Should navigate back
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('should handle invalid barcode format', async () => {
    render(
      <TestWrapper>
        <BarcodeScanner />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('camera-view')).toBeTruthy();
    });

    // Simulate invalid barcode scan
    const cameraView = screen.getByTestId('camera-view');
    fireEvent(cameraView, 'onBarCodeScanned', {
      type: 'qr',
      data: 'invalid-barcode-data',
    });

    // Should show error message
    expect(screen.getByText('Invalid barcode format')).toBeTruthy();
    expect(screen.getByText('Please scan a valid product barcode')).toBeTruthy();
  });

  it('should toggle flash light', async () => {
    render(
      <TestWrapper>
        <BarcodeScanner />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('camera-view')).toBeTruthy();
    });

    // Toggle flash on
    const flashButton = screen.getByTestId('flash-toggle-button');
    fireEvent.press(flashButton);

    expect(screen.getByTestId('flash-on-icon')).toBeTruthy();

    // Toggle flash off
    fireEvent.press(flashButton);
    expect(screen.getByTestId('flash-off-icon')).toBeTruthy();
  });

  it('should switch camera between front and back', async () => {
    render(
      <TestWrapper>
        <BarcodeScanner />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('camera-view')).toBeTruthy();
    });

    // Switch to front camera
    const flipButton = screen.getByTestId('camera-flip-button');
    fireEvent.press(flipButton);

    // Verify camera type change
    const cameraView = screen.getByTestId('camera-view');
    expect(cameraView.props.type).toBe('front');

    // Switch back to rear camera
    fireEvent.press(flipButton);
    expect(cameraView.props.type).toBe('back');
  });

  it('should handle manual barcode input', async () => {
    render(
      <TestWrapper>
        <BarcodeScanner />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('camera-view')).toBeTruthy();
    });

    // Open manual input
    const manualInputButton = screen.getByTestId('manual-input-button');
    fireEvent.press(manualInputButton);

    // Should show input modal
    expect(screen.getByText('Enter Barcode Manually')).toBeTruthy();

    // Enter barcode manually
    const barcodeInput = screen.getByPlaceholderText('Enter barcode number');
    fireEvent.changeText(barcodeInput, '9876543210987');

    const submitButton = screen.getByText('Submit');
    fireEvent.press(submitButton);

    // Should process manual barcode
    expect(screen.getByTestId('scan-success-animation')).toBeTruthy();
  });

  it('should validate manual barcode input', async () => {
    render(
      <TestWrapper>
        <BarcodeScanner />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('camera-view')).toBeTruthy();
    });

    // Open manual input
    const manualInputButton = screen.getByTestId('manual-input-button');
    fireEvent.press(manualInputButton);

    // Enter invalid barcode
    const barcodeInput = screen.getByPlaceholderText('Enter barcode number');
    fireEvent.changeText(barcodeInput, '123'); // Too short

    const submitButton = screen.getByText('Submit');
    fireEvent.press(submitButton);

    // Should show validation error
    expect(screen.getByText('Please enter a valid barcode (8-13 digits)')).toBeTruthy();
  });

  it('should display scan history', async () => {
    render(
      <TestWrapper>
        <BarcodeScanner />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('camera-view')).toBeTruthy();
    });

    // Open scan history
    const historyButton = screen.getByTestId('scan-history-button');
    fireEvent.press(historyButton);

    // Should show history modal
    expect(screen.getByText('Recent Scans')).toBeTruthy();
    expect(screen.getByText('No recent scans')).toBeTruthy();

    // Simulate having scan history
    // This would typically come from Redux store or AsyncStorage
  });

  it('should handle zoom functionality', async () => {
    render(
      <TestWrapper>
        <BarcodeScanner />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('camera-view')).toBeTruthy();
    });

    // Test pinch gesture for zoom
    const cameraView = screen.getByTestId('camera-view');
    fireEvent(cameraView, 'onPinchGestureEvent', {
      nativeEvent: { scale: 2.0 },
    });

    // Should update zoom level indicator
    expect(screen.getByText('2.0x')).toBeTruthy();
  });

  it('should provide scanning guidance', async () => {
    render(
      <TestWrapper>
        <BarcodeScanner />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('camera-view')).toBeTruthy();
    });

    // Should show scanning instructions
    expect(screen.getByText('Point camera at barcode')).toBeTruthy();
    expect(screen.getByTestId('scan-frame')).toBeTruthy();

    // Should show tips button
    const tipsButton = screen.getByTestId('scanning-tips-button');
    fireEvent.press(tipsButton);

    expect(screen.getByText('Scanning Tips')).toBeTruthy();
    expect(screen.getByText('• Hold camera steady')).toBeTruthy();
    expect(screen.getByText('• Ensure good lighting')).toBeTruthy();
    expect(screen.getByText('• Keep barcode flat')).toBeTruthy();
  });

  it('should handle low light detection', async () => {
    render(
      <TestWrapper>
        <BarcodeScanner />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('camera-view')).toBeTruthy();
    });

    // Simulate low light conditions
    fireEvent(screen.getByTestId('camera-view'), 'onCameraReady');

    // Mock low light detection
    fireEvent(screen.getByTestId('camera-view'), 'onLowLightDetected', {
      isLowLight: true,
    });

    // Should show low light warning
    expect(screen.getByText('Low light detected')).toBeTruthy();
    expect(screen.getByText('Turn on flash for better results')).toBeTruthy();
  });

  it('should handle camera focus', async () => {
    render(
      <TestWrapper>
        <BarcodeScanner />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('camera-view')).toBeTruthy();
    });

    // Tap to focus
    const cameraView = screen.getByTestId('camera-view');
    fireEvent(cameraView, 'onPress', {
      nativeEvent: { locationX: 200, locationY: 300 },
    });

    // Should show focus indicator
    expect(screen.getByTestId('focus-indicator')).toBeTruthy();
  });

  it('should handle multiple barcode detection', async () => {
    render(
      <TestWrapper>
        <BarcodeScanner enableMultipleScans={true} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('camera-view')).toBeTruthy();
    });

    // Scan first barcode
    const cameraView = screen.getByTestId('camera-view');
    fireEvent(cameraView, 'onBarCodeScanned', {
      type: 'ean13',
      data: '1234567890123',
    });

    // Should show scan count
    expect(screen.getByText('1 item scanned')).toBeTruthy();

    // Scan second barcode
    fireEvent(cameraView, 'onBarCodeScanned', {
      type: 'ean13',
      data: '9876543210987',
    });

    expect(screen.getByText('2 items scanned')).toBeTruthy();

    // Should show finish scanning button
    const finishButton = screen.getByText('Finish Scanning');
    fireEvent.press(finishButton);

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('should handle barcode type filtering', async () => {
    render(
      <TestWrapper>
        <BarcodeScanner
          acceptedBarcodeTypes={['ean13', 'ean8', 'upc_a']}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('camera-view')).toBeTruthy();
    });

    // Scan accepted barcode type
    const cameraView = screen.getByTestId('camera-view');
    fireEvent(cameraView, 'onBarCodeScanned', {
      type: 'ean13',
      data: '1234567890123',
    });

    expect(screen.getByTestId('scan-success-animation')).toBeTruthy();

    // Clear previous scan
    jest.clearAllMocks();

    // Scan non-accepted barcode type
    fireEvent(cameraView, 'onBarCodeScanned', {
      type: 'qr',
      data: 'https://example.com',
    });

    // Should show type not supported message
    expect(screen.getByText('Barcode type not supported')).toBeTruthy();
    expect(screen.queryByTestId('scan-success-animation')).toBeFalsy();
  });

  it('should handle camera initialization errors', async () => {
    const { Camera } = require('expo-camera');
    Camera.requestCameraPermissionsAsync.mockRejectedValue(
      new Error('Camera initialization failed')
    );

    render(
      <TestWrapper>
        <BarcodeScanner />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Camera Error')).toBeTruthy();
    });

    expect(screen.getByText('Unable to initialize camera')).toBeTruthy();
    expect(screen.getByText('Retry')).toBeTruthy();
  });

  it('should handle device orientation changes', async () => {
    render(
      <TestWrapper>
        <BarcodeScanner />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('camera-view')).toBeTruthy();
    });

    // Simulate orientation change
    fireEvent(screen.getByTestId('camera-view'), 'onOrientationChange', {
      orientation: 'landscape',
    });

    // Should adjust camera preview accordingly
    const scanFrame = screen.getByTestId('scan-frame');
    expect(scanFrame.props.style).toMatchObject({
      width: expect.any(Number),
      height: expect.any(Number),
    });
  });

  it('should support accessibility features', async () => {
    render(
      <TestWrapper>
        <BarcodeScanner />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('camera-view')).toBeTruthy();
    });

    // Check accessibility labels
    const flashButton = screen.getByTestId('flash-toggle-button');
    expect(flashButton).toHaveProp('accessibilityLabel', 'Toggle flash');
    expect(flashButton).toHaveProp('accessibilityRole', 'button');

    const flipButton = screen.getByTestId('camera-flip-button');
    expect(flipButton).toHaveProp('accessibilityLabel', 'Switch camera');

    const manualInputButton = screen.getByTestId('manual-input-button');
    expect(manualInputButton).toHaveProp('accessibilityLabel', 'Enter barcode manually');
  });

  it('should announce scan results to screen readers', async () => {
    render(
      <TestWrapper>
        <BarcodeScanner />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('camera-view')).toBeTruthy();
    });

    // Scan barcode
    const cameraView = screen.getByTestId('camera-view');
    fireEvent(cameraView, 'onBarCodeScanned', {
      type: 'ean13',
      data: '1234567890123',
    });

    // Should announce scan result
    const announcement = screen.getByTestId('scan-announcement');
    expect(announcement).toHaveProp('accessibilityLiveRegion', 'polite');
    expect(announcement).toHaveProp('accessibilityLabel', 'Barcode scanned: 1234567890123');
  });
});
