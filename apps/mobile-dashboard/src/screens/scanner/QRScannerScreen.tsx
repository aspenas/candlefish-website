import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { BarCodeScanner } from 'expo-barcode-scanner';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

// Store
import { RootState, AppDispatch } from '@/store';
import { acceptInvitation } from '@/store/slices/organizationSlice';
import { showToast } from '@/store/slices/uiSlice';

// Types
import { ProfileStackParamList } from '@/navigation/MainNavigator';

// Services
import { handleDeepLink } from '@/navigation/linking';

type QRScannerScreenNavigationProp = StackNavigationProp<
  ProfileStackParamList,
  'QRScanner'
>;

interface QRScannerScreenProps {
  route: {
    params: {
      onScanSuccess: (data: string) => void;
      title?: string;
      instructions?: string;
    };
  };
}

const { width, height } = Dimensions.get('window');

export const QRScannerScreen: React.FC<QRScannerScreenProps> = ({ route }) => {
  const navigation = useNavigation<QRScannerScreenNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();

  const { onScanSuccess, title = 'Scan QR Code', instructions = 'Position the QR code within the frame' } = route.params;
  const { colorScheme, hapticFeedbackEnabled } = useSelector((state: RootState) => state.ui);

  // State
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [scanning, setScanning] = useState(true);

  // Animation
  const scanLinePosition = useSharedValue(0);

  const isDarkMode = colorScheme === 'dark';

  // Colors
  const colors = {
    background: isDarkMode ? '#000000' : '#000000', // Always dark for camera
    text: '#FFFFFF',
    accent: '#007AFF',
    success: '#34C759',
    error: '#FF3B30',
    overlay: 'rgba(0, 0, 0, 0.6)',
  };

  useEffect(() => {
    getCameraPermissions();
  }, []);

  useEffect(() => {
    // Start scan line animation
    scanLinePosition.value = withRepeat(
      withTiming(1, { duration: 2000 }),
      -1,
      true
    );
  }, []);

  const getCameraPermissions = async () => {
    const { status } = await BarCodeScanner.requestPermissionsAsync();
    setHasPermission(status === 'granted');

    if (status !== 'granted') {
      Alert.alert(
        'Camera Permission Required',
        'Please grant camera permission to scan QR codes.',
        [
          { text: 'Cancel', onPress: () => navigation.goBack() },
          { text: 'Settings', onPress: () => {/* Open settings */} },
        ]
      );
    }
  };

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;

    setScanned(true);
    setScanning(false);

    // Haptic feedback
    if (hapticFeedbackEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    processQRCode(data);
  };

  const processQRCode = async (data: string) => {
    try {
      // Call the provided success handler
      onScanSuccess(data);
      navigation.goBack();
    } catch (error) {
      console.error('Error processing QR code:', error);

      if (hapticFeedbackEnabled) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      Alert.alert(
        'Processing Failed',
        'Failed to process the scanned QR code.',
        [
          { text: 'Scan Again', onPress: resetScanner },
          { text: 'Cancel', onPress: () => navigation.goBack() },
        ]
      );
    }
  };


  const resetScanner = () => {
    setScanned(false);
    setScanning(true);
  };

  const toggleFlash = () => {
    setFlashOn(!flashOn);
    if (hapticFeedbackEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Scan line animation
  const scanLineStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scanLinePosition.value,
      [0, 1],
      [0, 200]
    );

    return {
      transform: [{ translateY }],
    };
  });

  if (hasPermission === null) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.text, { color: colors.text }]}>
          Requesting camera permission...
        </Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color={colors.text} />
          <Text style={[styles.permissionTitle, { color: colors.text }]}>
            Camera Access Required
          </Text>
          <Text style={[styles.permissionMessage, { color: colors.text }]}>
            Please grant camera permission to scan QR codes.
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.accent }]}
            onPress={getCameraPermissions}
          >
            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
              Grant Permission
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const scannerViewStyle = {
    width: width * 0.8,
    height: width * 0.8,
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {title}
        </Text>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={toggleFlash}
        >
          <Ionicons
            name={flashOn ? 'flash' : 'flash-off'}
            size={24}
            color={flashOn ? colors.accent : colors.text}
          />
        </TouchableOpacity>
      </View>

      {/* Scanner */}
      <View style={styles.scannerContainer}>
        <BarCodeScanner
          onBarCodeScanned={scanning ? handleBarCodeScanned : undefined}
          style={StyleSheet.absoluteFillObject}
          flashMode={flashOn ? 'torch' : 'off'}
        />

        {/* Overlay */}
        <View style={styles.overlay}>
          {/* Top overlay */}
          <View style={[styles.overlaySection, { backgroundColor: colors.overlay }]} />

          {/* Middle section with scanner frame */}
          <View style={styles.middleSection}>
            <View style={[styles.sideOverlay, { backgroundColor: colors.overlay }]} />

            <View style={[styles.scannerFrame, scannerViewStyle]}>
              {/* Corner indicators */}
              <View style={[styles.corner, styles.topLeft, { borderColor: colors.accent }]} />
              <View style={[styles.corner, styles.topRight, { borderColor: colors.accent }]} />
              <View style={[styles.corner, styles.bottomLeft, { borderColor: colors.accent }]} />
              <View style={[styles.corner, styles.bottomRight, { borderColor: colors.accent }]} />

              {/* Scanning line */}
              {scanning && (
                <Animated.View
                  style={[
                    styles.scanLine,
                    { backgroundColor: colors.accent },
                    scanLineStyle,
                  ]}
                />
              )}
            </View>

            <View style={[styles.sideOverlay, { backgroundColor: colors.overlay }]} />
          </View>

          {/* Bottom overlay */}
          <View style={[styles.overlaySection, { backgroundColor: colors.overlay }]} />
        </View>
      </View>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={[styles.instructions, { color: colors.text }]}>
          {instructions}
        </Text>

        {scanned && (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.accent }]}
            onPress={resetScanner}
          >
            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
              Scan Again
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  scannerContainer: {
    flex: 1,
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  overlaySection: {
    flex: 1,
  },
  middleSection: {
    flexDirection: 'row',
    height: width * 0.8,
  },
  sideOverlay: {
    flex: 1,
  },
  scannerFrame: {
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
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
    opacity: 0.8,
  },
  instructionsContainer: {
    padding: 24,
    alignItems: 'center',
  },
  instructions: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  permissionMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  text: {
    fontSize: 16,
  },
});
