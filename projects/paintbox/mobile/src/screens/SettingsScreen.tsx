/**
 * Settings Screen - App configuration and preferences
 */

import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import {
  Text,
  useTheme,
  Card,
  List,
  Switch,
  Button,
  Divider,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { SettingsStackParamList } from '@/navigation/AppNavigator';
import {
  isBackgroundSyncEnabled,
  getLastSyncResult,
  triggerManualSync,
} from '@/services/backgroundTasks';
import { clearCache } from '@/services/apolloClient';

type Props = NativeStackScreenProps<SettingsStackParamList, 'SettingsMain'>;

export default function SettingsScreen({ }: Props) {
  const theme = useTheme();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [backgroundSyncEnabled, setBackgroundSyncEnabled] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Load notification setting
      const notifSetting = await AsyncStorage.getItem('notificationsEnabled');
      if (notifSetting !== null) {
        setNotificationsEnabled(JSON.parse(notifSetting));
      }

      // Check background sync status
      const bgSyncEnabled = await isBackgroundSyncEnabled();
      setBackgroundSyncEnabled(bgSyncEnabled);

      // Get last sync result
      const syncResult = await getLastSyncResult();
      setLastSyncResult(syncResult);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleNotificationToggle = async () => {
    const newValue = !notificationsEnabled;
    setNotificationsEnabled(newValue);
    await AsyncStorage.setItem('notificationsEnabled', JSON.stringify(newValue));
  };

  const handleManualSync = async () => {
    try {
      const result = await triggerManualSync();
      setLastSyncResult(result);

      Alert.alert(
        'Manual Sync Complete',
        `New alerts: ${result.newAlerts}\nService changes: ${result.serviceStatusChanges}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Sync Failed', error.message, [{ text: 'OK' }]);
    }
  };

  const handleClearCache = async () => {
    Alert.alert(
      'Clear Cache',
      'This will remove all cached data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearCache();
              Alert.alert('Cache Cleared', 'All cached data has been removed.', [{ text: 'OK' }]);
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cache.', [{ text: 'OK' }]);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView>
        {/* Notifications */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Notifications
            </Text>

            <List.Item
              title="Push Notifications"
              description="Receive alerts and system status updates"
              left={() => (
                <MaterialCommunityIcons
                  name="bell-outline"
                  size={24}
                  color={theme.colors.onSurface}
                  style={styles.listIcon}
                />
              )}
              right={() => (
                <Switch
                  value={notificationsEnabled}
                  onValueChange={handleNotificationToggle}
                />
              )}
            />
          </Card.Content>
        </Card>

        {/* Background Sync */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Background Sync
            </Text>

            <List.Item
              title="Background Updates"
              description={backgroundSyncEnabled ? 'Enabled' : 'Disabled'}
              left={() => (
                <MaterialCommunityIcons
                  name="sync"
                  size={24}
                  color={theme.colors.onSurface}
                  style={styles.listIcon}
                />
              )}
            />

            {lastSyncResult && (
              <>
                <Divider style={styles.divider} />
                <List.Item
                  title="Last Sync"
                  description={`${new Date(lastSyncResult.timestamp).toLocaleString()}\n${lastSyncResult.newAlerts} new alerts, ${lastSyncResult.serviceStatusChanges} status changes`}
                  left={() => (
                    <MaterialCommunityIcons
                      name={lastSyncResult.success ? "check-circle" : "alert-circle"}
                      size={24}
                      color={lastSyncResult.success ? theme.colors.success : theme.colors.error}
                      style={styles.listIcon}
                    />
                  )}
                />
              </>
            )}

            <Button
              mode="contained-tonal"
              onPress={handleManualSync}
              style={styles.syncButton}
              icon="refresh"
            >
              Manual Sync
            </Button>
          </Card.Content>
        </Card>

        {/* Data Management */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Data Management
            </Text>

            <Button
              mode="outlined"
              onPress={handleClearCache}
              style={styles.clearButton}
              icon="delete-outline"
            >
              Clear Cache
            </Button>
          </Card.Content>
        </Card>

        {/* App Info */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              About
            </Text>

            <List.Item
              title="Version"
              description="1.0.0"
              left={() => (
                <MaterialCommunityIcons
                  name="information-outline"
                  size={24}
                  color={theme.colors.onSurface}
                  style={styles.listIcon}
                />
              )}
            />

            <List.Item
              title="System Analyzer Mobile"
              description="Monitor and manage your system infrastructure"
              left={() => (
                <MaterialCommunityIcons
                  name="cellphone"
                  size={24}
                  color={theme.colors.onSurface}
                  style={styles.listIcon}
                />
              )}
            />
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  listIcon: {
    marginLeft: 8,
    marginTop: 12,
  },
  divider: {
    marginVertical: 8,
  },
  syncButton: {
    marginTop: 16,
  },
  clearButton: {
    marginTop: 8,
  },
});
