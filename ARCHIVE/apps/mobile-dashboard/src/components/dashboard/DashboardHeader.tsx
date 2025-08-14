import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// Types
import { Dashboard } from '@/types/graphql';

// Hooks
import { useTheme } from '@/hooks/useTheme';

interface DashboardHeaderProps {
  dashboard: Dashboard;
  isOnline: boolean;
  onSettingsPress: () => void;
  onSharePress: () => void;
  onRefresh?: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  dashboard,
  isOnline,
  onSettingsPress,
  onSharePress,
  onRefresh,
}) => {
  const navigation = useNavigation();
  const { theme } = useTheme();

  const handleBackPress = () => {
    navigation.goBack();
  };

  const getStatusIcon = () => {
    if (!isOnline) {
      return (
        <Ionicons
          name="cloud-offline-outline"
          size={18}
          color={theme.colors.warning}
        />
      );
    }

    if (dashboard.autoRefresh) {
      return (
        <View style={[styles.statusIndicator, { backgroundColor: theme.colors.success }]}>
          <Ionicons
            name="refresh"
            size={12}
            color={theme.colors.surface}
          />
        </View>
      );
    }

    return null;
  };

  const formatLastViewed = (dateString?: string) => {
    if (!dateString) return 'Never viewed';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return 'Just viewed';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: theme.colors.surface,
        borderBottomColor: theme.colors.border,
      }
    ]}>
      <View style={styles.topRow}>
        {/* Back button */}
        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: theme.colors.background }]}
          onPress={handleBackPress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'}
            size={24}
            color={theme.colors.text}
          />
        </TouchableOpacity>

        {/* Dashboard title and info */}
        <View style={styles.titleContainer}>
          <View style={styles.titleRow}>
            <Text
              style={[styles.title, { color: theme.colors.text }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {dashboard.name}
            </Text>
            {getStatusIcon()}
          </View>

          {dashboard.description && (
            <Text
              style={[styles.description, { color: theme.colors.textSecondary }]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {dashboard.description}
            </Text>
          )}

          <View style={styles.metadataRow}>
            <Text style={[styles.metadata, { color: theme.colors.textSecondary }]}>
              {formatLastViewed(dashboard.lastViewed)}
            </Text>

            {dashboard.viewCount && (
              <>
                <Text style={[styles.metadataSeparator, { color: theme.colors.textSecondary }]}>
                  •
                </Text>
                <Text style={[styles.metadata, { color: theme.colors.textSecondary }]}>
                  {dashboard.viewCount} views
                </Text>
              </>
            )}

            {dashboard.widgets && (
              <>
                <Text style={[styles.metadataSeparator, { color: theme.colors.textSecondary }]}>
                  •
                </Text>
                <Text style={[styles.metadata, { color: theme.colors.textSecondary }]}>
                  {dashboard.widgets.length} widgets
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionsContainer}>
          {onRefresh && (
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: theme.colors.background }]}
              onPress={onRefresh}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="refresh"
                size={20}
                color={theme.colors.text}
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: theme.colors.background }]}
            onPress={onSharePress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name="share-outline"
              size={20}
              color={theme.colors.text}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: theme.colors.background }]}
            onPress={onSettingsPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name="settings-outline"
              size={20}
              color={theme.colors.text}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tags */}
      {dashboard.tags && dashboard.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {dashboard.tags.slice(0, 3).map((tag, index) => (
            <View
              key={index}
              style={[styles.tag, { backgroundColor: theme.colors.background }]}
            >
              <Text style={[styles.tagText, { color: theme.colors.textSecondary }]}>
                {tag}
              </Text>
            </View>
          ))}

          {dashboard.tags.length > 3 && (
            <View style={[styles.tag, { backgroundColor: theme.colors.background }]}>
              <Text style={[styles.tagText, { color: theme.colors.textSecondary }]}>
                +{dashboard.tags.length - 3}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Auto-refresh indicator */}
      {dashboard.autoRefresh && dashboard.refreshInterval && (
        <View style={styles.autoRefreshContainer}>
          <Ionicons
            name="time-outline"
            size={14}
            color={theme.colors.success}
          />
          <Text style={[styles.autoRefreshText, { color: theme.colors.success }]}>
            Auto-refreshing every {Math.floor(dashboard.refreshInterval / 60)}m
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  titleContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
  },
  statusIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 6,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metadata: {
    fontSize: 12,
    fontWeight: '500',
  },
  metadataSeparator: {
    fontSize: 12,
    marginHorizontal: 6,
  },
  actionsContainer: {
    flexDirection: 'row',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500',
  },
  autoRefreshContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  autoRefreshText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
});
