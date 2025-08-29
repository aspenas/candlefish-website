import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import {
  Card,
  Text,
  Surface,
  useTheme,
  ActivityIndicator,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: string;
  trend?: 'up' | 'down' | 'stable';
  loading?: boolean;
  onPress?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  color,
  trend,
  loading = false,
  onPress,
}) => {
  const theme = useTheme();
  const cardWidth = (width - 48) / 2; // 2 cards per row with margins

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return 'trending-up';
      case 'down':
        return 'trending-down';
      case 'stable':
        return 'trending-neutral';
      default:
        return null;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return '#4caf50';
      case 'down':
        return '#f44336';
      case 'stable':
        return theme.colors.outline;
      default:
        return theme.colors.outline;
    }
  };

  return (
    <Card
      style={[styles.card, { width: cardWidth }]}
      onPress={onPress}
    >
      <Card.Content style={styles.content}>
        <View style={styles.header}>
          <Surface style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
            <MaterialCommunityIcons
              name={icon as any}
              size={24}
              color={color}
            />
          </Surface>
          {trend && (
            <MaterialCommunityIcons
              name={getTrendIcon() as any}
              size={20}
              color={getTrendColor()}
            />
          )}
        </View>
        
        <View style={styles.valueContainer}>
          {loading ? (
            <ActivityIndicator size="small" color={color} />
          ) : (
            <Text style={[styles.value, { color }]}>
              {value}
            </Text>
          )}
        </View>
        
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    margin: 8,
    elevation: 3,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 1,
  },
  valueContainer: {
    marginBottom: 8,
    minHeight: 32,
    justifyContent: 'center',
  },
  value: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 14,
    opacity: 0.8,
    lineHeight: 18,
  },
});

export default MetricCard;