import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { format } from 'date-fns';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../providers/ThemeProvider';
import { Valuation, ValuationType } from '../types';

interface ValuationCardProps {
  valuation: Valuation;
  showDetails?: boolean;
  compact?: boolean;
  onRequestUpdate?: () => void;
  onViewHistory?: () => void;
  onViewComparisons?: () => void;
  onPress?: () => void;
}

const getValuationTypeIcon = (type: ValuationType): string => {
  switch (type) {
    case 'ai_estimated':
      return 'smart-toy';
    case 'market_analysis':
      return 'analytics';
    case 'professional_appraisal':
      return 'verified';
    case 'user_override':
      return 'edit';
    default:
      return 'attach-money';
  }
};

const getValuationTypeLabel = (type: ValuationType): string => {
  switch (type) {
    case 'ai_estimated':
      return 'AI Estimated';
    case 'market_analysis':
      return 'Market Analysis';
    case 'professional_appraisal':
      return 'Professional Appraisal';
    case 'user_override':
      return 'Manual Override';
    default:
      return type;
  }
};

const getConfidenceColor = (score: number, theme: any) => {
  if (score >= 0.8) return theme.colors.success;
  if (score >= 0.6) return theme.colors.warning;
  return theme.colors.error;
};

const getConfidenceIcon = (score: number): string => {
  if (score >= 0.8) return 'check-circle';
  if (score >= 0.6) return 'schedule';
  return 'warning';
};

export const ValuationCard: React.FC<ValuationCardProps> = ({
  valuation,
  showDetails = true,
  compact = false,
  onRequestUpdate,
  onViewHistory,
  onViewComparisons,
  onPress,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  
  const isExpired = valuation.expires_at && new Date(valuation.expires_at) < new Date();
  const confidenceColor = getConfidenceColor(valuation.confidence_score, theme);
  const confidenceIcon = getConfidenceIcon(valuation.confidence_score);

  if (compact) {
    return (
      <TouchableOpacity
        style={[
          styles.compactContainer,
          isExpired && styles.expiredContainer
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.compactContent}>
          <View style={styles.compactLeft}>
            <Icon
              name={getValuationTypeIcon(valuation.valuation_type)}
              size={20}
              color={theme.colors.primary}
              style={styles.typeIcon}
            />
            <View>
              <Text style={styles.compactValue}>
                ${valuation.estimated_value.toLocaleString()}
              </Text>
              <Text style={styles.compactType}>
                {getValuationTypeLabel(valuation.valuation_type)}
              </Text>
            </View>
          </View>
          
          <View style={[styles.confidenceBadge, { backgroundColor: confidenceColor + '20' }]}>
            <Icon
              name={confidenceIcon}
              size={12}
              color={confidenceColor}
              style={{ marginRight: 2 }}
            />
            <Text style={[styles.confidenceText, { color: confidenceColor }]}>
              {Math.round(valuation.confidence_score * 100)}%
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isExpired && styles.expiredContainer
      ]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon
            name={getValuationTypeIcon(valuation.valuation_type)}
            size={24}
            color={theme.colors.primary}
            style={styles.typeIcon}
          />
          <View>
            <Text style={styles.typeLabel}>
              {getValuationTypeLabel(valuation.valuation_type)}
            </Text>
            <Text style={styles.dateText}>
              {format(new Date(valuation.effective_date), 'MMM d, yyyy')}
              {isExpired && (
                <Text style={styles.expiredText}> (Expired)</Text>
              )}
            </Text>
          </View>
        </View>
        
        {onRequestUpdate && (
          <TouchableOpacity
            style={styles.updateButton}
            onPress={onRequestUpdate}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="refresh" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Primary Valuation */}
        <View style={styles.valuationSection}>
          <Text style={styles.primaryValue}>
            ${valuation.estimated_value.toLocaleString()}
          </Text>
          {valuation.low_estimate && valuation.high_estimate && (
            <Text style={styles.rangeText}>
              Range: ${valuation.low_estimate.toLocaleString()} - ${valuation.high_estimate.toLocaleString()}
            </Text>
          )}
        </View>

        {/* Confidence & Details */}
        <View style={styles.detailsSection}>
          <View style={styles.confidenceRow}>
            <Text style={styles.labelText}>Confidence:</Text>
            <View style={[styles.confidenceBadgeLarge, { backgroundColor: confidenceColor + '20' }]}>
              <Icon
                name={confidenceIcon}
                size={14}
                color={confidenceColor}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.confidenceTextLarge, { color: confidenceColor }]}>
                {Math.round(valuation.confidence_score * 100)}%
              </Text>
            </View>
          </View>
          
          {valuation.expires_at && (
            <Text style={styles.expiresText}>
              Expires: {format(new Date(valuation.expires_at), 'MMM d, yyyy')}
            </Text>
          )}
        </View>

        {/* Data Sources */}
        {valuation.data_sources.length > 0 && (
          <View style={styles.sourcesSection}>
            <Text style={styles.labelText}>Data Sources:</Text>
            <View style={styles.sourcesContainer}>
              {valuation.data_sources.map((source, index) => (
                <View key={index} style={styles.sourceTag}>
                  <Text style={styles.sourceText}>
                    {source.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Methodology Notes */}
        {showDetails && valuation.methodology_notes && (
          <View style={styles.notesSection}>
            <Text style={styles.labelText}>Notes:</Text>
            <Text style={styles.notesText}>{valuation.methodology_notes}</Text>
          </View>
        )}
      </View>

      {/* Actions */}
      {showDetails && (
        <View style={styles.actions}>
          <View style={styles.actionButtons}>
            {onViewHistory && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={onViewHistory}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="trending-up" size={16} color={theme.colors.primary} />
                <Text style={styles.actionText}>History</Text>
              </TouchableOpacity>
            )}
            {onViewComparisons && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={onViewComparisons}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="compare-arrows" size={16} color={theme.colors.primary} />
                <Text style={styles.actionText}>Compare</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.lastUpdated}>
            Updated: {format(new Date(valuation.updated_at), 'MMM d, HH:mm')}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginVertical: theme.spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  compactContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.sm,
    marginVertical: theme.spacing.xs / 2,
  },
  expiredContainer: {
    borderColor: theme.colors.warning,
    backgroundColor: theme.colors.warning + '10',
  },
  compactContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactValue: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
  },
  compactType: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  typeIcon: {
    marginRight: theme.spacing.sm,
  },
  typeLabel: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
  },
  dateText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  expiredText: {
    color: theme.colors.warning,
    fontWeight: '500',
  },
  updateButton: {
    padding: theme.spacing.xs,
  },
  content: {
    padding: theme.spacing.md,
  },
  valuationSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  primaryValue: {
    fontSize: theme.fontSize.xl * 1.5,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  rangeText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  detailsSection: {
    marginBottom: theme.spacing.md,
  },
  confidenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  labelText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.xs / 2,
    borderRadius: theme.borderRadius.sm,
  },
  confidenceBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  confidenceText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '500',
  },
  confidenceTextLarge: {
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
  },
  expiresText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  sourcesSection: {
    marginBottom: theme.spacing.md,
  },
  sourcesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.xs,
  },
  sourceTag: {
    backgroundColor: theme.colors.primary + '20',
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.xs / 2,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
  },
  sourceText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  notesSection: {
    marginBottom: theme.spacing.md,
  },
  notesText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    borderBottomLeftRadius: theme.borderRadius.md,
    borderBottomRightRadius: theme.borderRadius.md,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  actionText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    marginLeft: theme.spacing.xs / 2,
  },
  lastUpdated: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
});

export default ValuationCard;