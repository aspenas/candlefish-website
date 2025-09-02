import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Linking,
} from 'react-native';
import { format, parseISO } from 'date-fns';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../providers/ThemeProvider';
import { MarketComparison } from '../types';

interface MarketComparisonTableProps {
  comparisons: MarketComparison[];
  showImages?: boolean;
  onComparisonPress?: (comparison: MarketComparison) => void;
}

export const MarketComparisonTable: React.FC<MarketComparisonTableProps> = ({
  comparisons,
  showImages = true,
  onComparisonPress,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'ebay':
        return 'shopping-cart';
      case 'auction_houses':
        return 'gavel';
      case 'retail':
        return 'store';
      case 'insurance':
        return 'security';
      case 'estate_sales':
        return 'home';
      default:
        return 'info';
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'ebay':
        return '#0064D2';
      case 'auction_houses':
        return '#8B4513';
      case 'retail':
        return '#28A745';
      case 'insurance':
        return '#6F42C1';
      case 'estate_sales':
        return '#FD7E14';
      default:
        return theme.colors.primary;
    }
  };

  const getSimilarityColor = (score: number) => {
    if (score >= 0.8) return theme.colors.success;
    if (score >= 0.6) return theme.colors.warning;
    return theme.colors.error;
  };

  const openSourceUrl = (url?: string) => {
    if (url) {
      Linking.openURL(url);
    }
  };

  if (!comparisons.length) {
    return (
      <View style={styles.emptyContainer}>
        <Icon name="compare-arrows" size={48} color={theme.colors.textSecondary} />
        <Text style={styles.emptyText}>No market comparisons available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Market Comparisons</Text>
        <Text style={styles.subtitle}>{comparisons.length} comparisons found</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {comparisons.map((comparison, index) => {
          const isExpanded = expandedItems.has(comparison.id);
          const sourceColor = getSourceColor(comparison.source);
          const similarityColor = getSimilarityColor(comparison.similarity_score);
          
          return (
            <TouchableOpacity
              key={comparison.id}
              style={styles.comparisonCard}
              onPress={() => toggleExpanded(comparison.id)}
              activeOpacity={0.7}
            >
              {/* Header Row */}
              <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                  <Icon
                    name={getSourceIcon(comparison.source)}
                    size={20}
                    color={sourceColor}
                    style={styles.sourceIcon}
                  />
                  <View style={styles.titleContainer}>
                    <Text style={styles.itemTitle} numberOfLines={2}>
                      {comparison.comparable_item_title}
                    </Text>
                    <Text style={styles.sourceText}>
                      {comparison.source.replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.headerRight}>
                  <Text style={styles.priceText}>
                    ${comparison.sale_price.toLocaleString()}
                  </Text>
                  <View style={[styles.similarityBadge, { backgroundColor: similarityColor + '20' }]}>
                    <Text style={[styles.similarityText, { color: similarityColor }]}>
                      {Math.round(comparison.similarity_score * 100)}%
                    </Text>
                  </View>
                </View>
              </View>

              {/* Summary Row */}
              <View style={styles.summaryRow}>
                <Text style={styles.dateText}>
                  Sold: {format(parseISO(comparison.sale_date), 'MMM d, yyyy')}
                </Text>
                <Icon 
                  name={isExpanded ? 'expand-less' : 'expand-more'} 
                  size={20} 
                  color={theme.colors.textSecondary} 
                />
              </View>

              {/* Expanded Content */}
              {isExpanded && (
                <View style={styles.expandedContent}>
                  {comparison.comparable_item_description && (
                    <View style={styles.descriptionSection}>
                      <Text style={styles.sectionLabel}>Description:</Text>
                      <Text style={styles.descriptionText}>
                        {comparison.comparable_item_description}
                      </Text>
                    </View>
                  )}

                  {/* Adjustments */}
                  <View style={styles.adjustmentsSection}>
                    <Text style={styles.sectionLabel}>Price Adjustments:</Text>
                    <View style={styles.adjustmentRow}>
                      <Text style={styles.adjustmentLabel}>Condition:</Text>
                      <Text style={[
                        styles.adjustmentValue,
                        { color: comparison.condition_adjustment >= 0 ? theme.colors.success : theme.colors.error }
                      ]}>
                        {comparison.condition_adjustment >= 0 ? '+' : ''}
                        {(comparison.condition_adjustment * 100).toFixed(1)}%
                      </Text>
                    </View>
                    <View style={styles.adjustmentRow}>
                      <Text style={styles.adjustmentLabel}>Market:</Text>
                      <Text style={[
                        styles.adjustmentValue,
                        { color: comparison.market_adjustment >= 0 ? theme.colors.success : theme.colors.error }
                      ]}>
                        {comparison.market_adjustment >= 0 ? '+' : ''}
                        {(comparison.market_adjustment * 100).toFixed(1)}%
                      </Text>
                    </View>
                  </View>

                  {/* Images */}
                  {showImages && comparison.images && comparison.images.length > 0 && (
                    <View style={styles.imagesSection}>
                      <Text style={styles.sectionLabel}>Images:</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {comparison.images.map((imageUrl, idx) => (
                          <Image
                            key={idx}
                            source={{ uri: imageUrl }}
                            style={styles.comparisonImage}
                            resizeMode="cover"
                          />
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {/* Actions */}
                  <View style={styles.actionsSection}>
                    {comparison.source_url && (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => openSourceUrl(comparison.source_url)}
                      >
                        <Icon name="open-in-new" size={16} color={theme.colors.primary} />
                        <Text style={styles.actionText}>View Source</Text>
                      </TouchableOpacity>
                    )}
                    
                    {onComparisonPress && (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => onComparisonPress(comparison)}
                      >
                        <Icon name="info" size={16} color={theme.colors.primary} />
                        <Text style={styles.actionText}>Details</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginVertical: theme.spacing.xs,
  },
  header: {
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs / 2,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  comparisonCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.xs,
  },
  headerLeft: {
    flexDirection: 'row',
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  sourceIcon: {
    marginRight: theme.spacing.xs,
    marginTop: 2,
  },
  titleContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '500',
    color: theme.colors.text,
    lineHeight: 20,
  },
  sourceText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs / 2,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs / 2,
  },
  similarityBadge: {
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.xs / 2,
    borderRadius: theme.borderRadius.sm,
  },
  similarityText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '500',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
  },
  descriptionSection: {
    marginBottom: theme.spacing.md,
  },
  sectionLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs / 2,
  },
  descriptionText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  adjustmentsSection: {
    marginBottom: theme.spacing.md,
  },
  adjustmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs / 2,
  },
  adjustmentLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  adjustmentValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
  },
  imagesSection: {
    marginBottom: theme.spacing.md,
  },
  comparisonImage: {
    width: 80,
    height: 80,
    borderRadius: theme.borderRadius.sm,
    marginRight: theme.spacing.xs,
  },
  actionsSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: theme.spacing.md,
  },
  actionText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    marginLeft: theme.spacing.xs / 2,
  },
});

export default MarketComparisonTable;