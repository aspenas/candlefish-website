import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Surface, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type ThreatLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

interface ThreatLevelIndicatorProps {
  level: ThreatLevel;
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
}

export const ThreatLevelIndicator: React.FC<ThreatLevelIndicatorProps> = ({
  level,
  size = 'medium',
  showText = true,
}) => {
  const theme = useTheme();

  const getLevelConfig = (level: ThreatLevel) => {
    switch (level) {
      case 'CRITICAL':
        return {
          color: '#d32f2f',
          backgroundColor: '#ffebee',
          icon: 'alert-octagon',
          text: 'Critical',
          description: 'Immediate action required',
        };
      case 'HIGH':
        return {
          color: '#f57c00',
          backgroundColor: '#fff3e0',
          icon: 'alert',
          text: 'High',
          description: 'Urgent attention needed',
        };
      case 'MEDIUM':
        return {
          color: '#1976d2',
          backgroundColor: '#e3f2fd',
          icon: 'alert-circle',
          text: 'Medium',
          description: 'Monitor closely',
        };
      case 'LOW':
        return {
          color: '#388e3c',
          backgroundColor: '#e8f5e8',
          icon: 'information',
          text: 'Low',
          description: 'Normal operations',
        };
      default:
        return {
          color: theme.colors.outline,
          backgroundColor: theme.colors.surfaceVariant,
          icon: 'help-circle',
          text: 'Unknown',
          description: 'Status unknown',
        };
    }
  };

  const getSizeConfig = (size: 'small' | 'medium' | 'large') => {
    switch (size) {
      case 'small':
        return {
          containerSize: 48,
          iconSize: 20,
          fontSize: 12,
          descriptionFontSize: 10,
        };
      case 'large':
        return {
          containerSize: 80,
          iconSize: 32,
          fontSize: 18,
          descriptionFontSize: 14,
        };
      case 'medium':
      default:
        return {
          containerSize: 64,
          iconSize: 24,
          fontSize: 16,
          descriptionFontSize: 12,
        };
    }
  };

  const levelConfig = getLevelConfig(level);
  const sizeConfig = getSizeConfig(size);

  return (
    <View style={styles.container}>
      <Surface
        style={[
          styles.indicator,
          {
            width: sizeConfig.containerSize,
            height: sizeConfig.containerSize,
            borderRadius: sizeConfig.containerSize / 2,
            backgroundColor: levelConfig.backgroundColor,
          },
        ]}
        elevation={2}
      >
        <MaterialCommunityIcons
          name={levelConfig.icon as any}
          size={sizeConfig.iconSize}
          color={levelConfig.color}
        />
      </Surface>
      
      {showText && (
        <View style={styles.textContainer}>
          <Text
            style={[
              styles.levelText,
              {
                fontSize: sizeConfig.fontSize,
                color: levelConfig.color,
                fontWeight: 'bold',
              },
            ]}
          >
            {levelConfig.text}
          </Text>
          {size !== 'small' && (
            <Text
              style={[
                styles.description,
                {
                  fontSize: sizeConfig.descriptionFontSize,
                  opacity: 0.7,
                },
              ]}
            >
              {levelConfig.description}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  indicator: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  textContainer: {
    alignItems: 'center',
  },
  levelText: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  description: {
    textAlign: 'center',
  },
});

export default ThreatLevelIndicator;