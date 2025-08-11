import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  PanGestureHandler,
  TapGestureHandler,
  LongPressGestureHandler,
  State,
  Dimensions,
  Platform,
  Keyboard,
} from 'react-native-gesture-handler';
import {
  Surface,
  Text,
  IconButton,
  Avatar,
  Button,
  TextInput,
  Portal,
  Modal,
  FAB,
  Badge,
} from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  useCreateCommentMutation,
  useUpdateCommentMutation,
  useResolveCommentMutation,
  useAddCommentReactionMutation,
  useCommentAddedSubscription,
  useCommentUpdatedSubscription,
} from '@/graphql/generated/types';
import { useTheme } from '@/hooks/useTheme';
import { useAppSelector } from '@/stores/hooks';
import { CommentThread } from './CommentThread';
import { CommentComposer } from './CommentComposer';
import { ReactionPicker } from './ReactionPicker';
import { formatRelativeTime } from '@/utils/date';
import { logError } from '@/utils/logger';

interface CommentSystemProps {
  documentId: string;
  comments: Comment[];
  onCommentSelect?: (commentId: string) => void;
  onCommentPosition?: (x: number, y: number) => void;
}

interface Comment {
  id: string;
  content: {
    text: string;
    html?: string;
    format: string;
  };
  position?: {
    blockId?: string;
    startOffset?: number;
    endOffset?: number;
    x?: number;
    y?: number;
  };
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  status: 'ACTIVE' | 'RESOLVED' | 'DISMISSED';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  type: 'GENERAL' | 'SUGGESTION' | 'QUESTION' | 'ISSUE';
  replies?: Comment[];
  reactions?: Reaction[];
  createdAt: string;
  updatedAt: string;
  isResolved: boolean;
}

interface Reaction {
  id: string;
  type: string;
  emoji?: string;
  user: {
    id: string;
    name: string;
  };
}

interface SwipeAction {
  id: string;
  icon: string;
  color: string;
  threshold: number;
  action: (comment: Comment) => void;
}

