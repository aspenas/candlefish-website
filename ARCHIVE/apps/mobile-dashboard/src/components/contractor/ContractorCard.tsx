import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Contractor, ContractorStatus } from '@/types/graphql';

interface ContractorCardProps {
  contractor: Contractor;
  onPress: () => void;
  onLongPress?: () => void;
  isSelected?: boolean;
}

export const ContractorCard: React.FC<ContractorCardProps> = ({
  contractor,
  onPress,
  onLongPress,
  isSelected = false,
}) => {
  const { theme } = useTheme();

  const getStatusColor = (status: ContractorStatus) => {
    switch (status) {
      case ContractorStatus.ACTIVE:
        return theme.colors.success;
      case ContractorStatus.PENDING:
        return theme.colors.warning;
      case ContractorStatus.SUSPENDED:
        return theme.colors.error;
      case ContractorStatus.EXPIRED:
        return theme.colors.textSecondary;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getStatusIcon = (status: ContractorStatus) => {
    switch (status) {
      case ContractorStatus.ACTIVE:
        return 'checkmark-circle';
      case ContractorStatus.PENDING:
        return 'time';
      case ContractorStatus.SUSPENDED:
        return 'ban';
      case ContractorStatus.EXPIRED:
        return 'hourglass';
      default:
        return 'help-circle';
    }
  };

  const formatLastActive = (timestamp?: string) => {
    if (!timestamp) return 'Never';

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
          borderWidth: isSelected ? 2 : 1,
        },
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View style={styles.leftSection}>
        {contractor.avatar ? (
          <Image
            source={{ uri: contractor.avatar }}
            style={[styles.avatar, { borderColor: theme.colors.border }]}
          />
        ) : (
          <View style={[
            styles.avatarPlaceholder,
            { backgroundColor: theme.colors.primary }
          ]}>
            <Text style={[styles.avatarText, { color: theme.colors.surface }]}>
              {getInitials(contractor.firstName, contractor.lastName)}
            </Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.contentSection}>
        <View style={styles.headerRow}>
          <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>
            {contractor.firstName} {contractor.lastName}
          </Text>

          <View style={styles.statusContainer}>
            <Ionicons
              name={getStatusIcon(contractor.status)}
              size={16}
              color={getStatusColor(contractor.status)}
            />
          </View>
        </View>

        <Text style={[styles.email, { color: theme.colors.textSecondary }]} numberOfLines={1}>
          {contractor.email}
        </Text>

        {contractor.company && (
          <Text style={[styles.company, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {contractor.company}
          </Text>
        )}

        <View style={styles.metadataRow}>
          <Text style={[styles.metadata, { color: theme.colors.textSecondary }]}>
            {contractor.dashboardAccess?.length || 0} dashboards
          </Text>

          <Text style={[styles.metadataSeparator, { color: theme.colors.textSecondary }]}>
            •
          </Text>

          <Text style={[styles.metadata, { color: theme.colors.textSecondary }]}>
            Last active: {formatLastActive(contractor.lastActiveAt)}
          </Text>
        </View>

        {/* Status badge */}
        <View style={styles.badgeContainer}>
          <View style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(contractor.status) + '20' }
          ]}>
            <Text style={[
              styles.statusText,
              { color: getStatusColor(contractor.status) }
            ]}>
              {contractor.status.toLowerCase()}
            </Text>
          </View>

          {contractor.role && (
            <View style={[
              styles.roleBadge,
              { backgroundColor: theme.colors.background }
            ]}>
              <Text style={[styles.roleText, { color: theme.colors.textSecondary }]}>
                {contractor.role.toLowerCase()}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Action indicator */}
      <View style={styles.rightSection}>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={theme.colors.textSecondary}
        />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    marginVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
  },
  leftSection: {
    marginRight: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
  },
  contentSection: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  statusContainer: {
    marginLeft: 8,
  },
  email: {
    fontSize: 14,
    marginBottom: 2,
  },
  company: {
    fontSize: 14,
    marginBottom: 8,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metadata: {
    fontSize: 12,
  },
  metadataSeparator: {
    fontSize: 12,
    marginHorizontal: 6,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  rightSection: {
    marginLeft: 16,
  },
});
