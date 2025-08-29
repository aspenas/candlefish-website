import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import { Card, Badge, Icon, Button } from 'react-native-elements';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';

import {
  ThreatIndicator,
  IOCType,
  ConfidenceLevel,
  TLPLevel,
  ThreatLevel,
} from '../../types/security';

interface IOCCardProps {
  ioc: ThreatIndicator;
  onPress?: (ioc: ThreatIndicator) => void;
  onBlock?: (ioc: ThreatIndicator) => void;
  onWatchlist?: (ioc: ThreatIndicator) => void;
  onMarkFalsePositive?: (ioc: ThreatIndicator) => void;
  showActions?: boolean;
  compact?: boolean;
}

interface IOCTypeDisplayInfo {
  icon: string;
  color: string;
  label: string;
}

const IOC_TYPE_INFO: Record<IOCType, IOCTypeDisplayInfo> = {
  [IOCType.IP_ADDRESS]: { icon: 'public', color: '#ff6b6b', label: 'IP' },
  [IOCType.DOMAIN]: { icon: 'language', color: '#4ecdc4', label: 'Domain' },
  [IOCType.URL]: { icon: 'link', color: '#45b7d1', label: 'URL' },
  [IOCType.FILE_HASH_MD5]: { icon: 'fingerprint', color: '#f39c12', label: 'MD5' },
  [IOCType.FILE_HASH_SHA1]: { icon: 'fingerprint', color: '#e67e22', label: 'SHA1' },
  [IOCType.FILE_HASH_SHA256]: { icon: 'fingerprint', color: '#d35400', label: 'SHA256' },
  [IOCType.EMAIL]: { icon: 'email', color: '#9b59b6', label: 'Email' },
  [IOCType.USER_AGENT]: { icon: 'computer', color: '#34495e', label: 'User Agent' },
  [IOCType.CERTIFICATE]: { icon: 'security', color: '#27ae60', label: 'Certificate' },
  [IOCType.REGISTRY_KEY]: { icon: 'settings', color: '#7f8c8d', label: 'Registry' },
  [IOCType.MUTEX]: { icon: 'lock', color: '#8e44ad', label: 'Mutex' },
  [IOCType.FILE_PATH]: { icon: 'folder', color: '#16a085', label: 'File Path' },
  [IOCType.PROCESS_NAME]: { icon: 'memory', color: '#c0392b', label: 'Process' },
  [IOCType.YARA_RULE]: { icon: 'code', color: '#2c3e50', label: 'YARA' },
  [IOCType.CVE]: { icon: 'bug-report', color: '#e74c3c', label: 'CVE' },
  [IOCType.BITCOIN_ADDRESS]: { icon: 'account-balance-wallet', color: '#f1c40f', label: 'Bitcoin' },
};

const CONFIDENCE_COLORS: Record<ConfidenceLevel, string> = {
  [ConfidenceLevel.LOW]: '#95a5a6',
  [ConfidenceLevel.MEDIUM]: '#f39c12',
  [ConfidenceLevel.HIGH]: '#e67e22',
  [ConfidenceLevel.CONFIRMED]: '#27ae60',
};

const TLP_COLORS: Record<TLPLevel, string> = {
  [TLPLevel.WHITE]: '#95a5a6',
  [TLPLevel.GREEN]: '#27ae60',
  [TLPLevel.AMBER]: '#f39c12',
  [TLPLevel.RED]: '#e74c3c',
};

