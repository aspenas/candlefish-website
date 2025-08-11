import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import {
  Surface,
  Text,
  Button,
  IconButton,
  Chip,
  Menu,
  Divider,
} from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { MentionSuggestions } from './MentionSuggestions';
import { AttachmentPicker } from './AttachmentPicker';
import { formatDetector } from '@/utils/text';

interface CommentComposerProps {
  onSubmit: (content: string, position?: { x: number; y: number }) => void;
  onCancel: () => void;
  initialPosition?: { x: number; y: number } | null;
  parentComment?: Comment | undefined;
  placeholder?: string;
}

interface Comment {
  id: string;
  content: { text: string };
  author: { name: string };
}

type CommentType = 'GENERAL' | 'SUGGESTION' | 'QUESTION' | 'ISSUE';
type CommentPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

interface MentionMatch {
  index: number;
  length: number;
  query: string;
}

export const CommentComposer: React.FC<CommentComposerProps> = ({
  onSubmit,
  onCancel,
  initialPosition,
  parentComment,
  placeholder = "Add a comment...",
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = Dimensions.get('window');

  const textInputRef = useRef<TextInput>(null);

  const [content, setContent] = useState('');
  const [type, setType] = useState<CommentType>('GENERAL');
  const [priority, setPriority] = useState<CommentPriority>('NORMAL');
  const [typeMenuVisible, setTypeMenuVisible] = useState(false);
  const [priorityMenuVisible, setPriorityMenuVisible] = useState(false);
  const [mentionSuggestionsVisible, setMentionSuggestionsVisible] = useState(false);
  const [currentMention, setCurrentMention] = useState<MentionMatch | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-focus on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      textInputRef.current?.focus();
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  // Keyboard listeners
  useEffect(() => {
    const keyboardWillShow = (event: any) => {
      setKeyboardHeight(event.endCoordinates.height);
    };

    const keyboardWillHide = () => {
      setKeyboardHeight(0);
    };

    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      keyboardWillShow
    );

    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      keyboardWillHide
    );

    return () => {
      showSubscription?.remove();
      hideSubscription?.remove();
    };
  }, []);

  // Detect mentions and formatting
  const handleTextChange = (text: string) => {
    setContent(text);

    // Detect mentions (@username)
    const mentionRegex = /@(\w*)$/;
    const match = text.match(mentionRegex);

    if (match && match[1] !== undefined) {
      const mentionStart = text.lastIndexOf('@');
      setCurrentMention({
        index: mentionStart,
        length: match[0].length,
        query: match[1],
      });
      setMentionSuggestionsVisible(true);
    } else {
      setCurrentMention(null);
      setMentionSuggestionsVisible(false);
    }

    // Auto-detect comment type based on content
    if (text.includes('?')) {
      setType('QUESTION');
    } else if (text.toLowerCase().includes('suggest') || text.toLowerCase().includes('recommend')) {
      setType('SUGGESTION');
    } else if (text.toLowerCase().includes('issue') || text.toLowerCase().includes('problem') || text.toLowerCase().includes('bug')) {
      setType('ISSUE');
    }
  };

  // Handle mention selection
  const handleMentionSelect = (username: string, userId: string) => {
    if (!currentMention) return;

    const beforeMention = content.substring(0, currentMention.index);
    const afterMention = content.substring(currentMention.index + currentMention.length);
    const newContent = `${beforeMention}@${username} ${afterMention}`;

    setContent(newContent);
    setCurrentMention(null);
    setMentionSuggestionsVisible(false);

    // Refocus input
    textInputRef.current?.focus();
  };

  // Submit comment
  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      await onSubmit(content.trim(), initialPosition);

      // Haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel and close
  const handleCancel = () => {
    Keyboard.dismiss();
    onCancel();
  };

  const commentTypeIcons: Record<CommentType, string> = {
    GENERAL: 'comment',
    SUGGESTION: 'lightbulb-outline',
    QUESTION: 'help-circle-outline',
    ISSUE: 'alert-circle-outline',
  };

  const priorityColors: Record<CommentPriority, string> = {
    LOW: theme.colors.surfaceVariant,
    NORMAL: theme.colors.primary,
    HIGH: theme.colors.tertiary,
    URGENT: theme.colors.error,
  };

  const styles = createStyles(theme, screenHeight, keyboardHeight, insets);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Surface style={styles.composerSurface}>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="titleMedium" style={styles.headerTitle}>
            {parentComment ? 'Reply to comment' : 'Add comment'}
          </Text>
          <IconButton
            icon="close"
            size={20}
            onPress={handleCancel}
          />
        </View>

        {/* Parent comment preview */}
        {parentComment && (
          <>
            <View style={styles.parentComment}>
              <Text variant="bodySmall" style={styles.parentAuthor}>
                Replying to {parentComment.author.name}:
              </Text>
              <Text variant="bodySmall" style={styles.parentContent} numberOfLines={2}>
                {parentComment.content.text}
              </Text>
            </View>
            <Divider style={styles.divider} />
          </>
        )}

        {/* Position indicator */}
        {initialPosition && (
          <View style={styles.positionIndicator}>
            <Text variant="bodySmall" style={styles.positionText}>
              Comment will be placed at position ({Math.round(initialPosition.x)}, {Math.round(initialPosition.y)})
            </Text>
          </View>
        )}

        {/* Content input */}
        <View style={styles.inputContainer}>
          <TextInput
            ref={textInputRef}
            style={styles.textInput}
            multiline
            value={content}
            onChangeText={handleTextChange}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.onSurfaceVariant}
            textAlignVertical="top"
            autoCorrect
            autoCapitalize="sentences"
            returnKeyType="default"
            blurOnSubmit={false}
          />
        </View>

        {/* Mention suggestions */}
        {mentionSuggestionsVisible && currentMention && (
          <MentionSuggestions
            query={currentMention.query}
            onSelect={handleMentionSelect}
            onClose={() => setMentionSuggestionsVisible(false)}
          />
        )}

        {/* Comment metadata */}
        <View style={styles.metadataContainer}>
          {/* Comment Type */}
          <Menu
            visible={typeMenuVisible}
            onDismiss={() => setTypeMenuVisible(false)}
            anchor={
              <Chip
                icon={commentTypeIcons[type]}
                onPress={() => setTypeMenuVisible(true)}
                style={styles.metadataChip}
              >
                {type}
              </Chip>
            }
          >
            {(['GENERAL', 'SUGGESTION', 'QUESTION', 'ISSUE'] as CommentType[]).map(commentType => (
              <Menu.Item
                key={commentType}
                onPress={() => {
                  setType(commentType);
                  setTypeMenuVisible(false);
                }}
                title={commentType}
                leadingIcon={commentTypeIcons[commentType]}
              />
            ))}
          </Menu>

          {/* Priority */}
          <Menu
            visible={priorityMenuVisible}
            onDismiss={() => setPriorityMenuVisible(false)}
            anchor={
              <Chip
                onPress={() => setPriorityMenuVisible(true)}
                style={[
                  styles.metadataChip,
                  { backgroundColor: priorityColors[priority] + '20' },
                ]}
              >
                {priority}
              </Chip>
            }
          >
            {(['LOW', 'NORMAL', 'HIGH', 'URGENT'] as CommentPriority[]).map(commentPriority => (
              <Menu.Item
                key={commentPriority}
                onPress={() => {
                  setPriority(commentPriority);
                  setPriorityMenuVisible(false);
                }}
                title={commentPriority}
              />
            ))}
          </Menu>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            mode="outlined"
            onPress={handleCancel}
            style={styles.cancelButton}
          >
            Cancel
          </Button>

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={isSubmitting}
            disabled={!content.trim() || isSubmitting}
            style={styles.submitButton}
          >
            {parentComment ? 'Reply' : 'Comment'}
          </Button>
        </View>
      </Surface>
    </KeyboardAvoidingView>
  );
};

