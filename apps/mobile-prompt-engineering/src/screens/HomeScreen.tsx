import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Alert,
  Dimensions
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  Surface,
  useTheme,
  Avatar,
  IconButton,
  Chip
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { RootStackParamList } from '@/types';
import { useAppSelector, useAppDispatch } from '@/hooks/redux';
import { usePromptMetrics } from '@/hooks/usePromptMetrics';
import { useQuickActions } from '@/hooks/useQuickActions';
import QuickActionBar from '@/components/ui/QuickActionBar';
import MetricCard from '@/components/dashboard/MetricCard';
import RecentExecutionsCard from '@/components/dashboard/RecentExecutionsCard';
import PopularTemplatesCard from '@/components/dashboard/PopularTemplatesCard';
import ModelStatusCard from '@/components/dashboard/ModelStatusCard';
import { spacing, typography } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  
  const [refreshing, setRefreshing] = useState(false);
  const [greeting, setGreeting] = useState('');
  
  const { user } = useAppSelector((state) => state.auth);
  const { settings } = useAppSelector((state) => state.settings);
  const { metrics, loading: metricsLoading } = usePromptMetrics();
  const { quickActions, handleQuickAction } = useQuickActions();

  // Generate time-based greeting
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Good Morning');
    } else if (hour < 17) {
      setGreeting('Good Afternoon');
    } else {
      setGreeting('Good Evening');
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Refresh all dashboard data
      await Promise.all([
        dispatch({ type: 'metrics/fetchMetrics' }),
        dispatch({ type: 'templates/fetchRecentTemplates' }),
        dispatch({ type: 'executions/fetchRecentExecutions' }),
        dispatch({ type: 'models/fetchModelStatus' })
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh dashboard data');
    } finally {
      setRefreshing(false);
    }
  };

  const navigateToPromptEditor = () => {
    navigation.navigate('PromptEditor', { mode: 'create' });
  };

  const navigateToVoicePrompt = () => {
    navigation.navigate('VoicePrompt');
  };

  const navigateToCamera = () => {
    navigation.navigate('CameraPrompt', { mode: 'ocr' });
  };

  const navigateToMetrics = () => {
    navigation.navigate('Metrics', {});
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header with gradient */}
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primaryContainer]}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerText}>
            <Title style={[styles.greeting, { color: theme.colors.onPrimary }]}>
              {greeting}
            </Title>
            <Paragraph style={[styles.userName, { color: theme.colors.onPrimary }]}>
              {user?.name || 'Prompt Engineer'}
            </Paragraph>
          </View>
          <Avatar.Text 
            size={48} 
            label={user?.name?.charAt(0) || 'PE'}
            style={{ backgroundColor: theme.colors.surface }}
          />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Actions */}
        <Surface style={[styles.quickActionsCard, { backgroundColor: theme.colors.surface }]}>
          <Title style={styles.sectionTitle}>Quick Actions</Title>
          <QuickActionBar
            actions={quickActions}
            onActionPress={handleQuickAction}
          />
        </Surface>

        {/* Today's Metrics */}
        <Surface style={[styles.metricsCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Title style={styles.sectionTitle}>Today's Activity</Title>
            <IconButton
              icon="chart-line"
              size={20}
              onPress={navigateToMetrics}
            />
          </View>
          <View style={styles.metricsGrid}>
            <MetricCard
              title="Executions"
              value={metrics?.todayExecutions || 0}
              subtitle="prompts run"
              icon="play-circle-outline"
              color={theme.colors.primary}
            />
            <MetricCard
              title="Cost"
              value={`$${(metrics?.todayCost || 0).toFixed(2)}`}
              subtitle="spent today"
              icon="currency-usd"
              color={theme.colors.tertiary}
            />
            <MetricCard
              title="Avg Latency"
              value={`${metrics?.averageLatency || 0}ms`}
              subtitle="response time"
              icon="timer-outline"
              color={theme.colors.secondary}
            />
            <MetricCard
              title="Success Rate"
              value={`${((metrics?.successRate || 0) * 100).toFixed(1)}%`}
              subtitle="completion rate"
              icon="check-circle-outline"
              color={theme.colors.success}
            />
          </View>
        </Surface>

        {/* Model Status */}
        <ModelStatusCard />

        {/* Recent Executions */}
        <RecentExecutionsCard
          onExecutionPress={(execution) => 
            navigation.navigate('ExecutionDetail', { executionId: execution.id })
          }
        />

        {/* Popular Templates */}
        <PopularTemplatesCard
          onTemplatePress={(template) =>
            navigation.navigate('TemplateDetail', { templateId: template.id })
          }
        />

        {/* System Status */}
        <Surface style={[styles.statusCard, { backgroundColor: theme.colors.surface }]}>
          <Title style={styles.sectionTitle}>System Status</Title>
          <View style={styles.statusRow}>
            <Chip
              icon="cloud-check-outline"
              mode="outlined"
              textStyle={styles.statusChipText}
            >
              API Connected
            </Chip>
            <Chip
              icon="database-check-outline"
              mode="outlined"
              textStyle={styles.statusChipText}
            >
              Cache Active
            </Chip>
          </View>
          <View style={styles.statusRow}>
            <Chip
              icon="shield-check-outline"
              mode="outlined"
              textStyle={styles.statusChipText}
            >
              Security OK
            </Chip>
            <Chip
              icon="sync"
              mode="outlined"
              textStyle={styles.statusChipText}
            >
              Auto-Sync On
            </Chip>
          </View>
        </Surface>

        {/* Create New Template CTA */}
        <Card style={[styles.ctaCard, { backgroundColor: theme.colors.primaryContainer }]}>
          <Card.Content style={styles.ctaContent}>
            <Title style={[styles.ctaTitle, { color: theme.colors.onPrimaryContainer }]}>
              Ready to create something amazing?
            </Title>
            <Paragraph style={[styles.ctaSubtitle, { color: theme.colors.onPrimaryContainer }]}>
              Build a new prompt template or test an existing one
            </Paragraph>
            <View style={styles.ctaButtons}>
              <Button
                mode="contained"
                icon="plus"
                onPress={navigateToPromptEditor}
                style={styles.ctaButton}
              >
                Create Template
              </Button>
              <Button
                mode="outlined"
                icon="microphone"
                onPress={navigateToVoicePrompt}
                style={styles.ctaButton}
              >
                Voice Prompt
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* Bottom padding for safe area */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    ...typography.headlineMedium,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  userName: {
    ...typography.bodyLarge,
    opacity: 0.9,
  },
  scrollView: {
    flex: 1,
    marginTop: -spacing.md,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  quickActionsCard: {
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    elevation: 2,
  },
  metricsCard: {
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.titleLarge,
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statusCard: {
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    elevation: 2,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  statusChipText: {
    ...typography.labelSmall,
  },
  ctaCard: {
    borderRadius: 16,
    marginBottom: spacing.md,
    elevation: 2,
  },
  ctaContent: {
    padding: spacing.lg,
  },
  ctaTitle: {
    ...typography.titleLarge,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  ctaSubtitle: {
    ...typography.bodyMedium,
    marginBottom: spacing.lg,
  },
  ctaButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  ctaButton: {
    flex: 1,
  },
  bottomPadding: {
    height: spacing.xxl,
  },
});

export default HomeScreen;