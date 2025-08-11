import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Dimensions,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
  Alert,
} from 'react-native';
import { Text, Button, Portal, Modal, Surface } from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

import { useAppSelector, useAppDispatch } from '@/stores/hooks';
import { useDocument, useUpdatePresence, useApplyDocumentOperations } from '@/graphql/generated/types';
import { EditorToolbar } from './EditorToolbar';
import { FormatMenu } from './FormatMenu';
import { MentionSuggestions } from './MentionSuggestions';
import { LinkPreview } from './LinkPreview';
import { PresenceLayer } from './PresenceLayer';
import { SelectionHandle } from './SelectionHandle';
import { useTheme } from '@/hooks/useTheme';
import { useDebounce } from '@/hooks/useDebounce';
import { generateUUID } from '@/utils/crypto';
import { logError } from '@/utils/logger';

interface CollaborativeEditorProps {
  documentId: string;
  readOnly?: boolean;
  onSelectionChange?: (selection: { start: number; end: number }) => void;
  onContentChange?: (content: string) => void;
}

interface EditorState {
  content: string;
  selection: { start: number; end: number };
  isComposing: boolean;
  hasUnsavedChanges: boolean;
  formatMenuVisible: boolean;
  formatMenuPosition: { x: number; y: number };
}

interface Operation {
  id: string;
  type: 'insert' | 'delete' | 'format';
  position: number;
  length?: number;
  content?: any;
  timestamp: number;
  authorId: string;
}

