import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import Svg, {
  Line,
  Circle,
  Path,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';
import { format, parseISO } from 'date-fns';
import { useTheme } from '../providers/ThemeProvider';
import { PriceHistory } from '../types';

interface PriceHistoryChartProps {
  data: PriceHistory[];
  height?: number;
  showTrend?: boolean;
  interactive?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

export const PriceHistoryChart: React.FC<PriceHistoryChartProps> = ({
  data,
  height = 200,
  showTrend = true,
  interactive = false,
}) => {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  
  const chartData = useMemo(() => {
    if (!data.length) return { points: [], minPrice: 0, maxPrice: 0, trend: 'stable' };
    
    const sortedData = [...data].sort((a, b) => 
      new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime()
    );
    
    const prices = sortedData.map(item => item.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;
    
    const chartWidth = screenWidth - 32; // Account for padding
    const chartHeight = height - 60; // Account for labels and padding
    
    const points = sortedData.map((item, index) => {
      const x = (index / (sortedData.length - 1 || 1)) * chartWidth;
      const y = chartHeight - ((item.price - minPrice) / priceRange) * chartHeight;
      
      return {
        x,
        y,
        price: item.price,
        date: item.effective_date,
        confidence: item.confidence_score,
        type: item.valuation_type,
      };
    });
    
    // Calculate trend
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    const priceDiff = lastPrice - firstPrice;
    const percentChange = (priceDiff / firstPrice) * 100;
    
    let trend: 'up' | 'down' | 'stable';
    if (percentChange > 5) trend = 'up';
    else if (percentChange < -5) trend = 'down';
    else trend = 'stable';
    
    return {
      points,
      minPrice,
      maxPrice,
      trend,
      percentChange,
      priceRange,
    };
  }, [data, height]);

  if (!data.length) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={styles.noDataText}>No price history available</Text>
      </View>
    );
  }

  const createPath = () => {
    if (chartData.points.length < 2) return '';
    
    let path = `M ${chartData.points[0].x} ${chartData.points[0].y}`;
    
    for (let i = 1; i < chartData.points.length; i++) {
      const point = chartData.points[i];
      path += ` L ${point.x} ${point.y}`;
    }
    
    return path;
  };

  const getTrendColor = () => {
    switch (chartData.trend) {
      case 'up':
        return theme.colors.success;
      case 'down':
        return theme.colors.error;
      default:
        return theme.colors.primary;
    }
  };

  const getTrendIcon = () => {
    switch (chartData.trend) {
      case 'up':
        return '↗';
      case 'down':
        return '↘';
      default:
        return '→';
    }
  };

  return (
    <View style={[styles.container, { height }]}>
      {/* Header with trend info */}
      {showTrend && (
        <View style={styles.header}>
          <Text style={styles.title}>Price History</Text>
          <View style={styles.trendContainer}>
            <Text style={[styles.trendIcon, { color: getTrendColor() }]}>
              {getTrendIcon()}
            </Text>
            <Text style={[styles.trendText, { color: getTrendColor() }]}>
              {Math.abs(chartData.percentChange).toFixed(1)}%
            </Text>
          </View>
        </View>
      )}

      {/* Chart */}
      <View style={styles.chartContainer}>
        <Svg
          width={screenWidth - 32}
          height={height - 60}
          viewBox={`0 0 ${screenWidth - 32} ${height - 60}`}
        >
          <Defs>
            <LinearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor={getTrendColor()} stopOpacity="0.3" />
              <Stop offset="100%" stopColor={getTrendColor()} stopOpacity="0.05" />
            </LinearGradient>
          </Defs>

          {/* Grid lines */}
          {Array.from({ length: 5 }).map((_, i) => {
            const y = ((height - 60) / 4) * i;
            return (
              <Line
                key={i}
                x1="0"
                y1={y}
                x2={screenWidth - 32}
                y2={y}
                stroke={theme.colors.border}
                strokeWidth="1"
                strokeOpacity="0.3"
              />
            );
          })}

          {/* Area under curve */}
          {chartData.points.length > 1 && (
            <Path
              d={`${createPath()} L ${chartData.points[chartData.points.length - 1].x} ${height - 60} L ${chartData.points[0].x} ${height - 60} Z`}
              fill="url(#gradient)"
            />
          )}

          {/* Price line */}
          {chartData.points.length > 1 && (
            <Path
              d={createPath()}
              stroke={getTrendColor()}
              strokeWidth="2"
              fill="none"
            />
          )}

          {/* Data points */}
          {chartData.points.map((point, index) => (
            <Circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="4"
              fill={getTrendColor()}
              stroke={theme.colors.surface}
              strokeWidth="2"
            />
          ))}

          {/* Price labels on Y-axis */}
          {Array.from({ length: 3 }).map((_, i) => {
            const price = chartData.minPrice + (chartData.priceRange / 2) * i;
            const y = (height - 60) - ((price - chartData.minPrice) / chartData.priceRange) * (height - 60);
            
            return (
              <SvgText
                key={i}
                x="5"
                y={y + 4}
                fontSize="10"
                fill={theme.colors.textSecondary}
              >
                ${price.toLocaleString()}
              </SvgText>
            );
          })}
        </Svg>
      </View>

      {/* Date labels */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.dateLabels}>
          {chartData.points.map((point, index) => (
            <Text key={index} style={styles.dateText}>
              {format(parseISO(point.date), 'MMM d')}
            </Text>
          ))}
        </View>
      </ScrollView>

      {/* Summary stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Current</Text>
          <Text style={styles.statValue}>
            ${chartData.points[chartData.points.length - 1]?.price.toLocaleString()}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Range</Text>
          <Text style={styles.statValue}>
            ${chartData.minPrice.toLocaleString()} - ${chartData.maxPrice.toLocaleString()}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Data Points</Text>
          <Text style={styles.statValue}>{data.length}</Text>
        </View>
      </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendIcon: {
    fontSize: theme.fontSize.lg,
    marginRight: theme.spacing.xs,
  },
  trendText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  chartContainer: {
    marginBottom: theme.spacing.sm,
  },
  dateLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.sm,
  },
  dateText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    minWidth: 50,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs / 2,
  },
  statValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.text,
  },
  noDataText: {
    textAlign: 'center',
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    flex: 1,
    textAlignVertical: 'center',
  },
});

export default PriceHistoryChart;