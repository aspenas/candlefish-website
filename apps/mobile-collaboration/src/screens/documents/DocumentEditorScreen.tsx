import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  BackHandler,
  Platform,
} from 'react-native';
import {
  Appbar,
  FAB,
  Portal,
  Modal,
  Surface,
  Button,
  Text,
  Snackbar,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

// Components
import { CollaborativeEditor } from '@/components/editor/CollaborativeEditor';
import { CommentSystem } from '@/components/comments/CommentSystem';
import { AttachmentUploader } from '@/components/attachments/AttachmentUploader';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorScreen } from '@/components/ui/ErrorScreen';

// Hooks and Services
import { useDocument, useJoinDocument, useLeaveDocument } from '@/graphql/generated/types';
import { useAppSelector, useAppDispatch } from '@/stores/hooks';
import { useTheme } from '@/hooks/useTheme';
import { offlineManager } from '@/services/offline';
import { performanceManager } from '@/services/performance';
import { notificationManager } from '@/services/notifications';

// Types
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { DocumentStackParamList } from '@/navigation/MainNavigator';

type DocumentEditorScreenRouteProp = RouteProp<DocumentStackParamList, 'DocumentEditor'>;
type DocumentEditorScreenNavigationProp = NativeStackNavigationProp<DocumentStackParamList, 'DocumentEditor'>;