export const CollaborativeEditor: React.FC<CollaborativeEditorProps> = ({
  documentId,
  readOnly = false,
  onSelectionChange,
  onContentChange,
}) => {
  const dispatch = useAppDispatch();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = Dimensions.get('window');

  // Refs
  const textInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const yjsDocRef = useRef<Y.Doc>(new Y.Doc());
  const wsProviderRef = useRef<WebsocketProvider | null>(null);
  const pendingOperationsRef = useRef<Operation[]>([]);

  // State
  const [editorState, setEditorState] = useState<EditorState>({
    content: '',
    selection: { start: 0, end: 0 },
    isComposing: false,
    hasUnsavedChanges: false,
    formatMenuVisible: false,
    formatMenuPosition: { x: 0, y: 0 },
  });

  // GraphQL hooks
  const { data: document, loading, error } = useDocument({
    variables: { id: documentId },
    errorPolicy: 'all',
  });

  const [updatePresence] = useUpdatePresence({
    onError: (error) => logError('Failed to update presence:', error),
  });

  const [applyOperations] = useApplyDocumentOperations({
    onError: (error) => logError('Failed to apply operations:', error),
  });

  // Current user from Redux store
  const currentUser = useAppSelector(state => state.auth.user);

  // Debounced content sync
  const debouncedContent = useDebounce(editorState.content, 500);

  // Initialize CRDT and WebSocket connection
  useEffect(() => {
    if (!document?.document) return;

    const yjsDoc = yjsDocRef.current;
    const yText = yjsDoc.getText('content');

    // Initialize WebSocket provider for real-time sync
    const wsProvider = new WebsocketProvider(
      'ws://localhost:1234', // Replace with your WebSocket server
      `document-${documentId}`,
      yjsDoc
    );

    wsProviderRef.current = wsProvider;

    // Listen to remote changes
    yText.observe((event, transaction) => {
      if (transaction.local) return; // Ignore local changes

      setEditorState(prev => ({
        ...prev,
        content: yText.toString(),
      }));
    });

    // Initialize content from GraphQL
    if (document.document.content.blocks.length > 0) {
      const initialContent = document.document.content.blocks
        .map(block => {
          switch (block.type) {
            case 'PARAGRAPH':
            case 'HEADING':
              return block.content.text || '';
            default:
              return '';
          }
        })
        .join('\n');

      yText.insert(0, initialContent);
      setEditorState(prev => ({ ...prev, content: initialContent }));
    }

    return () => {
      wsProvider.destroy();
    };
  }, [documentId, document?.document]);

  // Handle text input changes with CRDT operations
  const handleTextChange = useCallback((text: string) => {
    if (readOnly) return;

    const { content: prevContent, selection } = editorState;
    const yText = yjsDocRef.current.getText('content');

    // Calculate the difference
    const startPos = selection.start;
    const deleteLength = selection.end - selection.start;
    const insertText = text.slice(startPos, startPos + (text.length - prevContent.length + deleteLength));

    // Apply CRDT operation
    if (deleteLength > 0) {
      yText.delete(startPos, deleteLength);
    }

    if (insertText.length > 0) {
      yText.insert(startPos, insertText);
    }

    // Create operation for GraphQL sync
    const operation: Operation = {
      id: generateUUID(),
      type: deleteLength > 0 ? 'delete' : 'insert',
      position: startPos,
      length: deleteLength > 0 ? deleteLength : undefined,
      content: insertText.length > 0 ? { text: insertText } : undefined,
      timestamp: Date.now(),
      authorId: currentUser?.id || '',
    };

    pendingOperationsRef.current.push(operation);

    setEditorState(prev => ({
      ...prev,
      content: text,
      hasUnsavedChanges: true,
    }));

    onContentChange?.(text);

    // Haptic feedback for typing
    if (Platform.OS === 'ios' && insertText.length > 0) {
      Haptics.selectionAsync();
    }
  }, [editorState, readOnly, currentUser, onContentChange]);

  // Handle selection changes
  const handleSelectionChange = useCallback((event: any) => {
    const { selection } = event.nativeEvent;

    setEditorState(prev => ({
      ...prev,
      selection: { start: selection.start, end: selection.end },
    }));

    onSelectionChange?.(selection);

    // Update presence with cursor position
    if (currentUser) {
      updatePresence({
        variables: {
          input: {
            cursor: {
              blockId: 'main-text-block', // Simplified for mobile
              offset: selection.start,
            },
            selection: {
              start: {
                blockId: 'main-text-block',
                offset: selection.start,
              },
              end: {
                blockId: 'main-text-block',
                offset: selection.end,
              },
            },
            isTyping: false,
          },
        },
      });
    }
  }, [currentUser, updatePresence, onSelectionChange]);

  // Handle long press for format menu
  const handleLongPress = useCallback((event: any) => {
    if (readOnly) return;

    const { selection } = editorState;
    if (selection.start === selection.end) return; // No selection

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Calculate position for format menu
    const { pageX, pageY } = event.nativeEvent;

    setEditorState(prev => ({
      ...prev,
      formatMenuVisible: true,
      formatMenuPosition: { x: pageX, y: pageY },
    }));
  }, [readOnly, editorState.selection]);

  // Sync pending operations with GraphQL
  useEffect(() => {
    const syncOperations = async () => {
      if (pendingOperationsRef.current.length === 0) return;

      const operations = [...pendingOperationsRef.current];
      pendingOperationsRef.current = [];

      try {
        await applyOperations({
          variables: {
            documentId,
            operations: operations.map(op => ({
              type: op.type.toUpperCase() as any,
              position: op.position,
              length: op.length || 0,
              content: op.content,
              clientId: currentUser?.id || '',
            })),
          },
        });
      } catch (error) {
        // Re-add failed operations to retry
        pendingOperationsRef.current.unshift(...operations);
        logError('Failed to sync operations:', error);
      }
    };

    const timer = setInterval(syncOperations, 1000); // Sync every second
    return () => clearInterval(timer);
  }, [documentId, currentUser, applyOperations]);

  // Format text (bold, italic, etc.)
  const formatText = useCallback((format: string) => {
    if (readOnly) return;

    const { selection } = editorState;
    if (selection.start === selection.end) return;

    // Apply formatting operation
    const operation: Operation = {
      id: generateUUID(),
      type: 'format',
      position: selection.start,
      length: selection.end - selection.start,
      content: { format },
      timestamp: Date.now(),
      authorId: currentUser?.id || '',
    };

    pendingOperationsRef.current.push(operation);

    setEditorState(prev => ({
      ...prev,
      formatMenuVisible: false,
      hasUnsavedChanges: true,
    }));

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [readOnly, editorState.selection, currentUser]);

  // Auto-save functionality
  useEffect(() => {
    if (!editorState.hasUnsavedChanges) return;

    const autoSave = setTimeout(() => {
      // Auto-save logic here
      setEditorState(prev => ({ ...prev, hasUnsavedChanges: false }));
    }, 2000);

    return () => clearTimeout(autoSave);
  }, [editorState.hasUnsavedChanges]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>Loading document...</Text>
      </View>
    );
  }

  if (error || !document?.document) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>Failed to load document</Text>
        <Button mode="outlined" onPress={() => window.location.reload()}>
          Retry
        </Button>
      </View>
    );
  }

  const styles = createStyles(theme, screenWidth, insets);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {!readOnly && (
        <EditorToolbar
          onFormat={formatText}
          hasSelection={editorState.selection.start !== editorState.selection.end}
          disabled={readOnly}
        />
      )}

      <PresenceLayer documentId={documentId} />

      <KeyboardAwareScrollView
        ref={scrollViewRef}
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        extraScrollHeight={20}
      >
        <Surface style={styles.editorSurface}>
          <TextInput
            ref={textInputRef}
            style={[
              styles.textInput,
              readOnly && styles.readOnlyInput,
            ]}
            value={editorState.content}
            onChangeText={handleTextChange}
            onSelectionChange={handleSelectionChange}
            onLongPress={handleLongPress}
            multiline
            editable={!readOnly}
            placeholder="Start writing..."
            placeholderTextColor={theme.colors.onSurfaceDisabled}
            selectionColor={theme.colors.primary}
            textAlign="left"
            textAlignVertical="top"
            keyboardType="default"
            returnKeyType="default"
            blurOnSubmit={false}
            enablesReturnKeyAutomatically={false}
          />
        </Surface>
      </KeyboardAwareScrollView>

      <Portal>
        <Modal
          visible={editorState.formatMenuVisible}
          onDismiss={() => setEditorState(prev => ({ ...prev, formatMenuVisible: false }))}
          contentContainerStyle={[
            styles.formatMenu,
            {
              left: editorState.formatMenuPosition.x - 100,
              top: editorState.formatMenuPosition.y - 60,
            },
          ]}
        >
          <FormatMenu onFormat={formatText} />
        </Modal>
      </Portal>
    </KeyboardAvoidingView>
  );
};

const createStyles = (theme: any, screenWidth: number, insets: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    centered: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    scrollContainer: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: insets.bottom + 20,
    },
    editorSurface: {
      margin: 16,
      borderRadius: 12,
      minHeight: 400,
      elevation: 2,
    },
    textInput: {
      padding: 20,
      fontSize: 16,
      lineHeight: 24,
      color: theme.colors.onSurface,
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
      minHeight: 400,
      textAlignVertical: 'top',
    },
    readOnlyInput: {
      backgroundColor: theme.colors.surfaceDisabled,
    },
    formatMenu: {
      position: 'absolute',
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
  });
