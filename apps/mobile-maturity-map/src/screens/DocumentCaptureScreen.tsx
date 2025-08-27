import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { Camera, CameraType, FlashMode } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch } from 'react-redux';

import { DocumentCaptureMode } from '@/types/assessment';
import { uploadDocument } from '@/store/slices/documentsSlice';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { DocumentPreview } from '@/components/documents/DocumentPreview';
import { CaptureGuide } from '@/components/documents/CaptureGuide';

const { width, height } = Dimensions.get('window');

interface RouteParams {
  assessmentId?: string;
  mode?: DocumentCaptureMode;
}

export function DocumentCaptureScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const cameraRef = useRef<Camera>(null);

  const { assessmentId, mode = 'camera' } = (route.params as RouteParams) || {};

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraType, setCameraType] = useState(CameraType.back);
  const [flashMode, setFlashMode] = useState(FlashMode.off);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedDocument, setCapturedDocument] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showGuide, setShowGuide] = useState(true);

  useEffect(() => {
    (async () => {
      if (mode === 'camera') {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
      } else {
        setHasPermission(true);
      }
    })();
  }, [mode]);

  useEffect(() => {
    if (mode === 'library') {
      handlePickFromLibrary();
    } else if (mode === 'files') {
      handlePickDocument();
    }
  }, [mode]);

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;

    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        skipProcessing: false,
      });

      setCapturedDocument({
        uri: photo.uri,
        type: 'image',
        filename: `document_${Date.now()}.jpg`,
        size: 0, // Will be calculated later
      });
      setShowGuide(false);
    } catch (error) {
      console.error('Capture error:', error);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handlePickFromLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setCapturedDocument({
          uri: asset.uri,
          type: 'image',
          filename: asset.fileName || `document_${Date.now()}.jpg`,
          size: asset.fileSize || 0,
          width: asset.width,
          height: asset.height,
        });
      } else {
        navigation.goBack();
      }
    } catch (error) {
      console.error('Library pick error:', error);
      Alert.alert('Error', 'Failed to pick image from library.');
      navigation.goBack();
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setCapturedDocument({
          uri: asset.uri,
          type: getDocumentTypeFromMimeType(asset.mimeType),
          filename: asset.name,
          size: asset.size || 0,
          mimeType: asset.mimeType,
        });
      } else {
        navigation.goBack();
      }
    } catch (error) {
      console.error('Document pick error:', error);
      Alert.alert('Error', 'Failed to pick document.');
      navigation.goBack();
    }
  };

  const handleRetake = () => {
    setCapturedDocument(null);
    setShowGuide(true);
  };

  const handleUpload = async () => {
    if (!capturedDocument) return;

    setIsProcessing(true);
    try {
      const uploadData = {
        ...capturedDocument,
        assessmentId,
      };

      await dispatch(uploadDocument(uploadData) as any);
      
      Alert.alert(
        'Success',
        'Document uploaded successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Failed to upload document. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleCameraType = () => {
    setCameraType(current =>
      current === CameraType.back ? CameraType.front : CameraType.back
    );
  };

  const toggleFlash = () => {
    setFlashMode(current => {
      switch (current) {
        case FlashMode.off:
          return FlashMode.on;
        case FlashMode.on:
          return FlashMode.auto;
        case FlashMode.auto:
          return FlashMode.off;
        default:
          return FlashMode.off;
      }
    });
  };

  if (hasPermission === null) {
    return (
      <View style={styles.permissionContainer}>
        <LoadingSpinner size="large" />
        <Text style={styles.permissionText}>Requesting permissions...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={64} color="#6B7280" />
        <Text style={styles.permissionText}>No access to camera</Text>
        <Text style={styles.permissionSubtext}>
          Please grant camera permissions in settings
        </Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.settingsButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (capturedDocument) {
    return (
      <SafeAreaView style={styles.container}>
        <DocumentPreview
          document={capturedDocument}
          onRetake={handleRetake}
          onUpload={handleUpload}
          isProcessing={isProcessing}
        />
      </SafeAreaView>
    );
  }

  if (mode !== 'camera') {
    return (
      <View style={styles.permissionContainer}>
        <LoadingSpinner size="large" />
        <Text style={styles.permissionText}>Opening {mode}...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={styles.camera}
        type={cameraType}
        flashMode={flashMode}
        ref={cameraRef}
      >
        {/* Header Controls */}
        <SafeAreaView style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Capture Document</Text>
          <TouchableOpacity style={styles.headerButton} onPress={toggleFlash}>
            <Ionicons
              name={
                flashMode === FlashMode.off
                  ? 'flash-off'
                  : flashMode === FlashMode.on
                  ? 'flash'
                  : 'flash-outline'
              }
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Capture Guide Overlay */}
        {showGuide && <CaptureGuide />}

        {/* Bottom Controls */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.bottomControls}
        >
          <View style={styles.controlsContainer}>
            <TouchableOpacity
              style={styles.libraryButton}
              onPress={handlePickFromLibrary}
            >
              <Ionicons name="images-outline" size={24} color="#FFFFFF" />
              <Text style={styles.controlLabel}>Library</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.captureButton, isCapturing && styles.capturingButton]}
              onPress={handleCapture}
              disabled={isCapturing}
            >
              {isCapturing ? (
                <LoadingSpinner size="small" color="#FFFFFF" />
              ) : (
                <View style={styles.captureButtonInner} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.flipButton}
              onPress={toggleCameraType}
            >
              <Ionicons name="camera-reverse-outline" size={24} color="#FFFFFF" />
              <Text style={styles.controlLabel}>Flip</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.filesButton}
            onPress={handlePickDocument}
          >
            <Ionicons name="document-outline" size={20} color="#FFFFFF" />
            <Text style={styles.filesButtonText}>Choose Files</Text>
          </TouchableOpacity>
        </LinearGradient>
      </Camera>
    </View>
  );
}

function getDocumentTypeFromMimeType(mimeType?: string): string {
  if (!mimeType) return 'UNKNOWN';
  
  if (mimeType.startsWith('image/')) return 'IMAGE';
  if (mimeType.includes('pdf')) return 'PDF';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'WORD';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'EXCEL';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'PRESENTATION';
  if (mimeType.startsWith('text/')) return 'TEXT';
  if (mimeType.startsWith('video/')) return 'VIDEO';
  if (mimeType.startsWith('audio/')) return 'AUDIO';
  
  return 'UNKNOWN';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 20,
  },
  permissionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    textAlign: 'center',
  },
  permissionSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  settingsButton: {
    marginTop: 24,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  settingsButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  camera: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 22,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingTop: 40,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginBottom: 20,
  },
  libraryButton: {
    alignItems: 'center',
    opacity: 0.8,
  },
  flipButton: {
    alignItems: 'center',
    opacity: 0.8,
  },
  controlLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  capturingButton: {
    backgroundColor: '#3B82F6',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
  },
  filesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    marginHorizontal: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  filesButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
});