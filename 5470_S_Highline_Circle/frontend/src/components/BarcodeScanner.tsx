import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType, Html5QrcodeScannerConfig } from 'html5-qrcode';
import { 
  QrCodeIcon, 
  XMarkIcon, 
  CameraIcon,
  ExclamationTriangleIcon,
  CheckIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { useMobileGestures, useHapticFeedback } from '../hooks/useMobileGestures';

export interface ScanResult {
  text: string;
  type: 'QR_CODE' | 'CODE_128' | 'CODE_39' | 'EAN_13' | 'EAN_8' | 'UPC_A' | 'UPC_E' | 'UNKNOWN';
  rawData?: any;
  timestamp: Date;
}

interface BarcodeScannerProps {
  onScanSuccess: (result: ScanResult) => void;
  onScanError?: (error: string) => void;
  onClose?: () => void;
  supportedFormats?: Html5QrcodeScanType[];
  allowDuplicateScans?: boolean;
  continuousScanning?: boolean;
  className?: string;
}

const DEFAULT_SUPPORTED_FORMATS: Html5QrcodeScanType[] = [
  Html5QrcodeScanType.SCAN_TYPE_CAMERA
];

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onScanSuccess,
  onScanError,
  onClose,
  supportedFormats = DEFAULT_SUPPORTED_FORMATS,
  allowDuplicateScans = false,
  continuousScanning = true,
  className = ''
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const scannerElementRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<HTMLDivElement>(null);

  const { impact, notification } = useHapticFeedback();

  // Mobile gestures for enhanced UX
  const { isGesturing } = useMobileGestures(gestureRef, {
    // Double tap to toggle torch
    onDoubleTap: () => {
      toggleTorch();
    },
    // Long press to switch camera
    onLongPress: () => {
      impact('medium');
      flipCamera();
    },
    // Swipe gestures
    onSwipeUp: () => {
      if (onClose) {
        impact('light');
        onClose();
      }
    },
    disabled: !isScanning
  });

  // Request camera permission
  const requestCameraPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: facingMode } 
      });
      stream.getTracks().forEach(track => track.stop());
      setHasPermission(true);
      return true;
    } catch (error) {
      console.error('Camera permission denied:', error);
      setHasPermission(false);
      setError('Camera permission is required for barcode scanning.');
      return false;
    }
  }, [facingMode]);

  // Initialize scanner
  const initializeScanner = useCallback(async () => {
    if (!scannerElementRef.current) return;

    try {
      setError(null);

      // Request permission first
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) return;

      const config: Html5QrcodeScannerConfig = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        disableFlip: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        },
        rememberLastUsedCamera: true,
        supportedScanTypes: supportedFormats,
        videoConstraints: {
          facingMode: facingMode,
          advanced: [
            { torch: torchEnabled }
          ]
        },
        formatsToSupport: [
          Html5QrcodeScanType.SCAN_TYPE_CAMERA
        ]
      };

      scannerRef.current = new Html5QrcodeScanner(
        scannerElementRef.current.id,
        config,
        false
      );

      scannerRef.current.render(
        (decodedText, decodedResult) => {
          handleScanSuccess(decodedText, decodedResult);
        },
        (errorMessage) => {
          // Only log actual errors, not continuous scanning messages
          if (!errorMessage.includes('No QR code found')) {
            console.warn('Scan error:', errorMessage);
          }
        }
      );

      setIsScanning(true);
    } catch (error) {
      console.error('Scanner initialization error:', error);
      setError('Failed to initialize barcode scanner.');
      if (onScanError) {
        onScanError('Failed to initialize scanner');
      }
    }
  }, [facingMode, torchEnabled, supportedFormats, onScanError, requestCameraPermission]);

  // Handle successful scan
  const handleScanSuccess = useCallback((decodedText: string, decodedResult: any) => {
    // Prevent duplicate scans unless allowed
    if (!allowDuplicateScans && lastScan === decodedText) {
      return;
    }

    // Determine barcode type
    let type: ScanResult['type'] = 'UNKNOWN';
    if (decodedResult?.result?.format) {
      const format = decodedResult.result.format.formatName || decodedResult.result.format;
      switch (format.toUpperCase()) {
        case 'QR_CODE':
          type = 'QR_CODE';
          break;
        case 'CODE_128':
          type = 'CODE_128';
          break;
        case 'CODE_39':
          type = 'CODE_39';
          break;
        case 'EAN_13':
          type = 'EAN_13';
          break;
        case 'EAN_8':
          type = 'EAN_8';
          break;
        case 'UPC_A':
          type = 'UPC_A';
          break;
        case 'UPC_E':
          type = 'UPC_E';
          break;
        default:
          type = 'UNKNOWN';
      }
    }

    const scanResult: ScanResult = {
      text: decodedText,
      type,
      rawData: decodedResult,
      timestamp: new Date()
    };

    // Haptic feedback for successful scan
    notification('success');

    setLastScan(decodedText);
    setScanHistory(prev => [scanResult, ...prev].slice(0, 10)); // Keep last 10 scans
    
    onScanSuccess(scanResult);

    // Stop scanning if not continuous
    if (!continuousScanning) {
      stopScanner();
    }
  }, [lastScan, allowDuplicateScans, continuousScanning, onScanSuccess, notification]);

  // Stop scanner
  const stopScanner = useCallback(() => {
    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
        scannerRef.current = null;
      } catch (error) {
        console.warn('Error stopping scanner:', error);
      }
    }
    setIsScanning(false);
  }, []);

  // Flip camera
  const flipCamera = useCallback(() => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
    
    if (isScanning) {
      stopScanner();
      setTimeout(() => {
        initializeScanner();
      }, 100);
    }
  }, [facingMode, isScanning, stopScanner, initializeScanner]);

  // Toggle torch (flash)
  const toggleTorch = useCallback(async () => {
    if (facingMode === 'user') return; // Torch not available on front camera

    setTorchEnabled(!torchEnabled);
    
    // Restart scanner with new torch setting
    if (isScanning) {
      stopScanner();
      setTimeout(() => {
        initializeScanner();
      }, 100);
    }
  }, [torchEnabled, facingMode, isScanning, stopScanner, initializeScanner]);

  // Initialize scanner on mount
  useEffect(() => {
    initializeScanner();

    return () => {
      stopScanner();
    };
  }, []);

  // Handle permission changes
  useEffect(() => {
    if (hasPermission === false && onScanError) {
      onScanError('Camera permission denied');
    }
  }, [hasPermission, onScanError]);

  return (
    <div 
      ref={gestureRef}
      className={`relative w-full h-full bg-black ${className}`}
    >
      {/* Scanner container */}
      <div 
        id="barcode-scanner" 
        ref={scannerElementRef}
        className="w-full h-full"
      />

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-90 text-white p-6 z-10">
          <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mb-4" />
          <h3 className="text-lg font-medium mb-2">Scanner Error</h3>
          <p className="text-gray-300 text-center mb-6">{error}</p>
          <div className="flex space-x-4">
            <button
              onClick={initializeScanner}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Retry
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}

      {/* No permission state */}
      {hasPermission === false && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-90 text-white p-6 z-10">
          <CameraIcon className="h-16 w-16 text-gray-500 mb-4" />
          <h3 className="text-lg font-medium mb-2">Camera Permission Required</h3>
          <p className="text-gray-300 text-center mb-6">
            Please allow camera access to scan barcodes and QR codes.
          </p>
          <button
            onClick={requestCameraPermission}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Grant Permission
          </button>
        </div>
      )}

      {/* Controls overlay */}
      {isScanning && (
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-20">
          <div className="bg-black bg-opacity-50 rounded-lg px-3 py-2">
            <span className="text-white text-sm">
              {scanHistory.length > 0 ? `${scanHistory.length} scanned` : 'Scanning...'}
            </span>
          </div>

          <div className="flex space-x-2">
            {/* Torch toggle (rear camera only) */}
            {facingMode === 'environment' && (
              <button
                onClick={toggleTorch}
                className={`p-2 rounded-full bg-black bg-opacity-50 ${
                  torchEnabled ? 'text-yellow-400' : 'text-white'
                }`}
                title="Toggle flashlight"
              >
                {torchEnabled ? '🔦' : '💡'}
              </button>
            )}

            {/* Camera flip */}
            <button
              onClick={flipCamera}
              className="p-2 rounded-full bg-black bg-opacity-50 text-white"
              title="Switch camera"
            >
              <ArrowPathIcon className="h-5 w-5" />
            </button>

            {/* Close button */}
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-black bg-opacity-50 text-white"
                title="Close scanner"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Scan history */}
      {scanHistory.length > 0 && (
        <div className="absolute bottom-4 left-4 right-4 z-20">
          <div className="bg-black bg-opacity-70 rounded-lg p-3 max-h-32 overflow-y-auto">
            <h4 className="text-white text-sm font-medium mb-2">Recent Scans</h4>
            <div className="space-y-1">
              {scanHistory.slice(0, 3).map((scan, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <CheckIcon className="h-4 w-4 text-green-400 flex-shrink-0" />
                  <span className="text-white text-xs font-mono truncate">
                    {scan.text}
                  </span>
                  <span className="text-gray-400 text-xs flex-shrink-0">
                    {scan.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      {isScanning && scanHistory.length === 0 && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-20">
          <div className="bg-black bg-opacity-50 rounded-lg px-4 py-2">
            <p className="text-white text-sm text-center">
              Point camera at barcode or QR code
            </p>
            <p className="text-gray-300 text-xs text-center mt-1">
              Double tap for flash • Long press to switch camera
            </p>
          </div>
        </div>
      )}

      {/* Scanning animation overlay */}
      {isScanning && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="w-64 h-64 border-2 border-white border-opacity-30 rounded-lg relative">
            <div className="absolute inset-0 border-2 border-indigo-500 rounded-lg animate-pulse opacity-50"></div>
            {/* Scanning line animation */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-indigo-500 to-transparent animate-bounce"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BarcodeScanner;