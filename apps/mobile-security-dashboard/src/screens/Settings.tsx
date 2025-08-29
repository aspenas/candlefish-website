import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  List,
  Button,
  Dialog,
  Portal,
  Text,
  TextInput,
  useTheme,
  Surface,
  Divider,
  Avatar,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { CommonActions } from '@react-navigation/native';

// Services
import { biometricService } from '@/services/biometric';
import { notificationService } from '@/services/notifications';
import { secureStorage } from '@/utils/secure-storage';
import { crashReporting } from '@/services/crashReporting';

// Hooks
import { useAuth } from '@/hooks/useAuth';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useThemePreference } from '@/hooks/useThemePreference';

// Types
interface NotificationSettings {
  criticalAlerts: boolean;
  incidentUpdates: boolean;
  systemMaintenance: boolean;
  weeklyReports: boolean;
  pushNotifications: boolean;
  emailNotifications: boolean;
}

interface SecuritySettings {
  biometricAuth: boolean;
  autoLock: boolean;
  autoLockTimeout: number; // minutes
  screenRecording: boolean;
  screenshot: boolean;
  sessionTimeout: number; // minutes
}

interface SettingsScreenProps {
  navigation: any;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const theme = useTheme();
  const { user, logout } = useAuth();
  const { isConnected } = useNetworkStatus();
  const { themePreference, setThemePreference } = useThemePreference();

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    criticalAlerts: true,
    incidentUpdates: true,
    systemMaintenance: false,
    weeklyReports: true,
    pushNotifications: true,
    emailNotifications: false,
  });

  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    biometricAuth: false,
    autoLock: true,
    autoLockTimeout: 5,
    screenRecording: false,
    screenshot: false,
    sessionTimeout: 30,
  });

  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showClearCacheDialog, setShowClearCacheDialog] = useState(false);
  const [showSessionTimeoutDialog, setShowSessionTimeoutDialog] = useState(false);
  const [tempSessionTimeout, setTempSessionTimeout] = useState('30');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Load notification settings
      const savedNotificationSettings = await secureStorage.getItem('notification_settings');
      if (savedNotificationSettings) {
        setNotificationSettings(JSON.parse(savedNotificationSettings));
      }

      // Load security settings
      const savedSecuritySettings = await secureStorage.getItem('security_settings');
      if (savedSecuritySettings) {
        setSecuritySettings(JSON.parse(savedSecuritySettings));
      }

      // Check biometric availability
      const biometricCapabilities = await biometricService.checkCapabilities();
      setSecuritySettings(prev => ({
        ...prev,
        biometricAuth: biometricCapabilities.enabled,
      }));
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveNotificationSettings = async (newSettings: NotificationSettings) => {
    try {
      setNotificationSettings(newSettings);
      await secureStorage.setItem('notification_settings', JSON.stringify(newSettings));
      
      // Update notification service settings
      await notificationService.updateSettings(newSettings);
      
      if (!isConnected) {
        Alert.alert(
          'Settings Saved Locally',
          'Your notification settings have been saved locally and will sync when you reconnect.'
        );
      }
    } catch (error) {
      console.error('Error saving notification settings:', error);
      Alert.alert('Error', 'Failed to save notification settings');
    }
  };

  const saveSecuritySettings = async (newSettings: SecuritySettings) => {
    try {
      setSecuritySettings(newSettings);
      await secureStorage.setItem('security_settings', JSON.stringify(newSettings));
      
      if (!isConnected) {
        Alert.alert(
          'Settings Saved Locally',
          'Your security settings have been saved locally and will sync when you reconnect.'
        );
      }
    } catch (error) {
      console.error('Error saving security settings:', error);
      Alert.alert('Error', 'Failed to save security settings');
    }
  };

  const handleBiometricToggle = async (enabled: boolean) => {
    if (enabled) {
      const capabilities = await biometricService.checkCapabilities();
      if (!capabilities.available) {
        Alert.alert(
          'Biometric Authentication Unavailable',
          'Your device does not support biometric authentication or it is not set up.'
        );
        return;
      }

      const result = await biometricService.authenticate('Enable biometric authentication for the app');
      if (result.success) {
        await biometricService.enableBiometrics();
        await saveSecuritySettings({ ...securitySettings, biometricAuth: true });
      }
    } else {
      Alert.alert(
        'Disable Biometric Authentication',
        'Are you sure you want to disable biometric authentication? You will need to use your password to sign in.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              await biometricService.disableBiometrics();
              await saveSecuritySettings({ ...securitySettings, biometricAuth: false });
            },
          },
        ]
      );
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Auth' }],
        })
      );
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to log out');
    }
  };

  const handleClearCache = async () => {
    try {
      // Clear Apollo cache
      // await apolloClient.clearStore();
      
      // Clear other cached data
      await secureStorage.removeItem('cached_data');
      
      Alert.alert('Success', 'Cache cleared successfully');
    } catch (error) {
      console.error('Error clearing cache:', error);
      Alert.alert('Error', 'Failed to clear cache');
    }
  };

  const handleSessionTimeoutSave = async () => {
    const timeout = parseInt(tempSessionTimeout, 10);
    if (isNaN(timeout) || timeout < 5 || timeout > 120) {
      Alert.alert('Invalid Timeout', 'Session timeout must be between 5 and 120 minutes');
      return;
    }

    await saveSecuritySettings({
      ...securitySettings,
      sessionTimeout: timeout,
    });
    setShowSessionTimeoutDialog(false);
  };

  const handleSendDiagnostics = async () => {
    try {
      const diagnostics = {
        deviceInfo: {
          brand: Device.brand,
          modelName: Device.modelName,
          osName: Device.osName,
          osVersion: Device.osVersion,
          platformApiLevel: Device.platformApiLevel,
        },
        appInfo: {
          applicationName: Application.applicationName,
          applicationVersion: Application.nativeApplicationVersion,
          buildVersion: Application.nativeBuildVersion,
        },
        networkStatus: isConnected,
        timestamp: new Date().toISOString(),
      };

      await crashReporting.sendDiagnostics(diagnostics);
      Alert.alert('Success', 'Diagnostics sent successfully');
    } catch (error) {
      console.error('Error sending diagnostics:', error);
      Alert.alert('Error', 'Failed to send diagnostics');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* User Profile */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.profileHeader}>
              <Avatar.Text
                size={64}
                label={user?.name ? user.name.split(' ').map(n => n[0]).join('') : 'U'}
                style={styles.avatar}
              />
              <View style={styles.profileInfo}>
                <Title>{user?.name || 'User'}</Title>
                <Paragraph>{user?.email || 'user@candlefish.ai'}</Paragraph>
                <Paragraph style={styles.role}>
                  {user?.role || 'Security Analyst'}
                </Paragraph>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Notifications */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Notifications</Title>
          </Card.Content>
          
          <List.Item
            title="Critical Alerts"
            description="Receive notifications for critical security alerts"
            left={() => <List.Icon icon="alert-octagon" />}
            right={() => (
              <Switch
                value={notificationSettings.criticalAlerts}
                onValueChange={(value) =>
                  saveNotificationSettings({
                    ...notificationSettings,
                    criticalAlerts: value,
                  })
                }
              />
            )}
          />
          
          <List.Item
            title="Incident Updates"
            description="Get notified when incidents are updated"
            left={() => <List.Icon icon="clipboard-alert" />}
            right={() => (
              <Switch
                value={notificationSettings.incidentUpdates}
                onValueChange={(value) =>
                  saveNotificationSettings({
                    ...notificationSettings,
                    incidentUpdates: value,
                  })
                }
              />
            )}
          />
          
          <List.Item
            title="System Maintenance"
            description="Notifications about planned maintenance"
            left={() => <List.Icon icon="wrench" />}
            right={() => (
              <Switch
                value={notificationSettings.systemMaintenance}
                onValueChange={(value) =>
                  saveNotificationSettings({
                    ...notificationSettings,
                    systemMaintenance: value,
                  })
                }
              />
            )}
          />
          
          <List.Item
            title="Weekly Reports"
            description="Receive weekly security summary reports"
            left={() => <List.Icon icon="file-chart" />}
            right={() => (
              <Switch
                value={notificationSettings.weeklyReports}
                onValueChange={(value) =>
                  saveNotificationSettings({
                    ...notificationSettings,
                    weeklyReports: value,
                  })
                }
              />
            )}
          />
        </Card>

        {/* Security */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Security</Title>
          </Card.Content>
          
          <List.Item
            title="Biometric Authentication"
            description="Use Face ID, Touch ID, or fingerprint to unlock"
            left={() => <List.Icon icon="fingerprint" />}
            right={() => (
              <Switch
                value={securitySettings.biometricAuth}
                onValueChange={handleBiometricToggle}
              />
            )}
          />
          
          <List.Item
            title="Auto Lock"
            description="Automatically lock the app when inactive"
            left={() => <List.Icon icon="lock-clock" />}
            right={() => (
              <Switch
                value={securitySettings.autoLock}
                onValueChange={(value) =>
                  saveSecuritySettings({
                    ...securitySettings,
                    autoLock: value,
                  })
                }
              />
            )}
          />
          
          <List.Item
            title="Session Timeout"
            description={`Auto logout after ${securitySettings.sessionTimeout} minutes`}
            left={() => <List.Icon icon="timer-off" />}
            onPress={() => {
              setTempSessionTimeout(securitySettings.sessionTimeout.toString());
              setShowSessionTimeoutDialog(true);
            }}
          />
          
          <List.Item
            title="Prevent Screenshots"
            description="Block screenshots and screen recording"
            left={() => <List.Icon icon="camera-off" />}
            right={() => (
              <Switch
                value={securitySettings.screenshot}
                onValueChange={(value) =>
                  saveSecuritySettings({
                    ...securitySettings,
                    screenshot: value,
                  })
                }
              />
            )}
          />
        </Card>

        {/* Appearance */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Appearance</Title>
          </Card.Content>
          
          <List.Item
            title="Theme"
            description={`Current: ${themePreference}`}
            left={() => <List.Icon icon="palette" />}
            onPress={() => {
              const themes = ['system', 'light', 'dark'];
              const currentIndex = themes.indexOf(themePreference);
              const nextTheme = themes[(currentIndex + 1) % themes.length];
              setThemePreference(nextTheme as any);
            }}
          />
        </Card>

        {/* Data & Storage */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Data & Storage</Title>
          </Card.Content>
          
          <List.Item
            title="Clear Cache"
            description="Clear cached data and images"
            left={() => <List.Icon icon="delete-sweep" />}
            onPress={() => setShowClearCacheDialog(true)}
          />
          
          <List.Item
            title="Offline Storage"
            description="Data stored for offline access"
            left={() => <List.Icon icon="database" />}
          />
        </Card>

        {/* Support */}
        <Card style={styles.card}>
          <Card.Content>
            <Title>Support</Title>
          </Card.Content>
          
          <List.Item
            title="Send Diagnostics"
            description="Help improve the app by sending diagnostics"
            left={() => <List.Icon icon="bug" />}
            onPress={handleSendDiagnostics}
          />
          
          <List.Item
            title="Contact Support"
            description="Get help with the Security Dashboard"
            left={() => <List.Icon icon="help-circle" />}
            onPress={() => Alert.alert('Contact Support', 'Email: support@candlefish.ai')}
          />
        </Card>

        {/* App Information */}
        <Card style={[styles.card, styles.lastCard]}>
          <Card.Content>
            <Title>About</Title>
            <View style={styles.aboutInfo}>
              <View style={styles.aboutRow}>
                <Text style={styles.aboutLabel}>Version</Text>
                <Text style={styles.aboutValue}>
                  {Application.nativeApplicationVersion} ({Application.nativeBuildVersion})
                </Text>
              </View>
              <View style={styles.aboutRow}>
                <Text style={styles.aboutLabel}>Device</Text>
                <Text style={styles.aboutValue}>
                  {Device.brand} {Device.modelName}
                </Text>
              </View>
              <View style={styles.aboutRow}>
                <Text style={styles.aboutLabel}>OS</Text>
                <Text style={styles.aboutValue}>
                  {Device.osName} {Device.osVersion}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Logout Button */}
        <View style={styles.logoutContainer}>
          <Button
            mode="outlined"
            icon="logout"
            onPress={() => setShowLogoutDialog(true)}
            style={styles.logoutButton}
            labelStyle={styles.logoutButtonLabel}
          >
            Sign Out
          </Button>
        </View>
      </ScrollView>

      {/* Dialogs */}
      <Portal>
        {/* Logout Confirmation */}
        <Dialog visible={showLogoutDialog} onDismiss={() => setShowLogoutDialog(false)}>
          <Dialog.Title>Sign Out</Dialog.Title>
          <Dialog.Content>
            <Paragraph>Are you sure you want to sign out?</Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowLogoutDialog(false)}>Cancel</Button>
            <Button onPress={handleLogout}>Sign Out</Button>
          </Dialog.Actions>
        </Dialog>

        {/* Clear Cache Confirmation */}
        <Dialog visible={showClearCacheDialog} onDismiss={() => setShowClearCacheDialog(false)}>
          <Dialog.Title>Clear Cache</Dialog.Title>
          <Dialog.Content>
            <Paragraph>
              This will clear all cached data including images and temporary files. 
              You may need to re-download some data when using the app.
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowClearCacheDialog(false)}>Cancel</Button>
            <Button onPress={() => {
              setShowClearCacheDialog(false);
              handleClearCache();
            }}>
              Clear Cache
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Session Timeout */}
        <Dialog visible={showSessionTimeoutDialog} onDismiss={() => setShowSessionTimeoutDialog(false)}>
          <Dialog.Title>Session Timeout</Dialog.Title>
          <Dialog.Content>
            <Paragraph style={styles.dialogDescription}>
              Set how long the app stays signed in when inactive (5-120 minutes)
            </Paragraph>
            <TextInput
              label="Minutes"
              value={tempSessionTimeout}
              onChangeText={setTempSessionTimeout}
              keyboardType="numeric"
              mode="outlined"
              style={styles.timeoutInput}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowSessionTimeoutDialog(false)}>Cancel</Button>
            <Button onPress={handleSessionTimeoutSave}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  scrollView: {
    flex: 1,
  },
  card: {
    margin: 16,
    marginBottom: 8,
    elevation: 2,
  },
  lastCard: {
    marginBottom: 32,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  role: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 4,
  },
  aboutInfo: {
    marginTop: 12,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  aboutLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  aboutValue: {
    fontSize: 14,
    opacity: 0.7,
  },
  logoutContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  logoutButton: {
    borderColor: '#d32f2f',
  },
  logoutButtonLabel: {
    color: '#d32f2f',
  },
  dialogDescription: {
    marginBottom: 16,
  },
  timeoutInput: {
    marginTop: 8,
  },
});

export default SettingsScreen;