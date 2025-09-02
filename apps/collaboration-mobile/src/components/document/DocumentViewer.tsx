/**
 * Collaborative Document Viewer Component
 * Displays documents with real-time collaboration features
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { useSubscription, useQuery } from '@apollo/client';

import { useTheme } from '@/contexts/ThemeContext';
import { Document, PresenceSession, User } from '@/types';
import { offlineSyncService } from '@/services/offlineSync';
import DocumentContent from './DocumentContent';
import PresenceIndicators from './PresenceIndicators';
import CollaboratorCursors from './CollaboratorCursors';
import CommentThread from './CommentThread';
import VersionIndicator from './VersionIndicator';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorBoundary from '@/components/common/ErrorBoundary';

interface DocumentViewerProps {
  documentId: string;
  editable?: boolean;
  onEdit?: (documentId: string) => void;
  onShare?: (documentId: string) => void;
  onComment?: (documentId: string, position: any) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DocumentViewer: React.FC<DocumentViewerProps> = ({
  documentId,
  editable = false,
  onEdit,
  onShare,
  onComment,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const [refreshing, setRefreshing] = useState(false);
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [selectionPosition, setSelectionPosition] = useState<any>(null);
  const [showComments, setShowComments] = useState(false);
  const [activeSessions, setActiveSessions] = useState<PresenceSession[]>([]);

  // Animated values
  const headerOpacity = useSharedValue(1);
  const commentsPanelTranslate = useSharedValue(SCREEN_WIDTH);

  // GraphQL queries and subscriptions
  const { data, loading, error, refetch } = useQuery(GET_DOCUMENT_QUERY, {
    variables: { id: documentId },
    errorPolicy: 'all',
    notifyOnNetworkStatusChange: true,
  });

  const { data: presenceData } = useSubscription(DOCUMENT_PRESENCE_SUBSCRIPTION, {
    variables: { documentId },
    onSubscriptionData: ({ subscriptionData }) => {
      if (subscriptionData.data?.documentPresenceChanged) {
        updatePresenceInfo(subscriptionData.data.documentPresenceChanged);
      }
    },
  });

  const { data: contentData } = useSubscription(DOCUMENT_CONTENT_SUBSCRIPTION, {
    variables: { documentId },
    onSubscriptionData: ({ subscriptionData }) => {
      if (subscriptionData.data?.documentContentChanged) {
        handleContentUpdate(subscriptionData.data.documentContentChanged);
      }
    },
  });

  const document = data?.document as Document;

  useEffect(() => {
    if (document) {
      // Cache document for offline access
      offlineSyncService.cacheDocument(document);
    }
  }, [document]);

  const updatePresenceInfo = useCallback((presenceUpdate: any) => {
    const { type, session } = presenceUpdate;
    
    setActiveSessions(prev => {
      const filtered = prev.filter(s => s.id !== session.id);
      
      if (type === 'USER_JOINED' || type === 'USER_UPDATED') {
        return [...filtered, session];
      } else if (type === 'USER_LEFT') {
        return filtered;
      }
      
      return prev;
    });
  }, []);

  const handleContentUpdate = useCallback((contentUpdate: any) => {
    // Handle real-time content updates from other collaborators
    console.log('Content updated:', contentUpdate);
    
    // Update local Y.Doc if we have CRDT operations
    if (contentUpdate.operations && contentUpdate.operations.length > 0) {
      const ydoc = offlineSyncService.getYDoc(documentId);
      // Apply operations to Y.Doc
      // This would be implemented based on the specific CRDT format
    }
  }, [documentId]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleTextSelection = useCallback((text: string, position: any) => {
    setSelectedText(text);
    setSelectionPosition(position);
  }, []);

  const handleScroll = useCallback((event: any) => {
    const { contentOffset } = event.nativeEvent;
    const opacity = Math.max(0, Math.min(1, 1 - contentOffset.y / 100));
    headerOpacity.value = withSpring(opacity);
  }, []);

  const toggleComments = useCallback(() => {
    setShowComments(prev => {
      const newValue = !prev;
      commentsPanelTranslate.value = withSpring(newValue ? 0 : SCREEN_WIDTH);
      return newValue;
    });
  }, []);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    backgroundColor: interpolateColor(
      headerOpacity.value,
      [0, 1],
      ['transparent', theme.colors.background]
    ),
  }));

  const commentsPanelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: commentsPanelTranslate.value }],
  }));

  if (loading && !document) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <LoadingSpinner message="Loading document..." />
      </View>
    );
  }

  if (error && !document) {
    // Try to load from cache
    const cachedDocument = offlineSyncService.getCachedDocument(documentId);
    if (!cachedDocument) {
      return (
        <View style={[styles.container, styles.centerContent, { backgroundColor: theme.colors.background }]}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            Failed to load document
          </Text>
          <Text style={[styles.errorSubtext, { color: theme.colors.textSecondary }]}>
            {error.message}
          </Text>
        </View>
      );
    }
  }

  const displayDocument = document || offlineSyncService.getCachedDocument(documentId);

  if (!displayDocument) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.text }]}>
          Document not found
        </Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header with document info */}
        <Animated.View style={[styles.header, headerStyle, { paddingTop: insets.top }]}>
          <View style={styles.headerContent}>
            <Text style={[styles.documentTitle, { color: theme.colors.text }]}>
              {displayDocument.name}
            </Text>
            <PresenceIndicators 
              sessions={activeSessions}
              maxVisible={3}
            />
          </View>
          {displayDocument.currentVersion && (
            <VersionIndicator version={displayDocument.currentVersion} />
          )}
        </Animated.View>

        {/* Document content */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
              progressBackgroundColor={theme.colors.surface}
            />
          }
        >
          <DocumentContent
            document={displayDocument}
            editable={editable}
            onTextSelection={handleTextSelection}
            onEdit={onEdit}
            activeSessions={activeSessions}
          />
          
          {/* Show loading indicator if syncing */}
          {loading && document && (
            <View style={styles.syncIndicator}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={[styles.syncText, { color: theme.colors.textSecondary }]}>
                Syncing...
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Collaborator cursors overlay */}
        <CollaboratorCursors sessions={activeSessions} />

        {/* Comments panel */}
        <Animated.View style={[styles.commentsPanel, commentsPanelStyle, { backgroundColor: theme.colors.surface }]}>
          <CommentThread
            documentId={documentId}
            position={selectionPosition}
            selectedText={selectedText}
            onClose={() => setShowComments(false)}
          />
        </Animated.View>

        {/* Action buttons */}
        <View style={[styles.actionButtons, { backgroundColor: theme.colors.background }]}>
          {editable && onEdit && (
            <ActionButton
              icon="edit"
              label="Edit"
              onPress={() => onEdit(documentId)}
            />
          )}
          {onComment && (
            <ActionButton
              icon="comment"
              label="Comment"
              onPress={toggleComments}
              badge={displayDocument.metrics?.activeThreads}
            />
          )}
          {onShare && (
            <ActionButton
              icon="share"
              label="Share"
              onPress={() => onShare(documentId)}
            />
          )}
        </View>
      </View>
    </ErrorBoundary>
  );
};