export const IOCCard: React.FC<IOCCardProps> = ({
  ioc,
  onPress,
  onBlock,
  onWatchlist,
  onMarkFalsePositive,
  showActions = true,
  compact = false,
}) => {
  const typeInfo = IOC_TYPE_INFO[ioc.type];
  const confidenceColor = CONFIDENCE_COLORS[ioc.confidence];
  const tlpColor = TLP_COLORS[ioc.tlpLevel];

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.(ioc);
  };

  const handleBlock = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Block IOC',
      `Are you sure you want to block ${ioc.value}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () => onBlock?.(ioc),
        },
      ]
    );
  };

  const handleWatchlist = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onWatchlist?.(ioc);
  };

  const handleMarkFalsePositive = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Mark as False Positive',
      `Mark ${ioc.value} as a false positive?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark',
          style: 'destructive',
          onPress: () => onMarkFalsePositive?.(ioc),
        },
      ]
    );
  };

  const truncateValue = (value: string, maxLength: number = 30): string => {
    if (value.length <= maxLength) return value;
    return `${value.substring(0, maxLength)}...`;
  };

  const formatLastSeen = (dateString: string): string => {
    try {
      return format(new Date(dateString), 'MMM dd, HH:mm');
    } catch {
      return 'Unknown';
    }
  };

  const getThreatLevelFromAssociatedThreats = (): ThreatLevel => {
    if (!ioc.associatedThreats?.length) return ThreatLevel.LOW;
    
    const hasHighSophistication = ioc.associatedThreats.some(
      threat => threat.sophisticationLevel === 'ADVANCED' || threat.sophisticationLevel === 'EXPERT'
    );
    
    return hasHighSophistication ? ThreatLevel.HIGH : ThreatLevel.MEDIUM;
  };

  if (compact) {
    return (
      <TouchableOpacity onPress={handlePress} style={styles.compactCard}>
        <View style={styles.compactHeader}>
          <Icon
            name={typeInfo.icon}
            type="material"
            size={16}
            color={typeInfo.color}
          />
          <Text style={styles.compactType}>{typeInfo.label}</Text>
          <Badge
            value={ioc.confidence}
            badgeStyle={[styles.compactBadge, { backgroundColor: confidenceColor }]}
            textStyle={styles.compactBadgeText}
          />
        </View>
        <Text style={styles.compactValue} numberOfLines={1}>
          {truncateValue(ioc.value)}
        </Text>
        <Text style={styles.compactLastSeen}>
          Last seen: {formatLastSeen(ioc.lastSeen)}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <Card containerStyle={[styles.card, !ioc.isActive && styles.inactiveCard]}>
      <TouchableOpacity onPress={handlePress}>
        <View style={styles.header}>
          <View style={styles.typeContainer}>
            <Icon
              name={typeInfo.icon}
              type="material"
              size={24}
              color={typeInfo.color}
            />
            <Text style={styles.typeLabel}>{typeInfo.label}</Text>
          </View>
          
          <View style={styles.badges}>
            <Badge
              value={ioc.confidence}
              badgeStyle={[styles.confidenceBadge, { backgroundColor: confidenceColor }]}
              textStyle={styles.badgeText}
            />
            <Badge
              value={`TLP:${ioc.tlpLevel}`}
              badgeStyle={[styles.tlpBadge, { backgroundColor: tlpColor }]}
              textStyle={styles.badgeText}
            />
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.value} numberOfLines={2}>
            {ioc.value}
          </Text>
          
          {ioc.context && (
            <Text style={styles.context} numberOfLines={2}>
              {ioc.context}
            </Text>
          )}

          <View style={styles.metadata}>
            <Text style={styles.metadataText}>
              First seen: {formatLastSeen(ioc.firstSeen)}
            </Text>
            <Text style={styles.metadataText}>
              Last seen: {formatLastSeen(ioc.lastSeen)}
            </Text>
            <Text style={styles.metadataText}>
              Source: {ioc.source.name} ({ioc.source.reliability})
            </Text>
          </View>

          {ioc.tags && ioc.tags.length > 0 && (
            <View style={styles.tags}>
              {ioc.tags.slice(0, 3).map((tag, index) => (
                <Badge
                  key={index}
                  value={tag}
                  badgeStyle={styles.tagBadge}
                  textStyle={styles.tagText}
                />
              ))}
              {ioc.tags.length > 3 && (
                <Badge
                  value={`+${ioc.tags.length - 3}`}
                  badgeStyle={styles.tagBadge}
                  textStyle={styles.tagText}
                />
              )}
            </View>
          )}

          {ioc.associatedThreats && ioc.associatedThreats.length > 0 && (
            <View style={styles.threats}>
              <Text style={styles.threatsLabel}>Associated Threats:</Text>
              {ioc.associatedThreats.slice(0, 2).map((threat, index) => (
                <Text key={threat.id} style={styles.threatName}>
                  • {threat.name} ({threat.sophisticationLevel})
                </Text>
              ))}
              {ioc.associatedThreats.length > 2 && (
                <Text style={styles.threatName}>
                  +{ioc.associatedThreats.length - 2} more
                </Text>
              )}
            </View>
          )}

          {ioc.geolocation && (
            <View style={styles.location}>
              <Icon
                name="location-on"
                type="material"
                size={16}
                color="#7f8c8d"
              />
              <Text style={styles.locationText}>
                {[ioc.geolocation.city, ioc.geolocation.country]
                  .filter(Boolean)
                  .join(', ')}
              </Text>
            </View>
          )}
        </View>

        {showActions && (
          <View style={styles.actions}>
            <Button
              title="Block"
              buttonStyle={[styles.actionButton, styles.blockButton]}
              titleStyle={styles.actionButtonText}
              onPress={handleBlock}
              icon={{
                name: 'block',
                type: 'material',
                size: 16,
                color: '#fff',
              }}
            />
            
            <Button
              title="Watch"
              buttonStyle={[styles.actionButton, styles.watchButton]}
              titleStyle={styles.actionButtonText}
              onPress={handleWatchlist}
              icon={{
                name: 'visibility',
                type: 'material',
                size: 16,
                color: '#fff',
              }}
            />
            
            <Button
              title="False+"
              buttonStyle={[styles.actionButton, styles.falsePositiveButton]}
              titleStyle={styles.actionButtonText}
              onPress={handleMarkFalsePositive}
              icon={{
                name: 'report',
                type: 'material',
                size: 16,
                color: '#fff',
              }}
            />
          </View>
        )}

        {ioc.falsePositive && (
          <View style={styles.falsePositiveIndicator}>
            <Icon
              name="report"
              type="material"
              size={16}
              color="#e74c3c"
            />
            <Text style={styles.falsePositiveText}>Marked as False Positive</Text>
          </View>
        )}
      </TouchableOpacity>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  inactiveCard: {
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#2c3e50',
  },
  badges: {
    flexDirection: 'row',
  },
  confidenceBadge: {
    marginRight: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tlpBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    marginBottom: 12,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#34495e',
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  context: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  metadata: {
    marginBottom: 8,
  },
  metadataText: {
    fontSize: 12,
    color: '#95a5a6',
    marginBottom: 2,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  tagBadge: {
    backgroundColor: '#ecf0f1',
    marginRight: 4,
    marginBottom: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 10,
    color: '#34495e',
  },
  threats: {
    marginBottom: 8,
  },
  threatsLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#34495e',
    marginBottom: 4,
  },
  threatName: {
    fontSize: 12,
    color: '#e74c3c',
    marginLeft: 8,
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginLeft: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 8,
    borderRadius: 8,
  },
  blockButton: {
    backgroundColor: '#e74c3c',
  },
  watchButton: {
    backgroundColor: '#3498db',
  },
  falsePositiveButton: {
    backgroundColor: '#95a5a6',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  falsePositiveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#ffeaa7',
    borderRadius: 8,
  },
  falsePositiveText: {
    fontSize: 12,
    color: '#e17055',
    marginLeft: 4,
    fontWeight: 'bold',
  },
  // Compact styles
  compactCard: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  compactType: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
    color: '#34495e',
    flex: 1,
  },
  compactBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  compactBadgeText: {
    fontSize: 10,
  },
  compactValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  compactLastSeen: {
    fontSize: 11,
    color: '#95a5a6',
  },
});

export default IOCCard;