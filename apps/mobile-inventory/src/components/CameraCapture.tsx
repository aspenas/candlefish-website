import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  StatusBar,
  Platform,
  Animated,
} from 'react-native';
import { Camera, CameraCapturedPicture } from 'expo-camera';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

interface CameraCaptureProps {
  onPhotoTaken: (photoUri: string) => void;
  onClose: () => void;
  initialPhoto?: string;
  allowGalleryPicker?: boolean;
  maxPhotos?: number;
  compressionQuality?: number;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  onPhotoTaken,
  onClose,
  initialPhoto,
  allowGalleryPicker = true,
  maxPhotos = 1,
  compressionQuality = 0.8,
}) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraType, setCameraType] = useState(Camera.Constants.Type.back);
  const [flashMode, setFlashMode] = useState(Camera.Constants.FlashMode.off);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(initialPhoto || null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [zoom, setZoom] = useState(0);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);

  const cameraRef = useRef<Camera>(null);
  const focusAnimation = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    requestPermissions();
  }, []);

  useEffect(() => {
    if (focusPoint) {
      // Animate focus indicator
      focusAnimation.setValue(0);
      Animated.sequence([
        Animated.timing(focusAnimation, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(focusAnimation, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setFocusPoint(null);
      });
    }
  }, [focusPoint]);

  const requestPermissions = async () => {
    try {
      const cameraResult = await Camera.requestCameraPermissionsAsync();
      const mediaResult = await MediaLibrary.requestPermissionsAsync();

      setHasPermission(cameraResult.status === 'granted');

      if (cameraResult.status !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'Please enable camera permission to take photos of inventory items.',
          [
            { text: 'Cancel', onPress: onClose },
            { text: 'Settings', onPress: () => {/* Open settings */} },
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
      Alert.alert('Error', 'Failed to request camera permissions');
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current || isCapturing) return;

    try {
      setIsCapturing(true);

      const photo = await cameraRef.current.takePictureAsync({
        quality: compressionQuality,
        base64: false,
        exif: false,
        skipProcessing: false,
      });

      if (photo) {
        // Save to device's photo library if permission granted
        try {
          await MediaLibrary.createAssetAsync(photo.uri);
        } catch (error) {
          console.log('Could not save to media library:', error);
        }

        // Process and save the photo
        const processedUri = await processPhoto(photo);
        setPreviewPhoto(processedUri);
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const processPhoto = async (photo: CameraCapturedPicture): Promise<string> => {
    try {
      // Create a unique filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `inventory-${timestamp}.jpg`;
      const newPath = `${FileSystem.documentDirectory}inventory-photos/${filename}`;

      // Ensure directory exists
      const directoryPath = `${FileSystem.documentDirectory}inventory-photos/`;
      const dirInfo = await FileSystem.getInfoAsync(directoryPath);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(directoryPath, { intermediates: true });
      }

      // Copy the photo to our directory
      await FileSystem.copyAsync({
        from: photo.uri,
        to: newPath,
      });

      return newPath;
    } catch (error) {
      console.error('Error processing photo:', error);
      return photo.uri; // Fallback to original URI
    }
  };

  const pickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: compressionQuality,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        const processedUri = await processPhoto({
          uri: result.assets[0].uri,
          width: result.assets[0].width,
          height: result.assets[0].height,
        } as CameraCapturedPicture);
        setPreviewPhoto(processedUri);
      }
    } catch (error) {
      console.error('Error picking from gallery:', error);
      Alert.alert('Error', 'Failed to pick photo from gallery');
    }
  };

  const handleFocus = (point: { x: number; y: number }) => {
    setFocusPoint(point);
    if (cameraRef.current) {
      // Focus the camera at the touched point
      const focusX = point.x / width;
      const focusY = point.y / height;

      // Note: Manual focus is not available in all camera implementations
      // This is more for visual feedback
    }
  };

  const toggleCameraType = () => {
    setCameraType(
      cameraType === Camera.Constants.Type.back
        ? Camera.Constants.Type.front
        : Camera.Constants.Type.back
    );
  };

  const toggleFlash = () => {
    setFlashMode(
      flashMode === Camera.Constants.FlashMode.off
        ? Camera.Constants.FlashMode.on
        : flashMode === Camera.Constants.FlashMode.on
        ? Camera.Constants.FlashMode.auto
        : Camera.Constants.FlashMode.off
    );
  };

  const getFlashIcon = () => {
    switch (flashMode) {
      case Camera.Constants.FlashMode.on:
        return 'flash';
      case Camera.Constants.FlashMode.auto:
        return 'flash-outline';
      default:
        return 'flash-off';
    }
  };

  const confirmPhoto = () => {
    if (previewPhoto) {
      onPhotoTaken(previewPhoto);
    }
  };

  const retakePhoto = () => {
    setPreviewPhoto(null);
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
            Camera access is required to take photos
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={requestPermissions}>
            <Text style={styles.retryButtonText}>Retry Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (previewPhoto) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="black" translucent />

        <Image
          source={{ uri: previewPhoto }}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
        />

        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity style={styles.headerButton} onPress={retakePhoto}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Photo Preview</Text>
          <View style={styles.headerButton} />
        </View>

        {/* Bottom controls */}
        <View style={[styles.bottomControls, { paddingBottom: insets.bottom }]}>
          <TouchableOpacity style={styles.retakeButton} onPress={retakePhoto}>
            <Text style={styles.retakeButtonText}>Retake</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.confirmButton} onPress={confirmPhoto}>
            <Ionicons name="checkmark" size={24} color="white" />
            <Text style={styles.confirmButtonText}>Use Photo</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="black" translucent />

      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        type={cameraType}
        flashMode={flashMode}
        zoom={zoom}
        onCameraReady={() => console.log('Camera ready')}
      >
        {/* Touch handler for focus */}
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={(event) => {
            const { locationX, locationY } = event.nativeEvent;
            handleFocus({ x: locationX, y: locationY });
          }}
        />
      </Camera>

      {/* Focus indicator */}
      {focusPoint && (
        <Animated.View
          style={[
            styles.focusIndicator,
            {
              left: focusPoint.x - 30,
              top: focusPoint.y - 30,
              opacity: focusAnimation,
              transform: [
                {
                  scale: focusAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1.2, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.focusBox} />
        </Animated.View>
      )}

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.headerButton} onPress={onClose}>
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Take Photo</Text>
        <TouchableOpacity style={styles.headerButton} onPress={toggleFlash}>
          <Ionicons name={getFlashIcon()} size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Camera controls */}
      <View style={[styles.cameraControls, { paddingBottom: insets.bottom }]}>
        {allowGalleryPicker && (
          <TouchableOpacity style={styles.galleryButton} onPress={pickFromGallery}>
            <Ionicons name="images" size={24} color="white" />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.captureButton, isCapturing && styles.capturingButton]}
          onPress={takePicture}
          disabled={isCapturing}
        >
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.flipButton} onPress={toggleCameraType}>
          <Ionicons name="camera-reverse" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Zoom slider */}
      <View style={styles.zoomContainer}>
        <Text style={styles.zoomText}>{Math.round(zoom * 100)}%</Text>
        {/* Add zoom slider here if needed */}
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
  cameraControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 30,
    zIndex: 1,
  },
  galleryButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  capturingButton: {
    opacity: 0.7,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  },
  flipButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusIndicator: {
    position: 'absolute',
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  focusBox: {
    width: 60,
    height: 60,
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: 'transparent',
  },
  zoomContainer: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    zIndex: 1,
  },
  zoomText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 30,
    zIndex: 1,
  },
  retakeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retakeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
