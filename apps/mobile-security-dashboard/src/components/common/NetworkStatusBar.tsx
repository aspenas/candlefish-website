import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Surface, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';

export const NetworkStatusBar: React.FC = () => {
  const theme = useTheme();
  const { isConnected, connectionType } = useNetworkStatus();
  const { queueSize } = useOfflineQueue();

  // Only show when offline or when there are queued items
  if (isConnected && queueSize === 0) {
    return null;
  }

  const getStatusText = () => {
    if (!isConnected) {
      return 'Offline';
    }
    if (queueSize > 0) {
      return `${queueSize} items queued for sync`;
    }
    return '';
  };

  const getStatusColor = () => {
    if (!isConnected) {
      return {
        background: '#ffebee',
        text: '#d32f2f',
        icon: '#d32f2f',
      };
    }
    return {
      background: '#e3f2fd',
      text: '#1976d2',
      icon: '#1976d2',
    };
  };

  const colors = getStatusColor();

  return (
    <Surface
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
        },
      ]}
      elevation={1}
    >
      <View style={styles.content}>
        <MaterialCommunityIcons
          name={isConnected ? 'sync' : 'wifi-off'}
          size={16}
          color={colors.icon}
          style={styles.icon}
        />
        <Text
          style={[
            styles.text,
            {
              color: colors.text,
            },
          ]}
        >
          {getStatusText()}
        </Text>
      </View>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 8,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default NetworkStatusBar;