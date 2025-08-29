import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Vibration,
  Animated,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import QRCodeScanner from 'react-native-qrcode-scanner';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Toast from 'react-native-toast-message';
import { useTheme } from '../providers/ThemeProvider';
import { useOffline } from '../providers/OfflineProvider';
import { PerformanceService } from '../services/performance';
import { OfflineQueueService } from '../services/offline-queue';

// Types
import { ScanResult, Item } from '../types';

interface ScannerScreenProps {
  route?: {
    params?: {
      mode: 'item_lookup' | 'qr_label';
    };
  };
}

const ScannerScreen: React.FC<ScannerScreenProps> = ({ route }) => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { isOnline } = useOffline();
  const styles = createStyles(theme);
  
  const scannerRef = useRef<QRCodeScanner>(null);
  const scanAnimValue = useRef(new Animated.Value(0)).current;
  
  const [isScanning, setIsScanning] = useState(true);
  const [flashMode, setFlashMode] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [foundItem, setFoundItem] = useState<Item | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const scanMode = route?.params?.mode || 'item_lookup';

  useEffect(() => {
    const startTime = Date.now();
    
    // Start scanning animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnimValue, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnimValue, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
    
    return () => {
      const loadTime = Date.now() - startTime;
      PerformanceService.recordScreenMetrics({
        screen: 'Scanner',
        loadTime,
        renderTime: loadTime,
        memoryUsage: 0,
        batteryLevel: 0,
        timestamp: new Date(),
      });
    };
  }, []);

  const handleScan = async (e: any) => {
    if (!isScanning) return;

    setIsScanning(false);
    Vibration.vibrate(200);

    const result: ScanResult = {
      type: detectCodeType(e.data),
      data: e.data,
      timestamp: new Date(),
      confidence: 1.0, // QR scanner doesn't provide confidence
    };

    setScanResult(result);
    await processScannedCode(result);
  };

  const detectCodeType = (data: string): ScanResult['type'] => {
    // Simple detection based on data format
    if (data.startsWith('http') || data.startsWith('https')) {
      return 'QR';
    } else if (data.length === 12 && /^\d+$/.test(data)) {
      return 'UPC';
    } else if (data.length === 13 && /^\d+$/.test(data)) {
      return 'EAN';
    } else if (/^\d+$/.test(data)) {
      return 'BARCODE';
    } else {
      return 'QR';
    }
  };

  const processScannedCode = async (result: ScanResult) => {
    setIsLoading(true);

    try {
      if (scanMode === 'item_lookup') {
        await handleItemLookup(result);
      } else if (scanMode === 'qr_label') {
        await handleQRLabel(result);
      }
    } catch (error) {
      console.error('Error processing scanned code:', error);
      Alert.alert('Scan Error', 'Failed to process the scanned code.');
      resetScanner();
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemLookup = async (result: ScanResult) => {
    if (!isOnline) {
      // Store for offline processing
      await OfflineQueueService.addToQueue({
        type: 'CREATE',
        entity: 'item',
        data: {
          scannedCode: result.data,
          codeType: result.type,
          timestamp: result.timestamp,
          scanMode: 'lookup',
        },
      });

      Toast.show({
        type: 'info',
        text1: 'Code Saved',
        text2: 'Will lookup when back online',
      });

      resetScanner();
      return;
    }

    try {
      // Look up item by scanned code
      let item = null;

      if (result.type === 'QR') {
        // QR code might contain item ID or URL
        const itemId = extractItemIdFromQR(result.data);
        if (itemId) {
          // item = await apiService.getItem(itemId);
          console.log('Would lookup item by ID:', itemId);
        }
      } else {
        // Barcode/UPC lookup
        // item = await apiService.lookupItemByBarcode(result.data);
        console.log('Would lookup item by barcode:', result.data);
      }

      if (item) {
        setFoundItem(item);
        setShowResultModal(true);
        
        Toast.show({
          type: 'success',
          text1: 'Item Found',
          text2: `Found: ${item.name}`,
        });
      } else {
        // No item found, offer to create new item
        Alert.alert(
          'Item Not Found',
          'No item found with this code. Would you like to create a new item?',
          [
            { text: 'Cancel', onPress: resetScanner },
            { 
              text: 'Create Item', 
              onPress: () => createNewItemFromScan(result)
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error during item lookup:', error);
      throw error;
    }
  };

  const handleQRLabel = async (result: ScanResult) => {
    if (result.type !== 'QR') {
      Alert.alert('Invalid Code', 'Please scan a QR code for item labels.');
      resetScanner();
      return;
    }

    try {
      const itemId = extractItemIdFromQR(result.data);
      if (itemId) {
        // Navigate to item detail
        navigation.navigate('ItemDetail', { 
          itemId,
          itemName: `Item ${itemId}`,
        });
      } else {
        Alert.alert('Invalid QR Code', 'This QR code does not contain a valid item reference.');
        resetScanner();
      }
    } catch (error) {
      console.error('Error processing QR label:', error);
      throw error;
    }
  };

  const extractItemIdFromQR = (data: string): string | null => {
    // Extract item ID from various QR formats
    if (data.includes('/item/')) {
      const match = data.match(/\/item\/([a-zA-Z0-9-]+)/);
      return match ? match[1] : null;
    } else if (data.includes('item_id=')) {
      const match = data.match(/item_id=([a-zA-Z0-9-]+)/);
      return match ? match[1] : null;
    } else if (data.length < 50 && /^[a-zA-Z0-9-]+$/.test(data)) {
      // Assume it's a direct item ID if it looks like one
      return data;
    }
    return null;
  };

  const createNewItemFromScan = async (result: ScanResult) => {
    const itemData = {
      name: `Scanned Item ${result.data}`,
      scanned_code: result.data,
      code_type: result.type,
      scan_timestamp: result.timestamp,
    };

    if (isOnline) {
      // Create immediately
      // await apiService.createItem(itemData);
      console.log('Would create item:', itemData);
      
      Toast.show({
        type: 'success',
        text1: 'Item Created',
        text2: 'New item created from scan',
      });
    } else {
      // Queue for offline sync
      await OfflineQueueService.addToQueue({
        type: 'CREATE',
        entity: 'item',
        data: itemData,
      });
      
      Toast.show({
        type: 'info',
        text1: 'Item Queued',
        text2: 'Will create when back online',
      });
    }

    resetScanner();
  };

  const resetScanner = () => {
    setScanResult(null);
    setFoundItem(null);
    setShowResultModal(false);
    setIsScanning(true);
    scannerRef.current?.reactivate();
  };

  const toggleFlash = () => {
    setFlashMode(!flashMode);
  };

  const renderScanningOverlay = () => (
    <View style={styles.overlay}>
      {/* Top overlay */}
      <View style={styles.topOverlay} />
      
      {/* Middle section with scan area */}
      <View style={styles.middleSection}>
        <View style={styles.sideOverlay} />
        
        {/* Scan area */}
        <View style={styles.scanArea}>
          {/* Corner indicators */}
          <View style={styles.corners}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          
          {/* Scanning line */}
          <Animated.View
            style={[
              styles.scanLine,
              {
                transform: [{
                  translateY: scanAnimValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-100, 100],
                  }),
                }],
              },
            ]}
          />
        </View>
        
        <View style={styles.sideOverlay} />
      </View>
      
      {/* Bottom overlay */}
      <View style={styles.bottomOverlay} />
    </View>
  );

  const renderControls = () => (
    <View style={styles.controls}>
      <TouchableOpacity
        style={styles.controlButton}
        onPress={() => navigation.goBack()}
      >
        <Icon name="close" size={24} color="white" />
        <Text style={styles.controlText}>Close</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.controlButton}
        onPress={toggleFlash}
      >
        <Icon 
          name={flashMode ? "flash-on" : "flash-off"} 
          size={24} 
          color="white" 
        />
        <Text style={styles.controlText}>Flash</Text>
      </TouchableOpacity>
    </View>
  );

  const renderResultModal = () => (
    <Modal
      visible={showResultModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Scan Results</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowResultModal(false)}
          >
            <Icon name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {scanResult && (
            <View style={styles.scanInfo}>
              <Text style={styles.scanType}>{scanResult.type} Code</Text>
              <Text style={styles.scanData}>{scanResult.data}</Text>
              <Text style={styles.scanTime}>
                Scanned: {scanResult.timestamp.toLocaleString()}
              </Text>
            </View>
          )}

          {foundItem && (
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{foundItem.name}</Text>
              <Text style={styles.itemCategory}>{foundItem.category}</Text>
              {foundItem.description && (
                <Text style={styles.itemDescription}>{foundItem.description}</Text>
              )}
              
              <TouchableOpacity
                style={styles.viewItemButton}
                onPress={() => {
                  setShowResultModal(false);
                  navigation.navigate('ItemDetail', {
                    itemId: foundItem.id,
                    itemName: foundItem.name,
                  });
                }}
              >
                <Text style={styles.viewItemText}>View Item Details</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        <View style={styles.modalActions}>
          <TouchableOpacity
            style={styles.scanAgainButton}
            onPress={() => {
              setShowResultModal(false);
              resetScanner();
            }}
          >
            <Text style={styles.scanAgainText}>Scan Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <QRCodeScanner
        ref={scannerRef}
        onRead={handleScan}
        flashMode={flashMode}
        showMarker={false}
        cameraStyle={styles.camera}
        topContent={
          <View style={styles.topContent}>
            <Text style={styles.instructionText}>
              {scanMode === 'item_lookup' 
                ? 'Scan a barcode or QR code to lookup items'
                : 'Scan QR labels to view item details'
              }
            </Text>
          </View>
        }
        bottomContent={null}
        permissionDialogMessage="Camera permission is required to scan codes"
      />

      {renderScanningOverlay()}
      {renderControls()}

      {/* Loading overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="white" />
          <Text style={styles.loadingText}>Processing scan...</Text>
        </View>
      )}

      {/* Offline indicator */}
      {!isOnline && (
        <View style={styles.offlineIndicator}>
          <Icon name="cloud-off" size={16} color="white" />
          <Text style={styles.offlineText}>Offline Mode</Text>
        </View>
      )}

      {renderResultModal()}
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  topContent: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1,
  },
  instructionText: {
    color: 'white',
    fontSize: theme.fontSize.md,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  topOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  middleSection: {
    flexDirection: 'row',
    height: 250,
  },
  sideOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  scanArea: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corners: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: 'white',
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
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#00FF00',
    shadowColor: '#00FF00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
  },
  bottomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  controls: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: theme.spacing.lg,
    zIndex: 2,
  },
  controlButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    minWidth: 80,
  },
  controlText: {
    color: 'white',
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.xs / 2,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  loadingText: {
    color: 'white',
    fontSize: theme.fontSize.md,
    marginTop: theme.spacing.md,
  },
  offlineIndicator: {
    position: 'absolute',
    top: 20,
    left: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    zIndex: 1,
  },
  offlineText: {
    color: 'white',
    fontSize: theme.fontSize.sm,
    marginLeft: theme.spacing.xs / 2,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  modalContent: {
    flex: 1,
    padding: theme.spacing.md,
  },
  scanInfo: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  scanType: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  scanData: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
    fontFamily: 'monospace',
  },
  scanTime: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  itemInfo: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  itemName: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  itemCategory: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  itemDescription: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  viewItemButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
  },
  viewItemText: {
    color: 'white',
    fontSize: theme.fontSize.md,
    fontWeight: '500',
  },
  modalActions: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  scanAgainButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
  },
  scanAgainText: {
    color: 'white',
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
});

export default ScannerScreen;