/**
 * Alert Detail Screen - Detailed alert information and actions
 */

import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, useTheme, Card, Button } from 'react-native-paper';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AlertsStackParamList } from '@/navigation/AppNavigator';

type Props = NativeStackScreenProps<AlertsStackParamList, 'AlertDetail'>;

export default function AlertDetailScreen({ route }: Props) {
  const theme = useTheme();
  const { alertId } = route.params;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="headlineSmall">Alert Details</Text>
            <Text variant="bodyMedium">Alert ID: {alertId}</Text>
            <Text variant="bodyMedium" style={{ marginTop: 16, color: theme.colors.onSurfaceVariant }}>
              This is a placeholder screen for alert details. In the full implementation,
              this would show comprehensive alert information, timeline, and actions.
            </Text>

            <View style={styles.actions}>
              <Button mode="contained" style={styles.actionButton}>
                Acknowledge
              </Button>
              <Button mode="contained-tonal" style={styles.actionButton}>
                Resolve
              </Button>
            </View>
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
    margin: 16,
    elevation: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  actionButton: {
    flex: 1,
  },
});
