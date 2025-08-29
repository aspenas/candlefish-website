import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../providers/ThemeProvider';
import { useAuth } from '../providers/AuthProvider';
import { useOffline } from '../providers/OfflineProvider';
import { SecurityService } from '../services/security';
import { PerformanceService } from '../services/performance';
import { OfflineQueueService } from '../services/offline-queue';
import { NavigationProps } from '../types/navigation';

const SettingsScreen: React.FC<NavigationProps> = ({ navigation }) => {
  const { theme, themeMode, setThemeMode, isDark } = useTheme();
  const { user, logout, checkBiometricAvailability } = useAuth();
  const { syncStatus, forcSync } = useOffline();
  const styles = createStyles(theme);
  
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [showSecurityReport, setShowSecurityReport] = useState(false);
  const [showPerformanceReport, setShowPerformanceReport] = useState(false);
  const [securityReport, setSecurityReport] = useState<string>('');
  const [performanceReport, setPerformanceReport] = useState<any>(null);

  useEffect(() => {
    initializeSettings();
  }, []);

  const initializeSettings = async () => {
    // Check biometric availability
    const available = await checkBiometricAvailability();
    setBiometricAvailable(available);
    setBiometricEnabled(user?.preferences?.biometricAuth || false);
  };

  const handleThemeChange = () => {
    const modes = ['light', 'dark', 'auto'] as const;
    const currentIndex = modes.indexOf(themeMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setThemeMode(nextMode);
  };

  const handleBiometricToggle = (enabled: boolean) => {
    if (!biometricAvailable) {
      Alert.alert(
        'Biometric Authentication Not Available',
        'Your device does not support biometric authentication.'
      );
      return;
    }

    setBiometricEnabled(enabled);
    // In a real app, you would save this to user preferences
    console.log(`Biometric authentication ${enabled ? 'enabled' : 'disabled'}`);
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout },
      ]
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached data and offline queue. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive', 
          onPress: async () => {
            await OfflineQueueService.clearAll();
            Alert.alert('Success', 'Cache cleared successfully');
          }
        },
      ]
    );
  };

  const handleForceSync = async () => {
    try {
      await forcSync();
      Alert.alert('Success', 'Sync completed successfully');
    } catch (error) {
      Alert.alert('Error', 'Sync failed. Please try again.');
    }
  };

  const handleExportSecurityReport = async () => {
    try {
      const report = await SecurityService.exportSecurityReport();
      setSecurityReport(report);
      setShowSecurityReport(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate security report');
    }
  };

  const handleExportPerformanceReport = async () => {
    try {
      const report = await PerformanceService.getPerformanceReport();
      setPerformanceReport(report);
      setShowPerformanceReport(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate performance report');
    }
  };

  const renderSettingItem = (
    icon: string,
    title: string,
    subtitle: string,
    onPress?: () => void,
    rightComponent?: React.ReactNode
  ) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress}
    >
      <Icon name={icon} size={24} color={theme.colors.primary} style={styles.settingIcon} />
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingSubtitle}>{subtitle}</Text>
      </View>
      {rightComponent || (onPress && (
        <Icon name="chevron-right" size={24} color={theme.colors.textSecondary} />
      ))}
    </TouchableOpacity>
  );

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );

  const renderSecurityReportModal = () => (
    <Modal
      visible={showSecurityReport}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Security Report</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowSecurityReport(false)}
          >
            <Icon name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalContent}>
          <Text style={styles.reportText}>{securityReport}</Text>
        </ScrollView>
      </View>
    </Modal>
  );

  const renderPerformanceReportModal = () => (
    <Modal
      visible={showPerformanceReport}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Performance Report</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowPerformanceReport(false)}
          >
            <Icon name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalContent}>
          {performanceReport && (
            <View>
              <Text style={styles.reportSectionTitle}>Overview</Text>
              <Text style={styles.reportText}>
                Total Metrics: {performanceReport.totalMetrics}
              </Text>
              <Text style={styles.reportText}>
                Average Load Time: {performanceReport.overallAverages.loadTime}ms
              </Text>
              <Text style={styles.reportText}>
                Average Render Time: {performanceReport.overallAverages.renderTime}ms
              </Text>
              
              <Text style={styles.reportSectionTitle}>Screen Performance</Text>
              {Object.entries(performanceReport.screenMetrics).map(([screen, metrics]: [string, any]) => (
                <View key={screen} style={styles.screenMetric}>
                  <Text style={styles.screenName}>{screen}</Text>
                  <Text style={styles.reportText}>
                    Count: {metrics.count}, Avg Load: {metrics.averageLoadTime}ms
                  </Text>
                </View>
              ))}
              
              {performanceReport.slowScreens.length > 0 && (
                <>
                  <Text style={styles.reportSectionTitle}>Slow Screens</Text>
                  {performanceReport.slowScreens.map((screen: any, index: number) => (
                    <Text key={index} style={styles.reportText}>
                      {screen.screen}: {screen.loadTime}ms
                    </Text>
                  ))}
                </>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* User Profile */}
        <View style={styles.profileSection}>
          <View style={styles.profileAvatar}>
            <Icon name="person" size={48} color={theme.colors.primary} />
          </View>
          <Text style={styles.profileName}>{user?.name}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
        </View>

        {/* Appearance */}
        {renderSection('Appearance', (
          <>
            {renderSettingItem(
              'palette',
              'Theme',
              `Current: ${themeMode}`,
              handleThemeChange,
              <Text style={styles.themeValue}>{themeMode}</Text>
            )}
          </>
        ))}

        {/* Security */}
        {renderSection('Security', (
          <>
            {renderSettingItem(
              'fingerprint',
              'Biometric Authentication',
              biometricAvailable ? 'Use fingerprint or face ID' : 'Not available on this device',
              undefined,
              <Switch
                value={biometricEnabled}
                onValueChange={handleBiometricToggle}
                disabled={!biometricAvailable}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={biometricEnabled ? 'white' : theme.colors.textSecondary}
              />
            )}
            {renderSettingItem(
              'security',
              'Security Report',
              'Export security events and analysis',
              handleExportSecurityReport
            )}
          </>
        ))}

        {/* Data & Sync */}
        {renderSection('Data & Sync', (
          <>
            {renderSettingItem(
              'sync',
              'Force Sync',
              `${syncStatus.pendingCount} items pending`,
              handleForceSync,
              <View style={styles.syncStatus}>
                <Text style={styles.syncStatusText}>{syncStatus.pendingCount}</Text>
              </View>
            )}
            {renderSettingItem(
              'storage',
              'Clear Cache',
              'Clear offline data and cache',
              handleClearCache
            )}
          </>
        ))}

        {/* Performance */}
        {renderSection('Performance', (
          <>
            {renderSettingItem(
              'speed',
              'Performance Report',
              'View app performance metrics',
              handleExportPerformanceReport
            )}
          </>
        ))}

        {/* About */}
        {renderSection('About', (
          <>
            {renderSettingItem(
              'info',
              'Version',
              '1.0.0 (Build 1)',
              undefined
            )}
            {renderSettingItem(
              'help',
              'Help & Support',
              'Get help with the app',
              () => {
                // Navigate to help or open support URL
                console.log('Open help');
              }
            )}
            {renderSettingItem(
              'privacy_tip',
              'Privacy Policy',
              'View privacy policy',
              () => {
                // Navigate to privacy policy
                console.log('Open privacy policy');
              }
            )}
          </>
        ))}

        {/* Sign Out */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Icon name="logout" size={24} color={theme.colors.error} />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {renderSecurityReportModal()}
      {renderPerformanceReportModal()}
    </View>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.md,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  profileName: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs / 2,
  },
  profileEmail: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  section: {
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
    marginLeft: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  sectionContent: {
    backgroundColor: theme.colors.surface,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  settingIcon: {
    marginRight: theme.spacing.md,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs / 2,
  },
  settingSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  themeValue: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    textTransform: 'capitalize',
  },
  syncStatus: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncStatusText: {
    fontSize: theme.fontSize.xs,
    color: 'white',
    fontWeight: 'bold',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  logoutText: {
    fontSize: theme.fontSize.md,
    fontWeight: '500',
    color: theme.colors.error,
    marginLeft: theme.spacing.sm,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.text,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  modalContent: {
    flex: 1,
    padding: theme.spacing.md,
  },
  reportText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    fontFamily: 'monospace',
    marginBottom: theme.spacing.xs,
  },
  reportSectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  screenMetric: {
    marginBottom: theme.spacing.sm,
  },
  screenName: {
    fontSize: theme.fontSize.sm,
    fontWeight: '500',
    color: theme.colors.primary,
  },
});

export default SettingsScreen;