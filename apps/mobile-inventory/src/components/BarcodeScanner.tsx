import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Vibration,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { Camera } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

interface BarcodeScannerProps {
  onBarcodeScanned: (barcode: string, type: string) => void;
  onClose: () => void;
  showManualEntry?: boolean;
  onManualEntry?: () => void;
  isActive?: boolean;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onBarcodeScanned,
  onClose,
  showManualEntry = true,
  onManualEntry,
  isActive = true,
}) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [cameraType, setCameraType] = useState(Camera.Constants.Type.back);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    try {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');

      if (status !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'Please enable camera permission in settings to scan barcodes.',
          [
            { text: 'Cancel', onPress: onClose },
            { text: 'Settings', onPress: () => {/* Open settings */} },
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      Alert.alert('Error', 'Failed to request camera permission');
    }
  };

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (!isActive || scanned) return;

    setScanned(true);

    // Haptic feedback
    if (Platform.OS === 'ios') {
      Vibration.vibrate([0, 200]);
    } else {
      Vibration.vibrate(200);
    }

    // Call the callback with scanned data
    onBarcodeScanned(data, type);

    // Reset scanner after 2 seconds
    setTimeout(() => {
      setScanned(false);
    }, 2000);
  };

  const toggleFlash = () => {
    setFlashOn(!flashOn);
  };

  const toggleCameraType = () => {
    setCameraType(
      cameraType === Camera.Constants.Type.back
        ? Camera.Constants.Type.front
        : Camera.Constants.Type.back
    );
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-off" size={64} color="#666" />
          <Text style={styles.noAccessText}>
            Camera access is required to scan barcodes
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={requestCameraPermission}>
            <Text style={styles.retryButtonText}>Retry Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <BarCodeScanner
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        style={StyleSheet.absoluteFillObject}
        type={cameraType}
        flashMode={flashOn ? Camera.Constants.FlashMode.torch : Camera.Constants.FlashMode.off}
        barCodeTypes={[
          BarCodeScanner.Constants.BarCodeType.qr,
          BarCodeScanner.Constants.BarCodeType.ean13,
          BarCodeScanner.Constants.BarCodeType.ean8,
          BarCodeScanner.Constants.BarCodeType.code128,
          BarCodeScanner.Constants.BarCodeType.code39,
          BarCodeScanner.Constants.BarCodeType.code93,
          BarCodeScanner.Constants.BarCodeType.codabar,
          BarCodeScanner.Constants.BarCodeType.upc_a,
          BarCodeScanner.Constants.BarCodeType.upc_e,
          BarCodeScanner.Constants.BarCodeType.pdf417,
          BarCodeScanner.Constants.BarCodeType.aztec,
          BarCodeScanner.Constants.BarCodeType.datamatrix,
        ]}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Top overlay */}
        <BlurView intensity={50} style={[styles.overlaySection, styles.topOverlay]} />

        {/* Middle section with scanning area */}
        <View style={styles.middleSection}>
          <BlurView intensity={50} style={styles.sideOverlay} />
          <View style={styles.scanningArea}>
            <View style={styles.scanningFrame}>
              {/* Corner brackets */}
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />

              {/* Scanning line */}
              {!scanned && (
                <View style={styles.scanningLine} />
              )}
            </View>
          </View>
          <BlurView intensity={50} style={styles.sideOverlay} />
        </View>

        {/* Bottom overlay */}
        <BlurView intensity={50} style={[styles.overlaySection, styles.bottomOverlay]} />
      </View>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.headerButton} onPress={onClose}>
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Barcode</Text>
        <View style={styles.headerButton} />
      </View>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsText}>
          {scanned ? 'Barcode scanned successfully!' : 'Point camera at barcode'}
        </Text>
        {scanned && (
          <View style={styles.successIndicator}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
          </View>
        )}
      </View>

      {/* Bottom controls */}
      <View style={[styles.bottomControls, { paddingBottom: insets.bottom }]}>
        <TouchableOpacity style={styles.controlButton} onPress={toggleFlash}>
          <Ionicons
            name={flashOn ? 'flash' : 'flash-off'}
            size={24}
            color={flashOn ? '#FFC107' : 'white'}
          />
          <Text style={styles.controlButtonText}>Flash</Text>
        </TouchableOpacity>

        {showManualEntry && (
          <TouchableOpacity style={styles.manualEntryButton} onPress={onManualEntry}>
            <Text style={styles.manualEntryButtonText}>Enter Manually</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.controlButton} onPress={toggleCameraType}>
          <Ionicons name="camera-reverse" size={24} color="white" />
          <Text style={styles.controlButtonText}>Flip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noAccessText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  overlaySection: {
    flex: 1,
  },
  topOverlay: {
    flex: 1.5,
  },
  bottomOverlay: {
    flex: 1.5,
  },
  middleSection: {
    flex: 1,
    flexDirection: 'row',
  },
  sideOverlay: {
    flex: 1,
  },
  scanningArea: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#007AFF',
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanningLine: {
    position: 'absolute',
    top: '50%',
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: '#007AFF',
    opacity: 0.8,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 15,
    zIndex: 1,
  },
  headerButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  instructionsContainer: {
    position: 'absolute',
    top: '45%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1,
  },
  instructionsText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  successIndicator: {
    marginTop: 10,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    zIndex: 1,
  },
  controlButton: {
    alignItems: 'center',
    padding: 10,
  },
  controlButtonText: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
  },
  manualEntryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  manualEntryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