export const CommentSystem: React.FC<CommentSystemProps> = ({
  documentId,
  comments,
  onCommentSelect,
  onCommentPosition,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  // State
  const [selectedComment, setSelectedComment] = useState<string | null>(null);
  const [composerVisible, setComposerVisible] = useState(false);
  const [composerPosition, setComposerPosition] = useState<{ x: number; y: number } | null>(null);
  const [reactionPickerVisible, setReactionPickerVisible] = useState(false);
  const [reactionComment, setReactionComment] = useState<string | null>(null);
  const [swipeStates, setSwipeStates] = useState<Map<string, { translateX: Animated.Value; revealed: boolean }>>(new Map());

  // Current user
  const currentUser = useAppSelector(state => state.auth.user);

  // GraphQL mutations
  const [createComment] = useCreateCommentMutation({
    onError: (error) => logError('Failed to create comment:', error),
  });

  const [updateComment] = useUpdateCommentMutation({
    onError: (error) => logError('Failed to update comment:', error),
  });

  const [resolveComment] = useResolveCommentMutation({
    onError: (error) => logError('Failed to resolve comment:', error),
  });

  const [addReaction] = useAddCommentReactionMutation({
    onError: (error) => logError('Failed to add reaction:', error),
  });

  // Subscriptions
  useCommentAddedSubscription({
    variables: { documentId },
    onData: ({ data }) => {
      if (data.data?.commentAdded) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
  });

  useCommentUpdatedSubscription({
    variables: { documentId },
  });

  // Initialize swipe states for comments
  useEffect(() => {
    comments.forEach(comment => {
      if (!swipeStates.has(comment.id)) {
        setSwipeStates(prev => new Map(prev).set(comment.id, {
          translateX: new Animated.Value(0),
          revealed: false,
        }));
      }
    });
  }, [comments]);

  // Swipe actions configuration
  const getSwipeActions = (comment: Comment): SwipeAction[] => {
    const actions: SwipeAction[] = [];

    // Reply action (always available)
    actions.push({
      id: 'reply',
      icon: 'reply',
      color: theme.colors.primary,
      threshold: 60,
      action: (comment) => handleReply(comment),
    });

    // Resolve/Unresolve action
    actions.push({
      id: comment.isResolved ? 'unresolve' : 'resolve',
      icon: comment.isResolved ? 'check-circle-outline' : 'check-circle',
      color: comment.isResolved ? theme.colors.outline : theme.colors.tertiary,
      threshold: 120,
      action: (comment) => handleResolveToggle(comment),
    });

    // Edit action (only for comment author)
    if (comment.author.id === currentUser?.id) {
      actions.push({
        id: 'edit',
        icon: 'pencil',
        color: theme.colors.secondary,
        threshold: 180,
        action: (comment) => handleEdit(comment),
      });
    }

    return actions;
  };

  // Swipe gesture handler
  const createSwipeHandler = (comment: Comment) => {
    const swipeState = swipeStates.get(comment.id);
    if (!swipeState) return null;

    const actions = getSwipeActions(comment);
    const maxSwipe = actions.length * 60;

    return Animated.event(
      [{ nativeEvent: { translationX: swipeState.translateX } }],
      {
        useNativeDriver: true,
        listener: (event: any) => {
          const { translationX } = event.nativeEvent;

          // Provide haptic feedback at thresholds
          actions.forEach((action, index) => {
            if (Math.abs(translationX) >= action.threshold &&
                Math.abs(translationX) < action.threshold + 10) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          });
        },
      }
    );
  };

  // Handle swipe gesture state changes
  const handleSwipeStateChange = (comment: Comment) => (event: any) => {
    const swipeState = swipeStates.get(comment.id);
    if (!swipeState) return;

    if (event.nativeEvent.state === State.END) {
      const { translationX, velocityX } = event.nativeEvent;
      const actions = getSwipeActions(comment);

      // Check if swipe threshold was met
      let triggeredAction: SwipeAction | null = null;

      for (const action of actions) {
        if (Math.abs(translationX) >= action.threshold) {
          triggeredAction = action;
          break;
        }
      }

      if (triggeredAction) {
        // Execute action
        triggeredAction.action(comment);

        // Animate back to center
        Animated.spring(swipeState.translateX, {
          toValue: 0,
          tension: 150,
          friction: 8,
          useNativeDriver: true,
        }).start();

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        // Snap back
        Animated.spring(swipeState.translateX, {
          toValue: 0,
          tension: 150,
          friction: 8,
          useNativeDriver: true,
        }).start();
      }
    }
  };

  // Comment action handlers
  const handleReply = useCallback((comment: Comment) => {
    setSelectedComment(comment.id);
    setComposerVisible(true);
  }, []);

  const handleEdit = useCallback((comment: Comment) => {
    setSelectedComment(comment.id);
    setComposerVisible(true);
  }, []);

  const handleResolveToggle = useCallback(async (comment: Comment) => {
    try {
      await resolveComment({
        variables: {
          id: comment.id,
          resolved: !comment.isResolved,
        },
      });
    } catch (error) {
      logError('Failed to toggle comment resolution:', error);
    }
  }, [resolveComment]);

  const handleAddReaction = useCallback(async (commentId: string, type: string, emoji?: string) => {
    try {
      await addReaction({
        variables: {
          commentId,
          type: type as any,
          emoji,
        },
      });
      setReactionPickerVisible(false);
      setReactionComment(null);
    } catch (error) {
      logError('Failed to add reaction:', error);
    }
  }, [addReaction]);

  const handleLongPress = useCallback((comment: Comment, event: any) => {
    const { x, y } = event.nativeEvent;
    setReactionComment(comment.id);
    setReactionPickerVisible(true);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const handleCommentCreate = useCallback(async (content: string, position?: { x: number; y: number }) => {
    try {
      await createComment({
        variables: {
          input: {
            documentId,
            content: {
              text: content,
              format: 'PLAIN_TEXT',
            },
            position: position ? {
              x: position.x,
              y: position.y,
            } : undefined,
            type: 'GENERAL',
            priority: 'NORMAL',
            parentCommentId: selectedComment || undefined,
          },
        },
      });

      setComposerVisible(false);
      setSelectedComment(null);
      setComposerPosition(null);
    } catch (error) {
      logError('Failed to create comment:', error);
    }
  }, [createComment, documentId, selectedComment]);

  const styles = createStyles(theme, screenWidth, insets);

  const unresolvedComments = comments.filter(c => !c.isResolved);

  return (
    <>
      {/* Comments List */}
      <View style={styles.container}>
        {comments.map(comment => {
          const swipeState = swipeStates.get(comment.id);
          const actions = getSwipeActions(comment);

          return (
            <PanGestureHandler
              key={comment.id}
              onGestureEvent={createSwipeHandler(comment)}
              onHandlerStateChange={handleSwipeStateChange(comment)}
              activeOffsetX={[-20, 20]}
              failOffsetY={[-10, 10]}
            >
              <Animated.View>
                {/* Swipe Actions Background */}
                <View style={styles.swipeActionsContainer}>
                  {actions.map((action, index) => (
                    <Animated.View
                      key={action.id}
                      style={[
                        styles.swipeAction,
                        { backgroundColor: action.color },
                        {
                          opacity: swipeState?.translateX.interpolate({
                            inputRange: [-action.threshold * 2, -action.threshold, 0, action.threshold, action.threshold * 2],
                            outputRange: [1, 1, 0, 1, 1],
                            extrapolate: 'clamp',
                          }),
                        },
                      ]}
                    >
                      <IconButton
                        icon={action.icon}
                        iconColor={theme.colors.onPrimary}
                        size={20}
                      />
                    </Animated.View>
                  ))}
                </View>

                {/* Comment Card */}
                <LongPressGestureHandler
                  onHandlerStateChange={(event) => {
                    if (event.nativeEvent.state === State.ACTIVE) {
                      handleLongPress(comment, event);
                    }
                  }}
                  minDurationMs={500}
                >
                  <Animated.View
                    style={[
                      styles.commentCard,
                      {
                        transform: [{
                          translateX: swipeState?.translateX || 0,
                        }],
                      },
                    ]}
                  >
                    <Surface style={[
                      styles.commentSurface,
                      comment.isResolved && styles.resolvedComment,
                    ]}>
                      {/* Comment Header */}
                      <View style={styles.commentHeader}>
                        <Avatar.Text
                          size={32}
                          label={comment.author.name.charAt(0).toUpperCase()}
                          style={styles.authorAvatar}
                        />
                        <View style={styles.commentMeta}>
                          <Text variant="bodyMedium" style={styles.authorName}>
                            {comment.author.name}
                          </Text>
                          <Text variant="bodySmall" style={styles.commentTime}>
                            {formatRelativeTime(comment.createdAt)}
                          </Text>
                        </View>

                        {/* Priority Badge */}
                        {comment.priority !== 'NORMAL' && (
                          <Badge
                            style={[
                              styles.priorityBadge,
                              { backgroundColor: getPriorityColor(comment.priority, theme) },
                            ]}
                          >
                            {comment.priority}
                          </Badge>
                        )}

                        {/* Resolved Badge */}
                        {comment.isResolved && (
                          <Badge style={styles.resolvedBadge}>
                            Resolved
                          </Badge>
                        )}
                      </View>

                      {/* Comment Content */}
                      <Text variant="bodyMedium" style={styles.commentContent}>
                        {comment.content.text}
                      </Text>

                      {/* Reactions */}
                      {comment.reactions && comment.reactions.length > 0 && (
                        <View style={styles.reactionsContainer}>
                          {comment.reactions.map(reaction => (
                            <Surface
                              key={reaction.id}
                              style={styles.reactionChip}
                            >
                              <Text style={styles.reactionEmoji}>
                                {reaction.emoji || '👍'}
                              </Text>
                            </Surface>
                          ))}
                        </View>
                      )}

                      {/* Replies Count */}
                      {comment.replies && comment.replies.length > 0 && (
                        <Button
                          mode="text"
                          compact
                          style={styles.repliesButton}
                          onPress={() => setSelectedComment(comment.id)}
                        >
                          {comment.replies.length} repl{comment.replies.length === 1 ? 'y' : 'ies'}
                        </Button>
                      )}
                    </Surface>
                  </Animated.View>
                </LongPressGestureHandler>
              </Animated.View>
            </PanGestureHandler>
          );
        })}
      </View>

      {/* Floating Action Button */}
      {unresolvedComments.length > 0 && (
        <FAB
          icon="comment-plus"
          style={[styles.fab, { bottom: insets.bottom + 16 }]}
          onPress={() => setComposerVisible(true)}
          label={`${unresolvedComments.length} comment${unresolvedComments.length !== 1 ? 's' : ''}`}
        />
      )}

      {/* Comment Composer Modal */}
      <Portal>
        <Modal
          visible={composerVisible}
          onDismiss={() => {
            setComposerVisible(false);
            setSelectedComment(null);
            setComposerPosition(null);
          }}
          contentContainerStyle={styles.composerModal}
        >
          <CommentComposer
            onSubmit={handleCommentCreate}
            onCancel={() => {
              setComposerVisible(false);
              setSelectedComment(null);
              setComposerPosition(null);
            }}
            initialPosition={composerPosition}
            parentComment={selectedComment ? comments.find(c => c.id === selectedComment) : undefined}
          />
        </Modal>
      </Portal>

      {/* Reaction Picker Modal */}
      <Portal>
        <Modal
          visible={reactionPickerVisible}
          onDismiss={() => {
            setReactionPickerVisible(false);
            setReactionComment(null);
          }}
          contentContainerStyle={styles.reactionModal}
        >
          <ReactionPicker
            onReaction={(type, emoji) => {
              if (reactionComment) {
                handleAddReaction(reactionComment, type, emoji);
              }
            }}
            onClose={() => {
              setReactionPickerVisible(false);
              setReactionComment(null);
            }}
          />
        </Modal>
      </Portal>
    </>
  );
};

const getPriorityColor = (priority: string, theme: any): string => {
  switch (priority) {
    case 'LOW':
      return theme.colors.surfaceVariant;
    case 'HIGH':
      return theme.colors.tertiary;
    case 'URGENT':
      return theme.colors.error;
    case 'CRITICAL':
      return theme.colors.errorContainer;
    default:
      return theme.colors.primary;
  }
};

const createStyles = (theme: any, screenWidth: number, insets: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 16,
    },
    swipeActionsContainer: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingRight: 16,
      zIndex: 0,
    },
    swipeAction: {
      width: 60,
      height: 60,
      borderRadius: 30,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 8,
    },
    commentCard: {
      marginVertical: 8,
      zIndex: 1,
    },
    commentSurface: {
      borderRadius: 12,
      padding: 16,
      elevation: 2,
    },
    resolvedComment: {
      opacity: 0.7,
      backgroundColor: theme.colors.surfaceVariant,
    },
    commentHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    authorAvatar: {
      marginRight: 12,
    },
    commentMeta: {
      flex: 1,
    },
    authorName: {
      fontWeight: '600',
      color: theme.colors.onSurface,
    },
    commentTime: {
      color: theme.colors.onSurfaceVariant,
      marginTop: 2,
    },
    priorityBadge: {
      marginLeft: 8,
    },
    resolvedBadge: {
      backgroundColor: theme.colors.tertiary,
      marginLeft: 8,
    },
    commentContent: {
      lineHeight: 22,
      color: theme.colors.onSurface,
      marginBottom: 12,
    },
    reactionsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 8,
    },
    reactionChip: {
      borderRadius: 16,
      paddingHorizontal: 8,
      paddingVertical: 4,
      marginRight: 8,
      marginBottom: 4,
      elevation: 1,
    },
    reactionEmoji: {
      fontSize: 16,
    },
    repliesButton: {
      alignSelf: 'flex-start',
    },
    fab: {
      position: 'absolute',
      right: 16,
      backgroundColor: theme.colors.primary,
    },
    composerModal: {
      margin: 20,
      borderRadius: 12,
      maxHeight: '80%',
    },
    reactionModal: {
      margin: 20,
      borderRadius: 12,
      padding: 20,
      backgroundColor: theme.colors.surface,
    },
  });
