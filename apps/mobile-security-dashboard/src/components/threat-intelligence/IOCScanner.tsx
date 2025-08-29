import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Alert,
  TouchableOpacity,
  Animated,
  Modal,
} from 'react-native';
import { Camera, CameraType, FlashMode } from 'expo-camera';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { Button, Icon, Overlay } from 'react-native-elements';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';

import {
  IOCScanResult,
  DetectedIOC,
  IOCScanType,
  IOCType,
  ConfidenceLevel,
  ThreatLevel,
} from '../../types/security';

interface IOCScannerProps {
  onScanResult: (result: IOCScanResult) => void;
  onClose: () => void;
  visible: boolean;
  organizationId: string;
}

interface ScanOverlayProps {
  scanType: IOCScanType;
  isScanning: boolean;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const SCAN_TYPES = [
  { type: IOCScanType.QR_CODE, label: 'QR Code', icon: 'qr-code-scanner' },
  { type: IOCScanType.TEXT_OCR, label: 'Text OCR', icon: 'text-fields' },
  { type: IOCScanType.BARCODE, label: 'Barcode', icon: 'linear-scale' },
];

const ScanOverlay: React.FC<ScanOverlayProps> = ({ scanType, isScanning }) => {
  const animationValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isScanning) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(animationValue, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(animationValue, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [isScanning, animationValue]);

  const scanLinePosition = animationValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 200],
  });

  const renderScanArea = () => {
    switch (scanType) {
      case IOCScanType.QR_CODE:
        return (
          <View style={styles.qrScanArea}>
            <View style={styles.corner} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
            {isScanning && (
              <Animated.View
                style={[
                  styles.scanLine,
                  { transform: [{ translateY: scanLinePosition }] },
                ]}
              />
            )}
          </View>
        );
      case IOCScanType.BARCODE:
        return (
          <View style={styles.barcodeScanArea}>
            <View style={styles.barcodeFrame} />
            {isScanning && (
              <Animated.View
                style={[
                  styles.barcodeScanLine,
                  { transform: [{ translateY: scanLinePosition }] },
                ]}
              />
            )}
          </View>
        );
      case IOCScanType.TEXT_OCR:
        return (
          <View style={styles.textScanArea}>
            <View style={styles.textScanFrame} />
            <Text style={styles.textScanInstruction}>
              Point camera at text containing IOCs
            </Text>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View style={styles.overlay}>
      {renderScanArea()}
      
      <View style={styles.instructionContainer}>
        <Text style={styles.instruction}>
          {isScanning ? 'Scanning...' : `Position ${scanType.toLowerCase().replace('_', ' ')} in the frame`}
        </Text>
      </View>
    </View>
  );
};

export const IOCScanner: React.FC<IOCScannerProps> = ({
  onScanResult,
  onClose,
  visible,
  organizationId,
}) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraType, setCameraType] = useState(CameraType.back);
  const [flashMode, setFlashMode] = useState(FlashMode.off);
  const [isScanning, setIsScanning] = useState(false);
  const [scanType, setScanType] = useState<IOCScanType>(IOCScanType.QR_CODE);
  const [processingImage, setProcessingImage] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [scanResults, setScanResults] = useState<IOCScanResult | null>(null);

  const cameraRef = useRef<Camera>(null);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, []);

  const handleBarCodeScanned = useCallback(
    async ({ type, data }: { type: string; data: string }) => {
      if (isScanning) return;

      setIsScanning(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      try {
        const scanResult = await processScannedData(data, IOCScanType.QR_CODE);
        setScanResults(scanResult);
        setShowResults(true);
        onScanResult(scanResult);
      } catch (error) {
        console.error('Error processing scanned data:', error);
        Alert.alert('Scan Error', 'Failed to process scanned data');
      } finally {
        setIsScanning(false);
      }
    },
    [isScanning, onScanResult]
  );

  const processScannedData = async (
    data: string,
    scanType: IOCScanType,
    imageUri?: string
  ): Promise<IOCScanResult> => {
    const startTime = Date.now();
    
    // Simulate processing time for demo
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const detectedIOCs = await analyzeDataForIOCs(data, scanType);
    const processingTime = Date.now() - startTime;

    return {
      success: true,
      detectedIOCs,
      confidence: getOverallConfidence(detectedIOCs),
      timestamp: new Date().toISOString(),
      scanType,
      image: imageUri,
      processingTime,
    };
  };

  const analyzeDataForIOCs = async (
    data: string,
    scanType: IOCScanType
  ): Promise<DetectedIOC[]> => {
    const detectedIOCs: DetectedIOC[] = [];

    // IP Address detection
    const ipRegex = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
    const ipMatches = data.match(ipRegex);
    if (ipMatches) {
      ipMatches.forEach(ip => {
        detectedIOCs.push({
          value: ip,
          type: IOCType.IP_ADDRESS,
          confidence: ConfidenceLevel.HIGH,
          context: 'Detected IP address',
          threatLevel: ThreatLevel.MEDIUM,
          knownThreat: Math.random() > 0.7,
          associatedThreats: [],
        });
      });
    }

    // Domain detection
    const domainRegex = /\b(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}\b/g;
    const domainMatches = data.match(domainRegex);
    if (domainMatches) {
      domainMatches.forEach(domain => {
        detectedIOCs.push({
          value: domain,
          type: IOCType.DOMAIN,
          confidence: ConfidenceLevel.MEDIUM,
          context: 'Detected domain name',
          threatLevel: ThreatLevel.LOW,
          knownThreat: Math.random() > 0.8,
          associatedThreats: [],
        });
      });
    }

    // URL detection
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;
    const urlMatches = data.match(urlRegex);
    if (urlMatches) {
      urlMatches.forEach(url => {
        detectedIOCs.push({
          value: url,
          type: IOCType.URL,
          confidence: ConfidenceLevel.HIGH,
          context: 'Detected URL',
          threatLevel: ThreatLevel.MEDIUM,
          knownThreat: Math.random() > 0.6,
          associatedThreats: [],
        });
      });
    }

    // Email detection
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emailMatches = data.match(emailRegex);
    if (emailMatches) {
      emailMatches.forEach(email => {
        detectedIOCs.push({
          value: email,
          type: IOCType.EMAIL,
          confidence: ConfidenceLevel.MEDIUM,
          context: 'Detected email address',
          threatLevel: ThreatLevel.LOW,
          knownThreat: Math.random() > 0.9,
          associatedThreats: [],
        });
      });
    }

    // File hash detection (MD5, SHA1, SHA256)
    const md5Regex = /\b[a-fA-F0-9]{32}\b/g;
    const sha1Regex = /\b[a-fA-F0-9]{40}\b/g;
    const sha256Regex = /\b[a-fA-F0-9]{64}\b/g;

    const md5Matches = data.match(md5Regex);
    if (md5Matches) {
      md5Matches.forEach(hash => {
        detectedIOCs.push({
          value: hash,
          type: IOCType.FILE_HASH_MD5,
          confidence: ConfidenceLevel.HIGH,
          context: 'Detected MD5 hash',
          threatLevel: ThreatLevel.HIGH,
          knownThreat: Math.random() > 0.5,
          associatedThreats: [],
        });
      });
    }

    const sha1Matches = data.match(sha1Regex);
    if (sha1Matches) {
      sha1Matches.forEach(hash => {
        detectedIOCs.push({
          value: hash,
          type: IOCType.FILE_HASH_SHA1,
          confidence: ConfidenceLevel.HIGH,
          context: 'Detected SHA1 hash',
          threatLevel: ThreatLevel.HIGH,
          knownThreat: Math.random() > 0.5,
          associatedThreats: [],
        });
      });
    }

    const sha256Matches = data.match(sha256Regex);
    if (sha256Matches) {
      sha256Matches.forEach(hash => {
        detectedIOCs.push({
          value: hash,
          type: IOCType.FILE_HASH_SHA256,
          confidence: ConfidenceLevel.HIGH,
          context: 'Detected SHA256 hash',
          threatLevel: ThreatLevel.HIGH,
          knownThreat: Math.random() > 0.5,
          associatedThreats: [],
        });
      });
    }

    return detectedIOCs;
  };

  const getOverallConfidence = (detectedIOCs: DetectedIOC[]): ConfidenceLevel => {
    if (detectedIOCs.length === 0) return ConfidenceLevel.LOW;
    
    const confidenceScores = {
      [ConfidenceLevel.LOW]: 1,
      [ConfidenceLevel.MEDIUM]: 2,
      [ConfidenceLevel.HIGH]: 3,
      [ConfidenceLevel.CONFIRMED]: 4,
    };

    const avgScore = detectedIOCs.reduce((sum, ioc) => 
      sum + confidenceScores[ioc.confidence], 0
    ) / detectedIOCs.length;

    if (avgScore >= 3.5) return ConfidenceLevel.CONFIRMED;
    if (avgScore >= 2.5) return ConfidenceLevel.HIGH;
    if (avgScore >= 1.5) return ConfidenceLevel.MEDIUM;
    return ConfidenceLevel.LOW;
  };

  const handleTakePicture = async () => {
    if (!cameraRef.current || processingImage) return;

    try {
      setProcessingImage(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      // Simulate OCR processing
      const mockText = "Sample text with IP 192.168.1.1 and domain example.com";
      const scanResult = await processScannedData(mockText, scanType, photo.uri);
      
      setScanResults(scanResult);
      setShowResults(true);
      onScanResult(scanResult);
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Camera Error', 'Failed to take picture');
    } finally {
      setProcessingImage(false);
    }
  };

  const handlePickImageFromLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        setProcessingImage(true);
        
        // Simulate processing
        const mockText = "Sample text with hash 5d41402abc4b2a76b9719d911017c592";
        const scanResult = await processScannedData(mockText, IOCScanType.TEXT_OCR, result.assets[0].uri);
        
        setScanResults(scanResult);
        setShowResults(true);
        onScanResult(scanResult);
        setProcessingImage(false);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Gallery Error', 'Failed to pick image');
      setProcessingImage(false);
    }
  };

  const toggleCameraType = () => {
    setCameraType(current =>
      current === CameraType.back ? CameraType.front : CameraType.back
    );
  };

  const toggleFlashMode = () => {
    setFlashMode(current =>
      current === FlashMode.off ? FlashMode.on : FlashMode.off
    );
  };

  const renderScanTypeSelector = () => (
    <View style={styles.scanTypeSelector}>
      {SCAN_TYPES.map((type) => (
        <TouchableOpacity
          key={type.type}
          style={[
            styles.scanTypeButton,
            scanType === type.type && styles.activeScanTypeButton,
          ]}
          onPress={() => setScanType(type.type)}
        >
          <Icon
            name={type.icon}
            type="material"
            size={24}
            color={scanType === type.type ? '#fff' : '#3498db'}
          />
          <Text
            style={[
              styles.scanTypeText,
              scanType === type.type && styles.activeScanTypeText,
            ]}
          >
            {type.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderCameraControls = () => (
    <View style={styles.cameraControls}>
      <TouchableOpacity style={styles.controlButton} onPress={handlePickImageFromLibrary}>
        <Icon name="photo-library" type="material" size={28} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.captureButton, processingImage && styles.captureButtonDisabled]}
        onPress={handleTakePicture}
        disabled={processingImage}
      >
        {processingImage ? (
          <Icon name="hourglass-empty" type="material" size={32} color="#fff" />
        ) : (
          <Icon name="camera" type="material" size={32} color="#fff" />
        )}
      </TouchableOpacity>

      <View style={styles.rightControls}>
        <TouchableOpacity style={styles.controlButton} onPress={toggleFlashMode}>
          <Icon
            name={flashMode === FlashMode.on ? 'flash-on' : 'flash-off'}
            type="material"
            size={28}
            color="#fff"
          />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.controlButton} onPress={toggleCameraType}>
          <Icon name="flip-camera-ios" type="material" size={28} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderResultsModal = () => (
    <Overlay
      isVisible={showResults}
      onBackdropPress={() => setShowResults(false)}
      overlayStyle={styles.resultsModal}
    >
      <View>
        <Text style={styles.resultsTitle}>Scan Results</Text>
        
        {scanResults && (
          <>
            <Text style={styles.resultsSubtitle}>
              {scanResults.detectedIOCs.length} IOC(s) detected
            </Text>
            
            {scanResults.detectedIOCs.map((ioc, index) => (
              <View key={index} style={styles.resultItem}>
                <Text style={styles.resultType}>{ioc.type}</Text>
                <Text style={styles.resultValue}>{ioc.value}</Text>
                <Text style={styles.resultConfidence}>
                  Confidence: {ioc.confidence}
                </Text>
                {ioc.knownThreat && (
                  <Text style={styles.knownThreatText}>⚠️ Known Threat</Text>
                )}
              </View>
            ))}
            
            <Text style={styles.processingTime}>
              Processing time: {scanResults.processingTime}ms
            </Text>
          </>
        )}
        
        <Button
          title="Close"
          buttonStyle={styles.closeResultsButton}
          onPress={() => setShowResults(false)}
        />
      </View>
    </Overlay>
  );

  if (hasPermission === null) {
    return (
      <View style={styles.permissionContainer}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>No access to camera</Text>
        <Button
          title="Close"
          buttonStyle={styles.closeButton}
          onPress={onClose}
        />
      </View>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeIconButton}>
            <Icon name="close" type="material" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>IOC Scanner</Text>
          <View style={styles.headerSpacer} />
        </View>

        {renderScanTypeSelector()}

        <View style={styles.cameraContainer}>
          <Camera
            ref={cameraRef}
            style={styles.camera}
            type={cameraType}
            flashMode={flashMode}
            onBarCodeScanned={
              scanType === IOCScanType.QR_CODE || scanType === IOCScanType.BARCODE
                ? handleBarCodeScanned
                : undefined
            }
            barCodeScannerSettings={{
              barCodeTypes: [
                BarCodeScanner.Constants.BarCodeType.qr,
                BarCodeScanner.Constants.BarCodeType.pdf417,
                BarCodeScanner.Constants.BarCodeType.aztec,
                BarCodeScanner.Constants.BarCodeType.ean13,
                BarCodeScanner.Constants.BarCodeType.ean8,
                BarCodeScanner.Constants.BarCodeType.code128,
                BarCodeScanner.Constants.BarCodeType.code39,
                BarCodeScanner.Constants.BarCodeType.code93,
                BarCodeScanner.Constants.BarCodeType.codabar,
                BarCodeScanner.Constants.BarCodeType.datamatrix,
                BarCodeScanner.Constants.BarCodeType.upc_e,
              ],
            }}
          >
            <ScanOverlay scanType={scanType} isScanning={isScanning} />
          </Camera>
        </View>

        {renderCameraControls()}
        {renderResultsModal()}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  closeIconButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSpacer: {
    width: 44,
  },
  scanTypeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  scanTypeButton: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  activeScanTypeButton: {
    backgroundColor: '#3498db',
  },
  scanTypeText: {
    fontSize: 12,
    color: '#3498db',
    marginTop: 4,
    fontWeight: '600',
  },
  activeScanTypeText: {
    color: '#fff',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrScanArea: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#3498db',
    borderWidth: 3,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    top: 0,
    left: 0,
  },
  topRight: {
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderLeftWidth: 0,
    top: 0,
    right: 0,
    left: 'auto',
  },
  bottomLeft: {
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderTopWidth: 0,
    bottom: 0,
    top: 'auto',
  },
  bottomRight: {
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    bottom: 0,
    right: 0,
    top: 'auto',
    left: 'auto',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#3498db',
    opacity: 0.8,
  },
  barcodeScanArea: {
    width: 300,
    height: 100,
    position: 'relative',
  },
  barcodeFrame: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: '#3498db',
    borderRadius: 8,
  },
  barcodeScanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#e74c3c',
    opacity: 0.8,
  },
  textScanArea: {
    width: screenWidth - 40,
    height: 200,
    position: 'relative',
  },
  textScanFrame: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: '#3498db',
    borderRadius: 12,
    borderStyle: 'dashed',
  },
  textScanInstruction: {
    position: 'absolute',
    bottom: -40,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  instructionContainer: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
  },
  instruction: {
    textAlign: 'center',
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  captureButtonDisabled: {
    backgroundColor: '#95a5a6',
  },
  rightControls: {
    flexDirection: 'column',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  permissionText: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
    color: '#34495e',
  },
  closeButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  resultsModal: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 12,
    padding: 20,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
    textAlign: 'center',
  },
  resultsSubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 16,
    textAlign: 'center',
  },
  resultItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
  },
  resultType: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#3498db',
    textTransform: 'uppercase',
  },
  resultValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginVertical: 4,
    fontFamily: 'monospace',
  },
  resultConfidence: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  knownThreatText: {
    fontSize: 12,
    color: '#e74c3c',
    fontWeight: 'bold',
    marginTop: 4,
  },
  processingTime: {
    fontSize: 12,
    color: '#95a5a6',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  closeResultsButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    marginTop: 16,
  },
});

export default IOCScanner;