const createStyles = (theme: any, screenHeight: number, keyboardHeight: number, insets: any) =>
  StyleSheet.create({
    container: {
      maxHeight: screenHeight - keyboardHeight - insets.top - 40,
    },
    composerSurface: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 12,
    },
    headerTitle: {
      color: theme.colors.onSurface,
      fontWeight: '600',
    },
    parentComment: {
      paddingHorizontal: 20,
      paddingVertical: 12,
      backgroundColor: theme.colors.surfaceVariant,
    },
    parentAuthor: {
      color: theme.colors.onSurfaceVariant,
      fontWeight: '500',
      marginBottom: 4,
    },
    parentContent: {
      color: theme.colors.onSurfaceVariant,
      fontStyle: 'italic',
    },
    divider: {
      marginVertical: 8,
    },
    positionIndicator: {
      paddingHorizontal: 20,
      paddingVertical: 8,
      backgroundColor: theme.colors.primaryContainer,
    },
    positionText: {
      color: theme.colors.onPrimaryContainer,
      textAlign: 'center',
    },
    inputContainer: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      minHeight: 120,
    },
    textInput: {
      fontSize: 16,
      lineHeight: 24,
      color: theme.colors.onSurface,
      fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
      minHeight: 80,
      textAlignVertical: 'top',
    },
    metadataContainer: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    metadataChip: {
      marginRight: 8,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingHorizontal: 20,
      paddingBottom: 20,
      gap: 12,
    },
    cancelButton: {
      flex: 0,
    },
    submitButton: {
      flex: 0,
    },
  });
