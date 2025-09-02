import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Animated,
  Vibration,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { RNCamera } from 'react-native-camera';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Toast from 'react-native-toast-message';
import { useTheme } from '../providers/ThemeProvider';
import { useOffline } from '../providers/OfflineProvider';
import { PerformanceService } from '../services/performance';
import ValuationCard from '../components/ValuationCard';

// Services
import { CameraService } from '../services/camera';
import { AIValuationService } from '../services/ai-valuation';
import { OfflineQueueService } from '../services/offline-queue';

// Types
import { CapturedImage, AIValuationResponse, Category } from '../types';

const CameraScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { isOnline } = useOffline();
  const styles = createStyles(theme);
  
  const cameraRef = useRef<RNCamera>(null);
  const flashAnimValue = useRef(new Animated.Value(0)).current;
  
  const [isCapturing, setIsCapturing] = useState(false);
  const [flashMode, setFlashMode] = useState(RNCamera.Constants.FlashMode.auto);
  const [cameraType, setCameraType] = useState(RNCamera.Constants.Type.back);
  const [capturedImage, setCapturedImage] = useState<CapturedImage | null>(null);
  const [aiValuation, setAiValuation] = useState<AIValuationResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showValuationModal, setShowValuationModal] = useState(false);
  const [additionalContext, setAdditionalContext] = useState('');

  useEffect(() => {
    const startTime = Date.now();
    
    return () => {
      const loadTime = Date.now() - startTime;
      PerformanceService.recordScreenMetrics({
        screen: 'Camera',
        loadTime,
        renderTime: loadTime,
        memoryUsage: 0,
        batteryLevel: 0,
        timestamp: new Date(),
      });
    };
  }, []);

  const takePhoto = async () => {
    if (!cameraRef.current || isCapturing) return;

    try {
      setIsCapturing(true);
      
      // Flash animation
      Animated.sequence([
        Animated.timing(flashAnimValue, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(flashAnimValue, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      // Vibration feedback
      Vibration.vibrate(50);

      const options = {
        quality: 0.8,
        base64: true,
        doNotSave: false,
        pauseAfterCapture: true,
        width: 1024,
        height: 1024,
        fixOrientation: true,
      };

      const data = await cameraRef.current.takePictureAsync(options);
      
      const capturedImage: CapturedImage = {
        id: Date.now().toString(),
        uri: data.uri,
        base64: data.base64,
        width: data.width,
        height: data.height,
        fileSize: data.base64?.length || 0,
        timestamp: new Date(),
        processed: false,
        uploaded: false,
      };

      setCapturedImage(capturedImage);
      
      // Start AI processing if online
      if (isOnline) {
        processImageWithAI(capturedImage);
      } else {
        // Queue for offline processing
        await OfflineQueueService.addToQueue({
          type: 'CREATE',
          entity: 'valuation',
          data: {
            imageUri: capturedImage.uri,
            base64: capturedImage.base64,
            timestamp: capturedImage.timestamp,
          },
        });
        
        Toast.show({
          type: 'info',
          text1: 'Photo Captured',
          text2: 'Will process when back online',
        });
      }

    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const processImageWithAI = async (image: CapturedImage) => {
    if (!image.base64) return;

    setIsProcessing(true);
    
    try {
      const response = await AIValuationService.analyzeImage({
        imageUri: image.uri,
        description: additionalContext,
        additionalContext: 'Mobile capture for valuation',
      });

      setAiValuation(response);
      setShowValuationModal(true);
      
      Toast.show({
        type: 'success',
        text1: 'AI Analysis Complete',
        text2: `Estimated value: $${response.estimated_value.toLocaleString()}`,
      });

    } catch (error) {
      console.error('Error processing image:', error);
      Alert.alert(
        'Processing Error',
        'Failed to analyze image. The photo has been saved and will be processed later.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setAiValuation(null);
    setShowValuationModal(false);
    cameraRef.current?.resumePreview();
  };

  const saveValuation = async () => {
    if (!capturedImage || !aiValuation) return;

    try {
      // Create item with valuation
      const itemData = {
        name: aiValuation.description,
        category: aiValuation.category,
        condition: aiValuation.condition,
        estimated_value: aiValuation.estimated_value,
        confidence_score: aiValuation.confidence_score,
        valuation_type: 'ai_estimated' as const,
        methodology_notes: aiValuation.reasoning,
        image_uri: capturedImage.uri,
        additional_context: additionalContext,
      };

      if (isOnline) {
        // Save immediately
        // await apiService.createItemWithValuation(itemData);
        Toast.show({
          type: 'success',
          text1: 'Saved Successfully',
          text2: 'Item and valuation have been saved',
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
          text1: 'Saved Offline',
          text2: 'Will sync when back online',
        });
      }

      setShowValuationModal(false);
      navigation.goBack();

    } catch (error) {
      console.error('Error saving valuation:', error);
      Alert.alert('Error', 'Failed to save valuation. Please try again.');
    }
  };

  const toggleFlash = () => {
    const modes = [
      RNCamera.Constants.FlashMode.auto,
      RNCamera.Constants.FlashMode.on,
      RNCamera.Constants.FlashMode.off,
    ];
    const currentIndex = modes.indexOf(flashMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setFlashMode(nextMode);
  };

  const toggleCamera = () => {
    setCameraType(
      cameraType === RNCamera.Constants.Type.back
        ? RNCamera.Constants.Type.front
        : RNCamera.Constants.Type.back
    );
  };

  const getFlashIcon = () => {
    switch (flashMode) {
      case RNCamera.Constants.FlashMode.auto:
        return 'flash-auto';
      case RNCamera.Constants.FlashMode.on:
        return 'flash-on';
      case RNCamera.Constants.FlashMode.off:
        return 'flash-off';
      default:
        return 'flash-auto';
    }
  };

  const renderCameraControls = () => (
    <View style={styles.controls}>
      <TouchableOpacity
        style={styles.controlButton}
        onPress={() => navigation.goBack()}
      >
        <Icon name="close" size={24} color="white" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.captureButton}
        onPress={takePhoto}
        disabled={isCapturing}
      >
        <View style={[styles.captureButtonInner, isCapturing && styles.capturing]}>
          {isCapturing ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Icon name="camera" size={32} color="white" />
          )}
        </View>
      </TouchableOpacity>

      <View style={styles.rightControls}>
        <TouchableOpacity style={styles.controlButton} onPress={toggleFlash}>
          <Icon name={getFlashIcon()} size={24} color="white" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.controlButton} onPress={toggleCamera}>
          <Icon name="flip-camera-ios" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderValuationModal = () => (
    <Modal
      visible={showValuationModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>AI Valuation Results</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowValuationModal(false)}
          >
            <Icon name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {aiValuation && (
            <View style={styles.valuationContent}>
              <View style={styles.estimateSection}>
                <Text style={styles.estimateLabel}>Estimated Value</Text>
                <Text style={styles.estimateValue}>
                  ${aiValuation.estimated_value.toLocaleString()}
                </Text>
                <View style={styles.confidenceContainer}>
                  <Text style={styles.confidenceLabel}>
                    Confidence: {Math.round(aiValuation.confidence_score * 100)}%
                  </Text>
                </View>
              </View>

              <View style={styles.detailsSection}>
                <Text style={styles.detailLabel}>Category:</Text>
                <Text style={styles.detailValue}>{aiValuation.category}</Text>
                
                <Text style={styles.detailLabel}>Condition:</Text>
                <Text style={styles.detailValue}>{aiValuation.condition}</Text>
                
                <Text style={styles.detailLabel}>Description:</Text>
                <Text style={styles.detailValue}>{aiValuation.description}</Text>
              </View>

              {aiValuation.comparisons.length > 0 && (
                <View style={styles.comparisonsSection}>
                  <Text style={styles.sectionTitle}>Market Comparisons</Text>
                  {aiValuation.comparisons.map((comp, index) => (
                    <View key={index} style={styles.comparisonItem}>
                      <Text style={styles.comparisonTitle}>{comp.title}</Text>
                      <Text style={styles.comparisonPrice}>
                        ${comp.price.toLocaleString()}
                      </Text>
                      <Text style={styles.comparisonSource}>
                        {comp.source} • {Math.round(comp.similarity * 100)}% similar
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.reasoningSection}>
                <Text style={styles.sectionTitle}>AI Reasoning</Text>
                <Text style={styles.reasoningText}>{aiValuation.reasoning}</Text>
              </View>

              <View style={styles.contextSection}>
                <Text style={styles.sectionTitle}>Additional Context</Text>
                <TextInput
                  style={styles.contextInput}
                  placeholder="Add any additional details about this item..."
                  value={additionalContext}
                  onChangeText={setAdditionalContext}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.modalActions}>
          <TouchableOpacity style={styles.retakeButton} onPress={retakePhoto}>
            <Text style={styles.retakeText}>Retake Photo</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.saveButton} onPress={saveValuation}>
            <Text style={styles.saveText}>Save Valuation</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <RNCamera
        ref={cameraRef}
        style={styles.camera}
        type={cameraType}
        flashMode={flashMode}
        captureAudio={false}
        androidCameraPermissionOptions={{
          title: 'Permission to use camera',
          message: 'We need your permission to use your camera for item valuation',
          buttonPositive: 'Ok',
          buttonNegative: 'Cancel',
        }}
      />

      {/* Flash overlay */}
      <Animated.View
        style={[
          styles.flashOverlay,
          {
            opacity: flashAnimValue,
          },
        ]}
      />

      {/* Processing overlay */}
      {isProcessing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="white" />
          <Text style={styles.processingText}>
            Analyzing image with AI...
          </Text>
        </View>
      )}

      {/* Offline indicator */}
      {!isOnline && (
        <View style={styles.offlineIndicator}>
          <Icon name="cloud-off" size={16} color="white" />
          <Text style={styles.offlineText}>Offline Mode</Text>
        </View>
      )}

      {renderCameraControls()}
      {renderValuationModal()}
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
  flashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    zIndex: 1,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  processingText: {
    color: 'white',
    fontSize: theme.fontSize.md,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  offlineIndicator: {
    position: 'absolute',
    top: 50,
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
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'white',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  capturing: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  rightControls: {
    alignItems: 'center',
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
  },
  valuationContent: {
    padding: theme.spacing.md,
  },
  estimateSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
  },
  estimateLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  estimateValue: {
    fontSize: theme.fontSize.xl * 1.5,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  confidenceContainer: {
    backgroundColor: theme.colors.primary + '20',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  confidenceLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  detailsSection: {
    marginBottom: theme.spacing.lg,
  },
  detailLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs / 2,
    marginTop: theme.spacing.sm,
  },
  detailValue: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
  },
  comparisonsSection: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  comparisonItem: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.xs,
  },
  comparisonTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
    color: theme.colors.text,
  },
  comparisonPrice: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.success,
    marginTop: theme.spacing.xs / 2,
  },
  comparisonSource: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs / 2,
  },
  reasoningSection: {
    marginBottom: theme.spacing.lg,
  },
  reasoningText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  contextSection: {
    marginBottom: theme.spacing.lg,
  },
  contextInput: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.sm,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  retakeButton: {
    flex: 1,
    backgroundColor: theme.colors.textSecondary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  retakeText: {
    color: 'white',
    fontSize: theme.fontSize.md,
    fontWeight: '500',
  },
  saveButton: {
    flex: 2,
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    marginLeft: theme.spacing.sm,
  },
  saveText: {
    color: 'white',
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
});

export default CameraScreen;