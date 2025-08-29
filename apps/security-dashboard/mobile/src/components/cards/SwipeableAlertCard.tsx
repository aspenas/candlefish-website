import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanGestureHandler,
  State,
  TouchableOpacity,
  Alert as RNAlert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SecurityTheme } from '../../theme/SecurityTheme';

// Types
interface Alert {
  id: string;
  title: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: 'malware' | 'phishing' | 'ddos' | 'intrusion' | 'suspicious' | 'vulnerability';
  timestamp: number;
  isRead: boolean;
  source?: string;
  location?: string;
  affectedAssets?: number;
  status: 'active' | 'investigating' | 'resolved' | 'dismissed';
}

interface SwipeableAlertCardProps {
  alert: Alert;
  onPress: () => void;
  onAcknowledge: (alertId: string) => void;
  onDismiss: (alertId: string) => void;
  onEscalate: (alertId: string) => void;
  style?: any;
}

const SWIPE_THRESHOLD = 80;
const ACTION_BUTTON_WIDTH = 80;

export default function SwipeableAlertCard({
  alert,
  onPress,
  onAcknowledge,
  onDismiss,
  onEscalate,
  style,
}: SwipeableAlertCardProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: false }
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationX } = event.nativeEvent;
      
      if (Math.abs(translationX) > SWIPE_THRESHOLD) {
        if (translationX > 0) {
          // Right swipe - Acknowledge
          handleAcknowledge();
        } else {
          // Left swipe - Show actions
          showActions();
        }
      } else {
        // Reset position
        resetPosition();
      }
    }
  };

  const resetPosition = () => {
    setSwipeDirection(null);
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  };

  const handleAcknowledge = () => {
    Animated.timing(translateX, {
      toValue: 300,
      duration: 200,
      useNativeDriver: false,
    }).start(() => {
      onAcknowledge(alert.id);
      resetPosition();
    });
  };

  const showActions = () => {
    setSwipeDirection('left');
    Animated.spring(translateX, {
      toValue: -ACTION_BUTTON_WIDTH * 2,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  };

  const handleDismiss = () => {
    RNAlert.alert(
      'Dismiss Alert',
      'Are you sure you want to dismiss this alert?',
      [
        { text: 'Cancel', style: 'cancel', onPress: resetPosition },
        { 
          text: 'Dismiss', 
          style: 'destructive', 
          onPress: () => {
            onDismiss(alert.id);
            resetPosition();
          }
        },
      ]
    );
  };

  const handleEscalate = () => {
    onEscalate(alert.id);
    resetPosition();
  };

  const getSeverityColor = () => {
    return SecurityTheme.colors.severity[alert.severity];
  };

  const getTypeIcon = () => {
    const iconMap = {
      malware: 'virus',
      phishing: 'fish',
      ddos: 'server-network',
      intrusion: 'shield-alert',
      suspicious: 'eye-alert',
      vulnerability: 'bug',
    };
    return iconMap[alert.type] || 'alert-circle';
  };

  const getTimeAgo = () => {
    const now = Date.now();
    const diff = now - alert.timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  return (
    <View style={[styles.container, style]}>
      {/* Background Action Buttons */}
      <View style={styles.actionsContainer}>
        {/* Right action - Acknowledge (shown on right swipe) */}
        <View style={[styles.rightAction, { backgroundColor: SecurityTheme.colors.interactive.success }]}>
          <MaterialCommunityIcons 
            name="check-circle" 
            size={24} 
            color={SecurityTheme.colors.text.primary} 
          />
          <Text style={styles.actionText}>Acknowledge</Text>
        </View>

        {/* Left actions - Dismiss & Escalate (shown on left swipe) */}
        <View style={styles.leftActions}>
          <TouchableOpacity 
            style={[styles.leftAction, { backgroundColor: SecurityTheme.colors.interactive.error }]}
            onPress={handleDismiss}
          >
            <MaterialCommunityIcons 
              name="close-circle" 
              size={24} 
              color={SecurityTheme.colors.text.primary} 
            />
            <Text style={styles.actionText}>Dismiss</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.leftAction, { backgroundColor: SecurityTheme.colors.interactive.warning }]}
            onPress={handleEscalate}
          >
            <MaterialCommunityIcons 
              name="arrow-up-circle" 
              size={24} 
              color={SecurityTheme.colors.text.primary} 
            />
            <Text style={styles.actionText}>Escalate</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Card */}
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
      >
        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ translateX }],
              backgroundColor: alert.isRead 
                ? SecurityTheme.colors.background.secondary 
                : SecurityTheme.colors.background.tertiary,
            }
          ]}
        >
          <TouchableOpacity onPress={onPress} style={styles.cardContent}>
            {/* Alert Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={[styles.iconContainer, { backgroundColor: getSeverityColor() }]}>
                  <MaterialCommunityIcons 
                    name={getTypeIcon() as any} 
                    size={20} 
                    color={SecurityTheme.colors.text.primary} 
                  />
                </View>
                
                <View style={styles.headerInfo}>
                  <Text style={[styles.title, { opacity: alert.isRead ? 0.8 : 1 }]}>
                    {alert.title}
                  </Text>
                  <Text style={styles.timestamp}>
                    {getTimeAgo()}
                    {alert.source && ` • ${alert.source}`}
                  </Text>
                </View>
              </View>

              <View style={styles.headerRight}>
                <View style={[styles.severityBadge, { backgroundColor: getSeverityColor() }]}>
                  <Text style={styles.severityText}>
                    {alert.severity.toUpperCase()}
                  </Text>
                </View>
                
                {!alert.isRead && (
                  <View style={styles.unreadIndicator} />
                )}
              </View>
            </View>

            {/* Alert Message */}
            <Text style={[styles.message, { opacity: alert.isRead ? 0.8 : 1 }]} numberOfLines={2}>
              {alert.message}
            </Text>

            {/* Alert Footer */}
            <View style={styles.footer}>
              <View style={styles.footerLeft}>
                {alert.location && (
                  <View style={styles.metaItem}>
                    <MaterialCommunityIcons 
                      name="map-marker" 
                      size={14} 
                      color={SecurityTheme.colors.text.secondary} 
                    />
                    <Text style={styles.metaText}>{alert.location}</Text>
                  </View>
                )}
                
                {alert.affectedAssets && (
                  <View style={styles.metaItem}>
                    <MaterialCommunityIcons 
                      name="server" 
                      size={14} 
                      color={SecurityTheme.colors.text.secondary} 
                    />
                    <Text style={styles.metaText}>
                      {alert.affectedAssets} asset{alert.affectedAssets > 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
              </View>

              <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
                <Text style={styles.statusText}>
                  {alert.status.toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Swipe Hint */}
            <View style={styles.swipeHint}>
              <MaterialCommunityIcons 
                name="gesture-swipe-horizontal" 
                size={16} 
                color={SecurityTheme.colors.text.tertiary} 
              />
              <Text style={styles.hintText}>Swipe for actions</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );

  function getStatusColor() {
    const statusColors = {
      active: SecurityTheme.colors.interactive.error,
      investigating: SecurityTheme.colors.interactive.warning,
      resolved: SecurityTheme.colors.interactive.success,
      dismissed: SecurityTheme.colors.text.disabled,
    };
    return statusColors[alert.status];
  }
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    marginHorizontal: SecurityTheme.spacing.md,
  },
  actionsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rightAction: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SecurityTheme.spacing.md,
  },
  leftActions: {
    flexDirection: 'row',
  },
  leftAction: {
    width: ACTION_BUTTON_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SecurityTheme.spacing.sm,
  },
  actionText: {
    color: SecurityTheme.colors.text.primary,
    fontSize: SecurityTheme.typography.sizes.xs,
    fontWeight: SecurityTheme.typography.weights.medium,
    marginTop: 4,
  },
  card: {
    ...SecurityTheme.components.card,
    marginVertical: 0,
  },
  cardContent: {
    padding: SecurityTheme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SecurityTheme.spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: SecurityTheme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SecurityTheme.spacing.sm,
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: SecurityTheme.typography.sizes.lg,
    fontWeight: SecurityTheme.typography.weights.semibold,
    color: SecurityTheme.colors.text.primary,
    lineHeight: SecurityTheme.typography.lineHeights.tight * SecurityTheme.typography.sizes.lg,
  },
  timestamp: {
    fontSize: SecurityTheme.typography.sizes.sm,
    color: SecurityTheme.colors.text.secondary,
    marginTop: 2,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  severityBadge: {
    paddingHorizontal: SecurityTheme.spacing.xs,
    paddingVertical: 2,
    borderRadius: SecurityTheme.borderRadius.sm,
    marginBottom: SecurityTheme.spacing.xs,
  },
  severityText: {
    fontSize: SecurityTheme.typography.sizes.xs,
    fontWeight: SecurityTheme.typography.weights.bold,
    color: SecurityTheme.colors.text.primary,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: SecurityTheme.borderRadius.full,
    backgroundColor: SecurityTheme.colors.primary[500],
  },
  message: {
    fontSize: SecurityTheme.typography.sizes.base,
    color: SecurityTheme.colors.text.secondary,
    lineHeight: SecurityTheme.typography.lineHeights.normal * SecurityTheme.typography.sizes.base,
    marginBottom: SecurityTheme.spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SecurityTheme.spacing.sm,
  },
  footerLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SecurityTheme.spacing.md,
  },
  metaText: {
    fontSize: SecurityTheme.typography.sizes.sm,
    color: SecurityTheme.colors.text.secondary,
    marginLeft: 4,
  },
  statusBadge: {
    paddingHorizontal: SecurityTheme.spacing.xs,
    paddingVertical: 2,
    borderRadius: SecurityTheme.borderRadius.sm,
  },
  statusText: {
    fontSize: SecurityTheme.typography.sizes.xs,
    fontWeight: SecurityTheme.typography.weights.medium,
    color: SecurityTheme.colors.text.primary,
  },
  swipeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SecurityTheme.spacing.sm,
    paddingTop: SecurityTheme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: SecurityTheme.colors.border.primary,
  },
  hintText: {
    fontSize: SecurityTheme.typography.sizes.xs,
    color: SecurityTheme.colors.text.tertiary,
    marginLeft: 4,
  },
});