import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Surface,
  Text,
  Button,
  IconButton,
  ProgressBar,
  Chip,
  Portal,
  Modal,
} from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import { MaterialIcons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { cameraManager, AttachmentFile } from '@/services/camera';
import { uploadAttachment, UploadProgress } from '@/services/upload';
import { formatFileSize } from '@/utils/file';

interface AttachmentUploaderProps {
  documentId: string;
  onUploadComplete?: (attachment: any) => void;
  onUploadError?: (error: Error) => void;
  maxFiles?: number;
  maxFileSize?: number; // in bytes
  allowedTypes?: string[];
}

interface UploadingFile extends AttachmentFile {
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  uploadedUrl?: string;
}

export const AttachmentUploader: React.FC<AttachmentUploaderProps> = ({
  documentId,
  onUploadComplete,
  onUploadError,
  maxFiles = 10,
  maxFileSize = 50 * 1024 * 1024, // 50MB
  allowedTypes = ['image/*', 'application/pdf', 'text/*'],
}) => {
  const { theme } = useTheme();

  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState<UploadingFile | null>(null);

  // Add files to upload queue
  const addFiles = useCallback((files: AttachmentFile[]) => {
    // Check file limits
    if (uploadingFiles.length + files.length > maxFiles) {
      Alert.alert(
        'Too Many Files',
        `You can only upload up to ${maxFiles} files at once.`,
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    // Validate files
    const validFiles: UploadingFile[] = [];
    const invalidFiles: string[] = [];

    for (const file of files) {
      // Check file size
      if (file.size > maxFileSize) {
        invalidFiles.push(`${file.name} is too large (max ${formatFileSize(maxFileSize)})`);
        continue;
      }

      // Check file type
      const isAllowed = allowedTypes.some(type => {
        if (type.endsWith('/*')) {
          const category = type.split('/')[0];
          return file.mimeType.startsWith(category);
        }
        return file.mimeType === type;
      });

      if (!isAllowed) {
        invalidFiles.push(`${file.name} is not a supported file type`);
        continue;
      }

      validFiles.push({
        ...file,
        progress: 0,
        status: 'pending',
      });
    }

    // Show validation errors
    if (invalidFiles.length > 0) {
      Alert.alert(
        'Invalid Files',
        invalidFiles.join('\n'),
        [{ text: 'OK', style: 'default' }]
      );
    }

    if (validFiles.length > 0) {
      setUploadingFiles(prev => [...prev, ...validFiles]);

      // Start uploading
      validFiles.forEach(file => {
        startUpload(file);
      });
    }
  }, [uploadingFiles.length, maxFiles, maxFileSize, allowedTypes]);

  // Start file upload
  const startUpload = useCallback(async (file: UploadingFile) => {
    try {
      // Update status to uploading
      setUploadingFiles(prev => prev.map(f =>
        f.id === file.id ? { ...f, status: 'uploading' as const } : f
      ));

      // Upload with progress tracking
      const uploadedAttachment = await uploadAttachment(
        file,
        documentId,
        (progress: UploadProgress) => {
          setUploadingFiles(prev => prev.map(f =>
            f.id === file.id ? {
              ...f,
              progress: progress.loaded / progress.total * 100
            } : f
          ));
        }
      );

      // Update status to completed
      setUploadingFiles(prev => prev.map(f =>
        f.id === file.id ? {
          ...f,
          status: 'completed' as const,
          progress: 100,
          uploadedUrl: uploadedAttachment.url,
        } : f
      ));

      // Notify parent component
      onUploadComplete?.(uploadedAttachment);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    } catch (error) {
      console.error('Upload failed:', error);

      // Update status to error
      setUploadingFiles(prev => prev.map(f =>
        f.id === file.id ? {
          ...f,
          status: 'error' as const,
          error: error instanceof Error ? error.message : 'Upload failed',
        } : f
      ));

      onUploadError?.(error instanceof Error ? error : new Error('Upload failed'));

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [documentId, onUploadComplete, onUploadError]);

  // Remove file from upload queue
  const removeFile = useCallback((fileId: string) => {
    setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
    Haptics.selectionAsync();
  }, []);

  // Retry failed upload
  const retryUpload = useCallback((file: UploadingFile) => {
    if (file.status === 'error') {
      startUpload({ ...file, progress: 0, status: 'pending', error: undefined });
    }
  }, [startUpload]);

  // Show attachment picker
  const showAttachmentPicker = useCallback(async () => {
    try {
      const files = await cameraManager.showAttachmentPicker();
      if (files.length > 0) {
        addFiles(files);
      }
    } catch (error) {
      console.error('Failed to show attachment picker:', error);
    }
  }, [addFiles]);

  // Preview attachment
  const previewAttachment = useCallback((file: UploadingFile) => {
    setPreviewFile(file);
    setPreviewVisible(true);
  }, []);

  // Get status color
  const getStatusColor = (status: UploadingFile['status']) => {
    switch (status) {
      case 'pending':
        return theme.colors.outline;
      case 'uploading':
        return theme.colors.primary;
      case 'completed':
        return theme.colors.tertiary;
      case 'error':
        return theme.colors.error;
      default:
        return theme.colors.outline;
    }
  };

  // Get status icon
  const getStatusIcon = (status: UploadingFile['status']) => {
    switch (status) {
      case 'pending':
        return 'clock-outline';
      case 'uploading':
        return 'upload';
      case 'completed':
        return 'check-circle';
      case 'error':
        return 'alert-circle';
      default:
        return 'file';
    }
  };

  const styles = createStyles(theme);

  return (
    <>
      <Surface style={styles.container}>
        {/* Upload Button */}
        <Button
          mode="outlined"
          onPress={showAttachmentPicker}
          icon="attachment"
          style={styles.uploadButton}
          disabled={uploadingFiles.length >= maxFiles}
        >
          Add Attachment
        </Button>

        {/* File List */}
        {uploadingFiles.length > 0 && (
          <ScrollView style={styles.fileList} showsVerticalScrollIndicator={false}>
            {uploadingFiles.map(file => (
              <Surface key={file.id} style={styles.fileItem}>
                <View style={styles.fileContent}>
                  {/* File Thumbnail */}
                  <TouchableOpacity
                    style={styles.thumbnailContainer}
                    onPress={() => previewAttachment(file)}
                    disabled={!file.thumbnail && file.type !== 'image'}
                  >
                    {file.thumbnail || file.type === 'image' ? (
                      <Image
                        source={{ uri: file.thumbnail || file.uri }}
                        style={styles.thumbnail}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.fileIcon}>
                        <MaterialIcons
                          name={cameraManager.getFileIcon(file.type) as any}
                          size={24}
                          color={theme.colors.onSurfaceVariant}
                        />
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* File Info */}
                  <View style={styles.fileInfo}>
                    <Text variant="bodyMedium" numberOfLines={1} style={styles.fileName}>
                      {file.name}
                    </Text>

                    <View style={styles.fileDetails}>
                      <Text variant="bodySmall" style={styles.fileSize}>
                        {cameraManager.formatFileSize(file.size)}
                      </Text>

                      <Chip
                        compact
                        textStyle={styles.statusChipText}
                        style={[
                          styles.statusChip,
                          { backgroundColor: getStatusColor(file.status) + '20' }
                        ]}
                        icon={getStatusIcon(file.status)}
                      >
                        {file.status.toUpperCase()}
                      </Chip>
                    </View>

                    {/* Progress Bar */}
                    {file.status === 'uploading' && (
                      <ProgressBar
                        progress={file.progress / 100}
                        color={theme.colors.primary}
                        style={styles.progressBar}
                      />
                    )}

                    {/* Error Message */}
                    {file.status === 'error' && file.error && (
                      <Text variant="bodySmall" style={styles.errorText}>
                        {file.error}
                      </Text>
                    )}
                  </View>

                  {/* Actions */}
                  <View style={styles.fileActions}>
                    {file.status === 'error' && (
                      <IconButton
                        icon="refresh"
                        size={20}
                        onPress={() => retryUpload(file)}
                      />
                    )}

                    {file.status !== 'uploading' && (
                      <IconButton
                        icon="close"
                        size={20}
                        onPress={() => removeFile(file.id)}
                      />
                    )}
                  </View>
                </View>
              </Surface>
            ))}
          </ScrollView>
        )}

        {/* Upload Summary */}
        {uploadingFiles.length > 0 && (
          <View style={styles.summary}>
            <Text variant="bodySmall" style={styles.summaryText}>
              {uploadingFiles.filter(f => f.status === 'completed').length} of {uploadingFiles.length} files uploaded
            </Text>
          </View>
        )}
      </Surface>

      {/* Preview Modal */}
      <Portal>
        <Modal
          visible={previewVisible}
          onDismiss={() => setPreviewVisible(false)}
          contentContainerStyle={styles.previewModal}
        >
          {previewFile && (
            <Surface style={styles.previewContent}>
              <View style={styles.previewHeader}>
                <Text variant="titleMedium" numberOfLines={1} style={styles.previewTitle}>
                  {previewFile.name}
                </Text>
                <IconButton
                  icon="close"
                  size={20}
                  onPress={() => setPreviewVisible(false)}
                />
              </View>

              {(previewFile.type === 'image' || previewFile.thumbnail) && (
                <Image
                  source={{ uri: previewFile.thumbnail || previewFile.uri }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              )}

              <View style={styles.previewDetails}>
                <Text variant="bodySmall">
                  Size: {cameraManager.formatFileSize(previewFile.size)}
                </Text>
                <Text variant="bodySmall">
                  Type: {previewFile.mimeType}
                </Text>
                {previewFile.width && previewFile.height && (
                  <Text variant="bodySmall">
                    Dimensions: {previewFile.width} × {previewFile.height}
                  </Text>
                )}
              </View>
            </Surface>
          )}
        </Modal>
      </Portal>
    </>
  );
};

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      borderRadius: 12,
      padding: 16,
      elevation: 2,
    },
    uploadButton: {
      marginBottom: 16,
    },
    fileList: {
      maxHeight: 300,
    },
    fileItem: {
      marginBottom: 12,
      borderRadius: 8,
      elevation: 1,
    },
    fileContent: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
    },
    thumbnailContainer: {
      marginRight: 12,
    },
    thumbnail: {
      width: 48,
      height: 48,
      borderRadius: 8,
    },
    fileIcon: {
      width: 48,
      height: 48,
      borderRadius: 8,
      backgroundColor: theme.colors.surfaceVariant,
      justifyContent: 'center',
      alignItems: 'center',
    },
    fileInfo: {
      flex: 1,
    },
    fileName: {
      fontWeight: '500',
      marginBottom: 4,
    },
    fileDetails: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    fileSize: {
      color: theme.colors.onSurfaceVariant,
      marginRight: 12,
    },
    statusChip: {
      height: 24,
    },
    statusChipText: {
      fontSize: 10,
      lineHeight: 12,
    },
    progressBar: {
      height: 4,
      borderRadius: 2,
    },
    errorText: {
      color: theme.colors.error,
      marginTop: 4,
    },
    fileActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    summary: {
      marginTop: 16,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.outline + '40',
    },
    summaryText: {
      textAlign: 'center',
      color: theme.colors.onSurfaceVariant,
    },
    previewModal: {
      margin: 20,
      borderRadius: 12,
      maxHeight: '80%',
    },
    previewContent: {
      borderRadius: 12,
      overflow: 'hidden',
    },
    previewHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline + '40',
    },
    previewTitle: {
      flex: 1,
      fontWeight: '600',
    },
    previewImage: {
      width: '100%',
      height: 300,
    },
    previewDetails: {
      padding: 16,
      gap: 4,
    },
  });
