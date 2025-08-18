import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Estimate, EstimateStatus, PricingTier } from '../../types/graphql';

interface EstimateCardProps {
  estimate: Estimate;
  onPress: () => void;
  compact?: boolean;
  style?: ViewStyle;
}

const EstimateCard: React.FC<EstimateCardProps> = ({
  estimate,
  onPress,
  compact = false,
  style,
}) => {
  const getStatusColor = (status: EstimateStatus): string => {
    switch (status) {
      case EstimateStatus.DRAFT:
        return '#6B7280';
      case EstimateStatus.IN_PROGRESS:
        return '#3B82F6';
      case EstimateStatus.REVIEW:
        return '#8B5CF6';
      case EstimateStatus.SENT:
        return '#F59E0B';
      case EstimateStatus.ACCEPTED:
        return '#10B981';
      case EstimateStatus.REJECTED:
        return '#EF4444';
      case EstimateStatus.EXPIRED:
        return '#9CA3AF';
      case EstimateStatus.ARCHIVED:
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  const getTierColor = (tier: PricingTier): string => {
    switch (tier) {
      case PricingTier.GOOD:
        return '#10B981';
      case PricingTier.BETTER:
        return '#3B82F6';
      case PricingTier.BEST:
        return '#8B5CF6';
      default:
        return '#6B7280';
    }
  };

  const formatStatus = (status: EstimateStatus): string => {
    return status.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getSelectedPrice = (): number => {
    switch (estimate.selectedTier) {
      case PricingTier.GOOD:
        return estimate.goodPrice;
      case PricingTier.BETTER:
        return estimate.betterPrice;
      case PricingTier.BEST:
        return estimate.bestPrice;
      default:
        return estimate.goodPrice;
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;

    return date.toLocaleDateString();
  };

  const isUrgent = (): boolean => {
    return estimate.status === EstimateStatus.REVIEW ||
           estimate.status === EstimateStatus.SENT;
  };

  const needsAction = (): boolean => {
    return estimate.status === EstimateStatus.DRAFT ||
           estimate.status === EstimateStatus.IN_PROGRESS;
  };

  return (
    <TouchableOpacity
      style={[
        compact ? styles.compactCard : styles.fullCard,
        isUrgent() && styles.urgentCard,
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, compact && styles.compactTitle]}>
            Estimate #{estimate.id.slice(-6)}
          </Text>
          <Text style={styles.subtitle}>
            Created {formatDate(estimate.createdAt)}
          </Text>
        </View>

        <View style={styles.headerRight}>
          {needsAction() && (
            <Icon name="warning" size={16} color="#F59E0B" style={styles.warningIcon} />
          )}
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(estimate.status) }]}>
            <Text style={styles.statusText}>{formatStatus(estimate.status)}</Text>
          </View>
        </View>
      </View>

      {/* Pricing Information */}
      <View style={styles.pricingSection}>
        <View style={styles.mainPrice}>
          <Text style={styles.priceLabel}>Selected ({estimate.selectedTier})</Text>
          <Text style={[styles.priceValue, { color: getTierColor(estimate.selectedTier) }]}>
            {formatCurrency(getSelectedPrice())}
          </Text>
        </View>

        {!compact && (
          <View style={styles.pricingTiers}>
            <PriceTier
              label="Good"
              amount={estimate.goodPrice}
              isSelected={estimate.selectedTier === PricingTier.GOOD}
            />
            <PriceTier
              label="Better"
              amount={estimate.betterPrice}
              isSelected={estimate.selectedTier === PricingTier.BETTER}
            />
            <PriceTier
              label="Best"
              amount={estimate.bestPrice}
              isSelected={estimate.selectedTier === PricingTier.BEST}
            />
          </View>
        )}
      </View>

      {/* Details - only show in full card */}
      {!compact && (
        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Icon name="square" size={14} color="#6B7280" />
            <Text style={styles.detailText}>
              {estimate.totalSquareFootage.toFixed(0)} sq ft
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Icon name="time" size={14} color="#6B7280" />
            <Text style={styles.detailText}>
              {estimate.laborHours.toFixed(1)} labor hours
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Icon name="construct" size={14} color="#6B7280" />
            <Text style={styles.detailText}>
              {formatCurrency(estimate.materialCost)} materials
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Icon name="person" size={14} color="#6B7280" />
            <Text style={styles.detailText}>
              By {estimate.createdBy}
            </Text>
          </View>
        </View>
      )}

      {/* Footer - Actions needed */}
      {(needsAction() || isUrgent()) && (
        <View style={styles.footer}>
          {estimate.status === EstimateStatus.DRAFT && (
            <View style={styles.actionNeeded}>
              <Icon name="create" size={12} color="#3B82F6" />
              <Text style={styles.actionText}>Complete measurements</Text>
            </View>
          )}

          {estimate.status === EstimateStatus.IN_PROGRESS && (
            <View style={styles.actionNeeded}>
              <Icon name="calculator" size={12} color="#3B82F6" />
              <Text style={styles.actionText}>Finalize pricing</Text>
            </View>
          )}

          {estimate.status === EstimateStatus.REVIEW && (
            <View style={[styles.actionNeeded, styles.urgentAction]}>
              <Icon name="checkmark-circle" size={12} color="#8B5CF6" />
              <Text style={[styles.actionText, { color: '#8B5CF6' }]}>Awaiting approval</Text>
            </View>
          )}

          {estimate.status === EstimateStatus.SENT && (
            <View style={[styles.actionNeeded, styles.sentAction]}>
              <Icon name="send" size={12} color="#F59E0B" />
              <Text style={[styles.actionText, { color: '#F59E0B' }]}>Sent to customer</Text>
            </View>
          )}

          {estimate.pdfUrl && (
            <TouchableOpacity style={styles.pdfButton}>
              <Icon name="document-text" size={12} color="#6B7280" />
              <Text style={styles.pdfButtonText}>PDF</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

interface PriceTierProps {
  label: string;
  amount: number;
  isSelected: boolean;
}

const PriceTier: React.FC<PriceTierProps> = ({ label, amount, isSelected }) => (
  <View style={[styles.priceTier, isSelected && styles.selectedTier]}>
    <Text style={[styles.tierLabel, isSelected && styles.selectedTierText]}>
      {label}
    </Text>
    <Text style={[styles.tierAmount, isSelected && styles.selectedTierText]}>
      ${amount.toLocaleString()}
    </Text>
  </View>
);

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
  urgentCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
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
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningIcon: {
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
    textTransform: 'uppercase',
  },
  pricingSection: {
    marginBottom: 12,
  },
  mainPrice: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  priceValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  pricingTiers: {
    flexDirection: 'row',
    gap: 8,
  },
  priceTier: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  selectedTier: {
    backgroundColor: '#EBF8FF',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  tierLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },
  selectedTierText: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  tierAmount: {
    fontSize: 12,
    fontWeight: '500',
    color: '#111827',
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
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionNeeded: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF8FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  urgentAction: {
    backgroundColor: '#F3E8FF',
  },
  sentAction: {
    backgroundColor: '#FEF3C7',
  },
  actionText: {
    fontSize: 11,
    color: '#3B82F6',
    marginLeft: 4,
    fontWeight: '500',
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pdfButtonText: {
    fontSize: 11,
    color: '#6B7280',
    marginLeft: 4,
  },
});

export default EstimateCard;