export const DocumentEditorScreen: React.FC = () => {
  const navigation = useNavigation<DocumentEditorScreenNavigationProp>();
  const route = useRoute<DocumentEditorScreenRouteProp>();
  const { documentId } = route.params;

  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // State
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [attachmentsVisible, setAttachmentsVisible] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Redux state
  const isOnline = useAppSelector(state => state.offline.network.isOnline);
  const currentUser = useAppSelector(state => state.auth.user);

  // GraphQL hooks
  const { data, loading, error, refetch } = useDocument({
    variables: { id: documentId },
    fetchPolicy: isOnline ? 'cache-and-network' : 'cache-only',
    errorPolicy: 'all',
  });

  const [joinDocument] = useJoinDocument({
    onError: (error) => {
      console.error('Failed to join document:', error);
      showSnackbar('Failed to join document collaboration');
    },
  });

  const [leaveDocument] = useLeaveDocument({
    onError: (error) => {
      console.error('Failed to leave document:', error);
    },
  });

  const document = data?.document;

  // Effects
  useEffect(() => {
    // Join document collaboration when screen loads
    if (document && currentUser) {
      joinDocument({
        variables: {
          input: {
            documentId,
            permissions: ['VIEW', 'EDIT', 'COMMENT'],
          },
        },
      });
    }

    return () => {
      // Leave document collaboration when screen unloads
      if (currentUser) {
        leaveDocument({
          variables: { documentId },
        });
      }
    };
  }, [document, currentUser, documentId]);

  // Handle offline mode
  useEffect(() => {
    setIsOfflineMode(!isOnline);

    if (!isOnline && document) {
      // Save document for offline access
      offlineManager.saveDocument(document);
      showSnackbar('Document saved for offline access');
    }
  }, [isOnline, document]);

  // Handle back button and unsaved changes
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (hasUnsavedChanges) {
          Alert.alert(
            'Unsaved Changes',
            'You have unsaved changes. Are you sure you want to leave?',
            [
              {
                text: 'Stay',
                style: 'cancel',
              },
              {
                text: 'Leave',
                style: 'destructive',
                onPress: () => navigation.goBack(),
              },
            ]
          );
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => subscription.remove();
    }, [hasUnsavedChanges, navigation])
  );

  // Handlers
  const handleContentChange = useCallback((content: string) => {
    setHasUnsavedChanges(true);

    // Auto-save after a delay
    setTimeout(() => {
      setHasUnsavedChanges(false);
    }, 2000);
  }, []);

  const handleCommentSelect = useCallback((commentId: string) => {
    navigation.navigate('Comments', { documentId, commentId });
  }, [navigation, documentId]);

  const handleAttachmentUpload = useCallback((attachment: any) => {
    showSnackbar(`${attachment.name} uploaded successfully`);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const handleShare = useCallback(async () => {
    // Implement sharing functionality
    // This would typically open a share modal or generate a share link
    showSnackbar('Share functionality would be implemented here');
  }, []);

  const showSnackbar = useCallback((message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  }, []);

  // Loading state
  if (loading && !document) {
    return <LoadingScreen message="Loading document..." />;
  }

  // Error state
  if (error && !document) {
    return (
      <ErrorScreen
        error={error}
        onRetry={() => refetch()}
        message="Failed to load document"
      />
    );
  }

  if (!document) {
    return (
      <ErrorScreen
        message="Document not found"
        onRetry={() => navigation.goBack()}
        retryLabel="Go Back"
      />
    );
  }

  const styles = createStyles(theme, insets);
  const commentsCount = document.comments?.length || 0;
  const unreadCommentsCount = document.comments?.filter(c => !c.isResolved).length || 0;

  return (
    <View style={styles.container}>
      {/* App Bar */}
      <Appbar.Header style={styles.appBar} elevated>
        <Appbar.BackAction onPress={() => navigation.goBack()} />

        <Appbar.Content
          title={document.name}
          subtitle={isOfflineMode ? 'Offline Mode' : `${document.activeUsers?.length || 0} collaborators`}
        />

        {hasUnsavedChanges && (
          <Appbar.Action
            icon="content-save"
            onPress={() => {/* Force save */}}
          />
        )}

        <Appbar.Action
          icon="comment-outline"
          onPress={() => setCommentsVisible(true)}
          badge={unreadCommentsCount > 0}
        />

        <Appbar.Action
          icon="attachment"
          onPress={() => setAttachmentsVisible(true)}
        />

        <Appbar.Action
          icon="share-variant"
          onPress={handleShare}
        />
      </Appbar.Header>

      {/* Main Content */}
      <View style={styles.content}>
        <CollaborativeEditor
          documentId={documentId}
          readOnly={!document.permissions.canWrite}
          onContentChange={handleContentChange}
        />
      </View>

      {/* Comments Modal */}
      <Portal>
        <Modal
          visible={commentsVisible}
          onDismiss={() => setCommentsVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Surface style={styles.modalSurface}>
            <View style={styles.modalHeader}>
              <Text variant="titleLarge">Comments ({commentsCount})</Text>
              <Button
                mode="text"
                onPress={() => setCommentsVisible(false)}
              >
                Close
              </Button>
            </View>

            <CommentSystem
              documentId={documentId}
              comments={document.comments || []}
              onCommentSelect={handleCommentSelect}
            />
          </Surface>
        </Modal>
      </Portal>

      {/* Attachments Modal */}
      <Portal>
        <Modal
          visible={attachmentsVisible}
          onDismiss={() => setAttachmentsVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Surface style={styles.modalSurface}>
            <View style={styles.modalHeader}>
              <Text variant="titleLarge">Attachments</Text>
              <Button
                mode="text"
                onPress={() => setAttachmentsVisible(false)}
              >
                Close
              </Button>
            </View>

            <AttachmentUploader
              documentId={documentId}
              onUploadComplete={handleAttachmentUpload}
              onUploadError={(error) => showSnackbar(`Upload failed: ${error.message}`)}
            />
          </Surface>
        </Modal>
      </Portal>

      {/* Floating Action Button */}
      {document.permissions.canComment && (
        <FAB
          icon="comment-plus"
          style={[styles.fab, { bottom: insets.bottom + 16 }]}
          onPress={() => setCommentsVisible(true)}
          small
        />
      )}

      {/* Snackbar for notifications */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={styles.snackbar}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
};

const createStyles = (theme: any, insets: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    appBar: {
      backgroundColor: theme.colors.surface,
      elevation: 2,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    content: {
      flex: 1,
    },
    modal: {
      margin: 16,
      borderRadius: 12,
      maxHeight: '90%',
    },
    modalSurface: {
      borderRadius: 12,
      overflow: 'hidden',
      maxHeight: '100%',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline + '40',
    },
    fab: {
      position: 'absolute',
      right: 16,
      backgroundColor: theme.colors.primary,
    },
    snackbar: {
      backgroundColor: theme.colors.inverseSurface,
    },
  });
