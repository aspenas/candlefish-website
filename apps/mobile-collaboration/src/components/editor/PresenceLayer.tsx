import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Avatar, Badge, Text, Surface } from 'react-native-paper';

import {
  usePresenceUpdatedSubscription,
  useUserJoinedSubscription,
  useUserLeftSubscription,
} from '@/graphql/generated/types';
import { useTheme } from '@/hooks/useTheme';
import { useAppSelector } from '@/stores/hooks';

interface PresenceLayerProps {
  documentId: string;
}

interface PresenceUser {
  id: string;
  name: string;
  avatar?: string;
  status: 'ACTIVE' | 'AWAY' | 'IDLE';
  cursor?: {
    blockId: string;
    offset: number;
    x?: number;
    y?: number;
  };
  selection?: {
    start: { blockId: string; offset: number };
    end: { blockId: string; offset: number };
    isCollapsed: boolean;
  };
  isTyping: boolean;
  color: string; // Assigned color for this user's cursor/selection
}

interface AnimatedCursor {
  userId: string;
  x: number;
  y: number;
  color: string;
  opacity: Animated.Value;
  scale: Animated.Value;
}

const PRESENCE_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD',
];

export const PresenceLayer: React.FC<PresenceLayerProps> = ({
  documentId,
}) => {
  const { theme } = useTheme();
  const { width: screenWidth } = Dimensions.get('window');
  const currentUser = useAppSelector(state => state.auth.user);

  const [presenceUsers, setPresenceUsers] = useState<Map<string, PresenceUser>>(new Map());
  const [animatedCursors, setAnimatedCursors] = useState<Map<string, AnimatedCursor>>(new Map());
  const [colorAssignments, setColorAssignments] = useState<Map<string, string>>(new Map());

  // Subscriptions
  const { data: presenceData } = usePresenceUpdatedSubscription({
    variables: { documentId },
  });

  const { data: joinData } = useUserJoinedSubscription({
    variables: { documentId },
  });

  const { data: leftData } = useUserLeftSubscription({
    variables: { documentId },
  });

  // Assign colors to users
  const assignUserColor = (userId: string): string => {
    if (colorAssignments.has(userId)) {
      return colorAssignments.get(userId)!;
    }

    const color = PRESENCE_COLORS[colorAssignments.size % PRESENCE_COLORS.length];
    setColorAssignments(prev => new Map(prev).set(userId, color));
    return color;
  };

  // Handle presence updates
  useEffect(() => {
    if (!presenceData?.presenceUpdated) return;

    const presence = presenceData.presenceUpdated;

    // Skip updates from current user
    if (presence.user.id === currentUser?.id) return;

    const userColor = assignUserColor(presence.user.id);

    const presenceUser: PresenceUser = {
      id: presence.user.id,
      name: presence.user.name,
      avatar: presence.user.avatar,
      status: presence.status,
      cursor: presence.cursor ? {
        blockId: presence.cursor.blockId,
        offset: presence.cursor.offset,
        x: presence.cursor.x,
        y: presence.cursor.y,
      } : undefined,
      selection: presence.selection ? {
        start: presence.selection.start,
        end: presence.selection.end,
        isCollapsed: presence.selection.isCollapsed,
      } : undefined,
      isTyping: presence.isTyping,
      color: userColor,
    };

    setPresenceUsers(prev => new Map(prev).set(presence.user.id, presenceUser));

    // Animate cursor if position changed
    if (presence.cursor?.x && presence.cursor?.y) {
      animateCursor(presence.user.id, presence.cursor.x, presence.cursor.y, userColor);
    }
  }, [presenceData, currentUser]);

  // Handle user joined
  useEffect(() => {
    if (!joinData?.userJoined) return;

    const user = joinData.userJoined;

    // Skip current user
    if (user.user.id === currentUser?.id) return;

    const userColor = assignUserColor(user.user.id);

    const presenceUser: PresenceUser = {
      id: user.user.id,
      name: user.user.name,
      avatar: user.user.avatar,
      status: user.status,
      isTyping: false,
      color: userColor,
    };

    setPresenceUsers(prev => new Map(prev).set(user.user.id, presenceUser));
  }, [joinData, currentUser]);

  // Handle user left
  useEffect(() => {
    if (!leftData?.userLeft) return;

    const { userId } = leftData.userLeft;

    setPresenceUsers(prev => {
      const newMap = new Map(prev);
      newMap.delete(userId);
      return newMap;
    });

    setAnimatedCursors(prev => {
      const newMap = new Map(prev);
      newMap.delete(userId);
      return newMap;
    });

    setColorAssignments(prev => {
      const newMap = new Map(prev);
      newMap.delete(userId);
      return newMap;
    });
  }, [leftData]);

  // Animate cursor movement
  const animateCursor = (userId: string, x: number, y: number, color: string) => {
    setAnimatedCursors(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(userId);

      if (existing) {
        // Animate to new position
        Animated.parallel([
          Animated.timing(existing.opacity, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.spring(existing.scale, {
            toValue: 1.2,
            tension: 150,
            friction: 8,
            useNativeDriver: true,
          }),
        ]).start(() => {
          // Scale back down
          Animated.spring(existing.scale, {
            toValue: 1,
            tension: 150,
            friction: 8,
            useNativeDriver: true,
          }).start();
        });

        existing.x = x;
        existing.y = y;
      } else {
        // Create new cursor
        newMap.set(userId, {
          userId,
          x,
          y,
          color,
          opacity: new Animated.Value(0),
          scale: new Animated.Value(0.8),
        });

        // Animate in
        const cursor = newMap.get(userId)!;
        Animated.parallel([
          Animated.timing(cursor.opacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(cursor.scale, {
            toValue: 1,
            tension: 150,
            friction: 8,
            useNativeDriver: true,
          }),
        ]).start();
      }

      return newMap;
    });

    // Hide cursor after inactivity
    setTimeout(() => {
      setAnimatedCursors(prev => {
        const cursor = prev.get(userId);
        if (cursor) {
          Animated.timing(cursor.opacity, {
            toValue: 0.3,
            duration: 500,
            useNativeDriver: true,
          }).start();
        }
        return prev;
      });
    }, 3000);
  };

  const styles = createStyles(theme, screenWidth);

  return (
    <>
      {/* Presence Indicators Bar */}
      <Surface style={styles.presenceBar}>
        <View style={styles.presenceList}>
          {Array.from(presenceUsers.values()).map(user => (
            <View key={user.id} style={styles.presenceItem}>
              <Avatar.Text
                size={32}
                label={user.name.charAt(0).toUpperCase()}
                style={[
                  styles.presenceAvatar,
                  { backgroundColor: user.color },
                ]}
                labelStyle={styles.presenceAvatarText}
              />
              {user.isTyping && (
                <Badge
                  size={12}
                  style={[styles.typingIndicator, { backgroundColor: user.color }]}
                />
              )}
            </View>
          ))}
        </View>

        {presenceUsers.size > 0 && (
          <Text variant="bodySmall" style={styles.presenceCount}>
            {presenceUsers.size} collaborator{presenceUsers.size !== 1 ? 's' : ''}
          </Text>
        )}
      </Surface>

      {/* Animated Cursors Overlay */}
      <View style={styles.cursorOverlay} pointerEvents="none">
        {Array.from(animatedCursors.values()).map(cursor => (
          <Animated.View
            key={cursor.userId}
            style={[
              styles.cursor,
              {
                left: cursor.x - 1,
                top: cursor.y,
                backgroundColor: cursor.color,
                opacity: cursor.opacity,
                transform: [{ scale: cursor.scale }],
              },
            ]}
          />
        ))}
      </View>
    </>
  );
};

const createStyles = (theme: any, screenWidth: number) =>
  StyleSheet.create({
    presenceBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 8,
      elevation: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 1,
    },
    presenceList: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    presenceItem: {
      position: 'relative',
      marginRight: 8,
    },
    presenceAvatar: {
      borderWidth: 2,
      borderColor: theme.colors.surface,
    },
    presenceAvatarText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    typingIndicator: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      borderWidth: 2,
      borderColor: theme.colors.surface,
    },
    presenceCount: {
      color: theme.colors.onSurfaceVariant,
    },
    cursorOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 10,
    },
    cursor: {
      position: 'absolute',
      width: 2,
      height: 20,
      borderRadius: 1,
      zIndex: 11,
    },
  });
