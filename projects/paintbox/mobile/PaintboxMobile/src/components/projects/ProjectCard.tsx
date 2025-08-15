import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Project, ProjectStatus, ProjectPriority } from '../../types/graphql';

interface ProjectCardProps {
  project: Project;
  onPress: () => void;
  compact?: boolean;
  style?: ViewStyle;
}

const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onPress,
  compact = false,
  style,
}) => {
  const getStatusColor = (status: ProjectStatus): string => {
    switch (status) {
      case ProjectStatus.PLANNING:
        return '#6B7280';
      case ProjectStatus.SCHEDULED:
        return '#3B82F6';
      case ProjectStatus.IN_PROGRESS:
        return '#F59E0B';
      case ProjectStatus.REVIEW:
        return '#8B5CF6';
      case ProjectStatus.COMPLETED:
        return '#10B981';
      case ProjectStatus.ON_HOLD:
        return '#EF4444';
      case ProjectStatus.CANCELLED:
        return '#6B7280';
      case ProjectStatus.ARCHIVED:
        return '#9CA3AF';
      default:
        return '#6B7280';
    }
  };

  const getPriorityIcon = (priority: ProjectPriority): string => {
    switch (priority) {
      case ProjectPriority.EMERGENCY:
        return 'flash';
      case ProjectPriority.URGENT:
        return 'warning';
      case ProjectPriority.HIGH:
        return 'arrow-up';
      case ProjectPriority.NORMAL:
        return 'remove';
      case ProjectPriority.LOW:
        return 'arrow-down';
      default:
        return 'remove';
    }
  };

  const getPriorityColor = (priority: ProjectPriority): string => {
    switch (priority) {
      case ProjectPriority.EMERGENCY:
        return '#DC2626';
      case ProjectPriority.URGENT:
        return '#EF4444';
      case ProjectPriority.HIGH:
        return '#F59E0B';
      case ProjectPriority.NORMAL:
        return '#6B7280';
      case ProjectPriority.LOW:
        return '#9CA3AF';
      default:
        return '#6B7280';
    }
  };

  const formatStatus = (status: ProjectStatus): string => {
    return status.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
    if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
    
    return date.toLocaleDateString();
  };

  const getAddress = (): string => {
    const { serviceAddress } = project;
    return `${serviceAddress.city}, ${serviceAddress.state}`;
  };

  return (
    <TouchableOpacity
      style={[
        compact ? styles.compactCard : styles.fullCard,
        project.isOverdue && styles.overdueCard,
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, compact && styles.compactTitle]} numberOfLines={1}>
            {project.name}
          </Text>
          <Text style={styles.address} numberOfLines={1}>
            {getAddress()}
          </Text>
        </View>
        
        <View style={styles.headerIcons}>
          <Icon
            name={getPriorityIcon(project.priority)}
            size={16}
            color={getPriorityColor(project.priority)}
            style={styles.priorityIcon}
          />
          {project.photoCount > 0 && (
            <View style={styles.photoCount}>
              <Icon name="camera" size={12} color="#6B7280" />
              <Text style={styles.photoCountText}>{project.photoCount}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Status and Progress */}
      <View style={styles.statusRow}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(project.status) }]}>
          <Text style={styles.statusText}>{formatStatus(project.status)}</Text>
        </View>
        
        {project.completionPercentage > 0 && (
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>{Math.round(project.completionPercentage)}%</Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${project.completionPercentage}%`,
                    backgroundColor: getStatusColor(project.status),
                  },
                ]}
              />
            </View>
          </View>
        )}
      </View>

      {/* Details - only show in full card */}
      {!compact && (
        <View style={styles.details}>
          {project.scheduledStartDate && (
            <View style={styles.detailRow}>
              <Icon name="calendar" size={14} color="#6B7280" />
              <Text style={styles.detailText}>
                Start: {formatDate(project.scheduledStartDate)}
              </Text>
            </View>
          )}
          
          {project.budgetAmount && (
            <View style={styles.detailRow}>
              <Icon name="card" size={14} color="#6B7280" />
              <Text style={styles.detailText}>
                Budget: ${project.budgetAmount.toLocaleString()}
              </Text>
            </View>
          )}
          
          {project.assignedCrew.length > 0 && (
            <View style={styles.detailRow}>
              <Icon name="people" size={14} color="#6B7280" />
              <Text style={styles.detailText}>
                {project.assignedCrew.length} crew member{project.assignedCrew.length > 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Footer - Alerts and Warnings */}
      {(project.isOverdue || project.weatherRisk !== 'NONE') && (
        <View style={styles.footer}>
          {project.isOverdue && (
            <View style={styles.alert}>
              <Icon name="time" size={12} color="#EF4444" />
              <Text style={styles.alertText}>Overdue</Text>
            </View>
          )}
          
          {project.weatherRisk !== 'NONE' && (
            <View style={[styles.alert, styles.weatherAlert]}>
              <Icon name="rainy" size={12} color="#F59E0B" />
              <Text style={[styles.alertText, { color: '#F59E0B' }]}>
                {project.weatherRisk.toLowerCase()} weather risk
              </Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  fullCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  compactCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  overdueCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  compactTitle: {
    fontSize: 14,
  },
  address: {
    fontSize: 12,
    color: '#6B7280',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityIcon: {
    marginRight: 8,
  },
  photoCount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  photoCountText: {
    fontSize: 10,
    color: '#6B7280',
    marginLeft: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'white',
    textTransform: 'uppercase',
  },
  progressContainer: {
    flex: 1,
    marginLeft: 12,
    alignItems: 'flex-end',
  },
  progressText: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },
  progressBar: {
    width: 60,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  details: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 6,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  weatherAlert: {
    backgroundColor: '#FEF3C7',
  },
  alertText: {
    fontSize: 10,
    color: '#EF4444',
    marginLeft: 2,
    fontWeight: '500',
  },
});

export default ProjectCard;