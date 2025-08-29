import React from 'react';
import { ScrollView, StyleSheet, View, Alert } from 'react-native';
import {
  List,
  Switch,
  Divider,
  Surface,
  useTheme,
  Title,
  Paragraph,
  Avatar
} from 'react-native-paper';

import { useAuth } from '@/hooks/useAuth';
import { useAppSelector, useAppDispatch } from '@/hooks/redux';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import {
  updateUISettings,
  updateAuthSettings,
  updateNotificationSettings,
  updatePrivacySettings
} from '@/store/slices/settingsSlice';
import { spacing } from '@/constants/theme';

const SettingsScreen: React.FC = () => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { user, logout } = useAuth();
  const { triggerHaptic } = useHapticFeedback();
  const { settings } = useAppSelector((state) => state.settings);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            triggerHaptic('medium');
            logout();
          }
        }
      ]
    );
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Section */}
      <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.profileHeader}>
          <Avatar.Text 
            size={64} 
            label={user?.name?.charAt(0) || 'PE'}
            style={{ backgroundColor: theme.colors.primary }}
          />
          <View style={styles.profileInfo}>
            <Title>{user?.name || 'Prompt Engineer'}</Title>
            <Paragraph>{user?.email || 'No email set'}</Paragraph>
          </View>
        </View>
      </Surface>

      {/* App Settings */}
      <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]}>
        <List.Subheader>Appearance</List.Subheader>
        <List.Item
          title="Theme"
          description={`Current: ${settings.ui.theme}`}
          left={(props) => <List.Icon {...props} icon="palette-outline" />}
          right={() => <Paragraph style={styles.rightText}>{settings.ui.theme}</Paragraph>}
          onPress={() => {
            // Theme selector modal would open here
            triggerHaptic('light');
          }}
        />
        <List.Item
          title="Haptic Feedback"
          description="Vibrate on interactions"
          left={(props) => <List.Icon {...props} icon="vibrate" />}
          right={() => (
            <Switch
              value={settings.ui.hapticFeedback}
              onValueChange={(value) => {
                dispatch(updateUISettings({ hapticFeedback: value }));
                triggerHaptic('light');
              }}
            />
          )}
        />
        <List.Item
          title="Sound Effects"
          description="Play sounds for notifications"
          left={(props) => <List.Icon {...props} icon="volume-high" />}
          right={() => (
            <Switch
              value={settings.ui.soundEnabled}
              onValueChange={(value) => {
                dispatch(updateUISettings({ soundEnabled: value }));
                triggerHaptic('light');
              }}
            />
          )}
        />
      </Surface>

      {/* Security Settings */}
      <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]}>
        <List.Subheader>Security</List.Subheader>
        <List.Item
          title="Biometric Authentication"
          description="Use Face ID or fingerprint"
          left={(props) => <List.Icon {...props} icon="fingerprint" />}
          right={() => (
            <Switch
              value={settings.auth.biometricEnabled}
              onValueChange={(value) => {
                dispatch(updateAuthSettings({ biometricEnabled: value }));
                triggerHaptic('light');
              }}
            />
          )}
        />
        <List.Item
          title="Auto-Lock Timeout"
          description={`${settings.auth.autoLockTimeout / 1000 / 60} minutes`}
          left={(props) => <List.Icon {...props} icon="lock-clock" />}
          right={() => <Paragraph style={styles.rightText}>5 min</Paragraph>}
          onPress={() => triggerHaptic('light')}
        />
      </Surface>

      {/* Notifications */}
      <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]}>
        <List.Subheader>Notifications</List.Subheader>
        <List.Item
          title="Push Notifications"
          description="Receive notifications"
          left={(props) => <List.Icon {...props} icon="bell-outline" />}
          right={() => (
            <Switch
              value={settings.notifications.enabled}
              onValueChange={(value) => {
                dispatch(updateNotificationSettings({ enabled: value }));
                triggerHaptic('light');
              }}
            />
          )}
        />
        <List.Item
          title="Execution Complete"
          description="Notify when prompts finish"
          left={(props) => <List.Icon {...props} icon="check-circle-outline" />}
          right={() => (
            <Switch
              value={settings.notifications.executionComplete}
              onValueChange={(value) => {
                dispatch(updateNotificationSettings({ executionComplete: value }));
                triggerHaptic('light');
              }}
            />
          )}
        />
        <List.Item
          title="Error Alerts"
          description="Notify about failures"
          left={(props) => <List.Icon {...props} icon="alert-circle-outline" />}
          right={() => (
            <Switch
              value={settings.notifications.errorAlerts}
              onValueChange={(value) => {
                dispatch(updateNotificationSettings({ errorAlerts: value }));
                triggerHaptic('light');
              }}
            />
          )}
        />
      </Surface>

      {/* Privacy */}
      <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]}>
        <List.Subheader>Privacy</List.Subheader>
        <List.Item
          title="Analytics"
          description="Help improve the app"
          left={(props) => <List.Icon {...props} icon="chart-line" />}
          right={() => (
            <Switch
              value={settings.privacy.analyticsEnabled}
              onValueChange={(value) => {
                dispatch(updatePrivacySettings({ analyticsEnabled: value }));
                triggerHaptic('light');
              }}
            />
          )}
        />
        <List.Item
          title="Crash Reporting"
          description="Send crash reports"
          left={(props) => <List.Icon {...props} icon="bug-outline" />}
          right={() => (
            <Switch
              value={settings.privacy.crashReportingEnabled}
              onValueChange={(value) => {
                dispatch(updatePrivacySettings({ crashReportingEnabled: value }));
                triggerHaptic('light');
              }}
            />
          )}
        />
      </Surface>

      {/* App Info */}
      <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]}>
        <List.Subheader>About</List.Subheader>
        <List.Item
          title="App Version"
          description="1.0.0 (1)"
          left={(props) => <List.Icon {...props} icon="information-outline" />}
          right={() => <Paragraph style={styles.rightText}>1.0.0</Paragraph>}
        />
        <List.Item
          title="Help & Support"
          left={(props) => <List.Icon {...props} icon="help-circle-outline" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => triggerHaptic('light')}
        />
        <List.Item
          title="Privacy Policy"
          left={(props) => <List.Icon {...props} icon="shield-outline" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => triggerHaptic('light')}
        />
      </Surface>

      {/* Sign Out */}
      <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]}>
        <List.Item
          title="Sign Out"
          titleStyle={{ color: theme.colors.error }}
          left={(props) => <List.Icon {...props} icon="logout" color={theme.colors.error} />}
          onPress={handleLogout}
        />
      </Surface>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    borderRadius: 12,
    elevation: 2,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  profileInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  rightText: {
    opacity: 0.6,
  },
  bottomPadding: {
    height: spacing.xl,
  },
});

export default SettingsScreen;