/**
 * Action Button Component
 */
const ActionButton: React.FC<{
  icon: string;
  label: string;
  onPress: () => void;
  badge?: number;
}> = ({ icon, label, onPress, badge }) => {
  const { theme } = useTheme();

  return (
    <View style={styles.actionButton}>
      {/* Implementation would include proper icon component */}
      <Text style={[styles.actionButtonText, { color: theme.colors.text }]}>
        {label}
      </Text>
      {badge && badge > 0 && (
        <View style={[styles.badge, { backgroundColor: theme.colors.error }]}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  documentTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginRight: 16,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: Platform.OS === 'ios' ? 120 : 100,
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  syncIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  syncText: {
    marginLeft: 8,
    fontSize: 14,
  },
  commentsPanel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: SCREEN_WIDTH * 0.9,
    maxWidth: 400,
  },
  actionButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  actionButton: {
    alignItems: 'center',
    position: 'relative',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

// GraphQL queries (would be imported from generated types)
const GET_DOCUMENT_QUERY = `
  query GetDocument($id: UUID!) {
    document(id: $id) {
      id
      name
      description
      type
      status
      content {
        format
        data
        blocks {
          id
          type
          content
          position {
            index
            offset
            length
            depth
          }
          styles
          attributes
          authorId
          createdAt
          updatedAt
        }
        length
        html
        markdown
        plainText
      }
      owner {
        id
        name
        avatar
      }
      permissions {
        canRead
        canWrite
        canComment
        canShare
      }
      currentVersion {
        id
        version
        name
        author {
          id
          name
          avatar
        }
        createdAt
      }
      metrics {
        activeThreads
        totalComments
        lastActivityAt
      }
      createdAt
      updatedAt
      lastEditedAt
    }
  }
`;

const DOCUMENT_PRESENCE_SUBSCRIPTION = `
  subscription DocumentPresenceChanged($documentId: UUID!) {
    documentPresenceChanged(documentId: $documentId) {
      type
      session {
        id
        user {
          id
          name
          avatar
        }
        status
        cursor {
          blockId
          offset
          x
          y
          height
        }
        selection {
          start {
            blockId
            offset
          }
          end {
            blockId
            offset
          }
          isCollapsed
        }
        isTyping
        lastSeenAt
      }
      timestamp
    }
  }
`;

const DOCUMENT_CONTENT_SUBSCRIPTION = `
  subscription DocumentContentChanged($documentId: UUID!) {
    documentContentChanged(documentId: $documentId) {
      type
      operations {
        id
        type
        position
        content
        authorId
        timestamp
      }
      author {
        id
        name
        avatar
      }
      timestamp
    }
  }
`;

export default DocumentViewer;