import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Alert, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

import { logError, logInfo } from '@/utils/logger';
import { generateUUID } from '@/utils/crypto';

export interface CameraOptions {
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
  allowsMultipleSelection?: boolean;
  mediaTypes?: ImagePicker.MediaTypeOptions;
}

export interface AttachmentFile {
  id: string;
  name: string;
  uri: string;
  type: string;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
  duration?: number;
  thumbnail?: string;
}

export interface ImageProcessingOptions {
  resize?: {
    width?: number;
    height?: number;
    quality?: number;
  };
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  compress?: {
    quality: number;
    format?: 'jpeg' | 'png' | 'webp';
  };
}

class CameraManager {
  private permissionsRequested = false;

  constructor() {
    this.checkPermissions();
  }

  private async checkPermissions() {
    try {
      // Check camera permissions
      const cameraResult = await ImagePicker.requestCameraPermissionsAsync();
      const mediaResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (cameraResult.status !== 'granted' || mediaResult.status !== 'granted') {
        logInfo('Camera and media library permissions not granted');
      }

      this.permissionsRequested = true;
    } catch (error) {
      logError('Failed to request camera permissions:', error);
    }
  }

  // Take photo with camera
  async takePhoto(options: CameraOptions = {}): Promise<AttachmentFile | null> {
    try {
      if (!this.permissionsRequested) {
        await this.checkPermissions();
      }

      // Check permissions
      const { status } = await ImagePicker.getCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Camera Permission Required',
          'This app needs camera access to take photos for document attachments.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Grant Permission',
              onPress: async () => {
                await ImagePicker.requestCameraPermissionsAsync();
              }
            },
          ]
        );
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: options.mediaTypes || ImagePicker.MediaTypeOptions.Images,
        allowsEditing: options.allowsEditing ?? true,
        aspect: options.aspect || [4, 3],
        quality: options.quality || 0.8,
        exif: false, // Don't include EXIF data for privacy
      });

      if (result.canceled) {
        return null;
      }

      const asset = result.assets[0];
      return await this.processImageAsset(asset);

    } catch (error) {
      logError('Failed to take photo:', error);

      Alert.alert(
        'Camera Error',
        'Failed to take photo. Please try again.',
        [{ text: 'OK', style: 'default' }]
      );

      return null;
    }
  }

  // Pick image from gallery
  async pickImage(options: CameraOptions = {}): Promise<AttachmentFile[]> {
    try {
      if (!this.permissionsRequested) {
        await this.checkPermissions();
      }

      // Check permissions
      const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Photo Library Permission Required',
          'This app needs photo library access to select images for document attachments.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Grant Permission',
              onPress: async () => {
                await ImagePicker.requestMediaLibraryPermissionsAsync();
              }
            },
          ]
        );
        return [];
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: options.mediaTypes || ImagePicker.MediaTypeOptions.Images,
        allowsEditing: options.allowsEditing ?? false,
        allowsMultipleSelection: options.allowsMultipleSelection ?? true,
        quality: options.quality || 0.8,
        exif: false,
      });

      if (result.canceled) {
        return [];
      }

      const attachments: AttachmentFile[] = [];

      for (const asset of result.assets) {
        const attachment = await this.processImageAsset(asset);
        if (attachment) {
          attachments.push(attachment);
        }
      }

      return attachments;

    } catch (error) {
      logError('Failed to pick images:', error);

      Alert.alert(
        'Gallery Error',
        'Failed to select images. Please try again.',
        [{ text: 'OK', style: 'default' }]
      );

      return [];
    }
  }

  // Pick documents
  async pickDocument(): Promise<AttachmentFile[]> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return [];
      }

      const attachments: AttachmentFile[] = [];

      for (const asset of result.assets) {
        const attachment = await this.processDocumentAsset(asset);
        if (attachment) {
          attachments.push(attachment);
        }
      }

      return attachments;

    } catch (error) {
      logError('Failed to pick documents:', error);

      Alert.alert(
        'Document Picker Error',
        'Failed to select documents. Please try again.',
        [{ text: 'OK', style: 'default' }]
      );

      return [];
    }
  }

  // Process image asset
  private async processImageAsset(asset: ImagePicker.ImagePickerAsset): Promise<AttachmentFile | null> {
    try {
      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(asset.uri);

      if (!fileInfo.exists) {
        throw new Error('File does not exist');
      }

      // Generate thumbnail for large images
      let thumbnailUri: string | undefined;
      if (asset.width && asset.height && (asset.width > 800 || asset.height > 800)) {
        thumbnailUri = await this.generateThumbnail(asset.uri, {
          width: 200,
          height: 200,
        });
      }

      return {
        id: generateUUID(),
        name: asset.fileName || `image_${Date.now()}.jpg`,
        uri: asset.uri,
        type: 'image',
        size: fileInfo.size || 0,
        mimeType: asset.mimeType || 'image/jpeg',
        width: asset.width,
        height: asset.height,
        thumbnail: thumbnailUri,
      };

    } catch (error) {
      logError('Failed to process image asset:', error);
      return null;
    }
  }

  // Process document asset
  private async processDocumentAsset(asset: DocumentPicker.DocumentPickerAsset): Promise<AttachmentFile | null> {
    try {
      // Validate file size (max 50MB)
      if (asset.size && asset.size > 50 * 1024 * 1024) {
        Alert.alert(
          'File Too Large',
          'Selected file is too large. Maximum file size is 50MB.',
          [{ text: 'OK', style: 'default' }]
        );
        return null;
      }

      // Generate thumbnail for supported document types
      let thumbnailUri: string | undefined;
      if (this.isImageFile(asset.mimeType)) {
        thumbnailUri = await this.generateThumbnail(asset.uri, {
          width: 200,
          height: 200,
        });
      }

      return {
        id: generateUUID(),
        name: asset.name,
        uri: asset.uri,
        type: this.getFileType(asset.mimeType),
        size: asset.size || 0,
        mimeType: asset.mimeType || 'application/octet-stream',
        thumbnail: thumbnailUri,
      };

    } catch (error) {
      logError('Failed to process document asset:', error);
      return null;
    }
  }

  // Generate thumbnail
  private async generateThumbnail(uri: string, options: { width: number; height: number }): Promise<string> {
    try {
      // For now, return the original URI
      // In a real implementation, you would use a library like expo-image-manipulator
      // to resize the image and create a thumbnail
      return uri;
    } catch (error) {
      logError('Failed to generate thumbnail:', error);
      return uri;
    }
  }

  // Process image with options
  async processImage(uri: string, options: ImageProcessingOptions): Promise<string> {
    try {
      // This would require expo-image-manipulator
      // For now, return the original URI
      return uri;
    } catch (error) {
      logError('Failed to process image:', error);
      return uri;
    }
  }

  // Compress image
  async compressImage(uri: string, quality: number = 0.8): Promise<string> {
    try {
      // This would require expo-image-manipulator
      // For now, return the original URI
      return uri;
    } catch (error) {
      logError('Failed to compress image:', error);
      return uri;
    }
  }

  // Save to device gallery
  async saveToGallery(uri: string): Promise<void> {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'This app needs media library access to save photos to your gallery.',
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }

      await MediaLibrary.saveToLibraryAsync(uri);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert(
        'Saved',
        'Image saved to your photo gallery.',
        [{ text: 'OK', style: 'default' }]
      );

    } catch (error) {
      logError('Failed to save to gallery:', error);

      Alert.alert(
        'Save Error',
        'Failed to save image to gallery.',
        [{ text: 'OK', style: 'default' }]
      );
    }
  }

  // Delete attachment file
  async deleteAttachment(uri: string): Promise<void> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);

      if (fileInfo.exists) {
        await FileSystem.deleteAsync(uri);
        logInfo(`Deleted attachment: ${uri}`);
      }

    } catch (error) {
      logError('Failed to delete attachment:', error);
    }
  }

  // Utility functions
  private isImageFile(mimeType?: string): boolean {
    if (!mimeType) return false;
    return mimeType.startsWith('image/');
  }

  private getFileType(mimeType?: string): string {
    if (!mimeType) return 'file';

    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('document') || mimeType.includes('word')) return 'document';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'spreadsheet';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'presentation';
    if (mimeType.includes('text')) return 'text';
    if (mimeType.includes('zip') || mimeType.includes('archive')) return 'archive';

    return 'file';
  }

  // Get file icon name for UI
  getFileIcon(type: string): string {
    switch (type) {
      case 'image':
        return 'image';
      case 'video':
        return 'video';
      case 'audio':
        return 'music-note';
      case 'pdf':
        return 'file-pdf-box';
      case 'document':
        return 'file-document';
      case 'spreadsheet':
        return 'file-excel';
      case 'presentation':
        return 'file-powerpoint';
      case 'text':
        return 'file-document-outline';
      case 'archive':
        return 'folder-zip';
      default:
        return 'file';
    }
  }

  // Format file size
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  // Show attachment picker dialog
  showAttachmentPicker(): Promise<AttachmentFile[]> {
    return new Promise((resolve) => {
      Alert.alert(
        'Add Attachment',
        'Choose how you want to add an attachment',
        [
          {
            text: 'Camera',
            onPress: async () => {
              const result = await this.takePhoto();
              resolve(result ? [result] : []);
            },
          },
          {
            text: 'Photo Library',
            onPress: async () => {
              const results = await this.pickImage({
                allowsMultipleSelection: true,
                allowsEditing: false,
              });
              resolve(results);
            },
          },
          {
            text: 'Documents',
            onPress: async () => {
              const results = await this.pickDocument();
              resolve(results);
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve([]),
          },
        ]
      );
    });
  }
}

export const cameraManager = new CameraManager();
export default cameraManager;
